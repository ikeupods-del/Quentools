// QuentMovie : banques d'images gratuites du générateur. Chaque banque renvoie des images au même format que Wikimedia Commons :
// { nom, url, apercu, largeur, hauteur, auteur, licence, page, description, texte, qualite, source, rang }
// Sans clé : Wikimedia Commons (generateur.js), Openverse (Flickr, musées…), NASA. Avec une clé gratuite que l'utilisateur colle dans
// l'application (gardée dans son dossier QuentMovie, jamais dans le dépôt) : Pexels, Pixabay, Unsplash.
'use strict';
const { normalise } = require('./images');

const UA = 'QuentMovie/1.7 (logiciel de montage personnel ; https://github.com/ikeupods-del/Quentools)';

// Les banques que l'on peut activer ; cle = faut-il une clé gratuite
const BANQUES = [
  { id: 'commons', nom: 'Wikimedia Commons', cle: false, defaut: true, licence: 'Licences libres (CC, domaine public)', lien: '' },
  { id: 'openverse', nom: 'Openverse (Flickr, musées…)', cle: false, defaut: true, licence: 'Licences libres (CC0, CC BY, CC BY-SA)', lien: '' },
  { id: 'nasa', nom: 'NASA (espace, science)', cle: false, defaut: true, licence: 'Domaine public', lien: '' },
  { id: 'pexels', nom: 'Pexels (photos de qualité)', cle: true, defaut: true, licence: 'Licence Pexels : libre, sans crédit obligatoire', lien: 'https://www.pexels.com/api/' },
  { id: 'pixabay', nom: 'Pixabay (photos de qualité)', cle: true, defaut: true, licence: 'Licence Pixabay : libre, sans crédit obligatoire', lien: 'https://pixabay.com/api/docs/' },
  { id: 'unsplash', nom: 'Unsplash (photos d’art)', cle: true, defaut: true, licence: 'Licence Unsplash : libre (50 recherches par heure)', lien: 'https://unsplash.com/oauth/applications' }
];

function getJson(url, headers = {}, delai = 12000) {
  return new Promise((ok, ko) => {
    let u; try { u = new URL(url); } catch (e) { return ko(new Error('adresse invalide')); }
    const local = ['127.0.0.1', 'localhost'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return ko(new Error('adresse refusée'));
    const r = require(u.protocol === 'https:' ? 'https' : 'http').get(u, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, timeout: delai }, res => {
      let s = ''; res.setEncoding('utf8'); res.on('data', d => { s += d; if (s.length > 4e6) r.destroy(); });
      res.on('end', () => { if (res.statusCode !== 200) { const e = new Error('erreur ' + res.statusCode); e.code = res.statusCode; return ko(e); } try { ok(JSON.parse(s)); } catch (e) { ko(new Error('réponse illisible')); } });
    });
    r.on('timeout', () => r.destroy(new Error('trop long'))); r.on('error', ko);
  });
}
const nettoyer = t => String(t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const fabrique = (o, source, rang) => ({ ...o, source, rang, texte: normalise(`${o.nom} ${o.description || ''}`).slice(0, 900) });

// bases : adresses des services (remplaçables pour les essais) ; cles : { pexels, pixabay, unsplash }
function creer({ bases = {}, cles = {} } = {}) {
  const B = { openverse: 'https://api.openverse.org', nasa: 'https://images-api.nasa.gov', pexels: 'https://api.pexels.com', pixabay: 'https://pixabay.com', unsplash: 'https://api.unsplash.com', ...bases };
  const F = {
    // Openverse : anonyme (quelques recherches par heure sans compte) ; licences qui autorisent de recadrer et de réutiliser
    async openverse(q, { vertical, limit }) {
      const j = await getJson(`${B.openverse}/v1/images/?${new URLSearchParams({ q, license: 'cc0,pdm,by,by-sa', page_size: String(Math.min(limit, 30)), aspect_ratio: vertical ? 'tall' : 'wide', category: 'photograph', mature: 'false' })}`);
      return (j.results || []).filter(x => x.url && x.width >= 800 && x.height >= 450).map((x, k) => fabrique({ nom: nettoyer(x.title) || 'Photo', url: x.url, apercu: x.thumbnail || '', largeur: x.width, hauteur: x.height,
        auteur: nettoyer(x.creator) || 'auteur inconnu', licence: `${String(x.license || '').toUpperCase()}${x.license_version ? ' ' + x.license_version : ''}`.trim() || 'licence libre', page: x.foreign_landing_url || '',
        description: (x.tags || []).map(t => t.name).join(' ') }, 'Openverse', k));
    },
    // NASA : domaine public ; la taille exacte n'est pas donnée (grande version ~large)
    async nasa(q, { limit }) {
      const j = await getJson(`${B.nasa}/search?${new URLSearchParams({ q, media_type: 'image', page_size: String(Math.min(limit, 30)) })}`);
      return ((j.collection && j.collection.items) || []).map((it, k) => { const d = (it.data || [])[0] || {}, prev = ((it.links || [])[0] || {}).href || '';
        if (!prev || !d.nasa_id) return null;
        return fabrique({ nom: nettoyer(d.title) || 'Photo NASA', url: prev.replace('~thumb.', '~large.'), apercu: prev, largeur: 0, hauteur: 0, auteur: nettoyer(d.photographer || d.secondary_creator || d.center || 'NASA'), licence: 'Domaine public (NASA)',
          page: `https://images.nasa.gov/details/${d.nasa_id}`, description: nettoyer(d.description).slice(0, 240) + ' ' + (d.keywords || []).join(' ') }, 'NASA', k); }).filter(Boolean);
    },
    async pexels(q, { vertical, limit, cle }) {
      const j = await getJson(`${B.pexels}/v1/search?${new URLSearchParams({ query: q, per_page: String(Math.min(limit, 40)), orientation: vertical ? 'portrait' : 'landscape', locale: 'fr-FR' })}`, { Authorization: cle });
      return (j.photos || []).filter(x => x.src).map((x, k) => ({ ...fabrique({ nom: nettoyer(x.alt) || `Photo Pexels ${x.id}`, url: x.src.large2x || x.src.large || x.src.original, apercu: x.src.medium || x.src.small || '', largeur: x.width, hauteur: x.height,
        auteur: nettoyer(x.photographer) || 'auteur inconnu', licence: 'Licence Pexels', page: x.url || '', description: nettoyer(x.alt) }, 'Pexels', k), qualite: true }));
    },
    async pixabay(q, { vertical, limit, cle }) {
      const j = await getJson(`${B.pixabay}/api/?${new URLSearchParams({ key: cle, q, lang: 'fr', image_type: 'photo', orientation: vertical ? 'vertical' : 'horizontal', per_page: String(Math.max(3, Math.min(limit, 40))), safesearch: 'true' })}`);
      return (j.hits || []).filter(x => x.largeImageURL).map((x, k) => ({ ...fabrique({ nom: (x.tags || `Photo Pixabay ${x.id}`).split(',').map(t => t.trim()).slice(0, 4).join(', '), url: x.largeImageURL, apercu: x.webformatURL || x.previewURL || '', largeur: x.imageWidth, hauteur: x.imageHeight,
        auteur: nettoyer(x.user) || 'auteur inconnu', licence: 'Licence Pixabay', page: x.pageURL || '', description: x.tags || '' }, 'Pixabay', k), qualite: true }));
    },
    async unsplash(q, { vertical, limit, cle }) {
      const j = await getJson(`${B.unsplash}/search/photos?${new URLSearchParams({ query: q, per_page: String(Math.min(limit, 30)), orientation: vertical ? 'portrait' : 'landscape', content_filter: 'high' })}`, { Authorization: 'Client-ID ' + cle, 'Accept-Version': 'v1' });
      return (j.results || []).filter(x => x.urls).map((x, k) => ({ ...fabrique({ nom: nettoyer(x.description || x.alt_description) || `Photo Unsplash ${x.id}`, url: `${x.urls.raw}${x.urls.raw.includes('?') ? '&' : '?'}w=1920&fm=jpg&q=80&fit=max`, apercu: x.urls.small || x.urls.thumb || '', largeur: x.width, hauteur: x.height,
        auteur: nettoyer(x.user && x.user.name) || 'auteur inconnu', licence: 'Licence Unsplash', page: (x.links && x.links.html) || '', description: nettoyer(`${x.description || ''} ${x.alt_description || ''}`) }, 'Unsplash', k),
        qualite: true, suivi: (x.links && x.links.download_location) || '', cleSuivi: cle }));
    }
  };
  // recherche dans les banques demandées, en parallèle ; une banque en panne (ou sans clé) est simplement ignorée
  async function chercher(q, { actives = ['openverse', 'nasa'], vertical = false, limit = 20 } = {}) {
    const requetes = actives.filter(id => F[id] && (!BANQUES.find(b => b.id === id).cle || cles[id])).map(async id => {
      try { return await F[id](q, { vertical, limit, cle: cles[id] }); } catch (e) { return []; }
    });
    return (await Promise.all(requetes)).flat();
  }
  // Unsplash demande de signaler chaque photo réellement utilisée
  async function signaler(im) {
    if (im && im.suivi && im.cleSuivi) { try { await getJson(im.suivi, { Authorization: 'Client-ID ' + im.cleSuivi, 'Accept-Version': 'v1' }); } catch (e) { /* sans importance */ } }
  }
  return { chercher, signaler, F };
}

module.exports = { creer, BANQUES, getJson };
