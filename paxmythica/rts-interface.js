/* Pax Mythica — interface du mode Bataille (temps réel, façon Age of Mythology) : création de la bataille (époque, peuple, dieu,
   carte, adversaires), barre des ressources (avec les villageois à chaque tâche), population, âge, pouvoirs divins, mini-carte,
   panneau de la sélection, grille d'ordres avec raccourcis, sélection au cadre, clic droit pour agir, groupes, fin de partie.
   Moteur : rts-moteur.js ; image : rts-vue.js. Les boutons portent data-act (actions ajoutées à UI.ACT d'interface.js). */
'use strict';
(function (G) {
  const PM = G.PM, UI = G.UI, BT = PM.Bataille, R = PM.RTS;
  if (!UI || !BT) return;
  const $ = s => document.querySelector(s), ACT = UI.ACT;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => String(Math.floor(n));
  const S = UI.bat = { B: null, vue: null, sel: [], groupes: {}, mode: null, page: 'eco', pause: false, survol: 0, touches: new Set(), souris: null, alerte: 0, cre: null };
  const RES = ['nourriture', 'bois', 'or', 'faveur'];
  const coutTxt = c => RES.filter(r => c[r]).map(r => `${PM.ICONES[r]} ${c[r]}`).join(' ') || 'gratuit';
  const lireP = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const ecrireP = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sans stockage */ } };
  const son = n => { if (PM.son) PM.son(n); };

  // ---------- création de la bataille ----------
  ACT.bataille = () => {
    const d = lireP('pm:bataille', {});
    S.cre = Object.assign({ etape: 0, epoque: 'antique', pantheon: null, dieu: null, carte: 'plaine', taille: 'petite', adversaires: 1, difficulte: 1, equipes: false }, d, { etape: 0, pantheon: null, dieu: null });
    PM.appliquerEpoque(S.cre.epoque); creation(); UI.montrer('creation');
  };
  ACT['b-epoque'] = e => { S.cre.epoque = e.dataset.v; PM.appliquerEpoque(e.dataset.v); S.cre.etape = 1; creation(); };
  ACT['b-pantheon'] = e => { S.cre.pantheon = e.dataset.v; S.cre.etape = 2; creation(); };
  ACT['b-dieu'] = e => { S.cre.dieu = e.dataset.v; S.cre.etape = 3; creation(); };
  ACT['b-retour'] = () => { S.cre.etape = Math.max(0, S.cre.etape - 1); creation(); };
  ACT['b-carte'] = e => { S.cre.carte = e.dataset.v; creation(); };
  ACT['b-option'] = e => { const c = S.cre, k = e.dataset.k, v = e.dataset.v; c[k] = k === 'equipes' ? v === '1' : isNaN(+v) ? v : +v; if (c.adversaires < 3) c.equipes = false; creation(); };
  function creation() {
    const c = S.cre, P = c.pantheon && PM.PANTHEONS[c.pantheon], antique = c.epoque === 'antique';
    const etapes = `<div class="etapes">${['Époque', PM.mot('pantheon'), PM.mot('majeur').charAt(0).toUpperCase() + PM.mot('majeur').slice(1), 'Carte et adversaires'].map((t, i) => `<span class="${c.etape === i ? 'actif' : ''}">${i + 1}. ${esc(t)}</span>`).join('<span>›</span>')}</div>`;
    let corps = '';
    if (c.etape === 0) corps = `<div class="cartes">${Object.entries(PM.EPOQUES).map(([id, e]) => `<button class="carte-choix" data-act="b-epoque" data-v="${id}"><div class="em">${e.emoji}</div><h3>${esc(e.nom)}</h3><p>${esc(e.desc)}</p></button>`).join('')}</div>`;
    else if (c.etape === 1) corps = `<div class="cartes">${Object.entries(PM.PANTHEONS).map(([id, p]) => `<button class="carte-choix" data-act="b-pantheon" data-v="${id}"><div class="em">${p.emoji}</div><h3>${esc(p.nom)}</h3>
      <p>${esc((R.CULTURE[id] || {}).desc || '')}</p><p>${['inf', 'archer', 'cav', 'heros', 'siege'].map(r => R.emojiUnite(id, r)).join(' ')} · ${antique ? 'créatures' : 'unités spéciales'} ${p.mineurs.flat().map(g => PM.UNITES[g.unite].emoji).join(' ')}</p></button>`).join('')}</div>
      <div class="actions-bas"><button class="btn" data-act="b-retour">← Époque</button></div>`;
    else if (c.etape === 2) corps = `<div class="cartes">${P.majeurs.map(d => `<button class="carte-choix" data-act="b-dieu" data-v="${d.id}"><div class="em">${P.emoji}</div><h3>${esc(d.nom)}</h3><p>${esc(d.desc)}</p>
      <p>${antique ? 'Pouvoir' : 'Action spéciale'} : ${PM.POUVOIRS[d.pouvoir].emoji} <b>${esc(PM.POUVOIRS[d.pouvoir].nom)}</b> — ${esc(R.descPouvoir(d.pouvoir))} (une fois par partie)</p></button>`).join('')}</div>
      <div class="actions-bas"><button class="btn" data-act="b-retour">← ${esc(PM.mot('pantheon'))}</button></div>`;
    else {
      const opt = (k, liste) => `<div class="b-options">${liste.map(([v, t]) => `<button class="btn petit ${String(c[k]) === String(v) || (k === 'equipes' && c.equipes === (v === '1')) ? 'or' : ''}" data-act="b-option" data-k="${k}" data-v="${v}">${esc(t)}</button>`).join('')}</div>`;
      corps = `<div class="cartes">${Object.entries(R.CARTES).map(([id, k]) => `<button class="carte-choix ${c.carte === id ? 'choisie' : ''}" data-act="b-carte" data-v="${id}"><div class="em">${k.emoji}</div><h3>${esc(k.nom)}</h3></button>`).join('')}</div>
      <div class="bloc" style="max-width:720px;margin-top:18px">
        <div class="champ"><label>Taille</label>${opt('taille', Object.entries(R.TAILLES).map(([k, t]) => [k, t.nom]))}</div>
        <div class="champ"><label>Adversaires</label>${opt('adversaires', [[1, '1'], [2, '2'], [3, '3']])}</div>
        ${c.adversaires === 3 ? `<div class="champ"><label>Camps</label>${opt('equipes', [['0', 'Chacun pour soi'], ['1', '2 contre 2']])}</div>` : ''}
        <div class="champ"><label>Ordinateur</label>${opt('difficulte', R.DIFFICULTES.map((d, i) => [i, d.nom]))}</div>
        <p class="sous">${esc(PM.EPOQUES[c.epoque].nom)} · ${esc(P.nom)} · ${esc(P.majeurs.find(d => d.id === c.dieu).nom)}. Récolte, bâtis, passe les âges et détruis le centre-ville et les villageois ennemis.</p>
        <div class="actions-bas"><button class="btn" data-act="b-retour">← Retour</button><button class="btn or grand" data-act="b-lancer">⚔️ Lancer la bataille</button></div></div>`;
    }
    $('#creationContenu').innerHTML = `<h1>Bataille</h1><p class="sous">Une bataille en temps réel, comme dans Age of Mythology : tes villageois récoltent, tu bâtis ta cité, tu formes ton armée et tu commandes chaque unité.</p>${etapes}${corps}
      <div class="actions-bas" style="justify-content:flex-start;margin-top:22px"><button class="btn" data-act="accueil">Menu principal</button></div>`;
  }
  ACT['b-lancer'] = () => {
    const c = S.cre; ecrireP('pm:bataille', { epoque: c.epoque, carte: c.carte, taille: c.taille, adversaires: c.adversaires, difficulte: c.difficulte, equipes: c.equipes });
    const autres = Object.keys(PM.PANTHEONS).filter(p => p !== c.pantheon).sort(() => Math.random() - 0.5), nb = c.adversaires + 1;
    const joueurs = [{ pantheon: c.pantheon, dieu: c.dieu, nom: PM.NOMS_PEUPLES[c.pantheon][0], couleur: PM.COULEURS[0], equipe: 0 }];
    for (let i = 1; i < nb; i++) { const p = autres[(i - 1) % autres.length], P = PM.PANTHEONS[p]; joueurs.push({ pantheon: p, dieu: P.majeurs[Math.floor(Math.random() * 3)].id, nom: PM.NOMS_PEUPLES[p][1 + Math.floor(Math.random() * 2)], couleur: PM.COULEURS[[2, 1, 4][i - 1]], ia: true, difficulte: c.difficulte, equipe: c.equipes ? (i === 2 ? 0 : 1) : i }); }
    if (nb === 2) c.taille = c.taille || 'petite'; else if (c.taille === 'petite' && nb > 2) c.taille = 'moyenne';
    const B = BT.nouvelle({ epoque: c.epoque, carte: c.carte, taille: c.taille, graine: 1 + Math.floor(Math.random() * 999999), joueur: 0, joueurs });
    B.pack = R.CARTES[c.carte].pack;
    demarrer(B);
  };

  // ---------- démarrage ----------
  function demarrer(B) {
    S.B = B; S.sel = []; S.groupes = {}; S.mode = null; S.page = 'eco'; S.pause = false; S.alerte = -99; S.fini = false; S.sigPouvoirs = S.sigSel = S.sigGrille = ''; S.lieuAlerte = null;
    UI.montrer('bataille'); if (UI.reglerVitesse) UI.reglerVitesse(0, true);
    if (!S.vue) {
      if (!PM.vue3dPossible || !PM.vue3dPossible()) { UI.toast('La vue 3D n’est pas disponible sur cet ordinateur : le mode Bataille en a besoin.', 'ko'); UI.accueil(); return; }
      S.vue = new PM.VueBataille($('#bat3d'), $('#batEt')); evenements($('#bat3d'));
    }
    S.vue.lierBataille(B); S.vue.cadrer(); S.vue.stabiliser();
    construireHud(); fondCarte(); majHud(true);
    if (!S.boucle) { S.boucle = true; requestAnimationFrame(boucle); }
    const J = B.joueurs[B.joueur], P = PM.PANTHEONS[J.pantheon];
    S.pause = true;
    UI.ouvrirModal(`<h2>${P.emoji} ${esc(J.nom)} — ${esc(R.CARTES[B.typeCarte].nom)}</h2>
      <p class="recit">${esc(PM.majeur ? PM.majeur(J).nom : P.majeurs[0].nom)} veille sur toi. Tes adversaires : ${B.joueurs.slice(1).map(x => `<span class="pastille" style="background:${esc(x.couleur)}"></span> ${esc(x.nom)} (${esc(PM.PANTHEONS[x.pantheon].nom)})`).join(', ')}.</p>
      <ul class="aide"><li><b>Clic gauche</b> (ou glisser un cadre) pour choisir des unités, <b>clic droit</b> (ou ctrl-clic) pour agir : marcher, récolter, construire, attaquer.</li>
      <li>Tes <b>villageois</b> récoltent la nourriture (baies, chasse, fermes), le bois et l’or, et bâtissent : choisis un villageois puis un bâtiment dans la grille en bas à droite.</li>
      <li>Les <b>maisons</b> donnent de la population. Le <b>${esc(R.nomBat('temple').toLowerCase())}</b> forme les créatures ; passe les <b>âges</b> au ${esc(R.nomBat('centre').toLowerCase())} pour choisir un dieu mineur.</li>
      <li>${esc((R.CULTURE[J.pantheon] || {}).desc || '')}</li>
      <li>Raccourcis : <kbd>H</kbd> ${esc(R.nomBat('centre').toLowerCase())}, <kbd>.</kbd> villageois inactif, <kbd>⌘</kbd>+<kbd>1</kbd>…<kbd>9</kbd> groupes, <kbd>Échap</kbd> pause, deux doigts pour se déplacer, pincer pour zoomer.</li></ul>
      <div class="actions-bas"><button class="btn or grand" data-act="b-commencer">À l’assaut !</button></div>`);
    son('guerre'); if (PM.musique) PM.musique();
  }
  ACT['b-commencer'] = () => { UI.fermerModal(); S.pause = false; };

  // ---------- boucle ----------
  function boucle(ts) {
    requestAnimationFrame(boucle);
    const dt = Math.min(100, ts - (S.der || ts)); S.der = ts;
    if (UI.ecran !== 'bataille' || !S.B || !S.vue) return;
    const B = S.B;
    if (!S.pause && !UI.modalOuvert() && !B.fin) BT.avancer(B, dt / 1000);
    defilement(dt);
    const ev = B.evts.splice(0); B.evtsVue = (B.evtsVue || []).concat(ev); evenementsJeu(ev);
    S.sel = S.sel.filter(id => { const e = B.parId.get(id); return e && !e.mort && (e.sorte !== 'r' || e.qte > 0); });
    const v = S.vue; v.sel = new Set(S.sel); v.survol = S.survol;
    const bs = selBatiment(); v.ralliement = bs && bs.rally && bs.j === B.joueur ? bs.rally : null;
    v.dessiner(dt);
    S.tHud = (S.tHud || 0) + dt; if (S.tHud > 120) { S.tHud = 0; majHud(); }
    S.tCarte = (S.tCarte || 0) + dt; if (S.tCarte > 250) { S.tCarte = 0; miniCarte(); }
    if (B.fin && !S.fini) { S.fini = true; setTimeout(finDePartie, 1200); }
  }
  function defilement(dt) {
    const v = S.vue, k = dt / 16, T = S.touches;
    if (T.has('ArrowLeft')) v.deplacer(14 * k, 0); if (T.has('ArrowRight')) v.deplacer(-14 * k, 0); if (T.has('ArrowUp')) v.deplacer(0, 14 * k); if (T.has('ArrowDown')) v.deplacer(0, -14 * k);
    const m = S.souris; if (!m || !S.dansCanvas || S.glisse) return;
    const w = innerWidth, h = innerHeight, b = 5;
    if (m.cx < b) v.deplacer(12 * k, 0); else if (m.cx > w - b) v.deplacer(-12 * k, 0);
    if (m.cy < b) v.deplacer(0, 12 * k); else if (m.cy > h - b) v.deplacer(0, -12 * k);
  }

  // ---------- événements du jeu : sons, messages ----------
  function message(t, genre, x, z) {
    const d = document.createElement('div'); d.className = 'toast ' + (genre || ''); d.textContent = t;
    if (x != null) { d.style.cursor = 'pointer'; d.onclick = () => S.vue.centrerXZ(x, z); }
    const box = $('#batToasts'); box.appendChild(d); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => d.remove(), genre === 'ko' ? 5000 : 3800);
  }
  function evenementsJeu(ev) {
    const B = S.B, ji = B.joueur, J = B.joueurs[ji];
    for (const e of ev) {
      if (e.type === 'construit' && e.j === ji && e.cle !== 'ferme' && e.cle !== 'maison') { message(`${R.nomBat(e.cle)} : construction terminée.`, 'ok', e.x, e.z); son('ok'); }
      else if (e.type === 'age') { const A = PM.AGES[e.age].nom, g = BT.mineurDe(B.joueurs[e.j], e.mineur); if (e.j === ji) { message(`${A} ! ${g ? g.nom + ' t’offre ' + PM.UNITES[g.unite].nom.toLowerCase() + ' et un pouvoir.' : ''}`, 'ok'); son('age'); } else message(`${B.joueurs[e.j].nom} entre dans l’${A.charAt(0).toLowerCase() + A.slice(1)}.`); }
      else if (e.type === 'pouvoir') { son('pouvoir'); if (e.j !== ji) message(`${B.joueurs[e.j].nom} : ${e.nom} !`, 'ko', e.x, e.z); }
      else if (e.type === 'vaincu') { message(e.j === ji ? 'Ton peuple est vaincu.' : `${B.joueurs[e.j].nom} est vaincu !`, e.j === ji ? 'ko' : 'ok'); son('conquete'); }
      else if (e.type === 'impact' && (e.sorte === 'meteore' || e.sorte === 'eclair')) { /* son du pouvoir déjà joué */ }
    }
    // alerte : on est attaqué
    const a = J.dernAttaque; if (a && a.t > S.alerte + 20 && B.temps - a.t < 1) { S.alerte = a.t; S.lieuAlerte = a; message('⚔️ Tu es attaqué ! (Espace pour y aller)', 'ko', a.x, a.z); son('guerre'); }
    // bruitages près de la caméra (chacun au plus quelques fois par seconde)
    const pres = e => e.x != null && Math.hypot(e.x - S.vue.cam.x, e.z - S.vue.cam.z) < S.vue.cam.d * 0.9, maintenant = performance.now(), D = S.derSon || (S.derSon = {});
    const jouer = (n, ecart) => { if ((D[n] || 0) + ecart > maintenant) return; D[n] = maintenant; son(n); };
    for (const e of ev) {
      if (!pres(e)) continue;
      if (e.type === 'tir') jouer(e.sorte === 'fleche' ? 'fleche' : e.sorte === 'balle' || e.sorte === 'laser' ? 'tir' : 'coup', 90);
      else if (e.type === 'impact') jouer(e.sorte === 'eclair' ? 'eclair' : e.sorte === 'meteore' || e.sorte === 'obus' || e.sorte === 'plasma' || e.sorte === 'boulet' ? 'explosion' : 'coup', 120);
      else if (e.type === 'ruine') jouer('explosion', 300);
      else if (e.type === 'mort') jouer('epee', 160);
      else if (e.type === 'forme' && e.j === ji) jouer('forme', 400);
    }
    // travail des villageois et combats au corps à corps près de la caméra
    S.tTravail = (S.tTravail || 0) + 1;
    if (S.tTravail % 9 === 0) for (const u of B.unites) { if (u.mort || !pres(u)) continue; if (u.anim === 'attaque' && !u.s.proj && u.cle !== 'villageois') { jouer('epee', 220); break; } }
    if (S.tTravail % 14 === 0) for (const u of B.unites) { if (u.mort || u.j !== ji || u.anim !== 'travail' || !pres(u)) continue; const c = u.ordre && B.parId.get(u.ordre.cible); if (c && c.sous === 'arbre') { jouer('hache', 500); break; } if (u.ordre && u.ordre.type === 'construire') { jouer('marteau', 450); break; } }
  }

  // ---------- souris ----------
  function evenements(cv) {
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY }; };
    let bas = null;
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerenter', () => { S.dansCanvas = true; });
    cv.addEventListener('pointerleave', () => { S.dansCanvas = false; });
    cv.addEventListener('pointerdown', e => {
      const p = pos(e); if (!S.B) return; cv.setPointerCapture(e.pointerId);
      const droit = e.button === 2 || (e.button === 0 && e.ctrlKey);
      if (e.button === 1) { bas = { ...p, milieu: true }; return; }
      if (droit) { if (S.mode) { S.mode = null; majCurseur(); return; } clicDroit(p, e.shiftKey); return; }
      if (S.mode) { clicMode(p, e.shiftKey); return; }
      bas = p; S.glisse = false;
    });
    cv.addEventListener('pointermove', e => {
      const p = pos(e); S.souris = p; if (!S.B) return;
      if (bas && bas.milieu) { S.vue.deplacer(p.x - bas.x, p.y - bas.y); bas.x = p.x; bas.y = p.y; return; }
      if (bas && Math.abs(p.x - bas.x) + Math.abs(p.y - bas.y) > 6) { S.glisse = true; const c = $('#batCadre'); c.classList.remove('cache'); Object.assign(c.style, { left: Math.min(p.x, bas.x) + 'px', top: Math.min(p.y, bas.y) + 'px', width: Math.abs(p.x - bas.x) + 'px', height: Math.abs(p.y - bas.y) + 'px' }); }
      if (!S.tSurvol || performance.now() - S.tSurvol > 60) { S.tSurvol = performance.now(); const en = S.vue.entiteA(p.x, p.y); S.survol = en ? en.id : 0; majCurseur(en); }
      majFantome(p);
    });
    cv.addEventListener('pointerup', e => {
      const p = pos(e), b = bas; bas = null; $('#batCadre').classList.add('cache'); if (!b || b.milieu || !S.B) { S.glisse = false; return; }
      if (S.glisse) { S.glisse = false; const l = S.vue.unitesDans(b.x, b.y, p.x, p.y); if (l.length) { const mil = l.filter(u => u.cle !== 'villageois'); choisir((mil.length && mil.length < l.length && !e.shiftKey ? l : l).map(u => u.id), e.shiftKey); son('clic'); } else if (!e.shiftKey) choisir([]); return; }
      clicGauche(p, e.shiftKey, e.detail >= 2);
    });
    cv.addEventListener('wheel', e => {
      e.preventDefault(); const p = pos(e);
      if (e.ctrlKey) S.vue.zoomer(Math.exp(-e.deltaY * 0.012), p.x, p.y);
      else if (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && e.deltaX === 0 && Number.isInteger(e.deltaY))) S.vue.zoomer(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
      else S.vue.deplacer(-e.deltaX, -e.deltaY);
    }, { passive: false });
  }
  function choisir(ids, ajouter) {
    if (ajouter) { const s = new Set(S.sel); for (const i of ids) { if (s.has(i)) s.delete(i); else s.add(i); } S.sel = [...s]; } else S.sel = ids.slice();
    S.page = 'eco'; S.mode = null; majCurseur(); majHud(true);
  }
  function clicGauche(p, shift, double) {
    const B = S.B, en = S.vue.entiteA(p.x, p.y);
    if (!en) { if (!shift) choisir([]); return; }
    if (en.sorte === 'u' && en.j === B.joueur) {
      if (double) { const l = B.unites.filter(u => !u.mort && u.j === B.joueur && u.cle === en.cle && S.vue.surEcran(u)).map(u => u.id); choisir(l, false); }
      else choisir([en.id], shift);
    } else if (en.sorte === 'b' && en.j === B.joueur && double) choisir(B.bats.filter(b => !b.mort && b.j === B.joueur && b.cle === en.cle && b.fini).map(b => b.id), false);
    else choisir([en.id], shift && en.sorte === 'u' && en.j === B.joueur);
    son('clic');
  }
  function unitesChoisies() { const B = S.B; return S.sel.map(i => B.parId.get(i)).filter(u => u && u.sorte === 'u' && u.j === B.joueur && !u.mort); }
  function selBatiment() { const B = S.B; if (!B || S.sel.length !== 1) return null; const b = B.parId.get(S.sel[0]); return b && b.sorte === 'b' ? b : null; }
  function clicDroit(p, shift) {
    const B = S.B, en = S.vue.entiteA(p.x, p.y), pt = S.vue.pointSol(p.x, p.y), us = unitesChoisies();
    const b = selBatiment();
    if (!us.length && b && b.j === B.joueur && b.d.forme) { if (pt) { BT.ralliement(B, B.joueur, b.id, en ? en.x : pt.x, en ? en.z : pt.z, en && en.sorte === 'r' ? en.id : 0); S.vue.marqueOrdre(pt.x, pt.z, false); son('clic'); } return; }
    if (!us.length || (!pt && !en)) return;
    const x = en ? en.x : pt.x, z = en ? en.z : pt.z, t = BT.ordreContexte(B, B.joueur, us.map(u => u.id), x, z, en ? en.id : 0, false);
    S.vue.marqueOrdre(x, z, t === 'attaquer'); son(t === 'attaquer' ? 'coup' : 'ordre'); void shift;
  }
  function clicMode(p, shift) {
    const B = S.B, M = S.mode, pt = S.vue.pointSol(p.x, p.y); if (!pt) return;
    if (M.type === 'poser') {
      const ids = unitesChoisies().filter(u => u.cle === 'villageois').map(u => u.id), r = BT.poser(B, B.joueur, M.cle, pt.x, pt.z, ids);
      if (!r.ok) { message(r.raison, 'ko'); son('refus'); return; }
      son('ok'); S.vue.marqueOrdre(r.bat.x, r.bat.z, false); if (!shift) { S.mode = null; S.vue.fantome = null; }
    } else if (M.type === 'pouvoir') {
      const r = BT.pouvoir(B, B.joueur, M.idx, pt.x, pt.z); if (!r.ok) { message(r.raison, 'ko'); son('refus'); return; }
      S.mode = null; S.vue.cercleVise = null;
    } else if (M.type === 'attaque') {
      const en = S.vue.entiteA(p.x, p.y), us = unitesChoisies();
      if (en && en.sorte !== 'r' && BT.ennemis(B, B.joueur, en.j)) BT.ordreContexte(B, B.joueur, us.map(u => u.id), en.x, en.z, en.id, true);
      else BT.ordreContexte(B, B.joueur, us.map(u => u.id), pt.x, pt.z, 0, true);
      S.vue.marqueOrdre(pt.x, pt.z, true); S.mode = null;
    } else if (M.type === 'ralliement') { const b = selBatiment(), en = S.vue.entiteA(p.x, p.y); if (b) BT.ralliement(B, B.joueur, b.id, pt.x, pt.z, en && en.sorte === 'r' ? en.id : 0); S.vue.marqueOrdre(pt.x, pt.z, false); S.mode = null; }
    majCurseur(); majHud(true);
  }
  function majFantome(p) {
    const v = S.vue, M = S.mode; v.fantome = null; v.cercleVise = null; if (!M || !p) return;
    const pt = v.pointSol(p.x, p.y); if (!pt) return;
    if (M.type === 'poser') { const x = (Math.floor(pt.x / BT.CEL) + 0.5) * BT.CEL, z = (Math.floor(pt.z / BT.CEL) + 0.5) * BT.CEL; v.fantome = { cle: M.cle, x, z, ok: BT.peutPoser(S.B, S.B.joueur, M.cle, x, z).ok }; }
    else if (M.type === 'pouvoir') { const d = R.POUVOIRS[S.B.joueurs[S.B.joueur].pouvoirs[M.idx].id]; v.cercleVise = { x: pt.x, z: pt.z, r: d.rayon || 4 }; }
  }
  function majCurseur(en) {
    const cv = $('#bat3d'), B = S.B; if (!cv || !B) return;
    let c = 'default';
    if (S.mode) c = 'crosshair';
    else if (en && unitesChoisies().length) { if (en.sorte !== 'r' && BT.ennemis(B, B.joueur, en.j)) c = 'crosshair'; else if (en.sorte === 'r' || en.j === B.joueur) c = 'pointer'; }
    cv.style.cursor = c;
  }

  // ---------- clavier ----------
  const GRILLE = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b'];
  document.addEventListener('keydown', e => {
    if (UI.ecran !== 'bataille' || !S.B || e.target.matches('input, textarea, select')) return;
    if (UI.modalOuvert()) { if (e.key === 'Escape' && S.pause && $('#modalBoite [data-act=b-reprendre]')) ACT['b-reprendre'](); return; }
    const k = e.key, B = S.B;
    if (k.startsWith('Arrow')) { S.touches.add(k); e.preventDefault(); return; }
    if (k === 'Escape') { if (S.mode) { S.mode = null; S.vue.fantome = null; S.vue.cercleVise = null; majCurseur(); } else if (S.sel.length) choisir([]); else menuPause(); return; }
    if (k === 'F10' || k === 'p' && e.metaKey) { e.preventDefault(); menuPause(); return; }
    const chiffre = /^[1-9]$/.test(k) ? k : null;
    if (chiffre && (e.metaKey || e.ctrlKey)) { e.preventDefault(); S.groupes[chiffre] = S.sel.slice(); message(`Groupe ${chiffre} : ${S.sel.length} unité(s).`); return; }
    if (chiffre) { const g = (S.groupes[chiffre] || []).filter(id => { const x = B.parId.get(id); return x && !x.mort; }); if (!g.length) return; const deux = S.dernierGroupe === chiffre && performance.now() - S.tGroupe < 400; choisir(g); S.dernierGroupe = chiffre; S.tGroupe = performance.now(); if (deux) centrerSel(); return; }
    if (k === 'h' || k === 'H') { const c = B.bats.find(b => !b.mort && b.j === B.joueur && b.cle === 'centre'); if (c) { choisir([c.id]); S.vue.centrerXZ(c.x, c.z); } return; }
    if (k === '.' || k === ';') { villageoisInactif(); return; }
    if (k === ' ') { e.preventDefault(); if (S.lieuAlerte) S.vue.centrerXZ(S.lieuAlerte.x, S.lieuAlerte.z); else centrerSel(); return; }
    if (k === 'Delete' || k === 'Backspace') { BT.detruire(B, B.joueur, S.sel); choisir([]); return; }
    if (k === '+' || k === '=') { S.vue.zoomer(1.2, innerWidth / 2, innerHeight / 2); return; }
    if (k === '-') { S.vue.zoomer(1 / 1.2, innerWidth / 2, innerHeight / 2); return; }
    const i = GRILLE.indexOf(k.toLowerCase()); if (i >= 0 && !e.metaKey && !e.ctrlKey) { const btn = document.querySelector(`#batOrdres [data-i="${i}"]`); if (btn && !btn.disabled) btn.click(); }
  });
  document.addEventListener('keyup', e => S.touches.delete(e.key));
  window.addEventListener('blur', () => S.touches.clear());
  function centrerSel() { const B = S.B, l = S.sel.map(i => B.parId.get(i)).filter(Boolean); if (!l.length) return; S.vue.centrerXZ(l.reduce((s, u) => s + u.x, 0) / l.length, l.reduce((s, u) => s + u.z, 0) / l.length); }
  function inactifs() { const B = S.B; return B.unites.filter(u => !u.mort && u.j === B.joueur && u.cle === 'villageois' && !u.ordre); }
  function villageoisInactif() { const l = inactifs(); if (!l.length) return; S.iInactif = ((S.iInactif || 0) + 1) % l.length; const u = l[S.iInactif]; choisir([u.id]); S.vue.centrerXZ(u.x, u.z); }
  ACT['b-inactif'] = villageoisInactif;

  // ---------- interface : barre, pouvoirs, panneau, grille ----------
  function construireHud() {
    $('#batHud').innerHTML = `
      <header class="rts-haut"><div class="rts-res" id="batRes"></div><div class="rts-age" id="batAge"></div><div class="rts-droite"><span id="batHorloge"></span>
        <button class="btn petit" data-act="b-vitesse" id="batVitesse" title="Vitesse du jeu">×1</button><button class="btn petit" data-act="b-menu" title="Pause et menu (Échap)">⏸ Menu</button></div></header>
      <div class="rts-pouvoirs" id="batPouvoirs"></div>
      <button class="rts-inactifs cache" id="batInactifs" data-act="b-inactif" title="Villageois inactif (touche .)"></button>
      <footer class="rts-bas"><div class="rts-carte"><canvas id="batCarte" width="200" height="200"></canvas></div><div class="rts-sel" id="batSel"></div><div class="rts-ordres" id="batOrdres"></div></footer>`;
    const cv = $('#batCarte'); let tient = 0;
    const versMonde = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * S.B.cote, (e.clientY - r.top) / r.height * S.B.cote]; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { const [x, z] = versMonde(e); if (e.button === 2 || e.ctrlKey) { const us = unitesChoisies(); if (us.length) { BT.ordreContexte(S.B, S.B.joueur, us.map(u => u.id), x, z, 0, false); S.vue.marqueOrdre(x, z, false); } return; } tient = 1; cv.setPointerCapture(e.pointerId); S.vue.centrerXZ(x, z); });
    cv.addEventListener('pointermove', e => { if (tient) { const [x, z] = versMonde(e); S.vue.centrerXZ(x, z); } });
    cv.addEventListener('pointerup', () => { tient = 0; });
  }
  ACT['b-vitesse'] = () => { const B = S.B, l = [1, 1.5, 2, 0.5], i = (l.indexOf(B.vitesse) + 1) % l.length; B.vitesse = l[i]; $('#batVitesse').textContent = '×' + String(l[i]).replace('.', ','); };
  ACT['b-menu'] = () => menuPause();
  function majHud(force) {
    const B = S.B; if (!B) return; const J = B.joueurs[B.joueur];
    // villageois à chaque tâche
    const taches = { nourriture: 0, bois: 0, or: 0, faveur: 0 };
    for (const u of B.unites) { if (u.mort || u.j !== B.joueur || u.cle !== 'villageois' || !u.ordre) continue; if (u.ordre.type === 'prier') taches.faveur++; else if (u.ordre.type === 'recolter') { const c = B.parId.get(u.ordre.cible); if (c) taches[c.sorte === 'b' ? 'nourriture' : c.t]++; } }
    $('#batRes').innerHTML = RES.map(r => `<span class="rts-r" title="${esc(r === 'faveur' ? PM.mot('faveur') : r)}">${PM.ICONES[r]} <b>${fmt(J.res[r])}</b>${r !== 'faveur' || J.pantheon === 'grecs' ? `<small>${taches[r]}</small>` : ''}</span>`).join('') +
      `<span class="rts-r ${J.pop >= J.popMax ? 'plein' : ''}" title="Population">👥 <b>${J.pop}/${J.popMax}</b></span>`;
    const A = J.ageEnCours; $('#batAge').innerHTML = `<b>${esc(PM.AGES[J.age].nom)}</b>${A ? `<span class="rts-prog"><i style="width:${Math.round(A.t / A.temps * 100)}%"></i></span><small>${esc(PM.AGES[A.age].court)} — ${Math.ceil(A.temps - A.t)} s</small>` : ''}`;
    const t = Math.floor(B.temps); $('#batHorloge').textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
    const sigP = J.pouvoirs.map(p => p.id + p.utilise).join() + (S.mode && S.mode.type === 'pouvoir' ? S.mode.idx : '');
    if (sigP !== S.sigPouvoirs) { S.sigPouvoirs = sigP; $('#batPouvoirs').innerHTML = J.pouvoirs.map((p, i) => { const P = PM.POUVOIRS[p.id] || { nom: p.id, emoji: '✨' }; return `<button class="rts-pouvoir ${S.mode && S.mode.type === 'pouvoir' && S.mode.idx === i ? 'actif' : ''}" data-act="b-pouvoir" data-v="${i}" ${p.utilise ? 'disabled' : ''} title="${esc(P.nom)} — ${esc(R.descPouvoir(p.id))}${p.utilise ? ' (déjà utilisé)' : ''}">${P.emoji}</button>`; }).join(''); }
    const ina = inactifs().length, bi = $('#batInactifs'); bi.classList.toggle('cache', !ina); bi.textContent = `🧑‍🌾 ${ina} inactif${ina > 1 ? 's' : ''}`;
    panneauSel(); grille();
  }
  ACT['b-pouvoir'] = e => {
    const B = S.B, i = +e.dataset.v, p = B.joueurs[B.joueur].pouvoirs[i]; if (!p || p.utilise) return;
    const d = R.POUVOIRS[p.id]; if (!d) return;
    if (d.cible) { S.mode = { type: 'pouvoir', idx: i }; message(`${PM.POUVOIRS[p.id].nom} : clique où le lancer (clic droit pour annuler).`); majCurseur(); majHud(true); }
    else { const r = BT.pouvoir(B, B.joueur, i); message(r.ok ? r.message : r.raison, r.ok ? 'ok' : 'ko'); majHud(true); }
  };
  const nomEntite = e => { const B = S.B; if (e.sorte === 'u') return R.nomUnite(B.joueurs[e.j].pantheon, e.cle); if (e.sorte === 'b') return R.nomBat(e.cle); return { arbre: 'Arbre', baies: 'Buisson de baies', mine: 'Mine d’or', mouton: 'Mouton', vache: 'Vache' }[e.sous] || e.sous; };
  const emojiEntite = e => { const B = S.B; if (e.sorte === 'u') return R.emojiUnite(B.joueurs[e.j].pantheon, e.cle); if (e.sorte === 'b') return R.BATIMENTS[e.cle].emoji; return { arbre: '🌳', baies: '🫐', mine: '🪙', mouton: '🐑', vache: '🐄' }[e.sous] || '❔'; };
  const tache = u => { const o = u.ordre, B = S.B; if (!o) return 'Au repos'; const c = o.cible && B.parId.get(o.cible); return { deplacer: o.attaque ? 'Marche à l’attaque' : 'En marche', attaquer: 'Combat', construire: c && c.fini ? 'Répare' : 'Construit', prier: 'Prie', deposer: 'Dépose', recolter: c ? (c.sorte === 'b' ? 'Cultive' : c.t === 'bois' ? 'Coupe du bois' : c.t === 'or' ? 'Extrait de l’or' : c.animal ? 'Chasse' : 'Cueille') : 'Récolte' }[o.type] || ''; };
  function panneauSel() {
    const B = S.B, l = S.sel.map(i => B.parId.get(i)).filter(Boolean), box = $('#batSel');
    const sig = l.map(e => e.id + ':' + Math.round(e.pv || e.qte || 0) + ':' + (e.file ? e.file.length + ':' + Math.round((e.file[0] || {}).t || 0) : '') + ':' + (e.ordre ? e.ordre.type : '') + ':' + (e.prog != null ? Math.round(e.prog * 50) : '') + (e.porte ? e.porte.n | 0 : '')).join('|') + (B.joueurs[B.joueur].ageEnCours ? Math.round(B.joueurs[B.joueur].ageEnCours.t) : '');
    if (sig === S.sigSel) return; S.sigSel = sig;
    if (!l.length) { box.innerHTML = `<div class="rts-vide">Choisis une unité ou un bâtiment.<br><small>Glisse un cadre pour en choisir plusieurs, double-clic pour toutes celles du même genre.</small></div>`; return; }
    const pv = e => e.pvMax ? `<div class="rts-pv"><i style="width:${Math.max(0, e.pv / e.pvMax * 100)}%;background:${e.pv / e.pvMax > 0.6 ? '#5fe36b' : e.pv / e.pvMax > 0.3 ? '#f2c94c' : '#f0533e'}"></i></div><small>${Math.ceil(e.pv)} / ${e.pvMax}</small>` : '';
    if (l.length === 1) {
      const e = l[0], J = e.j >= 0 ? B.joueurs[e.j] : null, coul = J ? J.couleur : '#d9b56a';
      let det = '';
      if (e.sorte === 'u') { const s = e.s; det = `<p>⚔️ ${Math.round(s.att)} · ${s.portee ? '🏹 ' + s.portee + ' m · ' : ''}👟 ${s.vitesse.toFixed(1)} m/s · ${esc(PM.CATEGORIES[s.cat] || '')}</p><p><i>${esc(tache(e))}</i>${e.porte && e.porte.n > 0.5 ? ` · porte ${Math.floor(e.porte.n)} ${PM.ICONES[e.porte.t]}` : ''}</p>`; }
      else if (e.sorte === 'b') {
        if (!e.fini) det = `<p>Construction : ${Math.round(e.prog * 100)} %${e.j === B.joueur ? ' — envoie des villageois (clic droit) pour aller plus vite.' : ''}</p>`;
        else if (e.j === B.joueur) {
          const A = J.ageEnCours;
          det = (e.d.depot ? `<p>Dépôt : ${e.d.depot.map(r => PM.ICONES[r]).join(' ')}</p>` : '') + (e.d.pop ? `<p>👥 +${e.d.pop} population</p>` : '') + (e.cle === 'ferme' ? `<p>${e.occupant ? 'Un villageois cultive.' : 'Libre : envoie un villageois.'}</p>` : '') +
            (e.cle === 'centre' && A && A.centre === e.id ? `<p>Passage à l’${esc(PM.AGES[A.age].nom.toLowerCase())} : <span class="rts-prog large"><i style="width:${A.t / A.temps * 100}%"></i></span></p>` : '') +
            (e.file.length ? `<div class="rts-file">${e.file.map((f, i) => `<button class="rts-mini" data-act="b-annuler" data-v="${i}" title="Annuler (rembourse)">${R.emojiUnite(J.pantheon, f.cle)}${i === 0 ? `<i style="width:${Math.min(100, f.t / BT.stats(B, e.j, f.cle).temps * 100)}%"></i>` : ''}</button>`).join('')}</div>${e.attentePop ? '<p class="rouge">Population pleine : bâtis des maisons.</p>' : ''}` : '');
        }
      } else det = `<p>${PM.ICONES[e.t] || ''} ${Math.ceil(e.qte)} restant${e.animal && e.vivant ? ' — à chasser' : ''}</p>`;
      box.innerHTML = `<div class="rts-portrait" style="border-color:${esc(coul)}">${emojiEntite(e)}</div><div class="rts-info"><h3>${esc(nomEntite(e))}</h3>${J ? `<p class="rts-proprio"><span class="pastille" style="background:${esc(J.couleur)}"></span> ${esc(J.nom)}</p>` : ''}${pv(e)}${det}</div>`;
      return;
    }
    // plusieurs : icônes regroupées par genre
    const gr = new Map(); for (const e of l) { const k = e.sorte + e.cle; if (!gr.has(k)) gr.set(k, []); gr.get(k).push(e); }
    box.innerHTML = `<div class="rts-groupe">${[...gr.values()].map(g => `<button class="rts-mini" data-act="b-ne-garder" data-v="${g[0].sorte}${g[0].cle}" title="${esc(nomEntite(g[0]))}">${emojiEntite(g[0])}<b>${g.length}</b><i style="width:${g.reduce((s, e) => s + e.pv / e.pvMax, 0) / g.length * 100}%"></i></button>`).join('')}</div><p class="rts-total">${l.length} choisis</p>`;
  }
  ACT['b-ne-garder'] = e => { const B = S.B; choisir(S.sel.filter(i => { const x = B.parId.get(i); return x && x.sorte + x.cle === e.dataset.v; })); };
  ACT['b-annuler'] = e => { const b = selBatiment(); if (b) { BT.annulerFormation(S.B, S.B.joueur, b.id, +e.dataset.v); S.sigSel = ''; majHud(true); } };
  function grille() {
    const B = S.B, J = B.joueurs[B.joueur], us = unitesChoisies(), b = selBatiment(), cases = new Array(15).fill(null);
    const vill = us.filter(u => u.cle === 'villageois');
    if (vill.length) {
      const l = R.CONSTRUIRE[S.page === 'mil' ? 1 : 0];
      l.forEach((cle, i) => { const d = R.BATIMENTS[cle], c = BT.coutBat(B, B.joueur, cle), verrou = J.age < d.age; cases[i] = { act: 'b-construire', v: cle, em: d.emoji, titre: `${R.nomBat(cle)} — ${coutTxt(c)}${verrou ? ' · ' + PM.AGES[d.age].nom : ''}`, ko: verrou || !BT.assez(B, B.joueur, c), verrou }; });
      cases[S.page === 'mil' ? 9 : 9] = S.page === 'mil' ? { act: 'b-page', v: 'eco', em: '🏠', titre: 'Bâtiments de l’économie' } : { act: 'b-page', v: 'mil', em: '⚔️', titre: 'Bâtiments militaires' };
    }
    if (us.length && !b) { cases[10] = { act: 'b-stop', em: '✋', titre: 'Arrêter' }; if (us.some(u => u.cle !== 'villageois')) cases[11] = { act: 'b-attaque', em: '🗡️', titre: 'Marche à l’attaque : clique un lieu, les unités combattent en chemin' }; cases[14] = { act: 'b-detruire', em: '🗑️', titre: 'Supprimer (Suppr)' }; }
    if (b && b.j === B.joueur) {
      if (b.fini) {
        BT.formables(B, b).forEach((cle, i) => { if (i > 8) return; const s = BT.stats(B, B.joueur, cle), r = BT.peutFormer(B, b, cle); cases[i] = { act: 'b-former', v: cle, em: R.emojiUnite(J.pantheon, cle), titre: `${R.nomUnite(J.pantheon, cle)} — ${coutTxt(s.cout)} · ${s.temps} s${!r.ok ? ' (' + r.raison + ')' : ''}`, ko: !r.ok, verrou: (s.age || 0) > J.age }; });
        if (b.cle === 'centre' && J.age < 3) { const a = J.age + 1, r = BT.peutAvancer(B, B.joueur); cases[9] = { act: 'b-age', em: '🏛️', titre: `${PM.AGES[a].nom} — ${coutTxt(R.AGES[a].cout)}${!r.ok ? ' (' + r.raison + ')' : ''}`, ko: !r.ok }; }
        if (b.d.forme) cases[10] = { act: 'b-ralliement', em: '🚩', titre: 'Point de ralliement (ou clic droit)' };
      }
      cases[14] = { act: 'b-detruire', em: b.fini ? '🗑️' : '✖️', titre: b.fini ? 'Démolir' : 'Annuler la construction (remboursée si rien n’est bâti)' };
    }
    const sig = cases.map(c => c ? c.act + c.v + c.ko + c.titre : '-').join('|'); if (sig === S.sigGrille) return; S.sigGrille = sig;
    $('#batOrdres').innerHTML = cases.map((c, i) => c ? `<button class="rts-cmd ${c.ko ? 'ko' : ''} ${c.verrou ? 'verrou' : ''}" data-act="${c.act}" ${c.v ? `data-v="${esc(c.v)}"` : ''} data-i="${i}" title="${esc(c.titre)}">${c.em}<kbd>${GRILLE[i].toUpperCase()}</kbd></button>` : `<span class="rts-cmd vide"></span>`).join('');
  }
  ACT['b-page'] = e => { S.page = e.dataset.v; S.sigGrille = ''; grille(); };
  ACT['b-construire'] = e => { const B = S.B, r = BT.peutPoser(B, B.joueur, e.dataset.v, -1e3, -1e3); if (!r.ok && r.raison !== 'La place est prise.') { message(r.raison, 'ko'); son('refus'); return; } S.mode = { type: 'poser', cle: e.dataset.v }; majCurseur(); majFantome(S.souris); };
  ACT['b-former'] = e => { const b = selBatiment(); if (!b) return; const r = BT.former(S.B, S.B.joueur, b.id, e.dataset.v); if (!r.ok) { message(r.raison, 'ko'); son('refus'); } else son('clic'); S.sigSel = ''; majHud(true); };
  ACT['b-stop'] = () => { BT.arreter(S.B, S.B.joueur, S.sel); };
  ACT['b-attaque'] = () => { S.mode = { type: 'attaque' }; majCurseur(); };
  ACT['b-ralliement'] = () => { S.mode = { type: 'ralliement' }; majCurseur(); };
  ACT['b-detruire'] = () => { BT.detruire(S.B, S.B.joueur, S.sel); choisir([]); };
  ACT['b-age'] = () => {
    const B = S.B, J = B.joueurs[B.joueur], r = BT.peutAvancer(B, B.joueur); if (!r.ok) { message(r.raison, 'ko'); son('refus'); return; }
    const a = J.age + 1, ch = PM.PANTHEONS[J.pantheon].mineurs[a - 1];
    S.pause = true;
    UI.ouvrirModal(`<h2>${esc(PM.AGES[a].nom)}</h2><p class="recit">Choisis ${esc(PM.epoque === 'antique' ? 'le dieu mineur' : 'ta voie')} qui guidera ton peuple : ${esc(PM.epoque === 'antique' ? 'il' : 'elle')} t’offre une créature au ${esc(R.nomBat('temple').toLowerCase())} et un pouvoir à usage unique.</p>
      <div class="cartes">${ch.map(g => { const u = PM.UNITES[g.unite], p = PM.POUVOIRS[g.pouvoir], s = R.creature(g.unite, u); return `<button class="carte-choix" data-act="b-mineur" data-v="${g.id}"><div class="em">${u.emoji}</div><h3>${esc(g.nom)}</h3>
        <p><b>${esc(u.nom)}</b> — ⚔️ ${s.att} · ❤️ ${s.pv}${s.portee ? ' · 🏹 ' + s.portee + ' m' : ''} · ${coutTxt(s.cout)}</p><p>${p.emoji} <b>${esc(p.nom)}</b> — ${esc(R.descPouvoir(g.pouvoir))}</p></button>`; }).join('')}</div>
      <div class="actions-bas"><button class="btn" data-act="b-reprendre">Plus tard</button></div>`, true);
  };
  ACT['b-mineur'] = e => { const r = BT.avancerAge(S.B, S.B.joueur, e.dataset.v); UI.fermerModal(); S.pause = false; if (!r.ok) message(r.raison, 'ko'); else { message('Le passage d’âge commence.', 'ok'); son('ok'); } majHud(true); };

  // ---------- mini-carte ----------
  function fondCarte() {
    const B = S.B, n = 200, cv = document.createElement('canvas'); cv.width = cv.height = n; const c = cv.getContext('2d'), img = c.createImageData(n, n), k = B.cote / n;
    const desert = R.CARTES[B.typeCarte].desert, neige = B.typeCarte === 'toundra';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const h = BT.hauteur(B, (x + 0.5) * k, (y + 0.5) * k), o = (y * n + x) * 4;
      let col = h < -0.3 ? [46, 92, 128] : h < 0.3 ? [196, 182, 140] : neige ? [205, 212, 214] : desert ? [204, 178, 120] : [104, 138, 70];
      if (h > 4 && h >= 0.3) col = col.map(v => Math.min(255, v * (0.9 + h * 0.02)));
      img.data.set([col[0], col[1], col[2], 255], o);
    }
    c.putImageData(img, 0, 0);
    c.fillStyle = neige ? '#3f5a3e' : '#2f5229'; for (const r of B.res) if (r.sous === 'arbre') c.fillRect(r.x / k - 0.7, r.z / k - 0.7, 1.6, 1.6);
    S.fondCarte = cv;
  }
  function miniCarte() {
    const B = S.B, cv = $('#batCarte'); if (!cv || !S.fondCarte) return; const c = cv.getContext('2d'), n = cv.width, k = n / B.cote, J = B.joueurs[B.joueur];
    c.drawImage(S.fondCarte, 0, 0, n, n);
    // ressources (or, baies), bâtiments, unités
    for (const r of B.res) { if (r.qte <= 0 || r.sous === 'arbre' || !BT.connu(B, B.joueur, r.x, r.z)) continue; c.fillStyle = r.sous === 'mine' ? '#ffd24a' : r.animal ? '#f5efe0' : '#e0475a'; c.fillRect(r.x * k - 1.5, r.z * k - 1.5, r.sous === 'mine' ? 4 : 3, r.sous === 'mine' ? 4 : 3); }
    for (const b of B.bats) { if (b.mort || (b.j !== B.joueur && !BT.connu(B, B.joueur, b.x, b.z))) continue; const t = Math.max(3, b.taille * k); c.fillStyle = B.joueurs[b.j].couleur; c.fillRect(b.x * k - t / 2, b.z * k - t / 2, t, t); c.strokeStyle = 'rgba(0,0,0,.6)'; c.strokeRect(b.x * k - t / 2, b.z * k - t / 2, t, t); }
    for (const u of B.unites) { if (u.mort || (BT.ennemis(B, B.joueur, u.j) && !BT.visible(B, B.joueur, u.x, u.z))) continue; c.fillStyle = S.sel.includes(u.id) ? '#ffffff' : B.joueurs[u.j].couleur; c.fillRect(u.x * k - 1.2, u.z * k - 1.2, 2.6, 2.6); }
    // brouillard
    const m = B.mv, t = n / m; c.fillStyle = 'rgba(0,0,0,.92)';
    for (let z = 0; z < m; z++) for (let x = 0; x < m; x++) { const o = z * m + x; if (J.vis[o] === 2) continue; c.fillStyle = J.connu[o] ? 'rgba(0,0,0,.45)' : 'rgba(6,5,4,.97)'; c.fillRect(x * t, z * t, t + 0.6, t + 0.6); }
    // alerte
    if (S.lieuAlerte && B.temps - S.lieuAlerte.t < 6) { const a = S.lieuAlerte, r = 6 + (B.temps * 8 % 8); c.strokeStyle = '#ff4433'; c.lineWidth = 2; c.beginPath(); c.arc(a.x * k, a.z * k, r, 0, 7); c.stroke(); }
    // champ de la caméra
    const v = S.vue, w = v.cv.clientWidth, h = v.cv.clientHeight, coins = [[0, 0], [w, 0], [w, h * 0.78], [0, h * 0.78]].map(([x, y]) => v.pointSol(x, y));
    if (coins.every(Boolean)) { c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); coins.forEach((p, i) => i ? c.lineTo(p.x * k, p.z * k) : c.moveTo(p.x * k, p.z * k)); c.closePath(); c.stroke(); }
  }

  // ---------- pause, fin ----------
  function menuPause() {
    if (!S.B || UI.modalOuvert()) return; S.pause = true;
    UI.ouvrirModal(`<h2>Pause</h2><p class="recit">${esc(PM.AGES[S.B.joueurs[S.B.joueur].age].nom)} · ${Math.floor(S.B.temps / 60)} min de bataille.</p>
      <ul class="aide"><li><b>Clic droit</b> : agir (marcher, récolter, bâtir, attaquer, ralliement d’un bâtiment). <b>Ctrl-clic</b> fait de même sur le pavé tactile.</li>
      <li><b>Glisser</b> : choisir au cadre ; <b>double-clic</b> : toutes les unités du même genre ; <b>Maj</b> : ajouter.</li>
      <li><kbd>H</kbd> centre-ville · <kbd>.</kbd> villageois inactif · <kbd>Espace</kbd> dernière alerte · <kbd>⌘</kbd>+<kbd>1</kbd>…<kbd>9</kbd> créer un groupe, <kbd>1</kbd>…<kbd>9</kbd> le rappeler · <kbd>Suppr</kbd> supprimer · lettres de la grille (<kbd>Q</kbd> <kbd>W</kbd> <kbd>E</kbd>…) · flèches ou bord de l’écran pour se déplacer.</li>
      <li>Contres : infanterie > cavalerie > archers > infanterie ; les héros battent les créatures, les créatures écrasent les humains ; les engins de siège abattent les bâtiments.</li></ul>
      <div class="actions-bas"><button class="btn" data-act="b-quitter">Quitter la bataille</button><button class="btn" data-act="b-rejouer">Recommencer</button><button class="btn or" data-act="b-reprendre">Reprendre</button></div>`);
  }
  ACT['b-reprendre'] = () => { UI.fermerModal(); S.pause = false; };
  ACT['b-quitter'] = () => { UI.fermerModal(); S.B = null; S.pause = false; UI.accueil(); };
  ACT['b-rejouer'] = () => { UI.fermerModal(); ACT.bataille(); };
  function finDePartie() {
    const B = S.B; if (!B) return; const J = B.joueurs[B.joueur], gagne = B.fin && B.fin.gagnant === J.equipe;
    son(gagne ? 'victoire' : 'refus');
    UI.ouvrirModal(`<h2>${gagne ? '🏆 Victoire !' : '💀 Défaite'}</h2><p class="recit">${gagne ? (B.fin.raison === 'merveille' ? 'Ta merveille a tenu : les dieux te couronnent.' : 'Tes ennemis sont vaincus. Ton nom traversera les âges.') : 'Ton peuple est tombé. Les dieux t’offriront une revanche.'} (${Math.floor(B.fin.temps / 60)} min)</p>
      <table class="rts-bilan"><tr><th></th><th>Âge</th><th>Unités formées</th><th>Ennemis abattus</th><th>Pertes</th><th>Récolte</th><th>Bâtiments</th></tr>
      ${B.joueurs.map(x => `<tr><td><span class="pastille" style="background:${esc(x.couleur)}"></span> ${esc(x.nom)}</td><td>${esc(PM.AGES[x.age].court)}</td><td>${x.stats.formees}</td><td>${x.stats.tues}</td><td>${x.stats.pertes}</td><td>${Math.round(x.stats.recolte)}</td><td>${x.stats.construits}</td></tr>`).join('')}</table>
      <div class="actions-bas"><button class="btn" data-act="b-quitter">Menu principal</button><button class="btn or grand" data-act="b-rejouer">Nouvelle bataille</button></div>`, true);
  }
  UI.demarrerBataille = demarrer;
})(window);
