// Routes des animations (animations.js) : catalogue, aperçu d'une image, rendu complet image par image dans les fenêtres cachées,
// puis assemblage par FFmpeg : vidéo opaque (MP4) pour un générique, vidéo transparente (QuickTime Animation) pour un calque.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFile } = require('child_process');
const NON = Symbol('non traité');
const FPS = 30;

function creer({ MEDIAS, FFMPEG, opts, send, readJson, travail }) {
  const A = require('./animations');
  const nav = () => opts.navigateur || null;
  let police = null; // police Inter des écrans de Pico, intégrée à la page (aucune police externe)
  const policeData = () => {
    if (police !== null) return police;
    try { const RP = require('./routes-pico'), pico = RP.dossierPico(opts), f = pico && [path.join(pico, '..', '..', 'assets', 'fonts', 'inter.woff2'), path.join(pico, 'assets', 'fonts', 'inter.woff2')].find(x => fs.existsSync(x)); police = f ? 'data:font/woff2;base64,' + fs.readFileSync(f).toString('base64') : ''; } catch (e) { police = ''; }
    return police;
  };
  const dims = f => A.DIMENSIONS[f] || A.DIMENSIONS.horizontal;
  const ffmpeg = args => new Promise((ok, ko) => execFile(FFMPEG, args, { maxBuffer: 1e8 }, (e, o, err) => (e ? ko(new Error(String(err || e.message).split('\n').filter(Boolean).slice(-2).join(' '))) : ok())));
  async function avecPage(largeur, hauteur, html, fn) {
    const N = nav(); if (!N) throw new Error('Les animations se fabriquent dans l’application QuentMovie du Mac.');
    const id = await N.ouvrir(largeur, hauteur);
    try { await N.contenu(id, html); await N.evaluer(id, 'window.PRET'); return await fn(N, id); } finally { await N.fermer(id).catch(() => {}); }
  }
  return async function traiter(req, res, p) {
    if (!p.startsWith('/api/animations')) return NON;
    if (req.method === 'GET' && p === '/api/animations') return send(res, 200, { modeles: A.catalogue(), pret: !!nav() });
    if (req.method === 'POST' && p === '/api/animations/apercu') { // une image prise aux deux tiers de l'animation, en petit
      const b = await readJson(req), { modele, html } = A.pageDe(String(b.id || ''), b.valeurs || {}, policeData()), [L, H] = dims(b.format);
      const k = 480 / Math.max(L, H), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-anim-')), png = path.join(dir, 'a.png');
      try {
        await avecPage(Math.round(L * k), Math.round(H * k), html, async (N, id) => { await N.evaluer(id, `window.setT(${(modele.duree * 0.66).toFixed(2)})`); await N.capture(id, png, modele.type === 'calque'); });
        return send(res, 200, { image: 'data:image/png;base64,' + fs.readFileSync(png).toString('base64'), type: modele.type });
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    if (req.method === 'POST' && p === '/api/animations/rendre') {
      const b = await readJson(req), { modele, html } = A.pageDe(String(b.id || ''), b.valeurs || {}, policeData()), [L, H] = dims(b.format);
      if (!nav()) throw new Error('Les animations se fabriquent dans l’application QuentMovie du Mac.');
      return send(res, 200, travail(async job => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qm-anim-')), n = Math.round(modele.duree * FPS), transp = modele.type === 'calque';
        try {
          job.step = 'Dessin de l’animation';
          await avecPage(L, H, html, async (N, id) => {
            for (let k = 0; k < n; k++) {
              if (job.annule) throw new Error('Animation annulée.');
              await N.evaluer(id, `window.setT(${(k / FPS).toFixed(4)})`); await N.capture(id, path.join(dir, `i${String(k).padStart(4, '0')}.png`), transp);
              job.progress = 0.9 * (k + 1) / n;
            }
          });
          job.step = 'Assemblage';
          const nom = `animation-${modele.id}-${Date.now().toString(36)}.${transp ? 'mov' : 'mp4'}`;
          // calque : QuickTime Animation, transparence gardée et fichier léger (grandes zones vides) ; générique : H.264
          await ffmpeg(['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'i%04d.png'), ...(transp ? ['-c:v', 'qtrle', '-pix_fmt', 'argb'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']), path.join(MEDIAS, nom)]);
          return { file: nom, type: modele.type, duree: n / FPS, id: modele.id };
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }));
    }
    return NON;
  };
}

module.exports = { creer, NON };
