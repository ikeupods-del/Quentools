/* Données et règles du salon (rendez-vous, paiements, abonnement, fidélité, boutique, e-mails).
   Démonstration : tout est gardé dans le navigateur (localStorage). Pour un vrai salon, remplacer load()/save()
   par la base de données (Firestore) : le reste du code ne change pas. */
(function () {
  'use strict';
  const CFG = window.BARBER_CONFIG || {};
  const KEY = 'kings-ave:v1';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const mins = t => { const p = t.split(':'); return +p[0] * 60 + +p[1]; };
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const norm = e => String(e || '').trim().toLowerCase();
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const money = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const frDate = s => { const d = parse(s); return DAYS[d.getDay()].toLowerCase() + ' ' + d.getDate() + '/' + pad(d.getMonth() + 1); };

  function seed() {
    const t = today();
    const mk = (n, name, mail, svc, dayOff, start, pay, extra) => Object.assign({
      id: 'seed' + n, ref: 'KA' + (1000 + n), name, email: mail, phone: '', serviceId: svc.id, serviceName: svc.name, price: svc.price, dur: svc.dur, cut: !!svc.cut,
      date: addDays(t, dayOff), start, items: [], total: svc.price, cover: null, pay, paid: pay === 'card', status: 'confirmé', createdAt: Date.now() - 86400000 * (5 - n)
    }, extra || {});
    const S = [
      { id: 's1', name: 'Coupe classique', price: 25, dur: 30, cut: true },
      { id: 's2', name: 'Dégradé / skin fade', price: 30, dur: 45, cut: true },
      { id: 's3', name: 'Barbe & contours', price: 15, dur: 30, cut: false },
      { id: 's4', name: 'Coupe + barbe', price: 38, dur: 60, cut: false },
      { id: 's5', name: 'Rasage serviette chaude', price: 25, dur: 30, cut: false },
      { id: 's6', name: 'Coupe enfant (-12 ans)', price: 18, dur: 30, cut: true }
    ];
    return {
      v: 1,
      settings: {
        booking: true, card: true, email: true, step: 30, days: 21, chairs: 1, loyaltyEvery: 12,
        hours: { 0: null, 1: null, 2: [9, 19], 3: [9, 19], 4: [9, 20], 5: [9, 20], 6: [9, 18] },
        sub: { on: true, name: 'Abonnement Mensuel', price: 45, weeks: 4, perWeek: 1 }
      },
      services: S,
      products: [
        { id: 'p1', name: 'Cire mate', price: 14, stock: 12, active: true },
        { id: 'p2', name: 'Pommade brillante', price: 16, stock: 8, active: true },
        { id: 'p3', name: 'Huile à barbe', price: 12, stock: 10, active: true },
        { id: 'p4', name: 'Peigne en carbone', price: 6, stock: 25, active: true },
        { id: 'p5', name: 'Brosse à barbe', price: 15, stock: 6, active: true },
        { id: 'p6', name: 'Spray texturisant', price: 13, stock: 0, active: true }
      ],
      appointments: [
        mk(1, 'Karim B.', 'karim@exemple.fr', S[1], 0, '10:00', 'card', { paid: true }),
        mk(2, 'Thomas L.', 'thomas@exemple.fr', S[3], 0, '14:30', 'cash', { paid: false }),
        mk(3, 'Lucas M.', 'lucas@exemple.fr', S[0], 1, '11:00', 'card', { paid: true })
      ],
      subs: [{ id: 'sub1', name: 'Karim B.', email: 'karim@exemple.fr', phone: '', plan: 'Abonnement Mensuel', price: 45, weeks: 4, perWeek: 1, paid: true, start: addDays(t, -10), end: addDays(t, 17), pay: 'card' }],
      outbox: []
    };
  }

  let D;
  function load() {
    try { D = JSON.parse(localStorage.getItem(KEY)); } catch (e) { D = null; }
    if (!D || !D.settings) { D = seed(); save(true); }
  }
  function save(quiet) { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* stockage indisponible */ } if (!quiet) emit(); }
  const listeners = [];
  function emit() { listeners.forEach(f => f()); }
  window.addEventListener('storage', e => { if (e.key === KEY) { load(); emit(); } });

  /* Disponibilités */
  function busy(date, start, dur) {
    return D.appointments.filter(a => a.status !== 'annulé' && a.date === date && mins(a.start) < start + dur && start < mins(a.start) + a.dur).length;
  }
  function openDays() {
    const out = [], t = today();
    for (let i = 0; i < D.settings.days; i++) { const d = addDays(t, i); if (D.settings.hours[parse(d).getDay()]) out.push(d); }
    return out;
  }
  function slotsFor(date, dur) {
    const h = D.settings.hours[parse(date).getDay()];
    if (!h) return [];
    const now = new Date(), out = [], limit = now.getHours() * 60 + now.getMinutes() + 30;
    for (let m = h[0] * 60; m + dur <= h[1] * 60; m += D.settings.step) {
      out.push({ t: hhmm(m), free: !(date === today() && m < limit) && busy(date, m, dur) < D.settings.chairs });
    }
    return out;
  }

  /* Abonnement */
  const weekStart = s => { const d = parse(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
  function activeSub(email, date) {
    email = norm(email);
    return email && D.subs.find(s => norm(s.email) === email && s.paid && s.start <= date && date <= s.end) || null;
  }
  function subUsed(email, date) {
    const w = weekStart(date);
    return D.appointments.filter(a => a.status !== 'annulé' && a.cover === 'sub' && norm(a.email) === norm(email) && weekStart(a.date) === w).length;
  }

  /* Fidélité : la Nᵉ coupe est offerte (les coupes de l'abonnement ne comptent pas) */
  function loyalty(email) {
    email = norm(email);
    const N = D.settings.loyaltyEvery, mine = D.appointments.filter(a => norm(a.email) === email && a.cut && a.cover !== 'sub');
    const done = mine.filter(a => a.status === 'terminé').length, upcoming = mine.filter(a => a.status === 'confirmé').length;
    const inCycle = N ? done % N : 0;
    return { N, done, upcoming, inCycle, toFree: N ? N - 1 - inCycle : 0, freeNext: N > 0 && (done + upcoming + 1) % N === 0, freeCuts: mine.filter(a => a.cover === 'free' && a.status === 'terminé').length };
  }

  /* Prix d'un rendez-vous */
  function quote(o) {
    const svc = D.services.find(s => s.id === o.serviceId), lines = [];
    let cover = null, note = '', total = 0;
    if (svc) {
      if (svc.cut && norm(o.email)) {
        const sub = o.date && activeSub(o.email, o.date);
        if (sub && subUsed(o.email, o.date) < sub.perWeek) { cover = 'sub'; note = 'Coupe incluse dans ton abonnement.'; }
        else if (sub) note = 'Abonnement actif, mais ta coupe de la semaine est déjà prise : celle-ci est au tarif normal.';
        else if (D.settings.loyaltyEvery && loyalty(o.email).freeNext) { cover = 'free'; note = 'Carte de fidélité complète : cette coupe est offerte !'; }
      }
      lines.push({ label: svc.name, amount: cover ? 0 : svc.price, tag: cover === 'sub' ? 'abonnement' : cover === 'free' ? 'offerte' : '' });
    }
    Object.keys(o.cart || {}).forEach(id => {
      const p = D.products.find(x => x.id === id), q = o.cart[id];
      if (p && q > 0) lines.push({ label: p.name + (q > 1 ? ' × ' + q : ''), amount: p.price * q, product: true });
    });
    lines.forEach(l => { total += l.amount; });
    return { svc, lines, total, cover, note };
  }

  /* E-mails : simulés (journal visible dans l'administration) ; envoyés pour de vrai si un relais est configuré */
  function sendMail(to, subject, body) {
    if (!D.settings.email || !to) return false;
    D.outbox.unshift({ id: uid(), to, subject, body, at: Date.now(), real: !!CFG.formEndpoint });
    D.outbox = D.outbox.slice(0, 200);
    if (CFG.formEndpoint) { try { fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, subject, body }) }).catch(() => {}); } catch (e) { /* relais injoignable */ } }
    return true;
  }
  const sign = '\n\n' + (CFG.name || 'Le salon') + (CFG.address ? '\n' + CFG.address : '') + (CFG.phone ? '\n' + CFG.phone : '');
  const recap = a => a.serviceName + ' le ' + frDate(a.date) + ' à ' + a.start + (a.items.length ? '\nProduits à retirer au salon : ' + a.items.map(i => i.name + ' × ' + i.qty).join(', ') : '') + '\nTotal : ' + money(a.total) + (a.total ? (a.paid ? ' (payé par carte)' : ' (à régler au salon, en espèces)') : '');
  const mailBook = a => sendMail(a.email, 'Rendez-vous confirmé · ' + frDate(a.date) + ' ' + a.start, 'Salut ' + a.name + ',\n\nTon rendez-vous est confirmé (réf. ' + a.ref + ').\n' + recap(a) + '\n\nSi tu ne peux pas venir, préviens-nous.' + sign);
  const mailCancel = a => sendMail(a.email, 'Rendez-vous annulé · ' + frDate(a.date) + ' ' + a.start, 'Salut ' + a.name + ',\n\nTon rendez-vous (réf. ' + a.ref + ') du ' + frDate(a.date) + ' à ' + a.start + ' est annulé.' + (a.refund ? '\nTu seras remboursé de ' + money(a.total) + ' sur ta carte.' : '') + '\nTu peux reprendre rendez-vous en ligne quand tu veux.' + sign);
  const mailRemind = a => sendMail(a.email, 'Rappel : rendez-vous ' + (a.date === today() ? "aujourd'hui" : frDate(a.date)) + ' à ' + a.start, 'Salut ' + a.name + ',\n\nPetit rappel de ton rendez-vous :\n' + recap(a) + '\n\nÀ tout à l\'heure !' + sign);

  /* Réservation */
  function book(o, admin) {
    const S = D.settings, q = quote(o), svc = q.svc;
    if (!admin && !S.booking) return { error: 'Les réservations en ligne sont fermées pour le moment.' };
    if (!svc) return { error: 'Choisis une prestation.' };
    if (!o.date || !o.time) return { error: 'Choisis un jour et une heure.' };
    if (!String(o.name || '').trim()) return { error: 'Indique ton prénom.' };
    if (!admin && !/^\S+@\S+\.\S+$/.test(String(o.email || '').trim())) return { error: 'Indique un e-mail valide pour recevoir la confirmation.' };
    const slot = slotsFor(o.date, svc.dur).find(s => s.t === o.time);
    if (!admin && !(slot && slot.free)) return { error: 'Ce créneau vient d’être pris. Choisis-en un autre.' };
    const items = [];
    for (const id of Object.keys(o.cart || {})) {
      const p = D.products.find(x => x.id === id), n = o.cart[id];
      if (!p || n <= 0) continue;
      if (!p.active || p.stock < n) return { error: p.name + ' n’est plus disponible en quantité suffisante.' };
      items.push({ id, name: p.name, price: p.price, qty: n });
    }
    let pay = o.pay === 'card' ? 'card' : 'cash';
    if (pay === 'card' && !S.card && !admin) return { error: 'Le paiement par carte est désactivé : règle au salon.' };
    if (!q.total) pay = 'none';
    items.forEach(i => { D.products.find(p => p.id === i.id).stock -= i.qty; });
    const a = {
      id: 'a' + uid() + Date.now().toString(36), ref: 'KA' + uid(), name: o.name.trim(), email: norm(o.email), phone: String(o.phone || '').trim(),
      serviceId: svc.id, serviceName: svc.name, price: svc.price, dur: svc.dur, cut: !!svc.cut, date: o.date, start: o.time, items,
      total: q.total, cover: q.cover, pay, paid: pay === 'card' || pay === 'none', status: 'confirmé', createdAt: Date.now(), source: admin ? 'salon' : 'web'
    };
    D.appointments.push(a);
    if (a.email) mailBook(a);
    save();
    return { appt: a };
  }
  function setStatus(id, status) {
    const a = D.appointments.find(x => x.id === id);
    if (!a || a.status === status) return;
    if (status === 'annulé') {
      a.items.forEach(i => { const p = D.products.find(x => x.id === i.id); if (p) p.stock += i.qty; });
      a.refund = a.pay === 'card' && a.paid && a.total > 0;
      a.paid = a.paid && !a.refund;
      if (a.email) mailCancel(a);
    }
    if (status === 'terminé' && a.pay === 'cash') a.paid = true;
    a.status = status;
    save();
  }
  function remove(id) { D.appointments = D.appointments.filter(a => a.id !== id); save(); }

  /* Abonnements */
  function activate(sub, from) {
    const last = D.subs.filter(s => s !== sub && norm(s.email) === norm(sub.email) && s.paid).reduce((m, s) => s.end > m ? s.end : m, '');
    sub.start = last && last >= (from || today()) ? addDays(last, 1) : (from || today());
    sub.end = addDays(sub.start, sub.weeks * 7 - 1);
    sub.paid = true;
  }
  function buySub(o, admin) {
    const S = D.settings.sub;
    if (!admin && !S.on) return { error: 'L’abonnement n’est pas proposé pour le moment.' };
    if (!String(o.name || '').trim() || !/^\S+@\S+\.\S+$/.test(String(o.email || '').trim())) return { error: 'Indique ton prénom et un e-mail valide.' };
    const pay = o.pay === 'card' && (D.settings.card || admin) ? 'card' : 'cash';
    const sub = { id: 'sub' + uid(), name: o.name.trim(), email: norm(o.email), phone: String(o.phone || '').trim(), plan: S.name, price: S.price, weeks: S.weeks, perWeek: S.perWeek, paid: false, start: '', end: '', pay };
    if (pay === 'card') activate(sub);
    D.subs.push(sub);
    sendMail(sub.email, 'Abonnement ' + (sub.paid ? 'activé' : 'enregistré'), 'Salut ' + sub.name + ',\n\n' + (sub.paid ? 'Ton abonnement est actif du ' + frDate(sub.start) + ' au ' + frDate(sub.end) + ' : ' + sub.perWeek + ' coupe par semaine. Prends rendez-vous en ligne avec cet e-mail, ta coupe sera gratuite.' : 'Ton abonnement est enregistré. Il s’active dès que tu as réglé ' + money(sub.price) + ' au salon.') + sign);
    save();
    return { sub };
  }

  /* Fichier calendrier (.ics) */
  function ics(a) {
    const f = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00', end = hhmm(mins(a.start) + a.dur);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kings Ave//FR', 'BEGIN:VEVENT', 'UID:' + a.id + '@barbier', 'DTSTAMP:' + f(today(), '00:00'), 'DTSTART:' + f(a.date, a.start), 'DTEND:' + f(a.date, end),
      'SUMMARY:' + a.serviceName + ' · ' + (CFG.name || ''), 'LOCATION:' + (CFG.address || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  load();
  window.Barber = {
    CFG, get data() { return D; }, save, reset() { D = seed(); save(); }, onChange: f => listeners.push(f),
    esc, money, ymd, parse, addDays, today, mins, hhmm, norm, uid, frDate, DAYS, weekStart,
    openDays, slotsFor, activeSub, subUsed, loyalty, quote, book, setStatus, remove, activate, buySub, sendMail, mailRemind, ics
  };
})();
