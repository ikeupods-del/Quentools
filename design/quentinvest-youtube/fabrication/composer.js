// Pico — compose un épisode à partir d'une fiche courte (fiches/NN-sujet.json) :
// la fiche ne contient que le fond (accroche, idées, piège, résumé, question, sources) ; la structure de la vidéo est ajoutée ici :
// accroche chiffrée → appel à s'abonner → idées → piège → résumé → question + prochain épisode → fin.
// Expressions, gestes de Pico, effets sonores et sections sont choisis automatiquement (modifiables bloc par bloc).
// Produit deux fichiers d'épisode pour fabriquer.js : la vidéo YouTube (16:9) et la version verticale TikTok (9:16, environ 1 minute).
// Usage : node composer.js <fiche.json> [dossier des épisodes]
'use strict';
const fs = require('fs'), path = require('path');

const VOIX_PAR_DEFAUT = { moteur: 'piper', modele: 'vits-piper-fr_FR-tom-medium', sid: 0, vitesse: 0.9, hauteur: 1 }; // voix d'homme choisie par le propriétaire
const TYPES_GRAPHIQUES = ['duo', 'courbe', 'croissance', 'comparaison', 'barres', 'taux', 'calcul', 'panier', 'chiffre'];

const exprDe = (b, role) => {
  if (b.expr) return b.expr;
  if (role === 'piege') return 'inquiet';
  if (role === 'resume' || role === 'fin') return 'content';
  const t = b.texte || '', type = b.ecran && b.ecran.type;
  if (/attention|risque|danger|piège|perdre|perte/i.test(t)) return 'inquiet';
  if (b.effet || ['duo', 'chiffre', 'comparaison', 'accroche'].includes(type)) return 'surpris';
  if (['calcul', 'taux', 'courbe', 'croissance'].includes(type)) return 'reflechi';
  if (/\?\s*$/.test(t) || /\?/.test(t.split('.')[0])) return 'curieux';
  return 'neutre';
};
const gesteDe = b => {
  if (b.geste !== undefined) return b.geste || undefined;
  const type = b.ecran && b.ecran.type;
  if (b.ecran === '=') return undefined;
  if (['definition', 'calcul', 'courbe', 'croissance', 'comparaison', 'barres', 'duo', 'taux'].includes(type)) return 'pointe';
  return undefined;
};
const maj = t => t.charAt(0).toUpperCase() + t.slice(1);
const nettoie = o => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

// vérifie la fiche avant de lancer une fabrication longue : message clair en français plutôt qu'une erreur au milieu du montage
function verifier(f) {
  const manque = [];
  for (const k of ['numero', 'slug', 'titre', 'promesse', 'description', 'question', 'sources', 'miniature']) if (f[k] == null || f[k] === '') manque.push(k);
  if (!f.accroche || !f.accroche.texte || !f.accroche.ecran) manque.push('accroche (texte + ecran)');
  if (!f.blocs || !f.blocs.length) manque.push('blocs (au moins un)');
  if (!f.resume || !f.resume.texte) manque.push('resume.texte');
  if (manque.length) throw new Error('Fiche incomplète, à renseigner : ' + manque.join(', '));
  (f.blocs || []).forEach((b, i) => { if (!b.texte || !b.ecran) throw new Error(`Bloc ${i + 1} : « texte » et « ecran » sont obligatoires`); if (b.texte.split(/\s+/).length > 45) console.warn(`Bloc ${i + 1} : plus de 45 mots, coupe-le en deux.`); });
  if (f.accroche.ecran && !/\d/.test(JSON.stringify(f.accroche.ecran))) console.warn('Accroche : mets un chiffre choc à l’écran.');
  if (!(f.blocs || []).some(b => b.court)) console.warn('Aucun bloc avec « court » : la version TikTok sera très courte.');
}

function compose(f) {
  verifier(f);
  const NUM = String(f.numero).padStart(2, '0'), base = { titre: f.titre, chaine: f.chaine || 'QuentInvest', mention: f.mention || 'Vulgarisation · pas un conseil en investissement', style: 2, voix: f.voix || VOIX_PAR_DEFAUT, sources: f.sources || [], miniature: f.miniature };
  const abo = f.abonne || {}, ecranAbo = { type: 'abonne', texte: abo.titre || 'Rejoins la colonie', sous: abo.sous || "Une vidéo d'économie simple, régulièrement." };
  const accroche = f.accroche, hook = (texte) => nettoie({ expr: 'curieux', geste: 'penche', section: 'La question', ecran: { type: 'accroche', ...accroche.ecran }, effet: accroche.effet || 'hausse', effetT: 1.0, texte });
  const aboScene = texte => ({ expr: 'content', geste: 'hoche', ecran: ecranAbo, texte });
  const texteAbo = abo.texte || "Salut la colonie ! Abonne-toi pour ne rien rater.";

  // ---------- vidéo YouTube ----------
  const L = [hook(accroche.texte), aboScene(texteAbo)];
  if (f.intro) L.push(nettoie({ expr: f.intro.expr || 'neutre', ecran: f.intro.ecran || { type: 'titre', titre: f.titre, sous: 'Vulgarisation, pas un conseil' }, texte: f.intro.texte }));
  let rev = -1;
  (f.blocs || []).forEach(b => {
    if (b.revelation) rev = L.length;
    L.push(nettoie({ expr: exprDe(b), geste: gesteDe(b), section: b.section, ecran: b.ecran, effet: b.effet, effetT: b.effetT, lent: b.lent, saut: b.saut, voix: b.voix, texte: b.texte }));
  });
  if (f.piege) {
    const er = f.piege.erreurs || [];
    L.push({ expr: 'inquiet', section: 'Le piège', ecran: { type: 'message', titre: 'Grain de sable', sous: f.piege.sous || 'Ce qui est souvent mal compris' }, texte: f.piege.intro || `Attention, grain de sable. Il y a ${er.length > 1 ? er.length + ' erreurs courantes' : 'une erreur courante'}.` });
    er.forEach((e, i) => L.push({ expr: 'inquiet', ecran: { type: 'erreur', numero: i + 1, titre: e.titre }, texte: e.texte }));
  }
  L.push({ expr: 'content', section: 'En une phrase', ecran: { type: 'resume', titre: 'En une phrase', texte: maj(f.resume.ecran || f.resume.texte.replace(/^En une phrase\s*:\s*/i, '')) }, texte: f.resume.texte });
  const suite = f.suite || {}, fin = (suite.texte ? suite.texte + ' ' : '') + f.question + ' Dis-le en commentaire. Rappel : vulgarisation, pas un conseil en investissement.';
  L.push({ expr: 'curieux', geste: 'penche', ecran: { type: 'suite', label: 'Prochain épisode', titre: suite.titre || 'À bientôt', sous: suite.sous || f.question + ' Dis-le en commentaire.' }, texte: fin });
  L.push({ expr: 'content', ecran: { type: 'fin' }, sortie: true, texte: "Un grain après l'autre. À bientôt dans la fourmilière !" });
  const long = { ...base, musique: f.musique || 'documentaire-doux', suite: suite.titre, scenes: L };
  if (f.musiqueRevelation && rev >= 0) long.musiqueRevelation = { id: f.musiqueRevelation, scene: rev };

  // ---------- version verticale : seulement les blocs qui ont un texte `court` ----------
  const T = [{ ...hook(accroche.court || accroche.texte), section: undefined }, aboScene(abo.court || texteAbo)]; // pas de titre de section en vertical
  T.forEach(x => nettoie(x));
  let precedent = false;
  (f.blocs || []).forEach(b => {
    if (!b.court) { precedent = false; return; }
    const ecran = b.ecran === '=' ? (precedent ? '=' : null) : (b.ecranTiktok || b.ecran);
    if (!ecran) { precedent = false; return; }
    T.push(nettoie({ expr: exprDe(b), geste: gesteDe(b), ecran, effet: b.effet, effetT: b.effetT, texte: b.court })); precedent = true;
  });
  if (f.piege && f.piege.court) T.push({ expr: 'inquiet', geste: 'penche', ecran: { type: 'message', titre: 'Grain de sable', sous: f.piege.sous || 'Ce qui est souvent mal compris' }, texte: f.piege.court });
  T.push({ expr: 'content', ecran: { type: 'resume', titre: 'En une phrase', texte: maj(f.resume.court ? f.resume.court.replace(/^En une phrase\s*:\s*/i, '') : (f.resume.ecran || f.resume.texte.replace(/^En une phrase\s*:\s*/i, ''))) }, texte: f.resume.court || f.resume.texte });
  T.push({ expr: 'curieux', geste: 'hoche', sortie: true, ecran: { type: 'suite', label: 'Vidéo complète sur la chaîne', titre: f.titre, sous: f.question + ' Dis-le en commentaire.' }, texte: 'Vidéo complète sur la chaîne. ' + f.question + ' Dis-le en commentaire.' });
  const tiktok = { ...base, titre: (f.promesse || f.titre) + ' (version TikTok)', format: 'vertical', musique: f.musiqueTiktok || 'corporate-lumineux', scenes: T };
  return { NUM, long, tiktok, base: `${NUM}-${f.slug}` };
}

module.exports = { compose, VOIX_PAR_DEFAUT };

if (require.main === module) {
  const fichier = process.argv[2], dossier = path.resolve(process.argv[3] || path.join(__dirname, '..', 'episodes'));
  if (!fichier) { console.log('Usage : node composer.js <fiche.json> [dossier des épisodes]'); process.exit(1); }
  const r = compose(JSON.parse(fs.readFileSync(fichier, 'utf8')));
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, r.base + '.json'), JSON.stringify(r.long, null, 1) + '\n');
  fs.writeFileSync(path.join(dossier, r.base + '-tiktok.json'), JSON.stringify(r.tiktok, null, 1) + '\n');
  console.log(path.join(dossier, r.base + '.json'));
}
