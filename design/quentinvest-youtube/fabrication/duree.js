// Durée exacte d'un fichier WAV lue dans son en-tête (octets de son / octets par seconde) : null si ce n'est pas un WAV lisible.
'use strict';
const fs = require('fs');

function dureeWav(f) {
  let fd; try { fd = fs.openSync(f, 'r'); } catch (e) { return null; }
  try {
    const t = fs.fstatSync(fd).size, h = Buffer.alloc(12); fs.readSync(fd, h, 0, 12, 0);
    if (h.toString('ascii', 0, 4) !== 'RIFF' || h.toString('ascii', 8, 12) !== 'WAVE') return null;
    let pos = 12, debit = 0; const c = Buffer.alloc(8);
    while (pos + 8 <= t) {
      fs.readSync(fd, c, 0, 8, pos); const id = c.toString('ascii', 0, 4); let n = c.readUInt32LE(4);
      if (id === 'fmt ') { const f2 = Buffer.alloc(16); fs.readSync(fd, f2, 0, 16, pos + 8); debit = f2.readUInt32LE(8); }
      if (id === 'data') { if (!debit) return null; if (n === 0xffffffff || pos + 8 + n > t) n = t - pos - 8; return +(n / debit).toFixed(6); } // arrondi comme ffprobe // taille inconnue (flux) : jusqu'à la fin du fichier
      pos += 8 + n + (n & 1);
    }
    return null;
  } finally { fs.closeSync(fd); }
}

module.exports = { dureeWav };
