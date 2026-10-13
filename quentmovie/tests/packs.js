// Chaque pack de montage appliqué depuis l'interface (toutes ses options cochées) puis exporté pour de vrai :
// transitions, effets de coupe, sons, look, musique, ambiance, titres et visualiseur doivent tous se rendre sans erreur.
// Ignoré (sans échec) quand aucun Chromium n'est disponible.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* aucun */ }
  return null;
}

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Packs : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-packs-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'sine=f=300:d=4', path.join(base, 'voix.wav'));
  for (const f of ['a.mp4', 'voix.wav']) await fetch(U('/api/import?name=' + f), { method: 'POST', body: fs.readFileSync(path.join(base, f)) });
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); await pg.goto(U('/')); await pg.waitForTimeout(1000);
  const ev = (f, ...a) => pg.evaluate(f, ...a);
  await ev(async () => { await chargerMedias(); localStorage.setItem('qm:fond', 'non'); });
  if (process.env.QM_DUMP) await ev(() => { window.QM_DUMP = true; });
  const ids = await ev(() => CAT.packs.map(p => p.id)), seul = process.env.QM_PACKS ? process.env.QM_PACKS.split(',') : null;
  for (const id of ids.filter(x => !seul || seul.includes(x))) {
    const t0 = Date.now();
    const r = await ev(async id => {
      const v = medias.find(x => x.file === 'a.mp4'), a = medias.find(x => x.file === 'voix.wav');
      proj.clips = [newClip(v), newClip(v), newClip(a)]; proj.audio = []; proj.pistes = []; proj.markers = []; proj.res = 480; proj.quality = 'rapide'; sel = 0; commit();
      appliquerPack(id, { tr: true, cal: true, son: true, look: true, mus: true, viz: true, amb: true, tit: true });
      if (window.QM_DUMP) return { ok: true, projet: pourRendu(proj), trans: 1 };
      try { const j = await lancerJob('/api/export', { project: proj }, () => {}); return { ok: true, out: j.out || j, trans: proj.clips.filter(c => c.transition).length }; }
      catch (e) { return { ok: false, err: e.message }; }
    }, id);
    if (process.env.QM_DUMP) fs.writeFileSync(path.join(process.env.QM_DUMP, id + '.json'), JSON.stringify({ projet: r.projet, base }));
    check(`pack ${id} : appliqué et exporté`, r.ok && r.trans >= 1, JSON.stringify(r).slice(0, 400));
    if (process.env.QM_DEBUG) console.log(id, r.ok ? 'ok' : 'ÉCHEC', ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  }
  check('aucune erreur de page', !errs.length, errs.join(' | '));
  await b.close(); await app.stop?.();
  console.log(`Packs : ${ok} contrôles réussis, ${ko} échecs`);
  process.exit(ko ? 1 : 0);
})();
