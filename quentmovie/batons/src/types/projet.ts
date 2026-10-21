// Schéma d'un projet vidéo « en bâtons ».
// Deux niveaux :
//  - ScriptSchema : ce que le scénariste écrit (texte, actes, scènes, visuels, métaphores), sans aucun temps ;
//  - ProjetVideo : le script + la voix + les temps (scène, mot, déclencheurs), lu tel quel par Remotion.
// Les visuels déclenchent leurs animations sur un mot de la narration (« motDeclencheur ») :
// le temps exact est résolu après la voix (services/timing.ts), le scénariste n'écrit jamais de seconde.
import * as z from 'zod/v4';

export const HUMEURS = ['neutre', 'joie', 'peur', 'triste', 'surpris', 'malin'] as const;
export const GENRES_ACTEUR = ['personne', 'famille', 'banque', 'agence', 'investisseur', 'etat', 'entreprise'] as const;
export const OBJETS_FLUX = ['billet', 'sac', 'maison', 'paquet', 'document'] as const;
export const TONS = ['danger', 'gain', 'neutre'] as const;

const Acteur = z.object({
  id: z.string().describe('identifiant court, ex. "famille", "banque"'),
  genre: z.enum(GENRES_ACTEUR),
  nom: z.string().describe('étiquette affichée sous le personnage, 1 à 3 mots'),
  humeur: z.enum(HUMEURS),
});

const Declencheur = z.string().describe('un mot exact de la narration de la scène ; l’animation part quand il est prononcé');

const VisuelPersonnages = z.object({
  type: z.literal('personnages'),
  acteurs: z.array(Acteur).describe('1 à 3 personnages côte à côte'),
  bulle: z.string().nullable().describe('courte phrase dite par le premier personnage, ou null'),
});

const VisuelFlux = z.object({
  type: z.literal('flux'),
  acteurs: z.array(Acteur).describe('2 à 4 acteurs reliés de gauche à droite'),
  flux: z.array(z.object({
    de: z.string().describe('id de l’acteur de départ'),
    vers: z.string().describe('id de l’acteur d’arrivée'),
    objet: z.enum(OBJETS_FLUX),
    libelle: z.string().nullable().describe('texte sur la flèche, ex. "prêt 200 000 $", ou null'),
    motDeclencheur: Declencheur,
  })),
});

const VisuelEmpilement = z.object({
  type: z.literal('empilement'),
  titre: z.string().describe('nom du paquet, ex. "CDO"'),
  briques: z.array(z.object({
    libelle: z.string().describe('1 à 3 mots'),
    risque: z.enum(['sain', 'douteux', 'toxique']),
  })).describe('3 à 7 briques, de bas en haut'),
  note: z.string().nullable().describe('étiquette collée sur le paquet, ex. "Triple A", ou null'),
  ecroulement: Declencheur.nullable().describe('mot qui fait s’écrouler la pile, ou null si elle tient'),
});

const VisuelCourbe = z.object({
  type: z.literal('courbe'),
  titre: z.string(),
  points: z.array(z.number()).describe('6 à 14 valeurs dans l’ordre du temps'),
  cassure: z.number().nullable().describe('indice du point où la courbe plonge, ou null'),
  unite: z.string().describe('ex. "$", "%", "points"'),
  debut: z.string().describe('étiquette de l’axe à gauche, ex. "2000"'),
  fin: z.string().describe('étiquette de l’axe à droite, ex. "2008"'),
});

const VisuelChiffre = z.object({
  type: z.literal('chiffre'),
  valeur: z.string().describe('le chiffre tel qu’affiché, ex. "700 milliards $"'),
  legende: z.string(),
  ton: z.enum(TONS),
  motDeclencheur: Declencheur,
});

export const VisuelSchema = z.discriminatedUnion('type', [
  VisuelPersonnages, VisuelFlux, VisuelEmpilement, VisuelCourbe, VisuelChiffre,
]);

const SceneScript = z.object({
  id: z.string(),
  narration: z.string().describe('ce que dit la voix : 1 à 3 phrases courtes'),
  metaphore: z.string().describe('l’image concrète utilisée (ex. "un panier de pommes dont certaines sont pourries")'),
  visuel: VisuelSchema,
  motCle: z.object({
    texte: z.string().describe('mot ou chiffre isolé à l’écran, ex. "1 %"'),
    ton: z.enum(TONS),
    motDeclencheur: Declencheur,
  }).nullable(),
});

export const ScriptSchema = z.object({
  titre: z.string(),
  accroche: z.string().describe('la question du début, ex. "Comment une maison a-t-elle fait tomber le monde ?"'),
  personnage: z.object({
    nom: z.string().describe('prénom du fil conducteur'),
    role: z.string().describe('ex. "plombier qui rêve d’une maison"'),
  }),
  actes: z.array(z.object({
    id: z.string(),
    etape: z.string().describe('bannière, ex. "Étape 1 : Le prêt"'),
    scenes: z.array(SceneScript),
  })),
  sources: z.array(z.string()).describe('faits sur lesquels s’appuie le script (organisme, année)'),
});

export type Script = z.infer<typeof ScriptSchema>;
export type Visuel = z.infer<typeof VisuelSchema>;
export type ActeurDef = z.infer<typeof Acteur>;
export type Humeur = (typeof HUMEURS)[number];
export type Ton = (typeof TONS)[number];

// ——— Projet complet (après la voix) ———

/** Un mot prononcé, en secondes depuis le début de SA scène. */
export interface Mot { texte: string; debut: number; fin: number }

export interface SceneTimee {
  id: string;
  narration: string;
  metaphore: string;
  visuel: Visuel;
  motCle: Script['actes'][number]['scenes'][number]['motCle'];
  /** Début de la scène dans la vidéo, en secondes. */
  debut: number;
  duree: number;
  /** Fichier de voix de la scène (dans public/), ou null pour une vidéo muette. */
  audio: string | null;
  mots: Mot[];
  /** Temps (secondes depuis le début de la scène) de chaque mot déclencheur, clé = mot tel qu'écrit. */
  instants: Record<string, number>;
}

export interface ProjetVideo {
  version: 1;
  id: string;
  titre: string;
  accroche: string;
  personnage: Script['personnage'];
  format: { largeur: number; hauteur: number; fps: number };
  voix: { source: 'elevenlabs' | 'enregistrement' | 'estimation'; voixId: string | null };
  actes: { id: string; etape: string; scenes: SceneTimee[] }[];
  sources: string[];
  duree: number;
}
