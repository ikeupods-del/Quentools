/* Pax Mythica — données du jeu : terrains, bâtiments, âges, panthéons, dieux, pouvoirs divins, unités, événements.
   Ajouter un dieu, une unité ou un pouvoir = une entrée ici (les essais contrôlent seuls la cohérence des liens). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};

  PM.RESSOURCES = ['nourriture', 'bois', 'or', 'faveur'];
  PM.ICONES = { nourriture: '🌾', bois: '🪵', or: '🪙', faveur: '✨', pop: '👥' };

  // production de base par mois et coût de déplacement (en mois) ; def = bonus du défenseur
  PM.TERRAINS = {
    plaine:   { nom: 'Plaine',   prod: { nourriture: 4, bois: 1, or: 1 },     move: 1,   def: 0,    couleur: [142, 170, 92] },
    foret:    { nom: 'Forêt',    prod: { nourriture: 1.5, bois: 4, or: 0.5 }, move: 1.5, def: 0.15, couleur: [70, 118, 64] },
    collines: { nom: 'Collines', prod: { nourriture: 2, bois: 1.5, or: 2.5 }, move: 1.5, def: 0.25, couleur: [160, 150, 96] },
    montagne: { nom: 'Montagne', prod: { nourriture: 0.5, bois: 1, or: 3.5, faveur: 0.1 }, move: 2, def: 0.45, couleur: [140, 128, 118] },
    desert:   { nom: 'Désert',   prod: { nourriture: 1, bois: 0, or: 2.5, faveur: 0.2 },   move: 1.5, def: 0.1, couleur: [214, 190, 128] }
  };

  PM.BATIMENTS = {
    ferme:    { nom: 'Fermes',      icone: '🌾', cout: { bois: 60 },            bonus: { nourriture: 3 }, terrain: { plaine: 1.5 }, desc: '+3 nourriture par mois (plus en plaine).' },
    scierie:  { nom: 'Bûcherons',   icone: '🪓', cout: { nourriture: 50, bois: 20 }, bonus: { bois: 3 }, terrain: { foret: 1.5 }, desc: '+3 bois par mois (plus en forêt).' },
    mine:     { nom: 'Mine d’or',   icone: '⛏️', cout: { bois: 70, or: 20 },    bonus: { or: 2.5 }, terrain: { collines: 1.4, montagne: 1.5, desert: 1.3 }, desc: '+2,5 or par mois (plus en collines, montagne, désert).' },
    temple:   { nom: 'Temple',      icone: '🏛️', cout: { bois: 80, or: 60 },    bonus: { faveur: 1 }, desc: 'Faveur des dieux chaque mois.' },
    remparts: { nom: 'Remparts',    icone: '🧱', cout: { bois: 120, or: 80 },   age: 1, desc: 'Défense +50 %, siège trois fois plus long, milice renforcée.' }
  };
  PM.MERVEILLE = { nom: 'Merveille', icone: '🗼', cout: { nourriture: 1500, bois: 1000, or: 1500, faveur: 150 }, duree: 24, garde: 60, age: 3,
    desc: 'Une merveille achevée et gardée 5 ans donne la victoire (si cette victoire est active).' };

  PM.AGES = [
    { nom: 'Âge archaïque', court: 'Archaïque' },
    { nom: 'Âge classique', court: 'Classique', cout: { nourriture: 350, or: 120 }, duree: 6 },
    { nom: 'Âge héroïque',  court: 'Héroïque',  cout: { nourriture: 700, bois: 200, or: 400 }, duree: 8 },
    { nom: 'Âge mythique',  court: 'Mythique',  cout: { nourriture: 1000, bois: 300, or: 800, faveur: 40 }, duree: 10 }
  ];

  // contres : multiplicateur des dégâts d'une catégorie (ligne) contre une autre (colonne)
  PM.CATEGORIES = { inf: 'Infanterie', archer: 'Archers', cav: 'Cavalerie', siege: 'Siège', heros: 'Héros', mythe: 'Créature', milice: 'Milice' };
  PM.CONTRES = {
    inf:    { cav: 1.5, archer: 0.8, mythe: 0.8 },
    archer: { inf: 1.5, cav: 0.7, mythe: 0.9 },
    cav:    { archer: 1.6, siege: 1.6, inf: 0.8, mythe: 0.9 },
    siege:  { inf: 0.5, archer: 0.5, cav: 0.4, heros: 0.4, mythe: 0.5 },
    heros:  { mythe: 3, inf: 1.1, cav: 1.1, archer: 1.1 },
    mythe:  { inf: 1.4, archer: 1.4, cav: 1.3, milice: 1.4, heros: 0.6 },
    milice: {}
  };
  const mult = (a, b) => (PM.CONTRES[a] && PM.CONTRES[a][b]) || 1;
  PM.mult = mult;

  // gabarits des unités humaines (les noms changent selon le panthéon)
  const H = {
    inf:    { att: 5,  pv: 10, pop: 1, cout: { nourriture: 30, or: 10 }, entretien: { nourriture: 0.25 }, age: 0 },
    archer: { att: 6,  pv: 7,  pop: 1, cout: { nourriture: 20, bois: 18 }, entretien: { nourriture: 0.2 }, age: 0 },
    cav:    { att: 7,  pv: 12, pop: 1, cout: { nourriture: 35, or: 25 }, entretien: { nourriture: 0.3, or: 0.05 }, age: 0, vitesse: 1.5 },
    heros:  { att: 11, pv: 24, pop: 2, cout: { nourriture: 60, or: 60 }, entretien: { or: 0.3 }, age: 1 },
    siege:  { att: 4,  pv: 14, pop: 2, cout: { bois: 60, or: 40 }, entretien: { or: 0.15 }, age: 2, vitesse: 0.8 }
  };
  PM.UNITES = { milice: { nom: 'Milice', cat: 'milice', att: 4, pv: 10, pop: 0, cout: {}, entretien: {}, age: 9, emoji: '🛡️' } };
  const humain = (id, pantheon, cat, nom, emoji, plus) => { PM.UNITES[id] = Object.assign({ nom, cat, pantheon, emoji }, H[cat], plus || {}); };
  // créatures mythiques : débloquées par un dieu mineur
  const mythe = (id, nom, emoji, att, pv, pop, cout, plus) => {
    PM.UNITES[id] = Object.assign({ nom, cat: 'mythe', att, pv, pop, cout, entretien: { faveur: +(pop * 0.04).toFixed(2), nourriture: 0.2 }, age: 1, emoji }, plus || {});
  };

  humain('hoplite', 'grecs', 'inf', 'Hoplites', '🛡️'); humain('toxote', 'grecs', 'archer', 'Toxotes', '🏹');
  humain('hippeus', 'grecs', 'cav', 'Hippeis', '🐎'); humain('heros_grec', 'grecs', 'heros', 'Héros', '🦸');
  humain('petrobole', 'grecs', 'siege', 'Pétroboles', '🪨');
  humain('axeman', 'egyptiens', 'inf', 'Porteurs de hache', '🪓', { cout: { nourriture: 32, or: 6 } });
  humain('frondeur', 'egyptiens', 'archer', 'Frondeurs', '🎯'); humain('char', 'egyptiens', 'cav', 'Chars', '🛞');
  humain('pretre', 'egyptiens', 'heros', 'Prêtres', '🧙', { att: 9, pv: 20, cout: { nourriture: 40, or: 50 } });
  humain('catapulte', 'egyptiens', 'siege', 'Catapultes', '🪨');
  humain('ulfsark', 'nordiques', 'inf', 'Ulfsarks', '🪓', { att: 6 }); humain('lanceur', 'nordiques', 'archer', 'Lanceurs de hache', '🎯');
  humain('raider', 'nordiques', 'cav', 'Pillards montés', '🐎'); humain('hersir', 'nordiques', 'heros', 'Hersirs', '🦸');
  humain('belier', 'nordiques', 'siege', 'Béliers', '🪵');
  humain('murmillo', 'atlantes', 'inf', 'Murmillos', '🛡️'); humain('arcus', 'atlantes', 'archer', 'Arcus', '🏹');
  humain('contarius', 'atlantes', 'cav', 'Contarii', '🐎'); humain('heros_atl', 'atlantes', 'heros', 'Héros atlantes', '🦸');
  humain('siphon', 'atlantes', 'siege', 'Siphons de feu', '🔥');

  mythe('minotaure', 'Minotaures', '🐂', 16, 40, 3, { nourriture: 40, or: 40, faveur: 12 });
  mythe('cyclope', 'Cyclopes', '👁️', 20, 46, 4, { nourriture: 50, or: 50, faveur: 16 }, { vsFort: 1.5 });
  mythe('centaure', 'Centaures', '🏇', 18, 36, 3, { nourriture: 40, or: 50, faveur: 14 }, { vitesse: 1.5, age: 2 });
  mythe('lion_nemee', 'Lions de Némée', '🦁', 22, 44, 4, { nourriture: 60, or: 50, faveur: 18 }, { age: 2 });
  mythe('colosse', 'Colosses', '🗿', 30, 90, 5, { or: 120, bois: 60, faveur: 28 }, { age: 3, vsFort: 2 });
  mythe('chimere', 'Chimères', '🐉', 34, 70, 5, { nourriture: 80, or: 90, faveur: 30 }, { age: 3 });
  mythe('ombre', 'Ombres', '👻', 10, 26, 2, { nourriture: 20, or: 20, faveur: 8 }, { age: 9 });
  mythe('anubite', 'Anubites', '🐺', 15, 32, 3, { nourriture: 30, or: 40, faveur: 12 }, { vitesse: 1.5 });
  mythe('sphinx', 'Sphinx', '🦁', 17, 44, 3, { nourriture: 45, or: 40, faveur: 13 });
  mythe('scorpion', 'Hommes-scorpions', '🦂', 22, 46, 4, { nourriture: 50, or: 60, faveur: 18 }, { age: 2 });
  mythe('momie', 'Momies', '🧟', 18, 40, 3, { nourriture: 40, or: 50, faveur: 15 }, { age: 2 });
  mythe('phenix', 'Phénix', '🔥', 30, 60, 5, { nourriture: 60, or: 100, faveur: 28 }, { age: 3, vitesse: 2 });
  mythe('avatar', 'Avatars d’Horus', '🦅', 32, 80, 5, { nourriture: 80, or: 90, faveur: 30 }, { age: 3 });
  mythe('valkyrie', 'Valkyries', '🪽', 16, 34, 3, { nourriture: 40, or: 50, faveur: 12 }, { vitesse: 1.6 });
  mythe('einherjar', 'Einherjar', '⚔️', 17, 40, 3, { nourriture: 50, or: 40, faveur: 13 });
  mythe('geant_givre', 'Géants de givre', '🧊', 24, 54, 4, { nourriture: 60, or: 60, faveur: 20 }, { age: 2 });
  mythe('geant_mont', 'Géants des montagnes', '⛰️', 26, 60, 4, { nourriture: 60, or: 70, faveur: 21 }, { age: 2, vsFort: 1.5 });
  mythe('geant_feu', 'Géants de feu', '🌋', 34, 74, 5, { nourriture: 80, or: 100, faveur: 30 }, { age: 3 });
  mythe('fenrir', 'Loups de Fenrir', '🐺', 30, 60, 4, { nourriture: 70, or: 70, faveur: 26 }, { age: 3, vitesse: 1.6 });
  mythe('promethee', 'Prométhéens', '🔥', 15, 40, 3, { nourriture: 45, or: 35, faveur: 12 });
  mythe('automate', 'Automates', '🤖', 14, 42, 3, { bois: 40, or: 50, faveur: 12 });
  mythe('caladria', 'Caladrias', '🕊️', 18, 38, 3, { nourriture: 50, or: 50, faveur: 15 }, { age: 2, vitesse: 1.5 });
  mythe('satyre', 'Satyres', '🐐', 22, 40, 4, { nourriture: 50, or: 60, faveur: 17 }, { age: 2 });
  mythe('heka', 'Hécatonchires', '🦾', 34, 80, 5, { nourriture: 80, or: 100, faveur: 30 }, { age: 3 });
  mythe('titan', 'Titans', '🗿', 70, 260, 12, { nourriture: 300, or: 300, faveur: 80 }, { age: 9 });
  mythe('heros_ragnarok', 'Guerriers du Ragnarök', '🪓', 12, 26, 2, { nourriture: 30, or: 30, faveur: 8 }, { age: 9 });

  // pouvoirs divins : coût en faveur, recharge en mois ; cible : ennemi (province d'un autre), propre (sa province), nation (autre peuple), aucune
  PM.POUVOIRS = {};
  const P = (id, nom, emoji, cout, recharge, cible, effet, desc) => { PM.POUVOIRS[id] = { id, nom, emoji, cout, recharge, cible, effet, desc }; };
  P('foudre', 'Foudre de Zeus', '⚡', 25, 12, 'ennemi', { degats: 0.4 }, 'Détruit 40 % de l’armée ennemie d’une province.');
  P('seisme', 'Séisme', '🌋', 30, 18, 'ennemi', { degats: 0.15, batiments: 2, remparts: true }, 'Abat les remparts et deux bâtiments d’une province.');
  P('ombres', 'Armée des ombres', '👻', 30, 18, 'aucune', { invoquer: { unite: 'ombre', nombre: 5 } }, 'Cinq Ombres se lèvent dans ta capitale.');
  P('restauration', 'Restauration', '💚', 18, 12, 'propre', { soin: 0.35 }, 'Tes armées d’une province regagnent 35 % de leurs effectifs.');
  P('peste', 'Peste d’Arès', '🦠', 30, 18, 'nation', { malusArmees: 0.12 }, 'Toutes les armées d’un peuple perdent 12 %.');
  P('oracle', 'Oracle d’Apollon', '🔮', 20, 18, 'aucune', { diplo: 20 }, 'Tous les peuples t’estiment davantage (+20 relations).');
  P('seduction', 'Charme d’Aphrodite', '💘', 35, 24, 'ennemi', { seduction: 0.25 }, 'Un quart de l’armée ennemie d’une province passe dans ton camp.');
  P('abondance', 'Coffre d’abondance', '💰', 30, 18, 'aucune', { ressources: { or: 500, bois: 300 } }, '+500 or et +300 bois.');
  P('tempete', 'Tempête de foudre', '🌩️', 45, 24, 'ennemi', { degats: 0.6, voisins: 0.2 }, '60 % de l’armée ciblée détruite, 20 % dans les provinces voisines.');
  P('pluie', 'Pluie de Râ', '🌧️', 20, 18, 'aucune', { bonus: { cle: 'nourriture', valeur: 1, duree: 8 } }, 'Ta nourriture double pendant 8 mois.');
  P('bouclier', 'Bouclier d’Isis', '🛡️', 25, 18, 'propre', { bouclier: 12 }, 'Une province devient imprenable par les dieux et sa défense double pendant 12 mois.');
  P('fleau_seth', 'Fléau de Seth', '🐍', 30, 18, 'ennemi', { degats: 0.3, dev: 1 }, '30 % de l’armée détruite et la province perd un niveau.');
  P('serpents', 'Fléau des serpents', '🐍', 25, 14, 'ennemi', { degats: 0.3 }, '30 % de l’armée ennemie d’une province détruite.');
  P('rite_bastet', 'Rite de Bastet', '🐈', 15, 12, 'aucune', { ressources: { nourriture: 400 } }, '+400 nourriture.');
  P('lance_sekhmet', 'Lance de Sekhmet', '🔱', 30, 16, 'ennemi', { degats: 0.35, batiments: 1 }, '35 % de l’armée et un bâtiment détruits.');
  P('resurrection', 'Fils d’Osiris', '🧟', 30, 18, 'aucune', { invoquer: { unite: 'momie', nombre: 3 } }, 'Trois Momies se lèvent dans ta capitale.');
  P('meteores', 'Pluie de météores', '☄️', 50, 24, 'ennemi', { degats: 0.55, batiments: 3, dev: 1 }, '55 % de l’armée, trois bâtiments et un niveau détruits.');
  P('tornade', 'Tornade d’Horus', '🌪️', 40, 20, 'ennemi', { degats: 0.35, voisins: 0.15 }, '35 % de l’armée ciblée, 15 % autour.');
  P('chasse', 'Grande Chasse', '🐗', 15, 12, 'aucune', { ressources: { nourriture: 450 } }, '+450 nourriture.');
  P('mine_naine', 'Mine naine', '⛏️', 20, 14, 'aucune', { ressources: { or: 400 } }, '+400 or.');
  P('ruse', 'Ruse de Loki', '🃏', 25, 14, 'ennemi', { degats: 0.25, paralysie: 3 }, 'L’armée ciblée perd 25 % et reste figée 3 mois.');
  P('valkyries', 'Bénédiction des Valkyries', '🪽', 18, 12, 'propre', { soin: 0.4 }, 'Tes armées d’une province regagnent 40 %.');
  P('vigilance', 'Vigilance de Heimdall', '👁️', 20, 18, 'propre', { remparts: true, bouclier: 12 }, 'Remparts immédiats et défense doublée 12 mois.');
  P('hiver', 'Hiver éternel', '❄️', 35, 24, 'nation', { malus: { valeur: 0.5, duree: 6 } }, 'La production d’un peuple est divisée par deux pendant 6 mois.');
  P('vagues', 'Vagues de Njörd', '🌊', 20, 14, 'aucune', { ressources: { bois: 350, nourriture: 300 } }, '+350 bois et +300 nourriture.');
  P('ragnarok', 'Ragnarök', '🔥', 60, 36, 'aucune', { invoquer: { unite: 'heros_ragnarok', nombre: 2, partout: true } }, 'Deux guerriers se lèvent dans chacune de tes provinces.');
  P('fimbulvetr', 'Fimbulvetr', '🌨️', 50, 24, 'ennemi', { degats: 0.45, voisins: 0.3 }, '45 % de l’armée ciblée, 30 % dans les provinces voisines.');
  P('distorsion', 'Distorsion du temps', '⏳', 30, 30, 'aucune', { temps: true }, 'Recharge tous tes autres pouvoirs et achève ton passage d’âge.');
  P('tir_celeste', 'Tir céleste', '🌠', 25, 12, 'ennemi', { degats: 0.4 }, '40 % de l’armée ennemie d’une province détruite.');
  P('floraison', 'Floraison de Gaïa', '🌸', 25, 16, 'propre', { gainDev: 1, ressources: { nourriture: 200 } }, 'Une de tes provinces gagne un niveau, +200 nourriture.');
  P('feu_vole', 'Feu de Prométhée', '🔥', 25, 14, 'ennemi', { degats: 0.3, batiments: 1 }, '30 % de l’armée et un bâtiment détruits.');
  P('essaim', 'Essaim d’automates', '🤖', 25, 16, 'aucune', { invoquer: { unite: 'automate', nombre: 4 } }, 'Quatre Automates dans ta capitale.');
  P('deluge', 'Déluge d’Océanos', '🌊', 35, 20, 'ennemi', { degats: 0.2, batiments: 3 }, 'Trois bâtiments emportés, 20 % de l’armée noyée.');
  P('discorde', 'Discorde d’Hypérion', '🌀', 30, 24, 'nation', { discorde: 40 }, 'Un peuple se brouille avec tous les autres (-40 relations).');
  P('vortex', 'Vortex d’Hélios', '🌀', 40, 24, 'ennemi', { vortex: true }, 'Toutes tes armées libres sont transportées dans la province ciblée.');
  P('porte_titans', 'Porte des Titans', '🗿', 80, 48, 'aucune', { invoquer: { unite: 'titan', nombre: 1 } }, 'Un Titan surgit dans ta capitale.');
  P('benediction', 'Bénédiction guerrière', '🗡️', 25, 18, 'aucune', { bonus: { cle: 'attaque', valeur: 0.3, duree: 6 } }, 'Tes armées frappent 30 % plus fort pendant 6 mois.');

  // panthéons : dieux majeurs (bonus + pouvoir), dieux mineurs par âge (créature + pouvoir)
  PM.PANTHEONS = {
    grecs: { nom: 'Grecs', emoji: '🏛️', couleur: '#3f7fd6', unites: ['hoplite', 'toxote', 'hippeus', 'heros_grec', 'petrobole'],
      faveur: 'Les temples grecs rapportent 50 % de faveur en plus.',
      majeurs: [
        { id: 'zeus', nom: 'Zeus', pouvoir: 'foudre', bonus: { attaqueHeros: 0.25, faveurTemple: 0.2 }, desc: 'Héros 25 % plus forts, temples plus fervents.' },
        { id: 'poseidon', nom: 'Poséidon', pouvoir: 'seisme', bonus: { coutCav: -0.25, vitesse: 0.15 }, desc: 'Cavalerie 25 % moins chère, armées plus rapides.' },
        { id: 'hades', nom: 'Hadès', pouvoir: 'ombres', bonus: { defense: 0.2 }, desc: 'Défense des provinces +20 %.' }
      ],
      mineurs: [
        [{ id: 'athena', nom: 'Athéna', unite: 'minotaure', pouvoir: 'restauration' }, { id: 'ares', nom: 'Arès', unite: 'cyclope', pouvoir: 'peste' }],
        [{ id: 'apollon', nom: 'Apollon', unite: 'centaure', pouvoir: 'oracle' }, { id: 'aphrodite', nom: 'Aphrodite', unite: 'lion_nemee', pouvoir: 'seduction' }],
        [{ id: 'hephaistos', nom: 'Héphaïstos', unite: 'colosse', pouvoir: 'abondance' }, { id: 'artemis', nom: 'Artémis', unite: 'chimere', pouvoir: 'tempete' }]
      ] },
    egyptiens: { nom: 'Égyptiens', emoji: '🔺', couleur: '#d6a23f', unites: ['axeman', 'frondeur', 'char', 'pretre', 'catapulte'],
      faveur: 'Les bâtiments égyptiens coûtent 20 % de moins.',
      majeurs: [
        { id: 'ra', nom: 'Râ', pouvoir: 'pluie', bonus: { nourriture: 0.15 }, desc: 'Nourriture +15 %.' },
        { id: 'isis', nom: 'Isis', pouvoir: 'bouclier', bonus: { coutPouvoir: -0.25 }, desc: 'Pouvoirs divins 25 % moins chers.' },
        { id: 'seth', nom: 'Seth', pouvoir: 'fleau_seth', bonus: { coutMythe: -0.2 }, desc: 'Créatures 20 % moins chères.' }
      ],
      mineurs: [
        [{ id: 'anubis', nom: 'Anubis', unite: 'anubite', pouvoir: 'serpents' }, { id: 'bastet', nom: 'Bastet', unite: 'sphinx', pouvoir: 'rite_bastet' }],
        [{ id: 'sekhmet', nom: 'Sekhmet', unite: 'scorpion', pouvoir: 'lance_sekhmet' }, { id: 'osiris', nom: 'Osiris', unite: 'momie', pouvoir: 'resurrection' }],
        [{ id: 'thot', nom: 'Thot', unite: 'phenix', pouvoir: 'meteores' }, { id: 'horus', nom: 'Horus', unite: 'avatar', pouvoir: 'tornade' }]
      ] },
    nordiques: { nom: 'Nordiques', emoji: '🪓', couleur: '#c0443a', unites: ['ulfsark', 'lanceur', 'raider', 'hersir', 'belier'],
      faveur: 'Les Nordiques gagnent de la faveur à chaque bataille gagnée.',
      majeurs: [
        { id: 'odin', nom: 'Odin', pouvoir: 'chasse', bonus: { soinDomicile: 0.04 }, desc: 'Armées soignées de 4 % par mois sur leurs terres.' },
        { id: 'thor', nom: 'Thor', pouvoir: 'mine_naine', bonus: { or: 0.15 }, desc: 'Or +15 %.' },
        { id: 'loki', nom: 'Loki', pouvoir: 'ruse', bonus: { faveurBataille: 0.5 }, desc: 'Faveur des batailles +50 %.' }
      ],
      mineurs: [
        [{ id: 'freyja', nom: 'Freyja', unite: 'valkyrie', pouvoir: 'valkyries' }, { id: 'heimdall', nom: 'Heimdall', unite: 'einherjar', pouvoir: 'vigilance' }],
        [{ id: 'skadi', nom: 'Skadi', unite: 'geant_givre', pouvoir: 'hiver' }, { id: 'njord', nom: 'Njörd', unite: 'geant_mont', pouvoir: 'vagues' }],
        [{ id: 'hel', nom: 'Hel', unite: 'geant_feu', pouvoir: 'ragnarok' }, { id: 'tyr', nom: 'Tyr', unite: 'fenrir', pouvoir: 'fimbulvetr' }]
      ] },
    atlantes: { nom: 'Atlantes', emoji: '🔱', couleur: '#2fa59a', unites: ['murmillo', 'arcus', 'contarius', 'heros_atl', 'siphon'],
      faveur: 'Chaque province atlante rapporte un peu de faveur.',
      majeurs: [
        { id: 'kronos', nom: 'Kronos', pouvoir: 'distorsion', bonus: { coutBatiment: -0.2 }, desc: 'Bâtiments 20 % moins chers.' },
        { id: 'ouranos', nom: 'Ouranos', pouvoir: 'tir_celeste', bonus: { vitesse: 0.25 }, desc: 'Armées 25 % plus rapides.' },
        { id: 'gaia', nom: 'Gaïa', pouvoir: 'floraison', bonus: { production: 0.1 }, desc: 'Toute la production +10 %.' }
      ],
      mineurs: [
        [{ id: 'promethee', nom: 'Prométhée', unite: 'promethee', pouvoir: 'feu_vole' }, { id: 'leto', nom: 'Léto', unite: 'automate', pouvoir: 'essaim' }],
        [{ id: 'oceanos', nom: 'Océanos', unite: 'caladria', pouvoir: 'deluge' }, { id: 'hyperion', nom: 'Hypérion', unite: 'satyre', pouvoir: 'discorde' }],
        [{ id: 'helios', nom: 'Hélios', unite: 'heka', pouvoir: 'vortex' }, { id: 'atlas', nom: 'Atlas', unite: 'heka', pouvoir: 'porte_titans' }]
      ] }
  };

  // noms : syllabes par culture (provinces) et noms de peuples proposés
  PM.CULTURES = {
    grecs: { a: ['Ath', 'Kor', 'Myk', 'Thes', 'Del', 'Arg', 'Spar', 'Eph', 'Ol', 'Py', 'Mil', 'Nax', 'Lar', 'Kni', 'Phok', 'Mes', 'Itha', 'Sal', 'Rho', 'Kyth', 'Pel', 'Tir', 'Ely'], b: ['os', 'ène', 'ia', 'is', 'ae', 'on', 'ée', 'yra', 'ie', 'ope', 'ynthe', 'ia'] },
    egyptiens: { a: ['Mem', 'Theb', 'Aby', 'Sai', 'Kar', 'Ed', 'Heli', 'Asw', 'Nekh', 'Bub', 'Den', 'Kom', 'Sak', 'Amar', 'Giz', 'Tan', 'Hie', 'Ombo'], b: ['phis', 'is', 'ou', 'os', 'ak', 'era', 'ar', 'opolis', 'et', 'ah', 'an'] },
    nordiques: { a: ['Upp', 'Hed', 'Bir', 'Ska', 'Tron', 'Vik', 'Hal', 'Jor', 'Sig', 'Ulf', 'Rag', 'Thors', 'Fjal', 'Kaup', 'Rib', 'Hrafn', 'Ask', 'Grim'], b: ['sala', 'by', 'heim', 'gard', 'vik', 'borg', 'fjord', 'stad', 'holm', 'nes', 'dal'] },
    atlantes: { a: ['Atl', 'Pos', 'Orei', 'Kalyp', 'Thal', 'Aig', 'Ner', 'Pel', 'Okea', 'Lem', 'Kyr', 'Elas', 'Mest', 'Aza', 'Eum', 'Gad'], b: ['antis', 'idonia', 'ée', 'ys', 'os', 'ia', 'ante', 'ore', 'ion', 'é', 'eira'] },
    tribus: { a: ['Ar', 'Bel', 'Cor', 'Dun', 'Eb', 'Gal', 'Hel', 'Iv', 'Lug', 'Mor', 'Nar', 'Tar', 'Ver', 'Ul', 'Sar', 'Kel', 'Bri', 'Ola'], b: ['ia', 'um', 'ac', 'os', 'ène', 'ar', 'ie', 'one', 'as', 'ède'] }
  };
  PM.NOMS_PEUPLES = {
    grecs: ['Ligue d’Achaïe', 'Cité d’Argos', 'Thessalie', 'Rhodes', 'Empire de Mycènes', 'Béotie', 'Ionie'],
    egyptiens: ['Haute-Égypte', 'Royaume de Koush', 'Basse-Égypte', 'Nubie', 'Dynastie de Saïs', 'Pount'],
    nordiques: ['Jarls d’Uppsala', 'Clan d’Ymir', 'Royaume de Hedeby', 'Peuple des Fjords', 'Ases du Nord', 'Hálogaland'],
    atlantes: ['Atlantide', 'Poséidonia', 'Lémurie', 'Thalassocratie d’Oréia', 'Hyperborée', 'Gadeira']
  };
  PM.COULEURS = ['#3f7fd6', '#d6a23f', '#c0443a', '#2fa59a', '#8e5bd1', '#e07b39', '#4fae4a', '#d14f8f', '#5b6ee0', '#a3a33a', '#3aa0c8', '#b5653f'];

  // événements de la chronique (pour le joueur) : choix → effets appliqués par le moteur (voir appliquerEffets)
  PM.EVENEMENTS = [
    { id: 'oracle', titre: 'La Pythie a parlé', texte: 'Une prophétie trouble circule : « Le peuple qui honore les dieux verra ses ennemis trembler. »',
      choix: [{ t: 'Offrir des sacrifices (−150 nourriture)', e: { nourriture: -150, faveur: 30 } }, { t: 'Ignorer les augures', e: { faveur: -5 } }] },
    { id: 'comete', titre: 'Une comète dans le ciel', texte: 'Une traînée de feu traverse la nuit. Le peuple y voit un signe.',
      choix: [{ t: 'Proclamer un présage de victoire', e: { attaque: 0.15, duree: 6 } }, { t: 'Rassurer le peuple par des fêtes (−100 nourriture)', e: { nourriture: -100, faveur: 10, dev: 1 } }] },
    { id: 'marchands', titre: 'Des marchands venus de la mer', texte: 'Des navires chargés d’étoffes et d’ambre accostent. Ils proposent un échange.',
      choix: [{ t: 'Échanger du bois contre de l’or', e: { bois: -150, or: 200 } }, { t: 'Taxer leurs cargaisons', e: { or: 80, relationsTous: -5 } }, { t: 'Les renvoyer', e: {} }] },
    { id: 'filon', titre: 'Un filon d’or', texte: 'Des bergers ont trouvé de l’or dans une colline de {province}.',
      choix: [{ t: 'Ouvrir une mine (gratuite)', e: { batiment: 'mine', or: 50 } }, { t: 'Garder le secret', e: { or: 120 } }] },
    { id: 'revolte', titre: 'Grogne à {province}', texte: 'Les paysans de {province} refusent l’impôt. Les esprits s’échauffent.',
      choix: [{ t: 'Accorder une remise (−120 or)', e: { or: -120 } }, { t: 'Envoyer la troupe', e: { devMoins: 1, milice: 3 } }] },
    { id: 'heros', titre: 'Un héros demande audience', texte: 'Un guerrier légendaire, revenu d’un long voyage, propose son épée.',
      choix: [{ t: 'L’accueillir (−80 or)', e: { or: -80, heros: 2 } }, { t: 'Le renvoyer poliment', e: { faveur: 5 } }] },
    { id: 'epidemie', titre: 'Une fièvre se répand', texte: 'Une maladie frappe les campements de tes soldats.',
      choix: [{ t: 'Prier les dieux (−25 faveur)', e: { faveur: -25 } }, { t: 'Laisser faire', e: { pertes: 0.12 } }] },
    { id: 'monstre', titre: 'Une bête ravage {province}', texte: 'Une créature sortie des marais dévore les troupeaux de {province}.',
      choix: [{ t: 'Payer un chasseur (−100 or)', e: { or: -100 } }, { t: 'La laisser faire', e: { nourriture: -200, devMoins: 1 } }, { t: 'Lui offrir un culte', e: { faveur: 20, nourriture: -100 } }] },
    { id: 'mariage', titre: 'Une alliance par le mariage', texte: 'La cour de {nation} propose d’unir vos maisons.',
      choix: [{ t: 'Accepter (−100 or)', e: { or: -100, relationNation: 35 } }, { t: 'Refuser', e: { relationNation: -15 } }] },
    { id: 'sages', titre: 'Les sages de la capitale', texte: 'Des savants proposent de rédiger les lois et les récits de ton peuple.',
      choix: [{ t: 'Les financer (−150 or)', e: { or: -150, devCapitale: 1, faveur: 10 } }, { t: 'Plus tard', e: {} }] },
    { id: 'moisson', titre: 'Une moisson exceptionnelle', texte: 'Les greniers débordent cette année.',
      choix: [{ t: 'Stocker', e: { nourriture: 300 } }, { t: 'Offrir une partie aux dieux', e: { nourriture: 120, faveur: 15 } }] },
    { id: 'incendie', titre: 'Incendie à {province}', texte: 'Un feu parti d’une forge se répand dans les entrepôts de {province}.',
      choix: [{ t: 'Reconstruire (−120 bois)', e: { bois: -120 } }, { t: 'Abandonner les entrepôts', e: { batimentMoins: 1 } }] },
    { id: 'deserteurs', titre: 'Des déserteurs étrangers', texte: 'Des soldats de {nation} ont fui leur armée et demandent asile.',
      choix: [{ t: 'Les enrôler', e: { soldats: 6, relationNation: -10 } }, { t: 'Les renvoyer chez eux', e: { relationNation: 10 } }] },
    { id: 'temple_ancien', titre: 'Les ruines d’un temple', texte: 'Des ruines oubliées ont été découvertes près de {province}.',
      choix: [{ t: 'Les restaurer (−100 bois, −60 or)', e: { bois: -100, or: -60, batiment: 'temple' } }, { t: 'Piller les trésors', e: { or: 150, faveur: -15 } }] },
    { id: 'eclipse', titre: 'Éclipse', texte: 'Le soleil disparaît en plein jour. Les prêtres réclament des offrandes.',
      choix: [{ t: 'Offrandes (−100 or)', e: { or: -100, faveur: 25 } }, { t: 'Rester impassible', e: { faveur: -10 } }] },
    { id: 'pirates', titre: 'Des pillards sur les côtes', texte: 'Des navires sans bannière pillent les villages côtiers de {province}.',
      choix: [{ t: 'Lever une milice', e: { milice: 4, nourriture: -60 } }, { t: 'Payer un tribut (−100 or)', e: { or: -100 } }] }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
