// Charte « bâtons » : papier mat, encre, trois couleurs d'accent seulement.
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';
import type { Ton } from '../../../types/projet';

export const C = {
  papier: '#F4EFEA',
  papierOmbre: '#E8E0D6',
  encre: '#1E2433',
  encreDouce: '#5B6070',
  brique: '#B5462F',
  sauge: '#7C9A7E',
  bleuNuit: '#2B3A55',
  surligne: '#F2C14E',
} as const;

export const POLICE = 'Inter';
/** À appeler une fois côté rendu (Root.tsx) : Remotion attend la police avant de dessiner la première image. */
export const chargerPolice = () => loadFont({ family: POLICE, url: staticFile('fonts/inter.woff2'), weight: '100 900' });

export const couleurTon = (ton: Ton) => (ton === 'danger' ? C.brique : ton === 'gain' ? C.sauge : C.bleuNuit);

export const TRAIT = { epais: 7, moyen: 5, fin: 3.5 } as const;
