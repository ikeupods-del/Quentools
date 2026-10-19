// Fenêtres cachées (rendu hors écran d'Electron) qui dessinent les écrans animés de Pico image par image pour la fabrication des épisodes.
// Même rôle que le Chromium de Playwright, sans rien installer : interface utilisée par la route /api/navigateur du moteur.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');

function creer(BrowserWindow) {
  const fenetres = new Map(); let n = 0;
  const de = id => { const f = fenetres.get(+id); if (!f) throw new Error('Page des écrans fermée'); return f; };
  return {
    async ouvrir(largeur, hauteur) {
      const w = new BrowserWindow({ show: false, width: largeur, height: hauteur, useContentSize: true, frame: false, transparent: true, backgroundColor: '#00000000', enableLargerThanScreen: true,
        webPreferences: { offscreen: true, sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
      w.setContentSize(largeur, hauteur);
      const id = ++n; fenetres.set(id, { w, largeur, hauteur, fichier: path.join(os.tmpdir(), `qm-ecran-${process.pid}-${id}.html`) });
      return id;
    },
    async contenu(id, html) { const f = de(id); fs.writeFileSync(f.fichier, html); await f.w.loadFile(f.fichier); },
    evaluer: (id, code) => de(id).w.webContents.executeJavaScript(code, false),
    async capture(id, chemin) {
      const f = de(id), wc = f.w.webContents;
      wc.invalidate(); // rendu hors écran : l'image suivante est redessinée après le dernier réglage de l'animation
      await wc.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))', false);
      let img = await wc.capturePage();
      for (let essai = 0; img.isEmpty() && essai < 5; essai++) { wc.invalidate(); await new Promise(r => setTimeout(r, 50)); img = await wc.capturePage(); } // image pas encore dessinée : on attend la suivante
      if (img.isEmpty()) throw new Error('Écran non dessiné');
      const t = img.getSize();
      if (t.width !== f.largeur || t.height !== f.hauteur) img = img.resize({ width: f.largeur, height: f.hauteur, quality: 'best' }); // écran Retina : image ramenée à la taille demandée
      fs.writeFileSync(chemin, img.toPNG());
    },
    async fermer(id) { const f = fenetres.get(+id); if (!f) return; fenetres.delete(+id); if (!f.w.isDestroyed()) f.w.destroy(); fs.rmSync(f.fichier, { force: true }); }
  };
}

module.exports = { creer };
