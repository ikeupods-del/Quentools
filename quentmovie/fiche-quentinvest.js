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

// ---------- Ton script → fiche de Pico, par le programme seul (aucun mot ajouté au fond du script) ----------
// Une ligne courte sans point final (ou qui commence par #) = un titre de partie ; un paragraphe = une ou plusieurs répliques (45 mots au plus) ;
// l'écran de chaque réplique est choisi d'après son contenu : chiffre (nombre avec %, €, $), définition (« X, c'est… »), liste (lignes « - »), sinon message.
// Le premier paragraphe devient l'accroche, celui qui commence par « En une phrase » / « En résumé » (sinon le dernier) le résumé, la dernière question la question finale.
const phrasesDe = t => (String(t).replace(/\s+/g, ' ').trim().match(/[^.!?…]+[.!?…]+["»”)]*|[^.!?…]+$/g) || []).map(x => x.trim()).filter(Boolean);
const coupe = (t, n) => { t = String(t).replace(/\s+/g, ' ').trim(); if (t.length <= n) return t; const c = t.slice(0, n), k = c.lastIndexOf(' '); return (k > n * 0.5 ? c.slice(0, k) : c).replace(/[,;:]$/, '') + '…'; };
// texte d'un écran (ou d'une phrase dite) qui doit tenir en n caractères : jamais une phrase coupée au milieu ni « … ».
// Phrases entières d'abord ; sinon la phrase arrêtée à une virgule (« une villa, des voitures, des montres » → « une villa, etc. ») ;
// sinon coupée entre deux mots, sans finir sur un petit mot (« d'un », « de », « et »…). Les écrans réduisent leur texte s'il dépasse (AJUSTE).
const PETITS = /\s+(?:de|du|des|d['’]un|d['’]une|d['’]|un|une|le|la|les|l['’]|à|au|aux|en|et|ou|où|ce|cet|cette|ces|son|sa|ses|mon|ma|mes|ton|ta|tes|notre|nos|votre|vos|leur|leurs|qui|que|qu['’]|dont|pour|par|sur|avec|dans|sans|plus|très|mais|car|si|ne|n['’]|pas|tout|tous|toute|même|se|s['’]|y|il|elle|on|tu|je|nous|vous|ils|elles)$/i;
const DETERMINANT = /^(?:des|du|de la|de l['’]|les|la|le|l['’]|un|une|ses|sa|son|leurs?|mes|tes|nos|vos|\d)/i;
function resumer(t, n) {
  t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length <= n) return t;
  let r = ''; for (const p of phrasesDe(t)) { const x = r ? r + ' ' + p : p; if (x.length > n) break; r = x; }
  if (r) return r;
  const parts = t.split(/(?<=[,;:])\s+|\s+(?=[—–]\s)/); let acc = '', k = 0;
  for (const p of parts) { const x = acc ? acc + ' ' + p : p; if (x.length > n - 5) break; acc = x; k++; }
  const suite = parts[k] || '';
  if (acc.length >= n * 0.35 && k >= 1) {
    if (/,$/.test(acc) && DETERMINANT.test(suite) && (suite.match(/\S+/g) || []).length <= 5) return acc + ' etc.';
    return acc.replace(/\s*[,;:—–]$/, '');
  }
  let c = t.slice(0, n + 1); c = c.slice(0, Math.max(c.lastIndexOf(' '), 1)).replace(/[\s,;:—–]+$/, '');
  const lien = [...c.matchAll(/\s(?:et|mais|sans|car|donc|puis|alors|parce|quand|lorsque|pendant|avant|après|alors que|tandis)\s/gi)].map(m => m.index).filter(i => i >= n * 0.45).pop();
  if (lien) return c.slice(0, lien).replace(/[\s,;:—–]+$/, ''); // « …se croyait riche » plutôt que « …riche et personne ne voyait »
  for (let i = 0; i < 6 && PETITS.test(c); i++) c = c.replace(PETITS, '').replace(/[\s,;:—–]+$/, '');
  return c;
}
// dernier contrôle avant fabrication, quelle que soit l'origine de la fiche (IA, script, fiche écrite à la main) : un texte d'écran ne finit
// jamais par « … » ni par un petit mot (« d'un », « et ») ; renvoie le nombre de textes corrigés
function finirEcrans(fiche) {
  let n = 0;
  const finir = t => { let c = String(t).replace(/\s*(?:…|\.{3})\s*$/, '').replace(/[\s,;:—–]+$/, ''); for (let i = 0; i < 6 && PETITS.test(c); i++) c = c.replace(PETITS, '').replace(/[\s,;:—–]+$/, ''); return c; };
  const ecran = e => { if (!e || typeof e !== 'object') return; for (const k of Object.keys(e)) {
    if (typeof e[k] === 'string' && k !== 'type' && k !== 'source' && /(?:…|\.{3})\s*$|\s(?:de|du|des|d['’]un|d['’]une|un|une|le|la|les|et|ou|à|au|en)$/i.test(e[k])) { const v = finir(e[k]); if (v && v !== e[k]) { e[k] = v; n++; } }
    else if (Array.isArray(e[k])) e[k].forEach((x, i) => { if (typeof x === 'string' && /(?:…|\.{3})\s*$/.test(x)) { const v = finir(x); if (v) { e[k][i] = v; n++; } } }); } };
  const parcourir = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(parcourir); for (const [k, v] of Object.entries(o)) { if (k === 'ecran' || k === 'ecranTiktok') ecran(v); else parcourir(v); } };
  parcourir(fiche); return n;
}
// phrase dite par la voix : résumée comme un écran, et toujours terminée par une ponctuation
const resumerDit = (t, n) => { const r = resumer(t, n); return /[.!?…»"”)]$/.test(r) ? r : r + '.'; };
const NOMBRE = /(?:≈\s*)?\d[\d\s  ]*(?:[.,]\d+)?\s*(?:%|€|\$|euros?\b|dollars?\b|ans?\b|mois\b|millions?\b|milliards?\b)/i;
function ecranDe(texte, section, points, titreListe) {
  if (points && points.length >= 2) return { type: 'liste', titre: resumer(titreListe || section || '', 60), points: points.slice(0, 6).map(x => resumer(x.replace(/^./, c => c.toUpperCase()), 70)) };
  const ph = phrasesDe(texte), n = NOMBRE.exec(texte);
  if (n) { const p = ph.find(x => x.includes(n[0].trim())) || ph[0] || ''; return { type: 'chiffre', valeur: n[0].replace(/\s+/g, ' ').trim(), legende: resumer(p, 110) }; }
  const d = /^(?:l[ea]s?\s+|l'|un[e]?\s+)?([\p{L}\p{N}'’ -]{2,32}?),?\s+(?:c'est|c’est|est|désigne|signifie)\s+(.{8,})$/iu.exec(ph[0] || '');
  if (d) return { type: 'definition', mot: d[1].trim().replace(/^./, c => c.toUpperCase()), texte: resumer(d[2].replace(/[.!]$/, ''), 130) };
  return { type: 'message', titre: resumer(section || ph[0] || '', section ? 60 : 90), sous: resumer(section ? ph[0] || '' : ph[1] || '', 150) };
}
const repliques = t => { // un paragraphe trop long devient plusieurs répliques (40 mots environ), sans couper une phrase
  const l = [], ph = phrasesDe(t); let cur = '';
  for (const x of ph) { if (cur && nbMots(cur + ' ' + x) > 40) { l.push(cur); cur = x; } else cur = cur ? cur + ' ' + x : x; }
  if (cur) l.push(cur); return l;
};
const slugDe = t => sansAccents(t).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-') || 'episode';
function ficheDepuisScript(script, { titre = '', numero = 1 } = {}) {
  const lignes = String(script || '').replace(/\r/g, '').split('\n'), paras = []; let cur = null, section = '', titreScript = '';
  const sources = [];
  for (const brut of lignes) {
    const l = brut.trim();
    if (!l) { cur = null; continue; }
    if (/^sources?\s*:/i.test(l) || /^S\d+\s*·/.test(l)) { sources.push(l.replace(/^sources?\s*:\s*/i, '')); cur = null; continue; }
    const estTitre = /^#{1,3}\s/.test(l) || (nbMots(l) <= 7 && !/[.!?…:;,]$/.test(l) && !/^[-•*]/.test(l));
    if (estTitre) { const t = l.replace(/^#{1,3}\s*/, ''); if (!titreScript && !paras.length && /^#\s/.test(l)) titreScript = t; else section = t; cur = null; continue; }
    if (/^[-•*]\s+/.test(l)) {
      if (!cur || !cur.points) { // « Trois causes : » suivi d'une liste : la phrase devient le titre de la liste
        if (cur && /:$/.test(cur.texte)) { cur.points = []; cur.titreListe = cur.texte.replace(/\s*:$/, ''); } else { cur = { texte: '', points: [], section }; paras.push(cur); section = ''; }
      }
      const pt = l.replace(/^[-•*]\s+/, ''); cur.points.push(pt); cur.texte += (cur.texte ? ' ' : '') + pt.replace(/^./, c => c.toUpperCase()).replace(/([^.!?])$/, '$1.'); continue;
    }
    // nouveau paragraphe aussi après une phrase finie suivie d'un retour à la ligne (scripts écrits sans ligne vide entre les paragraphes)
    if (!cur || cur.points || /[.!?…»"”)]$/.test(cur.texte)) { cur = { texte: '', section }; paras.push(cur); section = ''; }
    cur.texte += (cur.texte ? ' ' : '') + l;
  }
  // fin écrite à la façon d'une vidéo (« abonne-toi », « la cloche », « c'était Pico ») : la chaîne a déjà sa fin fixe, elle n'est pas dite deux fois
  while (paras.length > 3 && /\b(abonne|cloche|notifications?|en commentaire|à la prochaine|a la prochaine|c[’']était pico|c[’']etait pico)\b/i.test(paras[paras.length - 1].texte) && !/^(en une phrase|en résumé|à retenir)/i.test(paras[paras.length - 1].texte)) paras.pop();
  if (paras.length < 3) throw new Error('Script trop court : il faut au moins une accroche, quelques paragraphes et une conclusion.');
  const titreF = String(titre || titreScript || resumer(phrasesDe(paras[0].texte)[0] || 'Mon épisode', 70)).trim();
  let iRes = paras.findIndex(x => /^(en une phrase|en résumé|en resume|pour résumer|à retenir)\b/i.test(x.texte)); if (iRes < 1) iRes = paras.length - 1;
  const tout = paras.map(x => x.texte).join(' '), questions = phrasesDe(tout).filter(x => /\?$/.test(x));
  const accroche = paras[0], resume = paras[iRes], milieu = paras.filter((x, k) => k > 0 && k !== iRes);
  const n0 = NOMBRE.exec(accroche.texte), ph0 = phrasesDe(accroche.texte);
  const blocs = []; let vus = 0;
  for (const x of milieu) {
    repliques(x.texte).forEach((r, k) => {
      const b = { texte: r, ecran: k ? '=' : ecranDe(x.texte, x.section, x.points, x.titreListe) };
      if (!k && x.section) b.section = x.section;
      if (!k && vus < 7) { b.court = resumerDit(phrasesDe(r)[0] || r, 160); vus++; } // version TikTok : la première phrase de chaque passage, 7 au plus
      blocs.push(b);
    });
  }
  const derniere = questions.length ? questions[questions.length - 1] : 'Et toi, qu’en penses-tu ?';
  const motsTitre = titreF.toUpperCase().replace(/\s*\?$/, ' ?').split(/\s+/), parLigne = Math.ceil(motsTitre.length / Math.min(3, Math.max(1, Math.ceil(motsTitre.length / 3))));
  const lignesMini = []; for (let k = 0; k < motsTitre.length; k += parLigne) lignesMini.push(motsTitre.slice(k, k + parLigne).join(' '));
  const resTexte = resume.texte.replace(/^(en une phrase|en résumé|en resume|pour résumer|à retenir)\s*[:,]?\s*/i, '');
  const resPh = phrasesDe(resTexte), resSans = resPh.filter(x => !/\?$/.test(x)).join(' ') || resTexte; // la question finale est dite à la fin, pas dans le résumé
  return {
    numero, slug: slugDe(titreF), titre: titreF, promesse: titreF, description: coupe(ph0.slice(0, 2).join(' '), 300),
    hashtags: '#économie #investissement #apprendre #QuentInvest', musique: 'documentaire-doux',
    accroche: { texte: resumerDit(accroche.texte, 400), court: resumerDit(ph0[0] || accroche.texte, 160),
      ecran: n0 ? { type: 'chiffre', valeur: n0[0].replace(/\s+/g, ' ').trim(), legende: resumer(ph0[0] || '', 110) } : { type: 'message', titre: resumer(titreF, 70), sous: resumer(ph0[0] || '', 150) } },
    blocs,
    resume: { texte: 'En une phrase : ' + resSans, court: 'En une phrase : ' + resumerDit(phrasesDe(resSans)[0] || resSans, 160) },
    question: derniere, sources: sources.length ? sources : ['S1 · Script écrit par l’auteur de la chaîne (sources à ajouter pour chaque chiffre)'],
    miniature: { lignes: lignesMini.slice(0, 3), accent: (motsTitre.find(m => m.length > 4) || motsTitre[0] || '').replace(/[?!.,]/g, '') }
  };
}

module.exports = { controler, textesDits, nombres, ficheDepuisScript, resumer, resumerDit, finirEcrans };

if (require.main === module) {
  const [, , fiche, faits] = process.argv;
  if (!fiche) { console.log('Usage : node fiche-quentinvest.js <fiche.json> [faits.txt]'); process.exit(1); }
  let lexique = {}; try { lexique = require('./voix-texte').lexiqueActuel(); } catch (e) { /* sans dictionnaire */ }
  const r = controler(JSON.parse(fs.readFileSync(fiche, 'utf8')), { faits: faits ? fs.readFileSync(faits, 'utf8') : '', lexique });
  for (const x of r.infos) console.log('ℹ ' + x); for (const x of r.erreurs) console.log('✗ ' + x); for (const x of r.avertissements) console.log('⚠ ' + x);
  console.log(r.ok ? '✓ Fiche fabricable.' : '✗ Fiche à corriger avant fabrication.'); process.exit(r.ok ? 0 : 1);
}
