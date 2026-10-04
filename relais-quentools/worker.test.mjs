// Tests du relais de rappels de fin d'offre : faux KV, faux Resend. Lancer : node --test relais-quentools/worker.test.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { reminders, message } from './worker.js';

const store = new Map(), KV = { get: async k => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } };
const ENV = { CLIENTS: KV, ADMIN_KEY: 'secret-key', ALLOWED_ORIGIN: 'https://quentools.fr', RESEND_API_KEY: 're_x', MAIL_FROM: 'QuenTools <bonjour@quentools.fr>', REPLY_TO: 'contact@quentools.fr' };
let sent, resendStatus;
beforeEach(() => { store.clear(); sent = []; resendStatus = 200;
  globalThis.fetch = async (url, opts) => { sent.push({ url: String(url), body: JSON.parse(opts.body), auth: opts.headers.Authorization }); return new Response('{}', { status: resendStatus }); }; });
const put = (clients, key = 'secret-key') => worker.fetch(new Request('https://w.test/clients', { method: 'PUT', headers: { Authorization: 'Bearer ' + key, Origin: 'https://quentools.fr' }, body: JSON.stringify({ clients }) }), ENV);
const cl = (o = {}) => ({ id: 'c1', prenom: 'Léa', email: 'lea@example.fr', site: 'lea-coiffure', finOffre: '2026-12-20', ...o });

test('refuse sans clé ou avec une mauvaise clé', async () => {
  assert.equal((await put([cl()], 'mauvaise')).status, 401);
  assert.equal((await worker.fetch(new Request('https://w.test/clients'), ENV)).status, 401);
});
test('enregistre les clients valides et ignore les autres', async () => {
  const r = await put([cl(), cl({ id: 'c2', email: 'pas-un-mail' }), cl({ id: 'c3', finOffre: 'demain' })]);
  assert.deepEqual(await r.json(), { ok: true, count: 1 });
});
test('envoie le rappel 14 jours avant la fin, une seule fois', async () => {
  await put([cl()]);
  assert.equal((await reminders(ENV, new Date('2026-12-05T08:00:00Z'))).length, 0, 'trop tôt : J-15');
  const a = await reminders(ENV, new Date('2026-12-06T08:00:00Z'));
  assert.deepEqual(a, [{ id: 'c1', result: 'sent' }]);
  assert.equal(sent.length, 1); assert.deepEqual(sent[0].body.to, ['lea@example.fr']); assert.equal(sent[0].auth, 'Bearer re_x');
  assert.match(sent[0].body.text, /Bonjour Léa/); assert.match(sent[0].body.text, /20 décembre 2026/); assert.match(sent[0].body.text, /69,99 € par mois/);
  assert.equal((await reminders(ENV, new Date('2026-12-07T08:00:00Z'))).length, 0, 'pas de second envoi');
});
test('pas d’envoi après la fin d’offre', async () => {
  await put([cl()]);
  assert.equal((await reminders(ENV, new Date('2026-12-21T08:00:00Z'))).length, 0);
});
test('échec d’envoi : pas marqué envoyé, nouvel essai le lendemain', async () => {
  await put([cl()]); resendStatus = 500;
  assert.deepEqual(await reminders(ENV, new Date('2026-12-08T08:00:00Z')), [{ id: 'c1', result: 'error 500' }]);
  resendStatus = 200;
  assert.deepEqual(await reminders(ENV, new Date('2026-12-09T08:00:00Z')), [{ id: 'c1', result: 'sent' }]);
});
test('nouvelle date de fin : le rappel redevient possible, même date : il reste noté', async () => {
  await put([cl()]); await reminders(ENV, new Date('2026-12-10T08:00:00Z'));
  await put([cl()]);
  assert.equal((await reminders(ENV, new Date('2026-12-11T08:00:00Z'))).length, 0);
  await put([cl({ finOffre: '2027-01-20' })]);
  assert.equal((await reminders(ENV, new Date('2027-01-08T08:00:00Z'))).length, 1);
});
test('sans clé Resend : rien n’est marqué envoyé', async () => {
  const env = { ...ENV, RESEND_API_KEY: '' }; await put([cl()]);
  assert.deepEqual(await reminders(env, new Date('2026-12-10T08:00:00Z')), [{ id: 'c1', result: 'off' }]);
  assert.equal(JSON.parse(store.get('clients'))[0].rappel, null);
});
test('le message ne contient ni nom ni prénom du propriétaire et signe QuenTools', () => {
  const m = message(cl(), ENV); assert.match(m.text, /Cordialement,\nQuenTools$/);
});
