#!/usr/bin/env node
/* Audit de sécurité express : contrôle automatique des points visibles de l'extérieur sur un site, puis rapport (JSON, HTML, PDF).
   Usage :
     node tools/audit-express.js https://exemple.fr --client "Boulangerie Martin" --accord [--sortie dossier]
   --accord : à ne mettre qu'avec l'ACCORD ÉCRIT du propriétaire du site (voir design/AUDIT-EXPRESS.md). Sans lui, l'outil ne fait rien.
   Prérequis : Playwright (cd wouf && npm install) et Chromium (variable CHROMIUM si hors /opt/pw-browsers).
   Ce que l'outil contrôle : HTTPS et certificat, en-têtes de sécurité, services externes chargés, cookies et traceurs dès l'arrivée, formulaires,
   clés oubliées dans le code public, fichiers sensibles exposés, contenu mixte, liens, pages légales présentes, bibliothèques anciennes.
   Ce qu'il ne contrôle PAS (et le rapport le dit) : serveur, mots de passe, droits d'accès, sauvegardes, réglages de consoles, conformité juridique, failles logiques. */
const fs = require('fs'), path = require('path'), tls = require('tls'), http = require('http'), https = require('https');
const VERSION = '1.0';

/* ---------- Ligne de commande ---------- */
const argv = process.argv.slice(2), opt = (n, d = '') => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const target = argv.find(a => /^https?:\/\//i.test(a));
if (!target) { console.error('Usage : node tools/audit-express.js https://exemple.fr --client "Nom" --accord [--sortie dossier]'); process.exit(1); }
if (!argv.includes('--accord')) {
  console.error('Audit non lancé. Ajoutez --accord uniquement si le propriétaire du site vous a donné son accord écrit pour ce contrôle.');
  process.exit(2);
}
const base = new URL(target), client = opt('client', base.hostname), outDir = path.resolve(opt('sortie', path.join('audits', base.hostname.replace(/[^\w.-]/g, '_') + '-' + new Date().toISOString().slice(0, 10))));
const isHttps = base.protocol === 'https:';

/* ---------- Résultats ---------- */
const R = [];   // { id, titre, statut: ok | attention | probleme | info, resume, details[], conseil }
const add = (id, titre, statut, resume, details = [], conseil = '') => R.push({ id, titre, statut, resume, details: details.slice(0, 25), conseil });

/* ---------- Requêtes simples ---------- */
function get(url, { method = 'GET', maxBytes = 2e6, timeout = 12000, headers = {} } = {}) {
  return new Promise(resolve => {
    const u = new URL(url), mod = u.protocol === 'https:' ? https : http;
    const req = mod.request(u, { method, timeout, headers: { 'user-agent': 'QuenTools-audit-express/' + VERSION, accept: '*/*', ...headers } }, res => {
      const chunks = []; let n = 0;
      res.on('data', c => { n += c.length; if (n <= maxBytes) chunks.push(c); else res.destroy(); });
      const done = () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), url });
      res.on('end', done); res.on('close', done); res.on('error', done);
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, headers: {}, body: '', url, error: 'délai dépassé' }); });
    req.on('error', e => resolve({ status: 0, headers: {}, body: '', url, error: e.code || e.message }));
    req.end();
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mask = s => String(s).slice(0, 6) + '…' + String(s).slice(-2);

/* ---------- 1. HTTPS et certificat ---------- */
async function checkHttps() {
  if (!isHttps) { add('https', 'HTTPS et certificat', 'probleme', 'Le site est servi en http, sans chiffrement : tout ce qui circule (formulaires, connexions) peut être lu.', [], 'Activer HTTPS chez l’hébergeur (gratuit dans la plupart des cas) et rediriger tout le trafic http vers https.'); return; }
  const d = [];
  const cert = await new Promise(resolve => {
    const s = tls.connect({ host: base.hostname, port: +base.port || 443, servername: base.hostname, rejectUnauthorized: false, timeout: 10000 }, () => {
      const c = s.getPeerCertificate(); resolve({ ok: s.authorized, err: s.authorizationError, to: c && c.valid_to, from: c && c.valid_from, issuer: c && c.issuer && (c.issuer.O || c.issuer.CN) }); s.end();
    });
    s.on('error', e => resolve({ ok: false, err: e.code || e.message })); s.on('timeout', () => { s.destroy(); resolve({ ok: false, err: 'délai dépassé' }); });
  });
  let st = 'ok', resume = 'HTTPS actif avec un certificat valide.';
  if (!cert.to) { st = 'probleme'; resume = 'Impossible de lire le certificat (' + (cert.err || 'erreur') + ').'; }
  else {
    const days = Math.round((Date.parse(cert.to) - Date.now()) / 864e5);
    d.push(`Émetteur : ${cert.issuer || 'inconnu'} · valide jusqu’au ${new Date(cert.to).toLocaleDateString('fr-FR')} (${days} jours)`);
    if (!cert.ok) { st = 'probleme'; resume = 'Le certificat n’est pas reconnu comme valide (' + cert.err + ').'; }
    else if (days < 0) { st = 'probleme'; resume = 'Le certificat a expiré.'; }
    else if (days < 21) { st = 'attention'; resume = `Le certificat expire dans ${days} jours : vérifier son renouvellement automatique.`; }
  }
  const h = new URL(base); h.protocol = 'http:'; h.port = '';
  const r = await get(h.href, { method: 'GET', maxBytes: 1e4 });
  if (r.status >= 300 && r.status < 400 && /^https:/i.test(r.headers.location || '')) d.push('La version http redirige bien vers https.');
  else if (r.status === 0) d.push('La version http ne répond pas (rien à rediriger).');
  else { if (st === 'ok') { st = 'attention'; resume = 'HTTPS fonctionne, mais la version http n’est pas redirigée vers https.'; } d.push('Réponse de la version http : ' + r.status + (r.headers.location ? ' vers ' + r.headers.location : '') + '.'); }
  add('https', 'HTTPS et certificat', st, resume, d, st === 'ok' ? '' : 'Renouveler ou corriger le certificat, et rediriger tout le trafic http vers https.');
}

/* ---------- 2. En-têtes de sécurité ---------- */
function checkHeaders(res) {
  const h = res.headers, d = [], miss = [];
  const has = n => h[n] != null;
  const lines = [['strict-transport-security', 'HSTS (force HTTPS)'], ['content-security-policy', 'Politique de sécurité de contenu (CSP)'], ['x-content-type-options', 'X-Content-Type-Options'], ['referrer-policy', 'Referrer-Policy']];
  lines.forEach(([k, l]) => { if (has(k)) d.push('Présent : ' + l); else miss.push(l); });
  const frame = has('x-frame-options') || /frame-ancestors/i.test(h['content-security-policy'] || '');
  if (frame) d.push('Présent : protection contre l’affichage du site dans un cadre (clickjacking)'); else miss.push('Protection contre le clickjacking (X-Frame-Options ou frame-ancestors)');
  if (miss.length) d.push('Absent : ' + miss.join(' · '));
  const server = h.server || h['x-powered-by'];
  if (server) d.push('Le serveur annonce : ' + [h.server, h['x-powered-by']].filter(Boolean).join(' · ') + ' (information inutile à divulguer)');
  const st = miss.length >= 4 ? 'attention' : miss.length ? 'info' : 'ok';
  add('entetes', 'En-têtes de sécurité', st, miss.length ? `${miss.length} en-tête${miss.length > 1 ? 's' : ''} de sécurité absent${miss.length > 1 ? 's' : ''} sur ${lines.length + 1}.` : 'Les en-têtes de sécurité usuels sont présents.', d,
    miss.length ? 'À régler chez l’hébergeur ou le serveur quand c’est possible. Certains hébergements gratuits (comme GitHub Pages) ne permettent pas de les modifier : ce point est alors indicatif.' : '');
}

/* ---------- 3 à 9. Navigateur : services externes, cookies, formulaires, liens, bibliothèques ---------- */
const TRACKERS = /google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|facebook\.net|connect\.facebook|hotjar\.com|clarity\.ms|analytics\.tiktok|tiktok\.com\/i18n|linkedin\.com\/px|snap\.licdn|ads-twitter\.com|pinterest\.com\/ct|criteo\.|taboola\.|outbrain\./i;
const sameSite = host => host === base.hostname || host.endsWith('.' + base.hostname.replace(/^www\./, ''));

async function checkBrowser() {
  const { chromium } = require('../wouf/node_modules/playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: 'Mozilla/5.0 QuenTools-audit-express/' + VERSION });
  const page = await ctx.newPage(), reqs = [], cons = [];
  page.on('request', r => reqs.push({ url: r.url(), type: r.resourceType() }));
  page.on('console', m => { if (m.type() === 'error') cons.push(m.text().slice(0, 160)); });
  page.on('pageerror', e => cons.push('Erreur JavaScript : ' + String(e.message).slice(0, 160)));
  let navErr = null;
  try { await page.goto(base.href, { waitUntil: 'networkidle', timeout: 30000 }); } catch (e) { navErr = e.message; try { await page.waitForTimeout(1500); } catch (x) { /* page fermée */ } }
  if (navErr && !reqs.length) { add('acces', 'Accès au site', 'probleme', 'Le site n’a pas pu être ouvert dans un navigateur : ' + navErr.split('\n')[0]); await browser.close(); return { html: '', scripts: [] }; }
  await page.waitForTimeout(1200);
  const html = await page.content();
  const dom = await page.evaluate(() => {
    const abs = u => { try { return new URL(u, location.href).href; } catch (e) { return ''; } };
    return {
      scripts: [...document.querySelectorAll('script[src]')].map(s => ({ url: abs(s.getAttribute('src')), integrity: !!s.integrity })),
      styles: [...document.querySelectorAll('link[rel~=stylesheet][href]')].map(s => ({ url: abs(s.getAttribute('href')), integrity: !!s.integrity })),
      forms: [...document.forms].map(f => ({ action: abs(f.getAttribute('action') || location.href), method: (f.method || 'get').toLowerCase(), types: [...f.elements].map(e => e.type).filter(Boolean),
        hasPass: !!f.querySelector('input[type=password]'), trap: !![...f.elements].find(e => /^(site|website|url|hp|honey|botcheck|_gotcha)/i.test(e.name || '') && (e.type === 'hidden' || getComputedStyle(e).position === 'absolute' || e.tabIndex < 0)) })),
      blank: [...document.querySelectorAll('a[target=_blank]')].filter(a => !/noopener|noreferrer/i.test(a.rel)).map(a => a.href).slice(0, 10),
      links: [...document.querySelectorAll('a[href]')].map(a => ({ t: (a.textContent || '').trim().toLowerCase().slice(0, 60), h: a.getAttribute('href') || '' })),
      generator: (document.querySelector('meta[name=generator]') || {}).content || '',
      csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy" i]'),
      libs: { jquery: window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery, angularjs: window.angular && window.angular.version && window.angular.version.full, bootstrap: window.bootstrap && window.bootstrap.Tooltip && window.bootstrap.Tooltip.VERSION, lodash: window._ && window._.VERSION },
      storage: (() => { try { return Object.keys(localStorage); } catch (e) { return []; } })()
    };
  });
  const cookies = await ctx.cookies();
  await browser.close();

  /* Services externes */
  const ext = [...dom.scripts.map(s => ({ ...s, kind: 'script' })), ...dom.styles.map(s => ({ ...s, kind: 'feuille de style' }))].filter(x => x.url && !sameSite(new URL(x.url).hostname));
  const fontHosts = [...new Set(reqs.filter(r => r.type === 'font' && !sameSite(new URL(r.url).hostname)).map(r => new URL(r.url).hostname))];
  const noInt = ext.filter(x => !x.integrity);
  const d3 = ext.map(x => `${x.kind} chargé depuis ${new URL(x.url).hostname}${x.integrity ? ' (avec vérification d’intégrité)' : ' (sans vérification d’intégrité)'}`);
  fontHosts.forEach(h => d3.push('police chargée depuis ' + h + ' : l’adresse IP des visiteurs lui est transmise'));
  const dedup = [...new Set(d3)];
  add('externes', 'Services externes chargés', noInt.length || fontHosts.length ? 'attention' : ext.length ? 'info' : 'ok',
    ext.length || fontHosts.length ? `${ext.length} script(s) ou feuille(s) de style et ${fontHosts.length} police(s) viennent d’un service externe.` : 'Aucun script, feuille de style ni police ne vient d’un service externe.', dedup,
    noInt.length || fontHosts.length ? 'Héberger ces fichiers sur le site, ou ajouter une vérification d’intégrité (attribut integrity) et une version fixe. Une police externe transmet l’adresse IP du visiteur : à signaler dans la politique de confidentialité ou à héberger soi-même.' : '');

  /* Traceurs, cookies */
  const trk = [...new Set(reqs.filter(r => TRACKERS.test(r.url)).map(r => new URL(r.url).hostname))];
  const d4 = trk.map(h => 'Service de mesure ou de publicité contacté dès l’arrivée : ' + h);
  cookies.forEach(c => d4.push(`Cookie posé dès l’arrivée : ${c.name} (${c.domain}${c.expires > 0 ? ', ' + Math.round((c.expires - Date.now() / 1000) / 86400) + ' jours' : ', session'})`));
  if (dom.storage.length) d4.push('Données écrites dans le navigateur : ' + dom.storage.slice(0, 8).join(', '));
  add('traceurs', 'Cookies et traceurs dès l’arrivée', trk.length ? 'probleme' : cookies.length ? 'attention' : 'ok',
    trk.length ? 'Des services de mesure ou de publicité sont contactés avant tout consentement.' : cookies.length ? `${cookies.length} cookie(s) posé(s) dès l’arrivée, avant tout choix du visiteur.` : 'Aucun cookie ni traceur publicitaire dès l’arrivée.', d4,
    trk.length || cookies.length ? 'Les cookies strictement nécessaires peuvent être exemptés, pas la mesure d’audience ni la publicité : prévoir un bandeau de consentement ou retirer ces services. Ce contrôle constate des faits ; la conformité juridique est à valider par un professionnel.' : '');

  /* Formulaires */
  const d5 = [];
  let fst = dom.forms.length ? 'ok' : 'info';
  dom.forms.forEach((f, i) => {
    const insecure = /^http:/i.test(f.action);
    if (insecure) { fst = 'probleme'; d5.push(`Formulaire ${i + 1} : envoyé en http, sans chiffrement${f.hasPass ? ' (avec champ mot de passe)' : ''}`); }
    else d5.push(`Formulaire ${i + 1} : envoi chiffré vers ${new URL(f.action).hostname}`);
    if (!f.trap && !/recaptcha|hcaptcha|turnstile/i.test(html)) { if (fst === 'ok') fst = 'attention'; d5.push(`Formulaire ${i + 1} : aucun anti-spam visible (champ piège ou captcha)`); }
  });
  add('formulaires', 'Formulaires', fst, dom.forms.length ? `${dom.forms.length} formulaire(s) trouvé(s) sur la page d’accueil.` : 'Aucun formulaire sur la page d’accueil (les autres pages ne sont pas parcourues par l’audit express).', d5,
    fst === 'ok' || fst === 'info' ? '' : 'Envoyer les formulaires en https et ajouter un anti-spam (champ piège, captcha respectueux de la vie privée).');

  /* Contenu mixte, liens, console */
  const mixed = isHttps ? [...new Set(reqs.filter(r => /^http:/i.test(r.url)).map(r => r.url))] : [];
  const d6 = mixed.map(u => 'Ressource chargée en http : ' + u.slice(0, 100));
  dom.blank.forEach(u => d6.push('Lien externe sans protection (rel="noopener") : ' + u.slice(0, 80)));
  cons.slice(0, 5).forEach(c => d6.push('Erreur affichée dans la console : ' + c));
  add('hygiene', 'Contenu mixte, liens et erreurs', mixed.length ? 'probleme' : dom.blank.length || cons.length ? 'attention' : 'ok',
    mixed.length ? 'Des ressources sont chargées en http sur une page https.' : dom.blank.length || cons.length ? 'Quelques défauts d’hygiène relevés.' : 'Pas de contenu mixte, liens protégés, console sans erreur.', d6,
    mixed.length || dom.blank.length ? 'Charger toutes les ressources en https et ajouter rel="noopener" aux liens qui s’ouvrent dans un nouvel onglet.' : '');

  /* Pages obligatoires */
  const found = n => dom.links.some(l => n.test(l.t) || n.test(l.h));
  const legal = [['Mentions légales', /mentions?[ -]?l[ée]gales?/i], ['Politique de confidentialité', /confidentialit|donn[ée]es personnelles|privacy|rgpd/i], ['Cookies', /cookies?/i], ['Conditions générales de vente', /cgv|conditions g[ée]n[ée]rales/i]];
  const d7 = legal.map(([l, re]) => (found(re) ? 'Lien trouvé : ' : 'Aucun lien trouvé : ') + l);
  const missing = legal.filter(([, re]) => !found(re)).map(x => x[0]);
  add('legal', 'Pages obligatoires (présence uniquement)', missing.includes('Mentions légales') ? 'attention' : missing.length ? 'info' : 'ok', missing.length ? 'Pages non repérées : ' + missing.join(', ') + '.' : 'Les pages usuelles sont liées depuis l’accueil.', d7,
    missing.length ? 'Selon l’activité du site, certaines de ces pages sont obligatoires (la boutique en ligne doit avoir des CGV, par exemple). L’audit vérifie seulement que les liens existent, pas leur contenu ni leur conformité.' : '');

  /* Bibliothèques anciennes (d'après mes connaissances, sans base mise à jour en direct) */
  const d8 = [], v = (s, n) => String(s || '').split('.').map(Number).concat([0, 0, 0]).slice(0, 3).reduce((a, x, i) => a + x * [1e6, 1e3, 1][i], 0) < n.split('.').map(Number).reduce((a, x, i) => a + x * [1e6, 1e3, 1][i], 0);
  let bad = false;
  if (dom.libs.jquery) { const old = v(dom.libs.jquery, '3.5.0'); if (old) bad = true; d8.push(`jQuery ${dom.libs.jquery}${old ? ' : version antérieure à 3.5.0, connue pour des failles XSS (CVE-2020-11022 et 11023)' : ''}`); }
  if (dom.libs.bootstrap) { const old = v(dom.libs.bootstrap, '4.3.1') && !/^3\.4\.[1-9]/.test(dom.libs.bootstrap); if (old) bad = true; d8.push(`Bootstrap ${dom.libs.bootstrap}${old ? ' : version ancienne, failles XSS connues dans certaines versions antérieures (CVE-2019-8331)' : ''}`); }
  if (dom.libs.angularjs) { bad = true; d8.push(`AngularJS ${dom.libs.angularjs} : ce framework n’est plus maintenu depuis décembre 2021`); }
  if (dom.libs.lodash) { const old = v(dom.libs.lodash, '4.17.21'); if (old) bad = true; d8.push(`Lodash ${dom.libs.lodash}${old ? ' : version antérieure à 4.17.21, failles connues (CVE-2020-8203, CVE-2021-23337)' : ''}`); }
  if (dom.generator) d8.push('Le site annonce son outil de création : ' + dom.generator + ' (cette information aide les attaquants à cibler les versions)');
  add('bibliotheques', 'Bibliothèques et outils détectés', bad ? 'probleme' : d8.length ? 'info' : 'ok', bad ? 'Des bibliothèques anciennes, connues pour des failles, sont utilisées.' : d8.length ? 'Bibliothèques détectées, aucune connue comme vulnérable.' : 'Aucune bibliothèque courante détectée.', d8,
    bad ? 'Mettre à jour ces bibliothèques. Ce contrôle repose sur mes connaissances des failles publiées, pas sur une base consultée en direct : il ne peut pas être exhaustif.' : '');
  return { html, scripts: dom.scripts.filter(s => s.url && sameSite(new URL(s.url).hostname)).map(s => s.url), csp: dom.csp };
}

/* ---------- 10. Clés oubliées dans le code public ---------- */
const SECRETS = [
  [/AKIA[0-9A-Z]{16}/g, 'Clé d’accès AWS'], [/sk_live_[0-9a-zA-Z]{20,}/g, 'Clé secrète Stripe (live)'], [/ghp_[A-Za-z0-9]{30,}/g, 'Jeton GitHub'], [/github_pat_[A-Za-z0-9_]{40,}/g, 'Jeton GitHub'],
  [/xox[abp]-[0-9A-Za-z-]{20,}/g, 'Jeton Slack'], [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'Clé privée'], [/SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, 'Clé SendGrid'],
  [/(?:secret|passwd|password)["']?\s*[:=]\s*["'][^"'\s]{10,}["']/gi, 'Valeur nommée « secret » ou « mot de passe » écrite dans le code']];
const SOFT = [[/AIza[0-9A-Za-z_-]{35}/g, 'Clé d’API Google (normale pour Firebase ou Maps, à condition qu’elle soit restreinte à votre site dans la console Google)']];
async function checkSecrets(html, scripts) {
  const bodies = [{ url: base.href, text: html }];
  for (const u of scripts.slice(0, 25)) { const r = await get(u, { maxBytes: 2e6 }); if (r.status === 200) bodies.push({ url: u, text: r.body }); }
  const hard = [], soft = [];
  for (const b of bodies) {
    SECRETS.forEach(([re, l]) => { for (const m of b.text.matchAll(re)) hard.push(`${l} (${mask(m[0])}) dans ${new URL(b.url).pathname}`); });
    SOFT.forEach(([re, l]) => { const m = b.text.match(re); if (m) soft.push(`${l} : ${mask(m[0])} dans ${new URL(b.url).pathname}`); });
  }
  const d = [...new Set(hard)].concat([...new Set(soft)]);
  add('secrets', 'Clés oubliées dans le code public', hard.length ? 'probleme' : soft.length ? 'info' : 'ok', hard.length ? 'Des clés ou mots de passe semblent écrits dans le code visible par tous.' : soft.length ? 'Une clé d’API publique est visible, ce qui est normal si elle est restreinte.' : `Aucune clé connue trouvée (${bodies.length} fichier${bodies.length > 1 ? 's' : ''} lu${bodies.length > 1 ? 's' : ''}).`, d,
    hard.length ? 'Révoquer immédiatement ces clés chez le fournisseur et en créer de nouvelles, sans les écrire dans le code. Un secret publié doit être considéré comme compromis.' : soft.length ? 'Vérifier dans la console du fournisseur que la clé est restreinte à votre site et aux seules API nécessaires.' : '');
}

/* ---------- 11. Fichiers sensibles exposés ---------- */
const PROBES = [
  ['/.env', b => /^\s*[A-Z][A-Z0-9_]{2,}\s*=/m.test(b), 'fichier de réglages avec des secrets'], ['/.git/HEAD', b => /^ref: refs\//.test(b), 'dépôt git exposé (tout le code source peut être récupéré)'],
  ['/.git/config', b => /\[core\]/.test(b), 'dépôt git exposé'], ['/.DS_Store', b => b.startsWith('\u0000\u0000\u0000\u0001Bud1'), 'fichier système révélant la liste des fichiers'],
  ['/wp-config.php.bak', b => /DB_PASSWORD/.test(b), 'sauvegarde de configuration WordPress'], ['/wp-config.php~', b => /DB_PASSWORD/.test(b), 'copie de configuration WordPress'],
  ['/phpinfo.php', b => /PHP Version/.test(b), 'page d’information PHP'], ['/backup.zip', (b, h) => /zip|octet-stream/.test(h['content-type'] || '') && b.startsWith('PK'), 'archive de sauvegarde'],
  ['/backup.sql', b => /CREATE TABLE|INSERT INTO/i.test(b), 'sauvegarde de base de données'], ['/database.sql', b => /CREATE TABLE|INSERT INTO/i.test(b), 'sauvegarde de base de données'],
  ['/config.json', (b, h) => /json/.test(h['content-type'] || '') && /(secret|password|token|apikey|api_key)/i.test(b), 'fichier de configuration avec des secrets']];
async function checkExposed() {
  const hit = [], tried = [];
  for (const [p, test, label] of PROBES) {
    const r = await get(new URL(p, base.origin).href, { maxBytes: 2e5, timeout: 8000 }); tried.push(p);
    if (r.status === 200 && test(r.body, r.headers) && !/^\s*<!doctype html|^\s*<html/i.test(r.body)) hit.push(`${p} accessible : ${label}`);
    await sleep(150);
  }
  add('exposes', 'Fichiers sensibles exposés', hit.length ? 'probleme' : 'ok', hit.length ? 'Des fichiers qui ne devraient pas être publics sont accessibles.' : `Aucun des ${tried.length} fichiers sensibles courants n’est accessible.`, hit.length ? hit : ['Fichiers testés : ' + tried.join(', ')],
    hit.length ? 'Retirer ces fichiers du serveur, puis changer tous les mots de passe et clés qu’ils contenaient : ils ont pu être récupérés par n’importe qui.' : '');
}

/* ---------- Rapport ---------- */
const NOTCOV = ['Le serveur et l’hébergement en interne, la configuration du réseau.', 'Les mots de passe, les droits d’accès, les comptes administrateur.', 'Les sauvegardes et la reprise après incident.',
  'Les réglages dans des consoles auxquelles l’audit n’a pas accès (Google, Firebase, Shopify, PayPal, hébergeur…).', 'La conformité juridique (RGPD, mentions légales, CGV) : seule la présence des pages est constatée.',
  'Les failles propres au fonctionnement du site (logique métier, droits entre utilisateurs), qui demandent un vrai test d’intrusion.', 'Les pages autres que l’accueil, sauf mention contraire.'];
const LAB = { ok: ['Conforme', '#0c6244', '#dff3ea'], info: ['À savoir', '#44505a', '#e8ecef'], attention: ['À améliorer', '#7a4500', '#ffecc9'], probleme: ['À corriger', '#8f1d15', '#fde2e0'] };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function rapportHtml(data) {
  const cnt = k => data.resultats.filter(r => r.statut === k).length, date = new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const items = data.resultats.map(r => { const l = LAB[r.statut];
    return `<section class="it"><div class="h"><h3>${esc(r.titre)}</h3><span class="g" style="color:${l[1]};background:${l[2]}">${l[0]}</span></div><p>${esc(r.resume)}</p>${r.details.length ? `<ul>${r.details.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}${r.conseil ? `<p class="c"><b>Que faire :</b> ${esc(r.conseil)}</p>` : ''}</section>`; }).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Audit de sécurité express · ${esc(data.client)}</title><style>
@page{size:A4;margin:16mm 15mm}*{box-sizing:border-box}body{font:10.5pt/1.5 "Helvetica Neue",Arial,sans-serif;color:#1b1a22;margin:0}
h1{font-size:23pt;line-height:1.15;margin:0 0 6pt}h2{font-size:13.5pt;margin:20pt 0 8pt;padding-bottom:4pt;border-bottom:2px solid #5b3df5;break-after:avoid}h3{font-size:11.5pt;margin:0}
p{margin:0 0 6pt}.k{font-size:9pt;letter-spacing:.1em;text-transform:uppercase;color:#5b3df5;font-weight:700}.mut{color:#666}
.sum{display:grid;grid-template-columns:repeat(4,1fr);gap:8pt;margin:10pt 0}.sum div{border:1px solid #ddd;border-radius:8pt;padding:8pt 10pt}.sum b{display:block;font-size:20pt}
.it{border:1px solid #e3e1ee;border-radius:8pt;padding:9pt 11pt;margin:0 0 8pt;break-inside:avoid}.h{display:flex;justify-content:space-between;gap:10pt;align-items:center;margin-bottom:4pt}
.g{font-size:8.5pt;font-weight:700;padding:1.5pt 8pt;border-radius:99pt;white-space:nowrap}ul{margin:3pt 0 6pt;padding-left:15pt}li{margin-bottom:2pt;font-size:9.6pt}.c{background:#f6f4ff;border-left:3px solid #5b3df5;padding:5pt 8pt;border-radius:0 5pt 5pt 0;margin-top:5pt}
.foot{margin-top:16pt;font-size:8.6pt;color:#777;border-top:1px solid #ddd;padding-top:6pt}</style></head><body>
<div class="k">QuenTools · audit de sécurité express</div><h1>${esc(data.client)}</h1>
<p class="mut">Site contrôlé : ${esc(data.url)} · Rapport du ${esc(date)} · Outil d’audit v${VERSION}</p>
<div class="sum"><div><b>${cnt('probleme')}</b>à corriger</div><div><b>${cnt('attention')}</b>à améliorer</div><div><b>${cnt('info')}</b>à savoir</div><div><b>${cnt('ok')}</b>conformes</div></div>
<h2>Résultats</h2>${items}
<h2>Ce que cet audit ne couvre pas</h2><p>Cet audit ne contrôle que ce qui est visible de l’extérieur sur la page d’accueil. Il ne couvre pas :</p><ul>${NOTCOV.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
<div class="foot"><b>Portée.</b> Ce rapport décrit l’état constaté des points listés à la date indiquée. Il ne constitue ni une certification, ni un test d’intrusion, ni un avis juridique, et ne garantit pas que le site est sécurisé. Contrôle réalisé avec l’accord écrit du propriétaire du site.</div></body></html>`;
}

/* ---------- Exécution ---------- */
(async () => {
  console.log(`Audit express de ${base.href} (client : ${client})`);
  const home = await get(base.href, { maxBytes: 1e6 });
  if (home.error && !home.status) { console.error('Le site ne répond pas : ' + home.error); process.exit(3); }
  await checkHttps();
  checkHeaders(home);
  const b = await checkBrowser();
  if (b.html) await checkSecrets(b.html, b.scripts);
  await checkExposed();
  const order = ['acces', 'https', 'entetes', 'externes', 'traceurs', 'formulaires', 'hygiene', 'legal', 'bibliotheques', 'secrets', 'exposes'];
  R.sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  const data = { outil: 'QuenTools audit express', version: VERSION, date: new Date().toISOString(), client, url: base.href, resultats: R };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'rapport.json'), JSON.stringify(data, null, 1));
  const html = rapportHtml(data); fs.writeFileSync(path.join(outDir, 'rapport.html'), html);
  try {
    const { chromium } = require('../wouf/node_modules/playwright'), br = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' }), pg = await br.newPage();
    await pg.setContent(html, { waitUntil: 'load' }); await pg.pdf({ path: path.join(outDir, 'rapport.pdf'), format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' } }); await br.close();
  } catch (e) { console.error('PDF non généré :', e.message); }
  const n = k => R.filter(r => r.statut === k).length;
  console.log(`Terminé : ${n('probleme')} à corriger, ${n('attention')} à améliorer, ${n('info')} à savoir, ${n('ok')} conformes.\nRapport : ${outDir}`);
  R.forEach(r => console.log(`  [${r.statut.padEnd(9)}] ${r.titre} — ${r.resume}`));
})().catch(e => { console.error('Erreur :', e.message); process.exit(1); });
