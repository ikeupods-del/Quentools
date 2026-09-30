'use strict';
/* Publie AUTOMATIQUEMENT la prochaine publication de queue.json sur Instagram (1 par jour), via l'API officielle et gratuite d'Instagram.
   Lancé chaque jour par .github/workflows/instagram.yml. Variables : IG_USER_ID, IG_TOKEN (secrets GitHub), IMAGE_BASE (adresse publique des images).
   Options : --dry (n'envoie rien), --force (ignore « déjà publié aujourd'hui »).  Aucun secret n'est écrit dans le dépôt : state.json ne contient que des identifiants de posts. */
const fs = require('fs'), path = require('path');
const GRAPH = process.env.IG_GRAPH || 'https://graph.instagram.com/v21.0';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(fetchFn, method, url, params) {
  const opt = { method };
  if (method === 'POST') { opt.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; opt.body = new URLSearchParams(params).toString(); } else url += '?' + new URLSearchParams(params).toString();
  const r = await fetchFn(url, opt), j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Instagram : ' + ((j.error && (j.error.error_user_msg || j.error.message)) || 'erreur ' + r.status) + (j.error && j.error.code ? ' (code ' + j.error.code + ')' : ''));
  return j;
}

async function waitReady(fetchFn, id, token, wait) {   // la création d'un média est asynchrone : on attend « FINISHED »
  for (let i = 0; i < 20; i++) {
    const j = await api(fetchFn, 'GET', `${GRAPH}/${id}`, { fields: 'status_code', access_token: token });
    if (j.status_code === 'FINISHED' || !j.status_code) return;
    if (j.status_code === 'ERROR' || j.status_code === 'EXPIRED') throw new Error('Instagram a refusé l’image (' + j.status_code + ')');
    await wait(3000);
  }
  throw new Error('Instagram met trop de temps à traiter l’image');
}

async function publishItem(item, { fetchFn, uid, token, base, wait }) {
  const url = f => base.replace(/\/?$/, '/') + encodeURIComponent(f);
  for (const f of item.images) { const r = await fetchFn(url(f), { method: 'HEAD' }); if (!r.ok) throw new Error(`Image introuvable en ligne (${r.status}) : ${url(f)}`); }
  let creation;
  if (item.type === 'carousel') {
    const kids = [];
    for (const f of item.images) { const c = await api(fetchFn, 'POST', `${GRAPH}/${uid}/media`, { image_url: url(f), is_carousel_item: 'true', access_token: token }); await waitReady(fetchFn, c.id, token, wait); kids.push(c.id); }
    creation = (await api(fetchFn, 'POST', `${GRAPH}/${uid}/media`, { media_type: 'CAROUSEL', children: kids.join(','), caption: item.caption, access_token: token })).id;
  } else creation = (await api(fetchFn, 'POST', `${GRAPH}/${uid}/media`, { image_url: url(item.images[0]), caption: item.caption, access_token: token })).id;
  await waitReady(fetchFn, creation, token, wait);
  return (await api(fetchFn, 'POST', `${GRAPH}/${uid}/media_publish`, { creation_id: creation, access_token: token })).id;
}

async function run({ queue, state, env = process.env, fetchFn = fetch, dry = false, force = false, now = new Date(), wait = sleep, log = console.log }) {
  const todo = queue.filter(q => !state.posted.includes(q.id)), today = now.toISOString().slice(0, 10);
  if (!todo.length) throw new Error('La file est vide : plus rien à publier. Demandez de nouvelles publications.');
  if (!force && state.last && state.last.at && now - new Date(state.last.at) < 6 * 3600e3) { log('Une publication est déjà partie il y a moins de 6 h : rien à faire.'); return { skipped: true, state }; }   // 2 par jour (matin et soir), jamais 2 d’un coup
  const item = todo[0];
  log(`Publication : ${item.id} (${item.type}, ${item.images.length} image(s)) — ${todo.length - 1} restante(s) après celle-ci`);
  if (dry) { log('--- légende ---\n' + item.caption); return { dry: true, item, state }; }
  const uid = env.IG_USER_ID, token = env.IG_TOKEN, base = env.IMAGE_BASE;
  if (!uid || !token || !base) throw new Error('Configuration incomplète : secrets IG_USER_ID et IG_TOKEN (et adresse des images) requis.');
  const mediaId = await publishItem(item, { fetchFn, uid, token, base, wait });
  const next = { posted: [...state.posted, item.id], last: { id: item.id, date: today, at: now.toISOString(), mediaId } };
  log('✓ Publié : ' + item.id + ' (média ' + mediaId + ')'); if (todo.length - 1 <= 6) log(`::warning::Il ne reste que ${todo.length - 1} publication(s) dans la file.`);
  return { published: true, item, mediaId, state: next };
}

module.exports = { run, publishItem, api };
if (require.main === module) {
  const argv = process.argv.slice(2), qf = path.join(__dirname, 'queue.json'), sf = path.join(__dirname, 'state.json');
  const queue = JSON.parse(fs.readFileSync(qf, 'utf8')), state = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf8')) : { posted: [] };
  run({ queue, state, dry: argv.includes('--dry'), force: argv.includes('--force') }).then(r => { if (r.published) fs.writeFileSync(sf, JSON.stringify(r.state, null, 1) + '\n'); }).catch(e => { console.error('✗ ' + e.message); process.exit(1); });
}
