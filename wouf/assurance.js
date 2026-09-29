'use strict';
/* Wouf — comparateur d'assurance chien.
   Honnêteté d'abord : Wouf n'est pas courtier et ne connaît pas les tarifs en temps réel des assureurs.
   1) un SIMULATEUR de formules types (accident seul → excellence) chiffre le vrai coût d'un scénario de frais vétérinaires ;
   2) un COMPARATEUR de VRAIS DEVIS que l'utilisateur saisit, évalués avec la même méthode ;
   3) des liens pour obtenir des devis (liens partenaires si configurés dans config.js). */

const TIERS = [
  { id: 'acc',  name: 'Accident seul', taux: 0.8, plafond: 1500, franchise: 0, prev: 0, mult: 0.55, maladie: false, desc: 'Accidents uniquement (fracture, plaie, ingestion d’un corps étranger). Pas la maladie.' },
  { id: 'ess',  name: 'Essentielle',   taux: 0.5, plafond: 1000, franchise: 30, prev: 0, mult: 1, maladie: true, desc: 'Accident + maladie, remboursement de base.' },
  { id: 'conf', name: 'Confort',       taux: 0.7, plafond: 2000, franchise: 25, prev: 0, mult: 1.7, maladie: true, desc: 'Meilleur taux et plafond, le choix le plus courant.' },
  { id: 'prem', name: 'Premium',       taux: 0.9, plafond: 3500, franchise: 0, prev: 100, mult: 2.6, maladie: true, desc: 'Haut niveau de remboursement, forfait prévention (vaccins, antiparasitaires).' },
  { id: 'exc',  name: 'Excellence',    taux: 1.0, plafond: 6000, franchise: 0, prev: 150, mult: 3.4, maladie: true, desc: 'Remboursement à 100 %, plafond élevé, prévention.' }
];
const INS_BASE = { S: 11, M: 15, L: 20, XL: 27 };                  // €/mois, formule « Essentielle », chien adulte
const ageFactor = y => y < 1 ? 0.9 : y < 3 ? 1 : y < 6 ? 1.15 : y < 8 ? 1.5 : y < 10 ? 1.95 : 2.4;
const premiumFor = (t, d, years = ageYears(d.birth || iso(new Date(Date.now() - 3 * 365.25 * 864e5)))) =>
  INS_BASE[dogSize(d)] * t.mult * ageFactor(years) * ((dogBreed(d) || {}).risk || 1);
const INSURERS = [['santevet', 'Santévet'], ['assurpoil', 'Assur O’Poil'], ['bullebleue', 'Bulle Bleue'], ['dalma', 'Dalma'], ['leocare', 'Leocare'], ['groupama', 'Groupama'], ['axa', 'AXA'], ['allianz', 'Allianz']];
const CHECKLIST = [
  ['Délai de carence', 'Période sans remboursement après la souscription (souvent 30 jours pour la maladie, plus pour certaines opérations).'],
  ['Âge à la souscription et au renouvellement', 'Certains contrats refusent ou résilient à partir de 8–10 ans. Assurer tôt sécurise la suite.'],
  ['Maladies exclues', 'Maladies préexistantes, héréditaires ou congénitales, dysplasie, problèmes dentaires : vérifiez la liste des exclusions, surtout pour votre race.'],
  ['Plafond annuel ET par événement', 'Un plafond annuel élevé peut cacher un plafond par sinistre bas.'],
  ['Base de remboursement', 'Frais réels ou grille tarifaire de l’assureur ? Le taux de 70 % s’applique à quel montant ?'],
  ['Franchise', 'Par sinistre, par an, ou en pourcentage ? Elle réduit la valeur réelle du taux annoncé.'],
  ['Évolution de la prime', 'Hausse avec l’âge, hausse après sinistre, hausse annuelle : demandez la grille complète.'],
  ['Délais de remboursement et avance de frais', 'Tiers payant chez le vétérinaire ou remboursement a posteriori ?'],
  ['Prévention et soins courants', 'Vaccins, antiparasitaires, stérilisation, détartrage : inclus, en forfait, ou exclus ?'],
  ['Résiliation', 'Tacite reconduction, résiliation à tout moment après un an (loi Hamon), préavis.']
];
const SCENARIOS = {
  calm: { name: 'Année tranquille', acc: 0, mal: 80, rout: 250, txt: 'Suivi courant, une petite consultation.' },
  classic: { name: 'Année classique', acc: 150, mal: 400, rout: 250, txt: 'Une gastro, une otite, une boiterie.' },
  heavy: { name: 'Année difficile', acc: 1200, mal: 600, rout: 250, txt: 'Un accident avec radios + une maladie.' },
  bad: { name: 'Gros pépin', acc: 3000, mal: 1500, rout: 250, txt: 'Chirurgie lourde et hospitalisation.' }
};
const INS = { sc: 'classic', custom: { acc: 500, mal: 500, rout: 250 } };

function realCosts(id) {
  const from = addDays(today(), -365), ev = S.events.filter(e => e.dogId === id && e.date >= from && e.cost > 0);
  return { rout: sum(ev.filter(e => ROUTINE_TYPES.includes(e.type)).map(e => e.cost)), mal: sum(ev.filter(e => !ROUTINE_TYPES.includes(e.type)).map(e => e.cost)), n: ev.length };
}
function scenarioValues(d) {
  if (INS.sc === 'real') { const r = realCosts(d.id); return { name: 'Mon année réelle', acc: 0, mal: r.mal, rout: r.rout, txt: 'D’après vos coûts saisis sur 12 mois.' }; }
  if (INS.sc === 'custom') return { name: 'Personnalisé', ...INS.custom, txt: '' };
  return SCENARIOS[INS.sc];
}
/* remboursement d'une formule pour un scénario */
function reimburse(f, sc) {
  const cap = f.plafond > 0 ? f.plafond : Infinity;
  const eligible = sc.acc + (f.maladie ? sc.mal : 0);
  const main = Math.min(cap, Math.max(0, eligible - (f.franchise || 0)) * f.taux);
  return main + Math.min(f.prev || 0, sc.rout);
}
function evaluate(f, monthly, sc) {
  const prime = monthly * 12, total = sc.acc + sc.mal + sc.rout, back = reimburse(f, sc);
  let be = null;
  for (let x = 0; x <= 40000; x += 10) if (reimburse(f, { acc: 0, mal: x, rout: 0 }) >= prime && reimburse(f, { acc: 0, mal: x, rout: 0 }) > 0) { be = x; break; }
  if (f.maladie === false) for (let x = 0; x <= 40000; x += 10) if (reimburse(f, { acc: x, mal: 0, rout: 0 }) >= prime) { be = x; break; }
  return { prime, total, back, net: prime + total - back, save: total - (prime + total - back), be };
}
function lifetimePremium(t, d) {
  if (!d.birth) return null;
  const b = dogBreed(d), end = b ? (b.life[0] + b.life[1]) / 2 : 12;
  let s = 0; for (let y = Math.max(ageYears(d.birth), 0); y < end; y++) s += premiumFor(t, d, y) * 12;
  return Math.round(s);
}

function quoteForm(q = {}, editing = false) {
  openForm({
    title: editing ? 'Modifier le devis' : 'Saisir un devis reçu',
    intro: '<p class="mut">Recopiez les chiffres du devis de l’assureur pour le comparer honnêtement aux autres avec votre scénario.</p>',
    fields: [
      { n: 'insurer', l: 'Assureur', v: q.insurer, req: true, list: 'dl_ins' },
      { n: 'formula', l: 'Formule', v: q.formula, ph: 'Ex. Confort' },
      { n: 'monthly', l: 'Prime mensuelle (€)', t: 'number', v: q.monthly, req: true, min: 0, cls: 'half' },
      { n: 'taux', l: 'Taux de remboursement (%)', t: 'number', v: q.taux, req: true, min: 0, cls: 'half' },
      { n: 'plafond', l: 'Plafond annuel (€, 0 = illimité)', t: 'number', v: q.plafond ?? '', cls: 'half' },
      { n: 'franchise', l: 'Franchise annuelle (€)', t: 'number', v: q.franchise ?? 0, cls: 'half' },
      { n: 'prev', l: 'Forfait prévention (€/an)', t: 'number', v: q.prev ?? 0, cls: 'half' },
      { n: 'carence', l: 'Carence maladie (jours)', t: 'number', v: q.carence ?? 30, cls: 'half' },
      { n: 'maladie', l: 'Couvre la maladie (pas seulement les accidents)', t: 'checkbox', v: q.maladie ?? true },
      { n: 'notes', l: 'Notes (exclusions, limite d’âge…)', t: 'textarea', v: q.notes }
    ],
    extra: `<datalist id="dl_ins">${INSURERS.map(i => `<option value="${esc(i[1])}">`).join('')}</datalist>`,
    onSubmit(v) {
      const rec = { id: editing ? q.id : uid(), dogId: dog().id, ...v, taux: v.taux, plafond: v.plafond || 0 };
      if (editing) S.quotes[S.quotes.findIndex(x => x.id === q.id)] = rec; else S.quotes.push(rec);
      save(); render(true); toast('Devis enregistré ✓');
    },
    onDelete: editing ? () => { S.quotes = S.quotes.filter(x => x.id !== q.id); save(); render(true); } : null
  });
}
ACT['add-quote'] = () => quoteForm();
ACT['edit-quote'] = ({ id }) => quoteForm(S.quotes.find(q => q.id === id), true);
ACT['ins-sc'] = ({ sc }) => { INS.sc = sc; render(true); };
document.addEventListener('input', e => {
  if (!e.target.matches('[data-ins-custom]')) return;
  INS.custom[e.target.dataset.insCustom] = num(e.target.value);
  const keep = e.target.dataset.insCustom, pos = e.target.selectionStart; render(true);
  const el = $(`[data-ins-custom="${keep}"]`); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (er) { /* type number */ } }
});

function policyForm() {
  const d = dog(), p = d.insurance || {};
  openForm({
    title: 'Mon assurance actuelle',
    fields: [
      { n: 'insurer', l: 'Assureur', v: p.insurer, list: 'dl_ins' }, { n: 'formula', l: 'Formule', v: p.formula }, { n: 'policy', l: 'N° de contrat', v: p.policy },
      { n: 'monthly', l: 'Prime mensuelle (€)', t: 'number', v: p.monthly, min: 0, cls: 'half' }, { n: 'renewal', l: 'Date de renouvellement', t: 'date', v: p.renewal, cls: 'half', hint: 'Wouf vous rappelle l’échéance : idéal pour comparer avant de renouveler.' }
    ],
    extra: `<datalist id="dl_ins">${INSURERS.map(i => `<option value="${esc(i[1])}">`).join('')}</datalist>`,
    onSubmit(v) { d.insurance = v; save(); render(true); },
    onDelete: p.insurer ? () => { d.insurance = {}; save(); render(true); } : null
  });
}
ACT.policy = policyForm;

ROUTES.assurance = function assurance() {
  const d = dog(), sc = scenarioValues(d), b = dogBreed(d), size = dogSize(d), y = d.birth ? ageYears(d.birth) : null, p = d.insurance || {};
  const rows = TIERS.map(t => { const m = premiumFor(t, d); return { t, m, ...evaluate(t, m, sc) }; });
  const best = [...rows].sort((a, c) => a.net - c.net)[0], none = sc.acc + sc.mal + sc.rout;
  const qrows = S.quotes.filter(q => q.dogId === d.id).map(q => ({ q, ...evaluate({ taux: q.taux / 100, plafond: q.plafond, franchise: q.franchise, prev: q.prev, maladie: q.maladie }, q.monthly, sc) })).sort((a, c) => a.net - c.net);
  const aff = CFG.affiliates || {}, hasAff = INSURERS.some(i => aff[i[0]]);
  const chart = barChart([{ l: 'Sans', v: none, cls: 'none' }].concat(rows.map(r => ({ l: r.t.name.split(' ')[0].slice(0, 9), v: r.net, cls: r === best ? 'best' : '' }))));
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🛡️ Assurance chien</h1></div>
  <section class="card note"><b>Comment ça marche</b><p>Wouf calcule combien votre chien vous coûterait <em>réellement</em> sur un an avec chaque niveau de couverture, selon les frais vétérinaires que vous imaginez. Les primes des formules types sont des <b>estimations de marché</b> (non contractuelles) ; pour un chiffrage exact, saisissez de vrais devis plus bas.</p></section>

  <section class="card"><div class="card-h"><h2>Profil de ${esc(d.name)}</h2></div>
    <p class="chips-i"><span class="pill">${SIZE_LABEL[size]}</span><span class="pill">${y !== null ? ageText(d.birth) : 'âge inconnu'}</span><span class="pill">${b ? esc(b.name) : 'race non renseignée'}</span>${b && b.risk >= 1.3 ? '<span class="pill warn">Race à risque santé élevé</span>' : ''}</p>
    ${b ? `<p class="mut">Prédispositions de la race : ${b.pred.map(esc).join(', ')}. Vérifiez qu’elles ne sont pas exclues du contrat.</p>` : '<p class="mut">Renseignez la race et la date de naissance pour affiner l’estimation.</p>'}
    <div class="row"><span class="ico">📄</span><span class="grow"><b>${p.insurer ? esc(p.insurer) + (p.formula ? ' – ' + esc(p.formula) : '') : 'Pas d’assurance enregistrée'}</b><small>${p.renewal ? 'Renouvellement le ' + fmtDate(p.renewal) : ''}${p.monthly ? ' · ' + fmtMoney(p.monthly) + '/mois' : ''}</small></span><button class="btn sm" data-act="policy">${p.insurer ? 'Modifier' : 'Ajouter'}</button></div></section>

  <section class="card"><h2>1. Quels frais vétérinaires prévoir ?</h2>
    <div class="chips scroll">${[...Object.entries(SCENARIOS).map(([k, v]) => [k, v.name]), ['real', 'Mon année réelle'], ['custom', 'Personnalisé']].map(([k, l]) => `<button class="chip ${INS.sc === k ? 'on' : ''}" data-act="ins-sc" data-sc="${k}">${l}</button>`).join('')}</div>
    <p class="mut">${esc(sc.txt || '')} ${INS.sc === 'real' && !realCosts(d.id).n ? '<b>Aucun coût saisi sur 12 mois : renseignez le coût dans vos événements du carnet.</b>' : ''}</p>
    ${INS.sc === 'custom' ? `<div class="triple"><div class="field"><label>Accidents (€)</label><input data-ins-custom="acc" type="number" inputmode="decimal" value="${INS.custom.acc}"></div><div class="field"><label>Maladies (€)</label><input data-ins-custom="mal" type="number" inputmode="decimal" value="${INS.custom.mal}"></div><div class="field"><label>Soins courants (€)</label><input data-ins-custom="rout" type="number" inputmode="decimal" value="${INS.custom.rout}"></div></div>` : `<p class="kv-line"><span>Accidents <b>${fmtMoney(sc.acc)}</b></span><span>Maladies <b>${fmtMoney(sc.mal)}</b></span><span>Soins courants <b>${fmtMoney(sc.rout)}</b></span></p>`}</section>

  <section class="card"><h2>2. Coût réel sur 12 mois</h2>
    ${chart}
    <p class="mut">Coût net = primes + frais − remboursements. Sans assurance : <b>${fmtMoney(none)}</b>.</p>
    <div class="ins-list">${rows.map(r => `<div class="ins ${r === best ? 'best' : ''}"><div class="ins-h"><b>${r.t.name}</b>${r === best ? '<span class="pill ok">Le moins cher pour ce scénario</span>' : ''}</div>
      <p class="mut small">${r.t.desc}</p>
      <div class="kv-line"><span>Prime <b>≈ ${fmtMoney(Math.round(r.m))}/mois</b><small> (${fmtMoney(Math.round(r.m * .8))}–${fmtMoney(Math.round(r.m * 1.25))})</small></span><span>Remboursé <b>${fmtMoney(Math.round(r.back))}</b></span><span>Coût net <b>${fmtMoney(Math.round(r.net))}</b></span></div>
      <p class="small ${r.save > 0 ? 'ok' : 'mut'}">${r.save > 0 ? `Vous économisez ${fmtMoney(Math.round(r.save))} sur l’année` : `Vous payez ${fmtMoney(Math.round(-r.save))} de plus que sans assurance sur ce scénario`}${r.be ? ` · rentable dès ≈ ${fmtMoney(r.be)} de frais/an` : ''}</p>
      <p class="small mut">Taux ${Math.round(r.t.taux * 100)} % · plafond ${fmtMoney(r.t.plafond)}/an${r.t.franchise ? ' · franchise ' + fmtMoney(r.t.franchise) : ''}${r.t.prev ? ' · prévention ' + fmtMoney(r.t.prev) : ''}</p></div>`).join('')}</div>
    ${y !== null ? `<p class="mut small">Sur toute sa vie (≈ ${b ? Math.round((b.life[0] + b.life[1]) / 2) : 12} ans), la formule « Confort » représenterait environ <b>${fmtMoney(lifetimePremium(TIERS[2], d))}</b> de primes, la prime augmentant avec l’âge.</p>` : ''}
    <p class="mut small">L’assurance vaut surtout pour se protéger d’un gros pépin (chirurgie, hospitalisation) plus que pour rentabiliser chaque année. Un chien assuré tôt, avant les premiers problèmes de santé, est mieux couvert.</p></section>

  <section class="card"><div class="card-h"><h2>3. Comparer de vrais devis</h2><button class="btn sm primary" data-act="add-quote">＋ Devis</button></div>
    ${qrows.length ? qrows.map((r, i) => `<button class="row" data-act="edit-quote" data-id="${r.q.id}"><span class="ico">${i === 0 ? '🏆' : '📋'}</span><span class="grow"><b>${esc(r.q.insurer)}${r.q.formula ? ' – ' + esc(r.q.formula) : ''}</b><small>${fmtMoney(r.q.monthly)}/mois · ${r.q.taux} % · plafond ${r.q.plafond ? fmtMoney(r.q.plafond) : 'illimité'}${r.q.franchise ? ' · franchise ' + fmtMoney(r.q.franchise) : ''}${r.q.maladie ? '' : ' · accident seul'}</small></span><span class="side"><b>${fmtMoney(Math.round(r.net))}</b><small>coût net/an</small></span></button>`).join('') + '<p class="mut small">Classés par coût net pour le scénario choisi. À égalité, comparez aussi carences, exclusions et âge limite.</p>' : '<p class="empty">Demandez 2 ou 3 devis (liens ci-dessous) et saisissez-les ici : Wouf les classe pour vous.</p>'}</section>

  <section class="card"><h2>4. Demander un devis</h2><p class="mut">Assureurs proposant des assurances pour chiens (liste non exhaustive, sans classement ni recommandation).${hasAff ? ' Les liens marqués « partenaire » peuvent rémunérer Wouf, sans surcoût pour vous.' : ''}</p>
    <div class="ins-links">${INSURERS.map(([id, name]) => aff[id] ? `<a class="btn" href="${esc(aff[id])}" target="_blank" rel="sponsored noopener">${esc(name)} <small>partenaire</small></a>` : `<a class="btn" href="https://www.google.com/search?q=${encodeURIComponent('devis assurance chien ' + name)}" target="_blank" rel="noopener">${esc(name)}</a>`).join('')}</div></section>

  <section class="card"><h2>Les 10 points à vérifier avant de signer</h2>${CHECKLIST.map(([t, x]) => `<details><summary>${t}</summary><p>${x}</p></details>`).join('')}
    <p class="mut small">Wouf n’est ni assureur ni courtier. Les estimations sont indicatives et non contractuelles : seul le contrat de l’assureur fait foi.</p></section>`;
};
