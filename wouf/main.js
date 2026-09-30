'use strict';
/* Wouf — routeur, rendu, démarrage. */

const NAV_OF = { croquettes: 'plus', croquette: 'plus', 'croquettes-guide': 'plus', don: 'plus', balade: 'suivi', 'balade-detail': 'suivi', 'plan-poids': 'plus', bilan: 'plus', triage: 'plus', noms: 'plus', recherche: 'plus', meteo: 'plus', gardien: 'plus', home: 'home', carnet: 'carnet', plan: 'carnet', suivi: 'suivi', sos: 'sos', educ: 'educ', lecon: 'educ', seance: 'educ', principes: 'educ', programme: 'educ' };
let lastRoute = null;

function routeName() { return (location.hash.replace(/^#\/?/, '') || 'home').split('?')[0]; }

function render(keepScroll) {
  const r = routeName(), open = ['reglages', 'sauvegarde', 'abo', 'plus', 'transfert'];
  renderTop();
  let html;
  if (!S.dogs.length && !open.includes(r)) html = welcome();
  else html = (ROUTES[r] || ROUTES.home)();
  if (r === 'home' && S.dogs.length) html = movedBanner() + html;
  const y = window.scrollY;
  $('#view').innerHTML = html;
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.r === (NAV_OF[r] || 'plus')));
  $('#tabs').hidden = !S.dogs.length && !open.includes(r);
  if (keepScroll === true && lastRoute === r) window.scrollTo(0, y); else if (lastRoute !== r) window.scrollTo(0, 0);
  if (lastRoute !== r) track('/' + (!S.dogs.length && !open.includes(r) ? 'bienvenue' : r));
  lastRoute = r;
  if (r !== 'seance') clearInterval(SEANCE.iv);
  if (r !== 'balade') clearInterval(WALK.iv);
  const fn = ROUTES[r]; if (fn && fn.after) fn.after();
  document.title = 'Wouf — ' + (S.dogs.length && dog() ? dog().name : 'carnet de santé de votre animal');
}

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const fn = ACT[t.dataset.act];
  if (fn) { if (t.tagName === 'A' && t.getAttribute('href') === '#') e.preventDefault(); fn(t.dataset, t, e); }
});
addEventListener('hashchange', () => { closeAllSheets(); render(); });

/* Bibliothèque de races pour l'autocomplétion */
$('#breeds').innerHTML = BREEDS.map(b => `<option value="${esc(b.name)}">`).join('');
$('#breeds_cat').innerHTML = CAT_BREEDS.map(b => `<option value="${esc(b.name)}">`).join('');

addEventListener('appinstalled', () => track('installation', true));

/* Service worker */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').then(initUpdates).catch(() => {}));

/* Démarrage (sur l'ancienne adresse sans carnet : redirection vers l'adresse officielle) */
if (!movedRedirect()) {
  render();
  refreshSub().then(() => { if (routeName() === 'abo') render(true); });
  maybeNotify();
  cloudInit();
  walkRecover();
}
