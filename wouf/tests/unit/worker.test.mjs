// Tests du relais PayPal : vraie vérification de signature (clés RSA générées ici), faux PayPal, faux Firebase, faux KV.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../billing-worker/worker.js';

const PROJECT = 'quentools-adca1', ORIGIN = 'https://woufapp.fr';
const kvStore = new Map();
const KV = { get: async k => kvStore.has(k) ? kvStore.get(k) : null, put: async (k, v) => { kvStore.set(k, v); }, delete: async k => { kvStore.delete(k); },
  list: async ({ prefix }) => ({ keys: [...kvStore.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
const ENV = { PAID: KV, ALLOWED_ORIGIN: ORIGIN + ',https://ikeupods-del.github.io', OWNER_EMAIL: 'patron@example.fr', PAYEE: 'vendeur@example.fr', FIREBASE_PROJECT_ID: PROJECT };
const b64u = b => Buffer.from(b).toString('base64url');
let keys, jwk, calls, ipnAnswer, configPayee;

async function makeToken(over = {}, key = keys.privateKey, kid = 'k1') {
  const now = Math.floor(Date.now() / 1000), header = { alg: 'RS256', kid, typ: 'JWT' };
  const payload = { aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'uid_abc123', email: 'q@example.fr', email_verified: true, iat: now - 10, exp: now + 3600, ...over };
  const data = b64u(JSON.stringify(header)) + '.' + b64u(JSON.stringify(payload));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(data));
  return data + '.' + b64u(new Uint8Array(sig));
}
const get = async (path, token, origin = ORIGIN, env = ENV) => {
  const r = await worker.fetch(new Request('https://worker.test' + path, { headers: { ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) } }), env);
  return { status: r.status, json: await r.json().catch(() => ({})), headers: r.headers };
};
const ipn = async (fields, env = ENV) => {
  const body = new URLSearchParams(fields).toString();
  const r = await worker.fetch(new Request('https://worker.test/ipn', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }), env);
  return { status: r.status, text: await r.text() };
};
const good = (over = {}) => ({ payment_status: 'Completed', txn_type: 'web_accept', txn_id: 'TX1', receiver_email: 'vendeur@example.fr', mc_currency: 'EUR', mc_gross: '19.99', custom: 'uid_abc123|WOUF-ABC123', payer_email: 'Client@Example.fr', first_name: 'Jean', last_name: 'Client', ...over });

before(async () => {
  keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
});
beforeEach(() => {
  calls = []; kvStore.clear(); ipnAnswer = 'VERIFIED'; configPayee = '';
  globalThis.fetch = async (url, opts = {}) => {
    url = String(url); calls.push({ url, opts });
    if (url.includes('securetoken@system.gserviceaccount.com')) return new Response(JSON.stringify({ keys: [jwk] }));
    if (url.startsWith('https://ipnpb.paypal.com/')) return new Response(ipnAnswer === 'DOWN' ? 'oops' : ipnAnswer, { status: ipnAnswer === 'DOWN' ? 500 : 200 });
    if (url.includes('/documents/wouf_admin/config')) return new Response(JSON.stringify({ fields: configPayee ? { payee: { stringValue: configPayee } } : {} }));
    return new Response('{}', { status: 404 });
  };
});

test('IPN valide : le paiement est enregistré et /status l’active pour ce compte seulement', async () => {
  const r = await ipn(good()); assert.equal(r.status, 200);
  const v = calls.find(c => c.url.startsWith('https://ipnpb.paypal.com/')); assert.match(v.opts.body, /^cmd=_notify-validate&payment_status=Completed/, 'le message est renvoyé tel quel à PayPal pour vérification');
  const s = await get('/status', await makeToken()); assert.equal(s.status, 200); assert.equal(s.json.active, true); assert.equal(s.json.lifetime, true);
  assert.equal((await get('/status', await makeToken({ sub: 'autre_compte_999' }))).json.active, false, 'un autre compte n’est pas activé');
});
test('IPN refusé : non vérifié par PayPal, mauvais bénéficiaire, mauvaise devise, montant trop bas, pas un paiement terminé, compte inconnu', async () => {
  const active = async () => (await get('/status', await makeToken())).json.active;
  ipnAnswer = 'INVALID'; await ipn(good()); assert.equal(await active(), false, 'INVALID');
  ipnAnswer = 'VERIFIED';
  await ipn(good({ receiver_email: 'pirate@example.fr', txn_id: 'T2' })); assert.equal(await active(), false, 'paiement fait à quelqu’un d’autre');
  await ipn(good({ mc_currency: 'USD', txn_id: 'T3' })); assert.equal(await active(), false, 'devise');
  await ipn(good({ mc_gross: '1.00', txn_id: 'T4' })); assert.equal(await active(), false, 'montant');
  await ipn(good({ payment_status: 'Pending', txn_id: 'T5' })); assert.equal(await active(), false, 'paiement en attente');
  await ipn(good({ custom: 'pas un compte!|x', txn_id: 'T6' })); assert.equal(await active(), false, 'compte invalide');
  await ipn(good({ custom: '', txn_id: 'T7' })); assert.equal(await active(), false, 'sans compte (lien fixe : validation manuelle)');
  assert.equal(kvStore.size, 0, 'rien n’est enregistré');
});
test('offre récompense (9,99 €) acceptée ; doublon ignoré ; adresse PayPal choisie dans l’administration acceptée', async () => {
  await ipn(good({ mc_gross: '9.99', txn_id: 'R1' })); assert.equal((await get('/status', await makeToken())).json.active, true);
  await ipn(good({ mc_gross: '9.99', txn_id: 'R1' })); assert.equal([...kvStore.keys()].filter(k => k.startsWith('tx:')).length, 1, 'même transaction : une seule fois');
  kvStore.clear(); configPayee = 'nouveau@example.fr';
  const env2 = { ...ENV, PAYEE: '', CONF_TTL_MS: '0' }; await ipn(good({ receiver_email: 'nouveau@example.fr', txn_id: 'C1' }), env2);
  assert.ok(calls.some(c => c.url.includes('/documents/wouf_admin/config')), 'le réglage public de l’administration est lu');
  assert.equal((await get('/status', await makeToken(), ORIGIN, env2)).json.active, true, 'paiement à l’adresse choisie dans l’administration : accepté');
  kvStore.clear(); configPayee = ''; await ipn(good({ receiver_email: 'nouveau@example.fr', txn_id: 'C2' }), env2);
  assert.equal((await get('/status', await makeToken(), ORIGIN, env2)).json.active, false, 'ancienne adresse retirée de l’administration : refusée');
});
test('remboursement : l’accès est retiré (transaction d’origine retrouvée)', async () => {
  await ipn(good({ txn_id: 'P1' })); assert.equal((await get('/status', await makeToken())).json.active, true);
  await ipn({ payment_status: 'Refunded', txn_type: 'web_accept', txn_id: 'RF1', parent_txn_id: 'P1', receiver_email: 'vendeur@example.fr', mc_currency: 'EUR', mc_gross: '-19.99' });
  assert.equal((await get('/status', await makeToken())).json.active, false, 'accès retiré après remboursement');
});
test('panne de PayPal : le relais demande un nouvel essai (503), sans rien enregistrer', async () => {
  ipnAnswer = 'DOWN'; const r = await ipn(good({ txn_id: 'D1' })); assert.equal(r.status, 503); assert.equal(kvStore.size, 0);
});
test('jetons : falsifié, expiré, autre projet, absent → refusés ; origine non autorisée → 403', async () => {
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal((await get('/status', await makeToken({}, other.privateKey))).status, 401, 'signature fausse');
  assert.equal((await get('/status', await makeToken({ exp: Math.floor(Date.now() / 1000) - 5 }))).status, 401, 'expiré');
  assert.equal((await get('/status', await makeToken({ aud: 'autre-projet' }))).status, 401, 'autre projet');
  assert.equal((await get('/status')).status, 401, 'sans jeton');
  assert.equal((await get('/status', await makeToken(), 'https://evil.example')).status, 403, 'origine inconnue');
  const ok = await get('/status', await makeToken()); assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
});
test('liste des paiements : réservée au propriétaire (e-mail vérifié)', async () => {
  await ipn(good({ txn_id: 'L1' }));
  assert.equal((await get('/admin/paid', await makeToken())).status, 403, 'un client ne voit pas la liste');
  assert.equal((await get('/admin/paid', await makeToken({ email: 'patron@example.fr', email_verified: false, sub: 'patron_uid_1' }))).status, 403, 'e-mail non vérifié');
  const r = await get('/admin/paid', await makeToken({ email: 'Patron@Example.fr', sub: 'patron_uid_1' })); assert.equal(r.status, 200);
  const p = r.json.paid.uid_abc123; assert.equal(p.payerEmail, 'client@example.fr'); assert.equal(p.payerName, 'Jean Client'); assert.equal(p.ref, 'WOUF-ABC123'); assert.equal(p.amount, '19.99');
});

const post = async (path, body, token, env = ENV, ip = '1.2.3.4') => {
  const r = await worker.fetch(new Request('https://worker.test' + path, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }), env);
  return { status: r.status, json: await r.json().catch(() => ({})) };
};
const msg = (over = {}) => ({ category: 'Question', message: 'Bonjour, comment retrouver mon achat ?', email: 'cliente@example.fr', diagnostics: 'Wouf 1.14', ...over });
test('contact : le message est rangé, lisible seulement par le propriétaire, supprimable', async () => {
  const r = await post('/support', msg()); assert.equal(r.status, 200); assert.equal(r.json.ok, true); assert.equal(r.json.priority, false);
  assert.equal((await get('/admin/support', await makeToken())).status, 403, 'un client ne lit pas les messages');
  const owner = await makeToken({ email: 'patron@example.fr', sub: 'patron_uid_1' }), l = await get('/admin/support', owner);
  assert.equal(l.status, 200); assert.equal(l.json.messages.length, 1); assert.equal(l.json.messages[0].email, 'cliente@example.fr'); assert.match(l.json.messages[0].message, /retrouver mon achat/);
  assert.equal((await post('/admin/support/delete', { id: l.json.messages[0].id }, await makeToken())).status, 403, 'un client ne supprime pas');
  assert.equal((await post('/admin/support/delete', { id: 'pas-un-id' }, owner)).status, 400);
  assert.equal((await post('/admin/support/delete', { id: l.json.messages[0].id }, owner)).status, 200);
  assert.equal((await get('/admin/support', owner)).json.messages.length, 0);
});
test('contact : refus des messages invalides, limite de 5 par heure et par adresse IP, priorité pour un membre Plus', async () => {
  assert.equal((await post('/support', msg({ message: 'court' }))).status, 400); assert.equal((await post('/support', msg({ email: 'pas-un-mail' }))).status, 400);
  assert.equal((await post('/support', msg({ message: 'x'.repeat(4001) }))).status, 400);
  for (let i = 0; i < 5; i++) assert.equal((await post('/support', msg(), undefined, ENV, '9.9.9.9')).status, 200);
  assert.equal((await post('/support', msg(), undefined, ENV, '9.9.9.9')).status, 429, 'sixième message dans l’heure');
  assert.equal((await post('/support', msg(), undefined, ENV, '8.8.8.8')).status, 200, 'une autre adresse IP n’est pas bloquée');
  await ipn(good({ txn_id: 'S1' })); const r = await post('/support', msg(), await makeToken(), ENV, '7.7.7.7'); assert.equal(r.json.priority, true, 'membre Plus vérifié');
  const bad = await post('/support', msg(), 'jeton.invalide.xx', ENV, '6.6.6.6'); assert.equal(bad.status, 200); assert.equal(bad.json.priority, false, 'jeton invalide : message standard, jamais prioritaire');
});
test('contact : transmission par e-mail seulement si Resend est configuré, sans jamais bloquer l’enregistrement', async () => {
  await post('/support', msg(), undefined, ENV, '5.5.5.5'); assert.equal(calls.some(c => c.url.includes('api.resend.com')), false);
  const env2 = { ...ENV, RESEND_API_KEY: 're_fake', SUPPORT_TO: 'wouf-contact@proton.me', SUPPORT_FROM: 'Wouf <no-reply@woufapp.fr>' }; const prev = globalThis.fetch;
  globalThis.fetch = async (u, o) => String(u).includes('api.resend.com') ? (calls.push({ url: String(u), opts: o }), new Response('boom', { status: 500 })) : prev(u, o);
  const r = await post('/support', msg({ email: 'a@example.fr' }), undefined, env2, '4.4.4.4'); assert.equal(r.status, 200, 'panne Resend : le message est quand même enregistré');
  const sent = calls.find(c => c.url.includes('api.resend.com')); assert.ok(sent); assert.match(sent.opts.body, /wouf-contact@proton\.me/); assert.match(sent.opts.body, /reply_to/);
  const owner = await makeToken({ email: 'patron@example.fr', sub: 'patron_uid_1' }), l = await get('/admin/support', owner, ORIGIN, env2);
  assert.equal(l.json.mailOn, true); assert.match(l.json.messages.find(m => m.email === 'a@example.fr').mail, /^error 500/); assert.equal(l.json.messages.find(m => m.email !== 'a@example.fr').mail, 'off');
  globalThis.fetch = async (u, o) => String(u).includes('api.resend.com') ? new Response('{}', { status: 200 }) : prev(u, o);
  await post('/support', msg({ email: 'b@example.fr' }), undefined, env2, '3.3.3.3'); assert.equal((await get('/admin/support', owner, ORIGIN, env2)).json.messages.find(m => m.email === 'b@example.fr').mail, 'sent');
});

test('statistiques : réservées au propriétaire, 501 sans clé, données GoatCounter simplifiées', async () => {
  const env2 = { ...ENV, GOATCOUNTER_TOKEN: 'gc_fake' }, owner = await makeToken({ email: 'patron@example.fr', sub: 'patron_uid_1' }), prev = globalThis.fetch;
  assert.equal((await get('/admin/stats', await makeToken(), ORIGIN, env2)).status, 403, 'un client ne lit pas les stats');
  assert.equal((await get('/admin/stats', owner, ORIGIN, ENV)).status, 501, 'sans clé GoatCounter');
  globalThis.fetch = async (u, o) => { u = String(u); if (!u.includes('goatcounter.com')) return prev(u, o); calls.push({ url: u, opts: o });
    if (u.includes('/stats/total')) return new Response(JSON.stringify({ total: 12, total_events: 3, stats: [{ day: '2026-09-29', daily: 5 }, { day: '2026-09-30', daily: 7 }] }));
    if (u.includes('/stats/hits')) return new Response(JSON.stringify({ hits: [{ path: '/', count: 9, event: false }, { path: 'lecon-acquise', count: 3, event: true }] }));
    if (u.includes('/stats/toprefs')) return new Response(JSON.stringify({ stats: [{ name: 'tiktok.com', count: 4 }] })); return new Response('{}', { status: 404 }); };
  const r = await get('/admin/stats?days=2', owner, ORIGIN, env2); assert.equal(r.status, 200);
  assert.equal(r.json.total, 12); assert.deepEqual(r.json.perDay.map(d => d.visits), [5, 7]); assert.equal(r.json.pages[0].path, '/'); assert.equal(r.json.events[0].path, 'lecon-acquise'); assert.equal(r.json.refs[0].name, 'tiktok.com');
  assert.equal(calls.find(c => c.url.includes('goatcounter.com')).opts.headers.Authorization, 'Bearer gc_fake'); globalThis.fetch = prev;
});
