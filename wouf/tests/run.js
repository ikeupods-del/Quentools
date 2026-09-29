'use strict';
/* `npm test` : contrôles statiques → tests du relais → tests de bout en bout. Le premier échec arrête tout. */
const { spawnSync } = require('child_process'), path = require('path');
const steps = [['Contrôles statiques', ['tests/check.js']], ['Relais de paiement', ['--test', 'tests/unit/worker.test.mjs']], ['Bout en bout (navigateur)', ['tests/e2e.js']]];
for (const [name, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const r = spawnSync(process.execPath, args, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
  if (r.status !== 0) { console.error(`\n✗ Échec : ${name}. Ne publiez pas avant correction.`); process.exit(r.status || 1); }
}
console.log('\n✓ Tout est vert : vous pouvez publier.');
