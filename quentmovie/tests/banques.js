// Banques de photos gratuites : réponses de chaque service (formats documentés) simulées, clés gratuites gardées localement, relais des vignettes.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { creer } = require('../banques');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-banques-')), photo = path.join(base, 'p.jpg');
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1280x800', '-frames:v', 1, photo]);
  const vus = []; let port = 0;
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), q = Object.fromEntries(u.searchParams); vus.push(u.pathname + ' ' + (req.headers.authorization || ''));
    if (u.pathname.startsWith('/img/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(fs.readFileSync(photo)); }
    res.setHeader('Content-Type', 'application/json');
    const img = n => `http://127.0.0.1:${port}/img/${n}.jpg`;
    if (u.pathname === '/v1/images/') return res.end(JSON.stringify({ results: [{ title: 'Cyclist <b>in</b> Paris', url: img('ov1'), thumbnail: img('ov1t'), width: 3000, height: 2000, creator: 'Jean Photo', license: 'by-sa', license_version: '4.0', foreign_landing_url: 'https://flickr.com/p/1', tags: [{ name: 'bicycle' }, { name: 'city' }] }, { title: 'Trop petite', url: img('ov2'), width: 300, height: 200 }] }));
    if (u.pathname === '/search') return res.end(JSON.stringify({ collection: { items: [{ data: [{ title: 'Full Moon', nasa_id: 'PIA00001', description: 'The moon', keywords: ['moon'], center: 'JPL' }], links: [{ href: img('PIA00001~thumb').replace('/img/', '/img/n/'), rel: 'preview' }] }] } }));
    if (u.pathname === '/v1/search') { if (req.headers.authorization !== 'CLEPEXELS123') { res.statusCode = 401; return res.end('{}'); } return res.end(JSON.stringify({ photos: [{ id: 7, width: 4000, height: 2600, url: 'https://pexels.com/photo/7', photographer: 'Ana', alt: 'A woman riding a bicycle', src: { large2x: img('px7'), medium: img('px7m'), original: img('px7o') } }] })); }
    if (u.pathname === '/api/') { if (q.key !== 'CLEPIXABAY456') { res.statusCode = 400; return res.end('Invalid key'); } return res.end(JSON.stringify({ hits: [{ id: 9, tags: 'bicycle, city, street', largeImageURL: img('pb9'), webformatURL: img('pb9w'), imageWidth: 5000, imageHeight: 3300, user: 'Karl', pageURL: 'https://pixabay.com/p/9' }] })); }
    if (u.pathname === '/search/photos') { if (req.headers.authorization !== 'Client-ID CLEUNSPLASH789') { res.statusCode = 401; return res.end('{}'); } return res.end(JSON.stringify({ results: [{ id: 'u1', width: 6000, height: 4000, description: 'Bike at sunset', alt_description: 'a bike', urls: { raw: img('us1') + '?ixid=abc', small: img('us1s') }, user: { name: 'Lea' }, links: { html: 'https://unsplash.com/photos/u1', download_location: `http://127.0.0.1:${port}/photos/u1/download` } }] })); }
    if (u.pathname === '/photos/u1/download') return res.end('{"url":"x"}');
    res.end('{}');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); port = srv.address().port; const O = `http://127.0.0.1:${port}`;
  const bases = { openverse: O, nasa: O, pexels: O, pixabay: O, unsplash: O };

  // 1) chaque banque, au format commun
  const B = creer({ bases, cles: { pexels: 'CLEPEXELS123', pixabay: 'CLEPIXABAY456', unsplash: 'CLEUNSPLASH789' } });
  const tout = await B.chercher('bicycle', { actives: ['openverse', 'nasa', 'pexels', 'pixabay', 'unsplash'] });
  const par = s => tout.find(x => x.source === s);
  check('Openverse : photo, auteur, licence, étiquettes (les trop petites écartées)', par('Openverse') && par('Openverse').auteur === 'Jean Photo' && par('Openverse').licence === 'BY-SA 4.0' && /bicycle/.test(par('Openverse').description) && !/<b>/.test(par('Openverse').nom) && tout.filter(x => x.source === 'Openverse').length === 1, JSON.stringify(par('Openverse')));
  check('NASA : domaine public, grande version', par('NASA') && par('NASA').licence === 'Domaine public (NASA)' && /~large\./.test(par('NASA').url), JSON.stringify(par('NASA')));
  check('Pexels : clé envoyée, photo large', par('Pexels') && par('Pexels').largeur === 4000 && par('Pexels').qualite === true && par('Pexels').auteur === 'Ana', JSON.stringify(par('Pexels')));
  check('Pixabay : clé envoyée, étiquettes', par('Pixabay') && par('Pixabay').nom === 'bicycle, city, street' && par('Pixabay').largeur === 5000);
  check('Unsplash : 1920 px, signalement prévu', par('Unsplash') && /w=1920/.test(par('Unsplash').url) && /download/.test(par('Unsplash').suivi) && par('Unsplash').auteur === 'Lea');
  await B.signaler(par('Unsplash')); check('Unsplash : photo utilisée signalée', vus.some(v => v.startsWith('/photos/u1/download Client-ID CLEUNSPLASH789')));
  const sansCle = await creer({ bases }).chercher('bicycle', { actives: ['pexels', 'pixabay', 'unsplash', 'nasa'] });
  check('banques à clé ignorées sans clé', sansCle.every(x => x.source === 'NASA'), sansCle.map(x => x.source).join());
  const mauvaise = await creer({ bases, cles: { pexels: 'FAUSSE_CLE_123' } }).chercher('bicycle', { actives: ['pexels', 'nasa'] });
  check('une banque en erreur (mauvaise clé) n’empêche pas les autres', mauvaise.length === 1 && mauvaise[0].source === 'NASA');

  // 2) dans l'application : clés enregistrées localement, jamais renvoyées ; photos de toutes les banques ; vignettes relayées
  const app = create({ port: 0, base: path.join(base, 'b'), ...bins, banques: bases, commons: O, wiki: O }), p = await app.start(), U = x => `http://127.0.0.1:${p}${x}`;
  let l = await (await fetch(U('/api/banques'))).json();
  check('liste des banques : sans clé, Pexels inactif faute de clé', l.banques.length === 6 && l.banques.find(x => x.id === 'pexels').cle === false && l.banques.find(x => x.id === 'openverse').active === true);
  const rep = await fetch(U('/api/banques'), { method: 'POST', body: JSON.stringify({ id: 'pexels', cle: 'CLEPEXELS123' }) }); check('clé enregistrée', rep.ok);
  await fetch(U('/api/banques'), { method: 'POST', body: JSON.stringify({ id: 'nasa', active: false }) });
  l = await (await fetch(U('/api/banques'))).json(); const px = l.banques.find(x => x.id === 'pexels');
  check('clé jamais renvoyée en clair', px.cle === true && px.cleFin === '…S123' && !JSON.stringify(l).includes('CLEPEXELS123') && l.banques.find(x => x.id === 'nasa').active === false);
  const fichier = path.join(base, 'b', 'reglages.json'); check('clés dans le dossier de l’utilisateur seulement (fichier privé)', fs.existsSync(fichier) && (fs.statSync(fichier).mode & 0o077) === 0, fs.existsSync(fichier) && fs.statSync(fichier).mode.toString(8));
  check('clé invalide refusée', !(await fetch(U('/api/banques'), { method: 'POST', body: JSON.stringify({ id: 'pixabay', cle: 'a b;c' }) })).ok);
  const r = await (await fetch(U('/api/generer/images'), { method: 'POST', body: JSON.stringify({ q: 'bicycle city', format: 'horizontal' }) })).json();
  const src = new Set((r.images || []).map(x => x.source)); check('recherche d’une photo : Openverse et Pexels répondent, NASA désactivée', src.has('Openverse') && src.has('Pexels') && !src.has('NASA'), [...src].join());
  const im = (r.images || []).find(x => x.source === 'Pexels'), v = im && await fetch(U('/api/vignette?w=330&u=' + encodeURIComponent(im.apercu)));
  check('vignette d’une photo de banque servie par QuentMovie', v && v.status === 200 && /image/.test(v.headers.get('content-type')), v && v.status);
  srv.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Banques de photos : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
