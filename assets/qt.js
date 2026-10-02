/* QuenTools — comportements communs (sans dépendance) : en-tête qui se fige, apparition au défilement,
   compteurs animés, année du pied de page. Tout est facultatif : la page reste complète sans JavaScript. */
(() => {
  const root = document.documentElement; root.classList.add('js');
  const nav = document.querySelector('.nav');
  if (nav) { const on = () => nav.classList.toggle('is-stuck', scrollY > 8); on(); addEventListener('scroll', on, { passive: true }); }
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const els = document.querySelectorAll('.reveal');
  if (still || !('IntersectionObserver' in window)) els.forEach(e => e.classList.add('is-in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    els.forEach(e => io.observe(e));
  }
  // Compteurs : <b data-count="6700" data-prefix="+ de ">6 700</b>
  const fmt = n => n.toLocaleString('fr-FR');
  document.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (still || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => { if (!e.isIntersecting) return; io.disconnect(); const t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 1200), v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = pre + fmt(v) + suf; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step); });
    io.observe(el);
  });
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
})();
