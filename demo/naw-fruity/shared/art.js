/* Visuels : photographies des plateaux (dossier img/, voir CREDITS-PHOTOS.md) et petits fruits en SVG pour les logos.
   Pour mettre les photos de la cliente : remplacer les fichiers de img/ en gardant les noms. */
(function () {
  'use strict';
  let uid = 0;
  const f1 = n => Math.round(n * 10) / 10;
  const g = (x, y, r, rot, inner) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot || 0}) scale(${r})">${inner}</g>`;

  /* Fruits : dessinés dans un carré de rayon 1, mis à l'échelle ensuite */
  const F = {
    strawberry: choco => {
      const id = 'sb' + (++uid), body = 'M0 -.55 C.55 -.7 .8 -.1 .5 .35 C.3 .7 .1 .85 0 .9 C-.1 .85 -.3 .7 -.5 .35 C-.8 -.1 -.55 -.7 0 -.55z';
      return `<defs><clipPath id="${id}"><path d="${body}"/></clipPath></defs><path d="${body}" fill="#e23b52"/>` +
        (choco ? `<g clip-path="url(#${id})"><path d="M-1 .05 q.25 -.12 .5 0 t.5 0 t.5 0 t.5 0 V1 H-1z" fill="#4a2a1a"/><path d="M-.6 .2 q.1 .1 .2 0" stroke="#7a4a30" stroke-width=".06" fill="none"/></g>` : '') +
        `<g fill="#ffe08a">${[[-.25, -.2], [.2, -.25], [.05, .0], [-.3, .15], [.28, .12], [-.05, .3]].map(p => `<ellipse cx="${p[0]}" cy="${p[1] - (choco ? .35 : 0)}" rx=".035" ry=".05"/>`).join('')}</g>` +
        `<path d="M0 -.55 l-.25 -.12 l.2 -.05 l.05 -.18 l.1 .18 l.2 .05z" fill="#4f9a45"/>`;
    },
    slice: (c1, c2, segs, seeds) => `<circle r="1" fill="${c1}"/><circle r=".86" fill="${c2}"/>` + Array.from({ length: segs }, (_, i) => `<path d="M0 0 L${Math.cos(i * 2 * Math.PI / segs).toFixed(2) * .86} ${Math.sin(i * 2 * Math.PI / segs).toFixed(2) * .86}" stroke="#fff" stroke-opacity=".55" stroke-width=".05"/>`).join('') + (seeds ? `<g fill="#1d2a14">${Array.from({ length: 14 }, (_, i) => `<ellipse cx="${(Math.cos(i * .9) * .42).toFixed(2)}" cy="${(Math.sin(i * .9) * .42).toFixed(2)}" rx=".035" ry=".06" transform="rotate(${i * 50} ${(Math.cos(i * .9) * .42).toFixed(2)} ${(Math.sin(i * .9) * .42).toFixed(2)})"/>`).join('')}</g><circle r=".14" fill="#e8f5c8"/>` : `<circle r=".08" fill="#fff" fill-opacity=".6"/>`),
    grapes: () => [[0, -.55], [-.4, -.2], [.4, -.2], [-.2, .15], [.2, .15], [0, .5], [0, -.1]].map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r=".36" fill="${i % 2 ? '#7a3f93' : '#6a2f86'}"/><circle cx="${p[0] - .1}" cy="${p[1] - .1}" r=".08" fill="#fff" fill-opacity=".45"/>`).join('') + '<path d="M0 -.9 q.1 -.2 .3 -.25" stroke="#4f7a38" stroke-width=".07" fill="none"/>',
    blue: () => [[-.45, .1], [.4, .2], [0, -.35]].map(p => `<circle cx="${p[0]}" cy="${p[1]}" r=".4" fill="#35458f"/><circle cx="${p[0]}" cy="${p[1]}" r=".12" fill="#1f2a63"/><circle cx="${p[0] - .12}" cy="${p[1] - .14}" r=".06" fill="#fff" fill-opacity=".5"/>`).join(''),
    pine: () => `<rect x="-.8" y="-.55" width="1.6" height="1.1" rx=".2" fill="#ffd34d"/><path d="M-.5 -.55 l.4 1.1 M0 -.55 l.4 1.1 M.5 -.55 l.3 .85" stroke="#f2b01e" stroke-width=".07"/><rect x="-.8" y="-.55" width="1.6" height=".28" rx=".14" fill="#fff" fill-opacity=".18"/>`,
    mango: () => `<path d="M-.9 .2 C-.6 -.8 .6 -.8 .9 .2 C.5 -.2 -.5 -.2 -.9 .2z" fill="#ffa62b"/><path d="M-.9 .2 C-.5 -.2 .5 -.2 .9 .2 C.6 .5 -.6 .5 -.9 .2z" fill="#ffc45e"/>`,
    melon: c => `<rect x="-.7" y="-.7" width="1.4" height="1.4" rx=".22" fill="${c}"/><rect x="-.7" y="-.7" width="1.4" height=".4" rx=".2" fill="#fff" fill-opacity=".2"/>`,
    pom: () => `<circle r="1" fill="#b3203f"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${(Math.cos(i * 1.7) * (.2 + (i % 4) * .17)).toFixed(2)}" cy="${(Math.sin(i * 1.7) * (.2 + (i % 4) * .17)).toFixed(2)}" r=".1" fill="#ff5a73"/>`).join('')}`,
    cherry: () => `<path d="M-.2 -.2 Q0 -.9 .35 -.95 M.45 -.1 Q.4 -.7 .35 -.95" stroke="#4f7a38" stroke-width=".08" fill="none"/><circle cx="-.3" cy=".25" r=".42" fill="#c0142f"/><circle cx=".42" cy=".3" r=".42" fill="#d8223e"/><circle cx="-.42" cy=".1" r=".1" fill="#fff" fill-opacity=".5"/>`,
    banana: () => `<circle r="1" fill="#f6e08a"/><circle r=".78" fill="#fff3b8"/><circle r=".12" fill="#c9a03c"/>`,
    dragon: () => `<circle r="1" fill="#ec2f7a"/><circle r=".82" fill="#fff"/>${Array.from({ length: 22 }, (_, i) => `<circle cx="${(Math.cos(i * 2.4) * (.15 + (i % 5) * .13)).toFixed(2)}" cy="${(Math.sin(i * 2.4) * (.15 + (i % 5) * .13)).toFixed(2)}" r=".04" fill="#222"/>`).join('')}`,
    passion: () => `<circle r="1" fill="#6b3d8a"/><circle r=".8" fill="#f6b73c"/>${Array.from({ length: 12 }, (_, i) => `<ellipse cx="${(Math.cos(i * 2.1) * (.18 + (i % 3) * .2)).toFixed(2)}" cy="${(Math.sin(i * 2.1) * (.18 + (i % 3) * .2)).toFixed(2)}" rx=".08" ry=".12" fill="#4a2a1a"/>`).join('')}`,
    lychee: () => `<circle r="1" fill="#f5e6e1"/><circle r=".5" fill="#fff"/><circle cx="-.3" cy="-.35" r=".16" fill="#fff"/>`,
    apple: c => `<circle r="1" fill="${c}"/><circle cx="-.3" cy="-.3" r=".22" fill="#fff" fill-opacity=".35"/><path d="M0 -.9 q.1 -.35 .3 -.45" stroke="#6b4a2a" stroke-width=".08" fill="none"/><path d="M.1 -.8 q.4 -.3 .6 -.05 q-.3 .2 -.6 .05z" fill="#4f9a45"/>`,
    pear: () => `<path d="M0 -.9 C.4 -.9 .35 -.3 .7 .15 C1 .75 .45 1 0 1 C-.45 1 -1 .75 -.7 .15 C-.35 -.3 -.4 -.9 0 -.9z" fill="#b9c93c"/><circle cx="-.3" cy=".2" r=".12" fill="#fff" fill-opacity=".35"/>`,
    stick: cols => `<path d="M-.95 .6 L.95 -.6" stroke="#c99b62" stroke-width=".1" stroke-linecap="round"/>` + cols.map((c, i) => `<circle cx="${-.6 + i * .45}" cy="${.4 - i * .3}" r=".26" fill="${c}"/>`).join(''),
    swirl: () => `<circle r="1" fill="#3a2016"/><circle r=".8" fill="#4a2a1a"/><path d="M-.5 0 q.25 -.45 .5 0 t.5 0" stroke="#7a4a30" stroke-width=".12" fill="none"/><circle cx="-.3" cy="-.3" r=".16" fill="#fff" fill-opacity=".25"/>`
  };

  const PHOTO = { saison: 'decouverte', tropical: 'tropical', gourmand: 'gourmand', vitamine: 'vitamine', fete: 'fete', mini: 'mini', corbeille: 'corbeille', baies: 'baies', fraises: 'fraises', cagette: 'cagette', ananas: 'ananas', cerises: 'cerises', marche: 'marche' };
  const ALT = { saison: 'Plateau de fruits de saison', tropical: 'Plateau de fruits tropicaux', gourmand: 'Plateau de fruits au chocolat', vitamine: 'Fruits rouges et agrumes', fete: 'Plateau de fête', mini: 'Mini-box de fruits frais', corbeille: 'Corbeille de fruits' };
  const cur = document.currentScript, BASE = cur && cur.src ? cur.src.replace(/shared\/art\.js.*$/, 'img/') : '../img/';

  window.NFArt = {
    svg(kind, label) { const f = PHOTO[kind] || 'decouverte'; return `<img src="${BASE}${f}.jpg" alt="${String(label || ALT[kind] || 'Plateau de fruits').replace(/"/g, '&quot;')}" loading="lazy" decoding="async" draggable="false">`; },
    photo(kind, label) { return this.svg(kind, label); },
    url(kind) { return BASE + (PHOTO[kind] || 'decouverte') + '.jpg'; },
    /* Un seul fruit, pour la décoration */
    fruit(name) {
      const M = { strawberry: () => F.strawberry(false), choco: () => F.strawberry(true), orange: () => F.slice('#ff9f2f', '#ffc766', 9), lemon: () => F.slice('#ffd84d', '#fff08c', 8), grapefruit: () => F.slice('#ff7a6b', '#ffb3a8', 9), kiwi: () => F.slice('#7cb342', '#b7e36a', 0, true), grapes: F.grapes, blueberry: F.blue, cherry: F.cherry, pineapple: F.pine, mango: F.mango, dragon: F.dragon, pomegranate: F.pom, passion: F.passion, banana: F.banana };
      uid = 100; return `<svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${(M[name] || M.strawberry)()}</svg>`;
    },
    kinds: ['saison', 'tropical', 'gourmand', 'vitamine', 'fete', 'mini', 'corbeille']
  };
})();
