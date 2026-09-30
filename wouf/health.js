'use strict';
/* Wouf — logique santé : rappels, score de suivi, plan chiot, poids, calendrier. */

const dogEvents = id => S.events.filter(e => e.dogId === id).sort((a, b) => b.date.localeCompare(a.date));
const dogWeights = id => S.weights.filter(w => w.dogId === id).sort((a, b) => a.date.localeCompare(b.date));
const lastWeight = id => { const w = dogWeights(id); return w.length ? w[w.length - 1] : null; };
const dogBreed = d => breedOf(d.breed);
const dogSize = d => spOf(d).id === 'cat' ? 'CAT' : ((dogBreed(d) || {}).size || d.size || 'M');

/* Rappels : le dernier événement de chaque « série » (type + titre) porte la prochaine échéance. */
function reminders(id) {
  const d = S.dogs.find(x => x.id === id), seen = new Set(), out = [];
  for (const e of dogEvents(id)) {
    const k = e.type + '|' + (e.title || '').toLowerCase();
    if (seen.has(k)) continue; seen.add(k);
    if (e.next) out.push({ kind: 'event', ev: e, title: e.title, icon: TYPES[e.type].icon, due: e.next, days: diffDays(e.next, today()) });
  }
  if (d && d.insurance && d.insurance.renewal) out.push({ kind: 'insurance', dogId: id, title: 'Renouvellement assurance' + (d.insurance.insurer ? ' – ' + d.insurance.insurer : ''), icon: '🛡️', due: d.insurance.renewal, days: diffDays(d.insurance.renewal, today()) });
  return out.sort((a, b) => a.days - b.days);
}
function missing(d) {
  if (!d.birth || diffDays(today(), d.birth) < 56) return [];
  const has = t => S.events.some(e => e.dogId === d.id && e.type === t);
  return [['vaccine', 'Aucun vaccin enregistré'], ['parasite', 'Aucun antipuces / tiques enregistré'], ['worm', 'Aucun vermifuge enregistré']].filter(([t]) => !has(t)).map(([t, msg]) => ({ type: t, msg }));
}
const dueText = days => days < 0 ? `en retard de ${-days} j` : days === 0 ? 'aujourd’hui' : days === 1 ? 'demain' : days < 60 ? `dans ${days} j` : `dans ${Math.round(days / 30.4)} mois`;

/* Score de suivi (0-100) */
function score(d) {
  const rem = reminders(d.id).filter(r => r.kind === 'event');
  const evs = dogEvents(d.id);
  const st = t => {
    const rs = rem.filter(r => r.ev.type === t);
    if (!rs.length) return evs.some(e => e.type === t) ? 0.7 : 0;
    const worst = Math.min(...rs.map(r => r.days));
    return worst < 0 ? 0 : worst <= 14 ? 0.85 : 1;
  };
  const lw = lastWeight(d.id), wAge = lw ? diffDays(today(), lw.date) : 9999;
  const visit = evs.some(e => ['visit', 'vaccine', 'surgery', 'dental'].includes(e.type) && diffDays(today(), e.date) <= 400);
  const parts = [
    ['Vaccins', 40, st('vaccine'), 'Vaccins à renouveler ou à enregistrer'],
    ['Antipuces / tiques', 20, st('parasite'), 'Antiparasitaire à renouveler'],
    ['Vermifuge', 15, st('worm'), 'Vermifuge à renouveler'],
    ['Pesée récente', 10, wAge <= 60 ? 1 : wAge <= 180 ? 0.5 : 0, 'Pesez votre ' + spOf(d).noun + ' (une fois par mois)'],
    ['Visite annuelle', 15, visit ? 1 : 0, 'Une visite chez le vétérinaire par an']
  ];
  return { total: Math.round(sum(parts.map(p => p[1] * p[2]))), parts, tips: parts.filter(p => p[2] < 1).map(p => p[3]) };
}

/* Poids idéal / situation */
function weightStatus(d) {
  const w = lastWeight(d.id), b = dogBreed(d);
  if (!w) return null;
  const m = d.birth ? ageMonths(d.birth) : 24;
  if (m < 12) return { txt: 'En croissance', cls: 'ok' };
  const [lo, hi] = d.idealMin && d.idealMax ? [d.idealMin, d.idealMax] : b ? b.w : [null, null];
  if (lo == null) return null;
  if (w.kg > hi * 1.1) return { txt: 'Au-dessus de la fourchette de la race', cls: 'bad' };
  if (w.kg > hi) return { txt: 'Un peu au-dessus de la fourchette', cls: 'warn' };
  if (w.kg < lo * 0.9) return { txt: 'En dessous de la fourchette de la race', cls: 'warn' };
  return { txt: 'Dans la fourchette de la race', cls: 'ok' };
}
const idealBand = d => d.idealMin && d.idealMax ? [d.idealMin, d.idealMax] : (dogBreed(d) ? dogBreed(d).w : null);
function lifeStage(d) {
  if (!d.birth) return '—';
  const y = ageYears(d.birth);
  return y < 1 ? spOf(d).young : y >= SENIOR_AGE[dogSize(d)] ? 'Senior' : 'Adulte';
}

/* Traitements du jour */
const SLOTS = [['m', 'Matin'], ['d', 'Midi'], ['s', 'Soir'], ['n', 'Coucher']];
const medActive = (m, on = today()) => m.start <= on && (!m.end || m.end >= on);
function medsToday(id) {
  const t = today(), out = [];
  for (const m of S.meds.filter(m => m.dogId === id && medActive(m, t))) for (const s of m.slots) out.push({ m, slot: s, key: `${m.id}|${t}|${s}`, done: !!S.medLog[`${m.id}|${t}|${s}`] });
  const order = SLOTS.map(s => s[0]);
  return out.sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
}

/* Dépenses : événements chiffrés + dépenses libres */
const EXPENSE_CATS = ['Vétérinaire', 'Alimentation', 'Assurance', 'Toilettage', 'Accessoires', 'Garde / pension', 'Éducation', 'Autre'];
function allExpenses(id) {
  const ev = S.events.filter(e => e.dogId === id && e.cost > 0).map(e => ({ id: e.id, date: e.date, cat: 'Vétérinaire', amount: e.cost, label: e.title, fromEvent: true, type: e.type }));
  const ex = S.expenses.filter(e => e.dogId === id).map(e => ({ ...e, fromEvent: false }));
  return ev.concat(ex).sort((a, b) => b.date.localeCompare(a.date));
}

/* Plan chiot / chaton : dates calculées depuis la naissance */
function puppyPlan(d) {
  const at = w => addDays(d.birth, w * 7), cat = spOf(d).id === 'cat', P = [], V = presetsFor('vaccine', d);
  const wormT = presetsFor('worm', d)[1][0], parT = presetsFor('parasite', d)[cat ? 1 : 1][0];
  [2, 4, 6, 8, 10, 12, 16, 20, 24].forEach(w => P.push({ w, type: 'worm', title: wormT, label: 'Vermifuge' }));
  if (cat) {
    P.push({ w: 8, type: 'vaccine', title: V[1][0], label: '1ʳᵉ injection typhus + coryza (+ leucose)' });
    P.push({ w: 12, type: 'vaccine', title: V[1][0], label: '2ᵉ injection typhus + coryza (+ leucose)' });
    P.push({ w: 12, type: 'vaccine', title: 'Rage', label: 'Rage (si voyage ou exigée, dès 12 semaines)' });
    P.push({ w: 26, type: 'visit', title: 'Visite de contrôle', label: 'Visite des 6 mois (croissance, dents, stérilisation)' });
    P.push({ w: 52, type: 'vaccine', title: V[1][0], label: 'Rappel des 1 an' });
  } else {
    P.push({ w: 8, type: 'vaccine', title: V[0][0], label: '1ʳᵉ injection CHPPiL' });
    P.push({ w: 12, type: 'vaccine', title: V[0][0], label: '2ᵉ injection CHPPiL' });
    P.push({ w: 12, type: 'vaccine', title: 'Rage', label: 'Rage (à partir de 12 semaines)' });
    P.push({ w: 16, type: 'vaccine', title: V[0][0], label: 'Rappel CHPPiL (si 3 injections)' });
    P.push({ w: 26, type: 'visit', title: 'Visite de contrôle', label: 'Visite des 6 mois (croissance, dents, stérilisation ?)' });
    P.push({ w: 52, type: 'vaccine', title: V[0][0], label: 'Rappel des 1 an' });
  }
  P.push({ w: 8, type: 'parasite', title: parT, label: 'Antipuces / tiques (dès 8 semaines selon produit)' });
  return P.sort((a, b) => a.w - b.w).map(p => ({ ...p, date: at(p.w), done: S.events.some(e => e.dogId === d.id && e.type === p.type && Math.abs(diffDays(e.date, at(p.w))) <= 21 && (p.type !== 'vaccine' || e.title === p.title)) }));
}

/* Calendrier .ics (rappels) */
function buildICS() {
  const icsEsc = s => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wouf//Carnet de sante//FR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Wouf'];
  for (const d of S.dogs) for (const r of reminders(d.id)) {
    const day = r.due.replace(/-/g, ''), end = addDays(r.due, 1).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${r.kind}-${r.ev ? r.ev.id : d.id}-${day}@wouf`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEsc('🐾 ' + d.name + ' – ' + r.title)}`, `DESCRIPTION:${icsEsc('Rappel Wouf pour ' + d.name)}`,
      'BEGIN:VALARM', 'TRIGGER:-P7D', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'END:VALARM',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Rappel', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/* Notification locale (quand l'app est ouverte) */
async function maybeNotify() {
  if (!S.settings.notif || !('Notification' in window) || Notification.permission !== 'granted' || S.settings.lastNotif === today() || !S.dogs.length) return;
  const items = [];
  for (const d of S.dogs) for (const r of reminders(d.id)) if (r.days <= 7) items.push(`${d.name} : ${r.title} (${dueText(r.days)})`);
  if (!items.length) return;
  S.settings.lastNotif = today(); save();
  const body = items.slice(0, 4).join('\n');
  try { const reg = await navigator.serviceWorker.getRegistration(); reg ? reg.showNotification('Wouf 🐾', { body, icon: 'icons/icon-192.png', tag: 'wouf-rappels' }) : new Notification('Wouf 🐾', { body }); } catch (e) { /* ignore */ }
}
