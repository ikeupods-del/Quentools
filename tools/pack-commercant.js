#!/usr/bin/env node
/* Pack Commerçant pour un client : réservation avec acompte, carte de fidélité, avis Google, espace commerçant.
   Copie demo/pack-commercant/ dans clients/<dossier>/site/ (jamais versionné), écrit sa fiche (config.js, sans bandeau de démonstration),
   les règles Firestore à coller (REGLES-FIRESTORE.txt) et la notice de livraison (LISEZMOI-LIVRAISON.txt).
   Usage : node tools/pack-commercant.js --exemple > fiche.json
           node tools/pack-commercant.js fiche.json */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..'), source = path.join(racine, 'demo', 'pack-commercant');
const regles = require(path.join(source, 'regles-firestore.js'));
const EXEMPLE = {
  dossier: 'atelier-lila', nom: 'Atelier Lila', metier: 'onglerie', ville: 'Nantes', accroche: 'Des mains soignées, sans attendre au téléphone.',
  couleur: '#b4436c', telephone: '06 12 34 56 78', email: 'contact@atelier-lila.fr', adresse: '12 rue des Lilas, 44000 Nantes',
  horaires: { 2: ['09:30-12:30', '14:00-19:00'], 3: ['09:30-12:30', '14:00-19:00'], 4: ['09:30-12:30', '14:00-19:00'], 5: ['09:30-19:00'], 6: ['09:00-17:00'] },
  pas: 30, delaiMin: 2, jours: 21,
  prestations: [{ id: 'semi', nom: 'Pose semi-permanent', duree: 60, prix: 35 }, { id: 'soin', nom: 'Soin des mains', duree: 30, prix: 20 }],
  acompte: { type: 'fixe', valeur: 10, lien: 'https://paypal.me/VotreCompte' },
  annulation: 'Annulation gratuite jusqu’à 24 h avant. Passé ce délai, l’acompte reste acquis.',
  fidelite: { tampons: 8, recompense: 'un soin des mains offert' },
  avis: { lien: 'https://g.page/r/VOTRE-LIEN/review' },
  firebase: { apiKey: '', projectId: '', authDomain: '' },
  admins: ['contact@atelier-lila.fr']
};
const arg = process.argv[2];
if (arg === '--exemple') { console.log(JSON.stringify(EXEMPLE, null, 2)); process.exit(0); }
if (!arg) { console.error('Usage : node tools/pack-commercant.js fiche.json | --exemple'); process.exit(1); }

const f = JSON.parse(fs.readFileSync(arg, 'utf8')), fautes = [], alertes = [];
for (const k of ['dossier', 'nom', 'couleur', 'telephone', 'prestations', 'horaires']) if (!f[k] || (Array.isArray(f[k]) && !f[k].length)) fautes.push(`champ obligatoire manquant : ${k}`);
if (f.dossier && !/^[a-z0-9-]+$/.test(f.dossier)) fautes.push('« dossier » : minuscules, chiffres et tirets uniquement');
if (f.couleur && !/^#[0-9a-f]{6}$/i.test(f.couleur)) fautes.push('« couleur » : code #rrggbb');
const pas = f.pas || 30;
for (const p of f.prestations || []) {
  if (!/^[a-z0-9-]+$/.test(p.id || '')) fautes.push(`prestation « ${p.nom} » : identifiant (id) en minuscules sans espace`);
  if (!(p.duree > 0) || p.duree % pas) fautes.push(`prestation « ${p.nom} » : durée multiple de ${pas} minutes`);
  if (!(p.prix >= 0)) fautes.push(`prestation « ${p.nom} » : prix manquant`);
}
for (const [j, plages] of Object.entries(f.horaires || {})) {
  if (!/^[1-7]$/.test(j)) fautes.push(`horaires : jour ${j} invalide (1 = lundi … 7 = dimanche)`);
  for (const pl of plages) if (!/^\d\d:\d\d-\d\d:\d\d$/.test(pl)) fautes.push(`horaires : plage « ${pl} » au format HH:MM-HH:MM`);
}
const a = f.acompte || {};
if (a.valeur && !/^https:\/\//.test(a.lien || '')) alertes.push('acompte sans lien de paiement : le client sera prévenu qu’on le recontacte');
if (a.valeur && a.lien && /VotreCompte|VOTRE/.test(a.lien)) fautes.push('lien de paiement de l’exemple à remplacer');
if (!/^https:\/\//.test((f.avis || {}).lien || '')) alertes.push('pas de lien d’avis Google : demandes d’avis et affiche désactivées');
else if (/VOTRE-LIEN/.test(f.avis.lien)) fautes.push('lien d’avis de l’exemple à remplacer');
const F = f.firebase || {};
if (!F.projectId || !F.apiKey) alertes.push('Firebase non renseigné : le site fonctionnera en démonstration (données dans le navigateur), à compléter avant la mise en ligne');
if (F.projectId && !(f.admins || []).length) fautes.push('« admins » : au moins une adresse Google pour l’espace commerçant');
if (fautes.length) { console.error('✗ Fiche incomplète :\n - ' + fautes.join('\n - ')); process.exit(1); }

const dossier = path.join(racine, 'clients', f.dossier), site = path.join(dossier, 'site');
fs.rmSync(site, { recursive: true, force: true });
const copie = (de, vers) => {
  for (const x of fs.readdirSync(de, { withFileTypes: true })) {
    const s = path.join(de, x.name), d = path.join(vers, x.name);
    if (x.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copie(s, d); }
    else if (x.name !== 'regles-firestore.js' && x.name !== 'README.md') {
      let t = fs.readFileSync(s);
      if (/\.html$/.test(x.name)) t = Buffer.from(String(t).replace(/(\.\.\/)+assets\//g, m => m.replace(/(\.\.\/){2}assets\//, 'assets/')));
      fs.writeFileSync(d, t);
    }
  }
};
fs.mkdirSync(site, { recursive: true }); copie(source, site);
fs.mkdirSync(path.join(site, 'assets', 'fonts'), { recursive: true });
fs.copyFileSync(path.join(racine, 'assets', 'qt.css'), path.join(site, 'assets', 'qt.css'));
for (const x of ['bricolage.woff2', 'inter.woff2', 'OFL-bricolage.txt', 'OFL-inter.txt']) fs.copyFileSync(path.join(racine, 'assets', 'fonts', x), path.join(site, 'assets', 'fonts', x));

const fiche = { demo: false, nom: f.nom, metier: f.metier || '', ville: f.ville || '', accroche: f.accroche || 'Réservez en ligne, à toute heure.', couleur: f.couleur,
  telephone: f.telephone, email: f.email || '', adresse: f.adresse || '', horaires: f.horaires, pas, delaiMin: f.delaiMin ?? 2, jours: f.jours || 21,
  prestations: f.prestations, acompte: { type: a.type === 'pourcent' ? 'pourcent' : 'fixe', valeur: a.valeur || 0, lien: a.lien || '' },
  annulation: f.annulation || '', fidelite: f.fidelite || { tampons: 8, recompense: 'une prestation offerte' }, avis: { lien: (f.avis || {}).lien || '' },
  firebase: { apiKey: F.apiKey || '', projectId: F.projectId || '', authDomain: F.authDomain || (F.projectId ? F.projectId + '.firebaseapp.com' : '') } };
fs.writeFileSync(path.join(site, 'config.js'), `/* Pack Commerçant — fiche de ${f.nom.replace(/\*\//g, '')} (générée par tools/pack-commercant.js). */\nwindow.PACK = ${JSON.stringify(fiche, null, 2)};\n`);
// Les pages du client sont indexables, sauf l'espace commerçant et l'affiche
for (const p of ['index.html', 'carte/index.html']) { const fp = path.join(site, p); fs.writeFileSync(fp, fs.readFileSync(fp, 'utf8').replace(/\s*<meta name="robots" content="noindex">/, '')); }
fs.writeFileSync(path.join(dossier, 'REGLES-FIRESTORE.txt'), regles(f.admins));
fs.writeFileSync(path.join(dossier, 'LISEZMOI-LIVRAISON.txt'), `Pack Commerçant — ${f.nom}

Contenu
- site/ : dossier à publier tel quel (GitHub Pages, Netlify, ou sous-dossier du site du client).
  Pages : accueil et réservation (index.html), carte de fidélité (carte/), espace commerçant (admin/), affiche d'avis à imprimer (affiche/).
- REGLES-FIRESTORE.txt : règles de sécurité à coller dans la console Firebase du client (Firestore → Règles → Publier).

Mise en service (une fois)
1. Projet Firebase gratuit au nom du client : activer Firestore (région europe-west) et Authentication → Google.
2. Coller REGLES-FIRESTORE.txt, publier. Ajouter l'adresse du site dans Authentication → Paramètres → Domaines autorisés.
3. Renseigner firebase.apiKey et firebase.projectId dans la fiche, relancer node tools/pack-commercant.js fiche.json.
4. Essai réel : réserver un créneau, payer l'acompte avec le lien, le marquer reçu dans l'espace commerçant, créer une carte et ajouter un tampon en scannant son QR code.

À expliquer au commerçant
- Acompte : le client paie par le lien ${a.lien ? '(' + a.lien + ')' : '(à fournir)'} ; le commerçant vérifie la réception dans son compte puis clique « Acompte reçu ». Il n'y a pas de confirmation automatique du paiement.
- Rappels et demandes d'avis : boutons WhatsApp ou SMS qui préparent le message depuis son téléphone ; rien n'est envoyé automatiquement.
- Avis Google : proposer la demande à tous les clients, sans les choisir.
- Fidélité : scanner le QR code de la carte du client avec l'appareil photo du téléphone connecté à l'espace commerçant, puis « Ajouter un tampon ».
- Données des clients : nom, téléphone, e-mail, seulement pour gérer les rendez-vous ; le commerçant est responsable du traitement (mentions à ajouter sur son site).
`);
console.log(`✓ Pack Commerçant prêt : clients/${f.dossier}/site/ (+ REGLES-FIRESTORE.txt, LISEZMOI-LIVRAISON.txt)`);
for (const x of alertes) console.log('  ! ' + x);
