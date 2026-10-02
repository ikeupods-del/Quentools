/* Interface commune aux trois propositions : catalogue, personnalisation d'un plateau, panier, calendrier de réservation,
   commande en 3 étapes (date, informations, paiement). Chaque proposition ne change que le style (CSS) et la mise en page (HTML). */
(function () {
  'use strict';
  const NF = window.NF, Art = window.NFArt, esc = NF.esc, eur = NF.money, D = () => NF.data;
  const BASE = window.NF_BASE || '../';
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const MODS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

  /* ---------- Catalogue ---------- */
  const priceLabel = p => p.type === 'quote' ? 'Sur devis' : p.type === 'unit' ? eur(p.unitPrice) + ' / barquette' : 'dès ' + eur(Math.min.apply(null, p.sizes.map(s => s.price)));
  const sub = p => p.type === 'unit' ? 'Minimum ' + p.minUnits + ' barquettes' : p.type === 'quote' ? 'Réponse sous 48 h' : p.sizes.map(s => s.label.split(' ')[0] + '-' + s.label.split(' ')[2]).join(' · ') + ' pers.';
  function renderCatalog() {
    const box = $('#nf-catalog'); if (!box) return;
    const list = D().products.filter(p => p.active !== false), f = box.dataset.filter || 'all';
    box.innerHTML = list.filter(p => f === 'all' || p.type === f || (f === 'tray' && p.type === 'tray')).map((p, i) => `<article class="nf-card" data-pid="${p.id}" data-type="${p.type}" style="--i:${i}">
      <div class="nf-art">${Art.svg(p.art, p.name)}</div>
      <div class="nf-card-body"><span class="nf-tag">${esc(p.tag || '')}</span><h3 class="nf-name">${esc(p.name)}</h3><p class="nf-desc">${esc(p.desc)}</p>
      <div class="nf-foot"><div><span class="nf-price">${esc(priceLabel(p))}</span><small class="nf-sub">${esc(sub(p))}</small></div><button type="button" class="nf-btn nf-btn-sm" data-nf-open="${p.id}">${p.type === 'quote' ? 'Demander un devis' : 'Choisir'}</button></div></div></article>`).join('');
  }
  function renderFilters() {
    const box = $('#nf-filters'); if (!box) return;
    const F = [['all', 'Tout'], ['tray', 'Plateaux'], ['unit', 'Individuel'], ['quote', 'Entreprise']];
    box.innerHTML = F.map(([k, l]) => `<button type="button" class="nf-chip" data-f="${k}" aria-pressed="${(($('#nf-catalog') || {}).dataset || {}).filter === k || (k === 'all' && !(($('#nf-catalog') || {}).dataset || {}).filter)}">${l}</button>`).join('');
    box.onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#nf-catalog').dataset.filter = b.dataset.f; renderFilters(); renderCatalog(); };
  }
  $$('[data-nf-art]').forEach(n => { n.innerHTML = Art.svg(n.dataset.nfArt, n.dataset.label); const im = n.querySelector('img'); if (im) { im.loading = 'eager'; im.fetchPriority = 'high'; } });
  /* Galerie défilante : data-nf-gallery="baies,fraises,…" */
  $$('[data-nf-gallery]').forEach(n => { const k = n.dataset.nfGallery.split(','), one = k.map(x => `<figure>${Art.svg(x.trim(), '')}</figure>`).join(''); n.innerHTML = `<div class="nf-gal-t" aria-hidden="true">${one}${one}</div>`; });
  $$('[data-nf-fruit]').forEach(n => { n.innerHTML = Art.fruit(n.dataset.nfFruit); });

  /* ---------- Fenêtre « personnaliser un plateau » ---------- */
  function dlg(id, cls) {
    let d = document.getElementById(id);
    if (!d) { d = document.createElement('dialog'); d.id = id; d.className = 'nf-dlg ' + (cls || ''); document.body.appendChild(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
    return d;
  }
  function openProduct(pid) {
    const p = D().products.find(x => x.id === pid), d = dlg('nf-pd', 'nf-dlg-wide');
    if (!p) return;
    const opts = D().options.filter(o => o.active !== false), tray = p.type === 'tray', unit = p.type === 'unit', quote = p.type === 'quote';
    const st = { size: tray ? p.sizes[0].id : '', qty: unit ? p.minUnits : 1, opts: [] };
    const lineNow = () => NF.lineOf({ pid, size: st.size, qty: st.qty, opts: st.opts });
    d.innerHTML = `<form class="nf-pd" novalidate><button type="button" class="nf-x" data-close aria-label="Fermer">×</button>
      <div class="nf-pd-art">${Art.svg(p.art, p.name)}</div>
      <div class="nf-pd-body"><span class="nf-tag">${esc(p.tag || '')}</span><h3>${esc(p.name)}</h3><p class="nf-desc">${esc(p.desc)}</p>
      ${quote ? `<div class="nf-fields"><label>Votre nom<input name="n" autocomplete="name"></label><label>E-mail<input name="e" type="email" autocomplete="email"></label><label class="nf-full">Votre besoin (fréquence, nombre de personnes, budget)<textarea name="m" rows="3"></textarea></label></div><p class="nf-err" id="nf-pd-err" hidden></p><p class="nf-ok" id="nf-pd-ok" hidden></p><button type="submit" class="nf-btn">Envoyer ma demande</button>` : `
      ${tray ? `<fieldset class="nf-fs"><legend>Taille</legend><div class="nf-opts">${p.sizes.map((s, i) => `<label class="nf-optc"><input type="radio" name="size" value="${s.id}"${i ? '' : ' checked'}><span><b>${esc(s.label)}</b><em>${eur(s.price)}</em></span></label>`).join('')}</div></fieldset>` : ''}
      <div class="nf-qty-row"><span class="nf-lbl">${unit ? 'Nombre de barquettes' : 'Quantité'}</span><div class="nf-qty" role="group"><button type="button" data-d="-1" aria-label="Moins">−</button><output id="nf-pq" aria-live="polite">${st.qty}</output><button type="button" data-d="1" aria-label="Plus">+</button></div>${unit ? `<small class="nf-sub">Minimum ${p.minUnits}</small>` : ''}</div>
      <fieldset class="nf-fs"><legend>Pour l’accompagner <small>(facultatif)</small></legend><div class="nf-checks">${opts.map(o => `<label class="nf-check"><input type="checkbox" name="opt" value="${o.id}"><span>${esc(o.name)}</span><em>+ ${eur(o.price)}${o.per === 'tray' ? ' / plateau' : ''}</em></label>`).join('')}</div></fieldset>
      <div class="nf-pd-foot"><div><span class="nf-lbl">Total</span><strong id="nf-pt">—</strong></div><button type="submit" class="nf-btn">Ajouter au panier</button></div>`}
      </div></form>`;
    const form = $('form', d), upd = () => { const l = lineNow(); const t = $('#nf-pt', d); if (t) t.textContent = eur(l.lineTotal); const q = $('#nf-pq', d); if (q) q.textContent = st.qty; };
    form.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) return d.close();
      const b = e.target.closest('.nf-qty button'); if (b) { st.qty = Math.max(unit ? p.minUnits : 1, Math.min(unit ? 200 : 20, st.qty + +b.dataset.d)); upd(); }
    });
    form.addEventListener('change', () => { const r = $('input[name=size]:checked', form); if (r) st.size = r.value; st.opts = $$('input[name=opt]:checked', form).map(x => x.value); upd(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (quote) {
        const n = form.n.value.trim(), m = form.e.value.trim(), err = $('#nf-pd-err', d), ok = $('#nf-pd-ok', d); err.hidden = ok.hidden = true;
        if (!n || !/^\S+@\S+\.\S+$/.test(m)) { err.textContent = 'Indiquez votre nom et un e-mail valide.'; err.hidden = false; return; }
        NF.sendMail(NF.CFG.email, 'Demande de devis : ' + p.name, 'De : ' + n + ' <' + m + '>\n\n' + form.m.value); NF.save();
        ok.textContent = 'Demande envoyée, ' + n.split(' ')[0] + ' ! Démonstration : rien n’est réellement transmis.'; ok.hidden = false; return;
      }
      fly($('.nf-pd-art img', d)); NF.cartAdd({ pid, size: st.size, qty: st.qty, opts: st.opts }); d.close(); setTimeout(() => openDrawer(true), reduced ? 0 : 750);
    });
    upd(); d.showModal();
  }

  /* ---------- Panier (tiroir) ---------- */
  function drawer() {
    let a = $('#nf-drawer');
    if (!a) {
      a = document.createElement('aside'); a.id = 'nf-drawer'; a.className = 'nf-drawer'; a.hidden = true; a.setAttribute('aria-label', 'Panier'); document.body.appendChild(a);
      const o = document.createElement('div'); o.id = 'nf-ovl'; o.className = 'nf-ovl'; o.hidden = true; document.body.appendChild(o); o.addEventListener('click', () => openDrawer(false));
      a.addEventListener('click', e => {
        if (e.target.closest('[data-close]')) return openDrawer(false);
        const q = e.target.closest('[data-qd]'); if (q) return NF.cartQty(q.dataset.cid, +q.dataset.qd);
        const r = e.target.closest('[data-rm]'); if (r) return NF.cartRemove(r.dataset.rm);
        if (e.target.closest('[data-go]')) { openDrawer(false); openCheckout(); }
        if (e.target.closest('[data-more]')) { openDrawer(false); const c = $('#nf-catalog'); if (c) c.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); else location.href = './#nf-catalog'; }
      });
    }
    return a;
  }
  function renderDrawer() {
    const a = drawer(), lines = NF.cartLines(), n = lines.reduce((s, l) => s + (l.type === 'unit' ? 1 : l.qty), 0), q = NF.quote(lines, 'retrait', '');
    $$('[data-nf-count]').forEach(x => { x.textContent = lines.length; x.hidden = !lines.length; });
    a.innerHTML = `<div class="nf-dh"><h3>Mon panier</h3><button type="button" class="nf-x" data-close aria-label="Fermer">×</button></div>
      <div class="nf-dl">${lines.length ? lines.map(l => { const p = D().products.find(x => x.id === l.pid); return `<div class="nf-li"><div class="nf-li-art" aria-hidden="true">${Art.svg(p.art)}</div><div class="nf-li-t"><b>${esc(l.name)}</b><small>${esc(l.sizeLabel)}${l.optsLabel ? ' · ' + esc(l.optsLabel) : ''}</small><span class="nf-li-p">${eur(l.lineTotal)}</span></div><div class="nf-qty nf-qty-sm"><button type="button" data-qd="-1" data-cid="${l.cid}" aria-label="Moins">−</button><output>${l.qty}</output><button type="button" data-qd="1" data-cid="${l.cid}" aria-label="Plus">+</button></div><button type="button" class="nf-rm" data-rm="${l.cid}" aria-label="Retirer ${esc(l.name)}">Retirer</button></div>`; }).join('') : '<p class="nf-empty">Votre panier est vide.<br>Choisissez un plateau pour commencer.</p>'}</div>
      <div class="nf-df">${lines.length ? `<div class="nf-row"><span>Sous-total</span><b>${eur(q.subtotal)}</b></div><p class="nf-hint">Acompte de ${D().settings.depositPct} % à la commande (${eur(q.deposit)}), solde à la remise. Livraison en option à l’étape suivante.</p><button type="button" class="nf-btn nf-btn-block" data-go>Choisir la date</button><button type="button" class="nf-link" data-more>Ajouter un autre plateau</button>` : `<button type="button" class="nf-btn nf-btn-block" data-more>Voir les plateaux</button>`}</div>`;
  }
  function openDrawer(o) { const a = drawer(), v = $('#nf-ovl'); a.hidden = v.hidden = !o; if (o) { renderDrawer(); const x = $('[data-close]', a); if (x) x.focus(); } }

  /* ---------- Calendrier de disponibilités ---------- */
  function monthRange() { const t = parseISO(NF.today()), h = parseISO(NF.addDays(NF.today(), D().settings.horizonDays)); return [new Date(t.getFullYear(), t.getMonth(), 1), new Date(h.getFullYear(), h.getMonth(), 1)]; }
  const parseISO = s => NF.parse(s);
  function calendar(el, o) {
    const st = o.state, [min, max] = monthRange();
    const m = st.month || new Date(min), first = new Date(m.getFullYear(), m.getMonth(), 1), start = (first.getDay() + 6) % 7, nd = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let cells = ''; for (let i = 0; i < start; i++) cells += '<span class="nf-day nf-day-pad"></span>';
    for (let d = 1; d <= nd; d++) {
      const date = NF.ymd(new Date(m.getFullYear(), m.getMonth(), d)), s = date < NF.today() ? { state: 'past', reason: 'Passé' } : NF.dayState(date), ok = s.state === 'free' || s.state === 'busy';
      cells += `<button type="button" class="nf-day" data-date="${date}" data-state="${s.state}" aria-pressed="${st.date === date}" aria-label="${esc(NF.frDate(date))} : ${esc(s.reason)}"${o.pickAny || ok ? '' : ' disabled'}><b>${d}</b>${ok ? `<i style="--l:${Math.min(100, Math.round(s.load / s.cap * 100))}%"></i>` : ''}</button>`;
    }
    const prevOk = first > min, nextOk = first < max;
    el.innerHTML = `<div class="nf-cal"><div class="nf-cal-h"><button type="button" class="nf-nav" data-mv="-1" aria-label="Mois précédent"${prevOk ? '' : ' disabled'}>‹</button><strong>${NF.MONTHS[m.getMonth()]} ${m.getFullYear()}</strong><button type="button" class="nf-nav" data-mv="1" aria-label="Mois suivant"${nextOk ? '' : ' disabled'}>›</button></div>
      <div class="nf-cal-w">${MODS.map(x => `<span>${x}</span>`).join('')}</div><div class="nf-cal-g">${cells}</div>
      <div class="nf-legend"><span data-s="free">Disponible</span><span data-s="busy">Presque complet</span><span data-s="full">Complet</span><span data-s="closed">Fermé</span></div></div>`;
    el.onclick = e => {
      const mv = e.target.closest('[data-mv]'); if (mv) { st.month = new Date(m.getFullYear(), m.getMonth() + +mv.dataset.mv, 1); return calendar(el, o); }
      const b = e.target.closest('.nf-day[data-date]'); if (!b || b.disabled) return; st.date = b.dataset.date; o.onPick && o.onPick(st.date); calendar(el, o);
    };
  }
  function dayInfo(date) {
    const s = NF.dayState(date), S = D().settings;
    return `<strong>${esc(NF.frDate(date))}</strong> · <span class="nf-st" data-s="${s.state}">${esc(s.reason)}</span>${s.state === 'free' || s.state === 'busy' ? ` · ${Math.round(s.left * 10) / 10} place${s.left > 1 ? 's' : ''} sur ${s.cap}` : ''}`;
  }
  function mountSection() {
    const el = $('#nf-calendar'); if (!el) return;
    el.innerHTML = '<div class="nf-calwrap"><div id="nf-calbox"></div><div class="nf-calside" id="nf-calside"><p class="nf-hint">Touchez un jour pour voir les disponibilités.</p></div></div>';
    const st = { date: null, month: null };
    calendar($('#nf-calbox'), { state: st, pickAny: true, onPick: date => {
      const s = NF.dayState(date), ok = s.state === 'free' || s.state === 'busy';
      $('#nf-calside').innerHTML = `<p class="nf-dayinfo">${dayInfo(date)}</p>` + (ok ? `<p class="nf-hint">Commande à passer ${D().settings.minNoticeH} h à l’avance minimum. Retrait ${D().settings.pickup.from} h – ${D().settings.pickup.to} h ou livraison.</p><button type="button" class="nf-btn" data-want="${date}">Commander pour ce jour</button>` : `<p class="nf-hint">Ce jour n’est pas disponible. Essayez un autre jour.</p>`);
    } });
    el.addEventListener('click', e => { const w = e.target.closest('[data-want]'); if (w) { co.date = w.dataset.want; co.slot = ''; if (NF.cartLines().length) openCheckout(); else { const c = $('#nf-catalog'); toast('Choisissez d’abord votre plateau : la date du ' + NF.frDate(co.date) + ' est gardée.'); if (c) c.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); } } });
  }
  function toast(msg) { let t = $('#nf-toast'); if (!t) { t = document.createElement('div'); t.id = 'nf-toast'; t.className = 'nf-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 4200); }

  /* ---------- Commande en 3 étapes ---------- */
  const co = { step: 1, mode: 'retrait', zone: '', address: '', date: '', slot: '', month: null, name: '', email: '', phone: '', exclude: '', card: '', payMode: 'deposit', err: '', done: null };
  function prefill() { const me = NF.account(); if (me) { co.name = co.name || me.name; co.email = co.email || me.email; co.phone = co.phone || me.phone || ''; co.address = co.address || me.address || ''; co.exclude = co.exclude || me.allergies || ''; } }
  function openCheckout() {
    const lines = NF.cartLines(); if (!lines.length && !co.done) return openDrawer(true);
    prefill(); if (!D().settings.open) { toast('Les commandes en ligne sont fermées pour le moment.'); }
    const d = dlg('nf-co', 'nf-dlg-wide'); co.done = null; co.err = ''; co.step = 1; renderCo(); d.showModal();
  }
  const steps = ['Date', 'Vos informations', 'Paiement'];
  function renderCo() {
    const d = $('#nf-co'); if (!d) return;
    const lines = NF.cartLines(), q = NF.quote(lines, co.mode, co.zone), S = D().settings;
    if (co.done) { return d.innerHTML = successHTML(co.done); }
    const head = `<div class="nf-co-h"><h3>Ma commande</h3><button type="button" class="nf-x" data-close aria-label="Fermer">×</button></div><ol class="nf-steps">${steps.map((s, i) => `<li class="${i + 1 === co.step ? 'on' : i + 1 < co.step ? 'done' : ''}"><b>${i + 1}</b>${s}</li>`).join('')}</ol>`;
    let body = '';
    if (co.step === 1) {
      const slots = co.date ? NF.slotsFor(co.date, co.mode) : [], ds = co.date ? NF.dayState(co.date) : null;
      body = `<div class="nf-co-b"><div class="nf-seg" role="group" aria-label="Mode de remise"><label class="nf-segc"><input type="radio" name="mode" value="retrait"${co.mode === 'retrait' ? ' checked' : ''}><span><b>Retrait</b><em>en boutique · gratuit</em></span></label><label class="nf-segc"><input type="radio" name="mode" value="livraison"${co.mode === 'livraison' ? ' checked' : ''}><span><b>Livraison</b><em>selon la zone</em></span></label></div>
        ${co.mode === 'livraison' ? `<div class="nf-fields"><label>Zone de livraison<select name="zone"><option value="">— Choisir —</option>${S.delivery.zones.map(z => `<option value="${z.id}"${co.zone === z.id ? ' selected' : ''}>${esc(z.name)} · ${eur(z.fee)}</option>`).join('')}</select></label><label>Adresse<input name="address" value="${esc(co.address)}" autocomplete="street-address" placeholder="Numéro, rue, ville"></label></div><p class="nf-hint">Commande minimale ${eur(S.delivery.minOrder)} · livraison offerte dès ${eur(S.delivery.freeFrom)}.</p>` : ''}
        <div id="nf-co-cal"></div><p class="nf-dayinfo" id="nf-co-info">${co.date ? dayInfo(co.date) : 'Choisissez un jour dans le calendrier.'}</p>
        <div class="nf-slots" role="group" aria-label="Créneau">${co.date ? slots.map(s => `<button type="button" class="nf-slot" data-slot="${esc(s.id)}" aria-pressed="${co.slot === s.id}"${s.free ? '' : ' disabled'}>${esc(s.label)}</button>`).join('') : ''}</div>${ds && co.date && q.load > ds.left && (ds.state === 'free' || ds.state === 'busy') ? '<p class="nf-err">Cette commande est trop importante pour ce jour : il reste ' + Math.round(ds.left * 10) / 10 + ' place(s).</p>' : ''}</div>`;
    } else if (co.step === 2) {
      body = `<div class="nf-co-b"><div class="nf-fields"><label>Votre nom<input name="name" value="${esc(co.name)}" autocomplete="name"></label><label>E-mail<input name="email" type="email" value="${esc(co.email)}" autocomplete="email"></label><label>Téléphone <small>(pour la remise)</small><input name="phone" type="tel" value="${esc(co.phone)}" autocomplete="tel"></label>
        <label class="nf-full">Allergies ou fruits à éviter <small>(on s’adapte)</small><textarea name="exclude" rows="2" maxlength="300" placeholder="Ex. pas de kiwi, allergie aux fruits à coque">${esc(co.exclude)}</textarea></label>
        <label class="nf-full">Petit mot sur la carte <small>(facultatif)</small><input name="card" maxlength="120" value="${esc(co.card)}" placeholder="Joyeux anniversaire !"></label></div></div>`;
    } else {
      const modes = [['deposit', 'Acompte ' + S.depositPct + ' %', 'Maintenant : ' + eur(q.deposit) + ' · solde de ' + eur(q.total - q.deposit) + ' à la remise', S.card], ['full', 'Payer tout maintenant', eur(q.total) + ' par carte', S.card], ['cash', 'Payer à la remise', 'Espèces ou carte sur place (retrait uniquement)', S.cash && co.mode === 'retrait']].filter(m => m[3]);
      if (!modes.some(m => m[0] === co.payMode)) co.payMode = modes[0] ? modes[0][0] : 'deposit';
      body = `<div class="nf-co-b nf-pay"><div class="nf-opts nf-opts-col" role="radiogroup" aria-label="Paiement">${modes.map(m => `<label class="nf-optc"><input type="radio" name="payMode" value="${m[0]}"${co.payMode === m[0] ? ' checked' : ''}><span><b>${m[1]}</b><em>${m[2]}</em></span></label>`).join('') || '<p class="nf-err">Aucun mode de paiement disponible pour ce mode de remise.</p>'}</div>
        <div class="nf-recap"><h4>Récapitulatif</h4>${lines.map(l => `<div class="nf-row"><span>${esc(l.name)}${l.type === 'unit' ? '' : l.qty > 1 ? ' × ' + l.qty : ''} <small>${esc(l.sizeLabel)}${l.optsLabel ? ' + ' + esc(l.optsLabel) : ''}</small></span><b>${eur(l.lineTotal)}</b></div>`).join('')}${q.fee ? `<div class="nf-row"><span>Livraison</span><b>${eur(q.fee)}</b></div>` : ''}<div class="nf-row nf-total"><span>Total</span><b>${eur(q.total)}</b></div><p class="nf-hint">${co.mode === 'livraison' ? 'Livraison' : 'Retrait'} : ${esc(NF.frDate(co.date))}, ${esc(co.mode === 'retrait' ? co.slot.replace(':00', ' h') : co.slot)}${co.exclude ? '<br>À éviter : ' + esc(co.exclude) : ''}</p></div></div>`;
    }
    d.innerHTML = head + body + `${co.err ? `<p class="nf-err" role="alert">${esc(co.err)}</p>` : ''}<div class="nf-co-f"><button type="button" class="nf-link" data-back>${co.step === 1 ? 'Retour au panier' : '← Retour'}</button><button type="button" class="nf-btn" data-next>${co.step === 3 ? (co.payMode === 'cash' ? 'Confirmer la commande' : 'Payer et confirmer') : 'Continuer'}</button></div>`;
    if (co.step === 1) { const st = { date: co.date, month: co.month }; calendar($('#nf-co-cal', d), { state: st, onPick: date => { co.date = date; co.slot = ''; co.month = st.month; co.err = ''; renderCo(); } }); }
  }
  function coEvents() {
    document.addEventListener('click', e => {
      const d = $('#nf-co'); if (!d || !d.contains(e.target)) return;
      if (e.target.closest('[data-close]')) return d.close();
      if (e.target.closest('[data-back]')) { if (co.step === 1) { d.close(); return openDrawer(true); } co.step--; co.err = ''; return renderCo(); }
      const sl = e.target.closest('[data-slot]'); if (sl && !sl.disabled) { co.slot = sl.dataset.slot; co.err = ''; return renderCo(); }
      if (e.target.closest('[data-next]')) next();
      if (e.target.closest('[data-finish]')) { d.close(); }
    });
    document.addEventListener('input', e => { const d = $('#nf-co'); if (!d || !d.contains(e.target)) return; const n = e.target.name; if (['name', 'email', 'phone', 'exclude', 'card', 'address'].includes(n)) co[n] = e.target.value; });
    document.addEventListener('change', e => {
      const d = $('#nf-co'); if (!d || !d.contains(e.target)) return; const n = e.target.name;
      if (n === 'mode') { co.mode = e.target.value; co.slot = ''; renderCo(); } else if (n === 'zone') { co.zone = e.target.value; } else if (n === 'payMode') { co.payMode = e.target.value; renderCo(); }
    });
  }
  function next() {
    const lines = NF.cartLines(), q = NF.quote(lines, co.mode, co.zone), S = D().settings; co.err = '';
    if (co.step === 1) {
      if (co.mode === 'livraison' && !co.zone) co.err = 'Choisissez votre zone de livraison.';
      else if (co.mode === 'livraison' && !co.address.trim()) co.err = 'Indiquez l’adresse de livraison.';
      else if (co.mode === 'livraison' && !q.minOrderOk) co.err = 'Commande minimale pour la livraison : ' + eur(S.delivery.minOrder) + '.';
      else if (!co.date) co.err = 'Choisissez un jour dans le calendrier.';
      else if (!co.slot) co.err = 'Choisissez un créneau.';
      else { const ds = NF.dayState(co.date); if (q.load > ds.left) co.err = 'Pas assez de place ce jour-là pour cette commande.'; }
      if (!co.err) co.step = 2;
    } else if (co.step === 2) {
      if (!co.name.trim()) co.err = 'Indiquez votre nom.'; else if (!/^\S+@\S+\.\S+$/.test(co.email.trim())) co.err = 'Indiquez un e-mail valide pour la confirmation.'; else co.step = 3;
    } else {
      if (co.payMode !== 'cash') { const pd = payDlg(); $('#nf-payamt', pd).textContent = eur(co.payMode === 'full' ? q.total : q.deposit); pd.showModal(); return; }
      return place();
    }
    renderCo();
  }
  function payDlg() {
    let d = $('#nf-pay');
    if (!d) { d = dlg('nf-pay'); d.innerHTML = `<div class="nf-paybox"><p class="nf-tag">Paiement sécurisé</p><h3>Régler par carte</h3><p class="nf-amt" id="nf-payamt"></p><p class="nf-hint nf-demo-note">Démonstration : aucune carte n’est demandée et rien n’est prélevé. Sur un vrai site, cette fenêtre est celle du prestataire de paiement (Stripe).</p><div class="nf-pay-acts"><button type="button" class="nf-btn" data-payok>Payer (simulation)</button><button type="button" class="nf-link" data-payno>Annuler</button></div></div>`; d.addEventListener('click', e => { if (e.target.closest('[data-payok]')) { d.close(); place(); } if (e.target.closest('[data-payno]')) d.close(); }); }
    return d;
  }
  function place() {
    const r = NF.placeOrder({ mode: co.mode, zone: co.zone, address: co.address, date: co.date, slot: co.slot, customer: { name: co.name, email: co.email, phone: co.phone }, exclude: co.exclude, card: co.card, payMode: co.payMode });
    if (r.error) { co.err = r.error; if (/date|créneau|place|disponible/i.test(r.error)) co.step = 1; return renderCo(); }
    co.done = r.order; co.slot = ''; renderCo();
  }
  function successHTML(o) {
    return `<div class="nf-co-h"><h3>Commande confirmée</h3><button type="button" class="nf-x" data-close aria-label="Fermer">×</button></div><div class="nf-co-b nf-success"><p class="nf-ref">${esc(o.ref)}</p><p class="nf-big">Merci ${esc(o.customer.name.split(' ')[0])} !</p>
      <p>${o.mode === 'livraison' ? 'Livraison' : 'Retrait'} le <b>${esc(NF.frDate(o.date))}</b>, ${esc(o.mode === 'retrait' ? o.slot.replace(':00', ' h') : o.slot)}.</p>
      <p>Total ${eur(o.total)} · réglé ${eur(NF.paidOf(o))}${NF.dueOf(o) ? ' · <b>reste ' + eur(NF.dueOf(o)) + '</b> à régler à la remise (ou en ligne depuis votre espace)' : ' · soldé'}.</p>${D().settings.email ? `<p class="nf-ok">Un e-mail de confirmation a été envoyé à ${esc(o.customer.email)}.</p>` : ''}
      <div class="nf-pay-acts"><button type="button" class="nf-btn nf-btn-ghost" data-ics>Ajouter à mon agenda</button><a class="nf-btn" href="${BASE}compte/?demo=${encodeURIComponent(o.customer.email)}">Voir ma commande</a><button type="button" class="nf-link" data-finish>Fermer</button></div></div>`;
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-ics]') && co.done) { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([NF.ics(co.done)], { type: 'text/calendar' })); l.download = 'commande-naw-fruity.ics'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000); } });

  /* ---------- Barre de démonstration (à retirer pour la livraison) ---------- */
  function demoBar() {
    if ($('.nf-demo') || window.NF_NO_DEMOBAR) return;
    const cur = window.NF_THEME || '', T = [['tropical', 'Solaire'], ['atelier', 'Atelier'], ['gourmand', 'Gourmand']];
    const w = document.createElement('div'); w.className = 'nf-demo';
    w.innerHTML = `<div class="nf-demo-g" aria-label="Propositions de design"><span>Proposition</span>${T.map(([k, l], i) => `<a href="${BASE}${k}/"${k === cur ? ' aria-current="page"' : ''}>${i + 1} · ${l}</a>`).join('')}</div><div class="nf-demo-g"><a href="${BASE}compte/?demo">Vue client</a><a href="${BASE}admin/?demo">Vue admin</a></div>`;
    document.body.appendChild(w);
  }

  /* ---------- Démarrage ---------- */
  function refreshAccount() { const me = NF.account(); $$('[data-nf-account]').forEach(a => { a.href = BASE + 'compte/'; a.textContent = me ? 'Mon espace' : (a.dataset.label || 'Connexion'); }); }
  function closedBanner() { const b = $('#nf-closed'); if (b) b.hidden = D().settings.open; }
  document.addEventListener('click', e => {
    const o = e.target.closest('[data-nf-open]'); if (o) { e.preventDefault(); return openProduct(o.dataset.nfOpen); }
    const c = e.target.closest('[data-nf-cart]'); if (c) { e.preventDefault(); return openDrawer(true); }
    const k = e.target.closest('[data-nf-checkout]'); if (k) { e.preventDefault(); return openCheckout(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#nf-drawer').hidden) openDrawer(false); });
  coEvents();
  /* La photo du plateau « vole » jusqu’au bouton Panier */
  function fly(img) {
    const btn = $('[data-nf-cart]'); if (!img || !btn || reduced) return;
    const a = img.getBoundingClientRect(), b = btn.getBoundingClientRect(), c = document.createElement('img');
    c.src = img.src; c.className = 'nf-fly'; c.alt = ''; const s = 96;
    c.style.cssText = `left:${a.left + a.width / 2 - s / 2}px;top:${a.top + a.height / 2 - s / 2}px;width:${s}px;height:${s}px`;
    document.body.appendChild(c);
    requestAnimationFrame(() => requestAnimationFrame(() => { c.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px,${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.2)`; c.style.opacity = '.4'; }));
    setTimeout(() => { c.remove(); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump'); }, 850);
  }
  /* Parallaxe douce au défilement et inclinaison à la souris */
  (function () {
    const P = $$('[data-par]'), T = $$('[data-tilt]'); if (reduced || !(P.length || T.length)) return;
    let y = 0, tick = false;
    const run = () => { tick = false; P.forEach(n => { const r = n.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return; const k = parseFloat(n.dataset.par) || .08; n.style.transform = `translate3d(0,${((r.top + r.height / 2 - innerHeight / 2) * -k).toFixed(1)}px,0)`; }); };
    addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true }); run();
    T.forEach(n => { const z = n.closest('.hero') || n; z.addEventListener('pointermove', e => { const r = z.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, yy = (e.clientY - r.top) / r.height - .5; n.style.setProperty('--tx', (x * 18).toFixed(1) + 'px'); n.style.setProperty('--ty', (yy * 14).toFixed(1) + 'px'); }); });
  })();
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  function reveal() { $$('.nf-rv:not(.in),.nf-img-rv:not(.in)').forEach(n => io.observe(n)); }
  function all() { renderFilters(); renderCatalog(); renderDrawer(); refreshAccount(); closedBanner(); if (!$('#nf-co') || !$('#nf-co').open) { /* ne pas redessiner pendant une commande */ } reveal(); }
  NF.onChange(() => { renderCatalog(); renderDrawer(); refreshAccount(); closedBanner(); });
  try { if (window.NF_THEME) localStorage.setItem('naw-fruity:theme', window.NF_THEME); } catch (e) { /* ignoré */ }
  all(); mountSection(); demoBar();
  if (/[?&]panier=1/.test(location.search)) { history.replaceState(null, '', location.pathname); openDrawer(true); }
  window.NFApp = { openCheckout, openDrawer, openProduct, toast };
})();
