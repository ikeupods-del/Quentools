// Animations (animations.js, routes-animations.js, ui-animations.js) : catalogue, aperçu, fabrication de chaque modèle dans le navigateur des écrans
// (le même contrat que les fenêtres cachées de l'application), transparence des calques, export d'un montage avec une animation par-dessus,
// et pose depuis le panneau. Ignoré sans Chromium (Mac de construction : l'essai de l'application installée s'en charge).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');

function chromium() {
  if (process.env.QM_CHROMIUM && fs.existsSync(process.env.QM_CHROMIUM)) return process.env.QM_CHROMIUM;
  const racine = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try { for (const d of fs.readdirSync(racine).filter(x => /^chromium-\d+$/.test(x))) for (const sous of ['chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) { const f = path.join(racine, d, sous); if (fs.existsSync(f)) return f; } } catch (e) { /* aucun */ }
  return null;
}
// le même contrat que navigateur-electron.js, rempli par Playwright : la fabrication passe par le pont HTTP comme dans l'application
async function navigateurEssai(exe) {
  const pw = require('playwright-core'), b = await pw.chromium.launch({ executablePath: exe, args: ['--no-sandbox'] }), pages = new Map(); let n = 0;
  return {
    b, appels: { ouvrir: 0, capture: 0 }, erreurs: [],
    async ouvrir(l, h) { this.appels.ouvrir++; const p = await b.newPage({ viewport: { width: l, height: h } }); p.on('pageerror', x => this.erreurs.push(x.message)); pages.set(++n, p); return n; },
    async contenu(id, html) { await pages.get(+id).setContent(html, { waitUntil: 'load' }); },
    evaluer(id, code) { return pages.get(+id).evaluate(code); },
    async capture(id, chemin, transparent) { this.appels.capture++; await pages.get(+id).screenshot({ path: chemin, omitBackground: transparent }); },
    async fermer(id) { const p = pages.get(+id); pages.delete(+id); if (p) await p.close(); }
  };
}

(async () => {
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* absent */ }
  if (!exe || !pw) { console.log('Animations : ignoré (aucun Chromium disponible)'); return process.exit(0); }
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path'), A = require('../animations');
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-anim-')), nav = await navigateurEssai(exe);
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}), navigateur: nav }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const post = (p, o) => fetch(U(p), { method: 'POST', body: JSON.stringify(o || {}) });
  const attendre = async id => { for (;;) { await new Promise(r => setTimeout(r, 400)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error || j.done) return j; } };
  const ff = (...a) => execFileSync(bins.ffmpeg, ['-hide_banner', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  check('nombre lu dans « 2,1 % » et « 1 500 € »', JSON.stringify(A.nombreDe('2,1 %')) === JSON.stringify({ avant: '', valeur: 2.1, dec: 1, apres: ' %', milliers: false }) && A.nombreDe('1 500 €').valeur === 1500 && A.nombreDe('1 500 €').milliers);
  const cat = await (await fetch(U('/api/animations'))).json();
  check('catalogue : 11 modèles, génériques et calques', cat.modeles.length === 11 && cat.modeles.filter(m => m.type === 'plein').length === 5 && cat.pret === true, JSON.stringify(cat).slice(0, 200));
  const ap = await (await post('/api/animations/apercu', { id: 'chiffre', valeurs: { valeur: '2,1 %', legende: 'd’inflation' }, format: 'horizontal' })).json();
  check('aperçu : une image PNG', /^data:image\/png;base64,/.test(ap.image || '') && ap.type === 'calque');
  check('modèle inconnu refusé', (await post('/api/animations/rendre', { id: 'nimporte' })).status >= 400);
  const faits = {};
  for (const m of cat.modeles) {
    const { id } = await (await post('/api/animations/rendre', { id: m.id, valeurs: m.id === 'chiffre' ? { valeur: '1 500 €' } : {}, format: m.id === 'bandeau' ? 'vertical' : 'horizontal' })).json(), j = await attendre(id);
    faits[m.id] = j.resultat; check(`fabrication : ${m.nom}`, j.done && !j.error && fs.existsSync(path.join(base, 'medias', j.resultat.file)), j.error || '');
  }
  const info = f => { try { ff('-i', path.join(base, 'medias', f)); } catch (e) { return String(e.stderr || ''); } return ''; };
  check('calque : vidéo transparente (QuickTime Animation, ARGB)', /qtrle/.test(info(faits.chiffre.file)) && /argb/.test(info(faits.chiffre.file)), info(faits.chiffre.file).slice(-300));
  check('générique : vidéo H.264 de la bonne durée', /h264/.test(info(faits.intro.file)) && Math.abs(faits.intro.duree - 3.5) < 0.05);
  check('bandeau en vertical : 1080 × 1920', /1080x1920/.test(info(faits.bandeau.file)));
  const px = (f, t, x, y) => { const b = execFileSync(bins.ffmpeg, ['-v', 'error', '-ss', String(t), '-i', path.join(base, 'medias', f), '-frames:v', '1', '-vf', `crop=1:1:${x}:${y},format=rgba`, '-f', 'rawvideo', '-'], { maxBuffer: 1e6 }); return [...b]; };
  // modèles éditoriaux : aperçu et fabrication dans les trois formats, fond crème des écrans pleins, centre du cadre caméra transparent
  const NOUVEAUX = ['grand-titre', 'parcours', 'grille', 'cadre-camera'], FORMATS = { horizontal: [1920, 1080], vertical: [1080, 1920], carre: [1080, 1080] };
  for (const id of NOUVEAUX) for (const [f, [L, H]] of Object.entries(FORMATS)) {
    const a = await (await post('/api/animations/apercu', { id, valeurs: {}, format: f })).json();
    check(`aperçu ${id} (${f})`, /^data:image\/png;base64,/.test(a.image || ''), a.error || '');
    const r = f === 'horizontal' ? faits[id] : await (async () => { const { id: job } = await (await post('/api/animations/rendre', { id, valeurs: {}, format: f })).json(), j = await attendre(job); check(`fabrication ${id} (${f})`, j.done && !j.error, j.error || ''); return j.resultat; })();
    if (!r) continue;
    check(`${id} (${f}) : ${L} × ${H}`, new RegExp(`${L}x${H}`).test(info(r.file)));
    if (id === 'cadre-camera') { // coin haut-droit : 46 × 34,5 vmin à 5 vmin des bords, liseré de 1,2 vmin
      const v = Math.min(L, H) / 100, cy = Math.round(5 * v + 17.25 * v), milieu = px(r.file, 2, Math.round(L - 28 * v), cy), bord = px(r.file, 2, Math.round(L - 51 * v + 0.6 * v), cy), loin = px(r.file, 2, 10, H - 10);
      check(`cadre-camera (${f}) : centre transparent, liseré dessiné`, milieu[3] === 0 && bord[3] > 200 && loin[3] === 0, JSON.stringify({ milieu, bord, loin }));
    } else { const c = px(r.file, r.duree / 2, 4, 4);
      check(`${id} (${f}) : fond crème`, Math.abs(c[0] - 246) < 10 && Math.abs(c[1] - 239) < 10 && Math.abs(c[2] - 199) < 12, JSON.stringify(c)); }
  }
  const sombre = await (await post('/api/animations/apercu', { id: 'grand-titre', valeurs: { theme: 'sombre', titre: 'Une phrase bien plus longue que prévu pour vérifier que le texte se réduit tout seul', mot: 'seul' }, format: 'vertical' })).json();
  check('grand titre : variante sombre et titre long', /^data:image\/png;base64,/.test(sombre.image || ''));
  check('modèles éditoriaux : aucune erreur dans les pages dessinées', !nav.erreurs.length, nav.erreurs.join(' | '));
  // transparence réelle : au milieu de l'animation, le centre est dessiné et le coin reste vide
  const centre = px(faits.chiffre.file, 2, 960, 540), coin = px(faits.chiffre.file, 2, 5, 5);
  check('calque : centre dessiné, coin transparent', centre[3] > 200 && coin[3] === 0, JSON.stringify({ centre, coin }));
  // montage avec l'animation par-dessus (piste vidéo 2) : export et chiffre visible sur l'image
  ff('-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x204060:s=1280x720:r=30:d=5', '-pix_fmt', 'yuv420p', path.join(base, 'fond.mp4'));
  await fetch(U('/api/import?name=fond.mp4'), { method: 'POST', body: fs.readFileSync(path.join(base, 'fond.mp4')) });
  const projet = { format: 'horizontal', res: 720, fps: 30, quality: 'rapide', sortie: 'mp4', textes: [], markers: [], audio: [],
    clips: [{ file: 'fond.mp4', kind: 'video', in: 0, out: 5, dur: 5, speed: 1, vol: 100, hasAudio: false, fx: [], afx: [], overlays: [], key: { on: false }, subs: [] }],
    pistes: [{ file: faits.chiffre.file, kind: 'video', start: 0.5, in: 0, out: 4, dur: 4, plein: true, x: 50, y: 50, scale: 100, opacity: 100, vol: 0, hasAudio: false, anim: '' }] };
  const ex = await (await post('/api/export', { project: projet })).json(), je = await attendre(ex.id);
  check('export avec une animation par-dessus', je.done && !je.error, je.error || '');
  if (je.done) { const fondPx = px(path.join('..', 'exports', je.out), 0.2, 640, 360), avec = px(path.join('..', 'exports', je.out), 2.5, 640, 360), coinX = px(path.join('..', 'exports', je.out), 2.5, 10, 10);
    check('export : la carte du chiffre recouvre le centre, le coin garde la vidéo', Math.abs(avec[0] - fondPx[0]) + Math.abs(avec[2] - fondPx[2]) > 40 && Math.abs(coinX[2] - fondPx[2]) < 12, JSON.stringify({ fondPx, avec, coinX })); }
  // panneau : Texte → Animations, sept cartes, « Poser » met le bandeau sur la piste vidéo 2 à la tête de lecture
  const pg = await nav.b.newPage({ viewport: { width: 1440, height: 900 } }), errs = []; pg.on('pageerror', x => errs.push(x.message));
  await pg.goto(U('/')); await pg.waitForTimeout(900);
  await pg.evaluate(async () => { await chargerMedias(); const m = medias.find(x => x.file === 'fond.mp4'); proj.clips = [newClip(m)]; proj.pistes = []; commit(); tout(); placerTete(1, { sansSelection: true }); });
  await pg.click('#tabs button[data-tab="titres"]'); await pg.click('[data-sous-v2="animations"]'); await pg.waitForSelector('.anim-carte');
  check('panneau : une carte par modèle', await pg.evaluate(() => document.querySelectorAll('.anim-carte').length === 11));
  check('panneau : choix du coin et du fond en listes', await pg.evaluate(() => document.querySelectorAll('[data-anim="cadre-camera"] select[data-champ="coin"] option').length === 4 && document.querySelectorAll('[data-anim="grille"] select[data-champ="theme"] option').length === 2));
  await pg.fill('[data-anim="bandeau"] [data-champ="nom"]', 'Pico'); await pg.click('[data-anim="bandeau"] [data-anim-voir]'); await pg.waitForSelector('[data-anim="bandeau"] .anim-apercu img', { timeout: 20000 });
  check('panneau : aperçu affiché', true);
  await pg.click('[data-anim="bandeau"] [data-anim-poser]'); await pg.waitForFunction(() => /Posée/.test(document.querySelector('[data-anim="bandeau"] .anim-etat').textContent), null, { timeout: 60000 }).catch(() => {});
  check('panneau : bandeau posé sur la piste vidéo 2 à la tête de lecture', await pg.evaluate(() => proj.pistes.length === 1 && Math.abs(proj.pistes[0].start - 1) < 0.05 && proj.pistes[0].plein && /animation-bandeau/.test(proj.pistes[0].file)), await pg.evaluate(() => JSON.stringify(proj.pistes)));
  await pg.click('[data-anim="intro"] [data-anim-poser]'); await pg.waitForFunction(() => /Posée/.test(document.querySelector('[data-anim="intro"] .anim-etat').textContent), null, { timeout: 60000 }).catch(() => {});
  check('panneau : générique d’ouverture posé au début de la vidéo', await pg.evaluate(() => proj.clips.length === 2 && /animation-intro/.test(proj.clips[0].file)));
  await pg.evaluate(() => { stopLecture(); placerTete(2, { sansSelection: true }); ouvrirChat(); });
  await pg.fill('#chTexte', 'mets un abonne-toi ici'); await pg.keyboard.press('Enter');
  await pg.waitForFunction(() => /Je le fais/.test([...document.querySelectorAll('#chMsgs .ch-m.ia')].pop().textContent), null, { timeout: 15000 });
  await pg.click('#chMsgs .ch-m.ia:last-child button.pri'); await pg.waitForFunction(() => /Fait/.test([...document.querySelectorAll('#chMsgs .ch-m.ia')].pop().textContent), null, { timeout: 60000 }).catch(() => {});
  check('discussion : « mets un abonne-toi ici » pose l’animation à cet instant', await pg.evaluate(() => proj.pistes.some(p => /animation-abonne/.test(p.file) && Math.abs(p.start - 2) < 0.05)), await pg.evaluate(() => JSON.stringify(proj.pistes.map(p => [p.file, p.start]))));
  check('panneau : aucune erreur dans la page', !errs.length, errs.join(' | '));
  await nav.b.close(); app.stop && app.stop(); fs.rmSync(base, { recursive: true, force: true });
  console.log(`Animations : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
