// Habillage commun : bannière d'étape, mot clé mis en avant, sous-titres au mot près.
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Mot, Ton } from '../../../types/projet';
import { C, couleurTon, POLICE } from './theme';

/** Bannière discrète en haut à gauche : « Étape 2 : Le paquet ». Glisse depuis la gauche. */
export const StepBanner: React.FC<{ texte: string; entree?: boolean }> = ({ texte, entree = true }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = entree ? spring({ frame, fps, config: { damping: 18, stiffness: 90 } }) : 1;
  const [num, ...reste] = texte.split(':');
  return (
    <div style={{
      position: 'absolute', top: 48, left: 56, display: 'flex', alignItems: 'center', gap: 14,
      transform: `translateX(${interpolate(p, [0, 1], [-420, 0])}px)`, fontFamily: POLICE,
    }}>
      <div style={{ background: C.encre, color: C.papier, borderRadius: 10, padding: '8px 16px', fontWeight: 800, fontSize: 28 }}>
        {reste.length ? num.trim() : 'Étape'}
      </div>
      <div style={{ color: C.encre, fontWeight: 700, fontSize: 32, borderBottom: `4px solid ${C.surligne}`, paddingBottom: 2 }}>
        {(reste.length ? reste.join(':') : texte).trim()}
      </div>
    </div>
  );
};

/** Mot ou chiffre clé isolé, avec un zoom subtil à l'annonce puis une très lente avancée. */
export const StatHighlight: React.FC<{
  texte: string; ton: Ton; debut: number; x?: number | string; y?: number | string; taille?: number; legende?: string | null;
}> = ({ texte, ton, debut, x = '50%', y = 200, taille = 120, legende = null }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - debut;
  if (t < 0) return null;
  const pop = spring({ frame: t, fps, config: { damping: 9, stiffness: 120, mass: 0.7 } });
  const lent = interpolate(t, [0, fps * 6], [1, 1.06], { extrapolateRight: 'clamp' });
  const couleur = couleurTon(ton);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop * lent})`,
      textAlign: 'center', fontFamily: POLICE, whiteSpace: 'nowrap',
    }}>
      <div style={{ fontSize: taille, fontWeight: 900, color: couleur, letterSpacing: -2, lineHeight: 1 }}>{texte}</div>
      {legende && <div style={{ fontSize: taille * 0.28, fontWeight: 600, color: C.encre, marginTop: 14 }}>{legende}</div>}
    </div>
  );
};

/** Coupe les mots en lignes d'environ `max` caractères. */
export function lignesDe(mots: Mot[], max = 44): Mot[][] {
  const lignes: Mot[][] = [];
  let cur: Mot[] = [], n = 0;
  for (const m of mots) {
    if (cur.length && n + m.texte.length + 1 > max) { lignes.push(cur); cur = []; n = 0; }
    cur.push(m); n += m.texte.length + 1;
    if (/[.!?…]$/.test(m.texte) && n > max * 0.5) { lignes.push(cur); cur = []; n = 0; }
  }
  if (cur.length) lignes.push(cur);
  return lignes;
}

/**
 * Sous-titres « karaoké sobre » : une ligne à la fois, le mot prononcé passe en encre pleine
 * sur un trait jaune, les mots à venir restent grisés.
 */
export const Subtitles: React.FC<{ mots: Mot[] }> = ({ mots }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  if (!mots.length) return null;
  const lignes = lignesDe(mots);
  const iLigne = Math.max(0, lignes.findLastIndex((l) => l[0].debut <= s + 0.05));
  const ligne = lignes[iLigne];
  const finLigne = ligne[ligne.length - 1].fin;
  if (iLigne === lignes.length - 1 && s > finLigne + 0.8) return null;
  const debutLigne = ligne[0].debut;
  const entree = interpolate(s, [debutLigne - 0.05, debutLigne + 0.12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', bottom: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center',
      fontFamily: POLICE, opacity: entree, transform: `translateY(${(1 - entree) * 12}px)`,
    }}>
      <div style={{
        background: `${C.papier}E6`, borderRadius: 18, padding: '14px 28px', maxWidth: 1500,
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 14px', boxShadow: `0 2px 0 ${C.papierOmbre}`,
      }}>
        {ligne.map((m, i) => {
          const dit = s >= m.debut;
          const enCours = dit && s < Math.max(m.fin, m.debut + 0.12);
          const surligne = interpolate(s, [m.debut, m.debut + 0.1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
          return (
            <span key={i} style={{
              fontSize: 46, fontWeight: enCours ? 800 : 600, color: dit ? C.encre : C.encreDouce, opacity: dit ? 1 : 0.55,
              backgroundImage: enCours ? `linear-gradient(${C.surligne}, ${C.surligne})` : 'none',
              backgroundSize: `${surligne * 100}% 30%`, backgroundPosition: '0 88%', backgroundRepeat: 'no-repeat',
            }}>
              {m.texte}
            </span>
          );
        })}
      </div>
    </div>
  );
};
