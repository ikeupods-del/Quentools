'use strict';
/* Aube des Nations — dessin de la carte sur un canvas 2D.
   Les tuiles sont peintes une fois dans de petites images (sprites) puis recopiées : rapide sur téléphone. */

const R = {
  cv: null, x: null, dpr: 1, larg: 0, haut: 0,
  cam: { x: 0, y: 0, z: 1 }, camAnim: null, S: 32,
  sale: true, anims: new Map(), textes: [], sprites: new Map(),
  toutVoir: false, grille: false, survol: -1,
  mini: null, mx: null, miniSale: true, miniCache: null,
  surbrillance: null, // { atteint: Set, chemin: [], cibles: Set, villeTrav: Set }
};
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const POLICE = '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif';

const COULEURS = {
  ocean: '#1b4567', cote: '#2e7096', prairie: '#6c9a43', plaine: '#a6a352', desert: '#d9c487',
  toundra: '#8d9374', neige: '#e8edef',
};
const MINI = { ocean: '#17344d', cote: '#235a7b', prairie: '#5b8439', plaine: '#8f8c45', desert: '#bfa972', toundra: '#767b62', neige: '#cfd6d9' };

function moi() { return G && G.joueur >= 0 ? G.civs[G.joueur] : null; }
function voitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vis[i]; }
function connaitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vu[i]; }

/* ---------- Géométrie écran ---------- */
function centreTuile(i) {
  const c = i % G.W, r = (i / G.W) | 0;
  return { x: SQ3 * R.S * (c + 0.5 * (r & 1)) + SQ3 * R.S / 2, y: 1.5 * R.S * r + R.S };
}
const tailleMonde = () => ({ w: SQ3 * R.S * (G.W + 0.5), h: 1.5 * R.S * (G.H - 1) + 2 * R.S });
function tuileEn(sx, sy) {
  const x = sx / R.cam.z + R.cam.x - SQ3 * R.S / 2, y = sy / R.cam.z + R.cam.y - R.S;
  let q = (SQ3 / 3 * x - y / 3) / R.S, r = (2 / 3 * y) / R.S, s = -q - r;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(s);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  const col = rq + (rr - (rr & 1)) / 2;
  if (rr < 0 || rr >= G.H || col < 0 || col >= G.W) return -1;
  return rr * G.W + col;
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
  if (!anime || Prefs.reduit) { R.cam.x = but.x; R.cam.y = but.y; borneCam(); R.sale = true; return; }
  R.camAnim = { de: { x: R.cam.x, y: R.cam.y }, a: but, t0: performance.now(), d: 320 };
}
function estVisibleEcran(i, marge = 0) {
  const p = centreTuile(i), z = R.cam.z;
  const sx = (p.x - R.cam.x) * z, sy = (p.y - R.cam.y) * z;
  return sx > marge && sx < R.larg - marge && sy > marge + 50 && sy < R.haut - marge - 80;
}

/* ---------- Peinture des tuiles ---------- */
function hexChemin(g, cx, cy, r) {
  g.beginPath();
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k - 30); g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  g.closePath();
}
function nuance(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, v = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; v += (255 - v) * f; b += (255 - b) * f; } else { r *= 1 + f; v *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${v | 0},${b | 0})`;
}
function peindreTuile(g, r, t, variante) {
  const al = creerAlea(((t.t.length * 131 + t.rel * 17 + (t.cv ? t.cv.length * 7 : 0) + variante * 977) * 2654435761) >>> 0);
  const base = COULEURS[t.t];
  hexChemin(g, 0, 0, r * 1.03);
  g.save(); g.clip();
  const grd = g.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.2);
  grd.addColorStop(0, nuance(base, 0.1)); grd.addColorStop(1, nuance(base, -0.12));
  g.fillStyle = grd; g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
  /* Grain du sol. */
  for (let k = 0; k < 22; k++) {
    g.fillStyle = al() < 0.5 ? 'rgba(255,255,240,0.07)' : 'rgba(0,0,0,0.08)';
    g.beginPath(); g.ellipse((al() - 0.5) * r * 1.8, (al() - 0.5) * r * 1.8, r * (0.05 + al() * 0.1), r * (0.03 + al() * 0.05), al() * 3, 0, 7); g.fill();
  }
  if (t.t === 'ocean' || t.t === 'cote') {
    g.strokeStyle = t.t === 'ocean' ? 'rgba(160,200,230,0.18)' : 'rgba(210,235,250,0.25)';
    g.lineWidth = r * 0.035;
    for (let k = 0; k < 4; k++) {
      const x = (al() - 0.5) * r * 1.2, y = (al() - 0.5) * r * 1.3, w = r * (0.15 + al() * 0.12);
      g.beginPath(); g.arc(x - w, y, w, Math.PI * 1.15, Math.PI * 1.85); g.arc(x + w * 0.9, y, w, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    }
  }
  if (t.t === 'desert') {
    g.strokeStyle = 'rgba(150,110,50,0.35)'; g.lineWidth = r * 0.04;
    for (let k = 0; k < 4; k++) { const y = (al() - 0.5) * r * 1.3, x = (al() - 0.5) * r * 0.8; g.beginPath(); g.moveTo(x - r * 0.35, y); g.quadraticCurveTo(x, y - r * 0.16, x + r * 0.35, y); g.stroke(); }
  }
  if (t.t === 'neige') {
    g.fillStyle = 'rgba(160,190,210,0.25)';
    for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse((al() - 0.5) * r * 1.4, (al() - 0.5) * r * 1.4, r * 0.3, r * 0.1, 0, 0, 7); g.fill(); }
  }
  if (t.t === 'prairie' || t.t === 'plaine' || t.t === 'toundra') {
    g.strokeStyle = t.t === 'plaine' ? 'rgba(90,80,20,0.35)' : 'rgba(30,60,20,0.35)'; g.lineWidth = r * 0.03;
    for (let k = 0; k < 9; k++) { const x = (al() - 0.5) * r * 1.5, y = (al() - 0.5) * r * 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x - r * 0.04, y - r * 0.1); g.moveTo(x, y); g.lineTo(x + r * 0.05, y - r * 0.09); g.stroke(); }
  }
  /* Couverts. */
  if (t.cv === 'marais') {
    for (let k = 0; k < 4; k++) {
      const x = (al() - 0.5) * r * 1.2, y = (al() - 0.5) * r * 1.2;
      g.fillStyle = 'rgba(60,110,120,0.55)'; g.beginPath(); g.ellipse(x, y, r * 0.22, r * 0.09, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(40,70,30,0.8)'; g.lineWidth = r * 0.03;
      for (let q = -1; q <= 1; q++) { g.beginPath(); g.moveTo(x + q * r * 0.06, y - r * 0.02); g.lineTo(x + q * r * 0.09, y - r * 0.2); g.stroke(); }
    }
  }
  if (t.cv === 'foret' || t.cv === 'jungle') {
    const nb = t.cv === 'jungle' ? 9 : 8, pts = [];
    for (let k = 0; k < nb; k++) pts.push([(al() - 0.5) * r * 1.25, (al() - 0.5) * r * 1.15 + r * 0.05]);
    pts.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of pts) {
      if (t.t === 'toundra' || (t.cv === 'foret' && al() < 0.35)) {
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + r * 0.04, y + r * 0.16, r * 0.13, r * 0.05, 0, 0, 7); g.fill();
        g.fillStyle = t.t === 'toundra' ? '#2b4a37' : '#2f5a32';
        g.beginPath(); g.moveTo(x, y - r * 0.3); g.lineTo(x + r * 0.14, y + r * 0.12); g.lineTo(x - r * 0.14, y + r * 0.12); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(x, y - r * 0.3); g.lineTo(x - r * 0.14, y + r * 0.12); g.lineTo(x - r * 0.02, y + r * 0.08); g.fill();
      } else {
        const rr = r * (t.cv === 'jungle' ? 0.17 : 0.14) * (0.85 + al() * 0.3);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(x + rr * 0.3, y + rr * 0.9, rr, rr * 0.4, 0, 0, 7); g.fill();
        g.fillStyle = '#4a3420'; g.fillRect(x - r * 0.015, y, r * 0.03, rr * 0.9);
        g.fillStyle = t.cv === 'jungle' ? '#25663a' : '#356b2f';
        g.beginPath(); g.arc(x, y - rr * 0.2, rr, 0, 7); g.fill();
        g.fillStyle = t.cv === 'jungle' ? 'rgba(120,200,110,0.35)' : 'rgba(170,210,120,0.3)';
        g.beginPath(); g.arc(x - rr * 0.3, y - rr * 0.5, rr * 0.45, 0, 7); g.fill();
      }
    }
  }
  /* Relief. */
  if (t.rel === 1) {
    for (let k = 0; k < 3; k++) {
      const x = (k - 1) * r * 0.42 + (al() - 0.5) * r * 0.15, y = r * 0.15 + (k === 1 ? -r * 0.18 : 0), w = r * 0.42, h = r * 0.3;
      g.fillStyle = nuance(base, -0.22); g.beginPath(); g.ellipse(x, y, w, h, 0, Math.PI, 0); g.fill();
      g.fillStyle = nuance(base, 0.12); g.beginPath(); g.ellipse(x - w * 0.25, y, w * 0.65, h * 0.85, 0, Math.PI, Math.PI * 1.6); g.lineTo(x - w * 0.25, y); g.fill();
    }
  }
  if (t.rel === 2) {
    const pics = [[-0.38, 0.32, 0.5], [0.32, 0.36, 0.45], [-0.02, 0.22, 0.72]];
    for (const [px, py, h] of pics) {
      const x = px * r, y = py * r, hh = h * r, w = hh * 0.85;
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(x + w * 0.2, y + r * 0.04, w, r * 0.08, 0, 0, 7); g.fill();
      g.fillStyle = '#6f6b63'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - hh); g.lineTo(x + w, y); g.fill();
      g.fillStyle = '#9c978c'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(x, y - hh); g.lineTo(x - w * 0.1, y); g.fill();
      g.fillStyle = '#f3f3ef'; g.beginPath(); g.moveTo(x - w * 0.32, y - hh * 0.62); g.lineTo(x, y - hh); g.lineTo(x + w * 0.3, y - hh * 0.64); g.lineTo(x + w * 0.1, y - hh * 0.56); g.lineTo(x - w * 0.08, y - hh * 0.66); g.fill();
    }
  }
  g.restore();
}
function sprite(t, variante, haute) {
  const k = `${t.t}|${t.rel}|${t.cv || ''}|${variante}|${haute ? 1 : 0}`;
  let s = R.sprites.get(k);
  if (s) return s;
  const r = haute ? 96 : 44, w = Math.ceil(SQ3 * r * 1.06) + 4, h = Math.ceil(2 * r * 1.06) + 4;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d'); g.translate(w / 2, h / 2);
  peindreTuile(g, r, t, variante);
  s = { cv, r, w, h }; R.sprites.set(k, s);
  return s;
}

/* ---------- Dessin principal ---------- */
function dessiner(now) {
  if (!G) return;
  const g = R.x, z = R.cam.z, S = R.S, dpr = R.dpr;
  if (R.camAnim) {
    const a = R.camAnim, k = Math.min(1, (now - a.t0) / a.d), e = 1 - Math.pow(1 - k, 3);
    R.cam.x = a.de.x + (a.a.x - a.de.x) * e; R.cam.y = a.de.y + (a.a.y - a.de.y) * e; borneCam();
    if (k >= 1) R.camAnim = null;
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#0a0e13'; g.fillRect(0, 0, R.cv.width, R.cv.height);
  g.setTransform(dpr * z, 0, 0, dpr * z, -R.cam.x * dpr * z, -R.cam.y * dpr * z);

  const r0 = Math.max(0, Math.floor((R.cam.y - S) / (1.5 * S)) - 1), r1 = Math.min(G.H - 1, Math.ceil((R.cam.y + R.haut / z) / (1.5 * S)) + 1);
  const c0 = Math.max(0, Math.floor(R.cam.x / (SQ3 * S)) - 1), c1 = Math.min(G.W - 1, Math.ceil((R.cam.x + R.larg / z) / (SQ3 * S)) + 1);
  const haute = S * z * dpr > 52, petit = S * z < 17, c = moi();
  const visibles = [];
  for (let r = r0; r <= r1; r++) for (let col = c0; col <= c1; col++) visibles.push(r * G.W + col);

  /* 1. Terrain. */
  for (const i of visibles) {
    if (!connaitTuile(i)) continue;
    const t = G.tuiles[i], p = centreTuile(i), s = sprite(t, i % 3, haute), k = S / s.r;
    g.drawImage(s.cv, p.x - s.w / 2 * k, p.y - s.h / 2 * k, s.w * k, s.h * k);
  }
  /* 2. Routes, améliorations, ressources. */
  g.lineCap = 'round';
  for (const i of visibles) {
    if (!connaitTuile(i)) continue;
    const t = G.tuiles[i], p = centreTuile(i);
    if (t.rt && !VIL[i]) {
      g.strokeStyle = 'rgba(92,66,38,0.85)'; g.lineWidth = S * 0.09;
      let seul = true;
      for (const j of voisins(i)) if (G.tuiles[j].rt && connaitTuile(j)) { const q = centreTuile(j); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo((p.x + q.x) / 2, (p.y + q.y) / 2); g.stroke(); seul = false; }
      if (seul) { g.fillStyle = 'rgba(92,66,38,0.85)'; g.beginPath(); g.arc(p.x, p.y, S * 0.08, 0, 7); g.fill(); }
    }
    if (t.am === 'ferme') {
      g.strokeStyle = 'rgba(214,180,80,0.75)'; g.lineWidth = S * 0.05;
      for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(p.x - S * 0.45, p.y + k * S * 0.13 + S * 0.1); g.lineTo(p.x + S * 0.45, p.y + k * S * 0.13 - S * 0.05); g.stroke(); }
    } else if (t.am && !petit) {
      g.font = `${S * 0.34}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(AMELIORATIONS[t.am].ic, p.x + S * 0.38, p.y + S * 0.4);
    }
    if (t.res && !petit && resVisible(c, t.res)) {
      g.fillStyle = 'rgba(12,16,22,0.55)'; g.beginPath(); g.arc(p.x - S * 0.42, p.y + S * 0.36, S * 0.22, 0, 7); g.fill();
      g.font = `${S * 0.3}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(RESSOURCES[t.res].ic, p.x - S * 0.42, p.y + S * 0.38);
    }
    if ((t.hutte || t.camp) && !petit) {
      g.font = `${S * 0.5}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(t.camp ? '🔥' : '🛖', p.x, p.y - S * 0.05);
    }
  }
  /* 3. Grille. */
  if (R.grille) {
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1 / z;
    for (const i of visibles) if (connaitTuile(i)) { const p = centreTuile(i); hexChemin(g, p.x, p.y, S); g.stroke(); }
  }
  /* 4. Frontières. */
  for (const i of visibles) {
    const t = G.tuiles[i];
    if (t.prop < 0 || !connaitTuile(i)) continue;
    const coul = G.civs[t.prop].couleur, p = centreTuile(i);
    g.globalAlpha = 0.13; g.fillStyle = coul; hexChemin(g, p.x, p.y, S); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = coul; g.lineWidth = S * 0.09;
    for (let k = 0; k < 6; k++) {
      const j = VOIS[i * 6 + k];
      if (j >= 0 && G.tuiles[j].prop === t.prop) continue;
      const a = ANGLES_DIR[k] * Math.PI / 180, a1 = a - Math.PI / 6, a2 = a + Math.PI / 6, rr = S * 0.9;
      g.beginPath(); g.moveTo(p.x + rr * Math.cos(a1), p.y + rr * Math.sin(a1)); g.lineTo(p.x + rr * Math.cos(a2), p.y + rr * Math.sin(a2)); g.stroke();
    }
  }
  /* 5. Brouillard. */
  for (const i of visibles) {
    if (!connaitTuile(i) || voitTuile(i)) continue;
    const p = centreTuile(i);
    g.fillStyle = 'rgba(8,12,18,0.45)'; hexChemin(g, p.x, p.y, S * 1.01); g.fill();
  }
  /* 6. Surbrillances (déplacement, chemin, cibles, tuiles exploitées). */
  const sb = R.surbrillance;
  if (sb) {
    if (sb.villeTuiles) for (const i of sb.villeTuiles) { const p = centreTuile(i); g.strokeStyle = 'rgba(240,226,190,0.5)'; g.lineWidth = S * 0.05; hexChemin(g, p.x, p.y, S * 0.86); g.stroke(); }
    if (sb.villeTrav) for (const i of sb.villeTrav) { const p = centreTuile(i); g.fillStyle = 'rgba(240,226,190,0.9)'; g.beginPath(); g.arc(p.x, p.y - S * 0.55, S * 0.1, 0, 7); g.fill(); }
    if (sb.atteint) { g.fillStyle = 'rgba(255,255,255,0.14)'; for (const i of sb.atteint) { const p = centreTuile(i); hexChemin(g, p.x, p.y, S * 0.93); g.fill(); } }
    if (sb.cibles) for (const i of sb.cibles) { const p = centreTuile(i); g.strokeStyle = 'rgba(232,84,60,0.95)'; g.lineWidth = S * 0.08; hexChemin(g, p.x, p.y, S * 0.85); g.stroke(); }
    if (sb.chemin && sb.chemin.length) {
      g.strokeStyle = sb.attaque ? 'rgba(232,84,60,0.95)' : 'rgba(250,240,210,0.95)'; g.lineWidth = S * 0.08; g.setLineDash([S * 0.16, S * 0.14]);
      g.beginPath(); const d = centreTuile(sb.depart); g.moveTo(d.x, d.y);
      for (const i of sb.chemin) { const p = centreTuile(i); g.lineTo(p.x, p.y); }
      g.stroke(); g.setLineDash([]);
      for (const m of sb.marques || []) {
        const p = centreTuile(m.i);
        g.fillStyle = '#10161f'; g.beginPath(); g.arc(p.x, p.y, S * 0.24, 0, 7); g.fill();
        g.strokeStyle = 'rgba(250,240,210,0.95)'; g.lineWidth = S * 0.05; g.stroke();
        g.fillStyle = '#f5ecd7'; g.font = `700 ${S * 0.28}px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(m.n), p.x, p.y + S * 0.01);
      }
    }
  }
  if (R.survol >= 0 && R.survol < G.W * G.H && Prefs.survol) { const p = centreTuile(R.survol); g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = S * 0.05; hexChemin(g, p.x, p.y, S * 0.95); g.stroke(); }

  /* 7. Villes. */
  for (const v of G.villes) {
    if (!connaitTuile(v.i)) continue;
    const p = centreTuile(v.i);
    if (p.x < R.cam.x - S * 3 || p.x > R.cam.x + R.larg / z + S * 3 || p.y < R.cam.y - S * 2 || p.y > R.cam.y + R.haut / z + S * 3) continue;
    dessinerVille(g, v, p, petit);
  }
  /* 8. Unités. */
  const tPos = now;
  for (const u of G.unites) {
    if (!voitTuile(u.i)) continue;
    const p = positionUnite(u, tPos);
    if (p.x < R.cam.x - S * 2 || p.x > R.cam.x + R.larg / z + S * 2 || p.y < R.cam.y - S * 2 || p.y > R.cam.y + R.haut / z + S * 2) continue;
    const o = OCC[u.i], deux = o.length > 1 && !R.anims.has(u.id);
    let dx = 0, dy = 0;
    if (deux) { if (estMil(u)) { dx = -S * 0.2; dy = -S * 0.12; } else { dx = S * 0.26; dy = S * 0.2; } }
    if (VIL[u.i] && !R.anims.has(u.id)) { dy += S * 0.3; dx += estMil(u) ? -S * 0.32 : S * 0.32; }
    dessinerUnite(g, u, p.x + dx, p.y + dy, petit, (deux || VIL[u.i]) && !estMil(u) ? 0.78 : 1);
  }
  /* 9. Textes flottants. */
  R.textes = R.textes.filter(tx => now - tx.t0 < 1400);
  for (const tx of R.textes) {
    const k = (now - tx.t0) / 1400, p = centreTuile(tx.i);
    g.globalAlpha = 1 - k * k;
    g.font = `800 ${S * 0.42}px ${POLICE}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = S * 0.1; g.strokeStyle = 'rgba(0,0,0,0.75)'; g.strokeText(tx.txt, p.x, p.y - S * 0.5 - k * S * 0.8);
    g.fillStyle = tx.coul; g.fillText(tx.txt, p.x, p.y - S * 0.5 - k * S * 0.8);
    g.globalAlpha = 1;
  }
  R.sale = false;
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
  if (!pas || !pas.length || Prefs.reduit) { R.sale = true; return; }
  R.anims.set(u.id, { ch: [depart, ...pas], t0: performance.now(), dur: 110 });
}
function texteFlottant(i, txt, coul) { R.textes.push({ i, txt, coul, t0: performance.now() }); }

function rectArrondi(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function dessinerVille(g, v, p, petit) {
  const S = R.S, civ = G.civs[v.civ], cap = !!v.bat.palais;
  /* Plateau et maisons. */
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(p.x + S * 0.05, p.y + S * 0.18, S * 0.62, S * 0.36, 0, 0, 7); g.fill();
  g.fillStyle = '#d8c8a3'; g.beginPath(); g.ellipse(p.x, p.y + S * 0.1, S * 0.6, S * 0.36, 0, 0, 7); g.fill();
  g.strokeStyle = civ.couleur; g.lineWidth = S * 0.08; g.stroke();
  const maisons = Math.min(6, 2 + Math.floor(v.pop / 2));
  const pos = [[-0.3, 0.05], [0.28, 0.06], [0, -0.06], [-0.12, 0.22], [0.16, 0.24], [0.38, -0.08]];
  for (let k = 0; k < maisons; k++) {
    const x = p.x + pos[k][0] * S, y = p.y + pos[k][1] * S, w = S * 0.17, h = S * 0.15;
    g.fillStyle = '#efe4c8'; g.fillRect(x - w / 2, y - h / 2, w, h);
    g.fillStyle = k % 2 ? '#a5452f' : '#8a3a2a'; g.beginPath(); g.moveTo(x - w * 0.62, y - h / 2); g.lineTo(x, y - h * 1.25); g.lineTo(x + w * 0.62, y - h / 2); g.fill();
  }
  if (cap) {
    const x = p.x - S * 0.05, y = p.y - S * 0.12;
    g.fillStyle = '#f2ead6'; g.fillRect(x - S * 0.1, y - S * 0.28, S * 0.2, S * 0.32);
    g.fillStyle = civ.couleur; g.beginPath(); g.arc(x, y - S * 0.28, S * 0.11, Math.PI, 0); g.fill();
    g.strokeStyle = '#3a2d1a'; g.lineWidth = S * 0.025; g.beginPath(); g.moveTo(x, y - S * 0.39); g.lineTo(x, y - S * 0.52); g.stroke();
    g.fillStyle = civ.couleur; g.fillRect(x, y - S * 0.52, S * 0.12, S * 0.07);
  }
  if (v.bat.remparts) { g.strokeStyle = '#7d7466'; g.lineWidth = S * 0.06; g.beginPath(); g.ellipse(p.x, p.y + S * 0.1, S * 0.66, S * 0.42, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
  /* Bandeau. */
  const taille = petit ? S * 0.5 : S * 0.34;
  g.font = `700 ${taille}px ${POLICE}`;
  const nom = v.nom, w = g.measureText(nom).width + taille * 2.6, h = taille * 1.55, x = p.x - w / 2, y = p.y - S * 1.15;
  g.fillStyle = 'rgba(12,16,22,0.88)'; rectArrondi(g, x, y, w, h, h / 2); g.fill();
  g.strokeStyle = civ.couleur; g.lineWidth = S * 0.05; g.stroke();
  g.fillStyle = civ.couleur; g.beginPath(); g.arc(x + h / 2, y + h / 2, h / 2 - S * 0.03, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(v.pop), x + h / 2, y + h / 2 + 1);
  g.fillStyle = '#f3ead5'; g.textAlign = 'left';
  g.fillText((cap ? '★ ' : '') + nom, x + h + taille * 0.25, y + h / 2 + 1);
  if (petit) return;
  /* Jauges : production et croissance (pour ses propres villes). */
  const mine = v.civ === G.joueur;
  if (mine) {
    const it = v.file[0], cout = it ? coutItem(v, it) : 0;
    const kp = it && cout < INF ? Math.min(1, v.prod / cout) : 0, kn = Math.min(1, Math.max(0, v.nour / seuilCroissance(v.pop)));
    g.fillStyle = 'rgba(12,16,22,0.8)'; g.fillRect(x + h * 0.6, y + h + S * 0.02, w - h * 1.2, S * 0.14);
    g.fillStyle = '#d9893a'; g.fillRect(x + h * 0.6, y + h + S * 0.02, (w - h * 1.2) * kp, S * 0.065);
    g.fillStyle = '#7cc46a'; g.fillRect(x + h * 0.6, y + h + S * 0.02 + S * 0.075, (w - h * 1.2) * kn, S * 0.065);
    if (!it) { g.font = `${S * 0.3}px ${EMOJI}`; g.textAlign = 'center'; g.fillText('❗', x + w + S * 0.18, y + h / 2); }
    else if (!v.aTire && rayon(v.i, 2).some(j => previsionTirVille(v, j))) { g.font = `${S * 0.3}px ${EMOJI}`; g.textAlign = 'center'; g.fillText('🎯', x + w + S * 0.2, y + h / 2); }
  }
  const pvm = pvMaxVille(v);
  if (v.pv < pvm) {
    g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(p.x - S * 0.5, p.y + S * 0.56, S, S * 0.1);
    g.fillStyle = v.pv / pvm > 0.5 ? '#7cc46a' : v.pv / pvm > 0.25 ? '#e2b23c' : '#e2543c';
    g.fillRect(p.x - S * 0.5, p.y + S * 0.56, S * v.pv / pvm, S * 0.1);
  }
}
function dessinerUnite(g, u, x, y, petit, echelle = 1) {
  const S = R.S * echelle, civ = G.civs[u.civ], U = UNITES[u.type], rr = S * 0.36;
  const sel = typeof UI !== 'undefined' && UI.sel === u.id;
  if (sel) {
    const t = performance.now() / 600;
    g.strokeStyle = `rgba(255,248,220,${0.6 + 0.35 * Math.sin(t * 3)})`; g.lineWidth = R.S * 0.07;
    g.beginPath(); g.arc(x, y, rr + R.S * 0.1, 0, 7); g.stroke();
  }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x + S * 0.04, y + rr * 0.95, rr * 0.9, rr * 0.3, 0, 0, 7); g.fill();
  if (estEmbarque(u)) { g.fillStyle = '#6b4a2b'; g.beginPath(); g.moveTo(x - rr * 1.2, y + rr * 0.4); g.lineTo(x + rr * 1.2, y + rr * 0.4); g.lineTo(x + rr * 0.8, y + rr * 0.95); g.lineTo(x - rr * 0.8, y + rr * 0.95); g.fill(); }
  const grd = g.createRadialGradient(x - rr * 0.3, y - rr * 0.4, rr * 0.1, x, y, rr);
  grd.addColorStop(0, nuance(civ.couleur, 0.25)); grd.addColorStop(1, nuance(civ.couleur, -0.25));
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  g.strokeStyle = U.classe === 'civil' ? '#f3ead5' : '#14100b'; g.lineWidth = S * 0.05; g.stroke();
  g.font = `${rr * 1.15}px ${EMOJI}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(U.ic, x, y + rr * 0.06);
  if (petit) return;
  if (u.pv < 100) {
    g.fillStyle = 'rgba(0,0,0,0.75)'; g.fillRect(x - rr, y + rr + S * 0.04, rr * 2, S * 0.09);
    g.fillStyle = u.pv > 60 ? '#7cc46a' : u.pv > 30 ? '#e2b23c' : '#e2543c'; g.fillRect(x - rr, y + rr + S * 0.04, rr * 2 * u.pv / 100, S * 0.09);
  }
  if (u.ordre === 'fort' && u.fort >= 1) { g.fillStyle = '#e9dfc4'; g.font = `700 ${S * 0.26}px ${POLICE}`; g.fillText('⛉', x + rr * 0.9, y - rr * 0.8); }
  if (u.niv) { g.fillStyle = '#e2b23c'; g.font = `800 ${S * 0.22}px ${POLICE}`; g.fillText('★'.repeat(Math.min(3, u.niv)), x, y - rr - S * 0.1); }
  const mien = u.civ === G.joueur;
  if (mien && u.mv > 0 && !u.ordre && !sel) { g.fillStyle = '#f5ecd7'; g.beginPath(); g.arc(x + rr * 0.75, y + rr * 0.75, S * 0.07, 0, 7); g.fill(); }
}

/* ---------- Mini-carte ---------- */
function dessinerMini() {
  if (!R.mini || !G) return;
  const W = G.W, H = G.H, cw = R.mini.width, ch = R.mini.height, g = R.mx;
  if (R.miniSale || !R.miniCache) {
    const img = g.createImageData(cw, ch), d = img.data, c = moi();
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
  /* L'anneau de l'unité choisie pulse à 15 images par seconde seulement (batterie). */
  const pulse = typeof UI !== 'undefined' && UI.sel !== null && now - dernierDessin > 66;
  if (R.sale || anime || pulse) { dessiner(now); dessinerMini(); dernierDessin = now; }
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
