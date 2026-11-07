'use strict';
/* Aube des Nations — dessin de la carte sur un canvas 2D.
   Le terrain est peint par blocs de 6 × 6 cases (transitions entre sols, plages, relief éclairé, forêts),
   gardés en mémoire puis recopiés ; rivières, routes, frontières, brouillard, villes et unités sont posés par-dessus. */

const R = {
  cv: null, x: null, dpr: 1, larg: 0, haut: 0,
  cam: { x: 0, y: 0, z: 1 }, camAnim: null, S: 32,
  sale: true, anims: new Map(), textes: [], blocs: new Map(), image: 0,
  toutVoir: false, grille: false, survol: -1,
  mini: null, mx: null, miniSale: true, miniCache: null,
  surbrillance: null,
  brume: { sig: -1, mU: null, mH: null, calque: null, motif: null, k: 0.12 },
  vignette: null,
};
const BLOC = 6;
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const POLICE = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

const COULEURS = {
  ocean: '#1b4b6f', cote: '#2b7a9b', prairie: '#6c9e44', plaine: '#ada75a', desert: '#dfc78a',
  toundra: '#8b937a', neige: '#edf1f2',
};
const MINI = { ocean: '#17344d', cote: '#235a7b', prairie: '#5b8439', plaine: '#8f8c45', desert: '#bfa972', toundra: '#767b62', neige: '#cfd6d9' };
const qualiteHaute = () => typeof Prefs === 'undefined' || Prefs.qualite !== 'eco';

function moi() { return G && G.joueur >= 0 ? G.civs[G.joueur] : null; }
function voitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vis[i]; }
function connaitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vu[i]; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

/* ---------- Géométrie écran ---------- */
function centreTuile(i) {
  const c = i % G.W, r = (i / G.W) | 0;
  return { x: SQ3 * R.S * (c + 0.5 * (r & 1)) + SQ3 * R.S / 2, y: 1.5 * R.S * r + R.S };
}
const tailleMonde = () => ({ w: SQ3 * R.S * (G.W + 0.5), h: 1.5 * R.S * (G.H - 1) + 2 * R.S });
function tuileEn(sx, sy) {
  const x = sx / R.cam.z + R.cam.x - SQ3 * R.S / 2, y = sy / R.cam.z + R.cam.y - R.S;
  let q = (SQ3 / 3 * x - y / 3) / R.S, r = (2 / 3 * y) / R.S, s = -q - r;
  let rq = Math.round(q), rr2 = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr2 - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr2 - rs; else if (dr > ds) rr2 = -rq - rs;
  const col = rq + (rr2 - (rr2 & 1)) / 2;
  if (rr2 < 0 || rr2 >= G.H || col < 0 || col >= G.W) return -1;
  return rr2 * G.W + col;
}
function borneCam() {
  const m = tailleMonde(), w = R.larg / R.cam.z, h = R.haut / R.cam.z, marge = 120 / R.cam.z;
  R.cam.x = Math.min(Math.max(R.cam.x, -marge - Math.max(0, (w - m.w) / 2)), m.w - w + marge + Math.max(0, (w - m.w) / 2));
  R.cam.y = Math.min(Math.max(R.cam.y, -marge - 50 / R.cam.z), m.h - h + marge + 90 / R.cam.z);
}
function zoomer(f, sx, sy) {
  const z0 = R.cam.z, z = Math.min(2.4, Math.max(0.3, z0 * f));
  if (z === z0) return;
  const px = sx ?? R.larg / 2, py = sy ?? R.haut / 2;
  R.cam.x += px / z0 - px / z; R.cam.y += py / z0 - py / z;
  R.cam.z = z; borneCam(); R.sale = true;
}
function centrerSur(i, anime = true) {
  if (i < 0 || i == null) return;
  const p = centreTuile(i);
  const but = { x: p.x - R.larg / 2 / R.cam.z, y: p.y - R.haut / 2 / R.cam.z };
  if (!anime || (typeof Prefs !== 'undefined' && Prefs.reduit)) { R.cam.x = but.x; R.cam.y = but.y; borneCam(); R.sale = true; return; }
  R.camAnim = { de: { x: R.cam.x, y: R.cam.y }, a: but, t0: performance.now(), d: 320 };
}
function estVisibleEcran(i, marge = 0) {
  const p = centreTuile(i), z = R.cam.z;
  const sx = (p.x - R.cam.x) * z, sy = (p.y - R.cam.y) * z;
  return sx > marge && sx < R.larg - marge && sy > marge + 50 && sy < R.haut - marge - 80;
}
function hexChemin(g, cx, cy, r) {
  g.beginPath();
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k - 30); g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  g.closePath();
}
/* Coins de l'arête k (E, NE, NO, O, SO, SE) à la distance r du centre. */
function arete(p, k, r) {
  const a = ANGLES_DIR[k] * Math.PI / 180;
  return [p.x + r * Math.cos(a - Math.PI / 6), p.y + r * Math.sin(a - Math.PI / 6), p.x + r * Math.cos(a + Math.PI / 6), p.y + r * Math.sin(a + Math.PI / 6)];
}
function milieuArete(p, k, f = 0.866) { const a = ANGLES_DIR[k] * Math.PI / 180; return { x: p.x + R.S * f * Math.cos(a), y: p.y + R.S * f * Math.sin(a) }; }

/* ---------- Peinture du terrain ---------- */
function varier(hex, al) {
  const m = nuance(hex, (al() - 0.5) * 0.09).match(/\d+/g).map(Number);
  return '#' + m.map(x => x.toString(16).padStart(2, '0')).join('');
}
/* Bande dégradée le long d'une arête, vers l'intérieur de la case. */
function bandeau(g, p, k, coul, alpha, prof) {
  const S = R.S, [x1, y1, x2, y2] = arete(p, k, S * 1.02), m = milieuArete(p, k, 0.88);
  const f = 1 - prof * 1.15;
  const ix1 = p.x + (x1 - p.x) * f, iy1 = p.y + (y1 - p.y) * f, ix2 = p.x + (x2 - p.x) * f, iy2 = p.y + (y2 - p.y) * f;
  const d = g.createLinearGradient(m.x, m.y, p.x + (m.x - p.x) * (1 - prof * 1.1), p.y + (m.y - p.y) * (1 - prof * 1.1));
  d.addColorStop(0, rgba(coul, alpha)); d.addColorStop(1, rgba(coul, 0));
  g.fillStyle = d;
  g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(ix2, iy2); g.lineTo(ix1, iy1); g.closePath(); g.fill();
}
function peindreSol(g, i) {
  const t = G.tuiles[i], p = centreTuile(i), S = R.S, al = creerAlea((i * 2654435761) >>> 0);
  const eau = TERRAINS[t.t].eau, base = varier(COULEURS[t.t], al);
  hexChemin(g, p.x, p.y, S * 1.03);
  g.save(); g.clip();
  const grd = g.createLinearGradient(p.x - S * 0.7, p.y - S * 0.9, p.x + S * 0.7, p.y + S * 0.9);
  grd.addColorStop(0, nuance(base, eau ? 0.05 : 0.08)); grd.addColorStop(1, nuance(base, eau ? -0.1 : -0.08));
  g.fillStyle = grd; g.fillRect(p.x - S * 1.2, p.y - S * 1.2, S * 2.4, S * 2.4);
  /* Grain. */
  for (let k = 0; k < (eau ? 6 : 16); k++) {
    g.fillStyle = al() < 0.5 ? 'rgba(255,255,235,0.06)' : 'rgba(0,0,0,0.07)';
    g.beginPath(); g.ellipse(p.x + (al() - 0.5) * S * 1.8, p.y + (al() - 0.5) * S * 1.8, S * (0.08 + al() * 0.16), S * (0.04 + al() * 0.07), al() * 3, 0, 7); g.fill();
  }
  /* Transitions avec les voisins. */
  for (let k = 0; k < 6; k++) {
    const j = VOIS[i * 6 + k];
    if (j < 0) continue;
    const tj = G.tuiles[j], eauJ = TERRAINS[tj.t].eau;
    if (eau === eauJ && tj.t !== t.t) bandeau(g, p, k, COULEURS[tj.t], 0.5, 0.5);
    if (!eau && eauJ) bandeau(g, p, k, '#dcc995', 0.95, 0.3);
    if (eau && !eauJ) {
      bandeau(g, p, k, '#62b9c4', 0.75, 0.55);
      if (k === 1 || k === 2 || k === 3) bandeau(g, p, k, '#0b2233', 0.22, 0.3);
    }
  }
  /* Détails selon le sol. */
  if (eau) {
    g.strokeStyle = t.t === 'ocean' ? 'rgba(170,210,235,0.16)' : 'rgba(220,240,250,0.22)'; g.lineWidth = S * 0.03;
    for (let k = 0; k < 4; k++) {
      const x = p.x + (al() - 0.5) * S * 1.2, y = p.y + (al() - 0.5) * S * 1.3, w = S * (0.12 + al() * 0.1);
      g.beginPath(); g.arc(x - w, y, w, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + w * 0.9, y, w, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  } else if (t.t === 'desert') {
    for (let k = 0; k < 4; k++) {
      const y = p.y + (al() - 0.5) * S * 1.2, x = p.x + (al() - 0.5) * S * 0.8, w = S * (0.3 + al() * 0.2);
      g.strokeStyle = 'rgba(255,245,215,0.45)'; g.lineWidth = S * 0.035; g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x, y - S * 0.18, x + w, y); g.stroke();
      g.strokeStyle = 'rgba(150,105,50,0.3)'; g.beginPath(); g.moveTo(x - w * 0.6, y + S * 0.04); g.quadraticCurveTo(x + w * 0.2, y - S * 0.06, x + w, y + S * 0.02); g.stroke();
    }
  } else if (t.t === 'neige') {
    for (let k = 0; k < 6; k++) { g.fillStyle = 'rgba(150,180,205,0.22)'; g.beginPath(); g.ellipse(p.x + (al() - 0.5) * S * 1.4, p.y + (al() - 0.5) * S * 1.4, S * 0.28, S * 0.08, 0, 0, 7); g.fill(); }
  } else {
    const herbe = t.t === 'plaine' ? 'rgba(120,100,30,0.38)' : t.t === 'toundra' ? 'rgba(60,70,50,0.38)' : 'rgba(35,70,20,0.38)';
    g.strokeStyle = herbe; g.lineWidth = S * 0.028;
    for (let k = 0; k < 11; k++) {
      const x = p.x + (al() - 0.5) * S * 1.5, y = p.y + (al() - 0.5) * S * 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - S * 0.04, y - S * 0.1); g.moveTo(x, y); g.lineTo(x + S * 0.01, y - S * 0.12); g.moveTo(x, y); g.lineTo(x + S * 0.05, y - S * 0.09); g.stroke();
    }
    if (t.t === 'prairie' && !t.cv) for (let k = 0; k < 5; k++) { g.fillStyle = al() < 0.5 ? 'rgba(255,240,150,0.7)' : 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(p.x + (al() - 0.5) * S * 1.3, p.y + (al() - 0.5) * S * 1.3, S * 0.022, 0, 7); g.fill(); }
    if (t.t === 'toundra') for (let k = 0; k < 3; k++) { const x = p.x + (al() - 0.5) * S, y = p.y + (al() - 0.5) * S; g.fillStyle = '#7d7c74'; g.beginPath(); g.ellipse(x, y, S * 0.07, S * 0.045, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(x - S * 0.02, y - S * 0.015, S * 0.035, S * 0.02, 0, 0, 7); g.fill(); }
  }
  if (t.cv === 'marais') {
    for (let k = 0; k < 4; k++) {
      const x = p.x + (al() - 0.5) * S * 1.1, y = p.y + (al() - 0.5) * S * 1.1;
      const d = g.createLinearGradient(x, y - S * 0.1, x, y + S * 0.1); d.addColorStop(0, 'rgba(90,150,160,0.7)'); d.addColorStop(1, 'rgba(40,90,100,0.7)');
      g.fillStyle = d; g.beginPath(); g.ellipse(x, y, S * 0.24, S * 0.09, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(200,235,240,0.35)'; g.lineWidth = S * 0.015; g.beginPath(); g.moveTo(x - S * 0.12, y - S * 0.02); g.lineTo(x + S * 0.04, y - S * 0.02); g.stroke();
    }
  }
  g.restore();
}
/* Arbres, collines, montagnes : peints après tous les sols du bloc (ils débordent vers le haut). */
function arbreFeuillu(g, x, y, r, sombre, clair) {
  g.fillStyle = 'rgba(10,20,5,0.3)'; g.beginPath(); g.ellipse(x + r * 0.45, y + r * 0.85, r * 1.0, r * 0.38, 0, 0, 7); g.fill();
  g.fillStyle = '#4a3420'; g.fillRect(x - r * 0.12, y + r * 0.1, r * 0.24, r * 0.8);
  g.fillStyle = sombre; g.beginPath(); g.arc(x, y - r * 0.05, r, 0, 7); g.arc(x - r * 0.55, y + r * 0.2, r * 0.65, 0, 7); g.arc(x + r * 0.55, y + r * 0.18, r * 0.68, 0, 7); g.fill();
  g.fillStyle = clair; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.32, r * 0.5, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,220,0.18)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.45, r * 0.22, 0, 7); g.fill();
}
function sapin(g, x, y, r, coul, neige) {
  g.fillStyle = 'rgba(10,20,5,0.3)'; g.beginPath(); g.ellipse(x + r * 0.5, y + r * 0.15, r * 0.8, r * 0.28, 0, 0, 7); g.fill();
  g.fillStyle = '#4a3420'; g.fillRect(x - r * 0.08, y - r * 0.15, r * 0.16, r * 0.3);
  for (let k = 0; k < 3; k++) {
    const yb = y - k * r * 0.55, w = r * (0.7 - k * 0.15), h = r * 0.85;
    g.fillStyle = coul; g.beginPath(); g.moveTo(x, yb - h); g.lineTo(x + w, yb); g.lineTo(x - w, yb); g.fill();
    g.fillStyle = 'rgba(255,255,230,0.14)'; g.beginPath(); g.moveTo(x, yb - h); g.lineTo(x - w, yb); g.lineTo(x - w * 0.1, yb - h * 0.15); g.fill();
    if (neige) { g.fillStyle = 'rgba(250,252,255,0.8)'; g.beginPath(); g.moveTo(x, yb - h); g.lineTo(x + w * 0.35, yb - h * 0.55); g.lineTo(x - w * 0.35, yb - h * 0.55); g.fill(); }
  }
}
function palmier(g, x, y, r) {
  g.fillStyle = 'rgba(10,20,5,0.28)'; g.beginPath(); g.ellipse(x + r * 0.6, y, r * 0.8, r * 0.25, 0, 0, 7); g.fill();
  g.strokeStyle = '#6b4a2a'; g.lineWidth = r * 0.16; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + r * 0.3, y - r * 0.8, x + r * 0.1, y - r * 1.5); g.stroke();
  g.strokeStyle = '#2f7a3a'; g.lineWidth = r * 0.14;
  for (const a of [-2.6, -2.0, -1.2, -0.5, 0.1]) { g.beginPath(); g.moveTo(x + r * 0.1, y - r * 1.5); g.quadraticCurveTo(x + r * 0.1 + Math.cos(a) * r * 0.6, y - r * 1.5 + Math.sin(a) * r * 0.6 - r * 0.2, x + r * 0.1 + Math.cos(a) * r * 1.0, y - r * 1.5 + Math.sin(a) * r * 1.0 + r * 0.25); g.stroke(); }
}
function colline(g, x, y, w, h, base) {
  g.fillStyle = 'rgba(15,20,5,0.25)'; g.beginPath(); g.ellipse(x + w * 0.25, y + h * 0.05, w * 1.05, h * 0.3, 0, 0, 7); g.fill();
  const d = g.createLinearGradient(x - w, y - h, x + w * 0.6, y);
  d.addColorStop(0, nuance(base, 0.16)); d.addColorStop(0.55, nuance(base, -0.05)); d.addColorStop(1, nuance(base, -0.3));
  g.fillStyle = d; g.beginPath(); g.moveTo(x - w, y); g.bezierCurveTo(x - w * 0.7, y - h * 1.05, x + w * 0.5, y - h * 1.15, x + w, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,255,220,0.18)'; g.lineWidth = w * 0.06; g.beginPath(); g.moveTo(x - w * 0.75, y - h * 0.35); g.quadraticCurveTo(x - w * 0.45, y - h * 0.85, x - w * 0.05, y - h * 0.88); g.stroke();
}
function montagne(g, x, y, w, h, loin) {
  g.fillStyle = 'rgba(10,10,10,0.3)'; g.beginPath(); g.ellipse(x + w * 0.4, y + h * 0.03, w * 1.1, h * 0.12, 0, 0, 7); g.fill();
  const clair = loin ? '#b9b4aa' : '#a9a397', sombre = loin ? '#7d786f' : '#5d5850';
  const sx = x + w * 0.08;
  g.fillStyle = sombre; g.beginPath(); g.moveTo(sx, y - h); g.lineTo(x + w, y); g.lineTo(x - w * 0.05, y); g.closePath(); g.fill();
  const d = g.createLinearGradient(x - w, y - h, x, y); d.addColorStop(0, nuance(clair, 0.1)); d.addColorStop(1, nuance(clair, -0.12));
  g.fillStyle = d; g.beginPath(); g.moveTo(sx, y - h); g.lineTo(x - w * 0.05, y); g.lineTo(x - w, y); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(60,55,50,0.45)'; g.lineWidth = w * 0.04;
  g.beginPath(); g.moveTo(sx, y - h); g.lineTo(x - w * 0.15, y - h * 0.55); g.lineTo(x - w * 0.02, y - h * 0.3); g.moveTo(x - w * 0.5, y - h * 0.4); g.lineTo(x - w * 0.3, y - h * 0.2); g.stroke();
  g.fillStyle = '#f6f7f5'; g.beginPath(); g.moveTo(sx, y - h); g.lineTo(sx - w * 0.36, y - h * 0.62); g.lineTo(sx - w * 0.2, y - h * 0.66); g.lineTo(sx - w * 0.08, y - h * 0.57); g.lineTo(sx + w * 0.08, y - h * 0.68); g.lineTo(sx + w * 0.3, y - h * 0.62); g.closePath(); g.fill();
  g.fillStyle = 'rgba(150,175,200,0.55)'; g.beginPath(); g.moveTo(sx, y - h); g.lineTo(sx + w * 0.3, y - h * 0.62); g.lineTo(sx + w * 0.08, y - h * 0.68); g.closePath(); g.fill();
}
function peindreRelief(g, i) {
  const t = G.tuiles[i], p = centreTuile(i), S = R.S, al = creerAlea(((i + 7) * 40503) >>> 0);
  if (TERRAINS[t.t].eau) return;
  const base = COULEURS[t.t];
  if (t.rel === 2) {
    montagne(g, p.x - S * 0.42, p.y - S * 0.12, S * 0.42, S * 0.72, true);
    montagne(g, p.x + S * 0.38, p.y - S * 0.06, S * 0.4, S * 0.66, true);
    montagne(g, p.x - S * 0.02, p.y + S * 0.38, S * 0.56, S * 1.05, false);
    return;
  }
  if (t.rel === 1) {
    colline(g, p.x - S * 0.35, p.y - S * 0.05, S * 0.42, S * 0.36, base);
    colline(g, p.x + S * 0.33, p.y + S * 0.02, S * 0.4, S * 0.32, base);
    colline(g, p.x, p.y + S * 0.42, S * 0.5, S * 0.4, base);
  }
  if (t.cv === 'foret' || t.cv === 'jungle') {
    const nb = t.cv === 'jungle' ? 11 : 10, pts = [];
    for (let k = 0; k < nb * 3 && pts.length < nb; k++) {
      const x = (al() - 0.5) * S * 1.35, y = (al() - 0.5) * S * 1.25 + S * 0.05;
      if (Math.abs(x) * 0.58 + Math.abs(y) * 0.5 > S * 0.5) continue;
      if (pts.some(q => Math.hypot(q[0] - x, q[1] - y) < S * 0.18)) continue;
      pts.push([x, y]);
    }
    pts.sort((a, b) => a[1] - b[1]);
    for (const [dx, dy] of pts) {
      const x = p.x + dx, y = p.y + dy - (t.rel === 1 ? S * 0.12 : 0);
      if (t.cv === 'jungle') { if (al() < 0.28) palmier(g, x, y + S * 0.12, S * 0.2); else arbreFeuillu(g, x, y, S * 0.15, '#215b36', '#3f8a4a'); }
      else if (t.t === 'toundra') sapin(g, x, y + S * 0.1, S * 0.2, '#2a4a37', true);
      else if (al() < 0.35) sapin(g, x, y + S * 0.1, S * 0.19, '#2c5530', false);
      else arbreFeuillu(g, x, y, S * 0.13, '#33632c', '#5d9445');
    }
  } else if (!t.rel && (t.t === 'prairie' || t.t === 'plaine') && al() < 0.3 && !t.res) {
    arbreFeuillu(g, p.x + (al() - 0.5) * S * 0.8, p.y + (al() - 0.5) * S * 0.6, S * 0.1, '#3a6a2e', '#66a04a');
  } else if (t.t === 'desert' && al() < 0.3) {
    const x = p.x + (al() - 0.5) * S * 0.8, y = p.y + (al() - 0.5) * S * 0.6;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + S * 0.05, y + S * 0.03, S * 0.12, S * 0.04, 0, 0, 7); g.fill();
    g.fillStyle = '#a58a62'; g.beginPath(); g.ellipse(x, y, S * 0.1, S * 0.06, 0, Math.PI, 0); g.fill();
  }
}

/* ---------- Blocs de terrain en mémoire ---------- */
function signatureBloc(bx, by) {
  let s = '';
  for (let r = by * BLOC; r < Math.min(G.H, by * BLOC + BLOC + 1); r++) for (let c = Math.max(0, bx * BLOC - 1); c < Math.min(G.W, bx * BLOC + BLOC + 1); c++) {
    const t = G.tuiles[r * G.W + c];
    s += t.t[0] + t.rel + (t.cv ? t.cv[0] : '-');
  }
  return s;
}
function resBloc() {
  const z = R.cam.z * R.dpr;
  const res = z <= 0.55 ? 0.5 : z <= 1.1 ? 1 : z <= 2.2 ? 2 : 3;
  return qualiteHaute() ? res : Math.min(res, 1);
}
function rendreBloc(bx, by, res, sig) {
  const S = R.S;
  const c0 = bx * BLOC, c1 = Math.min(G.W - 1, c0 + BLOC - 1), r0 = by * BLOC, r1 = Math.min(G.H - 1, r0 + BLOC - 1);
  const x0 = SQ3 * S * c0 - S * 0.3, x1 = SQ3 * S * (c1 + 1.5) + S * 0.3, y0 = 1.5 * S * r0 - S * 1.3, y1 = 1.5 * S * r1 + 2 * S + S * 0.3;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((x1 - x0) * res); cv.height = Math.ceil((y1 - y0) * res);
  const g = cv.getContext('2d');
  g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) peindreSol(g, r * G.W + c);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) peindreRelief(g, r * G.W + c);
  return { cv, x0, y0, w: x1 - x0, h: y1 - y0, sig, vu: R.image, px: cv.width * cv.height, res, bx, by };
}
function liberer() {
  let total = 0;
  for (const b of R.blocs.values()) total += b.px;
  const max = qualiteHaute() ? 32e6 : 14e6;
  if (total <= max) return;
  const tri = [...R.blocs.entries()].sort((a, b) => a[1].vu - b[1].vu);
  for (const [cle, b] of tri) { if (total <= max * 0.8 || b.vu === R.image) break; R.blocs.delete(cle); total -= b.px; }
}
function dessinerTerrain(g, bx0, bx1, by0, by1) {
  const res = resBloc();
  let budget = 3;
  for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
    const sig = signatureBloc(bx, by), cle = `${bx},${by},${res}`;
    let b = R.blocs.get(cle);
    if (!b || b.sig !== sig) {
      const secours = [0.5, 1, 2, 3].map(r => R.blocs.get(`${bx},${by},${r}`)).find(x => x && x.sig === sig);
      if (secours && budget <= 0) { b = secours; R.sale = true; }
      else { b = rendreBloc(bx, by, res, sig); R.blocs.set(cle, b); budget--; }
    }
    b.vu = R.image;
    g.drawImage(b.cv, b.x0, b.y0, b.w, b.h);
  }
  liberer();
}

/* ---------- Brouillard (masques flous + nuages) ---------- */
function motifNuages() {
  if (R.brume.motif) return R.brume.motif;
  const n = 192, cv = document.createElement('canvas'); cv.width = n; cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), b = creerBruit(creerAlea(99));
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    /* Bruit rendu raccordable en mélangeant les quatre coins. */
    const fx = x / n, fy = y / n, f = (a, c) => b(a * 6, c * 6, 5);
    const v = f(fx, fy) * (1 - fx) * (1 - fy) + f(fx - 1, fy) * fx * (1 - fy) + f(fx, fy - 1) * (1 - fx) * fy + f(fx - 1, fy - 1) * fx * fy;
    const k = Math.max(0, Math.min(1, (v - 0.35) * 1.8));
    const o = (y * n + x) * 4;
    img.data[o] = 14 + k * 38; img.data[o + 1] = 19 + k * 42; img.data[o + 2] = 27 + k * 48; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  R.brume.motif = cv;
  return cv;
}
function majMasques() {
  const c = moi(), B = R.brume;
  if (R.toutVoir || !c) return false;
  let sig = 0;
  for (let i = 0; i < c.vu.length; i++) sig = (sig * 31 + c.vu[i] * 2 + c.vis[i]) | 0;
  if (sig === B.sig && B.mU) return true;
  B.sig = sig;
  const m = tailleMonde(), k = B.k, w = Math.ceil(m.w * k) + 2, h = Math.ceil(m.h * k) + 2;
  if (!B.mU || B.mU.width !== w) { B.mU = document.createElement('canvas'); B.mH = document.createElement('canvas'); B.mU.width = B.mH.width = w; B.mU.height = B.mH.height = h; }
  const gu = B.mU.getContext('2d'), gh = B.mH.getContext('2d');
  gu.clearRect(0, 0, w, h); gh.clearRect(0, 0, w, h);
  gu.fillStyle = gh.fillStyle = '#fff';
  const N = G.W * G.H;
  for (let i = 0; i < N; i++) {
    if (c.vis[i]) continue;
    const p = centreTuile(i);
    hexChemin(gh, p.x * k, p.y * k, R.S * k * 1.04); gh.fill();
    if (!c.vu[i]) { hexChemin(gu, p.x * k, p.y * k, R.S * k * 1.04); gu.fill(); }
  }
  /* Bords de la carte toujours dans les nuages. */
  return true;
}
function dessinerBrume(g) {
  if (!majMasques()) return;
  const B = R.brume, z = R.cam.z, cs = Math.min(1, R.dpr) * 0.5, W = Math.ceil(R.larg * cs), H = Math.ceil(R.haut * cs);
  if (!B.calque || B.calque.width !== W || B.calque.height !== H) { B.calque = document.createElement('canvas'); B.calque.width = W; B.calque.height = H; }
  const c = B.calque.getContext('2d'), k = B.k;
  const couche = (masque, remplir) => {
    c.globalCompositeOperation = 'source-over';
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
    c.setTransform(cs * z, 0, 0, cs * z, -R.cam.x * cs * z, -R.cam.y * cs * z);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(masque, 0, 0, masque.width / k, masque.height / k);
    c.globalCompositeOperation = 'source-in';
    remplir(c);
    c.globalCompositeOperation = 'source-over';
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(B.calque, 0, 0, R.cv.width, R.cv.height); g.restore();
  };
  const vx = R.cam.x - 50, vy = R.cam.y - 50, vw = R.larg / z + 100, vh = R.haut / z + 100;
  couche(B.mH, c2 => { c2.fillStyle = 'rgba(6,10,16,0.5)'; c2.fillRect(vx, vy, vw, vh); });
  couche(B.mU, c2 => {
    if (qualiteHaute()) {
      const motif = c2.createPattern(motifNuages(), 'repeat');
      try { motif.setTransform(new DOMMatrix().scale(3.2)); } catch (e) { /* ancien navigateur : motif à l'échelle 1 */ }
      c2.fillStyle = motif;
    } else c2.fillStyle = '#0d131b';
    c2.fillRect(vx, vy, vw, vh);
  });
}

/* ---------- Dessin principal ---------- */
function dessiner(now) {
  if (!G) return;
  R.image++;
  const g = R.x, z = R.cam.z, S = R.S, dpr = R.dpr;
  if (R.camAnim) {
    const a = R.camAnim, k = Math.min(1, (now - a.t0) / a.d), e = 1 - Math.pow(1 - k, 3);
    R.cam.x = a.de.x + (a.a.x - a.de.x) * e; R.cam.y = a.de.y + (a.a.y - a.de.y) * e; borneCam();
    if (k >= 1) R.camAnim = null;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0c1219'; g.fillRect(0, 0, R.cv.width, R.cv.height);
  g.setTransform(dpr * z, 0, 0, dpr * z, -R.cam.x * dpr * z, -R.cam.y * dpr * z);
  g.lineCap = 'round'; g.lineJoin = 'round';

  const r0 = Math.max(0, Math.floor((R.cam.y - S * 1.5) / (1.5 * S)) - 1), r1 = Math.min(G.H - 1, Math.ceil((R.cam.y + R.haut / z) / (1.5 * S)) + 1);
  const c0 = Math.max(0, Math.floor(R.cam.x / (SQ3 * S)) - 1), c1 = Math.min(G.W - 1, Math.ceil((R.cam.x + R.larg / z) / (SQ3 * S)) + 1);
  const petit = S * z < 17, c = moi();
  const visibles = [];
  for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) visibles.push(r * G.W + col);

  /* 1. Terrain (blocs). */
  dessinerTerrain(g, Math.floor(c0 / BLOC), Math.floor(c1 / BLOC), Math.floor(r0 / BLOC), Math.floor(r1 / BLOC));

  /* 2. Rivières (deux passes : berges puis eau). */
  const rivieres = visibles.filter(i => G.tuiles[i].riv && connaitTuile(i));
  for (const passe of [0, 1, 2]) {
    for (const i of rivieres) {
      const t = G.tuiles[i], p = centreTuile(i), lw = S * (0.07 + Math.min(0.07, (t.rf || 0) * 0.008));
      g.strokeStyle = passe === 0 ? 'rgba(40,60,40,0.55)' : passe === 1 ? '#3f8fbe' : 'rgba(190,230,245,0.55)';
      g.lineWidth = passe === 0 ? lw * 1.9 : passe === 1 ? lw : lw * 0.3;
      for (let k = 0; k < 6; k++) {
        if (!(t.riv & (1 << k))) continue;
        const m = milieuArete(p, k, 0.98), a = ANGLES_DIR[k] * Math.PI / 180, ond = ((i * 7 + k * 3) % 5 - 2) * S * 0.07;
        g.beginPath(); g.moveTo(p.x, p.y);
        g.quadraticCurveTo((p.x + m.x) / 2 - Math.sin(a) * ond, (p.y + m.y) / 2 + Math.cos(a) * ond, m.x, m.y); g.stroke();
      }
    }
  }
  /* 3. Routes. */
  for (const passe of [0, 1]) {
    g.strokeStyle = passe ? '#ae8d5d' : 'rgba(70,50,30,0.7)'; g.lineWidth = S * (passe ? 0.085 : 0.15);
    for (const i of visibles) {
      const t = G.tuiles[i];
      if (!t.rt || VIL[i] && !voisins(i).some(j => G.tuiles[j].rt) || !connaitTuile(i)) continue;
      const p = centreTuile(i);
      let seul = true;
      for (let k = 0; k < 6; k++) {
        const j = VOIS[i * 6 + k];
        if (j < 0 || !G.tuiles[j].rt || !connaitTuile(j)) continue;
        const m = milieuArete(p, k, 0.87); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(m.x, m.y); g.stroke(); seul = false;
      }
      if (seul && !VIL[i]) { g.beginPath(); g.arc(p.x, p.y, S * 0.06, 0, 7); g.stroke(); }
    }
  }
  /* 4. Aménagements, ressources, villages et camps. */
  const pxA = Math.max(8, Math.round(S * z * dpr / 6) * 6);
  for (const i of visibles) {
    if (!connaitTuile(i)) continue;
    const t = G.tuiles[i], p = centreTuile(i);
    if (t.am && !VIL[i]) {
      if (petit) { g.fillStyle = 'rgba(214,180,80,0.6)'; g.beginPath(); g.arc(p.x, p.y, S * 0.15, 0, 7); g.fill(); }
      else { const s = spriteAmel(t.am, pxA, i % 3), k = S / pxA; g.drawImage(s.cv, p.x - s.w / 2 * k, p.y - s.h / 2 * k, s.w * k, s.h * k); }
    }
    if (t.res && !petit && resVisible(c, t.res) && !VIL[i]) {
      const R0 = RESSOURCES[t.res], x = p.x - S * 0.46, y = p.y + S * 0.3;
      g.fillStyle = 'rgba(12,16,22,0.72)'; g.beginPath(); g.arc(x, y, S * 0.2, 0, 7); g.fill();
      g.strokeStyle = R0.luxe ? '#e2bf5e' : R0.p ? '#c9ced3' : '#9fd58a'; g.lineWidth = S * 0.035; g.stroke();
      g.font = `${S * 0.24}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(R0.ic, x, y + S * 0.015);
    }
    if (t.hutte && !petit) {
      maison(g, p.x - S * 0.12, p.y + S * 0.12, S * 0.2, S * 0.13, S * 0.08, '#c8a974', '#d9bc6a', { toitH: S * 0.16 });
      maison(g, p.x + S * 0.18, p.y + S * 0.22, S * 0.16, S * 0.11, S * 0.07, '#c8a974', '#cdb05e', { toitH: S * 0.13 });
    }
    if (t.camp && !petit) {
      const lueur = g.createRadialGradient(p.x, p.y + S * 0.1, 0, p.x, p.y + S * 0.1, S * 0.45);
      lueur.addColorStop(0, 'rgba(255,150,60,0.45)'); lueur.addColorStop(1, 'rgba(255,120,40,0)');
      g.fillStyle = lueur; g.beginPath(); g.arc(p.x, p.y + S * 0.1, S * 0.45, 0, 7); g.fill();
      g.fillStyle = '#5a3a22'; g.beginPath(); g.moveTo(p.x - S * 0.42, p.y + S * 0.15); g.lineTo(p.x - S * 0.22, p.y - S * 0.2); g.lineTo(p.x - S * 0.02, p.y + S * 0.15); g.fill();
      g.fillStyle = '#ff9a3c'; g.beginPath(); g.moveTo(p.x + S * 0.12, p.y + S * 0.22); g.quadraticCurveTo(p.x + S * 0.2, p.y - S * 0.05, p.x + S * 0.24, p.y + S * 0.22); g.fill();
      g.fillStyle = '#ffe08a'; g.beginPath(); g.moveTo(p.x + S * 0.16, p.y + S * 0.22); g.quadraticCurveTo(p.x + S * 0.2, p.y + S * 0.08, p.x + S * 0.22, p.y + S * 0.22); g.fill();
      g.fillStyle = '#e8e0d0'; g.beginPath(); g.arc(p.x + S * 0.35, p.y - S * 0.15, S * 0.05, 0, 7); g.fill();
    }
  }
  /* 5. Grille. */
  if (R.grille) {
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1 / z;
    for (const i of visibles) if (connaitTuile(i)) { const p = centreTuile(i); hexChemin(g, p.x, p.y, S); g.stroke(); }
  }
  /* 6. Frontières : dégradé intérieur + filet. */
  for (const i of visibles) {
    const t = G.tuiles[i];
    if (t.prop < 0 || !connaitTuile(i)) continue;
    const coul = G.civs[t.prop].couleur, p = centreTuile(i);
    for (let k = 0; k < 6; k++) {
      const j = VOIS[i * 6 + k];
      if (j >= 0 && G.tuiles[j].prop === t.prop) continue;
      if (!petit) bandeau(g, p, k, coul, 0.42, 0.32);
      const [x1, y1, x2, y2] = arete(p, k, S * 0.93);
      g.strokeStyle = 'rgba(10,10,10,0.45)'; g.lineWidth = S * 0.12; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      g.strokeStyle = coul; g.lineWidth = S * 0.075; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
  }
  /* 7. Brouillard. */
  if (c && !R.toutVoir) {
    g.save(); dessinerBrume(g); g.restore();
  }
  /* 8. Surbrillances. */
  const sb = R.surbrillance;
  if (sb) {
    if (sb.villeTuiles) {
      for (const i of sb.villeTuiles) { const p = centreTuile(i); g.fillStyle = 'rgba(255,240,200,0.06)'; hexChemin(g, p.x, p.y, S * 0.96); g.fill(); }
      if (sb.villeTrav) for (const i of sb.villeTrav) {
        const p = centreTuile(i);
        g.fillStyle = 'rgba(20,24,30,0.85)'; g.beginPath(); g.arc(p.x, p.y - S * 0.5, S * 0.14, 0, 7); g.fill();
        g.strokeStyle = '#f0dc9c'; g.lineWidth = S * 0.04; g.stroke();
        g.fillStyle = '#f0dc9c'; g.beginPath(); g.arc(p.x, p.y - S * 0.54, S * 0.04, 0, 7); g.fill(); g.beginPath(); g.ellipse(p.x, p.y - S * 0.44, S * 0.07, S * 0.035, 0, Math.PI, 0); g.fill();
      }
    }
    if (sb.atteint && sb.atteint.size) {
      g.fillStyle = 'rgba(255,255,240,0.13)';
      for (const i of sb.atteint) { const p = centreTuile(i); hexChemin(g, p.x, p.y, S * 1.0); g.fill(); }
      g.strokeStyle = 'rgba(255,250,225,0.75)'; g.lineWidth = S * 0.05;
      const dans = j => sb.atteint.has(j) || j === sb.depart;
      for (const i of sb.atteint) {
        const p = centreTuile(i);
        for (let k = 0; k < 6; k++) { const j = VOIS[i * 6 + k]; if (j >= 0 && dans(j)) continue; const [x1, y1, x2, y2] = arete(p, k, S * 0.97); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
      }
    }
    if (sb.cibles) for (const i of sb.cibles) {
      const p = centreTuile(i), t = performance.now() / 500;
      g.strokeStyle = `rgba(240,80,55,${0.7 + 0.3 * Math.sin(t * 3)})`; g.lineWidth = S * 0.09; hexChemin(g, p.x, p.y, S * 0.86); g.stroke();
    }
    if (sb.chemin && sb.chemin.length) {
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = S * 0.14;
      const trace = () => { g.beginPath(); const d = centreTuile(sb.depart); g.moveTo(d.x, d.y); for (const i of sb.chemin) { const p = centreTuile(i); g.lineTo(p.x, p.y); } g.stroke(); };
      trace();
      g.strokeStyle = sb.attaque ? 'rgba(240,90,60,0.95)' : 'rgba(252,244,215,0.95)'; g.lineWidth = S * 0.08; g.setLineDash([S * 0.18, S * 0.12]);
      trace(); g.setLineDash([]);
      const fin = centreTuile(sb.chemin[sb.chemin.length - 1]);
      g.fillStyle = sb.attaque ? 'rgba(240,90,60,0.95)' : 'rgba(252,244,215,0.95)'; g.beginPath(); g.arc(fin.x, fin.y, S * 0.12, 0, 7); g.fill();
      for (const m of sb.marques || []) {
        const p = centreTuile(m.i);
        g.fillStyle = '#10161f'; g.beginPath(); g.arc(p.x, p.y, S * 0.24, 0, 7); g.fill();
        g.strokeStyle = 'rgba(252,244,215,0.95)'; g.lineWidth = S * 0.05; g.stroke();
        g.fillStyle = '#f5ecd7'; g.font = `700 ${S * 0.28}px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(m.n), p.x, p.y + S * 0.01);
      }
    }
  }
  if (R.survol >= 0 && R.survol < G.W * G.H && typeof Prefs !== 'undefined' && Prefs.survol) { const p = centreTuile(R.survol); g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = S * 0.045; hexChemin(g, p.x, p.y, S * 0.95); g.stroke(); }

  /* 9. Villes puis unités, de l'arrière vers l'avant. */
  const dansVue = (p, m) => p.x > R.cam.x - S * m && p.x < R.cam.x + R.larg / z + S * m && p.y > R.cam.y - S * m && p.y < R.cam.y + R.haut / z + S * m;
  const villes = G.villes.filter(v => connaitTuile(v.i)).map(v => ({ v, p: centreTuile(v.i) })).filter(o => dansVue(o.p, 3)).sort((a, b) => a.p.y - b.p.y);
  for (const { v, p } of villes) dessinerVille(g, v, p, petit);
  const unites = G.unites.filter(u => voitTuile(u.i)).map(u => ({ u, p: positionUnite(u, now) })).filter(o => dansVue(o.p, 2)).sort((a, b) => a.p.y - b.p.y);
  for (const { u, p } of unites) {
    const o = OCC[u.i], anim = R.anims.has(u.id), deux = o.length > 1 && !anim;
    let dx = 0, dy = 0, ech = 1;
    if (deux) { if (estMil(u)) dx = -S * 0.24; else { dx = S * 0.3; dy = S * 0.08; ech = 0.82; } }
    if (VIL[u.i] && !anim) { dy += S * 0.32; dx += estMil(u) ? -S * 0.3 : S * 0.3; ech *= 0.85; }
    dessinerUnite(g, u, p.x + dx, p.y + dy, petit, ech);
  }
  for (const { v, p } of villes) banniereVille(g, v, p, petit);
  /* 10. Textes flottants. */
  R.textes = R.textes.filter(tx => now - tx.t0 < 1400);
  for (const tx of R.textes) {
    const k = (now - tx.t0) / 1400, p = centreTuile(tx.i);
    g.globalAlpha = 1 - k * k;
    g.font = `800 ${S * 0.42}px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = S * 0.1; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(tx.txt, p.x, p.y - S * 0.6 - k * S * 0.8);
    g.fillStyle = tx.coul; g.fillText(tx.txt, p.x, p.y - S * 0.6 - k * S * 0.8);
    g.globalAlpha = 1;
  }
  /* 11. Vignettage. */
  if (qualiteHaute()) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    const w = R.cv.width, h = R.cv.height;
    if (!R.vignette || R.vignette.w !== w || R.vignette.h !== h) {
      const d = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.58);
      d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(1, 'rgba(5,8,12,0.42)');
      R.vignette = { w, h, d };
    }
    g.fillStyle = R.vignette.d; g.fillRect(0, 0, w, h);
  }
}

function positionUnite(u, now) {
  const a = R.anims.get(u.id);
  if (!a) return centreTuile(u.i);
  const pas = (now - a.t0) / a.dur, k = Math.floor(pas);
  if (k >= a.ch.length - 1) { R.anims.delete(u.id); return centreTuile(u.i); }
  const p = centreTuile(a.ch[k]), q = centreTuile(a.ch[k + 1]), f = pas - k;
  return { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
}
function animerDeplacement(u, depart, pas) {
  if (!pas || !pas.length || (typeof Prefs !== 'undefined' && Prefs.reduit)) { R.sale = true; return; }
  R.anims.set(u.id, { ch: [depart, ...pas], t0: performance.now(), dur: 130 });
}
function texteFlottant(i, txt, coul) { R.textes.push({ i, txt, coul, t0: performance.now() }); }
function rectArrondi(g, x, y, w, h, r) { rr(g, x, y, w, h, r); }

/* ---------- Villes ---------- */
function dessinerVille(g, v, p, petit) {
  const S = R.S, civ = G.civs[v.civ];
  if (petit) {
    g.fillStyle = civ.couleur; g.beginPath(); g.arc(p.x, p.y, S * 0.42, 0, 7); g.fill();
    g.strokeStyle = '#f3ead5'; g.lineWidth = S * 0.08; g.stroke();
    return;
  }
  const px = Math.max(10, Math.round(S * R.cam.z * R.dpr / 6) * 6), s = spriteVille(v, px, ereCiv(civ)), k = S / px;
  g.drawImage(s.cv, p.x - px * 1.3 * k, p.y - px * 1.55 * k, s.w * k, s.h * k);
  const pvm = pvMaxVille(v);
  if (v.pv < pvm) {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(p.x - S * 0.5, p.y + S * 0.62, S, S * 0.1);
    g.fillStyle = v.pv / pvm > 0.5 ? '#7cc46a' : v.pv / pvm > 0.25 ? '#e2b23c' : '#e2543c';
    g.fillRect(p.x - S * 0.5, p.y + S * 0.62, S * v.pv / pvm, S * 0.1);
  }
}
function banniereVille(g, v, p, petit) {
  const S = R.S, civ = G.civs[v.civ], cap = !!v.bat.palais, mine = v.civ === G.joueur;
  const taille = petit ? S * 0.55 : S * 0.32;
  g.font = `700 ${taille}px ${POLICE}`;
  const nom = (cap ? '★ ' : '') + v.nom, it = mine ? v.file[0] : null;
  const droite = mine ? taille * 2.1 : 0;
  const w = g.measureText(nom).width + taille * 2.4 + droite, h = taille * 1.6, x = p.x - w / 2, y = p.y - S * (petit ? 1.2 : 1.32);
  const fond = g.createLinearGradient(0, y, 0, y + h);
  fond.addColorStop(0, nuance(civ.couleur, -0.25)); fond.addColorStop(1, nuance(civ.couleur, -0.55));
  g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, x + S * 0.04, y + S * 0.06, w, h, h / 2); g.fill();
  g.fillStyle = fond; rr(g, x, y, w, h, h / 2); g.fill();
  g.strokeStyle = nuance(civ.couleur, 0.35); g.lineWidth = S * 0.035; g.stroke();
  g.fillStyle = '#f7efd9'; g.beginPath(); g.arc(x + h / 2, y + h / 2, h / 2 - S * 0.04, 0, 7); g.fill();
  g.fillStyle = '#1b1408'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(v.pop), x + h / 2, y + h / 2 + 1);
  g.fillStyle = '#fbf3df'; g.textAlign = 'left';
  g.fillText(nom, x + h + taille * 0.3, y + h / 2 + 1);
  if (petit) return;
  if (mine) {
    const cout = it ? coutItem(v, it) : 0, b = it ? bilanVille(v) : null;
    const ic = !it ? '❗' : it.k === 'u' ? UNITES[it.id].ic : it.k === 'm' ? '★' : it.k === 'p' ? '⚙️' : '🏛️';
    const xr = x + w - droite + taille * 0.1;
    g.fillStyle = 'rgba(0,0,0,0.35)'; rr(g, xr, y + h * 0.12, droite - taille * 0.35, h * 0.76, h * 0.3); g.fill();
    g.font = `${taille * 0.8}px ${EMOJI}`; g.textAlign = 'center'; g.fillText(ic, xr + taille * 0.5, y + h / 2 + 1);
    if (it && cout < INF) { g.font = `700 ${taille * 0.72}px ${POLICE}`; g.fillStyle = '#fbf3df'; g.fillText(String(toursRestantsBanniere(cout - v.prod, b.p)), xr + taille * 1.3, y + h / 2 + 1); }
    const kp = it && cout < INF ? Math.min(1, v.prod / cout) : 0, kn = Math.min(1, Math.max(0, v.nour / seuilCroissance(v.pop)));
    const bx = x + h * 0.7, bw = w - h * 1.4;
    g.fillStyle = 'rgba(10,12,16,0.85)'; g.fillRect(bx, y + h + S * 0.02, bw, S * 0.13);
    g.fillStyle = '#e09a44'; g.fillRect(bx, y + h + S * 0.02, bw * kp, S * 0.06);
    g.fillStyle = '#86c873'; g.fillRect(bx, y + h + S * 0.09, bw * kn, S * 0.06);
    if (it && !v.aTire && rayon(v.i, 2).some(j => previsionTirVille(v, j))) { g.font = `${S * 0.3}px ${EMOJI}`; g.textAlign = 'center'; g.fillText('🎯', x - S * 0.22, y + h / 2); }
  } else {
    g.font = `700 ${taille * 0.8}px ${POLICE}`; g.fillStyle = 'rgba(251,243,223,0.85)'; g.textAlign = 'center';
    g.fillText(`🛡 ${forceVille(v)}`, p.x, y + h + S * 0.2);
  }
}
const toursRestantsBanniere = (reste, p) => (p > 0 ? Math.max(1, Math.ceil(reste / p)) : '∞');

/* ---------- Unités : figurine + fanion ---------- */
function dessinerUnite(g, u, x, y, petit, echelle = 1) {
  const S = R.S * echelle, civ = G.civs[u.civ], U = UNITES[u.type];
  const sel = typeof UI !== 'undefined' && UI.sel === u.id;
  if (petit) {
    g.fillStyle = civ.couleur; g.beginPath(); g.arc(x, y, S * 0.34, 0, 7); g.fill();
    g.strokeStyle = sel ? '#fff8dc' : '#14100b'; g.lineWidth = S * 0.08; g.stroke();
    return;
  }
  const yPied = y + S * 0.3;
  if (sel) {
    const t = performance.now() / 600;
    g.strokeStyle = `rgba(255,248,220,${0.65 + 0.3 * Math.sin(t * 3)})`; g.lineWidth = R.S * 0.06;
    g.beginPath(); g.ellipse(x, yPied, S * 0.55, S * 0.22, 0, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,248,220,0.15)'; g.fill();
  }
  const px = Math.max(10, Math.round(S * R.cam.z * R.dpr / 4) * 4), s = spriteUnite(u.type, civ.couleur, px, estEmbarque(u)), k = S / px;
  g.drawImage(s.cv, x - px * 1.2 * k, yPied - px * 1.45 * k, s.w * k, s.h * k);
  /* Fanion : écusson aux couleurs de la nation. */
  const fx = x + S * 0.4, fy = y - S * 0.62, fw = S * 0.38, fh = S * 0.44;
  g.strokeStyle = 'rgba(30,22,12,0.8)'; g.lineWidth = S * 0.035; g.beginPath(); g.moveTo(fx - fw * 0.5, fy - fh * 0.1); g.lineTo(fx - fw * 0.5, yPied - S * 0.1); g.stroke();
  const ecusson = () => { g.beginPath(); g.moveTo(fx - fw / 2, fy - fh / 2); g.lineTo(fx + fw / 2, fy - fh / 2); g.lineTo(fx + fw / 2, fy + fh * 0.12); g.quadraticCurveTo(fx + fw / 2, fy + fh * 0.4, fx, fy + fh / 2); g.quadraticCurveTo(fx - fw / 2, fy + fh * 0.4, fx - fw / 2, fy + fh * 0.12); g.closePath(); };
  ecusson();
  const d = g.createLinearGradient(fx, fy - fh / 2, fx, fy + fh / 2); d.addColorStop(0, nuance(civ.couleur, 0.2)); d.addColorStop(1, nuance(civ.couleur, -0.35));
  g.fillStyle = d; g.fill();
  g.strokeStyle = sel ? '#fff4c8' : (U.classe === 'civil' ? '#f3ead5' : '#1a140c'); g.lineWidth = S * 0.04; g.stroke();
  g.font = `${S * 0.24}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(U.ic, fx, fy - fh * 0.04);
  if (u.pv < 100) {
    g.fillStyle = 'rgba(0,0,0,0.8)'; g.fillRect(fx - fw / 2, fy + fh / 2 + S * 0.03, fw, S * 0.07);
    g.fillStyle = u.pv > 60 ? '#7cc46a' : u.pv > 30 ? '#e2b23c' : '#e2543c'; g.fillRect(fx - fw / 2, fy + fh / 2 + S * 0.03, fw * u.pv / 100, S * 0.07);
  }
  if (u.niv) { g.fillStyle = '#f0c040'; g.font = `800 ${S * 0.17}px ${POLICE}`; g.fillText('★'.repeat(Math.min(3, u.niv)), fx, fy - fh / 2 - S * 0.08); }
  if (u.ordre === 'fort' && u.fort >= 1) {
    g.strokeStyle = '#8b8275'; g.lineWidth = S * 0.07; g.beginPath(); g.ellipse(x, yPied, S * 0.5, S * 0.18, 0, 0.15, Math.PI - 0.15); g.stroke();
    g.strokeStyle = '#b5ad9e'; g.lineWidth = S * 0.025; g.beginPath(); g.ellipse(x, yPied - S * 0.03, S * 0.5, S * 0.18, 0, 0.2, Math.PI - 0.2); g.stroke();
  }
  if (u.civ === G.joueur && u.mv > 0 && !u.ordre && !sel) { g.fillStyle = '#fff4c8'; g.beginPath(); g.arc(fx + fw * 0.55, fy - fh * 0.45, S * 0.06, 0, 7); g.fill(); }
}

/* ---------- Mini-carte ---------- */
function dessinerMini() {
  if (!R.mini || !G) return;
  const W = G.W, H = G.H, cw = R.mini.width, ch = R.mini.height, g = R.mx;
  if (R.miniSale || !R.miniCache) {
    const img = g.createImageData(cw, ch), d = img.data;
    const kx = cw / (W + 0.5), ky = ch / H;
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const r = Math.min(H - 1, Math.floor(py / ky)), col = Math.min(W - 1, Math.max(0, Math.floor(px / kx - 0.5 * (r & 1)))), i = r * W + col;
      let col3 = [10, 14, 19];
      if (connaitTuile(i)) {
        const t = G.tuiles[i];
        col3 = rgb(t.prop >= 0 && !TERRAINS[t.t].eau ? G.civs[t.prop].couleur : (t.rel === 2 ? '#8a857a' : MINI[t.t]));
        if (!voitTuile(i)) col3 = col3.map(x => x * 0.62);
        if (VIL[i]) col3 = [250, 245, 230];
      }
      const o = (py * cw + px) * 4; d[o] = col3[0]; d[o + 1] = col3[1]; d[o + 2] = col3[2]; d[o + 3] = 255;
    }
    R.miniCache = img; R.miniSale = false;
  }
  g.putImageData(R.miniCache, 0, 0);
  const m = tailleMonde(), kx = cw / m.w, ky = ch / m.h;
  g.strokeStyle = 'rgba(255,248,225,0.9)'; g.lineWidth = 1.5;
  g.strokeRect(R.cam.x * kx, R.cam.y * ky, R.larg / R.cam.z * kx, R.haut / R.cam.z * ky);
}

let dernierDessin = 0;
function boucle(now) {
  requestAnimationFrame(boucle);
  if (!G) return;
  const anime = R.anims.size || R.textes.length || R.camAnim;
  /* Anneau de l'unité choisie et cibles : 15 images par seconde seulement (batterie). */
  const pulse = typeof UI !== 'undefined' && (UI.sel !== null || UI.modeTir) && now - dernierDessin > 66;
  if (R.sale || anime || pulse) { R.sale = false; dessiner(now); dessinerMini(); dernierDessin = now; }
}
function redimensionner() {
  R.dpr = Math.min(2, window.devicePixelRatio || 1);
  R.larg = window.innerWidth; R.haut = window.innerHeight;
  R.cv.width = Math.round(R.larg * R.dpr); R.cv.height = Math.round(R.haut * R.dpr);
  R.cv.style.width = R.larg + 'px'; R.cv.style.height = R.haut + 'px';
  if (G) borneCam();
  R.sale = true;
}
function initRendu(cv, mini) {
  R.cv = cv; R.x = cv.getContext('2d', { alpha: false });
  R.mini = mini; R.mx = mini.getContext('2d');
  redimensionner();
  window.addEventListener('resize', redimensionner);
  requestAnimationFrame(boucle);
}
