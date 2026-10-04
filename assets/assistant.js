/* Assistant de site (QuenTools). Un seul fichier, sans bibliothèque ni cookie.
   <script src="assistant.js" data-nom="Salon Éclat" data-tel="01 23 45 67 89" data-api="https://relais.exemple.workers.dev" defer></script>
   data-api vide = mode local : l'assistant comprend la question (mots-clés, fautes de frappe, suite de la conversation) et répond avec
   les textes préparés, sans rien envoyer nulle part. data-api rempli = vraie IA via le relais (design/assistant-ia/worker.js).
   Connaissances : window.QT_ASSISTANT_KB = { intro, start:[id], entries:[{id, q, k, a, next, p, more}] } (voir assistant-qt.js),
   ou data-faq='[{q, k, a}]' (petite liste). k = mots-clés séparés par « | » (début de mot, accents et petites fautes tolérés) ;
   a = texte ou fonction () → texte ; next = suites proposées ; p = réponse à « et le prix ? » ; more = réponse à « en savoir plus ».
   Dans les textes, {R} = racine du site et les adresses https:// deviennent des liens.
   data-intro : message d'accueil ; data-lead="0" : pas de parcours « demande de rendez-vous ». */
(function () {
  var s = document.currentScript;
  var nom = s.dataset.nom || 'Notre assistant', tel = s.dataset.tel || '', api = s.dataset.api || '';
  var leadOn = s.dataset.lead !== '0';
  var kb = window.QT_ASSISTANT_KB || null, entries = [], byId = {}, start = [];
  var root_ = new URL('../', s.src).href;
  try {
    entries = kb ? kb.entries : JSON.parse(s.dataset.faq || '[]').map(function (f, i) { return { id: 'f' + i, q: f.q, k: f.k || '', a: f.a || '' }; });
  } catch (e) { entries = []; }
  entries.forEach(function (e) { byId[e.id] = e; });
  start = kb && kb.start ? kb.start : entries.map(function (e) { return e.id; }).slice(0, 4);
  var intro = s.dataset.intro || (kb && kb.intro) || 'Bonjour ! Je réponds à vos questions sur ' + nom + ' et je peux transmettre une demande de rendez-vous.';
  var history = [], lead = null, busy = false, last = null, misses = 0;

  var root = document.createElement('div'); root.className = 'qa';
  root.innerHTML =
    '<button type="button" class="qa-open" aria-expanded="false" aria-controls="qa-panel">💬 Une question ?</button>' +
    '<section class="qa-panel" id="qa-panel" aria-label="Assistant de ' + nom.replace(/[<&"]/g, '') + '">' +
    '<div class="qa-head"><div><strong></strong><small>Assistant automatique</small></div><button type="button" class="qa-x" aria-label="Fermer l’assistant">×</button></div>' +
    '<div class="qa-log" role="log" aria-live="polite"></div><div class="qa-chips"></div>' +
    '<p class="qa-legal">Je suis un assistant automatique : je peux me tromper. Ne saisissez rien de confidentiel.</p>' +
    '<form class="qa-form"><input class="qa-in" type="text" maxlength="500" placeholder="Votre question…" aria-label="Votre message" autocomplete="off"><button class="qa-send" type="submit">Envoyer</button></form></section>';
  document.body.appendChild(root);
  var $ = function (q) { return root.querySelector(q); };
  $('.qa-head strong').textContent = nom;
  var log = $('.qa-log'), input = $('.qa-in'), send = $('.qa-send');

  function put(d, text) {
    d.textContent = '';
    String(text).replace(/\{R\}/g, root_).split(/(https?:\/\/[^\s]+[^\s.,;:!?)])/).forEach(function (part, i) {
      if (i % 2) { var a = document.createElement('a'); a.href = part; a.textContent = part.replace(/^https?:\/\//, '').replace(/\/$/, ''); a.style.color = 'inherit'; d.appendChild(a); }
      else d.appendChild(document.createTextNode(part));
    });
  }
  function add(cls, text) { var d = document.createElement('div'); d.className = 'qa-m ' + cls; put(d, text); log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips(ids) {
    var box = $('.qa-chips'); box.textContent = '';
    (ids || []).forEach(function (id) {
      var e = byId[id]; if (!e || !e.q) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'qa-chip'; b.textContent = e.q; b.onclick = function () { ask(e.q, id); }; box.appendChild(b);
    });
  }
  function toggle(open) {
    root.classList.toggle('is-open', open); $('.qa-open').setAttribute('aria-expanded', open);
    if (open) { if (!log.children.length) { add('bot', intro); chips(start); } input.focus(); }
    else $('.qa-open').focus();
  }
  $('.qa-open').onclick = function () { toggle(true); };
  $('.qa-x').onclick = function () { toggle(false); };
  document.querySelectorAll('[data-assistant-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toggle(true); }); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

  /* ---- Compréhension locale ---- */
  function norm(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function score(e, t, words) {
    var n = 0;
    String(e.k || '').split('|').forEach(function (term) {
      term = norm(term); if (!term) return;
      var weight = term.length >= 8 || term.indexOf(' ') > -1 ? 2 : 1;
      var whole = term.length <= 4 && term.indexOf(' ') < 0;
      if (whole ? (' ' + t + ' ').indexOf(' ' + term + ' ') > -1 : (' ' + t).indexOf(' ' + term) > -1) n += weight;
      else if (term.length >= 5 && term.indexOf(' ') < 0 && words.some(function (w) { return w.length >= 4 && lev(w, term) <= 1; })) n += weight;
    });
    return n;
  }
  function best(text) {
    var t = norm(text), words = t.split(' '), top = null, topScore = 0, ranked = [];
    entries.forEach(function (e) { var n = score(e, t, words); if (n && e.w) n += e.w; if (n) ranked.push([n, e]); if (n > topScore) { topScore = n; top = e; } });
    ranked.sort(function (a, b) { return b[0] - a[0]; });
    return { entry: top, ranked: ranked };
  }
  function text(e, key) { var v = e[key || 'a']; return typeof v === 'function' ? v() : v; }

  function local(input, forced) {
    var t = norm(input);
    if (lead && leadOn) {
      if (lead.step === 'prenom') { lead.prenom = input.slice(0, 60); lead.step = 'tel'; return { a: 'Merci ' + lead.prenom + ' ! Quel est votre numéro de téléphone ?' }; }
      if (lead.step === 'tel') {
        if (t.replace(/\D/g, '').length < 8) return { a: 'Il me faut un numéro valide pour qu’on puisse vous rappeler.' };
        lead.tel = input.slice(0, 30); lead.step = 'demande'; return { a: 'Parfait. Quelle prestation et quel créneau souhaitez-vous ?' };
      }
      lead = null;
      return { a: 'C’est noté, la demande est transmise (simulation : rien n’a été envoyé dans cette démonstration). Sur un vrai site, vous la recevez par e-mail et vous rappelez pour confirmer.' };
    }
    if (leadOn && /\b(rendez|rdv|reserv|creneau|dispo)/.test(t)) { lead = { step: 'prenom' }; return { a: 'Avec plaisir. Quel est votre prénom ?' }; }
    var e = forced ? byId[forced] : null, r = null;
    if (!e) { r = best(input); e = r.entry; }
    /* « et le prix ? », « en savoir plus » : on reprend le sujet précédent */
    var prev = last && byId[last];
    if (e && e.generic && !forced) {
      var key = e.generic === 'prix' ? 'p' : 'more';
      if (prev && prev[key]) e = { id: prev.id, a: prev[key], next: prev.next };
      else if (e.generic === 'plus') e = null;
    }
    if (e) { misses = 0; return { a: text(e), id: e.id, next: e.next }; }
    misses++;
    if (kb && kb.fallback) return { a: misses > 1 && kb.fallback2 ? text({ a: kb.fallback2 }) : text({ a: kb.fallback }), next: start };
    return { a: 'Je n’ai pas cette information. Le plus simple est d’appeler' + (tel ? ' le ' + tel : ' directement') + ' : on vous répondra.' };
  }

  function ask(question, forced) {
    if (busy || !question.trim()) return;
    busy = true; send.disabled = true; $('.qa-chips').textContent = '';
    add('me', question); history.push({ role: 'user', text: question }); input.value = '';
    var wait = add('bot', '…');
    var done = function (reply, next) { put(wait, reply); log.scrollTop = log.scrollHeight; history.push({ role: 'assistant', text: reply }); busy = false; send.disabled = false; if (next) chips(next); input.focus(); };
    if (!api) {
      var out = local(question, forced); if (out.id && !(byId[out.id] && byId[out.id].social)) last = out.id;
      setTimeout(function () { done(out.a, out.next); }, 350 + Math.min(out.a.length * 3, 600));
      return;
    }
    fetch(api.replace(/\/$/, '') + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) { done(d.reply); })
      .catch(function () { wait.className = 'qa-m note'; done('L’assistant est indisponible pour le moment.' + (tel ? ' Appelez-nous au ' + tel + '.' : '')); });
  }
  $('.qa-form').onsubmit = function (e) { e.preventDefault(); ask(input.value); };
})();
