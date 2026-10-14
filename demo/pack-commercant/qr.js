/* Pack Commerçant — QR code sans bibliothèque (mode octets, correction M, versions 1 à 10, jusqu'à 213 octets).
   QR.svg(texte, taille) renvoie un <svg> prêt à afficher ; QR.matrice(texte) renvoie le tableau de modules (true = noir). */
(() => {
  // Corps de Galois GF(256) et code de Reed-Solomon
  const EXP = new Array(512), LOG = new Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  function generateur(n) {
    let g = [1];
    for (let i = 0; i < n; i++) { const r = new Array(g.length + 1).fill(0); g.forEach((c, j) => { r[j] ^= c; r[j + 1] ^= mul(c, EXP[i]); }); g = r; }
    return g;
  }
  function reste(data, n) {
    const g = generateur(n), r = data.concat(new Array(n).fill(0));
    for (let i = 0; i < data.length; i++) { const c = r[i]; if (c) for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); }
    return r.slice(data.length);
  }
  // Niveau M : [codes de correction par bloc, blocs du groupe 1, octets par bloc, blocs du groupe 2, octets par bloc]
  const BLOCS = [null, [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  const capacite = v => { const b = BLOCS[v]; return b[1] * b[2] + b[3] * b[4]; };

  function matrice(texte) {
    const octets = Array.from(new TextEncoder().encode(String(texte)));
    let v = 1;
    while (v <= 10 && Math.ceil((4 + (v < 10 ? 8 : 16) + 8 * octets.length) / 8) > capacite(v)) v++;
    if (v > 10) throw new Error('Texte trop long pour le QR code');
    const total = capacite(v), bits = [];
    const ajoute = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    ajoute(4, 4); ajoute(octets.length, v < 10 ? 8 : 16); octets.forEach(o => ajoute(o, 8));
    ajoute(0, Math.min(4, total * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let p = 0; data.length < total; p++) data.push(p % 2 ? 0x11 : 0xec);
    // Découpage en blocs, correction, entrelacement
    const [ec, n1, l1, n2, l2] = BLOCS[v], blocs = [];
    let k = 0;
    for (let i = 0; i < n1 + n2; i++) { const l = i < n1 ? l1 : l2; blocs.push(data.slice(k, k + l)); k += l; }
    const corr = blocs.map(b => reste(b, ec)), suite = [];
    for (let i = 0; i < Math.max(l1, l2); i++) blocs.forEach(b => { if (i < b.length) suite.push(b[i]); });
    for (let i = 0; i < ec; i++) corr.forEach(c => suite.push(c[i]));

    const n = 17 + 4 * v, m = [...Array(n)].map(() => new Array(n).fill(null)), reserve = [...Array(n)].map(() => new Array(n).fill(false));
    const pose = (x, y, val) => { m[y][x] = val; reserve[y][x] = true; };
    const reperes = (cx, cy) => {
      for (let dy = -1; dy <= 7; dy++) for (let dx = -1; dx <= 7; dx++) {
        const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const bord = dx === 0 || dx === 6 || dy === 0 || dy === 6, centre = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        pose(x, y, dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 && (bord || centre));
      }
    };
    reperes(0, 0); reperes(n - 7, 0); reperes(0, n - 7);
    for (let i = 8; i < n - 8; i++) { pose(i, 6, i % 2 === 0); pose(6, i, i % 2 === 0); }
    const a = ALIGN[v];
    for (const cy of a) for (const cx of a) {
      if ((cx === 6 && cy === 6) || (cx === 6 && cy === a[a.length - 1]) || (cx === a[a.length - 1] && cy === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) pose(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    pose(8, n - 8, true);   // module noir fixe
    for (let i = 0; i < 9; i++) { if (!reserve[8][i]) reserve[8][i] = true; if (!reserve[i][8]) reserve[i][8] = true; }
    for (let i = 0; i < 8; i++) { reserve[8][n - 1 - i] = true; reserve[n - 1 - i][8] = true; }
    if (v >= 7) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { reserve[i][n - 11 + j] = true; reserve[n - 11 + j][i] = true; }

    // Placement des données en zigzag
    const flux = []; suite.forEach(o => { for (let i = 7; i >= 0; i--) flux.push((o >> i) & 1); });
    let idx = 0;
    for (let x = n - 1, haut = true; x > 0; x -= 2, haut = !haut) {
      if (x === 6) x--;
      for (let j = 0; j < n; j++) {
        const y = haut ? n - 1 - j : j;
        for (const xx of [x, x - 1]) if (!reserve[y][xx]) { m[y][xx] = idx < flux.length ? flux[idx] === 1 : false; idx++; }
      }
    }
    const MASQUES = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0];
    const bch = (val, poly, deg) => { let r = val << deg; const top = 31 - Math.clz32(poly); while (31 - Math.clz32(r) >= top && r) r ^= poly << (31 - Math.clz32(r) - top); return r; };
    function finale(k) {
      const q = m.map((l, y) => l.map((c, x) => reserve[y][x] ? c : c !== MASQUES[k](x, y)));
      const fmt = (((0 << 3) | k) << 10 | bch((0 << 3) | k, 0x537, 10)) ^ 0x5412;   // M = 00
      const b = i => ((fmt >> i) & 1) === 1, s = (x, y, val) => { q[y][x] = val; };
      for (let i = 0; i <= 5; i++) s(8, i, b(i));
      s(8, 7, b(6)); s(8, 8, b(7)); s(7, 8, b(8));
      for (let i = 9; i < 15; i++) s(14 - i, 8, b(i));
      for (let i = 0; i < 8; i++) s(n - 1 - i, 8, b(i));
      for (let i = 8; i < 15; i++) s(8, n - 15 + i, b(i));
      if (v >= 7) {
        const vi = v << 12 | bch(v, 0x1f25, 12);
        for (let i = 0; i < 18; i++) { const b = ((vi >> i) & 1) === 1, r = Math.floor(i / 3), c = n - 11 + i % 3; q[r][c] = b; q[c][r] = b; }
      }
      return q;
    }
    function penalite(q) {
      let p = 0;
      for (let t = 0; t < 2; t++) for (let i = 0; i < n; i++) {
        let run = 1;
        for (let j = 1; j < n; j++) { const a1 = t ? q[j][i] : q[i][j], a0 = t ? q[j - 1][i] : q[i][j - 1]; if (a1 === a0) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1; }
      }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = q[y][x]; if (c === q[y][x + 1] && c === q[y + 1][x] && c === q[y + 1][x + 1]) p += 3; }
      const motif = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], inv = motif.slice().reverse();
      for (let y = 0; y < n; y++) for (let x = 0; x <= n - 11; x++) for (const mo of [motif, inv]) {
        if (mo.every((b, i) => q[y][x + i] === !!b)) p += 40;
        if (mo.every((b, i) => q[x + i][y] === !!b)) p += 40;
      }
      const noirs = q.flat().filter(Boolean).length; p += Math.floor(Math.abs(noirs * 20 - n * n * 10) / (n * n)) * 10;
      return p;
    }
    let meilleur = null, score = Infinity;
    for (let k = 0; k < 8; k++) { const q = finale(k), s = penalite(q); if (s < score) { score = s; meilleur = q; } }
    return meilleur;
  }
  function svg(texte, taille = 200) {
    const q = matrice(texte), n = q.length, t = n + 8;
    let d = '';
    q.forEach((l, y) => l.forEach((c, x) => { if (c) d += `M${x + 4} ${y + 4}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${taille}" height="${taille}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
  }
  const QR = { matrice, svg };
  if (typeof module !== 'undefined') module.exports = QR; else window.QR = QR;
})();
