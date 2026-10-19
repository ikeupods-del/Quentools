// Routes de l'épisode QuentInvest avec Pico, fabriqué dans QuentMovie : état (voix de Pico, programme de la chaîne), fabrication d'une fiche
// en tâche de fond (programme de la chaîne lancé avec les outils de QuentMovie : son Node, son FFmpeg, sa voix, ses fenêtres cachées pour les écrans),
// et navigateur des écrans (/api/navigateur, réservé à la fabrication par un jeton). `traiter` renvoie NON quand la requête n'est pas pour ce module.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const { enGroupe, finGroupe, arreterTout: arreterGroupes } = require('./voix-clone');
const NON = Symbol('non traité');
const enCours = new Set(); // place réservée dès la requête par une fabrication ou une écoute (une seule à la fois : mémoire et chaleur d'un MacBook Air)
const OCCUPE = 'Une fabrication d’épisode est déjà en cours : attends qu’elle finisse (une seule à la fois, pour garder le Mac fluide).';
// un jeton par processus de fabrication : il n'ouvre que ses fenêtres cachées, fermées à sa fin (même s'il meurt en route)
const jetons = new Map(); // jeton → ids des fenêtres ouvertes
// fermeture de QuentMovie : fabrications, voix clonée et leurs FFmpeg arrêtés
function arreterTout() { arreterGroupes(); }
const EXPRESSIONS = ['neutre', 'content', 'inquiet', 'surpris', 'curieux', 'reflechi']; // dessins de Pico (personnage/png) // un par lancement de QuentMovie : seule la fabrication lancée par ce moteur le connaît

// dossier du programme de la chaîne : à côté de QuentMovie dans le dépôt, ou livré dans l'application (Resources/pico)
function dossierPico(opts = {}) {
  const l = [opts.picoDossier, process.env.QM_PICO, path.join(__dirname, '..', 'design', 'quentinvest-youtube'), process.resourcesPath && path.join(process.resourcesPath, 'pico')];
  return l.find(d => d && fs.existsSync(path.join(d, 'fabrication', 'episode.js'))) || null;
}
// dossier qui contient assets/fonts/inter.woff2 (police des écrans) : la racine du dépôt, ou le dossier pico de l'application
const racinePolices = pico => [path.join(pico, '..', '..'), pico].find(d => fs.existsSync(path.join(d, 'assets', 'fonts', 'inter.woff2'))) || pico;
// chemin d'un module livré avec QuentMovie (le programme de la chaîne ne les cherche pas tout seul quand il est dans l'application)
const module_ = n => { try { return path.dirname(require.resolve(n + '/package.json')).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep); } catch (e) { return null; } };

function creer({ BASE, FFMPEG, opts, send, readJson, travail, PAROLE, VOIXCLONE, libererIA = () => {} }) {
  const SORTIES = opts.sortiesPico || path.join(os.homedir(), 'Movies', 'QuentInvest');
  const nav = () => opts.navigateur || null;
  const entier = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a));

  // environnement de la fabrication : outils de QuentMovie, dossiers de ~/Movies/QuentInvest, fenêtres cachées pour les écrans
  function envFabrication(pico, fProg, port, jeton) {
    const sherpa = require('./parole').dossierSherpa(), pont = !!nav();
    return {
      ...process.env, QI_QM: __dirname, QI_RACINE: racinePolices(pico), QI_FFMPEG: FFMPEG, FFMPEG, QI_NODE: process.execPath,
      QI_EPISODES: path.join(SORTIES, 'episodes'), QI_MEDIAS: path.join(SORTIES, 'medias'), QI_PROGRES: fProg, QM_PRONONCIATIONS: require('./voix-texte').fichierPerso(), // même dictionnaire de prononciation que QuentMovie
      QI_SONS: path.join(__dirname, 'bibliotheque', 'sons').replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep), // FFmpeg ne lit pas dans l'archive de l'application
      ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      ...(module_('sherpa-onnx-node') ? { SHERPA: module_('sherpa-onnx-node') } : {}),
      ...(sherpa ? { DYLD_LIBRARY_PATH: [sherpa, process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':'), LD_LIBRARY_PATH: [sherpa, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } : {}),
      // écrans : fenêtres cachées de QuentMovie (application Mac) ; sinon Playwright si présent (essais, ligne de commande)
      ...(pont ? { PW: path.join(__dirname, 'navigateur-pont.js'), QI_NAVIGATEUR: `http://127.0.0.1:${port}/api/navigateur`, QI_JETON: jeton } : module_('playwright-core') && !process.env.PW ? { PW: module_('playwright-core') } : {})
    };
  }
  // un programme de la chaîne dans un processus à part ; avancement lu dans un petit fichier ; `phases` : noms des vidéos fabriquées à la suite
  function lancer(job, pico, script, args, nom, phases, phase0 = 0) {
    const trav = path.join(SORTIES, '.travail'); fs.mkdirSync(trav, { recursive: true });
    const fProg = path.join(trav, nom + '-progres.json'); fs.rmSync(fProg, { force: true });
    return new Promise((ok, ko) => {
      if (job.annule) return ko(new Error('Fabrication annulée.'));
      // groupe à part (detached) : « Arrêter » arrête episode.js, fabriquer.js et leurs FFmpeg d'un coup (kill() de enGroupe)
      const jeton = crypto.randomBytes(18).toString('hex'); jetons.set(jeton, new Set());
      const fermerFenetres = () => { const ids = jetons.get(jeton) || []; jetons.delete(jeton); const N = nav(); if (N) for (const id of ids) Promise.resolve().then(() => N.fermer(id)).catch(() => {}); };
      const enfant = enGroupe(spawn(process.execPath, [path.join(pico, 'fabrication', script), ...args], { env: envFabrication(pico, fProg, job.port, jeton), stdio: ['ignore', 'pipe', 'pipe'], detached: true })); job.enfant = enfant;
      // MacBook Air (16 Go, sans ventilateur) : la fabrication et ses FFmpeg passent après le montage en cours, la fenêtre reste fluide
      try { os.setPriority(enfant.pid, 10); } catch (e) { /* priorité inchangée */ }
      let sortie = '', erreurs = '', phase = phase0; const n = Math.max(1, phases.length);
      const lire = () => { let x; try { x = JSON.parse(fs.readFileSync(fProg, 'utf8')); } catch (e) { return; }
        const PART = { voix: [0, 0.12], ecrans: [0.12, 0.45], clips: [0.45, 0.6], export: [0.6, 1] };
        if (x.etape === 'phase') { job.step = x.t; const k = phases.findIndex(f => x.t.includes(f)); if (k >= 0) phase = k; if (/Miniatures|Texte/.test(x.t)) job.progress = 0.97; return; }
        if (x.etape === 'voix' && x.i === 1 && job._derniere === 'export') phase = Math.min(n - 1, phase + 1); // fabriquer.js seul : la version suivante commence
        job._derniere = x.etape;
        const [a, b] = PART[x.etape] || [0, 0], r = x.etape === 'export' ? x.p : x.n ? x.i / x.n : 0;
        job.progress = Math.min(0.96, (phase + a + (b - a) * r) / n);
        job.step = `${n > 1 ? phases[phase] + ' · ' : ''}${{ voix: 'voix', ecrans: 'écrans animés', clips: 'répliques', export: 'montage' }[x.etape] || ''}${x.n ? ` ${x.i}/${x.n}` : x.step ? ' · ' + x.step : ''}`;
      };
      const minuteur = setInterval(lire, 700);
      enfant.stdout.on('data', d => { sortie += d; });
      enfant.stderr.on('data', d => { erreurs = (erreurs + d).slice(-20000); });
      enfant.on('error', e => { clearInterval(minuteur); fermerFenetres(); finGroupe(enfant).then(() => ko(e)); });
      enfant.on('close', async code => {
        clearInterval(minuteur); await finGroupe(enfant); fermerFenetres(); fs.rmSync(fProg, { force: true }); if (job.enfant === enfant) job.enfant = null;
        if (job.annule) return ko(new Error('Fabrication annulée.'));
        if (code !== 0) {
          // le message utile est écrit avant la pile d'appels de Node (« …episode.js:44 ») : on garde ses dernières lignes
          const l = erreurs.split('\n'), fin = l.findIndex(x => /fabrication[\\/]\w+\.js:\d+$/.test(x.trim()));
          const msg = (fin > 0 ? l.slice(0, fin) : l).filter(x => x.trim() && !/csrc|^\s+at |^Node\.js v/.test(x)).slice(-3).join(' ').trim() || 'Fabrication échouée';
          return ko(new Error(/trop courte/.test(msg) ? msg : 'Fabrication échouée : ' + msg.slice(0, 400)));
        }
        ok(sortie.replace(/\r/g, '\n').split('\n'));
      });
    });
  }
  // ---------- voix de l'épisode : ta voix clonée (« ma-voix », par défaut) ou un doublage enregistré (« doublage:<nom> ») ----------
  // RÈGLE DE LA CHAÎNE : jamais de voix de synthèse. « pico » (synthèse) n'est accepté que pour les essais automatiques (QI_ESSAI_SYNTHESE=1).
  // ta voix : chaque réplique est dite par le modèle de clonage dans un dossier vNN.wav, puis la fabrication la prend comme une voix enregistrée
  const choixVoix = (dossier) => { try { return JSON.parse(fs.readFileSync(path.join(dossier, 'voix.json'), 'utf8')); } catch (e) { return { mode: 'pico' }; } };
  const SYNTHESE_REFUSEE = 'La chaîne n’utilise jamais de voix de synthèse : choisis ta voix clonée ou un doublage enregistré.';
  function modeVoix(v) {
    const m = String(v || 'ma-voix');
    if (m === 'ma-voix' && !require('./voix-clone').voixEnregistree(BASE).assez) throw new Error(require('./voix-clone').SANS_VOIX);
    if (m === 'ma-voix') { const VC = VOIXCLONE && VOIXCLONE(), prets = VC ? VC.prete() : []; return { mode: 'ma-voix', moteur: prets.includes('chatterbox') ? 'chatterbox' : prets[0] || 'chatterbox' }; }
    if (m.startsWith('doublage:')) { const nom = path.basename(m.slice(9)); const d = path.join(BASE, 'doublages', nom); if (!nom || !fs.existsSync(d)) throw new Error('Doublage introuvable : ' + nom); return { mode: 'doublage', nom }; }
    if (m === 'pico' && process.env.QI_ESSAI_SYNTHESE) return { mode: 'pico' };
    throw new Error(SYNTHESE_REFUSEE);
  }
  // dossiers de voix par version (YouTube, TikTok) : les répliques de ta voix clonée sont dites (ou gardées si le texte n'a pas changé)
  // un doublage suit les répliques d'un texte précis : enregistré pour un autre découpage, ta voix tomberait sur les mauvais écrans
  const pareil = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
  function doublageConforme(nom, scenes) {
    let lignes; try { lignes = lireJson(path.join(BASE, 'doublages', nom, 'script.json')).lignes; } catch (e) { return; } // ancien doublage sans texte gardé : les prises manquantes seront listées
    if (!Array.isArray(lignes)) return;
    const ecarts = scenes.map((s, i) => ({ i, attendu: s.texte, lu: lignes[i] })).filter(x => pareil(x.attendu) !== pareil(x.lu));
    if (!ecarts.length && lignes.length === scenes.length) return;
    const ex = ecarts.slice(0, 2).map(x => `réplique ${x.i + 1} : la vidéo dit « ${String(x.attendu).slice(0, 70)} »${x.lu ? `, ton doublage « ${String(x.lu).slice(0, 70)} »` : ', pas enregistrée'}`).join(' ; ');
    throw new Error(`Ton doublage « ${nom} » ne suit pas les répliques de cette vidéo (${scenes.length} répliques, ${lignes.length} lignes enregistrées${ex ? ' ; ' + ex : ''}). Clique « 🎙 Enregistrer ces répliques » : le Doublage s’ouvre avec exactement les phrases de la vidéo, dans l’ordre.`);
  }
  async function voixDesVersions(job, choix, dossier, versions) {
    if (choix.mode === 'doublage') { doublageConforme(choix.nom, versions[0][1].scenes); return { youtube: path.join(BASE, 'doublages', choix.nom), tiktok: '' }; }
    if (choix.mode !== 'ma-voix') return {};
    const VT = require('./voix-texte'), lignes = [], dirs = {};
    for (const [nom, EP] of versions) {
      const d = path.join(dossier, 'ma-voix-' + nom); dirs[nom] = d;
      EP.scenes.forEach((s, i) => lignes.push({ texte: VT.pourLaVoix(s.voix || s.texte), fichier: path.join(d, `v${String(i).padStart(2, '0')}.wav`) }));
    }
    job.step = 'Ta voix…'; libererIA(); // 16 Go de mémoire : l'IA du montage (≈ 3 Go) laisse la place au modèle de ta voix, elle se relance seule à la demande suivante
    await VOIXCLONE().dire(choix.moteur, lignes, job);
    return dirs;
  }
  // une fabrication complète : episode.js (YouTube, TikTok, miniatures, texte de publication)
  async function fabriquer(job, fiche, o) {
    const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
    const C = require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche); // erreur claire si la fiche est incomplète
    const dossier = path.join(SORTIES, C.base), fiches = path.join(SORTIES, 'fiches');
    for (const d of [dossier, fiches, path.join(SORTIES, 'medias'), path.join(SORTIES, 'episodes')]) fs.mkdirSync(d, { recursive: true });
    const fFiche = path.join(fiches, C.base + '.json'); fs.writeFileSync(fFiche, JSON.stringify(fiche, null, 1) + '\n');
    const choix = o.choixVoix || modeVoix(); fs.writeFileSync(path.join(dossier, 'voix.json'), JSON.stringify(choix));
    const V = await voixDesVersions(job, choix, dossier, [['youtube', C.long], ['tiktok', C.tiktok]]);
    const perso = [...(V.youtube ? ['--voix-perso', V.youtube] : []), ...(V.tiktok ? ['--voix-perso-tiktok', V.tiktok] : [])];
    const args = [fFiche, '--sortie', dossier, '--modeles', path.join(BASE, 'modeles'), ...perso, ...(o.court ? ['--court'] : []), ...(o.sansTiktok ? ['--sans-tiktok'] : []), ...(o.sansYoutube ? ['--sans-youtube'] : [])];
    const lignes = await lancer(job, pico, 'episode.js', args, C.base, [...(o.sansYoutube ? [] : ['YouTube']), ...(o.sansTiktok ? [] : ['TikTok'])]);
    return { base: C.base, titre: fiche.titre || C.base, dossier, fichier: fFiche, fichiers: fs.readdirSync(dossier).filter(n => /\.(mp4|png|md|zip)$/.test(n)),
      assemblage: ((lignes.find(l => /· assemblage (rapide|complet)/.test(l)) || '').match(/assemblage (rapide|complet)/) || [])[1] || '', // « rapide » : répliques recollées sans réencoder
      avertissements: lignes.filter(l => /^⚠/.test(l)).map(l => l.replace(/^⚠\s*/, '')).slice(0, 30), controle: lignes.filter(l => /^\s+.* · /.test(l)).map(l => l.trim()).slice(0, 30) };
  }
  // ---------- relecture d'un épisode fabriqué : expression, phrase, prononciation ; seules les répliques changées sont refaites ----------
  const nomSur = b => { const n = String(b || ''); if (!/^\d{2,3}-[a-z0-9-]{1,80}$/.test(n)) throw new Error('Épisode inconnu'); return n; };
  const lireJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  const dossierVoix = (EP) => path.join(BASE, 'modeles', EP.voix && EP.voix.moteur === 'kokoro' ? 'kokoro-multi-lang-v1_0' : (EP.voix && EP.voix.modele) || 'vits-piper-fr_FR-upmc-medium');
  function episodeFabrique(base) {
    base = nomSur(base); const f = path.join(SORTIES, 'episodes', base + '.json'), dossier = path.join(SORTIES, base);
    if (!fs.existsSync(f) || !fs.existsSync(path.join(dossier, 'travail'))) throw new Error('Cet épisode n’a pas encore été fabriqué dans QuentMovie.');
    return { base, f, dossier, EP: lireJson(f), tiktok: fs.existsSync(path.join(SORTIES, 'episodes', base + '-tiktok.json')) && fs.existsSync(path.join(dossier, 'travail-tiktok')) };
  }
  async function refaire(job, base, changements, avecTiktok) {
    const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
    const E = episodeFabrique(base), EP = E.EP;
    for (const c of changements) {
      const s = EP.scenes[c.i]; if (!s) continue;
      if (c.expr && EXPRESSIONS.includes(c.expr)) s.expr = c.expr;
      if (typeof c.texte === 'string' && c.texte.trim()) { const t = c.texte.replace(/\s+/g, ' ').trim().slice(0, 600); if (t !== s.texte) { s.texte = t; delete s.voix; } } // `voix` (lecture différente du texte) ne correspond plus
    }
    fs.writeFileSync(E.f, JSON.stringify(EP, null, 1) + '\n');
    const choix = choixVoix(E.dossier), fT = path.join(SORTIES, 'episodes', E.base + '-tiktok.json');
    const V = await voixDesVersions(job, choix, E.dossier, [['youtube', EP], ...(choix.mode === 'ma-voix' && avecTiktok && E.tiktok ? [['tiktok', lireJson(fT)]] : [])]);
    const versions = [['', E.f, 'travail', `${E.base}-youtube.mp4`, 'YouTube'], ...(avecTiktok && E.tiktok ? [['-tiktok', path.join(SORTIES, 'episodes', E.base + '-tiktok.json'), 'travail-tiktok', `${E.base}-tiktok.mp4`, 'TikTok']] : [])];
    for (const [k, [, json, trav, video, nom]] of versions.entries()) {
      const T = lireJson(json), dv = k ? V.tiktok : V.youtube, args = [json, '--voix', dossierVoix(T), '--sortie', path.join(E.dossier, trav), '--court', ...(dv ? ['--voix-perso', dv] : [])];
      job.step = nom; await lancer(job, pico, 'fabriquer.js', args, E.base + '-refaire', versions.map(v => v[4]), k);
      fs.copyFileSync(path.join(E.dossier, trav, 'episode.mp4'), path.join(E.dossier, video));
      if (!k) { // texte de publication : chapitres recalés sur les nouvelles durées
        const fFiche = path.join(SORTIES, 'fiches', E.base + '.json');
        if (fs.existsSync(fFiche)) { const P = require(path.join(pico, 'fabrication', 'publier.js')), F = lireJson(fFiche), rap = lireJson(path.join(E.dossier, trav, 'rapport.json'));
          fs.writeFileSync(path.join(E.dossier, `${E.base}-publication.md`), P.publication(F, rap, {})); fs.writeFileSync(path.join(E.dossier, `${E.base}-publication.json`), JSON.stringify(P.publicationDonnees(F, rap, {}), null, 1)); }
      }
    }
    return { base: E.base, dossier: E.dossier, versions: versions.map(v => v[4]) };
  }

  return async function traiter(req, res, p, url) {
    // navigateur des écrans (fenêtres cachées de l'application), appelé par navigateur-pont.js pendant la fabrication
    if (p.startsWith('/api/navigateur/')) {
      const fen = jetons.get(String(req.headers['x-jeton'] || ''));
      if (req.method !== 'POST' || !fen) return send(res, 403, { error: 'Accès refusé' });
      const N = nav(); if (!N) throw new Error('Navigateur des écrans indisponible');
      const b = await readJson(req), a = p.slice(16);
      if (a !== 'ouvrir' && !fen.has(+b.id)) throw new Error('Page des écrans inconnue'); // seulement les fenêtres de cette fabrication
      let r = null;
      if (a === 'ouvrir') { r = await N.ouvrir(entier(b.largeur, 64, 4096), entier(b.hauteur, 64, 4096)); if (jetons.get(req.headers['x-jeton']) === fen) fen.add(+r); else await N.fermer(r); } // fabrication finie entre-temps : fenêtre refermée
      else if (a === 'contenu') await N.contenu(b.id, String(b.html || ''));
      else if (a === 'evaluer') r = await N.evaluer(b.id, String(b.code || ''));
      else if (a === 'capture') { const c = String(b.chemin || ''); if (!path.isAbsolute(c) || !/\.png$/i.test(c)) throw new Error('Image d’écran invalide'); fs.mkdirSync(path.dirname(c), { recursive: true }); await N.capture(b.id, c, !!b.transparent); }
      else if (a === 'fermer') { fen.delete(+b.id); await N.fermer(b.id); }
      else return send(res, 404, { error: 'Introuvable' });
      return send(res, 200, { resultat: r === undefined ? null : r });
    }
    if (!p.startsWith('/api/pico')) return NON;
    // les répliques d'une vidéo (fiche ou script), à enregistrer dans le Doublage dans l'ordre exact de la fabrication
    if (req.method === 'POST' && p === '/api/pico/repliques') {
      const b = await readJson(req), pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
      let fiche = b.fiche; if (typeof fiche === 'string') { try { fiche = JSON.parse(fiche); } catch (e) { throw new Error('La fiche n’est pas un texte JSON valide.'); } }
      if (!fiche && String(b.script || '').trim().length >= 80) fiche = require('./fiche-quentinvest').ficheDepuisScript(String(b.script).slice(0, 60000), { numero: 1 });
      if (!fiche || typeof fiche !== 'object') throw new Error('Écris d’abord ton script ou ta fiche.');
      const C = require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche);
      return send(res, 200, { nom: C.base.replace(/^\d+-/, ''), titre: fiche.titre || '', lignes: C.long.scenes.map(s => s.texte) });
    }
    if (req.method === 'GET' && p === '/api/pico') {
      const pico = dossierPico(opts), e = PAROLE().etat();
      let doublages = []; try { doublages = fs.readdirSync(path.join(BASE, 'doublages')).filter(n => fs.existsSync(path.join(BASE, 'doublages', n, 'v00.wav'))); } catch (er) { /* aucun */ }
      const VC = VOIXCLONE && VOIXCLONE(), mv = VC ? VC.etat() : null;
      return send(res, 200, { pret: !!pico, dispo: e.dispo, voix: e.pico, navigateur: !!nav() || !!module_('playwright-core'), sorties: SORTIES,
        maVoix: { installee: VC ? VC.prete().length > 0 : false, ...require('./voix-clone').voixEnregistree(BASE), min: require('./voix-clone').VOIX_MIN, essai: !!(mv && mv.fichiers.some(f => f !== 'reel.wav')) }, doublages });
    }
    // épisode fabriqué à relire : répliques (section, expression, texte), mots à vérifier, versions présentes
    if (req.method === 'GET' && p === '/api/pico/episode') {
      const E = episodeFabrique(url.searchParams.get('base')), fFiche = path.join(SORTIES, 'fiches', E.base + '.json');
      let difficiles = [];
      try { const VT = require('./voix-texte'); difficiles = require('./fiche-quentinvest').controler(lireJson(fFiche), { lexique: VT.lexiqueActuel() }).difficiles || []; } catch (e) { /* sans fiche : aucun mot signalé */ }
      let section = '';
      return send(res, 200, { base: E.base, titre: E.EP.titre, tiktok: E.tiktok, expressions: EXPRESSIONS, difficiles,
        scenes: E.EP.scenes.map((x, i) => ({ i, section: x.section ? (section = x.section) : '', dans: section, expr: x.expr || 'neutre', texte: x.texte })) });
    }
    if (req.method === 'GET' && p === '/api/pico/episodes') { // épisodes fabriqués dans QuentMovie (les plus récents d'abord)
      const d = path.join(SORTIES, 'episodes'); let l = []; try { l = fs.readdirSync(d).filter(n => /^\d{2,3}-[a-z0-9-]+\.json$/.test(n) && !/-tiktok\.json$/.test(n)).map(n => n.replace(/\.json$/, '')).filter(b => fs.existsSync(path.join(SORTIES, b, 'travail'))); } catch (e) { /* aucun */ }
      return send(res, 200, { episodes: l.map(b => ({ base: b, titre: (() => { try { return lireJson(path.join(d, b + '.json')).titre; } catch (e) { return b; } })(), date: fs.statSync(path.join(d, b + '.json')).mtimeMs })).sort((a, b) => b.date - a.date) });
    }
    // écouter une phrase avec la voix de Pico (dictionnaire compris) : la fabrication ne fait que la voix d'une réplique
    if (req.method === 'POST' && p === '/api/pico/ecouter') {
      // le modèle de ta voix ne tourne jamais deux fois : refusé pendant une fabrication, place réservée avant tout await
      if (enCours.size) throw new Error('Une fabrication d’épisode est en cours : écoute la phrase quand elle sera finie.');
      const place = {}; enCours.add(place);
      try { return await ecouter(req, res, place); } catch (e) { enCours.delete(place); throw e; }
    }
    // refaire après relecture : changements [{ i, expr, texte }] ; `tiktok` : refaire aussi la version TikTok (après une correction de prononciation)
    if (req.method === 'POST' && p === '/api/pico/refaire') {
      if (enCours.size) throw new Error(OCCUPE);
      const place = {}; enCours.add(place);
      try {
        const b = await readJson(req), E = episodeFabrique(b.base), ch = (Array.isArray(b.changements) ? b.changements : []).slice(0, 200).map(c => ({ i: Math.round(+c.i), expr: c.expr ? String(c.expr) : '', texte: c.texte != null ? String(c.texte) : null }));
        const port = req.socket.localPort;
        return send(res, 200, travail(async job => { job.port = port; try { return await refaire(job, E.base, ch, !!b.tiktok); } finally { enCours.delete(place); } }));
      } catch (e) { enCours.delete(place); throw e; }
    }
    if (req.method === 'POST' && p === '/api/pico/fabriquer') {
      if (enCours.size) throw new Error(OCCUPE);
      const place = {}; enCours.add(place);
      try { return await demandeFabrication(req, res, place); } catch (e) { enCours.delete(place); throw e; }
    }
    return NON;
  };
  // écouter une phrase (place déjà réservée : libérée à la fin de la tâche)
  async function ecouter(req, res, place) {
    const b = await readJson(req), texte = String(b.texte || '').replace(/\s+/g, ' ').trim().slice(0, 300); if (!texte) throw new Error('Rien à dire.');
    const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
    let voix = { moteur: 'kokoro', sid: 30, vitesse: 0.82, hauteur: 0.78 }, choix = { mode: 'pico' }; try { const E = episodeFabrique(b.base); voix = E.EP.voix || voix; choix = choixVoix(E.dossier); } catch (e) { /* voix de Pico par défaut */ }
    const port = req.socket.localPort;
    return send(res, 200, travail(async job => { try {
      job.port = port;
      if (choix.mode === 'ma-voix') { // la phrase dite par ta voix clonée (l'IA du montage laisse la place à son modèle)
        libererIA();
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-ma-voix-')), wav = path.join(dir, 'v00.wav');
        try { await VOIXCLONE().dire(choix.moteur, [{ texte: require('./voix-texte').pourLaVoix(texte), fichier: wav }], job); const nom = `ma-voix-ecoute-${Date.now()}.m4a`;
          await new Promise((ok, ko) => require('child_process').execFile(FFMPEG, ['-y', '-v', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '128k', path.join(BASE, 'medias', nom)], e => (e ? ko(e) : ok()))); return { file: nom }; }
        finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }
      if (choix.mode !== 'pico' || !process.env.QI_ESSAI_SYNTHESE) throw new Error(choix.mode === 'doublage' ? 'Épisode doublé : c’est ta propre voix, réenregistre la phrase dans le Doublage pour changer sa prononciation.' : SYNTHESE_REFUSEE);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pico-ecoute-')), json = path.join(dir, 'ep.json');
      try {
        fs.writeFileSync(json, JSON.stringify({ titre: 'écoute', style: 2, voix, scenes: [{ expr: 'neutre', ecran: { type: 'titre', titre: '' }, texte }] }));
        await lancer(job, pico, 'fabriquer.js', [json, '--voix', dossierVoix({ voix }), '--sortie', dir, '--court', '--controle'], 'ecoute-' + path.basename(dir), ['Écoute']);
        const nom = `pico-ecoute-${Date.now()}.m4a`, MEDIAS = path.join(BASE, 'medias');
        await new Promise((ok, ko) => require('child_process').execFile(FFMPEG, ['-y', '-v', 'error', '-i', path.join(dir, 'audio', 'v00.wav'), '-c:a', 'aac', '-b:a', '128k', path.join(MEDIAS, nom)], e => (e ? ko(e) : ok())));
        return { file: nom };
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    } finally { enCours.delete(place); } }));
  }
  // demande de fabrication (place déjà réservée : libérée à la fin de la tâche)
  async function demandeFabrication(req, res, place) {
    const b = await readJson(req); let fiche = b.fiche;
    if (typeof fiche === 'string') { try { fiche = JSON.parse(fiche); } catch (e) { throw new Error('La fiche n’est pas un texte JSON valide.'); } }
    if (!fiche || typeof fiche !== 'object' || Array.isArray(fiche)) throw new Error('Fiche manquante.');
    const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
    require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche); // fiche incomplète : refusée tout de suite, avant la tâche de fond
    const port = req.socket.localPort, o = b.options && typeof b.options === 'object' ? b.options : {};
    const choixVoix_ = modeVoix(o.voix);
    return send(res, 200, travail(async job => { try {
      // voix de l'épisode : Kokoro (voix de Pico, par défaut) ou une voix Piper de QuentMovie ; téléchargée une seule fois
      const v = require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche).long.voix || {}, PA = require('./parole');
      if (choixVoix_.mode !== 'pico') { /* ta voix : rien à télécharger pour Pico */ }
      else if (v.moteur === 'kokoro' || !v.moteur) { if (!PAROLE().etat().pico.installee) { job.step = 'Voix de Pico…'; await PAROLE().installer('pico', job); } }
      else { const pv = PA.VOIX.find(x => x.archive === (v.modele || 'vits-piper-fr_FR-upmc-medium')); if (pv && !PAROLE().etat().voix.find(x => x.id === pv.id).installee) await PAROLE().installer('voix:' + pv.id, job); }
      job.progress = 0; job.step = 'Préparation de l’épisode';
      job.port = port; return await fabriquer(job, fiche, { court: !!o.court, sansTiktok: !!o.sansTiktok, sansYoutube: !!o.sansYoutube, choixVoix: choixVoix_ });
    } finally { enCours.delete(place); } }));
  }
}

module.exports = { creer, NON, dossierPico, arreterTout };
