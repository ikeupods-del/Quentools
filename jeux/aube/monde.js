'use strict';
/* Aube des Nations — géométrie hexagonale (lignes impaires décalées) et génération de la carte. */

const SQ3 = Math.sqrt(3);

/* Hasard reproductible (mulberry32). */
function creerAlea(graine) {
  let s = graine >>> 0;
  const f = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.etat = () => s;
  return f;
}

/* Voisins dans l'ordre E, NE, NO, O, SO, SE (angles 0, -60, -120, 180, 120, 60 degrés à l'écran). */
const DIR_PAIR = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
const DIR_IMPAIR = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
const ANGLES_DIR = [0, -60, -120, 180, 120, 60];

function tableVoisins(W, H) {
  const v = new Int32Array(W * H * 6).fill(-1);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const d = r & 1 ? DIR_IMPAIR : DIR_PAIR, i = r * W + c;
    for (let k = 0; k < 6; k++) {
      const cc = c + d[k][0], rr = r + d[k][1];
      if (cc >= 0 && cc < W && rr >= 0 && rr < H) v[i * 6 + k] = rr * W + cc;
    }
  }
  return v;
}

function cube(i, W) {
  const c = i % W, r = (i / W) | 0;
  const x = c - (r - (r & 1)) / 2;
  return [x, r, -x - r];
}
function distHex(a, b, W) {
  const A = cube(a, W), B = cube(b, W);
  return Math.max(Math.abs(A[0] - B[0]), Math.abs(A[1] - B[1]), Math.abs(A[2] - B[2]));
}
function tuilesRayon(i, R, W, H) {
  const res = [], c0 = i % W, r0 = (i / W) | 0;
  for (let r = Math.max(0, r0 - R); r <= Math.min(H - 1, r0 + R); r++) {
    for (let c = Math.max(0, c0 - R - 1); c <= Math.min(W - 1, c0 + R + 1); c++) {
      const j = r * W + c;
      if (distHex(i, j, W) <= R) res.push(j);
    }
  }
  return res;
}

/* Bruit de valeur fractal. */
function creerBruit(alea) {
  const P = new Uint16Array(512), base = [];
  for (let i = 0; i < 256; i++) base.push(i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) P[i] = base[i & 255];
  const V = new Float32Array(256).map(() => alea());
  const lisse = t => t * t * (3 - 2 * t);
  const val = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const h = (a, b) => V[P[(P[a & 255] + b) & 511] & 255];
    const u = lisse(xf), w = lisse(yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  return (x, y, oct = 4) => {
    let s = 0, amp = 1, tot = 0, f = 1;
    for (let o = 0; o < oct; o++) { s += val(x * f + o * 17.3, y * f - o * 9.1) * amp; tot += amp; amp *= 0.5; f *= 2; }
    return s / tot;
  };
}

/* Une tuile correspond-elle à un lieu de ressource (« colline », « foret », « plaine »…) ? */
function tuileConvient(t, ou, plat) {
  if (t.rel === 2) return false;
  if (plat && (t.rel || t.cv)) return false;
  return ou.some(k => k === t.t || (k === 'colline' && t.rel === 1) || k === t.cv);
}

/* Génère la carte. Renvoie { tuiles, departs }. */
function genererCarte(W, H, type, nbCivs, alea) {
  const N = W * H, bruit = creerBruit(alea), bruitH = creerBruit(alea), bruitT = creerBruit(alea), bruitR = creerBruit(alea);
  const vois = tableVoisins(W, H);
  const haut = new Float32Array(N);

  /* Masses de terre : grands blocs (continents), un seul (pangée) ou nombreux petits (archipel). */
  const blocs = [];
  if (type === 'pangee') {
    blocs.push({ x: 0.5, y: 0.5, rx: 0.42, ry: 0.36 });
    blocs.push({ x: 0.3 + alea() * 0.4, y: 0.35 + alea() * 0.3, rx: 0.25, ry: 0.25 });
  } else if (type === 'archipel') {
    const nb = 9 + Math.floor(alea() * 4);
    for (let k = 0; k < nb; k++) blocs.push({ x: 0.1 + alea() * 0.8, y: 0.15 + alea() * 0.7, rx: 0.09 + alea() * 0.07, ry: 0.09 + alea() * 0.08 });
  } else {
    blocs.push({ x: 0.26 + alea() * 0.06, y: 0.5 + (alea() - 0.5) * 0.15, rx: 0.2, ry: 0.36 });
    blocs.push({ x: 0.72 + alea() * 0.06, y: 0.5 + (alea() - 0.5) * 0.15, rx: 0.2, ry: 0.36 });
    if (alea() < 0.6) blocs.push({ x: 0.5, y: alea() < 0.5 ? 0.2 : 0.8, rx: 0.1, ry: 0.12 });
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const x = (c + 0.5 * (r & 1)) / W, y = r / H, i = r * W + c;
    let m = 0;
    for (const b of blocs) {
      const dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
      m = Math.max(m, 1 - Math.sqrt(dx * dx + dy * dy));
    }
    let e = 0.55 * Math.max(0, m) + 0.45 * bruit(x * 5, y * 5 * H / W * 1.6, 5);
    const bord = Math.min(x, 1 - x, y * 1.4, (1 - y) * 1.4);
    if (bord < 0.06) e -= (0.06 - bord) * 6;
    haut[i] = e;
  }
  const tri = Array.from(haut).sort((a, b) => b - a);
  const mer = tri[Math.floor(N * (TYPES_CARTE[type] || TYPES_CARTE.continents).terre)];

  const tuiles = new Array(N);
  /* Relief : altitude + crêtes. */
  const terres = [];
  for (let i = 0; i < N; i++) if (haut[i] > mer) terres.push(i);
  const relief = new Float32Array(N);
  for (const i of terres) {
    const c = i % W, r = (i / W) | 0;
    const crete = 1 - Math.abs(bruitR(c / 7, r / 7, 3) * 2 - 1);
    relief[i] = (haut[i] - mer) * 1.2 + crete * 0.9;
  }
  const triR = terres.map(i => relief[i]).sort((a, b) => b - a);
  const seuilMont = triR[Math.floor(terres.length * 0.07)] ?? 9, seuilColl = triR[Math.floor(terres.length * 0.22)] ?? 9;

  for (let i = 0; i < N; i++) {
    const c = i % W, r = (i / W) | 0;
    const t = { t: 'ocean', rel: 0, cv: null, res: null, am: null, rt: false, prop: -1, vp: 0, hutte: false, camp: false };
    tuiles[i] = t;
    if (haut[i] <= mer) continue;
    const lat = Math.abs(r / (H - 1) - 0.5) * 2;
    const temp = 1 - lat + (bruitT(c / 6, r / 6, 3) - 0.5) * 0.3 - Math.max(0, haut[i] - mer) * 0.25;
    const hum = bruitH(c / 8, r / 8, 4);
    if (temp < 0.1) t.t = 'neige';
    else if (temp < 0.27) t.t = 'toundra';
    else if (hum < 0.4 && temp > 0.55) t.t = 'desert';
    else if (hum < 0.52) t.t = 'plaine';
    else t.t = 'prairie';
    if (relief[i] >= seuilMont && c > 1 && c < W - 2) t.rel = 2;
    else if (relief[i] >= seuilColl) t.rel = 1;
    if (t.rel < 2) {
      const a = alea();
      if (t.t === 'toundra' && hum > 0.45 && a < 0.5) t.cv = 'foret';
      else if ((t.t === 'prairie' || t.t === 'plaine') && temp > 0.72 && hum > 0.58 && a < 0.7) t.cv = 'jungle';
      else if ((t.t === 'prairie' || t.t === 'plaine') && hum > 0.5 && a < 0.42) t.cv = 'foret';
      else if (t.rel === 0 && (t.t === 'prairie' || t.t === 'toundra') && haut[i] - mer < 0.025 && hum > 0.55 && a < 0.45) t.cv = 'marais';
    }
  }
  /* Côte : eau peu profonde au bord des terres et lacs. */
  for (let i = 0; i < N; i++) {
    if (tuiles[i].t !== 'ocean') continue;
    for (let k = 0; k < 6; k++) { const j = vois[i * 6 + k]; if (j >= 0 && !TERRAINS[tuiles[j].t].eau) { tuiles[i].t = 'cote'; break; } }
  }
  /* Petits plans d'eau fermés = côte (lacs). */
  const vu = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (vu[i] || !TERRAINS[tuiles[i].t].eau) continue;
    const zone = [i]; vu[i] = 1;
    for (let q = 0; q < zone.length; q++) for (let k = 0; k < 6; k++) {
      const j = vois[zone[q] * 6 + k];
      if (j >= 0 && !vu[j] && TERRAINS[tuiles[j].t].eau) { vu[j] = 1; zone.push(j); }
    }
    if (zone.length < 12) zone.forEach(j => { tuiles[j].t = 'cote'; });
  }

  /* Rivières : de la montagne vers la mer, en suivant la pente. riv = directions reliées (bits), rf = débit. */
  const eauI = i => TERRAINS[tuiles[i].t].eau;
  const sources = terres.filter(i => tuiles[i].rel >= 1 && !eauI(i)).sort(() => alea() - 0.5).slice(0, Math.round(terres.length / 38));
  for (const src of sources) {
    if (tuiles[src].riv) continue;
    const ch = [src], vus = new Set([src]);
    let fin = -1, finDir = -1, jonction = false;
    for (let pas = 0; pas < 18; pas++) {
      const i = ch[ch.length - 1];
      let mer = -1;
      for (let k = 0; k < 6; k++) { const j = vois[i * 6 + k]; if (j >= 0 && eauI(j)) { mer = k; break; } }
      if (mer >= 0 && ch.length > 1) { fin = i; finDir = mer; break; }
      let best = -1, bk = -1, bh = Infinity;
      for (let k = 0; k < 6; k++) {
        const j = vois[i * 6 + k];
        if (j < 0 || vus.has(j) || tuiles[j].rel === 2 || eauI(j)) continue;
        const h = haut[j] + alea() * 0.012;
        if (h < bh) { bh = h; best = j; bk = k; }
      }
      if (best < 0 || bh > haut[i] + 0.02) break;
      vus.add(best); ch.push(best);
      if (tuiles[best].riv) { jonction = true; fin = best; break; }
    }
    if (fin < 0 || ch.length < 3) continue;
    for (let n = 0; n < ch.length - 1; n++) {
      const a = ch[n], b = ch[n + 1];
      for (let k = 0; k < 6; k++) if (vois[a * 6 + k] === b) { tuiles[a].riv = (tuiles[a].riv || 0) | (1 << k); tuiles[b].riv = (tuiles[b].riv || 0) | (1 << ((k + 3) % 6)); }
      tuiles[b].rf = Math.max(tuiles[b].rf || 0, n + 1, (tuiles[a].rf || 0) + 1);
      tuiles[a].rf = Math.max(tuiles[a].rf || 0, n);
    }
    if (!jonction && finDir >= 0) tuiles[fin].riv |= 1 << finDir;
    if (tuiles[src].cv === 'marais') tuiles[src].cv = null;
  }

  /* Ressources. */
  const ids = Object.keys(RESSOURCES);
  for (let i = 0; i < N; i++) {
    const t = tuiles[i];
    if (t.rel === 2 || t.t === 'ocean') continue;
    const p = t.t === 'cote' ? 0.1 : 0.12;
    if (alea() > p) continue;
    const ok = ids.filter(id => tuileConvient(t, RESSOURCES[id].ou, RESSOURCES[id].plat));
    if (ok.length) {
      const pois = ok.map(id => (id === 'poisson' ? 4 : RESSOURCES[id].luxe ? 1 : 1.6));
      let x = alea() * pois.reduce((a, b) => a + b, 0), k = 0;
      while (x > pois[k]) { x -= pois[k]; k++; }
      t.res = ok[Math.min(k, ok.length - 1)];
    }
  }

  /* Masses de terre (pour choisir les départs). */
  const masse = new Int32Array(N).fill(-1), tailles = [];
  for (let i = 0; i < N; i++) {
    if (masse[i] >= 0 || TERRAINS[tuiles[i].t].eau) continue;
    const id = tailles.length, zone = [i]; masse[i] = id;
    for (let q = 0; q < zone.length; q++) for (let k = 0; k < 6; k++) {
      const j = vois[zone[q] * 6 + k];
      if (j >= 0 && masse[j] < 0 && !TERRAINS[tuiles[j].t].eau) { masse[j] = id; zone.push(j); }
    }
    tailles.push(zone.length);
  }

  /* Départs : bons emplacements, éloignés les uns des autres. */
  const valeur = i => {
    let s = 0;
    for (const j of tuilesRayon(i, 2, W, H)) {
      const t = tuiles[j];
      if (t.rel === 2) continue;
      const base = t.cv ? COUVERTS[t.cv] : TERRAINS[t.t];
      s += base.n * 1.4 + base.p + (base.o || 0) * 0.4 + (t.rel === 1 ? 0.8 : 0);
      if (t.res) s += RESSOURCES[t.res].luxe ? 1.5 : 1.2;
      if (t.t === 'ocean') s -= 0.6;
    }
    return s;
  };
  const cands = [];
  for (let i = 0; i < N; i++) {
    const t = tuiles[i], c = i % W, r = (i / W) | 0;
    if (TERRAINS[t.t].eau || t.rel === 2 || t.cv === 'marais' || t.t === 'neige' || t.t === 'desert' || t.t === 'toundra') continue;
    if (c < 3 || c > W - 4 || r < 3 || r > H - 4) continue;
    if (tailles[masse[i]] < 30) continue;
    cands.push({ i, v: valeur(i) + alea() * 2 });
  }
  cands.sort((a, b) => b.v - a.v);
  const meilleurs = cands.slice(0, Math.max(nbCivs * 6, Math.floor(cands.length * 0.4)));
  let dmin = Math.floor(Math.sqrt(terres.length / nbCivs) * 0.95), departs = [];
  while (dmin >= 3) {
    departs = [];
    for (const c of meilleurs) {
      if (departs.every(d => distHex(d, c.i, W) >= dmin)) departs.push(c.i);
      if (departs.length === nbCivs) break;
    }
    if (departs.length === nbCivs) break;
    dmin--;
  }
  /* Secours : n'importe quelle terre libre. */
  for (const c of cands) { if (departs.length >= nbCivs) break; if (!departs.includes(c.i)) departs.push(c.i); }

  /* Chaque départ reçoit au moins une ressource alimentaire proche. */
  for (const d of departs) {
    const proches = tuilesRayon(d, 2, W, H).filter(j => j !== d);
    if (!proches.some(j => tuiles[j].res && (RESSOURCES[tuiles[j].res].n))) {
      const j = proches.find(j => !tuiles[j].res && tuiles[j].rel === 0 && !tuiles[j].cv && (tuiles[j].t === 'prairie' || tuiles[j].t === 'plaine'));
      if (j !== undefined) tuiles[j].res = 'ble';
    }
    tuiles[d].res = tuiles[d].res && RESSOURCES[tuiles[d].res].luxe ? tuiles[d].res : null;
    if (tuiles[d].cv === 'jungle' || tuiles[d].cv === 'foret') tuiles[d].cv = null;
  }

  /* Huttes de tribus. */
  for (let i = 0; i < N; i++) {
    const t = tuiles[i];
    if (TERRAINS[t.t].eau || t.rel === 2 || alea() > 0.022) continue;
    if (departs.some(d => distHex(d, i, W) < 4)) continue;
    let proche = false;
    for (const j of tuilesRayon(i, 3, W, H)) if (tuiles[j].hutte) { proche = true; break; }
    if (!proche) t.hutte = true;
  }
  return { tuiles, departs };
}
