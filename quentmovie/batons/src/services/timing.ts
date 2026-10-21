// Temps de la vidéo : place chaque scène après la précédente, résout les mots déclencheurs en secondes.
// Fonctions pures (aucune dépendance Node ni navigateur), utilisées par la fabrication et par la démonstration.
import type { Mot, ProjetVideo, Script, SceneTimee } from '../types/projet';

export const INTRO = 3; // durée du carton d'ouverture, en secondes
export const PAUSE = 0.45; // respiration entre deux scènes
export const FORMAT = { largeur: 1920, hauteur: 1080, fps: 30 } as const;

export const normaliser = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%$€]+/g, ' ').trim();

/** Mots d'une narration avec des temps estimés (≈ 14 caractères par seconde, pauses aux ponctuations). */
export function motsEstimes(narration: string): Mot[] {
  const mots: Mot[] = [];
  let t = 0.15;
  for (const texte of narration.split(/\s+/).filter(Boolean)) {
    const d = 0.08 + texte.length * 0.062;
    mots.push({ texte, debut: +t.toFixed(3), fin: +(t + d).toFixed(3) });
    t += d + (/[.!?…]$/.test(texte) ? 0.35 : /[,;:]$/.test(texte) ? 0.15 : 0.04);
  }
  return mots;
}

/** Mots déclencheurs d'une scène (visuel + mot clé). */
export function declencheursDe(scene: Script['actes'][number]['scenes'][number]): string[] {
  const v = scene.visuel, out: string[] = [];
  if (v.type === 'flux') out.push(...v.flux.map((f) => f.motDeclencheur));
  if (v.type === 'empilement' && v.ecroulement) out.push(v.ecroulement);
  if (v.type === 'chiffre') out.push(v.motDeclencheur);
  if (scene.motCle) out.push(scene.motCle.motDeclencheur);
  return out;
}

/** Temps du premier passage de chaque déclencheur (un ou plusieurs mots) dans les mots prononcés. */
export function instantsDe(mots: Mot[], declencheurs: string[]): Record<string, number> {
  const normes = mots.map((m) => normaliser(m.texte));
  const out: Record<string, number> = {};
  for (const d of declencheurs) {
    const cible = normaliser(d).split(' ').filter(Boolean);
    if (!cible.length) continue;
    for (let i = 0; i + cible.length <= normes.length; i++) {
      if (cible.every((c, k) => normes[i + k] === c || (k === cible.length - 1 && normes[i + k].startsWith(c)))) {
        out[d] = mots[i].debut;
        break;
      }
    }
  }
  return out;
}

/** Ce qu'a donné la voix pour une scène : mots (temps locaux), durée parlée, fichier (dans public/) ou null. */
export interface VoixScene { mots: Mot[]; duree: number; audio: string | null }

/** Script + voix → projet complet prêt pour Remotion. */
export function assembler(
  id: string,
  script: Script,
  voix: VoixScene[],
  source: ProjetVideo['voix'],
): ProjetVideo {
  let t = INTRO, k = 0;
  const actes = script.actes.map((acte) => ({
    id: acte.id,
    etape: acte.etape,
    scenes: acte.scenes.map((s): SceneTimee => {
      const v = voix[k++];
      if (!v) throw new Error(`Voix manquante pour la scène ${s.id}`);
      const duree = +(Math.max(v.duree, 2.5) + PAUSE).toFixed(3);
      const scene: SceneTimee = {
        id: s.id, narration: s.narration, metaphore: s.metaphore, visuel: s.visuel, motCle: s.motCle,
        debut: +t.toFixed(3), duree, audio: v.audio, mots: v.mots, instants: instantsDe(v.mots, declencheursDe(s)),
      };
      t += duree;
      return scene;
    }),
  }));
  return {
    version: 1, id, titre: script.titre, accroche: script.accroche, personnage: script.personnage,
    format: { ...FORMAT }, voix: source, actes, sources: script.sources, duree: +(t + 1).toFixed(3),
  };
}

/** Projet sans voix (temps estimés) : pour la prévisualisation et les essais. */
export function projetEstime(id: string, script: Script): ProjetVideo {
  const voix = script.actes.flatMap((a) => a.scenes).map((s): VoixScene => {
    const mots = motsEstimes(s.narration);
    return { mots, duree: (mots[mots.length - 1]?.fin ?? 2) + 0.2, audio: null };
  });
  return assembler(id, script, voix, { source: 'estimation', voixId: null });
}

/** Déclencheurs introuvables dans la narration (le scénario est alors refusé et réécrit). */
export function declencheursAbsents(script: Script): string[] {
  const manquants: string[] = [];
  for (const s of script.actes.flatMap((a) => a.scenes)) {
    const trouves = instantsDe(motsEstimes(s.narration), declencheursDe(s));
    for (const d of declencheursDe(s)) if (trouves[d] === undefined) manquants.push(`${s.id} : « ${d} »`);
  }
  return manquants;
}
