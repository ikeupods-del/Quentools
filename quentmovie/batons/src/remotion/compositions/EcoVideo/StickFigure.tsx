// Bonhomme bâton : tête ronde, corps en un trait, bras et jambes en deux segments.
// L'humeur change la pose, la bouche et le mouvement (sautille de joie, tremble de peur, s'affaisse de tristesse).
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Humeur } from '../../../types/projet';
import { C, TRAIT } from './theme';
import { cercle, graine, main, segment, type Pt } from './trait';

export interface StickFigureProps {
  id: string;
  /** Position des pieds (centre), en pixels de la vidéo. */
  x: number;
  y: number;
  echelle?: number;
  humeur?: Humeur;
  /** Image (dans la séquence) où le personnage apparaît par un « pop » doux. */
  apparition?: number;
  /** Petit chapeau pour distinguer un investisseur. */
  chapeau?: boolean;
  /** Le bonhomme regarde à gauche (-1) ou à droite (1). */
  sens?: 1 | -1;
}

// Bras : [coude, main] par rapport à l'épaule (0, 0) ; vers le haut = y négatif.
const BRAS: Record<Humeur, { g: [Pt, Pt]; d: [Pt, Pt] }> = {
  neutre: { g: [[-22, 34], [-30, 70]], d: [[22, 34], [30, 70]] },
  joie: { g: [[-30, -20], [-44, -58]], d: [[30, -20], [44, -58]] },
  peur: { g: [[-34, -6], [-22, -46]], d: [[34, -6], [22, -46]] },
  triste: { g: [[-12, 38], [-14, 78]], d: [[12, 38], [14, 78]] },
  surpris: { g: [[-38, 6], [-66, -6]], d: [[38, 6], [66, -6]] },
  malin: { g: [[-22, 34], [-30, 70]], d: [[40, 0], [78, -14]] },
};

const BOUCHE: Record<Humeur, string> = {
  neutre: 'M -9 12 L 9 12',
  joie: 'M -12 8 Q 0 22 12 8',
  peur: 'M -7 14 Q 0 4 7 14 Q 0 20 -7 14',
  triste: 'M -11 17 Q 0 6 11 17',
  surpris: 'M -5 13 Q 0 5 5 13 Q 0 21 -5 13',
  malin: 'M -10 10 Q 4 18 12 6',
};

export const StickFigure: React.FC<StickFigureProps> = ({
  id, x, y, echelle = 1, humeur = 'neutre', apparition = 0, chapeau = false, sens = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - apparition;
  if (t < 0) return null;

  const pop = spring({ frame: t, fps, config: { damping: 11, stiffness: 140, mass: 0.6 } });
  const g = graine(id, frame);

  // Mouvement selon l'humeur, toujours discret.
  const saut = humeur === 'joie' ? -Math.abs(Math.sin(t / 5)) * 14 : 0;
  const tremble = humeur === 'peur' ? Math.sin(t * 1.9) * 2.2 : 0;
  const affaisse = humeur === 'triste' ? 8 : 0;
  const respire = Math.sin(t / 14) * 1.5;

  const tete: Pt = [0, -205 + affaisse], cou: Pt = [0, -172 + affaisse];
  const bassin: Pt = [0, -80], epaule: Pt = [0, -150 + affaisse + respire];
  const b = BRAS[humeur];
  const brasPts = (side: [Pt, Pt]) => [epaule, [side[0][0], epaule[1] + side[0][1]] as Pt, [side[1][0], epaule[1] + side[1][1]] as Pt];
  const jambe = (s: number): Pt[] => [bassin, [s * 18, -40], [s * 26, 0]];

  // Clignement des yeux toutes les ~3 s.
  const cligne = (t + id.length * 13) % 90 < 4;
  const yeuxY = tete[1] - 4;

  return (
    <g transform={`translate(${x + tremble} ${y + saut}) scale(${echelle * pop * sens} ${echelle * pop})`}>
      <ellipse cx={0} cy={2} rx={40 * (1 + saut / 60)} ry={7} fill={C.encre} opacity={0.12} />
      <g fill="none" stroke={C.encre} strokeWidth={TRAIT.epais} strokeLinecap="round" strokeLinejoin="round">
        <path d={cercle(tete[0], tete[1], 32, g)} />
        <path d={segment(cou, bassin, g + 'corps')} />
        <path d={main(brasPts(b.g), g + 'bg')} />
        <path d={main(brasPts(b.d), g + 'bd')} />
        <path d={main(jambe(-1), g + 'jg')} />
        <path d={main(jambe(1), g + 'jd')} />
      </g>
      <g transform={`translate(${tete[0] + 5} ${tete[1]})`} stroke={C.encre} strokeLinecap="round" fill="none">
        {cligne ? (
          <>
            <path d="M -15 -4 L -7 -4" strokeWidth={4} />
            <path d="M 5 -4 L 13 -4" strokeWidth={4} />
          </>
        ) : (
          <>
            <circle cx={-11} cy={yeuxY - tete[1]} r={humeur === 'surpris' || humeur === 'peur' ? 5 : 3.6} fill={C.encre} />
            <circle cx={9} cy={yeuxY - tete[1]} r={humeur === 'surpris' || humeur === 'peur' ? 5 : 3.6} fill={C.encre} />
          </>
        )}
        {humeur === 'triste' && <path d="M -18 -10 L -6 -15 M 16 -10 L 4 -15" strokeWidth={3} />}
        <path d={BOUCHE[humeur]} strokeWidth={4} />
      </g>
      {humeur === 'peur' && (
        <path d={`M 40 ${tete[1] - 10} q 4 10 0 14`} stroke={C.bleuNuit} strokeWidth={4} fill="none"
          opacity={interpolate(t % 30, [0, 15, 30], [0, 1, 0])} />
      )}
      {chapeau && (
        <g stroke={C.encre} strokeWidth={TRAIT.moyen} fill={C.encre} strokeLinejoin="round">
          <path d={main([[-38, tete[1] - 26], [38, tete[1] - 26]], g + 'bord')} fill="none" strokeWidth={TRAIT.epais} />
          <rect x={-22} y={tete[1] - 66} width={44} height={40} rx={3} />
        </g>
      )}
    </g>
  );
};
