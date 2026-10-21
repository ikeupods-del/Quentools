// Composition complète : carton d'ouverture, puis chaque scène dans sa séquence (voix, visuel, mot clé, sous-titres),
// bannière d'étape par acte. Tous les temps viennent du projet (ProjetVideo), rien n'est codé en dur.
import { AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { INTRO } from '../../../services/timing';
import type { ProjetVideo, SceneTimee } from '../../../types/projet';
import { StatHighlight, StepBanner, Subtitles } from './Habillage';
import { Papier } from './Papier';
import { SceneVisuel } from './scenes/Scenes';
import { StickFigure } from './StickFigure';
import { C, POLICE } from './theme';

export interface EcoVideoProps extends Record<string, unknown> { projet: ProjetVideo }

const Ouverture: React.FC<{ projet: ProjetVideo }> = ({ projet }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame, fps, config: { damping: 14 } });
  const q = interpolate(frame, [fps * 0.8, fps * 1.3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: POLICE, textAlign: 'center' }}>
      <div style={{ fontSize: 84, fontWeight: 900, color: C.encre, transform: `scale(${p})`, maxWidth: 1500, lineHeight: 1.05 }}>{projet.titre}</div>
      <div style={{ fontSize: 44, fontWeight: 600, color: C.bleuNuit, marginTop: 28, opacity: q }}>{projet.accroche}</div>
      <svg width={1920} height={300} viewBox="0 0 1920 300" style={{ marginTop: 20 }}>
        <StickFigure id="fil-intro" x={960} y={270} humeur="surpris" apparition={Math.round(fps * 0.6)} />
      </svg>
    </AbsoluteFill>
  );
};

const Scene: React.FC<{ scene: SceneTimee; projet: ProjetVideo }> = ({ scene, projet }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fin = scene.duree * fps;
  // Fondu enchaîné court et glissement latéral léger entre deux scènes.
  const entree = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  const sortie = interpolate(frame, [fin - 8, fin], [1, 0], { extrapolateLeft: 'clamp' });
  const mc = scene.motCle;
  return (
    <AbsoluteFill style={{ opacity: Math.min(entree, sortie), transform: `translateX(${(1 - entree) * 40}px)` }}>
      {scene.audio && <Audio src={staticFile(scene.audio)} />}
      <SceneVisuel scene={scene} personnage={projet.personnage.nom} />
      {mc && scene.visuel.type !== 'chiffre' && (
        <StatHighlight texte={mc.texte} ton={mc.ton} debut={Math.round((scene.instants[mc.motDeclencheur] ?? 0.4) * fps)}
          y={scene.visuel.type === 'courbe' ? 330 : 230} taille={96} />
      )}
      <Subtitles mots={scene.mots} />
    </AbsoluteFill>
  );
};

export const EcoVideo: React.FC<EcoVideoProps> = ({ projet }) => {
  const { fps } = useVideoConfig();
  const img = (s: number) => Math.round(s * fps);
  return (
    <AbsoluteFill style={{ fontFamily: POLICE }}>
      <Papier />
      <Sequence durationInFrames={img(INTRO)} name="Ouverture"><Ouverture projet={projet} /></Sequence>
      {projet.actes.map((acte) => {
        const debut = acte.scenes[0]?.debut ?? 0;
        const derniere = acte.scenes[acte.scenes.length - 1];
        const duree = derniere ? derniere.debut + derniere.duree - debut : 0;
        if (duree <= 0) return null;
        return (
          <Sequence key={acte.id} from={img(debut)} durationInFrames={img(duree)} name={acte.etape}>
            {acte.scenes.map((s) => (
              <Sequence key={s.id} from={img(s.debut - debut)} durationInFrames={img(s.duree)} name={s.id}>
                <Scene scene={s} projet={projet} />
              </Sequence>
            ))}
            <StepBanner texte={acte.etape} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
