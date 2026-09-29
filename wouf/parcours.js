'use strict';
/* Wouf Éducation — parcours en empreintes de pattes : unités, étapes à débloquer, os à gagner (points), niveaux,
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
  /* Chaque étape est une empreinte de patte ; elles alternent à gauche et à droite comme une vraie marche. */
  const PAW = '<svg viewBox="0 0 100 100" class="pawsvg" aria-hidden="true"><ellipse cx="21" cy="40" rx="9" ry="11.5" transform="rotate(-24 21 40)"/><ellipse cx="39" cy="22" rx="9.5" ry="12.5" transform="rotate(-8 39 22)"/><ellipse cx="61" cy="22" rx="9.5" ry="12.5" transform="rotate(8 61 22)"/><ellipse cx="79" cy="40" rx="9" ry="11.5" transform="rotate(24 79 40)"/><path d="M50 44c-17 0-33 15-33 30 0 11 9 16 18 16 6 0 10-2 15-2s9 2 15 2c9 0 18-5 18-16 0-15-16-30-33-30z"/></svg>';
  const node = (l, i, u) => {
    const p = eduGet(d.id, l.id), lock = !lessonUnlocked(l), isCur = !lock && !p.done && u.ls.find(x => !eduGet(d.id, x.id).done && lessonUnlocked(x)) === l;
    const cls = p.done ? 'done' : lock ? 'lock' : isCur ? 'cur' : 'open', side = i % 2 ? 'r' : 'l';
    return `<a class="pnode ${cls} ${side}" href="#/lecon?id=${l.id}" aria-label="${esc(l.title)}${p.done ? ' (acquise)' : lock ? ' (Wouf Plus)' : ''}"><span class="paw">${PAW}<span class="pdot">${p.done ? '✓' : lock ? '🔒' : l.icon}</span></span>${isCur ? '<span class="pgo">C’est parti !</span>' : ''}<small>${esc(l.title.split(/[:(]/)[0].trim())}</small></a>`;
  };
  return units.map(u => {
    const done = u.ls.filter(l => eduGet(d.id, l.id).done).length, full = done === u.ls.length;
    const head = `<button class="unit-h ${u.id === openId ? 'on' : ''} ${full ? 'full' : ''}" data-act="unit-open" data-u="${u.id}"><span><b>${esc(u.title)}</b><small>${esc(u.sub)} · ${done}/${u.ls.length} ${full ? '🏆' : ''}</small></span><span class="ubar"><i style="width:${Math.round(100 * done / u.ls.length)}%"></i></span></button>`;
    return u.id === openId ? head + `<div class="path">${u.ls.map((l, i) => node(l, i, u)).join('')}</div>` : head;
  }).join('');
}
ACT['unit-open'] = ({ u }) => { PARC.open = PARC.open === u ? '__none' : u; render(true); };

/* ---------- Mini-quiz de validation (3 questions tirées des critères de réussite de la leçon) ---------- */
/* Fonction pure : les 3 questions écrites à la main pour la leçon (quiz*.js), réponses mélangées.
   Si une leçon n'a pas encore de quiz (ne devrait pas arriver : `npm run check` le refuse), repli sur les critères des étapes. */
function lessonQuiz(l, rnd = Math.random) {
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hand = (typeof QUIZZES !== 'undefined' && QUIZZES[l.id]) || null;
  if (hand) return hand.slice(0, 3).map(([q, good, ...rest]) => { const why = rest.pop(), opts = shuffle([good, ...rest]); return { q, opts, ok: opts.indexOf(good), why }; });
  return shuffle(l.steps.map((_, i) => i)).slice(0, 3).map(i => {
    const opts = shuffle([i, ...shuffle(l.steps.map((s, k) => k).filter(k => k !== i && l.steps[k].crit !== l.steps[i].crit)).slice(0, 2)]);
    return { q: `Étape « ${l.steps[i].t} » : quel est le critère de réussite ?`, opts: opts.map(k => l.steps[k].crit), ok: opts.indexOf(i), why: '' };
  });
}
const QUIZ = { id: null, qs: [], i: 0, score: 0, picked: null, run: 0, salt: 0 };
function quizHTML() {
  const l = lessonOf(QUIZ.id), q = QUIZ.qs[QUIZ.i];
  if (!q) return `<div class="sheet-head"><h2>${QUIZ.score === QUIZ.qs.length ? '🏆 Sans faute !' : '💪 Presque !'}</h2><button class="x" data-close>✕</button></div>
    ${quizMood()}<div class="quiz-end"><div class="big-n">${QUIZ.score}/${QUIZ.qs.length}</div>${QUIZ.score === QUIZ.qs.length ? `<p>Leçon validée : <b>+${XP_LESSON + XP_QUIZ} 🦴</b></p><button class="btn primary big" data-act="quiz-finish">Continuer</button>` : `<p>Il faut 3 bonnes réponses pour valider « ${esc(l.title)} ». Relisez les étapes, puis réessayez.</p><button class="btn primary big" data-act="quiz-retry">Réessayer</button>`}</div>`;
  return `<div class="sheet-head"><h2>${l.icon} Quiz · ${QUIZ.i + 1}/${QUIZ.qs.length}<small class="quiz-lesson">${esc(l.title)}</small></h2><button class="x" data-close>✕</button></div>
    <div class="qbar">${QUIZ.qs.map((_, k) => `<i class="${k < QUIZ.i ? 'on' : ''}"></i>`).join('')}</div>
    ${quizMood()}<p class="quiz-q">${esc(q.q)}</p><div class="quiz-opts">${q.opts.map((o, k) => `<button class="qopt ${QUIZ.picked == null ? '' : k === q.ok ? 'good' : k === QUIZ.picked ? 'bad' : 'dim'}" data-act="quiz-pick" data-k="${k}" ${QUIZ.picked == null ? '' : 'disabled'}>${esc(o)}</button>`).join('')}</div>
    ${QUIZ.picked == null ? '' : `<div class="quiz-fb ${QUIZ.picked === q.ok ? 'good' : 'bad'}"><div><b>${QUIZ.picked === q.ok ? '✅ Bonne réponse !' : '❌ Pas tout à fait.'}</b>${q.why ? `<small class="quiz-why">${esc(q.why)}</small>` : ''}</div><button class="btn primary" data-act="quiz-next">Continuer</button></div>`}`;
}
function quizRender() { const s = $('.sheet.quiz'); if (s) s.innerHTML = quizHTML(); }
function quizOpen(id) {
  const l = lessonOf(id); if (!l || !lessonUnlocked(l)) return;
  Object.assign(QUIZ, { id, qs: lessonQuiz(l), i: 0, score: 0, picked: null, run: 0, salt: Math.floor(Math.random() * 97) });
  const el = sheet(quizHTML()); $('.sheet', el).classList.add('quiz');
}
ACT['quiz-open'] = ({ id }) => quizOpen(id);
ACT['quiz-pick'] = ({ k }) => { if (QUIZ.picked != null) return; QUIZ.picked = +k; const good = QUIZ.picked === QUIZ.qs[QUIZ.i].ok; if (good) { QUIZ.score++; QUIZ.run++; } else QUIZ.run = 0; if (navigator.vibrate) navigator.vibrate(good ? 20 : [40, 60, 40]); quizSound(good); quizRender(); };
ACT['quiz-next'] = () => { QUIZ.i++; QUIZ.picked = null; quizRender(); };
ACT['quiz-retry'] = () => { const id = QUIZ.id; closeSheet(); quizOpen(id); };
ACT['quiz-finish'] = () => {
  const d = dog(), l = lessonOf(QUIZ.id), p = eduSet(d.id, l.id), before = levelOf(xpOf(d)).n;
  p.done = true; p.quiz = 3; l.steps.forEach((_, i) => { p.steps[i] = 1; }); save(); closeSheet();
  const lv = levelOf(xpOf(d));
  celebrate.pet = l.sp === 'cat' ? 'cat' : 'dog'; celebrate(`${l.icon} Leçon acquise !`, `+${XP_LESSON + XP_QUIZ} 🦴${lv.n > before ? ` · Niveau ${lv.n} : ${lv.name} 🎉` : ''}`, () => rewardCheck());
  render(true);
};

/* ---------- Célébration (confettis) ---------- */
function celebrate(title, sub, then) {
  const colors = ['#f0782a', '#ffc21a', '#2bb673', '#4d8fd6', '#e2453c', '#9b59b6'];
  const bits = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.round(Math.random() * 100)}%;background:${colors[i % colors.length]};animation-delay:${(Math.random() * 0.4).toFixed(2)}s;--r:${Math.round(Math.random() * 720 - 360)}deg"></i>`).join('');
  const el = document.createElement('div'); el.className = 'celebrate';
  el.innerHTML = `<div class="confetti">${bits}</div><div class="cel-card">${celebrate.pet ? mascot('win', celebrate.pet === 'cat', celebrate.pet === 'cat' ? 'Ronron de victoire ! 😻' : 'Wouf wouf ! On a réussi ! 🥳', true) : ''}<b>${esc(title)}</b><small>${esc(sub || '')}</small><button class="btn primary" data-cel>Continuer</button></div>`;
  document.body.appendChild(el);
  celebrate.pet = null; const close = () => { el.remove(); if (then) then(); };
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

/* ---------- La mascotte du quiz : un chien (ou un chat) qui réagit à chaque réponse ---------- */
const MASCOT_TXT = {
  dog: {
    think: ['Hmm… je réfléchis avec toi 🤔', 'À toi de jouer ! 🐾', 'Je te fais confiance, vas-y !', 'Prends ton temps, je t’attends 🦴'],
    good: ['Wouf ! Bravo ! 🎉', 'Exactement ! Ma queue ne s’arrête plus !', 'Trop fort ! 🦴', 'Oui oui oui ! Tu gères !', 'Parfait, j’en saute de joie !'],
    streak: ['Deux d’affilée ! 🔥', 'Imbattable ! 🔥🔥', 'Tu es en feu ! 🔥'],
    bad: ['Oups… pas grave ! 🐾', 'Presque ! Regarde la bonne réponse 👀', 'On apprend en se trompant, comme moi !', 'Ouille… on la retient pour la prochaine fois !'],
    win: ['Sans faute ! On fait la fête ! 🥳', 'Champion ! Tu mérites une friandise 🦴'],
    fail: ['Pas grave, on réessaie ensemble 💪', 'Relis les étapes, je t’attends ici 🐾']
  },
  cat: {
    think: ['Miaou ? À toi de jouer 🤔', 'Je t’observe… sans pression 😼', 'Prends ton temps, je fais ma sieste 😺'],
    good: ['Miaou ! Bravo ! 🎉', 'Ronron de fierté 😻', 'Exactement ! Tu as tout compris', 'Parfait, digne d’un chat 😸'],
    streak: ['Deux d’affilée ! 🔥', 'Impressionnant… pour un humain 😼🔥', 'Tu es en feu ! 🔥'],
    bad: ['Oups… même les chats ratent un saut 🐾', 'Presque ! Regarde la bonne réponse 👀', 'Pas grave, on recommence après la sieste'],
    win: ['Sans faute ! Ronron de victoire 🥳', 'Magnifique ! Tu mérites une caresse… sur le menton'],
    fail: ['Pas grave, on réessaie 💪', 'Relis les étapes, je garde ta place au chaud 😺']
  }
};
const pickTxt = (list, seed) => list[Math.abs(seed) % list.length];
/* Dessin vectoriel animé (aucune image à télécharger). mood : think | good | bad | win | fail */
function mascot(mood, cat, text, big) {
  const coat = cat ? '#b9b3ad' : '#d9a066', coat2 = cat ? '#948c84' : '#b9803f', muzzle = cat ? '#efe9e3' : '#f3d9b6', ink = '#3a2a1a';
  const happy = mood === 'good' || mood === 'win', sad = mood === 'bad';
  const ears = cat
    ? `<path class="ear l" d="M54 52 L58 20 L79 40 Z" fill="${coat2}"/><path class="ear r" d="M106 52 L102 20 L81 40 Z" fill="${coat2}"/><path d="M59 43 L61 28 L71 39 Z M101 43 L99 28 L89 39 Z" fill="#e8a4ae"/>`
    : `<path class="ear l" d="M56 48 C38 44 31 72 40 90 C47 96 58 86 60 70 Z" fill="${coat2}"/><path class="ear r" d="M104 48 C122 44 129 72 120 90 C113 96 102 86 100 70 Z" fill="${coat2}"/>`;
  const eyes = happy ? `<path d="M63 66 q7 -9 14 0 M83 66 q7 -9 14 0" stroke="${ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`
    : mood === 'think' ? `<ellipse cx="70" cy="64" rx="5" ry="6.5" fill="${ink}"/><ellipse cx="90" cy="64" rx="5" ry="6.5" fill="${ink}"/><circle cx="72" cy="60.5" r="2" fill="#fff"/><circle cx="92" cy="60.5" r="2" fill="#fff"/>`
    : `<ellipse cx="70" cy="65" rx="5" ry="6.5" fill="${ink}"/><ellipse cx="90" cy="65" rx="5" ry="6.5" fill="${ink}"/><circle cx="71.5" cy="63" r="1.8" fill="#fff"/><circle cx="91.5" cy="63" r="1.8" fill="#fff"/>`;
  const brows = sad ? `<path d="M61 55 l12 -4 M99 55 l-12 -4" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>` : mood === 'think' ? `<path d="M62 51 l11 2 M87 52 q6 -5 12 -2" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : '';
  const mouth = happy ? `<path d="M69 86 q11 14 22 0 Z" fill="#5a2a1a"/><path class="tongue" d="M75 91 q5 12 10 0 Z" fill="#ef6f86"/>`
    : sad ? `<path d="M72 93 q8 -7 16 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    : mood === 'think' ? `<path d="M76 89 q5 2 9 -1" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<path d="M72 87 q8 7 16 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const whisk = cat ? `<path d="M60 82 h-16 M60 87 l-14 4 M100 82 h16 M100 87 l14 4" stroke="#7a6a5a" stroke-width="1.4" stroke-linecap="round"/>` : '';
  const blush = happy ? `<circle cx="60" cy="78" r="5" fill="#f4a3a3" opacity=".6"/><circle cx="100" cy="78" r="5" fill="#f4a3a3" opacity=".6"/>` : '';
  const extra = {
    think: `<text class="qmark" x="120" y="30" font-size="26" font-weight="800" fill="#f0782a">?</text>`,
    good: `<g class="spark"><path d="M24 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffc21a"/><path d="M132 24 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#ffc21a"/><path d="M138 70 c0 -5 7 -5 7 0 c0 -5 7 -5 7 0 c0 6 -7 9 -7 11 c0 -2 -7 -5 -7 -11z" fill="#ff5d73"/></g>`,
    bad: `<path class="tear" d="M64 72 q-4 8 0 11 q4 -3 0 -11z" fill="#6cc3ff"/><text x="118" y="36" font-size="18" fill="#9aa3b8">💧</text>`,
    win: `<g><path d="M66 38 L80 6 L94 38 Z" fill="#4d8fd6"/><path d="M68 34 L92 34" stroke="#ffc21a" stroke-width="4"/><circle cx="80" cy="6" r="5" fill="#ffc21a"/></g><g class="spark"><rect x="20" y="30" width="7" height="11" fill="#ff5d73" transform="rotate(20 23 35)"/><rect x="134" y="26" width="7" height="11" fill="#2bb673" transform="rotate(-25 137 31)"/><rect x="28" y="84" width="6" height="10" fill="#4d8fd6"/><rect x="130" y="80" width="6" height="10" fill="#ffc21a" transform="rotate(30 133 85)"/></g>`,
    fail: `<text x="120" y="40" font-size="22">💪</text>`
  }[mood] || '';
  const tail = cat ? `<path class="tail" d="M116 118 q30 -6 26 -40" stroke="${coat2}" stroke-width="9" fill="none" stroke-linecap="round"/>` : `<path class="tail" d="M114 112 q24 -10 20 -34" stroke="${coat2}" stroke-width="9" fill="none" stroke-linecap="round"/>`;
  const svg = `<svg viewBox="0 0 160 150" class="msvg" role="img" aria-label="${esc(text)}"><ellipse cx="80" cy="143" rx="44" ry="5" fill="#000" opacity=".12"/>
    <g class="mbody"><ellipse cx="80" cy="118" rx="38" ry="23" fill="${coat}"/><rect x="54" y="126" width="13" height="16" rx="6.5" fill="${coat2}"/><rect x="93" y="126" width="13" height="16" rx="6.5" fill="${coat2}"/>${tail}
    <g class="mhead">${ears}<circle cx="80" cy="68" r="32" fill="${coat}"/><ellipse cx="80" cy="82" rx="17" ry="12" fill="${muzzle}"/><ellipse cx="80" cy="76" rx="5.5" ry="4" fill="${ink}"/>${eyes}${brows}${mouth}${whisk}${blush}</g></g>${extra}</svg>`;
  return `<div class="mascot m-${mood} ${big ? 'big' : ''}">${svg}<div class="bubble">${esc(text)}</div></div>`;
}
function quizMood() {
  const l = lessonOf(QUIZ.id), sp = l && l.sp === 'cat' ? 'cat' : 'dog', T = MASCOT_TXT[sp], q = QUIZ.qs[QUIZ.i], seed = QUIZ.i * 7 + QUIZ.score * 3 + (QUIZ.picked || 0) + (QUIZ.salt || 0);
  if (!q) { const win = QUIZ.score === QUIZ.qs.length; return mascot(win ? 'win' : 'fail', sp === 'cat', pickTxt(T[win ? 'win' : 'fail'], seed), true); }
  if (QUIZ.picked == null) return mascot('think', sp === 'cat', pickTxt(T.think, seed));
  const good = QUIZ.picked === q.ok;
  return mascot(good ? 'good' : 'bad', sp === 'cat', pickTxt(good ? (QUIZ.run >= 2 ? T.streak : T.good) : T.bad, seed));
}
/* Petits sons (bonne réponse : deux notes qui montent ; erreur : une note grave). Silencieux si l'audio est indisponible. */
function quizSound(good) {
  try {
    const c = quizSound.c = quizSound.c || new (window.AudioContext || window.webkitAudioContext)();
    (good ? [660, 990] : [220]).forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.12; o.type = good ? 'triangle' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + (good ? 0.18 : 0.3)); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.32); });
  } catch (e) { /* audio indisponible */ }
}
