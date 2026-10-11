// Contrôle du générateur de vidéos : sujet, texte tiré de l'article, choix des images libres, voix off, montage exporté.
// Wikipédia et Wikimedia Commons sont simulés par un petit serveur local (aucun accès à internet).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { create } = require('../server');
const G = require('../generateur');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

const EXTRAIT = `Michelin est une entreprise française de fabrication de pneumatiques, fondée en 1889 à Clermont-Ferrand par les frères André et Édouard Michelin. Elle est l'un des premiers fabricants mondiaux de pneus. Le groupe publie aussi le célèbre guide gastronomique (prononcé [miʃlɛ̃]) qui porte son nom.

== Histoire ==
=== Les débuts ===
En 1889, M. André Michelin et son frère reprennent une petite fabrique de caoutchouc en difficulté à Clermont-Ferrand. En 1891, ils déposent le brevet du pneu démontable pour bicyclette. Le cycliste Charles Terront gagne la course Paris-Brest-Paris avec ces pneus, ce qui fait connaître la marque.
=== Le Bibendum ===
En 1898, le dessinateur O'Galop crée le Bibendum, bonhomme fait de pneus devenu l'emblème de l'entreprise. En 1900 paraît la première édition du guide Michelin, offerte aux automobilistes.
=== Le pneu radial ===
En 1946, Michelin invente le pneu à carcasse radiale, qui dure plus longtemps et consomme moins. Cette invention transforme toute l'industrie du pneumatique dans le monde.

== Notes et références ==
Référence un. Référence deux qui ne doit jamais être lue dans la vidéo.`;

(async () => {
  // 1) Analyse du sujet et du texte
  const s = G.sujetDe('génère moi une vidéo sur l’histoire de Michelin');
  check('sujet : titre', s.titre === 'L’histoire de Michelin', s.titre);
  check('sujet : recherche', s.recherche === 'Michelin', s.recherche);
  check('sujet simple', G.sujetDe('La tour Eiffel').recherche === 'La tour Eiffel');
  const ph = G.phrases('M. Dupont arrive en 1900. Il part en 1910 av. J.-C. ensuite. Fin.');
  check('phrases et abréviations', ph.length === 3 && ph[0] === 'M. Dupont arrive en 1900.', JSON.stringify(ph));
  check('parenthèses : garde les années, retire le reste', G.nettoyerPhrase('Le guide (prononcé [x]) est né (1900) à Paris.') === 'Le guide est né (1900) à Paris.', G.nettoyerPhrase('Le guide (prononcé [x]) est né (1900) à Paris.'));
  const sc = G.construireScript(EXTRAIT, 60);
  const tout = sc.join(' ');
  check('script : commence par l’introduction', /^Michelin est une entreprise/.test(tout));
  check('script : sections historiques dans l’ordre', tout.indexOf('1891') < tout.indexOf('1898') && tout.indexOf('1898') < tout.indexOf('1946'));
  check('script : jamais les références', !/Référence/.test(tout));
  const court = G.construireScript(EXTRAIT, 20).join(' ');
  check('script : durée respectée', court.split(/\s+/).length <= 20 * 2.6 * 1.1 + 48, court.split(/\s+/).length);

  // 2) Faux Wikipédia et faux Commons
  const bins = await resolveFfmpeg();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-gen-'));
  const photo = path.join(base, 'photo.jpg');
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1280x800', '-frames:v', 1, photo]);
  const appels = [];
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), q = Object.fromEntries(u.searchParams), port = srv.address().port;
    appels.push(req.headers['user-agent']);
    if (u.pathname.startsWith('/images/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(fs.readFileSync(photo)); }
    res.setHeader('Content-Type', 'application/json');
    if (q.list === 'search') return res.end(JSON.stringify({ query: { search: [{ title: 'Michelin', snippet: '<span class="searchmatch">Michelin</span> est une entreprise' }, { title: 'Guide Michelin', snippet: 'Guide' }] } }));
    if (q.prop === 'extracts|images|info') return res.end(JSON.stringify({ query: { pages: [{ title: q.titles, fullurl: 'https://fr.wikipedia.org/wiki/Michelin', extract: EXTRAIT,
      images: [{ title: 'Fichier:Michelin logo.svg' }, { title: 'Fichier:Usine Michelin 1900.jpg' }, { title: 'Fichier:Bibendum.jpg' }, { title: 'Fichier:Petit.jpg' }] }] } }));
    const info = (t, w, h, mime) => ({ title: t, imageinfo: [{ mime, width: w, height: h, url: `http://127.0.0.1:${port}/images/${encodeURIComponent(t)}`, thumburl: `http://127.0.0.1:${port}/images/1920px-${encodeURIComponent(t)}`, descriptionurl: 'https://commons.wikimedia.org/wiki/' + t,
      extmetadata: { Artist: { value: '<a href="x">Agence Rol</a>' }, LicenseShortName: { value: 'Public domain' } } }] });
    if (q.prop === 'imageinfo' && q.titles) return res.end(JSON.stringify({ query: { pages: q.titles.split('|').map(t => /Petit/.test(t) ? info(t, 300, 200, 'image/jpeg') : info(t, 2000, 1400, 'image/jpeg')) } }));
    if (q.generator === 'search') return res.end(JSON.stringify({ query: { pages: [{ index: 1, ...info('File:Michelin pneu.jpg', 1800, 1200, 'image/jpeg') }, { index: 2, ...info('File:Clermont.png', 1600, 1000, 'image/png') }] } }));
    res.end('{}');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const mock = `http://127.0.0.1:${srv.address().port}`;
  const app = create({ port: 0, base, ...bins, wiki: mock, commons: mock });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;

  const ch = await (await fetch(U('/api/generer/chercher?q=' + encodeURIComponent('génère moi une vidéo sur l’histoire de Michelin')))).json();
  check('recherche Wikipédia', ch.resultats && ch.resultats[0].titre === 'Michelin' && !/</.test(ch.resultats[0].extrait), JSON.stringify(ch));
  check('identification polie auprès de Wikipédia', appels.every(a => /QuentMovie\/[\d.]+ .*github\.com/.test(a)), appels[0]);
  const prep = await (await fetch(U('/api/generer/preparer'), { method: 'POST', body: JSON.stringify({ article: 'Michelin', duree: 60, titre: ch.titre }) })).json();
  check('préparation : scènes', prep.scenes && prep.scenes.length >= 3, JSON.stringify(prep).slice(0, 300));
  const noms = (prep.images || []).map(x => x.nom);
  check('images : logos et petites images écartées', !noms.some(n => /logo|Petit/.test(n)), noms.join(', '));
  check('images : celles de l’article d’abord', noms[0] === 'Usine Michelin 1900.jpg' && noms[1] === 'Bibendum.jpg', noms.join(', '));
  check('images : complétées par une recherche', noms.includes('Michelin pneu.jpg'), noms.join(', '));
  check('images : auteur et licence lisibles', prep.images[0].auteur === 'Agence Rol' && prep.images[0].licence === 'Public domain', JSON.stringify(prep.images[0]));
  const v = await (await fetch(U('/api/generer/voix'))).json();
  check('liste des voix françaises', Array.isArray(v.voix) && (process.platform !== 'darwin' || v.voix.length > 0), JSON.stringify(v).slice(0, 200));

  // 3) Création : images téléchargées, voix off, puis montage exporté comme le fait la fenêtre
  prep.scenes[0].texte = 'Texte corrigé à la main avant la création de la vidéo.';
  const { id } = await (await fetch(U('/api/generer/creer'), { method: 'POST', body: JSON.stringify({ titre: prep.titre, scenes: prep.scenes, images: prep.images, voix: v.defaut, vitesse: 190 }) })).json();
  let j; for (let i = 0; i < 400; i++) { await new Promise(r => setTimeout(r, 300)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) break; }
  check('création terminée', j && j.done && j.resultat, j && j.error);
  const r = j.resultat || { scenes: [], credits: [] };
  check('une voix off par scène', r.scenes.length === prep.scenes.length && r.scenes.every(x => x.duree > 1.5 && fs.existsSync(path.join(base, 'medias', x.voix))), JSON.stringify(r.scenes));
  check('images téléchargées', r.scenes.every(x => x.image && fs.existsSync(path.join(base, 'medias', x.image))));
  check('crédits des images', r.credits.length >= 1 && /Agence Rol — Public domain/.test(r.credits[0]), JSON.stringify(r.credits));
  if (process.platform === 'darwin') check('voix de synthèse du Mac utilisée', r.synthese === true);
  const clips = [{ kind: 'solid', color: '#0b1d3a', dur: 2, fx: [], key: {}, titre: { preset: 'chapitre', l1: 'L’HISTOIRE DE MICHELIN', l2: '', start: 0.2, dur: 0 }, transition: { type: 'fade', dur: 0.6 } },
    ...r.scenes.slice(0, 3).map((x, i) => ({ file: x.voix, kind: 'audio', in: 0, out: x.duree, speed: 1, vol: 100, hasAudio: true, bgFile: x.image, bgColor: '#101820', viz: { type: 'none' }, key: {},
      fx: [{ id: ['zoomavant', 'panoD', 'zoomarriere'][i], p: {} }], subs: [{ s: 0, e: x.duree - 0.6, t: x.texte.split(' ').slice(0, 7).join(' ') }], subStyle: 'bandeau', transition: i < 2 ? { type: 'fade', dur: 0.6 } : null }))];
  const ex = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { format: 'horizontal', fps: 30, res: 480, clips, audio: [{ file: 'lib:musiques/piano-chill.mp3', vol: 22, start: 0, fade: true, loop: true, duck: true }] } }) })).json();
  let e; for (let i = 0; i < 600; i++) { await new Promise(rr => setTimeout(rr, 300)); e = await (await fetch(U('/api/job?id=' + ex.id))).json(); if (e.done || e.error) break; }
  check('vidéo générée exportée', e && e.done && e.out, e && e.error);
  if (e && e.out) {
    const d = parseFloat(execFileSync(bins.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(base, 'exports', e.out)]).toString());
    const attendu = 2 + r.scenes.slice(0, 3).reduce((a, x) => a + x.duree, 0) - 3 * 0.6;
    check('durée de la vidéo générée', Math.abs(d - attendu) < 1.2, `${d} au lieu de ${attendu}`);
  }
  check('sujet vide refusé', (await fetch(U('/api/generer/chercher?q='))).status === 500);

  app.stop(); srv.close(); if (process.env.QM_GARDER) console.log('Dossier gardé :', base); else fs.rmSync(base, { recursive: true, force: true });
  console.log(`Générateur : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
