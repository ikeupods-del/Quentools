// Publication Instagram automatique : ordre de la file, un seul post par jour, carrousel, refus clairs (faux Instagram, aucun réseau).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { run } = require('../../../marketing/wouf/publish.js');
const preview = require('../../../marketing/wouf/preview.js');
const queue = JSON.parse(fs.readFileSync(new URL('../../../marketing/wouf/queue.json', import.meta.url), 'utf8'));
const ENV = { IG_USER_ID: '123', IG_TOKEN: 'tok', IMAGE_BASE: 'https://img.test/images/' };
const NOW = new Date('2026-10-01T16:20:00Z'), q2 = [{ id: 'a', type: 'image', images: ['a.png'], caption: 'Légende A' }, { id: 'c', type: 'carousel', images: ['c1.png', 'c2.png'], caption: 'Légende C' }];
function fake(over = {}) {
  const calls = []; let n = 0;
  const fetchFn = async (url, o = {}) => { url = String(url); calls.push({ url, method: o.method, body: o.body });
    if (o.method === 'HEAD') return new Response('', { status: over.head || 200 });
    if (over.fail && url.endsWith('/media_publish')) return new Response(JSON.stringify({ error: { message: 'Application request limit reached', code: 4 } }), { status: 400 });
    if (url.endsWith('/media') || url.endsWith('/media_publish')) return new Response(JSON.stringify({ id: 'id' + ++n }));
    return new Response(JSON.stringify({ status_code: 'FINISHED' })); };
  return { fetchFn, calls };
}
const go = (extra = {}) => run({ queue: q2, state: { posted: [] }, env: ENV, now: NOW, wait: async () => {}, log: () => {}, ...extra });

test('la file du dépôt est valide : ids uniques, 5 hashtags maximum, images présentes, lancement en premier', () => {
  assert.ok(queue.length >= 30); assert.equal(queue[0].id, 'post-01-lancement'); assert.equal(new Set(queue.map(q => q.id)).size, queue.length);
  for (const it of queue) { assert.ok((it.caption.match(/#\w+/g) || []).length <= 5, it.id); assert.ok(it.caption.length <= 2200, it.id); for (const f of it.images) assert.ok(fs.existsSync(new URL('../../../marketing/wouf/images/' + f, import.meta.url)), f); }
  assert.ok(queue.some(q => q.type === 'carousel'));
});
test('publie la première publication non faite avec sa légende, puis la mémorise', async () => {
  const { fetchFn, calls } = fake(), r = await go({ fetchFn });
  assert.equal(r.published, true); assert.equal(r.item.id, 'a'); assert.deepEqual(r.state.posted, ['a']); assert.equal(r.state.last.date, '2026-10-01');
  const create = calls.find(c => c.url.endsWith('/123/media')); assert.match(create.body, /image_url=https%3A%2F%2Fimg\.test%2Fimages%2Fa\.png/); assert.match(create.body, /caption=L%C3%A9gende\+A/); assert.match(create.body, /access_token=tok/);
  assert.ok(calls.some(c => c.url.endsWith('/123/media_publish') && /creation_id=id1/.test(c.body)));
});
test('un seul post par jour (sauf --force) ; la publication suivante le lendemain', async () => {
  const s1 = (await go({ fetchFn: fake().fetchFn })).state; const same = await go({ state: s1, fetchFn: fake().fetchFn }); assert.equal(same.skipped, true);
  assert.equal((await go({ state: s1, force: true, fetchFn: fake().fetchFn })).item.id, 'c');
  assert.equal((await go({ state: s1, now: new Date('2026-10-01T22:30:00Z'), fetchFn: fake().fetchFn })).item.id, 'c', 'le soir, plus de 6 h après le matin');
  assert.equal((await go({ state: s1, now: new Date('2026-10-01T19:00:00Z'), fetchFn: fake().fetchFn })).skipped, true, 'moins de 6 h : pas de doublon');
});
test('carrousel : une image par vignette puis un conteneur « CAROUSEL » avec ses enfants', async () => {
  const { fetchFn, calls } = fake(), r = await go({ state: { posted: ['a'] }, fetchFn }); assert.equal(r.item.id, 'c');
  const posts = calls.filter(c => c.method === 'POST' && c.url.endsWith('/123/media')); assert.equal(posts.length, 3);
  assert.match(posts[0].body, /is_carousel_item=true/); assert.match(posts[2].body, /media_type=CAROUSEL/); assert.match(posts[2].body, /children=id1%2Cid2/);
});
test('simulation, file vide, configuration absente, image introuvable, refus d’Instagram : jamais de faux « publié »', async () => {
  const { fetchFn, calls } = fake(); const d = await go({ dry: true, fetchFn }); assert.equal(d.dry, true); assert.equal(calls.length, 0);
  await assert.rejects(go({ state: { posted: ['a', 'c'] }, fetchFn }), /file est vide/);
  await assert.rejects(go({ env: {}, fetchFn }), /Configuration incomplète/);
  await assert.rejects(go({ fetchFn: fake({ head: 404 }).fetchFn }), /Image introuvable en ligne \(404\)/);
  await assert.rejects(go({ fetchFn: fake({ fail: true }).fetchFn }), /Application request limit reached \(code 4\)/);
});

test('aperçu du lendemain : e-mail avec les 2 prochaines publications (images et légendes), sans rien publier', async () => {
  const sent = []; const fetchFn = async (u, o) => { sent.push({ u: String(u), o }); return new Response('{}', { status: 200 }); };
  const env = { RESEND_API_KEY: 're_x', MAIL_TO: 'moi@example.fr', IMAGE_BASE: 'https://img.test/images/' };
  const r = await preview.run({ queue: q2.concat([{ id: 'z', type: 'image', images: ['z.png'], caption: 'Z <b>' }]), state: { posted: [] }, env, fetchFn, log: () => {} });
  assert.equal(r.sent, true); assert.equal(sent.length, 1); assert.equal(sent[0].u, 'https://api.resend.com/emails');
  const b = JSON.parse(sent[0].o.body); assert.deepEqual(b.to, ['moi@example.fr']); assert.match(b.subject, /a \+ c/); assert.match(b.html, /Demain 7 h/); assert.match(b.html, /Demain 18 h/); assert.match(b.html, /https:\/\/img\.test\/images\/c2\.png/); assert.match(b.html, /Légende A/); assert.doesNotMatch(b.html, /Z <b>/, 'la 3e n’est pas dans l’aperçu');
  assert.equal((await preview.run({ queue: q2, state: { posted: ['a'] }, env, fetchFn, log: () => {} })).mail.subject.includes('c'), true, 'les publications déjà faites sont sautées');
  await assert.rejects(preview.run({ queue: q2, state: { posted: [] }, env: {}, fetchFn }), /Configuration incomplète/);
  sent.length = 0; await preview.run({ queue: q2, state: { posted: [] }, env: { RESEND_API_KEY: 're_x', IMAGE_BASE: 'https://img.test/images/' }, fetchFn, log: () => {} });
  assert.deepEqual(JSON.parse(sent[0].o.body).to, ['wouf-contact@proton.me'], 'par défaut : la boîte Proton de Wouf');
  await assert.rejects(preview.run({ queue: q2, state: { posted: [] }, env, fetchFn: async () => new Response('non', { status: 403 }) }), /Resend \(403\)/);
  assert.equal((await preview.run({ queue: q2, state: { posted: [] }, env: {}, dry: true, fetchFn, log: () => {} })).dry, true);
});
