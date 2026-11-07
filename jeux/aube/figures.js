'use strict';
/* Aube des Nations — figurines dessinées par le programme : unités (escouades, cavaliers, engins, navires),
   villes (quartiers selon l'époque, palais, remparts) et aménagements (fermes, mines…).
   Chaque dessin est fait une seule fois par taille dans une petite image puis recopié. */

const FIG = { cache: new Map() };

function nuance(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, v = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; v += (255 - v) * f; b += (255 - b) * f; } else { r *= 1 + f; v *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${v | 0},${b | 0})`;
}
function figCache(cle, w, h, dessin) {
  let s = FIG.cache.get(cle);
  if (s) return s;
  if (FIG.cache.size > 700) FIG.cache.clear();
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w)); cv.height = Math.max(1, Math.ceil(h));
  const g = cv.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';
  dessin(g);
  s = { cv, w: cv.width, h: cv.height };
  FIG.cache.set(cle, s);
  return s;
}
function degrade(g, x0, y0, x1, y1, c, fort = 0.22) {
  const d = g.createLinearGradient(x0, y0, x1, y1);
  d.addColorStop(0, nuance(c, fort)); d.addColorStop(1, nuance(c, -fort));
  return d;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function ombreSol(g, x, y, rx, ry, a = 0.3) { g.fillStyle = `rgba(10,8,4,${a})`; g.beginPath(); g.ellipse(x + rx * 0.15, y, rx, ry, 0, 0, 7); g.fill(); }

/* ---------- Unités ---------- */
const MODELES = {
  colon: { m: 'chariot' }, ouvrier: { m: 'ouvrier' }, eclaireur: { m: 'eclaireur' },
  guerrier: { m: 'fantassin', arme: 'hache', casque: 'cheveux', n: 3 },
  archer: { m: 'fantassin', arme: 'arc', casque: 'capuche', n: 3 },
  lancier: { m: 'fantassin', arme: 'lance', casque: 'bronze', bouclier: 'rond', n: 3 },
  epeiste: { m: 'fantassin', arme: 'epee', casque: 'fer', bouclier: 'long', n: 3 },
  piquier: { m: 'fantassin', arme: 'pique', casque: 'fer', n: 3 },
  arbaletrier: { m: 'fantassin', arme: 'arbalete', casque: 'fer', n: 3 },
  mousquetaire: { m: 'fantassin', arme: 'mousquet', casque: 'tricorne', n: 3 },
  fusilier: { m: 'fantassin', arme: 'fusil', casque: 'kepi', n: 3 },
  infanterie: { m: 'fantassin', arme: 'fusil', casque: 'moderne', kaki: true, n: 3 },
  cavalier: { m: 'cavalier', arme: 'lance', casque: 'cheveux', n: 2 },
  chevalier: { m: 'cavalier', arme: 'lance', casque: 'heaume', caparacon: true, n: 2 },
  dragon: { m: 'cavalier', arme: 'sabre', casque: 'kepi', n: 2 },
  catapulte: { m: 'catapulte' }, trebuchet: { m: 'trebuchet' }, canon: { m: 'canon' }, artillerie: { m: 'artillerie' }, lanceRoquettes: { m: 'roquettes' },
  char: { m: 'char' }, blinde: { m: 'blinde' },
  galere: { m: 'galere' }, caravelle: { m: 'caravelle' }, fregate: { m: 'fregate' }, cuirasse: { m: 'cuirasse' },
};

function casque(g, x, y, r, type, civ) {
  g.lineWidth = r * 0.25;
  switch (type) {
    case 'cheveux': g.fillStyle = '#3b2616'; g.beginPath(); g.arc(x, y - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95); g.fill(); break;
    case 'capuche': g.fillStyle = nuance(civ, -0.35); g.beginPath(); g.arc(x, y - r * 0.05, r * 1.15, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(x + r * 0.2, y - r * 1.5); g.fill(); break;
    case 'bronze': g.fillStyle = '#c99a3c'; g.beginPath(); g.arc(x, y - r * 0.1, r * 1.08, Math.PI, 0); g.fill(); g.fillStyle = civ; g.fillRect(x - r * 0.15, y - r * 1.75, r * 0.3, r * 0.75); break;
    case 'fer': g.fillStyle = '#9aa0a6'; g.beginPath(); g.arc(x, y - r * 0.1, r * 1.08, Math.PI, 0); g.lineTo(x, y - r * 1.5); g.fill(); g.fillStyle = '#6d7277'; g.fillRect(x - r * 0.1, y - r * 0.4, r * 0.2, r * 0.75); break;
    case 'heaume': g.fillStyle = '#a5abb1'; g.fillRect(x - r * 1.05, y - r * 1.15, r * 2.1, r * 1.9); g.fillStyle = '#2d3136'; g.fillRect(x - r * 0.8, y - r * 0.25, r * 1.6, r * 0.18); g.fillStyle = civ; g.beginPath(); g.ellipse(x, y - r * 1.3, r * 0.35, r * 0.35, 0, 0, 7); g.fill(); break;
    case 'tricorne': g.fillStyle = '#1c1a1a'; g.beginPath(); g.moveTo(x - r * 1.4, y - r * 0.55); g.lineTo(x, y - r * 1.55); g.lineTo(x + r * 1.4, y - r * 0.55); g.closePath(); g.fill(); break;
    case 'kepi': g.fillStyle = nuance(civ, -0.4); g.fillRect(x - r * 0.9, y - r * 1.5, r * 1.8, r * 1.1); g.fillStyle = '#151515'; g.fillRect(x - r * 1.1, y - r * 0.5, r * 1.5, r * 0.22); break;
    case 'moderne': g.fillStyle = '#5c6a3f'; g.beginPath(); g.arc(x, y - r * 0.05, r * 1.2, Math.PI * 1.02, Math.PI * 1.98); g.fill(); break;
    case 'paille': g.fillStyle = '#d9b862'; g.beginPath(); g.ellipse(x, y - r * 0.55, r * 1.55, r * 0.35, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x, y - r * 0.6, r * 0.7, Math.PI, 0); g.fill(); break;
  }
}
function arme(g, x, y, h, type) {
  const fer = '#c9ced3', bois = '#6b4423';
  g.lineWidth = h * 0.045;
  const ligne = (c, ...p) => { g.strokeStyle = c; g.beginPath(); g.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) g.lineTo(p[k], p[k + 1]); g.stroke(); };
  switch (type) {
    case 'hache': ligne(bois, x, y + h * 0.05, x + h * 0.12, y - h * 0.32); g.fillStyle = fer; g.beginPath(); g.moveTo(x + h * 0.1, y - h * 0.3); g.lineTo(x + h * 0.26, y - h * 0.36); g.lineTo(x + h * 0.2, y - h * 0.22); g.fill(); break;
    case 'lance': ligne(bois, x + h * 0.02, y + h * 0.25, x + h * 0.1, y - h * 0.62); g.fillStyle = fer; g.beginPath(); g.moveTo(x + h * 0.08, y - h * 0.6); g.lineTo(x + h * 0.11, y - h * 0.74); g.lineTo(x + h * 0.14, y - h * 0.6); g.fill(); break;
    case 'pique': ligne(bois, x, y + h * 0.3, x + h * 0.06, y - h * 0.9); g.fillStyle = fer; g.beginPath(); g.moveTo(x + h * 0.04, y - h * 0.88); g.lineTo(x + h * 0.065, y - h * 1.0); g.lineTo(x + h * 0.09, y - h * 0.88); g.fill(); break;
    case 'epee': ligne(fer, x, y, x + h * 0.2, y - h * 0.3); ligne('#8a6a2a', x - h * 0.04, y - h * 0.03, x + h * 0.05, y + h * 0.04); break;
    case 'sabre': g.strokeStyle = fer; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * 0.2, y - h * 0.1, x + h * 0.22, y - h * 0.38); g.stroke(); break;
    case 'arc': g.strokeStyle = bois; g.lineWidth = h * 0.05; g.beginPath(); g.arc(x + h * 0.02, y - h * 0.05, h * 0.26, -Math.PI * 0.42, Math.PI * 0.42); g.stroke(); ligne('#e8e0c8', x + h * 0.095, y - h * 0.3, x + h * 0.095, y + h * 0.2); g.lineWidth = h * 0.02; break;
    case 'arbalete': ligne(bois, x - h * 0.12, y, x + h * 0.2, y - h * 0.06); g.strokeStyle = '#4a4a4a'; g.beginPath(); g.arc(x + h * 0.2, y - h * 0.06, h * 0.12, -Math.PI * 0.5, Math.PI * 0.5); g.stroke(); break;
    case 'mousquet': ligne(bois, x - h * 0.08, y + h * 0.12, x + h * 0.2, y - h * 0.45); ligne('#2a2a2a', x + h * 0.12, y - h * 0.3, x + h * 0.22, y - h * 0.5); break;
    case 'fusil': ligne('#3a2a1c', x - h * 0.08, y + h * 0.12, x + h * 0.18, y - h * 0.42); ligne(fer, x + h * 0.18, y - h * 0.42, x + h * 0.23, y - h * 0.54); break;
    case 'baton': ligne(bois, x + h * 0.04, y + h * 0.35, x + h * 0.06, y - h * 0.55); break;
    case 'pioche': ligne(bois, x - h * 0.1, y + h * 0.08, x + h * 0.14, y - h * 0.3); g.strokeStyle = fer; g.lineWidth = h * 0.05; g.beginPath(); g.arc(x + h * 0.16, y - h * 0.22, h * 0.14, -Math.PI * 1.05, -Math.PI * 0.2); g.stroke(); break;
  }
}
/* Un personnage debout, pieds en (x, y), hauteur h. */
function personnage(g, x, y, h, o) {
  const w = h * 0.32, civ = o.civ;
  ombreSol(g, x, y, w * 0.85, h * 0.06);
  const tunique = o.kaki ? '#6b7046' : o.tunique || civ;
  g.strokeStyle = o.kaki ? '#555a37' : '#3a2e25'; g.lineWidth = h * 0.1;
  g.beginPath(); g.moveTo(x - w * 0.2, y - h * 0.02); g.lineTo(x - w * 0.14, y - h * 0.36); g.moveTo(x + w * 0.22, y - h * 0.02); g.lineTo(x + w * 0.13, y - h * 0.36); g.stroke();
  const yh = y - h * 0.76, yb = y - h * 0.33;
  g.fillStyle = degrade(g, x - w / 2, yh, x + w / 2, yb, tunique, 0.25);
  rr(g, x - w / 2, yh, w, yb - yh, w * 0.3); g.fill();
  if (o.kaki) { g.fillStyle = civ; g.fillRect(x - w / 2, yh + h * 0.08, w * 0.3, h * 0.07); }
  if (o.cotte) { g.fillStyle = 'rgba(170,176,182,0.55)'; rr(g, x - w / 2, yh + h * 0.05, w, h * 0.22, w * 0.2); g.fill(); }
  g.fillStyle = 'rgba(30,20,10,0.55)'; g.fillRect(x - w / 2, yb - h * 0.08, w, h * 0.045);
  const rt = h * 0.115, yt = y - h * 0.86;
  g.fillStyle = o.peau || '#d6a77a'; g.beginPath(); g.arc(x, yt, rt, 0, 7); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.arc(x + rt * 0.35, yt, rt * 0.75, -Math.PI / 2, Math.PI / 2); g.fill();
  casque(g, x, yt, rt, o.casque, civ);
  if (o.arme) arme(g, x + w * 0.55, y - h * 0.52, h, o.arme);
  if (o.bouclier === 'rond') {
    g.fillStyle = degrade(g, x - w, yh, x, yb, civ, 0.3); g.beginPath(); g.arc(x - w * 0.45, y - h * 0.52, h * 0.17, 0, 7); g.fill();
    g.strokeStyle = '#c99a3c'; g.lineWidth = h * 0.03; g.stroke(); g.fillStyle = '#e1c27a'; g.beginPath(); g.arc(x - w * 0.45, y - h * 0.52, h * 0.045, 0, 7); g.fill();
  } else if (o.bouclier === 'long') {
    g.fillStyle = degrade(g, x - w, yh, x, yb, civ, 0.3); rr(g, x - w * 0.85, y - h * 0.72, h * 0.22, h * 0.36, h * 0.05); g.fill();
    g.strokeStyle = '#e8dcc0'; g.lineWidth = h * 0.025; g.stroke();
  }
}
function cheval(g, x, y, h, robe, caparacon) {
  ombreSol(g, x, y, h * 0.42, h * 0.07);
  g.strokeStyle = nuance(robe, -0.3); g.lineWidth = h * 0.065;
  for (const dx of [-0.26, -0.16, 0.14, 0.24]) { g.beginPath(); g.moveTo(x + dx * h, y - h * 0.3); g.lineTo(x + dx * h + h * 0.02, y - h * 0.01); g.stroke(); }
  g.fillStyle = degrade(g, x, y - h * 0.5, x, y - h * 0.25, robe, 0.2);
  g.beginPath(); g.ellipse(x, y - h * 0.38, h * 0.32, h * 0.12, 0, 0, 7); g.fill();
  g.beginPath(); g.moveTo(x - h * 0.22, y - h * 0.44); g.lineTo(x - h * 0.36, y - h * 0.68); g.lineTo(x - h * 0.48, y - h * 0.62); g.lineTo(x - h * 0.42, y - h * 0.56); g.lineTo(x - h * 0.3, y - h * 0.34); g.fill();
  g.strokeStyle = nuance(robe, -0.45); g.lineWidth = h * 0.05; g.beginPath(); g.moveTo(x + h * 0.3, y - h * 0.42); g.quadraticCurveTo(x + h * 0.42, y - h * 0.36, x + h * 0.38, y - h * 0.2); g.stroke();
  if (caparacon) { g.fillStyle = caparacon; g.beginPath(); g.moveTo(x - h * 0.28, y - h * 0.48); g.lineTo(x + h * 0.3, y - h * 0.48); g.lineTo(x + h * 0.32, y - h * 0.22); g.lineTo(x - h * 0.3, y - h * 0.22); g.fill(); g.strokeStyle = '#e8d7a0'; g.lineWidth = h * 0.02; g.stroke(); }
}
function cavalier(g, x, y, h, o, k) {
  const robes = ['#7a4b2a', '#3d2a1e', '#b9a690', '#5c4632'];
  cheval(g, x, y, h, robes[k % robes.length], o.caparacon ? o.civ : null);
  const yh = y - h * 0.82, yb = y - h * 0.46;
  g.fillStyle = degrade(g, x - h * 0.1, yh, x + h * 0.1, yb, o.casque === 'heaume' ? '#9aa0a6' : o.civ, 0.25);
  rr(g, x - h * 0.08, yh, h * 0.18, yb - yh, h * 0.05); g.fill();
  const rt = h * 0.08;
  g.fillStyle = '#d6a77a'; g.beginPath(); g.arc(x + h * 0.01, yh - rt * 0.9, rt, 0, 7); g.fill();
  casque(g, x + h * 0.01, yh - rt * 0.9, rt, o.casque, o.civ);
  if (o.arme === 'lance') { g.strokeStyle = '#6b4423'; g.lineWidth = h * 0.035; g.beginPath(); g.moveTo(x + h * 0.15, yh + h * 0.2); g.lineTo(x - h * 0.55, yh - h * 0.08); g.stroke(); g.fillStyle = o.civ; g.fillRect(x - h * 0.5, yh - h * 0.12, h * 0.1, h * 0.06); }
  else arme(g, x + h * 0.1, yh + h * 0.15, h * 0.8, o.arme);
}
function roue(g, x, y, r) { g.fillStyle = '#3a2a1c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = '#8a6a44'; g.lineWidth = r * 0.25; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.stroke(); g.beginPath(); g.moveTo(x - r * 0.7, y); g.lineTo(x + r * 0.7, y); g.moveTo(x, y - r * 0.7); g.lineTo(x, y + r * 0.7); g.stroke(); }
function engin(g, m, u, civ) {
  const bois = '#7a5230', boisF = '#4f341d';
  ombreSol(g, 0, 0, u * 0.48, u * 0.1);
  if (m === 'catapulte' || m === 'trebuchet') {
    const grand = m === 'trebuchet';
    g.fillStyle = degrade(g, -u * 0.4, -u * 0.2, u * 0.4, 0, bois);
    g.fillRect(-u * 0.4, -u * 0.18, u * 0.8, u * 0.1);
    g.strokeStyle = boisF; g.lineWidth = u * 0.06;
    g.beginPath(); g.moveTo(-u * 0.12, -u * 0.12); g.lineTo(0, -u * (grand ? 0.7 : 0.42)); g.lineTo(u * 0.12, -u * 0.12); g.stroke();
    g.strokeStyle = bois; g.lineWidth = u * 0.05; g.beginPath(); g.moveTo(-u * (grand ? 0.55 : 0.4), -u * (grand ? 0.95 : 0.55)); g.lineTo(u * 0.3, -u * (grand ? 0.45 : 0.25)); g.stroke();
    g.fillStyle = '#6d6a63'; g.beginPath(); g.arc(-u * (grand ? 0.55 : 0.4), -u * (grand ? 0.95 : 0.55), u * 0.07, 0, 7); g.fill();
    if (grand) { g.fillStyle = boisF; g.fillRect(u * 0.22, -u * 0.5, u * 0.16, u * 0.16); }
    g.fillStyle = civ; g.beginPath(); g.moveTo(0, -u * (grand ? 0.7 : 0.42)); g.lineTo(u * 0.18, -u * (grand ? 0.65 : 0.38)); g.lineTo(0, -u * (grand ? 0.6 : 0.33)); g.fill();
    roue(g, -u * 0.28, -u * 0.06, u * 0.09); roue(g, u * 0.28, -u * 0.06, u * 0.09);
  } else if (m === 'canon' || m === 'artillerie') {
    const gros = m === 'artillerie';
    g.strokeStyle = '#2a2b2d'; g.lineWidth = u * (gros ? 0.13 : 0.11);
    g.beginPath(); g.moveTo(u * 0.05, -u * 0.2); g.lineTo(-u * (gros ? 0.62 : 0.5), -u * (gros ? 0.48 : 0.38)); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = u * 0.03; g.beginPath(); g.moveTo(u * 0.02, -u * 0.24); g.lineTo(-u * 0.45, -u * 0.42); g.stroke();
    if (gros) { g.fillStyle = '#4c5a3c'; g.fillRect(-u * 0.12, -u * 0.42, u * 0.08, u * 0.28); }
    g.strokeStyle = gros ? '#4c5a3c' : boisF; g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(-u * 0.05, -u * 0.16); g.lineTo(u * 0.42, -u * 0.04); g.stroke();
    roue(g, -u * 0.02, -u * 0.12, u * (gros ? 0.15 : 0.13));
    g.fillStyle = civ; g.fillRect(u * 0.36, -u * 0.3, u * 0.12, u * 0.08); g.strokeStyle = '#2a2a2a'; g.lineWidth = u * 0.02; g.beginPath(); g.moveTo(u * 0.36, -u * 0.04); g.lineTo(u * 0.36, -u * 0.3); g.stroke();
  } else if (m === 'roquettes') {
    g.fillStyle = degrade(g, -u * 0.5, -u * 0.3, u * 0.5, 0, '#56603f'); rr(g, -u * 0.5, -u * 0.3, u * 1.0, u * 0.2, u * 0.04); g.fill();
    g.fillStyle = '#3f4730'; rr(g, -u * 0.5, -u * 0.48, u * 0.3, u * 0.2, u * 0.04); g.fill();
    g.fillStyle = '#8fb1c9'; g.fillRect(-u * 0.45, -u * 0.44, u * 0.16, u * 0.08);
    g.save(); g.translate(u * 0.1, -u * 0.32); g.rotate(-0.45); g.fillStyle = '#4a5236'; g.fillRect(-u * 0.05, -u * 0.18, u * 0.5, u * 0.18);
    g.fillStyle = '#222'; for (let k = 0; k < 3; k++) for (let l = 0; l < 2; l++) { g.beginPath(); g.arc(u * 0.42, -u * 0.14 + l * u * 0.08, u * 0.025, 0, 7); g.fill(); }
    g.restore();
    for (const dx of [-0.36, 0, 0.34]) roue(g, dx * u, -u * 0.08, u * 0.08);
    g.fillStyle = civ; g.fillRect(-u * 0.48, -u * 0.22, u * 0.14, u * 0.06);
  } else if (m === 'char' || m === 'blinde') {
    const mod = m === 'blinde', coque = mod ? '#8a8a72' : '#58603f';
    g.fillStyle = '#26281f'; rr(g, -u * 0.5, -u * 0.2, u * 1.0, u * 0.18, u * 0.08); g.fill();
    g.fillStyle = '#6a6a5e'; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(-u * 0.38 + k * u * 0.19, -u * 0.11, u * 0.055, 0, 7); g.fill(); }
    g.fillStyle = degrade(g, 0, -u * 0.4, 0, -u * 0.18, coque, 0.25);
    g.beginPath(); g.moveTo(-u * 0.48, -u * 0.2); g.lineTo(-u * 0.4, -u * 0.36); g.lineTo(u * 0.44, -u * 0.36); g.lineTo(u * 0.52, -u * 0.2); g.fill();
    g.fillStyle = nuance(coque, -0.1);
    if (mod) { g.beginPath(); g.moveTo(-u * 0.25, -u * 0.36); g.lineTo(-u * 0.18, -u * 0.52); g.lineTo(u * 0.22, -u * 0.52); g.lineTo(u * 0.28, -u * 0.36); g.fill(); }
    else { g.beginPath(); g.ellipse(0, -u * 0.43, u * 0.22, u * 0.1, 0, 0, 7); g.fill(); }
    g.strokeStyle = nuance(coque, -0.35); g.lineWidth = u * 0.06; g.beginPath(); g.moveTo(-u * 0.15, -u * 0.45); g.lineTo(-u * 0.72, -u * 0.47); g.stroke();
    g.fillStyle = civ; g.fillRect(u * 0.12, -u * 0.48, u * 0.14, u * 0.08);
  }
}
function navire(g, m, u, civ) {
  g.fillStyle = 'rgba(230,245,255,0.35)'; g.beginPath(); g.ellipse(u * 0.1, -u * 0.02, u * 0.62, u * 0.1, 0, 0, 7); g.fill();
  const acier = m === 'cuirasse';
  g.fillStyle = degrade(g, 0, -u * 0.25, 0, 0, acier ? '#676d73' : '#6b4524', 0.25);
  g.beginPath(); g.moveTo(-u * 0.6, -u * 0.22); g.lineTo(u * 0.55, -u * 0.22); g.quadraticCurveTo(u * 0.5, 0, u * 0.25, 0.02 * u); g.lineTo(-u * 0.4, u * 0.02); g.quadraticCurveTo(-u * 0.55, -u * 0.05, -u * 0.6, -u * 0.22); g.fill();
  g.strokeStyle = acier ? '#3d4247' : '#d8c08a'; g.lineWidth = u * 0.025; g.beginPath(); g.moveTo(-u * 0.55, -u * 0.15); g.lineTo(u * 0.5, -u * 0.15); g.stroke();
  const voile = (x, top, bas, larg) => {
    g.strokeStyle = '#4a3420'; g.lineWidth = u * 0.03; g.beginPath(); g.moveTo(x, -u * 0.22); g.lineTo(x, top - u * 0.06); g.stroke();
    g.fillStyle = degrade(g, x - larg, top, x + larg, bas, '#efe6cf', 0.08);
    g.beginPath(); g.moveTo(x - larg, top); g.quadraticCurveTo(x, top + (bas - top) * 0.5, x - larg * 0.9, bas); g.lineTo(x + larg * 0.9, bas); g.quadraticCurveTo(x + larg * 1.2, top + (bas - top) * 0.5, x + larg, top); g.closePath(); g.fill();
    g.fillStyle = civ; g.fillRect(x - larg * 0.95, top + (bas - top) * 0.4, larg * 1.9, (bas - top) * 0.2);
  };
  if (m === 'galere') {
    g.strokeStyle = '#4a3420'; g.lineWidth = u * 0.025;
    for (let k = 0; k < 6; k++) { const x = -u * 0.4 + k * u * 0.15; g.beginPath(); g.moveTo(x, -u * 0.1); g.lineTo(x - u * 0.08, u * 0.1); g.stroke(); }
    voile(0, -u * 0.72, -u * 0.32, u * 0.22);
  } else if (m === 'caravelle') { voile(-u * 0.22, -u * 0.62, -u * 0.3, u * 0.15); voile(u * 0.12, -u * 0.8, -u * 0.3, u * 0.19); }
  else if (m === 'fregate') { voile(-u * 0.32, -u * 0.66, -u * 0.3, u * 0.14); voile(0, -u * 0.86, -u * 0.3, u * 0.17); voile(u * 0.3, -u * 0.7, -u * 0.3, u * 0.14); }
  else if (acier) {
    g.fillStyle = '#7d848a'; g.fillRect(-u * 0.25, -u * 0.36, u * 0.4, u * 0.14);
    g.fillStyle = '#5c6268'; g.fillRect(-u * 0.05, -u * 0.52, u * 0.12, u * 0.18);
    g.fillStyle = 'rgba(70,70,70,0.5)'; g.beginPath(); g.arc(u * 0.04, -u * 0.62, u * 0.07, 0, 7); g.arc(u * 0.12, -u * 0.72, u * 0.09, 0, 7); g.fill();
    for (const x of [-u * 0.42, u * 0.3]) { g.fillStyle = '#5c6268'; g.beginPath(); g.ellipse(x, -u * 0.27, u * 0.08, u * 0.05, 0, 0, 7); g.fill(); g.strokeStyle = '#3d4247'; g.lineWidth = u * 0.03; g.beginPath(); g.moveTo(x, -u * 0.28); g.lineTo(x + (x < 0 ? -u * 0.15 : u * 0.15), -u * 0.29); g.stroke(); }
    g.fillStyle = civ; g.fillRect(u * 0.03, -u * 0.62, u * 0.12, u * 0.07);
  }
}
function chariot(g, u, civ) {
  ombreSol(g, 0, 0, u * 0.5, u * 0.1);
  g.fillStyle = '#7a4b2a'; g.beginPath(); g.ellipse(-u * 0.42, -u * 0.2, u * 0.13, u * 0.08, 0, 0, 7); g.fill();
  g.strokeStyle = '#4f341d'; g.lineWidth = u * 0.04; for (const dx of [-0.48, -0.36]) { g.beginPath(); g.moveTo(dx * u, -u * 0.15); g.lineTo(dx * u, 0); g.stroke(); }
  g.fillStyle = '#5a3a20'; g.beginPath(); g.moveTo(-u * 0.5, -u * 0.25); g.lineTo(-u * 0.56, -u * 0.32); g.lineTo(-u * 0.6, -u * 0.27); g.fill();
  g.fillStyle = degrade(g, 0, -u * 0.3, 0, -u * 0.1, '#7a5230'); g.fillRect(-u * 0.22, -u * 0.26, u * 0.6, u * 0.14);
  g.fillStyle = degrade(g, -u * 0.2, -u * 0.6, u * 0.4, -u * 0.26, '#efe6cf', 0.12);
  g.beginPath(); g.moveTo(-u * 0.24, -u * 0.26); g.bezierCurveTo(-u * 0.24, -u * 0.62, u * 0.4, -u * 0.62, u * 0.4, -u * 0.26); g.fill();
  g.strokeStyle = civ; g.lineWidth = u * 0.04; g.beginPath(); g.moveTo(-u * 0.06, -u * 0.5); g.lineTo(-u * 0.06, -u * 0.27); g.moveTo(u * 0.2, -u * 0.5); g.lineTo(u * 0.2, -u * 0.27); g.stroke();
  roue(g, -u * 0.12, -u * 0.08, u * 0.09); roue(g, u * 0.3, -u * 0.08, u * 0.09);
}
function dessinerModele(g, type, u, civ, ere) {
  const M = MODELES[type] || { m: 'fantassin', n: 1 };
  if (M.m === 'fantassin' || M.m === 'cavalier') {
    const pos = M.n === 3 ? [[-0.3, -0.12, 0.88], [0.3, -0.1, 0.88], [0, 0.08, 1]] : M.n === 2 ? [[-0.2, -0.1, 0.92], [0.22, 0.06, 1]] : [[0, 0, 1]];
    pos.forEach(([dx, dy, k], n) => {
      const o = { civ, arme: M.arme, casque: M.casque, bouclier: M.bouclier, kaki: M.kaki, cotte: type === 'epeiste' };
      if (M.m === 'cavalier') cavalier(g, dx * u, dy * u, u * 0.82 * k, o, n);
      else personnage(g, dx * u, dy * u, u * 0.62 * k, o);
    });
  } else if (M.m === 'eclaireur') {
    personnage(g, -u * 0.05, 0, u * 0.62, { civ, arme: 'baton', casque: 'cheveux', tunique: nuance(civ, -0.15) });
    g.fillStyle = civ; g.beginPath(); g.moveTo(u * 0.17, -u * 0.66); g.lineTo(u * 0.4, -u * 0.6); g.lineTo(u * 0.17, -u * 0.52); g.fill();
  } else if (M.m === 'ouvrier') {
    personnage(g, 0, 0, u * 0.62, { civ, arme: 'pioche', casque: 'paille', tunique: '#a89a7a' });
  } else if (M.m === 'chariot') {
    chariot(g, u, civ);
    personnage(g, u * 0.5, u * 0.06, u * 0.5, { civ, casque: 'cheveux', tunique: nuance(civ, 0.1), arme: 'baton' });
  } else if (['galere', 'caravelle', 'fregate', 'cuirasse'].includes(M.m)) navire(g, M.m, u, civ);
  else engin(g, M.m, u, civ);
}
/* Image d'une unité. u = rayon d'une case en pixels. Point d'ancrage : (ax, ay). */
function spriteUnite(type, civ, u, embarque) {
  const cle = `u|${type}|${civ}|${u}|${embarque ? 1 : 0}`;
  return figCache(cle, u * 2.4, u * 2.2, g => {
    g.translate(u * 1.2, u * 1.45);
    if (embarque) navire(g, 'galere', u * 0.9, civ);
    else dessinerModele(g, type, u, civ);
  });
}

/* ---------- Villes ---------- */
function maison(g, x, y, w, h, d, murs, toit, o = {}) {
  g.fillStyle = 'rgba(10,8,4,0.3)'; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x + w / 2 + d * 1.6, y); g.lineTo(x + w / 2 + d * 2.2, y - d * 0.5); g.lineTo(x - w / 2 + d * 0.6, y - d * 0.5); g.fill();
  g.fillStyle = nuance(murs, -0.32);
  g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2 + d, y - d * 0.55); g.lineTo(x + w / 2 + d, y - h - d * 0.55); g.lineTo(x + w / 2, y - h); g.fill();
  g.fillStyle = degrade(g, x - w / 2, y - h, x + w / 2, y, murs, 0.1);
  g.fillRect(x - w / 2, y - h, w, h);
  if (o.colombage) { g.strokeStyle = '#5a3c22'; g.lineWidth = w * 0.06; g.strokeRect(x - w / 2, y - h, w, h); g.beginPath(); g.moveTo(x - w / 2, y - h * 0.5); g.lineTo(x + w / 2, y - h * 0.5); g.stroke(); }
  if (o.fenetres) {
    g.fillStyle = o.verre ? 'rgba(220,235,250,0.8)' : 'rgba(40,30,20,0.7)';
    const nl = Math.max(1, Math.floor(h / (w * 0.35))), nc = 2;
    for (let l = 0; l < nl; l++) for (let c = 0; c < nc; c++) g.fillRect(x - w * 0.32 + c * w * 0.4, y - h + h * 0.12 + l * (h * 0.8 / nl), w * 0.22, Math.min(w * 0.2, h * 0.8 / nl * 0.55));
  } else { g.fillStyle = 'rgba(40,30,20,0.7)'; g.fillRect(x - w * 0.1, y - h * 0.45, w * 0.2, h * 0.45); }
  if (o.plat) { g.fillStyle = nuance(murs, -0.15); g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x - w / 2 + d, y - h - d * 0.55); g.lineTo(x + w / 2 + d, y - h - d * 0.55); g.lineTo(x + w / 2, y - h); g.fill(); return; }
  const rh = o.toitH || w * 0.45;
  g.fillStyle = nuance(toit, -0.2);
  g.beginPath(); g.moveTo(x, y - h - rh); g.lineTo(x + d, y - h - rh - d * 0.55); g.lineTo(x + w / 2 + d, y - h - d * 0.55); g.lineTo(x + w / 2, y - h); g.fill();
  g.fillStyle = degrade(g, x - w / 2, y - h - rh, x + w / 2, y - h, toit, 0.15);
  g.beginPath(); g.moveTo(x - w / 2 - w * 0.06, y - h); g.lineTo(x, y - h - rh); g.lineTo(x + w / 2 + w * 0.06, y - h); g.fill();
}
const STYLES_ERE = [
  { murs: ['#e6d6b0', '#dccaa0', '#efe2c4'], toits: ['#b4553b', '#a3492f', '#c06a45'] },
  { murs: ['#ece0c2', '#e2d2ae', '#f0e6cf'], toits: ['#b05337', '#9d4630', '#7d3a2a'] },
  { murs: ['#efe5cc', '#e6d9bb'], toits: ['#5d606b', '#7a3b2c', '#6b4a35'], colombage: true },
  { murs: ['#ddd0b5', '#cfc2a6', '#e4d8bf'], toits: ['#4f5d73', '#5d6a7e', '#6a4a3a'], etages: 1.5 },
  { murs: ['#a8583f', '#9b4f39', '#b56a4f'], toits: ['#3f4146', '#4b4d52'], etages: 1.7, usine: true },
  { murs: ['#8ea9c2', '#a8bccd', '#c9d3db'], toits: ['#4d6680'], tours: true },
];
function spriteVille(v, u, ere) {
  const popB = Math.min(24, v.pop), murs = v.bat.chateau ? 2 : v.bat.remparts ? 1 : 0, cap = !!v.bat.palais, civ = G.civs[v.civ].couleur;
  const cle = `v|${v.id}|${popB}|${murs}|${cap ? 1 : 0}|${ere}|${civ}|${u}`;
  return figCache(cle, u * 2.6, u * 2.5, g => {
    g.translate(u * 1.3, u * 1.55);
    const al = creerAlea(v.id * 7919 + 13), st = STYLES_ERE[ere];
    /* Place pavée. */
    const pr = u * (0.62 + Math.min(0.3, popB * 0.016));
    const sol = g.createRadialGradient(0, 0, pr * 0.2, 0, 0, pr);
    sol.addColorStop(0, 'rgba(206,192,160,0.95)'); sol.addColorStop(0.8, 'rgba(180,166,134,0.85)'); sol.addColorStop(1, 'rgba(160,146,114,0)');
    g.fillStyle = sol; g.beginPath(); g.ellipse(0, 0, pr * 1.15, pr * 0.82, 0, 0, 7); g.fill();
    const tourEnceinte = (debut, fin) => {
      if (!murs) return;
      const rx = pr * 1.05, ry = pr * 0.72;
      g.strokeStyle = '#8b8275'; g.lineWidth = u * (murs === 2 ? 0.1 : 0.075);
      g.beginPath(); g.ellipse(0, 0, rx, ry, 0, debut, fin); g.stroke();
      g.strokeStyle = '#b5ad9e'; g.lineWidth = u * 0.025; g.beginPath(); g.ellipse(0, -u * 0.03, rx, ry, 0, debut, fin); g.stroke();
      const nb = murs === 2 ? 8 : 6;
      for (let k = 0; k < nb; k++) {
        const a = (k / nb) * Math.PI * 2 + 0.3;
        const norm = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const dans = debut < fin ? (norm >= debut && norm <= fin) : (norm >= debut || norm <= fin);
        if (!dans) continue;
        const x = Math.cos(a) * rx, y = Math.sin(a) * ry, tw = u * (murs === 2 ? 0.12 : 0.09), th = u * (murs === 2 ? 0.26 : 0.18);
        g.fillStyle = '#9a9183'; g.fillRect(x - tw / 2, y - th, tw, th);
        g.fillStyle = '#c0b8a8'; g.fillRect(x - tw / 2, y - th, tw * 0.45, th);
        g.fillStyle = murs === 2 ? civ : '#7a7266'; g.beginPath(); g.moveTo(x - tw * 0.65, y - th); g.lineTo(x, y - th - tw * 0.9); g.lineTo(x + tw * 0.65, y - th); g.fill();
      }
    };
    tourEnceinte(Math.PI, Math.PI * 2);
    /* Maisons rangées de l'arrière vers l'avant. */
    const nb = Math.min(20, 5 + Math.round(popB * 0.85)), pos = [];
    for (let k = 0; k < nb * 3 && pos.length < nb; k++) {
      const a = al() * Math.PI * 2, d = Math.sqrt(al()) * pr * 0.95;
      const x = Math.cos(a) * d * 1.05, y = Math.sin(a) * d * 0.7;
      if (cap && Math.abs(x) < u * 0.24 && Math.abs(y) < u * 0.16) continue;
      if (pos.some(p => Math.abs(p.x - x) < u * 0.16 && Math.abs(p.y - y) < u * 0.1)) continue;
      pos.push({ x, y });
    }
    if (cap) pos.push({ x: 0, y: 0, palais: true });
    pos.sort((a, b) => a.y - b.y);
    for (const p of pos) {
      if (p.palais) { palais(g, p.x, p.y + u * 0.05, u, civ, ere); continue; }
      const murC = st.murs[Math.floor(al() * st.murs.length)], toitC = st.toits[Math.floor(al() * st.toits.length)];
      const w = u * (0.16 + al() * 0.06), d = w * 0.5;
      if (st.tours && al() < 0.65) { const h = u * (0.28 + al() * 0.5 + popB * 0.012); maison(g, p.x, p.y, w * 1.1, h, d, murC, toitC, { plat: true, fenetres: true, verre: true }); continue; }
      if (st.usine && al() < 0.3) {
        maison(g, p.x, p.y, w * 1.4, w * 0.8, d, '#8d7b6a', '#4b4d52', { fenetres: true });
        g.fillStyle = '#7a3e2c'; g.fillRect(p.x + w * 0.35, p.y - w * 2.0, w * 0.18, w * 1.3);
        g.fillStyle = 'rgba(120,120,120,0.45)'; g.beginPath(); g.arc(p.x + w * 0.5, p.y - w * 2.25, w * 0.2, 0, 7); g.arc(p.x + w * 0.75, p.y - w * 2.55, w * 0.27, 0, 7); g.fill();
        continue;
      }
      if (ere === 2 && al() < 0.08) { maison(g, p.x, p.y, w * 0.8, w * 2.2, d * 0.8, '#d8ccb0', '#5d606b', { toitH: w * 1.2 }); continue; }
      const h = w * (0.75 + al() * 0.3) * (st.etages || 1);
      maison(g, p.x, p.y, w, h, d, murC, toitC, { colombage: st.colombage && al() < 0.6, fenetres: (st.etages || 1) > 1.2 });
    }
    tourEnceinte(0, Math.PI);
  });
}
function palais(g, x, y, u, civ, ere) {
  const w = u * 0.36, h = u * (ere >= 5 ? 0.75 : 0.26), d = w * 0.4;
  if (ere >= 5) { maison(g, x, y, w * 0.8, h, d, '#c4d0db', '#4d6680', { plat: true, fenetres: true, verre: true }); g.fillStyle = civ; g.fillRect(x - w * 0.4, y - h - u * 0.05, w * 0.8, u * 0.05); }
  else {
    maison(g, x, y, w, h, d, ere >= 3 ? '#e9e1d0' : '#efe4c8', '#c9b48a', { plat: true });
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let k = 0; k < 5; k++) g.fillRect(x - w * 0.42 + k * w * 0.2, y - h * 0.9, w * 0.06, h * 0.85);
    const dy = y - h - d * 0.3;
    g.fillStyle = degrade(g, x - w * 0.3, dy - w * 0.4, x + w * 0.3, dy, civ, 0.3);
    g.beginPath(); g.arc(x + d * 0.4, dy, w * 0.28, Math.PI, 0); g.fill();
    g.strokeStyle = '#3a2d1a'; g.lineWidth = u * 0.02; g.beginPath(); g.moveTo(x + d * 0.4, dy - w * 0.28); g.lineTo(x + d * 0.4, dy - w * 0.62); g.stroke();
    g.fillStyle = civ; g.beginPath(); g.moveTo(x + d * 0.4, dy - w * 0.62); g.lineTo(x + d * 0.4 + w * 0.3, dy - w * 0.54); g.lineTo(x + d * 0.4, dy - w * 0.46); g.fill();
  }
}

/* ---------- Aménagements ---------- */
function spriteAmel(am, u, variante) {
  return figCache(`a|${am}|${u}|${variante}`, u * 2, u * 2, g => {
    g.translate(u, u);
    const al = creerAlea(variante * 131 + am.length * 17);
    if (am === 'ferme') {
      const teintes = ['#d4b45a', '#c8a548', '#9cb04e', '#b8c25c', '#d9be6c'];
      g.save(); g.rotate(-0.12 + al() * 0.24);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if ((r === 0 || r === 2) && (c === 0 || c === 2) && al() < 0.5) continue;
        const x = -u * 0.6 + c * u * 0.4, y = -u * 0.48 + r * u * 0.32, w = u * 0.38, h = u * 0.3;
        const coul = teintes[Math.floor(al() * teintes.length)];
        g.fillStyle = coul; g.fillRect(x, y, w, h);
        g.strokeStyle = nuance(coul, -0.25); g.lineWidth = u * 0.015;
        for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x + 2, y + k * h / 5); g.lineTo(x + w - 2, y + k * h / 5); g.stroke(); }
        g.strokeStyle = 'rgba(80,60,30,0.6)'; g.lineWidth = u * 0.02; g.strokeRect(x, y, w, h);
      }
      g.restore();
      maison(g, u * 0.32, u * 0.42, u * 0.14, u * 0.11, u * 0.06, '#e8dcc0', '#9a4a32');
    } else if (am === 'mine') {
      g.fillStyle = '#5d554a'; g.beginPath(); g.ellipse(-u * 0.05, u * 0.2, u * 0.32, u * 0.16, 0, 0, 7); g.fill();
      g.fillStyle = '#1e1a16'; g.beginPath(); g.arc(-u * 0.05, u * 0.16, u * 0.14, Math.PI, 0); g.lineTo(u * 0.09, u * 0.2); g.lineTo(-u * 0.19, u * 0.2); g.fill();
      g.strokeStyle = '#7a5230'; g.lineWidth = u * 0.05; g.beginPath(); g.moveTo(-u * 0.21, u * 0.2); g.lineTo(-u * 0.21, u * 0.0); g.lineTo(u * 0.11, u * 0.0); g.lineTo(u * 0.11, u * 0.2); g.stroke();
      g.strokeStyle = '#5a4a3a'; g.lineWidth = u * 0.02; g.beginPath(); g.moveTo(-u * 0.05, u * 0.2); g.lineTo(u * 0.4, u * 0.45); g.moveTo(u * 0.03, u * 0.2); g.lineTo(u * 0.48, u * 0.42); g.stroke();
      g.fillStyle = '#5a4030'; g.fillRect(u * 0.28, u * 0.3, u * 0.14, u * 0.08); g.fillStyle = '#8c8c8c'; g.beginPath(); g.arc(u * 0.35, u * 0.29, u * 0.06, Math.PI, 0); g.fill();
    } else if (am === 'paturage') {
      g.strokeStyle = '#8a6a44'; g.lineWidth = u * 0.03;
      g.beginPath(); g.ellipse(0, u * 0.08, u * 0.55, u * 0.36, 0, 0, 7); g.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const x = Math.cos(a) * u * 0.55, y = u * 0.08 + Math.sin(a) * u * 0.36; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - u * 0.07); g.stroke(); }
      for (let k = 0; k < 4; k++) { const x = (al() - 0.5) * u * 0.7, y = u * 0.08 + (al() - 0.5) * u * 0.4; g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + 2, y + u * 0.04, u * 0.07, u * 0.025, 0, 0, 7); g.fill(); g.fillStyle = al() < 0.5 ? '#f2eee4' : '#8a5a36'; g.beginPath(); g.ellipse(x, y, u * 0.065, u * 0.04, 0, 0, 7); g.fill(); g.beginPath(); g.arc(x - u * 0.06, y - u * 0.02, u * 0.025, 0, 7); g.fill(); }
    } else if (am === 'plantation') {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
        const x = -u * 0.5 + c * u * 0.24 + (r % 2) * u * 0.12, y = -u * 0.3 + r * u * 0.2;
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + u * 0.03, y + u * 0.05, u * 0.07, u * 0.03, 0, 0, 7); g.fill();
        g.fillStyle = '#3f7a35'; g.beginPath(); g.arc(x, y, u * 0.065, 0, 7); g.fill(); g.fillStyle = '#6aa553'; g.beginPath(); g.arc(x - u * 0.02, y - u * 0.02, u * 0.03, 0, 7); g.fill();
      }
    } else if (am === 'scierie') {
      for (let k = 0; k < 3; k++) for (let l = 0; l <= 2 - k; l++) { const x = -u * 0.1 + l * u * 0.12 + k * u * 0.06, y = u * 0.32 - k * u * 0.1; g.fillStyle = '#8a5a30'; g.beginPath(); g.arc(x, y, u * 0.06, 0, 7); g.fill(); g.fillStyle = '#d9b27a'; g.beginPath(); g.arc(x, y, u * 0.04, 0, 7); g.fill(); }
      maison(g, -u * 0.3, u * 0.3, u * 0.2, u * 0.12, u * 0.08, '#9a7450', '#5a3a22');
    } else if (am === 'camp') {
      for (const [x, y] of [[-u * 0.2, u * 0.25], [u * 0.15, u * 0.35]]) {
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + u * 0.04, y, u * 0.14, u * 0.04, 0, 0, 7); g.fill();
        g.fillStyle = '#b89a6a'; g.beginPath(); g.moveTo(x - u * 0.13, y); g.lineTo(x, y - u * 0.22); g.lineTo(x + u * 0.13, y); g.fill();
        g.fillStyle = '#7a6040'; g.beginPath(); g.moveTo(x, y - u * 0.22); g.lineTo(x + u * 0.13, y); g.lineTo(x + u * 0.03, y); g.fill();
      }
    }
  });
}
