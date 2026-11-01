/* Matières du jeu fabriquées par le programme (aucune image externe) : couleur, relief (carte de normales)
   et rugosité, toutes raccordables (elles se répètent sans couture). Calculées une fois au chargement. */
import * as T from 'three';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function h3(x, y, s) { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
const mod = (a, p) => ((a % p) + p) % p;
function bruitP(x, y, p, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = mod(xi, p), x1 = mod(xi + 1, p), y0 = mod(yi, p), y1 = mod(yi + 1, p);
  return lerp(lerp(h3(x0, y0, s), h3(x1, y0, s), u), lerp(h3(x0, y1, s), h3(x1, y1, s), u), v);
}
/* Bruit fractal raccordable : u, v dans [0, 1), période p (entier) */
export function fbm(u, v, p, oct = 4, s = 0) { let a = 0, amp = .5, f = 1, t = 0; for (let o = 0; o < oct; o++) { a += amp * bruitP(u * p * f, v * p * f, p * f, s + o * 17); t += amp; amp *= .5; f *= 2; } return a / t; }
/* Cellules (pierres, pavés, cailloux) raccordables */
function cellules(u, v, nx, ny, s, decal = 0) {
  const x = u * nx, y = v * ny, xi = Math.floor(x), yi = Math.floor(y); let d1 = 9, d2 = 9, id = 0, cx0 = 0, cy0 = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = xi + dx, cy = yi + dy, wx = mod(cx, nx), wy = mod(cy, ny);
    const px = cx + .15 + .7 * h3(wx, wy, s) + (decal && (wy & 1) ? .5 : 0), py = cy + .15 + .7 * h3(wx, wy, s + 1);
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = h3(wx, wy, s + 2); cx0 = px; cy0 = py; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id, cx: cx0, cy: cy0 };
}

function fabrique(n, f, force = 2) {
  const H = new Float32Array(n * n), C = new Uint8ClampedArray(n * n * 4), Rg = new Uint8ClampedArray(n * n * 4), o = { h: 0, r: 1, g: 1, b: 1, ru: .85 };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    o.h = 0; o.r = o.g = o.b = 1; o.ru = .85; f(x / n, y / n, o);
    const i = y * n + x; H[i] = o.h;
    C[i * 4] = o.r * 255; C[i * 4 + 1] = o.g * 255; C[i * 4 + 2] = o.b * 255; C[i * 4 + 3] = 255;
    Rg[i * 4] = Rg[i * 4 + 1] = Rg[i * 4 + 2] = o.ru * 255; Rg[i * 4 + 3] = 255;
  }
  const N = new Uint8ClampedArray(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H[y * n + (x + 1) % n] - H[y * n + (x - 1 + n) % n]) * force * n / 256, dy = (H[((y + 1) % n) * n + x] - H[((y - 1 + n) % n) * n + x]) * force * n / 256;
    const l = Math.hypot(dx, dy, 1), i = (y * n + x) * 4;
    N[i] = (-dx / l * .5 + .5) * 255; N[i + 1] = (dy / l * .5 + .5) * 255; N[i + 2] = (1 / l * .5 + .5) * 255; N[i + 3] = 255;
  }
  const tex = (data, srgb) => { const c = document.createElement('canvas'); c.width = c.height = n; c.getContext('2d').putImageData(new ImageData(data, n, n), 0, 0); const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; if (srgb) t.colorSpace = T.SRGBColorSpace; return t; };
  return { map: tex(C, true), normalMap: tex(N), roughnessMap: tex(Rg) };
}
const gris = (o, v) => { o.r = o.g = o.b = v; };

/* Enduit à la chaux : taches, coulures, éclats laissant voir la pierre */
function enduit(u, v, o) {
  const m = fbm(u, v, 4, 5, 1), fin = fbm(u, v, 32, 3, 2), eclat = fbm(u, v, 2, 5, 3), coul = fbm(u * 1, v * .15, 6, 3, 4);
  let c = .9 + (m - .5) * .16 + (fin - .5) * .05 - lisse(.5, .8, coul) * .08;
  o.h = fin * .4 + m * .2;
  if (eclat > .7) { const p = cellules(u, v, 10, 14, 9, 1), t = lisse(.7, .74, eclat) * .85; o.h = lerp(o.h, .1 + (1 - p.d1) * .3 - (p.d2 - p.d1 < .06 ? .2 : 0), t); c = lerp(c, .74 + p.id * .14, t); o.ru = .95; }
  o.r = c; o.g = c * .985; o.b = c * .955; o.ru = .88 + fin * .1;
}
/* Pierre de taille (tuf doré de Sicile) en assises régulières */
function pierre(u, v, o) {
  const rangs = 7, y = v * rangs + (fbm(u, v, 4, 2, 9) - .5) * .12, r = Math.floor(y), fy = y - r, larg = 2 + Math.floor(h3(mod(r, rangs), 0, 5) * 2), x = u * larg + h3(mod(r, rangs), 1, 5) * 7 + (fbm(u, v, 6, 2, 10) - .5) * .1, bloc = Math.floor(x), fx = x - bloc;
  const id = h3(mod(bloc, larg), mod(r, rangs), 6), joint = Math.min(fx, 1 - fx) * larg / 3 < .022 || Math.min(fy, 1 - fy) < .035;
  const n = fbm(u, v, 16, 4, 7), g = fbm(u, v, 3, 3, 8);
  o.h = joint ? 0 : .55 + n * .35 + lisse(0, .12, Math.min(fx, 1 - fx, fy, 1 - fy)) * .15;
  const c = joint ? .7 : .74 + id * .2 + (n - .5) * .2 - g * .1, chaud = .9 + h3(mod(bloc, larg), mod(r, rangs), 14) * .1;
  o.r = c * 1.02; o.g = c * .88 * chaud; o.b = c * .68 * chaud; o.ru = joint ? 1 : .82 + n * .15;
}
/* Tuiles canal (coppi) : colonnes bombées qui se recouvrent */
function tuiles(u, v, o) {
  const col = 6, rang = 5, x = u * col, c0 = Math.floor(x), fx = x - c0, y = v * rang + (c0 & 1) * .5, r0 = Math.floor(y), fy = y - r0;
  const bombe = Math.sqrt(Math.max(0, 1 - Math.pow((fx - .5) * 2, 2)));
  const id = h3(mod(c0, col), mod(r0, rang * 2), 11), n = fbm(u, v, 12, 4, 12), lichen = fbm(u, v, 5, 4, 13);
  o.h = bombe * .7 + fy * .25 + n * .06;
  let r = .62 + id * .16, g = .3 + id * .08, b = .2 + id * .05;
  const ombre = lerp(.55, 1, lisse(0, .25, fy)) * lerp(.45, 1, bombe);
  if (lichen > .62) { const t = lisse(.62, .75, lichen); r = lerp(r, .42, t); g = lerp(g, .4, t); b = lerp(b, .3, t); }
  o.r = r * ombre; o.g = g * ombre; o.b = b * ombre; o.ru = .72 + n * .2;
}
/* Pavés de calcaire usés */
function paves(u, v, o) {
  const p = cellules(u, v, 7, 7, 21), bord = p.d2 - p.d1, n = fbm(u, v, 16, 3, 22);
  const joint = lisse(.02, .12, bord);
  o.h = joint * (.6 + (1 - p.d1) * .3) + n * .08;
  const c = lerp(.32, .66 + p.id * .2 + (n - .5) * .1, joint);
  o.r = c; o.g = c * .95; o.b = c * .86; o.ru = lerp(1, .55 + n * .25, joint);
}
/* Terre sèche, cailloux et brindilles (teinte neutre : la couleur vient du sol) */
function sol(u, v, o) {
  const n = fbm(u, v, 8, 5, 31), cail = cellules(u, v, 18, 18, 32), f = fbm(u, v, 40, 2, 33);
  const pierreuse = cail.id > .86 && cail.d1 < .22;
  o.h = n * .5 + f * .15 + (pierreuse ? (.22 - cail.d1) * 1.4 : 0);
  gris(o, .82 + (n - .5) * .3 + (f - .5) * .12 + (pierreuse ? .03 : 0)); o.ru = .95;
}
/* Bois peint écaillé (portes, volets, carretto) */
function bois(u, v, o) {
  const planche = Math.floor(u * 5), fx = u * 5 - planche, fil = fbm(u * .2 + planche * .13, v, 20, 4, 41 + planche), ec = fbm(u, v, 6, 5, 42);
  const fente = Math.min(fx, 1 - fx) < .04;
  const nu = ec > .7;
  o.h = fente ? 0 : .5 + fil * .3 + (nu ? -.12 : 0);
  if (nu) { o.r = .7 + fil * .1; o.g = .62 + fil * .08; o.b = .5; o.ru = .95; } else { gris(o, .86 + (fil - .5) * .12); o.ru = .7; }
  if (fente) { gris(o, .25); }
}
/* Écorce */
function ecorce(u, v, o) { const n = fbm(u * 2, v * .25, 10, 5, 51), s = fbm(u, v, 24, 3, 52); o.h = n * .8 + s * .2; const c = .3 + n * .25; o.r = c; o.g = c * .92; o.b = c * .82; o.ru = .95; }
/* Toile tissée (vêtements) : surtout du relief */
function tissu(u, v, o) { const a = Math.sin(u * Math.PI * 2 * 64), b = Math.sin(v * Math.PI * 2 * 64), n = fbm(u, v, 8, 3, 61); o.h = (a * .5 + .5) * (b > 0 ? 1 : .6) * .5 + n * .2; gris(o, .9 + (n - .5) * .12 + a * .02); o.ru = .9; }

/* Feuillages : bouquets de feuilles sur fond transparent */
function feuillage(n, o) {
  const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d');
  let s = o.graine || 1; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < o.nombre; i++) {
    const cx = n * (.12 + r() * .76), cy = n * (.12 + r() * .76), dc = Math.hypot(cx - n / 2, cy - n / 2) / (n / 2);
    if (dc > .95) continue;
    const ang = r() * Math.PI * 2, L = n * o.longueur * (.7 + r() * .5), l = L * o.largeur;
    const t = r(), base = o.couleurs[(r() * o.couleurs.length) | 0];
    x.save(); x.translate(cx, cy); x.rotate(ang);
    x.fillStyle = `rgb(${base.map(k => Math.round(k * (.75 + t * .35))).join(',')})`;
    x.beginPath(); x.ellipse(0, 0, L / 2, l / 2, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = `rgba(255,255,230,${.18 + t * .12})`; x.lineWidth = Math.max(1, n / 512); x.beginPath(); x.moveTo(-L / 2, 0); x.lineTo(L / 2, 0); x.stroke();
    x.restore();
  }
  if (o.fruits) for (let i = 0; i < o.fruits; i++) { const cx = n * (.25 + r() * .5), cy = n * (.25 + r() * .5), rr = n * .028; const g = x.createRadialGradient(cx - rr * .3, cy - rr * .3, 1, cx, cy, rr); g.addColorStop(0, '#fff3a0'); g.addColorStop(.6, '#e8c02c'); g.addColorStop(1, '#a8801a'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rr * 1.15, rr, r() * 3, 0, Math.PI * 2); x.fill(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
/* Raquette de figuier de Barbarie : vert cireux, aréoles et épines */
function raquette(u, v, o) { const p = cellules(u, v, 9, 9, 71), n = fbm(u, v, 6, 4, 72); o.h = n * .4 + (p.d1 < .07 ? .6 : 0); const c = .5 + n * .2; o.r = c * .62; o.g = c * .92; o.b = c * .5; if (p.d1 < .07) { o.r = .85; o.g = .8; o.b = .6; } o.ru = .55; }


/* Peau du visage, dans les coordonnées de la sphère de la tête (u = tour, v = du haut vers le bas) :
   joues, orbites, lèvres, barbe naissante, rides. La teinte vient du matériau. */
function visage(type) {
  const ex = (a, b) => Math.exp(-a * a - b * b), homme = type !== 'femme', vieux = type === 'vieux';
  return (u, v, o) => {
    const ph = u * Math.PI * 2, th = v * Math.PI, x = -Math.cos(ph) * Math.sin(th), y = Math.cos(th), z = Math.sin(ph) * Math.sin(th), ax = Math.abs(x);
    const n = fbm(u, v, 24, 3, 81), f = fbm(u, v, 96, 2, 82);
    let r = .97 + (n - .5) * .07, g = r, b = r;
    const face = lisse(.05, .45, z);
    const joue = ex((ax - .52) / .2, (y + .14) / .2) * face; g -= joue * .1; b -= joue * .11;
    const orb = ex((ax - .32) / .12, (y - .07) / .09) * face; r -= orb * .12; g -= orb * .14; b -= orb * .08;
    const nez = ex(x / .07, (y + .26) / .07) * face; g -= nez * .06; b -= nez * .06;
    const levre = ex(x / (homme ? .17 : .19), (y + .455) / .045) * face;
    const lr = homme ? [.8, .55, .52] : [.78, .36, .36];
    r = lerp(r, lr[0], levre * .85); g = lerp(g, lr[1], levre * .85); b = lerp(b, lr[2], levre * .85);
    o.h = n * .25 + f * .12 - levre * .1;
    if (homme) {
      const zone = (lisse(-.2, -.42, y) * lisse(.05, .5, z) + lisse(.55, .75, ax) * lisse(.2, -.3, y) * lisse(.1, -.4, -z)) * (1 - levre);
      const poil = f > .5 ? 1 : .3; const k = clamp(zone, 0, 1) * poil * (vieux ? .16 : .26);
      r -= k; g -= k * 1.02; b -= k * .92;
    }
    if (vieux) { const ride = (Math.sin(y * 140) * .5 + .5) * lisse(.28, .4, y) * lisse(.6, .45, y) * face + (Math.sin((ax * 3 + y) * 90) * .5 + .5) * ex((ax - .52) / .08, (y - .06) / .1) * face; o.h -= ride * .25; r -= ride * .04; g -= ride * .05; b -= ride * .05; }
    o.r = r; o.g = g; o.b = b; o.ru = .5 + n * .15 + levre * -.15;
  };
}
/* Grain de peau (pores et ridules), raccordable */
function pores(u, v, o) { const n = fbm(u, v, 32, 3, 95), p = cellules(u, v, 40, 40, 96); o.h = n * .5 + Math.min(1, p.d1 * 3) * .4; gris(o, .97 + (n - .5) * .05); o.ru = .5 + n * .2; }
/* Mèches de cheveux (le long de v) */
function meches(u, v, o) { const m = bruitP(u * 90, v * 4, 90, 91) * .6 + bruitP(u * 180, v * 6, 180, 92) * .4; o.h = m; gris(o, .8 + m * .35); o.ru = .5 + (1 - m) * .2; }
/* Image pieuse (Vierge au manteau bleu, auréole dorée) pour les autels de bord de route */
function imagePieuse() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 192; const x = c.getContext('2d');
  const fond = x.createLinearGradient(0, 0, 0, 192); fond.addColorStop(0, '#2d4a7a'); fond.addColorStop(1, '#16243e'); x.fillStyle = fond; x.fillRect(0, 0, 128, 192);
  x.fillStyle = '#d8b04a'; x.beginPath(); x.arc(64, 52, 30, 0, 7); x.fill();
  x.fillStyle = '#e6c8a6'; x.beginPath(); x.ellipse(64, 56, 13, 16, 0, 0, 7); x.fill();
  x.fillStyle = '#244f9e'; x.beginPath(); x.moveTo(64, 40); x.bezierCurveTo(26, 60, 22, 170, 30, 186); x.lineTo(98, 186); x.bezierCurveTo(106, 170, 102, 60, 64, 40); x.fill();
  x.fillStyle = '#b8323a'; x.beginPath(); x.moveTo(64, 80); x.bezierCurveTo(48, 110, 46, 170, 50, 186); x.lineTo(78, 186); x.bezierCurveTo(82, 170, 80, 110, 64, 80); x.fill();
  x.strokeStyle = '#d8b04a'; x.lineWidth = 6; x.strokeRect(3, 3, 122, 186);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

/* Drapeau de la Sicile : diagonale rouge et jaune, Trinacria au centre (tête de Méduse, trois jambes, épis de blé) */
export function texDrapeau() {
  const W = 600, Hh = 400, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d');
  x.fillStyle = '#c4161c'; x.beginPath(); x.moveTo(0, 0); x.lineTo(W, 0); x.lineTo(0, Hh); x.fill();
  x.fillStyle = '#f4c21a'; x.beginPath(); x.moveTo(W, 0); x.lineTo(W, Hh); x.lineTo(0, Hh); x.fill();
  x.translate(W / 2, Hh / 2); x.lineCap = x.lineJoin = 'round';
  for (let k = 0; k < 3; k++) {
    x.save(); x.rotate(k * Math.PI * 2 / 3 + .35);
    for (const [lw, col] of [[34, '#6a3a1e'], [26, '#ecc89c']]) { x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.moveTo(0, -10); x.lineTo(0, -98); x.lineTo(62, -128); x.stroke(); x.lineWidth = lw * .7; x.beginPath(); x.moveTo(62, -128); x.lineTo(92, -116); x.stroke(); }
    x.restore();
    x.save(); x.rotate(k * Math.PI * 2 / 3 + Math.PI / 3 + .35);
    x.strokeStyle = '#b8860b'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -48); x.lineTo(0, -92); x.stroke();
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#e8b830' : '#d4a020'; x.beginPath(); x.ellipse(i % 2 ? 6 : -6, -60 - i * 6, 5, 9, i % 2 ? .4 : -.4, 0, 7); x.fill(); }
    x.restore();
  }
  for (const sx of [-1, 1]) { x.fillStyle = '#f2ead8'; x.beginPath(); x.ellipse(sx * 44, -26, 18, 9, sx * -.5, 0, 7); x.fill(); x.strokeStyle = '#8a7a6a'; x.lineWidth = 2; x.stroke(); }
  x.strokeStyle = '#3a5a2a'; x.lineWidth = 5;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); x.quadraticCurveTo(Math.cos(a + .3) * 56, Math.sin(a + .3) * 56, Math.cos(a) * 64, Math.sin(a) * 64); x.stroke(); }
  x.fillStyle = '#ecc89c'; x.strokeStyle = '#6a3a1e'; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 42, 0, 7); x.fill(); x.stroke();
  x.fillStyle = '#3a2214'; for (const sx of [-1, 1]) { x.beginPath(); x.ellipse(sx * 14, -6, 5, 3.5, 0, 0, 7); x.fill(); x.fillRect(sx * 14 - 8, -16, 16, 3); }
  x.strokeStyle = '#6a3a1e'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -2); x.lineTo(-3, 12); x.lineTo(3, 13); x.stroke(); x.beginPath(); x.arc(0, 20, 9, .2, Math.PI - .2); x.stroke();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* Salissures (canal alpha) : coulures de pluie sous les appuis, crasse au pied des murs */
function salissure(type) {
  const W = 128, Hh = 256, c = document.createElement('canvas'); c.width = W; c.height = Hh; const x = c.getContext('2d'); const im = x.createImageData(W, Hh);
  for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
    const u = i / W, v = j / Hh, n = fbm(u, v * .5, 8, 4, 101), k = (j * W + i) * 4;
    let a;
    if (type === 'coulure') { const col = fbm(u * 1.5, 0, 16, 2, 102), larg = Math.min(1, Math.max(0, (col - .38) * 3)); a = larg * Math.pow(1 - v, 1.4) * (.5 + n * .6) * Math.min(1, u * 8, (1 - u) * 8); }
    else a = Math.pow(v, 2.2) * (.55 + n * .6) * (1 - Math.max(0, .5 - n) * .8);
    im.data[k] = 46; im.data[k + 1] = 38; im.data[k + 2] = 30; im.data[k + 3] = Math.max(0, Math.min(255, a * 200));
  }
  x.putImageData(im, 0, 0); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
const VISAGES = {};
export function texVisage(type, aniso = 4) {
  if (!VISAGES[type]) { const t = fabrique(256, visage(type), 1.1); for (const k in t) t[k].anisotropy = aniso; VISAGES[type] = t; }
  return VISAGES[type];
}

export function fabriquerTextures(qualite, aniso) {
  const n = qualite === 'basse' ? 256 : 512;
  const t = {
    enduit: fabrique(n, enduit, 1.6), pierre: fabrique(n, pierre, 2.6), tuiles: fabrique(n, tuiles, 3.2), paves: fabrique(n, paves, 3),
    sol: fabrique(n, sol, 2.4), bois: fabrique(n, bois, 2), ecorce: fabrique(n / 2, ecorce, 3), tissu: fabrique(n / 2, tissu, 1.2), raquette: fabrique(n / 2, raquette, 2),
    citronnier: feuillage(n, { nombre: 520, longueur: .075, largeur: .42, couleurs: [[52, 78, 32], [64, 92, 38], [42, 66, 28], [74, 100, 44]], graine: 7 }),
    olivier: feuillage(n, { nombre: 420, longueur: .085, largeur: .22, couleurs: [[112, 124, 92], [92, 104, 74], [138, 146, 116]], graine: 11 }),
    cypres: feuillage(n, { nombre: 520, longueur: .05, largeur: .5, couleurs: [[34, 52, 30], [44, 62, 36], [28, 44, 26]], graine: 13 }),
    herbes: feuillage(n / 2, { nombre: 140, longueur: .2, largeur: .08, couleurs: [[176, 160, 96], [150, 140, 80], [120, 124, 70]], graine: 17 }),
    cheveux: fabrique(n / 2, meches, 2.5), image: imagePieuse(), pores: fabrique(256, pores, 1.4), coulure: salissure('coulure'), crasse: salissure('pied'),
    bougainvillee: feuillage(n, { nombre: 700, longueur: .055, largeur: .8, couleurs: [[200, 36, 120], [224, 60, 150], [176, 28, 102], [212, 48, 138], [60, 92, 40], [48, 80, 34]], graine: 19 }),
    geranium: feuillage(n / 2, { nombre: 260, longueur: .09, largeur: .85, couleurs: [[206, 34, 34], [232, 56, 44], [190, 24, 40], [74, 112, 52], [62, 100, 44]], graine: 23 }),
    vigne: feuillage(n, { nombre: 300, longueur: .13, largeur: .85, couleurs: [[98, 124, 52], [116, 142, 62], [80, 108, 44], [128, 140, 64]], graine: 29 })
  };
  for (const k in t) { const e = t[k]; for (const x of (e.isTexture ? [e] : Object.values(e))) { x.anisotropy = aniso; x.needsUpdate = true; } }
  return t;
}
