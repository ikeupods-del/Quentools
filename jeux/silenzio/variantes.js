/* Variantes du personnage photoréaliste : un seul modèle de base (visage et corps réels), décliné en vieil homme,
   femme, grand-mère, enfant, homme fort, gros ou maigre.
   - deformer() : change la forme (proportions du corps, traits du visage) sur les positions de repos ;
   - peindreTete() / peindreCorps() : retouchent la texture de peau (teint, rides, cheveux gris, barbe, maquillage).
   Fonctions pures, sans three.js : testables hors du navigateur. Unités : mètres du jeu, personnage de 1,80 m. */

/* Repères mesurés sur le modèle (outils/carte-visage.js) */
export const REP = {
  oeil: [.034, 1.667, .098], sourcil: 1.684, nez: [0, 1.629, .143], levres: [0, 1.600, .121], menton: [0, 1.556, .11],
  front: 1.711, crane: 1.80, oreille: [.077, 1.645, .01], pivotTete: [0, 1.5084, -.0184], hanche: .9, epaule: .175
};
const lisse = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bosse = (x, c, l) => { const d = (x - c) / l; return Math.exp(-d * d); };

/* Silhouettes : proportions et traits. jambes/buste/largeur/tete = échelles ; le reste en « intensité » */
export const SILHOUETTES = {
  homme: {},
  fort: { largeur: 1.05, epaules: 1.08, epais: .006, cou: 1.12, machoire: 1.06 },
  gros: { largeur: 1.04, ventre: 1, epais: .007, cou: 1.16, joues: .7, machoire: 1.07 },
  mince: { largeur: .94, epais: -.004, joues: -.8, cou: .94 },
  vieux: { jambes: .98, buste: .96, ventre: .35, bajoues: 1.6, nez: 1.06, cou: .96, voute: .3, joues: -.4 },
  femme: { jambes: .95, buste: .92, largeur: .92, epaules: .87, hanches: 1.13, taille: .88, poitrine: 1, tete: .95, cou: .84, machoire: .9, nez: .9, femme: 1, epais: -.004 },
  vieille: { jambes: .93, buste: .88, largeur: .93, epaules: .88, hanches: 1.12, taille: .96, poitrine: .7, ventre: .3, tete: .94, cou: .86, machoire: .92, nez: .96, femme: 1, bajoues: 1.6, joues: -.4, voute: .45, epais: -.002 },
  enfant: { jambes: .64, buste: .66, largeur: .7, epaules: .9, tete: .86, cou: .74, enfant: 1, nez: .78, epais: -.003 },
  ado: { jambes: .92, buste: .88, largeur: .86, tete: .95, cou: .88, enfant: .4, nez: .92, epais: -.002 }
};
export function silhouette(nom, plus = {}) { return Object.assign({}, SILHOUETTES[nom] || {}, plus); }

/* Déformation d'un point (p : [x,y,z]) ; wt = part de la tête (0 corps, 1 tête), n = normale ou null.
   visage = true pour les maillages du visage (traits retouchés). */
export function deformerPoint(p, wt, f, n, visage) {
  let [x, y, z] = p;
  const sJ = f.jambes ?? 1, sB = f.buste ?? 1, sX = f.largeur ?? 1, sT = f.tete ?? 1, H = REP.hanche;
  // 1. Retouches locales du corps (avant changement d'échelle)
  if (wt < 1) {
    const ax = Math.abs(x), sg = Math.sign(x) || 1;
    if (f.epaules && f.epaules !== 1) { const k = lisse(1.15, 1.33, y), s = 1 + (f.epaules - 1) * k; if (ax <= REP.epaule) x *= s; else x -= sg * REP.epaule * (1 - s); }
    if (f.hanches && f.hanches !== 1 && ax < .32) { const k = bosse(y, .9, .2); x *= 1 + (f.hanches - 1) * k; z *= 1 + (f.hanches - 1) * .5 * k; }
    if (f.taille && f.taille !== 1 && ax < .2) { const k = bosse(y, 1.08, .09); x *= 1 + (f.taille - 1) * k; z = (z + .01) * (1 + (f.taille - 1) * .6 * k) - .01; }
    if (f.ventre && ax < .22) { const k = bosse(y, 1.03, .17) * f.ventre, avant = lisse(-.08, .1, z); x *= 1 + .16 * k; z += k * (.022 + .07 * avant) * Math.max(0, Math.cos(x * 6)); }
    if (f.poitrine && ax < .2 && z > 0) { for (const sx of [-1, 1]) { const d2 = ((x - sx * .085) / .065) ** 2 + ((y - 1.265) / .06) ** 2; z += f.poitrine * .042 * Math.exp(-d2) * lisse(0, .06, z); } }
    if (f.cou && f.cou !== 1 && y > 1.36 && y < 1.6 && ax < .09) { const k = lisse(1.36, 1.44, y) * (1 - lisse(1.54, 1.6, y)) * (1 - wt); x *= 1 + (f.cou - 1) * k; z = (z + .02) * (1 + (f.cou - 1) * k) - .02; }
    if (f.epais && n) { const k = (1 - wt) * (y > 1.45 && ax < .1 ? 0 : 1); x += n[0] * f.epais * k; y += n[1] * f.epais * k * .5; z += n[2] * f.epais * k; }
  }
  // 2. Traits du visage (maillages de la tête seulement)
  if (visage && wt > 0) {
    const ax = Math.abs(x), sg = Math.sign(x) || 1, devant = lisse(.02, .08, z);
    if (f.machoire && f.machoire !== 1) { const k = lisse(1.63, 1.575, y) * (1 - lisse(1.53, 1.48, y)) ; x *= 1 + (f.machoire - 1) * k; }
    if (f.nez && f.nez !== 1) { const d = Math.hypot(x / .026, (y - 1.632) / .03, (z - .13) / .03), k = Math.exp(-d * d * 1.2) * devant; const b = [0, 1.636, .108]; x = b[0] + (x - b[0]) * (1 + (f.nez - 1) * k); y = b[1] + (y - b[1]) * (1 + (f.nez - 1) * k); z = b[2] + (z - b[2]) * (1 + (f.nez - 1) * k); }
    if (f.nezCasse) { const d = Math.hypot(x / .018, (y - 1.632) / .022, (z - .135) / .02), k = Math.exp(-d * d) * devant; x += .0045 * f.nezCasse * k; z -= .0025 * f.nezCasse * k; }
    if (f.menton) { const k = Math.exp(-((x / .025) ** 2) - (((y - 1.556) / .018) ** 2)) * devant; z += .005 * f.menton * k; y -= .002 * f.menton * k; }
    if (f.levres) { const k = Math.exp(-((x / .028) ** 2) - (((y - 1.6) / .009) ** 2)) * lisse(.1, .12, z); z += .0018 * f.levres * k; }
    if (f.joues) { const k = Math.exp(-(((ax - .052) / .022) ** 2) - (((y - 1.618) / .028) ** 2)) * lisse(.0, .06, z); x += sg * .006 * f.joues * k; z += .004 * f.joues * k; }
    if (f.bajoues) { const k = Math.exp(-(((ax - .042) / .02) ** 2) - (((y - 1.582) / .02) ** 2)) * devant; y -= .004 * f.bajoues * k; x += sg * .002 * f.bajoues * k; }
    if (f.femme) {
      const ks = Math.exp(-(((y - 1.69) / .012) ** 2)) * lisse(.085, .11, z) * (1 - lisse(.06, .075, ax)); z -= .0022 * f.femme * ks; // arcade sourcilière adoucie
      const kl = Math.exp(-((x / .03) ** 2) - (((y - 1.6) / .011) ** 2)) * lisse(.1, .12, z); z += .0016 * f.femme * kl; // lèvres un peu plus pleines
    }
    if (f.enfant) { // visage d'enfant : bas du visage plus court, crâne plus rond
      const e = f.enfant, yE = REP.oeil[1];
      if (y < yE) { const k = devant * (1 - lisse(1.5, 1.46, y)); y = yE + (y - yE) * (1 - .16 * e * k); z -= .006 * e * k * lisse(yE, 1.56, y); }
      else { const k = lisse(yE, yE + .05, y); x *= 1 + .04 * e * k; z = (z - .0) * (1 + .03 * e * k); y = yE + (y - yE) * (1 + .05 * e * k); }
    }
  }
  // 3. Échelle de la tête autour du cou, puis proportions générales (jambes, buste, largeur)
  const G = (X, Y, Z) => { const yy = Y < H ? Y * sJ : H * sJ + (Y - H) * sB; return [X * sX, yy, Z * sX]; };
  let q = G(x, y, z);
  if (wt > 0) {
    const P = REP.pivotTete, Pp = G(P[0], P[1], P[2]), s = sT;
    const qt = [Pp[0] + (x - P[0]) * s, Pp[1] + (y - P[1]) * s, Pp[2] + (z - P[2]) * s];
    q = q.map((v, k) => v * (1 - wt) + qt[k] * wt);
  }
  return q;
}
/* Déforme un tableau de positions (Float32Array n*3) ; poidsTete : Float32Array n ; normales : Float32Array n*3 */
export function deformer(pos, poidsTete, normales, f, visage) {
  const out = new Float32Array(pos.length), p = [0, 0, 0], n = [0, 0, 0];
  for (let i = 0; i < pos.length; i += 3) {
    p[0] = pos[i]; p[1] = pos[i + 1]; p[2] = pos[i + 2]; if (normales) { n[0] = normales[i]; n[1] = normales[i + 1]; n[2] = normales[i + 2]; }
    const q = deformerPoint(p, poidsTete[i / 3], f, normales ? n : null, visage); out[i] = q[0]; out[i + 1] = q[1]; out[i + 2] = q[2];
  }
  return out;
}
export const hauteurDe = f => deformerPoint([0, REP.crane, 0], 1, f, null, false)[1];

/* ---------- Peinture de la peau ---------- */
const BORNES = [[-.1, .1], [1.44, 1.81], [-.1, .15]];
function hasard(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function bruit2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function bruitDoux(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); const a = bruit2(ix, iy), b = bruit2(ix + 1, iy), c = bruit2(ix, iy + 1), d = bruit2(ix + 1, iy + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const rgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const lum = (r, g, b) => .3 * r + .59 * g + .11 * b;
/* Distance d'un point (x, y) à une polyligne */
function distLigne(x, y, pts) { let m = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); m = Math.min(m, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return m; }
/* Rides : [polyligne (x, y) vue de face, largeur, profondeur] ; côté gauche, recopiées en miroir */
const RIDES = [
  ...[1.7, 1.71, 1.72].map((y, i) => [[[.0, y + .001], [.018, y], [.034, y + .0015], [.047, y + .004]], .0022, .8 - i * .15]), // front
  [[[.004, 1.688], [.008, 1.695]], .0014, .6], // ride du lion
  [[[.019, 1.63], [.028, 1.617], [.034, 1.603], [.037, 1.59]], .0038, 1], // sillon nez - bouche
  [[[.028, 1.596], [.03, 1.583], [.033, 1.57]], .0024, .7], // ride d'amertume
  [[[.06, 1.673], [.072, 1.679]], .0014, .7], [[[.061, 1.667], [.074, 1.667]], .0014, .7], [[[.06, 1.661], [.071, 1.654]], .0014, .7], // pattes d'oie
  [[[.022, 1.655], [.034, 1.65], [.048, 1.654]], .0028, .8], // poche sous l'œil
  [[[.0, 1.5], [.03, 1.502], [.05, 1.508]], .003, .5], [[[.0, 1.522], [.03, 1.524], [.05, 1.53]], .0026, .4] // cou
].map(([pts, l, p]) => [pts, l, p, Math.min(...pts.map(q => q[0])) - l * 3, Math.max(...pts.map(q => q[0])) + l * 3, Math.min(...pts.map(q => q[1])) - l * 3, Math.max(...pts.map(q => q[1])) + l * 3]);
const POS = new Map();
function positions(pos, W, Hh) {
  if (POS.has(W)) return POS.get(W);
  const PW = pos.width, ech = PW / W, out = new Float32Array(W * Hh * 4);
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) { const qi = (Math.min(PW - 1, (py * ech) | 0) * PW + Math.min(PW - 1, (px * ech) | 0)) * 4, o = (py * W + px) * 4; out[o + 3] = pos.data[qi + 3] ? 1 : 0; for (let k = 0; k < 3; k++) out[o + k] = BORNES[k][0] + pos.data[qi + k] / 255 * (BORNES[k][1] - BORNES[k][0]); }
  POS.set(W, out); return out;
}
/* Zones de la barbe et de la moustache (0 à 1) selon la position sur le visage */
export function zoneBarbe(x, y, z) {
  const ax = Math.abs(x), levres = Math.exp(-((x / .028) ** 2) - (((y - 1.6) / .0085) ** 2)), haut = 1.603 + lisse(.028, .068, ax) * .06;
  return lisse(haut + .006, haut - .006, y) * lisse(1.5, 1.525, y) * (1 - levres) * lisse(.074, .064, ax) * lisse(-.02, .01, z);
}
export const zoneMoustache = (x, y, z) => Math.exp(-((x / .03) ** 2) - (((y - 1.613) / .0055) ** 2)) * lisse(.11, .125, z);
/* Ligne des cheveux : front au milieu, tempes plus basses, nuque derrière les oreilles */
export function partCheveux(x, y, z) {
  const ax = Math.abs(x), hl = 1.737 - lisse(.035, .075, ax) * .055;
  const devant = lisse(hl - .006, hl + .006, y), nuque = lisse(.05, .025, z) * lisse(1.585, 1.605, y), tempe = lisse(.07, .085, ax) * lisse(1.672, 1.685, y);
  const oreille = lisse(.066, .072, ax) * (1 - lisse(1.676, 1.685, y)) * lisse(-.015, -.005, z) * (1 - lisse(.035, .045, z));
  return Math.max(devant, nuque, tempe) * (1 - oreille);
}
/* src : {data RGBA, width, height} de la texture de la tête ; pos : carte des positions (outils/carte-visage.js) ;
   nrm : texture normale (même taille que src) ou null. Renvoie { couleur, normale } (Uint8ClampedArray RGBA). */
export function peindreTete(src, pos, o = {}, nrm = null) {
  const W = src.width, Hh = src.height, d = src.data, out = new Uint8ClampedArray(d), PP = positions(pos, W, Hh);
  const age = o.age || 0, femme = o.femme || 0, enfant = o.enfant || 0, alea = hasard(o.graine || 7);
  const REF = [205, 162, 140], cible = o.peau != null ? rgb(o.peau) : null, fT = cible ? [cible[0] / REF[0], cible[1] / REF[1], cible[2] / REF[2]] : [1, 1, 1];
  const cheveux = o.cheveux != null ? rgb(o.cheveux) : null, gris = o.gris || 0, barbe = o.barbe || 0, bc = rgb(o.barbeC ?? o.cheveux ?? 0x1a120c);
  const hgt = new Float32Array(W * Hh), taches = [];
  if (age > .3) for (let i = 0; i < 12 * age; i++) taches.push([(alea() - .5) * .12, 1.63 + alea() * .1, .002 + alea() * .003, .3 + alea() * .4]);
  const peauBase = cible ? cible : REF, GRIS = [168, 163, 156];
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    const k4 = (py * W + px) * 4; if (!PP[k4 + 3]) continue;
    const x = PP[k4], y = PP[k4 + 1], z = PP[k4 + 2], ax = Math.abs(x), i = k4;
    let r = d[i], g = d[i + 1], b = d[i + 2]; const L = lum(r, g, b);
    const h = partCheveux(x, y, z) * lisse(150, 112, L);
    // Teint
    const mT = 1 - h; r *= 1 + (fT[0] - 1) * mT; g *= 1 + (fT[1] - 1) * mT; b *= 1 + (fT[2] - 1) * mT;
    // Joues rosées (femme, enfant)
    if ((femme || enfant) && h < .5) { const jo = Math.exp(-(((ax - .05) / .02) ** 2) - (((y - 1.632) / .016) ** 2)) * lisse(.02, .07, z) * (1 - h); r += (14 * enfant + 10 * femme) * jo; g -= 3 * jo; b -= 1 * jo; }
    // Rides et vieillissement
    if (age && h < .6 && z > -.03 && y > 1.49 && y < 1.735) {
      let ride = 0;
      for (const [pts, l, p, x0, x1, y0, y1] of RIDES) { if (ax < x0 || ax > x1 || y < y0 || y > y1) continue; const dd = distLigne(ax, y, pts); ride = Math.max(ride, p * Math.exp(-((dd / l) ** 2))); }
      const face = Math.min(1, lisse(.055, .09, z) + lisse(1.49, 1.54, y) * (1 - lisse(1.54, 1.56, y)) + (ax > .055 ? lisse(.05, .075, z) : 0) + .15);
      ride *= face * age;
      const pores = (bruitDoux(px * .45, py * .45) - .5) * 8 * age, k = 1 - ride * .24;
      r = r * k + pores; g = g * k + pores; b = b * k + pores;
      hgt[py * W + px] = -ride;
      for (const [tx, ty, tr, ti] of taches) { const dd = Math.hypot(x - tx, y - ty); if (dd < tr && z > .05) { const t = (1 - dd / tr) ** .7 * ti * age; r -= 22 * t; g -= 28 * t; b -= 30 * t; } }
      const gl = lum(r, g, b); r += (gl - r) * .1 * age + 3 * age; g += (gl - g) * .1 * age; b += (gl - b) * .14 * age - 3 * age;
      const kl = Math.exp(-((x / .027) ** 2) - (((y - 1.6) / .009) ** 2)) * lisse(.11, .12, z); r -= 12 * kl * age; b += 4 * kl * age;
    }
    // Cheveux : couleur, gris, crâne dégarni, rasé
    if (h > .02) {
      const l = Math.min(1.5, L / 85);
      let hr = r, hg = g, hb = b;
      if (cheveux) { hr = cheveux[0] * l; hg = cheveux[1] * l; hb = cheveux[2] * l; }
      if (gris) { const sel = Math.min(1, gris * (.75 + bruitDoux(px * .06, py * .02) * .5)), gl = Math.pow(l, .7); hr += (GRIS[0] * gl - hr) * sel; hg += (GRIS[1] * gl - hg) * sel; hb += (GRIS[2] * gl - hb) * sel; }
      let nu = 0; // part de crâne nu
      if (o.chauve) nu = lisse(1.71, 1.74, y) * lisse(-.07, .0, z);
      if (o.recul) nu = Math.max(nu, lisse(1.728, 1.75, y) * lisse(.0, .08, z) * (1 - lisse(.03, .06, ax) * .7) * o.recul);
      if (o.rase) nu = 1;
      if (nu > 0) {
        const sk = [peauBase[0] * 1.02, peauBase[1] * .98, peauBase[2] * .97];
        if (o.rase) { const dens = .45 * (bruit2(px * 3.1, py * 2.7) * .6 + .4) * (o.rase === true ? 1 : o.rase); for (let c = 0; c < 3; c++) sk[c] = sk[c] * (1 - dens) + bc[c] * dens * .6 + sk[c] * dens * .4 * 0; }
        hr += (sk[0] - hr) * nu; hg += (sk[1] - hg) * nu; hb += (sk[2] - hb) * nu;
        if (!o.rase) hgt[py * W + px] = 0;
      }
      r += (hr - r) * h; g += (hg - g) * h; b += (hb - b) * h;
    }
    // Sourcils (gris avec l'âge, affinés pour une femme)
    const ksourcil = lisse(.075, .09, z) * Math.exp(-(((y - 1.686) / .008) ** 2)) * lisse(.01, .018, ax) * (1 - lisse(.062, .07, ax)) * lisse(140, 105, L);
    if (ksourcil > .01) {
      if (femme) { const yA = 1.6885 + .0045 * (1 - ((ax - .041) / .024) ** 2), fin = Math.exp(-(((y - yA) / .0016) ** 2)) * lisse(.017, .022, ax) * (1 - lisse(.06, .066, ax)); const t = ksourcil * (1 - fin) * femme; r += (peauBase[0] * .96 - r) * t; g += (peauBase[1] * .93 - g) * t; b += (peauBase[2] * .92 - b) * t; }
      if (gris > .3) { const t = ksourcil * (gris - .2) * .8; r += (180 - r) * t; g += (175 - g) * t; b += (168 - b) * t; }
      else if (cheveux) { const l = L / 95; r += (cheveux[0] * l - r) * ksourcil * .6; g += (cheveux[1] * l - g) * ksourcil * .6; b += (cheveux[2] * l - b) * ksourcil * .6; }
    }
    // Barbe : de la barbe naissante (0,3) à la barbe pleine (1) ; moustache seule possible
    if ((barbe || o.moust) && z > -.03 && y < 1.68 && y > 1.47) {
      const zone = barbe ? zoneBarbe(x, y, z) : 0, moust = zoneMoustache(x, y, z) * Math.max(barbe, o.moust || 0);
      const brin = bruit2(Math.floor(px * .9), Math.floor(py * .22)) * .55 + bruit2(px, py) * .25 + .2;
      const dens = Math.min(1, Math.max(zone * barbe, moust * 1.2)) * brin;
      const t = Math.min(.95, dens * 1.2), l = .75 + bruit2(px * 1.3, py * .7) * .45;
      r += (bc[0] * l - r) * t; g += (bc[1] * l - g) * t; b += (bc[2] * l - b) * t;
      if (barbe > .6) hgt[py * W + px] += dens * .5 * (brin - .5);
    }
    // Maquillage
    if (femme) {
      const kl = Math.exp(-((x / .026) ** 2) - (((y - 1.6) / .0085) ** 2)) * lisse(.112, .124, z); const ro = o.levres ? rgb(o.levres) : [150, 52, 56];
      r += (ro[0] - r) * kl * .5 * femme; g += (ro[1] - g) * kl * .5 * femme; b += (ro[2] - b) * kl * .5 * femme;
      const de = Math.hypot((ax - .035) / .019, (y - 1.6665) / .0068), liner = Math.exp(-(((de - 1) / .16) ** 2)) * (y > 1.664 ? 1 : .3) * lisse(.085, .095, z);
      const fard = Math.exp(-(((ax - .036) / .016) ** 2) - (((y - 1.676) / .006) ** 2)) * lisse(.085, .095, z);
      const t1 = liner * .6 * femme, t2 = fard * .25 * femme; r = r * (1 - t1) + 34 * t1; g = g * (1 - t1) + 24 * t1; b = b * (1 - t1) + 22 * t1; r -= 26 * t2; g -= 32 * t2; b -= 26 * t2;
    }
    // Yeux enfoncés : ombre de la ligne des cils et du creux de l'orbite (tout le monde)
    { const de = Math.hypot((ax - .035) / .019, (y - 1.6665) / .0068), ligne = Math.exp(-(((de - 1) / .2) ** 2)) * (y > 1.664 ? 1 : .45) * lisse(.085, .095, z), creux = Math.exp(-(((ax - .036) / .02) ** 2) - (((y - 1.674) / .007) ** 2)) * lisse(.08, .095, z);
      const k = 1 - .2 * ligne - .07 * creux; r *= k; g *= k * .99; b *= k * .985; }
    if (enfant) { const kl = Math.exp(-((x / .026) ** 2) - (((y - 1.6) / .009) ** 2)) * lisse(.112, .124, z); r += 10 * kl * enfant; g -= 6 * kl * enfant; }
    if (o.hale) { const t = o.hale * (1 - h); r *= 1 - .08 * t; g *= 1 - .15 * t; b *= 1 - .22 * t; }
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  const lis = Math.max(femme * .6, enfant * .8);
  if (lis) flouPeau(out, W, Hh, PP, lis);
  let normale = null;
  if (nrm) {
    normale = new Uint8ClampedArray(nrm.data);
    const fort = 110;
    // Grain de peau (pores) sur le visage et le cou, hors cheveux et yeux : évite l'aspect lisse et flou des gros plans
    for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) { const k = py * W + px, o = k * 4; if (!PP[o + 3] || hgt[k]) continue; const y = PP[o + 1], z = PP[o + 2]; if (y > 1.735 || z < -.02) continue; hgt[k] = (bruit2(px, py) - .5) * .05 * (1 - age * .3); }
    for (let py = 1; py < Hh - 1; py++) for (let px = 1; px < W - 1; px++) { const k = py * W + px, dx = hgt[k + 1] - hgt[k - 1], dy = hgt[k + W] - hgt[k - W]; if (!dx && !dy) continue; const i = k * 4; normale[i] -= dx * fort; normale[i + 1] -= dy * fort; }
    if (lis) for (let i = 0; i < normale.length; i += 4) { normale[i] = 128 + (normale[i] - 128) * (1 - lis * .5); normale[i + 1] = 128 + (normale[i + 1] - 128) * (1 - lis * .5); }
  }
  return { couleur: out, normale };
}
function flouPeau(px, W, H, PP, f) {
  const src = new Uint8ClampedArray(px), R = 2;
  for (let y = R; y < H - R; y++) for (let x = R; x < W - R; x++) {
    const o = (y * W + x) * 4; if (!PP[o + 3]) continue;
    const X = PP[o], Y = PP[o + 1], Z = PP[o + 2];
    if (Y > 1.725 || Z < .02) continue; // ni cheveux ni nuque
    if (Math.hypot((Math.abs(X) - .035) / .024, (Y - 1.672) / .02) < 1) continue; // yeux
    let s0 = 0, s1 = 0, s2 = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const j = ((y + dy) * W + x + dx) * 4; s0 += src[j]; s1 += src[j + 1]; s2 += src[j + 2]; n++; }
    px[o] += (s0 / n - px[o]) * f; px[o + 1] += (s1 / n - px[o + 1]) * f; px[o + 2] += (s2 / n - px[o + 2]) * f;
  }
}
/* Texture du corps (bras, mains, cou) : même teint que la tête ; taches de vieillesse sur les mains */
export function peindreCorps(src, o = {}) {
  const d = new Uint8ClampedArray(src.data), REF = [205, 162, 140], cible = o.peau != null ? rgb(o.peau) : null, age = o.age || 0;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (cible) { r *= cible[0] / REF[0]; g *= cible[1] / REF[1]; b *= cible[2] / REF[2]; }
    if (age) { const p = i / 4, x = p % src.width, y = (p / src.width) | 0, n = bruitDoux(x * .05, y * .05); if (n > .78) { const t = (n - .78) * 4 * age; r -= 30 * t; g -= 36 * t; b -= 40 * t; } const gl = lum(r, g, b); r += (gl - r) * .15 * age; g += (gl - g) * .15 * age; b += (gl - b) * .2 * age; }
    if (o.hale) { r *= 1 - .1 * o.hale; g *= 1 - .18 * o.hale; b *= 1 - .26 * o.hale; }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return d;
}
/* Iris : couleur des yeux (texture de l'œil, iris au centre) */
export function peindreOeil(src, couleur) {
  const d = new Uint8ClampedArray(src.data), W = src.width, c = rgb(couleur), cx = W / 2, cy = src.height * .6, R = W * .1;
  // Blanc de l'œil moins blanc, plus sombre vers les bords (il est dans l'ombre des paupières)
  for (let y = Math.round(src.height * .2); y < src.height; y++) for (let x = 0; x < W; x++) { const r = Math.hypot(x - cx, y - cy) / R; if (r < 1.3) continue; const i = (y * W + x) * 4, k = .9 - Math.min(.25, (r - 1.3) * .06); d[i] *= k; d[i + 1] *= k * .97; d[i + 2] *= k * .95; }
  for (let y = 0; y < src.height; y++) for (let x = 0; x < W; x++) { const r = Math.hypot(x - cx, y - cy) / R; if (r > 1.25 || r < .55) continue; const t = Math.min(1, (1.25 - r) * 4) * Math.min(1, (r - .55) * 6), i = (y * W + x) * 4, l = lum(d[i], d[i + 1], d[i + 2]) / 160; d[i] += (c[0] * l - d[i]) * t; d[i + 1] += (c[1] * l - d[i + 1]) * t; d[i + 2] += (c[2] * l - d[i + 2]) * t; }
  return d;
}
