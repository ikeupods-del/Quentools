// Lance tous les essais l'un après l'autre (npm test), chacun avec une durée maximale : un essai bloqué est arrêté
// (lui et ses processus) et nommé, au lieu de bloquer la construction de l'application. QM_ESSAI_MAX_MIN : durée maximale en minutes.
'use strict';
const { spawn } = require('child_process'), path = require('path');
const ESSAIS = ['paquet', 'run', 'export', 'maj', 'compositeur', 'generateur', 'parole', 'pistes', 'cadrage', 'ia', 'assistant', 'voix', 'doublage', 'voix-clone', 'prononciations', 'fiche', 'idees', 'publication', 'pico', 'animations', 'montage', 'chapitrage', 'banques', 'packs', 'ui', 'fenetres', 'retours', 'projets', 'parcours'];
const MAX = (+process.env.QM_ESSAI_MAX_MIN || 25) * 60000, choisis = process.argv.slice(2);
(async () => {
  for (const nom of ESSAIS.filter(n => !choisis.length || choisis.includes(n))) {
    const t0 = Date.now();
    const code = await new Promise(ok => {
      const p = spawn(process.execPath, [path.join(__dirname, nom + '.js')], { stdio: 'inherit', detached: true });
      const minuterie = setTimeout(() => { console.error(`\n✗ ${nom}.js dépasse ${MAX / 60000} min : arrêté.`); try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { p.kill('SIGKILL'); } }, MAX);
      p.on('exit', (c, s) => { clearTimeout(minuterie); ok(c == null ? 1 : c); });
    });
    console.log(`— ${nom}.js : ${code ? 'échec' : 'ok'} en ${Math.round((Date.now() - t0) / 1000)} s`);
    if (code) process.exit(code);
  }
})();
