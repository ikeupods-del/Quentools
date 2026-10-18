// Pico — récupère une image libre de droits de Wikimedia Commons avec son crédit, pour l'utiliser en fond d'un bloc (clé `fond`).
//   node medias.js commons "Nom_du_fichier.jpg" nom-court        → medias/nom-court.jpg + medias/nom-court.json (crédit, licence)
// Refuse tout fichier dont la licence n'est pas libre (domaine public, CC0, CC BY, CC BY-SA) ou ne peut pas être vérifiée ; le crédit est repris automatiquement dans la fiche :
//   "fond": { "fichier": "nom-court.jpg", "credit": "<contenu de medias/nom-court.json → credit>" }
// Les interfaces de Wikimedia limitent les appels répétés depuis certains serveurs (erreur 429) : relancer plus tard, ou lancer la commande depuis le Mac.
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const [, , source, titre, nom] = process.argv;
if (source !== 'commons' || !titre || !nom) { console.log('Usage : node medias.js commons "Nom_du_fichier.jpg" nom-court'); process.exit(1); }
const UA = 'QuentInvestBot/1.0 (educational video project; https://github.com/ikeupods-del/Quentools)', DOSSIER = path.join(__dirname, '..', 'medias');
const curl = (url, sortie) => execFileSync('curl', ['-sSL', '-m', '60', '-A', UA, ...(sortie ? ['-o', sortie] : []), url], { encoding: 'utf8', maxBuffer: 5e7 });
const titreFichier = titre.replace(/^(File|Fichier):/i, '').replace(/ /g, '_');
let info;
try {
  const r = curl(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent('File:' + titreFichier)}`);
  info = Object.values(JSON.parse(r).query.pages)[0].imageinfo[0].extmetadata;
} catch (e) { console.error('Licence non vérifiable (Wikimedia a refusé ou limité la demande) : image non récupérée. Réessayer plus tard.'); process.exit(2); }
const licence = (info.LicenseShortName || {}).value || '', auteur = ((info.Artist || {}).value || 'auteur inconnu').replace(/<[^>]+>/g, '').trim();
if (!/^(public domain|pd|cc0|cc by|cc-by)/i.test(licence)) { console.error(`Licence non autorisée : « ${licence} ». Seuls le domaine public, CC0, CC BY et CC BY-SA sont acceptés.`); process.exit(3); }
fs.mkdirSync(DOSSIER, { recursive: true });
const fichier = path.join(DOSSIER, nom + (path.extname(titreFichier).toLowerCase() || '.jpg'));
curl(`https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(titreFichier)}?width=1920`, fichier);
const credit = `${auteur}, ${licence}, Wikimedia Commons`;
fs.writeFileSync(path.join(DOSSIER, nom + '.json'), JSON.stringify({ source: 'commons', fichier: titreFichier, licence, credit }, null, 1) + '\n');
console.log(`${fichier}\ncrédit : ${credit}`);
