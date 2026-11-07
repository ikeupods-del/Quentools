'use strict';
/* Aube des Nations — modèles 3D construits par le programme à partir de formes simples (aucun fichier externe).
   Une case mesure 32 unités de rayon ; un fantassin mesure environ 6,5 unités. Les modèles regardent la caméra (+z). */

const M3 = { cache: new Map() };

/* Assemble des formes colorées en une seule géométrie (une seule commande de dessin par modèle). */
class Atelier {
  constructor() { this.pos = []; this.nor = []; this.col = []; }
  ajouter(geo, coul, m) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(m);
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = new THREE.Color(coul);
    for (let i = 0; i < p.length; i += 3) { this.pos.push(p[i], p[i + 1], p[i + 2]); this.nor.push(n[i], n[i + 1], n[i + 2]); this.col.push(c.r, c.g, c.b); }
    g.dispose();
    return this;
  }
  m(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  }
  boite(w, h, d, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.ajouter(new THREE.BoxGeometry(w, h, d), c, this.m(x, y, z, rx, ry, rz)); }
  cyl(rh, rb, h, seg, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.ajouter(new THREE.CylinderGeometry(rh, rb, h, seg), c, this.m(x, y, z, rx, ry, rz)); }
  cone(r, h, seg, c, x, y, z, rx = 0, ry = 0, rz = 0) { return this.ajouter(new THREE.ConeGeometry(r, h, seg), c, this.m(x, y, z, rx, ry, rz)); }
  boule(r, c, x, y, z, sx = 1, sy = 1, sz = 1, det = 1) { return this.ajouter(new THREE.IcosahedronGeometry(r, det), c, this.m(x, y, z, 0, 0, 0, sx, sy, sz)); }
  dome(r, c, x, y, z, sy = 1) { return this.ajouter(new THREE.SphereGeometry(r, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), c, this.m(x, y, z, 0, 0, 0, 1, sy, 1)); }
  /* Toit à deux pans : prisme dont la base (largeur w, longueur l) est posée en y. */
  toit(w, h, l, c, x, y, z, ry = 0) {
    const g = new THREE.CylinderGeometry(1, 1, 1, 3); g.rotateX(-Math.PI / 2);
    return this.ajouter(g, c, this.m(x, y + h / 3, z, 0, ry, 0, w / 1.732, h / 1.5, l));
  }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
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
const BOIS = '#6b4423', FER = '#c3c8cd', PEAU = '#d9a77c';
const MODELES3D = {
  colon: { m: 'chariot' }, ouvrier: { m: 'ouvrier' }, eclaireur: { m: 'eclaireur' },
  guerrier: { m: 'fantassin', arme: 'hache', casque: 'cheveux', n: 3 },
  archer: { m: 'fantassin', arme: 'arc', casque: 'capuche', n: 3 },
  lancier: { m: 'fantassin', arme: 'lance', casque: 'bronze', bouclier: 'rond', n: 3 },
  epeiste: { m: 'fantassin', arme: 'epee', casque: 'fer', bouclier: 'long', n: 3 },
  piquier: { m: 'fantassin', arme: 'pique', casque: 'fer', n: 3 },
  arbaletrier: { m: 'fantassin', arme: 'arbalete', casque: 'fer', n: 3 },
  mousquetaire: { m: 'fantassin', arme: 'fusil', casque: 'tricorne', n: 3 },
  fusilier: { m: 'fantassin', arme: 'fusil', casque: 'kepi', n: 3 },
  infanterie: { m: 'fantassin', arme: 'fusil', casque: 'moderne', kaki: true, n: 3 },
  cavalier: { m: 'cavalier', arme: 'lance', casque: 'cheveux', n: 2 },
  chevalier: { m: 'cavalier', arme: 'lance', casque: 'heaume', caparacon: true, n: 2 },
  dragon: { m: 'cavalier', arme: 'sabre', casque: 'kepi', n: 2 },
  catapulte: { m: 'catapulte' }, trebuchet: { m: 'trebuchet' }, canon: { m: 'canon' }, artillerie: { m: 'artillerie' }, lanceRoquettes: { m: 'roquettes' },
  char: { m: 'char' }, blinde: { m: 'blinde' },
  galere: { m: 'galere' }, caravelle: { m: 'caravelle' }, fregate: { m: 'fregate' }, cuirasse: { m: 'cuirasse' },
};
function casque3(A, type, x, y, z, k, civ) {
  switch (type) {
    case 'cheveux': A.dome(0.8 * k, '#3b2616', x, y + 0.05 * k, z - 0.05 * k); break;
    case 'capuche': A.cone(0.95 * k, 1.9 * k, 7, teinte(civ, -0.35), x, y + 0.45 * k, z - 0.1 * k); break;
    case 'bronze': A.dome(0.9 * k, '#c99a3c', x, y, z); A.boite(0.18 * k, 0.7 * k, 1.5 * k, civ, x, y + 0.95 * k, z); break;
    case 'fer': A.dome(0.88 * k, '#9aa0a6', x, y, z); A.cone(0.3 * k, 0.7 * k, 6, '#9aa0a6', x, y + 1.05 * k, z); break;
    case 'heaume': A.cyl(0.85 * k, 0.85 * k, 1.7 * k, 8, '#a5abb1', x, y + 0.15 * k, z); A.boite(1.2 * k, 0.14 * k, 0.2 * k, '#2d3136', x, y + 0.15 * k, z + 0.8 * k); A.boule(0.3 * k, civ, x, y + 1.15 * k, z); break;
    case 'tricorne': A.cyl(1.25 * k, 1.25 * k, 0.4 * k, 3, '#1c1a1a', x, y + 0.6 * k, z, 0, Math.PI, 0); break;
    case 'kepi': A.cyl(0.72 * k, 0.8 * k, 0.9 * k, 8, teinte(civ, -0.4), x, y + 0.6 * k, z); A.boite(1.0 * k, 0.12 * k, 0.6 * k, '#151515', x, y + 0.25 * k, z + 0.7 * k); break;
    case 'moderne': A.dome(0.98 * k, '#5c6a3f', x, y + 0.05 * k, z); break;
    case 'paille': A.cyl(1.6 * k, 1.6 * k, 0.15 * k, 10, '#d9b862', x, y + 0.45 * k, z); A.cyl(0.6 * k, 0.75 * k, 0.65 * k, 8, '#d9b862', x, y + 0.75 * k, z); break;
  }
}
function arme3(A, type, x, y, z, k) {
  switch (type) {
    case 'hache': A.cyl(0.12 * k, 0.12 * k, 3 * k, 5, BOIS, x, y + 0.6 * k, z + 0.4 * k, 0, 0, -0.3); A.boite(0.15 * k, 0.8 * k, 0.9 * k, FER, x + 0.45 * k, y + 1.9 * k, z + 0.4 * k, 0, Math.PI / 2, 0); break;
    case 'lance': A.cyl(0.12 * k, 0.12 * k, 8 * k, 5, BOIS, x, y + 1.6 * k, z + 0.3 * k, 0, 0, -0.08); A.cone(0.3 * k, 1 * k, 5, FER, x + 0.33 * k, y + 6.1 * k, z + 0.3 * k, 0, 0, -0.08); break;
    case 'pique': A.cyl(0.11 * k, 0.11 * k, 11 * k, 5, BOIS, x, y + 3 * k, z + 0.3 * k); A.cone(0.28 * k, 1 * k, 5, FER, x, y + 9 * k, z + 0.3 * k); break;
    case 'epee': A.boite(0.25 * k, 2.6 * k, 0.1 * k, FER, x + 0.3 * k, y + 1.1 * k, z + 0.5 * k, 0, 0, -0.5); A.boite(0.9 * k, 0.15 * k, 0.2 * k, '#8a6a2a', x - 0.15 * k, y + 0.05 * k, z + 0.5 * k, 0, 0, -0.5); break;
    case 'sabre': A.boite(0.22 * k, 3 * k, 0.1 * k, FER, x + 0.6 * k, y + 1.2 * k, z + 0.5 * k, 0, 0, -0.8); break;
    case 'arc': A.ajouter(new THREE.TorusGeometry(1.9 * k, 0.12 * k, 4, 12, Math.PI), BOIS, A.m(x - 0.2 * k, y + 0.4 * k, z + 0.9 * k, 0, 0, -Math.PI / 2)); A.cyl(0.03 * k, 0.03 * k, 3.8 * k, 3, '#e8e0c8', x - 0.2 * k, y + 0.4 * k, z + 0.9 * k); break;
    case 'arbalete': A.boite(0.3 * k, 0.3 * k, 2.6 * k, BOIS, x - 0.4 * k, y + 0.4 * k, z + 1.2 * k); A.boite(2.6 * k, 0.15 * k, 0.2 * k, '#4a4a4a', x - 0.4 * k, y + 0.45 * k, z + 2.3 * k); break;
    case 'fusil': A.boite(0.22 * k, 0.22 * k, 4.6 * k, '#3a2a1c', x - 0.2 * k, y + 1.2 * k, z + 0.6 * k, -0.95, 0, 0); break;
    case 'baton': A.cyl(0.12 * k, 0.12 * k, 7 * k, 5, BOIS, x, y + 1.2 * k, z + 0.3 * k); break;
    case 'pioche': A.cyl(0.12 * k, 0.12 * k, 3.4 * k, 5, BOIS, x, y + 0.8 * k, z + 0.3 * k, 0, 0, -0.5); A.boite(2.0 * k, 0.22 * k, 0.22 * k, FER, x + 0.8 * k, y + 2.3 * k, z + 0.3 * k, 0, 0, 0.35); break;
  }
}
function personnage3(A, x, z, o, civ, k = 1) {
  const tunique = o.kaki ? '#6b7046' : o.tunique || civ, pantalon = o.kaki ? '#555a37' : '#3a2e25';
  A.boite(0.75 * k, 2.6 * k, 0.8 * k, pantalon, x - 0.45 * k, 1.3 * k, z);
  A.boite(0.75 * k, 2.6 * k, 0.8 * k, pantalon, x + 0.45 * k, 1.3 * k, z);
  A.cyl(0.95 * k, 1.15 * k, 2.8 * k, 7, tunique, x, 3.9 * k, z);
  if (o.cotte) A.cyl(1.0 * k, 1.2 * k, 1.2 * k, 7, '#9aa0a6', x, 4.5 * k, z);
  if (o.kaki) A.boite(0.4 * k, 0.6 * k, 2.3 * k, civ, x + 1.0 * k, 4.6 * k, z);
  A.boite(2.3 * k, 0.35 * k, 2.35 * k, '#3a2a1a', x, 2.75 * k, z);
  A.boite(0.55 * k, 2.4 * k, 0.6 * k, tunique, x - 1.25 * k, 4.0 * k, z + 0.2 * k, 0.2, 0, 0.12);
  A.boite(0.55 * k, 2.4 * k, 0.6 * k, tunique, x + 1.25 * k, 4.0 * k, z + 0.35 * k, -0.4, 0, -0.12);
  A.boule(0.78 * k, PEAU, x, 5.95 * k, z, 1, 1.05, 1, 1);
  casque3(A, o.casque, x, 6.1 * k, z, k, civ);
  if (o.arme) arme3(A, o.arme, x + 1.3 * k, 3.0 * k, z, k);
  if (o.bouclier === 'rond') { A.cyl(1.35 * k, 1.35 * k, 0.25 * k, 12, civ, x - 1.35 * k, 4.0 * k, z + 0.8 * k, Math.PI / 2, 0, 0); A.cyl(0.35 * k, 0.35 * k, 0.4 * k, 8, '#d6b56a', x - 1.35 * k, 4.0 * k, z + 0.95 * k, Math.PI / 2, 0, 0); }
  else if (o.bouclier === 'long') { A.boite(1.8 * k, 3.0 * k, 0.25 * k, civ, x - 1.3 * k, 3.7 * k, z + 0.9 * k); A.boite(0.3 * k, 2.4 * k, 0.3 * k, '#e8dcc0', x - 1.3 * k, 3.7 * k, z + 1.0 * k); }
}
function cheval3(A, x, z, robe, caparacon, k = 1) {
  const sombre = teinte(robe, -0.35);
  for (const [dx, dz] of [[-1.7, -0.7], [-1.7, 0.7], [1.6, -0.7], [1.6, 0.7]]) A.boite(0.55 * k, 3.4 * k, 0.55 * k, sombre, x + dx * k, 1.7 * k, z + dz * k);
  A.boite(5.2 * k, 2.3 * k, 2.1 * k, robe, x, 4.1 * k, z);
  A.boite(1.3 * k, 3.0 * k, 1.2 * k, robe, x - 2.6 * k, 5.6 * k, z, 0, 0, -0.55);
  A.boite(2.3 * k, 1.1 * k, 1.05 * k, robe, x - 3.7 * k, 6.5 * k, z, 0, 0, 0.35);
  A.boite(0.5 * k, 2.4 * k, 0.4 * k, sombre, x + 2.9 * k, 3.6 * k, z, 0, 0, -0.5);
  A.boite(0.35 * k, 1.6 * k, 1.25 * k, sombre, x - 2.4 * k, 6.8 * k, z, 0, 0, -0.55);
  if (caparacon) { A.boite(5.5 * k, 1.6 * k, 2.4 * k, caparacon, x, 3.7 * k, z); A.boite(5.6 * k, 0.3 * k, 2.45 * k, '#e8d7a0', x, 2.95 * k, z); }
}
function cavalier3(A, x, z, o, civ, n) {
  const robes = ['#7a4b2a', '#3d2a1e', '#b9a690', '#5c4632'];
  cheval3(A, x, z, robes[n % 4], o.caparacon ? civ : null);
  const corps = o.casque === 'heaume' ? '#9aa0a6' : civ;
  A.boite(0.7, 2.2, 0.75, '#3a2e25', x + 0.2, 5.0, z - 1.0, 0.5, 0, 0); A.boite(0.7, 2.2, 0.75, '#3a2e25', x + 0.2, 5.0, z + 1.0, -0.5, 0, 0);
  A.cyl(0.9, 1.05, 2.6, 7, corps, x + 0.2, 6.6, z);
  A.boule(0.72, PEAU, x + 0.2, 8.4, z);
  casque3(A, o.casque, x + 0.2, 8.55, z, 0.92, civ);
  if (o.arme === 'lance') { A.cyl(0.12, 0.12, 10, 5, BOIS, x - 1.5, 7.2, z + 1.2, 0, 0, Math.PI / 2 - 0.25); A.cone(0.3, 1.0, 5, FER, x - 6.5, 8.5, z + 1.2, 0, 0, Math.PI / 2 - 0.25); A.boite(1.2, 0.8, 0.08, civ, x - 4.6, 8.3, z + 1.2, 0, 0, -0.25); }
  else arme3(A, o.arme, x + 1.4, 5.6, z, 0.9);
}

/* ---------- Engins et navires ---------- */
function roue3(A, x, y, z, r, c = '#3a2a1c') { A.cyl(r, r, 0.5, 10, c, x, y, z, Math.PI / 2, 0, 0); A.cyl(r * 0.3, r * 0.3, 0.7, 6, '#8a6a44', x, y, z, Math.PI / 2, 0, 0); }
function engin3(A, m, civ) {
  const bois = '#7a5230', boisF = '#4f341d';
  if (m === 'catapulte' || m === 'trebuchet') {
    const g = m === 'trebuchet';
    A.boite(9, 1, 4.4, bois, 0, 2, 0);
    for (const dz of [-1.6, 1.6]) { A.boite(0.6, g ? 9 : 5, 0.6, boisF, -1.2, g ? 6 : 4, dz, 0, 0, 0.25); A.boite(0.6, g ? 9 : 5, 0.6, boisF, 1.2, g ? 6 : 4, dz, 0, 0, -0.25); }
    A.boite(g ? 14 : 8.5, 0.6, 0.6, bois, 0.5, g ? 9.5 : 5.5, 0, 0, 0, g ? -0.5 : -0.6);
    A.boule(0.9, '#6d6a63', g ? -5.5 : -3, g ? 12.6 : 8.2, 0);
    if (g) A.boite(2.2, 2.2, 2.2, boisF, 6, 6.5, 0);
    for (const [dx, dz] of [[-3.3, 2.4], [3.3, 2.4], [-3.3, -2.4], [3.3, -2.4]]) roue3(A, dx, 1.4, dz, 1.4);
    A.boite(0.15, 1.6, 2.2, civ, -0.2, g ? 11 : 7.6, 0);
  } else if (m === 'canon' || m === 'artillerie') {
    const gros = m === 'artillerie';
    A.cyl(gros ? 0.75 : 0.65, gros ? 0.95 : 0.85, gros ? 9 : 7, 10, '#2a2b2d', -1.2, gros ? 4 : 3.4, 0, 0, 0, Math.PI / 2 - 0.25);
    A.boite(6, 0.8, 1.2, gros ? '#4c5a3c' : boisF, 2.4, 1.6, 0, 0, 0, 0.2);
    if (gros) A.boite(0.3, 3.2, 4.4, '#4c5a3c', 0.3, 3.6, 0);
    roue3(A, 0.2, 2.0, 1.6, 2.0); roue3(A, 0.2, 2.0, -1.6, 2.0);
    A.boite(0.1, 1.2, 1.8, civ, 5, 3.4, 0); A.cyl(0.08, 0.08, 3.2, 4, '#2a2a2a', 5, 2.4, -0.9);
  } else if (m === 'roquettes') {
    A.boite(11, 2.2, 4.4, '#56603f', 0, 2.6, 0); A.boite(3.4, 2.4, 4.2, '#3f4730', -4, 4.8, 0); A.boite(0.2, 1.2, 3.2, '#8fb1c9', -5.75, 5.0, 0);
    A.boite(6, 2.2, 3.6, '#4a5236', 1.8, 5.2, 0, 0, 0, 0.45);
    for (const dx of [-3.6, 0, 3.6]) { roue3(A, dx, 1.3, 2.2, 1.3, '#222'); roue3(A, dx, 1.3, -2.2, 1.3, '#222'); }
    A.boite(0.1, 1, 1.6, civ, -5.8, 3.0, 0);
  } else {
    const mod = m === 'blinde', coque = mod ? '#8a8a72' : '#58603f';
    A.boite(11, 2.6, 1.6, '#26281f', 0, 1.3, 2.4); A.boite(11, 2.6, 1.6, '#26281f', 0, 1.3, -2.4);
    A.boite(10, 2.2, 5.6, coque, 0, 3.4, 0);
    if (mod) A.boite(5, 1.8, 4.2, teinte(coque, -0.1), 0.8, 5.4, 0); else A.cyl(2.2, 2.4, 1.8, 10, teinte(coque, -0.1), 0.8, 5.4, 0);
    A.cyl(0.32, 0.32, 8, 6, teinte(coque, -0.35), -4.2, 5.5, 0, 0, 0, Math.PI / 2);
    A.boite(0.1, 1.0, 1.6, civ, 3.4, 5.4, 2.0);
  }
}
function navire3(A, m, civ) {
  const acier = m === 'cuirasse', coque = acier ? '#676d73' : '#6b4524', L = acier ? 22 : m === 'galere' ? 17 : 19;
  A.boite(L, 3, 5.4, coque, 0, 1, 0);
  A.cone(2.7, 5, 4, coque, -L / 2 - 2.4, 1, 0, 0, Math.PI / 4, Math.PI / 2);
  A.boite(L, 0.4, 5.6, acier ? '#3d4247' : '#d8c08a', 0, 2.4, 0);
  const voile = (x, h, l) => {
    A.cyl(0.25, 0.3, h + 2, 5, '#4a3420', x, 2.5 + (h + 2) / 2, 0);
    A.boite(0.25, h * 0.8, l, '#efe6cf', x + 0.4, 3.6 + h * 0.5, 0);
    A.boite(0.28, h * 0.2, l * 1.01, civ, x + 0.4, 3.6 + h * 0.5, 0);
  };
  if (m === 'galere') {
    for (let k = 0; k < 6; k++) for (const s of [-1, 1]) A.boite(0.3, 0.3, 4.4, BOIS, -6 + k * 2.4, 1.3, s * 4.5, s * 0.5, 0, 0);
    voile(0, 9, 7);
  } else if (m === 'caravelle') { voile(-4, 8, 5.5); voile(3, 10, 6.5); }
  else if (m === 'fregate') { voile(-6, 8, 5.5); voile(0, 11, 7); voile(6, 9, 6); A.boite(L, 0.8, 5.5, '#2b2016', 0, 2.9, 0); }
  else if (acier) {
    A.boite(8, 3, 4, '#7d848a', -1, 4, 0); A.boite(3.5, 4, 3, '#6a7177', -0.5, 7, 0);
    A.cyl(1, 1.1, 4.5, 8, '#4f555b', 2.5, 7.5, 0); A.boite(1.6, 0.9, 1.4, civ, 2.5, 10.2, 0);
    for (const x of [-8, 6.5]) { A.cyl(1.6, 1.8, 1.3, 10, '#5c6268', x, 3.2, 0); A.cyl(0.3, 0.3, 5, 6, '#3d4247', x + (x < 0 ? -2.6 : 2.6), 3.4, 0, 0, 0, Math.PI / 2); }
  }
}
function chariot3(A, civ) {
  A.boite(7, 1, 4, '#7a5230', 0, 2.6, 0);
  A.ajouter(new THREE.CylinderGeometry(2.3, 2.3, 6.4, 10, 1, true, -Math.PI / 2, Math.PI), '#efe6cf', A.m(0, 3.1, 0, 0, 0, Math.PI / 2));
  A.boite(0.2, 2.6, 4.2, civ, 1.2, 4.4, 0);
  roue3(A, -2.2, 1.5, 2.2, 1.5); roue3(A, 2.2, 1.5, 2.2, 1.5); roue3(A, -2.2, 1.5, -2.2, 1.5); roue3(A, 2.2, 1.5, -2.2, 1.5);
  A.boite(4, 2, 2, '#7a4b2a', -6.2, 3, 0); A.boite(1.6, 1.4, 1.4, '#6a3f22', -8.6, 3.6, 0);
  for (const [dx, dz] of [[-7.6, -0.6], [-7.6, 0.6], [-4.8, -0.6], [-4.8, 0.6]]) A.boite(0.5, 2, 0.5, '#4a2e18', dx, 1, dz);
}
function geoUnite(type, civ, embarque) {
  return enCache(`u|${type}|${civ}|${embarque ? 1 : 0}`, () => {
    const A = new Atelier(), M = MODELES3D[type] || { m: 'fantassin', n: 1 };
    if (embarque) { navire3(A, 'galere', civ); return A.geometrie(); }
    if (M.m === 'fantassin') {
      const pos = M.n === 3 ? [[-4.6, -2.2], [4.6, -2.6], [0, 2.8]] : [[0, 0]];
      pos.forEach(([x, z]) => personnage3(A, x, z, { arme: M.arme, casque: M.casque, bouclier: M.bouclier, kaki: M.kaki, cotte: type === 'epeiste' }, civ));
    } else if (M.m === 'cavalier') { cavalier3(A, -3.2, -2.4, M, civ, 0); cavalier3(A, 3.6, 2.6, M, civ, 1); }
    else if (M.m === 'eclaireur') { personnage3(A, 0, 0, { arme: 'baton', casque: 'cheveux', tunique: teinte(civ, -0.15).getHexString().replace(/^/, '#') }, civ); A.boite(0.1, 1.4, 2.2, civ, 1.3, 7.6, 1.4); }
    else if (M.m === 'ouvrier') personnage3(A, 0, 0, { arme: 'pioche', casque: 'paille', tunique: '#a89a7a' }, civ);
    else if (M.m === 'chariot') { chariot3(A, civ); personnage3(A, 5.6, 2.4, { arme: 'baton', casque: 'cheveux' }, civ, 0.85); }
    else if (['galere', 'caravelle', 'fregate', 'cuirasse'].includes(M.m)) navire3(A, M.m, civ);
    else engin3(A, M.m, civ);
    return A.geometrie();
  });
}

/* ---------- Arbres et roseaux (instanciés) ---------- */
function geoArbre(sorte) {
  return enCache('arbre|' + sorte, () => {
    const A = new Atelier();
    if (sorte === 'sapin') { A.cyl(0.45, 0.55, 2.2, 5, '#5a3c22', 0, 1.1, 0); A.cone(2.6, 4.6, 7, '#ffffff', 0, 4.2, 0); A.cone(1.9, 3.6, 7, '#ffffff', 0, 6.3, 0); A.cone(1.2, 2.6, 7, '#ffffff', 0, 8.0, 0); }
    else if (sorte === 'feuillu') { A.cyl(0.45, 0.6, 3, 5, '#5a3c22', 0, 1.5, 0); A.boule(2.6, '#ffffff', 0, 4.6, 0, 1, 0.9, 1, 1); A.boule(1.7, '#ffffff', 1.4, 4.0, 0.8, 1, 0.9, 1, 0); A.boule(1.6, '#ffffff', -1.3, 4.2, -0.6, 1, 0.9, 1, 0); }
    else if (sorte === 'palmier') { A.cyl(0.3, 0.45, 7, 5, '#7a5a34', 0.6, 3.4, 0, 0, 0, -0.15); for (let k = 0; k < 6; k++) A.boite(0.25, 0.2, 4.2, '#ffffff', 1.1 + Math.cos(k) * 1.6, 6.8, Math.sin(k) * 1.6, 0.35, k * 1.05, 0); }
    else if (sorte === 'roseau') { for (let k = 0; k < 5; k++) A.cone(0.18, 2.6, 4, '#ffffff', Math.cos(k * 1.3) * 0.7, 1.3, Math.sin(k * 1.3) * 0.7); }
    return A.geometrie();
  });
}

/* ---------- Aménagements ---------- */
function geoAmel(am, v) {
  return enCache(`a|${am}|${v}`, () => {
    const A = new Atelier(), al = creerAlea(v * 977 + am.length * 31);
    if (am === 'ferme') {
      const cs = ['#d4b45a', '#c8a548', '#9cb04e', '#b8c25c', '#e0c46e', '#8aa046'];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if ((r !== 1 || c !== 1) && al() < 0.15) continue;
        A.boite(8.6, 0.5, 6.6, cs[Math.floor(al() * cs.length)], -9.5 + c * 9.5, 0.25, -7.5 + r * 7.5);
      }
      A.boite(3.6, 2.6, 3, '#e8dcc0', 11, 1.3, 9); A.toit(3.8, 2, 3.4, '#9a4a32', 11, 2.6, 9, Math.PI / 2);
    } else if (am === 'mine') {
      A.boule(6, '#6e665a', 0, 0, 0, 1.2, 0.6, 1, 0);
      A.boite(3.2, 3.4, 1.2, '#1a1612', 0, 1.8, 4.6); A.boite(0.6, 4, 0.6, '#7a5230', -2, 2, 5.2); A.boite(0.6, 4, 0.6, '#7a5230', 2, 2, 5.2); A.boite(4.8, 0.6, 0.6, '#7a5230', 0, 4, 5.2);
      A.boite(2.6, 1.4, 2, '#5a4030', 7, 0.8, 7); A.boule(1.2, '#8c8c8c', 7, 1.8, 7, 1, 0.6, 1, 0);
      A.boite(0.3, 0.2, 9, '#5a4a3a', 3.5, 0.2, 9.5, 0, 0.5, 0);
    } else if (am === 'paturage') {
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; A.boite(0.5, 2.2, 0.5, '#8a6a44', Math.cos(a) * 14, 1.1, Math.sin(a) * 10); }
      for (let k = 0; k < 14; k++) { const a = (k + 0.5) / 14 * Math.PI * 2; A.boite(0.25, 0.3, 6.6, '#a5845a', Math.cos(a) * 13.9, 1.6, Math.sin(a) * 9.9, 0, -a, 0); }
      for (let k = 0; k < 4; k++) { const x = (al() - 0.5) * 16, z = (al() - 0.5) * 11, c = al() < 0.5 ? '#f2eee4' : '#8a5a36'; A.boite(3, 1.6, 1.6, c, x, 1.9, z); A.boite(1.1, 1.1, 1.1, c, x - 2, 2.5, z); for (const dx of [-1, 1]) A.boite(0.4, 1.2, 0.4, '#3a2a1a', x + dx, 0.6, z); }
    } else if (am === 'plantation') {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const x = -12 + c * 6 + (r % 2) * 3, z = -9 + r * 6; A.cyl(0.3, 0.3, 1.5, 4, '#5a3c22', x, 0.75, z); A.boule(1.6, r % 2 ? '#3f7a35' : '#4f8a3f', x, 2.2, z, 1, 0.85, 1, 0); }
    } else if (am === 'scierie') {
      for (let k = 0; k < 3; k++) for (let l = 0; l <= 2 - k; l++) A.cyl(0.9, 0.9, 7, 8, '#8a5a30', 4 + l * 1.8 + k * 0.9, 0.9 + k * 1.5, 4, Math.PI / 2, 0, 0);
      A.boite(6, 3, 5, '#9a7450', -6, 1.5, -2); A.toit(6.4, 2.6, 5.4, '#5a3a22', -6, 3, -2);
    } else if (am === 'camp') {
      for (const [x, z] of [[-5, 2], [4, 5]]) A.cone(3.2, 5, 6, '#b89a6a', x, 2.5, z);
      A.boite(5, 0.3, 0.3, '#6a4a2a', 2, 3.4, -5); A.boite(0.3, 3.4, 0.3, '#6a4a2a', -0.5, 1.7, -5); A.boite(0.3, 3.4, 0.3, '#6a4a2a', 4.5, 1.7, -5);
    } else if (am === 'hutte') {
      for (const [x, z, r] of [[-4, -1, 3.4], [5, 4, 2.8]]) { A.cyl(r, r, 2.6, 8, '#b8956a', x, 1.3, z); A.cone(r * 1.3, 3.8, 8, '#d9bc6a', x, 4.4, z); }
    } else if (am === 'barbares') {
      for (const [x, z] of [[-5, -2], [4, -4]]) A.cone(3.6, 5.6, 5, '#4a3524', x, 2.8, z);
      A.cone(1.4, 3, 6, '#ff8a2a', 1, 1.5, 5); A.cone(0.8, 2, 6, '#ffd36a', 1, 1.2, 5.3);
      for (let k = 0; k < 5; k++) A.boite(0.4, 0.4, 3, '#3a2a1a', 1 + Math.cos(k) * 1.6, 0.2, 5 + Math.sin(k) * 1.6, 0, k, 0);
      A.boite(0.3, 8, 0.3, '#3a2a1a', -9, 4, 3); A.boite(3, 2, 0.1, '#7a1f1a', -7.4, 7, 3);
    }
    return A.geometrie();
  });
}

/* ---------- Villes ---------- */
const STYLES3D = [
  { murs: ['#e6d6b0', '#dccaa0', '#efe2c4'], toits: ['#b4553b', '#a3492f', '#c06a45'], plats: 0.35 },
  { murs: ['#ece0c2', '#e2d2ae', '#f0e6cf'], toits: ['#b05337', '#9d4630', '#7d3a2a'], plats: 0.15 },
  { murs: ['#efe5cc', '#e6d9bb', '#d9c9a8'], toits: ['#5d606b', '#7a3b2c', '#6b4a35'], clocher: true },
  { murs: ['#ddd0b5', '#cfc2a6', '#e4d8bf'], toits: ['#4f5d73', '#5d6a7e', '#6a4a3a'], etages: 1.6 },
  { murs: ['#a8583f', '#9b4f39', '#b56a4f'], toits: ['#3f4146', '#4b4d52'], etages: 1.8, usine: true },
  { murs: ['#8ea9c2', '#a8bccd', '#c9d3db', '#d8dde2'], toits: ['#4d6680'], tours: true },
];
/* hauteur(dx, dz) = hauteur du sol autour du centre de la ville, relative au centre. */
function geoVille(v, ere, civ, hauteur) {
  const A = new Atelier(), al = creerAlea(v.id * 7919 + 13), st = STYLES3D[ere];
  const popB = Math.min(24, v.pop), murs = v.bat.chateau ? 2 : v.bat.remparts ? 1 : 0, cap = !!v.bat.palais;
  const R0 = 15 + Math.min(12, popB * 0.7);
  A.cyl(R0 + 3, R0 + 4, 1.2, 20, '#bfae8a', 0, hauteur(0, 0) - 0.2, 0);
  const pos = [];
  const nb = Math.min(28, 6 + Math.round(popB * 1.1));
  for (let k = 0; k < nb * 4 && pos.length < nb; k++) {
    const a = al() * Math.PI * 2, d = Math.sqrt(al()) * R0;
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.85;
    if (cap && Math.abs(x) < 6.5 && Math.abs(z) < 5.5) continue;
    if (pos.some(p => Math.abs(p.x - x) < 4.6 && Math.abs(p.z - z) < 4.2)) continue;
    pos.push({ x, z });
  }
  for (const p of pos) {
    const y = hauteur(p.x, p.z) - 0.3, murC = st.murs[Math.floor(al() * st.murs.length)], toitC = st.toits[Math.floor(al() * st.toits.length)];
    const w = 3 + al() * 1.6, d = 3 + al() * 1.4, rot = (al() < 0.5 ? 0 : Math.PI / 2) + (al() - 0.5) * 0.3;
    if (st.tours && al() < 0.7) {
      const h = 6 + al() * 12 + popB * 0.6;
      A.boite(w, h, d, murC, p.x, y + h / 2, p.z, 0, rot, 0);
      A.boite(w * 0.6, 0.8, d * 0.6, '#5f6f7f', p.x, y + h + 0.4, p.z, 0, rot, 0);
      continue;
    }
    if (st.usine && al() < 0.3) {
      A.boite(w * 1.6, 3.6, d * 1.3, '#8d7b6a', p.x, y + 1.8, p.z, 0, rot, 0);
      A.cyl(0.6, 0.8, 9, 8, '#7a3e2c', p.x + 1.5, y + 4.5, p.z);
      continue;
    }
    if (st.clocher && al() < 0.1) { A.boite(2.6, 8, 2.6, '#d8ccb0', p.x, y + 4, p.z); A.cone(2.1, 5, 4, '#5d606b', p.x, y + 10.5, p.z, 0, Math.PI / 4, 0); continue; }
    const h = (2.4 + al() * 1.2) * (st.etages || 1);
    A.boite(w, h, d, murC, p.x, y + h / 2, p.z, 0, rot, 0);
    if (st.plats && al() < st.plats) A.boite(w + 0.3, 0.4, d + 0.3, teinte(murC, -0.15), p.x, y + h + 0.2, p.z, 0, rot, 0);
    else A.toit(w * 1.12, w * 0.55, d * 1.1, toitC, p.x, y + h, p.z, rot + Math.PI / 2);
  }
  if (cap) {
    const y = hauteur(0, 0) - 0.3;
    if (ere >= 5) { A.boite(8, 26, 8, '#c4d0db', 0, y + 13, 0); A.boite(8.4, 2, 8.4, civ, 0, y + 26.5, 0); }
    else {
      A.boite(12, 5, 8, ere >= 3 ? '#e9e1d0' : '#efe4c8', 0, y + 2.5, 0);
      for (let k = 0; k < 6; k++) A.cyl(0.45, 0.45, 4.6, 6, '#fbf6ea', -5 + k * 2, y + 2.4, 4.3);
      A.boite(13, 0.8, 9, '#d9cfb8', 0, y + 5.3, 0);
      A.cyl(3.2, 3.6, 2.4, 12, '#efe4c8', 0, y + 6.8, 0);
      A.dome(3.4, civ, 0, y + 8, 0, 1.1);
      A.cyl(0.15, 0.15, 5, 4, '#3a2d1a', 0, y + 13, 0); A.boite(3, 1.8, 0.12, civ, 1.5, y + 14.4, 0);
    }
  }
  if (murs) {
    const rx = R0 + 4, rz = (R0 + 4) * 0.85, nb2 = 22, th = murs === 2 ? 4.2 : 3;
    for (let k = 0; k < nb2; k++) {
      const a0 = k / nb2 * Math.PI * 2, a1 = (k + 1) / nb2 * Math.PI * 2;
      const x0 = Math.cos(a0) * rx, z0 = Math.sin(a0) * rz, x1 = Math.cos(a1) * rx, z1 = Math.sin(a1) * rz;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, len = Math.hypot(x1 - x0, z1 - z0);
      if (k === Math.round(nb2 * 0.25)) continue;
      A.boite(len + 0.4, th, 1.4, '#a59c8c', mx, hauteur(mx, mz) + th / 2 - 0.4, mz, 0, -Math.atan2(z1 - z0, x1 - x0), 0);
    }
    for (let k = 0; k < (murs === 2 ? 8 : 6); k++) {
      const a = k / (murs === 2 ? 8 : 6) * Math.PI * 2 + 0.3, x = Math.cos(a) * rx, z = Math.sin(a) * rz, y = hauteur(x, z);
      A.cyl(1.8, 2, th + 3, 8, '#9a9183', x, y + (th + 3) / 2 - 0.4, z);
      A.cone(2.4, 3, 8, murs === 2 ? civ : '#6d655a', x, y + th + 4, z);
    }
  }
  return A.geometrie();
}
