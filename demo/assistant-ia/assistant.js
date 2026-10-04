/* Assistant de site (QuenTools). Un seul fichier, sans bibliothèque ni cookie.
   <script src="assistant.js" data-nom="Salon Éclat" data-tel="01 23 45 67 89" data-api="https://relais.exemple.workers.dev" defer></script>
   data-api vide = mode démonstration : réponses prédéfinies, rien n'est envoyé nulle part. */
(function () {
  var s = document.currentScript;
  var nom = s.dataset.nom || 'Notre assistant', tel = s.dataset.tel || '', api = s.dataset.api || '';
  var faq = []; try { faq = JSON.parse(s.dataset.faq || '[]'); } catch (e) {}
  var history = [], lead = null, busy = false;

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

  function add(cls, text) { var d = document.createElement('div'); d.className = 'qa-m ' + cls; d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; }
  function chips() {
    var box = $('.qa-chips'); box.textContent = '';
    faq.forEach(function (f) { var b = document.createElement('button'); b.type = 'button'; b.className = 'qa-chip'; b.textContent = f.q; b.onclick = function () { ask(f.q); }; box.appendChild(b); });
  }
  function toggle(open) {
    root.classList.toggle('is-open', open); $('.qa-open').setAttribute('aria-expanded', open);
    if (open) { if (!log.children.length) { add('bot', 'Bonjour ! Je réponds à vos questions sur ' + nom + ' et je peux transmettre une demande de rendez-vous.'); chips(); } input.focus(); }
    else $('.qa-open').focus();
  }
  $('.qa-open').onclick = function () { toggle(true); };
  $('.qa-x').onclick = function () { toggle(false); };
  document.querySelectorAll('[data-assistant-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); toggle(true); }); });
  root.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

  /* Mode démonstration : mots-clés et petit parcours « demande de rendez-vous », sans IA ni envoi. */
  function demo(text) {
    var t = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (lead) {
      if (lead.step === 'prenom') { lead.prenom = text.slice(0, 60); lead.step = 'tel'; return 'Merci ' + lead.prenom + ' ! Quel est votre numéro de téléphone ?'; }
      if (lead.step === 'tel') {
        if (t.replace(/\D/g, '').length < 8) return 'Il me faut un numéro valide pour qu’on puisse vous rappeler.';
        lead.tel = text.slice(0, 30); lead.step = 'demande'; return 'Parfait. Quelle prestation et quel créneau souhaitez-vous ?';
      }
      lead = null;
      return 'C’est noté, la demande est transmise (simulation : rien n’a été envoyé dans cette démonstration). Sur un vrai site, vous la recevez par e-mail et vous rappelez pour confirmer.';
    }
    if (/rendez|rdv|reserv|creneau|dispo/.test(t)) { lead = { step: 'prenom' }; return 'Avec plaisir. Quel est votre prénom ?'; }
    var hit = faq.filter(function (f) { return f.k && new RegExp(f.k).test(t); })[0];
    if (hit) return hit.a;
    return 'Je n’ai pas cette information. Le plus simple est d’appeler' + (tel ? ' le ' + tel : ' directement') + ' : on vous répondra.';
  }

  function ask(text) {
    if (busy || !text.trim()) return;
    busy = true; send.disabled = true; $('.qa-chips').textContent = '';
    add('me', text); history.push({ role: 'user', text: text }); input.value = '';
    var wait = add('bot', '…');
    var done = function (reply) { wait.textContent = reply; log.scrollTop = log.scrollHeight; history.push({ role: 'assistant', text: reply }); busy = false; send.disabled = false; input.focus(); };
    if (!api) { setTimeout(function () { done(demo(text)); }, 450); return; }
    fetch(api.replace(/\/$/, '') + '/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12) }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (d) { done(d.reply); })
      .catch(function () { wait.className = 'qa-m note'; done('L’assistant est indisponible pour le moment.' + (tel ? ' Appelez-nous au ' + tel + '.' : '')); });
  }
  $('.qa-form').onsubmit = function (e) { e.preventDefault(); ask(input.value); };
})();
