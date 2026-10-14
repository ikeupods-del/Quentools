#!/usr/bin/env node
/* Teste l'assistant du site (mode local) : pose de vraies questions dans la bulle et contrôle les réponses (prix lus dans le catalogue, liens, sujets proches).
   Prérequis : Playwright (wouf/node_modules). Le serveur statique est lancé ici même.
   Usage : node tools/test-assistant.js */
const { chromium } = require([process.env.PW, require('path').join(__dirname, '../wouf/node_modules/playwright'), '/opt/node22/lib/node_modules/playwright'].find(x => x && require('fs').existsSync(x)));
const http = require('http'), fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const w = {}; new Function('window', fs.readFileSync(path.join(racine, 'assets', 'qt-templates.js'), 'utf8'))(w); const T = w.QTT;
const prix = id => T.priceText(T.options.find(o => o.id === id)).replace(/ | /g, ' ');

/* [question, motif attendu dans la réponse, motif interdit (facultatif)] */
const offre = id => { const t = T.templates.find(x => x.id === id); return String(t.base).replace(/(\d)(\d{3})$/, '$1\\s?$2') + '\\s?€'; };   // espace insécable ou fine selon le navigateur
const CAS = [
  ['bonjour', /Bonjour/],
  ['qui êtes vous ?', /assistant automatique/],
  ['vous êtes une agence de com ?', /studio de création d’apps/i],
  ['combien coûte la version anglaise', new RegExp(prix('anglais'))],
  ['vous faites des logos ?', new RegExp(prix('logo'))],
  ['et la prise en main en visio ?', new RegExp(prix('priseenmain'))],
  ['à quoi servent les e-mails de confirmation ?', /rappel avant son rendez-vous/],
  ['comment marche l\'acompte ?', /Acompte reçu/],
  ['que se passe-t-il après les 3 mois ?', new RegExp(prix('suivi'))],
  ['et le suivi mensuel ?', new RegExp(prix('suivi'))],
  ['c\'est quoi le pack commerçant', new RegExp(offre('pack'))],
  ['mes clientes ne viennent pas au rendez-vous', /acompte/i],
  ['une carte de fidélité sur téléphone ?', /fidélité/i],
  ['combien coûte un outil sur mesure ?', new RegExp(offre('outil'))],
  ['je veux une application pour mes clients', new RegExp(offre('appli'))],
  ['les tarifs svp', /Repères/],
  ['je suis coiffeur', /Pack Commerçant/],
  ['je suis prothésiste ongulaire', /onglerie/i],
  ['je suis plombier', /outil métier/i],
  ['je fais des plateaux sur commande', /commande/i],
  ['audit de sécurité', /100 €/],
  ['pourquoi vous choisir ?', /prix fixé avant de commencer/],
  ['mes données sont à qui ?', /chez vous/],
  ['je ne sais pas quoi choisir', /métier/],
  ['vous pouvez créer un réseau social ?', /très gros projets/],
  ['vous faites des sites vitrines ?', /ne crée plus de sites/],
  ['quelles sont vos options', /Options, prix publics/],
  ['y a-t-il des cookies ?', /ni cookie/],
  ['qjuelle est la prise en mian', /50 €/],
  ['merci beaucoup', /plaisir/],
  ['bonjour, quels sont vos horaires ?', /48 h ouvrées/],
  ['combien de temps pour avoir mon outil', /quelques jours|quelques semaines/i],
  ['je peux vous appeler ?', /devis/i],
  ['tarif audit', /100 €/],
  ['vos applications gratuites', /Wouf/],
  ['dois-je payer des frais cachés ?', /prix fixé|fixé/i],
  ['blablabla zzzzz', /(pas sûr|pas bien compris)/]
];
/* Questions dont la réponse ne doit PAS venir d'un sujet voisin */
const INTERDITS = [
  ['paiement en ligne', /informations légales/],
  ['e-mail de confirmation', /Le devis est gratuit et sans engagement, avec un prix fixé/]
];

/* Aucun prix écrit en dur dans les connaissances de l'assistant : seuls le catalogue et l'audit (100 €) sont admis. */
{ const src = fs.readFileSync(path.join(racine, 'assets', 'assistant-qt.js'), 'utf8'), permis = new Set(['100']);
  T.templates.forEach(x => permis.add(String(x.base).replace('.', ','))); T.options.forEach(o => permis.add(String(o.price).replace('.', ',')));
  const faux = [...src.matchAll(/(\d[\d ]*(?:,\d+)?) ?€/g)].map(m => m[1].trim()).filter(n => !permis.has(n));
  if (faux.length) { console.log('✗ prix écrits en dur absents du catalogue :', [...new Set(faux)].join(', ')); process.exitCode = 1; } }
(async () => {
  const srv = http.createServer((req, res) => {
    let f = path.join(racine, decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
    if (!f.startsWith(racine) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  }).listen(0);
  const url = `http://localhost:${srv.address().port}/index.html`;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(url); await p.waitForFunction(() => window.QTT && document.querySelector('.qa-open'));
  const ask = async q => {
    await p.click('.qa-new').catch(() => {});
    const n0 = await p.locator('.qa-m.bot').count();
    await p.fill('.qa-in', q); await p.press('.qa-in', 'Enter');
    await p.waitForFunction(n => { const l = document.querySelectorAll('.qa-m.bot'); return l.length > n && !l[l.length - 1].classList.contains('qa-typing'); }, n0, { timeout: 5000 });
    return (await p.locator('.qa-m.bot').last().textContent()).replace(/ | /g, ' ');
  };
  await p.click('.qa-open');
  let ko = 0;
  for (const [q, ok] of CAS) { const r = await ask(q); if (!ok.test(r)) { ko++; console.log('✗', q, '\n   →', r.slice(0, 160).replace(/\n/g, ' ')); } }
  for (const [q, bad] of INTERDITS) { const r = await ask(q); if (bad.test(r)) { ko++; console.log('✗ (sujet voisin)', q, '\n   →', r.slice(0, 160).replace(/\n/g, ' ')); } }
  // Conversation conservée d'une page à l'autre, puis « nouvelle conversation ».
  await ask('combien coûte la version anglaise');
  await p.goto(url.replace('index.html', 'audit/')); await p.waitForSelector('.qa-open'); await p.click('.qa-open');
  const kept = await p.locator('.qa-m.me').count(); if (!kept) { ko++; console.log('✗ la conversation n’est pas conservée entre deux pages'); }
  await p.click('.qa-new'); if (await p.locator('.qa-m.me').count()) { ko++; console.log('✗ « nouvelle conversation » ne vide pas la discussion'); }
  // Suites proposées : jamais de bouton vide ni de sujet inconnu.
  const chips = await p.locator('.qa-chip').allTextContents(); if (!chips.length || chips.some(c => !c.trim())) { ko++; console.log('✗ suggestions vides'); }
  if (errs.length) { ko++; console.log('✗ erreurs JavaScript :', errs.join(' | ')); }
  await b.close(); srv.close();
  console.log(ko ? `${ko} problème(s)` : `✓ Assistant : ${CAS.length + INTERDITS.length + 3} contrôles réussis.`);
  process.exit(ko ? 1 : 0);
})();
