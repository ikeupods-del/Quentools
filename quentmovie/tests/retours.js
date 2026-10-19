// Retours image par image (ui-retours.js) dans un vrai navigateur : onglet Retours, image par image, retour ajouté à l'instant exact,
// repère sur la règle, retours qui suivent les coupes, copie en texte, revue d'un rendu exporté (/api/exports). Ignoré sans Chromium.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* aucun */ }
  return null;
}

(async () => {
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* module absent */ }
  if (!exe || !pw) { console.log('Retours : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-rt-')), app = create({ port: 0, base, ...bins }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=440:d=4', '-shortest', '-pix_fmt', 'yuv420p', path.join(base, 'a.mp4')]);
  await fetch(U('/api/import?name=a.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'a.mp4')) });
  fs.mkdirSync(path.join(base, 'exports'), { recursive: true }); // rendu en WebM : le Chromium des essais ne lit pas le H.264 (l'application, si)
  execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=s=320x180:r=30:d=4', '-c:v', 'libvpx', '-b:v', '300k', path.join(base, 'exports', 'montage-essai.webm')]);
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept().catch(() => {}));
  await pg.goto(U('/')); await pg.waitForTimeout(1000);
  const ev = (f, ...a) => pg.evaluate(f, ...a);
  await ev(async () => { await chargerMedias(); proj.clips = [newClip(medias.find(x => x.file === 'a.mp4'))]; proj.fps = 30; commit(); tout(); masquerAccueil && masquerAccueil(); });

  await ev(() => panneauDroite('retours'));
  check('onglet Retours affiché (réglages et discussion cachés)', await ev(() => !$('#retours').hidden && $('#insp').hidden && $('#chat').hidden));
  await ev(() => placerTete(1, { sansSelection: true }));
  await pg.click('[data-rtn="+i"]'); await pg.click('[data-rtn="+i"]');
  check('+1 image deux fois : 1 s + 2 images', await ev(() => Math.round(gt * 30) === 32), await ev(() => gt));
  await pg.click('[data-rtn="-i"]');
  check('−1 image', await ev(() => Math.round(gt * 30) === 31));
  check('minutage affiché avec le numéro d’image', /image 31/.test(await ev(() => $('#rtTc').textContent)), await ev(() => $('#rtTc').textContent));
  await pg.fill('#rtTexte', 'Ici les sous-titres doivent apparaître en animé'); await pg.press('#rtTexte', 'Enter');
  check('Entrée ajoute le retour à l’image exacte', await ev(() => proj.retours.length === 1 && proj.retours[0].image === 31 && /animé/.test(proj.retours[0].texte)));
  check('retour listé avec son minutage', /image 31/.test(await ev(() => $('#rtListe').textContent)) && /animé/.test(await ev(() => $('#rtListe').textContent)));
  check('repère du retour sur la règle de la timeline', await ev(() => !!document.querySelector('#regle em[data-rtk]')));
  await ev(() => placerTete(3, { sansSelection: true })); await pg.click('#rtListe [data-rtgo]');
  check('clic sur un retour : retour à son image', await ev(() => Math.round(gt * 30) === 31));
  await ev(() => { decalerApres(0.5, 2); });
  check('le retour suit le montage quand on insère 2 s avant', await ev(() => Math.abs(proj.retours[0].t - (31 / 30 + 2)) < 0.01 && proj.retours[0].image === Math.round((31 / 30 + 2) * 30)));
  check('texte copié : minutage et retour', await ev(() => /image \d+ — Ici les sous-titres/.test(texteRetours())));
  await pg.click('#rtListe [data-rtfait]');
  check('retour marqué fait', await ev(() => proj.retours[0].fait === true));
  // ↑ hors d'un champ : écrire un retour
  await ev(() => document.activeElement.blur()); await pg.keyboard.press('ArrowUp');
  check('↑ met le curseur dans le champ du retour', await ev(() => document.activeElement === $('#rtTexte')));
  // revue d'un rendu exporté
  const ex = await (await fetch(U('/api/exports'))).json();
  check('liste des vidéos exportées', (ex.exports || []).some(x => x.nom === 'montage-essai.webm'), JSON.stringify(ex));
  await ev(() => ouvrirRevueExport()); await pg.waitForSelector('#rvV');
  await pg.waitForFunction(() => $('#rvV').readyState >= 1, null, { timeout: 8000 }).catch(() => {});
  await ev(() => { $('#rvV').currentTime = 2; }); await pg.waitForTimeout(300);
  await pg.fill('#rvTexte', 'Le titre arrive trop tard'); await pg.press('#rvTexte', 'Enter');
  check('revue : retour sur le rendu, avec le nom du fichier', await ev(() => proj.retours.some(r => r.source === 'montage-essai.webm' && Math.round(r.t) === 2 && /trop tard/.test(r.texte))));
  check('revue : repère sur la barre de la vidéo', await ev(() => document.querySelectorAll('#rvMk i').length === 1), await ev(() => $('#rvV').duration + ' ' + $('#rvMk').innerHTML));
  await ev(() => document.activeElement.blur()); await pg.keyboard.press('ArrowRight');
  check('revue : → avance d’une image (sans toucher au montage)', await ev(() => Math.abs($('#rvV').currentTime - (2 + 1 / 30)) < 0.02 && proj.clips.length === 1), await ev(() => $('#rvV').currentTime));
  await ev(() => fermer());
  check('aucune erreur dans la page', !errs.length, errs.join(' | '));
  await b.close(); app.stop && app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Retours : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
