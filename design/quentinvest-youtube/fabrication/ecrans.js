// Pico — écrans de la vidéo : une page HTML 1920×1080 par écran, animée par `setT(t)` (t en secondes depuis l'arrivée de l'écran).
// Pico n'est pas dans la page : il est ajouté par fabriquer.js (bouche synchronisée, entrée, rebond). Couleurs de Patrimoine AI.
// Animations : attribut data-a = fade | pop | grow | count | draw | on, avec data-d (délai) et data-u (durée) en secondes.
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
.calc .l{white-space:nowrap;font-size:52px;font-weight:700;color:var(--doux);font-variant-numeric:tabular-nums}
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
.piece{width:92px;height:92px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ffe9b0,var(--ambre) 55%,#c98f08);border:4px solid #151311;box-shadow:0 0 0 3px #d69e0b inset;display:flex;align-items:center;justify-content:center;font-size:44px;font-weight:800;color:#7a5200}
.pieces{display:grid;grid-template-columns:repeat(5,92px);gap:22px}
.rang2{display:flex;align-items:center;gap:60px}
.duo{display:flex;align-items:center;gap:40px}
.duo .carte{min-width:430px;padding:40px 44px}
.duo .n{white-space:nowrap;font-size:96px;font-weight:800;line-height:1;letter-spacing:-2px;font-variant-numeric:tabular-nums}
.duo .n.b{color:var(--ambre)}
.duo small{display:block;font-size:30px;color:var(--doux);margin-top:14px;font-weight:500}
.taux{display:flex;align-items:center;gap:26px}
.taux .c{background:var(--carte);border:2px solid var(--trait);border-radius:26px;padding:34px 40px;text-align:center}
.taux .c small{display:block;font-size:26px;letter-spacing:2px;text-transform:uppercase;color:var(--doux);margin-bottom:8px}
.taux .c b{font-size:92px;font-weight:800;font-variant-numeric:tabular-nums}
.taux .c.v b{color:var(--menthe)} .taux .c.a b{color:var(--ambre)}
.taux .c.r{background:var(--vert);border-color:var(--vert)} .taux .c.r small{color:#06281d} .taux .c.r b{color:#06281d}
.taux .s{font-size:80px;font-weight:800;color:var(--doux)}
svg.graphe{width:1120px;height:540px;overflow:visible}
svg.graphe text{font-family:Inter,sans-serif;fill:#a8a196;font-size:26px;font-weight:600}
svg.graphe .lab{font-size:34px;font-weight:800}
`;

// ---------- animation : exécutée dans la page ----------
const RUNTIME = `(()=>{
const out=x=>1-Math.pow(1-x,3), back=x=>{const c=1.70158;return 1+(c+1)*Math.pow(x-1,3)+c*Math.pow(x-1,2)};
const nf=(v,dec)=>v.toLocaleString('fr-FR',{minimumFractionDigits:dec,maximumFractionDigits:dec}).replace(/\\u202f/g,'\\u00a0');
const els=[...document.querySelectorAll('[data-a]')];
window.FIN=els.reduce((m,e)=>Math.max(m,+e.dataset.d+ +e.dataset.u),0);
els.forEach(e=>{ if(e.dataset.a.includes('draw')){ e._len=e.getTotalLength(); e.style.strokeDasharray=e._len; } });
window.setT=t=>{ for(const e of els){
  const d=+e.dataset.d,u=+e.dataset.u,k=Math.min(1,Math.max(0,(t-d)/u)),tr=[]; let op=null;
  for(const a of e.dataset.a.split(' ')){
    if(a==='fade'){ op=out(k); tr.push('translateY('+((1-out(k))*28)+'px)'); }
    else if(a==='pop'){ op=Math.min(1,k*4); tr.push('scale('+(0.45+0.55*back(k))+')'); }
    else if(a==='grow'){ e.style.width=(+e.dataset.w*out(k))+'%'; }
    else if(a==='draw'){ e.style.strokeDashoffset=e._len*(1-out(k)); }
    else if(a==='count'){ const de=+e.dataset.de,to=+e.dataset.to,dec=+(e.dataset.dec||0); e.textContent=(e.dataset.pre||'')+nf(de+(to-de)*out(k),dec)+(e.dataset.suf||''); }
    else if(a==='on'){ e.classList.toggle('on',t>=d); tr.push('scale('+(1+0.14*Math.sin(Math.PI*k)*(t>=d?1:0))+')'); }
  }
  if(op!==null) e.style.opacity=op; if(tr.length) e.style.transform=tr.join(' ');
}};
setT(0);
})();`;

const page = (corps, { section, source, mention, chaine }) => `<!doctype html><html lang="fr"><meta charset="utf-8"><style>${CSS}</style><body>
<div class="marque"><i></i><span>${esc(chaine)}</span></div>${section ? `<div class="section">${esc(section)}</div>` : ''}
${corps}${source ? `<div class="source">${esc(source)}</div>` : ''}
<div class="mention">${esc(mention)}</div><script>${RUNTIME}</script></body></html>`;

const zone = h => `<div class="zone">${h}</div>`;
const A = (k, d, u = 0.6, x = '') => `data-a="${k}" data-d="${d.toFixed(2)}" data-u="${u}" ${x}`;
const cpt = (de, a, dec = 0, pre = '', suf = '') => `data-de="${de}" data-to="${a}" data-dec="${dec}" data-pre="${esc(pre)}" data-suf="${esc(suf)}"`;
// intervalle entre deux éléments qui arrivent l'un après l'autre : étalés sur la voix, sans traîner
const pas = (n, ctx) => Math.min(1.3, Math.max(0.4, (ctx.duree || 4) * 0.7 / Math.max(1, n)));

const TYPES = {
  chiffre: (e, c) => zone(`<div class="gros" ${e.de != null ? A('pop count', 0.1, 1.4, cpt(e.de, e.a, e.dec || 0, '', e.suffixe || '')) : A('pop', 0.1, 0.7)}>${esc(e.valeur || '')}</div><div class="sous" ${A('fade', 0.7)}>${esc(e.legende)}</div>`),
  titre: e => zone(`<h1 ${A('fade', 0, 0.7)}>${esc(e.titre).replace(/prix/, '<em>prix</em>')}</h1><div class="sous" ${A('fade', 0.6)}>${esc(e.sous)}</div>`),
  definition: e => zone(`<div class="carte" ${A('fade', 0, 0.6)}><div class="mot">${esc(e.mot)}</div><div class="def" style="margin-top:20px" ${A('fade', 0.4, 0.7)}>${esc(e.texte)}</div></div>`),
  carte: e => zone(`<h1 style="font-size:150px" ${A('pop', 0, 0.7)}>${esc(e.titre)}</h1><div class="sous" ${A('fade', 0.6)}>${esc(e.sous)}</div>`),
  message: e => zone(`<h2 ${A('fade', 0, 0.7)}>${esc(e.titre)}</h2><div class="sous" ${A('fade', 0.5)}>${esc(e.sous)}</div>`),
  panier: (e, c) => { const p = Math.min(0.28, pas(e.monte, c) / 2); return zone(`<div class="grille">${Array.from({ length: 10 }, (_, i) => i < e.monte ? `<div class="pastille" ${A('on', 0.3 + i * p, 0.35)}></div>` : '<div class="pastille"></div>').join('')}</div><div class="etiquette" ${A('fade', 0.5 + e.monte * p)}>${esc(e.etiquette)}</div>`); },
  barres: (e, c) => {
    const max = Math.max(...e.valeurs.map(v => v[1])) * 1.1, p = Math.min(1.2, pas(e.valeurs.length, c));
    return zone(e.valeurs.map(([an, v], i) => `<div class="barre" ${A('fade', 0.2 + i * p, 0.5)}><div class="an">${esc(an)}</div><div class="rail"><i ${A('grow', 0.35 + i * p, 1, `data-w="${(v / max * 100).toFixed(1)}"`)} style="width:0"></i></div><div class="v" ${A('count', 0.35 + i * p, 1, cpt(0, v, 1, '', ' %'))}>${fr(v.toFixed(1))} %</div></div>`).join(''));
  },
  calcul: (e, c) => { const p = pas(e.lignes.length + 1, c); return zone(`<div class="carte calc">${e.lignes.map((l, i) => `<div class="l" ${A('fade', 0.2 + i * p, 0.5)}>${esc(l)}</div>`).join('')}<div class="r" ${A('pop', 0.4 + e.lignes.length * p, 0.6)}>${esc(e.resultat)}</div></div>`); },
  gateaux: e => {
    const g = Math.min(0.12, 1.2 / e.gateaux), cl = Math.min(0.12, 1.2 / e.clients), t0 = 0.2 + e.gateaux * g + 0.2;
    return zone(`<div class="rang">${Array.from({ length: e.gateaux }, (_, i) => `<div class="gateau" ${A('pop', 0.2 + i * g, 0.4)}></div>`).join('')}</div><div class="rang">${Array.from({ length: e.clients }, (_, i) => `<div class="client" ${A('pop', t0 + i * cl, 0.4)}></div>`).join('')}</div><div class="etiquette" ${A('fade', t0 + e.clients * cl + 0.2)}>${esc(e.etiquette)}</div>`);
  },
  cout: (e, c) => { const p = Math.min(0.9, pas(e.elements.length + 1, c)), n = e.elements.length; return zone(`<div class="cout">${e.elements.map((x, i) => `<div class="e" ${A('pop', 0.2 + i * p, 0.5)}><small>coût</small>${esc(x)}</div>`).join('')}<div class="fleche" ${A('fade', 0.3 + n * p, 0.4)}>→</div><div class="p" ${A('pop', 0.5 + n * p, 0.6)}>${esc(e.produit)}</div></div>`); },
  comparaison: e => {
    const max = Math.max(e.a[1], e.b[1]) * 1.1, ligne = (l, couleur, d) => `<div class="barre" ${A('fade', d, 0.5)}><div class="an" style="width:330px;font-size:34px">${esc(l[0])}</div><div class="rail"><i ${A('grow', d + 0.2, 1.1, `data-w="${(l[1] / max * 100).toFixed(1)}"`)} style="width:0;${couleur}"></i></div><div class="v" ${A('count', d + 0.2, 1.1, cpt(0, l[1], 0, '+', ' %'))}>+${l[1]} %</div></div>`;
    return zone(`<h2 style="font-size:46px;color:#a8a196" ${A('fade', 0)}>${esc(e.titre)}</h2>${ligne(e.a, '', 0.5)}${ligne(e.b, 'background:linear-gradient(90deg,#d69e0b,#fbbf24)', 1.4)}`);
  },
  erreur: e => zone(`<div class="num" ${A('pop', 0, 0.6)}>${e.numero}</div><h2 ${A('fade', 0.4, 0.7)}>${esc(e.titre)}</h2>`),
  resume: e => zone(`<div class="mot" ${A('fade', 0)}>${esc(e.titre)}</div><div class="resume" ${A('fade', 0.4, 0.9)}>${esc(e.texte)}</div>`),
  fin: () => zone(`<h2 style="margin-top:40px" ${A('fade', 0)}>Sources</h2><ul class="liste">${FIN_SOURCES.map((s, i) => `<li ${A('fade', 0.4 + i * 0.3, 0.5)}><span>${esc(s.slice(0, 2))}</span>${esc(s.slice(2))}</li>`).join('')}</ul>`),

  // ---- épisode 2 ----
  // n pièces qui tombent dans le tiroir, à côté de la somme
  pieces: (e, c) => { const p = Math.min(0.2, 1.6 / e.n); return zone(`<div class="rang2"><div class="pieces">${Array.from({ length: e.n }, (_, i) => `<div class="piece" ${A('pop', 0.2 + i * p, 0.4)}>€</div>`).join('')}</div><div class="gros" style="font-size:140px" ${A('fade', 0.4, 0.8)}>${esc(e.valeur)}</div></div><div class="sous" ${A('fade', 0.4 + e.n * p)}>${esc(e.legende)}</div>`); },
  // deux montants face à face : le second compte de `de` à `a`
  duo: (e, c) => { const t = (c.duree || 8) * 0.55; return zone(`<div class="duo"><div class="carte" ${A('pop', 0, 0.6)}><div class="n">${esc(e.a.valeur)}</div><small>${esc(e.a.legende)}</small></div><div class="fleche" ${A('fade', t - 0.3, 0.4)}>→</div><div class="carte" ${A('pop', t, 0.6)}><div class="n b" ${A('count', t + 0.2, 1.6, cpt(e.b.de, e.b.a, 0, e.b.prefixe || '', e.b.suffixe || ''))}>${esc(e.b.valeur)}</div><small>${esc(e.b.legende)}</small></div></div>`); },
  // intérêt − inflation = gain réel
  taux: (e, c) => { const D = c.duree || 10, t1 = D * 0.15, t2 = D * 0.42, t3 = D * 0.74; return zone(`<div class="taux"><div class="c v" ${A('pop', t1, 0.6)}><small>${esc(e.gain.nom)}</small><b>${esc(e.gain.valeur)}</b></div><div class="s" ${A('fade', t2 - 0.5, 0.3)}>−</div><div class="c a" ${A('pop', t2, 0.6)}><small>${esc(e.inflation.nom)}</small><b>${esc(e.inflation.valeur)}</b></div><div class="s" ${A('fade', t3 - 0.5, 0.3)}>=</div><div class="c r" ${A('pop', t3, 0.7)}><small>${esc(e.reel.nom)}</small><b>${esc(e.reel.valeur)}</b></div></div><div class="sous" ${A('fade', t3 + 0.8)}>${esc(e.legende)}</div>`); },
  // deux courbes sur n années : la somme affichée ne bouge pas, ce qu'elle achète baisse
  courbe: (e, c) => {
    const D = c.duree || 12, d0 = D * 0.38, du = D * 0.32; // la courbe qui descend suit la phrase « chaque année, elle achète un peu moins »
    const L = 1040, H = 420, X0 = 70, Y0 = 30, haut = e.capital * 1.04, bas = e.capital * (1 - e.taux / 100) ** e.annees * 0.9;
    const x = a => X0 + L * a / e.annees, y = v => Y0 + H * (haut - v) / (haut - bas);
    let reel = ''; for (let a = 0; a <= e.annees; a += 0.25) reel += `${a ? 'L' : 'M'}${x(a).toFixed(1)},${y(e.capital / (1 + e.taux / 100) ** a).toFixed(1)}`;
    const fin = e.capital / (1 + e.taux / 100) ** e.annees, ans = Array.from({ length: e.annees + 1 }, (_, a) => a);
    return zone(`<svg class="graphe" viewBox="0 0 1120 540">
      ${ans.filter(a => a % 2 === 0).map(a => `<line x1="${x(a)}" y1="${Y0}" x2="${x(a)}" y2="${Y0 + H}" stroke="#2e2a26" stroke-width="2"/><text x="${x(a)}" y="${Y0 + H + 44}" text-anchor="middle">${a} an${a > 1 ? 's' : ''}</text>`).join('')}
      <path d="M${x(0)},${y(e.capital)} L${x(e.annees)},${y(e.capital)}" stroke="#f4f2ee" stroke-width="8" stroke-linecap="round" fill="none" ${A('draw', 0.3, 1.2)}/>
      <path d="${reel}" stroke="#fbbf24" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" ${A('draw', d0, du)}/>
      <text class="lab" x="${x(e.annees) - 8}" y="${y(e.capital) - 22}" text-anchor="end" style="fill:#f4f2ee" ${A('fade', 1.8)}>${esc(e.etiquetteAffichee)}</text>
      <circle cx="${x(e.annees)}" cy="${y(fin)}" r="14" fill="#fbbf24" ${A('pop', d0 + du, 0.4)} style="transform-box:fill-box;transform-origin:center"/>
      <text class="lab" x="${x(e.annees) - 8}" y="${y(fin) + 60}" text-anchor="end" style="fill:#fbbf24" ${A('fade', d0 + du + 0.15)}>${esc(e.etiquetteReelle)}</text>
    </svg>`);
  }
};
let FIN_SOURCES = [];

// ctx : { section, mention, chaine, sources, duree (durée de la voix, pour étaler les éléments) }
function image(ecran, ctx) {
  FIN_SOURCES = ctx.sources || [];
  const f = TYPES[ecran.type];
  if (!f) throw new Error('Type d’écran inconnu : ' + ecran.type);
  return page(f(ecran, ctx), { section: ctx.section, source: ecran.source, mention: ctx.mention, chaine: ctx.chaine });
}
module.exports = { image, b64 };
