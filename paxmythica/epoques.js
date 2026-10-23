/* Pax Mythica — époques : Antiquité (mythologie), Moyen Âge, ère industrielle, époque moderne, futur. Une époque garde les règles
   et l'équilibre du jeu mais change tout ce qui se voit : peuples, unités, créatures, bâtiments, âges, pouvoirs, vocabulaire et villes en 3D.
   PM.appliquerEpoque(id) remet les données d'origine (donnees.js) puis applique l'époque ; appelée à chaque nouvelle partie et chargement. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const CULTURES = ['grecs', 'egyptiens', 'nordiques', 'atlantes'], CATS = ['inf', 'archer', 'cav', 'heros', 'siege'];

  PM.EPOQUES = {
    antique: { nom: 'Antiquité', emoji: '🏛️', desc: 'Dieux, créatures mythiques et pouvoirs divins : Grecs, Égyptiens, Nordiques et Atlantes.' },
    medieval: {
      nom: 'Moyen Âge', emoji: '🏰', desc: 'Châteaux, chevaliers et ordres légendaires. Griffons, golems et dragons.',
      ages: [['Haut Moyen Âge', 'Haut M. Â.'], ['Âge féodal', 'Féodal'], ['Âge des châteaux', 'Châteaux'], ['Âge impérial', 'Impérial']],
      cultures: { grecs: ['Byzantins', '🦅', ['Empire de Byzance', 'Despotat de Morée', 'Thème d’Anatolie', 'Royaume de Trébizonde', 'Duché d’Athènes']],
        egyptiens: ['Califats', '🌙', ['Califat d’Al-Andalus', 'Sultanat du Caire', 'Émirat de Sicile', 'Califat de Bagdad', 'Sultanat de Grenade']],
        nordiques: ['Vikings', '🪓', ['Jarls de Norvège', 'Royaume du Danelaw', 'Rus de Kiev', 'Clans d’Islande', 'Royaume de Dublin']],
        atlantes: ['Avaloniens', '🗡️', ['Royaume d’Avalon', 'Duché de Lyonesse', 'Comté de Brocéliande', 'Royaume de Camelot', 'Marche d’Ys']] },
      mots: { dieux: 'Légendes', dieu: 'légende', majeur: 'grande légende', mineurs: 'Ordres et légendes', pouvoirs: 'Hauts faits', faveur: 'foi', icone: '🕯️', creature: 'Créature légendaire', pantheon: 'Royaume', choisir: 'Choisis ta légende' },
      majeurs: ['Le Roi bâtisseur', 'La Reine guerrière', 'Le Grand Chancelier'],
      mineurs: [['Fauconniers', 'Bâtisseurs de golems'], ['Chasseurs de wyvernes', 'Seigneurs des cavernes'], ['Dragonniers', 'Gardiens du Graal']],
      unites: { inf: ['Hommes d’armes', '⚔️'], archer: ['Arbalétriers', '🏹'], cav: ['Chevaliers', '🐎'], heros: ['Paladins', '🛡️'], siege: ['Trébuchets', '🪨'] },
      speciales: [[['Griffons', '🦅'], ['Golems', '🗿']], [['Wyvernes', '🐉'], ['Trolls des cavernes', '👹']], [['Dragons', '🐲'], ['Chevaliers du Graal', '✨']]],
      invocations: { ombre: 'Spectres', momie: 'Revenants', automate: 'Golems de pierre', heros_ragnarok: 'Croisés', titan: 'Dragon ancestral' },
      batiments: { ferme: ['Champs et moulins', '🌾'], scierie: ['Scierie', '🪓'], mine: ['Mine', '⛏️'], temple: ['Cathédrale', '⛪'], remparts: ['Château fort', '🏰'], merveille: ['Cathédrale de légende', '🏰'] }
    },
    industriel: {
      nom: 'Ère industrielle', emoji: '🏭', desc: 'Vapeur, fusils et canons. Automates, dirigeables et forteresses mobiles.',
      ages: [['Âge de la vapeur', 'Vapeur'], ['Âge du charbon', 'Charbon'], ['Âge de l’acier', 'Acier'], ['Âge électrique', 'Électrique']],
      cultures: { grecs: ['Républiques', '🎩', ['République d’Argentane', 'Commune de Valmont', 'République des Lacs', 'Confédération d’Orval']],
        egyptiens: ['Empires des sables', '🐪', ['Empire de Kémet', 'Sultanat d’Azur', 'Khédivat du Nil', 'Empire de Sabaa']],
        nordiques: ['Ligue du Nord', '⚓', ['Ligue hanséatique', 'Royaume de Norrland', 'Confédération boréale', 'Principauté de Kalmar']],
        atlantes: ['Cités-vapeur', '⚙️', ['Cité-vapeur de Brassport', 'Technopole d’Ys', 'Compagnie de l’Engrenage', 'Cité de Cuivre']] },
      mots: { dieux: 'Doctrines', dieu: 'doctrine', majeur: 'doctrine', mineurs: 'Inventions', pouvoirs: 'Grandes manœuvres', faveur: 'prestige', icone: '🎖️', creature: 'Machine', pantheon: 'Nation', choisir: 'Choisis ta doctrine' },
      majeurs: ['Doctrine du progrès', 'Doctrine impériale', 'Doctrine du commerce'],
      mineurs: [['Mécanique', 'Chemins de fer'], ['Aérostation', 'Mitrailleuse'], ['Artillerie lourde', 'Moteur à vapeur']],
      unites: { inf: ['Fusiliers', '🪖'], archer: ['Tirailleurs', '🎯'], cav: ['Dragons à cheval', '🐎'], heros: ['Officiers', '🎖️'], siege: ['Canons', '💣'] },
      speciales: [[['Automates à vapeur', '🤖'], ['Cuirassés terrestres', '🚂']], [['Dirigeables', '🎈'], ['Mitrailleuses', '💥']], [['Canons géants', '💣'], ['Tanks à vapeur', '⚙️']]],
      invocations: { ombre: 'Volontaires', momie: 'Conscrits', automate: 'Automates', heros_ragnarok: 'Garde nationale', titan: 'Forteresse mobile' },
      batiments: { ferme: ['Fermes mécanisées', '🚜'], scierie: ['Scierie à vapeur', '🪚'], mine: ['Mine de charbon', '⛏️'], temple: ['Académie des sciences', '🔬'], remparts: ['Forteresse', '🧱'], merveille: ['Exposition universelle', '🗼'] }
    },
    moderne: {
      nom: 'Époque moderne', emoji: '✈️', desc: 'Chars, avions et missiles. Opérations spéciales et satellites.',
      ages: [['Après-guerre', 'Après-guerre'], ['Âge atomique', 'Atomique'], ['Âge spatial', 'Spatial'], ['Âge numérique', 'Numérique']],
      cultures: { grecs: ['Fédérations', '🦅', ['Fédération d’Alvane', 'États unis d’Ostrie', 'République fédérale de Kervel', 'Union d’Arcadie']],
        egyptiens: ['Émirats', '🛢️', ['Émirats de Qasra', 'Royaume du Sahel', 'Union des Oasis', 'Sultanat de Zafir']],
        nordiques: ['Union boréale', '❄️', ['Union boréale', 'République de Skandia', 'Pacte du Nord', 'Fédération de Lapon']],
        atlantes: ['Consortiums', '🏢', ['Consortium Néréide', 'Corporation Atlas', 'Groupe Thalassa', 'Compagnie Poséidon']] },
      mots: { dieux: 'Doctrines', dieu: 'doctrine', majeur: 'doctrine', mineurs: 'Programmes', pouvoirs: 'Opérations spéciales', faveur: 'influence', icone: '📡', creature: 'Engin', pantheon: 'Bloc', choisir: 'Choisis ta doctrine' },
      majeurs: ['Doctrine défensive', 'Doctrine de projection', 'Doctrine économique'],
      mineurs: [['Programme blindé', 'Programme aérien'], ['Programme balistique', 'Aéromobilité'], ['Aviation stratégique', 'Opérations spéciales']],
      unites: { inf: ['Infanterie', '🪖'], archer: ['Lance-roquettes', '🚀'], cav: ['Blindés légers', '🚙'], heros: ['Commandos', '🎖️'], siege: ['Artillerie', '💥'] },
      speciales: [[['Chars', '🛡️'], ['Chasseurs', '✈️']], [['Missiles', '🚀'], ['Hélicoptères', '🚁']], [['Bombardiers', '🛩️'], ['Forces spéciales', '🥷']]],
      invocations: { ombre: 'Réservistes', momie: 'Milices', automate: 'Drones', heros_ragnarok: 'Garde nationale', titan: 'Super-char' },
      batiments: { ferme: ['Agro-industrie', '🚜'], scierie: ['Usines', '🏭'], mine: ['Raffinerie', '🛢️'], temple: ['Centre de recherche', '🔬'], remparts: ['Bunkers', '🧱'], merveille: ['Gratte-ciel', '🏙️'] }
    },
    futur: {
      nom: 'Futur', emoji: '🚀', desc: 'Mécas, lasers et armes orbitales. Clones, nanites et ascenseurs spatiaux.',
      ages: [['Âge orbital', 'Orbital'], ['Âge stellaire', 'Stellaire'], ['Âge quantique', 'Quantique'], ['Âge transcendant', 'Transcendant']],
      cultures: { grecs: ['Concorde solaire', '☀️', ['Concorde d’Hélios', 'Colonie Aurore', 'Directoire Lumen', 'Cité d’Apogée']],
        egyptiens: ['Dynastie de Mars', '🔴', ['Dynastie rouge', 'Hégémonie d’Olympus', 'Royaume d’Arès', 'Lignée de Phobos']],
        nordiques: ['Clans cryogéniques', '🧊', ['Clans de Titan', 'Ligue d’Europa', 'Horde cryogénique', 'Clan d’Encelade']],
        atlantes: ['Ascendants', '💠', ['Ascendants d’Abysse', 'Collectif Néréide', 'Esprit atlante', 'Cœur de Thalassa']] },
      mots: { dieux: 'Technologies', dieu: 'protocole', majeur: 'protocole', mineurs: 'Percées', pouvoirs: 'Armes orbitales', faveur: 'énergie', icone: '⚡', creature: 'Méca', pantheon: 'Civilisation', choisir: 'Choisis ton protocole' },
      majeurs: ['Protocole Bouclier', 'Protocole Assaut', 'Protocole Expansion'],
      mineurs: [['Robotique', 'Mécatronique'], ['Exosquelettes lourds', 'Propulsion stellaire'], ['Fusion', 'Nanotechnologie']],
      unites: { inf: ['Fantassins exo', '🤖'], archer: ['Tireurs laser', '✴️'], cav: ['Glisseurs', '🛸'], heros: ['Commandeurs', '🦾'], siege: ['Canons à plasma', '🔆'] },
      speciales: [[['Drones de combat', '🛸'], ['Mécas légers', '🤖']], [['Mécas lourds', '🦾'], ['Chasseurs stellaires', '🚀']], [['Titans de guerre', '🗿'], ['Essaims de nanites', '🌫️']]],
      invocations: { ombre: 'Hologrammes', momie: 'Clones', automate: 'Drones', heros_ragnarok: 'Légion clonée', titan: 'Méca titan' },
      batiments: { ferme: ['Fermes hydroponiques', '🌱'], scierie: ['Fabricateurs', '🏭'], mine: ['Extracteurs', '⛏️'], temple: ['Réacteur', '⚛️'], remparts: ['Bouclier énergétique', '🛡️'], merveille: ['Ascenseur spatial', '🚀'] }
    }
  };
  // noms des pouvoirs selon leur effet et l'époque
  const NOMS_POUVOIRS = {
    medieval: { zone: [['Pluie de feu grégeois', '🔥'], ['Charge des Templiers', '⚔️']], batiments: [['Sape des murailles', '⛏️'], ['Incendie des faubourgs', '🔥']], degats: [['Embuscade', '🏹'], ['Volée de flèches', '🏹'], ['Duel de champions', '⚔️']],
      paralysie: [['Envoûtement', '🔮']], seduction: [['Corruption des barons', '💰']], malusArmees: [['Épidémie', '🦠']], malus: [['Peste noire', '☠️']], discorde: [['Intrigues de cour', '🗝️']], diplo: [['Ambassade royale', '📜']],
      soin: [['Hospitaliers', '💚'], ['Sources miraculeuses', '💧']], bouclier: [['Sanctuaire', '🛡️'], ['Guet des remparts', '🏰']], gainDev: [['Charte de franchise', '📜']], temps: [['Grande réforme', '⏳']], vortex: [['Chevauchée fantastique', '🐎']],
      invoquer: [['Levée en masse', '📯'], ['Appel des légendes', '✨']], bonusAttaque: [['Croisade', '🗡️']], bonusNourriture: [['Bénédiction des récoltes', '🌾']], ressources: [['Impôt royal', '💰'], ['Grande moisson', '🌾'], ['Pillage', '🪙']] },
    industriel: { zone: [['Barrage d’artillerie', '💣'], ['Bombardement naval', '⚓']], batiments: [['Dynamitage', '🧨'], ['Sabotage', '🔧']], degats: [['Feu de salve', '🎯'], ['Mitraillage', '💥'], ['Assaut à la baïonnette', '🪖']],
      paralysie: [['Gaz asphyxiant', '☁️']], seduction: [['Propagande', '📰']], malusArmees: [['Choléra', '🦠']], malus: [['Blocus', '⚓']], discorde: [['Espionnage', '🕵️']], diplo: [['Exposition universelle', '🎡']],
      soin: [['Croix de secours', '💚'], ['Hôpitaux de campagne', '🏥']], bouclier: [['Fortifications', '🧱'], ['Tranchées', '🪖']], gainDev: [['Chemin de fer', '🚂']], temps: [['Révolution industrielle', '⚙️']], vortex: [['Train blindé', '🚂']],
      invoquer: [['Conscription', '📯'], ['Usines d’armement', '🏭']], bonusAttaque: [['Patriotisme', '🎖️']], bonusNourriture: [['Engrais chimiques', '🧪']], ressources: [['Bourse', '📈'], ['Engrais', '🌾'], ['Colonies', '🪙']] },
    moderne: { zone: [['Bombardement aérien', '💣'], ['Frappe de missiles', '🚀']], batiments: [['Missile de croisière', '🚀'], ['Frappe chirurgicale', '🎯']], degats: [['Frappe de drone', '🛩️'], ['Tir d’artillerie', '💥'], ['Raid aéroporté', '🪂']],
      paralysie: [['Brouillage', '📡']], seduction: [['Défections', '📺']], malusArmees: [['Arme biologique', '🦠']], malus: [['Sanctions', '📉']], discorde: [['Désinformation', '📺']], diplo: [['Sommet mondial', '🤝']],
      soin: [['Hôpitaux mobiles', '🏥'], ['Évacuation sanitaire', '🚁']], bouclier: [['Défense antiaérienne', '🛡️'], ['Bunker', '🧱']], gainDev: [['Plan d’urbanisme', '🏙️']], temps: [['Révolution numérique', '💻']], vortex: [['Pont aérien', '✈️']],
      invoquer: [['Mobilisation', '📯'], ['Production de guerre', '🏭']], bonusAttaque: [['Doctrine de choc', '🎖️']], bonusNourriture: [['Révolution verte', '🌾']], ressources: [['Plan de relance', '📈'], ['Révolution verte', '🌾'], ['Commerce mondial', '🚢']] },
    futur: { zone: [['Frappe orbitale', '🛰️'], ['Tempête ionique', '🌩️']], batiments: [['Rayon désintégrateur', '🔆'], ['Nanites dévoreuses', '🌫️']], degats: [['Laser de précision', '✴️'], ['Canon à rail', '⚡'], ['Essaim de drones', '🛸']],
      paralysie: [['Impulsion électromagnétique', '⚡']], seduction: [['Piratage neuronal', '🧠']], malusArmees: [['Nanovirus', '🦠']], malus: [['Virus du réseau', '💾']], discorde: [['Manipulation des esprits', '🧠']], diplo: [['Réseau diplomatique', '📡']],
      soin: [['Nanosoins', '💉'], ['Régénération', '💚']], bouclier: [['Bouclier énergétique', '🛡️'], ['Dôme de force', '🔵']], gainDev: [['Arcologie', '🏙️']], temps: [['Singularité', '♾️']], vortex: [['Téléportation', '🌀']],
      invoquer: [['Clonage', '🧬'], ['Fabrication automatique', '🏭']], bonusAttaque: [['Stimulants neuraux', '💉']], bonusNourriture: [['Synthèse alimentaire', '🧪']], ressources: [['Extraction d’astéroïde', '☄️'], ['Synthèse alimentaire', '🧪'], ['Réplicateurs', '🔁']] }
  };
  const genre = f => f.voisins ? 'zone' : f.vortex ? 'vortex' : f.paralysie ? 'paralysie' : f.seduction ? 'seduction' : f.malusArmees ? 'malusArmees' : f.malus ? 'malus' : f.discorde ? 'discorde' : f.diplo ? 'diplo'
    : f.soin ? 'soin' : f.bouclier ? 'bouclier' : f.gainDev ? 'gainDev' : f.temps ? 'temps' : f.invoquer ? 'invoquer' : f.bonus ? (f.bonus.cle === 'attaque' ? 'bonusAttaque' : 'bonusNourriture')
    : f.ressources ? 'ressources' : (f.batiments || f.remparts) ? 'batiments' : 'degats';
  const pct = x => Math.round(x * 100) + ' %';
  // description tirée de l'effet (mêmes règles quelle que soit l'époque)
  PM.descriptionEffet = function (f) {
    const l = [];
    if (f.degats) l.push(`${pct(f.degats)} de l’armée ennemie d’une province détruits` + (f.voisins ? `, ${pct(f.voisins)} dans les provinces voisines` : ''));
    if (f.batiments) l.push(`${f.batiments} bâtiment${f.batiments > 1 ? 's' : ''} détruit${f.batiments > 1 ? 's' : ''}`);
    if (f.remparts && !f.bouclier) l.push('défenses abattues');
    if (f.remparts && f.bouclier) l.push('défenses immédiates');
    if (f.dev) l.push('la province perd un niveau');
    if (f.paralysie) l.push(`l’armée reste figée ${f.paralysie} mois`);
    if (f.seduction) l.push(`${pct(f.seduction)} de l’armée ennemie passe dans ton camp`);
    if (f.malusArmees) l.push(`toutes les armées d’un peuple perdent ${pct(f.malusArmees)}`);
    if (f.malus) l.push(`la production d’un peuple est divisée par deux pendant ${f.malus.duree} mois`);
    if (f.discorde) l.push(`un peuple se brouille avec tous les autres (−${f.discorde} relations)`);
    if (f.diplo) l.push(`tous les peuples t’estiment davantage (+${f.diplo} relations)`);
    if (f.ressources) l.push(Object.entries(f.ressources).map(([r, v]) => `+${v} ${PM.ICONES[r]}`).join(' et '));
    if (f.invoquer) l.push(`${f.invoquer.nombre} ${PM.UNITES[f.invoquer.unite].nom} ${f.invoquer.partout ? 'dans chacune de tes provinces' : 'dans ta capitale'}`);
    if (f.soin) l.push(`tes armées d’une province regagnent ${pct(f.soin)}`);
    if (f.bouclier) l.push(`une de tes provinces est protégée et sa défense double pendant ${f.bouclier} mois`);
    if (f.bonus) l.push(f.bonus.cle === 'attaque' ? `tes armées frappent ${pct(f.bonus.valeur)} plus fort pendant ${f.bonus.duree} mois` : `ta nourriture double pendant ${f.bonus.duree} mois`);
    if (f.temps) l.push('recharge tes autres actions et achève ton passage d’âge');
    if (f.vortex) l.push('toutes tes armées libres sont transportées dans la province ciblée');
    if (f.gainDev) l.push('une de tes provinces gagne un niveau');
    const s = l.join(', '); return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  };

  // ---------- application ----------
  const MOTS_ANTIQUE = { dieux: 'Dieux', dieu: 'dieu', majeur: 'dieu majeur', mineurs: 'Dieux mineurs', pouvoirs: 'Pouvoirs divins', faveur: 'faveur', icone: '✨', creature: 'Créature', pantheon: 'Panthéon', choisir: 'Choisis tes dieux', venere: 'vénère', invoque: 'invoque', lancer: 'Invoquer' };
  const MOTS_COMMUNS = { venere: 'adopte', invoque: 'lance', lancer: 'Lancer' };
  let origine = null;
  const copie = o => JSON.parse(JSON.stringify(o));
  PM.epoque = 'antique';
  PM.mot = k => { const m = PM.EPOQUES[PM.epoque].mots; return m ? (m[k] || MOTS_COMMUNS[k] || MOTS_ANTIQUE[k]) : MOTS_ANTIQUE[k]; };
  PM.appliquerEpoque = function (id) {
    if (!origine) origine = { UNITES: copie(PM.UNITES), POUVOIRS: copie(PM.POUVOIRS), BATIMENTS: copie(PM.BATIMENTS), AGES: copie(PM.AGES), PANTHEONS: copie(PM.PANTHEONS), NOMS_PEUPLES: copie(PM.NOMS_PEUPLES), MERVEILLE: copie(PM.MERVEILLE), CATEGORIES: copie(PM.CATEGORIES), icone: PM.ICONES.faveur };
    // retour aux données d'origine (les objets restent les mêmes : seuls les textes changent)
    const remettre = (cible, src) => { for (const k in src) { if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && cible[k]) remettre(cible[k], src[k]); else cible[k] = copie(src[k]); } };
    for (const k of ['UNITES', 'POUVOIRS', 'BATIMENTS', 'PANTHEONS', 'MERVEILLE', 'CATEGORIES']) remettre(PM[k], origine[k]);
    origine.AGES.forEach((a, i) => Object.assign(PM.AGES[i], a));
    for (const k in origine.NOMS_PEUPLES) PM.NOMS_PEUPLES[k] = origine.NOMS_PEUPLES[k].slice();
    PM.ICONES.faveur = origine.icone;
    PM.epoque = PM.EPOQUES[id] ? id : 'antique';
    const T = PM.EPOQUES[PM.epoque]; if (PM.epoque === 'antique') return;
    T.ages.forEach(([nom, court], i) => Object.assign(PM.AGES[i], { nom, court }));
    PM.ICONES.faveur = T.mots.icone; PM.CATEGORIES.mythe = T.mots.creature;
    for (const c of CULTURES) {
      const P = PM.PANTHEONS[c], [nom, emoji, peuples] = T.cultures[c];
      const temple = T.batiments.temple[0].charAt(0).toLowerCase() + T.batiments.temple[0].slice(1), fav = T.mots.faveur;
      const regle = { grecs: `Chaque ${temple} rapporte 50 % de ${fav} en plus.`, egyptiens: 'Les bâtiments coûtent 20 % de moins.', nordiques: `Chaque bataille gagnée rapporte de la ${fav}.`, atlantes: `Chaque province rapporte un peu de ${fav}.` }[c];
      Object.assign(P, { nom, emoji, faveur: regle });
      PM.NOMS_PEUPLES[c] = peuples.slice();
      P.majeurs.forEach((d, i) => { d.nom = T.majeurs[i]; d.desc = d.desc.replace('temples plus fervents', `plus de ${fav}`).replace('Héros', T.unites.heros[0]); });
      P.unites.forEach(u => { const [n, e] = T.unites[PM.UNITES[u].cat]; Object.assign(PM.UNITES[u], { nom: n, emoji: e }); });
      P.mineurs.forEach((age, a) => age.forEach((g, k) => { g.nom = T.mineurs[a][k]; const [n, e] = T.speciales[a][k]; Object.assign(PM.UNITES[g.unite], { nom: n, emoji: e }); }));
    }
    for (const u in T.invocations) if (PM.UNITES[u]) PM.UNITES[u].nom = T.invocations[u];
    for (const b in T.batiments) { const [nom, icone] = T.batiments[b]; if (b === 'merveille') Object.assign(PM.MERVEILLE, { nom, icone }); else Object.assign(PM.BATIMENTS[b], { nom, icone }); }
    PM.BATIMENTS.temple.desc = `Rapporte de la ${T.mots.faveur} chaque mois.`;
    PM.MERVEILLE.desc = `Une ${T.batiments.merveille[0].toLowerCase()} achevée et gardée 5 ans donne la victoire (si cette victoire est active).`;
    // pouvoirs : nom selon l'effet, numérotés quand plusieurs se ressemblent ; description recalculée
    const N = NOMS_POUVOIRS[PM.epoque], nommer = (pid, vus) => {
      const P = PM.POUVOIRS[pid], g = genre(P.effet), l = N[g] || N.degats, i = vus[g] = (vus[g] || 0) + 1, [nom, emoji] = l[(i - 1) % l.length];
      Object.assign(P, { nom: i > l.length ? nom + ' ' + ['', '', 'II', 'III', 'IV'][Math.min(4, Math.ceil(i / l.length))] : nom, emoji, desc: PM.descriptionEffet(P.effet) });
    };
    for (const c of CULTURES) { const P = PM.PANTHEONS[c], vus = {}; [...P.majeurs.map(d => d.pouvoir), ...P.mineurs.flat().map(g => g.pouvoir)].forEach(pid => nommer(pid, vus)); }
    if (PM.POUVOIRS.benediction) nommer('benediction', {});
  };
})(typeof window !== 'undefined' ? window : globalThis);
