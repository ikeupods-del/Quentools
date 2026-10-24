// Pax Mythica — parcours de l'interface dans Chromium (Playwright) : accueil, création rapide et personnalisée, éditeur,
// panneaux, constructions, recrutement, marche à la souris, pouvoirs, décret, sauvegarde, scénarios, et 20 ans de jeu sans erreur.
// Lancer : node tests/interface.js (Playwright est pris dans le dépôt, sinon dans l'installation globale).
'use strict';
const path = require('path');
let pw = null;
for (const c of ['playwright', path.join(__dirname, '../../wouf/node_modules/playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(c); break; } catch (e) { /* suivant */ } }
if (!pw) { console.log('Playwright introuvable : essai de l’interface ignoré.'); process.exit(0); }
const url = 'file://' + path.join(__dirname, '..', 'index.html');
let ko = 0, n = 0;
const ok = (c, m) => { n++; if (!c) { ko++; console.log('✗ ' + m); } };

(async () => {
  const b = await pw.chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const erreurs = []; p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /THREE/.test(m.text()))) erreurs.push(m.text()); }); p.on('pageerror', e => erreurs.push(e.message));
  const ev = (f, x) => p.evaluate(f, x);
  const fermerModals = () => ev(() => { for (let k = 0; k < 8 && !document.querySelector('#modal').classList.contains('cache'); k++) { const x = document.querySelector('#modalBoite .carte-choix, #modalBoite .choix .btn:not([disabled]), #modalBoite [data-act$=oui], #modalBoite [data-act=fermer], #modalBoite [data-act=commencer]'); if (!x) break; x.click(); } });
  // qualité moyenne pendant l'essai (pas de carte graphique ici) ; les autres qualités sont essayées plus bas
  p.setDefaultTimeout(90000);
  await p.addInitScript(() => { window.PM_ECHELLE = 0.3; try { if (!sessionStorage.getItem('essai')) { localStorage.setItem('pm:qualite', 'moyenne'); sessionStorage.setItem('essai', '1'); } } catch (e) { /* sans stockage */ } });
  await p.goto(url);
  ok(await p.isVisible('text=Nouvelle partie'), 'accueil');
  ok(await ev(() => PM.vue3dPossible()), 'WebGL disponible pour la vue 3D');

  // création rapide
  await p.click('[data-act=rapide]'); await p.click('[data-act=cre-epoque][data-v=antique]'); await p.click('[data-act=cre-pantheon][data-v=egyptiens]'); await p.click('[data-act=cre-dieu][data-v=ra]');
  await p.fill('#creNom', 'Royaume du Test'); await p.click('[data-act=cre-lancer]');
  ok(await p.isVisible('[data-act=commencer]'), 'fenêtre d’ouverture');
  await p.click('[data-act=commencer]');
  ok(await ev(() => UI.vitesse === 1 && UI.j.etat.nations[UI.j.etat.joueur].nom === 'Royaume du Test'), 'partie lancée avec le nom choisi');
  ok(await ev(() => !!UI.vue3d && UI.mode3d && !document.querySelector('#carte3d').classList.contains('cache')), 'vue 3D affichée');
  await ev(() => { UI.ACT.vitesse({ dataset: { v: 0 } }); UI.j.etat.nations[UI.j.etat.joueur].res = { nourriture: 4000, bois: 4000, or: 4000, faveur: 200 }; UI.rafraichir(); });

  // province : construire, développer, recruter
  const cap = await ev(() => { UI.vue().centrerSur(UI.j.etat.nations[UI.j.etat.joueur].capitale, 1.6); UI.vue().stabiliser(); const E = UI.j.etat, c = UI.j.carte.provinces[E.nations[E.joueur].capitale]; return UI.vue().versEcran(c.lx, c.ly); });
  await p.mouse.click(cap.x, cap.y);
  ok(await ev(() => UI.sel && UI.sel.type === 'province' && UI.sel.id === UI.j.etat.nations[UI.j.etat.joueur].capitale), 'clic sur la capitale');
  ok(await p.isVisible('#gauche >> text=Bâtiments'), 'panneau de la capitale');
  const bois = await ev(() => UI.j.etat.nations[UI.j.etat.joueur].res.bois);
  await p.click('#gauche [data-act=construire][data-v=mine]');
  ok(await ev(b0 => UI.j.etat.provinces[UI.j.etat.nations[UI.j.etat.joueur].capitale].bat.mine === 1 && UI.j.etat.nations[UI.j.etat.joueur].res.bois < b0, bois), 'mine construite et payée');
  await p.click('#gauche [data-act=developper]');
  ok(await ev(() => UI.j.etat.provinces[UI.j.etat.nations[UI.j.etat.joueur].capitale].dev === 4), 'province développée');
  const avant = await ev(() => PM.pop(UI.j, UI.j.etat.joueur));
  await p.click('#gauche [data-act=recruter][data-k="5"] >> nth=0');
  ok(await ev(a => PM.pop(UI.j, UI.j.etat.joueur) > a, avant), 'recrutement');

  // armée : sélection puis marche à la souris vers une terre libre voisine
  const box = await ev(() => { UI.vue().stabiliser(); const E = UI.j.etat, a = E.armees.find(x => x.owner === E.joueur); return UI.vue().boites.find(x => x.id === a.id); });
  await p.mouse.click(box.x + 10, box.y + 8);
  ok(await ev(() => UI.sel && UI.sel.type === 'armee'), 'armée sélectionnée');
  const cible = await ev(() => { UI.vue().stabiliser(); const E = UI.j.etat, N = E.nations[E.joueur]; for (const v of UI.j.carte.provinces[N.capitale].voisins.filter(x => E.provinces[x].owner < 0)) { const c = UI.j.carte.provinces[v], e = UI.vue().versEcran(c.lx, c.ly); if (['carte', 'carte3d'].includes((document.elementFromPoint(e.x, e.y) || {}).id) && UI.vue().armeeA(e.x, e.y) == null) return { id: v, ...e }; } return null; });
  if (cible) {
    await p.mouse.click(cible.x, cible.y);
    ok(await ev(() => { const E = UI.j.etat; return E.armees.some(a => a.owner === E.joueur && a.chemin.length); }), 'ordre de marche donné à la souris');
    for (let i = 0; i < 10; i++) { await ev(() => UI.unMois()); await fermerModals(); }
    ok(await ev(id => UI.j.etat.provinces[id].owner === UI.j.etat.joueur, cible.id), 'terre libre conquise');
  }

  // onglets
  for (const o of ['diplo', 'armees', 'chronique', 'pantheon']) { await p.click(`[data-act=onglet][data-v=${o}]`); ok((await p.textContent('#ongletContenu')).length > 30, 'onglet ' + o); }
  // pouvoir sans cible (Pluie de Râ) puis pouvoir ciblé annulé par Échap
  await ev(() => { const N = UI.j.etat.nations[UI.j.etat.joueur]; N.pouvoirs.foudre = 0; UI.ACT.onglet({ dataset: { v: 'pantheon' } }); });
  await p.click('[data-act=pouvoir][data-v=pluie]');
  ok(await ev(() => UI.j.etat.nations[UI.j.etat.joueur].effets.some(e => e.cle === 'nourriture')), 'pouvoir sans cible');
  await p.click('[data-act=pouvoir][data-v=foudre]');
  ok(await p.isVisible('#bandeauCible'), 'mode ciblage');
  await p.keyboard.press('Escape');
  ok(await p.isHidden('#bandeauCible'), 'ciblage annulé');

  // alliances : proposer un pacte depuis l'onglet, voir l'accueil attendu
  await ev(() => { const E = UI.j.etat, n = E.joueur, m = E.nations.find(M => M.id !== n && M.vivante).id; PM.changerRelation(UI.j, n, m, 90 - PM.relation(UI.j, n, m)); UI.choixPacte = { nation: m, type: 'defensive' }; });
  await p.click('[data-act=onglet][data-v=alliances]');
  ok(await p.isVisible('#ongletContenu >> text=Accueil attendu'), 'onglet alliances : accueil attendu');
  await p.selectOption('#pacteType', 'nonagression');
  ok(await ev(() => UI.choixPacte.type === 'nonagression'), 'choix du type de pacte gardé');
  await p.selectOption('#pacteType', 'defensive');
  await p.click('[data-act=pacte-proposer]');
  ok(await ev(() => !!PM.allianceDe(UI.j, UI.j.etat.joueur)), 'alliance conclue depuis l’onglet');
  ok(await p.isVisible('#ongletContenu >> text=Tes pactes'), 'pacte affiché');
  await p.screenshot({ path: path.join(require('os').tmpdir(), 'pax-alliances.png') });

  // décret
  await p.fill('#decretTexte', 'Construire un temple et organiser des grands jeux. Prier les dieux.');
  await p.press('#decretTexte', 'Enter');
  await p.waitForSelector('#modalBoite >> text=Décret de');
  ok(await p.locator('#modalBoite .info').count() >= 2, 'décret exécuté');
  await p.click('#modalBoite [data-act=fermer]');

  // sauvegarde puis chargement
  await ev(() => UI.ACT.sauver()); await p.fill('#nomSaisi', 'Essai'); await p.click('#nomOk');
  const mois = await ev(() => UI.j.etat.mois);
  await ev(() => { UI.unMois(); UI.unMois(); }); await fermerModals();
  await ev(() => UI.ACT.charger()); await p.click('[data-act=charger-une]');
  ok(await ev(m => UI.j.etat.mois === m, mois), 'partie rechargée');

  // 20 ans à toute vitesse, fenêtres répondues automatiquement (carte 2D pendant ce temps : la 3D sans carte graphique est lente)
  await ev(() => { if (UI.mode3d) UI.ACT.vue(); });
  for (let i = 0; i < 240; i++) { await ev(() => UI.unMois()); if (i % 4 === 0) await fermerModals(); }
  await fermerModals();
  ok(await ev(() => UI.j.etat.mois >= 240 || !!UI.j.etat.fin), '20 ans joués');
  await ev(() => { if (!UI.mode3d) UI.ACT.vue(); });

  // partie personnalisée + éditeur
  await ev(() => UI.ACT.accueil());
  await p.click('[data-act=perso]');
  await p.click('[data-act=p-ajouter]');
  ok(await p.locator('table.peuples tr').count() === 8, 'peuple ajouté');
  await p.selectOption('#pForme', 'archipel'); await p.selectOption('#pTaille', 'petite');
  await p.click('[data-act=p-editeur]');
  await ev(() => { if (UI.mode3d) UI.ACT.vue(); }); // éditeur essayé sur la carte 2D (même code ; la 3D sans carte graphique est trop lente ici)
  ok(await p.isVisible('#gauche >> text=Éditeur de carte'), 'éditeur ouvert');
  const pr = await ev(() => { UI.vue().stabiliser(); const E = UI.j.etat; for (const q of E.provinces.filter(x => x.owner < 0)) { const c = UI.j.carte.provinces[q.id], e = UI.vue().versEcran(c.lx, c.ly); if (['carte', 'carte3d'].includes((document.elementFromPoint(e.x, e.y) || {}).id) && UI.vue().provinceA(e.x, e.y) === q.id) return { id: q.id, ...e }; } return null; });
  await p.mouse.click(pr.x, pr.y);
  ok(await ev(id => UI.j.etat.provinces[id].owner === UI.editeur.nation, pr.id), 'province peinte');
  await p.click('[data-act=ed-outil][data-v=terrain]'); await p.click('[data-act=ed-terrain][data-v=montagne]'); await p.mouse.click(pr.x, pr.y);
  ok(await ev(id => UI.j.etat.provinces[id].terrain === 'montagne', pr.id), 'terrain changé');
  await p.click('[data-act=ed-outil][data-v=nom]'); await p.mouse.click(pr.x, pr.y); await p.fill('#edNom', 'Olympie'); await p.click('[data-act=ed-nom]');
  ok(await ev(id => UI.j.etat.provinces[id].nom === 'Olympie', pr.id), 'province renommée');
  await p.click('[data-act=ed-scenario]'); await p.fill('#nomSaisi', 'Mon monde'); await p.click('#nomOk');
  await p.click('[data-act=ed-lancer]'); await fermerModals();
  ok(await ev(() => !UI.editeur && UI.ecran === 'jeu' && UI.j.etat.provinces.some(x => x.nom === 'Olympie')), 'partie lancée depuis l’éditeur');
  await ev(() => { if (!UI.mode3d) UI.ACT.vue(); });

  // scénarios
  await ev(() => UI.ACT.accueil()); await p.click('[data-act=scenarios]');
  ok(await p.isVisible('#modalBoite >> text=Mon monde'), 'scénario enregistré listé');
  await p.click('[data-act=preset][data-v="1"]'); await p.click('[data-act=p-lancer]'); await fermerModals();
  ok(await ev(() => UI.j.etat.nations.length === 2), 'scénario « Duel des dieux »');
  await ev(() => UI.ACT.accueil()); await p.click('[data-act=scenarios]'); await p.click('[data-act=mon-scenario]'); await p.click('[data-act=jouer-scenario] >> nth=1'); await fermerModals();
  ok(await ev(() => UI.j.etat.joueur !== 0 || UI.j.etat.nations[0].ia === false), 'scénario joué avec un autre peuple');

  // vue 2D ⇄ 3D (touche V) et clic dans la carte 2D
  await ev(() => UI.ACT.accueil()); await p.click('[data-act=rapide]'); await p.click('[data-act=cre-epoque][data-v=medieval]');
  ok(await p.isVisible('text=Byzantins'), 'époque Moyen Âge : peuples renommés');
  await p.click('[data-act=cre-pantheon][data-v=grecs]'); await p.click('[data-act=cre-dieu] >> nth=0'); await p.click('[data-act=cre-lancer]'); await fermerModals();
  ok(await ev(() => UI.j.etat.reglages.epoque === 'medieval' && PM.unitesDispo(UI.j, UI.j.etat.joueur).map(u => PM.UNITES[u].nom).includes('Chevaliers')), 'unités du Moyen Âge');
  ok((await p.textContent('#onglets')).includes('Légendes'), 'vocabulaire de l’époque');
  await ev(() => { UI.ACT.vitesse({ dataset: { v: 0 } }); document.activeElement && document.activeElement.blur(); });
  await p.keyboard.press('v');
  ok(await ev(() => !UI.mode3d && !document.querySelector('#carte').classList.contains('cache')), 'passage à la carte 2D');
  const c2 = await ev(() => { const N = UI.j.etat.nations[UI.j.etat.joueur]; UI.vue().centrerSur(N.capitale, 1.6); UI.vue().stabiliser(); const c = UI.j.carte.provinces[N.capitale]; return UI.vue().versEcran(c.lx, c.ly); });
  await p.mouse.click(c2.x, c2.y);
  ok(await ev(() => UI.sel && UI.sel.type === 'province' && UI.sel.id === UI.j.etat.nations[UI.j.etat.joueur].capitale), 'clic dans la carte 2D');
  await p.keyboard.press('v');
  ok(await ev(() => UI.mode3d), 'retour à la vue 3D');
  for (const e of ['industriel', 'moderne', 'futur']) { await ev(e => { UI.lancerPartie(PM.nouvellePartie({ epoque: e, graine: 5, nombre: 4, taille: 'petite' })); UI.fermerModal(); for (let i = 0; i < 6; i++) UI.unMois(); }, e); await fermerModals(); await p.waitForTimeout(300); }
  ok(await ev(() => UI.j.etat.reglages.epoque === 'futur' && PM.PANTHEONS.grecs.nom === 'Concorde solaire'), 'époques industrielle, moderne et future jouées');

  // packs graphiques : chacun se dessine ; chaque qualité (dont l'occlusion ambiante) aussi
  await ev(() => { if (!UI.mode3d) UI.ACT.vue(); });
  await p.click('[data-act=packs]');
  ok(await p.locator('#modalBoite [data-act=pack-choisir]').count() === Object.keys(await ev(() => PM.PACKS_GRAPHIQUES)).length, 'fenêtre des packs graphiques');
  await p.click('#modalBoite [data-act=pack-choisir][data-v=nuit]');
  ok(await ev(() => UI.vue3d.idPack === 'nuit' && PM.packGraphique() === 'nuit'), 'pack choisi et gardé');
  await p.click('#modalBoite [data-act=fermer]');
  for (const id of Object.keys(await ev(() => PM.PACKS_GRAPHIQUES))) await ev(id => { UI.vue3d.appliquerPack(id); UI.vue3d.stabiliser(); UI.vue3d.dessiner(16); }, id);
  for (const q of ['ultra', 'haute', 'basse', 'moyenne']) await ev(q => { UI.vue3d.appliquerQualite(q); UI.vue3d.dessiner(16); UI.vue3d.dessiner(16); }, q);
  ok(await ev(() => !!UI.vue3d.composer), 'effets de l’image actifs');

  ok(!erreurs.length, 'aucune erreur dans la page : ' + erreurs.slice(0, 3).join(' | '));
  await b.close();
  console.log(ko ? `\n${ko} échec(s) sur ${n} contrôles` : `Interface : ${n} contrôles réussis`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('✗ ' + e.message); process.exit(1); });
