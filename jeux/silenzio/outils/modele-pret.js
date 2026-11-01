#!/usr/bin/env node
'use strict';
/* Prépare un personnage déjà habillé et doté d'un squelette (fichier .glb) : la peau suit les os d'origine
   (poids du modèle), les os principaux reçoivent les noms MakeHuman pour que les animations du jeu s'y appliquent,
   le personnage est recadré (yeux à la hauteur du personnage PromptPlay), textures réduites (PNG si transparence).
   Usage : node outils/modele-pret.js <fichier.glb> <nom>   →  modeles/<nom>/perso.json + textures */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [src, nom] = process.argv.slice(2); if (!src || !nom) { console.error('Usage : node outils/modele-pret.js <fichier.glb> <nom>'); process.exit(1); }
const dest = path.join(__dirname, '..', 'modeles', nom); fs.mkdirSync(dest, { recursive: true });
const b = fs.readFileSync(src), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString()), bin = 20 + len + 8;
const COMP = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }, NB = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
function acc(i) { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], T = COMP[a.componentType], n = NB[a.type], st = bv.byteStride || T.BYTES_PER_ELEMENT * n, o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0), out = new (a.componentType === 5126 ? Float32Array : T)(a.count * n), dv = new DataView(b.buffer, b.byteOffset);
  const lire = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[lire](o + k * st + c * T.BYTES_PER_ELEMENT, true);
  if (a.normalized && a.componentType !== 5126) { const m = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType]; return Float32Array.from(out, v => v / m); }
  return out; }
// Matrices (colonnes d'abord, comme glTF)
const mul = (a, c) => { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) for (let m = 0; m < 4; m++) r[k * 4 + i] += a[m * 4 + i] * c[k * 4 + m]; return r; };
const compose = n => { if (n.matrix) return n.matrix; const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0, 2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0, 2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1]; };
const appl = (m, p, w = 1) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12] * w, m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13] * w, m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14] * w];
const monde = []; const parcourir = (i, m) => { monde[i] = mul(m, compose(j.nodes[i])); for (const c of j.nodes[i].children || []) parcourir(c, monde[i]); };
for (const r of j.scenes[j.scene || 0].nodes) parcourir(r, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const parent = {}; j.nodes.forEach((n, i) => (n.children || []).forEach(c => { parent[c] = i; }));
// Os principaux : noms Mixamo ou Character Creator → noms du jeu
const propre = s => s.replace(/_\d+$/, '').replace(/^mixamorig:?/, '');
const CORRESP = [[/^(Hips|CC_Base_Hip)$/, 'root'], [/^(Spine|CC_Base_Waist)$/, 'spine04'], [/^(Spine2|CC_Base_Spine02)$/, 'spine02'], [/^(Neck|CC_Base_NeckTwist01)$/, 'neck01'], [/^(Head|CC_Base_Head)$/, 'head']];
for (const [s, mx, cc] of [['L', 'Left', 'CC_Base_L_'], ['R', 'Right', 'CC_Base_R_']]) CORRESP.push(
  [new RegExp('^(' + mx + 'Shoulder|' + cc + 'Clavicle)$'), 'clavicle.' + s], [new RegExp('^(' + mx + 'Arm|' + cc + 'Upperarm)$'), 'upperarm01.' + s], [new RegExp('^(' + mx + 'ForeArm|' + cc + 'Forearm)$'), 'lowerarm01.' + s],
  [new RegExp('^(' + mx + 'Hand|' + cc + 'Hand)$'), 'wrist.' + s], [new RegExp('^(' + mx + 'UpLeg|' + cc + 'Thigh)$'), 'upperleg01.' + s], [new RegExp('^(' + mx + 'Leg|' + cc + 'Calf)$'), 'lowerleg01.' + s], [new RegExp('^(' + mx + 'Foot|' + cc + 'Foot)$'), 'foot.' + s]);
const BOUT = { root: 'spine04', spine04: /^(Spine1|CC_Base_Spine01)$/, spine02: 'neck01', neck01: 'head', head: /^(HeadTop_End|CC_Base_Head)$/ }; // fin de chaque os principal
const skin = j.skins[0], jointsN = skin.joints, IBM = acc(skin.inverseBindMatrices), nomsJ = jointsN.map(i => propre(j.nodes[i].name));
const noms = nomsJ.map(n => { for (const [re, v] of CORRESP) if (re.test(n)) return v; return n.replace(/[^\w]/g, '_'); });
const posJ = jointsN.map(i => appl(monde[i], [0, 0, 0]));
// Côté gauche du personnage = +x dans le jeu : si les « Left » sont en −x, on retourne le modèle
const iMG = noms.indexOf('wrist.L'), sens = posJ[iMG][0] >= 0 ? 1 : -1;
// Recadrage : yeux du modèle à la hauteur et à l'avancée de ceux du personnage PromptPlay
const yeuxM = j.meshes.map((m, mi) => [m, mi]).filter(([m]) => /eye(ball)?(_[lr])?$|Std_Eye_[LR]|LeftEyeball|RightEyeball|^Eyes/i.test(m.name + ' ' + (j.materials[m.primitives[0].material] || {}).name));
const noeudsMesh = j.nodes.map((n, i) => [n, i]).filter(([n]) => n.mesh != null);
function sommetsMonde(ni) {
  const n = j.nodes[ni], m = j.meshes[n.mesh], out = [];
  for (const pr of m.primitives) {
    const P = acc(pr.attributes.POSITION), N = pr.attributes.NORMAL != null ? acc(pr.attributes.NORMAL) : null, J4 = pr.attributes.JOINTS_0 != null ? acc(pr.attributes.JOINTS_0) : null, W4 = pr.attributes.WEIGHTS_0 != null ? acc(pr.attributes.WEIGHTS_0) : null, cnt = P.length / 3;
    const pos = new Float32Array(cnt * 3), nor = new Float32Array(cnt * 3);
    for (let v = 0; v < cnt; v++) {
      let M = null;
      if (n.skin != null && J4) { M = new Array(16).fill(0); for (let k = 0; k < 4; k++) { const w = W4[v * 4 + k]; if (!w) continue; const ji = J4[v * 4 + k], jm = mul(monde[jointsN[ji]], Array.from(IBM.slice(ji * 16, ji * 16 + 16))); for (let c = 0; c < 16; c++) M[c] += jm[c] * w; } }
      else M = monde[ni];
      const p = appl(M, [P[v * 3], P[v * 3 + 1], P[v * 3 + 2]]); pos.set(p, v * 3);
      if (N) { const q = appl(M, [N[v * 3], N[v * 3 + 1], N[v * 3 + 2]], 0), l = Math.hypot(...q) || 1; nor.set(q.map(x => x / l), v * 3); }
    }
    out.push({ pr, pos, nor, J4, W4, cnt });
  }
  return out;
}
const toutes = noeudsMesh.map(([n, ni]) => ({ ni, nom: n.name, mesh: j.meshes[n.mesh], prims: sommetsMonde(ni) }));
let ys = [], zs = [], sol = 1e9;
for (const t of toutes) for (const p of t.prims) { for (let v = 0; v < p.cnt; v++) sol = Math.min(sol, p.pos[v * 3 + 1]); if (yeuxM.some(([m]) => m === t.mesh)) for (let v = 0; v < p.cnt; v++) { ys.push(p.pos[v * 3 + 1]); zs.push(p.pos[v * 3 + 2] * sens); } }
const moy = a => a.reduce((x, y) => x + y, 0) / a.length, yOeil = moy(ys) - sol, zOeil = Math.max(...zs), E = 1.667 / yOeil, dZ = .108 - zOeil * E;
const versJeu = p => [p[0] * sens * E, (p[1] - sol) * E, p[2] * sens * E + dZ];
console.log('sens', sens, 'échelle', E.toFixed(4), 'taille', ((Math.max(...toutes.flatMap(t => t.prims.flatMap(p => Array.from({ length: p.cnt }, (_, v) => p.pos[v * 3 + 1])))) - sol) * E).toFixed(3));
// Squelette
const os = noms.map((n, k) => { let p = parent[jointsN[k]]; while (p != null && !jointsN.includes(p)) p = parent[p]; return { n, p: p != null ? jointsN.indexOf(p) : -1 }; });
const jp = posJ.map(versJeu), rangN = Object.fromEntries(noms.map((n, k) => [n, k]));
const bout = k => { const n = noms[k]; let cible = BOUT[n];
  if (/^(clavicle|upperarm01|lowerarm01|upperleg01|lowerleg01)\./.test(n)) { const s = n.slice(-1), suite = { clavicle: 'upperarm01', upperarm01: 'lowerarm01', lowerarm01: 'wrist', upperleg01: 'lowerleg01', lowerleg01: 'foot' }[n.split('.')[0]]; return jp[rangN[suite + '.' + s]]; }
  if (/^wrist\./.test(n)) { const e = nomsJ.findIndex(x => /(Middle1|Mid1)$/.test(x) && (n.endsWith('L') ? /(Left|_L_)/ : /(Right|_R_)/).test(x)); return e >= 0 ? jp[e] : jp[k].map((v, c) => v + (c === 0 ? (n.endsWith('L') ? .08 : -.08) : 0)); }
  if (/^foot\./.test(n)) { const e = nomsJ.findIndex(x => /(ToeBase|Toe_End|ToeBase_End)$/.test(x) && (n.endsWith('L') ? /(Left|_L_)/ : /(Right|_R_)/).test(x)); return e >= 0 ? jp[e] : [jp[k][0], 0, jp[k][2] + .14]; }
  if (typeof cible === 'string') return jp[rangN[cible]];
  if (cible instanceof RegExp) { const e = nomsJ.findIndex((x, i) => i !== k && cible.test(x)); if (e >= 0 && n !== 'head') return jp[e]; if (n === 'head') { const t = nomsJ.findIndex(x => /HeadTop_End/.test(x)); return t >= 0 ? jp[t] : [jp[k][0], jp[k][1] + .2, jp[k][2]]; } }
  return [jp[k][0], jp[k][1] + .01, jp[k][2]]; };
const joints = jp.map((p, k) => [...p, ...bout(k)].map(v => +v.toFixed(4)));
// Maillages
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64'), images = {};
function image(ti, f, taille, canal, png) {
  if (ti == null) return null; const k = ti + '|' + (canal || '') + taille; if (images[k]) return images[k];
  const im = j.images[j.textures[ti].source], bv = j.bufferViews[im.bufferView], tmp = path.join(dest, '_tmp');
  fs.writeFileSync(tmp, b.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength));
  const args = [tmp]; if (canal) args.push('-channel', canal, '-separate'); args.push('-resize', taille + 'x' + taille + '>');
  const nf = f + (png ? '.png' : '.jpg'); execFileSync('convert', [...args, ...(png ? [] : ['-quality', '90']), path.join(dest, nf)]); fs.unlinkSync(tmp);
  return (images[k] = nf);
}
const role = (n, mat) => { const s = (n + ' ' + mat).toLowerCase();
  if (/tongue|teeth|tearline|occlusion|cornea/.test(s)) return null;
  if (/eyelash/.test(s)) return 'cils'; if (/eye/.test(s)) return 'oeil'; if (/hair|haircut|scalp|transparency/.test(s)) return 'cheveux'; if (/head|face/.test(s)) return 'tete';
  if (/skin|body|arm|leg|hand|feet|torso|nails/.test(s)) return 'peau'; return 'tenue'; };
const maillages = [], vus = {};
for (const t of toutes) t.prims.forEach((p, pi) => {
  const mat = j.materials[p.pr.material] || {}, r = role(t.mesh.name, mat.name || ''); if (!r) return;
  const pb = mat.pbrMetallicRoughness || {}, alpha = mat.alphaMode && mat.alphaMode !== 'OPAQUE', grand = r === 'tete' || r === 'tenue' ? 2048 : 1024;
  const U = acc(p.pr.attributes.TEXCOORD_0), I = p.pr.indices != null ? acc(p.pr.indices) : Uint32Array.from({ length: p.cnt }, (_, i) => i);
  const pos = new Int16Array(p.cnt * 3), nor = new Int8Array(p.cnt * 3), uv = new Uint16Array(p.cnt * 2), si = new Uint8Array(p.cnt * 4), sw = new Uint8Array(p.cnt * 4);
  for (let v = 0; v < p.cnt; v++) {
    const g = versJeu([p.pos[v * 3], p.pos[v * 3 + 1], p.pos[v * 3 + 2]]); for (let c = 0; c < 3; c++) { pos[v * 3 + c] = Math.round(g[c] * 8000); nor[v * 3 + c] = Math.round((c === 1 ? p.nor[v * 3 + 1] : p.nor[v * 3 + c] * sens) * 127); }
    uv[v * 2] = Math.round(Math.min(1, Math.max(0, U[v * 2] % 1 + (U[v * 2] < 0 ? 1 : 0))) * 65535); uv[v * 2 + 1] = Math.round(Math.min(1, Math.max(0, U[v * 2 + 1] % 1 + (U[v * 2 + 1] < 0 ? 1 : 0))) * 65535);
    if (p.J4) { let reste = 255; const ws = [0, 1, 2, 3].map(k => [p.J4[v * 4 + k], p.W4[v * 4 + k]]).sort((a, c) => c[1] - a[1]), tot = ws.reduce((a, c) => a + c[1], 0) || 1; ws.forEach(([ji, w], k) => { si[v * 4 + k] = ji; sw[v * 4 + k] = Math.max(0, Math.min(reste, k === 3 ? reste : Math.round(w / tot * 255))); reste -= sw[v * 4 + k]; }); sw[v * 4] += reste; }
    else { si[v * 4] = rangN.head; sw[v * 4] = 255; }
  }
  if (sens < 0) for (let k = 0; k < I.length; k += 3) { const x = I[k + 1]; I[k + 1] = I[k + 2]; I[k + 2] = x; }
  let nm = r + (vus[r] = (vus[r] || 0) + 1); if (vus[r] === 1) nm = r;
  const ti = pb.baseColorTexture && pb.baseColorTexture.index;
  maillages.push({ nom: nm, role: r, n: p.cnt, pos: b64(pos), nor: b64(nor), uv: b64(uv), skinI: b64(si), skinW: b64(sw), index: b64(p.cnt > 65535 ? Uint32Array.from(I) : Uint16Array.from(I)), index32: p.cnt > 65535,
    couleur: pb.baseColorFactor, map: image(ti, 'c' + ti, grand, null, alpha), normalMap: image(mat.normalTexture && mat.normalTexture.index, 'n' + (mat.normalTexture && mat.normalTexture.index), Math.min(grand, 1024)), roughnessMap: image(pb.metallicRoughnessTexture && pb.metallicRoughnessTexture.index, 'r' + (pb.metallicRoughnessTexture && pb.metallicRoughnessTexture.index), 512, 'G'),
    rugosite: pb.roughnessFactor, alpha: alpha ? mat.alphaMode : null, cote2: !!mat.doubleSided });
  console.log(nm, mat.name, p.cnt, 'sommets');
});
const ex = j.asset.extras || {};
const sortie = { source: `${ex.title || nom}, ${ex.author || ''}, ${ex.license || ''} (${ex.source || ''})`, echelle: 8000, os, joints, maillages };
fs.writeFileSync(path.join(dest, 'perso.json'), JSON.stringify(sortie));
fs.writeFileSync(path.join(dest, 'LICENCE.txt'), `${ex.title || nom}\nAuteur : ${ex.author || '?'}\nLicence : ${ex.license || '?'}\nSource : ${ex.source || '?'}\nLe crédit est affiché dans le jeu (menu « Les familles »).\nModifications : recadrage, os renommés et textures réduites par outils/modele-pret.js.\n`);
console.log('écrit', (fs.statSync(path.join(dest, 'perso.json')).size / 1024 | 0) + ' Ko', Object.values(images).length, 'textures');
