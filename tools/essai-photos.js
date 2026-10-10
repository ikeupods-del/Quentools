// Contrôle de bout en bout de la lecture des photos (courriers et tickets) : génère des photos penchées et floues, puis les lit comme sur un téléphone.
// Prérequis hors dépôt : npm install --no-save tesseract.js@6.0.1 @tesseract.js-data/fra sharp ; Playwright (variable PW). Lancer : node tools/essai-photos.js
const { spawnSync } = require('child_process'), path = require('path');
let ko = 0;
for (const f of ['generer.js', 'courriers.js', 'tickets.js']) {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'photos', f)], { encoding: 'utf8', timeout: 900000 });
  process.stdout.write((r.stdout || '').split('\n').filter(l => /✗|courriers correctement|tickets bien lus/.test(l)).join('\n') + '\n');
  if (r.status || /✗/.test(r.stdout || '')) { ko++; if (r.stderr) process.stdout.write(r.stderr.slice(0, 600)); }
}
process.exit(ko ? 1 : 0);
