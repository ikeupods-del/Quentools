// Pico — images de la vidéo : une page HTML 1920×1080 par réplique (graphique à gauche, Pico à droite).
// Couleurs de Patrimoine AI. Chaque type d'écran du fichier de l'épisode a sa fonction ci-dessous.
'use strict';
const fs = require('fs'), path = require('path');

const RACINE = path.join(__dirname, '..', '..', '..');
const b64 = (f, mime) => `data:${mime};base64,` + fs.readFileSync(f).toString('base64');
const POLICE = b64(path.join(RACINE, 'assets', 'fonts', 'inter.woff2'), 'font/woff2');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fr = n => String(n).replace('.', ',');

const CSS = `
@font-face{font-family:Inter;src:url(${POLICE});font-weight:100 900}
*{box-sizing:border-box;margin:0}
:root{--fond:#151311;--carte:#1f1c19;--trait:#2e2a26;--vert:#10b981;--menthe:#6ee7b7;--ambre:#fbbf24;--creme:#f4f2ee;--doux:#a8a196}
body{width:1920px;height:1080px;overflow:hidden;font-family:Inter,sans-serif;color:var(--creme);
  background:radial-gradient(1200px 800px at 80% 90%,rgba(16,185,129,.22),transparent 60%),radial-gradient(900px 600px at 5% 0%,rgba(251,191,36,.07),transparent 60%),var(--fond);position:relative}
.marque{position:absolute;left:90px;top:56px;display:flex;align-items:center;gap:16px;font-weight:800;font-size:34px;letter-spacing:.5px}
.marque i{width:30px;height:30px;background:var(--vert);transform:rotate(45deg);border-radius:6px;display:block}
.marque b{color:var(--ambre)}
.section{position:absolute;right:90px;top:62px;font-size:26px;font-weight:600;color:var(--doux)}
.zone{position:absolute;left:90px;top:150px;width:1120px;height:620px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.pico{position:absolute;right:80px;bottom:240px;height:690px}
.mention{position:absolute;left:0;right:0;bottom:0;height:56px;background:rgba(0,0,0,.35);border-top:1px solid var(--trait);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--doux);letter-spacing:.3px}
.source{position:absolute;left:90px;top:780px;width:1120px;font-size:24px;color:var(--doux)}
.source:before{content:"";display:inline-block;width:12px;height:12px;background:var(--ambre);border-radius:3px;margin-right:12px}
h1{font-size:96px;line-height:1.05;font-weight:800;letter-spacing:-1.5px}
h1 em{font-style:normal;color:var(--menthe)}
h2{font-size:60px;line-height:1.12;font-weight:800;letter-spacing:-.5px}
.sous{font-size:38px;line-height:1.3;color:var(--doux);font-weight:500}
.gros{font-size:210px;line-height:1;font-weight:800;color:var(--ambre);letter-spacing:-4px}
.carte{background:var(--carte);border:2px solid var(--trait);border-radius:28px;padding:44px 52px}
.mot{font-size:40px;font-weight:700;color:var(--ambre);text-transform:uppercase;letter-spacing:3px}
.def{font-size:56px;line-height:1.2;font-weight:700}
.grille{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}
.pastille{height:96px;border-radius:20px;background:var(--trait);border:2px solid #3a352f}
.pastille.on{background:var(--ambre);border-color:var(--ambre);box-shadow:0 0 36px rgba(251,191,36,.45)}
.etiquette{font-size:38px;font-weight:700;color:var(--menthe)}
.barre{display:flex;align-items:center;gap:26px}
.barre .an{width:130px;font-size:46px;font-weight:700;color:var(--doux)}
.barre .rail{flex:1;height:84px;background:var(--carte);border-radius:20px;overflow:hidden;border:2px solid var(--trait)}
.barre .rail i{display:block;height:100%;background:linear-gradient(90deg,var(--vert),var(--menthe));border-radius:18px}
.barre .v{width:250px;white-space:nowrap;font-size:60px;font-weight:800;color:var(--creme);text-align:right}
.calc .l{font-size:60px;font-weight:700;color:var(--doux);font-variant-numeric:tabular-nums}
.calc .r{font-size:84px;font-weight:800;color:var(--ambre);margin-top:14px}
.gateau{width:84px;height:84px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe3a1,var(--ambre) 55%,#d69e0b);border:4px solid #151311;box-shadow:0 0 0 3px var(--ambre) inset}
.client{width:60px;height:60px;border-radius:50% 50% 14px 14px;background:var(--vert);border:4px solid #151311}
.rang{display:flex;flex-wrap:wrap;gap:18px}
.cout{display:flex;align-items:center;gap:30px}
.cout .e{background:var(--carte);border:2px solid var(--trait);border-radius:24px;padding:28px 36px;font-size:46px;font-weight:700}
.cout .e small{display:block;font-size:24px;color:var(--ambre);margin-bottom:6px;letter-spacing:2px;text-transform:uppercase}
.fleche{font-size:80px;color:var(--ambre);font-weight:800}
.cout .p{background:var(--vert);color:#06281d;border-radius:24px;padding:32px 44px;font-size:56px;font-weight:800}
.num{width:120px;height:120px;border-radius:30px;background:var(--ambre);color:#151311;font-size:84px;font-weight:800;display:flex;align-items:center;justify-content:center}
.resume{font-size:62px;line-height:1.25;font-weight:700}
.liste{font-size:44px;line-height:1.5;font-weight:500;color:var(--creme)}
.liste li{margin-left:40px}
.liste span{color:var(--ambre);font-weight:700}
`;

const page = (corps, { pico, section, source, mention, chaine }) => `<!doctype html><html lang="fr"><meta charset="utf-8"><style>${CSS}</style><body>
<div class="marque"><i></i><span>${esc(chaine)}</span></div>${section ? `<div class="section">${esc(section)}</div>` : ''}
${corps}${source ? `<div class="source">${esc(source)}</div>` : ''}
<img class="pico" src="${pico}">
<div class="mention">${esc(mention)}</div></body></html>`;

const zone = h => `<div class="zone">${h}</div>`;
const pleinEcran = h => `<div class="zone" style="left:90px;width:1740px;height:760px;align-items:flex-start">${h}</div>`;

const TYPES = {
  chiffre: e => zone(`<div class="gros">${esc(e.valeur)}</div><div class="sous">${esc(e.legende)}</div>`),
  titre: e => zone(`<h1>${esc(e.titre).replace(/prix/, '<em>prix</em>')}</h1><div class="sous">${esc(e.sous)}</div>`),
  definition: e => zone(`<div class="carte"><div class="mot">${esc(e.mot)}</div><div class="def" style="margin-top:20px">${esc(e.texte)}</div></div>`),
  carte: e => zone(`<h1 style="font-size:150px">${esc(e.titre)}</h1><div class="sous">${esc(e.sous)}</div>`),
  message: e => zone(`<h2>${esc(e.titre)}</h2><div class="sous">${esc(e.sous)}</div>`),
  panier: e => zone(`<div class="grille">${Array.from({ length: 10 }, (_, i) => `<div class="pastille${i < e.monte ? ' on' : ''}"></div>`).join('')}</div><div class="etiquette">${esc(e.etiquette)}</div>`),
  barres: e => {
    const max = Math.max(...e.valeurs.map(v => v[1])) * 1.1;
    return zone(e.valeurs.map(([an, v]) => `<div class="barre"><div class="an">${esc(an)}</div><div class="rail"><i style="width:${(v / max * 100).toFixed(1)}%"></i></div><div class="v">${fr(v.toFixed(1))} %</div></div>`).join(''));
  },
  calcul: e => zone(`<div class="carte calc">${e.lignes.map(l => `<div class="l">${esc(l)}</div>`).join('')}<div class="r">${esc(e.resultat)}</div></div>`),
  gateaux: e => zone(`<div class="rang">${Array.from({ length: e.gateaux }, () => '<div class="gateau"></div>').join('')}</div><div class="rang">${Array.from({ length: e.clients }, () => '<div class="client"></div>').join('')}</div><div class="etiquette">${esc(e.etiquette)}</div>`),
  cout: e => zone(`<div class="cout">${e.elements.map(x => `<div class="e"><small>coût</small>${esc(x)}</div>`).join('')}<div class="fleche">→</div><div class="p">${esc(e.produit)}</div></div>`),
  comparaison: e => {
    const max = Math.max(e.a[1], e.b[1]) * 1.1, ligne = (l, couleur) => `<div class="barre"><div class="an" style="width:330px;font-size:34px">${esc(l[0])}</div><div class="rail"><i style="width:${(l[1] / max * 100).toFixed(1)}%;${couleur}"></i></div><div class="v">+${l[1]} %</div></div>`;
    return zone(`<h2 style="font-size:46px;color:#a8a196">${esc(e.titre)}</h2>${ligne(e.a, '')}${ligne(e.b, 'background:linear-gradient(90deg,#d69e0b,#fbbf24)')}`);
  },
  erreur: e => zone(`<div class="num">${e.numero}</div><h2>${esc(e.titre)}</h2>`),
  resume: e => zone(`<div class="mot">${esc(e.titre)}</div><div class="resume">${esc(e.texte)}</div>`),
  fin: () => zone(`<h2 style="margin-top:40px">Sources</h2><ul class="liste">${FIN_SOURCES.map(s => `<li><span>${esc(s.slice(0, 2))}</span>${esc(s.slice(2))}</li>`).join('')}</ul>`)
};
let FIN_SOURCES = [];

function image(ecran, ctx) {
  FIN_SOURCES = ctx.sources || [];
  const f = TYPES[ecran.type];
  if (!f) throw new Error('Type d’écran inconnu : ' + ecran.type);
  return page(f(ecran), { pico: ctx.pico, section: ctx.section, source: ecran.source, mention: ctx.mention, chaine: ctx.chaine });
}
module.exports = { image, b64 };
