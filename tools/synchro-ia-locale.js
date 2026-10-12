/* Copie l'IA locale partagée (marketing/ia-locale/) dans chaque outil privé qui l'utilise : node tools/synchro-ia-locale.js [--verifier]
   Les copies sont des fichiers générés : on modifie toujours la source, jamais la copie.
   --verifier : n'écrit rien, échoue si une copie diffère de la source. */
const fs = require('fs'), path = require('path');
const racine = path.join(__dirname, '..', 'marketing'), source = path.join(racine, 'ia-locale');
const destinations = ['generateur-posts', 'studio-sites'], fichiers = ['ia-locale.js', 'ia-worker.js', 'nouvelle-version.js'];
const verifier = process.argv.includes('--verifier');
let ecart = 0;
for (const d of destinations) {
  const dir = path.join(racine, d); if (!fs.existsSync(dir)) continue;
  for (const f of fichiers) {
    const src = fs.readFileSync(path.join(source, f), 'utf8'), cible = path.join(dir, f);
    if (verifier) { if (!fs.existsSync(cible) || fs.readFileSync(cible, 'utf8') !== src) { console.log('Différent : ' + path.relative(path.join(racine, '..'), cible)); ecart++; } }
    else { fs.writeFileSync(cible, src); console.log('copié : ' + path.relative(path.join(racine, '..'), cible)); }
  }
}
process.exit(ecart ? 1 : 0);
