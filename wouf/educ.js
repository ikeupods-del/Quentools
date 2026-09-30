'use strict';
/* Wouf Éducation — leçons, séances guidées, progression, badges, programme chiot. */

const routeParam = k => new URLSearchParams(location.hash.split('?')[1] || '').get(k);
const lessonOf = id => LESSONS.find(l => l.id === id);
const lessonsFor = d => LESSONS.filter(l => (l.sp || 'dog') === spOf(d).id);
const programsFor = d => PROGRAMS.filter(p => p.sp === spOf(d).id);
const principlesFor = d => (spOf(d).id === 'cat' ? PRINCIPLES_CAT : PRINCIPLES);
const eduGet = (dogId, lid) => ((S.edu || {})[dogId] || {})[lid] || { steps: {}, sessions: [], done: false };
function eduSet(dogId, lid) { S.edu = S.edu || {}; S.edu[dogId] = S.edu[dogId] || {}; return (S.edu[dogId][lid] = S.edu[dogId][lid] || { steps: {}, sessions: [], done: false }); }
const lessonUnlocked = l => l.free || allowed('lessons');
const lessonState = (d, l) => { const p = eduGet(d.id, l.id); return p.done ? 'done' : (Object.keys(p.steps).length || p.sessions.length) ? 'wip' : 'new'; };
const STATE_LABEL = { done: ['Acquis ✓', 'ok'], wip: ['En cours', 'warn'], new: ['', ''] };

function allSessions(d) {
  const out = []; const m = (S.edu || {})[d.id] || {};
  for (const [lid, p] of Object.entries(m)) if (!lid.startsWith('_')) for (const s of p.sessions || []) out.push({ ...s, lid });
  return out.sort((a, b) => b.d.localeCompare(a.d) || (b.t || 0) - (a.t || 0));
}
function eduStats(d) {
  const ss = allSessions(d), days = new Set(ss.map(s => s.d));
  let streak = 0, cur = today(); if (!days.has(cur)) cur = addDays(cur, -1);
  while (days.has(cur)) { streak++; cur = addDays(cur, -1); }
  const week = ss.filter(s => diffDays(today(), s.d) < 7).length;
  const done = lessonsFor(d).filter(l => eduGet(d.id, l.id).done);
  return { sessions: ss.length, streak, week, minutes: sum(ss.map(s => s.min || 0)), done: done.length, ss };
}
function nextLesson(d) {
  const wks = d.birth ? Math.floor(diffDays(today(), d.birth) / 7) : 999;
  const todo = lessonsFor(d).filter(l => !eduGet(d.id, l.id).done && lessonUnlocked(l));
  return todo.find(l => l.from <= wks) || todo[0] || null;
}
const BADGES = [
  ['🌱', 'Première séance', s => s.sessions >= 1], ['🔥', 'Série de 3 jours', s => s.streak >= 3], ['⚡', 'Série de 7 jours', s => s.streak >= 7],
  ['📚', '10 séances', s => s.sessions >= 10], ['⏱️', '2 h d’entraînement', s => s.minutes >= 120], ['🎓', 'Première leçon acquise', s => s.done >= 1],
  ['🏅', 'Bases solides (leçons gratuites)', (s, d) => lessonsFor(d).filter(l => l.free).every(l => eduGet(d.id, l.id).done)],
  ['👑', 'Élève modèle (toutes les leçons)', (s, d) => lessonsFor(d).every(l => eduGet(d.id, l.id).done)]
];

/* ---------- Écran Éducation ---------- */
const EDU = { q: '', cat: '', open: false, cats: [] };   // open : section Plus dépliée ; cats : catégories dépliées
const eduCats = list => [...new Set(list.map(l => l.cat))].sort((a, b) => a.localeCompare(b, 'fr'));
function lessonCard(d, l) {
    const stt = lessonState(d, l), lock = !lessonUnlocked(l), [lab, cls] = STATE_LABEL[stt];
    return `<a class="row lesson" href="#/lecon?id=${l.id}"><span class="ico">${l.icon}</span><span class="grow"><b>${esc(l.title)}</b><small>${esc(l.cat)} · ${esc(l.level)} · dès ${l.from} sem.</small></span>${lock ? '<span class="pill plus">Plus</span>' : lab ? `<span class="pill ${cls}">${lab}</span>` : '<span class="chev">›</span>'}</a>`;
}
/* Recherche sans accents dans le titre, la catégorie, l'objectif et le « pourquoi ». */
function eduFilter(list, q, cat) {
  const n = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), words = n(q).split(/\s+/).filter(Boolean);
  return list.filter(l => (!cat || l.cat === cat) && words.every(w => n(l.title + ' ' + l.cat + ' ' + l.goal + ' ' + l.why).includes(w)));
}
function eduListHTML(d) {
  const paid = lessonsFor(d).filter(l => !l.free), r = eduFilter(paid, EDU.q, EDU.cat);
  if (EDU.q || EDU.cat) return `<div class="list">${r.map(l => lessonCard(d, l)).join('') || '<p class="empty">Aucune leçon ne correspond. Essayez un autre mot.</p>'}</div>`;
  return eduCats(paid).map(c => { const ls = paid.filter(l => l.cat === c); return `<details class="acc-in edu-grp" data-cat="${esc(c)}" ${EDU.cats.includes(c) ? 'open' : ''}><summary><b>${esc(c)}</b><small class="mut">${ls.length} leçon${ls.length > 1 ? 's' : ''}</small></summary><div class="list">${ls.map(l => lessonCard(d, l)).join('')}</div></details>`; }).join('');
}
document.addEventListener('toggle', e => { const t = e.target; if (!t || !t.classList) return; if (t.id === 'edu-plus') EDU.open = t.open; else if (t.classList.contains('edu-grp')) { const c = t.dataset.cat; EDU.cats = EDU.cats.filter(x => x !== c).concat(t.open ? [c] : []); } }, true);
ACT['edu-cat'] = ({ c }) => { EDU.cat = c; render(true); };
document.addEventListener('input', e => { if (e.target.id === 'edu-q') { EDU.q = e.target.value; const el = $('#edu-list'); if (el) el.innerHTML = eduListHTML(dog()); } });

ROUTES.educ = function educ() {
  const d = dog(), st = eduStats(d), nx = nextLesson(d);
  const all = lessonsFor(d), free = all.filter(l => l.free), paid = all.filter(l => !l.free), progs = programsFor(d), pst = id => ((((S.edu || {})[d.id] || {})._progs || {})[id]) || null;
  const badges = BADGES.map(([i, n, f]) => ({ i, n, on: f(st, d) }));
  return `<div class="page-h"><h1>🎓 Éducation</h1></div>
  <section class="card edu-hero">${(() => { const xp = xpOf(d), lv = levelOf(xp), td = todaySessions(d); return `<div class="lvl"><span class="lvl-n">${lv.n}</span><span class="grow"><b>${esc(lv.name)}</b><small>${xp} 🦴 os gagnés · encore ${lv.hi - xp} 🦴 pour le niveau ${lv.n + 1}</small><span class="ubar"><i style="width:${lv.pct}%"></i></span></span></div>
    <div class="edu-stats"><div><b>🔥 ${st.streak}</b><small>jours d’affilée</small></div><div><b>${td ? '✅' : '🎯'} ${td}/1</b><small>objectif du jour</small></div><div><b>${st.done}/${all.length}</b><small>leçons acquises</small></div></div>`; })()}
    ${nx ? `<div class="next"><small>Prochaine leçon conseillée pour ${esc(d.name)}</small><b>${nx.icon} ${esc(nx.title)}</b><div class="btn-row"><a class="btn primary" href="#/seance?id=${nx.id}">▶ Démarrer une séance</a><a class="btn" href="#/lecon?id=${nx.id}">Voir la leçon</a></div></div>` : '<p class="okmsg">Bravo, toutes les leçons disponibles sont acquises !</p>'}</section>
  <section class="card"><h2>🐾 Mon parcours</h2><p class="mut small">Gagnez des os : +${XP_SESSION} 🦴 par séance, +${XP_LESSON + XP_QUIZ} 🦴 par leçon validée au quiz.</p>${pathHTML(d)}</section>
  <a class="card banner" href="#/principes"><b>📖 Les ${principlesFor(d).length} principes d’une bonne éducation</b><span>${spOf(d).id === 'cat' ? 'Environnement, jeu, respect du chat… à lire d’abord (gratuit) →' : 'Renforcement positif, marqueur, règle des 80 %… à lire d’abord (gratuit) →'}</span></a>
  <section class="card"><div class="card-h"><h2>Leçons gratuites</h2></div><div class="list">${free.map(l => lessonCard(d, l)).join('')}</div></section>
  ${plus() && !BILL.enabled ? '' : (subActive() ? '' : `<button class="btn primary big cta-plus" data-act="subscribe">${ctaLabel()}</button>`)}
  <details class="card acc" id="edu-plus" ${EDU.open ? 'open' : ''}><summary><h2>Leçons Wouf Plus <small class="mut">(${paid.length})</small></h2>${plus() ? '<span class="pill ok">Débloquées</span>' : '<span class="pill plus">Plus</span>'}</summary>
    <p class="mut small">${paid.length} leçons détaillées : étapes progressives, programme d’entraînement, critères de réussite, erreurs fréquentes, dépannage. Nouvelles leçons ajoutées régulièrement.</p>
    <input id="edu-q" class="search" type="search" placeholder="Chercher une leçon : rappel, griffes, bébé, peur…" value="${esc(EDU.q)}" autocomplete="off">
    <div id="edu-list">${eduListHTML(d)}</div></details>
  <a class="card banner" href="#/guides"><b>📚 E-books</b><span>Le guide de survie (gratuit) et le grand guide santé, à lire dans Wouf →</span></a>
  <section class="card"><div class="card-h"><h2>Programmes guidés</h2>${plus() ? '' : '<span class="pill plus">Plus</span>'}</div><div class="list">${progs.map(prog => `<a class="row" href="#/programme?id=${prog.id}"><span class="ico">${prog.icon}</span><span class="grow"><b>${esc(prog.title)}</b><small>${pst(prog.id) ? '▶ Programme en cours' : esc(prog.sub)}</small></span><span class="chev">›</span></a>`).join('')}</div></section>
  <section class="card"><h2>Badges</h2><div class="badges">${badges.map(b => `<div class="badge ${b.on ? 'on' : ''}"><span>${b.i}</span><small>${esc(b.n)}</small></div>`).join('')}</div></section>
  ${st.ss.length ? `<section class="card"><h2>Dernières séances</h2>${st.ss.slice(0, 6).map(s => { const l = lessonOf(s.lid) || {}; return `<div class="row"><span class="ico">${l.icon || '🎓'}</span><span class="grow"><b>${esc(l.title || s.lid)}</b><small>${fmtDate(s.d)} · ${s.min || 1} min${s.n ? ` · ${s.ok}/${s.n} réussites` : ''}</small></span>${s.n ? `<span class="pill ${s.ok / s.n >= 0.8 ? 'ok' : s.ok / s.n >= 0.6 ? 'warn' : ''}">${Math.round(100 * s.ok / s.n)} %</span>` : ''}</div>`; }).join('')}</section>` : ''}
  <p class="mut small center">Méthode positive, sans aucune contrainte physique. Un problème de comportement ? Consultez un vétérinaire comportementaliste.</p>`;
};

ROUTES.principes = function principes() {
  const P = principlesFor(dog());
  return `<div class="page-h"><a class="back" href="#/educ">‹</a><h1>📖 Les ${P.length} principes</h1></div>
  ${P.map(([t, b], i) => `<section class="card"><h2>${i + 1}. ${esc(t)}</h2><p>${esc(b)}</p></section>`).join('')}`;
};

/* ---------- Fiche d'une leçon ---------- */
ROUTES.lecon = function lecon() {
  const d = dog(), l = lessonOf(routeParam('id'));
  if (!l) return '<p class="empty">Leçon introuvable.</p><a class="btn" href="#/educ">Retour</a>';
  const p = eduGet(d.id, l.id), open = lessonUnlocked(l), tick = Object.keys(p.steps).length;
  const head = `<div class="page-h"><a class="back" href="#/educ">‹</a><h1>${l.icon} ${esc(l.title)}</h1></div>
    <p class="chips-i"><span class="pill">${esc(l.cat)}</span><span class="pill">${esc(l.level)}</span><span class="pill">Dès ${l.from} sem.</span><span class="pill">${esc(l.dur)}</span><span class="pill">Environ ${esc(l.span)}</span></p>`;
  const goal = `<section class="card"><h2>🎯 Objectif</h2><p>${esc(l.goal)}</p></section>`;
  if (!open) return head + goal + `<section class="card"><h2>Ce que contient cette leçon</h2><p class="mut">${l.steps.length} étapes progressives avec critères de réussite, erreurs fréquentes, dépannage et test de validation.</p>
    <ol class="bul">${l.steps.map(s => `<li>${esc(s.t)}</li>`).join('')}</ol>${l.plan ? `<p class="mut small">Inclus : programme d’entraînement en ${l.plan.length} étapes, erreurs fréquentes, dépannage, test de validation.</p>` : ''}<button class="btn primary big" data-act="subscribe">${ctaLabel()}</button></section>`;
  return head + `${goal}
  <section class="card"><div class="card-h"><h2>Progression</h2><span class="mut">${tick}/${l.steps.length} étapes</span></div><div class="bar"><i style="width:${Math.round(100 * tick / l.steps.length)}%"></i></div>
    <div class="btn-row"><a class="btn primary" href="#/seance?id=${l.id}">▶ Démarrer une séance</a><button class="btn ${p.done ? 'ok-fill' : ''}" data-act="lesson-done" data-id="${l.id}">${p.done ? '✓ Acquis (annuler)' : '✅ Valider la leçon (quiz)'}</button></div></section>
  <section class="card"><h2>💡 Pourquoi ça marche</h2><p>${esc(l.why)}</p><h3>Matériel</h3><ul class="bul">${l.need.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>
  <section class="card"><h2>Les étapes</h2>${l.steps.map((s, i) => `<div class="step ${p.steps[i] ? 'done' : ''}"><input type="checkbox" data-act="step-tick" data-id="${l.id}" data-i="${i}" ${p.steps[i] ? 'checked' : ''} aria-label="Étape ${i + 1} réussie"><details ${i === 0 || (p.steps[i - 1] && !p.steps[i]) ? 'open' : ''}><summary><b>Étape ${i + 1} · ${esc(s.t)}</b>${s.min ? `<small> ~${s.min} min</small>` : ''}</summary><p>${esc(s.b)}</p><p class="crit">✅ <b>Pour passer à la suite :</b> ${esc(s.crit)}</p></details></div>`).join('')}</section>
  ${l.plan ? `<section class="card"><h2>📅 Programme d’entraînement</h2>${l.plan.map(([w, t]) => `<div class="row plan-row"><span class="plan-w">${esc(w)}</span><span class="grow">${esc(t)}</span></div>`).join('')}</section>` : ''}
  <section class="card"><h2>⚠️ Erreurs fréquentes</h2><ul class="bul">${l.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul></section>
  <section class="card"><h2>🛠️ Dépannage</h2>${l.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  <section class="card"><h2>🏁 Test de validation</h2><p>${esc(l.test)}</p>${l.safety ? `<p class="warn"><b>Sécurité :</b> ${esc(l.safety)}</p>` : ''}</section>
  ${l.next && l.next.length ? `<section class="card"><h2>🚀 Pour aller plus loin</h2><ul class="bul">${l.next.map(n => `<li>${esc(n)}</li>`).join('')}</ul></section>` : ''}`;
};
ACT['step-tick'] = ({ id, i }, el) => { const p = eduSet(dog().id, id); if (el.checked) p.steps[i] = 1; else delete p.steps[i]; save(); render(true); };
/* Valider = réussir le mini-quiz (3 questions) ; un second appui annule. */
ACT['lesson-done'] = ({ id }) => { const p = eduGet(dog().id, id); if (!p.done) return quizOpen(id); const q = eduSet(dog().id, id); q.done = false; delete q.quiz; save(); render(true); };

/* ---------- Séance guidée ---------- */
const SEANCE = { id: null, step: 0, ok: 0, ko: 0, t0: 0, iv: null };
function clickSound() {
  try { const c = clickSound.c = clickSound.c || new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = 1900; g.gain.setValueAtTime(0.25, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.05); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.06); } catch (e) { /* audio indisponible */ }
  if (navigator.vibrate) navigator.vibrate(15);
}
ROUTES.seance = function seance() {
  const l = lessonOf(routeParam('id')), d = dog();
  if (!l || !lessonUnlocked(l)) return '<p class="empty">Leçon indisponible.</p><a class="btn" href="#/educ">Retour</a>';
  if (SEANCE.id !== l.id) {
    const first = l.steps.findIndex((_, i) => !eduGet(d.id, l.id).steps[i]);
    Object.assign(SEANCE, { id: l.id, step: first < 0 ? 0 : first, ok: 0, ko: 0, t0: Date.now() });
  }
  const s = l.steps[SEANCE.step], n = SEANCE.ok + SEANCE.ko, rate = n ? SEANCE.ok / n : 0;
  const advice = n < 5 ? 'Faites une série de 10 essais. Récompensez chaque réussite.' : rate >= 0.8 && n >= 10 ? '🎉 Plus de 80 % : passez à l’étape suivante !' : rate < 0.6 && n >= 6 ? '⬇️ Moins de 60 % : facilitez (plus près, moins de distraction, friandise meilleure).' : 'Continuez : visez 8 réussites sur 10.';
  return `<div class="page-h"><a class="back" href="#/lecon?id=${l.id}">‹</a><h1>${l.icon} Séance</h1><span class="tmr" id="tmr">0:00</span></div>
  <section class="card"><div class="seg">${l.steps.map((_, i) => `<button class="${i === SEANCE.step ? 'on' : ''}" data-act="s-step" data-i="${i}">${i + 1}</button>`).join('')}</div>
    <h2>Étape ${SEANCE.step + 1} · ${esc(s.t)}</h2><p>${esc(s.b)}</p><p class="crit">✅ ${esc(s.crit)}</p></section>
  <section class="card center"><button class="btn marker" data-act="s-click">🔔 « Oui ! »</button><p class="mut small">Marqueur sonore (clicker) : appuyez à l’instant exact de la réussite, puis donnez la friandise.</p>
    <div class="score-row"><button class="btn ok-fill big" data-act="s-ok">✔ Réussi<br><b class="cnt">${SEANCE.ok}</b></button><button class="btn danger big" data-act="s-ko">✖ Raté<br><b class="cnt">${SEANCE.ko}</b></button></div>
    <div class="bar"><i style="width:${Math.round(rate * 100)}%"></i></div><p><b>${n ? Math.round(rate * 100) : 0} %</b> de réussite sur ${n} essai${n > 1 ? 's' : ''}</p><p class="mut">${advice}</p>
    <button class="btn primary big" data-act="s-end">Terminer la séance</button></section>`;
};
ROUTES.seance.after = () => {
  clearInterval(SEANCE.iv);
  const upd = () => { const e = $('#tmr'); if (!e) return clearInterval(SEANCE.iv); const s = Math.floor((Date.now() - SEANCE.t0) / 1000); e.textContent = Math.floor(s / 60) + ':' + pad(s % 60); };
  upd(); SEANCE.iv = setInterval(upd, 1000);
};
ACT['s-step'] = ({ i }) => { SEANCE.step = +i; SEANCE.ok = SEANCE.ko = 0; render(true); };
ACT['s-click'] = clickSound;
ACT['s-ok'] = () => { SEANCE.ok++; clickSound(); render(true); };
ACT['s-ko'] = () => { SEANCE.ko++; render(true); };
ACT['s-end'] = () => {
  const l = lessonOf(SEANCE.id), d = dog(), n = SEANCE.ok + SEANCE.ko, min = Math.max(1, Math.round((Date.now() - SEANCE.t0) / 60000));
  if (!n && Date.now() - SEANCE.t0 < 30000) { location.hash = '#/lecon?id=' + l.id; return; }
  const p = eduSet(d.id, l.id); p.sessions.push({ d: today(), t: Date.now(), min, ok: SEANCE.ok, n });
  let msg = 'Séance enregistrée ✓';
  if (n >= 10 && SEANCE.ok / n >= 0.8) { p.steps[SEANCE.step] = 1; msg = 'Étape validée 🎉'; if (SEANCE.step === l.steps.length - 1) msg = 'Dernière étape validée ! Passez le test de validation.'; }
  save(); SEANCE.id = null; clearInterval(SEANCE.iv); toast(msg + ` · +${XP_SESSION} 🦴${todaySessions(d) === 1 ? ' · objectif du jour atteint 🎯' : ''}`); location.hash = '#/lecon?id=' + l.id;
};

/* ---------- Programmes guidés (Plus) ---------- */
ROUTES.programme = function programme() {
  const d = dog(), pr = programsFor(d).find(p => p.id === routeParam('id')) || programsFor(d)[0];
  if (!pr) return '<p class="empty">Aucun programme pour cet animal.</p>';
  if (!allowed('programs')) return `<div class="page-h"><a class="back" href="#/educ">‹</a><h1>${pr.icon} ${esc(pr.title)}</h1></div><section class="card"><p>${esc(pr.sub)}. Un parcours semaine par semaine qui enchaîne les leçons dans le bon ordre, avec suivi de votre avancée.</p>
    <ol class="bul">${pr.weeks.map(w => `<li><b>${esc(w[0])}</b> · ${esc(w[1])}</li>`).join('')}</ol><button class="btn primary big" data-act="paywall" data-f="programs">⭐ Débloquer avec Wouf Plus</button></section>`;
  const start = ((((S.edu || {})[d.id] || {})._progs || {})[pr.id] || {}).start;
  const wk = start ? Math.floor(diffDays(today(), start) / 7) : -1, idx = wk < 0 ? -1 : Math.min(wk, pr.weeks.length - 1);
  const total = pr.weeks.flatMap(w => w[2]), doneN = total.filter(id => eduGet(d.id, id).done).length;
  return `<div class="page-h"><a class="back" href="#/educ">‹</a><h1>${pr.icon} ${esc(pr.title)}</h1></div>
  <section class="card"><p class="mut">${esc(pr.sub)}. Une leçon à la fois : mieux vaut peu, bien et régulièrement.</p><div class="bar"><i style="width:${Math.round(100 * doneN / total.length)}%"></i></div><p><b>${doneN}/${total.length}</b> leçons acquises</p>
    ${start ? `<p class="mut small">Démarré le ${fmtDate(start)} · semaine ${wk + 1}</p>` : `<button class="btn primary big" data-act="prog-start" data-id="${pr.id}">Démarrer le programme aujourd’hui</button>`}</section>
  ${pr.weeks.map((w, i) => `<section class="card ${i === idx ? 'cur' : ''}"><div class="card-h"><h2>${esc(w[0])} · ${esc(w[1])}</h2>${i === idx ? '<span class="pill">Cette semaine</span>' : ''}</div>
    ${w[2].map(id => { const l = lessonOf(id), stt = lessonState(d, l); return `<a class="row" href="#/lecon?id=${id}"><span class="ico">${l.icon}</span><span class="grow"><b>${esc(l.title)}</b><small>${esc(l.dur)}</small></span>${STATE_LABEL[stt][0] ? `<span class="pill ${STATE_LABEL[stt][1]}">${STATE_LABEL[stt][0]}</span>` : '<span class="chev">›</span>'}</a>`; }).join('')}</section>`).join('')}`;
};
ACT['prog-start'] = ({ id }) => { const d = dog(); S.edu = S.edu || {}; S.edu[d.id] = S.edu[d.id] || {}; S.edu[d.id]._progs = S.edu[d.id]._progs || {}; S.edu[d.id]._progs[id] = { start: today() }; save(); render(true); };
