// QuentMovie : mises à jour automatiques à partir des versions publiées sur GitHub (Releases).
// Recherche → téléchargement en arrière-plan (taille et empreinte SHA-256 vérifiées) → extraction du .dmg
// → remplacement de l'application une fois fermée, puis relance. Aucune dépendance.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile, spawn } = require('child_process');

const DEPOT = 'ikeupods-del/Quentools';
const RE_DMG = /^QuentMovie-(\d+)\.(\d+)\.(\d+)-arm64\.dmg$/;

const versionDe = s => String(s || '').split('.').map(n => parseInt(n, 10) || 0);
function compare(a, b) { // > 0 si a est plus récente que b
  const x = versionDe(a), y = versionDe(b);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
}

// Requête HTTPS (HTTP accepté seulement pour une adresse locale, utilisée par les tests), redirections suivies.
// Partagée avec le générateur de vidéos (ua, accept, quoi = nom du service dans les messages).
function requete(url, { dest, onProgress, ua = 'QuentMovie', accept, quoi = 'de mise à jour' } = {}, sauts = 0) {
  return new Promise((ok, ko) => {
    const u = new URL(url);
    const local = ['127.0.0.1', 'localhost'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return ko(new Error(`Adresse ${quoi} refusée`));
    const mod = require(u.protocol === 'https:' ? 'https' : 'http');
    const r = mod.get(u, { headers: { 'User-Agent': ua, Accept: accept || (dest ? 'application/octet-stream' : 'application/vnd.github+json') }, timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (sauts > 5) return ko(new Error('Trop de redirections'));
        return ok(requete(new URL(res.headers.location, u).toString(), { dest, onProgress, ua, accept, quoi }, sauts + 1));
      }
      if (res.statusCode !== 200) { res.resume(); const er = new Error(`Serveur ${quoi} : erreur ${res.statusCode}`); er.code = res.statusCode; return ko(er); }
      if (!dest) { let s = ''; res.setEncoding('utf8'); res.on('data', d => { s += d; }); res.on('end', () => { try { ok(JSON.parse(s)); } catch (e) { ko(new Error('Réponse illisible')); } }); return; }
      const total = +res.headers['content-length'] || 0, h = crypto.createHash('sha256'), out = fs.createWriteStream(dest);
      let recu = 0;
      res.on('data', d => { recu += d.length; h.update(d); if (onProgress) onProgress(recu, total); });
      res.pipe(out);
      out.on('finish', () => ok({ taille: recu, sha256: h.digest('hex') }));
      out.on('error', ko); res.on('error', ko);
    });
    r.on('timeout', () => r.destroy(new Error(`Le serveur ${quoi} ne répond pas`)));
    r.on('error', ko);
  });
}

// Version la plus récente publiée, si elle est plus récente que celle installée
async function chercher(actuelle, api = 'https://api.github.com') {
  const versions = await requete(`${api}/repos/${DEPOT}/releases?per_page=30`);
  let meilleure = null;
  for (const rel of Array.isArray(versions) ? versions : []) {
    if (rel.draft || rel.prerelease) continue;
    for (const a of rel.assets || []) {
      const m = RE_DMG.exec(a.name || ''); if (!m) continue;
      const v = `${m[1]}.${m[2]}.${m[3]}`;
      if (compare(v, actuelle) > 0 && (!meilleure || compare(v, meilleure.version) > 0)) {
        meilleure = { version: v, url: a.browser_download_url, taille: a.size, sha256: /^sha256:([0-9a-f]{64})$/.exec(a.digest || '') ? a.digest.slice(7) : '', notes: String(rel.body || '').slice(0, 3000), page: rel.html_url };
      }
    }
  }
  return meilleure;
}

async function telecharger(info, dossier, onProgress) {
  fs.mkdirSync(dossier, { recursive: true });
  const dest = path.join(dossier, `QuentMovie-${info.version}.dmg`), part = dest + '.part';
  const r = await requete(info.url, { dest: part, onProgress });
  if (info.taille && r.taille !== info.taille) { fs.rmSync(part, { force: true }); throw new Error('Téléchargement incomplet'); }
  if (info.sha256 && r.sha256 !== info.sha256) { fs.rmSync(part, { force: true }); throw new Error('Fichier de mise à jour abîmé (empreinte différente)'); }
  fs.renameSync(part, dest);
  return dest;
}

const lancer = (cmd, args) => new Promise((ok, ko) => execFile(cmd, args, (e, out, err) => (e ? ko(new Error((err || e.message).trim())) : ok(out))));

// Ouvre le .dmg et copie la nouvelle application à côté de l'ancienne (« QuentMovie.app.nouvelle »)
async function extraire(dmg, appActuelle) {
  const mnt = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-maj-'));
  const nouvelle = appActuelle + '.nouvelle';
  await lancer('hdiutil', ['attach', '-nobrowse', '-readonly', '-noautoopen', '-mountpoint', mnt, dmg]);
  try {
    const src = path.join(mnt, 'QuentMovie.app');
    if (!fs.existsSync(src)) throw new Error('Application absente du fichier de mise à jour');
    fs.rmSync(nouvelle, { recursive: true, force: true });
    await lancer('ditto', [src, nouvelle]);
  } finally { await lancer('hdiutil', ['detach', mnt, '-force']).catch(() => {}); fs.rmSync(mnt, { recursive: true, force: true }); }
  await lancer('xattr', ['-dr', 'com.apple.quarantine', nouvelle]).catch(() => {});
  return nouvelle;
}

// Script lancé au moment de quitter : attend la fermeture, échange les deux versions, relance si demandé.
const q = s => "'" + String(s).replace(/'/g, "'\\''") + "'";
function scriptRemplacement({ app, nouvelle, pid, relancer }) {
  return `#!/bin/sh
# Mise à jour de QuentMovie : remplace l'application une fois fermée.
APP=${q(app)}
NOUV=${q(nouvelle)}
n=0
while kill -0 ${+pid} 2>/dev/null && [ $n -lt 240 ]; do sleep 0.5; n=$((n+1)); done
if [ -d "$NOUV" ]; then
  rm -rf "$APP.ancienne"
  if mv "$APP" "$APP.ancienne"; then
    if mv "$NOUV" "$APP"; then rm -rf "$APP.ancienne"; else mv "$APP.ancienne" "$APP"; fi
  fi
fi
${relancer ? 'open "$APP"' : ''}
`;
}
function lancerRemplacement(opts, dossier) {
  fs.mkdirSync(dossier, { recursive: true });
  const f = path.join(dossier, 'remplacer.sh');
  fs.writeFileSync(f, scriptRemplacement(opts), { mode: 0o755 });
  const p = spawn('/bin/sh', [f], { detached: true, stdio: 'ignore' }); p.unref();
  return f;
}

// /Applications/QuentMovie.app à partir du programme en cours (…/QuentMovie.app/Contents/MacOS/QuentMovie)
function emplacementApp(execPath) {
  const app = path.resolve(execPath, '..', '..', '..');
  return /\.app$/.test(app) ? app : null;
}
function peutRemplacer(app) {
  if (!app) return 'Application introuvable';
  if (app.includes('/AppTranslocation/')) return 'Glisse d’abord QuentMovie dans le dossier Applications pour activer les mises à jour.';
  try { fs.accessSync(path.dirname(app), fs.constants.W_OK); fs.accessSync(app, fs.constants.W_OK); } catch (e) { return 'Le dossier de QuentMovie est protégé en écriture.'; }
  return '';
}

// État partagé avec la fenêtre (via le serveur local)
class Maj {
  constructor({ version, dossier, app, api, actif }) {
    Object.assign(this, { version, dossier, app, api, actif: !!actif });
    this.etat = { etat: actif ? 'rien' : 'inactif', version, nouvelle: null, progres: 0, notes: '', erreur: '' };
    this.cours = null; this.lance = false;
  }
  // Recherche puis téléchargement en arrière-plan ; « pret » quand la nouvelle version attend d'être installée
  verifier() {
    if (!this.actif) return Promise.resolve(this.etat);
    if (this.cours) return this.cours;
    this.cours = (async () => {
      const e = this.etat; e.erreur = '';
      try {
        if (e.etat !== 'pret') {
          e.etat = 'recherche';
          const info = await chercher(this.version, this.api);
          if (!info) { e.etat = 'a-jour'; return e; }
          const blocage = peutRemplacer(this.app); if (blocage) throw new Error(blocage);
          Object.assign(e, { etat: 'telechargement', nouvelle: info.version, notes: info.notes, progres: 0 });
          const dmg = await telecharger(info, this.dossier, (r, t) => { e.progres = t ? Math.round(r / t * 100) : 0; });
          e.etat = 'installation';
          this.nouvelleApp = await extraire(dmg, this.app);
          fs.rmSync(dmg, { force: true });
          e.etat = 'pret';
        }
      } catch (er) { e.etat = 'erreur'; e.erreur = er.message; }
      finally { this.cours = null; }
      return e;
    })();
    return this.cours;
  }
  // À appeler juste avant de quitter l'application
  installer(relancer) {
    if (this.etat.etat !== 'pret' || this.lance) return false;
    this.lance = true;
    lancerRemplacement({ app: this.app, nouvelle: this.nouvelleApp, pid: process.pid, relancer }, this.dossier);
    return true;
  }
}

module.exports = { Maj, requete, compare, chercher, telecharger, extraire, scriptRemplacement, lancerRemplacement, emplacementApp, peutRemplacer };
