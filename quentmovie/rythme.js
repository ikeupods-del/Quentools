// QuentMovie : tempo et temps forts d'une musique (sans dépendance) : énergie par tranches de 10 ms, hausses d'énergie (attaques),
// autocorrélation pour trouver le tempo (60 à 200 pulsations par minute), puis calage de la grille sur les attaques.
'use strict';

// pcm : tableau d'échantillons (mono) ; sr : fréquence d'échantillonnage. → { bpm, premier, intervalle, temps[], confiance }
function analyser(pcm, sr) {
  const hop = Math.max(1, Math.round(sr / 100)), fps = sr / hop, n = Math.floor(pcm.length / hop);
  if (n < fps * 4) return null;
  const E = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let k = i * hop; k < (i + 1) * hop; k++) s += pcm[k] * pcm[k]; E[i] = Math.log(1 + 1e-3 * Math.sqrt(s / hop)); }
  // attaques : hausses d'énergie d'une tranche à la suivante
  const on = new Float64Array(n);
  for (let i = 1; i < n; i++) on[i] = Math.max(0, E[i] - E[i - 1]);
  const moy = on.reduce((a, b) => a + b, 0) / n; for (let i = 0; i < n; i++) on[i] = Math.max(0, on[i] - moy);
  const lmin = Math.round(fps * 60 / 200), lmax = Math.round(fps * 60 / 60), score = new Float64Array(lmax + 2);
  for (let L = lmin; L <= lmax; L++) { let s = 0; for (let i = 0; i + L < n; i++) s += on[i] * on[i + L]; score[L] = s / (n - L); }
  // préférence douce pour les tempos usuels (autour de 120) pour éviter les moitiés et doubles
  let best = lmin, bs = -1;
  for (let L = lmin; L <= lmax; L++) {
    const bpm = 60 * fps / L, prior = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.8, 2));
    const harm = (score[L] + 0.5 * (score[2 * L] || 0) + 0.25 * (score[Math.round(L / 2)] || 0)) * prior;
    if (harm > bs) { bs = harm; best = L; }
  }
  const a = score[best - 1] || 0, b = score[best], c = score[best + 1] || 0, d = a - 2 * b + c, Lr = d < 0 ? best + 0.5 * (a - c) / d : best;
  // phase : décalage qui rassemble le plus d'attaques
  let ph = 0, ps = -1;
  for (let p = 0; p < Math.ceil(Lr); p++) { let s = 0; for (let t = p; t < n; t += Lr) s += on[Math.round(t)] || 0; if (s > ps) { ps = s; ph = p; } }
  const temps = []; for (let t = ph; t < n; t += Lr) temps.push(+(t / fps).toFixed(3));
  const tot = on.reduce((x, y) => x + y, 0) || 1;
  return { bpm: +(60 * fps / Lr).toFixed(1), premier: +(ph / fps).toFixed(3), intervalle: +(Lr / fps).toFixed(4), temps, confiance: +Math.min(1, ps / tot * Lr).toFixed(2) };
}

module.exports = { analyser };
