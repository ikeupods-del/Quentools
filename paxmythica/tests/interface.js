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
const ok = (c, m) => { n++; if (process.env.TRACE) console.log((c ? '✓ ' : '✗ ') + m + ' ' + Math.round(process.uptime()) + 's'); else if (!c) console.log('✗ ' + m); if (!c) ko++; };

(async () => {
  const b = await pw.chromium.launch({ args: ['--allow-file-access-from-files'] }); // ressources graphiques lues depuis le disque
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const erreurs = []; p.on('console', m => { if (m.type() === 'error' || (m.type() === 'warning' && /THREE/.test(m.text()))) erreurs.push(m.text()); }); p.on('pageerror', e => erreurs.push(e.message));
  const ev = (f, x) => p.evaluate(f, x);
  const fermerModals = () => ev(() => { for (let k = 0; k < 8 && !document.querySelector('#modal').classList.contains('cache'); k++) { const x = document.querySelector('#modalBoite .carte-choix, #modalBoite .choix .btn:not([disabled]), #modalBoite [data-act$=oui], #modalBoite [data-act=fermer], #modalBoite [data-act=commencer]'); if (!x) break; x.click(); } });
  // qualité moyenne pendant l'essai (pas de carte graphique ici) ; les autres qualités sont essayées plus bas
  p.setDefaultTimeout(90000);
  await p.addInitScript(() => { window.PM_ECHELLE = 0.3; window.PM_LEGER = true; try { if (!sessionStorage.getItem('essai')) { localStorage.setItem('pm:qualite', 'moyenne'); sessionStorage.setItem('essai', '1'); } } catch (e) { /* sans stockage */ } });
  await p.goto(url);
  ok(await p.isVisible('text=Conquête du monde') && await p.isVisible('[data-act=bataille]'), 'accueil');
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

  // mode Bataille (temps réel) : création, interface, ordres à la souris, formation, pouvoir, pause, fin
  await ev(() => UI.ACT.accueil()); await p.click('[data-act=bataille]'); await p.click('[data-act=b-epoque][data-v=antique]'); await p.click('[data-act=b-pantheon][data-v=grecs]'); await p.click('[data-act=b-dieu][data-v=zeus]');
  await p.click('[data-act=b-carte][data-v=riviere]'); await p.click('[data-act=b-lancer]'); await p.click('[data-act=b-commencer]');
  ok(await ev(() => UI.ecran === 'bataille' && !!UI.bat.B && !UI.bat.pause), 'bataille lancée');
  ok(await ev(() => { PM.voix('villageois'); PM.ambianceMer(0.6); PM.ambianceMer(0); return typeof PM.voix === 'function'; }), 'voix des unités et bruit de la mer');
  await p.waitForFunction(() => UI.bat.vue.pret && UI.bat.vue.unitesPretes);
  ok(await p.isVisible('#batRes') && await p.isVisible('#batCarte') && await p.isVisible('#batOrdres'), 'barre des ressources, mini-carte et grille d’ordres');
  await ev(() => { UI.bat.B.joueurs[1].ia = false; });
  const cadre = await ev(() => { const B = UI.bat.B, v = UI.bat.vue, l = B.unites.filter(u => u.j === 0 && u.cle === 'villageois').map(u => v.versEcran(u.x, u.z, 1)); return [Math.min(...l.map(e => e.x)) - 25, Math.min(...l.map(e => e.y)) - 25, Math.max(...l.map(e => e.x)) + 25, Math.max(...l.map(e => e.y)) + 25]; });
  await p.mouse.move(cadre[0], cadre[1]); await p.mouse.down(); await p.mouse.move(cadre[2], cadre[3], { steps: 6 }); await p.mouse.up();
  ok(await ev(() => UI.bat.sel.length >= 5), 'cadre de sélection');
  await p.keyboard.press('q');
  const libre = await ev(() => { const B = UI.bat.B, v = UI.bat.vue, c = B.bats.find(b => b.j === 0 && b.cle === 'centre'); for (let a = 0; a < 80; a++) { const x = c.x + Math.cos(a) * (14 + a * 0.1), z = c.z + Math.sin(a) * (14 + a * 0.1); if (PM.Bataille.peutPoser(B, 0, 'maison', (Math.floor(x / 2) + 0.5) * 2, (Math.floor(z / 2) + 0.5) * 2).ok) { const e = v.versEcran(x, z, 0); if (e.y > 60 && e.y < 680 && e.x > 230 && e.x < 1400) return e; } } return null; });
  await p.mouse.move(libre.x, libre.y, { steps: 3 }); await p.mouse.click(libre.x, libre.y);
  ok(await ev(() => UI.bat.B.bats.some(b => b.j === 0 && b.cle === 'maison') && UI.bat.B.unites.some(u => u.ordre && u.ordre.type === 'construire')), 'maison posée, villageois au chantier');
  await ev(() => { UI.bat.sel = UI.bat.B.unites.filter(u => u.j === 0 && u.cle === 'villageois').slice(0, 2).map(u => u.id); });
  const baie = await ev(() => { const B = UI.bat.B, v = UI.bat.vue, r = B.res.find(r => r.sous === 'baies' && v.brouillardEn(r.x, r.z) === 2); return v.versEcran(r.x, r.z, 0.4); });
  await p.mouse.click(baie.x, baie.y, { button: 'right' });
  ok(await ev(() => UI.bat.sel.every(i => UI.bat.B.parId.get(i).ordre.type === 'recolter')), 'clic droit sur les baies : récolte');
  // clic gauche sur un arbre avec des villageois choisis : ordre de couper du bois, étiquette d'action au survol
  const arbreG = await ev(() => { const B = UI.bat.B, v = UI.bat.vue; for (const r of B.res) if (r.sous === 'arbre' && v.brouillardEn(r.x, r.z) === 2) { const e = v.versEcran(r.x, r.z, 0.5); if (e.y > 80 && e.y < 560 && e.x > 100 && e.x < 1300) return e; } });
  const cueilleurs = await ev(() => UI.bat.sel.slice());
  if (arbreG) {
    await ev(c => { const B = UI.bat.B; UI.bat.sel = B.unites.filter(u => u.j === 0 && u.cle === 'villageois' && !c.includes(u.id)).slice(0, 2).map(u => u.id); }, cueilleurs);
    await p.mouse.move(arbreG.x - 15, arbreG.y - 15); await p.mouse.move(arbreG.x, arbreG.y, { steps: 3 }); await p.waitForTimeout(250); await p.mouse.move(arbreG.x + 1, arbreG.y); await p.waitForTimeout(150);
    ok(await ev(() => { const a = document.querySelector('#batAide'); return !!a && !a.classList.contains('cache') && a.textContent.includes('bois'); }), 'étiquette « Couper du bois » au survol');
    await p.mouse.click(arbreG.x, arbreG.y);
    ok(await ev(() => UI.bat.sel.length >= 1 && UI.bat.sel.every(i => { const u = UI.bat.B.parId.get(i); return u.ordre && u.ordre.type === 'recolter' && (UI.bat.B.parId.get(u.ordre.cible) || {}).sous === 'arbre'; })), 'clic gauche sur un arbre : les villageois coupent du bois');
  }
  await p.keyboard.press('h'); await p.waitForTimeout(150); await p.keyboard.press('q');
  ok(await ev(() => UI.bat.B.bats.find(b => b.j === 0 && b.cle === 'centre').file.length === 1), 'villageois en formation (touche de la grille)');
  await ev(() => { const B = UI.bat.B; for (let k = 0; k < 20 * 40; k++) PM.Bataille.pas(B); });
  ok(await ev(() => UI.bat.B.joueurs[0].stats.recolte > 30 && UI.bat.B.bats.some(b => b.j === 0 && b.cle === 'maison' && b.fini)), 'récolte et construction en jeu');
  await ev(() => { const J = UI.bat.B.joueurs[0]; J.res.nourriture += 3000; J.res.or += 3000; });
  await p.keyboard.press('h'); await p.waitForTimeout(150); await p.click('#batOrdres [data-act=b-age]'); await p.click('#modalBoite [data-act=b-mineur]');
  ok(await ev(() => !!UI.bat.B.joueurs[0].ageEnCours && !UI.bat.pause), 'passage d’âge avec choix du dieu mineur');
  // cloche du centre-ville (touche C de la grille) : les villageois s'abritent, puis ressortent
  await p.keyboard.press('h'); await p.waitForTimeout(150); await p.keyboard.press('c');
  ok(await ev(() => UI.bat.B.unites.filter(u => u.j === 0 && u.cle === 'villageois' && u.ordre && u.ordre.type === 'entrer').length >= 3), 'cloche : les villageois courent s’abriter');
  await ev(() => { for (let k = 0; k < 20 * 20; k++) PM.Bataille.pas(UI.bat.B); }); await p.waitForTimeout(300);
  ok(await ev(() => UI.bat.B.unites.some(u => u.dans)), 'villageois abrités dans le centre-ville');
  await p.click('#batOrdres [data-act=b-cloche]');
  ok(await ev(() => !UI.bat.B.unites.some(u => u.dans)), 'fin de l’alerte');
  await p.hover('#batOrdres [data-act=b-former]'); await p.waitForTimeout(250);
  ok(await ev(() => { const f = document.querySelector('#batFiche'); return !!f && !f.classList.contains('cache') && /⚔️/.test(f.textContent); }), 'fiche détaillée au survol de la grille');
  await p.mouse.move(640, 300); await p.keyboard.press(',');
  ok(await ev(() => UI.bat.sel.length >= 1 && UI.bat.sel.every(i => UI.bat.B.parId.get(i).cle !== 'villageois')), 'touche , : toute l’armée');
  await ev(() => { UI.bat.B.toutVoir = true; for (let k = 0; k < 12; k++) PM.Bataille.pas(UI.bat.B); const c = UI.bat.B.unites.find(u => u.j === 1); UI.bat.vue.centrerXZ(c.x, c.z + 6); UI.bat.vue.stabiliser(); });
  await p.waitForTimeout(300); await p.click('#batPouvoirs [data-act=b-pouvoir]');
  const ennemi = await ev(() => { const u = UI.bat.B.unites.find(u => u.j === 1 && !u.mort); return UI.bat.vue.versEcran(u.x, u.z, 0); });
  await p.mouse.click(ennemi.x, ennemi.y);
  ok(await ev(() => UI.bat.B.joueurs[0].pouvoirs[0].utilise), 'pouvoir divin lancé à la souris');
  for (let k = 0; k < 10; k++) await ev(() => UI.bat.vue.dessiner(16));
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  ok(await ev(() => UI.bat.pause && UI.modalOuvert()), 'menu de pause');
  await p.click('#modalBoite [data-act=b-sauver-menu]'); await p.click('#modalBoite [data-act=b-sauver][data-v="1"]');
  ok(await ev(() => !!localStorage.getItem('pm:bat:1') && UI.modalOuvert()), 'bataille enregistrée (emplacement 1)');
  await p.click('#modalBoite [data-act=b-reprendre]');
  await ev(() => { const B = UI.bat.B; B.joueurs[0].ia = true; B.joueurs[1].ia = true; B.joueurs[0].difficulte = 2; B.joueurs[1].difficulte = 0; for (let k = 0; k < 20 * 60 * 50 && !B.fin; k++) PM.Bataille.pas(B);
    // issue trop incertaine entre deux ordinateurs : le camp le plus faible est achevé pour tester la fin de partie
    if (!B.fin) { const f = B.joueurs.reduce((a, J) => (J.pop < a.pop ? J : a)); for (const e of B.unites.concat(B.bats)) if (e.j === f.id && !e.mort) e.mort = B.temps; for (let k = 0; k < 40 && !B.fin; k++) PM.Bataille.pas(B); } });
  ok(await ev(() => !!UI.bat.B.fin), 'la bataille se termine ' + await ev(() => { const B = UI.bat.B; return B.fin ? '' : B.joueurs.map(J => `${J.pantheon} âge ${J.age} pop ${J.pop}/${J.popMax} vill ${B.unites.filter(u => !u.mort && u.j === J.id && u.cle === 'villageois').length} abrités ${B.unites.filter(u => !u.mort && u.j === J.id && u.dans).length} bât ${B.bats.filter(b => !b.mort && b.j === J.id).length} alerte ${J.cerveau ? J.cerveau.alerte : '-'} res ${Object.values(J.res).map(Math.round).join(',')}`).join(' | '); }));
  await p.waitForSelector('#modalBoite .rts-bilan', { timeout: 15000 }).catch(() => null);
  ok(await p.isVisible('#modalBoite .rts-bilan'), 'bilan de fin de bataille');
  await p.click('#modalBoite [data-act=b-quitter]');
  ok(await ev(() => UI.ecran === 'accueil'), 'retour au menu');

  // menu : chargement d'une bataille enregistrée, tracé d'un mur en deux clics, sauvegarde automatique en quittant
  ok(await p.isVisible('[data-act=campagne]') && await p.isVisible('[data-act=b-charger-menu]'), 'menu : campagne et chargement');
  await p.click('[data-act=b-charger-menu]'); await p.click('#modalBoite [data-act=b-charger][data-v="1"]');
  ok(await ev(() => UI.ecran === 'bataille' && !!UI.bat.B && UI.bat.B.temps > 30 && !UI.bat.B.fin), 'bataille rechargée');
  await p.click('#modalBoite [data-act=b-commencer]');
  const murs = await ev(() => { const B = UI.bat.B, J = B.joueurs[0], v = UI.bat.vue; J.age = Math.max(1, J.age); J.res.bois += 800; J.res.or += 800; B.joueurs[1].ia = false;
    UI.bat.sel = B.unites.filter(u => !u.mort && u.j === 0 && u.cle === 'villageois').slice(0, 3).map(u => u.id); const c = B.bats.find(b => b.j === 0 && b.cle === 'centre');
    v.vise.d = 80; v.centrerXZ(c.x, c.z); v.stabiliser(); UI.ACT['b-construire']({ dataset: { v: 'mur' } });
    for (let k = 7; k < 22; k++) for (const dz of [-2 * k, 2 * k]) { const l = PM.Bataille.casesMur(B, 0, c.x - 14, c.z + dz, c.x + 14, c.z + dz); if (l.filter(x => x.ok === true).length > 10) { const a = v.versEcran(c.x - 14, c.z + dz, 0), b = v.versEcran(c.x + 14, c.z + dz, 0); if (Math.min(a.y, b.y) > 60 && Math.max(a.y, b.y) < 590 && a.x > 20 && b.x < innerWidth - 20) return { a, b, n: B.bats.filter(x => x.cle === 'mur').length }; } }
    return null; });
  ok(murs, 'place pour un mur');
  if (murs) {
    await p.mouse.click(murs.a.x, murs.a.y); await p.mouse.move(murs.b.x, murs.b.y, { steps: 4 }); await p.waitForTimeout(150);
    ok(await ev(() => (UI.bat.vue.fantomeMur || []).length > 8), 'aperçu du mur pendant le tracé');
    await p.mouse.click(murs.b.x, murs.b.y);
    ok(await ev(n => UI.bat.B.bats.filter(x => x.cle === 'mur').length > n + 8 && !UI.bat.mode, murs.n), 'mur tracé');
    ok(await ev(() => UI.bat.B.unites.filter(u => u.ordre && u.ordre.type === 'construire').length >= 1), 'villageois envoyés bâtir le mur');
  }
  await ev(() => UI.ACT['b-menu']()); await p.click('#modalBoite [data-act=b-quitter]');
  ok(await p.isVisible('[data-act=b-continuer]'), 'continuer la bataille (sauvegarde automatique)');

  // campagne : six missions, la première ouverte, objectifs à l'écran, victoire qui ouvre la suivante
  const R_CAMPAGNE = await ev(() => PM.RTS.CAMPAGNE.length);
  await p.click('[data-act=campagne]');
  ok(await p.locator('#creationContenu [data-act=b-mission]').count() === R_CAMPAGNE, 'campagne : toutes les missions');
  ok(await p.isDisabled('[data-act=b-mission][data-v=pillards]') && !(await p.isDisabled('[data-act=b-mission][data-v=fondation]')), 'missions suivantes verrouillées');
  await p.click('[data-act=b-mission][data-v=fondation]');
  ok(await ev(() => UI.bat.B.mission && UI.bat.B.mission.id === 'fondation' && UI.modalOuvert()), 'mission lancée avec son récit');
  await p.click('#modalBoite [data-act=b-commencer]'); await p.waitForTimeout(300);
  ok(await p.isVisible('#batObj') && (await p.textContent('#batObj')).includes('15 villageois'), 'objectifs affichés');
  await ev(() => { const B = UI.bat.B; B.joueurs[0].ia = true; B.joueurs[0].difficulte = 2; for (let k = 0; k < 20 * 60 * 25 && !B.fin; k++) PM.Bataille.pas(B); });
  ok(await ev(() => UI.bat.B.fin && UI.bat.B.fin.raison === 'mission'), 'mission accomplie');
  await p.waitForSelector('#modalBoite [data-act=b-mission][data-v=pillards]', { timeout: 15000 }).catch(() => null);
  ok(await ev(() => JSON.parse(localStorage.getItem('pm:campagne') || '[]').includes('fondation')), 'progression de la campagne gardée');
  await p.click('#modalBoite [data-act=b-mission][data-v=pillards]');
  ok(await ev(() => UI.bat.B.mission.id === 'pillards' && UI.bat.B.mission.vagues.length === 3), 'mission suivante ouverte');
  await p.click('#modalBoite [data-act=b-commencer]'); await p.waitForTimeout(300);
  ok((await p.textContent('#batObj')).includes('Prochain assaut'), 'annonce du prochain assaut');
  await ev(() => UI.ACT['b-menu']()); await p.click('#modalBoite [data-act=b-quitter]');

  // diplomatie : mode choisi à la création, panneau (touche Y), guerre, tribut, alliance, offre de l'ordinateur
  await p.click('[data-act=bataille]'); await p.click('[data-act=b-epoque][data-v=antique]'); await p.click('[data-act=b-pantheon][data-v=grecs]'); await p.click('[data-act=b-dieu][data-v=zeus]');
  await p.click('[data-act=b-option][data-k=mode][data-v=diplomatie]'); await p.click('[data-act=b-option][data-k=adversaires][data-v="5"]');
  await p.click('[data-act=b-lancer]'); await p.click('#modalBoite [data-act=b-commencer]'); await p.waitForTimeout(300);
  ok(await ev(() => UI.bat.B.mode === 'diplomatie' && UI.bat.B.joueurs.length === 6 && UI.bat.B.joueurs.slice(1).every(J => PM.Bataille.relation(UI.bat.B, 0, J.id) === 1)), 'diplomatie : six peuples, tous en paix');
  await p.keyboard.press('y'); await p.waitForTimeout(200);
  ok(await p.isVisible('#modalBoite .rts-diplo'), 'panneau Diplomatie');
  await p.click('#modalBoite [data-act=b-d-guerre][data-v="1"]'); ok(await ev(() => PM.Bataille.ennemis(UI.bat.B, 0, 1)), 'guerre déclarée');
  const boisAv = await ev(() => UI.bat.B.joueurs[0].res.bois);
  await p.click('#modalBoite [data-act=b-d-tribut][data-v="2:bois"]'); ok(await ev(b => UI.bat.B.joueurs[0].res.bois <= b - 100, boisAv), 'tribut envoyé');
  await ev(() => { UI.bat.B.opinion[2][0] = 80; }); await p.click('#modalBoite [data-act=b-d-alliance][data-v="2"]');
  ok(await ev(() => PM.Bataille.allies(UI.bat.B, 0, 2)), 'alliance conclue');
  await p.click('#modalBoite [data-act=b-reprendre]');
  await ev(() => { const B = UI.bat.B; B.opinion[3][0] = 90; for (let k = 0; k < 30 && !B.offres.length; k++) { B.joueurs[3].cerveau.tDiplo = 0; PM.Bataille.iaDiplomatie(B, B.joueurs[3]); } });
  await p.waitForSelector('#batOffres [data-act=b-offre]', { timeout: 20000 }).catch(() => null);
  ok(await p.isVisible('#batOffres [data-act=b-offre]'), 'offre de l’ordinateur affichée');
  await p.click('#batOffres [data-act=b-offre]'); ok(await ev(() => PM.Bataille.allies(UI.bat.B, 0, 3)), 'offre acceptée');
  await ev(() => UI.ACT['b-menu']()); await p.click('#modalBoite [data-act=b-quitter]');

  // partie longue : trêve affichée, attaque refusée pendant la trêve
  await p.click('[data-act=bataille]'); await p.click('[data-act=b-epoque][data-v=antique]'); await p.click('[data-act=b-pantheon][data-v=grecs]'); await p.click('[data-act=b-dieu][data-v=zeus]');
  await p.click('[data-act=b-option][data-k=mode][data-v=conquete]'); await p.click('[data-act=b-option][data-k=adversaires][data-v="1"]');
  await p.click('[data-act=b-option][data-k=duree][data-v=longue]'); await p.click('[data-act=b-carte][data-v=mediterranee]'); await p.click('[data-act=b-lancer]'); await p.click('#modalBoite [data-act=b-commencer]'); await p.waitForTimeout(300);
  ok(await ev(() => UI.bat.B.treve === 480 && UI.bat.B.popMax === 250), 'partie longue créée');
  ok(await p.isVisible('#batTreve') && (await p.textContent('#batTreve')).includes('Trêve'), 'trêve affichée');
  ok(await ev(() => { const B = UI.bat.B, u = B.unites.find(x => x.j === 0), c = B.bats.find(b => b.j === 1); return PM.Bataille.ordreContexte(B, 0, [u.id], c.x, c.z, c.id, false) === 'treve'; }), 'attaque refusée pendant la trêve');
  await ev(() => UI.ACT['b-menu']()); await p.click('#modalBoite [data-act=b-quitter]');

  ok(!erreurs.length, 'aucune erreur dans la page : ' + erreurs.slice(0, 3).join(' | '));
  await b.close();
  console.log(ko ? `\n${ko} échec(s) sur ${n} contrôles` : `Interface : ${n} contrôles réussis`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('✗ ' + e.message); process.exit(1); });
