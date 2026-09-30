'use strict';
/* Wouf — génère le kit Instagram (posts 1080×1350, carrousels, stories 1080×1920, photo de profil, couvertures « à la une »)
   à partir de VRAIES captures de l'app et de la mascotte dessinée dans l'app. Aucune fausse donnée, aucun faux avis.
   Lancer depuis la racine du dépôt :  node marketing/wouf/generate.js   → images dans marketing/wouf/images/ */
const path = require('path'), fs = require('fs');
const W = path.resolve(__dirname, '../../wouf');
let chromium; try { ({ chromium } = require(path.join(W, 'node_modules/playwright'))); } catch (e) { ({ chromium } = require('playwright')); }
const { start } = require(path.join(W, 'tests/serve'));
const OUT = path.join(__dirname, 'images'); fs.mkdirSync(OUT, { recursive: true });
const day = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const LINK = 'woufapp.fr';

/* Données de démonstration (fictives, pour les captures uniquement) */
const demo = sp => ({ v: 1, schema: 2, current: 'a', installedAt: day(-60), owner: { name: '' }, settings: { lastBackup: day(-2) },
  dogs: sp === 'cat' ? [{ id: 'a', name: 'Miso', species: 'cat', breed: 'Européen', sex: 'M', birth: '2023-04-02', insurance: {} }]
    : [{ id: 'a', name: 'Nala', species: 'dog', breed: 'Golden Retriever', sex: 'F', birth: '2022-05-10', insurance: {} }],
  events: [{ id: 'e1', dogId: 'a', type: 'vaccine', title: 'CHPPiL (rappel annuel)', date: day(-340), next: day(25) }, { id: 'e2', dogId: 'a', type: 'parasite', title: 'Pipette antiparasitaire', date: day(-20), next: day(10) }, { id: 'e3', dogId: 'a', type: 'worm', title: 'Vermifuge', date: day(-60), next: day(30) }],
  weights: [{ id: 'w1', dogId: 'a', date: day(-150), kg: 27.2 }, { id: 'w2', dogId: 'a', date: day(-90), kg: 27.8 }, { id: 'w3', dogId: 'a', date: day(-30), kg: 28.1 }, { id: 'w4', dogId: 'a', date: day(-2), kg: 28.0 }],
  meds: [], medLog: {}, journal: [], expenses: [], docs: [], contacts: [], walks: [],
  edu: { a: { marqueur: { done: true, quiz: 3, steps: {}, sessions: [{ d: day(0), t: 1, min: 4, ok: 9, n: 10 }, { d: day(-1), t: 1, min: 4, ok: 8, n: 10 }] }, assis: { done: true, quiz: 3, steps: {}, sessions: [{ d: day(-2), t: 1, min: 3, ok: 9, n: 10 }] } } } });

const CSS = `*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#231f1b}
.cv{position:relative;overflow:hidden;background:#f8f4ef;display:flex;flex-direction:column;padding:84px 80px}
.cv.o{background:linear-gradient(160deg,#ffab5c,#ee6a1c);color:#fff}.cv.d{background:#231f1b;color:#fff}
.logo{display:flex;align-items:center;gap:16px;font-weight:900;font-size:44px;color:#ee6a1c}.cv.o .logo,.cv.d .logo{color:#fff}
.logo svg{width:64px;height:64px;border-radius:16px}
h1{font-size:84px;line-height:1.04;margin:40px 0 0;font-weight:900;letter-spacing:-2px}h1 em{font-style:normal;color:#ee6a1c}.cv.o h1 em,.cv.d h1 em{color:#ffd54a}
.sub{font-size:36px;line-height:1.28;margin-top:24px;font-weight:600;opacity:.88}.w{max-width:540px}
.pill{display:inline-block;background:#fff;color:#ee6a1c;font-weight:800;font-size:34px;padding:14px 30px;border-radius:99px;margin-top:30px}
.cv.o .pill{color:#ee6a1c}.foot{position:absolute;left:80px;right:80px;bottom:60px;display:flex;justify-content:space-between;align-items:center;font-size:28px;font-weight:700;opacity:.8}
.phone{position:absolute;border-radius:64px;background:#111;padding:18px;box-shadow:0 40px 90px rgba(0,0,0,.28)}.phone img{display:block;border-radius:48px;width:100%}
.big{font-size:230px;line-height:1}.list{margin-top:36px;display:flex;flex-direction:column;gap:22px}.li{display:flex;gap:24px;align-items:flex-start;background:#fff;border-radius:32px;padding:26px 30px;font-size:36px;line-height:1.25;box-shadow:0 10px 30px rgba(80,50,20,.08)}
.li b{display:block;font-size:40px}.li span.e{font-size:60px;line-height:1}.cv.o .li{color:#231f1b}
.m svg{overflow:visible}.m .bubble{color:#231f1b!important}.m.m-good .bubble,.m .m-good .bubble,.m .m-win .bubble{color:#197a45!important}.m .m-bad .bubble{color:#b32d24!important}.mx .msvg{width:440px!important}.mg .msvg{width:230px!important}.m .bubble{font-size:34px!important;padding:18px 24px!important;border-radius:28px!important}
.dots{position:absolute;bottom:64px;left:0;right:0;display:flex;justify-content:center;gap:12px}.dots i{width:16px;height:16px;border-radius:50%;background:currentColor;opacity:.3}.dots i.on{opacity:1}
.mnote{font-size:28px;font-weight:700;opacity:.75;margin-top:22px}.tag{font-size:30px;font-weight:800;letter-spacing:3px;text-transform:uppercase;opacity:.75}`;
const LOGO = fs.readFileSync(path.join(W, 'icons/icon.svg'), 'utf8');
const logo = (txt = 'Wouf') => `<div class="logo">${LOGO}<span>${txt}</span></div>`;
const foot = (note = '') => `<div class="foot"><span>🔗 Lien dans la bio</span></div>${note ? `<div class="mnote">${note}</div>` : ''}`;
const phone = (img, css) => `<div class="phone" style="${css}"><img src="${img}"></div>`;
const dots = (n, i) => `<div class="dots">${Array.from({ length: n }, (_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>`;

(async () => {
  const srv = await start(0), port = srv.address().port, url = h => `http://localhost:${port}/wouf/${h}`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  /* 1) Captures d'écran de l'app (téléphone 390×844, rendu ×2) */
  const shots = {};
  async function shot(name, sp, hash, prep) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fr-FR', reducedMotion: 'reduce' });
    await ctx.addInitScript(s => { localStorage.setItem('wouf:data', JSON.stringify(s)); }, demo(sp));
    const p = await ctx.newPage(); await p.goto(url(hash)); await p.waitForSelector('#view > *'); if (prep) await prep(p); await p.waitForTimeout(500);
    shots[name] = 'data:image/png;base64,' + (await p.screenshot()).toString('base64'); await ctx.close();
  }
  await shot('home', 'dog', '#/home');
  await shot('educ', 'dog', '#/educ', p => p.evaluate(() => { const e = document.querySelector('.path'); if (e) e.scrollIntoView({ block: 'center' }); }));
  await shot('quiz', 'dog', '#/lecon?id=proprete', async p => { await p.click('[data-act=lesson-done]'); await p.evaluate(() => ACT['quiz-pick']({ k: QUIZ.qs[0].ok })); });
  await shot('carnet', 'dog', '#/carnet');
  await shot('sos', 'dog', '#/sos');
  await shot('noms', 'dog', '#/noms', async p => { await p.fill('#nm-year', '2026'); await p.click('[data-act=nm-lof]'); await p.waitForSelector('.name-card'); await p.evaluate(() => document.querySelector('#nm-res').scrollIntoView({ block: 'start' })); });
  await shot('triage', 'dog', '#/triage', async p => { await p.click('[data-id=vomit]'); await p.click('[data-k=a0]'); });
  await shot('homeCat', 'cat', '#/home');

  /* 2) Page de rendu : on réutilise les fonctions de l'app (mascotte, scènes météo, noms) */
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage(); await page.goto(url('#/home')); await page.waitForSelector('#view > *');
  const render = async (file, w, h, html) => {
    await page.setViewportSize({ width: w, height: h });
    await page.evaluate(([css, html, w, h]) => { document.head.insertAdjacentHTML('beforeend', `<style id="mk">${css}</style>`); document.body.className = ''; document.body.style.cssText = 'padding:0;margin:0;background:#fff'; document.body.innerHTML = `<div class="cv-wrap" style="width:${w}px;height:${h}px">${html}</div>`; document.querySelector('.cv').style.cssText += `;width:${w}px;height:${h}px`; }, [CSS, html, w, h]);
    await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, file), clip: { x: 0, y: 0, width: w, height: h } }); console.log('  ✓', file);
  };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const masc = (mood, cat, txt, big) => ev(([m, c, t, b]) => mascot(m, c, t, b), [mood, cat, txt, big]);
  const scene = (k, cat) => ev(([k, c]) => dogScene(k, { name: 'X', species: c ? 'cat' : 'dog' }), [k, cat]);
  const P = (w = 1080, h = 1350) => [w, h];

  /* ---------- POSTS (1080×1350) ---------- */
  await render('post-01-lancement.png', ...P(), `<div class="cv o">${logo()}<h1>Le carnet de santé de ton <em>chien</em> et de ton <em>chat</em>.</h1><div class="sub w">Vaccins, rappels, vétos de garde, éducation, balades. Tout au même endroit.</div><div><span class="pill">Gratuit · sans inscription</span></div>${phone(shots.home, 'width:400px;right:60px;top:640px;transform:rotate(6deg)')}${foot()}</div>`);
  await render('post-02-lecons.png', ...P(), `<div class="cv">${logo()}<h1>Éduque ton chien <em>en t’amusant</em>.</h1><div class="sub w">110 leçons, un quiz après chaque leçon, des os à gagner, des niveaux… et un chien qui réagit à chaque réponse.</div><div class="m" style="margin-top:34px;width:500px">${await masc('good', false, 'Wouf ! Bravo ! 🎉', true)}</div>${phone(shots.quiz, 'width:390px;right:56px;top:560px;transform:rotate(-5deg)')}${foot('Méthode 100 % positive')}</div>`);
  await render('post-03-meteo.png', ...P(), `<div class="cv d">${logo()}<h1>Trop chaud pour la balade ? <em>Wouf te le dit.</em></h1><div class="sub">La météo adaptée à la race, à l’âge et au gabarit de ton animal, avec les meilleures heures pour sortir.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:22px;margin:30px auto 0;width:620px">${(await Promise.all(['sun', 'rain', 'wind', 'cold'].map(k => scene(k)))).map(s => `<div style="border-radius:30px;overflow:hidden;line-height:0">${s.replace('<svg class="dg', '<svg style="width:100%;height:auto;max-width:none" class="dg')}</div>`).join('')}</div>${foot()}</div>`);
  await render('post-04-sos.png', ...P(), `<div class="cv">${logo()}<h1>Urgence à 2 h du matin ? <em>Trouve un véto ouvert.</em></h1><div class="sub">Vétos de garde autour de toi, premiers secours, toxiques, et « Que faire ? » pour évaluer un symptôme.</div>${phone(shots.sos, 'width:390px;left:90px;top:720px;transform:rotate(-4deg)')}${phone(shots.triage, 'width:390px;right:90px;top:690px;transform:rotate(5deg)')}</div>`);
  await render('post-05-carnet.png', ...P(), `<div class="cv o">${logo()}<h1>Ne rate plus jamais <em>un vaccin</em>.</h1><div class="sub">Carnet de santé, rappels automatiques, courbe de poids, traitements, documents. Et une fiche PDF pour le véto.</div>${phone(shots.home, 'width:380px;left:90px;top:700px;transform:rotate(-6deg)')}${phone(shots.carnet, 'width:400px;right:80px;top:660px;transform:rotate(5deg)')}</div>`);
  const bNames = await ev(() => pickNames({ letter: 'B', short: true }, 60, (() => { let s = 7; return () => (s = (s * 9301 + 49297) % 233280) / 233280; })()).map(x => x.name).filter((n, i, a) => a.indexOf(n) === i).slice(0, 12));
  await render('post-06-lettre-2026.png', ...P(), `<div class="cv">${logo()}<div class="tag" style="margin-top:40px">Chien ou chat de race né en 2026</div><div style="display:flex;align-items:center;gap:40px;margin-top:10px"><div class="big" style="color:#ee6a1c;font-weight:900">B</div><h1 style="margin:0;font-size:78px">C’est la lettre <em>de l’année</em>.</h1></div><div class="sub">Pour le nom officiel au LOF ou au LOOF. Des idées ?</div><div style="display:flex;flex-wrap:wrap;gap:18px;margin-top:34px">${bNames.map(n => `<span style="background:#fff;border-radius:99px;padding:16px 30px;font-size:38px;font-weight:800;box-shadow:0 8px 24px rgba(80,50,20,.08)">${n}</span>`).join('')}</div><div class="sub" style="font-size:32px;margin-top:34px">➕ 360 noms, 9 styles, et un test « ce nom est-il facile à retenir ? » dans Wouf.</div>${foot('K, Q, W, X, Y, Z ne sont jamais utilisées')}</div>`);
  await render('post-07-mascotte.png', ...P(), `<div class="cv o">${logo()}<h1>Il réagit à <em>chaque réponse</em>.</h1><div class="sub">Il réfléchit avec toi, saute de joie, boude un peu quand tu te trompes… puis fait la fête.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:40px">${(await Promise.all([['think', 'Hmm… 🤔'], ['good', 'Bravo ! 🎉'], ['bad', 'Oups… 🐾'], ['win', 'Sans faute ! 🥳']].map(([m, t]) => masc(m, false, t, true)))).map(s => `<div class="m mg" style="background:#fff;border-radius:34px;padding:20px;color:#231f1b">${s}</div>`).join('')}</div>${foot()}</div>`);
  await render('post-08-chat.png', ...P(), `<div class="cv">${logo()}<h1>Et ton <em>chat</em> aussi.</h1><div class="sub w">Vaccins, litière, poids, 35 leçons (jeu, griffoir, caisse de transport, chat craintif…) et toxiques propres aux chats.</div><div class="m" style="margin-top:34px;width:500px">${await masc('good', true, 'Ronron de fierté 😻', true)}</div>${phone(shots.homeCat, 'width:390px;right:56px;top:560px;transform:rotate(5deg)')}${foot('1 chien + 1 chat gratuits')}</div>`);
  await render('post-10-parcours.png', ...P(), `<div class="cv o">${logo()}<h1>Chaque leçon, <em>un pas de plus</em>.</h1><div class="sub w">Un parcours en empreintes de pattes : tu avances, tu gagnes des os 🦴, tu montes de niveau.</div>${phone(shots.educ, 'width:410px;right:60px;top:520px;transform:rotate(5deg)')}${foot()}</div>`);
  await render('post-09-spa.png', ...P(), `<div class="cv d">${logo()}<h1>Un geste pour les animaux <em>sans famille</em>.</h1><div class="sub">Dans Wouf, un bouton mène directement à la page de don de la SPA. Wouf ne prend aucune commission : ton don va directement à l’association.</div><div style="font-size:300px;text-align:center;margin-top:30px">❤️</div>${foot('Non affilié à la SPA')}</div>`);

  /* ---------- CARROUSEL « aliments dangereux » (valeur ajoutée, partageable) ---------- */
  const tox = [['🍫', 'Chocolat', 'La théobromine est toxique : plus le chocolat est noir, plus il est dangereux. Vomissements, agitation, troubles cardiaques.'],
    ['🍇', 'Raisin et raisins secs', 'Peuvent provoquer une insuffisance rénale, même en petite quantité. Aucune dose n’est sûre.'],
    ['🧅', 'Oignon et ail', 'Crus, cuits ou en poudre : ils détruisent les globules rouges (anémie), parfois plusieurs jours après.'],
    ['🍬', 'Xylitol', 'Présent dans des chewing-gums, bonbons et dentifrices : chute brutale du sucre dans le sang, atteinte du foie.'],
    ['🦴', 'Os cuits', 'Ils se brisent en éclats coupants : blessures de la bouche, de l’intestin, occlusion.']];
  await render('carrousel-toxiques-1.png', ...P(), `<div class="cv o">${logo()}<div class="tag" style="margin-top:60px">À enregistrer 📌</div><h1 style="font-size:110px">5 aliments <em>dangereux</em> pour ton chien</h1><div class="sub">Glisse pour les découvrir 👉</div><div style="font-size:130px;margin-top:40px;letter-spacing:10px">🍫🍇🧅🍬🦴</div>${dots(7, 0)}</div>`);
  for (let i = 0; i < tox.length; i++) await render(`carrousel-toxiques-${i + 2}.png`, ...P(), `<div class="cv">${logo()}<div class="tag" style="margin-top:50px;color:#ee6a1c">Danger ${i + 1}/5</div><div class="big" style="margin-top:30px">${tox[i][0]}</div><h1 style="margin-top:30px">${tox[i][1]}</h1><div class="sub" style="font-size:44px">${tox[i][2]}</div>${dots(7, i + 1)}</div>`);
  await render('carrousel-toxiques-7.png', ...P(), `<div class="cv o">${logo()}<h1 style="margin-top:60px">Il en a avalé ?</h1><div class="sub" style="font-size:46px">📞 Appelle tout de suite ton vétérinaire ou un centre antipoison vétérinaire. Ne le fais pas vomir sans avis.</div><div class="list"><div class="li"><span class="e">🔎</span><span><b>Dans Wouf</b>la liste complète des aliments et produits dangereux, pour chien ET chat.</span></div><div class="li"><span class="e">🏥</span><span><b>Onglet SOS</b>les vétérinaires ouverts et de garde autour de toi.</span></div></div>${dots(7, 6)}</div>`);

  /* ---------- MÊME CARROUSEL pour TikTok (mode photo 1080×1920) : texte dans la zone sûre,
     hors des icônes de droite, de la légende en bas et des onglets en haut ; pas de points (TikTok affiche les siens) ---------- */
  const TT = [1080, 1920], tt = 'padding:230px 170px 560px 80px;justify-content:center';
  await render('tiktok-toxiques-1.png', ...TT, `<div class="cv o" style="${tt}">${logo()}<div class="tag" style="margin-top:60px">À enregistrer 📌</div><h1 style="font-size:112px">5 aliments <em>dangereux</em> pour ton chien</h1><div class="sub" style="font-size:44px">Glisse pour les découvrir 👉</div><div style="font-size:120px;margin-top:40px;letter-spacing:8px">🍫🍇🧅🍬🦴</div></div>`);
  for (let i = 0; i < tox.length; i++) await render(`tiktok-toxiques-${i + 2}.png`, ...TT, `<div class="cv" style="${tt}">${logo()}<div class="tag" style="margin-top:50px;color:#ee6a1c">Danger ${i + 1}/5</div><div class="big" style="margin-top:30px">${tox[i][0]}</div><h1 style="margin-top:30px;font-size:96px">${tox[i][1]}</h1><div class="sub" style="font-size:48px">${tox[i][2]}</div></div>`);
  await render('tiktok-toxiques-7.png', ...TT, `<div class="cv o" style="${tt}">${logo()}<h1 style="margin-top:50px;font-size:96px">Il en a avalé ?</h1><div class="sub" style="font-size:46px">📞 Appelle tout de suite ton vétérinaire ou un centre antipoison vétérinaire. Ne le fais pas vomir sans avis.</div><div class="list"><div class="li"><span class="e">🔎</span><span><b>Dans Wouf</b>la liste complète des aliments et produits dangereux, pour chien ET chat.</span></div><div class="li"><span class="e">🏥</span><span><b>Onglet SOS</b>les vétérinaires ouverts et de garde autour de toi.</span></div></div></div>`);

  /* ---------- TIKTOK « personne ne l'utilise » (2 photos : l'accroche, puis la présentation) ---------- */
  await render('tiktok-perso-1.png', ...TT, `<div class="cv d" style="${tt}">${logo()}<h1 style="font-size:92px;margin-top:60px">J’ai passé des heures et des heures à créer une app pour les chiens et les chats…</h1><h1 style="font-size:92px;margin-top:40px"><em>…et personne ne l’utilise</em> 🥲</h1><div class="m mg" style="margin-top:50px;width:560px">${await masc('bad', false, 'Même pas un petit essai ? 🥺', true)}</div></div>`);
  const feats = [['💉', 'Rappels vaccins, vermifuge, antipuces', 'plus jamais d’oubli'], ['🚨', 'SOS', 'vétos de garde autour de toi + aliments toxiques'], ['🎓', '10 leçons d’éducation gratuites', 'avec quiz et une mascotte qui réagit'], ['☀️', 'Météo des balades', 'la meilleure heure pour sortir'], ['🐾', 'Chien ET chat', 'dans la même app']];
  await render('tiktok-perso-2.png', ...TT, `<div class="cv o" style="${tt}">${logo()}<h1 style="font-size:84px;margin-top:40px">Alors je te la montre 👇</h1><div class="list" style="gap:18px">${feats.map(([e, b, t]) => `<div class="li" style="padding:22px 26px;font-size:32px"><span class="e" style="font-size:54px">${e}</span><span><b style="font-size:38px">${b}</b>${t}</span></div>`).join('')}</div><div class="sub" style="font-size:44px;margin-top:34px;font-weight:800">Gratuit · sans inscription<br>Tu testes ? Lien en bio 🐾</div></div>`);

  /* ---------- CARROUSEL « signes de douleur chez le chat » ---------- */
  const pain = [['🙈', 'Il se cache plus que d’habitude'], ['🧼', 'Il fait moins sa toilette (ou trop une zone)'], ['🚫', 'Il ne saute plus sur ses endroits préférés'], ['🍽️', 'Il mange moins ou mâche d’un côté'], ['🚽', 'Il fait ses besoins hors de la litière'], ['😾', 'Il devient irritable quand on le touche']];
  await render('carrousel-chat-douleur-1.png', ...P(), `<div class="cv d">${logo()}<div class="tag" style="margin-top:60px">Chats</div><h1 style="font-size:104px">Ton chat <em>cache sa douleur</em>.</h1><div class="sub">6 signes discrets à surveiller 👉</div><div class="m mx" style="margin-top:50px;width:640px">${await masc('bad', true, 'Je ne dis rien… 😿', true)}</div>${dots(3, 0)}</div>`);
  await render('carrousel-chat-douleur-2.png', ...P(), `<div class="cv">${logo()}<div class="list">${pain.map(([e, t]) => `<div class="li"><span class="e">${e}</span><span><b>${t}</b></span></div>`).join('')}</div>${dots(3, 1)}</div>`);
  await render('carrousel-chat-douleur-3.png', ...P(), `<div class="cv o">${logo()}<h1 style="margin-top:60px">Un changement qui dure ? <em>Consulte.</em></h1><div class="sub" style="font-size:46px">Un chat qui ne mange plus depuis 24 à 48 h, ou un mâle qui force pour uriner sans résultat : c’est une urgence.</div><div class="sub" style="font-size:40px;margin-top:40px">📝 Dans Wouf, note chaque changement dans le journal de santé : ton véto aura l’historique.</div>${dots(3, 2)}</div>`);

  /* ---------- FICHES « toxique du jour » (1 image par danger, texte repris tel quel des données de l'app) ---------- */
  const fiches = await ev(() => ({ chien: TOXICS.filter(t => t.level === 'danger').map(t => ({ name: t.name, why: t.why })), chat: TOXICS_CAT.filter(t => t.level === 'danger').map(t => ({ name: t.name, why: t.why })) }));
  const fdata = {};
  for (const sp of ['chien', 'chat']) {
    fdata[sp] = [];
    for (let i = 0; i < fiches[sp].length; i++) {
      const t = fiches[sp][i], m = t.name.match(/^([^(]+?)\s*(?:\((.*)\))?$/), title = m ? m[1] : t.name, more = m && m[2] || '', file = `fiche-${sp}-${String(i + 1).padStart(2, '0')}.png`;
      await render(file, ...P(), `<div class="cv ${sp === 'chat' ? 'd' : ''}">${logo()}<div class="tag" style="margin-top:50px">⛔ Danger pour ton ${sp}</div><h1 style="font-size:${title.length > 26 ? 84 : title.length > 14 ? 100 : 118}px">${title}</h1>${more ? `<div class="sub" style="opacity:.7">${more}</div>` : ''}<div class="sub" style="font-size:42px;margin-top:40px">${t.why}</div><div class="pill" style="align-self:flex-start">Un doute ? Appelle ton véto</div><div class="foot"><span>🔗 woufapp.fr</span><span>📌 À enregistrer</span></div></div>`);
      fdata[sp].push({ file, title, more, why: t.why });
    }
  }
  fs.writeFileSync(path.join(__dirname, 'fiches.json'), JSON.stringify(fdata, null, 1));

  /* ---------- STORIES (1080×1920) ---------- */
  const S = [1080, 1920];
  await render('story-01-lancement.png', ...S, `<div class="cv o" style="padding:120px 80px">${logo()}<h1 style="font-size:104px;margin-top:70px">Nouveau : le carnet de santé de ton chien et de ton chat 🐾</h1><div class="sub">Gratuit, sans inscription, sur ton téléphone.</div>${phone(shots.home, 'width:560px;left:260px;bottom:-200px')}<div class="foot" style="bottom:1000px"></div></div>`);
  await render('story-02-quiz.png', ...S, `<div class="cv" style="padding:120px 80px">${logo()}<h1 style="margin-top:70px">Tu connais la bonne réponse ? 🤔</h1>${phone(shots.quiz, 'width:560px;left:260px;top:420px')}<div class="sub" style="position:absolute;bottom:90px;left:80px;right:80px;text-align:center">👉 Fais le quiz dans Wouf (lien dans la bio)</div></div>`);
  await render('story-03-sondage.png', ...S, `<div class="cv d" style="padding:140px 80px;align-items:center;text-align:center">${logo()}<h1 style="margin-top:110px;font-size:100px">Ton chien revient-il <em>quand tu l’appelles</em> ?</h1><div class="sub">Réponds au sondage 👇</div><div class="m mx" style="margin-top:120px;width:700px">${await masc('think', false, 'Hmm… ça dépend des jours 😅', true)}</div></div>`);
  await render('story-04-lettre.png', ...S, `<div class="cv" style="padding:140px 80px;align-items:center;text-align:center">${logo()}<div class="tag" style="margin-top:120px">Né en 2026 ?</div><div style="font-size:520px;font-weight:900;color:#ee6a1c;line-height:1">B</div><h1 style="font-size:88px;margin-top:0">La lettre de l’année</h1><div class="sub">Trouve son nom dans Wouf 🏷️</div></div>`);

  /* ---------- PHOTO DE PROFIL et COUVERTURES « À LA UNE » ---------- */
  await render('profil.png', 1080, 1080, `<div class="cv" style="padding:0;align-items:center;justify-content:center;background:linear-gradient(160deg,#ffab5c,#ee6a1c)"><div style="width:1080px;height:1080px">${LOGO.replace(/<rect[^>]*\/>/, '')}</div></div>`);
  for (const [i, e, t] of [[1, '🩺', 'Santé'], [2, '🎓', 'Éducation'], [3, '🦮', 'Balades'], [4, '💡', 'Astuces'], [5, '⭐', 'Wouf+']])
    await render(`une-${i}-${t.normalize('NFD').replace(/[^a-zA-Z+]/g, '').replace('+', 'plus').toLowerCase()}.png`, 1080, 1920, `<div class="cv o" style="align-items:center;justify-content:center;text-align:center"><div style="width:560px;height:560px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:300px">${e}</div><h1 style="margin-top:60px">${t}</h1></div>`);

  await browser.close(); srv.close();
  console.log(`\n✓ Images générées dans ${path.relative(process.cwd(), OUT)}`);
})().catch(e => { console.error(e); process.exit(1); });
