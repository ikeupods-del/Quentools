import assert from 'node:assert/strict';
import { handle, cleanMessages, extractLead, systemPrompt } from './worker.js';

const env = { GEMINI_API_KEY: 'k', ALLOWED_ORIGINS: 'https://ok.fr', NOM: 'Salon Test', FICHE: 'Ouvert le lundi.', LEAD_WEBHOOK: 'https://hook.test/x' };
const req = (body, origin = 'https://ok.fr', method = 'POST', path = '/chat') =>
  new Request('https://relais.test' + path, { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
const gemini = text => async (u) => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

// messages
assert.equal(cleanMessages([]), null);
assert.equal(cleanMessages([{ role: 'assistant', text: 'a' }]), null);
assert.equal(cleanMessages(new Array(20).fill({ role: 'user', text: 'x'.repeat(900) })).length, 12);
assert.equal(cleanMessages([{ role: 'user', text: 'x'.repeat(900) }])[0].parts[0].text.length, 500);

// demande transmise
const lead = extractLead('Merci !\n[[LEAD]]{"prenom":"Léa","telephone":"06 12 34 56 78","demande":"coupe samedi"}');
assert.equal(lead.reply, 'Merci !'); assert.equal(lead.lead.prenom, 'Léa');
assert.equal(extractLead('[[LEAD]]{"prenom":"A","telephone":"12","demande":"x"}').lead, null);
assert.equal(extractLead('[[LEAD]]pas du json').lead, null);
assert.ok(systemPrompt(env).includes('Ouvert le lundi.') && systemPrompt(env).includes('Salon Test'));

// origine refusée, mauvaise route, clé absente
assert.equal((await handle(req({ messages: [{ role: 'user', text: 'a' }] }, 'https://evil.fr'), env, gemini('x'))).status, 403);
assert.equal((await handle(req({}, 'https://ok.fr', 'POST', '/autre'), env, gemini('x'))).status, 404);
assert.equal((await handle(req({ messages: [{ role: 'user', text: 'a' }] }), { ...env, GEMINI_API_KEY: '' }, gemini('x'))).status, 503);
assert.equal((await handle(req({ messages: [] }), env, gemini('x'))).status, 400);

// réponse normale + transmission de la demande, la clé part en en-tête et pas dans l'adresse
const calls = [];
const spy = async (u, o) => { calls.push([u, o]); return gemini('Bien noté.\n[[LEAD]]{"prenom":"Léa","telephone":"0612345678","demande":"coupe"}')(u, o); };
const res = await handle(req({ messages: [{ role: 'user', text: 'bonjour' }] }), env, spy);
const out = await res.json();
assert.equal(res.status, 200); assert.equal(out.reply, 'Bien noté.'); assert.equal(out.lead, true);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://ok.fr');
assert.ok(!calls[0][0].includes('key=') && calls[0][1].headers['x-goog-api-key'] === 'k');
assert.equal(calls[1][0], 'https://hook.test/x');

// panne du service d'IA : le visiteur reçoit une erreur propre
assert.equal((await handle(req({ messages: [{ role: 'user', text: 'a' }] }), env, async () => { throw new Error('réseau'); })).status, 503);
assert.equal((await handle(req({ messages: [{ role: 'user', text: 'a' }] }), env, async () => ({ ok: false }))).status, 503);

// plafond journalier
const capped = { ...env, DAILY_CAP: 2, ALLOWED_ORIGINS: 'https://ok.fr' };
const codes = [];
for (let i = 0; i < 4; i++) codes.push((await handle(req({ messages: [{ role: 'user', text: 'a' }] }), capped, gemini('ok'))).status);
assert.deepEqual(codes.slice(-2), [503, 503]);
console.log('relais assistant : OK');
