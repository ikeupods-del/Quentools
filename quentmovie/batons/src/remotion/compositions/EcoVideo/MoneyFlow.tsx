// Flux d'argent entre acteurs : la flèche se trace quand le mot déclencheur est prononcé,
// puis l'objet (billets, sac, maison, paquet, contrat) glisse le long de la flèche.
import { evolvePath, getLength, getPointAtLength as pointBrut, getTangentAtLength as tangenteBrute } from '@remotion/paths';
import { makeTriangle } from '@remotion/shapes';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { ActeurDef, Visuel } from '../../../types/projet';
import { Acteur, Billet, Document, Maison, SacArgent } from './Objets';
import { C, POLICE, TRAIT } from './theme';
import { main } from './trait';

type Flux = Extract<Visuel, { type: 'flux' }>['flux'][number];

const getPointAtLength = (d: string, l: number) => pointBrut(d, l) ?? { x: 0, y: 0 };
const getTangentAtLength = (d: string, l: number) => tangenteBrute(d, l) ?? { x: 1, y: 0 };

const POINTE = makeTriangle({ length: 30, direction: 'right' });

const ObjetFlux: React.FC<{ objet: Flux['objet']; id: string }> = ({ objet, id }) => {
  if (objet === 'sac') return <SacArgent id={id} taille={0.8} />;
  if (objet === 'maison') return <g transform="scale(0.5)"><Maison id={id} teinte={C.sauge} /></g>;
  if (objet === 'document') return <Document id={id} />;
  if (objet === 'paquet') {
    return (
      <g stroke={C.encre} strokeWidth={TRAIT.moyen} fill={C.surligne}>
        {[0, 1, 2].map((i) => <rect key={i} x={-30} y={-24 - i * 22} width={60} height={20} rx={3} />)}
      </g>
    );
  }
  return <Billet id={id} />;
};

export const Fleche: React.FC<{ flux: Flux; i: number; a: [number, number]; b: [number, number]; debut: number }> = ({
  flux, i, a, b, debut,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - debut;
  if (t < 0) return null;

  // Arc au-dessus (aller) ou au-dessous (retour) des acteurs, pour ne jamais superposer deux flèches.
  const retour = b[0] < a[0];
  const h = (retour ? 1 : -1) * (90 + (i % 2) * 40);
  const ax = a[0] + (retour ? -70 : 70), bx = b[0] + (retour ? 70 : -70);
  const ay = a[1] + (retour ? 30 : -150), by = b[1] + (retour ? 30 : -150);
  const d = main([[ax, ay], [(ax + bx) / 2, (ay + by) / 2 + h], [bx, by]], `fleche-${i}`, 3);
  const L = getLength(d);

  const trace = interpolate(t, [0, fps * 0.6], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const { strokeDasharray, strokeDashoffset } = evolvePath(trace, d);
  const bout = getPointAtLength(d, L * trace);
  const tan = getTangentAtLength(d, Math.max(0, L * trace - 1));
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;

  // L'objet part quand la flèche est tracée et arrive en 1 s.
  const voyage = interpolate(t, [fps * 0.5, fps * 1.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const pos = getPointAtLength(d, L * voyage);
  const milieu = getPointAtLength(d, L / 2);
  const opaLib = interpolate(t, [fps * 0.4, fps * 0.8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <g>
      <path d={d} fill="none" stroke={C.bleuNuit} strokeWidth={TRAIT.moyen} strokeLinecap="round"
        strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
      <path d={POINTE.path} fill={C.bleuNuit}
        transform={`translate(${bout.x} ${bout.y}) rotate(${angle}) translate(${-POINTE.width + 4} ${-POINTE.height / 2})`} />
      {flux.libelle && (
        <text x={milieu.x} y={milieu.y + (retour ? 60 : -78)} textAnchor="middle" fontFamily={POLICE} fontWeight={800}
          fontSize={32} fill={C.bleuNuit} opacity={opaLib} stroke={C.papier} strokeWidth={10} paintOrder="stroke">
          {flux.libelle}
        </text>
      )}
      {voyage > 0 && voyage < 1 && (
        <g transform={`translate(${pos.x} ${pos.y + 20})`}><ObjetFlux objet={flux.objet} id={`obj-${i}`} /></g>
      )}
    </g>
  );
};

/** Positions des acteurs : alignés de gauche à droite, pieds sur la même ligne. */
export const placer = (acteurs: ActeurDef[], largeur = 1920, sol = 700) => {
  const marge = acteurs.length <= 2 ? 460 : 260;
  const pas = acteurs.length > 1 ? (largeur - 2 * marge) / (acteurs.length - 1) : 0;
  return Object.fromEntries(acteurs.map((a, i) => [a.id, [acteurs.length > 1 ? marge + i * pas : largeur / 2, sol] as [number, number]]));
};

export const MoneyFlow: React.FC<{ visuel: Extract<Visuel, { type: 'flux' }>; instants: Record<string, number>; duree: number }> = ({
  visuel, instants, duree,
}) => {
  const { fps, width } = useVideoConfig();
  const pos = placer(visuel.acteurs, width);
  // Sans temps connu pour un mot, les flèches se répartissent sur la scène.
  const debutFlux = (f: Flux, i: number) =>
    Math.round((instants[f.motDeclencheur] ?? (duree * (i + 1)) / (visuel.flux.length + 1)) * fps);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} 1080`} style={{ position: 'absolute', inset: 0 }}>
      {visuel.acteurs.map((a, i) => <Acteur key={a.id} acteur={a} x={pos[a.id][0]} y={pos[a.id][1]} apparition={i * 6} />)}
      {visuel.flux.map((f, i) =>
        pos[f.de] && pos[f.vers] ? <Fleche key={i} flux={f} i={i} a={pos[f.de]} b={pos[f.vers]} debut={debutFlux(f, i)} /> : null,
      )}
    </svg>
  );
};
