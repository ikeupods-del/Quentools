'use strict';
/* Aube des Nations — moteur du jeu (sans affichage, testable dans Node).
   G = état complet de la partie (sauvegardé tel quel), VOIS / OCC / VIL = index recalculés. */

let G = null;
let VOIS = null;   // voisins : VOIS[i * 6 + k]
let OCC = null;    // OCC[i] = unités présentes sur la tuile i
let VIL = null;    // VIL[i] = ville sur la tuile i
const INF = 1e9;

/* ---------- Outils ---------- */
function rng() {
  let t = (G.alea = (G.alea + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const dist = (a, b) => distHex(a, b, G.W);
const rayon = (i, R) => tuilesRayon(i, R, G.W, G.H);
function voisins(i) { const r = []; for (let k = 0; k < 6; k++) { const j = VOIS[i * 6 + k]; if (j >= 0) r.push(j); } return r; }
const estEau = i => !!TERRAINS[G.tuiles[i].t].eau;
const estMil = u => UNITES[u.type].classe !== 'civil';
const villesDe = n => G.villes.filter(v => v.civ === n);
const unitesDe = n => G.unites.filter(u => u.civ === n);
const aTech = (c, id) => !id || !!c.techs[id];

class Tas {
  constructor() { this.k = []; this.v = []; this.dk = 0; }
  get taille() { return this.k.length; }
  push(k, v) {
    const K = this.k, V = this.v; let i = K.length; K.push(k); V.push(v);
    while (i > 0) { const p = (i - 1) >> 1; if (K[p] <= k) break; K[i] = K[p]; V[i] = V[p]; i = p; }
    K[i] = k; V[i] = v;
  }
  pop() {
    const K = this.k, V = this.v, k0 = K[0], v0 = V[0], lk = K.pop(), lv = V.pop(), n = K.length;
    if (n) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i, mk = lk;
        if (l < n && K[l] < mk) { m = l; mk = K[l]; }
        if (r < n && K[r] < mk) { m = r; }
        if (m === i) break;
        K[i] = K[m]; V[i] = V[m]; i = m;
      }
      K[i] = lk; V[i] = lv;
    }
    this.dk = k0; return v0;
  }
}

/* ---------- Création de partie ---------- */
function nouvelleCiv(def, n, humain) {
  const N = G.W * G.H;
  return {
    n, id: def.id, nom: def.nom, couleur: def.couleur, ia: !humain, barbare: def.id === 'barbares',
    bonus: Object.assign({}, def.bonus || {}), or: 0, sci: 0, cult: 0, rech: null, but: null, techs: {},
    doc: {}, nbDoc: 0, guerre: {}, paixTour: {}, met: {}, elimine: false, villesFondees: 0, bonheur: 0, score: 0,
    perso: { guerre: 0.3 + Math.random() * 0.7, science: Math.random(), merveilles: Math.random(), expansion: 0.5 + Math.random() * 0.5 },
    vu: new Uint8Array(N), vis: new Uint8Array(N),
  };
}

function nouvellePartie(o = {}) {
  const taille = TAILLES[o.taille] || TAILLES.normale;
  const type = TYPES_CARTE[o.type] ? o.type : 'continents';
  const graine = o.graine ?? Math.floor(Math.random() * 1e9);
  const alea = creerAlea(graine);
  const nbCivs = Math.min(CIVS.length, o.nbCivs || taille.civs);
  const moi = CIVS.find(c => c.id === o.civ) || CIVS[0];
  const autres = CIVS.filter(c => c !== moi);
  for (let i = autres.length - 1; i > 0; i--) { const j = Math.floor(alea() * (i + 1)); [autres[i], autres[j]] = [autres[j], autres[i]]; }
  const choix = [moi, ...autres].slice(0, nbCivs);
  const { tuiles, departs } = genererCarte(taille.W, taille.H, type, nbCivs, alea);
  const vit = VITESSES[o.vitesse] || VITESSES.normale;
  G = {
    v: 1, graine, alea: Math.floor(alea() * 2147483647), W: taille.W, H: taille.H, tour: 1,
    opts: { taille: o.taille || 'normale', type, difficulte: DIFFICULTES[o.difficulte] ? o.difficulte : 'normal', vitesse: o.vitesse || 'normale' },
    vit: vit.cout, toursMax: vit.tours, tuiles, civs: [], unites: [], villes: [], prochainId: 1,
    merveillesBaties: {}, nomsPris: {}, journal: [], popups: [], fin: null, joueur: o.tousIA ? -1 : 0,
  };
  choix.forEach((d, k) => G.civs.push(nouvelleCiv(d, k, k === 0 && !o.tousIA)));
  const b = nouvelleCiv(BARBARES, G.civs.length, false);
  G.civs.push(b); G.barb = b.n;
  reindexer();
  G.civs.forEach((c, k) => {
    if (c.barbare) return;
    const d = departs[k];
    creerUnite('colon', k, d);
    const autour = voisins(d).filter(j => !estEau(j) && G.tuiles[j].rel < 2);
    creerUnite('guerrier', k, autour[0] ?? d);
    creerUnite('eclaireur', k, autour[1] ?? autour[0] ?? d);
    if (c.ia && DIFFICULTES[G.opts.difficulte].renfort) { creerUnite('ouvrier', k, d); creerUnite('guerrier', k, autour[2] ?? d); }
  });
  G.civs.forEach(c => debutTourCiv(c));
  if (G.joueur >= 0) G.popups.push({ type: 'bienvenue' });
  return G;
}

function reindexer() {
  const N = G.W * G.H;
  VOIS = tableVoisins(G.W, G.H);
  OCC = Array.from({ length: N }, () => []);
  VIL = new Array(N).fill(null);
  for (const u of G.unites) OCC[u.i].push(u);
  for (const v of G.villes) VIL[v.i] = v;
  for (const c of G.civs) { c._eff = null; if (!c.vis) c.vis = new Uint8Array(N); }
}

/* ---------- Effets cumulés (nation + doctrines + merveilles) ---------- */
function eff(c) {
  if (c._eff) return c._eff;
  const e = {};
  const ajouter = o => { for (const k in o) { const v = o[k]; e[k] = typeof v === 'number' ? (e[k] || 0) + v : v; } };
  ajouter(c.bonus || {});
  for (const d of DOCTRINES) { const k = c.doc[d.id] || 0; for (let x = 0; x < k; x++) ajouter(d.liste[x].e); }
  for (const v of G.villes) if (v.civ === c.n) for (const b in v.bat) if (MERVEILLES[b] && MERVEILLES[b].glob) ajouter(MERVEILLES[b].glob);
  c._eff = e;
  return e;
}
const invalider = c => { if (c) c._eff = null; };

/* ---------- Notifications ---------- */
function notif(n, txt, i, ton) {
  if (n !== G.joueur) return;
  G.nJ = (G.nJ || 0) + 1;
  G.journal.push({ id: G.nJ, tour: G.tour, txt, i: i ?? null, ton: ton || 'info' });
  if (G.journal.length > 80) G.journal.shift();
}
function popup(n, p) { if (n === G.joueur) G.popups.push(p); }

/* ---------- Technologies ---------- */
const techDispo = (c, id) => !c.techs[id] && TECHS[id].req.every(r => c.techs[r]);
const coutTech = (c, id) => Math.round(TECHS[id].cout * G.vit * (G.opts.taille === 'grande' ? 1.1 : G.opts.taille === 'petite' ? 0.9 : 1));
const resVisible = (c, res) => !c || aTech(c, RESSOURCES[res].tech);
function ereCiv(c) { let e = 0; for (const id in c.techs) e = Math.max(e, TECHS[id].ere); return e; }

function prochaineVers(c, but) {
  if (!but || c.techs[but]) return null;
  if (techDispo(c, but)) return but;
  const manque = new Set(), pile = [but];
  while (pile.length) { const t = pile.pop(); if (c.techs[t] || manque.has(t)) continue; manque.add(t); pile.push(...TECHS[t].req); }
  let mieux = null;
  for (const t of manque) if (techDispo(c, t) && (!mieux || TECHS[t].rang < TECHS[mieux].rang)) mieux = t;
  return mieux;
}
function choisirRecherche(c, id) {
  if (!TECHS[id] || c.techs[id]) return;
  c.but = id; c.rech = prochaineVers(c, id);
}
function obtenirTech(c, id) {
  if (c.techs[id]) return;
  c.techs[id] = G.tour;
  if (c.rech === id) c.rech = null;
  notif(c.n, `Découverte : ${TECHS[id].nom}`, null, 'tech');
  if (id === 'bronze' || id === 'industrialisation') majVision(c);
}
function techGratuite(c) {
  const t = (c.rech && techDispo(c, c.rech)) ? c.rech : Object.keys(TECHS).filter(id => techDispo(c, id)).sort((a, b) => TECHS[a].rang - TECHS[b].rang)[0];
  if (t) obtenirTech(c, t);
}
function avancerRecherche(c) {
  for (let garde = 0; garde < 6; garde++) {
    if (!c.rech || c.techs[c.rech]) {
      c.rech = c.but && !c.techs[c.but] ? prochaineVers(c, c.but) : null;
      if (!c.rech && c.ia && typeof iaRecherche === 'function') c.rech = iaRecherche(c);
    }
    if (!c.rech) { if (!c.ia && Object.keys(TECHS).some(id => techDispo(c, id))) popup(c.n, { type: 'tech' }); return; }
    const cout = coutTech(c, c.rech);
    if (c.sci < cout) return;
    c.sci -= cout;
    obtenirTech(c, c.rech);
  }
}

/* ---------- Unités ---------- */
function mvMax(u) {
  const U = UNITES[u.type];
  return (U.mv + (U.classe === 'mer' ? (eff(G.civs[u.civ]).mvMer || 0) : 0)) * 3;
}
function creerUnite(type, n, i) {
  const U = UNITES[type], c = G.civs[n];
  const u = { id: G.prochainId++, type, civ: n, i, pv: 100, mv: 0, fort: 0, xp: 0, niv: 0, ch: 0, ordre: null, att: false, bouge: false };
  if (U.charges) u.ch = U.charges + (eff(c).charges || 0);
  G.unites.push(u); OCC[i].push(u);
  return u;
}
function placer(u, j) {
  const o = OCC[u.i], k = o.indexOf(u);
  if (k >= 0) o.splice(k, 1);
  OCC[j].push(u); u.i = j;
}
function tuer(u) {
  const o = OCC[u.i], k = o.indexOf(u);
  if (k >= 0) o.splice(k, 1);
  const g = G.unites.indexOf(u);
  if (g >= 0) G.unites.splice(g, 1);
  u.mort = true;
}
const estEmbarque = u => UNITES[u.type].classe === 'terre' && estEau(u.i);
function placeLibre(u, j, mil) {
  const m = mil ?? estMil(u);
  return OCC[j].every(x => x === u || (x.civ === u.civ && estMil(x) !== m));
}
function peutEmbarquer(c, profond) {
  if (c.barbare) return false;
  if (profond) return aTech(c, 'astronomie');
  return !!eff(c).embarque || aTech(c, 'voile');
}
function niveauXP(xp) { return xp >= 100 ? 4 : xp >= 65 ? 3 : xp >= 35 ? 2 : xp >= 15 ? 1 : 0; }
function gagnerXP(u, x) {
  if (u.mort) return;
  const c = G.civs[u.civ];
  u.xp += Math.round(x * (1 + (eff(c).xp || 0) / 100));
  const niv = niveauXP(u.xp);
  if (niv > u.niv) { u.niv = niv; u.pv = Math.min(100, u.pv + 30); notif(u.civ, `${UNITES[u.type].nom} passe au grade ${niv} (+${niv * 5} force)`, u.i, 'bon'); }
}

/* Coût d'entrée dans une tuile, en tiers de déplacement. 99 = tous les déplacements restants. */
function coutPas(u, a, b) {
  const U = UNITES[u.type], t = G.tuiles[b], c = G.civs[u.civ], ter = TERRAINS[t.t];
  if (t.prop >= 0 && t.prop !== u.civ && !c.barbare && !enGuerre(u.civ, t.prop)) return INF;
  if (U.classe === 'mer') {
    if (!ter.eau) { const v = VIL[b]; return v && v.civ === u.civ ? 3 : INF; }
    if (U.cotier && ter.profond) return INF;
    return 3;
  }
  if (t.rel === 2) return INF;
  const eauA = TERRAINS[G.tuiles[a].t].eau;
  if (ter.eau) {
    if (!peutEmbarquer(c, ter.profond)) return INF;
    return eauA ? 3 : 99;
  }
  if (eauA) return 99;
  if (t.rt && G.tuiles[a].rt && aTech(c, 'roue')) return 1;
  if (t.rel === 1 || t.cv) return 6;
  return 3;
}

/* Exploration des chemins (Dijkstra) : clé = tour * 100 + déplacements consommés. */
function explorer(u, opts = {}) {
  const N = G.W * G.H, max = mvMax(u), tourMax = opts.tourMax ?? 40;
  const best = new Float64Array(N).fill(INF), prev = new Int32Array(N).fill(-1), rem = new Int16Array(N);
  const tas = new Tas(), r0 = Math.min(u.mv, max);
  best[u.i] = max - r0; rem[u.i] = r0; tas.push(best[u.i], u.i);
  while (tas.taille) {
    const i = tas.pop(), k = tas.dk;
    if (k > best[i]) continue;
    if (i === opts.stop) break;
    if (i !== u.i && i === opts.cible) continue;
    const tour = Math.floor(k / 100), r = rem[i];
    for (let d = 0; d < 6; d++) {
      const j = VOIS[i * 6 + d];
      if (j < 0) continue;
      const c = coutPas(u, i, j);
      if (c >= INF) continue;
      if (j !== opts.cible) {
        const o = OCC[j];
        if (o.length && o.some(x => x.civ !== u.civ)) continue;
        const v = VIL[j];
        if (v && v.civ !== u.civ) continue;
      }
      let nt = tour, nr = r;
      if (nr <= 0) { nt++; nr = max; }
      nr = Math.max(0, nr - c);
      if (nt > tourMax) continue;
      const nk = nt * 100 + (max - nr);
      if (nk < best[j]) { best[j] = nk; prev[j] = i; rem[j] = nr; tas.push(nk, j); }
    }
  }
  return { best, prev, depart: u.i };
}
function chemin(res, dest) {
  if (res.best[dest] >= INF) return null;
  const ch = [];
  for (let i = dest; i !== res.depart && i >= 0; i = res.prev[i]) ch.push(i);
  return ch.reverse();
}
const toursPour = (res, j) => (res.best[j] >= INF ? INF : Math.floor(res.best[j] / 100));

function entrerTuile(u, j) {
  const t = G.tuiles[j], c = G.civs[u.civ];
  if (c.barbare) return;
  if (t.hutte) recompenseHutte(c, u, j);
  if (t.camp && estMil(u)) detruireCamp(j, c);
}

/* Déplacement le long du meilleur chemin. Renvoie la liste des tuiles parcourues, ou null si impossible. */
function deplacer(u, dest, attaque) {
  if (u.mort) return null;
  if (dest === u.i) return [];
  const res = explorer(u, { stop: dest, cible: dest });
  const ch = chemin(res, dest);
  if (!ch) { if (u.ordre && u.ordre.but !== undefined) u.ordre = null; return null; }
  const pas = [];
  for (const j of ch) {
    if (u.mv <= 0) break;
    if (j === dest && attaque) break;
    const c = coutPas(u, u.i, j);
    if (c >= INF) break;
    if (OCC[j].some(x => x.civ !== u.civ) || (VIL[j] && VIL[j].civ !== u.civ)) break;
    const apres = Math.max(0, u.mv - c);
    const pris = OCC[j].some(x => x !== u && estMil(x) === estMil(u));
    if (pris && (j === dest || apres === 0)) break;
    u.mv = apres; placer(u, j); pas.push(j);
    u.bouge = true; u.fort = 0;
    entrerTuile(u, j);
  }
  if (pas.length) majVision(G.civs[u.civ]);
  if (u.ordre !== 'auto' && u.ordre !== 'explo') u.ordre = (!attaque && u.i !== dest) ? { but: dest } : null;
  return pas;
}

function recompenseHutte(c, u, j) {
  const t = G.tuiles[j];
  t.hutte = false;
  const x = rng();
  if (x < 0.34) {
    const g = 25 + Math.floor(rng() * 40);
    c.or += g; notif(c.n, `Une tribu vous offre ${g} pièces d’or`, j, 'bon');
  } else if (x < 0.5) {
    const dispo = Object.keys(TECHS).filter(id => techDispo(c, id) && TECHS[id].ere === 0);
    if (dispo.length) { const id = dispo[Math.floor(rng() * dispo.length)]; obtenirTech(c, id); notif(c.n, `Des sages vous enseignent : ${TECHS[id].nom}`, j, 'bon'); }
    else { c.or += 40; notif(c.n, 'Une tribu vous offre 40 pièces d’or', j, 'bon'); }
  } else if (x < 0.68) {
    const type = rng() < 0.5 ? 'guerrier' : 'ouvrier';
    const place = [j, ...voisins(j)].find(k => !estEau(k) && G.tuiles[k].rel < 2 && placeLibre({ civ: c.n, type }, k, type !== 'ouvrier'));
    if (place !== undefined) { creerUnite(type, c.n, place); notif(c.n, `Des volontaires rejoignent votre peuple : ${UNITES[type].nom}`, j, 'bon'); }
    else { c.or += 30; notif(c.n, 'Une tribu vous offre 30 pièces d’or', j, 'bon'); }
  } else if (x < 0.84) {
    for (const k of rayon(j, 7)) c.vu[k] = 1;
    notif(c.n, 'Des éclaireurs locaux vous dessinent une carte des environs', j, 'bon');
  } else {
    const v = villesDe(c.n).sort((a, b) => dist(a.i, j) - dist(b.i, j))[0];
    if (v && dist(v.i, j) <= 12) { v.pop++; assignerTuiles(v); notif(c.n, `Des familles s’installent à ${v.nom} (+1 population)`, v.i, 'bon'); }
    else { c.or += 35; notif(c.n, 'Une tribu vous offre 35 pièces d’or', j, 'bon'); }
  }
}
function detruireCamp(j, c) {
  G.tuiles[j].camp = false;
  c.or += 25;
  notif(c.n, 'Camp barbare détruit : 25 pièces d’or de butin', j, 'bon');
}

/* ---------- Diplomatie ---------- */
function enGuerre(a, b) {
  if (a === b) return false;
  const A = G.civs[a], B = G.civs[b];
  return A.barbare || B.barbare || !!A.guerre[b];
}
function rencontrer(a, b) {
  if (a === b || a.met[b.n] !== undefined || a.barbare || b.barbare) return;
  a.met[b.n] = G.tour; b.met[a.n] = G.tour;
  if (a.n === G.joueur) notif(a.n, `Vous rencontrez les ${b.nom}`, null, 'diplo');
  if (b.n === G.joueur) notif(b.n, `Vous rencontrez les ${a.nom}`, null, 'diplo');
}
function declarerGuerre(a, b) {
  const A = G.civs[a], B = G.civs[b];
  if (A.guerre[b] || A.barbare || B.barbare || a === b) return;
  A.guerre[b] = G.tour; B.guerre[a] = G.tour;
  rencontrer(A, B);
  notif(b, `Les ${A.nom} vous déclarent la guerre !`, null, 'mal');
  popup(b, { type: 'guerre', civ: a });
  if (a === G.joueur) notif(a, `Vous êtes en guerre contre les ${B.nom}`, null, 'mal');
  for (const c of G.civs) if (c.n !== a && c.n !== b && c.n === G.joueur && c.met[a] !== undefined) notif(c.n, `Les ${A.nom} déclarent la guerre aux ${B.nom}`, null, 'diplo');
}
function faireLaPaix(a, b) {
  const A = G.civs[a], B = G.civs[b];
  if (!A.guerre[b]) return;
  delete A.guerre[b]; delete B.guerre[a];
  A.paixTour[b] = G.tour; B.paixTour[a] = G.tour;
  expulser(a, b); expulser(b, a);
  notif(a, `Paix signée avec les ${B.nom}`, null, 'diplo');
  notif(b, `Paix signée avec les ${A.nom}`, null, 'diplo');
}
/* Les unités de a présentes chez b sont ramenées hors de ses frontières. */
function expulser(a, b) {
  for (const u of unitesDe(a)) {
    if (G.tuiles[u.i].prop !== b) continue;
    const vus = new Set([u.i]), file = [u.i];
    let dest = -1;
    for (let q = 0; q < file.length && q < 600; q++) {
      for (const j of voisins(file[q])) {
        if (vus.has(j)) continue; vus.add(j); file.push(j);
        const t = G.tuiles[j], eau = estEau(j), U = UNITES[u.type];
        if (t.prop === b || t.rel === 2 || VIL[j] && VIL[j].civ !== a) continue;
        if ((U.classe === 'mer') !== eau) continue;
        if (!placeLibre(u, j)) continue;
        dest = j; break;
      }
      if (dest >= 0) break;
    }
    if (dest >= 0) placer(u, dest); else tuer(u);
  }
}
function puissance(n) {
  let p = 0;
  for (const u of G.unites) if (u.civ === n && estMil(u)) { const U = UNITES[u.type]; p += Math.max(U.f || 0, U.t || 0) * (0.5 + u.pv / 200); }
  for (const v of G.villes) if (v.civ === n) p += forceVille(v) * 0.5;
  return Math.round(p);
}

/* ---------- Combat ---------- */
const degats = d => 30 * Math.exp(0.04 * d);
const malusPV = u => Math.round((100 - u.pv) / 10);
function bonusTerrain(i) { const t = G.tuiles[i]; return (t.rel === 1 ? 3 : 0) + (t.cv ? COUVERTS[t.cv].def : 0); }
function forceDefense(d, a) {
  const U = UNITES[d.type], c = G.civs[d.civ];
  if (estEmbarque(d)) return Math.max(6, Math.round((U.f || 1) * 0.4));
  let f = (U.f || 1) + d.niv * 5 + (eff(c).force || 0) - malusPV(d);
  if (U.classe === 'terre') f += bonusTerrain(d.i);
  if (d.ordre === 'fort' && d.fort >= 1) f += 4;
  if (a && U.antiCav && UNITES[a.type].cav) f += U.antiCav;
  if (c.bonheur <= -10) f -= 3;
  return Math.max(1, f);
}
function forceAttaque(a, cible, distance) {
  const U = UNITES[a.type], c = G.civs[a.civ];
  let f = (distance ? U.t : U.f) + a.niv * 5 + (eff(c).force || 0) - malusPV(a);
  if (cible.u) {
    if (!distance) for (const j of voisins(cible.u.i)) for (const x of OCC[j]) if (x !== a && x.civ === a.civ && estMil(x)) f += 2;
    if (U.antiCav && UNITES[cible.u.type].cav) f += U.antiCav;
    if (G.civs[cible.u.civ].barbare && !c.ia) f += 3;
  }
  if (c.bonheur <= -10) f -= 3;
  return Math.max(1, f);
}
function forceVille(v) {
  const c = G.civs[v.civ];
  let meilleur = 15;
  for (const id in UNITES) { const U = UNITES[id]; if (U.classe === 'terre' && !U.t && U.f && aTech(c, U.tech)) meilleur = Math.max(meilleur, U.f); }
  let f = meilleur * 0.7 + v.pop * 0.8 + (eff(c).defVille || 0);
  for (const b in v.bat) f += (BATIMENTS[b] && BATIMENTS[b].def) || 0;
  if (G.tuiles[v.i].rel === 1) f += 3;
  const g = OCC[v.i].find(estMil);
  if (g && g.civ === v.civ) f += (UNITES[g.type].f || 0) * 0.25;
  return Math.round(f);
}
function pvMaxVille(v) { let p = 200; for (const b in v.bat) p += (BATIMENTS[b] && BATIMENTS[b].pv) || 0; return p; }

/* Prévision d'une attaque de l'unité a sur la tuile i (sans hasard). null = impossible. */
function prevision(a, i) {
  const U = UNITES[a.type];
  if (U.classe === 'civil' || a.mv <= 0 || a.att || a.mort || estEmbarque(a)) return null;
  const d = dist(a.i, i), distance = !!U.t;
  if (distance ? (d < 1 || d > U.portee) : d !== 1) return null;
  const t = G.tuiles[i], v = VIL[i], eau = TERRAINS[t.t].eau;
  if (!distance) {
    if (U.classe === 'terre' && eau) return null;
    if (U.classe === 'mer' && !eau && !v) return null;
  }
  if (v && v.civ !== a.civ) {
    if (!enGuerre(a.civ, v.civ)) return null;
    const fA = forceAttaque(a, { v }, distance), fD = forceVille(v);
    const mult = U.siege ? 1.5 : distance ? 0.5 : (v.bat.remparts ? 0.6 : 1);
    const dD = Math.round(degats(fA - fD) * mult), dA = distance ? 0 : Math.round(degats(fD - fA));
    return { type: 'ville', v, fA, fD, dD, dA, distance, prise: !distance && U.classe === 'terre' && dD >= v.pv && !G.civs[a.civ].barbare };
  }
  const occ = OCC[i].filter(x => x.civ !== a.civ);
  if (!occ.length) return (t.camp && !distance && U.classe === 'terre') ? { type: 'camp' } : null;
  if (!enGuerre(a.civ, occ[0].civ)) return null;
  const def = occ.find(estMil);
  if (!def) return distance ? null : { type: 'capture', cibles: occ };
  const fA = forceAttaque(a, { u: def }, distance), fD = forceDefense(def, a);
  return { type: 'unite', def, fA, fD, dD: Math.round(degats(fA - fD)), dA: distance ? 0 : Math.round(degats(fD - fA)), distance };
}

function capturerCivils(a, i) {
  const c = G.civs[a.civ];
  for (const x of OCC[i].filter(x => x.civ !== a.civ)) {
    if (c.barbare || estMil(x)) { tuer(x); continue; }
    notif(x.civ, `${UNITES[x.type].nom} capturé par les ${c.nom}`, i, 'mal');
    x.civ = a.civ; x.ordre = null; x.mv = 0;
    if (x.type === 'colon') { x.type = 'ouvrier'; x.ch = 2; }
  }
}

function attaquer(a, i) {
  const p = prevision(a, i);
  if (!p) return null;
  const c = G.civs[a.civ];
  const r1 = 0.85 + rng() * 0.3, r2 = 0.85 + rng() * 0.3;
  const res = { type: p.type, i, de: a.i, dD: 0, dA: 0, distance: p.distance };
  a.mv = 0; a.att = true; a.fort = 0; a.ordre = null;
  if (p.type === 'camp') { detruireCamp(i, c); placer(a, i); majVision(c); return res; }
  if (p.type === 'capture') {
    const victimes = OCC[i].filter(x => x.civ !== a.civ).map(x => x.civ);
    capturerCivils(a, i); placer(a, i); majVision(c);
    for (const n of new Set(victimes)) verifierElimination(G.civs[n]);
    return res;
  }
  if (p.type === 'ville') {
    const v = p.v, ancien = v.civ;
    res.dD = Math.round(p.dD * r1);
    v.pv = Math.max(0, v.pv - res.dD);
    if (!p.distance) { res.dA = Math.round(p.dA * r2); a.pv -= res.dA; }
    gagnerXP(a, p.distance ? 3 : 5);
    if (a.pv <= 0) { tuer(a); res.mortA = true; notif(a.civ, `${UNITES[a.type].nom} tué devant ${v.nom}`, i, 'mal'); }
    else if (v.pv <= 0 && !p.distance && UNITES[a.type].classe === 'terre') {
      if (c.barbare) {
        v.pv = 1; const pris = Math.min(G.civs[ancien].or, 30 + v.pop * 5); G.civs[ancien].or -= pris;
        notif(ancien, `Des barbares pillent ${v.nom} (−${pris} or)`, v.i, 'mal');
      } else { capturer(v, a.civ); placer(a, v.i); res.prise = true; }
    }
    if (!res.prise && !res.mortA) notif(ancien, `${v.nom} est attaquée (−${res.dD} PV)`, v.i, 'mal');
  } else if (p.type === 'unite') {
    const d = p.def;
    res.dD = Math.round(p.dD * r1); d.pv -= res.dD;
    if (!p.distance) { res.dA = Math.round(p.dA * r2); a.pv -= res.dA; }
    gagnerXP(a, p.distance ? 3 : 5);
    if (d.pv > 0) gagnerXP(d, 4);
    if (d.pv <= 0) {
      tuer(d); res.mortD = true;
      notif(d.civ, `${UNITES[d.type].nom} détruit par les ${c.nom}`, i, 'mal');
      notif(a.civ, `${UNITES[d.type].nom} ennemi détruit`, i, 'bon');
      if (!p.distance && a.pv > 0) {
        const reste = OCC[i].filter(x => x.civ !== a.civ);
        const bonMilieu = UNITES[a.type].classe === 'mer' ? estEau(i) : !estEau(i);
        if (!reste.some(estMil) && bonMilieu && !VIL[i]) {
          capturerCivils(a, i); placer(a, i);
          if (G.tuiles[i].camp && !c.barbare) detruireCamp(i, c);
        }
      }
      verifierElimination(G.civs[d.civ]);
    }
    if (a.pv <= 0) { tuer(a); res.mortA = true; notif(a.civ, `${UNITES[a.type].nom} tué au combat`, i, 'mal'); }
  }
  majVision(c);
  if (typeof surCombat === 'function') surCombat(res);
  return res;
}

/* Tir de la ville sur une unité ennemie à 2 cases. */
function previsionTirVille(v, i) {
  if (v.aTire || v.pv <= 0 || dist(v.i, i) > 2 || i === v.i) return null;
  const def = OCC[i].find(x => estMil(x) && x.civ !== v.civ && enGuerre(v.civ, x.civ));
  if (!def) return null;
  const fA = forceVille(v) - (v.bat.remparts ? 0 : 5), fD = forceDefense(def, null);
  return { def, fA, fD, dD: Math.round(degats(fA - fD)) };
}
function tirVille(v, i) {
  const p = previsionTirVille(v, i);
  if (!p) return null;
  v.aTire = true;
  const dD = Math.round(p.dD * (0.85 + rng() * 0.3));
  p.def.pv -= dD;
  const res = { type: 'tir', i, de: v.i, dD, dA: 0, distance: true };
  if (p.def.pv <= 0) { tuer(p.def); res.mortD = true; notif(v.civ, `${v.nom} détruit un ${UNITES[p.def.type].nom} ennemi`, i, 'bon'); notif(p.def.civ, `${UNITES[p.def.type].nom} détruit par ${v.nom}`, i, 'mal'); verifierElimination(G.civs[p.def.civ]); }
  if (typeof surCombat === 'function') surCombat(res);
  return res;
}

/* ---------- Villes ---------- */
function peutFonder(u) {
  if (!u || u.type !== 'colon' || u.mv <= 0) return false;
  const t = G.tuiles[u.i];
  if (estEau(u.i) || t.rel === 2) return false;
  if (t.prop >= 0 && t.prop !== u.civ) return false;
  for (const v of G.villes) if (dist(v.i, u.i) <= 3) return false;
  return true;
}
function nomVille(c) {
  const def = CIVS.find(d => d.id === c.id);
  const libre = (def ? def.villes : []).find(n => !G.nomsPris[n]);
  if (libre) return libre;
  let k = 2, base = def ? def.villes[0] : c.nom;
  while (G.nomsPris[`Nouvelle ${base} ${k}`]) k++;
  return `Nouvelle ${base} ${k}`;
}
function fonder(u, nom) {
  if (!peutFonder(u)) return null;
  const c = G.civs[u.civ], t = G.tuiles[u.i], i = u.i;
  const v = {
    id: G.prochainId++, nom: nom || nomVille(c), civ: c.n, i, pop: 1, nour: 0, prod: 0, file: [], bat: {}, cult: 0, nbT: 0,
    pv: 200, aTire: false, focus: 'equilibre', trav: [], capOrig: -1, fondee: G.tour, fondateur: c.n,
  };
  G.nomsPris[v.nom] = true;
  if (!G.villes.some(x => x.civ === c.n && x.bat.palais)) v.bat.palais = true;
  if (c.villesFondees === 0) v.capOrig = c.n;
  if (eff(c).monument) v.bat.monument = true;
  c.villesFondees++;
  t.hutte = false; t.camp = false; t.cv = null; t.rt = true; t.am = null;
  G.villes.push(v); VIL[i] = v;
  tuer(u);
  t.prop = c.n; t.vp = v.id;
  for (const j of voisins(i)) { const x = G.tuiles[j]; if (x.prop < 0) { x.prop = c.n; x.vp = v.id; } }
  assignerTuiles(v);
  majVision(c);
  for (const d of G.civs) if (d.n !== c.n && d.vis[i]) majVision(d);
  notif(c.n, `${v.nom} est fondée`, i, 'bon');
  return v;
}

function rendTuile(i, v, c) {
  const t = G.tuiles[i], ter = TERRAINS[t.t];
  if (t.rel === 2) return { n: 0, p: 0, o: 0 };
  let n, p, o;
  if (t.cv) { const cv = COUVERTS[t.cv]; n = cv.n; p = cv.p; o = 0; } else { n = ter.n; p = ter.p; o = ter.o; }
  if (t.rel === 1) p += 1;
  if (t.res && resVisible(c, t.res)) { const r = RESSOURCES[t.res]; n += r.n || 0; p += r.p || 0; o += r.o || 0; }
  if (t.am) {
    const a = AMELIORATIONS[t.am]; n += a.n || 0; p += a.p || 0; o += a.o || 0;
    if (c) for (const b of BONUS_AMEL) if (b.amel === t.am && c.techs[b.tech]) { n += b.n || 0; p += b.p || 0; o += b.o || 0; }
  }
  if (ter.eau && v) { if (v.bat.phare) n += 1; if (v.bat.port) p += 1; }
  if (c && t.t === 'desert' && !t.cv && eff(c).desert) { n += 1; o += 1; }
  return { n, p, o };
}
const tuilesVille = v => rayon(v.i, 3).filter(j => j !== v.i && G.tuiles[j].vp === v.id);
function poidsFocus(v) {
  switch (v.focus) {
    case 'nourriture': return { n: 2.6, p: 0.8, o: 0.5, spec: 1.2 };
    case 'production': return { n: 1.1, p: 2.4, o: 0.5, spec: 1.3 };
    case 'or': return { n: 1.1, p: 0.8, o: 2.2, spec: 1.6 };
    default: return { n: v.pop < 5 ? 1.7 : 1.35, p: 1.25, o: 0.7, spec: 1.6 };
  }
}
function assignerTuiles(v) {
  const c = G.civs[v.civ], w = poidsFocus(v);
  const occupe = new Set();
  for (const x of G.villes) if (x !== v) for (const j of x.trav) occupe.add(j);
  const sc = [];
  for (const j of tuilesVille(v)) {
    if (occupe.has(j) || OCC[j].some(x => enGuerre(x.civ, v.civ))) continue;
    const r = rendTuile(j, v, c);
    sc.push({ j, s: r.n * w.n + r.p * w.p + r.o * w.o, n: r.n });
  }
  sc.sort((a, b) => b.s - a.s);
  const trav = [];
  let nour = Math.max(2, rendTuile(v.i, v, c).n) - v.pop * 2;
  for (const x of sc) {
    if (trav.length >= v.pop) break;
    if (x.s < w.spec * 2 && nour >= 0) break;
    trav.push(x.j); nour += x.n;
  }
  /* Ne pas affamer la ville : remplacer la pire tuile par une tuile plus nourrissante si possible. */
  v.trav = trav;
}
function bilanVille(v) {
  const c = G.civs[v.civ], e = eff(c), cap = !!v.bat.palais;
  const centre = rendTuile(v.i, v, c);
  let n = Math.max(2, centre.n), p = Math.max(1, centre.p), o = centre.o + 1, s = v.pop * 0.7, cu = 1;
  for (const j of v.trav) { const r = rendTuile(j, v, c); n += r.n; p += r.p; o += r.o; }
  const spec = Math.max(0, v.pop - v.trav.length);
  s += spec * 2;
  let pctP = 0, pctO = 0, pctS = 0, bonheur = 0;
  for (const b in v.bat) {
    const B = BATIMENTS[b] || MERVEILLES[b];
    if (!B) continue;
    n += B.n || 0; p += B.p || 0; o += B.o || 0; s += B.s || 0; cu += B.c || 0;
    pctP += B.pctP || 0; pctO += B.pctO || 0; pctS += B.pctS || 0; bonheur += B.bonheur || 0;
  }
  if (v.bat.bibliotheque && c.techs.imprimerie) s += 1;
  n += (e.nVille || 0) + (cap ? e.nCap || 0 : 0);
  s += e.sVille || 0; o += e.oVille || 0; cu += cap ? (e.cultCap || 0) : 0;
  pctP += (e.pctP || 0) + (cap ? e.pctPCap || 0 : 0); pctO += e.pctO || 0; pctS += e.pctS || 0;
  if (c.bonheur <= -10) pctP -= 10;
  const dif = c.ia && !c.barbare ? DIFFICULTES[G.opts.difficulte].ia : { p: 1, s: 1, o: 1 };
  p = p * (1 + pctP / 100) * dif.p; o = o * (1 + pctO / 100) * dif.o; s = s * (1 + pctS / 100) * dif.s;
  const r1 = x => Math.round(x * 10) / 10;
  return { n, p: r1(p), o: r1(o), s: r1(s), c: cu, conso: v.pop * 2, surplus: n - v.pop * 2, spec, bonheur };
}
const seuilCroissance = pop => Math.round((15 + 8 * (pop - 1) + Math.pow(pop - 1, 1.5)) * Math.max(0.7, G.vit));
function habitat(v) { let h = 10; if (v.bat.aqueduc) h = 20; if (v.bat.hopital) h += 10; return h; }
const estCotiere = v => voisins(v.i).some(j => estEau(j));
const coutTuileCulture = v => Math.round((8 + 5 * Math.pow(v.nbT, 1.35)) * Math.max(0.7, G.vit));

function etendre(v) {
  const c = G.civs[v.civ];
  let best = -1, bs = -1e9;
  for (const j of rayon(v.i, 3)) {
    const t = G.tuiles[j];
    if (t.prop >= 0) continue;
    if (!voisins(j).some(k => G.tuiles[k].vp === v.id)) continue;
    const r = rendTuile(j, v, c);
    const s = r.n * 1.3 + r.p + r.o * 0.8 - dist(v.i, j) * 0.6 + (t.res ? (RESSOURCES[t.res].luxe ? 3 : 1.5) : 0) + rng() * 0.3;
    if (s > bs) { bs = s; best = j; }
  }
  if (best < 0) return false;
  G.tuiles[best].prop = v.civ; G.tuiles[best].vp = v.id; v.nbT++;
  return true;
}

/* Production */
function coutItem(v, it) {
  const c = G.civs[v.civ], e = eff(c);
  if (it.k === 'u') {
    const U = UNITES[it.id]; let k = U.cout;
    if (it.id === 'colon') k *= 1 - (e.colon || 0) / 100;
    else if (U.classe !== 'civil') k *= 1 - (e.unites || 0) / 100;
    return Math.round(k * G.vit);
  }
  if (it.k === 'b') return Math.round(BATIMENTS[it.id].cout * G.vit);
  if (it.k === 'm') return Math.round(MERVEILLES[it.id].cout * G.vit / (1 + (e.merveilles || 0) / 100));
  const P = PROJETS[it.id];
  return P.continu ? INF : Math.round(P.cout * G.vit);
}
function nomItem(it) {
  if (!it) return 'Rien';
  return (it.k === 'u' ? UNITES : it.k === 'b' ? BATIMENTS : it.k === 'm' ? MERVEILLES : PROJETS)[it.id].nom;
}
function itemValide(v, it) {
  const c = G.civs[v.civ];
  if (it.k === 'u') {
    const U = UNITES[it.id];
    if (!U || !aTech(c, U.tech)) return false;
    if (U.classe === 'mer' && !estCotiere(v)) return false;
    return true;
  }
  if (it.k === 'b') {
    const B = BATIMENTS[it.id];
    return B && !B.special && !v.bat[it.id] && aTech(c, B.tech) && (!B.req || v.bat[B.req]) && (!B.cotier || estCotiere(v));
  }
  if (it.k === 'm') {
    const M = MERVEILLES[it.id];
    return M && !G.merveillesBaties[it.id] && aTech(c, M.tech) && (!M.cotier || estCotiere(v));
  }
  const P = PROJETS[it.id];
  if (!P || !aTech(c, P.tech)) return false;
  if (it.id === 'arche') return !G.fin;
  return true;
}
function estObsolete(c, id) { const U = UNITES[id]; return !!(U.maj && aTech(c, UNITES[U.maj].tech)); }
function itemsDispo(v) {
  const c = G.civs[v.civ], res = [];
  for (const id in UNITES) { const it = { k: 'u', id }; if (itemValide(v, it) && !estObsolete(c, id)) res.push(it); }
  for (const id in BATIMENTS) { const it = { k: 'b', id }; if (itemValide(v, it)) res.push(it); }
  for (const id in MERVEILLES) { const it = { k: 'm', id }; if (itemValide(v, it)) res.push(it); }
  for (const id in PROJETS) { const it = { k: 'p', id }; if (itemValide(v, it)) res.push(it); }
  return res;
}
function definirProduction(v, it) { v.file = [it]; }
function caseApparition(v, type) {
  const mer = UNITES[type].classe === 'mer', mil = UNITES[type].classe !== 'civil';
  const essai = { civ: v.civ, type };
  if (!mer && placeLibre(essai, v.i, mil)) return v.i;
  if (mer && placeLibre(essai, v.i, mil)) return v.i;
  for (const j of voisins(v.i)) {
    if (estEau(j) !== mer || G.tuiles[j].rel === 2) continue;
    if (G.tuiles[j].prop >= 0 && G.tuiles[j].prop !== v.civ) continue;
    if (placeLibre(essai, j, mil)) return j;
  }
  return -1;
}
function terminer(v, it) {
  const c = G.civs[v.civ];
  if (it.k === 'u') {
    if (it.id === 'colon' && v.pop < 2) return false;
    const j = caseApparition(v, it.id);
    if (j < 0) return false;
    const u = creerUnite(it.id, v.civ, j);
    if (estMil(u)) { u.xp = Math.round(((v.bat.caserne ? 15 : 0)) * (1 + (eff(c).xp || 0) / 100)); u.niv = niveauXP(u.xp); }
    if (it.id === 'colon') { v.pop--; v.nour = 0; assignerTuiles(v); }
    notif(c.n, `${v.nom} a formé : ${UNITES[it.id].nom}`, v.i, 'prod');
    return u;
  }
  if (it.k === 'b') {
    v.bat[it.id] = true;
    if (BATIMENTS[it.id].pv) v.pv += BATIMENTS[it.id].pv;
    notif(c.n, `${v.nom} a construit : ${BATIMENTS[it.id].nom}`, v.i, 'prod');
    return true;
  }
  if (it.k === 'm') {
    if (G.merveillesBaties[it.id]) return false;
    v.bat[it.id] = true;
    G.merveillesBaties[it.id] = { civ: c.n, ville: v.nom, tour: G.tour };
    invalider(c);
    if (MERVEILLES[it.id].techGratuite) techGratuite(c);
    for (const d of G.civs) {
      if (d.n === c.n) { notif(d.n, `Merveille achevée à ${v.nom} : ${MERVEILLES[it.id].nom} !`, v.i, 'bon'); popup(d.n, { type: 'merveille', id: it.id, civ: c.n }); }
      else if (!d.barbare) notif(d.n, `Les ${c.nom} ont achevé ${MERVEILLES[it.id].nom}`, null, 'diplo');
    }
    return true;
  }
  if (it.k === 'p' && it.id === 'arche') {
    G.fin = { type: 'science', civ: c.n };
    return true;
  }
  return false;
}
function produire(v, b) {
  const c = G.civs[v.civ];
  while (v.file.length && !itemValide(v, v.file[0])) {
    const it = v.file.shift();
    if (it.k === 'm') notif(c.n, `${v.nom} : ${MERVEILLES[it.id].nom} a été construite ailleurs, la production est conservée`, v.i, 'mal');
  }
  const it = v.file[0];
  if (!it) { c.or += b.p * 0.25; return; }
  if (it.k === 'p' && PROJETS[it.id].continu) {
    if (it.id === 'richesse') c.or += b.p * 0.4; else c.sci += b.p * 0.4;
    return;
  }
  v.prod += b.p;
  const cout = coutItem(v, it);
  if (v.prod >= cout && terminer(v, it)) {
    v.prod = Math.min(v.prod - cout, cout);
    v.file.shift();
  }
}
function coutAchat(v, it) {
  if (!it || it.k === 'm' || it.k === 'p') return null;
  const c = G.civs[v.civ];
  const reste = Math.max(1, coutItem(v, it) - v.prod);
  return Math.ceil(reste * (it.k === 'u' ? 2 : 2.5) * (1 - (eff(c).achat || 0) / 100));
}
function acheter(v) {
  const it = v.file[0], c = G.civs[v.civ], prix = coutAchat(v, it);
  if (prix === null || c.or < prix) return false;
  const fait = terminer(v, it);
  if (!fait) return false;
  c.or -= prix;
  if (fait.id) { fait.mv = 0; }
  v.prod = 0; v.file.shift();
  return true;
}

function capturer(v, n) {
  const ancien = G.civs[v.civ], nouveau = G.civs[n];
  for (const x of [...OCC[v.i]]) if (x.civ !== n) tuer(x);
  const etaitPalais = !!v.bat.palais;
  delete v.bat.palais;
  v.civ = n; v.pop = Math.max(1, Math.ceil(v.pop / 2)); v.file = []; v.prod = 0; v.nour = 0; v.aTire = true;
  v.pv = Math.round(pvMaxVille(v) * 0.3);
  nouveau.or += 25 + v.pop * 10;
  for (const t of G.tuiles) if (t.vp === v.id) t.prop = n;
  if (etaitPalais) {
    const autre = villesDe(ancien.n).sort((a, b) => b.pop - a.pop)[0];
    if (autre) autre.bat.palais = true;
  }
  if (!G.villes.some(x => x.civ === n && x.bat.palais)) v.bat.palais = true;
  invalider(ancien); invalider(nouveau);
  assignerTuiles(v);
  notif(n, `Vous prenez ${v.nom} !`, v.i, 'bon');
  notif(ancien.n, `${v.nom} est tombée aux mains des ${nouveau.nom}`, v.i, 'mal');
  if (G.joueur >= 0 && n !== G.joueur && ancien.n !== G.joueur && G.civs[G.joueur].met[n] !== undefined) notif(G.joueur, `Les ${nouveau.nom} prennent ${v.nom} aux ${ancien.nom}`, null, 'diplo');
  verifierElimination(ancien);
  majVision(nouveau); majVision(ancien);
}
function verifierElimination(c) {
  if (!c || c.barbare || c.elimine) return;
  if (G.villes.some(v => v.civ === c.n) || G.unites.some(u => u.civ === c.n && u.type === 'colon')) return;
  c.elimine = true;
  for (const u of unitesDe(c.n)) tuer(u);
  for (const d of G.civs) { delete d.guerre[c.n]; }
  c.guerre = {};
  for (const d of G.civs) if (!d.barbare && d.n !== c.n) notif(d.n, c.n === G.joueur ? 'Votre peuple a disparu.' : `Les ${c.nom} ont disparu de l’histoire`, null, 'diplo');
}

/* ---------- Ouvriers ---------- */
function peutAmeliorer(c, i, am) {
  const t = G.tuiles[i], A = AMELIORATIONS[am];
  if (!A || !aTech(c, A.tech)) return false;
  if (estEau(i) || t.rel === 2 || VIL[i] || t.prop !== c.n || t.am === am) return false;
  if (t.res && RESSOURCES[t.res].amel === am && resVisible(c, t.res)) return true;
  if (am === 'ferme') return !t.cv && t.t !== 'neige' && (t.t !== 'desert' || !!eff(c).desert);
  if (am === 'mine') return t.rel === 1 && t.cv !== 'jungle';
  if (am === 'scierie') return t.cv === 'foret';
  return false;
}
function ameliorer(u, am) {
  const c = G.civs[u.civ];
  if (u.type !== 'ouvrier' || u.mv <= 0 || !peutAmeliorer(c, u.i, am)) return false;
  G.tuiles[u.i].am = am;
  u.ch--; u.mv = 0; u.bouge = true; u.ordre = u.ordre === 'auto' ? 'auto' : null;
  for (const v of villesDe(c.n)) if (dist(v.i, u.i) <= 3) assignerTuiles(v);
  if (u.ch <= 0) tuer(u);
  return true;
}
const peutRoute = u => u.type === 'ouvrier' && u.mv > 0 && aTech(G.civs[u.civ], 'roue') && !G.tuiles[u.i].rt && !estEau(u.i) && G.tuiles[u.i].rel < 2;
function construireRoute(u) {
  if (!peutRoute(u)) return false;
  G.tuiles[u.i].rt = true; u.mv = 0; u.bouge = true;
  return true;
}

/* ---------- Amélioration des unités ---------- */
function coutMaj(u) {
  const U = UNITES[u.type];
  if (!U.maj) return null;
  return Math.max(10, Math.round((UNITES[U.maj].cout - U.cout) * 1.5 * G.vit));
}
function peutMaj(u) {
  const c = G.civs[u.civ], U = UNITES[u.type];
  if (!U.maj || !aTech(c, UNITES[U.maj].tech) || u.mv <= 0) return false;
  return G.tuiles[u.i].prop === c.n && c.or >= coutMaj(u);
}
function majUnite(u) {
  if (!peutMaj(u)) return false;
  const c = G.civs[u.civ];
  c.or -= coutMaj(u);
  u.type = UNITES[u.type].maj; u.mv = 0;
  return true;
}

/* ---------- Bonheur, doctrines, entretien ---------- */
function calculBonheur(c) {
  const vs = villesDe(c.n), e = eff(c);
  const lux = new Set();
  for (const t of G.tuiles) {
    if (t.prop !== c.n || !t.res) continue;
    const R = RESSOURCES[t.res];
    if (R.luxe && (!R.amel || t.am === R.amel)) lux.add(t.res);
  }
  let bat = 0, pop = 0;
  for (const v of vs) { pop += v.pop; for (const b in v.bat) bat += (BATIMENTS[b] && BATIMENTS[b].bonheur) || 0; }
  const base = 6 + (c.ia ? 0 : DIFFICULTES[G.opts.difficulte].bonheurJ);
  const d = {
    base, luxes: lux.size * 4, batiments: bat, empire: (e.bonheur || 0) + (e.bonheurVille || 0) * vs.length,
    villes: -vs.length * 2, population: -Math.ceil(pop * 0.5), luxeListe: [...lux],
  };
  d.total = d.base + d.luxes + d.batiments + d.empire + d.villes + d.population;
  return d;
}
function coutDoctrine(c) {
  const nv = Math.max(1, villesDe(c.n).length);
  return Math.round((25 + 20 * Math.pow(c.nbDoc, 1.5)) * G.vit * (1 + 0.1 * (nv - 1)));
}
function doctrinesDispo(c) {
  return DOCTRINES.filter(d => (c.doc[d.id] || 0) < d.liste.length).map(d => ({ voie: d, item: d.liste[c.doc[d.id] || 0] }));
}
function prendreDoctrine(c, voieId) {
  const d = DOCTRINES.find(x => x.id === voieId);
  if (!d || (c.doc[voieId] || 0) >= d.liste.length) return false;
  const cout = coutDoctrine(c);
  if (c.cult < cout) return false;
  c.cult -= cout;
  const item = d.liste[c.doc[voieId] || 0];
  c.doc[voieId] = (c.doc[voieId] || 0) + 1; c.nbDoc++;
  invalider(c);
  if (item.e.techGratuite) techGratuite(c);
  if (item.e.charges) for (const u of unitesDe(c.n)) if (u.type === 'ouvrier') u.ch += item.e.charges;
  notif(c.n, `Doctrine adoptée : ${item.nom}`, null, 'bon');
  return true;
}
function entretien(c) {
  const vs = villesDe(c.n);
  let bat = 0;
  for (const v of vs) for (const b in v.bat) bat += (BATIMENTS[b] && BATIMENTS[b].ent) || 0;
  const nb = G.unites.reduce((s, u) => s + (u.civ === c.n ? 1 : 0), 0);
  const parUnite = 1 + Math.floor(ereCiv(c) / 2);
  const unites = Math.max(0, nb - (3 + vs.length)) * parUnite;
  return { bat, unites, total: bat + unites };
}
/* Revenus prévus de la nation (affichés dans la barre du haut). */
function revenus(c) {
  let s = 0, o = 0, cu = 0;
  for (const v of villesDe(c.n)) { const b = bilanVille(v); s += b.s; cu += b.c; const it = v.file[0]; o += b.o; if (it && it.id === 'richesse') o += b.p * 0.4; if (it && it.id === 'recherche') s += b.p * 0.4; }
  const ent = entretien(c);
  return { s: Math.round(s), o: Math.round(o - ent.total), oBrut: Math.round(o), ent, c: Math.round(cu) };
}

/* ---------- Vision ---------- */
function majVision(c) {
  if (!c || c.barbare || c.elimine) return;
  const vis = c.vis, N = G.W * G.H;
  vis.fill(0);
  for (const u of G.unites) {
    if (u.civ !== c.n) continue;
    const R = (UNITES[u.type].vue || 2) + (G.tuiles[u.i].rel === 1 && !estEau(u.i) ? 1 : 0);
    for (const j of rayon(u.i, R)) vis[j] = 1;
  }
  for (const v of G.villes) if (v.civ === c.n) for (const j of rayon(v.i, 3)) vis[j] = 1;
  for (let i = 0; i < N; i++) if (G.tuiles[i].prop === c.n) { vis[i] = 1; for (let k = 0; k < 6; k++) { const j = VOIS[i * 6 + k]; if (j >= 0) vis[j] = 1; } }
  for (let i = 0; i < N; i++) {
    if (!vis[i]) continue;
    c.vu[i] = 1;
    const p = G.tuiles[i].prop;
    if (p >= 0 && p !== c.n && c.met[p] === undefined) rencontrer(c, G.civs[p]);
    for (const u of OCC[i]) if (u.civ !== c.n && c.met[u.civ] === undefined) rencontrer(c, G.civs[u.civ]);
  }
}

/* ---------- Tours ---------- */
function soigner(u) {
  const t = G.tuiles[u.i], c = G.civs[u.civ];
  if (estEmbarque(u)) return;
  let s = 10;
  if (VIL[u.i] && VIL[u.i].civ === u.civ) s = 25;
  else if (t.prop === u.civ) s = 15;
  else if (t.prop >= 0 && enGuerre(u.civ, t.prop)) s = 5;
  if (u.ordre === 'fort') s += 5;
  if (c.barbare) s = 10;
  u.pv = Math.min(100, u.pv + s);
}
function debutTourCiv(c) {
  if (c.elimine) return;
  for (const u of G.unites) {
    if (u.civ !== c.n) continue;
    if (!u.bouge && !u.att && u.pv < 100) soigner(u);
    if (u.ordre === 'fort' && !u.bouge) u.fort = Math.min(2, u.fort + 1);
    if (u.ordre === 'passe') u.ordre = null;
    u.mv = mvMax(u); u.bouge = false; u.att = false;
  }
  for (const v of G.villes) if (v.civ === c.n) v.aTire = false;
  majVision(c);
}
function finTourCiv(c) {
  if (c.barbare || c.elimine) return;
  c.bonheur = calculBonheur(c).total;
  let sci = 0, or = 0, cult = 0;
  for (const v of villesDe(c.n)) {
    assignerTuiles(v);
    const b = bilanVille(v);
    sci += b.s; or += b.o; cult += b.c;
    let gain = b.surplus;
    if (gain > 0) { if (c.bonheur <= -10) gain = 0; else if (c.bonheur < 0) gain *= 0.5; }
    v.nour += gain;
    const seuil = seuilCroissance(v.pop);
    if (v.nour >= seuil) {
      if (v.pop < habitat(v)) { v.pop++; v.nour = Math.max(0, v.nour - seuil) + (v.bat.grenier ? Math.round(seuil * 0.1) : 0); assignerTuiles(v); }
      else v.nour = seuil;
    } else if (v.nour < 0) {
      if (v.pop > 1) { v.pop--; v.nour = 0; assignerTuiles(v); notif(c.n, `Famine à ${v.nom} : la population diminue`, v.i, 'mal'); }
      else v.nour = 0;
    }
    produire(v, b);
    v.cult += b.c;
    for (let g = 0; g < 3; g++) {
      const cout = coutTuileCulture(v);
      if (v.cult < cout) break;
      if (!etendre(v)) { v.cult = Math.min(v.cult, cout); break; }
      v.cult -= cout;
    }
    v.pv = Math.min(pvMaxVille(v), v.pv + 20);
  }
  const ent = entretien(c);
  c.or += or - ent.total;
  if (c.or < 0) {
    const u = unitesDe(c.n).filter(estMil).sort((a, b) => UNITES[a.type].cout - UNITES[b.type].cout)[0];
    if (u) { tuer(u); notif(c.n, `Trésor vide : une unité (${UNITES[u.type].nom}) est dissoute`, u.i, 'mal'); }
    c.or = 0;
  }
  const avant = c.cult;
  c.cult += cult;
  if (!c.ia && avant < coutDoctrine(c) && c.cult >= coutDoctrine(c) && doctrinesDispo(c).length) popup(c.n, { type: 'doctrine' });
  c.sci += sci;
  avancerRecherche(c);
  c.bonheur = calculBonheur(c).total;
}

function barbaresApparition() {
  const b = G.civs[G.barb];
  if (G.tour < 8) return;
  const ere = Math.max(...G.civs.filter(c => !c.barbare && !c.elimine).map(ereCiv), 0);
  const N = G.W * G.H;
  let camps = 0;
  for (const t of G.tuiles) if (t.camp) camps++;
  if (ere < 4 && camps < Math.floor(N / 320) && rng() < 0.3) {
    for (let essai = 0; essai < 40; essai++) {
      const i = Math.floor(rng() * N), t = G.tuiles[i];
      if (estEau(i) || t.rel === 2 || t.prop >= 0 || t.camp || t.hutte || OCC[i].length) continue;
      if (G.civs.some(c => !c.barbare && c.vis[i])) continue;
      if (G.villes.some(v => dist(v.i, i) < 5)) continue;
      t.camp = true; t.campT = G.tour - 8;
      break;
    }
  }
  const types = [['guerrier', 'archer'], ['epeiste', 'archer', 'cavalier'], ['piquier', 'arbaletrier', 'chevalier'], ['mousquetaire', 'arbaletrier', 'chevalier']][Math.min(3, Math.max(0, ere - 1))];
  G.tuiles.forEach((t, i) => {
    if (!t.camp || G.tour - (t.campT || 0) < 8) return;
    let proches = 0;
    for (const j of rayon(i, 4)) for (const u of OCC[j]) if (u.civ === b.n) proches++;
    if (proches >= 2) return;
    const place = [i, ...voisins(i)].find(j => !estEau(j) && G.tuiles[j].rel < 2 && OCC[j].length === 0);
    if (place === undefined) return;
    const u = creerUnite(types[Math.floor(rng() * types.length)], b.n, place);
    u.camp = i; t.campT = G.tour;
  });
}

function scoreCiv(c) {
  if (c.barbare) return 0;
  const vs = villesDe(c.n);
  let pop = 0, merv = 0;
  for (const v of vs) { pop += v.pop; for (const b in v.bat) if (MERVEILLES[b]) merv++; }
  let tuiles = 0;
  for (const t of G.tuiles) if (t.prop === c.n) tuiles++;
  return Math.round(vs.length * 6 + pop * 3 + Object.keys(c.techs).length * 4 + merv * 12 + tuiles / 4);
}
function verifierVictoire() {
  if (G.fin) return;
  const vivantes = G.civs.filter(c => !c.barbare && !c.elimine);
  const caps = G.villes.filter(v => v.capOrig >= 0);
  const fondatrices = G.civs.filter(c => !c.barbare && c.villesFondees > 0);
  for (const c of vivantes) {
    if (vivantes.length === 1 || (fondatrices.length > 1 && fondatrices.every(f => caps.some(v => v.capOrig === f.n)) && caps.every(v => v.civ === c.n))) {
      G.fin = { type: 'domination', civ: c.n }; return;
    }
  }
  if (G.joueur >= 0 && G.civs[G.joueur].elimine) { G.fin = { type: 'elimine', civ: -1 }; return; }
  if (G.tour > G.toursMax) {
    const m = vivantes.sort((a, b) => b.score - a.score)[0];
    G.fin = { type: 'score', civ: m ? m.n : -1 };
  }
}

/* Ordres qui continuent d'un tour à l'autre pour le joueur (déplacements longs, automatisation, veille). */
function ordresPermanents(c) {
  for (const u of unitesDe(c.n)) {
    if (u.mort) continue;
    const o = u.ordre;
    if (o && o.but !== undefined) { if (deplacer(u, o.but) === null) notif(c.n, `${UNITES[u.type].nom} : chemin bloqué`, u.i, 'info'); }
    else if (o === 'auto' && typeof iaOuvrier === 'function') iaOuvrier(c, u, true);
    else if (o === 'explo' && typeof iaExplorer === 'function') { if (!iaExplorer(c, u)) { u.ordre = null; notif(c.n, 'Exploration terminée : plus rien à découvrir à portée', u.i, 'info'); } }
    else if (o === 'veille' && rayon(u.i, 2).some(j => OCC[j].some(x => estMil(x) && enGuerre(x.civ, u.civ)))) { u.ordre = null; notif(c.n, `${UNITES[u.type].nom} : ennemi en vue`, u.i, 'mal'); }
  }
}

function finDuTour() {
  if (G.fin) return;
  for (const c of G.civs) {
    if (c.elimine) continue;
    if (c.n === G.joueur) { finTourCiv(c); continue; }
    debutTourCiv(c);
    if (c.barbare) { if (typeof iaBarbares === 'function') iaBarbares(c); }
    else if (typeof iaJouer === 'function') iaJouer(c);
    finTourCiv(c);
  }
  barbaresApparition();
  G.tour++;
  for (const c of G.civs) c.score = scoreCiv(c);
  verifierVictoire();
  const j = G.civs[G.joueur];
  if (j && !j.elimine && !G.fin) { debutTourCiv(j); ordresPermanents(j); majVision(j); }
}

function annee(tour) {
  const t = tour * 320 / G.toursMax;
  const paliers = [[60, 50], [60, 25], [50, 20], [50, 5], [50, 3], [1e9, 2]];
  let an = -4000, reste = t;
  for (const [n, pas] of paliers) { const k = Math.min(reste, n); an += k * pas; reste -= k; if (reste <= 0) break; }
  an = Math.round(an);
  return an < 0 ? `${-an} av. J.-C.` : `${Math.max(1, an)} apr. J.-C.`;
}

/* ---------- Sauvegarde ---------- */
function exporter() {
  return JSON.stringify(G, (k, val) => {
    if (k[0] === '_' || k === 'vis') return undefined;
    if (val instanceof Uint8Array) { let s = ''; for (let i = 0; i < val.length; i++) s += val[i] ? '1' : '0'; return { u8: s }; }
    return val;
  });
}
function importer(txt) {
  const d = JSON.parse(txt, (k, val) => {
    if (val && typeof val === 'object' && typeof val.u8 === 'string') { const a = new Uint8Array(val.u8.length); for (let i = 0; i < a.length; i++) a[i] = val.u8.charCodeAt(i) === 49 ? 1 : 0; return a; }
    return val;
  });
  if (!d || !d.tuiles || !d.civs) throw new Error('Sauvegarde illisible');
  G = d;
  G.unites.forEach(u => { delete u.mort; });
  reindexer();
  G.civs.forEach(majVision);
  return G;
}
