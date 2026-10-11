// Export optimisé : clips encodés en parallèle, clips inchangés repris du cache au deuxième export,
// un clip modifié réencodé seul, vidéo finale complète et lisible.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

(async () => {
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-exp-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=orange:s=320x180:d=1', '-frames:v', '1', path.join(base, 'p.png'));
  for (const f of ['a.mp4', 'p.png']) await fetch(U('/api/import?name=' + f), { method: 'POST', body: fs.readFileSync(path.join(base, f)) });
  const clip = (file, kind, extra = {}) => ({ file, kind, in: 0, out: kind === 'video' ? 3 : 0, dur: 2, speed: 1, vol: 100, hasAudio: kind === 'video', fx: [], afx: [], overlays: [], subs: [], key: { on: false }, ...extra });
  const projet = t => ({ format: 'horizontal', res: 720, fps: 30, quality: 'rapide', sortie: 'mp4', clips: [clip('a.mp4', 'video', { text: 'Bonjour' }), clip('p.png', 'image'), clip('a.mp4', 'video', { in: 1, out: 3, text: t }), { kind: 'solid', color: '#223344', dur: 1.5, fx: [], afx: [], overlays: [], subs: [], key: { on: false } }], audio: [], pistes: [] });
  const exporter = async p => {
    const { id } = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: p }) })).json();
    for (;;) { const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error) throw new Error(j.error); if (j.done) return j; await new Promise(r => setTimeout(r, 200)); }
  };
  const duree = f => +execFileSync(bins.ffmpeg, ['-hide_banner', '-i', path.join(base, 'exports', f)], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString().match(/Duration: (\d+):(\d+):([\d.]+)/)?.slice(1).reduce((a, x, k) => a + x * [3600, 60, 1][k], 0);
  const lireDuree = f => { try { return duree(f); } catch (e) { const m = String(e.stderr).match(/Duration: (\d+):(\d+):([\d.]+)/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; } };
  const j1 = await exporter(projet('Premier'));
  check('premier export : vidéo complète', Math.abs(lireDuree(j1.out) - 8.5) < 0.4, lireDuree(j1.out));
  check('premier export : clips encodés en parallèle', j1.paralleles >= 2, j1.paralleles);
  check('premier export : rien dans le cache au départ', j1.repris === 0, j1.repris);
  const j2 = await exporter(projet('Premier'));
  check('deuxième export identique : tous les clips repris du cache', j2.repris === 4, j2.repris);
  check('deuxième export : vidéo complète', Math.abs(lireDuree(j2.out) - 8.5) < 0.4, lireDuree(j2.out));
  const j3 = await exporter(projet('Texte changé'));
  check('un titre changé : seul ce clip est réencodé', j3.repris === 3, j3.repris);
  check('durée de l’export renvoyée', j3.duree > 0, j3.duree);
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Export : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
