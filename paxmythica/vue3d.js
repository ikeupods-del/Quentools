/* Pax Mythica — vue 3D (three.js hébergé dans vendor/, effets dans vendor/effets/), habillée par les packs graphiques (packs-graphiques.js).
   Sol : relief détaillé, textures de détail peintes par le programme (herbes, sous-bois, herbes sèches, sable, roche, neige) mêlées
   au pixel par le processeur graphique, roche selon la pente, neige selon l'altitude et la saison, plages, fonds marins avec reflets
   dansants, ombres des nuages qui passent ; frontières des peuples nettes à toute distance (texture des propriétaires), routes.
   Eau animée (vagues, reflets du soleil ou de la lune, écume), ciel en dôme avec soleil et étoiles, brume.
   Herbe et arbres qui bougent au vent, villes et soldats instanciés, lumières des villes la nuit.
   Image finale : occlusion ambiante (ultra), halo lumineux, étalonnage (tons chauds et froids, saturation, contraste), effet maquette,
   vignette, grain, anticrénelage. Caméra inclinée avec inertie. Même interface que Rendu (rendu.js) pour les clics. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const THREE = G.THREE;
  PM.vue3dPossible = function () {
    if (!THREE) return false;
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  };
  // bruit de valeur (relief et couleurs)
  function bruit(graine) {
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + graine * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const l = t => t * t * (3 - 2 * t);
    const v = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = l(x - i), w = l(y - j), a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
    return (x, y, o = 4) => { let s = 0, a = 0.5, f = 1, t = 0; for (let k = 0; k < o; k++) { s += v(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.1; } return s / t; };
  }
  // assemble plusieurs morceaux colorés en une géométrie (couleurs par sommet), pour l'instanciation
  function fusion(morceaux) {
    const parts = morceaux.map(([g, c]) => [g.index ? g.toNonIndexed() : g, new THREE.Color(c).convertSRGBToLinear()]);
    let n = 0; for (const [g] of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    for (const [g, c] of parts) {
      const k = g.attributes.position.count; if (!g.attributes.normal) g.computeVertexNormals();
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; }
      o += k;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeBoundingSphere(); return g;
  }
  const B = (w, h, d, x = 0, y = 0, z = 0) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
  const Cy = (rt, rb, h, s, x = 0, y = 0, z = 0) => new THREE.CylinderGeometry(rt, rb, h, s).translate(x, y + h / 2, z);
  const Co = (r, h, s, x = 0, y = 0, z = 0, rot = 0) => new THREE.ConeGeometry(r, h, s).rotateY(rot).translate(x, y + h / 2, z);
  const Sp = (r, x = 0, y = 0, z = 0, d = 1) => new THREE.IcosahedronGeometry(r, d).translate(x, y, z);
  const rocheuse = (r, graine) => { const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, rnd = PM.aleatoire(graine); for (let i = 0; i < p.count; i++) { const k = 0.75 + rnd() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.75, p.getZ(i) * k); } g.computeVertexNormals(); return g; };

  // déforme légèrement une géométrie (feuillages plus naturels), avant fusion
  const jit = (g, graine, k = 0.12) => { const p = g.attributes.position, rnd = PM.aleatoire(graine), vu = new Map(); for (let i = 0; i < p.count; i++) { const cle = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3); let d = vu.get(cle); if (!d) { d = [(rnd() - 0.5) * k * 2, (rnd() - 0.5) * k, (rnd() - 0.5) * k * 2]; vu.set(cle, d); } p.setXYZ(i, p.getX(i) * (1 + d[0]), p.getY(i) + d[1], p.getZ(i) * (1 + d[2])); } g.computeVertexNormals(); return g; };
  // ---------- modèles (géométries fusionnées, couleurs neutres, teintées par instance) ----------
  function modeles() {
    const pierre = 0xece4d2, tuile = 0xb9573c, bois = 0x9a6a40, sombre = 0x6a4a30, sable = 0xdcc08a, chaume = 0xb79a5a, verre = 0x7fb8d8, acier = 0x9aa4ad, beton = 0xbdb8ae, neon = 0x6ff3ff;
    const vitre = 0x2a3038, porte = 0x4a3020;
    // façade : porte et fenêtres sur la face avant (+z) d'une maison de largeur w et de profondeur p
    const facade = (w, p, hFen, fen) => { const l = [[B(0.7, 1.3, 0.12, 0, 0, p / 2 + 0.02), porte]]; for (const x of fen) l.push([B(0.5, 0.5, 0.12, x, hFen, p / 2 + 0.02), vitre]); l.push([B(0.5, 0.5, 0.12, 0, hFen, -p / 2 - 0.02), vitre]); return l; };
    const colonnes = (n, w, z, h, y) => { const l = []; for (let i = 0; i < n; i++) l.push([Cy(0.32, 0.36, h, 8, -w / 2 + i * w / (n - 1), y, z), 0xf6f1e4]); return l; };
    const M = {
      // maisons
      maison_grecs: fusion([[B(3, 2.2, 3), pierre], [B(3.2, 0.18, 3.2, 0, 2.15), 0xd8cfbe], [Co(2.65, 1.5, 4, 0, 2.3, 0, Math.PI / 4), tuile], ...facade(3, 3, 1.3, [-0.95, 0.95]), [B(1.4, 0.15, 0.9, 0, 0, 2), 0xc8bfae]]),
      maison_egyptiens: fusion([[B(3.2, 2.4, 3.2), sable], [B(3.5, 0.35, 3.5, 0, 2.4), 0xc9a86a], [B(1, 0.8, 1, 0.8, 2.75, 0.8), sable], ...facade(3.2, 3.2, 1.5, [-1]), [Cy(0.08, 0.08, 1, 4, -1.3, 2.75, -1.3), bois], [B(1.2, 0.05, 1.2, -1, 3.7, -1), 0xe8d8b0]]),
      maison_nordiques: fusion([[B(4, 2, 2.6), bois], ...facade(4, 2.6, 1.2, [-1.3, 1.3]), [Cy(0.25, 0.3, 1.4, 6, 1.2, 2.6, -0.4), 0x5a5048], [new THREE.CylinderGeometry(0.02, 2.1, 4.4, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 0.9, 0.95).translate(0, 2.9, 0), sombre]]),
      maison_atlantes: fusion([[Cy(1.6, 1.7, 2.2, 10), 0xeef6f5], [new THREE.SphereGeometry(1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.2, 0), 0x2fa59a]]),
      hutte: fusion([[Cy(1.4, 1.5, 1.5, 8), 0x9a7a55], [Co(1.9, 1.8, 8, 0, 1.5), chaume]]),
      maison_medieval: fusion([[B(3, 2.6, 3.4), 0xe8dcc0], [B(3.1, 0.25, 3.5, 0, 1.2), bois], [B(0.2, 2.6, 0.06, -1.4, 0, 1.73), bois], [B(0.2, 2.6, 0.06, 1.4, 0, 1.73), bois], [B(0.18, 1.8, 0.06, 0, 0.4, 1.73).rotateZ(0.7), bois], ...facade(3, 3.4, 1.8, [-0.85, 0.85]), [Cy(0.3, 0.35, 1.6, 6, 0.9, 3.2, -0.8), 0x7a6a5a], [new THREE.CylinderGeometry(0.02, 2.3, 3.6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 1.1, 0.95).translate(0, 3.5, 0), 0x6b4a32]]),
      maison_industriel: fusion([[B(3.4, 3.4, 3), 0x9a4a36], [B(3.6, 0.4, 3.2, 0, 3.4), 0x4b4b52], [Cy(0.35, 0.35, 1.8, 6, 1, 3.6, 0.8), 0x5a3a2a], ...facade(3.4, 3, 1.4, [-1.1, 1.1]), [B(0.5, 0.5, 0.12, -1.1, 2.5, 1.52), vitre], [B(0.5, 0.5, 0.12, 1.1, 2.5, 1.52), vitre], [B(0.5, 0.5, 0.12, 0, 2.5, 1.52), vitre]]),
      maison_moderne: fusion([[B(3.2, 6.5, 3.2), beton], [B(3.3, 0.4, 3.3, 0, 2.2), verre], [B(3.3, 0.4, 3.3, 0, 4.4), verre]]),
      maison_futur: fusion([[Cy(1.4, 1.9, 3, 12), 0xf2f6fa], [new THREE.SphereGeometry(1.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3, 0), neon]]),
      // temples
      temple_grecs: fusion([[B(10, 0.9, 7), 0xe6dfcf], [B(10.4, 0.25, 7.4, 0, 0.9), 0xd8d0bf], ...colonnes(6, 9, 3, 3.4, 1.15), ...colonnes(6, 9, -3, 3.4, 1.15), [B(10.2, 0.7, 7.2, 0, 4.55), 0xf1ece0], [new THREE.CylinderGeometry(0.01, 4.1, 1.7, 4).rotateY(Math.PI / 4).scale(1.32, 1, 0.95).translate(0, 6.1, 0), tuile]]),
      temple_egyptiens: fusion([[Co(5.2, 5.4, 4, 0, 0, 0, Math.PI / 4), 0xe2c690], [Co(1.1, 0.9, 4, 0, 4.5, 0, Math.PI / 4), 0xf2d27a], [new THREE.CylinderGeometry(0.22, 0.75, 8, 4).rotateY(Math.PI / 4).translate(6.5, 4, 3), 0xcdb27a], [Co(0.3, 0.6, 4, 6.5, 8, 3, Math.PI / 4), 0xf2d27a]]),
      temple_nordiques: fusion([[B(9, 2.8, 4.6), bois], [new THREE.CylinderGeometry(0.02, 3.4, 9.6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 1.15, 0.9).translate(0, 4, 0), sombre], [Co(0.4, 1.6, 4, 4.6, 5.2, 0), 0xc9a24a], [Co(0.4, 1.6, 4, -4.6, 5.2, 0), 0xc9a24a]]),
      temple_atlantes: fusion([[Cy(3.6, 3.9, 3.4, 16), 0xeef6f5], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [Cy(0.3, 0.3, 3.4, 6, Math.cos(i * 0.785) * 4.3, 0, Math.sin(i * 0.785) * 4.3), 0xffffff]), [new THREE.SphereGeometry(3.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3.4, 0), 0x2fa59a], [Co(0.4, 1.4, 6, 0, 6.8), 0xf2d27a]]),
      temple_medieval: fusion([[B(5, 5, 11), 0xd9d1c0], [new THREE.CylinderGeometry(0.02, 3.2, 11.2, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).scale(0.9, 1.1, 1).translate(0, 6.3, 0), 0x55585e], [B(3, 9, 3, 0, 0, 5.5), 0xd9d1c0], [Co(1.9, 6, 4, 0, 9, 5.5, Math.PI / 4), 0x55585e]]),
      temple_industriel: fusion([[B(10, 4, 6), 0xa0503a], [B(10.4, 0.5, 6.4, 0, 4), 0x4a4a50], [Cy(0.7, 0.9, 10, 8, 3.5, 0, -1.5), 0x6a3a2a], [Cy(0.7, 0.9, 8, 8, 1.2, 0, -1.5), 0x6a3a2a], [new THREE.SphereGeometry(1.8, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(-3, 4.5, 0), acier]]),
      temple_moderne: fusion([[B(5, 16, 5), verre], [B(5.3, 0.5, 5.3, 0, 5), beton], [B(5.3, 0.5, 5.3, 0, 10.5), beton], [B(9, 3, 7, 0, 0, 0), beton], [Cy(0.15, 0.15, 3.5, 4, 0, 16), acier]]),
      temple_futur: fusion([[Cy(4.5, 5, 2, 20), 0xe8eef4], [new THREE.SphereGeometry(4, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2, 0), 0xdfe8f2], [new THREE.TorusGeometry(5.2, 0.35, 8, 28).rotateX(Math.PI / 2).translate(0, 3.2, 0), neon], [Cy(0.3, 0.3, 4, 6, 0, 6), neon]]),
      // centres des capitales
      centre_antique: fusion([[Cy(1.6, 1.9, 7, 10), pierre], [Co(2.4, 2.6, 10, 0, 7), tuile], [B(6, 3, 5, 3.2, 0, 2), pierre], [Co(3.7, 1.8, 4, 3.2, 3, 2, Math.PI / 4), tuile]]),
      centre_medieval: fusion([[B(6, 8, 6), 0xbab3a6], ...[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z]) => [Cy(1.3, 1.4, 10, 8, x, 0, z), 0xb0a99c]), ...[[-3, -3], [3, -3], [-3, 3], [3, 3]].map(([x, z]) => [Co(1.7, 2.6, 8, x, 10, z), 0x3f4a6a])]),
      centre_industriel: fusion([[B(8, 5, 5), 0xa65a40], [B(2.4, 12, 2.4, 0, 0, 0), 0xa65a40], [Co(1.9, 2.4, 4, 0, 12, 0, Math.PI / 4), 0x4a4a50], [Cy(0.9, 0.9, 1, 12, 0, 9.5, 1.25), 0xf4efe0]]),
      centre_moderne: fusion([[B(6, 26, 6), 0x8fb4cc], [B(4.5, 6, 4.5, 0, 26), 0x9ec2d8], [Cy(0.2, 0.2, 6, 4, 0, 32), acier], [B(12, 3, 9), beton]]),
      centre_futur: fusion([[Cy(0.8, 3.4, 30, 12), 0xeef3f8], [new THREE.TorusGeometry(4, 0.5, 8, 24).rotateX(Math.PI / 2).translate(0, 18, 0), neon], [new THREE.TorusGeometry(2.6, 0.4, 8, 24).rotateX(Math.PI / 2).translate(0, 26, 0), neon], [Sp(1.2, 0, 31, 0), neon]]),
      // ressources et défenses
      champ: fusion([[B(8, 0.18, 5), 0x9cae4a], ...[0, 1, 2, 3].map(i => [B(8, 0.3, 0.55, 0, 0, -1.9 + i * 1.25), 0xd8c25a])]),
      bois: fusion([[Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 0.45, -0.6), 0x8a5c34], [Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 0.45, 0.4), 0x8a5c34], [Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 1.25, -0.1), 0x9a6a3e], [B(2.6, 2, 2.4, 3.6, 0, 0), bois], [Co(2, 1.2, 4, 3.6, 2, 0, Math.PI / 4), sombre]]),
      mine: fusion([[rocheuse(2.6, 3), 0x5a554e], [B(1.6, 1.8, 0.4, 0, 0, 2.2), sombre], [B(0.9, 0.7, 0.9, 1.6, 0, 2.2), 0xe5c24a], [B(0.7, 0.5, 0.7, -1.6, 0, 2.4), 0xe5c24a]]),
      mur: fusion([[B(8.8, 2.8, 1.1), 0xa19a8c], ...[-3.5, -1.2, 1.2, 3.5].map(x => [B(1, 0.7, 1.2, x, 2.8), 0x958e80])]),
      tourelle: fusion([[Cy(1.15, 1.3, 4.6, 10), 0x958e80], [Co(1.6, 1.9, 10, 0, 4.6), 0x5d4a3a]]),
      bunker: fusion([[new THREE.SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), beton]]),
      bouclier: fusion([[new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0x7ff0ff]]),
      merveille_antique: fusion([[B(16, 3, 16), pierre], [B(12, 3, 12, 0, 3), pierre], [B(8, 3, 8, 0, 6), pierre], [B(4, 3, 4, 0, 9), pierre], [Co(2.4, 6, 4, 0, 12, 0, Math.PI / 4), 0xf0c85a]]),
      merveille_medieval: fusion([[B(8, 9, 18), 0xe0d8c8], [B(9, 16, 6, 0, 0, 8), 0xe0d8c8], [Co(3.4, 12, 4, 0, 16, 8, Math.PI / 4), 0x55585e], [new THREE.CylinderGeometry(0.02, 4.8, 18.2, 3).rotateX(Math.PI / 2).rotateZ(Math.PI / 6).scale(0.9, 1.1, 1).translate(0, 11, -1), 0x55585e], [Cy(2.6, 2.6, 0.6, 16).rotateX(Math.PI / 2).translate(0, 12, 11.1), 0x6fa3d8]]),
      merveille_industriel: fusion([[Co(7, 34, 4, 0, 0, 0, Math.PI / 4), 0x8a6a48], [B(9, 0.8, 9, 0, 10), 0x7a5a3a], [B(6, 0.8, 6, 0, 20), 0x7a5a3a], [Cy(0.3, 0.3, 5, 4, 0, 34), acier]]),
      merveille_moderne: fusion([[B(9, 52, 9), 0x7ea9c4], [B(7, 10, 7, 0, 52), 0x9ec2d8], [Co(2, 12, 4, 0, 62, 0, Math.PI / 4), acier], [B(16, 4, 16), beton]]),
      merveille_futur: fusion([[Cy(1.2, 1.6, 120, 8), 0xe8eef4], [Cy(6, 8, 4, 16), 0xdfe8f2], ...[20, 45, 70, 95].map(y => [new THREE.TorusGeometry(2.4, 0.3, 6, 18).rotateX(Math.PI / 2).translate(0, y, 0), neon]), [Sp(3, 0, 120, 0), neon]]),
      place: fusion([[Cy(1, 1, 0.12, 24), 0xa58c66]]),
      drapeau: fusion([[Cy(0.12, 0.12, 9, 4), 0x3a2a18], [B(3.4, 2.1, 0.08, 1.7, 6.6), 0xffffff]]),
      // nature : troncs et feuillages séparés (les feuillages prennent la couleur du pack)
      sapinTronc: fusion([[Cy(0.3, 0.42, 1.8, 6), 0x5a3d24]]),
      sapinFeuilles: fusion([[jit(Co(2.4, 3.2, 9, 0, 1.3), 1), 0xffffff], [jit(Co(1.95, 2.9, 9, 0, 2.8), 2), 0xf4f4f4], [jit(Co(1.4, 2.5, 8, 0, 4.2), 3), 0xffffff], [jit(Co(0.85, 1.9, 7, 0, 5.6), 4), 0xf0f0f0]]),
      feuilluTronc: fusion([[Cy(0.32, 0.46, 2.7, 6), 0x5e4128], [Cy(0.14, 0.2, 1.5, 5).rotateZ(0.7).translate(0.55, 2.1, 0), 0x5e4128]]),
      feuilluFeuilles: fusion([[jit(Sp(2.0, 0, 4.1, 0, 1), 5), 0xffffff], [jit(Sp(1.55, 1.25, 3.5, 0.6, 1), 6), 0xeeeeee], [jit(Sp(1.5, -1.15, 3.7, -0.5, 1), 7), 0xf6f6f6], [jit(Sp(1.3, 0.2, 5.1, -0.4, 1), 8), 0xffffff], [jit(Sp(1.15, -0.4, 3.3, 1.05, 1), 9), 0xe8e8e8]]),
      palmierTronc: fusion([[jit(Cy(0.2, 0.32, 5.2, 6).translate(0.3, 0, 0), 12, 0.05), 0x7a5a34]]),
      palmierFeuilles: fusion([0, 1, 2, 3, 4, 5].map(i => [new THREE.ConeGeometry(0.55, 3.2, 4).rotateZ(Math.PI / 2 - 0.35).translate(1.6, 0, 0).rotateY(i * 1.047).translate(0.35, 5.2, 0), 0xffffff])),
      buisson: fusion([[jit(Sp(1, 0, 0.6, 0, 1), 13), 0xffffff], [jit(Sp(0.75, 0.7, 0.45, 0.3, 0), 14), 0xeeeeee], [jit(Sp(0.6, -0.6, 0.4, -0.3, 0), 15), 0xf4f4f4]]),
      rocher: fusion([[rocheuse(2.2, 11), 0x6f6862]]),
      // lumières des villes (packs de nuit)
      lumiere: fusion([[B(0.85, 0.7, 0.12, 0, 0.85, 0), 0xffffff]]),
      flamme: fusion([[Sp(0.35, 0, 2.7, 0, 1), 0xffffff]]),
      etendard: fusion([[Cy(0.07, 0.08, 5.2, 4), 0x3a2a18], [B(1.7, 1.05, 0.06, 0.85, 3.9), 0xffffff], [Co(0.18, 0.4, 4, 0, 5.2), 0xd8b060]]),
      poteau: fusion([[Cy(0.09, 0.12, 2.5, 5), 0x3a2a18], [Cy(0.25, 0.18, 0.25, 6, 0, 2.4), 0x2a2a2a]]),
      // armées
      fantassin: fusion([[Cy(0.48, 0.66, 1.9, 7), 0xffffff], [Sp(0.44, 0, 2.35, 0, 1), 0xe2b48c], [new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.42, 0), 0x8a8f96], [Cy(0.06, 0.06, 3.6, 4, 0.75, 0.2), 0x3a2a1a], [Cy(0.62, 0.62, 0.12, 12).rotateZ(Math.PI / 2).translate(-0.62, 1.3, 0.1), 0xffffff]]),
      cavalier: fusion([[B(1.05, 1.15, 2.9, 0, 0.75), 0x6a4528], [B(0.6, 0.9, 0.8, 0, 1.6, 1.4), 0x6a4528], ...[[-0.35, -1], [0.35, -1], [-0.35, 1], [0.35, 1]].map(([x, z]) => [Cy(0.14, 0.14, 0.9, 4, x, 0, z), 0x4a2e18]), [Cy(0.42, 0.55, 1.4, 7, 0, 1.8), 0xffffff], [Sp(0.4, 0, 3.6, 0, 1), 0xe2b48c], [Cy(0.06, 0.06, 4, 4, 0.6, 1.6, 0.8), 0x3a2a1a]]),
      char: fusion([[B(2.4, 1, 3.6, 0, 0.3), 0x5a6048], [B(1.6, 0.8, 1.8, 0, 1.3), 0xffffff], [Cy(0.15, 0.15, 2.4, 6).rotateX(Math.PI / 2).translate(0, 1.7, 1.6), 0x3a3e34], [B(2.7, 0.5, 3.8), 0x2a2a28]]),
      engin: fusion([[B(2.4, 0.9, 3.2, 0, 0.5), 0x7a5634], ...[[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]].map(([x, z]) => [Cy(0.6, 0.6, 0.25, 10).rotateZ(Math.PI / 2).translate(x, 0.6, z), 0x4a3420]), [Cy(0.12, 0.12, 3.6, 4).rotateX(-0.7).translate(0, 1.8, -0.4), 0x5a3a22], [B(1.2, 0.7, 0.4, 0, 1.4, 0.9), 0xffffff]]),
      geant: fusion([[Cy(0.6, 0.9, 2.2, 8), 0xffffff], [Sp(0.55, 0, 2.7, 0, 1), 0x9a8a7a], [Cy(0.25, 0.25, 1.8, 6).rotateZ(1.1).translate(1, 1.8, 0), 0x9a8a7a], [Cy(0.25, 0.25, 1.8, 6).rotateZ(-1.1).translate(-1, 1.8, 0), 0x9a8a7a]]),
      meca: fusion([[B(1.6, 1.6, 1.2, 0, 1.8), 0xffffff], [B(0.9, 0.7, 0.9, 0, 3.4), 0xc0ccd8], [B(0.45, 1.8, 0.45, -0.5), 0x8a96a2], [B(0.45, 1.8, 0.45, 0.5), 0x8a96a2], [B(0.35, 1.4, 0.35, -1.1, 1.8), 0x8a96a2], [B(0.35, 1.4, 0.35, 1.1, 1.8), 0x8a96a2], [B(0.5, 0.2, 0.2, 0, 3.6, 0.46), 0x6ff3ff]])
    };
    for (const k in M) M[k].partage = true;
    return M;
  }
  const TEMPLE_EPOQUE = { medieval: 'temple_medieval', industriel: 'temple_industriel', moderne: 'temple_moderne', futur: 'temple_futur' };
  const MAISON_EPOQUE = { medieval: 'maison_medieval', industriel: 'maison_industriel', moderne: 'maison_moderne', futur: 'maison_futur' };

  const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
  const lin = h => new THREE.Color(h).convertSRGBToLinear();
  // ---------- eau : vagues, profondeur, reflets du soleil (ou de la lune), écume ----------
  function materiauEau(profondeur, W, H) {
    return new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), {
        uT: { value: 0 }, uProf: { value: profondeur }, uTaille: { value: new THREE.Vector2(W, H) }, uSoleil: { value: new THREE.Vector3(0, 1, 0) },
        uCreux: { value: new THREE.Vector3() }, uBas: { value: new THREE.Vector3() }, uReflet: { value: new THREE.Vector3(1, 1, 1) }, uCiel: { value: new THREE.Vector3(0.6, 0.75, 0.9) }
      }),
      vertexShader: `varying vec3 vMonde;
${THREE.ShaderChunk.fog_pars_vertex}
void main() { vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz; vec4 mvPosition = viewMatrix * m; gl_Position = projectionMatrix * mvPosition;
${THREE.ShaderChunk.fog_vertex}
}`,
      fragmentShader: `uniform float uT; uniform sampler2D uProf; uniform vec2 uTaille; uniform vec3 uSoleil, uCreux, uBas, uReflet, uCiel; varying vec3 vMonde;
${THREE.ShaderChunk.common}
${THREE.ShaderChunk.fog_pars_fragment}
float hE(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nE(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hE(i), hE(i + vec2(1, 0)), f.x), mix(hE(i + vec2(0, 1)), hE(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 p = vMonde.xz;
  float d = texture2D(uProf, clamp(p / uTaille, 0.0, 1.0)).r; if (p.x < 0.0 || p.y < 0.0 || p.x > uTaille.x || p.y > uTaille.y) d = 1.0;
  float t = uT, loin = smoothstep(350.0, 1500.0, length(cameraPosition - vMonde));
  float hx = sin(p.x * 0.09 + t * 1.1) * 0.5 + sin((p.x + p.y) * 0.13 + t * 1.7) * 0.35 + nE(p * 0.18 + t * 0.25) * 0.8 + nE(p * 0.6 - t * 0.5) * 0.25;
  float hz = cos(p.y * 0.11 + t * 1.3) * 0.5 + cos((p.x - p.y) * 0.12 + t * 1.5) * 0.35 + nE(p * 0.18 - t * 0.22 + 7.0) * 0.8 + nE(p * 0.6 + t * 0.45 + 3.0) * 0.25;
  float force = 0.17 * (1.0 - loin * 0.85);
  vec3 nrm = normalize(vec3(hx * force, 1.0, hz * force));
  vec3 vue = normalize(cameraPosition - vMonde);
  float fres = pow(1.0 - max(dot(nrm, vue), 0.0), 4.0);
  vec3 c = mix(uBas, uCreux, smoothstep(0.02, 0.55, d));
  c = mix(c, uCiel, fres * 0.6);
  float spec = pow(max(dot(reflect(-uSoleil, nrm), vue), 0.0), 140.0);
  float specLarge = pow(max(dot(reflect(-uSoleil, nrm), vue), 0.0), 18.0);
  c += uReflet * (spec * 2.2 + specLarge * 0.12) * (1.0 - loin * 0.7);
  float bord = 1.0 - smoothstep(0.0, 0.09, d);
  float vagues = 0.5 + 0.5 * sin(d * 110.0 - t * 2.4 + nE(p * 0.2) * 4.0);
  float ecume = bord * smoothstep(0.45, 0.85, nE(p * 0.5 + vec2(t * 0.6, -t * 0.4)) * 0.6 + vagues * 0.55);
  c = mix(c, vec3(0.92, 0.95, 0.95), clamp(ecume, 0.0, 1.0) * 0.6);
  float a = mix(0.5, 0.94, smoothstep(0.0, 0.25, d)); a = max(a, ecume * 0.9);
  gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <encodings_fragment>
${THREE.ShaderChunk.fog_fragment}
}`
    });
  }
  // ---------- ciel : dôme en dégradé, halo du soleil, étoiles ----------
  function materiauCiel() {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uHaut: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBas: { value: new THREE.Color() }, uHalo: { value: new THREE.Color() }, uSoleil: { value: new THREE.Vector3(0, 1, 0) }, uEtoiles: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 uHaut, uHorizon, uBas, uHalo, uSoleil; uniform float uEtoiles; varying vec3 vDir;
${THREE.ShaderChunk.common}
void main() {
  vec3 d = normalize(vDir); float y = d.y;
  vec3 c = y > 0.0 ? mix(uHorizon, uHaut, pow(smoothstep(0.0, 0.75, y), 0.8)) : mix(uHorizon, uBas, smoothstep(0.0, -0.3, y));
  float s = max(dot(d, normalize(uSoleil)), 0.0);
  c += uHalo * (pow(s, 8.0) * 0.35 + pow(s, 64.0) * 0.6 + pow(s, 900.0) * 3.0);
  if (uEtoiles > 0.0 && y > 0.02) { vec3 q = floor(d * 380.0); float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453); c += vec3(0.85, 0.9, 1.0) * step(0.9975, h) * uEtoiles * smoothstep(0.02, 0.3, y); }
  gl_FragColor = vec4(c, 1.0);
#include <tonemapping_fragment>
#include <encodings_fragment>
}`
    });
  }
  // ---------- textures de détail (répétables) peintes selon le pack ----------
  function bruitPeriodique(P, graine) {
    const h = (x, y) => { x = ((x % P) + P) % P; y = ((y % P) + P) % P; let n = (x * 374761393 + y * 668265263 + graine * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const l = t => t * t * (3 - 2 * t);
    return (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = l(x - i), w = l(y - j), a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
  }
  function fbmP(taille, graine, base, oct) { const ns = []; for (let o = 0; o < oct; o++) ns.push(bruitPeriodique(base << o, graine + o * 31)); return (x, y) => { let s = 0, a = 0.5, t = 0; for (let o = 0; o < oct; o++) { s += ns[o](x / taille * (base << o), y / taille * (base << o)) * a; t += a; a *= 0.5; } return s / t; }; }
  function texture(taille, peindre) {
    const c = document.createElement('canvas'); c.width = c.height = taille; const g = c.getContext('2d'), img = g.createImageData(taille, taille);
    peindre(img.data, taille, g); g.putImageData(img, 0, 0); if (peindre.apres) peindre.apres(g, taille);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function texturesDetail(pack) {
    const S = pack.sol, T = 256, rnd = PM.aleatoire(7);
    const pinceau = (base, varia, graine, extra) => texture(T, (d, n) => {
      const f = fbmP(n, graine, 4, 5), f2 = fbmP(n, graine + 9, 16, 3);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const o = (y * n + x) * 4, v = 1 + (f(x, y) - 0.5) * varia + (f2(x, y) - 0.5) * varia * 0.6, e = extra ? extra(x, y, n) : [0, 0, 0];
        d[o] = base[0] * v + e[0]; d[o + 1] = base[1] * v + e[1]; d[o + 2] = base[2] * v + e[2]; d[o + 3] = 255;
      }
    });
    const brins = (tex, couleurs, nb) => { tex.image.getContext('2d'); const g = tex.image.getContext('2d'); for (let i = 0; i < nb; i++) { const x = rnd() * T, y = rnd() * T, l = 2 + rnd() * 5, a = -Math.PI / 2 + (rnd() - 0.5) * 0.9; g.strokeStyle = couleurs[Math.floor(rnd() * couleurs.length)]; g.lineWidth = 0.6 + rnd() * 0.7; for (const dx of [0, -T, T]) for (const dy of [0, -T, T]) { g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke(); } } tex.needsUpdate = true; return tex; };
    const rgb = (c, k) => `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},0.55)`;
    const herbe = brins(pinceau(S.herbe, 0.42, 3), [rgb(S.herbe, 0.7), rgb(S.herbe, 1.25), rgb(S.herbe, 0.85)], 2200);
    if (S.fleurs) { const g = herbe.image.getContext('2d'); for (let i = 0; i < 60; i++) { g.fillStyle = ['#f4e9a0', '#ffffff', '#e8a0c0', '#c8a0f0'][i % 4]; g.globalAlpha = 0.7; g.fillRect(rnd() * T, rnd() * T, 1.4, 1.4); } g.globalAlpha = 1; herbe.needsUpdate = true; }
    const foret = brins(pinceau(S.foret, 0.5, 11, (x, y, n) => { const k = Math.sin(x * 0.9 + y * 0.4) * Math.sin(y * 0.7) > 0.8 ? 18 : 0; return [k, k * 0.6, 0]; }), [rgb(S.foret, 0.6), 'rgba(110,80,50,.45)', rgb(S.foret, 1.3)], 1400);
    const sec = brins(pinceau(S.sec, 0.4, 21), [rgb(S.sec, 1.25), rgb(S.sec, 0.75), 'rgba(200,180,110,.4)'], 1800);
    const sable = pinceau(S.sable, 0.18, 31, (x, y, n) => { const r = Math.sin((x * 0.16 + Math.sin(y * 0.05) * 2) * 2 * Math.PI / 6.4) * 7, g = (((x * 7 + y * 13) * 2654435761) >>> 0) / 4294967296 * 16 - 8; return [r + g, r + g, r * 0.8 + g]; });
    const roche = texture(T * 2, (d, n) => {
      const f = fbmP(n, 41, 4, 6), cr = fbmP(n, 43, 8, 4);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const o = (y * n + x) * 4, v = f(x, y), crete = 1 - Math.abs(cr(x, y) * 2 - 1), fente = crete > 0.93 ? 0.55 : 1, strate = 1 + Math.sin(y * 0.11 + v * 9) * 0.06, k = (0.7 + v * 0.6) * fente * strate;
        d[o] = S.roche[0] * k; d[o + 1] = S.roche[1] * k; d[o + 2] = S.roche[2] * k; d[o + 3] = 255;
      }
    });
    const neige = pinceau(S.neige, 0.1, 51, (x, y) => { const k = (((x * 31 + y * 17) * 2654435761) >>> 0) / 4294967296 > 0.996 ? 30 : 0; return [k - 6 + (y % 7 === 0 ? -4 : 0), k - 3, k + 4]; });
    return { herbe, foret, sec, sable, roche, neige };
  }
  // touffe d'herbe : trois plans croisés, brins dessinés sur une texture transparente
  function texHerbe() {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), rnd = PM.aleatoire(3);
    for (let i = 0; i < 26; i++) { const x = 4 + rnd() * 56, h = 30 + rnd() * 32, cb = x + (rnd() - 0.5) * 18; g.fillStyle = `rgba(255,255,255,${0.75 + rnd() * 0.25})`; g.beginPath(); g.moveTo(x - 1.6, 64); g.quadraticCurveTo(x, 64 - h * 0.5, cb, 64 - h); g.quadraticCurveTo(x + 0.4, 64 - h * 0.5, x + 1.6, 64); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  function geoHerbe() {
    const morceaux = [];
    // trois plans croisés, chacun doublé à l'envers (deux faces avant : l'éclairage reste celui du dessus)
    for (let k = 0; k < 6; k++) { const p = new THREE.PlaneGeometry(1.8, 1.3, 1, 2).translate(0, 0.65, 0).rotateY(k * Math.PI / 3 + (k >= 3 ? Math.PI : 0)); morceaux.push(p); }
    const g = new THREE.BufferGeometry(), parts = morceaux.map(p => p.toNonIndexed());
    let n = 0; for (const p of parts) n += p.attributes.position.count;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    for (const p of parts) { const c = p.attributes.position.count; pos.set(p.attributes.position.array, o * 3); uv.set(p.attributes.uv.array, o * 2); for (let i = 0; i < c; i++) { const y = p.attributes.position.getY(i) / 1.3, v = 0.45 + y * 0.75; col[(o + i) * 3] = col[(o + i) * 3 + 1] = col[(o + i) * 3 + 2] = v; nor[(o + i) * 3 + 1] = 1; } o += c; }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere(); g.partage = true; return g;
  }
  // vent : les sommets hauts (herbe, feuillages) ondulent selon le temps et la position de l'instance
  function avecVent(mat, ampleur, uniformes) {
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = uniformes.uT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
vec3 baseI = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
vec3 baseI = vec3(0.0);
#endif
float hV = max(0.0, transformed.y);
transformed.x += (sin(uT * 1.9 + baseI.x * 0.13 + baseI.z * 0.07) * 0.6 + sin(uT * 4.3 + baseI.z * 0.4) * 0.25) * ${ampleur.toFixed(3)} * hV;
transformed.z += (cos(uT * 1.5 + baseI.z * 0.11) * 0.45) * ${ampleur.toFixed(3)} * hV;`);
    };
    return mat;
  }
  // étalonnage final : exposition, tons (ACES), couleur chaude et froide, saturation, contraste, vignette, grain, papier
  const ETALONNAGE = {
    uniforms: { tDiffuse: { value: null }, uExpo: { value: 1 }, uACES: { value: 1 }, uSat: { value: 1 }, uContraste: { value: 1 }, uChaud: { value: new THREE.Vector3(1, 1, 1) }, uFroid: { value: new THREE.Vector3(1, 1, 1) }, uVignette: { value: 0.3 }, uGrain: { value: 0.02 }, uPapier: { value: 0 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uExpo, uACES, uSat, uContraste, uVignette, uGrain, uPapier, uT; uniform vec3 uChaud, uFroid; uniform vec2 uRes; varying vec2 vUv;
vec3 fit(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
vec3 aces(vec3 c) { const mat3 I = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777)); const mat3 O = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602)); return clamp(O * fit(I * c), 0.0, 1.0); }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  if (uACES > 0.5) c = aces(c * uExpo / 0.6);
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c *= mix(uFroid, uChaud, smoothstep(0.15, 0.85, l));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContraste + 0.5;
  vec2 q = vUv - 0.5; q.x *= uRes.x / uRes.y;
  c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));
  if (uPapier > 0.5) { float f = n(vUv * uRes / 3.0) * 0.6 + n(vUv * uRes / 22.0) * 0.4; c *= 0.94 + f * 0.08; c = mix(c, c * vec3(1.04, 0.98, 0.9), smoothstep(0.5, 1.1, length(q))); }
  c += (h(vUv * uRes + fract(uT) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`
  };
  class Vue3D {
    constructor(canvas, calque, r2d) {
      this.cv = canvas; this.et = calque; this.ctx = calque.getContext('2d'); this.r2d = r2d;
      const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping;
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0xbfd6e6, 600, 2200);
      this.camera = new THREE.PerspectiveCamera(36, 1, 2, 9000);
      this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a3c28, 0.55); this.scene.add(this.hemi);
      this.dirSoleil = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
      const s = this.soleil = new THREE.DirectionalLight(0xffe2b8, 2.1);
      s.castShadow = true; s.shadow.bias = -0.0004; s.shadow.normalBias = 0.6; this.scene.add(s); this.scene.add(s.target);
      this.ciel = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), materiauCiel()); this.ciel.renderOrder = -10; this.ciel.frustumCulled = false; this.scene.add(this.ciel);
      this.cam = { x: 0, z: 0, d: 600, lacet: 0 }; this.vise = { x: 0, z: 0, d: 600, lacet: 0 };
      this.temps = 0; this.boites = []; this.mats = {}; this.M = modeles(); this.uVent = { uT: { value: 0 } };
      this.ray = new THREE.Raycaster();
      this.idPack = PM.packGraphique ? PM.packGraphique() : 'olympe'; this.idQualite = PM.qualite ? PM.qualite() : 'haute';
      this.pack = PM.PACKS_GRAPHIQUES[this.idPack]; this.Q = PM.QUALITES[this.idQualite];
    }
    recompiler() { this.scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); }); }
    mat(opts) { const k = JSON.stringify(opts); return this.mats[k] || (this.mats[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, opts))); }

    // ---------- construction du monde ----------
    lier(j) {
      this.j = j; const C = j.carte;
      if (this.monde) { this.scene.remove(this.monde); this.monde.traverse(o => { if (o.geometry && !o.geometry.partage) o.geometry.dispose(); }); }
      this.monde = new THREE.Group(); this.scene.add(this.monde);
      this.epoque = (j.etat.reglages && j.etat.reglages.epoque) || 'antique';
      this.vus = { base: -1, calque: -1, halo: -1 };
      this.hauteurs(); this.texturesSol(); this.construireSol(); this.construireEau(); this.construireNature(); this.construireHerbe(); this.construireNuages();
      this.instances = {}; this.sigVilles = '';
      this.appliquerPack(this.idPack, true); this.appliquerQualite(this.idQualite, true);
      this.cadrer(); Object.assign(this.cam, this.vise);
    }
    // ---------- packs graphiques et qualité ----------
    appliquerPack(id, sansReconstruire) {
      this.idPack = PM.PACKS_GRAPHIQUES[id] ? id : 'olympe'; const P = this.pack = PM.PACKS_GRAPHIQUES[this.idPack];
      this.dirSoleil = v3(P.soleil.dir).normalize();
      this.soleil.color = lin(P.soleil.couleur); this.soleil.intensity = P.soleil.force;
      this.hemi.color = lin(P.hemi.ciel); this.hemi.groundColor = lin(P.hemi.sol); this.hemi.intensity = P.hemi.force;
      const u = this.ciel.material.uniforms; u.uHaut.value = lin(P.ciel.haut); u.uHorizon.value = lin(P.ciel.horizon); u.uBas.value = lin(P.ciel.bas); u.uHalo.value = lin(P.ciel.halo); u.uSoleil.value = this.dirSoleil; u.uEtoiles.value = P.etoiles ? 1 : 0;
      this.scene.fog.color = lin(P.ciel.horizon);
      if (this.eau) { const w = this.eau.material.uniforms; w.uCreux.value = v3(P.eau.creux); w.uBas.value = v3(P.eau.bas); w.uReflet.value = v3(P.eau.reflet); w.uSoleil.value = this.dirSoleil; const h = lin(P.ciel.horizon); w.uCiel.value = new THREE.Vector3(h.r, h.g, h.b); }
      if (this.solMesh && this.solMesh.userData.uniformes) { const su = this.solMesh.userData.uniformes; su.uNeigeNiveau.value = P.neige.niveau; su.uNeigePartout.value = P.neige.partout; su.uNuages.value = P.nuages.ombres; }
      for (const n of this.nuages || []) n.material.color = lin(P.nuit ? 0x8090b0 : 0xffffff);
      if (!sansReconstruire) { this.texturesSol(); this.colorerNature(); this.colorerHerbe(); this.sigVilles = ''; }
      else { this.colorerNature(); this.colorerHerbe(); }
      this.renderer.toneMappingExposure = P.exposition;
      this.majPost();
    }
    appliquerQualite(id, sansReconstruire) {
      this.idQualite = PM.QUALITES[id] ? id : 'haute'; const Q = this.Q = PM.QUALITES[this.idQualite];
      this.renderer.setPixelRatio(Math.min(Q.finesse, window.devicePixelRatio || 1));
      this.soleil.castShadow = Q.ombres > 0;
      if (Q.ombres && this.soleil.shadow.mapSize.x !== Q.ombres) { this.soleil.shadow.mapSize.set(Q.ombres, Q.ombres); if (this.soleil.shadow.map) { this.soleil.shadow.map.dispose(); this.soleil.shadow.map = null; } }
      this.renderer.shadowMap.enabled = Q.ombres > 0;
      this.recompiler();
      if (this.herbe) this.herbe.visible = Q.herbe > 0;
      this.composer = null; this.taille = ''; void sansReconstruire;
    }
    // image finale : passes d'effets selon la qualité (sans effet en qualité basse)
    creerPost(w, h) {
      const Q = this.Q, R = this.renderer, pr = R.getPixelRatio();
      this.composer = null;
      if (this.idQualite === 'basse' || !THREE.EffectComposer) { R.toneMapping = THREE.ACESFilmicToneMapping; R.outputEncoding = THREE.sRGBEncoding; return; }
      try {
        const hdr = R.capabilities.isWebGL2 && (R.extensions.has('EXT_color_buffer_float') || R.extensions.has('EXT_color_buffer_half_float'));
        const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: hdr ? THREE.HalfFloatType : THREE.UnsignedByteType });
        // en HDR, les tons sont faits à la fin (étalonnage) ; sinon par les matériaux
        R.toneMapping = hdr ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; R.outputEncoding = THREE.LinearEncoding;
        this.recompiler();
        const C = new THREE.EffectComposer(R, rt); C.setPixelRatio(pr); C.setSize(w, h);
        if (Q.ao && THREE.SSAOPass) {
          const ao = new THREE.SSAOPass(this.scene, this.camera, w * pr, h * pr); ao.kernelRadius = 10; ao.minDistance = 0.0006; ao.maxDistance = 0.02;
          if (hdr) { ao.beautyRenderTarget.dispose(); ao.beautyRenderTarget = new THREE.WebGLRenderTarget(w * pr, h * pr, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.HalfFloatType }); }
          C.addPass(ao); this.passeAO = ao;
        } else { C.addPass(new THREE.RenderPass(this.scene, this.camera)); this.passeAO = null; }
        if (Q.bloom && THREE.UnrealBloomPass) { this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.6, 0.8); C.addPass(this.bloom); } else this.bloom = null;
        this.etal = new THREE.ShaderPass(ETALONNAGE); this.etal.uniforms.uACES.value = hdr ? 1 : 0; C.addPass(this.etal);
        if (Q.maquette && THREE.HorizontalTiltShiftShader) { this.tiltH = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader); this.tiltV = new THREE.ShaderPass(THREE.VerticalTiltShiftShader); C.addPass(this.tiltH); C.addPass(this.tiltV); } else this.tiltH = this.tiltV = null;
        if (THREE.FXAAShader) { this.fxaa = new THREE.ShaderPass(THREE.FXAAShader); this.fxaa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); C.addPass(this.fxaa); }
        this.composer = C; this.hdr = hdr; this.majPost();
      } catch (e) { this.composer = null; R.toneMapping = THREE.ACESFilmicToneMapping; R.outputEncoding = THREE.sRGBEncoding; }
    }
    majPost() {
      const P = this.pack.post;
      if (this.etal) { const u = this.etal.uniforms; u.uExpo.value = this.pack.exposition; u.uSat.value = P.saturation; u.uContraste.value = P.contraste; u.uChaud.value = v3(P.chaud); u.uFroid.value = v3(P.froid); u.uVignette.value = P.vignette; u.uGrain.value = P.grain; u.uPapier.value = P.papier ? 1 : 0; }
      if (this.bloom) { this.bloom.strength = P.bloom; this.bloom.threshold = P.seuil; this.bloom.radius = 0.55; }
    }
    // relief : hauteur de la carte + montagnes à crêtes, collines, plaines douces ; poids des terrains lissés (pas de marche entre provinces)
    // relief : hauteur de la carte + montagnes à crêtes, collines, plaines douces ; poids des terrains lissés (pas de marche entre provinces)
    hauteurs() {
      const C = this.j.carte, E = this.j.etat, pas = this.pas = Math.max(2.5, Math.round(C.w / 520 * 2) / 2), gx = this.gx = Math.ceil(C.w / pas) + 1, gz = this.gz = Math.ceil(C.h / pas) + 1;
      const types = ['plaine', 'foret', 'collines', 'montagne', 'desert'], W = types.map(() => new Float32Array(gx * gz)), base = new Float32Array(gx * gz), mer = new Float32Array(gx * gz);
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const x = Math.min(C.w - 1, i * pas), y = Math.min(C.h - 1, k * pas), o = k * gx + i, p = C.pix[y * C.w + x];
        base[o] = PM.hauteurPixel(C, x, y); if (p < 0) { mer[o] = 1; continue; }
        W[types.indexOf(E.provinces[p].terrain)][o] = 1;
      }
      const flou = (A, passes) => { for (let q = 0; q < passes; q++) { const L = new Float32Array(A); for (let k = 1; k < gz - 1; k++) for (let i = 1; i < gx - 1; i++) { const o = k * gx + i; L[o] = (A[o] * 2 + A[o - 1] + A[o + 1] + A[o - gx] + A[o + gx]) / 6; } A.set(L); } };
      for (const w of W) flou(w, 5); flou(mer, 2);
      const nz = bruit((E.reglages.graine || 1) * 3 + 1), H = new Float32Array(gx * gz);
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const o = k * gx + i, x = i * pas, y = k * pas, s = base[o] - 0.5;
        const crete = 1 - Math.abs(nz(x / 38, y / 38, 4) * 2 - 1), bosse = nz(x / 22 + 9, y / 22, 3), fin = nz(x / 7, y / 7, 2);
        if (s < 0) { H[o] = Math.max(-40, s * 95); continue; } // continu à la côte : le rivage suit une courbe douce
        const tot = W.reduce((t, w) => t + w[o], 0) || 1, wP = W[0][o] / tot, wF = W[1][o] / tot, wC = W[2][o] / tot, wM = W[3][o] / tot, wD = W[4][o] / tot;
        let v = 0.9 + s * 26 + wP * (bosse * 3) + wF * (1.5 + bosse * 4) + wC * (5 + bosse * 12 + crete * 6) + wM * (14 + Math.pow(crete, 1.6) * 62 + bosse * 18) + wD * (1 + Math.abs(Math.sin(x * 0.07 + nz(x / 30, y / 30) * 6)) * 3);
        v += fin * 1.2;
        H[o] = v * Math.min(1, s * 40 + 0.15); // le relief s'efface vers les plages
      }
      this.H = H; this.poids = { W, mer, types };
    }
    sol(x, z) {
      const pas = this.pas, gx = this.gx, fx = Math.max(0, Math.min(gx - 1.001, x / pas)), fz = Math.max(0, Math.min(this.gz - 1.001, z / pas)), i = fx | 0, k = fz | 0, u = fx - i, v = fz - k, H = this.H, o = k * gx + i;
      return H[o] * (1 - u) * (1 - v) + H[o + 1] * u * (1 - v) + H[o + gx] * (1 - u) * v + H[o + gx + 1] * u * v;
    }
    poidsA(t, x, z) { const W = this.poids.W[this.poids.types.indexOf(t)], gx = this.gx, i = Math.max(0, Math.min(gx - 1, Math.round(x / this.pas))), k = Math.max(0, Math.min(this.gz - 1, Math.round(z / this.pas))), o = k * gx + i; const tot = this.poids.W.reduce((s, w) => s + w[o], 0) || 1; return W[o] / tot; }
    // textures du sol : détails du pack, poids des terrains (texture lissée), propriétaires et provinces (texture nette), routes
    texturesSol() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, W = this.poids.W;
      if (this.details) for (const k in this.details) this.details[k].dispose();
      this.details = texturesDetail(this.pack);
      const p = new Uint8Array(gx * gz * 4);
      for (let o = 0; o < gx * gz; o++) { const tot = W.reduce((s, w) => s + w[o], 0) || 1; p[o * 4] = W[0][o] / tot * 255; p[o * 4 + 1] = W[1][o] / tot * 255; p[o * 4 + 2] = (W[2][o] + W[3][o] * 0.6) / tot * 255; p[o * 4 + 3] = W[4][o] / tot * 255; }
      if (this.texPoids) this.texPoids.dispose();
      this.texPoids = new THREE.DataTexture(p, gx, gz, THREE.RGBAFormat); this.texPoids.magFilter = this.texPoids.minFilter = THREE.LinearFilter; this.texPoids.needsUpdate = true;
      if (!this.texPeuples) {
        this.dataPeuples = new Uint8Array(C.w * C.h * 4);
        this.texPeuples = new THREE.DataTexture(this.dataPeuples, C.w, C.h, THREE.RGBAFormat); this.texPeuples.magFilter = this.texPeuples.minFilter = THREE.NearestFilter;
        this.palette = new Uint8Array(64 * 4); this.texPalette = new THREE.DataTexture(this.palette, 64, 1, THREE.RGBAFormat); this.texPalette.magFilter = this.texPalette.minFilter = THREE.NearestFilter;
        this.cvRoutes = document.createElement('canvas'); this.cvRoutes.width = C.w; this.cvRoutes.height = C.h; this.texRoutes = new THREE.CanvasTexture(this.cvRoutes); this.texRoutes.flipY = false;
      }
      if (this.solMesh && this.solMesh.userData.uniformes) { const u = this.solMesh.userData.uniformes; for (const k in this.details) u['t' + k[0].toUpperCase() + k.slice(1)].value = this.details[k]; u.tPoids.value = this.texPoids; }
    }
    // propriétaires (r = peuple + 1), provinces (g = province + 1), couleurs des peuples, routes : refaits quand une province change de main
    majPeuples() {
      const C = this.j.carte, E = this.j.etat, d = this.dataPeuples, own = E.provinces.map(p => p.owner);
      for (let k = 0; k < C.w * C.h; k++) { const a = C.pix[k]; d[k * 4] = a < 0 ? 0 : own[a] + 1; d[k * 4 + 1] = a < 0 ? 0 : a + 1; d[k * 4 + 2] = 0; d[k * 4 + 3] = 255; }
      this.texPeuples.flipY = false; this.texPeuples.needsUpdate = true;
      E.nations.forEach((N, i) => { const c = PM.hex(N.couleur); this.palette[(i + 1) * 4] = c[0]; this.palette[(i + 1) * 4 + 1] = c[1]; this.palette[(i + 1) * 4 + 2] = c[2]; this.palette[(i + 1) * 4 + 3] = 255; });
      this.texPalette.needsUpdate = true;
      const t = this.cvRoutes.getContext('2d'); t.clearRect(0, 0, C.w, C.h); t.lineCap = 'round';
      const routes = [];
      for (const p of C.provinces) for (const q of p.voisins) if (q > p.id && own[p.id] >= 0 && own[q] === own[p.id]) routes.push([p, C.provinces[q]]);
      for (const [lw, st] of [[3, 'rgba(64,46,30,.5)'], [1.8, 'rgba(176,146,104,.95)']]) {
        t.lineWidth = lw; t.strokeStyle = st;
        for (const [p, q] of routes) {
          const mx = (p.lx + q.lx) / 2 + (((p.id * 31 + q.id * 17) % 13) - 6) * 3.2, my = (p.ly + q.ly) / 2 + (((p.id * 13 + q.id * 7) % 11) - 5) * 3.2;
          if (C.pix[Math.round(my) * C.w + Math.round(mx)] < 0) continue;
          t.beginPath(); t.moveTo(p.lx, p.ly); t.quadraticCurveTo(mx, my, q.lx, q.ly); t.stroke();
        }
      }
      t.setLineDash([5, 7]); t.lineWidth = 1.5; t.strokeStyle = 'rgba(240,248,255,.55)';
      for (const p of C.provinces) for (const q of p.mer) if (q > p.id) { const Q = C.provinces[q]; t.beginPath(); t.moveTo(p.lx, p.ly); t.lineTo(Q.lx, Q.ly); t.stroke(); }
      t.setLineDash([]); this.texRoutes.needsUpdate = true;
    }
    construireSol() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, pos = new Float32Array(gx * gz * 3), idx = new Uint32Array((gx - 1) * (gz - 1) * 6);
      let q = 0;
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const o = k * gx + i; pos[o * 3] = Math.min(C.w, i * this.pas); pos[o * 3 + 1] = this.H[o]; pos[o * 3 + 2] = Math.min(C.h, k * this.pas);
        if (i < gx - 1 && k < gz - 1) { idx[q++] = o; idx[q++] = o + gx; idx[q++] = o + 1; idx[q++] = o + 1; idx[q++] = o + gx; idx[q++] = o + gx + 1; }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
      if (this.solMesh) { this.monde.remove(this.solMesh); this.solMesh.geometry.dispose(); }
      const u = {
        tHerbe: { value: this.details.herbe }, tForet: { value: this.details.foret }, tSec: { value: this.details.sec }, tSable: { value: this.details.sable }, tRoche: { value: this.details.roche }, tNeige: { value: this.details.neige },
        tPoids: { value: this.texPoids }, tPeuples: { value: this.texPeuples }, tPalette: { value: this.texPalette }, tRoutes: { value: this.texRoutes },
        uTaille: { value: new THREE.Vector2(C.w, C.h) }, uT: this.uVent.uT, uSel: { value: -1 }, uSurvol: { value: -1 }, uCible: { value: 0 },
        uNeigeNiveau: { value: 70 }, uNeigePartout: { value: 0 }, uNuages: { value: 0.5 }
      };
      const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
      m.onBeforeCompile = sh => {
        Object.assign(sh.uniforms, u);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSolM; varying vec3 vSolN;')
          .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSolM = (modelMatrix * vec4(transformed, 1.0)).xyz; vSolN = normalize(mat3(modelMatrix) * objectNormal);');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vSolM; varying vec3 vSolN;
uniform sampler2D tHerbe, tForet, tSec, tSable, tRoche, tNeige, tPoids, tPeuples, tPalette, tRoutes;
uniform vec2 uTaille; uniform float uT, uSel, uSurvol, uCible, uNeigeNiveau, uNeigePartout, uNuages;
float hS(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float nS(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hS(i), hS(i + vec2(1, 0)), f.x), mix(hS(i + vec2(0, 1)), hS(i + vec2(1, 1)), f.x), f.y); }
vec3 lin3(vec3 v) { return pow(max(v, 0.0), vec3(2.2)); }
vec3 det(sampler2D t, vec2 p, float e) { return lin3(mix(texture2D(t, p * e).rgb, texture2D(t, p * e * 0.23 + 0.37).rgb, 0.35)); }
vec4 peuple(vec2 p) { return texture2D(tPeuples, clamp(p / uTaille, 0.0, 1.0)); }
float caus(vec2 p) { float s = 0.0; for (int i = 0; i < 3; i++) { p = vec2(p.x + sin(p.y + uT * 0.7), p.y + cos(p.x - uT * 0.6)) * 1.3; s += abs(sin(p.x) * sin(p.y)); } return s / 3.0; }`)
          .replace('#include <map_fragment>', `
vec2 p = vSolM.xz; float alt = vSolM.y;
vec4 w = texture2D(tPoids, clamp(p / uTaille, 0.0, 1.0)); w /= max(0.001, w.r + w.g + w.b + w.a);
float macro = nS(p * 0.006) * 0.55 + nS(p * 0.023) * 0.3 + nS(p * 0.09) * 0.15;
vec3 c = det(tHerbe, p, 0.075) * w.r + det(tForet, p, 0.08) * w.g + det(tSec, p, 0.07) * w.b + det(tSable, p, 0.06) * w.a;
c *= 0.84 + macro * 0.32;
float pente = 1.0 - clamp(vSolN.y, 0.0, 1.0);
vec3 roche = lin3(mix(texture2D(tRoche, p * 0.035).rgb, texture2D(tRoche, vec2(p.x + p.y, alt * 1.6) * 0.035).rgb, smoothstep(0.25, 0.6, pente)));
float fr = clamp(smoothstep(0.22, 0.45, pente + (macro - 0.5) * 0.18) + smoothstep(24.0, 48.0, alt) * 0.55, 0.0, 1.0);
c = mix(c, roche, fr);
float plage = clamp(1.0 - smoothstep(0.3, 1.5, alt + (macro - 0.5) * 1.0), 0.0, 1.0);
c = mix(c, det(tSable, p, 0.09), plage);
if (alt < 0.0) { float prof = clamp(-alt / 26.0, 0.0, 1.0); c = mix(det(tSable, p, 0.09), c, 0.3) * mix(vec3(0.95), vec3(0.32, 0.5, 0.56), prof); c += vec3(0.55, 0.7, 0.65) * pow(caus(p * 0.12), 4.0) * (1.0 - prof) * 0.35; }
float neige = smoothstep(uNeigeNiveau, uNeigeNiveau + 9.0, alt + macro * 10.0) * (1.0 - smoothstep(0.6, 0.85, pente));
neige = max(neige, uNeigePartout * smoothstep(0.55, 0.25, pente) * smoothstep(1.2, 2.5, alt) * clamp(0.7 + macro * 0.6, 0.0, 1.0));
c = mix(c, det(tNeige, p, 0.05), clamp(neige, 0.0, 1.0));
vec4 rt = texture2D(tRoutes, clamp(p / uTaille, 0.0, 1.0)); c = mix(c, lin3(rt.rgb), rt.a * (1.0 - neige * 0.6) * step(0.0, alt));
// territoires : frontières nettes à toute distance, halo intérieur, teinte légère ; provinces séparées d'un trait fin
vec4 ici = peuple(p); float o = floor(ici.r * 255.0 + 0.5), pr = floor(ici.g * 255.0 + 0.5);
if (alt > -0.5 && o > 0.0) {
  vec3 col = lin3(texture2D(tPalette, vec2((o + 0.5) / 64.0, 0.5)).rgb);
  // part des points voisins (deux cercles) qui appartiennent au même peuple : frontière lisse et halo, la mer ne compte pas
  float m1 = 0.0, m2 = 0.0, mp = 0.0;
  for (int k = 0; k < 8; k++) { float an = float(k) * 0.7854 + 0.39; vec2 dd = vec2(cos(an), sin(an));
    vec4 a = peuple(p + dd * 1.5), b = peuple(p + dd * 3.6), c2 = peuple(p + dd * 0.9);
    m1 += (a.g > 0.0 && floor(a.r * 255.0 + 0.5) != o) ? 1.0 : 0.0; m2 += (b.g > 0.0 && floor(b.r * 255.0 + 0.5) != o) ? 1.0 : 0.0; mp += (c2.g > 0.0 && floor(c2.g * 255.0 + 0.5) != pr) ? 1.0 : 0.0; }
  m1 /= 8.0; m2 /= 8.0; mp /= 8.0;
  float ligne = smoothstep(0.08, 0.45, m1), halo = smoothstep(0.0, 0.5, m2) * (1.0 - ligne), fine = smoothstep(0.1, 0.5, mp) * (1.0 - ligne);
  c = mix(c, col, 0.1);
  c = mix(c, col * 1.1 + 0.06, halo * 0.3);
  c = mix(c, min(col * 1.35 + 0.2, vec3(1.0)), ligne * 0.9);
  c *= 1.0 - fine * 0.25;
}
if (pr - 1.0 == uSel && uSel >= 0.0) c = mix(c, vec3(1.0, 0.96, 0.82), 0.14 + 0.05 * sin(uT * 3.0));
if (pr - 1.0 == uSurvol && uSurvol >= 0.0) c = mix(c, uCible > 0.5 ? vec3(1.0, 0.4, 0.3) : vec3(1.0, 0.97, 0.85), 0.12);
// ombres des nuages qui passent
float nu = smoothstep(0.52, 0.78, nS(p * 0.0042 + vec2(uT * 0.011, uT * 0.006)) * 0.7 + nS(p * 0.012 - uT * 0.01) * 0.3);
c *= 1.0 - nu * uNuages * 0.38;
diffuseColor.rgb *= c;`);
      };
      this.solMesh = new THREE.Mesh(g, m); this.solMesh.receiveShadow = true; this.solMesh.userData.uniformes = u; this.monde.add(this.solMesh);
      this.terrain = this.solMesh;
    }
    construireEau() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, data = new Uint8Array(gx * gz * 4);
      for (let o = 0; o < gx * gz; o++) { const v = Math.max(0, Math.min(255, (-this.H[o] / 28) * 255)); data[o * 4] = v; data[o * 4 + 3] = 255; }
      const prof = new THREE.DataTexture(data, gx, gz, THREE.RGBAFormat); prof.magFilter = THREE.LinearFilter; prof.minFilter = THREE.LinearFilter; prof.flipY = false; prof.needsUpdate = true;
      const geo = new THREE.PlaneGeometry(C.w * 8, C.h * 8, 1, 1).rotateX(-Math.PI / 2);
      this.eau = new THREE.Mesh(geo, materiauEau(prof, C.w, C.h)); this.eau.position.set(C.w / 2, 0, C.h / 2); this.eau.renderOrder = 2; this.monde.add(this.eau);
      const fond = new THREE.Mesh(new THREE.PlaneGeometry(C.w * 8, C.h * 8).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0f2c44 })); fond.position.set(C.w / 2, -42, C.h / 2); this.monde.add(fond);
    }
    // forêts denses (sapins au nord et en montagne, feuillus ailleurs), buissons, rochers, palmiers ; feuillages teintés par le pack et agités par le vent
    construireNature() {
      const C = this.j.carte, E = this.j.etat, rnd = PM.aleatoire((E.reglages.graine || 1) * 13 + 7), centres = C.provinces.map(p => [p.lx, p.ly]);
      const L = { sapin: [], feuillu: [], buisson: [], rocher: [], palmier: [] };
      for (let y = 2; y < C.h; y += 3.6) for (let x = 2; x < C.w; x += 3.6) {
        const px = x + (rnd() - 0.5) * 3.6, pz = y + (rnd() - 0.5) * 3.6, p = C.pix[Math.min(C.h - 1, Math.round(pz)) * C.w + Math.min(C.w - 1, Math.round(px))];
        if (p < 0) continue; const hh = this.sol(px, pz); if (hh < 2.2) continue;
        const c = centres[p]; if ((c[0] - px) ** 2 + (c[1] - pz) ** 2 < 30 * 30) continue;
        const wF = this.poidsA('foret', px, pz), wM = this.poidsA('montagne', px, pz), wC = this.poidsA('collines', px, pz), wD = this.poidsA('desert', px, pz), r = rnd();
        if (hh > 64) { if (r < 0.05) L.rocher.push([px, pz, 0.8 + rnd(), rnd()]); continue; }
        // lisières : la densité suit le poids de la forêt, avec des clairières
        const clairiere = 0.5 + 0.5 * Math.sin(px * 0.045 + Math.sin(pz * 0.03) * 2) * Math.sin(pz * 0.05);
        if (r < wF * (0.5 + clairiere * 0.35) + wC * 0.06 + (1 - wF - wM - wC - wD) * 0.022) (pz < C.h * 0.45 || wM > 0.2 || rnd() < 0.35 ? L.sapin : L.feuillu).push([px, pz, 0.7 + rnd() * 0.75, rnd()]);
        else if (r < wF * 0.66 + 0.035 && wD < 0.3) L.buisson.push([px, pz, 0.6 + rnd() * 0.9, rnd()]);
        else if (r < 0.05 + wM * 0.24 + wC * 0.05) L.rocher.push([px, pz, 0.5 + rnd() * (0.8 + wM * 1.8), rnd()]);
        else if (wD > 0.5 && r < 0.09) L.palmier.push([px, pz, 0.8 + rnd() * 0.5, rnd()]);
      }
      this.listesNature = L;
      if (this.nature) for (const m of this.nature) this.monde.remove(m);
      const pose = (nom) => (o, a, c) => { o.position.set(a[0], this.sol(a[0], a[1]) - (nom === 'rocher' ? 0.5 : 0.1), a[1]); o.rotation.set(0, a[3] * 6.28, 0); o.scale.setScalar(a[2]); c.setRGB(1, 1, 1); };
      const vent = (nom, amp) => this.instVent(nom, L[nom.replace(/Tronc|Feuilles/, '')], pose(nom.replace(/Tronc|Feuilles/, '')), amp);
      this.nature = [vent('sapinTronc', 0.01), vent('sapinFeuilles', 0.045), vent('feuilluTronc', 0.01), vent('feuilluFeuilles', 0.05), vent('palmierTronc', 0.02), vent('palmierFeuilles', 0.07),
        this.instVent('buisson', L.buisson, pose('buisson'), 0.06), this.inst('rocher', L.rocher, pose('rocher'), { flatShading: true })];
      this.natureParNom = {}; for (const m of this.nature) this.natureParNom[m.userData.nom] = m;
      for (const m of this.nature) this.monde.add(m);
    }
    instVent(nom, l, f, amp) { const m = this.inst(nom, l, f, null, avecVent(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, flatShading: /Feuilles|buisson/.test(nom) }), amp, this.uVent)); m.userData.nom = nom; return m; }
    // couleurs des feuillages selon le pack (automne, hiver…), variées d'un arbre à l'autre
    colorerNature() {
      if (!this.natureParNom) return;
      const A = this.pack.arbres, c = new THREE.Color();
      const teindre = (nom, liste) => { const m = this.natureParNom[nom], l = this.listesNature[nom.replace(/Tronc|Feuilles/, '')]; if (!m || !l) return; l.forEach((a, i) => { c.set(liste[Math.floor(a[3] * 9973) % liste.length]).convertSRGBToLinear(); const v = 0.86 + ((a[0] * 3.7) % 1) * 0.28; c.multiplyScalar(v); m.setColorAt(i, c); }); if (m.instanceColor) m.instanceColor.needsUpdate = true; };
      teindre('sapinFeuilles', A.sapin); teindre('feuilluFeuilles', A.feuillu); teindre('palmierFeuilles', [A.palmier]); teindre('buisson', A.feuillu);
    }
    // herbe : des milliers de touffes près des villes et dans les prairies, visibles de près
    construireHerbe() {
      const C = this.j.carte, rnd = PM.aleatoire(99), l = [];
      if (this.herbe) this.monde.remove(this.herbe);
      for (let t = 0; t < 200000 && l.length < 52000 * (this.Q ? Math.max(0.3, this.Q.herbe) : 1); t++) {
        const x = rnd() * C.w, z = rnd() * C.h, p = C.pix[Math.floor(z) * C.w + Math.floor(x)]; if (p < 0) continue;
        const h = this.sol(x, z); if (h < 2 || h > 40) continue;
        const wP = this.poidsA('plaine', x, z), wC = this.poidsA('collines', x, z), wF = this.poidsA('foret', x, z);
        if (rnd() > wP * 0.9 + wC * 0.6 + wF * 0.35) continue;
        const c = C.provinces[p]; if ((c.lx - x) ** 2 + (c.ly - z) ** 2 < 14 * 14) continue;
        l.push([x, z, 0.9 + rnd() * 0.9, rnd()]);
      }
      this.listeHerbe = l;
      const mat = avecVent(new THREE.MeshStandardMaterial({ map: this.texHerbe || (this.texHerbe = texHerbe()), alphaTest: 0.45, vertexColors: true, roughness: 0.9, metalness: 0 }), 0.22, this.uVent);
      const m = new THREE.InstancedMesh(this.geoHerbe || (this.geoHerbe = geoHerbe()), mat, Math.max(1, l.length)), o = new THREE.Object3D();
      l.forEach((a, i) => { o.position.set(a[0], this.sol(a[0], a[1]) - 0.05, a[1]); o.rotation.set(0, a[3] * 6.28, 0); o.scale.set(a[2], a[2] * (0.8 + a[3] * 0.5), a[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(1, 1, 1)); });
      m.count = l.length; m.receiveShadow = true; this.herbe = m; this.monde.add(m);
    }
    colorerHerbe() {
      if (!this.herbe) return; const c = new THREE.Color(), H = this.pack.herbe;
      this.listeHerbe.forEach((a, i) => { c.set(H[Math.floor(a[3] * 7919) % H.length]).convertSRGBToLinear().multiplyScalar(0.85 + a[2] * 0.15); this.herbe.setColorAt(i, c); });
      if (this.herbe.instanceColor) this.herbe.instanceColor.needsUpdate = true;
    }
    inst(nom, l, f, opts, matPerso) {
      const geo = this.M[nom], m = new THREE.InstancedMesh(geo, matPerso || this.mat(Object.assign({ vertexColors: true }, opts || {})), Math.max(1, l.length)), o = new THREE.Object3D(), c = new THREE.Color();
      l.forEach((a, i) => { f(o, a, c); c.convertSRGBToLinear(); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c); });
      m.count = l.length; m.castShadow = true; m.receiveShadow = true; return m;
    }
    // nuages : visibles de loin, ils dérivent lentement
    construireNuages() {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      for (let i = 0; i < 18; i++) { const x = 30 + Math.random() * 68, y = 40 + Math.random() * 48, r = 18 + Math.random() * 26, d = g.createRadialGradient(x, y, 0, x, y, r); d.addColorStop(0, 'rgba(255,255,255,.55)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, 128, 128); }
      const t = new THREE.CanvasTexture(c), C = this.j.carte, rnd = PM.aleatoire(5);
      this.nuages = [];
      for (let i = 0; i < 16; i++) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false, opacity: 0 }));
        s.position.set(rnd() * C.w, 230 + rnd() * 120, rnd() * C.h); s.scale.set(260 + rnd() * 260, 120 + rnd() * 80, 1); s.userData.v = 2 + rnd() * 4;
        this.monde.add(s); this.nuages.push(s);
      }
    }
    // villes : instances refaites quand une province change (propriétaire, niveau, bâtiments, merveille)
    construireVilles() {
      const E = this.j.etat, C = this.j.carte, ep = this.epoque, nuit = !!this.pack.nuit;
      const sig = E.provinces.map(p => [p.owner, p.dev, Object.keys(p.bat).join(''), p.merveille ? 1 : 0, p.owner >= 0 && E.nations[p.owner].capitale === p.id ? 1 : 0].join('.')).join('|');
      if (sig + nuit === this.sigVilles) return; this.sigVilles = sig + nuit;
      for (const k in this.instances) this.monde.remove(this.instances[k]);
      const L = {}, mettre = (nom, x, z, rot, s, couleur, sy) => (L[nom] = L[nom] || []).push([x, z, rot || 0, s || 1, couleur == null ? 0xffffff : couleur, sy]);
      for (const P of E.provinces) {
        const c = C.provinces[P.id], N = P.owner >= 0 ? E.nations[P.owner] : null, rnd = PM.aleatoire(P.id * 977 + 3), x0 = c.lx, z0 = c.ly, cap = N && N.capitale === P.id;
        const maison = !N ? 'hutte' : MAISON_EPOQUE[ep] || 'maison_' + N.pantheon;
        mettre('place', x0, z0, 0, 6 + P.dev * 1.6 + (cap ? 3 : 0), 0xffffff, 1);
        if (nuit && N) for (let i = 0; i < 4 + (cap ? 3 : 0); i++) { const a = i / (4 + (cap ? 3 : 0)) * 6.28 + 0.4, R = 5 + P.dev * 1.4 + (cap ? 3 : 0); mettre('poteau', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); mettre('flamme', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1, 0xffffff); }
        const n = (N ? 3 + P.dev * 2 : 2 + P.dev) + (cap ? 5 : 0);
        for (let i = 0; i < n; i++) {
          const a = rnd() * Math.PI * 2, r = 5 + rnd() * (5 + P.dev * 1.5), v = 0.86 + rnd() * 0.28;
          const hx = x0 + Math.cos(a) * r, hz = z0 + Math.sin(a) * r, rot = rnd() * 6.28, sc = 0.85 + rnd() * 0.3;
          mettre(maison, hx, hz, rot, sc, new THREE.Color(v, v * (0.97 + rnd() * 0.05), v * (0.94 + rnd() * 0.08)).getHex());
          if (nuit && N && rnd() < 0.8) { const dz = maison === 'maison_atlantes' || maison === 'maison_futur' ? 1.75 : 1.58; mettre('lumiere', hx + Math.sin(rot) * dz * sc, hz + Math.cos(rot) * dz * sc, rot, sc, 0xffffff); }
        }
        if (cap) { mettre(ep === 'antique' ? 'centre_antique' : 'centre_' + ep, x0, z0, 0.3, 1); mettre('drapeau', x0 + 4, z0 + 3, 0, 1, new THREE.Color(N.couleur).getHex()); }
        else if (N) mettre('drapeau', x0 + 2, z0 + 2, 0, 0.75, new THREE.Color(N.couleur).getHex());
        if (P.bat.temple) mettre(TEMPLE_EPOQUE[ep] || 'temple_' + (N ? N.pantheon : 'grecs'), x0 + 10, z0 - 8, 0.25, 1);
        if (P.bat.ferme) for (let i = 0; i < 4; i++) { const a = 2 + i * 0.6, r = 19 + (i % 2) * 4; mettre('champ', x0 + Math.cos(a) * r, z0 + Math.sin(a) * r, a, 1, i % 2 ? 0xfff2c0 : 0xffffff); }
        if (P.bat.scierie) mettre('bois', x0 - 16, z0 - 5, 0.4, 1);
        if (P.bat.mine) mettre('mine', x0 - 13, z0 + 11, 0.2, 1.1);
        if (P.bat.remparts) {
          const R = 15 + P.dev * 1.2;
          if (ep === 'futur') mettre('bouclier', x0, z0, 0, R, 0xffffff, 0.5);
          else if (ep === 'moderne') for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; mettre('bunker', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); }
          else { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; mettre('mur', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, -a + Math.PI / 2, 1, 0xffffff, R / 16); } for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.26; mettre('tourelle', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); } }
        }
        if (P.merveille) mettre('merveille_' + (ep === 'antique' ? 'antique' : ep), x0 - 4, z0 + 16, 0.4, 1);
      }
      this.instances = {};
      for (const nom in L) {
        const futur = nom === 'bouclier';
        const m = this.inst(nom, L[nom], (o, a, c) => {
          o.position.set(a[0], this.sol(a[0], a[1]) - (nom === 'place' ? 0.05 : 0.3), a[1]); o.rotation.set(0, a[2], 0);
          if (nom === 'place') o.scale.set(a[3], 1, a[3]); else if (nom === 'bouclier') o.scale.set(a[3], a[3] * 0.5, a[3]); else if (nom === 'mur') o.scale.set(a[5] || 1, 1, 1); else o.scale.setScalar(a[3]);
          c.set(a[4]);
        }, futur ? { transparent: true, opacity: 0.28, emissive: 0x2299aa, depthWrite: false } : nom === 'lumiere' || nom === 'flamme' ? { emissive: nom === 'flamme' ? 0xff9a3a : 0xffc070, emissiveIntensity: nom === 'flamme' ? 4 : 2.6, color: 0x000000 } : nom.endsWith('_futur') ? { emissive: 0x0a2a30 } : null);
        if (nom === 'place' || futur || nom === 'lumiere' || nom === 'flamme') m.castShadow = false;
        this.instances[nom] = m; this.monde.add(m);
      }
    }
    // ---------- armées : figurines en formation ----------
    pieces() {
      if (this.P) return this.P;
      const MAX = 3500, mk = nom => { const m = new THREE.InstancedMesh(this.M[nom], this.mat({ vertexColors: true, roughness: 0.7 }), MAX); m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; this.scene.add(m); return m; };
      this.P = { fantassin: mk('fantassin'), cavalier: mk('cavalier'), char: mk('char'), engin: mk('engin'), geant: mk('geant'), meca: mk('meca'), etendard: mk('etendard') };
      return this.P;
    }
    positionArmee(a, rang) {
      const C = this.j.carte, p = C.provinces[a.prov]; let x = p.lx + 18 + rang * 13, z = p.ly + 8, dir = Math.PI;
      if (a.chemin.length) {
        const q = C.provinces[a.chemin[0]], cout = PM.TERRAINS[this.j.etat.provinces[a.chemin[0]].terrain].move + (p.mer.includes(q.id) ? 1.5 : 0);
        const t = Math.min(0.92, (a.avance + (this.r2d.fraction || 0) * PM.vitesse(this.j, a)) / cout);
        x = p.lx + (q.lx - p.lx) * t; z = p.ly + (q.ly - p.ly) * t; dir = Math.atan2(q.lx - p.lx, q.ly - p.ly);
      }
      return { x, z, dir };
    }
    majArmees() {
      const E = this.j.etat, P = this.pieces(), o = new THREE.Object3D(), col = new THREE.Color(), t = this.temps / 1000, ep = this.epoque;
      const n = {}; for (const k in P) n[k] = 0;
      const rangs = {}, combats = new Set((this.j.anims || []).filter(a => a.type === 'bataille').map(a => a.prov));
      this.positions = [];
      const ajouter = (k, x, y, z, rot, s, couleur) => { const i = n[k]++; if (i >= 3500) return; o.position.set(x, y, z); o.rotation.set(0, rot, 0); o.scale.setScalar(s); o.updateMatrix(); P[k].setMatrixAt(i, o.matrix); P[k].setColorAt(i, col.set(couleur).convertSRGBToLinear()); };
      const monture = ep === 'moderne' ? 'char' : ep === 'futur' ? 'char' : 'cavalier', grand = ep === 'futur' || ep === 'moderne' || ep === 'industriel' ? 'meca' : 'geant';
      for (const a of E.armees) {
        const rang = rangs[a.prov] = (rangs[a.prov] || 0) + 1, pos = this.positionArmee(a, rang - 1), N = E.nations[a.owner];
        const marche = a.chemin.length > 0, combat = combats.has(a.prov) || (E.provinces[a.prov].siege && E.provinces[a.prov].siege.par === a.owner);
        const tot = PM.effectif(a), F = Math.max(3, Math.min(36, Math.round(Math.sqrt(tot) * 2.4))), parts = [], cats = {};
        for (const u in a.unites) { const c = PM.UNITES[u].cat; cats[c] = (cats[c] || 0) + a.unites[u] * (c === 'mythe' ? 3 : 1); }
        const somme = Object.values(cats).reduce((s, x) => s + x, 0) || 1;
        for (const c of ['mythe', 'heros', 'cav', 'siege', 'archer', 'inf', 'milice']) { const k = Math.round(F * (cats[c] || 0) / somme); for (let i = 0; i < k; i++) parts.push(c); }
        if (!parts.length) parts.push('inf');
        const cos = Math.cos(pos.dir), sin = Math.sin(pos.dir), largeur = 6, coul = new THREE.Color(N.couleur).getHex();
        parts.forEach((c, i) => {
          const lig = Math.floor(i / largeur), colI = i % largeur, gx = (colI - (largeur - 1) / 2) * 2.2 + (lig % 2) * 0.6, gz = -lig * 2.5;
          let x = pos.x + gx * cos + gz * sin, z = pos.z - gx * sin + gz * cos, y = this.sol(x, z);
          if (marche) y += Math.abs(Math.sin(t * 9 + i)) * 0.4;
          if (combat) { x += Math.sin(t * 13 + i * 1.7) * 0.7; z += Math.cos(t * 11 + i) * 0.7; }
          if (c === 'mythe') ajouter(grand, x, y, z, pos.dir, 2.3, new THREE.Color(coul).multiplyScalar(0.7).getHex());
          else if (c === 'cav') ajouter(monture, x, y, z, pos.dir, 1, coul);
          else if (c === 'siege') ajouter('engin', x, y, z, pos.dir, 1, coul);
          else ajouter('fantassin', x, y, z, pos.dir, c === 'heros' ? 1.3 : 1, c === 'heros' ? 0xf0c85a : coul);
        });
        { const ex = pos.x + 2.6 * cos + 1.2 * sin, ez = pos.z - 2.6 * sin + 1.2 * cos; ajouter('etendard', ex, this.sol(ex, ez) + (marche ? Math.abs(Math.sin(t * 9)) * 0.3 : 0), ez, pos.dir + Math.sin(t * 2 + a.id) * 0.25, 1, coul); }
        this.positions.push({ id: a.id, x: pos.x, z: pos.z });
      }
      for (const k in P) { P[k].count = Math.min(3500, n[k]); P[k].instanceMatrix.needsUpdate = true; if (P[k].instanceColor) P[k].instanceColor.needsUpdate = true; }
    }
    // ---------- caméra (avec inertie) ----------
    tangage(d) { return Math.max(0.68, Math.min(1.18, 0.6 + d / 1500)); }
    placerCamera(dt) {
      const c = this.cam, v = this.vise, k = 1 - Math.exp(-(dt || 16) / 90);
      for (const p of ['x', 'z', 'd', 'lacet']) c[p] += (v[p] - c[p]) * k;
      const phi = this.tangage(c.d), y0 = Math.max(0, this.sol(c.x, c.z) * 0.6);
      this.camera.position.set(c.x + Math.sin(c.lacet) * c.d * Math.cos(phi), y0 + c.d * Math.sin(phi), c.z + Math.cos(c.lacet) * c.d * Math.cos(phi));
      this.camera.lookAt(c.x, y0, c.z);
      this.scene.fog.near = c.d * 1.1 / (this.pack.brume || 1); this.scene.fog.far = (c.d * 3.4 + 500) / (this.pack.brume || 1);
      // profondeur ajustée au zoom (précision de l'occlusion ambiante), ciel autour de la caméra
      const far = c.d * 6 + 2500; if (Math.abs(this.camera.far - far) > 1) { this.camera.near = Math.max(1, c.d * 0.05); this.camera.far = far; this.camera.updateProjectionMatrix(); }
      this.ciel.position.copy(this.camera.position); this.ciel.scale.setScalar(far * 0.85);
      // ombres : la zone couverte suit la caméra
      const s = this.soleil, L = Math.max(120, Math.min(1100, c.d * 1.25));
      s.position.set(c.x + this.dirSoleil.x * 700, this.dirSoleil.y * 700, c.z + this.dirSoleil.z * 700); s.target.position.set(c.x, 0, c.z);
      const cs = s.shadow.camera; if (cs.right !== L) { cs.left = -L; cs.right = L; cs.top = L; cs.bottom = -L; cs.near = 50; cs.far = 1800; cs.updateProjectionMatrix(); }
    }
    cadrer() { const C = this.j.carte; Object.assign(this.vise, { x: C.w / 2, z: C.h / 2 + C.h * 0.05, d: Math.max(C.w, C.h) * 0.92 }); }
    centrerSur(p, z) { const c = this.j.carte.provinces[p]; this.vise.x = c.lx; this.vise.z = c.ly; if (z) this.vise.d = Math.max(80, Math.min(1500, 520 / z)); }
    deplacer(dx, dy) {
      const v = this.vise, h = this.cv.clientHeight || 800, k = 2 * v.d * Math.tan(this.camera.fov * Math.PI / 360) / h, phi = this.tangage(v.d);
      v.x -= Math.cos(v.lacet) * dx * k; v.z += Math.sin(v.lacet) * dx * k; v.x -= Math.sin(v.lacet) * dy * k / Math.sin(phi); v.z -= Math.cos(v.lacet) * dy * k / Math.sin(phi);
      const C = this.j.carte; v.x = Math.max(-120, Math.min(C.w + 120, v.x)); v.z = Math.max(-120, Math.min(C.h + 120, v.z));
    }
    zoomer(f, sx, sy) {
      const avant = this.pointSol(sx, sy), v = this.vise, d0 = v.d;
      v.d = Math.max(60, Math.min(1800, v.d / f));
      if (avant) { const k = 1 - v.d / d0; v.x += (avant.x - v.x) * k; v.z += (avant.z - v.z) * k; }
    }
    tourner(a) { this.vise.lacet += a; }
    // caméra immédiatement à sa place (essais, changement de vue)
    stabiliser() { Object.assign(this.cam, this.vise); this.placerCamera(1e6); this.majArmees(); this.etiquettes(Math.min(2, window.devicePixelRatio || 1)); }
    get z() { return 520 / this.vise.d; }
    // le rayon de la souris descend jusqu'au relief (marche le long du rayon, puis affinage)
    pointSol(sx, sy) {
      const w = this.cv.clientWidth, h = this.cv.clientHeight; this.ray.setFromCamera(new THREE.Vector2(sx / w * 2 - 1, -(sy / h) * 2 + 1), this.camera);
      const o = this.ray.ray.origin, d = this.ray.ray.direction; if (d.y >= 0) return null;
      const haut = (x, z) => Math.max(0, this.j ? this.sol(x, z) : 0);
      let t0 = 0, t1 = (o.y - 120) / -d.y; if (t1 < 0) t1 = 0;
      const pas = Math.max(2, this.cam.d / 160);
      for (let t = t1; t < t1 + 6000; t += pas) {
        const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
        if (y <= haut(x, z)) { t0 = t - pas; t1 = t; for (let i = 0; i < 12; i++) { const m = (t0 + t1) / 2; if (o.y + d.y * m <= haut(o.x + d.x * m, o.z + d.z * m)) t1 = m; else t0 = m; } return new THREE.Vector3(o.x + d.x * t1, o.y + d.y * t1, o.z + d.z * t1); }
        if (y < -50) break;
      }
      return null;
    }
    provinceA(sx, sy) {
      const C = this.j.carte, p = this.pointSol(sx, sy); if (!p) return -1;
      const x = Math.floor(p.x), y = Math.floor(p.z); if (x < 0 || y < 0 || x >= C.w || y >= C.h) return -1;
      return C.pix[y * C.w + x];
    }
    versEcran(x, y, h) {
      const v = new THREE.Vector3(x, (h || 0) + Math.max(0, this.sol(x, y)), y).project(this.camera), w = this.cv.clientWidth, H = this.cv.clientHeight;
      return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * H, devant: v.z < 1 };
    }
    armeeA(sx, sy) { for (const b of this.boites.slice().reverse()) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return b.id; return null; }
    ecranArmee(id) { const b = this.boites.find(x => x.id === id); return b ? { x: b.x + b.w / 2, y: b.y + b.h / 2 } : null; }
    // ---------- une image ----------
    dessiner(dt) {
      if (!this.j) return;
      this.temps += dt || 0; this.dt = dt; this.uVent.uT.value = this.temps / 1000;
      const w = this.cv.clientWidth, h = this.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (this.taille !== w + 'x' + h) {
        this.taille = w + 'x' + h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.et.width = w * dpr; this.et.height = h * dpr;
        this.creerPost(w, h);
      }
      const r = this.r2d, v = r.version;
      // relief modifié (éditeur) : reconstruit une fois les retouches finies, pas à chaque clic
      if (v.base !== this.vus.base && this.vus.base >= 0) { this.vus.base = v.base; this.reliefA = this.temps + 900; }
      if (this.reliefA && this.temps >= this.reliefA) { this.reliefA = 0; this.hauteurs(); this.texturesSol(); this.construireSol(); this.construireEau(); this.construireNature(); this.colorerNature(); this.construireHerbe(); this.colorerHerbe(); this.appliquerQualite(this.idQualite); this.sigVilles = ''; this.vus.calque = -1; }
      // propriétaires : au plus quatre fois par seconde (l'éditeur peint en glissant)
      if (v.calque !== this.vus.calque && !(this.peuplesA > this.temps)) { this.majPeuples(); this.vus.calque = v.calque; this.peuplesA = this.temps + 250; }
      this.vus.base = v.base; this.vus.halo = v.halo;
      const u = this.solMesh.userData.uniformes; u.uSel.value = r.selProv == null ? -1 : r.selProv;
      u.uSurvol.value = r.survol >= 0 && (r.cibleMode || (r.sel && r.sel.type === 'armee')) ? r.survol : -1; u.uCible.value = r.cibleMode ? 1 : 0;
      this.construireVilles();
      this.placerCamera(dt); this.majArmees();
      this.eau.material.uniforms.uT.value = this.temps / 1000;
      if (this.herbe) this.herbe.visible = this.Q.herbe > 0 && this.cam.d < 460;
      const nuage = Math.max(0, Math.min(this.pack.nuages.opacite, (this.cam.d - 520) / 700));
      for (const s of this.nuages) { s.material.opacity = nuage; s.position.x += s.userData.v * (dt || 16) / 1000; if (s.position.x > this.j.carte.w + 300) s.position.x = -300; }
      if (this.composer) {
        if (this.etal) { this.etal.uniforms.uT.value = this.temps / 1000; this.etal.uniforms.uRes.value.set(w, h); }
        if (this.tiltH) { const k = this.pack.post.maquette * Math.max(0.15, Math.min(1, 1.25 - this.cam.d / 900)); this.tiltH.uniforms.h.value = k * 2.2 / w; this.tiltV.uniforms.v.value = k * 2.2 / h; this.tiltH.uniforms.r.value = this.tiltV.uniforms.r.value = 0.52; }
        this.composer.render(dt / 1000);
      } else this.renderer.render(this.scene, this.camera);
      this.etiquettes(dpr);
    }
    // noms, blasons des armées, sièges, effets : dessinés en 2D par-dessus la scène
    etiquettes(dpr) {
      const ctx = this.ctx, E = this.j.etat, C = this.j.carte, w = this.cv.clientWidth, h = this.cv.clientHeight, d = this.cam.d;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const vis = e => e.devant && e.x > -60 && e.y > -60 && e.x < w + 60 && e.y < h + 60;
      if (d > 300) for (const l of this.r2d.etiquettes || []) {
        const e = this.versEcran(l.x, l.y, 24); if (!vis(e)) continue;
        const t = Math.max(15, Math.min(46, l.taille * 470 / d)), N = E.nations[l.n], txt = N.nom.toUpperCase().split('').join(' ');
        ctx.font = `700 ${t}px "Didot","Hoefler Text","Palatino",Georgia,serif`; ctx.globalAlpha = Math.min(0.95, (d - 300) / 220);
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, t / 6); ctx.strokeStyle = 'rgba(25,16,8,.55)'; ctx.strokeText(txt, e.x, e.y); ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 10; ctx.fillStyle = '#fff4dc'; ctx.fillText(txt, e.x, e.y); ctx.shadowBlur = 0;
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(60,40,15,.5)'; ctx.strokeText(txt, e.x, e.y); ctx.globalAlpha = 1;
      }
      for (const P of E.provinces) {
        const c = C.provinces[P.id];
        if (d < 560) {
          const e = this.versEcran(c.lx, c.ly + 2, 1);
          if (vis(e)) {
            const cap = P.owner >= 0 && E.nations[P.owner].capitale === P.id, nom = (cap ? '★ ' : '') + P.nom, f = Math.max(10, Math.min(14, 2800 / d));
            ctx.font = `600 ${f}px -apple-system,"Helvetica Neue",sans-serif`; const lw = ctx.measureText(nom).width + 14, y = e.y + 22;
            ctx.fillStyle = 'rgba(18,14,10,.62)'; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(e.x - lw / 2, y - f * 0.8, lw, f * 1.6, 6); else ctx.rect(e.x - lw / 2, y - f * 0.8, lw, f * 1.6); ctx.fill();
            if (P.owner >= 0) { ctx.fillStyle = E.nations[P.owner].couleur; ctx.fillRect(e.x - lw / 2 + 4, y + f * 0.55, lw - 8, 2); }
            ctx.fillStyle = cap ? '#ffe7a8' : '#fbf4e4'; ctx.fillText(nom, e.x, y + 0.5);
          }
        }
        if (P.siege) {
          const e = this.versEcran(c.lx, c.ly, 8); if (!vis(e)) continue;
          const prog = Math.min(1, P.siege.progres / PM.dureeSiege(this.j, P.id));
          ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, 13, 0, 7); ctx.stroke();
          ctx.strokeStyle = E.nations[P.siege.par].couleur; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(e.x, e.y, 13, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
          ctx.font = '14px serif'; ctx.fillText('🔥', e.x, e.y - 22);
        }
      }
      const r = this.r2d;
      if (r.survol >= 0 && (r.cibleMode || (r.sel && r.sel.type === 'armee'))) {
        const c = C.provinces[r.survol], e = this.versEcran(c.lx, c.ly, 1);
        ctx.strokeStyle = r.cibleMode ? 'rgba(255,90,60,.95)' : 'rgba(255,240,180,.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(e.x, e.y, 22, 12, 0, 0, 7); ctx.stroke();
      }
      const trace = (l, style) => { ctx.save(); ctx.strokeStyle = style; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); ctx.lineDashOffset = -this.temps / 40; ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 3; ctx.beginPath(); l.forEach((p, i) => { const c = C.provinces[p], e = this.versEcran(c.lx, c.ly, 1.5); i ? ctx.lineTo(e.x, e.y) : ctx.moveTo(e.x, e.y); }); ctx.stroke(); ctx.restore(); };
      for (const a of E.armees) if (a.chemin.length && (a.owner === E.joueur || (r.sel && r.sel.id === a.id))) trace([a.prov, ...a.chemin], r.sel && r.sel.id === a.id ? 'rgba(255,236,170,.95)' : 'rgba(255,236,170,.55)');
      if (r.chemin && r.chemin.length) trace(r.chemin, 'rgba(255,255,255,.75)');
      this.boites = [];
      for (const p of this.positions || []) {
        const a = E.armees.find(x => x.id === p.id); if (!a) continue;
        const e = this.versEcran(p.x, p.z, 10); if (!vis(e)) continue;
        const N = E.nations[a.owner], sel = r.sel && r.sel.type === 'armee' && r.sel.id === a.id, lw = 30, lh = 20, x = e.x - lw / 2, y = e.y - lh / 2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 5; ctx.fillStyle = N.couleur; ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + lw, y); ctx.lineTo(x + lw, y + lh * 0.7); ctx.quadraticCurveTo(x + lw / 2, y + lh * 1.25, x, y + lh * 0.7); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = sel ? 2.5 : 1.2; ctx.strokeStyle = sel ? '#fff3c4' : 'rgba(255,255,255,.85)'; ctx.stroke();
        const eff = Math.round(PM.effectif(a)); ctx.fillStyle = '#fff'; ctx.font = '700 11px -apple-system,"Helvetica Neue",sans-serif'; ctx.fillText(eff > 999 ? Math.round(eff / 100) / 10 + 'k' : String(eff), e.x, e.y + 1);
        if (a.paralysie) { ctx.font = '11px serif'; ctx.fillText('💫', x + 2, y); }
        ctx.restore();
        this.boites.push({ id: a.id, x, y, w: lw, h: lh + 4 });
      }
      const A = this.j.anims || [];
      for (const an of A) {
        an.t += this.dt || 16;
        const c = C.provinces[an.prov]; if (!c) continue;
        const e = this.versEcran(c.lx, c.ly, 4), k = an.t / 1600; if (!vis(e)) continue;
        if (an.type === 'bataille') { ctx.globalAlpha = Math.max(0, 1 - k); ctx.font = `${20 + k * 14}px serif`; ctx.fillText('⚔️', e.x, e.y - 26 - k * 24); }
        else if (an.type === 'pouvoir') {
          ctx.globalAlpha = Math.max(0, 1 - k * 0.8); const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 30 + k * 120); g.addColorStop(0, 'rgba(255,245,210,.85)'); g.addColorStop(1, 'rgba(255,245,210,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(e.x, e.y, 30 + k * 120, 0, 7); ctx.fill();
          if (k < 0.5) { ctx.strokeStyle = 'rgba(255,255,235,.95)'; ctx.lineWidth = 3.5 * (1 - k * 2); ctx.beginPath(); ctx.moveTo(e.x - 10, 0); ctx.lineTo(e.x + 9, e.y * 0.35); ctx.lineTo(e.x - 7, e.y * 0.62); ctx.lineTo(e.x + 4, e.y * 0.82); ctx.lineTo(e.x, e.y); ctx.stroke(); }
          ctx.fillStyle = '#fff'; ctx.font = `${34 + k * 30}px serif`; ctx.fillText(an.emoji, e.x, e.y - 30 - k * 30);
        } else if (an.type === 'conquete') { ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = E.nations[an.owner] ? E.nations[an.owner].couleur : '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(e.x, e.y, 10 + k * 60, 5 + k * 32, 0, 0, 7); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      this.j.anims = A.filter(a => a.t < 1600);
    }
  }
  PM.Vue3D = Vue3D;
})(typeof window !== 'undefined' ? window : globalThis);
