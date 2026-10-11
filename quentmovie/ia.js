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
  dynamique: 'une vidéo pour TikTok ou Reels : ton vivant et direct, phrases complètes et naturelles, une accroche forte au début',
  enfants: 'une vidéo pour enfants de 8 à 12 ans : mots simples, ton chaleureux',
  histoire: 'un récit captivant qui raconte l’histoire dans l’ordre, avec du suspense'
};
const SCHEMA_REFORMULER = { type: 'object', properties: { titre: { type: 'string' }, accroche: { type: 'string' }, conclusion: { type: 'string' }, scenes: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, texte: { type: 'string' }, recherche: { type: 'string' } }, required: ['section', 'texte', 'recherche'] } } }, required: ['titre', 'accroche', 'conclusion', 'scenes'] };
const annees = t => new Set(String(t).match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || []);
const nbMots = t => String(t).split(/\s+/).filter(Boolean).length;
const SCHEMA = { type: 'object', properties: { titre: { type: 'string' }, scenes: { type: 'array', items: { type: 'object', properties: { section: { type: 'string' }, texte: { type: 'string' }, recherche: { type: 'string' } }, required: ['section', 'texte', 'recherche'] } } }, required: ['titre', 'scenes'] };

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

  const REGLES = 'Tu écris pour être lu à voix haute : phrases complètes et naturelles (sujet, verbe, complément), pas de style télégraphique, pas de listes, pas d’émojis, pas de parenthèses.';
  const RECHERCHE = 'Dans « recherche », 2 ou 3 mots EN ANGLAIS pour trouver une photo de la scène (ex. « bicycle tire », « old factory »).';
  // Avec un article : chaque paragraphe (faits de Wikipédia) est reformulé un par un, sans rien ajouter ; sinon sujet libre.
  async function ecrireScript({ titre, paragraphes = [], duree, style, consigne = '' }, job) {
    if (!installe()) await installer(job);
    if (job) job.step = 'L’IA locale écrit le script…';
    const ton = STYLES[style] || STYLES.documentaire, dem = consigne ? `\nDemande de l’utilisateur : ${String(consigne).slice(0, 600)}` : '';
    if (paragraphes.length) {
      const systeme = 'Tu es scénariste de vidéos en français. Tu reformules des paragraphes pour la voix off, sans jamais ajouter de fait, de chiffre, de date ni de nom. ' + REGLES;
      const demande = `Sujet : ${titre}\nTon : ${ton}.${dem}\nReformule chacun des ${paragraphes.length} paragraphes ci-dessous en une scène (même ordre, même nombre), en gardant TOUS ses faits et rien d’autre, avec un nombre de mots proche de l’original. ` +
        `Donne aussi : « accroche » (une phrase qui donne envie de regarder, sans fait nouveau), « conclusion » (une phrase de fin), « titre » (6 mots maximum, sans chiffre), et pour chaque scène un titre de partie de 2 à 4 mots dans « section ». ${RECHERCHE}\n\n` +
        paragraphes.map((p, i) => `PARAGRAPHE ${i + 1} : ${p.texte}`).join('\n');
      const r = await demander({ type: 'ecrire', modele: cheminModele, systeme, demande, schema: SCHEMA_REFORMULER, maxTokens: 4000, temperature: 0.35 });
      const res = r.resultat || {}, sortie = res.scenes || [];
      // garde-fou : une scène qui invente une date ou perd trop de texte reprend le paragraphe d'origine
      const scenes = paragraphes.map((p, i) => {
        const x = sortie[i] || {}, t = String(x.texte || '').trim(), ok = t && nbMots(t) >= nbMots(p.texte) * 0.5 && [...annees(t)].every(a => annees(p.texte).has(a));
        return { section: String(x.section || p.section || '').slice(0, 40), texte: ok ? t : p.texte, recherche: String(x.recherche || '').slice(0, 80), repris: !ok };
      });
      const propre = v => { const t = String(v || '').trim(); return t && !annees(t).size && nbMots(t) <= 30 ? t : ''; };
      if (propre(res.accroche)) scenes[0].texte = propre(res.accroche) + ' ' + scenes[0].texte;
      if (propre(res.conclusion)) scenes[scenes.length - 1].texte += ' ' + propre(res.conclusion);
      return { titre: String(res.titre || titre).replace(/\d+/g, '').trim().slice(0, 80) || titre, gpu: r.gpu, scenes, repris: scenes.filter(x => x.repris).length };
    }
    const mots = Math.round(Math.max(20, duree) * 2.6), n = Math.max(3, Math.round(duree / 9));
    const systeme = 'Tu es scénariste de vidéos en français. Tu écris à partir de connaissances générales sûres : aucun chiffre, date, prix, citation ni nom propre dont tu n’es pas certain ; jamais de promesse ni d’avis médical, juridique ou financier. ' + REGLES;
    const demande = `Sujet : ${titre}\nTon : ${ton}.${dem}\nÉcris ${n} scènes d’environ ${Math.round(mots / n)} mots chacune (2 ou 3 phrases complètes), en commençant par une accroche et en finissant par une conclusion. ` +
      `Pour chaque scène, un titre de partie de 2 à 4 mots dans « section ». ${RECHERCHE} Donne aussi un titre de vidéo de 6 mots maximum dans « titre ».`;
    let res = {}, gpu = '';
    for (let essai = 0; essai < 2; essai++) { // un second essai, plus sage, si le texte est trop haché
      const r = await demander({ type: 'ecrire', modele: cheminModele, systeme, demande, schema: SCHEMA, maxTokens: Math.min(4000, mots * 3 + 400), temperature: essai ? 0.25 : 0.5 });
      res = r.resultat || {}; gpu = r.gpu;
      const sc = (res.scenes || []).filter(x => String(x.texte || '').trim());
      if (sc.length && sc.reduce((a, x) => a + nbMots(x.texte), 0) / sc.length >= Math.min(14, mots / n * 0.5)) break;
    }
    return { titre: String(res.titre || titre).slice(0, 80), gpu, scenes: (res.scenes || []).map(x => ({ section: String(x.section || '').slice(0, 40), texte: String(x.texte || '').trim(), recherche: String(x.recherche || '').slice(0, 80) })).filter(x => x.texte.length > 10) };
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
