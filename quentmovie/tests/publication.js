// Publication : connexion (PKCE) et envoi YouTube / TikTok contre de faux services, routes, secrets chiffrés, erreurs en français.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

(async () => {
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  // faux services Google et TikTok
  const jour = { codes: {}, uploads: [], meta: [], miniatures: 0, refresh: 0, quota: false, chunks: [], tokens: [] };
  const corps = req => new Promise(r => { const m = []; req.on('data', d => m.push(d)); req.on('end', () => r(Buffer.concat(m))); });
  const srv = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'), b = await corps(req), p = u.pathname, parle = (code, o, h = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
    if (p === '/token') {
      const f = new URLSearchParams(b.toString());
      if (f.get('grant_type') === 'authorization_code') {
        const c = jour.codes[f.get('code')]; if (!c) return parle(400, { error: 'invalid_grant' });
        const attendu = c.tiktok ? crypto.createHash('sha256').update(f.get('code_verifier')).digest('hex') : b64url(crypto.createHash('sha256').update(f.get('code_verifier')).digest());
        if (attendu !== c.defi) return parle(400, { error: 'invalid_grant', error_description: 'pkce' });
        jour.tokens.push(f.get('client_secret'));
        return parle(200, { access_token: 'acces-1', refresh_token: 'refresh-1', expires_in: 3600 });
      }
      if (f.get('grant_type') === 'refresh_token' && f.get('refresh_token') === 'refresh-1') { jour.refresh++; return parle(200, { access_token: 'acces-' + (1 + jour.refresh), expires_in: 3600 }); }
      return parle(400, { error: 'invalid_grant' });
    }
    if (p === '/youtube/v3/channels') return parle(200, { items: [{ snippet: { title: 'Ma chaîne test' } }] });
    if (p === '/upload/youtube/v3/videos') {
      if (req.headers.authorization === 'Bearer vieux') return parle(401, { error: { message: 'x' } });
      if (jour.quota) return parle(403, { error: { errors: [{ reason: 'quotaExceeded' }], message: 'quota' } });
      jour.meta.push({ q: Object.fromEntries(u.searchParams), h: req.headers, m: JSON.parse(b.toString()) });
      return parle(200, {}, { Location: `http://127.0.0.1:${srv.address().port}/up/${jour.meta.length}` });
    }
    if (p.startsWith('/up/')) { jour.uploads.push({ taille: b.length, type: req.headers['content-type'] }); return parle(200, { id: 'VID' + jour.uploads.length }); }
    if (p === '/upload/youtube/v3/thumbnails/set') { jour.miniatures++; return parle(200, { items: [] }); }
    if (p === '/v2/post/publish/inbox/video/init/') {
      const j = JSON.parse(b.toString()); jour.init = j;
      return parle(200, { data: { publish_id: 'PUB1', upload_url: `http://127.0.0.1:${srv.address().port}/tt/1` }, error: { code: 'ok' } });
    }
    if (p === '/tt/1') { jour.chunks.push({ range: req.headers['content-range'], taille: b.length }); return parle(req.headers['content-range'].endsWith(`${b.length ? '' : ''}`) ? 201 : 206, {}); }
    res.writeHead(404); res.end();
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const hote = `http://127.0.0.1:${srv.address().port}`;
  const points = { google: { auth: hote + '/auth', token: hote + '/token', api: hote }, tiktok: { auth: hote + '/tauth', token: hote + '/token', api: hote, max: 3000, morceau: 2000 } };

  // épisode prêt à publier
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pub-')), sorties = path.join(base, 'sorties'), ep = path.join(sorties, '10-test');
  fs.mkdirSync(ep, { recursive: true });
  fs.writeFileSync(path.join(ep, '10-test-youtube.mp4'), Buffer.alloc(150000, 7)); fs.writeFileSync(path.join(ep, '10-test-tiktok.mp4'), Buffer.alloc(7000, 9));
  fs.writeFileSync(path.join(ep, '10-miniature.png'), Buffer.alloc(5000, 1));
  fs.writeFileSync(path.join(ep, '10-test-publication.json'), JSON.stringify({ titre: 'Le <premier> krach ?', descriptionYoutube: 'Description <b>test</b>', tagsYoutube: ['krach', 'histoire'], legendeTikTok: 'Légende', contenuDeSynthese: false }));
  let navigateur = null; const ouvrirUrl = u => { navigateur = u; };
  const coffre = { chiffrer: t => 'chiffre:' + Buffer.from(t).toString('base64'), dechiffrer: t => Buffer.from(t.replace(/^chiffre:/, ''), 'base64').toString() };
  const app = create({ port: 0, base, ...bins, publicationPoints: points, ouvrirUrl, coffre, sortiesQuentInvest: sorties }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const post = (p, o) => fetch(U(p), { method: 'POST', body: JSON.stringify(o || {}) });
  const attendre = async id => { let j; for (let k = 0; k < 100; k++) { await new Promise(r => setTimeout(r, 100)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; } return j; };

  let e = await (await fetch(U('/api/publier'))).json();
  check('état : rien de configuré, épisode listé avec ses vidéos et sa miniature', !e.youtube.configure && !e.tiktok.configure && e.episodes.length === 1 && e.episodes[0].video.youtube && e.episodes[0].video.tiktok && e.episodes[0].miniature.youtube, JSON.stringify(e).slice(0, 200));
  const court = await post('/api/publier/configurer', { plateforme: 'youtube', id: 'x', secret: 'y' });
  check('configuration : valeurs trop courtes refusées', court.status >= 400);
  await post('/api/publier/configurer', { plateforme: 'youtube', id: 'client-youtube-123', secret: 'SECRET-youtube-456' });
  await post('/api/publier/configurer', { plateforme: 'tiktok', id: 'client-tiktok-123', secret: 'SECRET-tiktok-456' });
  const brut = fs.readFileSync(path.join(base, 'publication', 'comptes.json'), 'utf8');
  check('secrets : chiffrés dans le fichier des comptes', !/SECRET-youtube-456/.test(brut) && /chiffre:/.test(brut));

  // connexion YouTube : le « navigateur » reçoit l'adresse d'autorisation et revient avec un code
  const connecter = async plateforme => {
    const r = await (await post('/api/publier/connecter', { plateforme })).json(), a = new URL(navigateur), red = a.searchParams.get('redirect_uri'), tiktok = plateforme === 'tiktok';
    check(`connexion ${plateforme} : PKCE S256 et retour sur 127.0.0.1`, a.searchParams.get('code_challenge_method') === 'S256' && /^http:\/\/127\.0\.0\.1:\d+\/oauth$/.test(red));
    jour.codes['code-' + plateforme] = { defi: a.searchParams.get('code_challenge'), tiktok };
    const rep = await fetch(`${red}?code=code-${plateforme}&state=${a.searchParams.get('state')}`); await rep.text();
    return attendre(r.id);
  };
  let j = await connecter('youtube');
  check('connexion YouTube : jeton obtenu', j.done && !j.error, JSON.stringify(j).slice(0, 200));
  e = await (await fetch(U('/api/publier'))).json();
  check('état : YouTube connecté avec le nom de la chaîne', e.youtube.connecte && e.youtube.nom === 'Ma chaîne test', JSON.stringify(e.youtube));
  check('connexion : le serveur reçoit la clé secrète pour l\'échange', jour.tokens.includes('SECRET-youtube-456'));
  // un mauvais « state » est refusé
  const r2 = await (await post('/api/publier/connecter', { plateforme: 'tiktok' })).json(), a2 = new URL(navigateur);
  const mauvais = await fetch(`${a2.searchParams.get('redirect_uri')}?code=x&state=mauvais`); await mauvais.text();
  const j2 = await attendre(r2.id); check('connexion : retour avec un mauvais « state » refusé', j2.error && /inattendue|refusée/.test(j2.error), JSON.stringify(j2).slice(0, 160));
  j = await connecter('tiktok'); check('connexion TikTok : défi hexadécimal accepté', j.done && !j.error, JSON.stringify(j).slice(0, 200));

  // envoi YouTube : privé par défaut, titre nettoyé, miniature
  let r = await (await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '10-test' })).json(); j = await attendre(r.id);
  check('YouTube : envoi terminé', j.done && !j.error && j.resultat.id === 'VID1', JSON.stringify(j).slice(0, 220));
  const m = jour.meta[0];
  check('YouTube : vidéo privée, titre sans < >, mots-clés, langue française', m.m.status.privacyStatus === 'private' && m.m.snippet.title === 'Le premier krach ?' && m.m.snippet.tags.join() === 'krach,histoire' && m.m.snippet.defaultLanguage === 'fr', JSON.stringify(m.m));
  check('YouTube : contenu de synthèse et public enfant déclarés', m.m.status.containsSyntheticMedia === false && m.m.status.selfDeclaredMadeForKids === false);
  check('YouTube : octets envoyés = taille du fichier', jour.uploads[0].taille === 150000 && m.h['x-upload-content-length'] === '150000');
  check('YouTube : miniature envoyée', jour.miniatures === 1 && j.resultat.miniature === true);
  check('YouTube : lien vers YouTube Studio', /studio\.youtube\.com\/video\/VID1/.test(j.resultat.lien));
  // programmation
  const futur = new Date(Date.now() + 3 * 3600e3).toISOString();
  r = await (await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '10-test', programmation: futur, confidentialite: 'public' })).json(); j = await attendre(r.id);
  check('YouTube : programmation = privée avec heure de mise en ligne', j.done && jour.meta[1].m.status.privacyStatus === 'private' && jour.meta[1].m.status.publishAt === futur, JSON.stringify(jour.meta[1] && jour.meta[1].m.status));
  r = await (await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '10-test', programmation: '2020-01-01T10:00:00Z' })).json(); j = await attendre(r.id);
  check('YouTube : date passée refusée', j.error && /futur/.test(j.error), JSON.stringify(j).slice(0, 160));
  // quota
  jour.quota = true; r = await (await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '10-test' })).json(); j = await attendre(r.id); jour.quota = false;
  check('YouTube : quota dépassé expliqué en français', j.error && /quota YouTube du jour/.test(j.error), j.error);
  // jeton expiré : renouvelé avec le jeton de rafraîchissement
  const comptes = JSON.parse(fs.readFileSync(path.join(base, 'publication', 'comptes.json'), 'utf8')); comptes.youtube.expire = 1; fs.writeFileSync(path.join(base, 'publication', 'comptes.json'), JSON.stringify(comptes));
  r = await (await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '10-test' })).json(); j = await attendre(r.id);
  check('YouTube : jeton expiré renouvelé tout seul', j.done && !j.error && jour.refresh === 1, JSON.stringify(j).slice(0, 160));
  // TikTok : 7000 octets avec des parties de 2000 (au-delà de 3000) → 3 parties, la dernière jusqu'à la fin
  r = await (await post('/api/publier/envoyer', { plateforme: 'tiktok', episode: '10-test' })).json(); j = await attendre(r.id);
  check('TikTok : brouillon envoyé', j.done && !j.error && j.resultat.publication === 'PUB1' && /brouillon|application TikTok/.test(j.resultat.message), JSON.stringify(j).slice(0, 200));
  check('TikTok : déclaration de la taille et des parties', jour.init.source_info.video_size === 7000 && jour.init.source_info.chunk_size === 2000 && jour.init.source_info.total_chunk_count === 3, JSON.stringify(jour.init));
  check('TikTok : parties envoyées avec les bonnes plages', jour.chunks.map(c => c.range).join() === 'bytes 0-1999/7000,bytes 2000-3999/7000,bytes 4000-6999/7000' && jour.chunks.map(c => c.taille).join() === '2000,2000,3000', JSON.stringify(jour.chunks));
  // épisode inconnu, plateforme inconnue, déconnexion
  const x = await post('/api/publier/envoyer', { plateforme: 'youtube', episode: '../../etc' }); check('envoi : épisode hors liste refusé', x.status >= 400);
  const y = await post('/api/publier/envoyer', { plateforme: 'dailymotion', episode: '10-test' }); check('envoi : plateforme inconnue refusée', y.status >= 400);
  await post('/api/publier/deconnecter', { plateforme: 'youtube' }); e = await (await fetch(U('/api/publier'))).json();
  check('déconnexion : compte retiré', !e.youtube.configure && !e.youtube.connecte && e.tiktok.connecte);
  const o = await (await post('/api/publier/ouvrir', { cible: 'studio' })).json(); check('aide manuelle : YouTube Studio ouvert', o.ok && /studio\.youtube\.com/.test(navigateur));
  app.stop(); srv.close(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Publication : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
