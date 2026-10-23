/* Pax Mythica — moteur du jeu (sans affichage, essayé par tests/moteur.js) : création de partie, mois qui passe (économie, âges,
   marches, batailles, sièges, conquêtes), ordres (recruter, construire, marcher), diplomatie, pouvoirs divins, événements, victoire.
   Une partie = { etat (données sauvegardées, JSON simple), carte (régénérée depuis la graine), anims (effets à montrer, non sauvegardés) }. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const R = PM.RESSOURCES;

  // ---------- hasard reproductible (l'état du tirage est sauvegardé avec la partie) ----------
  function alea(E) { E.alea = (E.alea + 0x6D2B79F5) >>> 0; let t = E.alea; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const choix = (E, l) => l[Math.floor(alea(E) * l.length)];
  PM.alea = alea;

  const nat = (j, n) => j.etat.nations[n];
  const vivantes = j => j.etat.nations.filter(n => n.vivante);
  PM.date = m => `An ${Math.floor(m / 12) + 1}, ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][m % 12]}`;
  const fmt = n => String(Math.round(n));
  function journal(j, texte, type, nations) {
    const E = j.etat; E.journal.push({ mois: E.mois, texte, type: type || 'info', nations: nations || [] });
    if (E.journal.length > 400) E.journal.splice(0, E.journal.length - 400);
  }
  PM.journal = journal;
  const anim = (j, a) => { (j.anims = j.anims || []).push(Object.assign({ t: 0 }, a)); };

  // ---------- relations et diplomatie ----------
  const cle = (a, b) => a < b ? a + '-' + b : b + '-' + a;
  PM.guerre = (j, a, b) => j.etat.guerres.find(w => (w.a === a && w.b === b) || (w.a === b && w.b === a));
  PM.enGuerre = (j, a, b) => a !== b && a >= 0 && b >= 0 && !!PM.guerre(j, a, b);
  // alliances et pactes : alliances.js (PM.allies, PM.lies, appels aux armes)
  PM.treve = (j, a, b) => { const t = j.etat.treves[cle(a, b)]; return t && t > j.etat.mois; };
  // a peut-il combattre ce propriétaire ? (les terres libres, -1, se conquièrent sans déclaration)
  PM.hostile = (j, a, b) => a !== b && (b < 0 || PM.enGuerre(j, a, b));
  PM.relation = (j, a, b) => a === b ? 100 : (nat(j, a).relations[b] || 0);
  function changerRelation(j, a, b, d) {
    if (a === b || a < 0 || b < 0) return;
    for (const [x, y] of [[a, b], [b, a]]) { const N = nat(j, x); N.relations[y] = Math.max(-100, Math.min(100, (N.relations[y] || 0) + d)); }
  }
  PM.changerRelation = changerRelation;
  const passable = (j, n, p) => { const o = j.etat.provinces[p].owner; return o === n || o < 0 || PM.allies(j, n, o) || PM.enGuerre(j, n, o); };
  PM.passable = passable;

  // ---------- carte : voisins et chemins ----------
  const voisins = (j, p) => j.carte.provinces[p].voisins.map(v => ({ p: v, mer: false })).concat(j.carte.provinces[p].mer.map(v => ({ p: v, mer: true })));
  PM.voisins = voisins;
  PM.estVoisin = (j, a, b) => j.carte.provinces[a].voisins.includes(b) || j.carte.provinces[a].mer.includes(b);
  const coutEntree = (j, p, mer) => PM.TERRAINS[j.etat.provinces[p].terrain].move + (mer ? 1.5 : 0);
  // plus court chemin pour le peuple n (Dijkstra) ; null si impossible
  PM.chemin = function (j, n, de, vers, max) {
    if (de === vers) return [];
    if (!passable(j, n, vers)) return null;
    const P = j.etat.provinces.length, d = new Float64Array(P).fill(Infinity), prev = new Int32Array(P).fill(-1), fait = new Uint8Array(P);
    d[de] = 0;
    for (;;) {
      let u = -1, m = Infinity; for (let i = 0; i < P; i++) if (!fait[i] && d[i] < m) { m = d[i]; u = i; }
      if (u < 0 || (max && m > max)) return null;
      if (u === vers) break;
      fait[u] = 1;
      // on ne traverse pas une province hostile occupée (on s'y arrête) : seule la destination peut l'être
      if (u !== de && j.etat.provinces[u].owner !== n && !PM.allies(j, n, j.etat.provinces[u].owner)) continue;
      for (const v of voisins(j, u)) { if (!passable(j, n, v.p)) continue; const c = m + coutEntree(j, v.p, v.mer); if (c < d[v.p]) { d[v.p] = c; prev[v.p] = u; } }
    }
    const ch = []; for (let x = vers; x !== de; x = prev[x]) ch.unshift(x);
    return ch;
  };
  // distances depuis une province (pour l'IA) : coût jusqu'à chaque province atteignable
  PM.distances = function (j, n, de, max) {
    const P = j.etat.provinces.length, d = new Float64Array(P).fill(Infinity), fait = new Uint8Array(P); d[de] = 0;
    for (;;) {
      let u = -1, m = Infinity; for (let i = 0; i < P; i++) if (!fait[i] && d[i] < m) { m = d[i]; u = i; }
      if (u < 0 || m > (max || 99)) break; fait[u] = 1;
      if (u !== de && j.etat.provinces[u].owner !== n && !PM.allies(j, n, j.etat.provinces[u].owner)) continue;
      for (const v of voisins(j, u)) { if (!passable(j, n, v.p)) continue; const c = m + coutEntree(j, v.p, v.mer); if (c < d[v.p]) d[v.p] = c; }
    }
    return d;
  };

  // ---------- unités, armées, forces ----------
  const U = id => PM.UNITES[id];
  PM.unitesDispo = function (j, n) {
    const N = nat(j, n), P = PM.PANTHEONS[N.pantheon], l = [];
    for (const id of P.unites) if (U(id).age <= N.age) l.push(id);
    if (j.etat.reglages.mythes !== false) P.mineurs.forEach((age, i) => age.forEach(g => { if (N.mineurs.includes(g.id) && !l.includes(g.unite)) l.push(g.unite); }));
    return l;
  };
  const majeur = N => PM.PANTHEONS[N.pantheon].majeurs.find(d => d.id === N.dieu) || PM.PANTHEONS[N.pantheon].majeurs[0];
  PM.majeur = majeur;
  const bonus = (N, k) => (majeur(N).bonus[k] || 0);
  const effet = (N, k) => N.effets.reduce((s, e) => s + (e.cle === k ? e.valeur : 0), 0);
  PM.coutUnite = function (j, n, id) {
    const N = nat(j, n), u = U(id), m = 1 + (u.cat === 'cav' ? bonus(N, 'coutCav') : 0) + (u.cat === 'mythe' ? bonus(N, 'coutMythe') : 0), c = {};
    for (const r in u.cout) c[r] = Math.round(u.cout[r] * m);
    return c;
  };
  PM.coutBatiment = function (j, n, b) {
    const N = nat(j, n), m = 1 + bonus(N, 'coutBatiment') - (N.pantheon === 'egyptiens' ? 0.2 : 0), c = {};
    const base = b === 'merveille' ? PM.MERVEILLE.cout : PM.BATIMENTS[b].cout;
    for (const r in base) c[r] = Math.round(base[r] * (r === 'faveur' ? 1 : m));
    return c;
  };
  PM.coutPouvoir = (j, n, pid) => Math.round(PM.POUVOIRS[pid].cout * (1 + bonus(nat(j, n), 'coutPouvoir')));
  PM.coutDev = (j, p) => { const d = j.etat.provinces[p].dev; return { nourriture: 70 * d, bois: 30 * d, or: 40 * d }; };
  const peutPayer = (N, c, x = 1) => R.every(r => !c[r] || N.res[r] >= c[r] * x - 1e-9);
  PM.peutPayer = peutPayer;
  const payer = (N, c, x = 1) => { for (const r in c) N.res[r] -= c[r] * x; };
  PM.texteCout = (c, x = 1) => R.filter(r => c[r]).map(r => fmt(c[r] * x) + ' ' + PM.ICONES[r]).join('  ') || 'gratuit';

  const total = a => Object.values(a.unites).reduce((s, x) => s + x, 0);
  PM.effectif = total;
  PM.popArmee = a => Object.entries(a.unites).reduce((s, [id, c]) => s + c * U(id).pop, 0);
  PM.pop = (j, n) => j.etat.armees.reduce((s, a) => s + (a.owner === n ? PM.popArmee(a) : 0), 0);
  PM.popMax = (j, n) => j.etat.provinces.reduce((s, p) => s + (p.owner === n ? 5 + 2 * p.dev + (p.id === nat(j, n).capitale ? 10 : 0) : 0), 0);
  const puissanceUnites = (u, n) => Object.entries(u).reduce((s, [id, c]) => s + c * Math.sqrt(U(id).att * U(id).pv), 0) * (n || 1);
  PM.puissance = a => puissanceUnites(a.unites);
  PM.force = (j, n) => j.etat.armees.reduce((s, a) => s + (a.owner === n ? PM.puissance(a) : 0), 0);
  PM.defenseProvince = (j, p, contre) => {
    const P = j.etat.provinces[p]; let f = puissanceUnites({ milice: P.garnison });
    for (const a of j.etat.armees) if (a.prov === p && PM.hostile(j, contre, a.owner) && a.owner === P.owner) f += PM.puissance(a);
    for (const a of j.etat.armees) if (a.prov === p && a.owner !== P.owner && PM.hostile(j, contre, a.owner)) f += PM.puissance(a);
    return f * (1 + PM.TERRAINS[P.terrain].def + (P.bat.remparts ? 0.5 : 0));
  };
  const vitesse = (j, a) => {
    let v = Infinity; for (const id in a.unites) if (a.unites[id] > 0.05) v = Math.min(v, U(id).vitesse || 1);
    return (v === Infinity ? 1 : v) * (1 + bonus(nat(j, a.owner), 'vitesse') + effet(nat(j, a.owner), 'vitesse'));
  };
  PM.vitesse = vitesse;
  function nouvelleArmee(j, owner, prov, unites) {
    const E = j.etat, a = { id: ++E.seqArmee, owner, prov, unites: Object.assign({}, unites), chemin: [], avance: 0, paralysie: 0 };
    E.armees.push(a); return a;
  }
  function armeeAuRepos(j, n, p) { return j.etat.armees.find(a => a.owner === n && a.prov === p && !a.chemin.length) || nouvelleArmee(j, n, p, {}); }
  function ajouterUnites(j, n, p, id, c) { const a = armeeAuRepos(j, n, p); a.unites[id] = (a.unites[id] || 0) + c; return a; }
  PM.ajouterUnites = ajouterUnites;
  function nettoyerArmees(j) {
    const E = j.etat;
    for (const a of E.armees) for (const id in a.unites) if (a.unites[id] < 0.05) delete a.unites[id];
    E.armees = E.armees.filter(a => total(a) >= 0.3 && nat(j, a.owner).vivante);
  }

  // ---------- création d'une partie ----------
  PM.REGLAGES = { graine: 1, taille: 'moyenne', forme: 'continent', terre: 0.48, depart: 3, ressources: 'normales', ageDepart: 0, mythes: true, evenements: 1, difficulte: 1, neutres: 1, paixInitiale: 24,
    victoire: { conquete: true, merveille: true, annees: 0 } };
  PM.RES_DEPART = { faibles: { nourriture: 150, bois: 100, or: 80, faveur: 10 }, normales: { nourriture: 300, bois: 220, or: 200, faveur: 25 }, riches: { nourriture: 800, bois: 600, or: 600, faveur: 80 } };
  // nations proposées : n peuples, panthéons alternés, noms et couleurs distincts
  PM.nationsParDefaut = function (n, graine, joueurPantheon) {
    const rnd = PM.aleatoire(graine * 31 + 5), ids = Object.keys(PM.PANTHEONS), pris = new Set(), l = [];
    for (let i = 0; i < n; i++) {
      const pa = i === 0 && joueurPantheon ? joueurPantheon : ids[(i + Math.floor(rnd() * 4)) % 4];
      const noms = PM.NOMS_PEUPLES[pa].filter(x => !pris.has(x)); const nom = noms.length ? noms[Math.floor(rnd() * noms.length)] : PM.PANTHEONS[pa].nom + ' ' + (i + 1); pris.add(nom);
      l.push({ nom, couleur: PM.COULEURS[i % PM.COULEURS.length], pantheon: pa, dieu: PM.PANTHEONS[pa].majeurs[Math.floor(rnd() * 3)].id, ia: i !== 0, agress: +(0.3 + rnd() * 0.6).toFixed(2) });
    }
    return l;
  };

  PM.nouvellePartie = function (r, carte) {
    const reglages = Object.assign({}, PM.REGLAGES, r, { victoire: Object.assign({}, PM.REGLAGES.victoire, r && r.victoire) });
    if (!reglages.nations || reglages.nations.length < 2) reglages.nations = PM.nationsParDefaut(reglages.nombre || 5, reglages.graine);
    const C = carte || PM.genererCarte(reglages);
    const E = { version: 1, reglages, alea: (reglages.graine * 2654435761) >>> 0, mois: 0, joueur: reglages.joueur || 0, nations: [], provinces: [], armees: [], guerres: [], pactes: [], seqPacte: 0, treves: {}, journal: [], attente: [], fin: null, seqArmee: 0, prochainEvt: 8 };
    const j = { etat: E, carte: C, anims: [] };
    E.provinces = C.provinces.map(p => ({ id: p.id, nom: '', terrain: p.terrain, owner: -1, dev: 1, bat: {}, garnison: 0, siege: null, bouclier: 0, merveille: false }));
    reglages.nations.forEach((d, i) => {
      const pa = PM.PANTHEONS[d.pantheon] ? d.pantheon : 'grecs';
      E.nations.push({ id: i, nom: String(d.nom || PM.PANTHEONS[pa].nom).slice(0, 40), couleur: d.couleur || PM.COULEURS[i % 12], pantheon: pa, dieu: PM.PANTHEONS[pa].majeurs.some(g => g.id === d.dieu) ? d.dieu : PM.PANTHEONS[pa].majeurs[0].id,
        ia: i !== E.joueur, agress: d.agress == null ? 0.5 : +d.agress, age: 0, ageCours: null, mineurs: [], res: Object.assign({}, PM.RES_DEPART[reglages.ressources] || PM.RES_DEPART.normales),
        capitale: -1, vivante: true, relations: {}, pouvoirs: {}, effets: [], merveille: null, stats: { batailles: 0, victoires: 0, conquetes: 0 }, dernierePaix: 0, parole: 60 });
    });
    // capitales éloignées les unes des autres, sur de bonnes terres
    const P = C.provinces, libres = new Set(P.map(p => p.id)), rnd = () => alea(E);
    const bonne = p => (P[p].terrain === 'plaine' ? 1.2 : P[p].terrain === 'montagne' ? 0.6 : 1) * (P[p].voisins.length >= 3 ? 1 : 0.7);
    for (const N of E.nations) {
      let best = -1, bs = -1;
      for (const p of libres) {
        const caps = E.nations.filter(x => x.capitale >= 0).map(x => x.capitale);
        const d = caps.length ? Math.min(...caps.map(c => Math.hypot(P[c].lx - P[p].lx, P[c].ly - P[p].ly))) : 300 + rnd() * 400;
        const s = d * bonne(p) * (0.85 + rnd() * 0.3); if (s > bs) { bs = s; best = p; }
      }
      N.capitale = best; libres.delete(best); E.provinces[best].owner = N.id;
    }
    // chaque peuple s'étend autour de sa capitale
    for (let tour = 1; tour < Math.max(1, reglages.depart); tour++) for (const N of E.nations) {
      const cand = [];
      for (const p of E.provinces) if (p.owner === N.id) for (const v of P[p.id].voisins) if (E.provinces[v].owner < 0 && !cand.includes(v)) cand.push(v);
      if (cand.length) { const v = cand.sort((a, b) => Math.hypot(P[a].lx - P[N.capitale].lx, P[a].ly - P[N.capitale].ly) - Math.hypot(P[b].lx - P[N.capitale].lx, P[b].ly - P[N.capitale].ly))[0]; E.provinces[v].owner = N.id; }
    }
    // noms selon la culture du premier occupant, niveaux, bâtiments, garnisons
    const pris = new Set(), rn = PM.aleatoire(reglages.graine * 97 + 3);
    for (const p of E.provinces) {
      const N = p.owner >= 0 ? nat(j, p.owner) : null;
      p.nom = (reglages.noms && reglages.noms[p.id]) || PM.nomDe(rn, N ? N.pantheon : 'tribus', pris);
      p.dev = N && N.capitale === p.id ? 3 : 1 + (rnd() < 0.35 ? 1 : 0);
      if (N && N.capitale === p.id) p.bat = { ferme: 1, temple: 1 };
      p.garnison = p.owner < 0 ? Math.round((2 + p.dev * 2) * (reglages.neutres == null ? 1 : reglages.neutres)) : 1 + p.dev;
    }
    for (const N of E.nations) {
      for (const M of E.nations) if (M.id !== N.id) N.relations[M.id] = (M.pantheon === N.pantheon ? 15 : 0) + Math.round((PM.aleatoire(reglages.graine + N.id * 13 + M.id * 7)() - 0.5) * 20);
      N.pouvoirs[majeur(N).pouvoir] = 0;
      for (let a = 1; a <= Math.min(3, reglages.ageDepart || 0); a++) { N.age = a; choisirMineurAuto(j, N.id, true); }
      const us = PM.PANTHEONS[N.pantheon].unites, k = 1 + (reglages.ageDepart || 0) * 0.5;
      nouvelleArmee(j, N.id, N.capitale, { [us[0]]: Math.round(6 * k), [us[1]]: Math.round(4 * k), [us[2]]: Math.round(2 * k) });
    }
    for (const N of E.nations) for (const M of E.nations) if (N.id < M.id) N.relations[M.id] = M.relations[N.id] = Math.round(((N.relations[M.id] || 0) + (M.relations[N.id] || 0)) / 2);
    journal(j, `Les dieux regardent le monde. ${E.nations.length} peuples se partagent les terres.`, 'info');
    return j;
  };

  // reprise d'une sauvegarde : la carte est régénérée depuis la graine
  PM.charger = function (etat, carte) {
    const C = carte || PM.genererCarte(etat.reglages);
    if (C.provinces.length !== etat.provinces.length) throw new Error('Carte différente de la sauvegarde');
    return { etat, carte: C, anims: [] };
  };

  // après l'éditeur : capitales valides, peuples sans terre retirés
  PM.validerEditeur = function (j) {
    const E = j.etat;
    for (const N of E.nations) {
      const miennes = E.provinces.filter(p => p.owner === N.id);
      if (!miennes.length) { N.vivante = false; continue; }
      N.vivante = true;
      if (E.provinces[N.capitale] && E.provinces[N.capitale].owner === N.id) continue;
      N.capitale = miennes.sort((a, b) => b.dev - a.dev)[0].id;
    }
    for (const a of E.armees) if (E.provinces[a.prov].owner !== a.owner) a.prov = nat(j, a.owner).capitale;
    nettoyerArmees(j);
    if (!nat(j, E.joueur).vivante) return { ok: false, message: 'Ton peuple doit posséder au moins une province.' };
    return { ok: true };
  };

  // ---------- économie ----------
  PM.productionProvince = function (j, p) {
    const E = j.etat, P = E.provinces[p], T = PM.TERRAINS[P.terrain], o = {}, N = P.owner >= 0 ? nat(j, P.owner) : null;
    const m = (0.6 + 0.2 * P.dev) * (N && N.capitale === p ? 1.3 : 1) * (P.siege ? 0.3 : 1);
    for (const r of R) o[r] = (T.prod[r] || 0) * m;
    for (const b in P.bat) { const B = PM.BATIMENTS[b]; if (!B.bonus) continue; for (const r in B.bonus) o[r] += B.bonus[r] * ((B.terrain && B.terrain[P.terrain]) || 1) * (r === 'faveur' ? 1 : (P.siege ? 0.3 : 1)); }
    if (N && o.faveur) {
      const t = P.bat.temple ? 1 : 0, mult = N.pantheon === 'grecs' ? 1.5 : N.pantheon === 'nordiques' ? 0.6 : 1;
      o.faveur += t * (mult - 1 + bonus(N, 'faveurTemple'));
    }
    if (N && N.pantheon === 'atlantes') o.faveur += 0.15;
    return o;
  };
  PM.bilan = function (j, n) {
    const E = j.etat, N = nat(j, n), prod = { nourriture: 0, bois: 0, or: 0, faveur: 0.3 }, entretien = { nourriture: 0, bois: 0, or: 0, faveur: 0 };
    for (const P of E.provinces) if (P.owner === n) { const o = PM.productionProvince(j, P.id); for (const r of R) prod[r] += o[r]; }
    const dif = N.ia ? [0.8, 1, 1.25][E.reglages.difficulte == null ? 1 : E.reglages.difficulte] : 1;
    const m = 1 + bonus(N, 'production') + effet(N, 'production');
    for (const r of ['nourriture', 'bois', 'or']) prod[r] *= m * dif * (1 + bonus(N, r) + effet(N, r));
    for (const a of E.armees) if (a.owner === n) for (const id in a.unites) { const e = U(id).entretien; for (const r in e) entretien[r] += e[r] * a.unites[id]; }
    const net = {}; for (const r of R) net[r] = prod[r] - entretien[r];
    return { prod, entretien, net };
  };

  // ---------- ordres ----------
  const refus = message => ({ ok: false, message });
  PM.recruter = function (j, n, p, id, nombre) {
    const E = j.etat, N = nat(j, n), P = E.provinces[p]; nombre = Math.max(1, Math.min(50, Math.round(nombre || 1)));
    if (!P || P.owner !== n) return refus('Il faut recruter dans une de tes provinces.');
    if (!U(id) || !PM.unitesDispo(j, n).includes(id)) return refus('Cette unité n’est pas encore disponible.');
    if (P.siege) return refus('La province est assiégée.');
    if (E.armees.some(a => a.prov === p && PM.enGuerre(j, n, a.owner))) return refus('Une armée ennemie occupe la province.');
    const c = PM.coutUnite(j, n, id);
    const placeLibre = PM.popMax(j, n) - PM.pop(j, n), parPlace = U(id).pop;
    if (placeLibre < parPlace * nombre - 1e-6) { nombre = Math.floor(placeLibre / parPlace); if (nombre < 1) return refus('Population maximale atteinte : développe tes provinces ou conquiers-en.'); }
    while (nombre > 0 && !peutPayer(N, c, nombre)) nombre--;
    if (!nombre) return refus('Ressources insuffisantes (' + PM.texteCout(c) + ').');
    payer(N, c, nombre); ajouterUnites(j, n, p, id, nombre);
    return { ok: true, message: `${nombre} ${U(id).nom} recrutés à ${P.nom}.`, nombre };
  };
  PM.construire = function (j, n, p, b) {
    const E = j.etat, N = nat(j, n), P = E.provinces[p];
    if (!P || P.owner !== n) return refus('Il faut construire dans une de tes provinces.');
    if (b === 'merveille') return PM.construireMerveille(j, n, p);
    const B = PM.BATIMENTS[b]; if (!B) return refus('Bâtiment inconnu.');
    if (P.bat[b]) return refus(`${P.nom} a déjà : ${B.nom}.`);
    if ((B.age || 0) > N.age) return refus(`${B.nom} : il faut l’${PM.AGES[B.age].nom.toLowerCase()}.`);
    const c = PM.coutBatiment(j, n, b); if (!peutPayer(N, c)) return refus('Ressources insuffisantes (' + PM.texteCout(c) + ').');
    payer(N, c); P.bat[b] = 1; return { ok: true, message: `${B.nom} construit à ${P.nom}.` };
  };
  PM.construireMerveille = function (j, n, p) {
    const N = nat(j, n), P = j.etat.provinces[p];
    if (N.age < PM.MERVEILLE.age) return refus('La merveille demande l’âge mythique.');
    if (N.merveille) return refus('Ton peuple bâtit déjà une merveille.');
    if (j.etat.provinces.some(x => x.merveille && x.owner === n)) return refus('Ton peuple possède déjà une merveille.');
    const c = PM.coutBatiment(j, n, 'merveille'); if (!peutPayer(N, c)) return refus('Ressources insuffisantes (' + PM.texteCout(c) + ').');
    payer(N, c); N.merveille = { prov: p, reste: PM.MERVEILLE.duree, garde: 0 };
    journal(j, `${N.nom} entreprend une merveille à ${P.nom}.`, 'merveille', [n]);
    return { ok: true, message: `Le chantier de la merveille commence à ${P.nom} (${PM.MERVEILLE.duree} mois).` };
  };
  PM.developper = function (j, n, p) {
    const N = nat(j, n), P = j.etat.provinces[p];
    if (!P || P.owner !== n) return refus('Il faut développer une de tes provinces.');
    if (P.dev >= 5) return refus(`${P.nom} est déjà au niveau maximal.`);
    const c = PM.coutDev(j, p); if (!peutPayer(N, c)) return refus('Ressources insuffisantes (' + PM.texteCout(c) + ').');
    payer(N, c); P.dev++; return { ok: true, message: `${P.nom} passe au niveau ${P.dev}.` };
  };
  PM.avancerAge = function (j, n) {
    const N = nat(j, n);
    if (N.age >= 3) return refus('Ton peuple a atteint l’âge mythique.');
    if (N.ageCours) return refus('Le passage à l’âge suivant est déjà en cours.');
    const A = PM.AGES[N.age + 1]; if (!peutPayer(N, A.cout)) return refus('Ressources insuffisantes (' + PM.texteCout(A.cout) + ').');
    payer(N, A.cout); N.ageCours = { vers: N.age + 1, reste: A.duree };
    return { ok: true, message: `Ton peuple se prépare à l’${A.nom.toLowerCase()} (${A.duree} mois).` };
  };
  PM.mineursProposes = (j, n, age) => PM.PANTHEONS[nat(j, n).pantheon].mineurs[age - 1] || [];
  PM.choisirMineur = function (j, n, id) {
    const E = j.etat, N = nat(j, n), i = E.attente.findIndex(a => a.type === 'mineur' && a.nation === n);
    const age = i >= 0 ? E.attente[i].age : N.age, g = PM.mineursProposes(j, n, age).find(x => x.id === id);
    if (!g) return refus('Ce dieu n’est pas proposé.');
    if (i >= 0) E.attente.splice(i, 1);
    N.mineurs.push(g.id); N.pouvoirs[g.pouvoir] = 0;
    journal(j, `${N.nom} vénère désormais ${g.nom}.`, 'age', [n]);
    return { ok: true, message: `${g.nom} t’accorde ${PM.UNITES[g.unite].nom} et « ${PM.POUVOIRS[g.pouvoir].nom} ».` };
  };
  function choisirMineurAuto(j, n, silencieux) {
    const N = nat(j, n), l = PM.mineursProposes(j, n, N.age); if (!l.length) return;
    const g = l[Math.floor(alea(j.etat) * l.length)]; N.mineurs.push(g.id); N.pouvoirs[g.pouvoir] = 0;
    if (!silencieux) journal(j, `${N.nom} entre dans l’${PM.AGES[N.age].nom.toLowerCase()} et vénère ${g.nom}.`, 'age', [n]);
  }
  PM.ordonner = function (j, id, vers) {
    const E = j.etat, a = E.armees.find(x => x.id === id); if (!a) return refus('Armée introuvable.');
    if (a.paralysie > 0) return refus('Cette armée est figée par un sortilège.');
    if (vers === a.prov) { a.chemin = []; return { ok: true, message: 'L’armée reste sur place.' }; }
    const P = E.provinces[vers], o = P.owner;
    if (!passable(j, a.owner, vers)) return refus(`${P.nom} appartient à ${nat(j, o).nom} : il faut d’abord lui déclarer la guerre.`);
    const ch = PM.chemin(j, a.owner, a.prov, vers); if (!ch) return refus('Aucun chemin praticable jusqu’à ' + P.nom + '.');
    a.chemin = ch; a.avance = 0;
    return { ok: true, message: `En marche vers ${P.nom} (${ch.length} étape${ch.length > 1 ? 's' : ''}).` };
  };
  PM.scinder = function (j, id) {
    const a = j.etat.armees.find(x => x.id === id); if (!a || total(a) < 2) return refus('Armée trop petite pour être divisée.');
    const b = nouvelleArmee(j, a.owner, a.prov, {});
    for (const u in a.unites) { const m = Math.floor(a.unites[u] / 2); if (m > 0) { b.unites[u] = m; a.unites[u] -= m; } }
    if (!total(b)) { j.etat.armees.pop(); return refus('Armée trop petite pour être divisée.'); }
    return { ok: true, message: 'Armée divisée en deux.', armee: b };
  };
  PM.regrouper = function (j, n, p) {
    const l = j.etat.armees.filter(a => a.owner === n && a.prov === p && !a.chemin.length); if (l.length < 2) return refus('Rien à regrouper.');
    const a = l[0]; for (const b of l.slice(1)) { for (const u in b.unites) a.unites[u] = (a.unites[u] || 0) + b.unites[u]; b.unites = {}; a.paralysie = Math.max(a.paralysie, b.paralysie); }
    nettoyerArmees(j); return { ok: true, message: 'Armées regroupées.', armee: a };
  };
  PM.dissoudre = function (j, id) { const E = j.etat, i = E.armees.findIndex(x => x.id === id); if (i < 0) return refus('Armée introuvable.'); E.armees.splice(i, 1); return { ok: true, message: 'Armée renvoyée dans ses foyers.' }; };

  // ---------- diplomatie ----------
  // pour : l'allié au nom duquel a entre en guerre (paix commune avec lui)
  PM.declarerGuerre = function (j, a, b, raison, pour) {
    const E = j.etat;
    if (a === b || !nat(j, b) || !nat(j, b).vivante) return refus('Peuple introuvable.');
    if (PM.enGuerre(j, a, b)) return refus('Vous êtes déjà en guerre.');
    if (PM.treve(j, a, b)) return refus(`Une trêve vous lie jusqu’à ${PM.date(E.treves[cle(a, b)])}.`);
    if (PM.lies(j, a, b)) PM.trahir(j, a, b);
    E.guerres.push(Object.assign({ a, b, debut: E.mois, score: 0 }, pour != null ? { pour } : {}));
    changerRelation(j, a, b, -50);
    if (pour == null) for (const N of vivantes(j)) if (N.id !== a && N.id !== b) changerRelation(j, a, N.id, -4);
    journal(j, `⚔️ ${nat(j, a).nom} déclare la guerre à ${nat(j, b).nom}${raison ? ' : ' + raison : '.'}`, 'guerre', [a, b]);
    // alliés : défenseurs de b, et alliés totaux de a (le joueur est consulté)
    const appeles = PM.appelsDeGuerre(j, a, b);
    return { ok: true, message: `Guerre déclarée à ${nat(j, b).nom}.${appeles.length ? ' Alliés appelés : ' + appeles.map(x => nat(j, x).nom).join(', ') + '.' : ''}` };
  };
  function terminerGuerre(j, w) {
    const E = j.etat, a = w.a, b = w.b;
    E.guerres = E.guerres.filter(x => x !== w); E.treves[cle(a, b)] = E.mois + 24;
    changerRelation(j, a, b, 15); nat(j, a).dernierePaix = nat(j, b).dernierePaix = E.mois;
    // armées en terre étrangère : rentrent chez elles
    for (const ar of E.armees) if ((ar.owner === a && E.provinces[ar.prov].owner === b) || (ar.owner === b && E.provinces[ar.prov].owner === a)) { ar.prov = nat(j, ar.owner).capitale; ar.chemin = []; }
    for (const P of E.provinces) if (P.siege && ((P.siege.par === a && P.owner === b) || (P.siege.par === b && P.owner === a))) P.siege = null;
  }
  // la paix entre deux camps s'étend aux alliés entrés en guerre pour l'un d'eux
  PM.faireLaPaix = function (j, a, b) {
    const w = PM.guerre(j, a, b); if (!w) return refus('Vous n’êtes pas en guerre.');
    const { liees } = PM.campsDePaix(j, a, b), autres = liees.filter(x => x !== w);
    terminerGuerre(j, w); for (const x of autres) if (j.etat.guerres.includes(x)) terminerGuerre(j, x);
    const noms = [...new Set(autres.flatMap(x => [x.a, x.b]).filter(x => x !== a && x !== b))].map(x => nat(j, x).nom);
    journal(j, `🕊️ Paix entre ${nat(j, a).nom} et ${nat(j, b).nom}${noms.length ? ', avec leurs alliés (' + noms.join(', ') + ')' : ''}.`, 'paix', [a, b, ...autres.flatMap(x => [x.a, x.b])]);
    return { ok: true, message: `Paix signée avec ${nat(j, b === j.etat.joueur ? a : b).nom}.${noms.length ? ' Les alliés déposent aussi les armes.' : ''}` };
  };
  // point de vue de n dans la guerre contre m : > 0 si n gagne
  PM.scoreGuerre = (j, n, m) => { const w = PM.guerre(j, n, m); return w ? (w.a === n ? w.score : -w.score) : 0; };
  PM.accepteraitPaix = function (j, ia, autre) {
    const w = PM.guerre(j, ia, autre); if (!w) return false;
    const s = PM.scoreGuerre(j, ia, autre), r = (PM.force(j, ia) + 1) / (PM.force(j, autre) + 1), duree = j.etat.mois - w.debut;
    // un allié venu en renfort se lasse plus vite qu'un peuple qui défend sa terre
    const renfort = w.pour != null && w.a === ia;
    return s <= -3 || r < 0.6 || (duree > 30 && s < 3) || (duree > 60) || (renfort && duree > 12 && s <= 1);
  };
  PM.proposerPaix = function (j, n, m) {
    if (!PM.enGuerre(j, n, m)) return refus('Vous n’êtes pas en guerre.');
    if (nat(j, m).ia && !PM.accepteraitPaix(j, m, n)) { changerRelation(j, n, m, -2); return refus(`${nat(j, m).nom} refuse la paix : ils pensent gagner.`); }
    // paix séparée : l'allié pour qui l'on combattait reste en guerre et s'en souvient
    const w = PM.guerre(j, n, m), pour = w.pour != null && w.a === n ? w.pour : null;
    const r = PM.faireLaPaix(j, n, m);
    if (pour != null && PM.enGuerre(j, pour, m)) { changerRelation(j, n, pour, -15); nat(j, n).parole = Math.max(0, PM.parole(j, n) - 5); r.message += ` (paix séparée : ${nat(j, pour).nom} t’en veut).`; }
    return r;
  };
  PM.envoyerTribut = function (j, n, m, or) {
    const N = nat(j, n); or = Math.max(10, Math.round(or || 100));
    if (N.res.or < or) return refus('Pas assez d’or.');
    N.res.or -= or; nat(j, m).res.or += or; changerRelation(j, n, m, Math.min(30, or / 8));
    return { ok: true, message: `${or} or offerts à ${nat(j, m).nom} (relations ${fmt(PM.relation(j, n, m))}).` };
  };
  PM.exigerTribut = function (j, n, m) {
    const N = nat(j, n), M = nat(j, m), r = (PM.force(j, n) + 1) / (PM.force(j, m) + 1);
    if (M.ia && r < 2) { changerRelation(j, n, m, -10); return refus(`${M.nom} refuse avec mépris (il faudrait une armée deux fois plus forte que la leur).`); }
    const or = Math.round(M.res.or * 0.3); M.res.or -= or; N.res.or += or; changerRelation(j, n, m, -20);
    journal(j, `${M.nom} verse ${or} or à ${N.nom} sous la menace.`, 'diplo', [n, m]);
    return { ok: true, message: `${M.nom} cède ${or} or.` };
  };

  // ---------- pouvoirs divins ----------
  PM.pouvoirsDe = (j, n) => Object.keys(nat(j, n).pouvoirs);
  // vérifie la cible d'un pouvoir : province (ennemi/propre), peuple (nation) ou aucune
  PM.cibleValide = function (j, n, pid, cible) {
    const E = j.etat, Pw = PM.POUVOIRS[pid];
    if (Pw.cible === 'aucune') return null;
    if (Pw.cible === 'nation') return (nat(j, cible) && cible !== n && nat(j, cible).vivante) ? (PM.enGuerre(j, n, cible) || Pw.effet.discorde ? null : 'Il faut être en guerre avec ce peuple.') : 'Choisis un autre peuple.';
    const P = E.provinces[cible]; if (!P) return 'Choisis une province.';
    if (Pw.cible === 'propre') return P.owner === n ? null : 'Choisis une de tes provinces.';
    if (P.owner === n && !E.armees.some(a => a.prov === cible && PM.enGuerre(j, n, a.owner))) return 'Choisis une province ennemie (ou une armée ennemie chez toi).';
    if (P.bouclier > 0 && P.owner !== n) return `${P.nom} est protégée par les dieux.`;
    if (!PM.hostile(j, n, P.owner) && !E.armees.some(a => a.prov === cible && PM.enGuerre(j, n, a.owner))) return `Tu n’es pas en guerre contre ${nat(j, P.owner).nom}.`;
    return null;
  };
  PM.lancerPouvoir = function (j, n, pid, cible) {
    const E = j.etat, N = nat(j, n), Pw = PM.POUVOIRS[pid];
    if (E.reglages.mythes === false) return refus('Les mythes sont désactivés dans cette partie.');
    if (!Pw || !(pid in N.pouvoirs)) return refus('Tes dieux ne t’ont pas accordé ce pouvoir.');
    if (N.pouvoirs[pid] > 0) return refus(`${Pw.nom} se recharge encore ${N.pouvoirs[pid]} mois.`);
    const cout = PM.coutPouvoir(j, n, pid); if (N.res.faveur < cout) return refus(`Il faut ${cout} faveur (tu en as ${fmt(N.res.faveur)}).`);
    const err = PM.cibleValide(j, n, pid, cible); if (err) return refus(err);
    N.res.faveur -= cout; N.pouvoirs[pid] = Pw.recharge;
    const f = Pw.effet, P = Pw.cible === 'ennemi' || Pw.cible === 'propre' ? E.provinces[cible] : null, cap = N.capitale;
    const frapper = (p, part) => {
      let pertes = 0; const Q = E.provinces[p];
      if (Q.bouclier > 0 && Q.owner !== n) return 0;
      for (const a of E.armees) if (a.prov === p && PM.hostile(j, n, a.owner) && a.owner !== n) for (const u in a.unites) { const d = a.unites[u] * part; a.unites[u] -= d; pertes += d; }
      if (PM.hostile(j, n, Q.owner)) { pertes += Q.garnison * part; Q.garnison *= 1 - part; }
      return pertes;
    };
    let texte = '';
    if (f.degats) {
      let pertes = frapper(cible, f.degats);
      if (f.voisins) for (const v of voisins(j, cible)) pertes += frapper(v.p, f.voisins);
      texte += ` ${fmt(pertes)} ennemis anéantis.`;
    }
    if (f.batiments && P) { const l = Object.keys(P.bat).filter(b => b !== 'remparts'); for (let i = 0; i < f.batiments && l.length; i++) delete P.bat[l.splice(Math.floor(alea(E) * l.length), 1)[0]]; }
    if (f.remparts && P && Pw.cible === 'ennemi') delete P.bat.remparts;
    if (f.remparts && P && Pw.cible === 'propre') P.bat.remparts = 1;
    if (f.dev && P) P.dev = Math.max(1, P.dev - f.dev);
    if (f.gainDev && P) P.dev = Math.min(5, P.dev + f.gainDev);
    if (f.paralysie) for (const a of E.armees) if (a.prov === cible && PM.hostile(j, n, a.owner)) { a.paralysie = f.paralysie; a.chemin = []; }
    if (f.seduction) {
      const prise = {}; for (const a of E.armees) if (a.prov === cible && PM.enGuerre(j, n, a.owner)) for (const u in a.unites) { const d = a.unites[u] * f.seduction; a.unites[u] -= d; prise[u] = (prise[u] || 0) + d; }
      if (Object.keys(prise).length) { nouvelleArmee(j, n, cap, prise); texte += ` ${fmt(Object.values(prise).reduce((s, x) => s + x, 0))} soldats rejoignent ta capitale.`; }
    }
    if (f.malusArmees) for (const a of E.armees) if (a.owner === cible) for (const u in a.unites) a.unites[u] *= 1 - f.malusArmees;
    if (f.malus) nat(j, cible).effets.push({ cle: 'production', valeur: -f.malus.valeur, reste: f.malus.duree });
    if (f.discorde) for (const M of vivantes(j)) if (M.id !== cible) changerRelation(j, cible, M.id, -f.discorde);
    if (f.diplo) for (const M of vivantes(j)) if (M.id !== n) changerRelation(j, n, M.id, f.diplo);
    if (f.ressources) for (const r in f.ressources) N.res[r] += f.ressources[r];
    if (f.invoquer) {
      const l = f.invoquer.partout ? E.provinces.filter(p => p.owner === n).map(p => p.id) : [cap];
      for (const p of l) ajouterUnites(j, n, p, f.invoquer.unite, f.invoquer.nombre);
    }
    if (f.soin) for (const a of E.armees) if (a.owner === n && a.prov === cible) for (const u in a.unites) a.unites[u] *= 1 + f.soin;
    if (f.bouclier && P) P.bouclier = f.bouclier;
    if (f.bonus) N.effets.push({ cle: f.bonus.cle, valeur: f.bonus.valeur, reste: f.bonus.duree });
    if (f.temps) { for (const k in N.pouvoirs) if (k !== pid) N.pouvoirs[k] = 0; if (N.ageCours) N.ageCours.reste = 0; }
    if (f.vortex) { let k = 0; for (const a of E.armees) if (a.owner === n && !a.paralysie) { a.prov = cible; a.chemin = []; k++; } texte += ` ${k} armée${k > 1 ? 's' : ''} transportée${k > 1 ? 's' : ''}.`; resoudreProvince(j, cible); }
    nettoyerArmees(j);
    const cibleNom = Pw.cible === 'nation' ? nat(j, cible).nom : P ? P.nom : '';
    journal(j, `${Pw.emoji} ${N.nom} invoque ${Pw.nom}${cibleNom ? ' sur ' + cibleNom : ''}.${texte}`, 'pouvoir', [n].concat(Pw.cible === 'nation' ? [cible] : P && P.owner >= 0 ? [P.owner] : []));
    anim(j, { type: 'pouvoir', prov: P ? P.id : Pw.cible === 'nation' ? nat(j, cible).capitale : cap, emoji: Pw.emoji, pid });
    return { ok: true, message: `${Pw.nom} !${texte}` };
  };

  // ---------- batailles ----------
  // côté = { owner, armees:[], garnison (province défendue par sa milice) } ; renvoie le côté vainqueur
  function bataille(j, p, att, def) {
    const E = j.etat, P = E.provinces[p];
    const pool = cote => { const u = {}; for (const a of cote.armees) for (const k in a.unites) u[k] = (u[k] || 0) + a.unites[k]; if (cote.garnison) u.milice = (u.milice || 0) + cote.garnison; return u; };
    const A = pool(att), D = pool(def), A0 = Object.assign({}, A), D0 = Object.assign({}, D);
    const pv = u => Object.entries(u).reduce((s, [k, c]) => s + c * U(k).pv, 0);
    const pvA0 = pv(A), pvD0 = pv(D);
    if (pvA0 <= 0 || pvD0 <= 0) return pvA0 > 0 ? att : def;
    const modAtt = cote => { const N = cote.owner >= 0 ? nat(j, cote.owner) : null; return N ? 1 + effet(N, 'attaque') : 1; };
    const siege = Object.entries(A).reduce((s, [k, c]) => s + (U(k).cat === 'siege' || U(k).vsFort ? c * U(k).pop : 0), 0);
    const dN = def.owner >= 0 ? nat(j, def.owner) : null;
    const protD = 1 + PM.TERRAINS[P.terrain].def + (P.owner === def.owner && P.bat.remparts ? (siege >= 4 ? 0.2 : 0.5) : 0) + (P.owner === def.owner && P.bouclier > 0 ? 1 : 0) + (dN ? bonus(dN, 'defense') : 0);
    const coup = (src, cible, mod, prot, Nsrc) => {
      const dmg = {}, pvT = pv(cible) || 1;
      for (const [k, c] of Object.entries(src)) {
        const u = U(k); let puiss = c * u.att * mod * 0.2 * (0.85 + alea(E) * 0.3);
        if (u.cat === 'heros' && Nsrc) puiss *= 1 + bonus(Nsrc, 'attaqueHeros');
        for (const [t, ct] of Object.entries(cible)) dmg[t] = (dmg[t] || 0) + puiss * (ct * U(t).pv / pvT) * PM.mult(u.cat, U(t).cat) / prot;
      }
      return dmg;
    };
    const Na = att.owner >= 0 ? nat(j, att.owner) : null;
    for (let tour = 0; tour < 8; tour++) {
      const dD = coup(A, D, modAtt(att), protD, Na), dA = coup(D, A, modAtt(def), 1, dN);
      for (const t in dD) D[t] = Math.max(0, D[t] - dD[t] / U(t).pv);
      for (const t in dA) A[t] = Math.max(0, A[t] - dA[t] / U(t).pv);
      if (pv(A) < pvA0 * 0.3 || pv(D) < pvD0 * 0.3) break;
    }
    const rA = pv(A) / pvA0, rD = pv(D) / pvD0, gagne = rA > rD ? att : def, perd = gagne === att ? def : att;
    // pertes réparties entre les armées du côté, type par type
    const appliquer = (cote, avant, apres) => {
      for (const a of cote.armees) for (const k in a.unites) a.unites[k] *= avant[k] > 0 ? apres[k] / avant[k] : 0;
      if (cote.garnison != null) P.garnison = avant.milice ? (apres.milice || 0) : 0;
    };
    appliquer(att, A0, A); appliquer(def, D0, D);
    const morts = c => Object.values(c).reduce((s, x) => s + x, 0);
    const pertesA = morts(A0) - morts(A), pertesD = morts(D0) - morts(D);
    // le perdant se replie dans une province amie voisine, sinon il est détruit
    if (perd.armees.length) {
      const rPerd = perd === att ? rA : rD;
      const repli = voisins(j, p).map(v => v.p).find(q => { const o = E.provinces[q].owner; return o === perd.owner || PM.allies(j, perd.owner, o); });
      for (const a of perd.armees) { if (repli == null || rPerd < 0.12) a.unites = {}; else { a.prov = repli; a.chemin = []; a.avance = 0; } }
    }
    if (perd.garnison != null) P.garnison = 0;
    // statistiques, faveur nordique, score de guerre
    for (const c of [att, def]) if (c.owner >= 0) nat(j, c.owner).stats.batailles++;
    if (gagne.owner >= 0) {
      const W = nat(j, gagne.owner); W.stats.victoires++;
      if (W.pantheon === 'nordiques') W.res.faveur += (3 + (gagne === att ? pertesD : pertesA) * 0.15) * (1 + bonus(W, 'faveurBataille'));
      if (perd.owner >= 0) { const w = PM.guerre(j, gagne.owner, perd.owner); if (w) w.score += w.a === gagne.owner ? 1 : -1; }
    }
    const nom = c => c.owner >= 0 ? nat(j, c.owner).nom : 'les tribus de ' + P.nom;
    const imp = [att.owner, def.owner].filter(x => x >= 0);
    if (imp.includes(E.joueur) || pertesA + pertesD > 25) {
      journal(j, `🗡️ Bataille de ${P.nom} : ${nom(gagne)} l’emporte sur ${nom(perd)} (pertes ${fmt(gagne === att ? pertesA : pertesD)} contre ${fmt(gagne === att ? pertesD : pertesA)}).`, 'bataille', imp);
    }
    anim(j, { type: 'bataille', prov: p, gagnant: gagne.owner, joueur: imp.includes(E.joueur) });
    nettoyerArmees(j);
    return gagne;
  }
  PM.bataille = bataille;

  // affrontements d'une province : armées ennemies entre elles, puis armée contre milice (avant le siège)
  function resoudreProvince(j, p) {
    const E = j.etat, P = E.provinces[p];
    for (let tour = 0; tour < 4; tour++) {
      const ici = E.armees.filter(a => a.prov === p && PM.effectif(a) > 0.3), owners = [...new Set(ici.map(a => a.owner))];
      let x = -1, y = -1;
      // le maître des lieux défend d'abord
      const ordre = owners.sort((a, b) => (b === P.owner) - (a === P.owner));
      for (const a of ordre) { for (const b of ordre) if (PM.enGuerre(j, a, b)) { x = a; y = b; break; } if (x >= 0) break; }
      if (x < 0) break;
      const def = { owner: x, armees: ici.filter(a => a.owner === x) }, att = { owner: y, armees: ici.filter(a => a.owner === y) };
      if (x === P.owner) def.garnison = P.garnison;
      bataille(j, p, att, def);
    }
    // une armée hostile au propriétaire, seule dans la province : combat la milice puis assiège
    const ici = E.armees.filter(a => a.prov === p && PM.hostile(j, a.owner, P.owner) && PM.effectif(a) > 0.3);
    if (!ici.length) { if (P.siege && !E.armees.some(a => a.prov === p && a.owner === P.siege.par)) P.siege = null; return; }
    const par = ici[0].owner, siens = ici.filter(a => a.owner === par);
    if (E.armees.some(a => a.prov === p && a.owner === P.owner)) return;
    if (P.garnison > 0.5) { const g = bataille(j, p, { owner: par, armees: siens }, { owner: P.owner, armees: [], garnison: P.garnison }); if (g.owner !== par || g.garnison != null) return; }
    if (!P.siege || P.siege.par !== par) P.siege = { par, progres: 0 };
  }
  PM.resoudreProvince = resoudreProvince;
  PM.dureeSiege = (j, p) => { const P = j.etat.provinces[p]; return P.owner < 0 ? 1 : 1 + (P.bat.remparts ? 3 : 0) + (nat(j, P.owner).capitale === p ? 1 : 0) + (P.dev >= 4 ? 1 : 0); };

  function conquerir(j, p, n) {
    const E = j.etat, P = E.provinces[p], ancien = P.owner, N = nat(j, n);
    P.owner = n; P.siege = null; P.garnison = 0; P.bouclier = 0; N.stats.conquetes++;
    if (P.bat.remparts && alea(E) < 0.5) delete P.bat.remparts;
    for (const M of E.nations) if (M.merveille && M.merveille.prov === p) { if (M.id !== n) { journal(j, `Le chantier de la merveille de ${M.nom} tombe aux mains de ${N.nom}.`, 'merveille', [M.id, n]); M.merveille = null; } }
    if (ancien >= 0) {
      const A = nat(j, ancien), w = PM.guerre(j, n, ancien); if (w) w.score += w.a === n ? 2 : -2;
      const texte = A.capitale === p ? `🏰 ${N.nom} prend ${P.nom}, capitale de ${A.nom} !` : `${N.nom} s’empare de ${P.nom} (${A.nom}).`;
      journal(j, texte, 'conquete', [n, ancien]);
      if (A.capitale === p) {
        for (const r of R) A.res[r] *= 0.75;
        const reste = E.provinces.filter(x => x.owner === ancien).sort((a, b) => b.dev - a.dev);
        if (reste.length) A.capitale = reste[0].id;
      }
      if (!E.provinces.some(x => x.owner === ancien)) eliminer(j, ancien, n);
    } else if (n === E.joueur || alea(E) < 0.15) journal(j, `${N.nom} soumet les tribus de ${P.nom}.`, 'conquete', [n]);
    anim(j, { type: 'conquete', prov: p, owner: n });
  }
  PM.conquerir = conquerir;
  function eliminer(j, n, par) {
    const E = j.etat, N = nat(j, n); N.vivante = false; N.merveille = null;
    E.guerres = E.guerres.filter(w => w.a !== n && w.b !== n); PM.retirerDesPactes(j, n);
    E.armees = E.armees.filter(a => a.owner !== n); E.attente = E.attente.filter(a => a.nation !== n && a.de !== n);
    journal(j, `☠️ ${N.nom} disparaît de l’histoire${par >= 0 ? ', vaincu par ' + nat(j, par).nom : ''}.`, 'chute', [n, par]);
  }

  // ---------- le mois qui passe ----------
  PM.mois = function (j) {
    const E = j.etat; if (E.fin) return;
    // 1. économie et effets
    for (const N of vivantes(j)) {
      const b = PM.bilan(j, N.id);
      for (const r of R) N.res[r] += b.net[r];
      if (N.res.nourriture < 0) { N.res.nourriture = 0; for (const a of E.armees) if (a.owner === N.id) for (const u in a.unites) a.unites[u] *= 0.96; if (N.id === E.joueur && E.mois % 3 === 0) journal(j, 'Famine : tes soldats désertent faute de nourriture.', 'alerte', [N.id]); }
      if (N.res.or < 0) { N.res.or = 0; for (const a of E.armees) if (a.owner === N.id) for (const u in a.unites) if (U(u).cat === 'heros' || U(u).cat === 'siege') a.unites[u] *= 0.95; }
      if (N.res.faveur < 0) { N.res.faveur = 0; for (const a of E.armees) if (a.owner === N.id) for (const u in a.unites) if (U(u).cat === 'mythe') a.unites[u] *= 0.93; }
      if (N.res.bois < 0) N.res.bois = 0;
      N.res.faveur = Math.min(200, N.res.faveur);
      for (const k in N.pouvoirs) if (N.pouvoirs[k] > 0) N.pouvoirs[k]--;
      N.effets = N.effets.filter(e => --e.reste > 0);
      if (N.ageCours && --N.ageCours.reste <= 0) {
        N.age = N.ageCours.vers; N.ageCours = null;
        if (N.ia) choisirMineurAuto(j, N.id);
        else { E.attente.push({ type: 'mineur', nation: N.id, age: N.age }); journal(j, `✨ ${N.nom} entre dans l’${PM.AGES[N.age].nom.toLowerCase()}.`, 'age', [N.id]); }
      }
      if (N.merveille) {
        const M = N.merveille;
        if (E.provinces[M.prov].owner !== N.id) N.merveille = null;
        else if (M.reste > 0) { if (--M.reste === 0) { E.provinces[M.prov].merveille = true; journal(j, `🗼 La merveille de ${N.nom} est achevée à ${E.provinces[M.prov].nom} !`, 'merveille', [N.id]); } }
        else M.garde++;
      }
      // soins d'Odin sur ses terres
      const soin = bonus(N, 'soinDomicile'); if (soin) for (const a of E.armees) if (a.owner === N.id && E.provinces[a.prov].owner === N.id && !a.chemin.length) for (const u in a.unites) a.unites[u] *= 1 + soin * 0.5;
    }
    // 2. marches
    for (const a of E.armees) {
      if (a.paralysie > 0) { a.paralysie--; continue; }
      if (!a.chemin.length) continue;
      const suiv = a.chemin[0];
      if (!passable(j, a.owner, suiv)) { a.chemin = []; continue; }
      a.avance += vitesse(j, a);
      const cout = coutEntree(j, suiv, j.carte.provinces[a.prov].mer.includes(suiv));
      if (a.avance >= cout) {
        a.avance -= cout; a.prov = suiv; a.chemin.shift();
        const o = E.provinces[suiv].owner;
        if (PM.hostile(j, a.owner, o) || E.armees.some(b => b.prov === suiv && PM.enGuerre(j, a.owner, b.owner))) { a.chemin = []; a.avance = 0; }
        if (!a.chemin.length) a.avance = 0;
      }
    }
    // 3. batailles, sièges, conquêtes
    const touchees = new Set(E.armees.map(a => a.prov));
    for (const p of touchees) resoudreProvince(j, p);
    for (const P of E.provinces) {
      if (P.bouclier > 0) P.bouclier--;
      if (P.siege) {
        const assiegeants = E.armees.filter(a => a.prov === P.id && a.owner === P.siege.par);
        if (!assiegeants.length || !PM.hostile(j, P.siege.par, P.owner)) { P.siege = null; continue; }
        const engins = assiegeants.reduce((s, a) => s + Object.entries(a.unites).reduce((t, [u, c]) => t + (U(u).cat === 'siege' ? c : U(u).vsFort ? c * U(u).vsFort * 0.5 : 0), 0), 0);
        P.siege.progres += 1 + Math.min(2, engins / 4);
        if (P.siege.progres >= PM.dureeSiege(j, P.id)) conquerir(j, P.id, P.siege.par);
      } else if (!E.armees.some(a => a.prov === P.id && a.owner !== P.owner)) {
        const max = P.owner < 0 ? (2 + P.dev * 2) * (E.reglages.neutres == null ? 1 : E.reglages.neutres) : 1 + P.dev + (P.bat.remparts ? 4 : 0);
        if (P.garnison < max) P.garnison = Math.min(max, P.garnison + (P.owner < 0 ? 0.12 : 0.25));
      }
    }
    // 4. relations qui évoluent lentement
    if (E.mois % 3 === 0) for (const N of vivantes(j)) for (const M of vivantes(j)) if (N.id < M.id) {
      let d = -Math.sign(PM.relation(j, N.id, M.id)) * 0.6;
      if (PM.enGuerre(j, N.id, M.id)) d -= 1.5; if (PM.allies(j, N.id, M.id)) d += 1.2; if (N.pantheon === M.pantheon) d += 0.3;
      changerRelation(j, N.id, M.id, d);
    }
    if (PM.alliancesMois) PM.alliancesMois(j);
    // 5. décisions des peuples gouvernés par l'ordinateur
    if (PM.ia) PM.ia.mois(j);
    // 6. événements du joueur
    const freq = E.reglages.evenements == null ? 1 : E.reglages.evenements;
    if (freq > 0 && E.mois >= E.prochainEvt && nat(j, E.joueur).vivante && !E.attente.some(a => a.type === 'evenement')) {
      PM.lancerEvenement(j); E.prochainEvt = E.mois + Math.round((10 + alea(E) * 14) / freq);
    }
    nettoyerArmees(j);
    E.mois++;
    PM.verifierFin(j);
  };

  // ---------- événements ----------
  PM.lancerEvenement = function (j, id) {
    const E = j.etat, n = E.joueur, deja = E.evtsVus || (E.evtsVus = []);
    const l = PM.EVENEMENTS.filter(e => !deja.slice(-6).includes(e.id)), ev = id ? PM.EVENEMENTS.find(e => e.id === id) : choix(E, l);
    const miennes = E.provinces.filter(p => p.owner === n), autres = vivantes(j).filter(N => N.id !== n);
    if (!ev || !miennes.length) return null;
    deja.push(ev.id);
    const a = { type: 'evenement', nation: n, id: ev.id, province: choix(E, miennes).id, autre: autres.length ? choix(E, autres).id : -1 };
    E.attente.push(a); return a;
  };
  PM.texteEvenement = (j, a, t) => String(t).replace(/\{province\}/g, j.etat.provinces[a.province].nom).replace(/\{nation\}/g, a.autre >= 0 ? nat(j, a.autre).nom : 'un peuple lointain');
  PM.peutChoisir = (j, a, c) => { const N = nat(j, a.nation); return R.every(r => !(c.e[r] < 0) || N.res[r] >= -c.e[r]); };
  PM.repondreEvenement = function (j, i) {
    const E = j.etat, k = E.attente.findIndex(a => a.type === 'evenement'); if (k < 0) return refus('Aucun événement en attente.');
    const a = E.attente[k], ev = PM.EVENEMENTS.find(e => e.id === a.id), c = ev.choix[i]; if (!c) return refus('Choix inconnu.');
    if (!PM.peutChoisir(j, a, c)) return refus('Ressources insuffisantes pour ce choix.');
    E.attente.splice(k, 1);
    PM.appliquerEffets(j, a.nation, c.e, { province: a.province, autre: a.autre });
    journal(j, `📜 ${PM.texteEvenement(j, a, ev.titre)} — ${c.t.replace(/\s*\(.*\)$/, '')}.`, 'evenement', [a.nation]);
    return { ok: true, message: c.t };
  };
  // effets bornés (événements et décrets) : ressources, niveaux, bâtiments, troupes, relations
  PM.appliquerEffets = function (j, n, e, ctx) {
    const E = j.etat, N = nat(j, n), P = ctx && ctx.province != null ? E.provinces[ctx.province] : E.provinces[N.capitale];
    for (const r of R) if (e[r]) N.res[r] = Math.max(0, N.res[r] + e[r]);
    if (e.attaque) N.effets.push({ cle: 'attaque', valeur: e.attaque, reste: e.duree || 6 });
    if (e.dev) { const l = E.provinces.filter(p => p.owner === n && p.dev < 5); if (l.length) choix(E, l).dev++; }
    if (e.devCapitale) { const C = E.provinces[N.capitale]; C.dev = Math.min(5, C.dev + e.devCapitale); }
    if (e.devMoins && P) P.dev = Math.max(1, P.dev - e.devMoins);
    if (e.milice && P) P.garnison += e.milice;
    if (e.batiment && P && P.owner === n) { if (P.bat[e.batiment]) N.res.or += 50; else P.bat[e.batiment] = 1; }
    if (e.batimentMoins && P) { const l = Object.keys(P.bat); if (l.length) delete P.bat[choix(E, l)]; }
    const us = PM.PANTHEONS[N.pantheon].unites;
    if (e.heros) ajouterUnites(j, n, N.capitale, us[3], e.heros);
    if (e.soldats) ajouterUnites(j, n, N.capitale, us[0], e.soldats);
    if (e.pertes) for (const a of E.armees) if (a.owner === n) for (const u in a.unites) a.unites[u] *= 1 - e.pertes;
    if (e.relationsTous) for (const M of vivantes(j)) if (M.id !== n) changerRelation(j, n, M.id, e.relationsTous);
    if (e.relationNation && ctx && ctx.autre >= 0) changerRelation(j, n, ctx.autre, e.relationNation);
  };
  PM.repondrePaix = function (j, accepter) {
    const E = j.etat, k = E.attente.findIndex(a => a.type === 'paix'); if (k < 0) return refus('Aucune proposition.');
    const a = E.attente.splice(k, 1)[0];
    if (accepter) return PM.faireLaPaix(j, a.de, a.nation);
    changerRelation(j, a.nation, a.de, -5); return { ok: true, message: 'Tu refuses la paix.' };
  };

  // ---------- score et fin ----------
  PM.score = (j, n) => {
    const E = j.etat, N = nat(j, n); if (!N.vivante) return 0;
    return Math.round(E.provinces.reduce((s, p) => s + (p.owner === n ? 10 + p.dev * 5 + (p.merveille ? 300 : 0) : 0), 0) + N.age * 60 + PM.force(j, n) * 0.5 + N.stats.victoires * 3);
  };
  PM.verifierFin = function (j) {
    const E = j.etat, V = E.reglages.victoire || {}, viv = vivantes(j);
    const finir = (gagnant, raison) => { E.fin = { gagnant, raison, mois: E.mois }; journal(j, gagnant === E.joueur ? `👑 Victoire ! ${raison}` : gagnant >= 0 ? `Fin de partie : ${nat(j, gagnant).nom} l’emporte. ${raison}` : `Fin de partie. ${raison}`, 'fin', [gagnant]); };
    if (!nat(j, E.joueur).vivante) return finir(-1, 'Ton peuple a disparu.');
    if (V.conquete !== false) {
      if (viv.length === 1) return finir(viv[0].id, 'Tous les autres peuples sont vaincus.');
      for (const N of viv) if (E.provinces.filter(p => p.owner === N.id).length >= E.provinces.length * 0.75) return finir(N.id, 'Les trois quarts du monde obéissent à ' + N.nom + '.');
    }
    if (V.merveille !== false) for (const N of viv) if (N.merveille && N.merveille.reste === 0 && N.merveille.garde >= PM.MERVEILLE.garde) return finir(N.id, `La merveille de ${N.nom} a tenu cinq ans.`);
    if (V.annees > 0 && E.mois >= V.annees * 12) { const best = viv.slice().sort((a, b) => PM.score(j, b.id) - PM.score(j, a.id))[0]; return finir(best.id, `Au bout de ${V.annees} ans, ${best.nom} a le meilleur score.`); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
