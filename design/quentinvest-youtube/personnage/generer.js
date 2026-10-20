// Pico, présentateur de la chaîne YouTube QuentInvest : dessine les expressions en vectoriel (SVG), les exporte en PNG transparents,
// puis compose la planche du personnage et l'avatar de la chaîne.
// Usage : node design/quentinvest-youtube/personnage/generer.js   (Chromium requis ; QS_CHROMIUM=chemin si besoin)
// Même style que Max et Pépite (quentstudio/persos) : aplats, contour épais, bouche fermée ou ouverte pour la synchronisation des lèvres.
// Couleurs de Patrimoine AI (index.html) : noir chaud #151311, vert émeraude #10b981 et menthe #34d399, crème #f4f2ee, ambre #fbbf24.
'use strict';
const fs = require('fs'), path = require('path');
let pw;
try { pw = require(process.env.PW || 'playwright'); } catch (e) { pw = require('/opt/node-tools/node_modules/playwright'); }
const OUT = __dirname, FONTS = path.join(__dirname, '..', '..', '..', 'assets', 'fonts');

/* Couleurs de Patrimoine AI : vert émeraude (corps), ambre (écharpe et bout des antennes), crème (museau), noir chaud (contour) */
const C = { l: '#151311', corps: '#10B981', ombre: '#047857', clair: '#6EE7B7', museau: '#F4F2EE', echarpe: '#FBBF24', echarpeOmbre: '#D69E0B',
  joue: '#FF8FA3', blanc: '#FFFFFF', iris: '#6B3F12', bouche: '#4A1B26', langue: '#FF7E8F', verre: '#BEE8FF', bois: '#9A6532', or: '#FBBF24', goutte: '#8FD3FF' };
const T = (x, y, r, inner) => `<g transform="translate(${x} ${y}) rotate(${r || 0})">${inner}</g>`;
const trait = (d, w = 8, c = C.l) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;

/* --- Éléments du visage ----------------------------------------------------------------------------------------------- */
const ANTENNES = {
  droites: [['M200 128 C186 82 156 56 122 44', 118, 42], ['M280 128 C294 82 324 56 358 44', 362, 42]],
  hautes: [['M205 124 C200 86 196 62 192 44', 192, 40], ['M275 124 C280 86 284 62 288 44', 288, 40]],
  curieuse: [['M200 128 C176 82 150 62 112 60', 108, 60], ['M280 128 C290 90 296 64 300 44', 300, 40]],
  tombantes: [['M196 130 C170 100 140 96 108 128', 102, 134], ['M284 130 C310 100 340 96 372 128', 378, 134]]
};
// tige : liseré noir + cœur vert, pour rester visible sur un fond noir chaud (le contour seul s'y confond)
const antennes = k => ANTENNES[k].map(([d, x, y]) => trait(d, 15) + trait(d, 7, C.corps) + `<circle cx="${x}" cy="${y}" r="17" fill="${C.or}" stroke="${C.l}" stroke-width="7"/>`).join('');

const oeil = (cx, o) => {
  const rx = 40 * (o.gros || 1), ry = 46 * (o.gros || 1), px = cx + (o.dx || 0), py = 238 + (o.dy || 0);
  if (o.ferme) return trait(`M${cx - 38} 246 Q${cx} 200 ${cx + 38} 246`, 10);
  if (o.cligne) return trait(`M${cx - 38} 240 Q${cx} 254 ${cx + 38} 240`, 10); // paupière baissée (clignement), pas l'œil rieur
  return `<ellipse cx="${cx}" cy="238" rx="${rx}" ry="${ry}" fill="${C.blanc}" stroke="${C.l}" stroke-width="7"/>`
    + `<circle cx="${px}" cy="${py}" r="${19 * (o.gros || 1)}" fill="${C.iris}"/><circle cx="${px}" cy="${py}" r="${10 * (o.gros || 1)}" fill="${C.l}"/><circle cx="${px + 6}" cy="${py - 7}" r="5" fill="${C.blanc}"/>`;
};
const SOURCILS = {
  neutre: ['M146 184 Q190 166 234 184', 'M246 184 Q290 166 334 184'],
  curieux: ['M146 170 Q190 148 234 172', 'M246 190 L334 178'],
  surpris: ['M148 160 Q190 134 232 160', 'M248 160 Q290 134 332 160'],
  content: ['M150 178 Q190 158 230 178', 'M250 178 Q290 158 330 178'],
  reflechi: ['M146 178 Q190 158 234 180', 'M246 190 L334 186'],
  inquiet: ['M146 196 L232 170', 'M248 170 L334 196']
};
const sourcils = k => SOURCILS[k].map(d => trait(d, 11)).join('');

const BOUCHES = {
  ferme: trait('M198 322 Q240 352 282 322', 8),
  ouvert: `<path d="M194 312 Q240 304 286 312 Q282 376 240 380 Q198 376 194 312 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><path d="M212 356 Q240 340 268 356 Q256 378 240 378 Q224 378 212 356 Z" fill="${C.langue}"/><path d="M204 314 Q240 322 276 314" fill="none" stroke="${C.blanc}" stroke-width="9"/>`,
  surpris: `<ellipse cx="240" cy="340" rx="24" ry="32" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><ellipse cx="240" cy="354" rx="13" ry="12" fill="${C.langue}"/>`,
  grand: `<path d="M186 308 Q240 410 294 308 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><path d="M208 356 Q240 334 272 356 Q258 388 240 388 Q222 388 208 356 Z" fill="${C.langue}"/><path d="M196 310 Q240 322 284 310" fill="none" stroke="${C.blanc}" stroke-width="9"/>`,
  // mi-ouvertes (synchronisation des lèvres à trois positions) et bouches parlantes des expressions qui n'en avaient qu'une
  mi: `<path d="M204 318 Q240 312 276 318 Q272 350 240 353 Q208 350 204 318 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><path d="M220 342 Q240 333 260 342 Q252 352 240 352 Q228 352 220 342 Z" fill="${C.langue}"/>`,
  grandMi: `<path d="M196 312 Q240 368 284 312 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><path d="M216 340 Q240 328 264 340 Q254 356 240 356 Q226 356 216 340 Z" fill="${C.langue}"/>`,
  surprisMi: `<ellipse cx="240" cy="338" rx="18" ry="22" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><ellipse cx="240" cy="348" rx="9" ry="8" fill="${C.langue}"/>`,
  surprisFerme: `<ellipse cx="240" cy="336" rx="12" ry="13" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/>`,
  reflechiOuvert: `<path d="M216 330 Q246 322 272 334 Q266 362 244 364 Q222 362 216 330 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/><path d="M228 352 Q246 344 262 352 Q254 362 244 362 Q234 362 228 352 Z" fill="${C.langue}"/>`,
  reflechiMi: `<path d="M216 334 Q246 326 272 338 Q264 352 244 353 Q224 352 216 334 Z" fill="${C.bouche}" stroke="${C.l}" stroke-width="7"/>`,
  reflechi: trait('M214 336 Q246 326 272 342', 8),
  inquiet: trait('M202 344 Q221 322 240 344 T278 344', 8)
};

/* --- Accessoires -------------------------------------------------------------------------------------------------------- */
const main = (x, y) => `<circle cx="${x}" cy="${y}" r="27" fill="${C.museau}" stroke="${C.l}" stroke-width="7"/>`;
const menton = (x, y) => `<circle cx="${x - 20}" cy="${y - 22}" r="13" fill="${C.museau}" stroke="${C.l}" stroke-width="6"/>` + main(x, y);
const loupe = () => trait('M338 552 L372 478', 24) + trait('M338 552 L372 478', 12, C.bois)
  + `<circle cx="404" cy="440" r="46" fill="${C.verre}" fill-opacity=".6" stroke="${C.l}" stroke-width="8"/><path d="M376 424 Q384 404 404 398" fill="none" stroke="${C.blanc}" stroke-width="8"/>` + main(338, 552);
const point = () => T(398, 150, 8, trait('M-15 -22 C-15 -46 20 -46 20 -22 C20 -2 0 2 0 24', 10) + `<circle cx="0" cy="46" r="7" fill="${C.l}"/>`);
const etincelles = () => [[84, 150, 20], [396, 128, 16], [62, 262, 12]].map(([x, y, r]) => `<path d="M${x} ${y - r} Q${x + 3} ${y - 3} ${x + r} ${y} Q${x + 3} ${y + 3} ${x} ${y + r} Q${x - 3} ${y + 3} ${x - r} ${y} Q${x - 3} ${y - 3} ${x} ${y - r} Z" fill="${C.or}" stroke="${C.l}" stroke-width="5"/>`).join('');
const goutte = () => `<path d="M392 182 C382 206 376 216 392 232 C410 216 402 206 392 182 Z" fill="${C.goutte}" stroke="${C.l}" stroke-width="6"/>`;

/* --- Assemblage ---------------------------------------------------------------------------------------------------------- */
function pico(p) {
  const corps = `<path d="M50 600 C50 470 120 405 240 402 C360 405 430 470 430 600 Z" fill="${C.corps}" stroke="${C.l}" stroke-width="8"/>`
    + `<path d="M334 424 C402 452 428 520 430 598 L362 598 C364 522 352 462 334 424 Z" fill="${C.ombre}"/>`
    + `<path d="M136 394 Q240 452 344 394 L356 432 Q240 496 124 432 Z" fill="${C.echarpe}" stroke="${C.l}" stroke-width="7"/>`
    + `<path d="M292 466 L326 556 L282 568 L262 478 Z" fill="${C.echarpe}" stroke="${C.l}" stroke-width="7"/><path d="M300 480 L318 540" stroke="${C.echarpeOmbre}" stroke-width="8" fill="none"/>`;
  const tete = `<ellipse cx="240" cy="244" rx="154" ry="140" fill="${C.corps}" stroke="${C.l}" stroke-width="8"/>`
    + `<path d="M344 150 C398 204 396 296 334 354 C364 292 370 218 340 160 Z" fill="${C.ombre}"/>`
    + `<path d="M126 176 C148 128 198 104 252 104" fill="none" stroke="${C.clair}" stroke-width="11"/>`
    + `<ellipse cx="240" cy="318" rx="92" ry="62" fill="${C.museau}"/>`
    + `<circle cx="146" cy="296" r="19" fill="${C.joue}" fill-opacity=".75"/><circle cx="334" cy="296" r="19" fill="${C.joue}" fill-opacity=".75"/>`
    + oeil(190, p.oeilG || p.oeil || {}) + oeil(290, p.oeilD || p.oeil || {}) + sourcils(p.sourcils) + `<path d="M232 276 Q240 284 248 276" fill="none" stroke="${C.l}" stroke-width="6"/>` + BOUCHES[p.bouche];
  const inclinaison = p.incl ? `rotate(${p.incl} 240 380)` : '';
  return `<svg viewBox="0 0 480 600" xmlns="http://www.w3.org/2000/svg" stroke-linejoin="round" stroke-linecap="round">`
    + corps + (p.mains ? main(96, 520) + main(384, 520) : '')
    + `<g transform="${inclinaison}">${antennes(p.antennes)}${tete}${p.sueur ? goutte() : ''}${p.menton ? menton(300, 394) : ''}</g>`
    + (p.loupe ? loupe() : '') + (p.point ? point() : '') + (p.etincelles ? etincelles() : '') + `</svg>`;
}

const POSES = {
  'neutre-ferme': { antennes: 'droites', sourcils: 'neutre', bouche: 'ferme', loupe: 1 },
  'neutre-ouvert': { antennes: 'droites', sourcils: 'neutre', bouche: 'ouvert', loupe: 1 },
  'curieux-ferme': { antennes: 'curieuse', sourcils: 'curieux', bouche: 'ferme', incl: -5, oeil: { dx: 9, dy: -8 }, loupe: 1, point: 1 },
  'curieux-ouvert': { antennes: 'curieuse', sourcils: 'curieux', bouche: 'ouvert', incl: -5, oeil: { dx: 9, dy: -8 }, loupe: 1, point: 1 },
  'surpris-ouvert': { antennes: 'hautes', sourcils: 'surpris', bouche: 'surpris', oeil: { gros: 1.12 }, mains: 1 },
  'content-ferme': { antennes: 'droites', sourcils: 'content', bouche: 'ferme', oeil: { ferme: 1 }, etincelles: 1, loupe: 1 },
  'content-ouvert': { antennes: 'droites', sourcils: 'content', bouche: 'grand', oeil: { ferme: 1 }, etincelles: 1, loupe: 1 },
  'reflechi-ferme': { antennes: 'curieuse', sourcils: 'reflechi', bouche: 'reflechi', oeil: { dx: -10, dy: -12 }, menton: 1 },
  'inquiet-ferme': { antennes: 'tombantes', sourcils: 'inquiet', bouche: 'inquiet', oeil: { dx: 0, dy: 6 }, sueur: 1 },
  'inquiet-ouvert': { antennes: 'tombantes', sourcils: 'inquiet', bouche: 'ouvert', oeil: { dx: 0, dy: 6 }, sueur: 1 }
};
// poses ajoutées pour l'animation (style 2) : bouche mi-ouverte, bouches parlantes, et chaque pose les yeux fermés le temps d'un clignement
Object.assign(POSES, {
  'neutre-mi': { ...POSES['neutre-ferme'], bouche: 'mi' }, 'curieux-mi': { ...POSES['curieux-ferme'], bouche: 'mi' }, 'inquiet-mi': { ...POSES['inquiet-ferme'], bouche: 'mi' },
  'content-mi': { ...POSES['content-ferme'], bouche: 'grandMi' }, 'surpris-mi': { ...POSES['surpris-ouvert'], bouche: 'surprisMi' }, 'surpris-ferme': { ...POSES['surpris-ouvert'], bouche: 'surprisFerme' },
  'reflechi-ouvert': { ...POSES['reflechi-ferme'], bouche: 'reflechiOuvert' }, 'reflechi-mi': { ...POSES['reflechi-ferme'], bouche: 'reflechiMi' }
});
for (const [nom, p] of Object.entries({ ...POSES })) if (!/^content-/.test(nom)) POSES[nom + '-cligne'] = { ...p, oeil: { ...(p.oeil || {}), cligne: 1 } };
const LEGENDES = { neutre: 'Il explique', curieux: 'Il se pose la question', surpris: 'Il découvre un chiffre', content: 'Il a compris', reflechi: 'Il réfléchit', inquiet: 'Il y a un piège' };
const NOMS = { neutre: 'Neutre', curieux: 'Curieux', surpris: 'Surpris', content: 'Content', reflechi: 'Réfléchi', inquiet: 'Inquiet' };

const b64 = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const fonts = `@font-face{font-family:Inter;src:url(${b64('inter.woff2')});font-weight:100 900}`;
const svgPng = (svg, w, h) => svg.replace('<svg ', `<svg width="${w}" height="${h}" `);

(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.QS_CHROMIUM || undefined, args: ['--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 480, height: 600 } });
  fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'png'), { recursive: true });
  // --nouveaux : seulement les dessins absents (les existants restent identiques au pixel près : épisodes déjà fabriqués)
  const NOUVEAUX = process.argv.includes('--nouveaux');
  for (const [nom, p] of Object.entries(POSES)) {
    if (NOUVEAUX && fs.existsSync(path.join(OUT, 'png', 'pico-' + nom + '.png'))) continue;
    const svg = pico(p); fs.writeFileSync(path.join(OUT, 'svg', 'pico-' + nom + '.svg'), svg.replace('<svg ', '<svg width="480" height="600" ') + '\n');
    await pg.setContent(`<html><body style="margin:0;background:transparent">${svgPng(svg, 480, 600)}</body></html>`);
    await pg.screenshot({ path: path.join(OUT, 'png', 'pico-' + nom + '.png'), omitBackground: true });
    console.log('pico-' + nom);
  }
  if (NOUVEAUX) { await b.close(); return; }
  /* planche du personnage */
  const vignette = k => { const n = k + '-' + (POSES[k + '-ouvert'] ? 'ouvert' : 'ferme'); return `<figure><div class="v">${svgPng(pico(POSES[n]), 300, 375)}</div><figcaption><b>${NOMS[k]}</b><span>${LEGENDES[k]}</span></figcaption></figure>`; };
  const pal = [['Vert Pico', C.corps], ['Vert ombre', C.ombre], ['Ambre (écharpe, antennes)', C.echarpe], ['Crème (museau)', C.museau], ['Noir chaud (contour)', C.l], ['Menthe (reflet)', C.clair]];
  const html = `<html><head><style>${fonts}*{box-sizing:border-box}body{margin:0;width:1600px;background:#F3F4F1;color:#151311;font-family:Inter,sans-serif;padding:56px 64px}
header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:4px solid #151311;padding-bottom:22px}
h1{font:800 120px/1 Inter;margin:0;letter-spacing:-.03em}h1 em{font-style:normal;background:#34D399;padding:0 14px;border-radius:12px}
header p{font-size:26px;max-width:560px;margin:0;line-height:1.35}
.grille{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:34px}
figure{margin:0;background:#fff;border:4px solid #151311;border-radius:26px;padding:18px 18px 22px;box-shadow:8px 8px 0 #151311}
.v{height:375px;display:flex;justify-content:center;background:#DDF6EA;border-radius:16px;overflow:hidden}
figcaption{margin-top:14px;font-size:22px;display:flex;flex-direction:column;gap:2px}figcaption b{font:700 32px Inter}
.bas{display:grid;grid-template-columns:1.1fr 1fr;gap:26px;margin-top:30px;align-items:start}
.bloc{background:#fff;border:4px solid #151311;border-radius:26px;padding:26px 30px;box-shadow:8px 8px 0 #151311}
.bloc h2{font:700 30px Inter;margin:0 0 12px}.bloc ul{margin:0;padding-left:22px;font-size:22px;line-height:1.5}
.pal{display:flex;gap:14px;flex-wrap:wrap}.pal div{width:150px;font-size:18px}.pal i{display:block;height:70px;border-radius:14px;border:3px solid #151311;margin-bottom:6px}
</style></head><body>
<header><div><h1>Pico<em>.</em></h1></div><p><b>La petite fourmi qui pose les questions que tout le monde se pose.</b> L’économie expliquée simplement, un grain après l’autre.</p></header>
<div class="grille">${['neutre', 'curieux', 'surpris', 'content', 'reflechi', 'inquiet'].map(vignette).join('')}</div>
<div class="bas"><div class="bloc"><h2>Identité</h2><ul><li><b>Chaîne :</b> QuentInvest, l’économie expliquée simplement</li><li><b>Public :</b> la colonie (ses spectateurs)</li><li><b>Signe distinctif :</b> deux antennes qui expriment tout, bout ambre</li><li><b>Accessoire :</b> sa loupe, pour regarder les chiffres de près</li><li><b>Couleurs :</b> celles de Patrimoine AI : vert émeraude, ambre, noir chaud</li><li><b>Voix :</b> claire, un peu aiguë, rythme vif mais posé</li></ul></div>
<div class="bloc"><h2>Palette</h2><div class="pal">${pal.map(([n, c]) => `<div><i style="background:${c}"></i>${n}<br><span style="opacity:.6">${c}</span></div>`).join('')}</div></div></div>
</body></html>`;
  const fp = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await fp.setContent(html); await fp.waitForTimeout(400);
  await fp.screenshot({ path: path.join(OUT, 'planche-pico.png'), fullPage: true });
  /* avatar de la chaîne (carré, recadré en rond par YouTube) */
  const av = await b.newPage({ viewport: { width: 800, height: 800 } });
  await av.setContent(`<html><body style="margin:0;width:800px;height:800px;background:radial-gradient(circle at 50% 38%,#0E6B4F,#151311 78%);overflow:hidden"><div style="position:absolute;left:50px;top:70px;width:700px;height:875px">${svgPng(pico({ ...POSES['content-ouvert'], loupe: 0, etincelles: 0 }), 700, 875)}</div></body></html>`);
  await av.screenshot({ path: path.join(OUT, 'avatar-800.png') });

  /* logo de la chaîne : marque (tête seule), avatar, logo horizontal clair et sombre, bannière YouTube → ../logo/ */
  const LOGO = path.join(OUT, '..', 'logo'); fs.mkdirSync(LOGO, { recursive: true });
  const tete = pico({ ...POSES['neutre-ferme'], loupe: 0, etincelles: 0 }).replace('viewBox="0 0 480 600"', 'viewBox="62 14 356 376"');
  const marque = h => svgPng(tete, h * 356 / 376, h);
  const NOM = (fond, clair) => `<span style="font:800 1em/1 Inter;letter-spacing:-.03em;color:${clair ? '#151311' : '#F4F2EE'}">Quent</span><span style="font:800 1em/1 Inter;letter-spacing:-.03em;color:${clair ? '#047857' : '#34D399'}">Invest</span>`;
  const rendre = async (nom, l, h, corps, transparent) => {
    const pg2 = await b.newPage({ viewport: { width: l, height: h } });
    await pg2.setContent(`<html><head><style>${fonts}*{box-sizing:border-box}</style></head><body style="margin:0;width:${l}px;height:${h}px;overflow:hidden;position:relative">${corps}</body></html>`);
    await pg2.waitForTimeout(250); await pg2.screenshot({ path: path.join(LOGO, nom), omitBackground: !!transparent }); await pg2.close(); console.log('logo/' + nom);
  };
  await rendre('logo-marque.png', 1024, 1024, `<div style="position:absolute;left:62px;top:62px">${marque(900)}</div>`, true);
  await rendre('logo-avatar-800.png', 800, 800, `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#0E6B4F,#151311 76%)"></div><div style="position:absolute;left:104px;top:96px">${marque(600)}</div>`);
  const horiz = (clair) => `<div style="position:absolute;inset:0;background:${clair ? '#F4F2EE' : '#151311'}"></div><div style="position:absolute;left:90px;top:60px">${marque(380)}</div>
    <div style="position:absolute;left:520px;top:120px;font-size:190px;white-space:nowrap">${NOM(0, clair)}</div>
    <div style="position:absolute;left:530px;top:330px;font:600 52px Inter;color:${clair ? '#5b564d' : '#A8A196'};white-space:nowrap">L’économie expliquée simplement</div>`;
  await rendre('logo-horizontal-sombre.png', 1800, 500, horiz(false));
  await rendre('logo-horizontal-clair.png', 1800, 500, horiz(true));
  /* bannière YouTube 2560×1440 : tout le texte dans la zone visible partout (1546×423 au centre) */
  await rendre('banniere-youtube.png', 2560, 1440, `<div style="position:absolute;inset:0;background:radial-gradient(1400px 800px at 78% 85%,rgba(16,185,129,.35),transparent 60%),radial-gradient(1000px 600px at 8% 0%,rgba(251,191,36,.10),transparent 60%),#151311"></div>
    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:56px"><div>${marque(340)}</div><div><div style="font-size:156px;white-space:nowrap">${NOM(0, false)}</div><div style="font:600 46px Inter;color:#A8A196;margin-top:18px;white-space:nowrap">L’économie expliquée simplement</div></div></div>`);
  await b.close();
  console.log('planche-pico.png, avatar-800.png');
})();
