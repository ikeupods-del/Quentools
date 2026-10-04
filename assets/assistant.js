/* Assistant de site (QuenTools). Un seul fichier, sans bibliothèque ni cookie.
   <script src="assistant.js" data-nom="Salon Éclat" data-tel="01 23 45 67 89" data-api="https://relais.exemple.workers.dev" defer></script>
   data-api vide = mode local : l'assistant comprend la question (mots-clés, fautes de frappe, suite de la conversation) et répond avec
   les textes préparés, sans rien envoyer nulle part. data-api rempli = vraie IA via le relais (design/assistant-ia/worker.js).
   Connaissances : window.QT_ASSISTANT_KB = { intro, start:[id], entries:[{id, q, k, a, next, p, more}] } (voir assistant-qt.js),
   ou data-faq='[{q, k, a}]' (petite liste). k = mots-clés séparés par « | » (début de mot, accents et petites fautes tolérés) ;
   a = texte ou fonction () → texte ; next = suites proposées ; p = réponse à « et le prix ? » ; more = réponse à « en savoir plus ».
   Dans les textes, {R} = racine du site et les adresses https:// deviennent des liens.
   data-intro : message d'accueil ; data-lead="0" : pas de parcours « demande de rendez-vous ».
   kb.teaser : phrase de la petite bulle d'accroche (affichée une fois par session après quelques secondes) ; data-persist="0" : ne pas garder la conversation d'une page à l'autre. */
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
  var history = [], lead = null, busy = false, last = null, misses = 0, saved = [], persist = s.dataset.persist !== '0', SK = 'qa:' + location.host + ':' + nom.replace(/\W+/g, '').slice(0, 24);
  var store = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }, del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* idem */ } } };

  var root = document.createElement('div'); root.className = 'qa';
  root.innerHTML =
    '<div class="qa-teaser" hidden><button type="button" class="qa-teaser-go"></button><button type="button" class="qa-teaser-x" aria-label="Fermer">×</button></div>' +
    '<button type="button" class="qa-open" aria-expanded="false" aria-controls="qa-panel">💬 Une question ?</button>' +
    '<section class="qa-panel" id="qa-panel" aria-label="Assistant de ' + nom.replace(/[<&"]/g, '') + '">' +
    '<div class="qa-head"><div><strong></strong><small>Assistant automatique</small></div><div class="qa-tools"><button type="button" class="qa-new" aria-label="Nouvelle conversation" title="Nouvelle conversation">↻</button><button type="button" class="qa-x" aria-label="Fermer l’assistant">×</button></div></div>' +
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
  function remember(nextIds) { if (!persist) return; store.set(SK, JSON.stringify({ log: saved.slice(-40), next: nextIds || [], last: last })); }
  function add(cls, text, keep) { var d = document.createElement('div'); d.className = 'qa-m ' + cls; put(d, text); log.appendChild(d); log.scrollTop = log.scrollHeight; if (keep !== false && (cls === 'bot' || cls === 'me')) saved.push([cls, text]); return d; }
  function typing() { var d = document.createElement('div'); d.className = 'qa-m bot qa-typing'; d.setAttribute('aria-label', 'L’assistant écrit'); d.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips(ids) {
    var box = $('.qa-chips'); box.textContent = '';
    (ids || []).forEach(function (id) {
      var e = byId[id]; if (!e || !e.q) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'qa-chip'; b.textContent = e.q; b.onclick = function () { ask(e.q, id); }; box.appendChild(b);
    });
  }
  function toggle(open) {
    root.classList.toggle('is-open', open); $('.qa-open').setAttribute('aria-expanded', open);
    if (open) { hideTeaser(true); if (!log.children.length) restore(); input.focus(); }
    else $('.qa-open').focus();
  }
  function restore() {
    var d = null; try { d = JSON.parse(persist && store.get(SK) || 'null'); } catch (e) { d = null; }
    if (d && d.log && d.log.length) { saved = d.log.slice(); last = d.last || null; d.log.forEach(function (m) { add(m[0], m[1], false); }); chips(d.next && d.next.length ? d.next : start); }
    else { add('bot', intro); chips(start); remember(start); }
  }
  function reset() { saved = []; history = []; lead = null; last = null; misses = 0; log.textContent = ''; store.del(SK); add('bot', intro); chips(start); remember(start); input.focus(); }
  /* Petite bulle d'accroche : une seule fois par session, jamais si l'assistant a déjà été ouvert. */
  var teaser = $('.qa-teaser'), TK = SK + ':teaser';
  function hideTeaser(seen) { teaser.hidden = true; if (seen) store.set(TK, '1'); }
  if (kb && kb.teaser && !store.get(TK) && !store.get(SK)) setTimeout(function () {
    if (root.classList.contains('is-open') || store.get(TK)) return;
    $('.qa-teaser-go').textContent = typeof kb.teaser === 'function' ? kb.teaser() : kb.teaser; teaser.hidden = false;
  }, 14000);
  $('.qa-teaser-go').onclick = function () { toggle(true); };
  $('.qa-teaser-x').onclick = function () { hideTeaser(true); };
  $('.qa-new').onclick = reset;
  $('.qa-open').onclick = function () { toggle(true); };
  $('.qa-x').onclick = function () { toggle(false); };
  document.querySelectorAll('[data-assistant-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toggle(true); }); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

  /* ---- Compréhension locale ---- */
  function norm(t) { return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').map(function (w) { return w.length > 3 ? w.replace(/[sx]$/, '') : w; }).join(' '); }
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 2;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
    { d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); }   // lettres inversées (mian → main) : une seule faute
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
      else if (term.indexOf(' ') > 0 && term.split(' ').every(function (tw) { return tw.length < 3 || words.some(function (w) { return w.indexOf(tw) === 0 || (tw.length >= 4 && w.length >= 3 && lev(w, tw) <= 1); }); })) n += weight - 1;   // expression avec une faute de frappe
    });
    return n;
  }
  function best(text) {
    var t = norm(text), words = t.split(' '), top = null, topScore = 0, ranked = [];
    entries.forEach(function (e) { var n = score(e, t, words); if (n && e.w) n += e.w; if (n) ranked.push([n, e]); if (n > topScore) { topScore = n; top = e; } });
    ranked.sort(function (a, b) { return b[0] - a[0]; });
    return { entry: top, ranked: ranked };
  }
  /* Sans correspondance : sujets qui partagent au moins un mot (début de mot) avec la question, pour proposer « vous vouliez dire… ». */
  function suggest(text) {
    var words = norm(text).split(' ').filter(function (w) { return w.length >= 4; }), out = [];
    entries.forEach(function (e) {
      if (!e.q || e.social) return;
      var hay = ' ' + norm(e.k + ' ' + e.q), n = 0;
      words.forEach(function (w) { if (hay.indexOf(' ' + w.slice(0, Math.max(4, w.length - 2))) > -1) n++; });
      if (n) out.push([n, e.id]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    return out.slice(0, 3).map(function (x) { return x[1]; });
  }
  /* Suites proposées : celles du sujet, puis un second sujet presque aussi bien noté (la question pouvait en viser deux). */
  function follow(e, r) {
    var ids = (e && e.next ? e.next.slice() : []);
    if (r && r.ranked.length > 1 && r.ranked[0][1].id === (e && e.id)) {
      var b = r.ranked[1]; if (b[0] >= r.ranked[0][0] - 1 && b[1].q && !b[1].social && ids.indexOf(b[1].id) < 0) ids.unshift(b[1].id);
    }
    return ids.slice(0, 4);
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
    if (e) { misses = 0; return { a: text(e), id: e.id, next: follow(e, r) }; }
    misses++;
    var sug = suggest(input);
    if (kb && kb.fallback) return { a: (sug.length ? 'Je ne suis pas sûr d’avoir compris. Vous parliez peut-être de l’un de ces sujets ?' : (misses > 1 && kb.fallback2 ? text({ a: kb.fallback2 }) : text({ a: kb.fallback }))), next: sug.length ? sug.concat(['devis']).filter(function (x, i, a) { return a.indexOf(x) === i && byId[x]; }) : start };
    return { a: 'Je n’ai pas cette information. Le plus simple est d’appeler' + (tel ? ' le ' + tel : ' directement') + ' : on vous répondra.' };
  }

  function ask(question, forced) {
    if (busy || !question.trim()) return;
    busy = true; send.disabled = true; $('.qa-chips').textContent = '';
    add('me', question); history.push({ role: 'user', text: question }); input.value = '';
    var wait = typing(); log.setAttribute('aria-busy', 'true');
    var done = function (reply, next) { wait.classList.remove('qa-typing'); wait.removeAttribute('aria-label'); put(wait, reply); log.scrollTop = Math.max(0, wait.offsetTop - 12); log.removeAttribute('aria-busy');   // on lit la réponse depuis son début history.push({ role: 'assistant', text: reply }); if (wait.className.indexOf('note') < 0) saved.push(['bot', reply]); busy = false; send.disabled = false; if (next) chips(next); remember(next); input.focus(); };
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
