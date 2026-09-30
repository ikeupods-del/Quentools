// Tests du relais PayPal : vraie vérification de signature (clés RSA générées ici), faux PayPal, faux Firebase, faux KV.
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../billing-worker/worker.js';

const PROJECT = 'quentools-adca1', ORIGIN = 'https://woufapp.fr';
const kvStore = new Map();
const KV = { get: async k => kvStore.has(k) ? kvStore.get(k) : null, put: async (k, v) => { kvStore.set(k, v); },
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
