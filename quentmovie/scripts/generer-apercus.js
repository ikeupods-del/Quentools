#!/usr/bin/env node
// Aperçus animés des transitions (petites vidéos en boucle de l'onglet Packs et de l'onglet Transitions) : une image de plage vers une image de ville de nuit.
// Usage : node scripts/generer-apercus.js [ffmpeg]   → bibliotheque/apercus/tr-<id>.mp4 (320×180, 1,6 s)
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const FX = require('../effects');
const ffmpeg = process.argv[2] || 'ffmpeg', racine = path.join(__dirname, '..', 'bibliotheque'), sortie = path.join(racine, 'apercus');
fs.mkdirSync(sortie, { recursive: true });
const A = path.join(racine, 'fonds', 'plage-h.jpg'), B = path.join(racine, 'fonds', 'ville-nuit-h.jpg');
for (const t of FX.TRANSITIONS) {
  const g = `[0:v]scale=320:180:force_original_aspect_ratio=increase,crop=320:180,setsar=1,fps=30,format=yuv420p[a];[1:v]scale=320:180:force_original_aspect_ratio=increase,crop=320:180,setsar=1,fps=30,format=yuv420p[b];[a][b]${FX.filtreTransition(t.id, 0.7, 0.45, 320 / 1080)}[o]`;
  execFileSync(ffmpeg, ['-y', '-v', 'error', '-loop', '1', '-t', '1.6', '-i', A, '-loop', '1', '-t', '1.6', '-i', B, '-filter_complex', g, '-map', '[o]', '-t', '1.6', '-c:v', 'libx264', '-crf', '30', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', path.join(sortie, 'tr-' + t.id + '.mp4')]);
}
console.log(FX.TRANSITIONS.length, 'aperçus de transitions');
