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

function creer(base) {
  const dossier = path.join(base, 'voix-clone'), essais = path.join(dossier, 'essais'), voix = path.join(base, 'ma-voix');
  const pythonLocal = () => process.env.QM_PYTHON || path.join(dossier, 'python', 'bin', 'python3');
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
      python: fs.existsSync(pythonLocal()),
      fichiers, rapports,
      arch: process.platform === 'darwin' ? process.arch : 'autre'
    };
  }

  const ecrire = t => { try { fs.mkdirSync(dossier, { recursive: true }); fs.appendFileSync(journal, t); } catch (e) { /* journal facultatif */ } };

  // Lance un programme, retransmet ses lignes (la dernière devient l'étape affichée) et attend sa fin
  function lancer(job, cmd, args, { env = {}, cwd, etape } = {}) {
    return new Promise((ok, ko) => {
      ecrire(`\n$ ${cmd} ${args.join(' ')}\n`);
      const p = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONUNBUFFERED: '1', PIP_DISABLE_PIP_VERSION_CHECK: '1', ...env } });
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
      p.on('error', er => ko(new Error(`Programme introuvable : ${cmd} (${er.message})`)));
      p.on('close', code => { job.enfant = null; if (job.annule) return ko(new Error('Essai annulé')); code === 0 ? ok() : ko(new Error(erreurLue || `${path.basename(cmd)} s’est arrêté (code ${code})${derniere ? ' : ' + derniere.slice(0, 200) : ''}`)); });
    });
  }

  // Python autonome (build indépendant, sans toucher au Python du Mac)
  async function preparerPython(job) {
    if (fs.existsSync(pythonLocal())) return;
    if (process.platform !== 'darwin') throw new Error('Le Python autonome n’est prévu que pour le Mac : définis QM_PYTHON pour utiliser un autre Python.');
    fs.mkdirSync(dossier, { recursive: true });
    job.step = 'Recherche de Python…';
    const sortie = await requete(PYTHON_RELEASES, { quoi: 'de Python' });
    const re = new RegExp(`^cpython-3\\.11\\.\\d+\\+\\d+-${ARCH}-apple-darwin-install_only\\.tar\\.gz$`);
    const actif = (sortie.assets || []).find(a => re.test(a.name));
    if (!actif) throw new Error('Python 3.11 pour ce Mac introuvable dans la dernière version publiée');
    const archive = path.join(dossier, 'python.tar.gz');
    await requete(actif.browser_download_url, { dest: archive, quoi: 'de Python', onProgress: (r, t) => { if (t) { job.progress = 0.02 + 0.06 * r / t; job.step = `Téléchargement de Python… ${Math.round(100 * r / t)} %`; } } });
    job.step = 'Installation de Python…';
    await new Promise((ok, ko) => execFile('tar', ['-xzf', archive, '-C', dossier], e => (e ? ko(new Error('Décompression de Python impossible : ' + e.message)) : ok())));
    fs.rmSync(archive, { force: true });
    if (!fs.existsSync(pythonLocal())) throw new Error('Archive Python inattendue');
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
    await preparerPython(job);
    const parts = liste.map((_, i) => [0.1 + 0.8 * i / liste.length, 0.1 + 0.8 * (i + 0.5) / liste.length]);
    const echecs = [];
    for (let i = 0; i < liste.length; i++) {
      const m = liste[i];
      try {
        await installer(m, job, parts[i]);
        job.progress = 0.1 + 0.8 * (i + 0.5) / liste.length;
        await lancer(job, pyVenv(m), [path.join(__dirname, 'voix-clone', 'essai.py'), '--moteur', m, '--voix', voix, '--sortie', essais], { etape: MOTEURS[m].nom });
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

  function annuler(job) { job.annule = true; if (job.enfant) { try { job.enfant.kill('SIGTERM'); } catch (e) { /* déjà arrêté */ } } }

  function fichier(nom) { // un seul niveau, noms connus : l'interface lit les essais par cette route
    const n = path.basename(String(nom || ''));
    if (!/^(reel|chatterbox-\d+|qwen-\d+)\.wav$/.test(n)) return null;
    const f = path.join(essais, n); return fs.existsSync(f) ? f : null;
  }

  return { etat, essai, annuler, fichier, dossier, essais, MOTEURS };
}

module.exports = { creer, MOTEURS };
