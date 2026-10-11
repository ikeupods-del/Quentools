// QuentMovie : contrôle de la qualité des textes écrits par l'IA locale (scène par scène), sans appeler l'IA.
// Un texte refusé est réécrit (température plus basse) ; en dernier recours, la source d'origine est reprise.
'use strict';
const { normalise } = require('./images');

const nbMots = t => String(t || '').split(/\s+/).filter(Boolean).length;
const MOTS_FR = new Set('le la les un une des du de d l et est en a au aux pour que qui dans sur ce cet cette ces se sa son ses leur leurs il elle ils elles on nous vous je tu ne pas plus par avec sans mais ou donc car si comme entre vers chez depuis apres avant pendant puis alors ainsi sont ete etre fait'.split(' '));

// Texte brut de l'IA → texte à dire à voix haute (sans balises, étiquettes, listes, émojis ; phrase finale complète)
function nettoyerTexte(t) {
  t = String(t || '').replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<\/?think>/g, '')
    .replace(/^\s*(?:voici|bien s[uû]r|d'accord|certainement)[^\n:]*:\s*/i, '')
    .replace(/^\s*(?:sc[eè]ne|texte|voix off|narration|accroche|conclusion)\s*\d*(?:\s*\/\s*\d+)?\s*[:\-–]\s*/i, '')
    .replace(/[*_#`>]+/g, '').replace(/[«»"“”]/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/^\s*[-•]\s+/gm, '').replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (t && !/[.!?…]$/.test(t)) { const k = Math.max(t.lastIndexOf('. '), t.lastIndexOf('! '), t.lastIndexOf('? ')); if (k > 20) t = t.slice(0, k + 1); }
  return t;
}
const nombresDe = t => new Set((String(t || '').match(/\d+(?:[.,]\d+)?/g) || []).map(x => x.replace(',', '.')));
const mots = t => new Set(normalise(t).split(/[^a-z0-9]+/).filter(Boolean));
const nomsPropres = t => [...String(t || '').matchAll(/(?<=[a-zà-ÿ0-9,;:)]\s)([A-ZÀ-ÖØ-Þ][\p{L}'’-]{2,})/gu)].map(m => normalise(m[1]));
const francais = t => { const l = normalise(t).split(/[^a-z0-9]+/).filter(Boolean); return l.length ? l.filter(m => MOTS_FR.has(m)).length / l.length : 0; };
const OUVERTURE = /^\s*(bonjour|salut|bienvenue|coucou|hello|hey|aujourd'hui|dans cette vid[ée]o|dans cet|voici|imaginez|vous (?:savez|connaissez|vous êtes)|savez-vous|et si)/i;
const FIN = /(n'oubliez pas|abonn|merci d'avoir|[àa] bient[oô]t|[àa] la prochaine|en conclusion|pour conclure|en r[ée]sum[ée]|[ée]crivez-nous|dites-nous|commentaires|partagez|like)/i;

// opts : { min, max, source (texte dont les faits doivent venir), interdireOuverture, interdireFin }
// → '' si le texte est bon, sinon la raison du refus
function verifier(t, { min = 8, max = 80, source = '', interdireOuverture = false, interdireFin = false } = {}) {
  const n = nbMots(t);
  if (!t) return 'vide';
  if (n < min) return `trop court (${n} mots)`;
  if (n > max) return `trop long (${n} mots)`;
  if (!/[.!?…]$/.test(t)) return 'phrase non terminée';
  if (francais(t) < 0.14) return 'pas du français';
  const l = normalise(t).split(/[^a-z0-9]+/).filter(Boolean), vus = new Set();
  for (let i = 0; i + 4 <= l.length; i++) { const g = l.slice(i, i + 4).join(' '); if (vus.has(g)) return 'répétition'; vus.add(g); }
  const phrases = t.split(/(?<=[.!?…])\s+/).map(x => normalise(x).replace(/[^a-z0-9 ]/g, '').trim()).filter(x => x.length > 12);
  if (new Set(phrases).size < phrases.length) return 'phrase répétée';
  if (/^(voici|bien sûr|d'accord|certainement|sc[eè]ne)\b/i.test(t) || /\bsc[eè]ne \d/i.test(t)) return 'phrase de présentation de l’IA';
  const permis = nombresDe(source);
  for (const x of nombresDe(t)) if (!permis.has(x)) return `chiffre inventé (${x})`;
  if (source) { const connus = mots(source); for (const p of nomsPropres(t)) if (!connus.has(p) && !connus.has(p.replace(/s$/, ''))) return `nom inventé (${p})`; }
  if (interdireOuverture && OUVERTURE.test(t)) return 'formule d’introduction interdite';
  if (interdireFin && FIN.test(t)) return 'formule de conclusion interdite';
  return '';
}

module.exports = { nettoyerTexte, verifier, nbMots, nombresDe, nomsPropres, francais };
