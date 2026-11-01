#!/usr/bin/env node
'use strict';
/* Convertit le corps humain MakeHuman (CC0) en données compactes pour le jeu : modeles/corps/corps.json.
   Sources (à télécharger dans un dossier, voir outils/LISEZMOI.md) : base.obj, default.mhskel, default_weights.mhw
   et targets/*.target (silhouettes). Usage : node outils/corps.js <dossier-sources>
   Sortie : topologie partagée (UV, triangles, os et poids), silhouettes (positions, normales, articulations),
   zones du visage (lèvres, sourcils, barbe, joues) et position des yeux. */
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('Usage : node outils/corps.js <dossier-sources>'); process.exit(1); }
const lire = f => fs.readFileSync(path.join(src, f), 'utf8');

/* ---- Maillage ---- */
const V = [], VT = [], faces = [];
let grp = '';
for (const l of lire('base.obj').split('\n')) {
  if (l.startsWith('v ')) { const [, x, y, z] = l.trim().split(/\s+/).map(Number); V.push([x, y, z]); }
  else if (l.startsWith('vt ')) { const [, u, v] = l.trim().split(/\s+/).map(Number); VT.push([u, v]); }
  else if (l.startsWith('g ')) grp = l.slice(2).trim();
  else if (l.startsWith('f ')) faces.push({ g: grp, c: l.trim().split(/\s+/).slice(1).map(t => { const [a, b] = t.split('/'); return [parseInt(a) - 1, parseInt(b) - 1]; }) });
}
const GROUPES = { corps: g => g === 'body', jupe: g => g === 'helper-skirt', cheveux: g => g === 'helper-hair', cils: g => g.includes('eyelashes') };
const uniques = new Map(), orig = [], uvs = [], index = {}, faceOrig = [];
for (const [nom, test] of Object.entries(GROUPES)) {
  index[nom] = [];
  for (const f of faces) {
    if (!test(f.g)) continue;
    const ids = f.c.map(([v, t]) => { const k = v + '/' + t; if (!uniques.has(k)) { uniques.set(k, orig.length); orig.push(v); uvs.push(VT[t] || [0, 0]); } return uniques.get(k); });
    for (let i = 1; i < ids.length - 1; i++) index[nom].push(ids[0], ids[i], ids[i + 1]);
    faceOrig.push(f.c.map(c => c[0]));
  }
}
const N = orig.length;
console.log('sommets', N, Object.entries(index).map(([k, v]) => k + ' ' + v.length / 3).join(', '));

/* ---- Squelette et poids ---- */
const skel = JSON.parse(lire('default.mhskel'));
const noms = Object.keys(skel.bones), rang = Object.fromEntries(noms.map((n, i) => [n, i]));
const poidsOs = JSON.parse(lire('default_weights.mhw')).weights;
const parSommet = Array.from({ length: V.length }, () => []);
for (const [os, liste] of Object.entries(poidsOs)) if (rang[os] != null) for (const [v, w] of liste) parSommet[v].push([rang[os], w]);
const skinI = new Uint8Array(N * 4), skinW = new Uint8Array(N * 4);
orig.forEach((v, i) => {
  const l = parSommet[v].sort((a, b) => b[1] - a[1]).slice(0, 4), s = l.reduce((a, b) => a + b[1], 0) || 1;
  if (!l.length) l.push([rang.head, 1]);
  let reste = 255;
  l.forEach(([b, w], k) => { const q = k === l.length - 1 ? reste : Math.round(w / s * 255); skinI[i * 4 + k] = b; skinW[i * 4 + k] = q; reste -= q; });
});

/* ---- Silhouettes : combinaisons de cibles MakeHuman (chacune relative au corps de base) ---- */
const cible = n => { const d = new Map(); for (const l of lire('targets/' + n + '.target').split('\n')) { if (!l || l[0] === '#') continue; const [i, x, y, z] = l.trim().split(/\s+/).map(Number); d.set(i, [x, y, z]); } return d; };
const peuple = (g, a, w = 1) => [[`caucasian-${g}-${a}`, .8 * w], [`african-${g}-${a}`, .1 * w], [`asian-${g}-${a}`, .1 * w]];
const SILHOUETTES = {
  homme: peuple('male', 'young'),
  fort: [...peuple('male', 'young'), ['universal-male-young-maxmuscle-averageweight', .65]],
  gros: [...peuple('male', 'young'), ['universal-male-young-averagemuscle-maxweight', .85]],
  vieux: [...peuple('male', 'old', .6), ...peuple('male', 'young', .4), ['universal-male-old-averagemuscle-maxweight', .3]],
  femme: peuple('female', 'young'),
  vieille: [...peuple('female', 'old', .6), ...peuple('female', 'young', .4)],
  enfant: [...peuple('male', 'child', .65), ...peuple('male', 'baby', .35)],
  ado: [...peuple('male', 'child', .45), ...peuple('male', 'young', .55), ['universal-male-young-minmuscle-minweight', .3]]
};
const ECH = .1; // le corps MakeHuman est en décimètres
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const sorties = {};
for (const [nom, liste] of Object.entries(SILHOUETTES)) {
  const P = V.map(p => p.slice());
  for (const [n, w] of liste) for (const [i, d] of cible(n)) { P[i][0] += d[0] * w; P[i][1] += d[1] * w; P[i][2] += d[2] * w; }
  let ymin = Infinity; for (const f of faces) if (f.g === 'body') for (const [v] of f.c) ymin = Math.min(ymin, P[v][1]);
  const M = P.map(([x, y, z]) => [x * ECH, (y - ymin) * ECH, z * ECH]);
  // normales lissées sur la topologie d'origine (pas de couture aux bords des UV)
  const Nn = M.map(() => [0, 0, 0]);
  for (const f of faceOrig) for (let i = 1; i < f.length - 1; i++) {
    const a = M[f[0]], b = M[f[i]], c = M[f[i + 1]], u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    for (const k of [f[0], f[i], f[i + 1]]) for (let j = 0; j < 3; j++) Nn[k][j] += n[j];
  }
  const pos = new Int16Array(N * 3), nor = new Int8Array(N * 3);
  orig.forEach((v, i) => { for (let j = 0; j < 3; j++) pos[i * 3 + j] = Math.round(M[v][j] * 4000); const n = Nn[v], l = Math.hypot(...n) || 1; for (let j = 0; j < 3; j++) nor[i * 3 + j] = Math.round(n[j] / l * 127); });
  const art = j => { const l = skel.joints[j]; const s = [0, 0, 0]; for (const v of l) for (let k = 0; k < 3; k++) s[k] += M[v][k]; return s.map(x => +(x / l.length).toFixed(4)); };
  const os = noms.map(n => [...art(skel.bones[n].head), ...art(skel.bones[n].tail)]);
  const oeil = g => { const s = new Set(); for (const f of faces) if (f.g === g) for (const [v] of f.c) s.add(v); const c = [0, 0, 0]; for (const v of s) for (let k = 0; k < 3; k++) c[k] += M[v][k] / s.size; let r = 0; for (const v of s) r = Math.max(r, Math.hypot(M[v][0] - c[0], M[v][1] - c[1], M[v][2] - c[2])); return [...c.map(x => +x.toFixed(4)), +r.toFixed(4)]; };
  sorties[nom] = { pos: b64(pos), nor: b64(nor), os, yeux: [oeil('helper-l-eye'), oeil('helper-r-eye')], taille: +((Math.max(...M.map(p => p[1])))).toFixed(3) };
  console.log(nom, 'taille', sorties[nom].taille, 'm');
}

/* ---- Zones du visage (repérées sur le corps de base, en décimètres) : lèvres, sourcils, barbe, joues ---- */
const ex = (a, b) => Math.exp(-a * a - b * b);
const zones = new Uint8Array(N * 4);
orig.forEach((v, i) => {
  const [x, y, z] = V[v], ax = Math.abs(x); if (y < 5.9 || z < -.2) return;
  const face = Math.min(1, Math.max(0, (z - .4) / .5));
  const levres = ex(x / .2, (y - 6.62) / .075) * (z > 1.25 ? 1 : 0);
  const sourcils = ex((ax - .31) / .16, (y - 7.52) / .045) * (z > 1.15 ? 1 : 0);
  const barbe = Math.max(0, Math.min(1, (6.78 - y) / .1)) * Math.min(1, Math.max(0, (y - 6.0) / .1)) * face * (1 - levres) + (ax > .5 && y < 7.25 && y > 6.5 && z > .2 && z < 1.1 ? 1 : 0) * .8;
  const joues = ex((ax - .45) / .2, (y - 6.95) / .2) * face;
  [levres, sourcils, Math.min(1, barbe), joues].forEach((m, k) => { zones[i * 4 + k] = Math.round(Math.min(1, m) * 255); });
});

const uvq = new Uint16Array(N * 2); uvs.forEach(([u, v], i) => { uvq[i * 2] = Math.round(Math.min(1, Math.max(0, u)) * 65535); uvq[i * 2 + 1] = Math.round(Math.min(1, Math.max(0, v)) * 65535); });
const sortie = {
  source: 'MakeHuman (makehumancommunity/makehuman, données hm08 publiées en CC0 en 2020) : base.obj, default.mhskel, default_weights.mhw, cibles macrodetails.',
  sommets: N, uv: b64(uvq), zones: b64(zones), skinI: b64(skinI), skinW: b64(skinW),
  index: Object.fromEntries(Object.entries(index).map(([k, v]) => [k, b64(new Uint16Array(v))])),
  os: noms.map(n => ({ n, p: skel.bones[n].parent ? rang[skel.bones[n].parent] : -1 })),
  silhouettes: sorties
};
const dest = path.join(__dirname, '..', 'modeles', 'corps', 'corps.json');
fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, JSON.stringify(sortie));
console.log('écrit', dest, (fs.statSync(dest).size / 1024 | 0) + ' Ko');
