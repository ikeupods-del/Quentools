// Objets simplifiés à l'extrême, tous dessinés au trait dans une boîte centrée sur (0, 0), base en y = 0.
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ActeurDef } from '../../../types/projet';
import { StickFigure } from './StickFigure';
import { C, POLICE, TRAIT } from './theme';
import { cercle, graine, main, rect } from './trait';

const traits = { fill: 'none', stroke: C.encre, strokeWidth: TRAIT.epais, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

/** La maison en 5 traits : deux murs, le sol, deux pans de toit. */
export const Maison: React.FC<{ id: string; teinte?: string }> = ({ id, teinte }) => {
  const g = graine(id, useCurrentFrame());
  return (
    <g {...traits}>
      {teinte && <path d="M -60 0 L -60 -80 L 0 -130 L 60 -80 L 60 0 Z" fill={teinte} stroke="none" opacity={0.35} />}
      <path d={main([[-60, 0], [-60, -80]], g + 1)} />
      <path d={main([[60, 0], [60, -80]], g + 2)} />
      <path d={main([[-70, 0], [70, 0]], g + 3)} />
      <path d={main([[-75, -74], [0, -132]], g + 4)} />
      <path d={main([[0, -132], [75, -74]], g + 5)} />
    </g>
  );
};

/** Sac d'argent noué avec le symbole $. */
export const SacArgent: React.FC<{ id: string; taille?: number }> = ({ id, taille = 1 }) => {
  const g = graine(id, useCurrentFrame());
  return (
    <g transform={`scale(${taille})`}>
      <path d={main([[-16, -78], [-34, -48], [-40, -14], [-26, 0], [26, 0], [40, -14], [34, -48], [16, -78]], g)}
        {...traits} fill={C.papierOmbre} />
      <path d={main([[-20, -80], [0, -72], [20, -80]], g + 'n')} {...traits} />
      <text x={0} y={-18} textAnchor="middle" fontFamily={POLICE} fontWeight={800} fontSize={38} fill={C.sauge}>$</text>
    </g>
  );
};

/** Liasse de billets (une pile de 3 rectangles). */
export const Billet: React.FC<{ id: string }> = ({ id }) => {
  const g = graine(id, useCurrentFrame());
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={rect(-34 + i * 3, -22 - i * 7, 68, 22, g + i, 1)} {...traits} strokeWidth={TRAIT.fin} fill={C.sauge} />
      ))}
      <text x={6} y={-27} textAnchor="middle" fontFamily={POLICE} fontWeight={800} fontSize={18} fill={C.encre}>$</text>
    </g>
  );
};

/** Feuille de contrat (prêt, titre). */
export const Document: React.FC<{ id: string }> = ({ id }) => {
  const g = graine(id, useCurrentFrame());
  return (
    <g {...traits} strokeWidth={TRAIT.moyen}>
      <path d={rect(-24, -64, 48, 64, g)} fill={C.papier} />
      {[0, 1, 2].map((i) => <path key={i} d={main([[-14, -50 + i * 14], [14, -50 + i * 14]], g + i, 0.8)} strokeWidth={TRAIT.fin} />)}
    </g>
  );
};

/** Bâtiments : banque à colonnes, agence de notation avec sa note, État à drapeau, entreprise à cheminée. */
export const Batiment: React.FC<{ id: string; genre: 'banque' | 'agence' | 'etat' | 'entreprise' }> = ({ id, genre }) => {
  const g = graine(id, useCurrentFrame());
  if (genre === 'banque') {
    return (
      <g {...traits}>
        <path d={main([[-80, -120], [0, -165], [80, -120], [-80, -120]], g + 't')} fill={C.papierOmbre} />
        {[-55, -18, 18, 55].map((cx, i) => <path key={i} d={main([[cx, -112], [cx, -10]], g + i)} />)}
        <path d={main([[-90, 0], [90, 0]], g + 's')} />
        <text x={0} y={-130} textAnchor="middle" fontFamily={POLICE} fontWeight={800} fontSize={24} fill={C.encre} stroke="none">$</text>
      </g>
    );
  }
  if (genre === 'agence') {
    return (
      <g {...traits}>
        <path d={rect(-60, -130, 120, 130, g)} fill={C.papierOmbre} />
        <path d={cercle(0, -82, 30, g + 'm')} fill={C.surligne} />
        <text x={0} y={-72} textAnchor="middle" fontFamily={POLICE} fontWeight={900} fontSize={26} fill={C.encre} stroke="none">AAA</text>
        <path d={main([[-30, -26], [30, -26]], g + 'l')} strokeWidth={TRAIT.fin} />
      </g>
    );
  }
  if (genre === 'etat') {
    return (
      <g {...traits}>
        <path d={rect(-80, -100, 160, 100, g)} fill={C.papierOmbre} />
        <path d="M -40 -100 Q 0 -160 40 -100" />
        <path d={main([[0, -142], [0, -196]], g + 'm')} strokeWidth={TRAIT.moyen} />
        <path d="M 0 -196 L 34 -186 L 0 -176 Z" fill={C.bleuNuit} stroke="none" />
        {[-50, 0, 50].map((cx, i) => <path key={i} d={rect(cx - 12, -70, 24, 40, g + i, 1)} strokeWidth={TRAIT.fin} />)}
      </g>
    );
  }
  return (
    <g {...traits}>
      <path d={main([[-80, 0], [-80, -90], [-40, -120], [-40, -90], [0, -120], [0, -90], [80, -90], [80, 0], [-80, 0]], g)} fill={C.papierOmbre} />
      <path d={main([[50, -90], [50, -160], [70, -160], [70, -90]], g + 'c')} />
    </g>
  );
};

/** Un acteur de l'histoire : bonhomme, famille ou bâtiment, avec son étiquette, apparition par pop doux. */
export const Acteur: React.FC<{ acteur: ActeurDef; x: number; y: number; apparition?: number; echelle?: number }> = ({
  acteur, x, y, apparition = 0, echelle = 1,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - apparition;
  if (t < 0) return null;
  const pop = spring({ frame: t, fps, config: { damping: 12, stiffness: 150, mass: 0.6 } });
  const humain = acteur.genre === 'personne' || acteur.genre === 'famille' || acteur.genre === 'investisseur';

  return (
    <g>
      {humain ? (
        <>
          <StickFigure id={acteur.id} x={x} y={y} echelle={echelle} humeur={acteur.humeur} apparition={apparition}
            chapeau={acteur.genre === 'investisseur'} />
          {acteur.genre === 'famille' && (
            <StickFigure id={acteur.id + '-enfant'} x={x + 70 * echelle} y={y} echelle={echelle * 0.6}
              humeur={acteur.humeur} apparition={apparition + 4} />
          )}
        </>
      ) : (
        <g transform={`translate(${x} ${y}) scale(${echelle * pop})`}>
          <Batiment id={acteur.id} genre={acteur.genre as 'banque' | 'agence' | 'etat' | 'entreprise'} />
        </g>
      )}
      <text x={x + (acteur.genre === 'famille' ? 30 * echelle : 0)} y={y + 52} textAnchor="middle" fontFamily={POLICE}
        fontWeight={700} fontSize={30} fill={C.encre} opacity={Math.min(1, pop)}>
        {acteur.nom}
      </text>
    </g>
  );
};
