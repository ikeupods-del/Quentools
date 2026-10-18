// Contrôle d'une fiche d'épisode QuentInvest (design/quentinvest-youtube/fiches/NN-sujet.json) avant fabrication :
// structure, longueur (5 minutes au moins), phrases courtes pour l'oreille, chiffres retrouvés dans les sources, conseils interdits,
// mots difficiles absents du dictionnaire de prononciation. Aucune voix ni IA : le même contrôle sert à une fiche écrite à la main ou par l'IA.
// Usage : node fiche-quentinvest.js <fiche.json> [faits.txt]
'use strict';
const fs = require('fs');

const MOTS_MINI = 800;           // ≈ 5 minutes de voix (la chaîne refuse en dessous de 300 s)
const PHRASE_MAX = 20, BLOC_MAX = 45;
// un conseil, c'est un ordre donné au spectateur (début de phrase ou de proposition), pas une description (« on n'achète pas toujours le bulbe »)
const CONSEILS = /(?:^|[.!?,;:]\s+)(?:ach[eè]te|vends|investis|place|mise|emprunte)\b[^.!?]{0,40}|\b(?:tu\s+dois\s+(?:acheter|vendre|investir)|je\s+te\s+conseille|nous\s+te\s+conseillons|rendement\s+garanti|gain\s+garanti|sans\s+risque|tu\s+vas\s+(?:gagner|devenir\s+riche)|devenir\s+riche|argent\s+facile)\b/i;
const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const nbMots = t => (String(t || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

// textes dits, dans l'ordre de la vidéo : [{ lieu, texte }]
function textesDits(f) {
  const l = [];
  const ajoute = (lieu, texte) => { if (texte && String(texte).trim()) l.push({ lieu, texte: String(texte) }); };
  if (f.accroche) ajoute('accroche', f.accroche.texte);
  if (f.intro) ajoute('intro', f.intro.texte);
  (f.blocs || []).forEach((b, i) => ajoute(`bloc ${i + 1}${b.section ? ' (' + b.section + ')' : ''}`, b.texte));
  if (f.piege) { ajoute('piège', f.piege.intro); (f.piege.erreurs || []).forEach((e, i) => ajoute(`erreur ${i + 1}`, e.texte)); }
  if (f.recap) ajoute('à retenir', f.recap.texte);
  if (f.resume) ajoute('résumé', f.resume.texte);
  if (f.question) ajoute('question', f.question);
  if (f.suite) ajoute('suite', f.suite.texte);
  return l;
}

// « 5 000 » → 5000, « 1,5 » → 1.5 ; seuls les nombres de plus de deux chiffres ou décimaux comptent (les petits comptes « trois erreurs » ne sont pas des faits)
function nombres(t) {
  const sortie = new Set();
  for (const m of String(t).matchAll(/\d{1,3}(?:[  ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g)) {
    const brut = m[0].replace(/[  ]/g, '').replace(',', '.');
    if (/^\d+(\.\d+)?$/.test(brut) && (brut.length >= 2 || brut.includes('.'))) sortie.add(String(+brut));
  }
  return sortie;
}

function controler(f, { faits = '', lexique = {} } = {}) {
  const erreurs = [], avertissements = [], infos = [];
  const manque = ['numero', 'slug', 'titre', 'promesse', 'description', 'question', 'sources', 'miniature'].filter(k => f[k] == null || f[k] === '');
  if (!f.accroche || !f.accroche.texte || !f.accroche.ecran) manque.push('accroche (texte + ecran)');
  if (!Array.isArray(f.blocs) || !f.blocs.length) manque.push('blocs');
  if (!f.resume || !f.resume.texte) manque.push('resume.texte');
  if (manque.length) erreurs.push('Fiche incomplète : ' + manque.join(', '));
  (f.blocs || []).forEach((b, i) => { if (!b.texte || !b.ecran) erreurs.push(`Bloc ${i + 1} : « texte » et « ecran » sont obligatoires`); });

  const dits = textesDits(f), mots = dits.reduce((t, x) => t + nbMots(x.texte), 0);
  const secondes = Math.round(mots * 0.46 * 0.78 / 0.82 + dits.length * 0.7);
  infos.push(`${mots} mots dits, environ ${Math.floor(secondes / 60)} min ${String(secondes % 60).padStart(2, '0')} s de voix`);
  if (mots < MOTS_MINI) (secondes < 300 ? erreurs : avertissements).push(`Trop court : ${mots} mots (environ ${MOTS_MINI} nécessaires pour 5 minutes) ; ajoute ${MOTS_MINI - mots} mots, par exemple 2 ou 3 blocs.`);

  const longues = [];
  for (const x of dits) {
    if (/^bloc/.test(x.lieu) && nbMots(x.texte) > BLOC_MAX) avertissements.push(`${x.lieu} : ${nbMots(x.texte)} mots, coupe-le en deux (${BLOC_MAX} au plus).`);
    for (const ph of x.texte.split(/(?<=[.!?…])\s+/)) if (nbMots(ph) > PHRASE_MAX) longues.push(`${x.lieu} : « ${ph.slice(0, 70)}… » (${nbMots(ph)} mots)`);
  }
  if (longues.length) avertissements.push(`${longues.length} phrase(s) de plus de ${PHRASE_MAX} mots, difficiles à écouter : ` + longues.slice(0, 6).join(' ; ') + (longues.length > 6 ? ' …' : ''));

  // chiffres : retrouvés dans les sources, les faits donnés, l'écran ou un calcul de la chaîne
  const base = [JSON.stringify(f.sources || []), faits, JSON.stringify(f.accroche && f.accroche.ecran || {}), JSON.stringify(f.blocs ? f.blocs.map(b => b.ecran) : [])].join(' ');
  const connus = nombres(base), aSource = (f.sources || []).some(s => /Calculs? de la chaîne|Calcul QuentInvest/i.test(s));
  const sansSource = [];
  for (const x of dits.filter(y => y.lieu !== 'suite')) for (const n of nombres(x.texte)) if (!connus.has(n) && !(aSource && /calcul|donc|soit|ça fait|environ/i.test(x.texte))) sansSource.push(`${n} (${x.lieu})`);
  if (sansSource.length) avertissements.push('Chiffre(s) absent(s) des sources et des faits : ' + [...new Set(sansSource)].slice(0, 12).join(', ') + '. Ajoute la source ou retire le chiffre.');

  for (const x of dits) { const m = CONSEILS.exec(x.texte); if (m) avertissements.push(`${x.lieu} : « ${m[0].replace(/^[.!?,;:\s]+/, '').trim()} » ressemble à un conseil en investissement, à reformuler.`); if (/https?:\/\/|www\./i.test(x.texte)) avertissements.push(`${x.lieu} : aucun lien dans le texte dit.`); }

  if (f.accroche && f.accroche.texte && !/\d|\?/.test(f.accroche.texte)) avertissements.push('Accroche : ni chiffre ni question dans les premières secondes.');
  if (f.accroche && f.accroche.ecran && !/\d/.test(JSON.stringify(f.accroche.ecran))) avertissements.push('Accroche : mets un chiffre choc à l’écran.');
  const courts = (f.blocs || []).filter(b => b.court).length + (f.accroche && f.accroche.court ? 1 : 0);
  if (courts < 4) avertissements.push(`Version TikTok : ${courts} bloc(s) avec « court » ; il en faut 6 à 8 pour une minute.`);
  if (f.sourcesExternes !== false && !(f.sources || []).length) erreurs.push('Aucune source : chaque fait chiffré doit en avoir une.');
  if (!f.mention) infos.push('Mention par défaut : « Vulgarisation · pas un conseil en investissement ».');

  // mots difficiles : noms propres en milieu de phrase et sigles absents du dictionnaire de prononciation
  const connu = new Set(Object.keys(lexique).map(k => k.toLowerCase())), difficiles = new Map();
  for (const x of dits) for (const ph of x.texte.split(/(?<=[.!?…:])\s+/)) {
    const tokens = ph.match(/[\p{L}][\p{L}'’-]*/gu) || [];
    tokens.forEach((w, i) => {
      const sigle = w.length >= 2 && w === w.toUpperCase() && /^\p{Lu}+$/u.test(w), propre = i > 0 && /^\p{Lu}\p{Ll}{3,}/u.test(w);
      if ((sigle || propre) && !connu.has(w.toLowerCase()) && !connu.has(sansAccents(w))) difficiles.set(w, (difficiles.get(w) || 0) + 1);
    });
  }
  if (difficiles.size) avertissements.push(`Mots à vérifier dans le dictionnaire de prononciation (${difficiles.size}) : ` + [...difficiles.keys()].slice(0, 25).join(', ') + (difficiles.size > 25 ? ' …' : ''));

  return { ok: !erreurs.length, erreurs, avertissements, infos, mots, secondes, difficiles: [...difficiles.keys()] };
}

module.exports = { controler, textesDits, nombres };

if (require.main === module) {
  const [, , fiche, faits] = process.argv;
  if (!fiche) { console.log('Usage : node fiche-quentinvest.js <fiche.json> [faits.txt]'); process.exit(1); }
  let lexique = {}; try { lexique = require('./voix-texte').lexiqueActuel(); } catch (e) { /* sans dictionnaire */ }
  const r = controler(JSON.parse(fs.readFileSync(fiche, 'utf8')), { faits: faits ? fs.readFileSync(faits, 'utf8') : '', lexique });
  for (const x of r.infos) console.log('ℹ ' + x); for (const x of r.erreurs) console.log('✗ ' + x); for (const x of r.avertissements) console.log('⚠ ' + x);
  console.log(r.ok ? '✓ Fiche fabricable.' : '✗ Fiche à corriger avant fabrication.'); process.exit(r.ok ? 0 : 1);
}
