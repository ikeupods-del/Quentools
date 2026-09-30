'use strict';
/* Wouf — menu Plus, dépenses, documents, nutrition, race, chien perdu, fiche véto, sauvegarde, abonnement, réglages. */

/* ---------- Impression / PDF ---------- */
function printHTML(html) {
  const root = $('#print-root'); root.innerHTML = html;
  document.body.classList.add('printing');
  const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; removeEventListener('afterprint', done); };
  addEventListener('afterprint', done);
  setTimeout(() => window.print(), 250);
}

/* ---------- Menu Plus ---------- */
ROUTES.plus = function plusMenu() {
  if (CLOUD.user) ownerCheck(CLOUD.user.email);
  const quick = [['#/triage', '🩺', 'Que faire ?'], ['#/meteo', '🌦️', 'Météo balade'], ['#/recherche', '🔎', 'Rechercher'], ['#/noms', '🏷️', 'Trouver un nom']];
  const groups = [
    ['Santé', [
      ['#/bilan', '🧠', 'Bilan santé', 'Conseils personnalisés' + (allowed('bilan') ? '' : ' · Plus')],
      ['#/race', '🧬', 'Ma race et sa santé', 'Poids idéal, espérance de vie, risques'],
      ['#/guides', '📚', 'Guides', 'Erreurs à éviter, points d’attention' + (allowed('guides') ? '' : ' · Plus')],
      ['#/documents', '📎', 'Documents', 'Ordonnances, résultats, carte d’identification'],
      ['#/depenses', '💶', 'Dépenses', 'Budget vétérinaire, nourriture, accessoires']]],
    ['Éduquer et bouger', [
      ['#/educ', '🎓', 'Éducation', 'Leçons, séances guidées, programmes'],
      ['#/balade', '🦮', 'Balades GPS et pas', 'Distance, tracé, objectif du jour' + (allowed('tracker') ? '' : ' · Plus')]]],
    ['Alimentation', [
      ['#/croquettes', '🥣', 'Comparateur de croquettes', 'Le meilleur choix selon âge, race et activité'],
      ['#/nutrition', '🍖', 'Ration quotidienne', 'Calcul des calories et des grammes de croquettes']]],
    ['Pratique', [
      ['#/gardien', '🧳', 'Fiche gardien', 'Pour la personne qui garde votre animal' + (allowed('sitter') ? '' : ' · Plus')],
      ['#/perdu', '📣', 'Animal perdu', 'Affiche à imprimer et démarches'],
      ['#/sauvegarde', '💾', 'Sauvegarde', 'Exporter / restaurer (chiffrée)'],
      ['#/reglages', '⚙️', 'Réglages', 'Profil, notifications, installation']]],
    ['Wouf', [
      ['#/abo', '⭐', 'Wouf Plus', plus() && !BILL.enabled ? 'Toutes les fonctions sont gratuites pour le moment' : subActive() ? 'Actif à vie' : planLine() + ' · sans abonnement'],
      ['#/don', '❤️', 'Faire un don à la SPA', 'Aider les animaux sans famille'],
      ['#/support', '💬', 'Assistance', isPriority() ? 'Prioritaire ⭐' : 'FAQ et contact'],
      ['#/nouveautes', '🆕', 'Nouveautés', 'Version ' + (CFG.version || '')],
      ['#/legal', '⚖️', 'Informations légales', 'Mentions, CGV, confidentialité']]]
  ];
  const row = ([h, i, t, s]) => `<a class="row" href="${h}"><span class="ico">${i}</span><span class="grow"><b>${t}</b><small>${s}</small></span><span class="chev">›</span></a>`;
  return `<div class="page-h"><h1>Plus</h1></div>
  ${OWNER ? `<div class="list card menu"><a class="row" href="#/admin"><span class="ico">🛠️</span><span class="grow"><b>Administration</b><small>Comptes, Wouf Plus offert, ouverture de la vente</small></span><span class="chev">›</span></a></div>` : ''}
  <section class="grid4">${quick.map(([h, i, t]) => `<a class="tile sm" href="${h}"><span>${i}</span>${t}</a>`).join('')}</section>
  ${groups.map(([g, items]) => `<h2 class="grp">${g}</h2><div class="list card menu">${items.map(row).join('')}</div>`).join('')}
  <p class="mut center small">Wouf ${esc(CFG.version || '')} · Les informations de santé sont indicatives et ne remplacent pas l’avis d’un vétérinaire.</p>`;
};

/* ---------- Fiche véto (PDF) ---------- */
function reportHTML(d) {
  const evs = dogEvents(d.id), tbl = (rows, head) => rows.length ? `<table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p>—</p>';
  const lw = lastWeight(d.id);
  return `<h1>Carnet de santé de ${esc(d.name)}</h1><p class="mut">Édité le ${fmtDate(today())} avec Wouf</p>
  <table class="kv"><tr><th>Race</th><td>${esc(d.breed || '—')}</td><th>Sexe</th><td>${d.sex === 'F' ? 'Femelle' : 'Mâle'}${d.neutered ? ' stérilisé(e)' : ''}</td></tr>
  <tr><th>Naissance</th><td>${d.birth ? fmtDate(d.birth) + ' (' + esc(ageText(d.birth)) + ')' : '—'}</td><th>Poids</th><td>${lw ? fmtKg(lw.kg) : '—'}</td></tr>
  <tr><th>Puce</th><td>${esc(d.chip || '—')}</td><th>Robe</th><td>${esc(d.color || '—')}</td></tr>
  <tr><th>Allergies / maladies</th><td colspan="3">${esc(d.allergies || 'Aucune connue')}</td></tr>
  <tr><th>Propriétaire</th><td colspan="3">${esc(S.owner.name || '—')} ${esc(fmtPhone(S.owner.phone))}</td></tr></table>
  <h2>Vaccinations</h2>${tbl(evs.filter(e => e.type === 'vaccine').map(e => [fmtDate(e.date), esc(e.title), esc(e.product || ''), e.next ? fmtDate(e.next) : '']), ['Date', 'Vaccin', 'Produit / lot', 'Prochain rappel'])}
  <h2>Vermifuges et antiparasitaires</h2>${tbl(evs.filter(e => e.type === 'worm' || e.type === 'parasite').map(e => [fmtDate(e.date), esc(e.title), esc(e.product || ''), e.next ? fmtDate(e.next) : '']), ['Date', 'Traitement', 'Produit', 'Prochain'])}
  <h2>Consultations, chirurgies, soins</h2>${tbl(evs.filter(e => !ROUTINE_TYPES.includes(e.type)).map(e => [fmtDate(e.date), esc(e.title), esc(e.vet || ''), esc(e.notes || '')]), ['Date', 'Motif', 'Vétérinaire', 'Notes'])}
  <h2>Traitements en cours</h2>${tbl(S.meds.filter(m => m.dogId === d.id && medActive(m)).map(m => [esc(m.name), esc(m.dose || ''), m.slots.map(s => SLOTS.find(x => x[0] === s)[1]).join(', '), m.end ? 'jusqu’au ' + fmtDate(m.end) : 'en continu']), ['Médicament', 'Dose', 'Prises', 'Durée'])}
  <h2>Poids</h2>${tbl(dogWeights(d.id).slice(-12).reverse().map(w => [fmtDate(w.date), fmtKg(w.kg)]), ['Date', 'Poids'])}`;
}
ACT.report = () => gate('report', () => printHTML(reportHTML(dog())));
ACT.ics = () => gate('calendar', () => { download('wouf-rappels.ics', buildICS(), 'text/calendar'); toast('Ouvrez le fichier pour ajouter les rappels à votre agenda'); });

/* ---------- Dépenses ---------- */
const XP = { period: '12m' };
function expenseForm(x = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier la dépense' : 'Nouvelle dépense',
    fields: [
      { n: 'amount', l: 'Montant (€)', t: 'number', v: x.amount, req: true, min: 0 }, { n: 'cat', l: 'Catégorie', t: 'select', v: x.cat || 'Alimentation', opts: EXPENSE_CATS },
      { n: 'date', l: 'Date', t: 'date', v: x.date || today(), req: true, cls: 'half' }, { n: 'label', l: 'Libellé', v: x.label, ph: 'Croquettes 12 kg…', cls: 'half' }
    ],
    onSubmit(v) {
      const rec = { id: editing ? x.id : uid(), dogId: dog().id, ...v };
      if (editing) S.expenses[S.expenses.findIndex(e => e.id === x.id)] = rec; else S.expenses.push(rec);
      save(); render(true); toast('Dépense ajoutée ✓');
    },
    onDelete: editing ? () => { S.expenses = S.expenses.filter(e => e.id !== x.id); save(); render(true); } : null
  });
}
ACT['add-expense'] = () => expenseForm();
ACT['edit-expense'] = ({ id, ev }) => ev === '1' ? eventForm(S.events.find(e => e.id === id), true) : expenseForm(S.expenses.find(e => e.id === id), true);
ACT['xp-period'] = ({ p }) => { XP.period = p; render(true); };
ACT['xp-csv'] = () => gate('stats', () => {
  const d = dog(), rows = [['Date', 'Catégorie', 'Libellé', 'Montant']].concat(allExpenses(d.id).map(e => [e.date, e.cat, e.label || '', String(e.amount).replace('.', ',')]));
  download(`depenses-${d.name}.csv`, '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
});
ROUTES.depenses = function depenses() {
  const d = dog(), all = allExpenses(d.id), n = new Date();
  const from = XP.period === 'month' ? iso(new Date(n.getFullYear(), n.getMonth(), 1)) : XP.period === 'year' ? `${n.getFullYear()}-01-01` : addDays(today(), -365);
  const list = all.filter(e => e.date >= from), total = sum(list.map(e => e.amount));
  const byCat = EXPENSE_CATS.map(c => ({ l: c.split(' ')[0].slice(0, 8), v: sum(list.filter(e => e.cat === c).map(e => e.amount)) })).filter(x => x.v > 0);
  const months = []; for (let i = 11; i >= 0; i--) { const dt = new Date(n.getFullYear(), n.getMonth() - i, 1), k = iso(dt).slice(0, 7); months.push({ l: dt.toLocaleDateString('fr-FR', { month: 'narrow' }), v: sum(all.filter(e => e.date.startsWith(k)).map(e => e.amount)) }); }
  const locked = !allowed('stats');
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>💶 Dépenses</h1><button class="btn primary sm" data-act="add-expense">＋</button></div>
  <div class="seg">${[['month', 'Ce mois'], ['year', 'Cette année'], ['12m', '12 mois']].map(([k, l]) => `<button class="${XP.period === k ? 'on' : ''}" data-act="xp-period" data-p="${k}">${l}</button>`).join('')}</div>
  <section class="card center"><small class="mut">Total ${esc(d.name)}</small><div class="big-n">${fmtMoney(Math.round(total * 100) / 100)}</div>${XP.period === '12m' ? `<small class="mut">soit ≈ ${fmtMoney(Math.round(total / 12))} par mois</small>` : ''}</section>
  <section class="card ${locked ? 'locked' : ''}"><h2>Par catégorie</h2>${byCat.length ? barChart(byCat) : '<p class="empty">Aucune dépense sur la période.</p>'}<h2>12 derniers mois</h2>${barChart(months)}
    ${locked ? `<div class="lock"><button class="btn primary" data-act="paywall" data-f="stats">🔒 Statistiques avec Wouf Plus</button></div>` : ''}</section>
  <div class="list card">${list.map(e => `<button class="row" data-act="edit-expense" data-id="${e.id}" data-ev="${e.fromEvent ? 1 : 0}"><span class="ico">${e.fromEvent ? TYPES[e.type].icon : '🧾'}</span><span class="grow"><b>${esc(e.label || e.cat)}</b><small>${fmtDate(e.date)} · ${esc(e.cat)}</small></span><span class="side"><b>${fmtMoney(e.amount)}</b></span></button>`).join('') || '<p class="empty">Ajoutez vos dépenses (le coût saisi dans le carnet est repris automatiquement).</p>'}</div>
  <div class="actions-row"><button class="btn" data-act="xp-csv">⬇️ Export CSV${locked ? ' <span class="pill plus">Plus</span>' : ''}</button></div>`;
};

/* ---------- Documents ---------- */
const DOC_KINDS = ['Ordonnance', 'Résultats d’analyses', 'Carte d’identification (I-CAD)', 'Pedigree (LOF)', 'Contrat d’assurance', 'Facture', 'Autre'];
ACT['add-doc'] = () => {
  if (!canAddDoc()) return paywall('documents');
  openForm({
    title: 'Ajouter un document', submit: 'Ajouter',
    fields: [{ n: 'file', l: 'Photo ou PDF', t: 'file', accept: 'image/*,application/pdf', req: true }, { n: 'kind', l: 'Type', t: 'select', opts: DOC_KINDS }, { n: 'title', l: 'Titre', ph: 'Ex. Ordonnance dermato' }, { n: 'date', l: 'Date', t: 'date', v: today() }],
    async onSubmit(v) {
      if (!v.file) { toast('Choisissez un fichier'); return false; }
      const isImg = v.file.type.startsWith('image/');
      if (!isImg && v.file.type !== 'application/pdf') { toast('Formats acceptés : photo ou PDF'); return false; }
      if (v.file.size > 20e6) { toast('Fichier trop volumineux (20 Mo max)'); return false; }
      const blob = isImg ? await imageBlob(v.file, 2000, 0.82) : v.file, id = uid();
      await fput(id, blob);
      S.docs.push({ id, dogId: dog().id, kind: v.kind, title: v.title || v.file.name, date: v.date, mime: blob.type || v.file.type, size: blob.size });
      save(); render(true); toast('Document enregistré ✓');
    }
  });
};
ACT['view-doc'] = async ({ id }) => {
  const doc = S.docs.find(d => d.id === id), blob = await fget(id);
  if (!blob) return toast('Ce document est stocké sur un autre appareil (les documents ne sont pas synchronisés avec Google).');
  const url = URL.createObjectURL(blob), isImg = doc.mime.startsWith('image/');
  const el = sheet(`<div class="sheet-head"><h2>${esc(doc.title)}</h2><button class="x" data-close>✕</button></div>
    ${isImg ? `<img class="doc-img" src="${url}" alt="">` : `<iframe class="doc-pdf" src="${url}" title="${esc(doc.title)}"></iframe>`}
    <div class="form-actions"><button class="btn danger" data-del>Supprimer</button><button class="btn" data-share>Partager</button><a class="btn primary" href="${url}" download="${esc(doc.title)}.${isImg ? 'jpg' : 'pdf'}">Télécharger</a></div>`);
  const obs = new MutationObserver(() => { if (!document.body.contains(el)) { URL.revokeObjectURL(url); obs.disconnect(); } }); obs.observe(document.body, { childList: true });
  $('[data-del]', el).onclick = async () => { if (await ask('Supprimer ce document ?', 'Supprimer')) { await fdel(id); S.docs = S.docs.filter(x => x.id !== id); save(); closeSheet(el); render(true); } };
  $('[data-share]', el).onclick = () => shareOrDownload(new File([blob], doc.title + (isImg ? '.jpg' : '.pdf'), { type: doc.mime }), doc.title);
};
ROUTES.documents = function documents() {
  const d = dog(), docs = S.docs.filter(x => x.dogId === d.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>📎 Documents</h1><button class="btn primary sm" data-act="add-doc">＋</button></div>
  <p class="mut">Ordonnances, résultats, carte I-CAD… stockés uniquement sur cet appareil (pensez à la sauvegarde).${BILL.enabled && !plus() ? ` Formule gratuite : ${(BILL.limits || {}).documents || 3} documents.` : ''}</p>
  <div class="list card">${docs.map(x => `<button class="row" data-act="view-doc" data-id="${x.id}"><span class="ico">${x.mime === 'application/pdf' ? '📄' : '🖼️'}</span><span class="grow"><b>${esc(x.title)}</b><small>${esc(x.kind)} · ${fmtDate(x.date)} · ${(x.size / 1024 / 1024).toFixed(1)} Mo</small></span><span class="chev">›</span></button>`).join('') || '<p class="empty">Aucun document. Photographiez une ordonnance pour l’avoir toujours sous la main.</p>'}</div>`;
};

/* ---------- Nutrition ---------- */
function nutDefault(d) {
  if (d.birth) { const m = ageMonths(d.birth); if (m < 4) return 'pup4'; if (m < 12) return 'pup12'; if (lifeStage(d) === 'Senior') return 'senior'; }
  return d.neutered ? 'neutered' : 'intact';
}
function nutCalc(root) {
  const kg = num($('[data-nut=kg]', root).value), f = nutFactorsOf(dog()).find(x => x[0] === $('[data-nut=f]', root).value), kc = num($('[data-nut=kcal]', root).value), meals = Math.max(1, num($('[data-nut=meals]', root).value) || 2), out = $('#nut-out', root);
  if (!kg || !f) { out.innerHTML = '<p class="empty">Indiquez le poids.</p>'; return; }
  const rer = 70 * Math.pow(kg, 0.75), mer = rer * f[2];
  out.innerHTML = `<div class="kv-line"><span>Besoin de base <b>${Math.round(rer)} kcal</b></span><span>Besoin journalier <b>${Math.round(mer)} kcal</b></span></div>
   ${kc ? `<div class="big-n">${Math.round(mer / kc * 100)} g<small> de croquettes / jour</small></div><p class="center mut">soit ${Math.round(mer / kc * 100 / meals)} g × ${meals} repas</p>` : '<p class="mut">Saisissez les kcal/100 g (sur le sac) pour obtenir les grammes.</p>'}
   <p class="mut small">Formule vétérinaire de référence (RER = 70 × poids^0,75, × coefficient). Ajustez selon l’état corporel : si le poids monte ou baisse, corrigez de 10 %. Les friandises comptent dans la ration.</p>`;
}
ROUTES.nutrition = function nutrition() {
  const d = dog(), lw = lastWeight(d.id), fd = d.food || {};
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🍖 Ration de ${esc(d.name)}</h1></div>
  <section class="card" id="nut"><div class="field"><label>Poids (kg)</label><input data-nut="kg" type="number" inputmode="decimal" step="any" value="${lw ? lw.kg : ''}"></div>
  <div class="field"><label>Situation</label><select data-nut="f">${nutFactorsOf(d).map(f => `<option value="${f[0]}" ${f[0] === (fd.f || nutDefault(d)) ? 'selected' : ''}>${f[1]}</option>`).join('')}</select></div>
  <div class="field half"><label>Croquettes (kcal / 100 g)</label><input data-nut="kcal" type="number" inputmode="decimal" value="${fd.kcal || 350}"></div><div class="field half"><label>Repas / jour</label><input data-nut="meals" type="number" inputmode="numeric" value="${fd.meals || 2}"></div>
  <div id="nut-out"></div></section>
  <a class="card banner" href="#/croquettes"><b>🥣 Comparateur de croquettes</b><span>Le meilleur choix selon l’âge, la race et l’activité de ${esc(d.name)} →</span></a>
  <a class="card banner" href="#/plan-poids"><b>⚖️ Plan de perte de poids ${allowed('weightplan') ? '' : '<span class="pill plus">Plus</span>'}</b><span>Ration, étapes et date d’objectif →</span></a>`;
};
ROUTES.nutrition.after = () => { const r = $('#nut'); if (r) nutCalc(r); };
document.addEventListener('input', e => { const r = e.target.closest('#nut'); if (r) { nutCalc(r); const d = dog(); d.food = { f: $('[data-nut=f]', r).value, kcal: num($('[data-nut=kcal]', r).value), meals: num($('[data-nut=meals]', r).value) }; save(); } });
document.addEventListener('change', e => { const r = e.target.closest('#nut'); if (r) { nutCalc(r); const d = dog(); d.food = { f: $('[data-nut=f]', r).value, kcal: num($('[data-nut=kcal]', r).value), meals: num($('[data-nut=meals]', r).value) }; save(); } });

/* ---------- Race ---------- */
ROUTES.race = function race() {
  const d = dog(), b = dogBreed(d);
  if (!b) return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧬 Race</h1></div><p class="empty">Choisissez la race dans la fiche de ${esc(d.name)} pour voir son poids idéal, son espérance de vie et ses prédispositions.</p><button class="btn primary" data-act="edit-dog" data-id="${d.id}">Modifier la fiche</button>`;
  const y = d.birth ? ageYears(d.birth) : null;
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧬 ${esc(b.name)}</h1></div>
  <section class="card"><div class="kv-line"><span>Taille <b>${SIZE_LABEL[b.size]}</b></span><span>Poids adulte <b>${b.w[0]}–${b.w[1]} kg</b></span><span>Espérance de vie <b>${b.life[0]}–${b.life[1]} ans</b></span></div>
   ${y !== null ? `<p>${esc(d.name)} a ${esc(ageText(d.birth))} : environ <b>${Math.max(0, Math.round((1 - y / ((b.life[0] + b.life[1]) / 2)) * 100))} %</b> de l’espérance de vie moyenne restant à vivre. Senior à partir de ≈ ${SENIOR_AGE[b.size]} ans.</p>` : ''}</section>
  <section class="card"><h2>Prédispositions à surveiller</h2><ul class="bul">${b.pred.map(p => `<li>${esc(p)}</li>`).join('')}</ul><p class="mut small">Une prédisposition n’est pas une fatalité : suivi régulier, poids maîtrisé et dépistage précoce font la différence. Parlez-en à votre vétérinaire.</p></section>
  <section class="card"><h2>Suivi conseillé</h2><ul class="bul"><li>Visite de contrôle chaque année (deux par an à partir de la vieillesse).</li><li>Pesée mensuelle : ${b.w[1]} kg est le haut de la fourchette adulte.</li><li>Dents : brossage régulier, détartrage si besoin.</li>${lifeStage(d) === 'Senior' ? '<li>Bilan sanguin annuel recommandé (senior).</li>' : ''}</ul></section>`;
};

/* ---------- Chien perdu ---------- */
ROUTES.perdu = function perdu() {
  const d = dog();
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>📣 ${spOf(d).noun === 'chat' ? 'Chat' : 'Chien'} perdu</h1></div>
  <section class="card sos-hero"><b>${esc(d.name)} a disparu ?</b><button class="btn danger-fill big" data-act="poster">Créer l’affiche à imprimer</button></section>
  <section class="card"><h2>Les bons réflexes</h2><ol class="bul"><li>Retournez immédiatement à l’endroit de la disparition et restez-y un moment ; laissez un vêtement porté.</li><li>Prévenez l’<b>I-CAD</b> (fichier d’identification) pour signaler la disparition.</li><li>Appelez les vétérinaires, la fourrière et la mairie du secteur.</li><li>Publiez sur les groupes locaux et les sites de chiens perdus, avec une photo nette.</li><li>Affichez chez les commerçants et sur les lieux de passage.</li><li>Ne criez pas après lui à son retour : il doit vouloir revenir.</li></ol></section>`;
};
ACT.poster = () => {
  const d = dog();
  openForm({
    title: 'Affiche « ' + spOf(d).noun + ' perdu »', submit: 'Aperçu / imprimer',
    fields: [{ n: 'where', l: 'Lieu de disparition', v: '', req: true, ph: 'Rue, quartier, ville' }, { n: 'when', l: 'Date', t: 'date', v: today(), req: true }, { n: 'phone', l: 'Téléphone à appeler', t: 'tel', v: S.owner.phone, req: true }, { n: 'msg', l: 'Message', t: 'textarea', v: 'Il/elle est très craintif(ve), ne pas courir après lui/elle. Récompense.' }],
    onSubmit(v) {
      printHTML(`<div class="poster"><h1>${spOf(d).noun.toUpperCase()} PERDU</h1>${d.photo ? `<img src="${d.photo}" alt="">` : ''}<h2>${esc(d.name)}</h2><p class="pl">${esc(d.breed || '')} ${d.sex === 'F' ? '· Femelle' : '· Mâle'}${d.color ? ' · ' + esc(d.color) : ''}</p>
        <p class="pl">Perdu(e) le <b>${fmtDate(v.when)}</b> à <b>${esc(v.where)}</b></p>${d.chip ? `<p>Identifié(e) par puce : ${esc(d.chip)}</p>` : ''}<p>${esc(v.msg)}</p><div class="tel">${esc(fmtPhone(v.phone))}</div></div>`);
    }
  });
};

/* ---------- Sauvegarde chiffrée ---------- */
const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function deriveKey(pass, salt) {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function makeBackup(pass, withFiles) {
  const files = {};
  if (withFiles) for (const x of S.docs) { const b = await fget(x.id); if (b) files[x.id] = await blobToDataURL(b); }
  const txt = JSON.stringify({ app: 'wouf', v: 1, state: S, files });
  if (!pass) return new Blob([txt], { type: 'application/json' });
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await deriveKey(pass, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(txt)));
  return new Blob([JSON.stringify({ app: 'wouf', enc: 1, salt: b64(salt), iv: b64(iv), data: b64(ct) })], { type: 'application/json' });
}
async function readBackup(text, pass) {
  let j = JSON.parse(text);
  if (j.app !== 'wouf') throw new Error('Ce fichier n’est pas une sauvegarde Wouf.');
  if (j.enc) {
    if (!pass) return 'need-pass';
    try { j = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(j.iv) }, await deriveKey(pass, unb64(j.salt)), unb64(j.data)))); }
    catch (e) { throw new Error('Phrase secrète incorrecte.'); }
  }
  return j;
}
async function restoreBackup(j) {
  S = Object.assign(blank(), j.state); flush();
  for (const [id, url] of Object.entries(j.files || {})) await fput(id, await (await fetch(url)).blob());
  S.settings.lastBackup = today(); flush();
}
ROUTES.sauvegarde = function sauvegarde() {
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>💾 Sauvegarde</h1></div>
  <section class="card"><h2>Exporter</h2><p class="mut">Vos données restent sur cet appareil. Le fichier de sauvegarde est <b>chiffré</b> (AES-256) avec une phrase secrète que vous choisissez : sans elle, personne ne peut le lire, pas même nous. Enregistrez-le dans Drive, iCloud ou envoyez-le-vous par mail.</p>
    <div class="field"><label>Phrase secrète</label><input id="bk-pass" type="password" autocomplete="new-password" placeholder="Choisissez une phrase que vous retiendrez"></div>
    <label class="chk"><input type="checkbox" id="bk-files" checked> <span>Inclure les documents (photos, PDF)</span></label>
    <button class="btn primary" data-act="export">Créer la sauvegarde</button>
    <p class="mut small">Dernière sauvegarde : ${S.settings.lastBackup ? fmtDate(S.settings.lastBackup) : 'jamais'}. <b>Attention :</b> phrase perdue = sauvegarde irrécupérable.</p></section>
  <section class="card"><h2>Restaurer</h2><p class="mut">Choisissez un fichier .wouf ou .json. Les données actuelles de cet appareil seront remplacées.</p>
    <input type="file" id="bk-file" accept=".wouf,.json,application/json"><div class="field" id="bk-pass2-wrap" hidden><label>Phrase secrète</label><input id="bk-pass2" type="password" autocomplete="off"></div>
    <button class="btn" data-act="import">Restaurer</button></section>${CLOUD.user ? cloudEncCard() : ''}`;
};
function cloudEncCard() {
  return cloudPass() ? `<section class="card"><h2>🔒 Synchronisation Google chiffrée</h2><p class="mut">Actif : Google ne stocke que du texte chiffré, illisible sans votre phrase secrète (gardée sur cet appareil, à ressaisir sur un nouvel appareil). <b>Phrase perdue = sauvegarde Google irrécupérable.</b></p><button class="btn" data-act="cenc-off">Désactiver le chiffrement</button></section>`
    : `<section class="card"><h2>🔒 Chiffrer ma synchronisation Google</h2><p class="mut">Vos données (animaux, santé, poids…) sont protégées par les règles de Google. Pour aller plus loin, une phrase secrète les chiffre avant l’envoi : ni Google ni nous ne pouvons les lire.</p>
    <div class="field"><label>Phrase secrète</label><input id="cenc-pass" type="password" autocomplete="new-password" placeholder="Au moins 6 caractères"></div><button class="btn primary" data-act="cenc-on">Activer le chiffrement</button><p class="mut small"><b>Attention :</b> phrase perdue = sauvegarde Google irrécupérable (les données de cet appareil restent intactes).</p></section>`;
}
ACT['cenc-on'] = async () => {
  const pass = $('#cenc-pass').value; if (pass.length < 6) return toast('Choisissez une phrase secrète d’au moins 6 caractères');
  try { localStorage.setItem(CPASS, pass); } catch (e) { return toast('Impossible d’enregistrer la phrase sur cet appareil'); }
  S.updatedAt = Date.now(); await cloudPush(); toast(CLOUD.st === 'ok' ? 'Synchronisation chiffrée ✓' : 'Échec : réessayez'); render(true);
};
ACT['cenc-off'] = async () => {
  if (!(await ask('Désactiver le chiffrement ? Votre sauvegarde Google sera de nouveau enregistrée en clair (protégée par les règles Google).', 'Désactiver', false))) return;
  try { localStorage.removeItem(CPASS); } catch (e) { /* ignore */ } S.updatedAt = Date.now(); await cloudPush(); render(true);
};
ACT.export = async () => {
  const pass = $('#bk-pass').value;
  if (pass.length < 6) return toast('Choisissez une phrase secrète d’au moins 6 caractères');
  try {
    const blob = await makeBackup(pass, $('#bk-files').checked), f = new File([blob], `wouf-sauvegarde-${today()}.wouf`, { type: 'application/json' });
    S.settings.lastBackup = today(); save(); await shareOrDownload(f, 'Sauvegarde Wouf'); toast('Sauvegarde créée ✓'); render(true);
  } catch (e) { console.error(e); toast('Échec de la sauvegarde'); }
};
ACT.import = async () => {
  const f = $('#bk-file').files[0]; if (!f) return toast('Choisissez un fichier');
  try {
    const j = await readBackup(await f.text(), $('#bk-pass2').value);
    if (j === 'need-pass') { $('#bk-pass2-wrap').hidden = false; $('#bk-pass2').focus(); return toast('Saisissez la phrase secrète'); }
    if (!(await ask('Remplacer toutes les données de cet appareil par cette sauvegarde ?', 'Restaurer'))) return;
    await restoreBackup(j); location.hash = '#/home'; render(); toast('Sauvegarde restaurée ✓');
  } catch (e) { toast(e.message || 'Fichier illisible'); }
};

/* ---------- Don à une association (lien direct vers le site officiel : Wouf n'encaisse rien) ---------- */
const donation = () => CFG.donation || { name: 'la SPA', url: 'https://www.spa.asso.fr/', text: '' };
ROUTES.don = function don() {
  const D = donation();
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>❤️ Faire un don</h1></div>
  <section class="card center"><div class="big-heart">❤️</div><h2>Aider les animaux sans famille</h2><p>${esc(D.text || '')}</p>
    <a class="btn primary big" href="${esc(D.url)}" target="_blank" rel="noopener noreferrer">❤️ Faire un don à ${esc(D.name)}</a>
    <p class="mut small">Le bouton ouvre directement le site officiel de l’association, où vous choisissez le montant.</p></section>
  <section class="card note"><b>En toute transparence</b><p>Wouf n’est pas affilié à ${esc(D.name)} et ne reçoit aucune commission : il ne collecte aucun don et n’a accès à aucune information de paiement. Votre don et votre reçu fiscal passent uniquement par l’association.</p></section>`;
};

/* ---------- Réglages ---------- */
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (location.hash === '#/reglages') render(true); });
ACT.install = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; render(true); };
ACT['stats-opt'] = (_, el) => { S.settings.noStats = !el.checked; save(); toast(el.checked ? 'Statistiques anonymes activées' : 'Statistiques anonymes désactivées'); };
ACT.notif = async () => {
  if (!('Notification' in window)) return toast('Notifications non disponibles sur cet appareil');
  if (S.settings.notif) { S.settings.notif = false; save(); return render(true); }
  const p = await Notification.requestPermission();
  if (p === 'granted') { S.settings.notif = true; S.settings.lastNotif = ''; save(); maybeNotify(); toast('Notifications activées à l’ouverture de l’app'); } else toast('Notifications refusées par le navigateur');
  render(true);
};
document.addEventListener('change', e => { const t = e.target.closest('[data-set]'); if (t) { const [a, b] = t.dataset.set.split('.'); S[a][b] = t.value.trim(); save(); } });
ACT.wipe = async () => {
  if (!(await ask('Supprimer TOUTES les données (animaux, carnet, documents) de cet appareil ? Faites une sauvegarde avant.', 'Tout supprimer'))) return;
  for (const x of S.docs) await fdel(x.id).catch(() => {});
  S = blank(); flush(); try { ['wouf:vets', 'wouf:walk', 'wouf:errors', 'wouf:paid', 'wouf:cpass', 'wouf:remote'].forEach(k => localStorage.removeItem(k)); } catch (e) { /* rien */ } location.hash = '#/home'; render();
};
/* ---------- Déménagement vers l'adresse officielle (config.site) ----------
   Ancienne adresse sans carnet → redirection immédiate. Avec un carnet → bandeau et transfert direct
   (données + documents) vers la nouvelle adresse par postMessage, entre les deux onglets, sans serveur. Rien n'est supprimé. */
const SITE = (window.WOUF_CONFIG || {}).site || {};
const SITE_ORIGIN = (() => { try { return new URL(SITE.home).origin; } catch (e) { return ''; } })();
const OLD_ORIGINS = ['https://ikeupods-del.github.io'].concat(SITE.old || []); // SITE.old : réservé aux tests
const onOldSite = () => !!(SITE.moved && SITE_ORIGIN && OLD_ORIGINS.includes(location.origin));
function movedRedirect() {
  if (!onOldSite() || S.dogs.length) return false;
  location.replace(SITE.home + location.search + location.hash); return true;
}
function movedBanner() {
  if (!onOldSite() || !S.dogs.length) return '';
  const host = SITE_ORIGIN.replace('https://', ''), done = S.settings.movedAt;
  return `<section class="card move-card"><h2>📦 Wouf a une nouvelle adresse : ${esc(host)}</h2><p>${done ? 'Votre carnet a été transféré ✓. Utilisez désormais la nouvelle adresse et ajoutez-la à votre écran d’accueil.' : 'Transférez votre carnet en un geste : il est copié vers la nouvelle adresse, rien n’est supprimé ici.'}</p>
    <div class="btn-row"><button class="btn primary" data-act="move-go">${done ? 'Ouvrir ' + esc(host) : 'Transférer mon carnet'}</button></div>
    <p class="mut small">Connecté(e) avec Google ? Reconnectez-vous simplement sur la nouvelle adresse. Sinon : Réglages → Sauvegarde, puis restauration sur ${esc(host)}.</p></section>`;
}
ACT['move-go'] = async () => {
  if (S.settings.movedAt) { location.href = SITE.home; return; }
  const w = window.open(SITE.home + '#/transfert', '_blank'); // ouvert tout de suite : sinon le navigateur bloque la fenêtre
  if (!w) { toast('Autorisez l’ouverture de la nouvelle page, puis réessayez'); return; }
  flush();
  const files = (async () => { const f = []; for (const x of S.docs || []) { try { const b = await fget(x.id); if (b) f.push([x.id, b]); } catch (e) { /* document illisible : ignoré */ } } return f; })();
  const onMsg = async ev => {
    if (ev.origin !== SITE_ORIGIN || ev.source !== w || !ev.data) return;
    if (ev.data.type === 'wouf-ready') w.postMessage({ type: 'wouf-transfer', data: localStorage.getItem(KEY), files: await files }, SITE_ORIGIN);
    if (ev.data.type === 'wouf-done') { removeEventListener('message', onMsg); S.settings.movedAt = today(); save(); render(true); }
  };
  addEventListener('message', onMsg);
  setTimeout(() => { if (!S.settings.movedAt) toast('Rien ne se passe ? Ouvrez Wouf dans le navigateur (pas l’app installée) et réessayez.'); }, 20000);
};
ROUTES.transfert = function transfert() {
  return `<div class="page-h"><h1>📦 Transfert du carnet</h1></div><section class="card"><p id="tr-st">${window.opener ? 'Réception de votre carnet…' : 'Pour transférer un carnet, ouvrez l’ancienne adresse de Wouf et appuyez sur « Transférer mon carnet ».'}</p><a class="btn" href="#/home">Continuer</a></section>`;
};
ROUTES.transfert.after = () => {
  if (!window.opener || location.origin !== SITE_ORIGIN || ROUTES.transfert.on) return;
  ROUTES.transfert.on = true;
  addEventListener('message', async ev => {
    if (!OLD_ORIGINS.includes(ev.origin) || !ev.data || ev.data.type !== 'wouf-transfer') return;
    let r = null; try { r = JSON.parse(ev.data.data); } catch (e) { /* données illisibles */ }
    if (!r || !r.v || !Array.isArray(r.dogs)) { toast('Transfert impossible : carnet illisible'); return; }
    if (S.dogs.length && !(await ask('Un carnet existe déjà sur cette adresse. Le remplacer par celui que vous transférez ?', 'Remplacer'))) return;
    for (const [id, b] of ev.data.files || []) { try { await fput(id, b); } catch (e) { /* document ignoré */ } }
    S = Object.assign(blank(), migrate(r)); delete S.settings.movedAt; save(); flush();
    ev.source.postMessage({ type: 'wouf-done' }, ev.origin);
    location.hash = '#/home'; render(); toast('Carnet transféré ✓ Bienvenue sur la nouvelle adresse !');
  });
  OLD_ORIGINS.forEach(o => { try { window.opener.postMessage({ type: 'wouf-ready' }, o); } catch (e) { /* onglet fermé */ } });
};

ROUTES.reglages = function reglages() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>⚙️ Réglages</h1></div>
  <section class="card"><h2>☁️ Compte Google</h2>${CLOUD.user
    ? `<div class="row"><span class="ico">${CLOUD.user.picture ? `<img class="av sm" src="${esc(CLOUD.user.picture)}" alt="" referrerpolicy="no-referrer">` : '👤'}</span><span class="grow"><b>${esc(CLOUD.user.name || CLOUD.user.email)}</b><small>${esc(CLOUD.user.email)}</small></span></div>
       <p class="${CLOUD.st === 'err' ? 'bad' : CLOUD.st === 'ok' ? 'ok' : 'mut'}">${esc(cloudLabel())}${CLOUD.st === 'ok' && CLOUD.at ? ' · ' + new Date(CLOUD.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}${CLOUD.msg ? ' — ' + esc(CLOUD.msg) : ''}</p>
       <div class="btn-row"><button class="btn primary" data-act="g-sync">Synchroniser maintenant</button><button class="btn" data-act="g-signout">Se déconnecter</button></div>
       <p class="mut small">Vos données (carnet, poids, éducation…) sont sauvegardées automatiquement. Les documents (photos, PDF) restent sur l’appareil : utilisez la sauvegarde chiffrée pour les conserver.</p>`
    : `<p class="mut">Connectez-vous pour sauvegarder automatiquement et retrouver votre carnet sur tous vos appareils.</p><button class="btn primary" data-act="g-signin">Continuer avec Google</button>${CloudApi.available() ? '' : '<p class="mut small">Disponible sur la version publiée (https).</p>'}`}</section>
  <section class="card"><h2>Propriétaire</h2><p class="mut">Utilisé sur la fiche d’urgence, la fiche véto et l’affiche « animal perdu ».</p>
    <div class="field"><label>Nom</label><input data-set="owner.name" value="${esc(S.owner.name)}"></div><div class="field"><label>Téléphone</label><input data-set="owner.phone" type="tel" value="${esc(S.owner.phone)}"></div></section>
  <section class="card"><h2>Rappels</h2><label class="chk"><input type="checkbox" data-act="notif" ${S.settings.notif ? 'checked' : ''}> <span>Me notifier à l’ouverture de l’app quand une échéance approche</span></label>
    <p class="mut small">Pour être prévenu(e) même app fermée, exportez les rappels vers votre agenda (Carnet → « Ajouter les rappels à mon agenda »).</p></section>
  ${!standalone ? `<section class="card"><h2>Installer Wouf</h2>${installEvt ? '<button class="btn primary" data-act="install">📲 Installer l’app</button>' : '<p class="mut">iPhone : Partager → « Sur l’écran d’accueil ». Android : menu du navigateur → « Installer l’application ».</p>'}</section>` : ''}
  <section class="card"><h2>Confidentialité</h2><p class="mut">Aucun suivi publicitaire. Vos données sont stockées sur cet appareil ; si vous vous connectez avec Google (facultatif), elles sont aussi sauvegardées dans votre espace privé de compte. Les recherches de cliniques (OpenStreetMap) et d’adresse utilisent le réseau, avec votre position uniquement au moment où vous la demandez.</p>${statsCode() ? `<label class="chk"><input type="checkbox" data-act="stats-opt" ${S.settings.noStats ? '' : 'checked'}> <span>Aider à améliorer Wouf avec des statistiques anonymes (écrans ouverts et actions principales, sans cookie ni donnée saisie)</span></label>` : ''}</section>
  <section class="card"><h2>Zone sensible</h2><button class="btn danger" data-act="wipe">Supprimer toutes mes données</button></section>
  <p class="mut center small made">Conçu avec ❤️ à Nîmes, dans le sud de la France<br>Un produit QuenTools · Wouf ${esc(CFG.version || '')}</p>`;
};
