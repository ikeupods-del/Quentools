// Routes de la publication (publication.js) : comptes YouTube et TikTok, connexion par le navigateur, envoi d'un épisode, aides à la publication manuelle.
// `traiter` renvoie NON quand la requête n'est pas pour ce module.
'use strict';
const os = require('os'), path = require('path');
const NON = Symbol('non traité');

function creer({ PUB, opts, send, readJson, travail }) {
  const racine = opts.sortiesQuentInvest || [path.join(os.homedir(), 'Movies', 'QuentInvest'), path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Desktop')];
  const { episodes } = require('./publication');
  const trouver = nom => { const e = episodes(racine).find(x => x.nom === String(nom || '')); if (!e) throw new Error('Épisode introuvable : fabrique-le d’abord avec la chaîne QuentInvest.'); return e; };
  return async function traiter(req, res, p) {
    if (!p.startsWith('/api/publier')) return NON;
    const P = PUB();
    if (req.method === 'GET' && p === '/api/publier') return send(res, 200, { ...P.etat(), racine: [].concat(racine).join(' ou '), episodes: episodes(racine) });
    if (req.method === 'POST' && p === '/api/publier/configurer') { const b = await readJson(req); return send(res, 200, P.configurer(String(b.plateforme || ''), b.id, b.secret)); }
    if (req.method === 'POST' && p === '/api/publier/deconnecter') { const b = await readJson(req); return send(res, 200, P.deconnecter(String(b.plateforme || ''))); }
    if (req.method === 'POST' && p === '/api/publier/connecter') {
      const b = await readJson(req), c = await P.connecter(String(b.plateforme || ''));
      return send(res, 200, { ...travail(async job => { job.step = 'Autorise l’accès dans la page ouverte dans ton navigateur…'; return c.attente; }), url: c.url });
    }
    if (req.method === 'POST' && p === '/api/publier/envoyer') {
      const b = await readJson(req), e = trouver(b.episode), plateforme = String(b.plateforme || '');
      if (plateforme === 'youtube' && !e.video.youtube) throw new Error('Pas de vidéo YouTube dans ce dossier.');
      if (plateforme === 'tiktok' && !e.video.tiktok) throw new Error('Pas de vidéo TikTok dans ce dossier.');
      if (!['youtube', 'tiktok'].includes(plateforme)) throw new Error('Plateforme inconnue');
      return send(res, 200, travail(async job => {
        const prog = (x, t) => { job.progress = x; job.step = t; };
        if (plateforme === 'youtube') return P.envoyerYoutube({ video: e.video.youtube, titre: String(b.titre || e.titre), description: String(b.description != null ? b.description : e.description), tags: e.tags, confidentialite: String(b.confidentialite || 'private'), programmation: String(b.programmation || ''), synthese: b.synthese != null ? !!b.synthese : e.synthese, miniature: e.miniature.youtube }, prog);
        return P.envoyerTiktok({ video: e.video.tiktok }, prog);
      }));
    }
    if (req.method === 'POST' && p === '/api/publier/ouvrir') {
      const b = await readJson(req), cible = String(b.cible || ''), e = b.episode ? trouver(b.episode) : null;
      if (cible === 'dossier' && e) { if (opts.ouvrirDossier) opts.ouvrirDossier(e.dossier); return send(res, 200, { ok: !!opts.ouvrirDossier, dossier: e.dossier }); }
      const url = { studio: 'https://studio.youtube.com/', tiktok: 'https://www.tiktok.com/tiktokstudio/upload', reglages: 'https://console.cloud.google.com/apis/credentials' }[cible];
      if (!url) throw new Error('Destination inconnue');
      if (opts.ouvrirUrl) opts.ouvrirUrl(url); return send(res, 200, { ok: !!opts.ouvrirUrl, url });
    }
    return NON;
  };
}

module.exports = { creer, NON };
