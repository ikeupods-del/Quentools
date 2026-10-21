// Rendu MP4 (ou images d'essai) d'un projet.
//   npm run demo                                   → out/demo-crise-2008.mp4 (sans voix, temps estimés)
//   npm run rendu -- public/projets/<id>/projet.json  → out/<id>.mp4
//   … --images 90,400,800                          → images PNG de contrôle au lieu de la vidéo
//   … --sortie ~/Movies/QuentMovie/exports/x.mp4   → autre emplacement
import { bundle } from '@remotion/bundler';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO } from '../demo/crise2008';
import type { ProjetVideo } from '../types/projet';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function option(nom: string): string | null {
  const i = process.argv.indexOf(`--${nom}`);
  return i > 0 ? process.argv[i + 1] ?? null : null;
}

/** Chromium déjà installé (variable REMOTION_CHROME), sinon Remotion utilise ou télécharge le sien. */
const navigateur = () => process.env.REMOTION_CHROME || null;

export async function rendre(projet: ProjetVideo, sortie: string, images: number[] | null = null) {
  console.log('Préparation du rendu…');
  const serveUrl = await bundle({ entryPoint: path.join(RACINE, 'src/index.ts'), publicDir: path.join(RACINE, 'public') });
  const inputProps = { projet };
  const composition = await selectComposition({ serveUrl, id: 'EcoVideo', inputProps, browserExecutable: navigateur() });
  mkdirSync(path.dirname(sortie), { recursive: true });

  if (images) {
    for (const frame of images) {
      const fichier = sortie.replace(/\.mp4$/, '') + `-${frame}.png`;
      await renderStill({ serveUrl, composition, inputProps, frame, output: fichier, browserExecutable: navigateur() });
      console.log(`Image ${frame} → ${fichier}`);
    }
    return;
  }
  let dernier = -1;
  await renderMedia({
    serveUrl, composition, inputProps, codec: 'h264', outputLocation: sortie, browserExecutable: navigateur(),
    imageFormat: 'jpeg', jpegQuality: 92,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 10);
      if (p !== dernier) { dernier = p; console.log(`Rendu ${p * 10} %`); }
    },
  });
  console.log(`Vidéo prête : ${sortie}`);
}

async function principal() {
  const demo = process.argv.includes('--demo');
  const fichier = process.argv.slice(2).find((a) => a.endsWith('.json'));
  if (!demo && !fichier) {
    console.log('Usage : npm run rendu -- public/projets/<id>/projet.json   (ou npm run demo)');
    process.exit(2);
  }
  if (fichier && !existsSync(fichier)) throw new Error(`Projet introuvable : ${fichier}`);
  const projet: ProjetVideo = demo ? DEMO : JSON.parse(readFileSync(fichier!, 'utf8'));
  const sortie = option('sortie') ?? path.join(RACINE, 'out', `${projet.id}.mp4`);
  const images = option('images')?.split(',').map(Number).filter((n) => Number.isFinite(n)) ?? null;
  await rendre(projet, path.resolve(sortie), images);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  principal().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
}
