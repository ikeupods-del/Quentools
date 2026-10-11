// Contrôle du recadrage qui suit la personne : une vidéo horizontale montée en vertical, la fenêtre de recadrage
// va de la gauche (rouge) à la droite (bleu) de l'image selon les points { t, x }.
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
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-cadrage-'));
  const app = create({ port: 0, base, ...bins });
  const port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const src = path.join(base, 'large.mp4');
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0xff0000:s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'color=c=0x0000ff:s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=d=4',
    '-filter_complex', '[0][1]hstack[v]', '-map', '[v]', '-map', '2:a', '-shortest', '-pix_fmt', 'yuv420p', src]);
  check('import', (await fetch(U('/api/import?name=large.mp4'), { method: 'POST', body: fs.readFileSync(src) })).ok);
  const clip = { file: 'large.mp4', kind: 'video', in: 0, out: 4, speed: 1, vol: 100, hasAudio: true, fx: [], afx: [], key: {}, overlays: [], subs: [], cadrage: [{ t: 0, x: 0 }, { t: 1, x: 0 }, { t: 3, x: 1 }, { t: 4, x: 1 }] };
  const attendre = async id => { for (let i = 0; i < 300; i++) { await new Promise(r => setTimeout(r, 300)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.done || j.error) return j; } return { error: 'trop long' }; };
  const e = await attendre((await (await fetch(U('/api/export'), { method: 'POST', body: JSON.stringify({ project: { format: 'vertical', fps: 30, res: 480, clips: [clip] } }) })).json()).id);
  check('export recadré', e.done && e.out, e.error);
  if (e.out) {
    const f = path.join(base, 'exports', e.out);
    const pixel = t => [...execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', 1, '-vf', 'format=rgb24,crop=1:1:iw/2:ih/2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])];
    const a = pixel(0.4), b = pixel(3.6);
    check('début : la fenêtre est à gauche (rouge)', a[0] > 200 && a[2] < 60, a);
    check('fin : la fenêtre a suivi vers la droite (bleu)', b[2] > 200 && b[0] < 60, b);
  }
  // aperçu d'une image : même cadrage à l'instant demandé
  const r = await fetch(U('/api/preview'), { method: 'POST', body: JSON.stringify({ project: { format: 'vertical', fps: 30 }, clip, t: 3.8 }) });
  const jpg = path.join(base, 'apercu.jpg'); fs.writeFileSync(jpg, Buffer.from(await r.arrayBuffer()));
  const c = [...execFileSync(bins.ffmpeg, ['-v', 'error', '-i', jpg, '-vf', 'format=rgb24,crop=1:1:iw/2:ih/2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])];
  check('aperçu recadré au bon instant', c[2] > 200 && c[0] < 60, c);
  app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Recadrage : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
