/* Administration Naw Fruity : calendrier de charge, commandes, fiche de production, plateaux et options, paiements, clients, réglages, e-mails. */
(function () {
  'use strict';
  const NF = window.NF, Art = window.NFArt, CFG = NF.CFG, esc = NF.esc, eur = NF.money, D = () => NF.data, S = () => NF.data.settings;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const TABS = [['agenda', 'Calendrier'], ['commandes', 'Commandes'], ['production', 'Production'], ['plateaux', 'Plateaux'], ['paiements', 'Paiements'], ['clients', 'Clients'], ['reglages', 'Réglages'], ['emails', 'E-mails']];
  const NEXT = { 'confirmée': 'en préparation', 'en préparation': 'prête', 'prête': 'remise' };
  let tab = 'agenda', flt = 'avenir', q = '', flash = '', month = null, sel = null, prodDate = null;
  document.querySelectorAll('[data-shop]').forEach(n => { n.textContent = CFG[n.dataset.shop] || ''; });
  $('#hint').textContent = CFG.adminCode; $('#mk').innerHTML = Art.fruit('strawberry');
  const slotTxt = o => o.mode === 'retrait' ? o.slot.replace(':00', ' h') : o.slot;
  const items = o => o.items.map(i => esc(i.name) + (i.type === 'unit' ? ' (' + i.qty + ')' : i.qty > 1 ? ' ×' + i.qty : '') + (i.sizeLabel && i.type !== 'unit' ? ' <span class="mut">' + esc(i.sizeLabel.split(' ').slice(0, 3).join(' ')) + '</span>' : '')).join(' · ');

  /* ---------- Accès (démonstration) ---------- */
  const ok = () => { try { return sessionStorage.getItem('nf-admin') === '1'; } catch (e) { return false; } };
  if (/[?&]demo\b/.test(location.search)) { try { sessionStorage.setItem('nf-admin', '1'); } catch (e) { /* ignoré */ } history.replaceState(null, '', location.pathname); }
  function gate() { const on = ok(); $('#gate').hidden = on; $('#app').hidden = !on; if (on) render(); }
  $('#gateForm').addEventListener('submit', e => { e.preventDefault(); if ($('#code').value === CFG.adminCode) { try { sessionStorage.setItem('nf-admin', '1'); } catch (x) { /* ignoré */ } gate(); } else $('#gateErr').hidden = false; });
  $('#logout').addEventListener('click', () => { try { sessionStorage.removeItem('nf-admin'); } catch (e) { /* ignoré */ } $('#code').value = ''; gate(); });

  /* ---------- Barre d'interrupteurs ---------- */
  const sw = (path, label, on, off, v) => `<label class="sw"><input type="checkbox" data-bind="${path}" data-t="bool"${v ? ' checked' : ''}><span class="knob"></span><span>${label}<small>${v ? on : off}</small></span></label>`;
  function renderBar() {
    const s = S();
    $('#switches').innerHTML = sw('settings.open', 'Commandes en ligne', 'Ouvertes : les clients peuvent commander', 'Fermées : le site affiche votre numéro', s.open) + sw('settings.card', 'Paiement par carte', 'Acompte et total possibles en ligne', 'Désactivé : paiement à la remise uniquement', s.card) + sw('settings.cash', 'Paiement à la remise', 'Proposé pour les retraits', 'Non proposé', s.cash) + sw('settings.email', 'Notifications e-mail', 'Confirmation, préparation, annulation', 'Aucun e-mail envoyé', s.email);
    $('#tabs').innerHTML = TABS.map(t => `<button role="tab" type="button" data-tab="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('');
  }

  /* ---------- Chips d'état ---------- */
  const stChip = o => ({ 'confirmée': '<span class="chip warn">Confirmée</span>', 'en préparation': '<span class="chip ink">En préparation</span>', 'prête': '<span class="chip go">Prête</span>', 'remise': '<span class="chip ok">Remise</span>', 'annulée': '<span class="chip no">Annulée</span>' }[o.status]);
  const payChip = o => { const due = NF.dueOf(o), paid = NF.paidOf(o); if (o.status === 'annulée') return o.refund ? `<span class="chip no">Rembourser ${eur(o.refund)}</span>` : ''; return due ? `<span class="chip warn">Payé ${eur(paid)} · reste ${eur(due)}</span>` : '<span class="chip ok">Soldé</span>'; };

  /* ---------- Calendrier ---------- */
  function panelAgenda() {
    const t = NF.today(), orders = D().orders, live = orders.filter(o => o.status !== 'annulée');
    const upcoming = live.filter(o => o.date >= t && o.status !== 'remise'), dueTotal = upcoming.reduce((a, o) => a + NF.dueOf(o), 0), refunds = orders.filter(o => o.refund > 0).reduce((a, o) => a + o.refund, 0), today = live.filter(o => o.date === t).length;
    month = month || new Date(parseInt(t.slice(0, 4), 10), parseInt(t.slice(5, 7), 10) - 1, 1);
    const first = new Date(month.getFullYear(), month.getMonth(), 1), start = (first.getDay() + 6) % 7, nd = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    let cells = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(x => `<span class="w">${x}</span>`).join('');
    for (let i = 0; i < start; i++) cells += '<span class="ad pad"></span>';
    for (let d = 1; d <= nd; d++) {
      const date = NF.ymd(new Date(month.getFullYear(), month.getMonth(), d)), cap = NF.capOf(date), ld = NF.loadOf(date), n = live.filter(o => o.date === date).length, closed = S().closedWeekdays.includes(new Date(date + 'T12:00').getDay()) || S().closedDates.includes(date), pct = Math.min(100, Math.round(ld / (cap || 1) * 100));
      cells += `<button type="button" class="ad${closed ? ' closed' : pct >= 100 ? ' full' : pct >= 70 ? ' busy' : ''}${sel === date ? ' sel' : ''}${date === t ? ' today' : ''}" data-day="${date}" aria-label="${esc(NF.frDate(date))}"><b>${d}</b>${closed ? '<span class="n">Fermé</span>' : n ? `<span class="cnt">${n}</span><span class="n">${Math.round(ld * 10) / 10}/${cap}</span>` : '<span class="n">Libre</span>'}<span class="bar2"><i style="width:${closed ? 0 : pct}%"></i></span></button>`;
    }
    return `<div class="kpis"><div class="kpi"><b>${today}</b><span>Commandes aujourd’hui</span></div><div class="kpi"><b>${upcoming.length}</b><span>Commandes à venir</span></div><div class="kpi"><b>${eur(dueTotal)}</b><span>Soldes à encaisser</span></div><div class="kpi"><b>${eur(refunds)}</b><span>Remboursements à faire</span></div></div>
      <div class="cols"><div class="card"><div class="cal-h"><button class="nv" data-mv="-1" type="button" aria-label="Mois précédent">‹</button><strong>${NF.MONTHS[month.getMonth()]} ${month.getFullYear()}</strong><button class="nv" data-mv="1" type="button" aria-label="Mois suivant">›</button></div><div class="acal">${cells}</div><p class="mut" style="margin:14px 0 0;font-size:13px">Le chiffre rouge = nombre de commandes ; « 3/12 » = places utilisées sur la capacité du jour. Cliquez un jour pour le gérer.</p></div>
      <div>${sel ? dayPanel(sel) : '<div class="card"><h3>Sélectionnez un jour</h3><p class="mut">Vous verrez ses commandes, pourrez changer sa capacité, le fermer ou imprimer la fiche de production.</p></div>'}</div></div>`;
  }
  function dayPanel(date) {
    const list = D().orders.filter(o => o.date === date && o.status !== 'annulée').sort((a, b) => a.slot.localeCompare(b.slot)), cap = NF.capOf(date), custom = S().capOverride[date] != null, closedDate = S().closedDates.includes(date), closedWd = S().closedWeekdays.includes(new Date(date + 'T12:00').getDay());
    return `<div class="card"><p class="kick">Jour sélectionné</p><h3 style="text-transform:capitalize">${esc(NF.frDate(date))}</h3><p class="mut">${closedWd ? 'Jour de fermeture hebdomadaire.' : closedDate ? 'Jour fermé exceptionnellement.' : Math.round(NF.loadOf(date) * 10) / 10 + ' place(s) utilisées sur ' + cap + (custom ? ' (capacité modifiée)' : '')}</p>
      <div class="fields" style="margin:14px 0"><label class="f">Capacité ce jour-là<input class="in" type="number" min="0" step="1" value="${cap}" data-cap="${date}"></label><div style="align-self:end;display:flex;gap:8px;flex-wrap:wrap">${custom ? `<button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-capreset="${date}">Capacité normale</button>` : ''}${closedWd ? '' : `<button type="button" class="nf-btn nf-btn-sm ${closedDate ? '' : 'nf-btn-ghost'}" data-closeday="${date}">${closedDate ? 'Rouvrir ce jour' : 'Fermer ce jour'}</button>`}</div></div>
      ${list.length ? `<h4 class="kick" style="margin-top:6px">Commandes (${list.length})</h4>${list.map(o => `<div class="row" style="margin-bottom:8px"><div class="main"><b class="t">${esc(slotTxt(o))} · ${esc(o.customer.name)}</b><br><span class="mut">${items(o)}</span><br>${stChip(o)}${payChip(o)}</div></div>`).join('')}<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="nf-btn nf-btn-sm" data-prod="${date}">Fiche de production</button><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-newfor="${date}">Ajouter une commande</button></div>` : `<p class="mut">Aucune commande ce jour-là.</p><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-newfor="${date}">Ajouter une commande (téléphone, boutique)</button>`}</div>`;
  }

  /* ---------- Commandes ---------- */
  function orderRow(o) {
    const due = NF.dueOf(o), next = NEXT[o.status], id = esc(o.id);
    return `<div class="row${o.status === 'annulée' ? ' off' : ''}"><div class="main"><b class="t">${esc(o.ref)} · ${esc(o.customer.name)}</b> <span class="mut">${esc(NF.frDate(o.date))} · ${esc(slotTxt(o))} · ${o.mode === 'livraison' ? 'livraison (' + esc((NF.zoneOf(o.zone) || { name: '' }).name) + ')' : 'retrait'}</span><br>${items(o)}<br><span class="mut">${esc(o.customer.email)}${o.customer.phone ? ' · ' + esc(o.customer.phone) : ''}${o.address ? ' · ' + esc(o.address) : ''}</span>${o.exclude ? `<br><b style="color:#a4281b">À éviter : ${esc(o.exclude)}</b>` : ''}${o.card ? `<br><span class="mut">Carte : « ${esc(o.card)} »</span>` : ''}<br>${stChip(o)}${payChip(o)}<span class="chip">${eur(o.total)}</span>${o.source === 'boutique' ? '<span class="chip">Saisie boutique</span>' : ''}</div>
      <div class="acts">${next ? `<button class="nf-btn nf-btn-sm" data-st="${id}" data-to="${next}">${next === 'remise' ? 'Remise au client' + (due ? ' + encaisser' : '') : next === 'prête' ? 'Prête' : 'En préparation'}</button>` : ''}${due && o.status !== 'annulée' ? `<button class="nf-btn nf-btn-sm nf-btn-ghost" data-collect="${id}">Encaisser ${eur(due)}</button>` : ''}${o.status !== 'annulée' && o.status !== 'remise' ? `<button class="nf-btn nf-btn-sm nf-btn-ghost" data-remind="${id}">Rappel</button><button class="nf-btn nf-btn-sm nf-btn-ghost" data-st="${id}" data-to="annulée">Annuler</button>` : ''}${o.refund > 0 ? `<button class="nf-btn nf-btn-sm" data-refunded="${id}">Remboursé</button>` : ''}${o.status === 'annulée' || o.status === 'remise' ? `<button class="nf-btn nf-btn-sm nf-btn-ghost" data-del="${id}" aria-label="Supprimer">✕</button>` : ''}</div></div>`;
  }
  function panelCommandes() {
    const t = NF.today(), ql = q.trim().toLowerCase();
    const F = { avenir: o => o.date >= t && !['remise', 'annulée'].includes(o.status), jour: o => o.date === t && o.status !== 'annulée', passees: o => o.date < t || o.status === 'remise', annulees: o => o.status === 'annulée', tout: () => true }[flt];
    const list = D().orders.filter(F).filter(o => !ql || (o.ref + ' ' + o.customer.name + ' ' + o.customer.email + ' ' + o.customer.phone).toLowerCase().includes(ql)).sort((a, b) => flt === 'passees' ? (b.date + b.slot).localeCompare(a.date + a.slot) : (a.date + a.slot).localeCompare(b.date + b.slot));
    return `<div class="tools"><div class="pills" role="group" aria-label="Filtrer">${[['avenir', 'À venir'], ['jour', 'Aujourd’hui'], ['passees', 'Passées'], ['annulees', 'Annulées'], ['tout', 'Toutes']].map(x => `<label><input type="radio" name="flt" value="${x[0]}"${flt === x[0] ? ' checked' : ''}><span>${x[1]}</span></label>`).join('')}</div><label class="f" style="flex:1 1 220px">Chercher<input class="in" id="q" type="search" placeholder="nom, e-mail, référence" value="${esc(q)}"></label><button type="button" class="nf-btn nf-btn-sm" data-newfor="">+ Commande prise à la boutique</button></div>${list.map(orderRow).join('') || '<p class="card mut">Aucune commande ici.</p>'}`;
  }

  /* ---------- Production ---------- */
  function panelProduction() {
    const t = NF.today(), dates = Array.from(new Set(D().orders.filter(o => o.date >= t && o.status !== 'annulée').map(o => o.date))).sort();
    prodDate = prodDate || dates[0] || t;
    const p = NF.production(prodDate), allergies = p.orders.filter(o => o.exclude);
    return `<div class="tools noprint"><label class="f">Jour de production<input class="in" type="date" id="pd" value="${prodDate}"></label><div class="pills">${dates.slice(0, 6).map(d => `<button type="button" class="nf-chip" data-pd="${d}" aria-pressed="${d === prodDate}">${esc(NF.frDate(d).replace(/^(\w{3})\w*/, '$1'))}</button>`).join('')}</div><button type="button" class="nf-btn nf-btn-sm" onclick="window.print()">Imprimer</button></div>
      <div class="printable"><h2 class="h2" style="text-transform:capitalize">Production · ${esc(NF.frDate(prodDate))}</h2>${p.orders.length ? `<div class="tw"><table class="t"><thead><tr><th>Plateau</th><th>Taille</th><th class="r">Quantité</th><th>Accompagnements</th></tr></thead><tbody>${p.rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.size)}</td><td class="r"><b>${r.qty}</b></td><td>${esc(Object.keys(r.opts).map(k => k + ' ×' + r.opts[k]).join(', ')) || '<span class="mut">—</span>'}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">Charge de la journée</td><td class="r">${Math.round(NF.loadOf(prodDate) * 10) / 10} / ${NF.capOf(prodDate)}</td><td></td></tr></tfoot></table></div>
        ${allergies.length ? `<div class="sheet" style="margin-top:16px;border-color:#a4281b"><h3 style="color:#a4281b">Attention : allergies et fruits à éviter</h3><ul>${allergies.map(o => `<li><b>${esc(o.customer.name)}</b> (${esc(o.ref)}) : ${esc(o.exclude)}</li>`).join('')}</ul></div>` : ''}
        <h3 style="margin:24px 0 10px;font-size:1.3rem">Bons de préparation</h3>${p.orders.sort((a, b) => a.slot.localeCompare(b.slot)).map(o => `<div class="sheet"><h3>${esc(slotTxt(o))} · ${esc(o.customer.name)} <span class="mut" style="font:700 13px Nunito">${esc(o.ref)}</span></h3><p class="mut" style="margin:0">${o.mode === 'livraison' ? '<b>Livraison</b> : ' + esc(o.address) + ' (' + esc((NF.zoneOf(o.zone) || { name: '' }).name) + ')' : '<b>Retrait</b> en boutique'}${o.customer.phone ? ' · ' + esc(o.customer.phone) : ''}</p><ul>${o.items.map(i => `<li><b>${esc(i.name)}</b>${i.type === 'unit' ? ' × ' + i.qty : i.qty > 1 ? ' × ' + i.qty : ''} <span class="mut">${esc(i.sizeLabel)}</span>${i.optsLabel ? '<br>+ ' + esc(i.optsLabel) : ''}</li>`).join('')}</ul>${o.exclude ? `<div class="warn">À éviter : ${esc(o.exclude)}</div>` : ''}${o.card ? `<p style="margin:6px 0 0">Carte : « ${esc(o.card)} »</p>` : ''}<p style="margin:6px 0 0"><b>${NF.dueOf(o) ? 'Reste à encaisser : ' + eur(NF.dueOf(o)) : 'Soldé'}</b></p></div>`).join('')}` : '<p class="card mut">Aucune commande ce jour-là.</p>'}</div>`;
  }

  /* ---------- Plateaux et options ---------- */
  function panelPlateaux() {
    const ps = D().products;
    return `<p class="mut" style="margin-top:0">Les changements apparaissent tout de suite sur le site. Les photos de démonstration seront remplacées par les vôtres au moment de la mise en ligne.</p>
      ${ps.map(p => `<div class="prod"><div class="pa" aria-hidden="true">${Art.svg(p.art)}</div><div class="bd"><div class="ed p2" style="grid-template-columns:minmax(150px,2fr) minmax(120px,1fr) minmax(120px,1fr) auto auto"><label class="f">Nom<input class="in" data-list="products" data-id="${p.id}" data-f="name" value="${esc(p.name)}"></label><label class="f">Étiquette<input class="in" data-list="products" data-id="${p.id}" data-f="tag" value="${esc(p.tag || '')}"></label><label class="f">Dessin<select class="in" data-list="products" data-id="${p.id}" data-f="art">${Art.kinds.map(k => `<option value="${k}"${p.art === k ? ' selected' : ''}>${k}</option>`).join('')}</select></label><label class="chk"><input type="checkbox" data-list="products" data-id="${p.id}" data-f="active" data-t="bool"${p.active !== false ? ' checked' : ''}>En vente</label><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-delprod="${p.id}" aria-label="Supprimer ${esc(p.name)}">✕</button></div>
        <label class="f">Description<textarea class="in" rows="2" data-list="products" data-id="${p.id}" data-f="desc">${esc(p.desc)}</textarea></label>
        ${p.type === 'tray' ? `<div class="fields" style="grid-template-columns:repeat(3,minmax(0,1fr))">${p.sizes.map((s, i) => `<label class="f">${esc(s.label)} · prix €<input class="in" type="number" min="0" step="0.5" value="${s.price}" data-size="${p.id}" data-i="${i}" data-k="price"></label>`).join('')}</div>` : p.type === 'unit' ? `<div class="fields"><label class="f">Prix par barquette €<input class="in" type="number" min="0" step="0.5" data-list="products" data-id="${p.id}" data-f="unitPrice" data-t="num" value="${p.unitPrice}"></label><label class="f">Minimum de barquettes<input class="in" type="number" min="1" data-list="products" data-id="${p.id}" data-f="minUnits" data-t="num" value="${p.minUnits}"></label></div>` : '<p class="mut" style="margin:0">Sur devis : les demandes arrivent par e-mail.</p>'}</div></div>`).join('')}
      <button class="nf-btn" type="button" data-addprod>+ Ajouter un plateau</button>
      <h2 class="h2" style="margin-top:36px">Accompagnements</h2>${D().options.map(o => `<div class="ed p2"><label class="f">Nom<input class="in" data-list="options" data-id="${o.id}" data-f="name" value="${esc(o.name)}"></label><label class="f">Prix €<input class="in" type="number" min="0" step="0.5" data-list="options" data-id="${o.id}" data-f="price" data-t="num" value="${o.price}"></label><label class="f">Calcul<select class="in" data-list="options" data-id="${o.id}" data-f="per"><option value="tray"${o.per === 'tray' ? ' selected' : ''}>par plateau</option><option value="order"${o.per === 'order' ? ' selected' : ''}>par commande</option></select></label><label class="chk"><input type="checkbox" data-list="options" data-id="${o.id}" data-f="active" data-t="bool"${o.active !== false ? ' checked' : ''}>Proposé</label><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-delopt="${o.id}" aria-label="Supprimer ${esc(o.name)}">✕</button></div>`).join('')}<button class="nf-btn nf-btn-sm" type="button" data-addopt>+ Ajouter un accompagnement</button>`;
  }

  /* ---------- Paiements ---------- */
  function panelPaiements() {
    const rows = []; D().orders.forEach(o => o.payments.forEach(p => rows.push({ at: p.at, ref: o.ref, who: o.customer.name, label: p.label || 'Paiement', how: p.how, amount: p.amount })));
    rows.sort((a, b) => b.at - a.at);
    const tot = rows.reduce((a, r) => a + r.amount, 0), card = rows.filter(r => /carte/.test(r.how)).reduce((a, r) => a + r.amount, 0), rem = rows.filter(r => r.how === 'à la remise').reduce((a, r) => a + r.amount, 0);
    const due = D().orders.filter(o => !['annulée'].includes(o.status)).reduce((a, o) => a + NF.dueOf(o), 0);
    return `<div class="kpis"><div class="kpi"><b>${eur(tot)}</b><span>Encaissé au total</span></div><div class="kpi"><b>${eur(card)}</b><span>dont carte en ligne</span></div><div class="kpi"><b>${eur(rem)}</b><span>dont à la remise</span></div><div class="kpi"><b>${eur(due)}</b><span>Soldes restant à encaisser</span></div></div>
      <div class="tw"><table class="t"><thead><tr><th>Date</th><th>Commande</th><th>Client</th><th>Type</th><th>Moyen</th><th class="r">Montant</th></tr></thead><tbody>${rows.slice(0, 60).map(r => `<tr><td>${new Date(r.at).toLocaleDateString('fr-FR')}</td><td>${esc(r.ref)}</td><td>${esc(r.who)}</td><td>${esc(r.label)}</td><td>${esc(r.how)}</td><td class="r"><b style="color:${r.amount < 0 ? '#a4281b' : 'inherit'}">${eur(r.amount)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="mut">Aucun paiement.</td></tr>'}</tbody></table></div><p class="mut" style="font-size:13px">Démonstration : les paiements par carte sont simulés. Sur un vrai site, ce tableau se remplit à partir du prestataire de paiement.</p>`;
  }

  /* ---------- Clients ---------- */
  function panelClients() {
    const m = {};
    D().orders.forEach(o => { const k = NF.norm(o.customer.email) || o.customer.name; const c = m[k] = m[k] || { name: o.customer.name, email: o.customer.email, phone: o.customer.phone, n: 0, spent: 0, last: '', next: '' }; if (o.status !== 'annulée') { c.n++; c.spent += NF.paidOf(o); if (o.date < NF.today() && o.date > c.last) c.last = o.date; if (o.date >= NF.today() && (!c.next || o.date < c.next)) c.next = o.date; } });
    const list = Object.values(m).sort((a, b) => b.spent - a.spent);
    return `<p class="mut" style="margin-top:0">Les clients se créent tout seuls à leur première commande.</p>${list.map(c => { const ac = D().accounts.find(a => NF.norm(a.email) === NF.norm(c.email)); return `<div class="row"><div class="main"><b class="t">${esc(c.name)}</b> <span class="mut">${esc(c.email)}${c.phone ? ' · ' + esc(c.phone) : ''}</span><br>${c.n} commande${c.n > 1 ? 's' : ''} · ${eur(c.spent)} réglés${c.last ? ' · dernière le ' + esc(NF.frDate(c.last)) : ''}${c.next ? ' · prochaine le ' + esc(NF.frDate(c.next)) : ''}${ac && ac.allergies ? `<br><b style="color:#a4281b">Allergies : ${esc(ac.allergies)}</b>` : ''}</div><div>${ac ? '<span class="chip ok">Compte client</span>' : ''}</div></div>`; }).join('') || '<p class="card mut">Aucun client.</p>'}`;
  }

  /* ---------- Réglages ---------- */
  function panelReglages() {
    const s = S(), num = (path, label, v, min, hint) => `<label class="f">${label}<input class="in" type="number" min="${min}" step="1" value="${v}" data-bind="${path}" data-t="num">${hint ? `<span class="mut" style="text-transform:none;letter-spacing:0;font:500 13px Nunito">${hint}</span>` : ''}</label>`;
    return `<div class="cols"><div><div class="card" style="margin-bottom:18px"><h3 class="h2">Commandes et acompte</h3><div class="fields">${num('settings.depositPct', 'Acompte (%)', s.depositPct, 0, '30 = 30 % du total à la commande')}${num('settings.minNoticeH', 'Délai minimum (heures)', s.minNoticeH, 0, '48 = commande 2 jours avant')}${num('settings.cancelH', 'Annulation gratuite jusqu’à (heures avant)', s.cancelH, 0, 'L’acompte est alors remboursé')}${num('settings.horizonDays', 'Calendrier ouvert sur (jours)', s.horizonDays, 1)}${num('settings.capacity', 'Capacité par jour (unités)', s.capacity, 0, 'Petit plateau = 1, moyen = 2, grand = 3, barquette = 0,25')}</div></div>
      <div class="card"><h3 class="h2">Jours de fermeture</h3><div class="pills" role="group" aria-label="Jours fermés">${[1, 2, 3, 4, 5, 6, 0].map(d => `<label><input type="checkbox" data-wd="${d}"${s.closedWeekdays.includes(d) ? ' checked' : ''}><span>${NF.DAYS[d]}</span></label>`).join('')}</div><p class="mut" style="margin:12px 0 0;font-size:14px">Cochés = fermés. Pour une date précise (vacances, jour férié), fermez-la depuis le calendrier.${s.closedDates.length ? '<br>Dates fermées : ' + s.closedDates.map(d => `<span class="chip">${esc(d)} <button type="button" data-opendate="${d}" aria-label="Rouvrir ${d}" style="border:0;background:none;cursor:pointer">×</button></span>`).join('') : ''}</p></div></div>
      <div><div class="card" style="margin-bottom:18px"><h3 class="h2">Retrait en boutique</h3><div class="fields">${num('settings.pickup.from', 'Ouverture (heure)', s.pickup.from, 0)}${num('settings.pickup.to', 'Fermeture (heure)', s.pickup.to, 1)}${num('settings.pickup.perSlot', 'Retraits par créneau', s.pickup.perSlot, 1)}</div></div>
      <div class="card"><h3 class="h2">Livraison</h3><div class="fields">${num('settings.delivery.minOrder', 'Commande minimale (€)', s.delivery.minOrder, 0)}${num('settings.delivery.freeFrom', 'Livraison offerte dès (€)', s.delivery.freeFrom, 0)}${num('settings.delivery.perSlot', 'Livraisons par créneau', s.delivery.perSlot, 1)}<label class="f">Créneaux (séparés par une virgule)<input class="in" data-slots value="${esc(s.delivery.slots.join(', '))}"></label></div>
        <h4 class="kick" style="margin:18px 0 8px">Zones et frais</h4>${s.delivery.zones.map((z, i) => `<div class="ed p2" style="grid-template-columns:minmax(120px,2fr) minmax(80px,1fr) auto"><label class="f">Zone<input class="in" data-zone="${i}" data-k="name" value="${esc(z.name)}"></label><label class="f">Frais €<input class="in" type="number" min="0" step="0.5" data-zone="${i}" data-k="fee" value="${z.fee}"></label><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-delzone="${i}" aria-label="Supprimer la zone">✕</button></div>`).join('')}<button type="button" class="nf-btn nf-btn-sm" data-addzone>+ Ajouter une zone</button></div></div></div>
      <p style="margin-top:26px"><button class="nf-btn nf-btn-sm nf-btn-ghost" data-act="export" type="button">Exporter les données (fichier)</button> <button class="nf-btn nf-btn-sm nf-btn-ghost" data-act="reset" type="button">Remettre la démonstration à zéro</button></p>`;
  }

  /* ---------- E-mails ---------- */
  function panelEmails() {
    const n = new Set(D().orders.map(o => o.customer.email).filter(Boolean)).size;
    return `${S().email ? '' : '<p class="flash" style="background:#fff0c9;color:#7a5400">Les notifications e-mail sont désactivées (interrupteur en haut) : rien n’est envoyé.</p>'}<div class="cols"><div class="card"><h3 class="h2">Écrire à tous les clients</h3><form id="bulk"><div class="fields"><label class="f full">Objet<input class="in" name="subject" required placeholder="Nouveau plateau de saison"></label><label class="f full">Message<textarea class="in" name="body" rows="5" required></textarea></label></div><button class="nf-btn" type="submit" style="margin-top:14px"${S().email && n ? '' : ' disabled'}>Envoyer à ${n} client${n > 1 ? 's' : ''}</button></form><p class="mut" style="margin-bottom:0;font-size:14px">${CFG.formEndpoint ? 'Les e-mails partent réellement via le relais configuré.' : 'Démonstration : les e-mails sont simulés et listés à droite.'}</p></div>
      <div><h3 class="h2">E-mails envoyés</h3>${D().outbox.map(m => `<div class="mail"><b>${esc(m.subject)}</b><br><span class="mut">à ${esc(m.to)} · ${new Date(m.at).toLocaleString('fr-FR')}${m.real ? '' : ' · simulé'}</span><pre>${esc(m.body)}</pre></div>`).join('') || '<p class="card mut">Aucun e-mail pour le moment.</p>'}</div></div>`;
  }

  const PANELS = { agenda: panelAgenda, commandes: panelCommandes, production: panelProduction, plateaux: panelPlateaux, paiements: panelPaiements, clients: panelClients, reglages: panelReglages, emails: panelEmails };
  function render() {
    if (!ok()) return;
    renderBar();
    $('#panel').innerHTML = (flash ? `<p class="flash" role="status">${esc(flash)}</p>` : '') + PANELS[tab]();
    flash = '';
  }
  NF.onChange(render);

  /* ---------- Commande prise à la boutique ---------- */
  function newOrderDialog(date) {
    const d = $('#dlg'), ps = D().products.filter(p => p.type !== 'quote' && p.active !== false), first = date || NF.addDays(NF.today(), 3);
    d.innerHTML = `<form id="newo" style="padding:26px;display:grid;gap:14px" novalidate><h3 class="h2" style="margin:0">Nouvelle commande</h3><div class="fields"><label class="f full">Plateau<select class="in" name="pid">${ps.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label><label class="f">Taille<select class="in" name="size" id="nsize"></select></label><label class="f">Quantité<input class="in" name="qty" type="number" min="1" value="1"></label><label class="f">Jour<input class="in" name="date" type="date" value="${first}"></label><label class="f">Remise<select class="in" name="mode"><option value="retrait">Retrait</option><option value="livraison">Livraison</option></select></label><label class="f">Créneau<select class="in" name="slot" id="nslot"></select></label><label class="f">Paiement<select class="in" name="payMode"><option value="deposit">Acompte déjà encaissé</option><option value="full">Tout payé</option><option value="cash">À la remise</option></select></label><label class="f">Nom du client<input class="in" name="name"></label><label class="f">Téléphone<input class="in" name="phone"></label><label class="f full">E-mail <span style="text-transform:none;letter-spacing:0;font-weight:500">(facultatif, pour la confirmation)</span><input class="in" name="email" type="email"></label><label class="f full" id="naddr" hidden>Adresse de livraison<input class="in" name="address"></label></div><p class="nf-err" id="nerr" hidden></p><div style="display:flex;gap:10px"><button class="nf-btn" type="submit">Créer la commande</button><button class="nf-btn nf-btn-ghost" type="button" data-x>Annuler</button></div></form>`;
    const f = $('#newo', d), sizes = () => { const p = D().products.find(x => x.id === f.pid.value); $('#nsize', d).innerHTML = p.type === 'tray' ? p.sizes.map(s => `<option value="${s.id}">${esc(s.label)} · ${eur(s.price)}</option>`).join('') : '<option value="">—</option>'; };
    const slots = () => { $('#nslot', d).innerHTML = NF.slotList(f.mode.value).map(s => `<option value="${esc(s.id)}">${esc(s.label)}</option>`).join(''); $('#naddr', d).hidden = f.mode.value !== 'livraison'; };
    f.pid.onchange = sizes; f.mode.onchange = slots; sizes(); slots(); d.showModal();
    f.onsubmit = e => {
      e.preventDefault();
      const p = D().products.find(x => x.id === f.pid.value), line = NF.lineOf({ pid: p.id, size: f.size.value, qty: +f.qty.value || 1, opts: [] }), err = $('#nerr', d); err.hidden = true;
      const r = NF.placeOrder({ lines: [line], mode: f.mode.value, zone: f.mode.value === 'livraison' ? D().settings.delivery.zones[0].id : '', address: f.address.value, date: f.date.value, slot: f.slot.value, customer: { name: f.name.value, email: f.email.value, phone: f.phone.value }, payMode: f.payMode.value }, true);
      if (r.error) { err.textContent = r.error; err.hidden = false; return; }
      d.close(); flash = 'Commande ' + r.order.ref + ' créée.'; tab = 'commandes'; flt = 'avenir'; render();
    };
  }
  function collectDialog(id) {
    const o = D().orders.find(x => x.id === id), d = $('#dlg');
    d.innerHTML = `<form id="col" style="padding:26px;display:grid;gap:14px"><h3 class="h2" style="margin:0">Encaisser le solde</h3><p class="mut" style="margin:0">${esc(o.ref)} · ${esc(o.customer.name)} · reste <b>${eur(NF.dueOf(o))}</b></p><label class="f">Moyen de paiement<select class="in" name="how"><option>espèces</option><option>carte (terminal)</option><option>virement</option></select></label><div style="display:flex;gap:10px"><button class="nf-btn" type="submit">Enregistrer</button><button class="nf-btn nf-btn-ghost" type="button" data-x>Annuler</button></div></form>`;
    $('#col', d).onsubmit = e => { e.preventDefault(); NF.addPayment(id, NF.dueOf(o), e.target.how.value, 'Solde'); d.close(); flash = 'Paiement enregistré.'; render(); };
    d.showModal();
  }
  $('#dlg').addEventListener('click', e => { if (e.target === $('#dlg') || e.target.closest('[data-x]')) $('#dlg').close(); });

  /* ---------- Événements ---------- */
  const setPath = (path, v) => { const k = path.split('.'); let o = D(); k.slice(0, -1).forEach(x => { o = o[x]; }); o[k[k.length - 1]] = v; };
  const val = el => el.dataset.t === 'bool' ? el.checked : el.dataset.t === 'num' ? Math.max(0, Number(el.value) || 0) : el.value;
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; flash = ''; return render(); }
    const t = e.target.closest('button'); if (!t) return;
    const id = t.dataset.st || t.dataset.collect || t.dataset.remind || t.dataset.refunded || t.dataset.del;
    if (t.dataset.mv) { month = new Date(month.getFullYear(), month.getMonth() + +t.dataset.mv, 1); return render(); }
    if (t.dataset.day) { sel = t.dataset.day; return render(); }
    if (t.dataset.prod || t.dataset.pd) { prodDate = t.dataset.prod || t.dataset.pd; tab = 'production'; return render(); }
    if (t.dataset.newfor !== undefined) return newOrderDialog(t.dataset.newfor);
    if (t.dataset.capreset) { delete S().capOverride[t.dataset.capreset]; return NF.save(); }
    if (t.dataset.closeday) { const d = t.dataset.closeday, i = S().closedDates.indexOf(d); i >= 0 ? S().closedDates.splice(i, 1) : S().closedDates.push(d); return NF.save(); }
    if (t.dataset.opendate) { S().closedDates = S().closedDates.filter(x => x !== t.dataset.opendate); return NF.save(); }
    if (t.dataset.st) { const to = t.dataset.to; if (to === 'annulée' && !confirm('Annuler cette commande ? Le client est prévenu par e-mail et l’acompte est à rembourser.')) return; NF.setStatus(id, to); return; }
    if (t.dataset.collect) return collectDialog(id);
    if (t.dataset.remind) { const o = D().orders.find(x => x.id === id); flash = NF.mailRemind(o) ? 'Rappel envoyé à ' + o.customer.email + '.' : 'Notifications e-mail désactivées ou pas d’adresse : rien n’a été envoyé.'; return NF.save(); }
    if (t.dataset.refunded) { const o = D().orders.find(x => x.id === id); o.payments.push({ at: Date.now(), amount: -o.refund, how: 'remboursement', label: 'Remboursement' }); o.refund = 0; flash = 'Remboursement enregistré.'; return NF.save(); }
    if (t.dataset.del) { if (confirm('Supprimer définitivement cette commande ?')) NF.removeOrder(id); return; }
    if (t.hasAttribute('data-addprod')) { D().products.push({ id: 'p' + NF.uid(), name: 'Nouveau plateau', desc: 'Décrivez ce plateau.', type: 'tray', sizes: [{ id: 'S', label: '4 à 6 personnes', price: 40, load: 1 }, { id: 'M', label: '8 à 10 personnes', price: 70, load: 2 }, { id: 'L', label: '12 à 15 personnes', price: 100, load: 3 }], art: 'saison', tag: 'Nouveau', active: true }); return NF.save(); }
    if (t.dataset.delprod) { if (confirm('Supprimer ce plateau ? Les anciennes commandes gardent son nom.')) { D().products = D().products.filter(x => x.id !== t.dataset.delprod); NF.save(); } return; }
    if (t.hasAttribute('data-addopt')) { D().options.push({ id: 'o' + NF.uid(), name: 'Nouvel accompagnement', price: 5, per: 'order', active: true }); return NF.save(); }
    if (t.dataset.delopt) { D().options = D().options.filter(x => x.id !== t.dataset.delopt); return NF.save(); }
    if (t.hasAttribute('data-addzone')) { S().delivery.zones.push({ id: 'z' + NF.uid(), name: 'Nouvelle zone', fee: 10 }); return NF.save(); }
    if (t.dataset.delzone != null && t.hasAttribute('data-delzone')) { S().delivery.zones.splice(+t.dataset.delzone, 1); return NF.save(); }
    if (t.dataset.act === 'export') { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' })); l.download = 'naw-fruity-donnees.json'; l.click(); return; }
    if (t.dataset.act === 'reset') { if (confirm('Remettre toutes les données de démonstration à zéro ?')) NF.reset(); }
  });
  document.addEventListener('change', e => {
    const n = e.target;
    if (n.name === 'flt') { flt = n.value; return render(); }
    if (n.id === 'pd') { prodDate = n.value; return render(); }
    if (n.dataset.bind) { setPath(n.dataset.bind, val(n)); NF.save(); }
    else if (n.dataset.list) { const it = D()[n.dataset.list].find(x => x.id === n.dataset.id); if (it) { it[n.dataset.f] = val(n); NF.save(); } }
    else if (n.dataset.size) { const p = D().products.find(x => x.id === n.dataset.size); p.sizes[+n.dataset.i][n.dataset.k] = Math.max(0, Number(n.value) || 0); NF.save(); }
    else if (n.dataset.cap) { S().capOverride[n.dataset.cap] = Math.max(0, Number(n.value) || 0); NF.save(); }
    else if (n.dataset.wd != null && n.hasAttribute('data-wd')) { const d = +n.dataset.wd, a = S().closedWeekdays; if (n.checked && !a.includes(d)) a.push(d); if (!n.checked) S().closedWeekdays = a.filter(x => x !== d); NF.save(); }
    else if (n.hasAttribute('data-slots')) { S().delivery.slots = n.value.split(',').map(x => x.trim()).filter(Boolean); NF.save(); }
    else if (n.dataset.zone != null && n.hasAttribute('data-zone')) { const z = S().delivery.zones[+n.dataset.zone]; z[n.dataset.k] = n.dataset.k === 'fee' ? Math.max(0, Number(n.value) || 0) : n.value; NF.save(); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'q') { q = e.target.value; const pos = q.length; render(); const el = $('#q'); el.focus(); el.setSelectionRange(pos, pos); } });
  document.addEventListener('submit', e => {
    if (e.target.id === 'bulk') {
      e.preventDefault(); const f = new FormData(e.target), to = new Set(D().orders.map(o => o.customer.email).filter(Boolean));
      if (!confirm('Envoyer ce message à ' + to.size + ' client(s) ?')) return;
      to.forEach(m => NF.sendMail(m, f.get('subject'), f.get('body') + '\n\n' + (CFG.name || ''))); flash = 'Message envoyé à ' + to.size + ' client(s).'; NF.save();
    }
  });
  gate();
})();
