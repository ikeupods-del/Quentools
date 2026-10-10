/* QuenTools — génère conseils/index.html à partir de tools/publications.json : node tools/conseils.js
   Chaque publication des réseaux a ainsi sa version lisible sur le site (la bio renvoie vers cette page). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const posts = JSON.parse(fs.readFileSync(path.join(__dirname, 'publications.json'), 'utf8')).filter(p => !p.hors_page);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const plain = t => t.replace(/\*(.+?)\*/g, '$1');
const body = p => p.legende.split('\n').filter(l => !/^#\w/.test(l.trim())).join('\n').trim().split(/\n{2,}/).map(par => `<p>${esc(par).replace(/\n/g, '<br>')}</p>`).join('');
const cards = posts.map((p, i) => `    <article class="card reveal" style="--i:${i % 3};display:grid;gap:var(--s-4);align-content:start" id="${esc(p.id)}">
      <img src="../assets/social/${esc(p.id)}.jpg" alt="${esc(plain(p.titre))}" width="540" height="675" loading="lazy" style="border-radius:var(--r-md);width:100%;height:auto">
      <span class="eyebrow">${esc(p.etiquette)}</span><h2 style="font-size:var(--t-xl)">${esc(plain(p.titre))}</h2>
      ${body(p)}
    </article>`).join('\n');
const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Conseils pour votre site internet · QuenTools</title>
<meta name="description" content="Des conseils simples et concrets pour les artisans, commerçants et indépendants : site sur téléphone, fiche Google, nom de domaine, mentions légales, sécurité. Sans jargon.">
<link rel="canonical" href="https://quentools.fr/conseils/">
<meta property="og:title" content="Conseils pour votre site internet · QuenTools">
<meta property="og:image" content="https://quentools.fr/assets/partage.jpg?v=2">
<link rel="icon" href="../assets/logo.svg" type="image/svg+xml">
<link rel="preload" href="../assets/fonts/bricolage.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="../assets/qt.css?v=20261001h">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9406894983294380" crossorigin="anonymous"></script>
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="nav"><div class="wrap">
  <a class="brand" href="../" aria-label="QuenTools, accueil"><img class="brand-mark" src="../assets/logo.svg" alt="" width="32" height="32">QuenTools</a>
  <ul class="nav-links"><li><a href="../#sur-mesure">Offres et tarifs</a></li><li><a href="../templates/">Templates</a></li><li><a href="../audit/">Audit</a></li><li><a href="../decodeur-courrier.html">Paperdecrypt</a></li></ul>
  <span class="nav-actions"><a class="btn btn-sm btn-accent" href="../devis/">Demander un devis</a></span>
</div></header>

<main id="contenu">
  <section class="hero" style="padding-bottom:var(--s-6)">
    <div class="bg-grid" aria-hidden="true"></div>
    <div class="wrap">
      <span class="eyebrow reveal">Conseils</span>
      <h1 class="display reveal" style="--i:1;max-width:20ch">Votre site, <em>sans jargon</em>.</h1>
      <p class="lede reveal" style="--i:2">Les conseils que je partage sur Instagram et TikTok, réunis ici : simples, concrets, et que vous pouvez appliquer dès aujourd’hui.</p>
    </div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap"><div class="grid grid-3">
${cards}
    </div></div>
  </section>
  <section class="section" style="padding-top:0">
    <div class="wrap"><div class="cta-band reveal">
      <span class="big-q" aria-hidden="true">Q</span>
      <h2 style="margin:var(--s-4) 0">Une question sur votre site ?</h2>
      <p>Décrivez-moi votre activité en quelques lignes. Devis gratuit et sans engagement, prix fixé avant de commencer.</p>
      <div class="hero-cta" style="margin-top:var(--s-6)"><a class="btn btn-accent" href="../devis/">Demander un devis</a><a class="btn btn-ghost" href="../audit/">Audit de sécurité express</a></div>
    </div></div>
  </section>
</main>
<footer class="footer"><div class="wrap"><div class="footer-bottom" style="margin-top:0;border-top:0;padding-top:0">
  <span>© <span data-year>2026</span> QuenTools</span><span><a href="../devis/">Devis</a> · <a href="../templates/">Templates</a> · <a href="../">Accueil</a></span>
</div></div></footer>
<script src="../assets/qt.js?v=20261001h" defer></script>
</body>
</html>
`;
fs.mkdirSync(path.join(root, 'conseils'), { recursive: true });
fs.writeFileSync(path.join(root, 'conseils', 'index.html'), html);
console.log('conseils/index.html :', posts.length, 'conseils');
