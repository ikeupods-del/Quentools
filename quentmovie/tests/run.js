// Contrôle complet du moteur : chaque effet, transition, incrustation, texte, fond vert et export.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { create } = require('../server');
const FX = require('../effects');
const { resolveFfmpeg } = require('../ffmpeg-path');

let ok = 0, ko = 0, skip = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };

(async () => {
  const bins = await resolveFfmpeg();
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-test-'));
  const app = create({ port: 0, base, ...bins });
  const port = await app.start();
  const U = p => `http://127.0.0.1:${port}${p}`;
  console.log('Serveur de test sur', port, '—', bins.ffmpeg);

  // Médias de test
  const gen = path.join(base, 'gen'); fs.mkdirSync(gen);
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc2=s=1280x720:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=330:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'demo.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=0x00b140:s=1280x720:r=30:d=4', '-f', 'lavfi', '-i', 'color=c=orange:s=300x300:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4',
    '-filter_complex', "[0][1]overlay=x='100+200*t':y=200[o]", '-map', '[o]', '-map', '2:a', '-shortest', '-pix_fmt', 'yuv420p', path.join(gen, 'vert.mp4'));
  ff('-f', 'lavfi', '-i', 'testsrc2=s=800x800', '-frames:v', 1, path.join(gen, 'photo.png'));
  ff('-f', 'lavfi', '-i', 'sine=f=220:d=12', path.join(gen, 'musique.mp3'));
  for (const n of ['demo.mp4', 'vert.mp4', 'photo.png', 'musique.mp3']) {
    const r = await fetch(U('/api/import?name=' + n), { method: 'POST', body: fs.readFileSync(path.join(gen, n)) });
    check('import ' + n, r.ok, await r.clone().text());
  }
  const cat = await (await fetch(U('/api/catalogue'))).json();
  check('catalogue', cat.video.length >= 30 && cat.audio.length >= 8 && cat.transitions.length >= 15);
  console.log(`Banque : ${cat.video.length} effets image, ${cat.audio.length} effets son, ${cat.transitions.length} transitions`);

  const clip = (extra = {}) => ({ file: 'demo.mp4', kind: 'video', in: 0, out: 4, speed: 1, vol: 100, hasAudio: true, fit: 'fill', fx: [], key: {}, ...extra });
  const project = (clips, extra = {}) => ({ format: 'vertical', fps: 30, res: 480, clips, ...extra });
  const preview = async (c, t = 1) => fetch(U('/api/preview'), { method: 'POST', body: JSON.stringify({ project: project([c]), clip: c, t }) });
  const isJpeg = async r => { const b = Buffer.from(await r.arrayBuffer()); return r.ok && b[0] === 0xff && b[1] === 0xd8 && b.length > 2000; };

  // 1) Chaque effet image, en aperçu et avec ses valeurs extrêmes
  for (const d of cat.video) {
    if (!d.dispo) { skip++; console.log('  (ignoré, filtre absent) ' + d.id); continue; }
    for (const mode of ['défaut', 'min', 'max']) {
      const p = {}; if (mode !== 'défaut') d.params.forEach(q => { p[q.k] = mode === 'min' ? q.min : q.max; });
      const r = await preview(clip({ fx: [{ id: d.id, p }] }));
      check(`effet ${d.id} (${mode})`, await isJpeg(r), r.ok ? '' : (await r.text()).slice(0, 300));
    }
  }
  // Effet sur une photo, et vignettes
  check('effet sur photo', await isJpeg(await preview({ file: 'photo.png', kind: 'image', dur: 3, fit: 'fill', fx: [{ id: 'zoomavant' }, { id: 'vignette' }], key: {} })));
  check('vignette d’effet', await isJpeg(await fetch(U('/api/fxthumb?file=demo.mp4&kind=video&t=1&fx=glitch'))));

  // 2) Texte : styles et animations
  for (const style of ['simple', 'bandeau', 'contour', 'ombre']) for (const anim of ['aucune', 'apparition', 'glisse']) {
    const r = await preview(clip({ text: 'Bonjour : le monde, "test" (1/2)', textStyle: style, textAnim: anim, textPos: 'milieu', textStart: 0.5, textDur: 2 }));
    check(`texte ${style}/${anim}`, await isJpeg(r), r.ok ? '' : (await r.text()).slice(0, 300));
  }
  // 3) Incrustation, fond vert, cadrage flou
  check('incrustation', await isJpeg(await preview(clip({ pip: { on: true, file: 'photo.png', kind: 'image', pos: 'tr', scale: 30, opacity: 80 } }))));
  check('incrustation vidéo', await isJpeg(await preview(clip({ pip: { on: true, file: 'vert.mp4', kind: 'video', pos: 'mc', scale: 40, opacity: 100 } }))));
  check('fond vert + image', await isJpeg(await preview(clip({ file: 'vert.mp4', key: { on: true, color: '#00b140', sim: 0.15, blend: 0.08, despill: true, bgType: 'file', bgFile: 'photo.png', bgKind: 'image' } }))));
  check('cadrage flou', await isJpeg(await preview(clip({ fit: 'flou' }))));

  // 4) Export complet : transitions, effets son, musique, vitesse, inverse
  const job = async (url, proj) => {
    const { id } = await (await fetch(U(url), { method: 'POST', body: JSON.stringify({ project: proj }) })).json();
    for (let i = 0; i < 400; i++) {
      await new Promise(r => setTimeout(r, 300));
      const j = await (await fetch(U('/api/job?id=' + id))).json();
      if (j.error) return { error: j.error };
      if (j.done) return j;
    }
    return { error: 'délai dépassé' };
  };
  const probeDur = f => parseFloat(execFileSync(bins.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

  const afxAll = cat.audio.filter(a => a.dispo).map(a => ({ id: a.id, p: {} }));
  let r = await job('/api/export', project([
    clip({ out: 2, afx: afxAll.slice(0, 5), transition: { type: 'fade', dur: 0.5 }, text: 'Titre', textStyle: 'contour', fx: [{ id: 'vhs' }] }),
    clip({ file: 'photo.png', kind: 'image', dur: 2, fx: [{ id: 'zoomavant' }], transition: { type: 'slideleft', dur: 0.5 }, hasAudio: false }),
    clip({ file: 'vert.mp4', speed: 2, fade: true, afx: afxAll.slice(5), key: { on: true, color: '#00b140', sim: 0.15, blend: 0.08, bgType: 'color', bgColor: '#223388' } }),
    clip({ out: 2, fx: [{ id: 'inverse' }] })
  ], { audio: [{ file: 'musique.mp3', vol: 30, start: 0, fade: true }, { file: 'musique.mp3', vol: 60, start: 3 }] }));
  check('export avec transitions et musique', !r.error && r.out, r.error);
  if (r.out) {
    const f = path.join(base, 'exports', r.out), d = probeDur(f);
    const st = execFileSync(bins.ffprobe, ['-v', 'error', '-show_entries', 'stream=codec_name,width,height', '-of', 'csv=p=0', f]).toString();
    check('durée attendue (≈ 2+2+2+2 − 1 de transitions)', d > 6 && d < 8, d);
    check('format vertical', /1080|480/.test(st) && st.includes('h264'), st);
  }
  // Toutes les transitions
  for (const t of cat.transitions) {
    const rr = await job('/api/export', project([clip({ out: 1.5, transition: { type: t.id, dur: 0.5 } }), clip({ file: 'vert.mp4', out: 1.5 })]));
    check('transition ' + t.id, !rr.error && rr.out, rr.error);
  }
  // Aperçu animé
  r = await job('/api/apercu', project([clip({ out: 2, fx: [{ id: 'glitch' }] }), clip({ out: 2 })]));
  check('aperçu animé', !r.error && r.url, r.error);
  if (r.url) { const v = await fetch(U(r.url)); check('lecture aperçu', v.ok && (await v.arrayBuffer()).byteLength > 5000); }

  // 5) Projets et sécurité
  await fetch(U('/api/projets/essai'), { method: 'PUT', body: JSON.stringify({ clips: [1] }) });
  check('projet enregistré', (await (await fetch(U('/api/projets'))).json()).items.includes('essai'));
  check('projet relu', (await (await fetch(U('/api/projets/essai'))).json()).clips[0] === 1);
  const evil = await fetch(U('/api/catalogue'), { headers: { Origin: 'https://exemple.fr' } });
  check('origine étrangère refusée', evil.status === 403);

  console.log(`\n${ok} contrôles réussis, ${ko} échecs, ${skip} effets ignorés (filtre absent)`);
  app.stop();
  fs.rmSync(base, { recursive: true, force: true });
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
