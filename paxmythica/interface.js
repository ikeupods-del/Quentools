/* Pax Mythica — interface : accueil, création de partie (rapide ou personnalisée), éditeur de carte, jeu (barre, panneaux,
   ordres à la souris, temps qui passe, fenêtres d'événements), décrets, sauvegardes, oracle (IA locale du Mac) et réglages.
   Les boutons portent data-act="nom" (fonctions dans ACT) ; tout texte venant du joueur passe par esc(). */
'use strict';
(function (G) {
  const PM = G.PM;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => { n = Math.round(n); return Math.abs(n) >= 10000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : String(n); };
  const signe = n => (n >= 0 ? '+' : '') + (Math.abs(n) < 10 ? n.toFixed(1).replace('.0', '') : Math.round(n));
  const MS = [0, 1400, 700, 280];
  const UI = G.UI = { j: null, rendu: null, vitesse: 0, avantModal: 0, sel: null, onglet: 'pantheon', cible: null, filtre: 'tout', ecran: 'accueil', editeur: null, cre: null, signature: '', vuJournal: 0, oracle: { pret: false, installee: false, actif: true } };
  try { UI.oracle.actif = localStorage.getItem('pm:oracle') !== 'non'; } catch (e) { /* stockage indisponible */ }
  const ACT = {};
  // vue active : 3D façon Age of Mythology (si la carte graphique le permet) ou carte 2D de stratégie
  try { UI.mode3d = localStorage.getItem('pm:vue') !== '2d'; } catch (e) { UI.mode3d = true; }
  const vue = () => (UI.mode3d && UI.vue3d ? UI.vue3d : UI.rendu);
  UI.vue = vue;
  function appliquerVue() {
    const v3 = UI.mode3d && !!UI.vue3d;
    $('#carte').classList.toggle('cache', v3); $('#carte3d').classList.toggle('cache', !v3); $('#etiquettes3d').classList.toggle('cache', !v3);
    if (UI.j) barre();
  }
  ACT['vue'] = () => {
    if (!UI.vue3d && !creerVue3d()) return toast('La vue 3D n’est pas disponible sur cet ordinateur.', 'ko');
    const avant = vue(), centre = avant.provinceA((innerWidth) / 2, innerHeight / 2);
    UI.mode3d = !UI.mode3d; try { localStorage.setItem('pm:vue', UI.mode3d ? '3d' : '2d'); } catch (e) { /* sans stockage */ }
    appliquerVue(); if (centre >= 0) vue().centrerSur(centre, avant === UI.rendu ? UI.rendu.cam.z : UI.vue3d.z);
  };
  function creerVue3d() {
    if (UI.vue3d) return true;
    if (!PM.vue3dPossible || !PM.vue3dPossible()) return false;
    try { UI.vue3d = new PM.Vue3D($('#carte3d'), $('#etiquettes3d'), UI.rendu); evenementsCarte($('#carte3d')); if (UI.j) UI.vue3d.lier(UI.j); return true; }
    catch (e) { console.warn('Vue 3D indisponible :', e && e.message); UI.vue3d = null; UI.mode3d = false; return false; }
  }

  // ---------- stockage ----------
  const lire = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Mémoire pleine : supprime d’anciennes sauvegardes.', 'ko'); return false; } };

  // ---------- petits outils d'affichage ----------
  function montrer(id) { document.querySelectorAll('.ecran').forEach(e => e.classList.toggle('actif', e.id === id)); UI.ecran = id; }
  function toast(t, genre) {
    const d = document.createElement('div'); d.className = 'toast ' + (genre || ''); d.textContent = t; $('#toasts').appendChild(d);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
    setTimeout(() => d.remove(), genre === 'ko' ? 4200 : 3400);
  }
  function resultat(r) { if (!r) return; toast(r.message, r.ok ? 'ok' : 'ko'); PM.son(r.ok ? 'ok' : 'refus'); if (r.ok) rafraichir(); }
  function ouvrirModal(html, large) {
    $('#modalBoite').className = 'modal-boite' + (large ? ' large' : ''); $('#modalBoite').innerHTML = html; $('#modal').classList.remove('cache');
    if (UI.vitesse) { UI.avantModal = UI.vitesse; reglerVitesse(0, true); }
  }
  function fermerModal() { $('#modal').classList.add('cache'); $('#modalBoite').innerHTML = ''; if (UI.avantModal && UI.ecran === 'jeu' && !UI.editeur) { reglerVitesse(UI.avantModal, true); UI.avantModal = 0; } setTimeout(verifierAttente, 50); }
  const modalOuvert = () => !$('#modal').classList.contains('cache');
  const coutHtml = (c, x = 1) => PM.texteCout(c, x);
  const nationChip = N => N ? `<span class="pastille" style="background:${esc(N.couleur)}"></span> ${esc(N.nom)}` : 'Terres libres';

  // ---------- accueil ----------
  function accueil() {
    montrer('accueil'); UI.j = null; UI.editeur = null; reglerVitesse(0, true);
    const auto = lire('pm:auto', null), parties = lire('pm:parties', []);
    const batListe = lire('pm:bat:liste', {}) || {}, batAuto = batListe.auto;
    $('#menuAccueil').innerHTML = `
      <button class="btn or grand" data-act="bataille">⚔️ Bataille</button>
      ${batAuto ? `<button class="btn" data-act="b-continuer">Continuer la bataille — ${esc(batAuto.nom)} (${Math.floor(batAuto.temps / 60)} min)</button>` : ''}
      <button class="btn" data-act="campagne">📜 Campagne</button>
      ${Object.keys(batListe).some(k => k !== 'auto') ? '<button class="btn" data-act="b-charger-menu">📂 Charger une bataille</button>' : ''}
      ${auto ? `<button class="btn" data-act="continuer">Continuer la conquête — ${esc(auto.nation)} (${esc(PM.date(auto.mois))})</button>` : ''}
      <button class="btn" data-act="rapide">Conquête du monde (grande carte)</button>
      <button class="btn" data-act="perso">Partie personnalisée</button>
      <button class="btn" data-act="scenarios">Scénarios</button>
      ${parties.length ? '<button class="btn" data-act="charger">Charger une partie</button>' : ''}
      <button class="btn" data-act="importer">Ouvrir un fichier de partie…</button>
      <button class="btn" data-act="reglages">Réglages et oracle</button>
      <button class="btn" data-act="aide">Comment jouer</button>`;
    fondAccueil();
  }
  function fondAccueil() {
    const cv = $('#fondAccueil'); cv.width = 800; cv.height = 500;
    const c = PM.genererCarte({ graine: 1 + Math.floor(Math.random() * 9999), taille: 'petite', forme: ['continent', 'archipel', 'mer', 'deux'][Math.floor(Math.random() * 4)] });
    PM.apercu(cv, c);
  }

  // ---------- création rapide ----------
  ACT.rapide = () => { PM.appliquerEpoque('antique'); UI.cre = { mode: 'rapide', etape: 0, epoque: 'antique', pantheon: null, dieu: null, nom: '', difficulte: 1, taille: 'moyenne', nombre: 6 }; creationRapide(); montrer('creation'); };
  function creationRapide() {
    const c = UI.cre, P = c.pantheon && PM.PANTHEONS[c.pantheon], antique = c.epoque === 'antique';
    const etapes = `<div class="etapes">${['Époque', PM.mot('pantheon'), PM.mot('majeur').charAt(0).toUpperCase() + PM.mot('majeur').slice(1), 'Ton peuple'].map((t, i) => `<span class="${c.etape === i ? 'actif' : ''}">${i + 1}. ${esc(t)}</span>`).join('›')}</div>`;
    let corps = '';
    if (c.etape === 0) corps = `<div class="cartes">${Object.entries(PM.EPOQUES).map(([id, e]) => `
      <button class="carte-choix" data-act="cre-epoque" data-v="${id}"><div class="em">${e.emoji}</div><h3>${esc(e.nom)}</h3><p>${esc(e.desc)}</p></button>`).join('')}</div>`;
    else if (c.etape === 1) corps = `<div class="cartes">${Object.entries(PM.PANTHEONS).map(([id, p]) => `
      <button class="carte-choix" data-act="cre-pantheon" data-v="${id}"><div class="em">${p.emoji}</div><h3>${esc(p.nom)}</h3>
      <p>${p.majeurs.map(d => esc(d.nom)).join(' · ')}</p><p><i>${esc(p.faveur)}</i></p>
      <p>${antique ? 'Créatures' : 'Unités spéciales'} : ${p.mineurs.flat().map(g => PM.UNITES[g.unite].emoji).join(' ')}</p></button>`).join('')}</div>
      <div class="actions-bas"><button class="btn" data-act="cre-retour">← Époque</button></div>`;
    else if (c.etape === 2) corps = `<div class="cartes">${P.majeurs.map(d => `
      <button class="carte-choix" data-act="cre-dieu" data-v="${d.id}"><div class="em">${P.emoji}</div><h3>${esc(d.nom)}</h3><p>${esc(d.desc)}</p>
      <p>${antique ? 'Pouvoir' : 'Action spéciale'} : ${PM.POUVOIRS[d.pouvoir].emoji} <b>${esc(PM.POUVOIRS[d.pouvoir].nom)}</b> — ${esc(PM.POUVOIRS[d.pouvoir].desc)}</p></button>`).join('')}</div>
      <div class="actions-bas"><button class="btn" data-act="cre-retour">← ${esc(PM.mot('pantheon'))}</button></div>`;
    else corps = `<div class="bloc" style="max-width:620px">
      <div class="champ"><label>Nom de ton peuple</label><input type="text" id="creNom" maxlength="36" value="${esc(c.nom)}"></div>
      <div class="champ"><label>Difficulté</label><select id="creDif">${['Paisible', 'Normale', 'Difficile'].map((t, i) => `<option value="${i}" ${c.difficulte === i ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <div class="champ"><label>Taille du monde</label><select id="creTaille">${Object.entries(PM.TAILLES).map(([k, t]) => `<option value="${k}" ${c.taille === k ? 'selected' : ''}>${t.nom} (${t.n} provinces)</option>`).join('')}</select></div>
      <div class="champ"><label>Peuples</label><input type="range" id="creNombre" min="2" max="10" value="${c.nombre}"><b id="creNombreV">${c.nombre}</b></div>
      <p class="sous">${esc(PM.EPOQUES[c.epoque].nom)} · tu joues ${esc(P.nom)}, ${esc(PM.mot('majeur'))} : ${esc(P.majeurs.find(d => d.id === c.dieu).nom)}. Le monde est tiré au hasard.</p>
      <div class="actions-bas"><button class="btn" data-act="cre-retour">← Retour</button><button class="btn or grand" data-act="cre-lancer">Fonder mon peuple</button></div></div>`;
    $('#creationContenu').innerHTML = `<h1>Nouvelle partie</h1><p class="sous">Choisis l’époque, ton peuple et sa ${esc(PM.mot('dieu'))}. Ils décident de tes unités et de tes ${esc(PM.mot('pouvoirs').toLowerCase())}.</p>${etapes}${corps}
      <div class="actions-bas" style="justify-content:flex-start;margin-top:22px"><button class="btn" data-act="accueil">Menu principal</button></div>`;
    const r = $('#creNombre'); if (r) r.oninput = () => { $('#creNombreV').textContent = r.value; };
  }
  ACT['cre-epoque'] = e => { UI.cre.epoque = e.dataset.v; PM.appliquerEpoque(e.dataset.v); UI.cre.etape = 1; creationRapide(); };
  ACT['cre-pantheon'] = e => { const c = UI.cre; c.pantheon = e.dataset.v; c.etape = 2; c.nom = PM.NOMS_PEUPLES[c.pantheon][Math.floor(Math.random() * 3)]; creationRapide(); };
  ACT['cre-dieu'] = e => { UI.cre.dieu = e.dataset.v; UI.cre.etape = 3; creationRapide(); };
  ACT['cre-retour'] = () => { UI.cre.etape--; creationRapide(); };
  ACT['cre-lancer'] = () => {
    const c = UI.cre; c.nom = $('#creNom').value.trim() || c.nom; c.difficulte = +$('#creDif').value; c.taille = $('#creTaille').value; c.nombre = +$('#creNombre').value;
    const graine = 1 + Math.floor(Math.random() * 999999), nations = PM.nationsParDefaut(c.nombre, graine, c.pantheon);
    Object.assign(nations[0], { nom: c.nom, pantheon: c.pantheon, dieu: c.dieu });
    lancerPartie(PM.nouvellePartie({ epoque: c.epoque, graine, taille: c.taille, forme: ['continent', 'continent', 'deux', 'mer', 'pangee'][graine % 5], nations, difficulte: c.difficulte, joueur: 0 }));
  };

  // ---------- partie personnalisée ----------
  ACT.perso = (e, base) => {
    const g = 1 + Math.floor(Math.random() * 999999);
    UI.cre = Object.assign({ mode: 'perso', reglages: JSON.parse(JSON.stringify(Object.assign({}, PM.REGLAGES, { graine: g }))), nations: PM.nationsParDefaut(6, g), joueur: 0 }, base || {});
    PM.appliquerEpoque(UI.cre.reglages.epoque); creationPerso(); montrer('creation'); majApercu();
  };
  function creationPerso() {
    const c = UI.cre, r = c.reglages, sel = (id, opts, v) => `<select id="${id}">${opts.map(([k, t]) => `<option value="${k}" ${String(v) === String(k) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    $('#creationContenu').innerHTML = `<h1>Partie personnalisée</h1><p class="sous">Façonne le monde, ses peuples et ses règles, puis redessine la carte si tu le souhaites.</p>
      <div class="grille2"><div>
        <div class="bloc"><h2>Le monde</h2>
          <div class="champ"><label>Époque</label>${sel('pEpoque', Object.entries(PM.EPOQUES).map(([k, e]) => [k, e.emoji + ' ' + e.nom]), r.epoque || 'antique')}</div>
          <div class="champ"><label>Graine du monde</label><input type="number" id="pGraine" value="${r.graine}" style="width:120px"><button class="btn petit" data-act="p-graine">🎲 Autre monde</button></div>
          <div class="champ"><label>Taille</label>${sel('pTaille', Object.entries(PM.TAILLES).map(([k, t]) => [k, `${t.nom} (${t.n} provinces)`]), r.taille)}</div>
          <div class="champ"><label>Forme</label>${sel('pForme', Object.entries(PM.FORMES), r.forme)}</div>
          <div class="champ"><label>Part de terres</label><input type="range" id="pTerre" min="30" max="70" value="${Math.round(r.terre * 100)}"><b id="pTerreV">${Math.round(r.terre * 100)} %</b></div>
          <canvas id="pApercu" class="apercu" width="480" height="300"></canvas>
        </div>
        <div class="bloc"><h2>Règles</h2>
          <div class="champ"><label>Ressources de départ</label>${sel('pRes', [['faibles', 'Faibles'], ['normales', 'Normales'], ['riches', 'Riches']], r.ressources)}</div>
          <div class="champ"><label>Provinces de départ</label>${sel('pDepart', [1, 2, 3, 4, 6, 8].map(n => [n, n + ' par peuple']), r.depart)}</div>
          <div class="champ"><label>Âge de départ</label>${sel('pAge', PM.AGES.map((a, i) => [i, a.nom]), r.ageDepart)}</div>
          <div class="champ"><label>Difficulté</label>${sel('pDif', [[0, 'Paisible'], [1, 'Normale'], [2, 'Difficile']], r.difficulte)}</div>
          <div class="champ"><label>Tribus des terres libres</label>${sel('pNeutres', [[0.5, 'Faibles'], [1, 'Normales'], [1.7, 'Redoutables']], r.neutres)}</div>
          <div class="champ"><label>Paix imposée au début</label>${sel('pPaix', [[0, 'Aucune'], [12, '1 an'], [24, '2 ans'], [60, '5 ans']], r.paixInitiale)}</div>
          <div class="champ"><label>Événements</label>${sel('pEvts', [[0, 'Aucun'], [1, 'Normaux'], [2, 'Fréquents']], r.evenements)}</div>
          <div class="champ"><label>${esc(PM.mot('pouvoirs'))}</label><label><input type="checkbox" id="pMythes" ${r.mythes !== false ? 'checked' : ''}> ${esc(PM.mot('pouvoirs'))} et unités spéciales</label></div>
          <div class="champ"><label>Victoires</label><span><label><input type="checkbox" id="pVConq" ${r.victoire.conquete !== false ? 'checked' : ''}> Conquête</label>&nbsp; <label><input type="checkbox" id="pVMerv" ${r.victoire.merveille !== false ? 'checked' : ''}> Merveille</label></span></div>
          <div class="champ"><label>Limite de temps</label>${sel('pAns', [[0, 'Aucune'], [30, '30 ans (au score)'], [60, '60 ans (au score)'], [120, '120 ans (au score)']], r.victoire.annees)}</div>
        </div>
      </div><div>
        <div class="bloc"><h2>Les peuples <small class="sous">(${c.nations.length})</small></h2>
          <table class="peuples"><tr><th>Toi</th><th></th><th>Nom</th><th>${esc(PM.mot('pantheon'))}</th><th>${esc(PM.mot('majeur').charAt(0).toUpperCase() + PM.mot('majeur').slice(1))}</th><th>Humeur</th><th></th></tr>
          ${c.nations.map((N, i) => `<tr>
            <td><input type="radio" name="pJoueur" value="${i}" ${c.joueur === i ? 'checked' : ''}></td>
            <td><input type="color" data-n="${i}" data-k="couleur" value="${esc(N.couleur)}"></td>
            <td><input type="text" data-n="${i}" data-k="nom" value="${esc(N.nom)}" maxlength="36"></td>
            <td><select data-n="${i}" data-k="pantheon">${Object.entries(PM.PANTHEONS).map(([k, p]) => `<option value="${k}" ${N.pantheon === k ? 'selected' : ''}>${p.emoji} ${p.nom}</option>`).join('')}</select></td>
            <td><select data-n="${i}" data-k="dieu">${PM.PANTHEONS[N.pantheon].majeurs.map(d => `<option value="${d.id}" ${N.dieu === d.id ? 'selected' : ''}>${d.nom}</option>`).join('')}</select></td>
            <td><select data-n="${i}" data-k="agress">${[[0.25, 'Pacifique'], [0.5, 'Équilibré'], [0.85, 'Belliqueux']].map(([v, t]) => `<option value="${v}" ${Math.abs(N.agress - v) < 0.18 ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
            <td>${c.nations.length > 2 ? `<button class="fermer" data-act="p-retirer" data-v="${i}" title="Retirer">✕</button>` : ''}</td></tr>`).join('')}
          </table>
          <div class="actions-bas" style="justify-content:flex-start">${c.nations.length < 12 ? '<button class="btn petit" data-act="p-ajouter">+ Ajouter un peuple</button>' : ''}<button class="btn petit" data-act="p-hasard">🎲 Peuples au hasard</button></div>
        </div>
        <div class="bloc"><h2>Commencer</h2>
          <p class="sous">« Modifier la carte » ouvre l’éditeur : frontières, terrains, noms des provinces et capitales.</p>
          <div class="actions-bas"><button class="btn" data-act="accueil">Annuler</button><button class="btn" data-act="p-editeur">Modifier la carte…</button><button class="btn or grand" data-act="p-lancer">Commencer la partie</button></div>
        </div>
      </div></div>`;
    const maj = () => { lireReglages(); majApercu(); };
    $('#pEpoque').onchange = () => { lireReglages(); PM.appliquerEpoque(c.reglages.epoque); c.nations.forEach((N, i) => { const l = PM.NOMS_PEUPLES[N.pantheon]; N.nom = l[i % l.length]; }); creationPerso(); majApercu(); };
    ['#pTaille', '#pForme'].forEach(s => { $(s).onchange = maj; });
    $('#pGraine').onchange = maj;
    $('#pTerre').oninput = () => { $('#pTerreV').textContent = $('#pTerre').value + ' %'; clearTimeout(UI.tApercu); UI.tApercu = setTimeout(maj, 260); };
    document.querySelectorAll('table.peuples [data-n]').forEach(el => { el.onchange = () => { lireReglages(); if (el.dataset.k === 'pantheon') { const N = c.nations[+el.dataset.n]; N.dieu = PM.PANTHEONS[N.pantheon].majeurs[0].id; creationPerso(); } else if (el.dataset.k === 'couleur') majApercu(true); }; });
    document.querySelectorAll('[name=pJoueur]').forEach(el => { el.onchange = () => { c.joueur = +el.value; }; });
  }
  function lireReglages() {
    const c = UI.cre, r = c.reglages, v = s => $(s) && $(s).value;
    if (!$('#pTaille')) return;
    Object.assign(r, { epoque: v('#pEpoque') || 'antique', graine: Math.max(1, Math.floor(+v('#pGraine') || 1)), taille: v('#pTaille'), forme: v('#pForme'), terre: +v('#pTerre') / 100, ressources: v('#pRes'), depart: +v('#pDepart'), ageDepart: +v('#pAge'),
      difficulte: +v('#pDif'), neutres: +v('#pNeutres'), paixInitiale: +v('#pPaix'), evenements: +v('#pEvts'), mythes: $('#pMythes').checked,
      victoire: { conquete: $('#pVConq').checked, merveille: $('#pVMerv').checked, annees: +v('#pAns') } });
    document.querySelectorAll('table.peuples [data-n]').forEach(el => { const N = c.nations[+el.dataset.n], k = el.dataset.k; N[k] = k === 'agress' ? +el.value : el.value; });
    const j = document.querySelector('[name=pJoueur]:checked'); if (j) c.joueur = +j.value;
  }
  // aperçu : carte et premiers territoires (même tirage que la vraie partie)
  function majApercu(couleursSeules) {
    const c = UI.cre, r = c.reglages, cle = [r.graine, r.taille, r.forme, r.terre].join('|');
    if (!couleursSeules || !c.carte || c.cleCarte !== cle) { c.carte = PM.genererCarte(r); c.cleCarte = cle; }
    const j = PM.nouvellePartie(Object.assign({}, r, { nations: c.nations, joueur: c.joueur }), c.carte);
    if ($('#pApercu')) PM.apercu($('#pApercu'), c.carte, j.etat);
  }
  ACT['p-graine'] = () => { $('#pGraine').value = 1 + Math.floor(Math.random() * 999999); lireReglages(); majApercu(); };
  ACT['p-ajouter'] = () => { lireReglages(); const c = UI.cre, l = PM.nationsParDefaut(c.nations.length + 1, c.reglages.graine + 7), N = l[l.length - 1]; N.couleur = PM.COULEURS.find(x => !c.nations.some(M => M.couleur === x)) || N.couleur; c.nations.push(N); creationPerso(); majApercu(); };
  ACT['p-retirer'] = e => { lireReglages(); const c = UI.cre, i = +e.dataset.v; c.nations.splice(i, 1); if (c.joueur >= c.nations.length || c.joueur === i) c.joueur = 0; else if (c.joueur > i) c.joueur--; creationPerso(); majApercu(); };
  ACT['p-hasard'] = () => { lireReglages(); const c = UI.cre; c.nations = PM.nationsParDefaut(c.nations.length, Math.floor(Math.random() * 1e6)); creationPerso(); majApercu(); };
  function partiePerso() {
    lireReglages(); const c = UI.cre;
    if (!c.carte || c.cleCarte !== [c.reglages.graine, c.reglages.taille, c.reglages.forme, c.reglages.terre].join('|')) majApercu();
    return PM.nouvellePartie(Object.assign({}, c.reglages, { nations: c.nations, joueur: c.joueur }), c.carte);
  }
  ACT['p-lancer'] = () => lancerPartie(partiePerso());
  ACT['p-editeur'] = () => ouvrirEditeur(partiePerso());

  // ---------- éditeur de carte ----------
  function ouvrirEditeur(j) {
    UI.editeur = { outil: 'peindre', nation: j.etat.joueur, terrain: 'plaine', prov: -1 };
    preparerJeu(j); $('#droite').classList.add('cache'); $('#decret').classList.add('cache'); panneauEditeur(); barre();
    toast('Éditeur : clique ou glisse sur les provinces. Le trackpad (deux doigts) déplace la carte.');
  }
  function panneauEditeur() {
    const j = UI.j, E = j.etat, ed = UI.editeur, P = ed.prov >= 0 ? E.provinces[ed.prov] : null;
    const g = $('#gauche'); g.classList.remove('cache');
    g.innerHTML = `<div class="tete"><h2>Éditeur de carte</h2></div><p class="sous">Redessine le monde avant la première année.</p>
      <h3>Outil</h3><div class="outils">${[['peindre', '🖌️ Frontières'], ['terrain', '⛰️ Terrain'], ['niveau', '⭐ Niveau'], ['capitale', '★ Capitale'], ['nom', '✏️ Nom']].map(([k, t]) => `<button class="btn petit ${ed.outil === k ? 'actif' : ''}" data-act="ed-outil" data-v="${k}">${t}</button>`).join('')}</div>
      ${ed.outil === 'peindre' ? `<h3>Peindre avec</h3>${E.nations.map(N => `<div class="ligne"><label class="nom"><input type="radio" name="edN" value="${N.id}" ${ed.nation === N.id ? 'checked' : ''}> ${nationChip(N)}${N.id === E.joueur ? ' <small>(toi)</small>' : ''}</label><small>${E.provinces.filter(p => p.owner === N.id).length}</small></div>`).join('')}
        <div class="ligne"><label class="nom"><input type="radio" name="edN" value="-1" ${ed.nation === -1 ? 'checked' : ''}> Terres libres (tribus)</label><small>${E.provinces.filter(p => p.owner < 0).length}</small></div>` : ''}
      ${ed.outil === 'terrain' ? `<h3>Terrain</h3><div class="outils">${Object.entries(PM.TERRAINS).map(([k, t]) => `<button class="btn petit ${ed.terrain === k ? 'actif' : ''}" data-act="ed-terrain" data-v="${k}">${t.nom}</button>`).join('')}</div>` : ''}
      ${ed.outil === 'niveau' ? '<p class="info">Chaque clic augmente le niveau de la province (1 à 5, puis retour à 1).</p>' : ''}
      ${ed.outil === 'capitale' ? '<p class="info">Clique une province : elle devient la capitale de son peuple.</p>' : ''}
      ${ed.outil === 'nom' ? (P ? `<h3>${esc(P.nom)}</h3><div class="champ"><input type="text" id="edNom" maxlength="28" value="${esc(P.nom)}" style="flex:1"><button class="btn petit or" data-act="ed-nom">Renommer</button></div>` : '<p class="info">Clique une province pour la renommer.</p>') : ''}
      <h3>Terminer</h3>
      <div class="choix"><button class="btn or" data-act="ed-lancer">Commencer la partie</button><button class="btn" data-act="ed-scenario">Enregistrer comme scénario…</button><button class="btn" data-act="ed-retour">← Réglages de la partie</button></div>`;
    g.querySelectorAll('[name=edN]').forEach(el => { el.onchange = () => { ed.nation = +el.value; }; });
    const n = $('#edNom'); if (n) { n.focus(); n.select(); n.onkeydown = e => { if (e.key === 'Enter') ACT['ed-nom'](); }; }
  }
  function appliquerOutil(p, glisse) {
    const j = UI.j, E = j.etat, ed = UI.editeur, P = E.provinces[p]; if (!P) return;
    if (ed.outil === 'peindre') {
      if (P.owner === ed.nation) return;
      const ancien = P.owner; P.owner = ed.nation; P.siege = null;
      P.garnison = ed.nation < 0 ? Math.round((2 + P.dev * 2) * (E.reglages.neutres || 1)) : 1 + P.dev;
      if (ancien >= 0 && E.nations[ancien].capitale === p) E.nations[ancien].capitale = -1;
      if (ed.nation >= 0 && (E.nations[ed.nation].capitale < 0 || E.provinces[E.nations[ed.nation].capitale].owner !== ed.nation)) E.nations[ed.nation].capitale = p;
      UI.rendu.majProprietaires(); if (!glisse) panneauEditeur();
    } else if (glisse) return;
    else if (ed.outil === 'terrain') { P.terrain = ed.terrain; UI.rendu.dessinerBase(); }
    else if (ed.outil === 'niveau') P.dev = P.dev >= 5 ? 1 : P.dev + 1;
    else if (ed.outil === 'capitale') { if (P.owner >= 0) { E.nations[P.owner].capitale = p; toast(`${P.nom} devient la capitale de ${E.nations[P.owner].nom}.`, 'ok'); } }
    else if (ed.outil === 'nom') { ed.prov = p; panneauEditeur(); }
    UI.rendu.majHalo(p); UI.rendu.dirty = true;
  }
  ACT['ed-outil'] = e => { UI.editeur.outil = e.dataset.v; panneauEditeur(); };
  ACT['ed-terrain'] = e => { UI.editeur.terrain = e.dataset.v; panneauEditeur(); };
  ACT['ed-nom'] = () => { const P = UI.j.etat.provinces[UI.editeur.prov], v = $('#edNom').value.trim().slice(0, 28); if (P && v) { P.nom = v; panneauEditeur(); UI.rendu.dirty = true; } };
  ACT['ed-retour'] = () => { const c = UI.cre; UI.editeur = null; montrer('creation'); if (c && c.mode === 'perso') { creationPerso(); majApercu(); } else accueil(); };
  ACT['ed-lancer'] = () => { const r = PM.validerEditeur(UI.j); if (!r.ok) return resultat(r); UI.j.etat.reglages.noms = null; UI.editeur = null; lancerPartie(UI.j); };
  ACT['ed-scenario'] = () => demanderNom('Nom du scénario', UI.j.etat.nations[UI.j.etat.joueur].nom, nom => {
    const r = PM.validerEditeur(UI.j); if (!r.ok) return resultat(r);
    const l = lire('pm:scenarios', []); l.unshift({ nom, date: Date.now(), etat: UI.j.etat }); if (ecrire('pm:scenarios', l.slice(0, 20))) toast('Scénario enregistré : ' + nom, 'ok');
  });

  // ---------- scénarios ----------
  const PRESETS = [
    { nom: 'Les quatre panthéons', desc: 'Quatre peuples, un par panthéon, sur un grand continent.', r: { taille: 'moyenne', forme: 'continent' }, nations: ['grecs', 'egyptiens', 'nordiques', 'atlantes'] },
    { nom: 'Duel des dieux', desc: 'Deux peuples face à face sur deux continents. Rapide et sans pitié.', r: { taille: 'petite', forme: 'deux', paixInitiale: 12 }, nations: ['grecs', 'nordiques'] },
    { nom: 'Archipel des Titans', desc: 'Des îles reliées par la mer, six peuples, départ à l’âge classique.', r: { taille: 'moyenne', forme: 'archipel', terre: 0.4, ageDepart: 1 }, nations: ['atlantes', 'grecs', 'egyptiens', 'nordiques', 'atlantes', 'grecs'] },
    { nom: 'Ragnarök', desc: 'Huit peuples, tribus redoutables, guerre dès la première année, âge héroïque.', r: { taille: 'grande', forme: 'pangee', ageDepart: 2, ressources: 'riches', neutres: 1.7, paixInitiale: 0, difficulte: 2 }, nations: ['nordiques', 'nordiques', 'grecs', 'egyptiens', 'atlantes', 'nordiques', 'grecs', 'egyptiens'] },
    { nom: 'La Mer intérieure', desc: 'Sept peuples autour d’une mer, la merveille comme seule victoire.', r: { taille: 'grande', forme: 'mer', victoire: { conquete: false, merveille: true, annees: 0 } }, nations: ['egyptiens', 'grecs', 'atlantes', 'nordiques', 'egyptiens', 'grecs', 'atlantes'] }
  ];
  ACT.scenarios = () => {
    const mes = lire('pm:scenarios', []);
    ouvrirModal(`<h2>Scénarios</h2><p class="sous">Choisis un monde prêt à jouer, ou un de tes scénarios. Tu choisis ensuite ton peuple.</p>
      ${PRESETS.map((s, i) => `<div class="ligne"><div class="nom"><b>${esc(s.nom)}</b><small>${esc(s.desc)}</small></div><button class="btn petit or" data-act="preset" data-v="${i}">Préparer</button></div>`).join('')}
      <h3 style="margin-top:18px">Mes scénarios</h3>
      ${mes.length ? mes.map((s, i) => `<div class="ligne"><div class="nom"><b>${esc(s.nom)}</b><small>${s.etat.nations.length} peuples · ${s.etat.provinces.length} provinces</small></div><button class="btn petit or" data-act="mon-scenario" data-v="${i}">Jouer</button><button class="btn petit" data-act="suppr-scenario" data-v="${i}">Supprimer</button></div>`).join('') : '<p class="sous">Aucun : crée-en un depuis « Partie personnalisée → Modifier la carte ».</p>'}
      <div class="actions-bas"><button class="btn" data-act="fermer">Fermer</button></div>`, true);
  };
  ACT.preset = e => {
    const s = PRESETS[+e.dataset.v], g = 1 + Math.floor(Math.random() * 999999), nations = PM.nationsParDefaut(s.nations.length, g);
    s.nations.forEach((pa, i) => { const N = nations[i]; N.pantheon = pa; N.dieu = PM.PANTHEONS[pa].majeurs[i % 3].id; const noms = PM.NOMS_PEUPLES[pa]; N.nom = noms[i % noms.length]; });
    fermerModal();
    ACT.perso(null, { reglages: Object.assign(JSON.parse(JSON.stringify(PM.REGLAGES)), { graine: g }, JSON.parse(JSON.stringify(s.r))), nations, joueur: 0 });
  };
  ACT['mon-scenario'] = e => {
    const s = lire('pm:scenarios', [])[+e.dataset.v]; if (!s) return;
    fermerModal();
    ouvrirModal(`<h2>${esc(s.nom)}</h2><p class="sous">Quel peuple veux-tu diriger ?</p>${s.etat.nations.filter(N => N.vivante).map(N => `<div class="ligne"><div class="nom">${nationChip(N)} <small>${PM.PANTHEONS[N.pantheon].emoji} ${PM.PANTHEONS[N.pantheon].nom}, ${PM.majeur(N).nom}</small></div><button class="btn petit or" data-act="jouer-scenario" data-v="${+e.dataset.v}" data-n="${N.id}">Choisir</button></div>`).join('')}
      <div class="actions-bas"><button class="btn" data-act="fermer">Annuler</button></div>`);
  };
  ACT['jouer-scenario'] = e => {
    const s = lire('pm:scenarios', [])[+e.dataset.v], etat = JSON.parse(JSON.stringify(s.etat)), n = +e.dataset.n;
    etat.joueur = n; etat.nations.forEach(N => { N.ia = N.id !== n; }); fermerModal();
    lancerPartie(PM.charger(etat));
  };
  ACT['suppr-scenario'] = e => { const l = lire('pm:scenarios', []); l.splice(+e.dataset.v, 1); ecrire('pm:scenarios', l); ACT.scenarios(); };

  // ---------- jeu : démarrage et boucle ----------
  function preparerJeu(j) {
    UI.j = j; UI.sel = null; UI.cible = null; UI.vuJournal = j.etat.journal.length;
    montrer('jeu');
    if (!UI.rendu) { UI.rendu = new PM.Rendu($('#carte')); evenementsCarte($('#carte')); requestAnimationFrame(boucle); }
    UI.rendu.lier(j);
    if (UI.mode3d) creerVue3d(); if (UI.vue3d) UI.vue3d.lier(j); appliquerVue(); UI.rendu.sel = null; UI.rendu.majHalo(-1); UI.signature = signature();
    $('#gauche').classList.add('cache'); $('#droite').classList.remove('cache'); $('#decret').classList.remove('cache');
  }
  function lancerPartie(j) {
    preparerJeu(j); UI.editeur = null; onglets(); rafraichir();
    const N = j.etat.nations[j.etat.joueur]; UI.rendu.centrerSur(N.capitale, Math.max(UI.rendu.cam.z, 1.5)); if (UI.vue3d) UI.vue3d.centrerSur(N.capitale, 1.3);
    if (j.etat.mois === 0) ouvrirModal(`<h2>${PM.PANTHEONS[N.pantheon].emoji} ${esc(N.nom)}</h2>
      <p class="recit">${PM.epoque === 'antique' ? `Les dieux ont posé ton peuple sur la terre de ${esc(j.etat.provinces[N.capitale].nom)}. ${esc(PM.majeur(N).nom)} veille sur toi. Étends ton domaine, élève des temples, gagne la faveur des dieux et fais trembler tes voisins.`
        : `${esc(PM.EPOQUES[PM.epoque].nom)}. Ton peuple s’établit à ${esc(j.etat.provinces[N.capitale].nom)}, guidé par « ${esc(PM.majeur(N).nom)} ». Étends ton domaine, bâtis, accumule ${esc(PM.mot('faveur'))} et fais trembler tes voisins.`}</p>
      <ul class="aide"><li>Clique une province pour <b>construire</b> ou <b>recruter</b> ; clique ton armée puis une province pour <b>marcher</b>.</li>
      <li>Les <b>terres libres</b> se conquièrent sans déclarer de guerre.</li>
      <li>Écris des <b>décrets</b> en bas de l’écran : ton peuple obéit.</li>
      <li><kbd>Espace</kbd> pause, <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> vitesse.</li></ul>
      <div class="actions-bas"><button class="btn or grand" data-act="commencer">Que l’histoire commence</button></div>`);
    else reglerVitesse(0);
    PM.musique();
  }
  ACT.commencer = () => { fermerModal(); reglerVitesse(1); };
  const signature = () => UI.j.etat.provinces.map(p => p.owner).join(',');
  let dernier = 0, acc = 0;
  function boucle(ts) {
    const dt = Math.min(100, ts - (dernier || ts)); dernier = ts;
    if (UI.j && UI.ecran === 'jeu') {
      if (UI.vitesse > 0 && !UI.editeur && !modalOuvert() && !UI.j.etat.fin && !UI.decretEnCours) {
        acc += dt;
        if (acc >= MS[UI.vitesse]) { acc = 0; unMois(); }
      }
      UI.rendu.fraction = UI.vitesse ? Math.min(1, acc / MS[UI.vitesse]) : 0;
      vue().dessiner(dt);
    }
    requestAnimationFrame(boucle);
  }
  function unMois() {
    const j = UI.j, E = j.etat;
    PM.mois(j);
    const s = signature(); if (s !== UI.signature) { UI.signature = s; UI.rendu.majProprietaires(); }
    nouvellesDuMonde();
    if (UI.sel && UI.sel.type === 'armee' && !E.armees.some(a => a.id === UI.sel.id)) deselectionner();
    rafraichir();
    if (E.mois % 12 === 0) sauverAuto();
    verifierAttente();
  }
  // chronique : ce qui touche le joueur s'affiche et se fait entendre
  function nouvellesDuMonde() {
    const E = UI.j.etat, l = E.journal.slice(Math.max(0, Math.min(UI.vuJournal, E.journal.length)));
    UI.vuJournal = E.journal.length;
    const sons = { guerre: 'guerre', bataille: 'bataille', pouvoir: 'pouvoir', conquete: 'conquete', age: 'age', chute: 'conquete', merveille: 'age', alerte: 'refus', alliance: 'ok', paix: 'ok' };
    let joue = false;
    for (const e of l) if (e.nations.includes(E.joueur) && e.type !== 'decret') { toast(e.texte, e.type === 'alerte' ? 'ko' : ''); if (!joue && sons[e.type]) { PM.son(sons[e.type]); joue = true; } }
  }
  function verifierAttente() {
    const j = UI.j; if (!j || UI.editeur || modalOuvert() || UI.ecran !== 'jeu') return;
    const E = j.etat;
    if (E.fin && !E.finVue) { E.finVue = true; return finDePartie(); }
    const a = E.attente.find(x => x.nation === E.joueur); if (!a) return;
    const de = a.de != null ? E.nations[a.de] : null;
    if (a.type === 'mineur') {
      const l = PM.mineursProposes(j, E.joueur, a.age); PM.son('age');
      ouvrirModal(`<h2>✨ ${PM.AGES[a.age].nom}</h2><p class="recit">Ton peuple entre dans un nouvel âge. ${PM.epoque === 'antique' ? 'Quel dieu veux-tu honorer ? Il t’offre une créature et un pouvoir.' : 'Que choisis-tu ? Chaque voie t’offre une unité spéciale et une action.'}</p>
        <div class="deux">${l.map(g => { const u = PM.UNITES[g.unite], p = PM.POUVOIRS[g.pouvoir]; return `<button class="carte-choix" data-act="mineur" data-v="${g.id}"><h3>${esc(g.nom)}</h3>
          <p>${u.emoji} <b>${esc(u.nom)}</b> — ⚔ ${u.att} · ❤ ${u.pv} · 👥 ${u.pop}<br><small>${coutHtml(PM.coutUnite(j, E.joueur, g.unite))}</small></p>
          <p>${p.emoji} <b>${esc(p.nom)}</b> — ${esc(p.desc)} <small>(${p.cout} ✨)</small></p></button>`; }).join('')}</div>`);
    } else if (a.type === 'evenement') {
      const ev = PM.EVENEMENTS.find(x => x.id === a.id); PM.son('evenement');
      ouvrirModal(`<h2>📜 ${esc(PM.texteEvenement(j, a, ev.titre))}</h2><p class="recit">${esc(PM.texteEvenement(j, a, ev.texte))}</p>
        <div class="choix">${ev.choix.map((c, i) => `<button class="btn" data-act="evenement" data-v="${i}" ${PM.peutChoisir(j, a, c) ? '' : 'disabled'}>${esc(c.t)}</button>`).join('')}</div>`);
    } else if (a.type === 'paix') ouvrirModal(`<h2>🕊️ Proposition de paix</h2><p class="recit">Les ambassadeurs de ${esc(de.nom)} demandent la fin des combats. Les provinces prises restent à ceux qui les tiennent, et une trêve de deux ans suivra.</p>
        <div class="actions-bas"><button class="btn" data-act="paix-non">Continuer la guerre</button><button class="btn or" data-act="paix-oui">Signer la paix</button></div>`);
    else if (a.type === 'pacte') {
      const t = PM.TYPES_PACTE[a.typePacte], p = a.pacte != null ? PM.pacte(j, a.pacte) : null;
      const texte = a.cas === 'adhesion' ? `${esc(de.nom)} demande à entrer dans ton alliance « ${esc(p && p.nom)} ».`
        : a.cas === 'invitation' ? `${esc(de.nom)} t’invite à rejoindre « ${esc(p && p.nom)} » (${t.nom.toLowerCase()}), avec ${esc(p ? p.membres.map(m => E.nations[m].nom).join(', ') : '')}.`
        : a.cas === 'renfort' ? `${esc(de.nom)} propose de faire de votre alliance une ${t.nom.toLowerCase()}.`
        : `${esc(de.nom)} (${PM.PANTHEONS[de.pantheon].nom}) propose ${a.typePacte === 'nonagression' ? 'un pacte de non-agression de dix ans' : 'de fonder une ' + t.nom.toLowerCase()}.`;
      PM.son('evenement');
      ouvrirModal(`<h2>${t.emoji} ${t.nom}</h2><p class="recit">${texte}</p><p class="info">${esc(t.desc)}</p><p class="sous">Relations ${Math.round(PM.relation(j, E.joueur, de.id))} · parole de ${esc(de.nom)} : ${Math.round(PM.parole(j, de.id))}/100</p>
        <div class="actions-bas"><button class="btn" data-act="pacte-non">Décliner</button><button class="btn or" data-act="pacte-oui">Accepter</button></div>`);
    }
    else if (a.type === 'appel') ouvrirModal(`<h2>📯 Appel aux armes</h2><p class="recit">${a.defensif ? `Ton allié ${esc(E.nations[a.allie].nom)} est attaqué par ${esc(E.nations[a.ennemi].nom)}.` : `Ton allié ${esc(E.nations[a.allie].nom)} part en guerre contre ${esc(E.nations[a.ennemi].nom)} et t’appelle à ses côtés.`} Entres-tu en guerre ?</p>
        <p class="sous">Refuser : ta parole baisse de 20 et tu quittes l’alliance. Accepter : la paix de ton allié sera aussi la tienne.</p>
        <div class="actions-bas"><button class="btn" data-act="appel-non">Rester à l’écart</button><button class="btn rouge" data-act="appel-oui">Déclarer la guerre</button></div>`);
  }
  ACT.mineur = e => { const r = PM.choisirMineur(UI.j, UI.j.etat.joueur, e.dataset.v); fermerModal(); resultat(r); };
  ACT.evenement = e => { const r = PM.repondreEvenement(UI.j, +e.dataset.v); fermerModal(); resultat(r); };
  ACT['paix-oui'] = () => { const r = PM.repondrePaix(UI.j, true); fermerModal(); resultat(r); };
  ACT['paix-non'] = () => { const r = PM.repondrePaix(UI.j, false); fermerModal(); resultat(r); };
  ACT['pacte-oui'] = () => { const r = PM.repondrePacte(UI.j, true); fermerModal(); resultat(r); };
  ACT['pacte-non'] = () => { const r = PM.repondrePacte(UI.j, false); fermerModal(); resultat(r); };
  ACT['appel-oui'] = () => { const r = PM.repondreAppel(UI.j, true); fermerModal(); resultat(r); };
  ACT['appel-non'] = () => { const r = PM.repondreAppel(UI.j, false); fermerModal(); resultat(r); };
  function finDePartie() {
    const j = UI.j, E = j.etat, gagne = E.fin.gagnant === E.joueur;
    PM.son(gagne ? 'victoire' : 'guerre'); reglerVitesse(0);
    const classement = E.nations.slice().sort((a, b) => PM.score(j, b.id) - PM.score(j, a.id));
    ouvrirModal(`<h2>${gagne ? '👑 Victoire !' : E.fin.gagnant >= 0 ? '⚱️ Défaite' : '⚱️ Fin de ton peuple'}</h2>
      <p class="recit">${esc(E.fin.raison)} ${esc(PM.date(E.fin.mois))}.</p>
      <table class="score">${classement.map((N, i) => `<tr><td>${i + 1}</td><td>${nationChip(N)}${N.vivante ? '' : ' <small>(disparu)</small>'}</td><td>${PM.score(j, N.id)} points</td></tr>`).join('')}</table>
      <div class="actions-bas">${nationVivante() ? '<button class="btn" data-act="continuer-libre">Continuer à jouer</button>' : ''}<button class="btn or" data-act="accueil">Menu principal</button></div>`);
  }
  const nationVivante = () => UI.j && UI.j.etat.nations[UI.j.etat.joueur].vivante;
  ACT['continuer-libre'] = () => { const E = UI.j.etat; E.fin = null; E.reglages.victoire = { conquete: false, merveille: false, annees: 0 }; fermerModal(); toast('Partie libre : plus de condition de victoire.'); };

  // ---------- vitesse ----------
  function reglerVitesse(v, silencieux) {
    UI.vitesse = v; if (!silencieux) UI.avantModal = 0;
    document.querySelectorAll('.vitesses button').forEach(b => b.classList.toggle('actif', +b.dataset.v === v));
  }
  ACT.vitesse = e => { reglerVitesse(+e.dataset.v); PM.son('clic'); };

  // ---------- barre du haut ----------
  function barre() {
    const j = UI.j, E = j.etat, N = E.nations[E.joueur], b = PM.bilan(j, E.joueur), pop = PM.pop(j, E.joueur), pmax = PM.popMax(j, E.joueur);
    const res = PM.RESSOURCES.map(r => `<div class="r" title="${r}"><b>${PM.ICONES[r]} ${fmt(N.res[r])}${r === 'faveur' ? '<small style="display:inline">/200</small>' : ''}</b><small class="${b.net[r] < 0 ? 'neg' : ''}">${signe(b.net[r])}/mois</small></div>`).join('');
    const ageTxt = N.ageCours ? `vers ${PM.AGES[N.ageCours.vers].court} · ${N.ageCours.reste} mois` : N.age < 3 ? 'prochain : ' + PM.AGES[N.age + 1].court : 'sommet atteint';
    $('#barre').innerHTML = `
      <button class="btn petit" data-act="menu" title="Menu">☰</button>
      <div class="nation"><span>${PM.PANTHEONS[N.pantheon].emoji}</span><span class="pastille" style="background:${esc(N.couleur)}"></span>${esc(N.nom)}</div>
      <div class="res">${res}<div class="r" title="Population"><b>${PM.ICONES.pop} ${fmt(pop)}/${fmt(pmax)}</b><small>armées</small></div></div>
      <div class="espace"></div>
      ${UI.editeur ? '<b class="titre">ÉDITEUR</b>' : `<div class="age-barre"><b>${PM.AGES[N.age].nom}</b><br>${ageTxt}</div>
      ${UI.vue3d || (PM.vue3dPossible && PM.vue3dPossible()) ? `<button class="btn petit" data-act="vue" title="Changer de vue (V)">${UI.mode3d && UI.vue3d ? '🗺️ Carte' : '🏛️ Vue 3D'}</button><button class="btn petit" data-act="packs" title="Packs graphiques">🎨</button>` : ''}
      <div class="date">${esc(PM.date(E.mois))}</div>
      <div class="vitesses">${['⏸', '▶', '⏩', '⏭'].map((t, i) => `<button data-act="vitesse" data-v="${i}" class="${UI.vitesse === i ? 'actif' : ''}" title="${['Pause (Espace)', 'Lent (1)', 'Normal (2)', 'Rapide (3)'][i]}">${t}</button>`).join('')}</div>`}`;
  }

  // ---------- onglets de droite ----------
  function onglets() {
    $('#onglets').innerHTML = [['pantheon', PM.EPOQUES[PM.epoque].emoji + ' ' + PM.mot('dieux')], ['diplo', '🏛️ Peuples'], ['alliances', '🤝 Alliances'], ['armees', '⚔️ Armées'], ['chronique', '📜 Chronique']].map(([k, t]) => `<button data-act="onglet" data-v="${k}" class="${UI.onglet === k ? 'actif' : ''}">${t}</button>`).join('');
  }
  ACT.onglet = e => { UI.onglet = e.dataset.v; onglets(); ongletContenu(); };
  function ongletContenu() {
    const j = UI.j, E = j.etat, n = E.joueur, N = E.nations[n], box = $('#ongletContenu'), haut = box.scrollTop;
    if (UI.onglet === 'pantheon') {
      const P = PM.PANTHEONS[N.pantheon], maj = PM.majeur(N), A = N.age < 3 ? PM.AGES[N.age + 1] : null;
      const pouvoirs = PM.pouvoirsDe(j, n).map(pid => { const p = PM.POUVOIRS[pid], c = PM.coutPouvoir(j, n, pid), r = N.pouvoirs[pid];
        return `<div class="pouvoir"><div class="em">${p.emoji}</div><div><b>${esc(p.nom)}</b><small>${esc(p.desc)}</small><small>${c} ✨ · recharge ${p.recharge} mois${r > 0 ? ` · <b style="color:var(--rouge)">prêt dans ${r} mois</b>` : ''}</small></div>
          <button class="btn petit ${r > 0 || N.res.faveur < c ? '' : 'or'}" data-act="pouvoir" data-v="${pid}" ${r > 0 || N.res.faveur < c || E.reglages.mythes === false ? 'disabled' : ''}>${PM.mot('lancer')}</button></div>`; }).join('');
      box.innerHTML = `<div class="dieu"><b>${P.emoji} ${esc(maj.nom)}</b> <small class="sous">${esc(PM.mot('majeur'))} · ${esc(P.nom)}</small><p>${esc(maj.desc)} ${esc(P.faveur)}</p></div>
        <h3>Les âges</h3><div class="ages">${PM.AGES.map((a, i) => `<div class="${i <= N.age ? 'fait' : N.ageCours && N.ageCours.vers === i ? 'cours' : ''}">${a.court}</div>`).join('')}</div>
        ${N.ageCours ? `<p class="info">Passage à l’${PM.AGES[N.ageCours.vers].nom.toLowerCase()} : encore ${N.ageCours.reste} mois.</p>` : A ? `<button class="btn plein ${PM.peutPayer(N, A.cout) ? 'or' : ''}" data-act="age" ${PM.peutPayer(N, A.cout) ? '' : 'disabled'}>Passer à l’${A.nom.toLowerCase()} — ${coutHtml(A.cout)}</button>` : `<p class="info">Ton peuple a atteint l’${esc(PM.AGES[3].nom.toLowerCase())} : bâtis : ${esc(PM.MERVEILLE.nom)} !</p>`}
        ${N.mineurs.length ? `<h3>${esc(PM.mot('mineurs'))}</h3><div class="chips">${N.mineurs.map(id => { const g = P.mineurs.flat().find(x => x.id === id); return `<span class="chip">${esc(g.nom)} · ${PM.UNITES[g.unite].emoji} ${esc(PM.UNITES[g.unite].nom)}</span>`; }).join('')}</div>` : ''}
        <h3>${esc(PM.mot('pouvoirs'))}</h3>${E.reglages.mythes === false ? '<p class="info">Désactivés dans cette partie.</p>' : pouvoirs}
        ${N.effets.length ? `<h3>Bénédictions en cours</h3><div class="chips">${N.effets.map(e => `<span class="chip">${esc({ attaque: '⚔️ attaque', nourriture: '🌾 nourriture', production: '🏭 production', vitesse: '🏃 vitesse' }[e.cle] || e.cle)} ${e.valeur > 0 ? '+' : ''}${Math.round(e.valeur * 100)} % · ${e.reste} mois</span>`).join('')}</div>` : ''}
        ${N.merveille ? `<h3>${esc(PM.MERVEILLE.nom)}</h3><p class="info">${N.merveille.reste > 0 ? `Chantier à ${esc(E.provinces[N.merveille.prov].nom)} : encore ${N.merveille.reste} mois.` : `Achevée à ${esc(E.provinces[N.merveille.prov].nom)}. Gardée ${N.merveille.garde} / ${PM.MERVEILLE.garde} mois${E.reglages.victoire.merveille !== false ? ' pour la victoire' : ''}.`}</p>` : ''}`;
    } else if (UI.onglet === 'diplo') {
      const autres = E.nations.filter(M => M.id !== n).sort((a, b) => b.vivante - a.vivante || PM.relation(j, n, b.id) - PM.relation(j, n, a.id));
      const maForce = PM.force(j, n) || 1;
      box.innerHTML = `<p class="sous">Ta parole : <b>${Math.round(PM.parole(j, n))}</b>/100 · ta puissance militaire : <b>${fmt(maForce)}</b>. Les terres libres se conquièrent sans guerre.</p>` + autres.map(M => {
        if (!M.vivante) return `<div class="ligne"><div class="nom">${nationChip(M)} <small>disparu de l’histoire</small></div></div>`;
        const rel = PM.relation(j, n, M.id), g = PM.enGuerre(j, n, M.id), al = PM.allies(j, n, M.id), tr = PM.treve(j, n, M.id), f = PM.force(j, M.id);
        const sc = g ? PM.scoreGuerre(j, n, M.id) : 0;
        return `<div class="ligne" style="display:block"><div class="tete"><div class="nom">${nationChip(M)} <small>${PM.PANTHEONS[M.pantheon].emoji} ${PM.PANTHEONS[M.pantheon].nom} · ${esc(PM.majeur(M).nom)} · ${PM.AGES[M.age].court} · ${E.provinces.filter(p => p.owner === M.id).length} provinces · force ${fmt(f)} (${f > maForce * 1.2 ? 'plus forts' : f < maForce * 0.8 ? 'plus faibles' : 'égaux'})</small></div>
            ${g ? '<span class="chip guerre">Guerre</span>' : al ? '<span class="chip allie">Allié</span>' : PM.lies(j, n, M.id) ? '<span class="chip treve">Non-agression</span>' : tr ? '<span class="chip treve">Trêve</span>' : ''}</div>
          <div class="barre-rel"><i style="left:50%;width:${Math.abs(rel) / 2}%;${rel < 0 ? `left:${50 - Math.abs(rel) / 2}%;` : ''}background:${rel < 0 ? 'var(--rouge)' : 'var(--vert)'}"></i></div>
          <small class="sous">Relations ${rel > 0 ? '+' : ''}${Math.round(rel)}${g ? ` · guerre ${sc > 0 ? 'à ton avantage' : sc < 0 ? 'à leur avantage' : 'indécise'} (${sc > 0 ? '+' : ''}${sc})` : ''}</small>
          <div class="chips" style="margin-top:6px">
            ${g ? `<button class="btn petit vert" data-act="d-paix" data-v="${M.id}">Proposer la paix</button>` : `<button class="btn petit rouge" data-act="d-guerre" data-v="${M.id}" ${tr ? 'disabled' : ''}>Déclarer la guerre</button>`}
            ${g ? '' : `<button class="btn petit" data-act="d-alliance" data-v="${M.id}">🤝 Pacte…</button>`}
            <button class="btn petit" data-act="d-tribut" data-v="${M.id}" ${N.res.or < 100 ? 'disabled' : ''}>Offrir 100 🪙</button>
            <button class="btn petit" data-act="d-exiger" data-v="${M.id}">Exiger un tribut</button>
            <button class="btn petit" data-act="d-voir" data-v="${M.id}" title="Voir sur la carte">📍</button></div></div>`;
      }).join('');
    } else if (UI.onglet === 'alliances') box.innerHTML = ongletAlliances();
    else if (UI.onglet === 'armees') {
      const l = E.armees.filter(a => a.owner === n);
      box.innerHTML = `<p class="sous">Population : ${fmt(PM.pop(j, n))} / ${fmt(PM.popMax(j, n))}. Clique une armée puis une province pour la faire marcher.</p>` + (l.length ? l.map(a => `
        <div class="ligne"><div class="nom"><b>${fmt(PM.effectif(a))} soldats</b> à ${esc(E.provinces[a.prov].nom)}<small>${statutArmee(a)}</small></div><button class="btn petit" data-act="sel-armee" data-v="${a.id}">Choisir</button></div>`).join('') : '<p class="info">Aucune armée. Recrute dans une de tes provinces.</p>')
        + `<h3>Classement des peuples</h3><table class="score">${E.nations.filter(M => M.vivante).sort((a, b) => PM.score(j, b.id) - PM.score(j, a.id)).map((M, i) => `<tr><td>${i + 1}</td><td>${nationChip(M)}</td><td>${PM.score(j, M.id)}</td></tr>`).join('')}</table>`;
    } else {
      const l = E.journal.slice().reverse().filter(e => UI.filtre === 'tout' || e.nations.includes(n)).slice(0, 160);
      box.innerHTML = `<div class="filtres"><button class="btn petit ${UI.filtre === 'tout' ? 'actif or' : ''}" data-act="filtre" data-v="tout">Le monde</button><button class="btn petit ${UI.filtre === 'moi' ? 'actif or' : ''}" data-act="filtre" data-v="moi">Mon peuple</button></div>
        <div class="journal">${l.map(e => `<p class="${e.nations.includes(n) ? 'moi' : ''} ${e.type === 'decret' ? 'decret' : ''}"><small>${esc(PM.date(e.mois))}</small>${esc(e.texte)}</p>`).join('') || '<p class="sous">Rien encore.</p>'}</div>`;
    }
    box.scrollTop = haut;
    if (UI.onglet === 'alliances') lierChoixPacte();
  }
  // ---------- alliances ----------
  function ongletAlliances() {
    const j = UI.j, E = j.etat, n = E.joueur, T = PM.TYPES_PACTE, ch = UI.choixPacte = UI.choixPacte || { nation: -1, type: 'defensive' };
    const autres = E.nations.filter(M => M.vivante && M.id !== n);
    if (!autres.some(M => M.id === ch.nation)) ch.nation = (autres[0] || {}).id;
    const parole = PM.parole(j, n), mienne = PM.allianceDe(j, n);
    const membres = p => p.membres.map(m => `<span class="chip"><span class="pastille" style="background:${esc(E.nations[m].couleur)}"></span> ${esc(E.nations[m].nom)}${p.chef === m ? ' ★' : ''}</span>`).join('');
    const guerres = E.guerres.filter(w => w.a === n || w.b === n).map(w => w.a === n ? w.b : w.a);
    const carte = p => {
      const t = T[p.type], autresM = p.membres.filter(m => m !== n);
      const appels = t.rang >= 2 ? guerres.flatMap(e => autresM.filter(m => !PM.enGuerre(j, m, e) && !((PM.guerre(j, n, e).appels || []).includes(m))).map(m => ({ m, e }))) : [];
      return `<div class="dieu"><div class="tete"><b>${t.emoji} ${esc(p.nom)}</b><button class="fermer" data-act="pacte-nom" data-v="${p.id}" title="Renommer">✏️</button></div>
        <p>${t.nom} · depuis ${esc(PM.date(p.debut))}${p.fin ? ' · jusqu’en ' + esc(PM.date(p.fin)) : ''}</p><div class="chips" style="margin:6px 0">${membres(p)}</div><p>${esc(t.desc)}</p>
        <div class="chips" style="margin-top:8px">
          ${appels.map(({ m, e }) => `<button class="btn petit rouge" data-act="pacte-appel" data-v="${m}" data-e="${e}">📯 Appeler ${esc(E.nations[m].nom)} contre ${esc(E.nations[e].nom)}</button>`).join('')}
          ${t.rang >= 2 ? autresM.map(m => `<button class="btn petit" data-act="pacte-soutien" data-v="${m}">🪙 Demander de l’or à ${esc(E.nations[m].nom)}</button>`).join('') : ''}
          ${p.type === 'defensive' && p.membres.length === 2 ? `<button class="btn petit" data-act="pacte-renfort" data-v="${autresM[0]}">⚔️ Proposer une alliance totale</button>` : ''}
          <button class="btn petit" data-act="pacte-quitter" data-v="${p.id}">Quitter</button></div></div>`;
    };
    const cible = E.nations[ch.nation], cibleAlliance = cible ? PM.allianceDe(j, cible.id) : null;
    // ce que donnerait la proposition (même règles que le moteur)
    let apercu = '';
    if (cible) {
      const t = ch.type, cas = t === 'nonagression' ? 'nouveau' : mienne && cibleAlliance === mienne ? 'renfort' : mienne ? 'invitation' : cibleAlliance ? 'adhesion' : 'nouveau';
      const typeReel = cas === 'invitation' ? mienne.type : cas === 'adhesion' ? cibleAlliance.type : t;
      const juge = cas === 'adhesion' ? E.nations[cibleAlliance.chef] : cible;
      const texte = { nouveau: t === 'nonagression' ? `Pacte de non-agression de dix ans avec ${esc(cible.nom)}.` : `Fonder une ${T[t].nom.toLowerCase()} avec ${esc(cible.nom)}.`, renfort: `Changer votre alliance en ${T[t].nom.toLowerCase()}.`,
        invitation: `Inviter ${esc(cible.nom)} dans « ${esc(mienne && mienne.nom)} » (${T[typeReel].nom.toLowerCase()}).`, adhesion: `Demander à entrer dans « ${esc(cibleAlliance && cibleAlliance.nom)} », menée par ${esc(juge.nom)}.` }[cas];
      const avis = PM.avisPacte(j, juge.id, n, typeReel, cas === 'invitation' ? mienne : cas === 'adhesion' ? cibleAlliance : null);
      apercu = `<p class="info">${texte}<br>Accueil attendu chez ${esc(juge.nom)} : <b>${PM.texteAvis(avis)}</b> <small>(${esc(avis.raisons.join(', '))})</small></p>`;
    }
    return `<p class="sous">Ta parole : <b>${Math.round(parole)}</b>/100 ${parole >= 70 ? '— on te fait confiance' : parole < 45 ? '— on se méfie de toi' : ''}. Tenir ses engagements la fait monter ; trahir, abandonner ou refuser un appel la fait chuter.</p>
      <h3>Tes pactes</h3>${PM.pactesDe(j, n).map(carte).join('') || '<p class="info">Aucun pacte. Une alliance défend ses membres ; une alliance totale les fait combattre ensemble.</p>'}
      <h3>Proposer un pacte</h3>
      <div class="champ"><select id="pacteNation" style="flex:1">${autres.map(M => `<option value="${M.id}" ${ch.nation === M.id ? 'selected' : ''}>${esc(M.nom)}${PM.allianceDe(j, M.id) ? ' — ' + esc(PM.allianceDe(j, M.id).nom) : ''}</option>`).join('')}</select></div>
      <div class="champ"><select id="pacteType" style="flex:1">${Object.entries(T).map(([k, t]) => `<option value="${k}" ${ch.type === k ? 'selected' : ''}>${t.emoji} ${t.nom}</option>`).join('')}</select></div>
      ${apercu}<button class="btn or plein" data-act="pacte-proposer">Envoyer la proposition</button>
      <p class="sous" style="margin-top:6px">${esc(T[ch.type].desc)} Une alliance compte ${PM.tailleMaxAlliance(j)} membres au plus ; chaque peuple n’en rejoint qu’une.</p>
      <h3>Les blocs du monde</h3>${PM.pactes(j).filter(p => !p.membres.includes(n)).sort((a, b) => T[b.type].rang - T[a.type].rang || b.membres.length - a.membres.length).map(p => `<div class="ligne" style="display:block"><b>${T[p.type].emoji} ${esc(p.nom)}</b> <small class="sous">${T[p.type].court}</small><div class="chips" style="margin-top:4px">${membres(p)}</div></div>`).join('') || '<p class="sous">Aucun autre pacte pour l’instant.</p>'}`;
  }
  function lierChoixPacte() {
    const a = $('#pacteNation'), b = $('#pacteType'); if (!a) return;
    a.onchange = () => { UI.choixPacte.nation = +a.value; ongletContenu(); };
    b.onchange = () => { UI.choixPacte.type = b.value; ongletContenu(); };
  }
  ACT['pacte-proposer'] = () => { const c = UI.choixPacte; resultat(PM.proposerPacte(UI.j, UI.j.etat.joueur, c.nation, c.type)); };
  ACT['pacte-renfort'] = e => resultat(PM.proposerPacte(UI.j, UI.j.etat.joueur, +e.dataset.v, 'totale'));
  ACT['pacte-appel'] = e => { const r = PM.appelerAuxArmes(UI.j, UI.j.etat.joueur, +e.dataset.v, +e.dataset.e); UI.vuJournal = UI.j.etat.journal.length; resultat(r); if (r.ok) PM.son('guerre'); };
  ACT['pacte-soutien'] = e => resultat(PM.demanderSoutien(UI.j, UI.j.etat.joueur, +e.dataset.v));
  ACT['pacte-quitter'] = e => {
    const p = PM.pacte(UI.j, +e.dataset.v); if (!p) return;
    ouvrirModal(`<h2>Quitter « ${esc(p.nom)} » ?</h2><p class="recit">Les membres t’en voudront, et ta parole baissera — beaucoup si tu les abandonnes en pleine guerre.</p>
      <div class="actions-bas"><button class="btn" data-act="fermer">Rester</button><button class="btn rouge" data-act="pacte-quitter-oui" data-v="${p.id}">Quitter le pacte</button></div>`);
  };
  ACT['pacte-quitter-oui'] = e => { fermerModal(); resultat(PM.quitterPacte(UI.j, UI.j.etat.joueur, +e.dataset.v)); };
  ACT['pacte-nom'] = e => { const p = PM.pacte(UI.j, +e.dataset.v); if (p) demanderNom('Renommer le pacte', p.nom, nom => resultat(PM.renommerPacte(UI.j, UI.j.etat.joueur, p.id, nom))); };

  function statutArmee(a) {
    const E = UI.j.etat, P = E.provinces[a.prov];
    if (a.paralysie) return `💫 figée encore ${a.paralysie} mois`;
    if (a.chemin.length) return `en marche vers ${esc(E.provinces[a.chemin[a.chemin.length - 1]].nom)} (${a.chemin.length} étape${a.chemin.length > 1 ? 's' : ''})`;
    if (P.siege && P.siege.par === a.owner) return `🔥 assiège ${esc(P.nom)} : ${Math.floor(P.siege.progres)} / ${PM.dureeSiege(UI.j, P.id)} mois`;
    return 'au repos';
  }
  ACT.filtre = e => { UI.filtre = e.dataset.v; ongletContenu(); };
  ACT.age = () => resultat(PM.avancerAge(UI.j, UI.j.etat.joueur));
  ACT['d-guerre'] = e => {
    const j = UI.j, E = j.etat, n = E.joueur, M = E.nations[+e.dataset.v], p = PM.pacteEntre(j, n, M.id);
    const defenseurs = PM.pactesDe(j, M.id).filter(x => PM.TYPES_PACTE[x.type].rang >= 2).flatMap(x => x.membres).filter(x => x !== M.id && x !== n && !PM.lies(j, x, n));
    const suivants = PM.pactesDe(j, n).filter(x => x.type === 'totale').flatMap(x => x.membres).filter(x => x !== n && x !== M.id);
    ouvrirModal(`<h2>⚔️ Déclarer la guerre à ${esc(M.nom)} ?</h2>
      ${p ? `<p class="alerte">🗡️ Vous êtes liés par « ${esc(p.nom)} » : ce serait une <b>trahison</b>. Ta parole chuterait de 30 et tous les membres t’en voudraient.</p>` : ''}
      <p class="recit">${defenseurs.length ? `Seront appelés à leur secours : <b>${[...new Set(defenseurs)].map(x => esc(E.nations[x].nom)).join(', ')}</b>.` : 'Aucune alliance ne les protège.'}
      ${suivants.length ? ` Tes alliés totaux seront appelés à te suivre : <b>${[...new Set(suivants)].map(x => esc(E.nations[x].nom)).join(', ')}</b>.` : ''} Les autres peuples te regarderont avec méfiance.</p>
      <div class="actions-bas"><button class="btn" data-act="fermer">Renoncer</button><button class="btn rouge" data-act="d-guerre-oui" data-v="${M.id}">Déclarer la guerre</button></div>`);
  };
  ACT['d-guerre-oui'] = e => { fermerModal(); resultat(PM.declarerGuerre(UI.j, UI.j.etat.joueur, +e.dataset.v)); };
  ACT['d-paix'] = e => resultat(PM.proposerPaix(UI.j, UI.j.etat.joueur, +e.dataset.v));
  ACT['d-alliance'] = e => { UI.choixPacte = Object.assign(UI.choixPacte || { type: 'defensive' }, { nation: +e.dataset.v }); UI.onglet = 'alliances'; onglets(); ongletContenu(); };
  ACT['d-tribut'] = e => resultat(PM.envoyerTribut(UI.j, UI.j.etat.joueur, +e.dataset.v, 100));
  ACT['d-exiger'] = e => resultat(PM.exigerTribut(UI.j, UI.j.etat.joueur, +e.dataset.v));
  ACT['d-voir'] = e => { const M = UI.j.etat.nations[+e.dataset.v]; if (M.capitale >= 0) { vue().centrerSur(M.capitale); selectionnerProvince(M.capitale); } };

  // ---------- pouvoirs (ciblage) ----------
  ACT.pouvoir = e => {
    const j = UI.j, n = j.etat.joueur, pid = e.dataset.v, Pw = PM.POUVOIRS[pid];
    if (Pw.cible === 'aucune') return lancer(pid, -1);
    UI.cible = pid; document.querySelectorAll('#carte, #carte3d').forEach(c => c.classList.add('cible')); UI.rendu.cibleMode = pid;
    const b = $('#bandeauCible'); b.classList.remove('cache');
    b.innerHTML = `${Pw.emoji} ${esc(Pw.nom)} : choisis ${Pw.cible === 'propre' ? 'une de tes provinces' : Pw.cible === 'nation' ? 'une province du peuple visé' : 'une province ennemie'} — <button class="lien" data-act="annuler-cible">annuler (Échap)</button>`;
    void n;
  };
  function lancer(pid, cible) {
    const r = PM.lancerPouvoir(UI.j, UI.j.etat.joueur, pid, cible); annulerCible();
    if (r.ok) { PM.son('pouvoir'); UI.vuJournal = UI.j.etat.journal.length; }
    resultat(r);
  }
  function annulerCible() { UI.cible = null; UI.rendu.cibleMode = null; document.querySelectorAll('#carte, #carte3d').forEach(c => c.classList.remove('cible')); $('#bandeauCible').classList.add('cache'); }
  ACT['annuler-cible'] = annulerCible;

  // ---------- sélection : province ou armée ----------
  function selectionnerProvince(p) { UI.sel = { type: 'province', id: p }; UI.rendu.sel = UI.sel; UI.rendu.majHalo(p); UI.rendu.chemin = null; panneauGauche(); }
  function selectionnerArmee(id) { const a = UI.j.etat.armees.find(x => x.id === id); if (!a) return; UI.sel = { type: 'armee', id }; UI.rendu.sel = UI.sel; UI.rendu.majHalo(a.prov); panneauGauche(); }
  function deselectionner() { UI.sel = null; UI.rendu.sel = null; UI.rendu.majHalo(-1); UI.rendu.chemin = null; $('#gauche').classList.add('cache'); }
  ACT['sel-armee'] = e => { const id = +e.dataset.v, a = UI.j.etat.armees.find(x => x.id === id); if (a) { selectionnerArmee(id); vue().centrerSur(a.prov); } };
  ACT['fermer-sel'] = deselectionner;
  function panneauGauche() {
    if (UI.editeur) return panneauEditeur();
    const g = $('#gauche'), s = UI.sel; if (!s) return g.classList.add('cache');
    g.classList.remove('cache'); const haut = g.scrollTop;
    g.innerHTML = s.type === 'armee' ? panneauArmee(s.id) : panneauProvince(s.id);
    g.scrollTop = haut;
  }
  function panneauProvince(p) {
    const j = UI.j, E = j.etat, n = E.joueur, N = E.nations[n], P = E.provinces[p], O = P.owner >= 0 ? E.nations[P.owner] : null, T = PM.TERRAINS[P.terrain], moi = P.owner === n;
    const prod = PM.productionProvince(j, p), ici = E.armees.filter(a => a.prov === p);
    let h = `<div class="tete">${O ? `<span class="pastille" style="background:${esc(O.couleur)}"></span>` : ''}<h2>${esc(P.nom)}</h2><button class="fermer" data-act="fermer-sel">✕</button></div>
      <div class="sous">${O ? esc(O.nom) + (O.capitale === p ? ' · ★ capitale' : '') : 'Terres libres (tribus)'} · ${T.nom} · niveau <span class="niveau">${'●'.repeat(P.dev)}${'○'.repeat(5 - P.dev)}</span></div>`;
    if (P.siege) h += `<div class="alerte">🔥 Assiégée par ${esc(E.nations[P.siege.par].nom)} : ${Math.floor(P.siege.progres)} / ${PM.dureeSiege(j, p)} mois.</div>`;
    if (P.bouclier > 0) h += `<div class="info">🛡️ Protégée par les dieux encore ${P.bouclier} mois.</div>`;
    if (P.merveille) h += '<div class="info">🗼 Une merveille se dresse ici.</div>';
    h += `<h3>Production par mois</h3><div class="chips">${PM.RESSOURCES.filter(r => prod[r] > 0.05).map(r => `<span class="chip">${PM.ICONES[r]} ${prod[r].toFixed(1).replace('.0', '')}</span>`).join('') || '<span class="sous">rien</span>'}</div>
      <h3>Défense</h3><div class="chips"><span class="chip">🛡️ milice ${fmt(P.garnison)}</span>${T.def ? `<span class="chip">${T.nom} +${Math.round(T.def * 100)} %</span>` : ''}${P.bat.remparts ? '<span class="chip">🧱 remparts +50 %</span>' : ''}</div>`;
    if (moi) {
      h += `<h3>Bâtiments</h3>${Object.entries(PM.BATIMENTS).map(([b, B]) => { const c = PM.coutBatiment(j, n, b), age = (B.age || 0) > N.age;
        return `<div class="ligne"><span>${B.icone}</span><div class="nom">${B.nom}<small>${esc(B.desc)}</small></div>${P.bat[b] ? '<span class="chip allie">✓</span>' : `<button class="btn petit" data-act="construire" data-v="${b}" ${age || !PM.peutPayer(N, c) ? 'disabled' : ''} title="${age ? 'Âge ' + PM.AGES[B.age].court : ''}">${age ? '🔒 ' + PM.AGES[B.age].court : coutHtml(c)}</button>`}</div>`; }).join('')}`;
      if (N.age >= PM.MERVEILLE.age && !P.merveille && !N.merveille) { const c = PM.coutBatiment(j, n, 'merveille'); h += `<div class="ligne"><span>🗼</span><div class="nom">${esc(PM.MERVEILLE.nom)}<small>${esc(PM.MERVEILLE.desc)}</small></div><button class="btn petit or" data-act="construire" data-v="merveille" ${PM.peutPayer(N, c) ? '' : 'disabled'}>${coutHtml(c)}</button></div>`; }
      if (P.dev < 5) { const c = PM.coutDev(j, p); h += `<button class="btn plein" style="margin-top:8px" data-act="developper" ${PM.peutPayer(N, c) ? '' : 'disabled'}>⭐ Développer au niveau ${P.dev + 1} — ${coutHtml(c)}</button>`; }
      h += `<h3>Recruter <small class="sous">(👥 ${fmt(PM.pop(j, n))}/${fmt(PM.popMax(j, n))})</small></h3>${PM.unitesDispo(j, n).map(id => { const u = PM.UNITES[id], c = PM.coutUnite(j, n, id), ok = PM.peutPayer(N, c);
        return `<div class="unite"><div class="em">${u.emoji}</div><div><b>${esc(u.nom)}</b> <small>${PM.CATEGORIES[u.cat]} · ⚔ ${u.att} · ❤ ${u.pv} · 👥 ${u.pop}${u.vitesse && u.vitesse !== 1 ? ' · 🏃 ' + u.vitesse : ''}</small><small>${coutHtml(c)}</small></div>
          <div class="boutons">${[1, 5, 10].map(k => `<button class="btn petit" data-act="recruter" data-v="${id}" data-k="${k}" ${PM.peutPayer(N, c, k) ? '' : 'disabled'}>+${k}</button>`).join('')}</div></div>${ok ? '' : ''}`; }).join('')}`;
    } else if (O) {
      const g = PM.enGuerre(j, n, O.id);
      h += `<h3>Diplomatie</h3><p class="sous">Relations ${Math.round(PM.relation(j, n, O.id))} · ${g ? '<span class="chip guerre">en guerre</span>' : PM.allies(j, n, O.id) ? '<span class="chip allie">allié</span>' : 'en paix'}</p>
        ${g ? '' : `<button class="btn petit rouge" data-act="d-guerre" data-v="${O.id}" ${PM.treve(j, n, O.id) ? 'disabled' : ''}>Déclarer la guerre</button>`}`;
    } else h += '<p class="info">Envoie une armée plus forte que la milice pour soumettre ces tribus : elles n’appartiennent à personne.</p>';
    const miennesAilleurs = E.armees.filter(a => a.owner === n && a.prov !== p && !a.paralysie);
    if (!moi && miennesAilleurs.length && PM.passable(j, n, p)) h += `<h3>Envoyer une armée</h3>${miennesAilleurs.slice(0, 6).map(a => `<div class="ligne"><div class="nom">${fmt(PM.effectif(a))} soldats à ${esc(E.provinces[a.prov].nom)}</div><button class="btn petit or" data-act="envoyer" data-v="${a.id}" data-p="${p}">Marcher</button></div>`).join('')}`;
    if (ici.length) h += `<h3>Armées ici</h3>${ici.map(a => `<div class="ligne"><span class="pastille" style="background:${esc(E.nations[a.owner].couleur)}"></span><div class="nom">${fmt(PM.effectif(a))} soldats · ${esc(E.nations[a.owner].nom)}<small>${resumeUnites(a)}</small></div><button class="btn petit" data-act="sel-armee" data-v="${a.id}">Voir</button></div>`).join('')}`;
    if (moi && ici.filter(a => a.owner === n && !a.chemin.length).length > 1) h += `<button class="btn plein" style="margin-top:6px" data-act="regrouper" data-v="${p}">Regrouper mes armées</button>`;
    return h;
  }
  const resumeUnites = a => Object.entries(a.unites).map(([u, c]) => `${PM.UNITES[u].emoji}${Math.max(1, Math.round(c))}`).join(' ');
  function panneauArmee(id) {
    const j = UI.j, E = j.etat, a = E.armees.find(x => x.id === id); if (!a) { UI.sel = null; return ''; }
    const N = E.nations[a.owner], moi = a.owner === E.joueur;
    return `<div class="tete"><span class="pastille" style="background:${esc(N.couleur)}"></span><h2>Armée${moi ? '' : ' de ' + esc(N.nom)}</h2><button class="fermer" data-act="fermer-sel">✕</button></div>
      <div class="sous">à ${esc(E.provinces[a.prov].nom)} · ${statutArmee(a)}</div>
      <h3>Troupes</h3>${Object.entries(a.unites).sort((x, y) => y[1] - x[1]).map(([u, c]) => { const U = PM.UNITES[u]; return `<div class="unite"><div class="em">${U.emoji}</div><div><b>${esc(U.nom)}</b><small>${PM.CATEGORIES[U.cat]} · ⚔ ${U.att} · ❤ ${U.pv}</small></div><b>× ${Math.max(1, Math.round(c))}</b></div>`; }).join('')}
      <div class="chips" style="margin-top:8px"><span class="chip">💪 force ${fmt(PM.puissance(a))}</span><span class="chip">🏃 vitesse ${PM.vitesse(j, a).toFixed(1)}</span><span class="chip">👥 ${fmt(PM.popArmee(a))}</span></div>
      ${moi ? `<p class="info">Clique une province (ou clic droit) pour y marcher. Les terres hostiles s’assiègent : reste sur place jusqu’à la prise.</p>
      <div class="chips"><button class="btn petit" data-act="scinder" data-v="${a.id}">Diviser en deux</button>${a.chemin.length ? `<button class="btn petit" data-act="arreter" data-v="${a.id}">Arrêter</button>` : ''}<button class="btn petit" data-act="centrer" data-v="${a.prov}">📍 Centrer</button><button class="btn petit rouge" data-act="dissoudre" data-v="${a.id}">Renvoyer</button></div>` : ''}`;
  }
  ACT.construire = e => resultat(PM.construire(UI.j, UI.j.etat.joueur, UI.sel.id, e.dataset.v));
  ACT.developper = () => resultat(PM.developper(UI.j, UI.j.etat.joueur, UI.sel.id));
  ACT.recruter = e => resultat(PM.recruter(UI.j, UI.j.etat.joueur, UI.sel.id, e.dataset.v, +e.dataset.k));
  ACT.regrouper = e => { const r = PM.regrouper(UI.j, UI.j.etat.joueur, +e.dataset.v); resultat(r); };
  ACT.envoyer = e => { const r = PM.ordonner(UI.j, +e.dataset.v, +e.dataset.p); resultat(r); };
  ACT.scinder = e => { const r = PM.scinder(UI.j, +e.dataset.v); resultat(r); };
  ACT.arreter = e => { const a = UI.j.etat.armees.find(x => x.id === +e.dataset.v); if (a) { a.chemin = []; rafraichir(); } };
  ACT.centrer = e => vue().centrerSur(+e.dataset.v);
  ACT.dissoudre = e => { const r = PM.dissoudre(UI.j, +e.dataset.v); deselectionner(); resultat(r); };

  function rafraichir() {
    if (!UI.j) return;
    barre();
    if (UI.editeur) return;
    if (UI.sel) panneauGauche();
    const f = document.activeElement; if (!f || !f.matches('input, select, textarea') || !$('#droite').contains(f)) ongletContenu();
    UI.rendu.dirty = true;
  }

  // ---------- souris, trackpad, clavier ----------
  function evenementsCarte(cv) {
    let bas = null, glisse = false, peint = new Set(), der = null;
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { bas = { ...pos(e), b: e.button }; der = pos(e); glisse = false; peint = new Set(); cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => {
      const p = pos(e); if (!UI.j) return;
      const prov = vue().provinceA(p.x, p.y);
      if (prov !== UI.rendu.survol) {
        UI.rendu.survol = prov;
        if (UI.sel && UI.sel.type === 'armee' && prov >= 0 && !bas) { const a = UI.j.etat.armees.find(x => x.id === UI.sel.id); UI.rendu.chemin = a && a.owner === UI.j.etat.joueur && prov !== a.prov ? (c => c ? [a.prov, ...c] : null)(PM.chemin(UI.j, a.owner, a.prov, prov)) : null; }
      }
      if (!bas) return;
      // éditeur : glisser peint les frontières (clic gauche)
      if (UI.editeur && UI.editeur.outil === 'peindre' && bas.b === 0) { if (prov >= 0 && !peint.has(prov)) { peint.add(prov); appliquerOutil(prov, true); } glisse = true; return; }
      if (Math.abs(p.x - bas.x) + Math.abs(p.y - bas.y) > 5) glisse = true;
      if (glisse) { vue().deplacer(p.x - der.x, p.y - der.y); der = p; cv.classList.add('glisse'); }
    });
    cv.addEventListener('pointerup', e => {
      const p = pos(e), b = bas; bas = null; cv.classList.remove('glisse');
      if (!b || !UI.j) return;
      if (UI.editeur && UI.editeur.outil === 'peindre' && glisse) { panneauEditeur(); return; }
      if (glisse) return;
      clic(p.x, p.y, b.b === 2 || e.ctrlKey);
    });
    cv.addEventListener('dblclick', e => { const p = pos(e); vue().zoomer(1.8, p.x, p.y); });
    cv.addEventListener('wheel', e => {
      e.preventDefault(); const p = pos(e);
      if (e.ctrlKey) vue().zoomer(Math.exp(-e.deltaY * 0.012), p.x, p.y);
      else if (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 40 && e.deltaX === 0 && Number.isInteger(e.deltaY))) vue().zoomer(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
      else vue().deplacer(-e.deltaX, -e.deltaY);
    }, { passive: false });
    window.addEventListener('resize', () => { if (UI.rendu) UI.rendu.dirty = true; });
  }
  function clic(x, y, droit) {
    const j = UI.j, E = j.etat, prov = vue().provinceA(x, y);
    if (UI.editeur) { if (prov >= 0) appliquerOutil(prov, false); return; }
    if (UI.cible) {
      if (prov < 0) return;
      const Pw = PM.POUVOIRS[UI.cible];
      return lancer(UI.cible, Pw.cible === 'nation' ? E.provinces[prov].owner : prov);
    }
    const aid = vue().armeeA(x, y);
    const armeeSel = UI.sel && UI.sel.type === 'armee' ? E.armees.find(a => a.id === UI.sel.id) : null;
    if (armeeSel && armeeSel.owner === E.joueur && prov >= 0 && (droit || (aid == null && prov !== armeeSel.prov))) {
      const r = PM.ordonner(j, armeeSel.id, prov); UI.rendu.chemin = null; resultat(r); if (r.ok) PM.son('clic'); return;
    }
    if (aid != null) { selectionnerArmee(aid); PM.son('clic'); return; }
    if (prov >= 0) { selectionnerProvince(prov); PM.son('clic'); } else deselectionner();
  }
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) { if (e.key === 'Escape') e.target.blur(); return; }
    if (UI.ecran !== 'jeu' || !UI.j) return;
    if (modalOuvert()) { if (e.key === 'Escape' && $('#modalBoite [data-act=fermer]')) fermerModal(); return; }
    const k = e.key;
    if (k === ' ') { e.preventDefault(); if (!UI.editeur) reglerVitesse(UI.vitesse ? 0 : (UI.derniereVitesse || 1)); }
    else if (['1', '2', '3'].includes(k) && !UI.editeur) reglerVitesse(+k);
    else if (k === 'Escape') { if (UI.cible) annulerCible(); else deselectionner(); }
    else if (k === '+' || k === '=') vue().zoomer(1.2, innerWidth / 2, innerHeight / 2);
    else if (k === '-') vue().zoomer(1 / 1.2, innerWidth / 2, innerHeight / 2);
    else if (k === 'c' || k === 'C') vue().centrerSur(UI.j.etat.nations[UI.j.etat.joueur].capitale);
    else if (k === 'ArrowLeft' || k === 'a' || k === 'A') vue().deplacer(60, 0); else if (k === 'ArrowRight' || k === 'd' || k === 'D') vue().deplacer(-60, 0);
    else if (k === 'ArrowUp' || k === 'w' || k === 'W') vue().deplacer(0, 60); else if (k === 'ArrowDown' || k === 's' || k === 'S') vue().deplacer(0, -60);
    else if ((k === 'q' || k === 'Q') && vue().tourner) vue().tourner(-0.25); else if ((k === 'e' || k === 'E') && vue().tourner) vue().tourner(0.25);
    else if (k === 'v' || k === 'V') ACT.vue();
    else if (k === 'Enter') { e.preventDefault(); $('#decretTexte').focus(); }
    if (UI.vitesse) UI.derniereVitesse = UI.vitesse;
  });

  // ---------- décrets ----------
  $('#decret').addEventListener('submit', async e => {
    e.preventDefault(); if (!UI.j || UI.decretEnCours) return;
    const t = $('#decretTexte').value.trim(); if (!t) return;
    const ia = UI.oracle.actif && UI.oracle.installee && G.paxIA ? m => G.paxIA.ecrire(m) : null;
    UI.decretEnCours = true; $('#decret').classList.add('attente'); $('#decretBouton').innerHTML = ia ? '<span class="attente-ia"></span> L’oracle médite…' : 'Proclamer';
    try {
      const r = await PM.decret(UI.j, UI.j.etat.joueur, t, ia);
      UI.vuJournal = UI.j.etat.journal.length;
      const s = signature(); if (s !== UI.signature) { UI.signature = s; UI.rendu.majProprietaires(); }
      $('#decretTexte').value = ''; ajusterDecret();
      const ok = r.resultats.filter(x => x.ok).length;
      PM.son(ok ? 'evenement' : 'refus');
      ouvrirModal(`<h2>📜 Décret de ${esc(UI.j.etat.nations[UI.j.etat.joueur].nom)}</h2><p class="sous">« ${esc(t)} »</p><p class="recit">${esc(r.recit)}</p>
        ${r.reactions.map(x => `<p class="info">💬 <b>${esc(x.nation)}</b> : ${esc(x.texte)}</p>`).join('')}
        <div>${r.resultats.map(x => `<p class="${x.ok ? 'info' : 'alerte'}">${x.ok ? '✓' : '✗'} ${esc(x.message)}</p>`).join('')}</div>
        <p class="sous">${r.source === 'oracle' ? '🔮 Interprété par l’oracle (IA du Mac).' : 'Lu par les conseillers (mots-clés).' + (G.paxIA && !UI.oracle.installee ? ' Installe l’oracle dans les réglages pour des décrets plus libres.' : '')}</p>
        <div class="actions-bas"><button class="btn or" data-act="fermer">Continuer</button></div>`);
      rafraichir();
    } finally { UI.decretEnCours = false; $('#decret').classList.remove('attente'); $('#decretBouton').textContent = 'Proclamer'; }
  });
  function ajusterDecret() { const t = $('#decretTexte'); t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
  $('#decretTexte').addEventListener('input', ajusterDecret);
  $('#decretTexte').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#decret').requestSubmit(); } });

  // ---------- menu, sauvegardes ----------
  ACT.menu = () => ouvrirModal(`<h2>☰ ${esc(UI.j.etat.nations[UI.j.etat.joueur].nom)}</h2><p class="sous">${esc(PM.date(UI.j.etat.mois))} · graine du monde ${UI.j.etat.reglages.graine}</p>
    <div class="choix"><button class="btn or" data-act="fermer">Reprendre</button><button class="btn" data-act="sauver">Enregistrer la partie…</button><button class="btn" data-act="charger">Charger une partie</button>
    <button class="btn" data-act="exporter">Exporter dans un fichier…</button><button class="btn" data-act="reglages">Réglages et oracle</button><button class="btn" data-act="aide">Comment jouer</button><button class="btn" data-act="quitter">Menu principal</button></div>`);
  function sauverAuto() { if (!UI.j || UI.editeur) return; const E = UI.j.etat; ecrire('pm:auto', { nation: E.nations[E.joueur].nom, mois: E.mois, etat: E }); }
  ACT.quitter = () => { sauverAuto(); fermerModal(); accueil(); };
  ACT.accueil = () => { if (UI.j && !UI.editeur && !UI.j.etat.fin) sauverAuto(); fermerModal(); accueil(); };
  ACT.fermer = fermerModal;
  function demanderNom(titre, defaut, suite) {
    ouvrirModal(`<h2>${esc(titre)}</h2><div class="champ"><input type="text" id="nomSaisi" maxlength="40" value="${esc(defaut)}" style="flex:1"></div>
      <div class="actions-bas"><button class="btn" data-act="fermer">Annuler</button><button class="btn or" id="nomOk">Enregistrer</button></div>`);
    const i = $('#nomSaisi'); i.focus(); i.select();
    const ok = () => { const v = i.value.trim(); if (!v) return; fermerModal(); suite(v); };
    $('#nomOk').onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); };
  }
  ACT.sauver = () => { const E = UI.j.etat; demanderNom('Enregistrer la partie', `${E.nations[E.joueur].nom} — ${PM.date(E.mois)}`, nom => {
    const l = lire('pm:parties', []); l.unshift({ nom, date: Date.now(), mois: E.mois, nation: E.nations[E.joueur].nom, etat: E }); if (ecrire('pm:parties', l.slice(0, 12))) toast('Partie enregistrée.', 'ok');
  }); };
  ACT.charger = () => {
    const l = lire('pm:parties', []);
    ouvrirModal(`<h2>Charger une partie</h2>${l.length ? l.map((s, i) => `<div class="ligne"><div class="nom"><b>${esc(s.nom)}</b><small>${esc(s.nation)} · ${esc(PM.date(s.mois))} · ${new Date(s.date).toLocaleString('fr-FR')}</small></div><button class="btn petit or" data-act="charger-une" data-v="${i}">Charger</button><button class="btn petit" data-act="suppr-partie" data-v="${i}">✕</button></div>`).join('') : '<p class="sous">Aucune partie enregistrée.</p>'}
      <div class="actions-bas"><button class="btn" data-act="fermer">Fermer</button></div>`);
  };
  function charger(etat) { try { fermerModal(); lancerPartie(PM.charger(JSON.parse(JSON.stringify(etat)))); toast('Partie chargée : ' + PM.date(etat.mois), 'ok'); } catch (er) { toast('Partie illisible : ' + er.message, 'ko'); } }
  ACT['charger-une'] = e => { const s = lire('pm:parties', [])[+e.dataset.v]; if (s) charger(s.etat); };
  ACT['suppr-partie'] = e => { const l = lire('pm:parties', []); l.splice(+e.dataset.v, 1); ecrire('pm:parties', l); ACT.charger(); };
  ACT.continuer = () => { const a = lire('pm:auto', null); if (a) charger(a.etat); };
  ACT.exporter = () => {
    const E = UI.j.etat, b = new Blob([JSON.stringify(E)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `pax-mythica-${PM.norm(E.nations[E.joueur].nom).replace(/ /g, '-')}-an${Math.floor(E.mois / 12) + 1}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); fermerModal();
  };
  ACT.importer = () => $('#fichierImport').click();
  $('#fichierImport').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { try { const etat = JSON.parse(r.result); if (!etat || !Array.isArray(etat.provinces) || !etat.reglages) throw new Error('fichier inconnu'); charger(etat); } catch (er) { toast('Fichier illisible : ' + er.message, 'ko'); } };
    r.readAsText(f); e.target.value = '';
  });

  // ---------- réglages et oracle ----------
  ACT.reglages = async () => {
    const s = PM.reglagesSon(), ia = G.paxIA; let etat = null;
    if (ia) { try { etat = await ia.etat(); UI.oracle.installee = !!etat.installee; } catch (e) { etat = null; } }
    ouvrirModal(`<h2>Réglages</h2>
      <h3>Son</h3>
      <div class="champ"><label>Effets sonores</label><input type="checkbox" id="rSons" ${s.sons ? 'checked' : ''}></div>
      <div class="champ"><label>Musique (lyre)</label><input type="checkbox" id="rMusique" ${s.musique ? 'checked' : ''}></div>
      <div class="champ"><label>Volume</label><input type="range" id="rVolume" min="0" max="100" value="${Math.round(s.volume * 100)}"></div>
      ${PM.vue3dPossible && PM.vue3dPossible() ? `<h3>Image</h3><p class="sous">Pack : <b>${esc(PM.PACKS_GRAPHIQUES[PM.packGraphique()].nom)}</b> · qualité ${esc(PM.QUALITES[PM.qualite()].nom.toLowerCase())}</p><button class="btn petit" data-act="packs">Packs graphiques et qualité…</button>` : ''}
      <h3>Oracle (IA du Mac)</h3>
      ${!ia ? '<p class="info">L’oracle n’existe que dans l’application Mac. Les décrets sont lus par mots-clés.</p>'
        : etat && etat.installee ? `<p class="info">🔮 L’oracle est installé : il comprend les décrets écrits librement et raconte leurs conséquences. Tout reste sur ton Mac.</p>
          <div class="champ"><label>Utiliser l’oracle</label><input type="checkbox" id="rOracle" ${UI.oracle.actif ? 'checked' : ''}></div>`
        : `<p class="info">L’oracle est une IA qui tourne sur ton Mac (sans internet une fois installée). Il comprend les décrets écrits librement, comme dans Pax Historia. Téléchargement unique d’environ ${etat ? etat.mo : 2500} Mo, partagé avec QuentMovie et tes autres outils.</p>
          <button class="btn or" id="rInstaller">Installer l’oracle</button><div class="progression" style="margin-top:8px"><i id="rProg" style="width:0"></i></div><p class="sous" id="rProgT"></p>`}
      <h3>Mises à jour</h3><p class="sous" id="rMaj">${G.paxMaj ? 'Recherche…' : 'Version en ligne.'}</p>
      ${G.paxMaj ? '<p class="sous">Les nouvelles versions se téléchargent seules (au démarrage puis toutes les 6 heures) et s’installent à la fermeture.</p><button class="btn petit" data-act="maj-chercher">Rechercher maintenant</button>' : ''}
      <div class="actions-bas"><button class="btn or" data-act="fermer">Fermer</button></div>`);
    $('#rSons').onchange = e => PM.changerSon('sons', e.target.checked);
    $('#rMusique').onchange = e => PM.changerSon('musique', e.target.checked);
    $('#rVolume').oninput = e => PM.changerSon('volume', +e.target.value / 100);
    const o = $('#rOracle'); if (o) o.onchange = e => { UI.oracle.actif = e.target.checked; try { localStorage.setItem('pm:oracle', e.target.checked ? 'oui' : 'non'); } catch (er) { /* sans stockage */ } };
    const b = $('#rInstaller'); if (b) b.onclick = async () => {
      b.disabled = true; $('#rProgT').textContent = 'Téléchargement…';
      try { await ia.installer(p => { $('#rProg').style.width = Math.round(p * 100) + '%'; $('#rProgT').textContent = Math.round(p * 100) + ' %'; }); UI.oracle.installee = true; toast('L’oracle est prêt.', 'ok'); ACT.reglages(); }
      catch (er) { $('#rProgT').textContent = 'Échec : ' + er.message; b.disabled = false; }
    };
    if (G.paxMaj) majTexte(await G.paxMaj.etat());
  };
  function majTexte(e) {
    const el = $('#rMaj'); if (!el || !e) return;
    const t = { inactif: 'Mises à jour automatiques actives dans l’application installée.', rien: 'Recherche au démarrage.', recherche: 'Recherche d’une nouvelle version…', 'a-jour': `Pax Mythica ${e.version} est à jour.`, telechargement: `Téléchargement de la version ${e.nouvelle} : ${e.progres} %`, installation: 'Préparation de la mise à jour…', erreur: 'Mise à jour impossible : ' + e.erreur }[e.etat];
    el.innerHTML = e.etat === 'pret' ? `Version ${esc(e.nouvelle)} prête. <button class="btn petit or" data-act="maj-installer">Redémarrer pour installer</button>` : esc(t || '');
  }
  // ---------- packs graphiques et qualité de l'image ----------
  ACT.packs = () => {
    const pack = PM.packGraphique(), q = PM.qualite();
    ouvrirModal(`<h2>🎨 Packs graphiques</h2><p class="sous">Lumière, saison, ciel, mer et style de l’image de la vue 3D. Le changement est immédiat.</p>
      <div class="cartes">${Object.entries(PM.PACKS_GRAPHIQUES).map(([id, P]) => `<button class="carte-choix ${id === pack ? 'choisie' : ''}" data-act="pack-choisir" data-v="${id}"><div class="em">${P.emoji}</div><h3>${esc(P.nom)}</h3><p>${esc(P.desc)}</p></button>`).join('')}</div>
      <h3 style="margin-top:18px">Qualité de l’image</h3>
      <div class="outils">${Object.entries(PM.QUALITES).map(([id, Q]) => `<button class="btn petit ${id === q ? 'actif' : ''}" data-act="qualite-choisir" data-v="${id}" title="${esc(Q.desc)}">${esc(Q.nom)}</button>`).join('')}</div>
      <p class="sous">${esc(PM.QUALITES[q].desc)}</p>
      <div class="actions-bas"><button class="btn or" data-act="fermer">Fermer</button></div>`, true);
  };
  ACT['pack-choisir'] = e => { PM.choisirPack(e.dataset.v); if (UI.vue3d && UI.j) UI.vue3d.appliquerPack(e.dataset.v); ACT.packs(); };
  ACT['qualite-choisir'] = e => { PM.choisirQualite(e.dataset.v); if (UI.vue3d && UI.j) UI.vue3d.appliquerQualite(e.dataset.v); ACT.packs(); };
  ACT['maj-installer'] = () => G.paxMaj && G.paxMaj.installer();
  ACT['maj-plus-tard'] = () => { $('#bandeauMaj').classList.add('cache'); UI.majCachee = true; };
  // une nouvelle version téléchargée en arrière-plan : on le dit, sans interrompre la partie
  function bandeauMaj(e) {
    const b = $('#bandeauMaj'); if (!b || !e || e.etat !== 'pret' || UI.majCachee) return;
    b.innerHTML = `<b>🆕 Pax Mythica ${esc(e.nouvelle)} est prête</b><p>${esc(String(e.notes || '').replace(/\r/g, '').slice(0, 600))}</p>
      <div class="chips"><button class="btn petit or" data-act="maj-installer">Redémarrer pour installer</button><button class="btn petit" data-act="maj-plus-tard">À la fermeture</button></div>`;
    b.classList.remove('cache');
  }
  UI.bandeauMaj = bandeauMaj;
  ACT['maj-chercher'] = async () => { if (!G.paxMaj) return toast('Les mises à jour se font dans l’application Mac.'); toast('Recherche d’une nouvelle version…'); const e = await G.paxMaj.verifier(); setTimeout(async () => { const x = await G.paxMaj.etat(); majTexte(x); bandeauMaj(x); if (x.etat === 'a-jour') toast(`Pax Mythica ${x.version} est à jour.`, 'ok'); else if (x.etat === 'erreur') toast('Mise à jour impossible : ' + x.erreur, 'ko'); }, 4000); void e; };

  ACT.aide = () => ouvrirModal(`<h2>Comment jouer</h2><div class="aide">
    <h3>Le but</h3><ul><li><b>Conquête</b> : soumettre tous les peuples (ou les trois quarts du monde).</li><li><b>Merveille</b> : à l’âge mythique, bâtir une merveille et la garder 5 ans.</li><li>Ou le meilleur score si une limite de temps est fixée.</li></ul>
    <h3>Ton peuple</h3><ul><li>Chaque province produit 🌾 nourriture, 🪵 bois, 🪙 or ; les temples donnent ✨ la faveur des dieux.</li>
      <li>Construis (fermes, bûcherons, mines, temples, remparts) et développe tes provinces : elles produisent plus et nourrissent plus de soldats (👥).</li>
      <li>Passe les <b>âges</b> (classique, héroïque, mythique) : à chaque âge, un dieu mineur t’offre une créature et un pouvoir.</li></ul>
    <h3>La guerre</h3><ul><li>Clique ton armée, puis une province : elle y marche. Clic droit aussi.</li>
      <li>Dans une province hostile, l’armée combat la milice puis l’assiège (plus long avec des remparts, plus court avec des engins de siège).</li>
      <li>Les contres : infanterie > cavalerie > archers > infanterie ; les héros écrasent les créatures, les créatures écrasent les humains.</li>
      <li>Les terres libres (hachurées) se prennent sans déclarer de guerre.</li></ul>
    <h3>Les alliances</h3><ul><li><b>Pacte de non-agression</b> (10 ans) : promesse de ne pas s’attaquer. <b>Alliance défensive</b> : les membres défendent celui qui est attaqué. <b>Alliance totale</b> : ils combattent ensemble dans toutes leurs guerres.</li>
      <li>Chaque peuple n’appartient qu’à une alliance : invite d’autres peuples dans la tienne, ou demande à entrer dans la leur (onglet 🤝 Alliances). L’accueil attendu est affiché avant d’envoyer.</li>
      <li>Ta <b>parole</b> compte : trahir un allié (lui déclarer la guerre), refuser un appel aux armes ou abandonner une alliance en guerre la fait chuter, et plus personne ne voudra s’allier à toi.</li>
      <li>Quand le chef d’un camp signe la paix, les alliés venus pour lui la signent aussi.</li></ul>
    <h3>Les dieux</h3><ul><li>Les pouvoirs coûtent de la faveur puis se rechargent : foudre, séisme, météores, invocations, bénédictions…</li></ul>
    <h3>Les décrets</h3><ul><li>Écris en français ce que fait ton peuple : « déclarer la guerre à … », « lever 10 archers à … », « construire des remparts à … », « proposer une alliance à … », « pacte de non-agression avec … », « appeler … aux armes contre … », « invoquer la foudre sur … », « prier les dieux », « organiser des jeux », « renommer … en … ».</li>
      <li>Avec l’oracle (IA du Mac, dans les réglages), tu peux écrire librement : il raconte et applique ce qui est possible.</li></ul>
    <h3>Raccourcis</h3><ul><li><kbd>Espace</kbd> pause · <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> vitesse · <kbd>Entrée</kbd> écrire un décret · <kbd>C</kbd> capitale · <kbd>Échap</kbd> annuler · molette ou pincement : zoom · deux doigts : déplacer</li></ul>
  </div><div class="actions-bas"><button class="btn or" data-act="fermer">Compris</button></div>`, true);

  // ---------- délégation des clics ----------
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
    const f = ACT[b.dataset.act]; if (f) { e.preventDefault(); f(b); }
  });
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && $('#modalBoite [data-act=fermer]')) fermerModal(); });
  window.addEventListener('beforeunload', () => { if (UI.j && !UI.editeur && UI.ecran === 'jeu') sauverAuto(); });

  // démarrage
  if (G.paxMaj) { G.paxMaj.surChangement(e => { majTexte(e); bandeauMaj(e); }); G.paxMaj.etat().then(e => { if (e && e.version) $('#versionApp').textContent = 'Version ' + e.version; bandeauMaj(e); }).catch(() => {}); }
  if (G.paxIA) G.paxIA.etat().then(e => { UI.oracle.installee = !!(e && e.installee); }).catch(() => {});
  UI.ACT = ACT; UI.rafraichir = rafraichir; UI.selectionnerProvince = selectionnerProvince; UI.lancerPartie = lancerPartie; UI.unMois = unMois; UI.accueil = accueil; UI.ouvrirEditeur = ouvrirEditeur; UI.verifierAttente = verifierAttente; UI.fermerModal = fermerModal; UI.ouvrirModal = ouvrirModal; UI.toast = toast; UI.montrer = montrer; UI.modalOuvert = modalOuvert;
  accueil();
})(window);
