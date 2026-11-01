/* Il Prezzo del Silenzio — chapitre I « Conca d'Oro, Sicile, 1861 ».
   Moteur : three.js r128 (vendor/), aucun fichier externe : décor, personnages et sons sont fabriqués par le code. */
'use strict';
(() => {
const T = THREE;
const $ = s => document.querySelector(s);
const PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ecartAngle = (a, b) => { let d = (b - a) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; };
const approche = (v, c, pas) => v < c ? Math.min(v + pas, c) : Math.max(v - pas, c);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function alea(graine) { return () => { graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = alea(1861);
function h2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function bruit(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return lerp(lerp(h2(xi, zi), h2(xi + 1, zi), u), lerp(h2(xi, zi + 1), h2(xi + 1, zi + 1), u), v); }

/* ---------- Sauvegarde (dans ce navigateur seulement) ---------- */
const CLE = 'silenzio:v1';
function lireSauvegarde() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(SAUVE)); } catch (e) { /* stockage refusé : on joue sans */ } }
const SAUVE = lireSauvegarde();
SAUVE.fins = SAUVE.fins || [];

/* ---------- Rendu ---------- */
const tactile = matchMedia('(pointer: coarse)').matches;
const toile = $('#scene');
const rendu = new T.WebGLRenderer({ canvas: toile, antialias: !tactile, powerPreference: 'high-performance' });
rendu.setPixelRatio(Math.min(devicePixelRatio || 1, tactile ? 1.25 : 1.6));
rendu.shadowMap.enabled = true;
rendu.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(60, 1, 0.1, 900);
function redimensionner() { const w = innerWidth, h = innerHeight; rendu.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 72 : 60; camera.updateProjectionMatrix(); }
addEventListener('resize', redimensionner); redimensionner();

/* Grain de pellicule : une petite texture de bruit répétée. */
(() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const im = x.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } x.putImageData(im, 0, 0); $('#grain').style.backgroundImage = `url(${c.toDataURL()})`; })();
if (SAUVE.sansFilm) document.body.classList.add('sans-film');

const MATS = new Map();
function mat(c, o) { const k = c + (o ? JSON.stringify(o) : ''); if (!MATS.has(k)) MATS.set(k, new T.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); return MATS.get(k); }
function facettes(g) { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; }
function prisme() { // toit à deux pentes : faîte le long de x, largeur 1, hauteur 1, profondeur 1
  const a = [-.5, 0, -.5], b = [.5, 0, -.5], c = [.5, 0, .5], d = [-.5, 0, .5], e = [-.5, 1, 0], f = [.5, 1, 0];
  const t = [d, c, f, d, f, e, b, a, e, b, e, f, a, d, e, c, b, f];
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(t.flat(), 3)); g.computeVertexNormals(); return g;
}
const GEO = {
  boite: new T.BoxGeometry(1, 1, 1), cyl: new T.CylinderGeometry(.5, .5, 1, 12), toit: prisme(),
  jupe: new T.CylinderGeometry(.24, .42, .95, 10), roue: new T.CylinderGeometry(.75, .75, .09, 18),
  couronne: facettes(new T.IcosahedronGeometry(1, 1)), tronc: new T.CylinderGeometry(.11, .19, 1, 6),
  fruit: new T.IcosahedronGeometry(.1, 0), cypres: facettes(new T.ConeGeometry(.9, 1, 7)),
  raquette: facettes(new T.SphereGeometry(.5, 6, 4)), roche: facettes(new T.DodecahedronGeometry(1, 0)),
  dome: new T.SphereGeometry(1, 14, 8, 0, PI * 2, 0, PI / 2), cone: new T.ConeGeometry(.5, 1, 4)
};
function boite(parent, m, w, h, d, x, y, z, ombre = true) { const b = new T.Mesh(GEO.boite, m); b.scale.set(w, h, d); b.position.set(x, y, z); b.castShadow = ombre; b.receiveShadow = true; parent.add(b); return b; }

/* ---------- Lumières, ciel, mer ---------- */
const hemi = new T.HemisphereLight(0xffffff, 0x806040, .6); scene.add(hemi);
const soleil = new T.DirectionalLight(0xffffff, 1.1); soleil.castShadow = true;
soleil.shadow.mapSize.set(tactile ? 1024 : 2048, tactile ? 1024 : 2048);
Object.assign(soleil.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 260 });
soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.03;
scene.add(soleil, soleil.target);
scene.fog = new T.Fog(0xe0cfa6, 70, 300);

const ciel = new T.Mesh(new T.SphereGeometry(450, 24, 14), new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, fog: false,
  uniforms: { haut: { value: new T.Color() }, horizon: { value: new T.Color() }, astre: { value: new T.Color() }, dir: { value: new T.Vector3(0, 1, 0) }, nuit: { value: 0 } },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform vec3 haut, horizon, astre, dir; uniform float nuit; varying vec3 vP;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){ vec3 d = normalize(vP); float h = max(d.y, 0.0);
      vec3 c = mix(horizon, haut, pow(h, 0.5)); if (d.y < 0.0) c = horizon * 0.85;
      float s = max(dot(d, normalize(dir)), 0.0);
      c += astre * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.22 * (1.0 - nuit));
      vec2 g = floor(d.xz / (d.y + 0.25) * 140.0); float e = step(0.9965, h21(g)) * nuit * smoothstep(0.05, 0.4, d.y);
      gl_FragColor = vec4(c + e * 0.8, 1.0); }`
}));
ciel.renderOrder = -1; scene.add(ciel);

const matMer = new T.MeshPhongMaterial({ color: 0x4b7f8c, specular: 0x555555, shininess: 60 });
const mer = new T.Mesh(new T.PlaneGeometry(1600, 900), matMer); mer.rotation.x = -PI / 2; mer.position.set(0, 0, -470); scene.add(mer);

/* ---------- Relief ---------- */
const L = {
  porte: { x: 54, z: 50 }, baglio: { x: 70, z: 50 }, village: { x: -80, z: -70 }, marche: { x: -75, z: -63 },
  caserne: { x: -104, z: -70 }, porteCaserne: { x: -98.2, z: -70 }, masseria: { x: 125, z: -45 }
};
const ROUTES = [
  [[54, 50], [30, 44], [5, 24], [-20, -10], [-38, -48], [-52, -66], [-64, -68], [-80, -70]],
  [[30, 44], [70, 10], [105, -28], [121, -40]],
  [[54, 50], [46, 60], [45, 72], [44, 84]]
];
const JARDIN = { x0: 30, x1: 130, z0: 72, z1: 144 };
const dansJardin = (x, z, m = 0) => x > JARDIN.x0 - m && x < JARDIN.x1 + m && z > JARDIN.z0 - m && z < JARDIN.z1 + m;
function distSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function distRoute(x, z) { let m = 1e9; for (const r of ROUTES) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, distSeg(x, z, r[i][0], r[i][1], r[i + 1][0], r[i + 1][1])); return m; }
function hBrut(x, z) {
  let h = 2.6 + 5 * bruit(x / 70 + 10, z / 70 + 3) + 2.2 * bruit(x / 24, z / 24) + .45 * bruit(x / 7, z / 7);
  const dm = Math.hypot(x - L.masseria.x, z - L.masseria.z); h += 13 * Math.exp(-dm * dm / (2 * 38 * 38));
  const r = Math.hypot(x, z); if (r > 195) h += (r - 195) * .55 * (.6 + .8 * bruit(x / 40, z / 40)) * lisse(-170, -105, z);
  if (z < -118) h -= (-118 - z) * .22;
  return h;
}
const APLANIR = [];
function H(x, z) { let h = hBrut(x, z); for (const a of APLANIR) { const d = Math.hypot(x - a.x, z - a.z); if (d < a.r + a.f) h = lerp(h, a.h, 1 - lisse(a.r, a.r + a.f, d)); } return h; }
APLANIR.push({ x: -80, z: -70, r: 34, f: 22, h: hBrut(-80, -70) }, { x: 70, z: 50, r: 17, f: 14, h: hBrut(70, 50) }, { x: 125, z: -45, r: 12, f: 10, h: hBrut(125, -45) });

(() => {
  const g = new T.PlaneGeometry(560, 560, 140, 140); g.rotateX(-PI / 2);
  const p = g.attributes.position, cols = new Float32Array(p.count * 3);
  const herbe = new T.Color(0xa38f58), ocre = new T.Color(0x9a6e42), vert = new T.Color(0x6c7038), sable = new T.Color(0xc9b68a), roche = new T.Color(0x857a68), poussiere = new T.Color(0xb39d74), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = H(x, z); p.setY(i, y);
    c.copy(herbe).lerp(ocre, bruit(x / 18, z / 18) * .7);
    if (dansJardin(x, z, 4)) c.lerp(vert, .6);
    const dr = distRoute(x, z); if (dr < 7) c.lerp(poussiere, (1 - dr / 7) * .55);
    if (y < 1.8) c.lerp(sable, clamp((1.8 - y) / 1.3, 0, 1));
    const r = Math.hypot(x, z); if (r > 210) c.lerp(roche, clamp((r - 210) / 45, 0, .85));
    c.multiplyScalar(.93 + .14 * h2(i, 7));
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const sol = new T.Mesh(g, new T.MeshLambertMaterial({ vertexColors: true })); sol.receiveShadow = true; scene.add(sol);
  // Montagnes du fond et le promontoire au bord de la mer
  const mroc = mat(0x8b806c);
  for (let i = 0; i < 26; i++) {
    const a = -PI * .05 + i / 25 * PI * 1.1, rr = 300 + R() * 70, hh = 60 + R() * 80;
    const m = new T.Mesh(GEO.roche, mroc); m.scale.set(80 + R() * 60, hh, 80 + R() * 60); m.rotation.y = R() * 3; m.position.set(Math.cos(a) * rr, -hh * .25, Math.sin(a) * rr); scene.add(m);
  }
  const prom = new T.Mesh(GEO.roche, mroc); prom.scale.set(85, 70, 60); prom.position.set(210, -10, -235); scene.add(prom);
})();

function ruban(pts, larg, couleur) {
  const P = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 2); for (let k = 0; k < n; k++) P.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]); }
  P.push(pts[pts.length - 1]);
  const v = [];
  const bords = P.map((p, i) => { const a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, P.length - 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; const nx = -dz * larg / 2, nz = dx * larg / 2; return [[p[0] + nx, p[1] + nz], [p[0] - nx, p[1] - nz]]; });
  const s = ([x, z]) => [x, H(x, z) + .08, z];
  for (let i = 0; i < bords.length - 1; i++) { const A0 = s(bords[i][0]), B0 = s(bords[i][1]), A1 = s(bords[i + 1][0]), B1 = s(bords[i + 1][1]); v.push(...A0, ...A1, ...B0, ...B0, ...A1, ...B1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: couleur, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.receiveShadow = true; scene.add(m);
}
ruban(ROUTES[0], 4.6, 0xb49e76); ruban(ROUTES[1], 4, 0xad966e); ruban(ROUTES[2], 3, 0xa58d66);

/* ---------- Obstacles ---------- */
const CERCLES = [], BOITES = [];
function obstacleBoite(x, z, w, d, rot = 0, haut = 6) { BOITES.push({ x, z, hw: w / 2, hd: d / 2, c: Math.cos(rot), s: Math.sin(rot), haut, y0: H(x, z) }); }
function resoudre(p, r, avecPnj) {
  let choc = false;
  for (const c of CERCLES) { const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k; choc = true; } }
  if (avecPnj) for (const n of Object.values(PNJ)) { if (!n.h.g.visible || n === avecPnj) continue; const dx = p.x - n.pos.x, dz = p.z - n.pos.z, rr = r + .35, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k; choc = true; } }
  for (const b of BOITES) {
    const dx = p.x - b.x, dz = p.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    if (Math.abs(lx) > b.hw + r || Math.abs(lz) > b.hd + r) continue;
    const qx = clamp(lx, -b.hw, b.hw), qz = clamp(lz, -b.hd, b.hd); let ex = lx - qx, ez = lz - qz; const d2 = ex * ex + ez * ez;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; ex *= k; ez *= k; }
    else { const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz); if (px < pz) { ex = (px + r) * Math.sign(lx || 1); ez = 0; } else { ez = (pz + r) * Math.sign(lz || 1); ex = 0; } }
    p.x += ex * b.c + ez * b.s; p.z += -ex * b.s + ez * b.c; choc = true;
  }
  const rr = Math.hypot(p.x, p.z); if (rr > 235) { p.x *= 235 / rr; p.z *= 235 / rr; choc = true; }
  if (p.z < -128) { p.z = -128; choc = true; }
  return choc;
}
function dansBatiment(x, z, y) { for (const b of BOITES) { if (b.haut < 2.2) continue; const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd && y < b.haut + b.y0) return true; } return false; }

/* ---------- Bâtiments ---------- */
const ENDUITS = [0xd9c4a0, 0xcfa97a, 0xe0cfb0, 0xc98f6a, 0xd8b48a, 0xc7ab8c, 0xe3c58f];
const VOLETS = [0x4f6b4a, 0x6b4a2e, 0x3f5a6b, 0x7a3b2a];
const matFenetre = new T.MeshLambertMaterial({ color: 0x2a2420, emissive: 0xffb455, emissiveIntensity: 0 });
const matFenetreNoire = mat(0x221d18);
const tuiles = mat(0xa3553a, { side: T.DoubleSide }), tuilesSombres = mat(0x8c4630, { side: T.DoubleSide });
function facade(g, w, h, z, sens, volet, porte) {
  const n = Math.max(1, Math.floor(w / 2.8));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + (i + .5) * w / n;
    for (let et = 0; et < Math.floor(h / 3); et++) {
      const y = 1.7 + et * 3; if (y + 1 > h) break;
      if (porte && et === 0 && Math.abs(x) < 1.4) continue;
      boite(g, R() < .4 ? matFenetre : matFenetreNoire, .8, 1.15, .1, x, y, z + sens * .02, false);
      boite(g, volet, .38, 1.2, .06, x - .62, y, z + sens * .05, false); boite(g, volet, .38, 1.2, .06, x + .62, y, z + sens * .05, false);
    }
  }
}
function maison(x, z, w, d, h, rot = 0, o = {}) {
  const g = new T.Group(); g.position.set(x, H(x, z), z); g.rotation.y = rot;
  const m = mat(o.couleur ?? ENDUITS[(R() * ENDUITS.length) | 0]);
  boite(g, m, w, h + 2, d, 0, h / 2 - 1, 0);
  const volet = mat(VOLETS[(R() * VOLETS.length) | 0]);
  facade(g, w, h, d / 2, 1, volet, !o.sansPorte); facade(g, w, h, -d / 2, -1, volet, false);
  if (!o.sansPorte) boite(g, mat(0x4a3322), 1.2, 2.2, .12, o.porteX ?? 0, 1.1, d / 2 + .03, false);
  if (o.plat) { boite(g, m, w + .2, .5, d + .2, 0, h + .25, 0); boite(g, mat(0xb9a07c), w - .6, .1, d - .6, 0, h + .05, 0, false); }
  else { const t = new T.Mesh(GEO.toit, R() < .5 ? tuiles : tuilesSombres); t.scale.set(w + .7, Math.min(w, d) * .32, d + .8); t.position.y = h; t.castShadow = true; g.add(t); }
  scene.add(g); obstacleBoite(x, z, w, d, rot, h + 1); return g;
}
function muret(ax, az, bx, bz, hh = 1.15, ep = .65, m = mat(0xa89a80)) {
  const L0 = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L0 / 6)), ux = (bx - ax) / L0, uz = (bz - az) / L0, rot = Math.atan2(-uz, ux);
  for (let i = 0; i < n; i++) {
    const cx = ax + ux * L0 * (i + .5) / n, cz = az + uz * L0 * (i + .5) / n, l = L0 / n + .05;
    const b = new T.Mesh(GEO.boite, m); b.scale.set(l, hh + 1.5, ep); b.position.set(cx, H(cx, cz) + hh / 2 - .75, cz); b.rotation.y = rot; b.castShadow = b.receiveShadow = true; scene.add(b);
    obstacleBoite(cx, cz, l, ep, rot, hh);
  }
}

/* Le baglio Sant'Anna : cour carrée fermée de murs, porte à l'ouest. */
(() => {
  const { x, z } = L.baglio, d = 13, mur = mat(0xd6bf94), hm = 4;
  muret(x - d, z - d, x + d, z - d, hm, .9, mur); muret(x + d, z - d, x + d, z + d, hm, .9, mur); muret(x - d, z + d, x + d, z + d, hm, .9, mur);
  muret(x - d, z - d, x - d, z - 3.6, hm, .9, mur); muret(x - d, z + 3.6, x - d, z + d, hm, .9, mur);
  const y0 = H(x - d, z);
  const arc = new T.Group(); arc.position.set(x - d, y0, z); scene.add(arc);
  boite(arc, mur, 1.4, 6, 1.4, 0, 2.5, -3.9); boite(arc, mur, 1.4, 6, 1.4, 0, 2.5, 3.9); boite(arc, mur, 1.6, 1.4, 9.2, 0, 5.4, 0);
  boite(arc, mat(0xa3553a), 1.8, .3, 9.6, 0, 6.2, 0);
  CERCLES.push({ x: x - d, z: z - 3.9, r: 1 }, { x: x - d, z: z + 3.9, r: 1 });
  maison(x, z - 8.5, 22, 7, 7, 0, { couleur: 0xe1caa0 });
  maison(x + 8.5, z + 4, 6, 12, 4.5, 0, { couleur: 0xcdb284, plat: true, sansPorte: true });
  const cour = new T.Mesh(GEO.boite, mat(0xaa9572)); cour.scale.set(25, .3, 25); cour.position.set(x, H(x, z) - .05, z); cour.receiveShadow = true; scene.add(cour);
  const puits = new T.Group(); puits.position.set(x - 3, H(x - 3, z + 6), z + 6); scene.add(puits);
  const pm = new T.Mesh(GEO.cyl, mat(0xb8a585)); pm.scale.set(2, 1, 2); pm.position.y = .5; pm.castShadow = true; puits.add(pm);
  boite(puits, mat(0x5a3d26), .15, 2.2, .15, -.9, 1.6, 0); boite(puits, mat(0x5a3d26), .15, 2.2, .15, .9, 1.6, 0); boite(puits, mat(0x5a3d26), 2, .15, .15, 0, 2.7, 0);
  CERCLES.push({ x: x - 3, z: z + 6, r: 1.1 });
  for (let i = 0; i < 9; i++) { const cx = x - 9 + (i % 3) * .62, cz = z - 3.5 + Math.floor(i / 3) * .5; const c = boite(scene, mat(0x8a6236), .55, .38, .42, cx, H(cx, cz) + .2 + (i > 5 ? .38 : 0), cz); c.rotation.y = R() * .2; }
  CERCLES.push({ x: x - 8.4, z: z - 3, r: 1.2 });
})();

/* Santa Lucia : place, église aux coupoles rouges, caserne, maisons. */
(() => {
  const V = L.village, y = H(V.x, V.z);
  const place = new T.Mesh(GEO.boite, mat(0xc2b08f)); place.scale.set(36, .4, 28); place.material = mat(0xab9a7c); place.position.set(V.x, y - .1, V.z); place.receiveShadow = true; scene.add(place);
  // Fontaine
  const f = new T.Group(); f.position.set(V.x, y, V.z - 2); scene.add(f);
  const bassin = new T.Mesh(new T.CylinderGeometry(2.6, 2.8, .8, 8), mat(0xc9b896)); bassin.position.y = .4; bassin.castShadow = true; f.add(bassin);
  const eau = new T.Mesh(new T.CylinderGeometry(2.3, 2.3, .1, 8), new T.MeshPhongMaterial({ color: 0x5e8a92, shininess: 80 })); eau.position.y = .72; f.add(eau);
  boite(f, mat(0xbfae8c), .5, 2.6, .5, 0, 1.6, 0); const vasque = new T.Mesh(new T.CylinderGeometry(.9, .4, .4, 8), mat(0xc9b896)); vasque.position.y = 2.9; f.add(vasque);
  CERCLES.push({ x: V.x, z: V.z - 2, r: 2.9 });
  // Église
  const eg = new T.Group(); eg.position.set(V.x, y, V.z - 24); scene.add(eg);
  const pierre = mat(0xd8c49a);
  boite(eg, pierre, 13, 13, 18, 0, 5.5, 0); boite(eg, pierre, 15, 15, 1.2, 0, 6.5, 9.2);
  const fronton = new T.Mesh(GEO.toit, pierre); fronton.scale.set(15, 3.5, 1.2); fronton.position.set(0, 14, 9.2); eg.add(fronton);
  boite(eg, mat(0x3e2a1c), 2.6, 4.6, .2, 0, 2.3, 9.9, false); boite(eg, matFenetreNoire, 1.6, 1.6, .2, 0, 9.5, 9.9, false);
  for (const [dx, dz, r] of [[0, -2, 3.2], [-3.6, 3.5, 2], [3.6, 3.5, 2]]) { const dm = new T.Mesh(GEO.dome, mat(0xb2432e)); dm.scale.set(r, r * .95, r); dm.position.set(dx, 12, dz); dm.castShadow = true; eg.add(dm); boite(eg, pierre, r * 2.1, 1, r * 2.1, dx, 11.6, dz); }
  const cl = new T.Group(); cl.position.set(V.x + 10, H(V.x + 10, V.z - 19), V.z - 19); scene.add(cl);
  boite(cl, pierre, 4.2, 20, 4.2, 0, 9, 0); boite(cl, matFenetreNoire, 1.4, 2.4, 4.4, 0, 15.5, 0, false); boite(cl, matFenetreNoire, 4.4, 2.4, 1.4, 0, 15.5, 0, false);
  const fl = new T.Mesh(GEO.cone, mat(0xa3553a)); fl.scale.set(6, 4, 6); fl.position.y = 21; fl.rotation.y = PI / 4; cl.add(fl);
  obstacleBoite(V.x, V.z - 24, 15, 20, 0, 13); obstacleBoite(V.x + 10, V.z - 19, 4.2, 4.2, 0, 19);
  // Caserne des carabiniers (porte à l'est, sur la place) avec le drapeau tricolore
  const cs = maison(L.caserne.x, L.caserne.z, 11, 16, 8, 0, { couleur: 0xd2b58a, sansPorte: true });
  boite(cs, mat(0x3a2a1c), .15, 2.4, 1.5, 5.55, 1.2, 0, false);
  boite(cs, mat(0x203047), .1, .5, 3.5, 5.6, 4.6, 0, false);
  const mat_ = mat(0x5a4a3a); boite(cs, mat_, .12, 4, .12, 6.2, 8.5, 2.5);
  const drap = new T.Group(); drap.position.set(6.2, 9.6, 2.5); cs.add(drap);
  boite(drap, mat(0x2f7a3e), .05, 1.2, .6, 0, 0, -.3, false); boite(drap, mat(0xeee8d8), .05, 1.2, .6, 0, 0, -.9, false); boite(drap, mat(0xb03a2e), .05, 1.2, .6, 0, 0, -1.5, false);
  // Maisons autour de la place
  const M = [
    [-94, -50, 9, 9, 7], [-84, -50, 8, 9, 8.5], [-72, -50, 9, 9, 7], [-63, -50, 7, 8, 6],
    [-56, -80, 9, 10, 7, PI / 2], [-55, -53, 8, 8, 6, PI / 2], [-104, -50, 8, 10, 6, -PI / 2], [-106, -90, 9, 10, 7, -PI / 2],
    [-96, -92, 8, 10, 8, PI], [-60, -96, 9, 10, 7, PI], [-88, -38, 9, 8, 6, PI], [-74, -38, 8, 8, 6, PI], [-116, -62, 8, 10, 6, -PI / 2],
    [-44, -42, 7, 8, 5.5, -PI / 3, { plat: true }], [-30, -54, 8, 7, 5.5, .2], [-116, -78, 8, 9, 6, -PI / 2], [-56, -108, 8, 8, 6, PI],
    [-100, -108, 8, 8, 6.5, PI], [-84, -110, 9, 8, 6, PI, { plat: true }], [-122, -48, 7, 8, 5, -PI / 2]
  ];
  for (const [x, z, w, d, h, r = 0, o = {}] of M) maison(x, z, w, d, h, r, o);
  // Étals du marché
  for (const [x, z, c] of [[-75, -61, 0xb84a2e], [-84, -60, 0x3f6a8a], [-91, -64, 0xc49a2e]]) {
    const e = new T.Group(); e.position.set(x, H(x, z), z); scene.add(e);
    boite(e, mat(0x7a5434), 3.2, .9, 1.4, 0, .45, 0);
    for (const sx of [-1.5, 1.5]) for (const sz of [-.6, .6]) boite(e, mat(0x5a3d26), .1, 2.6, .1, sx, 1.3, sz);
    const tente = new T.Mesh(GEO.toit, mat(c, { side: T.DoubleSide })); tente.scale.set(3.6, .6, 2); tente.position.y = 2.5; tente.castShadow = true; e.add(tente);
    for (let i = 0; i < 4; i++) boite(e, mat([0xe2bd45, 0xd9822b, 0x7c8a3a, 0xe2bd45][i]), .6, .2, .5, -1.1 + i * .72, 1, 0, false);
    obstacleBoite(x, z, 3.2, 1.4, 0, 1);
  }
})();

/* La masseria de Don Gaspare, sur la colline. */
(() => {
  const { x, z } = L.masseria, mur = mat(0xc8ad84);
  maison(x, z, 16, 10, 8, 0, { couleur: 0xc8ad84 });
  maison(x + 10.5, z - 2, 5, 5, 13, 0, { couleur: 0xbfa27a, plat: true, sansPorte: true });
  muret(x - 14, z + 8, x - 7, z + 8, 2.6, .8, mur); muret(x - 1, z + 8, x + 14, z + 8, 2.6, .8, mur); muret(x - 14, z + 8, x - 14, z - 12, 2.6, .8, mur); muret(x + 14, z - 12, x + 14, z + 8, 2.6, .8, mur);
})();

/* ---------- Végétation (instances) ---------- */
function instances(geo, m, liste, ombre = true) {
  const im = new T.InstancedMesh(geo, m, liste.length), o = new T.Object3D();
  liste.forEach((e, i) => { o.position.set(e.x, e.y, e.z); o.rotation.set(e.rx || 0, e.ry || 0, 0); o.scale.set(e.sx, e.sy, e.sz); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = ombre; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; scene.add(im); return im;
}
const CITRONNIERS = [];
const libre = (x, z, m = 0) => {
  if (distRoute(x, z) < 4 + m) return false;
  if (Math.hypot(x - L.village.x, z - L.village.z) < 52 + m) return false;
  if (Math.abs(x - L.baglio.x) < 17 + m && Math.abs(z - L.baglio.z) < 17 + m) return false;
  if (Math.hypot(x - L.masseria.x, z - L.masseria.z) < 22 + m) return false;
  if (dansJardin(x, z, 3 + m)) return false;
  return H(x, z) > 2.2 && Math.hypot(x, z) < 225;
};
(() => {
  for (let x = 34; x <= 125; x += 7) for (let z = 76; z <= 139; z += 7) CITRONNIERS.push({ x: x + (h2(x, z) - .5) * .6, z: z + (h2(z, x) - .5) * .6, s: .9 + h2(x * 3, z) * .3 });
  const tr = [], co = [], fr = [];
  for (const t of CITRONNIERS) {
    const y = H(t.x, t.z);
    tr.push({ x: t.x, y: y + .8, z: t.z, sx: t.s, sy: 1.6, sz: t.s });
    co.push({ x: t.x, y: y + 2.5 * t.s, z: t.z, sx: 1.55 * t.s, sy: 1.25 * t.s, sz: 1.55 * t.s, ry: h2(t.x, 9) * 3 });
    for (let k = 0; k < 8; k++) { const a = h2(t.x * 7 + k, t.z) * PI * 2, b = h2(t.z * 5 + k, t.x) * 1.1 - .35; fr.push({ x: t.x + Math.cos(a) * Math.cos(b) * 1.5 * t.s, y: y + 2.5 * t.s + Math.sin(b) * 1.2 * t.s, z: t.z + Math.sin(a) * Math.cos(b) * 1.5 * t.s, sx: 1, sy: 1.2, sz: 1 }); }
    CERCLES.push({ x: t.x, z: t.z, r: .95 });
  }
  instances(GEO.tronc, mat(0x5c4430), tr); instances(GEO.couronne, mat(0x3d5a28), co); instances(GEO.fruit, mat(0xe8c43c, { emissive: 0x2a2000 }), fr, false);
  // Murets du jardin (passages : chemin au nord-ouest, brèche au nord et au sud)
  const { x0, x1, z0, z1 } = JARDIN;
  muret(x0, z0, 41, z0); muret(49, z0, 61, z0); muret(70, z0, x1, z0);
  muret(x0, z1, 104, z1); muret(111, z1, x1, z1);
  muret(x0, z0, x0, z1); muret(x1, z0, x1, z1);
  // Oliviers, cyprès, figuiers de Barbarie, rochers
  const ol = [], olc = [], cy = [], fi = [], ro = [];
  let n = 0;
  while (ol.length < 170 && n++ < 6000) { const x = (R() - .5) * 440, z = (R() - .5) * 400 - 10; if (!libre(x, z)) continue; const s = .8 + R() * .5, y = H(x, z); ol.push({ x, y: y + .9 * s, z, sx: 1.4 * s, sy: 1.8 * s, sz: 1.4 * s, rx: (R() - .5) * .3 }); olc.push({ x: x + .3, y: y + 2.6 * s, z, sx: 2 * s, sy: 1.3 * s, sz: 1.8 * s, ry: R() * 3 }); CERCLES.push({ x, z, r: .6 }); }
  for (const [x, z] of [[-60, -96], [-100, -96], [-66, -100], [-102, -100], [112, -30], [140, -30], [140, -58], [98, 26], [86, 30], [92, 30], [22, 62], [22, 70]]) { const y = H(x, z), s = .8 + R() * .4; cy.push({ x, y: y + 3.5 * s, z, sx: 1.1 * s, sy: 7 * s, sz: 1.1 * s }); CERCLES.push({ x, z, r: .7 }); }
  n = 0;
  while (fi.length < 600 && n++ < 6000) {
    let x, z; if (R() < .55) { const r = ROUTES[(R() * 2) | 0], i = (R() * (r.length - 1)) | 0, t = R(), sd = R() < .5 ? -1 : 1; x = lerp(r[i][0], r[i + 1][0], t) + sd * (4 + R() * 3); z = lerp(r[i][1], r[i + 1][1], t) + (R() - .5) * 4; } else { x = (R() - .5) * 400; z = (R() - .5) * 380; }
    if (!libre(x, z, -2.5) || distRoute(x, z) < 3.5) continue;
    const y = H(x, z); for (let k = 0; k < 6; k++) fi.push({ x: x + (R() - .5) * 1.2, y: y + .4 + k * .25, z: z + (R() - .5) * 1.2, sx: .9, sy: .7, sz: .25, ry: R() * 3, rx: (R() - .5) * .6 });
    CERCLES.push({ x, z, r: .9 });
  }
  n = 0;
  while (ro.length < 90 && n++ < 3000) { const x = (R() - .5) * 460, z = (R() - .5) * 420; if (!libre(x, z, -2)) continue; const s = .4 + R() * 1.2; ro.push({ x, y: H(x, z) + s * .3, z, sx: s, sy: s * .7, sz: s * 1.1, ry: R() * 3 }); if (s > .8) CERCLES.push({ x, z, r: s * .9 }); }
  instances(GEO.tronc, mat(0x6e5d48), ol); instances(GEO.couronne, mat(0x7d8a5e), olc); instances(GEO.cypres, mat(0x2e4128), cy);
  instances(GEO.raquette, mat(0x6d8b4a), fi); instances(GEO.roche, mat(0x9d907a), ro);
})();

/* ---------- Lanternes ---------- */
const LAMPES = [];
function lampe(x, y, z, parent) { const l = new T.PointLight(0xffb057, 0, 17, 1.6); l.position.set(x, y, z); (parent || scene).add(l); LAMPES.push(l); return l; }
const lampesFixes = [lampe(56.2, H(57, 46) + 4.2, 46.1), lampe(L.village.x + 3, H(L.village.x, L.village.z) + 4, L.village.z + 2), lampe(L.porteCaserne.x + .6, H(-98, -70) + 3.2, L.porteCaserne.z + 1.8)];
boite(scene, mat(0x2a241e), .14, 4.2, .14, lampesFixes[1].position.x, lampesFixes[1].position.y - 2.2, lampesFixes[1].position.z);
for (const l of lampesFixes) { const b = boite(scene, new T.MeshBasicMaterial({ color: 0xffd28a }), .25, .35, .25, l.position.x, l.position.y, l.position.z, false); b.userData.lanterne = true; }

/* ---------- Personnages ---------- */
function humain(o = {}) {
  const g = new T.Group(), corps = new T.Group(); g.add(corps);
  const peau = mat(o.peau ?? 0xc08a5e), chem = mat(o.chemise ?? 0xe8e0cc), pant = mat(o.pantalon ?? 0x4a3f33), chaus = mat(0x2a211a), chev = mat(o.cheveux ?? 0x1e1712);
  const jambe = sx => { const p = new T.Group(); p.position.set(sx * .12, .95, 0); corps.add(p); boite(p, pant, .17, .9, .18, 0, -.45, 0); boite(p, chaus, .19, .1, .28, 0, -.9, .04); return p; };
  const jg = jambe(-1), jd = jambe(1);
  if (o.robe != null) { const j = new T.Mesh(GEO.jupe, mat(o.robe)); j.position.y = .52; j.castShadow = true; corps.add(j); jg.children[0].visible = jd.children[0].visible = false; }
  else boite(corps, mat(0x2a2018), .51, .07, .29, 0, 1.02, 0);
  const torse = boite(corps, chem, .5, .62, .28, 0, 1.31, 0);
  if (o.gilet != null) boite(corps, mat(o.gilet), .52, .5, .3, 0, 1.37, 0);
  if (o.veste != null) { boite(corps, mat(o.veste), .54, .66, .31, 0, 1.3, 0); }
  if (o.tablier) boite(corps, mat(0xe9e4d6), .44, .62, .02, 0, 1.02, .16);
  if (o.ceinture) boite(corps, mat(o.ceinture), .53, .1, .31, 0, 1.04, 0);
  boite(corps, peau, .12, .08, .12, 0, 1.66, 0);
  const tete = new T.Group(); tete.position.set(0, 1.83, 0); corps.add(tete);
  boite(tete, peau, .26, .3, .27, 0, 0, 0);
  const oeil = mat(0x1a1410); boite(tete, oeil, .04, .035, .02, -.06, .03, .137, false); boite(tete, oeil, .04, .035, .02, .06, .03, .137, false);
  if (o.moustache) boite(tete, mat(o.moustache === true ? o.cheveux ?? 0x1e1712 : o.moustache), .15, .04, .03, 0, -.065, .14, false);
  if (o.barbe) boite(tete, mat(o.barbe), .27, .12, .1, 0, -.12, .1, false);
  if (!o.chauve) boite(tete, chev, .27, .08, .28, 0, .13, -.01, false);
  const ch = o.chapeau, cc = mat(o.chapeauC ?? 0x3b3530);
  if (ch === 'coppola') { boite(tete, cc, .3, .08, .31, 0, .18, -.005); const v = boite(tete, cc, .25, .03, .13, 0, .15, .18); v.rotation.x = .18; }
  else if (ch === 'paille' || ch === 'feutre' || ch === 'pretre') {
    const bord = new T.Mesh(GEO.cyl, cc); bord.scale.set(ch === 'feutre' ? .44 : ch === 'pretre' ? .62 : .66, .03, ch === 'feutre' ? .44 : ch === 'pretre' ? .62 : .66); bord.position.y = .16; tete.add(bord);
    const haut = ch === 'pretre' ? new T.Mesh(GEO.dome, cc) : new T.Mesh(GEO.cyl, cc);
    if (ch === 'pretre') { haut.scale.set(.15, .12, .15); haut.position.y = .17; } else { haut.scale.set(.29, .16, .29); haut.position.y = .25; }
    tete.add(haut);
  }
  else if (ch === 'lucerna') { boite(tete, mat(0x15161c), .52, .19, .13, 0, .24, 0); boite(tete, mat(0xb03a2e), .06, .08, .14, .2, .3, 0, false); boite(tete, mat(0xd8c070), .08, .08, .14, 0, .25, .01, false); }
  else if (ch === 'scialle') { boite(tete, mat(o.chapeauC ?? 0x161414), .31, .36, .31, 0, .03, -.02); boite(corps, mat(o.chapeauC ?? 0x161414), .58, .3, .33, 0, 1.52, 0); }
  const bras = sx => { const p = new T.Group(); p.position.set(sx * .32, 1.58, 0); corps.add(p); boite(p, mat(o.veste ?? o.chemise ?? 0xe8e0cc), .13, .58, .14, 0, -.29, 0); boite(p, peau, .11, .12, .12, 0, -.63, 0); return p; };
  const bg = bras(-1), bd = bras(1);
  if (o.lupara) { const f = boite(corps, mat(0x3b2a1c), .06, .06, 1.0, 0, 1.35, -.2); f.rotation.set(PI / 2, 0, .7); }
  let lanterne = null;
  if (o.lanterne) { lanterne = boite(bd, new T.MeshBasicMaterial({ color: 0xffcf80 }), .14, .2, .14, 0, -.78, .05, false); }
  if (o.cassette) boite(bg, mat(0x5a3a22), .3, .18, .22, 0, -.7, .12);
  const s = o.taille ?? 1; g.scale.setScalar(.95 * s);
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, corps, tete, torse, jg, jd, bg, bd, ph: R() * 6, amp: 0, lanterne, porte: !!o.lanterne, assis: false };
}
function animer(h, dt, v) {
  if (h.assis) { h.jg.rotation.x = h.jd.rotation.x = -1.45; h.bg.rotation.x = h.bd.rotation.x = -.75; h.corps.position.y = 0; return; }
  const k = clamp(v / 5, 0, 1.5);
  h.ph += dt * (4.5 + v * 1.7);
  h.amp = lerp(h.amp, v > .15 ? clamp(.32 + k * .5, 0, .95) : 0, 1 - Math.exp(-dt * 10));
  const a = Math.sin(h.ph) * h.amp;
  h.jg.rotation.x = a; h.jd.rotation.x = -a; h.bg.rotation.x = -a * .9; h.bd.rotation.x = h.porte ? -.5 : a * .9;
  h.corps.position.y = Math.abs(Math.sin(h.ph)) * .06 * k;
  h.corps.rotation.x = .05 * k + (k > 1.2 ? .08 : 0);
  h.torse.scale.y = .62 * (1 + Math.sin(h.ph * .3) * .015 * (1 - h.amp));
}

const PNJ = {};
function pnj(id, nom, o, x, z, rot = 0, quand = 'jour') {
  const h = humain(o); h.g.position.set(x, H(x, z), z); h.g.rotation.y = rot; scene.add(h.g);
  return (PNJ[id] = { id, nom, h, pos: h.g.position, quand, v: 0, base: { x, z, rot }, trajet: null, ti: 0, attente: 0, repliques: null });
}
const TURI = { chemise: 0xe9e1cc, gilet: 0x4a3626, pantalon: 0x3a3029, chapeau: 'coppola', chapeauC: 0x5a5044, cheveux: 0x22180f };
pnj('pippo', 'Zu Pippo', { chemise: 0xe0d6bf, pantalon: 0x5a4a38, chapeau: 'paille', chapeauC: 0xcdb27a, moustache: 0xb9b2a4, cheveux: 0xb9b2a4, peau: 0xb07a50, ceinture: 0x7a2a22 }, 63, 56, -PI / 2);
pnj('rosa', 'Donna Rosa', { robe: 0x1a1717, chemise: 0x1f1b1b, chapeau: 'scialle', peau: 0xd2a07a }, 72, 45.5, 0, 'toujours');
pnj('nunzio', 'Mastro Nunzio', { chemise: 0xe8e0cc, gilet: 0x3b4a5a, tablier: true, chauve: true, moustache: 0x2a2018, pantalon: 0x4a3f33, taille: 1.04 }, -75, -59.4, PI);
pnj('pretre', 'Padre Calogero', { robe: 0x121212, chemise: 0x121212, chapeau: 'pretre', chapeauC: 0x121212, peau: 0xc89a72 }, -80, -82, 0);
pnj('toto', 'Le voleur', { chemise: 0xb8a77f, pantalon: 0x5e5040, taille: .8, cheveux: 0x2a1d12, cassette: true }, 66, 69, PI, 'scene');
pnj('nardo', 'Nardo', { veste: 0x3f4a33, chemise: 0xd9cfb8, pantalon: 0x2e2a24, chapeau: 'coppola', chapeauC: 0x2a2620, moustache: true, lupara: true, lanterne: true }, 50, 49, PI / 2, 'scene');
pnj('campiere1', 'Un campiere', { veste: 0x4a3a2a, pantalon: 0x2e2a24, chapeau: 'coppola', chapeauC: 0x33302a, lupara: true }, 49, 46, PI / 2, 'scene');
pnj('campiere2', 'Un campiere', { veste: 0x3a3a30, pantalon: 0x2e2a24, chapeau: 'feutre', chapeauC: 0x2a2620, lupara: true, barbe: 0x1e1712 }, 49.5, 53, PI / 2, 'scene');
pnj('ruffo', 'Le brigadier Ruffo', { veste: 0x1d2433, chemise: 0x1d2433, pantalon: 0x1d2433, chapeau: 'lucerna', moustache: 0x5a3a20, cheveux: 0x5a3a20, peau: 0xd9ad88, ceinture: 0xe8e2d0 }, -97, -70, PI / 2, 'scene');
pnj('gardien1', 'Un campiere', { veste: 0x3f3a2a, pantalon: 0x2e2a24, chapeau: 'coppola', lupara: true }, 122, -34, 0);
pnj('gardien2', 'Un campiere', { veste: 0x2f3a33, pantalon: 0x2e2a24, chapeau: 'feutre', lupara: true }, 128, -34, 0);
// Gens du jardin et du village (quelques mots si on leur parle)
const DIRES = [
  'Garibaldi est passé, les impôts sont restés.',
  'Les Piémontais veulent nos fils pour leur armée. Mon neveu s’est caché dans la montagne.',
  'Santa Rosalia, protège-nous de la sécheresse…',
  'Ne traîne pas sur la route de la masseria, garçon.',
  'Le citron part pour l’Amérique, maintenant. Des bateaux entiers, depuis le port de Palerme.',
  'À Palerme ils disent que le roi est à Turin. Turin, c’est où ?',
  'L’eau, c’est Don Gaspare qui décide quand elle coule. Tout le monde le sait.',
  'Mon père dit qu’avant, il n’y avait pas de « gardiens ». Seulement des voleurs.'
];
const HABITS = [{ chemise: 0xe2d8c0, gilet: 0x5a3a2a, chapeau: 'coppola' }, { chemise: 0xd8c8a8, chapeau: 'paille', chapeauC: 0xc8ab70 }, { robe: 0x4a3a52, chapeau: 'scialle', chapeauC: 0x2a2424 }, { robe: 0x6a3a2a, chemise: 0xe6dcc4, cheveux: 0x2a1a10 }, { chemise: 0xcfc3a5, veste: 0x544a3a, chapeau: 'feutre' }, { chemise: 0xe8e0cc, gilet: 0x2e3a4a, chapeau: 'coppola', moustache: true }];
const FIGURANTS = [
  [-86, -64, [[-86, -64], [-70, -66], [-72, -76], [-90, -76]]], [-92, -70, null], [-68, -72, [[-68, -72], [-66, -58], [-94, -58]]], [-78, -78, null],
  [-62, -66, [[-62, -66], [-40, -40], [-20, -12]]], [-95, -66, null], [44.5, 86.5, null], [58.5, 107.5, null], [93.5, 121.5, [[93.5, 121.5], [93.5, 93.5], [100.5, 93.5]]], [-84, -58, null]
];
FIGURANTS.forEach(([x, z, trajet], i) => { const p = pnj('fig' + i, 'Un habitant', Object.assign({ peau: [0xc08a5e, 0xb07a50, 0xd2a07a][i % 3] }, HABITS[i % HABITS.length]), x, z, R() * 6); p.trajet = trajet; p.repliques = [DIRES[i % DIRES.length]]; p.figurant = true; });

/* ---------- Le carretto ---------- */
function carretto() {
  const g = new T.Group(), jaune = mat(0xd9a63a), rouge = mat(0xa2362a), bleu = mat(0x2f5a8a), bois = mat(0x6b4a2e);
  boite(g, jaune, 1.5, .12, 2.1, 0, 1.05, 0);
  for (const sx of [-1, 1]) { boite(g, rouge, .08, .55, 2.1, sx * .76, 1.38, 0); for (let i = 0; i < 3; i++) boite(g, i === 1 ? bleu : jaune, .02, .36, .56, sx * .81, 1.38, -.68 + i * .68, false); }
  boite(g, rouge, 1.5, .45, .08, 0, 1.33, -1.05); boite(g, rouge, 1.5, .25, .08, 0, 1.23, 1.05);
  boite(g, bois, .5, .1, .4, 0, 1.45, .75);
  const roues = [];
  for (const sx of [-1, 1]) {
    const r = new T.Group(); r.position.set(sx * .9, .75, .1); g.add(r);
    const jante = new T.Mesh(GEO.roue, jaune); jante.rotation.z = PI / 2; jante.castShadow = true; r.add(jante);
    for (let i = 0; i < 6; i++) { const rai = boite(r, rouge, .1, 1.35, .07, sx * .02, 0, 0, false); rai.rotation.x = i * PI / 6; }
    roues.push(r);
  }
  boite(g, bois, .1, .1, 3.0, -.45, .98, 2.4); boite(g, bois, .1, .1, 3.0, .45, .98, 2.4);
  // La mule
  const mule = new T.Group(); mule.position.set(0, 0, 3.2); g.add(mule);
  const robe = mat(0x6e5c4a), sombre = mat(0x3a2e24);
  boite(mule, robe, .55, .6, 1.35, 0, 1.25, 0);
  const cou = boite(mule, robe, .3, .7, .32, 0, 1.6, .75); cou.rotation.x = .6;
  boite(mule, robe, .26, .3, .6, 0, 1.92, 1.05); boite(mule, sombre, .2, .2, .2, 0, 1.85, 1.38);
  boite(mule, robe, .07, .35, .07, -.1, 2.2, .9); boite(mule, robe, .07, .35, .07, .1, 2.2, .9);
  const plume = new T.Mesh(GEO.cone, mat(0xc0392b)); plume.scale.set(.18, .45, .18); plume.position.set(0, 2.25, .98); mule.add(plume);
  boite(mule, rouge, .58, .12, .5, 0, 1.6, .1);
  const pattes = [];
  for (const [px, pz] of [[-.18, .5], [.18, .5], [-.18, -.5], [.18, -.5]]) { const p = new T.Group(); p.position.set(px, .98, pz); mule.add(p); boite(p, robe, .13, .95, .14, 0, -.48, 0); boite(p, sombre, .15, .1, .16, 0, -.95, 0); pattes.push(p); }
  const queue = boite(mule, sombre, .06, .55, .06, 0, 1.15, -.72); queue.rotation.x = .3;
  // Cagettes de citrons
  const caisses = [];
  for (let i = 0; i < 6; i++) { const c = new T.Group(); c.position.set(-.36 + (i % 2) * .72, 1.32, -.75 + Math.floor(i / 2) * .6 - .1); g.add(c); boite(c, mat(0x8a6236), .6, .36, .5, 0, 0, 0); boite(c, mat(0xe8c43c), .54, .08, .44, 0, .17, 0, false); caisses.push(c); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return { g, roues, pattes, caisses, mule };
}
const CHAR = Object.assign(carretto(), { x: 66, z: 51, yaw: -PI / 2, v: 0, nb: 6, cooldown: 0, pas: 0 });
scene.add(CHAR.g);
function placerCharrette(x, z, yaw, nb = CHAR.nb) { CHAR.x = x; CHAR.z = z; CHAR.yaw = yaw; CHAR.v = 0; CHAR.nb = nb; CHAR.caisses.forEach((c, i) => c.visible = i < nb); poserCharrette(); }
function poserCharrette() {
  const f = { x: Math.sin(CHAR.yaw), z: Math.cos(CHAR.yaw) };
  const hAv = H(CHAR.x + f.x * 1.5, CHAR.z + f.z * 1.5), hAr = H(CHAR.x - f.x * 1.2, CHAR.z - f.z * 1.2);
  CHAR.g.position.set(CHAR.x, Math.max(H(CHAR.x, CHAR.z), (hAv + hAr) / 2), CHAR.z);
  CHAR.g.rotation.set(0, CHAR.yaw, 0); CHAR.g.rotateX(-Math.atan2(hAv - hAr, 2.7));
}

/* ---------- Joueur ---------- */
const J = { x: 48, z: 52, yaw: PI / 2, v: 0, endu: 1, epuise: false, dansChar: false, courir: false, h: humain(TURI) };
scene.add(J.h.g);
function placerJoueur(x, z, yaw) { if (J.dansChar) sortirChar(true); J.x = x; J.z = z; J.yaw = yaw; J.v = 0; J.h.g.position.set(x, H(x, z), z); J.h.g.rotation.y = yaw; CAM.yaw = yaw + PI; CAM.pret = false; }
function monterChar() {
  J.dansChar = true; J.h.assis = true; CHAR.g.add(J.h.g); J.h.g.position.set(0, .6, .7); J.h.g.rotation.set(0, 0, 0); J.h.g.scale.setScalar(.95); CAM.libre = 0; SON.sabot();
}
function sortirChar(force) {
  if (!force && Math.abs(CHAR.v) > 1.5) { toast('Arrête d’abord le carretto.'); return; }
  J.dansChar = false; J.h.assis = false; scene.add(J.h.g); J.h.g.scale.setScalar(.95);
  const c = Math.cos(CHAR.yaw), s = Math.sin(CHAR.yaw); const p = { x: CHAR.x + c * 1.9, z: CHAR.z - s * 1.9 }; resoudre(p, .4);
  J.x = p.x; J.z = p.z; J.yaw = CHAR.yaw; J.v = 0; CHAR.v = 0;
}

/* ---------- Caméra ---------- */
const CAM = { yaw: -PI / 2, pitch: .3, dist: 5.4, libre: 0, secousse: 0, pret: false, pos: new T.Vector3(), cible: new T.Vector3() };
function majCamera(dt) {
  const enChar = J.dansChar;
  const px = enChar ? CHAR.x : J.x, pz = enChar ? CHAR.z : J.z;
  CAM.cible.set(px, (enChar ? CHAR.g.position.y + 2.1 : J.h.g.position.y + 1.6), pz);
  CAM.libre -= dt;
  if (enChar && CAM.libre <= 0 && Math.abs(CHAR.v) > .5) CAM.yaw += ecartAngle(CAM.yaw, CHAR.yaw + PI) * Math.min(1, dt * 2.2);
  const d0 = etat === 'dialogue' ? 3.6 : enChar ? 9.5 : CAM.dist, p = clamp(CAM.pitch, -.25, 1.1);
  let d = d0;
  for (let k = 1; k <= 12; k++) { const t = k / 12 * d0; const x = CAM.cible.x + Math.sin(CAM.yaw) * Math.cos(p) * t, z = CAM.cible.z + Math.cos(CAM.yaw) * Math.cos(p) * t, y = CAM.cible.y + Math.sin(p) * t; if (dansBatiment(x, z, y)) { d = Math.max(1.2, t - .6); break; } }
  const x = CAM.cible.x + Math.sin(CAM.yaw) * Math.cos(p) * d, z = CAM.cible.z + Math.cos(CAM.yaw) * Math.cos(p) * d;
  const y = Math.max(CAM.cible.y + Math.sin(p) * d, H(x, z) + .6);
  const voulu = new T.Vector3(x, y, z);
  if (!CAM.pret) { camera.position.copy(voulu); CAM.pret = true; } else camera.position.lerp(voulu, 1 - Math.exp(-dt * 9));
  if (CAM.secousse > 0) { CAM.secousse -= dt; camera.position.x += (Math.random() - .5) * CAM.secousse; camera.position.y += (Math.random() - .5) * CAM.secousse; }
  camera.lookAt(CAM.cible);
}

/* ---------- Heure du jour ---------- */
const AMBIANCES = [
  { haut: 0x86a9c4, hor: 0xe9d6ae, astre: 0xfff0d4, si: .86, dir: [.5, .7, .4], hs: 0xdfe6ea, hg: 0x7a6448, hi: .5, brume: 0xe0cfa6, bp: 70, bl: 300, mer: 0x4b7f8c, nuit: 0 },
  { haut: 0x56628a, hor: 0xf0a060, astre: 0xffad6a, si: .85, dir: [-.82, .22, .2], hs: 0xd9b8a0, hg: 0x5a4030, hi: .44, brume: 0xd09068, bp: 60, bl: 260, mer: 0x4a5a72, nuit: .15 },
  { haut: 0x0b1424, hor: 0x283550, astre: 0xa9bce6, si: .42, dir: [.35, .7, -.55], hs: 0x6070a0, hg: 0x1c1c18, hi: .5, brume: 0x182134, bp: 24, bl: 150, mer: 0x18243a, nuit: 1 }
];
let HEURE = 0;
const _ca = new T.Color(), _cb = new T.Color(), DIR_ASTRE = new T.Vector3();
function mixC(k, a, b, t) { return _ca.set(a[k]).lerp(_cb.set(b[k]), t).clone(); }
function heure(k) {
  HEURE = clamp(k, 0, 2); const i = Math.min(1, Math.floor(HEURE)), t = HEURE - i, a = AMBIANCES[i], b = AMBIANCES[i + 1];
  ciel.material.uniforms.haut.value.copy(mixC('haut', a, b, t)); ciel.material.uniforms.horizon.value.copy(mixC('hor', a, b, t)); ciel.material.uniforms.astre.value.copy(mixC('astre', a, b, t));
  DIR_ASTRE.set(lerp(a.dir[0], b.dir[0], t), lerp(a.dir[1], b.dir[1], t), lerp(a.dir[2], b.dir[2], t)).normalize();
  ciel.material.uniforms.dir.value.copy(DIR_ASTRE);
  const nuit = lerp(a.nuit, b.nuit, t); ciel.material.uniforms.nuit.value = nuit;
  soleil.color.copy(mixC('astre', a, b, t)); soleil.intensity = lerp(a.si, b.si, t);
  hemi.color.copy(mixC('hs', a, b, t)); hemi.groundColor.copy(mixC('hg', a, b, t)); hemi.intensity = lerp(a.hi, b.hi, t);
  scene.fog.color.copy(mixC('brume', a, b, t)); scene.fog.near = lerp(a.bp, b.bp, t); scene.fog.far = lerp(a.bl, b.bl, t);
  matMer.color.copy(mixC('mer', a, b, t));
  matFenetre.emissiveIntensity = clamp(nuit * 1.3 - .1, 0, 1);
  const l = clamp((nuit - .1) * 1.6, 0, 1); for (const p of LAMPES) p.intensity = l * 1.7;
  SON.nuit(nuit);
}

/* ---------- Interface ---------- */
const UI = { hud: $('#hud'), objTxt: $('#obj-txt'), objChap: $('#obj-chap'), invite: $('#invite'), toast: $('#toast'), aide: $('#aide'), chrono: $('#chrono'), endu: $('#endurance'), soupcon: $('#soupcon'), dlg: $('#dialogue'), carton: $('#carton'), menu: $('#menu'), panneau: $('#panneau'), fondu: $('#fondu') };
let toastT = 0, aideT = 0;
function toast(msg, danger, ms = 2400) { UI.toast.innerHTML = msg; UI.toast.classList.toggle('danger', !!danger); UI.toast.classList.add('vu'); toastT = ms / 1000; }
function aide(msg, ms = 6000) { UI.aide.innerHTML = msg; UI.aide.classList.add('vu'); aideT = ms / 1000; }
const touche = (clavier, doigt) => tactile ? doigt : clavier;
function fondu(fn, attente = 850) { UI.fondu.classList.add('noir'); setTimeout(() => { fn(); setTimeout(() => UI.fondu.classList.remove('noir'), 120); }, attente); }
let etat = 'menu';
const cinema = on => document.body.classList.toggle('cinema', on);

/* Dialogues : lignes [qui, texte] ou { choix: [[libellé, action], …] } */
let DLG = null;
function dire(lignes, fin) { etat = 'dialogue'; cinema(true); UI.hud.hidden = true; UI.dlg.hidden = false; DLG = { lignes, i: -1, fin, tape: 0, txt: '' }; suivant(); }
function suivant() {
  if (!DLG) return;
  if (DLG.tape < DLG.txt.length) { DLG.tape = DLG.txt.length; UI.dlg.querySelector('.dit').innerHTML = DLG.txt; return; }
  if (DLG.choixOuvert) return;
  DLG.i++;
  if (DLG.i >= DLG.lignes.length) { const f = DLG.fin; fermerDialogue(); f && f(); return; }
  const l = DLG.lignes[DLG.i], choix = $('#choix');
  choix.innerHTML = '';
  if (Array.isArray(l)) {
    const [qui, txt] = l; UI.dlg.querySelector('.qui').textContent = qui; DLG.txt = txt; DLG.tape = 0; UI.dlg.querySelector('.dit').innerHTML = '';
    UI.dlg.querySelector('.suite').hidden = false; tournerVers(qui);
  } else {
    if (document.pointerLockElement) document.exitPointerLock();
    DLG.choixOuvert = true; DLG.txt = ''; DLG.tape = 0; UI.dlg.querySelector('.qui').textContent = l.qui || 'Turi'; UI.dlg.querySelector('.dit').innerHTML = l.question || ''; UI.dlg.querySelector('.suite').hidden = true;
    l.choix.forEach(([lib, act], k) => { const b = document.createElement('button'); b.innerHTML = `<span>${k + 1}</span>${lib}`; b.onclick = e => { e.stopPropagation(); SON.note(69 + k * 3, 0, .2); fermerDialogue(); act(); }; choix.appendChild(b); });
    setTimeout(() => choix.querySelector('button') && !tactile && choix.querySelector('button').focus(), 50);
  }
}
function fermerDialogue() { DLG = null; UI.dlg.hidden = true; $('#choix').innerHTML = ''; cinema(false); if (etat === 'dialogue') { etat = 'jeu'; UI.hud.hidden = false; } }
function majDialogue(dt) { if (!DLG || DLG.tape >= DLG.txt.length) return; DLG.tape = Math.min(DLG.txt.length, DLG.tape + dt * 55); let n = Math.floor(DLG.tape); const t = DLG.txt; if (t.lastIndexOf('<', n) > t.lastIndexOf('>', n)) n = t.indexOf('>', n) + 1; UI.dlg.querySelector('.dit').innerHTML = t.slice(0, n); }
function tournerVers(nom) {
  const p = Object.values(PNJ).find(n => n.nom === nom && n.h.g.visible); if (!p) return;
  const jx = J.dansChar ? CHAR.x : J.x, jz = J.dansChar ? CHAR.z : J.z;
  p.regarde = Math.atan2(jx - p.pos.x, jz - p.pos.z);
  if (!J.dansChar) J.yaw = Math.atan2(p.pos.x - J.x, p.pos.z - J.z);
}

function carton(sur, titre, corps, fin, note) {
  etat = 'carton'; UI.hud.hidden = true; UI.carton.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
  UI.carton.querySelector('.surtitre').innerHTML = sur; UI.carton.querySelector('h2').innerHTML = titre; UI.carton.querySelector('.corps').innerHTML = corps + (note ? `<p class="note">${note}</p>` : '');
  const c = UI.carton.querySelector('.continuer'); c.classList.remove('vu');
  UI.carton.pret = false; UI.carton.fin = fin;
  setTimeout(() => { UI.carton.pret = true; c.classList.add('vu'); }, 1400);
}
function fermerCarton() { if (!UI.carton.pret) return; UI.carton.hidden = true; const f = UI.carton.fin; UI.carton.fin = null; etat = 'jeu'; UI.hud.hidden = false; f && f(); }
UI.carton.addEventListener('click', fermerCarton);
UI.dlg.addEventListener('click', () => suivant());

/* ---------- Repère d'objectif ---------- */
const repere = new T.Group(); scene.add(repere);
const rayon = new T.Mesh(new T.CylinderGeometry(.35, .35, 40, 12, 1, true), new T.MeshBasicMaterial({ color: 0xe2bd45, transparent: true, opacity: .16, depthWrite: false, fog: false })); rayon.position.y = 20; repere.add(rayon);
const losange = new T.Mesh(new T.OctahedronGeometry(.45), new T.MeshBasicMaterial({ color: 0xe2bd45 })); losange.scale.y = 1.5; repere.add(losange);

/* ---------- Interactions ---------- */
const INTER = [];
function inter(o) { INTER.push(o); }
let interProche = null;
function chercherInteraction() {
  interProche = null; if (etat !== 'jeu') return;
  const px = J.dansChar ? CHAR.x : J.x, pz = J.dansChar ? CHAR.z : J.z; let best = 1e9;
  for (const it of INTER) { if (!it.si()) continue; const p = it.pos(); const d = Math.hypot(p.x - px, p.z - pz); if (d < it.r && d < best) { best = d; interProche = it; } }
  if (J.dansChar) interProche = { lib: () => 'Descendre', faire: () => sortirChar(), touche: 'F' };
  if (interProche) { UI.invite.hidden = false; UI.invite.innerHTML = tactile ? interProche.lib() : `<kbd>${interProche.touche || 'E'}</kbd>${interProche.lib()}`; } else UI.invite.hidden = true;
}
function agir() {
  if (etat === 'carton') return fermerCarton();
  if (etat === 'dialogue') return suivant();
  if (etat !== 'jeu' || !interProche) return;
  interProche.faire();
}

/* ---------- Son (fabriqué : cordes pincées, cigales, grillons) ---------- */
const SON = {
  ctx: null, actif: SAUVE.son !== false, cache: new Map(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx; this.maitre = c.createGain(); this.maitre.gain.value = this.actif ? .9 : 0; this.maitre.connect(c.destination);
    this.musique = c.createGain(); this.musique.gain.value = .5; this.musique.connect(this.maitre);
    const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.bruitBuf = b;
    const brun = c.createBuffer(1, n, c.sampleRate), db = brun.getChannelData(0); for (let i = 0; i < n; i++) { br = (br + .02 * (Math.random() * 2 - 1)) / 1.02; db[i] = br * 3.5; }
    const src = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    // Cigales : bruit filtré, pulsé
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5600; bp.Q.value = 5;
    this.cigales = c.createGain(); this.cigales.gain.value = 0; const puls = c.createGain(); puls.gain.value = .5;
    const lfo = c.createOscillator(); lfo.frequency.value = 21; const lfoG = c.createGain(); lfoG.gain.value = .5; lfo.connect(lfoG).connect(puls.gain); lfo.start();
    src(b).connect(bp).connect(puls).connect(this.cigales).connect(this.maitre);
    // Grillons : sifflement aigu haché
    const osc = c.createOscillator(); osc.frequency.value = 4300; const g1 = c.createGain(); g1.gain.value = 0;
    const l1 = c.createOscillator(); l1.type = 'square'; l1.frequency.value = 28; const l1g = c.createGain(); l1g.gain.value = .5; l1.connect(l1g).connect(g1.gain);
    const g2 = c.createGain(); g2.gain.value = 0; const l2 = c.createOscillator(); l2.type = 'square'; l2.frequency.value = 1.3; const l2g = c.createGain(); l2g.gain.value = .5; l2.connect(l2g).connect(g2.gain);
    this.grillons = c.createGain(); this.grillons.gain.value = 0; osc.connect(g1).connect(g2).connect(this.grillons).connect(this.maitre); osc.start(); l1.start(); l2.start();
    // Vent
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const vent = c.createGain(); vent.gain.value = .07; src(brun).connect(lp).connect(vent).connect(this.maitre);
    this.nuit(this.valNuit || 0);
  },
  basculer() { this.actif = !this.actif; SAUVE.son = this.actif; sauver(); if (this.maitre) this.maitre.gain.setTargetAtTime(this.actif ? .9 : 0, this.ctx.currentTime, .1); return this.actif; },
  nuit(n) { this.valNuit = n; if (!this.ctx) return; const t = this.ctx.currentTime; this.cigales.gain.setTargetAtTime(etat === 'menu' ? 0 : .045 * (1 - n), t, .8); this.grillons.gain.setTargetAtTime(etat === 'menu' ? 0 : .012 * n, t, .8); },
  corde(f) {
    const k = Math.round(f * 10); if (this.cache.has(k)) return this.cache.get(k);
    const c = this.ctx, sr = c.sampleRate, n = Math.round(sr * 1.8), N = Math.max(2, Math.round(sr / f)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), z = new Float32Array(N);
    for (let i = 0; i < N; i++) z[i] = Math.random() * 2 - 1;
    let j = 0; for (let i = 0; i < n; i++) { const a = z[j], s = z[(j + 1) % N]; z[j] = (a + s) * .4985; d[i] = a; j = (j + 1) % N; }
    this.cache.set(k, b); return b;
  },
  note(midi, quand = 0, vol = .22, dest) { if (!this.ctx) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = this.corde(440 * Math.pow(2, (midi - 69) / 12)); g.gain.value = vol; s.connect(g).connect(dest || this.musique); s.start(this.ctx.currentTime + quand); },
  theme() {
    if (!this.ctx) return; const e = .19;
    const mel = [[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 1], [72, 1], [74, 1], [76, 3], [77, 1], [76, 1], [74, 1], [72, 2], [71, 1], [69, 1], [71, 1], [72, 1], [68, 3], [69, 1], [72, 1], [76, 1], [81, 2], [79, 1], [77, 1], [76, 1], [74, 1], [76, 3], [72, 1], [71, 1], [68, 1], [69, 6]];
    let t = 0;
    for (const [m, d] of mel) { if (d >= 3) { for (let k = 0; k < d * 2; k++) this.note(m, t + k * e / 2, k ? .1 : .22); } else this.note(m, t, .22); t += d * e; }
    const basse = [45, 52, 45, 52, 50, 45, 40, 52, 45, 52, 53, 48, 50, 45, 40, 45]; basse.forEach((m, i) => { this.note(m, i * 3 * e, .3); this.note(m + 12, i * 3 * e + e, .1); this.note(m + 7, i * 3 * e + 2 * e, .1); });
  },
  sabot() { if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruitBuf; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 3; const t = c.currentTime; g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .08); s.connect(f).connect(g).connect(this.maitre); s.start(t, Math.random()); s.stop(t + .1); },
  choc() { if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruitBuf; f.type = 'lowpass'; f.frequency.value = 500; const t = c.currentTime; g.gain.setValueAtTime(.8, t); g.gain.exponentialRampToValueAtTime(.001, t + .4); s.connect(f).connect(g).connect(this.maitre); s.start(t); s.stop(t + .45); },
  bien() { this.note(76, 0, .2); this.note(81, .12, .2); },
  cueille() { this.note(84 + ((Math.random() * 3) | 0) * 2, 0, .16); },
  alerte() { this.note(62, 0, .3); this.note(63, 0, .3); this.note(50, .05, .35); },
  rate() { this.note(57, 0, .25); this.note(56, .22, .25); this.note(52, .44, .3); }
};

/* ---------- Histoire du chapitre I ---------- */
const TXT = {
  intro: `<p>Mai 1860 : Garibaldi et ses Mille débarquent à Marsala. Un an plus tard, la Sicile appartient au nouveau royaume d’Italie.</p>
<p>Autour de Palerme, dans la plaine qu’on appelle la Conca d’Oro, la « conque d’or », les jardins de citronniers comptent parmi les terres les plus riches d’Europe. Le citron sicilien part par bateaux entiers vers Londres et New York.</p>
<p>Là où il y a tant de richesse et si peu d’État, des hommes ont compris qu’on pouvait vendre une chose que chacun craint de perdre : la tranquillité.</p>`,
  noteIntro: 'Turi, sa famille et les gens de Santa Lucia sont inventés. Le contexte historique est réel.',
  histoire: `<ul>
<li>En 1863, une pièce de théâtre jouée à Palerme, <i>I mafiusi di la Vicaria</i>, rend populaire le mot « mafia ».</li>
<li>En 1876, Leopoldo Franchetti enquête en Sicile. Dans les jardins d’agrumes autour de Palerme, il décrit une véritable « industrie de la violence » : des gardiens qui organisent eux-mêmes les vols pour vendre ensuite leur protection.</li>
<li>L’eau des canaux d’irrigation, indispensable aux citronniers, était l’un de leurs moyens de pression.</li>
<li>Turi, Donna Rosa, Don Gaspare et le village de Santa Lucia sont inventés.</li>
</ul>`
};
const FINS = {
  silence: { titre: 'Le silence', texte: `<p>Donna Rosa a payé. Cette saison-là, plus rien n’a disparu du jardin, et l’eau est revenue dans les rigoles.</p><p>Les hommes de Don Gaspare sont devenus les « gardiens » de Sant’Anna. Une part de chaque récolte est partie vers la masseria sur la colline, et personne à Santa Lucia n’en a jamais parlé.</p><p>Un soir de l’année suivante, Nardo est revenu au baglio. Pas pour l’argent. Pour Turi.</p>` },
  temoin: { titre: 'Le témoin', texte: `<p>Turi a signé. Le brigadier Ruffo a ouvert un dossier, le premier au nom de Don Gaspare.</p><p>Trois semaines plus tard, le canal qui irriguait Sant’Anna a été coupé et les citronniers ont commencé à sécher. Personne n’est venu témoigner aux côtés de Turi. Le dossier a été classé, faute de preuves.</p><p>Mais il existe, quelque part dans un carton à Palerme. Et il porte un nom.</p>` },
  peur: { titre: 'La peur', texte: `<p>Turi n’a pas signé. Le brigadier a refermé son registre sans un mot.</p><p>Sur le chemin du retour, à l’entrée du baglio, une lanterne l’attendait. Nardo souriait.</p><p>Il savait déjà.</p>` }
};
const CHAPITRES = [
  { n: 'I', nom: 'Conca d’Oro', lieu: 'Sicile, 1861 — les jardins de citronniers de Palerme', jouable: true },
  { n: 'II', nom: 'Les mines de Buggerru', lieu: 'Sardaigne, 1904 — une grève de mineurs qui va secouer tout le pays' },
  { n: 'III', nom: 'Le Préfet de fer', lieu: 'Sicile, 1926 — Cesare Mori fait assiéger le village de Gangi' },
  { n: 'IV', nom: 'L’été 1943', lieu: 'Sicile, 1943 — les Alliés débarquent, d’anciens maîtres reviennent' },
  { n: 'V', nom: 'Aspromonte', lieu: 'Calabre, 1977 — les années des enlèvements' },
  { n: 'VI', nom: 'L’été 1992', lieu: 'Palerme, 1992 — Capaci, via D’Amelio, et une ville qui dit non' },
  { n: 'VII', nom: 'Gioia Tauro', lieu: 'Calabre, aujourd’hui — le port, et les terres rendues aux habitants' }
];

// Citrons à cueillir : huit arbres des rangées du sud
const CUEILLETTE = [[2, 5], [4, 7], [6, 4], [7, 8], [9, 6], [10, 3], [12, 7], [13, 5]].map(([i, j]) => {
  const t = CITRONNIERS.find(c => Math.round((c.x - 34) / 7) === i && Math.round((c.z - 76) / 7) === j) || CITRONNIERS[i * 10 + j];
  const g = new T.Group(); g.position.set(t.x + 1.25, H(t.x, t.z) + 1.5, t.z); scene.add(g);
  for (let k = 0; k < 3; k++) { const f = new T.Mesh(GEO.fruit, new T.MeshBasicMaterial({ color: 0xffe066 })); f.scale.setScalar(1.6); f.position.set((k - 1) * .16, (k % 2) * .12, 0); g.add(f); }
  const halo = new T.Mesh(new T.SphereGeometry(.45, 10, 8), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .25, depthWrite: false })); g.add(halo);
  return { g, x: g.position.x, z: g.position.z, pris: false };
});
let nbCueillis = 0;
const resteCueillette = () => CUEILLETTE.filter(c => !c.pris);

let ETAPE = null, chrono = null, distRetour = 1, FIGE = false;
const fige = () => { FIGE = true; };
const VOL = { pts: [[66, 69], [65.5, 79.5], [65.5, 100.5], [86.5, 100.5], [86.5, 121.5], [107.5, 121.5], [107.5, 142.5], [112, 160], [125, 185], [140, 205]], i: 1, parti: false, t: 0, pause: 0 };
const PATROUILLES = [];
let soupcon = 0;

function visibles(nuit) {
  for (const n of Object.values(PNJ)) {
    if (n.quand === 'scene') continue;
    n.h.g.visible = n.quand === 'toujours' || (n.quand === 'jour' && !nuit);
  }
}
function scene_(ids, on) { for (const id of ids) PNJ[id].h.g.visible = on; }
function poserPnj(id, x, z, rot) { const p = PNJ[id]; p.pos.set(x, H(x, z), z); p.h.g.rotation.y = rot ?? p.h.g.rotation.y; p.regarde = null; p.v = 0; }
function preparerPatrouilles(on) {
  for (const p of PATROUILLES) { p.h.g.visible = on; p.cone.visible = on; }
}

const ETAPES = {
  intro: {
    setup() { heure(.05); visibles(false); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); preparerPatrouilles(false); poserPnj('rosa', 72, 45.5, 0); poserPnj('pippo', 63, 56, -PI / 2); placerCharrette(66, 51, -PI / 2, 6); placerJoueur(46, 52, PI / 2); CUEILLETTE.forEach(c => { c.pris = false; c.g.visible = true; }); nbCueillis = 0; },
    debut() { carton('Chapitre I', 'Conca d’Oro<br>Sicile, 1861', TXT.intro, () => aller('pippo'), TXT.noteIntro); SON.theme(); }
  },
  pippo: {
    obj: () => 'Rejoins <b>Zu Pippo</b> dans la cour du baglio Sant’Anna.', cible: () => PNJ.pippo.pos,
    setup() { ETAPES.intro.setup(); },
    debut() { aide(touche('<b>ZQSD</b> ou <b>flèches</b> pour marcher · <b>souris</b> pour regarder (clique pour la capturer) · <b>Maj</b> pour courir · <b>E</b> pour parler', 'Pouce gauche pour marcher · glisse à droite pour regarder · bouton <b>Agir</b> pour parler'), 9000); }
  },
  cueillir: {
    obj: () => `Cueille les citrons mûrs dans les rangées du sud : <b>${nbCueillis}/8</b>`,
    cible: () => { let best = null, bd = 1e9; for (const c of resteCueillette()) { const d = dist(c, J); if (d < bd) { bd = d; best = c; } } return best; },
    setup() { ETAPES.intro.setup(); placerJoueur(52, 62, PI); },
    debut() { aide(`Approche-toi d’un citron qui brille et ${touche('appuie sur <b>E</b>', 'touche <b>Agir</b>')}.`, 6000); }
  },
  rapporter: { obj: () => 'Rapporte la récolte à <b>Zu Pippo</b>.', cible: () => PNJ.pippo.pos, setup() { ETAPES.intro.setup(); CUEILLETTE.forEach(c => { c.pris = true; c.g.visible = false; }); nbCueillis = 8; placerJoueur(65.5, 79.5, 0); } },
  monter: {
    obj: () => 'Monte sur le <b>carretto</b> chargé de citrons.', cible: () => ({ x: CHAR.x, z: CHAR.z }),
    setup() { ETAPES.rapporter.setup(); placerCharrette(66, 51, -PI / 2, 6); placerJoueur(63.5, 53, PI / 2); },
    debut() { aide(`${touche('Appuie sur <b>F</b> (ou <b>E</b>)', 'Touche <b>Agir</b>')} près du carretto pour monter.`, 5000); }
  },
  livrer: {
    reprise: 'monter',
    obj: () => `Livre les citrons à <b>Mastro Nunzio</b>, au marché de Santa Lucia. Cagettes : <b>${CHAR.nb}/6</b>`, cible: () => L.marche,
    debut() { chrono = { reste: 85, echec: 'Midi a sonné : les citrons de Bagheria sont arrivés au marché et le prix s’est effondré.' }; aide(touche('<b>Z / ↑</b> avancer · <b>S / ↓</b> freiner, reculer · <b>Q D</b> tourner. Chaque choc fait tomber une cagette.', 'Pouce gauche : haut pour avancer, côtés pour tourner. Chaque choc fait tomber une cagette.'), 7000); },
    maj() {
      if (CHAR.nb <= 0) return echec('Toutes les cagettes sont tombées sur la route.', 'monter');
      if (J.dansChar && dist(CHAR, L.marche) < 9 && Math.abs(CHAR.v) < 3) {
        fige(); chrono = null; CHAR.v = 0; sortirChar(true); placerJoueur(-75, -64.5, 0);
        const n = CHAR.nb, prix = n * 4;
        SAUVE.tari = prix; sauver();
        dire([
          ['Mastro Nunzio', n === 6 ? 'Six cagettes de Sant’Anna ! Donna Rosa a toujours les plus beaux citrons de la Conca.' : `${n} cagettes seulement ? Tu as semé le reste sur la route, figlio mio ?`],
          ['Mastro Nunzio', `Ça fait ${prix} tarì… moins la part.`],
          ['Turi', 'Quelle part ?'],
          ['Mastro Nunzio', '<em>(Il baisse la voix.)</em> Celle de Don Gaspare. Depuis ce printemps, tout ce qui se vend sur cette place paie sa part. Ses campieri gardent les routes, à ce qu’il paraît.'],
          ['Turi', 'Ils les gardent contre qui ?'],
          ['Mastro Nunzio', 'Contre les voleurs. Ceux qu’ils ne connaissent pas.'],
          ['Mastro Nunzio', 'Rentre avant la nuit, Turi. Et ce que je viens de te dire, je ne l’ai pas dit.']
        ], () => { CHAR.nb = 0; CHAR.caisses.forEach(c => c.visible = false); aller('retour'); });
      }
    }
  },
  retour: {
    obj: () => 'Rentre au <b>baglio Sant’Anna</b> avant la nuit.', cible: () => L.porte,
    setup() { ETAPES.intro.setup(); CUEILLETTE.forEach(c => { c.pris = true; c.g.visible = false; }); placerCharrette(-68, -66, PI / 2.2, 0); placerJoueur(-72, -64, PI / 2); heure(.3); },
    debut() { distRetour = Math.max(60, dist(J.dansChar ? CHAR : J, L.porte)); },
    maj() {
      const ici = J.dansChar ? CHAR : J, d = dist(ici, L.porte);
      heure(lerp(.3, 1, clamp(1 - (d - 16) / distRetour, 0, 1)));
      if (d < 16) {
        fige();
        if (J.dansChar) { CHAR.v = 0; sortirChar(true); }
        placerCharrette(48, 56, 0, 0); placerJoueur(52, 50.5, PI / 2);
        poserPnj('rosa', 58.5, 49.5, -PI / 2); poserPnj('pippo', 59, 52.5, -PI / 2);
        heure(1);
        dire([
          ['Donna Rosa', 'Turi ! La cassette ! Quelqu’un est entré par le jardin pendant que Pippo était à la source !'],
          ['Zu Pippo', 'Là-bas, derrière le mur du sud, entre les rangées ! Il court vers la colline !']
        ], () => aller('poursuite'));
      }
    }
  },
  poursuite: {
    obj: () => 'Rattrape le <b>voleur</b> !', cible: () => PNJ.toto.pos,
    setup() { ETAPES.retour.setup(); heure(1); placerCharrette(48, 56, 0, 0); placerJoueur(52, 50.5, PI); poserPnj('rosa', 58.5, 49.5, -PI / 2); poserPnj('pippo', 59, 52.5, -PI / 2); },
    prep() { VOL.i = 1; VOL.parti = false; VOL.t = 0; VOL.pause = 0; poserPnj('toto', VOL.pts[0][0], VOL.pts[0][1], PI); PNJ.toto.nom = 'Le voleur'; scene_(['toto'], true); J.endu = 1; },
    debut() { aide(`${touche('Maintiens <b>Maj</b>', 'Maintiens <b>Courir</b>')} pour sprinter. Coupe par les rangées pour le rattraper.`, 6000); },
    maj(dt) {
      const p = PNJ.toto, d = dist(p.pos, J);
      if (!VOL.parti && d < 20) { VOL.parti = true; toast('Il t’a vu !'); }
      if (VOL.parti) {
        VOL.t += dt;
        if (VOL.pause > 0) { VOL.pause -= dt; p.v = 0; p.regarde = Math.atan2(J.x - p.pos.x, J.z - p.pos.z); }
        else {
          const c = VOL.pts[VOL.i]; const dx = c[0] - p.pos.x, dz = c[1] - p.pos.z, l = Math.hypot(dx, dz), v = 5.3;
          if (l < .6) { VOL.i++; if (VOL.i >= VOL.pts.length) return echec('Le voleur s’est enfui dans la colline.', 'poursuite'); }
          else { p.pos.x += dx / l * v * dt; p.pos.z += dz / l * v * dt; p.pos.y = H(p.pos.x, p.pos.z); p.h.g.rotation.y = Math.atan2(dx, dz); p.v = v; p.regarde = null; }
          if (VOL.t > 6.5) { VOL.t = 0; VOL.pause = .9; }
        }
      }
      if (d < 1.7) {
        fige(); p.v = 0; SON.bien();
        PNJ.toto.nom = 'Totò';
        dire([
          ['Totò', 'Lâche-moi ! Lâche-moi, je te la rends, ta cassette !'],
          ['Turi', 'Mais tu es un gamin… Qui t’envoie ?'],
          ['Totò', 'Personne.'],
          ['Turi', 'Qui ?'],
          ['Totò', '…Les hommes de la masseria. Ils m’ont dit de la prendre et de la cacher dans les figuiers. Qu’ensuite ils la rapporteraient eux-mêmes à ta patronne, et qu’elle serait bien contente d’avoir des gardiens.'],
          ['Totò', 'Ne dis pas que c’est moi. Ils savent où dort ma mère.']
        ], () => fondu(() => { scene_(['toto'], false); aller('cassette'); }));
      } else if (VOL.parti && d > 50) echec('Le voleur s’est enfui dans la colline.', 'poursuite');
    }
  },
  cassette: {
    obj: () => 'La nuit est tombée. Rapporte la cassette au <b>baglio</b>.', cible: () => L.porte,
    setup() { ETAPES.poursuite.setup(); placerJoueur(86, 118, 0); },
    prep() {
      heure(1.75); visibles(true); poserPnj('rosa', 57.8, 49.5, -PI / 2); scene_(['pippo'], true); poserPnj('pippo', 58, 52.8, -PI / 2);
      scene_(['nardo', 'campiere1', 'campiere2'], true); poserPnj('nardo', 52, 49.5, PI / 2); poserPnj('campiere1', 49.5, 47, PI / 2); poserPnj('campiere2', 49.8, 53, PI / 2);
    },
    maj() {
      if (dist(J, L.porte) < 8) {
        fige(); placerJoueur(55.2, 51.3, -PI / 2); heure(2);
        dire([
          ['Nardo', 'Bonsoir, Donna Rosa. On nous a dit que vous aviez eu des ennuis, cet après-midi.'],
          ['Donna Rosa', 'Les nouvelles vont vite, Nardo.'],
          ['Nardo', 'C’est notre métier, de savoir. Un jardin comme le vôtre, sans gardien… c’est une tentation. Don Gaspare propose de veiller sur Sant’Anna. Pour une part de chaque récolte. Un prix honnête.'],
          ['Nardo', 'Et l’eau de la source coulera comme avant. Elle baisse, en ce moment, non ?'],
          ['Donna Rosa', 'Turi… Ton père a travaillé ici trente ans. Qu’est-ce que tu en penses ?'],
          { question: '<em>Nardo te regarde. Les deux autres n’ont pas lâché leurs fusils.</em>', choix: [
            ['« Payez, Donna Rosa. On ne discute pas avec ces gens-là. »', () => finir('silence')],
            ['« Ne payez rien. Je vais voir les carabiniers à Santa Lucia. »', () => dire([
              ['Nardo', '<em>(Il rit doucement.)</em> Les carabiniers… Va, alors, Turi Ferrante. Mais les routes sont sombres, la nuit.']
            ], () => fondu(() => aller('caserne')))]
          ] }
        ]);
      }
    }
  },
  caserne: {
    obj: () => 'Rejoins la <b>caserne des carabiniers</b> de Santa Lucia sans te faire repérer.', cible: () => L.porteCaserne,
    setup() { ETAPES.poursuite.setup(); },
    prep() {
      heure(2); visibles(true); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); poserPnj('rosa', 72, 45.5, 0); scene_(['pippo'], false);
      placerJoueur(55, 50, -PI / 2); preparerPatrouilles(true); soupcon = 0;
      PATROUILLES.forEach(p => { p.i = 0; p.t = 0; p.attente = 0; const a = p.pts[0]; p.pos.set(a[0], H(a[0], a[1]), a[1]); });
    },
    debut() { aide('Les campieri patrouillent avec des lanternes. Reste hors de leur lumière et ne cours pas près d’eux. Les champs sont plus sûrs que la route.', 8000); },
    maj(dt) { majPatrouilles(dt); }
  }
};
function aller(id) {
  ETAPE = id; FIGE = false; const e = ETAPES[id]; if (id !== 'intro') { SAUVE.etape = id; sauver(); }
  chrono = null; UI.chrono.hidden = true; UI.soupcon.hidden = id !== 'caserne'; if (id !== 'caserne') preparerPatrouilles(false);
  e.prep && e.prep(); etat = etat === 'carton' || etat === 'dialogue' ? etat : 'jeu';
  if (etat === 'jeu') UI.hud.hidden = false;
  e.debut && e.debut();
  majObjectif();
}
function charger(id) { if (ETAPES[id].reprise) id = ETAPES[id].reprise; etat = 'jeu'; ETAPES[id].setup && ETAPES[id].setup(); aller(id); }
function majObjectif() { const e = ETAPES[ETAPE]; if (!e || !e.obj) return; let t = e.obj(); const c = e.cible && e.cible(); if (c) { const ici = J.dansChar ? CHAR : J; t += ` <span style="color:var(--fumee)">· ${Math.round(dist(ici, c))} m</span>`; } if (UI.objTxt.dataset.t !== t) { UI.objTxt.dataset.t = t; UI.objTxt.innerHTML = t; } }
function echec(msg, id) {
  if (etat === 'transition') return; etat = 'transition'; fige(); chrono = null; SON.rate(); toast(msg, true, 3200);
  setTimeout(() => fondu(() => { charger(id); toast('Dernier point de passage', false, 1800); }), 1400);
}
function finir(cle) {
  etat = 'transition'; fige(); const f = FINS[cle]; if (!SAUVE.fins.includes(cle)) SAUVE.fins.push(cle); SAUVE.etape = null; sauver();
  preparerPatrouilles(false); UI.soupcon.hidden = true;
  fondu(() => {
    SON.theme();
    carton('Fin du chapitre I', f.titre, f.texte, () => carton('Ce que l’histoire retient', 'Sicile, 1861-1876', TXT.histoire, () => carton('À suivre', 'Chapitre II<br>Les mines de Buggerru', `<p>Sardaigne, 1904. Le petit-fils de Turi descend chaque matin dans une mine de zinc, au bord de la mer.</p><p>Fins découvertes : <b>${SAUVE.fins.length} sur 3</b>. Rejoue le chapitre pour faire un autre choix.</p>`, () => retourMenu())));
  }, 900);
}

/* Interactions du chapitre */
inter({ pos: () => PNJ.pippo.pos, r: 2.6, si: () => PNJ.pippo.h.g.visible && (ETAPE === 'pippo' || ETAPE === 'rapporter'), lib: () => 'Parler à Zu Pippo', faire() {
  if (ETAPE === 'pippo') dire([
    ['Zu Pippo', 'Turi ! Finalmente. Le soleil est déjà haut et Mastro Nunzio n’attend personne.'],
    ['Turi', 'J’étais à la source, Zu Pippo. L’eau baisse encore.'],
    ['Zu Pippo', 'L’eau baisse quand quelqu’un veut qu’elle baisse… Laisse.'],
    ['Zu Pippo', 'Va cueillir les derniers citrons mûrs dans les rangées du sud. Huit, les plus beaux. Les jaunes, pas les verts.']
  ], () => aller('cueillir'));
  else dire([
    ['Zu Pippo', 'Bene. Avec ceux de ce matin, ça fait six cagettes.'],
    ['Zu Pippo', 'Prends le carretto et file au marché de Santa Lucia. Mastro Nunzio paie avant midi. Après, les citrons de Bagheria arrivent et le prix tombe.'],
    ['Zu Pippo', 'Et doucement dans les virages. Une cagette renversée, c’est une journée perdue.']
  ], () => aller('monter'));
} });
inter({ pos: () => PNJ.rosa.pos, r: 2.4, si: () => ETAPE === 'pippo' || ETAPE === 'cueillir', lib: () => 'Parler à Donna Rosa', faire() {
  dire([['Donna Rosa', 'Depuis la mort de mon mari, on dit à Palerme qu’une veuve ne sait pas tenir un jardin. Montre-leur le contraire, Turi.']]);
} });
CUEILLETTE.forEach(c => inter({ pos: () => c, r: 2.5, si: () => ETAPE === 'cueillir' && !c.pris, lib: () => 'Cueillir', faire() {
  c.pris = true; c.g.visible = false; nbCueillis++; SON.cueille(); majObjectif();
  if (nbCueillis >= 8) { SON.bien(); toast('Le panier est plein'); aller('rapporter'); }
} }));
inter({ pos: () => CHAR, r: 4.2, touche: 'F', si: () => !J.dansChar && ETAPE !== 'poursuite' && ETAPE !== 'cassette', lib: () => 'Monter sur le carretto', faire() {
  monterChar(); if (ETAPE === 'monter') aller('livrer');
} });
inter({ pos: () => PNJ.nunzio.pos, r: 2.6, si: () => PNJ.nunzio.h.g.visible && ETAPE !== 'livrer', lib: () => 'Parler à Mastro Nunzio', faire() { dire([['Mastro Nunzio', ETAPE === 'retour' ? 'Tu es encore là ? Rentre, Turi. La nuit, les routes ne sont à personne.' : 'Pas de citrons, pas de tarì. Reviens avec la récolte de Sant’Anna.']]); } });
inter({ pos: () => PNJ.pretre.pos, r: 2.6, si: () => PNJ.pretre.h.g.visible, lib: () => 'Parler au padre', faire() { dire([['Padre Calogero', 'Dieu voit tout, mon fils. Les hommes de cette paroisse, eux, ont appris à ne rien voir.']]); } });
inter({ pos: () => L.porteCaserne, r: 2.6, si: () => ETAPE === 'caserne', lib: () => 'Frapper à la porte', faire() {
  preparerPatrouilles(false); UI.soupcon.hidden = true; scene_(['ruffo'], true); poserPnj('ruffo', -97.6, -71.2, PI / 2); placerJoueur(-95.8, -70.4, -PI / 2);
  dire([
    ['Le brigadier Ruffo', 'Qui frappe à cette heure ?… Entre, garçon. Tu trembles.'],
    ['Turi', 'Les hommes de Don Gaspare ont fait voler la cassette de Donna Rosa, au baglio Sant’Anna, pour lui vendre ensuite leur protection. Le gamin qui l’a prise me l’a dit.'],
    ['Le brigadier Ruffo', 'Je suis arrivé de Turin il y a six mois. Tu es le premier à venir me dire ce que tout le monde ici sait déjà.'],
    ['Le brigadier Ruffo', 'Le gamin témoignera ? Ta patronne ?'],
    ['Turi', '…'],
    ['Le brigadier Ruffo', 'Alors il n’y a que toi. Si tu signes, ton nom sera dans ce registre. Et tout Santa Lucia le saura avant midi.'],
    { question: '<em>Le brigadier tourne le registre vers toi et te tend la plume.</em>', choix: [
      ['Signer.', () => finir('temoin')],
      ['« …Je ne peux pas. »', () => finir('peur')]
    ] }
  ]);
} });
for (const n of Object.values(PNJ)) if (n.figurant) inter({ pos: () => n.pos, r: 2.2, si: () => n.h.g.visible && etat === 'jeu', lib: () => 'Parler', faire() { dire([['Un habitant', n.repliques[0]]]); } });

/* Patrouilles de nuit (étape « caserne ») */
function cone(portee, demi) {
  const v = [], n = 14; for (let i = 0; i < n; i++) { const a = -demi + 2 * demi * i / n, b = -demi + 2 * demi * (i + 1) / n; v.push(0, 0, 0, Math.sin(b) * portee, 0, Math.cos(b) * portee, Math.sin(a) * portee, 0, Math.cos(a) * portee); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: .13, depthWrite: false, side: T.DoubleSide, fog: false })); m.renderOrder = 2; scene.add(m); return m;
}
[[[24, 41], [8, 25]], [[-16, -6], [-33, -42]], [[-46, -60], [-46, -92]], 'rond'].forEach((pts, i) => {
  const rond = pts === 'rond';
  const pp = rond ? Array.from({ length: 10 }, (_, k) => [L.village.x + Math.cos(k / 10 * PI * 2) * 9, L.village.z - 2 + Math.sin(k / 10 * PI * 2) * 9]) : pts;
  const p = pnj('pat' + i, 'Un campiere', { veste: [0x3f3a2a, 0x2f3a33, 0x3a3a30, 0x4a3a2a, 0x353028][i], pantalon: 0x2e2a24, chapeau: i % 2 ? 'feutre' : 'coppola', chapeauC: 0x2a2620, lupara: true, lanterne: true }, pp[0][0], pp[0][1], 0, 'scene');
  p.pts = pp; p.boucle = rond; p.i = 0; p.sens = 1; p.attente = 0; p.portee = rond ? 12 : 15; p.demi = .62;
  p.cone = cone(p.portee, p.demi); p.lumiere = lampe(0, 1.2, .3, p.h.g);
  p.h.g.visible = false; p.cone.visible = false;
  PATROUILLES.push(p);
});
function vueBloquee(a, b) { const d = dist(a, b), n = Math.ceil(d); for (let k = 1; k < n; k++) { const t = k / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); if (dansBatiment(x, z, H(x, z) + 1.5)) return true; } return false; }
function majPatrouilles(dt) {
  let vu = false; const ici = J.dansChar ? CHAR : J;
  for (const p of PATROUILLES) {
    const dx = ici.x - p.pos.x, dz = ici.z - p.pos.z, d = Math.hypot(dx, dz);
    const dansCone = d < p.portee && Math.abs(ecartAngle(p.h.g.rotation.y, Math.atan2(dx, dz))) < p.demi && !vueBloquee(p.pos, ici);
    const entendu = (J.courir && J.v > 6 && d < 9) || (J.dansChar && Math.abs(CHAR.v) > 2 && d < 20) || d < 2.2;
    if (dansCone || entendu) {
      vu = true; soupcon += dt * (dansCone ? 1.1 + 1.6 * (1 - d / p.portee) : .9); p.v = 0;
      p.h.g.rotation.y += ecartAngle(p.h.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 3);
    } else if (p.attente > 0) { p.attente -= dt; p.v = 0; }
    else {
      const c = p.pts[p.i], ex = c[0] - p.pos.x, ez = c[1] - p.pos.z, l = Math.hypot(ex, ez), v = 1.4;
      if (l < .4) { if (p.boucle) p.i = (p.i + 1) % p.pts.length; else { p.i += p.sens; if (p.i >= p.pts.length || p.i < 0) { p.sens *= -1; p.i += 2 * p.sens; p.attente = 2.2; } } }
      else { p.pos.x += ex / l * v * dt; p.pos.z += ez / l * v * dt; p.h.g.rotation.y += ecartAngle(p.h.g.rotation.y, Math.atan2(ex, ez)) * Math.min(1, dt * 5); p.v = v; }
    }
    p.pos.y = H(p.pos.x, p.pos.z);
    p.cone.position.set(p.pos.x, p.pos.y + .25, p.pos.z); p.cone.rotation.y = p.h.g.rotation.y;
    p.cone.material.color.setHex(dansCone ? 0xff6a4a : 0xffc860);
  }
  if (!vu) soupcon = Math.max(0, soupcon - dt * .35);
  UI.soupcon.firstElementChild.style.width = Math.min(100, soupcon * 100) + '%';
  if (soupcon >= 1 && etat === 'jeu') {
    SON.alerte(); toast('Repéré !', true, 1600); soupcon = 0; etat = 'dialogue';
    setTimeout(() => dire([['Un campiere', 'Ehi ! Turi Ferrante… Où tu vas comme ça, à cette heure ? Rentre chez toi. Tout de suite.']], () => echec('Les campieri t’ont reconduit au baglio.', 'caserne')), 500);
  }
}

/* ---------- Mise à jour du joueur, du carretto, des passants ---------- */
const STICK = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
let boutonCourir = false;
const K = {};
function entree() {
  let ix = 0, iz = 0;
  if (K.KeyW || K.ArrowUp) iz += 1; if (K.KeyS || K.ArrowDown) iz -= 1; if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1;
  ix += STICK.x; iz += STICK.y; const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; }
  return { ix, iz, m: Math.min(1, m) };
}
function majJoueur(dt) {
  const { ix, iz, m } = entree();
  const veut = (K.ShiftLeft || K.ShiftRight || boutonCourir) && m > .2;
  if (J.endu <= 0) J.epuise = true; if (J.epuise && J.endu > .35) J.epuise = false;
  J.courir = veut && !J.epuise;
  J.endu = clamp(J.endu + (J.courir ? -dt / 4.5 : dt / 6), 0, 1);
  UI.endu.hidden = J.endu > .995; UI.endu.firstElementChild.style.width = J.endu * 100 + '%';
  const vmax = J.courir ? 7.6 : (STICK.id !== null && m < .65 ? 2.2 : 4.8);
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
  const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
  J.v = approche(J.v, vmax * (m > .05 ? 1 : 0), dt * 22);
  if (m > .05) { J.yaw += ecartAngle(J.yaw, Math.atan2(mx, mz)) * Math.min(1, dt * 12); const l = Math.hypot(mx, mz) || 1; J.x += mx / l * J.v * dt; J.z += mz / l * J.v * dt; }
  const p = { x: J.x, z: J.z }; resoudre(p, .38, true); J.x = p.x; J.z = p.z;
  J.h.g.position.set(J.x, H(J.x, J.z), J.z); J.h.g.rotation.y = J.yaw;
  animer(J.h, dt, J.v);
}
function majCharrette(dt) {
  if (J.dansChar) {
    const { ix, iz } = entree();
    const cible = iz > 0 ? 8.5 * iz : iz < 0 ? -2.6 * -iz : 0;
    const taux = iz < 0 && CHAR.v > .2 ? 8 : (Math.abs(cible) > Math.abs(CHAR.v) ? 2.8 : 1.6);
    CHAR.v = approche(CHAR.v, cible, taux * dt);
    CHAR.yaw -= ix * 1.35 * dt * clamp(CHAR.v / 3, -1, 1);
    CHAR.x += Math.sin(CHAR.yaw) * CHAR.v * dt; CHAR.z += Math.cos(CHAR.yaw) * CHAR.v * dt;
    const avant = { x: CHAR.x + Math.sin(CHAR.yaw) * 2.8, z: CHAR.z + Math.cos(CHAR.yaw) * 2.8 }, centre = { x: CHAR.x, z: CHAR.z };
    const c1 = resoudre(centre, 1.25, true), a0x = avant.x, a0z = avant.z, c2 = resoudre(avant, .75, true);
    CHAR.x = centre.x + (avant.x - a0x); CHAR.z = centre.z + (avant.z - a0z);
    CHAR.cooldown -= dt;
    if ((c1 || c2) && Math.abs(CHAR.v) > 1) {
      if (Math.abs(CHAR.v) > 4.2 && CHAR.cooldown <= 0 && CHAR.nb > 0 && ETAPE === 'livrer') { CHAR.nb--; CHAR.caisses[CHAR.nb].visible = false; CHAR.cooldown = 1.2; SON.choc(); CAM.secousse = .35; toast('Une cagette est tombée !', true, 1500); majObjectif(); }
      CHAR.v *= .55;
    }
  }
  poserCharrette();
  const tour = CHAR.v * dt / .75; CHAR.roues.forEach(r => r.rotation.x += tour);
  CHAR.pas += Math.abs(CHAR.v) * dt * 1.6;
  const a = Math.sin(CHAR.pas * 2) * Math.min(.6, Math.abs(CHAR.v) / 6);
  CHAR.pattes[0].rotation.x = a; CHAR.pattes[3].rotation.x = a; CHAR.pattes[1].rotation.x = -a; CHAR.pattes[2].rotation.x = -a;
  if (Math.abs(CHAR.v) > .6 && Math.floor(CHAR.pas * 2 / PI) !== CHAR.dernierPas) { CHAR.dernierPas = Math.floor(CHAR.pas * 2 / PI); SON.sabot(); }
}
function majPnj(dt) {
  for (const n of Object.values(PNJ)) {
    if (!n.h.g.visible || n.id.startsWith('pat')) { if (n.id.startsWith('pat') && n.h.g.visible) animer(n.h, dt, n.v); continue; }
    if (n.id === 'toto' && ETAPE === 'poursuite') { animer(n.h, dt, n.v); continue; }
    const proche = dist(n.pos, J) < 3.2 && !J.dansChar;
    if (n.trajet && !proche && etat === 'jeu') {
      if (n.attente > 0) { n.attente -= dt; n.v = 0; }
      else { const c = n.trajet[n.ti], dx = c[0] - n.pos.x, dz = c[1] - n.pos.z, l = Math.hypot(dx, dz); if (l < .5) { n.ti = (n.ti + 1) % n.trajet.length; n.attente = 1.5 + R() * 3; } else { n.pos.x += dx / l * 1.2 * dt; n.pos.z += dz / l * 1.2 * dt; n.h.g.rotation.y += ecartAngle(n.h.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 5); n.v = 1.2; } }
      n.pos.y = H(n.pos.x, n.pos.z);
    } else n.v = 0;
    const vise = n.regarde ?? (proche ? Math.atan2(J.x - n.pos.x, J.z - n.pos.z) : null);
    if (vise != null && n.v === 0) n.h.g.rotation.y += ecartAngle(n.h.g.rotation.y, vise) * Math.min(1, dt * 4);
    animer(n.h, dt, n.v);
  }
}

/* ---------- Mini-carte ---------- */
const CARTE = document.createElement('canvas'); CARTE.width = CARTE.height = 1120;
(() => {
  const c = CARTE.getContext('2d'), k = 2, X = x => (x + 280) * k, Z = z => (z + 280) * k;
  c.fillStyle = '#b9a573'; c.fillRect(0, 0, 1120, 1120);
  for (let x = -280; x < 280; x += 4) for (let z = -280; z < 280; z += 4) { const h = H(x, z); if (h < .2) { c.fillStyle = '#4c6f78'; c.fillRect(X(x), Z(z), 8, 8); } else if (h > 22) { c.fillStyle = 'rgba(110,96,74,.55)'; c.fillRect(X(x), Z(z), 8, 8); } }
  c.fillStyle = '#7f8a4c'; c.fillRect(X(JARDIN.x0), Z(JARDIN.z0), (JARDIN.x1 - JARDIN.x0) * k, (JARDIN.z1 - JARDIN.z0) * k);
  c.fillStyle = '#5e6a36'; for (const t of CITRONNIERS) { c.beginPath(); c.arc(X(t.x), Z(t.z), 2.6, 0, 7); c.fill(); }
  c.strokeStyle = '#e3d1a4'; c.lineCap = c.lineJoin = 'round';
  ROUTES.forEach((r, i) => { c.lineWidth = i === 2 ? 5 : 8; c.beginPath(); r.forEach(([x, z], j) => j ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); });
  c.fillStyle = '#d9c8a2'; c.fillRect(X(L.village.x - 18), Z(L.village.z - 14), 36 * k, 28 * k);
  c.fillStyle = '#6e5a46';
  for (const b of BOITES) { if (b.haut < 2) continue; c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-Math.atan2(b.s, b.c)); c.fillRect(-b.hw * k, -b.hd * k, b.hw * 2 * k, b.hd * 2 * k); c.restore(); }
})();
const mini = $('#minicarte').getContext('2d');
function majMinicarte() {
  const W = 300, ici = J.dansChar ? CHAR : J, fen = 170, k = 2;
  mini.clearRect(0, 0, W, W); mini.save(); mini.beginPath(); mini.arc(W / 2, W / 2, W / 2, 0, 7); mini.clip();
  mini.drawImage(CARTE, (ici.x + 280) * k - fen, (ici.z + 280) * k - fen, fen * 2, fen * 2, 0, 0, W, W);
  const s = W / (fen * 2) * k, P = (x, z) => [W / 2 + (x - ici.x) * s, W / 2 + (z - ici.z) * s];
  if (ETAPE === 'caserne') for (const p of PATROUILLES) { const [x, y] = P(p.pos.x, p.pos.z); mini.fillStyle = '#b8402e'; mini.beginPath(); mini.arc(x, y, 6, 0, 7); mini.fill(); }
  const e = ETAPES[ETAPE], c = e && e.cible && etat === 'jeu' ? e.cible() : null;
  if (c) { let [x, y] = P(c.x, c.z); const dx = x - W / 2, dy = y - W / 2, l = Math.hypot(dx, dy); if (l > W / 2 - 14) { x = W / 2 + dx / l * (W / 2 - 14); y = W / 2 + dy / l * (W / 2 - 14); } mini.fillStyle = '#e2bd45'; mini.strokeStyle = '#15110c'; mini.lineWidth = 3; mini.beginPath(); mini.arc(x, y, 9, 0, 7); mini.fill(); mini.stroke(); }
  const yaw = J.dansChar ? CHAR.yaw : J.yaw;
  mini.translate(W / 2, W / 2); mini.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
  mini.fillStyle = '#fff6e0'; mini.strokeStyle = '#15110c'; mini.lineWidth = 3; mini.beginPath(); mini.moveTo(15, 0); mini.lineTo(-10, 10); mini.lineTo(-5, 0); mini.lineTo(-10, -10); mini.closePath(); mini.stroke(); mini.fill();
  mini.restore();
  mini.fillStyle = '#eee2c8'; mini.font = '600 22px Oswald, sans-serif'; mini.textAlign = 'center'; mini.fillText('N', W / 2, 28);
}

/* ---------- Commandes ---------- */
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Space' || e.code === 'Enter')) return;
  K[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && etat !== 'menu') e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (etat === 'jeu') pause(); else if (etat === 'pause') reprendre(); return; }
  if (etat === 'dialogue' && DLG && DLG.choixOuvert && /^Digit[1-3]$/.test(e.code)) { const b = $('#choix').querySelectorAll('button')[+e.code.slice(5) - 1]; b && b.click(); return; }
  if (e.code === 'KeyE' || e.code === 'KeyF' || ((e.code === 'Space' || e.code === 'Enter') && etat !== 'jeu')) { if (etat === 'dialogue' && DLG && DLG.choixOuvert) return; agir(); }
});
addEventListener('keyup', e => { K[e.code] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
let souris = false;
toile.addEventListener('mousedown', e => {
  if (etat === 'dialogue') return suivant();
  if (etat === 'carton') return fermerCarton();
  if (etat !== 'jeu') return; souris = true;
  if (!document.pointerLockElement && toile.requestPointerLock) { try { const r = toile.requestPointerLock(); r && r.catch && r.catch(() => {}); } catch (err) { /* refusé : on regarde en glissant */ } }
});
addEventListener('mouseup', () => { souris = false; });
addEventListener('mousemove', e => {
  if (etat !== 'jeu' && etat !== 'dialogue') return;
  if (document.pointerLockElement === toile || souris) { CAM.yaw -= e.movementX * .0028; CAM.pitch = clamp(CAM.pitch + e.movementY * .0022, -.25, 1.1); CAM.libre = 1.5; }
});
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && etat === 'jeu' && !tactile) pause(); });

const regard = { id: null, x: 0, y: 0 };
addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  document.body.classList.add('tactile');
  if (etat !== 'jeu' || e.target.closest('.tbtn')) return;
  if (e.clientX < innerWidth * .45 && STICK.id === null) { STICK.id = e.pointerId; STICK.ox = e.clientX; STICK.oy = e.clientY; const s = $('#stick'); s.style.display = 'block'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; }
  else if (regard.id === null) { regard.id = e.pointerId; regard.x = e.clientX; regard.y = e.clientY; }
});
addEventListener('pointermove', e => {
  if (e.pointerId === STICK.id) { let dx = e.clientX - STICK.ox, dy = e.clientY - STICK.oy; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } STICK.x = dx / m; STICK.y = -dy / m; $('#stick i').style.transform = `translate(${dx}px,${dy}px)`; }
  else if (e.pointerId === regard.id) { CAM.yaw -= (e.clientX - regard.x) * .006; CAM.pitch = clamp(CAM.pitch + (e.clientY - regard.y) * .004, -.25, 1.1); regard.x = e.clientX; regard.y = e.clientY; CAM.libre = 1.5; }
});
const finDoigt = e => { if (e.pointerId === STICK.id) { STICK.id = null; STICK.x = STICK.y = 0; $('#stick').style.display = 'none'; $('#stick i').style.transform = ''; } if (e.pointerId === regard.id) regard.id = null; };
addEventListener('pointerup', finDoigt); addEventListener('pointercancel', finDoigt);
const tb = (id, bas, haut) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('actif'); bas(); }); const fin = () => { b.classList.remove('actif'); haut && haut(); }; b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('pointerleave', fin); };
tb('#t-action', agir); tb('#t-courir', () => { boutonCourir = true; }, () => { boutonCourir = false; }); tb('#t-pause', () => { if (etat === 'jeu') pause(); });
if (tactile) document.body.classList.add('tactile');

/* ---------- Menus ---------- */
const COMMANDES = `<div class="touches"><div><h3>Clavier et souris</h3><dl>
<dt>ZQSD · WASD · flèches</dt><dd>Marcher, conduire</dd><dt>Souris</dt><dd>Regarder (clique pour la capturer)</dd><dt>Maj</dt><dd>Sprinter</dd><dt>E</dt><dd>Parler, agir</dd><dt>F</dt><dd>Monter, descendre du carretto</dd><dt>Espace</dt><dd>Faire avancer un dialogue</dd><dt>1 · 2</dt><dd>Choisir une réponse</dd><dt>Échap</dt><dd>Pause</dd></dl></div>
<div><h3>Écran tactile</h3><dl><dt>Pouce gauche</dt><dd>Marcher, conduire</dd><dt>Glisser à droite</dt><dd>Regarder</dd><dt>Agir</dt><dd>Parler, monter, cueillir</dd><dt>Courir</dt><dd>Sprinter (maintenir)</dd><dt>II</dt><dd>Pause</dd></dl></div></div>`;
function panneau(html, boutons) {
  UI.panneau.hidden = false; const b = UI.panneau.querySelector('.boite'); b.innerHTML = html;
  const zone = document.createElement('div'); zone.className = 'actions fermer'; zone.style.display = 'flex'; zone.style.flexDirection = 'column'; zone.style.gap = '10px';
  for (const [lib, fn, sous] of boutons) { const bt = document.createElement('button'); bt.className = 'menu-btn'; bt.innerHTML = lib + (sous ? `<small>${sous}</small>` : ''); bt.onclick = () => { SON.init(); fn(); }; zone.appendChild(bt); }
  b.appendChild(zone);
}
const fermerPanneau = () => { UI.panneau.hidden = true; };
function listeChapitres() {
  const fins = SAUVE.fins.length;
  return `<h2>Chapitres</h2><ul class="chapitres">${CHAPITRES.map(c => `<li class="${c.jouable ? '' : 'verrou'}"><span class="num">${c.n}</span><div><div class="nom">${c.nom}</div><div class="lieu">${c.lieu}</div></div><div class="etat">${c.jouable ? `<button data-jouer="1">Jouer</button>` : 'Bientôt'}</div></li>`).join('')}</ul><p class="note" style="color:var(--fumee);margin-top:16px">Chapitre I : ${fins} fin${fins > 1 ? 's' : ''} découverte${fins > 1 ? 's' : ''} sur 3.</p>`;
}
const NOMS_ETAPES = { pippo: 'Le baglio', cueillir: 'La cueillette', rapporter: 'La cueillette', monter: 'Le marché', livrer: 'Le marché', retour: 'Le retour', poursuite: 'Le voleur', cassette: 'La visite', caserne: 'La nuit' };
function majMenu() {
  const c = $('#m-continuer'); c.hidden = !SAUVE.etape || !ETAPES[SAUVE.etape]; $('#m-ou').textContent = SAUVE.etape ? 'Chapitre I · ' + (NOMS_ETAPES[SAUVE.etape] || '') : '';
  $('#m-son-etat').textContent = SON.actif ? 'activé' : 'coupé';
}
function lancer(id) {
  SON.init(); UI.menu.hidden = true; fermerPanneau();
  fondu(() => { charger(id); SON.nuit(SON.valNuit || 0); }, 600);
}
$('#m-nouvelle').onclick = () => lancer('intro');
$('#m-continuer').onclick = () => lancer(SAUVE.etape);
$('#m-chapitres').onclick = () => { SON.init(); panneau(listeChapitres(), [['Retour', fermerPanneau]]); const b = UI.panneau.querySelector('[data-jouer]'); b && (b.onclick = () => lancer('intro')); };
$('#m-commandes').onclick = () => { SON.init(); panneau('<h2>Commandes</h2>' + COMMANDES, [['Retour', fermerPanneau]]); };
$('#m-son').onclick = () => { SON.init(); SON.basculer(); majMenu(); };
function pause() {
  if (etat !== 'jeu') return; etat = 'pause'; if (document.pointerLockElement) document.exitPointerLock();
  panneau('<h2>Pause</h2>', [
    ['Reprendre', reprendre],
    ['Recommencer l’étape', () => { fermerPanneau(); fondu(() => charger(ETAPE)); }, NOMS_ETAPES[ETAPE] || ''],
    ['Effet pellicule', () => { SAUVE.sansFilm = !SAUVE.sansFilm; sauver(); document.body.classList.toggle('sans-film', !!SAUVE.sansFilm); pause2(); }, SAUVE.sansFilm ? 'désactivé' : 'activé'],
    ['Son', () => { SON.basculer(); pause2(); }, SON.actif ? 'activé' : 'coupé'],
    ['Commandes', () => panneau('<h2>Commandes</h2>' + COMMANDES, [['Retour', pause2]])],
    ['Quitter vers le menu', () => { fermerPanneau(); retourMenu(); }]
  ]);
}
function pause2() { etat = 'jeu'; pause(); }
function reprendre() { fermerPanneau(); etat = 'jeu'; }
function retourMenu() {
  etat = 'menu'; UI.hud.hidden = true; UI.carton.hidden = true; UI.dlg.hidden = true; cinema(false); preparerPatrouilles(false);
  if (J.dansChar) sortirChar(true);
  heure(1.05); SON.nuit(1); majMenu(); UI.menu.hidden = false;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && etat === 'jeu') pause(); });

/* ---------- Boucle ---------- */
let avant = performance.now(), tMenu = 0;
function boucle(now) {
  requestAnimationFrame(boucle);
  const dt = Math.min(.05, (now - avant) / 1000); avant = now;
  if (etat === 'menu') {
    tMenu += dt * .035;
    const cx = -20, cz = -10; camera.position.set(cx + Math.cos(tMenu) * 115, 42, cz + Math.sin(tMenu) * 115); camera.lookAt(cx, 6, cz);
    majPnj(dt); CAM.pret = false; repere.visible = false;
  } else {
    if (etat === 'jeu') {
      if (J.dansChar) { majCharrette(dt); animer(J.h, dt, 0); } else { majJoueur(dt); majCharrette(dt); }
      const e = ETAPES[ETAPE]; if (e && e.maj && !FIGE) e.maj(dt);
      if (chrono) { chrono.reste -= dt; UI.chrono.hidden = false; const s = Math.max(0, Math.ceil(chrono.reste)); UI.chrono.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; UI.chrono.classList.toggle('urgent', s <= 15); if (chrono.reste <= 0) echec(chrono.echec, 'monter'); }
    } else if (etat === 'dialogue') { majDialogue(dt); if (!J.dansChar) { J.h.g.rotation.y += ecartAngle(J.h.g.rotation.y, J.yaw) * Math.min(1, dt * 6); animer(J.h, dt, 0); } }
    majPnj(dt);
    majCamera(dt);
    chercherInteraction();
    const e = ETAPES[ETAPE], c = e && e.cible && etat === 'jeu' ? e.cible() : null;
    repere.visible = !!c; if (c) { repere.position.set(c.x, H(c.x, c.z), c.z); losange.position.y = 3.2 + Math.sin(now / 300) * .25; losange.rotation.y = now / 600; }
    CUEILLETTE.forEach((k, i) => { if (k.g.visible) { k.g.children[3].scale.setScalar(1 + Math.sin(now / 250 + i) * .15); } });
    if (etat === 'jeu') { majMinicarte(); majObjectif(); }
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) UI.toast.classList.remove('vu'); }
  if (aideT > 0) { aideT -= dt; if (aideT <= 0) UI.aide.classList.remove('vu'); }
  const ancre = etat === 'menu' ? new T.Vector3(-20, 0, -10) : CAM.cible;
  soleil.position.copy(ancre).addScaledVector(DIR_ASTRE, 120); soleil.target.position.copy(ancre); soleil.target.updateMatrixWorld();
  ciel.position.copy(camera.position);
  rendu.render(scene, camera);
}

/* Départ : écran titre au crépuscule */
ETAPES.intro.setup(); retourMenu();
requestAnimationFrame(boucle);
window.__silenzio = { aller, charger, ETAPES, J, CHAR, PNJ, CUEILLETTE, etat: () => etat, etape: () => ETAPE, inter: () => interProche && interProche.lib(), heure };
})();
