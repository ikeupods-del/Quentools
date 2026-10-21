// Scène « le paquet » : un banquier empile les prêts comme des briques, colle l'étiquette « Triple A »,
// puis, au mot déclencheur, les briques pourries craquent et toute la pile s'écroule.
import { Easing, interpolate, random, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneTimee, Visuel } from '../../../../types/projet';
import { StickFigure } from '../StickFigure';
import { C, POLICE, TRAIT } from '../theme';
import { graine, main, rect } from '../trait';

type Empilement = Extract<Visuel, { type: 'empilement' }>;

const COULEUR = { sain: C.sauge, douteux: C.surligne, toxique: C.brique } as const;
const BRIQUE = { l: 300, h: 74 };

const Brique: React.FC<{
  i: number; libelle: string; risque: keyof typeof COULEUR; x: number; y: number; sol: number; arrivee: number; chute: number | null;
}> = ({ i, libelle, risque, x, y, sol, arrivee, chute }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - arrivee;
  if (t < 0) return null;

  // Arrivée : tombe d'en haut et se pose avec un petit rebond.
  const pose = spring({ frame: t, fps, config: { damping: 10, stiffness: 160, mass: 0.7 } });
  let dy = interpolate(pose, [0, 1], [-420, 0]);
  let dx = 0, rot = 0;
  const opa = Math.min(1, t / 4);

  // Écroulement : les briques du haut partent en premier ; chacune glisse, tourne et tombe (gravité)
  // jusqu'au sol, où elle reste couchée en vrac.
  let fissure = 0;
  if (chute !== null && frame >= chute) {
    fissure = interpolate(frame - chute, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
    const depart = chute + 10 + (6 - i) * 3;
    const tSol = Math.sqrt((2 * Math.max(0, sol - y)) / 2600) || 0.12; // temps pour toucher le sol
    const tc = Math.min(Math.max(0, frame - depart) / fps, tSol);
    const sens = random(`sens-${i}`) > 0.5 ? 1 : -1;
    dx += sens * (120 + random(`dx-${i}`) * 260) * tc;
    dy += Math.min(0.5 * 2600 * tc * tc, sol - y);
    rot = sens * (8 + random(`rot-${i}`) * 14) * (tc / tSol) * (i === 0 ? 0.3 : 1);
  }

  const g = graine(`brique-${i}`, frame);
  const fissurable = risque === 'toxique' && fissure > 0;
  return (
    <g transform={`translate(${x + dx} ${y + dy}) rotate(${rot})`} opacity={opa}>
      <path d={rect(-BRIQUE.l / 2, -BRIQUE.h, BRIQUE.l, BRIQUE.h, g)} fill={COULEUR[risque]} fillOpacity={0.85}
        stroke={C.encre} strokeWidth={TRAIT.moyen} strokeLinejoin="round" />
      {risque !== 'sain' && (
        <path d={main([[-BRIQUE.l / 2 + 18, -12], [-BRIQUE.l / 2 + 50, -40]], g + 'h', 1)} stroke={C.encre} strokeWidth={TRAIT.fin} fill="none" />
      )}
      {fissurable && (
        <path d={main([[-20, -BRIQUE.h], [0, -48], [-14, -30], [10, 0]], `fissure-${i}`, 1.5)} stroke={C.encre}
          strokeWidth={TRAIT.moyen} fill="none" strokeDasharray={200} strokeDashoffset={200 * (1 - fissure)} />
      )}
      <text x={0} y={-BRIQUE.h / 2 + 11} textAnchor="middle" fontFamily={POLICE} fontWeight={700} fontSize={30} fill={C.encre}>
        {libelle}
      </text>
    </g>
  );
};

/** Tampon qui s'écrase sur le paquet (léger dépassement d'échelle puis stabilisation). */
const Tampon: React.FC<{ texte: string; x: number; y: number; debut: number; chute: number | null }> = ({ texte, x, y, debut, chute }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - debut;
  if (t < 0) return null;
  const s = interpolate(spring({ frame: t, fps, config: { damping: 8, stiffness: 200 } }), [0, 1], [2.2, 1]);
  const opa = chute !== null && frame > chute ? interpolate(frame - chute, [0, 10], [1, 0], { extrapolateRight: 'clamp' }) : 1;
  return (
    <g transform={`translate(${x} ${y}) rotate(-12) scale(${s})`} opacity={opa * Math.min(1, t / 3)}>
      <rect x={-140} y={-46} width={280} height={92} rx={14} fill="none" stroke={C.brique} strokeWidth={8} />
      <text x={0} y={18} textAnchor="middle" fontFamily={POLICE} fontWeight={900} fontSize={52} fill={C.brique}>{texte}</text>
    </g>
  );
};

export const ScenePaquet: React.FC<{ scene: SceneTimee; visuel: Empilement; porteur?: string }> = ({ scene, visuel, porteur = 'La banque' }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const n = visuel.briques.length;
  const sol = 800, cx = width / 2 + 120;

  // Temps clés (images depuis le début de la scène).
  const chute = visuel.ecroulement && scene.instants[visuel.ecroulement] !== undefined
    ? Math.round(scene.instants[visuel.ecroulement] * fps)
    : visuel.ecroulement ? Math.round(scene.duree * 0.7 * fps) : null;
  const finEmpilement = (chute ?? scene.duree * fps) * 0.55;
  const arrivee = (i: number) => Math.round(8 + (i * finEmpilement) / Math.max(1, n));
  const tampon = arrivee(n - 1) + 14;

  // Le banquier est content tant que la pile tient, il prend peur à l'écroulement.
  const humeur = chute !== null && frame >= chute ? 'peur' : frame >= tampon ? 'malin' : 'joie';
  const titreOpa = interpolate(frame, [arrivee(n - 1), arrivee(n - 1) + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const hautPile = sol - n * (BRIQUE.h + 6);
  // Petite secousse de la pile juste avant la chute.
  const secousse = chute !== null && frame >= chute - 12 && frame < chute + 10 ? Math.sin(frame * 2.3) * 5 : 0;
  const poussiere = chute !== null ? interpolate(frame - chute - 20, [0, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad) }) : 0;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} 1080`} style={{ position: 'absolute', inset: 0 }}>
      <path d={main([[180, sol + 4], [width - 180, sol + 4]], 'sol', 2)} stroke={C.encre} strokeWidth={TRAIT.moyen} strokeLinecap="round" />
      <text x={cx} y={hautPile - 60} textAnchor="middle" fontFamily={POLICE} fontWeight={800} fontSize={44} fill={C.bleuNuit} opacity={titreOpa}>
        {visuel.titre}
      </text>
      <g transform={`translate(${secousse} 0)`}>
        {visuel.briques.map((b, i) => (
          <Brique key={i} i={i} libelle={b.libelle} risque={b.risque} x={cx} y={sol - i * (BRIQUE.h + 6)} sol={sol} arrivee={arrivee(i)} chute={chute} />
        ))}
      </g>
      {visuel.note && <Tampon texte={visuel.note} x={cx + 330} y={hautPile + 40} debut={tampon} chute={chute} />}
      {poussiere > 0 && [0, 1, 2, 3, 4].map((k) => (
        <circle key={k} cx={cx - 220 + k * 110 + poussiere * (k - 2) * 30} cy={sol - 10 - poussiere * 30}
          r={20 + poussiere * 26} fill={C.encreDouce} opacity={0.18 * (1 - poussiere)} />
      ))}
      <StickFigure id="banquier" x={cx - 420} y={sol} echelle={1.15} humeur={humeur} chapeau />
      <text x={cx - 420} y={sol + 52} textAnchor="middle" fontFamily={POLICE} fontWeight={700} fontSize={30} fill={C.encre}>{porteur}</text>
    </svg>
  );
};
