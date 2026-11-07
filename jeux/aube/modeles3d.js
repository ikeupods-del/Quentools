'use strict';
/* Aube des Nations — modèles 3D construits par le programme (aucun fichier externe).
   Échelle : une case mesure 32 unités de rayon ; un fantassin mesure environ 7,5 unités.
   Fantassins tournés vers la caméra (+z) ; montures, engins et navires de profil, proue vers -x (MODELES3D[type].face = 'x'). */

const M3 = { cache: new Map() };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* Assemble des formes colorées en une seule géométrie (une seule commande de dessin par modèle). */
class Atelier {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.mat = []; this.matiere = 0; }
  ajouter(geo, coul, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(m);
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = coul instanceof THREE.Color ? coul : new THREE.Color(coul);
    for (let i = 0; i < p.length; i += 3) { this.pos.push(p[i], p[i + 1], p[i + 2]); this.nor.push(n[i], n[i + 1], n[i + 2]); this.col.push(c.r, c.g, c.b); this.mat.push(this.matiere); }
    g.dispose();
    return this;
  }
  m(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    return new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
  }
  /* Matrice qui étire l'axe y de la forme entre deux points. */
  entre(a, b) {
    const d = b.clone().sub(a), L = d.length() || 0.001;
    return { L, m: new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize()), V3(1, 1, 1)) };
  }
  boite(w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.ajouter(new THREE.BoxGeometry(w, h, d), c, this.m(x, y, z, rx, ry, rz)); }
  cyl(rh, rb, h, seg, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sz = 1) { return this.ajouter(new THREE.CylinderGeometry(rh, rb, h, seg), c, this.m(x, y, z, rx, ry, rz, sx, 1, sz)); }
  cone(r, h, seg, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sz = 1) { return this.ajouter(new THREE.ConeGeometry(r, h, seg), c, this.m(x, y, z, rx, ry, rz, sx, 1, sz)); }
  sphere(r, c, x, y, z, sx = 1, sy = 1, sz = 1, ws = 9, hs = 7) { return this.ajouter(new THREE.SphereGeometry(r, ws, hs), c, this.m(x, y, z, 0, 0, 0, sx, sy, sz)); }
  boule(r, c, x, y, z, sx = 1, sy = 1, sz = 1, det = 1) { return this.ajouter(new THREE.IcosahedronGeometry(r, det), c, this.m(x, y, z, 0, 0, 0, sx, sy, sz)); }
  dome(r, c, x, y, z, sy = 1, seg = 12) { return this.ajouter(new THREE.SphereGeometry(r, seg, 6, 0, Math.PI * 2, 0, Math.PI / 2), c, this.m(x, y, z, 0, 0, 0, 1, sy, 1)); }
  tore(r, t, c, x, y, z, rx = Math.PI / 2, ry = 0, rz = 0, arc = Math.PI * 2, sx = 1, sy = 1, sz = 1) { return this.ajouter(new THREE.TorusGeometry(r, t, 5, 14, arc), c, this.m(x, y, z, rx, ry, rz, sx, sy, sz)); }
  tour(profil, seg, c, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sz = 1) { return this.ajouter(new THREE.LatheGeometry(profil.map(([a, b]) => new THREE.Vector2(a, b)), seg), c, this.m(x, y, z, rx, ry, rz, sx, 1, sz)); }
  /* Membre arrondi entre deux points. */
  membre(a, b, r, c, seg = 6) { const { L, m } = this.entre(a, b); return this.ajouter(new THREE.CapsuleGeometry(r, L, 2, seg), c, m); }
  tige(a, b, r, c, seg = 5, r2) { const { L, m } = this.entre(a, b); return this.ajouter(new THREE.CylinderGeometry(r2 ?? r, r, L, seg), c, m); }
  barre(a, b, w, d, c) { const { L, m } = this.entre(a, b); return this.ajouter(new THREE.BoxGeometry(w, L, d), c, m); }
  forme(points, ep, c, x, y, z, rx = 0, ry = 0, rz = 0) {
    const s = new THREE.Shape(points.map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: false }); g.translate(0, 0, -ep / 2);
    return this.ajouter(g, c, this.m(x, y, z, rx, ry, rz));
  }
  /* Toit à deux pans (prisme) posé en y, axe le long de z avant rotation ry. */
  toit(w, h, l, c, x, y, z, ry = 0) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 3); g.rotateX(-Math.PI / 2);
    return this.ajouter(g, c, this.m(x, y + h / 3, z, 0, ry, 0, w / 1.732, h / 1.5, l));
  }
  /* Toit à quatre pans. */
  pavillon(w, h, l, c, x, y, z, ry = 0) { return this.ajouter(new THREE.ConeGeometry(0.7072, 1, 4, 1), c, this.m(x, y + h / 2, z, 0, ry + Math.PI / 4, 0, w, h, l)); }
  /* Voile gonflée : plan courbé. */
  voile(w, h, creux, c, x, y, z, ry = 0) {
    const g = new THREE.PlaneGeometry(w, h, 6, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / w + 0.5, v = p.getY(i) / h + 0.5;
      p.setZ(i, Math.sin(u * Math.PI) * Math.sin(Math.min(1, v * 1.2) * Math.PI * 0.9) * creux);
    }
    g.computeVertexNormals();
    return this.ajouter(g, c, this.m(x, y, z, 0, ry, 0));
  }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.computeBoundingSphere();
    return g;
  }
}
function enCache(cle, fabrique) {
  let g = M3.cache.get(cle);
  if (!g) { g = fabrique(); M3.cache.set(cle, g); }
  return g;
}
function teinte(hex, f) {
  const c = new THREE.Color(hex);
  if (f >= 0) c.lerp(new THREE.Color(1, 1, 1), f); else c.multiplyScalar(1 + f);
  return c;
}

/* ---------- Personnages ---------- */
const BOIS = '#6b4423', FER = '#c3c8cd', BRONZE = '#c99a3c', CUIR = '#5a3a22';
const PEAUX = ['#e0b08a', '#c68e64', '#9a6844'];
const CHEVEUX = ['#3b2616', '#1e1712', '#6b4a2a'];
const MODELES3D = {
  colon: { m: 'chariot', face: 'x' }, ouvrier: { m: 'ouvrier' }, eclaireur: { m: 'eclaireur' },
  guerrier: { m: 'fantassin', arme: 'hache', casque: 'cheveux', jupe: true, n: 3, fourrure: true },
  archer: { m: 'fantassin', arme: 'arc', casque: 'capuche', jupe: true, n: 3 },
  lancier: { m: 'fantassin', arme: 'lance', casque: 'bronze', bouclier: 'rond', jupe: true, n: 3 },
  epeiste: { m: 'fantassin', arme: 'epee', casque: 'fer', bouclier: 'long', jupe: true, cotte: true, n: 3 },
  piquier: { m: 'fantassin', arme: 'pique', casque: 'fer', cotte: true, n: 3 },
  arbaletrier: { m: 'fantassin', arme: 'arbalete', casque: 'fer', jupe: true, n: 3 },
  mousquetaire: { m: 'fantassin', arme: 'fusil', casque: 'tricorne', manteau: true, n: 3 },
  fusilier: { m: 'fantassin', arme: 'fusil', casque: 'kepi', manteau: true, n: 3 },
  infanterie: { m: 'fantassin', arme: 'fusil', casque: 'moderne', kaki: true, n: 3 },
  cavalier: { m: 'cavalier', arme: 'lance', casque: 'cheveux', n: 2, face: 'x' },
  chevalier: { m: 'cavalier', arme: 'lance', casque: 'heaume', caparacon: true, armure: true, n: 2, face: 'x' },
  dragon: { m: 'cavalier', arme: 'sabre', casque: 'kepi', manteau: true, n: 2, face: 'x' },
  catapulte: { m: 'catapulte', face: 'x' }, trebuchet: { m: 'trebuchet', face: 'x' }, canon: { m: 'canon', face: 'x' }, artillerie: { m: 'artillerie', face: 'x' }, lanceRoquettes: { m: 'roquettes', face: 'x' },
  char: { m: 'char', face: 'x' }, blinde: { m: 'blinde', face: 'x' },
  galere: { m: 'galere', face: 'x' }, caravelle: { m: 'caravelle', face: 'x' }, fregate: { m: 'fregate', face: 'x' }, cuirasse: { m: 'cuirasse', face: 'x' },
};
function casque3(A, type, x, y, z, k, civ, n = 0) {
  switch (type) {
    case 'cheveux':
      A.sphere(0.84 * k, CHEVEUX[n % 3], x, y + 0.18 * k, z - 0.1 * k, 1, 0.85, 1);
      if (n % 2 === 0) A.sphere(0.5 * k, CHEVEUX[n % 3], x, y - 0.55 * k, z + 0.45 * k, 1, 0.75, 0.6);
      break;
    case 'capuche':
      A.sphere(0.95 * k, teinte(civ, -0.4), x, y + 0.08 * k, z - 0.12 * k, 1, 1.05, 1);
      A.cone(0.55 * k, 1.2 * k, 6, teinte(civ, -0.4), x, y + 0.2 * k, z - 0.95 * k, -1.2, 0, 0);
      break;
    case 'bronze':
      A.dome(0.92 * k, BRONZE, x, y + 0.05 * k, z, 1.08);
      A.tore(0.9 * k, 0.08 * k, BRONZE, x, y + 0.05 * k, z);
      for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * i / 6); A.boite(0.18 * k, 0.55 * k, 0.32 * k, civ, x, y + Math.sin(a) * 1.05 * k + 0.1 * k, z + Math.cos(a) * 1.05 * k, -a + Math.PI / 2, 0, 0); }
      A.boite(0.12 * k, 0.75 * k, 0.5 * k, BRONZE, x - 0.78 * k, y - 0.35 * k, z + 0.25 * k); A.boite(0.12 * k, 0.75 * k, 0.5 * k, BRONZE, x + 0.78 * k, y - 0.35 * k, z + 0.25 * k);
      break;
    case 'fer':
      A.cone(0.9 * k, 1.35 * k, 10, '#9aa0a6', x, y + 0.6 * k, z);
      A.tore(0.88 * k, 0.08 * k, '#7d8388', x, y - 0.02 * k, z);
      A.boite(0.16 * k, 0.75 * k, 0.12 * k, '#8a9095', x, y - 0.3 * k, z + 0.86 * k);
      break;
    case 'heaume':
      A.cyl(0.86 * k, 0.86 * k, 1.6 * k, 12, '#a9afb5', x, y + 0.05 * k, z);
      A.cyl(0.86 * k, 0.6 * k, 0.3 * k, 12, '#a9afb5', x, y + 1.0 * k, z);
      A.boite(1.1 * k, 0.12 * k, 0.3 * k, '#1d2024', x, y + 0.12 * k, z + 0.78 * k);
      A.cone(0.35 * k, 1.1 * k, 6, civ, x, y + 1.6 * k, z - 0.1 * k, -0.4, 0, 0);
      break;
    case 'tricorne':
      A.cyl(0.85 * k, 0.88 * k, 0.45 * k, 10, '#1c1a1a', x, y + 0.6 * k, z);
      A.cone(1.45 * k, 0.55 * k, 3, '#1c1a1a', x, y + 0.48 * k, z, Math.PI, Math.PI, 0);
      A.cyl(0.18 * k, 0.18 * k, 0.08 * k, 8, civ, x + 0.6 * k, y + 0.6 * k, z + 0.75 * k, Math.PI / 2, 0, 0);
      break;
    case 'kepi':
      A.cyl(0.75 * k, 0.84 * k, 1.0 * k, 10, teinte(civ, -0.45), x, y + 0.55 * k, z - 0.05 * k, -0.12, 0, 0);
      A.cyl(0.86 * k, 0.86 * k, 0.18 * k, 10, civ, x, y + 0.12 * k, z);
      A.ajouter(new THREE.CylinderGeometry(0.75 * k, 0.75 * k, 0.08 * k, 10, 1, false, -Math.PI / 2, Math.PI), '#141414', A.m(x, y + 0.05 * k, z + 0.45 * k, 0.15, 0, 0));
      break;
    case 'moderne':
      A.dome(1.0 * k, '#5c6a3f', x, y + 0.02 * k, z, 0.95);
      A.tore(1.0 * k, 0.1 * k, '#4f5c35', x, y + 0.02 * k, z);
      break;
    case 'paille':
      A.cyl(1.75 * k, 1.75 * k, 0.12 * k, 14, '#d9b862', x, y + 0.42 * k, z);
      A.cyl(0.7 * k, 0.85 * k, 0.7 * k, 10, '#d9b862', x, y + 0.8 * k, z);
      A.cyl(0.86 * k, 0.86 * k, 0.16 * k, 10, '#8a3a2a', x, y + 0.55 * k, z);
      break;
  }
}
/* Arme tenue dans la main (h) ; k = échelle. */
function arme3(A, type, h, k, civ) {
  const P = (dx, dy, dz) => V3(h.x + dx * k, h.y + dy * k, h.z + dz * k);
  switch (type) {
    case 'hache':
      A.tige(P(0, -1.2, 0), P(0.2, 2.3, 0.1), 0.12 * k, BOIS);
      A.forme([[0, 0], [0.9, 0.5], [1.0, -0.6], [0, -0.3]], 0.12 * k, FER, h.x + 0.25 * k, h.y + 2.1 * k, h.z + 0.1 * k);
      break;
    case 'lance':
      A.tige(P(0, -2.6, 0), P(0.25, 6.2, 0), 0.12 * k, BOIS);
      A.cone(0.3 * k, 1.3 * k, 4, FER, h.x + 0.27 * k, h.y + 6.8 * k, h.z, 0, 0, -0.03, 1, 0.35);
      break;
    case 'pique':
      A.tige(P(0, -2.8, 0), P(0.15, 9.5, -0.3), 0.11 * k, BOIS);
      A.cone(0.28 * k, 1.2 * k, 4, FER, h.x + 0.16 * k, h.y + 10.1 * k, h.z - 0.32 * k, 0, 0, 0, 1, 0.35);
      break;
    case 'epee':
      A.barre(P(0, 0.2, 0.1), P(0.6, 3.2, 0.5), 0.3 * k, 0.07 * k, FER);
      A.barre(P(-0.45, 0.25, 0.08), P(0.45, 0.15, 0.12), 0.18 * k, 0.18 * k, '#8a6a2a');
      A.sphere(0.18 * k, '#8a6a2a', h.x, h.y - 0.45 * k, h.z + 0.05 * k);
      break;
    case 'sabre':
      A.barre(P(0, 0.2, 0.1), P(-1.2, 3.0, 0.6), 0.24 * k, 0.06 * k, FER);
      break;
    case 'arc':
      A.tore(2.1 * k, 0.11 * k, BOIS, h.x, h.y + 0.4 * k, h.z + 0.2 * k, 0, 0, -Math.PI / 2 - 0.15, Math.PI * 0.9);
      A.tige(P(0.05, -1.65, 0.2), P(-0.25, 2.45, 0.2), 0.03 * k, '#e8e0c8', 3);
      break;
    case 'arbalete':
      A.barre(P(-0.2, 0.0, -0.6), P(-0.2, 0.25, 2.2), 0.3 * k, 0.32 * k, BOIS);
      A.tore(1.2 * k, 0.09 * k, '#4a4a4a', h.x - 0.2 * k, h.y + 0.25 * k, h.z + 1.9 * k, Math.PI / 2, 0, Math.PI, Math.PI);
      break;
    case 'fusil':
      A.barre(P(-0.4, -1.2, 0.3), P(0.3, 1.0, 0.6), 0.32 * k, 0.24 * k, '#5a3a22');
      A.tige(P(0.3, 1.0, 0.6), P(0.9, 3.6, 0.8), 0.1 * k, '#2a2b2d');
      A.tige(P(0.9, 3.6, 0.8), P(1.05, 4.3, 0.85), 0.04 * k, FER, 3);
      break;
    case 'baton':
      A.tige(P(0, -3.4, 0), P(0.1, 3.4, 0), 0.12 * k, BOIS);
      A.ajouter(new THREE.PlaneGeometry(1.6 * k, 1.0 * k), civ, A.m(h.x + 0.9 * k, h.y + 2.9 * k, h.z, 0, 0, 0));
      break;
    case 'pioche':
      A.tige(P(0, -0.4, 0), P(-0.9, 3.2, -0.6), 0.11 * k, BOIS);
      A.tore(1.0 * k, 0.12 * k, FER, h.x - 0.9 * k, h.y + 2.5 * k, h.z - 0.6 * k, 0, 0.6, 0, Math.PI * 0.85);
      break;
  }
}
/* Fantassin debout, pieds en (x, z). o : arme, casque, bouclier, jupe, cotte, manteau, kaki. */
function personnage3(A, x, z, o, civ, k = 1, n = 0) {
  const peau = PEAUX[n % 3], kaki = o.kaki, tunique = kaki ? '#6b7046' : o.tunique || civ;
  const pant = kaki ? '#555a37' : o.manteau ? '#e8e1d0' : '#3a2e25', botte = '#2a1f17';
  const P = (dx, dy, dz) => V3(x + dx * k, dy * k, z + dz * k);
  const pas = n % 2 ? 1 : -1;
  /* Jambes et bottes. */
  A.membre(P(-0.45, 3.4, 0), P(-0.55, 0.75, 0.35 * pas), 0.36 * k, pant);
  A.membre(P(0.45, 3.4, 0), P(0.52, 0.75, -0.35 * pas), 0.36 * k, pant);
  A.sphere(0.43 * k, botte, x - 0.55 * k, 0.4 * k, z + (0.35 * pas + 0.2) * k, 1, 0.75, 1.5);
  A.sphere(0.43 * k, botte, x + 0.52 * k, 0.4 * k, z + (-0.35 * pas + 0.2) * k, 1, 0.75, 1.5);
  /* Torse. */
  A.tour([[0, 0], [0.98, 0], [1.08, 0.7], [1.2, 1.7], [1.22, 2.35], [0.95, 2.75], [0.4, 2.95], [0, 2.95]].map(([a, b]) => [a * k, b * k]), 10, tunique, x, 3.15 * k, z, 0, 0, 0, 1, 0.78);
  if (o.jupe) A.cyl(1.08 * k, 1.5 * k, 1.5 * k, 10, teinte(tunique, -0.12), x, 3.0 * k, z, 0, 0, 0, 1, 0.8);
  if (o.manteau) { A.cyl(1.12 * k, 1.42 * k, 2.4 * k, 10, tunique, x, 3.0 * k, z, 0, 0, 0, 1, 0.8); A.barre(P(-0.9, 5.7, 0.62), P(0.9, 3.6, 0.62), 0.35 * k, 0.08 * k, '#efe7d6'); }
  if (o.cotte) A.cyl(1.16 * k, 1.28 * k, 1.9 * k, 10, '#8e959b', x, 4.3 * k, z, 0, 0, 0, 1, 0.82);
  if (o.fourrure) A.sphere(1.25 * k, '#7a5a3a', x, 5.55 * k, z - 0.15 * k, 1.1, 0.45, 0.85);
  if (kaki) { A.boite(2.1 * k, 1.9 * k, 0.9 * k, '#4f5534', x, 4.5 * k, z - 1.05 * k); A.boite(0.45 * k, 0.55 * k, 0.12 * k, civ, x + 1.18 * k, 5.2 * k, z); }
  A.tore(1.05 * k, 0.14 * k, CUIR, x, 3.75 * k, z, Math.PI / 2, 0, 0, Math.PI * 2, 1, 0.78, 1);
  A.boite(0.4 * k, 0.32 * k, 0.12 * k, '#c9a24a', x, 3.75 * k, z + 0.82 * k);
  /* Bras : droit vers l'arme, gauche vers le bouclier ou l'arc. */
  const epG = P(-1.25, 5.55, 0), epD = P(1.25, 5.55, 0);
  const coudeD = P(1.6, 4.4, 0.45), mainD = P(1.3, 3.75, 1.05);
  const deuxMains = o.arme === 'fusil' || o.arme === 'arbalete' || o.arme === 'pique';
  const coudeG = o.arme === 'arc' ? P(-1.9, 5.0, 0.8) : P(-1.55, 4.4, 0.5);
  const mainG = o.arme === 'arc' ? P(-1.7, 5.2, 1.7) : deuxMains ? P(0.2, 4.3, 1.2) : P(-1.3, 4.0, 1.15);
  A.sphere(0.5 * k, tunique, epG.x, epG.y, epG.z); A.sphere(0.5 * k, tunique, epD.x, epD.y, epD.z);
  A.membre(epG, coudeG, 0.3 * k, tunique); A.membre(coudeG, mainG, 0.26 * k, o.cotte ? '#8e959b' : tunique);
  A.membre(epD, coudeD, 0.3 * k, tunique); A.membre(coudeD, mainD, 0.26 * k, o.cotte ? '#8e959b' : tunique);
  A.sphere(0.3 * k, peau, mainG.x, mainG.y, mainG.z); A.sphere(0.3 * k, peau, mainD.x, mainD.y, mainD.z);
  /* Tête. */
  A.cyl(0.36 * k, 0.4 * k, 0.6 * k, 7, peau, x, 6.2 * k, z);
  const yt = 7.0 * k;
  A.sphere(0.8 * k, peau, x, yt, z, 0.95, 1.08, 1, 12, 9);
  A.sphere(0.14 * k, peau, x, yt - 0.05 * k, z + 0.8 * k);
  A.sphere(0.085 * k, '#1a1410', x - 0.28 * k, yt + 0.12 * k, z + 0.7 * k, 1, 1, 1, 5, 4); A.sphere(0.085 * k, '#1a1410', x + 0.28 * k, yt + 0.12 * k, z + 0.7 * k, 1, 1, 1, 5, 4);
  A.sphere(0.18 * k, peau, x - 0.8 * k, yt, z, 0.5, 1, 1, 5, 4); A.sphere(0.18 * k, peau, x + 0.8 * k, yt, z, 0.5, 1, 1, 5, 4);
  casque3(A, o.casque, x, yt, z, k, civ, n);
  if (o.arme) arme3(A, o.arme, mainD, k, civ);
  if (o.bouclier === 'rond') {
    const b = mainG;
    A.cyl(1.45 * k, 1.45 * k, 0.22 * k, 16, civ, b.x - 0.1 * k, b.y + 0.2 * k, b.z + 0.25 * k, Math.PI / 2, 0, 0);
    A.tore(1.45 * k, 0.12 * k, BRONZE, b.x - 0.1 * k, b.y + 0.2 * k, b.z + 0.36 * k, 0, 0, 0);
    A.dome(0.42 * k, BRONZE, b.x - 0.1 * k, b.y + 0.2 * k, b.z + 0.36 * k, 0.7);
  } else if (o.bouclier === 'long') {
    const b = mainG;
    A.forme([[-0.95, 1.5], [0.95, 1.5], [0.95, -0.3], [0, -1.6], [-0.95, -0.3]].map(([a, c]) => [a * k, c * k]), 0.24 * k, civ, b.x - 0.05 * k, b.y + 0.15 * k, b.z + 0.3 * k);
    A.forme([[-0.18, 1.5], [0.18, 1.5], [0.18, -1.3], [0, -1.5], [-0.18, -1.3]].map(([a, c]) => [a * k, c * k]), 0.26 * k, '#efe7d6', b.x - 0.05 * k, b.y + 0.15 * k, b.z + 0.32 * k);
  }
}
function roue3(A, x, y, z, r, c = '#5a3a20', rayons = 6) {
  A.tore(r, r * 0.13, c, x, y, z, 0, 0, 0);
  for (let i = 0; i < rayons; i++) { const a = i / rayons * Math.PI; A.barre(V3(x + Math.cos(a) * r, y + Math.sin(a) * r, z), V3(x - Math.cos(a) * r, y - Math.sin(a) * r, z), r * 0.1, r * 0.1, c); }
  A.cyl(r * 0.22, r * 0.22, r * 0.5, 8, '#3a2a1c', x, y, z, Math.PI / 2, 0, 0);
}
/* Cheval de profil, tête vers -x. */
function cheval3(A, x, z, robe, o, n) {
  const sombre = teinte(robe, -0.4), P = (dx, dy, dz) => V3(x + dx, dy, z + dz), g = n % 2 ? 0.35 : -0.25;
  A.sphere(1, robe, x, 4.6, z, 2.55, 1.3, 1.15, 12, 9);
  A.sphere(1.3, robe, x - 1.75, 4.75, z, 1, 1.05, 1, 10, 8);
  A.sphere(1.35, robe, x + 1.75, 4.75, z, 1, 1.0, 1, 10, 8);
  A.membre(P(-2.2, 5.3, 0), P(-3.2, 7.2, 0), 0.68, robe, 8);
  A.membre(P(-3.35, 7.55, 0), P(-4.75, 6.55, 0), 0.46, robe, 8);
  A.sphere(0.42, teinte(robe, -0.2), x - 4.95, 6.35, z, 1.05, 0.95, 0.9);
  A.cone(0.18, 0.55, 5, robe, x - 3.2, 8.25, z + 0.22); A.cone(0.18, 0.55, 5, robe, x - 3.2, 8.25, z - 0.22);
  for (let i = 0; i < 6; i++) { const t = i / 5; A.boite(0.2, 0.7, 0.32, sombre, x - 2.1 - t * 1.25, 5.95 + t * 1.75, z, 0, 0, 0.6); }
  const jambe = (dx, dz, av) => {
    const hanche = P(dx, 4.1, dz), genou = P(dx + av * 0.5, 2.2, dz), sabot = P(dx + av * 0.2, 0.45, dz);
    A.membre(hanche, genou, 0.36, robe); A.membre(genou, sabot, 0.22, robe);
    A.cyl(0.3, 0.34, 0.45, 8, '#2a2018', sabot.x, 0.25, sabot.z);
  };
  jambe(-1.8, 0.55, -g); jambe(-1.6, -0.55, g * 0.6); jambe(1.8, 0.55, g); jambe(1.9, -0.55, -g * 0.6);
  A.membre(P(2.9, 5.1, 0), P(3.7, 2.8, 0), 0.32, sombre); A.cone(0.4, 1.4, 6, sombre, x + 3.85, 2.2, z, 0, 0, -0.3);
  if (o.caparacon) {
    A.ajouter(new THREE.CylinderGeometry(1.25, 1.45, 1.9, 14, 1, true), o.civ, A.m(x, 4.0, z, 0, 0, Math.PI / 2, 1, 2.9, 1.1));
    A.tore(1.45, 0.08, BRONZE, x - 2.9, 4.0, z, 0, Math.PI / 2, 0, Math.PI * 2, 1, 1, 1.1);
    A.sphere(0.48, o.civ, x - 4.2, 7.0, z, 1.6, 0.9, 1.05);
  } else A.boite(2.4, 0.2, 2.5, o.civ, x - 0.2, 5.55, z);
  A.sphere(1, CUIR, x - 0.2, 5.75, z, 1.25, 0.32, 0.95);
  A.tige(P(-4.9, 6.2, 0.3), P(-0.9, 6.3, 0.6), 0.04, '#2a1a10', 3); A.tige(P(-4.9, 6.2, -0.3), P(-0.9, 6.3, -0.6), 0.04, '#2a1a10', 3);
}
function cavalier3(A, x, z, o, civ, n) {
  const robes = ['#7a4b2a', '#3d2a1e', '#b9a690', '#5c4632'];
  cheval3(A, x, z, robes[n % 4], { ...o, civ }, n);
  const corps = o.armure ? '#a9afb5' : o.manteau ? teinte(civ, -0.2) : civ, P = (dx, dy, dz) => V3(x + dx, dy, z + dz);
  for (const s of [-1, 1]) { A.membre(P(0.2, 6.2, 0.55 * s), P(-0.7, 5.3, 1.05 * s), 0.34, o.armure ? '#9aa0a6' : '#3a2e25'); A.membre(P(-0.7, 5.3, 1.05 * s), P(-0.4, 3.7, 1.05 * s), 0.28, o.armure ? '#9aa0a6' : '#2a1f17'); }
  A.tour([[0, 0], [0.95, 0], [1.05, 0.7], [1.12, 1.6], [0.9, 2.3], [0.35, 2.5], [0, 2.5]], 10, corps, x + 0.2, 6.0, z, 0, 0, 0, 1, 0.78);
  if (o.armure) A.ajouter(new THREE.CylinderGeometry(1.0, 1.5, 3.2, 10, 1, true, 0, Math.PI), civ, A.m(x + 0.6, 6.6, z, 0, Math.PI / 2, 0.15));
  A.sphere(0.48, corps, x + 0.2, 8.15, z + 0.95); A.sphere(0.48, corps, x + 0.2, 8.15, z - 0.95);
  A.membre(P(0.2, 8.1, 0.95), P(-0.8, 7.0, 1.15), 0.27, corps); A.membre(P(0.2, 8.1, -0.95), P(-0.8, 7.0, -1.15), 0.27, corps);
  A.cyl(0.34, 0.38, 0.55, 7, PEAUX[n % 3], x + 0.2, 8.75, z);
  A.sphere(0.76, PEAUX[n % 3], x + 0.2, 9.5, z, 0.95, 1.08, 1, 12, 9);
  casque3(A, o.casque, x + 0.2, 9.5, z, 0.95, civ, n);
  if (o.arme === 'lance') {
    A.tige(P(1.8, 7.9, 1.25), P(-7.5, 9.6, 1.25), 0.14, BOIS);
    A.cone(0.3, 1.3, 5, FER, x - 8.1, 9.72, z + 1.25, 0, 0, Math.PI / 2 - 0.18, 1, 0.5);
    A.ajouter(new THREE.PlaneGeometry(1.6, 0.9), civ, A.m(x - 6.3, 9.0, z + 1.25, 0, 0, -0.18));
  } else arme3(A, o.arme, V3(x - 0.8, 7.0, z + 1.15), 0.95, civ);
}

/* ---------- Engins, chars et navires (proue vers -x) ---------- */
function engin3(A, m, civ) {
  const bois = '#7a5230', boisF = '#4f341d', P = V3;
  if (m === 'catapulte' || m === 'trebuchet') {
    const g = m === 'trebuchet';
    for (const z of [-2.0, 2.0]) A.barre(P(-5, 2.2, z), P(5, 2.2, z), 0.8, 0.8, bois);
    for (const x of [-4, 4]) A.barre(P(x, 2.2, -2.2), P(x, 2.2, 2.2), 0.7, 0.7, boisF);
    for (const z of [-1.6, 1.6]) { A.barre(P(-2.2, 2.4, z), P(0, g ? 11 : 6.5, z), 0.6, 0.6, boisF); A.barre(P(2.2, 2.4, z), P(0, g ? 11 : 6.5, z), 0.6, 0.6, boisF); }
    A.tige(P(0, g ? 11 : 6.5, -2.2), P(0, g ? 11 : 6.5, 2.2), 0.35, '#3a2a1c');
    const bras0 = g ? P(7.5, 7.5, 0) : P(4.5, 3.4, 0), bras1 = g ? P(-9, 15, 0) : P(-4.2, 9.2, 0);
    A.barre(bras0, bras1, 0.6, 0.6, bois);
    if (g) { A.boite(3, 3, 3, '#5d554a', 7.8, 5.6, 0); A.tige(bras1, P(-10.5, 10, 0), 0.06, '#e0d8c0', 3); A.sphere(1.0, '#6d6a63', -10.5, 9.6, 0); }
    else { A.dome(1.1, bois, -4.4, 9.4, 0, 0.6); A.sphere(0.85, '#6d6a63', -4.4, 9.9, 0); }
    for (const [x, z] of [[-3.6, 2.7], [3.6, 2.7], [-3.6, -2.7], [3.6, -2.7]]) roue3(A, x, 1.6, z, 1.5);
    A.ajouter(new THREE.PlaneGeometry(1.6, 1.0), civ, A.m(0.9, g ? 11.2 : 6.8, 0, 0, Math.PI / 2, 0));
  } else if (m === 'canon' || m === 'artillerie') {
    const gros = m === 'artillerie', L = gros ? 10 : 7.5;
    const fut = [[0.95, 0], [1.05, 0.4], [0.9, 0.6], [0.8, L * 0.45], [0.88, L * 0.48], [0.72, L * 0.5], [0.62, L * 0.97], [0.75, L], [0.4, L], [0.4, 0.1], [0, 0.1]];
    A.tour(fut.map(([a, b]) => [a * (gros ? 0.9 : 1), b]), 12, gros ? '#3d4430' : '#2a2b2d', 0.8, 3.6, 0, 0, 0, Math.PI / 2 + 0.22);
    for (const z of [-1.0, 1.0]) A.forme([[-1.5, 0], [4.5, -2.4], [5, -1.8], [-0.5, 1.2]], 0.35, gros ? '#4c5a3c' : '#5a3a22', 0.8, 3.3, z);
    roue3(A, 0.8, 2.2, 1.7, 2.2, gros ? '#2a2a2a' : '#5a3a20', gros ? 8 : 10); roue3(A, 0.8, 2.2, -1.7, 2.2, gros ? '#2a2a2a' : '#5a3a20', gros ? 8 : 10);
    if (gros) A.forme([[0, 0], [2.2, 0], [2.2, 3], [0, 3.6]], 4.6, '#4c5a3c', -0.4, 3.2, 0, 0, Math.PI / 2, 0);
    A.ajouter(new THREE.PlaneGeometry(1.4, 0.9), civ, A.m(5.4, 4.4, -1.2));
    A.tige(V3(5.4, 1.0, -1.2), V3(5.4, 4.8, -1.2), 0.07, '#2a2a2a', 3);
  } else if (m === 'roquettes') {
    A.boite(12, 1.0, 4.4, '#3f4730', 0.5, 2.4, 0);
    A.forme([[0, 0], [3.6, 0], [3.6, 2.6], [1.2, 2.6], [0, 1.4]], 4.2, '#56603f', -5.5, 2.9, 0, 0, 0, 0);
    A.boite(0.1, 1.0, 3.4, '#8fb1c9', -5.4, 4.8, 0, 0, 0, -0.4);
    A.boite(6, 1.4, 4, '#56603f', 2.2, 3.6, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) A.tige(V3(0.4, 4.6 + j * 0.65, -1.2 + i * 0.8), V3(5.4, 7.3 + j * 0.65, -1.2 + i * 0.8), 0.28, '#4a5236', 7);
    for (const x of [-4, 0.5, 4]) for (const z of [-2.3, 2.3]) { A.cyl(1.25, 1.25, 0.9, 12, '#1e1e1e', x, 1.25, z, Math.PI / 2, 0, 0); A.cyl(0.55, 0.55, 1.0, 8, '#6a6a6a', x, 1.25, z, Math.PI / 2, 0, 0); }
    A.boite(0.1, 1.0, 1.6, civ, -2, 3.8, 2.2);
  } else {
    const mod = m === 'blinde', coque = mod ? '#8a8a6e' : '#58603f', sombre = teinte(coque, -0.25);
    for (const z of [-2.6, 2.6]) {
      A.forme([[-6, 0.9], [-5.2, 2.6], [5.6, 2.6], [6.2, 1.2], [5.2, 0], [-4.8, 0]], 1.6, '#26281f', 0, 0, z);
      for (let i = 0; i < (mod ? 7 : 6); i++) A.cyl(0.85, 0.85, 1.7, 10, '#4a4a42', -4.2 + i * (8.6 / (mod ? 6 : 5)), 1.05, z, Math.PI / 2, 0, 0);
      if (mod) A.boite(10.5, 1.4, 0.25, coque, 0.2, 2.6, z * 1.12);
    }
    A.forme(mod ? [[-6.6, 2.4], [-3.2, 4.2], [6, 4.2], [6.4, 2.4]] : [[-6.2, 2.4], [-4.4, 4.6], [5.4, 4.6], [6, 2.4]], 5.4, coque, 0, 0, 0);
    if (mod) A.forme([[-3.6, 0], [-1.6, 1.9], [3.8, 1.9], [3.8, 0]], 4.6, sombre, 0.3, 4.2, 0);
    else A.tour([[0, 0], [2.3, 0], [2.5, 0.6], [2.2, 1.8], [1.2, 2.3], [0, 2.3]], 14, sombre, 0.6, 4.4, 0, 0, 0, 0, 1.15, 1);
    const yb = mod ? 5.2 : 5.5;
    A.tige(V3(-1.6, yb, 0), V3(mod ? -10 : -8.5, yb + 0.25, 0), mod ? 0.32 : 0.36, sombre, 8);
    A.cyl(0.55, 0.55, 1.0, 8, sombre, mod ? -9.8 : -8.3, yb + 0.25, 0, 0, 0, Math.PI / 2);
    A.cyl(0.7, 0.7, 0.4, 10, teinte(coque, -0.35), 1.4, yb + 1.3, 0.8);
    A.tige(V3(2.8, yb + 1, -1), V3(3.3, yb + 6, -1.2), 0.05, '#222', 3);
    A.boite(0.1, 1.0, 1.4, civ, 2.8, yb + 0.6, 2.25);
  }
}
/* Coque galbée générée section par section ; proue vers -x. */
function coque3(A, L, W, H, coul, coulPont) {
  const N = 14, M = 8, pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, x = L / 2 - s * L;
    const hw = W / 2 * (s < 0.7 ? 0.82 + 0.18 * Math.sin(s / 0.7 * Math.PI / 2) : Math.sqrt(Math.max(0.0001, (1 - s) / 0.3)));
    const tonture = H + 0.9 * Math.pow(Math.abs(2 * s - 1), 2.2), prof = H * (0.95 - 0.35 * Math.pow(Math.abs(2 * s - 1), 3));
    for (let j = 0; j <= M; j++) {
      const f = Math.PI * j / M;
      pos.push(x, tonture - prof * Math.sin(f), -hw * Math.cos(f));
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
    const a = i * (M + 1) + j, b = a + M + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  A.ajouter(g, coul, A.m());
  /* Pont. */
  const pont = [];
  for (let i = 0; i <= N; i++) { const p0 = i * (M + 1); pont.push([pos[p0 * 3], pos[p0 * 3 + 2]]); }
  for (let i = N; i >= 0; i--) { const p1 = i * (M + 1) + M; pont.push([pos[p1 * 3], pos[p1 * 3 + 2]]); }
  const s = new THREE.Shape(pont.map(([a, b]) => new THREE.Vector2(a, b))), gp = new THREE.ShapeGeometry(s);
  gp.rotateX(Math.PI / 2);
  A.ajouter(gp, coulPont, A.m(0, H - 0.05, 0));
}
function mat3(A, x, h, y0, civ) {
  A.tige(V3(x, y0, 0), V3(x, y0 + h, 0), 0.32, '#4a3420', 6, 0.2);
  A.ajouter(new THREE.PlaneGeometry(2.2, 1.0), civ, A.m(x - 1.1, y0 + h - 0.6, 0));
}
function navire3(A, m, civ) {
  const toile = '#efe6cf';
  if (m === 'galere') {
    coque3(A, 18, 4.6, 2.6, '#6b4524', '#b08a5a');
    A.cone(0.6, 3, 6, BRONZE, -10.2, 0.6, 0, 0, 0, Math.PI / 2);
    for (let k = 0; k < 7; k++) for (const s of [-1, 1]) A.tige(V3(-6 + k * 2, 2.4, s * 2.0), V3(-6.8 + k * 2, -0.2, s * 5.2), 0.12, BOIS, 4);
    A.tige(V3(0, 2.5, 0), V3(0, 14, 0), 0.3, '#4a3420', 6);
    A.tige(V3(0, 12.6, -4), V3(0, 12.6, 4), 0.16, '#4a3420', 5);
    A.voile(8, 7, 1.4, toile, 0, 9.0, 0.2, Math.PI / 2);
    A.voile(8.05, 1.6, 1.45, civ, 0, 9.0, 0.25, Math.PI / 2);
    A.ajouter(new THREE.PlaneGeometry(2, 1), civ, A.m(-1, 14.5, 0));
  } else if (m === 'caravelle') {
    coque3(A, 19, 5.4, 3.2, '#6b4524', '#b08a5a');
    A.boite(4.5, 2.2, 5, '#5a3a20', 7.2, 4.6, 0);
    for (const [x, h, w] of [[-4.5, 12, 6], [2.5, 15, 7.5]]) {
      A.tige(V3(x, 3, 0), V3(x, 3 + h, 0), 0.3, '#4a3420', 6, 0.2);
      A.tige(V3(x + w * 0.45, 3 + h * 0.35, 0), V3(x - w * 0.45, 3 + h * 1.02, 0), 0.12, '#4a3420', 4);
      const g = new THREE.BufferGeometry();
      const p = [x + w * 0.45, 3 + h * 0.35, 0.2, x - w * 0.45, 3 + h * 1.0, 0.2, x + w * 0.4, 3 + h * 0.18, 1.2];
      g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
      A.ajouter(g, toile, A.m());
      A.ajouter(new THREE.PlaneGeometry(1.8, 0.9), civ, A.m(x - 0.9, 3 + h + 0.5, 0));
    }
    A.tige(V3(-9.5, 3.3, 0), V3(-13, 5.2, 0), 0.15, '#4a3420', 4);
  } else if (m === 'fregate') {
    coque3(A, 21, 6, 3.6, '#2e2218', '#a07e52');
    A.boite(21, 0.5, 6.3, '#e3c27a', 0, 2.6, 0);
    for (let k = 0; k < 8; k++) for (const s of [-1, 1]) A.boite(0.7, 0.6, 0.2, '#111', -7 + k * 2, 2.0, s * 3.0);
    A.boite(4, 2.6, 5.6, '#3a2a1c', 8.4, 5, 0);
    for (const [x, h] of [[-5.5, 14], [0.5, 17], [6, 13]]) {
      A.tige(V3(x, 3.5, 0), V3(x, 3.5 + h, 0), 0.3, '#3a2a18', 6, 0.18);
      for (const [y, w, hh] of [[0.45, 6.5, 4], [0.78, 5, 3]]) { A.tige(V3(x, 3.5 + h * y + hh / 2, -w / 2), V3(x, 3.5 + h * y + hh / 2, w / 2), 0.12, '#3a2a18', 4); A.voile(w, hh, 0.9, toile, x, 3.5 + h * y, 0.25, Math.PI / 2); }
      A.ajouter(new THREE.PlaneGeometry(2, 0.9), civ, A.m(x - 1, 3.5 + h + 0.5, 0));
    }
    A.tige(V3(-10.5, 3.6, 0), V3(-15, 6.4, 0), 0.18, '#3a2a18', 4);
    A.tige(V3(-15, 6.4, 0), V3(-5.5, 17.5, 0), 0.04, '#2a2a2a', 3); A.tige(V3(6, 16.5, 0), V3(10.5, 5, 0), 0.04, '#2a2a2a', 3);
  } else {
    coque3(A, 26, 6, 3.2, '#5e656b', '#8a8278');
    A.boite(26, 0.4, 6.2, '#7a2a20', 0, 0.3, 0);
    A.boite(7, 2.6, 4, '#7d848a', -1, 4.4, 0); A.boite(4, 2.2, 3, '#6a7177', -1.5, 6.8, 0); A.boite(2.6, 1.2, 2.4, '#8a9298', -1.5, 8.5, 0);
    A.tige(V3(-1.5, 9, 0), V3(-1.5, 15, 0), 0.18, '#3d4247', 4);
    for (const x of [2.2, 4.6]) { A.cyl(0.9, 1.05, 5, 10, '#4f555b', x, 6.6, 0); A.cyl(0.95, 0.95, 0.5, 10, '#222', x, 9.0, 0); }
    for (const x of [-9, -5.5, 8.5]) {
      A.tour([[0, 0], [1.9, 0], [1.9, 0.9], [1.4, 1.5], [0, 1.5]], 12, '#6a7177', x, 3.1, 0);
      const s = x > 0 ? 1 : -1;
      for (const dz of [-0.45, 0.45]) A.tige(V3(x - s * 0.8, 3.9, dz), V3(x - s * 6.2, 4.1, dz), 0.22, '#3d4247', 6);
    }
    A.ajouter(new THREE.PlaneGeometry(2.2, 1.2), civ, A.m(-2.6, 14.6, 0));
  }
}
function chariot3(A, civ) {
  A.boite(8, 0.8, 4, '#7a5230', 1, 2.8, 0);
  for (const z of [-2, 2]) A.boite(8, 1.1, 0.25, '#6a4428', 1, 3.6, z);
  A.ajouter(new THREE.CylinderGeometry(2.4, 2.4, 7.4, 14, 1, true, -Math.PI / 2, Math.PI), '#efe6cf', A.m(1, 3.6, 0, 0, 0, Math.PI / 2));
  for (const x of [-2.2, 1, 4.2]) A.tore(2.42, 0.1, '#7a5230', x, 3.6, 0, 0, Math.PI / 2, 0, Math.PI);
  A.ajouter(new THREE.PlaneGeometry(1.6, 1.2), civ, A.m(1, 5.4, 2.45));
  for (const x of [-2.2, 4.2]) for (const z of [-2.3, 2.3]) roue3(A, x, 1.7, z, 1.7);
  A.barre(V3(-3, 2.6, 0), V3(-7.5, 3.4, 0), 0.4, 0.4, BOIS);
  for (const z of [-1.1, 1.1]) {
    A.sphere(1, '#7a5a3a', -8, 3.6, z, 1.9, 1.1, 0.9);
    A.sphere(0.65, '#6a4a2a', -10.2, 4.1, z, 1.2, 0.9, 0.8);
    A.cone(0.12, 0.9, 4, '#e8e0c8', -10.4, 4.8, z + 0.45 * Math.sign(z), 0.8 * Math.sign(z), 0, 0);
    for (const [dx, dz] of [[-1.4, 0.4], [1.3, 0.4], [-1.4, -0.4], [1.3, -0.4]]) A.membre(V3(-8 + dx, 3, z + dz), V3(-8 + dx, 0.4, z + dz), 0.24, '#5a3e26');
  }
}
function geoUnite(type, civ, embarque) {
  return enCache(`u|${type}|${civ}|${embarque ? 1 : 0}`, () => {
    const A = new Atelier(), M = MODELES3D[type] || { m: 'fantassin', n: 1 };
    if (embarque) { navire3(A, 'galere', civ); return A.geometrie(); }
    if (M.m === 'fantassin') {
      const pos = M.n === 3 ? [[-4.4, -2.0], [4.4, -2.6], [0, 2.6]] : [[0, 0]];
      pos.forEach(([x, z], n) => personnage3(A, x, z, M, civ, 1, n));
    } else if (M.m === 'cavalier') { cavalier3(A, -1.8, -3.0, M, civ, 0); cavalier3(A, 2.8, 2.8, M, civ, 1); }
    else if (M.m === 'eclaireur') {
      personnage3(A, 0, 0, { arme: 'baton', casque: 'capuche', tunique: '#6a5a3a' }, civ, 1, 1);
      A.boite(1.8, 2.2, 1.0, CUIR, 0, 4.6, -1.15);
    } else if (M.m === 'ouvrier') {
      personnage3(A, -1, 0, { arme: 'pioche', casque: 'paille', tunique: '#a89a7a' }, civ, 1, 2);
      A.boite(2.4, 1.0, 1.6, '#6a4428', 3.2, 1.2, 1.2); A.cyl(0.6, 0.6, 0.3, 10, '#3a2a1c', 4.6, 0.6, 1.2, Math.PI / 2, 0, 0);
      A.boule(0.7, '#8c8478', 3.2, 2.0, 1.2, 1.2, 0.7, 1, 0);
    } else if (M.m === 'chariot') { chariot3(A, civ); personnage3(A, 4.5, 3.6, { arme: 'baton', casque: 'cheveux', tunique: teinte(civ, 0.15) }, civ, 0.85, 1); }
    else if (['galere', 'caravelle', 'fregate', 'cuirasse'].includes(M.m)) navire3(A, M.m, civ);
    else engin3(A, M.m, civ);
    return A.geometrie();
  });
}

/* ---------- Végétation et rochers (instanciés ; blanc = teinté par instance) ---------- */
function geoArbre(sorte) {
  return enCache('arbre|' + sorte, () => {
    const A = new Atelier(), tronc = '#6a4a30';
    if (sorte === 'sapin') {
      A.cyl(0.35, 0.55, 2.4, 6, tronc, 0, 1.2, 0);
      [[2.8, 3.8, 3.2], [2.2, 3.3, 5.3], [1.6, 2.8, 7.1], [1.0, 2.2, 8.7]].forEach(([r, h, y], i) => A.cone(r, h, 8, '#ffffff', 0, y, 0, 0, i * 0.4, 0));
    } else if (sorte === 'feuillu') {
      A.cyl(0.38, 0.6, 3.4, 6, tronc, 0, 1.7, 0);
      A.tige(V3(0, 2.8, 0), V3(1.1, 4.2, 0.4), 0.18, tronc, 4); A.tige(V3(0, 3.0, 0), V3(-1.0, 4.4, -0.3), 0.18, tronc, 4);
      A.boule(2.3, '#ffffff', 0, 5.1, 0, 1, 0.92, 1, 1); A.boule(1.7, '#ffffff', 1.5, 4.5, 0.7, 1, 0.9, 1, 1);
      A.boule(1.6, '#ffffff', -1.4, 4.7, -0.5, 1, 0.9, 1, 1); A.boule(1.4, '#ffffff', 0.2, 6.6, -0.3, 1, 0.9, 1, 1);
    } else if (sorte === 'palmier') {
      const pts = [V3(0, 0, 0), V3(0.3, 2.2, 0), V3(0.9, 4.4, 0), V3(1.7, 6.6, 0)];
      for (let i = 0; i < 3; i++) A.tige(pts[i], pts[i + 1], 0.32 - i * 0.04, '#8a6a42', 6, 0.36 - i * 0.04);
      for (let k = 0; k < 7; k++) {
        const a = k / 7 * Math.PI * 2;
        const g = new THREE.PlaneGeometry(1.0, 4.2, 1, 5), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const v = p.getY(i) / 4.2 + 0.5; p.setZ(i, -v * v * 1.6); }
        g.computeVertexNormals();
        A.ajouter(g, '#ffffff', A.m(1.7 + Math.cos(a) * 1.6, 6.3, Math.sin(a) * 1.6, -1.1, -a + Math.PI / 2, 0));
      }
      A.sphere(0.5, '#6a4a2a', 1.7, 6.4, 0.3);
    } else if (sorte === 'roseau') { for (let k = 0; k < 6; k++) A.cone(0.16, 2.8, 4, '#ffffff', Math.cos(k * 1.3) * 0.7, 1.4, Math.sin(k * 1.3) * 0.7, (k % 3 - 1) * 0.15, 0, (k % 2 - 0.5) * 0.2); }
    else if (sorte === 'touffe') { for (let k = 0; k < 5; k++) { const a = k * 1.26; A.cone(0.22, 1.5, 3, '#ffffff', Math.cos(a) * 0.45, 0.7, Math.sin(a) * 0.45, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); } }
    else if (sorte === 'rocher') { A.boule(1.4, '#ffffff', 0, 0.5, 0, 1.3, 0.75, 1, 0); A.boule(0.8, '#ffffff', 1.2, 0.3, 0.6, 1, 0.8, 1.1, 0); }
    else if (sorte === 'buisson') { A.boule(1.2, '#ffffff', 0, 0.9, 0, 1.2, 0.8, 1.1, 1); A.boule(0.8, '#ffffff', 0.9, 0.6, 0.3, 1, 0.8, 1, 0); }
    return A.geometrie();
  });
}

/* ---------- Aménagements ---------- */
function maison3(A, x, y, z, w, h, d, murs, toit, ry, al, o = {}) {
  avec(A, o.verre ? 0 : o.brique ? 4 : 1, () => A.boite(w, h, d, murs, x, y + h / 2, z, 0, ry, 0));
  const c = Math.cos(ry), s = Math.sin(ry), loc = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
  const sombre = '#2a2018';
  const [px, pz] = loc(0, d / 2 + 0.03); A.boite(w * 0.22, h * 0.5, 0.08, '#4a3020', px, y + h * 0.25, pz, 0, ry, 0);
  const etages = Math.max(1, Math.round(h / 3));
  for (let e = 0; e < etages; e++) for (const lx of [-w * 0.3, w * 0.3]) {
    const [fx, fz] = loc(lx, d / 2 + 0.03), yy = y + h * (e === 0 ? 0.55 : (e + 0.55) / etages);
    if (e === 0 && Math.abs(lx) < w * 0.2) continue;
    A.boite(w * 0.16, Math.min(0.9, h * 0.22), 0.08, o.verre ? '#cfe3f0' : sombre, fx, yy, fz, 0, ry, 0);
  }
  for (const lz of [-d * 0.2, d * 0.2]) { const [fx, fz] = loc(w / 2 + 0.03, lz); A.boite(0.08, Math.min(0.9, h * 0.22), d * 0.16, o.verre ? '#cfe3f0' : sombre, fx, y + h * 0.6, fz, 0, ry, 0); }
  if (o.plat) { avec(A, 1, () => A.boite(w + 0.3, 0.35, d + 0.3, teinte(murs, -0.18), x, y + h + 0.15, z, 0, ry, 0)); return; }
  avec(A, 2, () => { if (al() < 0.35) A.pavillon(w * 1.15, w * 0.6, d * 1.15, toit, x, y + h, z, ry); else A.toit(w * 1.15, w * 0.55, d * 1.12, toit, x, y + h, z, ry + Math.PI / 2); });
  if (al() < 0.5) { const [cx, cz] = loc(w * 0.28, -d * 0.15); avec(A, 4, () => A.boite(0.5, 1.6, 0.5, '#8a6e5a', cx, y + h + 0.9, cz, 0, ry, 0)); }
}
function geoAmel(am, v) {
  return enCache(`a|${am}|${v}`, () => {
    const A = new Atelier(), al = creerAlea(v * 977 + am.length * 31);
    if (am === 'ferme') {
      const cs = ['#d4b45a', '#c8a548', '#9cb04e', '#b8c25c', '#e0c46e', '#8aa046'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if ((r !== 1 || c !== 1) && al() < 0.15) continue;
        const coul = cs[Math.floor(al() * cs.length)], x = -9.5 + c * 9.5, z = -7.5 + r * 7.5;
        A.boite(8.6, 0.4, 6.6, coul, x, 0.2, z);
        for (let s = 0; s < 5; s++) A.boite(8.2, 0.25, 0.35, teinte(coul, -0.18), x, 0.48, z - 2.6 + s * 1.3);
      }
      maison3(A, 11, 0, 9, 3.6, 2.6, 3, '#e8dcc0', '#9a4a32', Math.PI / 2, al);
      A.cyl(1.0, 1.0, 3.2, 10, '#c0a070', 7.8, 1.6, 10.5); A.cone(1.2, 1.4, 10, '#8a4a32', 7.8, 3.9, 10.5);
    } else if (am === 'mine') {
      avec(A, 4, () => A.boule(6, '#8a8276', 0, 0, 0, 1.2, 0.6, 1, 1));
      A.forme([[-1.6, 0], [1.6, 0], [1.6, 2.4], [0, 3.4], [-1.6, 2.4]], 1.2, '#151210', 0, 0.2, 4.6);
      A.boite(0.55, 3.6, 0.55, '#7a5230', -1.9, 1.8, 5.2); A.boite(0.55, 3.6, 0.55, '#7a5230', 1.9, 1.8, 5.2); A.boite(4.6, 0.55, 0.6, '#7a5230', 0, 3.7, 5.2);
      for (const dz of [-0.6, 0.6]) A.boite(0.25, 0.2, 10, '#5a4a3a', dz, 0.25, 10);
      for (let k = 0; k < 6; k++) A.boite(1.8, 0.15, 0.4, '#6a4a2a', 0, 0.18, 6 + k * 1.5);
      A.boite(2.4, 1.4, 1.8, '#5a4030', 0, 1.1, 9.5); A.boule(1.0, '#8c8c8c', 0, 1.9, 9.5, 1.1, 0.6, 0.8, 0);
      A.boule(1.6, '#7a7266', 6.5, 0.6, 6, 1.2, 0.7, 1, 0);
    } else if (am === 'paturage') {
      A.matiere = 3;
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; A.cyl(0.25, 0.3, 2.2, 5, '#8a6a44', Math.cos(a) * 14, 1.1, Math.sin(a) * 10); }
      for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; for (const y of [1.0, 1.8]) A.barre(V3(Math.cos(a0) * 14, y, Math.sin(a0) * 10), V3(Math.cos(a1) * 14, y, Math.sin(a1) * 10), 0.18, 0.12, '#a5845a'); }
      A.matiere = 0;
      for (let k = 0; k < 4; k++) {
        const x = (al() - 0.5) * 16, z = (al() - 0.5) * 10, c = al() < 0.5 ? '#f2eee4' : '#8a5a36';
        A.sphere(1, c, x, 1.9, z, 1.6, 0.85, 0.8); A.sphere(0.55, c, x - 1.7, 2.3, z, 1.2, 0.9, 0.85);
        for (const [dx, dz] of [[-0.9, 0.4], [-0.9, -0.4], [0.9, 0.4], [0.9, -0.4]]) A.membre(V3(x + dx, 1.4, z + dz), V3(x + dx, 0.2, z + dz), 0.18, '#3a2a1a', 4);
      }
    } else if (am === 'plantation') {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const x = -12 + c * 6 + (r % 2) * 3, z = -9 + r * 6;
        A.boite(5, 0.3, 1.2, '#7a5a3a', x, 0.15, z);
        A.cyl(0.25, 0.3, 1.3, 4, '#5a3c22', x, 0.8, z); A.boule(1.5, r % 2 ? '#3f7a35' : '#4f8a3f', x, 2.2, z, 1, 0.85, 1, 1);
      }
    } else if (am === 'scierie') {
      A.matiere = 3;
      for (let k = 0; k < 3; k++) for (let l = 0; l <= 2 - k; l++) { A.cyl(0.9, 0.9, 7, 10, '#8a5a30', 4 + l * 1.8 + k * 0.9, 0.9 + k * 1.5, 4, Math.PI / 2, 0, 0); A.cyl(0.7, 0.7, 7.05, 10, '#d9b27a', 4 + l * 1.8 + k * 0.9, 0.9 + k * 1.5, 4, Math.PI / 2, 0, 0); }
      A.matiere = 0;
      maison3(A, -6, 0, -2, 6, 3, 5, '#9a7450', '#5a3a22', 0, al);
      A.cyl(2.2, 2.2, 0.3, 16, '#7a7a7a', -1.5, 2.5, 3, Math.PI / 2, 0, 0);
    } else if (am === 'camp') {
      for (const [x, z] of [[-5, 2], [4, 5]]) { A.cone(3.2, 5.4, 7, '#b89a6a', x, 2.7, z); A.tige(V3(x, 5, z), V3(x, 6.6, z), 0.12, BOIS, 3); }
      A.barre(V3(-0.5, 3.4, -5), V3(4.5, 3.4, -5), 0.3, 0.3, '#6a4a2a');
      for (const xx of [-0.5, 4.5]) A.barre(V3(xx, 0, -5), V3(xx, 3.5, -5), 0.3, 0.3, '#6a4a2a');
      for (let k = 0; k < 3; k++) A.boite(1.1, 1.6, 0.1, '#a07a50', 0.7 + k * 1.4, 2.4, -5);
    } else if (am === 'hutte') {
      for (const [x, z, r] of [[-4, -1, 3.4], [5, 4, 2.8], [-1, 6, 2.2]]) { A.cyl(r, r, 2.6, 10, '#b8956a', x, 1.3, z); A.cone(r * 1.35, 4, 10, '#d9bc6a', x, 4.6, z); A.boite(0.9, 1.6, 0.2, '#3a2a1c', x, 0.8, z + r); }
      A.cyl(1.2, 1.2, 0.3, 10, '#6a6a6a', 1.5, 0.15, 1); A.cone(0.6, 1.4, 6, '#ff9a3a', 1.5, 0.9, 1);
    } else if (am === 'barbares') {
      for (const [x, z] of [[-5, -2], [4, -4]]) { A.cone(3.6, 5.6, 6, '#4a3524', x, 2.8, z); A.cone(3.7, 1.2, 6, '#2e2218', x, 5.0, z); }
      A.cyl(1.4, 1.4, 0.4, 10, '#4a4a4a', 1, 0.2, 5); A.cone(1.2, 2.6, 6, '#ff8a2a', 1, 1.5, 5); A.cone(0.7, 1.8, 6, '#ffd36a', 1, 1.3, 5.2);
      A.tige(V3(-9, 0, 3), V3(-9, 9, 3), 0.18, '#3a2a1a', 4); A.ajouter(new THREE.PlaneGeometry(3.2, 2.2), '#7a1f1a', A.m(-7.4, 7.6, 3));
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; A.tige(V3(Math.cos(a) * 11, 0, Math.sin(a) * 9), V3(Math.cos(a) * 11.4, 3.2, Math.sin(a) * 9.3), 0.28, '#5a3e26', 4, 0.05); }
    }
    return A.geometrie();
  });
}

/* ---------- Villes ---------- */
/* Matière photographique d'une partie : 0 aucune, 1 enduit, 2 tuiles, 3 bois, 4 pierre, 5 pavés. */
function avec(A, k, f) { const o = A.matiere; A.matiere = k; f(); A.matiere = o; }
const STYLES3D = [
  { murs: ['#e6d6b0', '#dccaa0', '#efe2c4'], toits: ['#b4553b', '#a3492f', '#c06a45'], plats: 0.4 },
  { murs: ['#ece0c2', '#e2d2ae', '#f0e6cf'], toits: ['#b05337', '#9d4630', '#7d3a2a'], plats: 0.15 },
  { murs: ['#efe5cc', '#e6d9bb', '#d9c9a8'], toits: ['#5d606b', '#7a3b2c', '#6b4a35'], clocher: true },
  { murs: ['#ddd0b5', '#cfc2a6', '#e4d8bf', '#c9b79a'], toits: ['#4f5d73', '#5d6a7e', '#6a4a3a'], etages: 1.7 },
  { murs: ['#a8583f', '#9b4f39', '#b56a4f', '#c9b79a'], toits: ['#3f4146', '#4b4d52'], etages: 1.9, usine: true },
  { murs: ['#8ea9c2', '#a8bccd', '#c9d3db', '#d8dde2'], toits: ['#4d6680'], tours: true },
];
/* hauteur(dx, dz) = hauteur du sol autour du centre de la ville, relative au centre. */
function geoVille(v, ere, civ, hauteur) {
  const A = new Atelier(), al = creerAlea(v.id * 7919 + 13), st = STYLES3D[ere];
  const popB = Math.min(24, v.pop), murs = v.bat.chateau ? 2 : v.bat.remparts ? 1 : 0, cap = !!v.bat.palais;
  const R0 = 15 + Math.min(12, popB * 0.7);
  avec(A, 5, () => {
    A.cyl(R0 + 3, R0 + 4, 1.2, 24, '#c9bb9c', 0, hauteur(0, 0) - 0.2, 0);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + al(); A.boite(R0 * 1.8, 0.1, 2.2, '#a8987a', 0, hauteur(0, 0) + 0.45, 0, 0, a, 0); }
  });
  A.matiere = 4;
  if (!cap) {
    const y = hauteur(0, 0);
    if (ere < 4) { A.cyl(2.6, 2.8, 1.0, 14, '#b9ad94', 0, y + 0.5, 0); A.cyl(2.1, 2.1, 0.2, 14, '#5fa3c4', 0, y + 1.0, 0); A.cyl(0.35, 0.45, 2.2, 8, '#d9cfb8', 0, y + 1.9, 0); A.cyl(0.9, 0.5, 0.4, 10, '#d9cfb8', 0, y + 3.0, 0); }
    else { A.boite(3, 1.2, 3, '#9a9488', 0, y + 0.6, 0); A.cyl(0.6, 0.7, 4, 8, '#5a5a52', 0, y + 3.2, 0); A.sphere(0.9, '#7a7a70', 0, y + 5.6, 0); }
  }
  A.matiere = 0;
  const pos = [];
  const nb = Math.min(30, 6 + Math.round(popB * 1.15));
  for (let k = 0; k < nb * 4 && pos.length < nb; k++) {
    const a = al() * Math.PI * 2, d = 4 + Math.sqrt(al()) * (R0 - 4);
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.85;
    if (cap && Math.abs(x) < 9 && Math.abs(z) < 7) continue;
    if (pos.some(p => Math.abs(p.x - x) < 4.8 && Math.abs(p.z - z) < 4.4)) continue;
    pos.push({ x, z, a });
  }
  for (const p of pos) {
    const y = hauteur(p.x, p.z) - 0.3, murC = st.murs[Math.floor(al() * st.murs.length)], toitC = st.toits[Math.floor(al() * st.toits.length)];
    const w = 3.2 + al() * 1.6, d = 3 + al() * 1.4, rot = -p.a + Math.PI / 2 + (al() - 0.5) * 0.3;
    if (al() < 0.08) { A.cyl(0.3, 0.4, 2.2, 5, '#5a3c22', p.x, y + 1.1, p.z); A.boule(1.6, '#4a7d35', p.x, y + 3.2, p.z, 1, 0.9, 1, 1); continue; }
    if (popB >= 6 && ere < 4 && al() < 0.07) { A.boite(3, 0.15, 2.4, ['#c8402f', '#d6a92b', '#3d74c4', '#3f9a52'][Math.floor(al() * 4)], p.x, y + 2.4, p.z, 0.15, rot, 0); for (const dx of [-1.3, 1.3]) A.tige(V3(p.x + dx, y, p.z), V3(p.x + dx, y + 2.4, p.z), 0.1, BOIS, 3); A.boite(2.6, 0.9, 1.6, '#8a6a44', p.x, y + 0.45, p.z); continue; }
    if (st.tours && al() < 0.7) {
      const h = 7 + al() * 13 + popB * 0.6;
      A.boite(w, h, d, murC, p.x, y + h / 2, p.z, 0, rot, 0);
      for (let e = 1; e < h / 2.4; e++) A.boite(w + 0.06, 0.5, d + 0.06, '#5f7a92', p.x, y + e * 2.4, p.z, 0, rot, 0);
      A.boite(w * 0.6, 1, d * 0.6, '#5f6f7f', p.x, y + h + 0.5, p.z, 0, rot, 0);
      if (al() < 0.3) A.tige(V3(p.x, y + h + 1, p.z), V3(p.x, y + h + 5, p.z), 0.1, '#888', 3);
      continue;
    }
    if (st.usine && al() < 0.3) {
      const L = w * 1.8;
      avec(A, 4, () => A.boite(L, 3.4, d * 1.3, '#a06a52', p.x, y + 1.7, p.z, 0, rot, 0));
      for (let s = 0; s < 3; s++) A.toit(L / 3, 1.4, d * 1.3, '#4b4d52', p.x + (s - 1) * L / 3 * Math.cos(rot), y + 3.4, p.z - (s - 1) * L / 3 * Math.sin(rot), rot);
      A.cyl(0.6, 0.85, 10, 8, '#7a3e2c', p.x + 1.4, y + 5, p.z);
      A.sphere(1.2, '#9a9a9a', p.x + 1.8, y + 11, p.z); A.sphere(1.6, '#aaaaaa', p.x + 3, y + 12.5, p.z - 0.6);
      continue;
    }
    if (st.clocher && al() < 0.12) {
      avec(A, 4, () => { A.boite(4, 4, 7, '#d8ccb0', p.x, y + 2, p.z, 0, rot, 0); A.boite(2.4, 9, 2.4, '#d8ccb0', p.x, y + 4.5, p.z); });
      avec(A, 2, () => { A.toit(4.2, 2.6, 7.2, '#5d606b', p.x, y + 4, p.z, rot); A.cone(1.9, 5, 4, '#5d606b', p.x, y + 11.5, p.z, 0, Math.PI / 4, 0); });
      continue;
    }
    const h = (2.6 + al() * 1.3) * (st.etages || 1);
    maison3(A, p.x, y, p.z, w, h, d, murC, toitC, rot, al, { plat: st.plats && al() < st.plats, brique: ere === 4 || (ere === 2 && al() < 0.3) });
  }
  if (cap) {
    const y = hauteur(0, 0) - 0.3;
    if (ere >= 5) {
      A.boite(9, 30, 9, '#c4d0db', 0, y + 15, 0);
      for (let e = 1; e < 12; e++) A.boite(9.1, 0.6, 9.1, '#5f7a92', 0, y + e * 2.5, 0);
      A.boite(9.4, 2, 9.4, civ, 0, y + 30.5, 0); A.tige(V3(0, y + 31.5, 0), V3(0, y + 38, 0), 0.2, '#999', 4);
    } else {
      avec(A, 1, () => {
        A.boite(13, 5.4, 8, ere >= 3 ? '#e9e1d0' : '#efe4c8', 0, y + 2.7, 0);
        A.boite(5, 4, 9, ere >= 3 ? '#e2d9c6' : '#e8dcbc', -8.5, y + 2, 0.5); A.boite(5, 4, 9, ere >= 3 ? '#e2d9c6' : '#e8dcbc', 8.5, y + 2, 0.5);
      });
      avec(A, 2, () => { A.toit(5.4, 2, 9.4, '#9a4a32', -8.5, y + 4, 0.5); A.toit(5.4, 2, 9.4, '#9a4a32', 8.5, y + 4, 0.5); });
      for (let k = 0; k < 6; k++) A.cyl(0.42, 0.48, 4.8, 8, '#fbf6ea', -5 + k * 2, y + 2.5, 4.4);
      A.boite(13.6, 0.9, 9, '#d9cfb8', 0, y + 5.6, 0);
      A.forme([[-6.8, 0], [6.8, 0], [0, 2.2]], 0.6, '#e6dcc6', 0, y + 6, 4.3);
      A.cyl(3.3, 3.7, 2.6, 14, '#efe4c8', 0, y + 7.3, -0.5);
      A.dome(3.5, civ, 0, y + 8.6, -0.5, 1.15, 16);
      A.cyl(0.15, 0.15, 5, 4, '#3a2d1a', 0, y + 14, -0.5); A.ajouter(new THREE.PlaneGeometry(3, 1.8), civ, A.m(1.5, y + 15.4, -0.5));
      A.boite(4, 0.5, 6, '#cfc3a6', 0, y + 0.25, 7.5);
    }
  }
  A.matiere = 4;
  if (murs) {
    const rx = R0 + 4, rz = (R0 + 4) * 0.85, nb2 = 26, th = murs === 2 ? 4.4 : 3.2, porte = Math.round(nb2 * 0.25);
    for (let k = 0; k < nb2; k++) {
      if (k === porte) continue;
      const a0 = k / nb2 * Math.PI * 2, a1 = (k + 1) / nb2 * Math.PI * 2;
      const x0 = Math.cos(a0) * rx, z0 = Math.sin(a0) * rz, x1 = Math.cos(a1) * rx, z1 = Math.sin(a1) * rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0), y = hauteur(mx, mz);
      A.boite(len + 0.4, th, 1.5, '#a59c8c', mx, y + th / 2 - 0.4, mz, 0, ang, 0);
      for (const t of [-0.3, 0.1]) A.boite(len * 0.22, 0.8, 1.55, '#b3aa99', mx + Math.cos(-ang) * len * t, y + th, mz + Math.sin(-ang) * len * t, 0, ang, 0);
    }
    const ap = (porte + 0.5) / nb2 * Math.PI * 2, gx = Math.cos(ap) * rx, gz = Math.sin(ap) * rz;
    for (const s of [-1, 1]) { const tx = gx + s * 2.6 * Math.sin(ap), tz = gz - s * 2.6 * Math.cos(ap) * 0.85, y = hauteur(tx, tz); A.cyl(1.8, 2, th + 3.5, 10, '#9a9183', tx, y + (th + 3.5) / 2 - 0.4, tz); A.cone(2.4, 3, 10, murs === 2 ? civ : '#6d655a', tx, y + th + 4.6, tz); }
    for (let k = 0; k < (murs === 2 ? 8 : 6); k++) {
      const a = k / (murs === 2 ? 8 : 6) * Math.PI * 2 + 0.3, x = Math.cos(a) * rx, z = Math.sin(a) * rz, y = hauteur(x, z);
      if (Math.abs(a - ap) < 0.4) continue;
      A.cyl(1.8, 2.1, th + 3, 10, '#9a9183', x, y + (th + 3) / 2 - 0.4, z);
      for (let c = 0; c < 6; c++) { const b = c / 6 * Math.PI * 2; A.boite(0.7, 0.8, 0.7, '#b3aa99', x + Math.cos(b) * 1.6, y + th + 2.9, z + Math.sin(b) * 1.6); }
      if (murs === 2) avec(A, 0, () => A.cone(2.3, 3.2, 10, civ, x, y + th + 4.8, z));
    }
  }
  A.matiere = 0;
  return A.geometrie();
}
