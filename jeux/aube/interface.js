'use strict';
/* Aube des Nations — interface : entrées (souris, trackpad, tactile, clavier), panneaux, fenêtres, sauvegarde. */

const CLE_PARTIE = 'aube-des-nations:partie';
const CLE_PREFS = 'aube-des-nations:prefs';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function lire(cle) { try { return localStorage.getItem(cle); } catch (e) { return null; } }
function ecrire(cle, val) { try { localStorage.setItem(cle, val); return true; } catch (e) { return false; } }

const Prefs = Object.assign({ grille: false, survol: true, autoCycle: true, reduit: false, qualite: 'haute' }, (() => { try { return JSON.parse(lire(CLE_PREFS)) || {}; } catch (e) { return {}; } })());
try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) Prefs.reduit = true; } catch (e) { /* rien */ }
const garderPrefs = () => ecrire(CLE_PREFS, JSON.stringify(Prefs));

const UI = {
  sel: null, res: null, cible: -1, ville: null, modeTir: null, vuJ: 0, occupe: false, titre: true,
  pts: new Map(), glisse: false, pince: null, appui: null, survolT: null, dissoudre: false,
  reglage: { civ: 'gaulois', taille: 'normale', type: 'continents', difficulte: 'normal', vitesse: 'normale' },
};

/* ---------- Petits outils ---------- */
const selU = () => (UI.sel !== null ? G.unites.find(u => u.id === UI.sel) || null : null);
const mienne = u => u && u.civ === G.joueur;
const fmtMv = mv => { const e = Math.floor(mv / 3), r = mv % 3; return (e || !r ? String(e) : '') + (r === 1 ? '⅓' : r === 2 ? '⅔' : ''); };
const signe = n => (n >= 0 ? '+' : '') + n;
const toursRestants = (reste, parTour) => (parTour > 0 ? Math.max(1, Math.ceil(reste / parTour)) : '∞');
function texteFort(U) {
  const t = [];
  if (U.f) t.push(`⚔️ ${U.f}`);
  if (U.t) t.push(`🏹 ${U.t} (portée ${U.portee})`);
  t.push(`👣 ${U.mv}`);
  return t.join(' · ');
}
function descBat(B) {
  const t = [];
  if (B.n) t.push(`+${B.n} nourriture`); if (B.p) t.push(`+${B.p} production`); if (B.o) t.push(`+${B.o} or`);
  if (B.s) t.push(`+${B.s} science`); if (B.c) t.push(`+${B.c} culture`); if (B.bonheur) t.push(`+${B.bonheur} bonheur`);
  if (B.pctP) t.push(`+${B.pctP} % production`); if (B.pctO) t.push(`+${B.pctO} % or`); if (B.pctS) t.push(`+${B.pctS} % science`);
  if (B.def) t.push(`défense +${B.def}`); if (B.pv) t.push(`+${B.pv} PV`);
  if (B.desc) t.push(B.desc);
  if (B.ent) t.push(`entretien ${B.ent} or`);
  return t.join(' · ');
}

/* ---------- Notifications ---------- */
function toast(txt, i, ton) {
  const b = document.createElement('button');
  b.className = 'toast ' + (ton || '');
  b.textContent = txt;
  if (i !== null && i !== undefined) b.addEventListener('click', () => { centrerSur(i); b.remove(); });
  else b.addEventListener('click', () => b.remove());
  const boite = $('#notifs');
  boite.appendChild(b);
  while (boite.children.length > 5) boite.firstChild.remove();
  setTimeout(() => b.remove(), 6500);
}
function afficherNotifs() {
  for (const n of G.journal) if (n.id > UI.vuJ) { toast(n.txt, n.i, n.ton); UI.vuJ = n.id; }
}
/* Appelé par le moteur à chaque combat. */
function surCombat(res) {
  if (UI.titre || !G) return;
  if (voitTuile(res.i)) {
    if (res.dD) texteFlottant(res.i, `−${res.dD}`, '#ff8a70');
    if (res.mortD) texteFlottant(res.i, '☠', '#ffffff');
  }
  if (res.dA && voitTuile(res.de)) texteFlottant(res.de, `−${res.dA}`, '#ffc36b');
  R.sale = true;
}

/* ---------- Barre du haut ---------- */
function majHUD() {
  if (!G || G.joueur < 0) return;
  const c = moi(), rv = revenus(c);
  $('#v-or').textContent = Math.floor(c.or);
  const d = $('#v-or-d'); d.textContent = signe(rv.o); d.className = 'num ' + (rv.o < 0 ? 'moins' : 'plus');
  $('#v-sci').textContent = '+' + rv.s;
  if (c.rech) {
    const cout = coutTech(c, c.rech);
    $('#v-rech').textContent = `${TECHS[c.rech].nom} · ${toursRestants(cout - c.sci, rv.s)} t.`;
    $('#j-rech').style.width = Math.min(100, c.sci / cout * 100) + '%';
  } else {
    $('#v-rech').textContent = Object.keys(TECHS).some(id => techDispo(c, id)) ? 'Choisir une recherche' : 'Tout est découvert';
    $('#j-rech').style.width = '0%';
  }
  $('#v-cult').textContent = Math.floor(c.cult);
  $('#v-cult-c').textContent = coutDoctrine(c);
  const b = calculBonheur(c).total;
  c.bonheur = b;
  $('#v-bonheur').textContent = b;
  $('#v-bonheur').className = 'num ' + (b < 0 ? 'moins' : '');
  $('#ic-bonheur').textContent = b <= -10 ? '😡' : b < 0 ? '😟' : '😊';
  $('#v-tour').innerHTML = `<b>Tour ${G.tour}</b> · ${esc(annee(G.tour))} · ${esc(ERES[ereCiv(c)])}`;
  majBoutonTour();
  majPanneauUnite();
  R.sale = true;
}
function besoins() {
  const us = unitesDe(G.joueur).filter(u => u.mv > 0 && !u.ordre && !u.mort);
  const k = us.findIndex(u => u.id === UI.sel);
  return k > 0 ? [...us.slice(k + 1), ...us.slice(0, k + 1)] : k === 0 ? [...us.slice(1), us[0]] : us;
}
function tacheSuivante() {
  const c = moi();
  if (!c.rech && Object.keys(TECHS).some(id => techDispo(c, id))) return { t: 'rech' };
  const v = villesDe(c.n).find(x => !x.file.length);
  if (v) return { t: 'ville', v };
  const u = besoins()[0];
  if (u) return { t: 'unite', u, n: besoins().length };
  return null;
}
function majBoutonTour() {
  const t = tacheSuivante(), b = $('#b-tour');
  b.classList.toggle('tache', !!t);
  $('#b-forcer').hidden = !t;
  if (!t) b.innerHTML = `<b>Tour suivant</b><small>${esc(annee(G.tour + 1))}</small>`;
  else if (t.t === 'rech') b.innerHTML = '<b>Choisir une recherche</b><small>Technologies</small>';
  else if (t.t === 'ville') b.innerHTML = `<b>Production à choisir</b><small>${esc(t.v.nom)}</small>`;
  else b.innerHTML = `<b>Unité suivante</b><small>${t.n} en attente d’ordres</small>`;
}
function executerTache(t) {
  if (t.t === 'rech') ouvrirTechs();
  else if (t.t === 'ville') { centrerSur(t.v.i); ouvrirVille(t.v); }
  else selectionner(t.u, true);
}

/* ---------- Sélection et surbrillances ---------- */
function selectionner(u, centrer) {
  UI.sel = u ? u.id : null; UI.cible = -1; UI.modeTir = null; UI.dissoudre = false;
  UI.res = u ? explorer(u, { tourMax: 25 }) : null;
  if (u && centrer && !estVisibleEcran(u.i, 70)) centrerSur(u.i);
  if (u && UI.ville) fermerModale();
  majSurbrillance(); majPanneauUnite(); R.sale = true;
}
function majSurbrillance() {
  const u = selU();
  if (UI.modeTir) {
    const v = G.villes.find(x => x.id === UI.modeTir);
    R.surbrillance = v ? { cibles: new Set(rayon(v.i, 2).filter(j => previsionTirVille(v, j))) } : null;
    return;
  }
  if (!u) {
    const v = UI.ville ? G.villes.find(x => x.id === UI.ville) : null;
    R.surbrillance = v ? { villeTrav: new Set(v.trav), villeTuiles: new Set(tuilesVille(v)) } : null;
    return;
  }
  const sb = { atteint: new Set(), cibles: new Set(), chemin: null, depart: u.i, marques: [] };
  if (mienne(u) && u.mv > 0) {
    const N = G.W * G.H;
    for (let i = 0; i < N; i++) if (i !== u.i && UI.res.best[i] < 100 && placeLibre(u, i)) sb.atteint.add(i);
    const portee = UNITES[u.type].t ? UNITES[u.type].portee : 1;
    for (const j of rayon(u.i, portee)) if (prevision(u, j)) sb.cibles.add(j);
  }
  if (mienne(u) && UI.cible >= 0 && UI.cible !== u.i) {
    let res = UI.res, ch = chemin(res, UI.cible);
    if (!ch && ennemiSur(u, UI.cible)) { res = explorer(u, { cible: UI.cible, stop: UI.cible, tourMax: 25 }); ch = chemin(res, UI.cible); sb.attaque = true; }
    if (prevision(u, UI.cible)) { sb.attaque = true; ch = [UI.cible]; sb.chemin = ch; }
    else if (ch) {
      sb.chemin = ch;
      if (sb.attaque) ch = ch.slice(0, -1);
      for (let k = 0; k < ch.length; k++) {
        const t = toursPour(res, ch[k]), suiv = k + 1 < ch.length ? toursPour(res, ch[k + 1]) : null;
        if (suiv === null || suiv > t) { if (suiv !== null || t > 0 || ch.length > 1) sb.marques.push({ i: ch[k], n: t + 1 }); }
      }
    }
  }
  R.surbrillance = sb;
}
function ennemiSur(u, i) {
  if (VIL[i] && VIL[i].civ !== u.civ && enGuerre(u.civ, VIL[i].civ)) return true;
  if (OCC[i].some(x => x.civ !== u.civ && enGuerre(x.civ, u.civ))) return true;
  return !!(G.tuiles[i].camp && UNITES[u.type].classe === 'terre' && !UNITES[u.type].t);
}
function etrangerEnPaix(u, i) {
  const t = G.tuiles[i];
  if (t.prop >= 0 && t.prop !== u.civ && !enGuerre(u.civ, t.prop)) return G.civs[t.prop];
  const x = OCC[i].find(x => x.civ !== u.civ && !enGuerre(x.civ, u.civ));
  return x ? G.civs[x.civ] : null;
}
function ordrePossible(u, i) {
  if (!mienne(u) || u.mv <= 0 || i === u.i) return null;
  if (prevision(u, i)) return 'attaque';
  if (ennemiSur(u, i) && UNITES[u.type].classe !== 'civil') {
    const r = explorer(u, { cible: i, stop: i, tourMax: 25 });
    return chemin(r, i) ? 'approche' : null;
  }
  if (UI.res && UI.res.best[i] < INF && placeLibre(u, i) && !OCC[i].some(x => x.civ !== u.civ)) return 'aller';
  return null;
}

/* ---------- Ordres ---------- */
function executer(u, i) {
  if (!u || u.mort || UI.occupe) return;
  UI.cible = -1;
  if (prevision(u, i)) { faireAttaque(u, i); return; }
  if (ennemiSur(u, i) && estMil(u)) {
    const dep = u.i, pas = deplacer(u, i, true);
    if (pas === null) { toast('Aucun chemin vers cette cible'); apres(u); return; }
    animerDeplacement(u, dep, pas);
    if (!u.mort && u.mv > 0 && prevision(u, i)) { setTimeout(() => faireAttaque(u, i), Prefs.reduit ? 0 : pas.length * 110 + 60); return; }
    apres(u); return;
  }
  const dep = u.i, pas = deplacer(u, i);
  if (pas === null) {
    const e = etrangerEnPaix(u, i);
    toast(e ? `Frontières fermées : vous êtes en paix avec les ${e.nom}` : 'Impossible d’atteindre cette case');
  } else animerDeplacement(u, dep, pas);
  apres(u);
}
function faireAttaque(u, i) {
  const res = attaquer(u, i);
  if (res && res.prise) toast(`Ville prise !`, i, 'bon');
  apres(u);
}
function apres(u) {
  UI.cible = -1;
  verifierVictoire();
  if (u && !u.mort && UI.sel === u.id) UI.res = explorer(u, { tourMax: 25 });
  majSurbrillance(); afficherNotifs(); majHUD(); R.miniSale = true; R.sale = true;
  if (G.fin) { montrerFin(); return; }
  if (Prefs.autoCycle && (!u || u.mort || u.mv <= 0 || u.ordre)) {
    setTimeout(() => {
      if (UI.occupe || !$('#modale').hidden && !UI.ville) return;
      const s = selU();
      if (s && !s.mort && s.mv > 0 && !s.ordre) return;
      const n = besoins()[0];
      selectionner(n || null, true);
    }, Prefs.reduit ? 60 : 380);
  }
}
const ACTIONS = {
  fonder: u => { const v = fonder(u); if (v) { selectionner(null); apres(null); ouvrirVille(v); } },
  fort: u => { u.ordre = 'fort'; apres(u); },
  veille: u => { u.ordre = 'veille'; apres(u); },
  passer: u => { u.ordre = 'passe'; apres(u); },
  annuler: u => { u.ordre = null; apres(u); },
  auto: u => { u.ordre = 'auto'; iaOuvrier(moi(), u); apres(u); },
  explo: u => { u.ordre = 'explo'; const dep = u.i; if (!iaExplorer(moi(), u)) { u.ordre = null; toast('Plus rien à explorer à portée'); } else animerDeplacement(u, dep, [u.i]); apres(u); },
  route: u => { construireRoute(u); apres(u); },
  maj: u => { if (majUnite(u)) toast(`Unité améliorée : ${UNITES[u.type].nom}`, u.i, 'bon'); apres(u); },
  dissoudre: u => { if (!UI.dissoudre) { UI.dissoudre = true; majPanneauUnite(); return; } tuer(u); verifierElimination(moi()); selectionner(null); apres(null); },
  selIci: u => { const autre = OCC[UI.cible].find(x => x.civ === G.joueur); if (autre) selectionner(autre); },
  villeIci: () => { const v = VIL[UI.cible]; if (v) ouvrirVille(v); },
  aller: u => { if (UI.cible >= 0) executer(u, UI.cible); },
};
function actionUnite(nom) {
  const u = selU();
  if (!u || !mienne(u) || UI.occupe) return;
  if (nom.startsWith('am:')) { ameliorer(u, nom.slice(3)); apres(u); return; }
  if (ACTIONS[nom]) ACTIONS[nom](u);
}

/* ---------- Panneau de l'unité ---------- */
function majPanneauUnite() {
  const p = $('#unite'), u = selU();
  if (!u || UI.titre) { p.hidden = true; return; }
  const U = UNITES[u.type], civ = G.civs[u.civ], c = moi();
  const st = [];
  if (U.f) st.push(`⚔️ ${U.f}${u.niv ? ` (+${u.niv * 5})` : ''}`);
  if (U.t) st.push(`🏹 ${U.t} · portée ${U.portee}`);
  st.push(`❤️ ${u.pv}/100`);
  st.push(`👣 ${fmtMv(u.mv)}/${fmtMv(mvMax(u))}`);
  if (u.type === 'ouvrier') st.push(`🔨 ${u.ch} charge${u.ch > 1 ? 's' : ''}`);
  if (estMil(u) && u.xp) st.push(`★ ${u.xp} XP`);
  if (u.ordre === 'fort') st.push('fortifiée'); else if (u.ordre === 'auto') st.push('automatisé'); else if (u.ordre === 'explo') st.push('exploration'); else if (u.ordre === 'veille') st.push('en veille'); else if (u.ordre && u.ordre.but !== undefined) st.push('en route');
  if (estEmbarque(u)) st.push('embarquée');
  let h = `<div class="tete"><div class="portrait" style="background:${civ.couleur}">${U.ic}</div><div style="min-width:0;flex:1"><h3>${esc(U.nom)}${mienne(u) ? '' : ` · ${esc(civ.nom)}`}</h3><div class="stats num">${st.map(esc).join('<span aria-hidden="true">·</span>')}</div></div><button class="fermer" data-act="fermerUnite" aria-label="Désélectionner">✕</button></div>`;
  if (mienne(u)) {
    const acts = [];
    const b = (id, txt, ok = true, k = '', cls = '') => acts.push(`<button class="btn ${cls}" data-act="${id}" ${ok ? '' : 'disabled'}>${txt}${k ? `<kbd>${k}</kbd>` : ''}</button>`);
    if (u.type === 'colon') b('fonder', '🏛️ Fonder une ville', peutFonder(u), 'B', 'principal');
    if (u.type === 'ouvrier') {
      for (const am in AMELIORATIONS) if (peutAmeliorer(c, u.i, am)) {
        const g = gainAmel(c, u.i, am), r0 = rendTuile(u.i, null, c), t = G.tuiles[u.i], av = t.am; t.am = am; const r1 = rendTuile(u.i, null, c); t.am = av;
        const gains = [r1.n - r0.n ? `🍎${signe(r1.n - r0.n)}` : '', r1.p - r0.p ? `⚒️${signe(r1.p - r0.p)}` : '', r1.o - r0.o ? `🪙${signe(r1.o - r0.o)}` : ''].filter(Boolean).join(' ');
        b('am:' + am, `${AMELIORATIONS[am].ic} ${AMELIORATIONS[am].nom} <small>${gains || (g > 0 ? 'luxe' : '')}</small>`, u.mv > 0, '', g > 0.5 ? 'principal' : '');
      }
      if (aTech(c, 'roue')) b('route', '🛤️ Route', peutRoute(u), 'R');
      b('auto', '⚙️ Automatiser', true, 'A');
    }
    if (estMil(u) && u.type !== 'eclaireur') b('fort', '🛡️ Fortifier', u.ordre !== 'fort', 'F');
    if (u.type === 'eclaireur' || U.classe === 'mer') b('explo', '🧭 Explorer', u.mv > 0, 'E');
    if (U.maj && aTech(c, UNITES[U.maj].tech)) b('maj', `⬆️ ${UNITES[U.maj].nom} <small>${coutMaj(u)} or</small>`, peutMaj(u), 'U');
    if (estMil(u)) b('veille', '👁️ Veille', u.ordre !== 'veille', 'V');
    b('passer', '⏭️ Passer', u.mv > 0, 'Espace');
    if (u.ordre) b('annuler', '↩️ Annuler l’ordre');
    b('dissoudre', UI.dissoudre ? 'Confirmer la dissolution ?' : '🗑️ Dissoudre', true, '', 'danger');
    h += `<div class="actions">${acts.join('')}</div>`;
    if (UI.cible >= 0 && UI.cible !== u.i) {
      const p2 = prevision(u, UI.cible);
      if (p2 && (p2.type === 'unite' || p2.type === 'ville')) h += panneauCombat(u, p2);
      else {
        const o = ordrePossible(u, UI.cible), sub = [];
        if (OCC[UI.cible].some(x => x.civ === G.joueur)) sub.push('<button class="btn" data-act="selIci">Sélectionner l’unité ici</button>');
        if (VIL[UI.cible] && VIL[UI.cible].civ === G.joueur) sub.push('<button class="btn" data-act="villeIci">Ouvrir la ville</button>');
        const res = o === 'aller' ? UI.res : null, tours = res ? toursPour(res, UI.cible) + 1 : null;
        if (o) sub.unshift(`<button class="btn principal" data-act="aller">${o === 'aller' ? `Y aller${tours > 1 ? ` (${tours} tours)` : ''}` : o === 'attaque' ? 'Attaquer' : 'Approcher et attaquer'}</button>`);
        h += `<div class="indice">${o ? 'Touchez à nouveau la case pour confirmer.' : 'Destination impossible.'}</div><div class="actions">${sub.join('')}</div>`;
      }
    } else if (UNITES[u.type].t && u.mv > 0 && !u.att) h += '<div class="indice">Touchez une cible entourée de rouge pour tirer.</div>';
  }
  p.innerHTML = h;
  p.hidden = false;
}
function panneauCombat(u, p) {
  const nomD = p.type === 'ville' ? p.v.nom : UNITES[p.def.type].nom;
  const pvD = p.type === 'ville' ? p.v.pv : p.def.pv, maxD = p.type === 'ville' ? pvMaxVille(p.v) : 100;
  const resteD = Math.max(0, pvD - p.dD), resteA = Math.max(0, u.pv - p.dA);
  const issue = resteD <= 0 ? (p.type === 'ville' && !p.prise ? 'Défenses brisées' : p.type === 'ville' ? 'Prise de la ville' : 'Victoire probable') : resteA <= 0 ? 'Défaite probable' : p.dD > p.dA ? 'Avantage' : p.dD < p.dA ? 'Désavantage' : 'Combat égal';
  const barre = (pv, max, d) => `<div class="barre-pv"><i style="width:${Math.max(0, pv - d) / max * 100}%"></i><b style="left:${Math.max(0, pv - d) / max * 100}%;width:${Math.min(pv, d) / max * 100}%"></b></div>`;
  return `<div id="combat"><div class="duel num"><div><b>${esc(UNITES[u.type].nom)}</b> · ${p.fA}<br><small>${p.distance ? 'tir, aucune riposte' : `−${p.dA} PV`}</small>${barre(u.pv, 100, p.dA)}</div><div>⚔️</div><div><b>${esc(nomD)}</b> · ${p.fD}<br><small>−${p.dD} PV</small>${barre(pvD, maxD, p.dD)}</div></div>
    <div class="actions"><button class="btn principal" data-act="aller">${esc(issue)} : attaquer</button></div></div>`;
}

/* ---------- Infos sur une case ---------- */
function infoTuile(i) {
  if (!connaitTuile(i)) return '<h4>Terres inconnues</h4>';
  const t = G.tuiles[i], c = moi(), r = rendTuile(i, null, c);
  const nom = [t.rel === 2 ? 'Montagnes' : TERRAINS[t.t].nom, t.rel === 1 ? 'collines' : '', t.cv ? COUVERTS[t.cv].nom.toLowerCase() : ''].filter(Boolean).join(', ');
  let h = `<h4>${esc(nom)}</h4>`;
  if (t.rel !== 2) h += `<div class="num">🍎 ${r.n} · ⚒️ ${r.p} · 🪙 ${r.o}${bonusTerrain(i) ? ` · défense ${signe(bonusTerrain(i))}` : ''}</div>`;
  else h += '<div class="l">Infranchissable</div>';
  if (t.res && resVisible(c, t.res)) h += `<div>${RESSOURCES[t.res].ic} ${esc(RESSOURCES[t.res].nom)}${RESSOURCES[t.res].luxe ? ' <span class="l">(luxe : +4 bonheur une fois exploité)</span>' : ''}</div>`;
  if (t.am) h += `<div>${AMELIORATIONS[t.am].ic} ${esc(AMELIORATIONS[t.am].nom)}</div>`;
  if (t.riv) h += '<div>〰️ Rivière (+1 or)</div>';
  if (t.rt) h += '<div>🛤️ Route</div>';
  if (t.hutte) h += '<div>🛖 Village tribal : entrez-y pour une surprise</div>';
  if (t.camp) h += '<div>🔥 Camp barbare</div>';
  if (t.prop >= 0) { const v = G.villes.find(x => x.id === t.vp); h += `<div class="l">Territoire ${esc(G.civs[t.prop].nom)}${v ? ` (${esc(v.nom)})` : ''}</div>`; }
  if (VIL[i]) { const v = VIL[i]; h += `<div>🏛️ ${esc(v.nom)} · pop ${v.pop} · défense ${forceVille(v)} · ❤️ ${v.pv}/${pvMaxVille(v)}</div>`; }
  if (voitTuile(i)) for (const u of OCC[i]) h += `<div>${UNITES[u.type].ic} ${esc(UNITES[u.type].nom)} (${esc(G.civs[u.civ].nom)}) ${UNITES[u.type].f ? `⚔️ ${UNITES[u.type].f}` : ''} ❤️ ${u.pv}</div>`;
  return h;
}
function montrerInfo(i, x, y) {
  const b = $('#info');
  if (i < 0) { b.hidden = true; return; }
  b.innerHTML = infoTuile(i);
  b.hidden = false;
  const w = b.offsetWidth, h = b.offsetHeight;
  b.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x + 16)) + 'px';
  b.style.top = Math.min(window.innerHeight - h - 8, Math.max(60, y + 16)) + 'px';
}

/* ---------- Toucher, souris, trackpad ---------- */
function tap(x, y, bouton, type) {
  $('#info').hidden = true;
  if (!G || UI.titre || UI.occupe || G.fin) return;
  const i = tuileEn(x, y);
  if (i < 0) return;
  if (UI.modeTir) {
    const v = G.villes.find(w => w.id === UI.modeTir);
    UI.modeTir = null;
    if (v && previsionTirVille(v, i)) tirVille(v, i);
    majSurbrillance(); afficherNotifs(); majHUD();
    return;
  }
  const u = selU(), souris = type === 'mouse';
  const miens = OCC[i].filter(x => x.civ === G.joueur);
  const maVille = VIL[i] && VIL[i].civ === G.joueur ? VIL[i] : null;
  const choisirIci = () => {
    const m = miens.find(x => estMil(x) && x.mv > 0) || miens.find(x => x.mv > 0) || miens[0];
    if (m) selectionner(m); else if (maVille) ouvrirVille(maVille);
  };
  if (u && mienne(u) && bouton === 2) { executer(u, i); return; }
  if (u && i === u.i) {
    const autre = miens.find(x => x !== u);
    if (autre) selectionner(autre); else if (maVille) ouvrirVille(maVille); else selectionner(null);
    return;
  }
  if (u && mienne(u) && u.mv > 0) {
    const o = ordrePossible(u, i);
    if (souris) {
      if ((miens.length || maVille) && bouton === 0) { choisirIci(); return; }
      if (o) { executer(u, i); return; }
    } else {
      if (o && UI.cible === i) { executer(u, i); return; }
      if (o) { UI.cible = i; majSurbrillance(); majPanneauUnite(); return; }
      if (miens.length || maVille) { choisirIci(); return; }
    }
    const e = etrangerEnPaix(u, i);
    if (e) toast(`Vous êtes en paix avec les ${e.nom}. Déclarez la guerre depuis le panneau des nations pour attaquer.`);
    UI.cible = -1; majSurbrillance(); majPanneauUnite();
    if (!o && !miens.length) { selectionner(null); montrerInfo(i, x, y); }
    return;
  }
  if (miens.length || maVille) { choisirIci(); return; }
  const autres = voitTuile(i) ? OCC[i].filter(x => x.civ !== G.joueur) : [];
  if (autres.length) { selectionner(autres.find(estMil) || autres[0]); montrerInfo(i, x, y); return; }
  selectionner(null);
  if (!souris) montrerInfo(i, x, y);
}
function initEntrees() {
  const cv = R.cv;
  cv.addEventListener('pointerdown', e => {
    if (UI.titre) return;
    cv.setPointerCapture(e.pointerId);
    UI.pts.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, b: e.button, type: e.pointerType });
    if (UI.pts.size === 1) {
      UI.glisse = false; UI.appuiFait = false;
      clearTimeout(UI.appui);
      if (e.pointerType !== 'mouse') UI.appui = setTimeout(() => { if (!UI.glisse && UI.pts.size === 1) { UI.appuiFait = true; montrerInfo(tuileEn(e.clientX, e.clientY), e.clientX, e.clientY - 80); } }, 520);
    } else if (UI.pts.size === 2) {
      clearTimeout(UI.appui);
      const [a, b] = [...UI.pts.values()];
      UI.pince = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      UI.glisse = true;
    }
  });
  cv.addEventListener('pointermove', e => {
    const p = UI.pts.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse' && G && !UI.titre) survol(e.clientX, e.clientY);
      return;
    }
    if (UI.pts.size === 2 && UI.pince) {
      p.x = e.clientX; p.y = e.clientY;
      const [a, b] = [...UI.pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (UI.pince.d > 0) zoomer(d / UI.pince.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
      UI.pince.d = d; return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!UI.glisse && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) > 8) { UI.glisse = true; clearTimeout(UI.appui); $('#info').hidden = true; }
    if (UI.glisse) { R.cam.x -= dx / R.cam.z; R.cam.y -= dy / R.cam.z; R.camAnim = null; borneCam(); R.sale = true; }
    p.x = e.clientX; p.y = e.clientY;
  });
  const fin = e => {
    const p = UI.pts.get(e.pointerId);
    clearTimeout(UI.appui);
    if (p && UI.pts.size === 1 && !UI.glisse && !UI.appuiFait && e.type === 'pointerup') tap(e.clientX, e.clientY, p.b, p.type);
    UI.pts.delete(e.pointerId);
    if (UI.pts.size < 2) UI.pince = null;
  };
  cv.addEventListener('pointerup', fin);
  cv.addEventListener('pointercancel', fin);
  cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { $('#info').hidden = true; R.survol = -1; R.sale = true; } });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    if (UI.titre) return;
    if (e.ctrlKey) zoomer(Math.exp(-e.deltaY * 0.012), e.clientX, e.clientY);
    else if (e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && e.deltaX === 0)) zoomer(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
    else { R.cam.x += e.deltaX / R.cam.z; R.cam.y += e.deltaY / R.cam.z; R.camAnim = null; borneCam(); R.sale = true; }
  }, { passive: false });
  /* Geste de pincement de Safari (trackpad du Mac). */
  let echelle = 1;
  window.addEventListener('gesturestart', e => { e.preventDefault(); echelle = 1; });
  window.addEventListener('gesturechange', e => { e.preventDefault(); if (!UI.titre) zoomer(e.scale / echelle, e.clientX, e.clientY); echelle = e.scale; });
  window.addEventListener('gestureend', e => e.preventDefault());

  const mini = R.mini;
  const allerMini = e => {
    const r = mini.getBoundingClientRect(), m = tailleMonde();
    const x = (e.clientX - r.left) / r.width * m.w, y = (e.clientY - r.top) / r.height * m.h;
    R.cam.x = x - R.larg / 2 / R.cam.z; R.cam.y = y - R.haut / 2 / R.cam.z; R.camAnim = null; borneCam(); R.sale = true;
  };
  mini.addEventListener('pointerdown', e => { mini.setPointerCapture(e.pointerId); allerMini(e); mini._actif = true; });
  mini.addEventListener('pointermove', e => { if (mini._actif) allerMini(e); });
  mini.addEventListener('pointerup', () => { mini._actif = false; });
  window.addEventListener('keydown', clavier);
}
function survol(x, y) {
  const i = tuileEn(x, y);
  if (i === R.survol) return;
  R.survol = i; R.sale = true;
  $('#info').hidden = true;
  clearTimeout(UI.survolT);
  const u = selU();
  if (u && mienne(u) && u.mv > 0) {
    const o = i >= 0 ? ordrePossible(u, i) : null;
    const nouv = o ? i : -1;
    if (nouv !== UI.cible) { UI.cible = nouv; majSurbrillance(); majPanneauUnite(); }
    R.cv.style.cursor = o === 'attaque' || o === 'approche' ? 'crosshair' : o ? 'pointer' : 'default';
  } else R.cv.style.cursor = 'default';
  if (i >= 0) UI.survolT = setTimeout(() => { if (R.survol === i && !UI.pts.size) montrerInfo(i, x, y); }, 650);
}
function clavier(e) {
  if (UI.titre || !G) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase(), modale = !$('#modale').hidden;
  if (k === 'escape') {
    if (modale) fermerModale(); else if (UI.modeTir || UI.cible >= 0) { UI.modeTir = null; UI.cible = -1; majSurbrillance(); majPanneauUnite(); }
    else if (UI.sel !== null) selectionner(null); else ouvrirMenu();
    e.preventDefault(); return;
  }
  if (modale && !UI.ville) return;
  const pas = 90 / R.cam.z;
  const touches = {
    arrowleft: () => { R.cam.x -= pas; }, arrowright: () => { R.cam.x += pas; }, arrowup: () => { R.cam.y -= pas; }, arrowdown: () => { R.cam.y += pas; },
  };
  if (touches[k]) { touches[k](); R.camAnim = null; borneCam(); R.sale = true; e.preventDefault(); return; }
  if (k === '+' || k === '=') { zoomer(1.2); return; }
  if (k === '-' || k === '_') { zoomer(1 / 1.2); return; }
  if (k === 'enter') { e.preventDefault(); finirTour(e.shiftKey); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (k === 't') { ouvrirTechs(); return; }
  if (k === 'p') { ouvrirDoctrines(); return; }
  if (k === 'd') { ouvrirDiplomatie(); return; }
  if (k === 'h' || k === '?') { ouvrirAide(); return; }
  if (k === 'tab') { e.preventDefault(); const n = besoins()[0]; if (n) selectionner(n, true); return; }
  if (k === 'c') { const u = selU(); if (u) centrerSur(u.i); return; }
  if (k === 'g') { Prefs.grille = !Prefs.grille; R.grille = Prefs.grille; garderPrefs(); R.sale = true; return; }
  const u = selU();
  if (!u || !mienne(u)) return;
  const raccourcis = { b: 'fonder', f: 'fort', v: 'veille', ' ': 'passer', r: 'route', a: 'auto', e: 'explo', u: 'maj' };
  const act = raccourcis[k] || raccourcis[e.key];
  if (act) { e.preventDefault(); if (act === 'fonder' && !peutFonder(u)) return; actionUnite(act); }
}

/* ---------- Fin de tour ---------- */
function finirTour(forcer) {
  if (!G || G.fin || UI.occupe || UI.titre) return;
  const t = tacheSuivante();
  if (t && !forcer) { executerTache(t); return; }
  UI.occupe = true;
  fermerModale(); selectionner(null);
  $('#attente').hidden = false;
  setTimeout(() => {
    try { finDuTour(); } catch (err) { console.error(err); toast('Erreur pendant le tour : ' + err.message, null, 'mal'); }
    UI.occupe = false;
    $('#attente').hidden = true;
    sauvegarder();
    R.miniSale = true; R.sale = true;
    afficherNotifs(); majHUD();
    if (G.fin) { montrerFin(); return; }
    traiterPopups();
    if ($('#modale').hidden) { const n = besoins()[0]; if (n) selectionner(n, true); }
  }, 30);
}

/* ---------- Fenêtres ---------- */
function ouvrirModale(titre, html, mode = '') {
  const m = $('#modale');
  m.className = mode;
  $('#m-titre').innerHTML = titre;
  $('#m-corps').innerHTML = html;
  $('#m-corps').scrollTop = 0;
  m.hidden = false;
  $('#info').hidden = true;
}
function fermerModale() {
  const m = $('#modale');
  if (m.hidden) return;
  m.hidden = true;
  const etaitVille = UI.ville;
  UI.ville = null;
  if (etaitVille) majSurbrillance();
  R.sale = true;
  if (!UI.occupe && !UI.titre && G && !G.fin) setTimeout(traiterPopups, 50);
}
function traiterPopups() {
  if (!G || UI.titre || !$('#modale').hidden) return;
  let p;
  while ((p = G.popups.shift())) {
    if (p.type === 'production') continue; // le bouton du bas s'en charge
    if (p.type === 'tech') { if (moi().rech) continue; ouvrirTechs('Une découverte vient d’aboutir. Que voulez-vous chercher maintenant ?'); return; }
    if (p.type === 'doctrine') { if (!doctrinesDispo(moi()).length || moi().cult < coutDoctrine(moi())) continue; ouvrirDoctrines('Votre culture permet d’adopter une nouvelle doctrine.'); return; }
    if (p.type === 'bienvenue') { ouvrirBienvenue(); return; }
    if (p.type === 'guerre') { const c = G.civs[p.civ]; ouvrirModale(`Guerre !`, `<p><b style="color:${c.couleur}">Les ${esc(c.nom)}</b> vous déclarent la guerre. Leurs troupes peuvent désormais franchir vos frontières.</p><p>Fortifiez vos villes, regroupez votre armée, et visez leurs villes quand vous serez prêts.</p><div class="pied"><button class="btn principal" data-act="fermer">Aux armes</button></div>`); return; }
    if (p.type === 'paix') {
      const c = G.civs[p.civ];
      if (!c.guerre[G.joueur]) continue;
      ouvrirModale('Proposition de paix', `<p><b style="color:${c.couleur}">Les ${esc(c.nom)}</b> vous proposent de mettre fin à la guerre. Les armées de chaque camp quitteront le territoire de l’autre.</p><div class="pied"><button class="btn" data-act="fermer">Refuser</button><button class="btn principal" data-paix="${c.n}">Signer la paix</button></div>`);
      return;
    }
    if (p.type === 'merveille') { const M = MERVEILLES[p.id]; ouvrirModale(`★ ${esc(M.nom)}`, `<p>Votre peuple a achevé une merveille du monde : <b>${esc(M.nom)}</b>.</p><p>${esc(descBat(M))}</p><div class="pied"><button class="btn principal" data-act="fermer">Magnifique</button></div>`); return; }
  }
}
function ouvrirBienvenue() {
  const c = moi(), def = CIVS.find(d => d.id === c.id);
  ouvrirModale(`Les ${esc(c.nom)}`, `<p>${esc(annee(G.tour))}. Votre peuple n’a encore ni ville ni écriture. Votre colon attend vos ordres.</p>
  <p><b>Atout de votre nation :</b> ${esc(def.txt)}.</p>
  <h3>Premiers pas</h3>
  <p>1. Sélectionnez le <b>colon</b> ⛺ et fondez votre capitale (bouton « Fonder une ville » ou touche B).<br>2. Envoyez l’<b>éclaireur</b> 🧭 explorer : les villages tribaux 🛖 cachent des cadeaux.<br>3. Choisissez une <b>recherche</b> 🔬 et une <b>production</b> dans la ville.<br>4. Le bouton en bas à droite vous guide : il montre ce qui attend un ordre, puis passe au tour suivant.</p>
  <p>Victoire : prendre toutes les capitales, lancer l’<b>Arche stellaire</b> ou avoir le meilleur score en ${esc(annee(G.toursMax))}.</p>
  <div class="pied"><button class="btn" data-act="aide">Commandes</button><button class="btn principal" data-act="fermer">À l’aube de l’histoire</button></div>`);
}

/* Ville */
function ouvrirVille(v) {
  if (!v) return;
  UI.ville = v.id; UI.sel = null; UI.cible = -1;
  majPanneauUnite();
  rendreVille(v);
  majSurbrillance(); R.sale = true;
  if (!estVisibleEcran(v.i, 120) || window.innerWidth > 760) {
    const p = centreTuile(v.i), dec = window.innerWidth > 760 ? 200 : 0, decY = window.innerWidth > 760 ? 0 : window.innerHeight * 0.28;
    R.camAnim = { de: { x: R.cam.x, y: R.cam.y }, a: { x: p.x - (R.larg / 2 - dec) / R.cam.z, y: p.y - (R.haut / 2 - decY) / R.cam.z }, t0: performance.now(), d: 300 };
  }
}
function rendreVille(v) {
  const c = G.civs[v.civ], mine = v.civ === G.joueur;
  assignerTuiles(v);
  const b = bilanVille(v), seuil = seuilCroissance(v.pop);
  const croiss = b.surplus > 0 ? `croissance dans ${toursRestants(seuil - v.nour, b.surplus * (c.bonheur < 0 ? 0.5 : 1))} t.` : b.surplus < 0 ? 'famine !' : 'stagnation';
  const it = v.file[0], cout = it ? coutItem(v, it) : 0;
  let h = `<div class="chiffres num">
    <div class="chiffre"><b>🍎 ${signe(b.surplus)}</b><small>${Math.floor(v.nour)}/${seuil} · ${esc(croiss)}${v.pop >= habitat(v) ? ' · limite d’habitat' : ''}</small></div>
    <div class="chiffre"><b>⚒️ ${b.p}</b><small>production</small></div>
    <div class="chiffre"><b>🪙 ${b.o}</b><small>or</small></div>
    <div class="chiffre"><b>🔬 ${b.s}</b><small>science${b.spec ? ` · ${b.spec} savant${b.spec > 1 ? 's' : ''}` : ''}</small></div>
    <div class="chiffre"><b>🎭 ${b.c}</b><small>frontières dans ${toursRestants(coutTuileCulture(v) - v.cult, b.c)} t.</small></div>
    <div class="chiffre"><b>🛡️ ${forceVille(v)}</b><small>❤️ ${v.pv}/${pvMaxVille(v)}</small></div>
  </div>`;
  if (!mine) { ouvrirModale(`${esc(v.nom)} <small style="font-size:14px;color:${c.couleur}">${esc(c.nom)}</small>`, h + `<p style="margin-top:10px">Population ${v.pop}.</p>`, 'cote'); return; }
  h += `<h3>Spécialisation</h3><div class="seg">${[['equilibre', 'Équilibre'], ['nourriture', 'Nourriture'], ['production', 'Production'], ['or', 'Or']].map(([k, n]) => `<button data-focus="${k}" class="${v.focus === k ? 'actif' : ''}">${n}</button>`).join('')}</div>`;
  h += '<h3>En cours</h3>';
  if (it) {
    const continu = cout >= INF, prix = coutAchat(v, it);
    h += `<div class="encours"><div class="ligne"><b style="flex:1">${esc(nomItem(it))}</b><span class="num">${continu ? 'continu' : `${Math.floor(v.prod)}/${cout} · ${toursRestants(cout - v.prod, b.p)} t.`}</span></div>
      ${continu ? '' : `<span class="jauge"><i style="width:${Math.min(100, v.prod / cout * 100)}%"></i></span>`}
      ${prix !== null ? `<div class="ligne"><button class="btn" data-acheter="1" ${c.or >= prix ? '' : 'disabled'}>🪙 Acheter maintenant · ${prix} or</button></div>` : ''}</div>`;
  } else h += '<div class="encours"><b>Choisissez ce que la ville doit produire.</b></div>';
  if (!v.aTire && rayon(v.i, 2).some(j => previsionTirVille(v, j))) h += '<div class="pied" style="justify-content:flex-start"><button class="btn principal" data-tir="1">🎯 Bombarder une unité ennemie</button></div>';
  const groupes = { u: [], b: [], m: [], p: [] };
  for (const x of itemsDispo(v)) groupes[x.k].push(x);
  const ligne = x => {
    const D = (x.k === 'u' ? UNITES : x.k === 'b' ? BATIMENTS : x.k === 'm' ? MERVEILLES : PROJETS)[x.id];
    const k = coutItem(v, x), actif = it && it.k === x.k && it.id === x.id;
    const ic = x.k === 'u' ? D.ic : x.k === 'm' ? '★' : x.k === 'p' ? (x.id === 'arche' ? '🚀' : x.id === 'richesse' ? '🪙' : '🔬') : '🏛️';
    const detail = x.k === 'u' ? (D.classe === 'civil' ? (x.id === 'colon' ? `fonde une ville · coûte 1 population${v.pop < 2 ? ' (population 2 requise)' : ''}` : `${D.charges + (eff(c).charges || 0)} améliorations`) : texteFort(D)) : x.k === 'p' ? D.desc : descBat(D);
    return `<button class="choix${actif ? ' actif' : ''}" data-item="${x.k}:${x.id}"><span class="ic">${ic}</span><span class="nom">${esc(D.nom)}</span><span class="t num">${k >= INF ? '' : `${toursRestants(k, b.p)} t.`}</span><small>${esc(detail)}</small></button>`;
  };
  if (groupes.u.length) h += `<h3>Unités</h3><div class="liste">${groupes.u.map(ligne).join('')}</div>`;
  if (groupes.b.length) h += `<h3>Bâtiments</h3><div class="liste">${groupes.b.map(ligne).join('')}</div>`;
  if (groupes.m.length) h += `<h3>Merveilles du monde</h3><div class="liste">${groupes.m.map(ligne).join('')}</div>`;
  if (groupes.p.length) h += `<h3>Projets</h3><div class="liste">${groupes.p.map(ligne).join('')}</div>`;
  const bats = Object.keys(v.bat).map(k => (BATIMENTS[k] || MERVEILLES[k] || {}).nom).filter(Boolean);
  if (bats.length) h += `<h3>Déjà bâti</h3><div class="puces">${bats.map(n => `<span class="puce">${esc(n)}</span>`).join('')}</div>`;
  ouvrirModale(`${v.bat.palais ? '★ ' : ''}${esc(v.nom)} <small style="font-size:14px;color:var(--doux)">· population ${v.pop}</small>`, h, 'cote');
}

/* Technologies */
function deblocages(id) {
  const d = [];
  for (const k in UNITES) if (UNITES[k].tech === id) d.push(`${UNITES[k].ic} ${UNITES[k].nom}`);
  for (const k in BATIMENTS) if (BATIMENTS[k].tech === id) d.push(BATIMENTS[k].nom);
  for (const k in MERVEILLES) if (MERVEILLES[k].tech === id) d.push(`★ ${MERVEILLES[k].nom}`);
  for (const k in AMELIORATIONS) if (AMELIORATIONS[k].tech === id) d.push(`${AMELIORATIONS[k].ic} ${AMELIORATIONS[k].nom}`);
  for (const k in PROJETS) if (PROJETS[k].tech === id) d.push(`🚀 ${PROJETS[k].nom}`);
  if (EFFETS_TECH[id]) d.push(EFFETS_TECH[id]);
  return d;
}
function ouvrirTechs(intro) {
  const c = moi(), rv = revenus(c);
  const cheminBut = new Set();
  if (c.but) { const pile = [c.but]; while (pile.length) { const t = pile.pop(); if (c.techs[t] || cheminBut.has(t)) continue; cheminBut.add(t); pile.push(...TECHS[t].req); } }
  let h = intro ? `<p>${esc(intro)}</p>` : '';
  h += `<p>Science : <b class="num">+${rv.s}</b> par tour. Choisissez une technologie, même lointaine : la recherche passera par les étapes nécessaires.</p><div class="arbre">`;
  ERES.forEach((nom, e) => {
    const liste = TECHS_BRUT.filter(t => t[2] === e).map(t => TECHS[t[0]]);
    h += `<div class="ere"><h4>${esc(nom)}</h4><div class="liste">`;
    for (const T of liste) {
      const connue = !!c.techs[T.id], encours = c.rech === T.id, dispo = techDispo(c, T.id);
      const cout = coutTech(c, T.id);
      const cls = connue ? 'connue' : encours ? 'encours' : cheminBut.has(T.id) ? 'chemin' : dispo ? '' : 'bloquee';
      const t = connue ? '✓' : `${toursRestants(cout - (encours ? c.sci : 0), rv.s)} t.`;
      h += `<button class="tech ${cls}" data-tech="${T.id}"><span class="t num">${t}</span><b>${esc(T.nom)}</b><span class="deb">${esc(deblocages(T.id).join(' · ') || '—')}</span>${encours ? `<span class="jauge"><i style="width:${Math.min(100, c.sci / cout * 100)}%"></i></span>` : ''}${!connue && !dispo ? `<span class="deb">Requiert : ${esc(T.req.filter(r => !c.techs[r]).map(r => TECHS[r].nom).join(', '))}</span>` : ''}</button>`;
    }
    h += '</div></div>';
  });
  h += '</div>';
  ouvrirModale('Technologies', h, 'large');
  const enc = document.querySelector('.tech.encours') || document.querySelector('.tech:not(.connue)');
  if (enc) enc.scrollIntoView({ block: 'nearest', inline: 'center' });
}
/* Doctrines */
function ouvrirDoctrines(intro) {
  const c = moi(), cout = coutDoctrine(c);
  let h = intro ? `<p>${esc(intro)}</p>` : '';
  h += `<p>Culture accumulée : <b class="num">${Math.floor(c.cult)}</b> · prochaine doctrine : <b class="num">${cout}</b>. Chaque voie s’adopte dans l’ordre ; le coût augmente avec le nombre de doctrines et de villes.</p><div class="voies">`;
  for (const d of DOCTRINES) {
    const k = c.doc[d.id] || 0;
    h += `<div class="voie"><h4>${esc(d.nom)}</h4>`;
    d.liste.forEach((it, x) => {
      const cls = x < k ? 'prise' : x === k ? 'prochaine' : '';
      h += `<div class="doc ${cls}"><b>${x < k ? '✓ ' : ''}${esc(it.nom)}</b>${esc(it.desc)}</div>`;
    });
    if (k < d.liste.length) h += `<button class="btn ${c.cult >= cout ? 'principal' : ''}" data-doctrine="${d.id}" ${c.cult >= cout ? '' : 'disabled'} style="width:100%;justify-content:center">Adopter</button>`;
    h += '</div>';
  }
  h += '</div>';
  ouvrirModale('Doctrines', h, 'large');
}
/* Nations */
function ouvrirDiplomatie() {
  const c = moi(), p = puissance(c.n);
  let h = '<p>Les nations rencontrées, leur score et votre situation avec elles. En paix, les frontières sont fermées aux armées.</p>';
  const autres = G.civs.filter(d => !d.barbare && d.n !== c.n).sort((a, b) => (c.met[b.n] !== undefined) - (c.met[a.n] !== undefined) || b.score - a.score);
  h += `<div class="nation"><span class="pastille" style="background:${c.couleur}"></span><div><b>${esc(c.nom)}</b> (vous)<br><small class="num">Score ${scoreCiv(c)} · ${villesDe(c.n).length} villes · ${Object.keys(c.techs).length} technologies</small></div><span></span></div>`;
  for (const d of autres) {
    if (c.met[d.n] === undefined) { h += `<div class="nation" style="opacity:.6"><span class="pastille" style="background:#444"></span><div><b>Nation inconnue</b><br><small>Pas encore rencontrée</small></div><span></span></div>`; continue; }
    if (d.elimine) { h += `<div class="nation" style="opacity:.6"><span class="pastille" style="background:${d.couleur}"></span><div><b>${esc(d.nom)}</b><br><small>Disparus</small></div><span></span></div>`; continue; }
    const pd = puissance(d.n), rapport = pd / Math.max(1, p);
    const force = rapport > 1.5 ? 'armée bien plus forte' : rapport > 1.1 ? 'armée plus forte' : rapport > 0.9 ? 'armée comparable' : rapport > 0.6 ? 'armée plus faible' : 'armée bien plus faible';
    const guerre = c.guerre[d.n] !== undefined;
    const etat = guerre ? `<span class="etat-guerre">En guerre depuis ${G.tour - c.guerre[d.n]} tours</span>` : '<span class="etat-paix">En paix</span>';
    const btn = guerre ? `<button class="btn" data-paixprop="${d.n}">Proposer la paix</button>` : (UI.confirmeGuerre === d.n ? `<button class="btn danger" data-guerre="${d.n}">Confirmer la guerre</button>` : `<button class="btn danger" data-guerre="${d.n}">Déclarer la guerre</button>`);
    h += `<div class="nation"><span class="pastille" style="background:${d.couleur}"></span><div><b>${esc(d.nom)}</b> · ${etat}<br><small class="num">Score ${d.score} · ${villesDe(d.n).length} villes · ${esc(force)} · ${esc(ERES[ereCiv(d)])}</small></div>${btn}</div>`;
  }
  const merv = Object.entries(G.merveillesBaties);
  if (merv.length) h += `<h3>Merveilles du monde</h3><div class="puces">${merv.map(([id, m]) => `<span class="puce">★ ${esc(MERVEILLES[id].nom)} · ${esc(G.civs[m.civ].n === c.n || c.met[m.civ] !== undefined ? G.civs[m.civ].nom : 'nation inconnue')}</span>`).join('')}</div>`;
  ouvrirModale('Nations du monde', h);
}
/* Menu, aide, fin */
function ouvrirMenu() {
  ouvrirModale('Menu', `<div class="liste">
    <button class="choix" data-act="fermer"><span class="ic">▶️</span><span class="nom">Reprendre</span></button>
    <button class="choix" data-act="sauver"><span class="ic">💾</span><span class="nom">Sauvegarder</span><small>La partie est aussi enregistrée à chaque tour, dans ce navigateur.</small></button>
    <button class="choix" data-act="journal"><span class="ic">📜</span><span class="nom">Journal des événements</span></button>
    <button class="choix" data-act="aide"><span class="ic">❓</span><span class="nom">Commandes et règles</span></button>
    <button class="choix" data-act="grille"><span class="ic">⬡</span><span class="nom">Grille hexagonale : ${Prefs.grille ? 'affichée' : 'masquée'}</span></button>
    <button class="choix" data-act="qualite"><span class="ic">🎨</span><span class="nom">Graphismes : ${Prefs.qualite === 'eco' ? 'économie (batterie)' : 'haute qualité'}</span><small>L’économie allège le brouillard et la finesse du terrain.</small></button>
    <button class="choix" data-act="cycle"><span class="ic">🔁</span><span class="nom">Passer seul à l’unité suivante : ${Prefs.autoCycle ? 'oui' : 'non'}</span></button>
    <button class="choix" data-act="plein"><span class="ic">⛶</span><span class="nom">Plein écran</span></button>
    <button class="choix" data-act="titre"><span class="ic">🏠</span><span class="nom">Écran d’accueil et nouvelle partie</span></button>
  </div>`);
}
function ouvrirJournal() {
  const l = G.journal.slice().reverse().map(n => `<button class="choix" data-centre="${n.i ?? ''}"><span class="ic num" style="font-size:12px;color:var(--doux)">T${n.tour}</span><span class="nom" style="font-weight:400">${esc(n.txt)}</span></button>`).join('');
  ouvrirModale('Journal', `<div class="liste">${l || '<p>Rien pour l’instant.</p>'}</div>`);
}
function ouvrirAide() {
  ouvrirModale('Comment jouer', `
  <h3>Sur Mac</h3>
  <p>Clic : sélectionner une unité ou ouvrir une ville. Avec une unité sélectionnée, le chemin s’affiche au survol : un clic sur une case vide l’y envoie, un clic sur un ennemi l’attaque. Clic droit : ordre direct, même sur vos propres cases. Glisser ou défiler à deux doigts : déplacer la carte. Pincer (ou ⌃ + molette) : zoom.</p>
  <p>Clavier : <b>Entrée</b> unité suivante puis tour suivant (<b>⇧ Entrée</b> force la fin du tour) · <b>Espace</b> passer · <b>F</b> fortifier · <b>B</b> fonder · <b>R</b> route · <b>A</b> automatiser · <b>E</b> explorer · <b>U</b> améliorer l’unité · <b>T</b> technologies · <b>P</b> doctrines · <b>D</b> nations · <b>Tab</b> unité suivante · <b>C</b> centrer · <b>G</b> grille · flèches et <b>+ / −</b> : carte.</p>
  <h3>Sur téléphone</h3>
  <p>Touchez une unité, puis une case : le trajet ou le combat prévu s’affiche ; touchez à nouveau pour confirmer. Glissez pour déplacer la carte, pincez pour zoomer, appuyez longuement sur une case pour la décrire.</p>
  <h3>Règles essentielles</h3>
  <p><b>Villes</b> : elles exploitent les cases de leur territoire (rayon 3), grandissent avec la nourriture et étendent leurs frontières grâce à la culture. Une case exploitée est marquée d’un point dans la fenêtre de la ville.</p>
  <p><b>Bonheur</b> : chaque ville et chaque habitant le font baisser ; les ressources de luxe exploitées, temples, colisées et stades le font monter. En dessous de zéro, la croissance ralentit ; sous −10, elle s’arrête et l’armée faiblit.</p>
  <p><b>Combat</b> : la force, les blessures, le relief (collines, forêts +3), la fortification (+4) et les alliés autour de la cible (+2 chacun) comptent. Les unités à distance tirent sans riposte. Les engins de siège sont redoutables contre les villes. Une ville tombe quand ses PV sont à zéro et qu’une unité de mêlée y entre.</p>
  <p><b>Mer</b> : la Navigation à voile permet d’embarquer sur la côte, l’Astronomie de traverser l’océan. Une unité embarquée est très vulnérable.</p>
  <p><b>Victoire</b> : prendre toutes les capitales d’origine, construire l’Arche stellaire, ou avoir le meilleur score à la fin (${esc(annee(G ? G.toursMax : 320))}).</p>
  <div class="pied"><button class="btn principal" data-act="fermer">Compris</button></div>`);
}
function montrerFin() {
  const f = G.fin;
  if (!f) return;
  selectionner(null);
  const c = moi(), gagnant = f.civ >= 0 ? G.civs[f.civ] : null, moiGagne = gagnant && gagnant.n === G.joueur;
  const quoi = { domination: 'par la conquête', science: 'grâce à l’Arche stellaire', score: 'au score', elimine: '' }[f.type];
  const titre = f.type === 'elimine' ? 'Votre peuple a disparu' : moiGagne ? 'Victoire !' : 'Défaite';
  const classement = G.civs.filter(d => !d.barbare).sort((a, b) => scoreCiv(b) - scoreCiv(a)).map(d => `<div class="nation"><span class="pastille" style="background:${d.couleur}"></span><div><b>${esc(d.nom)}</b>${d.n === G.joueur ? ' (vous)' : ''}<br><small class="num">${d.elimine ? 'disparus' : `${villesDe(d.n).length} villes · ${Object.keys(d.techs).length} technologies`}</small></div><b class="num">${scoreCiv(d)}</b></div>`).join('');
  ouvrirModale(titre, `<p>${f.type === 'elimine' ? 'Votre dernière ville est tombée. L’histoire retiendra votre nom.' : `${moiGagne ? 'Votre nation' : `Les ${esc(gagnant ? gagnant.nom : '')}`} l’emporte${moiGagne ? '' : 'nt'} ${esc(quoi)} en ${esc(annee(G.tour))}.`}</p>
    <h3>Classement</h3>${classement}
    <div class="pied">${f.type !== 'elimine' && c && !c.elimine ? '<button class="btn" data-act="encore">Continuer à jouer</button>' : ''}<button class="btn principal" data-act="titre">Nouvelle partie</button></div>`);
}

/* ---------- Clics dans les fenêtres et panneaux ---------- */
function initClics() {
  document.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (b.closest('#unite') && d.act) { if (d.act === 'fermerUnite') selectionner(null); else actionUnite(d.act); return; }
    if (d.act) return actionGenerale(d.act);
    if (d.focus) { const v = G.villes.find(x => x.id === UI.ville); v.focus = d.focus; assignerTuiles(v); rendreVille(v); majSurbrillance(); majHUD(); return; }
    if (d.item) {
      const v = G.villes.find(x => x.id === UI.ville), [k, id] = d.item.split(':');
      definirProduction(v, { k, id });
      rendreVille(v); majHUD();
      if (window.innerWidth <= 760) setTimeout(fermerModale, 150);
      return;
    }
    if (d.acheter) { const v = G.villes.find(x => x.id === UI.ville); if (acheter(v)) { toast(`${v.nom} : achat effectué`, v.i, 'bon'); afficherNotifs(); } rendreVille(v); majHUD(); return; }
    if (d.tir) { const v = G.villes.find(x => x.id === UI.ville); fermerModale(); UI.modeTir = v.id; majSurbrillance(); R.sale = true; toast('Touchez une unité ennemie entourée de rouge'); return; }
    if (d.tech) { const c = moi(); if (!c.techs[d.tech]) { choisirRecherche(c, d.tech); avancerRecherche(c); majHUD(); fermerModale(); } return; }
    if (d.doctrine) { const c = moi(); if (prendreDoctrine(c, d.doctrine)) { afficherNotifs(); majHUD(); ouvrirDoctrines(); } return; }
    if (d.guerre !== undefined) {
      const n = Number(d.guerre);
      if (UI.confirmeGuerre !== n) { UI.confirmeGuerre = n; ouvrirDiplomatie(); return; }
      UI.confirmeGuerre = null; declarerGuerre(G.joueur, n); afficherNotifs(); majHUD(); ouvrirDiplomatie(); return;
    }
    if (d.paixprop !== undefined) {
      const ai = G.civs[Number(d.paixprop)];
      if (veutPaix(ai, moi())) { faireLaPaix(G.joueur, ai.n); afficherNotifs(); toast(`Les ${ai.nom} acceptent la paix`, null, 'diplo'); }
      else toast(`Les ${ai.nom} refusent : ils pensent encore gagner cette guerre`, null, 'mal');
      majHUD(); ouvrirDiplomatie(); R.sale = true; return;
    }
    if (d.paix !== undefined) { faireLaPaix(G.joueur, Number(d.paix)); afficherNotifs(); fermerModale(); majHUD(); R.sale = true; return; }
    if (d.centre !== undefined) { if (d.centre !== '') { fermerModale(); centrerSur(Number(d.centre)); } return; }
  });
  $('#m-fermer').addEventListener('click', fermerModale);
  $('#modale').addEventListener('pointerdown', e => { if (e.target.id === 'modale' && !$('#modale').classList.contains('cote')) fermerModale(); });
  $('#b-tour').addEventListener('click', () => finirTour(false));
  $('#b-forcer').addEventListener('click', () => finirTour(true));
  $('#b-sci').addEventListener('click', () => ouvrirTechs());
  $('#b-cult').addEventListener('click', () => ouvrirDoctrines());
  $('#b-diplo').addEventListener('click', ouvrirDiplomatie);
  $('#b-menu').addEventListener('click', ouvrirMenu);
  $('#b-mini').addEventListener('click', () => { $('#mini-boite').classList.toggle('ouvert'); R.miniSale = true; R.sale = true; });
  $('#b-or').addEventListener('click', () => {
    const c = moi(), rv = revenus(c);
    toast(`Or : +${rv.oBrut} des villes, −${rv.ent.bat} d’entretien des bâtiments, −${rv.ent.unites} pour les unités au-delà des ${3 + villesDe(c.n).length} gratuites`);
  });
  $('#b-bonheur').addEventListener('click', () => {
    const b = calculBonheur(moi());
    toast(`Bonheur ${b.total} : base ${b.base}, luxes ${signe(b.luxes)}${b.luxeListe.length ? ` (${b.luxeListe.map(r => RESSOURCES[r].nom).join(', ')})` : ''}, bâtiments ${signe(b.batiments)}, empire ${signe(b.empire)}, villes ${b.villes}, population ${b.population}`);
  });
}
function actionGenerale(a) {
  switch (a) {
    case 'fermer': fermerModale(); break;
    case 'sauver': { const ok = sauvegarder(); toast(ok ? 'Partie enregistrée' : 'Impossible d’enregistrer dans ce navigateur', null, ok ? 'bon' : 'mal'); fermerModale(); break; }
    case 'journal': ouvrirJournal(); break;
    case 'aide': ouvrirAide(); break;
    case 'grille': Prefs.grille = !Prefs.grille; R.grille = Prefs.grille; garderPrefs(); R.sale = true; ouvrirMenu(); break;
    case 'qualite': Prefs.qualite = Prefs.qualite === 'eco' ? 'haute' : 'eco'; garderPrefs(); R.blocs.clear(); R.vignette = null; R.sale = true; ouvrirMenu(); break;
    case 'cycle': Prefs.autoCycle = !Prefs.autoCycle; garderPrefs(); ouvrirMenu(); break;
    case 'plein': try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => toast('Plein écran indisponible ici')); } catch (e) { toast('Plein écran indisponible ici'); } fermerModale(); break;
    case 'titre': fermerModale(); afficherTitre(); break;
    case 'encore': G.fin = null; G.toursMax = Infinity; G.prolonge = true; fermerModale(); majHUD(); break;
  }
}

/* ---------- Sauvegarde ---------- */
function sauvegarder() {
  if (!G || G.joueur < 0 || G.fin && G.fin.type === 'elimine') return false;
  return ecrire(CLE_PARTIE, exporter());
}

/* ---------- Écran titre ---------- */
function afficherTitre() {
  UI.titre = true; UI.sel = null; UI.ville = null;
  $('#titre').hidden = false; $('#barre').hidden = true; $('#bas').hidden = true; $('#unite').hidden = true;
  $('#modale').hidden = true; $('#notifs').innerHTML = '';
  $('#reglage').hidden = true;
  $('#b-continuer').hidden = !lire(CLE_PARTIE);
  const types = Object.keys(TYPES_CARTE);
  nouvellePartie({ taille: 'petite', type: types[Math.floor(Math.random() * types.length)], tousIA: true });
  for (let k = 0; k < 12; k++) finDuTour();
  R.toutVoir = true; R.surbrillance = null; R.cam.z = Math.max(0.55, Math.min(1, window.innerWidth / 1500)); R.miniSale = true;
  const m = tailleMonde();
  R.cam.x = (m.w - R.larg / R.cam.z) / 2 - 200; R.cam.y = (m.h - R.haut / R.cam.z) / 2;
  R.sale = true;
  const defiler = () => { if (!UI.titre) return; R.cam.x += 0.25 / R.cam.z; if (R.cam.x > m.w - R.larg / R.cam.z) R.cam.x = 0; R.sale = true; requestAnimationFrame(defiler); };
  if (!Prefs.reduit) requestAnimationFrame(defiler);
}
function remplirReglage() {
  const r = UI.reglage;
  $('#choix-nation').innerHTML = CIVS.map(c => `<button class="nat ${r.civ === c.id ? 'actif' : ''}" data-nat="${c.id}"><b><span class="pastille" style="background:${c.couleur}"></span>${esc(c.nom)}</b><small>${esc(c.txt)}</small></button>`).join('');
  const seg = (el, obj, cle, extra) => { $(el).innerHTML = Object.entries(obj).map(([k, v]) => `<button data-reg="${cle}:${k}" class="${r[cle] === k ? 'actif' : ''}">${esc(v.nom)}${extra ? `<br><small>${esc(extra(v))}</small>` : ''}</button>`).join(''); };
  seg('#choix-taille', TAILLES, 'taille', v => `${v.civs} nations`);
  seg('#choix-type', TYPES_CARTE, 'type');
  seg('#choix-difficulte', DIFFICULTES, 'difficulte');
  seg('#choix-vitesse', VITESSES, 'vitesse', v => `${v.tours} tours`);
}
function lancer(opts) {
  nouvellePartie(opts);
  demarrerAffichage();
  ecrire(CLE_PARTIE, exporter());
}
function demarrerAffichage() {
  UI.titre = false; UI.sel = null; UI.ville = null; UI.cible = -1; UI.vuJ = G.nJ || 0;
  R.toutVoir = false; R.grille = Prefs.grille; R.anims.clear(); R.textes = []; R.miniSale = true;
  $('#titre').hidden = true; $('#barre').hidden = false; $('#bas').hidden = false;
  R.cam.z = window.innerWidth < 760 ? 1.05 : 1.15;
  const m = tailleMonde();
  R.mini.width = 200; R.mini.height = Math.round(200 * m.h / m.w); R.miniCache = null;
  const colon = unitesDe(G.joueur)[0];
  const cible = colon ? colon.i : (villesDe(G.joueur)[0] || {}).i;
  if (cible !== undefined) centrerSur(cible, false);
  majHUD();
  const n = besoins()[0];
  if (n && !G.popups.length) selectionner(n, true);
  traiterPopups();
  if (G.fin) montrerFin();
}
function initTitre() {
  $('#v-version').textContent = `Version ${AUBE_VERSION} · partie enregistrée dans ce navigateur`;
  $('#b-nouvelle').addEventListener('click', () => { remplirReglage(); $('#reglage').hidden = false; $('#reglage').scrollIntoView({ behavior: Prefs.reduit ? 'auto' : 'smooth', block: 'start' }); });
  $('#b-aide-titre').addEventListener('click', () => { UI.titreAide = true; ouvrirAide(); });
  $('#b-continuer').addEventListener('click', () => {
    try { importer(lire(CLE_PARTIE)); demarrerAffichage(); }
    catch (e) { toast('La sauvegarde est illisible : commencez une nouvelle partie', null, 'mal'); $('#b-continuer').hidden = true; }
  });
  $('#reglage').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.nat) { UI.reglage.civ = b.dataset.nat; remplirReglage(); }
    if (b.dataset.reg) { const [k, v] = b.dataset.reg.split(':'); UI.reglage[k] = v; remplirReglage(); }
    if (b.id === 'b-commencer') lancer(Object.assign({}, UI.reglage));
  });
}

/* ---------- Démarrage ---------- */
function demarrer() {
  initRendu($('#carte'), $('#minicarte'));
  R.grille = Prefs.grille;
  initEntrees(); initClics(); initTitre();
  afficherTitre();
  /* Sauvegarde quand l'application passe en arrière-plan (téléphone). */
  document.addEventListener('visibilitychange', () => { if (document.hidden && !UI.titre) sauvegarder(); });
  window.addEventListener('pagehide', () => { if (!UI.titre) sauvegarder(); });
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer); else demarrer();
}
