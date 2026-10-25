/* Pax Mythica — données du mode Bataille (temps réel, façon Age of Mythology) : unités, bâtiments, âges, récolte, pouvoirs divins.
   Les noms des unités, des âges et des pouvoirs viennent de donnees.js et changent avec l'époque (epoques.js) ; les chiffres ici
   règlent l'équilibre du combat en temps réel. Ajouter un bâtiment ou un pouvoir = une entrée (tests/bataille.js contrôle les liens). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const R = PM.RTS = {};

  // récolte : quantité portée par un villageois et vitesse (par seconde)
  R.PORTE = 10;
  R.RECOLTE = { bois: 0.62, or: 0.55, baies: 0.72, viande: 0.95, ferme: 0.5, priere: 0.16 };
  R.POP_MAX = 150;
  R.MAISONS_MAX = 12;

  // rôles des unités humaines : pv, attaque, portée (m), cadence (s), vitesse (m/s), vue (m), coût, temps (s), population, rayon (m)
  // proj : projectile (fleche, pierre, balle, laser) ; zone : dégâts de zone ; vsBat : multiplicateur contre les bâtiments
  R.ROLES = {
    villageois: { pv: 50, att: 3, portee: 0, cadence: 1.5, vitesse: 3.6, vue: 16, cout: { nourriture: 50 }, temps: 12, pop: 1, rayon: 0.45, vsBat: 0.6, cat: 'milice' },
    inf: { pv: 120, att: 9, portee: 0, cadence: 1.4, vitesse: 3.7, vue: 16, cout: { nourriture: 50, or: 30 }, temps: 12, pop: 1, rayon: 0.5, vsBat: 1.3, cat: 'inf' },
    archer: { pv: 65, att: 7, portee: 18, cadence: 1.8, vitesse: 3.6, vue: 22, cout: { nourriture: 40, bois: 40 }, temps: 13, pop: 1, rayon: 0.45, vsBat: 0.25, cat: 'archer', proj: 'fleche' },
    cav: { pv: 150, att: 9, portee: 0, cadence: 1.4, vitesse: 5.8, vue: 20, cout: { nourriture: 60, or: 60 }, temps: 15, pop: 2, rayon: 0.9, vsBat: 0.8, cat: 'cav' },
    heros: { pv: 280, att: 16, portee: 0, cadence: 1.4, vitesse: 4.2, vue: 20, cout: { nourriture: 100, or: 120 }, temps: 20, pop: 3, rayon: 0.55, vsBat: 1.1, cat: 'heros', age: 1 },
    siege: { pv: 240, att: 45, portee: 24, cadence: 4.5, vitesse: 2.6, vue: 22, cout: { bois: 150, or: 100 }, temps: 25, pop: 3, rayon: 1.4, vsBat: 5, cat: 'siege', proj: 'pierre', zone: 2.5, age: 2 }
  };
  // armes à feu et rayons des époques récentes : même équilibre, autre projectile
  R.PROJ_EPOQUE = { industriel: { fleche: 'balle', pierre: 'boulet' }, moderne: { fleche: 'balle', pierre: 'obus' }, futur: { fleche: 'laser', pierre: 'plasma' } };
  // créatures (gardent les rapports d'attaque et de vie de donnees.js, ramenés au temps réel)
  // créatures qui frappent de loin
  const A_DISTANCE = { centaure: 16, phenix: 10, avatar: 0, caladria: 14, promethee: 0, sphinx: 0 };
  R.creature = (id, u) => ({ pv: Math.round(u.pv * 7.5), att: Math.round(u.att * 1.2), portee: A_DISTANCE[id] || 0, proj: A_DISTANCE[id] ? 'fleche' : null, cadence: 1.8, vitesse: 3.4 * (u.vitesse || 1), vue: 20,
    cout: { or: Math.round((u.cout.or || 0) * 1.6 + (u.cout.nourriture || 0) * 0.6), faveur: Math.round((u.cout.faveur || 10) * 1.3) }, temps: 18 + u.pop * 3, pop: u.pop, rayon: 0.7 + u.pop * 0.18, vsBat: u.vsFort ? 2.5 + u.vsFort : 2, cat: 'mythe' });

  // bâtiments : taille (côté de l'emprise, m), pv, coût, temps de construction (s), âge, ce qu'ils forment, dépôt de ressources, population
  // att/portee/cadence : bâtiments qui tirent ; passable : on marche dessus (champs)
  R.BATIMENTS = {
    centre: { taille: 14, pv: 3000, cout: { bois: 400, or: 400 }, temps: 100, age: 1, forme: ['villageois'], depot: ['nourriture', 'bois', 'or'], pop: 15, vue: 26, att: 7, portee: 20, cadence: 2, fleches: 3, emoji: '🏛️' },
    maison: { taille: 6, pv: 600, cout: { bois: 50 }, temps: 15, age: 0, pop: 10, vue: 10, emoji: '🏠' },
    grenier: { taille: 7, pv: 800, cout: { bois: 50 }, temps: 15, age: 0, depot: ['nourriture'], vue: 12, emoji: '🌾' },
    entrepot: { taille: 7, pv: 800, cout: { bois: 50 }, temps: 15, age: 0, depot: ['bois', 'or'], vue: 12, emoji: '🪓' },
    ferme: { taille: 9, pv: 300, cout: { bois: 60 }, temps: 12, age: 0, vue: 6, passable: true, emoji: '🌱' },
    caserne: { taille: 12, pv: 1500, cout: { bois: 150 }, temps: 35, age: 0, forme: ['inf'], vue: 14, emoji: '⚔️' },
    temple: { taille: 12, pv: 1500, cout: { bois: 100, or: 50 }, temps: 40, age: 0, forme: ['mythe'], vue: 16, emoji: '✨' },
    archerie: { taille: 12, pv: 1500, cout: { bois: 150, or: 30 }, temps: 35, age: 1, forme: ['archer'], vue: 14, emoji: '🏹' },
    ecurie: { taille: 12, pv: 1500, cout: { bois: 150, or: 60 }, temps: 35, age: 1, forme: ['cav'], vue: 14, emoji: '🐎' },
    tour: { taille: 4, pv: 1000, cout: { bois: 100, or: 60 }, temps: 30, age: 1, vue: 24, att: 8, portee: 22, cadence: 1.8, fleches: 1, emoji: '🗼' },
    forteresse: { taille: 16, pv: 4000, cout: { bois: 300, or: 300 }, temps: 70, age: 2, forme: ['heros', 'siege'], vue: 24, att: 9, portee: 22, cadence: 2, fleches: 3, emoji: '🏰' },
    merveille: { taille: 22, pv: 8000, cout: { nourriture: 1000, bois: 1000, or: 1000, faveur: 100 }, temps: 240, age: 3, vue: 20, emoji: '🗼' }
  };
  // ordre de la grille de construction : économie puis armée
  R.CONSTRUIRE = [['maison', 'grenier', 'entrepot', 'ferme', 'temple'], ['caserne', 'archerie', 'ecurie', 'tour', 'forteresse', 'centre', 'merveille']];
  // durée de garde d'une merveille achevée avant la victoire (s)
  R.GARDE_MERVEILLE = 180;

  // noms des bâtiments selon l'époque
  R.NOMS_BAT = {
    antique: { centre: 'Centre-ville', maison: 'Maison', grenier: 'Grenier', entrepot: 'Entrepôt', ferme: 'Ferme', caserne: 'Caserne', temple: 'Temple', archerie: 'Champ de tir', ecurie: 'Écurie', tour: 'Tour de guet', forteresse: 'Forteresse', merveille: 'Merveille' },
    medieval: { centre: 'Donjon', maison: 'Chaumière', grenier: 'Moulin', entrepot: 'Camp de bûcherons', ferme: 'Champ', caserne: 'Caserne', temple: 'Cathédrale', archerie: 'Lices des archers', ecurie: 'Écurie', tour: 'Tour', forteresse: 'Château fort', merveille: 'Cathédrale de légende' },
    industriel: { centre: 'Hôtel de ville', maison: 'Maison ouvrière', grenier: 'Silo', entrepot: 'Dépôt', ferme: 'Ferme', caserne: 'Caserne', temple: 'Académie des sciences', archerie: 'Stand de tir', ecurie: 'Haras', tour: 'Redoute', forteresse: 'Arsenal', merveille: 'Exposition universelle' },
    moderne: { centre: 'Quartier général', maison: 'Immeuble', grenier: 'Coopérative', entrepot: 'Dépôt logistique', ferme: 'Exploitation', caserne: 'Caserne', temple: 'Centre de recherche', archerie: 'Base de missiles', ecurie: 'Garage blindé', tour: 'Bunker', forteresse: 'Usine d’armement', merveille: 'Gratte-ciel' },
    futur: { centre: 'Nexus', maison: 'Habitat', grenier: 'Hydroponie', entrepot: 'Extracteur', ferme: 'Serre', caserne: 'Clonerie', temple: 'Sanctuaire quantique', archerie: 'Batterie laser', ecurie: 'Hangar', tour: 'Tourelle', forteresse: 'Forge orbitale', merveille: 'Ascenseur spatial' }
  };
  R.NOMS_VILLAGEOIS = { antique: 'Villageois', medieval: 'Paysans', industriel: 'Ouvriers', moderne: 'Ouvriers', futur: 'Techniciens' };

  // âges : coût et durée du passage (s) ; le dieu mineur se choisit au début du passage
  R.AGES = [null, { cout: { nourriture: 400 }, temps: 45 }, { cout: { nourriture: 800, or: 500 }, temps: 55 }, { cout: { nourriture: 1000, or: 1000 }, temps: 65 }];

  // multiplicateurs des bonus des dieux majeurs en temps réel
  R.BONUS = {
    attaqueHeros: (b, v) => { b.attHeros = (b.attHeros || 1) + v; }, faveurTemple: (b, v) => { b.faveur = (b.faveur || 1) + v * 1.5; },
    coutCav: (b, v) => { b.coutCav = 1 + v; }, vitesse: (b, v) => { b.vitesse = 1 + v * 0.6; }, defense: (b, v) => { b.pvBat = 1 + v; },
    nourriture: (b, v) => { b.recolte_nourriture = 1 + v; }, coutPouvoir: (b, v) => { b.faveur = (b.faveur || 1) + 0.25; }, coutMythe: (b, v) => { b.coutMythe = 1 + v; },
    soinDomicile: (b, v) => { b.soin = 1.2; }, or: (b, v) => { b.recolte_or = 1 + v; }, faveurBataille: (b, v) => { b.faveurCombat = 0.6; },
    coutBatiment: (b, v) => { b.coutBat = 1 + v; }, production: (b, v) => { for (const r of ['nourriture', 'bois', 'or']) b['recolte_' + r] = (b['recolte_' + r] || 1) + v; }
  };
  // bonus de culture (comme dans Age of Mythology) : chaque peuple gagne sa faveur à sa façon
  R.CULTURE = {
    grecs: { faveur: 'priere', desc: 'Les villageois prient au temple pour la faveur.' },
    egyptiens: { faveur: 'temples', coutBat: 0.85, desc: 'Bâtiments 15 % moins chers ; chaque temple rapporte de la faveur.' },
    nordiques: { faveur: 'combat', desc: 'La faveur vient des coups portés au combat.' },
    atlantes: { faveur: 'centres', recolte: 1.08, desc: 'Récolte plus rapide ; la faveur coule de chaque centre-ville.' }
  };

  // pouvoirs divins en temps réel (un seul usage chacun, comme dans Age of Mythology)
  // types : eclair, zone, invoquer, soin, ressources, bonus, bouclier, paralysie, ralenti, conversion, vision, age, vortex
  R.POUVOIRS = {
    foudre: { type: 'eclair', degats: 900, cible: true },
    seisme: { type: 'zone', rayon: 14, duree: 6, impacts: 12, degU: 40, degB: 260, cible: true },
    ombres: { type: 'invoquer', unite: 'ombre', nombre: 5, cible: true },
    restauration: { type: 'soin', rayon: 16, cible: true },
    peste: { type: 'zone', rayon: 16, duree: 8, impacts: 16, degU: 45, degB: 0, cible: true },
    oracle: { type: 'vision', duree: 45 },
    seduction: { type: 'conversion', rayon: 8, nombre: 4, cible: true },
    abondance: { type: 'ressources', r: { or: 500, bois: 300 } },
    tempete: { type: 'zone', rayon: 16, duree: 10, impacts: 14, degU: 160, degB: 120, eclairs: true, cible: true },
    pluie: { type: 'bonus', cle: 'recolte_nourriture', valeur: 1, duree: 60 },
    bouclier: { type: 'bouclier', rayon: 22, duree: 30, cible: true },
    fleau_seth: { type: 'zone', rayon: 12, duree: 6, impacts: 10, degU: 90, degB: 120, cible: true },
    serpents: { type: 'zone', rayon: 10, duree: 6, impacts: 12, degU: 90, degB: 0, cible: true },
    rite_bastet: { type: 'ressources', r: { nourriture: 400 } },
    lance_sekhmet: { type: 'zone', rayon: 9, duree: 4, impacts: 8, degU: 110, degB: 300, cible: true },
    resurrection: { type: 'invoquer', unite: 'momie', nombre: 3, cible: true },
    meteores: { type: 'zone', rayon: 14, duree: 6, impacts: 10, degU: 220, degB: 420, meteores: true, cible: true },
    tornade: { type: 'zone', rayon: 12, duree: 8, impacts: 14, degU: 120, degB: 200, paralysie: 2, cible: true },
    chasse: { type: 'ressources', r: { nourriture: 450 } },
    mine_naine: { type: 'ressources', r: { or: 400 } },
    ruse: { type: 'paralysie', rayon: 12, duree: 12, cible: true },
    valkyries: { type: 'soin', rayon: 16, cible: true },
    vigilance: { type: 'bouclier', rayon: 22, duree: 30, cible: true },
    hiver: { type: 'ralenti', rayon: 24, duree: 30, cible: true },
    vagues: { type: 'ressources', r: { bois: 350, nourriture: 300 } },
    ragnarok: { type: 'invoquer', unite: 'heros_ragnarok', nombre: 6, cible: true },
    fimbulvetr: { type: 'zone', rayon: 20, duree: 10, impacts: 18, degU: 150, degB: 150, cible: true },
    distorsion: { type: 'age' },
    tir_celeste: { type: 'eclair', degats: 900, cible: true },
    floraison: { type: 'ressources', r: { nourriture: 300, bois: 150 } },
    feu_vole: { type: 'zone', rayon: 10, duree: 5, impacts: 10, degU: 100, degB: 260, cible: true },
    essaim: { type: 'invoquer', unite: 'automate', nombre: 4, cible: true },
    deluge: { type: 'zone', rayon: 14, duree: 6, impacts: 10, degU: 60, degB: 380, cible: true },
    discorde: { type: 'paralysie', rayon: 12, duree: 10, cible: true },
    vortex: { type: 'vortex', cible: true },
    porte_titans: { type: 'invoquer', unite: 'titan', nombre: 1, cible: true },
    benediction: { type: 'bonus', cle: 'attaque', valeur: 0.3, duree: 40 }
  };

  // description d'un pouvoir en temps réel (montrée sur les boutons et au choix des dieux)
  R.descPouvoir = id => {
    const d = R.POUVOIRS[id]; if (!d) return '';
    const res = r => Object.entries(r).map(([k, v]) => `+${v} ${PM.ICONES[k] || k}`).join(' ');
    const u = d.unite && PM.UNITES[d.unite];
    return { eclair: 'Frappe l’ennemi le plus proche du point visé : une unité foudroyée, un bâtiment très abîmé.',
      zone: `Pendant ${d.duree} s, ${d.impacts} frappes dans un cercle de ${d.rayon} m${d.degB ? ' (unités et bâtiments)' : ' (unités)'}.`,
      invoquer: `${d.nombre} ${u ? u.nom.toLowerCase() : 'unités'} apparaissent au point visé.`, soin: `Soigne tes unités et tes bâtiments dans un cercle de ${d.rayon} m.`,
      ressources: `Ressources immédiates : ${d.r ? res(d.r) : ''}.`, bonus: d.cle === 'attaque' ? `Tes unités frappent ${Math.round(d.valeur * 100)} % plus fort pendant ${d.duree} s.` : `La récolte de nourriture double pendant ${d.duree} s.`,
      bouclier: `Tes bâtiments dans un cercle de ${d.rayon} m deviennent invulnérables ${d.duree} s.`, paralysie: `Les ennemis dans un cercle de ${d.rayon} m sont figés ${d.duree} s.`,
      ralenti: `Les ennemis dans un cercle de ${d.rayon} m sont ralentis ${d.duree} s.`, conversion: `Jusqu’à ${d.nombre} ennemis proches du point visé passent dans ton camp.`,
      vision: `Toute la carte est révélée pendant ${d.duree} s.`, age: 'Achève tout de suite le passage d’âge en cours (sinon +300 de chaque ressource).',
      vortex: 'Toute ton armée est transportée au point visé.' }[d.type] || '';
  };

  // cartes : nom, pack graphique conseillé, réglages de la génération
  R.CARTES = {
    plaine: { nom: 'Plaines de Grèce', emoji: '🌿', pack: 'olympe', foret: 0.5, desert: 0, collines: 0.4, eau: 'aucune' },
    riviere: { nom: 'Rivière et gués', emoji: '🏞️', pack: 'realiste', foret: 0.55, desert: 0, collines: 0.3, eau: 'riviere' },
    oasis: { nom: 'Oasis du désert', emoji: '🏜️', pack: 'olympe', foret: 0.25, desert: 1, collines: 0.3, eau: 'oasis' },
    lac: { nom: 'Lac sacré', emoji: '💧', pack: 'realiste', foret: 0.5, desert: 0, collines: 0.35, eau: 'lac' },
    toundra: { nom: 'Toundra nordique', emoji: '❄️', pack: 'hiver', foret: 0.65, desert: 0, collines: 0.6, eau: 'aucune' },
    automne: { nom: 'Forêt d’automne', emoji: '🍂', pack: 'automne', foret: 0.8, desert: 0, collines: 0.5, eau: 'aucune' }
  };
  R.TAILLES = { petite: { cote: 200, nom: 'Petite' }, moyenne: { cote: 256, nom: 'Moyenne' }, grande: { cote: 320, nom: 'Grande' } };
  R.DIFFICULTES = [{ nom: 'Facile', recolte: 0.75, attaque: 28, pense: 1.6 }, { nom: 'Normal', recolte: 1, attaque: 18, pense: 1 }, { nom: 'Difficile', recolte: 1.2, attaque: 12, pense: 0.7 }];

  // nom affiché d'une unité selon le peuple et l'époque
  R.nomUnite = (pantheon, cle) => {
    if (cle === 'villageois') return R.NOMS_VILLAGEOIS[PM.epoque] || 'Villageois';
    if (cle === 'mouton' || cle === 'vache') return cle === 'mouton' ? 'Mouton' : 'Vache';
    const P = PM.PANTHEONS[pantheon], i = ['inf', 'archer', 'cav', 'heros', 'siege'].indexOf(cle);
    if (i >= 0 && P) { const u = PM.UNITES[P.unites[i]]; return u ? u.nom : cle; }
    return PM.UNITES[cle] ? PM.UNITES[cle].nom : cle;
  };
  R.emojiUnite = (pantheon, cle) => {
    if (cle === 'villageois') return '🧑‍🌾';
    const P = PM.PANTHEONS[pantheon], i = ['inf', 'archer', 'cav', 'heros', 'siege'].indexOf(cle);
    if (i >= 0 && P) { const u = PM.UNITES[P.unites[i]]; return u ? u.emoji : '⚔️'; }
    return PM.UNITES[cle] ? PM.UNITES[cle].emoji : '❔';
  };
  R.nomBat = cle => (R.NOMS_BAT[PM.epoque] || R.NOMS_BAT.antique)[cle] || cle;
})(typeof window !== 'undefined' ? window : globalThis);
