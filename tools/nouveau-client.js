#!/usr/bin/env node
/* Prépare le site d'un client à partir d'un modèle de design/templates/ et d'une fiche (JSON) : copie le système de design,
   applique la marque (3 jetons, contraste contrôlé), remplace les champs connus et liste ce qu'il reste à compléter.
   Le dossier créé (clients/<dossier>/) n'est jamais versionné.
   Usage : node tools/nouveau-client.js --exemple > fiche.json   (modèle de fiche)
           node tools/nouveau-client.js fiche.json              (génère clients/<dossier>/)
           node tools/nouveau-client.js --modeles               (modèles disponibles) */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), tpl = path.join(racine, 'design', 'templates');
const modeles = fs.readdirSync(tpl).filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')).filter(m => !['legal', 'merci'].includes(m));
const arg = process.argv[2];
const EXEMPLE = { modele: 'vitrine', dossier: 'dupont-plomberie', nom: 'Dupont Plomberie', metier: 'plombier chauffagiste', ville: 'Lyon',
  accroche: 'une panne réparée dans la journée', couleur: '#0f766e', services: ['Dépannage urgent', 'Chauffe-eau', 'Salle de bains'],
  telephone: '06 12 34 56 78', email: 'contact@exemple.fr',
  domaine: 'dupont-plomberie.fr', adresse: { rue: '12 rue des Lilas', codePostal: '69006' }, horaires: ['Mo-Fr 08:00-18:00', 'Sa 09:00-12:00'],
  assistant: { tarifs: [{ nom: 'Déplacement et diagnostic', prix: '49 €' }], faq: [{ q: 'Intervenez-vous le dimanche ?', k: 'dimanche|week end', a: 'Uniquement pour les urgences, au tarif d’astreinte indiqué au téléphone.' }] } };

if (arg === '--exemple') { console.log(JSON.stringify(EXEMPLE, null, 2)); process.exit(0); }
if (arg === '--modeles') { console.log(modeles.join('\n')); process.exit(0); }
if (!arg) { console.error('Usage : node tools/nouveau-client.js fiche.json | --exemple | --modeles'); process.exit(1); }

const f = JSON.parse(fs.readFileSync(arg, 'utf8'));
for (const k of ['modele', 'dossier', 'nom', 'couleur']) if (!f[k]) { console.error(`Champ obligatoire manquant : ${k}`); process.exit(1); }
if (!modeles.includes(f.modele)) { console.error(`Modèle inconnu « ${f.modele} ». Disponibles : ${modeles.join(', ')}`); process.exit(1); }
if (!/^[a-z0-9-]+$/.test(f.dossier)) { console.error('« dossier » : minuscules, chiffres et tirets uniquement'); process.exit(1); }
if (!/^#[0-9a-f]{6}$/i.test(f.couleur)) { console.error('« couleur » : code #rrggbb'); process.exit(1); }

// Couleurs : accent, fond doux (clair et sombre), version éclaircie pour le mode sombre ; contraste du texte blanc contrôlé.
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
const lum = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
const A = rgb(f.couleur), BL = [255, 255, 255], NO = [13, 12, 18];
const contraste = 1.05 / (lum(A) + .05);
const accent = f.couleur, soft = hex(mix(A, BL, .88)), accentSombre = hex(mix(A, BL, .45)), softSombre = hex(mix(A, NO, .85));
const lime = f.couleur2 || '#fbbf24';
const jetons = `.display{font-size:clamp(2rem,8.2vw,4.6rem);overflow-wrap:break-word;hyphens:auto}.display em{white-space:normal}\n  :root{--accent:${accent};--accent-soft:${soft};--lime:${lime}}\n  @media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--accent:${accentSombre};--accent-soft:${softSombre}}}`;

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const tel = String(f.telephone || ''), e164 = tel ? '+33' + tel.replace(/\D/g, '').replace(/^0/, '') : '';
const s = f.services || [];
const remplacements = [
  ['[Nom de l’entreprise]', f.nom], ['[Nom]', f.nom],
  ['[Votre métier]', cap(f.metier)], ['[Métier]', cap(f.metier)], ['[métier]', f.metier],
  ['[ville]', f.ville], ['[promesse courte]', f.accroche],
  ['[service 1]', s[0]], ['[service 2]', s[1]], ['[service 3]', s[2]],
  ['[Service 1]', cap(s[0])], ['[Service 2]', cap(s[1])], ['[Service 3]', cap(s[2])],
  ['[+33600000000]', e164], ['[06 00 00 00 00]', tel]
];

let h = fs.readFileSync(path.join(tpl, f.modele + '.html'), 'utf8');
h = h.replace(/:root\{--accent:[^}]*\}\s*@media \(prefers-color-scheme:dark\)\{:root:not\(\[data-theme="light"\]\)\{[^}]*\}\}/, jetons);
for (const [de, par] of remplacements) if (par) h = h.split(de).join(par);

const sortie = path.join(racine, 'clients', f.dossier);
fs.mkdirSync(path.join(sortie, 'assets', 'fonts'), { recursive: true });
for (const x of ['qt.css', 'qt.js']) fs.copyFileSync(path.join(racine, 'assets', x), path.join(sortie, 'assets', x));
for (const x of fs.readdirSync(path.join(racine, 'assets', 'fonts'))) if (/^(bricolage|inter)\.woff2$|^OFL-/.test(x)) fs.copyFileSync(path.join(racine, 'assets', 'fonts', x), path.join(sortie, 'assets', 'fonts', x));
const seoMsgs = [];
/* Option « Assistant de site » : bulle de discussion en mode local, construite uniquement à partir de la fiche (services, horaires, adresse, coordonnées, tarifs et questions fournis).
   Rien n'est inventé : une rubrique absente de la fiche n'existe pas dans l'assistant. */
if (f.assistant) {
  const J = { Mo: 'lundi', Tu: 'mardi', We: 'mercredi', Th: 'jeudi', Fr: 'vendredi', Sa: 'samedi', Su: 'dimanche' };
  const hum = x => String(x).replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)-(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (m, a, b) => `${J[a]} au ${J[b]}`).replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, m => J[m]).replace(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/g, (m, h1, m1, h2, m2) => `de ${+h1} h${m1 === '00' ? '' : m1} à ${+h2} h${m2 === '00' ? '' : m2}`).replace(/ de /, ' : de ');
  const a = f.assistant === true ? {} : f.assistant, E = [], mots = x => x, q = JSON.stringify;
  E.push({ id: 'hello', social: true, q: '', k: 'bonjour|bonsoir|salut|coucou|hello', a: `Bonjour ! Que puis-je faire pour vous ?` });
  E.push({ id: 'thanks', social: true, q: '', k: 'merci|parfait|super|ok|d accord', a: 'Avec plaisir ! Autre chose ?' });
  if (s.length) E.push({ id: 'services', q: 'Vos services', k: 'service|prestation|que faites vous|vous faites quoi|proposez|propose', a: `${f.nom} (${f.metier}${f.ville ? ' à ' + f.ville : ''}) : ${(f.services || []).join(', ')}.` });
  if (Array.isArray(f.horaires) && f.horaires.length) E.push({ id: 'horaires', q: 'Horaires', k: 'horaire|ouvert|ferme|quand|heure|disponible', a: 'Nos horaires : ' + f.horaires.map(hum).join(' ; ') + '.' });
  if (f.adresse && f.adresse.rue) E.push({ id: 'adresse', q: 'Adresse', k: 'adresse|ou etes vous|ou se trouve|situe|venir|plan|acces|localisation', a: `${f.adresse.rue}${f.adresse.codePostal ? ', ' + f.adresse.codePostal : ''}${f.ville ? ' ' + f.ville : ''}.` });
  if (f.telephone || f.email) E.push({ id: 'contact', q: 'Nous contacter', k: 'contact|contacter|joindre|telephone|appeler|mail|email|numero|rdv|rendez vous|devis', a: `${f.telephone ? 'Par téléphone : ' + f.telephone + '.' : ''}${f.email ? ' Par e-mail : ' + f.email + '.' : ''} Nous vous répondons pour confirmer.` });
  if (Array.isArray(a.tarifs) && a.tarifs.length) E.push({ id: 'tarifs', q: 'Tarifs', k: 'prix|tarif|combien|cout|coute|budget', a: 'Tarifs : ' + a.tarifs.map(t => `${t.nom} ${t.prix}`).join(' ; ') + '. Pour un devis précis, contactez-nous.' });
  (a.faq || []).forEach((x, i) => E.push({ id: 'faq' + i, q: x.q, k: x.k || '', a: x.a }));
  const start = E.filter(e => e.q).map(e => e.id).slice(0, 4), tel = f.telephone ? ` Le plus simple : appelez-nous au ${f.telephone}.` : '';
  const kb = { intro: `Bonjour ! Je suis l’assistant de ${f.nom}. Posez-moi votre question ou choisissez un sujet.`, start, fallback: 'Je n’ai pas cette information.' + tel, fallback2: 'Je ne trouve pas la réponse.' + tel, entries: E };
  fs.mkdirSync(path.join(sortie, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(sortie, 'assets', 'assistant-kb.js'), `/* Connaissances de l’assistant de ${f.nom} : uniquement les informations de la fiche du client, à relire avec lui. */\nwindow.QT_ASSISTANT_KB = ${JSON.stringify(kb, null, 2)};\n`);
  for (const x of ['assistant.js', 'assistant.css']) fs.copyFileSync(path.join(racine, 'assets', x), path.join(sortie, 'assets', x));
  h = h.replace('</head>', '<link rel="stylesheet" href="assets/assistant.css">\n</head>');
  h = h.replace('</body>', `<script src="assets/assistant-kb.js"></script>\n<script src="assets/assistant.js" defer data-nom="${String(f.nom).replace(/"/g, '&quot;')}"${f.telephone ? ` data-tel="${f.telephone}"` : ''} data-api="" data-lead="0"></script>\n</body>`);
  seoMsgs.push('assistant de site : relire avec le client les horaires, tarifs et réponses générés (assets/assistant-kb.js)');
}
/* Référencement local de base (option « Référencement local de base ») : si la fiche donne un « domaine », adresse canonique, balises de partage,
   données structurées LocalBusiness (nom, téléphone, adresse, horaires, zone), plan du site et robots.txt. Rien n'est inventé : champs absents = non écrits. */
if (f.domaine) {
  const url = 'https://' + String(f.domaine).replace(/^https?:\/\//, '').replace(/\/$/, '') + '/';
  const titre = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || '', desc = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
  if (titre.length > 60) seoMsgs.push(`titre de ${titre.length} caractères (60 maximum) : à raccourcir`);
  if (desc.length > 160) seoMsgs.push(`description de ${desc.length} caractères (160 maximum) : à raccourcir`);
  const ld = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: f.nom, url, description: desc || undefined, telephone: e164 || undefined, email: f.email || undefined,
    areaServed: f.ville || undefined, openingHours: Array.isArray(f.horaires) && f.horaires.length ? f.horaires : undefined,
    address: f.adresse && f.adresse.rue ? { '@type': 'PostalAddress', streetAddress: f.adresse.rue, postalCode: f.adresse.codePostal || undefined, addressLocality: f.ville || undefined, addressCountry: 'FR' } : undefined };
  const tete = `<link rel="canonical" href="${url}">\n<meta property="og:type" content="website">\n<meta property="og:title" content="${titre.replace(/"/g, '&quot;')}">\n<meta property="og:description" content="${desc}">\n<meta property="og:url" content="${url}">\n<meta property="og:locale" content="fr_FR">\n<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`;
  h = h.replace('</head>', tete + '</head>');
  fs.mkdirSync(sortie, { recursive: true });
  fs.writeFileSync(path.join(sortie, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${url}</loc><priority>1.0</priority></url>\n  <url><loc>${url}mentions-legales/</loc><priority>0.3</priority></url>\n</urlset>\n`);
  fs.writeFileSync(path.join(sortie, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${url}sitemap.xml\n`);
  if (!f.adresse) seoMsgs.push('pas d’adresse dans la fiche : les données LocalBusiness n’ont pas d’adresse (à ajouter si le client reçoit du public)');
  if (!Array.isArray(f.horaires) || !f.horaires.length) seoMsgs.push('pas d’horaires dans la fiche : non écrits dans les données structurées');
}
fs.writeFileSync(path.join(sortie, 'index.html'), h.split('../../assets/').join('assets/'));
for (const [src, dir] of [['legal', 'mentions-legales'], ['merci', 'merci']]) {
  fs.mkdirSync(path.join(sortie, dir), { recursive: true });
  let p = fs.readFileSync(path.join(tpl, src + '.html'), 'utf8');
  for (const [de, par] of remplacements) if (par) p = p.split(de).join(par);
  fs.writeFileSync(path.join(sortie, dir, 'index.html'), p.split('../../assets/').join('../assets/').split('../../').join('../'));
}

// Contrôle : champs restant à compléter, h1, images sans alt, contraste.
const reste = [];
fs.readFileSync(path.join(sortie, 'index.html'), 'utf8').split('\n').forEach((l, i) => {
  for (const m of l.matchAll(/\[[^\]=\[]{2,80}\]/g)) reste.push(`  ligne ${i + 1} : ${m[0]}`);
});
const h1 = (h.match(/<h1[\s>]/g) || []).length, sansAlt = (h.match(/<img\b[^>]*>/g) || []).filter(x => !/\balt=/.test(x)).length;
console.log(`Dossier créé : clients/${f.dossier}/ (modèle « ${f.modele} »)`);
console.log(`Contraste texte blanc sur ${accent} : ${contraste.toFixed(1)}:1 ${contraste >= 4.5 ? '(correct)' : '(INSUFFISANT : choisir une couleur plus foncée)'}`);
console.log(`Titres h1 : ${h1} ${h1 === 1 ? '(correct)' : '(il en faut exactement un)'} · images sans texte alternatif : ${sansAlt}`);
console.log(`À compléter dans index.html : ${reste.length} champ(s)`);
console.log(reste.slice(0, 60).join('\n'));
if (f.assistant) console.log('Assistant de site : bulle de discussion ajoutée (assets/assistant-kb.js), construite à partir de la fiche uniquement.');
if (f.domaine) { console.log(`Référencement local de base : adresse canonique, balises de partage, données LocalBusiness, sitemap.xml et robots.txt écrits pour ${f.domaine}.`); seoMsgs.forEach(m => console.log('  ⚠ ' + m)); }
console.log('Ensuite : Google Business Profile (fiche à créer par le client : je prépare les textes), Search Console (propriété à vérifier par le client) ; photos réelles, mentions légales (SIRET, hébergeur), aperçu sur 390 px et 1440 px, clair et sombre (design/CHECKLIST-CLIENT.md).');
