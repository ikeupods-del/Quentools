/* Illustrations de plateaux de fruits (vue de dessus), en SVG. Les couleurs du plateau viennent du thème : --nf-tray et --nf-rim.
   À remplacer par les photographies de la cliente : même emplacement, même taille. */
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

  const ring = (n, R, a0, fn) => Array.from({ length: n }, (_, i) => { const a = a0 + i * 2 * Math.PI / n; return fn(i, 200 + Math.cos(a) * R, 200 + Math.sin(a) * R, a * 180 / Math.PI); }).join('');
  const tray = (shape, extra) => {
    if (shape === 'oval') return '<ellipse cx="200" cy="200" rx="188" ry="150" style="fill:var(--nf-rim,#e7dfd3)"/><ellipse cx="200" cy="200" rx="172" ry="134" style="fill:var(--nf-tray,#fff)"/>';
    if (shape === 'rect') return '<rect x="14" y="60" width="372" height="280" rx="34" style="fill:var(--nf-rim,#e7dfd3)"/><rect x="30" y="76" width="340" height="248" rx="22" style="fill:var(--nf-tray,#fff)"/>';
    return '<circle cx="200" cy="200" r="190" style="fill:var(--nf-rim,#e7dfd3)"/><circle cx="200" cy="200" r="172" style="fill:var(--nf-tray,#fff)"/>' + (extra || '');
  };

  const ART = {
    saison: () => tray('round') + ring(8, 128, .2, (i, x, y, r) => g(x, y, 42, r, [F.strawberry(false), F.slice('#ff9f2f', '#ffc766', 9), F.grapes(), F.slice('#7cb342', '#b7e36a', 0, true), F.blue(), F.strawberry(false), F.slice('#ff9f2f', '#ffc766', 9), F.grapes()][i])) + ring(5, 62, 0, (i, x, y, r) => g(x, y, 30, r * 2, [F.slice('#ff9f2f', '#ffc766', 9), F.banana(), F.slice('#7cb342', '#b7e36a', 0, true), F.cherry(), F.banana()][i])) + g(200, 200, 26, 0, F.pom()),
    tropical: () => tray('oval') + g(120, 170, 54, -20, F.pine()) + g(180, 130, 54, 10, F.pine()) + g(290, 150, 56, 20, F.mango()) + g(240, 230, 56, -10, F.mango()) + g(130, 250, 42, 0, F.slice('#7cb342', '#b7e36a', 0, true)) + g(205, 195, 40, 0, F.dragon()) + g(300, 235, 38, 0, F.passion()) + g(95, 215, 26, 0, F.lychee()) + g(270, 100, 26, 0, F.lychee()) + g(165, 265, 30, 0, F.slice('#ffd34d', '#fff0a6', 8)) + g(330, 195, 30, 0, F.lychee()),
    gourmand: () => tray('round') + ring(8, 128, 0, (i, x, y, r) => g(x, y, 40, r + 90, i % 2 ? F.strawberry(true) : F.strawberry(false))) + ring(5, 78, .4, (i, x, y, r) => g(x, y, 30, r, [F.strawberry(true), F.grapes(), F.slice('#7cb342', '#b7e36a', 0, true), F.strawberry(true), F.blue()][i])) + g(200, 200, 34, 0, F.swirl()),
    vitamine: () => tray('round') + ring(8, 128, .1, (i, x, y, r) => g(x, y, 44, r, [F.slice('#ff9f2f', '#ffc766', 10), F.slice('#ffd84d', '#fff08c', 8), F.slice('#ff7a6b', '#ffb3a8', 9), F.slice('#ff9f2f', '#ffc766', 10), F.slice('#ffd84d', '#fff08c', 8), F.slice('#ff7a6b', '#ffb3a8', 9), F.slice('#7cb342', '#b7e36a', 0, true), F.slice('#ff9f2f', '#ffc766', 10)][i])) + ring(6, 66, 0, (i, x, y, r) => g(x, y, 28, r, i % 2 ? F.blue() : F.grapes())) + g(200, 200, 34, 0, F.pom()),
    fete: () => tray('rect') + [0, 1, 2, 3, 4].map(i => g(70 + i * 65, 200, 100, -62 + i * 8, F.stick([['#e23b52', '#ffd34d', '#7cb342', '#6a2f86'], ['#ff9f2f', '#e23b52', '#35458f', '#ffd34d'], ['#7cb342', '#ec2f7a', '#ff9f2f', '#e23b52'], ['#6a2f86', '#ffd34d', '#e23b52', '#7cb342'], ['#ec2f7a', '#7cb342', '#ffd34d', '#ff9f2f']][i].slice(0, 3)))) + g(70, 290, 26, 0, F.strawberry(false)) + g(330, 120, 26, 0, F.slice('#ff9f2f', '#ffc766', 9)) + g(330, 290, 24, 0, F.grapes()) + g(70, 118, 22, 0, F.blue()),
    mini: () => '<g transform="translate(-52 -50) scale(1.26)">' + [0, 1, 2].map(i => `<g transform="translate(${34 + i * 118} 120)"><rect width="104" height="150" rx="16" style="fill:var(--nf-rim,#e7dfd3)"/><rect x="8" y="8" width="88" height="134" rx="10" fill="#fff" fill-opacity=".85"/>${g(52, 44, 26, 0, [F.strawberry(false), F.slice('#ff9f2f', '#ffc766', 9), F.grapes()][i])}${g(30, 92, 20, 0, [F.blue(), F.slice('#7cb342', '#b7e36a', 0, true), F.strawberry(false)][i])}${g(74, 94, 22, 0, [F.grapes(), F.banana(), F.blue()][i])}${g(52, 124, 14, 0, F.cherry())}<rect x="0" y="-10" width="104" height="16" rx="8" fill="#fff" fill-opacity=".6"/></g>`).join('') + '</g>',
    corbeille: () => '<ellipse cx="200" cy="300" rx="180" ry="60" fill="#c99b62"/><path d="M30 230 Q30 330 200 340 Q370 330 370 230z" fill="#b8854a"/>' + Array.from({ length: 9 }, (_, i) => `<path d="M${50 + i * 40} 245 q-6 50 6 85" stroke="#8d6532" stroke-width="5" fill="none"/>`).join('') + g(120, 200, 52, 0, F.apple('#d8223e')) + g(200, 175, 56, 0, '<circle r="1" fill="#ff9f2f"/><circle cx="-.3" cy="-.3" r=".22" fill="#fff" fill-opacity=".35"/><circle cx=".1" cy="-.95" r=".12" fill="#4f9a45"/>') + g(285, 200, 50, 0, F.apple('#7cb342')) + g(160, 130, 44, 0, F.pear()) + g(245, 128, 42, 0, F.apple('#e8533a')) + g(205, 105, 36, 0, F.grapes())
  };

  window.NFArt = {
    svg(kind, label) { const fn = ART[kind] || ART.saison; uid = 0; return `<svg viewBox="0 0 400 400" role="img" aria-label="${label || 'Plateau de fruits'}" xmlns="http://www.w3.org/2000/svg">${fn()}</svg>`; },
    /* Un seul fruit, pour la décoration */
    fruit(name) {
      const M = { strawberry: () => F.strawberry(false), choco: () => F.strawberry(true), orange: () => F.slice('#ff9f2f', '#ffc766', 9), lemon: () => F.slice('#ffd84d', '#fff08c', 8), grapefruit: () => F.slice('#ff7a6b', '#ffb3a8', 9), kiwi: () => F.slice('#7cb342', '#b7e36a', 0, true), grapes: F.grapes, blueberry: F.blue, cherry: F.cherry, pineapple: F.pine, mango: F.mango, dragon: F.dragon, pomegranate: F.pom, passion: F.passion, banana: F.banana };
      uid = 100; return `<svg viewBox="-1.15 -1.15 2.3 2.3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${(M[name] || M.strawberry)()}</svg>`;
    },
    kinds: Object.keys(ART)
  };
})();
