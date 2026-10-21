// Fond papier craft mat : couleur feutrée + grain fixe (aucun blanc pur).
import { AbsoluteFill } from 'remotion';
import { C } from './theme';

export const Papier: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: C.papier }}>
    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.09 0" />
      </filter>
      <filter id="fibres">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="3" seed="3" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.38  0 0 0 0 0.3  0 0 0 0.07 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#fibres)" />
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
    {/* vignettage très léger : le centre reste clair */}
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 55%, ${C.papierOmbre}AA 100%)` }} />
  </AbsoluteFill>
);
