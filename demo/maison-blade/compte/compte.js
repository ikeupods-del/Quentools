/* Espace client : connexion, rendez-vous (annulation jusqu'à 24 h avant), fidélité, abonnement, profil. Données : store.js. */
(function () {
  'use strict';
  const B = window.Barber, D = () => B.data, esc = B.esc, eur = B.money;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app');
  const TABS = [['apercu', 'Aperçu'], ['rdv', 'Rendez-vous'], ['prive', 'Privilège'], ['profil', 'Profil']];
  let tab = (location.hash || '#apercu').slice(1), mode = 'login', msg = '', flash = '', keep = {};
  if (!TABS.some(t => t[0] === tab)) tab = 'apercu';

  const fr = (d, o) => new Date(d + 'T12:00').toLocaleDateString('fr-FR', o || { weekday: 'long', day: 'numeric', month: 'long' });
  const mine = me => D().appointments.filter(a => B.norm(a.email) === B.norm(me.email));
  const when = a => new Date(a.date + 'T' + a.start).getTime();
  const field = (name, label, type, extra) => `<label class="block text-xs uppercase tracking-wide2 text-mist">${label}<input class="field mt-1 text-base normal-case tracking-normal" name="${name}" type="${type || 'text'}" ${extra || ''}></label>`;
  const box = (t, c) => `<p class="border p-4 text-sm ${c || 'border-white/10 text-mist'}" role="status">${esc(t)}</p>`;
  const bad = 'border-[#a0524a] text-[#e0a39a]', good = 'border-bronze/50 text-champagne';

  /* ---------- Connexion / création ---------- */
  function viewAuth() {
    const reg = mode === 'register';
    app.innerHTML = `<div class="mx-auto max-w-md"><p class="eyebrow">Mon espace</p><h1 class="mt-5 text-[clamp(2.4rem,7vw,3.6rem)]">${reg ? 'Créer mon <em class="text-champagne">compte</em>' : 'Bon retour <em class="text-champagne">parmi nous</em>'}</h1>
      <p class="mt-4 text-sm text-mist">Retrouvez vos rendez-vous, votre carte de fidélité et votre abonnement.</p>
      <form id="authForm" class="glass mt-10 grid gap-6 p-8" novalidate>
        ${reg ? field('name', 'Nom', 'text', `autocomplete="name" required value="${esc(keep.name || '')}"`) : ''}
        ${field('email', 'E-mail', 'email', `autocomplete="email" required value="${esc(keep.email || '')}"`)}
        ${reg ? field('phone', 'Téléphone (facultatif)', 'tel', `autocomplete="tel" value="${esc(keep.phone || '')}"`) : ''}
        ${field('password', 'Mot de passe' + (reg ? ' (6 caractères minimum)' : ''), 'password', `autocomplete="${reg ? 'new-password' : 'current-password'}" required`)}
        ${msg ? box(msg, bad) : ''}
        <button class="btn" type="submit">${reg ? 'Créer mon compte' : 'Me connecter'}</button>
        <button type="button" class="link self-center text-[.72rem] uppercase tracking-wide2" data-mode="${reg ? 'login' : 'register'}">${reg ? 'J’ai déjà un compte' : 'Créer un compte'}</button>
      </form>
      ${reg ? '' : '<p class="mt-6 border border-white/10 p-4 text-sm text-mist">Démonstration : connectez-vous avec <b class="text-champagne">karim@exemple.fr</b> et le mot de passe <b class="text-champagne">demo</b> pour voir un compte déjà rempli.</p>'}</div>`;
    $('#out').hidden = true;
  }

  /* ---------- Tableau de bord ---------- */
  const apptCard = (a, me, big) => {
    const canCancel = a.status === 'confirmé';
    return `<article class="glass p-6 md:p-7"><div class="flex flex-wrap items-start justify-between gap-4"><div>
      <p class="eyebrow">${esc(fr(a.date))} · ${esc(a.start)}</p><h3 class="mt-3 ${big ? 'text-4xl' : 'text-2xl'}">${esc(a.serviceName)}</h3>
      <p class="mt-2 text-sm text-mist">${a.barberName ? 'Avec ' + esc(a.barberName) + ' · ' : ''}Réf. ${esc(a.ref)}${a.items.length ? '<br>À retirer : ' + a.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ') : ''}</p></div>
      <div class="text-right"><p class="font-serif text-3xl text-champagne">${eur(a.total)}</p><p class="mt-1 text-xs uppercase tracking-wide2 text-mist">${a.cover === 'sub' ? 'Abonnement' : a.cover === 'free' ? 'Offerte' : !a.total ? 'Inclus' : a.paid ? 'Réglé par carte' : 'À régler au salon'}</p></div></div>
      ${canCancel ? `<div class="mt-6 flex flex-wrap gap-3 border-t border-white/10 pt-5"><button class="btn-line !min-h-[42px] !px-5" data-ics="${a.id}" type="button">Ajouter à l’agenda</button><button class="btn-line !min-h-[42px] !px-5" data-cancel="${a.id}" type="button">Annuler</button></div>` : ''}</article>`;
  };
  function histRow(a) {
    const st = a.status === 'terminé' ? '' : '<span class="ml-2 border border-white/20 px-2 py-0.5 text-[.6rem] uppercase tracking-wide2 text-mist">Annulé</span>';
    return `<div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.08] py-4 ${a.status === 'annulé' ? 'opacity-50' : ''}"><div><p>${esc(a.serviceName)}${st}</p><p class="text-xs text-mist">${esc(fr(a.date, { day: 'numeric', month: 'long', year: 'numeric' }))}${a.barberName ? ' · ' + esc(a.barberName) : ''}</p></div>
      <div class="flex items-center gap-5"><span class="font-serif text-xl text-champagne">${eur(a.total)}</span><a class="link text-[.68rem] uppercase tracking-wide2" href="../?rdv=${esc(a.serviceId)}${a.barber ? '&barbier=' + esc(a.barber) : ''}#reserver">Réserver à nouveau</a></div></div>`;
  }
  function loyaltyBlock(me) {
    const N = D().settings.loyaltyEvery;
    if (!N) return '';
    const L = B.loyalty(me.email);
    let st = '';
    for (let i = 1; i <= N; i++) st += i === N ? '<div class="stamp free">★</div>' : `<div class="stamp${i <= L.inCycle ? ' on' : ''}">${i <= L.inCycle ? '✓' : i}</div>`;
    const m = L.freeNext ? 'Votre prochaine coupe est offerte.' : L.toFree === 0 ? 'Votre prochaine coupe est la ' + N + 'ᵉ : offerte.' : 'Encore ' + L.toFree + ' coupe' + (L.toFree > 1 ? 's' : '') + ' avant votre coupe offerte.';
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Le Cercle</p><h3 class="mt-3 text-3xl">${L.done} coupe${L.done > 1 ? 's' : ''} réalisée${L.done > 1 ? 's' : ''}</h3>
      <div class="mt-6 grid gap-2.5" style="grid-template-columns:repeat(${N > 10 ? 6 : 5},minmax(0,1fr))">${st}</div><p class="mt-5 text-sm ${L.freeNext ? 'text-champagne' : 'text-mist'}">${m}</p></article>`;
  }
  function subBlock(me, full) {
    const S = D().settings.sub, sub = B.activeSub(me.email, B.today()), pending = D().subs.find(s => B.norm(s.email) === B.norm(me.email) && !s.paid);
    if (sub) {
      const used = B.subUsed(me.email, B.today());
      return `<article class="glass p-6 md:p-8"><p class="eyebrow">Abonnement</p><h3 class="mt-3 text-3xl">${esc(sub.plan)}</h3>
        <p class="mt-3 text-sm text-mist">Actif jusqu’au ${esc(fr(sub.end))}.<br>Cette semaine : ${used >= sub.perWeek ? 'coupe déjà utilisée' : 'coupe disponible, réservez-la à 0 €'}.</p>
        <a class="btn mt-6" href="../#reserver">Réserver ma coupe</a></article>`;
    }
    if (pending) return `<article class="glass p-6 md:p-8"><p class="eyebrow">Abonnement</p><h3 class="mt-3 text-3xl">${esc(pending.plan)}</h3><p class="mt-3 text-sm text-mist">Enregistré. Il s’active dès le règlement de ${eur(pending.price)} au salon.</p></article>`;
    if (!S.on) return '';
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Abonnement</p><h3 class="mt-3 text-3xl">${esc(S.name)}</h3><p class="mt-3 font-serif text-5xl text-champagne">${eur(S.price)}</p>
      <p class="mt-3 text-sm text-mist">${S.perWeek} coupe par semaine pendant ${S.weeks} semaines.</p>
      ${full ? `<form id="subForm" class="mt-6 grid gap-3 sm:grid-cols-2"><label class="rad"><input type="radio" name="pay" value="card"${D().settings.card ? ' checked' : ' disabled'}><span>Carte en ligne</span></label><label class="rad"><input type="radio" name="pay" value="cash"${D().settings.card ? '' : ' checked'}><span>Au salon</span></label><button class="btn sm:col-span-2" type="submit">Je m’abonne</button></form>` : '<a class="btn mt-6" href="#prive">Découvrir l’abonnement</a>'}</article>`;
  }

  function viewDash(me) {
    const all = mine(me).sort((a, b) => when(a) - when(b)), now = Date.now();
    const next = all.filter(a => a.status === 'confirmé' && when(a) >= now - 3600000), hist = all.filter(a => !next.includes(a)).reverse();
    const nav = TABS.map(t => `<button type="button" data-tab="${t[0]}" class="min-h-[44px] border px-5 text-[.68rem] uppercase tracking-wide2 transition duration-500 ${tab === t[0] ? 'border-brass bg-brass/15 text-champagne' : 'border-white/10 text-mist hover:border-champagne/40 hover:text-ivory'}" aria-current="${tab === t[0]}">${t[1]}</button>`).join('');
    let body = '';
    if (tab === 'apercu') {
      body = `<div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]"><div class="grid gap-6">${next.length ? `<div><p class="eyebrow mb-4">Prochain rendez-vous</p>${apptCard(next[0], me, true)}</div>` : `<article class="glass p-8"><p class="eyebrow">Prochain rendez-vous</p><h3 class="mt-3 text-3xl">Aucun rendez-vous prévu</h3><p class="mt-3 text-sm text-mist">Réservez votre prochain rituel en trois choix.</p><a class="btn mt-6" href="../#reserver">Réserver</a></article>`}</div>
        <div class="grid content-start gap-6">${loyaltyBlock(me)}${subBlock(me, false)}</div></div>`;
    } else if (tab === 'rdv') {
      body = `<p class="eyebrow mb-4">À venir (${next.length})</p><div class="grid gap-4">${next.map(a => apptCard(a, me)).join('') || '<p class="text-mist">Aucun rendez-vous à venir.</p>'}</div>
        <p class="eyebrow mb-2 mt-14">Historique</p><div>${hist.map(histRow).join('') || '<p class="text-mist">Votre historique apparaîtra ici.</p>'}</div>
        <p class="mt-6 text-xs text-mist">Annulation gratuite jusqu’à 24 h avant. Passé ce délai, appelez le salon.</p>`;
    } else if (tab === 'prive') {
      body = `<div class="grid gap-6 md:grid-cols-2">${loyaltyBlock(me)}${subBlock(me, true)}</div>`;
    } else {
      body = `<form id="profForm" class="glass grid max-w-xl gap-6 p-8" novalidate>
        ${field('name', 'Nom', 'text', `value="${esc(me.name)}" required`)}
        <label class="block text-xs uppercase tracking-wide2 text-mist">E-mail<input class="field mt-1 text-base normal-case tracking-normal opacity-60" value="${esc(me.email)}" disabled></label>
        ${field('phone', 'Téléphone', 'tel', `value="${esc(me.phone || '')}"`)}
        ${field('password', 'Nouveau mot de passe (laisser vide pour ne pas changer)', 'password', 'autocomplete="new-password"')}
        <label class="flex items-center gap-3 text-sm"><input type="checkbox" name="notify" class="h-5 w-5 accent-[#bfa57a]"${me.notify !== false ? ' checked' : ''}>Recevoir les confirmations et rappels par e-mail</label>
        <button class="btn" type="submit">Enregistrer</button>
        <button class="link self-start text-[.68rem] uppercase tracking-wide2 text-[#e0a39a]" data-del type="button">Supprimer mon compte</button></form>`;
    }
    app.innerHTML = `<p class="eyebrow">Mon espace</p><h1 class="mt-5 text-[clamp(2.4rem,7vw,4.2rem)]">Bonjour, <em class="text-champagne">${esc(me.name.split(' ')[0])}</em></h1>
      <div class="mt-10 flex flex-wrap gap-2" role="navigation" aria-label="Sections">${nav}</div>
      ${flash ? `<div class="mt-6">${box(flash, good)}</div>` : ''}<div class="mt-10">${body}</div>`;
    $('#out').hidden = false;
    flash = '';
  }

  function render() {
    const me = B.account();
    if (!me) return viewAuth();
    viewDash(me);
  }

  /* ---------- Événements ---------- */
  app.addEventListener('click', e => {
    const t = e.target.closest('button,a'); if (!t) return;
    if (t.dataset.mode) { mode = t.dataset.mode; msg = ''; render(); }
    else if (t.dataset.tab) { tab = t.dataset.tab; location.hash = tab; flash = ''; render(); }
    else if (t.dataset.cancel) {
      if (!confirm('Annuler ce rendez-vous ?')) return;
      const r = B.clientCancel(t.dataset.cancel); flash = r.error || 'Rendez-vous annulé. Une confirmation vous a été envoyée par e-mail.'; render();
    } else if (t.dataset.ics) {
      const a = D().appointments.find(x => x.id === t.dataset.ics), l = document.createElement('a');
      l.href = URL.createObjectURL(new Blob([B.ics(a)], { type: 'text/calendar' })); l.download = 'maison-blade.ics'; l.click(); setTimeout(() => URL.revokeObjectURL(l.href), 1000);
    } else if (t.dataset.del !== undefined) {
      if (confirm('Supprimer définitivement votre compte ? Vos rendez-vous restent enregistrés au salon.')) { B.deleteAccount(); mode = 'login'; render(); }
    }
  });
  app.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target)), me = B.account();
    if (e.target.id === 'authForm') {
      keep = { name: f.name, email: f.email, phone: f.phone };
      const r = mode === 'register' ? await B.signup(f) : await B.login(f.email, f.password);
      msg = r.error || ''; if (!r.error) keep = {}; if (!r.error) flash = mode === 'register' ? 'Votre compte est créé. Bienvenue !' : '';
      render();
    } else if (e.target.id === 'profForm') {
      const r = await B.updateAccount({ name: f.name, phone: f.phone, notify: !!f.notify, password: f.password || '' });
      flash = r.error || 'Profil enregistré.'; render();
    } else if (e.target.id === 'subForm' && me) {
      const S = D().settings.sub;
      const go = () => { const r = B.buySub({ name: me.name, email: me.email, phone: me.phone, pay: f.pay }); flash = r.error || (r.sub.paid ? 'Abonnement activé jusqu’au ' + B.frDate(r.sub.end) + '.' : 'Abonnement enregistré : il s’active dès le règlement au salon.'); render(); };
      if (f.pay === 'card') { $('#payTxt').textContent = eur(S.price); $('#payDlg').showModal(); $('#payOk').onclick = () => { $('#payDlg').close(); go(); }; } else go();
    }
  });
  $('#payNo').addEventListener('click', () => $('#payDlg').close());
  $('#out').addEventListener('click', () => { B.logout(); mode = 'login'; });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h)) { tab = h; render(); } });
  B.onChange(() => { if (!$('#payDlg').open && !(document.activeElement && document.activeElement.closest('form'))) render(); });
  /* Démonstration : « Vue client » (?demo) ouvre le compte de démonstration sans identifiant */
  if (/[?&]demo\b/.test(location.search)) { history.replaceState(null, '', location.pathname); B.login('karim@exemple.fr', 'demo').then(render); }
  else render();
})();
