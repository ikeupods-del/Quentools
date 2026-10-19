// Publication des épisodes : envoi d'une vidéo sur YouTube (API YouTube Data, vidéo PRIVÉE ou programmée) et dépôt d'un brouillon dans TikTok (API Content Posting,
// dossier « inbox » : la vidéo arrive dans l'application TikTok, tu ajoutes la légende et tu publies). Rien n'est jamais publié sans ton clic.
// Comptes : tu crées toi-même ton accès (Google Cloud pour YouTube, TikTok for Developers) et tu colles l'identifiant dans QuentMovie ; les clés restent sur ton Mac
// (chiffrées par le trousseau de macOS quand il est disponible), jamais dans le dépôt. Connexion par navigateur, retour sur 127.0.0.1 (PKCE).
// Adresses des services remplaçables (`points`) pour les essais.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), https = require('https'), crypto = require('crypto');

const POINTS = {
  google: { auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', api: 'https://www.googleapis.com' },
  tiktok: { auth: 'https://www.tiktok.com/v2/auth/authorize/', token: 'https://open.tiktokapis.com/v2/oauth/token/', api: 'https://open.tiktokapis.com' }
};
const b64url = b => b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const nettoie = (t, max) => String(t == null ? '' : t).replace(/[<>]/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

// requête HTTP(S) simple : corps texte/JSON ou flux de fichier ; renvoie { statut, entetes, corps }
function requete(url, { methode = 'GET', entetes = {}, corps = null, fichier = null, debut = 0, fin = null, onOctets = null } = {}) {
  return new Promise((ok, ko) => {
    const u = new URL(url), mod = u.protocol === 'https:' ? https : http;
    if (u.protocol !== 'https:' && !['127.0.0.1', 'localhost'].includes(u.hostname)) return ko(new Error('Adresse refusée (https obligatoire)'));
    const taille = fichier ? (fin == null ? fs.statSync(fichier).size - 1 : fin) - debut + 1 : (corps ? Buffer.byteLength(corps) : 0);
    const r = mod.request(u, { method: methode, headers: { ...entetes, ...(fichier || corps ? { 'Content-Length': taille } : {}) }, timeout: 120000 }, res => {
      const morceaux = []; res.on('data', d => morceaux.push(d)); res.on('end', () => ok({ statut: res.statusCode, entetes: res.headers, corps: Buffer.concat(morceaux).toString('utf8') }));
    });
    r.on('timeout', () => r.destroy(new Error('Le service ne répond pas')));
    r.on('error', ko);
    if (fichier) {
      let envoye = 0; const flux = fs.createReadStream(fichier, { start: debut, end: fin == null ? undefined : fin });
      flux.on('data', d => { envoye += d.length; if (onOctets) onOctets(envoye, taille); });
      flux.on('error', ko); flux.pipe(r);
    } else { if (corps) r.write(corps); r.end(); }
  });
}
const json = t => { try { return JSON.parse(t); } catch (e) { return {}; } };

function creer({ base, coffre = null, ouvrirUrl = null, points = {} }) {
  const P = { google: { ...POINTS.google, ...(points.google || {}) }, tiktok: { ...POINTS.tiktok, ...(points.tiktok || {}) } };
  const dossier = path.join(base, 'publication'), fichierComptes = path.join(dossier, 'comptes.json');
  const lire = () => { try { return JSON.parse(fs.readFileSync(fichierComptes, 'utf8')); } catch (e) { return {}; } };
  const ecrire = d => { fs.mkdirSync(dossier, { recursive: true }); fs.writeFileSync(fichierComptes + '.tmp', JSON.stringify(d, null, 1), { mode: 0o600 }); fs.renameSync(fichierComptes + '.tmp', fichierComptes); };
  // secrets chiffrés par le trousseau quand il existe ; sinon dans un fichier réservé à l'utilisateur (droits 600)
  const sceller = v => (coffre && v ? { c: 1, v: coffre.chiffrer(v) } : { c: 0, v });
  // trousseau changé ou clé illisible : valeur vide, le compte est à reconnecter (le panneau Publier reste utilisable)
  const ouvrir = (o, k) => { if (!o) return ''; if (!o.c) return o.v || ''; try { return coffre ? coffre.dechiffrer(o.v) : (k.illisible = true, ''); } catch (e) { k.illisible = true; return ''; } };
  const compte = n => { const c = lire()[n] || {}, k = {}; return Object.assign(k, { id: c.id || '', secret: ouvrir(c.secret, k), refresh: ouvrir(c.refresh, k), acces: ouvrir(c.acces, k), expire: c.expire || 0, nom: c.nom || '' }); };
  const garder = (n, o) => { const d = lire(), c = d[n] || {}; d[n] = { ...c, ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, ['secret', 'refresh', 'acces'].includes(k) ? sceller(v) : v])) }; ecrire(d); };

  function etat() {
    const g = compte('youtube'), t = compte('tiktok');
    return { youtube: { configure: !!(g.id && g.secret), connecte: !!g.refresh, nom: g.nom, aReconnecter: !!g.illisible }, tiktok: { configure: !!(t.id && t.secret), connecte: !!t.refresh, nom: t.nom, aReconnecter: !!t.illisible }, chiffre: !!coffre, dossier };
  }
  function configurer(n, id, secret) {
    if (!['youtube', 'tiktok'].includes(n)) throw new Error('Plateforme inconnue');
    id = String(id || '').trim(); secret = String(secret || '').trim();
    if (id.length < 8 || secret.length < 8) throw new Error('Colle l’identifiant et la clé secrète exactement comme ils sont affichés.');
    garder(n, { id, secret, refresh: '', acces: '', expire: 0, nom: '' });
    return etat();
  }
  function deconnecter(n) { const d = lire(); delete d[n]; ecrire(d); return etat(); }

  // ----- connexion par le navigateur (PKCE, retour sur 127.0.0.1) -----
  const attentes = new Map();
  async function connecter(n, { delai = 300000 } = {}) {
    const c = compte(n); if (!c.id || !c.secret) throw new Error('Configure d’abord l’identifiant et la clé secrète.');
    const verifier = n === 'tiktok' ? crypto.randomBytes(48).toString('hex').slice(0, 64) : b64url(crypto.randomBytes(48)), etatAleatoire = b64url(crypto.randomBytes(16));
    // TikTok attend le hachage SHA-256 écrit en hexadécimal ; Google en base64 sans remplissage
    const defi = n === 'tiktok' ? crypto.createHash('sha256').update(verifier).digest('hex') : b64url(crypto.createHash('sha256').update(verifier).digest());
    const serveur = http.createServer(), pret = new Promise(r => serveur.listen(0, '127.0.0.1', r)); await pret;
    const redirection = `http://127.0.0.1:${serveur.address().port}/oauth`;
    const attente = new Promise((ok, ko) => {
      const minuteur = setTimeout(() => { serveur.close(); ko(new Error('Connexion trop longue : recommence.')); }, delai);
      serveur.on('request', (req, res) => {
        const u = new URL(req.url, redirection);
        if (u.pathname !== '/oauth') { res.writeHead(404); return res.end(); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        const code = u.searchParams.get('code'), er = u.searchParams.get('error');
        res.end(`<meta charset="utf-8"><body style="font-family:sans-serif;text-align:center;margin-top:20vh"><h2>${code && u.searchParams.get('state') === etatAleatoire ? '✅ Connecté' : '❌ Connexion refusée'}</h2><p>Tu peux fermer cet onglet et revenir dans QuentMovie.</p></body>`);
        clearTimeout(minuteur); serveur.close();
        if (er || !code || u.searchParams.get('state') !== etatAleatoire) return ko(new Error(er ? `Connexion refusée (${er}).` : 'Réponse inattendue du service.'));
        ok(code);
      });
    });
    const url = n === 'youtube'
      ? `${P.google.auth}?${new URLSearchParams({ client_id: c.id, redirect_uri: redirection, response_type: 'code', scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly', code_challenge: defi, code_challenge_method: 'S256', state: etatAleatoire, access_type: 'offline', prompt: 'consent' })}`
      : `${P.tiktok.auth}?${new URLSearchParams({ client_key: c.id, scope: 'video.upload', response_type: 'code', redirect_uri: redirection, state: etatAleatoire, code_challenge: defi, code_challenge_method: 'S256' })}`;
    const fin = attente.then(async code => {
      const r = n === 'youtube'
        ? await requete(P.google.token, { methode: 'POST', entetes: { 'Content-Type': 'application/x-www-form-urlencoded' }, corps: new URLSearchParams({ client_id: c.id, client_secret: c.secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirection }).toString() })
        : await requete(P.tiktok.token, { methode: 'POST', entetes: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' }, corps: new URLSearchParams({ client_key: c.id, client_secret: c.secret, code, code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirection }).toString() });
      const j = json(r.corps); if (r.statut !== 200 || !j.access_token) throw new Error(`Le service a refusé la connexion : ${j.error_description || j.error || r.statut}`);
      garder(n, { acces: j.access_token, refresh: j.refresh_token || '', expire: Date.now() + (j.expires_in || 3600) * 1000 - 60000 });
      if (n === 'youtube') { try { const m = await requete(`${P.google.api}/youtube/v3/channels?part=snippet&mine=true`, { entetes: { Authorization: 'Bearer ' + j.access_token } }); const nom = ((json(m.corps).items || [])[0] || { snippet: {} }).snippet.title; if (nom) garder(n, { nom }); } catch (e) { /* nom de la chaîne facultatif */ } }
      return etat();
    });
    attentes.set(n, fin); fin.catch(() => {}).finally(() => attentes.delete(n));
    if (ouvrirUrl) ouvrirUrl(url);
    return { url, attente: fin };
  }

  // jeton d'accès valide (renouvelé avec le jeton de rafraîchissement)
  async function jeton(n) {
    const c = compte(n); if (!c.refresh && !c.acces) throw new Error('Connecte d’abord ton compte.');
    if (c.acces && c.expire > Date.now()) return c.acces;
    if (!c.refresh) throw new Error('La connexion a expiré : reconnecte ton compte.');
    const r = n === 'youtube'
      ? await requete(P.google.token, { methode: 'POST', entetes: { 'Content-Type': 'application/x-www-form-urlencoded' }, corps: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: c.refresh, grant_type: 'refresh_token' }).toString() })
      : await requete(P.tiktok.token, { methode: 'POST', entetes: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' }, corps: new URLSearchParams({ client_key: c.id, client_secret: c.secret, refresh_token: c.refresh, grant_type: 'refresh_token' }).toString() });
    const j = json(r.corps); if (r.statut !== 200 || !j.access_token) throw new Error('La connexion a expiré : reconnecte ton compte' + (n === 'youtube' ? ' (un projet Google en mode « Test » oublie la connexion après 7 jours).' : '.'));
    garder(n, { acces: j.access_token, expire: Date.now() + (j.expires_in || 3600) * 1000 - 60000, ...(j.refresh_token ? { refresh: j.refresh_token } : {}) });
    return j.access_token;
  }

  const erreurYoutube = (statut, corps) => {
    const j = json(corps), raison = (((j.error || {}).errors || [])[0] || {}).reason || '', msg = (j.error || {}).message || '';
    if (statut === 401) return 'La connexion YouTube a expiré : reconnecte ton compte.';
    if (/quotaExceeded|dailyLimitExceeded/.test(raison)) return 'Le quota YouTube du jour est atteint : réessaie demain.';
    if (/uploadLimitExceeded/.test(raison)) return 'YouTube refuse un nouvel envoi aujourd’hui (limite atteinte) : réessaie plus tard.';
    if (/youtubeSignupRequired/.test(raison)) return 'Ce compte Google n’a pas de chaîne YouTube.';
    if (/forbidden|insufficientPermissions/.test(raison)) return 'YouTube refuse l’accès : vérifie que ton adresse est bien ajoutée comme utilisateur test du projet Google.';
    if (/invalidTags/.test(raison)) return 'YouTube refuse les mots-clés : retire les caractères spéciaux.';
    if (/mediaBodyRequired|invalidVideoMetadata|invalidTitle|invalidDescription/.test(raison)) return `YouTube refuse le titre ou la description (${raison}).`;
    return `YouTube a refusé l’envoi (${statut}${raison ? ' ' + raison : ''}${msg ? ' : ' + msg.slice(0, 120) : ''}).`;
  };

  // ----- YouTube : vidéo privée (ou programmée), miniature facultative -----
  async function envoyerYoutube({ video, titre, description = '', tags = [], categorie = '27', confidentialite = 'private', programmation = '', synthese = false, miniature = '' }, onProgression = () => {}) {
    if (!fs.existsSync(video)) throw new Error('Vidéo introuvable : ' + video);
    if (!['private', 'unlisted', 'public'].includes(confidentialite)) throw new Error('Réglage de confidentialité inconnu.');
    const t = nettoie(titre, 100); if (!t) throw new Error('Il manque le titre de la vidéo.');
    let publishAt = '';
    if (programmation) { const d = new Date(programmation); if (!(d.getTime() > Date.now() + 15 * 60000)) throw new Error('La date de programmation doit être dans le futur (au moins 15 minutes).'); publishAt = d.toISOString(); }
    const acces = await jeton('youtube'), taille = fs.statSync(video).size;
    let cumul = 0, motsCles = []; for (const m of tags) { const x = nettoie(m, 60); if (x && cumul + x.length + 1 <= 450) { motsCles.push(x); cumul += x.length + 1; } }
    const meta = { snippet: { title: t, description: nettoie(description, 4900), tags: motsCles, categoryId: String(categorie), defaultLanguage: 'fr', defaultAudioLanguage: 'fr' },
      // programmer impose « privée » côté YouTube : la vidéo devient publique à l'heure choisie
      status: { privacyStatus: publishAt ? 'private' : confidentialite, selfDeclaredMadeForKids: false, containsSyntheticMedia: !!synthese, ...(publishAt ? { publishAt } : {}) } };
    onProgression(0.02, 'Préparation de l’envoi…');
    const init = await requete(`${P.google.api}/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`, { methode: 'POST', entetes: { Authorization: 'Bearer ' + acces, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Length': taille, 'X-Upload-Content-Type': 'video/mp4' }, corps: JSON.stringify(meta) });
    if (init.statut !== 200 || !init.entetes.location) throw new Error(erreurYoutube(init.statut, init.corps));
    const envoi = await requete(init.entetes.location, { methode: 'PUT', entetes: { 'Content-Type': 'video/mp4' }, fichier: video, onOctets: (o, tot) => onProgression(0.05 + 0.85 * o / tot, `Envoi de la vidéo… ${Math.round(100 * o / tot)} %`) });
    if (![200, 201].includes(envoi.statut)) throw new Error(erreurYoutube(envoi.statut, envoi.corps));
    const v = json(envoi.corps); if (!v.id) throw new Error('YouTube n’a pas renvoyé d’identifiant de vidéo.');
    let miniatureOk = null;
    if (miniature && fs.existsSync(miniature)) {
      onProgression(0.93, 'Envoi de la miniature…');
      if (fs.statSync(miniature).size > 2 * 1024 * 1024) miniatureOk = 'Miniature trop lourde (2 Mo au plus) : ajoute-la dans YouTube Studio.';
      else {
        const r = await requete(`${P.google.api}/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(v.id)}&uploadType=media`, { methode: 'POST', entetes: { Authorization: 'Bearer ' + acces, 'Content-Type': /\.png$/i.test(miniature) ? 'image/png' : 'image/jpeg' }, fichier: miniature });
        miniatureOk = r.statut === 200 ? true : (/forbidden|youtube.thumbnail/i.test(r.corps) ? 'Miniature refusée : ta chaîne doit être vérifiée par téléphone (YouTube Studio → Paramètres → Chaîne).' : erreurYoutube(r.statut, r.corps));
      }
    }
    onProgression(1, 'Envoyé');
    return { id: v.id, lien: `https://studio.youtube.com/video/${v.id}/edit`, confidentialite: publishAt ? 'private' : confidentialite, programmation: publishAt, miniature: miniatureOk };
  }

  // ----- TikTok : brouillon dans l'application (légende et publication faites par toi) -----
  async function envoyerTiktok({ video }, onProgression = () => {}) {
    if (!fs.existsSync(video)) throw new Error('Vidéo introuvable : ' + video);
    const acces = await jeton('tiktok'), taille = fs.statSync(video).size, MAX = P.tiktok.max || 64 * 1024 * 1024; // TikTok : parties de 5 à 64 Mo, la dernière jusqu'à 128 Mo
    const morceau = taille <= MAX ? taille : (P.tiktok.morceau || 32 * 1024 * 1024), nb = Math.max(1, Math.floor(taille / morceau));
    onProgression(0.03, 'Préparation de l’envoi…');
    const init = await requete(`${P.tiktok.api}/v2/post/publish/inbox/video/init/`, { methode: 'POST', entetes: { Authorization: 'Bearer ' + acces, 'Content-Type': 'application/json; charset=UTF-8' }, corps: JSON.stringify({ source_info: { source: 'FILE_UPLOAD', video_size: taille, chunk_size: morceau, total_chunk_count: nb } }) });
    const j = json(init.corps), er = j.error || {};
    if (init.statut !== 200 || (er.code && er.code !== 'ok') || !(j.data && j.data.upload_url)) {
      const code = er.code || init.statut;
      throw new Error(/scope_not_authorized|access_token_invalid/.test(code) ? 'TikTok refuse l’accès : reconnecte ton compte.' : /spam_risk|rate_limit/.test(code) ? 'TikTok limite les envois pour le moment : réessaie plus tard.' : `TikTok a refusé l’envoi (${code}${er.message ? ' : ' + String(er.message).slice(0, 120) : ''}).`);
    }
    for (let k = 0; k < nb; k++) {
      const debut = k * morceau, fin = k === nb - 1 ? taille - 1 : debut + morceau - 1;
      const r = await requete(j.data.upload_url, { methode: 'PUT', entetes: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${debut}-${fin}/${taille}` }, fichier: video, debut, fin, onOctets: (o, tot) => onProgression(0.05 + 0.9 * ((k + o / tot) / nb), `Envoi de la vidéo… ${Math.round(100 * (k + o / tot) / nb)} %`) });
      if (![200, 201, 206].includes(r.statut)) throw new Error(`TikTok a refusé une partie de la vidéo (${r.statut}).`);
    }
    onProgression(1, 'Envoyé');
    return { publication: j.data.publish_id || '', message: 'La vidéo est dans ton application TikTok (notification « brouillon ») : ajoute la légende et publie.' };
  }

  return { etat, configurer, deconnecter, connecter, envoyerYoutube, envoyerTiktok, erreurYoutube };
}

// Épisodes prêts à publier dans les dossiers de sorties (~/Movies/QuentInvest, ~/Downloads, ~/Desktop : un dossier <NN-sujet> par épisode) : publication.json + vidéos + miniatures
function episodes(racines) {
  const sortie = [];
  for (const racine of [].concat(racines)) {
  let l = []; try { l = fs.readdirSync(racine); } catch (e) { continue; }
  for (const d of l.sort().reverse()) {
    const dir = path.join(racine, d); let f = []; try { f = fs.readdirSync(dir); } catch (e) { continue; }
    const pub = f.find(x => /-publication\.json$/.test(x)); if (!pub) continue;
    let p = {}; try { p = JSON.parse(fs.readFileSync(path.join(dir, pub), 'utf8')); } catch (e) { continue; }
    const trouve = re => { const x = f.find(n => re.test(n)); return x ? path.join(dir, x) : ''; };
    sortie.push({ dossier: dir, nom: d, titre: p.titre || d, description: p.descriptionYoutube || '', tags: p.tagsYoutube || [], legendeTikTok: p.legendeTikTok || '', commentaire: p.commentaireEpingle || '', synthese: !!p.contenuDeSynthese,
      video: { youtube: trouve(/-youtube\.mp4$/), tiktok: trouve(/-tiktok\.mp4$/) }, miniature: { youtube: trouve(/^\d+-miniature\.png$/), tiktok: trouve(/^\d+-miniature-tiktok\.png$/) } });
  }
  }
  return sortie;
}

module.exports = { creer, episodes, requete, nettoie };
