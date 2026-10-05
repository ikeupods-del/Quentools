#!/usr/bin/env node
/* Teste l'assistant du site (mode local) : pose de vraies questions dans la bulle et contrôle les réponses (prix lus dans le catalogue, liens, sujets proches).
   Prérequis : Playwright (wouf/node_modules). Le serveur statique est lancé ici même.
   Usage : node tools/test-assistant.js */
const { chromium } = require('../wouf/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
const w = {}; new Function('window', fs.readFileSync(path.join(racine, 'assets', 'qt-templates.js'), 'utf8'))(w); const T = w.QTT;
const prix = id => T.priceText(T.options.find(o => o.id === id)).replace(/ | /g, ' ');
const base = T.templates[0].base;

/* [question, motif attendu dans la réponse, motif interdit (facultatif)] */
const CAS = [
  ['bonjour', /Bonjour/],
  ['qui êtes vous ?', /assistant automatique/],
  ['vous êtes une agence de com ?', /agence de communication/i],
  ['combien coûte la version anglaise', new RegExp(prix('anglais'))],
  ['vous faites des logos ?', new RegExp(prix('logo'))],
  ['je veux des visuels pour instagram', new RegExp(prix('social'))],
  ['je veux être visible sur google', new RegExp(prix('seo'))],
  ['et la prise en main en visio ?', new RegExp(prix('priseenmain'))],
  ['qui écrit les textes ?', new RegExp(prix('textes'))],
  ['prix des pages supplémentaires', new RegExp(prix('pages'))],
  ['à quoi servent les e-mails de confirmation ?', /rappel avant son rendez-vous/],
  ['je veux accepter le paiement par carte', new RegExp(prix('paiement'))],
  ['réservations enregistrées dans une base de données', new RegExp(prix('bdd'))],
  ['système de réservation pour mon site vitrine', new RegExp(prix('reservation'))],
  ['quelle réservation choisir ?', /jamais besoin des deux/],
  ['que se passe-t-il après les 3 mois offerts ?', new RegExp(prix('suivi'))],
  ['et le suivi mensuel ?', new RegExp(prix('suivi'))],
  ['combien coûte un site ?', new RegExp(String(base))],
  ['les tarifs svp', /Repères/],
  ['je suis coiffeur', /Barbier de luxe/],
  ['je suis esthéticienne', /Institut de beauté et coiffure/],
  ['je suis plombier', /plombier/i],
  ['je répare des téléphones', /Réparateur/],
  ['audit de sécurité', /100 €/],
  ['pourquoi vous choisir plutôt qu\'une autre agence ?', /prix fixé avant de commencer/],
  ['le site m\'appartient ?', /nom de domaine est à votre nom/],
  ['je ne sais pas quoi choisir', /votre métier/],
  ['vous faites des applications comme Wouf ?', /ne propose pas/],
  ['quelles sont vos options', /Options des templates/],
  ['y a-t-il des cookies ?', /ni cookie/],
  ['qjuelle est la prise en mian', /50 €/],
  ['merci beaucoup', /plaisir/],
  ['combien coûte un chatbot pour mon site ?', new RegExp(prix('assistant'))],
  ['vous pouvez mettre un assistant comme ça sur mon site ?', new RegExp(prix('assistant'))],
  ['bonjour, quels sont vos horaires ?', /48 h ouvrées/],
  ['vous pouvez créer un réseau social ?', /ne propose pas/],
  ['je cherche quelqu\'un pour mes réseaux sociaux', new RegExp(prix('social'))],
  ['mon site peut il être en anglais', new RegExp(prix('anglais'))],
  ['je veux un logo pour ma boulangerie', new RegExp(prix('logo'))],
  ['vous faites les photos ?', /./],
  ['combien de temps pour avoir mon site', /délai/i],
  ['je peux vous appeler ?', /devis/i],
  ['tarif audit', /100 €/],
  ['qu\'est ce qu\'un template', /site déjà conçu/],
  ['mon site doit être sur téléphone', /téléphone/i],
  ['je suis restaurateur', /Restaurant|restaurant/],
  ['je vends des gâteaux sur commande', /Plateaux et commandes/],
  ['mon salon de coiffure veut des rendez-vous en ligne', /réservation/i],
  ['dois-je payer des frais cachés ?', /prix fixé|fixé/i],
  ['blablabla zzzzz', /(pas sûr|pas bien compris)/]
];
/* Questions dont la réponse ne doit PAS venir d'un sujet voisin */
const INTERDITS = [
  ['paiement en ligne', /Les infos légales/],
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
  await p.goto(url.replace('index.html', 'templates/')); await p.waitForSelector('.qa-open'); await p.click('.qa-open');
  const kept = await p.locator('.qa-m.me').count(); if (!kept) { ko++; console.log('✗ la conversation n’est pas conservée entre deux pages'); }
  await p.click('.qa-new'); if (await p.locator('.qa-m.me').count()) { ko++; console.log('✗ « nouvelle conversation » ne vide pas la discussion'); }
  // Suites proposées : jamais de bouton vide ni de sujet inconnu.
  const chips = await p.locator('.qa-chip').allTextContents(); if (!chips.length || chips.some(c => !c.trim())) { ko++; console.log('✗ suggestions vides'); }
  if (errs.length) { ko++; console.log('✗ erreurs JavaScript :', errs.join(' | ')); }
  await b.close(); srv.close();
  console.log(ko ? `${ko} problème(s)` : `✓ Assistant : ${CAS.length + INTERDITS.length + 3} contrôles réussis.`);
  process.exit(ko ? 1 : 0);
})();
