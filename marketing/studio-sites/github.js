// Studio Sites : connexion à GitHub et publication du site (dépôt + GitHub Pages). Code du processus principal (Node) : le jeton ne passe jamais par la page.
// Deux façons de se connecter : un jeton personnel (collé une fois) ou la connexion « appareil » de GitHub (un code à saisir sur github.com, comme les connecteurs),
// qui demande l'identifiant public (client ID) d'une application OAuth créée une fois dans les réglages GitHub. Aucune clé secrète n'est nécessaire.
'use strict';

const API = 'https://api.github.com', WEB = 'https://github.com';
const attendre = ms => new Promise(r => setTimeout(r, ms));
const valideNom = n => /^[A-Za-z0-9._-]{1,100}$/.test(n) && !/^\.{1,2}$/.test(n) && !/\.git$/i.test(n);

class GitHub {
  // opts : { jeton, api, web, fetch, pause (tests : délai remplacé) }
  constructor(opts = {}) {
    this.jeton = opts.jeton || ''; this.api = opts.api || API; this.web = opts.web || WEB; this.f = opts.fetch || ((...a) => fetch(...a)); this.pause = opts.pause || attendre;
  }
  async appel(methode, chemin, corps) {
    const r = await this.f(this.api + chemin, { method: methode, headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'Studio-Sites', ...(this.jeton ? { Authorization: 'Bearer ' + this.jeton } : {}), ...(corps ? { 'Content-Type': 'application/json' } : {}) }, body: corps ? JSON.stringify(corps) : undefined });
    let j = null; try { j = await r.json(); } catch (e) { /* corps vide */ }
    if (!r.ok) { const e = new Error(this.message(r.status, j, chemin)); e.statut = r.status; throw e; }
    return j;
  }
  message(statut, j, chemin) {
    const m = (j && j.message) || '';
    if (statut === 401) return 'GitHub refuse ce jeton (expiré ou incorrect). Reconnecte-toi.';
    if (statut === 403 && /rate limit/i.test(m)) return 'GitHub limite temporairement les requêtes : réessaie dans quelques minutes.';
    if (statut === 403) return 'Le jeton n’a pas le droit de faire cela (il faut l’autorisation « repo »).';
    if (statut === 422 && /name already exists/i.test(m)) return 'Un dépôt de ce nom existe déjà sur ce compte.';
    if (statut === 404) return /\/pages/.test(chemin) ? 'GitHub Pages n’est pas disponible pour ce dépôt (un dépôt privé demande un abonnement payant).' : 'Introuvable sur GitHub (vérifie le nom et les droits du jeton).';
    return 'GitHub : ' + (m || 'erreur ' + statut);
  }
  async moi() { const u = await this.appel('GET', '/user'); return { login: u.login, nom: u.name || '' }; }

  /* ───────── Connexion « appareil » (code à saisir sur github.com) ───────── */
  async appareilDebut(clientId) {
    if (!/^[A-Za-z0-9._-]{8,60}$/.test(String(clientId || ''))) throw new Error('Identifiant d’application GitHub (client ID) manquant ou incorrect.');
    const r = await this.f(this.web + '/login/device/code', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Studio-Sites' }, body: JSON.stringify({ client_id: clientId, scope: 'repo' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.device_code) throw new Error(j.error_description || 'GitHub n’a pas accepté cette application (active « Device Flow » dans ses réglages).');
    return { deviceCode: j.device_code, code: j.user_code, url: j.verification_uri || this.web + '/login/device', intervalle: +j.interval || 5, duree: +j.expires_in || 900 };
  }
  // attend que l'utilisateur ait validé le code ; renvoie le jeton
  async appareilAttente(clientId, appareil, { annule } = {}) {
    let intervalle = appareil.intervalle, reste = appareil.duree;
    while (reste > 0) {
      await this.pause(intervalle * 1000); reste -= intervalle;
      if (annule && annule()) throw new Error('Connexion annulée.');
      const r = await this.f(this.web + '/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Studio-Sites' }, body: JSON.stringify({ client_id: clientId, device_code: appareil.deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }) });
      const j = await r.json().catch(() => ({}));
      if (j.access_token) return j.access_token;
      if (j.error === 'authorization_pending') continue;
      if (j.error === 'slow_down') { intervalle += 5; continue; }
      if (j.error === 'expired_token') throw new Error('Le code a expiré : recommence la connexion.');
      if (j.error === 'access_denied') throw new Error('Connexion refusée sur GitHub.');
      throw new Error(j.error_description || 'La connexion à GitHub a échoué.');
    }
    throw new Error('Le code a expiré : recommence la connexion.');
  }

  /* ───────── Publication ───────── */
  // fichiers : [{ chemin, contenu: Buffer|string }] ; retourne { depot, site, branche, commit, nouveau, pages }
  async publier({ nom, fichiers, prive = false, message = 'Mise à jour du site', pages = true, surEtape = () => {} }) {
    if (!valideNom(nom)) throw new Error('Nom de dépôt incorrect : lettres, chiffres, tirets et points seulement.');
    const liste = (fichiers || []).filter(f => f && typeof f.chemin === 'string');
    if (!liste.length) throw new Error('Aucun fichier à publier.');
    for (const f of liste) if (f.chemin.startsWith('/') || f.chemin.split('/').some(p => p === '..' || p === '' ) || f.chemin.length > 200) throw new Error('Chemin de fichier refusé : ' + f.chemin);
    surEtape('Connexion à GitHub…'); const { login } = await this.moi();
    let depot = null, nouveau = false;
    try { depot = await this.appel('GET', `/repos/${login}/${nom}`); } catch (e) { if (e.statut !== 404) throw e; }
    if (!depot) { surEtape('Création du dépôt…'); depot = await this.appel('POST', '/user/repos', { name: nom, private: !!prive, auto_init: true, description: 'Site internet' }); nouveau = true; }
    const branche = depot.default_branch || 'main';
    // l'initialisation du dépôt prend un instant
    let tete = null;
    for (let essai = 0; essai < 8 && !tete; essai++) { try { tete = await this.appel('GET', `/repos/${login}/${nom}/git/ref/heads/${branche}`); } catch (e) { if (e.statut !== 404 && e.statut !== 409) throw e; await this.pause(1000); } }
    if (!tete) throw new Error('Le dépôt vient d’être créé mais GitHub n’est pas prêt : réessaie dans une minute.');
    const parent = tete.object.sha, base = (await this.appel('GET', `/repos/${login}/${nom}/git/commits/${parent}`)).tree.sha;
    const entrees = [];
    let n = 0;
    for (const f of liste) {
      surEtape(`Envoi des fichiers (${++n}/${liste.length})…`);
      const buf = Buffer.isBuffer(f.contenu) ? f.contenu : Buffer.from(String(f.contenu == null ? '' : f.contenu), 'utf8');
      const blob = await this.appel('POST', `/repos/${login}/${nom}/git/blobs`, { content: buf.toString('base64'), encoding: 'base64' });
      entrees.push({ path: f.chemin, mode: '100644', type: 'blob', sha: blob.sha });
    }
    surEtape('Enregistrement des changements…');
    const arbre = await this.appel('POST', `/repos/${login}/${nom}/git/trees`, { base_tree: base, tree: entrees });
    const commit = await this.appel('POST', `/repos/${login}/${nom}/git/commits`, { message, tree: arbre.sha, parents: [parent] });
    await this.appel('PATCH', `/repos/${login}/${nom}/git/refs/heads/${branche}`, { sha: commit.sha });
    let etatPages = 'non demandé', site = '';
    if (pages) {
      surEtape('Activation de GitHub Pages…');
      try { await this.appel('POST', `/repos/${login}/${nom}/pages`, { source: { branch: branche, path: '/' } }); etatPages = 'activé'; }
      catch (e) { if (e.statut === 409 || /already/i.test(e.message)) etatPages = 'déjà activé'; else if (e.statut === 422 || e.statut === 404 || e.statut === 403) etatPages = 'impossible : ' + e.message; else throw e; }
      site = nom.toLowerCase() === `${login}.github.io`.toLowerCase() ? `https://${login}.github.io/` : `https://${login}.github.io/${nom}/`;
    }
    return { depot: depot.html_url || `https://github.com/${login}/${nom}`, site, branche, commit: commit.sha, nouveau, pages: etatPages, login };
  }
}
module.exports = { GitHub, valideNom };
