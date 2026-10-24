/* Pax Mythica — vue 3D (three.js r180 hébergé dans vendor/three-pax.min.js), habillée par les packs graphiques (packs-graphiques.js)
   et par des ressources photographiques libres de droits (ressources/, CC0 : ambientCG, Poly Haven ; voir ressources/LICENCES.json).
   Sol : onze matières photographiques (herbe, prairie, sous-bois, terre, terre sèche, sable, roche, falaise, neige, chemin, pavés)
   mêlées au pixel selon le terrain, la pente, l'altitude et le relief propre de chaque texture, avec leur relief (normal map),
   leur rugosité et leur occlusion. Ciel photographique (HDR) qui éclaire toute la scène, soleil placé là où il est sur la photo,
   ombres fines, eau qui reflète le ciel avec vagues, transparence selon la profondeur et écume. Bâtiments : murs, toits, pavés et
   façades photographiques plaqués selon l'orientation des faces. Arbres et herbes en feuillages photographiques détourés, qui
   bougent au vent. Image finale : occlusion ambiante, halo lumineux, tons cinéma, étalonnage. Même interface que Rendu (rendu.js). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const THREE = G.THREE;
  // essai unique (chaque essai ouvrirait un contexte graphique de plus) ; le contexte d'essai est aussitôt rendu
  let possible = null;
  PM.vue3dPossible = function () {
    if (possible !== null) return possible;
    if (!THREE) return (possible = false);
    try { const g = document.createElement('canvas').getContext('webgl2'); possible = !!g; const x = g && g.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { possible = false; }
    return possible;
  };
  // bruit de valeur (relief et couleurs)
  function bruit(graine) {
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + graine * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const l = t => t * t * (3 - 2 * t);
    const v = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = l(x - i), w = l(y - j), a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
    return (x, y, o = 4) => { let s = 0, a = 0.5, f = 1, t = 0; for (let k = 0; k < o; k++) { s += v(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.1; } return s / t; };
  }
  // matières des bâtiments : chaque famille choisit une texture pour les murs, les pentes de toit et les dessus (MATIERES, plus bas)
  const MAT = { terre: 1, pierre: 2, gres: 3, bois: 4, verre: 5, neon: 6, panneau: 7, chaume: 8, ardoise: 9, colonne: 10, or: 13, acier: 14, dallage: 15, platre: 16, marbre: 17, beton: 18, immeuble: 19, moellons: 20, chateau: 21, champ: 22 };
  // couleurs des modèles reconnues directement
  const PAR_COULEUR = { 0xece4d2: MAT.platre, 0xe8dcc0: MAT.platre, 0xe6dfcf: MAT.marbre, 0xf1ece0: MAT.marbre, 0xd8d0bf: MAT.marbre, 0xd8cfbe: MAT.marbre, 0xeef6f5: MAT.marbre, 0xf6f1e4: MAT.colonne,
    0xbdb8ae: MAT.beton, 0xbab3a6: MAT.chateau, 0xb0a99c: MAT.chateau, 0xa19a8c: MAT.chateau, 0x958e80: MAT.chateau, 0xa8a294: MAT.moellons, 0xe0d8c8: MAT.chateau, 0xd9d1c0: MAT.chateau, 0xc4b8a2: MAT.dallage };
  function matiereDe(hex) {
    if (PAR_COULEUR[hex]) return PAR_COULEUR[hex];
    const c = new THREE.Color(); c.setHex(hex, THREE.SRGBColorSpace); const q = {}; c.getHSL(q, THREE.SRGBColorSpace); const h = q.h * 360, s = q.s, l = q.l, r = (hex >> 16) & 255, b = hex & 255;
    if (hex === 0xffffff || hex === 0xe2b48c) return 0;
    if (s > 0.8 && l > 0.6 && h > 165 && h < 205) return MAT.neon;
    if (h > 188 && h < 216 && s > 0.3 && l > 0.45 && l < 0.8) return MAT.verre;
    if (l > 0.88 && b > r + 4) return MAT.panneau;
    if (h > 185 && h < 232 && s < 0.2 && l > 0.5 && l < 0.75) return MAT.acier;
    if (h < 21 && s > 0.3 && l > 0.22 && l < 0.62) return MAT.terre;
    if (h >= 21 && h < 40 && s > 0.25 && l < 0.5) return MAT.bois;
    if (h > 36 && h < 56 && s > 0.7 && l > 0.5 && l < 0.8) return MAT.or;
    if (h > 30 && h < 52 && s > 0.3 && l > 0.555) return MAT.gres;
    if (h > 36 && h < 52 && s > 0.3 && s < 0.5 && l > 0.45) return MAT.chaume;
    if (h > 36 && h < 56 && s > 0.5) return MAT.or;
    if (s < 0.27 && l > 0.18 && l < 0.46) return MAT.ardoise;
    if ((l > 0.5 && s < 0.35) || (l > 0.75 && s < 0.55)) return MAT.pierre;
    return 0;
  }
  // assemble plusieurs morceaux en une géométrie instanciable : couleur par sommet (blanche pour les parties texturées, qui prennent
  // la teinte de leur photo ; un gris garde le caractère clair ou sombre voulu), matière par sommet
  const SANS_TEXTURE = new Set([0, MAT.neon, MAT.or, 30]);
  function fusion(morceaux) {
    const parts = morceaux.map(([g, c, m, ar]) => { const mat = m == null ? matiereDe(c) : m, col = new THREE.Color(c); if (!SANS_TEXTURE.has(mat)) { const l = Math.max(0.45, Math.min(1.12, (col.r * 0.3 + col.g * 0.55 + col.b * 0.15) / 0.38)); col.setRGB(l, l, l); if (mat === MAT.bois || mat === MAT.ardoise || mat === MAT.chaume) col.setScalar(Math.min(1, l)); else col.setScalar(1); } return [g.index ? g.toNonIndexed() : g, col, mat, ar]; });
    let n = 0; for (const [g] of parts) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), mat = new Float32Array(n), articule = parts.some(q => q[3]), art = articule ? new Float32Array(n * 3) : null; let o = 0;
    for (const [g, c, m, ar] of parts) {
      const k = g.attributes.position.count; if (!g.attributes.normal) g.computeVertexNormals();
      pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
      for (let i = 0; i < k; i++) { col[(o + i) * 3] = c.r; col[(o + i) * 3 + 1] = c.g; col[(o + i) * 3 + 2] = c.b; mat[o + i] = m; if (art && ar) art.set(ar, (o + i) * 3); }
      o += k;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('matiere', new THREE.BufferAttribute(mat, 1));
    // membres articulés (figurines animées) : [numéro du membre, hauteur et avancée du pivot]
    if (art) g.setAttribute('art', new THREE.BufferAttribute(art, 3));
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
    // porte en planches dans un encadrement de pierre, fenêtres à volets et appuis de pierre
    const fenetre = (x, y, z, sens) => [[B(0.46, 0.52, 0.1, x, y, z), vitre, 0], [B(0.2, 0.58, 0.07, x - 0.35, y - 0.03, z + sens * 0.04), 0x6a5a46, MAT.bois], [B(0.2, 0.58, 0.07, x + 0.35, y - 0.03, z + sens * 0.04), 0x6a5a46, MAT.bois], [B(0.66, 0.08, 0.18, x, y - 0.07, z + sens * 0.02), 0xa8a294, MAT.pierre]];
    const facade = (w, p, hFen, fen) => { const l = [[B(0.86, 1.46, 0.1, 0, 0, p / 2 + 0.03), 0xa8a294, MAT.pierre], [B(0.66, 1.3, 0.12, 0, 0, p / 2 + 0.06), porte, MAT.bois], [B(0.9, 0.06, 0.5, 0, 0, p / 2 + 0.3), 0xa8a294, MAT.pierre]]; for (const x of fen) l.push(...fenetre(x, hFen, p / 2 + 0.03, 1)); l.push(...fenetre(0, hFen, -p / 2 - 0.03, -1)); return l; };
    // socle de moellons au pied des murs
    const socle = (w, p, x = 0, z = 0) => [B(w + 0.14, 0.42, p + 0.14, x, -0.1, z), 0xa8a294, MAT.moellons];
    // toit à quatre pans sur un rectangle w × d
    const toit = (w, d, h, x, y, z) => new THREE.ConeGeometry(0.7071, h, 4).rotateY(Math.PI / 4).scale(w * 1.2, 1, d * 1.2).translate(x, y + h / 2, z);
    // toit à deux pans (pignon) le long de x
    const pignon = (w, d, h, x, y, z, axeZ) => { const L = w * 1.06, e = d * 0.56, g = new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-e, 0), new THREE.Vector2(e, 0), new THREE.Vector2(0, h)]), { depth: L, bevelEnabled: false }).translate(0, 0, -L / 2).rotateY(Math.PI / 2); if (axeZ) g.rotateY(Math.PI / 2); return g.translate(x, y, z); };
    const colonnes = (n, w, z, h, y) => { const l = []; for (let i = 0; i < n; i++) l.push([Cy(0.32, 0.36, h, 12, -w / 2 + i * w / (n - 1), y, z), 0xf6f1e4, MAT.colonne]); return l; };
    const M = {
      // maisons
      maison_grecs: fusion([socle(3, 3), [B(3, 2.2, 3), pierre], [B(3.2, 0.18, 3.2, 0, 2.15), 0xd8cfbe], [Co(2.65, 1.5, 4, 0, 2.3, 0, Math.PI / 4), tuile], ...facade(3, 3, 1.3, [-0.95, 0.95]), [B(1.4, 0.15, 0.9, 0, 0, 2), 0xc8bfae]]),
      maison_grecs2: fusion([socle(3.6, 3.2), [B(3.6, 2.3, 3.2), pierre], [B(2.2, 1.9, 3.2, -0.7, 2.3), pierre], [toit(2.2, 3.2, 1.2, -0.7, 4.2, 0), tuile], [B(1.4, 0.35, 3.2, 1.1, 2.3), 0xd8cfbe],
        ...facade(3.6, 3.2, 1.3, [-1.1, 1.1]), ...fenetre(-0.7, 3.2, 1.62, 1), ...[0.55, 1.65].map(x => [Cy(0.14, 0.16, 0.8, 8, x, 2.65, 1.45), 0xf6f1e4, MAT.colonne])]),
      maison_grecs3: fusion([socle(4.4, 2.4, 0, -0.9), socle(1.9, 2.2, -1.25, 1.4), [B(4.4, 2.1, 2.4, 0, 0, -0.9), pierre], [toit(4.4, 2.4, 1.3, 0, 2.1, -0.9), tuile], [B(1.9, 1.8, 2.2, -1.25, 0, 1.4), pierre], [toit(1.9, 2.2, 1.05, -1.25, 1.8, 1.4), tuile],
        [B(2.4, 0.9, 0.3, 1.0, 0, 2.35), pierre], [B(0.8, 1.25, 0.12, -1.25, 0, 2.52), porte], ...fenetre(1.0, 1.2, 0.32, 1), ...fenetre(-1.0, 1.2, 0.32, 1), [Cy(0.45, 0.5, 0.55, 8, 1.2, 0, 1.3), 0x8a6a48], [Sp(0.42, 1.2, 0.85, 1.3, 1), 0x5c8a3c, 0]]),
      maison_egyptiens2: fusion([[B(4, 2, 3), sable], [B(2, 1.6, 3, -1, 2), sable], [B(4.2, 0.22, 3.2, 0, 2), 0xc9a86a], [B(2.2, 0.22, 3.2, -1, 3.6), 0xc9a86a], ...facade(4, 3, 1.2, [-1.3, 1.3]), [B(1.6, 0.06, 1.4, 1, 2.6, 0), 0xe8d8b0], ...[0.3, 1.7].map(x => [Cy(0.06, 0.06, 0.6, 4, x, 2.0, 0.6), bois])]),
      maison_nordiques2: fusion([socle(5.4, 2.4), [B(5.4, 1.7, 2.4), bois], [pignon(5.6, 2.6, 2.1, 0, 1.7, 0), sombre], [B(0.8, 1.3, 0.12, 0, 0, 1.22), porte], [Cy(0.2, 0.25, 1.2, 6, -1.8, 2.6, 0), 0x5a5048], [B(1.6, 1.2, 1.6, 3.1, 0, 0.6), bois], [toit(1.6, 1.6, 0.9, 3.1, 1.2, 0.6), sombre]]),
      maison_medieval2: fusion([socle(3.6, 3), [B(3.6, 1.6, 3), 0xa8a294], [B(3.8, 2.2, 3.2, 0, 1.6), 0xe8dcc0], [B(3.9, 0.2, 3.3, 0, 1.6), bois], ...[-1.8, 0, 1.8].map(x => [B(0.18, 2.2, 0.06, x, 1.6, 1.62), bois]), [pignon(3.9, 3.4, 2.2, 0, 3.8, 0), 0x55585e], ...facade(3.6, 3, 2.5, [-0.9, 0.9])]),
      tour_moderne: fusion([[B(3.4, 13, 3.4), verre], ...[3, 6.5, 10].map(y => [B(3.55, 0.35, 3.55, 0, y), beton]), [B(3.6, 0.6, 3.6, 0, 13), beton], [B(4.6, 2, 4.6), beton], [Cy(0.1, 0.1, 3, 4, 1, 13.6, 1), acier]]),
      immeuble_moderne: fusion([[B(5, 4.6, 3.2), beton], [B(5.1, 1.1, 3.3, 0, 1.2), verre], [B(5.1, 1.1, 3.3, 0, 3.0), verre], [B(5.2, 0.3, 3.4, 0, 4.6), 0x8a8e94], [B(1.2, 0.8, 1.2, 1.4, 4.9, 0), acier]]),
      tour_futur: fusion([[B(3.2, 18, 3.2), verre], ...[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z]) => [B(0.5, 18.4, 0.5, x, 0, z), 0xf2f6fa]), ...[4, 8.5, 13].map(y => [B(3.7, 0.25, 3.7, 0, y), neon]), [Co(1.9, 4, 4, 0, 18.4, 0, Math.PI / 4), 0xf2f6fa], [Cy(0.12, 0.12, 4, 4, 0, 22), neon], [Cy(3.4, 3.8, 2.2, 16), 0xf2f6fa]]),
      tour_futur2: fusion([[Cy(1.6, 2.4, 12, 14), 0xf2f6fa], [Cy(1.62, 2.0, 7, 14, 0, 2.4), verre], [new THREE.TorusGeometry(2.3, 0.18, 6, 24).rotateX(Math.PI / 2).translate(0, 9.5, 0), neon], [new THREE.SphereGeometry(1.7, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 12, 0), verre], [Cy(0.08, 0.08, 3, 4, 0, 13.6), neon]]),
      arche_futur: fusion([[new THREE.TorusGeometry(3.2, 0.7, 10, 24, Math.PI).scale(1, 1.25, 1), 0xf2f6fa], [new THREE.TorusGeometry(3.2, 0.12, 6, 24, Math.PI).scale(1, 1.25, 1).translate(0, 0, 0.72), neon], [B(5.6, 1.2, 2.6, 0, 0, -1.8), 0xf2f6fa], [B(5.65, 0.5, 2.65, 0, 0.35, -1.8), verre]]),
      maison_egyptiens: fusion([[B(3.2, 2.4, 3.2), sable], [B(3.5, 0.35, 3.5, 0, 2.4), 0xc9a86a], [B(1, 0.8, 1, 0.8, 2.75, 0.8), sable], ...facade(3.2, 3.2, 1.5, [-1]), [Cy(0.08, 0.08, 1, 4, -1.3, 2.75, -1.3), bois], [B(1.2, 0.05, 1.2, -1, 3.7, -1), 0xe8d8b0]]),
      maison_nordiques: fusion([socle(4, 2.6), [B(4, 2, 2.6), bois], ...facade(4, 2.6, 1.2, [-1.3, 1.3]), [Cy(0.25, 0.3, 1.4, 6, 1.2, 2.6, -0.4), 0x5a5048], [pignon(4, 2.6, 1.9, 0, 2, 0), sombre]]),
      maison_atlantes: fusion([[Cy(1.6, 1.7, 2.2, 10), 0xeef6f5], [new THREE.SphereGeometry(1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.2, 0), 0x2fa59a]]),
      hutte: fusion([[Cy(1.4, 1.5, 1.5, 8), 0x9a7a55], [Co(1.9, 1.8, 8, 0, 1.5), chaume]]),
      maison_medieval: fusion([socle(3, 3.4), [B(3, 2.6, 3.4), 0xe8dcc0], [B(3.1, 0.25, 3.5, 0, 1.2), bois], [B(0.2, 2.6, 0.06, -1.4, 0, 1.73), bois], [B(0.2, 2.6, 0.06, 1.4, 0, 1.73), bois], [B(0.18, 1.8, 0.06, 0, 0.4, 1.73).rotateZ(0.7), bois], ...facade(3, 3.4, 1.8, [-0.85, 0.85]), [Cy(0.3, 0.35, 1.6, 6, 0.9, 3.2, -0.8), 0x7a6a5a], [pignon(3, 3.4, 2.1, 0, 2.6, 0), 0x6b4a32]]),
      maison_industriel: fusion([[B(3.4, 3.4, 3), 0x9a4a36], [B(3.6, 0.4, 3.2, 0, 3.4), 0x4b4b52], [Cy(0.35, 0.35, 1.8, 6, 1, 3.6, 0.8), 0x5a3a2a], ...facade(3.4, 3, 1.4, [-1.1, 1.1]), [B(0.5, 0.5, 0.12, -1.1, 2.5, 1.52), vitre], [B(0.5, 0.5, 0.12, 1.1, 2.5, 1.52), vitre], [B(0.5, 0.5, 0.12, 0, 2.5, 1.52), vitre]]),
      maison_moderne: fusion([[B(3.2, 6.5, 3.2), beton], [B(3.3, 0.4, 3.3, 0, 2.2), verre], [B(3.3, 0.4, 3.3, 0, 4.4), verre]]),
      maison_futur: fusion([[Cy(1.4, 1.9, 3, 12), 0xf2f6fa], [new THREE.SphereGeometry(1.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3, 0), neon]]),
      // temples
      // temple grec : trois marches, colonnade tout autour, cella, entablement et frise, fronton et toit de tuiles
      temple_grecs: fusion([[B(11.4, 0.34, 8.4), 0xe6dfcf], [B(10.8, 0.34, 7.8, 0, 0.34), 0xe6dfcf], [B(10.2, 0.34, 7.2, 0, 0.68), 0xd8d0bf], [B(6.4, 3.3, 4.0, 0, 1.02), 0xece4d2],
        ...colonnes(6, 9.2, 3.2, 3.3, 1.02), ...colonnes(6, 9.2, -3.2, 3.3, 1.02), ...[-1.6, 0, 1.6].flatMap(z => [[Cy(0.3, 0.34, 3.3, 12, -4.6, 1.02, z), 0xf6f1e4, MAT.colonne], [Cy(0.3, 0.34, 3.3, 12, 4.6, 1.02, z), 0xf6f1e4, MAT.colonne]]),
        [B(10.3, 0.45, 7.3, 0, 4.32), 0xf1ece0], [B(10.4, 0.32, 7.4, 0, 4.77), 0xd8d0bf], [B(0.5, 1.6, 0.12, 0, 1.02, 2.02), porte, MAT.bois], [pignon(10.4, 7.5, 1.45, 0, 5.09, 0), tuile]]),
      temple_egyptiens: fusion([[Co(5.2, 5.4, 4, 0, 0, 0, Math.PI / 4), 0xe2c690], [Co(1.1, 0.9, 4, 0, 4.5, 0, Math.PI / 4), 0xf2d27a], [new THREE.CylinderGeometry(0.22, 0.75, 8, 4).rotateY(Math.PI / 4).translate(6.5, 4, 3), 0xcdb27a], [Co(0.3, 0.6, 4, 6.5, 8, 3, Math.PI / 4), 0xf2d27a]]),
      temple_nordiques: fusion([[B(9, 2.8, 4.6), bois], [pignon(9, 4.6, 3.4, 0, 2.8, 0), sombre], [Co(0.4, 1.6, 4, 4.6, 5.2, 0), 0xc9a24a], [Co(0.4, 1.6, 4, -4.6, 5.2, 0), 0xc9a24a]]),
      temple_atlantes: fusion([[Cy(3.6, 3.9, 3.4, 16), 0xeef6f5], ...[0, 1, 2, 3, 4, 5, 6, 7].map(i => [Cy(0.3, 0.3, 3.4, 10, Math.cos(i * 0.785) * 4.3, 0, Math.sin(i * 0.785) * 4.3), 0xffffff, MAT.colonne]), [new THREE.SphereGeometry(3.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 3.4, 0), 0x2fa59a], [Co(0.4, 1.4, 6, 0, 6.8), 0xf2d27a]]),
      temple_medieval: fusion([[B(5, 5, 11), 0xd9d1c0], [pignon(11, 5, 3.2, 0, 5, 0, true), 0x55585e], [B(3, 9, 3, 0, 0, 5.5), 0xd9d1c0], [Co(1.9, 6, 4, 0, 9, 5.5, Math.PI / 4), 0x55585e]]),
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
      champ: fusion([[B(8, 0.16, 5), 0xffffff, MAT.champ], [B(8.2, 0.22, 0.25, 0, 0, 2.55), 0x8a7a5a, MAT.bois], [B(8.2, 0.22, 0.25, 0, 0, -2.55), 0x8a7a5a, MAT.bois]]),
      bois: fusion([[Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 0.45, -0.6), 0x8a5c34], [Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 0.45, 0.4), 0x8a5c34], [Cy(0.45, 0.45, 4, 7).rotateZ(Math.PI / 2).translate(0, 1.25, -0.1), 0x9a6a3e], [B(2.6, 2, 2.4, 3.6, 0, 0), bois], [Co(2, 1.2, 4, 3.6, 2, 0, Math.PI / 4), sombre]]),
      mine: fusion([[rocheuse(2.6, 3), 0x5a554e], [B(1.6, 1.8, 0.4, 0, 0, 2.2), sombre], [B(0.9, 0.7, 0.9, 1.6, 0, 2.2), 0xe5c24a], [B(0.7, 0.5, 0.7, -1.6, 0, 2.4), 0xe5c24a]]),
      mur: fusion([[B(8.8, 2.8, 1.1), 0xa19a8c], ...[-3.5, -1.2, 1.2, 3.5].map(x => [B(1, 0.7, 1.2, x, 2.8), 0x958e80])]),
      tourelle: fusion([[Cy(1.15, 1.3, 4.6, 10), 0x958e80], [Co(1.6, 1.9, 10, 0, 4.6), 0x5d4a3a]]),
      bunker: fusion([[new THREE.SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1), beton]]),
      bouclier: fusion([[new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0x7ff0ff]]),
      merveille_antique: fusion([[B(16, 3, 16), pierre], [B(12, 3, 12, 0, 3), pierre], [B(8, 3, 8, 0, 6), pierre], [B(4, 3, 4, 0, 9), pierre], [Co(2.4, 6, 4, 0, 12, 0, Math.PI / 4), 0xf0c85a]]),
      merveille_medieval: fusion([[B(8, 9, 18), 0xe0d8c8], [B(9, 16, 6, 0, 0, 8), 0xe0d8c8], [Co(3.4, 12, 4, 0, 16, 8, Math.PI / 4), 0x55585e], [pignon(18, 8, 4.4, 0, 9, -1, true), 0x55585e], [Cy(2.6, 2.6, 0.6, 16).rotateX(Math.PI / 2).translate(0, 12, 11.1), 0x6fa3d8]]),
      merveille_industriel: fusion([[Co(7, 34, 4, 0, 0, 0, Math.PI / 4), 0x8a6a48], [B(9, 0.8, 9, 0, 10), 0x7a5a3a], [B(6, 0.8, 6, 0, 20), 0x7a5a3a], [Cy(0.3, 0.3, 5, 4, 0, 34), acier]]),
      merveille_moderne: fusion([[B(9, 52, 9), 0x7ea9c4], [B(7, 10, 7, 0, 52), 0x9ec2d8], [Co(2, 12, 4, 0, 62, 0, Math.PI / 4), acier], [B(16, 4, 16), beton]]),
      merveille_futur: fusion([[Cy(1.2, 1.6, 120, 8), 0xe8eef4], [Cy(6, 8, 4, 16), 0xdfe8f2], ...[20, 45, 70, 95].map(y => [new THREE.TorusGeometry(2.4, 0.3, 6, 18).rotateX(Math.PI / 2).translate(0, y, 0), neon]), [Sp(3, 0, 120, 0), neon]]),
      socle_statue: fusion([[B(1.9, 0.3, 1.9), 0xd8d0bf, MAT.marbre], [B(1.5, 1.0, 1.5, 0, 0.3), 0xe6dfcf, MAT.marbre]]),
      // navires de l'ère moderne et du futur (ceux d'avant viennent des modèles photographiques)
      cargo: fusion([[B(3.2, 1.3, 15, 0, -0.6), 0x7a2a22, 0], [B(3.3, 0.9, 15.2, 0, 0.6), 0x3a3e46, 0], [new THREE.ConeGeometry(1.62, 2.4, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2).scale(1, 0.75, 1).translate(0, 0.1, 8.7), 0x3a3e46, 0],
        ...[[-0.8, 3.6], [0.8, 3.6], [-0.8, 0.8], [0.8, 0.8], [-0.8, -2], [0.8, -2]].map(([x, z], i) => [B(1.5, 1.2, 2.6, x, 1.5, z), [0xb0502a, 0x2a6a9a, 0xc8a040, 0x4a7a44, 0x9a3a3a, 0xd8d0c0][i], 0]), [B(2.8, 2.6, 2, 0, 1.5, -5.6), 0xe8e8e8, MAT.panneau], [B(3.0, 0.4, 2.2, 0, 4.1, -5.6), 0x2a3038, 0], [Cy(0.35, 0.4, 1.6, 8, 0, 4.4, -6.2), 0x9a3a2a, 0]]),
      navire_futur: fusion([[B(3.2, 1.0, 12, 0, -0.3), 0xf2f6fa, MAT.panneau], [new THREE.ConeGeometry(1.62, 3.2, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2).scale(1, 0.55, 1).translate(0, 0.0, 7.6), 0xf2f6fa, MAT.panneau], [B(3.3, 0.14, 12.1, 0, 0.35), neon], [B(2.2, 1.6, 4, 0, 0.7, -2.5), verre], [new THREE.SphereGeometry(1.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.3, -2.5), verre]]),
      place: fusion([[Cy(1, 1.04, 0.7, 40), 0xc4b8a2, MAT.dallage]]),
      drapeau: fusion([[Cy(0.12, 0.12, 9, 4), 0x3a2a18], [B(3.4, 2.1, 0.08, 1.7, 6.6), 0xffffff]]),
      // nature : troncs et feuillages séparés (les feuillages prennent la couleur du pack)
      sapinTronc: fusion([[Cy(0.3, 0.42, 1.8, 6), 0x5a3d24]]),
      sapinFeuilles: fusion([[jit(Co(2.4, 3.2, 9, 0, 1.3), 1), 0xffffff], [jit(Co(1.95, 2.9, 9, 0, 2.8), 2), 0xf4f4f4], [jit(Co(1.4, 2.5, 8, 0, 4.2), 3), 0xffffff], [jit(Co(0.85, 1.9, 7, 0, 5.6), 4), 0xf0f0f0]]),
      feuilluTronc: fusion([[Cy(0.32, 0.46, 2.7, 6), 0x5e4128], [Cy(0.14, 0.2, 1.5, 5).rotateZ(0.7).translate(0.55, 2.1, 0), 0x5e4128]]),
      feuilluFeuilles: fusion([[jit(Sp(2.0, 0, 4.1, 0, 1), 5), 0xffffff], [jit(Sp(1.55, 1.25, 3.5, 0.6, 0), 6), 0xeeeeee], [jit(Sp(1.5, -1.15, 3.7, -0.5, 0), 7), 0xf6f6f6], [jit(Sp(1.3, 0.2, 5.1, -0.4, 0), 8), 0xffffff], [jit(Sp(1.15, -0.4, 3.3, 1.05, 0), 9), 0xe8e8e8]]),
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
      // fantassin : jambes, tunique et bouclier aux couleurs du peuple (99 = teinté), casque à cimier, lance
      fantassin: fusion([[Cy(0.13, 0.15, 1.0, 5, -0.2, 0, 0), 0x6a4a34, 0], [Cy(0.13, 0.15, 1.0, 5, 0.2, 0, 0), 0x6a4a34, 0], [Cy(0.36, 0.5, 1.15, 8, 0, 0.85, 0), 0xffffff, 99], [Cy(0.48, 0.42, 0.18, 8, 0, 0.9, 0), 0x7a5230, 0],
        [Cy(0.11, 0.12, 0.95, 5).rotateZ(0.35).translate(0.5, 1.45, 0.05), 0xd9a47c, 0], [Cy(0.11, 0.12, 0.95, 5).rotateZ(-0.5).translate(-0.48, 1.45, 0.25), 0xd9a47c, 0], [Sp(0.3, 0, 2.3, 0, 1), 0xd9a47c, 0],
        [new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 2.32, 0), 0xc8a050, 13], [B(0.08, 0.38, 0.62, 0, 2.55, 0), 0xb02a20, 0],
        [Cy(0.6, 0.6, 0.1, 14).rotateX(Math.PI / 2).translate(-0.55, 1.45, 0.45), 0xffffff, 99], [Cy(0.64, 0.64, 0.06, 14).rotateX(Math.PI / 2).translate(-0.55, 1.45, 0.41), 0xc8a050, 13],
        [Cy(0.04, 0.05, 4.0, 4, 0.72, 0.3, 0.1), 0x4a3220, 0], [Co(0.09, 0.4, 4, 0.72, 4.3, 0.1), 0xd0d4d8, 14]]),
      cavalier: fusion([[B(0.95, 1.0, 2.6, 0, 1.1), 0x6a4528, 0], [B(0.42, 0.95, 0.5, 0, 1.75, 1.35).rotateX(-0.5), 0x6a4528, 0], [B(0.34, 0.4, 0.85, 0, 2.35, 1.75), 0x5a3a20, 0], [B(0.12, 0.5, 0.75, 0, 2.2, 1.0).translate(0, 0, 0), 0x2a1a10, 0],
        ...[[-0.32, -0.95], [0.32, -0.95], [-0.32, 0.95], [0.32, 0.95]].map(([x, z]) => [Cy(0.1, 0.12, 1.15, 5, x, 0, z), 0x4a2e18, 0]), [Cy(0.06, 0.12, 0.9, 4).rotateX(0.9).translate(0, 1.6, -1.55), 0x2a1a10, 0],
        [B(1.05, 0.12, 1.1, 0, 2.05, 0), 0xffffff, 99], [Cy(0.3, 0.4, 1.0, 8, 0, 2.2, 0), 0xffffff, 99], [Sp(0.27, 0, 3.5, 0, 1), 0xd9a47c, 0], [new THREE.SphereGeometry(0.32, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 3.53, 0), 0xc8a050, 13],
        [Cy(0.04, 0.05, 4.2, 4).rotateX(0.25).translate(0.5, 1.9, 0.6), 0x4a3220, 0], [Co(0.09, 0.4, 4).rotateX(0.25).translate(0.5, 5.95, 1.6), 0xd0d4d8, 14]]),
      char: fusion([[B(2.4, 1, 3.6, 0, 0.3), 0x5a6048], [B(1.6, 0.8, 1.8, 0, 1.3), 0xffffff], [Cy(0.15, 0.15, 2.4, 6).rotateX(Math.PI / 2).translate(0, 1.7, 1.6), 0x3a3e34], [B(2.7, 0.5, 3.8), 0x2a2a28]]),
      engin: fusion([[B(2.4, 0.9, 3.2, 0, 0.5), 0x7a5634], ...[[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]].map(([x, z]) => [Cy(0.6, 0.6, 0.25, 10).rotateZ(Math.PI / 2).translate(x, 0.6, z), 0x4a3420]), [Cy(0.12, 0.12, 3.6, 4).rotateX(-0.7).translate(0, 1.8, -0.4), 0x5a3a22], [B(1.2, 0.7, 0.4, 0, 1.4, 0.9), 0xffffff]]),
      geant: fusion([[Cy(0.6, 0.9, 2.2, 8), 0xffffff], [Sp(0.55, 0, 2.7, 0, 1), 0x9a8a7a], [Cy(0.25, 0.25, 1.8, 6).rotateZ(1.1).translate(1, 1.8, 0), 0x9a8a7a], [Cy(0.25, 0.25, 1.8, 6).rotateZ(-1.1).translate(-1, 1.8, 0), 0x9a8a7a]]),
      meca: fusion([[B(1.6, 1.6, 1.2, 0, 1.8), 0xffffff], [B(0.9, 0.7, 0.9, 0, 3.4), 0xc0ccd8], [B(0.45, 1.8, 0.45, -0.5), 0x8a96a2], [B(0.45, 1.8, 0.45, 0.5), 0x8a96a2], [B(0.35, 1.4, 0.35, -1.1, 1.8), 0x8a96a2], [B(0.35, 1.4, 0.35, 1.1, 1.8), 0x8a96a2], [B(0.5, 0.2, 0.2, 0, 3.6, 0.46), 0x6ff3ff]])
    };
    for (const k in M) M[k].partage = true;
    return M;
  }
  // ---------- figurines des armées : un équipement par époque, membres articulés animés par la carte graphique ----------
  // membres : 1 et 2 jambes (paires diagonales pour le cheval), 3 bras armé, 4 bras du bouclier ou de l'arc, 6 encolure du cheval
  // matières : 99 = aux couleurs du peuple, 30 = métal (brillant), 6 = lumineux ; les autres parties gardent leur couleur
  function figurines(ep) {
    const T = 99, MET = 30, NEON = 6, peau = 0xd9a47c, cuir = 0x6a4a2c, sombre = 0x2a2420;
    const bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), cy = (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s);
    const sp = (r, d = 1) => new THREE.IcosahedronGeometry(r, d), cap = (r, h, s = 8) => new THREE.CapsuleGeometry(r, h, 3, s);
    const dome = (r, k = 0.55) => new THREE.SphereGeometry(r, 12, 7, 0, Math.PI * 2, 0, Math.PI * k);
    const arti = (liste, membre, py, pz = 0) => liste.map(p => [p[0], p[1], p[2] == null ? 0 : p[2], [membre, py, pz]]);
    // arc tendu tenu à la main gauche, bombé vers l'avant
    const arc = (R, x, y) => new THREE.TorusGeometry(R, 0.035, 4, 16, Math.PI * 0.8).rotateZ(-Math.PI * 0.4).rotateY(-Math.PI / 2).translate(x, y, -R + 0.18);
    // corps humain : P = hauteur du bassin (1,05 debout, 2,0 à cheval)
    function humain(o) {
      const P = o.P || 1.05, monte = P > 1.5, l = [], H = P + 1.22, ep_ = P + 0.86;
      const tun = o.tunique || [0xffffff, T], tor = o.torse || tun;
      if (!monte) {
        for (const [s, m] of [[-1, 1], [1, 2]]) {
          const jambe = [[cy(0.135, 0.15, 0.98, 6).translate(s * 0.19, 0.55, 0), o.jambes || peau, 0], [bx(0.2, 0.13, 0.38).translate(s * 0.19, 0.07, 0.07), o.pieds || cuir, 0]];
          if (o.jambieres) jambe.push([cy(0.145, 0.13, 0.46, 8).translate(s * 0.19, 0.38, 0.01), o.jambieres[0], o.jambieres[1]]);
          l.push(...arti(jambe, m, 1.05));
        }
      } else for (const s of [-1, 1]) l.push([cy(0.12, 0.13, 0.9, 6).rotateX(0.3).translate(s * 0.47, P - 0.4, 0.12), o.jambes || peau, 0], [bx(0.18, 0.14, 0.34).translate(s * 0.49, P - 0.86, 0.3), o.pieds || cuir, 0]);
      // jupe ou basques, torse, ceinture
      l.push([cy(0.33, o.long ? 0.5 : 0.43, o.long ? 0.95 : 0.55, 10).translate(0, P - (o.long ? 0.5 : 0.25), 0), tun[0], tun[1]]);
      l.push([cy(0.35, 0.28, 0.82, 10).scale(1, 1, 0.74).translate(0, P + 0.43, 0), tor[0], tor[1]]);
      l.push([cy(0.36, 0.34, 0.1, 10).scale(1, 1, 0.78).translate(0, P + 0.05, 0), o.ceinture || cuir, 0]);
      if (o.baudriers) for (const s of [-1, 1]) l.push([bx(0.09, 1.0, 0.03).rotateZ(s * 0.62).translate(0, P + 0.45, 0.27), o.baudriers, 0]);
      if (o.gilet) l.push([cy(0.39, 0.33, 0.62, 10).scale(1, 1, 0.8).translate(0, P + 0.48, 0), o.gilet[0], o.gilet[1]]);
      if (o.tabard) l.push([bx(0.56, 1.05, 0.04).translate(0, P + 0.05, 0.27), o.tabard[0], o.tabard[1]], [bx(0.56, 1.05, 0.04).translate(0, P + 0.05, -0.27), o.tabard[0], o.tabard[1]]);
      if (o.cape) l.push([bx(0.62, 1.15, 0.05).rotateX(0.1).translate(0, P + 0.2, -0.33), o.cape[0], o.cape[1]]);
      if (o.sac) l.push([bx(0.48, 0.55, 0.26).translate(0, P + 0.5, -0.36), o.sac, 0]);
      if (o.carquois) l.push([cy(0.1, 0.09, 0.85, 6).rotateX(-0.35).rotateZ(0.4).translate(0.18, P + 0.62, -0.33), cuir, 0], [cy(0.12, 0.12, 0.08, 6).rotateX(-0.35).rotateZ(0.4).translate(0.34, P + 1.03, -0.48), 0xe8dcc0, 0]);
      // cou et tête
      l.push([cy(0.09, 0.1, 0.22, 6).translate(0, P + 0.95, 0), o.tete || peau, 0]); if (!o.sansTete) l.push([sp(0.21).scale(0.92, 1.05, 1).translate(0, H, 0.02), o.tete || peau, 0]);
      if (o.epaulieres) for (const s of [-1, 1]) l.push([sp(0.16).scale(1, 0.8, 1).translate(s * 0.41, P + 0.82, 0), o.epaulieres[0], o.epaulieres[1]]);
      // bras : épaule en pivot, main à 0,76 plus bas
      for (const [s, m] of [[1, 3], [-1, 4]]) l.push(...arti([[cy(0.1, 0.11, 0.78, 6).translate(s * 0.45, P + 0.48, 0), o.manches || tor[0], o.manches ? 0 : tor[1]], [sp(0.09).translate(s * 0.45, P + 0.1, 0.02), o.gants || peau, 0]], m, ep_));
      return { l, P, H, main: P + 0.1, ep: ep_ };
    }
    // cheval : robe, crinière ; encolure articulée, jambes par paires diagonales
    function cheval(robe, crin, harnais) {
      const l = [[cap(0.42, 1.25, 10).rotateX(Math.PI / 2).scale(0.82, 1, 1).translate(0, 1.55, 0), robe, 0]];
      l.push(...arti([[cap(0.21, 0.55).rotateX(0.5).translate(0, 2.05, 1.0), robe, 0], [cap(0.15, 0.42).rotateX(2.1).translate(0, 2.3, 1.44), robe, 0],
        [bx(0.07, 0.62, 0.22).rotateX(0.5).translate(0, 2.17, 0.88), crin, 0], [new THREE.ConeGeometry(0.05, 0.17, 4).translate(-0.08, 2.6, 1.26), robe, 0], [new THREE.ConeGeometry(0.05, 0.17, 4).translate(0.08, 2.6, 1.26), robe, 0]], 6, 1.75, 0.75));
      for (const [x, z, m] of [[-0.25, 0.72, 1], [0.25, -0.72, 1], [0.25, 0.72, 2], [-0.25, -0.72, 2]])
        l.push(...arti([[cy(0.085, 0.11, 1.2, 6).translate(x, 0.72, z), robe, 0], [cy(0.1, 0.11, 0.14, 6).translate(x, 0.07, z), sombre, 0]], m, 1.32, z));
      l.push([cy(0.04, 0.14, 0.95, 6).rotateX(-0.45).translate(0, 1.3, -1.2), crin, 0]);
      if (harnais) l.push(...harnais);
      return l;
    }
    const tapis = [[bx(0.98, 0.07, 1.05).translate(0, 1.99, -0.05), 0xffffff, T], [bx(1.02, 0.5, 0.95).translate(0, 1.72, -0.05), 0xffffff, T]];
    const caparacon = [[cy(0.56, 0.7, 1.0, 12).scale(1, 1, 1.75).translate(0, 1.35, 0), 0xffffff, T], [bx(0.98, 0.07, 1.05).translate(0, 1.99, -0.05), 0x8a1e1a, 0]];
    const fusionner = (...listes) => fusion([].concat(...listes));
    const F = {};
    if (ep === 'antique') {
      // hoplite : cuirasse et jambières de bronze, casque corinthien à cimier, grand bouclier rond et lance
      const casque = (H, cimier) => [[dome(0.255, 0.62).translate(0, H - 0.02, 0.01), 0xb8893a, MET], [bx(0.36, 0.24, 0.07).translate(0, H - 0.17, 0.2), 0xb8893a, MET], ...(cimier ? [[new THREE.TorusGeometry(0.27, 0.06, 4, 12, Math.PI).rotateY(Math.PI / 2).translate(0, H + 0.1, 0), 0xa82418, 0]] : [])];
      const h = humain({ torse: [0xc39a4a, MET], tunique: [0xe6dcc4, 0], jambieres: [0xb8893a, MET], cape: [0xffffff, T] });
      const lance = h_ => [[cy(0.035, 0.045, 4.0, 5).translate(0.47, h_.main + 0.9, 0.05), 0x5a3a20, 0], [new THREE.ConeGeometry(0.08, 0.42, 4).translate(0.47, h_.main + 3.1, 0.05), 0xb8bcc0, MET]];
      const bouclier = h_ => [[cy(0.62, 0.62, 0.09, 18).rotateX(Math.PI / 2).translate(-0.53, h_.main + 0.25, 0.33), 0xffffff, T], [new THREE.TorusGeometry(0.61, 0.05, 4, 18).translate(-0.53, h_.main + 0.25, 0.39), 0xb8893a, MET], [sp(0.12).scale(1, 1, 0.5).translate(-0.53, h_.main + 0.25, 0.4), 0xb8893a, MET]];
      F.inf = fusionner(h.l, casque(h.H, true), arti(lance(h), 3, h.ep), arti(bouclier(h), 4, h.ep));
      const a = humain({ torse: [0x8a6038, 0], tunique: [0xffffff, T], carquois: true });
      F.archer = fusionner(a.l, [[dome(0.24, 0.5).translate(0, a.H + 0.02, 0), 0x7a5230, 0]], arti([[arc(0.75, -0.47, a.main), 0x5a3a20, 0]], 4, a.ep));
      const c = humain({ P: 2.0, torse: [0xc39a4a, MET], tunique: [0xe6dcc4, 0], cape: [0xffffff, T] });
      F.cav = fusionner(cheval(0x7a4a28, 0x2a1a10, tapis), c.l, casque(c.H, true), arti([[cy(0.035, 0.045, 3.6, 5).rotateX(0.35).translate(0.47, c.main + 0.75, 0.35), 0x5a3a20, 0], [new THREE.ConeGeometry(0.08, 0.4, 4).rotateX(0.35).translate(0.47, c.main + 2.5, 0.98), 0xb8bcc0, MET]], 3, c.ep));
    } else if (ep === 'medieval') {
      // chevalier : cotte de mailles, tabard, heaume, écu et épée
      const heaume = H => [[cy(0.25, 0.25, 0.46, 12).translate(0, H + 0.02, 0.01), 0xa8b0b8, MET], [dome(0.25, 0.5).scale(1, 0.4, 1).translate(0, H + 0.25, 0.01), 0xa8b0b8, MET], [bx(0.34, 0.045, 0.04).translate(0, H + 0.04, 0.26), sombre, 0], [bx(0.04, 0.3, 0.03).translate(0, H - 0.05, 0.265), 0xc8a050, 13]];
      const ecu = h_ => [[bx(0.6, 0.62, 0.08).translate(-0.53, h_.main + 0.38, 0.32), 0xffffff, T], [new THREE.ConeGeometry(0.42, 0.55, 4).rotateY(Math.PI / 4).scale(1, 1, 0.19).rotateX(Math.PI).translate(-0.53, h_.main - 0.2, 0.32), 0xffffff, T], [bx(0.62, 0.06, 0.09).translate(-0.53, h_.main + 0.7, 0.33), 0xc8a050, 13]];
      const epee = h_ => [[bx(0.08, 1.05, 0.03).translate(0.47, h_.main + 0.6, 0.1), 0xc8ccd2, MET], [bx(0.34, 0.06, 0.08).translate(0.47, h_.main + 0.08, 0.1), 0x8a6a30, 13], [sp(0.05).translate(0.47, h_.main - 0.1, 0.1), 0x8a6a30, 13]];
      const h = humain({ torse: [0x8f969c, MET], tunique: [0x8f969c, MET], jambes: 0x7a8088, manches: 0x8f969c, tabard: [0xffffff, T], gants: 0x4a3a2a });
      F.inf = fusionner(h.l, heaume(h.H), arti(epee(h), 3, h.ep), arti(ecu(h), 4, h.ep));
      const a = humain({ torse: [0x7a6a4a, 0], tunique: [0xffffff, T], carquois: true, jambes: 0x5a4a38 });
      F.archer = fusionner(a.l, [[new THREE.ConeGeometry(0.27, 0.55, 8).translate(0, a.H + 0.1, -0.02), 0x4a5a30, 0], [cy(0.3, 0.38, 0.22, 8).translate(0, a.P + 0.9, 0), 0x4a5a30, 0]], arti([[arc(0.95, -0.47, a.main + 0.2), 0x5a3a20, 0]], 4, a.ep));
      const c = humain({ P: 2.0, torse: [0x8f969c, MET], tunique: [0x8f969c, MET], jambes: 0x7a8088, manches: 0x8f969c, tabard: [0xffffff, T] });
      F.cav = fusionner(cheval(0xd8d0c4, 0x6a6058, caparacon), c.l, heaume(c.H), arti([[cy(0.05, 0.08, 4.4, 6).rotateX(1.3).translate(0.47, c.main + 0.35, 1.3), 0xe8dcc0, 0], [new THREE.ConeGeometry(0.09, 0.4, 6).rotateX(1.3).translate(0.47, c.main + 0.92, 3.5), 0xc8ccd2, MET]], 3, c.ep), arti(ecu(c), 4, c.ep));
    } else if (ep === 'industriel') {
      // fantassin de ligne : habit long, baudriers croisés, shako à plumet, fusil à baïonnette
      const shako = H => [[cy(0.21, 0.2, 0.42, 12).translate(0, H + 0.2, 0), 0x1e1e24, 0], [bx(0.3, 0.04, 0.16).translate(0, H + 0.0, 0.2), 0x1e1e24, 0], [sp(0.07).translate(0, H + 0.45, 0.16), 0xb02a20, 0], [bx(0.1, 0.1, 0.02).translate(0, H + 0.2, 0.21), 0xc8a050, 13]];
      const fusil = h_ => [[bx(0.07, 1.45, 0.09).translate(0.47, h_.main + 0.45, 0.12), 0x5a3a22, 0], [cy(0.025, 0.025, 0.6, 5).translate(0.47, h_.main + 1.45, 0.12), 0x6a7078, MET], [new THREE.ConeGeometry(0.03, 0.4, 4).translate(0.47, h_.main + 1.95, 0.12), 0xc8ccd2, MET]];
      const h = humain({ long: true, torse: [0xffffff, T], tunique: [0xffffff, T], manches: null, jambes: 0xd8d4c8, pieds: 0x1a1a1a, baudriers: 0xe8e4da, sac: 0x5a4a38 });
      F.inf = fusionner(h.l, shako(h.H), arti(fusil(h), 3, h.ep));
      F.archer = F.inf;
      const c = humain({ P: 2.0, torse: [0xffffff, T], tunique: [0xffffff, T], jambes: 0xd8d4c8, pieds: 0x1a1a1a, baudriers: 0xe8e4da });
      F.cav = fusionner(cheval(0x2a1e18, 0x141010, tapis), c.l, [[cy(0.24, 0.22, 0.45, 10).translate(0, c.H + 0.2, 0), 0x2a2018, 0]], arti([[bx(0.06, 1.1, 0.03).rotateX(0.25).translate(0.47, c.main + 0.6, 0.25), 0xc8ccd2, MET]], 3, c.ep));
      // canon de campagne : affût, roues, fût de bronze
      F.siege = fusion([[bx(0.5, 0.28, 2.4).rotateX(-0.12).translate(0, 0.55, -0.6), 0x5a4028, 0], [cy(0.17, 0.24, 2.1, 12).rotateX(Math.PI / 2 - 0.12).translate(0, 1.05, 0.5), 0x9a7a3a, MET],
        ...[-0.62, 0.62].map(x => [new THREE.TorusGeometry(0.62, 0.07, 5, 16).rotateY(Math.PI / 2).translate(x, 0.65, 0), 0x4a3420, 0]), ...[-0.62, 0.62].map(x => [cy(0.12, 0.12, 0.16, 8).rotateZ(Math.PI / 2).translate(x, 0.65, 0), 0x3a2a1a, 0]),
        [bx(0.7, 0.4, 0.5).translate(0, 0.25, -1.7), 0xffffff, T]]);
    } else if (ep === 'moderne') {
      // soldat : casque, treillis, gilet aux couleurs du peuple, sac, fusil d'assaut
      const h = humain({ torse: [0x5a6040, 0], tunique: [0x5a6040, 0], jambes: 0x545a3c, pieds: 0x2a2620, manches: 0x5a6040, gilet: [0xffffff, T], sac: 0x4a5034, gants: 0x2a2620 });
      F.inf = fusionner(h.l, [[dome(0.27, 0.5).translate(0, h.H + 0.02, 0), 0x4a5236, 0]], arti([[bx(0.07, 0.95, 0.12).translate(0.47, h.main + 0.35, 0.16), 0x22262a, 0], [bx(0.05, 0.25, 0.1).translate(0.47, h.main + 0.05, 0.25), 0x22262a, 0]], 3, h.ep));
      F.archer = F.inf;
      F.siege = fusion([[bx(1.8, 0.9, 4.2).translate(0, 1.0, 0), 0x5a6048, 0], [bx(1.7, 0.9, 1.3).translate(0, 1.9, 1.35), 0x5a6048, 0], [bx(1.5, 0.9, 2.4).rotateX(-0.45).translate(0, 2.2, -0.8), 0xffffff, T],
        ...[[-0.9, 1.4], [0.9, 1.4], [-0.9, -0.4], [0.9, -0.4], [-0.9, -1.5], [0.9, -1.5]].map(([x, z]) => [cy(0.42, 0.42, 0.3, 10).rotateZ(Math.PI / 2).translate(x, 0.42, z), 0x1e1e1e, 0])]);
    } else {
      // soldat du futur : armure claire à bandes du peuple, visière lumineuse, fusil à plasma
      const h = humain({ torse: [0xffffff, T], tunique: [0xd8dce2, 0], jambes: 0xc8ccd4, pieds: 0x3a3e48, manches: 0xc8ccd4, epaulieres: [0xe4e8ee, 0], gants: 0x3a3e48 });
      F.inf = fusionner(h.l, [[sp(0.27, 2).scale(1, 1.05, 1.05).translate(0, h.H + 0.02, 0), 0xe4e8ee, 0], [bx(0.36, 0.1, 0.06).translate(0, h.H + 0.02, 0.25), 0x6ff3ff, NEON]],
        arti([[bx(0.09, 1.0, 0.16).translate(0.47, h.main + 0.35, 0.16), 0x3a3e48, 0], [bx(0.03, 0.8, 0.03).translate(0.47, h.main + 0.4, 0.26), 0x6ff3ff, NEON]], 3, h.ep));
      F.archer = F.inf;
      // glisseur : coque en coin portée par des réacteurs lumineux
      F.cav = fusion([[bx(2.2, 0.55, 3.6).translate(0, 1.1, 0), 0xffffff, T], [new THREE.ConeGeometry(1.1, 1.5, 4).rotateY(Math.PI / 4).scale(1.35, 0.35, 1).rotateX(Math.PI / 2).translate(0, 1.1, 2.4), 0xffffff, T], [bx(1.2, 0.55, 1.4).translate(0, 1.6, -0.3), 0xd8dce2, 0],
        [cy(0.12, 0.12, 2.4, 6).rotateX(Math.PI / 2).translate(0, 1.75, 1.2), 0x3a3e48, 0], ...[[-0.8, 1.2], [0.8, 1.2], [-0.8, -1.2], [0.8, -1.2]].map(([x, z]) => [cy(0.38, 0.38, 0.12, 12).translate(x, 0.72, z), 0x6ff3ff, NEON])]);
    }
    // habitants (teinte de l'habit par instance), moutons, oiseaux (ailes : membres 7 et 8, battement autour de l'axe du corps)
    {
      const coiffe = { antique: null, medieval: [new THREE.ConeGeometry(0.25, 0.42, 8).translate(0, 0, -0.02), 0x5a4a38], industriel: [cy(0.2, 0.24, 0.24, 10), 0x2a2420], moderne: null, futur: null }[ep];
      const v = humain({ torse: [0xffffff, T], tunique: [0xffffff, T], long: ep !== 'moderne' && ep !== 'futur', jambes: ep === 'moderne' ? 0x3a4458 : ep === 'futur' ? 0xd8dce2 : peau, manches: ep === 'antique' ? peau : null, pieds: 0x3a2a1c });
      const extra = coiffe ? [[coiffe[0].translate(0, v.H + 0.2, 0), coiffe[1], 0]] : [[dome(0.23, 0.45).translate(0, v.H + 0.03, 0), ep === 'futur' ? 0xe4e8ee : 0x3a2a1c, 0]];
      F.villageois = fusionner(v.l, extra, arti([[cy(0.2, 0.15, 0.3, 8).translate(0.47, v.main - 0.12, 0.05), 0x9a7a48, 0]], 3, v.ep));
    }
    F.mouton = fusion([[sp(0.5, 1).scale(0.95, 0.78, 1.35).translate(0, 0.9, 0), 0xe2dccc, 0], ...arti([[cap(0.13, 0.2).rotateX(1.9).translate(0, 0.95, 0.78), 0x2a2420, 0], ...[-1, 1].map(s => [sp(0.06).scale(1.4, 0.6, 1).translate(s * 0.14, 1.06, 0.7), 0x2a2420, 0])], 6, 0.95, 0.55),
      ...[[-0.25, 0.42, 1], [0.25, -0.42, 1], [0.25, 0.42, 2], [-0.25, -0.42, 2]].flatMap(([x, z, m]) => arti([[cy(0.05, 0.045, 0.6, 5).translate(x, 0.3, z), 0x2a2420, 0]], m, 0.6, z))]);
    F.oiseau = fusion([[cap(0.11, 0.5, 6).rotateX(Math.PI / 2), 0xffffff, T], [new THREE.ConeGeometry(0.05, 0.16, 4).rotateX(Math.PI / 2).translate(0, 0, 0.42), 0xd8a030, 0], [bx(0.3, 0.03, 0.36).translate(0, 0, -0.45), 0xffffff, T],
      ...arti([[bx(1.1, 0.03, 0.36).translate(-0.6, 0, -0.02), 0xffffff, T], [bx(0.35, 0.03, 0.24).translate(-1.3, 0, -0.08), 0x3a3a3e, 0]], 7, 0),
      ...arti([[bx(1.1, 0.03, 0.36).translate(0.6, 0, -0.02), 0xffffff, T], [bx(0.35, 0.03, 0.24).translate(1.3, 0, -0.08), 0x3a3a3e, 0]], 8, 0)]);
    // créatures (Antiquité, Moyen Âge) : géant à la massue ; ensuite, machine de guerre à deux jambes
    if (ep === 'antique') {
      // minotaure : tête de taureau à cornes, yeux rougeoyants, pelage sombre, grande hache double
      const fourrure = 0x4a3020, g = humain({ torse: [0x6a4a34, 0], tunique: [0xffffff, T], jambes: fourrure, manches: 0x6a4a34, gants: 0x5a3a26, pieds: 0x1e1612, tete: fourrure, sansTete: true, epaulieres: [fourrure, 0] });
      const H = g.H, cornes = [-1, 1].map(s => [new THREE.ConeGeometry(0.075, 0.55, 6).translate(0, 0.27, 0).rotateZ(-s * 1.05).translate(s * 0.17, H + 0.12, 0.02), 0xe2d6b8, 0]);
      F.mythe = fusionner(g.l, cornes, [[cap(0.2, 0.22).rotateX(1.25).translate(0, H, 0.08), fourrure, 0], [bx(0.3, 0.22, 0.26).translate(0, H - 0.12, 0.33), 0x2e1e14, 0], [cy(0.17, 0.2, 0.3, 8).translate(0, H - 0.42, -0.02), fourrure, 0],
        ...[-1, 1].map(s => [sp(0.04).translate(s * 0.11, H + 0.05, 0.27), 0xff3018, NEON]), [new THREE.TorusGeometry(0.06, 0.015, 4, 8).translate(0, H - 0.2, 0.47), 0xc8a050, 13]],
        arti([[cy(0.05, 0.06, 2.1, 6).translate(0.47, g.main + 0.6, 0.15), 0x4a3220, 0], ...[-1, 1].map(s => [new THREE.CylinderGeometry(0.34, 0.34, 0.05, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(s > 0 ? 0 : Math.PI).translate(0.47, g.main + 1.45, 0.15 + s * 0.04), 0xb8bcc0, MET])], 3, g.ep));
    } else if (ep === 'medieval') {
      // troll : peau grise et verdâtre, gros nez, défenses, massue cloutée
      const peauT = 0x6e7a5e, g = humain({ torse: [peauT, 0], tunique: [0xffffff, T], jambes: peauT, manches: peauT, gants: peauT, pieds: 0x3a3020, tete: peauT, epaulieres: [0x4a3a28, 0] });
      F.mythe = fusionner(g.l, [[sp(0.08).scale(1, 0.8, 1.4).translate(0, g.H - 0.02, 0.22), 0x5e6a50, 0], ...[-1, 1].map(s => [new THREE.ConeGeometry(0.03, 0.14, 5).translate(s * 0.08, g.H - 0.12, 0.18), 0xe8e0c8, 0]),
        ...[-1, 1].map(s => [sp(0.03).translate(s * 0.08, g.H + 0.07, 0.19), 0xffc040, NEON])],
        arti([[cy(0.1, 0.24, 1.8, 7).translate(0.47, g.main + 0.6, 0.15), 0x5a3a20, 0], ...[0, 1, 2, 3].map(k => [new THREE.ConeGeometry(0.05, 0.16, 4).rotateZ(Math.PI / 2).rotateY(k * Math.PI / 2).translate(0.47 + Math.cos(k * Math.PI / 2) * 0.24, g.main + 1.25, 0.15 - Math.sin(k * Math.PI / 2) * 0.24), 0xa8b0b8, MET])], 3, g.ep));
    } else {
      const jambe = s => [[bx(0.42, 1.1, 0.5).translate(s * 0.5, 1.25, 0), 0x8a96a2, MET], [bx(0.36, 0.9, 0.4).translate(s * 0.5, 0.5, 0.08), 0x8a96a2, MET], [bx(0.5, 0.16, 0.8).translate(s * 0.5, 0.08, 0.12), 0x4a4e56, 0]];
      F.mythe = fusion([...arti(jambe(-1), 1, 1.8), ...arti(jambe(1), 2, 1.8), [bx(1.6, 1.4, 1.2).translate(0, 2.5, 0), 0xffffff, T], [bx(0.9, 0.6, 0.9).translate(0, 3.5, 0.05), 0xc0ccd8, 0], [bx(0.6, 0.14, 0.1).translate(0, 3.55, 0.5), 0x6ff3ff, NEON],
        ...arti([[bx(0.4, 1.3, 0.4).translate(1.05, 2.3, 0), 0x8a96a2, MET], [cy(0.12, 0.12, 1.2, 6).rotateX(Math.PI / 2).translate(1.05, 1.7, 0.5), 0x3a3e48, 0]], 3, 3.0), ...arti([[bx(0.4, 1.3, 0.4).translate(-1.05, 2.3, 0), 0x8a96a2, MET]], 4, 3.0)]);
    }
    return F;
  }
  // ---------- ressources photographiques ----------
  // couches des tableaux de textures (l'ordre est celui des nuanciers)
  const SOLS = ['herbe', 'prairie', 'sousbois', 'terre', 'sec', 'sable', 'roche', 'falaise', 'neige', 'chemin', 'paves'];
  // taille d'un motif de chaque sol, en unités de carte (une maison fait environ 3 unités)
  const ECH_SOLS = [7, 22, 8, 9, 12, 11, 26, 16, 28, 6, 5];
  const BATS = ['tuiles', 'ardoise', 'platre', 'pierre', 'moellons', 'briques', 'bois', 'bardage', 'marbre', 'gres', 'beton', 'metal', 'verre', 'futur', 'immeuble', 'colonne', 'paves', 'chaume', 'chateau', 'bois-medieval', 'tuiles-argile', 'immeuble-nuit', 'champ', 'stuc', 'gres-blocs', 'mosaique'];
  // familles de matières des modèles → [couche des murs, couche des pentes de toit, couche des dessus, taille du motif]
  const FAMILLES = {
    [MAT.terre]: [5, 20, 0, 2.4], [MAT.pierre]: [3, 1, 16, 3.6], [MAT.gres]: [24, 9, 9, 4.2], [MAT.bois]: [19, 7, 6, 2.6], [MAT.verre]: [12, 11, 11, 7],
    [MAT.panneau]: [13, 11, 11, 7], [MAT.chaume]: [2, 17, 17, 3.2], [MAT.ardoise]: [4, 1, 1, 2.4], [MAT.colonne]: [15, 15, 15, 2.2], [MAT.acier]: [11, 11, 11, 3],
    [MAT.dallage]: [16, 16, 16, 3.2], [MAT.platre]: [2, 20, 23, 3.4], [MAT.marbre]: [8, 0, 8, 4], [MAT.beton]: [10, 10, 10, 5], [MAT.immeuble]: [14, 10, 10, 9],
    [MAT.moellons]: [4, 4, 4, 3], [MAT.chateau]: [18, 1, 18, 4.5], [MAT.champ]: [22, 22, 22, 6]
  };
  const TABLE_FAMILLES = () => { const t = []; for (let i = 0; i < 24; i++) { const f = FAMILLES[i] || [2, 2, 2, 3]; t.push(new THREE.Vector4(f[0], f[1], f[2], f[3])); } return t; };

  // texture de relief de l'eau (vagues), répétable, calculée une fois
  function reliefEau(n) {
    const h = new Float32Array(n * n), P = [8, 16, 32, 64], A = [0.5, 0.28, 0.15, 0.07];
    const per = (p, g) => { const r = PM.aleatoire(g), v = new Float32Array(p * p); for (let i = 0; i < p * p; i++) v[i] = r(); return (x, y) => { const X = x * p / n, Y = y * p / n, i = Math.floor(X), j = Math.floor(Y), u = X - i, w = Y - j, s = t => t * t * (3 - 2 * t), a = v[((j % p) * p + (i % p))], b = v[((j % p) * p + ((i + 1) % p))], c = v[(((j + 1) % p) * p + (i % p))], d = v[(((j + 1) % p) * p + ((i + 1) % p))]; return a + (b - a) * s(u) + (c - a) * s(w) + (a - b - c + d) * s(u) * s(w); }; };
    const F = P.map((p, i) => per(p, 31 + i));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let s = 0; for (let k = 0; k < F.length; k++) s += F[k](x, y) * A[k]; h[y * n + x] = s; }
    const d = new Uint8Array(n * n * 4);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const hx = h[y * n + (x + 1) % n] - h[y * n + (x - 1 + n) % n], hy = h[((y + 1) % n) * n + x] - h[((y - 1 + n) % n) * n + x], k = 9, l = Math.hypot(hx * k, hy * k, 1);
      const o = (y * n + x) * 4; d[o] = (-hx * k / l * 0.5 + 0.5) * 255; d[o + 1] = (-hy * k / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255;
    }
    const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
    return t;
  }

  // ---------- sol : onze matières photographiques ----------
  const GLSL_BRUIT = `
float hS(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float nS(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hS(i), hS(i + vec2(1, 0)), f.x), mix(hS(i + vec2(0, 1)), hS(i + vec2(1, 1)), f.x), f.y); }`;
  function materiauSol(U) {
    const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    m.customProgramCacheKey = () => 'sol-v4';
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSolM; varying vec3 vSolN;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSolM = (modelMatrix * vec4(transformed, 1.0)).xyz; vSolN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vSolM; varying vec3 vSolN;
uniform highp sampler2DArray tSolC, tSolN, tSolR;
uniform sampler2D tPoids, tPeuples, tBords, tPalette, tRoutes;
uniform vec2 uTaille; uniform float uT, uSel, uSurvol, uCible, uNeigeNiveau, uNeigePartout, uNuages, uPret, uTeinte;
uniform float uEch[${SOLS.length}];
${GLSL_BRUIT}
vec4 peuple(vec2 p) { return texture2D(tPeuples, clamp(p / uTaille, 0.0, 1.0)); }
float caus(vec2 p) { float s = 0.0; for (int i = 0; i < 3; i++) { p = vec2(p.x + sin(p.y + uT * 0.7), p.y + cos(p.x - uT * 0.6)) * 1.3; s += abs(sin(p.x) * sin(p.y)); } return s / 3.0; }
// coordonnées d'une couche : vue de dessus, ou plaquée sur le flanc pour les falaises
vec2 uvCouche(int i, vec2 p, float alt, vec2 flanc) { return (i == 7 ? vec2(dot(p, flanc), -alt) : p) / uEch[i]; }
vec3 couleurCouche(int i, vec2 uv, float var) {
  vec3 a = texture(tSolC, vec3(uv, float(i))).rgb;
  // seconde lecture plus large et tournée : casse la répétition du motif
  vec3 b = texture(tSolC, vec3(mat2(0.8, -0.6, 0.6, 0.8) * uv * 0.31 + 0.37, float(i))).rgb;
  return mix(a, b * (dot(a, vec3(0.33)) / max(0.02, dot(b, vec3(0.33)))) , 0.28 + 0.3 * var);
}
float solRug = 1.0, solAO = 1.0; vec3 solNor = vec3(0.0, 1.0, 0.0);`)
      .replace('#include <map_fragment>', `
vec2 p = vSolM.xz; float alt = vSolM.y; vec3 N = normalize(vSolN); float pente = 1.0 - clamp(N.y, 0.0, 1.0);
vec2 uvc = clamp(p / uTaille, 0.0, 1.0);
vec4 w4 = texture2D(tPoids, uvc); float mont = clamp(1.0 - (w4.r + w4.g + w4.b + w4.a), 0.0, 1.0);
float n1 = nS(p * 0.011), n2 = nS(p * 0.037 + 3.1), n3 = nS(p * 0.12 + 7.7), macro = n1 * 0.6 + n2 * 0.3 + n3 * 0.1;
vec4 rt = texture2D(tRoutes, uvc);
float W[${SOLS.length}];
float sec = smoothstep(0.42, 0.68, macro), nu = smoothstep(0.6, 0.74, n2 * 0.6 + n3 * 0.4), dune = smoothstep(0.45, 0.7, n1);
float plage = (1.0 - smoothstep(0.25, 1.7, alt + (macro - 0.5) * 1.2)) * (1.0 - smoothstep(0.35, 0.6, pente));
float neige = smoothstep(uNeigeNiveau, uNeigeNiveau + 9.0, alt + macro * 10.0) * (1.0 - smoothstep(0.55, 0.8, pente));
neige = max(neige, uNeigePartout * smoothstep(0.55, 0.25, pente) * smoothstep(1.2, 2.5, alt) * clamp(0.65 + macro * 0.7, 0.0, 1.0));
W[0] = w4.r * (1.0 - sec) * (1.0 - nu * 0.7) + w4.g * 0.12;
W[1] = w4.r * sec + w4.b * 0.85 + mont * 0.25;
W[2] = w4.g * 0.95;
W[3] = (w4.r + w4.b + w4.g * 0.6) * nu * 0.75 + rt.g * 1.3 + rt.r * 0.35;
W[4] = w4.a * (1.0 - dune);
W[5] = w4.a * dune + plage * 1.6;
W[6] = mont * (0.55 + smoothstep(18.0, 40.0, alt) * 0.8) + w4.b * smoothstep(0.68, 0.8, n3) * 0.6 + smoothstep(0.22, 0.4, pente) * 0.9;
W[7] = smoothstep(0.38, 0.62, pente) * 2.2;
W[8] = neige * 2.4;
W[9] = rt.r * 1.6;
W[10] = rt.b * 2.4;
if (alt < 0.0) { W[5] += 1.2; W[6] += clamp(-alt / 12.0, 0.0, 1.0); }
// les trois matières les plus présentes
int i1 = 0, i2 = 1, i3 = 2; float w1 = -1.0, w2 = -1.0, w3 = -1.0;
for (int k = 0; k < ${SOLS.length}; k++) { float w = W[k]; if (w > w1) { w3 = w2; i3 = i2; w2 = w1; i2 = i1; w1 = w; i1 = k; } else if (w > w2) { w3 = w2; i3 = i2; w2 = w; i2 = k; } else if (w > w3) { w3 = w; i3 = k; } }
vec2 flanc = normalize(vec2(-N.z, N.x) + vec2(1e-4, 0.0));
vec2 u1 = uvCouche(i1, p, alt, flanc), u2 = uvCouche(i2, p, alt, flanc), u3 = uvCouche(i3, p, alt, flanc);
vec4 r1 = texture(tSolR, vec3(u1, float(i1))), r2 = texture(tSolR, vec3(u2, float(i2))), r3 = texture(tSolR, vec3(u3, float(i3)));
// mélange par le relief de chaque texture : les cailloux dépassent du sable, l'herbe pousse entre les pierres
float a1 = w1 + r1.g * 0.55, a2 = w2 + r2.g * 0.55, a3 = max(w3, 0.0) + r3.g * 0.55, ma = max(a1, max(a2, a3)) - 0.22;
float b1 = max(a1 - ma, 0.0), b2 = max(a2 - ma, 0.0), b3 = max(a3 - ma, 0.0), bs = max(1e-4, b1 + b2 + b3); b1 /= bs; b2 /= bs; b3 /= bs;
vec3 c = couleurCouche(i1, u1, n2) * b1 + couleurCouche(i2, u2, n2) * b2 + couleurCouche(i3, u3, n2) * b3;
vec3 t1 = texture(tSolN, vec3(u1, float(i1))).xyz * 2.0 - 1.0, t2 = texture(tSolN, vec3(u2, float(i2))).xyz * 2.0 - 1.0, t3 = texture(tSolN, vec3(u3, float(i3))).xyz * 2.0 - 1.0;
vec3 tn = normalize(t1 * b1 + t2 * b2 + t3 * b3);
solRug = r1.r * b1 + r2.r * b2 + r3.r * b3; solAO = r1.b * b1 + r2.b * b2 + r3.b * b3;
// repère du relief : vue de dessus (x, -z) ou flanc
vec3 Tm = vec3(1.0, 0.0, 0.0) - N * N.x; Tm = dot(Tm, Tm) > 1e-8 ? normalize(Tm) : vec3(0.0, 0.0, 1.0); vec3 Bm = normalize(cross(N, Tm));
vec3 Tf = normalize(vec3(flanc.x, 0.0, flanc.y) + vec3(1e-5, 0.0, 0.0)), Bf = cross(N, Tf); Bf = dot(Bf, Bf) > 1e-8 ? normalize(Bf) : Bm;
float f7 = (i1 == 7 ? b1 : 0.0) + (i2 == 7 ? b2 : 0.0) + (i3 == 7 ? b3 : 0.0);
vec3 T = normalize(mix(Tm, Tf, f7)), Bv = normalize(mix(Bm, Bf, f7));
solNor = normalize(T * tn.x * 1.2 + Bv * tn.y * 1.2 + N * tn.z);
// variations de grande échelle (teinte, humidité près de l'eau)
c *= 0.88 + macro * 0.24; c = mix(c, c * vec3(1.06, 1.02, 0.86), smoothstep(0.55, 0.85, nS(p * 0.006 + 5.0)) * 0.6);
float mouille = (1.0 - smoothstep(0.0, 0.9, alt)) * step(-0.05, alt); c *= 1.0 - mouille * 0.35; solRug = mix(solRug, 0.25, mouille * 0.7);
if (alt < 0.0) { float prof = clamp(-alt / 22.0, 0.0, 1.0); c *= mix(vec3(0.9, 0.95, 0.95), vec3(0.2, 0.36, 0.42), prof); c += vec3(0.5, 0.65, 0.6) * pow(caus(p * 0.12), 4.0) * (1.0 - prof) * 0.25; }
c *= uTeinte > 0.5 ? vec3(1.0) : vec3(1.0);
// ombres des nuages qui passent
float nuage = smoothstep(0.52, 0.75, nS(p * 0.0045 + vec2(uT * 0.006, uT * 0.0025)) * 0.7 + nS(p * 0.013 - vec2(uT * 0.004, 0.0)) * 0.3);
c *= 1.0 - nuage * uNuages * 0.55;
// territoires : trait net et lumineux à la frontière, voile léger du côté du peuple
vec4 ici = peuple(p); float o = floor(ici.r * 255.0 + 0.5), pr = floor(ici.g * 255.0 + 0.5), od = floor(ici.b * 255.0 + 0.5);
vec4 bd = texture2D(tBords, uvc);
if (alt > -0.5) {
  float ligne = smoothstep(0.3, 0.75, bd.r), halo = smoothstep(0.04, 0.6, bd.g) * (1.0 - ligne), fine = smoothstep(0.25, 0.7, bd.b) * (1.0 - ligne);
  if (od > 0.0) { vec3 cd = texture2D(tPalette, vec2((od + 0.5) / 64.0, 0.5)).rgb; c = mix(c, c * 0.6 + cd * 0.45, halo * (o > 0.0 ? 0.22 : 0.1)); c = mix(c, min(cd * 1.25 + 0.12, vec3(1.0)), ligne * 0.85); }
  c *= 1.0 - fine * 0.18;
}
if (pr - 1.0 == uSel && uSel >= 0.0) c = mix(c, vec3(1.0, 0.92, 0.6), 0.18 + 0.06 * sin(uT * 3.0));
if (pr - 1.0 == uSurvol && uSurvol >= 0.0) c = mix(c, uCible > 0.5 ? vec3(1.0, 0.35, 0.25) : vec3(1.0, 0.95, 0.75), 0.2);
diffuseColor.rgb = c;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(solRug, 0.08, 1.0);')
      .replace('#include <normal_fragment_maps>', 'normal = normalize((viewMatrix * vec4(solNor, 0.0)).xyz);')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= solAO; reflectedLight.indirectSpecular *= solAO;');
    };
    return m;
  }

  // ---------- bâtiments : textures photographiques plaquées selon l'orientation des faces ----------
  function avecMatieres(mat, U) {
    mat.customProgramCacheKey = () => 'matieres-v4';
    mat.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float matiere; varying float vMat; varying vec3 vPO; varying vec3 vNO; varying vec3 vPW; varying vec3 vTv; varying vec3 vBv;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
vMat = matiere; vPO = position; vNO = objectNormal;
{ vec3 nO = normalize(objectNormal); vec3 tO = abs(nO.y) > 0.96 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), nO)); vec3 bO = cross(nO, tO);
#ifdef USE_INSTANCING
  mat3 im = mat3(instanceMatrix); vTv = normalize(normalMatrix * (im * tO)); vBv = normalize(normalMatrix * (im * bO)); vPW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
#else
  vTv = normalize(normalMatrix * tO); vBv = normalize(normalMatrix * bO); vPW = (modelMatrix * vec4(position, 1.0)).xyz;
#endif
}`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform highp sampler2DArray tBatC, tBatN, tBatR; uniform vec4 uFam[24];
uniform float uNuit, uFutur, uModerne, uT, uPret; varying float vMat; varying vec3 vPO; varying vec3 vNO; varying vec3 vPW; varying vec3 vTv; varying vec3 vBv;
${GLSL_BRUIT}
float mR = -1.0, mM = -1.0, mAO = 1.0; vec3 mE = vec3(0.0), mN = vec3(0.0, 0.0, 1.0); bool mTex = false; vec2 mUV = vec2(0.0);
// repère du relief déduit des dérivées à l'écran (exact sur chaque facette)
mat3 cotangente(vec3 N, vec3 p, vec2 uv) { vec3 dp1 = dFdx(p), dp2 = dFdy(p); vec2 duv1 = dFdx(uv), duv2 = dFdy(uv); vec3 a = cross(dp2, N), b = cross(N, dp1); vec3 T = a * duv1.x + b * duv2.x, B = a * duv1.y + b * duv2.y; float k = inversesqrt(max(1e-12, max(dot(T, T), dot(B, B)))); return mat3(T * k, B * k, N); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // normale de la facette (et non lissée) : chaque face reçoit sa texture à plat, sans déformation sur les toits pointus
  float m = floor(vMat + 0.5); vec3 nF = cross(dFdx(vPO), dFdy(vPO)); vec3 nO = dot(nF, nF) > 1e-24 ? normalize(nF) : normalize(vNO + vec3(0.0, 1e-5, 0.0)); if (dot(nO, vNO) < 0.0) nO = -nO; float ay = abs(nO.y);
  vec3 tO = ay > 0.96 ? vec3(1.0, 0.0, 0.0) : normalize(cross(vec3(0.0, 1.0, 0.0), nO)); vec3 bO = cross(nO, tO);
  bool dessus = ay > 0.96, pente = ay > 0.16 && !dessus, mur = ay <= 0.16;
  if (m == 6.0) { mE = diffuseColor.rgb * (2.6 + 0.5 * sin(uT * 2.0 + vPO.y * 0.4)); mR = 0.3; }
  else if (m == 13.0) { mM = 0.85; mR = 0.28; diffuseColor.rgb *= vec3(1.0, 0.82, 0.42) * 1.2; }
  else if (m > 0.0 && uPret > 0.5) {
    vec4 f = uFam[int(m)]; float couche = mur ? f.x : (pente ? f.y : f.z);
    // tuiles et ardoises : motif deux fois plus grand sur les pentes, pour que les rangées se lisent de loin
    float ech = pente ? f.w * 2.0 : f.w;
    vec2 uv = (m == 15.0) ? vPW.xz / f.w : vec2(dot(vPO, tO), -dot(vPO, bO)) / ech;
    if (m == 10.0) uv = vec2(atan(nO.z, nO.x) * 0.6, -vPO.y / f.w);
    vec3 tc = texture(tBatC, vec3(uv, couche)).rgb; vec4 tr = texture(tBatR, vec3(uv, couche));
    vec3 tn = texture(tBatN, vec3(uv, couche)).xyz * 2.0 - 1.0;
    diffuseColor.rgb *= tc * (0.92 + 0.16 * nS(vPW.xz * 0.3 + vPO.y));
    mR = tr.r; mAO = tr.b; mN = tn; mTex = true; mUV = uv;
    if (m == 5.0 || m == 7.0 || m == 19.0) { mM = mur ? 0.35 : 0.5; }
    if (m == 14.0) mM = 0.6;
    // fenêtres allumées la nuit, lignes lumineuses du futur
    if (mur && (m == 19.0 || m == 5.0 || m == 7.0)) { vec3 nuitC = texture(tBatC, vec3(uv, 21.0)).rgb; mE = nuitC * nuitC * (uNuit * 3.0 + uFutur * 0.6) * (m == 7.0 ? vec3(0.6, 0.9, 1.2) : vec3(1.0)); }
    if (mur && m == 7.0 && uFutur > 0.5) { float g = fract(vPO.y / 2.6); mE += vec3(0.25, 0.85, 1.2) * 2.4 * (1.0 - smoothstep(0.0, 0.03, abs(g - 0.04))); }
    // pied des murs sali par la terre et la pluie
    if (mur) diffuseColor.rgb *= mix(0.62, 1.0, smoothstep(0.0, 1.1, vPO.y));
    // coulures de pluie verticales et taches d'enduit vieilli (murs clairs surtout)
    if (mur && m != 5.0 && m != 7.0 && m != 19.0) {
      float lum = dot(diffuseColor.rgb, vec3(0.33));
      float coule = nS(vec2(dot(vPO.xz, tO.xz) * 2.3 + vPW.x * 0.37, vPO.y * 0.16 + vPW.z * 0.21));
      float tache = nS(vPW.xz * 0.21 + vPO.y * 0.35 + 7.0);
      diffuseColor.rgb *= mix(1.0, mix(0.68, 1.0, smoothstep(0.3, 0.75, coule)) * mix(0.86, 1.0, nS(vPW.xz * 1.9 + vPO.y * 2.3)), smoothstep(0.25, 0.6, lum));
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.0, 0.9, 0.74), smoothstep(0.5, 0.8, tache) * 0.75);
    }
  }
}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (mR >= 0.0) roughnessFactor = mR;')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (mM >= 0.0) metalnessFactor = mM;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (mTex) normal = normalize(cotangente(normal, -vViewPosition, mUV) * vec3(mN.xy * 1.3, mN.z));')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += mE;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mAO;');
    };
    return mat;
  }

  // vent : les sommets hauts (herbe, feuillages) ondulent selon le temps et la position de l'instance
  const GLSL_VENT = ampleur => `
#ifdef USE_INSTANCING
vec3 baseI = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#else
vec3 baseI = vec3(0.0);
#endif
float hV = max(0.0, transformed.y);
transformed.x += (sin(uT * 1.7 + baseI.x * 0.13 + baseI.z * 0.07) * 0.6 + sin(uT * 4.1 + baseI.z * 0.4 + transformed.y) * 0.22) * ${ampleur.toFixed(3)} * hV;
transformed.z += (cos(uT * 1.4 + baseI.z * 0.11) * 0.45 + cos(uT * 3.7 + baseI.x * 0.3 + transformed.x) * 0.18) * ${ampleur.toFixed(3)} * hV;`;
  function avecVent(mat, ampleur, U, feuillage) {
    mat.customProgramCacheKey = () => 'vent' + ampleur + (feuillage ? 'f' : '');
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = U.uT; sh.uniforms.uSoleilC = U.uSoleilC; sh.uniforms.uSatF = U.uSatF; sh.uniforms.uNeigeF = U.uNeigeF;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', '#include <begin_vertex>\n' + GLSL_VENT(ampleur));
      // feuillages : couleur de la photo plus ou moins désaturée selon le pack (hiver, automne), neige sur le dessus des branches
      if (feuillage) sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uSoleilC; uniform float uSatF, uNeigeF;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.3, 0.55, 0.15))), diffuseColor.rgb, uSatF);')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ vec3 hautV = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz); float nei = uNeigeF * smoothstep(0.15, 0.65, dot(normalize(vNormal), hautV)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.86, 0.9), nei * 0.85); }')
        // feuillages : normales arrondies gardées des deux côtés, lumière qui traverse les feuilles
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\nnormal *= faceDirection;\n#endif')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * uSoleilC * 0.09;');
    };
    return mat;
  }

  // ---------- eau : reflets du ciel photographique, vagues, transparence selon la profondeur, écume ----------
  function materiauEau(U) {
    return new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), U),
      vertexShader: `varying vec3 vMonde;
#include <common>
#include <fog_pars_vertex>
void main() { vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz; vec4 mvPosition = viewMatrix * m; gl_Position = projectionMatrix * mvPosition;
#include <fog_vertex>
}`,
      fragmentShader: `uniform float uT, uCielI, uPret; uniform sampler2D uProf, tVagues, tCiel; uniform vec2 uTaille; uniform vec3 uSoleil, uSoleilC, uCreux, uBas, uCielMoy; varying vec3 vMonde;
#include <common>
#include <fog_pars_fragment>
${GLSL_BRUIT}
void main() {
  vec2 p = vMonde.xz;
  float d = texture2D(uProf, clamp(p / uTaille, 0.0, 1.0)).r; if (p.x < 0.0 || p.y < 0.0 || p.x > uTaille.x || p.y > uTaille.y) d = 1.0;
  float t = uT, loin = smoothstep(300.0, 1600.0, length(cameraPosition - vMonde));
  vec3 n1 = texture2D(tVagues, p * 0.021 + t * vec2(0.010, 0.006)).xyz * 2.0 - 1.0;
  vec3 n2 = texture2D(tVagues, p * 0.057 - t * vec2(0.017, 0.012)).xyz * 2.0 - 1.0;
  vec3 n3 = texture2D(tVagues, p * 0.17 + t * vec2(0.03, -0.035)).xyz * 2.0 - 1.0;
  vec2 pl = (n1.xy + n2.xy * 0.7 + n3.xy * 0.35 * (1.0 - loin)) * mix(0.55, 0.25, loin) * mix(0.45, 1.0, smoothstep(0.0, 0.15, d));
  vec3 nrm = normalize(vec3(pl.x, 1.0, pl.y));
  vec3 V = normalize(cameraPosition - vMonde);
  float cosv = max(dot(nrm, V), 0.0), fres = 0.02 + 0.98 * pow(1.0 - cosv, 5.0);
  vec3 R = reflect(-V, nrm); R.y = abs(R.y);
  vec3 ciel = (uPret > 0.5 ? texture2D(tCiel, equirectUv(normalize(R))).rgb : uCielMoy) * uCielI;
  vec3 eau = mix(uBas, uCreux, smoothstep(0.0, 0.55, d)) * (uCielMoy * 0.8 + uSoleilC * 0.08);
  vec3 c = mix(eau, ciel * 0.62, fres * mix(0.55, 1.0, smoothstep(0.05, 0.4, d)));
  float sp = max(dot(R, normalize(uSoleil)), 0.0);
  c += uSoleilC * (pow(sp, 700.0) * 6.0 + pow(sp, 60.0) * 0.18) * (1.0 - loin * 0.6);
  // écume au bord des côtes, en traînées qui avancent
  float bord = 1.0 - smoothstep(0.0, 0.045, d);
  float vag = 0.5 + 0.5 * sin(d * 140.0 - t * 2.2 + nS(p * 0.15) * 5.0);
  float ecume = bord * smoothstep(0.5, 0.9, nS(p * 0.6 + vec2(t * 0.5, -t * 0.3)) * 0.55 + vag * 0.6);
  c = mix(c, vec3(0.9, 0.93, 0.92) * (uCielMoy * 0.9 + uSoleilC * 0.25), clamp(ecume, 0.0, 1.0) * 0.75);
  float a = mix(0.42, 0.97, smoothstep(0.0, 0.2, d)); a = max(a, max(fres, ecume * 0.9));
  gl_FragColor = vec4(c, a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`
    });
  }

  // bouclier d'énergie (futur) : transparent au centre, lumineux sur le pourtour, alvéoles qui ondulent
  function materiauBouclier(uT) {
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uT },
      vertexShader: `#include <common>
varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
#include <beginnormal_vertex>
#include <defaultnormal_vertex>
#include <begin_vertex>
#include <project_vertex>
vN = normalize(transformedNormal); vV = normalize(-mvPosition.xyz); vP = position;
}`,
      fragmentShader: `uniform float uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
void main() {
  float bord = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
  vec2 a = vec2(atan(vP.z, vP.x) * 9.0, vP.y * 14.0); vec2 f = abs(fract(a + vec2(0.5 * floor(mod(a.y, 2.0)), 0.0)) - 0.5);
  float alv = (1.0 - smoothstep(0.03, 0.08, min(f.x, f.y))) * (0.5 + 0.5 * sin(uT * 1.5 - vP.y * 8.0));
  gl_FragColor = vec4(vec3(0.3, 0.85, 1.0) * (bord * 0.55 + alv * 0.12 + 0.01), 1.0);
}`
    });
  }

  // fumées des foyers : particules qui montent en s'élargissant, poussées par le vent, puis se dissipent
  function materiauFumee(uT) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), d = g.createRadialGradient(32, 32, 2, 32, 32, 31);
    d.addColorStop(0, 'rgba(255,255,255,0.9)'); d.addColorStop(0.45, 'rgba(255,255,255,0.35)'); d.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = d; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    return new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true, uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), { uT, tFumee: { value: t }, uEchelle: { value: 400 }, uTeinte: { value: new THREE.Color(0.8, 0.8, 0.82) } }),
      vertexShader: `attribute float phase; attribute float force; uniform float uT, uEchelle; varying float vA;
#include <common>
#include <fog_pars_vertex>
void main() {
  float t = fract(uT * 0.08 * (0.8 + force * 0.4) + phase);
  vec3 p = position + vec3(t * t * 5.0 + sin(uT * 0.7 + phase * 9.0) * 0.4 * t, t * 9.0 * (0.7 + force * 0.6), t * t * 2.0);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = (0.8 + t * 4.5) * (0.6 + force) * uEchelle / max(1.0, -mvPosition.z);
  vA = smoothstep(0.0, 0.12, t) * (1.0 - smoothstep(0.45, 1.0, t)) * (0.35 + force * 0.35);
#include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D tFumee; uniform vec3 uTeinte; varying float vA;
#include <common>
#include <fog_pars_fragment>
void main() { vec4 c = texture2D(tFumee, gl_PointCoord); gl_FragColor = vec4(uTeinte, c.a * vA);
#include <tonemapping_fragment>
#include <colorspace_fragment>
#include <fog_fragment>
}`
    });
  }
  // étalonnage final (après les tons cinéma) : saturation, contraste, tons chauds et froids, vignette, grain léger
  const ETALONNAGE = {
    uniforms: { tDiffuse: { value: null }, uSat: { value: 1 }, uContraste: { value: 1 }, uChaud: { value: new THREE.Vector3(1, 1, 1) }, uFroid: { value: new THREE.Vector3(1, 1, 1) }, uVignette: { value: 0.25 }, uGrain: { value: 0.01 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uContraste, uVignette, uGrain, uT; uniform vec3 uChaud, uFroid; uniform vec2 uRes; varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContraste + 0.5;
  c *= mix(uFroid, uChaud, smoothstep(0.15, 0.85, l));
  vec2 q = vUv - 0.5; c *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
  c += (h(vUv * uRes + fract(uT)) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`
  };
  // distance de la façade au centre de chaque maison (fenêtre allumée la nuit)
  const FACADE = { maison_atlantes: 1.75, maison_futur: 1.75, maison_grecs: 1.58, maison_grecs2: 1.66, maison_grecs3: 0.4, maison_egyptiens: 1.66, maison_egyptiens2: 1.56, maison_nordiques: 1.36, maison_nordiques2: 1.26, maison_medieval: 1.76, maison_medieval2: 1.56, maison_industriel: 1.56, hutte: 1.5 };
  const SANS_MATIERE = new Set(['drapeau', 'lumiere', 'flamme', 'poteau', 'bouclier', 'etendard']);
  const MAISONS = { grecs: ['maison_grecs', 'maison_grecs2', 'maison_grecs3'], egyptiens: ['maison_egyptiens', 'maison_egyptiens2'], nordiques: ['maison_nordiques', 'maison_nordiques2'], atlantes: ['maison_atlantes'],
    medieval: ['maison_medieval', 'maison_medieval2'], industriel: ['maison_industriel'], moderne: ['maison_moderne', 'tour_moderne', 'immeuble_moderne'], futur: ['maison_futur', 'tour_futur', 'tour_futur2', 'arche_futur'] };
  const TEMPLE_EPOQUE = { medieval: 'temple_medieval', industriel: 'temple_industriel', moderne: 'temple_moderne', futur: 'temple_futur' };
  const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
  const col = h => new THREE.Color(h);
  // couches de remplacement (avant le chargement des photos) : couleurs moyennes de chaque matière
  const TEINTES_SOLS = [[86, 124, 52], [120, 128, 76], [70, 72, 44], [118, 92, 66], [150, 128, 92], [196, 176, 136], [120, 114, 104], [104, 96, 88], [236, 240, 246], [140, 126, 104], [150, 146, 136]];
  function tableauUni(teintes, n, srgb) {
    const d = new Uint8Array(n * n * 4 * teintes.length);
    teintes.forEach((t, i) => { for (let k = 0; k < n * n; k++) d.set([t[0], t[1], t[2], 255], (i * n * n + k) * 4); });
    const t = new THREE.DataArrayTexture(d, n, n, teintes.length); t.format = THREE.RGBAFormat; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
  }

  class Vue3D {
    constructor(canvas, calque, r2d) {
      this.cv = canvas; this.et = calque; this.ctx = calque.getContext('2d'); this.r2d = r2d;
      const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
      R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1;
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene(); this.scene.fog = new THREE.Fog(0xbfd6e6, 600, 2200); this.scene.background = new THREE.Color(0x9ab8d0);
      this.camera = new THREE.PerspectiveCamera(38, 1, 1, 12000);
      this.hemi = new THREE.HemisphereLight(0xcfe3ff, 0x4a3c28, 0.15); this.scene.add(this.hemi);
      this.dirSoleil = new THREE.Vector3(-0.55, 0.62, 0.42).normalize();
      const s = this.soleil = new THREE.DirectionalLight(0xffe2b8, 3);
      s.castShadow = true; s.shadow.bias = -0.00025; s.shadow.normalBias = 0.35; this.scene.add(s); this.scene.add(s.target);
      this.cam = { x: 0, z: 0, d: 600, lacet: 0 }; this.vise = { x: 0, z: 0, d: 600, lacet: 0 };
      this.temps = 0; this.boites = []; this.mats = {}; this.M = modeles(); this.ray = new THREE.Raycaster();
      // valeurs partagées par les nuanciers
      this.U = { uT: { value: 0 }, uSatF: { value: 1 }, uNeigeF: { value: 0 }, uSoleil: { value: this.dirSoleil.clone() }, uSoleilC: { value: new THREE.Color(1, 0.95, 0.85) }, uPret: { value: 0 } };
      this.uMat = { uT: this.U.uT, uPret: this.U.uPret, uNuit: { value: 0 }, uFutur: { value: 0 }, uModerne: { value: 0 }, uFam: { value: TABLE_FAMILLES() },
        tBatC: { value: tableauUni(BATS.map(() => [200, 196, 186]), 4, true) }, tBatN: { value: tableauUni(BATS.map(() => [128, 128, 255]), 4) }, tBatR: { value: tableauUni(BATS.map(() => [200, 128, 255]), 4) } };
      this.idPack = PM.packGraphique ? PM.packGraphique() : 'olympe'; this.idQualite = PM.qualite ? PM.qualite() : 'haute';
      this.pack = PM.PACKS_GRAPHIQUES[this.idPack]; this.Q = PM.QUALITES[this.idQualite];
      this.pmrem = new THREE.PMREMGenerator(R);
      this.ciels = {};
      this.chargement = this.chargerRessources();
    }
    mat(opts) { const k = JSON.stringify(opts); return this.mats[k] || (this.mats[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, opts))); }
    matBat(opts) { const k = 'bat' + JSON.stringify(opts || {}); return this.mats[k] || (this.mats[k] = avecMatieres(new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.82, metalness: 0, vertexColors: true }, opts || {})), this.uMat)); }
    recompiler() { this.scene.traverse(o => { const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { x.needsUpdate = true; }); }); }

    // ---------- ressources photographiques (chargées une fois, en arrière-plan) ----------
    async chargerRessources() {
      try {
        // textures du sol en 1024 px (512 en qualité basse ou moyenne, 128 pour les essais)
        const TS = G.PM_LEGER ? 128 : this.idQualite === 'basse' || this.idQualite === 'moyenne' ? 512 : 1024, TB = G.PM_LEGER ? 64 : 512;
        const solsF = k => SOLS.map(n => `ressources/materiaux/sol-${n}/${k}.jpg`), batsF = k => BATS.map(n => `ressources/materiaux/bat-${n}/${k}.jpg`);
        const [sC, sN, sR, bC, bN, bR] = await Promise.all([
          PM.tableauTextures(solsF('couleur'), TS, true), PM.tableauTextures(solsF('relief'), TS, false, [128, 128, 255, 255]), PM.tableauTextures(solsF('rha'), TS, false, [220, 128, 255, 255]),
          PM.tableauTextures(batsF('couleur'), TB, true), PM.tableauTextures(batsF('relief'), TB, false, [128, 128, 255, 255]), PM.tableauTextures(batsF('rha'), TB, false, [200, 128, 255, 255])
        ]);
        this.solTex = { C: sC, N: sN, R: sR };
        this.uMat.tBatC.value = bC; this.uMat.tBatN.value = bN; this.uMat.tBatR.value = bR;
        // feuillages et écorces
        const L = f => PM.chargerImage('ressources/' + f).then(img => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true; return t; });
        const Ln = f => PM.chargerImage('ressources/' + f).then(img => { const t = new THREE.Texture(img); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; return t; });
        const [feuillu, acacia, sapinE, sapinP, herbe, buisson, ecorce, ecorceN] = await Promise.all(['feuillages/feuillu.png', 'feuillages/acacia.png', 'feuillages/sapin-etage.png', 'feuillages/sapin-profil.png', 'feuillages/herbe.png', 'feuillages/buisson.png', 'modeles/sapin/textures/fir_tree_01_bark_diff_1k.jpg'].map(L).concat([Ln('modeles/sapin/textures/fir_tree_01_bark_nor_gl_1k.jpg')]));
        ecorce.wrapS = ecorce.wrapT = THREE.RepeatWrapping;
        this.texF = { feuillu, acacia, sapinE, sapinP, herbe, buisson, ecorce, ecorceN };
        // modèles de jeu (rochers, souches, accessoires)
        this.glb = {};
        await Promise.all(['rocher1', 'rocher2', 'rocher3', 'rocher4', 'rochers-mousse', 'souche', 'tronc-mort', 'tonneau', 'tonneaux', 'caisse', 'jarre', 'panier', 'canon', 'navire', 'statue-cheval', 'statue-gothique'].map(n => PM.chargerModele(`ressources/jeu/${n}.glb`).then(g => { this.glb[n] = g.scene; }).catch(() => null)));
        this.U.uPret.value = 1; this.pret = true;
        if (this.j) this.habiller();
      } catch (e) { console.warn('Pax Mythica : ressources graphiques indisponibles —', e.message); this.pret = false; }
    }
    // une fois les photos chargées : sol, eau, arbres et accessoires prennent leurs vraies matières
    habiller() {
      if (!this.solMesh) return;
      const u = this.solMesh.userData.uniformes; u.tSolC.value = this.solTex.C; u.tSolN.value = this.solTex.N; u.tSolR.value = this.solTex.R;
      this.construireNature(); this.colorerNature(); this.construireHerbe(); this.sigVilles = '';
      this.appliquerPack(this.idPack, true); this.recompiler();
    }

    // ---------- construction du monde ----------
    lier(j) {
      this.j = j;
      if (this.monde) { this.scene.remove(this.monde); this.monde.traverse(o => { if (o.geometry && !o.geometry.partage) o.geometry.dispose(); }); }
      this.monde = new THREE.Group(); this.scene.add(this.monde);
      this.epoque = (j.etat.reglages && j.etat.reglages.epoque) || 'antique';
      this.uMat.uFutur.value = this.epoque === 'futur' ? 1 : 0; this.uMat.uModerne.value = this.epoque === 'moderne' || this.epoque === 'futur' ? 1 : 0;
      this.vus = { base: -1, calque: -1, halo: -1 };
      this.hauteurs(); this.texturesSol(); this.construireSol(); this.construireEau(); this.construireNature(); this.construireHerbe();
      this.instances = {}; this.sigVilles = '';
      this.appliquerPack(this.idPack, true); this.appliquerQualite(this.idQualite, true);
      this.cadrer(); Object.assign(this.cam, this.vise);
      if (this.pret) this.habiller();
    }
    // ---------- packs graphiques et qualité ----------
    appliquerPack(id, sansReconstruire) {
      this.idPack = PM.PACKS_GRAPHIQUES[id] ? id : 'olympe'; const P = this.pack = PM.PACKS_GRAPHIQUES[this.idPack];
      this.dirSoleil = v3(P.soleil.dir).normalize();
      this.soleil.color = col(P.soleil.couleur); this.soleil.intensity = P.soleil.force * 1.25;
      this.hemi.color = col(P.hemi.ciel); this.hemi.groundColor = col(P.hemi.sol); this.hemi.intensity = P.hemi.force * 0.35;
      this.scene.fog.color = col(P.ciel.horizon); this.uMat.uNuit.value = P.nuit ? 1 : 0;
      this.renderer.toneMappingExposure = P.exposition * 1.15;
      if (this.solMesh) { const su = this.solMesh.userData.uniformes; su.uNeigeNiveau.value = P.neige.niveau; su.uNeigePartout.value = P.neige.partout; su.uNuages.value = P.nuages.ombres; }
      if (this.eau) { const w = this.eau.material.uniforms; w.uCreux.value = v3(P.eau.creux).multiplyScalar(0.6); w.uBas.value = v3(P.eau.bas); }
      this.majCiel();
      if (!sansReconstruire) { this.colorerNature(); this.colorerHerbe(); this.sigVilles = ''; } else { this.colorerNature(); this.colorerHerbe(); }
      this.majPost();
    }
    // ciel photographique du pack : fond, lumière d'ambiance (IBL), soleil à sa place sur la photo, brume à la couleur de l'horizon
    majCiel() {
      const P = this.pack, nom = P.hdr || this.idPack, id = this.idPack, appliquer = c => {
        if (this.idPack !== id || !c) return;
        const k = P.kCiel != null ? P.kCiel : Math.min(1.6, c.k); this.scene.background = c.tex; this.scene.backgroundIntensity = (P.fond || 1) * k; this.scene.environment = c.env; this.scene.environmentIntensity = (P.ambiance || 1) * k;
        this.scene.backgroundRotation.set(0, P.rotation || 0, 0); this.scene.environmentRotation.set(0, P.rotation || 0, 0);
        const r = P.rotation || 0, d = c.soleil.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), r);
        if (!P.soleilFixe) { this.dirSoleil.copy(d); if (this.dirSoleil.y < 0.25) { this.dirSoleil.y = 0.25; this.dirSoleil.normalize(); } }
        this.soleil.color.copy(c.soleilC).lerp(col(P.soleil.couleur), P.nuit ? 1 : 0.35);
        this.scene.fog.color.copy(c.horizon).multiplyScalar((P.fond || 1) * k * (P.brumeTeinte || 1));
        if (this.eau) { const w = this.eau.material.uniforms; w.tCiel.value = c.tex; w.uCielI.value = (P.fond || 1) * k; w.uCielMoy.value.copy(c.moyenne).multiplyScalar(k); w.uPret.value = 1; }
        this.U.uSoleil.value.copy(this.dirSoleil); this.U.uSoleilC.value.copy(this.soleil.color).multiplyScalar(this.soleil.intensity * 0.3);
        // fumées teintées par la lumière du ciel (claires le jour, bleutées et discrètes la nuit)
        if (this.matFumee) this.matFumee.uniforms.uTeinte.value.copy(c.moyenne).multiplyScalar(k * 0.9).lerp(new THREE.Color(0.75, 0.75, 0.76), P.nuit ? 0.15 : 0.6);
        for (const n in this.ciels) if (n !== nom) { this.ciels[n].tex.dispose(); this.ciels[n].rt.dispose(); delete this.ciels[n]; }
      };
      if (this.ciels[nom]) return appliquer(this.ciels[nom]);
      PM.chargerHDR(`ressources/ciels/${nom}.hdr`).then(tex => { this.ciels[nom] = this.analyserCiel(tex); appliquer(this.ciels[nom]); }).catch(() => null);
    }
    // couleur moyenne, horizon et soleil (pixel le plus lumineux) d'un ciel HDR ; k ramène la luminosité à un niveau commun
    analyserCiel(tex) {
      const { data, width: W, height: H } = tex.image, f = THREE.DataUtils.fromHalfFloat, half = data instanceof Uint16Array, v = i => half ? f(data[i]) : data[i];
      const moy = new THREE.Color(0, 0, 0), hor = new THREE.Color(0, 0, 0); let nm = 0, nh = 0, max = -1, im = 0;
      for (let y = 0; y < H / 2; y += 4) for (let x = 0; x < W; x += 4) {
        const i = (y * W + x) * 4, r = v(i), g = v(i + 1), b = v(i + 2), l = r * 0.3 + g * 0.55 + b * 0.15;
        if (l > max) { max = l; im = i; }
        if (l < 20) { moy.r += r; moy.g += g; moy.b += b; nm++; }
        if (y > H * 0.42) { hor.r += r; hor.g += g; hor.b += b; nh++; }
      }
      moy.multiplyScalar(1 / Math.max(1, nm)); hor.multiplyScalar(1 / Math.max(1, nh));
      const px = (im / 4) % W, py = Math.floor(im / 4 / W), u = (px + 0.5) / W, vv = 1 - (py + 0.5) / H, a = (u - 0.5) * Math.PI * 2, el = (vv - 0.5) * Math.PI;
      const soleil = new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)).normalize();
      const sc = new THREE.Color(v(im), v(im + 1), v(im + 2)); const m = Math.max(sc.r, sc.g, sc.b) || 1; sc.multiplyScalar(1 / m);
      const lum = moy.r * 0.3 + moy.g * 0.55 + moy.b * 0.15, k = Math.min(3, Math.max(0.25, 0.7 / Math.max(0.01, lum)));
      const rt = this.pmrem.fromEquirectangular(tex), env = rt.texture;
      return { tex, env, rt, k, moyenne: moy, horizon: hor, soleil, soleilC: sc };
    }
    appliquerQualite(id, sansReconstruire) {
      this.idQualite = PM.QUALITES[id] ? id : 'haute'; const Q = this.Q = PM.QUALITES[this.idQualite];
      this.renderer.setPixelRatio(Math.min(Q.finesse, window.devicePixelRatio || 1) * (G.PM_ECHELLE || 1)); // PM_ECHELLE : image réduite pour les essais sans carte graphique
      this.soleil.castShadow = Q.ombres > 0;
      if (Q.ombres && this.soleil.shadow.mapSize.x !== Q.ombres) { this.soleil.shadow.mapSize.set(Q.ombres, Q.ombres); if (this.soleil.shadow.map) { this.soleil.shadow.map.dispose(); this.soleil.shadow.map = null; } }
      this.renderer.shadowMap.enabled = Q.ombres > 0;
      for (const k in this.mats) this.mats[k].needsUpdate = true;
      if (this.herbe) this.herbe.visible = Q.herbe > 0;
      this.libererPost(); this.taille = ''; void sansReconstruire;
    }
    // image finale : rendu en haute dynamique (anticrénelé), occlusion ambiante, halo, tons cinéma, étalonnage
    // libère les images intermédiaires de l'ancienne chaîne d'effets (sinon la mémoire graphique se remplit)
    libererPost() {
      if (this.composer) { for (const p of this.composer.passes) if (p.dispose) p.dispose(); this.composer.dispose(); }
      this.composer = null; this.passeAO = this.bloom = this.etal = this.fxaa = null;
    }
    creerPost(w, h) {
      const Q = this.Q, R = this.renderer, pr = R.getPixelRatio();
      this.libererPost();
      if (this.idQualite === 'basse' || !THREE.EffectComposer) return;
      try {
        const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: Q.ao ? 0 : 4 });
        const C = new THREE.EffectComposer(R, rt); C.setPixelRatio(pr); C.setSize(w, h);
        C.addPass(new THREE.RenderPass(this.scene, this.camera));
        C.addPass(new THREE.ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main() { vec4 c = texture2D(tDiffuse, vUv); bool ok = !(c.r != c.r || c.g != c.g || c.b != c.b) && max(c.r, max(c.g, c.b)) < 6e4; gl_FragColor = ok ? vec4(min(c.rgb, vec3(64.0)), 1.0) : vec4(0.0, 0.0, 0.0, 1.0); }' }));
        if (Q.ao && THREE.GTAOPass) { const ao = this.passeAO = new THREE.GTAOPass(this.scene, this.camera, w * pr, h * pr); ao.updateGtaoMaterial({ radius: 6, distanceExponent: 1.6, thickness: 4, scale: 1.2, samples: 12 }); ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 }); ao.blendIntensity = 0.85; C.addPass(ao); }
        if (Q.bloom) { this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.25, 0.5, 0.9); C.addPass(this.bloom); }
        C.addPass(new THREE.OutputPass());
        this.etal = new THREE.ShaderPass(ETALONNAGE); C.addPass(this.etal);
        if (Q.ao) { this.fxaa = new THREE.FXAAPass(); C.addPass(this.fxaa); }
        this.composer = C; this.majPost();
      } catch (e) { console.warn('effets indisponibles', e.message); this.composer = null; }
    }
    majPost() {
      const P = this.pack.post;
      if (this.etal) { const u = this.etal.uniforms; u.uSat.value = P.saturation; u.uContraste.value = P.contraste; u.uChaud.value = v3(P.chaud); u.uFroid.value = v3(P.froid); u.uVignette.value = P.vignette; u.uGrain.value = Math.min(0.02, P.grain); }
      if (this.bloom) { this.bloom.strength = P.bloom * 0.8; this.bloom.threshold = Math.max(0.85, P.seuil); this.bloom.radius = 0.5; }
    }
    hauteurs() {
      const C = this.j.carte, E = this.j.etat, pas = this.pas = Math.max(2, Math.round(C.w / 680 * 2) / 2) * (G.PM_LEGER ? 3 : 1), gx = this.gx = Math.ceil(C.w / pas) + 1, gz = this.gz = Math.ceil(C.h / pas) + 1;
      const types = ['plaine', 'foret', 'collines', 'montagne', 'desert'], W = types.map(() => new Float32Array(gx * gz)), base = new Float32Array(gx * gz), mer = new Float32Array(gx * gz);
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const x = Math.min(C.w - 1, Math.round(i * pas)), y = Math.min(C.h - 1, Math.round(k * pas)), o = k * gx + i, p = C.pix[y * C.w + x];
        base[o] = PM.hauteurPixel(C, x, y); if (p < 0) { mer[o] = 1; continue; }
        W[types.indexOf(E.provinces[p].terrain)][o] = 1;
      }
      const flou = (A, passes) => { for (let q = 0; q < passes; q++) { const L = new Float32Array(A); for (let k = 1; k < gz - 1; k++) for (let i = 1; i < gx - 1; i++) { const o = k * gx + i; L[o] = (A[o] * 2 + A[o - 1] + A[o + 1] + A[o - gx] + A[o + gx]) / 6; } A.set(L); } };
      for (const w of W) flou(w, 5); flou(mer, 2);
      const nz = bruit((E.reglages.graine || 1) * 3 + 1), H = new Float32Array(gx * gz);
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const o = k * gx + i, x = i * pas, y = k * pas, s = base[o] - 0.5;
        const crete = 1 - Math.abs(nz(x / 38, y / 38, 4) * 2 - 1), bosse = nz(x / 22 + 9, y / 22, 3), fin = nz(x / 7, y / 7, 2);
        if (s < 0) { H[o] = -Math.min(40, Math.sqrt(-s) * 32); continue; } // fond qui plonge vite : rivières et côtes d'un bleu profond
        const tot = W.reduce((t, w) => t + w[o], 0) || 1, wP = W[0][o] / tot, wF = W[1][o] / tot, wC = W[2][o] / tot, wM = W[3][o] / tot, wD = W[4][o] / tot;
        let v = 0.9 + s * 26 + wP * (bosse * 3) + wF * (1.5 + bosse * 4) + wC * (5 + bosse * 12 + crete * 6) + wM * (14 + Math.pow(crete, 1.6) * 62 + bosse * 18) + wD * (1 + Math.abs(Math.sin(x * 0.07 + nz(x / 30, y / 30) * 6)) * 3);
        v += fin * 1.2;
        // le relief s'efface vers les plages et rejoint la pente du fond marin sans marche : rivage courbe, pas en escalier
        const t = Math.min(1, s / 0.035), lisse = t * t * (3 - 2 * t);
        H[o] = s * 60 * (1 - lisse) + v * Math.min(1, s * 40 + 0.15) * lisse;
      }
      this.H = H; this.poids = { W, mer, types };
    }
    sol(x, z) {
      const pas = this.pas, gx = this.gx, fx = Math.max(0, Math.min(gx - 1.001, x / pas)), fz = Math.max(0, Math.min(this.gz - 1.001, z / pas)), i = fx | 0, k = fz | 0, u = fx - i, v = fz - k, H = this.H, o = k * gx + i;
      return H[o] * (1 - u) * (1 - v) + H[o + 1] * u * (1 - v) + H[o + gx] * (1 - u) * v + H[o + gx + 1] * u * v;
    }
    poidsA(t, x, z) { const W = this.poids.W[this.poids.types.indexOf(t)], gx = this.gx, i = Math.max(0, Math.min(gx - 1, Math.round(x / this.pas))), k = Math.max(0, Math.min(this.gz - 1, Math.round(z / this.pas))), o = k * gx + i; const tot = this.poids.W.reduce((s, w) => s + w[o], 0) || 1; return W[o] / tot; }

    // textures de la carte : poids des terrains (lissés), propriétaires et provinces (nets), bords flous, routes et villes
    texturesSol() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, W = this.poids.W;
      const p = new Uint8Array(gx * gz * 4);
      for (let o = 0; o < gx * gz; o++) { const tot = W.reduce((s, w) => s + w[o], 0) || 1; p[o * 4] = W[0][o] / tot * 255; p[o * 4 + 1] = W[1][o] / tot * 255; p[o * 4 + 2] = W[2][o] / tot * 255; p[o * 4 + 3] = W[4][o] / tot * 255; }
      if (this.texPoids) this.texPoids.dispose();
      this.texPoids = new THREE.DataTexture(p, gx, gz, THREE.RGBAFormat); this.texPoids.magFilter = this.texPoids.minFilter = THREE.LinearFilter; this.texPoids.needsUpdate = true;
      if (!this.texPeuples || this.taillePeuples !== C.w + 'x' + C.h) {
        this.taillePeuples = C.w + 'x' + C.h;
        this.dataPeuples = new Uint8Array(C.w * C.h * 4);
        this.texPeuples = new THREE.DataTexture(this.dataPeuples, C.w, C.h, THREE.RGBAFormat); this.texPeuples.magFilter = this.texPeuples.minFilter = THREE.NearestFilter;
        this.dataBords = new Uint8Array(C.w * C.h * 4);
        this.texBords = new THREE.DataTexture(this.dataBords, C.w, C.h, THREE.RGBAFormat); this.texBords.magFilter = this.texBords.minFilter = THREE.LinearFilter;
        this.palette = new Uint8Array(64 * 4); this.texPalette = new THREE.DataTexture(this.palette, 64, 1, THREE.RGBAFormat); this.texPalette.magFilter = this.texPalette.minFilter = THREE.NearestFilter; this.texPalette.colorSpace = THREE.SRGBColorSpace;
        this.cvRoutes = document.createElement('canvas'); this.cvRoutes.width = C.w; this.cvRoutes.height = C.h; this.texRoutes = new THREE.CanvasTexture(this.cvRoutes); this.texRoutes.flipY = false;
      }
      if (this.solMesh) this.solMesh.userData.uniformes.tPoids.value = this.texPoids;
    }
    majPeuples() {
      const C = this.j.carte, E = this.j.etat, W = C.w, H = C.h, N = W * H, d = this.dataPeuples, own = E.provinces.map(p => p.owner);
      const op = new Int16Array(N), od = new Int16Array(N), bf = new Float32Array(N), bp = new Float32Array(N);
      for (let k = 0; k < N; k++) { const a = C.pix[k]; op[k] = a < 0 ? -2 : own[a]; }
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const k = y * W + x, a = C.pix[k]; if (a < 0) continue;
        for (const v of [k - 1, k + 1, k - W, k + W]) { const b = C.pix[v]; if (b < 0) continue; if (op[v] !== op[k]) bf[k] = 1; if (b !== a) bp[k] = 1; }
      }
      // peuple le plus proche : dilatation de quelques pixels vers les terres libres
      od.set(op);
      for (let it = 0; it < 4; it++) { const prev = Int16Array.from(od); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const k = y * W + x; if (prev[k] >= 0 || op[k] === -2) continue; for (const v of [k - 1, k + 1, k - W, k + W]) if (prev[v] >= 0) { od[k] = prev[v]; break; } } }
      // flou en boîte séparable (deux passes ≈ gaussien)
      const flou = (src, r, passes) => { let a = src, b = new Float32Array(N); for (let q = 0; q < passes; q++) {
        for (let y = 0; y < H; y++) { let s = 0; const o = y * W; for (let x = -r; x <= r; x++) s += a[o + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { b[o + x] = s / (2 * r + 1); s += a[o + Math.min(W - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
        for (let x = 0; x < W; x++) { let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { a === src && (a = new Float32Array(N)); a[y * W + x] = s / (2 * r + 1); s += b[Math.min(H - 1, y + r + 1) * W + x] - b[Math.max(0, y - r) * W + x]; } }
      } return a; };
      const f1 = flou(bf, 1, 2), f2 = flou(bf, 4, 2), fp = flou(bp, 1, 1), B = this.dataBords;
      for (let k = 0; k < N; k++) {
        const a = C.pix[k]; d[k * 4] = a < 0 ? 0 : own[a] + 1; d[k * 4 + 1] = a < 0 ? 0 : a + 1; d[k * 4 + 2] = od[k] + 1 > 0 ? od[k] + 1 : 0; d[k * 4 + 3] = 255;
        B[k * 4] = Math.min(255, f1[k] * 3 * 255); B[k * 4 + 1] = Math.min(255, f2[k] * 4 * 255); B[k * 4 + 2] = Math.min(255, fp[k] * 2.5 * 255); B[k * 4 + 3] = 255;
      }
      this.texPeuples.flipY = false; this.texPeuples.needsUpdate = true; this.texBords.flipY = false; this.texBords.needsUpdate = true;
      E.nations.forEach((N, i) => { const c = PM.hex(N.couleur); this.palette[(i + 1) * 4] = c[0]; this.palette[(i + 1) * 4 + 1] = c[1]; this.palette[(i + 1) * 4 + 2] = c[2]; this.palette[(i + 1) * 4 + 3] = 255; });
      this.texPalette.needsUpdate = true;
      // routes (rouge), terre battue des villes (vert), places pavées (bleu) : lues par le nuancier du sol
      const t = this.cvRoutes.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.fillStyle = '#000'; t.fillRect(0, 0, C.w, C.h); t.globalCompositeOperation = 'lighter'; t.lineCap = 'round';
      for (const p of C.provinces) {
        const P = E.provinces[p.id], N = P.owner >= 0 ? E.nations[P.owner] : null, cap = N && N.capitale === p.id, R = N ? 12 + P.dev * 2.6 + (cap ? 7 : 0) : 7;
        const g = t.createRadialGradient(p.lx, p.ly, 0, p.lx, p.ly, R); g.addColorStop(0, 'rgb(0,210,0)'); g.addColorStop(0.5, 'rgb(0,150,0)'); g.addColorStop(1, 'rgb(0,0,0)'); t.fillStyle = g; t.beginPath(); t.arc(p.lx, p.ly, R, 0, 7); t.fill();
        if (N) { const Rp = 3 + P.dev * 0.7 + (cap ? 2.2 : 0), h = t.createRadialGradient(p.lx, p.ly, Rp * 0.7, p.lx, p.ly, Rp * 1.15); h.addColorStop(0, 'rgb(0,0,255)'); h.addColorStop(1, 'rgb(0,0,0)'); t.fillStyle = h; t.beginPath(); t.arc(p.lx, p.ly, Rp * 1.2, 0, 7); t.fill(); }
      }
      const routes = [];
      for (const p of C.provinces) for (const q of p.voisins) if (q > p.id && own[p.id] >= 0 && own[q] === own[p.id]) routes.push([p, C.provinces[q]]);
      for (const [lw, st] of [[4.2, 'rgb(70,0,0)'], [2.2, 'rgb(200,0,0)']]) {
        t.lineWidth = lw; t.strokeStyle = st;
        for (const [p, q] of routes) {
          const mx = (p.lx + q.lx) / 2 + (((p.id * 31 + q.id * 17) % 13) - 6) * 3.2, my = (p.ly + q.ly) / 2 + (((p.id * 13 + q.id * 7) % 11) - 5) * 3.2;
          if (C.pix[Math.round(my) * C.w + Math.round(mx)] < 0) continue;
          t.beginPath(); t.moveTo(p.lx, p.ly); t.quadraticCurveTo(mx, my, q.lx, q.ly); t.stroke();
        }
      }
      t.globalCompositeOperation = 'source-over'; this.texRoutes.needsUpdate = true;
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
      const st = this.solTex, u = {
        tSolC: { value: st ? st.C : tableauUni(TEINTES_SOLS, 4, true) }, tSolN: { value: st ? st.N : tableauUni(SOLS.map(() => [128, 128, 255]), 4) }, tSolR: { value: st ? st.R : tableauUni(SOLS.map(() => [230, 128, 255]), 4) },
        tPoids: { value: this.texPoids }, tPeuples: { value: this.texPeuples }, tBords: { value: this.texBords }, tPalette: { value: this.texPalette }, tRoutes: { value: this.texRoutes },
        uTaille: { value: new THREE.Vector2(C.w, C.h) }, uT: this.U.uT, uPret: this.U.uPret, uSel: { value: -1 }, uSurvol: { value: -1 }, uCible: { value: 0 },
        uNeigeNiveau: { value: 70 }, uNeigePartout: { value: 0 }, uNuages: { value: 0.5 }, uTeinte: { value: 0 }, uEch: { value: ECH_SOLS.slice() }
      };
      const mesh = this.solMesh = new THREE.Mesh(g, materiauSol(u)); mesh.userData.uniformes = u; mesh.receiveShadow = true; mesh.castShadow = true;
      this.monde.add(mesh);
    }
    construireEau() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, data = new Uint8Array(gx * gz * 4);
      for (let o = 0; o < gx * gz; o++) { const v = Math.max(0, Math.min(255, (-this.H[o] / 28) * 255)); data[o * 4] = v; data[o * 4 + 3] = 255; }
      const prof = new THREE.DataTexture(data, gx, gz, THREE.RGBAFormat); prof.magFilter = THREE.LinearFilter; prof.minFilter = THREE.LinearFilter; prof.needsUpdate = true;
      if (this.eau) { this.monde.remove(this.eau); this.eau.geometry.dispose(); }
      const U = {
        uT: this.U.uT, uProf: { value: prof }, uTaille: { value: new THREE.Vector2(C.w, C.h) }, uSoleil: this.U.uSoleil, uSoleilC: this.U.uSoleilC, uPret: { value: 0 },
        tVagues: { value: this.texVagues || (this.texVagues = reliefEau(256)) }, tCiel: { value: null }, uCielI: { value: 1 }, uCielMoy: { value: new THREE.Color(0.5, 0.6, 0.7) },
        uCreux: { value: new THREE.Vector3(0.02, 0.09, 0.16) }, uBas: { value: new THREE.Vector3(0.1, 0.45, 0.45) }
      };
      const geo = new THREE.PlaneGeometry(C.w * 10, C.h * 10, 1, 1).rotateX(-Math.PI / 2);
      this.eau = new THREE.Mesh(geo, materiauEau(U)); this.eau.position.set(C.w / 2, 0, C.h / 2); this.eau.renderOrder = 2; this.monde.add(this.eau);
      const fond = new THREE.Mesh(new THREE.PlaneGeometry(C.w * 10, C.h * 10).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x0b2236 })); fond.position.set(C.w / 2, -42, C.h / 2); this.monde.add(fond);
    }
    // ---------- végétation : arbres en feuillages photographiques détourés, rochers et souches photographiés ----------
    // géométries des arbres (positions, normales arrondies pour un éclairage de volume, coordonnées de texture)
    geoArbres() {
      if (this.GA) return this.GA;
      const quads = (liste) => { // liste de quads : [centre, axeU, axeV, normale (ou null = depuis le centre), uv0, uv1]
        const pos = [], nor = [], uv = [], ind = [];
        for (const [c, u, v, n, o, t] of liste) {
          const b = pos.length / 3, pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
          for (const [a, e] of pts) {
            const p = c.clone().addScaledVector(u, a).addScaledVector(v, e); pos.push(p.x, p.y, p.z);
            const nn = n ? n.clone() : p.clone().sub(t.centre).normalize().lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize(); nor.push(nn.x, nn.y, nn.z);
            uv.push(o[0] + (a + 1) / 2 * (o[2] - o[0]), o[1] + (1 - (e + 1) / 2) * (o[3] - o[1]));
          }
          ind.push(b, b + 1, b + 2, b, b + 2, b + 3);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind); g.computeBoundingSphere(); g.partage = true; return g;
      };
      const V = (x, y, z) => new THREE.Vector3(x, y, z), rnd = PM.aleatoire(17), plein = [0, 0, 1, 1];
      // sapin : étages en étoile qui tombent un peu, et deux profils croisés pour la silhouette
      const etages = (liste, N) => {
        const pos = [], nor = [], uv = [], ind = [];
        for (const [y, r, chute, rot] of liste) {
          const b = pos.length / 3;
          pos.push(0, y + 0.25, 0); nor.push(0, 1, 0); uv.push(0.5, 0.5);
          for (let k = 0; k <= N; k++) { const a = rot + k / N * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, y - chute, z); const n = V(x * 0.5, 1.2, z * 0.5).normalize(); nor.push(n.x, n.y, n.z); uv.push(0.5 + Math.cos(a - rot) * 0.5, 0.5 + Math.sin(a - rot) * 0.5); }
          for (let k = 0; k < N; k++) ind.push(b, b + 1 + k + 1, b + 1 + k);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind); return g;
      };
      const sapin = etages([0, 1, 2, 3, 4, 5, 6].map(e => { const r = 2.9 * (1 - e / 7.6) + 0.35; return [1.4 + e * 1.05, r, 0.55 + r * 0.18, e * 0.7]; }), 9);
      // palmier : couronne de palmes qui retombent, tronc courbé
      const palmes = etages([[5.6, 3.0, 1.5, 0], [5.9, 2.1, 0.7, 0.5]], 8);
      const troncPalmier = (() => { const parts = []; for (let i = 0; i < 5; i++) { const y = i * 1.12, c = Math.sin(i / 4 * 1.2) * 0.6; parts.push(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.25 - i * 0.012, 1.2, 7).translate(c, y + 0.6, 0).toNonIndexed()); } const g = THREE.BufferGeometryUtils.mergeGeometries(parts); g.partage = true; return g; })();
      const centreS = { centre: V(0, 3.5, 0) };
      const profilS = quads([[V(0, 4.6, 0), V(2.9, 0, 0), V(0, 3.9, 0), null, plein, centreS], [V(0, 4.6, 0), V(0, 0, 2.9), V(0, 3.9, 0), null, plein, centreS]]);
      // feuillu : bouquets de feuilles posés sur une sphère aplatie, plus deux grands plans croisés pour le volume
      const bouquets = (n, R, Ry, cy, taille, graine) => {
        const r = PM.aleatoire(graine), l = [], centre = { centre: V(0, cy, 0) };
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, h = r() * 1.6 - 0.6, k = Math.sqrt(Math.max(0, 1 - h * h * 0.6));
          const c = V(Math.cos(a) * R * k * (0.75 + r() * 0.3), cy + h * Ry, Math.sin(a) * R * k * (0.75 + r() * 0.3)), n0 = c.clone().sub(centre.centre).normalize();
          const u = V(0, 1, 0).cross(n0).normalize(); if (u.lengthSq() < 0.01) u.set(1, 0, 0); const v = n0.clone().cross(u).normalize();
          const s = taille * (0.8 + r() * 0.45), ang = r() * 6.28, uu = u.clone().multiplyScalar(Math.cos(ang)).addScaledVector(v, Math.sin(ang)), vv = v.clone().multiplyScalar(Math.cos(ang)).addScaledVector(u, -Math.sin(ang));
          l.push([c, uu.multiplyScalar(s), vv.multiplyScalar(s), null, plein, centre]);
        }
        l.push([V(0, cy, 0), V(R * 1.05, 0, 0), V(0, Ry * 1.1, 0), null, plein, centre], [V(0, cy, 0), V(0, 0, R * 1.05), V(0, Ry * 1.1, 0), null, plein, centre]);
        return quads(l);
      };
      const tronc = (h, r0, r1, branches) => { const parts = [new THREE.CylinderGeometry(r1, r0, h, 7, 3).translate(0, h / 2, 0)]; for (let i = 0; i < branches; i++) { const a = i / branches * 6.28 + 0.5; parts.push(new THREE.CylinderGeometry(r1 * 0.35, r1 * 0.6, h * 0.55, 5).translate(0, h * 0.27, 0).rotateZ(0.75).rotateY(a).translate(0, h * 0.62, 0)); } const g = THREE.BufferGeometryUtils.mergeGeometries(parts.map(p => p.toNonIndexed())); g.partage = true; return g; };
      this.GA = {
        sapinTronc: tronc(3.2, 0.42, 0.24, 0), sapinEtages: sapin, sapinProfil: profilS,
        feuilluTronc: tronc(3.4, 0.5, 0.3, 3), feuilluFeuilles: bouquets(20, 2.5, 1.9, 4.6, 1.45, 5),
        acaciaTronc: tronc(3.6, 0.34, 0.2, 4), acaciaFeuilles: bouquets(14, 3.2, 0.9, 4.5, 1.6, 9),
        buisson: bouquets(9, 1.1, 0.7, 0.75, 0.85, 13), palmierTronc: troncPalmier, palmierPalmes: palmes,
        herbe: quads([[V(0, 0.55, 0), V(1.1, 0, 0), V(0, 0.55, 0), V(0, 1, 0), plein, { centre: V(0, -1, 0) }]])
      };
      for (const k in this.GA) this.GA[k].partage = true;
      return this.GA;
    }
    matFeuillage(nom, tex, amp) {
      const k = 'feuillage-' + nom; if (this.mats[k]) return this.mats[k];
      const m = avecVent(new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82, metalness: 0 }), amp, this.U, true);
      return (this.mats[k] = m);
    }
    matEcorce() {
      if (this.mats.ecorce) return this.mats.ecorce;
      const t = this.texF.ecorce, n = this.texF.ecorceN; t.repeat.set(2, 1); n.repeat.set(2, 1);
      return (this.mats.ecorce = avecVent(new THREE.MeshStandardMaterial({ map: t, normalMap: n, roughness: 0.95 }), 0.006, this.U));
    }
    construireNature() {
      const C = this.j.carte, E = this.j.etat, rnd = PM.aleatoire((E.reglages.graine || 1) * 13 + 7), centres = C.provinces.map(p => [p.lx, p.ly]);
      const L = { sapin: [], feuillu: [], acacia: [], buisson: [], rocher: [], palmier: [], souche: [] };
      const pas = G.PM_LEGER ? 12 : 3.1; // PM_LEGER : essais automatiques sans carte graphique
      for (let y = 2; y < C.h; y += pas) for (let x = 2; x < C.w; x += pas) {
        const px = x + (rnd() - 0.5) * pas, pz = y + (rnd() - 0.5) * pas, p = C.pix[Math.min(C.h - 1, Math.round(pz)) * C.w + Math.min(C.w - 1, Math.round(px))];
        if (p < 0) continue; const hh = this.sol(px, pz); if (hh < 1.6) continue;
        const c = centres[p], dc = (c[0] - px) ** 2 + (c[1] - pz) ** 2; if (dc < 28 * 28) continue;
        const wF = this.poidsA('foret', px, pz), wM = this.poidsA('montagne', px, pz), wC = this.poidsA('collines', px, pz), wD = this.poidsA('desert', px, pz), wP = 1 - wF - wM - wC - wD, r = rnd();
        if (hh > 62) { if (r < 0.06) L.rocher.push([px, pz, 0.9 + rnd() * 1.2, rnd()]); continue; }
        // lisières : la densité suit le poids de la forêt, avec des clairières
        const clairiere = 0.5 + 0.5 * Math.sin(px * 0.045 + Math.sin(pz * 0.03) * 2) * Math.sin(pz * 0.05);
        const nord = pz < C.h * 0.45 || wM > 0.2 || hh > 30;
        if (r < wF * (0.62 + clairiere * 0.35) + wC * 0.07 + wP * 0.025) (nord || rnd() < 0.3 ? L.sapin : L.feuillu).push([px, pz, 0.75 + rnd() * 0.7, rnd()]);
        else if (r < wF * 0.75 + 0.04 && wD < 0.3) L.buisson.push([px, pz, 0.6 + rnd() * 0.9, rnd()]);
        else if (r < wF * 0.78 + 0.045 && wF > 0.4) L.souche.push([px, pz, 0.8 + rnd() * 0.6, rnd()]);
        else if (r < 0.05 + wM * 0.22 + wC * 0.05) L.rocher.push([px, pz, 0.6 + rnd() * (0.8 + wM * 1.6), rnd()]);
        else if (wD > 0.45 && r < 0.085) (rnd() < 0.5 ? L.palmier : L.acacia).push([px, pz, 0.8 + rnd() * 0.5, rnd()]);
        else if (wC > 0.4 && r < 0.09) L.acacia.push([px, pz, 0.8 + rnd() * 0.5, rnd()]);
      }
      this.listesNature = L;
      if (this.nature) for (const m of this.nature) this.monde.remove(m);
      const pose = (enfonce) => (o, a, c) => { o.position.set(a[0], this.sol(a[0], a[1]) - enfonce, a[1]); o.rotation.set(0, a[3] * 6.28, 0); o.scale.setScalar(a[2]); c.setRGB(1, 1, 1); };
      this.nature = [];
      if (this.pret && this.texF) {
        const T = this.texF, GA = this.geoArbres(), ec = this.matEcorce();
        const mk = (nom, geo, mat, liste, enf, ombre = true) => { const m = this.instGeo(geo, mat, liste, pose(enf)); m.userData.nom = nom; m.castShadow = ombre; this.nature.push(m); return m; };
        mk('sapinTronc', GA.sapinTronc, ec, L.sapin, 0.1); mk('sapinEtages', GA.sapinEtages, this.matFeuillage('sapinE', T.sapinE, 0.04), L.sapin, 0.1); mk('sapinProfil', GA.sapinProfil, this.matFeuillage('sapinP', T.sapinP, 0.04), L.sapin, 0.1);
        mk('feuilluTronc', GA.feuilluTronc, ec, L.feuillu, 0.1); mk('feuilluFeuilles', GA.feuilluFeuilles, this.matFeuillage('feuillu', T.feuillu, 0.05), L.feuillu, 0.1);
        mk('acaciaTronc', GA.acaciaTronc, ec, L.acacia, 0.1); mk('acaciaFeuilles', GA.acaciaFeuilles, this.matFeuillage('acacia', T.acacia, 0.06), L.acacia, 0.1);
        mk('buisson', GA.buisson, this.matFeuillage('buisson', T.buisson, 0.05), L.buisson, 0.15);
        // rochers et souches photographiés (plusieurs modèles tirés au hasard)
        const modeles = (noms, liste, taille, enf) => { const parts = noms.map(() => []); liste.forEach((a, i) => parts[Math.floor(a[3] * 7919) % noms.length].push(a)); noms.forEach((n, k) => { const g = this.glb[n]; if (!g) return; this.nature.push(...this.instGLB(n, parts[k], taille, enf)); }); };
        modeles(['rocher1', 'rocher2', 'rocher3', 'rocher4', 'rochers-mousse'], L.rocher, 2.6, 0.35);
        modeles(['souche', 'tronc-mort'], L.souche, 1.6, 0.05);
      } else {
        // en attendant les photos : silhouettes simples
        const vent = (nom, l) => { const m = this.inst(nom, l, pose(0.1), null, this.mat({ vertexColors: true, roughness: 0.85, flatShading: true })); m.userData.nom = nom; this.nature.push(m); };
        vent('sapinTronc', L.sapin); vent('sapinFeuilles', L.sapin); vent('feuilluTronc', L.feuillu); vent('feuilluFeuilles', L.feuillu); vent('buisson', L.buisson); vent('rocher', L.rocher);
      }
      if (this.pret && this.texF) { const GA = this.geoArbres(); const t = this.instGeo(GA.palmierTronc, this.matEcorce(), L.palmier, pose(0.1)); t.userData.nom = 'palmierTronc'; const f = this.instGeo(GA.palmierPalmes, this.matFeuillage('palmes', this.texF.acacia, 0.07), L.palmier, (o, a, c) => { pose(0.1)(o, a, c); o.position.x += Math.cos(a[3] * 6.28) * 0.6 * a[2]; o.position.z -= Math.sin(a[3] * 6.28) * 0.6 * a[2]; }); f.userData.nom = 'palmierFeuilles'; this.nature.push(t, f); }
      this.natureParNom = {}; for (const m of this.nature) this.natureParNom[m.userData.nom] = m;
      for (const m of this.nature) this.monde.add(m);
    }
    // instances d'un modèle photographié (glb) : taille ramenée à « taille » unités, posé sur le sol
    instGLB(nom, liste, taille, enfonce, yFixe) {
      const out = []; if (!liste.length) return out;
      const sc = this.glb[nom]; sc.updateMatrixWorld(true);
      const boite = new THREE.Box3().setFromObject(sc), dim = boite.getSize(new THREE.Vector3()), k = taille / Math.max(dim.x, dim.z, 0.01);
      sc.traverse(o => {
        if (!o.isMesh) return;
        const g = o.geometry.clone().applyMatrix4(o.matrixWorld).translate(-(boite.min.x + boite.max.x) / 2, -boite.min.y, -(boite.min.z + boite.max.z) / 2); g.partage = true; g.morphAttributes = {}; // pas d'animation de forme sur les instances
        const m = new THREE.InstancedMesh(g, o.material, liste.length), ob = new THREE.Object3D();
        liste.forEach((a, i) => { ob.position.set(a[0], yFixe != null ? yFixe : this.sol(a[0], a[1]) - enfonce * a[2], a[1]); ob.rotation.set(0, a[3] * 6.28, 0); ob.scale.setScalar(a[2] * k); ob.updateMatrix(); m.setMatrixAt(i, ob.matrix); });
        m.castShadow = true; m.receiveShadow = true; m.userData.nom = nom; out.push(m);
      });
      return out;
    }
    instGeo(geo, mat, l, f) {
      const m = new THREE.InstancedMesh(geo, mat, Math.max(1, l.length)), o = new THREE.Object3D(), c = new THREE.Color();
      l.forEach((a, i) => { f(o, a, c); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c); });
      m.count = l.length; m.castShadow = true; m.receiveShadow = true; return m;
    }
    // teintes des feuillages selon le pack (automne, hiver…), variées d'un arbre à l'autre (rapport à la couleur de référence)
    colorerNature() {
      if (!this.natureParNom) return;
      const A = this.pack.arbres, ref = { sapin: col(0x2f5d2c), feuillu: col(0x5c9440) }, c = new THREE.Color(), hsl = {};
      const sat = h => { col(h).getHSL(hsl); return hsl.s; }, lum = a => a.r * 0.3 + a.g * 0.55 + a.b * 0.15;
      // saturation des feuillages du pack par rapport à la référence : 1 = photo telle quelle, proche de 0 = feuillage gris (hiver)
      const sF = Math.max(0.12, Math.min(1.2, (A.feuillu.reduce((t, h) => t + sat(h), 0) / A.feuillu.length) / sat(0x5c9440)));
      const roux = A.feuillu.some(h => { col(h).getHSL(hsl); return hsl.h < 0.12 && hsl.s > 0.4; });
      this.U.uSatF.value = roux ? 0.35 : Math.min(1, sF); this.U.uNeigeF.value = this.pack.neige.partout || 0;
      const rapport = (h, r) => { const a = col(h), k = this.U.uSatF.value; if (k >= 0.99) return new THREE.Color(Math.min(2.2, a.r / r.r), Math.min(2.2, a.g / r.g), Math.min(2.2, a.b / r.b)); const l = lum(r); return new THREE.Color(Math.min(2.4, a.r / l), Math.min(2.4, a.g / l), Math.min(2.4, a.b / l)).lerp(new THREE.Color(Math.min(2.2, a.r / r.r), Math.min(2.2, a.g / r.g), Math.min(2.2, a.b / r.b)), k * 0.3); };
      const teindre = (nom, liste, r, cle) => { const m = this.natureParNom[nom], l = this.listesNature[cle]; if (!m || !l || !m.instanceColor) return; l.forEach((a, i) => { c.copy(this.pret ? rapport(liste[Math.floor(a[3] * 9973) % liste.length], r) : col(liste[Math.floor(a[3] * 9973) % liste.length])); c.multiplyScalar(0.82 + ((a[0] * 3.7) % 1) * 0.3); m.setColorAt(i, c); }); m.instanceColor.needsUpdate = true; };
      teindre('sapinEtages', A.sapin, ref.sapin, 'sapin'); teindre('sapinProfil', A.sapin, ref.sapin, 'sapin'); teindre('feuilluFeuilles', A.feuillu, ref.feuillu, 'feuillu'); teindre('acaciaFeuilles', A.feuillu, ref.feuillu, 'acacia'); teindre('buisson', A.feuillu, ref.feuillu, 'buisson');
      teindre('sapinFeuilles', A.sapin, ref.sapin, 'sapin'); teindre('palmierFeuilles', [A.palmier], ref.feuillu, 'palmier');
    }
    // herbe : des dizaines de milliers de touffes photographiques près des villes et dans les prairies, visibles de près
    construireHerbe() {
      const C = this.j.carte, rnd = PM.aleatoire(99), l = [];
      if (this.herbe) this.monde.remove(this.herbe); this.herbe = null;
      if (!this.pret || !this.texF || G.PM_LEGER) return;
      for (let t = 0; t < 400000 && l.length < 70000 * (this.Q ? Math.max(0.3, this.Q.herbe) : 1); t++) {
        const x = rnd() * C.w, z = rnd() * C.h, p = C.pix[Math.floor(z) * C.w + Math.floor(x)]; if (p < 0) continue;
        const h = this.sol(x, z); if (h < 1.5 || h > 40) continue;
        const wP = this.poidsA('plaine', x, z), wC = this.poidsA('collines', x, z), wF = this.poidsA('foret', x, z);
        if (rnd() > wP * 0.95 + wC * 0.7 + wF * 0.4) continue;
        const c = C.provinces[p]; if ((c.lx - x) ** 2 + (c.ly - z) ** 2 < 12 * 12) continue;
        l.push([x, z, 0.55 + rnd() * 0.5, rnd()]);
      }
      this.listeHerbe = l;
      // touffes toujours tournées vers la caméra (vues de côté, jamais en étoile)
      const mat = this.mats.herbe || (this.mats.herbe = (() => { const m = new THREE.MeshStandardMaterial({ map: this.texF.herbe, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 }); m.customProgramCacheKey = () => 'herbe-face';
        m.onBeforeCompile = sh => { sh.uniforms.uT = this.U.uT; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);')
          .replace('#include <begin_vertex>', 'vec3 dr = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-4, 0.0, 0.0));\nvec3 transformed = dr * position.x + vec3(0.0, position.y, 0.0);\n' + GLSL_VENT(0.16)); }; return m; })());
      const m = new THREE.InstancedMesh(this.geoArbres().herbe, mat, Math.max(1, l.length)), o = new THREE.Object3D();
      l.forEach((a, i) => { o.position.set(a[0], this.sol(a[0], a[1]) - 0.05, a[1]); o.rotation.set(0, 0, 0); o.scale.set(a[2], a[2] * (0.8 + a[3] * 0.5), a[2]); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, new THREE.Color(1, 1, 1)); });
      m.count = l.length; m.receiveShadow = true; m.castShadow = false; this.herbe = m; this.monde.add(m); this.colorerHerbe();
    }
    colorerHerbe() {
      if (!this.herbe) return; const c = new THREE.Color(), H = this.pack.herbe, ref = col(0x6a9a3c);
      this.listeHerbe.forEach((a, i) => { const h = col(H[Math.floor(a[3] * 7919) % H.length]); c.setRGB(Math.min(2, h.r / ref.r), Math.min(2, h.g / ref.g), Math.min(2, h.b / ref.b)).multiplyScalar(0.8 + a[2] * 0.2); this.herbe.setColorAt(i, c); });
      if (this.herbe.instanceColor) this.herbe.instanceColor.needsUpdate = true;
    }
    inst(nom, l, f, opts, matPerso) {
      const geo = this.M[nom], m = new THREE.InstancedMesh(geo, matPerso || this.mat(Object.assign({ vertexColors: true }, opts || {})), Math.max(1, l.length)), o = new THREE.Object3D(), c = new THREE.Color();
      l.forEach((a, i) => { f(o, a, c); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c); });
      m.count = l.length; m.castShadow = true; m.receiveShadow = true; return m;
    }
    construireVilles() {
      const E = this.j.etat, C = this.j.carte, ep = this.epoque, nuit = !!this.pack.nuit;
      const sig = E.provinces.map(p => [p.owner, p.dev, Object.keys(p.bat).join(''), p.merveille ? 1 : 0, p.owner >= 0 && E.nations[p.owner].capitale === p.id ? 1 : 0].join('.')).join('|');
      if (sig + nuit === this.sigVilles) return; this.sigVilles = sig + nuit;
      for (const k in this.instances) this.monde.remove(this.instances[k]);
      for (const m of this.accessoires || []) this.monde.remove(m); this.accessoires = [];
      const F = [], fumer = (x, z, h, f) => { for (let k = 0; k < 7; k++) F.push(x, this.sol(x, z) + h, z, k / 7, f); };
      const A = {}, poser = (nom, x, z, s) => (A[nom] = A[nom] || []).push([x, z, s, Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1]);
      const L = {}, mettre = (nom, x, z, rot, s, couleur, sy) => (L[nom] = L[nom] || []).push([x, z, rot || 0, s || 1, couleur == null ? 0xffffff : couleur, sy]);
      for (const P of E.provinces) {
        const c = C.provinces[P.id], N = P.owner >= 0 ? E.nations[P.owner] : null, rnd = PM.aleatoire(P.id * 977 + 3), x0 = c.lx, z0 = c.ly, cap = N && N.capitale === P.id;
        const Rh = 3 + P.dev * 0.7 + (cap ? 2.2 : 0) + 7.5 + P.dev * 2.2 + (cap ? 4 : 0), choix = !N ? ['hutte'] : MAISONS[ep] || MAISONS[N.pantheon] || ['maison_' + N.pantheon], Rp = 3 + P.dev * 0.7 + (cap ? 2.2 : 0);
        const pris = [[x0, z0, Rp + (cap ? 4 : 0.5)]]; if (P.bat.temple) pris.push([x0 + 10, z0 - 8, 8]); if (P.bat.mine) pris.push([x0 - 13, z0 + 11, 4]); if (P.bat.scierie) pris.push([x0 - 14.5, z0 - 5, 5]); if (P.merveille) pris.push([x0 - 4, z0 + 16, 10]);
        const libre = (x, z, r) => pris.every(([a, b, q]) => (a - x) ** 2 + (b - z) ** 2 > (q + r) ** 2) && C.pix[Math.round(z) * C.w + Math.round(x)] >= 0;
        if (nuit && N) for (let i = 0; i < 4 + (cap ? 3 : 0); i++) { const a = i / (4 + (cap ? 3 : 0)) * 6.28 + 0.4, R = 5 + P.dev * 1.4 + (cap ? 3 : 0); mettre('poteau', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); mettre('flamme', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1, 0xffffff); }
        const n = (N ? 4 + P.dev * 3 : 2 + P.dev) + (cap ? 9 : 0);
        for (let i = 0; i < n; i++) {
          let a = 0, r = 0, hx = 0, hz = 0, essai = 0; const sc = 0.85 + rnd() * 0.3;
          do { a = rnd() * Math.PI * 2; r = Rp + 2.5 + rnd() * (Rh - Rp - 2.5); hx = x0 + Math.cos(a) * r; hz = z0 + Math.sin(a) * r; } while (!libre(hx, hz, 2.1 * sc) && ++essai < 8);
          if (essai >= 8) continue; pris.push([hx, hz, 2.1 * sc]);
          // les rues regardent la place ; tours au centre, petites maisons autour
          // enduits aux teintes variées (blanc, crème, ocre clair), comme dans les villages méditerranéens
          const TEINTES = [[1, 0.98, 0.94], [1, 0.95, 0.84], [0.98, 0.92, 0.8], [0.95, 0.9, 0.84], [1, 0.97, 0.9], [0.93, 0.86, 0.74]], te = TEINTES[Math.floor(rnd() * TEINTES.length)];
          const v = 0.86 + rnd() * 0.14, rot = Math.round((Math.atan2(x0 - hx, z0 - hz)) / (Math.PI / 2)) * (Math.PI / 2) + (rnd() - 0.5) * 0.3;
          const maison = choix.length > 1 && r < Rp + 6 && (ep === 'moderne' || ep === 'futur') ? choix[1 + Math.floor(rnd() * (choix.length - 1))] : choix[Math.floor(rnd() * choix.length)];
          mettre(maison, hx, hz, rot, sc, new THREE.Color(v * te[0], v * te[1], v * te[2]).getHex());
          // foyers : une maison sur trois fume (cheminées du Moyen Âge, de l'ère industrielle et du Nord)
          if (N && rnd() < (ep === 'medieval' || ep === 'industriel' || N.pantheon === 'nordiques' ? 0.38 : 0.16) && maison.startsWith('maison')) fumer(hx, hz, 3.2 * sc, 0.35 + rnd() * 0.3);
          // vie des rues : tonneaux, caisses, jarres et paniers devant les maisons
          if (N && this.pret && rnd() < 0.55) { const o = ['tonneau', 'caisse', 'jarre', 'panier', 'tonneaux'][Math.floor(rnd() * 5)], dz = (FACADE[maison] || 1.6) * sc + 0.9, lat = (rnd() - 0.5) * 2.4; poser(o, hx + Math.sin(rot) * dz + Math.cos(rot) * lat, hz + Math.cos(rot) * dz - Math.sin(rot) * lat, 0.8 + rnd() * 0.4); }
          if (nuit && N && rnd() < 0.8 && maison.startsWith('maison')) { const dz = FACADE[maison] || 1.58; mettre('lumiere', hx + Math.sin(rot) * dz * sc, hz + Math.cos(rot) * dz * sc, rot, sc, 0xffffff); }
        }
        // statue sur la place de la capitale (Antiquité et Moyen Âge)
        if (cap && this.pret && (ep === 'antique' || ep === 'medieval')) { mettre('socle_statue', x0 - 4.6, z0 - 4.6, 0.8, 1); poser(ep === 'antique' ? 'statue-cheval' : 'statue-gothique', x0 - 4.6, z0 - 4.6, 1); }
        if (cap) { mettre(ep === 'antique' ? 'centre_antique' : 'centre_' + ep, x0, z0, 0.3, 1); mettre('drapeau', x0 + 4, z0 + 3, 0, 1, new THREE.Color(N.couleur).getHex()); }
        else if (N) mettre('drapeau', x0 + 2, z0 + 2, 0, 0.75, new THREE.Color(N.couleur).getHex());
        if (P.bat.temple) mettre(TEMPLE_EPOQUE[ep] || 'temple_' + (N ? N.pantheon : 'grecs'), x0 + 10, z0 - 8, 0.25, 1);
        if (P.bat.ferme) for (let i = 0; i < 4; i++) { const a = 2 + i * 0.6, r = 19 + (i % 2) * 4; mettre('champ', x0 + Math.cos(a) * r, z0 + Math.sin(a) * r, a, 1, i % 2 ? 0xfff2c0 : 0xffffff); }
        if (P.bat.scierie) mettre('bois', x0 - 16, z0 - 5, 0.4, 1);
        if (P.bat.mine) { mettre('mine', x0 - 13, z0 + 11, 0.2, 1.1); fumer(x0 - 13, z0 + 13, 2, 0.9); }
        if (P.bat.temple) fumer(x0 + 10, z0 - 8, 6.5, 0.25);
        if (ep === 'industriel' && cap) for (const [dx, dz] of [[3.5, -1.5], [1.2, -1.5]]) fumer(x0 + dx, z0 + dz, 11, 1.4);
        if (P.bat.remparts) {
          const R = Rh + 3;
          if (ep === 'futur') mettre('bouclier', x0, z0, 0, R, 0xffffff, 0.5);
          else if (ep === 'moderne') for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; mettre('bunker', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); }
          else { for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; mettre('mur', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, -a + Math.PI / 2, 1, 0xffffff, R / 16); } for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.26; mettre('tourelle', x0 + Math.cos(a) * R, z0 + Math.sin(a) * R, 0, 1); } }
        }
        if (P.merveille) mettre('merveille_' + (ep === 'antique' ? 'antique' : ep), x0 - 4, z0 + 16, 0.4, 1);
        // navires au mouillage devant les villes côtières (du Moyen Âge à l'ère industrielle)
        if (N && this.pret && (ep === 'medieval' || ep === 'industriel') && C.provinces[P.id].mer && C.provinces[P.id].mer.length) {
          for (let t = 0; t < 40; t++) { const a = rnd() * 6.28, r = 22 + rnd() * 26, x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r; if (x < 0 || z < 0 || x >= C.w || z >= C.h) continue; if (C.pix[Math.round(z) * C.w + Math.round(x)] < 0 && this.sol(x, z) < -5) { poser('navire', x, z, 1); break; } }
        }
      }
      this.instances = {};
      for (const nom in L) {
        const futur = nom === 'bouclier';
        const m = this.inst(nom, L[nom], (o, a, c) => {
          o.position.set(a[0], this.sol(a[0], a[1]) - (nom === 'place' ? 0.5 : 0.3), a[1]); o.rotation.set(0, a[2], 0);
          if (nom === 'place') o.scale.set(a[3], 1, a[3]); else if (nom === 'bouclier') o.scale.set(a[3], a[3] * 0.5, a[3]); else if (nom === 'mur') o.scale.set(a[5] || 1, 1, 1); else o.scale.setScalar(a[3]);
          c.set(a[4]);
        }, futur ? { transparent: true, opacity: 0.28, emissive: 0x2299aa, depthWrite: false } : nom === 'lumiere' || nom === 'flamme' ? { emissive: nom === 'flamme' ? 0xff9a3a : 0xffc070, emissiveIntensity: nom === 'flamme' ? 4 : 2.6, color: 0x000000 } : null,
        futur ? (this.matBouclier || (this.matBouclier = materiauBouclier(this.U.uT))) : SANS_MATIERE.has(nom) ? null : this.matBat());
        if (nom === 'place' || futur || nom === 'lumiere' || nom === 'flamme') m.castShadow = false;
        this.instances[nom] = m; this.monde.add(m);
      }
      if (this.fumee) { this.monde.remove(this.fumee); this.fumee.geometry.dispose(); this.fumee = null; }
      if (F.length) { const n = F.length / 5, pos = new Float32Array(n * 3), ph = new Float32Array(n), fo = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = F[i * 5]; pos[i * 3 + 1] = F[i * 5 + 1]; pos[i * 3 + 2] = F[i * 5 + 2]; ph[i] = F[i * 5 + 3]; fo[i] = F[i * 5 + 4]; }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('phase', new THREE.BufferAttribute(ph, 1)); g.setAttribute('force', new THREE.BufferAttribute(fo, 1));
        if (!this.matFumee) { this.matFumee = materiauFumee(this.U.uT); this.majCiel(); }
        this.fumee = new THREE.Points(g, this.matFumee); this.fumee.frustumCulled = false; this.fumee.renderOrder = 3; this.monde.add(this.fumee); }
      const TAILLES = { tonneau: 0.8, caisse: 0.9, jarre: 0.6, panier: 0.7, tonneaux: 2.2, navire: 11, 'statue-cheval': 1.9, 'statue-gothique': 1.3 };
      for (const nom in A) if (this.glb && this.glb[nom]) for (const m of this.instGLB(nom, A[nom], TAILLES[nom], nom.startsWith('statue') ? -1.0 : 0, nom === 'navire' ? -0.6 : null)) { this.accessoires.push(m); this.monde.add(m); }
      this.pieces(); this.construireVie();
    }
    // ---------- armées : figurines en formation ----------
    // ---------- vie : habitants sur les places, moutons près des fermes, oiseaux en vol, navires au large ----------
    construireVie() {
      const E = this.j.etat, C = this.j.carte, ep = this.epoque, rnd = PM.aleatoire(4021);
      const H = this.habitants = [], T = this.troupeaux = [], O = this.vols = [];
      const habits = [0xd8c8a8, 0xb89a70, 0x8a6a48, 0xc8b898, 0x9a8a6a, 0xe0d4bc, 0x7a6a5a, 0xa8885a];
      for (const P of E.provinces) {
        if (P.owner < 0) continue;
        const c = C.provinces[P.id], N = E.nations[P.owner], cap = N.capitale === P.id, Rp = 3 + P.dev * 0.7 + (cap ? 2.2 : 0), R0 = Rp + (cap ? 4.8 : 1.4), r2 = PM.aleatoire(P.id * 131 + 7);
        // habitants : vont et viennent autour de la place
        for (let i = 0, n = 3 + P.dev * 2 + (cap ? 6 : 0); i < n; i++)
          H.push({ x: c.lx, z: c.ly, r: R0 + (r2() - 0.5) * 1.2, a0: r2() * 6.283, amp: 0.4 + r2() * 0.9, w: 0.08 + r2() * 0.1, ph: r2() * 6.283, coul: habits[Math.floor(r2() * habits.length)] });
        // moutons (avant l'ère moderne) dans les prés des fermes
        if (P.bat.ferme && ep !== 'moderne' && ep !== 'futur') for (let i = 0; i < 7; i++) {
          const a = 2.3 + (r2() - 0.5) * 1.4, r = 27 + r2() * 7, x = c.lx + Math.cos(a) * r, z = c.ly + Math.sin(a) * r;
          if (x > 0 && z > 0 && x < C.w && z < C.h && C.pix[Math.round(z) * C.w + Math.round(x)] >= 0 && this.sol(x, z) > 0.5) T.push({ x, z, ph: r2() * 6.283, rot: r2() * 6.283 });
        }
      }
      // vols d'oiseaux : mouettes près des côtes, corneilles et rapaces dans les terres
      for (const P of E.provinces) {
        if (P.id % 3) continue;
        const c = C.provinces[P.id], cote = c.mer && c.mer.length, n = 4 + Math.floor(rnd() * 6), R = 14 + rnd() * 22, h = 28 + rnd() * 26, w = (0.18 + rnd() * 0.16) * (rnd() < 0.5 ? 1 : -1);
        const cx = c.lx + (rnd() - 0.5) * 30, cz = c.ly + (rnd() - 0.5) * 30, coul = cote ? 0xe8e8e4 : (rnd() < 0.5 ? 0x2a2a2e : 0x6a5038);
        for (let i = 0; i < n; i++) O.push({ cx, cz, R: R * (0.75 + rnd() * 0.5), h: h + (rnd() - 0.5) * 6, w, off: i / n * 6.283 + rnd() * 0.4, coul, ph: rnd() * 6.283, s: cote ? 1 : 0.8 });
      }
      // navires au large : boucles en eau profonde devant les côtes des peuples
      if (this.flotte) for (const m of this.flotte.meshes) { this.monde.remove(m); if (!m.geometry.partage) m.geometry.dispose(); }
      const routes = [];
      for (const P of E.provinces) {
        if (P.owner < 0 || routes.length >= 12) continue;
        const c = C.provinces[P.id]; if (!c.mer || !c.mer.length) continue;
        for (let essai = 0; essai < 30; essai++) {
          const a = rnd() * 6.283, d = 38 + rnd() * 50, cx = c.lx + Math.cos(a) * d, cz = c.ly + Math.sin(a) * d, R = 14 + rnd() * 22;
          let ok = true; for (let k = 0; k < 20 && ok; k++) { const x = cx + Math.cos(k / 20 * 6.283) * R, z = cz + Math.sin(k / 20 * 6.283) * R; ok = x > 10 && z > 10 && x < C.w - 10 && z < C.h - 10 && this.sol(x, z) < -6; }
          if (ok) { routes.push({ cx, cz, R, w: (0.02 + rnd() * 0.015) * (rnd() < 0.5 ? 1 : -1) * 22 / R, a0: rnd() * 6.283 }); break; }
        }
      }
      this.flotte = null;
      if (routes.length) {
        const ancien = ep === 'antique' || ep === 'medieval' || ep === 'industriel';
        let meshes = [], k = 1;
        if (ancien && this.glb && this.glb.navire) {
          meshes = this.instGLB('navire', routes.map(r => [r.cx, r.cz, 1, 0]), 11, 0, -0.6);
          const b = new THREE.Box3().setFromObject(this.glb.navire), d = b.getSize(new THREE.Vector3()); k = 11 / Math.max(d.x, d.z, 0.01);
        } else if (!ancien) {
          const m = this.inst(ep === 'futur' ? 'navire_futur' : 'cargo', routes.map(r => [r.cx, r.cz]), (o, a, c) => { o.position.set(a[0], 0, a[1]); c.set(0xffffff); }, null, this.matBat()); meshes = [m];
        }
        for (const m of meshes) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; this.monde.add(m); }
        this.flotte = { meshes, routes, k: ancien ? k : 1, ancien };
      }
    }
    animerVie() {
      if (!this.V || !this.habitants) return;
      const V = this.V, t = this.temps / 1000, d = this.cam.d, o = new THREE.Object3D(), col = new THREE.Color();
      const poser = (m, i, x, y, z, rot, s, couleur, mode, ph, roulis) => { o.position.set(x, y, z); o.rotation.set(0, rot, roulis || 0); o.scale.setScalar(s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, col.set(couleur)); const an = m.geometry.attributes.aAnim.array; an[i * 2] = ph; an[i * 2 + 1] = mode; };
      const fin = (m, n) => { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.geometry.attributes.aAnim.needsUpdate = true; };
      // habitants et troupeaux : seulement de près (invisibles de loin, inutile de les calculer)
      let n = 0;
      if (d < 420) for (const h of this.habitants) {
        if (n >= 3500) break;
        const u = Math.sin(t * h.w + h.ph), a = h.a0 + h.amp * u, v = h.amp * h.w * Math.cos(t * h.w + h.ph), x = h.x + Math.cos(a) * h.r, z = h.z + Math.sin(a) * h.r;
        const rot = Math.atan2(-Math.sin(a) * Math.sign(v || 1), Math.cos(a) * Math.sign(v || 1));
        poser(V.villageois, n++, x, this.sol(x, z), z, rot, 0.92, h.coul, Math.abs(v) * h.r > 0.12 ? 1 : 0, h.ph * 3);
      }
      fin(V.villageois, n); n = 0;
      if (d < 420) for (const m of this.troupeaux) {
        const x = m.x + Math.sin(t * 0.03 + m.ph) * 1.6, z = m.z + Math.cos(t * 0.025 + m.ph * 1.3) * 1.6;
        poser(V.mouton, n++, x, this.sol(x, z), z, m.rot + Math.sin(t * 0.05 + m.ph) * 0.8, 1, 0xffffff, 0, m.ph);
      }
      fin(V.mouton, n); n = 0;
      if (d < 950) for (const b of this.vols) {
        const a = t * b.w + b.off, R = b.R * (1 + 0.12 * Math.sin(t * 0.4 + b.ph)), x = b.cx + Math.cos(a) * R, z = b.cz + Math.sin(a) * R, sg = Math.sign(b.w);
        poser(V.oiseau, n++, x, Math.max(this.sol(x, z), 0) + b.h + Math.sin(t * 0.5 + b.ph) * 2.5, z, Math.atan2(-Math.sin(a) * sg, Math.cos(a) * sg), b.s * 1.25, b.coul, 0, b.ph, -0.35 * sg);
      }
      fin(V.oiseau, n);
      // navires : avancent sur leur boucle, tanguent et roulent
      const F = this.flotte;
      if (F) F.routes.forEach((r, i) => {
        const a = r.a0 + t * r.w, sg = Math.sign(r.w), x = r.cx + Math.cos(a) * r.R, z = r.cz + Math.sin(a) * r.R;
        o.position.set(x, F.ancien ? -0.6 + Math.sin(t * 1.1 + i) * 0.12 : 0, z); o.rotation.set(Math.sin(t * 0.9 + i) * 0.03, Math.atan2(-Math.sin(a) * sg, Math.cos(a) * sg), Math.sin(t * 0.7 + i * 2) * 0.05 - 0.04 * sg); o.scale.setScalar(F.k); o.updateMatrix();
        for (const m of F.meshes) m.setMatrixAt(i, o.matrix);
      });
      if (F) for (const m of F.meshes) m.instanceMatrix.needsUpdate = true;
    }
    pieces() {
      const ep = this.epoque;
      if (this.P && this.P.ep === ep) return this.P;
      if (this.P) for (const k in this.P) if (this.P[k].isMesh) { this.scene.remove(this.P[k]); this.P[k].geometry.dispose(); }
      const mat = this.mats.figurines || (this.mats.figurines = (() => { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.05 }); m.customProgramCacheKey = () => 'figurines-v2';
        m.onBeforeCompile = sh => {
          sh.uniforms.uT = this.U.uT;
          sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute float matiere; attribute vec3 art; attribute vec2 aAnim; uniform float uT; varying float vMatF;
// angle du membre : 0 au repos (respiration), 1 en marche, 2 au combat (coups portés, bouclier levé)
float angleArt() {
  float m = floor(art.x + 0.5), mode = floor(aAnim.y + 0.5), ph = aAnim.x; if (m < 0.5) return 0.0;
  if (m > 6.5) { float k = 0.08 + 0.62 * smoothstep(-0.2, 0.4, sin(uT * 0.6 + ph)); return (m == 7.0 ? 1.0 : -1.0) * k * sin(uT * 10.0 + ph * 3.0); }
  if (mode < 0.5) return m == 3.0 ? 0.05 * sin(uT * 1.6 + ph) : (m == 6.0 ? 0.1 * sin(uT * 0.9 + ph) - 0.05 : 0.0);
  if (mode < 1.5) { float s = sin(uT * 7.0 + ph); return m == 1.0 ? 0.5 * s : m == 2.0 ? -0.5 * s : m == 3.0 ? -0.2 * s : m == 4.0 ? 0.12 * s : m == 6.0 ? 0.14 * s : 0.0; }
  float f = sin(uT * 6.0 + ph), coup = smoothstep(0.0, 0.85, f);
  return m == 1.0 ? 0.28 : m == 2.0 ? -0.32 : m == 3.0 ? -0.35 - 1.1 * coup : m == 4.0 ? -0.5 : m == 6.0 ? -0.25 + 0.3 * f : 0.0;
}
vec3 tournerX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }
vec3 tournerA(vec3 v, float a) { if (art.x < 6.5) return tournerX(v, a); float c = cos(a), s = sin(a); return vec3(v.x * c - v.y * s, v.x * s + v.y * c, v.z); }`)
            .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nfloat aArt = angleArt(); objectNormal = tournerA(objectNormal, aArt);')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 pivA = vec3(0.0, art.y, art.z); transformed = pivA + tournerA(transformed - pivA, aArt); vMatF = matiere;
if (aAnim.y > 0.5 && aAnim.y < 1.5) transformed.y += abs(cos(uT * 7.0 + aAnim.x)) * 0.09;
if (aAnim.y > 1.5) transformed.z += 0.12 * smoothstep(0.0, 0.85, sin(uT * 6.0 + aAnim.x));`)
            .replace('#include <color_vertex>', `vColor = vec3(1.0);
#ifdef USE_COLOR
vColor = color;
#endif
#ifdef USE_INSTANCING_COLOR
vColor *= mix(vec3(1.0), instanceColor, max(step(98.0, matiere), step(2.97, color.r + color.g + color.b)));
#endif`);
          sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vMatF;')
            .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nif (abs(vMatF - 30.0) < 0.5 || abs(vMatF - 13.0) < 0.5) roughnessFactor = 0.34;')
            .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nif (abs(vMatF - 30.0) < 0.5 || abs(vMatF - 13.0) < 0.5) metalnessFactor = 0.8;')
            .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (abs(vMatF - 6.0) < 0.5) totalEmissiveRadiance += diffuseColor.rgb * 2.6;');
        }; return m; })());
      const MAX = 3500, F = figurines(ep), M = this.M;
      const mk = g => { g = g.clone(); g.setAttribute('aAnim', new THREE.InstancedBufferAttribute(new Float32Array(MAX * 2), 2).setUsage(THREE.DynamicDrawUsage));
        const m = new THREE.InstancedMesh(g, mat, MAX); m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; this.scene.add(m); return m; };
      const futur = ep === 'moderne' || ep === 'futur';
      if (this.V) for (const k in this.V) { this.scene.remove(this.V[k]); this.V[k].geometry.dispose(); }
      this.V = { villageois: mk(F.villageois), mouton: mk(F.mouton), oiseau: mk(F.oiseau) }; this.V.oiseau.castShadow = false;
      this.P = { ep, inf: mk(F.inf), archer: mk(F.archer || F.inf), cav: mk(F.cav || M.char), siege: mk(F.siege || (futur ? M.char : M.engin)), mythe: mk(F.mythe), etendard: mk(M.etendard) };
      // taille des créatures : un géant ou une machine domine la troupe
      this.P.echelleMythe = ep === 'antique' || ep === 'medieval' ? 2.2 : 1.6;
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
      const E = this.j.etat, P = this.pieces(), o = new THREE.Object3D(), col = new THREE.Color(), t = this.temps / 1000;
      const n = {}; for (const k in P) if (P[k].isMesh) n[k] = 0;
      const rangs = {}, combats = new Set((this.j.anims || []).filter(a => a.type === 'bataille').map(a => a.prov));
      this.positions = [];
      const ajouter = (k, x, y, z, rot, s, couleur, mode, ph) => { const i = n[k]++; if (i >= 3500) return; o.position.set(x, y, z); o.rotation.set(0, rot, 0); o.scale.setScalar(s); o.updateMatrix(); P[k].setMatrixAt(i, o.matrix); P[k].setColorAt(i, col.set(couleur)); const an = P[k].geometry.attributes.aAnim.array; an[i * 2] = ph; an[i * 2 + 1] = mode; };
      // formation en blocs : créatures et héros devant, puis fantassins, archers, cavaliers et machines ; [modèle, écart, profondeur, largeur maximale]
      const BLOCS = { mythe: ['mythe', 4.4, 4.8, 3], heros: ['inf', 2.2, 2.2, 2], inf: ['inf', 1.5, 1.75, 8], milice: ['inf', 1.5, 1.75, 8], archer: ['archer', 1.55, 1.85, 8], cav: ['cav', 2.3, 3.6, 5], siege: ['siege', 4.2, 4.8, 3] };
      for (const a of E.armees) {
        const rang = rangs[a.prov] = (rangs[a.prov] || 0) + 1, pos = this.positionArmee(a, rang - 1), N = E.nations[a.owner];
        const marche = a.chemin.length > 0, combat = combats.has(a.prov) || (E.provinces[a.prov].siege && E.provinces[a.prov].siege.par === a.owner);
        const mode = combat ? 2 : marche ? 1 : 0;
        const tot = PM.effectif(a), Fx = Math.max(3, Math.min(64, Math.round(Math.sqrt(tot) * 2.8))), cats = {};
        for (const u in a.unites) { const c = PM.UNITES[u].cat; cats[c] = (cats[c] || 0) + a.unites[u] * (c === 'mythe' ? 3 : 1); }
        const somme = Object.values(cats).reduce((s, x) => s + x, 0) || 1;
        const cos = Math.cos(pos.dir), sin = Math.sin(pos.dir), coul = new THREE.Color(N.couleur).getHex();
        const ORDRE = ['mythe', 'heros', 'inf', 'milice', 'archer', 'cav', 'siege'], nb = {};
        for (const c of ORDRE) { nb[c] = Math.round(Fx * (cats[c] || 0) / somme); if (c === 'heros' && cats[c]) nb[c] = Math.max(1, Math.min(2, nb[c])); }
        if (!ORDRE.some(c => nb[c])) nb.inf = 3;
        let z0 = 0, i = 0;
        for (const c of ORDRE) {
          const k = nb[c]; if (!k) continue;
          const [nom, ecart, prof, W] = BLOCS[c], larg = Math.min(k, W);
          for (let q = 0; q < k; q++, i++) {
            const lig = Math.floor(q / larg), dans = Math.min(larg, k - lig * larg), gx = ((q % larg) - (dans - 1) / 2) * ecart + (lig % 2) * 0.25, gz = z0 - lig * prof;
            let x = pos.x + gx * cos + gz * sin, z = pos.z - gx * sin + gz * cos;
            if (combat) { x += Math.sin(t * 1.3 + i * 1.7) * 0.35; z += Math.cos(t * 1.1 + i) * 0.35; }
            const y = this.sol(x, z), ph = (a.id * 1.7 + i * 0.61) % 6.283;
            if (c === 'mythe') ajouter('mythe', x, y, z, pos.dir, P.echelleMythe, new THREE.Color(coul).multiplyScalar(0.8).getHex(), mode, ph);
            else ajouter(nom, x, y, z, pos.dir, c === 'heros' ? 1.25 : 1, c === 'heros' ? 0xf0c85a : coul, mode, marche ? (lig * 0.2 + (q % 2) * 3.14) : ph);
          }
          z0 -= Math.ceil(k / larg) * prof + 0.8;
        }
        { const ex = pos.x + 2.6 * cos + 1.2 * sin, ez = pos.z - 2.6 * sin + 1.2 * cos; ajouter('etendard', ex, this.sol(ex, ez) + (marche ? Math.abs(Math.sin(t * 7)) * 0.2 : 0), ez, pos.dir + Math.sin(t * 2 + a.id) * 0.25, 1, coul, 0, 0); }
        this.positions.push({ id: a.id, x: pos.x, z: pos.z });
      }
      for (const k in n) { const m = P[k]; m.count = Math.min(3500, n[k]); m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.geometry.attributes.aAnim.needsUpdate = true; }
    }
    // ---------- caméra (avec inertie) ----------
    // inclinaison : rasante de près (on voit l'horizon et le ciel), plongeante de loin (vue de stratégie)
    tangage(d) { return Math.max(0.5, Math.min(1.16, 0.42 + d / 1350)); }
    placerCamera(dt) {
      const c = this.cam, v = this.vise, k = 1 - Math.exp(-(dt || 16) / 90);
      for (const p of ['x', 'z', 'd', 'lacet']) c[p] += (v[p] - c[p]) * k;
      const phi = this.tangage(c.d), y0 = Math.max(0, this.sol(c.x, c.z) * 0.6);
      this.camera.position.set(c.x + Math.sin(c.lacet) * c.d * Math.cos(phi), y0 + c.d * Math.sin(phi), c.z + Math.cos(c.lacet) * c.d * Math.cos(phi));
      this.camera.lookAt(c.x, y0, c.z);
      // brume de l'air : les lointains se fondent dans l'horizon du ciel photographique
      this.scene.fog.near = c.d * 1.4 / (this.pack.brume || 1); this.scene.fog.far = (c.d * 5 + 900) / (this.pack.brume || 1);
      const far = c.d * 9 + 4000; if (Math.abs(this.camera.far - far) > 1) { this.camera.near = Math.max(0.5, c.d * 0.02); this.camera.far = far; this.camera.updateProjectionMatrix(); }
      // ombres : la zone couverte suit la caméra
      const s = this.soleil, L = Math.max(70, Math.min(1100, c.d * 1.05));
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
      this.temps += dt || 0; this.dt = dt; this.U.uT.value = this.temps / 1000;
      const w = this.cv.clientWidth, h = this.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (this.taille !== w + 'x' + h) {
        this.taille = w + 'x' + h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.et.width = w * dpr; this.et.height = h * dpr;
        this.creerPost(w, h);
        if (this.matFumee) this.matFumee.uniforms.uEchelle.value = h * this.renderer.getPixelRatio() * 0.9;
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
      this.placerCamera(dt); this.majArmees(); this.animerVie();
      if (this.herbe) this.herbe.visible = this.Q.herbe > 0 && this.cam.d < 240 && !(this.pack.neige.partout > 0.3);
      if (this.composer) {
        if (this.etal) { this.etal.uniforms.uT.value = this.temps / 1000; this.etal.uniforms.uRes.value.set(w, h); }
        if (this.fxaa && this.fxaa.setSize) { /* taille suivie par le compositeur */ }
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
