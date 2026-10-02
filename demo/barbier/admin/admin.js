/* Administration du barbier : rendez-vous, réglages (interrupteurs), prestations, produits, abonnés, clients et e-mails. */
(function () {
  'use strict';
  const B = window.Barber, CFG = B.CFG, esc = B.esc, money = B.money;
  const $ = (s, r) => (r || document).querySelector(s);
  const D = () => B.data, S = () => B.data.settings;
  const TABS = [['rdv', 'Rendez-vous'], ['reglages', 'Réglages'], ['prestations', 'Prestations'], ['produits', 'Produits'], ['abonnes', 'Abonnés'], ['clients', 'Clients'], ['emails', 'E-mails']];
  let tab = 'rdv', flt = 'today', q = '', flash = '';

  document.querySelectorAll('[data-shop]').forEach(n => { n.textContent = CFG[n.dataset.shop] || ''; });
  $('#hint').textContent = CFG.adminCode;

  /* Accès (démonstration) */
  const ok = () => { try { return sessionStorage.getItem('ka-admin') === '1'; } catch (e) { return false; } };
  function gate() {
    const on = ok();
    $('#gate').hidden = on; $('#app').hidden = !on;
    if (on) render();
  }
  $('#gateForm').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#code').value === CFG.adminCode) { try { sessionStorage.setItem('ka-admin', '1'); } catch (x) { /* ignoré */ } gate(); }
    else $('#gateErr').hidden = false;
  });
  $('#logout').addEventListener('click', () => { try { sessionStorage.removeItem('ka-admin'); } catch (e) { /* ignoré */ } $('#code').value = ''; gate(); });

  const mailTo = a => a.email ? ' · ' + esc(a.email) : '';
  const sorted = list => list.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));

  /* Interrupteurs et onglets */
  function sw(path, label, hint, on) {
    return `<label class="sw"><input type="checkbox" data-bind="${path}" data-t="bool"${on ? ' checked' : ''}><span class="knob"></span><span>${label}<small>${hint}</small></span></label>`;
  }
  function renderBar() {
    const s = S();
    $('#switches').innerHTML =
      sw('settings.booking', 'Rendez-vous en ligne', s.booking ? 'Ouverts : les clients peuvent réserver' : 'Fermés : le site affiche ton numéro', s.booking) +
      sw('settings.card', 'Paiement par carte', s.card ? 'Activé : paiement à l’avance possible' : 'Désactivé : espèces au salon uniquement', s.card) +
      sw('settings.email', 'Notifications e-mail', s.email ? 'Activées : confirmation, annulation, rappel' : 'Désactivées : aucun e-mail envoyé', s.email);
    $('#tabs').innerHTML = TABS.map(t => `<button role="tab" type="button" data-tab="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('');
  }

  /* Rendez-vous */
  function apptRow(a) {
    const past = a.status !== 'confirmé', pay = a.pay === 'none' ? '<span class="st free">Offert</span>' : a.paid ? '<span class="st ok">Payé par carte</span>' : a.status === 'annulé' ? '' : '<span class="st wait">À encaisser ' + money(a.total) + '</span>';
    const cov = a.cover === 'sub' ? '<span class="st free">Abonnement</span>' : a.cover === 'free' ? '<span class="st free">Fidélité</span>' : '';
    const stat = a.status === 'terminé' ? '<span class="st ok">Terminé</span>' : a.status === 'annulé' ? '<span class="st no">Annulé</span>' : '';
    const refund = a.refund ? '<span class="st no">À rembourser ' + money(a.total) + '</span>' : '';
    const id = esc(a.id);
    return `<div class="row${a.status === 'annulé' ? ' off' : ''}"><div class="main"><b>${esc(a.start)} · ${esc(a.name)}</b> <span class="muted">${esc(B.frDate(a.date))}</span><br>
      ${esc(a.serviceName)}${a.items.length ? ' + ' + a.items.map(i => esc(i.name) + ' ×' + i.qty).join(', ') : ''} <span class="muted">${a.phone ? '· ' + esc(a.phone) : ''}${mailTo(a)} · réf. ${esc(a.ref)}${a.source === 'salon' ? ' · saisi au salon' : ''}</span><br>${stat}${pay}${cov}${refund}</div>
      <div class="acts">
      ${a.status === 'confirmé' && !a.paid && a.total ? `<button class="btn sm" data-act="paid" data-id="${id}">Encaissé</button>` : ''}
      ${a.status === 'confirmé' ? `<button class="btn sm red" data-act="done" data-id="${id}">Terminé</button>` : ''}
      ${a.status === 'confirmé' && a.email ? `<button class="btn sm ghost" data-act="remind" data-id="${id}">Rappel e-mail</button>` : ''}
      ${a.status === 'confirmé' ? `<button class="btn sm ghost" data-act="cancel" data-id="${id}">Annuler</button>` : ''}
      ${a.refund ? `<button class="btn sm" data-act="refunded" data-id="${id}">Remboursé</button>` : ''}
      ${past ? `<button class="btn sm ghost" data-act="del" data-id="${id}" aria-label="Supprimer">✕</button>` : ''}</div></div>`;
  }
  function panelRdv() {
    const t = B.today(), all = D().appointments, live = all.filter(a => a.status !== 'annulé');
    const stats = [
      [live.filter(a => a.date === t && a.status === 'confirmé').length, 'Aujourd’hui'],
      [live.filter(a => a.date > t && a.status === 'confirmé').length, 'À venir'],
      [money(live.filter(a => a.pay === 'card' && a.paid).reduce((s, a) => s + a.total, 0)), 'Encaissé par carte'],
      [money(live.filter(a => a.status === 'confirmé' && !a.paid && a.total).reduce((s, a) => s + a.total, 0)), 'À encaisser au salon']
    ];
    const f = { today: a => a.date === t, upcoming: a => a.date >= t && a.status === 'confirmé', past: a => a.date < t || a.status !== 'confirmé', all: () => true }[flt];
    const ql = q.trim().toLowerCase();
    let list = sorted(all.filter(f).filter(a => !ql || (a.name + ' ' + a.email + ' ' + a.ref + ' ' + a.phone).toLowerCase().includes(ql)));
    if (flt === 'past') list.reverse();
    const refunds = all.filter(a => a.refund).length;
    return `<div class="stats">${stats.map(s => `<div class="stat"><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>
      ${refunds ? `<p class="notice bad" style="margin-bottom:16px">${refunds} remboursement${refunds > 1 ? 's' : ''} par carte à effectuer depuis ton compte de paiement (puis appuie sur « Remboursé »).</p>` : ''}
      <div class="tools"><div class="chips" role="group" aria-label="Filtrer">${[['today', 'Aujourd’hui'], ['upcoming', 'À venir'], ['past', 'Passés / annulés'], ['all', 'Tous']].map(x => `<label class="chip"><input type="radio" name="flt" value="${x[0]}"${flt === x[0] ? ' checked' : ''}><span>${x[1]}</span></label>`).join('')}</div>
        <label class="f" style="flex:1 1 200px">Chercher<input class="in" id="q" type="search" placeholder="nom, e-mail, référence" value="${esc(q)}"></label></div>
      ${list.map(apptRow).join('') || '<p class="notice">Aucun rendez-vous ici.</p>'}
      <h2 class="t" style="margin-top:34px">Ajouter un rendez-vous (téléphone, passage au salon)</h2>
      <form class="card" id="addAppt"><div class="fields">
        <label class="f">Prénom<input class="in" name="name" required></label>
        <label class="f">Téléphone<input class="in" name="phone" type="tel"></label>
        <label class="f">Prestation<select class="in" name="svc">${D().services.map(s => `<option value="${s.id}">${esc(s.name)} · ${money(s.price)}</option>`).join('')}</select></label>
        <label class="f">E-mail (pour le rappel, facultatif)<input class="in" name="email" type="email"></label>
        <label class="f">Jour<input class="in" name="date" type="date" value="${t}" required></label>
        <label class="f">Heure<input class="in" name="time" type="time" step="900" value="10:00" required></label>
        <label class="f full">Paiement<select class="in" name="pay"><option value="cash">Espèces (à encaisser)</option><option value="card">Déjà payé par carte</option></select></label></div>
        <button class="btn red" type="submit" style="margin-top:16px">Ajouter</button></form>`;
  }

  /* Réglages */
  function panelReglages() {
    const s = S(), sub = s.sub, hr = [1, 2, 3, 4, 5, 6, 0].map(d => {
      const h = s.hours[d], hours = n => Array.from({ length: 24 }, (_, i) => `<option value="${i}"${h && h[n] === i ? ' selected' : ''}>${i}h</option>`).join('');
      return `<div class="hr"><b class="oswald" style="font:700 17px Oswald;text-transform:uppercase">${B.DAYS[d]}</b><select class="in" data-hour="${d}" data-k="0" aria-label="Ouverture ${B.DAYS[d]}"${h ? '' : ' disabled'}>${hours(0)}</select><select class="in" data-hour="${d}" data-k="1" aria-label="Fermeture ${B.DAYS[d]}"${h ? '' : ' disabled'}>${hours(1)}</select><label class="k" style="display:flex;gap:6px;align-items:center;font-weight:700"><input type="checkbox" data-hour="${d}" data-k="x"${h ? '' : ' checked'} style="width:22px;height:22px">Fermé</label></div>`;
    }).join('');
    const num = (path, label, v, min, hint) => `<label class="f">${label}<input class="in" type="number" min="${min}" step="1" value="${v}" data-bind="${path}" data-t="num">${hint ? `<span class="muted" style="text-transform:none;letter-spacing:0;font:500 13px Archivo">${hint}</span>` : ''}</label>`;
    return `<div class="cols"><div class="card"><h2 class="t">Horaires</h2>${hr}
        <div class="fields" style="margin-top:18px">${num('settings.days', 'Réservations ouvertes sur (jours)', s.days, 1)}${num('settings.chairs', 'Nombre de fauteuils', s.chairs, 1, 'Rendez-vous simultanés possibles')}
        <label class="f">Pas des créneaux<select class="in" data-bind="settings.step" data-t="num">${[15, 30, 60].map(n => `<option value="${n}"${s.step === n ? ' selected' : ''}>${n} minutes</option>`).join('')}</select></label></div></div>
      <div><div class="card" style="margin-bottom:22px"><h2 class="t">Fidélité</h2>${num('settings.loyaltyEvery', 'Une coupe offerte toutes les … coupes', s.loyaltyEvery, 0, '12 = la 12ᵉ est offerte. 0 = pas de carte de fidélité. Seules les coupes terminées comptent (pas celles de l’abonnement).')}</div>
      <div class="card"><h2 class="t">Abonnement</h2><div class="fields">
        <label class="k full" style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" data-bind="settings.sub.on" data-t="bool"${sub.on ? ' checked' : ''} style="width:22px;height:22px">Proposer l’abonnement sur le site</label>
        <label class="f full">Nom<input class="in" data-bind="settings.sub.name" value="${esc(sub.name)}"></label>
        ${num('settings.sub.price', 'Prix (€)', sub.price, 0)}${num('settings.sub.weeks', 'Durée (semaines)', sub.weeks, 1)}${num('settings.sub.perWeek', 'Coupes par semaine', sub.perWeek, 1)}</div>
        <p class="muted" style="margin:12px 0 0">Exemple : 45 € pour 1 coupe par semaine pendant 4 semaines. Ne concerne que les prestations marquées « coupe » (onglet Prestations).</p></div></div></div>
      <p style="margin-top:28px"><button class="btn ghost sm" data-act="export" type="button">Exporter les données (fichier)</button> <button class="btn ghost sm" data-act="reset" type="button">Remettre la démonstration à zéro</button></p>`;
  }

  /* Prestations et produits */
  function panelPrestations() {
    return `<p class="lead" style="margin-top:0">Ce que tu changes ici apparaît tout de suite sur le site. « Coupe » = la prestation compte pour l’abonnement et la carte de fidélité.</p>
      ${D().services.map(s => `<div class="ed"><input class="in" data-list="services" data-id="${s.id}" data-f="name" value="${esc(s.name)}" aria-label="Nom">
        <label class="f">Prix €<input class="in" type="number" min="0" step="0.5" data-list="services" data-id="${s.id}" data-f="price" data-t="num" value="${s.price}"></label>
        <label class="f">Minutes<input class="in" type="number" min="5" step="5" data-list="services" data-id="${s.id}" data-f="dur" data-t="num" value="${s.dur}"></label>
        <label class="k"><input type="checkbox" data-list="services" data-id="${s.id}" data-f="cut" data-t="bool"${s.cut ? ' checked' : ''}>Coupe</label>
        <button class="btn sm ghost" data-act="delsvc" data-id="${s.id}" type="button" aria-label="Supprimer ${esc(s.name)}">✕</button></div>`).join('')}
      <button class="btn" data-act="addsvc" type="button">+ Ajouter une prestation</button>`;
  }
  function panelProduits() {
    return `<p class="lead" style="margin-top:0">Cire, peignes, huile… Ajoute tes produits : les clients les ajoutent à leur rendez-vous et les récupèrent au salon. Le stock baisse tout seul ; à 0, le produit s’affiche « Épuisé ».</p>
      ${D().products.map(p => `<div class="ed"><input class="in" data-list="products" data-id="${p.id}" data-f="name" value="${esc(p.name)}" aria-label="Nom">
        <label class="f">Prix €<input class="in" type="number" min="0" step="0.5" data-list="products" data-id="${p.id}" data-f="price" data-t="num" value="${p.price}"></label>
        <label class="f">Stock<input class="in" type="number" min="0" step="1" data-list="products" data-id="${p.id}" data-f="stock" data-t="num" value="${p.stock}"></label>
        <label class="k"><input type="checkbox" data-list="products" data-id="${p.id}" data-f="active" data-t="bool"${p.active ? ' checked' : ''}>En vente</label>
        <button class="btn sm ghost" data-act="delprod" data-id="${p.id}" type="button" aria-label="Supprimer ${esc(p.name)}">✕</button></div>`).join('') || '<p class="notice">Aucun produit.</p>'}
      <button class="btn" data-act="addprod" type="button">+ Ajouter un produit</button>`;
  }

  /* Abonnés */
  function panelAbonnes() {
    const t = B.today(), st = s => !s.paid ? ['wait', 'En attente de paiement'] : s.end < t ? ['no', 'Terminé'] : s.start > t ? ['wait', 'Démarre le ' + B.frDate(s.start)] : ['ok', 'Actif jusqu’au ' + B.frDate(s.end)];
    return `${D().subs.slice().reverse().map(s => { const x = st(s); return `<div class="row"><div class="main"><b>${esc(s.name)}</b> <span class="muted">${esc(s.email)}</span><br>${esc(s.plan)} · ${money(s.price)} · ${s.perWeek} coupe/semaine<br><span class="st ${x[0]}">${x[1]}</span>${s.paid ? '<span class="st ok">Payé (' + (s.pay === 'card' ? 'carte' : 'espèces') + ')</span>' : ''}</div>
      <div class="acts">${s.paid ? '' : `<button class="btn sm" data-act="subpay" data-id="${s.id}">Encaissé : activer</button>`}<button class="btn sm ghost" data-act="delsub" data-id="${s.id}" aria-label="Supprimer">✕</button></div></div>`; }).join('') || '<p class="notice">Aucun abonné pour le moment.</p>'}
      <h2 class="t" style="margin-top:30px">Ajouter un abonné au salon</h2>
      <form class="card" id="addSub"><div class="fields"><label class="f">Prénom<input class="in" name="name" required></label><label class="f">E-mail<input class="in" name="email" type="email" required></label>
        <label class="k full" style="display:flex;gap:10px;align-items:center;font-weight:700"><input type="checkbox" name="paid" checked style="width:22px;height:22px">Déjà encaissé (espèces) : activer maintenant</label></div>
        <button class="btn red" style="margin-top:14px" type="submit">Ajouter</button></form>`;
  }

  /* Clients */
  function customers() {
    const m = {};
    const get = (e, n) => { if (!e) return null; return m[e] = m[e] || { email: e, name: n, done: 0, spent: 0, last: '' }; };
    D().appointments.forEach(a => { const c = get(a.email, a.name); if (!c) return; c.name = a.name; if (a.status === 'terminé') { c.done++; c.spent += a.paid ? a.total : 0; if (a.date > c.last) c.last = a.date; } });
    D().subs.forEach(s => { const c = get(s.email, s.name); if (c && s.paid) c.spent += s.price; });
    return Object.values(m).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name));
  }
  function panelClients() {
    const t = B.today(), cs = customers();
    return `<p class="lead" style="margin-top:0">Les clients se créent tout seuls à la première réservation (reconnus par leur e-mail).</p>` +
      (cs.map(c => { const L = B.loyalty(c.email), sub = B.activeSub(c.email, t);
        return `<div class="row"><div class="main"><b>${esc(c.name)}</b> <span class="muted">${esc(c.email)}</span><br>${c.done} coupe${c.done > 1 ? 's' : ''} terminée${c.done > 1 ? 's' : ''} · dépensé ${money(c.spent)}${c.last ? ' · dernière visite ' + esc(B.frDate(c.last)) : ''}</div>
        <div>${sub ? '<span class="st ok">Abonné</span>' : ''}${S().loyaltyEvery ? (L.freeNext ? '<span class="st free">Prochaine coupe offerte</span>' : `<span class="st">Fidélité ${L.inCycle}/${L.N}</span>`) : ''}</div></div>`; }).join('') || '<p class="notice">Aucun client pour le moment.</p>');
  }

  /* E-mails */
  function panelEmails() {
    const n = new Set(D().appointments.map(a => a.email).concat(D().subs.map(s => s.email)).filter(Boolean)).size;
    return `${S().email ? '' : '<p class="notice warn" style="margin-bottom:16px">Les notifications e-mail sont désactivées (interrupteur en haut) : rien n’est envoyé.</p>'}
      <div class="cols"><div class="card"><h2 class="t">Écrire à tous les clients</h2><form id="bulk"><div class="fields"><label class="f full">Objet<input class="in" name="subject" required placeholder="Ouvert exceptionnellement dimanche"></label>
        <label class="f full">Message<textarea class="in" name="body" rows="5" required></textarea></label></div>
        <button class="btn red" type="submit" style="margin-top:14px"${S().email && n ? '' : ' disabled'}>Envoyer à ${n} client${n > 1 ? 's' : ''}</button></form>
        <p class="muted" style="margin-bottom:0">${CFG.formEndpoint ? 'Les e-mails partent réellement via le relais configuré.' : 'Démonstration : les e-mails sont simulés et listés à droite. Sur un vrai site, ils partent vraiment (voir le README).'}</p></div>
      <div><h2 class="t">E-mails envoyés</h2>${D().outbox.map(m => `<div class="mail"><b>${esc(m.subject)}</b><br><span class="muted">à ${esc(m.to)} · ${new Date(m.at).toLocaleString('fr-FR')}${m.real ? '' : ' · simulé'}</span><pre>${esc(m.body)}</pre></div>`).join('') || '<p class="notice">Aucun e-mail pour le moment.</p>'}</div></div>`;
  }

  const PANELS = { rdv: panelRdv, reglages: panelReglages, prestations: panelPrestations, produits: panelProduits, abonnes: panelAbonnes, clients: panelClients, emails: panelEmails };
  function render() {
    if (!ok()) return;
    renderBar();
    $('#panel').innerHTML = (flash ? `<p class="notice good" role="status" style="margin-bottom:16px">${esc(flash)}</p>` : '') + PANELS[tab]();
    flash = '';
  }
  B.onChange(render);

  const setPath = (path, v) => { const k = path.split('.'); let o = D(); k.slice(0, -1).forEach(x => { o = o[x]; }); o[k[k.length - 1]] = v; };
  const val = el => el.dataset.t === 'bool' ? el.checked : el.dataset.t === 'num' ? Math.max(0, Number(el.value) || 0) : el.value;

  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-tab]');
    if (tb) { tab = tb.dataset.tab; flash = ''; return render(); }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const id = t.dataset.id, a = D().appointments.find(x => x.id === id);
    switch (t.dataset.act) {
      case 'done': B.setStatus(id, 'terminé'); break;
      case 'cancel': if (confirm('Annuler ce rendez-vous ?' + (a && a.email && S().email ? ' Le client sera prévenu par e-mail.' : ''))) B.setStatus(id, 'annulé'); break;
      case 'paid': a.paid = true; B.save(); break;
      case 'refunded': a.refund = false; B.save(); break;
      case 'remind': flash = B.mailRemind(a) ? 'Rappel envoyé à ' + a.email + '.' : 'Notifications e-mail désactivées : rien n’a été envoyé.'; B.save(); break;
      case 'del': if (confirm('Supprimer définitivement ?')) B.remove(id); break;
      case 'addsvc': D().services.push({ id: 's' + B.uid(), name: 'Nouvelle prestation', price: 20, dur: 30, cut: false }); B.save(); break;
      case 'delsvc': if (confirm('Supprimer cette prestation ? Les anciens rendez-vous gardent leur nom.')) { D().services = D().services.filter(x => x.id !== id); B.save(); } break;
      case 'addprod': D().products.push({ id: 'p' + B.uid(), name: 'Nouveau produit', price: 10, stock: 10, active: true }); B.save(); break;
      case 'delprod': if (confirm('Supprimer ce produit ?')) { D().products = D().products.filter(x => x.id !== id); B.save(); } break;
      case 'subpay': B.activate(D().subs.find(x => x.id === id)); B.sendMail(D().subs.find(x => x.id === id).email, 'Abonnement activé', 'Ton abonnement est actif : réserve ta coupe de la semaine en ligne avec cet e-mail.'); B.save(); break;
      case 'delsub': if (confirm('Supprimer cet abonné ?')) { D().subs = D().subs.filter(x => x.id !== id); B.save(); } break;
      case 'export': { const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([JSON.stringify(D(), null, 2)], { type: 'application/json' })); l.download = 'salon-donnees.json'; l.click(); break; }
      case 'reset': if (confirm('Remettre toutes les données de démonstration à zéro ?')) B.reset(); break;
    }
  });
  document.addEventListener('change', e => {
    const n = e.target;
    if (n.name === 'flt') { flt = n.value; return render(); }
    if (n.dataset.bind) { setPath(n.dataset.bind, val(n)); B.save(); }
    else if (n.dataset.list) { const it = D()[n.dataset.list].find(x => x.id === n.dataset.id); if (it) { it[n.dataset.f] = val(n); B.save(); } }
    else if (n.dataset.hour != null && n.dataset.hour !== '') {
      const d = n.dataset.hour, h = S().hours[d];
      if (n.dataset.k === 'x') S().hours[d] = n.checked ? null : [9, 19];
      else if (h) { h[n.dataset.k] = Number(n.value); if (h[1] <= h[0]) h[1 - n.dataset.k] = n.dataset.k === '0' ? Math.min(23, h[0] + 1) : Math.max(0, h[1] - 1); }
      B.save();
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'q') { q = e.target.value; const pos = q.length; render(); const el = $('#q'); el.focus(); el.setSelectionRange(pos, pos); }
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (e.target.id === 'addAppt') {
      const r = B.book({ serviceId: f.get('svc'), date: f.get('date'), time: f.get('time'), name: f.get('name'), email: f.get('email'), phone: f.get('phone'), pay: f.get('pay'), cart: {} }, true);
      flash = r.error || 'Rendez-vous ajouté.'; if (!r.error) flt = 'all';
      render();
    } else if (e.target.id === 'addSub') {
      const r = B.buySub({ name: f.get('name'), email: f.get('email'), pay: 'cash' }, true);
      if (r.error) flash = r.error; else { if (f.get('paid')) B.activate(r.sub); flash = 'Abonné ajouté.'; B.save(); }
      render();
    } else if (e.target.id === 'bulk') {
      const to = new Set(D().appointments.map(a => a.email).concat(D().subs.map(s => s.email)).filter(Boolean));
      if (!confirm('Envoyer ce message à ' + to.size + ' client(s) ?')) return;
      to.forEach(m => B.sendMail(m, f.get('subject'), f.get('body') + '\n\n' + (CFG.name || '')));
      flash = 'Message envoyé à ' + to.size + ' client(s).'; B.save();
    }
  });
  gate();
})();
