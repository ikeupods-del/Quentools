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
check('animations : générique d’ouverture, de fin, abonne-toi, bandeau', v('mets un générique d’ouverture') === 'animation:intro' && v('ajoute un générique de fin') === 'animation:fin' && v('mets un abonne-toi') === 'animation:abonne' && v('ajoute un bandeau avec mon nom') === 'animation:bandeau', [v('mets un générique d’ouverture'), v('ajoute un générique de fin'), v('mets un abonne-toi'), v('ajoute un bandeau avec mon nom')].join(' | '));
check('« écran titre » reste un écran titre', v('ajoute un écran titre « Mon voyage »') === 'titre:Mon voyage');
// audit : demandes courantes mal comprises auparavant
check('« monte le volume / la musique » ne lance pas le montage automatique', v('monte le volume') === 'volume:140' && v('monte la musique') === 'volume_musique:plus', v('monte la musique'));
check('« coupe la vidéo à 10 secondes » vidéo en pause : coupe à 10 s', ci('coupe la vidéo à 10 secondes') === 'couper_a:10', ci('coupe la vidéo à 10 secondes'));
check('« coupe la musique » n’est pas une coupe à l’instant', ci('coupe la musique') === 'volume_musique:0', ci('coupe la musique'));
check('« coupe là » coupe à l’instant de la pause', ci('coupe là') === 'couper_a:12.4');
check('« baisse la musique » règle son volume (pas de nouvelle musique)', v('baisse la musique') === 'volume_musique:moins' && v('mets la musique à 30 %') === 'volume_musique:30');
check('« noir et blanc » ne coupe pas les blancs ; « retire le zoom » n’en ajoute pas', v('mets la vidéo en noir et blanc') === '' && v('retire le zoom') === '');
check('formats 16/9 et 9/16 compris', v('passe en 16/9') === 'format:horizontal' && v('mets en 9/16') === 'format:vertical' && v('format 16:9') === 'format:horizontal');
check('« mets un titre ici : Bonjour » pose le texte à l’instant', ci('mets un titre ici : Bonjour') === 'titre_ici:Bonjour', ci('mets un titre ici : Bonjour'));
console.log(`Assistant : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
