// Tests du relais de paiement : vraie vérification de signature (clés RSA générées ici), faux Stripe / Resend.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../billing-worker/worker.js';

const PROJECT = 'quentools-adca1', ORIGIN = 'https://ikeupods-del.github.io';
const ENV = { STRIPE_SECRET_KEY: 'sk_test_fake', PRICE_LIFETIME: 'price_life', ALLOWED_ORIGIN: ORIGIN + ',http://localhost:8099', FIREBASE_PROJECT_ID: PROJECT, RESEND_API_KEY: 're_fake', SUPPORT_TO: 'support@example.fr', SUPPORT_FROM: 'Wouf <no-reply@example.fr>' };
const b64u = b => Buffer.from(b).toString('base64url');
let keys, jwk, calls, stripeSearch;

async function makeToken(over = {}, key = keys.privateKey, kid = 'k1') {
  const now = Math.floor(Date.now() / 1000), header = { alg: 'RS256', kid, typ: 'JWT' };
  const payload = { aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'uid_abc123', email: 'q@example.fr', iat: now - 10, exp: now + 3600, ...over };
  const data = b64u(JSON.stringify(header)) + '.' + b64u(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data));
  return data + '.' + b64u(new Uint8Array(sig));
}
const req = (path, { method = 'GET', token, body, origin = ORIGIN } = {}) => new Request('https://worker.test' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
const call = async (path, opt, env = ENV) => { const r = await worker.fetch(req(path, opt), env); return { status: r.status, json: await r.json().catch(() => ({})), headers: r.headers }; };

before(async () => {
  keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
});
beforeEach(() => {
  calls = []; stripeSearch = { data: [] };
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url); calls.push({ url, opts });
    const ok = (o, s = 200) => new Response(JSON.stringify(o), { status: s });
    if (url.includes('securetoken@system.gserviceaccount.com')) return ok({ keys: [jwk] });
    if (url.includes('/payment_intents/search')) return ok(stripeSearch);
    if (url.endsWith('/checkout/sessions') && opts.method === 'POST') return ok({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    if (url.includes('/checkout/sessions/cs_test_paid')) return ok({ id: 'cs_test_paid', payment_status: 'paid', metadata: { uid: 'uid_abc123', product: 'wouf-plus' }, created: 1790000000 });
    if (url.includes('/checkout/sessions/cs_test_other')) return ok({ id: 'cs_test_other', payment_status: 'paid', metadata: { uid: 'someone_else', product: 'wouf-plus' }, created: 1790000000 });
    if (url.startsWith('https://api.resend.com/emails')) return ok({ id: 'em_1' });
    return ok({ error: { message: 'unexpected ' + url } }, 500);
  };
});
const paidPI = (over = {}) => ({ id: 'pi_1', created: 1790000000, latest_charge: { refunded: false, disputed: false, ...over } });

test('refuse sans jeton, avec jeton falsifié, expiré ou d’un autre projet', async () => {
  assert.equal((await call('/status')).status, 401);
  const good = await makeToken();
  const [h, p] = good.split('.'); assert.equal((await call('/status', { token: h + '.' + p + '.AAAA' })).status, 401);
  assert.equal((await call('/status', { token: await makeToken({ exp: Math.floor(Date.now() / 1000) - 5 }) })).status, 401);
  assert.equal((await call('/status', { token: await makeToken({ aud: 'autre-projet' }) })).status, 401);
  assert.equal((await call('/status', { token: await makeToken({ iss: 'https://evil.example' }) })).status, 401);
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal((await call('/status', { token: await makeToken({}, other.privateKey) })).status, 401, 'signature d’une autre clé');
});
test('statut : inactif sans achat, actif avec achat non remboursé', async () => {
  const token = await makeToken();
  assert.deepEqual((await call('/status', { token })).json, { active: false });
  stripeSearch = { data: [paidPI()] };
  const r = await call('/status', { token });
  assert.equal(r.json.active, true); assert.equal(r.json.lifetime, true); assert.equal(r.json.plan, 'lifetime');
  const search = calls.find(c => c.url.includes('/payment_intents/search')).url;
  assert.match(decodeURIComponent(search), /metadata\['uid'\]:'uid_abc123'/); assert.match(decodeURIComponent(search), /status:'succeeded'/);
});
test('achat remboursé ou contesté = inactif', async () => {
  const token = await makeToken();
  stripeSearch = { data: [paidPI({ refunded: true })] }; assert.equal((await call('/status', { token })).json.active, false);
  stripeSearch = { data: [paidPI({ disputed: true })] }; assert.equal((await call('/status', { token })).json.active, false);
});
test('retour de paiement : session payée par ce compte = actif immédiatement ; session d’un autre compte refusée', async () => {
  const token = await makeToken();
  assert.equal((await call('/status?session_id=cs_test_paid', { token })).json.active, true);
  assert.equal((await call('/status?session_id=cs_test_other', { token })).json.active, false);
  assert.equal((await call('/status?session_id=../../etc', { token })).status, 400);
});
test('checkout : paiement unique lié au compte, prix et URLs corrects', async () => {
  const token = await makeToken(), r = await call('/checkout', { method: 'POST', token, body: { returnUrl: ORIGIN + '/Quentools/wouf/' } });
  assert.equal(r.status, 200); assert.match(r.json.url, /^https:\/\/checkout\.stripe\.com\//);
  const c = calls.find(x => x.url.endsWith('/checkout/sessions')), body = new URLSearchParams(String(c.opts.body));
  assert.equal(body.get('mode'), 'payment'); assert.equal(body.get('line_items[0][price]'), 'price_life'); assert.equal(body.get('line_items[0][quantity]'), '1');
  assert.equal(body.get('client_reference_id'), 'uid_abc123'); assert.equal(body.get('metadata[uid]'), 'uid_abc123'); assert.equal(body.get('payment_intent_data[metadata][uid]'), 'uid_abc123'); assert.equal(body.get('payment_intent_data[metadata][product]'), 'wouf-plus');
  assert.equal(body.get('customer_email'), 'q@example.fr'); assert.equal(body.get('success_url'), ORIGIN + '/Quentools/wouf/?paid=1&session_id={CHECKOUT_SESSION_ID}');
  assert.match(c.opts.headers.Authorization, /^Bearer sk_test_fake/);
});
test('checkout : refuse une URL de retour hors origines, un compte déjà acheteur, l’absence de jeton', async () => {
  const token = await makeToken();
  assert.equal((await call('/checkout', { method: 'POST', token, body: { returnUrl: 'https://evil.example/' } })).status, 400);
  assert.equal((await call('/checkout', { method: 'POST', body: { returnUrl: ORIGIN + '/x' } })).status, 401);
  stripeSearch = { data: [paidPI()] };
  assert.equal((await call('/checkout', { method: 'POST', token, body: { returnUrl: ORIGIN + '/x' } })).status, 409);
});
test('CORS : origine inconnue refusée, préflight autorisé', async () => {
  assert.equal((await call('/status', { origin: 'https://evil.example', token: await makeToken() })).status, 403);
  const r = await worker.fetch(new Request('https://worker.test/checkout', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), ENV);
  assert.equal(r.status, 200); assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});
test('assistance : prioritaire uniquement si l’achat est vérifié côté serveur', async () => {
  const body = { category: 'Question', message: 'Bonjour, ceci est un message de test.', email: 'q@example.fr', diagnostics: 'Wouf 1.2.0' };
  let r = await call('/support', { method: 'POST', body }); assert.equal(r.json.priority, false);
  let mail = JSON.parse(calls.find(c => c.url.includes('resend')).opts.body); assert.doesNotMatch(mail.subject, /PRIORITAIRE/); assert.equal(mail.reply_to, 'q@example.fr'); assert.deepEqual(mail.to, ['support@example.fr']);
  stripeSearch = { data: [paidPI()] }; calls.length = 0;
  r = await call('/support', { method: 'POST', token: await makeToken(), body }); assert.equal(r.json.priority, true);
  mail = JSON.parse(calls.find(c => c.url.includes('resend')).opts.body); assert.match(mail.subject, /^\[PRIORITAIRE\]/); assert.match(mail.text, /MEMBRE PLUS VÉRIFIÉ/);
  calls.length = 0; r = await call('/support', { method: 'POST', token: 'faux.jeton.ici', body }); assert.equal(r.json.priority, false, 'jeton invalide = demande standard, jamais prioritaire');
});
test('assistance : validation des entrées et repli si non configurée', async () => {
  assert.equal((await call('/support', { method: 'POST', body: { message: 'court', email: 'q@example.fr' } })).status, 400);
  assert.equal((await call('/support', { method: 'POST', body: { message: 'Un message assez long.', email: 'pas-un-mail' } })).status, 400);
  assert.equal((await call('/support', { method: 'POST', body: { message: 'x'.repeat(4001), email: 'q@example.fr' } })).status, 400);
  const r = await call('/support', { method: 'POST', body: { message: 'Un message assez long.', email: 'q@example.fr' } }, { ...ENV, RESEND_API_KEY: '' });
  assert.equal(r.status, 501);
});
test('routes inconnues et erreurs Stripe ne divulguent pas de détails internes', async () => {
  assert.equal((await call('/nope', { token: await makeToken() })).status, 404);
  globalThis.fetch = async u => String(u).includes('securetoken') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response(JSON.stringify({ error: { message: 'Invalid API Key provided: sk_test_fake' } }), { status: 401 });
  const r = await call('/status', { token: await makeToken() }); assert.equal(r.status, 502);
});
