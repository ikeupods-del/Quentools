// QuentMovie : extraire une partie du montage (de t0 à t1, en secondes de la timeline) pour en faire un montage à part.
// Sert au « clipping » : chaque extrait devient une vidéo courte (TikTok, Reels, Shorts) avec ses sous-titres, sa musique et ses incrustations.
'use strict';

const clone = o => JSON.parse(JSON.stringify(o));
const effDur = c => (c.kind === 'image' || c.kind === 'solid') ? (c.dur || 3) : (c.out - c.in) / (c.speed || 1);
const r2 = x => +x.toFixed(3);

// Garde les éléments ({ start, dur }) visibles entre t0 et t1, décalés pour que t0 devienne 0
function decaler(liste, t0, t1, dureeDe, regler) {
  const out = [];
  for (const el of liste || []) {
    const debut = +el.start || 0, d = dureeDe(el), fin = d > 0 ? debut + d : Infinity;
    if (fin <= t0 || debut >= t1) continue;
    const c = clone(el), perdu = Math.max(0, t0 - debut);
    c.start = r2(Math.max(0, debut - t0));
    if (regler) regler(c, perdu, Math.min(fin, t1) - Math.max(debut, t0));
    out.push(c);
  }
  return out;
}

function extraireSegment(proj, t0, t1) {
  t0 = Math.max(0, +t0 || 0); t1 = +t1;
  if (!(t1 > t0 + 0.2)) throw new Error('Extrait trop court.');
  const clips = []; let st = 0;
  for (const c0 of proj.clips || []) {
    const d = effDur(c0), a = Math.max(t0, st), b = Math.min(t1, st + d);
    if (b - a > 0.05) {
      const c = clone(c0), perdu = a - st, vit = c.speed || 1;
      if (c.kind === 'image' || c.kind === 'solid') c.dur = r2(b - a);
      else { c.in = r2(c0.in + perdu * vit); c.out = r2(c0.in + (b - st) * vit); }
      const lg = b - a;
      c.subs = (c0.subs || []).filter(x => +x.e > perdu && +x.s < perdu + lg).map(x => ({ ...x, s: r2(Math.max(0, +x.s - perdu)), e: r2(Math.min(lg, +x.e - perdu)) }));
      c.cadrage = (c0.cadrage || []).length ? c0.cadrage.map(p => ({ ...p, t: r2(p.t - perdu) })).filter(p => p.t >= -2 && p.t <= lg + 2) : c0.cadrage;
      if (perdu > 0) { // textes et titres animés comptés depuis le début du clip d'origine
        if (c.titre && Number.isFinite(+c.titre.start)) { const fin = +c.titre.dur > 0 ? c.titre.start + c.titre.dur : Infinity; if (fin <= perdu) c.titre = null; else { c.titre.start = r2(Math.max(0, c.titre.start - perdu)); if (+c.titre.dur > 0) c.titre.dur = r2(fin - perdu - c.titre.start); } }
        if (c.text) { const ts = +c.textStart || 0, fin = +c.textDur > 0 ? ts + c.textDur : Infinity; if (fin <= perdu) c.text = ''; else { c.textStart = r2(Math.max(0, ts - perdu)); if (+c.textDur > 0) c.textDur = r2(fin - perdu - c.textStart); } }
        c.overlays = decaler(c.overlays, perdu, Infinity, o => +o.dur || 0);
        c.fadeIn = 0; // le début de l'extrait n'est pas le début du clip
      }
      if (b < st + d) { c.fadeOut = c.fadeOut || 0; } // la fin du clip d'origine n'est pas la fin de l'extrait
      clips.push(c);
    }
    st += d;
  }
  if (!clips.length) throw new Error('Rien à extraire à cet endroit.');
  if (clips.length) clips[clips.length - 1].transition = null;
  const T = clips.reduce((s, c) => s + effDur(c), 0);
  // sons : décalés, et leur début raccourci s'ils avaient commencé avant l'extrait
  const audio = decaler(proj.audio, t0, t0 + T, a => { const v = a.vit || 1; return (+a.dur > 0 ? a.dur : 0) / v; }, (a, perdu) => {
    if (perdu > 0) { const v = a.vit || 1; a.in = r2((+a.in || 0) + perdu * v); if (+a.dur > 0) a.dur = r2(Math.max(0.2, a.dur - perdu * v)); if (a.fade) a.fade = false; }
  });
  const pistes = decaler(proj.pistes, t0, t0 + T, p => (p.kind === 'image' ? (+p.dur || 4) : Math.max(0.3, (+p.out || 1) - (+p.in || 0))), (p, perdu) => {
    if (perdu > 0) { if (p.kind === 'image') p.dur = r2(Math.max(0.3, (+p.dur || 4) - perdu)); else p.in = r2((+p.in || 0) + perdu); }
  });
  const q = clone(proj);
  Object.assign(q, { clips, audio, pistes, markers: [], nomsReperes: {} });
  return q;
}

// Habillage « TikTok » d'un extrait : vertical, sous-titres en gros, accroche écrite en haut au début
function habillerTikTok(q, o = {}) {
  q.format = o.format || 'vertical';
  for (const c of q.clips) {
    if (c.subs && c.subs.length) { c.subStyle = 'tiktok'; c.subSize = c.subSize || 5.2; }
    if (q.format === 'vertical' && c.kind === 'video' && o.cadrage === 'flou') c.fit = 'flou';
  }
  if (o.accroche && q.clips[0]) {
    const c = q.clips[0]; c.text = String(o.accroche).slice(0, 80); c.textPos = 'haut'; c.textStart = 0.2; c.textDur = Math.min(3.5, Math.max(1.5, q.clips.reduce((s, x) => s + effDur(x), 0) / 4));
    c.textStyle = 'contour'; c.textSize = 6.5; c.textAnim = 'glisse'; c.textColor = '#ffffff';
  }
  return q;
}

module.exports = { extraireSegment, habillerTikTok, effDur };
