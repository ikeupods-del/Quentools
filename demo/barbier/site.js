/* Site public du barbier : carte des prix, abonnement, fidélité, boutique et réservation. Lit tout dans store.js. */
(function () {
  'use strict';
  const B = window.Barber, CFG = B.CFG, esc = B.esc, money = B.money;
  const $ = (s, r) => (r || document).querySelector(s);
  const D = () => B.data;

  /* État du rendez-vous en cours de saisie (jamais enregistré tant que ce n'est pas validé) */
  const draft = { serviceId: '', date: '', time: '', cart: {}, name: '', email: '', phone: '', pay: '' };
  let done = null, built = false, busyBooking = false, err = '';

  /* Textes du salon (config.js) */
  document.querySelectorAll('[data-shop]').forEach(n => { n.textContent = CFG[n.dataset.shop] || ''; });
  document.querySelectorAll('[data-shop-link]').forEach(n => {
    const k = n.dataset.shopLink, v = CFG[k] || '';
    n.textContent = v; n.href = (k === 'email' ? 'mailto:' : 'tel:') + v.replace(/\s/g, '');
  });
  document.querySelectorAll('[data-year]').forEach(n => { n.textContent = new Date().getFullYear(); });
  document.title = (CFG.name || 'Barbier') + ' · exemple de site de barbier';

  /* Carte des prix, horaires */
  function renderMenu() {
    $('#menu').innerHTML = D().services.map(s => `<div class="it"><b>${esc(s.name)}</b><small>${s.dur} min</small><i></i><span>${money(s.price)}</span></div>`).join('');
    $('#hours').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const h = D().settings.hours[d];
      return `<div><span>${B.DAYS[d]}</span><span>${h ? h[0] + 'h – ' + h[1] + 'h' : 'Fermé'}</span></div>`;
    }).join('');
  }

  /* Quantités de produits (boutique et réservation partagent le même panier) */
  function qtyHtml(p) {
    const q = draft.cart[p.id] || 0;
    return `<div class="qty" role="group" aria-label="Quantité de ${esc(p.name)}"><button type="button" data-act="dec" data-id="${p.id}" aria-label="Retirer un ${esc(p.name)}">−</button><output aria-live="polite">${q}</output><button type="button" data-act="inc" data-id="${p.id}" aria-label="Ajouter un ${esc(p.name)}"${q >= p.stock ? ' disabled' : ''}>+</button></div>`;
  }
  const shown = () => D().products.filter(p => p.active);
  function renderShop() {
    $('#shop').innerHTML = shown().map(p => `<article class="card prod"><div class="pic" aria-hidden="true">${esc(p.name.charAt(0))}</div><h3>${esc(p.name)}</h3><div class="pr">${money(p.price)}</div>${p.stock > 0 ? qtyHtml(p) : '<div class="out">Épuisé</div>'}</article>`).join('') || '<p>La boutique arrive bientôt.</p>';
  }

  /* Abonnement */
  let aboMsg = '';
  function renderAbo() {
    const S = D().settings.sub, sec = $('#abo');
    sec.hidden = !S.on;
    if (!S.on) return;
    const card = D().settings.card;
    $('#aboCard').innerHTML = `<h3 style="font-size:30px;color:var(--gold)">${esc(S.name)}</h3>
      <div class="price">${money(S.price)}</div>
      <ul><li>${S.perWeek} coupe${S.perWeek > 1 ? 's' : ''} par semaine pendant ${S.weeks} semaines</li><li>Réservation en ligne comme d'habitude</li><li>Aucun engagement au-delà de la période</li></ul>
      <form id="aboForm" class="fields" novalidate>
        <label class="f" style="color:#fff">Prénom<input class="in" name="name" autocomplete="given-name" required></label>
        <label class="f" style="color:#fff">E-mail<input class="in" name="email" type="email" autocomplete="email" required></label>
        <div class="full chips" role="radiogroup" aria-label="Paiement de l'abonnement">
          <label class="chip"><input type="radio" name="pay" value="card"${card ? ' checked' : ' disabled'}><span>Carte en ligne</span></label>
          <label class="chip"><input type="radio" name="pay" value="cash"${card ? '' : ' checked'}><span>Espèces au salon</span></label>
        </div>
        <button class="btn full" type="submit">Je m'abonne</button>
        <p class="full notice ${aboMsg.startsWith('!') ? 'bad' : 'good'}" role="status"${aboMsg ? '' : ' hidden'} style="color:var(--ink)">${esc(aboMsg.replace(/^!/, ''))}</p>
      </form>`;
    $('#aboNote').innerHTML = `<p class="notice">Déjà abonné ? Réserve plus bas avec le même e-mail : la coupe de la semaine s'affiche à 0 €.</p>`;
  }

  /* Fidélité */
  function renderFid() {
    const N = D().settings.loyaltyEvery;
    $('#fidelite').hidden = !N;
    if (!N) return;
    $('#fidTitle').textContent = 'La ' + N + 'ᵉ coupe est offerte.';
    const mail = $('#fidMail').value, out = $('#fidOut');
    if (!/^\S+@\S+\.\S+$/.test(mail)) { out.innerHTML = '<p style="margin:14px 0 0;color:var(--mut)">Saisis ton e-mail pour voir ta carte.</p>'; return; }
    const L = B.loyalty(mail), sub = B.activeSub(mail, B.today());
    let stamps = '';
    for (let i = 1; i <= N; i++) stamps += i === N ? `<div class="stamp free" title="Coupe offerte">★</div>` : `<div class="stamp${i <= L.inCycle ? ' on' : ''}">${i <= L.inCycle ? '✂' : i}</div>`;
    const msg = L.freeNext ? 'Ta prochaine coupe est offerte ! Réserve-la plus bas.' : L.toFree === 0 ? 'Ta prochaine coupe est la ' + N + 'ᵉ : offerte.' : 'Encore ' + L.toFree + ' coupe' + (L.toFree > 1 ? 's' : '') + ' avant ta coupe offerte.';
    out.innerHTML = `<div class="stamps">${stamps}</div><p class="notice ${L.freeNext ? 'good' : ''}" style="margin:0"><b>${L.done}</b> coupe${L.done > 1 ? 's' : ''} terminée${L.done > 1 ? 's' : ''}. ${msg}</p>` +
      (sub ? `<p class="notice good" style="margin:12px 0 0">Abonnement actif jusqu'au ${B.frDate(sub.end)}.</p>` : '');
  }

  /* Réservation */
  function bookClosed() {
    return `<div class="notice warn" style="max-width:620px"><b>Les réservations en ligne sont fermées pour le moment.</b><br>Appelle le salon au <a href="tel:${esc((CFG.phone || '').replace(/\s/g, ''))}">${esc(CFG.phone || '')}</a> ou passe directement : les clients sans rendez-vous sont les bienvenus.</div>`;
  }
  function buildBook() {
    const area = $('#bookArea');
    if (done) {
      const a = done;
      area.innerHTML = `<div class="ticket"><h3>Rendez-vous confirmé</h3><p class="ref">${esc(a.ref)}</p>
        <p style="font-size:1.15rem"><b>${esc(a.serviceName)}</b><br>${esc(B.frDate(a.date))} à ${esc(a.start)}</p>
        ${a.items.length ? `<p>À retirer au salon : ${a.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ')}</p>` : ''}
        <p><b>Total : ${money(a.total)}</b> ${a.total ? (a.paid ? '· payé par carte' : '· à régler en espèces au salon') : '· rien à payer'}</p>
        ${a.email && D().settings.email ? `<p class="notice good">Un e-mail de confirmation a été envoyé à ${esc(a.email)}.</p>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:16px"><button class="btn" data-act="ics" type="button">Ajouter à mon agenda</button><button class="btn ghost" data-act="again" type="button">Nouveau rendez-vous</button></div></div>`;
      built = false;
      return;
    }
    if (!D().settings.booking) { area.innerHTML = bookClosed(); built = false; return; }
    area.innerHTML = `<div class="book"><form id="bkForm" novalidate>
      <div class="step"><h3><b>1</b> Ta prestation</h3><div class="choice" id="bkSvc"></div></div>
      <div class="step"><h3><b>2</b> Jour et heure</h3><div class="chips days" id="bkDays" role="radiogroup" aria-label="Jour"></div><div class="chips" id="bkSlots" role="radiogroup" aria-label="Heure" style="margin-top:16px"></div></div>
      <div class="step"><h3><b>3</b> Un produit avec ça ? <small style="font:500 14px Archivo;text-transform:none;letter-spacing:0;color:var(--mut)">(facultatif)</small></h3><div class="grid g3" id="bkProd"></div></div>
      <div class="step"><h3><b>4</b> Toi</h3><div class="fields">
        <label class="f">Prénom<input class="in" name="name" autocomplete="given-name" required></label>
        <label class="f">E-mail<input class="in" name="email" type="email" autocomplete="email" required></label>
        <label class="f full">Téléphone (facultatif)<input class="in" name="phone" type="tel" autocomplete="tel"></label></div><div id="bkNote" style="margin-top:14px"></div></div>
      <div class="step" id="bkPayStep"><h3><b>5</b> Paiement</h3><div class="choice" id="bkPay"></div></div>
    </form>
    <aside class="recap" aria-live="polite"><h3>Ton rendez-vous</h3><div id="bkRecap"></div></aside></div>`;
    ['name', 'email', 'phone'].forEach(k => { $('#bkForm [name=' + k + ']').value = draft[k]; });
    built = true;
    refreshBook();
  }
  function refreshBook() {
    if (!built) return;
    const S = D().settings, svcs = D().services;
    if (!svcs.some(s => s.id === draft.serviceId)) draft.serviceId = '';
    $('#bkSvc').innerHTML = svcs.map(s => `<label class="opt"><input type="radio" name="svc" value="${s.id}"${s.id === draft.serviceId ? ' checked' : ''}><span class="face"><span style="color:inherit;font:inherit"><b>${esc(s.name)}</b><small>${s.dur} min</small></span><span>${money(s.price)}</span></span></label>`).join('');
    const days = B.openDays();
    if (draft.date && !days.includes(draft.date)) draft.date = '';
    $('#bkDays').innerHTML = days.map(d => { const p = B.parse(d); return `<label class="chip"><input type="radio" name="day" value="${d}"${d === draft.date ? ' checked' : ''}><span>${B.DAYS[p.getDay()].slice(0, 3)}<small>${p.getDate()}/${String(p.getMonth() + 1).padStart(2, '0')}</small></span></label>`; }).join('');
    const svc = svcs.find(s => s.id === draft.serviceId);
    let slots = [];
    if (svc && draft.date) slots = B.slotsFor(draft.date, svc.dur);
    if (draft.time && !(slots.find(s => s.t === draft.time) || {}).free) draft.time = '';
    $('#bkSlots').innerHTML = !svc ? '<p class="notice" style="width:100%">Choisis d’abord ta prestation.</p>' : !draft.date ? '<p class="notice" style="width:100%">Choisis un jour pour voir les heures libres.</p>' :
      slots.map(s => `<label class="chip"><input type="radio" name="time" value="${s.t}"${s.t === draft.time ? ' checked' : ''}${s.free ? '' : ' disabled'}><span>${s.t}</span></label>`).join('') || '<p class="notice">Fermé ce jour-là.</p>';
    const prods = shown().filter(p => p.stock > 0);
    $('#bkProd').innerHTML = prods.map(p => `<div class="card" style="padding:14px;display:grid;gap:8px"><b class="oswald" style="font:700 20px Oswald;text-transform:uppercase">${esc(p.name)}</b><span class="pr" style="font:700 22px Oswald;color:var(--red)">${money(p.price)}</span>${qtyHtml(p)}</div>`).join('') || '<p>Aucun produit disponible.</p>';
    renderRecap();
  }
  function renderRecap() {
    if (!built) return;
    const S = D().settings, q = B.quote({ serviceId: draft.serviceId, date: draft.date, email: draft.email, cart: draft.cart });
    $('#bkNote').innerHTML = q.note ? `<p class="notice ${q.cover ? 'good' : 'warn'}">${esc(q.note)}</p>` : '';
    const payStep = $('#bkPayStep');
    if (!q.total) { payStep.hidden = true; draft.pay = ''; }
    else {
      payStep.hidden = false;
      if (!draft.pay || (draft.pay === 'card' && !S.card)) draft.pay = S.card ? 'card' : 'cash';
      $('#bkPay').innerHTML = `<label class="opt"><input type="radio" name="pay" value="card"${draft.pay === 'card' ? ' checked' : ''}${S.card ? '' : ' disabled'}><span class="face"><span style="color:inherit;font:inherit"><b>Carte en ligne</b><small>${S.card ? 'Tu règles maintenant, tu arrives et tu t’assois.' : 'Indisponible pour le moment'}</small></span></span></label>
        <label class="opt"><input type="radio" name="pay" value="cash"${draft.pay === 'cash' ? ' checked' : ''}><span class="face"><span style="color:inherit;font:inherit"><b>Espèces au salon</b><small>Tu paies sur place après la coupe.</small></span></span></label>`;
    }
    const svc = q.svc, when = draft.date && draft.time ? B.frDate(draft.date) + ' · ' + draft.time : '';
    $('#bkRecap').innerHTML = (q.lines.map(l => `<div class="l"><span>${esc(l.label)}${l.tag ? `<span class="tag">${l.tag}</span>` : ''}</span><b>${money(l.amount)}</b></div>`).join('') || '<p style="color:#c9bfab">Choisis une prestation.</p>') +
      (when ? `<div class="l"><span>Quand</span><b>${esc(when)}</b></div>` : '') +
      `<div class="tot"><span class="oswald" style="font:600 16px Oswald;letter-spacing:.14em">TOTAL</span><b>${money(q.total)}</b></div>
      <button class="btn red" type="button" data-act="submit"${busyBooking ? ' disabled' : ''}>${q.total && draft.pay === 'card' ? 'Payer et réserver' : 'Confirmer'}</button>
      ${err ? `<div class="err" role="alert">${esc(err)}</div>` : ''}${svc && q.total && draft.pay === 'cash' ? '<p style="margin:10px 0 0;font-size:14px;color:#c9bfab">À régler en espèces au salon.</p>' : ''}`;
  }

  function finish() {
    const r = B.book({ serviceId: draft.serviceId, date: draft.date, time: draft.time, cart: draft.cart, name: draft.name, email: draft.email, phone: draft.phone, pay: draft.pay });
    busyBooking = false;
    if (r.error) { err = r.error; refreshBook(); return; }
    err = ''; done = r.appt;
    draft.cart = {}; draft.time = ''; draft.serviceId = ''; draft.pay = '';
    buildBook(); renderShop(); renderFid();
    $('#bookArea').scrollIntoView({ block: 'start' });
  }
  function submit() {
    err = '';
    const q = B.quote({ serviceId: draft.serviceId, date: draft.date, email: draft.email, cart: draft.cart });
    if (!q.svc) { err = 'Choisis une prestation.'; return renderRecap(); }
    if (!draft.date || !draft.time) { err = 'Choisis un jour et une heure.'; return renderRecap(); }
    if (!draft.name.trim()) { err = 'Indique ton prénom.'; return renderRecap(); }
    if (!/^\S+@\S+\.\S+$/.test(draft.email.trim())) { err = 'Indique un e-mail valide pour la confirmation.'; return renderRecap(); }
    if (q.total && draft.pay === 'card') {
      $('#payTxt').textContent = 'Montant à régler : ' + money(q.total) + '.';
      busyBooking = true; renderRecap();
      $('#payDlg').showModal();
    } else { finish(); }
  }
  $('#payOk').addEventListener('click', () => { $('#payDlg').close(); finish(); });
  $('#payNo').addEventListener('click', () => { $('#payDlg').close(); busyBooking = false; renderRecap(); });
  $('#payDlg').addEventListener('cancel', () => { busyBooking = false; renderRecap(); });

  /* Événements */
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act, p = t.dataset.id && D().products.find(x => x.id === t.dataset.id);
    if (act === 'inc' && p) { draft.cart[p.id] = Math.min(p.stock, (draft.cart[p.id] || 0) + 1); err = ''; renderShop(); refreshBook(); }
    else if (act === 'dec' && p) { draft.cart[p.id] = Math.max(0, (draft.cart[p.id] || 0) - 1); if (!draft.cart[p.id]) delete draft.cart[p.id]; renderShop(); refreshBook(); }
    else if (act === 'submit') submit();
    else if (act === 'again') { done = null; buildBook(); }
    else if (act === 'ics' && done) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([B.ics(done)], { type: 'text/calendar' }));
      a.download = 'rendez-vous.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
  });
  document.addEventListener('change', e => {
    const n = e.target;
    if (!n.closest('#bkForm')) return;
    err = '';
    if (n.name === 'svc') draft.serviceId = n.value;
    else if (n.name === 'day') draft.date = n.value;
    else if (n.name === 'time') draft.time = n.value;
    else if (n.name === 'pay') draft.pay = n.value;
    else return;
    refreshBook();
  });
  document.addEventListener('input', e => {
    const n = e.target;
    if (n.closest('#bkForm') && ['name', 'email', 'phone'].includes(n.name)) { draft[n.name] = n.value; if (n.name === 'email') renderRecap(); }
    if (n.id === 'fidMail') renderFid();
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.id === 'aboForm') {
      const f = new FormData(e.target), r = B.buySub({ name: f.get('name'), email: f.get('email'), pay: f.get('pay') });
      aboMsg = r.error ? '!' + r.error : (r.sub.paid ? 'Abonnement activé jusqu’au ' + B.frDate(r.sub.end) + '. Réserve avec ' + r.sub.email + '.' : 'Abonnement enregistré : il s’active dès que tu règles ' + money(r.sub.price) + ' au salon.');
      renderAbo(); renderFid(); refreshBook();
    }
  });

  function renderAll() { renderMenu(); renderShop(); renderAbo(); renderFid(); if (done) return; if (built === (D().settings.booking)) refreshBook(); else buildBook(); }
  B.onChange(renderAll);
  renderMenu(); renderShop(); renderAbo(); renderFid(); buildBook();
})();
