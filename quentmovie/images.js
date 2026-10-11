// QuentMovie : choix des images du générateur. Chaque image candidate (Wikimedia Commons) reçoit une note de pertinence
// pour une scène : mots de la scène retrouvés dans son titre, sa description et ses catégories, qualité, définition,
// cadrage horizontal ; les documents scannés, cartes, schémas et séries de photos quasi identiques sont écartés.
// Une scène sans image assez bonne n'a pas d'image (la vidéo montre alors une carte de titre, plutôt qu'une photo hors sujet).
'use strict';

const MOTS_VIDES = new Set(('le la les un une des du de d l et en au aux a est sont ete etre avec sans pour par sur sous dans qui que quoi dont ou ce cet cette ces se sa son ses leur leurs il elle ils elles on nous vous je tu ' +
  'y ne pas plus tres aussi mais donc car si comme entre vers chez depuis apres avant pendant puis alors ainsi tout tous toute toutes fait faire deux trois premier premiere ' +
  'the of and in on at to for with by from as is are was were an this that its their into over under about between').split(' '));
const normalise = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ');
// mots trop vagues pour prouver qu'une photo est sur le sujet
const VAGUES = new Set('view photo picture image corner business family people thing way life time day part side area place scene group general'.split(' '));
const racine = m => m.replace(/(eaux|aux)$/, 'al').replace(/(s|x)$/, '');
// mots utiles d'un texte (sans mots vides, au singulier approximatif), sans doublon
const termes = t => [...new Set(normalise(t).split(/[^a-z0-9]+/).filter(m => m.length > 2 && !MOTS_VIDES.has(m) && !VAGUES.has(m) && (!/^\d+$/.test(m) || /^\d{4}$/.test(m))).map(racine))];

// documents, cartes, schémas, objets sur fond blanc, reproductions : rarement de bonnes illustrations pour une vidéo
const REFUSE = /\b(white background|fond blanc|isolated|cutout|detoure|scan|scanned|page \d|pages?\b|plate \d|tafel|djvu|pdf|diagram|diagramme|sch[eé]ma|graph|chart|map of|map|carte|locator|location map|plan de|plan du|poster|flyer|stamp|timbre|banknote|billet de|coin\b|monnaie|signature|autograph|manuscript|manuscrit|newspaper|journal du|screenshot|capture d|infographic|template|logo|icon|flag|drapeau|blason|coat of arms|sprite|vector|transparent|cutout)\b/;
const serieDe = nom => normalise(String(nom).replace(/\.\w+$/, '')).replace(/[\s_-]*[(\[]?\d+[)\]]?$/, '').replace(/\s+/g, ' ').trim();

// note d'une image pour une scène : requete = { mots: termes de la scène, ancre: termes du sujet général, vertical: format vertical }
function noterImage(im, { mots = [], ancre = [], vertical = false, obligatoire = false } = {}) {
  const titre = normalise(im.nom), texte = im.texte || titre;
  const dessous = (m, dans) => dans.split(/[^a-z0-9]+/).some(x => racine(x) === m);
  let s = 0, trouves = 0;
  for (const m of mots) {
    if (dessous(m, titre)) { s += 3; trouves++; } else if (dessous(m, normalise(im.description || ''))) { s += 2; trouves++; } else if (dessous(m, texte)) { s += 1.2; trouves++; }
  }
  if (ancre.length) s += im.deArticle ? 0.5 : ancre.some(m => dessous(m, texte)) ? 1.5 : obligatoire ? -6 : -1; // les photos de l'article lui-même sont sur le sujet par construction
  if (im.qualite) s += 2;
  if (im.source && im.rang !== undefined) s += Math.max(0, 1.5 - im.rang * 0.25); // les premiers résultats d'une banque sont les plus pertinents selon elle
  const l = im.largeur || 0, h = im.hauteur || 1, r = l / h;
  if (l) s += l >= 2400 ? 1 : l >= 1600 ? 0.7 : l >= 1280 ? 0.3 : l >= 960 ? -0.5 : -2.5;
  // le cadrage doit correspondre au format de la vidéo : une photo verticale dans une vidéo horizontale (ou l'inverse) serait coupée en bandeau
  if (!l) { /* dimensions inconnues : pas de jugement de cadrage */ } else if (vertical) s += r < 0.9 ? 1 : r > 1.6 ? -3 : 0; else s += r < 0.9 ? -6 : r < 1.1 ? -2.5 : r >= 1.4 && r <= 2.1 ? 0.8 : 0;
  if (REFUSE.test(normalise(im.nom) + ' ' + normalise(im.description || '').slice(0, 120))) s -= 5;
  if (/geograph/i.test(im.nom)) s -= 2;
  if (/\bimg[_ ]?\d{3,}|\bdsc[_ ]?\d{3,}/i.test(im.nom) && !im.description) s -= 1;
  return { note: s, trouves };
}

// Mots de recherche tirés du texte d'une scène quand l'IA n'en a pas donné : noms propres d'abord, puis les mots les plus longs
function requeteDeScene(texte, max = 3) {
  const propres = [...String(texte || '').matchAll(/(?<![.!?]\s)(?<!^)\b[A-ZÀ-ÖØ-Þ][\p{L}-]{3,}/gu)].map(m => m[0]);
  const autres = termes(texte).filter(m => m.length > 4).sort((a, b) => b.length - a.length);
  return [...new Set([...propres.map(p => normalise(p)).map(racine), ...autres])].slice(0, max);
}

const SEUIL = 5;
// Attribue une image à chaque scène parmi `pool` : meilleure note, jamais deux fois la même image ni la même série.
// reqs[i] = { mots, ancre } ; renvoie les indices (-1 = aucune image assez bonne) et, pour chaque scène, ses meilleures propositions.
function attribuer(reqs, pool, { vertical = false, seuil = SEUIL, propositions = 6, obligatoire = false } = {}) {
  const utilisees = new Set(), series = new Set(), choix = [], listes = [];
  const notes = reqs.map(rq => pool.map((im, k) => ({ k, ...noterImage(im, { ...rq, vertical, obligatoire }) })).sort((a, b) => b.note - a.note));
  // les scènes les mieux servies choisissent d'abord, pour que chacune garde sa meilleure photo
  const ordre = reqs.map((_, i) => i).sort((a, b) => ((notes[b][0] || {}).note || -99) - ((notes[a][0] || {}).note || -99));
  const res = new Array(reqs.length).fill(-1);
  for (const i of ordre) {
    const ok = notes[i].find(c => c.note >= seuil && !utilisees.has(c.k) && !series.has(serieDe(pool[c.k].nom)));
    if (ok) { res[i] = ok.k; utilisees.add(ok.k); series.add(serieDe(pool[ok.k].nom)); }
  }
  for (let i = 0; i < reqs.length; i++) {
    choix.push(res[i]);
    const vus = new Set(); // propositions : bonnes notes, une seule par série
    listes.push(notes[i].filter(c => c.note >= seuil - 1.5 && !vus.has(serieDe(pool[c.k].nom)) && vus.add(serieDe(pool[c.k].nom))).slice(0, propositions).map(c => c.k));
  }
  return { choix, listes };
}

module.exports = { termes, noterImage, requeteDeScene, attribuer, serieDe, normalise, SEUIL };
