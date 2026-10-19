// Routes de la publication (publication.js) : comptes YouTube et TikTok, connexion par le navigateur, envoi d'un épisode, aides à la publication manuelle.
// `traiter` renvoie NON quand la requête n'est pas pour ce module.
'use strict';
const os = require('os'), path = require('path');
const NON = Symbol('non traité');

function creer({ PUB, opts, send, readJson, travail, EXPORTS = '', safeName = n => path.basename(String(n || '')) }) {
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
    if (req.method === 'POST' && p === '/api/publier/montage') { // la vidéo exportée du montage en cours (écran « Exporter et publier »)
      const b = await readJson(req), plateforme = String(b.plateforme || ''), video = path.join(EXPORTS, safeName(String(b.fichier || '')));
      if (!['youtube', 'tiktok'].includes(plateforme)) throw new Error('Plateforme inconnue');
      if (!EXPORTS || !b.fichier || !require('fs').existsSync(video)) throw new Error('Vidéo exportée introuvable : exporte d’abord le montage.');
      const titre = String(b.titre || '').trim();
      if (plateforme === 'youtube' && !titre) throw new Error('Écris le titre de la vidéo avant de l’envoyer sur YouTube.');
      return send(res, 200, travail(async job => {
        const prog = (x, t) => { job.progress = x; job.step = t; };
        if (plateforme === 'youtube') return P.envoyerYoutube({ video, titre: titre.slice(0, 100), description: String(b.description || '').slice(0, 5000), tags: [].concat(b.tags || []).map(String).slice(0, 30), confidentialite: b.confidentialite === 'unlisted' ? 'unlisted' : 'private', programmation: String(b.programmation || ''), synthese: !!b.synthese }, prog);
        return P.envoyerTiktok({ video }, prog);
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
