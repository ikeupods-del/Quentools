/* Pax Mythica — décisions des peuples gouvernés par l'ordinateur : économie (âges, bâtiments, recrutement), marches et conquêtes,
   diplomatie (guerres, paix, alliances) et pouvoirs divins. Appelé chaque mois par PM.mois (moteur.js). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const alea = E => PM.alea(E);

  const provincesDe = (j, n) => j.etat.provinces.filter(p => p.owner === n);
  const enGuerreAvec = (j, n) => j.etat.guerres.filter(w => w.a === n || w.b === n).map(w => w.a === n ? w.b : w.a);
  // peuples qui touchent n (par la terre ou la mer)
  function frontaliers(j, n) {
    const s = new Set();
    for (const p of provincesDe(j, n)) for (const v of PM.voisins(j, p.id)) { const o = j.etat.provinces[v.p].owner; if (o >= 0 && o !== n) s.add(o); }
    return [...s];
  }
  PM.frontaliers = frontaliers;

  // ---------- économie ----------
  function recruterUnites(j, N, budget, lieu) {
    const E = j.etat, dispo = PM.unitesDispo(j, N.id), ennemis = enGuerreAvec(j, N.id);
    const mythesEnnemis = E.armees.some(a => ennemis.includes(a.owner) && Object.keys(a.unites).some(u => PM.UNITES[u].cat === 'mythe'));
    const remparts = E.provinces.some(p => ennemis.includes(p.owner) && p.bat.remparts);
    const poids = id => { const c = PM.UNITES[id].cat; return { inf: 3, archer: 2, cav: 2, heros: mythesEnnemis ? 2 : 0.6, siege: remparts ? 1.2 : 0.2, mythe: N.res.faveur > 40 ? 2.5 : 0.8 }[c] || 1; };
    let n = 0;
    for (let essai = 0; essai < 6; essai++) {
      const tot = dispo.reduce((s, id) => s + poids(id), 0); let r = alea(E) * tot, id = dispo[0];
      for (const x of dispo) { r -= poids(x); if (r <= 0) { id = x; break; } }
      const c = PM.coutUnite(j, N.id, id), cher = PM.RESSOURCES.reduce((s, k) => s + (c[k] || 0), 0);
      const nombre = Math.max(1, Math.min(8, Math.floor(budget / Math.max(1, cher))));
      const res = PM.recruter(j, N.id, lieu, id, nombre);
      if (res.ok) { n += res.nombre; budget -= cher * res.nombre; }
      if (budget <= 40) break;
    }
    return n;
  }
  function lieuRecrutement(j, N) {
    const E = j.etat, ennemis = enGuerreAvec(j, N.id), miennes = provincesDe(j, N.id).filter(p => !p.siege);
    if (ennemis.length) {
      const front = miennes.filter(p => PM.voisins(j, p.id).some(v => ennemis.includes(E.provinces[v.p].owner)));
      const avecArmee = front.filter(p => E.armees.some(a => a.owner === N.id && a.prov === p.id));
      if (avecArmee.length) return avecArmee[0].id;
      if (front.length) return front.sort((a, b) => b.dev - a.dev)[0].id;
    }
    return E.provinces[N.capitale] && E.provinces[N.capitale].owner === N.id && !E.provinces[N.capitale].siege ? N.capitale : (miennes[0] || {}).id;
  }
  const valeurBatiment = (j, P, b, N) => {
    const B = PM.BATIMENTS[b], t = (B.terrain && B.terrain[P.terrain]) || 1;
    if (b === 'ferme') return 3 * t * (N.res.nourriture < 400 ? 1.4 : 1);
    if (b === 'scierie') return 2.6 * t * (N.res.bois < 200 ? 1.4 : 0.8);
    if (b === 'mine') return 2.8 * t;
    if (b === 'temple') return PM.bilan(j, N.id).net.faveur < 2 ? 3.5 : 1;
    if (b === 'remparts') return P.id === N.capitale ? 2.5 : PM.voisins(j, P.id).some(v => { const o = j.etat.provinces[v.p].owner; return o >= 0 && o !== N.id; }) ? 1.2 : 0;
    return 0;
  };
  function economie(j, N) {
    const E = j.etat, n = N.id, ennemis = enGuerreAvec(j, n);
    if (N.age < 3 && !N.ageCours && PM.peutPayer(N, PM.AGES[N.age + 1].cout, ennemis.length ? 1.6 : 1.1)) PM.avancerAge(j, n);
    // armée voulue : tenir ses provinces et égaler ses voisins
    const force = PM.force(j, n), provs = provincesDe(j, n).length;
    let menace = 0; for (const m of frontaliers(j, n)) menace = Math.max(menace, PM.force(j, m) * (ennemis.includes(m) ? 1.2 : PM.relation(j, n, m) < -20 ? 0.8 : 0.5));
    const voulue = Math.max(provs * 22 + 60, menace * (0.8 + N.agress * 0.4)) * (1 + N.age * 0.25);
    const reserveAge = N.age < 3 && !N.ageCours && !ennemis.length ? PM.AGES[N.age + 1].cout : {};
    const libre = r => Math.max(0, N.res[r] - (reserveAge[r] || 0) * 0.8);
    if (force < voulue) {
      const budget = (libre('nourriture') + libre('or') + libre('bois') + N.res.faveur) * (ennemis.length ? 0.7 : 0.45);
      const lieu = lieuRecrutement(j, N); if (lieu != null && budget > 60) recruterUnites(j, N, budget, lieu);
    }
    // merveille, puis le meilleur bâtiment rentable, puis développement
    if (N.age === 3 && !N.merveille && !E.provinces.some(p => p.merveille && p.owner === n) && PM.peutPayer(N, PM.coutBatiment(j, n, 'merveille'), 1.05)) PM.construireMerveille(j, n, N.capitale);
    for (let k = 0; k < 2; k++) {
      let best = null, bs = 0;
      for (const P of provincesDe(j, n)) for (const b in PM.BATIMENTS) {
        if (P.bat[b] || (PM.BATIMENTS[b].age || 0) > N.age) continue;
        const c = PM.coutBatiment(j, n, b); if (!PM.RESSOURCES.every(r => !c[r] || libre(r) >= c[r])) continue;
        const s = valeurBatiment(j, P, b, N) * P.dev * (0.85 + alea(E) * 0.3) / (1 + PM.RESSOURCES.reduce((t, r) => t + (c[r] || 0), 0) / 100);
        if (s > bs) { bs = s; best = [P.id, b]; }
      }
      if (best) PM.construire(j, n, best[0], best[1]); else break;
    }
    if (N.res.nourriture > 900 && N.res.or > 400) {
      const P = provincesDe(j, n).filter(p => p.dev < 5).sort((a, b) => (b.id === N.capitale) - (a.id === N.capitale) || a.dev - b.dev)[0];
      if (P) PM.developper(j, n, P.id);
    }
  }

  // ---------- armées ----------
  function armees(j, N) {
    const E = j.etat, n = N.id, ennemis = enGuerreAvec(j, n);
    const lieux = new Set(E.armees.filter(a => a.owner === n && !a.chemin.length).map(a => a.prov));
    for (const p of lieux) PM.regrouper(j, n, p);
    for (const a of E.armees.filter(x => x.owner === n && !x.chemin.length && !x.paralysie)) {
      const P = E.provinces[a.prov];
      if (P.owner !== n && PM.hostile(j, n, P.owner)) continue; // siège en cours
      const d = PM.distances(j, n, a.prov, 14), moi = PM.puissance(a);
      let best = -1, bs = 0;
      for (const Q of E.provinces) {
        if (Q.id === a.prov || d[Q.id] === Infinity) continue;
        let s = 0;
        if (Q.owner === n || PM.allies(j, n, Q.owner)) {
          const intrus = E.armees.filter(b => b.prov === Q.id && PM.enGuerre(j, n, b.owner)).reduce((t, b) => t + PM.puissance(b), 0);
          if (intrus > 0 && moi > intrus * 0.8) s = (Q.owner === n ? 30 : 12) / (1 + d[Q.id] * 0.5);
        } else if (PM.hostile(j, n, Q.owner)) {
          const def = PM.defenseProvince(j, Q.id, n);
          if (moi < def * 1.3 + 8) continue;
          if (Q.owner < 0) { if (d[Q.id] > 9) continue; s = (4 + Q.dev * 2) * (ennemis.length ? 0.5 : 1); }
          else s = 7 + Q.dev * 3 + (E.nations[Q.owner].capitale === Q.id ? 8 : 0) + (Q.merveille ? 20 : 0);
          s /= 1 + d[Q.id] * 0.7;
        }
        if (s > bs) { bs = s; best = Q.id; }
      }
      if (best >= 0) { PM.ordonner(j, a.id, best); continue; }
      // rien à prendre : se poster à la frontière d'un ennemi
      if (ennemis.length && !PM.voisins(j, a.prov).some(v => ennemis.includes(E.provinces[v.p].owner))) {
        const front = provincesDe(j, n).filter(p => PM.voisins(j, p.id).some(v => ennemis.includes(E.provinces[v.p].owner))).sort((x, y) => d[x.id] - d[y.id])[0];
        if (front && d[front.id] < Infinity) PM.ordonner(j, a.id, front.id);
      }
    }
  }

  // ---------- diplomatie ----------
  function diplomatie(j, N) {
    const E = j.etat, n = N.id, ennemis = enGuerreAvec(j, n), dif = E.reglages.difficulte == null ? 1 : E.reglages.difficulte;
    if (E.mois >= (E.reglages.paixInitiale == null ? 12 : E.reglages.paixInitiale) && ennemis.length < (N.agress > 0.65 ? 2 : 1)) {
      let best = -1, bp = 0;
      for (const m of frontaliers(j, n)) {
        if (PM.treve(j, n, m) || PM.enGuerre(j, n, m)) continue;
        // un pacte retient, sauf un peuple sans scrupules qui hait son partenaire
        if (PM.lies(j, n, m) && !(N.agress > 0.8 && PM.relation(j, n, m) < -30)) continue;
        // une longue paix rend les peuples moins prudents (sinon le monde se fige quand tous sont au maximum)
        const ratio = (PM.force(j, n) + 1) / (PM.force(j, m) + 1), rel = PM.relation(j, n, m), calme = Math.min(0.4, (E.mois - N.dernierePaix) / 12 * 0.03);
        if (ratio < 1.3 - calme || rel > 15 + calme * 50) continue;
        let p = N.agress * 0.35 * Math.min(2, Math.max(0.15, ratio - 1 + calme)) * (rel < -20 ? 1.5 : 1);
        if (m === E.joueur) p *= [0.4, 1, 1.5][dif];
        if (p > bp) { bp = p; best = m; }
      }
      if (best >= 0 && alea(E) < bp) PM.declarerGuerre(j, n, best);
    }
    pactes(j, N);
  }
  // pactes : on quitte ceux qui lient à un peuple détesté, on appelle ses alliés quand la guerre tourne mal, on forme des ligues
  function pactes(j, N) {
    const E = j.etat, n = N.id;
    for (const p of PM.pactesDe(j, n)) if (p.membres.some(m => m !== n && PM.relation(j, n, m) < -25)) { PM.quitterPacte(j, n, p.id); return; }
    for (const w of E.guerres.filter(x => x.a === n || x.b === n)) {
      const ennemi = w.a === n ? w.b : w.a;
      if (PM.scoreGuerre(j, n, ennemi) > 0 && PM.force(j, n) > PM.force(j, ennemi)) continue;
      for (const p of PM.pactesDe(j, n)) for (const m of p.membres) if (m !== n && PM.rangEntre(j, n, m) >= 2 && !(w.appels || []).includes(m) && !PM.enGuerre(j, m, ennemi)) PM.appelerAuxArmes(j, n, m, ennemi);
    }
    if (alea(E) > 0.45) return;
    // 1. alliance : inviter dans la sienne, demander à entrer dans celle d'un autre, ou en fonder une à deux
    const mienne = PM.allianceDe(j, n), max = PM.tailleMaxAlliance(j);
    let best = null;
    for (const M of E.nations) {
      if (!M.vivante || M.id === n || PM.enGuerre(j, n, M.id)) continue;
      const sienne = PM.allianceDe(j, M.id);
      if (mienne && (sienne || mienne.membres.length >= max)) continue;
      const type = mienne ? mienne.type : sienne ? sienne.type : N.agress > 0.6 && M.agress > 0.5 ? 'totale' : 'defensive';
      if (sienne && sienne.membres.length >= max) continue;
      if (!PM.avisPacte(j, n, M.id, type, null).ok) continue;
      const juge = sienne ? sienne.chef : M.id;
      const avis = E.nations[juge].ia ? PM.avisPacte(j, juge, n, type, mienne || sienne) : { score: 31, ok: true };
      if (avis.ok && (!best || avis.score > best.score)) best = { m: M.id, type, score: avis.score };
    }
    // 2. sinon, une promesse de non-agression avec un voisin
    if (!best) for (const m of frontaliers(j, n)) {
      if (PM.lies(j, n, m) || PM.enGuerre(j, n, m) || !PM.avisPacte(j, n, m, 'nonagression', null).ok) continue;
      const avis = E.nations[m].ia ? PM.avisPacte(j, m, n, 'nonagression', null) : { ok: true, score: 31 };
      if (avis.ok && (!best || avis.score > best.score)) best = { m, type: 'nonagression', score: avis.score };
    }
    if (!best || (!E.nations[best.m].ia && E.attente.some(a => a.type === 'pacte' && a.de === n))) return;
    PM.proposerPacte(j, n, best.m, best.type, null);
  }
  function paix(j) {
    const E = j.etat;
    for (const w of E.guerres.slice()) {
      const A = E.nations[w.a], B = E.nations[w.b], duree = E.mois - w.debut;
      if (A.ia && B.ia) {
        if ((duree > 12 && Math.abs(w.score) >= 4 && alea(E) < 0.1) || (duree > 40 && alea(E) < 0.05)) PM.faireLaPaix(j, w.a, w.b);
        continue;
      }
      const ia = A.ia ? A : B, joueur = A.ia ? B : A;
      if (duree > 6 && PM.accepteraitPaix(j, ia.id, joueur.id) && PM.scoreGuerre(j, ia.id, joueur.id) < 0 && alea(E) < 0.08 && E.mois - (ia.derniereOffre || -99) > 12 && !E.attente.some(a => a.type === 'paix' && a.de === ia.id)) {
        ia.derniereOffre = E.mois; E.attente.push({ type: 'paix', nation: joueur.id, de: ia.id });
      }
    }
  }

  // ---------- pouvoirs divins ----------
  function pouvoirs(j, N) {
    const E = j.etat, n = N.id, ennemis = enGuerreAvec(j, n);
    if (E.reglages.mythes === false) return;
    for (const pid of Object.keys(N.pouvoirs)) {
      if (N.pouvoirs[pid] > 0 || N.res.faveur < PM.coutPouvoir(j, n, pid) || alea(E) > 0.35) continue;
      const Pw = PM.POUVOIRS[pid], f = Pw.effet; let cible = null;
      if (Pw.cible === 'aucune') {
        if (f.ressources || f.diplo) cible = -1;
        else if ((f.invoquer || f.bonus) && ennemis.length) cible = -1;
        else if (f.temps && Object.values(N.pouvoirs).filter(x => x > 6).length >= 2) cible = -1;
      } else if (Pw.cible === 'nation') {
        const m = ennemis.sort((a, b) => PM.force(j, b) - PM.force(j, a))[0];
        if (m != null) cible = m;
      } else if (Pw.cible === 'propre') {
        if (f.soin) { const a = E.armees.filter(x => x.owner === n && E.provinces[x.prov].owner === n).sort((x, y) => PM.puissance(y) - PM.puissance(x))[0]; if (a && ennemis.length) cible = a.prov; }
        else if (f.gainDev) { const P = provincesDe(j, n).filter(p => p.dev < 5).sort((a, b) => b.dev - a.dev)[0]; if (P) cible = P.id; }
        else if (ennemis.length) { const C = E.provinces[N.capitale]; if (C && !C.bouclier) cible = C.id; }
      } else if (ennemis.length) {
        let best = -1, bs = 25;
        for (const P of E.provinces) {
          if (PM.cibleValide(j, n, pid, P.id)) continue;
          const s = E.armees.filter(a => a.prov === P.id && PM.enGuerre(j, n, a.owner)).reduce((t, a) => t + PM.puissance(a), 0) + (f.batiments ? Object.keys(P.bat).length * 15 : 0) + (f.vortex ? -PM.defenseProvince(j, P.id, n) + PM.force(j, n) * 0.5 : 0);
          if (s > bs) { bs = s; best = P.id; }
        }
        if (best >= 0) cible = best;
      }
      if (cible !== null && PM.lancerPouvoir(j, n, pid, cible).ok) return;
    }
  }

  PM.ia = {
    mois(j) {
      const E = j.etat;
      for (const N of E.nations) {
        if (!N.vivante || !N.ia) continue;
        if ((E.mois + N.id) % 2 === 0) economie(j, N);
        armees(j, N);
        if ((E.mois + N.id * 5) % 6 === 0) diplomatie(j, N);
        pouvoirs(j, N);
      }
      paix(j);
    },
    economie, armees, diplomatie, pouvoirs
  };
})(typeof window !== 'undefined' ? window : globalThis);
