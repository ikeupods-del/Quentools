/* Pack Commerçant — éléments communs aux pages : couleur du commerce, bandeau de démonstration, échappement du texte.
   Abonnement hébergé (pro/) : PACK.heberge = adresse du commerce, gardée dans tous les liens internes (?c=…). */
(() => {
  const P = window.PACK || {};
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // Couleur du commerce : texte blanc sur l'accent si le contraste le permet, sinon texte foncé.
  function couleur(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return;
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
    const l = .2126 * c[0] + .7152 * c[1] + .0722 * c[2], s = document.documentElement.style;
    s.setProperty('--accent', hex); s.setProperty('--accent-ink', 1.05 / (l + .05) >= 4.5 ? '#fff' : '#121019');
    s.setProperty('--accent-soft', `color-mix(in srgb, ${hex} 14%, var(--surface))`);
  }
  couleur(P.couleur);
  const pret = f => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : f();
  // Lien interne avec l'adresse du commerce hébergé : q({ tampon: id }) → « ?c=atelier-lila&tampon=… »
  const q = (extra = {}) => { const u = new URLSearchParams({ ...(P.heberge ? { c: P.heberge } : {}), ...extra }).toString(); return u ? '?' + u : ''; };
  // P.racine = chemin des pages hébergées (ex. « /pro/ ») : les liens vers ces pages gardent l'adresse du commerce.
  if (P.heberge) document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.searchParams.has('c') || !u.pathname.startsWith(P.racine || '/')) return;
    u.searchParams.set('c', P.heberge); a.href = u.href;
  }, true);
  pret(() => {
    if (P.demo) document.body.insertAdjacentHTML('afterbegin', '<div class="demo-bandeau">Exemple fictif réalisé par <a href="https://quentools.fr/">QuenTools</a> : commerce, prix et données de démonstration.</div>');
    document.querySelectorAll('[data-p]').forEach(e => { const v = e.dataset.p.split('.').reduce((o, k) => o && o[k], P); if (v != null) e.textContent = v; });
    if (P.nom) document.title = document.title.replace('{nom}', P.nom);
  });
  window.PK = { esc, q };
})();
