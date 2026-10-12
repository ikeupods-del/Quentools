// Assistant de montage : demandes en français → actions (règles sans IA).
'use strict';
const A = require('../assistant');
let ok = 0, ko = 0;
const check = (nom, cond, info = '') => { if (cond) ok++; else { ko++; console.log('  ÉCHEC :', nom, info); } };
const v = d => A.comprendre(d).map(a => a.action + (a.parametre ? ':' + a.parametre : '')).join(' ');
const CAS = [
  ['supprime le dernier clip', 'supprimer_clip:dernier'], ['enlève le premier plan', 'supprimer_clip:premier'], ['supprime le clip 2', 'supprimer_clip:2'],
  ['ajoute un bruit de clavier', 'bruitage:clavier'], ['mets un applaudissement', 'bruitage:applaudissement'], ['ajoute un jackpot', 'bruitage:jackpot'], ['mets du whoosh', 'bruitage:whoosh'],
  ['coupe à 10 secondes', 'couper_a:10'], ['coupe à 1:30', 'couper_a:90'], ['mets le volume à 50 %', 'volume:50'], ['coupe le son', 'volume:0'], ['baisse le volume', 'volume:60'],
  ['ajoute un fondu au début et à la fin', 'fondus'], ['ajoute du zoom', 'dynamiser:120'], ['supprime la musique', 'retirer_musique'], ['retire les transitions', 'retirer_transitions'],
  ['ajoute une musique calme et supprime les blancs', 'couper_blancs musique:calme'], ['coupe les blancs et ajoute des sous-titres tiktok', 'couper_blancs sous_titres:tiktok'],
  ['sans les blancs', ''], ['garde les silences', ''], ['ajoute une musique calme', 'musique:calme'], ['passe en vertical', 'format:vertical']
];
for (const [d, att] of CAS) check(`« ${d} »`, v(d) === att, `obtenu : « ${v(d)} », attendu : « ${att} »`);
check('« supprime la musique » ne supprime pas un clip', !/supprimer_clip/.test(v('supprime la musique')));
check('« mets un titre » reste un titre', /titre/.test(v('ajoute un titre au début')) && !/bruitage/.test(v('ajoute un titre au début')));
check('« enlève le son de la vidéo » ne devient pas un bruitage', !/bruitage/.test(v('détache le son de la vidéo')));
check('ordre : suppression et coupe avant le reste', v('ajoute une musique calme et supprime le dernier clip').startsWith('supprimer_clip'));
console.log(`Assistant : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
