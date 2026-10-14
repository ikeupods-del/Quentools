/* Pack Commerçant en abonnement (pro/) : un commerce s'inscrit seul, essaie 14 jours, puis s'abonne.
   Les pages (réservation, carte, espace commerçant, affiche) sont celles de demo/pack-commercant/, recopiées par tools/pack-pro.js ;
   ce fichier y lit la fiche du commerce dans Firestore (projet QuenTools, document qt_pack/<adresse>), la nettoie, puis lance leurs scripts.
   Il fournit aussi le formulaire de la fiche (inscription et réglages), sa validation et l'état de l'abonnement (qt_pack_abos/<adresse>).
   Sécurité : la fiche est écrite par le commerçant ; tout ce qui s'affiche passe par normaliser() (types forcés, liens limités à PayPal,
   Stripe et Google) et les règles Firestore (administration QuenTools → Règles). */
(() => {
  const QT = window.QT || {}, F = QT.firebase || {};
  const ESSAI_JOURS = 14, ADRESSE = /^[a-z0-9][a-z0-9-]{2,39}$/;
  const CLES = ['nom', 'metier', 'ville', 'accroche', 'couleur', 'telephone', 'email', 'adresse', 'horaires', 'pas', 'delaiMin', 'jours', 'prestations', 'acompte', 'annulation', 'fidelite', 'avis'];
  const RESERVEES = ['admin', 'inscription', 'carte', 'affiche', 'conditions', 'demo', 'quentools', 'test', 'www'];
  const ici = document.currentScript, racine = new URL('./', ici ? ici.src : location.href).pathname;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Fiche du commerce : nettoyage (tout ce que le public verra) ---------- */
  const txt = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const ent = (v, a, b, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.min(b, Math.max(a, n)) : d; };
  const prix = v => { const n = Math.round(+String(v ?? '').replace(',', '.') * 100) / 100; return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : 0; };
  const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const plageOk = p => { const m = String(p).match(/^(\d\d:\d\d)-(\d\d:\d\d)$/); return !!m && HEURE.test(m[1]) && HEURE.test(m[2]) && m[1] < m[2]; };
  // Liens acceptés : paiement PayPal ou Stripe, avis Google (jamais de lien vers un site inconnu sur une page QuenTools)
  const lienPaiementOk = l => /^https:\/\/(www\.)?paypal\.me\/[A-Za-z0-9_.-]+\/?$/.test(l) || /^https:\/\/(buy|checkout|donate)\.stripe\.com\/[A-Za-z0-9_/-]+$/.test(l);
  const lienAvisOk = l => /^https:\/\/(g\.page|maps\.app\.goo\.gl|goo\.gl|search\.google\.com|www\.google\.[a-z.]+|maps\.google\.[a-z.]+)\/[^\s"'<>]*$/.test(l);
  const idDe = s => txt(s, 60).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  function normaliser(d) {
    d = d || {}; const pas = +d.pas === 15 ? 15 : 30, a = d.acompte || {}, f = d.fidelite || {}, vus = new Set();
    const horaires = {};
    for (let j = 1; j <= 7; j++) { const l = ((d.horaires || {})[j] || []).filter(plageOk).slice(0, 3); if (l.length) horaires[j] = l; }
    const prestations = (Array.isArray(d.prestations) ? d.prestations : []).slice(0, 30).map((p, i) => {
      let id = idDe(p && (p.id || p.nom)) || 'p' + (i + 1); while (vus.has(id)) id += '-' + (i + 1); vus.add(id);
      const du = ent(p && p.duree, pas, 480, 60);
      return { id, nom: txt(p && p.nom, 80), duree: du - du % pas || pas, prix: prix(p && p.prix) };
    }).filter(p => p.nom);
    const lien = txt(a.lien, 300), avis = txt((d.avis || {}).lien, 400);
    return {
      nom: txt(d.nom, 80), metier: txt(d.metier, 80), ville: txt(d.ville, 60), accroche: txt(d.accroche, 160) || 'Réservez en ligne, à toute heure.',
      couleur: /^#[0-9a-f]{6}$/i.test(d.couleur || '') ? d.couleur : '#5b3df5', telephone: txt(d.telephone, 20), email: txt(d.email, 120), adresse: txt(d.adresse, 160),
      horaires, pas, delaiMin: ent(d.delaiMin, 0, 72, 2), jours: ent(d.jours, 1, 90, 21), prestations,
      acompte: { type: a.type === 'pourcent' ? 'pourcent' : 'fixe', valeur: a.type === 'pourcent' ? ent(a.valeur, 0, 100, 0) : prix(a.valeur), lien: lienPaiementOk(lien) ? lien : '' },
      annulation: txt(d.annulation, 300), fidelite: { tampons: ent(f.tampons, 3, 20, 8), recompense: txt(f.recompense, 80) || 'une prestation offerte' },
      avis: { lien: lienAvisOk(avis) ? avis : '' }
    };
  }
  // Fautes à corriger avant d'enregistrer (mêmes exigences que tools/pack-commercant.js pour un client installé à la main)
  function valider(d) {
    const fautes = [], a = d.acompte || {};
    if (!txt(d.nom, 80)) fautes.push('Indiquez le nom du commerce.');
    if (String(d.telephone || '').replace(/\D/g, '').length < 9) fautes.push('Indiquez un numéro de téléphone.');
    if (!/^#[0-9a-f]{6}$/i.test(d.couleur || '')) fautes.push('Choisissez une couleur.');
    const p = (d.prestations || []).filter(x => txt(x.nom, 80));
    if (!p.length) fautes.push('Ajoutez au moins une prestation.');
    for (const x of p) { if (!(+x.duree > 0) || +x.duree % (+d.pas === 15 ? 15 : 30)) fautes.push(`« ${txt(x.nom, 80)} » : durée à choisir dans la liste.`); if (String(x.prix).trim() === '' || !(prix(x.prix) >= 0)) fautes.push(`« ${txt(x.nom, 80)} » : prix manquant.`); }
    let ouvert = false;
    for (let j = 1; j <= 7; j++) for (const pl of (d.horaires || {})[j] || []) { if (!plageOk(pl)) fautes.push(`Horaires : la plage « ${pl.replace('-', ' – ')} » doit finir après son début.`); else ouvert = true; }
    if (!ouvert) fautes.push('Indiquez au moins un jour d’ouverture.');
    if (+a.valeur > 0 && a.lien && !lienPaiementOk(String(a.lien).trim())) fautes.push('Lien de paiement : adresse paypal.me ou lien de paiement Stripe (buy.stripe.com) uniquement.');
    if (a.type === 'pourcent' && +a.valeur > 100) fautes.push('Acompte : 100 % au maximum.');
    const av = String((d.avis || {}).lien || '').trim(); if (av && !lienAvisOk(av)) fautes.push('Lien d’avis : copiez le lien « Demander des avis » de votre fiche Google (g.page/… ou maps.app.goo.gl/…).');
    if (d.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) fautes.push('L’adresse e-mail semble incomplète.');
    return fautes;
  }
  const adresseDe = nom => idDe(nom).slice(0, 40).replace(/-+$/, '');
  const adresseOk = s => ADRESSE.test(s || '') && !RESERVEES.includes(s);

  /* ---------- Abonnement : essai de 14 jours à partir de la création, puis date payée (qt_pack_abos) ---------- */
  function etat(fiche, abo, maintenant = Date.now()) {
    const cree = Date.parse((fiche || {}).cree || '') || maintenant, finEssai = cree + ESSAI_JOURS * 864e5, jusqu = Date.parse((abo || {}).jusquau || '') || 0;
    const paye = jusqu > maintenant, essai = !paye && finEssai > maintenant;
    return { actif: paye || essai, paye, essai, finEssai: new Date(finEssai), jusquau: jusqu ? new Date(jusqu) : null, joursRestants: Math.max(0, Math.ceil(((paye ? jusqu : finEssai) - maintenant) / 864e5)) };
  }
  const prixMensuel = () => { const t = ((window.QTT || {}).templates || []).find(x => x.id === 'pack'); return t ? t.monthly : 39; };
  const lienAbonnement = adresse => { const l = String(QT.packAbonnement || ''); if (!/^https:\/\//.test(l)) return ''; const u = new URL(l); u.searchParams.set('client_reference_id', adresse); return u.href; };

  /* ---------- Lecture d'un document (sans connexion) ---------- */
  const unval = v => 'stringValue' in v ? v.stringValue : 'booleanValue' in v ? v.booleanValue : 'integerValue' in v ? +v.integerValue : 'doubleValue' in v ? v.doubleValue
    : 'timestampValue' in v ? v.timestampValue : 'mapValue' in v ? champs((v.mapValue || {}).fields) : 'arrayValue' in v ? ((v.arrayValue || {}).values || []).map(unval) : null;
  const champs = f => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, unval(v)]));
  const docs = `https://firestore.googleapis.com/v1/projects/${F.projectId}/databases/(default)/documents/`;
  async function lireDoc(chemin) {
    const r = await fetch(docs + chemin + '?key=' + F.apiKey);
    if (r.status === 404) return null; if (!r.ok) throw new Error('erreur ' + r.status);
    return champs((await r.json()).fields);
  }

  /* ---------- Pages hébergées : fiche lue, puis scripts de la page lancés dans l'ordre ---------- */
  async function charger() {
    document.documentElement.classList.add('pk-charge');
    const adresse = new URLSearchParams(location.search).get('c') || '';
    const fin = () => document.documentElement.classList.remove('pk-charge');
    const introuvable = msg => { document.body.innerHTML = `<main class="section"><div class="wrap" style="max-width:560px"><h1 class="h-section">${esc(msg)}</h1>
      <p class="muted">Vérifiez l’adresse donnée par le commerce.</p><p><a class="btn btn-ghost" href="${racine}inscription/">Vous êtes commerçant ? Créer votre page</a></p></div></main>`; fin(); };
    if (!document.body) await new Promise(r => document.addEventListener('DOMContentLoaded', r));
    if (!adresse) { location.replace(racine + 'inscription/'); return; }
    if (!adresseOk(adresse)) return introuvable('Page introuvable');
    let fiche, abo;
    try { [fiche, abo] = await Promise.all([lireDoc('qt_pack/' + adresse), lireDoc('qt_pack_abos/' + adresse).catch(() => null)]); }
    catch (e) { return introuvable('Page momentanément indisponible'); }
    if (!fiche) return introuvable('Page introuvable');
    const e = etat(fiche, abo);
    window.PACK = { ...normaliser(fiche), demo: false, heberge: adresse, chemin: 'qt_pack/' + adresse, racine, firebase: F, inactif: !e.actif, abonnement: e, uid: fiche.uid || '' };
    for (const s of [...document.querySelectorAll('script[type="text/x-pk"]')]) {
      const n = document.createElement('script');
      if (s.src) { n.src = s.src; await new Promise((ok, ko) => { n.onload = ok; n.onerror = ko; document.body.appendChild(n); }); }
      else { n.textContent = s.textContent; document.body.appendChild(n); }
    }
    fin();
  }

  /* ---------- Formulaire de la fiche (inscription et réglages) ---------- */
  const JOURS = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const DUREES = pas => Array.from({ length: Math.floor(240 / pas) }, (_, i) => (i + 1) * pas);
  const COULEURS = ['#b4436c', '#5b3df5', '#0f766e', '#1d4ed8', '#c2410c', '#111827', '#9333ea', '#15803d'];
  const ligneP = (p, pas) => `<div class="pro-prest"><input aria-label="Prestation" placeholder="Ex. Coupe femme" maxlength="80" data-k="nom" value="${esc(p.nom || '')}">
    <select aria-label="Durée" data-k="duree">${DUREES(pas).map(d => `<option value="${d}"${+p.duree === d ? ' selected' : ''}>${d >= 60 ? Math.floor(d / 60) + ' h' + (d % 60 ? ' ' + d % 60 : '') : d + ' min'}</option>`).join('')}</select>
    <label class="pro-euro"><input aria-label="Prix en euros" inputmode="decimal" placeholder="Prix" data-k="prix" value="${p.prix ?? ''}"><span>€</span></label>
    <button type="button" class="btn btn-ghost btn-sm" data-pro="moins" aria-label="Retirer">✕</button></div>`;
  const ligneJ = (j, plages) => { const [a, b] = [(plages[0] || '').split('-'), (plages[1] || '').split('-')];
    return `<div class="pro-jour" data-j="${j}"><label class="check"><input type="checkbox" data-k="ouvert"${plages.length ? ' checked' : ''}> <span>${JOURS[j]}</span></label>
      <span class="pro-plages"><input type="time" aria-label="${JOURS[j]} : ouverture" data-k="a1" value="${a[0] || '09:00'}"> – <input type="time" aria-label="${JOURS[j]} : fermeture ou pause" data-k="a2" value="${a[1] || (b[0] ? '12:00' : '18:00')}">
      <span class="pro-et">et</span> <input type="time" aria-label="${JOURS[j]} : reprise (facultatif)" data-k="b1" value="${b[0] || ''}"> – <input type="time" aria-label="${JOURS[j]} : fermeture (facultatif)" data-k="b2" value="${b[1] || ''}"></span></div>`; };
  function formulaire(el, d, opts = {}) {
    d = d || {}; const a = d.acompte || {}, f = d.fidelite || {}, pas = +d.pas === 15 ? 15 : 30;
    const prest = (d.prestations && d.prestations.length ? d.prestations : [{ nom: '', duree: 60, prix: '' }]);
    const hor = d.horaires || { 2: ['09:00-12:00', '14:00-19:00'], 3: ['09:00-12:00', '14:00-19:00'], 4: ['09:00-12:00', '14:00-19:00'], 5: ['09:00-12:00', '14:00-19:00'], 6: ['09:00-17:00'] };
    el.innerHTML = `<fieldset class="pro-bloc"><legend>Votre commerce</legend>
        <div class="field"><label for="pro-nom">Nom du commerce</label><input id="pro-nom" data-c="nom" maxlength="80" required value="${esc(d.nom || '')}"></div>
        ${'adresse' in opts ? `<div class="field"><label for="pro-adresse">Adresse de votre page</label><div class="pro-url"><span>quentools.fr/pro/?c=</span><input id="pro-adresse" data-c="_adresse" maxlength="40" value="${esc(opts.adresse)}" autocapitalize="off" spellcheck="false"></div><small>Minuscules, chiffres et tirets. Elle ne pourra plus changer.</small></div>` : ''}
        <div class="pro-2"><div class="field"><label for="pro-metier">Activité</label><input id="pro-metier" data-c="metier" maxlength="80" placeholder="Ex. salon de coiffure" value="${esc(d.metier || '')}"></div>
        <div class="field"><label for="pro-ville">Ville</label><input id="pro-ville" data-c="ville" maxlength="60" value="${esc(d.ville || '')}"></div></div>
        <div class="field"><label for="pro-accroche">Phrase d’accueil</label><input id="pro-accroche" data-c="accroche" maxlength="160" placeholder="Réservez en ligne, à toute heure." value="${esc(d.accroche || '')}"></div>
        <div class="pro-2"><div class="field"><label for="pro-tel">Téléphone</label><input id="pro-tel" data-c="telephone" type="tel" maxlength="20" required value="${esc(d.telephone || '')}"></div>
        <div class="field"><label for="pro-email">E-mail (facultatif)</label><input id="pro-email" data-c="email" type="email" maxlength="120" value="${esc(d.email || '')}"></div></div>
        <div class="field"><label for="pro-adr">Adresse du commerce (facultatif)</label><input id="pro-adr" data-c="adresse" maxlength="160" value="${esc(d.adresse || '')}"></div>
        <div class="field"><span class="pro-lab">Couleur</span><div class="pro-couleurs">${COULEURS.map(c => `<label><input type="radio" name="pro-coul" value="${c}"${(d.couleur || COULEURS[0]) === c ? ' checked' : ''}><span style="background:${c}"></span></label>`).join('')}
          <label class="pro-autre"><input type="color" data-c="_couleur" aria-label="Autre couleur" value="${/^#[0-9a-f]{6}$/i.test(d.couleur || '') ? d.couleur : '#b4436c'}"> Autre</label></div></div></fieldset>
      <fieldset class="pro-bloc"><legend>Vos prestations</legend><p class="muted">Nom, durée et prix de chaque prestation proposée à la réservation.</p>
        <div class="field"><label for="pro-pas">Créneaux toutes les</label><select id="pro-pas" data-c="pas"><option value="30"${pas === 30 ? ' selected' : ''}>30 minutes</option><option value="15"${pas === 15 ? ' selected' : ''}>15 minutes</option></select></div>
        <div id="pro-prests">${prest.map(p => ligneP(p, pas)).join('')}</div><button type="button" class="btn btn-ghost btn-sm" data-pro="plus">+ Ajouter une prestation</button></fieldset>
      <fieldset class="pro-bloc"><legend>Vos horaires</legend><p class="muted">Cochez les jours d’ouverture. La seconde plage sert en cas de pause le midi.</p>
        <div id="pro-jours">${[1, 2, 3, 4, 5, 6, 7].map(j => ligneJ(j, hor[j] || [])).join('')}</div>
        <div class="pro-2"><div class="field"><label for="pro-delai">Réservation au plus tard</label><select id="pro-delai" data-c="delaiMin">${[0, 1, 2, 4, 12, 24, 48].map(h => `<option value="${h}"${(d.delaiMin ?? 2) === h ? ' selected' : ''}>${h ? h + ' h avant' : 'jusqu’au dernier moment'}</option>`).join('')}</select></div>
        <div class="field"><label for="pro-jrs">Réservation possible sur</label><select id="pro-jrs" data-c="jours">${[7, 14, 21, 30, 60, 90].map(n => `<option value="${n}"${(d.jours || 21) === n ? ' selected' : ''}>${n} jours</option>`).join('')}</select></div></div></fieldset>
      <fieldset class="pro-bloc"><legend>Acompte</legend><p class="muted">Le client paie par votre lien PayPal ou Stripe ; vous cliquez « Acompte reçu » dans votre espace après vérification.</p>
        <div class="pro-2"><div class="field"><label for="pro-at">Acompte demandé</label><select id="pro-at" data-c="_atype"><option value="aucun"${!+a.valeur ? ' selected' : ''}>Aucun</option><option value="fixe"${+a.valeur && a.type !== 'pourcent' ? ' selected' : ''}>Montant fixe (€)</option><option value="pourcent"${+a.valeur && a.type === 'pourcent' ? ' selected' : ''}>Pourcentage du prix (%)</option></select></div>
        <div class="field"><label for="pro-av">Montant ou pourcentage</label><input id="pro-av" data-c="_avaleur" inputmode="decimal" value="${+a.valeur || ''}"></div></div>
        <div class="field"><label for="pro-al">Votre lien de paiement</label><input id="pro-al" data-c="_alien" placeholder="https://paypal.me/VotreNom" maxlength="300" value="${esc(a.lien || '')}" autocapitalize="off" spellcheck="false"><small>paypal.me/… (le montant est ajouté tout seul) ou lien de paiement Stripe.</small></div>
        <div class="field"><label for="pro-ann">Conditions d’annulation</label><input id="pro-ann" data-c="annulation" maxlength="300" value="${esc(d.annulation ?? 'Annulation gratuite jusqu’à 24 h avant. Passé ce délai, l’acompte reste acquis.')}"></div></fieldset>
      <fieldset class="pro-bloc"><legend>Fidélité et avis</legend>
        <div class="pro-2"><div class="field"><label for="pro-tp">Tampons pour une récompense</label><select id="pro-tp" data-c="_tampons">${[4, 5, 6, 8, 10, 12].map(n => `<option${(f.tampons || 8) === n ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="pro-rec">Récompense</label><input id="pro-rec" data-c="_recompense" maxlength="80" placeholder="Ex. une coupe offerte" value="${esc(f.recompense || '')}"></div></div>
        <div class="field"><label for="pro-avis">Lien « Laisser un avis » de votre fiche Google (facultatif)</label><input id="pro-avis" data-c="_avis" maxlength="400" placeholder="https://g.page/r/…/review" value="${esc((d.avis || {}).lien || '')}" autocapitalize="off" spellcheck="false"><small>Google Business Profile → « Demander des avis » → copier le lien.</small></div></fieldset>`;
    const adr = el.querySelector('#pro-adresse'), nom = el.querySelector('#pro-nom');
    if (adr) { let touche = false; adr.addEventListener('input', () => { touche = true; adr.value = adr.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); }); nom.addEventListener('input', () => { if (!touche) adr.value = adresseDe(nom.value); }); }
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-pro]'); if (!b) return;
      const box = el.querySelector('#pro-prests'), p = +el.querySelector('#pro-pas').value;
      if (b.dataset.pro === 'plus' && box.children.length < 30) box.insertAdjacentHTML('beforeend', ligneP({ duree: 60 }, p));
      if (b.dataset.pro === 'moins' && box.children.length > 1) b.closest('.pro-prest').remove();
    });
    el.querySelector('#pro-pas').addEventListener('change', e => el.querySelectorAll('#pro-prests select').forEach(s => { const v = +s.value, p = +e.target.value; s.innerHTML = DUREES(p).map(x => `<option value="${x}"${x === v ? ' selected' : ''}>${x >= 60 ? Math.floor(x / 60) + ' h' + (x % 60 ? ' ' + x % 60 : '') : x + ' min'}</option>`).join(''); }));
    el.querySelector('[data-c="_couleur"]').addEventListener('input', () => el.querySelectorAll('[name=pro-coul]').forEach(r => { r.checked = false; }));
  }
  function lire(el) {
    const v = k => (el.querySelector(`[data-c="${k}"]`) || {}).value ?? '';
    const coul = el.querySelector('[name=pro-coul]:checked'), at = v('_atype');
    const horaires = {};
    el.querySelectorAll('.pro-jour').forEach(r => {
      const q = k => r.querySelector(`[data-k="${k}"]`).value; if (!r.querySelector('[data-k=ouvert]').checked) return;
      const l = [q('a1') && q('a2') ? q('a1') + '-' + q('a2') : '', q('b1') && q('b2') ? q('b1') + '-' + q('b2') : ''].filter(Boolean); if (l.length) horaires[r.dataset.j] = l;
    });
    return {
      nom: v('nom').trim(), metier: v('metier').trim(), ville: v('ville').trim(), accroche: v('accroche').trim(), telephone: v('telephone').trim(), email: v('email').trim(), adresse: v('adresse').trim(),
      couleur: coul ? coul.value : v('_couleur'), pas: +v('pas'), delaiMin: +v('delaiMin'), jours: +v('jours'), horaires,
      prestations: [...el.querySelectorAll('.pro-prest')].map(r => ({ nom: r.querySelector('[data-k=nom]').value.trim(), duree: +r.querySelector('[data-k=duree]').value, prix: r.querySelector('[data-k=prix]').value.trim() })).filter(p => p.nom),
      acompte: { type: at === 'pourcent' ? 'pourcent' : 'fixe', valeur: at === 'aucun' ? 0 : +String(v('_avaleur')).replace(',', '.') || 0, lien: v('_alien').trim() },
      annulation: v('annulation').trim(), fidelite: { tampons: +v('_tampons'), recompense: v('_recompense').trim() }, avis: { lien: v('_avis').trim() },
      _adresse: v('_adresse').trim()
    };
  }

  /* ---------- Espace commerçant hébergé : abonnement et réglages (appelé par admin.js) ---------- */
  const dateFr = d => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  function bandeau(P) {
    const e = P.abonnement || {}, l = lienAbonnement(P.heberge);
    if (e.paye) return '';
    const bouton = `<a class="btn btn-accent btn-sm" ${l ? `href="${esc(l)}" target="_blank" rel="noopener"` : `href="mailto:${esc(QT.email || '')}?subject=${encodeURIComponent('Abonnement Pack Commerçant · ' + P.heberge)}"`}>S’abonner · ${prixMensuel()} €/mois</a>`;
    return e.essai ? `<div class="notice" style="margin-bottom:var(--s-5);display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between"><span>Essai gratuit : encore <b>${e.joursRestants} jour${e.joursRestants > 1 ? 's' : ''}</b> (jusqu’au ${dateFr(e.finEssai)}).</span>${bouton}</div>`
      : `<div class="notice warn" style="margin-bottom:var(--s-5);display:grid;gap:10px;justify-items:start"><span><b>Votre essai est terminé.</b> La réservation en ligne et la création de cartes sont suspendues ; vos rendez-vous et vos cartes restent consultables ici. Abonnez-vous pour tout réactiver.</span>${bouton}</div>`;
  }
  function reglages(box, P, S) {
    const lienPage = location.origin + racine + '?c=' + P.heberge, e = P.abonnement || {}, l = lienAbonnement(P.heberge);
    box.innerHTML = `<div class="card" style="display:grid;gap:var(--s-4);margin-bottom:var(--s-5)"><h2 style="font-size:var(--t-lg);margin:0">Votre page de réservation</h2>
        <p style="margin:0;word-break:break-all"><a href="${esc(lienPage)}" target="_blank" rel="noopener">${esc(lienPage.replace(/^https?:\/\//, ''))}</a></p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" type="button" data-r="copier">Copier le lien</button><a class="btn btn-ghost btn-sm" href="../affiche/" target="_blank">Affiche avis à imprimer</a></div>
        <p class="muted" style="margin:0;font-size:var(--t-sm)">À mettre dans votre bio Instagram, votre fiche Google (« Réserver ») et vos messages.</p></div>
      <div class="card" style="display:grid;gap:var(--s-3);margin-bottom:var(--s-5)"><h2 style="font-size:var(--t-lg);margin:0">Abonnement</h2>
        <p style="margin:0">${e.paye ? `Abonnement actif jusqu’au <b>${dateFr(e.jusquau)}</b>.` : e.essai ? `Essai gratuit jusqu’au <b>${dateFr(e.finEssai)}</b>.` : '<b>Essai terminé</b> : réservation en ligne suspendue.'}</p>
        <p class="muted" style="margin:0;font-size:var(--t-sm)">${prixMensuel()} € par mois, sans engagement : tout est compris (page, réservation, fidélité, avis, hébergement, mises à jour). ${l ? '' : 'Pour vous abonner, écrivez-nous : nous vous envoyons le lien de paiement.'}</p>
        ${e.paye ? '' : `<a class="btn btn-accent btn-sm" style="justify-self:start" ${l ? `href="${esc(l)}" target="_blank" rel="noopener"` : `href="mailto:${esc(QT.email || '')}?subject=${encodeURIComponent('Abonnement Pack Commerçant · ' + P.heberge)}"`}>S’abonner</a>`}
        <p class="muted" style="margin:0;font-size:var(--t-xs)"><a href="../conditions/" target="_blank">Conditions d’utilisation</a></p></div>
      <form id="pro-form" class="pro-form" novalidate></form>
      <p class="notice warn" id="pro-err" hidden></p><button class="btn btn-accent" type="button" data-r="enregistrer">Enregistrer les réglages</button><span id="pro-ok" class="muted" style="margin-left:12px"></span>`;
    formulaire(box.querySelector('#pro-form'), P);
    box.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'copier') { try { await navigator.clipboard.writeText(lienPage); b.textContent = 'Lien copié'; } catch (x) { prompt('Copiez ce lien :', lienPage); } return; }
      const d = lire(box.querySelector('#pro-form')), fautes = valider(d), err = box.querySelector('#pro-err');
      if (fautes.length) { err.innerHTML = fautes.map(esc).join('<br>'); err.hidden = false; return; }
      err.hidden = true; b.disabled = true;
      try { await enregistrer(S, P.heberge, normaliser(d)); box.querySelector('#pro-ok').textContent = 'Enregistré. Rechargement…'; setTimeout(() => location.reload(), 600); }
      catch (x) { b.disabled = false; err.textContent = 'L’enregistrement a échoué. Vérifiez la connexion.'; err.hidden = false; }
    });
  }
  // Écritures avec le jeton du commerçant (store.js) : création (date du serveur, adresse unique) et mise à jour des réglages
  async function enregistrer(S, adresse, fiche) {
    const W = S.firestore;
    await W.appel('/qt_pack/' + adresse + '?' + CLES.map(k => 'updateMask.fieldPaths=' + k).join('&') + '&currentDocument.exists=true', { method: 'PATCH', body: JSON.stringify({ fields: W.enc(fiche) }) }, W.apiBase);
  }
  async function creer(S, adresse, fiche, uid) {
    const W = S.firestore;
    try {
      await W.appel(':commit', { method: 'POST', body: JSON.stringify({ writes: [{ update: { name: `${W.base}/qt_pack/${adresse}`, fields: W.enc({ ...fiche, uid }) },
        updateTransforms: [{ fieldPath: 'cree', setToServerValue: 'REQUEST_TIME' }], currentDocument: { exists: false } }] }) }, W.apiBase);
    } catch (e) { if (e.status === 400 || e.status === 409 || e.status === 403) throw new Error('prise'); throw e; }
  }
  async function mesCommerces(S, uid) {
    const W = S.firestore;
    const r = await W.appel(':runQuery', { method: 'POST', body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'qt_pack' }], where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'EQUAL', value: { stringValue: uid } } }, limit: 20 } }) }, W.apiBase);
    return (r || []).filter(x => x.document).map(x => W.dec(x.document));
  }

  window.PRO = { ESSAI_JOURS, CLES, normaliser, valider, adresseDe, adresseOk, etat, prixMensuel, lienAbonnement, lireDoc, formulaire, lire, creer, enregistrer, mesCommerces, racine, esc, lienPaiementOk, lienAvisOk };
  window.PK_PRO = { bandeau, reglages };
  if (ici && ici.hasAttribute('data-charger')) charger();
})();
