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

  check('aucune erreur dans la page', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Interface : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
