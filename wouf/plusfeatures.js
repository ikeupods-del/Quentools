'use strict';
/* Wouf Plus — Bilan santé intelligent, fiche gardien (pet-sitter), plan de perte de poids.
   Les conseils sont générés par des règles simples et transparentes : ils orientent, ils ne diagnostiquent pas. */

/* ---------- Bilan santé ---------- */
function healthInsights(d) {
  const out = [], sp = spOf(d), A = ageYears(d.birth || iso(new Date(Date.now() - 3 * 365.25 * 864e5)));
  const rem = reminders(d.id), late = rem.filter(r => r.days < 0), soon = rem.filter(r => r.days >= 0 && r.days <= 30);
  const add = (lvl, icon, title, txt, link) => out.push({ lvl, icon, title, txt, link });
  if (late.length) add('bad', '⏰', `${late.length} rappel${late.length > 1 ? 's' : ''} en retard`, late.slice(0, 3).map(r => r.title.split(' (')[0] + ' (' + dueText(r.days) + ')').join(', ') + '. Prenez rendez-vous pour vous remettre à jour.', '#/carnet');
  if (soon.length) add('warn', '📅', `${soon.length} échéance${soon.length > 1 ? 's' : ''} dans les 30 jours`, soon.slice(0, 3).map(r => r.title.split(' (')[0]).join(', ') + '.', '#/carnet');
  // Poids
  const ws = dogWeights(d.id), recent = ws.filter(w => diffDays(today(), w.date) <= 120);
  if (recent.length >= 2) {
    const a = recent[0], b = recent[recent.length - 1], pct = (b.kg - a.kg) / a.kg * 100, days = Math.max(1, diffDays(b.date, a.date));
    const young = d.birth && ageMonths(d.birth) < 12;
    if (!young && Math.abs(pct) >= 10) add('bad', '⚖️', `Poids : ${pct > 0 ? '+' : ''}${pct.toFixed(0)} % en ${Math.round(days / 30)} mois`, pct < 0 ? `Une perte de poids non voulue de plus de 10 % justifie une consultation, surtout chez ${sp.noun === 'chat' ? 'le chat' : 'le chien'} âgé.` : 'Une prise de poids rapide augmente les risques articulaires, cardiaques et de diabète. Consultez et ajustez la ration.', pct > 0 ? '#/plan-poids' : '#/suivi');
    else if (!young && Math.abs(pct) >= 5) add('warn', '⚖️', `Poids : ${pct > 0 ? '+' : ''}${pct.toFixed(0)} % en ${Math.round(days / 30)} mois`, 'Variation à surveiller : continuez à peser régulièrement.', '#/suivi');
    else add('ok', '⚖️', 'Poids stable', 'Aucune variation notable sur les derniers mois.', '#/suivi');
  } else add('warn', '⚖️', 'Pesées insuffisantes', 'Pesez votre animal une fois par mois : c’est le meilleur indicateur précoce de santé.', '#/suivi');
  const wst = weightStatus(d); if (wst && wst.cls === 'bad') add('bad', '🍖', wst.txt, 'Un plan de perte de poids progressif est recommandé.', '#/plan-poids');
  // Visite
  const lastVisit = dogEvents(d.id).find(e => ['visit', 'vaccine', 'surgery', 'dental'].includes(e.type));
  const needMonths = A >= SENIOR_AGE[dogSize(d)] ? 6 : 12;
  if (!lastVisit) add('warn', '🩺', 'Aucune visite enregistrée', 'Ajoutez votre dernière consultation pour suivre le bilan annuel.', '#/carnet');
  else if (diffDays(today(), lastVisit.date) > needMonths * 30.4 + 30) add('warn', '🩺', `Dernière visite il y a ${Math.round(diffDays(today(), lastVisit.date) / 30.4)} mois`, `Un bilan tous les ${needMonths} mois est conseillé à cet âge.`, '#/carnet');
  else add('ok', '🩺', 'Suivi vétérinaire à jour', 'Dernière visite : ' + fmtDate(lastVisit.date) + '.', '#/carnet');
  // Dents
  const lastDental = dogEvents(d.id).find(e => e.type === 'dental');
  if (A >= 3 && (!lastDental || diffDays(today(), lastDental.date) > 500)) add('warn', '🦷', 'Contrôle dentaire conseillé', 'Le tartre touche la majorité des adultes de plus de 3 ans et peut affecter cœur et reins.', '#/carnet');
  // Âge
  if (A >= SENIOR_AGE[dogSize(d)]) add('warn', '👴', 'Âge senior : bilan approfondi', 'Bilan sanguin et urinaire annuel, contrôle des articulations, des dents et de la vue. Détecter tôt permet de mieux soigner.', '#/carnet');
  if (d.birth && diffDays(today(), d.birth) < 400) add('ok', spOf(d).emoji, `${sp.planTitle} disponible`, 'Vaccins, vermifuges et visites dates après dates.', '#/plan');
  // Activité
  if (sp.id === 'dog') {
    const days30 = (S.walks || []).filter(w => w.dogId === d.id && diffDays(today(), w.date) < 30);
    if (days30.length) { const avg = Math.round(sum(days30.map(w => w.dur)) / 60 / 30), g = dailyGoal(d); add(avg >= g * 0.8 ? 'ok' : 'warn', '🦮', `Activité : ${avg} min/jour en moyenne`, avg >= g * 0.8 ? `Objectif de ${g} min quasiment atteint.` : `L’objectif est de ${g} min par jour : augmentez progressivement.`, '#/balade'); }
  }
  // Assurance
  const ins = d.insurance || {}; if (ins.renewal && diffDays(ins.renewal, today()) <= 60 && diffDays(ins.renewal, today()) >= 0) add('warn', '🛡️', 'Renouvellement d’assurance proche', 'Vérifiez vos garanties et votre tarif avant de renouveler : ils évoluent avec l’âge.', '#/depenses');
  // Dépenses
  const ex = allExpenses(d.id).filter(e => diffDays(today(), e.date) <= 365), tot = sum(ex.map(e => e.amount));
  if (tot > 0) add('ok', '💶', `Dépenses : ${fmtMoney(Math.round(tot))} sur 12 mois`, `Soit ≈ ${fmtMoney(Math.round(tot / 12))} par mois.`, '#/depenses');
  return out;
}
ROUTES.bilan = function bilan() {
  const d = dog();
  if (!allowed('bilan')) return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧠 Bilan santé</h1></div><section class="card"><p>Un bilan complet et personnalisé de <b>${esc(d.name)}</b> : poids, suivi vétérinaire, dents, activité, budget et conseils adaptés à son âge et à sa race.</p><button class="btn primary big" data-act="paywall" data-f="bilan">⭐ Débloquer avec Wouf Plus</button></section>`;
  const sc = score(d), ins = healthInsights(d), b = dogBreed(d), R = 34, C = 2 * Math.PI * R;
  const ring = `<svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="${R}" class="trk"/><circle cx="40" cy="40" r="${R}" class="val ${sc.total >= 80 ? 'ok' : sc.total >= 50 ? 'warn' : 'bad'}" stroke-dasharray="${(C * sc.total / 100).toFixed(1)} ${C.toFixed(1)}"/><text x="40" y="46" text-anchor="middle">${sc.total}</text></svg>`;
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧠 Bilan santé</h1></div>
  <section class="card"><div class="score">${ring}<div><b>${esc(d.name)}</b><br><small class="mut">${esc(ageText(d.birth))} · ${lifeStage(d)}${b ? ' · ' + esc(b.name) : ''}<br>Édité le ${fmtDate(today())}</small></div></div></section>
  ${ins.map(i => `<a class="card insight ${i.lvl}" href="${i.link}"><span class="ico">${i.icon}</span><span><b>${esc(i.title)}</b><small>${esc(i.txt)}</small></span></a>`).join('')}
  ${b ? `<section class="card"><h2>Points de vigilance de la race</h2><ul class="bul">${b.pred.map(p => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
  <div class="actions-row"><button class="btn" data-act="report">📄 Carnet complet pour le vétérinaire (PDF)</button></div>
  <p class="mut small center">Ces conseils sont générés automatiquement à partir de vos données. Ils ne remplacent pas l’avis d’un vétérinaire.</p>`;
};

/* ---------- Fiche gardien ---------- */
const SITTER_FIELDS = d => { const s = d.sitter || {}; return [
  { n: 'food', l: 'Alimentation', t: 'textarea', v: s.food, ph: 'Croquettes X, 2 repas (8 h et 18 h), 120 g. Pas de friandises en dehors de…' },
  { n: 'routine', l: 'Routine et sorties', t: 'textarea', v: s.routine, ph: 'Promenade matin et soir, 30 min. Se couche à…' },
  { n: 'likes', l: 'Ses habitudes, ce qu’il/elle aime', t: 'textarea', v: s.likes },
  { n: 'fears', l: 'Ses peurs, ce qu’il faut éviter', t: 'textarea', v: s.fears, ph: 'Orage, aspirateur, ne s’entend pas avec les autres chiens…' },
  { n: 'house', l: 'Règles de la maison', t: 'textarea', v: s.house, ph: 'Interdit de canapé, où sont les sacs, la laisse, la porte…' },
  { n: 'extra', l: 'Autres informations', t: 'textarea', v: s.extra }
]; };
function sitterHTML(d) {
  const s = d.sitter || {}, meds = S.meds.filter(m => m.dogId === d.id && medActive(m)), row = (t, v) => v ? `<tr><th>${t}</th><td>${esc(v).replace(/\n/g, '<br>')}</td></tr>` : '';
  const ct = S.contacts.map(c => `${esc(c.label)} : ${esc(fmtPhone(c.phone))}`).join('<br>');
  return `<h1>Fiche gardien : ${esc(d.name)}</h1><p class="mut">${esc(d.breed || '')} · ${esc(ageText(d.birth))}</p>
  <table class="kv">${row('Alimentation', s.food)}${row('Routine et sorties', s.routine)}${row('Habitudes', s.likes)}${row('Peurs / à éviter', s.fears)}${row('Règles de la maison', s.house)}
  ${row('Traitements', meds.map(m => `${m.name}${m.dose ? ' (' + m.dose + ')' : ''} — ${m.slots.map(x => SLOTS.find(y => y[0] === x)[1]).join(', ')}`).join('\n'))}
  ${row('Allergies / maladies', d.allergies)}${row('Puce', d.chip)}${row('Autres', s.extra)}
  <tr><th>Vétérinaire</th><td>${esc(d.vetName || '—')} ${esc(fmtPhone(d.vetPhone))}</td></tr>
  <tr><th>Propriétaire</th><td>${esc(S.owner.name || '—')} ${esc(fmtPhone(S.owner.phone))}</td></tr>${ct ? `<tr><th>Autres contacts</th><td>${ct}</td></tr>` : ''}</table>
  <p class="mut">En cas d’urgence, appelez le vétérinaire ci-dessus puis le propriétaire. Fiche éditée avec Wouf.</p>`;
}
ROUTES.gardien = function gardien() {
  const d = dog();
  if (!allowed('sitter')) return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧳 Fiche gardien</h1></div><section class="card"><p>Partez serein : une fiche complète (repas, traitements, habitudes, contacts d’urgence) prête à imprimer ou à envoyer à la personne qui garde <b>${esc(d.name)}</b>.</p><button class="btn primary big" data-act="paywall" data-f="sitter">⭐ Débloquer avec Wouf Plus</button></section>`;
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🧳 Fiche gardien</h1><button class="btn sm" data-act="sitter-edit">✎ Modifier</button></div>
  <section class="card">${sitterHTML(d)}</section><div class="actions-row"><button class="btn primary" data-act="sitter-print">🖨️ Imprimer / PDF</button><button class="btn" data-act="sitter-share">Partager en texte</button></div>`;
};
ACT['sitter-edit'] = () => { const d = dog(); openForm({ title: 'Fiche gardien de ' + d.name, fields: SITTER_FIELDS(d), onSubmit(v) { d.sitter = v; save(); render(true); } }); };
ACT['sitter-print'] = () => printHTML(sitterHTML(dog()));
ACT['sitter-share'] = async () => {
  const d = dog(), s = d.sitter || {}, t = `🐾 Fiche gardien — ${d.name}\n${s.food ? 'Repas : ' + s.food + '\n' : ''}${s.routine ? 'Routine : ' + s.routine + '\n' : ''}${s.fears ? 'À éviter : ' + s.fears + '\n' : ''}Vétérinaire : ${d.vetName || '—'} ${d.vetPhone || ''}\nPropriétaire : ${S.owner.name || ''} ${S.owner.phone || ''}`;
  try { if (navigator.share) return await navigator.share({ title: 'Fiche gardien ' + d.name, text: t }); await navigator.clipboard.writeText(t); toast('Copié dans le presse-papiers'); } catch (e) { /* annulé */ }
};

/* ---------- Plan de perte de poids ---------- */
const WP = {};   // valeurs saisies non enregistrées
function weightPlanCalc(d, cur, target, rate) {
  const cat = spOf(d).id === 'cat', rer = 70 * Math.pow(target, 0.75), kcal = rer * (cat ? 0.8 : 1.0);
  const weeks = target < cur ? Math.ceil(Math.log(target / cur) / Math.log(1 - rate)) : 0, miles = [];
  for (let w = 4; w <= weeks + 3 && miles.length < 12; w += 4) miles.push({ w: Math.min(w, weeks), kg: Math.max(target, cur * Math.pow(1 - rate, Math.min(w, weeks))) });
  return { kcal: Math.round(kcal), weeks, miles, date: addDays(today(), weeks * 7) };
}
ROUTES['plan-poids'] = function planPoids() {
  const d = dog(), lw = lastWeight(d.id), band = idealBand(d), cat = spOf(d).id === 'cat', p = d.wplan || {};
  if (!allowed('weightplan')) return `<div class="page-h"><a class="back" href="#/nutrition">‹</a><h1>⚖️ Plan de poids</h1></div><section class="card"><p>Un programme de perte de poids progressif pour <b>${esc(d.name)}</b> : ration quotidienne, étapes toutes les 4 semaines, date d’objectif et suivi réel.</p><button class="btn primary big" data-act="paywall" data-f="weightplan">⭐ Débloquer avec Wouf Plus</button></section>`;
  const cur = WP.cur ?? (p.start ? p.start.kg : (lw ? lw.kg : 0)), target = WP.target ?? (p.target || (band ? Math.round((band[0] + band[1]) / 2 * 10) / 10 : 0)), rate = WP.rate ?? (p.rate || (cat ? 0.01 : 0.015));
  const rates = cat ? [[0.005, '0,5 % / semaine (prudent)'], [0.01, '1 % / semaine'], [0.015, '1,5 % / semaine']] : [[0.01, '1 % / semaine (prudent)'], [0.015, '1,5 % / semaine'], [0.02, '2 % / semaine']];
  const calc = cur && target && target < cur ? weightPlanCalc(d, cur, target, rate) : null;
  const expectedNow = p.start && calc ? Math.max(target, p.start.kg * Math.pow(1 - rate, diffDays(today(), p.start.date) / 7)) : null;
  return `<div class="page-h"><a class="back" href="#/nutrition">‹</a><h1>⚖️ Plan de poids de ${esc(d.name)}</h1></div>
  <section class="card"><div class="field half"><label>Poids actuel (kg)</label><input id="wp-cur" type="number" inputmode="decimal" step="any" value="${cur || ''}"></div><div class="field half"><label>Poids cible (kg)</label><input id="wp-target" type="number" inputmode="decimal" step="any" value="${target || ''}"></div>
    <div class="field"><label>Rythme de perte</label><select id="wp-rate">${rates.map(([v, l]) => `<option value="${v}" ${v === rate ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    ${band ? `<p class="mut small">Fourchette de la race : ${band[0]}–${band[1]} kg. Le poids cible idéal dépend de l’état corporel : validez-le avec votre vétérinaire.</p>` : ''}</section>
  ${calc ? `<section class="card center"><small class="mut">Ration quotidienne conseillée</small><div class="big-n">${calc.kcal} kcal</div><p class="mut">= besoin de base du poids cible${cat ? ' × 0,8' : ''}. ${d.food && d.food.kcal ? `Soit environ <b>${Math.round(calc.kcal / d.food.kcal * 100)} g</b> de croquettes à ${d.food.kcal} kcal/100 g.` : 'Renseignez les kcal/100 g dans « Ration » pour obtenir les grammes.'}</p>
    <p><b>${calc.weeks}</b> semaines environ · objectif vers le <b>${fmtDate(calc.date)}</b></p></section>
    <section class="card"><h2>Étapes</h2>${calc.miles.map(m => `<div class="row"><span class="ico">🎯</span><span class="grow"><b>Semaine ${m.w}</b><small>${fmtDate(addDays(today(), m.w * 7))}</small></span><span class="side">${fmtKg(m.kg)}</span></div>`).join('')}
    ${expectedNow ? `<p class="${lw && lw.kg <= expectedNow + 0.15 ? 'ok' : 'warn'}"><b>Suivi :</b> poids attendu aujourd’hui ${fmtKg(expectedNow)} · dernier poids ${lw ? fmtKg(lw.kg) : '—'}</p>` : ''}</section>
    <div class="actions-row"><button class="btn primary" data-act="wp-save">${p.start ? 'Mettre à jour le plan' : 'Démarrer ce plan'}</button>${p.start ? '<button class="btn danger" data-act="wp-clear">Arrêter le plan</button>' : ''}</div>
    <section class="card note"><b>À respecter</b><ul class="bul"><li>Pesez tous les 15 jours, toujours dans les mêmes conditions.</li><li>Comptez les friandises dans la ration (10 % maximum).</li><li>${cat ? 'Chat : ne dépassez jamais 2 % de perte par semaine et ne le faites jamais jeûner (risque hépatique grave).' : 'Augmentez progressivement l’activité.'}</li><li>Validez le plan avec votre vétérinaire.</li></ul></section>` : '<section class="card"><p class="empty">Renseignez un poids cible inférieur au poids actuel pour obtenir votre plan.</p></section>'}`;
};
ROUTES['plan-poids'].after = () => {
  const els = ['wp-cur', 'wp-target', 'wp-rate'].map(id => $('#' + id)); if (!els[0]) return;
  els.forEach(x => { x.onchange = () => { WP.cur = num(els[0].value); WP.target = num(els[1].value); WP.rate = num(els[2].value); render(true); }; });
};
ACT['wp-save'] = () => { const d = dog(), cur = num($('#wp-cur').value), target = num($('#wp-target').value), rate = num($('#wp-rate').value); if (!cur || !target || target >= cur) return toast('Le poids cible doit être inférieur au poids actuel'); d.wplan = { start: { kg: cur, date: today() }, target, rate }; Object.keys(WP).forEach(k => delete WP[k]); save(); render(true); toast('Plan enregistré ✓'); };
ACT['wp-clear'] = () => { dog().wplan = null; save(); render(true); };
