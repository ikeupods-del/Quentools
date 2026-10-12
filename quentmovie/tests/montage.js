// Fonctions de montage : zoom et cadrage manuels, fondus réglables, son détaché à une autre vitesse.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { create } = require('../server');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-montage-'));
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}) });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const gen = path.join(base, 'gen'); fs.mkdirSync(gen);
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  // image de 640x360 : moitié gauche rouge, moitié droite bleue ; son de 440 Hz
  ff('-f', 'lavfi', '-i', 'color=c=0xff0000:s=320x360:r=30:d=6', '-f', 'lavfi', '-i', 'color=c=0x0000ff:s=320x360:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=440:d=6',
    '-filter_complex', '[0:v][1:v]hstack', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'moitie.mp4'));
  const r = await fetch(U('/api/import?name=moitie.mp4'), { method: 'POST', body: fs.readFileSync(path.join(gen, 'moitie.mp4')) }); check('import', r.ok);
  const clip = { file: 'moitie.mp4', kind: 'video', in: 0, out: 6, speed: 1, vol: 100, hasAudio: true, fx: [], afx: [], key: {}, overlays: [], subs: [], fit: 'fill' };
  const attendre = async id => { for (let i = 0; i < 400; i++) { await new Promise(r => setTimeout(r, 300)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
  const exporter = async project => { const ex = await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { format: 'horizontal', fps: 30, res: 480, ...project } }) })).json(); return attendre(ex.id); };
  const pixel = (f, t, x, y) => [...execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', 1, '-vf', `format=rgb24,crop=1:1:iw*${x / 100}:ih*${y / 100}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])];
  const est = (c, rr, g, b) => Math.abs(c[0] - rr) < 70 && Math.abs(c[1] - g) < 70 && Math.abs(c[2] - b) < 70;
  const vol = (f, ss, t) => +((/max_volume: (-?[\d.]+) dB/.exec(spawnSync(bins.ffmpeg, ['-hide_banner', '-ss', ss, '-t', t, '-i', f, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr) || [])[1] || -99);

  // 1) zoom 200 % calé à droite : tout l'écran est bleu ; à gauche : tout rouge ; sans zoom : moitié-moitié
  const droite = await exporter({ clips: [{ ...clip, zoom: 200, zx: 100, zy: 0 }] });
  check('export avec zoom', droite.done && droite.out, droite.error);
  if (droite.out) { const f = path.join(base, 'exports', droite.out); check('zoom à droite : tout bleu', est(pixel(f, 1, 10, 50), 0, 0, 255) && est(pixel(f, 1, 90, 50), 0, 0, 255), JSON.stringify([pixel(f, 1, 10, 50), pixel(f, 1, 90, 50)])); }
  const gauche = await exporter({ clips: [{ ...clip, zoom: 200, zx: -100, zy: 0 }] });
  if (gauche.out) { const f = path.join(base, 'exports', gauche.out); check('zoom à gauche : tout rouge', est(pixel(f, 1, 10, 50), 255, 0, 0) && est(pixel(f, 1, 90, 50), 255, 0, 0)); }
  const normal = await exporter({ clips: [{ ...clip }] });
  if (normal.out) { const f = path.join(base, 'exports', normal.out); check('sans zoom : moitié rouge, moitié bleue', est(pixel(f, 1, 10, 50), 255, 0, 0) && est(pixel(f, 1, 90, 50), 0, 0, 255)); }

  // 2) fondus réglables : entrée de 2 s (image noire au début, normale ensuite), sortie de 2 s
  const fondu = await exporter({ clips: [{ ...clip, fadeIn: 2, fadeOut: 2 }] });
  check('export avec fondus réglés', fondu.done && fondu.out, fondu.error);
  if (fondu.out) {
    const f = path.join(base, 'exports', fondu.out), lum = c => c[0] + c[1] + c[2];
    check('fondu d’entrée : noir au début, plein au milieu', lum(pixel(f, 0.05, 10, 50)) < 120 && lum(pixel(f, 3, 10, 50)) > 200, JSON.stringify([pixel(f, 0.05, 10, 50), pixel(f, 3, 10, 50)]));
    check('fondu de sortie : sombre à la fin', lum(pixel(f, 5.9, 10, 50)) < 140, JSON.stringify(pixel(f, 5.9, 10, 50)));
    check('fondu du son : silence au tout début, son au milieu', vol(f, '0', '0.15') < vol(f, '2.5', '1') - 12, `${vol(f, '0', '0.15')} / ${vol(f, '2.5', '1')}`);
  }

  // 3) son détaché d'une vidéo accélérée (2×) : 4 s de source jouées en 2 s
  const rapide = await exporter({ clips: [{ ...clip, vol: 0 }], audio: [{ file: 'moitie.mp4', start: 1, in: 0, dur: 4, vit: 2, vol: 100, detache: true }] });
  check('export avec son détaché accéléré', rapide.done && rapide.out, rapide.error);
  if (rapide.out) { const f = path.join(base, 'exports', rapide.out); check('son détaché à 2× : présent pendant 2 s puis silence', vol(f, '1.2', '1.4') > -30 && vol(f, '3.6', '1.5') < -50, `${vol(f, '1.2', '1.4')} / ${vol(f, '3.6', '1.5')}`); }

  // 4) détection des changements de plan : trois plans de 2 s → coupes vers 2 s et 4 s
  ff('-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=green:s=320x180:r=25:d=2', '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0', '-pix_fmt', 'yuv420p', path.join(gen, 'plans.mp4'));
  await fetch(U('/api/import?name=plans.mp4'), { method: 'POST', body: fs.readFileSync(path.join(gen, 'plans.mp4')) });
  const pl = await (await fetch(U('/api/plans?file=plans.mp4&in=0&out=6'))).json();
  check('plans : deux changements trouvés aux bons endroits', pl.plans && pl.plans.length === 2 && Math.abs(pl.plans[0] - 2) < 0.2 && Math.abs(pl.plans[1] - 4) < 0.2, JSON.stringify(pl));
  // 5) rythme : une pulsation toutes les 0,5 s (120 par minute), la première à 0,2 s
  const sr = 11025, n = sr * 20, pcm = Buffer.alloc(n * 2);
  for (let k = 0; k < 40; k++) { const d0 = Math.round((0.2 + k * 0.5) * sr); for (let i = 0; i < 400 && d0 + i < n; i++) pcm.writeInt16LE(Math.round(20000 * Math.sin(i * 0.5) * (1 - i / 400)), (d0 + i) * 2); }
  const wavHead = Buffer.alloc(44); wavHead.write('RIFF', 0); wavHead.writeUInt32LE(36 + pcm.length, 4); wavHead.write('WAVEfmt ', 8); wavHead.writeUInt32LE(16, 16); wavHead.writeUInt16LE(1, 20); wavHead.writeUInt16LE(1, 22); wavHead.writeUInt32LE(sr, 24); wavHead.writeUInt32LE(sr * 2, 28); wavHead.writeUInt16LE(2, 32); wavHead.writeUInt16LE(16, 34); wavHead.write('data', 36); wavHead.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(gen, 'pulsations.wav'), Buffer.concat([wavHead, pcm]));
  await fetch(U('/api/import?name=pulsations.wav'), { method: 'POST', body: fs.readFileSync(path.join(gen, 'pulsations.wav')) });
  const ry = await (await fetch(U('/api/rythme?file=pulsations.wav&in=0&dur=20'))).json();
  check('rythme : 120 pulsations par minute', ry.bpm > 117 && ry.bpm < 123, JSON.stringify({ ...ry, temps: ry.temps && ry.temps.length }));
  check('rythme : temps calés sur les pulsations', ry.temps && ry.temps.length > 30 && Math.abs(((ry.premier - 0.2) % 0.5 + 0.5) % 0.5) < 0.06 || Math.abs(((ry.premier - 0.2) % 0.5 + 0.5) % 0.5 - 0.5) < 0.06, `${ry.premier}`);

  // 3) partage AirDrop : seuls des fichiers des exports sont transmis à la feuille de partage de macOS
  let recus = null;
  const app2 = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}), partager: f => { recus = f; } });
  const p2 = await app2.start(), U2 = p => `http://127.0.0.1:${p2}${p}`, ex0 = fs.readdirSync(path.join(base, 'exports'))[0];
  const post = body => fetch(U2('/api/partager'), { method: 'POST', body: JSON.stringify(body) });
  check('partage : un export est transmis', ex0 && (await post({ files: [ex0] })).ok && recus && recus.length === 1 && recus[0] === path.join(base, 'exports', ex0));
  recus = null;
  check('partage : fichier absent ou hors exports refusé', (await post({ files: ['../projets/x', 'inconnu.mp4'] })).status === 404 && !recus);
  const sans = await (await fetch(U('/api/partager'), { method: 'POST', body: JSON.stringify({ files: [ex0] }) })).json();
  check('partage : hors application Mac, message clair', sans.ok === false && /application Mac/.test(sans.message));
  app2.stop();

  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Montage : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
