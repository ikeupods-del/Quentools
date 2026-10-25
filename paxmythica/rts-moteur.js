/* Pax Mythica — moteur du mode Bataille (temps réel, façon Age of Mythology) : carte d'une bataille, villageois qui récoltent
   (bois, or, baies, chasse, fermes, prière), bâtiments posés et construits, unités formées et dirigées, combats avec contres,
   projectiles, âges et dieux mineurs, pouvoirs divins à usage unique, brouillard de guerre, adversaires de l'ordinateur, victoire.
   Sans affichage : rts-vue.js dessine, rts-interface.js commande ; tests/bataille.js fait jouer l'ordinateur contre lui-même.
   Coordonnées en mètres (x, z), grille de passage de 2 m ; pas de simulation fixe de 1/20 s. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const R = PM.RTS, BT = PM.Bataille = {};
  const CEL = 2, PAS = 0.05, VUE_CEL = 4, HASH = 8;
  BT.CEL = CEL; BT.PAS = PAS;
  const LIBRE = 0, EAU = 1, RESS = 2, BAT = 3, CHAMP = 4, PORTE = 5;
  // qui se déplace : joueur (les portes laissent passer leur camp) et bateau (eau profonde seulement)
  const CTX = { j: -1, naval: false, B: null };
  const contexte = (B, u) => { CTX.B = B; CTX.j = u ? u.j : -1; CTX.naval = !!(u && u.s && u.s.naval); };
  const d2 = (a, b, c, d) => (a - c) * (a - c) + (b - d) * (b - d);
  const ROLES_MIL = ['inf', 'archer', 'cav', 'heros', 'siege'];

  function bruit(graine) {
    const h = (x, y) => { let n = (x * 374761393 + y * 668265263 + graine * 982451653) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const l = t => t * t * (3 - 2 * t);
    const v = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = l(x - i), w = l(y - j), a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; };
    return (x, y, o = 3) => { let s = 0, a = 0.5, f = 1, t = 0; for (let k = 0; k < o; k++) { s += v(x * f, y * f) * a; t += a; a *= 0.5; f *= 2.03; } return s / t; };
  }

  // ---------- caractéristiques ----------
  // rôle d'une clé d'unité : villageois, inf, archer, cav, heros, siege, ou créature (id de donnees.js)
  const estCreature = cle => !R.ROLES[cle] && !!PM.UNITES[cle];
  BT.estCreature = estCreature;
  BT.stats = function (B, j, cle) {
    const J = B.joueurs[j], cache = J.cacheStats || (J.cacheStats = {});
    if (cache[cle]) return cache[cle];
    let s = R.ROLES[cle] ? Object.assign({}, R.ROLES[cle]) : PM.UNITES[cle] ? R.creature(cle, PM.UNITES[cle]) : null; if (!s) return null;
    const b = J.bonus;
    if (s.proj && R.PROJ_EPOQUE[B.epoque]) s.proj = R.PROJ_EPOQUE[B.epoque][s.proj] || s.proj;
    if (b.vitesse) s.vitesse *= b.vitesse;
    if (cle === 'heros' && b.attHeros) s.att *= b.attHeros;
    const c = Object.assign({}, s.cout);
    if (cle === 'cav' && b.coutCav) for (const r in c) c[r] = Math.round(c[r] * b.coutCav);
    if (s.cat === 'mythe' && b.coutMythe) for (const r in c) c[r] = Math.round(c[r] * b.coutMythe);
    s.cout = c; s.cle = cle; return (cache[cle] = s);
  };
  BT.coutBat = function (B, j, cle) {
    const J = B.joueurs[j], d = R.BATIMENTS[cle], k = (J.bonus.coutBat || 1), c = {};
    for (const r in d.cout) c[r] = Math.round(d.cout[r] * k);
    if (cle === 'maison' && J.pantheon === 'nordiques') c.bois = Math.round(c.bois * 0.8);
    return c;
  };
  const assez = (J, c) => Object.keys(c).every(r => (J.res[r] || 0) >= c[r] - 1e-6);
  const payer = (J, c) => { for (const r in c) J.res[r] -= c[r]; };
  const rendre = (J, c, k = 1) => { for (const r in c) J.res[r] += c[r] * k; };
  BT.assez = (B, j, c) => assez(B.joueurs[j], c);

  // ---------- carte ----------
  function genererCarte(B, o) {
    const T = R.CARTES[B.typeCarte] || R.CARTES.plaine, cote = B.cote, n = B.n, gx = n + 1, rnd = B.rnd, nz = bruit(B.graine * 7 + 3), nf = bruit(B.graine * 11 + 5);
    const H = new Float32Array(gx * gx), W = [0, 1, 2, 3, 4].map(() => new Float32Array(gx * gx));
    const nb = o.joueurs.length, departs = [];
    const a0 = rnd() * Math.PI * 2;
    for (let i = 0; i < nb; i++) { const a = a0 + i / nb * Math.PI * 2 + (nb === 2 ? 0 : 0.2 * (rnd() - 0.5)); departs.push([cote / 2 + Math.cos(a) * cote * 0.34, cote / 2 + Math.sin(a) * cote * 0.34]); }
    B.departs = departs;
    // eau : rivière avec gués, lac central, mares de l'oasis
    // rivière : la ligne qui passe le plus loin de tous les départs
    let axe = 0, ecartMax = -1;
    for (let k = 0; k < 72; k++) { const t = k / 72 * Math.PI, ux = Math.cos(t), uz = Math.sin(t); const e = Math.min(...departs.map(([x, z]) => Math.abs((x - cote / 2) * ux + (z - cote / 2) * uz))); if (e > ecartMax) { ecartMax = e; axe = t; } }
    const mares = [];
    if (T.eau === 'oasis') for (let k = 0, t = 0; k < 4 && t < 200; t++) { const x = cote * (0.15 + rnd() * 0.7), z = cote * (0.15 + rnd() * 0.7); if (departs.every(d => d2(d[0], d[1], x, z) > 50 * 50) && mares.every(m => d2(m[0], m[1], x, z) > 40 * 40)) { mares.push([x, z, 7 + rnd() * 5]); k++; } }
    const gues = [0.2, 0.5, 0.8].map(t => t + (rnd() - 0.5) * 0.08);
    // profondeur de l'eau (0 sur la rive, sans marche) ; plat : les berges s'aplanissent autour de l'eau
    let plat = 0;
    const lisse = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const profondeur = (x, z) => {
      plat = 0;
      if (T.eau === 'lac') { const r = Math.hypot(x - cote / 2, z - cote / 2) / (cote * (nb > 2 ? 0.13 : 0.15)) + (nz(x / 20, z / 20) - 0.5) * 0.5; plat = 1 - lisse(1, 1.5, r); return r < 1 ? (1 - r) * 6 : 0; }
      if (T.eau === 'riviere') {
        const ux = Math.cos(axe), uz = Math.sin(axe), px = x - cote / 2, pz = z - cote / 2, le = px * -uz + pz * ux, tr = px * ux + pz * uz + Math.sin(le / 28) * 7;
        const w = 6 + nz(x / 30, z / 30) * 3, d = Math.abs(tr); plat = 1 - lisse(w, w + 10, d); if (d > w) return 0;
        const t = le / cote + 0.5, g = Math.max(...gues.map(v => 1 - lisse(0.03, 0.06, Math.abs(t - v)))), pr = (1 - d / w) * 5;
        return pr * (1 - g) + Math.min(pr, 0.85) * g;
      }
      if (T.eau === 'mer') { const r = Math.hypot(x - cote / 2, z - cote / 2) / (cote * 0.25) + (nz(x / 26, z / 26) - 0.5) * 0.45; plat = 1 - lisse(1, 1.35, r); return r < 1 ? Math.min(7, (1 - r) * 14) : 0; }
      if (T.eau === 'oasis') { let p = 0; for (const [mx, mz, mr] of mares) { const r = Math.hypot(x - mx, z - mz) / mr + (nz(x / 9, z / 9) - 0.5) * 0.4; plat = Math.max(plat, 1 - lisse(1, 1.6, r)); if (r < 1) p = Math.max(p, (1 - r) * 4.5); } return p; }
      return 0;
    };
    const coll = 3 + T.collines * 10;
    for (let k = 0; k < gx; k++) for (let i = 0; i < gx; i++) {
      const x = i * CEL, z = k * CEL, o2 = k * gx + i;
      let h = 1.3 + Math.max(0, nz(x / 70, z / 70) - 0.42) * coll * 1.6 + nz(x / 18 + 3, z / 18) * 0.9;
      for (const [dx, dz] of departs) { const t = Math.min(1, Math.hypot(x - dx, z - dz) / 40); const l = t * t * (3 - 2 * t); h = 1.6 * (1 - l) + h * l; }
      const bord = Math.min(x, z, cote - x, cote - z); if (bord < 14) h += (14 - bord) * 0.35; // la carte se relève sur ses bords
      let p = profondeur(x, z); const dd = Math.min(...departs.map(([dx, dz]) => Math.hypot(x - dx, z - dz))); if (dd < 42) p *= Math.max(0, (dd - 32) / 10);
      if (plat > 0) h = h + (Math.min(h, 1.1) - h) * plat;
      if (p > 0) h -= p * 1.4;
      H[o2] = h;
      const des = T.desert, fo = nf(x / 40, z / 40);
      W[4][o2] = des; W[0][o2] = 1 - des; W[2][o2] = Math.max(0, h - 4) / 8 * (1 - des * 0.5);
      W[1][o2] = 0;
    }
    B.carte = { H, W, gx, departs };
    // grille de passage
    const bloc = B.bloc = new Uint8Array(n * n), occ = B.occ = new Int32Array(n * n);
    const hC = (cx, cz) => (H[cz * gx + cx] + H[cz * gx + cx + 1] + H[(cz + 1) * gx + cx] + H[(cz + 1) * gx + cx + 1]) / 4;
    for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) {
      const hs = [H[cz * gx + cx], H[cz * gx + cx + 1], H[(cz + 1) * gx + cx], H[(cz + 1) * gx + cx + 1]], pente = Math.max(...hs) - Math.min(...hs);
      if (hC(cx, cz) < -0.35 || pente > 2.4 || cx === 0 || cz === 0 || cx === n - 1 || cz === n - 1) bloc[cz * n + cx] = EAU;
    }
    // eau navigable (assez profonde pour les bateaux)
    const eau = B.eau = new Uint8Array(n * n); let nEau = 0;
    for (let cz = 1; cz < n - 1; cz++) for (let cx = 1; cx < n - 1; cx++) if (hC(cx, cz) < -0.9) { eau[cz * n + cx] = 1; nEau++; }
    B.aEau = nEau > 120; B.blocTerrain = bloc.slice();
    // forêts : massifs (loin des villes), un bois près de chaque départ
    const arbre = (x, z) => { if (profondeur(x, z) > 0 || profondeur(x + 3, z) > 0 || profondeur(x - 3, z) > 0 || profondeur(x, z + 3) > 0 || profondeur(x, z - 3) > 0) return null; const cx = Math.floor(x / CEL), cz = Math.floor(z / CEL); if (cx < 1 || cz < 1 || cx >= n - 1 || cz >= n - 1 || bloc[cz * n + cx] !== LIBRE) return null; return ajouterRes(B, 'arbre', cx * CEL + 1 + (rnd() - 0.5) * 0.6, cz * CEL + 1 + (rnd() - 0.5) * 0.6); };
    const seuil = 0.66 - T.foret * 0.18;
    for (let cz = 2; cz < n - 2; cz++) for (let cx = 2; cx < n - 2; cx++) {
      const x = cx * CEL + 1, z = cz * CEL + 1, f = nf(x / 34, z / 34, 4);
      if (departs.some(([dx, dz]) => d2(dx, dz, x, z) < 34 * 34)) continue;
      if (f > seuil && rnd() < 0.55 + (f - seuil) * 3) arbre(x, z);
      else if (rnd() < 0.006 * (1 + T.foret)) arbre(x, z);
    }
    const voisinsDepart = [];
    departs.forEach(([dx, dz], i) => {
      // centre de la forêt proche : à l'opposé du centre de la carte, légèrement de côté
      const ac = Math.atan2(dz - cote / 2, dx - cote / 2), af = ac + (rnd() < 0.5 ? 0.9 : -0.9);
      const fx = dx + Math.cos(af) * 30, fz = dz + Math.sin(af) * 30;
      for (let t = 0; t < 140; t++) { const a = rnd() * 6.28, r = Math.sqrt(rnd()) * 9; arbre(fx + Math.cos(a) * r * 1.3, fz + Math.sin(a) * r); }
      voisinsDepart.push({ ac, af });
    });
    // poids du sous-bois sous les arbres (texture du sol)
    for (const r of B.res) if (r.sous === 'arbre') { const i = Math.round(r.x / CEL), k = Math.round(r.z / CEL); for (let dk = -2; dk <= 2; dk++) for (let di = -2; di <= 2; di++) { const o2 = (k + dk) * gx + i + di; if (o2 >= 0 && o2 < W[1].length) W[1][o2] = Math.min(1, W[1][o2] + 0.22 / (1 + Math.abs(di) + Math.abs(dk))); } }
    // ressources de départ : baies, troupeau, or ; plus loin : or, troupeaux et baies à se disputer
    const poserGroupe = (sous, x, z, nbr, ecart) => { for (let k = 0, t = 0; k < nbr && t < nbr * 12; t++) { const a = rnd() * 6.28, r = rnd() * ecart, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; if (posLibre(B, px, pz, sous === 'mine' ? 2 : 0)) { ajouterRes(B, sous, px, pz); k++; } } };
    const loin = (x, z, m) => departs.every(([dx, dz]) => d2(dx, dz, x, z) > m * m) && posLibre(B, x, z, 2);
    departs.forEach(([dx, dz], i) => {
      const { ac, af } = voisinsDepart[i], ab = ac + Math.PI + (af > ac ? -0.5 : 0.5), ao = ac + Math.PI * 0.5 * (af > ac ? -1 : 1);
      poserGroupe('baies', dx + Math.cos(ab) * 15, dz + Math.sin(ab) * 15, 7, 3.5);
      poserGroupe(B.typeCarte === 'toundra' || B.typeCarte === 'riviere' ? 'vache' : 'mouton', dx + Math.cos(ab + 1.6) * 18, dz + Math.sin(ab + 1.6) * 18, 6, 3);
      poserGroupe('mine', dx + Math.cos(ao) * 22, dz + Math.sin(ao) * 22, 1, 2);
      poserGroupe('mine', dx + Math.cos(ac + Math.PI * 0.85) * 44, dz + Math.sin(ac + Math.PI * 0.85) * 44, 1, 4);
      poserGroupe('vache', dx + Math.cos(ac + 2.6) * 46, dz + Math.sin(ac + 2.6) * 46, 5, 4);
    });
    for (let k = 0, t = 0; k < 3 + nb && t < 400; t++) { const x = cote * (0.2 + rnd() * 0.6), z = cote * (0.2 + rnd() * 0.6); if (loin(x, z, 60)) { ajouterRes(B, 'mine', x, z); k++; } }
    for (let k = 0, t = 0; k < 2 + nb; t++) { if (t > 400) break; const x = cote * (0.15 + rnd() * 0.7), z = cote * (0.15 + rnd() * 0.7); if (loin(x, z, 55)) { poserGroupe(rnd() < 0.5 ? 'baies' : 'vache', x, z, 6, 4); k++; } }
    // bancs de poissons en eau libre
    if (B.aEau) {
      const large = (cx, cz) => { for (let k = -2; k <= 2; k++) for (let i = -2; i <= 2; i++) if (!eau[(cz + k) * n + cx + i]) return false; return true; };
      const cand = []; for (let cz = 3; cz < n - 3; cz++) for (let cx = 3; cx < n - 3; cx++) if (eau[cz * n + cx] && large(cx, cz)) cand.push([cx * CEL + 1, cz * CEL + 1]);
      const voulus = Math.min(Math.floor(cand.length / 20), 6 + nb * 3), poses = [];
      for (let k = 0, t = 0; k < voulus && t < 500 && cand.length; t++) { const [x, z] = cand[Math.floor(rnd() * cand.length)]; if (poses.every(([a, b]) => d2(a, b, x, z) > 14 * 14)) { poses.push([x, z]); ajouterRes(B, 'poisson', x, z); k++; } }
    }
  }
  // ressources : arbre, baies, mine (d'or), mouton, vache (chassés puis dépecés), carcasse
  const RES = { arbre: { t: 'bois', q: 125, r: 0.7, bloc: 1 }, baies: { t: 'nourriture', q: 200, r: 0.8, bloc: 1 }, mine: { t: 'or', q: 1600, r: 2.6, bloc: 2 }, mouton: { t: 'nourriture', q: 100, r: 0.6, animal: true }, vache: { t: 'nourriture', q: 160, r: 0.9, animal: true }, poisson: { t: 'nourriture', q: 300, r: 1.6, eau: true } };
  BT.RES = RES;
  function ajouterRes(B, sous, x, z) {
    const d = RES[sous], q = Math.round(d.q * (d.animal ? 1 : B.mulRes || 1)), e = { id: B.prochain++, sorte: 'r', sous, t: d.t, qte: q, qteMax: q, x, z, rayon: d.r, dir: B.rnd() * 6.28, j: -1 };
    if (d.eau) e.eau = true;
    if (d.animal) { e.animal = true; e.vivant = true; e.hx = x; e.hz = z; }
    B.res.push(e); B.parId.set(e.id, e);
    if (d.bloc) { const demi = d.bloc === 2 ? 1 : 0; marquer(B, e, demi, RESS); e.bx = (Math.floor(x / CEL) + 0.5) * CEL; e.bz = (Math.floor(z / CEL) + 0.5) * CEL; e.demiE = (demi + 0.5) * CEL; }
    return e;
  }
  // marque (ou libère) les cases d'une emprise ; demi = demi-côté en cases autour de la case centrale
  function marquer(B, e, demi, val) {
    const n = B.n, cx = Math.floor(e.x / CEL), cz = Math.floor(e.z / CEL);
    for (let k = cz - demi; k <= cz + demi; k++) for (let i = cx - demi; i <= cx + demi; i++) { if (i < 0 || k < 0 || i >= n || k >= n) continue; const o = k * n + i; if (val === LIBRE) { if (B.occ[o] === e.id) { B.bloc[o] = B.blocTerrain ? B.blocTerrain[o] : LIBRE; B.occ[o] = 0; } } else { B.bloc[o] = val; B.occ[o] = e.id; } }
    B.versionGrille++;
  }
  function posLibre(B, x, z, demi) {
    const n = B.n, cx = Math.floor(x / CEL), cz = Math.floor(z / CEL);
    for (let k = cz - demi; k <= cz + demi; k++) for (let i = cx - demi; i <= cx + demi; i++) { if (i < 1 || k < 1 || i >= n - 1 || k >= n - 1 || B.bloc[k * n + i] !== LIBRE) return false; }
    return true;
  }
  BT.hauteur = function (B, x, z) {
    const C = B.carte, gx = C.gx, fx = Math.max(0, Math.min(gx - 1.001, x / CEL)), fz = Math.max(0, Math.min(gx - 1.001, z / CEL)), i = fx | 0, k = fz | 0, u = fx - i, v = fz - k, H = C.H, o = k * gx + i;
    return H[o] * (1 - u) * (1 - v) + H[o + 1] * u * (1 - v) + H[o + gx] * (1 - u) * v + H[o + gx + 1] * u * v;
  };
  function marchable(B, cx, cz) {
    if (cx < 0 || cz < 0 || cx >= B.n || cz >= B.n) return false;
    const o = cz * B.n + cx, v = B.bloc[o];
    if (CTX.naval) return v === EAU && B.eau[o] === 1;
    if (v === LIBRE || v === CHAMP) return true;
    if (v === PORTE && CTX.j >= 0) { const g = B.parId.get(B.occ[o]); return !!g && !ennemis(B, CTX.j, g.j); }
    return false;
  }
  const marchableXZ = (B, x, z) => marchable(B, Math.floor(x / CEL), Math.floor(z / CEL));
  BT.marchable = marchableXZ;

  // ---------- chemins : A* sur la grille (8 directions, sans couper les coins), puis lissage en ligne droite ----------
  function vue(B, x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), nb = Math.ceil(d / 0.8);
    for (let s = 1; s < nb; s++) { const t = s / nb; if (!marchableXZ(B, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
    return true;
  }
  BT.ligneLibre = vue;
  function caseLibreProche(B, cx, cz, vx, vz) {
    if (marchable(B, cx, cz)) return [cx, cz];
    let best = null, bd = 1e9;
    for (let r = 1; r < 14 && !best; r++) for (let k = cz - r; k <= cz + r; k++) for (let i = cx - r; i <= cx + r; i++) {
      if (Math.max(Math.abs(i - cx), Math.abs(k - cz)) !== r || !marchable(B, i, k)) continue;
      const d = d2(i, k, vx, vz) + r * r * 4; if (d < bd) { bd = d; best = [i, k]; }
    }
    return best;
  }
  function aEtoile(B, x0, z0, x1, z1) {
    const n = B.n, N = n * n;
    if (!B.as || B.as.N !== N) B.as = { N, g: new Float32Array(N), vu: new Uint32Array(N), ferme: new Uint32Array(N), de: new Int32Array(N), tas: new Int32Array(N * 2), f: new Float32Array(N), gen: 0 };
    const A = B.as; A.gen++; const gen = A.gen;
    let sx = Math.floor(x0 / CEL), sz = Math.floor(z0 / CEL);
    const s0 = caseLibreProche(B, sx, sz, sx, sz); if (!s0) return null; [sx, sz] = s0;
    const tc = caseLibreProche(B, Math.floor(x1 / CEL), Math.floor(z1 / CEL), sx, sz); if (!tc) return null;
    const [tx, tz] = tc, but = tz * n + tx, dep = sz * n + sx;
    const h = (c) => { const dx = Math.abs((c % n) - tx), dz = Math.abs(((c / n) | 0) - tz); return (dx + dz + (1.4142 - 2) * Math.min(dx, dz)); };
    // tas binaire
    let taille = 0; const tas = A.tas, f = A.f;
    const pousser = c => { let i = taille++; tas[i] = c; while (i > 0) { const p = (i - 1) >> 1; if (f[tas[p]] <= f[tas[i]]) break; const t = tas[p]; tas[p] = tas[i]; tas[i] = t; i = p; } };
    const tirer = () => { const r = tas[0]; tas[0] = tas[--taille]; let i = 0; for (;;) { const l = i * 2 + 1, rr = l + 1; let m = i; if (l < taille && f[tas[l]] < f[tas[m]]) m = l; if (rr < taille && f[tas[rr]] < f[tas[m]]) m = rr; if (m === i) break; const t = tas[m]; tas[m] = tas[i]; tas[i] = t; i = m; } return r; };
    A.g[dep] = 0; A.vu[dep] = gen; A.de[dep] = -1; f[dep] = h(dep); pousser(dep);
    let meilleur = dep, mh = h(dep), etapes = 0;
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1], CO = [1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142];
    while (taille > 0 && etapes++ < 30000) {
      const c = tirer(); if (A.ferme[c] === gen) continue; A.ferme[c] = gen;
      if (c === but) { meilleur = c; break; }
      const hc = f[c] - A.g[c]; if (hc < mh) { mh = hc; meilleur = c; }
      const cx = c % n, cz = (c / n) | 0;
      for (let d = 0; d < 8; d++) {
        const nx = cx + DX[d], nz2 = cz + DZ[d]; if (!marchable(B, nx, nz2)) continue;
        if (d >= 4 && (!marchable(B, cx + DX[d], cz) || !marchable(B, cx, cz + DZ[d]))) continue;
        const v = nz2 * n + nx, g = A.g[c] + CO[d];
        if (A.vu[v] === gen && g >= A.g[v]) continue;
        A.vu[v] = gen; A.g[v] = g; A.de[v] = c; f[v] = g + h(v); pousser(v);
      }
    }
    const l = []; for (let c = meilleur; c !== -1 && l.length < 4000; c = A.de[c]) l.push([(c % n) * CEL + 1, ((c / n) | 0) * CEL + 1]);
    l.reverse();
    if (meilleur === but && marchableXZ(B, x1, z1)) l[l.length - 1] = [x1, z1];
    // lissage : on saute les points visibles en ligne droite
    const out = []; let i = 0, px = x0, pz = z0;
    while (i < l.length) { let k = l.length - 1; while (k > i && !vue(B, px, pz, l[k][0], l[k][1])) k--; out.push(l[k]); px = l[k][0]; pz = l[k][1]; i = k + 1; }
    return out;
  }
  BT.chemin = aEtoile;

  // ---------- entités ----------
  function ajouterUnite(B, j, cle, x, z) {
    const s = BT.stats(B, j, cle); if (!s) return null;
    const u = { id: B.prochain++, sorte: 'u', cle, j, x, z, dir: 0, pv: s.pv, pvMax: s.pv, s, ordre: null, chemin: null, ci: 0, cd: 0, anim: 'repos', porte: null, tNe: B.temps };
    B.unites.push(u); B.parId.set(u.id, u); B.joueurs[j].stats.formees++;
    return u;
  }
  BT.ajouterUnite = ajouterUnite;
  function ajouterBat(B, j, cle, x, z, fini) {
    const d = R.BATIMENTS[cle], J = B.joueurs[j], pvMax = Math.round(d.pv * (J.bonus.pvBat || 1)), demi = Math.floor(d.taille / CEL / 2);
    x = (Math.floor(x / CEL) + 0.5) * CEL; z = (Math.floor(z / CEL) + 0.5) * CEL;
    const b = { id: B.prochain++, sorte: 'b', cle, j, x, z, taille: d.taille, d, pv: fini ? pvMax : 1, pvMax, fini: !!fini, prog: fini ? 1 : 0, file: [], cd: 0, dir: 0, tNe: B.temps, bx: x, bz: z, demiE: (demi + 0.5) * CEL };
    B.bats.push(b); B.parId.set(b.id, b);
    marquer(B, b, demi, d.passable ? CHAMP : d.porte ? PORTE : BAT);
    return b;
  }
  BT.ajouterBat = ajouterBat;
  // distance entre une unité et le bord d'une entité (bâtiment carré, ressource ronde, unité ronde)
  // bâtiments et ressources bloquantes : distance au bord de leurs cases ; contact = distance à moins de CONTACT
  function distBord(u, e) {
    if (e.demiE) { const t = e.demiE, dx = Math.max(Math.abs(u.x - e.bx) - t, 0), dz = Math.max(Math.abs(u.z - e.bz) - t, 0); return Math.hypot(dx, dz); }
    return Math.max(0, Math.hypot(u.x - e.x, u.z - e.z) - (e.sorte === 'r' ? e.rayon : e.s.rayon));
  }
  BT.distBord = distBord;
  // contact : près du bord, ou arrivé sur la case d'approche choisie (case diagonale du pourtour)
  const contact = (u, e) => distBord(u, e) <= u.s.rayon + 1.45 || (u.appr && u.appr[2] === e.id && Math.hypot(u.x - u.appr[0], u.z - u.appr[1]) < 0.9 && distBord(u, e) < 2.6);
  const vivant = e => e && !e.mort && (e.sorte !== 'r' || e.qte > 0);
  const ennemis = (B, a, b) => a !== b && a >= 0 && b >= 0 && B.joueurs[a].equipe !== B.joueurs[b].equipe;
  BT.ennemis = ennemis;
  // trêve du début de partie (parties longues) : aucune attaque entre peuples
  const treve = B => B.treve > 0 && B.temps < B.treve;
  BT.treve = treve;
  const recolteur = u => u.cle === 'villageois' || u.cle === 'peche';
  BT.recolteur = recolteur;

  // ---------- nouvelle bataille ----------
  BT.nouvelle = function (o) {
    PM.appliquerEpoque(o.epoque || 'antique');
    const cote = (R.TAILLES[o.taille] || R.TAILLES.petite).cote, Du = R.DUREES[o.duree] || R.DUREES.normale;
    const B = { v: 2, opts: JSON.parse(JSON.stringify(o)), duree: R.DUREES[o.duree] ? o.duree : 'normale', treve: o.treve != null ? o.treve : Du.treve, popMax: Du.pop, mulRes: Du.res, gardeMerveille: Du.garde, maisonsMax: Math.ceil((Du.pop - 15) / 10), epoque: PM.epoque, typeCarte: R.CARTES[o.carte] ? o.carte : 'plaine', taille: o.taille || 'petite', graine: o.graine || 1, cote, n: cote / CEL, temps: 0, acc: 0,
      joueur: o.joueur || 0, unites: [], bats: [], res: [], parId: new Map(), prochain: 1, proj: [], effets: [], evts: [], fin: null, versionGrille: 0, fileChemins: [], vitesse: 1 };
    B.rnd = PM.aleatoire(B.graine * 31 + 17);
    B.joueurs = o.joueurs.map((p, i) => {
      const P = PM.PANTHEONS[p.pantheon] || PM.PANTHEONS.grecs, maj = P.majeurs.find(d => d.id === p.dieu) || P.majeurs[0], bonus = {};
      for (const k in maj.bonus) if (R.BONUS[k]) R.BONUS[k](bonus, maj.bonus[k]);
      const cu = R.CULTURE[p.pantheon] || {}; if (cu.coutBat) bonus.coutBat = (bonus.coutBat || 1) * cu.coutBat; if (cu.recolte) for (const r of ['nourriture', 'bois', 'or']) bonus['recolte_' + r] = (bonus['recolte_' + r] || 1) * cu.recolte;
      return { id: i, nom: p.nom || P.nom, pantheon: p.pantheon || 'grecs', dieu: maj.id, couleur: p.couleur || PM.COULEURS[i], ia: !!p.ia, difficulte: p.difficulte == null ? 1 : p.difficulte, equipe: p.equipe == null ? i : p.equipe,
        age: 0, ageEnCours: null, mineurs: [], pouvoirs: [{ id: maj.pouvoir, utilise: false }], res: { nourriture: 300, bois: 250, or: 150, faveur: 10 }, pop: 0, popMax: 0, bonus, temp: [],
        vaincu: false, passif: !!p.passif, stats: { formees: 0, tues: 0, pertes: 0, recolte: 0, construits: 0 }, cerveau: { t: 0, attaque: false, vague: 0, prochaineAttaque: 0 } };
    });
    B.joueurs.forEach(J => { J.stats.formees = 0; });
    genererCarte(B, o);
    B.idsRes = B.res.map(r => r.id);
    B.carte.departs.forEach(([x, z], i) => {
      const J = B.joueurs[i]; ajouterBat(B, i, 'centre', x, z, true);
      for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; ajouterUnite(B, i, 'villageois', x + Math.cos(a) * 10, z + Math.sin(a) * 10); }
      const sc = ajouterUnite(B, i, 'cav', x + 11, z + 4); if (sc) sc.ordre = null;
      J.stats.formees = 0;
    });
    // brouillard : 4 m par case ; 0 inconnu, 1 déjà vu, 2 visible
    const m = B.mv = Math.ceil(cote / VUE_CEL);
    for (const J of B.joueurs) { J.vis = new Uint8Array(m * m); J.connu = new Uint8Array(m * m); }
    B.hash = new Array(Math.ceil(cote / HASH) ** 2).fill(null).map(() => []); B.mh = Math.ceil(cote / HASH);
    majPop(B); majBrouillard(B);
    return B;
  };

  // ---------- population ----------
  function majPop(B) {
    for (const J of B.joueurs) { J.pop = 0; J.popMax = 0; J.nbMaisons = 0; }
    for (const u of B.unites) if (!u.mort && u.j >= 0) B.joueurs[u.j].pop += u.s.pop;
    for (const b of B.bats) if (!b.mort) { if (b.cle === 'maison') B.joueurs[b.j].nbMaisons++; if (b.fini) B.joueurs[b.j].popMax += b.d.pop || 0; }
    for (const J of B.joueurs) J.popMax = Math.min(B.popMax || R.POP_MAX, J.popMax);
  }
  BT.majPop = majPop;

  // ---------- répartition spatiale des unités et bâtiments (cases de 8 m) ----------
  function majHash(B) {
    const H = B.hash, m = B.mh; for (const c of H) c.length = 0;
    const mettre = e => { const i = Math.min(m - 1, Math.max(0, Math.floor(e.x / HASH))), k = Math.min(m - 1, Math.max(0, Math.floor(e.z / HASH))); H[k * m + i].push(e); };
    for (const u of B.unites) if (!u.mort) mettre(u);
    for (const b of B.bats) if (!b.mort) mettre(b);
  }
  function autour(B, x, z, r, f) {
    const m = B.mh, i0 = Math.max(0, Math.floor((x - r - 10) / HASH)), i1 = Math.min(m - 1, Math.floor((x + r + 10) / HASH)), k0 = Math.max(0, Math.floor((z - r - 10) / HASH)), k1 = Math.min(m - 1, Math.floor((z + r + 10) / HASH));
    for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) for (const e of B.hash[k * m + i]) if (!e.mort) f(e);
  }
  BT.autour = autour;

  // ---------- ordres ----------
  function poserOrdre(B, u, o) {
    if (u.ordre && u.ordre.type === 'construire') { /* rien à rendre */ }
    if (u.ordre && u.ordre.type === 'recolter') { const c = B.parId.get(u.ordre.cible); if (c && c.occupant === u.id) c.occupant = 0; }
    u.ordre = o; u.chemin = null; u.ci = 0; u.but = null; u.bloque = 0; u.evite = null; u.appr = null;
  }
  // formation : places en rangs face à la direction de marche
  function places(B, us, x, z) {
    const cx = us.reduce((s, u) => s + u.x, 0) / us.length, cz = us.reduce((s, u) => s + u.z, 0) / us.length, a = Math.atan2(x - cx, z - cz);
    const tri = us.slice().sort((p, q) => ordreRang(p) - ordreRang(q)), larg = Math.max(1, Math.ceil(Math.sqrt(us.length * 1.6))), out = new Map();
    const ec = Math.max(...us.map(u => u.s.rayon * 2 + 0.7));
    tri.forEach((u, i) => {
      const lg = Math.floor(i / larg), dans = Math.min(larg, tri.length - lg * larg), gx = ((i % larg) - (dans - 1) / 2) * ec, gz = -lg * ec;
      let px = x + gx * Math.cos(a) + gz * Math.sin(a), pz = z - gx * Math.sin(a) + gz * Math.cos(a);
      if (!marchableXZ(B, px, pz)) { const c = caseLibreProche(B, Math.floor(px / CEL), Math.floor(pz / CEL), Math.floor(x / CEL), Math.floor(z / CEL)); if (c) { px = c[0] * CEL + 1; pz = c[1] * CEL + 1; } }
      out.set(u.id, [px, pz]);
    });
    return out;
  }
  const ordreRang = u => ({ mythe: 0, heros: 1, inf: 2, cav: 3, milice: 4, archer: 5, siege: 6 }[u.s.cat] || 4);
  // ordre selon ce qui est sous la souris (clic droit) : attaquer, récolter, construire, prier, cultiver, marcher
  BT.ordreContexte = function (B, j, ids, x, z, cibleId, attaqueMarche) {
    const us = ids.map(i => B.parId.get(i)).filter(u => u && u.sorte === 'u' && u.j === j && !u.mort); if (!us.length) return null;
    const c = cibleId ? B.parId.get(cibleId) : null, J = B.joueurs[j];
    let type = 'deplacer';
    if (c && vivant(c)) {
      if (c.sorte !== 'r' && ennemis(B, j, c.j)) { if (treve(B)) return 'treve'; for (const u of us) poserOrdre(B, u, { type: 'attaquer', cible: c.id }); return 'attaquer'; }
      const vill = us.filter(u => u.cle === 'villageois' && !(c.sorte === 'r' && c.eau)), peche = us.filter(u => u.cle === 'peche'), autres = us.filter(u => !vill.includes(u) && !peche.includes(u));
      if (peche.length) { if (c.sorte === 'r' && c.eau) { for (const u of peche) poserOrdre(B, u, { type: 'recolter', cible: c.id }); type = 'recolter'; } else if (c.sorte === 'b' && c.j === j && c.d.port) { for (const u of peche) poserOrdre(B, u, { type: 'deposer', cible: c.id }); type = 'deposer'; } else autres.push(...peche); }
      if (vill.length) {
        if (c.sorte === 'r') { for (const u of vill) poserOrdre(B, u, { type: 'recolter', cible: c.id }); type = 'recolter'; }
        else if (c.sorte === 'b' && c.j === j && (!c.fini || c.pv < c.pvMax)) { for (const u of vill) poserOrdre(B, u, { type: 'construire', cible: c.id }); type = 'construire'; }
        else if (c.sorte === 'b' && c.j === j && c.cle === 'ferme') { const u = vill.find(v => !c.occupant) || vill[0]; poserOrdre(B, u, { type: 'recolter', cible: c.id }); type = 'recolter'; }
        else if (c.sorte === 'b' && c.j === j && c.cle === 'temple' && J.pantheon === 'grecs') { for (const u of vill) poserOrdre(B, u, { type: 'prier', cible: c.id }); type = 'prier'; }
        else if (c.sorte === 'b' && c.j === j && c.d.depot) { for (const u of vill) if (u.porte && u.porte.n > 0) poserOrdre(B, u, { type: 'deposer', cible: c.id }); else { const p = places(B, [u], c.x, c.z + c.taille / 2 + 2); poserOrdre(B, u, { type: 'deplacer', x: p.get(u.id)[0], z: p.get(u.id)[1] }); } type = 'deposer'; }
        else autres.push(...vill);
      }
      if (autres.length) deplacerGroupe(B, autres, x, z, attaqueMarche);
      return type;
    }
    deplacerGroupe(B, us, x, z, attaqueMarche);
    return attaqueMarche ? 'attaque' : 'deplacer';
  };
  // marche en formation ; les bateaux et les troupes à terre ont chacun leurs places
  function deplacerGroupe(B, us, x, z, attaque) {
    for (const groupe of [us.filter(u => !u.s.naval), us.filter(u => u.s.naval)]) {
      if (!groupe.length) continue; contexte(B, groupe[0]);
      const p = places(B, groupe, x, z); for (const u of groupe) poserOrdre(B, u, { type: 'deplacer', x: p.get(u.id)[0], z: p.get(u.id)[1], attaque: !!attaque });
    }
    contexte(B, null);
  }
  BT.arreter = function (B, j, ids) { for (const i of ids) { const u = B.parId.get(i); if (u && u.sorte === 'u' && u.j === j) { poserOrdre(B, u, null); u.anim = 'repos'; } } };
  // pose d'une fondation : vérifie la place et le coût, puis envoie les villageois construire
  BT.peutPoser = function (B, j, cle, x, z) {
    const d = R.BATIMENTS[cle], J = B.joueurs[j]; if (!d) return { ok: false, raison: 'Bâtiment inconnu.' };
    if (J.age < d.age) return { ok: false, raison: `Il faut l’${PM.AGES[d.age].nom.charAt(0).toLowerCase() + PM.AGES[d.age].nom.slice(1)}.` };
    const maxM = B.maisonsMax || R.MAISONS_MAX;
    if (cle === 'maison' && J.nbMaisons >= maxM) return { ok: false, raison: `${maxM} ${R.nomBat('maison').toLowerCase()}s au plus.` };
    if (cle === 'merveille' && B.bats.some(b => !b.mort && b.j === j && b.cle === 'merveille')) return { ok: false, raison: 'Une seule merveille.' };
    const demi = Math.floor(d.taille / CEL / 2), n = B.n, cx = Math.floor(x / CEL), cz = Math.floor(z / CEL);
    let hmin = 1e9, hmax = -1e9, nEau = 0, nTerre = 0;
    for (let k = cz - demi; k <= cz + demi; k++) for (let i = cx - demi; i <= cx + demi; i++) {
      if (i < 1 || k < 1 || i >= n - 1 || k >= n - 1) return { ok: false, raison: 'La place est prise.' };
      const o = k * n + i, v = B.bloc[o];
      if (d.port && v === EAU && BT.hauteur(B, i * CEL + 1, k * CEL + 1) < 0) { if (B.eau[o]) nEau++; if (!J.connu[Math.floor(k * CEL / VUE_CEL) * B.mv + Math.floor(i * CEL / VUE_CEL)]) return { ok: false, raison: 'Terre inexplorée.' }; continue; }
      const murAMoi = d.porte && v === BAT && (g => g && g.cle === 'mur' && g.j === j)(B.parId.get(B.occ[o]));
      if (v !== LIBRE && !murAMoi) return { ok: false, raison: d.port ? 'Le port se pose au bord de l’eau, sur une rive libre.' : 'La place est prise.' };
      nTerre++;
      const h = BT.hauteur(B, i * CEL + 1, k * CEL + 1); hmin = Math.min(hmin, h); hmax = Math.max(hmax, h);
      if (!J.connu[Math.floor(k * CEL / VUE_CEL) * B.mv + Math.floor(i * CEL / VUE_CEL)]) return { ok: false, raison: 'Terre inexplorée.' };
    }
    if (d.port) { if (nEau < 4 || nTerre < 6) return { ok: false, raison: 'Le port se pose au bord de l’eau : une moitié sur la rive, une moitié dans l’eau profonde.' }; }
    else {
      if (hmax - hmin > 3.2) return { ok: false, raison: 'Le terrain est trop pentu.' };
      if (hmin < 0.2) return { ok: false, raison: 'On ne bâtit pas dans l’eau.' };
    }
    if (cle !== 'ferme') for (const r of B.res) if (r.animal && r.vivant && Math.abs(r.x - x) < d.taille / 2 + 0.5 && Math.abs(r.z - z) < d.taille / 2 + 0.5) return { ok: false, raison: 'Un animal est sur la place.' };
    if (!assez(J, BT.coutBat(B, j, cle))) return { ok: false, raison: 'Pas assez de ressources.' };
    return { ok: true };
  };
  BT.poser = function (B, j, cle, x, z, ids) {
    const d = R.BATIMENTS[cle], demi = Math.floor(d.taille / CEL / 2); x = (Math.floor(x / CEL) + 0.5) * CEL; z = (Math.floor(z / CEL) + 0.5) * CEL; void demi;
    const r = BT.peutPoser(B, j, cle, x, z); if (!r.ok) return r;
    const J = B.joueurs[j]; payer(J, BT.coutBat(B, j, cle));
    // une porte remplace les tronçons de mur sur lesquels on la pose
    if (d.porte) { const n = B.n, cx = Math.floor(x / CEL), cz = Math.floor(z / CEL); for (let k = cz - 1; k <= cz + 1; k++) for (let i = cx - 1; i <= cx + 1; i++) { const g = B.parId.get(B.occ[k * n + i]); if (g && g.cle === 'mur' && g.j === j) retirer(B, g); } }
    const b = ajouterBat(B, j, cle, x, z, false); b.payé = BT.coutBat(B, j, cle);
    // les unités sur l'emprise s'écartent
    for (const u of B.unites) if (!u.mort && Math.abs(u.x - x) < b.demiE + u.s.rayon && Math.abs(u.z - z) < b.demiE + u.s.rayon && !d.passable) ecarter(B, u, b);
    for (const i of ids || []) { const u = B.parId.get(i); if (u && u.cle === 'villageois' && u.j === j) poserOrdre(B, u, { type: 'construire', cible: b.id }); }
    return { ok: true, bat: b };
  };
  // retrait sans ruine (tronçon remplacé par une porte)
  function retirer(B, e) { marquer(B, e, Math.floor(e.taille / CEL / 2), LIBRE); e.mort = B.temps - 60; e.retire = true; B.parId.delete(e.id); B.bats = B.bats.filter(b => b !== e); }
  // murs : cases d'une ligne (8-connexe : rien ne passe entre deux tronçons en diagonale)
  BT.casesMur = function (B, j, x0, z0, x1, z1) {
    let cx = Math.floor(x0 / CEL), cz = Math.floor(z0 / CEL); const tx = Math.floor(x1 / CEL), tz = Math.floor(z1 / CEL), dx = Math.abs(tx - cx), dz = Math.abs(tz - cz), sx = cx < tx ? 1 : -1, sz = cz < tz ? 1 : -1;
    let e = dx - dz; const l = [];
    for (let k = 0; k < 120; k++) {
      const x = cx * CEL + 1, z = cz * CEL + 1; l.push({ x, z, ok: BT.peutPoser(B, j, 'mur', x, z).ok || (B.bloc[cz * B.n + cx] === BAT && (g => g && g.cle === 'mur' && g.j === j)(B.parId.get(B.occ[cz * B.n + cx])) ? 'deja' : false) });
      if (cx === tx && cz === tz) break;
      const e2 = 2 * e; if (e2 > -dz) { e -= dz; cx += sx; } if (e2 < dx) { e += dx; cz += sz; }
    }
    return l;
  };
  BT.poserMur = function (B, j, x0, z0, x1, z1, ids) {
    const J = B.joueurs[j], d = R.BATIMENTS.mur; if (J.age < d.age) return { ok: false, raison: BT.peutPoser(B, j, 'mur', x0, z0).raison };
    const l = BT.casesMur(B, j, x0, z0, x1, z1).filter(c => c.ok === true), dir = Math.atan2(x1 - x0, z1 - z0), poses = [];
    for (const c of l) { const r = BT.peutPoser(B, j, 'mur', c.x, c.z); if (!r.ok) { if (poses.length) break; return r; } payer(J, BT.coutBat(B, j, 'mur')); const b = ajouterBat(B, j, 'mur', c.x, c.z, false); b.payé = BT.coutBat(B, j, 'mur'); b.dir = dir; poses.push(b);
      for (const u of B.unites) if (!u.mort && Math.abs(u.x - b.x) < b.demiE + u.s.rayon && Math.abs(u.z - b.z) < b.demiE + u.s.rayon) ecarter(B, u, b); }
    if (!poses.length) return { ok: false, raison: 'La place est prise.' };
    // les villageois commencent par le bout le plus proche
    const vill = (ids || []).map(i => B.parId.get(i)).filter(u => u && u.cle === 'villageois' && u.j === j);
    vill.forEach((u, k) => { const b = poses[Math.min(poses.length - 1, Math.floor(k * poses.length / Math.max(1, vill.length)))]; poserOrdre(B, u, { type: 'construire', cible: b.id }); });
    return { ok: true, n: poses.length, bats: poses };
  };
  function ecarter(B, u, b) { const t = b.demiE + u.s.rayon + 0.4, dx = u.x - b.x, dz = u.z - b.z; if (Math.abs(dx) > Math.abs(dz)) u.x = b.x + Math.sign(dx || 1) * t; else u.z = b.z + Math.sign(dz || 1) * t; }
  BT.peutFormer = function (B, b, cle) {
    const J = B.joueurs[b.j]; if (!b.fini) return { ok: false, raison: 'Bâtiment en construction.' };
    const s = BT.stats(B, b.j, cle); if (!s) return { ok: false, raison: 'Unité inconnue.' };
    if ((s.age || 0) > J.age) return { ok: false, raison: `Il faut l’${PM.AGES[s.age].nom.toLowerCase()}.` };
    if (b.file.length >= 6) return { ok: false, raison: 'File pleine.' };
    if (!assez(J, s.cout)) return { ok: false, raison: 'Pas assez de ressources.' };
    return { ok: true };
  };
  // unités que forme un bâtiment (les créatures du temple selon les dieux mineurs choisis)
  BT.formables = function (B, b) {
    const J = B.joueurs[b.j], l = [];
    for (const f of b.d.forme || []) {
      if (f === 'mythe') { for (const m of J.mineurs) { const g = mineurDe(J, m); if (g && !l.includes(g.unite)) l.push(g.unite); } }
      else l.push(f);
    }
    return l;
  };
  function mineurDe(J, id) { const P = PM.PANTHEONS[J.pantheon]; for (const age of P.mineurs) for (const g of age) if (g.id === id) return g; return null; }
  BT.mineurDe = mineurDe;
  BT.former = function (B, j, batId, cle) {
    const b = B.parId.get(batId); if (!b || b.j !== j || b.mort) return { ok: false, raison: 'Bâtiment introuvable.' };
    const r = BT.peutFormer(B, b, cle); if (!r.ok) return r;
    const s = BT.stats(B, j, cle); payer(B.joueurs[j], s.cout); b.file.push({ cle, t: 0, cout: s.cout }); return { ok: true };
  };
  BT.annulerFormation = function (B, j, batId, i) { const b = B.parId.get(batId); if (!b || b.j !== j || !b.file[i]) return; rendre(B.joueurs[j], b.file[i].cout); b.file.splice(i, 1); };
  BT.ralliement = function (B, j, batId, x, z, cibleId) { const b = B.parId.get(batId); if (b && b.j === j) b.rally = { x, z, cible: cibleId || 0 }; };
  BT.detruire = function (B, j, ids) { for (const i of ids) { const e = B.parId.get(i); if (e && e.j === j && !e.mort) { if (e.sorte === 'b' && !e.fini && e.payé) rendre(B.joueurs[j], e.payé, e.prog < 0.01 ? 1 : 0); mourir(B, e, null); } } };
  // passage d'âge : choix du dieu mineur parmi les deux de l'âge suivant
  BT.peutAvancer = function (B, j) {
    const J = B.joueurs[j], a = J.age + 1; if (a > 3) return { ok: false, raison: 'Dernier âge atteint.' };
    if (J.ageEnCours) return { ok: false, raison: 'Passage déjà en cours.' };
    if (!B.bats.some(b => !b.mort && b.j === j && b.cle === 'centre' && b.fini)) return { ok: false, raison: `Il faut un ${R.nomBat('centre').toLowerCase()}.` };
    if (!assez(J, R.AGES[a].cout)) return { ok: false, raison: 'Pas assez de ressources.' };
    return { ok: true };
  };
  BT.avancerAge = function (B, j, mineurId) {
    const r = BT.peutAvancer(B, j); if (!r.ok) return r;
    const J = B.joueurs[j], a = J.age + 1, choix = PM.PANTHEONS[J.pantheon].mineurs[a - 1];
    const g = choix.find(x => x.id === mineurId) || choix[0];
    payer(J, R.AGES[a].cout); J.ageEnCours = { age: a, t: 0, temps: R.AGES[a].temps, mineur: g.id }; return { ok: true };
  };

  // ---------- pouvoirs divins ----------
  BT.pouvoir = function (B, j, idx, x, z) {
    const J = B.joueurs[j], p = J.pouvoirs[idx]; if (!p || p.utilise) return { ok: false, raison: 'Pouvoir déjà utilisé.' };
    const d = R.POUVOIRS[p.id]; if (!d) return { ok: false, raison: 'Pouvoir inconnu.' };
    if (d.cible && (x == null || !J.connu[Math.floor(z / VUE_CEL) * B.mv + Math.floor(x / VUE_CEL)])) return { ok: false, raison: 'Vise une terre explorée.' };
    if (treve(B) && ['eclair', 'zone', 'paralysie', 'ralenti', 'conversion', 'vortex'].includes(d.type)) return { ok: false, raison: 'Trêve : les pouvoirs contre l’ennemi attendront.' };
    p.utilise = true; const nom = PM.POUVOIRS[p.id] ? PM.POUVOIRS[p.id].nom : p.id;
    B.evts.push({ type: 'pouvoir', j, id: p.id, x, z, nom });
    if (d.type === 'eclair') {
      let best = null, bd = 64; autour(B, x, z, 8, e => { if (!ennemis(B, j, e.j)) return; const dd = d2(e.x, e.z, x, z); if (dd < bd) { bd = dd; best = e; } });
      B.evts.push({ type: 'impact', sorte: 'eclair', x: best ? best.x : x, z: best ? best.z : z, j });
      if (best) blesser(B, best, d.degats * (best.sorte === 'b' ? 0.35 : 1), j, true);
    } else if (d.type === 'zone') B.effets.push({ type: 'zone', j, id: p.id, x, z, d, fin: B.temps + d.duree, prochain: B.temps, pas: d.duree / d.impacts });
    else if (d.type === 'invoquer') { for (let k = 0; k < d.nombre; k++) { const a = k / d.nombre * 6.28, c = caseLibreProche(B, Math.floor((x + Math.cos(a) * 2.5) / CEL), Math.floor((z + Math.sin(a) * 2.5) / CEL), 0, 0); if (c) { const u = ajouterUnite(B, j, d.unite, c[0] * CEL + 1, c[1] * CEL + 1); if (u) { u.invoque = true; B.evts.push({ type: 'apparition', x: u.x, z: u.z, j }); } } } majPop(B); }
    else if (d.type === 'soin') { autour(B, x, z, d.rayon, e => { if (e.j === j && d2(e.x, e.z, x, z) < d.rayon * d.rayon && (e.sorte === 'u' || e.fini)) e.pv = e.pvMax; }); B.effets.push({ type: 'lueur', j, x, z, rayon: d.rayon, fin: B.temps + 3, id: p.id }); }
    else if (d.type === 'ressources') rendre(J, d.r);
    else if (d.type === 'bonus') J.temp.push({ cle: d.cle, valeur: d.valeur, fin: B.temps + d.duree });
    else if (d.type === 'bouclier') { autour(B, x, z, d.rayon, e => { if (e.j === j && e.sorte === 'b' && d2(e.x, e.z, x, z) < d.rayon * d.rayon) e.invuln = B.temps + d.duree; }); B.effets.push({ type: 'lueur', j, x, z, rayon: d.rayon, fin: B.temps + d.duree, id: p.id, bleu: true }); }
    else if (d.type === 'paralysie' || d.type === 'ralenti') { autour(B, x, z, d.rayon, e => { if (e.sorte === 'u' && ennemis(B, j, e.j) && d2(e.x, e.z, x, z) < d.rayon * d.rayon) e[d.type === 'paralysie' ? 'gele' : 'lent'] = B.temps + d.duree; }); B.effets.push({ type: 'lueur', j, x, z, rayon: d.rayon, fin: B.temps + Math.min(6, d.duree), id: p.id, bleu: d.type === 'ralenti' }); }
    else if (d.type === 'conversion') {
      const l = []; autour(B, x, z, d.rayon, e => { if (e.sorte === 'u' && ennemis(B, j, e.j) && e.s.cat !== 'heros' && e.s.cat !== 'siege' && d2(e.x, e.z, x, z) < d.rayon * d.rayon) l.push(e); });
      l.sort((a, b) => d2(a.x, a.z, x, z) - d2(b.x, b.z, x, z)).slice(0, d.nombre).forEach(u => { u.j = j; u.s = BT.stats(B, j, u.cle); poserOrdre(B, u, null); B.evts.push({ type: 'apparition', x: u.x, z: u.z, j }); });
      majPop(B);
    } else if (d.type === 'vision') J.vision = B.temps + d.duree;
    else if (d.type === 'age') { if (J.ageEnCours) J.ageEnCours.t = J.ageEnCours.temps; else rendre(J, { nourriture: 300, or: 300, bois: 300 }); }
    else if (d.type === 'vortex') { const l = B.unites.filter(u => !u.mort && u.j === j && u.cle !== 'villageois'); l.forEach((u, k) => { const a = k * 2.4, r = 2 + Math.sqrt(k) * 1.6, c = caseLibreProche(B, Math.floor((x + Math.cos(a) * r) / CEL), Math.floor((z + Math.sin(a) * r) / CEL), 0, 0); if (c) { u.x = c[0] * CEL + 1; u.z = c[1] * CEL + 1; poserOrdre(B, u, null); } }); B.evts.push({ type: 'apparition', x, z, j }); }
    return { ok: true, message: `${nom} !` };
  };

  // ---------- dégâts et morts ----------
  function blesser(B, e, deg, j, divin) {
    if (e.mort || deg <= 0) return;
    if (e.sorte === 'b' && e.invuln > B.temps) return;
    if (treve(B) && j >= 0 && e.j >= 0 && e.j !== j) return;
    e.pv -= deg; e.touche = B.temps;
    if (j >= 0 && e.j >= 0) {
      const A = B.joueurs[j]; if (A.pantheon === 'nordiques' && !divin) A.res.faveur = Math.min(200, A.res.faveur + deg * 0.012 * (1 + (A.bonus.faveurCombat || 0)));
      if (e.j !== j) { const V = B.joueurs[e.j]; V.dernAttaque = { t: B.temps, x: e.x, z: e.z, par: j }; }
    }
    if (e.pv <= 0) mourir(B, e, j);
  }
  function mourir(B, e, par) {
    if (e.mort) return; e.mort = B.temps; e.pv = 0;
    if (e.sorte === 'u') { B.joueurs[e.j].stats.pertes++; if (par != null && par >= 0 && par !== e.j) B.joueurs[par].stats.tues++; if (e.ordre && e.ordre.type === 'recolter') { const c = B.parId.get(e.ordre.cible); if (c && c.occupant === e.id) c.occupant = 0; } B.evts.push({ type: 'mort', id: e.id, x: e.x, z: e.z, cle: e.cle, j: e.j }); }
    else if (e.sorte === 'b') { marquer(B, e, Math.floor(e.taille / CEL / 2), LIBRE); B.evts.push({ type: 'ruine', id: e.id, x: e.x, z: e.z, taille: e.taille, j: e.j }); if (par != null && par >= 0) B.joueurs[par].stats.tues++; }
    majPop(B);
  }
  function degatsContre(B, a, cible) {
    const s = a.s; let k = 1;
    if (cible.sorte === 'b') k = s.vsBat; else k = PM.mult(s.cat, cible.s.cat);
    if (s.cat === 'mythe' && cible.sorte === 'u' && cible.s.cat === 'heros') k *= 0.6;
    return s.att * k * bonusAtt(B, a.j);
  }
  const bonusAtt = (B, j) => 1 + B.joueurs[j].temp.filter(t => t.cle === 'attaque').reduce((s, t) => s + t.valeur, 0);
  function tirer(B, de, j, x, y, z, cible, deg, type, zone) {
    const dist = Math.hypot(cible.x - x, cible.z - z), v = type === 'pierre' || type === 'boulet' || type === 'obus' || type === 'plasma' ? 22 : type === 'balle' || type === 'laser' ? 90 : 34;
    B.proj.push({ de, j, x0: x, y0: y, z0: z, x: cible.x, z: cible.z, cible: cible.id, t: 0, duree: Math.max(0.12, dist / v), deg, type, zone: zone || 0, arc: type === 'balle' || type === 'laser' ? 0 : dist * (type === 'fleche' ? 0.18 : 0.32) });
    B.evts.push({ type: 'tir', sorte: type, x, z, j });
  }
  function majProjectiles(B, dt) {
    for (const p of B.proj) {
      p.t += dt; const c = B.parId.get(p.cible); if (c && !c.mort && p.t < p.duree * 0.9) { p.x = c.x; p.z = c.z; }
      if (p.t >= p.duree) {
        p.fini = true;
        if (p.zone) { autour(B, p.x, p.z, p.zone, e => { if (!ennemis(B, p.j, e.j)) return; const de = e.sorte === 'b' ? distBord({ x: p.x, z: p.z }, e) : Math.hypot(e.x - p.x, e.z - p.z); if (de <= p.zone) blesser(B, e, p.deg * (e.sorte === 'b' ? 1 : 0.25) * (e === c ? 1 : 0.6), p.j); }); B.evts.push({ type: 'impact', sorte: p.type, x: p.x, z: p.z }); }
        else if (c && !c.mort && Math.hypot(c.x - p.x, c.z - p.z) < 3) blesser(B, c, p.deg, p.j);
      }
    }
    B.proj = B.proj.filter(p => !p.fini);
  }

  // ---------- déplacement ----------
  function viser(B, u, x, z) {
    if (u.but && Math.abs(u.but[0] - x) < 1.5 && Math.abs(u.but[1] - z) < 1.5 && (u.chemin || u.attente)) return;
    u.but = [x, z]; u.ci = 0;
    if (vue(B, u.x, u.z, x, z)) { u.chemin = [[x, z]]; u.attente = false; }
    else { u.chemin = null; if (!u.attente) { u.attente = true; B.fileChemins.push(u.id); } }
  }
  // avance le long du chemin ; vrai quand le bout est atteint
  function marcher(B, u, dt) {
    if (!u.chemin) { u.anim = u.attente ? 'marche' : 'repos'; if (u.attente && u.but) pas(B, u, u.but[0], u.but[1], dt * 0.5); return false; }
    const w = u.chemin[u.ci]; if (!w) return true;
    const dx = w[0] - u.x, dz = w[1] - u.z, d = Math.hypot(dx, dz);
    if (d < 0.35) { u.ci++; if (u.ci >= u.chemin.length) { u.chemin = null; u.anim = 'repos'; return true; } return false; }
    pas(B, u, w[0], w[1], dt); u.anim = 'marche';
    // coincé : nouveau chemin
    u.tBloque = (u.tBloque || 0) + dt;
    if (u.tBloque > 1.5) { if (Math.hypot(u.x - (u.px || 0), u.z - (u.pz || 0)) < 0.6) { u.bloque++; u.chemin = null; u.but = null; if (u.bloque > 3) { u.coince = true; u.bloque = 0; return true; } } else u.bloque = 0; u.px = u.x; u.pz = u.z; u.tBloque = 0; }
    return false;
  }
  function pas(B, u, x, z, dt) {
    const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz); if (d < 1e-4) return;
    const v = u.s.vitesse * (u.lent > B.temps ? 0.4 : 1) * (B.joueurs[u.j] && B.joueurs[u.j].bonus.vitesseTemp || 1), k = Math.min(d, v * dt) / d;
    const nx = u.x + dx * k, nz = u.z + dz * k;
    if (marchableXZ(B, nx, nz)) { u.x = nx; u.z = nz; } else if (marchableXZ(B, nx, u.z)) u.x = nx; else if (marchableXZ(B, u.x, nz)) u.z = nz;
    const a = Math.atan2(dx, dz); u.dir = tourner(u.dir, a, dt * 9);
  }
  const tourner = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * Math.min(1, k); };
  // écartement : les unités ne se marchent pas dessus
  function separer(B) {
    for (const u of B.unites) {
      if (u.mort) continue; const r = u.s.rayon;
      autour(B, u.x, u.z, 3, v => {
        if (v === u || v.sorte !== 'u' || v.id < u.id || !!v.s.naval !== !!u.s.naval) return;
        const dx = v.x - u.x, dz = v.z - u.z, dd = dx * dx + dz * dz, m = r + v.s.rayon; if (dd >= m * m || dd < 1e-6) { if (dd < 1e-6) { v.x += 0.05; } return; }
        const d = Math.sqrt(dd), p = (m - d) / d * 0.5, ku = u.anim === 'marche' ? 0.3 : 0.7, kv = v.anim === 'marche' ? 0.3 : 0.7, s = ku + kv;
        const ux = u.x - dx * p * ku / s * 2, uz = u.z - dz * p * ku / s * 2, vx = v.x + dx * p * kv / s * 2, vz = v.z + dz * p * kv / s * 2;
        contexte(B, u); if (u.anim !== 'travail' && marchableXZ(B, ux, uz)) { u.x = ux; u.z = uz; }
        contexte(B, v); if (v.anim !== 'travail' && marchableXZ(B, vx, vz)) { v.x = vx; v.z = vz; }
        contexte(B, null);
      });
    }
  }
  // point d'approche d'une entité (bord le plus proche de l'unité)
  function approche(B, u, e) {
    // bâtiment ou ressource bloquante : case libre du pourtour la plus proche (null si tout est pris)
    if (e.demiE) {
      if (u.appr && u.appr[2] === e.id && marchable(B, Math.floor(u.appr[0] / CEL), Math.floor(u.appr[1] / CEL))) return u.appr;
      const c0x = Math.floor(e.bx / CEL), c0z = Math.floor(e.bz / CEL), dm = Math.round(e.demiE / CEL - 0.5) + 1; let best = null, bd = 1e12;
      for (let k = c0z - dm; k <= c0z + dm; k++) for (let i = c0x - dm; i <= c0x + dm; i++) { if (Math.max(Math.abs(i - c0x), Math.abs(k - c0z)) !== dm || !marchable(B, i, k)) continue; const x = i * CEL + 1, z = k * CEL + 1, dd = d2(x, z, u.x, u.z) + (B.occAppr && B.occAppr.get(k * B.n + i) || 0) * 30; if (dd < bd) { bd = dd; best = [x, z, e.id]; } }
      u.appr = best; return best;
    }
    const d = Math.hypot(u.x - e.x, u.z - e.z) || 1, r = (e.sorte === 'r' ? e.rayon : e.s.rayon) + u.s.rayon + 0.2; return [e.x + (u.x - e.x) / d * r, e.z + (u.z - e.z) / d * r];
  }

  // ---------- unités ----------
  function majUnite(B, u, dt) { contexte(B, u); majUnite2(B, u, dt); contexte(B, null); }
  function majUnite2(B, u, dt) {
    if (u.gele > B.temps) { u.anim = 'repos'; return; }
    u.cd = Math.max(0, u.cd - dt);
    if (u.frappe != null) { u.frappe -= dt; if (u.frappe <= 0) { const c = B.parId.get(u.cibleFrappe); u.frappe = null; if (c && vivant(c) && distBord(u, c) <= u.s.portee + u.s.rayon + 1.8) blesser(B, c, degatsContre(B, u, c), u.j); } }
    const o = u.ordre;
    // coincé (cible inaccessible) : la ressource est évitée, les autres ordres abandonnés
    if (u.coince) { u.coince = false; if (o && o.type === 'recolter' && !(u.porte && u.porte.n >= (u.s.porte || R.PORTE))) { (u.evite || (u.evite = new Set())).add(o.cible); o.cible = 0; } else if (o && o.type !== 'recolter') { u.ordre = null; u.chemin = null; u.anim = 'repos'; return; } }
    if (!o) { u.anim = u.anim === 'attaque' ? 'repos' : u.anim === 'marche' ? 'repos' : u.anim; if (!recolteur(u)) chercherEnnemi(B, u, u.s.vue * 0.85, true); else if (u.anim === 'travail') u.anim = 'repos'; return; }
    if (o.type === 'deplacer') {
      if (o.attaque && chercherEnnemi(B, u, u.s.vue * 0.9, false)) return;
      viser(B, u, o.x, o.z); if (marcher(B, u, dt) || Math.hypot(u.x - o.x, u.z - o.z) < 0.5) { u.ordre = null; u.chemin = null; u.anim = 'repos'; }
      return;
    }
    if (o.type === 'attaquer') {
      const c = B.parId.get(o.cible);
      if (!c || !vivant(c) || (c.j >= 0 && !ennemis(B, u.j, c.j))) { u.ordre = o.retour ? { type: 'deplacer', x: o.retour[0], z: o.retour[1], attaque: !!o.suite } : null; u.anim = 'repos'; if (!o.retour) chercherEnnemi(B, u, u.s.vue, true); return; }
      if (o.garde && Math.hypot(u.x - o.garde[0], u.z - o.garde[1]) > 22) { u.ordre = { type: 'deplacer', x: o.garde[0], z: o.garde[1] }; return; }
      const portee = u.s.portee + (c.demiE ? 1.6 : 0.6);
      if (distBord(u, c) <= portee) {
        u.chemin = null; u.but = null; u.dir = tourner(u.dir, Math.atan2(c.x - u.x, c.z - u.z), dt * 10); u.anim = 'attaque';
        if (u.cd <= 0) { u.cd = u.s.cadence; if (u.s.proj) { const y0 = u.s.naval ? 2.2 : BT.hauteur(B, u.x, u.z) + 1.4, n = u.s.salve || 1; for (let k = 0; k < n; k++) tirer(B, u.id, u.j, u.x + (k - (n - 1) / 2) * 0.8, y0, u.z, c, degatsContre(B, u, c) / (n > 1 ? n * 0.6 : 1), u.s.proj, u.s.zone); } else { u.frappe = 0.45; u.cibleFrappe = c.id; } }
      } else { const p = c.sorte === 'u' ? [c.x, c.z] : approche(B, u, c) || [c.x, c.z]; viser(B, u, p[0], p[1]); marcher(B, u, dt); }
      return;
    }
    if (o.type === 'construire') {
      const b = B.parId.get(o.cible);
      if (!b || b.mort || (b.fini && b.pv >= b.pvMax)) { u.ordre = null; u.anim = 'repos'; if (b && !b.mort) apresConstruction(B, u, b); return; }
      if (contact(u, b)) { u.chemin = null; u.but = null; u.anim = 'travail'; u.dir = tourner(u.dir, Math.atan2(b.x - u.x, b.z - u.z), dt * 8); b.batisseurs = (b.batisseurs || 0) + 1; }
      else { const p = approche(B, u, b); if (!p) { u.ordre = null; return; } viser(B, u, p[0], p[1]); marcher(B, u, dt); }
      return;
    }
    if (o.type === 'prier') {
      const b = B.parId.get(o.cible); if (!b || b.mort || !b.fini) { u.ordre = null; return; }
      if (distBord(u, b) <= u.s.rayon + 2.5) { u.chemin = null; u.anim = 'travail'; u.prie = true; const J = B.joueurs[u.j]; J.res.faveur = Math.min(200, J.res.faveur + R.RECOLTE.priere * (J.bonus.faveur || 1) * dt); }
      else { u.prie = false; const p = approche(B, u, b); if (!p) { u.ordre = null; return; } viser(B, u, p[0], p[1]); marcher(B, u, dt); }
      return;
    }
    if (o.type === 'deposer') { const b = B.parId.get(o.cible); if (!b || b.mort) { u.ordre = null; return; } if (contact(u, b)) { deposer(B, u); u.ordre = null; } else { const p = approche(B, u, b); if (!p) { u.ordre = null; return; } viser(B, u, p[0], p[1]); marcher(B, u, dt); } return; }
    if (o.type === 'recolter') recolter(B, u, o, dt);
  }
  function apresConstruction(B, u, b) {
    if (b.cle === 'ferme' && !b.occupant) { poserOrdre(B, u, { type: 'recolter', cible: b.id }); return; }
    let autre = null, da = 30 * 30; for (const x of B.bats) { if (x.mort || x.j !== u.j || x.fini) continue; const dd = d2(x.x, x.z, u.x, u.z); if (dd < da) { da = dd; autre = x; } } if (autre) { poserOrdre(B, u, { type: 'construire', cible: autre.id }); return; }
    if (b.d.depot) { const t = b.d.depot.includes('bois') ? 'bois' : 'nourriture', r = ressourceProche(B, u.x, u.z, t, 28, u.j); if (r) poserOrdre(B, u, { type: 'recolter', cible: r.id }); }
  }
  function chercherEnnemi(B, u, rayon, garde) {
    if (u.cherche > B.temps || treve(B) || !u.s.att) return false; u.cherche = B.temps + 0.4 + (u.id % 5) * 0.05;
    let best = null, bd = rayon * rayon;
    // le corps à corps n'attaque pas les bateaux ; les bateaux ne visent que ce qui est à portée de tir
    autour(B, u.x, u.z, rayon, e => { if (!ennemis(B, u.j, e.j) || !vivant(e)) return; if (!u.s.portee && e.s && e.s.naval) return; if (u.s.naval && (e.sorte === 'u' ? Math.hypot(e.x - u.x, e.z - u.z) : distBord(u, e)) > u.s.portee + 4) return; let dd = d2(e.x, e.z, u.x, u.z); if (e.sorte === 'b') dd += 64; else if (e.cle === 'villageois') dd += 9; if (dd < bd) { bd = dd; best = e; } });
    if (best) { u.ordre = { type: 'attaquer', cible: best.id, garde: garde ? [u.x, u.z] : null, retour: garde ? [u.x, u.z] : (u.ordre && u.ordre.type === 'deplacer' ? [u.ordre.x, u.ordre.z] : null), auto: true }; if (u.ordre.retour && !garde) u.ordre.suite = true; u.chemin = null; u.but = null; return true; }
    return false;
  }
  function ressourceProche(B, x, z, t, rayon, j, sous, evite) {
    let best = null, bd = rayon * rayon;
    for (const r of B.res) { if (r.qte <= 0 || r.t !== t || (sous && r.sous !== sous) || (!sous && r.eau) || (evite && evite.has(r.id))) continue; const dd = d2(r.x, r.z, x, z); if (dd < bd) { bd = dd; best = r; } }
    if (t === 'nourriture' && sous !== 'poisson') for (const b of B.bats) if (!b.mort && b.cle === 'ferme' && b.fini && b.j === j && !b.occupant) { const dd = d2(b.x, b.z, x, z); if (dd < bd) { bd = dd; best = b; } }
    return best;
  }
  BT.ressourceProche = ressourceProche;
  function depotProche(B, u, t) {
    let best = null, bd = 1e12;
    for (const b of B.bats) { if (b.mort || !b.fini || b.j !== u.j || !b.d.depot || !b.d.depot.includes(t) || (u.s && u.s.naval && !b.d.port)) continue; const dd = d2(b.x, b.z, u.x, u.z); if (dd < bd) { bd = dd; best = b; } }
    return best;
  }
  BT.depotProche = (B, j, x, z, t) => depotProche(B, { j, x, z }, t);
  function deposer(B, u) {
    if (!u.porte || !u.porte.n) return; const J = B.joueurs[u.j]; J.res[u.porte.t] += u.porte.n; J.stats.recolte += u.porte.n; B.evts.push({ type: 'depot', j: u.j, t: u.porte.t, n: u.porte.n, x: u.x, z: u.z }); u.porte = null;
  }
  function recolter(B, u, o, dt) {
    let c = B.parId.get(o.cible);
    const typeDe = c => c.sorte === 'b' ? 'nourriture' : c.t;
    // ressource épuisée : la plus proche du même genre
    if (!c || c.mort || (c.sorte === 'r' && c.qte <= 0) || (c.sorte === 'b' && c.occupant && c.occupant !== u.id)) {
      if (c) { o.t = typeDe(c); o.sous = c.sorte === 'r' && !c.animal ? c.sous : null; o.px = c.x; o.pz = c.z; }
      if (u.s.naval) o.sous = 'poisson';
      const t = o.t || (u.porte ? u.porte.t : null);
      const n = t ? ressourceProche(B, o.px || u.x, o.pz || u.z, t, 24, u.j, o.sous, u.evite) : null;
      if (n) { o.cible = n.id; c = n; } else { if (u.porte && u.porte.n) { const d = depotProche(B, u, u.porte.t); if (d) { u.ordre = { type: 'deposer', cible: d.id }; return; } } u.ordre = null; u.anim = 'repos'; return; }
    }
    const t = typeDe(c);
    if (u.porte && (u.porte.n >= (u.s.porte || R.PORTE) || (u.porte.t !== t && u.porte.n > 0))) {
      const d = depotProche(B, u, u.porte.t); if (!d) { u.anim = 'repos'; return; }
      if (contact(u, d)) deposer(B, u); else { const p = approche(B, u, d) || [d.x, d.z]; viser(B, u, p[0], p[1]); marcher(B, u, dt); }
      return;
    }
    if (c.sorte === 'b') { // ferme : on travaille dessus
      if (c.occupant && c.occupant !== u.id) return; c.occupant = u.id;
      if (Math.hypot(u.x - c.x, u.z - c.z) > 2.2) { viser(B, u, c.x, c.z); marcher(B, u, dt); return; }
      u.chemin = null; u.anim = 'cultive'; gagner(B, u, 'nourriture', R.RECOLTE.ferme, dt, null); return;
    }
    if (c.animal && c.vivant) { // chasse : le villageois abat l'animal à quelques mètres, puis le dépèce
      if (Math.hypot(u.x - c.x, u.z - c.z) < 6) { u.chemin = null; u.anim = 'attaque'; u.dir = tourner(u.dir, Math.atan2(c.x - u.x, c.z - u.z), dt * 8); u.chasse = (u.chasse || 0) + dt; if (u.chasse > 1.2) { c.vivant = false; c.mort_t = B.temps; u.chasse = 0; B.evts.push({ type: 'abattu', id: c.id, x: c.x, z: c.z }); } return; }
      viser(B, u, c.x, c.z); marcher(B, u, dt); return;
    }
    if (contact(u, c)) {
      u.chemin = null; u.but = null; u.anim = 'travail'; u.dir = tourner(u.dir, Math.atan2(c.x - u.x, c.z - u.z), dt * 8);
      const taux = c.sous === 'arbre' ? R.RECOLTE.bois : c.sous === 'mine' ? R.RECOLTE.or : c.sous === 'baies' ? R.RECOLTE.baies : c.sous === 'poisson' ? R.RECOLTE.poisson : R.RECOLTE.viande;
      gagner(B, u, t, taux, dt, c);
    } else { const p = approche(B, u, c); if (!p) { (u.evite || (u.evite = new Set())).add(c.id); o.cible = 0; return; } viser(B, u, p[0], p[1]); marcher(B, u, dt); }
  }
  function gagner(B, u, t, taux, dt, c) {
    const J = B.joueurs[u.j], D = J.ia ? R.DIFFICULTES[J.difficulte].recolte : 1;
    let k = taux * (J.bonus['recolte_' + t] || 1) * D * (u.lent > B.temps ? 0.5 : 1);
    for (const x of J.temp) if (x.cle === 'recolte_' + t) k *= 1 + x.valeur;
    let q = k * dt; if (c) { q = Math.min(q, c.qte); c.qte -= q; if (c.qte <= 0) epuiser(B, c); }
    if (!u.porte || u.porte.t !== t) u.porte = { t, n: 0 };
    u.porte.n = Math.min(u.s.porte || R.PORTE, u.porte.n + q);
  }
  function epuiser(B, c) {
    c.qte = 0; c.epuise = B.temps;
    if (c.sous === 'arbre') B.evts.push({ type: 'abattu', id: c.id, x: c.x, z: c.z, arbre: true });
    const d = RES[c.sous]; if (d && d.bloc) marquer(B, c, d.bloc === 2 ? 1 : 0, LIBRE);
  }

  // ---------- bâtiments ----------
  function majBat(B, b, dt) {
    const J = B.joueurs[b.j];
    if (!b.fini) {
      const n = b.batisseurs || 0; b.batisseurs = 0; if (!n) return;
      const g = dt / b.d.temps * Math.pow(n, 0.75); b.prog = Math.min(1, b.prog + g); b.pv = Math.min(b.pvMax, b.pv + b.pvMax * g);
      if (b.prog >= 1) { b.fini = true; b.tFini = B.temps; J.stats.construits++; B.evts.push({ type: 'construit', id: b.id, cle: b.cle, j: b.j, x: b.x, z: b.z }); majPop(B); if (b.cle === 'merveille') b.garde = 0; }
      return;
    }
    if (b.batisseurs && b.pv < b.pvMax) b.pv = Math.min(b.pvMax, b.pv + b.pvMax / b.d.temps * 0.6 * Math.pow(b.batisseurs, 0.7) * dt); b.batisseurs = 0;
    // production
    if (b.file.length) {
      const f = b.file[0], s = BT.stats(B, b.j, f.cle);
      if (J.pop + s.pop > J.popMax) { b.attentePop = true; }
      else { b.attentePop = false; f.t += dt; if (f.t >= s.temps) { b.file.shift(); sortir(B, b, f.cle); } }
    }
    // passage d'âge au centre-ville
    if (b.cle === 'centre' && J.ageEnCours && J.ageEnCours.centre == null) J.ageEnCours.centre = b.id;
    if (J.ageEnCours && J.ageEnCours.centre === b.id) {
      const A = J.ageEnCours; A.t += dt;
      if (A.t >= A.temps) { J.age = A.age; J.mineurs.push(A.mineur); const g = mineurDe(J, A.mineur); if (g) J.pouvoirs.push({ id: g.pouvoir, utilise: false }); J.ageEnCours = null; J.cacheStats = {}; B.evts.push({ type: 'age', j: b.j, age: J.age, mineur: A.mineur }); }
    }
    // tir des défenses
    if (b.d.att && !treve(B)) {
      b.cd -= dt; if (b.cd > 0) return; b.cd = b.d.cadence;
      const cibles = []; autour(B, b.x, b.z, b.d.portee + b.taille / 2, e => { if (e.sorte === 'u' && ennemis(B, b.j, e.j) && distBord(e, b) <= b.d.portee) cibles.push(e); });
      if (!cibles.length) { b.cd = 0.5; return; }
      cibles.sort((p, q) => d2(p.x, p.z, b.x, b.z) - d2(q.x, q.z, b.x, b.z));
      const proj = R.PROJ_EPOQUE[B.epoque] ? R.PROJ_EPOQUE[B.epoque].fleche : 'fleche';
      for (let k = 0; k < (b.d.fleches || 1); k++) { const c = cibles[k % cibles.length]; tirer(B, b.id, b.j, b.x, BT.hauteur(B, b.x, b.z) + b.taille * 0.5, b.z, c, b.d.att * (c.s.cat === 'siege' ? 0.4 : 1), proj); }
    }
  }
  function sortir(B, b, cle) {
    const r = b.rally, cx = r ? r.x : b.x, cz = r ? r.z : b.z + b.taille, t = b.demiE + 1.2;
    let px = Math.max(b.x - t, Math.min(b.x + t, cx)), pz = Math.max(b.z - t, Math.min(b.z + t, cz));
    if (Math.abs(px - b.x) < t && Math.abs(pz - b.z) < t) pz = b.z + t;
    const naval = !!(R.ROLES[cle] && R.ROLES[cle].naval); CTX.naval = naval; CTX.j = b.j;
    const c = naval ? caseLibreProche(B, Math.floor(b.x / CEL), Math.floor(b.z / CEL), Math.floor(cx / CEL), Math.floor(cz / CEL)) : caseLibreProche(B, Math.floor(px / CEL), Math.floor(pz / CEL), Math.floor(cx / CEL), Math.floor(cz / CEL));
    contexte(B, null); if (!c) return;
    const u = ajouterUnite(B, b.j, cle, c[0] * CEL + 1, c[1] * CEL + 1); if (!u) return;
    u.dir = Math.atan2(cx - u.x, cz - u.z);
    B.evts.push({ type: 'forme', id: u.id, j: b.j, cle });
    majPop(B);
    if (r) {
      const cible = r.cible ? B.parId.get(r.cible) : null;
      if (cible && vivant(cible) && recolteur(u)) BT.ordreContexte(B, b.j, [u.id], r.x, r.z, r.cible);
      else poserOrdre(B, u, { type: 'deplacer', x: r.x + (B.rnd() - 0.5) * 3, z: r.z + (B.rnd() - 0.5) * 3 });
    }
  }

  // ---------- pouvoirs en cours ----------
  function majEffets(B) {
    for (const f of B.effets) {
      if (f.type === 'zone' && B.temps >= f.prochain && B.temps < f.fin) {
        f.prochain += f.pas; const a = B.rnd() * 6.28, r = Math.sqrt(B.rnd()) * f.d.rayon, x = f.x + Math.cos(a) * r, z = f.z + Math.sin(a) * r;
        // les éclairs et météores cherchent les ennemis
        let px = x, pz = z;
        if (f.d.eclairs || f.d.meteores) { let best = null, bd = 1e9; autour(B, f.x, f.z, f.d.rayon, e => { if (!ennemis(B, f.j, e.j) || d2(e.x, e.z, f.x, f.z) > f.d.rayon * f.d.rayon) return; const dd = d2(e.x, e.z, x, z) + B.rnd() * 40; if (dd < bd) { bd = dd; best = e; } }); if (best) { px = best.x; pz = best.z; } }
        B.evts.push({ type: 'impact', sorte: f.d.meteores ? 'meteore' : f.d.eclairs ? 'eclair' : 'zone', pouvoir: f.id, x: px, z: pz, j: f.j });
        autour(B, px, pz, 4, e => { if (!ennemis(B, f.j, e.j)) return; const de = e.sorte === 'b' ? distBord({ x: px, z: pz }, e) : Math.hypot(e.x - px, e.z - pz); if (de > 3.5) return; blesser(B, e, e.sorte === 'b' ? f.d.degB : f.d.degU, f.j, true); if (f.d.paralysie && e.sorte === 'u') e.gele = B.temps + f.d.paralysie; });
      }
    }
    B.effets = B.effets.filter(f => B.temps < f.fin);
    for (const J of B.joueurs) J.temp = J.temp.filter(t => t.fin > B.temps);
  }

  // ---------- brouillard ----------
  function majBrouillard(B) {
    const m = B.mv;
    for (const J of B.joueurs) J.vis.fill(0);
    const voir = (J, x, z, r) => { const R2 = (r / VUE_CEL) ** 2, ci = x / VUE_CEL, ck = z / VUE_CEL, rr = Math.ceil(r / VUE_CEL); for (let k = Math.max(0, Math.floor(ck - rr)); k <= Math.min(m - 1, Math.ceil(ck + rr)); k++) for (let i = Math.max(0, Math.floor(ci - rr)); i <= Math.min(m - 1, Math.ceil(ci + rr)); i++) if ((i + 0.5 - ci) ** 2 + (k + 0.5 - ck) ** 2 <= R2) { J.vis[k * m + i] = 2; J.connu[k * m + i] = 1; } };
    for (const u of B.unites) if (!u.mort && u.j >= 0) { const s = u.s; B.joueurs.forEach(J => { if (J.id === u.j || (J.equipe === B.joueurs[u.j].equipe)) voir(J, u.x, u.z, s.vue); }); }
    for (const b of B.bats) if (!b.mort) B.joueurs.forEach(J => { if (J.id === b.j || J.equipe === B.joueurs[b.j].equipe) voir(J, b.x, b.z, b.d.vue + b.taille / 2); });
    for (const J of B.joueurs) if (J.vision > B.temps || B.toutVoir) { J.vis.fill(2); J.connu.fill(1); }
    B.versionBrouillard = (B.versionBrouillard || 0) + 1;
  }
  BT.visible = (B, j, x, z) => { const m = B.mv, i = Math.floor(x / VUE_CEL), k = Math.floor(z / VUE_CEL); return i >= 0 && k >= 0 && i < m && k < m && B.joueurs[j].vis[k * m + i] === 2; };
  BT.connu = (B, j, x, z) => { const m = B.mv, i = Math.floor(x / VUE_CEL), k = Math.floor(z / VUE_CEL); return i >= 0 && k >= 0 && i < m && k < m && B.joueurs[j].connu[k * m + i] === 1; };
  BT.VUE_CEL = VUE_CEL;

  // ---------- animaux ----------
  function majAnimaux(B, dt) {
    for (const r of B.res) {
      if (!r.animal || !r.vivant) continue;
      if (!r.vers || B.rnd() < dt * 0.08) { const a = B.rnd() * 6.28, d = B.rnd() * 5; r.vers = [r.hx + Math.cos(a) * d, r.hz + Math.sin(a) * d]; }
      const dx = r.vers[0] - r.x, dz = r.vers[1] - r.z, d = Math.hypot(dx, dz);
      if (d > 0.3) { const k = Math.min(d, 0.9 * dt) / d, nx = r.x + dx * k, nz = r.z + dz * k; if (marchableXZ(B, nx, nz)) { r.x = nx; r.z = nz; r.dir = Math.atan2(dx, dz); r.marche = true; } else r.vers = null; } else r.marche = false;
    }
  }

  // ---------- un pas de simulation ----------
  function pasSimulation(B) {
    const dt = PAS; B.temps += dt; B.tick = (B.tick || 0) + 1;
    majHash(B);
    // chemins demandés : quelques-uns par pas pour ne pas figer l'image
    for (let k = 0; k < 12 && B.fileChemins.length; k++) {
      const u = B.parId.get(B.fileChemins.shift()); if (!u || u.mort || !u.attente || !u.but) continue;
      contexte(B, u); u.attente = false; u.chemin = aEtoile(B, u.x, u.z, u.but[0], u.but[1]) || [[u.but[0], u.but[1]]]; u.ci = 0; contexte(B, null);
    }
    for (const u of B.unites) if (!u.mort) majUnite(B, u, dt);
    for (const b of B.bats) if (!b.mort) majBat(B, b, dt);
    separer(B);
    majProjectiles(B, dt); majEffets(B); majAnimaux(B, dt);
    // faveur des cultures
    for (const J of B.joueurs) {
      if (J.vaincu) continue; const cu = R.CULTURE[J.pantheon] || {};
      let g = 0; if (cu.faveur === 'temples') g = Math.min(3, B.bats.filter(b => !b.mort && b.fini && b.j === J.id && b.cle === 'temple').length) * 0.28;
      if (cu.faveur === 'centres') g = B.bats.filter(b => !b.mort && b.fini && b.j === J.id && b.cle === 'centre').length * 0.22;
      J.res.faveur = Math.min(200, J.res.faveur + g * (J.bonus.faveur || 1) * dt);
      if (J.bonus.soin) for (const u of B.unites) if (!u.mort && u.j === J.id && u.pv < u.pvMax && B.tick % 20 === 0) { let pres = false; autour(B, u.x, u.z, 18, e => { if (e.sorte === 'b' && e.j === J.id) pres = true; }); if (pres) u.pv = Math.min(u.pvMax, u.pv + u.pvMax * 0.02); }
    }
    if (B.tick % 10 === 0) majBrouillard(B);
    if (B.treve > 0 && !B.treveFinie && B.temps >= B.treve) { B.treveFinie = true; B.evts.push({ type: 'treve' }); }
    if (B.mission && B.tick % 20 === 0) vagues(B);
    if (B.tick % 20 === 0) { for (const J of B.joueurs) if (J.ia && !J.vaincu) { J.cerveau.t -= 1; if (J.cerveau.t <= 0) { J.cerveau.t = R.DIFFICULTES[J.difficulte].pense; ia(B, J); } } verifierFin(B); }
    // nettoyage des morts (après l'animation de chute)
    if (B.tick % 40 === 0) {
      const garder = e => !e.mort || B.temps - e.mort < 6; const morts = B.unites.filter(e => !garder(e)).concat(B.bats.filter(e => !garder(e)));
      for (const e of morts) B.parId.delete(e.id);
      B.unites = B.unites.filter(garder); B.bats = B.bats.filter(garder);
      const resGarde = r => r.qte > 0 || B.temps - (r.epuise || 0) < 8; for (const r of B.res) if (!resGarde(r)) B.parId.delete(r.id); B.res = B.res.filter(resGarde);
    }
  }
  BT.avancer = function (B, dtReel) {
    if (B.fin && B.fin.arret) return 0;
    B.acc += Math.min(0.25, dtReel) * (B.vitesse || 1); let n = 0;
    while (B.acc >= PAS && n < 8) { B.acc -= PAS; pasSimulation(B); n++; }
    return n;
  };
  BT.pas = pasSimulation;

  // ---------- victoire ----------
  function verifierFin(B) {
    for (const J of B.joueurs) {
      if (J.vaincu) continue;
      const bats = B.bats.filter(b => !b.mort && b.j === J.id && b.cle !== 'ferme'), vill = B.unites.some(u => !u.mort && u.j === J.id && u.cle === 'villageois');
      const centre = bats.some(b => b.cle === 'centre');
      // vaincu : plus de centre-ville ni de villageois pour en rebâtir un (le peuple se rend)
      if ((!bats.length && !vill) || (!centre && !vill)) { J.vaincu = true; for (const u of B.unites) if (u.j === J.id && !u.mort) mourir(B, u, null); for (const b of B.bats) if (b.j === J.id && !b.mort) mourir(B, b, null); B.evts.push({ type: 'vaincu', j: J.id }); }
      const m = B.bats.find(b => !b.mort && b.j === J.id && b.cle === 'merveille' && b.fini);
      if (m) { m.garde = (m.garde || 0) + 1; if (m.garde >= (B.gardeMerveille || R.GARDE_MERVEILLE) && !B.fin) B.fin = { gagnant: J.equipe, raison: 'merveille', temps: B.temps }; }
    }
    if (B.mission) verifierMission(B);
    const equipes = new Set(B.joueurs.filter(J => !J.vaincu).map(J => J.equipe));
    if (equipes.size <= 1 && !B.fin) B.fin = { gagnant: [...equipes][0], raison: 'conquete', temps: B.temps };
  }

  // ---------- ordinateur ----------
  // économie (villageois répartis, maisons, dépôts, fermes), bâtiments par âge, passage des âges, armée, attaques par vagues, défense, pouvoirs
  function trouverPlace(B, J, cle, ax, az, rmin, rmax) {
    const d = R.BATIMENTS[cle], marge = cle === 'ferme' || cle === 'maison' ? 1 : 2;
    for (let t = 0; t < 60; t++) {
      const a = B.rnd() * 6.28, r = rmin + B.rnd() * (rmax - rmin), x = ax + Math.cos(a) * r, z = az + Math.sin(a) * r;
      const cx = (Math.floor(x / CEL) + 0.5) * CEL, cz = (Math.floor(z / CEL) + 0.5) * CEL;
      if (!BT.peutPoser(B, J.id, cle, cx, cz).ok) continue;
      // garde un passage autour du bâtiment
      const demi = Math.floor(d.taille / CEL / 2) + marge, n = B.n, i0 = Math.floor(cx / CEL), k0 = Math.floor(cz / CEL); let ok = true;
      for (let k = k0 - demi; k <= k0 + demi && ok; k++) for (let i = i0 - demi; i <= i0 + demi; i++) { if (i < 1 || k < 1 || i >= n - 1 || k >= n - 1) { ok = false; break; } const v = B.bloc[k * n + i]; if (v === BAT || v === CHAMP || (v === RESS && cle !== 'entrepot' && cle !== 'grenier')) { ok = false; break; } }
      if (ok) return [cx, cz];
    }
    return null;
  }
  function ia(B, J) {
    const j = J.id, D = R.DIFFICULTES[J.difficulte], C = J.cerveau;
    const mes = B.unites.filter(u => !u.mort && u.j === j), bats = B.bats.filter(b => !b.mort && b.j === j);
    const vill = mes.filter(u => u.cle === 'villageois'), mil = mes.filter(u => u.cle !== 'villageois' && !u.s.naval), flotte = mes.filter(u => u.s.naval);
    const centre = bats.find(b => b.cle === 'centre' && b.fini) || bats.find(b => b.cle === 'centre');
    const nb = cle => bats.filter(b => b.cle === cle).length, enCours = bats.filter(b => !b.fini);
    const base = centre || bats[0] || vill[0]; if (!base) return;
    const bx = base.x, bz = base.z;
    const construire = (cle, x, z, n) => {
      if (!x) return false; const libres = vill.filter(u => !u.ordre || u.ordre.type === 'recolter').sort((a, b) => d2(a.x, a.z, x, z) - d2(b.x, b.z, x, z)).slice(0, n || 2);
      if (!libres.length) return false; const r = BT.poser(B, j, cle, x, z, libres.map(u => u.id)); return r.ok;
    };
    // chantier abandonné depuis 40 s : démoli (remboursé) pour reconstruire ailleurs
    for (const b of enCours) { if (b.prog !== b.progVu) { b.progVu = b.prog; b.tProg = B.temps; } else if (B.temps - (b.tProg || b.tNe) > 40) BT.detruire(B, j, [b.id]); }
    // centre-ville perdu : on le rebâtit dès que possible
    if (!bats.some(b => b.cle === 'centre') && vill.length && J.age >= 1 && assez(J, BT.coutBat(B, j, 'centre'))) { const p = trouverPlace(B, J, 'centre', vill[0].x, vill[0].z, 6, 40); if (p) construire('centre', p[0], p[1], vill.length); }
    const reserve = J.ageEnCours || J.age >= 3 ? {} : R.AGES[J.age + 1].cout;
    const surplus = r => J.res[r] - (reserve[r] || 0) * (vill.length >= [14, 26, 38, 99][J.age] ? 1 : 0);
    // villageois
    const cible = [20, 32, 46, 56][J.age] + (B.duree === 'normale' ? 0 : J.age * 8);
    if (centre && centre.fini && centre.file.length < 2 && vill.length + centre.file.length < cible && J.res.nourriture >= 50 && (J.pop < J.popMax)) BT.former(B, j, centre.id, 'villageois');
    // maisons
    if (J.popMax < (B.popMax || R.POP_MAX) && J.popMax - J.pop <= 3 + J.age * 3 && enCours.filter(b => b.cle === 'maison').length < (J.age >= 2 ? 2 : 1) && J.res.bois >= 50) { const p = trouverPlace(B, J, 'maison', bx, bz, 14, 30 + J.nbMaisons * 2); if (p) construire('maison', p[0], p[1], 1); }
    // bâtiments à poser
    const plan = [[0, 'caserne', 9], [0, 'temple', 13], [1, 'archerie', 0], [1, 'ecurie', 0], [1, 'tour', 0], [2, 'forteresse', 0], [2, 'tour', 0], [3, 'merveille', 0]];
    if (!enCours.some(b => b.cle !== 'maison' && b.cle !== 'ferme')) for (const [a, cle, v] of plan) {
      if (J.age < a || vill.length < v) continue;
      const voulu = plan.filter(p => p[1] === cle && p[0] <= J.age).length; if (nb(cle) >= voulu) continue;
      if (cle === 'merveille' && J.difficulte < 2 && B.rnd() < 0.7) continue;
      if (!assez(J, BT.coutBat(B, j, cle))) break;
      const p = trouverPlace(B, J, cle, bx, bz, cle === 'tour' ? 24 : 18, cle === 'tour' ? 36 : 40); if (p) construire(cle, p[0], p[1], cle === 'merveille' ? 6 : 3);
      break;
    }
    // dépôts près des ressources éloignées
    const loinDuDepot = t => { const r = ressourceProche(B, bx, bz, t, 90, j, t === 'or' ? 'mine' : t === 'bois' ? 'arbre' : null); if (!r || r.sorte === 'b') return null; const d = depotProche(B, { j, x: r.x, z: r.z }, t); return !d || distBord({ x: r.x, z: r.z }, d) > 16 ? r : null; };
    if (!enCours.some(b => b.cle === 'entrepot') && J.res.bois >= 50) for (const t of ['bois', 'or']) { const r = loinDuDepot(t); if (r) { const p = trouverPlace(B, J, 'entrepot', r.x, r.z, 5, 11); if (p && construire('entrepot', p[0], p[1], 1)) break; } }
    // fermes quand la nourriture sauvage s'épuise
    const sauvage = ressourceProche(B, bx, bz, 'nourriture', 45, j);
    const fermes = nb('ferme'), mangeurs = vill.filter(u => u.ordre && u.ordre.type === 'recolter' && (B.parId.get(u.ordre.cible) || {}).t === 'nourriture').length;
    if ((!sauvage || sauvage.sorte === 'b') && fermes < Math.max(4, Math.round(vill.length * 0.42)) && J.res.bois >= 60 && enCours.filter(b => b.cle === 'ferme').length < 2) { const p = trouverPlace(B, J, 'ferme', bx, bz, 12, 26 + fermes * 1.5); if (p) construire('ferme', p[0], p[1], 1); }
    // répartition des villageois
    const part = J.age === 0 ? { nourriture: 0.62, bois: 0.3, or: 0.08 } : J.age === 1 ? { nourriture: 0.48, bois: 0.27, or: 0.25 } : { nourriture: 0.42, bois: 0.25, or: 0.33 };
    const compte = { nourriture: 0, bois: 0, or: 0, faveur: 0 };
    for (const u of vill) { if (u.ordre && u.ordre.type === 'recolter') { const c = B.parId.get(u.ordre.cible); if (c) compte[c.sorte === 'b' ? 'nourriture' : c.t]++; } else if (u.ordre && u.ordre.type === 'prier') compte.faveur++; }
    void mangeurs;
    const temple = bats.find(b => b.cle === 'temple' && b.fini);
    // ressources déjà assez occupées (deux par arbre ou buisson, sept par mine, quatre par bête)
    const occ = new Map(); for (const u of vill) if (u.ordre && u.ordre.type === 'recolter') occ.set(u.ordre.cible, (occ.get(u.ordre.cible) || 0) + 1);
    const CAP = { arbre: 2, baies: 2, mine: 7, mouton: 4, vache: 4 }, pleins = new Set(); for (const [id, k] of occ) { const r = B.parId.get(id); if (r && r.sorte === 'r' && k >= (CAP[r.sous] || 3)) pleins.add(id); }
    for (const u of vill) {
      if (u.ordre) continue;
      if (temple && J.pantheon === 'grecs' && compte.faveur < Math.min(5, Math.floor(vill.length / 9)) && J.res.faveur < 120) { poserOrdre(B, u, { type: 'prier', cible: temple.id }); compte.faveur++; continue; }
      const t = Object.keys(part).sort((a, b) => (compte[a] / Math.max(1, vill.length) - part[a]) - (compte[b] / Math.max(1, vill.length) - part[b]))[0];
      let r = ressourceProche(B, u.x, u.z, t, 70, j, null, pleins);
      if (!r) r = ressourceProche(B, u.x, u.z, t === 'or' ? 'bois' : 'or', 90, j, null, pleins);
      if (r) { poserOrdre(B, u, { type: 'recolter', cible: r.id }); compte[r.sorte === 'b' ? 'nourriture' : r.t]++; occ.set(r.id, (occ.get(r.id) || 0) + 1); if (r.sorte === 'r' && occ.get(r.id) >= (CAP[r.sous] || 3)) pleins.add(r.id); }
    }
    // passage d'âge
    if (!J.ageEnCours && J.age < 3 && vill.length >= [14, 26, 38][J.age] && BT.peutAvancer(B, j).ok) { const ch = PM.PANTHEONS[J.pantheon].mineurs[J.age]; BT.avancerAge(B, j, ch[Math.floor(B.rnd() * ch.length)].id); }
    // armée
    for (const b of bats) {
      if (!b.fini || !b.d.forme || b.cle === 'centre' || b.cle === 'port' || b.file.length >= 2) continue;
      const l = BT.formables(B, b).filter(cle => BT.peutFormer(B, b, cle).ok); if (!l.length) continue;
      const cle = l[Math.floor(B.rnd() * l.length)], s = BT.stats(B, j, cle);
      if (Object.keys(s.cout).every(r => surplus(r) >= s.cout[r]) || J.res.nourriture > 1200) BT.former(B, j, b.id, cle);
    }
    // défense : ennemis près de la base
    let menace = null; autour(B, bx, bz, 40, e => { if (e.sorte === 'u' && ennemis(B, j, e.j) && !menace) menace = e; });
    const libresMil = mil.filter(u => !u.ordre || u.ordre.auto || u.ordre.type === 'deplacer');
    if (menace) { for (const u of libresMil) if (!u.ordre || u.ordre.type !== 'attaquer') poserOrdre(B, u, { type: 'deplacer', x: menace.x, z: menace.z, attaque: true }); C.attaque = false; }
    // attaque par vagues : seuil croissant, cible = bâtiment ennemi le plus proche
    const popMil = mil.reduce((s, u) => s + u.s.pop, 0), seuil = D.attaque + C.vague * 6 + J.age * 2;
    // cibles : bâtiments ennemis, sinon les dernières unités (on achève les fuyards)
    const ciblesEnnemies = () => { const l = B.bats.filter(b => !b.mort && ennemis(B, j, b.j)); return (l.length ? l : B.unites.filter(u => !u.mort && ennemis(B, j, u.j))).sort((a, b) => d2(a.x, a.z, bx, bz) - d2(b.x, b.z, bx, bz)); };
    if (!menace && !J.passif && !treve(B) && popMil >= seuil && B.temps >= C.prochaineAttaque) {
      const cibles = ciblesEnnemies();
      if (cibles.length) { const c = cibles[0], ids = mil.map(u => u.id); BT.ordreContexte(B, j, ids, c.x, c.z, null, true); C.attaque = true; C.vague++; C.cibleAttaque = c.id; C.prochaineAttaque = B.temps + 60; }
    }
    if (C.attaque) { const c = B.parId.get(C.cibleAttaque); if (!c || c.mort) { const cibles = ciblesEnnemies(); if (cibles.length) { C.cibleAttaque = cibles[0].id; BT.ordreContexte(B, j, mil.filter(u => !u.ordre).map(u => u.id), cibles[0].x, cibles[0].z, null, true); } else C.attaque = false; } else BT.ordreContexte(B, j, mil.filter(u => !u.ordre).map(u => u.id), c.x, c.z, null, true); }
    iaFlotte(B, J, bats, flotte, vill, bx, bz, surplus);
    // pouvoirs : sur un groupe d'ennemis, ou tout de suite pour l'économie
    if (!treve(B)) J.pouvoirs.forEach((p, i) => {
      if (p.utilise) return; const d = R.POUVOIRS[p.id]; if (!d) return;
      if (d.type === 'ressources' || d.type === 'bonus' && d.cle !== 'attaque' || d.type === 'age' && J.ageEnCours || d.type === 'vision' && B.temps > 300) { BT.pouvoir(B, j, i, bx, bz); return; }
      if (['eclair', 'zone', 'paralysie', 'ralenti', 'conversion'].includes(d.type) || (d.type === 'bonus' && d.cle === 'attaque')) {
        // groupe d'ennemis visible le plus dense
        let best = null, bn = d.type === 'eclair' ? 0 : 5;
        for (const e of B.unites) { if (e.mort || !ennemis(B, j, e.j) || !BT.visible(B, j, e.x, e.z) || e.cle === 'villageois' && d.type !== 'zone') continue; let k = 0; autour(B, e.x, e.z, 8, f => { if (f.sorte === 'u' && ennemis(B, j, f.j) && d2(f.x, f.z, e.x, e.z) < 64) k++; }); if (d.type === 'eclair' && (e.s.cat === 'mythe' || e.s.cat === 'heros')) k += 10; if (k > bn) { bn = k; best = e; } }
        if (best && (d.type !== 'bonus' || C.attaque)) BT.pouvoir(B, j, i, best.x, best.z);
      } else if (d.type === 'invoquer' || d.type === 'vortex') { if (menace) BT.pouvoir(B, j, i, menace.x, menace.z); else if (C.attaque && mil.length && d.type === 'invoquer') { const m = mil[0]; BT.pouvoir(B, j, i, m.x, m.z); } }
      else if (d.type === 'soin') { const blesses = mil.filter(u => u.pv < u.pvMax * 0.5); if (blesses.length >= 4) BT.pouvoir(B, j, i, blesses[0].x, blesses[0].z); }
      else if (d.type === 'bouclier') { if (menace) BT.pouvoir(B, j, i, bx, bz); }
    });
  }
  // ordinateur sur l'eau : un port près de la base, des bateaux de pêche, des navires qui gardent la côte et chassent la flotte ennemie
  function iaFlotte(B, J, bats, flotte, vill, bx, bz, surplus) {
    if (!B.aEau) return; const j = J.id, C = J.cerveau;
    const port = bats.find(b => b.cle === 'port');
    if (!port) {
      if (vill.length < 12 || J.res.bois < 150 || C.essaiPort > B.temps) return; C.essaiPort = B.temps + 25;
      for (let r = 14; r < 80 && !C.portPose; r += 12) { const p = trouverPlace(B, J, 'port', bx, bz, r, r + 12); if (p) { const libres = vill.filter(u => !u.ordre || u.ordre.type === 'recolter').slice(0, 3); if (libres.length && BT.poser(B, j, 'port', p[0], p[1], libres.map(u => u.id)).ok) break; } }
      return;
    }
    if (!port.fini) return;
    const peche = flotte.filter(u => u.cle === 'peche'), navires = flotte.filter(u => u.cle === 'navire');
    const poissons = B.res.some(r => r.eau && r.qte > 0);
    if (port.file.length < 2) {
      if (poissons && peche.length < 3 + J.age * 2 && J.res.bois >= 50 && J.pop < J.popMax) BT.former(B, j, port.id, 'peche');
      else if (navires.length < 2 + J.age * 2 && Object.entries(BT.stats(B, j, 'navire').cout).every(([r, v]) => surplus(r) >= v)) BT.former(B, j, port.id, 'navire');
    }
    for (const u of peche) if (!u.ordre) { const r = ressourceProche(B, u.x, u.z, 'nourriture', 120, j, 'poisson'); if (r) poserOrdre(B, u, { type: 'recolter', cible: r.id }); }
    if (treve(B)) return;
    // navires : flotte ennemie visible, sinon port ennemi pendant les attaques
    for (const u of navires) {
      if (u.ordre && u.ordre.type === 'attaquer') continue;
      let best = null, bd = 70 * 70; for (const e of B.unites) { if (e.mort || !e.s.naval || !ennemis(B, j, e.j)) continue; const dd = d2(e.x, e.z, u.x, u.z); if (dd < bd) { bd = dd; best = e; } }
      if (best) { poserOrdre(B, u, { type: 'attaquer', cible: best.id }); continue; }
      if (C.attaque && !u.ordre) { const pe = B.bats.find(b => !b.mort && b.cle === 'port' && ennemis(B, j, b.j)); if (pe) poserOrdre(B, u, { type: 'attaquer', cible: pe.id }); }
    }
  }
  BT.ia = ia;

  // ---------- missions de la campagne ----------
  BT.nouvelleMission = function (def) {
    const nb = def.adversaires.length;
    const joueurs = [Object.assign({ couleur: PM.COULEURS[0], equipe: 0 }, def.joueur)].concat(def.adversaires.map((a, i) => Object.assign({ ia: true, couleur: PM.COULEURS[[2, 1, 4][i]], equipe: a.equipe != null ? a.equipe : i + 1 }, a)));
    const B = BT.nouvelle({ epoque: def.epoque, carte: def.carte, taille: def.taille || (nb > 1 ? 'moyenne' : 'petite'), duree: def.duree || 'normale', graine: def.graine || (def.id.length * 7919 + 13), joueur: 0, joueurs, mission: def.id });
    const D = def.depart || {};
    const J0 = B.joueurs[0]; if (D.res) Object.assign(J0.res, D.res);
    const ages = (J, a) => { const P = PM.PANTHEONS[J.pantheon]; for (let k = J.age; k < a; k++) { const g = P.mineurs[k][0]; J.mineurs.push(g.id); J.pouvoirs.push({ id: g.pouvoir, utilise: false }); } J.age = Math.max(J.age, a); J.cacheStats = {}; };
    if (D.age) ages(J0, D.age);
    if (D.ageEnnemi) for (const J of B.joueurs.slice(1)) { ages(J, D.ageEnnemi); Object.assign(J.res, { nourriture: 1200, bois: 1200, or: 1200, faveur: 50 }); }
    for (const [j, cle, n] of D.unites || []) { const [x, z] = B.carte.departs[j]; for (let k = 0; k < n; k++) { const a = k / n * 6.28, c = caseLibreProche(B, Math.floor((x + 14 + Math.cos(a) * 3) / CEL), Math.floor((z + Math.sin(a) * 3) / CEL), 0, 0); if (c) ajouterUnite(B, j, cle, c[0] * CEL + 1, c[1] * CEL + 1); } }
    def.adversaires.forEach((a, i) => { if (a.muraille) muraille(B, i + 1, a.muraille); });
    B.joueurs.forEach(J => { J.stats.formees = 0; });
    B.mission = { id: def.id, objectifs: def.objectifs.map(o => Object.assign({ fait: false }, o)), vagues: (def.vagues || []).map(v => Object.assign({ fait: false }, v)) };
    majPop(B); majBrouillard(B);
    return B;
  };
  // enceinte autour d'un centre-ville : murs en cercle, une porte vers le centre de la carte, quatre tours et une garnison
  function muraille(B, j, rayon) {
    const c = B.bats.find(b => b.j === j && b.cle === 'centre'); if (!c) return;
    const ap = Math.atan2(B.cote / 2 - c.z, B.cote / 2 - c.x), vu = new Set(), segs = [];
    for (let a = 0; a < Math.PI * 2; a += 0.6 / rayon) {
      if (Math.abs(Math.atan2(Math.sin(a - ap), Math.cos(a - ap))) < 0.16) continue;
      const cx = Math.floor((c.x + Math.cos(a) * rayon) / CEL), cz = Math.floor((c.z + Math.sin(a) * rayon) / CEL), k = cz * B.n + cx;
      if (vu.has(k) || cx < 2 || cz < 2 || cx >= B.n - 2 || cz >= B.n - 2) continue; vu.add(k);
      if (B.bloc[k] === RESS) { const r = B.parId.get(B.occ[k]); if (r && r.sous === 'arbre') { r.qte = 0; epuiser(B, r); } }
      if (B.bloc[k] !== LIBRE) continue;
      const b = ajouterBat(B, j, 'mur', cx * CEL + 1, cz * CEL + 1, true); b.dir = a + Math.PI / 2; segs.push(b);
    }
    const px = c.x + Math.cos(ap) * rayon, pz = c.z + Math.sin(ap) * rayon;
    if (posLibre(B, px, pz, 1)) ajouterBat(B, j, 'porte', px, pz, true).dir = ap + Math.PI / 2;
    for (let k = 0; k < 4; k++) { const a = ap + Math.PI / 4 + k * Math.PI / 2, x = c.x + Math.cos(a) * (rayon - 6), z = c.z + Math.sin(a) * (rayon - 6); if (posLibre(B, x, z, 1)) ajouterBat(B, j, 'tour', x, z, true); }
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, cc = caseLibreProche(B, Math.floor((c.x + Math.cos(a) * 11) / CEL), Math.floor((c.z + Math.sin(a) * 11) / CEL), 0, 0); if (cc) ajouterUnite(B, j, k % 3 ? 'inf' : 'archer', cc[0] * CEL + 1, cc[1] * CEL + 1); }
    void segs;
  }
  // vagues d'assaillants : elles partent du camp ennemi et marchent sur la cité du joueur
  function vagues(B) {
    const M = B.mission;
    for (const v of M.vagues) {
      if (v.fait || B.temps < v.t) continue; v.fait = true;
      const J = B.joueurs[v.j]; if (!J || J.vaincu) continue;
      const src = B.bats.find(b => !b.mort && b.j === v.j && b.cle === 'centre') || { x: B.carte.departs[v.j][0], z: B.carte.departs[v.j][1] };
      const cible = B.bats.find(b => !b.mort && b.j === B.joueur && b.cle === 'centre') || B.bats.find(b => !b.mort && b.j === B.joueur); if (!cible) continue;
      const ids = [];
      for (const [cle, n] of v.unites) for (let k = 0; k < n; k++) { const a = B.rnd() * 6.28, c = caseLibreProche(B, Math.floor((src.x + Math.cos(a) * 12) / CEL), Math.floor((src.z + Math.sin(a) * 12) / CEL), 0, 0); if (c) { const u = ajouterUnite(B, v.j, cle, c[0] * CEL + 1, c[1] * CEL + 1); if (u) ids.push(u.id); } }
      BT.ordreContexte(B, v.j, ids, cible.x, cible.z, null, true);
      B.evts.push({ type: 'vague', j: v.j, n: ids.length, x: src.x, z: src.z });
      majPop(B);
    }
  }
  function verifierMission(B) {
    const M = B.mission, ji = B.joueur, J = B.joueurs[ji]; if (B.fin) return;
    const mes = B.unites.filter(u => !u.mort && u.j === ji), bats = B.bats.filter(b => !b.mort && b.j === ji);
    for (const o of M.objectifs) {
      if (o.fait) continue;
      let ok = false;
      if (o.type === 'villageois') ok = mes.filter(u => u.cle === 'villageois').length >= o.n;
      else if (o.type === 'construire') ok = bats.filter(b => b.cle === o.cle && b.fini).length >= o.n;
      else if (o.type === 'age') ok = J.age >= o.age;
      else if (o.type === 'armee') ok = mes.filter(u => !recolteur(u)).reduce((s, u) => s + u.s.pop, 0) >= o.n;
      else if (o.type === 'navires') ok = mes.filter(u => u.cle === 'navire').length >= o.n;
      else if (o.type === 'survivre') ok = B.temps >= o.duree && bats.some(b => b.cle === 'centre');
      else if (o.type === 'detruireBat') ok = !B.bats.some(b => !b.mort && b.j === o.j && b.cle === o.cle);
      else if (o.type === 'vaincre') ok = B.joueurs.every(x => !ennemis(B, ji, x.id) || x.vaincu);
      else if (o.type === 'merveille') { const m = bats.find(b => b.cle === 'merveille' && b.fini); o.progres = m ? Math.min(1, (m.garde || 0) / (B.gardeMerveille || R.GARDE_MERVEILLE)) : 0; ok = o.progres >= 1; }
      if (ok) { o.fait = true; B.evts.push({ type: 'objectif', texte: o.texte }); }
    }
    if (M.objectifs.every(o => o.fait) && !J.vaincu) B.fin = { gagnant: J.equipe, raison: 'mission', temps: B.temps };
  }
  BT.verifierMission = verifierMission;

  // ---------- enregistrement ----------
  // la carte se recrée depuis sa graine ; on garde les entités, les ressources entamées, les joueurs et la mission
  const CHAMPS_U = ['id', 'cle', 'j', 'x', 'z', 'dir', 'pv', 'pvMax', 'ordre', 'porte', 'invoque', 'gele', 'lent', 'cd', 'mort', 'tNe'];
  const CHAMPS_B = ['id', 'cle', 'j', 'x', 'z', 'pv', 'pvMax', 'fini', 'prog', 'file', 'rally', 'invuln', 'garde', 'occupant', 'payé', 'dir', 'cd', 'tNe', 'mort'];
  const garder = (e, l) => { const o = {}; for (const k of l) if (e[k] !== undefined) o[k] = e[k]; return o; };
  BT.sauver = function (B) {
    const res = {}; for (const r of B.res) if (r.qte !== r.qteMax || r.animal) res[r.id] = [Math.round(r.qte * 10) / 10, r.animal ? +r.x.toFixed(2) : 0, r.animal ? +r.z.toFixed(2) : 0, r.animal ? (r.vivant ? 1 : 0) : 0];
    const vivants = new Set(B.res.map(r => r.id));
    return { version: 2, date: Date.now(), opts: B.opts, temps: B.temps, prochain: B.prochain, joueur: B.joueur, vitesse: B.vitesse, fin: B.fin, treveFinie: !!B.treveFinie, mission: B.mission || null,
      joueurs: B.joueurs.map(J => { const o = {}; for (const k in J) if (!['vis', 'connu', 'cacheStats'].includes(k)) o[k] = J[k]; o.connu = Array.from(J.connu).join(''); return o; }),
      unites: B.unites.filter(u => !u.mort).map(u => { const o = garder(u, CHAMPS_U); if (o.ordre) o.ordre = Object.assign({}, o.ordre); return o; }),
      bats: B.bats.filter(b => !b.mort && !b.retire).map(b => garder(b, CHAMPS_B)),
      res, disparus: [...(B.idsRes || [])].filter(id => !vivants.has(id)),
      proj: B.proj, effets: B.effets.map(f => Object.assign({}, f, { d: undefined })) };
  };
  BT.charger = function (S) {
    const B = BT.nouvelle(S.opts);
    // terrain d'origine, puis ressources entamées, bâtiments et unités enregistrés
    B.bloc.set(B.blocTerrain); B.occ.fill(0);
    const disparus = new Set(S.disparus || []);
    B.res = B.res.filter(r => !disparus.has(r.id));
    for (const r of B.res) { const m = S.res[r.id]; if (m) { r.qte = m[0]; if (r.animal) { r.x = m[1]; r.z = m[2]; r.vivant = !!m[3]; } } }
    B.res = B.res.filter(r => r.qte > 0);
    B.parId = new Map(); for (const r of B.res) { B.parId.set(r.id, r); const d = RES[r.sous]; if (d.bloc) marquer(B, r, d.bloc === 2 ? 1 : 0, RESS); }
    B.unites = []; B.bats = [];
    for (const o of S.bats) { const d = R.BATIMENTS[o.cle], demi = Math.floor(d.taille / CEL / 2); const b = Object.assign({ sorte: 'b', taille: d.taille, d, file: [], bx: o.x, bz: o.z, demiE: (demi + 0.5) * CEL }, o); B.bats.push(b); B.parId.set(b.id, b); marquer(B, b, demi, d.passable ? CHAMP : d.porte ? PORTE : BAT); }
    Object.assign(B, { temps: S.temps, prochain: S.prochain, joueur: S.joueur, vitesse: S.vitesse || 1, fin: S.fin, treveFinie: S.treveFinie, mission: S.mission, proj: S.proj || [] });
    B.joueurs = S.joueurs.map((o, i) => { const J = Object.assign({}, o); J.connu = Uint8Array.from(String(o.connu), c => +c); J.vis = new Uint8Array(B.mv * B.mv); J.cacheStats = {}; return J; });
    for (const o of S.unites) { const s = BT.stats(B, o.j, o.cle); if (!s) continue; const u = Object.assign({ sorte: 'u', s, chemin: null, ci: 0, anim: 'repos', cd: 0 }, o); B.unites.push(u); B.parId.set(u.id, u); }
    B.effets = (S.effets || []).map(f => Object.assign(f, { d: f.type === 'zone' ? R.POUVOIRS[f.id] : undefined })).filter(f => f.type !== 'zone' || f.d);
    B.versionGrille++; majPop(B); majBrouillard(B);
    return B;
  };
})(typeof window !== 'undefined' ? window : globalThis);
