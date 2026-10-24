// Pax Mythica — allège les modèles Poly Haven (ressources/modeles/<nom>/<nom>.gltf, souvent plus de 100 000 triangles)
// en modèles de jeu (ressources/jeu/<nom>.glb) : maillage simplifié au nombre de triangles voulu, textures réduites et intégrées.
// Lancer depuis un dossier où @gltf-transform/core, @gltf-transform/functions, meshoptimizer et sharp sont installés :
//   NODE_PATH=<dossier>/node_modules node scripts/modeles-jeu.mjs
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(path.join(process.env.NODE_PATH || '.', 'x.js'));
const { NodeIO } = require('@gltf-transform/core');
const { weld, simplify, dedup, prune, textureCompress, join, flatten } = require('@gltf-transform/functions');
const { MeshoptSimplifier } = require('meshoptimizer');
const sharp = require('sharp');

const RACINE = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'ressources');
// triangles visés et taille des textures de chaque modèle
const CIBLES = {
  rocher1: [1600, 512], rocher2: [1600, 512], rocher3: [1200, 512], rocher4: [1200, 512], 'rochers-mousse': [2400, 512],
  souche: [1200, 512], 'tronc-mort': [1800, 512], tonneau: [500, 256], tonneaux: [1400, 512], caisse: [400, 256],
  jarre: [500, 256], panier: [700, 256], bouclier: [400, 256], canon: [1400, 512], navire: [7000, 1024]
};
const io = new NodeIO();
await MeshoptSimplifier.ready;
fs.mkdirSync(path.join(RACINE, 'jeu'), { recursive: true });
const bilan = {};
for (const [nom, [cible, tex]] of Object.entries(CIBLES)) {
  const src = path.join(RACINE, 'modeles', nom, nom + '.gltf');
  if (!fs.existsSync(src)) { console.log('absent', nom); continue; }
  const doc = await io.read(src);
  const tris = () => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
  const avant = tris();
  await doc.transform(dedup(), flatten(), join(), weld({ tolerance: 0.0001 }));
  for (let ratio = Math.min(1, cible / avant), essai = 0; essai < 6 && tris() > cible * 1.15; essai++, ratio *= 0.7)
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.02 * (essai + 1), lockBorder: false }));
  await doc.transform(prune(), textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [tex, tex], quality: 86 }));
  // textures avec transparence : gardées en png
  await io.write(path.join(RACINE, 'jeu', nom + '.glb'), doc);
  bilan[nom] = { avant: Math.round(avant), apres: Math.round(tris()), octets: fs.statSync(path.join(RACINE, 'jeu', nom + '.glb')).size };
  console.log(nom, bilan[nom]);
}
fs.writeFileSync(path.join(RACINE, 'jeu', 'bilan.json'), JSON.stringify(bilan, null, 1));
