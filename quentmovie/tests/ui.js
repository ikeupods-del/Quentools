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
  const b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }), pg = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs = [];
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
  await ev(() => { allerOnglet('outils'); $('#oZoomNiv').value = '135'; dynamiserZooms(false); });
  check('dynamiser : un plan sur deux zoomé', await ev(() => proj.clips.map(c => c.zoom).join() === '100,135,100'), await ev(() => proj.clips.map(c => c.zoom).join()));
  await ev(() => dynamiserZooms(true)); check('dynamiser : zooms retirés', await ev(() => proj.clips.every(c => c.zoom === 100)));
  check('transition sur toutes les coupures', await ev(() => proj.clips.filter(c => c.transition).length === 2));

  // 3 bis) outils pro : lame, pistes (verrou, muet, masquer), repères nommés et chapitres, grille
  await ev(() => { const v = medias.find(m => m.file === 'a.mp4'); proj.clips = [newClip(v)]; proj.audio = [{ file: 'son.wav', start: 0, in: 0, dur: 6, vol: 100 }]; proj.pistes = []; proj.markers = []; proj.etatPistes = {}; sel = 0; selA = -1; setZoom(40); commit(); tout(); choisirOutil('lame'); });
  await pg.waitForTimeout(200);
  let bx = await ev(() => { const e = document.querySelector('.clip[data-i="0"]').getBoundingClientRect(), r = $('#lane').getBoundingClientRect(); return { x: r.left + 2 * 40, y: e.y + e.height / 2 }; });
  await pg.mouse.click(bx.x, bx.y); await pg.waitForTimeout(200);
  check('outil Lame : le clip est coupé à l’endroit du clic', await ev(() => proj.clips.length === 2 && Math.abs(proj.clips[0].out - 2) < 0.15), await ev(() => JSON.stringify(proj.clips.map(c => [c.in, c.out]))));
  bx = await ev(() => { const e = document.querySelector('.aud').getBoundingClientRect(), r = $('#lane').getBoundingClientRect(); return { x: r.left + 4 * 40, y: e.y + e.height / 2 }; });
  await pg.mouse.click(bx.x, bx.y); await pg.waitForTimeout(200);
  check('outil Lame : le son est coupé à l’endroit du clic', await ev(() => proj.audio.length === 2 && Math.abs(proj.audio[0].dur - 4) < 0.15));
  await ev(() => basculerPiste('V1', 'verrou')); bx = await ev(() => { const e = document.querySelector('.clip[data-i="1"]').getBoundingClientRect(), r = $('#lane').getBoundingClientRect(); return { x: r.left + 4 * 40, y: e.y + e.height / 2 }; });
  await pg.mouse.click(bx.x, bx.y); await pg.waitForTimeout(150);
  check('piste verrouillée : rien n’est coupé', await ev(() => proj.clips.length === 2 && $('#pV').classList.contains('verrou') && document.querySelector('[data-piste="V1:verrou"]').classList.contains('on')));
  await ev(() => { basculerPiste('V1', 'verrou'); choisirOutil('selection'); basculerPiste('A', 'muet'); basculerPiste('V2', 'cache'); basculerPiste('V1', 'muet'); proj.pistes = [{ file: 'photo.png', kind: 'image', start: 0, dur: 2 }]; });
  check('pistes coupées ou masquées absentes du rendu', await ev(() => { const q = pourRendu(proj); return q.audio.length === 0 && q.pistes.length === 0 && q.clips.every(c => c.vol === 0) && proj.audio.length === 2 && proj.clips[0].vol === 100; }));
  await ev(() => { proj.etatPistes = {}; proj.pistes = []; commit(); tout(); });
  // repères nommés et chapitres
  await ev(() => { proj.clips = [newClip(medias.find(m => m.file === 'a.mp4')), newClip(medias.find(m => m.file === 'a.mp4')), newClip(medias.find(m => m.file === 'a.mp4')), newClip(medias.find(m => m.file === 'a.mp4'))]; proj.markers = [0, 12]; proj.nomsReperes = {}; commit(); tout(); setZoom(40); });
  await pg.waitForTimeout(200);
  await pg.dblclick('#regle b[data-mk="1"]'); await pg.waitForSelector('#saisie'); await pg.fill('#saisie', 'Les conseils'); await pg.click('#sOk'); await pg.waitForTimeout(150);
  check('repère nommé par double-clic, nom affiché sur la règle', await ev(() => nomRepere(12) === 'Les conseils' && /Les conseils/.test($('#regle').textContent)));
  check('chapitres YouTube depuis les repères', await ev(() => JSON.stringify(chapitres())) === JSON.stringify(['0:00 Introduction', '0:12 Les conseils']), await ev(() => JSON.stringify(chapitres())));
  await ev(() => { proj.markers = [0, 6, 12, 18]; proj.nomsReperes = { '18.00': 'Fin' }; });
  check('chapitres : 10 s minimum entre deux chapitres', await ev(() => JSON.stringify(chapitres())) === JSON.stringify(['0:00 Introduction', '0:12 Partie 2']), await ev(() => JSON.stringify(chapitres())));
  await ev(() => { if (!vues.grille) basculerVue('grille'); }); check('grille des tiers activée', await ev(() => vues.grille && $('#vGrille').classList.contains('on')));
  await ev(() => basculerVue('grille'));

  // 3 ter) assistant de montage (⌘K) : demande en français → étapes cochées → appliquées ; suggestions ; textes de publication sans IA
  await ev(() => { const v = medias.find(m => m.file === 'a.mp4'); proj.clips = [newClip(v), newClip(v), newClip(v)]; proj.audio = []; proj.markers = []; proj.clips.forEach(c => { c.transition = null; c.afx = []; }); sel = 0; commit(); tout(); });
  await pg.keyboard.press('Control+k'); await pg.waitForSelector('#asDemande');
  check('assistant : ⌘K ouvre l’assistant', true);
  await pg.waitForSelector('#asSugg .asSug', { timeout: 10000 }).catch(() => {});
  check('assistant : suggestions pour le montage', await ev(() => /sous-titres/i.test($('#asSugg').textContent)), await ev(() => $('#asSugg').textContent));
  await pg.fill('#asDemande', 'mets des transitions en fondu partout, une musique calme et égalise le son'); await pg.click('#asComprendre'); await pg.waitForSelector('#asGo', { timeout: 10000 });
  check('assistant : trois étapes prévues', await ev(() => document.querySelectorAll('#asPlan .asEtape').length === 3), await ev(() => $('#asPlan').textContent));
  await pg.click('#asGo'); await pg.waitForFunction(() => $('#asGo') && !$('#asGo').disabled, null, { timeout: 15000 });
  check('assistant : étapes appliquées (transitions, musique calme, volume égalisé)', await ev(() => proj.clips.filter(c => c.transition).length === 2 && proj.audio.some(a => /^lib:musiques\/(lofi|ambiance|piano)/.test(a.file) && a.duck) && proj.clips.every(c => c.afx.some(e => e.id === 'normaliser'))), await ev(() => JSON.stringify(proj.audio)));
  await pg.fill('#asDemande', 'ajoute un écran titre « Mon voyage »'); await pg.click('#asComprendre'); await pg.waitForSelector('#asGo'); await pg.click('#asGo'); await pg.waitForTimeout(400);
  check('assistant : écran titre ajouté au début', await ev(() => proj.clips[0].kind === 'solid' && proj.clips[0].titre.l1 === 'MON VOYAGE'));
  await pg.fill('#asDemande', 'blablabla'); await pg.click('#asComprendre'); await pg.waitForTimeout(400);
  check('assistant : demande incomprise expliquée', await ev(() => /pas compris|IA locale/.test($('#asPlan').textContent)), await ev(() => $('#asPlan').textContent));
  await ev(() => { fermer(); proj.clips[1].subs = [{ s: 0, e: 2, t: 'Les volcans d’Islande sont parmi les plus actifs' }, { s: 2, e: 4, t: 'On visite les volcans et les glaciers' }]; commit(); ouvrirPublication('YouTube'); });
  await pg.click('#puGo'); await pg.waitForSelector('#puRes [data-copie]', { timeout: 15000 });
  check('publication : titre, description et hashtags (sans IA)', await ev(() => /#volcans/.test($('#puRes').textContent) && document.querySelectorAll('#puRes textarea').length >= 3), await ev(() => $('#puRes').textContent));
  await ev(() => fermer());

  // 4) générateur de bout en bout : faux Commons, fausse IA ; Express → relecture → réécriture d'une scène → autre photo → création
  const http = require('http'), photo = path.join(base, 'p.jpg'); ff('-f', 'lavfi', '-i', 'testsrc2=s=1800x1200', '-frames:v', '1', photo);
  const commons = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), q = Object.fromEntries(u.searchParams), pt = commons.address().port;
    if (u.pathname.startsWith('/images/')) { res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(fs.readFileSync(photo)); }
    res.setHeader('Content-Type', 'application/json');
    const mot = String(q.gsrsearch || '').replace(/ filetype:\w+/, '').split(/\s+/)[0] || 'image';
    const info = (t, k) => ({ index: k, title: 'File:' + t, imageinfo: [{ mime: 'image/jpeg', width: 1800, height: 1200, url: `http://127.0.0.1:${pt}/images/${encodeURIComponent(t)}`, thumburl: `http://127.0.0.1:${pt}/images/1920px-${encodeURIComponent(t)}`, descriptionurl: 'https://commons.wikimedia.org/wiki/' + t, extmetadata: { Artist: { value: 'Photographe' }, LicenseShortName: { value: 'CC BY-SA 4.0' }, ImageDescription: { value: 'Photo de ' + mot + ' vélo en ville' }, Categories: { value: mot } } }] });
    if (q.generator === 'search') return res.end(JSON.stringify({ query: { pages: [1, 2, 3].map(k => info(`${mot} exemple ${['alpha', 'bravo', 'charlie'][k - 1]}.jpg`, k)) } }));
    res.end('{}');
  });
  await new Promise(r => commons.listen(0, '127.0.0.1', r));
  const { regroupe } = require('../ia'); let dernierAppel = null;
  const iaFausse = { etat: () => ({ installee: true, mo: 1, styles: ['dynamique'] }), installer: async () => {}, arreter: () => {},
    ecrireScript: async a => { dernierAppel = a; const rg = regroupe(a.consigne, a.options); return { titre: 'Vélo en ville', gpu: '', regles: rg, scenes: [['Casque', 'Un casque bien ajusté protège la tête en cas de chute.', 'casque', 'helmet'], ['Feux', 'Des feux clairs te rendent visible à la nuit tombée.', 'feux', 'lights'], ['Piste', 'Roule sur les pistes cyclables quand elles existent.', 'piste', 'lane']].map(([section, texte, sujet, recherche]) => ({ section, texte, sujet, recherche })) }; },
    reecrireScene: async a => ({ texte: 'Texte réécrit : ' + a.instruction }) };
  const O2 = `http://127.0.0.1:${commons.address().port}`, app2 = create({ port: 0, base: path.join(base, 'b2'), ...bins, ia: iaFausse, commons: O2, wiki: O2, banques: { openverse: O2, nasa: O2, pexels: O2, pixabay: O2, unsplash: O2 } }), port2 = await app2.start();
  const pg2 = await b.newPage({ viewport: { width: 1440, height: 900 } }), errs2 = []; pg2.on('pageerror', e => errs2.push(e.message));
  await pg2.goto(`http://127.0.0.1:${port2}/`); await pg2.waitForTimeout(800); await pg2.evaluate(() => ouvrirGenerateur());
  await pg2.click('#xOpts summary'); await pg2.click('#xBanques summary'); await pg2.waitForSelector('#xBanquesListe .banque', { timeout: 10000 });
  check('banques de photos : six banques listées', await pg2.evaluate(() => document.querySelectorAll('#xBanquesListe .banque').length === 6 && document.querySelector('#bq_pexels').disabled));
  await pg2.fill('[data-bqcle="pexels"]', 'CLEPEXELSDETEST123'); await pg2.click('[data-bqsave="pexels"]'); await pg2.waitForFunction(() => !document.querySelector('#bq_pexels').disabled, null, { timeout: 10000 });
  check('banques de photos : clé enregistrée, banque activée', await pg2.evaluate(() => document.querySelector('#bq_pexels').checked && /…T123/.test(document.querySelector('[data-bqcle="pexels"]').placeholder)));
  await pg2.click('#xBanques summary');
  await pg2.fill('#xIdee', '3 astuces pour faire du vélo en ville, pas d’intro'); await pg2.uncheck('#xWiki'); await pg2.fill('#oCta', 'Abonne-toi pour la suite'); await pg2.fill('#oEviter', 'gratuit'); await pg2.selectOption('#oType', 'astuces'); await pg2.click('#xGo');
  await pg2.waitForSelector('#gScenes .sc', { timeout: 30000 });
  check('générateur : script affiché pour relecture (rien n’est créé)', await pg2.evaluate(() => document.querySelectorAll('#gScenes .sc').length === 3 && proj.clips.length === 0));
  check('générateur : options transmises à l’IA', !!dernierAppel && dernierAppel.options.type === 'astuces' && dernierAppel.options.cta === 'Abonne-toi pour la suite' && dernierAppel.options.eviter === 'gratuit' && dernierAppel.consigne.includes('pas d’intro'), JSON.stringify(dernierAppel && dernierAppel.options));
  check('générateur : photos trouvées et notées', await pg2.evaluate(() => gen.prep.scenes.filter(s => s.image >= 0).length >= 2 && gen.prep.scenes[0].propositions.length >= 1), await pg2.evaluate(() => JSON.stringify(gen.prep.scenes.map(s => s.image))));
  check('générateur : « pas d’intro » décoche l’écran titre', await pg2.evaluate(() => !$('#gOuv').checked));
  await pg2.click('[data-gia="0"]'); await pg2.fill('[data-gins="0"]', 'plus court'); await pg2.click('[data-greecrit="0"]'); await pg2.waitForFunction(() => gen.prep.scenes[0].texte.startsWith('Texte réécrit'), null, { timeout: 15000 });
  check('générateur : réécriture d’une scène', await pg2.evaluate(() => gen.prep.scenes[0].texte === 'Texte réécrit : plus court'));
  await pg2.click('[data-gautre="1"]'); await pg2.fill('[data-gq="1"]', 'phare'); await pg2.click('[data-gcherche="1"]'); await pg2.waitForSelector('#gg1 [data-gnew]', { timeout: 15000 }); await pg2.click('#gg1 [data-gnew]');
  check('générateur : autre photo choisie pour une scène', await pg2.evaluate(() => /phare/.test(gen.prep.images[gen.prep.scenes[1].image].nom)));
  await pg2.click('[data-gmove="0:1"]'); check('générateur : scène descendue', await pg2.evaluate(() => /Texte réécrit/.test(gen.prep.scenes[1].texte)));
  await pg2.click('#gCreer'); await pg2.waitForFunction(() => proj.clips.length >= 3, null, { timeout: 90000 });
  check('générateur : vidéo montée dans la timeline', await pg2.evaluate(() => proj.clips.length >= 3 && proj.clips.some(c => c.kind === 'audio' && c.bgFile)), await pg2.evaluate(() => proj.clips.length));
  check('aucune erreur dans la page du générateur', !errs2.length, errs2.slice(0, 3).join(' | '));
  commons.close(); app2.stop();

  // 6) bibliothèque → timeline : titres sans clip, double-clic, glisser-déposer de chaque type d'élément
  await ev(() => { proj.clips = []; proj.audio = []; proj.pistes = []; sel = -1; selA = -1; selP = -1; gt = 0; tout(); });
  const glisse = async (src, x, y) => { const el = await pg.$(src); await el.scrollIntoViewIfNeeded(); const sb = await el.boundingBox(); await pg.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2); await pg.mouse.down(); await pg.mouse.move(x - 30, y, { steps: 8 }); await pg.mouse.move(x, y, { steps: 4 }); await pg.mouse.up(); await pg.waitForTimeout(500); };
  const boite = async i => (await pg.$(`.clip[data-i="${i}"]`)).boundingBox();
  await pg.click('#tabs button[data-tab="titres"]');
  check('titres : listes entières (pas coupées)', await ev(() => [...document.querySelectorAll('#navbody .grille')].every(g => getComputedStyle(g).maxHeight === 'none')));
  await pg.click('[data-titre] >> nth=0'); await pg.waitForTimeout(300);
  check('titre sur timeline vide : écran titre créé, texte prêt à écrire', await ev(() => proj.clips.length === 1 && proj.clips[0].kind === 'solid' && !!proj.clips[0].text && document.activeElement && document.activeElement.dataset.p === 'text'));
  await pg.click('#tabs button[data-tab="medias"]');
  check('changer d’onglet : liste affichée depuis le haut', await ev(() => $('#navbody').scrollTop === 0));
  const iVid = await ev(() => medias.findIndex(m => m.file === 'a.mp4'));
  await pg.dblclick(`.media[data-drag="media:${iVid}"] .nom`); await pg.waitForTimeout(300);
  check('double-clic sur un média : ajouté à la timeline', await ev(() => proj.clips.length === 2 && proj.clips[1].kind === 'video'));
  const b0 = await boite(0); await glisse(`.media[data-drag="media:${await ev(() => medias.findIndex(m => m.file === 'photo.png'))}"]`, b0.x + 4, b0.y + b0.height / 2);
  check('glisser une photo sur la moitié gauche d’un clip : placée avant', await ev(() => proj.clips.map(c => c.kind).join() === 'image,solid,video'));
  await pg.click('#tabs button[data-tab="titres"]'); const bv = await boite(2);
  await glisse('[data-rep] >> nth=0', bv.x + bv.width / 2, bv.y + bv.height / 2);
  check('glisser un titre de reportage sur un clip', await ev(() => !!proj.clips[2].titre));
  await ev(() => { sel = -1; gt = starts()[0] + 0.5; }); await pg.click('[data-titre] >> nth=1'); await pg.waitForTimeout(200);
  check('titre sans clip sélectionné : posé sur le clip sous la tête de lecture', await ev(() => !!proj.clips[0].text && sel === 0));
  await pg.click('#tabs button[data-tab="transitions"]'); const b1 = await boite(1);
  await glisse('[data-tr]:not([data-tr="none"]) >> nth=0', b1.x + b1.width - 6, b1.y + b1.height / 2);
  check('glisser une transition sur la droite d’un clip', await ev(() => !!proj.clips[1].transition));
  await pg.click('#tabs button[data-tab="musiques"]');
  await glisse('#navbody .son >> nth=0', b1.x + 30, b1.y + b1.height + 30);
  check('glisser une musique dans la timeline : à l’endroit du dépôt, en boucle', await ev(() => proj.audio.length === 1 && proj.audio[0].loop && proj.audio[0].start > 0));
  await pg.click('#tabs button[data-tab="stickers"]'); const bv2 = await boite(2);
  await glisse('[data-sticker] >> nth=0', bv2.x + bv2.width / 2, bv2.y + bv2.height / 2);
  check('glisser un autocollant sur un clip', await ev(() => proj.clips[2].overlays.length === 1));
  await pg.click('#tabs button[data-tab="effets"]');
  await glisse('[data-fx] >> nth=0', bv2.x + bv2.width / 2, bv2.y + bv2.height / 2);
  check('glisser un effet sur un clip', await ev(() => proj.clips[2].fx.length >= 1));
  await ev(() => { proj.clips = []; sel = -1; tout(); }); await pg.click('[data-fx] >> nth=0');
  check('effet sans aucun clip : message clair, pas de fenêtre bloquante', await ev(() => /Ajoute d’abord/.test($('#signal').textContent)));

  // 5) studio : pause pendant la prise (caméra et micro de test de Chromium)
  const nAvant = await pg.evaluate(() => proj.clips.length);
  await pg.evaluate(() => ouvrirStudio()); await pg.waitForFunction(() => studio && studio.flux, null, { timeout: 15000 });
  await pg.evaluate(() => { studio.o.compte = false; studio.o.fond = ''; });
  await pg.click('#stRec'); await pg.waitForTimeout(1500);
  check('studio : bouton pause visible pendant la prise', await pg.evaluate(() => !$('#stPause').hidden));
  await pg.click('#stPause'); await pg.waitForTimeout(1600);
  check('studio : prise en pause, le chrono s’arrête', await pg.evaluate(() => studio.rec.state === 'paused' && /Reprendre/.test($('#stPause').textContent) && stDuree() < 2.2), await pg.evaluate(() => studio.rec.state + ' ' + stDuree()));
  await pg.keyboard.press('p'); await pg.waitForTimeout(1200);
  check('studio : reprise (touche P), la pause n’est pas comptée', await pg.evaluate(() => studio.rec.state === 'recording' && stDuree() > 2.2 && stDuree() < 3.6), await pg.evaluate(() => studio.rec.state + ' ' + stDuree()));
  await pg.click('#stPause'); await pg.click('#stRec');
  await pg.waitForFunction(n => proj.clips.length > n, nAvant, { timeout: 60000 }).catch(() => {});
  check('studio : arrêt pendant une pause, prise ajoutée à la timeline', await pg.evaluate(n => proj.clips.length === n + 1 && $('#stPause').hidden, nAvant));
  await pg.evaluate(() => fermerStudio());

  // 7) studio : afficher en direct (image, textes, logo, écran partagé simulé) → calques et piste vidéo 2 de la prise
  const nAv2 = await ev(() => proj.clips.length), nPistes = await ev(() => (proj.pistes || []).length);
  await ev(() => ouvrirStudio()); await pg.waitForFunction(() => studio && studio.flux, null, { timeout: 15000 });
  await ev(() => {
    Object.assign(studio.o, { compte: false, fond: '', directMedia: 'photo.png', directPos: 'haut-droite', textes: 'Astuce numéro 1\nLien en bio', logo: 'lib:stickers/quentools-neon.png', ecranPos: 'coin' });
    navigator.mediaDevices.getDisplayMedia = async () => { const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d'); setInterval(() => { g.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'); g.fillRect(0, 0, 640, 360); }, 50); return c.captureStream(30); };
    stPanneau();
  });
  await pg.keyboard.press('o'); // logo affiché avant la prise : présent dès le début
  await pg.click('#stRec'); await pg.waitForTimeout(700);
  await pg.keyboard.press('m'); await pg.keyboard.press('t'); await pg.keyboard.press('e'); await pg.waitForTimeout(1500);
  check('studio en direct : image, texte, logo et écran visibles', await ev(() => !!(studio.direct.media && studio.direct.texte && studio.direct.logo && studio.direct.ecran) && document.querySelectorAll('#stAnim .stDirect').length === 3 && !!$('#stAnim .stTexte')));
  check('studio en direct : écran partagé gardant son centrage et sa vidéo en lecture', await ev(() => { const el = studio.direct.ecran.el, v = el.querySelector('video'), r = el.getBoundingClientRect(), z = $('#stAnim').getBoundingClientRect(); return getComputedStyle(el).transform !== 'none' && v.videoWidth > 0 && r.left >= z.left - 2 && r.right <= z.right + 2 && r.width > 50; }));
  check('studio : panneau unique d’animations (touches sans doublon, animations retirées absentes)', await ev(() => { const l = animsDirect(), t = l.filter(a => a.t).map(a => a.t); return l.length >= 24 && new Set(t).size === t.length && !['content', 'enerve', 'triste', 'cent', 'feu', 'live', 'fleche'].some(id => l.some(a => a.id === id)) && ['breaking', 'riche', 'pauvre', 'hausse', 'baisse', 'jackpot'].every(id => l.some(a => a.id === id)) && !t.some(k => ST_RESERVEES.has(k)); }));
  check('studio : touches lues par position (clavier AZERTY) et préfixe Maj+', await ev(() => stToucheDe({ key: '&', code: 'Digit1' }) === '1' && stToucheDe({ key: 'B', code: 'KeyB', shiftKey: true }) === 'Maj+b' && stToucheDe({ key: 'c', code: 'KeyC', metaKey: true }) === ''));
  await pg.keyboard.press('t'); await pg.keyboard.press('m'); await pg.waitForTimeout(500);
  await pg.click('#stRec');
  await pg.waitForFunction(n => proj.clips.length > n && !studio.envoi, nAv2, { timeout: 90000 }).catch(() => {});
  const calq = await ev(() => { const c = proj.clips[proj.clips.length - 1]; return c && c.overlays.map(o => ({ f: o.file, s: o.start, d: o.dur })); });
  check('prise : image, texte et logo devenus des calques au bon moment', !!calq && calq.length === 3 && calq.some(o => o.f === "photo.png" && o.s > 0.3 && o.d > 1) && calq.some(o => /^texte-direct-/.test(o.f) && o.d > 1) && calq.some(o => /quentools-neon/.test(o.f) && o.s === 0), JSON.stringify(calq));
  check('prise : écran partagé posé dans la piste vidéo 2', await ev(n => (proj.pistes || []).length === n + 1 && /^camera-ecran-/.test(proj.pistes[proj.pistes.length - 1].file) && proj.pistes[proj.pistes.length - 1].start > starts()[proj.clips.length - 1], nPistes));
  await ev(() => fermerStudio());

  // 8) coupe : sous-titres suivent chaque morceau ; chapitrage automatique (repères, titre qui s'écrit, bruit de clavier) ; clipping
  await ev(() => { const m = medias.find(x => x.file === 'a.mp4'); const c = newClip(m); c.subs = [{ s: 1, e: 2, t: 'un' }, { s: 4, e: 5, t: 'deux' }]; proj.clips = [c]; proj.audio = []; proj.pistes = []; proj.markers = []; proj.nomsReperes = {}; sel = 0; commit(); tout(); });
  await ev(() => { placerTete(3, { sansSelection: true }); couper(); });
  check('coupe : les sous-titres suivent leur morceau', await ev(() => proj.clips.length === 2 && proj.clips[0].subs.length === 1 && proj.clips[0].subs[0].t === 'un' && proj.clips[1].subs.length === 1 && proj.clips[1].subs[0].t === 'deux' && proj.clips[1].subs[0].s === 1), await ev(() => JSON.stringify(proj.clips.map(c => c.subs))));
  // montage de 6 minutes simulées (ralenti x0,02 : seule la durée compte ici) avec trois sujets bien distincts
  const SUJ = [['Bonjour à tous et bienvenue, aujourd’hui je vais vous présenter trois astuces pour mieux dormir.', 'On va voir ensemble pourquoi le sommeil est important.'], ['Première astuce : la chambre. Gardez la chambre fraîche et sombre, les rideaux épais aident la chambre.', 'Une chambre fraîche aide le corps à produire la mélatonine.'], ['Deuxième astuce : les écrans. Les écrans du téléphone gardent le cerveau éveillé, évitez les écrans avant de dormir.', 'La lumière bleue des écrans retarde la fatigue.'], ['Pour conclure, retenez la chambre fraîche et les écrans éteints. Merci d’avoir regardé, abonnez-vous et à bientôt.']];
  await ev(sujets => { const m = medias.find(x => x.file === 'a.mp4'), c = newClip(m); c.speed = 0.0167; c.out = 6; c.in = 0; let t = 0; c.subs = []; for (const b of sujets) for (const p of b) { c.subs.push({ s: t, e: t + 24, t: p }); t += 26; } proj.clips = [c]; proj.audio = []; proj.markers = []; proj.nomsReperes = {}; sel = 0; commit(); tout(); }, SUJ);
  await ev(() => ouvrirChapitrage()); await pg.waitForSelector('#chAppliquer:not([hidden])', { timeout: 20000 });
  const prop = await ev(() => [...document.querySelectorAll('#chListe .chN')].map(x => x.value));
  check('chapitrage : des chapitres proposés, le premier est l’introduction', prop.length >= 3 && prop[0] === 'Introduction', JSON.stringify(prop));
  await pg.selectOption('#chMode', 'sur'); await pg.click('#chAppliquer'); await pg.waitForTimeout(500);
  const rc = await ev(() => ({ n: proj.clips.length, marks: proj.markers.length, noms: Object.keys(proj.nomsReperes).length, titres: proj.clips.filter(c => c.titre && c.titre.preset === 'machine').length, clav: proj.audio.filter(a => /clavier/.test(a.file)).length, ok: proj.clips.every(c => c.subs.every(x => x.e <= effDur(c) + 0.01)) }));
  check('chapitrage : repères nommés, titres qui s’écrivent et bruit de clavier posés', rc.marks >= 2 && rc.noms >= 3 && rc.titres >= 3 && rc.clav >= 3 && rc.n >= 3 && rc.ok, JSON.stringify(rc));
  check('chapitrage : la liste YouTube s’affiche', await ev(() => /0:00 Introduction/.test($('#chTxt').value)));
  await ev(() => fermer());
  // clipping : les meilleurs passages sont proposés (sans IA installée : classement du programme)
  await ev(() => ouvrirClipping()); await pg.selectOption('#clNb', '3'); await pg.click('#clChercher'); await pg.waitForSelector('#clCreer', { timeout: 20000 });
  const nbCl = await ev(() => document.querySelectorAll('#clListe [data-i]').length);
  check('clipping : des passages proposés avec un titre', nbCl >= 1 && nbCl <= 3 && await ev(() => [...document.querySelectorAll('#clListe .clT')].every(x => x.value.length > 3)), nbCl);
  await ev(() => fermer());

  // 9) retirer un passage : le son détaché part avec l'image, ce qui suit reste calé ; la coupe (S) coupe aussi le son détaché
  await ev(() => { const m = medias.find(x => x.file === 'a.mp4'); proj.clips = []; for (let i = 0; i < 3; i++) proj.clips.push(newClip(m)); proj.audio = []; proj.pistes = []; proj.markers = []; proj.nomsReperes = {}; sel = 0; tout(); tous = null; selObjs = new Set(proj.clips); detacherSelection(); selObjs.clear(); });
  const av = await ev(() => ({ n: proj.audio.length, st: proj.audio.map(a => a.start) }));
  check('détacher : un son par clip, calé sur son clip', av.n === 3 && av.st[1] === 6 && av.st[2] === 12, JSON.stringify(av));
  await ev(() => { proj.markers = [13]; sel = 1; supprimer(); });
  const ap = await ev(() => ({ c: proj.clips.length, n: proj.audio.length, st: proj.audio.map(a => a.start), m: proj.markers }));
  check('supprimer un clip : son détaché retiré, suite recollée, repère décalé', ap.c === 2 && ap.n === 2 && ap.st[0] === 0 && ap.st[1] === 6 && ap.m[0] === 7, JSON.stringify(ap));
  await ev(() => { selA = -1; placerTete(2, { sansSelection: true }); sel = 0; couper(); });
  const cp = await ev(() => ({ c: proj.clips.length, a: proj.audio.map(x => [x.start, x.dur]) }));
  check('couper (S) : le son détaché est coupé au même endroit', cp.c === 3 && cp.a.length === 3 && Math.abs(cp.a[1][0] - 2) < 0.06, JSON.stringify(cp));

  // assistant : nouvelles actions exécutées sur le montage (supprimer un clip, bruitage, couper à un instant, volume, fondus)
  await ev(async () => { await chargerMedias(); proj.clips = []; proj.audio = []; const m = medias.find(x => x.file === 'a.mp4'); for (let i = 0; i < 3; i++) proj.clips.push(newClip(m)); sel = 0; commit(); tout(); });
  const act = a => ev(async a => { await executerAction(a); return { clips: proj.clips.length, audio: proj.audio.map(x => x.file), vols: proj.clips.map(c => c.vol), fi: proj.clips[0].fadeIn, fo: proj.clips[proj.clips.length - 1].fadeOut, total: total() }; }, a);
  let r1 = await act({ action: 'supprimer_clip', parametre: 'dernier' }); check('assistant : supprimer le dernier clip', r1.clips === 2, JSON.stringify(r1));
  r1 = await act({ action: 'supprimer_clip', parametre: '9' }); check('assistant : un numéro de clip absent ne supprime rien', r1.clips === 2);
  r1 = await act({ action: 'bruitage', parametre: 'jackpot' }); check('assistant : bruitage ajouté dans la piste audio', r1.audio.some(f => /jackpot/.test(f)), JSON.stringify(r1));
  r1 = await act({ action: 'volume', parametre: '40' }); check('assistant : volume des clips', r1.vols.every(v => v === 40), JSON.stringify(r1.vols));
  r1 = await act({ action: 'fondus', parametre: '' }); check('assistant : fondus au début et à la fin', r1.fi >= 0.6 && r1.fo >= 0.8, JSON.stringify(r1));
  const avantCoupe = r1.clips; r1 = await act({ action: 'couper_a', parametre: '3' }); check('assistant : couper à un instant', r1.clips === avantCoupe + 1, JSON.stringify(r1));
  r1 = await act({ action: 'couper_a', parametre: '9999' }); check('assistant : coupe hors du montage refusée', r1.clips === avantCoupe + 1);

  check('aucune erreur dans la page', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Interface : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
