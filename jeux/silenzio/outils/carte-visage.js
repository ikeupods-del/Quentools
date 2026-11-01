#!/usr/bin/env node
'use strict';
/* Carte des positions du visage : pour chaque point de la texture de la tête, sa position 3D sur le personnage.
   Elle sert à peindre au bon endroit (rides, barbe, maquillage, cheveux gris) les variantes du personnage.
   Usage : node outils/carte-visage.js   →  modeles/promptplay/tete-pos.png (R = x, V = y, B = z, alpha = surface) */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const dir = path.join(__dirname, '..', 'modeles', 'promptplay'), p = JSON.parse(fs.readFileSync(path.join(dir, 'perso.json'), 'utf8'));
const dec = (s, T) => { const b = Buffer.from(s, 'base64'); return new T(b.buffer.slice(b.byteOffset, b.byteOffset + b.length)); };
const m = p.maillages.find(x => x.nom === 'tete'), P = dec(m.pos, Int16Array), U = dec(m.uv, Uint16Array), I = dec(m.index, m.index32 ? Uint32Array : Uint16Array);
const T = 512, BORNES = [[-.1, .1], [1.44, 1.81], [-.1, .15]]; // mètres du jeu : x, y, z
const out = Buffer.alloc(T * T * 4);
const ecrire = (px, py, a, b, c, w0, w1, w2) => { const o = (py * T + px) * 4; for (let k = 0; k < 3; k++) { const v = (P[a * 3 + k] * w0 + P[b * 3 + k] * w1 + P[c * 3 + k] * w2) / p.echelle, [lo, hi] = BORNES[k]; out[o + k] = Math.max(0, Math.min(255, Math.round((v - lo) / (hi - lo) * 255))); } out[o + 3] = 255; };
for (let t = 0; t < I.length; t += 3) {
  const [a, b, c] = [I[t], I[t + 1], I[t + 2]], uv = [a, b, c].map(i => [U[i * 2] / 65535 * T - .5, U[i * 2 + 1] / 65535 * T - .5]);
  const x0 = Math.max(0, Math.floor(Math.min(...uv.map(q => q[0])) - 1)), x1 = Math.min(T - 1, Math.ceil(Math.max(...uv.map(q => q[0])) + 1));
  const y0 = Math.max(0, Math.floor(Math.min(...uv.map(q => q[1])) - 1)), y1 = Math.min(T - 1, Math.ceil(Math.max(...uv.map(q => q[1])) + 1));
  const [[ax, ay], [bx, by], [cx, cy]] = uv, d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(d) < 1e-9) continue;
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const w0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d, w1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d, w2 = 1 - w0 - w1, e = -.6 / T * 8;
    if (w0 >= e && w1 >= e && w2 >= e) ecrire(px, py, a, b, c, Math.max(0, w0), Math.max(0, w1), Math.max(0, w2));
  }
}
// Débord de quelques pixels autour des îlots (évite les liserés au filtrage)
for (let passe = 0; passe < 4; passe++) { const src = Buffer.from(out); for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) { const o = (y * T + x) * 4; if (src[o + 3]) continue; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= T || Y >= T) continue; const q = (Y * T + X) * 4; if (src[q + 3] === 255) { out[o] = src[q]; out[o + 1] = src[q + 1]; out[o + 2] = src[q + 2]; out[o + 3] = 254; break; } } } }
const tmp = path.join(dir, '_pos.rgba'); fs.writeFileSync(tmp, out);
execFileSync('convert', ['-size', T + 'x' + T, '-depth', '8', 'rgba:' + tmp, path.join(dir, 'tete-pos.png')]); fs.unlinkSync(tmp);
console.log('écrit tete-pos.png', BORNES);
