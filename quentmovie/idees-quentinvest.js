// Banque d'idées QuentInvest : une centaine de scripts prêts à lire (histoires de la Bourse, produits d'épargne expliqués, notions
// d'économie), rangés par thème dans quentinvest-idees/*.txt. Un fichier commence par « @theme Nom » ; ses scripts sont séparés par une
// ligne « === » et suivent le format « ✍️ J'écris mon texte » (ficheDepuisScript) : # Titre, accroche, titres de partie, listes « - »,
// « En une phrase : … » suivi de la question, puis « Sources : … » (chaque chiffre dit y figure).
// Usage : node idees-quentinvest.js                       liste des idées (identifiant, durée, titre)
//         node idees-quentinvest.js <id>                  affiche le script
//         node idees-quentinvest.js <id> --fiche <dossier> écrit la fiche NN-sujet.json (pour episode.js ou lot.js)
'use strict';
const fs = require('fs'), path = require('path');
const DOSSIER = path.join(__dirname, 'quentinvest-idees');
const nbMots = t => (String(t || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;

function charger(dossier = DOSSIER) {
  const themes = [];
  let fichiers = []; try { fichiers = fs.readdirSync(dossier).filter(x => /\.txt$/.test(x)).sort(); } catch (e) { return themes; }
  for (const n of fichiers) {
    const brut = fs.readFileSync(path.join(dossier, n), 'utf8').replace(/\r/g, ''), m = /^@theme\s+(.+)$/m.exec(brut), cle = n.replace(/\.txt$/, '');
    const idees = brut.replace(/^@theme.*$/m, '').split(/^===\s*$/m).map(s => s.trim()).filter(Boolean).map((texte, k) => {
      const lignes = texte.split('\n'), titre = ((/^#\s+(.+)$/m.exec(texte) || [])[1] || `Idée ${k + 1}`).trim();
      const dit = lignes.filter(l => l.trim() && !/^#/.test(l.trim()) && !/^sources?\s*:/i.test(l.trim()) && !/^S\d+\s*·/.test(l.trim()));
      const accroche = (texte.split(/\n\s*\n/).map(p => p.trim()).find(p => p && !/^#/.test(p)) || '').replace(/\s+/g, ' ');
      const mots = nbMots(dit.join(' '));
      return { id: `${cle.replace(/^(\d+).*/, '$1')}-${String(k + 1).padStart(2, '0')}`, theme: m ? m[1].trim() : cle, titre, accroche, mots, minutes: Math.round(mots * 0.46 * 0.78 / 0.82 / 6) / 10, texte };
    });
    themes.push({ nom: m ? m[1].trim() : cle, idees });
  }
  return themes;
}
const toutes = dossier => charger(dossier).flatMap(t => t.idees);

module.exports = { charger, toutes, DOSSIER };

if (require.main === module) {
  const [, , id, opt, dest] = process.argv, l = toutes();
  if (!id) { for (const t of charger()) { console.log(`\n${t.nom}`); for (const x of t.idees) console.log(`  ${x.id}  ${String(x.minutes).replace('.', ',')} min  ${x.titre}`); } console.log(`\n${l.length} idées.`); process.exit(0); }
  const x = l.find(y => y.id === id); if (!x) { console.log(`Idée « ${id} » inconnue (liste : node idees-quentinvest.js).`); process.exit(1); }
  if (opt !== '--fiche') { console.log(x.texte); process.exit(0); }
  const dossier = path.resolve(dest || path.join(__dirname, '..', 'design', 'quentinvest-youtube', 'fiches'));
  let max = 0; try { for (const n of fs.readdirSync(dossier)) { const k = /^(\d{1,3})-/.exec(n); if (k) max = Math.max(max, +k[1]); } } catch (e) { fs.mkdirSync(dossier, { recursive: true }); }
  const fiche = require('./fiche-quentinvest').ficheDepuisScript(x.texte, { numero: max + 1 }), f = path.join(dossier, `${String(fiche.numero).padStart(2, '0')}-${fiche.slug}.json`);
  fs.writeFileSync(f, JSON.stringify(fiche, null, 1) + '\n'); console.log(`Fiche écrite : ${f}`);
}
