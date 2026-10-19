// Voix clonée (essai) : prépare un Python autonome et un environnement par modèle (Chatterbox multilingue, Qwen3-TTS), puis fait dire
// quelques phrases par chaque modèle à partir des enregistrements du Doublage (voix-clone/essai.py). Tout reste dans ~/Movies/QuentMovie/voix-clone.
// Rien n'est installé tant que l'utilisateur ne lance pas l'essai ; la première fois, plusieurs Go sont téléchargés.
'use strict';
const fs = require('fs'), path = require('path'), { spawn, execFile } = require('child_process');
const { requete } = require('./maj');

const MOTEURS = {
  chatterbox: { nom: 'Chatterbox (multilingue)', paquets: ['chatterbox-tts'], go: 4 },
  qwen: { nom: 'Qwen3-TTS', paquets: ['qwen-tts', 'soundfile'], go: 4 }
};
const PYTHON_RELEASES = 'https://api.github.com/repos/astral-sh/python-build-standalone/releases/latest';
const ARCH = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
// Python ne lit pas dans l'archive de l'application : le script est livré à côté, dans app.asar.unpacked (asarUnpack de package.json)
const ESSAI = path.join(__dirname, 'voix-clone', 'essai.py').replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep);

// Processus lancés dans leur propre groupe (spawn detached) : les arrêter arrête aussi ce qu'ils ont lancé (pip, fabriquer.js, FFmpeg…).
// kill() envoie le signal à tout le groupe, puis SIGKILL 5 s plus tard à ce qui reste ; arreterTout() sert à la fermeture de QuentMovie.
const groupes = new Set();
const vivant = pid => { try { process.kill(-pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function enGroupe(p) {
  if (!p.pid) return p;
  const kill = p.kill.bind(p); groupes.add(p);
  p.kill = (sig = 'SIGTERM') => {
    try { process.kill(-p.pid, sig); } catch (e) { try { kill(sig); } catch (e2) { /* déjà fini */ } }
    if (sig !== 'SIGKILL') setTimeout(() => { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { /* groupe fini */ } }, 5000).unref();
    return true;
  };
  return p;
}
// après la fin de l'enfant : ce qui reste de son groupe est arrêté, et on attend que tout soit fini (6 s au plus)
async function finGroupe(p) {
  if (p.pid && vivant(p.pid)) {
    try { process.kill(-p.pid, 'SIGTERM'); } catch (e) { /* fini entre-temps */ }
    for (let i = 0; i < 60 && vivant(p.pid); i++) { if (i === 50) { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { /* fini */ } } await new Promise(r => setTimeout(r, 100)); }
  }
  groupes.delete(p);
}
function arreterTout() { for (const p of groupes) { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { /* déjà fini */ } } groupes.clear(); }

function creer(base) {
  const dossier = path.join(base, 'voix-clone'), essais = path.join(dossier, 'essais'), voix = path.join(base, 'ma-voix');
  const pythonLocal = () => process.env.QM_PYTHON || path.join(dossier, 'python', 'bin', 'python3');
  // Python installé jusqu'au bout (fichier .complet écrit après l'extraction) ; QM_PYTHON : Python fourni (essais)
  const pythonPret = () => fs.existsSync(pythonLocal()) && (!!process.env.QM_PYTHON || fs.existsSync(path.join(dossier, 'python', '.complet')));
  const venv = m => path.join(dossier, 'venv-' + m);
  const pyVenv = m => path.join(venv(m), 'bin', 'python');
  const marque = m => path.join(venv(m), '.complet');
  const journal = path.join(dossier, 'journal.txt');

  function etat() {
    let fichiers = [], rapports = [];
    try { fichiers = fs.readdirSync(essais).filter(f => /^(reel|chatterbox-\d+|qwen-\d+)\.wav$/.test(f)).sort(); } catch (e) { /* aucun essai */ }
    for (const m of Object.keys(MOTEURS)) { try { rapports.push(...JSON.parse(fs.readFileSync(path.join(essais, `rapport-${m}.json`), 'utf8'))); } catch (e) { /* pas de rapport */ } }
    return {
      dossier, essais, journal,
      moteurs: Object.entries(MOTEURS).map(([id, m]) => ({ id, nom: m.nom, go: m.go, installe: fs.existsSync(marque(id)) })),
      python: pythonPret(),
      fichiers, rapports, libre: espaceLibre(),
      arch: process.platform === 'darwin' ? process.arch : 'autre'
    };
  }

  // Espace libre sur le disque (Go) ; null si le système ne le dit pas
  function espaceLibre() { try { fs.mkdirSync(dossier, { recursive: true }); const st = fs.statfsSync(dossier); return +(st.bavail * st.bsize / 1e9).toFixed(1); } catch (e) { return null; } }
  const journalFin = (n = 60) => { try { return fs.readFileSync(journal, 'utf8').split('\n').slice(-n).join('\n'); } catch (e) { return ''; } };

  const ecrire = t => { try { fs.mkdirSync(dossier, { recursive: true }); fs.appendFileSync(journal, t); } catch (e) { /* journal facultatif */ } };

  // Lance un programme, retransmet ses lignes (la dernière devient l'étape affichée) et attend sa fin
  function lancer(job, cmd, args, { env = {}, cwd, etape } = {}) {
    return new Promise((ok, ko) => {
      if (job.annule) return ko(new Error('Essai annulé'));
      ecrire(`\n$ ${cmd} ${args.join(' ')}\n`);
      const p = enGroupe(spawn(cmd, args, { cwd, detached: true, env: { ...process.env, PYTHONUNBUFFERED: '1', PIP_DISABLE_PIP_VERSION_CHECK: '1', ...env } }));
      job.enfant = p;
      let derniere = '', erreurLue = '', tampon = '';
      const lire = d => {
        const t = d.toString(); ecrire(t); tampon += t;
        const lignes = tampon.split(/\r?\n|\r/); tampon = lignes.pop();
        for (const l of lignes) {
          const x = l.trim(); if (!x) continue;
          const m = /^ETAPE : (.+)$/.exec(x), e = /^ERREUR : (.+)$/.exec(x);
          if (m) job.step = m[1]; else if (e) erreurLue = e[1]; else if (etape) job.step = etape + ' — ' + x.slice(0, 90);
          derniere = x;
        }
      };
      p.stdout.on('data', lire); p.stderr.on('data', lire);
      p.on('error', er => { groupes.delete(p); ko(new Error(`Programme introuvable : ${cmd} (${er.message})`)); });
      p.on('close', async code => { await finGroupe(p); if (job.enfant === p) job.enfant = null; if (job.annule) return ko(new Error('Essai annulé')); code === 0 ? ok() : ko(new Error(erreurLue || `${path.basename(cmd)} s’est arrêté (code ${code})${derniere ? ' : ' + derniere.slice(0, 200) : ''}`)); });
    });
  }

  // Python autonome (build indépendant, sans toucher au Python du Mac)
  async function preparerPython(job) {
    if (pythonPret()) return;
    if (process.platform !== 'darwin') throw new Error('Le Python autonome n’est prévu que pour le Mac : définis QM_PYTHON pour utiliser un autre Python.');
    fs.mkdirSync(dossier, { recursive: true });
    job.step = 'Recherche de Python…';
    const sortie = await requete(PYTHON_RELEASES, { quoi: 'de Python' });
    const re = new RegExp(`^cpython-3\\.11\\.\\d+\\+\\d+-${ARCH}-apple-darwin-install_only\\.tar\\.gz$`);
    const actif = (sortie.assets || []).find(a => re.test(a.name));
    if (!actif) throw new Error('Python 3.11 pour ce Mac introuvable dans la dernière version publiée');
    const archive = path.join(dossier, 'python.tar.gz'), tmp = path.join(dossier, 'python-extraction'), final = path.join(dossier, 'python');
    const r = await requete(actif.browser_download_url, { dest: archive, quoi: 'de Python', onProgress: (r, t) => { if (t) { job.progress = 0.02 + 0.06 * r / t; job.step = `Téléchargement de Python… ${Math.round(100 * r / t)} %`; } } });
    const attendu = /^sha256:([0-9a-f]{64})$/.exec(actif.digest || '');
    if ((attendu && r.sha256 !== attendu[1]) || (actif.size && r.taille !== actif.size)) { fs.rmSync(archive, { force: true }); throw new Error('Archive Python abîmée (empreinte différente) : relance l’essai.'); }
    job.step = 'Installation de Python…';
    // extraction à part puis renommage : une installation interrompue n'est jamais prise pour une installation finie
    fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });
    try {
      await new Promise((ok, ko) => execFile('tar', ['-xzf', archive, '-C', tmp], e => (e ? ko(new Error('Décompression de Python impossible : ' + e.message)) : ok())));
      if (!fs.existsSync(path.join(tmp, 'python', 'bin', 'python3'))) throw new Error('Archive Python inattendue');
      fs.rmSync(final, { recursive: true, force: true }); fs.renameSync(path.join(tmp, 'python'), final);
      fs.writeFileSync(path.join(final, '.complet'), new Date().toISOString());
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(archive, { force: true }); }
  }

  async function installer(m, job, part) {
    if (fs.existsSync(marque(m))) return;
    const [a, b] = part, avance = x => { job.progress = a + (b - a) * x; };
    fs.rmSync(venv(m), { recursive: true, force: true });
    job.step = `${MOTEURS[m].nom} : préparation…`; avance(0.02);
    await lancer(job, pythonLocal(), ['-m', 'venv', venv(m)], { etape: MOTEURS[m].nom });
    job.step = `${MOTEURS[m].nom} : installation (plusieurs minutes, ${MOTEURS[m].go} Go)…`; avance(0.1);
    await lancer(job, pyVenv(m), ['-m', 'pip', 'install', '--upgrade', 'pip'], { etape: MOTEURS[m].nom + ' : installation' });
    await lancer(job, pyVenv(m), ['-m', 'pip', 'install', ...MOTEURS[m].paquets], { etape: MOTEURS[m].nom + ' : installation' });
    fs.writeFileSync(marque(m), new Date().toISOString()); avance(1);
  }

  // moteurs : liste d'identifiants ; l'essai écrit dans essais/ (reel.wav, <moteur>-N.wav, rapport-<moteur>.json)
  async function essai(moteurs, job) {
    const liste = (moteurs && moteurs.length ? moteurs : Object.keys(MOTEURS)).filter(m => MOTEURS[m]);
    if (!liste.length) throw new Error('Aucun modèle choisi');
    fs.mkdirSync(essais, { recursive: true });
    // un téléchargement de plusieurs Go qui échoue au milieu laisse un environnement à moitié installé : on vérifie la place avant
    const besoin = liste.filter(m => !fs.existsSync(marque(m))).reduce((t, m) => t + MOTEURS[m].go * 2, pythonPret() ? 0 : 1), libre = espaceLibre(), mini = process.env.QM_VC_ESPACE_MIN != null ? +process.env.QM_VC_ESPACE_MIN : besoin; // QM_VC_ESPACE_MIN : seuil forcé (essais)
    if (libre != null && besoin > 0 && libre < mini) throw new Error(`Espace disque insuffisant : ${libre} Go libres, environ ${mini} Go nécessaires pour l’installation. Libère de la place puis relance l’essai.`);
    await preparerPython(job);
    const parts = liste.map((_, i) => [0.1 + 0.8 * i / liste.length, 0.1 + 0.8 * (i + 0.5) / liste.length]);
    const echecs = [];
    for (let i = 0; i < liste.length; i++) {
      const m = liste[i];
      try {
        await installer(m, job, parts[i]);
        job.progress = 0.1 + 0.8 * (i + 0.5) / liste.length;
        await lancer(job, pyVenv(m), [ESSAI, '--moteur', m, '--voix', voix, '--sortie', essais], { etape: MOTEURS[m].nom });
        job.progress = 0.1 + 0.8 * (i + 1) / liste.length;
      } catch (e) {
        if (job.annule) throw e;
        if (/Pas (encore de voix|assez de voix)/.test(e.message)) throw e; // inutile d'essayer l'autre modèle sans voix
        echecs.push(`${MOTEURS[m].nom} : ${e.message}`);
      }
    }
    const r = etat();
    if (!r.fichiers.some(f => f !== 'reel.wav')) throw new Error(echecs.join(' | ') || 'Aucun fichier produit');
    return { ...r, echecs };
  }

  // répliques d'un épisode dites avec la voix clonée : lignes [{ texte, fichier }] ; une réplique déjà dite avec le même texte est gardée (fichier .txt à côté)
  async function dire(moteur, lignes, job) {
    if (!MOTEURS[moteur]) throw new Error('Modèle de voix clonée inconnu');
    const aFaire = lignes.filter(x => { try { return fs.readFileSync(x.fichier + '.txt', 'utf8') !== x.texte || !fs.existsSync(x.fichier); } catch (e) { return true; } });
    if (!aFaire.length) return { faites: 0 };
    const libre = espaceLibre();
    if (!fs.existsSync(marque(moteur)) && libre != null && libre < MOTEURS[moteur].go * 2 + 2) throw new Error(`Espace disque insuffisant pour installer ta voix clonée : ${libre} Go libres, environ ${MOTEURS[moteur].go * 2 + 2} Go nécessaires.`);
    await preparerPython(job); await installer(moteur, job, [0.02, 0.2]);
    const liste = path.join(dossier, `lot-${process.pid}-${Date.now()}.json`); fs.mkdirSync(dossier, { recursive: true });
    fs.writeFileSync(liste, JSON.stringify(aFaire.map(x => ({ texte: x.texte, fichier: x.fichier }))));
    try { await lancer(job, pyVenv(moteur), [ESSAI, '--moteur', moteur, '--voix', voix, '--sortie', path.join(dossier, 'reference'), '--lot', liste], { etape: 'Ta voix' }); }
    finally { fs.rmSync(liste, { force: true }); }
    for (const x of aFaire) { if (!fs.existsSync(x.fichier)) throw new Error('Réplique non dite par la voix clonée : ' + path.basename(x.fichier)); fs.writeFileSync(x.fichier + '.txt', x.texte); }
    return { faites: aFaire.length };
  }
  const prete = () => Object.keys(MOTEURS).filter(m => fs.existsSync(marque(m))); // modèles déjà installés (l'essai a été fait)

  function annuler(job) { job.annule = true; if (job.enfant) { try { job.enfant.kill('SIGTERM'); } catch (e) { /* déjà arrêté */ } } }

  function fichier(nom) { // un seul niveau, noms connus : l'interface lit les essais par cette route
    const n = path.basename(String(nom || ''));
    if (!/^(reel|chatterbox-\d+|qwen-\d+)\.wav$/.test(n)) return null;
    const f = path.join(essais, n); return fs.existsSync(f) ? f : null;
  }

  return { etat, essai, dire, prete, annuler, fichier, journalFin, dossier, essais, MOTEURS };
}

module.exports = { creer, MOTEURS, enGroupe, finGroupe, arreterTout };
