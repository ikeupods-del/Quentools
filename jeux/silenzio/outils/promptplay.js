#!/usr/bin/env node
'use strict';
/* Prépare le personnage PromptPlay fourni par le propriétaire (fichier .glb, posé bras en croix, sans squelette) :
   squelette aux mêmes noms que les corps MakeHuman (les animations s'appliquent aux deux), poids de peau calculés
   par proximité des os, sommets identiques fusionnés, textures converties en JPEG.
   Usage : node outils/promptplay.js <fichier.glb>   →  modeles/promptplay/perso.json + textures .jpg */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const src = process.argv[2]; if (!src) { console.error('Usage : node outils/promptplay.js <fichier.glb>'); process.exit(1); }
const dest = path.join(__dirname, '..', 'modeles', 'promptplay'); fs.mkdirSync(dest, { recursive: true });
const b = fs.readFileSync(src), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString()), bin = 20 + len + 8;
const lireAcc = (i, n) => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * n * 4)); };
const ECH = 1.8 / 1.957; // ramené à 1,80 m

/* Squelette (positions mesurées sur la tenue, modèle d'origine en mètres), mêmes noms que MakeHuman */
const OS = [
  ['root', null, [0, .98, 0], [0, 1.08, 0]], ['spine04', 'root', [0, 1.08, 0], [0, 1.28, .0]], ['spine02', 'spine04', [0, 1.28, 0], [0, 1.52, -.03]],
  ['neck01', 'spine02', [0, 1.52, -.03], [0, 1.64, -.02]], ['head', 'neck01', [0, 1.64, -.02], [0, 1.9, 0]]
];
for (const [s, k] of [['L', 1], ['R', -1]]) OS.push(
  ['clavicle.' + s, 'spine02', [k * .03, 1.5, -.03], [k * .19, 1.52, -.03]], ['upperarm01.' + s, 'clavicle.' + s, [k * .19, 1.52, -.03], [k * .48, 1.545, -.02]],
  ['lowerarm01.' + s, 'upperarm01.' + s, [k * .48, 1.545, -.02], [k * .74, 1.545, .03]], ['wrist.' + s, 'lowerarm01.' + s, [k * .74, 1.545, .03], [k * .95, 1.54, .03]],
  ['upperleg01.' + s, 'root', [k * .1, .97, 0], [k * .125, .54, -.01]], ['lowerleg01.' + s, 'upperleg01.' + s, [k * .125, .54, -.01], [k * .145, .1, -.04]],
  ['foot.' + s, 'lowerleg01.' + s, [k * .145, .1, -.04], [k * .2, .03, .16]]);
const rang = Object.fromEntries(OS.map((o, i) => [o[0], i]));
const segDist = (p, a, c) => { const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], l = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l)); return Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t); };
function poids(p, rigide) {
  if (rigide) return [[rang[rigide], 1]];
  const [x, y] = p, cote = x >= 0 ? 'L' : 'R', ax = Math.abs(x);
  const cand = [];
  for (const [n, , a, c] of OS) {
    const s = n.endsWith('.L') ? 'L' : n.endsWith('.R') ? 'R' : '';
    if (s && s !== cote) continue;
    if (/arm|wrist|clavicle/.test(n) && ax < .13) continue;
    if (/leg|foot/.test(n) && (y > 1.02 || ax > .3)) continue;
    if (!s && ax > .3) continue;
    if (/head|neck/.test(n) && y < 1.42) continue;
    cand.push([rang[n], segDist(p, a, c)]);
  }
  // Épaule : passage progressif du buste au bras sur une douzaine de centimètres (évite les bosses quand le bras descend)
  if (ax > .13 && ax < .34 && y > 1.36 && y < 1.7) { const t = Math.max(0, Math.min(1, (ax - .15) / .16)), u = t * t * (3 - 2 * t), buste = y > 1.45 ? 'clavicle.' + cote : 'spine02'; return [[rang['upperarm01.' + cote], u], [rang[buste], 1 - u]].filter(w => w[1] > 0); }
  const l = cand.map(([i, d]) => [i, 1 / Math.pow(d + .015, 4)]).sort((a, b) => b[1] - a[1]).slice(0, 3), s = l.reduce((a, b) => a + b[1], 0);
  return l.map(([i, w]) => [i, w / s]);
}
/* Maillages : on laisse les dents (invisibles bouche fermée) */
const GARDER = { AvatarBody: 'corps', AvatarEyelashes: 'cils', AvatarHead: 'tete', AvatarLeftEyeball: 'oeilG', AvatarRightEyeball: 'oeilD', outfit_top: 'haut', outfit_bottom: 'bas', outfit_shoes: 'chaussures' };
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const images = {}, maillages = [];
const image = (ti, nom) => {
  if (ti == null) return null; const im = j.images[j.textures[ti].source]; if (images[ti]) return images[ti];
  const bv = j.bufferViews[im.bufferView], tmp = path.join(dest, '_tmp.png'); fs.writeFileSync(tmp, b.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength));
  const f = nom + '.jpg', taille = nom.startsWith('tete') && !nom.endsWith('-n') ? '2048x2048' : '1024x1024';
  // Peau et yeux : légère accentuation et compression fine (gros plans) ; tissus : compression standard
  const fin = /^(tete|corps|oeil)/.test(nom) && !nom.endsWith('-n'), args = [tmp, '-resize', taille + '>'];
  if (fin) args.push('-unsharp', '0x1.2+0.7+0.01');
  execFileSync('convert', [...args, '-quality', fin || /^(tete|corps)-n/.test(nom) ? '95' : '88', path.join(dest, f)]); fs.unlinkSync(tmp);
  return (images[ti] = f);
};
j.meshes.forEach((m, mi) => {
  const nom = GARDER[m.name]; if (!nom) return;
  const pr = m.primitives[0], P = lireAcc(pr.attributes.POSITION, 3), N = lireAcc(pr.attributes.NORMAL, 3), U = lireAcc(pr.attributes.TEXCOORD_0, 2), n = P.length / 3;
  const rigide = /tete|cils|oeil/.test(nom) ? 'head' : null;
  const cles = new Map(), pos = [], nor = [], uv = [], si = [], sw = [], idx = [];
  for (let i = 0; i < n; i++) {
    const q = [Math.round(P[i * 3] * ECH * 8000), Math.round(P[i * 3 + 1] * ECH * 8000), Math.round(P[i * 3 + 2] * ECH * 8000)], nn = [0, 1, 2].map(k => Math.round(N[i * 3 + k] * 127)), uu = [Math.round(U[i * 2] * 65535) & 65535, Math.round(U[i * 2 + 1] * 65535) & 65535];
    const k = q.join(',') + '|' + nn.join(',') + '|' + uu.join(',');
    let id = cles.get(k);
    if (id == null) {
      id = pos.length / 3; cles.set(k, id); pos.push(...q); nor.push(...nn); uv.push(...uu);
      let w = poids([P[i * 3], P[i * 3 + 1], P[i * 3 + 2]], rigide);
      if (nom === 'tete' && P[i * 3 + 1] < 1.66) { const t = Math.max(0, Math.min(1, (P[i * 3 + 1] - 1.58) / .08)); w = [[rang.head, t], [rang.neck01, 1 - t]]; }
      const wi = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let reste = 255; w.forEach(([o, p_], z) => { wi[z] = o; ww[z] = z === w.length - 1 ? reste : Math.round(p_ * 255); reste -= ww[z]; });
      si.push(...wi); sw.push(...ww);
    }
    idx.push(id);
  }
  const mat = j.materials[pr.material], bc = mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorTexture;
  maillages.push({ nom, n: pos.length / 3, pos: b64(new Int16Array(pos)), nor: b64(new Int8Array(nor)), uv: b64(new Uint16Array(uv)), skinI: b64(new Uint8Array(si)), skinW: b64(new Uint8Array(sw)), index: b64(pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)), index32: pos.length / 3 > 65535, couleur: mat.pbrMetallicRoughness.baseColorFactor, map: image(bc && bc.index, nom), normalMap: image(mat.normalTexture && mat.normalTexture.index, nom + '-n') });
  console.log(nom, n, '→', pos.length / 3, 'sommets');
});
const e = v => v.map(x => +(x * ECH).toFixed(4));
const sortie = { source: 'Personnage PromptPlay fourni par le propriétaire (fichier promptplay-male-1717.glb), squelette et poids ajoutés par outils/promptplay.js.', echelle: 8000, os: OS.map(([n, p]) => ({ n, p: p ? rang[p] : -1 })), joints: OS.map(([, , a, c]) => [...e(a), ...e(c)]), maillages };
fs.writeFileSync(path.join(dest, 'perso.json'), JSON.stringify(sortie));
console.log('écrit', (fs.statSync(path.join(dest, 'perso.json')).size / 1024 | 0) + ' Ko', Object.values(images));
