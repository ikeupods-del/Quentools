/* Données et règles du salon (rendez-vous par barbier, paiements, abonnement, fidélité, boutique, e-mails).
   Démonstration : tout est gardé dans le navigateur (localStorage). Pour un vrai salon, remplacer load()/save()
   par la base de données (Firestore) : le reste du code ne change pas. */
(function () {
  'use strict';
  const CFG = window.BARBER_CONFIG || {};
  const KEY = 'maison-blade:v2';
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => new Date(s + 'T12:00:00');
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const today = () => ymd(new Date());
  const mins = t => { const p = t.split(':'); return +p[0] * 60 + +p[1]; };
  const hhmm = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const norm = e => String(e || '').trim().toLowerCase();
  const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
  const money = n => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' €';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const frDate = s => { const d = parse(s); return DAYS[d.getDay()].toLowerCase() + ' ' + d.getDate() + '/' + pad(d.getMonth() + 1); };

  function seed() {
    const t = today();
    const S = [
      { id: 'coupe', name: 'Coupe signature', desc: 'Consultation, coupe aux ciseaux, finitions à la lame, coiffage.', price: 85, dur: 60, cut: true, icon: 'scissors' },
      { id: 'barbe', name: 'Taille de barbe', desc: 'Dessin des contours, taille au peigne, huile et baume.', price: 55, dur: 30, cut: false, icon: 'razor' },
      { id: 'serviette', name: 'Soin du visage à la serviette chaude', desc: 'Gommage doux, vapeur, massage, masque, serviettes chaudes.', price: 75, dur: 60, cut: false, icon: 'towel' },
      { id: 'maison', name: 'Le Rituel Maison', desc: 'Coupe, barbe et soin du visage : l’expérience complète.', price: 190, dur: 120, cut: false, star: true, icon: 'brush' }
    ];
    const B = [
      { id: 'matteo', name: 'Matteo Rossi', role: 'Maître barbier · fondateur', bio: 'Vingt ans de ciseaux, formé à Milan. La coupe signature, c’est lui.', does: ['coupe', 'barbe', 'serviette', 'maison'], active: true },
      { id: 'julien', name: 'Julien Marchand', role: 'Barbe & rasage', bio: 'Le rasage d’autrefois, la lame droite et la patience.', does: ['coupe', 'barbe', 'serviette', 'maison'], active: true },
      { id: 'elias', name: 'Elias Kaddour', role: 'Soin du visage & finitions', bio: 'Mains douces, œil précis : le rituel bien-être.', does: ['barbe', 'serviette', 'maison'], active: true }
    ];
    const mk = (n, name, mail, svc, bar, dayOff, start, pay, extra) => Object.assign({
      id: 'seed' + n, ref: 'MB' + (1000 + n), name, email: mail, phone: '', serviceId: svc.id, serviceName: svc.name, price: svc.price, dur: svc.dur, cut: !!svc.cut,
      barber: bar.id, barberName: bar.name, date: addDays(t, dayOff), start, items: [], total: svc.price, cover: null, pay, paid: pay === 'card', status: 'confirmé', createdAt: Date.now() - 86400000 * (5 - n)
    }, extra || {});
    return {
      v: 2,
      settings: {
        booking: true, card: true, email: true, step: 30, days: 21, loyaltyEvery: 10,
        hours: { 0: null, 1: null, 2: [10, 20], 3: [10, 20], 4: [10, 20], 5: [10, 20], 6: [9, 18] },
        sub: { on: true, name: 'Abonnement Privilège', price: 280, weeks: 4, perWeek: 1 }
      },
      services: S, barbers: B,
      products: [
        { id: 'p1', name: 'Pommade mate', price: 28, stock: 12, active: true },
        { id: 'p2', name: 'Baume à barbe', price: 32, stock: 9, active: true },
        { id: 'p3', name: 'Huile de rasage', price: 36, stock: 10, active: true },
        { id: 'p4', name: 'Peigne en corne', price: 24, stock: 15, active: true },
        { id: 'p5', name: 'Blaireau', price: 65, stock: 5, active: true },
        { id: 'p6', name: 'Rasoir coupe-chou', price: 140, stock: 0, active: true }
      ],
      appointments: [
        mk(1, 'Karim B.', 'karim@exemple.fr', S[0], B[0], 0, '10:00', 'card', { paid: true, cover: 'sub', total: 0, pay: 'none' }),
        mk(2, 'Thomas L.', 'thomas@exemple.fr', S[3], B[1], 0, '14:00', 'cash', { paid: false }),
        mk(3, 'Lucas M.', 'lucas@exemple.fr', S[2], B[2], 1, '11:00', 'card', { paid: true })
      ],
      subs: [{ id: 'sub1', name: 'Karim B.', email: 'karim@exemple.fr', phone: '', plan: 'Abonnement Privilège', price: 280, weeks: 4, perWeek: 1, paid: true, start: addDays(t, -10), end: addDays(t, 17), pay: 'card' }],
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

  /* Disponibilités : chaque barbier ne fait qu'une prestation à la fois */
  const eligible = svcId => D.barbers.filter(b => b.active !== false && (!svcId || !b.does || b.does.includes(svcId)));
  function barberFree(b, date, start, dur) {
    return !D.appointments.some(a => a.status !== 'annulé' && a.barber === b.id && a.date === date && mins(a.start) < start + dur && start < mins(a.start) + a.dur);
  }
  function pickBarber(date, time, dur, svcId, barberId) {
    const list = barberId && barberId !== 'any' ? D.barbers.filter(b => b.id === barberId && b.active !== false) : eligible(svcId);
    return list.find(b => barberFree(b, date, mins(time), dur)) || null;
  }
  function openDays() {
    const out = [], t = today();
    for (let i = 0; i < D.settings.days; i++) { const d = addDays(t, i); if (D.settings.hours[parse(d).getDay()]) out.push(d); }
    return out;
  }
  function slotsFor(date, dur, svcId, barberId) {
    const h = D.settings.hours[parse(date).getDay()];
    if (!h) return [];
    const now = new Date(), out = [], limit = now.getHours() * 60 + now.getMinutes() + 60;
    for (let m = h[0] * 60; m + dur <= h[1] * 60; m += D.settings.step) {
      const t = hhmm(m);
      out.push({ t, free: !(date === today() && m < limit) && !!pickBarber(date, t, dur, svcId, barberId) });
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
    return { N, done, upcoming, inCycle, toFree: N ? N - 1 - inCycle : 0, freeNext: N > 0 && (done + upcoming + 1) % N === 0 };
  }

  /* Prix d'un rendez-vous */
  function quote(o) {
    const svc = D.services.find(s => s.id === o.serviceId), lines = [];
    let cover = null, note = '', total = 0;
    if (svc) {
      if (svc.cut && norm(o.email)) {
        const sub = o.date && activeSub(o.email, o.date);
        if (sub && subUsed(o.email, o.date) < sub.perWeek) { cover = 'sub'; note = 'Coupe incluse dans votre abonnement.'; }
        else if (sub) note = 'Abonnement actif, mais la coupe de la semaine est déjà prise : celle-ci est au tarif normal.';
        else if (D.settings.loyaltyEvery && loyalty(o.email).freeNext) { cover = 'free'; note = 'Carte de fidélité complète : cette coupe vous est offerte.'; }
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
  const recap = a => a.serviceName + (a.barberName ? ' avec ' + a.barberName : '') + ' le ' + frDate(a.date) + ' à ' + a.start + (a.items.length ? '\nProduits à retirer au salon : ' + a.items.map(i => i.name + ' × ' + i.qty).join(', ') : '') + '\nTotal : ' + money(a.total) + (a.total ? (a.paid ? ' (réglé par carte)' : ' (à régler au salon)') : '');
  const mailBook = a => sendMail(a.email, 'Rendez-vous confirmé · ' + frDate(a.date) + ' ' + a.start, 'Bonjour ' + a.name + ',\n\nVotre rendez-vous est confirmé (réf. ' + a.ref + ').\n' + recap(a) + '\n\nSi vous ne pouvez pas venir, prévenez-nous.' + sign);
  const mailCancel = a => sendMail(a.email, 'Rendez-vous annulé · ' + frDate(a.date) + ' ' + a.start, 'Bonjour ' + a.name + ',\n\nVotre rendez-vous (réf. ' + a.ref + ') du ' + frDate(a.date) + ' à ' + a.start + ' est annulé.' + (a.refund ? '\nVous serez remboursé de ' + money(a.total) + ' sur votre carte.' : '') + '\nVous pouvez reprendre rendez-vous en ligne à tout moment.' + sign);
  const mailRemind = a => sendMail(a.email, 'Rappel : rendez-vous ' + (a.date === today() ? "aujourd'hui" : frDate(a.date)) + ' à ' + a.start, 'Bonjour ' + a.name + ',\n\nUn petit rappel de votre rendez-vous :\n' + recap(a) + '\n\nNous vous attendons.' + sign);

  /* Réservation : 'any' = premier barbier disponible */
  function book(o, admin) {
    const S = D.settings, q = quote(o), svc = q.svc;
    if (!admin && !S.booking) return { error: 'Les réservations en ligne sont fermées pour le moment.' };
    if (!svc) return { error: 'Choisissez un rituel.' };
    if (!o.date || !o.time) return { error: 'Choisissez un jour et une heure.' };
    if (!String(o.name || '').trim()) return { error: 'Indiquez votre nom.' };
    if (!admin && !/^\S+@\S+\.\S+$/.test(String(o.email || '').trim())) return { error: 'Indiquez un e-mail valide pour la confirmation.' };
    const bar = pickBarber(o.date, o.time, svc.dur, svc.id, o.barber) || (admin && o.barber && o.barber !== 'any' ? D.barbers.find(b => b.id === o.barber) : null);
    if (!bar && !(admin && (!o.barber || o.barber === 'any'))) return { error: 'Ce créneau vient d’être pris. Choisissez-en un autre.' };
    const items = [];
    for (const id of Object.keys(o.cart || {})) {
      const p = D.products.find(x => x.id === id), n = o.cart[id];
      if (!p || n <= 0) continue;
      if (!p.active || p.stock < n) return { error: p.name + ' n’est plus disponible en quantité suffisante.' };
      items.push({ id, name: p.name, price: p.price, qty: n });
    }
    let pay = o.pay === 'card' ? 'card' : 'cash';
    if (pay === 'card' && !S.card && !admin) return { error: 'Le paiement par carte est désactivé : réglez au salon.' };
    if (!q.total) pay = 'none';
    items.forEach(i => { D.products.find(p => p.id === i.id).stock -= i.qty; });
    const a = {
      id: 'a' + uid() + Date.now().toString(36), ref: 'MB' + uid(), name: o.name.trim(), email: norm(o.email), phone: String(o.phone || '').trim(),
      serviceId: svc.id, serviceName: svc.name, price: svc.price, dur: svc.dur, cut: !!svc.cut, barber: bar ? bar.id : '', barberName: bar ? bar.name : '',
      date: o.date, start: o.time, items, total: q.total, cover: q.cover, pay, paid: pay === 'card' || pay === 'none', status: 'confirmé', createdAt: Date.now(), source: admin ? 'salon' : 'web'
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
    if (!String(o.name || '').trim() || !/^\S+@\S+\.\S+$/.test(String(o.email || '').trim())) return { error: 'Indiquez votre nom et un e-mail valide.' };
    const pay = o.pay === 'card' && (D.settings.card || admin) ? 'card' : 'cash';
    const sub = { id: 'sub' + uid(), name: o.name.trim(), email: norm(o.email), phone: String(o.phone || '').trim(), plan: S.name, price: S.price, weeks: S.weeks, perWeek: S.perWeek, paid: false, start: '', end: '', pay };
    if (pay === 'card') activate(sub);
    D.subs.push(sub);
    sendMail(sub.email, 'Abonnement ' + (sub.paid ? 'activé' : 'enregistré'), 'Bonjour ' + sub.name + ',\n\n' + (sub.paid ? 'Votre abonnement est actif du ' + frDate(sub.start) + ' au ' + frDate(sub.end) + ' : ' + sub.perWeek + ' coupe par semaine. Réservez en ligne avec cet e-mail, la coupe est incluse.' : 'Votre abonnement est enregistré. Il s’active dès le règlement de ' + money(sub.price) + ' au salon.') + sign);
    save();
    return { sub };
  }

  /* Fichier calendrier (.ics) */
  function ics(a) {
    const f = (d, t) => d.replace(/-/g, '') + 'T' + t.replace(':', '') + '00', end = hhmm(mins(a.start) + a.dur);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maison Blade//FR', 'BEGIN:VEVENT', 'UID:' + a.id + '@maison-blade', 'DTSTAMP:' + f(today(), '00:00'), 'DTSTART:' + f(a.date, a.start), 'DTEND:' + f(a.date, end),
      'SUMMARY:' + a.serviceName + ' · ' + (CFG.name || ''), 'LOCATION:' + (CFG.address || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  load();
  window.Barber = {
    CFG, get data() { return D; }, save, reset() { D = seed(); save(); }, onChange: f => listeners.push(f),
    esc, money, ymd, parse, addDays, today, mins, hhmm, norm, uid, frDate, DAYS, weekStart,
    openDays, slotsFor, eligible, activeSub, subUsed, loyalty, quote, book, setStatus, remove, activate, buySub, sendMail, mailRemind, ics
  };
})();
