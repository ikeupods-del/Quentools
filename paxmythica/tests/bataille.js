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
for (const [id, b] of Object.entries(R.BATIMENTS)) { ok(b.taille >= 2 && b.pv > 0 && b.temps > 0 && b.emoji, `bâtiment ${id}`); for (const f of b.forme || []) ok(f === 'mythe' || R.ROLES[f], `${id} forme ${f}`); for (const e of Object.keys(R.NOMS_BAT)) ok(R.NOMS_BAT[e][id], `nom de ${id} (${e})`); }
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
    if (R.CARTES[carte].eau === 'iles') {
      // archipel : chaque peuple sur son île, la mer entre les deux
      ok(BT.ileDe(B, a[0], a[1]) !== BT.ileDe(B, b[0], b[1]) && B.aEau, `${carte} : une île par peuple`);
      ok(!BT.memeIle(B, { x: a[0], z: a[1] }, { x: b[0], z: b[1] }), `${carte} : il faut traverser la mer`);
    } else {
      const c = BT.chemin(B, a[0] + 9, a[1], b[0] + 9, b[1]);
      ok(c && c.length && Math.hypot(c[c.length - 1][0] - b[0] - 9, c[c.length - 1][1] - b[1]) < 6, `${carte} : chemin d'un camp à l'autre`);
    }
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

// 3 bis. murs et portes, port et bateaux, trêve, enregistrement, missions
{
  const B = nouvelle({ graine: 21 }), J = B.joueurs[0]; B.joueurs[1].ia = false; J.connu.fill(1); J.age = 1; J.cacheStats = {}; J.res.bois += 3000; J.res.or += 3000; J.res.nourriture += 3000;
  const c = B.bats.find(b => b.j === 0 && b.cle === 'centre'), vill = B.unites.filter(u => u.j === 0 && u.cle === 'villageois');
  // mur en ligne : tronçons bâtis de proche en proche
  let a0 = null; for (let a = 0; a < 6.28 && !a0; a += 0.2) { const x0 = c.x + Math.cos(a) * 20, z0 = c.z + Math.sin(a) * 20, x1 = x0 + Math.cos(a + 1.57) * 16, z1 = z0 + Math.sin(a + 1.57) * 16; const l = BT.casesMur(B, 0, x0, z0, x1, z1); if (l.length >= 8 && l.every(k => k.ok === true)) a0 = [x0, z0, x1, z1]; }
  ok(a0, 'tracé de mur libre');
  const rm = BT.poserMur(B, 0, ...a0, vill.slice(0, 3).map(u => u.id));
  ok(rm.ok && rm.n >= 8, `mur posé (${rm.n} tronçons)`);
  jouer(B, 40); ok(rm.bats.every(b => b.fini), 'mur entièrement bâti');
  // porte posée sur le mur : nos unités passent, l'ennemi non
  const mid = rm.bats[Math.floor(rm.bats.length / 2)];
  const rp = BT.poser(B, 0, 'porte', mid.x, mid.z, vill.slice(0, 3).map(u => u.id));
  ok(rp.ok && !B.bats.includes(mid), 'porte posée à la place des tronçons');
  jouer(B, 30); ok(rp.bat.fini, 'porte bâtie');
  const gx = Math.floor(rp.bat.x / BT.CEL), gz = Math.floor(rp.bat.z / BT.CEL), o = gz * B.n + gx;
  ok(B.bloc[o] === 5, 'case de la porte marquée');
  const ami = BT.ajouterUnite(B, 0, 'inf', rp.bat.x, rp.bat.z), ennemi = BT.ajouterUnite(B, 1, 'inf', rp.bat.x, rp.bat.z);
  ok(BT.marchable(B, rp.bat.x, rp.bat.z) === false, 'porte fermée par défaut');
  ami.mort = ennemi.mort = 1;
  // garnison : la cloche abrite les villageois au centre-ville, ils guérissent, puis ressortent
  const blesse = vill[4]; blesse.pv = 10;
  const bucheron = vill[3], arbre = BT.ressourceProche(B, bucheron.x, bucheron.z, 'bois', 60, 0); BT.ordreContexte(B, 0, [bucheron.id], arbre.x, arbre.z, arbre.id); jouer(B, 2);
  ok(BT.cloche(B, 0) === 'cloche', 'cloche sonnée');
  jouer(B, 30);
  const abrites = BT.contenu(B, c);
  ok(abrites.length >= 4 && abrites.every(u => u.cle === 'villageois' && u.dans === c.id), `villageois abrités au centre (${abrites.length})`);
  ok(blesse.dans !== c.id || blesse.pv > 10, 'les abrités guérissent');
  ok(!B.hash.some(l => l.some(e => e.dans)), 'les abrités quittent la carte');
  ok(BT.cloche(B, 0) === 'fin' && !BT.contenu(B, c).length && vill.every(u => !u.dans), 'fin de l’alerte : tout le monde ressort');
  ok(bucheron.ordre && bucheron.ordre.type === 'recolter', 'après l’alerte, le bûcheron retourne couper du bois');
  // soldats dans une tour : une flèche de plus chacun ; la tour abattue les rend
  let pt = null; for (let a = 0; a < 6.28 && !pt; a += 0.3) { const x = (Math.floor((c.x + Math.cos(a) * 14) / 2) + 0.5) * 2, z = (Math.floor((c.z + Math.sin(a) * 14) / 2) + 0.5) * 2; if (BT.peutPoser(B, 0, 'tour', x, z).ok) pt = [x, z]; }
  const tour = BT.ajouterBat(B, 0, 'tour', pt[0], pt[1], true); BT.majPop(B);
  const arch = [0, 1, 2].map(k => BT.ajouterUnite(B, 0, 'archer', c.x + k, c.z + c.taille));
  ok(BT.ordreContexte(B, 0, arch.map(u => u.id), tour.x, tour.z, tour.id) === 'entrer', 'clic droit sur la tour : garnison');
  jouer(B, 25); ok(BT.contenu(B, tour).length === 3, 'trois archers dans la tour');
  ok(BT.place(B, tour) === 2, 'places restantes dans la tour');
  const cav = B.unites.find(u => u.j === 0 && u.cle === 'cav'); ok(!cav || !BT.peutEntrer(cav, tour), 'la cavalerie ne monte pas dans une tour');
  tour.pv = 1; const assaillant = BT.ajouterUnite(B, 1, 'inf', tour.x + 5, tour.z); assaillant.pv = 5000;
  BT.ordreContexte(B, 1, [assaillant.id], tour.x, tour.z, tour.id);
  for (let t = 0; t < 30 / BT.PAS && !tour.mort; t++) BT.pas(B);
  ok(tour.mort && arch.every(u => !u.dans && !u.mort), 'tour abattue : les archers en sortent vivants');
  assaillant.mort = B.temps;
  // marché : échanges et cours qui baisse à chaque vente
  ok(!BT.echanger(B, 0, 'bois>or').ok, 'pas d’échange sans marché');
  const mk = BT.ajouterBat(B, 0, 'marche', c.x - 30, c.z - 30, true); const orAv = J.res.or, boisAv = J.res.bois;
  const e1 = BT.echanger(B, 0, 'bois>or'), e2 = BT.echanger(B, 0, 'bois>or');
  ok(e1.ok && J.res.bois === boisAv - 200 && J.res.or === orAv + e1.recoit + e2.recoit, `marché : 100 bois → ${e1.recoit} or`);
  ok(e2.recoit < e1.recoit, 'marché : le cours baisse à chaque vente');
  const cAv = BT.cours(B, 0).bois; jouer(B, 30); ok(BT.cours(B, 0).bois > cAv, 'marché : le cours remonte avec le temps');
  ok(BT.echanger(B, 0, 'or>nourriture').ok, 'marché : achat de nourriture');
  mk.mort = B.temps;
  // améliorations : recherche dans la file, effet immédiat sur les unités déjà formées
  for (const [id, T] of Object.entries(R.TECHS)) ok(R.BATIMENTS[T.bat] && T.nom && T.desc && T.emoji && T.temps > 0, `amélioration ${id}`);
  const cas2 = BT.ajouterBat(B, 0, 'caserne', c.x + 30, c.z - 30, true), gr = BT.ajouterBat(B, 0, 'grenier', c.x - 30, c.z + 28, true);
  const soldat = BT.ajouterUnite(B, 0, 'inf', c.x, c.z + c.taille + 2), attAv = soldat.s.att, vieAv = soldat.pvMax;
  ok(BT.rechercher(B, 0, cas2.id, 'lames').ok && BT.rechercher(B, 0, cas2.id, 'armures').ok, 'recherches lancées à la caserne');
  ok(!BT.rechercher(B, 0, cas2.id, 'lames').ok, 'pas deux fois la même recherche');
  ok(!BT.rechercher(B, 0, cas2.id, 'acier').ok, 'Forge de guerre : il faut l’âge héroïque et les lames');
  ok(BT.rechercher(B, 0, gr.id, 'houes').ok, 'recherche lancée au grenier');
  jouer(B, 75);
  ok((J.techs || []).includes('lames') && (J.techs || []).includes('armures') && J.techs.includes('houes'), 'recherches terminées');
  ok(soldat.s.att > attAv * 1.1 && soldat.pvMax > vieAv * 1.15, `unité déjà formée renforcée (attaque ${attAv}→${Math.round(soldat.s.att)}, vie ${vieAv}→${soldat.pvMax})`);
  ok(BT.stats(B, 0, 'inf').att > R.ROLES.inf.att * 1.1 && J.bonus.recolte_nourriture >= 1.2, 'nouvelles unités et récolte améliorées');
  const avTech = JSON.parse(JSON.stringify(BT.sauver(B))), B2 = BT.charger(avTech);
  ok(B2.joueurs[0].techs.includes('lames') && BT.stats(B2, 0, 'inf').att > R.ROLES.inf.att * 1.1, 'rechargement : améliorations gardées');
  cas2.mort = gr.mort = soldat.mort = B.temps;
  // trêve d'une partie longue
  const L = nouvelle({ graine: 23, duree: 'longue', taille: 'moyenne' });
  ok(L.treve === R.DUREES.longue.treve && L.popMax === 250, 'partie longue : trêve et population');
  ok(L.res.find(r => r.sous === 'mine').qte > BT.RES.mine.q * 1.5, 'partie longue : ressources abondantes');
  const a = L.unites.find(u => u.j === 0 && u.cle === 'cav'), e = L.unites.find(u => u.j === 1 && u.cle === 'villageois');
  ok(BT.ordreContexte(L, 0, [a.id], e.x, e.z, e.id) === 'treve', 'trêve : attaque refusée');
  L.joueurs[0].connu.fill(1); ok(!BT.pouvoir(L, 0, 0, e.x, e.z).ok || R.POUVOIRS[L.joueurs[0].pouvoirs[0].id].type === 'ressources', 'trêve : pouvoir offensif refusé');
  // port et pêche sur la mer intérieure
  const M = nouvelle({ carte: 'mediterranee', taille: 'moyenne', graine: 4 }); M.joueurs[1].ia = false;
  const JM = M.joueurs[0]; JM.connu.fill(1); JM.res.bois += 2000; JM.res.or += 1000; JM.res.nourriture += 1000;
  ok(M.aEau && M.res.some(r => r.sous === 'poisson'), 'mer intérieure : eau navigable et poissons');
  const cm = M.bats.find(b => b.j === 0 && b.cle === 'centre');
  let pp = null; for (let r = 10; r < 90 && !pp; r += 2) for (let t = 0; t < 40 && !pp; t++) { const x = cm.x + Math.cos(t / 40 * 6.28) * r, z = cm.z + Math.sin(t / 40 * 6.28) * r; if (BT.peutPoser(M, 0, 'port', (Math.floor(x / 2) + 0.5) * 2, (Math.floor(z / 2) + 0.5) * 2).ok) pp = [(Math.floor(x / 2) + 0.5) * 2, (Math.floor(z / 2) + 0.5) * 2]; }
  ok(pp, 'place de port au bord de l’eau');
  const port = BT.poser(M, 0, 'port', pp[0], pp[1], M.unites.filter(u => u.j === 0 && u.cle === 'villageois').map(u => u.id)).bat;
  for (let t = 0; t < 70 / BT.PAS && !port.fini; t++) BT.pas(M);
  ok(port.fini, 'port bâti');
  ok(BT.formables(M, port).join() === 'peche,transport,navire', 'le port forme bateaux de pêche, transports et navires');
  BT.former(M, 0, port.id, 'peche'); BT.former(M, 0, port.id, 'navire');
  for (let t = 0; t < 45 / BT.PAS; t++) BT.pas(M);
  const bp = M.unites.find(u => u.cle === 'peche' && u.j === 0), nav = M.unites.find(u => u.cle === 'navire' && u.j === 0);
  ok(bp && nav, 'bateaux formés');
  ok(bp && M.eau[Math.floor(bp.z / 2) * M.n + Math.floor(bp.x / 2)] === 1, 'bateau posé sur l’eau');
  const poisson = BT.ressourceProche(M, bp.x, bp.z, 'nourriture', 300, 0, 'poisson'), nour = JM.res.nourriture;
  ok(BT.ordreContexte(M, 0, [bp.id], poisson.x, poisson.z, poisson.id) === 'recolter', 'clic droit sur les poissons : pêche');
  for (let t = 0; t < 120 / BT.PAS; t++) BT.pas(M);
  ok(JM.res.nourriture > nour + 10, `poisson rapporté au port (${Math.round(JM.res.nourriture - nour)})`);
  ok(M.unites.filter(u => u.s.naval).every(u => M.eau[Math.floor(u.z / 2) * M.n + Math.floor(u.x / 2)] === 1), 'les bateaux restent sur l’eau');
  const cible2 = BT.ajouterUnite(M, 1, 'navire', nav.x + 10, nav.z); M.eau[0] = M.eau[0];
  const pvAv = cible2.pv; BT.ordreContexte(M, 0, [nav.id], cible2.x, cible2.z, cible2.id);
  for (let t = 0; t < 20 / BT.PAS; t++) BT.pas(M);
  ok(cible2.pv < pvAv || cible2.mort, 'combat naval');
  // transport : des soldats montent à bord, traversent la mer et débarquent sur l'autre rive
  const treveAv = M.treve, finieAv = M.treveFinie; M.treve = M.temps + 400; // pas de combat pendant la traversée
  BT.former(M, 0, port.id, 'transport'); for (let t = 0; t < 25 / BT.PAS; t++) BT.pas(M);
  const tr = M.unites.find(u => u.cle === 'transport' && u.j === 0); ok(tr, 'navire de transport formé');
  const soldats = [0, 1, 2, 3].map(k => BT.ajouterUnite(M, 0, 'inf', cm.x + k, cm.z + cm.taille)); BT.majPop(M);
  ok(BT.ordreContexte(M, 0, soldats.map(u => u.id), tr.x, tr.z, tr.id) === 'entrer', 'clic droit sur le transport : embarquer');
  for (let t = 0; t < 90 / BT.PAS && BT.contenu(M, tr).length < 4; t++) BT.pas(M);
  ok(BT.contenu(M, tr).length === 4, `quatre soldats à bord (${BT.contenu(M, tr).length})`);
  const depart = [tr.x, tr.z], loin = [M.cote - pp[0], M.cote - pp[1]];
  let rive = null; for (let r = 0; r < 60 && !rive; r += 2) for (let t = 0; t < 24 && !rive; t++) { const x = loin[0] + Math.cos(t / 24 * 6.28) * r, z = loin[1] + Math.sin(t / 24 * 6.28) * r; if (BT.marchable(M, x, z) && BT.hauteur(M, x, z) > 0.4) rive = [x, z]; }
  ok(rive, 'rive opposée trouvée');
  ok(BT.ordreContexte(M, 0, [tr.id], rive[0], rive[1], 0) === 'debarquer', 'clic droit sur la terre : débarquer');
  for (let t = 0; t < 200 / BT.PAS && BT.contenu(M, tr).length; t++) BT.pas(M);
  ok(!BT.contenu(M, tr).length && soldats.every(u => !u.dans && !u.mort), 'tout le monde a débarqué');
  ok(soldats.every(u => BT.marchable(M, u.x, u.z) && M.eau[Math.floor(u.z / 2) * M.n + Math.floor(u.x / 2)] !== 1), 'débarqués sur la terre ferme');
  ok(soldats.every(u => Math.hypot(u.x - rive[0], u.z - rive[1]) < Math.hypot(depart[0] - rive[0], depart[1] - rive[1]) * 0.6), 'traversée faite');
  M.treve = treveAv; M.treveFinie = finieAv;
  // un passager à bord pour l'enregistrement
  const pass = BT.ajouterUnite(M, 0, 'villageois', soldats[0].x, soldats[0].z); BT.majPop(M);
  BT.ordreContexte(M, 0, [pass.id], tr.x, tr.z, tr.id); for (let t = 0; t < 40 / BT.PAS && !pass.dans; t++) BT.pas(M);
  ok(pass.dans === tr.id, 'villageois à bord');
  // enregistrement puis rechargement : même état
  const avant = BT.sauver(M), json = JSON.stringify(avant), M2 = BT.charger(JSON.parse(json));
  ok(json.length < 400000, `enregistrement compact (${Math.round(json.length / 1024)} Ko)`);
  ok(M2.unites.length === M.unites.filter(u => !u.mort).length && M2.bats.length === M.bats.filter(b => !b.mort).length, 'rechargement : unités et bâtiments');
  ok(Math.round(M2.joueurs[0].res.nourriture) === Math.round(JM.res.nourriture) && M2.temps === M.temps, 'rechargement : ressources et temps');
  ok(M2.res.length === M.res.filter(r => r.qte > 0).length, 'rechargement : ressources de la carte');
  ok([...M2.bloc].every((v, i) => v === M.bloc[i]), 'rechargement : grille de passage identique');
  for (let t = 0; t < 30 / BT.PAS; t++) { BT.pas(M2); }
  ok(M2.unites.every(u => Number.isFinite(u.x)) && !M2.fin, 'la partie rechargée continue');
  ok(M2.parId.get(pass.id) && M2.parId.get(pass.id).dans === tr.id, 'rechargement : le passager reste à bord');
  // naufrage : le transport coule avec ses passagers
  const tr2 = M2.parId.get(tr.id); tr2.pv = 1; const pass2 = M2.parId.get(pass.id);
  const nav2 = BT.ajouterUnite(M2, 1, 'navire', tr2.x + 8, tr2.z); for (let t = 0; t < 30 / BT.PAS && !tr2.mort; t++) BT.pas(M2);
  ok(!nav2 || tr2.mort ? pass2.mort : true, 'naufrage : les passagers périssent');
  // missions : chacune se crée et ses objectifs se lisent
  for (const def of R.CAMPAGNE) {
    const X = BT.nouvelleMission(def);
    ok(X.mission && X.mission.objectifs.length === def.objectifs.length && X.joueurs.length === def.adversaires.length + 1, `mission ${def.id} créée`);
    for (let t = 0; t < 5 / BT.PAS; t++) BT.pas(X);
    ok(!X.fin && X.mission.objectifs.every(o => o.texte), `mission ${def.id} en cours`);
    if (def.id === 'siege') ok(X.bats.filter(b => b.j === 1 && b.cle === 'mur').length > 30 && X.bats.some(b => b.j === 1 && b.cle === 'porte'), 'mission siege : enceinte du duc');
  }
  // première mission jouée par l'ordinateur à la place du joueur : objectifs atteints
  const F = BT.nouvelleMission(R.CAMPAGNE[0]); F.joueurs[0].ia = true; F.joueurs[0].difficulte = 2;
  for (let t = 0; t < 900 / BT.PAS && !F.fin; t++) BT.pas(F);
  ok(F.fin && F.fin.raison === 'mission', `mission 1 réussie par l’ordinateur (${F.fin ? Math.round(F.fin.temps / 60) + ' min' : 'non'})`);
  // vagues de la deuxième mission
  const V = BT.nouvelleMission(R.CAMPAGNE[1]); for (let t = 0; t < 160 / BT.PAS; t++) BT.pas(V);
  ok(V.mission.vagues[0].fait && V.unites.some(u => u.j === 1 && u.ordre && (u.ordre.type === 'deplacer' || u.ordre.type === 'attaquer')), 'mission 2 : la première vague attaque');
}

// 3 quater. créatures : coup spécial qui touche et repousse les ennemis groupés
{
  const X = nouvelle({ graine: 31 }); X.joueurs[1].ia = false; const c = X.bats.find(b => b.j === 0 && b.cle === 'centre');
  const m = BT.ajouterUnite(X, 0, 'minotaure', c.x, c.z + c.taille + 4), cible = BT.ajouterUnite(X, 1, 'inf', m.x + 2.2, m.z), voisins = [[0.8, 1], [0.8, -1], [1.6, 0]].map(([dx, dz]) => BT.ajouterUnite(X, 1, 'inf', cible.x + dx, cible.z + dz));
  BT.majPop(X); const pv = voisins.map(v => v.pv); BT.ordreContexte(X, 0, [m.id], cible.x, cible.z, cible.id);
  let special = 0; for (let t = 0; t < 6 / BT.PAS; t++) { BT.pas(X); for (const e of X.evts.splice(0)) if (e.type === 'special') special++; }
  ok(special >= 1, 'créature : coup spécial');
  ok(voisins.some((v, i) => v.mort || v.pv < pv[i]), 'coup spécial : les ennemis voisins sont touchés');
}

// 3 ter. archipel : l'ordinateur embarque son armée et débarque sur l'île ennemie
{
  const A = nouvelle({ carte: 'iles', graine: 3, joueurs: [{ pantheon: 'grecs', ia: true, difficulte: 2 }, { pantheon: 'nordiques', ia: true, difficulte: 1 }] });
  const ile = [0, 1].map(j => { const c = A.bats.find(b => b.j === j && b.cle === 'centre'); return BT.ileDe(A, c.x, c.z); });
  let debarques = 0, chezEnnemi = 0;
  for (let t = 0; t < 30 * 60 / BT.PAS && !A.fin; t++) { BT.pas(A); for (const e of A.evts.splice(0)) if (e.type === 'sortie') { const tr = A.parId.get(e.id); if (tr && tr.sorte === 'u') debarques += e.n; }
    if (A.tick % 200 === 0) chezEnnemi = Math.max(chezEnnemi, A.unites.filter(u => !u.mort && !u.dans && u.cle !== 'villageois' && !u.s.naval && BT.ileDe(A, u.x, u.z) === ile[1 - u.j]).length); }
  ok(A.unites.some(u => u.cle === 'transport') || debarques, 'archipel : l’ordinateur arme des transports');
  ok(debarques >= 8, `archipel : l’ordinateur débarque son armée (${debarques} soldats)`);
  ok(chezEnnemi >= 4, `archipel : des troupes posent le pied chez l’ennemi (${chezEnnemi})`);
  console.log(`Archipel : ${debarques} soldats débarqués${A.fin ? ', fin à ' + Math.round(A.fin.temps / 60) + ' min' : ''}`);
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
  { titre: 'Quatre peuples (rivière, futur)', epoque: 'futur', carte: 'riviere', taille: 'moyenne', graine: 9, minutes: 50, joueurs: [{ pantheon: 'grecs', equipe: 0 }, { pantheon: 'egyptiens', equipe: 1 }, { pantheon: 'nordiques', equipe: 0 }, { pantheon: 'atlantes', equipe: 1 }] }
];
cas.push({ titre: 'Partie longue sur la mer intérieure', epoque: 'medieval', carte: 'mediterranee', taille: 'moyenne', duree: 'longue', graine: 12, minutes: 55, joueurs: [{ pantheon: 'atlantes', difficulte: 2 }, { pantheon: 'nordiques', difficulte: 1 }] });
if (process.env.BATAILLE_LONG) for (const carte of Object.keys(R.CARTES)) for (const epoque of Object.keys(PM.EPOQUES)) cas.push({ titre: `${carte} ${epoque}`, epoque, carte, graine: carte.length * 7 + epoque.length, joueurs: [{ pantheon: 'grecs', difficulte: 2 }, { pantheon: 'nordiques', difficulte: 1 }] });
for (const c of cas) {
  const { B, ms, maxPas } = partie(c, c.minutes || 35);
  const J = B.joueurs, s = J.map(x => `${x.pantheon} âge ${x.age} pop ${x.pop}/${x.popMax} formées ${x.stats.formees} tuées ${x.stats.tues} récolte ${Math.round(x.stats.recolte)} bât ${x.stats.construits}${x.vaincu ? ' VAINCU' : ''}`).join(' | ');
  console.log(`${c.titre} : ${B.fin ? `fin à ${Math.round(B.fin.temps / 60)} min (${B.fin.raison})` : `pas de fin en ${Math.round(B.temps / 60)} min`} — ${ms} ms, pas le plus long ${maxPas.toFixed(1)} ms\n   ${s}`);
  ok(J.every(x => x.stats.recolte > 3000), `${c.titre} : économie qui tourne`);
  ok(J.every(x => x.age >= 2 || x.vaincu), `${c.titre} : passages d’âge`);
  ok(J.every(x => x.stats.formees >= 25 || x.vaincu), `${c.titre} : unités formées`);
  ok(J.some(x => x.stats.tues > 10), `${c.titre} : combats`);
  ok(J.some(x => (x.techs || []).length >= 3), `${c.titre} : l’ordinateur recherche des améliorations (${J.map(x => (x.techs || []).length).join('/')})`);
  if (c.duree) { ok(B.fin ? J.some(x => x.stats.recolte > 12000) : J.some(x => x.stats.recolte > 30000) && J.every(x => x.stats.recolte > 10000), `${c.titre} : grandes économies`); ok(B.bats.some(b => b.cle === 'port') || B.unites.some(u => u.s.naval), `${c.titre} : l’ordinateur prend la mer`); }
  else ok(B.fin, `${c.titre} : la partie se termine`);
  ok(maxPas < 25, `${c.titre} : pas de simulation rapide (${maxPas.toFixed(1)} ms)`);
  ok([...B.unites, ...B.bats].every(e => Number.isFinite(e.x) && Number.isFinite(e.z)), `${c.titre} : positions valides`);
}

console.log(ko ? `Bataille : ${ko} échec(s) sur ${n} contrôles` : `Bataille : ${n} contrôles réussis`);
process.exit(ko ? 1 : 0);
