// Enregistrement des compositions. Durée et format lus dans le projet (calculateMetadata) :
// `--props=public/projets/<id>/projet.json` suffit pour rendre n'importe quel projet fabriqué.
import { Composition } from 'remotion';
import { DEMO } from '../demo/crise2008';
import { EcoVideo } from './compositions/EcoVideo/EcoVideo';
import { chargerPolice } from './compositions/EcoVideo/theme';

chargerPolice();

export const Root: React.FC = () => (
  <>
    <Composition
      id="EcoVideo"
      component={EcoVideo}
      fps={DEMO.format.fps}
      width={DEMO.format.largeur}
      height={DEMO.format.hauteur}
      durationInFrames={Math.round(DEMO.duree * DEMO.format.fps)}
      defaultProps={{ projet: DEMO }}
      calculateMetadata={({ props }) => ({
        fps: props.projet.format.fps,
        width: props.projet.format.largeur,
        height: props.projet.format.hauteur,
        durationInFrames: Math.max(1, Math.round(props.projet.duree * props.projet.format.fps)),
      })}
    />
  </>
);
