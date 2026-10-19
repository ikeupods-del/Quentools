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

// petit moteur d'animation : data-a = monte | fondu | pop | glisse | trait | compte | bouton, data-d = départ (s), data-u = durée (s)
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
    else if (a === 'trait') { tr = 'scaleX(' + p + ')'; op = 1; }
    else if (a === 'balaie') { const q = Math.max(0, Math.min(1, t / D)); tr = 'translateX(' + (-110 + 220 * doux(q)) + '%) skewX(-12deg)'; op = 1; }
    else if (a === 'compte') { const de = +e.dataset.de, vers = +e.dataset.vers; e.querySelector('b').textContent = nombre(de + (vers - de) * p, +e.dataset.dec, e.dataset.milliers === '1'); }
    else if (a === 'bouton') { const fait = t >= d; e.classList.toggle('fait', fait); op = Math.min(1, t / 0.35); tr = 'scale(' + (fait && t < d + 0.25 ? 0.92 : 1) + ')'; }
    if (!e.dataset.reste && t > D - 0.45) op *= Math.max(0, 1 - (t - (D - 0.45)) / 0.4); // tout s'efface à la fin
    e.style.opacity = op; if (tr) e.style.transform = tr;
  }
};
window.PRET = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { window.setT(0); return true; });`;

const COULEURS = { bleu: '#3f5ef0', ambre: '#f2b92b', rouge: '#ff4d4f', blanc: '#ffffff', nuit: '#0d0e11' };
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
  { id: 'volet', nom: 'Volet de transition', desc: 'Une bande de couleur balaie l’écran : à poser sur une coupe.', type: 'calque', duree: 1,
    champs: [['couleur', 'Couleur', 'bleu']],
    page: (v, o) => page(`<div data-a="balaie" data-reste="" style="position:absolute;top:-20%;bottom:-20%;width:70%;left:15%;background:linear-gradient(90deg,transparent,${COULEURS[v.couleur] || COULEURS.bleu} 25%,${COULEURS[v.couleur] || COULEURS.bleu} 75%,transparent)"></div>`, o) }
];

const DIMENSIONS = { horizontal: [1920, 1080], vertical: [1080, 1920], carre: [1080, 1080] };
const catalogue = () => MODELES.map(({ id, nom, desc, type, duree, champs }) => ({ id, nom, desc, type, duree, champs: champs.map(([cle, libelle, defaut]) => ({ cle, libelle, defaut })), couleurs: champs.some(c => c[0] === 'couleur') ? Object.keys(COULEURS).filter(c => c !== 'nuit') : null }));
// page HTML d'un modèle avec ses valeurs (champ vide = valeur par défaut) ; police = adresse data: de la police Inter
function pageDe(id, valeurs = {}, police = '') {
  const m = MODELES.find(x => x.id === id); if (!m) throw new Error('Animation inconnue');
  const v = {}; for (const [cle, , defaut] of m.champs) v[cle] = String(valeurs[cle] != null && String(valeurs[cle]).trim() !== '' ? valeurs[cle] : defaut).slice(0, 120);
  return { modele: m, html: m.page(v, { duree: m.duree, police }) };
}

module.exports = { MODELES, DIMENSIONS, catalogue, pageDe, nombreDe };
