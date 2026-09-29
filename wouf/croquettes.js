'use strict';
/* Wouf — comparateur de croquettes : écrans. Le calcul est dans nutrition.js (testé séparément).
   Les produits sont ceux que l'utilisateur saisit (ou importe depuis Open Pet Food Facts) : aucune donnée inventée. */

/* ---------- Profil nutritionnel de l'animal ---------- */
function foodProfile(d) {
  const sp = spOf(d).id, size = dogSize(d), y = d.birth ? ageYears(d.birth) : 3;
  const growthEnd = sp === 'cat' ? 1 : size === 'XL' ? 1.5 : size === 'L' ? 1.25 : 1;
  const stage = d.birth && y < growthEnd ? 'growth' : d.birth && y >= SENIOR_AGE[size] ? 'senior' : 'adult';
  const ws = weightStatus(d), overweight = !!(ws && /au-dessus/i.test(ws.txt));
  let auto = 'normal';
  if (typeof dogWalks === 'function' && sp === 'dog') { const w = dogWalks(d.id).filter(x => diffDays(today(), x.date) < 30); if (w.length >= 4) { const r = sum(w.map(x => x.dur)) / 60 / 30 / dailyGoal(d); auto = r >= 1.2 ? 'high' : r < 0.4 ? 'low' : 'normal'; } }
  return { species: sp, stage, size, activity: d.activity || auto, activityAuto: !d.activity, neutered: !!d.neutered, overweight, months: d.birth ? ageMonths(d.birth) : null };
}
function foodKcalNeed(d, prof) {
  const lw = lastWeight(d.id); if (!lw) return null;
  const F = nutFactorsOf(d), get = k => (F.find(x => x[0] === k) || [0, 0, 1.4])[2];
  let f;
  if (prof.stage === 'growth') f = get(prof.months != null && prof.months < 4 ? 'pup4' : 'pup12');
  else if (prof.stage === 'senior') f = get('senior');
  else { const base = get(prof.neutered ? 'neutered' : 'intact'); f = prof.activity === 'sport' ? get('active') : prof.activity === 'high' ? (base + get('active')) / 2 : (prof.activity === 'low' || prof.overweight) ? get('inactive') : base; }
  return { kcal: dailyKcal(lw.kg, f), kg: lw.kg, factor: f };
}
function foodTips(d, prof) {
  const b = dogBreed(d), pred = b ? b.pred.join(' ').toLowerCase() : '', tips = [];
  if (prof.stage === 'growth') tips.push(prof.species === 'dog' && (prof.size === 'L' || prof.size === 'XL') ? 'Chiot de grande race : choisissez un aliment « croissance grandes races » (calcium entre 1 et 1,5 % de la MS, énergie maîtrisée) pour une croissance lente, protectrice des articulations. Ne complétez jamais en calcium.' : 'En croissance : préférez un aliment conçu pour cet âge, en plusieurs repas (3 à 4 avant 6 mois).');
  if (prof.stage === 'senior') tips.push('Senior en bonne santé : ne réduisez pas les protéines sans avis vétérinaire (elles préservent la masse musculaire) ; surveillez le poids, les dents et la soif.');
  if (prof.overweight) tips.push('Surpoids : visez une énergie contrôlée et des fibres plus élevées, pesez la ration et comptez les friandises (10 % maximum). Voir le plan de perte de poids.');
  if (/obésité/.test(pred)) tips.push('Race prédisposée à l’obésité : gardez une énergie modérée, pesez la ration et bougez régulièrement.');
  if (/allerg|dermat|peau/.test(pred)) tips.push('Peau sensible : privilégiez une recette à source de protéines animales unique et courte liste d’ingrédients ; en cas de démangeaisons, un régime d’exclusion se fait avec le vétérinaire.');
  if (/torsion/.test(pred)) tips.push('Risque de torsion d’estomac : répartissez la ration en 2 à 3 repas, évitez l’effort juste après manger.');
  if (/dysplasie|articul|arthrose|ligament/.test(pred)) tips.push('Articulations fragiles : contrôlez strictement le poids ; des oméga-3 (EPA/DHA) peuvent aider, à discuter avec votre vétérinaire.');
  if (/cardi|valvul|cœur/.test(pred)) tips.push('Prédisposition cardiaque : un sodium modéré et, chez le chat, une taurine suffisante comptent ; demandez conseil avant tout changement.');
  if (/rénal|rein|polykyst|calcul|urinaire/.test(pred)) tips.push('Reins ou voies urinaires fragiles : favorisez l’alimentation humide et l’hydratation ; un régime spécifique (phosphore contrôlé) relève du vétérinaire.');
  if (/dent/.test(pred) || prof.size === 'S') tips.push('Petite gueule ou dents fragiles : croquettes de petite taille, brossage régulier.');
  if (prof.species === 'cat') tips.push('Chat : associez si possible alimentation humide (hydratation) et croquettes ; vérifiez la mention « aliment complet » (taurine incluse) ; un chat qui ne mange plus 24 à 48 h doit être vu par un vétérinaire.');
  if (prof.activity === 'sport') tips.push('Animal sportif : besoins énergétiques élevés, aliment riche en protéines et en graisses de qualité, fractionné autour de l’effort.');
  return tips;
}
const foodsFor = d => (S.foods || []).filter(f => f.species === spOf(d).id);
function evalFood(d, prof, f, need) {
  const sc = scoreFood(f, prof), ppk = foodPricePerKg(f);
  let g = null, day = null, month = null, per1000 = null;
  if (need && sc.kcal) { g = rationGrams(need.kcal, sc.kcal.v); if (ppk) { day = costPerDay(g, ppk); month = day * 30.4; } }
  if (ppk && sc.kcal) per1000 = ppk / (sc.kcal.v * 10) * 1000;   // € pour 1000 kcal
  return { f, sc, ppk, g, day, month, per1000, hits: allergyHits(d.allergies, sc.ingredients.allergens) };
}
const fmt = (v, u = '', dec = 1) => v == null ? '—' : v.toLocaleString('fr-FR', { maximumFractionDigits: dec }) + u;
const lvlIcon = l => ({ ok: '✅', warn: '⚠️', bad: '⛔', na: '❔' }[l] || '•');

/* ---------- Écran principal ---------- */
const FSEL = { compare: true };
ROUTES.croquettes = function croquettes() {
  const d = dog(), prof = foodProfile(d), t = nutTargets(prof), need = foodKcalNeed(d, prof), sp = spOf(d), b = dogBreed(d);
  const ranked = foodsFor(d).map(f => evalFood(d, prof, f, need)).sort((a, c) => c.sc.total - a.sc.total);
  const stageLbl = { growth: sp.young, adult: 'Adulte', senior: 'Senior' }[prof.stage], tips = foodTips(d, prof);
  const top = ranked.filter(r => !r.hits.length)[0];
  const cmp = ranked.slice(0, 4);
  const rows = [
    ['Note d’adéquation', r => `<b class="${r.sc.label[1]}">${r.sc.total}/100</b>`], ['Protéines (% MS)', r => fmt(r.sc.dm.protein)], ['Matières grasses (% MS)', r => fmt(r.sc.dm.fat)], ['Fibres (% MS)', r => fmt(r.sc.dm.fiber)],
    ['Glucides estimés (% MS)', r => fmt(r.sc.dm.nfe, '', 0)], ['Énergie (kcal/100 g)', r => r.sc.kcal ? Math.round(r.sc.kcal.v) + (r.sc.kcal.src === 'estimée' ? ' ~' : '') : '—'], ['Calcium (% MS)', r => fmt(r.sc.dm.ca, '', 2)],
    ['Prix au kg', r => r.ppk ? fmtMoney(Math.round(r.ppk * 100) / 100) : '—'], ['Ration (g/jour)', r => r.g ? Math.round(r.g) : '—'], ['Coût par jour', r => r.day != null ? fmtMoney(Math.round(r.day * 100) / 100) : '—'], ['Coût par mois', r => r.month != null ? fmtMoney(Math.round(r.month)) : '—'],
    ['Alerte allergie', r => r.hits.length ? `<b class="bad">${r.hits.map(k => ALLERGEN_LABEL[k]).join(', ')}</b>` : '—']
  ];
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🥣 Croquettes</h1></div>
  <section class="card"><div class="card-h"><h2>Profil de ${esc(d.name)}</h2></div>
    <p class="chips-i"><span class="pill">${sp.emoji} ${sp.noun === 'chat' ? 'Chat' : 'Chien'}${b ? ' · ' + esc(b.name) : ''}</span><span class="pill">${stageLbl}${d.birth ? ' · ' + esc(ageText(d.birth)) : ''}</span><span class="pill">${d.neutered ? 'Stérilisé(e)' : 'Non stérilisé(e)'}</span>${prof.overweight ? '<span class="pill warn">Surpoids</span>' : ''}${d.allergies ? '<span class="pill warn">Allergies : ' + esc(d.allergies.slice(0, 40)) + '</span>' : ''}</p>
    <p class="mut small">Activité ${prof.activityAuto ? '(estimée)' : ''} :</p>
    <div class="chips">${Object.entries(ACTIVITY).map(([k, l]) => `<button class="chip ${prof.activity === k ? 'on' : ''}" data-act="food-act" data-v="${k}">${l}</button>`).join('')}</div>
    ${need ? `<p><b>Besoin énergétique : ${Math.round(need.kcal)} kcal par jour</b> <small class="mut">(${fmtKg(need.kg)}, coefficient ${nuR1(need.factor)})</small></p>` : `<p class="warn">Ajoutez le poids de ${esc(d.name)} (Suivi) pour calculer la ration et le coût.</p>`}
    ${prof.months != null && prof.months < 3 ? '<p class="warn">Très jeune animal : avis vétérinaire pour le choix de l’alimentation.</p>' : ''}</section>
  <section class="card"><h2>Ce qu’il faut chercher pour ${esc(d.name)}</h2><p class="mut small">Repères en % de la matière sèche (MS), inspirés des recommandations FEDIAF et AAFCO.</p>
    <table class="kv tgt"><tr><th>Protéines</th><td>${t.protein[0]} à ${t.protein[1]} % <small class="mut">(minimum ${t.protein[2]} %)</small></td></tr><tr><th>Matières grasses</th><td>${t.fat[0]} à ${t.fat[1]} %</td></tr><tr><th>Fibres</th><td>${t.fiber[0]} à ${t.fiber[1]} %</td></tr>
    <tr><th>Énergie</th><td>${t.energy[0]} à ${t.energy[1]} kcal/100 g</td></tr>${prof.stage === 'growth' || t.ca ? `<tr><th>Calcium</th><td>${t.ca[0]} à ${t.ca[t.ca.length > 2 ? 2 : 1]} %${t.largeGrowth ? ' <b class="warn">(maximum strict pour les grands chiots)</b>' : ''}</td></tr>` : ''}</table>
    ${tips.length ? `<ul class="bul">${tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <p class="mut small">Recommandations générales : en cas de maladie (reins, cœur, diabète, allergie confirmée), le choix se fait avec votre vétérinaire.</p></section>
  <div class="actions-row"><button class="btn primary" data-act="food-add">＋ Ajouter un produit (composition de l’étiquette)</button><button class="btn" data-act="food-search">🔎 Chercher dans Open Pet Food Facts</button><a class="btn" href="#/croquettes-guide">📖 Bien lire une étiquette</a></div>
  ${ranked.length ? `<section class="card"><div class="card-h"><h2>Classement pour ${esc(d.name)}</h2></div>
    ${top ? `<p class="okmsg">🏆 Meilleur choix parmi vos produits : <b>${esc(top.f.name)}</b> (${top.sc.total}/100).</p>` : '<p class="warn">Aucun produit ne convient sans réserve : voir les alertes.</p>'}
    ${ranked.map((r, i) => `<a class="row food" href="#/croquette?id=${r.f.id}"><span class="rank">${i + 1}</span><span class="grow"><b>${esc(r.f.name)}</b><small>${esc(r.f.brand || '')} · ${esc(FOOD_STAGES[r.f.stage] || '')}${r.g ? ' · ' + Math.round(r.g) + ' g/jour' : ''}${r.month != null ? ' · ' + fmtMoney(Math.round(r.month)) + '/mois' : ''}</small>${r.hits.length ? `<small class="bad">⛔ Contient : ${r.hits.map(k => ALLERGEN_LABEL[k]).join(', ')}</small>` : ''}</span><span class="side"><span class="score-badge ${r.sc.label[1]}">${r.sc.total}</span><small>${esc(r.sc.label[0])}</small></span></a>`).join('')}</section>` : `<section class="card"><p class="empty">Ajoutez les croquettes ou pâtées que vous hésitez à acheter (recopiez la « composition analytique » du sac : protéines, matières grasses, cellulose, cendres, humidité). Wouf les note pour ${esc(d.name)}, calcule la ration et le coût.</p></section>`}
  ${cmp.length >= 2 ? `<section class="card"><h2>Comparaison côte à côte</h2><div class="table-scroll"><table class="cmp"><thead><tr><th></th>${cmp.map(r => `<th><a href="#/croquette?id=${r.f.id}">${esc(r.f.name.slice(0, 22))}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([l, fn]) => `<tr><th>${l}</th>${cmp.map(r => `<td>${fn(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="mut small">« ~ » : énergie estimée à partir de la composition (±15 %). Comparaison sur la matière sèche : pâtées et croquettes se comparent à armes égales.</p></section>` : ''}
  <p class="mut small center">La note évalue l’adéquation aux repères pour le profil de votre animal, à partir des valeurs saisies. Elle ne dit pas qu’un produit est « bon » ou « mauvais » dans l’absolu et ne remplace pas un avis vétérinaire.</p>`;
};
ACT['food-act'] = ({ v }) => { dog().activity = v; save(); render(true); };

/* ---------- Fiche d'un produit ---------- */
ROUTES.croquette = function croquette() {
  const d = dog(), f = (S.foods || []).find(x => x.id === routeParam('id'));
  if (!f) return '<p class="empty">Produit introuvable.</p><a class="btn" href="#/croquettes">Retour</a>';
  const prof = foodProfile(d), need = foodKcalNeed(d, prof), r = evalFood(d, prof, f, need), sc = r.sc, R = 34, C = 2 * Math.PI * R;
  const ring = `<svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="${R}" class="trk"/><circle cx="40" cy="40" r="${R}" class="val ${sc.label[1]}" stroke-dasharray="${(C * sc.total / 100).toFixed(1)} ${C.toFixed(1)}"/><text x="40" y="46" text-anchor="middle">${sc.total}</text></svg>`;
  return `<div class="page-h"><a class="back" href="#/croquettes">‹</a><h1>${esc(f.name)}</h1></div>
  <section class="card"><div class="score">${ring}<div><b>${esc(sc.label[0])}</b> pour ${esc(d.name)}<br><small class="mut">${esc(f.brand || '')} · ${esc(FOOD_TYPES[f.type || 'dry'].label)} · ${esc(FOOD_STAGES[f.stage] || '')}</small>${sc.missing ? `<br><small class="warn">${sc.missing} donnée(s) manquante(s) : note partielle</small>` : ''}</div></div>
    ${r.hits.length ? `<p class="bad"><b>⛔ Allergie déclarée : contient ${r.hits.map(k => ALLERGEN_LABEL[k]).join(', ')}.</b> À éviter.</p>` : ''}</section>
  <section class="card"><h2>Détail de la note</h2>${sc.parts.map(p => `<div class="row part"><span class="ico">${lvlIcon(p.lvl)}</span><span class="grow"><b>${esc(p.label)}</b><small>${esc(p.msg)}</small></span><span class="side">${nuR1(p.pts)}/${p.max}</span></div>`).join('')}</section>
  ${sc.flags.length ? `<section class="card"><h2>Observations sur la composition</h2>${sc.flags.map(x => `<p>${lvlIcon(x.lvl)} ${esc(x.msg)}</p>`).join('')}${sc.ingredients.items.length ? `<details><summary>Liste d’ingrédients saisie</summary><p>${esc(f.ingredients)}</p></details>` : ''}</section>` : ''}
  <section class="card"><h2>Ration et coût pour ${esc(d.name)}</h2>${r.g ? `<div class="kv-line"><span>Ration<b>${Math.round(r.g)} g/jour</b></span><span>Énergie<b>${Math.round(sc.kcal.v)} kcal/100 g</b></span>${r.day != null ? `<span>Coût<b>${fmtMoney(Math.round(r.day * 100) / 100)}/jour</b></span><span>Par mois<b>${fmtMoney(Math.round(r.month))}</b></span>` : ''}</div>
    <p class="mut small">Besoin de ${Math.round(need.kcal)} kcal/jour. Répartissez en ${prof.stage === 'growth' ? '3 à 4' : '2'} repas. Ajustez de 10 % selon le poids et l’état corporel ; comptez les friandises.${r.per1000 ? ' Prix : ' + fmtMoney(Math.round(r.per1000 * 100) / 100) + ' pour 1 000 kcal.' : ''}</p>` : '<p class="empty">Ajoutez le poids de l’animal et la composition (ou les kcal) pour calculer la ration.</p>'}</section>
  <div class="actions-row"><button class="btn" data-act="food-edit" data-id="${f.id}">✎ Modifier</button><button class="btn danger" data-act="food-del" data-id="${f.id}">Supprimer</button></div>
  <p class="mut small center">Valeurs saisies par vous d’après l’étiquette. Vérifiez-les sur le sac : la note n’a de sens que si elles sont exactes.</p>`;
};
ACT['food-del'] = async ({ id }) => { if (await ask('Supprimer ce produit ?', 'Supprimer')) { S.foods = S.foods.filter(f => f.id !== id); save(); location.hash = '#/croquettes'; } };

/* ---------- Formulaire produit ---------- */
function foodForm(f = {}, editing = false, note = '') {
  const d = dog();
  openForm({
    title: editing ? 'Modifier le produit' : 'Ajouter un produit', submit: 'Enregistrer',
    intro: (note ? `<p class="note-import">${note}</p>` : '') + '<p class="mut small">Recopiez la <b>composition analytique</b> du sac (en %, « tel que vendu »). Sans elle, la note reste partielle.</p>',
    fields: [
      { n: 'type', l: 'Type', t: 'select', v: f.type || 'dry', opts: Object.entries(FOOD_TYPES).map(([k, v]) => [k, v.label]), cls: 'half' },
      { n: 'stage', l: 'Destiné à', t: 'select', v: f.stage || 'adult', opts: Object.entries(FOOD_STAGES), cls: 'half' },
      { n: 'name', l: 'Nom du produit', v: f.name, req: true, ph: 'Ex. Adulte poulet et riz' },
      { n: 'brand', l: 'Marque', v: f.brand },
      { n: 'price', l: 'Prix du sac (€)', t: 'number', v: f.price, min: 0, cls: 'half' }, { n: 'bagKg', l: 'Poids du sac (kg)', t: 'number', v: f.bagKg, min: 0, cls: 'half' },
      { n: 'protein', l: 'Protéines brutes (%)', t: 'number', v: f.protein, req: true, min: 0, cls: 'half' }, { n: 'fat', l: 'Matières grasses brutes (%)', t: 'number', v: f.fat, req: true, min: 0, cls: 'half' },
      { n: 'fiber', l: 'Cellulose brute (%)', t: 'number', v: f.fiber, min: 0, cls: 'half' }, { n: 'ash', l: 'Cendres brutes (%)', t: 'number', v: f.ash, min: 0, cls: 'half' },
      { n: 'moisture', l: 'Humidité (%)', t: 'number', v: f.moisture, min: 0, cls: 'half', hint: 'Vide : 10 % (croquettes), 78 % (pâtée).' }, { n: 'kcalKg', l: 'Énergie (kcal/kg)', t: 'number', v: f.kcalKg, min: 0, cls: 'half', hint: 'Facultatif, sinon estimée.' },
      { n: 'ca', l: 'Calcium (%)', t: 'number', v: f.ca, min: 0, cls: 'half', hint: 'Essentiel pour un chiot de grande race.' }, { n: 'p', l: 'Phosphore (%)', t: 'number', v: f.p, min: 0, cls: 'half' },
      { n: 'ingredients', l: 'Composition (liste d’ingrédients)', t: 'textarea', v: f.ingredients, ph: 'Poulet déshydraté (30 %), riz, graisse de volaille…' },
      { n: 'barcode', l: 'Code-barres (facultatif)', v: f.barcode }
    ],
    onSubmit(v) {
      const sumv = (v.protein || 0) + (v.fat || 0) + (v.fiber || 0) + (v.ash || 0) + (v.moisture != null ? v.moisture : (FOOD_TYPES[v.type] || FOOD_TYPES.dry).moisture);
      if (sumv > 100) { toast('Les pourcentages dépassent 100 % : vérifiez la composition (humidité comprise).'); return false; }
      if ((v.price && !v.bagKg) || (!v.price && v.bagKg)) { toast('Indiquez le prix ET le poids du sac pour calculer le coût.'); return false; }
      const rec = { id: editing ? f.id : uid(), species: editing ? f.species : spOf(d).id, ...v };
      if (editing) S.foods[S.foods.findIndex(x => x.id === f.id)] = rec; else S.foods.push(rec);
      save(); toast('Produit enregistré ✓'); location.hash = '#/croquettes'; render(true);
    }
  });
}
ACT['food-add'] = () => foodForm();
ACT['food-edit'] = ({ id }) => foodForm(S.foods.find(f => f.id === id), true);

/* ---------- Recherche Open Pet Food Facts (base collaborative : données à vérifier) ---------- */
const OPFF = 'https://world.openpetfoodfacts.org', OPFF_FIELDS = 'code,product_name,brands,quantity,ingredients_text,ingredients_text_fr,nutriments';
let OPFF_RES = [];
async function opffSearch(q) {
  q = q.trim();
  if (/^\d{8,14}$/.test(q)) { const j = await (await fetch(`${OPFF}/api/v2/product/${q}.json?fields=${OPFF_FIELDS}`)).json(); return j.status === 1 && j.product ? [j.product] : []; }
  const j = await (await fetch(`${OPFF}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${OPFF_FIELDS}`)).json();
  return j.products || [];
}
function fromOPFF(p) {
  const n = p.nutriments || {}, g = (...ks) => { for (const k of ks) if (n[k] != null && isFinite(+n[k])) return +n[k]; return ''; };
  return { name: p.product_name || '', brand: (p.brands || '').split(',')[0].trim(), barcode: p.code || '', ingredients: p.ingredients_text_fr || p.ingredients_text || '',
    protein: g('proteins_100g', 'proteins'), fat: g('fat_100g', 'fat'), fiber: g('fiber_100g', 'fiber'), ash: g('ash_100g', 'ash'), moisture: g('moisture_100g', 'moisture'), kcalKg: n['energy-kcal_100g'] != null && isFinite(+n['energy-kcal_100g']) ? Math.round(+n['energy-kcal_100g'] * 10) : '' };
}
ACT['food-search'] = () => {
  const el = sheet(`<div class="sheet-head"><h2>Open Pet Food Facts</h2><button class="x" data-close>✕</button></div>
    <p class="mut small">Base collaborative et gratuite de produits pour animaux. Elle est incomplète : les valeurs importées sont à <b>vérifier sur l’étiquette</b>.</p>
    <form id="food-q" class="inline"><input name="q" placeholder="Nom du produit ou code-barres" autocomplete="off" required><button class="btn primary">Chercher</button></form><div id="food-res"></div>`);
  $('#food-q', el).onsubmit = async e => {
    e.preventDefault(); const res = $('#food-res', el), q = e.target.q.value; res.innerHTML = '<p class="loading">🔎 Recherche…</p>';
    try {
      OPFF_RES = (await opffSearch(q)).filter(p => p.product_name);
      res.innerHTML = OPFF_RES.length ? `<div class="list">${OPFF_RES.map((p, i) => `<button class="row" data-act="food-pick" data-i="${i}"><span class="ico">🥣</span><span class="grow"><b>${esc(p.product_name)}</b><small>${esc((p.brands || '').split(',')[0])}${p.quantity ? ' · ' + esc(p.quantity) : ''}</small></span><span class="chev">›</span></button>`).join('')}</div>` : '<p class="empty">Aucun résultat. Essayez un autre nom ou ajoutez le produit à la main depuis l’étiquette.</p>';
    } catch (err) { res.innerHTML = '<p class="warn">Recherche impossible (hors connexion ou service indisponible). Ajoutez le produit à la main depuis l’étiquette.</p>'; }
  };
};
ACT['food-pick'] = ({ i }) => { const p = OPFF_RES[+i]; if (!p) return; closeAllSheets(); const f = fromOPFF(p); const miss = ['protein', 'fat', 'fiber', 'ash', 'moisture'].filter(k => f[k] === '').length; foodForm({ ...f, type: 'dry', stage: 'adult' }, false, `📥 Importé d’Open Pet Food Facts (base collaborative). <b>Vérifiez chaque valeur sur le sac</b>${miss ? ` : ${miss} valeur(s) manquante(s) à compléter` : ''}.`); };

/* ---------- Guide de lecture d'étiquette ---------- */
const GUIDE_FOOD = [
  ['La composition analytique compte plus que la belle photo', 'Elle indique les % de protéines, matières grasses, cellulose, cendres et humidité. C’est le seul moyen de comparer objectivement deux produits. La liste d’ingrédients, elle, dit ce qu’il y a dedans, pas en quelle quantité utile.'],
  ['Comparer en matière sèche (MS)', 'Une pâtée à 9 % de protéines et 80 % d’eau contient en réalité 45 % de protéines dans sa matière sèche, bien plus qu’une croquette à 26 % (soit 29 % de la MS). Wouf convertit tout en MS pour comparer à armes égales : MS = valeur × 100 ÷ (100 − humidité).'],
  ['« Complet » ou « complémentaire » ?', 'Seul un aliment « complet » peut être donné seul chaque jour : il couvre tous les besoins (vitamines, minéraux, et taurine pour le chat). Un aliment « complémentaire » (friandises, certaines pâtées) ne suffit pas.'],
  ['L’ordre des ingrédients', 'Ils sont classés par poids avant cuisson. Une viande fraîche pèse environ 70 % d’eau : elle apparaît en tête mais pèse peu une fois cuite. Une viande déshydratée (« farine de poulet ») est plus concentrée en protéines. Préférez une source animale précise (« poulet ») à une mention vague (« viandes et sous-produits animaux »).'],
  ['Céréales, « sans céréales » et légumineuses', 'Les céréales ne sont pas mauvaises pour un chien en bonne santé, et « sans céréales » n’est pas un gage de qualité (souvent remplacées par pois ou pomme de terre). Une enquête américaine a étudié un lien possible entre certains régimes très riches en légumineuses et des atteintes cardiaques chez le chien : en cas de doute, demandez conseil à votre vétérinaire.'],
  ['Sous-produits, arômes, colorants, conservateurs', 'Des abats nommés (foie de poulet) sont nutritifs. Les « sous-produits » sans précision sont plus incertains. Les colorants sont inutiles pour l’animal. Préférez des antioxydants naturels (tocophérols, romarin) aux BHA, BHT ou éthoxyquine.'],
  ['Énergie et ration', 'Deux sacs de même poids ne nourrissent pas pareil : un aliment de 4 000 kcal/kg demande 20 % de moins de grammes qu’un aliment de 3 300 kcal/kg. Le prix au kilo est donc trompeur : comparez le coût par jour ou pour 1 000 kcal, comme le fait Wouf.'],
  ['Changer de croquettes', 'Sur 7 à 10 jours : 25 % de nouveau pendant 2 à 3 jours, puis 50 %, 75 %, 100 %. Une transition brutale provoque diarrhées et refus. Chez le chat, allez encore plus lentement.'],
  ['Conservation', 'Sac fermé, au sec, à l’abri de la chaleur ; utilisez-le dans les 6 semaines suivant l’ouverture ; gardez-le dans son sac d’origine placé dans un bac hermétique (les graisses rancissent).'],
  ['Les signes d’un aliment qui convient', 'Selles moulées, poil brillant, énergie stable, poids stable, bon appétit. Selles molles chroniques, démangeaisons, poil terne, ballonnements : changez progressivement et consultez si cela persiste.'],
  ['Régimes médicaux', 'Insuffisance rénale ou cardiaque, diabète, calculs urinaires, allergies alimentaires confirmées : ce sont des régimes vétérinaires. N’utilisez pas ce comparateur pour choisir un aliment thérapeutique.'],
  ['Spécificités du chat', 'Carnivore strict : besoin élevé en protéines animales, en taurine et en eau. L’alimentation humide protège les reins et les voies urinaires ; visez peu de glucides. Un chat ne doit jamais rester plus de 24 à 48 heures sans manger.']
];
ROUTES['croquettes-guide'] = function croquettesGuide() {
  return `<div class="page-h"><a class="back" href="#/croquettes">‹</a><h1>📖 Bien lire une étiquette</h1></div>
  <p class="mut">Les clés pour choisir des croquettes ou des pâtées sans se laisser guider par le marketing.</p>
  ${GUIDE_FOOD.map(([t, b], i) => `<details class="card"><summary><b>${i + 1}. ${esc(t)}</b></summary><p>${esc(b)}</p></details>`).join('')}`;
};
