// Les autres scènes : personnages qui parlent, courbe de prix, chiffre clé ; et l'aiguillage par type de visuel.
import { evolvePath, getLength, getPointAtLength as pointBrut } from '@remotion/paths';
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SceneTimee, Visuel } from '../../../../types/projet';
import { StatHighlight } from '../Habillage';
import { MoneyFlow, placer } from '../MoneyFlow';
import { Acteur, Maison } from '../Objets';
import { StickFigure } from '../StickFigure';
import { C, couleurTon, POLICE, TRAIT } from '../theme';
import { graine, main, type Pt } from '../trait';
import { ScenePaquet } from './ScenePaquet';

const getPointAtLength = (d: string, l: number) => pointBrut(d, l) ?? { x: 0, y: 0 };

const Bulle: React.FC<{ texte: string; x: number; y: number; debut: number }> = ({ texte, x, y, debut }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame - debut;
  if (t < 0) return null;
  const s = spring({ frame: t, fps, config: { damping: 12, stiffness: 160 } });
  const l = Math.min(760, 80 + texte.length * 19);
  const g = graine('bulle', frame);
  // La bulle reste dans l'image ; la pointe suit le personnage.
  const bx = Math.min(Math.max(x, l / 2 + 40), width - l / 2 - 40), pointe = Math.max(-l / 2 + 30, Math.min(l / 2 - 60, x - bx));
  return (
    <g transform={`translate(${bx} ${y}) scale(${s})`}>
      <path d={main([[-l / 2, -110], [l / 2, -110], [l / 2, -10], [pointe + 40, -10], [pointe + 10, 30], [pointe, -10], [-l / 2, -10], [-l / 2, -108]], g, 1.4)}
        fill={C.papier} stroke={C.encre} strokeWidth={TRAIT.moyen} strokeLinejoin="round" />
      <text x={0} y={-48} textAnchor="middle" fontFamily={POLICE} fontWeight={700} fontSize={36} fill={C.encre}>{texte}</text>
    </g>
  );
};

export const ScenePersonnages: React.FC<{ visuel: Extract<Visuel, { type: 'personnages' }> }> = ({ visuel }) => {
  const { width } = useVideoConfig();
  const pos = placer(visuel.acteurs, width, 760);
  const premier = visuel.acteurs[0];
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} 1080`} style={{ position: 'absolute', inset: 0 }}>
      {visuel.acteurs.map((a, i) => <Acteur key={a.id} acteur={a} x={pos[a.id][0]} y={pos[a.id][1]} apparition={i * 7} echelle={1.2} />)}
      {visuel.bulle && premier && <Bulle texte={visuel.bulle} x={pos[premier.id][0] + 40} y={pos[premier.id][1] - 300} debut={18} />}
    </svg>
  );
};

/** Courbe ultra-lisible : la ligne monte pas à pas, puis plonge net à la cassure (trait rouge brique). */
export const PriceChart: React.FC<{ visuel: Extract<Visuel, { type: 'courbe' }>; duree: number }> = ({ visuel, duree }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const x0 = 360, x1 = width - 300, y0 = 780, y1 = 260;
  const vals = visuel.points.length >= 2 ? visuel.points : [0, 1];
  const min = Math.min(...vals), max = Math.max(...vals);
  const pts: Pt[] = vals.map((v, i) => [x0 + (i / (vals.length - 1)) * (x1 - x0), y0 - ((v - min) / (max - min || 1)) * (y0 - y1)]);
  const k = visuel.cassure !== null && visuel.cassure > 0 && visuel.cassure < pts.length - 1 ? visuel.cassure : pts.length - 1;
  const monte = main(pts.slice(0, k + 1), 'monte', 2), plonge = main(pts.slice(k), 'plonge', 2);

  const dureeImg = duree * fps;
  const pMonte = interpolate(frame, [10, dureeImg * 0.55], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const pPlonge = interpolate(frame, [dureeImg * 0.6, dureeImg * 0.6 + fps * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic) });
  const em = evolvePath(pMonte, monte), ep = evolvePath(pPlonge, plonge);
  const tete = pPlonge > 0 ? getPointAtLength(plonge, getLength(plonge) * pPlonge) : getPointAtLength(monte, getLength(monte) * pMonte);
  const g = graine('axes', frame);

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} 1080`} style={{ position: 'absolute', inset: 0 }}>
      <text x={width / 2} y={190} textAnchor="middle" fontFamily={POLICE} fontWeight={800} fontSize={48} fill={C.encre}>{visuel.titre}</text>
      <g stroke={C.encre} strokeWidth={TRAIT.moyen} strokeLinecap="round" fill="none">
        <path d={main([[x0 - 30, y1 - 40], [x0 - 30, y0 + 30], [x1 + 40, y0 + 30]], g)} />
      </g>
      <text x={x0} y={y0 + 80} fontFamily={POLICE} fontWeight={600} fontSize={30} fill={C.encreDouce}>{visuel.debut}</text>
      <text x={x1} y={y0 + 80} textAnchor="end" fontFamily={POLICE} fontWeight={600} fontSize={30} fill={C.encreDouce}>{visuel.fin}</text>
      <path d={monte} fill="none" stroke={C.sauge} strokeWidth={TRAIT.epais + 2} strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={em.strokeDasharray} strokeDashoffset={em.strokeDashoffset} />
      {k < pts.length - 1 && (
        <path d={plonge} fill="none" stroke={C.brique} strokeWidth={TRAIT.epais + 2} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={ep.strokeDasharray} strokeDashoffset={ep.strokeDashoffset} />
      )}
      {pPlonge > 0.98 && (
        <path d={main([[pts[k][0] - 26, pts[k][1] - 26], [pts[k][0] + 26, pts[k][1] + 26]], 'cassure', 1)} stroke={C.brique} strokeWidth={TRAIT.epais} />
      )}
      <circle cx={tete.x} cy={tete.y} r={12} fill={pPlonge > 0 ? C.brique : C.sauge} stroke={C.encre} strokeWidth={4} />
      <g transform={`translate(${x0 - 150} ${y0 + 30}) scale(0.55)`} opacity={0.9}><Maison id="maison-courbe" /></g>
    </svg>
  );
};

/** Chiffre clé plein écran, avec le fil conducteur qui réagit à côté. */
export const SceneChiffre: React.FC<{ scene: SceneTimee; visuel: Extract<Visuel, { type: 'chiffre' }>; personnage: string }> = ({ scene, visuel, personnage }) => {
  const { fps, width } = useVideoConfig();
  const debut = Math.round((scene.instants[visuel.motDeclencheur] ?? 0.3) * fps);
  const humeur = visuel.ton === 'danger' ? 'peur' : visuel.ton === 'gain' ? 'joie' : 'surpris';
  return (
    <>
      <StatHighlight texte={visuel.valeur} ton={visuel.ton} debut={debut} y={440} x="58%" taille={150} legende={visuel.legende} />
      <svg width="100%" height="100%" viewBox={`0 0 ${width} 1080`} style={{ position: 'absolute', inset: 0 }}>
        <StickFigure id={`fil-${personnage}`} x={330} y={800} echelle={1.2} humeur={humeur} apparition={Math.max(0, debut - 6)} />
        <path d={main([[180, 804], [520, 804]], 'sol-chiffre', 2)} stroke={couleurTon(visuel.ton)} strokeWidth={TRAIT.moyen} strokeLinecap="round" />
      </svg>
    </>
  );
};

/** Aiguillage : un type de visuel = un composant. Ajouter un visuel = un cas ici + une entrée dans VisuelSchema. */
export const SceneVisuel: React.FC<{ scene: SceneTimee; personnage: string }> = ({ scene, personnage }) => {
  const v = scene.visuel;
  switch (v.type) {
    case 'personnages': return <ScenePersonnages visuel={v} />;
    case 'flux': return <MoneyFlow visuel={v} instants={scene.instants} duree={scene.duree} />;
    case 'empilement': return <ScenePaquet scene={scene} visuel={v} />;
    case 'courbe': return <PriceChart visuel={v} duree={scene.duree} />;
    case 'chiffre': return <SceneChiffre scene={scene} visuel={v} personnage={personnage} />;
  }
};
