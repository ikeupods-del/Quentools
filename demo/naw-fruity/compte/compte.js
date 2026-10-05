/* Espace client Naw Fruity : connexion, commandes (suivi, solde en ligne, annulation, reçu), commander à nouveau, profil. */
(function () {
  'use strict';
  const NF = window.NF, Art = window.NFArt, esc = NF.esc, eur = NF.money, D = () => NF.data;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app'), dlg = $('#dlg');
  const THEME = document.documentElement.getAttribute('data-theme') || 'tropical';
  $('#back').href = $('#site').href = '../' + THEME + '/';
  $('#mark').innerHTML = Art.fruit('strawberry');
  let tab = (location.hash || '#apercu').slice(1), mode = 'login', msg = '', flash = '', keep = {};
  const TABS = [['apercu', 'Aperçu'], ['commandes', 'Mes commandes'], ['profil', 'Profil']];
  if (!TABS.some(t => t[0] === tab)) tab = 'apercu';
  const STEPS = ['confirmée', 'en préparation', 'prête', 'remise'];
  const slotTxt = o => o.mode === 'retrait' ? o.slot.replace(':00', ' h') : o.slot;
  const box = (t, c) => `<p class="${c === 'ok' ? 'nf-ok' : 'nf-err'}" role="status">${esc(t)}</p>`;
  const field = (name, label, type, extra) => `<label>${label}<input name="${name}" type="${type || 'text'}" ${extra || ''}></label>`;

  /* ---------- Connexion ---------- */
  function viewAuth() {
    const reg = mode === 'register';
    app.innerHTML = `<div class="ac-auth"><div><p class="kick">Mon espace</p><h1 class="ac-h1">${reg ? 'Créer mon <em>compte</em>' : 'Bon retour <em>parmi nous</em>'}</h1><p class="ac-muted">Suivez vos commandes, réglez le solde en ligne et recommandez en un clic.</p></div>
      <form id="authForm" novalidate>${reg ? field('name', 'Nom', 'text', `autocomplete="name" value="${esc(keep.name || '')}"`) : ''}${field('email', 'E-mail', 'email', `autocomplete="email" value="${esc(keep.email || '')}"`)}${reg ? field('phone', 'Téléphone (facultatif)', 'tel', `autocomplete="tel" value="${esc(keep.phone || '')}"`) : ''}${field('password', 'Mot de passe' + (reg ? ' (6 caractères minimum)' : ''), 'password', `autocomplete="${reg ? 'new-password' : 'current-password'}"`)}
      ${msg ? box(msg) : ''}<button class="nf-btn" type="submit">${reg ? 'Créer mon compte' : 'Me connecter'}</button><button type="button" class="nf-link" data-mode="${reg ? 'login' : 'register'}">${reg ? 'J’ai déjà un compte' : 'Créer un compte'}</button></form>
      ${reg ? '' : '<p class="ac-muted nf-demo-note" style="padding:14px;border:1px dashed var(--nf-line);border-radius:12px">Démonstration : <b>camille@exemple.fr</b> / mot de passe <b>demo</b>, ou le bouton « Vue client » du site.</p>'}</div>`;
    $('#out').hidden = true;
  }

  /* ---------- Cartes de commande ---------- */
  const lineList = o => `<div class="lines">${o.items.map(i => `<div class="l"><span>${esc(i.name)}${i.type === 'unit' ? '' : i.qty > 1 ? ' × ' + i.qty : ''}<small>${esc(i.sizeLabel)}${i.optsLabel ? ' · ' + esc(i.optsLabel) : ''}</small></span><b>${eur(i.lineTotal)}</b></div>`).join('')}</div>`;
  function orderCard(o) {
    const due = NF.dueOf(o), paid = NF.paidOf(o), idx = STEPS.indexOf(o.status), canCancel = o.status === 'confirmée';
    const chip = o.status === 'annulée' ? '<span class="ac-chip no">Annulée</span>' : o.status === 'remise' ? '<span class="ac-chip ok">Remise</span>' : o.status === 'prête' ? '<span class="ac-chip go">Prête</span>' : '<span class="ac-chip warn">' + esc(o.status) + '</span>';
    return `<article class="ac-card"><div class="ord-h"><div><span class="ref">${esc(o.ref)}</span><div class="ord-when">${esc(NF.frDate(o.date))} · ${esc(slotTxt(o))}</div><span class="ac-muted">${o.mode === 'livraison' ? 'Livraison · ' + esc(o.address) : 'Retrait en boutique · ' + esc(NF.CFG.address || '')}</span></div>${chip}</div>
      ${o.status !== 'annulée' ? `<ol class="track" aria-label="Suivi">${STEPS.map((s, i) => `<li class="${i <= idx ? 'on' : ''}">${s}</li>`).join('')}</ol>` : ''}
      ${lineList(o)}${o.exclude ? `<p class="ac-muted">À éviter : ${esc(o.exclude)}</p>` : ''}${o.card ? `<p class="ac-muted">Carte : « ${esc(o.card)} »</p>` : ''}
      <div class="sum"><div><span>Total</span><b>${eur(o.total)}</b></div><div><span>Déjà réglé</span><span>${eur(paid)}</span></div>${due && o.status !== 'annulée' ? `<div class="due"><span>Reste à régler</span><span>${eur(due)}</span></div>` : o.status !== 'annulée' ? '<div><span>Solde</span><span>Réglé ✓</span></div>' : ''}${o.refund ? `<div class="due"><span>Remboursement en cours</span><span>${eur(o.refund)}</span></div>` : ''}</div>
      <div class="acts">${due && o.status !== 'annulée' && D().settings.card ? `<button type="button" class="nf-btn nf-btn-sm" data-pay="${o.id}">Payer le solde (${eur(due)})</button>` : ''}${o.status !== 'annulée' ? `<button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-ics="${o.id}">Agenda</button>` : ''}<button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-receipt="${o.id}">Reçu</button>${canCancel ? `<button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-cancel="${o.id}">Annuler</button><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-edit="${o.id}">Modifier</button>` : ''}</div></article>`;
  }
  const histRow = o => `<div class="h${o.status === 'annulée' ? ' off' : ''}"><div><b>${esc(o.items.map(i => i.name).join(', '))}</b><div class="ac-muted">${esc(NF.frDate(o.date))} · ${esc(o.ref)}${o.status === 'annulée' ? ' · annulée' : ''}</div></div><div class="acts" style="margin:0;align-items:center"><b>${eur(o.total)}</b><button type="button" class="nf-btn nf-btn-sm nf-btn-ghost" data-receipt="${o.id}">Reçu</button>${o.status !== 'annulée' ? `<button type="button" class="nf-btn nf-btn-sm" data-again="${o.id}">Commander à nouveau</button>` : ''}</div></div>`;

  function viewDash(me) {
    const all = NF.myOrders(me), now = NF.today(), up = all.filter(o => ['confirmée', 'en préparation', 'prête'].includes(o.status) && o.date >= now).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot)), hist = all.filter(o => !up.includes(o));
    const done = all.filter(o => o.status === 'remise'), spent = done.reduce((s, o) => s + o.total, 0), last = done[0];
    const nav = TABS.map(t => `<button type="button" data-tab="${t[0]}" aria-current="${tab === t[0]}">${t[1]}</button>`).join('');
    let body = '';
    if (tab === 'apercu') {
      body = `<div class="ac-grid"><div>${up.length ? `<p class="kick">Prochaine commande</p>${orderCard(up[0])}` : `<div class="ac-card"><p class="kick">Prochaine commande</p><h3>Aucune commande à venir</h3><p class="ac-muted">Un anniversaire, une réunion, un dimanche gourmand ? Réservez votre date.</p><div class="acts"><a class="nf-btn" href="../${THEME}/#plateaux">Voir les plateaux</a></div></div>`}${up.length > 1 ? `<div class="ac-card"><h3>Autres commandes à venir</h3><div class="hist">${up.slice(1).map(histRow).join('')}</div></div>` : ''}</div>
        <div><div class="ac-card"><p class="kick">Mes chiffres</p><div class="acts" style="margin:0;gap:26px"><div><div class="big-n">${done.length}</div><span class="ac-muted">commande${done.length > 1 ? 's' : ''} retirée${done.length > 1 ? 's' : ''}</span></div><div><div class="big-n">${eur(spent)}</div><span class="ac-muted">dépensés</span></div></div></div>
        ${last ? `<div class="ac-card"><p class="kick">Comme la dernière fois</p><h3>${esc(last.items.map(i => i.name).join(', '))}</h3><p class="ac-muted">${esc(NF.frDate(last.date))} · ${eur(last.total)}</p><div class="acts"><button type="button" class="nf-btn" data-again="${last.id}">Commander à nouveau</button></div></div>` : ''}
        <div class="ac-card"><p class="kick">Mes préférences</p><p class="${me.allergies ? '' : 'ac-muted'}">${me.allergies ? '« ' + esc(me.allergies) + ' »' : 'Aucune allergie enregistrée.'}</p><p class="ac-muted">Elles sont reprises automatiquement à chaque commande.</p><button type="button" class="nf-link" data-tab="profil">Modifier</button></div></div></div>`;
    } else if (tab === 'commandes') {
      body = `<p class="kick">À venir (${up.length})</p>${up.map(orderCard).join('') || '<p class="ac-muted">Aucune commande à venir.</p>'}<div class="ac-card" style="margin-top:22px"><h3>Historique</h3><div class="hist">${hist.map(histRow).join('') || '<p class="ac-muted">Votre historique apparaîtra ici.</p>'}</div></div>`;
    } else {
      body = `<form id="profForm" class="ac-card ac-form" novalidate><h3>Mes informations</h3>${field('name', 'Nom', 'text', `value="${esc(me.name)}" autocomplete="name"`)}<label>E-mail<input value="${esc(me.email)}" disabled></label>${field('phone', 'Téléphone', 'tel', `value="${esc(me.phone || '')}" autocomplete="tel"`)}${field('address', 'Adresse de livraison habituelle', 'text', `value="${esc(me.address || '')}" autocomplete="street-address"`)}
        <label>Allergies ou fruits à éviter<textarea name="allergies" rows="3" maxlength="300" placeholder="Ex. pas de kiwi, allergie aux fruits à coque">${esc(me.allergies || '')}</textarea></label>${field('password', 'Nouveau mot de passe (laisser vide pour ne pas changer)', 'password', 'autocomplete="new-password"')}
        <label class="chk"><input type="checkbox" name="notify"${me.notify !== false ? ' checked' : ''}>Recevoir les confirmations et rappels par e-mail</label><div class="acts"><button class="nf-btn" type="submit">Enregistrer</button><button class="nf-link" data-del type="button" style="color:#b4261b">Supprimer mon compte</button></div></form>`;
    }
    app.innerHTML = `<p class="kick">Mon espace</p><h1 class="ac-h1">Bonjour, <em>${esc(me.name.split(' ')[0])}</em></h1><div class="ac-tabs" role="navigation" aria-label="Sections">${nav}</div>${flash ? `<div style="margin-bottom:18px">${box(flash, flash.startsWith('!') ? '' : 'ok').replace('!', '')}</div>` : ''}${body}`;
    $('#out').hidden = false; flash = '';
  }
  const render = () => { const me = NF.account(); me ? viewDash(me) : viewAuth(); };

  /* ---------- Reçu, paiement du solde, commander à nouveau ---------- */
  function receipt(o) {
    dlg.innerHTML = `<div class="rc"><h3>${esc(NF.CFG.name)}</h3><p class="ac-muted">${esc(NF.CFG.address || '')} · ${esc(NF.CFG.phone || '')}</p><p><b>Reçu / bon de commande ${esc(o.ref)}</b><br>${esc(o.customer.name)} · ${esc(o.customer.email)}<br>${o.mode === 'livraison' ? 'Livraison' : 'Retrait'} le ${esc(NF.frDate(o.date))}, ${esc(slotTxt(o))}</p>
      ${o.items.map(i => `<div class="row"><span>${esc(i.name)} ${i.type === 'unit' ? '' : i.qty > 1 ? '× ' + i.qty : ''}<br><small class="ac-muted">${esc(i.sizeLabel)}${i.optsLabel ? ' · ' + esc(i.optsLabel) : ''}</small></span><b>${eur(i.lineTotal)}</b></div>`).join('')}${o.fee ? `<div class="row"><span>Livraison</span><b>${eur(o.fee)}</b></div>` : ''}<div class="row tot"><span>Total</span><b>${eur(o.total)}</b></div>
      ${o.payments.map(p => `<div class="row"><span>${esc(p.label || 'Paiement')} (${esc(p.how)}) · ${new Date(p.at).toLocaleDateString('fr-FR')}</span><span>${eur(p.amount)}</span></div>`).join('')}<div class="row tot"><span>Reste à régler</span><b>${eur(NF.dueOf(o))}</b></div><p class="ac-muted">Document de démonstration.</p>
      <div class="acts noprint"><button class="nf-btn" type="button" onclick="window.print()">Imprimer</button><button class="nf-btn nf-btn-ghost" type="button" data-x>Fermer</button></div></div>`;
    dlg.showModal();
  }
  function payDialog(o) {
    dlg.innerHTML = `<div class="rc"><p class="kick">Paiement sécurisé</p><h3>Payer le solde</h3><p class="big-n">${eur(NF.dueOf(o))}</p><p class="ac-muted nf-demo-note" style="padding:14px;border:1px dashed var(--nf-line);border-radius:12px">Démonstration : aucune carte n’est demandée et rien n’est prélevé.</p><div class="acts"><button class="nf-btn" type="button" data-payok="${o.id}">Payer (simulation)</button><button class="nf-link" type="button" data-x>Annuler</button></div></div>`;
    dlg.showModal();
  }
  dlg.addEventListener('click', e => {
    if (e.target === dlg || e.target.closest('[data-x]')) return dlg.close();
    const ok = e.target.closest('[data-payok]'); if (ok) { const r = NF.payBalanceOnline(ok.dataset.payok); dlg.close(); flash = r.error ? '!' + r.error : 'Merci, le solde est réglé. Un reçu vous a été envoyé par e-mail.'; render(); }
    const ed = e.target.closest('[data-send]'); if (ed) { NF.sendMail(NF.CFG.email, 'Demande de modification ' + ed.dataset.send, 'Le client souhaite modifier la commande ' + ed.dataset.send + ' :\n\n' + $('#editmsg', dlg).value); NF.save(); dlg.close(); flash = 'Votre demande a été envoyée. Nous vous répondons rapidement (démonstration : rien n’est réellement transmis).'; render(); }
  });
  app.addEventListener('click', e => {
    const t = e.target.closest('button,a'); if (!t) return;
    if (t.dataset.mode) { mode = t.dataset.mode; msg = ''; render(); }
    else if (t.dataset.tab) { tab = t.dataset.tab; location.hash = tab; flash = ''; render(); }
    else if (t.dataset.pay) payDialog(D().orders.find(x => x.id === t.dataset.pay));
    else if (t.dataset.receipt) receipt(D().orders.find(x => x.id === t.dataset.receipt));
    else if (t.dataset.ics) { const o = D().orders.find(x => x.id === t.dataset.ics), l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([NF.ics(o)], { type: 'text/calendar' })); l.download = 'commande-' + o.ref + '.ics'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000); }
    else if (t.dataset.cancel) { if (!confirm('Annuler cette commande ? L’acompte vous sera remboursé.')) return; const r = NF.clientCancel(t.dataset.cancel); flash = r.error ? '!' + r.error : 'Commande annulée. Votre acompte vous sera remboursé : vous recevez un e-mail.'; render(); }
    else if (t.dataset.edit) { const o = D().orders.find(x => x.id === t.dataset.edit); dlg.innerHTML = `<div class="rc"><h3>Modifier ma commande</h3><p class="ac-muted">Dites-nous ce que vous souhaitez changer (date, taille, accompagnement) : nous vous répondons rapidement.</p><textarea id="editmsg" rows="4" class="nf-fields" style="font:inherit;padding:12px;border:2px solid var(--nf-line);border-radius:12px;background:var(--nf-bg);color:var(--nf-ink);width:100%" placeholder="Ex. passer au plateau taille L"></textarea><div class="acts"><button class="nf-btn" type="button" data-send="${esc(o.ref)}">Envoyer la demande</button><button class="nf-link" type="button" data-x>Fermer</button></div></div>`; dlg.showModal(); }
    else if (t.dataset.again) { const o = D().orders.find(x => x.id === t.dataset.again); o.items.forEach(i => NF.cartAdd({ pid: i.pid, size: i.size, qty: i.qty, opts: i.opts })); location.href = '../' + THEME + '/?panier=1'; }
    else if (t.dataset.del !== undefined) { if (confirm('Supprimer définitivement votre compte ? Vos commandes restent enregistrées par la boutique.')) { NF.deleteAccount(); mode = 'login'; render(); } }
  });
  app.addEventListener('submit', async e => {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (e.target.id === 'authForm') { keep = { name: f.name, email: f.email, phone: f.phone }; const r = mode === 'register' ? await NF.signup(f) : await NF.login(f.email, f.password); msg = r.error || ''; if (!r.error) { keep = {}; flash = mode === 'register' ? 'Votre compte est créé. Bienvenue !' : ''; } render(); }
    else if (e.target.id === 'profForm') { const r = await NF.updateAccount({ name: f.name, phone: f.phone, address: f.address, allergies: f.allergies, notify: !!f.notify, password: f.password || '' }); flash = r.error ? '!' + r.error : 'Profil enregistré.'; render(); }
  });
  $('#out').addEventListener('click', () => { NF.logout(); mode = 'login'; });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== tab) { tab = h; render(); } });
  NF.onChange(() => { if (!dlg.open && !(document.activeElement && document.activeElement.closest && document.activeElement.closest('form'))) render(); });

  /* Accès de démonstration : ?demo (compte de Camille) ou ?demo=<e-mail> */
  const dm = /[?&]demo(?:=([^&]*))?/.exec(location.search);
  if (dm) { const em = dm[1] ? decodeURIComponent(dm[1]) : 'camille@exemple.fr'; history.replaceState(null, '', location.pathname); if (!NF.demoLogin(em)) { mode = 'register'; keep = { email: em }; } }
  render();
})();
