/* Pack Commerçant — administration : rendez-vous et acomptes, tampons de fidélité (lien du QR code de la carte), avis, réglages. */
(() => {
  const P = window.PACK, S = window.PACKS, A = S.admin, O = S.outils, esc = window.PK.esc, $ = s => document.querySelector(s);
  const F = P.fidelite || { tampons: 8, recompense: '' };
  const params = new URLSearchParams(location.search), tamponDemande = (params.get('tampon') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  let RDV = [], CARTES = [];

  /* ---------- Connexion ---------- */
  const entrer = $('#entrer');
  if (!S.reel) entrer.textContent = 'Entrer (démonstration)';
  else entrer.textContent = 'Se connecter avec Google';
  entrer.addEventListener('click', async () => {
    const err = $('#err'); err.hidden = true; entrer.disabled = true;
    try { await A.connexion(); await tout(); $('#login').hidden = true; $('#app').hidden = false; if (tamponDemande) onglet('fid'); }
    catch (e) { entrer.disabled = false; err.textContent = e.status === 403 || e.message === 'refuse' ? 'Ce compte Google n’a pas accès à cet espace.' : 'Connexion impossible. Réessayez.'; err.hidden = false; }
  });
  // Données venues du public : nombres forcés, identifiants et statuts limités à des valeurs connues (aucun HTML possible)
  const sur = s => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '');
  const normRdv = r => ({ ...r, id: sur(r.id), prix: +r.prix || 0, duree: +r.duree || 0, acompte: +r.acompte || 0, acompteRecu: r.acompteRecu === true,
    statut: ['attente', 'confirme', 'fait', 'annule'].includes(r.statut) ? r.statut : 'attente', date: String(r.date || ''), heure: String(r.heure || '') });
  const normCarte = c => ({ ...c, id: sur(c.id), tampons: Math.max(0, +c.tampons || 0), recompenses: Math.max(0, +c.recompenses || 0) });
  const chargerRdv = async () => (await A.rdv()).map(normRdv), chargerCartes = async () => (await A.cartes()).map(normCarte);
  // Abonnement hébergé (pro/) : bandeau d'essai ou d'abonnement, réglages modifiables par le commerçant (pro/pro.js)
  const PRO = P.heberge && window.PK_PRO;
  async function tout() {
    [RDV, CARTES] = await Promise.all([chargerRdv(), chargerCartes()]); vueRdv(); vueFid(); vueAvis(); vueReglages();
    if (PRO && !$('#pro-bandeau')) $('#app').insertAdjacentHTML('afterbegin', `<div id="pro-bandeau">${PRO.bandeau(P)}</div>`);
  }
  function onglet(t) {
    document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    ['rdv', 'fid', 'avis', 'reglages'].forEach(x => { $('#t-' + x).hidden = x !== t; });
  }
  document.querySelector('.pk-tabs').addEventListener('click', e => { const b = e.target.closest('[role=tab]'); if (b) onglet(b.dataset.t); });

  /* ---------- Rendez-vous ---------- */
  const aujourd = O.iso(new Date());
  const ETAT = { attente: ['Acompte attendu', 'chip-accent'], confirme: ['Confirmé', 'chip-ok'], fait: ['Venu', ''], annule: ['Annulé', ''] };
  function carteRdv(r) {
    const [lib0, cl] = ETAT[r.statut] || ETAT.attente, lib = r.statut === 'attente' && !r.acompte ? 'À confirmer' : lib0, passe = r.date < aujourd, msg = k => S.messages[k](r);
    const liens = (k, label) => `<a class="btn btn-ghost btn-sm" href="${esc(S.whatsapp(r.tel, msg(k)))}" target="_blank" rel="noopener">${label} WhatsApp</a><a class="btn btn-ghost btn-sm" href="${esc(S.sms(r.tel, msg(k)))}">${label} SMS</a>`;
    const act = [];
    if (r.statut === 'attente') act.push(`<button class="btn btn-accent btn-sm" data-a="acompte" data-id="${r.id}">${r.acompte ? `Acompte de ${O.euros(r.acompte)} reçu` : 'Confirmer'}</button>`);
    if (r.statut === 'confirme' && r.acompteRecu) act.push(liens('acompte', 'Reçu par'));
    if (!passe && r.statut !== 'annule' && r.statut !== 'fait') act.push(liens('rappel', 'Rappel par'));
    if (r.statut !== 'annule' && r.statut !== 'fait' && r.date <= aujourd) act.push(`<button class="btn btn-ghost btn-sm" data-a="fait" data-id="${r.id}">Client venu</button>`);
    if (r.statut === 'fait' && (P.avis || {}).lien) act.push(liens('avis', 'Avis par'));
    if (r.statut !== 'annule' && r.statut !== 'fait') act.push(`<button class="btn btn-ghost btn-sm" data-a="annuler" data-id="${r.id}">Annuler</button>`);
    return `<article class="pk-rdv ${r.statut}"><header><b>${esc(O.dateLongue(r.date))} · ${esc(r.heure.replace(':', 'h'))}</b><span class="chip ${cl}">${lib}</span></header>
      <div>${esc(r.prestation)} · ${r.duree} min · ${O.euros(r.prix)}${r.acompte ? ` (acompte ${O.euros(r.acompte)}${r.acompteRecu ? ' reçu' : ''})` : ''}</div>
      <div><b>${esc(r.nom)}</b> · <a href="tel:${esc(String(r.tel).replace(/\s/g, ''))}">${esc(r.tel)}</a>${r.email ? ' · ' + esc(r.email) : ''}</div>
      ${r.note ? `<div class="muted">« ${esc(r.note)} »</div>` : ''}<div class="act">${act.join('')}</div></article>`;
  }
  function vueRdv() {
    const tri = (a, b) => (a.date + a.heure).localeCompare(b.date + b.heure);
    const venir = RDV.filter(r => r.date >= aujourd && r.statut !== 'annule').sort(tri), passes = RDV.filter(r => r.date < aujourd || r.statut === 'annule').sort(tri).reverse().slice(0, 40);
    const attente = venir.filter(r => r.statut === 'attente').length;
    $('#t-rdv').innerHTML = `<div style="display:flex;gap:var(--s-6);flex-wrap:wrap;margin-bottom:var(--s-5)"><div><b style="font:700 var(--t-2xl) var(--f-display)">${venir.filter(r => r.date === aujourd).length}</b><div class="muted">aujourd’hui</div></div><div><b style="font:700 var(--t-2xl) var(--f-display)">${venir.length}</b><div class="muted">à venir</div></div><div><b style="font:700 var(--t-2xl) var(--f-display)">${attente}</b><div class="muted">acompte attendu</div></div></div>
      <h2 style="font-size:var(--t-lg)">À venir</h2><div class="pk-liste">${venir.map(carteRdv).join('') || '<p class="pk-vide">Aucun rendez-vous à venir.</p>'}</div>
      <h2 style="font-size:var(--t-lg);margin-top:var(--s-7)">Passés et annulés</h2><div class="pk-liste">${passes.map(carteRdv).join('') || '<p class="pk-vide">Rien pour le moment.</p>'}</div>
      <button class="btn btn-ghost btn-sm" id="actualiser" style="margin-top:var(--s-5)">Actualiser</button>`;
  }
  $('#t-rdv').addEventListener('click', async e => {
    if (e.target.id === 'actualiser') { RDV = await chargerRdv(); return vueRdv(); }
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const r = RDV.find(x => x.id === b.dataset.id); if (!r) return;
    if (b.dataset.a === 'annuler' && !confirm(`Annuler le rendez-vous de ${r.nom} et libérer le créneau ?`)) return;
    b.disabled = true;
    try {
      if (b.dataset.a === 'acompte') { const ch = { statut: 'confirme', acompteRecu: !!r.acompte }; await A.majRdv(r.id, ch); Object.assign(r, ch); }
      if (b.dataset.a === 'fait') { await A.majRdv(r.id, { statut: 'fait' }); r.statut = 'fait'; }
      if (b.dataset.a === 'annuler') { await A.majRdv(r.id, { statut: 'annule' }); await A.liberer(r); r.statut = 'annule'; }
      vueRdv();
    } catch (x) { b.disabled = false; alert('L’enregistrement a échoué. Vérifiez la connexion.'); }
  });

  /* ---------- Fidélité ---------- */
  function vueFid(msg) {
    const c = tamponDemande && CARTES.find(x => x.id === tamponDemande);
    const bloc = tamponDemande ? (c ? `<article class="card" style="display:grid;gap:var(--s-4)" id="carte-scan"><span class="eyebrow">Carte scannée</span>
        <h2 style="margin:0">${esc(c.prenom)} · ${c.tampons}/${F.tampons} tampons</h2>
        <div class="pk-carte">${Array.from({ length: F.tampons }, (_, i) => `<span class="${i < c.tampons ? 'on' : ''}">${i < c.tampons ? '✓' : i + 1}</span>`).join('')}</div>
        ${msg ? `<p class="notice">${msg}</p>` : ''}
        ${c.tampons >= F.tampons ? `<p style="margin:0"><b>Carte complète :</b> ${esc(F.recompense)}.</p><button class="btn btn-accent" data-f="recompense" data-id="${c.id}">Récompense donnée, nouvelle carte</button>`
          : `<button class="btn btn-accent" data-f="tampon" data-id="${c.id}">Ajouter un tampon</button>`}</article>`
      : '<p class="notice warn">Carte introuvable : elle a peut-être été supprimée.</p>') : '';
    $('#t-fid').innerHTML = `${bloc}
      <div class="card" style="margin-top:var(--s-5)"><h2 style="font-size:var(--t-lg);margin-top:0">Ajouter un tampon</h2>
        <p class="muted">Le plus simple : scannez le QR code de la carte du client avec l’appareil photo de votre téléphone (connecté à cet espace). Sinon, tapez les 8 premiers caractères du code.</p>
        <form id="cherche" style="display:flex;gap:10px;flex-wrap:wrap"><input class="input" id="code" placeholder="Code de la carte" maxlength="12" style="max-width:220px;text-transform:uppercase"><button class="btn btn-ghost">Ouvrir</button></form></div>
      <h2 style="font-size:var(--t-lg);margin-top:var(--s-6)">${CARTES.length} carte${CARTES.length > 1 ? 's' : ''}</h2>
      <div class="pk-liste">${CARTES.slice().sort((a, b) => (b.tampons - a.tampons)).map(x => `<a class="pk-rdv" style="text-decoration:none;color:inherit" href="${window.PK.q({ tampon: x.id })}"><header><b>${esc(x.prenom)}</b><span class="chip">${x.tampons}/${F.tampons}${x.recompenses ? ` · ${x.recompenses} récompense${x.recompenses > 1 ? 's' : ''}` : ''}</span></header><span class="muted">${esc(x.id.slice(0, 4) + ' ' + x.id.slice(4, 8))}</span></a>`).join('') || '<p class="pk-vide">Aucune carte pour le moment.</p>'}</div>`;
  }
  $('#t-fid').addEventListener('click', async e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    const c = CARTES.find(x => x.id === b.dataset.id); b.disabled = true;
    try {
      if (b.dataset.f === 'tampon') { const t = Math.min(F.tampons, c.tampons + 1); await A.majCarte(c.id, { tampons: t }); c.tampons = t; vueFid('Tampon ajouté.'); }
      else { const ch = { tampons: 0, recompenses: (c.recompenses || 0) + 1 }; await A.majCarte(c.id, ch); Object.assign(c, ch); vueFid('Récompense enregistrée : la carte repart à zéro.'); }
    } catch (x) { b.disabled = false; alert('L’enregistrement a échoué. Vérifiez la connexion.'); }
  });
  $('#t-fid').addEventListener('submit', e => {
    e.preventDefault(); const v = $('#code').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const c = v.length >= 8 && CARTES.find(x => x.id.startsWith(v));
    if (c) location.search = window.PK.q({ tampon: c.id }); else alert('Aucune carte ne correspond à ce code.');
  });

  /* ---------- Avis et réglages ---------- */
  function vueAvis() {
    const l = (P.avis || {}).lien;
    $('#t-avis').innerHTML = /^https:\/\//.test(l || '') ? `<div class="card" style="display:grid;gap:var(--s-4);justify-items:start">
        <h2 style="font-size:var(--t-lg);margin:0">Demander un avis Google</h2>
        <p class="muted" style="margin:0">Après chaque visite, le bouton « Avis par WhatsApp / SMS » d’un rendez-vous prépare le message avec votre lien. Proposez-le à <b>tous</b> vos clients, sans les choisir : c’est la règle pour des avis honnêtes.</p>
        <div class="pk-qr">${window.QR.svg(l, 200)}</div><a class="btn btn-accent" href="../affiche/" target="_blank">Imprimer l’affiche du comptoir</a></div>`
      : '<p class="notice warn">Ajoutez le lien « Laisser un avis » de votre fiche Google dans la configuration pour activer les demandes d’avis.</p>';
  }
  function vueReglages() {
    if (PRO) return PRO.reglages($('#t-reglages'), P, S);
    const a = P.acompte || {};
    $('#t-reglages').innerHTML = `<div class="card"><h2 style="font-size:var(--t-lg);margin-top:0">Votre configuration</h2><table style="width:100%;border-collapse:collapse">
      <tr><th style="text-align:left">Prestations</th><td>${P.prestations.map(p => esc(p.nom) + ' (' + O.euros(p.prix) + ')').join(', ')}</td></tr>
      <tr><th style="text-align:left">Acompte</th><td>${a.valeur ? (a.type === 'pourcent' ? a.valeur + ' %' : O.euros(a.valeur)) + (a.lien ? ' · lien de paiement réglé' : ' · <b>lien de paiement à ajouter</b>') : 'aucun'}</td></tr>
      <tr><th style="text-align:left">Fidélité</th><td>${F.tampons} tampons → ${esc(F.recompense)}</td></tr>
      <tr><th style="text-align:left">Données</th><td>${S.reel ? 'Firestore (' + esc(P.firebase.projectId) + ')' : 'démonstration, dans ce navigateur'}</td></tr></table>
      <p class="muted" style="font-size:var(--t-sm)">Pour changer un prix, un horaire ou une prestation, demandez-le à QuenTools : la modification est faite sous 48 h ouvrées.</p></div>`;
  }
})();
