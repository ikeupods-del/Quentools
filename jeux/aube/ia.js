'use strict';
/* Aube des Nations — intelligence des nations adverses et des barbares.
   Les mêmes fonctions servent à l'automatisation des ouvriers et éclaireurs du joueur. */

/* ---------- Recherche et doctrines ---------- */
function iaRecherche(c) {
  const dispo = Object.keys(TECHS).filter(id => techDispo(c, id));
  if (!dispo.length) return null;
  let best = null, bs = -1e9;
  for (const id of dispo) {
    const T = TECHS[id];
    let s = -T.cout / 45;
    for (const u in UNITES) if (UNITES[u].tech === id) s += 1 + c.perso.guerre * 2;
    for (const b in BATIMENTS) if (BATIMENTS[b].tech === id) s += 1 + (BATIMENTS[b].s ? c.perso.science * 2.5 : 0) + (BATIMENTS[b].p ? 1 : 0);
    for (const m in MERVEILLES) if (MERVEILLES[m].tech === id && !G.merveillesBaties[m]) s += c.perso.merveilles * 1.5;
    for (const a in AMELIORATIONS) if (AMELIORATIONS[a].tech === id) s += 2;
    if (PROJETS.arche.tech === id) s += 8;
    if (id === 'ecriture' || id === 'bronze' || id === 'poterie' || id === 'roue') s += 1.5;
    s += rng() * 1.5;
    if (s > bs) { bs = s; best = id; }
  }
  return best;
}
function iaChoixDoctrine(c) {
  const poids = { tradition: 1 + (villesDe(c.n).length < 4 ? 1 : 0), expansion: c.perso.expansion * 2, savoir: 0.8 + c.perso.science * 2, commerce: 1.2, honneur: c.perso.guerre * 2 };
  const dispo = doctrinesDispo(c);
  let best = null, bs = -1;
  for (const d of dispo) { const s = (poids[d.voie.id] || 1) + (c.doc[d.voie.id] || 0) * 0.6 + rng() * 0.8; if (s > bs) { bs = s; best = d.voie.id; } }
  return best;
}

/* ---------- Diplomatie ---------- */
function veutPaix(c, ennemi) {
  if (c.guerre[ennemi.n] === undefined) return false;
  const duree = G.tour - c.guerre[ennemi.n];
  const r = puissance(c.n) / Math.max(1, puissance(ennemi.n));
  return duree >= 6 && (r < 1.15 || (duree > 30 && r < 2));
}
function iaDiplomatie(c) {
  const p = puissance(c.n);
  const enGuerreAvec = Object.keys(c.guerre).map(Number).filter(k => !G.civs[k].elimine && !G.civs[k].barbare);
  for (const d of G.civs) {
    if (d.barbare || d.elimine || d.n === c.n || c.met[d.n] === undefined) continue;
    if (c.guerre[d.n] !== undefined) {
      const duree = G.tour - c.guerre[d.n];
      const veut = duree >= 10 && (p < puissance(d.n) * 0.9 || rng() < 0.03);
      if (!veut) continue;
      if (d.ia) { if (veutPaix(d, c) || rng() < 0.2) faireLaPaix(c.n, d.n); }
      else if (G.tour - (c._propPaix || -99) > 8 && !G.popups.some(x => x.type === 'paix' && x.civ === c.n)) {
        c._propPaix = G.tour; popup(d.n, { type: 'paix', civ: c.n });
      }
    } else {
      if (G.tour < 30 || enGuerreAvec.length) continue;
      if (G.tour - (c.paixTour[d.n] ?? -99) < 20) continue;
      if (p < puissance(d.n) * 1.35 + 10) continue;
      const nos = villesDe(c.n), leurs = villesDe(d.n);
      if (!nos.some(v => leurs.some(w => dist(v.i, w.i) <= 14))) continue;
      if (rng() < 0.02 + 0.05 * c.perso.guerre) { declarerGuerre(c.n, d.n); enGuerreAvec.push(d.n); }
    }
  }
}

/* ---------- Contexte d'un tour ---------- */
function iaContexte(c) {
  const vs = villesDe(c.n), us = unitesDe(c.n);
  const ctx = {
    vs, us, guerre: Object.keys(c.guerre).map(Number).filter(k => !G.civs[k].elimine),
    colons: 0, ouvriers: 0, mil: 0, navires: 0, siege: 0, cav: 0,
  };
  for (const u of us) {
    const U = UNITES[u.type];
    if (u.type === 'colon') ctx.colons++;
    else if (u.type === 'ouvrier') ctx.ouvriers++;
    else if (estMil(u) && u.type !== 'eclaireur') {
      ctx.mil++;
      if (U.classe === 'mer') ctx.navires++;
      if (U.siege) ctx.siege++;
      if (U.cav) ctx.cav++;
    }
  }
  for (const v of vs) {
    const it = v.file[0];
    if (!it || it.k !== 'u') continue;
    if (it.id === 'colon') ctx.colons++; else if (it.id === 'ouvrier') ctx.ouvriers++; else ctx.mil++;
  }
  const parCiv = (G.W * G.H) / Math.max(1, G.civs.length - 1);
  ctx.cibleVilles = Math.round(parCiv / 85 * c.perso.expansion) + 2;
  ctx.sansSite = c._sansSite !== undefined && G.tour - c._sansSite < 12;
  return ctx;
}

/* ---------- Production ---------- */
function iaMeilleureUnite(c, v, dispo, role, ctx) {
  const cotiere = estCotiere(v);
  if (role !== 'def' && cotiere && ctx.navires < Math.floor(ctx.mil / 7) && rng() < 0.5) {
    const nav = dispo.filter(it => it.k === 'u' && UNITES[it.id].classe === 'mer').sort((a, b) => UNITES[b.id].f - UNITES[a.id].f)[0];
    if (nav) return nav;
  }
  const cands = dispo.filter(it => it.k === 'u' && UNITES[it.id].classe === 'terre' && it.id !== 'eclaireur');
  let best = null, bs = -1e9;
  for (const it of cands) {
    const U = UNITES[it.id], fort = Math.max(U.f || 0, U.t || 0);
    let s;
    if (role === 'def') s = (U.f || 0) + (U.t ? 6 : 0) + (U.antiCav ? 3 : 0) - (U.siege ? 40 : 0) - (U.cav ? 6 : 0);
    else if (role === 'att') s = fort + (U.siege ? (ctx.siege < ctx.mil * 0.25 ? 18 : -20) : 0) + (U.cav ? (ctx.cav < ctx.mil * 0.3 ? 8 : -4) : 0);
    else s = fort + (U.t && !U.siege ? 4 : 0) - (U.siege ? 12 : 0);
    s += rng() * 8 - U.cout * 0.02;
    if (s > bs) { bs = s; best = it; }
  }
  return best;
}
function iaChoixProduction(c, v, ctx) {
  const dispo = itemsDispo(v);
  const a = id => dispo.find(it => it.id === id);
  const menace = rayon(v.i, 4).some(j => OCC[j].some(x => estMil(x) && enGuerre(x.civ, c.n)));
  const garnison = OCC[v.i].some(x => x.civ === c.n && estMil(x));
  const prod = bilanVille(v).p;
  if (menace && (!garnison || rng() < 0.5)) return iaMeilleureUnite(c, v, dispo, 'def', ctx);
  if (!garnison && ctx.mil < ctx.vs.length) return iaMeilleureUnite(c, v, dispo, 'def', ctx);
  if (v.pop >= 2 && ctx.vs.length + ctx.colons < ctx.cibleVilles && ctx.colons < 2 && !ctx.sansSite && !menace && a('colon')) return a('colon');
  if (ctx.ouvriers < Math.ceil(ctx.vs.length * 0.8) && a('ouvrier')) return a('ouvrier');
  if (a('arche') && !G.villes.some(x => x.civ === c.n && x.file[0] && x.file[0].id === 'arche')) return a('arche');
  const besoinMil = ctx.vs.length * 1.2 + (ctx.guerre.some(k => !G.civs[k].barbare) ? ctx.vs.length * 1.5 + 2 : 0) + ereCiv(c) * 0.5 + c.perso.guerre * 2;
  if (ctx.mil < besoinMil && rng() < 0.7) return iaMeilleureUnite(c, v, dispo, ctx.guerre.length ? 'att' : 'mix', ctx);
  if (prod >= 5 && rng() < 0.2 + c.perso.merveilles * 0.4) {
    const m = dispo.filter(it => it.k === 'm' && !G.villes.some(x => x.civ === c.n && x !== v && x.file[0] && x.file[0].id === it.id));
    if (m.length) return m[Math.floor(rng() * m.length)];
  }
  const ordre = [
    'monument', 'grenier', c.bonheur < 2 ? 'temple' : null, 'bibliotheque', c.bonheur < 0 ? 'colisee' : null, 'marche',
    (menace || ctx.guerre.length) ? 'remparts' : null, v.pop >= 8 ? 'aqueduc' : null, 'phare', 'universite', 'atelier',
    c.perso.guerre > 0.6 ? 'caserne' : null, 'banque', 'port', c.bonheur < 2 ? 'stade' : null, 'usine', v.pop >= 15 ? 'hopital' : null,
    'centrale', 'laboratoire', 'bourse', 'temple', 'colisee', 'remparts', 'caserne', 'chateau', 'stade', 'hopital', 'aqueduc',
  ];
  for (const id of ordre) if (id && a(id)) return a(id);
  if (ctx.mil < besoinMil * 1.6) return iaMeilleureUnite(c, v, dispo, 'mix', ctx);
  return a('recherche') || a('richesse');
}

/* ---------- Colons ---------- */
function siteValide(c, i) {
  const t = G.tuiles[i];
  if (estEau(i) || t.rel === 2 || (t.prop >= 0 && t.prop !== c.n)) return false;
  if (OCC[i].some(x => x.civ !== c.n)) return false;
  for (const v of G.villes) if (dist(v.i, i) <= 3) return false;
  return true;
}
function valeurSite(c, i) {
  let s = 0;
  for (const j of rayon(i, 2)) {
    const t = G.tuiles[j];
    if (t.prop >= 0 && t.prop !== c.n) { s -= 0.5; continue; }
    const r = rendTuile(j, null, c);
    s += r.n * 1.4 + r.p + r.o * 0.5;
    if (t.res) s += RESSOURCES[t.res].luxe ? 2.5 : 1;
    if (t.t === 'ocean') s -= 0.8;
  }
  const t = G.tuiles[i];
  if (t.rel === 1) s += 2;
  if (voisins(i).some(estEau)) s += 2;
  if (t.t === 'desert' || t.t === 'neige' || t.t === 'toundra') s -= 3;
  return s;
}
function meilleurSite(c, u) {
  const res = explorer(u, { tourMax: 12 });
  const reserves = unitesDe(c.n).filter(x => x.type === 'colon' && x !== u && x.cible >= 0).map(x => x.cible);
  const cap = G.villes.find(v => v.civ === c.n && v.bat.palais);
  const N = G.W * G.H;
  let best = -1, bs = -1e9;
  for (let i = 0; i < N; i++) {
    if (res.best[i] >= INF || !c.vu[i] || !siteValide(c, i)) continue;
    if (reserves.some(r => dist(r, i) <= 3)) continue;
    const tours = Math.floor(res.best[i] / 100);
    const s = valeurSite(c, i) - tours * 1.5 - (cap ? Math.max(0, dist(cap.i, i) - 8) * 1.3 : 0) - (estEau(u.i) ? 0 : 0);
    if (s > bs) { bs = s; best = i; }
  }
  return bs > 18 ? best : -1;
}
function iaColon(c, u, ctx) {
  if (c.villesFondees === 0 && peutFonder(u) && (u.cible === undefined || G.tour > 2)) {
    /* Première ville : sur place, sauf si une case voisine est nettement meilleure. */
    if (u.cible === undefined) {
      const ici = valeurSite(c, u.i);
      const mieux = voisins(u.i).filter(j => siteValide(c, j)).sort((a, b) => valeurSite(c, b) - valeurSite(c, a))[0];
      if (mieux !== undefined && valeurSite(c, mieux) > ici + 4) { u.cible = mieux; deplacer(u, mieux); if (u.i === mieux && peutFonder(u)) fonder(u); return; }
    }
    fonder(u); return;
  }
  if (u.cible >= 0 && u.i === u.cible && peutFonder(u)) { fonder(u); return; }
  if (!(u.cible >= 0) || !siteValide(c, u.cible)) u.cible = meilleurSite(c, u);
  if (u.cible < 0) {
    c._sansSite = G.tour;
    if (peutFonder(u) && valeurSite(c, u.i) > 15) fonder(u);
    else { const v = ctx.vs[0]; if (v && u.i !== v.i) deplacer(u, v.i); }
    return;
  }
  deplacer(u, u.cible);
  if (u.i === u.cible && peutFonder(u)) fonder(u);
}

/* ---------- Ouvriers ---------- */
function gainAmel(c, j, am) {
  const t = G.tuiles[j], avant = t.am, r0 = rendTuile(j, null, c);
  t.am = am; const r1 = rendTuile(j, null, c); t.am = avant;
  let g = (r1.n - r0.n) * 1.3 + (r1.p - r0.p) + (r1.o - r0.o) * 0.7;
  if (t.res && RESSOURCES[t.res].luxe && RESSOURCES[t.res].amel === am) g += 3;
  return g;
}
function meilleureAmel(c, j) {
  let best = null, bg = 0.4;
  for (const am in AMELIORATIONS) {
    if (!peutAmeliorer(c, j, am)) continue;
    const g = gainAmel(c, j, am);
    if (g > bg) { bg = g; best = am; }
  }
  return best ? { am: best, gain: bg } : null;
}
function routesACreer(c) {
  if (c._routesTour === G.tour) return c._routes;
  const vs = villesDe(c.n), cap = vs.find(v => v.bat.palais), liste = new Set();
  if (cap) {
    const res = explorer({ type: 'ouvrier', civ: c.n, i: cap.i, mv: 6 }, { tourMax: 8 });
    for (const v of vs) {
      if (v === cap || dist(v.i, cap.i) > 12) continue;
      const ch = chemin(res, v.i);
      if (ch) for (const j of ch) if (!G.tuiles[j].rt && !estEau(j) && (G.tuiles[j].prop === c.n || G.tuiles[j].prop < 0)) liste.add(j);
    }
  }
  c._routesTour = G.tour; c._routes = [...liste];
  return c._routes;
}
function iaOuvrier(c, u) {
  if (u.mort || u.mv <= 0) return true;
  if (OCC[u.i].some(x => x.civ !== c.n)) return false;
  const ici = G.tuiles[u.i].prop === c.n ? meilleureAmel(c, u.i) : null;
  const travaillee = G.villes.some(v => v.civ === c.n && v.trav.includes(u.i));
  if (ici && (travaillee || ici.gain >= 1.5)) { ameliorer(u, ici.am); return true; }
  const res = explorer(u, { tourMax: 8 });
  const autres = unitesDe(c.n).filter(x => x.type === 'ouvrier' && x !== u).map(x => x.cible);
  let best = -1, bs = -1e9, bam = null;
  for (const v of villesDe(c.n)) for (const j of tuilesVille(v)) {
    if (res.best[j] >= INF || autres.includes(j)) continue;
    if (OCC[j].some(x => x !== u && (x.civ !== c.n || !estMil(x)))) continue;
    const m = meilleureAmel(c, j);
    if (!m) continue;
    const s = m.gain * 3 + (v.trav.includes(j) ? 2 : 0) - Math.floor(res.best[j] / 100) * 1.2 - dist(u.i, j) * 0.1;
    if (s > bs) { bs = s; best = j; bam = m.am; }
  }
  if (best >= 0) {
    u.cible = best;
    if (best !== u.i) deplacer(u, best);
    if (u.i === best && u.mv > 0) ameliorer(u, bam);
    return true;
  }
  const routes = routesACreer(c).filter(j => res.best[j] < INF && !autres.includes(j));
  if (routes.length) {
    routes.sort((a, b) => res.best[a] - res.best[b]);
    const r = routes[0];
    u.cible = r;
    if (r !== u.i) deplacer(u, r);
    if (u.i === r && u.mv > 0) construireRoute(u);
    return true;
  }
  u.cible = undefined;
  return false;
}

/* ---------- Exploration ---------- */
function iaExplorer(c, u) {
  if (u.mort || u.mv <= 0) return true;
  const res = explorer(u, { tourMax: 10 }), N = G.W * G.H;
  let best = -1, bs = -1e9;
  for (let i = 0; i < N; i++) {
    if (res.best[i] >= INF || i === u.i) continue;
    if (OCC[i].length) continue;
    const t = G.tuiles[i];
    let s;
    if (t.hutte && c.vu[i] && !c.barbare) s = 25;
    else {
      let inconnus = 0;
      for (let k = 0; k < 6; k++) { const j = VOIS[i * 6 + k]; if (j >= 0 && !c.vu[j]) inconnus++; }
      if (!inconnus) continue;
      s = inconnus * 2;
    }
    if (t.camp) continue;
    s -= Math.floor(res.best[i] / 100) * 2.5 + (res.best[i] % 100) / 20;
    if (s > bs) { bs = s; best = i; }
  }
  if (best < 0) return false;
  deplacer(u, best);
  return true;
}

/* ---------- Combat ---------- */
/* Estime une attaque de u sur la tuile cible comme si u était à portée. */
function estimation(u, cible) {
  const U = UNITES[u.type], distance = !!U.t, v = VIL[cible];
  if (v && v.civ !== u.civ) {
    if (!enGuerre(u.civ, v.civ)) return null;
    const fA = forceAttaque(u, { v }, distance), fD = forceVille(v);
    const mult = U.siege ? 1.5 : distance ? 0.5 : (v.bat.remparts ? 0.6 : 1);
    return { ville: v, dD: degats(fA - fD) * mult, dA: distance ? 0 : degats(fD - fA) };
  }
  const occ = OCC[cible].filter(x => x.civ !== u.civ);
  if (!occ.length || !enGuerre(u.civ, occ[0].civ)) return null;
  const def = occ.find(estMil);
  if (!def) return distance ? null : { capture: true, dD: 100, dA: 0 };
  const fA = forceAttaque(u, { u: def }, distance), fD = forceDefense(def, u);
  return { def, dD: degats(fA - fD), dA: distance ? 0 : degats(fD - fA) };
}
function attaqueSouhaitable(u, e, audace) {
  if (!e) return false;
  if (e.capture) return true;
  const pvCible = e.ville ? e.ville.pv : e.def.pv;
  if (e.dA >= u.pv - 3) return false;
  if (UNITES[u.type].t) return e.dD >= 6;
  if (e.ville) {
    if (UNITES[u.type].classe === 'terre' && e.dD >= pvCible) return true;
    return e.ville.pv < pvMaxVille(e.ville) * 0.5 && e.dA < u.pv - 25 || e.dD > e.dA * 1.6 + audace * 10;
  }
  if (e.dD >= pvCible) return true;
  return e.dD > e.dA * (1.3 - audace * 0.5) && e.dA < u.pv - 20;
}
/* Cherche une attaque faisable ce tour (en se déplaçant si besoin). */
function iaCombat(c, u, audace = 0) {
  if (u.mort || u.mv <= 0 || estEmbarque(u)) return false;
  const U = UNITES[u.type], portee = U.t ? U.portee : 1;
  const cibles = [];
  for (const j of rayon(u.i, portee + Math.ceil(mvMax(u) / 3))) {
    if (j === u.i) continue;
    const v = VIL[j];
    const ennemi = (v && v.civ !== u.civ && enGuerre(u.civ, v.civ)) || OCC[j].some(x => x.civ !== u.civ && enGuerre(u.civ, x.civ));
    if (!ennemi && !(G.tuiles[j].camp && !c.barbare && !U.t && U.classe === 'terre')) continue;
    if (!ennemi && G.tuiles[j].camp) { cibles.push({ j, e: { dD: 100, dA: 0, camp: true }, s: 30 }); continue; }
    const e = estimation(u, j);
    if (!attaqueSouhaitable(u, e, audace)) continue;
    const pvC = e.ville ? e.ville.pv : e.def ? e.def.pv : 1;
    cibles.push({ j, e, s: (e.dD >= pvC ? 50 : 0) + e.dD - e.dA + (e.ville ? 15 : 0) });
  }
  if (!cibles.length) return false;
  cibles.sort((a, b) => b.s - a.s);
  let res = null;
  for (const cb of cibles) {
    if (prevision(u, cb.j)) { attaquer(u, cb.j); return true; }
    if (!res) res = explorer(u, { tourMax: 0 });
    let pos = -1, bp = INF;
    for (const k of rayon(cb.j, portee)) {
      if (res.best[k] >= INF || k === cb.j) continue;
      if (U.classe === 'terre' && estEau(k)) continue;
      if (!placeLibre(u, k) || VIL[k] && VIL[k].civ !== u.civ) continue;
      if (dist(k, cb.j) > portee) continue;
      const cost = res.best[k] - bonusTerrain(k) * 2;
      if (cost < bp) { bp = cost; pos = k; }
    }
    if (pos < 0) continue;
    deplacer(u, pos);
    if (u.i === pos && u.mv > 0 && prevision(u, cb.j)) { attaquer(u, cb.j); return true; }
    return true;
  }
  return false;
}
function plusProcheVille(c, i, filtre) {
  let best = null, bd = 1e9;
  for (const v of G.villes) if (v.civ === c.n && (!filtre || filtre(v))) { const d = dist(v.i, i); if (d < bd) { bd = d; best = v; } }
  return best;
}

/* ---------- Militaires ---------- */
function iaCibleGuerre(c, ctx) {
  const ennemis = ctx.guerre.filter(k => !G.civs[k].barbare);
  if (!ennemis.length || !ctx.vs.length) return null;
  const ancienne = G.villes.find(v => v.id === c._cible);
  if (ancienne && ennemis.includes(ancienne.civ)) return ancienne;
  let best = null, bs = 1e9;
  for (const v of G.villes) {
    if (!ennemis.includes(v.civ) || !c.vu[v.i]) continue;
    const d = Math.min(...ctx.vs.map(w => dist(w.i, v.i)));
    const s = d + forceVille(v) * 0.08 - (v.pv < pvMaxVille(v) / 2 ? 3 : 0);
    if (s < bs) { bs = s; best = v; }
  }
  c._cible = best ? best.id : null;
  return best;
}
function iaGarnisons(c, ctx) {
  const libres = ctx.us.filter(u => estMil(u) && UNITES[u.type].classe === 'terre' && u.type !== 'eclaireur');
  for (const u of libres) { const v = G.villes.find(x => x.id === u.garde); if (!v || v.civ !== c.n) u.garde = undefined; }
  for (const v of ctx.vs) {
    if (libres.some(u => u.garde === v.id)) continue;
    const ici = OCC[v.i].find(u => u.civ === c.n && estMil(u) && UNITES[u.type].classe === 'terre');
    if (ici) { ici.garde = v.id; continue; }
    const cand = libres.filter(u => u.garde === undefined && !UNITES[u.type].siege).sort((a, b) => dist(a.i, v.i) - dist(b.i, v.i))[0];
    if (cand && dist(cand.i, v.i) <= 12) cand.garde = v.id;
  }
}
function iaMilitaire(c, u, ctx) {
  if (iaCombat(c, u, c.perso.guerre * 0.3)) return;
  if (u.mort || u.mv <= 0) return;
  const garde = u.garde !== undefined ? G.villes.find(v => v.id === u.garde) : null;
  if (garde) {
    if (u.i !== garde.i) { if (deplacer(u, garde.i) === null) u.garde = undefined; }
    else u.ordre = 'fort';
    return;
  }
  if (u.pv < 45) {
    const v = plusProcheVille(c, u.i, x => placeLibre(u, x.i) || x.i === u.i);
    if (v && v.i !== u.i) deplacer(u, v.i); else u.ordre = 'fort';
    return;
  }
  /* Ennemis proches de nos villes. */
  let menace = -1, md = 99;
  for (const v of ctx.vs) for (const j of rayon(v.i, 4)) {
    if (OCC[j].some(x => estMil(x) && enGuerre(x.civ, c.n))) { const d = dist(u.i, j); if (d < md) { md = d; menace = j; } }
  }
  if (menace >= 0 && md <= 8) { deplacer(u, menace, true); if (!u.mort && u.mv > 0) iaCombat(c, u, 0.3); return; }
  /* Guerre : marcher sur la cible. */
  const cible = ctx.cible;
  if (cible) {
    const d = dist(u.i, cible.i);
    if (ctx.armeePrete || d <= 6) {
      if (d > (UNITES[u.type].t ? UNITES[u.type].portee : 1)) {
        const r = deplacer(u, cible.i, true);
        if (r === null) { const etape = plusProcheVille(c, cible.i); if (etape && etape.i !== u.i) deplacer(u, etape.i); }
        if (!u.mort && u.mv > 0) iaCombat(c, u, 0.4);
      } else u.ordre = 'fort';
      return;
    }
    const etape = plusProcheVille(c, cible.i);
    if (etape && dist(u.i, etape.i) > 2) { deplacer(u, etape.i); return; }
    u.ordre = 'fort';
    return;
  }
  /* Camps barbares connus près de chez nous. */
  if (!UNITES[u.type].siege) {
    let camp = -1, cd = 99;
    for (const v of ctx.vs) for (const j of rayon(v.i, 9)) if (G.tuiles[j].camp && c.vu[j]) { const d = dist(u.i, j); if (d < cd) { cd = d; camp = j; } }
    if (camp >= 0 && cd <= 14) { deplacer(u, camp, true); if (!u.mort && u.mv > 0) iaCombat(c, u, 0.5); return; }
  }
  /* Sinon : renforcer la ville la moins défendue. */
  const faible = ctx.vs.slice().sort((a, b) => defenseurs(a) - defenseurs(b))[0];
  if (faible && defenseurs(faible) < 2 && dist(u.i, faible.i) > 1) {
    const autour = voisins(faible.i).filter(j => !estEau(j) && placeLibre(u, j) && G.tuiles[j].rel < 2);
    const pos = autour.sort((a, b) => bonusTerrain(b) - bonusTerrain(a))[0];
    if (pos !== undefined) { deplacer(u, pos); return; }
  }
  u.ordre = 'fort';
}
function defenseurs(v) { let n = 0; for (const j of rayon(v.i, 1)) for (const x of OCC[j]) if (x.civ === v.civ && estMil(x)) n++; return n; }
function iaNavire(c, u, ctx) {
  if (iaCombat(c, u, 0.2)) return;
  if (u.mort || u.mv <= 0) return;
  if (ctx.cible && estCotiere(ctx.cible)) { deplacer(u, ctx.cible.i, true); if (!u.mort && u.mv > 0) iaCombat(c, u, 0.3); return; }
  if (rng() < 0.6 && iaExplorer(c, u)) return;
  const port = plusProcheVille(c, u.i, v => estCotiere(v));
  if (port && u.i !== port.i && placeLibre(u, port.i)) deplacer(u, port.i);
  else u.ordre = 'fort';
}

/* ---------- Achats ---------- */
function iaAchats(c, ctx) {
  const reserve = 60 + 30 * ereCiv(c);
  for (const v of ctx.vs) {
    if (c.or <= reserve) return;
    const it = v.file[0];
    const prix = coutAchat(v, it);
    if (prix === null || prix > c.or - reserve) continue;
    const menace = rayon(v.i, 3).some(j => OCC[j].some(x => estMil(x) && enGuerre(x.civ, c.n)));
    if (menace || (it.k === 'b' && rng() < 0.4) || (it.id === 'colon' && rng() < 0.5)) acheter(v);
  }
}

/* ---------- Tour complet d'une nation ---------- */
function iaJouer(c) {
  if (!c.rech || c.techs[c.rech]) c.rech = iaRecherche(c);
  iaDiplomatie(c);
  for (let k = 0; k < 3 && c.cult >= coutDoctrine(c) && doctrinesDispo(c).length; k++) prendreDoctrine(c, iaChoixDoctrine(c));
  const ctx = iaContexte(c);
  for (const v of ctx.vs) {
    const it = v.file[0];
    if (!it || (it.k === 'p' && PROJETS[it.id].continu && rng() < 0.25)) {
      const choix = iaChoixProduction(c, v, ctx);
      if (choix) {
        v.file = [choix];
        if (choix.k === 'u') { if (choix.id === 'colon') ctx.colons++; else if (choix.id === 'ouvrier') ctx.ouvriers++; else ctx.mil++; }
      }
    }
  }
  ctx.cible = iaCibleGuerre(c, ctx);
  iaGarnisons(c, ctx);
  const armee = ctx.us.filter(u => estMil(u) && u.garde === undefined && UNITES[u.type].classe === 'terre' && u.type !== 'eclaireur');
  ctx.armeePrete = armee.length >= 3 || (ctx.cible && G.tour - (c.guerre[ctx.cible.civ] ?? G.tour) > 12);
  const ordre = { colon: 0, ouvrier: 1, eclaireur: 2 };
  const us = ctx.us.slice().sort((a, b) => (ordre[a.type] ?? (UNITES[a.type].t ? 3 : 4)) - (ordre[b.type] ?? (UNITES[b.type].t ? 3 : 4)));
  for (const u of us) {
    if (u.mort || u.mv <= 0) continue;
    if (u.type === 'colon') iaColon(c, u, ctx);
    else if (u.type === 'ouvrier') { if (!iaOuvrier(c, u)) { const v = ctx.vs[0]; if (v && u.i !== v.i && placeLibre(u, v.i)) deplacer(u, v.i); } }
    else if (u.type === 'eclaireur') { if (!iaCombat(c, u, -0.5) && !iaExplorer(c, u)) iaMilitaire(c, u, ctx); }
    else if (UNITES[u.type].classe === 'mer') iaNavire(c, u, ctx);
    else iaMilitaire(c, u, ctx);
  }
  for (const v of villesDe(c.n)) {
    let best = null, bd = -1;
    for (const j of rayon(v.i, 2)) { const p = previsionTirVille(v, j); if (p && p.dD > bd) { bd = p.dD; best = j; } }
    if (best !== null) tirVille(v, best);
  }
  iaAchats(c, ctx);
  if (c.or > 150) for (const u of unitesDe(c.n)) if (peutMaj(u) && c.or > coutMaj(u) + 100) majUnite(u);
}

/* ---------- Barbares ---------- */
function iaBarbares(b) {
  for (const u of unitesDe(b.n)) {
    if (u.mort || u.mv <= 0) continue;
    if (iaCombat(b, u, 0.6)) continue;
    let cible = -1, bd = 99;
    for (const j of rayon(u.i, 7)) {
      if ((VIL[j] && VIL[j].civ !== b.n) || OCC[j].some(x => x.civ !== b.n)) { const d = dist(u.i, j); if (d < bd) { bd = d; cible = j; } }
    }
    if (cible >= 0) { deplacer(u, cible, true); if (!u.mort && u.mv > 0 && prevision(u, cible)) attaquer(u, cible); continue; }
    const camp = u.camp ?? u.i;
    const libres = rayon(camp, 3).filter(j => !estEau(j) && G.tuiles[j].rel < 2 && OCC[j].length === 0);
    if (libres.length) deplacer(u, libres[Math.floor(rng() * libres.length)]);
  }
}
