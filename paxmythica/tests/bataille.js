// Pax Mythica — essais du mode Bataille (temps réel) sans affichage : données liées, carte jouable, ordres du joueur
// (récolter, construire, former, attaquer, passer l'âge, pouvoirs) puis parties entières de l'ordinateur contre lui-même.
// Lancer : node tests/bataille.js  (BATAILLE_LONG=1 : toutes les cartes et époques)
'use strict';
const path = require('path');
for (const f of ['donnees', 'epoques', 'carte', 'moteur', 'rts-donnees', 'rts-moteur']) require(path.join(__dirname, '..', f + '.js'));
const PM = globalThis.PM, R = PM.RTS, BT = PM.Bataille;
let ko = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { ko++; console.log('✗ ' + m); } };

// 1. données : chaque pouvoir des dieux a son effet en temps réel, chaque créature et chaque invocation ses caractéristiques
for (const [pid, P] of Object.entries(PM.PANTHEONS)) {
  for (const d of P.majeurs) ok(R.POUVOIRS[d.pouvoir], `pouvoir ${d.pouvoir} de ${d.nom}`);
  for (const a of P.mineurs) for (const g of a) { ok(R.POUVOIRS[g.pouvoir], `pouvoir ${g.pouvoir} de ${g.nom}`); ok(R.creature(g.unite, PM.UNITES[g.unite]).pv > 0, `créature ${g.unite}`); }
  ok(R.CULTURE[pid], `culture ${pid}`);
}
for (const [id, d] of Object.entries(R.POUVOIRS)) { ok(PM.POUVOIRS[id], `pouvoir ${id} connu de donnees.js`); if (d.type === 'invoquer') ok(PM.UNITES[d.unite], `invocation ${id}`); }
for (const [id, b] of Object.entries(R.BATIMENTS)) { ok(b.taille >= 4 && b.pv > 0 && b.temps > 0 && b.emoji, `bâtiment ${id}`); for (const f of b.forme || []) ok(f === 'mythe' || R.ROLES[f], `${id} forme ${f}`); for (const e of Object.keys(R.NOMS_BAT)) ok(R.NOMS_BAT[e][id], `nom de ${id} (${e})`); }
for (const l of R.CONSTRUIRE) for (const c of l) ok(R.BATIMENTS[c], `grille : ${c}`);

const nouvelle = (o) => BT.nouvelle(Object.assign({ epoque: 'antique', carte: 'plaine', taille: 'petite', graine: 7, joueur: 0,
  joueurs: [{ pantheon: 'grecs', dieu: 'zeus' }, { pantheon: 'nordiques', dieu: 'thor', ia: true, difficulte: 1 }] }, o));
const jouer = (B, s) => { for (let t = 0; t < s / BT.PAS; t++) BT.pas(B); };

// 2. carte : départs libres, ressources autour de chaque centre, chemin entre les deux camps
{
  for (const carte of Object.keys(R.CARTES)) {
    const B = nouvelle({ carte, graine: 3 });
    const [a, b] = B.carte.departs;
    ok(B.bats.filter(x => x.cle === 'centre').length === 2, `${carte} : deux centres`);
    ok(B.unites.filter(u => u.cle === 'villageois').length === 10, `${carte} : villageois de départ`);
    for (const [x, z] of B.carte.departs) {
      for (const s of ['arbre', 'baies', 'mine']) ok(B.res.some(r => r.sous === s && Math.hypot(r.x - x, r.z - z) < 50), `${carte} : ${s} près du départ`);
      ok(B.res.some(r => r.animal && Math.hypot(r.x - x, r.z - z) < 30), `${carte} : troupeau près du départ`);
    }
    const c = BT.chemin(B, a[0] + 9, a[1], b[0] + 9, b[1]);
    ok(c && c.length && Math.hypot(c[c.length - 1][0] - b[0] - 9, c[c.length - 1][1] - b[1]) < 6, `${carte} : chemin d'un camp à l'autre`);
    ok(B.res.filter(r => r.sous === 'arbre').length > 300, `${carte} : forêts (${B.res.filter(r => r.sous === 'arbre').length} arbres)`);
  }
}

// 3. ordres du joueur
{
  const B = nouvelle({ graine: 11 }), J = B.joueurs[0];
  B.joueurs[1].ia = false; // adversaire immobile : on essaie les ordres du joueur
  const centre = B.bats.find(b => b.j === 0 && b.cle === 'centre'), vill = B.unites.filter(u => u.j === 0 && u.cle === 'villageois');
  const arbre = BT.ressourceProche(B, centre.x, centre.z, 'bois', 60, 0, 'arbre'), baie = BT.ressourceProche(B, centre.x, centre.z, 'nourriture', 40, 0, 'baies'), mine = BT.ressourceProche(B, centre.x, centre.z, 'or', 60, 0, 'mine');
  ok(arbre && baie && mine, 'ressources trouvées');
  ok(BT.ordreContexte(B, 0, [vill[0].id, vill[1].id], arbre.x, arbre.z, arbre.id) === 'recolter', 'clic droit sur un arbre = récolter');
  BT.ordreContexte(B, 0, [vill[2].id], baie.x, baie.z, baie.id);
  BT.ordreContexte(B, 0, [vill[3].id], mine.x, mine.z, mine.id);
  const avant = { ...J.res };
  // maison posée par le dernier villageois
  let place = null; for (let a = 0; a < 40 && !place; a++) { const x = centre.x + Math.cos(a) * 16, z = centre.z + Math.sin(a) * 16; if (BT.peutPoser(B, 0, 'maison', x, z).ok) place = [x, z]; }
  ok(place, 'place pour une maison');
  const r = BT.poser(B, 0, 'maison', place[0], place[1], [vill[4].id]);
  ok(r.ok && J.res.bois === avant.bois - 50, 'maison payée et posée');
  ok(!BT.poser(B, 0, 'maison', place[0], place[1], []).ok, 'place prise refusée');
  ok(BT.former(B, 0, centre.id, 'villageois').ok, 'villageois en formation');
  jouer(B, 60);
  ok(J.res.bois > avant.bois - 50 + 5, `bois récolté (${Math.round(J.res.bois)})`);
  ok(J.res.or > avant.or + 5, `or récolté (${Math.round(J.res.or)})`);
  ok(J.res.nourriture > avant.nourriture - 50 + 5, `nourriture récoltée (${Math.round(J.res.nourriture)})`);
  ok(r.bat.fini && J.popMax === 25, `maison construite (pop max ${J.popMax})`);
  ok(B.unites.filter(u => u.j === 0 && u.cle === 'villageois' && !u.mort).length === 6, 'villageois formé');
  // chasse : un mouton abattu puis dépecé
  const mouton = B.res.find(x => x.animal && Math.hypot(x.x - centre.x, x.z - centre.z) < 35);
  BT.ordreContexte(B, 0, [vill[2].id], mouton.x, mouton.z, mouton.id);
  jouer(B, 25); ok(!mouton.vivant && mouton.qte < mouton.qteMax, 'animal chassé puis dépecé');
  // passage d'âge
  J.res.nourriture += 1000; J.res.or += 1000;
  const g = PM.PANTHEONS.grecs.mineurs[0][1].id;
  ok(BT.avancerAge(B, 0, g).ok && !BT.avancerAge(B, 0, g).ok, 'passage d’âge lancé une fois');
  jouer(B, R.AGES[1].temps + 1);
  ok(J.age === 1 && J.mineurs[0] === g && J.pouvoirs.length === 2, 'âge classique et dieu mineur');
  // caserne et soldats, temple et créature
  J.res.bois += 1000; J.res.or += 500; J.res.faveur += 100;
  let pc = null; for (let a = 0; a < 80 && !pc; a++) { const x = centre.x + Math.cos(a * 0.7) * (24 + a * 0.2), z = centre.z + Math.sin(a * 0.7) * (24 + a * 0.2); if (BT.peutPoser(B, 0, 'caserne', x, z).ok) pc = [x, z]; }
  const cas = BT.poser(B, 0, 'caserne', pc[0], pc[1], vill.slice(0, 4).map(u => u.id)).bat;
  let pt = null; for (let a = 0; a < 80 && !pt; a++) { const x = centre.x - Math.cos(a * 0.9) * (24 + a * 0.2), z = centre.z - Math.sin(a * 0.9) * (24 + a * 0.2); if (BT.peutPoser(B, 0, 'temple', x, z).ok) pt = [x, z]; }
  const tem = BT.poser(B, 0, 'temple', pt[0], pt[1], vill.slice(4, 6).map(u => u.id)).bat;
  jouer(B, 60);
  ok(cas.fini && tem.fini, 'caserne et temple construits');
  ok(BT.formables(B, tem).includes(PM.PANTHEONS.grecs.mineurs[0][1].unite), 'le temple forme la créature du dieu mineur');
  for (let k = 0; k < 4; k++) BT.former(B, 0, cas.id, 'inf');
  BT.former(B, 0, tem.id, BT.formables(B, tem)[0]);
  // maisons pour la population
  for (let k = 0; k < 2; k++) { for (let a = 0; a < 80; a++) { const x = centre.x + Math.cos(a * 1.3) * (18 + a * 0.3), z = centre.z + Math.sin(a * 1.3) * (18 + a * 0.3); if (BT.peutPoser(B, 0, 'maison', x, z).ok) { BT.poser(B, 0, 'maison', x, z, [vill[k].id]); break; } } }
  jouer(B, 70);
  const armee = B.unites.filter(u => u.j === 0 && !u.mort && u.cle !== 'villageois' && u.cle !== 'cav');
  ok(armee.length >= 5, `soldats et créature formés (${armee.length})`);
  // attaque du centre ennemi
  const ennemi = B.bats.find(b => b.j === 1 && b.cle === 'centre'), pvAvant = ennemi.pv;
  BT.ordreContexte(B, 0, armee.map(u => u.id), ennemi.x, ennemi.z, ennemi.id);
  ok(armee.every(u => u.ordre && u.ordre.type === 'attaquer'), 'clic droit sur un ennemi = attaquer');
  jouer(B, 120);
  ok(ennemi.pv < pvAvant || ennemi.mort || B.joueurs[1].stats.pertes > 0, 'le combat a eu lieu');
  // pouvoirs : foudre de Zeus et pouvoir du dieu mineur
  const cible = B.unites.find(u => u.j === 1 && !u.mort);
  if (cible) { B.joueurs[0].connu.fill(1); const pv = cible.pv; ok(BT.pouvoir(B, 0, 0, cible.x, cible.z).ok, 'foudre lancée'); ok(cible.mort || cible.pv < pv, 'foudre : cible touchée'); ok(!BT.pouvoir(B, 0, 0, cible.x, cible.z).ok, 'pouvoir à usage unique'); }
  ok(BT.pouvoir(B, 0, 1, centre.x, centre.z).ok, 'pouvoir du dieu mineur');
  jouer(B, 12);
  ok([...B.unites, ...B.bats].every(e => Number.isFinite(e.x) && Number.isFinite(e.z) && Number.isFinite(e.pv)), 'positions et vies sans valeur absurde');
  ok(Object.values(J.res).every(v => Number.isFinite(v) && v >= -1e-6), 'ressources valides');
}

// 4. parties entières : l'ordinateur contre lui-même
const partie = (o, minutes) => {
  const B = nouvelle(Object.assign({}, o, { joueurs: o.joueurs.map(p => Object.assign({ ia: true }, p)) }));
  const t0 = Date.now(); let maxPas = 0;
  while (!B.fin && B.temps < minutes * 60) { const a = Date.now(); for (let k = 0; k < 20; k++) BT.pas(B); maxPas = Math.max(maxPas, (Date.now() - a) / 20); }
  return { B, ms: Date.now() - t0, maxPas };
};
const cas = [
  { titre: 'Grecs contre Nordiques (plaine)', epoque: 'antique', carte: 'plaine', joueurs: [{ pantheon: 'grecs', dieu: 'zeus', difficulte: 2 }, { pantheon: 'nordiques', dieu: 'thor', difficulte: 0 }] },
  { titre: 'Égyptiens contre Atlantes (oasis, Moyen Âge)', epoque: 'medieval', carte: 'oasis', graine: 5, joueurs: [{ pantheon: 'egyptiens', dieu: 'ra', difficulte: 1 }, { pantheon: 'atlantes', dieu: 'gaia', difficulte: 1 }] },
  { titre: 'Quatre peuples (rivière, futur)', epoque: 'futur', carte: 'riviere', taille: 'moyenne', graine: 9, joueurs: [{ pantheon: 'grecs', equipe: 0 }, { pantheon: 'egyptiens', equipe: 1 }, { pantheon: 'nordiques', equipe: 0 }, { pantheon: 'atlantes', equipe: 1 }] }
];
if (process.env.BATAILLE_LONG) for (const carte of Object.keys(R.CARTES)) for (const epoque of Object.keys(PM.EPOQUES)) cas.push({ titre: `${carte} ${epoque}`, epoque, carte, graine: carte.length * 7 + epoque.length, joueurs: [{ pantheon: 'grecs', difficulte: 2 }, { pantheon: 'nordiques', difficulte: 1 }] });
for (const c of cas) {
  const { B, ms, maxPas } = partie(c, 35);
  const J = B.joueurs, s = J.map(x => `${x.pantheon} âge ${x.age} pop ${x.pop}/${x.popMax} formées ${x.stats.formees} tuées ${x.stats.tues} récolte ${Math.round(x.stats.recolte)} bât ${x.stats.construits}${x.vaincu ? ' VAINCU' : ''}`).join(' | ');
  console.log(`${c.titre} : ${B.fin ? `fin à ${Math.round(B.fin.temps / 60)} min (${B.fin.raison})` : `pas de fin en ${Math.round(B.temps / 60)} min`} — ${ms} ms, pas le plus long ${maxPas.toFixed(1)} ms\n   ${s}`);
  ok(J.every(x => x.stats.recolte > 3000), `${c.titre} : économie qui tourne`);
  ok(J.every(x => x.age >= 2 || x.vaincu), `${c.titre} : passages d’âge`);
  ok(J.every(x => x.stats.formees >= 25 || x.vaincu), `${c.titre} : unités formées`);
  ok(J.some(x => x.stats.tues > 10), `${c.titre} : combats`);
  ok(B.fin, `${c.titre} : la partie se termine`);
  ok(maxPas < 25, `${c.titre} : pas de simulation rapide (${maxPas.toFixed(1)} ms)`);
  ok([...B.unites, ...B.bats].every(e => Number.isFinite(e.x) && Number.isFinite(e.z)), `${c.titre} : positions valides`);
}

console.log(ko ? `Bataille : ${ko} échec(s) sur ${n} contrôles` : `Bataille : ${n} contrôles réussis`);
process.exit(ko ? 1 : 0);
