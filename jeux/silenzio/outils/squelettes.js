'use strict';
/* Squelettes posés à la main pour les modèles qui n'en ont pas (outils/modele-pret.js), en mètres du jeu :
   [nom, parent, début, fin]. Mesurés avec « node outils/modele-pret.js <fichier> <nom> » (tranches affichées). */
function cotes(k, o) {
  const s = k > 0 ? 'L' : 'R', m = p => [p[0] * k, p[1], p[2]];
  return [['clavicle.' + s, 'spine02', m(o.clav), m(o.epaule)], ['upperarm01.' + s, 'clavicle.' + s, m(o.epaule), m(o.coude)], ['lowerarm01.' + s, 'upperarm01.' + s, m(o.coude), m(o.poignet)],
    ['wrist.' + s, 'lowerarm01.' + s, m(o.poignet), m(o.main)], ['upperleg01.' + s, 'root', m(o.hanche), m(o.genou)], ['lowerleg01.' + s, 'upperleg01.' + s, m(o.genou), m(o.cheville)], ['foot.' + s, 'lowerleg01.' + s, m(o.cheville), m(o.orteils)]];
}
function squelette(o) {
  return [['root', null, o.bassin, o.taille], ['spine04', 'root', o.taille, o.poitrine], ['spine02', 'spine04', o.poitrine, o.cou], ['neck01', 'spine02', o.cou, o.nuque], ['head', 'neck01', o.nuque, o.crane], ...cotes(1, o), ...cotes(-1, o)];
}
const MANUEL = {
  joe: squelette({ bassin: [0, .92, 0], taille: [0, .99, 0], poitrine: [0, 1.17, -.01], cou: [0, 1.42, -.03], nuque: [0, 1.53, -.02], crane: [0, 1.78, 0],
    clav: [.03, 1.4, -.03], epaule: [.16, 1.385, -.03], coude: [.3, 1.215, -.035], poignet: [.405, 1.04, .06], main: [.5, .92, .12], hanche: [.095, .9, 0], genou: [.115, .5, 0], cheville: [.15, .09, -.03], orteils: [.16, .02, .12] })
};
/* Poids de peau par proximité des os (3 os au plus), épaules et hanches adoucies */
MANUEL.poids = (S, rang) => {
  const J = n => S.find(x => x[0] === n), lisse = (a, c, x) => { const t = Math.max(0, Math.min(1, (x - a) / (c - a))); return t * t * (3 - 2 * t); };
  const seg = (p, a, c) => { const d = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], l = d[0] ** 2 + d[1] ** 2 + d[2] ** 2, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l)); return [Math.hypot(p[0] - a[0] - d[0] * t, p[1] - a[1] - d[1] * t, p[2] - a[2] - d[2] * t), t]; };
  const yHanche = J('upperleg01.L')[2][1], yEpaule = J('upperarm01.L')[2][1], xEpaule = J('upperarm01.L')[2][0], yCou = J('neck01')[2][1];
  return (p, rigide) => {
    if (rigide) return [[rang[rigide], 1]];
    const [x, y] = p, s = x >= 0 ? 'L' : 'R', ax = Math.abs(x);
    if (y > yCou + .08 && ax < .13) { const t = lisse(yCou + .07, yCou + .13, y); return [[rang.head, t], [rang.neck01, 1 - t]].filter(w => w[1] > 0); }
    const ep = J('upperarm01.' + s), [dB, tB] = seg(p, ep[2], ep[3]);
    if (y > yEpaule - .22 && y < yEpaule + .12 && ax > xEpaule - .08 && tB < .35 && dB < .1) { const u = lisse(-.2, .35, tB) * lisse(xEpaule - .08, xEpaule + .01, ax); return [[rang['upperarm01.' + s], u], [rang.spine02, 1 - u]].filter(w => w[1] > 0); } // épaule : du buste au bras, sans la clavicule (évite les épaulettes)
    const hc = J('upperleg01.' + s), [, tC] = seg(p, hc[2], hc[3]);
    if (y > yHanche - .14 && y < yHanche + .1 && tC < .3 && ax < .24) { const u = lisse(yHanche + .06, yHanche - .12, y) * Math.min(1, .35 + lisse(0, .08, ax)); return [[rang['upperleg01.' + s], u], [rang.root, 1 - u]].filter(w => w[1] > 0); }
    const cand = [];
    for (const [n, , a, c] of S) {
      const cs = n.endsWith('.L') ? 'L' : n.endsWith('.R') ? 'R' : ''; if (cs && cs !== s) continue;
      if (/arm|wrist|clavicle/.test(n) && (ax < xEpaule - .03 || y < yHanche - .1)) continue;
      if (/leg|foot/.test(n) && y > yHanche + .1) continue;
      if (!cs && ax > xEpaule && y < yEpaule + .05) continue;
      if (/head|neck/.test(n) && y < yEpaule) continue;
      cand.push([rang[n], seg(p, a, c)[0]]);
    }
    const l = cand.map(([i, d]) => [i, 1 / Math.pow(d + .015, 4)]).sort((a, c) => c[1] - a[1]).slice(0, 3), t = l.reduce((a, c) => a + c[1], 0);
    return l.map(([i, w]) => [i, w / t]);
  };
};
module.exports = MANUEL;
