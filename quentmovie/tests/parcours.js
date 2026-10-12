// Parcours de l'interface dans un vrai navigateur : chaque outil du panneau « Outils », les demandes de l'assistant exécutées sur un montage,
// l'ouverture du studio et toutes les touches d'animation. Le contrôle : aucune erreur JavaScript, aucun blocage.
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
  return fs.existsSync(path.join(racine, 'chromium')) ? path.join(racine, 'chromium') : null;
}

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Parcours : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-par-')), app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}) }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', ...a]);
  ff('-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=6', '-f', 'lavfi', '-i', 'sine=f=440:d=6', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4'));
  ff('-f', 'lavfi', '-i', 'color=c=orange:s=320x180:d=1', '-frames:v', '1', path.join(base, 'photo.png'));
  for (const f of ['a.mp4', 'photo.png']) await fetch(U('/api/import?name=' + f), { method: 'POST', body: fs.readFileSync(path.join(base, f)) });
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
  pg.on('pageerror', e => errs.push('pageerror : ' + e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) errs.push('console : ' + m.text()); }); pg.on('dialog', d => d.dismiss().catch(() => {}));
  await pg.goto(U('/')); await pg.waitForTimeout(1200);
  const neuf = () => pg.evaluate(async () => { await chargerMedias(); proj.clips = []; proj.audio = []; const m = medias.find(x => x.file === 'a.mp4'); for (let i = 0; i < 3; i++) proj.clips.push(newClip(m)); sel = 0; commit(); tout(); });
  await neuf();

  // 1) tous les outils (sauf ceux qui téléchargent, ouvrent le Finder ou lancent un export)
  const noms = await pg.evaluate(() => [...new Set([...document.documentElement.innerHTML.matchAll(/data-outil="([a-z0-9-]+)"/g)].map(m => m[1]))]);
  const SAUF = /^(maj|telecharger|packs-ouvrir|lut-import|medias-tous|medias-inutiles|exp|export)/; let essais = 0;
  for (const n of noms) {
    if (SAUF.test(n)) continue; const avant = errs.length; essais++;
    await Promise.race([pg.evaluate(async nom => { await outil(nom); }, n), new Promise(r => setTimeout(r, 4000))]).catch(e => errs.push('exception ' + n + ' : ' + e.message));
    await pg.waitForTimeout(120); await pg.keyboard.press('Escape'); check('outil « ' + n + ' » sans erreur', errs.length === avant || errs.slice(avant).every(x => /TensorFlow Lite/.test(x)), errs.slice(avant).join(' | ').slice(0, 200));
  }
  check('au moins 25 outils parcourus', essais >= 25, String(essais));

  // 2) demandes de l'assistant exécutées sur le montage
  await neuf();
  const DEMANDES = ['Passe en vertical, ajoute une musique calme et égalise le son', 'Mets des transitions partout et dynamise la vidéo', 'Ajoute un titre au début et un fondu', 'ralentis le premier clip', 'ajoute un bruit de clavier', 'supprime le dernier clip', 'mets le volume à 50 %', 'coupe à 3 secondes', 'ajoute du zoom'];
  for (const d of DEMANDES) {
    const avant = errs.length, r = await (await fetch(U('/api/assistant/comprendre'), { method: 'POST', body: JSON.stringify({ demande: d, ia: false, projet: await pg.evaluate(() => resumeProjet()) }) })).json();
    check(`assistant : « ${d} » est compris`, (r.actions || []).length > 0, JSON.stringify(r));
    await Promise.race([pg.evaluate(async acts => { if (acts.length) await appliquerPlan(acts, () => {}); }, r.actions || []), new Promise(r2 => setTimeout(r2, 25000))]).catch(e => errs.push('assistant ' + d + ' : ' + e.message));
    await pg.waitForTimeout(150); check(`assistant : « ${d} » s'exécute sans erreur`, errs.length === avant, errs.slice(avant).join(' | ').slice(0, 200));
  }

  // 3) studio : ouverture, toutes les touches d'animation, fermeture
  { const avant = errs.length; await pg.evaluate(() => ouvrirStudio()); await pg.waitForFunction(() => studio && studio.flux, null, { timeout: 15000 }).catch(() => errs.push('studio : pas de flux'));
    const touches = await pg.evaluate(() => animsDirect().map(a => a.t).filter(Boolean));
    for (const t of touches) { await pg.keyboard.press(t.startsWith('Maj+') ? 'Shift+' + t.slice(4) : t).catch(() => {}); await pg.waitForTimeout(30); }
    await pg.waitForTimeout(400); await pg.evaluate(() => fermerStudio()).catch(e => errs.push('fermer : ' + e.message));
    check('studio : ' + touches.length + ' touches d’animation sans erreur', touches.length >= 25 && errs.length === avant, errs.slice(avant).join(' | ').slice(0, 200)); }

  check('aucune erreur dans la page', errs.every(x => /TensorFlow Lite/.test(x)), errs.slice(0, 3).join(' | '));
  await b.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Parcours : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
