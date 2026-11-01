#!/usr/bin/env node
'use strict';
/* Prépare un personnage de base au corps complet (fichier .glb sans squelette, posé bras en A) pour le jeu :
   recadrage (yeux à la même hauteur que le personnage PromptPlay, pour partager les repères du visage),
   squelette aux noms MakeHuman (les animations transférées s'y appliquent), poids de peau calculés par proximité
   des os (épaules et hanches adoucies), sommets identiques fusionnés, textures réduites en JPEG.
   Usage : node outils/base-humain.js <fichier.glb> <nom>   (réglages par modèle dans MODELES)
   Sortie : modeles/<nom>/perso.json + textures .jpg */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [src, nom] = process.argv.slice(2);
const MODELES = {
  /* « James », Sketchfab, CC-BY 4.0. Articulations mesurées sur le maillage (mètres du fichier). */
  james: {
    echelle: 1.667 / 1.633, decalZ: .03, source: 'James realistic male character 3D model, StormierTunic16 (sketchfab.com/jondavila98), CC-BY 4.0',
    maillages: { 0: 'corps', 1: 'oeil', 2: 'oeilI' },
    os: [['root', null, [0, .935, -.01], [0, .99, -.01]], ['spine04', 'root', [0, .99, -.01], [0, 1.15, -.01]], ['spine02', 'spine04', [0, 1.15, -.01], [0, 1.37, -.03]],
      ['neck01', 'spine02', [0, 1.37, -.03], [0, 1.49, -.02]], ['head', 'neck01', [0, 1.49, -.02], [0, 1.72, 0]]],
    cote: k => [['clavicle', 'spine02', [k * .03, 1.36, -.03], [k * .185, 1.355, -.03]], ['upperarm01', 'clavicle', [k * .185, 1.355, -.03], [k * .325, 1.2, -.015]],
      ['lowerarm01', 'upperarm01', [k * .325, 1.2, -.015], [k * .462, 1.07, .095]], ['wrist', 'lowerarm01', [k * .462, 1.07, .095], [k * .56, .96, .19]],
      ['upperleg01', 'root', [k * .095, .93, -.01], [k * .14, .49, -.015]], ['lowerleg01', 'upperleg01', [k * .14, .49, -.015], [k * .185, .09, -.045]], ['foot', 'lowerleg01', [k * .185, .09, -.045], [k * .21, .02, .13]]],
    taille: [2048, 2048, 1024]
  }
};
const C = MODELES[nom]; if (!src || !C) { console.error('Usage : node outils/base-humain.js <fichier.glb> <' + Object.keys(MODELES).join('|') + '>'); process.exit(1); }
const dest = path.join(__dirname, '..', 'modeles', nom); fs.mkdirSync(dest, { recursive: true });
const b = fs.readFileSync(src), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString()), bin = 20 + len + 8;
const lireAcc = (i, n) => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0); return new Float32Array(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * n * 4)); };
const lireIdx = i => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0), T = a.componentType === 5125 ? Uint32Array : Uint16Array; return Array.from(new T(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * T.BYTES_PER_ELEMENT))); };
const OS = [...C.os]; for (const [s, k] of [['L', 1], ['R', -1]]) for (const [n, p, a, c] of C.cote(k)) OS.push([n + '.' + s, p === 'root' || p === 'spine02' ? p : p + '.' + s, a, c]);
const rang = Object.fromEntries(OS.map((o, i) => [o[0], i]));
const segDist = (p, a, c) => { const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], l = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l)); return [Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t), t]; };
const lisse = (a, c, x) => { const t = Math.max(0, Math.min(1, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
const J = n => OS[rang[n]];
function poids(p, rigide) {
  if (rigide) return [[rang[rigide], 1]];
  const [x, y] = p, s = x >= 0 ? 'L' : 'R', ax = Math.abs(x);
  // Épaule : passage progressif du buste au bras le long du bras
  const ep = J('upperarm01.' + s), [dBras, tBras] = segDist(p, ep[2], ep[3]);
  if (y > 1.2 && y < 1.5 && ax > .12 && tBras < .3 && dBras < .09) { const u = lisse(-.12, .28, tBras) * lisse(.11, .17, ax); return [[rang['upperarm01.' + s], u], [rang[y > 1.39 ? 'clavicle.' + s : 'spine02'], 1 - u]].filter(w => w[1] > 0); }
  // Hanche : passage progressif du bassin à la cuisse
  const hc = J('upperleg01.' + s), [dCuisse, tCuisse] = segDist(p, hc[2], hc[3]);
  if (y > .78 && y < 1.02 && tCuisse < .3 && ax < .24) { const u = lisse(.98, .8, y) * Math.min(1, .35 + lisse(.0, .08, ax)); return [[rang['upperleg01.' + s], u], [rang.root, 1 - u]].filter(w => w[1] > 0); }
  const cand = [];
  for (const [n, , a, c] of OS) {
    const cs = n.endsWith('.L') ? 'L' : n.endsWith('.R') ? 'R' : ''; if (cs && cs !== s) continue;
    if (/arm|wrist|clavicle/.test(n) && (ax < .15 || y < .85)) continue;
    if (/leg|foot/.test(n) && y > 1.02) continue;
    if (!cs && ax > .2 && y < 1.4) continue;
    if (/head|neck/.test(n) && y < 1.38) continue;
    cand.push([rang[n], segDist(p, a, c)[0]]);
  }
  const l = cand.map(([i, d]) => [i, 1 / Math.pow(d + .015, 4)]).sort((a, c) => c[1] - a[1]).slice(0, 3), t = l.reduce((a, c) => a + c[1], 0);
  return l.map(([i, w]) => [i, w / t]);
}
const b64 = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const images = {}, maillages = [], E = C.echelle, versJeu = (v, k) => v * E + (k === 2 ? C.decalZ : 0);
const image = (ti, f, taille, canal) => {
  if (ti == null) return null; const k = ti + f; if (images[k]) return images[k];
  const im = j.images[j.textures[ti].source], bv = j.bufferViews[im.bufferView], tmp = path.join(dest, '_tmp');
  fs.writeFileSync(tmp, b.slice(bin + (bv.byteOffset || 0), bin + (bv.byteOffset || 0) + bv.byteLength));
  const args = [tmp]; if (canal) args.push('-channel', canal, '-separate'); args.push('-resize', taille + 'x' + taille + '>');
  if (/couleur/.test(f)) args.push('-unsharp', '0x1+0.5+0.01');
  execFileSync('convert', [...args, '-quality', /normale/.test(f) ? '92' : '90', path.join(dest, f + '.jpg')]); fs.unlinkSync(tmp);
  return (images[k] = f + '.jpg');
};
j.meshes.forEach((m, mi) => {
  const nomM = C.maillages[mi]; if (!nomM) return;
  const pr = m.primitives[0], P = lireAcc(pr.attributes.POSITION, 3), N = lireAcc(pr.attributes.NORMAL, 3), U = lireAcc(pr.attributes.TEXCOORD_0, 2), I = lireIdx(pr.indices), n = P.length / 3;
  const rigide = /oeil/.test(nomM) ? 'head' : null, cles = new Map(), remap = new Int32Array(n), pos = [], nor = [], uv = [], si = [], sw = [];
  for (let i = 0; i < n; i++) {
    const g = [0, 1, 2].map(k => versJeu(P[i * 3 + k], k)), q = g.map(v => Math.round(v * 8000)), nn = [0, 1, 2].map(k => Math.round(N[i * 3 + k] * 127)), uu = [Math.round(U[i * 2] * 65535) & 65535, Math.round(U[i * 2 + 1] * 65535) & 65535];
    const k = q.join(',') + '|' + nn.join(',') + '|' + uu.join(','); let id = cles.get(k);
    if (id == null) {
      id = pos.length / 3; cles.set(k, id); pos.push(...q); nor.push(...nn); uv.push(...uu);
      const src0 = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
      let w = poids(src0, rigide);
      if (!rigide && src0[1] > 1.4 && Math.abs(src0[0]) < .13) { const t = lisse(1.47, 1.53, src0[1]); if (t > 0) w = [[rang.head, t], [rang.neck01, 1 - t]].filter(x => x[1] > 0); }
      const wi = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let reste = 255; w.forEach(([o, p_], z) => { wi[z] = o; ww[z] = z === w.length - 1 ? reste : Math.round(p_ * 255); reste -= ww[z]; });
      si.push(...wi); sw.push(...ww);
    }
    remap[i] = id;
  }
  const idx = I.map(i => remap[i]), mat = j.materials[pr.material], pb = mat.pbrMetallicRoughness || {}, [tc, tn, tr] = C.taille;
  maillages.push({ nom: nomM, n: pos.length / 3, pos: b64(new Int16Array(pos)), nor: b64(new Int8Array(nor)), uv: b64(new Uint16Array(uv)), skinI: b64(new Uint8Array(si)), skinW: b64(new Uint8Array(sw)), index: b64(pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)), index32: pos.length / 3 > 65535,
    map: image(pb.baseColorTexture && pb.baseColorTexture.index, nomM === 'corps' ? 'couleur' : 'oeil', nomM === 'corps' ? tc : 256), normalMap: image(mat.normalTexture && mat.normalTexture.index, 'normale', tn), roughnessMap: image(pb.metallicRoughnessTexture && pb.metallicRoughnessTexture.index, 'rugosite', tr, 'G'), rugosite: pb.roughnessFactor });
  console.log(nomM, n, '→', pos.length / 3, 'sommets');
});
const sortie = { source: C.source, echelle: 8000, os: OS.map(([n, p]) => ({ n, p: p ? rang[p] : -1 })), joints: OS.map(([, , a, c]) => [...a.map((v, k) => +versJeu(v, k).toFixed(4)), ...c.map((v, k) => +versJeu(v, k).toFixed(4))]), maillages };
fs.writeFileSync(path.join(dest, 'perso.json'), JSON.stringify(sortie));
fs.writeFileSync(path.join(dest, 'LICENCE.txt'), C.source + '\nLicence : Creative Commons Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). Le crédit est affiché dans le jeu (menu « Les familles »).\nModifications : squelette, poids de peau, recadrage et textures réduites par outils/base-humain.js.\n');
console.log('écrit', (fs.statSync(path.join(dest, 'perso.json')).size / 1024 | 0) + ' Ko', Object.values(images));
