// Routes de l'épisode QuentInvest avec Pico, fabriqué dans QuentMovie : état (voix de Pico, programme de la chaîne), fabrication d'une fiche
// en tâche de fond (programme de la chaîne lancé avec les outils de QuentMovie : son Node, son FFmpeg, sa voix, ses fenêtres cachées pour les écrans),
// et navigateur des écrans (/api/navigateur, réservé à la fabrication par un jeton). `traiter` renvoie NON quand la requête n'est pas pour ce module.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const NON = Symbol('non traité');
const JETON = crypto.randomBytes(18).toString('hex'); // un par lancement de QuentMovie : seule la fabrication lancée par ce moteur le connaît

// dossier du programme de la chaîne : à côté de QuentMovie dans le dépôt, ou livré dans l'application (Resources/pico)
function dossierPico(opts = {}) {
  const l = [opts.picoDossier, process.env.QM_PICO, path.join(__dirname, '..', 'design', 'quentinvest-youtube'), process.resourcesPath && path.join(process.resourcesPath, 'pico')];
  return l.find(d => d && fs.existsSync(path.join(d, 'fabrication', 'episode.js'))) || null;
}
// dossier qui contient assets/fonts/inter.woff2 (police des écrans) : la racine du dépôt, ou le dossier pico de l'application
const racinePolices = pico => [path.join(pico, '..', '..'), pico].find(d => fs.existsSync(path.join(d, 'assets', 'fonts', 'inter.woff2'))) || pico;
// chemin d'un module livré avec QuentMovie (le programme de la chaîne ne les cherche pas tout seul quand il est dans l'application)
const module_ = n => { try { return path.dirname(require.resolve(n + '/package.json')).replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep); } catch (e) { return null; } };

function creer({ BASE, FFMPEG, opts, send, readJson, travail, PAROLE }) {
  const SORTIES = opts.sortiesPico || path.join(os.homedir(), 'Movies', 'QuentInvest');
  const nav = () => opts.navigateur || null;
  const entier = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v) || a));

  // une fabrication : episode.js du programme de la chaîne, dans un processus à part, avancement lu dans un petit fichier
  function fabriquer(job, fiche, o, port) {
    const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
    const { compose } = require(path.join(pico, 'fabrication', 'composer.js'));
    const C = compose(fiche); // erreur claire si la fiche est incomplète
    const dossier = path.join(SORTIES, C.base), fiches = path.join(SORTIES, 'fiches'), trav = path.join(SORTIES, '.travail');
    for (const d of [dossier, fiches, trav, path.join(SORTIES, 'medias'), path.join(SORTIES, 'episodes')]) fs.mkdirSync(d, { recursive: true });
    const fFiche = path.join(fiches, C.base + '.json'), fProg = path.join(trav, C.base + '-progres.json');
    fs.writeFileSync(fFiche, JSON.stringify(fiche, null, 1) + '\n'); fs.rmSync(fProg, { force: true });
    const sherpa = require('./parole').dossierSherpa(), pont = !!nav();
    const env = {
      ...process.env, QI_QM: __dirname, QI_RACINE: racinePolices(pico), QI_FFMPEG: FFMPEG, FFMPEG, QI_NODE: process.execPath,
      QI_EPISODES: path.join(SORTIES, 'episodes'), QI_MEDIAS: path.join(SORTIES, 'medias'), QI_PROGRES: fProg,
      QI_SONS: path.join(__dirname, 'bibliotheque', 'sons').replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep), // FFmpeg ne lit pas dans l'archive de l'application
      ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      ...(module_('sherpa-onnx-node') ? { SHERPA: module_('sherpa-onnx-node') } : {}),
      ...(sherpa ? { DYLD_LIBRARY_PATH: [sherpa, process.env.DYLD_LIBRARY_PATH].filter(Boolean).join(':'), LD_LIBRARY_PATH: [sherpa, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } : {}),
      // écrans : fenêtres cachées de QuentMovie (application Mac) ; sinon Playwright si présent (essais, ligne de commande)
      ...(pont ? { PW: path.join(__dirname, 'navigateur-pont.js'), QI_NAVIGATEUR: `http://127.0.0.1:${port}/api/navigateur`, QI_JETON: JETON } : module_('playwright-core') && !process.env.PW ? { PW: module_('playwright-core') } : {})
    };
    const args = [path.join(pico, 'fabrication', 'episode.js'), fFiche, '--sortie', dossier, '--modeles', path.join(BASE, 'modeles'),
      ...(o.court ? ['--court'] : []), ...(o.sansTiktok ? ['--sans-tiktok'] : []), ...(o.sansYoutube ? ['--sans-youtube'] : [])];
    return new Promise((ok, ko) => {
      const enfant = spawn(process.execPath, args, { env, stdio: ['ignore', 'pipe', 'pipe'] }); job.enfant = enfant;
      let sortie = '', erreurs = '', phase = 0; const phases = (o.sansTiktok || o.sansYoutube) ? 1 : 2;
      const lire = () => { let x; try { x = JSON.parse(fs.readFileSync(fProg, 'utf8')); } catch (e) { return; }
        const PART = { voix: [0, 0.12], ecrans: [0.12, 0.45], clips: [0.45, 0.6], export: [0.6, 1] };
        if (x.etape === 'phase') { job.step = x.t; if (/TikTok/.test(x.t) && !o.sansYoutube) phase = 1; if (/Miniatures|Texte/.test(x.t)) job.progress = 0.97; return; }
        const [a, b] = PART[x.etape] || [0, 0], r = x.etape === 'export' ? x.p : x.n ? x.i / x.n : 0;
        job.progress = Math.min(0.96, (phase + a + (b - a) * r) / phases);
        job.step = `${phases > 1 ? (phase ? 'TikTok · ' : 'YouTube · ') : ''}${{ voix: 'voix', ecrans: 'écrans animés', clips: 'répliques', export: 'montage' }[x.etape] || ''}${x.n ? ` ${x.i}/${x.n}` : x.step ? ' · ' + x.step : ''}`;
      };
      const minuteur = setInterval(lire, 700);
      enfant.stdout.on('data', d => { sortie += d; });
      enfant.stderr.on('data', d => { erreurs = (erreurs + d).slice(-20000); });
      enfant.on('error', e => { clearInterval(minuteur); ko(e); });
      enfant.on('close', code => {
        clearInterval(minuteur); fs.rmSync(fProg, { force: true });
        if (job.annule) return ko(new Error('Fabrication annulée.'));
        const lignes = sortie.replace(/\r/g, '\n').split('\n');
        const avertissements = lignes.filter(l => /^⚠/.test(l)).map(l => l.replace(/^⚠\s*/, '')).slice(0, 30);
        if (code !== 0) {
          // le message utile est écrit avant la pile d'appels de Node (« …episode.js:44 ») : on garde ses dernières lignes
          const l = erreurs.split('\n'), fin = l.findIndex(x => /fabrication[\\/]\w+\.js:\d+$/.test(x.trim()));
          const msg = (fin > 0 ? l.slice(0, fin) : l).filter(x => x.trim() && !/csrc|^\s+at |^Node\.js v/.test(x)).slice(-3).join(' ').trim() || 'Fabrication échouée';
          return ko(new Error(/trop courte/.test(msg) ? msg : 'Fabrication échouée : ' + msg.slice(0, 400)));
        }
        const fichiers = fs.readdirSync(dossier).filter(n => /\.(mp4|png|md|zip)$/.test(n));
        ok({ base: C.base, titre: fiche.titre || C.base, dossier, fichier: fFiche, fichiers, avertissements, controle: lignes.filter(l => /^\s+.* · /.test(l)).map(l => l.trim()).slice(0, 30) });
      });
    });
  }

  return async function traiter(req, res, p, url) {
    // navigateur des écrans (fenêtres cachées de l'application), appelé par navigateur-pont.js pendant la fabrication
    if (p.startsWith('/api/navigateur/')) {
      if (req.method !== 'POST' || req.headers['x-jeton'] !== JETON) return send(res, 403, { error: 'Accès refusé' });
      const N = nav(); if (!N) throw new Error('Navigateur des écrans indisponible');
      const b = await readJson(req), a = p.slice(16);
      let r = null;
      if (a === 'ouvrir') r = await N.ouvrir(entier(b.largeur, 64, 4096), entier(b.hauteur, 64, 4096));
      else if (a === 'contenu') await N.contenu(b.id, String(b.html || ''));
      else if (a === 'evaluer') r = await N.evaluer(b.id, String(b.code || ''));
      else if (a === 'capture') { const c = String(b.chemin || ''); if (!path.isAbsolute(c) || !/\.png$/i.test(c)) throw new Error('Image d’écran invalide'); fs.mkdirSync(path.dirname(c), { recursive: true }); await N.capture(b.id, c, !!b.transparent); }
      else if (a === 'fermer') await N.fermer(b.id);
      else return send(res, 404, { error: 'Introuvable' });
      return send(res, 200, { resultat: r === undefined ? null : r });
    }
    if (!p.startsWith('/api/pico')) return NON;
    if (req.method === 'GET' && p === '/api/pico') {
      const pico = dossierPico(opts), e = PAROLE().etat();
      return send(res, 200, { pret: !!pico, dispo: e.dispo, voix: e.pico, navigateur: !!nav() || !!module_('playwright-core'), sorties: SORTIES });
    }
    if (req.method === 'POST' && p === '/api/pico/fabriquer') {
      const b = await readJson(req); let fiche = b.fiche;
      if (typeof fiche === 'string') { try { fiche = JSON.parse(fiche); } catch (e) { throw new Error('La fiche n’est pas un texte JSON valide.'); } }
      if (!fiche || typeof fiche !== 'object' || Array.isArray(fiche)) throw new Error('Fiche manquante.');
      const pico = dossierPico(opts); if (!pico) throw new Error('Programme de la chaîne QuentInvest introuvable dans cette installation.');
      require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche); // fiche incomplète : refusée tout de suite, avant la tâche de fond
      const port = req.socket.localPort, o = b.options && typeof b.options === 'object' ? b.options : {};
      return send(res, 200, travail(async job => {
        // voix de l'épisode : Kokoro (voix de Pico, par défaut) ou une voix Piper de QuentMovie ; téléchargée une seule fois
        const v = require(path.join(pico, 'fabrication', 'composer.js')).compose(fiche).long.voix || {}, PA = require('./parole');
        if (v.moteur === 'kokoro' || !v.moteur) { if (!PAROLE().etat().pico.installee) { job.step = 'Voix de Pico…'; await PAROLE().installer('pico', job); } }
        else { const pv = PA.VOIX.find(x => x.archive === (v.modele || 'vits-piper-fr_FR-upmc-medium')); if (pv && !PAROLE().etat().voix.find(x => x.id === pv.id).installee) await PAROLE().installer('voix:' + pv.id, job); }
        job.progress = 0; job.step = 'Préparation de l’épisode';
        return fabriquer(job, fiche, { court: !!o.court, sansTiktok: !!o.sansTiktok, sansYoutube: !!o.sansYoutube }, port);
      }));
    }
    return NON;
  };
}

module.exports = { creer, NON, dossierPico };
