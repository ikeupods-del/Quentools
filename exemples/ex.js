/* Comportements de démonstration communs : les formulaires n'envoient rien et le disent. */
document.addEventListener('submit', function (e) {
  e.preventDefault();
  var f = e.target, n = f.querySelector('.qt-note');
  if (!n) { n = document.createElement('p'); n.className = 'qt-note'; n.setAttribute('role', 'status'); f.appendChild(n); }
  n.textContent = 'Démonstration : ce formulaire n’envoie rien. Sur un vrai site, la demande arrive directement chez le professionnel.';
});
document.querySelectorAll('[data-year]').forEach(function (n) { n.textContent = new Date().getFullYear(); });
