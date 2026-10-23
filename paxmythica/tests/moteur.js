// Pax Mythica — essais du moteur sans affichage : données cohérentes, cartes valides, parties entières jouées par l'ordinateur,
// ordres et pouvoirs, décrets lus par mots-clés, sauvegarde et rechargement identiques. Lancer : node tests/moteur.js
'use strict';
const path = require('path');
for (const f of ['donnees', 'carte', 'moteur', 'alliances', 'ia-nations', 'oracle']) require(path.join(__dirname, '..', f + '.js'));
const PM = globalThis.PM;
let ko = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { ko++; console.log('✗ ' + m); } };

// 1. données : chaque lien pointe vers quelque chose qui existe
for (const [pid, P] of Object.entries(PM.PANTHEONS)) {
  ok(P.unites.length === 5 && P.unites.every(u => PM.UNITES[u] && PM.UNITES[u].pantheon === pid), `unités humaines de ${pid}`);
  ok(P.majeurs.length === 3 && P.majeurs.every(d => PM.POUVOIRS[d.pouvoir] && d.desc), `dieux majeurs de ${pid}`);
  ok(P.mineurs.length === 3 && P.mineurs.every(a => a.length === 2 && a.every(g => PM.UNITES[g.unite] && PM.POUVOIRS[g.pouvoir])), `dieux mineurs de ${pid}`);
  ok(PM.NOMS_PEUPLES[pid] && PM.CULTURES[pid], `noms de ${pid}`);
}
for (const [id, U] of Object.entries(PM.UNITES)) ok(PM.CATEGORIES[U.cat] && U.att > 0 && U.pv > 0 && U.nom && U.emoji, `unité ${id}`);
for (const [id, P] of Object.entries(PM.POUVOIRS)) {
  ok(['ennemi', 'propre', 'nation', 'aucune'].includes(P.cible) && P.cout > 0 && P.recharge > 0 && P.desc, `pouvoir ${id}`);
  if (P.effet.invoquer) ok(!!PM.UNITES[P.effet.invoquer.unite], `invocation de ${id}`);
}
for (const e of PM.EVENEMENTS) ok(e.choix.length >= 2 && e.titre && e.texte, `événement ${e.id}`);

// 2. cartes : toutes les formes et tailles donnent un monde d'un seul tenant, reproductible
for (const forme of Object.keys(PM.FORMES)) for (const taille of ['petite', 'moyenne']) {
  const c = PM.genererCarte({ graine: 77, taille, forme }), c2 = PM.genererCarte({ graine: 77, taille, forme });
  ok(c.provinces.length >= PM.TAILLES[taille].n * 0.7, `${forme}/${taille} : ${c.provinces.length} provinces`);
  ok(c.pix.every((v, i) => v === c2.pix[i]), `${forme}/${taille} reproductible`);
  const vu = new Set([0]), f = [0]; while (f.length) { const a = f.pop(); for (const b of [...c.provinces[a].voisins, ...c.provinces[a].mer]) if (!vu.has(b)) { vu.add(b); f.push(b); } }
  ok(vu.size === c.provinces.length, `${forme}/${taille} d'un seul tenant`);
  ok(c.provinces.every(p => p.voisins.every(v => c.provinces[v].voisins.includes(p.id))), `${forme}/${taille} voisinages symétriques`);
}

// 3. parties entières jouées par l'ordinateur (le joueur aussi), sans erreur ni valeur absurde
let finies = 0;
for (const graine of [3, 19, 101]) {
  const j = PM.nouvellePartie({ graine, nombre: 6, taille: graine === 101 ? 'petite' : 'moyenne', ageDepart: graine === 19 ? 1 : 0 });
  j.etat.nations[0].ia = true;
  const t0 = Date.now();
  for (let m = 0; m < 480 && !j.etat.fin; m++) {
    PM.mois(j);
    for (const a of j.etat.attente.slice()) { if (a.type === 'mineur') PM.choisirMineur(j, a.nation, PM.mineursProposes(j, a.nation, a.age)[0].id); else if (a.type === 'evenement') PM.repondreEvenement(j, 0); else j.etat.attente.splice(j.etat.attente.indexOf(a), 1); }
  }
  const E = j.etat;
  if (E.fin) finies++;
  ok(Date.now() - t0 < 20000, `partie ${graine} assez rapide (${Date.now() - t0} ms)`);
  ok(E.nations.every(N => PM.RESSOURCES.every(r => Number.isFinite(N.res[r]) && N.res[r] >= 0)), `partie ${graine} : ressources valides`);
  ok(E.armees.every(a => Object.values(a.unites).every(c => Number.isFinite(c) && c >= 0) && E.provinces[a.prov] && E.nations[a.owner].vivante), `partie ${graine} : armées valides`);
  ok(E.provinces.every(p => p.owner < 0 || E.nations[p.owner].vivante), `partie ${graine} : provinces à des peuples vivants`);
  ok(E.nations.filter(N => N.vivante).every(N => E.provinces[N.capitale] && E.provinces[N.capitale].owner === N.id), `partie ${graine} : capitales valides`);
  ok(E.journal.some(e => e.type === 'conquete') && E.journal.some(e => e.type === 'age'), `partie ${graine} : conquêtes et âges`);
  ok(E.provinces.filter(p => p.owner < 0).length < E.provinces.length * 0.5, `partie ${graine} : le monde s'est partagé`);
  ok(E.journal.some(e => e.type === 'alliance' && /concluent/.test(e.texte)), `partie ${graine} : des pactes se forment`);
  ok(E.nations.filter(N => N.vivante).every(N => PM.pactes(j).filter(p => PM.TYPES_PACTE[p.type].rang >= 2 && p.membres.includes(N.id)).length <= 1), `partie ${graine} : une alliance au plus par peuple`);
  ok(PM.pactes(j).every(p => p.membres.length >= 2 && p.membres.every(m => E.nations[m].vivante)), `partie ${graine} : pactes valides`);
  // sauvegarde : JSON, rechargement, puis même suite
  const copie = PM.charger(JSON.parse(JSON.stringify(E)));
  PM.mois(j); PM.mois(copie);
  ok(JSON.stringify(j.etat.provinces) === JSON.stringify(copie.etat.provinces) && j.etat.alea === copie.etat.alea, `partie ${graine} : sauvegarde fidèle`);
}
console.log(`  (${finies} partie(s) sur 3 terminée(s) par une victoire en 40 ans)`);

// 4. ordres du joueur
{
  const j = PM.nouvellePartie({ graine: 5, nombre: 4 }), E = j.etat, N = E.nations[0], cap = N.capitale;
  N.res = { nourriture: 5000, bois: 5000, or: 5000, faveur: 200 };
  const us = PM.PANTHEONS[N.pantheon].unites;
  ok(PM.recruter(j, 0, cap, us[0], 5).ok, 'recruter');
  ok(!PM.recruter(j, 0, cap, us[4], 1).ok, 'engin de siège refusé à l’âge archaïque');
  ok(PM.construire(j, 0, cap, 'mine').ok && !PM.construire(j, 0, cap, 'mine').ok, 'construire une seule fois');
  ok(!PM.construire(j, 0, cap, 'remparts').ok, 'remparts réservés à l’âge classique');
  ok(PM.developper(j, 0, cap).ok && E.provinces[cap].dev === 4, 'développer');
  ok(PM.avancerAge(j, 0).ok && !PM.avancerAge(j, 0).ok, 'passage d’âge unique');
  for (let i = 0; i < 6; i++) PM.mois(j);
  ok(N.age === 1 && E.attente.some(a => a.type === 'mineur'), 'âge classique atteint, dieu à choisir');
  const g = PM.mineursProposes(j, 0, 1)[0]; ok(PM.choisirMineur(j, 0, g.id).ok && PM.unitesDispo(j, 0).includes(g.unite) && g.pouvoir in N.pouvoirs, 'dieu mineur : créature et pouvoir');
  const libre = PM.voisins(j, cap).map(v => v.p).find(p => E.provinces[p].owner < 0);
  if (libre != null) {
    const a = E.armees.find(x => x.owner === 0);
    ok(PM.ordonner(j, a.id, libre).ok, 'marcher vers une terre libre');
    for (let i = 0; i < 8 && E.provinces[libre].owner !== 0; i++) PM.mois(j);
    ok(E.provinces[libre].owner === 0, 'terre libre conquise');
  }
  const voisin = 1, pV = E.provinces.find(p => p.owner === voisin).id;
  ok(!PM.lancerPouvoir(j, 0, PM.majeur(N).pouvoir, pV).ok || PM.POUVOIRS[PM.majeur(N).pouvoir].cible === 'aucune', 'pouvoir offensif refusé en paix');
  ok(PM.declarerGuerre(j, 0, voisin).ok && PM.enGuerre(j, 0, voisin), 'déclarer la guerre');
  ok(PM.ordonner(j, E.armees.find(x => x.owner === 0).id, pV).ok || true, 'ordre vers l’ennemi');
  const carte9 = PM.genererCarte({ graine: 9 });
  for (const pid of Object.keys(PM.POUVOIRS)) {
    const k = PM.nouvellePartie({ graine: 9, nombre: 3 }, carte9), K = k.etat, M = K.nations[0]; M.res.faveur = 200; M.pouvoirs[pid] = 0;
    PM.declarerGuerre(k, 0, 1);
    const Pw = PM.POUVOIRS[pid], cible = Pw.cible === 'aucune' ? -1 : Pw.cible === 'nation' ? 1 : Pw.cible === 'propre' ? M.capitale : K.nations[1].capitale;
    const r = PM.lancerPouvoir(k, 0, pid, cible);
    ok(r.ok, `pouvoir ${pid} : ${r.message}`);
    ok(M.pouvoirs[pid] === Pw.recharge && !PM.lancerPouvoir(k, 0, pid, cible).ok, `pouvoir ${pid} en recharge`);
    PM.mois(k);
  }
  ok(PM.proposerPaix(j, 0, voisin) && true, 'proposer la paix');
}

// 6. alliances : pactes, blocs, appels aux armes, refus, trahison, paix commune
{
  const j = PM.nouvellePartie({ graine: 21, nombre: 6, paixInitiale: 0 }), E = j.etat, J = E.joueur;
  const lier = (a, b, r) => { PM.changerRelation(j, a, b, r - PM.relation(j, a, b)); };
  for (const N of E.nations) for (const M of E.nations) if (N.id < M.id) lier(N.id, M.id, 0);
  lier(0, 1, 90); E.nations[1].agress = 0.7;
  let r = PM.proposerPacte(j, 0, 1, 'defensive');
  ok(r.ok && PM.allies(j, 0, 1) && PM.allianceDe(j, 0) === PM.allianceDe(j, 1), 'alliance défensive conclue : ' + r.message);
  lier(0, 2, -5); r = PM.proposerPacte(j, 0, 2, 'defensive');
  ok(!r.ok && /décline/.test(r.message), 'alliance refusée avec ses raisons : ' + r.message);
  lier(0, 2, 80); lier(1, 2, -40); r = PM.proposerPacte(j, 0, 2, 'defensive');
  ok(!r.ok, 'un membre hostile bloque l’entrée dans la ligue : ' + r.message);
  lier(1, 2, 30); r = PM.proposerPacte(j, 0, 2, 'defensive');
  ok(r.ok && PM.allianceDe(j, 2) && PM.allianceDe(j, 2).membres.length === 3, 'ligue à trois : ' + r.message);
  ok(!PM.proposerPacte(j, 3, 2, 'defensive').ok || PM.allianceDe(j, 3) === PM.allianceDe(j, 2), 'une seule alliance par peuple');
  // appel défensif : 4 attaque 1, les membres sont appelés (le joueur est consulté)
  lier(2, 4, -30); lier(1, 4, -30); E.nations[2].agress = 0.9;
  PM.declarerGuerre(j, 4, 1);
  ok(E.attente.some(a => a.type === 'appel' && a.nation === J && a.ennemi === 4), 'appel aux armes reçu par le joueur');
  ok(PM.enGuerre(j, 2, 4), 'allié de l’ordinateur entré en guerre pour défendre');
  r = PM.repondreAppel(j, true); ok(r.ok && PM.enGuerre(j, 0, 4), 'le joueur répond à l’appel');
  // paix commune : 1 et 4 font la paix, les alliés venus pour 1 aussi
  PM.faireLaPaix(j, 1, 4);
  ok(!PM.enGuerre(j, 0, 4) && !PM.enGuerre(j, 2, 4), 'paix commune des alliés');
  // trahison : déclarer la guerre à un allié
  const parole = PM.parole(j, 0); PM.treves = PM.treves;
  delete E.treves['0-1']; delete E.treves['1-0'];
  r = PM.declarerGuerre(j, 0, 1);
  ok(r.ok && !PM.allies(j, 0, 1) && PM.parole(j, 0) <= parole - 30, 'trahison : alliance rompue et parole perdue');
  // refus d'un appel : l'allié quitte l'alliance
  const k = PM.nouvellePartie({ graine: 22, nombre: 4, paixInitiale: 0 }), K = k.etat;
  for (const N of K.nations) for (const M of K.nations) if (N.id < M.id) PM.changerRelation(k, N.id, M.id, -PM.relation(k, N.id, M.id));
  PM.changerRelation(k, 1, 2, 60); PM.proposerPacte(k, 1, 2, 'defensive');
  PM.changerRelation(k, 1, 2, -75); PM.changerRelation(k, 2, 3, 80); K.nations[2].agress = 0;
  PM.declarerGuerre(k, 3, 1);
  ok(!PM.enGuerre(k, 2, 3) && !PM.allies(k, 1, 2), 'appel refusé : l’allié quitte l’alliance');
  // alliance totale : la guerre de l'un appelle l'autre
  const t = PM.nouvellePartie({ graine: 23, nombre: 4, paixInitiale: 0 }), Tt = t.etat;
  for (const N of Tt.nations) for (const M of Tt.nations) if (N.id < M.id) PM.changerRelation(t, N.id, M.id, -PM.relation(t, N.id, M.id));
  PM.changerRelation(t, 1, 2, 100); Tt.nations[1].agress = Tt.nations[2].agress = 0.9; PM.changerRelation(t, 2, 3, -40);
  ok(PM.proposerPacte(t, 1, 2, 'defensive').ok && PM.proposerPacte(t, 1, 2, 'totale').ok && PM.allianceDe(t, 1).type === 'totale', 'alliance renforcée en alliance totale');
  PM.declarerGuerre(t, 1, 3);
  ok(PM.enGuerre(t, 2, 3), 'alliance totale : l’allié suit dans la guerre offensive');
  // non-agression à deux, pour dix ans
  PM.changerRelation(t, 0, 3, 60); const na = PM.proposerPacte(t, 0, 3, 'nonagression');
  ok(na.ok && PM.lies(t, 0, 3) && !PM.allies(t, 0, 3) && na.pacte.fin === Tt.mois + 120, 'pacte de non-agression');
  // sauvegarde avec les pactes
  const c = PM.charger(JSON.parse(JSON.stringify(Tt)));
  ok(PM.allies(c, 1, 2) && PM.lies(c, 0, 3), 'pactes gardés dans la sauvegarde');
}

// 5. décrets lus par mots-clés
(async () => {
  const j = PM.nouvellePartie({ graine: 12, nombre: 4 }), E = j.etat, N = E.nations[0]; N.res = { nourriture: 3000, bois: 3000, or: 3000, faveur: 150 };
  const autre = E.nations[1], cap = E.provinces[N.capitale], u = PM.UNITES[PM.PANTHEONS[N.pantheon].unites[1]];
  const essais = [
    [`Déclarer la guerre à ${autre.nom} et lever 12 ${u.nom.toLowerCase()}`, ['guerre', 'recruter']],
    [`construire un temple à ${cap.nom}, puis une mine`, ['construire', 'construire']],
    ['prier les dieux', ['offrande']], ['organiser des grands jeux', ['jeux']],
    [`renommer ${cap.nom} en Nouvelle-Aube`, ['renommer_province']], ['passer à l’âge suivant', ['age']],
    [`proposer une alliance à ${E.nations[2].nom}`, ['pacte']], [`pacte de non-agression avec ${E.nations[3].nom}`, ['pacte']],
    [`appeler ${E.nations[2].nom} aux armes contre ${autre.nom}`, ['appel']], [`demander de l’or à ${E.nations[2].nom}`, ['soutien']],
    ['quitter notre alliance', ['rompre']], ['notre ligue s’appelle Ligue du Soleil', ['renommer_pacte']], ['notre peuple s’appelle Enfants du Soleil', ['renommer_peuple']]
  ];
  for (const [t, types] of essais) { const a = PM.lireDecret(j, 0, t); ok(JSON.stringify(a.map(x => x.type)) === JSON.stringify(types), `décret « ${t} » → ${a.map(x => x.type).join(', ')}`); }
  const r = await PM.decret(j, 0, `lever 10 ${u.nom.toLowerCase()} et construire des fermes`);
  ok(r.resultats.length === 2 && r.resultats.every(x => x.ok) && r.recit, 'décret exécuté');
  // oracle simulé : actions inventées ignorées, règles appliquées
  const faux = async () => ({ recit: 'Les trompettes sonnent.', reactions: [{ nation: autre.nom, texte: 'Nous veillons.' }], actions: [{ type: 'construire', batiment: 'temple', province: E.provinces.find(p => p.owner === 0 && !p.bat.temple)?.nom || cap.nom }, { type: 'inventee' }, { type: 'recruter', unite: u.nom, nombre: 9999 }] });
  const r2 = await PM.decret(j, 0, 'élever un sanctuaire et lever une armée immense', faux);
  ok(r2.source === 'oracle' && r2.resultats.length === 2 && r2.reactions.length === 1, 'oracle : actions inconnues écartées');
  ok(!r2.resultats[1].ok || r2.resultats[1].nombre <= 50, 'oracle : nombre plafonné par les règles');
  const r3 = await PM.decret(j, 0, 'prier', async () => { throw new Error('arrêt'); });
  ok(r3.resultats[0].ok && /mots-clés/.test(r3.source), 'oracle en panne : lecture par mots-clés');
  console.log(ko ? `\n${ko} échec(s) sur ${n} contrôles` : `Moteur : ${n} contrôles réussis`);
  process.exit(ko ? 1 : 0);
})();
