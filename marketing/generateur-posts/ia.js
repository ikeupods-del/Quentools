// Studio Posts : IA locale (Qwen3 4B Instruct, licence Apache 2.0, ~2,5 Go téléchargés une seule fois).
// Si QuentMovie a déjà téléchargé le modèle (~/Movies/QuentMovie/modeles), il est réutilisé : rien à retélécharger.
// Aucune donnée ne quitte le Mac : seul le modèle est téléchargé (Hugging Face), une fois.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { fork } = require('child_process');

const MODELES = [
  { fichier: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf', url: 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf', mo: 2500 },
  // modèle « précis » de QuentMovie, utilisé seulement s'il est déjà là (sa pensée longue est coupée)
  { fichier: 'Qwen3-8B-Q4_K_M.gguf', mo: 5000, aucunePensee: true }
];

function telecharger(url, dest, progres, sauts = 0) {
  return new Promise((ok, ko) => {
    const r = https.get(url, { headers: { 'User-Agent': 'StudioPosts' }, timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); if (sauts > 6) return ko(new Error('Trop de redirections'));
        return ok(telecharger(new URL(res.headers.location, url).toString(), dest, progres, sauts + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return ko(new Error(`Téléchargement de l’IA : erreur ${res.statusCode}`)); }
      const total = +res.headers['content-length'] || 0, out = fs.createWriteStream(dest);
      let recu = 0;
      res.on('data', d => { recu += d.length; if (progres && total) progres(recu / total); });
      res.pipe(out);
      out.on('finish', () => ok(recu)); out.on('error', ko); res.on('error', ko);
    });
    r.on('timeout', () => r.destroy(new Error('Le serveur de téléchargement ne répond pas')));
    r.on('error', ko);
  });
}

// dossier : où ranger le modèle téléchargé (stockage de l'application) ; autres : dossiers où le chercher d'abord
function creer({ dossier, autres = [path.join(os.homedir(), 'Movies', 'QuentMovie', 'modeles')] }) {
  const dossierModeles = path.join(dossier, 'modeles');
  let proc = null, attente = new Map(), num = 0, installation = null;

  function trouver() {
    for (const m of MODELES) for (const d of [dossierModeles, ...autres]) {
      const f = path.join(d, m.fichier);
      try { if (fs.statSync(f).size > 5e8) return { ...m, chemin: f }; } catch (e) { /* absent */ }
    }
    return null;
  }
  function processus() {
    if (proc) return proc;
    proc = fork(path.join(__dirname, 'ia-worker.js'), [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let err = ''; proc.stderr.on('data', d => { err = (err + d).slice(-2000); });
    proc.on('message', m => { const a = attente.get(m.id); if (!a) return; attente.delete(m.id); m.ok ? a.ok(m) : a.ko(new Error(m.erreur)); });
    proc.on('exit', code => { for (const a of attente.values()) a.ko(new Error('L’IA locale s’est arrêtée' + (err ? ' : ' + err.trim().split('\n').pop() : ` (code ${code})`))); attente = new Map(); proc = null; });
    return proc;
  }
  const envoyer = msg => new Promise((ok, ko) => { const id = ++num; attente.set(id, { ok, ko }); processus().send({ id, ...msg }); });

  function installer(progres) {
    if (trouver()) return Promise.resolve();
    if (installation) return installation;
    const m = MODELES[0], dest = path.join(dossierModeles, m.fichier), part = dest + '.part';
    installation = (async () => {
      fs.mkdirSync(dossierModeles, { recursive: true });
      const taille = await telecharger(m.url, part, progres);
      if (taille < 5e8) { fs.rmSync(part, { force: true }); throw new Error('Téléchargement de l’IA incomplet : réessaie'); }
      fs.renameSync(part, dest);
    })().finally(() => { installation = null; });
    return installation;
  }

  // demande envoyée à l'IA : JSON imposé par le schéma
  async function demander({ systeme, demande, schema, maxTokens, temperature }) {
    const m = trouver(); if (!m) throw new Error('IA locale non installée');
    const r = await envoyer({ type: 'ecrire', modele: m.chemin, systeme: m.aucunePensee ? systeme + ' /no_think' : systeme, demande, schema, maxTokens, temperature, contexte: 4096 });
    return r.resultat;
  }
  const etat = () => { const m = trouver(); return { installee: !!m, mo: MODELES[0].mo, partage: !!(m && !m.chemin.startsWith(dossierModeles)) }; };
  const verifier = () => envoyer({ type: 'verifier' }).then(r => ({ ok: true, gpu: r.gpu }));
  const fermer = () => { if (proc) proc.kill(); };
  return { etat, installer, demander, verifier, fermer };
}

module.exports = { creer, MODELES };
