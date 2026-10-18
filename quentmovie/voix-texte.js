// QuentMovie : texte écrit → texte prononcé. Les voix de synthèse lisent « 9h » comme « neuf hache » ;
// ici heures, sommes, pourcentages, unités, ordinaux et abréviations sont écrits comme on les dit.
// Appliqué à toutes les voix (Piper et Mac) ; les sous-titres gardent le texte d'origine. Aucun appel à l'IA.
// Dictionnaire de prononciation : prononciations.json (livré) + ~/Movies/QuentMovie/prononciations.json (celui de l'utilisateur, prioritaire).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

const LIVRE = path.join(__dirname, 'prononciations.json');
let persoChemin = process.env.QM_PRONONCIATIONS || path.join(os.homedir(), 'Movies', 'QuentMovie', 'prononciations.json');
const definirFichierPerso = f => { persoChemin = f; cache = null; };
const lireMots = f => { try { const d = JSON.parse(fs.readFileSync(f, 'utf8')); return d && typeof d.mots === 'object' && d.mots ? d.mots : {}; } catch (e) { return {}; } };
const horodate = f => { try { return fs.statSync(f).mtimeMs; } catch (e) { return 0; } };
let cache = null; // { cle, mots, re }
const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Fusion livré + perso (une valeur vide ou null retire un mot livré), puis une seule expression : les mots longs d'abord, une passe, sans enchaînement
function lexique() {
  const cle = horodate(LIVRE) + '|' + horodate(persoChemin) + '|' + persoChemin;
  if (cache && cache.cle === cle) return cache;
  const mots = {}; for (const [k, v] of Object.entries({ ...lireMots(LIVRE), ...lireMots(persoChemin) })) if (k && !k.startsWith('_') && typeof v === 'string' && v.trim()) mots[k.trim()] = v.trim();
  const cles = Object.keys(mots).sort((a, b) => b.length - a.length);
  // un sigle écrit en majuscules (PEA, TRI) n'est remplacé qu'en majuscules ; les autres mots sans tenir compte de la casse
  const majuscule = k => /\p{L}/u.test(k) && k === k.toUpperCase();
  const tableau = new Map(cles.map(k => [k.toLowerCase(), { cle: k, lu: mots[k], sigle: majuscule(k) }]));
  const re = cles.length ? new RegExp('(?<![\\p{L}\\p{N}])(?:' + cles.map(echapper).join('|') + ')s?(?![\\p{L}\\p{N}])', 'giu') : null;
  return (cache = { cle, mots, re, tableau });
}
function appliquerLexique(t) {
  const L = lexique(); if (!L.re) return t;
  return t.replace(L.re, m => {
    let e = L.tableau.get(m.toLowerCase()), pl = '';
    if (!e && /s$/i.test(m)) { e = L.tableau.get(m.slice(0, -1).toLowerCase()); pl = e && !e.sigle && !/s$/.test(e.lu) ? 's' : ''; if (e && e.sigle) return m; } // pluriel : « krachs » → « cracs »
    if (!e || (e.sigle && m !== e.cle)) return m;
    return (/^\p{Lu}/u.test(m) && /^\p{Ll}/u.test(e.lu) && m !== m.toUpperCase() ? e.lu[0].toUpperCase() + e.lu.slice(1) : e.lu) + pl; // « Krach » → « Crac »
  });
}

const ORD = ['', 'premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième', 'dixième', 'onzième', 'douzième', 'treizième', 'quatorzième', 'quinzième',
  'seizième', 'dix-septième', 'dix-huitième', 'dix-neuvième', 'vingtième', 'vingt et unième', 'vingt-deuxième', 'vingt-troisième', 'vingt-quatrième', 'vingt-cinquième', 'vingt-sixième', 'vingt-septième',
  'vingt-huitième', 'vingt-neuvième', 'trentième'];
const ordinal = (n, fem) => { const w = n === 1 ? (fem ? 'première' : 'premier') : (ORD[n] || n + 'ième'); return w; };
const romain = s => { const v = { I: 1, V: 5, X: 10, L: 50 }; let n = 0; for (let i = 0; i < s.length; i++) { const a = v[s[i]], b = v[s[i + 1]] || 0; n += a < b ? -a : a; } return n; };
// 1 et 1,5 restent au singulier ; au-delà, pluriel
const pluriel = (nb, s, p) => (/^[01](?:[.,]\d+)?$/.test(nb.trim()) ? s : p);
const NB = '(\\d+(?:[.,]\\d+)?)';

const UNITES = [ // [motif, singulier, pluriel] — toujours précédées d'un nombre
  ['km\\s?\\/\\s?h', 'kilomètre-heure', 'kilomètres-heure'], ['m\\s?\\/\\s?s', 'mètre par seconde', 'mètres par seconde'],
  ['km²', 'kilomètre carré', 'kilomètres carrés'], ['m²', 'mètre carré', 'mètres carrés'], ['m³', 'mètre cube', 'mètres cubes'], ['ha', 'hectare', 'hectares'],
  ['km', 'kilomètre', 'kilomètres'], ['cm', 'centimètre', 'centimètres'], ['mm', 'millimètre', 'millimètres'], ['m', 'mètre', 'mètres'],
  ['kg', 'kilo', 'kilos'], ['mg', 'milligramme', 'milligrammes'], ['g', 'gramme', 'grammes'], ['t', 'tonne', 'tonnes'],
  ['ml', 'millilitre', 'millilitres'], ['cl', 'centilitre', 'centilitres'], ['dl', 'décilitre', 'décilitres'], ['l', 'litre', 'litres'],
  ['Go', 'gigaoctet', 'gigaoctets'], ['Mo', 'mégaoctet', 'mégaoctets'], ['Ko', 'kilooctet', 'kilooctets'], ['To', 'téraoctet', 'téraoctets'],
  ['kW', 'kilowatt', 'kilowatts'], ['W', 'watt', 'watts'], ['V', 'volt', 'volts'], ['Hz', 'hertz', 'hertz'], ['kHz', 'kilohertz', 'kilohertz'], ['MHz', 'mégahertz', 'mégahertz'], ['GHz', 'gigahertz', 'gigahertz'],
  ['min', 'minute', 'minutes'], ['sec', 'seconde', 'secondes']
];

const ABREV = [
  [/\bav\.\s?J\.?-?C\.?/g, 'avant Jésus-Christ'], [/\bapr\.\s?J\.?-?C\.?/g, 'après Jésus-Christ'],
  [/\bM\.(?=\s)/g, 'monsieur'], [/\bMM\.(?=\s)/g, 'messieurs'], [/\bMme\b\.?/g, 'madame'], [/\bMlle\b\.?/g, 'mademoiselle'], [/\bMmes\b\.?/g, 'mesdames'],
  [/\bDr\b\.?/g, 'docteur'], [/\bPr\b\.?(?=\s+[A-ZÉ])/g, 'professeur'], [/\bSte\b\.?(?=\s)/g, 'sainte'], [/\bSt\b\.?(?=\s)/g, 'saint'],
  [/\bn°\s?(?=\d)/gi, 'numéro '], [/\betc\.\.\./gi, 'et cetera'], [/\betc\./gi, 'et cetera'], [/\bcf\.\s/gi, 'voir '], [/\benv\.\s?(?=\d)/g, 'environ '], [/\bvs\.?\s/gi, 'contre '],
  [/\bJ\.-C\./g, 'Jésus-Christ'], [/\bp\.\s?ex\./gi, 'par exemple'], [/\bc.-à-d\./gi, 'c’est-à-dire'], [/\bi\.e\./gi, 'c’est-à-dire']
];

function pourLaVoix(texte) {
  let t = appliquerLexique(String(texte == null ? '' : texte));
  t = t.replace(/\s?≈\s?/g, ' environ ').replace(/\s?×\s?/g, ' fois ').replace(/\s?÷\s?/g, ' divisé par ').replace(/\s?→\s?/g, ', ');
  // guillemets, tirets longs et puces : inutiles à l'oral
  t = t.replace(/[«»“”"]/g, '').replace(/\s[—–]\s/g, ', ').replace(/[•·▪]/g, ' ').replace(/…/g, '...');
  // nombres groupés par milliers : « 12 000 » → « 12000 » (sinon lus chiffre par chiffre)
  t = t.replace(/\b(\d{1,3})((?:[   ]\d{3})+)\b/g, (m, a, b) => a + b.replace(/[^\d]/g, ''));
  for (const [re, rep] of ABREV) t = t.replace(re, rep);
  // heures : 9h → 9 heures, 9h30 → 9 heures 30, 24h/24 → 24 heures sur 24
  t = t.replace(/\b(\d{1,2})\s?h\s?\/\s?(\d{1,2})\s?h?\b/g, '$1 heures sur $2');
  t = t.replace(/\b(\d{1,2})\s?h(?:\s?(\d{2}))?(?![\p{L}\d])/gu, (m, h, mn) => `${h} ${pluriel(h, 'heure', 'heures')}${mn ? ' ' + (mn === '00' ? '' : mn) : ''}`.trim());
  // sommes d'argent, pourcentages
  t = t.replace(new RegExp(NB + '\\s?M\\s?€', 'g'), (m, n) => `${n} ${pluriel(n, 'million', 'millions')} d’euros`);
  t = t.replace(new RegExp(NB + '\\s?[kK]\\s?€', 'g'), '$1 mille euros');
  t = t.replace(new RegExp(NB + '\\s?€', 'g'), (m, n) => `${n} ${pluriel(n, 'euro', 'euros')}`).replace(/€/g, ' euros');
  t = t.replace(new RegExp(NB + '\\s?\\$', 'g'), (m, n) => `${n} ${pluriel(n, 'dollar', 'dollars')}`).replace(/\$/g, ' dollars');
  t = t.replace(new RegExp(NB + '\\s?£', 'g'), (m, n) => `${n} ${pluriel(n, 'livre', 'livres')}`);
  t = t.replace(/\s?%/g, ' pour cent');
  t = t.replace(new RegExp(NB + '\\s?°\\s?C\\b', 'g'), (m, n) => `${n} ${pluriel(n, 'degré', 'degrés')} Celsius`).replace(/(\d)\s?°/g, '$1 degrés');
  // unités après un nombre
  for (const [u, s, p] of UNITES) t = t.replace(new RegExp(`(?<![\\p{L}\\d])${NB}\\s?${u}(?![\\p{L}\\d²³/])`, 'gu'), (m, n) => `${n} ${pluriel(n, s, p)}`);
  // ordinaux : 1er, 2e, 3ème, XIXe siècle
  t = t.replace(/\b1(er|re|ère)\b/g, (m, x) => ordinal(1, x !== 'er')).replace(/\b(\d{1,2})\s?(?:e|ème|eme|è)\b/g, (m, n) => ordinal(+n)).replace(/\b2nd(e)?\b/g, (m, f) => (f ? 'seconde' : 'second'));
  t = t.replace(/\b([IVXL]+)(er|re|ère|e|ème)\b/g, (m, r, x) => { const n = romain(r); return n >= 1 && n <= 30 ? ordinal(n, /^(re|ère)$/.test(x)) : m; });
  t = t.replace(/\s&\s/g, ' et ').replace(/(\d)\s?\+\s?(\d)/g, '$1 plus $2').replace(/\s\+\s/g, ' plus ');
  return t.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;])/g, '$1').trim();
}

module.exports = { pourLaVoix, definirFichierPerso, lexiqueActuel: () => ({ ...lexique().mots }), motsLivres: () => lireMots(LIVRE), motsPerso: () => lireMots(persoChemin), fichierPerso: () => persoChemin };
