/* Pax Mythica — vue 3D façon Age of Mythology (three.js hébergé dans vendor/).
   Sol : relief détaillé (pics enneigés, collines, plages), texture peinte par le programme (herbes, sable, roche selon la pente, neige),
   routes entre les villes, frontières lumineuses aux couleurs des peuples. Eau animée (vagues, reflets du soleil, écume des côtes),
   ombres portées, brume, nuages. Forêts et villes instanciées (des milliers d'objets en quelques dessins), style des bâtiments selon
   le panthéon et l'époque, soldats en formation qui marchent et se battent. Caméra inclinée avec inertie (glisser, molette, Q/E).
   Même interface que Rendu (rendu.js) pour les clics : provinceA, armeeA, centrerSur, deplacer, zoomer. */
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

  // ---------- modèles (géométries fusionnées, couleurs neutres, teintées par instance) ----------
  function modeles() {
    const pierre = 0xece4d2, tuile = 0xb9573c, bois = 0x9a6a40, sombre = 0x6a4a30, sable = 0xdcc08a, chaume = 0xb79a5a, verre = 0x7fb8d8, acier = 0x9aa4ad, beton = 0xbdb8ae, neon = 0x6ff3ff;
    const colonnes = (n, w, z, h, y) => { const l = []; for (let i = 0; i < n; i++) l.push([Cy(0.32, 0.36, h, 8, -w / 2 + i * w / (n - 1), y, z), 0xf6f1e4]); return l; };
    const M = {
      // maisons
      maison_grecs: fusion([[B(3, 2.2, 3), pierre], [Co(2.55, 1.6, 4, 0, 2.2, 0, Math.PI / 4), tuile]]),
      maison_egyptiens: fusion([[B(3.2, 2.4, 3.2), sable], [B(3.5, 0.35, 3.5, 0, 2.4), 0xc9a86a], [B(1, 0.8, 1, 0.8, 2.75, 0.8), sable]]),
      maison_nordiques: fusion([[B(4, 2, 2.6), bois], [new THREE.CylinderGeometry(0.02, 2.1, 4.4, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 0.9, 0.95).translate(0, 2.9, 0), sombre]]),
      maison_atlantes: fusion([[Cy(1.6, 1.7, 2.2, 10), 0xeef6f5], [new THREE.SphereGeometry(1.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 2.2, 0), 0x2fa59a]]),
      hutte: fusion([[Cy(1.4, 1.5, 1.5, 8), 0x9a7a55], [Co(1.9, 1.8, 8, 0, 1.5), chaume]]),
      maison_medieval: fusion([[B(3, 2.6, 3.4), 0xe8dcc0], [B(3.1, 0.25, 3.5, 0, 1.2), bois], [new THREE.CylinderGeometry(0.02, 2.3, 3.6, 3).rotateZ(Math.PI / 2).rotateX(Math.PI / 6).scale(1, 1.1, 0.95).translate(0, 3.5, 0), 0x6b4a32]]),
      maison_industriel: fusion([[B(3.4, 3.4, 3), 0x9a4a36], [B(3.6, 0.4, 3.2, 0, 3.4), 0x4b4b52], [Cy(0.35, 0.35, 1.8, 6, 1, 3.6, 0.8), 0x5a3a2a]]),
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
      // nature
      sapin: fusion([[Cy(0.3, 0.42, 1.6, 6), 0x5a3d24], [Co(2.3, 3.2, 7, 0, 1.2), 0x2f5a2c], [Co(1.8, 2.8, 7, 0, 2.9), 0x356530], [Co(1.2, 2.3, 7, 0, 4.4), 0x3c6f36]]),
      feuillu: fusion([[Cy(0.32, 0.45, 2.4, 6), 0x5e4128], [Sp(2.1, 0, 3.8, 0), 0x4f7a38], [Sp(1.5, 1.1, 3.2, 0.6), 0x5a8640], [Sp(1.4, -1, 3.5, -0.5), 0x4a7334]]),
      palmier: fusion([[Cy(0.22, 0.32, 5, 6).translate(0.3, 0, 0), 0x7a5a34], [Co(2.6, 1.1, 7, 0.4, 4.6), 0x5f8a3a]]),
      buisson: fusion([[Sp(1, 0, 0.6, 0, 0), 0x587e3a], [Sp(0.7, 0.7, 0.45, 0.3, 0), 0x4f7434]]),
      rocher: fusion([[rocheuse(2.2, 11), 0x6f6862]]),
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

  // ---------- eau : vagues, profondeur, reflets du soleil, écume ----------
  function materiauEau(profondeur, W, H, soleil) {
    return new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: Object.assign(THREE.UniformsUtils.clone(THREE.UniformsLib.fog), { uT: { value: 0 }, uProf: { value: profondeur }, uTaille: { value: new THREE.Vector2(W, H) }, uSoleil: { value: soleil.clone().normalize() } }),
      vertexShader: `varying vec3 vMonde;
${THREE.ShaderChunk.fog_pars_vertex}
        void main() { vec4 m = modelMatrix * vec4(position, 1.0); vMonde = m.xyz; vec4 mvPosition = viewMatrix * m; gl_Position = projectionMatrix * mvPosition;
${THREE.ShaderChunk.fog_vertex}
}`,
      fragmentShader: `uniform float uT; uniform sampler2D uProf; uniform vec2 uTaille; uniform vec3 uSoleil; varying vec3 vMonde;
${THREE.ShaderChunk.fog_pars_fragment}
        float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main() {
          vec2 p = vMonde.xz;
          float d = texture2D(uProf, clamp(p / uTaille, 0.0, 1.0)).r; if (p.x < 0.0 || p.y < 0.0 || p.x > uTaille.x || p.y > uTaille.y) d = 1.0;
          // vagues : somme de sinus et de bruit, donne la normale
          float t = uT;
          float e = 0.6;
          float hx = sin(p.x * 0.09 + t * 1.1) * 0.5 + sin((p.x + p.y) * 0.13 + t * 1.7) * 0.35 + n(p * 0.18 + t * 0.25) * 0.8;
          float hz = cos(p.y * 0.11 + t * 1.3) * 0.5 + cos((p.x - p.y) * 0.12 + t * 1.5) * 0.35 + n(p * 0.18 - t * 0.22 + 7.0) * 0.8;
          float loin = smoothstep(350.0, 1400.0, length(cameraPosition - vMonde));
          vec3 nrm = normalize(vec3(hx * 0.16 * (1.0 - loin * 0.85), 1.0, hz * 0.16 * (1.0 - loin * 0.85)));
          vec3 vue = normalize(cameraPosition - vMonde);
          float fres = pow(1.0 - max(dot(nrm, vue), 0.0), 3.0);
          vec3 creux = vec3(0.04, 0.17, 0.30), bas = vec3(0.15, 0.55, 0.62);
          vec3 c = mix(bas, creux, smoothstep(0.02, 0.55, d));
          c = mix(c, vec3(0.62, 0.78, 0.88), fres * 0.55);
          float spec = pow(max(dot(reflect(-uSoleil, nrm), vue), 0.0), 90.0);
          c += vec3(1.0, 0.92, 0.75) * spec * (1.1 - loin * 0.8);
          // écume le long des côtes, qui respire avec les vagues
          float bord = 1.0 - smoothstep(0.0, 0.08, d);
          float ecume = bord * smoothstep(0.35, 0.75, n(p * 0.45 + vec2(t * 0.6, -t * 0.4)) + 0.25 * sin(d * 90.0 - t * 2.2));
          c = mix(c, vec3(0.95, 0.97, 0.96), clamp(ecume, 0.0, 1.0) * 0.85);
          float a = mix(0.55, 0.93, smoothstep(0.0, 0.25, d)); a = max(a, ecume * 0.9);
          gl_FragColor = vec4(c, a);
${THREE.ShaderChunk.fog_fragment}
        }`
    });
  }

  class Vue3D {
    constructor(canvas, calque, r2d) {
      this.cv = canvas; this.et = calque; this.ctx = calque.getContext('2d'); this.r2d = r2d;
      const R = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.92;
      R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene();
      this.ciel = new THREE.Color(0xb4cfe0); this.scene.fog = new THREE.Fog(this.ciel, 600, 2200);
      this.scene.background = this.fondCiel();
      this.camera = new THREE.PerspectiveCamera(36, 1, 2, 9000);
      this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x4a3c28, 0.55));
      this.dirSoleil = new THREE.Vector3(-0.55, 0.78, 0.32).normalize();
      const s = this.soleil = new THREE.DirectionalLight(0xffe2b8, 2.1);
      s.castShadow = true; s.shadow.mapSize.set(2048, 2048); s.shadow.bias = -0.0004; s.shadow.normalBias = 0.6;
      this.scene.add(s); this.scene.add(s.target);
      this.cam = { x: 0, z: 0, d: 600, lacet: 0 }; this.vise = { x: 0, z: 0, d: 600, lacet: 0 };
      this.temps = 0; this.boites = []; this.mats = {}; this.M = modeles();
      this.ray = new THREE.Raycaster();
    }
    fondCiel() {
      const c = document.createElement('canvas'); c.width = 4; c.height = 256; const g = c.getContext('2d'), d = g.createLinearGradient(0, 0, 0, 256);
      d.addColorStop(0, '#5d8fc2'); d.addColorStop(0.55, '#a9c8e0'); d.addColorStop(1, '#e8e2d2'); g.fillStyle = d; g.fillRect(0, 0, 4, 256);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
    }
    mat(opts) { const k = JSON.stringify(opts); return this.mats[k] || (this.mats[k] = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, opts))); }

    // ---------- construction du monde ----------
    lier(j) {
      this.j = j; const C = j.carte;
      if (this.monde) { this.scene.remove(this.monde); this.monde.traverse(o => { if (o.geometry && !o.geometry.partage) o.geometry.dispose(); }); }
      this.monde = new THREE.Group(); this.scene.add(this.monde);
      this.epoque = (j.etat.reglages && j.etat.reglages.epoque) || 'antique';
      this.F = Math.min(1.5, 3072 / C.w);
      this.tex = document.createElement('canvas'); this.tex.width = Math.round(C.w * this.F); this.tex.height = Math.round(C.h * this.F);
      this.texture = new THREE.CanvasTexture(this.tex); this.texture.encoding = THREE.sRGBEncoding; this.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      this.vus = { base: -1, calque: -1, halo: -1 };
      this.hauteurs(); this.peindreSol(); this.construireSol(); this.construireEau(); this.construireNature(); this.construireNuages();
      this.instances = {}; this.sigVilles = ''; this.armees = {};
      this.cadrer(); Object.assign(this.cam, this.vise);
    }
    // relief : hauteur de la carte + montagnes à crêtes, collines, plaines douces ; poids des terrains lissés (pas de marche entre provinces)
    hauteurs() {
      const C = this.j.carte, E = this.j.etat, pas = this.pas = Math.max(3, Math.round(C.w / 400)), gx = this.gx = Math.ceil(C.w / pas) + 1, gz = this.gz = Math.ceil(C.h / pas) + 1;
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
        if (s < 0) { H[o] = Math.max(-40, s * 95 - 1.5); continue; }
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
    // texture du sol peinte au pixel : couleurs des terrains mêlées, variations, roche des pentes, neige des sommets, plages, fonds marins
    peindreSol() {
      const C = this.j.carte, F = this.F, w = this.tex.width, h = this.tex.height, g = document.createElement('canvas'); g.width = w; g.height = h;
      const ctx = g.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, nz = bruit(77), nz2 = bruit(91);
      const PAL = { plaine: [92, 138, 58], foret: [52, 84, 38], collines: [128, 134, 74], montagne: [118, 110, 100], desert: [222, 180, 112] };
      const types = this.poids.types, W = this.poids.W, gx = this.gx, pas = this.pas;
      for (let py = 0; py < h; py++) {
        const y = py / F;
        for (let px = 0; px < w; px++) {
          const x = px / F, o = (py * w + px) * 4, fx = Math.min(gx - 1.001, x / pas), fz = Math.min(this.gz - 1.001, y / pas), i = fx | 0, k = fz | 0, u = fx - i, v = fz - k, g0 = k * gx + i;
          const hh = this.H[g0] * (1 - u) * (1 - v) + this.H[g0 + 1] * u * (1 - v) + this.H[g0 + gx] * (1 - u) * v + this.H[g0 + gx + 1] * u * v;
          const n1 = nz(x / 9, y / 9, 3), n2 = nz2(x / 2.2, y / 2.2, 2), var1 = 0.82 + n1 * 0.36 + (n2 - 0.5) * 0.12;
          let r, gg, b;
          if (hh < 0.4) {
            const p = Math.min(1, -hh / 30); r = 196 - p * 150; gg = 182 - p * 120; b = 140 - p * 60;
          } else {
            r = 0; gg = 0; b = 0; let tot = 0;
            for (let t = 0; t < 5; t++) { const wt = W[t][g0] * (1 - u) * (1 - v) + W[t][g0 + 1] * u * (1 - v) + W[t][g0 + gx] * (1 - u) * v + W[t][g0 + gx + 1] * u * v; if (!wt) continue; const c = PAL[types[t]]; r += c[0] * wt; gg += c[1] * wt; b += c[2] * wt; tot += wt; }
            if (tot) { r /= tot; gg /= tot; b /= tot; } else { r = 92; gg = 138; b = 58; }
            r *= var1; gg *= var1; b *= var1 * 0.95 + 0.05;
            // pente : roche
            const sx = this.H[g0 + 1] - this.H[g0], sz = this.H[g0 + gx] - this.H[g0], pente = Math.min(1, Math.sqrt(sx * sx + sz * sz) / (pas * 1.4));
            const roche = Math.max(0, Math.min(1, (pente - 0.35) * 2.2 + (n1 - 0.5) * 0.4));
            const rv = 92 + n2 * 32; r += (rv - r) * roche; gg += (rv * 0.97 - gg) * roche; b += (rv * 0.93 - b) * roche;
            // neige des sommets
            const neige = Math.max(0, Math.min(1, (hh - 76 + n1 * 14) / 9)) * (1 - roche * 0.6);
            r += (246 - r) * neige; gg += (248 - gg) * neige; b += (252 - b) * neige;
            // plage
            const plage = Math.max(0, Math.min(1, (2.4 - hh) / 1.6));
            r += (220 - r) * plage; gg += (204 - gg) * plage; b += (156 - b) * plage;
          }
          d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0); this.base = g;
    }
    // frontières lumineuses, légère teinte des territoires, routes entre villes voisines, sélection
    peindreTerritoires() {
      const C = this.j.carte, E = this.j.etat, F = this.F, W = C.w, H = C.h;
      const m = document.createElement('canvas'); m.width = W; m.height = H; const mc = m.getContext('2d'), img = mc.createImageData(W, H), d = img.data;
      const own = E.provinces.map(p => p.owner), col = E.nations.map(N => PM.hex(N.couleur));
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const k = y * W + x, a = C.pix[k]; if (a < 0) continue;
        const o = own[a], b = k * 4;
        let fN = false, fP = false;
        for (const v of [C.pix[k - 1], C.pix[k + 1], C.pix[k - W], C.pix[k + W]]) { if (v >= 0 && own[v] !== o) fN = true; else if (v >= 0 && v !== a) fP = true; }
        if (o >= 0) {
          const c = col[o];
          if (fN) { d[b] = Math.min(255, c[0] * 1.25 + 40); d[b + 1] = Math.min(255, c[1] * 1.25 + 40); d[b + 2] = Math.min(255, c[2] * 1.25 + 40); d[b + 3] = 255; }
          else if (fP) { d[b] = c[0] * 0.5; d[b + 1] = c[1] * 0.5; d[b + 2] = c[2] * 0.5; d[b + 3] = 60; }
          else { d[b] = c[0]; d[b + 1] = c[1]; d[b + 2] = c[2]; d[b + 3] = 30; }
        } else if (fN || fP) { d[b] = 40; d[b + 1] = 32; d[b + 2] = 24; d[b + 3] = 45; }
      }
      mc.putImageData(img, 0, 0);
      const t = this.tex.getContext('2d'); t.imageSmoothingEnabled = true; t.imageSmoothingQuality = 'high';
      t.drawImage(this.base, 0, 0);
      // halo doux sous la ligne de frontière
      const halo = this.haloCanvas || (this.haloCanvas = document.createElement('canvas')); halo.width = W; halo.height = H;
      const hc = halo.getContext('2d'); hc.filter = 'blur(2.4px)'; hc.drawImage(m, 0, 0); hc.filter = 'none';
      t.globalAlpha = 0.8; t.drawImage(halo, 0, 0, W * F, H * F); t.globalAlpha = 1;
      t.drawImage(m, 0, 0, W * F, H * F);
      // routes : entre les villes de provinces voisines tenues par des peuples
      t.save(); t.lineCap = 'round';
      const routes = [];
      for (const p of C.provinces) for (const q of p.voisins) if (q > p.id && own[p.id] >= 0 && own[q] === own[p.id]) routes.push([p, C.provinces[q]]);
      for (const [lw, st] of [[2.8, 'rgba(70,52,34,.45)'], [1.7, 'rgba(170,140,98,.9)']]) {
        t.lineWidth = lw * F; t.strokeStyle = st;
        for (const [p, q] of routes) {
          const mx = (p.lx + q.lx) / 2 + (((p.id * 31 + q.id * 17) % 13) - 6) * 3.2, my = (p.ly + q.ly) / 2 + (((p.id * 13 + q.id * 7) % 11) - 5) * 3.2;
          if (C.pix[Math.round(my) * W + Math.round(mx)] < 0) continue;
          t.beginPath(); t.moveTo(p.lx * F, p.ly * F); t.quadraticCurveTo(mx * F, my * F, q.lx * F, q.ly * F); t.stroke();
        }
      }
      // routes maritimes en pointillés sous l'eau
      t.setLineDash([5 * F, 7 * F]); t.lineWidth = 1.6 * F; t.strokeStyle = 'rgba(240,248,255,.5)';
      for (const p of C.provinces) for (const q of p.mer) if (q > p.id) { const Q = C.provinces[q]; t.beginPath(); t.moveTo(p.lx * F, p.ly * F); t.lineTo(Q.lx * F, Q.ly * F); t.stroke(); }
      t.restore();
      // sélection (même dessin que la carte 2D)
      t.globalAlpha = 0.85; t.drawImage(this.r2d.halo, 0, 0, W * F, H * F); t.globalAlpha = 1;
      this.texture.needsUpdate = true;
    }
    construireSol() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, pos = new Float32Array(gx * gz * 3), uv = new Float32Array(gx * gz * 2), idx = new Uint32Array((gx - 1) * (gz - 1) * 6);
      let q = 0;
      for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
        const o = k * gx + i, x = Math.min(C.w, i * this.pas), z = Math.min(C.h, k * this.pas);
        pos[o * 3] = x; pos[o * 3 + 1] = this.H[o]; pos[o * 3 + 2] = z; uv[o * 2] = x / C.w; uv[o * 2 + 1] = 1 - z / C.h;
        if (i < gx - 1 && k < gz - 1) { idx[q++] = o; idx[q++] = o + gx; idx[q++] = o + 1; idx[q++] = o + 1; idx[q++] = o + gx; idx[q++] = o + gx + 1; }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals();
      if (this.terrain) { this.monde.remove(this.terrain); this.terrain.geometry.dispose(); }
      const m = new THREE.MeshStandardMaterial({ map: this.texture, roughness: 0.95, metalness: 0 });
      // grain de près : un bruit fin multiplié au sol selon la position (évite l'aspect flou en gros plan)
      m.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vMondeSol;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMondeSol = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vMondeSol;
float hS(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float nS(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hS(i), hS(i + vec2(1, 0)), f.x), mix(hS(i + vec2(0, 1)), hS(i + vec2(1, 1)), f.x), f.y); }`)
          .replace('#include <map_fragment>', `#include <map_fragment>
float grain = nS(vMondeSol.xz * 1.7) * 0.5 + nS(vMondeSol.xz * 5.3) * 0.3 + nS(vMondeSol.xz * 0.45) * 0.2;
diffuseColor.rgb *= 0.86 + grain * 0.28;`);
      };
      this.terrain = new THREE.Mesh(g, m); this.terrain.receiveShadow = true; this.monde.add(this.terrain);
    }
    construireEau() {
      const C = this.j.carte, gx = this.gx, gz = this.gz, data = new Uint8Array(gx * gz * 4);
      for (let o = 0; o < gx * gz; o++) { const v = Math.max(0, Math.min(255, (-this.H[o] / 28) * 255)); data[o * 4] = v; data[o * 4 + 3] = 255; }
      const prof = new THREE.DataTexture(data, gx, gz, THREE.RGBAFormat); prof.magFilter = THREE.LinearFilter; prof.minFilter = THREE.LinearFilter; prof.flipY = false; prof.needsUpdate = true;
      const geo = new THREE.PlaneGeometry(C.w * 6, C.h * 6, 1, 1).rotateX(-Math.PI / 2);
      this.eau = new THREE.Mesh(geo, materiauEau(prof, C.w, C.h, this.dirSoleil)); this.eau.position.set(C.w / 2, 0, C.h / 2); this.eau.renderOrder = 2; this.monde.add(this.eau);
      const fond = new THREE.Mesh(new THREE.PlaneGeometry(C.w * 6, C.h * 6).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x123650 })); fond.position.set(C.w / 2, -42, C.h / 2); this.monde.add(fond);
    }
    inst(nom, l, f, opts) {
      const geo = this.M[nom], m = new THREE.InstancedMesh(geo, this.mat(Object.assign({ vertexColors: true }, opts || {})), Math.max(1, l.length)), o = new THREE.Object3D(), c = new THREE.Color();
      l.forEach((a, i) => { f(o, a, c); c.convertSRGBToLinear(); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, c); });
      m.count = l.length; m.castShadow = true; m.receiveShadow = true; return m;
    }
    // forêts denses (sapins au nord et en montagne, feuillus ailleurs), buissons, rochers, palmiers
    construireNature() {
      const C = this.j.carte, E = this.j.etat, rnd = PM.aleatoire((E.reglages.graine || 1) * 13 + 7), centres = C.provinces.map(p => [p.lx, p.ly]);
      const L = { sapin: [], feuillu: [], buisson: [], rocher: [], palmier: [] };
      for (let y = 2; y < C.h; y += 4) for (let x = 2; x < C.w; x += 4) {
        const px = x + (rnd() - 0.5) * 4, pz = y + (rnd() - 0.5) * 4, p = C.pix[Math.min(C.h - 1, Math.round(pz)) * C.w + Math.min(C.w - 1, Math.round(px))];
        if (p < 0) continue; const hh = this.sol(px, pz); if (hh < 2.2) continue;
        const c = centres[p]; if ((c[0] - px) ** 2 + (c[1] - pz) ** 2 < 30 * 30) continue;
        const wF = this.poidsA('foret', px, pz), wM = this.poidsA('montagne', px, pz), wC = this.poidsA('collines', px, pz), wD = this.poidsA('desert', px, pz), r = rnd();
        if (hh > 64) { if (r < 0.05) L.rocher.push([px, pz, 0.8 + rnd()]); continue; }
        if (r < wF * 0.62 + wC * 0.06 + (1 - wF - wM - wC - wD) * 0.025) (pz < C.h * 0.45 || wM > 0.2 || rnd() < 0.35 ? L.sapin : L.feuillu).push([px, pz, 0.75 + rnd() * 0.65]);
        else if (r < wF * 0.7 + 0.03 && wD < 0.3) L.buisson.push([px, pz, 0.6 + rnd() * 0.9]);
        else if (r < 0.05 + wM * 0.22 + wC * 0.05) L.rocher.push([px, pz, 0.5 + rnd() * (0.8 + wM * 1.6)]);
        else if (wD > 0.5 && r < 0.09) L.palmier.push([px, pz, 0.8 + rnd() * 0.5]);
      }
      if (this.nature) for (const m of this.nature) this.monde.remove(m);
      const teinte = (c, a, base) => { const v = 0.82 + ((a[0] * 7.3 + a[1] * 3.1) % 1) * 0.36; c.setRGB(v * base[0], v * base[1], v * base[2]); };
      this.nature = Object.entries(L).map(([nom, l]) => this.inst(nom, l, (o, a, c) => {
        o.position.set(a[0], this.sol(a[0], a[1]) - (nom === 'rocher' ? 0.5 : 0.1), a[1]); o.rotation.set(0, (a[0] * 1.7 + a[1]) % 6.28, 0); o.scale.setScalar(a[2]);
        teinte(c, a, nom === 'rocher' ? [1, 1, 1] : [1, 1.02, 0.95]);
      }));
      for (const m of this.nature) this.monde.add(m);
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
      const E = this.j.etat, C = this.j.carte, ep = this.epoque;
      const sig = E.provinces.map(p => [p.owner, p.dev, Object.keys(p.bat).join(''), p.merveille ? 1 : 0, p.owner >= 0 && E.nations[p.owner].capitale === p.id ? 1 : 0].join('.')).join('|');
      if (sig === this.sigVilles) return; this.sigVilles = sig;
      for (const k in this.instances) this.monde.remove(this.instances[k]);
      const L = {}, mettre = (nom, x, z, rot, s, couleur, sy) => (L[nom] = L[nom] || []).push([x, z, rot || 0, s || 1, couleur == null ? 0xffffff : couleur, sy]);
      for (const P of E.provinces) {
        const c = C.provinces[P.id], N = P.owner >= 0 ? E.nations[P.owner] : null, rnd = PM.aleatoire(P.id * 977 + 3), x0 = c.lx, z0 = c.ly, cap = N && N.capitale === P.id;
        const maison = !N ? 'hutte' : MAISON_EPOQUE[ep] || 'maison_' + N.pantheon;
        mettre('place', x0, z0, 0, 6 + P.dev * 1.6 + (cap ? 3 : 0), 0xffffff, 1);
        const n = (N ? 3 + P.dev * 2 : 2 + P.dev) + (cap ? 5 : 0);
        for (let i = 0; i < n; i++) {
          const a = rnd() * Math.PI * 2, r = 5 + rnd() * (5 + P.dev * 1.5), v = 0.86 + rnd() * 0.28;
          mettre(maison, x0 + Math.cos(a) * r, z0 + Math.sin(a) * r, rnd() * 6.28, 0.85 + rnd() * 0.3, new THREE.Color(v, v * (0.97 + rnd() * 0.05), v * (0.94 + rnd() * 0.08)).getHex());
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
        }, futur ? { transparent: true, opacity: 0.28, emissive: 0x2299aa, depthWrite: false } : nom.endsWith('_futur') ? { emissive: 0x0a2a30 } : null);
        if (nom === 'place' || futur) m.castShadow = false;
        this.instances[nom] = m; this.monde.add(m);
      }
    }
    // ---------- armées : figurines en formation ----------
    pieces() {
      if (this.P) return this.P;
      const MAX = 3500, mk = nom => { const m = new THREE.InstancedMesh(this.M[nom], this.mat({ vertexColors: true, roughness: 0.7 }), MAX); m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = true; this.scene.add(m); return m; };
      this.P = { fantassin: mk('fantassin'), cavalier: mk('cavalier'), char: mk('char'), engin: mk('engin'), geant: mk('geant'), meca: mk('meca') };
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
      this.scene.fog.near = c.d * 1.15; this.scene.fog.far = c.d * 3.4 + 500;
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
      this.temps += dt || 0; this.dt = dt;
      const w = this.cv.clientWidth, h = this.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (this.taille !== w + 'x' + h) { this.taille = w + 'x' + h; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.et.width = w * dpr; this.et.height = h * dpr; }
      const r = this.r2d, v = r.version;
      // relief modifié (éditeur) : reconstruit une fois les retouches finies, pas à chaque clic
      if (v.base !== this.vus.base && this.vus.base >= 0) { this.vus.base = v.base; this.reliefA = this.temps + 900; }
      if (this.reliefA && this.temps >= this.reliefA) { this.reliefA = 0; this.hauteurs(); this.peindreSol(); this.construireSol(); this.construireNature(); this.sigVilles = ''; this.vus.calque = -1; }
      // frontières : au plus quatre fois par seconde (l'éditeur peint en glissant)
      if ((v.base !== this.vus.base || v.calque !== this.vus.calque || v.halo !== this.vus.halo) && !(this.territoiresA > this.temps)) { this.peindreTerritoires(); Object.assign(this.vus, v); this.territoiresA = this.temps + 250; }
      this.construireVilles();
      this.placerCamera(dt); this.majArmees();
      this.eau.material.uniforms.uT.value = this.temps / 1000;
      const nuage = Math.max(0, Math.min(0.75, (this.cam.d - 520) / 700));
      for (const s of this.nuages) { s.material.opacity = nuage; s.position.x += s.userData.v * (dt || 16) / 1000; if (s.position.x > this.j.carte.w + 300) s.position.x = -300; }
      this.renderer.render(this.scene, this.camera);
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
