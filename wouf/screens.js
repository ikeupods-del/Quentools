'use strict';
/* Wouf — écrans principaux : chiens, accueil, carnet, suivi (poids, traitements, journal). */

const UI = { carnet: 'all', suivi: 'poids', journal: 'all' };
const ACT = {};   // actions déclenchées par data-act
const ROUTES = {};

/* ---------- Bandeau du haut ---------- */
function avatar(d, cls = '') {
  return d && d.photo ? `<img class="av ${cls}" src="${d.photo}" alt="">` : `<span class="av ${cls} ph">${spOf(d).emoji}</span>`;
}
function renderTop() {
  const d = dog();
  $('#top').innerHTML = `<div class="top-in"><a class="brand" href="#/home"><svg viewBox="0 0 64 64" width="26" height="26" aria-hidden="true"><use href="#paw"/></svg><span>Wouf</span></a>
    ${subActive() ? '' : '<a class="plusbtn" href="#/abo">⭐ Wouf+</a>'}
    ${WALK.on && routeName() !== 'balade' ? '<a class="walkpill" href="#/balade">🦮 En balade</a>' : ''}
    ${d ? `<button class="dogchip" data-act="dogs">${avatar(d, 'sm')}<span>${esc(d.name)}</span><i>▾</i></button>` : ''}</div>`;
}

/* ---------- Animaux (chiens et chats) ---------- */
function dogFields(d = {}, isNew = false) {
  return [
    ...(isNew ? [{ n: 'species', l: 'Espèce', t: 'select', v: d.species || 'dog', opts: [['dog', '🐶 Chien'], ['cat', '🐱 Chat']] }] : []),
    { n: 'name', l: 'Nom', v: d.name, req: true, ph: 'Ex. Nala' },
    { n: 'photo', l: 'Photo', t: 'file', hint: d.photo ? 'Laisser vide pour conserver la photo actuelle' : '' },
    { n: 'breed', l: 'Race', v: d.breed, list: (d.species || 'dog') === 'cat' ? 'breeds_cat' : 'breeds', ph: 'Tapez pour chercher (ou « Croisé »)', hint: 'Utilisée pour le poids idéal, les risques de santé et l’estimation d’assurance.' },
    { n: 'sex', l: 'Sexe', t: 'select', v: d.sex || 'F', opts: [['F', 'Femelle'], ['M', 'Mâle']] },
    { n: 'neutered', l: 'Stérilisé(e) / castré(e)', t: 'checkbox', v: d.neutered },
    { n: 'birth', l: 'Date de naissance', t: 'date', v: d.birth, max: today(), hint: 'Approximative si inconnue.' },
    { n: 'chip', l: 'N° de puce / tatouage', v: d.chip, ph: '250…' },
    { n: 'color', l: 'Robe / signes distinctifs', v: d.color },
    { n: 'allergies', l: 'Allergies, maladies connues', t: 'textarea', v: d.allergies },
    { n: 'idealMin', l: 'Poids idéal min. (kg) — facultatif', t: 'number', v: d.idealMin, cls: 'half' },
    { n: 'idealMax', l: 'Poids idéal max. (kg)', t: 'number', v: d.idealMax, cls: 'half' },
    { n: 'vetName', l: 'Vétérinaire habituel', v: d.vetName },
    { n: 'vetPhone', l: 'Téléphone du vétérinaire', t: 'tel', v: d.vetPhone },
    { n: 'insurer', l: 'Assurance santé (facultatif)', v: (d.insurance || {}).insurer, ph: 'Nom de l’assureur', cls: 'half' },
    { n: 'renewal', l: 'Renouvellement du contrat', t: 'date', v: (d.insurance || {}).renewal, cls: 'half', hint: 'Wouf vous rappelle l’échéance.' }
  ];
}
async function saveDog(v, existing) {
  const d = existing || { id: uid(), createdAt: today(), insurance: {}, species: v.species || 'dog' };
  const photo = v.photo ? await squarePhoto(v.photo) : d.photo;
  Object.assign(d, { name: v.name, breed: v.breed, sex: v.sex, neutered: v.neutered, birth: v.birth, chip: v.chip, color: v.color, allergies: v.allergies, idealMin: v.idealMin, idealMax: v.idealMax, vetName: v.vetName, vetPhone: v.vetPhone, insurance: { ...(d.insurance || {}), insurer: v.insurer, renewal: v.renewal }, photo });
  if (!existing) { S.dogs.push(d); track('animal-ajoute-' + (d.species === 'cat' ? 'chat' : 'chien'), true); }
  return d;
}
function newDog(first) {
  if (!first && !canAddAnyPet()) return paywall('multiDogs');
  const f = dogFields({}, true); f.splice(4, 0, { n: 'weight', l: 'Poids actuel (kg)', t: 'number' });
  openForm({
    title: first ? 'Bienvenue ! Présentez votre compagnon' : 'Ajouter un animal', fields: f, submit: first ? 'C’est parti 🐾' : 'Ajouter',
    intro: first ? '' : '<p class="mut small">Formule gratuite : 1 chien et 1 chat. Avec Wouf Plus : autant d’animaux que vous voulez.</p>',
    mount(form) {
      const sync = () => { const cat = form.species.value === 'cat'; form.breed.setAttribute('list', cat ? 'breeds_cat' : 'breeds'); form.breed.placeholder = cat ? 'Tapez pour chercher (ou « Européen »)' : 'Tapez pour chercher (ou « Croisé »)'; };
      form.species.onchange = sync;
    },
    async onSubmit(v) {
      if (!first && !canAddPet(v.species)) { paywall('multiDogs'); return false; }
      const d = await saveDog(v); S.current = d.id;
      if (v.weight) S.weights.push({ id: uid(), dogId: d.id, date: today(), kg: v.weight });
      save(); toast(d.name + ' est ajouté(e) !'); render();
      if (d.birth && diffDays(today(), d.birth) < 400) setTimeout(() => { location.hash = '#/plan'; }, 300);
    }
  });
}
function editDog(id) {
  const d = S.dogs.find(x => x.id === id);
  openForm({
    title: 'Fiche de ' + d.name, fields: dogFields(d),
    async onSubmit(v) { await saveDog(v, d); save(); render(); },
    onDelete: async () => {
      const ids = S.docs.filter(x => x.dogId === d.id).map(x => x.id); for (const f of ids) await fdel(f).catch(() => {});
      S.dogs = S.dogs.filter(x => x.id !== d.id); if (S.edu) delete S.edu[d.id];
      for (const k of ['events', 'weights', 'meds', 'journal', 'expenses', 'docs', 'walks']) S[k] = S[k].filter(x => x.dogId !== d.id);
      S.current = (S.dogs[0] || {}).id || null; save(); render(); toast('Fiche supprimée');
    }
  });
}
ACT.dogs = () => {
  const el = sheet(`<div class="sheet-head"><h2>Mes animaux</h2><button class="x" data-close>✕</button></div>
    <div class="list">${S.dogs.map(d => `<div class="row ${d.id === dog().id ? 'sel' : ''}"><button class="row-main" data-act="pick-dog" data-id="${d.id}">${avatar(d)}<span class="grow"><b>${esc(d.name)}</b><small>${esc(d.breed || 'Race non renseignée')} · ${esc(ageText(d.birth))}</small></span></button><button class="btn sm" data-act="edit-dog" data-id="${d.id}">Modifier</button></div>`).join('')}</div>
    <div class="form-actions"><button class="btn primary" data-act="new-dog">＋ Ajouter un animal${!canAddAnyPet() ? ' <span class="pill plus">Plus</span>' : ''}</button></div>`);
  el.addEventListener('click', e => { if (e.target.closest('[data-act]')) closeSheet(el); });
};
ACT['pick-dog'] = ({ id }) => { S.current = id; save(); render(); };
ACT['edit-dog'] = ({ id }) => setTimeout(() => editDog(id), 50);
ACT['new-dog'] = () => setTimeout(() => newDog(false), 50);

function welcome() {
  return `<section class="welcome"><div class="hero-paw"><svg viewBox="0 0 64 64" width="88" height="88"><use href="#paw"/></svg></div>
    <h1>Le carnet de santé de votre chien ou chat, dans votre poche</h1>
    <p>Vaccins, vermifuges, poids, traitements, dépenses, vétérinaires de garde, comparateur de croquettes… Tout au même endroit, sans compte à créer.</p>
    <button class="btn primary big" data-act="first-dog">Ajouter mon compagnon 🐶🐱</button>
    <ul class="feat"><li>💉 Rappels automatiques</li><li>🚨 Vétos ouverts près de vous</li><li>🥣 Comparateur de croquettes</li><li>📈 Courbe de poids</li><li>🔒 Données sur votre téléphone</li></ul>
    <button class="btn big" data-act="g-signin"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg> Continuer avec Google (retrouver mes données)</button>
    <p><a class="btn" href="#/test">🧠 Test express : dangereux ou OK pour mon animal ?</a></p>
    <p class="mut"><a href="#/sauvegarde">J’ai un fichier de sauvegarde à restaurer</a></p></section>`;
}
ACT['first-dog'] = () => newDog(true);

/* ---------- Accueil ---------- */
ROUTES.home = function home() {
  const d = dog(), rem = reminders(d.id), late = rem.filter(r => r.days < 0), soon = rem.filter(r => r.days >= 0 && r.days <= 30), miss = missing(d);
  const sc = score(d), lw = lastWeight(d.id), ws = weightStatus(d), ha = humanAgeOf(d), meds = medsToday(d.id);
  const bd = d.birth ? (() => { const b = parseD(d.birth), n = new Date(); let nx = new Date(n.getFullYear(), b.getMonth(), b.getDate()); if (nx < parseD(today())) nx.setFullYear(n.getFullYear() + 1); return diffDays(iso(nx), today()); })() : null;
  const R = 34, C = 2 * Math.PI * R, ring = `<svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="${R}" class="trk"/><circle cx="40" cy="40" r="${R}" class="val ${sc.total >= 80 ? 'ok' : sc.total >= 50 ? 'warn' : 'bad'}" stroke-dasharray="${(C * sc.total / 100).toFixed(1)} ${C.toFixed(1)}"/><text x="40" y="46" text-anchor="middle">${sc.total}</text></svg>`;
  const backupOld = S.settings.lastBackup ? diffDays(today(), S.settings.lastBackup) > 45 : S.events.length + S.weights.length > 5 && diffDays(today(), S.installedAt) > 14;
  const tips = tipsOf(d), ti = (Math.floor(Date.now() / 864e5) + (HOME.tip || 0)) % tips.length;
  const todo = late.concat(soon), more = Math.max(0, todo.length + miss.length - 3);
  const band = r => { const cls = r.days < 0 ? 'bad' : r.days <= 14 ? 'warn' : 'ok'; return `<div class="band lv-${cls}"><span class="ico">${r.icon}</span><span class="grow"><b>${esc(r.title)}</b><small>${dueText(r.days)}</small></span>${r.kind === 'event' ? `<button class="btn xs primary" data-act="renew" data-id="${r.ev.id}">Fait ✓</button>` : `<button class="btn xs" data-act="edit-dog" data-id="${r.dogId}">Modifier</button>`}</div>`; };
  const mband = m => `<div class="band lv-warn"><span class="ico">${TYPES[m.type].icon}</span><span class="grow"><b>${m.msg}</b><small>Date manquante</small></span><button class="btn xs" data-act="add-event" data-type="${m.type}">Ajouter</button></div>`;
  const rows = todo.map(band).concat(miss.map(mband));
  return `
  <section class="tipbar"><span class="ico">💡</span><p><b>Le saviez-vous ?</b> ${esc(tips[ti])}</p><button class="btn xs" data-act="tip-next" aria-label="Autre astuce">↻</button></section>

  <section class="card hero hero-c"><button class="hero-av" data-act="edit-dog" data-id="${d.id}" aria-label="Modifier la fiche">${avatar(d, 'xl')}</button>
    <div class="hero-txt"><h1>${esc(d.name)}</h1><p class="mut small">${esc(d.breed || 'Race non renseignée')}${d.sex ? ' · ' + (d.sex === 'F' ? 'Femelle' : 'Mâle') : ''} · ${esc(ageText(d.birth))}${ha ? ` · ≈ ${ha} ans humains` : ''}</p>
    <button class="lnk" data-act="pet-card" data-id="${d.id}">📸 Partager sa carte</button>
    ${bd !== null && bd <= 30 ? `<p class="bday">🎂 ${bd === 0 ? 'C’est son anniversaire aujourd’hui !' : 'Anniversaire dans ' + bd + ' j'}</p>` : ''}</div></section>

  <section class="card compact"><div class="card-h"><h2>À faire</h2><a class="lnk" href="#/carnet">Carnet →</a></div>
    ${rows.length ? rows.slice(0, 3).join('') + (more ? `<details class="acc-in"><summary><small>Voir ${more} de plus</small></summary>${rows.slice(3).join('')}</details>` : '')
      : `<div class="band lv-ok"><span class="ico">✅</span><span class="grow"><b>Tout est à jour</b><small>${rem[0] ? `Prochaine échéance : ${esc(rem[0].title)} ${dueText(rem[0].days)}` : 'Aucun rappel en attente'}</small></span></div>`}</section>

  ${meteoHome(d)}

  ${meds.length ? `<section class="card compact"><div class="card-h"><h2>Traitements du jour</h2><a class="lnk" href="#/suivi" data-act="tab-suivi" data-tab="soins">Gérer →</a></div>${meds.map(medRow).join('')}</section>` : ''}

  <section class="wgrid">
    <details class="card wdg" id="w-score"><summary><span class="wring">${ring}</span><span class="grow"><b>Suivi santé</b><small>${sc.total >= 80 ? 'Excellent' : sc.total >= 50 ? 'À améliorer' : 'À reprendre'}</small></span></summary>
      <ul class="wl">${sc.parts.map(p => `<li><span class="dot ${p[2] >= 1 ? 'ok' : p[2] > 0 ? 'warn' : 'bad'}"></span>${p[0]}</li>`).join('')}</ul>
      ${sc.tips.length ? `<p class="mut small">${sc.tips.slice(0, 2).join(' · ')}</p>` : '<p class="okmsg small">Suivi exemplaire, bravo 👏</p>'}</details>
    <details class="card wdg" id="w-weight"><summary><span class="wico">⚖️</span><span class="grow"><b>${lw ? fmtKg(lw.kg) : 'Poids'}</b><small class="${ws ? ws.cls : ''}">${ws ? esc(ws.txt) : lw ? 'Pesé il y a ' + Math.max(0, diffDays(today(), lw.date)) + ' j' : 'Aucune pesée'}</small></span></summary>
      ${dogWeights(d.id).length > 1 ? lineChart(dogWeights(d.id).map(w => ({ x: w.date, y: w.kg })), { band: idealBand(d), unit: 'kg', height: 120 }) : `<p class="mut small">${lw ? 'Ajoutez une nouvelle pesée pour voir la courbe.' : 'Aucune pesée enregistrée.'}</p>`}
      <button class="btn sm" data-act="add-weight">＋ Peser</button></details>
  </section>
  ${seniorCard(d)}

  <section class="card qrow" aria-label="Ajouter rapidement">
    <button data-act="add-event" data-type="vaccine"><span>💉</span>Vaccin</button>
    <button data-act="add-event" data-type="parasite"><span>🦟</span>Antipuces</button>
    <button data-act="add-event" data-type="visit"><span>🩺</span>Consult.</button>
    <button data-act="add-expense"><span>💶</span>Dépense</button>
    <button data-act="add-weight"><span>⚖️</span>Poids</button>
    <a href="#/triage"><span>🚑</span>Que faire ?</a>
    <a href="#/guides"><span>📚</span>E-books</a>
    <a href="#/noms"><span>🏷️</span>Noms</a>
  </section>
  ${homeEbooks(d)}

  ${backupOld ? `<section class="card note compact"><b>💾 Pensez à sauvegarder</b> <a class="btn xs" href="#/sauvegarde">Sauvegarder</a></section>` : ''}
  ${(() => { const nx = nextLesson(d), es = eduStats(d); return nx ? `<a class="card banner edu-banner" href="#/seance?id=${nx.id}"><b>🎓 Séance du jour : ${nx.icon} ${esc(nx.title)}</b><span>${es.streak ? '🔥 ' + es.streak + ' j d’affilée · ' : ''}2 à 5 minutes →</span></a>` : ''; })()}
  ${spOf(d).id === 'dog' ? `<a class="card banner" href="#/balade"><b>🦮 Balades ${allowed('tracker') ? '' : '<span class="pill plus">Plus</span>'}</b><span>${allowed('tracker') ? (() => { const m = walkMinutes(walksOn(d.id, today())), g = dailyGoal(d); return m + ' / ' + g + ' min aujourd’hui →'; })() : 'Suivi GPS, tracé et objectif du jour →'}</span></a>` : ''}
  ${subActive() ? '' : `<section class="card plus-cta compact"><div><b>⭐ Wouf+ · ${esc(planLine())}</b><small>${BILL.enabled ? 'Leçons, GPS, bilan santé, guides, assistance prioritaire' : 'Offert pendant le lancement : tout est débloqué'}</small></div><button class="btn primary sm" data-act="subscribe">${BILL.enabled ? 'Souscrire' : 'Découvrir'}</button></section>`}
  <section class="card don-card compact"><div><b>❤️ Aider les animaux sans famille</b><small>Don à ${esc(donation().name)}, sur le site officiel.</small></div><a class="btn sm" href="${esc(donation().url)}" target="_blank" rel="noopener noreferrer">Faire un don</a></section>`;
};
const HOME = { tip: 0, eb: false, sen: false };
ACT['tip-next'] = () => { HOME.tip++; render(true); };
ACT.renew = ({ id }) => {
  const ev = S.events.find(e => e.id === id), gap = ev.next ? diffDays(ev.next, ev.date) : 0;
  eventForm({ ...ev, id: null, date: today(), next: gap > 0 ? addDays(today(), gap) : '', cost: '', notes: '' }, false);
};
ACT['add-event'] = ({ type }) => eventForm({ type: type || 'vaccine', date: today() }, false);

/* ---------- Carnet ---------- */
function eventForm(ev = {}, editing = false) {
  const d = dog(), t0 = ev.type || 'vaccine';
  const presets = t => presetsFor(t, d).map(p => `<option value="${esc(p[0])}">`).join('');
  const el = openForm({
    title: editing ? 'Modifier' : 'Ajouter au carnet',
    fields: [
      { n: 'type', l: 'Type', t: 'select', v: t0, opts: Object.entries(TYPES).map(([k, v]) => [k, v.icon + ' ' + v.label]) },
      { n: 'title', l: 'Intitulé', v: ev.title || '', req: true, list: 'dl_ev', ph: 'Choisissez ou saisissez' },
      { n: 'date', l: 'Date', t: 'date', v: ev.date || today(), req: true, cls: 'half' },
      { n: 'next', l: 'Prochain rappel', t: 'date', v: ev.next || '', cls: 'half' },
      { n: 'product', l: 'Produit / lot', v: ev.product, ph: 'Nom du produit, n° de lot' },
      { n: 'vet', l: 'Vétérinaire / clinique', v: ev.vet ?? d.vetName ?? '' },
      { n: 'cost', l: 'Coût (€)', t: 'number', v: ev.cost || '', min: 0 },
      { n: 'notes', l: 'Notes', t: 'textarea', v: ev.notes }
    ],
    extra: '<datalist id="dl_ev"></datalist>',
    onSubmit(v) {
      const rec = { id: editing ? ev.id : uid(), dogId: d.id, type: v.type, title: v.title, date: v.date, next: v.next, product: v.product, vet: v.vet, cost: v.cost || 0, notes: v.notes };
      if (editing) S.events[S.events.findIndex(e => e.id === ev.id)] = rec; else S.events.push(rec);
      save(); toast('Enregistré ✓'); render();
    },
    onDelete: editing ? () => { S.events = S.events.filter(e => e.id !== ev.id); save(); render(); } : null,
    mount(form) {
      const dl = $('#dl_ev', form); let auto = !ev.next;
      const daysFor = () => { const p = presetsFor(form.type.value, d).find(x => x[0] === form.title.value); return p ? p[1] : null; };
      const sync = () => { const n = daysFor(); if (auto && n && form.date.value) form.next.value = addDays(form.date.value, n); };
      const fill = () => { dl.innerHTML = presets(form.type.value); };
      fill();
      form.type.onchange = () => { fill(); if (!editing) form.title.value = ''; };
      form.title.oninput = sync; form.date.oninput = sync; form.next.oninput = () => { auto = false; };
      if (!editing && !ev.title) { const first = presetsFor(t0, d)[0]; if (first) { form.title.value = first[0]; sync(); } }
    }
  });
  return el;
}
ACT['edit-event'] = ({ id }) => eventForm(S.events.find(e => e.id === id), true);
ROUTES.carnet = function carnet() {
  const d = dog(), f = UI.carnet, evs = dogEvents(d.id).filter(e => f === 'all' || e.type === f);
  const young = d.birth && diffDays(today(), d.birth) < 400;
  return `<div class="page-h"><h1>Carnet de santé</h1><button class="btn primary sm" data-act="add-event" data-type="vaccine">＋ Ajouter</button></div>
  <div class="chips scroll">${[['all', 'Tout']].concat(Object.entries(TYPES).map(([k, v]) => [k, v.icon + ' ' + v.label])).map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="carnet-f" data-f="${k}">${l}</button>`).join('')}</div>
  ${young ? `<a class="card banner" href="#/plan"><b>${spOf(d).emoji} ${spOf(d).planTitle}</b><span>Calendrier vaccins et vermifuges de ${esc(d.name)} →</span></a>` : ''}
  <div class="list card">${evs.length ? evs.map(e => `<button class="row" data-act="edit-event" data-id="${e.id}"><span class="ico">${TYPES[e.type].icon}</span><span class="grow"><b>${esc(e.title)}</b><small>${fmtDate(e.date)}${e.vet ? ' · ' + esc(e.vet) : ''}${e.product ? ' · ' + esc(e.product) : ''}</small></span>
    <span class="side">${e.cost ? fmtMoney(e.cost) : ''}${e.next ? `<small class="${diffDays(e.next, today()) < 0 ? 'bad' : ''}">↻ ${fmtDate(e.next)}</small>` : ''}</span></button>`).join('') : '<p class="empty">Rien pour l’instant. Ajoutez le dernier vaccin ou vermifuge : Wouf calcule les rappels.</p>'}</div>
  <div class="actions-row"><button class="btn" data-act="report">📄 Fiche pour le véto (PDF)${!allowed('report') ? ' <span class="pill plus">Plus</span>' : ''}</button>
  <button class="btn" data-act="ics">📅 Ajouter les rappels à mon agenda${!allowed('calendar') ? ' <span class="pill plus">Plus</span>' : ''}</button></div>`;
};
ACT['carnet-f'] = ({ f }) => { UI.carnet = f; render(true); };

/* Plan chiot */
ROUTES.plan = function plan() {
  const d = dog();
  if (!d.birth) return `<div class="page-h"><h1>${spOf(d).planTitle}</h1></div><p class="empty">Renseignez la date de naissance de ${esc(d.name)} pour obtenir son calendrier.</p><button class="btn primary" data-act="edit-dog" data-id="${d.id}">Modifier la fiche</button>`;
  const P = puppyPlan(d);
  return `<div class="page-h"><a class="back" href="#/carnet">‹</a><h1>${spOf(d).planTitle} de ${esc(d.name)}</h1></div>
  <p class="mut">Calendrier indicatif : votre vétérinaire adapte le protocole selon le vaccin, la race et le risque. Marquez chaque étape faite pour alimenter le carnet et les rappels.</p>
  <div class="list card">${P.map((p, i) => { const dd = diffDays(p.date, today()); return `<div class="row ${p.done ? 'done' : ''}"><span class="ico">${TYPES[p.type].icon}</span><span class="grow"><b>${esc(p.label)}</b><small class="${!p.done && dd < 0 ? 'bad' : ''}">${p.w} sem. · ${fmtDate(p.date)}${p.done ? '' : ' · ' + dueText(dd)}</small></span>
    ${p.done ? '<span class="pill ok">Fait</span>' : `<button class="btn sm" data-act="plan-done" data-i="${i}">Fait ✓</button>`}</div>`; }).join('')}</div>
  <p class="mut">Identification par puce électronique obligatoire avant toute cession ; déclaration au fichier I-CAD.</p>`;
};
ACT['plan-done'] = ({ i }) => {
  const d = dog(), p = puppyPlan(d)[+i], pre = (presetsFor(p.type, d).find(x => x[0] === p.title) || [])[1];
  const date = diffDays(p.date, today()) > 0 ? today() : p.date;
  eventForm({ type: p.type, title: p.title, date, next: pre ? addDays(date, pre) : '' }, false);
};

/* ---------- Suivi : poids / traitements / journal ---------- */
function weightForm(w = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier la pesée' : 'Nouvelle pesée', submit: 'Enregistrer',
    fields: [{ n: 'kg', l: 'Poids (kg)', t: 'number', v: w.kg, req: true, min: 0 }, { n: 'date', l: 'Date', t: 'date', v: w.date || today(), req: true }],
    onSubmit(v) {
      const rec = { id: editing ? w.id : uid(), dogId: dog().id, date: v.date, kg: v.kg };
      if (editing) S.weights[S.weights.findIndex(x => x.id === w.id)] = rec; else S.weights.push(rec);
      save(); render(); toast('Pesée enregistrée ✓');
    },
    onDelete: editing ? () => { S.weights = S.weights.filter(x => x.id !== w.id); save(); render(); } : null
  });
}
ACT['add-weight'] = () => weightForm();
ACT['edit-weight'] = ({ id }) => weightForm(S.weights.find(w => w.id === id), true);

function medForm(m = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier le traitement' : 'Nouveau traitement',
    fields: [
      { n: 'name', l: 'Médicament / traitement', v: m.name, req: true },
      { n: 'dose', l: 'Dose', v: m.dose, ph: 'Ex. 1 comprimé, 5 ml' },
      { n: 'slots', l: 'Moments de prise', t: 'multi', v: m.slots || ['m'], opts: SLOTS.map(s => [s[0], s[1]]) },
      { n: 'start', l: 'Début', t: 'date', v: m.start || today(), req: true, cls: 'half' },
      { n: 'end', l: 'Fin (facultatif)', t: 'date', v: m.end, cls: 'half' },
      { n: 'notes', l: 'Notes', t: 'textarea', v: m.notes, ph: 'Avec le repas, à jeun…' }
    ],
    onSubmit(v) {
      if (!v.slots.length) { toast('Choisissez au moins un moment de prise'); return false; }
      const rec = { id: editing ? m.id : uid(), dogId: dog().id, ...v };
      if (editing) S.meds[S.meds.findIndex(x => x.id === m.id)] = rec; else S.meds.push(rec);
      save(); render(); toast('Traitement enregistré ✓');
    },
    onDelete: editing ? () => { S.meds = S.meds.filter(x => x.id !== m.id); save(); render(); } : null
  });
}
ACT['add-med'] = () => medForm();
ACT['edit-med'] = ({ id }) => medForm(S.meds.find(m => m.id === id), true);
function medRow(x) {
  return `<label class="row check ${x.done ? 'done' : ''}"><input type="checkbox" data-act="med-tick" data-key="${x.key}" ${x.done ? 'checked' : ''}><span class="grow"><b>${esc(x.m.name)}</b><small>${esc(SLOTS.find(s => s[0] === x.slot)[1])}${x.m.dose ? ' · ' + esc(x.m.dose) : ''}</small></span></label>`;
}
document.addEventListener('change', e => { const t = e.target.closest('[data-act="med-tick"]'); if (t) { if (t.checked) S.medLog[t.dataset.key] = 1; else delete S.medLog[t.dataset.key]; save(); render(true); } });

const JKINDS = [['symptom', '🤒 Symptôme'], ['appetite', '🍽️ Appétit / soif'], ['stool', '💩 Selles / urine'], ['behavior', '🧠 Comportement'], ['activity', '🦮 Activité'], ['other', '📝 Autre']];
function journalForm(j = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier la note' : 'Nouvelle note de santé',
    fields: [
      { n: 'kind', l: 'Catégorie', t: 'select', v: j.kind || 'symptom', opts: JKINDS },
      { n: 'date', l: 'Date', t: 'date', v: j.date || today(), req: true, cls: 'half' },
      { n: 'sev', l: 'Gravité', t: 'select', v: j.sev || '1', opts: [['1', 'Léger'], ['2', 'À surveiller'], ['3', 'Inquiétant']], cls: 'half' },
      { n: 'text', l: 'Description', t: 'textarea', v: j.text, req: true, ph: 'Ex. vomit ce matin, boite de la patte avant droite…' }
    ],
    onSubmit(v) {
      const rec = { id: editing ? j.id : uid(), dogId: dog().id, ...v };
      if (editing) S.journal[S.journal.findIndex(x => x.id === j.id)] = rec; else S.journal.push(rec);
      save(); render(); toast('Note ajoutée ✓');
    },
    onDelete: editing ? () => { S.journal = S.journal.filter(x => x.id !== j.id); save(); render(); } : null
  });
}
ACT['add-journal'] = () => journalForm();
ACT['edit-journal'] = ({ id }) => journalForm(S.journal.find(j => j.id === id), true);

ROUTES.suivi = function suivi() {
  const d = dog(), tab = UI.suivi;
  const tabs = [['poids', '📈 Poids'], ['soins', '💊 Soins'], ['journal', '📓 Journal']];
  let body = '';
  if (tab === 'poids') {
    const ws = dogWeights(d.id), band = idealBand(d), st = weightStatus(d), b = dogBreed(d);
    body = `<section class="card"><div class="card-h"><h2>Courbe de poids</h2><button class="btn sm primary" data-act="add-weight">＋ Peser</button></div>
      ${ws.length > 1 ? lineChart(ws.map(w => ({ x: w.date, y: w.kg })), { band, unit: 'kg' }) : '<p class="empty">Ajoutez au moins deux pesées pour voir la courbe.</p>'}
      ${band ? `<p class="mut"><span class="swatch"></span> Fourchette adulte${b ? ' du ' + esc(b.name) : ''} : ${band[0]}–${band[1]} kg</p>` : ''}
      ${st ? `<p class="${st.cls}"><b>${st.txt}</b></p>` : ''}</section>
      <div class="list card">${ws.slice().reverse().map((w, i, a) => { const prev = a[i + 1], dl = prev ? Math.round((w.kg - prev.kg) * 100) / 100 : 0; return `<button class="row" data-act="edit-weight" data-id="${w.id}"><span class="ico">⚖️</span><span class="grow"><b>${fmtKg(w.kg)}</b><small>${fmtDate(w.date)}</small></span>${prev ? `<span class="side ${dl > 0 ? 'warn' : ''}">${dl > 0 ? '+' : ''}${dl.toLocaleString('fr-FR')} kg</span>` : ''}</button>`; }).join('') || '<p class="empty">Aucune pesée.</p>'}</div>`;
  } else if (tab === 'soins') {
    const act = S.meds.filter(m => m.dogId === d.id && medActive(m)), old = S.meds.filter(m => m.dogId === d.id && !medActive(m)), td = medsToday(d.id);
    body = `<section class="card"><div class="card-h"><h2>Aujourd’hui</h2><button class="btn sm primary" data-act="add-med">＋ Traitement</button></div>${td.length ? td.map(medRow).join('') : '<p class="empty">Aucune prise prévue aujourd’hui.</p>'}</section>
      ${act.length ? `<section class="card"><h2>En cours</h2>${act.map(m => `<button class="row" data-act="edit-med" data-id="${m.id}"><span class="ico">💊</span><span class="grow"><b>${esc(m.name)}</b><small>${m.slots.map(s => SLOTS.find(x => x[0] === s)[1]).join(', ')}${m.dose ? ' · ' + esc(m.dose) : ''}${m.end ? ' · jusqu’au ' + fmtDate(m.end) : ''}</small></span></button>`).join('')}</section>` : ''}
      ${old.length ? `<section class="card"><h2>Terminés</h2>${old.map(m => `<button class="row done" data-act="edit-med" data-id="${m.id}"><span class="ico">💊</span><span class="grow"><b>${esc(m.name)}</b><small>${fmtDate(m.start)} → ${m.end ? fmtDate(m.end) : '—'}</small></span></button>`).join('')}</section>` : ''}`;
  } else {
    const all = S.journal.filter(j => j.dogId === d.id).sort((a, b) => b.date.localeCompare(a.date)), f = UI.journal, js = all.filter(j => f === 'all' || j.kind === f);
    const recent = all.filter(j => j.kind === 'symptom' && diffDays(today(), j.date) <= 7).length, high = all.some(j => j.sev === '3' && diffDays(today(), j.date) <= 3);
    body = `<div class="page-sub"><button class="btn sm primary" data-act="add-journal">＋ Note</button></div>
      ${recent >= 3 || high ? `<section class="card warnbox"><b>⚠️ ${high ? 'Un symptôme inquiétant a été noté récemment.' : recent + ' symptômes notés cette semaine.'}</b><p>Si cela persiste, prenez rendez-vous avec votre vétérinaire.</p></section>` : ''}
      <div class="chips scroll">${[['all', 'Tout']].concat(JKINDS).map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="journal-f" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="list card">${js.map(j => `<button class="row" data-act="edit-journal" data-id="${j.id}"><span class="ico">${(JKINDS.find(k => k[0] === j.kind) || ['', '📝'])[1].split(' ')[0]}</span><span class="grow"><b>${esc(j.text)}</b><small>${fmtDate(j.date)}</small></span><span class="dot ${['', 'ok', 'warn', 'bad'][j.sev]}"></span></button>`).join('') || '<p class="empty">Aucune note. Notez symptômes, changements d’appétit ou de comportement : très utile pour le vétérinaire.</p>'}</div>`;
  }
  return `<div class="page-h"><h1>Suivi</h1></div><div class="seg">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab-suivi" data-tab="${k}">${l}</button>`).join('')}<a href="#/balade">🦮 Balades</a></div>${body}`;
};
ACT['tab-suivi'] = ({ tab }) => { UI.suivi = tab; if (location.hash !== '#/suivi') location.hash = '#/suivi'; else render(true); };
ACT['journal-f'] = ({ f }) => { UI.journal = f; render(true); };
