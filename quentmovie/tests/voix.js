// Texte écrit → texte prononcé (heures, sommes, unités, ordinaux, abréviations).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const perso = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qm-pron-')), 'prononciations.json');
process.env.QM_PRONONCIATIONS = perso; // jamais le dictionnaire personnel du poste
const { pourLaVoix: v, definirFichierPerso, lexiqueActuel } = require('../voix-texte');
let ok = 0, ko = 0; const check = (n, c) => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n); } };
const eq = (entree, attendu) => { const r = v(entree); if (r === attendu) ok++; else { ko++; console.log('  ÉCHEC :', JSON.stringify(entree), '→', JSON.stringify(r), 'au lieu de', JSON.stringify(attendu)); } };
eq('Rendez-vous à 9h.', 'Rendez-vous à 9 heures.');
eq('Départ à 9h30 précises', 'Départ à 9 heures 30 précises');
eq('Départ à 1h', 'Départ à 1 heure');
eq('Ouvert 24h/24', 'Ouvert 24 heures sur 24');
eq('Il roule à 90 km/h', 'Il roule à 90 kilomètres-heure');
eq('Un prix de 5 € seulement', 'Un prix de 5 euros seulement');
eq('Seulement 1€', 'Seulement 1 euro');
eq('Un chiffre d’affaires de 2,5 M€', 'Un chiffre d’affaires de 2,5 millions d’euros');
eq('Une hausse de 20 %', 'Une hausse de 20 pour cent');
eq('Il fait 25°C dehors', 'Il fait 25 degrés Celsius dehors');
eq('Distance : 12 km', 'Distance : 12 kilomètres');
eq('Ajoutez 200 g de farine et 25 cl de lait', 'Ajoutez 200 grammes de farine et 25 centilitres de lait');
eq('Un terrain de 80 m²', 'Un terrain de 80 mètres carrés');
eq('Le 1er janvier', 'Le premier janvier');
eq('La 2e guerre, le 3ème étage', 'La deuxième guerre, le troisième étage');
eq('Au XIXe siècle', 'Au dix-neuvième siècle');
eq('Au Ve siècle av. J.-C.', 'Au cinquième siècle avant Jésus-Christ');
eq('Il y a 12 000 habitants', 'Il y a 12000 habitants');
eq('M. Dupont et Mme Martin', 'monsieur Dupont et madame Martin');
eq('Du pain, du lait, etc.', 'Du pain, du lait, et cetera');
eq('Le n° 5 de la rue', 'Le numéro 5 de la rue');
eq('Durée : 45 min', 'Durée : 45 minutes');
eq('Tom & Jerry', 'Tom et Jerry');
// ce qui ne doit pas changer
eq('La vie en 2024 à Paris, la Vie est belle', 'La vie en 2024 à Paris, la Vie est belle');
eq('Le chat a 3 ans et 2 enfants', 'Le chat a 3 ans et 2 enfants');
eq('Une histoire en huit heures', 'Une histoire en huit heures');
eq('Il a 5 ha de vignes', 'Il a 5 hectares de vignes');
eq('Louis XIV et Henri IV, Charles Ier', 'Louis quatorze et Henri quatre, Charles premier');
eq('Le XIVe siècle et Louis XVI', 'Le quatorzième siècle et Louis seize');
eq('Pie XII', 'Pie douze');
// dictionnaire de prononciation
eq('Le krach de 1637 et le Krach de 1929, les krachs', 'Le crac de 1637 et le Crac de 1929, les cracs');
eq('Mon PEA et le TRI, mais pas le per', 'Mon P E A et le T R I, mais pas le per');
eq('Warren Buffett et Buffett chez Berkshire Hathaway', 'Ouarenne Beuffette et Beuffette chez Beurkchire Hatha-ouay');
eq('Le PEAU rouge', 'Le PEAU rouge'); // un mot qui contient un sigle reste intact
eq('5 000 ÷ 300 ≈ 17', '5000 divisé par 300 environ 17');
fs.writeFileSync(perso, JSON.stringify({ mots: { krach: 'krack', Quentin: 'Kantin', 'start-up': '' } }));
definirFichierPerso(perso);
eq('Le krach de Quentin et une start-up', 'Le krack de Kantin et une start-up'); // le dictionnaire personnel passe avant, une valeur vide retire un mot livré
check(Object.keys(lexiqueActuel()).length > 30, 'dictionnaire livré chargé');
fs.writeFileSync(perso, '{ pas du json');
definirFichierPerso(perso);
eq('Le krach', 'Le crac'); // un fichier personnel abîmé est ignoré
console.log(`Texte lu : ${ok} contrôles réussis, ${ko} échecs`);
process.exit(ko ? 1 : 0);
