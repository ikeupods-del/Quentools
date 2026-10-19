// Animations de QuentMovie : génériques, chiffres clés, bandeaux, appels à s'abonner, listes et volets, écrits en HTML et animés image par image
// (même principe que HyperFrames, sans rien à installer : la page est dessinée par les fenêtres cachées de l'application, puis assemblée par FFmpeg).
// Chaque modèle : { id, nom, desc, type: 'plein' (écran opaque, posé dans la vidéo) | 'calque' (transparent, posé par-dessus), duree, champs, page(v) }.
// La page expose window.setT(t) (t en secondes), window.FIN (durée) et window.PRET (polices chargées). Tailles en vmin : même rendu en 16:9, 9:16 et 1:1.
'use strict';

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// « 2,1 % », « 1 500 € », « x3 » : nombre de départ pour le compteur, décimales et texte autour
function nombreDe(t) {
  const m = /^(.*?)(\d(?:\d|[\s\u00a0\u202f](?=\d))*(?:[.,]\d+)?)(.*)$/.exec(String(t || '').trim()); // l'espace avant « € » reste dans le texte après le nombre
  if (!m) return null;
  const brut = m[2].replace(/[\s\u00a0\u202f]/g, ''), dec = (brut.split(/[.,]/)[1] || '').length;
  return { avant: m[1], valeur: +brut.replace(',', '.'), dec, apres: m[3], milliers: /\d[\s\u00a0\u202f]\d{3}/.test(m[2]) };
}

// petit moteur d'animation : data-a = monte | saute | fondu | pop | glisse | trait | dessine | compte | bouton, data-d = départ (s), data-u = durée (s)
// avant la première image : data-ajuste = texte réduit jusqu'à tenir en largeur et sous cette hauteur (vmin), data-sur + data-f = posé sur une courbe SVG, data-borne = gardé dans l'écran
const MOTEUR = `
const E = [...document.querySelectorAll('[data-a]')], D = window.FIN;
const doux = x => 1 - Math.pow(1 - x, 3), rebond = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const nombre = (v, dec, milliers) => { let s = v.toFixed(dec).replace('.', ','); if (milliers) s = s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ' '); return s; };
window.setT = t => {
  for (const e of E) {
    const d = +e.dataset.d || 0, u = +e.dataset.u || 0.6, k = Math.max(0, Math.min(1, (t - d) / u)), p = doux(k), a = e.dataset.a;
    let op = p, tr = '';
    if (a === 'monte') tr = 'translateY(' + ((1 - p) * 6) + 'vmin)';
    else if (a === 'pop') { tr = 'scale(' + (k ? rebond(k) : 0.001) + ')'; op = Math.min(1, k * 3); }
    else if (a === 'glisse') { tr = 'translateX(' + ((p - 1) * 110) + '%)'; op = 1; }
    else if (a === 'saute') { tr = 'translateY(' + ((1 - (k ? rebond(k) : 0)) * 9) + 'vmin)'; op = Math.min(1, k * 2.5); }
    else if (a === 'trait') { tr = 'scaleX(' + p + ')'; op = 1; }
    else if (a === 'dessine') { e.style.strokeDashoffset = 1 - p; op = 1; } // trait SVG (pathLength="1" stroke-dasharray="1")
    else if (a === 'balaie') { const q = Math.max(0, Math.min(1, t / D)); tr = 'translateX(' + (-110 + 220 * doux(q)) + '%) skewX(-12deg)'; op = 1; }
    else if (a === 'compte') { const de = +e.dataset.de, vers = +e.dataset.vers; e.querySelector('b').textContent = nombre(de + (vers - de) * p, +e.dataset.dec, e.dataset.milliers === '1'); }
    else if (a === 'bouton') { const fait = t >= d; e.classList.toggle('fait', fait); op = Math.min(1, t / 0.35); tr = 'scale(' + (fait && t < d + 0.25 ? 0.92 : 1) + ')'; }
    if (!e.dataset.reste && t > D - 0.45) op *= Math.max(0, 1 - (t - (D - 0.45)) / 0.4); // tout s'efface à la fin
    e.style.opacity = op; if (tr) e.style.transform = tr;
  }
};
function prepare() {
  const vm = Math.min(innerWidth, innerHeight) / 100;
  // tracé écrit pour une boîte data-cadre="L H", recalculé à la taille réelle : trait d'épaisseur régulière et pathLength juste
  for (const s of document.querySelectorAll('svg[data-cadre]')) { const [L, H] = s.dataset.cadre.split(' ').map(Number), w = s.clientWidth, h = s.clientHeight;
    for (const c of s.querySelectorAll('path')) { let i = 0; c.setAttribute('d', c.getAttribute('d').replace(/-?[\\d.]+/g, n => (+n * (i++ % 2 ? h / H : w / L)).toFixed(1))); }
    s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); }
  for (const e of document.querySelectorAll('[data-ajuste]')) { let f = parseFloat(getComputedStyle(e).fontSize), n = 0;
    while (n++ < 50 && (e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().height > +e.dataset.ajuste * vm)) { f *= 0.94; e.style.fontSize = f + 'px'; } }
  for (const e of document.querySelectorAll('[data-sur]')) { const c = document.querySelector(e.dataset.sur), vb = c.ownerSVGElement.viewBox.baseVal, q = c.getPointAtLength(+e.dataset.f * c.getTotalLength());
    e.style.left = q.x / vb.width * 100 + '%'; e.style.top = q.y / vb.height * 100 + '%'; }
  for (const e of document.querySelectorAll('[data-borne]')) { const r = e.getBoundingClientRect(), m = 3 * vm;
    if (r.left < m) e.style.marginLeft = (m - r.left) + 'px'; else if (r.right > innerWidth - m) e.style.marginLeft = (innerWidth - m - r.right) + 'px'; }
}
window.PRET = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { prepare(); window.setT(0); return true; });`;

const COULEURS = { bleu: '#3f5ef0', ambre: '#f2b92b', rouge: '#ff4d4f', or: '#c7a21a', blanc: '#ffffff', nuit: '#0d0e11' };
// style éditorial (fond crème, encre noire, accent or) et sa variante sombre
const THEMES = { crème: { fond: '#f6efc7', encre: '#15161a', gris: '#7a7562', carte: '#fffbe6' }, sombre: { fond: '#15161a', encre: '#f6efc7', gris: '#9c9886', carte: '#26272d' } };
const theme = v => THEMES[v.theme] || THEMES['crème'], accent = v => COULEURS[v.couleur] || COULEURS.or;
const CH_THEME = ['theme', 'Fond', 'crème', Object.keys(THEMES)], CH_ACCENT = ['couleur', 'Couleur', 'or'];
const MANUSCRIT = `'Snell Roundhand','Bradley Hand','Segoe Script',Georgia,serif`, MONO = `'SF Mono',Menlo,Consolas,monospace`;
const sansPonct = s => s.toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
// trois étapes posées sur la courbe : position (part de la longueur) et instant où le trait les atteint
const COURBE = { d: 0.9, u: 2.2, f: [0.17, 0.55, 0.94] };
const atteint = f => +(COURBE.d + COURBE.u * (1 - Math.cbrt(1 - f))).toFixed(2);
const VIGNETTES = [['#c7a21a', '#8a6d0b'], ['#e07a5f', '#a3482f'], ['#3d5a80', '#22344d'], ['#81b29a', '#4f7d67'], ['#f2cc8f', '#c99a4f'], ['#6d597a', '#43354d'], ['#2a9d8f', '#17645b'], ['#e76f51', '#a8432b']];
const COINS = { 'haut-droit': 'top:5vmin;right:5vmin;transform-origin:100% 0', 'haut-gauche': 'top:5vmin;left:5vmin;transform-origin:0 0', 'bas-droit': 'bottom:5vmin;right:5vmin;transform-origin:100% 100%', 'bas-gauche': 'bottom:5vmin;left:5vmin;transform-origin:0 100%' };
function page(corps, { duree, fond = 'transparent', police = '' }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${police ? `@font-face{font-family:Inter;src:url(${police}) format('woff2');font-weight:100 900}` : ''}
*{box-sizing:border-box;margin:0}html,body{width:100%;height:100%;overflow:hidden;background:${fond}}
body{font-family:Inter,-apple-system,Helvetica,Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;position:relative}
[data-a]{will-change:transform,opacity}
</style></head><body>${corps}<script>window.FIN = ${duree};${MOTEUR}</script></body></html>`;
}

const MODELES = [
  { id: 'intro', nom: 'Générique d’ouverture', desc: 'Titre et sous-titre sur un fond sombre, avec un trait de couleur. Posé au début de la vidéo.', type: 'plein', duree: 3.5,
    champs: [['titre', 'Titre', 'Mon titre'], ['sous', 'Sous-titre', 'Épisode 1'], ['couleur', 'Couleur', 'bleu']],
    page: (v, o) => page(`<div style="position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,#1d2647,#0d0e11 70%)"></div>
      <div style="position:absolute;left:10vmin;right:10vmin;top:50%;transform:translateY(-50%)">
        <div data-a="trait" data-d="0.2" data-u="0.7" data-reste="" style="height:1.2vmin;width:22vmin;border-radius:1vmin;background:${COULEURS[v.couleur] || COULEURS.bleu};transform-origin:left"></div>
        <h1 data-a="monte" data-d="0.45" data-u="0.7" style="font-size:9vmin;font-weight:800;letter-spacing:-.03em;line-height:1.05;margin-top:4vmin">${esc(v.titre)}</h1>
        <p data-a="fondu" data-d="1" data-u="0.6" style="font-size:4.2vmin;color:#a0a6b2;margin-top:2.5vmin">${esc(v.sous)}</p></div>`, { ...o, fond: '#0d0e11' }) },
  { id: 'fin', nom: 'Générique de fin', desc: 'Merci, appel à s’abonner et nom de la chaîne. Posé à la fin de la vidéo.', type: 'plein', duree: 4,
    champs: [['merci', 'Message', 'Merci d’avoir regardé !'], ['chaine', 'Chaîne', 'Ma chaîne'], ['appel', 'Appel', 'Abonne-toi pour la suite']],
    page: (v, o) => page(`<div style="position:absolute;inset:0;background:radial-gradient(circle at 70% 80%,#1d2647,#0d0e11 70%)"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8vmin;gap:3vmin">
        <h1 data-a="monte" data-d="0.2" style="font-size:8vmin;font-weight:800;letter-spacing:-.02em">${esc(v.merci)}</h1>
        <div data-a="pop" data-d="0.8" data-u="0.6" style="padding:2.2vmin 5vmin;border-radius:99vmin;background:${COULEURS.rouge};font-size:4.4vmin;font-weight:700">${esc(v.appel)}</div>
        <p data-a="fondu" data-d="1.3" style="font-size:3.8vmin;color:#a0a6b2;letter-spacing:.08em;text-transform:uppercase">${esc(v.chaine)}</p></div>`, { ...o, fond: '#0d0e11' }) },
  { id: 'chiffre', nom: 'Chiffre clé', desc: 'Un grand chiffre qui défile jusqu’à sa valeur, avec une légende. Transparent, par-dessus la vidéo.', type: 'calque', duree: 4,
    champs: [['valeur', 'Chiffre', '2,1 %'], ['legende', 'Légende', 'd’inflation en un an'], ['couleur', 'Couleur', 'ambre']],
    page: (v, o) => { const n = nombreDe(v.valeur);
      const gros = n ? `<span data-a="compte" data-d="0.3" data-u="1.4" data-de="0" data-vers="${n.valeur}" data-dec="${n.dec}" data-milliers="${n.milliers ? 1 : 0}" data-reste="">${esc(n.avant)}<b>0</b>${esc(n.apres)}</span>` : esc(v.valeur);
      return page(`<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);text-align:center">
        <div data-a="pop" data-d="0.1" data-u="0.5" style="padding:4vmin 7vmin;border-radius:4vmin;background:rgba(13,14,17,.82);box-shadow:0 2vmin 6vmin rgba(0,0,0,.45)">
          <div style="font-size:17vmin;font-weight:800;letter-spacing:-.04em;color:${COULEURS[v.couleur] || COULEURS.ambre};font-variant-numeric:tabular-nums">${gros.replace('<b>', '<b style="font-weight:800">')}</div>
          <div data-a="fondu" data-d="0.9" style="font-size:4.4vmin;margin-top:1vmin">${esc(v.legende)}</div></div></div>`, o); } },
  { id: 'bandeau', nom: 'Bandeau nom', desc: 'Nom et rôle en bas à gauche (tiers inférieur), qui glissent depuis le bord.', type: 'calque', duree: 4.5,
    champs: [['nom', 'Nom', 'Prénom Nom'], ['role', 'Rôle', 'Fondateur'], ['couleur', 'Couleur', 'bleu']],
    page: (v, o) => page(`<div style="position:absolute;left:6vmin;bottom:12vmin;overflow:hidden;padding-right:2vmin">
      <div data-a="glisse" data-d="0.1" data-u="0.6" style="display:flex;align-items:stretch">
        <div style="width:1.6vmin;background:${COULEURS[v.couleur] || COULEURS.bleu};border-radius:1vmin 0 0 1vmin"></div>
        <div style="background:rgba(13,14,17,.88);padding:2vmin 4vmin;border-radius:0 1.5vmin 1.5vmin 0">
          <div style="font-size:5.2vmin;font-weight:700">${esc(v.nom)}</div>
          <div data-a="fondu" data-d="0.55" style="font-size:3.4vmin;color:#a0a6b2;margin-top:.5vmin">${esc(v.role)}</div></div></div></div>`, o) },
  { id: 'abonne', nom: 'Abonne-toi', desc: 'Bouton « S’abonner » qui devient « Abonné ✓ », en bas de l’écran.', type: 'calque', duree: 3,
    champs: [['texte', 'Bouton', 'S’abonner'], ['fait', 'Après le clic', 'Abonné ✓']],
    page: (v, o) => page(`<style>.bt{position:relative;padding:2.4vmin 6vmin;border-radius:99vmin;background:${COULEURS.rouge};font-size:5vmin;font-weight:800;box-shadow:0 1.5vmin 4vmin rgba(0,0,0,.4)}
      .bt .b{display:none}.bt.fait{background:#2a2e38}.bt.fait .a{display:none}.bt.fait .b{display:inline}</style>
      <div style="position:absolute;left:0;right:0;bottom:14vmin;display:flex;justify-content:center"><div class="bt" data-a="bouton" data-d="1.3"><span class="a">${esc(v.texte)}</span><span class="b">${esc(v.fait)}</span></div></div>`, o) },
  { id: 'liste', nom: 'Liste à points', desc: 'Un titre et trois points qui apparaissent l’un après l’autre, dans une carte.', type: 'calque', duree: 5.5,
    champs: [['titre', 'Titre', 'À retenir'], ['p1', 'Point 1', 'Premier point'], ['p2', 'Point 2', 'Deuxième point'], ['p3', 'Point 3', 'Troisième point']],
    page: (v, o) => page(`<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(84vw,120vmin)">
      <div data-a="pop" data-d="0.1" data-u="0.45" style="background:rgba(13,14,17,.86);border-radius:4vmin;padding:5vmin 6vmin;box-shadow:0 2vmin 6vmin rgba(0,0,0,.45)">
        <div style="font-size:4vmin;font-weight:700;color:${COULEURS.ambre};text-transform:uppercase;letter-spacing:.08em;margin-bottom:2.5vmin">${esc(v.titre)}</div>
        ${[v.p1, v.p2, v.p3].filter(x => String(x || '').trim()).map((p, i) => `<div data-a="monte" data-d="${(0.6 + i * 0.7).toFixed(1)}" style="display:flex;gap:2.5vmin;align-items:center;font-size:5vmin;font-weight:600;margin-top:2vmin"><span style="flex:none;width:6vmin;height:6vmin;border-radius:50%;background:${COULEURS.bleu};display:grid;place-items:center;font-size:3.4vmin">✓</span>${esc(p)}</div>`).join('')}
      </div></div>`, o) },
  { id: 'grand-titre', nom: 'Grand titre éditorial', desc: 'Sur-titre, grand titre qui arrive mot par mot (un mot en couleur), puis une phrase manuscrite soulignée. Fond crème ou sombre.', type: 'plein', duree: 4,
    champs: [['sur', 'Sur-titre', 'LE MONTAGE VIDÉO'], ['titre', 'Titre', 'N’EST PLUS JAMAIS'], ['mot', 'Mot en couleur', 'JAMAIS'], ['phrase', 'Phrase', 'ce qui t’arrête'], CH_THEME, CH_ACCENT],
    page: (v, o) => { const T = theme(v), A = accent(v), mots = v.titre.split(/\s+/).filter(Boolean);
      let ici = mots.findIndex(m => sansPonct(m) === sansPonct(v.mot)); if (ici < 0) ici = mots.length - 1;
      const pas = Math.min(0.2, 1.2 / mots.length), fin = 0.45 + (mots.length - 1) * pas + 0.45; // titre long : les mots arrivent plus vite
      return page(`<div style="position:absolute;left:8vmin;right:8vmin;top:50%;transform:translateY(-50%)">
        <div data-a="fondu" data-d="0.1" data-u="0.5" style="display:flex;align-items:center;gap:2vmin;font-size:3.4vmin;font-weight:700;letter-spacing:.18em;color:${T.gris};text-transform:uppercase"><span style="width:5vmin;height:.6vmin;background:${A};border-radius:1vmin"></span>${esc(v.sur)}</div>
        <h1 data-ajuste="62" style="font-size:15vmin;font-weight:900;line-height:.95;letter-spacing:-.035em;text-transform:uppercase;color:${T.encre};margin-top:3vmin">${mots.map((m, i) => `<span data-a="saute" data-d="${(0.45 + i * pas).toFixed(2)}" data-u="0.55" style="display:inline-block;${i === ici ? `color:${A}` : ''}">${esc(m)}</span>`).join(' ')}</h1>
        <div style="margin-top:4vmin"><span data-a="fondu" data-d="${fin.toFixed(2)}" data-u="0.5" style="position:relative;display:inline-block;font-family:${MANUSCRIT};font-style:italic;font-size:7.5vmin;color:${T.encre}">${esc(v.phrase)}
          <svg data-cadre="100 10" style="position:absolute;left:-3%;width:106%;bottom:-2.2vmin;height:3vmin;overflow:visible"><path data-a="dessine" data-d="${(fin + 0.35).toFixed(2)}" data-u="0.6" d="M2,6 C25,2 55,9 98,4" pathLength="1" stroke-dasharray="1" fill="none" stroke="${A}" stroke-linecap="round" style="stroke-width:.9vmin"/></svg></span></div></div>`, { ...o, fond: T.fond }); } },
  { id: 'parcours', nom: 'Parcours en 3 étapes', desc: 'Un titre, puis une courbe qui se dessine en passant par trois étapes. Fond crème ou sombre.', type: 'plein', duree: 5,
    champs: [['titre', 'Titre', 'Pendant que tu parles, il fabrique la vidéo'], ['e1', 'Étape 1', 'TON RUSH BRUT'], ['e2', 'Étape 2', 'COUPÉ, SONORISÉ, ILLUSTRÉ'], ['e3', 'Étape 3', 'PRÊT À PUBLIER'], CH_THEME, CH_ACCENT],
    page: (v, o) => { const T = theme(v), A = accent(v);
      const etapes = [v.e1, v.e2, v.e3].map((e, i) => { const t = atteint(COURBE.f[i]), der = i === 2;
        return `<div data-sur="#courbe" data-f="${COURBE.f[i]}" style="position:absolute;width:0;height:0">
          <div data-a="pop" data-d="${(t - 0.1).toFixed(2)}" data-u="0.45" style="position:absolute;left:-2.1vmin;top:-2.1vmin;width:4.2vmin;height:4.2vmin;border-radius:50%;background:${der ? A : T.encre};border:.9vmin solid ${T.fond}"></div>
          <div data-borne="" style="position:absolute;left:0;bottom:4vmin;transform:translateX(-${[25, 60, 90][i]}%)"><div data-a="monte" data-d="${(t + 0.1).toFixed(2)}" data-u="0.45" style="display:flex;align-items:center;gap:1.4vmin;white-space:nowrap;padding:1.4vmin 2.4vmin;border-radius:99vmin;font-family:${MONO};font-size:2.7vmin;font-weight:700;letter-spacing:.06em;text-transform:uppercase;${der ? `background:${T.encre};color:${T.fond}` : `background:${T.carte};color:${T.encre};box-shadow:0 .5vmin 1.5vmin rgba(0,0,0,.08)`}">${der ? `<span style="width:1.6vmin;height:1.6vmin;border-radius:50%;background:${A}"></span>` : ''}${esc(e)}</div></div></div>`; }).join('');
      return page(`<h1 data-a="monte" data-d="0.1" data-u="0.6" data-ajuste="30" style="position:absolute;left:7vmin;right:7vmin;top:7vmin;max-width:120vmin;font-size:8vmin;font-weight:800;line-height:1.05;letter-spacing:-.03em;color:${T.encre}">${esc(v.titre)}</h1>
        <div style="position:absolute;left:7vmin;right:7vmin;top:44vmin;bottom:9%">
          <svg data-cadre="1000 500" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible"><path id="courbe" data-a="dessine" data-d="${COURBE.d}" data-u="${COURBE.u}" d="M0,460 C160,460 220,420 300,370 S480,260 600,240 S820,180 880,110 S960,40 1000,30" pathLength="1" stroke-dasharray="1" fill="none" stroke="${T.encre}" stroke-linecap="round" style="stroke-width:1.6vmin"/></svg>
          ${etapes}</div>`, { ...o, fond: T.fond }); } },
  { id: 'grille', nom: 'Grille de vignettes', desc: 'Un titre et huit vignettes de couleur qui apparaissent une à une. Fond crème ou sombre.', type: 'plein', duree: 4.5,
    champs: [['titre', 'Titre', 'Toutes tes vidéos, au même endroit'], CH_THEME, CH_ACCENT],
    page: (v, o) => { const T = theme(v), A = accent(v);
      return page(`<style>.gr{position:absolute;inset:0;display:flex;align-items:center;gap:7vmin;padding:7vmin}.gr h1{flex:0 0 34%}.gr .g{flex:1}
        @media (max-aspect-ratio:1/1){.gr{flex-direction:column;align-items:stretch;justify-content:center;gap:6vmin}.gr h1,.gr .g{flex:none}}
        .g{display:grid;grid-template-columns:repeat(4,1fr);gap:2.2vmin}.v{position:relative;aspect-ratio:4/5;border-radius:2.4vmin;overflow:hidden;box-shadow:0 1vmin 2.5vmin rgba(0,0,0,.14)}
        .v i{position:absolute;left:50%;top:42%;width:6vmin;height:6vmin;margin:-3vmin;border-radius:50%;background:rgba(255,255,255,.88)}.v i:after{content:'';position:absolute;left:2.4vmin;top:1.75vmin;border-left:1.8vmin solid #15161a;border-top:1.25vmin solid transparent;border-bottom:1.25vmin solid transparent}
        .v b{position:absolute;left:12%;right:30%;bottom:16%;height:1vmin;border-radius:1vmin;background:rgba(255,255,255,.75)}.v b+b{right:50%;bottom:9%;background:rgba(255,255,255,.45)}</style>
        <div class="gr"><h1 data-a="monte" data-d="0.1" data-u="0.6" data-ajuste="34" style="font-size:8.5vmin;font-weight:800;line-height:1.02;letter-spacing:-.03em;color:${T.encre}">${esc(v.titre)}<span style="display:block;width:12vmin;height:1vmin;border-radius:1vmin;background:${A};margin-top:3vmin"></span></h1>
        <div class="g">${VIGNETTES.map(([a, b], i) => `<div class="v" data-a="pop" data-d="${(0.5 + i * 0.16).toFixed(2)}" data-u="0.5" style="background:linear-gradient(150deg,${a},${b})"><i></i><b></b><b></b></div>`).join('')}</div></div>`, { ...o, fond: T.fond }); } },
  { id: 'cadre-camera', nom: 'Cadre caméra', desc: 'Un cadre arrondi qui se pose dans un coin : place-y ta vidéo (piste vidéo 2) au-dessus d’un fond. Le centre reste transparent.', type: 'calque', duree: 4,
    champs: [['coin', 'Coin', 'haut-droit', Object.keys(COINS)], CH_THEME, CH_ACCENT],
    page: (v, o) => { const T = theme(v), A = accent(v);
      return page(`<div data-a="pop" data-d="0.1" data-u="0.55" style="position:absolute;${COINS[v.coin] || COINS['haut-droit']};width:46vmin;aspect-ratio:4/3;border-radius:4vmin;border:1.2vmin solid ${T.fond};box-shadow:0 1.5vmin 5vmin rgba(0,0,0,.35)">
        <div style="position:absolute;inset:0;border-radius:2.8vmin;border:.5vmin solid ${A}"></div></div>`, o); } },
  { id: 'volet', nom: 'Volet de transition', desc: 'Une bande de couleur balaie l’écran : à poser sur une coupe.', type: 'calque', duree: 1,
    champs: [['couleur', 'Couleur', 'bleu']],
    page: (v, o) => page(`<div data-a="balaie" data-reste="" style="position:absolute;top:-20%;bottom:-20%;width:70%;left:15%;background:linear-gradient(90deg,transparent,${COULEURS[v.couleur] || COULEURS.bleu} 25%,${COULEURS[v.couleur] || COULEURS.bleu} 75%,transparent)"></div>`, o) }
];

const DIMENSIONS = { horizontal: [1920, 1080], vertical: [1080, 1920], carre: [1080, 1080] };
const catalogue = () => MODELES.map(({ id, nom, desc, type, duree, champs }) => ({ id, nom, desc, type, duree, champs: champs.map(([cle, libelle, defaut, options]) => ({ cle, libelle, defaut, ...(options ? { options } : {}) })), couleurs: champs.some(c => c[0] === 'couleur') ? Object.keys(COULEURS).filter(c => c !== 'nuit') : null }));
// page HTML d'un modèle avec ses valeurs (champ vide = valeur par défaut) ; police = adresse data: de la police Inter
function pageDe(id, valeurs = {}, police = '') {
  const m = MODELES.find(x => x.id === id); if (!m) throw new Error('Animation inconnue');
  const v = {}; for (const [cle, , defaut] of m.champs) v[cle] = String(valeurs[cle] != null && String(valeurs[cle]).trim() !== '' ? valeurs[cle] : defaut).slice(0, 120);
  return { modele: m, html: m.page(v, { duree: m.duree, police }) };
}

module.exports = { MODELES, DIMENSIONS, catalogue, pageDe, nombreDe };
