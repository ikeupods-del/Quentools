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
  ['mets les sous-titres en italien', 'traduire_sous:italien'], ['traduis les sous-titres en anglais', 'traduire_sous:anglais'], ['ajoute des sous-titres en français', 'sous_titres'],
  ['coupe les blancs et mets des sous-titres en italien', 'couper_blancs traduire_sous:italien'],
  ['sans les blancs', ''], ['garde les silences', ''], ['ajoute une musique calme', 'musique:calme'], ['passe en vertical', 'format:vertical']
];
for (const [d, att] of CAS) check(`« ${d} »`, v(d) === att, `obtenu : « ${v(d)} », attendu : « ${att} »`);
check('« supprime la musique » ne supprime pas un clip', !/supprimer_clip/.test(v('supprime la musique')));
check('« mets un titre » reste un titre', /titre/.test(v('ajoute un titre au début')) && !/bruitage/.test(v('ajoute un titre au début')));
check('« enlève le son de la vidéo » ne devient pas un bruitage', !/bruitage/.test(v('détache le son de la vidéo')));
check('ordre : suppression et coupe avant le reste', v('ajoute une musique calme et supprime le dernier clip').startsWith('supprimer_clip'));
// 2.1 : clip visé, couleur du titre, questions sur le montage, choix proposés quand la demande n'est pas comprise
const c = d => A.comprendre(d).map(a => a.action + (a.parametre ? ':' + a.parametre : '') + (a.cible ? '@' + a.cible : '')).join(' ');
for (const [d, att] of [['coupe les blancs de la prise 2', 'couper_blancs@2'], ['coupe les blancs de la deuxième prise', 'couper_blancs@2'], ['coupe les blancs du plan 3', 'couper_blancs@3'],
  ['mets le volume de la prise 2 à 50 %', 'volume:50@2'], ['accélère la dernière prise x2', 'vitesse:2@dernier'], ['ajoute des sous-titres sur ce clip', 'sous_titres@selection'],
  ['mets le titre en jaune', 'couleur_titre:jaune'], ['passe le texte en bleu clair', 'couleur_titre:bleu clair'], ['coupe les blancs et mets le titre en rouge', 'couper_blancs couleur_titre:rouge'],
  ['mets les sous-titres en italien', 'traduire_sous:italien'], ['supprime le clip 2', 'supprimer_clip:2']]) check(`« ${d} »`, c(d) === att, `obtenu : « ${c(d)} », attendu : « ${att} »`);
check('« mets le titre en jaune » ne crée pas d’écran titre', !/(^| )titre/.test(v('mets le titre en jaune')));
check('le libellé nomme le clip visé', /clip 2/.test(A.comprendre('coupe les blancs de la prise 2')[0].libelle));
check('couleurs : chaque nom a sa couleur', Object.values(A.COULEURS).every(x => /^#[0-9a-f]{6}$/.test(x)));
const P = { format: 'vertical', clips: [{ kind: 'video', dur: 30, hasAudio: true }, { kind: 'video', dur: 45.4, hasAudio: true }] };
check('question : durée du montage', A.repondre('combien dure la vidéo ?', P) === 'Le montage dure 1 min 15 s, en 2 clips.', A.repondre('combien dure la vidéo ?', P));
check('question : nombre de clips', /2 clips/.test(A.repondre('combien de prises il y a ?', P)));
check('question : format', /vertical/.test(A.repondre('c’est quel format ?', P)));
check('question : aide', /retiens que/.test(A.repondre('que sais-tu faire ?', P)));
check('une demande de montage n’est pas une question', !A.repondre('coupe les blancs', P));
check('non compris : actions proches proposées', A.proches('le son est trop faible', P).some(a => a.action === 'volume'), JSON.stringify(A.proches('le son est trop faible', P)));
check('non compris : sinon les suggestions du montage', A.proches('fais un truc cool', P).length >= 2);
// commentaire écrit vidéo en pause : « ici » = l'instant de la pause
const ci = d => A.comprendre(d, undefined, 12.4).map(a => a.action + (a.parametre ? ':' + a.parametre : '')).join(' ');
check('« coupe ici » coupe à l’instant de la pause', ci('coupe ici') === 'couper_a:12.4', ci('coupe ici'));
check('« mets le texte « … » ici » pose un texte à cet instant', ci('mets le texte « 2 % par an » ici') === 'titre_ici:2 % par an', ci('mets le texte « 2 % par an » ici'));
check('« coupe ici » sans pause : rien d’inventé', v('coupe ici') === '');
check('choix proposé : « trop fort » baisse le volume (jamais 0)', A.proches('ici le son est trop fort', P).some(a => a.action === 'volume' && a.parametre === '70'), JSON.stringify(A.proches('ici le son est trop fort', P)));
console.log(`Assistant : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
