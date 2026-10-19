// Épisode Pico fabriqué dans QuentMovie (routes-pico.js) : état, fiche refusée, navigateur des écrans protégé, durée des sons sans ffprobe,
// puis une vraie fabrication d'une petite fiche (voix Piper, écrans dessinés par le pont du navigateur comme dans l'application Mac)
// quand la voix est installée ou que QM_RESEAU=1 permet de la télécharger. Ignoré sans Chromium (Mac de construction).
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
    b, appels: { ouvrir: 0, capture: 0 },
    async ouvrir(l, h) { this.appels.ouvrir++; const p = await b.newPage({ viewport: { width: l, height: h } }); pages.set(++n, p); return n; },
    async contenu(id, html) { await pages.get(+id).setContent(html, { waitUntil: 'load' }); },
    evaluer(id, code) { return pages.get(+id).evaluate(code); },
    async capture(id, chemin, transparent) { this.appels.capture++; await pages.get(+id).screenshot({ path: chemin, omitBackground: transparent }); },
    async fermer(id) { const p = pages.get(+id); pages.delete(+id); if (p) await p.close(); }
  };
}

(async () => {
  let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };
  const { dureeWav } = require('../../design/quentinvest-youtube/fabrication/duree');
  const { create } = require('../server'), { resolveFfmpeg } = require('../ffmpeg-path');
  const bins = await resolveFfmpeg(), base = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pico-')), sorties = path.join(base, 'QuentInvest');
  // durée d'un WAV lue dans l'en-tête : même valeur que ffprobe
  const wav = path.join(base, 'd.wav'); execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=d=3.217', '-ar', '22050', '-ac', '1', wav]);
  check('durée d’un WAV sans ffprobe', Math.abs(dureeWav(wav) - 3.217007) < 1e-6, String(dureeWav(wav)));
  check('durée : null pour un autre fichier', dureeWav(__filename) === null);
  const exe = chromium(); let pw = null; try { pw = require('playwright-core'); } catch (e) { /* absent */ }
  const nav = exe && pw ? await navigateurEssai(exe) : null;
  const modeles = process.env.QM_MODELES || path.join(base, 'modeles');
  if (process.env.QM_MODELES) fs.symlinkSync(process.env.QM_MODELES, path.join(base, 'modeles'));
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}), sortiesPico: sorties, navigateur: nav }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const post = (p, o, h = {}) => fetch(U(p), { method: 'POST', headers: h, body: JSON.stringify(o || {}) });
  const attendre = async id => { for (;;) { await new Promise(r => setTimeout(r, 800)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error || j.done) return j; } };

  const e = await (await fetch(U('/api/pico'))).json();
  check('état : programme de la chaîne trouvé', e.pret === true, JSON.stringify(e));
  check('état : dossier des épisodes', e.sorties === sorties);
  check('navigateur des écrans : refusé sans le jeton de la fabrication', (await post('/api/navigateur/ouvrir', { largeur: 100, hauteur: 100 })).status === 403);
  check('navigateur des écrans : refusé avec un faux jeton', (await post('/api/navigateur/ouvrir', { largeur: 100, hauteur: 100 }, { 'x-jeton': 'faux' })).status === 403);
  const vide = await post('/api/pico/fabriquer', { fiche: { numero: 1 } }); check('fiche incomplète refusée tout de suite', vide.status >= 400);
  check('fiche qui n’est pas du JSON refusée', (await post('/api/pico/fabriquer', { fiche: '{ pas du json' })).status >= 400);

  // vraie fabrication : petite fiche, voix Piper « Pierre », vidéo YouTube courte seulement
  const voixPrete = fs.existsSync(path.join(modeles, 'vits-piper-fr_FR-upmc-medium', '.complet'));
  if (!nav) console.log('  (fabrication réelle ignorée : aucun Chromium pour dessiner les écrans)');
  else if (!voixPrete && !process.env.QM_RESEAU) console.log('  (fabrication réelle ignorée : voix Piper absente, QM_RESEAU=1 pour la télécharger)');
  else {
    const fiche = {
      numero: 98, slug: 'essai-pico', titre: 'Un euro, c’est quoi ?', promesse: 'Un euro, c’est quoi ?', description: 'Essai de fabrication.', hashtags: '#essai',
      voix: { moteur: 'piper', modele: 'vits-piper-fr_FR-upmc-medium', sid: 1, vitesse: 0.9, hauteur: 1.08 }, musique: 'documentaire-doux',
      accroche: { texte: 'Un euro, c’est quoi ?', court: 'Un euro ?', ecran: { intro: 'Une pièce.', avant: '1 €', apres: '100 centimes', de: 1, a: 100, legende: 'Une pièce, cent centimes.', source: 'Définition' } },
      blocs: [{ section: 'La pièce', texte: 'Un euro vaut cent centimes. C’est la monnaie de vingt pays.', ecran: { type: 'definition', mot: 'Euro', texte: 'La monnaie commune.' } }],
      resume: { texte: 'En une phrase : un euro, c’est cent centimes.', court: 'Un euro, cent centimes.' }, question: 'Et toi ?',
      suite: { titre: 'La suite', texte: 'La prochaine fois : le centime.' }, sources: ['S1 · Définition de l’euro'], miniature: { lignes: ['UN EURO', 'C’EST QUOI ?'], accent: 'EURO', bas: ['1 €', '→ 100 c'] }
    };
    const t0 = Date.now(), etapes = new Set();
    const { id } = await (await post('/api/pico/fabriquer', { fiche, options: { court: true, sansTiktok: true } })).json();
    let j; for (;;) { await new Promise(r => setTimeout(r, 700)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.step) etapes.add(j.step.replace(/ \d+\/\d+$/, '')); if (j.error || j.done) break; }
    const r = j.resultat || {};
    check('fabrication réelle : terminée', j.done && !j.error, j.error || '');
    check('fabrication : vidéo YouTube dans le dossier de l’épisode', (r.fichiers || []).includes('98-essai-pico-youtube.mp4'), JSON.stringify(r.fichiers));
    check('fabrication : miniatures et texte de publication', ['98-miniature.png', '98-essai-pico-publication.md'].every(n => (r.fichiers || []).includes(n)), JSON.stringify(r.fichiers));
    check('fabrication : écrans dessinés par le pont du navigateur', nav.appels.ouvrir >= 3 && nav.appels.capture > 20, JSON.stringify(nav.appels));
    check('fabrication : avancement suivi (voix, écrans, montage)', ['voix', 'écrans animés', 'montage'].every(m => [...etapes].some(x => x.includes(m))), JSON.stringify([...etapes]));
    check('fabrication : fiche gardée avec les épisodes', fs.existsSync(path.join(sorties, 'fiches', '98-essai-pico.json')));
    check('fabrication : épisode prêt pour « Publier »', require('../publication').episodes(sorties).some(x => x.nom === '98-essai-pico'), JSON.stringify(require('../publication').episodes(sorties).map(x => x.nom)));
    if (r.dossier) { const out = execFileSync(bins.ffmpeg, ['-hide_banner', '-i', path.join(r.dossier, '98-essai-pico-youtube.mp4'), '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString(); check('fabrication : vidéo lisible', true, out.slice(0, 1)); }
    console.log(`  fabrication réelle en ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  if (nav) await nav.b.close();
  app.stop && app.stop(); if (process.env.QM_GARDER) console.log('  dossier gardé : ' + base); else fs.rmSync(base, { recursive: true, force: true });
  console.log(`Pico : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
