// Interface de montage pilotée dans un vrai navigateur (Chromium sans fenêtre) : sélection multiple, détacher / rattacher le son,
// clic droit, couper un son, aimantation et poignées des sons, aide au montage (plans, rythme, volumes, transitions).
// Ignoré (sans échec) quand aucun Chromium n'est disponible (par exemple sur le Mac de construction).
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* pas de navigateur */ }
  return null;
}

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Interface : ignorée (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-ui-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]), dep = (f, buf) => fetch(U('/api/import?name=' + f), { method: 'POST', body: buf });
  // médias : vidéo à 3 plans (rouge, bleu, vert) avec son, son de 20 s, pulsations à 120 par minute, photo
  ff('-f', 'lavfi', '-i', 'color=c=red:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=green:s=320x180:r=25:d=2', '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]', '-map', '[v]', '-pix_fmt', 'yuv420p', path.join(base, 'plans.mp4'));
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=440:d=6', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'sine=f=440:d=20', path.join(base, 'son.wav'));
  const sr = 11025, n = sr * 20, pcm = Buffer.alloc(n * 2); for (let k = 0; k < 40; k++) { const d0 = Math.round(k * 0.5 * sr); for (let i = 0; i < 400 && d0 + i < n; i++) pcm.writeInt16LE(Math.round(20000 * Math.sin(i * 0.5) * (1 - i / 400)), (d0 + i) * 2); }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(sr, 24); h.writeUInt32LE(sr * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(path.join(base, 'tempo.wav'), Buffer.concat([h, pcm]));
  ff('-f', 'lavfi', '-i', 'color=c=orange:s=320x180:d=1', '-frames:v', '1', path.join(base, 'photo.png'));
  for (const f of ['plans.mp4', 'a.mp4', 'son.wav', 'tempo.wav', 'photo.png']) await dep(f, fs.readFileSync(path.join(base, f)));
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); await pg.goto(U('/')); await pg.waitForTimeout(1000);
  const ev = (f, ...a) => pg.evaluate(f, ...a);

  // 1) sélection multiple, clic droit, détacher / rattacher le son
  await ev(async () => { await chargerMedias(); const m = medias.find(x => x.file === 'a.mp4'); for (let i = 0; i < 3; i++) proj.clips.push(newClip(m)); sel = 0; commit(); tout(); }); await pg.waitForTimeout(500);
  await pg.click('.clip[data-i="2"]', { modifiers: ['Shift'] });
  check('sélection multiple (⇧clic)', await ev(() => clipsMulti().length === 3) && await ev(() => /3 clips sélectionnés/.test($('#insp').textContent)));
  await pg.click('.clip[data-i="1"]', { button: 'right' }); check('menu clic droit', await ev(() => !!document.getElementById('menuCtx')));
  await pg.click('#menuCtx [data-mc="det"]'); await pg.waitForTimeout(200);
  check('détacher le son de 3 clips', await ev(() => proj.audio.length === 3 && proj.clips.every(c => c.sonDetache && c.vol === 0)));
  await pg.click('.clip[data-i="0"]'); await pg.click('.clip[data-i="0"]', { button: 'right' }); await pg.click('#menuCtx [data-mc="rat"]'); await pg.waitForTimeout(200);
  check('rattacher le son', await ev(() => proj.audio.length === 2 && !proj.clips[0].sonDetache && proj.clips[0].vol === 100));
  await pg.click('.clip[data-i="0"]'); await pg.keyboard.press('d'); await pg.waitForTimeout(200); check('touche D détache le son', await ev(() => proj.audio.length === 3 && proj.clips[0].sonDetache));
  await pg.click('.clip[data-i="0"]'); await pg.click('.clip[data-i="1"]', { modifiers: ['Shift'] }); await pg.keyboard.press('Delete'); await pg.waitForTimeout(200);
  check('suppression de plusieurs clips', await ev(() => proj.clips.length === 1));
  // couper un son détaché
  await ev(() => { proj.clips.splice(1); proj.audio.splice(0); proj.clips[0].sonDetache = false; proj.clips[0].vol = 100; sel = 0; tout(); });
  await pg.click('.clip[data-i="0"]'); await pg.keyboard.press('d'); await pg.waitForTimeout(150); await ev(() => placerTete(2.5, { sansSelection: true })); await pg.keyboard.press('s'); await pg.waitForTimeout(200);
  const aud = await ev(() => proj.audio.map(a => ({ start: a.start, in: a.in, dur: a.dur })));
  check('couper un son détaché', aud.length === 2 && Math.abs(aud[0].dur - 2.5) < 0.06 && Math.abs(aud[1].start - 2.5) < 0.06 && Math.abs(aud[1].dur - 3.5) < 0.06, JSON.stringify(aud));
  check('inspecteur : zoom et fondus', await ev(() => { sel = 0; selA = -1; inspecteur(); return /Zoom et cadrage/.test($('#insp').textContent) && /Fondu d’entrée/.test($('#insp').textContent); }));

  // 2) sons : aimantation et poignées
  await ev(() => { proj.clips = []; proj.audio = [{ file: 'son.wav', start: 5, in: 0, dur: 10, vol: 100, fade: false, loop: false, duck: false }]; selA = -1; sel = -1; setZoom(40); gt = 1; commit(); tout(); }); await pg.waitForTimeout(300);
  const box = () => ev(() => { const e = document.querySelector('.aud').getBoundingClientRect(); return { x: e.x, y: e.y, w: e.width, h: e.height }; });
  let r = await box(); await pg.mouse.move(r.x + r.w / 2, r.y + r.h / 2); await pg.mouse.down(); await pg.mouse.move(r.x + r.w / 2 - 3.95 * 40, r.y + r.h / 2, { steps: 6 });
  check('guide d’aimantation visible', await ev(() => !!document.getElementById('guide'))); await pg.mouse.up();
  check('aimantation sur la tête de lecture', await ev(() => Math.abs(proj.audio[0].start - 1) < 0.01), await ev(() => proj.audio[0].start));
  r = await box(); await pg.mouse.move(r.x + 3, r.y + r.h / 2); await pg.mouse.down(); await pg.mouse.move(r.x + 43, r.y + r.h / 2, { steps: 5 }); await pg.mouse.up();
  let a = await ev(() => proj.audio[0]); check('poignée gauche', Math.abs(a.in - 1) < 0.15 && Math.abs(a.start - 2) < 0.15 && Math.abs(a.dur - 9) < 0.2, JSON.stringify(a));
  r = await box(); await pg.mouse.move(r.x + r.w - 3, r.y + r.h / 2); await pg.mouse.down(); await pg.mouse.move(r.x + r.w - 83, r.y + r.h / 2, { steps: 5 }); await pg.mouse.up();
  a = await ev(() => proj.audio[0]); check('poignée droite', Math.abs(a.dur - 7) < 0.25, JSON.stringify(a));

  // 3) aide au montage
  await ev(async () => { const v = medias.find(m => m.file === 'plans.mp4'); proj.audio = []; proj.clips = [newClip(v)]; sel = 0; commit(); tout(); });
  await ev(() => detecterPlans(true)); await pg.waitForTimeout(500);
  const cl = await ev(() => proj.clips.map(c => [c.in, c.out])); check('plans : 3 plans', cl.length === 3 && Math.abs(cl[0][1] - 2) < 0.2 && Math.abs(cl[1][1] - 4) < 0.2, JSON.stringify(cl));
  await ev(() => { const ph = medias.find(m => m.file === 'photo.png'); proj.clips = []; for (let i = 0; i < 4; i++) { const c = newClip(ph); c.kind = 'image'; c.dur = 3; proj.clips.push(c); } proj.audio = [{ file: 'tempo.wav', start: 0, vol: 50, fade: false, loop: false, duck: false }]; commit(); tout(); allerOnglet('outils'); });
  await pg.waitForTimeout(300); await ev(() => rythmeMusique('caler')); await pg.waitForTimeout(800);
  const durs = await ev(() => proj.clips.map(c => c.dur)); check('rythme : photos calées sur 4 temps', durs.every(d => Math.abs(d / 2 - Math.round(d / 2)) < 0.1 && d >= 1.9), JSON.stringify(durs));
  await ev(() => rythmeMusique('reperes')); await pg.waitForTimeout(500); check('rythme : repères posés', await ev(() => proj.markers.length > 10));
  await ev(() => { const v = medias.find(m => m.file === 'plans.mp4'); proj.clips = [newClip(v), newClip(v), newClip(v)]; proj.clips.forEach(c => { c.hasAudio = true; }); commit(); tout(); egaliserVolumes(); });
  check('égaliser les volumes', await ev(() => proj.clips.every(c => c.afx.some(e => e.id === 'normaliser'))));
  await ev(() => { allerOnglet('outils'); }); await pg.waitForTimeout(200); await ev(() => { $('#oTrAll').value = $('#oTrAll').options[1].value; transitionPartout(); });
  check('transition sur toutes les coupures', await ev(() => proj.clips.filter(c => c.transition).length === 2));

  check('aucune erreur dans la page', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Interface : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
