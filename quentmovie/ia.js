// QuentMovie : IA locale du générateur (Qwen3 4B Instruct, licence Apache 2.0, ~2,5 Go téléchargés une fois)
// et téléchargement de vidéos depuis un lien (yt-dlp, installé au premier usage).
'use strict';
const fs = require('fs');
const path = require('path');
const { fork, spawn, execFile } = require('child_process');
const { requete } = require('./maj');

const MODELE = { fichier: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf', url: 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf', mo: 2500 };
const STYLES = {
  documentaire: 'un documentaire posé et clair, comme un reportage télévisé',
  dynamique: 'une vidéo courte et rythmée pour TikTok ou Reels : phrases courtes, ton vivant, une accroche forte au début',
  enfants: 'une vidéo pour enfants de 8 à 12 ans : mots simples, ton chaleureux',
  histoire: 'un récit captivant qui raconte l’histoire dans l’ordre, avec du suspense'
};
const SCHEMA = { type: 'object', properties: { titre: { type: 'string' }, scenes: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, texte: { type: 'string' } }, required: ['section', 'texte'] } } }, required: ['titre', 'scenes'] };

function creer({ BASE, FFMPEG }) {
  const MODELES = path.join(BASE, 'modeles'), OUTILS = path.join(BASE, 'outils');
  const cheminModele = path.join(MODELES, MODELE.fichier);
  let proc = null, attente = new Map(), num = 0, installation = null;

  function processus() {
    if (proc) return proc;
    proc = fork(path.join(__dirname, 'ia-worker.js'), [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let err = ''; proc.stderr.on('data', d => { err = (err + d).slice(-2000); });
    proc.on('message', m => { const a = attente.get(m.id); if (!a) return; attente.delete(m.id); m.ok ? a.ok(m) : a.ko(new Error(m.erreur)); });
    proc.on('exit', code => { for (const a of attente.values()) a.ko(new Error('L’IA locale s’est arrêtée' + (err ? ' : ' + err.trim().split('\n').pop() : ` (code ${code})`))); attente = new Map(); proc = null; });
    return proc;
  }
  const demander = msg => new Promise((ok, ko) => { const id = ++num; attente.set(id, { ok, ko }); processus().send({ id, ...msg }); });
  const installe = () => fs.existsSync(cheminModele);
  const etat = () => ({ installee: installe(), mo: MODELE.mo, styles: Object.keys(STYLES) });

  function installer(job) {
    if (installe()) return Promise.resolve();
    if (installation) return installation;
    installation = (async () => {
      fs.mkdirSync(MODELES, { recursive: true });
      if (job) job.step = `Téléchargement de l’IA locale (≈ ${(MODELE.mo / 1000).toFixed(1)} Go, une seule fois)…`;
      const part = cheminModele + '.part';
      const r = await requete(MODELE.url, { dest: part, quoi: 'de modèles', onProgress: (a, t) => { if (job && t) job.progress = a / t * 0.97; } });
      if (r.taille < 5e8) { fs.rmSync(part, { force: true }); throw new Error('Téléchargement de l’IA incomplet'); }
      fs.renameSync(part, cheminModele);
    })().finally(() => { installation = null; });
    return installation;
  }

  // Faits (phrases de Wikipédia) → script de vidéo : scènes { section, texte }, sans fait ajouté
  async function ecrireScript({ titre, faits, duree, style }, job) {
    if (!installe()) await installer(job);
    if (job) job.step = 'L’IA locale écrit le script…';
    const mots = Math.round(Math.max(20, duree) * 2.6), n = Math.max(3, Math.round(duree / 9));
    const systeme = 'Tu es scénariste de vidéos en français. Règle absolue : tu n’utilises QUE les faits fournis, sans rien ajouter, sans chiffre, date, nom ni anecdote qui n’y figure pas. ' +
      'Tu écris pour être lu à voix haute : phrases naturelles, pas de listes, pas d’émojis, pas de parenthèses, nombres écrits comme on les dit.';
    const demande = `Sujet : ${titre}\nStyle : ${STYLES[style] || STYLES.documentaire}.\nLongueur : environ ${mots} mots en tout, répartis en ${n} scènes (une idée et une image par scène).\n` +
      `Chaque scène contient 2 ou 3 phrases complètes (sujet et verbe), environ ${Math.round(mots / n)} mots : jamais de style télégraphique du genre « 1889 : deux frères… ».\n` +
      `Commence par une accroche qui donne envie de regarder et termine par une phrase de conclusion. Pour chaque scène, donne un titre de partie très court (2 à 4 mots) dans « section ».\n` +
      `Propose aussi un titre de vidéo accrocheur de 6 mots maximum, sans chiffre ni durée, dans « titre ».\n\nFAITS (seule source autorisée) :\n${String(faits).slice(0, 9000)}`;
    const r = await demander({ type: 'ecrire', modele: cheminModele, systeme, demande, schema: SCHEMA, maxTokens: Math.min(4000, mots * 3 + 400) });
    const res = r.resultat || {};
    return { titre: String(res.titre || titre).slice(0, 80), gpu: r.gpu, scenes: (res.scenes || []).map(s => ({ section: String(s.section || '').slice(0, 40), texte: String(s.texte || '').trim() })).filter(s => s.texte.length > 10) };
  }

  // ---------- Téléchargement depuis un lien (YouTube, TikTok, Instagram, Facebook, X…) ----------
  const YTDLP = path.join(OUTILS, process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp_linux');
  async function outilTelechargement(job) {
    if (fs.existsSync(YTDLP)) return;
    fs.mkdirSync(OUTILS, { recursive: true });
    if (job) job.step = 'Installation de l’outil de téléchargement (une seule fois)…';
    await requete(`https://github.com/yt-dlp/yt-dlp/releases/latest/download/${path.basename(YTDLP)}`, { dest: YTDLP + '.part', quoi: 'd’outils' });
    fs.chmodSync(YTDLP + '.part', 0o755); fs.renameSync(YTDLP + '.part', YTDLP);
    if (process.platform === 'darwin') await new Promise(ok => execFile('xattr', ['-d', 'com.apple.quarantine', YTDLP], () => ok()));
  }
  async function telecharger(lien, dossier, job) {
    if (!/^https?:\/\/\S+$/i.test(String(lien || '').trim())) throw new Error('Colle un lien qui commence par https://');
    await outilTelechargement(job);
    // mise à jour silencieuse de l'outil au plus une fois par semaine (les sites changent souvent)
    try { if (Date.now() - fs.statSync(YTDLP).mtimeMs > 7 * 864e5) await new Promise(ok => execFile(YTDLP, ['-U'], () => { fs.utimesSync(YTDLP, new Date(), new Date()); ok(); })); } catch (e) { /* on garde la version installée */ }
    job.step = 'Téléchargement de la vidéo…';
    const args = ['--no-playlist', '--newline', '--no-mtime', '--restrict-filenames', '-f', 'bv*[vcodec^=avc1][height<=2160]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b', '--merge-output-format', 'mp4',
      '--ffmpeg-location', FFMPEG, '-o', path.join(dossier, 'lien-%(title).60s-%(id)s.%(ext)s'), '--print', 'after_move:filepath', lien.trim()];
    return new Promise((ok, ko) => {
      const p = spawn(YTDLP, args); let sortie = '', err = '';
      p.stdout.on('data', d => { const t = String(d); sortie += t; const m = [...t.matchAll(/\[download\]\s+([\d.]+)%/g)].pop(); if (m) job.progress = Math.min(0.98, +m[1] / 100); });
      p.stderr.on('data', d => { err = (err + d).slice(-3000); });
      p.on('error', e => ko(e));
      p.on('close', code => {
        const f = sortie.split('\n').map(x => x.trim()).filter(x => x.startsWith('/') || /^[A-Z]:\\/.test(x)).pop();
        if (code === 0 && f && fs.existsSync(f)) return ok({ file: path.basename(f) });
        const e = (err.split('\n').filter(l => /ERROR/.test(l)).pop() || err.trim().split('\n').pop() || '').replace(/^ERROR:\s*/, '');
        ko(new Error(/login|cookies|private|sign in/i.test(e) ? 'Cette vidéo est privée ou demande une connexion : elle ne peut pas être téléchargée.' : `Téléchargement impossible : ${e.slice(0, 200)}`));
      });
    });
  }

  const arreter = () => { if (proc) proc.kill(); };
  return { etat, installer, ecrireScript, telecharger, arreter };
}

module.exports = { creer, STYLES, MODELE };
