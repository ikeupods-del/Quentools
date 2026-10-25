/* Pax Mythica — vue 3D du mode Bataille (temps réel) : reprend le moteur de la vue 3D (relief photographique, ciel, eau, ombres,
   packs graphiques) et y pose la bataille de rts-moteur.js : arbres qu'on abat un à un, buissons de baies, mines d'or, troupeaux,
   bâtiments de chaque peuple et de chaque époque (qui sortent de terre pendant la construction et s'effondrent), unités animées
   aux couleurs des joueurs, cercles de sélection, flèches, pierres, balles et rayons, éclairs, météores et lueurs des pouvoirs,
   poussière et étincelles, brouillard de guerre. Une image = dessiner(dt) ; rts-interface.js donne les ordres. */
'use strict';
(function (G) {
  const PM = G.PM, THREE = G.THREE;
  if (!PM || !PM.Vue3D || !THREE) return;
  const O = PM.vue3dOutils, BT = PM.Bataille, R = PM.RTS;
  const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // créatures de l'Antiquité : modèle créé pour le jeu le plus proche
  const MYTHE_MODELE = { minotaure: 'c_minotaure', cyclope: 'c_cyclope', centaure: 'k_grec', lion_nemee: 'c_minotaure', colosse: 'c_titan', chimere: 'c_geant', ombre: 'c_squelette',
    anubite: 'c_anubite', sphinx: 'c_anubite', scorpion: 'c_anubite', momie: 'c_squelette', phenix: 'c_valkyrie', avatar: 'c_titan', valkyrie: 'c_valkyrie', einherjar: 'c_viking',
    geant_givre: 'c_geant', geant_mont: 'c_geant', geant_feu: 'c_titan', fenrir: 'c_geant', promethee: 'c_golem', automate: 'c_golem', caladria: 'c_valkyrie', satyre: 'c_minotaure',
    heka: 'c_titan', titan: 'c_titan', heros_ragnarok: 'c_viking' };
  const INVOQUES = { ombre: 'c_squelette', momie: 'c_squelette', automate: 'c_golem', titan: 'c_titan' };
  // hauteur voulue des créatures selon leur population (m)
  const HAUTEUR_CREATURE = p => p >= 10 ? 11 : 2.2 + p * 0.65;
  const ECHELLE_HUMAINS = 1.25;

  // ---------- modèles des bâtiments propres au mode Bataille (assemblés comme ceux de la vue 3D) ----------
  const STYLES = {
    grecs: { mur: 0xece4d2, toit: 0xb9573c, bois: 0x9a6a40, socle: 0xa8a294, accent: 0xf6f1e4 },
    egyptiens: { mur: 0xdcc08a, toit: 0xc9a86a, bois: 0x9a6a40, socle: 0xc9a86a, accent: 0xf2d27a, plat: true },
    nordiques: { mur: 0x9a6a40, toit: 0x6a4a30, bois: 0x8a5c34, socle: 0xa8a294, accent: 0xc9a24a },
    atlantes: { mur: 0xeef6f5, toit: 0x2fa59a, bois: 0x9a6a40, socle: 0xd8d0bf, accent: 0xf2d27a, dome: true },
    medieval: { mur: 0xd9d1c0, toit: 0x55585e, bois: 0x6b4a32, socle: 0xa19a8c, accent: 0xb0a99c },
    industriel: { mur: 0x9a4a36, toit: 0x4a4a50, bois: 0x5a3a2a, socle: 0x6a6a70, accent: 0xf4efe0 },
    moderne: { mur: 0xbdb8ae, toit: 0x8a8e94, bois: 0x6a6e74, socle: 0x9a9690, accent: 0x7fb8d8, plat: true },
    futur: { mur: 0xf2f6fa, toit: 0xdfe8f2, bois: 0x9aa4ad, socle: 0xc0ccd8, accent: 0x6ff3ff, plat: true }
  };
  const Bx = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const Cy = (rt, rb, h, s, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, s).translate(x, y + h / 2, z);
  const Co = (r, h, s, x = 0, y = 0, z = 0, rot = 0) => new THREE.ConeGeometry(r, h, s).rotateY(rot).translate(x, y + h / 2, z);
  const Sp = (r, x = 0, y = 0, z = 0) => new THREE.IcosahedronGeometry(r, 1).translate(x, y, z);
  const pignon = (w, d, h, x, y, z, axeZ) => { const L = w * 1.06, e = d * 0.56, g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-e, 0), new THREE.Vector2(e, 0), new THREE.Vector2(0, h)]), { depth: L, bevelEnabled: false }).translate(0, 0, -L / 2).rotateY(Math.PI / 2); if (axeZ) g.rotateY(Math.PI / 2); return g.translate(x, y, z); };
  // toit selon le style : terrasse, coupole ou deux pans
  const toit = (st, w, d, h, x, y, z) => st.plat ? [[Bx(w + 0.4, 0.35, d + 0.4, x, y, z), st.toit], [Bx(w + 0.5, 0.25, 0.25, x, y + 0.35, z + d / 2 + 0.1), st.accent]]
    : st.dome ? [[Bx(w, 0.3, d, x, y, z), st.mur], [new THREE.SphereGeometry(Math.min(w, d) * 0.45, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, y + 0.3, z), st.toit]]
      : [[pignon(w + 0.3, d + 0.4, h, x, y, z), st.toit]];
  const porte = (x, y, z, w = 1.4, h = 2.2) => [Bx(w, h, 0.15, x, y, z), 0x4a3020];
  const fenetres = (xs, y, z) => xs.map(x => [Bx(0.6, 0.8, 0.12, x, y, z), 0x2a3038]);
  // parties aux couleurs du joueur (bannières, boucliers, voiles) : dessinées à part, teintées par joueur
  const EQ = 0x00ff02;
  const banniere = (x, y, z, h = 2.6, l = 0.9) => [[Cy(0.06, 0.07, h + 0.5, 5, x, y, z), 0x4a3a28], [Bx(l + 0.2, 0.08, 0.08, x + l / 2, y + h + 0.2, z), 0x4a3a28], [Bx(l, h * 0.6, 0.05, x + l / 2, y + h * 0.42, z), EQ], [Co(0.09, 0.25, 5, x, y + h + 0.5, z), 0xd8b060]];
  const etendardMur = (x, y, z, h = 1.6, l = 0.8) => [[Bx(l, h, 0.05, x, y - h, z), EQ], [Bx(l + 0.1, 0.1, 0.12, x, y, z), 0x4a3a28]];
  const brasero = (x, y, z) => [[Cy(0.16, 0.1, 0.9, 8, x, y, z), 0x3e3630], [Cy(0.3, 0.18, 0.24, 10, x, y + 0.9, z), 0x2e2620]];
  const crenaux = (w, d, y, c, h = 0.6, p = 1) => { const l = []; for (let x = -w / 2 + p / 2; x <= w / 2 - p / 2 + 0.01; x += p * 2) l.push([Bx(p * 0.8, h, 0.45, x, y, d / 2 - 0.22), c], [Bx(p * 0.8, h, 0.45, x, y, -d / 2 + 0.22), c]); for (let z = -d / 2 + p * 1.5; z <= d / 2 - p * 1.5 + 0.01; z += p * 2) l.push([Bx(0.45, h, p * 0.8, w / 2 - 0.22, y, z), c], [Bx(0.45, h, p * 0.8, -w / 2 + 0.22, y, z), c]); return l; };
  const marches = (w, n, x, y, z, c) => { const l = []; for (let k = 0; k < n; k++) l.push([Bx(w, 0.18, 0.45, x, y + k * 0.18, z - k * 0.45), c]); return l; };
  const avecFeux = (parts, feux) => { parts.feux = feux; return parts; };
  const bois = st => st.bois, pierreDe = st => st.plat && st.mur === 0xbdb8ae ? 0x9a9690 : 0xa8a294;
  const CONSTR = {
    // grenier : silo rond et toit conique, annexe, échelle, sacs et jarres
    grenier: st => avecFeux([[Bx(6.6, 0.45, 6.6), st.socle], [Cy(2.4, 2.6, 3.6, 18, -0.7, 0.45, -0.5), st.mur], [Cy(2.48, 2.48, 0.22, 18, -0.7, 2.2, -0.5), bois(st)], [Cy(2.5, 2.5, 0.22, 18, -0.7, 3.95, -0.5), bois(st)],
      ...(st.plat ? [[Cy(2.6, 2.6, 0.4, 18, -0.7, 4.05, -0.5), st.toit], [Sp(1.0, -0.7, 4.6, -0.5), st.accent]] : [[Co(3.1, 2.6, 18, -0.7, 4.05, -0.5), st.toit], [Co(0.5, 0.6, 8, -0.7, 6.5, -0.5), st.accent]]),
      [Bx(2.4, 2.2, 2.6, 2.0, 0.45, 1.5), st.mur], ...toit(st, 2.4, 2.6, 1.0, 2.0, 2.65, 1.5), porte(-0.7, 0.45, 1.95, 1.0, 1.9), porte(2.0, 0.45, 2.83, 0.9, 1.6),
      ...[0, 1, 2, 3, 4].map(k => [Bx(0.6, 0.05, 0.05, 1.4, 0.8 + k * 0.6, 1.0), bois(st)]), [Bx(0.05, 3.2, 0.05, 1.12, 0.45, 1.0), bois(st)], [Bx(0.05, 3.2, 0.05, 1.68, 0.45, 1.0), bois(st)],
      ...[[1.2, 3.0], [1.9, 3.2], [2.7, 3.0], [3.0, 2.4]].map(([x, z]) => [Sp(0.42, x, 0.8, z), 0xd8c8a0]), ...[[-3.0, 2.4], [-2.4, 2.8]].map(([x, z]) => [Cy(0.25, 0.32, 0.8, 9, x, 0.45, z), 0xb0603a]),
      ...banniere(-3.2, 0.45, -2.9, 2.6, 0.8)], []),
    // entrepôt : hangar de poutres, piles de rondins, caisses d'or, charrette
    entrepot: st => avecFeux([[Bx(6.8, 0.35, 6.4), st.socle], ...[[-2.8, -2.4], [2.8, -2.4], [-2.8, 2.4], [2.8, 2.4], [0, -2.4], [0, 2.4]].map(([x, z]) => [Cy(0.17, 0.19, 3.1, 6, x, 0.35, z), bois(st)]),
      [Bx(6.0, 0.2, 0.25, 0, 3.3, 2.4), bois(st)], [Bx(6.0, 0.2, 0.25, 0, 3.3, -2.4), bois(st)], ...toit(st, 6.2, 5.4, 1.6, 0, 3.45, 0), [Bx(6.0, 1.8, 0.12, 0, 0.35, -2.5), bois(st)],
      ...[0, 1, 2, 3, 4, 5].map(k => [new THREE.CylinderGeometry(0.32, 0.32, 3.2, 8).rotateZ(Math.PI / 2).translate(-1.0, 0.67 + Math.floor(k / 3) * 0.56, -1.4 + (k % 3) * 0.66 + Math.floor(k / 3) * 0.33), 0x8a5c34]),
      ...[[1.6, -0.6], [2.3, 0.3], [1.6, 0.9], [2.3, 1.4]].map(([x, z]) => [Bx(0.7, 0.6, 0.7, x, 0.35, z), 0xe5c24a]), [Bx(0.7, 0.6, 0.7, 2.0, 0.95, 0.4), 0xe5c24a],
      [Bx(1.6, 0.45, 1.0, 3.6, 0.7, 2.9), bois(st)], ...[-0.6, 0.6].map(z => [new THREE.CylinderGeometry(0.45, 0.45, 0.12, 12).rotateX(Math.PI / 2).translate(3.6, 0.45, 2.9 + z), 0x5a3a22]),
      [new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4).rotateZ(0.6).translate(-2.4, 0.9, 2.9), 0x5a3a22], [Bx(0.3, 0.2, 0.05, -2.15, 1.3, 2.9), 0x9aa4ad],
      ...banniere(3.1, 0.35, -2.9, 2.4, 0.7)], []),
    // caserne : grande salle, portique à colonnes, marches, cour d'entraînement (mannequins, râtelier, boucliers aux couleurs du joueur), braseros
    caserne: st => avecFeux([[Bx(11.2, 0.5, 9.0, 0, 0, -1.2), st.socle], [Bx(10, 4.4, 6.0, 0, 0.5, -2.4), st.mur], ...toit(st, 10, 6.0, 2.6, 0, 4.9, -2.4),
      [Bx(10.4, 0.35, 6.4, 0, 4.6, -2.4), st.accent], ...[-4, -2, 2, 4].map(x => [Cy(0.28, 0.32, 3.6, 10, x, 0.5, 1.0), st.accent]), [Bx(9.6, 0.5, 1.4, 0, 4.1, 0.9), st.accent], [Bx(9.6, 0.12, 2.2, 0, 4.6, 0.6), st.toit],
      porte(0, 0.5, 0.62, 2.0, 2.8), ...fenetres([-3.4, -1.8, 1.8, 3.4], 2.6, 0.62), ...marches(3.2, 2, 0, 0.0, 1.9, st.socle),
      ...[-4.2, -2.6].flatMap(x => [[Cy(0.1, 0.12, 1.6, 6, x, 0.5, 3.4), bois(st)], [Bx(0.9, 0.1, 0.1, x, 1.75, 3.4), bois(st)], [Sp(0.22, x, 2.25, 3.4), 0xd8c8a0], [Cy(0.38, 0.38, 0.08, 14).rotateX(Math.PI / 2).translate(x, 1.4, 3.6), EQ]]),
      [Bx(2.4, 1.6, 0.2, 3.6, 0.5, 3.2), bois(st)], ...[0, 1, 2, 3, 4].map(k => [Cy(0.03, 0.03, 2.6, 4, 2.7 + k * 0.45, 0.5, 3.35), 0x9aa4ad]), ...[0, 1, 2].map(k => [Cy(0.4, 0.4, 0.08, 14).rotateX(Math.PI / 2).translate(2.8 + k * 0.9, 1.4, 3.05), EQ]),
      ...brasero(-1.6, 0.5, 2.3), ...brasero(1.6, 0.5, 2.3), ...etendardMur(-4.6, 4.1, 1.62, 2.2, 0.9), ...etendardMur(4.6, 4.1, 1.62, 2.2, 0.9)], [[-1.6, 1.75, 2.3], [1.6, 1.75, 2.3]]),
    // champ de tir : pavillon, galerie couverte, cibles, bottes de paille, carquois
    archerie: st => avecFeux([[Bx(11.2, 0.4, 10.2), st.socle], [Bx(6.6, 3.8, 4.4, -2.0, 0.4, -2.8), st.mur], ...toit(st, 6.6, 4.4, 2.0, -2.0, 4.2, -2.8), porte(-2.0, 0.4, -0.55, 1.4, 2.2), ...fenetres([-4.2, 0.2], 2.2, -0.55),
      ...[1.6, 3.4, 5.2].map(x => [Cy(0.12, 0.14, 3.0, 6, x, 0.4, -0.8), bois(st)]), [Bx(4.4, 0.18, 2.8, 3.4, 3.4, -2.2), st.toit], [Bx(4.2, 0.9, 0.12, 3.4, 0.4, -3.6), bois(st)],
      ...[-3.4, 0, 3.4].flatMap(x => [[Cy(0.95, 0.95, 0.16, 20).rotateX(Math.PI / 2).translate(x, 1.5, 4.0), 0xf4efe0], [Cy(0.64, 0.64, 0.18, 20).rotateX(Math.PI / 2).translate(x, 1.5, 4.0), 0xb02a20], [Cy(0.3, 0.3, 0.2, 14).rotateX(Math.PI / 2).translate(x, 1.5, 4.0), 0xf2d27a], [Cy(0.08, 0.1, 1.5, 5, x, 0.4, 4.15), bois(st)], [Cy(0.06, 0.08, 1.4, 5, x + 0.5, 0.4, 4.4).rotateX(0.3), bois(st)]]),
      ...[[-4.8, 1.6], [4.8, 1.6]].map(([x, z]) => [new THREE.CylinderGeometry(0.6, 0.6, 1.2, 10).rotateZ(Math.PI / 2).translate(x, 1.0, z), 0xd8c070]), ...[0, 1, 2].map(k => [Cy(0.14, 0.12, 0.7, 6, 2.4 + k * 0.4, 0.4, -1.4), 0x6a4a30]),
      ...banniere(-5.0, 0.4, -0.6, 2.6, 0.8), ...banniere(5.0, 0.4, 4.4, 2.0, 0.6)], []),
    // écurie : longue étable, grenier à foin, stalles, abreuvoir, enclos
    ecurie: st => avecFeux([[Bx(11.6, 0.35, 10.2), st.socle], [Bx(11, 3.2, 4.4, 0, 0.35, -2.8), bois(st) === st.mur ? 0x8a5c34 : st.mur], ...toit(st, 11, 4.6, 2.0, 0, 3.55, -2.8), [Bx(3.0, 1.4, 0.1, 0, 2.3, -0.55), 0x3a2a1c],
      ...[-4.4, -2.2, 0, 2.2, 4.4].map(x => [Bx(1.6, 2.0, 0.12, x, 0.35, -0.55), 0x3a2a1c]), ...[-5.3, -3.3, -1.1, 1.1, 3.3, 5.3].map(x => [Bx(0.18, 2.6, 0.2, x, 0.35, -0.5), bois(st)]),
      ...[-5.2, -2.6, 0, 2.6, 5.2].map(x => [Cy(0.1, 0.12, 1.3, 5, x, 0.35, 4.6), bois(st)]), [Bx(10.6, 0.12, 0.12, 0, 1.0, 4.6), bois(st)], [Bx(10.6, 0.12, 0.12, 0, 1.5, 4.6), bois(st)],
      ...[-5.2, 5.2].flatMap(x => [[Bx(0.12, 0.12, 4.4, x, 1.0, 2.4), bois(st)], [Bx(0.12, 0.12, 4.4, x, 1.5, 2.4), bois(st)]]),
      ...[[-3.5, 2.0], [-2.2, 2.4], [3.4, 1.8], [-2.9, 2.2]].map(([x, z], k) => [new THREE.CylinderGeometry(0.62, 0.62, 1.2, 10).rotateZ(Math.PI / 2).translate(x, 0.97 + (k === 3 ? 1.2 : 0), z), 0xd8c070]), [Bx(1.8, 0.6, 0.7, 1.0, 0.35, 1.6), 0x6a4a30], [Bx(1.6, 0.1, 0.5, 1.0, 0.9, 1.6), 0x4a7aa0],
      ...banniere(-5.6, 0.35, -0.2, 2.6, 0.8)], []),
    // forteresse : enceinte crénelée, quatre tours, donjon, porte, bannières et braseros
    forteresse: st => avecFeux([[Bx(15.6, 0.5, 15.6), st.socle], ...[[0, -7, 15, 1.4], [0, 7, 15, 1.4], [-7, 0, 1.4, 15], [7, 0, 1.4, 15]].map(([x, z, w, d]) => [Bx(w, 5, d, x, 0.5, z), st.mur]),
      ...crenaux(15.2, 15.2, 5.5, st.mur, 0.7, 1.1),
      ...[[-7, -7], [7, -7], [-7, 7], [7, 7]].flatMap(([x, z]) => [[Cy(1.9, 2.1, 8, 14, x, 0.5, z), st.mur], [Cy(2.25, 2.25, 0.5, 14, x, 8.5, z), st.accent], st.plat ? [Cy(1.6, 1.6, 0.8, 14, x, 9.0, z), st.accent] : [Co(2.6, 3.4, 14, x, 9.0, z), st.toit], ...[0, 1, 2, 3].map(k => [Bx(0.35, 0.9, 0.12, x + Math.cos(k * 1.57) * 2.0, 4.5, z + Math.sin(k * 1.57) * 2.0), 0x2a2420])]),
      [Bx(6.4, 12, 6.4, 0, 0.5, -1), st.mur], ...crenaux(6.8, 6.8, 12.5, st.mur, 0.7, 0.85).map(([g, c]) => [g.translate(0, 0, -1), c]), ...(st.plat ? [[Bx(6.6, 0.6, 6.6, 0, 12.5, -1), st.accent]] : [[Co(4.4, 4.2, 4, 0, 12.9, -1, Math.PI / 4), st.toit]]),
      ...fenetres([-1.6, 0, 1.6], 7.5, 2.25), ...fenetres([-1.6, 1.6], 4.5, 2.25), porte(0, 0.5, 7.75, 3, 3.6), [Bx(4.2, 1.2, 1.8, 0, 4.1, 7.3), st.mur],
      ...etendardMur(-1.4, 11.5, 2.27, 3.2, 1.1), ...etendardMur(1.4, 11.5, 2.27, 3.2, 1.1), ...etendardMur(-3.2, 5.3, 7.75, 2.4, 1.0), ...etendardMur(3.2, 5.3, 7.75, 2.4, 1.0),
      ...brasero(-2.6, 0.5, 9.0), ...brasero(2.6, 0.5, 9.0), ...banniere(0, 15.5, -1, 2.4, 1.2).map(([g, c]) => [g, c])], [[-2.6, 1.75, 9.0], [2.6, 1.75, 9.0]]),
    // tour de guet : pierre crénelée (ou bois chez les Nordiques), meurtrières, toit, bannière
    tour: st => st === STYLES.nordiques
      ? avecFeux([...[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z]) => [Cy(0.24, 0.28, 7, 7, x, 0, z), bois(st)]), ...[2.2, 4.6].flatMap(y => [[Bx(3.6, 0.16, 0.16, 0, y, 1.6), bois(st)], [Bx(3.6, 0.16, 0.16, 0, y, -1.6), bois(st)], [Bx(0.16, 0.16, 3.6, 1.6, y, 0), bois(st)], [Bx(0.16, 0.16, 3.6, -1.6, y, 0), bois(st)]]),
          [Bx(4.4, 0.3, 4.4, 0, 6.6), bois(st)], ...[[0, 2.1, 4.4, 0.12], [0, -2.1, 4.4, 0.12], [2.1, 0, 0.12, 4.4], [-2.1, 0, 0.12, 4.4]].map(([x, z, w, d]) => [Bx(w, 1.0, d, x, 6.9, z), bois(st)]), ...[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => [Cy(0.12, 0.12, 2.4, 5, x, 6.9, z), bois(st)]), [Co(3.4, 2.4, 4, 0, 9.2, 0, Math.PI / 4), st.toit], ...etendardMur(0, 7.8, 2.2, 1.6, 0.8), ...brasero(1.4, 6.9, 1.4)], [[1.4, 8.15, 1.4]])
      : avecFeux([[Bx(4.4, 0.4, 4.4), st.socle], st.plat ? [new THREE.CylinderGeometry(1.6, 2.1, 8, 4).rotateY(Math.PI / 4).translate(0, 4.4, 0), st.mur] : st === STYLES.medieval || st === STYLES.atlantes ? [Cy(1.7, 1.9, 8, 14, 0, 0.4, 0), st.mur] : [Bx(3.4, 8, 3.4, 0, 0.4, 0), st.mur],
          [Bx(4.0, 0.5, 4.0, 0, 8.4, 0), st.accent], ...crenaux(4.0, 4.0, 8.9, st.mur, 0.6, 0.62), ...[3.2, 5.6].flatMap(y => [0, 1, 2, 3].map(k => [Bx(0.2, 0.8, 0.12, Math.cos(k * 1.57) * 1.75, y, Math.sin(k * 1.57) * 1.75).rotateY(k % 2 ? Math.PI / 2 : 0), 0x2a2420])),
          ...(st.plat ? [] : [[Co(2.6, 3.0, st === STYLES.medieval ? 14 : 4, 0, 9.5, 0, Math.PI / 4), st.toit]]), porte(0, 0.4, 1.76, 1.0, 1.8), ...etendardMur(0, 7.8, 1.78, 2.0, 0.9)], [])
    ,
    // port : quai et entrepôt côté terre (−z), ponton sur pilotis et grue côté eau (+z)
    port: st => avecFeux([[Bx(10, 0.7, 4.6, 0, -0.2, -2.7), st.socle], [Bx(5.2, 3.2, 3.4, -2.2, 0.5, -3.0), st.mur], ...toit(st, 5.2, 3.4, 1.6, -2.2, 3.7, -3.0), porte(-2.2, 0.5, -1.25, 1.6, 2.2),
      [Bx(4.4, 0.25, 7.0, 2.4, 0.25, 1.4), bois(st)], [Bx(8.6, 0.25, 1.8, -0.6, 0.25, -0.2), bois(st)], ...[-0.8, 1.6, 4.0].flatMap(z => [0.4, 4.4].map(x => [Cy(0.16, 0.18, 3.4, 6, x, -3.0, z), 0x5a3a22])),
      ...[-0.8, 1.6, 4.0].map(z => [Cy(0.12, 0.14, 0.7, 6, 4.5, 0.5, z), 0x3a2a1c]), [Cy(0.16, 0.18, 4.5, 6, 0.7, 0.5, 3.8), bois(st)], [Bx(0.18, 0.18, 3.0, 0.7, 4.9, 2.6), bois(st)], [Bx(0.04, 1.6, 0.04, 0.7, 3.3, 1.3), 0x8a7a5a], [Bx(0.7, 0.6, 0.7, 0.7, 2.7, 1.3), 0xb08a5a],
      ...[[2.6, -0.4], [3.4, -0.3], [3.0, 0.5]].map(([x, z]) => [Bx(0.8, 0.7, 0.8, x, 0.5, z), 0x8a6a40]), [Cy(0.34, 0.34, 0.9, 10, 1.8, 0.5, -0.3), 0x7a5230], ...banniere(4.2, 0.5, 4.8, 2.6, 0.9), ...brasero(-4.4, 0.5, -0.8)], [[-4.4, 1.75, -0.8]]),
    // mur (tronçon de 2 m le long de z) : pierre crénelée, palissade nordique, béton moderne, champ de force du futur
    mur: st => st === STYLES.nordiques ? [...[-0.75, -0.25, 0.25, 0.75].flatMap(z => [[Cy(0.27, 0.29, 3.3, 7, 0, 0, z), bois(st)], [Co(0.28, 0.6, 7, 0, 3.3, z), bois(st)]]), [Bx(0.3, 0.25, 2.1, 0.3, 2.2, 0), 0x6a4a30], [Bx(0.3, 0.25, 2.1, 0.3, 0.8, 0), 0x6a4a30]]
      : st === STYLES.futur ? [[Bx(1.2, 0.4, 2.1), st.socle], [Bx(0.12, 3.0, 2.04, 0, 0.4, 0), st.accent], [Bx(0.5, 0.25, 2.1, 0, 3.4, 0), st.mur]]
        : st === STYLES.moderne ? [[Bx(1.6, 0.5, 2.06), st.socle], [Bx(0.7, 3.0, 2.06, 0, 0.5, 0), st.mur], [Bx(0.75, 0.12, 2.08, 0, 2.2, 0), 0xd8b040]]
          : [[Bx(1.6, 0.4, 2.1), st.socle], [Bx(1.3, 3.1, 2.08, 0, 0.3, 0), st.mur], [Bx(1.6, 0.25, 2.1, 0, 3.4, 0), st.accent], [Bx(0.35, 0.6, 0.7, 0.62, 3.65, -0.5), st.mur], [Bx(0.35, 0.6, 0.7, 0.62, 3.65, 0.6), st.mur], [Bx(0.35, 0.6, 0.7, -0.62, 3.65, -0.5), st.mur], [Bx(0.35, 0.6, 0.7, -0.62, 3.65, 0.6), st.mur]],
    // pilier aux angles et aux bouts des murs
    mur_pilier: st => st === STYLES.nordiques ? [[Cy(0.42, 0.46, 4.2, 8), bois(st)], [Co(0.46, 0.8, 8, 0, 4.2, 0), bois(st)]]
      : st === STYLES.futur ? [[Cy(0.45, 0.55, 3.8, 10), st.mur], [Sp(0.4, 0, 4.1, 0), st.accent]]
        : st === STYLES.moderne ? [[Bx(1.8, 3.6, 1.8), st.mur], [Bx(1.9, 0.3, 1.9, 0, 3.6), 0x8a8e94]]
          : [[Bx(2.2, 4.4, 2.2), st.mur], [Bx(2.4, 0.3, 2.4, 0, 4.4), st.accent], ...[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z]) => [Bx(0.5, 0.6, 0.5, x, 4.7, z), st.mur])],
    // porte : deux tours, linteau et battants ouverts (palissade chez les Nordiques, barrière moderne, arche d'énergie au futur)
    porte: st => st === STYLES.futur ? [[Bx(1.4, 0.4, 6), st.socle], ...[-2.4, 2.4].map(x => [Cy(0.6, 0.8, 5, 10, x, 0.4, 0), st.mur]), [new THREE.TorusGeometry(2.4, 0.22, 8, 24, Math.PI).translate(0, 4.6, 0), st.accent], ...[-2.4, 2.4].map(x => [Bx(0.1, 4.4, 0.1, x * 0.8, 0.4, 0), st.accent])]
      : st === STYLES.moderne ? [[Bx(1.6, 0.4, 6), st.socle], [Bx(1.8, 2.6, 1.6, -2.2, 0.4, 0), st.mur], [Bx(2.0, 0.25, 1.8, -2.2, 3.0, 0), 0x8a8e94], [Bx(0.18, 0.18, 4.0, 0.3, 1.2, 0.2).rotateX(-0.9), 0xd84030], [Bx(0.7, 3.0, 0.7, 2.6, 0.4, 0), st.mur]]
        : st === STYLES.nordiques ? [...[-2.6, -2.0, 2.0, 2.6].flatMap(x => [[Cy(0.32, 0.34, 4.6, 8, x, 0, 0), bois(st)], [Co(0.34, 0.7, 8, x, 4.6, 0), bois(st)]]), [Bx(5.6, 0.5, 0.6, 0, 3.8, 0), 0x6a4a30], ...[-1, 1].map(x => [Bx(0.18, 3.4, 1.7, x * 1.75, 0, 0.9 * x).rotateY(0), 0x7a5230]), ...etendardMur(-2.3, 3.8, 0.4, 1.6, 0.7), ...etendardMur(2.3, 3.8, 0.4, 1.6, 0.7)]
          : [[Bx(6.2, 0.4, 2.4), st.socle], ...[-2.4, 2.4].flatMap(x => [[Bx(1.7, 5.6, 2.4, x, 0.4, 0), st.mur], [Bx(1.9, 0.3, 2.6, x, 6.0, 0), st.accent], [Bx(0.45, 0.6, 0.5, x - 0.55, 6.3, 0.8), st.mur], [Bx(0.45, 0.6, 0.5, x + 0.55, 6.3, 0.8), st.mur], [Bx(0.45, 0.6, 0.5, x - 0.55, 6.3, -0.8), st.mur], [Bx(0.45, 0.6, 0.5, x + 0.55, 6.3, -0.8), st.mur]]),
            [Bx(3.2, 1.4, 2.2, 0, 4.2, 0), st.mur], [Bx(3.4, 0.25, 2.4, 0, 5.6, 0), st.accent], ...[-1, 1].map(x => [Bx(1.4, 3.6, 0.14, x * 1.4, 0.4, 1.35).rotateY(0), 0x4a3020]), ...etendardMur(-2.4, 5.4, 1.23, 2.6, 1.0), ...etendardMur(2.4, 5.4, 1.23, 2.6, 1.0)],
    // centre-ville de l'Antiquité, un par peuple
    centre_grecs: st => avecFeux([[Bx(13.4, 0.5, 13.4), st.socle], [Bx(12, 0.4, 12, 0, 0.5), 0xe6dfcf], ...marches(6, 3, 0, 0, 6.4, 0xd8d0bf), [Bx(8, 5, 6.5, 0, 0.9, -1.2), st.mur], ...[-3.6, -1.2, 1.2, 3.6].map(x => [Cy(0.34, 0.38, 4.6, 12, x, 0.9, 2.6), 0xf6f1e4]),
      [Bx(9, 0.5, 2.2, 0, 5.5, 2.4), 0xf1ece0], [Bx(9.2, 0.6, 9.2, 0, 5.9, -0.2), 0xd8d0bf], [pignon(9.2, 9.4, 2.2, 0, 6.5, -0.2, true), st.toit], [Cy(1.6, 1.9, 3.2, 12, 0, 8.6, -0.2), st.mur], [Co(2.3, 2.4, 12, 0, 11.8, -0.2), st.toit], [Co(0.25, 0.8, 6, 0, 14.2, -0.2), 0xf2d27a],
      porte(0, 0.9, 2.08, 1.6, 2.8), ...fenetres([-2.6, 2.6], 3.0, 2.08), ...[-4.8, 4.8].flatMap(x => [[Bx(1.4, 1.2, 1.4, x, 0.9, 5), 0xd8d0bf], [Cy(0.5, 0.6, 0.8, 10, x, 2.1, 5), 0x9a7a55]]), ...brasero(-2.4, 0.9, 4.4), ...brasero(2.4, 0.9, 4.4),
      ...etendardMur(-3.6, 5.4, 2.95, 2.4, 0.8), ...etendardMur(3.6, 5.4, 2.95, 2.4, 0.8), ...banniere(-5.8, 0.9, -5.2, 3.4, 1.0), ...banniere(5.0, 0.9, -5.2, 3.4, 1.0)], [[-2.4, 2.15, 4.4], [2.4, 2.15, 4.4]]),
    centre_egyptiens: st => avecFeux([[Bx(13.4, 0.5, 13.4), st.socle], [Bx(10, 5.5, 8, 0, 0.5, -1.5), st.mur], [Bx(10.6, 0.5, 8.6, 0, 6, -1.5), 0xc9a86a], ...[-3.4, 3.4].flatMap(x => [[new THREE.CylinderGeometry(1.3, 2.0, 8.5, 4).rotateY(Math.PI / 4).translate(x, 4.75, 3.2), st.mur], [Bx(2.6, 0.4, 2.6, x, 9, 3.2), 0xc9a86a], [Bx(1.6, 3.0, 0.06, x, 4.6, 4.55), EQ]]),
      porte(0, 0.5, 3.2, 2.2, 4), [Bx(3.6, 2.4, 3.6, 0, 6.5, -2), st.mur], ...marches(4, 2, 0, 0.0, 5.6, 0xc9a86a), [new THREE.CylinderGeometry(0.15, 0.6, 6.5, 4).rotateY(Math.PI / 4).translate(5.6, 3.75, 5.4), 0xcdb27a], [Co(0.3, 0.6, 4, 5.6, 7, 5.4, Math.PI / 4), 0xf2d27a], [new THREE.CylinderGeometry(0.15, 0.6, 6.5, 4).rotateY(Math.PI / 4).translate(-5.6, 3.75, 5.4), 0xcdb27a], [Co(0.3, 0.6, 4, -5.6, 7, 5.4, Math.PI / 4), 0xf2d27a],
      ...[-1.2, 1.2].map(x => [Cy(0.35, 0.4, 4.6, 10, x, 0.5, 2.7), 0xe0c88a]), ...brasero(-2.0, 0.5, 4.8), ...brasero(2.0, 0.5, 4.8)], [[-2.0, 1.75, 4.8], [2.0, 1.75, 4.8]]),
    centre_nordiques: st => avecFeux([[Bx(13.4, 0.5, 13.4), st.socle], [Bx(12, 3.6, 6.4, 0, 0.5, -1), st.mur], [pignon(12.4, 7.2, 5, 0, 4.1, -1), st.toit], [Bx(5, 3, 4, 0, 0.5, 3.5), st.mur], [pignon(4, 5.2, 2.6, 0, 3.5, 3.5, true), st.toit], porte(0, 0.5, 5.55, 1.6, 2.4),
      ...[-5.8, 5.8].map(x => [Co(0.35, 1.8, 4, x, 8.2, -1), 0xc9a24a]), ...[[-5.5, 4.5], [5.5, 4.5]].map(([x, z]) => [Cy(0.3, 0.35, 5, 7, x, 0.5, z), st.bois]), [Cy(0.25, 0.3, 1.6, 6, 3, 7.5, -1), 0x5a5048],
      ...[-4.5, -2.5, 2.5, 4.5].map(x => [Cy(0.55, 0.55, 0.1, 14).rotateX(Math.PI / 2).translate(x, 2.2, 2.25), EQ]), ...[0, 1, 2, 3].map(k => [Bx(0.7, 0.05, 0.05, -1.8, 0.9 + k * 0.5, 5.45), 0x8a5c34]), ...brasero(-1.8, 0.5, 6.2), ...brasero(1.8, 0.5, 6.2), ...banniere(5.5, 5.5, 4.5, 2.2, 0.8)], [[-1.8, 1.75, 6.2], [1.8, 1.75, 6.2]]),
    centre_atlantes: st => avecFeux([[Cy(6.7, 7.0, 0.6, 28), st.socle], [Cy(5.2, 5.4, 4.6, 24, 0, 0.6), st.mur], ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => [Cy(0.32, 0.34, 4.6, 10, Math.cos(i * 0.5236) * 6, 0.6, Math.sin(i * 0.5236) * 6), 0xffffff]),
      [new THREE.TorusGeometry(6, 0.35, 6, 36).rotateX(Math.PI / 2).translate(0, 5.3, 0), st.mur], [new THREE.SphereGeometry(5.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 5.2, 0), st.toit], [Cy(0.6, 0.8, 2, 10, 0, 10.3), st.mur], [Co(0.8, 1.6, 10, 0, 12.3), 0xf2d27a], porte(0, 0.6, 5.3, 1.8, 3),
      ...[-1.6, 1.6].map(x => [Bx(1.0, 2.6, 0.06, x, 2.2, 5.45), EQ]), ...brasero(-3.0, 0.6, 6.2), ...brasero(3.0, 0.6, 6.2), [Cy(1.2, 1.4, 0.5, 16, 0, 0.6, 8.0), 0xeef6f5], [Cy(1.0, 1.0, 0.2, 16, 0, 1.0, 8.0), 0x4a9ac0]], [[-3.0, 1.85, 6.2], [3.0, 1.85, 6.2]])
  };
  // gravats d'un bâtiment détruit, échafaudage d'un chantier
  const GRAVATS = (() => { const r = PM.aleatoire(91), l = []; for (let k = 0; k < 22; k++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.46, t = 0.06 + r() * 0.12; l.push([new THREE.BoxGeometry(t * 2, t, t * 1.5).rotateY(r() * 3).rotateX(r() * 0.6).translate(Math.cos(a) * d, t * 0.4, Math.sin(a) * d), r() < 0.3 ? 0x6a4a30 : 0x8a8478]); } return l; })();

  class VueBataille extends PM.Vue3D {
    constructor(canvas, calque) {
      super(canvas, calque, { version: { base: 0, calque: 0, halo: 0 }, etiquettes: [] });
      this.sel = new Set(); this.survol = 0; this.fantome = null; this.ralliement = null;
      this.geoBats = {}; this.pools = {}; this.arbresTombes = new Map(); this.eclairs = [];
    }
    // ---------- une bataille ----------
    lierBataille(B) {
      this.B = B; this.ji = B.joueur; this.vuBrouillard = -1; this.sigSol = '';
      if (this.rts) { this.scene.remove(this.rts); this.rts.traverse(o => { if (o.geometry && !o.geometry.partage) o.geometry.dispose(); }); }
      this.rts = new THREE.Group(); this.scene.add(this.rts); this.pools = {}; this.arbresTombes.clear(); this.eclairs = [];
      const cote = B.cote, pix = new Int16Array(cote * cote);
      for (let z = 0; z < cote; z++) for (let x = 0; x < cote; x++) pix[z * cote + x] = BT.hauteur(B, x + 0.5, z + 0.5) < 0 ? -1 : 0;
      const j = { carte: { w: cote, h: cote, pix, provinces: [{ id: 0, lx: -9999, ly: -9999, voisins: [], mer: [] }] },
        etat: { provinces: [{ id: 0, owner: -1, terrain: 'plaine', dev: 0, bat: {}, nom: '' }], nations: B.joueurs.map(J => ({ nom: J.nom, couleur: J.couleur, pantheon: J.pantheon })), reglages: { graine: B.graine, epoque: B.epoque } }, anims: [] };
      // pack conseillé par la carte (sauf choix du joueur fait pour cette bataille)
      if (B.pack && PM.PACKS_GRAPHIQUES[B.pack]) this.idPack = B.pack;
      this.lier(j);
      this.U.uVisOn.value = 1;
      this.texVis = new THREE.DataTexture(new Uint8Array(B.mv * B.mv * 4), B.mv, B.mv, THREE.RGBAFormat); this.texVis.magFilter = this.texVis.minFilter = THREE.LinearFilter; this.U.tVis.value = this.texVis;
      this.particules = new Particules(this.rts, 2600, false); this.feux = new Particules(this.rts, 1800, true);
      this.unitesPretes = false;
      const noms = this.nomsUtiles(); this.chargerFoules(noms).then(() => { this.unitesPretes = true; });
    }
    // personnages à charger pour cette bataille : villageois, unités de chaque peuple, créatures possibles, invocations, bêtes
    nomsUtiles() {
      const B = this.B, l = new Set(['mouton', 'vache']);
      for (const J of B.joueurs) {
        const P = PM.PANTHEONS[J.pantheon];
        for (const cle of ['villageois', 'inf', 'archer', 'cav', 'heros', 'siege']) { l.add(this.modele({ j: J.id, cle, id: 0 })); l.add(this.modele({ j: J.id, cle, id: 1 })); }
        for (const a of P.mineurs) for (const g of a) { l.add(this.modele({ j: J.id, cle: g.unite, id: 0 })); const d = R.POUVOIRS[g.pouvoir]; if (d && d.type === 'invoquer') l.add(this.modele({ j: J.id, cle: d.unite, id: 0 })); }
        for (const d of P.majeurs) { const p = R.POUVOIRS[d.pouvoir]; if (p && p.type === 'invoquer') l.add(this.modele({ j: J.id, cle: p.unite, id: 0 })); }
      }
      l.delete(null); l.delete(undefined); return [...l];
    }
    modele(u) {
      const B = this.B, J = B.joueurs[u.j], ep = B.epoque, D = O.DISTRIB[ep] || {}, P = D[J.pantheon] || {};
      if (u.cle === 'villageois') return u.id % 2 ? D.villageoise : D.villageois;
      if (R.ROLES[u.cle]) return P[u.cle] || (typeof D[u.cle] === 'string' ? D[u.cle] : null) || (u.cle === 'cav' ? P.inf : null) || P.inf || 'c_hoplite';
      if (INVOQUES[u.cle] && (ep === 'antique' || u.cle !== 'automate')) return INVOQUES[u.cle];
      if (u.cle === 'heros_ragnarok') return P.heros || P.inf;
      if (ep === 'antique') return MYTHE_MODELE[u.cle] || P.mythe || 'c_minotaure';
      return P.mythe || D.mythe || { industriel: 'm_canon', moderne: 'm_char_moderne' }[ep] || 'c_golem';
    }
    // hauteur de chaque modèle chargé (les créatures sont mises à leur taille)
    hauteurModele(nom) { const H = this.hModele || (this.hModele = {}); if (H[nom]) return H[nom]; const f = this.foules && this.foules[nom]; if (!f) return 2; f.geo.computeBoundingBox(); const b = f.geo.boundingBox; return (H[nom] = Math.max(0.5, b.max.y - b.min.y)); }
    echelleUnite(u, nom) {
      if (u.s.cat === 'mythe') { const h = this.hauteurModele(nom); return Math.max(0.7, Math.min(5, HAUTEUR_CREATURE(u.s.pop) / h)) * (nom.startsWith('k_') ? 1.1 : 1); }
      return (u.cle === 'heros' ? 1.12 : 1) * ECHELLE_HUMAINS;
    }

    // ---------- monde : relief de la bataille, pas de territoires ----------
    hauteurs() { const B = this.B; this.pas = BT.CEL; this.gx = this.gz = B.n + 1; this.H = B.carte.H; this.poids = { W: B.carte.W, mer: new Float32Array(this.gx * this.gz), types: ['plaine', 'foret', 'collines', 'montagne', 'desert'] }; }
    majPeuples() { if (this.dataPeuples) this.dataPeuples.fill(0); if (this.dataBords) this.dataBords.fill(0); if (this.texPeuples) { this.texPeuples.needsUpdate = true; this.texBords.needsUpdate = true; } this.majSolBatiments(true); }
    // terre battue autour des bâtiments, dallage devant les centres-villes (canal vert et bleu lus par le nuancier du sol)
    majSolBatiments(force) {
      const B = this.B; if (!B || !this.cvRoutes) return;
      const sig = B.bats.filter(b => !b.mort).map(b => b.id).join(','); if (!force && sig === this.sigSol) return; this.sigSol = sig;
      const t = this.cvRoutes.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.fillStyle = '#000'; t.fillRect(0, 0, B.cote, B.cote); t.globalCompositeOperation = 'lighter';
      for (const b of B.bats) {
        if (b.mort || b.cle === 'ferme') continue; const R0 = b.taille * (b.cle === 'centre' ? 1.15 : 0.85);
        const g = t.createRadialGradient(b.x, b.z, 0, b.x, b.z, R0); g.addColorStop(0, 'rgb(0,220,0)'); g.addColorStop(0.6, 'rgb(0,150,0)'); g.addColorStop(1, 'rgb(0,0,0)'); t.fillStyle = g; t.beginPath(); t.arc(b.x, b.z, R0, 0, 7); t.fill();
        if (b.cle === 'centre' || b.cle === 'temple' || b.cle === 'merveille') { const h = t.createRadialGradient(b.x, b.z, b.taille * 0.45, b.x, b.z, b.taille * 0.75); h.addColorStop(0, 'rgb(0,0,230)'); h.addColorStop(1, 'rgb(0,0,0)'); t.fillStyle = h; t.beginPath(); t.arc(b.x, b.z, b.taille * 0.8, 0, 7); t.fill(); }
      }
      t.globalCompositeOperation = 'source-over'; this.texRoutes.needsUpdate = true;
    }
    construireVilles() {} construireVie() {} animerVie() {}
    cadrer() {
      const B = this.B, c = B.bats.find(b => b.j === B.joueur && b.cle === 'centre') || { x: B.cote / 2, z: B.cote / 2 };
      Object.assign(this.vise, { x: c.x, z: c.z + 6, d: 70, lacet: 0 });
    }
    centrerXZ(x, z) { this.vise.x = x; this.vise.z = z; }
    tangage(d) { return Math.max(0.8, Math.min(1.08, 0.68 + d / 480)); }
    deplacer(dx, dy) { super.deplacer(dx, dy); const c = this.B ? this.B.cote : 1e4, v = this.vise; v.x = Math.max(0, Math.min(c, v.x)); v.z = Math.max(0, Math.min(c + 10, v.z)); }
    zoomer(f, sx, sy) { const avant = this.pointSol(sx, sy), v = this.vise, d0 = v.d; v.d = Math.max(26, Math.min(170, v.d / f)); if (avant) { const k = 1 - v.d / d0; v.x += (avant.x - v.x) * k; v.z += (avant.z - v.z) * k; } }
    stabiliser() { Object.assign(this.cam, this.vise); this.placerCamera(1e6); }

    // ---------- nature : arbres de la bataille (récoltables), buissons de baies, mines, décor ----------
    construireNature() {
      const B = this.B; if (!B) return;
      const rnd = PM.aleatoire(B.graine * 5 + 1), typeCarte = B.typeCarte;
      const L = { sapin: [], feuillu: [], acacia: [], buisson: [], rocher: [], palmier: [], souche: [] };
      this.arbreIdx = new Map();
      for (const r of B.res) {
        if (r.sous !== 'arbre') continue;
        const u = rnd(), k = typeCarte === 'toundra' ? 'sapin' : typeCarte === 'oasis' ? (u < 0.55 ? 'palmier' : 'acacia') : typeCarte === 'automne' ? (u < 0.75 ? 'feuillu' : 'sapin') : (u < 0.45 ? 'feuillu' : u < 0.8 ? 'sapin' : 'acacia');
        const a = [r.x, r.z, 0.72 + rnd() * 0.4, rnd()]; this.arbreIdx.set(r.id, [k, L[k].length]); L[k].push(a);
      }
      // décor : rochers et buissons loin des ressources et des départs (sans effet sur le passage)
      for (let t = 0; t < B.cote * 1.4; t++) {
        const x = 6 + rnd() * (B.cote - 12), z = 6 + rnd() * (B.cote - 12); if (!BT.marchable(B, x, z) || B.carte.departs.some(([dx, dz]) => (dx - x) ** 2 + (dz - z) ** 2 < 30 * 30)) continue;
        if (BT.hauteur(B, x, z) < 0.6) continue;
        (rnd() < 0.45 ? L.rocher : L.buisson).push([x, z, rnd() < 0.5 ? 0.35 + rnd() * 0.3 : 0.5 + rnd() * 0.5, rnd()]);
      }
      this.listesNature = L;
      if (this.nature) for (const m of this.nature) this.monde.remove(m);
      const pose = enf => (o, a, c) => { o.position.set(a[0], this.sol(a[0], a[1]) - enf, a[1]); o.rotation.set(0, a[3] * 6.28, 0); o.scale.setScalar(a[2]); c.setRGB(1, 1, 1); };
      this.nature = []; this.mNature = {};
      if (this.pret && this.texF) {
        const T = this.texF, GA = this.geoArbres(), ec = this.matEcorce();
        const mk = (nom, geo, mat, liste, cle, enf) => { const m = this.instGeo(geo, mat, liste, pose(enf)); m.userData.nom = nom; m.userData.liste = cle; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.nature.push(m); (this.mNature[cle] = this.mNature[cle] || []).push(m); return m; };
        mk('sapinTronc', GA.sapinTronc, ec, L.sapin, 'sapin', 0.1); mk('sapinEtages', GA.sapinEtages, this.matFeuillage('sapinE', T.sapinE, 0.04), L.sapin, 'sapin', 0.1); mk('sapinProfil', GA.sapinProfil, this.matFeuillage('sapinP', T.sapinP, 0.04), L.sapin, 'sapin', 0.1);
        mk('feuilluTronc', GA.feuilluTronc, ec, L.feuillu, 'feuillu', 0.1); mk('feuilluFeuilles', GA.feuilluFeuilles, this.matFeuillage('feuillu', T.feuillu, 0.05), L.feuillu, 'feuillu', 0.1);
        mk('acaciaTronc', GA.acaciaTronc, ec, L.acacia, 'acacia', 0.1); mk('acaciaFeuilles', GA.acaciaFeuilles, this.matFeuillage('acacia', T.acacia, 0.06), L.acacia, 'acacia', 0.1);
        mk('palmierTronc', GA.palmierTronc, ec, L.palmier, 'palmier', 0.1); mk('palmierFeuilles', GA.palmierPalmes, this.matFeuillage('palmes', T.acacia, 0.07), L.palmier, 'palmier', 0.1);
        mk('buisson', GA.buisson, this.matFeuillage('buisson', T.buisson, 0.05), L.buisson, 'buisson', 0.15);
        const blanc = new THREE.Color(1, 1, 1), teintable = m => { for (let i = 0; i < m.count; i++) m.setColorAt(i, blanc); return m; };
        const modeles = (noms, liste, taille, enf, cle) => { const parts = noms.map(() => []); liste.forEach(a => parts[Math.floor(a[3] * 7919) % noms.length].push(a)); noms.forEach((n, k) => { if (!this.glb[n]) return; for (const m of this.instGLB(n, parts[k], taille, enf)) { teintable(m); m.userData.liste = cle + k; this.nature.push(m); (this.mNature[cle + k] = this.mNature[cle + k] || []).push(m); } }); this.listesNature[cle + '0'] = parts[0]; this.listesNature[cle + '1'] = parts[1]; this.listesNature[cle + '2'] = parts[2]; this.listesNature[cle + '3'] = parts[3]; this.listesNature[cle + '4'] = parts[4]; };
        modeles(['rocher1', 'rocher2', 'rocher3', 'rocher4', 'rochers-mousse'], L.rocher, 2.2, 0.35, 'rocher');
        // souches des arbres abattus (cachées tant que l'arbre est debout)
        if (this.glb.souche) { const tous = []; this.souchePour = new Map(); for (const r of B.res) if (r.sous === 'arbre') { this.souchePour.set(r.id, tous.length); tous.push([r.x, r.z, 0.9, (r.id * 0.37) % 1]); } this.souches = this.instGLB('souche', tous, 1.3, 0.05); this.souchesListe = tous; for (const m of this.souches) { teintable(m); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.nature.push(m); } this.cacherToutesSouches(); }
      } else {
        const vent = (nom, l, cle) => { const m = this.inst(nom, l, pose(0.1), null, this.mat({ vertexColors: true, roughness: 0.85, flatShading: true })); m.userData.nom = nom; m.userData.liste = cle; this.nature.push(m); (this.mNature[cle] = this.mNature[cle] || []).push(m); };
        vent('sapinTronc', L.sapin, 'sapin'); vent('sapinFeuilles', L.sapin, 'sapin'); vent('feuilluTronc', L.feuillu.concat(L.acacia, L.palmier), 'feuillu'); vent('feuilluFeuilles', L.feuillu.concat(L.acacia, L.palmier), 'feuillu');
      }
      this.natureParNom = {}; for (const m of this.nature) if (m.userData.nom) this.natureParNom[m.userData.nom] = m;
      for (const m of this.nature) this.monde.add(m);
      this.etatArbre = new Map(); this.couleursBase = null; this.vuBrouillard = -1;
      this.construireRessources();
    }
    cacherToutesSouches() { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (const m of this.souches || []) { for (let i = 0; i < m.count; i++) m.setMatrixAt(i, z); m.instanceMatrix.needsUpdate = true; } }
    // baies (buissons piquetés de rouge), mines d'or (rocher et pépites)
    construireRessources() {
      const B = this.B;
      if (this.mRess) for (const m of this.mRess) this.rts.remove(m);
      this.mRess = [];
      const baies = B.res.filter(r => r.sous === 'baies'), mines = B.res.filter(r => r.sous === 'mine');
      this.baiesListe = baies; this.minesListe = mines;
      if (this.pret && this.texF) {
        const GA = this.geoArbres(), m = new THREE.InstancedMesh(GA.buisson, this.matFeuillage('buisson', this.texF.buisson, 0.05), Math.max(1, baies.length)); m.userData.ress = 'baies';
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.castShadow = m.receiveShadow = true; this.mBaies = m; this.mRess.push(m);
        const g = []; const r = PM.aleatoire(5); for (let k = 0; k < 26; k++) { const a = r() * 6.28, h = r(), rr = 0.75 + r() * 0.35; g.push(new THREE.IcosahedronGeometry(0.09 + r() * 0.04, 0).translate(Math.cos(a) * rr * (1 - h * 0.5), 0.35 + h * 0.85, Math.sin(a) * rr * (1 - h * 0.5))); }
        const gb = fusionner(g), mb = new THREE.InstancedMesh(gb, new THREE.MeshStandardMaterial({ color: 0xc2182a, roughness: 0.35, emissive: 0x3a0008 }), Math.max(1, baies.length)); mb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mBaiesFruits = mb; this.mRess.push(mb);
      }
      // mine : gros rocher sombre et pépites d'or
      const geoRoc = (() => { const g = new THREE.IcosahedronGeometry(2.4, 2), p = g.attributes.position, rr = PM.aleatoire(77); for (let i = 0; i < p.count; i++) { const k = 0.8 + rr() * 0.35; p.setXYZ(i, p.getX(i) * k, Math.max(-0.3, p.getY(i) * k * 0.62), p.getZ(i) * k); } g.computeVertexNormals(); return g; })();
      const mr = new THREE.InstancedMesh(geoRoc, new THREE.MeshStandardMaterial({ color: 0x6a645c, roughness: 0.92, flatShading: true }), Math.max(1, mines.length)); mr.castShadow = mr.receiveShadow = true; mr.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mMinesRoc = mr; this.mRess.push(mr);
      const pep = []; const r2 = PM.aleatoire(41); for (let k = 0; k < 22; k++) { const a = r2() * 6.28, rr = 0.6 + r2() * 1.9; pep.push(new THREE.IcosahedronGeometry(0.22 + r2() * 0.28, 0).translate(Math.cos(a) * rr, 0.6 + r2() * 0.9 - rr * 0.18, Math.sin(a) * rr)); }
      const mo = new THREE.InstancedMesh(fusionner(pep), new THREE.MeshStandardMaterial({ color: 0xf2c14a, metalness: 0.95, roughness: 0.25, emissive: 0x4a3300 }), Math.max(1, mines.length)); mo.castShadow = true; mo.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.mMinesOr = mo; this.mRess.push(mo);
      for (const m of this.mRess) { m.count = 0; this.rts.add(m); }
    }
    construireHerbe() {
      const B = this.B; if (this.herbe) this.monde.remove(this.herbe); this.herbe = null;
      if (!B || !this.pret || !this.texF || G.PM_LEGER) return;
      const rnd = PM.aleatoire(99), l = [];
      for (let t = 0; t < 160000 && l.length < 26000 * (this.Q ? Math.max(0.3, this.Q.herbe) : 1); t++) {
        const x = rnd() * B.cote, z = rnd() * B.cote; if (!BT.marchable(B, x, z)) continue;
        const h = this.sol(x, z); if (h < 0.6) continue;
        if (B.carte.departs.some(([dx, dz]) => (dx - x) ** 2 + (dz - z) ** 2 < 20 * 20)) continue;
        const des = this.poidsA('desert', x, z); if (des > 0.4 || rnd() < des * 1.5) continue;
        l.push([x, z, 0.55 + rnd() * 0.5, rnd()]);
      }
      this.listeHerbe = l;
      const m = new THREE.InstancedMesh(this.geoArbres().herbe, this.matHerbe(), Math.max(1, l.length)), o = new THREE.Object3D();
      l.forEach((a, i) => { o.position.set(a[0], this.sol(a[0], a[1]) - 0.05, a[1]); o.rotation.set(0, 0, 0); o.scale.set(a[2], a[2] * (0.8 + a[3] * 0.5), a[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(1, 1, 1)); });
      m.count = l.length; m.receiveShadow = true; this.herbe = m; this.monde.add(m); this.colorerHerbe();
    }
    colorerNature() { super.colorerNature(); this.couleursBase = null; this.vuBrouillard = -1; }

    // ---------- géométries des bâtiments ----------
    style(J) { return STYLES[this.B.epoque === 'antique' ? J.pantheon : this.B.epoque] || STYLES.grecs; }
    styleCle(J) { return this.B.epoque === 'antique' ? J.pantheon : this.B.epoque; }
    geoBat(b) {
      const B = this.B, J = B.joueurs[b.j], ep = B.epoque, P = J.pantheon, st = this.style(J), sk = this.styleCle(J);
      let nom;
      if (b.cle === 'tour' && (ep === 'moderne' || ep === 'futur')) nom = ep === 'moderne' ? 'bunker' : 'tour_futur2';
      else if (CONSTR[b.cle]) nom = 'rts_' + b.cle + '_' + sk;
      else if (b.cle === 'centre' && ep === 'antique') nom = 'rts_centre_' + P;
      else if (b.cle === 'centre') nom = 'centre_' + ep;
      else if (b.cle === 'maison') { const l = ep === 'antique' ? O.MAISONS[P] || ['maison_grecs'] : O.MAISONS[ep] || ['maison_' + ep]; nom = l[b.id % l.length]; if (!this.M[nom]) nom = 'maison_grecs'; }
      else if (b.cle === 'temple') nom = ep === 'antique' ? 'temple_' + P : O.TEMPLE_EPOQUE[ep] || 'temple_grecs';
      else if (b.cle === 'merveille') nom = 'merveille_' + (ep === 'antique' ? 'antique' : ep);
      else if (b.cle === 'ferme') nom = 'champ';
      let e = this.geoBats[nom];
      if (!e) {
        const gen = nom.startsWith('rts_centre_') ? CONSTR['centre_' + P] : nom.startsWith('rts_') ? CONSTR[b.cle] : null;
        let geo, geoEq = null, feux = [];
        if (gen) { const parts = gen(st); feux = parts.feux || []; geo = O.fusion(parts.filter(q => q[1] !== EQ)); const eq = parts.filter(q => q[1] === EQ).map(q => q[0]); if (eq.length) geoEq = fusionner(eq); }
        else geo = this.M[nom];
        geo.computeBoundingBox(); const bb = geo.boundingBox, w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z), h = bb.max.y - bb.min.y;
        const T = R.BATIMENTS[b.cle].taille;
        let k = b.cle === 'ferme' || b.cle === 'port' ? 1 : T * (b.cle === 'maison' ? 0.86 : b.cle === 'tour' ? 1.3 : 0.98) / w; k = Math.min(k, (b.cle === 'merveille' ? 70 : 42) / h);
        e = this.geoBats[nom] = { nom, geo, geoEq, feux, k, h: h * k, ferme: b.cle === 'ferme', sk, cle: b.cle };
        if (geoEq) geoEq.partage = true;
      }
      return e;
    }
    geoPilier(sk, st) { const n = 'pilier_' + sk; return this.geoBats[n] || (this.geoBats[n] = { nom: n, geo: O.fusion(CONSTR.mur_pilier(st)) }); }
    // échafaudage d'un chantier : poteaux et lisses autour de l'emprise (une géométrie par taille)
    geoEchafaudage(w, h) {
      const n = 'echaf_' + Math.round(w) + '_' + Math.round(h); if (this.geoBats[n]) return this.geoBats[n];
      const l = [], ny = Math.max(2, Math.round(h / 2.2)), c = w / 2 + 0.4;
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) l.push(new THREE.CylinderGeometry(0.07, 0.07, h + 0.6, 4).translate(sx * c, h / 2 + 0.3, sz * c));
      for (let k = -1; k <= 1; k += 1) { if (!k) continue; for (const sx of [-1, 1]) l.push(new THREE.CylinderGeometry(0.06, 0.06, h, 4).translate(sx * c, h / 2, k * c * 0.3), new THREE.CylinderGeometry(0.06, 0.06, h, 4).translate(k * c * 0.3, h / 2, sx * c)); }
      for (let y = 1; y <= ny; y++) { const yy = y * h / ny; for (const s of [-1, 1]) { l.push(new THREE.BoxGeometry(c * 2, 0.08, 0.08).translate(0, yy, s * c), new THREE.BoxGeometry(0.08, 0.08, c * 2).translate(s * c, yy, 0), new THREE.BoxGeometry(c * 2, 0.06, 0.5).translate(0, yy - 0.05, s * (c - 0.25))); } }
      for (const s of [-1, 1]) l.push(new THREE.BoxGeometry(0.06, 0.06, Math.hypot(c * 2, h)).rotateX(Math.atan2(h, c * 2)).translate(s * c, h / 2, 0));
      const g = fusionner(l); g.partage = true; return (this.geoBats[n] = g);
    }
    // orientation d'un port : le ponton regarde l'eau
    dirPort(b) {
      this.dirsPort = this.dirsPort || new Map(); if (this.dirsPort.has(b.id)) return this.dirsPort.get(b.id);
      const B = this.B, n = B.n, cx = Math.floor(b.x / BT.CEL), cz = Math.floor(b.z / BT.CEL); let wx = 0, wz = 0;
      for (let k = cz - 5; k <= cz + 5; k++) for (let i = cx - 5; i <= cx + 5; i++) if (i >= 0 && k >= 0 && i < n && k < n && BT.hauteur(B, i * BT.CEL + 1, k * BT.CEL + 1) < -0.3) { wx += i - cx; wz += k - cz; }
      const a = Math.atan2(wx, wz); this.dirsPort.set(b.id, a); return a;
    }
    // modèle photographique (accessoires, bateaux) découpé en parties instanciables, ramené à « taille » (longueur la plus grande)
    partiesGLB(nom, taille, flottant) {
      const c = 'glb:' + nom + ':' + taille; this.cacheGLB = this.cacheGLB || {}; if (this.cacheGLB[c]) return this.cacheGLB[c];
      const sc = this.glb && this.glb[nom]; if (!sc) return null; sc.updateMatrixWorld(true);
      const bo = new THREE.Box3().setFromObject(sc), dim = bo.getSize(new THREE.Vector3()), long = dim.x > dim.z, k = taille / Math.max(dim.x, dim.z, 0.01), l = [];
      sc.traverse(o => { if (!o.isMesh) return; const g = o.geometry.clone().applyMatrix4(o.matrixWorld).translate(-(bo.min.x + bo.max.x) / 2, flottant ? 0 : -bo.min.y, -(bo.min.z + bo.max.z) / 2); g.morphAttributes = {}; if (long) g.rotateY(-Math.PI / 2); g.scale(k, k, k); g.partage = true; l.push({ geo: g, mat: o.material }); });
      return (this.cacheGLB[c] = { parts: l, hauteur: dim.y * k });
    }
    poserGLB(cle, parts, mat4, couleur) { parts.forEach((q, i) => { const p = this.meshGeo(cle + ':' + i, q.geo, q.mat); if (p) this.ajouterInst(p, mat4, couleur); }); }

    // ---------- réserves d'instances (une par modèle), remplies à chaque image ----------
    pool(cle, creer, cap0) {
      let p = this.pools[cle];
      if (!p) { const m = creer(cap0 || 32); if (!m) return null; p = this.pools[cle] = { m, cap: cap0 || 32, n: 0, creer }; this.rts.add(m); }
      return p;
    }
    ajouterInst(p, mat4, couleur, apres) {
      if (p.n >= p.cap) { // plus de place : réserve deux fois plus grande
        const vieux = p.m; p.cap *= 2; p.m = p.creer(p.cap); for (let i = 0; i < p.n; i++) { vieux.getMatrixAt(i, M4); p.m.setMatrixAt(i, M4); if (vieux.instanceColor) { vieux.getColorAt(i, C1); p.m.setColorAt(i, C1); } }
        const a = vieux.geometry.attributes.aClip; if (a) p.m.geometry.attributes.aClip.array.set(a.array.subarray(0, p.n * 4));
        this.rts.remove(vieux); this.rts.add(p.m);
      }
      const i = p.n++; p.m.setMatrixAt(i, mat4); if (couleur != null) p.m.setColorAt(i, couleur); if (apres) apres(p.m, i); return i;
    }
    finirPools() { for (const k in this.pools) { const p = this.pools[k], m = p.m; m.count = p.n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; const a = m.geometry.attributes.aClip; if (a) a.needsUpdate = true; p.n = 0; } }
    meshFoule(nom) {
      return this.pool('f:' + nom, cap => {
        const f = this.foules && this.foules[nom]; if (!f) return null;
        const g = new THREE.BufferGeometry(); g.setIndex(f.geo.index); for (const k of ['position', 'uv', 'at']) g.setAttribute(k, f.geo.attributes[k]); g.boundingSphere = f.geo.boundingSphere;
        g.setAttribute('aClip', new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage));
        const m = new THREE.InstancedMesh(g, f.mat, cap); m.customDepthMaterial = f.ombre; m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; m.userData.foule = f; return m;
      }, 16);
    }
    meshGeo(cle, geo, mat, ombre = true) { return this.pool(cle, cap => { const m = new THREE.InstancedMesh(geo, mat, cap); m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = ombre; m.receiveShadow = true; return m; }, 16); }
    clip(m, i, nomClip, k, vitesse, ph, fige) {
      const f = m.userData.foule, C = f.meta.clips, c = (typeof nomClip === 'string' ? f.clips[nomClip] : C[nomClip]) || C[k] || C[0];
      const a = m.geometry.attributes.aClip.array; a[i * 4] = c.debut; a[i * 4 + 1] = c.nb; a[i * 4 + 2] = fige ? 0 : c.ips * (vitesse || 1); a[i * 4 + 3] = fige ? c.nb - 1 : ph * c.nb;
    }

    // ---------- brouillard ----------
    majBrouillard() {
      const B = this.B, J = B.joueurs[this.ji]; if (this.vuBrouillard === B.versionBrouillard) return; this.vuBrouillard = B.versionBrouillard;
      const d = this.texVis.image.data, n = B.mv * B.mv;
      for (let k = 0; k < n; k++) { const v = J.vis[k] === 2 ? 255 : J.connu[k] ? 140 : 0; d[k * 4] = v; d[k * 4 + 3] = 255; }
      this.texVis.needsUpdate = true;
      // arbres, rochers et buissons : assombris comme le sol
      if (!this.mNature) return;
      const f = (x, z) => { const i = Math.floor(x / BT.VUE_CEL), k = Math.floor(z / BT.VUE_CEL); if (i < 0 || k < 0 || i >= B.mv || k >= B.mv) return 0.05; const o = k * B.mv + i; return J.vis[o] === 2 ? 1 : J.connu[o] ? 0.45 : 0.05; };
      if (!this.couleursBase) { this.couleursBase = new Map(); for (const m of this.nature) if (m.instanceColor) this.couleursBase.set(m, m.instanceColor.array.slice()); }
      for (const cle in this.mNature) {
        const liste = this.listesNature[cle]; if (!liste) continue;
        for (const m of this.mNature[cle]) {
          if (!m.instanceColor) continue; const base = this.couleursBase.get(m) || m.instanceColor.array.slice(), a = m.instanceColor.array;
          for (let i = 0; i < liste.length && i < m.count; i++) { const k = f(liste[i][0], liste[i][1]); a[i * 3] = base[i * 3] * k; a[i * 3 + 1] = base[i * 3 + 1] * k; a[i * 3 + 2] = base[i * 3 + 2] * k; }
          m.instanceColor.needsUpdate = true;
        }
      }
      for (const m of this.souches || []) { if (!m.instanceColor) continue; const a = m.instanceColor.array; this.souchesListe.forEach((s, i) => { const k = f(s[0], s[1]); a[i * 3] = a[i * 3 + 1] = a[i * 3 + 2] = k; }); m.instanceColor.needsUpdate = true; }
    }
    brouillardEn(x, z) { const B = this.B, J = B.joueurs[this.ji]; const i = Math.floor(x / BT.VUE_CEL), k = Math.floor(z / BT.VUE_CEL); if (i < 0 || k < 0 || i >= B.mv || k >= B.mv) return 0; const o = k * B.mv + i; return J.vis[o] === 2 ? 2 : J.connu[o] ? 1 : 0; }

    // ---------- arbres : debout, abattus (couchés pendant la récolte), puis souche ----------
    majArbres() {
      const B = this.B; if (!this.arbreIdx || !this.mNature) return;
      const ob = new THREE.Object3D(), t = this.temps / 1000;
      for (const r of B.res) {
        if (r.sous !== 'arbre') continue;
        const etat = r.qte <= 0 ? 2 : r.qte < r.qteMax ? 1 : 0, avant = this.etatArbre.get(r.id) || 0;
        if (etat === avant && !this.arbresTombes.has(r.id)) continue;
        if (etat !== avant) { this.etatArbre.set(r.id, etat); if (etat === 1 && avant === 0) this.arbresTombes.set(r.id, t); if (etat === 2) { this.arbresTombes.delete(r.id); this.poserArbre(r, null); this.montrerSouche(r); continue; } }
        const t0 = this.arbresTombes.get(r.id); if (t0 == null) continue;
        const k = Math.min(1, (t - t0) / 1.1), ang = k * k * Math.PI * 0.48; if (k >= 1) this.arbresTombes.delete(r.id);
        this.poserArbre(r, ang, ob);
      }
    }
    poserArbre(r, ang, ob) {
      const [cle, i] = this.arbreIdx.get(r.id) || []; if (!cle) return; const a = this.listesNature[cle][i], ms = this.mNature[cle] || [];
      ob = ob || new THREE.Object3D();
      if (ang == null) { M4.makeScale(0, 0, 0); for (const m of ms) { m.setMatrixAt(i, M4); m.instanceMatrix.needsUpdate = true; } return; }
      // l'arbre bascule autour de son pied, du côté opposé au premier villageois venu
      const dir = a[3] * 6.28;
      ob.position.set(a[0], this.sol(a[0], a[1]) - 0.1, a[1]); ob.rotation.set(0, 0, 0); ob.quaternion.setFromEuler(new THREE.Euler(0, dir, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(ang, 0, 0)));
      ob.scale.setScalar(a[2]); ob.updateMatrix();
      for (const m of ms) { m.setMatrixAt(i, ob.matrix); m.instanceMatrix.needsUpdate = true; }
    }
    montrerSouche(r) {
      if (!this.souches || !this.souchePour) return; const i = this.souchePour.get(r.id); if (i == null) return;
      const s = this.souchesListe[i], ob = new THREE.Object3D();
      // matrice de base de l'instance (taille ramenée à 1,3 m par instGLB) : recalculée comme instGLB
      const sc = this.glb.souche; sc.updateMatrixWorld(true); const bo = new THREE.Box3().setFromObject(sc), dim = bo.getSize(new THREE.Vector3()), k = 1.3 / Math.max(dim.x, dim.z, 0.01);
      ob.position.set(s[0], this.sol(s[0], s[1]) - 0.05 * s[2], s[1]); ob.rotation.set(0, s[3] * 6.28, 0); ob.scale.setScalar(s[2] * k); ob.updateMatrix();
      for (const m of this.souches) { m.setMatrixAt(i, ob.matrix); m.instanceMatrix.needsUpdate = true; }
    }

    // ---------- une image ----------
    dessiner(dt) {
      const B = this.B; if (!B || !this.j) return;
      this.temps += dt || 0; this.dt = dt; this.U.uT.value = this.temps / 1000;
      const w = this.cv.clientWidth, h = this.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (this.taille !== w + 'x' + h) { this.taille = w + 'x' + h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.et.width = w * dpr; this.et.height = h * dpr; this.creerPost(w, h); if (this.matFumee) this.matFumee.uniforms.uEchelle.value = h * this.renderer.getPixelRatio() * 0.9; }
      if (!this.sigSolInit) { this.sigSolInit = true; this.majSolBatiments(true); }
      this.majSolBatiments(false); this.majBrouillard(); this.placerCamera(dt);
      this.majArbres(); this.majRessources(); this.majBatiments(); this.majUnites(); this.majProjectiles(); this.lireEvenements(); this.majEffets(dt);
      this.finirPools();
      this.particules.maj(dt / 1000, this); this.feux.maj(dt / 1000, this);
      if (this.herbe) this.herbe.visible = this.Q.herbe > 0 && this.cam.d < 120 && !(this.pack.neige.partout > 0.3);
      if (this.composer) { if (this.etal) { this.etal.uniforms.uT.value = this.temps / 1000; this.etal.uniforms.uRes.value.set(w, h); } this.composer.render(dt / 1000); }
      else this.renderer.render(this.scene, this.camera);
      this.etiquettes(dpr);
    }
    majRessources() {
      const B = this.B, ob = new THREE.Object3D(), t = this.temps / 1000;
      if (this.mBaies) {
        let n = 0; for (const r of this.baiesListe) { if (r.qte <= 0) continue; const k = 0.55 + 0.45 * r.qte / r.qteMax, f = this.brouillardEn(r.x, r.z); ob.position.set(r.x, this.sol(r.x, r.z) - 0.1, r.z); ob.rotation.set(0, r.dir, 0); ob.scale.setScalar(k * 1.05); ob.updateMatrix();
          this.mBaies.setMatrixAt(n, ob.matrix); this.mBaies.setColorAt(n, C1.setRGB(0.75, 0.9, 0.7).multiplyScalar(f === 2 ? 1 : f ? 0.45 : 0.05)); this.mBaiesFruits.setMatrixAt(n, ob.matrix); this.mBaiesFruits.setColorAt(n, C1.setScalar(f === 2 ? 1 : f ? 0.45 : 0.05)); n++; }
        for (const m of [this.mBaies, this.mBaiesFruits]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      }
      let n = 0; for (const r of this.minesListe) { if (r.qte <= 0) continue; const k = 0.55 + 0.45 * r.qte / r.qteMax, f = this.brouillardEn(r.x, r.z); ob.position.set(r.x, this.sol(r.x, r.z) - 0.2, r.z); ob.rotation.set(0, r.dir, 0); ob.scale.setScalar(k); ob.updateMatrix();
        const c = f === 2 ? 1 : f ? 0.45 : 0.05; this.mMinesRoc.setMatrixAt(n, ob.matrix); this.mMinesRoc.setColorAt(n, C1.setScalar(c)); this.mMinesOr.setMatrixAt(n, ob.matrix); this.mMinesOr.setColorAt(n, C1.setScalar(c)); n++; }
      for (const m of [this.mMinesRoc, this.mMinesOr]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
      // bancs de poissons : ronds qui s'élargissent et poissons qui sautent
      const pr = this.meshGeo('anneauFin', GEO.anneauFin, MAT_ANNEAU, false);
      for (const r of B.res) {
        if (!r.eau || r.qte <= 0) continue; const f = this.brouillardEn(r.x, r.z); if (!f) continue;
        for (let k = 0; k < 2; k++) { const ph = (t * 0.35 + r.id * 0.17 + k * 0.5) % 1; ob.position.set(r.x, 0.06, r.z); ob.rotation.set(0, 0, 0); ob.scale.setScalar(0.6 + ph * 2.6); ob.updateMatrix(); this.ajouterInst(pr, ob.matrix, C1.setScalar((1 - ph) * (f === 2 ? 0.55 : 0.25))); }
        if (f === 2 && Math.random() < (this.dt || 16) / 1000 * 0.5) for (let k = 0; k < 8; k++) this.particules.emettre(r.x + (Math.random() - 0.5) * 2, 0.1, r.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.2, 1.5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2, 0.7, 0.7, 0.9, 0.95, 1, 5);
      }
      // bêtes : vivantes (repos, marche) ou abattues (couchées sur le flanc)
      if (!this.unitesPretes) return;
      for (const r of B.res) {
        if (!r.animal || r.qte <= 0) continue; const f = this.brouillardEn(r.x, r.z); if (!f) continue;
        const p = this.meshFoule(r.sous); if (!p) continue;
        ob.position.set(r.x, this.sol(r.x, r.z), r.z); ob.rotation.set(0, r.dir, r.vivant ? 0 : Math.PI / 2, 'YXZ'); if (!r.vivant) ob.position.y += 0.15;
        ob.scale.setScalar(r.vivant ? 1 : 0.7 + 0.3 * r.qte / r.qteMax); ob.updateMatrix();
        this.ajouterInst(p, ob.matrix, C1.setScalar(f === 2 ? 1 : 0.5), (m, i) => this.clip(m, i, 0, 0, r.marche ? 1.4 : 1, (r.id * 0.37) % 1, !r.vivant));
      }
      void t;
    }
    majBatiments() {
      const B = this.B, ob = new THREE.Object3D(), t = B.temps, cam = this.cam, rnd = Math.random, dts = (this.dt || 16) / 1000;
      const coul = new THREE.Color(), v = new THREE.Vector3(), q = new THREE.Quaternion(), un = new THREE.Vector3(1, 1, 1);
      const mur = (j, cx, cz) => { const g = B.parId.get(B.occ[cz * B.n + cx]); return !!g && (g.cle === 'mur' || g.cle === 'porte' || g.cle === 'tour') && g.j === j && !g.mort; };
      for (const b of B.bats) {
        const f = this.brouillardEn(b.x, b.z); if (b.j !== this.ji && !BT.ennemis(B, this.ji, b.j) ? false : (b.j !== this.ji && !f)) continue;
        const e = this.geoBat(b), p = this.meshGeo('b:' + e.nom, e.geo, e.ferme ? this.matChamp() : this.matBat()); if (!p) continue;
        const yaw = b.cle === 'mur' || b.cle === 'porte' ? (b.dir || 0) : b.cle === 'port' ? this.dirPort(b) : 0;
        let y = b.cle === 'port' ? 0.5 : this.sol(b.x, b.z) - (e.ferme ? 0.02 : 0.25), sy = 1, rx = 0, rz = 0;
        if (!b.fini) sy = 0.12 + 0.88 * b.prog;
        if (b.mort) { const k = Math.min(1, (t - b.mort) / 3.5); y -= k * e.h * 0.9; rx = Math.sin(b.id) * 0.12 * k; rz = Math.cos(b.id) * 0.12 * k; }
        const k = e.k, fx = e.ferme ? R.BATIMENTS.ferme.taille / 8 : k, fz = e.ferme ? R.BATIMENTS.ferme.taille / 5 : k;
        ob.position.set(b.x, y, b.z); ob.rotation.set(rx, yaw, rz, 'YXZ'); ob.scale.set(fx, (e.ferme ? 1 : k) * sy, fz); ob.updateMatrix();
        const vu = f === 2 || b.j === this.ji, lum = (vu ? 1 : 0.5) * (b.fini ? 1 : 0.9);
        coul.setScalar(lum); if (!b.fini) coul.setRGB(lum * 1.05, lum * 0.98, lum * 0.88);
        this.ajouterInst(p, ob.matrix, coul);
        const proche = Math.hypot(b.x - cam.x, b.z - cam.z) < cam.d * 1.3 + 30;
        // bannières et boucliers aux couleurs du joueur
        if (e.geoEq && b.fini && !b.mort) { const pe = this.meshGeo('eq:' + e.nom, e.geoEq, this.matEquipe()); this.ajouterInst(pe, ob.matrix, coul.set(B.joueurs[b.j].couleur).multiplyScalar(vu ? 1 : 0.5)); }
        // piliers aux bouts et aux angles des murs
        if (b.cle === 'mur' && !b.mort) {
          const cx = Math.floor(b.x / BT.CEL), cz = Math.floor(b.z / BT.CEL), vs = []; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && mur(b.j, cx + dx, cz + dz)) vs.push([dx, dz]);
          const droit = vs.length === 2 && vs[0][0] === -vs[1][0] && vs[0][1] === -vs[1][1];
          if (!droit || b.id % 6 === 0) { const gp = this.geoPilier(e.sk, this.style(B.joueurs[b.j])), pp = this.meshGeo('b:' + gp.nom, gp.geo, this.matBat()); ob.position.set(b.x, this.sol(b.x, b.z) - 0.25, b.z); ob.rotation.set(0, yaw, 0); ob.scale.set(k, k * sy, k); ob.updateMatrix(); this.ajouterInst(pp, ob.matrix, coul.setScalar(lum)); }
        }
        // chantier : fondation et échafaudage
        if (!b.fini && !b.mort && !e.ferme) {
          const pf = this.meshGeo('fondation', GEO.fondation, this.mat({ color: 0x8a6a48, roughness: 0.95 })); ob.position.set(b.x, this.sol(b.x, b.z) - 0.05, b.z); ob.rotation.set(0, 0, 0); ob.scale.set(b.demiE * 2, 1, b.demiE * 2); ob.updateMatrix(); this.ajouterInst(pf, ob.matrix, coul.setScalar(lum));
          if (b.cle !== 'mur' && b.taille >= 6) { const ge = this.geoEchafaudage(b.demiE * 2, Math.max(3, e.h * 0.85)), pe = this.meshGeo('echaf:' + Math.round(b.demiE * 2) + ':' + Math.round(Math.max(3, e.h * 0.85)), ge, this.mat({ color: 0x9a7a52, roughness: 0.9 })); ob.position.set(b.x, this.sol(b.x, b.z) - 0.1, b.z); ob.updateMatrix(); this.ajouterInst(pe, ob.matrix, coul.setScalar(lum)); }
          if (proche && vu && rnd() < dts * 2) this.particules.emettre(b.x + (rnd() - 0.5) * b.demiE * 2, this.sol(b.x, b.z) + 0.3, b.z + (rnd() - 0.5) * b.demiE * 2, 0, 0.6, 0, 1.4, 2, 0.6, 0.55, 0.45, -0.1);
        }
        if (!b.fini || b.mort || !vu) continue;
        // drapeau des bâtiments sans bannière propre
        if (!e.geoEq && b.cle !== 'ferme' && b.cle !== 'maison' && b.cle !== 'mur') {
          const pd = this.meshGeo('drapeau', this.M.drapeau, this.mat({ vertexColors: true, roughness: 0.8 })), dx = b.demiE * 0.85, dz = b.demiE * 0.85;
          ob.position.set(b.x + dx, this.sol(b.x + dx, b.z + dz) - 0.2, b.z + dz); ob.rotation.set(0, Math.sin(this.temps / 900 + b.id) * 0.3, 0); ob.scale.setScalar(b.taille >= 12 ? 0.55 : 0.4); ob.updateMatrix();
          this.ajouterInst(pd, ob.matrix, coul.set(B.joueurs[b.j].couleur));
        }
        // tonneaux, caisses et jarres autour des bâtiments du travail
        const acc = ACCESSOIRES[b.cle]; if (acc && proche && this.glb) acc.forEach(([nom, ax, az, tl], i) => { const pg = this.partiesGLB(nom, tl); if (!pg) return; const r = b.demiE + 0.6, x = b.x + ax * r, z = b.z + az * r; ob.position.set(x, this.sol(x, z) - 0.05, z); ob.rotation.set(0, b.id + i, 0); ob.scale.setScalar(1); ob.updateMatrix(); this.poserGLB('acc:' + nom, pg.parts, ob.matrix, coul.setScalar(1)); });
        if (!proche) continue;
        // braseros allumés, fumée des cheminées, feu et fumée quand le bâtiment est abîmé
        q.setFromEuler(new THREE.Euler(0, yaw, 0));
        for (const fp of e.feux || []) { if (rnd() > dts * 14) continue; v.set(fp[0] * k, fp[1] * k, fp[2] * k).applyQuaternion(q); this.feux.emettre(b.x + v.x + (rnd() - 0.5) * 0.15, y + v.y, b.z + v.z + (rnd() - 0.5) * 0.15, (rnd() - 0.5) * 0.3, 1.2 + rnd() * 0.8, (rnd() - 0.5) * 0.3, 0.45, 0.55, 1, 0.55, 0.18, -0.6); }
        if (b.cle === 'maison' && b.id % 3 === 0 && rnd() < dts * 1.4) this.particules.emettre(b.x + 0.6 * k, y + e.h * 0.95, b.z - 0.6 * k, 0.2, 0.9, 0.05, 3.2, 1.8, 0.72, 0.72, 0.74, -0.05);
        const abime = 1 - b.pv / b.pvMax;
        if (abime > 0.4 && rnd() < dts * (abime * 10)) { const x = b.x + (rnd() - 0.5) * b.demiE * 1.4, z = b.z + (rnd() - 0.5) * b.demiE * 1.4, yy = y + e.h * (0.5 + rnd() * 0.45); this.particules.emettre(x, yy, z, 0.3, 1.4, 0.1, 3.5, 3.2, 0.22, 0.2, 0.19, -0.08); if (abime > 0.6) this.feux.emettre(x, yy, z, 0, 1.6, 0, 0.6, 1.6, 1, 0.45, 0.12, -0.8); }
      }
      // gravats des bâtiments détruits (restent 40 secondes)
      const pg = this.meshGeo('gravats', this.geoGravats || (this.geoGravats = O.fusion(GRAVATS)), this.matBat());
      this.gravats = (this.gravats || []).filter(g => t - g.t0 < 45);
      for (const g of this.gravats) { const enf = Math.max(0, t - g.t0 - 38) * 0.15; ob.position.set(g.x, this.sol(g.x, g.z) - 0.1 - enf, g.z); ob.rotation.set(0, g.x, 0); ob.scale.set(g.taille * 1.1, Math.min(2.5, g.taille * 0.3), g.taille * 1.1); ob.updateMatrix(); this.ajouterInst(pg, ob.matrix, coul.setScalar(this.brouillardEn(g.x, g.z) === 2 ? 0.85 : 0.4)); }
      // point de ralliement du bâtiment choisi
      if (this.ralliement) { const r = this.ralliement, pd = this.meshGeo('drapeau', this.M.drapeau, this.mat({ vertexColors: true, roughness: 0.8 })); ob.position.set(r.x, Math.max(0, this.sol(r.x, r.z)), r.z); ob.rotation.set(0, 0, 0); ob.scale.setScalar(0.32); ob.updateMatrix(); this.ajouterInst(pd, ob.matrix, coul.set(B.joueurs[this.ji].couleur)); }
      // fantôme du bâtiment à poser, ou du mur à tracer
      const F = this.fantome;
      if (F) {
        const e = this.geoBat({ cle: F.cle, j: this.ji, id: 0 });
        if (!this.mFantome || this.mFantome.userData.nom !== e.nom) { if (this.mFantome) this.rts.remove(this.mFantome); this.mFantome = new THREE.Mesh(e.geo, new THREE.MeshStandardMaterial({ color: 0x66ff88, transparent: true, opacity: 0.5, depthWrite: false, emissive: 0x113311 })); this.mFantome.userData.nom = e.nom; this.rts.add(this.mFantome); }
        const m = this.mFantome; m.visible = true; m.material.color.set(F.ok ? 0x66ff88 : 0xff5544); m.material.emissive.set(F.ok ? 0x113311 : 0x331111);
        m.position.set(F.x, F.cle === 'port' ? 0.5 : this.sol(F.x, F.z) - (e.ferme ? 0 : 0.2), F.z); m.rotation.set(0, F.cle === 'port' ? this.dirPort({ id: -Math.round(F.x * 1000 + F.z), x: F.x, z: F.z }) : F.dir || 0, 0);
        if (e.ferme) m.scale.set(R.BATIMENTS.ferme.taille / 8, 1, R.BATIMENTS.ferme.taille / 5); else m.scale.setScalar(e.k);
      } else if (this.mFantome) this.mFantome.visible = false;
      if (this.fantomeMur && this.fantomeMur.length) {
        const e = this.geoBat({ cle: 'mur', j: this.ji, id: 0 }), pf = this.meshGeo('fantomeMur', e.geo, MAT_FANTOME, false), dir = this.fantomeMur.dir || 0;
        for (const c of this.fantomeMur) { ob.position.set(c.x, this.sol(c.x, c.z) - 0.2, c.z); ob.rotation.set(0, dir, 0); ob.scale.setScalar(e.k); ob.updateMatrix(); this.ajouterInst(pf, ob.matrix, coul.set(c.ok === true ? 0x66ff88 : c.ok === 'deja' ? 0x88aaff : 0xff5544)); }
      }
    }
    matEquipe() { return this.mats.equipe || (this.mats.equipe = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide })); }
    matChamp() { return this.matBat(); }
    majUnites() {
      const B = this.B, ob = new THREE.Object3D(), coul = new THREE.Color(); if (!this.unitesPretes) return;
      const anneaux = [];
      for (const u of B.unites) {
        if (u.dans) continue;
        const ennemi = u.j !== this.ji && BT.ennemis(B, this.ji, u.j);
        if (ennemi && this.brouillardEn(u.x, u.z) !== 2 && !u.mort) continue;
        if (u.mort && ennemi && this.brouillardEn(u.x, u.z) === 0) continue;
        if (u.s.naval) { this.dessinerBateau(u, ennemi, ob, coul, anneaux); continue; }
        const nom = this.modele(u); let p = this.meshFoule(nom); if (!p) p = this.meshFoule(this.modele({ j: u.j, cle: 'inf', id: 0 })); if (!p) continue;
        const s = this.echelleUnite(u, nom); let y = this.sol(u.x, u.z), chute = 0;
        if (u.mort) { const k = Math.min(1, (B.temps - u.mort) / 0.6); chute = k * Math.PI / 2 * 0.95; if (B.temps - u.mort > 3) y -= (B.temps - u.mort - 3) * 0.5; }
        ob.position.set(u.x, y, u.z); ob.rotation.set(chute, u.dir, 0, 'YXZ'); ob.scale.setScalar(s); ob.updateMatrix();
        coul.set(B.joueurs[u.j].couleur); if (u.gele > B.temps) coul.lerp(C2.setRGB(0.6, 0.85, 1), 0.6);
        const ph = (u.id * 0.618) % 1, a = u.anim;
        this.ajouterInst(p, ob.matrix, coul, (m, i) => {
          if (u.mort) this.clip(m, i, 0, 0, 1, ph, true);
          else if (a === 'marche') this.clip(m, i, 'Walk_Loop', 1, (u.s.vitesse / 3.6) * (u.cle === 'cav' || nom.startsWith('k_') ? 0.9 : 1), ph);
          else if (a === 'attaque') this.clip(m, i, 2, 2, 1, ph);
          else if (a === 'travail') this.clip(m, i, 2, 2, 1, ph);
          else if (a === 'cultive') this.clip(m, i, 3, 3, 1, ph);
          else this.clip(m, i, (ph > 0.7 && m.userData.foule.meta.clips[3] && u.cle !== 'villageois') ? 3 : 0, 0, 1, ph);
        });
        if (!u.mort && (this.sel.has(u.id) || this.survol === u.id)) anneaux.push([u.x, u.z, u.s.rayon * 1.6 + 0.3, ennemi ? 0xff4433 : u.j === this.ji ? 0x7dff8a : 0x6fb6ff, this.survol === u.id && !this.sel.has(u.id) ? 0.5 : 1]);
      }
      for (const b of B.bats) if (!b.mort && (this.sel.has(b.id) || this.survol === b.id)) anneaux.push([b.x, b.z, -b.demiE, BT.ennemis(B, this.ji, b.j) ? 0xff4433 : b.j === this.ji ? 0x7dff8a : 0x6fb6ff, this.sel.has(b.id) ? 1 : 0.5]);
      for (const r of B.res) if (r.qte > 0 && (this.sel.has(r.id) || this.survol === r.id)) anneaux.push([r.x, r.z, r.demiE ? -r.demiE : r.rayon + 0.6, 0xffe27a, this.sel.has(r.id) ? 1 : 0.5]);
      // lueurs des pouvoirs en cours
      for (const f of B.effets) { if (f.type === 'lueur') anneaux.push([f.x, f.z, f.rayon * (0.92 + 0.08 * Math.sin(this.temps / 160)), f.bleu ? 0x66c8ff : 0xffe08a, 0.9]); else if (f.type === 'zone') anneaux.push([f.x, f.z, f.d.rayon, f.j === this.ji ? 0xffb050 : 0xff5040, 0.6]); }
      // visée d'un pouvoir, marques des ordres (anneau qui se resserre)
      if (this.cercleVise) anneaux.push([this.cercleVise.x, this.cercleVise.z, this.cercleVise.r, 0xffd27a, 0.85]);
      const tm = this.temps; this.marques = (this.marques || []).filter(m => tm - m.t0 < 600);
      for (const m of this.marques) { const k = (tm - m.t0) / 600; anneaux.push([m.x, m.z, 1.6 * (1 - k) + 0.3, m.attaque ? 0xff5040 : 0x7dff8a, 1 - k]); }
      const pr = this.meshGeo('anneau', GEO.anneau, MAT_ANNEAU, false), pf = this.meshGeo('anneauFin', GEO.anneauFin, MAT_ANNEAU, false), pc = this.meshGeo('carre', GEO.carre, MAT_ANNEAU, false);
      for (const [x, z, r, c, al] of anneaux) { ob.position.set(x, Math.max(0, this.sol(x, z)) + 0.12, z); ob.rotation.set(0, 0, 0); ob.scale.set(Math.abs(r), 1, Math.abs(r)); ob.updateMatrix(); this.ajouterInst(r < 0 ? pc : r > 5 ? pf : pr, ob.matrix, coul.set(c).multiplyScalar(al)); }
    }
    // bateaux : modèle de l'époque posé sur l'eau, qui tangue, coque teintée et pavillon du joueur, sillage
    dessinerBateau(u, ennemi, ob, coul, anneaux) {
      const B = this.B, ep = B.epoque, t = this.temps / 1000, grand = u.cle === 'navire';
      const tr = u.cle === 'transport', recent = ep === 'moderne' || ep === 'futur';
      const nom = grand ? (O.NAVIRES[ep] || O.NAVIRES.antique)[0] : tr ? (recent ? 'navire-vedette' : ep === 'industriel' ? 'navire-galion' : 'navire') : recent ? 'navire-vedette' : 'navire-barque';
      const pg = this.partiesGLB(nom, grand ? 11 : tr ? 8 : 4.6, true) || this.partiesGLB('navire-barque', tr ? 7 : 4.6, true); if (!pg) return;
      let y = Math.sin(t * 1.3 + u.id) * 0.08, chute = 0; const roulis = Math.sin(t * 0.9 + u.id * 2) * 0.04;
      if (u.mort) { const k = Math.min(1, (B.temps - u.mort) / 4); y -= k * 3.5; chute = k * 0.5; }
      ob.position.set(u.x, y, u.z); ob.rotation.set(chute, u.dir, roulis, 'YXZ'); ob.scale.setScalar(1); ob.updateMatrix();
      coul.set(B.joueurs[u.j].couleur).lerp(C2.setRGB(1, 1, 1), 0.65);
      this.poserGLB('nav:' + nom, pg.parts, ob.matrix, coul);
      const pd = this.meshGeo('drapeau', this.M.drapeau, this.mat({ vertexColors: true, roughness: 0.8 }));
      ob.position.set(u.x, y + pg.hauteur * 0.6, u.z); ob.rotation.set(0, u.dir + Math.PI / 2, 0); ob.scale.setScalar(grand ? 0.42 : 0.22); ob.updateMatrix(); this.ajouterInst(pd, ob.matrix, coul.set(B.joueurs[u.j].couleur));
      if (u.anim === 'marche' && !u.mort && Math.random() < 0.6) { const d = grand ? 5 : 2, bx = u.x - Math.sin(u.dir) * d, bz = u.z - Math.cos(u.dir) * d; this.particules.emettre(bx + (Math.random() - 0.5), 0.1, bz + (Math.random() - 0.5), (Math.random() - 0.5) * 0.6, 0.15, (Math.random() - 0.5) * 0.6, 1.6, 1.6, 0.92, 0.95, 0.97, 0); }
      if (!u.mort && (this.sel.has(u.id) || this.survol === u.id)) anneaux.push([u.x, u.z, u.s.rayon * 1.5 + 0.4, ennemi ? 0xff4433 : u.j === this.ji ? 0x7dff8a : 0x6fb6ff, this.survol === u.id && !this.sel.has(u.id) ? 0.5 : 1]);
    }
    majProjectiles() {
      const B = this.B, ob = new THREE.Object3D(), coul = new THREE.Color(), q = new THREE.Vector3();
      for (const p of B.proj) {
        if (p.j !== this.ji && this.brouillardEn(p.x, p.z) === 0) continue;
        const k = Math.min(1, p.t / p.duree), k2 = Math.min(1, (p.t + 0.03) / p.duree);
        const pos = (kk) => { const x = p.x0 + (p.x - p.x0) * kk, z = p.z0 + (p.z - p.z0) * kk, y = p.y0 + (this.sol(p.x, p.z) + 1.1 - p.y0) * kk + p.arc * 4 * kk * (1 - kk); return [x, y, z]; };
        const [x, y, z] = pos(k), [x2, y2, z2] = pos(k2);
        ob.position.set(x, y, z); q.set(x2, y2, z2); ob.lookAt(q); ob.scale.setScalar(1); ob.updateMatrix();
        const T = p.type, cle = T === 'fleche' ? 'fleche' : T === 'pierre' || T === 'boulet' ? 'pierre' : T === 'obus' ? 'obus' : T === 'laser' || T === 'plasma' ? 'laser' : 'balle';
        const pp = this.meshGeo('p:' + cle, GEO[cle], cle === 'laser' ? MAT_LASER : cle === 'balle' ? MAT_BALLE : this.mat({ color: cle === 'fleche' ? 0x5a4630 : 0x6a645c, roughness: 0.7 }), cle === 'pierre');
        this.ajouterInst(pp, ob.matrix, cle === 'laser' ? coul.set(B.joueurs[p.j].couleur).lerp(C2.setRGB(1, 1, 1), 0.4) : coul.setScalar(1));
        if ((cle === 'pierre' || cle === 'obus') && Math.random() < 0.5) this.particules.emettre(x, y, z, 0, 0.3, 0, 0.6, 0.7, 0.55, 0.5, 0.45, 0);
        if (cle === 'laser' || T === 'plasma') this.feux.emettre(x, y, z, 0, 0, 0, 0.15, 0.6, 0.5, 0.9, 1, 0);
      }
    }
    // ---------- événements : impacts, morts, ruines, apparitions, constructions ----------
    lireEvenements() {
      const B = this.B, E = B.evtsVue || []; B.evtsVue = [];
      const P = this.particules, F = this.feux, rnd = Math.random;
      for (const e of E) {
        if (e.x != null && this.brouillardEn(e.x, e.z) === 0 && e.type !== 'pouvoir') continue;
        const y0 = e.x != null ? this.sol(e.x, e.z) : 0;
        if (e.type === 'impact') {
          if (e.sorte === 'eclair') { this.eclair(e.x, e.z); for (let k = 0; k < 26; k++) F.emettre(e.x, y0 + 0.5, e.z, (rnd() - 0.5) * 8, rnd() * 6, (rnd() - 0.5) * 8, 0.5, 1.2, 0.8, 0.9, 1, 6); for (let k = 0; k < 10; k++) P.emettre(e.x, y0 + 0.4, e.z, (rnd() - 0.5) * 3, rnd() * 2, (rnd() - 0.5) * 3, 1.6, 3, 0.45, 0.42, 0.4, -0.3); }
          else if (e.sorte === 'meteore') { this.meteores = this.meteores || []; this.meteores.push({ x: e.x, z: e.z, t: 0 }); }
          else if (e.sorte === 'zone') { const c = COULEUR_POUVOIR[e.pouvoir] || [1, 0.7, 0.3]; for (let k = 0; k < 22; k++) F.emettre(e.x + (rnd() - 0.5) * 2, y0 + 0.3, e.z + (rnd() - 0.5) * 2, (rnd() - 0.5) * 4, 1 + rnd() * 4, (rnd() - 0.5) * 4, 0.9, 1.4, c[0], c[1], c[2], 2); for (let k = 0; k < 12; k++) P.emettre(e.x, y0 + 0.3, e.z, (rnd() - 0.5) * 4, rnd() * 2.5, (rnd() - 0.5) * 4, 1.8, 3.5, 0.5, 0.45, 0.4, -0.2); }
          else { const gros = e.sorte === 'obus' || e.sorte === 'plasma'; for (let k = 0; k < (gros ? 30 : 16); k++) P.emettre(e.x, y0 + 0.3, e.z, (rnd() - 0.5) * 5, rnd() * 4, (rnd() - 0.5) * 5, 1.4 + rnd(), gros ? 4 : 2.6, 0.55, 0.48, 0.4, -0.4); for (let k = 0; k < (gros ? 18 : 6); k++) F.emettre(e.x, y0 + 0.4, e.z, (rnd() - 0.5) * 7, rnd() * 5, (rnd() - 0.5) * 7, 0.4, 1, 1, 0.6, 0.25, 6); }
        } else if (e.type === 'ruine') { (this.gravats = this.gravats || []).push({ x: e.x, z: e.z, taille: e.taille, t0: B.temps }); for (let k = 0; k < 70; k++) P.emettre(e.x + (rnd() - 0.5) * e.taille, y0 + rnd() * 3, e.z + (rnd() - 0.5) * e.taille, (rnd() - 0.5) * 3, 0.5 + rnd() * 2.5, (rnd() - 0.5) * 3, 2.5 + rnd() * 2, 5 + rnd() * 4, 0.5, 0.46, 0.42, -0.1); for (let k = 0; k < 30; k++) F.emettre(e.x + (rnd() - 0.5) * e.taille, y0 + rnd() * 4, e.z + (rnd() - 0.5) * e.taille, 0, 1 + rnd() * 2, 0, 1 + rnd(), 2.2, 1, 0.5, 0.15, -0.5); }
        else if (e.type === 'mort') { for (let k = 0; k < 6; k++) P.emettre(e.x, y0 + 0.2, e.z, (rnd() - 0.5) * 1.5, rnd(), (rnd() - 0.5) * 1.5, 0.9, 1.6, 0.55, 0.5, 0.42, -0.3); }
        else if (e.type === 'apparition') { for (let k = 0; k < 40; k++) { const a = rnd() * 6.28, r = rnd() * 2.5; F.emettre(e.x + Math.cos(a) * r, y0 + rnd() * 0.5, e.z + Math.sin(a) * r, 0, 2 + rnd() * 4, 0, 1.2, 1.3, 0.7, 0.85, 1, 0); } }
        else if (e.type === 'construit' && e.cle !== 'ferme') { for (let k = 0; k < 14; k++) { const a = rnd() * 6.28; P.emettre(e.x + Math.cos(a) * 4, y0 + 0.2, e.z + Math.sin(a) * 4, Math.cos(a) * 1.2, 0.5 + rnd() * 0.6, Math.sin(a) * 1.2, 0.9, 2, 0.55, 0.5, 0.42, -0.2); } }
        else if (e.type === 'tir' && (e.sorte === 'balle' || e.sorte === 'laser' || e.sorte === 'obus' || e.sorte === 'boulet')) { F.emettre(e.x, y0 + 1.4, e.z, 0, 0.5, 0, 0.12, e.sorte === 'balle' ? 0.9 : 1.6, 1, 0.8, 0.4, 0); if (e.sorte !== 'laser') P.emettre(e.x, y0 + 1.4, e.z, 0, 0.6, 0, 1, 1.4, 0.75, 0.75, 0.75, -0.2); }
      }
    }
    eclair(x, z) {
      const y = this.sol(x, z), pts = [], rr = Math.random; let px = x + (rr() - 0.5) * 6, pz = z + (rr() - 0.5) * 6;
      for (let k = 0; k <= 12; k++) { const t = k / 12, h = 60 * (1 - t) + y; pts.push(new THREE.Vector3(px + (rr() - 0.5) * 2.4 * (1 - t), h, pz + (rr() - 0.5) * 2.4 * (1 - t))); px += (x - px) * 0.3; pz += (z - pz) * 0.3; }
      pts[pts.length - 1].set(x, y, z);
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.18, 5, false), m = new THREE.Mesh(g, MAT_ECLAIR); this.rts.add(m);
      const l = new THREE.PointLight(0xbfd8ff, 900, 60, 2); l.position.set(x, y + 6, z); this.rts.add(l);
      this.eclairs.push({ m, l, t: 0 });
    }
    majEffets(dt) {
      const s = dt / 1000;
      for (const e of this.eclairs) { e.t += s; e.m.visible = e.t < 0.08 || (e.t > 0.13 && e.t < 0.24); e.l.intensity = Math.max(0, 900 * (1 - e.t / 0.3)); }
      for (const e of this.eclairs.filter(e => e.t > 0.32)) { this.rts.remove(e.m); this.rts.remove(e.l); e.m.geometry.dispose(); }
      this.eclairs = this.eclairs.filter(e => e.t <= 0.32);
      // météores : boule de feu qui tombe en biais, puis explosion
      const F = this.feux, P = this.particules, rnd = Math.random;
      for (const m of this.meteores || []) {
        m.t += s; const k = Math.min(1, m.t / 0.45), y0 = this.sol(m.x, m.z), x = m.x + 26 * (1 - k), z = m.z - 14 * (1 - k), y = y0 + 55 * (1 - k);
        for (let i = 0; i < 6; i++) F.emettre(x + (rnd() - 0.5), y + (rnd() - 0.5), z + (rnd() - 0.5), 0, 0, 0, 0.5, 3.2, 1, 0.45 + rnd() * 0.3, 0.1, 0);
        if (k >= 1 && !m.fini) { m.fini = true; for (let i = 0; i < 60; i++) F.emettre(m.x, y0 + 0.5, m.z, (rnd() - 0.5) * 14, rnd() * 10, (rnd() - 0.5) * 14, 0.8, 2, 1, 0.5, 0.15, 8); for (let i = 0; i < 40; i++) P.emettre(m.x, y0 + 0.5, m.z, (rnd() - 0.5) * 6, rnd() * 4, (rnd() - 0.5) * 6, 2.5, 5, 0.32, 0.28, 0.25, -0.15); }
      }
      this.meteores = (this.meteores || []).filter(m => !m.fini);
    }
    marqueOrdre(x, z, attaque) { (this.marques = this.marques || []).push({ x, z, attaque, t0: this.temps }); }
    // ---------- ce qui est sous la souris ----------
    entiteA(sx, sy) {
      const B = this.B; let best = null, bd = 1e9;
      for (const u of B.unites) {
        if (u.mort || u.dans) continue; if (u.j !== this.ji && BT.ennemis(B, this.ji, u.j) && this.brouillardEn(u.x, u.z) !== 2) continue;
        const hh = (u.s.cat === 'mythe' ? 2.4 : u.cle === 'cav' ? 1.6 : 1) * ECHELLE_HUMAINS, e = this.versEcran(u.x, u.z, hh); if (!e.devant) continue;
        const r = (16 + u.s.rayon * 10) * Math.min(1.6, 70 / this.cam.d), d = Math.hypot(e.x - sx, e.y - sy); if (d < r && d < bd) { bd = d; best = u; }
      }
      for (const r of B.res) if (r.animal && r.qte > 0 && this.brouillardEn(r.x, r.z)) { const e = this.versEcran(r.x, r.z, 0.6), d = Math.hypot(e.x - sx, e.y - sy); if (d < 14 && d < bd) { bd = d; best = r; } }
      if (best) return best;
      const p = this.pointSol(sx, sy); if (!p) return null;
      for (const b of B.bats) if (!b.mort && Math.abs(p.x - b.x) <= b.demiE + 0.6 && Math.abs(p.z - b.z) <= b.demiE + 0.6 && (b.j === this.ji || this.brouillardEn(b.x, b.z))) return b;
      let rb = null, rd = 1e9;
      for (const r of B.res) { if (r.qte <= 0 || r.animal) continue; const d = Math.hypot(r.x - p.x, r.z - p.z), lim = r.sous === 'mine' ? 3.4 : r.sous === 'arbre' ? 1.6 : 1.4; if (d < lim && d < rd && this.brouillardEn(r.x, r.z)) { rd = d; rb = r; } }
      return rb;
    }
    unitesDans(x0, y0, x1, y1) {
      const B = this.B, l = [], a = Math.min(x0, x1), b = Math.max(x0, x1), c = Math.min(y0, y1), d = Math.max(y0, y1);
      for (const u of B.unites) { if (u.mort || u.dans || u.j !== this.ji) continue; const e = this.versEcran(u.x, u.z, 0.9); if (e.devant && e.x >= a && e.x <= b && e.y >= c && e.y <= d) l.push(u); }
      return l;
    }
    surEcran(u) { const e = this.versEcran(u.x, u.z, 1), w = this.cv.clientWidth, h = this.cv.clientHeight; return e.devant && e.x > 0 && e.y > 0 && e.x < w && e.y < h; }
    versEcran(x, z, h) { const v = new THREE.Vector3(x, (h || 0) + Math.max(0, this.sol(x, z)), z).project(this.camera), w = this.cv.clientWidth, H = this.cv.clientHeight; return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * H, devant: v.z < 1 }; }

    // ---------- barres de vie, chantiers, files de formation (2D par-dessus) ----------
    etiquettes(dpr) {
      const ctx = this.ctx, B = this.B, w = this.cv.clientWidth, h = this.cv.clientHeight;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const barre = (x, y, lw, k, c) => { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - lw / 2 - 1, y - 1, lw + 2, 5); ctx.fillStyle = c; ctx.fillRect(x - lw / 2, y, lw * Math.max(0, Math.min(1, k)), 3); };
      const coulPv = k => k > 0.6 ? '#5fe36b' : k > 0.3 ? '#f2c94c' : '#f0533e';
      const z = Math.min(1.5, 80 / this.cam.d);
      for (const u of B.unites) {
        if (u.mort || u.dans) continue; const montre = this.sel.has(u.id) || this.survol === u.id || (u.touche && B.temps - u.touche < 2.5 && u.pv < u.pvMax);
        if (!montre) continue; if (u.j !== this.ji && BT.ennemis(B, this.ji, u.j) && this.brouillardEn(u.x, u.z) !== 2) continue;
        const hh = (u.s.cat === 'mythe' ? HAUTEUR_CREATURE(u.s.pop) : (u.cle === 'cav' ? 2.6 : 2.1) * ECHELLE_HUMAINS) + 0.3, e = this.versEcran(u.x, u.z, hh); if (!e.devant) continue;
        const k = u.pv / u.pvMax; barre(e.x, e.y, Math.max(16, 26 * z * (0.6 + u.s.rayon)), k, coulPv(k));
        if (u.s.capacite && u.j === this.ji) { const n = BT.contenu(B, u).length; if (n) { ctx.font = '600 12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(`👥 ${n}`, e.x, e.y - 6); } }
        if (u.porte && u.porte.n > 0.5 && this.sel.has(u.id)) { ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(PM.ICONES[u.porte.t] || '', e.x, e.y - 7); }
      }
      for (const b of B.bats) {
        if (b.mort) continue; const vu = b.j === this.ji || this.brouillardEn(b.x, b.z); if (!vu) continue;
        const sel = this.sel.has(b.id) || this.survol === b.id, chantier = !b.fini && b.j === this.ji, abime = b.touche && B.temps - b.touche < 4, gar = b.j === this.ji && b.d.garnison ? BT.contenu(B, b).length : 0;
        if (gar) { const eg = this.versEcran(b.x, b.z, this.geoBat(b).h + 0.6); if (eg.devant) { ctx.font = '600 12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(eg.x - 20, eg.y - 13, 40, 17); ctx.fillStyle = '#ffe9a8'; ctx.fillText(`🛡️ ${gar}`, eg.x, eg.y); } }
        if (!sel && !chantier && !abime && !(b.file.length && b.j === this.ji)) continue;
        const e = this.versEcran(b.x, b.z, this.geoBat(b).h + 1.5); if (!e.devant) continue;
        const lw = Math.max(30, b.taille * 5 * z);
        if (sel || abime) barre(e.x, e.y, lw, b.pv / b.pvMax, coulPv(b.pv / b.pvMax));
        if (chantier) barre(e.x, e.y + 7, lw, b.prog, '#f2c14a');
        if (b.file.length && b.j === this.ji) { const f = b.file[0], s = BT.stats(B, b.j, f.cle); barre(e.x, e.y + (sel ? 7 : 0), lw * 0.8, f.t / s.temps, b.attentePop ? '#f0533e' : '#7fc6ff'); ctx.font = '600 12px -apple-system,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = 3; ctx.fillText(R.emojiUnite(B.joueurs[b.j].pantheon, f.cle) + (b.file.length > 1 ? ' ×' + b.file.length : ''), e.x, e.y - 8); ctx.shadowBlur = 0; }
      }
      for (const r of B.res) { if (r.qte <= 0 || !(this.sel.has(r.id) || this.survol === r.id)) continue; const e = this.versEcran(r.x, r.z, r.sous === 'mine' ? 3.6 : 2.4); if (e.devant) barre(e.x, e.y, 30, r.qte / r.qteMax, '#f2d27a'); }
    }
  }

  // ---------- géométries et matières partagées ----------
  const M4 = new THREE.Matrix4(), C1 = new THREE.Color(), C2 = new THREE.Color();
  function fusionner(geos) {
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g); let n = 0; for (const g of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const g of parts) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.computeBoundingSphere(); return g;
  }
  const GEO = {
    anneau: new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2), anneauFin: new THREE.RingGeometry(0.975, 1, 96).rotateX(-Math.PI / 2),
    carre: fusionner([[0, 1], [0, -1], [1, 0], [-1, 0]].map(([x, z]) => new THREE.BoxGeometry(x ? 0.1 : 2.1, 0.02, x ? 2.1 : 0.1).translate(x, 0, z))),
    fondation: new THREE.BoxGeometry(1, 0.12, 1).translate(0, 0.06, 0),
    fleche: fusionner([new THREE.CylinderGeometry(0.025, 0.025, 0.9, 4).rotateX(Math.PI / 2), new THREE.ConeGeometry(0.05, 0.14, 4).rotateX(Math.PI / 2).translate(0, 0, 0.5)]),
    pierre: new THREE.IcosahedronGeometry(0.32, 0), obus: new THREE.CylinderGeometry(0.12, 0.12, 0.5, 6).rotateX(Math.PI / 2),
    balle: new THREE.BoxGeometry(0.05, 0.05, 1.6), laser: new THREE.BoxGeometry(0.09, 0.09, 2.6)
  };
  for (const k in GEO) GEO[k].partage = true;
  const MAT_FANTOME = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false });
  // accessoires posés autour des bâtiments : [modèle, côté x, côté z (en demi-emprises), taille]
  const ACCESSOIRES = { grenier: [['jarre', 0.9, 0.7, 0.6], ['panier', -0.9, 0.9, 0.7]], entrepot: [['tonneaux', -1, 0.6, 2.0], ['caisse', 0.95, -0.8, 0.9]], caserne: [['tonneau', -1.02, 0.9, 0.8], ['caisse', 1.02, -0.6, 0.9]],
    centre: [['tonneaux', 1.05, 0.95, 2.0], ['jarre', -1.05, 0.95, 0.6], ['caisse', -1.0, -0.9, 0.9]], port: [['tonneau', -0.9, -0.95, 0.8], ['caisse', -0.5, -1.0, 0.9]], archerie: [['tonneau', 1.0, -0.9, 0.8]], ecurie: [['panier', -1.0, 1.0, 0.7]], maison: [['jarre', 0.95, 0.9, 0.55]], temple: [['jarre', 1.0, 1.0, 0.6], ['jarre', -1.0, 1.0, 0.6]] };
  const MAT_ANNEAU = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  const MAT_LASER = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const MAT_BALLE = new THREE.MeshBasicMaterial({ color: 0xffe9a0, toneMapped: false });
  const MAT_ECLAIR = new THREE.MeshBasicMaterial({ color: 0xe8f2ff, toneMapped: false });
  const COULEUR_POUVOIR = { peste: [0.5, 1, 0.3], serpents: [0.4, 0.9, 0.3], fleau_seth: [0.9, 0.5, 0.2], seisme: [0.8, 0.6, 0.35], tornade: [0.75, 0.8, 0.9], fimbulvetr: [0.7, 0.9, 1], deluge: [0.4, 0.7, 1], feu_vole: [1, 0.5, 0.15], lance_sekhmet: [1, 0.4, 0.2] };

  // ---------- particules : poussière (mélangée) ou feu et étincelles (additives) ----------
  class Particules {
    constructor(parent, max, additif) {
      this.max = max; this.n = 0; this.i = 0;
      this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3); this.vie = new Float32Array(max); this.duree = new Float32Array(max); this.taille = new Float32Array(max); this.col = new Float32Array(max * 3); this.grav = new Float32Array(max);
      const g = new THREE.BufferGeometry(); this.aP = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage); this.aC = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage); this.aT = new THREE.BufferAttribute(new Float32Array(max), 1).setUsage(THREE.DynamicDrawUsage);
      g.setAttribute('position', this.aP); g.setAttribute('couleur', this.aC); g.setAttribute('taille', this.aT);
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additif ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uEch: { value: 600 } },
        vertexShader: 'attribute vec4 couleur; attribute float taille; uniform float uEch; varying vec4 vC; void main() { vC = couleur; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = taille * uEch / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec4 vC; void main() { vec2 d = gl_PointCoord - 0.5; float r = dot(d, d) * 4.0; if (r > 1.0) discard; gl_FragColor = vec4(vC.rgb, vC.a * (1.0 - r) * (1.0 - r)); }' });
      this.mesh = new THREE.Points(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5; this.additif = additif; parent.add(this.mesh);
    }
    emettre(x, y, z, vx, vy, vz, vie, taille, r, g, b, grav) {
      const i = this.i; this.i = (this.i + 1) % this.max; this.n = Math.min(this.max, this.n + 1);
      this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z; this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
      this.vie[i] = vie; this.duree[i] = vie; this.taille[i] = taille; this.col[i * 3] = r; this.col[i * 3 + 1] = g; this.col[i * 3 + 2] = b; this.grav[i] = grav || 0;
    }
    maj(s, vue) {
      const P = this.aP.array, C = this.aC.array, T = this.aT.array;
      this.mesh.material.uniforms.uEch.value = (vue.cv.clientHeight || 800) * vue.renderer.getPixelRatio() * 0.9;
      for (let i = 0; i < this.max; i++) {
        if (this.vie[i] <= 0) { T[i] = 0; P[i * 3 + 1] = -1e4; continue; }
        this.vie[i] -= s; const k = this.vie[i] / this.duree[i];
        this.v[i * 3 + 1] -= this.grav[i] * s; const fr = this.additif ? 0.985 : 0.97; this.v[i * 3] *= fr; this.v[i * 3 + 2] *= fr;
        this.p[i * 3] += this.v[i * 3] * s; this.p[i * 3 + 1] += this.v[i * 3 + 1] * s; this.p[i * 3 + 2] += this.v[i * 3 + 2] * s;
        P[i * 3] = this.p[i * 3]; P[i * 3 + 1] = this.p[i * 3 + 1]; P[i * 3 + 2] = this.p[i * 3 + 2];
        T[i] = this.taille[i] * (this.additif ? 0.4 + k * 0.6 : 1.6 - k * 0.8);
        C[i * 4] = this.col[i * 3]; C[i * 4 + 1] = this.col[i * 3 + 1]; C[i * 4 + 2] = this.col[i * 3 + 2]; C[i * 4 + 3] = this.additif ? k : Math.min(1, k * 1.3) * 0.55;
      }
      this.aP.needsUpdate = this.aC.needsUpdate = this.aT.needsUpdate = true;
    }
  }

  PM.VueBataille = VueBataille;
  PM.vueBataille = { MYTHE_MODELE, STYLES, CONSTR };
})(typeof window !== 'undefined' ? window : globalThis);
