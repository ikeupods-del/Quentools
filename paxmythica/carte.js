/* Pax Mythica — génération de la carte : relief (bruit fractal), côtes, provinces (Voronoï déformé), voisinages, routes maritimes, terrains.
   Tout dépend de la graine : la même graine et les mêmes réglages redonnent exactement la même carte (les sauvegardes ne gardent que la graine). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};

  // générateur pseudo-aléatoire (mulberry32), utilisé partout pour que la partie soit reproductible
  PM.aleatoire = graine => {
    let a = graine >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };

  // bruit de valeur lissé et somme d'octaves
  function bruit(graine) {
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263 + graine * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const lisse = t => t * t * (3 - 2 * t);
    const v = (x, y) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = lisse(x - ix), fy = lisse(y - iy);
      const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    };
    return (x, y, oct = 5) => { let s = 0, amp = 0.5, f = 1, tot = 0; for (let o = 0; o < oct; o++) { s += v(x * f + o * 17.3, y * f - o * 9.1) * amp; tot += amp; amp *= 0.5; f *= 2.03; } return s / tot; };
  }

  PM.TAILLES = { petite: { w: 1200, h: 760, n: 40, nom: 'Petite' }, moyenne: { w: 1600, h: 1000, n: 70, nom: 'Moyenne' }, grande: { w: 2000, h: 1260, n: 110, nom: 'Grande' } };
  PM.FORMES = { continent: 'Grand continent', archipel: 'Archipel', pangee: 'Terres immenses', mer: 'Mer intérieure', deux: 'Deux continents' };

  // réglages : { graine, taille, forme, terre (0,3 à 0,7) }
  PM.genererCarte = function (reglages) {
    const r0 = Object.assign({ graine: 1, taille: 'moyenne', forme: 'continent', terre: 0.48 }, reglages);
    const T = PM.TAILLES[r0.taille] || PM.TAILLES.moyenne, W = T.w, Hh = T.h, nVoulu = r0.n || T.n;
    const rnd = PM.aleatoire(r0.graine * 7919 + 13), relief = bruit(r0.graine), humid = bruit(r0.graine + 101), deform = bruit(r0.graine + 202), deform2 = bruit(r0.graine + 303);

    // relief sur une grille au pas de 2 pixels
    const S = 2, gw = Math.ceil(W / S) + 1, gh = Math.ceil(Hh / S) + 1, haut = new Float32Array(gw * gh);
    const fq = r0.forme === 'archipel' ? 6.5 : 3.2;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const x = i * S / W, y = j * S / Hh, dx = (x - 0.5) * 2, dy = (y - 0.5) * 2, d = Math.sqrt(dx * dx + dy * dy);
      let h = relief(x * fq * (W / Hh), y * fq, 6);
      const bord = Math.min(x, 1 - x, y, 1 - y); // la mer entoure toujours le monde
      if (r0.forme === 'continent') h -= 0.55 * d * d;
      else if (r0.forme === 'archipel') h -= 0.18 * d * d;
      else if (r0.forme === 'pangee') h -= 0.3 * d * d;
      else if (r0.forme === 'mer') h += 0.25 * d - 0.55 * Math.exp(-(d * d) / 0.12);
      else if (r0.forme === 'deux') h -= 0.4 * d * d + 0.42 * Math.exp(-((dx * dx) / 0.02));
      h -= Math.max(0, 0.08 - bord) * 6;
      haut[j * gw + i] = h;
    }
    // seuil choisi pour obtenir la part de terres voulue
    const tri = Float32Array.from(haut).sort(), seuil = tri[Math.floor(tri.length * (1 - Math.min(0.75, Math.max(0.25, r0.terre))))];
    let hmin = tri[0], hmax = tri[tri.length - 1];
    for (let k = 0; k < haut.length; k++) haut[k] = haut[k] >= seuil ? 0.5 + 0.5 * (haut[k] - seuil) / (hmax - seuil || 1) : 0.5 * (haut[k] - hmin) / (seuil - hmin || 1);
    const hauteur = (x, y) => { // bilinéaire, 0..1, mer < 0,5
      const gx = x / S, gy = y / S, i = Math.min(gw - 2, gx | 0), j = Math.min(gh - 2, gy | 0), fx = gx - i, fy = gy - j, k = j * gw + i;
      return haut[k] * (1 - fx) * (1 - fy) + haut[k + 1] * fx * (1 - fy) + haut[k + gw] * (1 - fx) * fy + haut[k + gw + 1] * fx * fy;
    };

    // terre / mer au pixel
    const N = W * Hh, pix = new Int16Array(N).fill(-1), terre = new Uint8Array(N);
    let nTerre = 0;
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (hauteur(x, y) >= 0.5) { terre[y * W + x] = 1; nTerre++; }

    // germes des provinces, espacés (tirage de Poisson)
    let rayon = Math.sqrt(nTerre / nVoulu) * 0.82;
    const germes = [];
    for (let essai = 0; essai < 3 && germes.length < nVoulu * 0.9; essai++) {
      for (let t = 0; t < nVoulu * 60 && germes.length < nVoulu; t++) {
        const x = Math.floor(rnd() * W), y = Math.floor(rnd() * Hh);
        if (!terre[y * W + x]) continue;
        if (germes.every(g => (g.x - x) ** 2 + (g.y - y) ** 2 > rayon * rayon)) germes.push({ x, y });
      }
      rayon *= 0.85;
    }
    // casiers pour retrouver vite le germe le plus proche
    const C = Math.max(20, Math.round(rayon)), cw = Math.ceil(W / C) + 1, ch = Math.ceil(Hh / C) + 1, casiers = Array.from({ length: cw * ch }, () => []);
    germes.forEach((g, i) => casiers[Math.floor(g.y / C) * cw + Math.floor(g.x / C)].push(i));
    const A = rayon * 0.42, Dp = 2.2 / rayon;
    const warpS = 4, ww = Math.ceil(W / warpS) + 1, wh = Math.ceil(Hh / warpS) + 1, wx = new Float32Array(ww * wh), wy = new Float32Array(ww * wh);
    for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { wx[j * ww + i] = (deform(i * warpS * Dp, j * warpS * Dp, 2) - 0.5) * 2 * A; wy[j * ww + i] = (deform2(i * warpS * Dp, j * warpS * Dp, 2) - 0.5) * 2 * A; }
    // déformation lue en continu (version 2 des cartes) : frontières sans marches ; les cartes plus anciennes gardent la lecture par blocs
    const lisse = (r0.carteV || 1) >= 2;
    const dw = (T, x, y) => { const fx = Math.min(ww - 1.001, x / warpS), fy = Math.min(wh - 1.001, y / warpS), i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, o = j * ww + i; return T[o] * (1 - u) * (1 - v) + T[o + 1] * u * (1 - v) + T[o + ww] * (1 - u) * v + T[o + ww + 1] * u * v; };
    for (let y = 0; y < Hh; y++) {
      const gj = Math.min(wh - 1, Math.round(y / warpS));
      for (let x = 0; x < W; x++) {
        const k = y * W + x; if (!terre[k]) continue;
        const gi = Math.min(ww - 1, Math.round(x / warpS)), px = x + (lisse ? dw(wx, x, y) : wx[gj * ww + gi]), py = y + (lisse ? dw(wy, x, y) : wy[gj * ww + gi]);
        const cx = Math.floor(px / C), cy = Math.floor(py / C);
        let best = -1, bd = Infinity;
        for (let rr = 1; rr <= 3 && best < 0; rr++) {
          for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) {
            const ii = cx + di, jj = cy + dj; if (ii < 0 || jj < 0 || ii >= cw || jj >= ch) continue;
            for (const g of casiers[jj * cw + ii]) { const d = (germes[g].x - px) ** 2 + (germes[g].y - py) ** 2; if (d < bd) { bd = d; best = g; } }
          }
        }
        if (best < 0) for (let g = 0; g < germes.length; g++) { const d = (germes[g].x - px) ** 2 + (germes[g].y - py) ** 2; if (d < bd) { bd = d; best = g; } }
        pix[k] = best;
      }
    }

    // lissage : un pixel entouré d'une autre province la rejoint (efface les miettes laissées par la déformation)
    for (let passe = 0; passe < 2; passe++) for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
      const k = y * W + x, a = pix[k]; if (a < 0) continue;
      const g = pix[k - 1], d = pix[k + 1], h = pix[k - W], b = pix[k + W];
      if (g !== a && d !== a && h !== a && b !== a) { const c = g >= 0 ? g : d >= 0 ? d : h >= 0 ? h : b; if (c >= 0) pix[k] = c; }
      else if (g === d && g >= 0 && g !== a && h !== a) pix[k] = g;
      else if (h === b && h >= 0 && h !== a && g !== a) pix[k] = h;
    }

    // petites provinces fondues dans leur plus grand voisin, puis numérotation continue
    const voisinages = () => {
      const n = germes.length, aire = new Int32Array(n), adj = Array.from({ length: n }, () => new Map());
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x, a = pix[k]; if (a < 0) continue; aire[a]++;
        if (x + 1 < W) { const b = pix[k + 1]; if (b >= 0 && b !== a) { adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); } }
        if (y + 1 < Hh) { const b = pix[k + W]; if (b >= 0 && b !== a) { adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); } }
      }
      return { aire, adj };
    };
    let { aire, adj } = voisinages();
    const moy = nTerre / germes.length, remap = new Int16Array(germes.length).map((_, i) => i);
    for (let i = 0; i < germes.length; i++) if (aire[i] < moy * 0.22) {
      let cible = -1, m = 0; for (const [b, c] of adj[i]) if (c > m && aire[b] >= moy * 0.22) { m = c; cible = b; }
      remap[i] = cible; // -1 : îlot isolé trop petit, rendu à la mer
    }
    const nouveau = new Int16Array(germes.length).fill(-1); let P = 0;
    for (let i = 0; i < germes.length; i++) if (remap[i] === i) nouveau[i] = P++;
    for (let k = 0; k < N; k++) { const a = pix[k]; if (a < 0) continue; const b = remap[a]; pix[k] = b < 0 ? -1 : nouveau[b]; if (b < 0) terre[k] = 0; }
    const germes2 = germes.filter((_, i) => remap[i] === i);
    germes.length = 0; germes.push(...germes2);
    ({ aire, adj } = voisinages());

    // infos des provinces : centre, point d'étiquette, côtes, relief moyen
    const prov = germes.map((g, i) => ({ id: i, aire: aire[i], sx: 0, sy: 0, sh: 0, cotiere: false, voisins: [], mer: [] }));
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const k = y * W + x, a = pix[k]; if (a < 0) continue; const p = prov[a];
      p.sx += x; p.sy += y; p.sh += hauteur(x, y);
      if (!p.cotiere && ((x > 0 && pix[k - 1] < 0) || (x < W - 1 && pix[k + 1] < 0) || (y > 0 && pix[k - W] < 0) || (y < Hh - 1 && pix[k + W] < 0))) p.cotiere = true;
    }
    for (const p of prov) { p.cx = p.sx / p.aire; p.cy = p.sy / p.aire; p.h = p.sh / p.aire; p.lx = p.cx; p.ly = p.cy; p.ld = Infinity; }
    for (let y = 0; y < Hh; y += 2) for (let x = 0; x < W; x += 2) {
      const a = pix[y * W + x]; if (a < 0) continue; const p = prov[a], d = (x - p.cx) ** 2 + (y - p.cy) ** 2;
      if (d < p.ld) { p.ld = d; p.lx = x; p.ly = y; }
    }
    prov.forEach((p, i) => { for (const [b, c] of adj[i]) if (c >= 3) p.voisins.push(b); });

    // routes maritimes : relient les terres séparées (le monde reste d'un seul tenant) et les détroits étroits
    const dist = (a, b) => Math.hypot(prov[a].lx - prov[b].lx, prov[a].ly - prov[b].ly);
    const lier = (a, b) => { if (a === b || prov[a].voisins.includes(b) || prov[a].mer.includes(b)) return; prov[a].mer.push(b); prov[b].mer.push(a); };
    const cotes = prov.filter(p => p.cotiere).map(p => p.id);
    for (const a of cotes) for (const b of cotes) if (a < b && dist(a, b) < rayon * 1.35) lier(a, b);
    for (let tour = 0; tour < 200; tour++) {
      const comp = new Int16Array(prov.length).fill(-1); let nc = 0;
      for (let s = 0; s < prov.length; s++) if (comp[s] < 0) { const f = [s]; comp[s] = nc; while (f.length) { const a = f.pop(); for (const b of [...prov[a].voisins, ...prov[a].mer]) if (comp[b] < 0) { comp[b] = nc; f.push(b); } } nc++; }
      if (nc <= 1) break;
      let ba = -1, bb = -1, bd = Infinity;
      for (const a of prov) if (comp[a.id] === 0) for (const b of prov) if (comp[b.id] !== 0) { const d = dist(a.id, b.id); if (d < bd) { bd = d; ba = a.id; bb = b.id; } }
      lier(ba, bb);
    }

    // terrains : les plus hautes en montagne, puis collines ; humidité pour forêts et déserts
    const parH = [...prov].sort((a, b) => b.h - a.h);
    parH.forEach((p, i) => {
      const r = i / prov.length, m = humid(p.cx / W * 3, p.cy / Hh * 3, 4) + (p.cy / Hh - 0.5) * 0.18;
      p.terrain = r < 0.1 ? 'montagne' : r < 0.27 ? 'collines' : m < 0.37 ? 'desert' : m > 0.54 ? 'foret' : 'plaine';
    });
    for (const p of prov) { delete p.sx; delete p.sy; delete p.sh; delete p.ld; }
    return { w: W, h: Hh, pix, haut, gw, gh, S, provinces: prov, reglages: r0, rayon };
  };

  // hauteur 0..1 d'un pixel (ombrage du rendu)
  PM.hauteurPixel = (c, x, y) => { const gx = x / c.S, gy = y / c.S, i = Math.min(c.gw - 2, gx | 0), j = Math.min(c.gh - 2, gy | 0), fx = gx - i, fy = gy - j, k = j * c.gw + i, h = c.haut;
    return h[k] * (1 - fx) * (1 - fy) + h[k + 1] * fx * (1 - fy) + h[k + c.gw] * (1 - fx) * fy + h[k + c.gw + 1] * fx * fy; };

  PM.nomDe = function (rnd, culture, pris) {
    const c = PM.CULTURES[culture] || PM.CULTURES.tribus;
    for (let t = 0; t < 40; t++) {
      const n = c.a[Math.floor(rnd() * c.a.length)] + c.b[Math.floor(rnd() * c.b.length)];
      if (!pris || !pris.has(n)) { if (pris) pris.add(n); return n; }
    }
    return c.a[0] + c.b[0] + ' ' + Math.floor(rnd() * 99);
  };
})(typeof window !== 'undefined' ? window : globalThis);
