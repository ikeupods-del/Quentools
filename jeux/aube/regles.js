'use strict';
/* Aube des Nations — règles du jeu : données pures, sans affichage.
   Chargé avant monde.js, moteur.js et ia.js (variables globales partagées). */

const AUBE_VERSION = '1.0.0';

const ERES = ['Antiquité', 'Époque classique', 'Moyen Âge', 'Renaissance', 'Ère industrielle', 'Ère moderne'];

/* ---------- Terrains ---------- */
const TERRAINS = {
  ocean:   { nom: 'Océan',   eau: true, profond: true, n: 1, p: 0, o: 0 },
  cote:    { nom: 'Côte',    eau: true, n: 1, p: 0, o: 1 },
  prairie: { nom: 'Prairie', n: 2, p: 0, o: 0 },
  plaine:  { nom: 'Plaine',  n: 1, p: 1, o: 0 },
  desert:  { nom: 'Désert',  n: 0, p: 0, o: 0 },
  toundra: { nom: 'Toundra', n: 1, p: 0, o: 0 },
  neige:   { nom: 'Neige',   n: 0, p: 0, o: 0 },
};
/* Un couvert remplace les rendements du terrain. */
const COUVERTS = {
  foret:  { nom: 'Forêt',  n: 1, p: 2, def: 3 },
  jungle: { nom: 'Jungle', n: 2, p: 1, def: 3 },
  marais: { nom: 'Marais', n: 1, p: 0, def: -2 },
};
const RELIEFS = ['', 'Collines', 'Montagnes'];

/* « ou » : terrains, 'colline' (relief 1) ou couverts où la ressource peut apparaître. */
const RESSOURCES = {
  ble:       { nom: 'Blé',       ic: '🌾', n: 1, ou: ['plaine', 'prairie'], plat: true, amel: 'ferme' },
  betail:    { nom: 'Bétail',    ic: '🐄', n: 1, ou: ['prairie'], plat: true, amel: 'paturage' },
  moutons:   { nom: 'Moutons',   ic: '🐑', n: 1, ou: ['colline'], amel: 'paturage' },
  cerfs:     { nom: 'Cerfs',     ic: '🦌', n: 1, ou: ['foret'], amel: 'camp' },
  bananes:   { nom: 'Bananes',   ic: '🍌', n: 1, ou: ['jungle'], amel: 'plantation' },
  poisson:   { nom: 'Poissons',  ic: '🐟', n: 2, ou: ['cote'] },
  chevaux:   { nom: 'Chevaux',   ic: '🐎', p: 1, ou: ['plaine', 'prairie'], plat: true, amel: 'paturage' },
  pierre:    { nom: 'Pierre',    ic: '🪨', p: 1, ou: ['colline', 'desert', 'plaine'], amel: 'mine' },
  fer:       { nom: 'Fer',       ic: '⚙️', p: 1, ou: ['colline', 'toundra'], amel: 'mine', tech: 'bronze' },
  petrole:   { nom: 'Pétrole',   ic: '🛢️', p: 3, ou: ['desert', 'toundra', 'marais'], amel: 'mine', tech: 'industrialisation' },
  or:        { nom: 'Or',        ic: '🪙', o: 2, luxe: true, ou: ['colline', 'desert'], amel: 'mine' },
  gemmes:    { nom: 'Gemmes',    ic: '💎', o: 3, luxe: true, ou: ['jungle', 'colline'], amel: 'mine' },
  epices:    { nom: 'Épices',    ic: '🌶️', o: 2, luxe: true, ou: ['jungle'], amel: 'plantation' },
  vin:       { nom: 'Vin',       ic: '🍇', o: 2, luxe: true, ou: ['plaine', 'prairie'], plat: true, amel: 'plantation' },
  coton:     { nom: 'Coton',     ic: '🧶', o: 2, luxe: true, ou: ['prairie', 'desert'], plat: true, amel: 'plantation' },
  encens:    { nom: 'Encens',    ic: '🏺', o: 2, luxe: true, ou: ['desert', 'plaine'], plat: true, amel: 'plantation' },
  fourrures: { nom: 'Fourrures', ic: '🦊', o: 2, luxe: true, ou: ['toundra', 'foret'], amel: 'camp' },
  perles:    { nom: 'Perles',    ic: '🦪', o: 2, luxe: true, ou: ['cote'] },
};

const AMELIORATIONS = {
  ferme:      { nom: 'Ferme',          ic: '🌱', tech: 'agriculture',  n: 1 },
  mine:       { nom: 'Mine',           ic: '⛏️', tech: 'mines',        p: 1 },
  paturage:   { nom: 'Pâturage',       ic: '🐾', tech: 'elevage',      p: 1 },
  camp:       { nom: 'Camp de chasse', ic: '🪤', tech: 'elevage',      o: 1 },
  plantation: { nom: 'Plantation',     ic: '🧺', tech: 'poterie',      o: 1 },
  scierie:    { nom: 'Scierie',        ic: '🪵', tech: 'construction', p: 1 },
};
/* Technologies qui renforcent une amélioration. */
const BONUS_AMEL = [
  { tech: 'chimie', amel: 'ferme', n: 1 },
  { tech: 'dynamite', amel: 'mine', p: 1 },
  { tech: 'industrialisation', amel: 'scierie', p: 1 },
  { tech: 'economie', amel: 'plantation', o: 1 },
];

/* ---------- Technologies : [id, nom, ère, coût, prérequis] ---------- */
const TECHS_BRUT = [
  ['agriculture', 'Agriculture', 0, 20, []],
  ['poterie', 'Poterie', 0, 35, ['agriculture']],
  ['elevage', 'Élevage', 0, 35, ['agriculture']],
  ['mines', 'Exploitation minière', 0, 35, ['agriculture']],
  ['tir', "Tir à l'arc", 0, 35, ['agriculture']],
  ['mysticisme', 'Mysticisme', 0, 55, ['poterie']],
  ['ecriture', 'Écriture', 0, 55, ['poterie']],
  ['voile', 'Navigation à voile', 0, 55, ['poterie']],
  ['roue', 'La roue', 0, 55, ['elevage']],
  ['bronze', 'Travail du bronze', 0, 55, ['mines']],
  ['maconnerie', 'Maçonnerie', 0, 55, ['mines']],
  ['equitation', 'Équitation', 1, 90, ['roue']],
  ['fer', 'Travail du fer', 1, 90, ['bronze']],
  ['monnaie', 'Monnaie', 1, 90, ['ecriture', 'bronze']],
  ['mathematiques', 'Mathématiques', 1, 110, ['ecriture', 'roue']],
  ['construction', 'Construction', 1, 110, ['maconnerie', 'roue']],
  ['philosophie', 'Philosophie', 1, 110, ['mysticisme', 'ecriture']],
  ['ingenierie', 'Ingénierie', 2, 200, ['construction', 'mathematiques']],
  ['feodalite', 'Féodalité', 2, 200, ['fer', 'monnaie']],
  ['theologie', 'Théologie', 2, 220, ['philosophie']],
  ['education', 'Éducation', 2, 240, ['philosophie', 'monnaie']],
  ['machinerie', 'Machinerie', 2, 240, ['ingenierie']],
  ['chevalerie', 'Chevalerie', 2, 240, ['equitation', 'feodalite']],
  ['astronomie', 'Astronomie', 2, 240, ['mathematiques', 'voile']],
  ['banque', 'Banque', 3, 400, ['education', 'chevalerie']],
  ['poudre', 'Poudre à canon', 3, 400, ['machinerie']],
  ['imprimerie', 'Imprimerie', 3, 420, ['education', 'machinerie']],
  ['navigation', 'Navigation', 3, 450, ['astronomie']],
  ['metallurgie', 'Métallurgie', 3, 500, ['poudre']],
  ['economie', 'Économie', 3, 550, ['banque', 'imprimerie']],
  ['industrialisation', 'Industrialisation', 4, 700, ['economie', 'metallurgie']],
  ['tactique', 'Tactique militaire', 4, 720, ['metallurgie', 'navigation']],
  ['chimie', 'Chimie', 4, 750, ['economie']],
  ['fusil', 'Armes rayées', 4, 800, ['industrialisation']],
  ['electricite', 'Électricité', 4, 850, ['industrialisation']],
  ['medecine', 'Médecine', 4, 850, ['chimie']],
  ['dynamite', 'Dynamite', 4, 900, ['fusil', 'chimie']],
  ['combustion', 'Combustion', 5, 1100, ['electricite', 'dynamite']],
  ['radio', 'Radio', 5, 1100, ['electricite']],
  ['informatique', 'Informatique', 5, 1300, ['radio', 'medecine']],
  ['fusees', 'Fusées', 5, 1400, ['combustion', 'informatique']],
  ['robotique', 'Robotique', 5, 1450, ['informatique', 'combustion']],
  ['volSpatial', 'Vol spatial', 5, 1700, ['fusees', 'robotique']],
];
const TECHS = {};
TECHS_BRUT.forEach(([id, nom, ere, cout, req], rang) => { TECHS[id] = { id, nom, ere, cout, req, rang }; });
/* Effets particuliers d'une technologie (affichés dans l'arbre). */
const EFFETS_TECH = {
  voile: 'Vos unités terrestres peuvent embarquer sur la côte',
  roue: 'Les ouvriers tracent des routes',
  astronomie: 'Vos unités peuvent traverser l’océan',
  bronze: 'Révèle le fer',
  imprimerie: 'Bibliothèques : +1 science',
  chimie: 'Fermes : +1 nourriture',
  dynamite: 'Mines : +1 production',
  industrialisation: 'Révèle le pétrole, scieries : +1 production',
  economie: 'Plantations : +1 or',
};

/* ---------- Unités ----------
   f = force (mêlée et défense), t = force à distance, portee, mv = déplacements,
   classe : civil | terre | mer ; cav = monté ; siege = efficace contre les villes ; maj = amélioration. */
const UNITES = {
  colon:      { nom: 'Colon',      ic: '⛺', classe: 'civil', mv: 2, cout: 55 },
  ouvrier:    { nom: 'Ouvrier',    ic: '🔨', classe: 'civil', mv: 2, cout: 35, charges: 3 },
  eclaireur:  { nom: 'Éclaireur',  ic: '🧭', classe: 'terre', f: 10, mv: 3, cout: 25, vue: 3 },
  guerrier:   { nom: 'Guerrier',   ic: '🪓', classe: 'terre', f: 20, mv: 2, cout: 35, maj: 'epeiste' },
  archer:     { nom: 'Archer',     ic: '🏹', classe: 'terre', f: 15, t: 25, portee: 2, mv: 2, cout: 50, tech: 'tir', maj: 'arbaletrier' },
  lancier:    { nom: 'Lancier',    ic: '🔱', classe: 'terre', f: 25, antiCav: 10, mv: 2, cout: 50, tech: 'bronze', maj: 'piquier' },
  galere:     { nom: 'Galère',     ic: '⛵', classe: 'mer', f: 25, mv: 3, cout: 55, tech: 'voile', cotier: true, maj: 'caravelle' },
  cavalier:   { nom: 'Cavalier',   ic: '🐴', classe: 'terre', f: 30, mv: 4, cav: true, cout: 70, tech: 'equitation', maj: 'chevalier' },
  epeiste:    { nom: 'Épéiste',    ic: '🗡️', classe: 'terre', f: 36, mv: 2, cout: 80, tech: 'fer', maj: 'mousquetaire' },
  catapulte:  { nom: 'Catapulte',  ic: '☄️', classe: 'terre', f: 12, t: 35, portee: 2, siege: true, mv: 2, cout: 80, tech: 'mathematiques', maj: 'trebuchet' },
  piquier:    { nom: 'Piquier',    ic: '⚜️', classe: 'terre', f: 41, antiCav: 10, mv: 2, cout: 100, tech: 'feodalite', maj: 'mousquetaire' },
  trebuchet:  { nom: 'Trébuchet',  ic: '🏗️', classe: 'terre', f: 16, t: 45, portee: 2, siege: true, mv: 2, cout: 120, tech: 'ingenierie', maj: 'canon' },
  arbaletrier:{ nom: 'Arbalétrier',ic: '🎯', classe: 'terre', f: 25, t: 40, portee: 2, mv: 2, cout: 100, tech: 'machinerie', maj: 'fusilier' },
  chevalier:  { nom: 'Chevalier',  ic: '🛡️', classe: 'terre', f: 48, mv: 4, cav: true, cout: 120, tech: 'chevalerie', maj: 'dragon' },
  caravelle:  { nom: 'Caravelle',  ic: '🚣', classe: 'mer', f: 40, mv: 4, cout: 110, tech: 'astronomie', maj: 'fregate' },
  mousquetaire:{ nom: 'Mousquetaire', ic: '💂', classe: 'terre', f: 55, mv: 2, cout: 150, tech: 'poudre', maj: 'fusilier' },
  canon:      { nom: 'Canon',      ic: '💣', classe: 'terre', f: 25, t: 60, portee: 2, siege: true, mv: 2, cout: 160, tech: 'metallurgie', maj: 'artillerie' },
  fregate:    { nom: 'Frégate',    ic: '⛴️', classe: 'mer', f: 60, mv: 5, cout: 180, tech: 'navigation', maj: 'cuirasse' },
  dragon:     { nom: 'Dragon',     ic: '🏇', classe: 'terre', f: 64, mv: 5, cav: true, cout: 190, tech: 'tactique', maj: 'char' },
  fusilier:   { nom: 'Fusilier',   ic: '🪖', classe: 'terre', f: 70, mv: 2, cout: 220, tech: 'fusil', maj: 'infanterie' },
  artillerie: { nom: 'Artillerie', ic: '🧨', classe: 'terre', f: 35, t: 80, portee: 3, siege: true, mv: 2, cout: 250, tech: 'dynamite', maj: 'lanceRoquettes' },
  cuirasse:   { nom: 'Cuirassé',   ic: '🛳️', classe: 'mer', f: 85, mv: 5, cout: 300, tech: 'electricite' },
  char:       { nom: 'Char',       ic: '🚜', classe: 'terre', f: 90, mv: 4, cav: true, cout: 320, tech: 'combustion', maj: 'blinde' },
  infanterie: { nom: 'Infanterie', ic: '🎖️', classe: 'terre', f: 85, mv: 2, cout: 300, tech: 'radio' },
  lanceRoquettes: { nom: 'Lance-roquettes', ic: '🚀', classe: 'terre', f: 50, t: 105, portee: 3, siege: true, mv: 2, cout: 380, tech: 'fusees' },
  blinde:     { nom: 'Blindé moderne', ic: '🤖', classe: 'terre', f: 120, mv: 5, cav: true, cout: 420, tech: 'robotique' },
};

/* ---------- Bâtiments ----------
   n p o s c = nourriture, production, or, science, culture ; bonheur ; def / pv = défense de la ville ;
   pctP / pctO / pctS = pourcentages ; ent = entretien en or ; req = bâtiment requis. */
const BATIMENTS = {
  palais:       { nom: 'Palais', cout: 0, s: 3, o: 3, p: 2, c: 2, special: true, desc: 'Siège du gouvernement' },
  monument:     { nom: 'Monument', cout: 40, c: 2, ent: 0 },
  grenier:      { nom: 'Grenier', cout: 55, n: 2, tech: 'poterie', ent: 0 },
  caserne:      { nom: 'Caserne', cout: 60, xp: 15, tech: 'bronze', ent: 1, desc: 'Nouvelles unités expérimentées' },
  remparts:     { nom: 'Remparts', cout: 60, def: 8, pv: 50, tech: 'maconnerie', ent: 1 },
  bibliotheque: { nom: 'Bibliothèque', cout: 75, s: 2, tech: 'ecriture', ent: 1 },
  temple:       { nom: 'Temple', cout: 70, bonheur: 2, c: 1, tech: 'mysticisme', ent: 1 },
  phare:        { nom: 'Phare', cout: 70, cotier: true, tech: 'voile', ent: 1, desc: '+1 nourriture sur l’eau' },
  marche:       { nom: 'Marché', cout: 90, o: 2, pctO: 25, tech: 'monnaie', ent: 0 },
  colisee:      { nom: 'Colisée', cout: 100, bonheur: 3, tech: 'construction', ent: 1 },
  aqueduc:      { nom: 'Aqueduc', cout: 110, tech: 'ingenierie', ent: 1, desc: 'Population jusqu’à 20' },
  universite:   { nom: 'Université', cout: 160, s: 3, pctS: 25, tech: 'education', req: 'bibliotheque', ent: 2 },
  atelier:      { nom: 'Atelier', cout: 140, p: 2, pctP: 15, tech: 'machinerie', ent: 1 },
  chateau:      { nom: 'Château', cout: 140, def: 12, pv: 50, tech: 'chevalerie', req: 'remparts', ent: 1 },
  banque:       { nom: 'Banque', cout: 180, o: 3, pctO: 25, tech: 'banque', req: 'marche', ent: 0 },
  port:         { nom: 'Port', cout: 140, o: 1, cotier: true, tech: 'navigation', ent: 1, desc: '+1 production sur l’eau' },
  bourse:       { nom: 'Bourse', cout: 300, o: 4, pctO: 25, tech: 'economie', req: 'banque', ent: 0 },
  usine:        { nom: 'Usine', cout: 300, p: 4, pctP: 25, tech: 'industrialisation', req: 'atelier', ent: 2 },
  hopital:      { nom: 'Hôpital', cout: 280, n: 4, tech: 'medecine', ent: 2, desc: 'Population jusqu’à 30' },
  centrale:     { nom: 'Centrale électrique', cout: 350, p: 3, pctP: 25, tech: 'electricite', req: 'usine', ent: 2 },
  stade:        { nom: 'Stade', cout: 300, bonheur: 4, tech: 'radio', ent: 2 },
  laboratoire:  { nom: 'Laboratoire', cout: 400, s: 6, pctS: 50, tech: 'informatique', req: 'universite', ent: 2 },
};

/* Merveilles : une seule au monde. glob = effet sur tout l'empire. */
const MERVEILLES = {
  jardins:      { nom: 'Jardins suspendus', cout: 180, tech: 'poterie', n: 2, glob: { nVille: 1 }, desc: '+1 nourriture dans toutes vos villes' },
  pyramides:    { nom: 'Pyramides', cout: 190, tech: 'maconnerie', p: 3, glob: { charges: 1 }, desc: 'Ouvriers : +1 charge' },
  colosse:      { nom: 'Colosse', cout: 180, tech: 'voile', cotier: true, o: 5, desc: '+5 or dans la ville' },
  grandeBibliotheque: { nom: 'Grande Bibliothèque', cout: 210, tech: 'ecriture', s: 3, techGratuite: true, desc: 'Une technologie offerte' },
  parthenon:    { nom: 'Parthénon', cout: 240, tech: 'philosophie', c: 4, glob: { bonheur: 3 }, desc: '+3 bonheur dans l’empire' },
  grandeMuraille: { nom: 'Grande Muraille', cout: 260, tech: 'construction', glob: { defVille: 6 }, desc: '+6 défense de toutes vos villes' },
  sainteSophie: { nom: 'Sainte-Sophie', cout: 380, tech: 'theologie', c: 3, glob: { bonheur: 5 }, desc: '+5 bonheur dans l’empire' },
  observatoire: { nom: 'Observatoire d’Ulugh Beg', cout: 420, tech: 'astronomie', s: 8, desc: '+8 science dans la ville' },
  bigBen:       { nom: 'Big Ben', cout: 700, tech: 'economie', o: 10, glob: { achat: 15 }, desc: 'Achats 15 % moins chers' },
  tourEiffel:   { nom: 'Tour Eiffel', cout: 900, tech: 'industrialisation', c: 6, glob: { bonheur: 6 }, desc: '+6 bonheur dans l’empire' },
  reseauMondial:{ nom: 'Réseau mondial', cout: 1300, tech: 'informatique', s: 10, glob: { pctS: 10 }, desc: '+10 % de science partout' },
};

/* Projets : production continue ou projet de victoire. */
const PROJETS = {
  richesse:  { nom: 'Richesse', desc: 'Convertit 40 % de la production en or', continu: true },
  recherche: { nom: 'Recherche', desc: 'Convertit 40 % de la production en science', continu: true, tech: 'ecriture' },
  arche:     { nom: 'Arche stellaire', cout: 1600, tech: 'volSpatial', desc: 'Victoire scientifique : quitter la planète' },
};

/* ---------- Doctrines (achetées avec la culture, dans l'ordre de chaque voie) ---------- */
const DOCTRINES = [
  { id: 'tradition', nom: 'Tradition', liste: [
    { nom: 'Héritage', desc: '+3 culture dans la capitale', e: { cultCap: 3 } },
    { nom: 'Greniers royaux', desc: '+2 nourriture dans la capitale', e: { nCap: 2 } },
    { nom: 'Cour fastueuse', desc: '+20 % de production dans la capitale', e: { pctPCap: 20 } },
  ] },
  { id: 'expansion', nom: 'Expansion', liste: [
    { nom: 'Pionniers', desc: 'Colons 30 % moins chers', e: { colon: 30 } },
    { nom: 'Bâtisseurs', desc: 'Ouvriers : +1 charge', e: { charges: 1 } },
    { nom: 'Provinces', desc: '+1 bonheur par ville', e: { bonheurVille: 1 } },
  ] },
  { id: 'savoir', nom: 'Savoir', liste: [
    { nom: 'Scribes', desc: '+1 science dans chaque ville', e: { sVille: 1 } },
    { nom: 'Académies', desc: '+15 % de science', e: { pctS: 15 } },
    { nom: 'Lumières', desc: 'Une technologie offerte', e: { techGratuite: 1 } },
  ] },
  { id: 'commerce', nom: 'Commerce', liste: [
    { nom: 'Marchands', desc: '+1 or dans chaque ville', e: { oVille: 1 } },
    { nom: 'Prospérité', desc: '+15 % d’or', e: { pctO: 15 } },
    { nom: 'Grand commerce', desc: 'Achats 25 % moins chers', e: { achat: 25 } },
  ] },
  { id: 'honneur', nom: 'Honneur', liste: [
    { nom: 'Discipline', desc: '+3 force au combat', e: { force: 3 } },
    { nom: 'Vétérans', desc: 'Expérience des unités +50 %', e: { xp: 50 } },
    { nom: 'Arsenaux', desc: 'Unités militaires 20 % moins chères', e: { unites: 20 } },
  ] },
];

/* ---------- Nations ---------- */
const CIVS = [
  { id: 'gaulois', nom: 'Gaulois', couleur: '#3f9a52', bonus: { pctP: 10 }, txt: 'Forges celtiques : +10 % de production',
    villes: ['Bibracte', 'Gergovie', 'Alésia', 'Avaricum', 'Lutèce', 'Cenabum', 'Durocortorum', 'Uxellodunum', 'Vesontio', 'Lugdunum', 'Burdigala', 'Divona', 'Nemausus', 'Tolosa', 'Samarobriva', 'Condate'] },
  { id: 'romains', nom: 'Romains', couleur: '#9348b8', bonus: { monument: 1 }, txt: 'Res publica : un monument offert dans chaque nouvelle ville',
    villes: ['Rome', 'Antium', 'Ostie', 'Capoue', 'Neapolis', 'Ravenne', 'Arretium', 'Mediolanum', 'Aquilée', 'Tarente', 'Brindisi', 'Pompéi', 'Vérone', 'Pise', 'Gênes', 'Syracuse'] },
  { id: 'egyptiens', nom: 'Égyptiens', couleur: '#d6a92b', bonus: { merveilles: 25 }, txt: 'Bâtisseurs du Nil : merveilles 25 % plus rapides',
    villes: ['Thèbes', 'Memphis', 'Héliopolis', 'Éléphantine', 'Abydos', 'Bubastis', 'Saïs', 'Tanis', 'Amarna', 'Edfou', 'Kom Ombo', 'Hermopolis', 'Assiout', 'Alexandrie', 'Pi-Ramsès'] },
  { id: 'chinois', nom: 'Chinois', couleur: '#c8402f', bonus: { pctS: 10 }, txt: 'Mandarins : +10 % de science',
    villes: ['Xi’an', 'Luoyang', 'Anyang', 'Kaifeng', 'Nankin', 'Pékin', 'Hangzhou', 'Chengdu', 'Canton', 'Suzhou', 'Wuhan', 'Datong', 'Jinan', 'Kunming', 'Lhassa'] },
  { id: 'azteques', nom: 'Aztèques', couleur: '#1fa39c', bonus: { force: 3 }, txt: 'Guerriers jaguars : +3 force au combat',
    villes: ['Tenochtitlan', 'Texcoco', 'Tlacopan', 'Tlatelolco', 'Xochimilco', 'Coyoacán', 'Chalco', 'Cholula', 'Tula', 'Tlaxcala', 'Malinalco', 'Teotihuacan', 'Cuernavaca', 'Azcapotzalco'] },
  { id: 'vikings', nom: 'Vikings', couleur: '#3d74c4', bonus: { mvMer: 1, embarque: true }, txt: 'Drakkars : navires +1 déplacement, embarquement dès le départ',
    villes: ['Uppsala', 'Birka', 'Hedeby', 'Kaupang', 'Trondheim', 'Ribe', 'Roskilde', 'Bergen', 'Sigtuna', 'Jelling', 'Lund', 'Tønsberg', 'Oslo', 'Visby'] },
  { id: 'perses', nom: 'Perses', couleur: '#e3752d', bonus: { pctO: 15 }, txt: 'Satrapies : +15 % d’or',
    villes: ['Persépolis', 'Pasargades', 'Suse', 'Ecbatane', 'Babylone', 'Bactres', 'Sardes', 'Gordion', 'Tarse', 'Arbèles', 'Rhagès', 'Ispahan', 'Merv', 'Hérat'] },
  { id: 'mali', nom: 'Maliens', couleur: '#94603a', bonus: { desert: true }, txt: 'Routes de l’or : déserts +1 nourriture et +1 or',
    villes: ['Niani', 'Tombouctou', 'Gao', 'Djenné', 'Oualata', 'Kangaba', 'Ségou', 'Mopti', 'Kita', 'Koulikoro', 'Bamako', 'Kayes', 'Tadmekka', 'Koumbi Saleh'] },
];
const BARBARES = { id: 'barbares', nom: 'Barbares', couleur: '#3a3530', villes: [] };

const DIFFICULTES = {
  facile:    { nom: 'Colon',    ia: { p: 0.85, s: 0.85, o: 0.9 }, bonheurJ: 4 },
  normal:    { nom: 'Chef',     ia: { p: 1, s: 1, o: 1 }, bonheurJ: 2 },
  difficile: { nom: 'Roi',      ia: { p: 1.2, s: 1.15, o: 1.15 }, bonheurJ: 0 },
  divin:     { nom: 'Empereur', ia: { p: 1.4, s: 1.3, o: 1.3 }, bonheurJ: 0, renfort: true },
};
const TAILLES = {
  petite:  { nom: 'Petite',  W: 44, H: 28, civs: 4 },
  normale: { nom: 'Normale', W: 58, H: 36, civs: 6 },
  grande:  { nom: 'Grande',  W: 74, H: 46, civs: 8 },
};
const TYPES_CARTE = {
  continents: { nom: 'Continents', terre: 0.38 },
  pangee:     { nom: 'Pangée', terre: 0.42 },
  archipel:   { nom: 'Archipel', terre: 0.30 },
};
const VITESSES = {
  rapide:  { nom: 'Rapide',  cout: 0.72, tours: 220 },
  normale: { nom: 'Normale', cout: 1, tours: 320 },
};
