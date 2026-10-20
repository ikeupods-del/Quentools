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
  // faux modèle de voix clonée : dit chaque réplique demandée (une note dont la durée suit la longueur du texte), comme essai.py --lot
  const vc = path.join(base, 'voix-clone', 'venv-chatterbox'), fauxPython = path.join(vc, 'bin', 'python'); fs.mkdirSync(path.dirname(fauxPython), { recursive: true });
  fs.writeFileSync(fauxPython, `#!${process.execPath}\nconst fs = require('fs'), { execFileSync } = require('child_process'), a = process.argv, lot = a[a.indexOf('--lot') + 1];\nfor (const x of JSON.parse(fs.readFileSync(lot, 'utf8'))) { console.log('ETAPE : Ta voix'); fs.mkdirSync(require('path').dirname(x.fichier), { recursive: true }); execFileSync(${JSON.stringify(bins.ffmpeg)}, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=f=200:d=' + Math.min(6, 0.5 + x.texte.length / 18), '-ar', '24000', '-ac', '1', x.fichier]); }\n`); fs.chmodSync(fauxPython, 0o755);
  fs.writeFileSync(path.join(vc, '.complet'), 'essai'); process.env.QM_PYTHON = fauxPython;
  // fausses banques de photos (Wikimedia Commons, Openverse, NASA) : une photo libre sur l'euro, une autre sous licence non commerciale (refusée)
  const photo = path.join(base, 'photo-banque.jpg'); execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=1920x1280', '-frames:v', '1', photo]);
  const photos = { n: 0 }, banque = require('http').createServer((req, res) => {
    const u = new URL(req.url, 'http://x'), q = Object.fromEntries(u.searchParams), pt = banque.address().port;
    if (u.pathname.startsWith('/images/')) { photos.n++; res.writeHead(200, { 'Content-Type': 'image/jpeg' }); return res.end(fs.readFileSync(photo)); }
    res.setHeader('Content-Type', 'application/json');
    const info = (t, lic) => ({ title: t, imageinfo: [{ mime: 'image/jpeg', width: 1920, height: 1280, url: `http://127.0.0.1:${pt}/images/${encodeURIComponent(t)}`, thumburl: `http://127.0.0.1:${pt}/images/${encodeURIComponent(t)}`, descriptionurl: 'https://commons.wikimedia.org/wiki/' + t, extmetadata: { Artist: { value: 'Photographe' }, LicenseShortName: { value: lic } } }] });
    if (q.generator === 'search') return res.end(JSON.stringify({ query: { pages: [{ index: 1, ...info('File:Pièces euro monnaie commune.jpg', 'CC BY-SA 4.0') }, { index: 2, ...info('File:Euro pièce monnaie gros plan.jpg', 'CC BY-NC 2.0') }] } }));
    res.end('{}');
  });
  await new Promise(r => banque.listen(0, '127.0.0.1', r)); const fausseBanque = `http://127.0.0.1:${banque.address().port}`;
  const app = create({ port: 0, base, ...bins, ...(process.env.QM_SANS_FFPROBE ? { ffprobe: null } : {}), sortiesPico: sorties, navigateur: nav, commons: fausseBanque, banques: { openverse: fausseBanque, nasa: fausseBanque } }), port = await app.start(), U = p => `http://127.0.0.1:${port}${p}`;
  const post = (p, o, h = {}) => fetch(U(p), { method: 'POST', headers: h, body: JSON.stringify(o || {}) });
  const attendre = async id => { for (;;) { await new Promise(r => setTimeout(r, 800)); const j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.error || j.done) return j; } };

  const e = await (await fetch(U('/api/pico'))).json();
  check('état : programme de la chaîne trouvé', e.pret === true, JSON.stringify(e));
  check('état : dossier des épisodes', e.sorties === sorties);
  check('navigateur des écrans : refusé sans le jeton de la fabrication', (await post('/api/navigateur/ouvrir', { largeur: 100, hauteur: 100 })).status === 403);
  check('navigateur des écrans : refusé avec un faux jeton', (await post('/api/navigateur/ouvrir', { largeur: 100, hauteur: 100 }, { 'x-jeton': 'faux' })).status === 403);
  const vide = await post('/api/pico/fabriquer', { fiche: { numero: 1 } }); check('fiche incomplète refusée tout de suite', vide.status >= 400);
  check('fiche qui n’est pas du JSON refusée', (await post('/api/pico/fabriquer', { fiche: '{ pas du json' })).status >= 400);
  // règle de la chaîne : jamais de voix de synthèse (ni en choix, ni en secours d'une réplique manquante)
  const ficheRegle = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches', '03-interets-composes.json'), 'utf8'));
  const syn = await post('/api/pico/fabriquer', { fiche: ficheRegle, options: { voix: 'pico' } });
  check('voix de synthèse refusée pour la chaîne', syn.status >= 400 && /jamais de voix de synthèse/.test((await syn.json()).error || ''));
  { const { spawnSync } = require('child_process'), dEp = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-regle-')), env = { ...process.env, QI_EPISODES: fs.mkdtempSync(path.join(os.tmpdir(), 'qm-regle-ep-')) }; delete env.QI_ESSAI_SYNTHESE;
    const r = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fabrication', 'episode.js'), path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches', '03-interets-composes.json'), '--sortie', dEp], { encoding: 'utf8', env });
    check('episode.js sans voix enregistrée : textes à lire écrits, rien de fabriqué', r.status === 3 && /jamais de voix de synthèse/.test(r.stderr) && fs.existsSync(path.join(dEp, '03-interets-composes-lecture.txt')) && !fs.readdirSync(dEp).some(n => /\.mp4$/.test(n)), r.stderr.slice(0, 300));
    const vide = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-regle-v-')); fs.writeFileSync(path.join(vide, 'v00.wav'), '');
    const r2 = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fabrication', 'episode.js'), path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches', '03-interets-composes.json'), '--sortie', dEp, '--voix-perso', vide, '--sans-tiktok'], { encoding: 'utf8', env });
    check('réplique sans enregistrement : la fabrication s’arrête et la liste (pas de synthèse de secours)', r2.status !== 0 && /sans voix enregistrée/.test(r2.stderr + r2.stdout) && /v01\.wav/.test(r2.stderr + r2.stdout), (r2.stderr + r2.stdout).slice(-300));
    const r3 = spawnSync(process.execPath, [path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fabrication', 'episode.js'), path.join(__dirname, '..', '..', 'design', 'quentinvest-youtube', 'fiches', '03-interets-composes.json'), '--sortie', dEp, '--tiktok-synthese'], { encoding: 'utf8', env });
    check('option --tiktok-synthese retirée', r3.status !== 0 && /retirée/.test(r3.stderr));
    fs.rmSync(dEp, { recursive: true, force: true }); fs.rmSync(vide, { recursive: true, force: true }); }

  // ton script → fiche de Pico (programme seul) : répliques, écrans choisis, numéro suivant
  const sc = await (await post('/api/quentinvest/script', { texte: '# Pourquoi les prix montent ?\n\nTon panier coûtait 50 € il y a cinq ans. Aujourd’hui, près de 60 €. Pourquoi ?\n\nL’inflation\nL’inflation, c’est la hausse générale des prix. Chaque euro achète un peu moins.\n\nTrois causes :\n- l’énergie plus chère\n- les salaires qui montent\n\nEn une phrase : l’inflation grignote ton pouvoir d’achat. Et toi, tu l’as sentie ?' })).json();
  check('script → fiche : écrans chiffre, définition et liste choisis', sc.fiche && sc.fiche.accroche.ecran.type === 'chiffre' && sc.fiche.blocs.some(b => b.ecran.type === 'definition') && sc.fiche.blocs.some(b => b.ecran.type === 'liste'), JSON.stringify(sc).slice(0, 300));
  check('script → fiche : question et résumé repris du script', sc.fiche && sc.fiche.question === 'Et toi, tu l’as sentie ?' && /grignote/.test(sc.fiche.resume.texte));
  check('script → fiche : fabricable par la chaîne', (() => { try { require('../../design/quentinvest-youtube/fabrication/composer.js').compose(sc.fiche); return true; } catch (e) { return false; } })());
  check('script trop court refusé', (await post('/api/quentinvest/script', { texte: 'Bonjour.' })).status >= 400);
  check('état : ta voix clonée prête', (await (await fetch(U('/api/pico'))).json()).maVoix.installee === true);
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
    // sans enregistrement de ta voix, rien à imiter : refusé tout de suite, avec la marche à suivre
    const sv = await post('/api/pico/fabriquer', { fiche, options: { court: true, sansTiktok: true, voix: 'ma-voix' } }), svj = await sv.json();
    check('ta voix : sans enregistrement, refusée tout de suite', sv.status >= 400 && /Doublage/.test(svj.error || ''), JSON.stringify(svj));
    const sa = await post('/api/quentinvest/auto', { demande: 'fais une vidéo sur le krach de 2008', options: { voix: 'ma-voix' } }), saj = await sa.json();
    check('vidéo d’une traite : sans ta voix, refusée avant d’écrire le texte', sa.status >= 400 && /Doublage/.test(saj.error || ''), JSON.stringify(saj));
    check('état : secondes de ta voix enregistrées', (await (await fetch(U('/api/pico'))).json()).maVoix.assez === false);
    // corpus « Ma voix » : trois répliques de 4 s (comme après quelques prises du Doublage)
    const corpus = path.join(base, 'ma-voix'), idx = {}; fs.mkdirSync(path.join(corpus, 'wavs'), { recursive: true });
    for (const k of [1, 2, 3]) { const id = 'p' + k; execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=f=180:d=4', '-ar', '24000', '-ac', '1', path.join(corpus, 'wavs', id + '.wav')]); idx[id] = { texte: 'Phrase lue numéro ' + k, duree: 4 }; }
    fs.writeFileSync(path.join(corpus, 'index.json'), JSON.stringify(idx));
    check('état : ta voix enregistrée suffit', (await (await fetch(U('/api/pico'))).json()).maVoix.assez === true);
    const { id } = await (await post('/api/pico/fabriquer', { fiche, options: { court: true, sansTiktok: true } })).json();
    let j; for (;;) { await new Promise(r => setTimeout(r, 700)); j = await (await fetch(U('/api/job?id=' + id))).json(); if (j.step) etapes.add(j.step.replace(/ \d+\/\d+$/, '')); if (j.error || j.done) break; }
    const r = j.resultat || {};
    check('fabrication réelle : terminée', j.done && !j.error, j.error || '');
    check('fabrication : vidéo YouTube dans le dossier de l’épisode', (r.fichiers || []).includes('98-essai-pico-youtube.mp4'), JSON.stringify(r.fichiers));
    check('fabrication : miniatures et texte de publication', ['98-miniature.png', '98-essai-pico-publication.md'].every(n => (r.fichiers || []).includes(n)), JSON.stringify(r.fichiers));
    check('fabrication : répliques recollées sans réencoder (durées calées sur les images)', r.assemblage === 'rapide', r.assemblage);
    check('fabrication : écrans dessinés par le pont du navigateur', nav.appels.ouvrir >= 3 && nav.appels.capture > 20, JSON.stringify(nav.appels));
    check('fabrication : avancement suivi (voix, écrans, montage)', ['voix', 'écrans animés', 'montage'].every(m => [...etapes].some(x => x.includes(m))), JSON.stringify([...etapes]));
    check('fabrication : fiche gardée avec les épisodes', fs.existsSync(path.join(sorties, 'fiches', '98-essai-pico.json')));
    { const fg = JSON.parse(fs.readFileSync(path.join(sorties, 'fiches', '98-essai-pico.json'), 'utf8')), fd = fg.blocs[0].fond || {};
      check('illustrations : photo libre trouvée et posée en fond, avec son crédit', r.illustrations === 1 && fd.fichier && fs.existsSync(fd.fichier) && /Photographe, CC BY-SA 4\.0/.test(fd.credit || '') && photos.n >= 1, JSON.stringify([r.illustrations, fd]));
      check('illustrations : photo non commerciale (NC) jamais prise', !/NC/.test(fd.credit || ''));
      const EPf = JSON.parse(fs.readFileSync(path.join(sorties, 'episodes', '98-essai-pico.json'), 'utf8'));
      check('illustrations : crédit affiché sur l’écran', EPf.scenes.some(x => x.fond && x.ecran && /^Image : Photographe/.test(x.ecran.source || '')), JSON.stringify(EPf.scenes.map(x => x.ecran && x.ecran.source))); }
    check('fabrication : épisode prêt pour « Publier »', require('../publication').episodes(sorties).some(x => x.nom === '98-essai-pico'), JSON.stringify(require('../publication').episodes(sorties).map(x => x.nom)));
    if (r.dossier) { const out = execFileSync(bins.ffmpeg, ['-hide_banner', '-i', path.join(r.dossier, '98-essai-pico-youtube.mp4'), '-f', 'null', '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).toString(); check('fabrication : vidéo lisible', true, out.slice(0, 1)); }
    console.log(`  fabrication réelle en ${Math.round((Date.now() - t0) / 1000)} s`);
    // relecture : l'épisode se lit réplique par réplique, une expression et une phrase changées ne refont que ces répliques
    const E = await (await fetch(U('/api/pico/episode?base=98-essai-pico'))).json();
    check('relecture : répliques avec expression et texte', E.scenes && E.scenes.length >= 4 && E.scenes.every(x => E.expressions.includes(x.expr) && x.texte), JSON.stringify(E).slice(0, 300));
    check('relecture : épisode listé parmi les épisodes fabriqués', (await (await fetch(U('/api/pico/episodes'))).json()).episodes.some(x => x.base === '98-essai-pico'));
    check('relecture : nom d’épisode invalide refusé', (await fetch(U('/api/pico/episode?base=../../etc'))).status >= 400);
    const trav = path.join(sorties, '98-essai-pico', 'travail'), date = f => fs.statSync(path.join(trav, f)).mtimeMs, der = E.scenes.length - 1;
    const avant = { v0: date('audio/v00.wav'), c0: date('clips/scene00.mp4'), i0: date('images/i00-fin.png'), v1: date('audio/v01.wav'), cDer: date(`clips/scene${String(der).padStart(2, '0')}.mp4`) };
    const exprDer = E.scenes[der].expr === 'content' ? 'inquiet' : 'content', t1 = Date.now();
    const rf = await (await post('/api/pico/refaire', { base: '98-essai-pico', changements: [{ i: 1, texte: 'Un euro vaut exactement cent centimes.' }, { i: der, expr: exprDer }] })).json(), jr = await attendre(rf.id);
    check('refaire : terminé', jr.done && !jr.error, jr.error || '');
    const E2 = await (await fetch(U('/api/pico/episode?base=98-essai-pico'))).json();
    check('refaire : phrase et expression gardées dans l’épisode', E2.scenes[1].texte === 'Un euro vaut exactement cent centimes.' && E2.scenes[der].expr === exprDer);
    check('refaire : la réplique 1 et ses écrans sont gardés', date('audio/v00.wav') === avant.v0 && date('clips/scene00.mp4') === avant.c0 && date('images/i00-fin.png') === avant.i0, JSON.stringify(avant));
    check('refaire : la phrase changée a une nouvelle voix', date('audio/v01.wav') > avant.v1);
    check('refaire : l’expression changée refait sa réplique', date(`clips/scene${String(der).padStart(2, '0')}.mp4`) > avant.cDer);
    check('refaire : vidéo YouTube remplacée', fs.statSync(path.join(sorties, '98-essai-pico', '98-essai-pico-youtube.mp4')).mtimeMs > t1);
    console.log(`  refaire en ${Math.round((Date.now() - t1) / 1000)} s`);
    // texte d'un écran corrigé à la main : seul l'écran de cette réplique est redessiné
    const je_ = E2.scenes.findIndex((x, k) => k > 1 && k < der && x.ecran && Object.keys(x.ecran.champs).length);
    check('relecture : textes de l’écran donnés', je_ > 1, JSON.stringify(E2.scenes.map(x => x.ecran)).slice(0, 300));
    if (je_ > 1) {
      const champ = Object.keys(E2.scenes[je_].ecran.champs).find(k => k !== 'source'), avantImg = date(`images/i${String(je_).padStart(2, '0')}-fin.png`), avant0 = date('images/i00-fin.png');
      const rq2 = await (await post('/api/pico/refaire', { base: '98-essai-pico', changements: [{ i: je_, ecran: { [champ]: 'Écran corrigé à la main', type: 'pirate' } }] })).json(), jq2 = await attendre(rq2.id);
      const E3 = await (await fetch(U('/api/pico/episode?base=98-essai-pico'))).json();
      check('écran corrigé : texte gardé, type inchangé', jq2.done && E3.scenes[je_].ecran.champs[champ] === 'Écran corrigé à la main' && E3.scenes[je_].ecran.type === E2.scenes[je_].ecran.type, jq2.error || JSON.stringify(E3.scenes[je_].ecran));
      check('écran corrigé : seul cet écran est redessiné', date(`images/i${String(je_).padStart(2, '0')}-fin.png`) > avantImg && date('images/i00-fin.png') === avant0);
    }
    // la vidéo posée sur la timeline : une réplique = un clip, médias copiés dans ceux du montage, sous-titres et musique
    const mo = await (await post('/api/pico/montage', { base: '98-essai-pico' })).json(), Pm = mo.projet || { clips: [] };
    check('timeline : un clip par réplique', Pm.clips.length === E2.scenes.length && Pm.clips.every(c => c.kind === 'video' && c.dur > 0.3 && c.subs && c.subs.length), JSON.stringify(mo).slice(0, 300));
    check('timeline : répliques copiées dans les médias', Pm.clips.every(c => /^98-essai-pico-\d{2}\.mp4$/.test(c.file) && fs.existsSync(path.join(base, 'medias', c.file))), JSON.stringify(Pm.clips.map(c => c.file)));
    check('timeline : réplique refaite copiée à jour', fs.statSync(path.join(base, 'medias', '98-essai-pico-01.mp4')).size === fs.statSync(path.join(trav, 'quentmovie', 'medias', 'pico-01.mp4')).size);
    check('timeline : musique de la bibliothèque (trouvée) et nom du projet', Pm.audio.length >= 1 && Pm.audio.every(a => /^lib:musiques\/[\w-]+\.mp3$/.test(a.file) && fs.existsSync(path.join(__dirname, '..', 'bibliotheque', a.file.slice(4)))) && /^[\w.\- ()]+$/.test(mo.nom || ''), JSON.stringify([mo.nom, Pm.audio]));
    check('timeline : version TikTok absente refusée clairement', /TikTok/.test((await (await post('/api/pico/montage', { base: '98-essai-pico', version: 'tiktok' })).json()).error || ''));
    check('timeline : épisode inconnu refusé', (await post('/api/pico/montage', { base: '../x' })).status >= 400);
    const ec = await (await post('/api/pico/ecouter', { base: '98-essai-pico', texte: 'Mackay se dit maquaï.' })).json(), je = await attendre(ec.id);
    check('écouter : phrase dite par la voix de l’épisode', je.done && /\.m4a$/.test((je.resultat || {}).file || '') && fs.existsSync(path.join(base, 'medias', je.resultat.file)), je.error || '');
    // épisode avec ta voix clonée : chaque réplique dite par le modèle de clonage, aucune voix de synthèse à télécharger
    const ficheMaVoix = { ...fiche, numero: 97, slug: 'essai-ma-voix' }; delete ficheMaVoix.voix; // voix par défaut = Kokoro, jamais téléchargée ici
    const fm = await (await post('/api/pico/fabriquer', { fiche: ficheMaVoix, options: { court: true, sansTiktok: true, voix: 'ma-voix' } })).json(), jm = await attendre(fm.id);
    check('ta voix : épisode fabriqué sans voix de synthèse', jm.done && !jm.error && (jm.resultat.fichiers || []).includes('97-essai-ma-voix-youtube.mp4'), jm.error || '');
    const dmv = path.join(sorties, '97-essai-ma-voix');
    check('ta voix : une réplique dite par ta voix pour chaque réplique', fs.existsSync(path.join(dmv, 'ma-voix-youtube', 'v00.wav')) && JSON.parse(fs.readFileSync(path.join(dmv, 'voix.json'), 'utf8')).mode === 'ma-voix');
    check('ta voix : la voix de Pico n’a pas été téléchargée', !fs.existsSync(path.join(base, 'modeles', 'kokoro-multi-lang-v1_0')));
    const d0 = fs.statSync(path.join(dmv, 'ma-voix-youtube', 'v00.wav')).mtimeMs, d1 = fs.statSync(path.join(dmv, 'ma-voix-youtube', 'v01.wav')).mtimeMs;
    const rm = await (await post('/api/pico/refaire', { base: '97-essai-ma-voix', changements: [{ i: 1, texte: 'Une phrase refaite avec ta voix.' }] })).json(), jrm = await attendre(rm.id);
    check('ta voix : refaire ne redit que la phrase changée', jrm.done && !jrm.error && fs.statSync(path.join(dmv, 'ma-voix-youtube', 'v00.wav')).mtimeMs === d0 && fs.statSync(path.join(dmv, 'ma-voix-youtube', 'v01.wav')).mtimeMs > d1, jrm.error || '');
    check('une seule fabrication à la fois', await (async () => { const a = await (await post('/api/pico/refaire', { base: '97-essai-ma-voix', changements: [] })).json(); const b2 = await post('/api/pico/fabriquer', { fiche: ficheMaVoix, options: { court: true, sansTiktok: true, voix: 'ma-voix' } }); await attendre(a.id); return b2.status >= 400; })());
    // « Arrêter » : episode.js, fabriquer.js et leurs FFmpeg s'arrêtent tous ; la place reste prise jusqu'à leur fin réelle
    { const { spawnSync } = require('child_process'), restes = motif => (spawnSync('ps', ['-eo', 'stat=,args='], { encoding: 'utf8', timeout: 10000 }).stdout || '').split('\n').filter(l => l.includes(base) && motif.test(l) && !/^Z/.test(l.trim()));
      const fa = await (await post('/api/pico/fabriquer', { fiche: { ...ficheMaVoix, numero: 96, slug: 'essai-arret' }, options: { court: true, sansTiktok: true, voix: 'ma-voix' } })).json();
      for (let i = 0; i < 300 && !restes(/fabriquer\.js/).length; i++) await new Promise(r => setTimeout(r, 200));
      const lance = restes(/fabriquer\.js/).length > 0;
      await post('/api/annuler?id=' + fa.id); const seconde = await post('/api/pico/fabriquer', { fiche: ficheMaVoix, options: { court: true, sansTiktok: true, voix: 'ma-voix' } });
      const ja2 = await Promise.race([attendre(fa.id), new Promise(r => setTimeout(() => r({ error: 'délai dépassé' }), 120000))]);
      check('arrêter : seconde fabrication refusée tant que la première s’arrête', lance && seconde.status >= 400, `lancée ${lance}, statut ${seconde.status}`);
      check('arrêter : aucun fabriquer.js ni FFmpeg de l’épisode encore en vie', /annulée/.test(ja2.error || '') && !restes(/fabriquer\.js|episode\.js|ffmpeg/).length, (ja2.error || '') + ' ' + restes(/./).join(' | ')); }
    // vidéo d'une traite d'après ton script (sujet d'actualité) : script → fiche → contrôle → fabrication, numéro suivant
    check('vidéo d’une traite : sujet vide refusé', (await post('/api/quentinvest/auto', { demande: 'fais une vidéo sur' })).status >= 400);
    check('vidéo d’une traite : script trop court refusé', (await post('/api/quentinvest/auto', { script: 'Bonjour.' })).status >= 400);
    const scriptActu = '# La BCE baisse ses taux\n\nLa banque centrale vient de baisser son taux de 0,25 %. Pourquoi ça change ton crédit ?\n\nUn taux directeur, c’est le prix auquel les banques empruntent. Quand il baisse, les crédits deviennent souvent moins chers.\n\nEn une phrase : un taux plus bas rend l’argent emprunté moins cher.';
    const au = await (await post('/api/quentinvest/auto', { script: scriptActu, options: { voix: 'ma-voix', sansTiktok: true } })).json(), ja = await attendre(au.id); // ton script : moins de 5 minutes accepté, signalé
    check('ton script de moins de 5 minutes : fabriqué, avec un avertissement', ja.done && !ja.error && (ja.resultat.avertissements || []).some(x => /moins de 5 minutes/.test(x)), ja.error || JSON.stringify(ja.resultat && ja.resultat.avertissements));
    check('vidéo d’une traite : ton script devient une vidéo sans autre clic', ja.done && !ja.error && (ja.resultat.fichiers || []).some(n => /-youtube\.mp4$/.test(n)) && ja.resultat.fiche && /BCE/.test(ja.resultat.fiche.titre), ja.error || JSON.stringify(ja.resultat && ja.resultat.fichiers));
    // ton script dit avec un doublage : les répliques à enregistrer sont celles de la fabrication ; un doublage d'un autre découpage est refusé
    const rq = await (await post('/api/pico/repliques', { script: scriptActu })).json();
    check('répliques à enregistrer : celles de la fabrication, dans l’ordre', Array.isArray(rq.lignes) && rq.lignes.length > 4 && rq.lignes.some(l => /colonie/i.test(l)) && rq.nom && !/^\d/.test(rq.nom), JSON.stringify(rq).slice(0, 200));
    const doubler = (nom, lignes) => { const d = path.join(base, 'doublages', nom); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'script.json'), JSON.stringify({ lignes }));
      lignes.forEach((t, k) => execFileSync(bins.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=f=160:d=' + Math.min(5, 0.6 + t.length / 20), '-ar', '24000', '-ac', '1', path.join(d, `v${String(k).padStart(2, '0')}.wav`)])); };
    doubler('mauvais', scriptActu.split(/\n+/).filter(Boolean));
    const am = await (await post('/api/quentinvest/auto', { script: scriptActu, options: { voix: 'doublage:mauvais', sansTiktok: true, court: true } })).json(), jam = await attendre(am.id);
    check('doublage d’un autre découpage : refusé, avec la marche à suivre', /ne suit pas les répliques/.test(jam.error || '') && /Enregistrer ces répliques/.test(jam.error || ''), jam.error || 'accepté');
    doubler(rq.nom, rq.lignes);
    const ab = await (await post('/api/quentinvest/auto', { script: scriptActu, options: { voix: 'doublage:' + rq.nom, sansTiktok: true, court: true } })).json(), jab = await attendre(ab.id);
    check('doublage des répliques de la vidéo : vidéo fabriquée', jab.done && !jab.error && (jab.resultat.fichiers || []).some(n => /-youtube\.mp4$/.test(n)), jab.error || '');
    // écran de relecture dans la fenêtre : lignes, expressions, mot cliquable avec « se dit », écouter et ajouter
    const pg = await nav.b.newPage({ viewport: { width: 1440, height: 900 } }), errs = []; pg.on('pageerror', x => errs.push(x.message)); pg.on('dialog', d => { if (d.type() === 'alert') errs.push('alerte : ' + d.message()); d.dismiss().catch(() => {}); });
    await pg.goto(U('/')); await pg.waitForTimeout(800);
    await pg.evaluate(() => ouvrirFiche()); await pg.click('[name="fiMode"][value="script"]'); await pg.fill('#fiScript', scriptActu);
    check('fiche : en mode script, le champ du sujet est caché', await pg.evaluate(() => getComputedStyle(document.querySelector('#fiZoneSujet')).display === 'none' && !document.querySelector('#fiDoubler').hidden));
    await pg.click('#fiDoubler'); await pg.waitForSelector('#dbTexte');
    check('« Enregistrer ces répliques » : le Doublage s’ouvre avec les répliques de la vidéo', await pg.evaluate(l => document.querySelector('#dbTexte').value.split('\n').length === l.length && document.querySelector('#dbNom').value, rq.lignes));
    await pg.evaluate(() => { dblFin(); fermer(); ouvrirFiche(); }); await pg.waitForTimeout(500);
    check('retour dans Épisode QuentInvest : ton script est gardé et ton doublage choisi', await pg.evaluate(n => document.querySelector('#fiScript').value.length > 80 && document.querySelector('#fiAutoVoix').value === 'doublage:' + n, rq.nom));
    await pg.evaluate(() => { fermer(); fiMemo.script = ''; fiMemo.doublage = ''; });
    await pg.evaluate(() => ouvrirRelecturePico('98-essai-pico')); await pg.waitForSelector('#rlListe .rlLigne');
    check('écran de relecture : une ligne par réplique avec son expression', await pg.evaluate(n => document.querySelectorAll('#rlListe .rlLigne').length === n && document.querySelectorAll('#rlListe select[data-expr]').length === n, E.scenes.length));
    // fenêtre Épisode QuentInvest : trois façons de faire, la zone du script n'apparaît qu'avec « Mon script »
    await pg.evaluate(() => { fermer(); ouvrirFiche(); });
    check('épisode : trois façons de faire (tout seul, je relis avant, mon script)', await pg.evaluate(() => document.querySelectorAll('[name="fiMode"]').length === 3 && !!document.querySelector('[name="fiMode"][value="seul"]:checked') && document.querySelector('#fiZoneScript').hidden && /Faire la vidéo/.test(document.querySelector('#fiLancer').textContent)));
    await pg.click('[name="fiMode"][value="script"]');
    check('épisode : « Mon script » montre la zone du script', await pg.evaluate(() => !document.querySelector('#fiZoneScript').hidden && document.querySelector('#fiZoneSujet').hidden && !document.querySelector('#fiDepuisScript').hidden));
    await pg.click('[name="fiMode"][value="relire"]');
    check('épisode : « Je relis avant » écrit le texte sans fabriquer', await pg.evaluate(() => /Écrire le texte/.test(document.querySelector('#fiLancer').textContent) && document.querySelector('#fiZoneVoix').hidden));
    check('épisode : la demande « fais une vidéo sur … » donne le sujet', await pg.evaluate(() => sujetDemande('Fais-moi une vidéo sur le krach de 2008') === 'le krach de 2008'));
    await pg.evaluate(() => { fermer(); ouvrirRelecturePico('98-essai-pico'); }); await pg.waitForSelector('#rlListe .rlLigne');
    await pg.selectOption('select[data-expr="0"]', 'surpris');
    check('écran de relecture : expression changée → « Refaire 1 réplique »', await pg.evaluate(() => /Refaire 1 réplique/.test(document.querySelector('#rlRefaire').textContent) && !document.querySelector('#rlRefaire').disabled));
    await pg.click('#rlListe .rlLigne[data-i="1"] [data-mot]'); await pg.waitForSelector('#rlDit');
    check('écran de relecture : clic sur un mot → « se dit », écouter, ajouter au dictionnaire', await pg.evaluate(() => !!document.querySelector('#rlEcouter') && !!document.querySelector('#rlAjouter')));
    await pg.fill('#rlDit', 'eux'); await pg.click('#rlAjouter'); await pg.waitForTimeout(500);
    check('écran de relecture : mot ajouté → répliques qui le contiennent à refaire', await pg.evaluate(() => document.querySelectorAll('#rlListe .rlLigne.change').length >= 2), await pg.evaluate(() => document.querySelector('#rlEtat').textContent));
    check('écran de relecture : 🖼 pour corriger le texte d’un écran', await pg.evaluate(() => document.querySelectorAll('#rlListe [data-ecran]').length >= 2));
    await pg.click('#rlListe [data-ecran]'); await pg.waitForSelector('.rlEcranEdit [data-champ]');
    await pg.evaluate(() => { const c = document.querySelector('.rlEcranEdit input[data-champ]'); c.value = 'Nouveau texte'; }); await pg.click('[data-ecranok]');
    check('écran corrigé dans la relecture → réplique à refaire', await pg.evaluate(() => /Nouveau texte/.test(document.querySelector('#rlListe').textContent) && document.querySelectorAll('#rlListe .rlLigne.change').length >= 1));
    // « Monter dans la timeline » depuis la relecture : la timeline reçoit un clip par réplique, enregistrée comme projet
    await pg.evaluate(() => { window.confirm = () => true; }); await pg.click('#rlMonter [data-monter="youtube"]');
    await pg.waitForFunction(() => proj.clips.length > 0, null, { timeout: 15000 }).catch(() => {});
    check('timeline : l’épisode monté réplique par réplique, avec la musique', await pg.evaluate(n => proj.clips.length === n && proj.clips.every(c => /^98-essai-pico-\d{2}\.mp4$/.test(c.file)) && proj.audio.length >= 1 && proj.format === 'horizontal' && !document.querySelector('#modal').classList.contains('on'), E.scenes.length), await pg.evaluate(() => JSON.stringify([proj.clips.length, proj.audio, proj.format, !!document.querySelector('#rlListe')])));
    await pg.waitForFunction(n => projetCourant === n, mo.nom, { timeout: 10000 }).catch(() => {});
    // « corrige cette image » dans la discussion, sur un plan de l'épisode : la relecture de l'écran est proposée
    const repCh = await pg.evaluate(async () => { placerTete(starts()[2] + 0.1); await envoyerChat('corrige cette image, ça n’a aucun sens'); return discussion[discussion.length - 1]; });
    check('discussion : « corrige cette image » sur un plan d’épisode → corriger l’écran de la réplique', /réplique 3/.test(repCh.texte) && repCh.boutons.some(b => /Corriger l’écran/.test(b.nom)), JSON.stringify(repCh));
    check('timeline : montage enregistré comme projet', (await (await fetch(U('/api/projets'))).json()).items.includes(mo.nom), JSON.stringify((await (await fetch(U('/api/projets'))).json()).items));
    check('écran de relecture : aucune erreur dans la page', !errs.length, errs.join(' | '));
    await pg.close();

  }
  if (nav) await nav.b.close();
  app.stop && app.stop(); banque.close(); if (process.env.QM_GARDER) console.log('  dossier gardé : ' + base); else fs.rmSync(base, { recursive: true, force: true });
  console.log(`Pico : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
