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
  const LEVELS = [{ n: 'Bronze', min: 0, perk: 'Boisson signature et serviette chaude à chaque visite' }, { n: 'Argent', min: 500, perk: 'Rappel prioritaire et créneaux du matin réservés' }, { n: 'Or', min: 1000, perk: 'Un produit de l’Officine offert chaque année' }];
  const pointsOf = me => Math.floor(mine(me).filter(a => a.status === 'terminé').reduce((t, a) => t + a.total, 0));
  const favOf = me => {
    const list = D().barbers.filter(b => b.active !== false);
    const fixed = list.find(b => b.id === me.favBarber);
    if (fixed) return fixed;
    const n = {}; mine(me).filter(a => a.status === 'terminé' && a.barber).forEach(a => { n[a.barber] = (n[a.barber] || 0) + 1; });
    return list.find(b => b.id === Object.keys(n).sort((x, y) => n[y] - n[x])[0]) || null;
  };
  const lastDone = me => mine(me).filter(a => a.status === 'terminé').sort((a, b) => when(b) - when(a))[0] || null;
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
  function pointsBlock(me) {
    const pts = pointsOf(me), lv = LEVELS.filter(l => pts >= l.min).pop(), nx = LEVELS.find(l => l.min > pts);
    const pct = nx ? Math.round((pts - lv.min) / (nx.min - lv.min) * 100) : 100;
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Points Maison</p><div class="mt-3 flex items-baseline justify-between gap-4"><h3 class="text-4xl">${pts} <span class="text-lg text-mist">pts</span></h3><span class="border border-bronze/60 px-3 py-1 text-[.65rem] uppercase tracking-wide2 text-champagne">Niveau ${lv.n}</span></div>
      <div class="mt-5 h-1 w-full bg-white/10" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div class="h-1 bg-gradient-to-r from-bronze to-champagne" style="width:${pct}%"></div></div>
      <p class="mt-3 text-xs text-mist">${nx ? (nx.min - pts) + ' pts avant le niveau ' + nx.n : 'Niveau maximum atteint'} · 1 € dépensé = 1 point</p>
      <p class="mt-4 border-t border-white/10 pt-4 text-sm">${esc(lv.perk)}</p>
      <ul class="mt-4 grid gap-1 text-xs text-mist">${LEVELS.map(l => `<li class="${pts >= l.min ? 'text-champagne' : ''}">${pts >= l.min ? '✓' : '○'} ${l.n} · dès ${l.min} pts</li>`).join('')}</ul></article>`;
  }
  function barberBlock(me) {
    const b = favOf(me);
    if (!b) return '';
    const n = mine(me).filter(a => a.status === 'terminé' && a.barber === b.id).length;
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Mon barbier</p><div class="mt-5 flex items-center gap-5"><div class="grid h-16 w-16 flex-none place-items-center rounded-full border border-bronze/50 font-serif text-2xl text-champagne">${esc(b.name.split(' ').map(x => x[0]).join(''))}</div>
      <div><h3 class="text-3xl">${esc(b.name)}</h3><p class="text-xs uppercase tracking-wide2 text-mist">${esc(b.role || '')}</p></div></div>
      <p class="mt-4 text-sm text-mist">${n ? n + ' passage' + (n > 1 ? 's' : '') + ' avec lui. ' : ''}${me.favBarber === b.id ? 'Votre barbier préféré.' : 'Votre barbier le plus fréquent.'}</p>
      <div class="mt-5 flex flex-wrap gap-4"><a class="btn !min-h-[44px] !px-5" href="../?rdv=${esc((lastDone(me) || { serviceId: 'coupe' }).serviceId)}&barbier=${esc(b.id)}#reserver">Réserver avec ${esc(b.name.split(' ')[0])}</a><button type="button" class="link self-center text-[.68rem] uppercase tracking-wide2" data-tab="profil">Changer</button></div></article>`;
  }
  function habitBlock(me) {
    const l = lastDone(me);
    if (!l) return '';
    const b = favOf(me), bid = b ? b.id : l.barber;
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Comme d’habitude</p><h3 class="mt-3 text-3xl">${esc(l.serviceName)}</h3>
      <p class="mt-2 text-sm text-mist">${bid ? 'Avec ' + esc((D().barbers.find(x => x.id === bid) || { name: l.barberName }).name) + ' · ' : ''}dernière fois le ${esc(fr(l.date, { day: 'numeric', month: 'long' }))}.</p>
      <a class="btn mt-5 !min-h-[44px] !px-5" href="../?rdv=${esc(l.serviceId)}${bid ? '&barbier=' + esc(bid) : ''}#reserver">Réserver la même chose</a></article>`;
  }
  function notesBlock(me) {
    return `<article class="glass p-6 md:p-8"><p class="eyebrow">Mes préférences</p><p class="mt-4 text-sm ${me.notes ? '' : 'text-mist'}">${me.notes ? '« ' + esc(me.notes) + ' »' : 'Aucune préférence enregistrée.'}</p><p class="mt-3 text-xs text-mist">Votre barbier les lit avant chaque rendez-vous.</p><button type="button" class="link mt-4 text-[.68rem] uppercase tracking-wide2" data-tab="profil">Modifier</button></article>`;
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
      body = `<div class="grid gap-6 lg:grid-cols-2"><div class="grid content-start gap-6">${next.length ? `<div><p class="eyebrow mb-4">Prochain rendez-vous</p>${apptCard(next[0], me, true)}</div>` : `<article class="glass p-8"><p class="eyebrow">Prochain rendez-vous</p><h3 class="mt-3 text-3xl">Aucun rendez-vous prévu</h3><p class="mt-3 text-sm text-mist">Réservez votre prochain rituel en trois choix.</p><a class="btn mt-6" href="../#reserver">Réserver</a></article>`}${habitBlock(me)}${barberBlock(me)}</div>
        <div class="grid content-start gap-6">${pointsBlock(me)}${loyaltyBlock(me)}${subBlock(me, false)}${notesBlock(me)}</div></div>`;
    } else if (tab === 'rdv') {
      body = `<p class="eyebrow mb-4">À venir (${next.length})</p><div class="grid gap-4">${next.map(a => apptCard(a, me)).join('') || '<p class="text-mist">Aucun rendez-vous à venir.</p>'}</div>
        <p class="eyebrow mb-2 mt-14">Historique</p><div>${hist.map(histRow).join('') || '<p class="text-mist">Votre historique apparaîtra ici.</p>'}</div>
        <p class="mt-6 text-xs text-mist">Annulation gratuite jusqu’à 24 h avant. Passé ce délai, appelez le salon.</p>`;
    } else if (tab === 'prive') {
      body = `<div class="grid gap-6 md:grid-cols-2"><div class="grid content-start gap-6">${pointsBlock(me)}${loyaltyBlock(me)}</div><div class="grid content-start gap-6">${subBlock(me, true)}</div></div>`;
    } else {
      body = `<form id="profForm" class="glass grid max-w-xl gap-6 p-8" novalidate>
        ${field('name', 'Nom', 'text', `value="${esc(me.name)}" required`)}
        <label class="block text-xs uppercase tracking-wide2 text-mist">E-mail<input class="field mt-1 text-base normal-case tracking-normal opacity-60" value="${esc(me.email)}" disabled></label>
        ${field('phone', 'Téléphone', 'tel', `value="${esc(me.phone || '')}"`)}
        <label class="block text-xs uppercase tracking-wide2 text-mist">Barbier préféré<select class="field mt-1 text-base normal-case tracking-normal" name="favBarber"><option value=""${me.favBarber ? '' : ' selected'} class="bg-graphite">Aucune préférence</option>${D().barbers.filter(b => b.active !== false).map(b => `<option value="${b.id}"${me.favBarber === b.id ? ' selected' : ''} class="bg-graphite">${esc(b.name)}</option>`).join('')}</select></label>
        <label class="block text-xs uppercase tracking-wide2 text-mist">Mes préférences de coupe (lues par votre barbier)<textarea class="field mt-1 text-base normal-case tracking-normal" name="notes" rows="3" maxlength="400" placeholder="Longueurs, sensibilités, produits à éviter…">${esc(me.notes || '')}</textarea></label>
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
      const r = await B.updateAccount({ name: f.name, phone: f.phone, notify: !!f.notify, favBarber: f.favBarber, notes: f.notes, password: f.password || '' });
      flash = r.error || 'Profil enregistré.'; render();
    } else if (e.target.id === 'subForm' && me) {
      const S = D().settings.sub;
      const go = () => { const r = B.buySub({ name: me.name, email: me.email, phone: me.phone, pay: f.pay }); flash = r.error || (r.sub.paid ? 'Abonnement activé jusqu’au ' + B.frDate(r.sub.end) + '.' : 'Abonnement enregistré : il s’active dès le règlement au salon.'); render(); };
      if (f.pay === 'card') { $('#payTxt').textContent = eur(S.price); $('#payDlg').showModal(); $('#payOk').onclick = () => { $('#payDlg').close(); go(); }; } else go();
    }
  });
  $('#payNo').addEventListener('click', () => $('#payDlg').close());
  $('#out').addEventListener('click', () => { B.logout(); mode = 'login'; });
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== tab) { tab = h; render(); } });
  B.onChange(() => { if (!$('#payDlg').open && !(document.activeElement && document.activeElement.closest('form'))) render(); });
  /* Démonstration : « Vue client » (?demo) ouvre le compte de démonstration sans identifiant */
  if (/[?&]demo\b/.test(location.search)) { history.replaceState(null, '', location.pathname); B.login('karim@exemple.fr', 'demo').then(render); }
  else render();
})();
