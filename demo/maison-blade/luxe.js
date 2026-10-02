/* Maison Blade : site public (rituels, galerie, barbiers, abonnement, fidélité, boutique, réservation) et animations.
   Toutes les règles (créneaux, prix, abonnement, fidélité, stock, e-mails) viennent de store.js, réglable dans l'administration. */
(function () {
  'use strict';
  const B = window.Barber, CFG = B.CFG, D = () => B.data, esc = B.esc, eur = B.money;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const ico = (n, c) => `<svg class="${c}" aria-hidden="true"><use href="#i-${n || 'brush'}"/></svg>`;
  const dur = n => n >= 60 ? (n % 60 ? Math.floor(n / 60) + ' h ' + (n % 60) : n / 60 + ' h') : n + ' min';

  /* Plaques de la galerie : décor tonal à remplacer par les photos du salon */
  const PLATES = [
    { t: 'La coupe signature', k: 'Ciseaux & peigne', icon: 'scissors', cls: 'col-span-2 row-span-2 md:col-span-7', bg: 'radial-gradient(75% 75% at 28% 18%,#6a4a31,#251912 70%)' },
    { t: 'Finitions à la lame', k: 'Détail', icon: 'razor', cls: 'md:col-span-5', bg: 'radial-gradient(80% 80% at 70% 15%,#45423e,#131211 72%)' },
    { t: 'Serviette chaude', k: 'Rituel', icon: 'towel', cls: 'md:col-span-5', bg: 'radial-gradient(80% 80% at 25% 20%,#7a5d3b,#1b1511 72%)' },
    { t: 'L’atelier', k: 'Le salon', icon: 'brush', cls: 'md:col-span-4', bg: 'radial-gradient(80% 80% at 60% 20%,#3a352f,#12100e 72%)' },
    { t: 'Huiles & baumes', k: 'Officine', icon: 'bottle', cls: 'md:col-span-4', bg: 'radial-gradient(80% 80% at 30% 20%,#5b4630,#17120e 72%)' },
    { t: 'Peigne en corne', k: 'Accessoires', icon: 'comb', cls: 'col-span-2 md:col-span-4', bg: 'radial-gradient(80% 80% at 70% 20%,#4a4035,#141210 72%)' }
  ];

  /* ---------- Contenu qui vient de l'administration ---------- */
  function renderRituals() {
    $('#rituals').innerHTML = D().services.map((s, i) => `<article class="glass glass-hover flex flex-col p-7${s.star ? ' !border-bronze/50' : ''}">
      <div class="flex items-start justify-between">${ico(s.icon, 'h-11 w-11 text-bronze')}${s.star ? '<span class="eyebrow">La signature</span>' : ''}</div>
      <h3 class="mt-8 text-[1.85rem]">${esc(s.name)}</h3>
      <p class="mt-3 flex-1 text-sm text-mist">${esc(s.desc || '')}</p>
      <div class="mt-8 flex items-baseline justify-between border-t border-white/10 pt-5"><span class="font-serif text-4xl text-champagne">${eur(s.price)}</span><span class="text-xs uppercase tracking-wide2 text-mist">${dur(s.dur)}</span></div>
      <button type="button" class="link mt-5 self-start text-[.72rem] uppercase tracking-wide2" data-book="${s.id}">Réserver ce rituel <span class="arrow">→</span></button></article>`).join('');
  }
  function renderTeam() {
    $('#team').innerHTML = D().barbers.filter(b => b.active !== false).map(b => `<article class="bg-coal p-8 transition duration-700 ease-lux hover:bg-graphite md:p-10">
      <div class="grid h-20 w-20 place-items-center rounded-full border border-bronze/50 font-serif text-3xl text-champagne">${esc(b.name.split(' ').map(x => x[0]).join(''))}</div>
      <h3 class="mt-8 text-3xl">${esc(b.name)}</h3><p class="eyebrow mt-3">${esc(b.role || '')}</p><p class="mt-5 text-sm text-mist">${esc(b.bio || '')}</p>
      <button type="button" class="link mt-6 text-[.72rem] uppercase tracking-wide2" data-barber="${b.id}">Réserver avec ${esc(b.name.split(' ')[0])} <span class="arrow">→</span></button></article>`).join('');
  }
  $('#gallery').innerHTML = PLATES.map((p, i) => `<figure class="plate rv ${p.cls}" tabindex="0" role="button" aria-label="Agrandir : ${esc(p.t)}" data-i="${i}" style="--bg:${p.bg};--i:${i % 3}">
      <div class="art absolute inset-0">${ico(p.icon, 'absolute left-1/2 top-1/2 aspect-square h-[58%] -translate-x-1/2 -translate-y-1/2 text-champagne/35')}<div class="absolute inset-0" style="background:radial-gradient(60% 40% at 50% 0%,rgba(255,255,255,.08),transparent)"></div></div>
      <div class="sk"></div><figcaption><span class="eyebrow">${esc(p.k)}</span><h3 class="mt-1 font-serif text-2xl md:text-3xl">${esc(p.t)}</h3></figcaption></figure>`).join('');

  /* Panier de produits partagé entre l'Officine et la réservation */
  const st = { svc: null, barber: null, date: null, time: null, step: 1, cart: {}, pay: '', name: '', email: '', phone: '' };
  let err = '', busyPay = false, done = null;
  const prods = () => D().products.filter(p => p.active);
  const qtyHtml = p => { const q = st.cart[p.id] || 0; return `<div class="flex items-center" role="group" aria-label="Quantité : ${esc(p.name)}"><button type="button" class="grid h-11 w-11 place-items-center border border-white/15 transition hover:border-champagne/60" data-act="dec" data-id="${p.id}" aria-label="Retirer">−</button><output class="grid h-11 min-w-[52px] place-items-center border-y border-white/15 text-sm tabular-nums" aria-live="polite">${q}</output><button type="button" class="grid h-11 w-11 place-items-center border border-white/15 transition hover:border-champagne/60 disabled:opacity-30" data-act="inc" data-id="${p.id}" aria-label="Ajouter"${q >= p.stock ? ' disabled' : ''}>+</button></div>`; };
  function renderShop() {
    $('#shop').innerHTML = prods().map(p => `<article class="glass glass-hover flex flex-col p-7">
      <div class="grid h-28 place-items-center border border-white/10 text-champagne/40" style="background:radial-gradient(70% 90% at 30% 10%,#3d332a,#14110f)">${ico('bottle', 'h-14 w-14')}</div>
      <h3 class="mt-6 text-2xl">${esc(p.name)}</h3><p class="mt-2 font-serif text-3xl text-champagne">${eur(p.price)}</p>
      <div class="mt-6">${p.stock > 0 ? qtyHtml(p) : '<span class="text-xs uppercase tracking-wide2 text-mist">Épuisé</span>'}</div></article>`).join('') || '<p class="text-mist">L’Officine arrive bientôt.</p>';
  }

  /* ---------- Abonnement et fidélité ---------- */
  let aboMsg = '';
  function renderAbo() {
    const S = D().settings.sub, card = D().settings.card;
    $('#aboCard').hidden = !S.on;
    if (!S.on) return;
    $('#aboCard').innerHTML = `<p class="eyebrow">Abonnement</p><h3 class="mt-5 text-[2.4rem]">${esc(S.name)}</h3>
      <p class="mt-6 font-serif text-[clamp(3.6rem,8vw,5.5rem)] leading-none text-champagne">${eur(S.price)}</p>
      <ul class="mt-6 grid gap-3 text-sm text-mist"><li>${S.perWeek} coupe${S.perWeek > 1 ? 's' : ''} par semaine pendant ${S.weeks} semaines</li><li>Réservation en ligne, la coupe est automatiquement incluse</li><li>Sans engagement au-delà de la période</li></ul>
      <form id="aboForm" class="mt-8 grid gap-5" novalidate>
        <label class="block text-xs uppercase tracking-wide2 text-mist">Nom<input class="field mt-1 text-base normal-case tracking-normal" name="name" autocomplete="name" required></label>
        <label class="block text-xs uppercase tracking-wide2 text-mist">E-mail<input class="field mt-1 text-base normal-case tracking-normal" type="email" name="email" autocomplete="email" required></label>
        <fieldset class="grid gap-3 sm:grid-cols-2"><legend class="sr-only">Paiement de l’abonnement</legend>
          <label class="rad"><input type="radio" name="pay" value="card"${card ? ' checked' : ' disabled'}><span>Carte en ligne</span></label>
          <label class="rad"><input type="radio" name="pay" value="cash"${card ? '' : ' checked'}><span>Au salon</span></label></fieldset>
        <button class="btn" type="submit">Je m’abonne</button>
        <p class="border p-4 text-sm ${aboMsg.startsWith('!') ? 'border-[#a0524a] text-[#e0a39a]' : 'border-bronze/50 text-champagne'}" role="status"${aboMsg ? '' : ' hidden'}>${esc(aboMsg.replace(/^!/, ''))}</p>
      </form><p class="mt-auto pt-6 text-xs text-mist">Déjà abonné ? Réservez plus bas avec le même e-mail : la coupe de la semaine s’affiche à 0 €.</p>`;
  }
  function renderFid() {
    const N = D().settings.loyaltyEvery;
    $('#fidCard').hidden = !N;
    if (!N) return;
    $('#fidTitle').textContent = 'La ' + N + 'ᵉ coupe est offerte.';
    const mail = $('#fidMail').value, out = $('#fidOut');
    if (!/^\S+@\S+\.\S+$/.test(mail)) { out.innerHTML = '<p class="text-sm text-mist">Saisissez votre e-mail pour voir votre carte.</p>'; return; }
    const L = B.loyalty(mail), sub = B.activeSub(mail, B.today());
    let stamps = '';
    for (let i = 1; i <= N; i++) stamps += i === N ? '<div class="stamp free" title="Coupe offerte">★</div>' : `<div class="stamp${i <= L.inCycle ? ' on' : ''}">${i <= L.inCycle ? '✓' : i}</div>`;
    const msg = L.freeNext ? 'Votre prochaine coupe est offerte : réservez-la ci-dessous.' : L.toFree === 0 ? 'Votre prochaine coupe est la ' + N + 'ᵉ : offerte.' : 'Encore ' + L.toFree + ' coupe' + (L.toFree > 1 ? 's' : '') + ' avant votre coupe offerte.';
    out.innerHTML = `<div class="grid gap-2.5" style="grid-template-columns:repeat(${N > 10 ? 6 : 5},minmax(0,1fr))">${stamps}</div><p class="mt-5 border border-white/10 p-4 text-sm"><span class="text-champagne">${L.done} coupe${L.done > 1 ? 's' : ''} réalisée${L.done > 1 ? 's' : ''}.</span> ${msg}</p>` +
      (sub ? `<p class="mt-3 border border-bronze/40 p-4 text-sm text-champagne">Abonnement actif jusqu’au ${esc(B.frDate(sub.end))}.</p>` : '');
  }

  /* ---------- Réservation : rituel → barbier → créneau (→ produits) ---------- */
  const svcOf = id => D().services.find(s => s.id === id);
  const barOf = id => D().barbers.find(b => b.id === id);
  const fr = (s, o) => new Date(s + 'T12:00').toLocaleDateString('fr-FR', o);
  const quote = () => B.quote({ serviceId: st.svc, date: st.date, email: st.email, cart: st.cart });

  function setStep(n) {
    st.step = n;
    $$('#bk .step').forEach((el, i) => { el.classList.toggle('open', i + 1 === n); el.classList.toggle('done', i + 1 < n); $('.step-h', el).setAttribute('aria-expanded', i + 1 === n); });
  }
  function renderSvc() {
    $('#bk-svc').innerHTML = D().services.map(s => `<button type="button" class="opt" data-svc="${s.id}" aria-pressed="${st.svc === s.id}"><span class="flex items-baseline justify-between gap-4"><span class="font-serif text-xl">${esc(s.name)}</span><span class="font-serif text-xl text-champagne">${eur(s.price)}</span></span><span class="mt-1 block text-xs text-mist">${dur(s.dur)}</span></button>`).join('');
  }
  function renderBar() {
    const list = B.eligible(st.svc);
    if (st.barber && !list.some(b => b.id === st.barber)) st.barber = null;
    $('#bk-bar').innerHTML = `<button type="button" class="opt" data-bar="any" aria-pressed="${st.barber === null && st.step > 2}"><span class="font-serif text-xl">Sans préférence</span><span class="mt-1 block text-xs text-mist">Le premier barbier disponible</span></button>` +
      list.map(b => `<button type="button" class="opt" data-bar="${b.id}" aria-pressed="${st.barber === b.id}"><span class="font-serif text-xl">${esc(b.name)}</span><span class="mt-1 block text-xs text-mist">${esc(b.role || '')}</span></button>`).join('');
  }
  function renderDays() {
    const days = B.openDays();
    if (st.date && !days.includes(st.date)) st.date = null;
    $('#bk-days').innerHTML = days.map(k => { const d = B.parse(k); return `<button type="button" class="chip shrink-0" data-day="${k}" aria-pressed="${st.date === k}"><span class="block text-[.62rem] uppercase tracking-wide2 opacity-70">${d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span><span class="font-serif text-xl">${d.getDate()}</span><span class="block text-[.62rem] uppercase tracking-wide2 opacity-70">${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}</span></button>`; }).join('');
  }
  let skTimer;
  function renderSlots(skeleton) {
    const box = $('#bk-slots'), s = svcOf(st.svc);
    clearTimeout(skTimer);
    if (!s) { box.innerHTML = '<p class="text-sm text-mist">Choisissez d’abord votre rituel.</p>'; return; }
    if (!st.date) { box.innerHTML = '<p class="text-sm text-mist">Choisissez un jour pour voir les heures disponibles.</p>'; return; }
    const paint = () => {
      const all = B.slotsFor(st.date, s.dur, s.id, st.barber);
      if (st.time && !(all.find(x => x.t === st.time) || {}).free) st.time = null;
      box.innerHTML = all.some(x => x.free) ? all.map(x => `<button type="button" class="chip" data-time="${x.t}" aria-pressed="${st.time === x.t}"${x.free ? '' : ' disabled'}>${x.t}</button>`).join('') : '<p class="text-sm text-mist">Complet ce jour-là : essayez un autre jour ou « Sans préférence ».</p>';
    };
    if (skeleton && !reduced) { box.innerHTML = Array.from({ length: 10 }, () => '<span class="sk h-[46px] w-[76px]"></span>').join(''); skTimer = setTimeout(paint, 520); } else paint();
  }
  function renderProd() {
    $('#bk-prod').innerHTML = prods().filter(p => p.stock > 0).map(p => `<div class="flex items-center justify-between gap-4 border border-white/10 p-4"><span><span class="font-serif text-xl">${esc(p.name)}</span><span class="block text-sm text-champagne">${eur(p.price)}</span></span>${qtyHtml(p)}</div>`).join('') || '<p class="text-sm text-mist">Aucun produit disponible.</p>';
  }
  function renderPay(q) {
    const S = D().settings, box = $('#bk-pay');
    if (!q.total) { box.hidden = true; st.pay = ''; return; }
    box.hidden = false;
    if (!st.pay || (st.pay === 'card' && !S.card)) st.pay = S.card ? 'card' : 'cash';
    box.innerHTML = `<legend class="mb-1 text-xs uppercase tracking-wide2 text-mist">Paiement</legend>
      <label class="rad"><input type="radio" name="pay" value="card"${st.pay === 'card' ? ' checked' : ''}${S.card ? '' : ' disabled'}><span>Carte en ligne<small class="mt-0.5 block text-xs text-mist">${S.card ? 'Réglez maintenant, installez-vous à l’arrivée.' : 'Indisponible pour le moment.'}</small></span></label>
      <label class="rad"><input type="radio" name="pay" value="cash"${st.pay === 'cash' ? ' checked' : ''}><span>Au salon<small class="mt-0.5 block text-xs text-mist">Vous réglez sur place, après le rituel.</small></span></label>`;
  }
  function renderSum() {
    const q = quote(), s = q.svc, bar = st.barber && barOf(st.barber);
    const row = (k, v) => `<div class="flex items-baseline justify-between gap-4 border-b border-white/[.07] pb-3"><span class="text-xs uppercase tracking-wide2 text-mist">${k}</span><span class="text-right">${v}</span></div>`;
    const to = '<span class="text-mist">À choisir</span>';
    $('#sum').innerHTML = (q.lines.length ? q.lines.map(l => row(esc(l.label) + (l.tag ? ` <span class="ml-1 border border-bronze/60 px-1.5 text-[.6rem] uppercase tracking-wide2 text-bronze">${l.tag}</span>` : ''), eur(l.amount))).join('') : row('Rituel', to)) +
      row('Barbier', st.step > 2 || bar ? (bar ? esc(bar.name) : 'Sans préférence') : to) +
      row('Créneau', st.time ? esc(fr(st.date, { weekday: 'long', day: 'numeric', month: 'long' })) + ' · ' + st.time : to) +
      `<div class="flex items-baseline justify-between pt-2"><span class="text-xs uppercase tracking-wide2 text-mist">Total</span><span class="font-serif text-4xl text-champagne">${s ? eur(q.total) : '—'}</span></div>`;
    $('#bk-form').hidden = !(st.time && !done);
    $('#bk-note').innerHTML = q.note ? `<p class="border border-bronze/40 p-4 text-sm text-champagne">${esc(q.note)}</p>` : '';
    renderPay(q);
    const btn = $('#bk-form button[type=submit]');
    btn.textContent = q.total && st.pay === 'card' ? 'Payer et réserver' : 'Confirmer le rendez-vous'; btn.disabled = busyPay;
    const n = Object.values(st.cart).reduce((a, b) => a + b, 0);
    $('#v1').textContent = s ? s.name : 'Choisir';
    $('#v2').textContent = st.step > 2 || bar ? (bar ? bar.name : 'Sans préférence') : 'Choisir';
    $('#v3').textContent = st.time ? fr(st.date, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + st.time : 'Choisir';
    $('#v4').textContent = n ? n + ' produit' + (n > 1 ? 's' : '') : 'Aucun produit';
    const e = $('#bk-err'); e.hidden = !err; e.textContent = err;
  }
  function refresh(skeleton) { renderSvc(); renderBar(); renderDays(); renderSlots(skeleton); renderProd(); renderSum(); setStep(st.step); }

  function setBooking() {
    const open = D().settings.booking;
    $('#bk-closed').hidden = open; $('#bk-grid').hidden = !open;
  }
  $('#bk').addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t) return;
    err = '';
    if (t.dataset.svc) { st.svc = t.dataset.svc; st.time = null; refresh(); setStep(2); }
    else if (t.dataset.bar) { st.barber = t.dataset.bar === 'any' ? null : t.dataset.bar; st.time = null; st.step = 3; refresh(); setStep(3); }
    else if (t.dataset.day) { st.date = t.dataset.day; st.time = null; renderDays(); renderSlots(true); renderSum(); }
    else if (t.dataset.time) { st.time = t.dataset.time; renderSlots(); renderSum(); $('#bk-form').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); }
    else if (t.dataset.step) { if (+t.dataset.step === 1 || st.svc) { setStep(+t.dataset.step); refresh(); } }
  });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act],[data-book],[data-barber]');
    if (!t) return;
    const p = t.dataset.id && D().products.find(x => x.id === t.dataset.id);
    if (t.dataset.act === 'inc' && p) { st.cart[p.id] = Math.min(p.stock, (st.cart[p.id] || 0) + 1); }
    else if (t.dataset.act === 'dec' && p) { st.cart[p.id] = Math.max(0, (st.cart[p.id] || 0) - 1); if (!st.cart[p.id]) delete st.cart[p.id]; }
    else if (t.dataset.book) { st.svc = t.dataset.book; st.barber = null; st.time = null; st.step = 2; err = ''; refresh(); setStep(2); $('#reserver').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return; }
    else if (t.dataset.barber) {
      st.barber = t.dataset.barber; st.time = null; err = '';
      if (st.svc && !barOf(st.barber).does.includes(st.svc)) st.svc = null;
      st.step = st.svc ? 3 : 1; refresh(); setStep(st.step); $('#reserver').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); return;
    } else return;
    err = ''; renderShop(); renderProd(); renderSum();
  });
  $('#bk-form').addEventListener('input', e => {
    const n = e.target;
    if (['name', 'email', 'phone'].includes(n.name)) { st[n.name] = n.value; if (n.name === 'email') renderSum(); }
  });
  $('#bk-form').addEventListener('change', e => { if (e.target.name === 'pay') { st.pay = e.target.value; renderSum(); } });

  function finish() {
    const r = B.book({ serviceId: st.svc, date: st.date, time: st.time, barber: st.barber || 'any', cart: st.cart, name: st.name, email: st.email, phone: st.phone, pay: st.pay });
    busyPay = false;
    if (r.error) { err = r.error; refresh(); return; }
    err = ''; done = r.appt;
    const a = done, d = $('#bk-done');
    d.hidden = false;
    d.innerHTML = `<div class="mt-8 border-t border-white/10 pt-8"><p class="eyebrow">Rendez-vous confirmé</p><p class="mt-4 font-serif text-3xl">À très bientôt, ${esc(a.name.split(' ')[0])}.</p>
      <p class="mt-3 text-sm text-mist">${esc(a.serviceName)}${a.barberName ? ' avec ' + esc(a.barberName) : ''}<br>${esc(fr(a.date, { weekday: 'long', day: 'numeric', month: 'long' }))} à ${esc(a.start)}<br>${a.items.length ? 'À retirer : ' + a.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ') + '<br>' : ''}Total ${eur(a.total)}${a.total ? (a.paid ? ' · réglé par carte' : ' · à régler au salon') : ''}<br>Référence ${esc(a.ref)}</p>
      ${a.email && D().settings.email ? `<p class="mt-4 border border-bronze/40 p-3 text-sm text-champagne">Une confirmation a été envoyée à ${esc(a.email)}.</p>` : ''}
      <div class="mt-6 flex flex-wrap gap-3"><button class="btn-line !min-h-[44px] !px-5" id="icsBtn" type="button">Ajouter à l’agenda</button><button class="link text-[.72rem] uppercase tracking-wide2" id="again" type="button">Nouveau rendez-vous</button></div></div>`;
    $('#icsBtn').onclick = () => { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([B.ics(a)], { type: 'text/calendar' })); l.download = 'maison-blade.ics'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000); };
    $('#again').onclick = () => { d.innerHTML = ''; d.hidden = true; done = null; Object.assign(st, { svc: null, barber: null, date: null, time: null, cart: {}, pay: '', step: 1 }); $('#bk-form').reset(); refresh(); renderShop(); };
    st.cart = {}; st.time = null; refresh(); renderShop(); renderFid();
  }
  $('#bk-form').addEventListener('submit', e => {
    e.preventDefault(); err = '';
    const q = quote();
    if (!q.svc) err = 'Choisissez un rituel.';
    else if (!st.date || !st.time) err = 'Choisissez un jour et une heure.';
    else if (!st.name.trim()) err = 'Indiquez votre nom.';
    else if (!/^\S+@\S+\.\S+$/.test(st.email.trim())) err = 'Indiquez un e-mail valide pour la confirmation.';
    if (err) return renderSum();
    if (q.total && st.pay === 'card') { $('#payTxt').textContent = eur(q.total); busyPay = true; renderSum(); $('#payDlg').showModal(); }
    else finish();
  });
  $('#payOk').addEventListener('click', () => { $('#payDlg').close(); finish(); });
  $('#payNo').addEventListener('click', () => { $('#payDlg').close(); busyPay = false; renderSum(); });
  $('#payDlg').addEventListener('cancel', () => { busyPay = false; renderSum(); });

  /* Abonnement / fidélité : événements */
  document.addEventListener('submit', e => {
    if (e.target.id !== 'aboForm') return;
    e.preventDefault();
    const f = new FormData(e.target), r = B.buySub({ name: f.get('name'), email: f.get('email'), pay: f.get('pay') });
    aboMsg = r.error ? '!' + r.error : r.sub.paid ? 'Abonnement activé jusqu’au ' + B.frDate(r.sub.end) + '. Réservez avec ' + r.sub.email + '.' : 'Abonnement enregistré : il s’active dès le règlement de ' + eur(r.sub.price) + ' au salon.';
    renderAbo(); renderFid(); renderSum();
  });
  $('#fidMail').addEventListener('input', renderFid);

  /* ---------- Galerie : squelettes, lightbox ---------- */
  const plates = $$('.plate');
  const ioPlate = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { ioPlate.unobserve(en.target); setTimeout(() => en.target.classList.add('ready'), reduced ? 0 : 350 + Math.random() * 600); } }), { threshold: .15 });
  plates.forEach(p => ioPlate.observe(p));
  const lb = $('#lb'); let cur = 0;
  function showLb(i) {
    cur = (i + plates.length) % plates.length;
    const p = plates[cur], d = PLATES[cur];
    $('#lbm').style.background = p.style.getPropertyValue('--bg');
    $('#lbm').className = 'relative h-full w-full overflow-hidden rounded-[4px] border border-white/10';
    $('#lbm').innerHTML = $('.art', p).outerHTML;
    $('#lbt').textContent = d.t; $('#lbc').textContent = (cur + 1) + ' / ' + plates.length + ' · ' + d.k;
  }
  const open = i => { showLb(i); if (!lb.open) lb.showModal(); };
  plates.forEach(p => { p.addEventListener('click', () => open(+p.dataset.i)); p.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(+p.dataset.i); } }); });
  $('#lbx').onclick = () => lb.close(); $('#lbp').onclick = () => showLb(cur - 1); $('#lbn').onclick = () => showLb(cur + 1);
  lb.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showLb(cur - 1); if (e.key === 'ArrowRight') showLb(cur + 1); });
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* ---------- Ambiance : rideau, apparitions, manifeste, en-tête ---------- */
  const curtain = $('#curtain');
  let seen = false; try { seen = sessionStorage.getItem('mb-intro') === '1'; sessionStorage.setItem('mb-intro', '1'); } catch (e) { /* ignoré */ }
  if (seen || reduced) curtain.classList.add('gone'); else setTimeout(() => curtain.classList.add('gone'), 1900);
  curtain.addEventListener('click', () => curtain.classList.add('gone'));

  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  const watch = () => $$('.rv:not(.in)').forEach(n => io.observe(n));
  setTimeout(() => $$('#hero .rv').forEach(n => n.classList.add('in')), seen || reduced ? 50 : 1500);

  const words = $('[data-words]');
  if (words) words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span class="w" style="opacity:.18;transition:opacity .5s">${esc(w)}</span>`).join(' ');
  const ws = words ? $$('.w', words) : [];
  const hdr = $('#hdr'), prog = $('#prog');
  function onScroll() {
    hdr.classList.toggle('solid', scrollY > 40);
    prog.style.transform = 'scaleX(' + Math.min(1, scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) + ')';
    if (ws.length) { const r = words.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .3))); ws.forEach((w, i) => { w.style.opacity = i / ws.length < p * 1.1 ? 1 : .18; }); }
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const hero = $('#hero');
  if (!reduced) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
  const mb = $('#menuBtn'), mn = $('#menu');
  mb.addEventListener('click', () => { mn.hidden = !mn.hidden; mb.setAttribute('aria-expanded', !mn.hidden); });
  mn.addEventListener('click', e => { if (e.target.closest('a')) { mn.hidden = true; mb.setAttribute('aria-expanded', 'false'); } });
  $$('[data-shop]').forEach(n => { n.textContent = CFG[n.dataset.shop] || ''; });
  $('#yr').textContent = new Date().getFullYear();

  /* ---------- Rendu initial et mises à jour depuis l'administration ---------- */
  function renderAll() { renderRituals(); renderTeam(); renderShop(); renderAbo(); renderFid(); setBooking(); if (!done) refresh(); watch(); }
  B.onChange(renderAll);
  renderAll(); setStep(1);

  /* Client connecté : coordonnées préremplies. Lien « Réserver à nouveau » : ?rdv=<rituel>&barbier=<id> */
  const me = B.account(), qs = new URLSearchParams(location.search);
  if (me) { Object.assign(st, { name: me.name, email: me.email, phone: me.phone || '' }); ['name', 'email', 'phone'].forEach(k => { $('#bk-form [name=' + k + ']').value = st[k]; }); }
  if (qs.get('rdv') && svcOf(qs.get('rdv'))) {
    st.svc = qs.get('rdv'); st.step = 2;
    const bar = barOf(qs.get('barbier')); if (bar && bar.does.includes(st.svc)) { st.barber = bar.id; st.step = 3; }
    refresh(); setStep(st.step);
  }
  if (me && me.favBarber && !qs.get('barbier') && barOf(me.favBarber)) { st.barber = me.favBarber; refresh(); }
  if (me) $$('[data-account]').forEach(n => { n.textContent = 'Mon espace'; });
})();
