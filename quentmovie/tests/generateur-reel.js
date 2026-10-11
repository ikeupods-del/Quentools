// Essai complet du générateur avec le vrai Wikipédia, le vrai Wikimedia Commons et les voix du Mac,
// comme dans la fenêtre : sujet → article → scènes → images + voix off → montage exporté (titre, sous-titres, musique).
// Lancé par le workflow de construction sur un vrai Mac (QM_RESEAU=1) ; ignoré sans accès à internet.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

if (!process.env.QM_RESEAU) { console.log('Générateur (réseau) : ignoré (QM_RESEAU non défini)'); process.exit(0); }
let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  console.log('FFmpeg :', bins.ffmpeg, '| ffprobe :', bins.ffprobe);
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-reel-'));
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}) });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const json = async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j; };
  // suivi affiché toutes les 20 s (étape et avancement), pour savoir où un travail s'attarde
  const attendre = async id => { let j = {}; for (let i = 0; i < 1500; i++) { await new Promise(r => setTimeout(r, 400)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; if (i % 50 === 49) console.log(`  … ${Math.round((i + 1) * 0.4)} s : ${j.step || ''} ${Math.round((j.progress || 0) * 100)} %`); } try { console.log(require('child_process').execSync('ps -ax -o etime,%cpu,command | grep -i "[f]fmpeg" | cut -c1-1500').toString()); } catch (e) { /* aucun FFmpeg en cours */ } return { error: `trop long (bloqué à : ${j.step} ${Math.round((j.progress || 0) * 100)} %)` }; };

  const ch = await json(await fetch(U('/api/generer/chercher?q=' + encodeURIComponent('génère moi une vidéo sur l’histoire de Michelin'))));
  console.log('Articles :', ch.resultats.map(r => r.titre).join(' | '));
  check('article Michelin trouvé', ch.resultats.some(r => /^Michelin$/.test(r.titre)));
  const prep = await json(await fetch(U('/api/generer/preparer'), { method: 'POST', body: JSON.stringify({ article: 'Michelin', duree: 45, titre: ch.titre }) }));
  console.log(`Scènes : ${prep.scenes.length}, images : ${prep.images.length}`);
  prep.scenes.forEach((s, i) => console.log(`  ${i + 1}. ${s.texte.slice(0, 110)}`));
  check('scènes écrites', prep.scenes.length >= 3);
  check('images trouvées', prep.images.length >= 3);
  const v = await json(await fetch(U('/api/generer/voix')));
  console.log('Voix françaises :', v.voix.map(x => x.nom).join(', '), '| par défaut :', v.defaut);
  check('voix du Mac', v.voix.length > 0);

  const { id } = await json(await fetch(U('/api/generer/creer'), { method: 'POST', body: JSON.stringify({ titre: prep.titre, scenes: prep.scenes, images: prep.images, voix: v.defaut, vitesse: 185 }) }));
  const j = await attendre(id);
  check('création terminée', j.done && j.resultat, j.error);
  const r = j.resultat || { scenes: [], credits: [] };
  console.log('Voix off :', r.scenes.map(x => x.duree + ' s').join(', '), '| images :', r.scenes.filter(x => x.image).length, '| synthèse :', r.synthese);
  check('voix de synthèse utilisée', r.synthese === true);
  check('chaque scène a sa voix', r.scenes.length === prep.scenes.length && r.scenes.every(x => x.duree > 1));
  check('images téléchargées', r.scenes.filter(x => x.image).length >= Math.min(3, r.scenes.length));

  // montage comme monterGeneree (index.html)
  const clips = [{ kind: 'solid', color: '#0b1d3a', dur: 3, fx: [], key: {}, titre: { preset: 'chapitre', l1: prep.titre.toUpperCase(), l2: '', start: 0.2, dur: 0 }, transition: { type: 'fade', dur: 0.6 } },
    ...r.scenes.map((x, i) => ({ file: x.voix, kind: 'audio', in: 0, out: x.duree, speed: 1, vol: 100, hasAudio: true, bgFile: x.image || undefined, bgColor: '#101820', viz: { type: 'none' }, key: {},
      fx: [{ id: ['zoomavant', 'panoD', 'zoomarriere', 'panoG'][i % 4], p: {} }], subs: [{ s: 0, e: x.duree - 0.6, t: x.texte.split(' ').slice(0, 7).join(' ') }], subStyle: 'bandeau', transition: { type: 'fade', dur: 0.6 } })),
    { kind: 'solid', color: '#000000', dur: 8, fx: [], key: {}, titre: { preset: 'generique', l1: 'Sources\n' + r.credits.join('\n'), l2: '', start: 0.2, dur: 0 } }];
  const ex = await json(await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { format: 'horizontal', fps: 30, res: 720, clips, audio: [{ file: 'lib:musiques/piano-chill.mp3', vol: 22, start: 0, fade: true, loop: true, duck: true }] } }) }));
  const e = await attendre(ex.id);
  check('vidéo exportée', e.done && e.out, e.error || `bloqué à : ${e.step} (${Math.round((e.progress || 0) * 100)} %)`);
  if (e.out) console.log('Vidéo :', path.join(base, 'exports', e.out), Math.round(fs.statSync(path.join(base, 'exports', e.out)).size / 1e6) + ' Mo');

  // le mixage avec musique en boucle et baisse automatique bloquait parfois FFmpeg : cinq exports d'affilée
  const court = { format: 'horizontal', fps: 30, res: 480, clips: clips.slice(0, 3), audio: [{ file: 'lib:musiques/piano-chill.mp3', vol: 22, start: 0, fade: true, loop: true, duck: true }, { file: 'lib:musiques/piano-chill.mp3', vol: 10, start: 1, fade: false, loop: true, duck: true }] };
  let bons = 0; const t0 = Date.now();
  for (let k = 0; k < 5; k++) { const x = await attendre((await json(await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: court }) }))).id); if (x.done) bons++; else console.log('  export', k + 1, ':', x.error); }
  console.log(`Exports avec musique et baisse automatique : ${bons}/5 en ${Math.round((Date.now() - t0) / 1000)} s`);
  check('mixage avec baisse automatique fiable', bons === 5, bons);

  app.stop(); if (!process.env.QM_GARDER) fs.rmSync(base, { recursive: true, force: true });
  console.log(`Générateur (réseau) : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
