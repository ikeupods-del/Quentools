'use strict';
/* Wouf Éducation — parcours « façon Duolingo » : unités, étapes à débloquer, points d'expérience (XP), niveaux,
   objectif du jour, mini-quiz de validation, célébrations, et offre récompense (Wouf Plus à prix réduit)
   réservée aux personnes qui ont terminé TOUTES les leçons gratuites de leurs animaux. */

/* ---------- XP et niveaux (calculés à partir des données, rien de plus à stocker) ---------- */
const XP_SESSION = 10, XP_LESSON = 50, XP_QUIZ = 20;
const LEVELS = ['Débutant curieux', 'Apprenti', 'Bon élève', 'Complice', 'Dresseur doux', 'Expert', 'Champion', 'Maître éducateur', 'Légende'];
function xpOf(d) {
  const m = (S.edu || {})[d.id] || {}; let xp = 0;
  for (const [lid, p] of Object.entries(m)) { if (lid.startsWith('_')) continue; xp += (p.sessions || []).length * XP_SESSION + (p.done ? XP_LESSON : 0) + (p.quiz === 3 ? XP_QUIZ : 0); }
  return xp;
}
/* Niveau n atteint à 50·n·(n+1) XP : 100, 300, 600, 1000… (de plus en plus long, comme dans un jeu). */
function levelOf(xp) {
  let n = 0; while (50 * (n + 1) * (n + 2) <= xp) n++;
  const lo = 50 * n * (n + 1), hi = 50 * (n + 1) * (n + 2);
  return { n: n + 1, name: LEVELS[Math.min(n, LEVELS.length - 1)], lo, hi, pct: Math.round(100 * (xp - lo) / (hi - lo)) };
}
const todaySessions = d => allSessions(d).filter(s => s.d === today()).length;

/* ---------- Unités du parcours ---------- */
const UNIT_ORDER = ['Bases', 'Chiot', 'Chaton', 'Calme', 'Balades', 'Sécurité', 'Savoir-vivre', 'Soins', 'Émotions', 'Complicité', 'Jeu', 'Bien-être', 'Cohabitation', 'Santé et propreté', 'Comportement', 'Sorties', 'Voyage', 'Changements de vie', 'Adoption'];
function unitsFor(d) {
  const all = lessonsFor(d), free = all.filter(l => l.free).sort((a, b) => a.from - b.from), paid = all.filter(l => !l.free);
  const cats = [...new Set(paid.map(l => l.cat))].sort((a, b) => (UNIT_ORDER.indexOf(a) + 1 || 99) - (UNIT_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b, 'fr'));
  return [{ id: 'u0', title: 'Les bases', sub: 'Gratuit', ls: free }].concat(cats.map((c, i) => ({ id: 'u' + (i + 1), title: c, sub: 'Wouf Plus', ls: paid.filter(l => l.cat === c).sort((a, b) => a.from - b.from) })));
}
const PARC = { open: null };
function pathHTML(d) {
  const units = unitsFor(d), cur = units.find(u => u.ls.some(l => !eduGet(d.id, l.id).done)) || units[units.length - 1];
  const openId = PARC.open || cur.id;
  const node = (l, i, u) => {
    const p = eduGet(d.id, l.id), lock = !lessonUnlocked(l), isCur = !lock && !p.done && u.ls.find(x => !eduGet(d.id, x.id).done && lessonUnlocked(x)) === l;
    const cls = p.done ? 'done' : lock ? 'lock' : isCur ? 'cur' : 'open', off = [0, 1, 2, 1, 0, -1, -2, -1][i % 8];
    return `<a class="pnode ${cls}" style="--off:${off}" href="#/lecon?id=${l.id}" aria-label="${esc(l.title)}"><span class="pdot">${p.done ? '✓' : lock ? '🔒' : l.icon}</span>${isCur ? '<span class="pgo">Commencer</span>' : ''}<small>${esc(l.title.split(/[:(]/)[0].trim())}</small></a>`;
  };
  return units.map(u => {
    const done = u.ls.filter(l => eduGet(d.id, l.id).done).length, full = done === u.ls.length;
    const head = `<button class="unit-h ${u.id === openId ? 'on' : ''} ${full ? 'full' : ''}" data-act="unit-open" data-u="${u.id}"><span><b>${esc(u.title)}</b><small>${esc(u.sub)} · ${done}/${u.ls.length} ${full ? '🏆' : ''}</small></span><span class="ubar"><i style="width:${Math.round(100 * done / u.ls.length)}%"></i></span></button>`;
    return u.id === openId ? head + `<div class="path">${u.ls.map((l, i) => node(l, i, u)).join('')}</div>` : head;
  }).join('');
}
ACT['unit-open'] = ({ u }) => { PARC.open = PARC.open === u ? '__none' : u; render(true); };

/* ---------- Mini-quiz de validation (3 questions tirées des critères de réussite de la leçon) ---------- */
/* Fonction pure : chaque question porte sur une étape ; la bonne réponse est SON critère, les autres sont ceux d'autres étapes de la même leçon. */
function lessonQuiz(l, rnd = Math.random) {
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const idx = shuffle(l.steps.map((_, i) => i)).slice(0, 3);
  return idx.map(i => {
    const others = shuffle(l.steps.map((s, k) => k).filter(k => k !== i && l.steps[k].crit !== l.steps[i].crit)).slice(0, 2);
    const opts = shuffle([i, ...others]);
    return { q: `Étape « ${l.steps[i].t} » : à quel moment peut-on passer à la suite ?`, opts: opts.map(k => l.steps[k].crit), ok: opts.indexOf(i) };
  });
}
const QUIZ = { id: null, qs: [], i: 0, score: 0, picked: null };
function quizHTML() {
  const l = lessonOf(QUIZ.id), q = QUIZ.qs[QUIZ.i];
  if (!q) return `<div class="sheet-head"><h2>${QUIZ.score === QUIZ.qs.length ? '🏆 Sans faute !' : '💪 Presque !'}</h2><button class="x" data-close>✕</button></div>
    <div class="quiz-end"><div class="big-n">${QUIZ.score}/${QUIZ.qs.length}</div>${QUIZ.score === QUIZ.qs.length ? `<p>Leçon validée : <b>+${XP_LESSON + XP_QUIZ} XP</b></p><button class="btn primary big" data-act="quiz-finish">Continuer</button>` : `<p>Il faut 3 bonnes réponses pour valider « ${esc(l.title)} ». Relisez les étapes, puis réessayez.</p><button class="btn primary big" data-act="quiz-retry">Réessayer</button>`}</div>`;
  return `<div class="sheet-head"><h2>${l.icon} Quiz · ${QUIZ.i + 1}/${QUIZ.qs.length}</h2><button class="x" data-close>✕</button></div>
    <div class="qbar">${QUIZ.qs.map((_, k) => `<i class="${k < QUIZ.i ? 'on' : ''}"></i>`).join('')}</div>
    <p class="quiz-q">${esc(q.q)}</p><div class="quiz-opts">${q.opts.map((o, k) => `<button class="qopt ${QUIZ.picked == null ? '' : k === q.ok ? 'good' : k === QUIZ.picked ? 'bad' : 'dim'}" data-act="quiz-pick" data-k="${k}" ${QUIZ.picked == null ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
    ${QUIZ.picked == null ? '' : `<div class="quiz-fb ${QUIZ.picked === q.ok ? 'good' : 'bad'}"><b>${QUIZ.picked === q.ok ? '✅ Bonne réponse !' : '❌ Pas tout à fait.'}</b><button class="btn primary" data-act="quiz-next">Continuer</button></div>`}`;
}
function quizRender() { const s = $('.sheet.quiz'); if (s) s.innerHTML = quizHTML(); }
function quizOpen(id) {
  const l = lessonOf(id); if (!l || !lessonUnlocked(l)) return;
  Object.assign(QUIZ, { id, qs: lessonQuiz(l), i: 0, score: 0, picked: null });
  const el = sheet(quizHTML()); $('.sheet', el).classList.add('quiz');
}
ACT['quiz-open'] = ({ id }) => quizOpen(id);
ACT['quiz-pick'] = ({ k }) => { if (QUIZ.picked != null) return; QUIZ.picked = +k; if (QUIZ.picked === QUIZ.qs[QUIZ.i].ok) { QUIZ.score++; if (navigator.vibrate) navigator.vibrate(20); } quizRender(); };
ACT['quiz-next'] = () => { QUIZ.i++; QUIZ.picked = null; quizRender(); };
ACT['quiz-retry'] = () => { const id = QUIZ.id; closeSheet(); quizOpen(id); };
ACT['quiz-finish'] = () => {
  const d = dog(), l = lessonOf(QUIZ.id), p = eduSet(d.id, l.id), before = levelOf(xpOf(d)).n;
  p.done = true; p.quiz = 3; l.steps.forEach((_, i) => { p.steps[i] = 1; }); save(); closeSheet();
  const lv = levelOf(xpOf(d));
  celebrate(`${l.icon} Leçon acquise !`, `+${XP_LESSON + XP_QUIZ} XP${lv.n > before ? ` · Niveau ${lv.n} : ${lv.name} 🎉` : ''}`, () => rewardCheck());
  render(true);
};

/* ---------- Célébration (confettis) ---------- */
function celebrate(title, sub, then) {
  const colors = ['#f0782a', '#ffc21a', '#2bb673', '#4d8fd6', '#e2453c', '#9b59b6'];
  const bits = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.round(Math.random() * 100)}%;background:${colors[i % colors.length]};animation-delay:${(Math.random() * 0.4).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg"></i>`).join('');
  const el = document.createElement('div'); el.className = 'celebrate';
  el.innerHTML = `<div class="confetti">${bits}</div><div class="cel-card"><b>${esc(title)}</b><small>${esc(sub || '')}</small><button class="btn primary" data-cel>Continuer</button></div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); if (then) then(); };
  el.querySelector('[data-cel]').onclick = close; setTimeout(() => { if (el.isConnected) close(); }, 6000);
}

/* ---------- Offre récompense : toutes les leçons gratuites terminées ---------- */
const REWARD = (BILL.rewardOffer || {});
const freeIdsOf = sp => LESSONS.filter(l => (l.sp || 'dog') === sp && l.free).map(l => l.id);
/* Fonction pure : éligible si, pour CHAQUE espèce présente dans le foyer, toutes les leçons gratuites de cette espèce
   sont acquises (sur au moins un animal de l'espèce). Chien seul : 6 leçons ; chat seul : 4 ; chien + chat : les 10. */
function rewardEligible(st = S) {
  const pets = st.dogs || [], sps = [...new Set(pets.map(p => p.species || 'dog'))];
  if (!sps.length) return false;
  return sps.every(sp => { const ids = freeIdsOf(sp); return ids.length && pets.filter(p => (p.species || 'dog') === sp).some(p => ids.every(id => ((((st.edu || {})[p.id] || {})[id]) || {}).done)); });
}
const rewardOn = () => !!(REWARD.enabled && REWARD.price);
function rewardCheck() {
  if (!rewardOn() || subActive() || !rewardEligible()) return;
  if (S.reward && S.reward.shown) return;
  S.reward = { shown: today() }; save(); rewardSheet();
}
function rewardSheet() {
  const p = planOf();
  if (!BILL.enabled) return sheet(`<div class="sheet-head"><h2>🏅 Bases acquises !</h2><button class="x" data-close>✕</button></div>
    <div class="center"><div class="big-heart">🏆</div><p><b>Bravo ! Vous avez terminé toutes les leçons gratuites.</b></p><p>Pour le moment, Wouf Plus est offert à tout le monde : continuez avec les ${LESSONS.filter(l => !l.free).length} leçons avancées. Quand Wouf Plus deviendra payant, votre récompense vous attendra : <b>${esc(REWARD.price)} à vie</b> au lieu de ${esc(p.price)}.</p>
    <a class="btn primary big" href="#/educ" data-close>Continuer mon parcours</a></div>`);
  sheet(`<div class="sheet-head"><h2>🏅 Votre récompense</h2><button class="x" data-close>✕</button></div>
    <div class="center reward"><div class="big-heart">🏆</div><p><b>Bravo, vous avez terminé toutes les leçons gratuites !</b></p><p>Pour vous récompenser : Wouf Plus à vie</p>
    <div class="price-cut"><s>${esc(p.price)}</s> <b>${esc(REWARD.price)}</b></div><p class="mut small">Paiement unique, sans abonnement : ${LESSONS.filter(l => !l.free).length} leçons avancées, programmes, GPS, bilan santé, assistance prioritaire…</p>
    <button class="btn primary big" data-act="reward-buy">Profiter de l’offre</button><button class="lnk" data-close>Plus tard</button><p class="mut small">L’offre reste disponible dans Plus › Wouf Plus.</p></div>`);
}
ACT['reward-show'] = () => rewardSheet();
ACT['reward-buy'] = async () => { if (CLOUD.user) await cloudPush().catch(() => {}); closeAllSheets(); ACT.checkout(); };
/* Le prix réduit s'applique automatiquement au paiement dès que la personne est éligible (le relais le vérifie aussi). */
const rewardActive = () => rewardOn() && rewardEligible();
