// Contrôle de la piste vidéo 2 : image dans l'image (rond avec bordure, coins arrondis), plan de coupe plein écran,
// son de l'élément mélangé, aperçu rapide ; vérification des couleurs aux bons endroits et aux bons moments.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pistes-'));
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}) });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const gen = path.join(base, 'gen'); fs.mkdirSync(gen);
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'color=c=0xff0000:s=640x360:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=300:d=6', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'fond.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=0x0000ff:s=640x480:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=900:d=6', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'tete.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=0x00ff00:s=400x300', '-frames:v', 1, path.join(gen, 'verte.png'));
  for (const n of ['fond.mp4', 'tete.mp4', 'verte.png']) { const r = await fetch(U('/api/import?name=' + n), { method: 'POST', body: fs.readFileSync(path.join(gen, n)) }); check('import ' + n, r.ok); }

  const clip = { file: 'fond.mp4', kind: 'video', in: 0, out: 6, speed: 1, vol: 100, hasAudio: true, fx: [], afx: [], key: {}, overlays: [], subs: [] };
  const pistes = [
    { file: 'tete.mp4', kind: 'video', start: 1, in: 0, out: 2, plein: false, x: 75, y: 30, scale: 30, forme: 'rond', bord: '#ffffff', opacity: 100, vol: 100, hasAudio: true, anim: '', ligne: 0 },
    { file: 'verte.png', kind: 'image', start: 4, dur: 1.5, plein: true, opacity: 100, anim: '', ligne: 0 },
    { file: 'verte.png', kind: 'image', start: 1, dur: 2, plein: false, x: 20, y: 70, scale: 20, forme: 'arrondi', bord: '', opacity: 100, anim: 'fondu', ligne: 1 }
  ];
  const attendre = async id => { for (let i = 0; i < 400; i++) { await new Promise(r => setTimeout(r, 300)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
  const ex = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { format: 'horizontal', fps: 30, res: 480, clips: [clip], pistes } }) })).json();
  const e = await attendre(ex.id);
  check('export avec piste vidéo 2', e.done && e.out, e.error);
  if (e.out) {
    const f = path.join(base, 'exports', e.out);
    // couleur d'un point (x, y en %) à l'instant t
    const pixel = (t, x, y) => { const b = execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', 1, '-vf', `format=rgb24,crop=1:1:iw*${x / 100}:ih*${y / 100}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']); return [...b]; };
    const est = (c, r, g, b) => Math.abs(c[0] - r) < 60 && Math.abs(c[1] - g) < 60 && Math.abs(c[2] - b) < 60;
    check('avant : fond rouge', est(pixel(0.5, 75, 30), 255, 0, 0), pixel(0.5, 75, 30));
    check('rond bleu à sa place', est(pixel(2, 75, 30), 0, 0, 255), pixel(2, 75, 30));
    check('coin du rond transparent', est(pixel(2, 75 - 14, 30 - 25), 255, 0, 0), pixel(2, 75 - 14, 30 - 25));
    check('bordure blanche du rond', est(pixel(2, 75, 30 - 26.6 - 0.3), 255, 255, 255), pixel(2, 75, 30 - 26.6 - 0.3));
    check('rond retiré après sa fin', est(pixel(3.5, 75, 30), 255, 0, 0), pixel(3.5, 75, 30));
    check('image arrondie à sa place', est(pixel(2, 20, 70), 0, 255, 0), pixel(2, 20, 70));
    check('plan de coupe plein écran', est(pixel(4.7, 10, 10), 0, 255, 0) && est(pixel(4.7, 90, 90), 0, 255, 0), pixel(4.7, 10, 10));
    check('retour au montage après le plan de coupe', est(pixel(5.8, 10, 10), 255, 0, 0), pixel(5.8, 10, 10));
    const err = require('child_process').spawnSync(bins.ffmpeg, ['-hide_banner', '-i', f, '-af', 'bandpass=f=900:width_type=h:w=100,volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const err0 = require('child_process').spawnSync(bins.ffmpeg, ['-hide_banner', '-ss', '4', '-i', f, '-af', 'bandpass=f=900:width_type=h:w=100,volumedetect', '-vn', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
    const db = s => +((/max_volume: (-?[\d.]+) dB/.exec(s) || [])[1] || -99);
    check('son de l’élément mélangé pendant sa durée', db(err) > db(err0) + 10, `${db(err)} / ${db(err0)}`);
    const dur = +((/Duration: (\d+):(\d+):([\d.]+)/.exec(require('child_process').spawnSync(bins.ffmpeg, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr) || []).slice(1).reduce((a, x, i) => a + x * [3600, 60, 1][i], 0));
    check('durée du montage inchangée', Math.abs(dur - 6) < 0.2, dur);
  }
  const ap = await (await fetch(U('/api/apercu'), { method: 'POST', body: JSON.stringify({ project: { format: 'horizontal', fps: 30, clips: [clip], pistes } }) })).json();
  const a = await attendre(ap.id);
  check('aperçu avec piste vidéo 2', a.done && a.url, a.error);
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Pistes vidéo : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
