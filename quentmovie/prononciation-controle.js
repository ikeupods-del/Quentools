// Contrôle de prononciation : la voix de synthèse lit un texte, la reconnaissance de la parole le réécoute, et on compare mot à mot.
// Un mot écrit que la reconnaissance n'a pas retrouvé (« krach » entendu « crac ») est signalé : c'est un candidat pour le dictionnaire de prononciation.
// Comparaison pure (sans voix ni modèle) : testée seule ; la lecture et l'écoute sont faites par server.js.
'use strict';

const sansAccents = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const mots = t => (String(t || '').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).map(w => ({ brut: w, n: sansAccents(w).replace(/[^a-z0-9]/g, '') })).filter(w => w.n);
const lev = (a, b) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
const ressemblance = (a, b) => 1 - lev(a, b) / Math.max(1, a.length, b.length);

// Alignement des mots écrits (A) sur les mots entendus (B) : les substitutions peu ressemblantes sont les mots mal dits
function comparer(ecrit, entendu, { seuil = 0.7 } = {}) {
  const A = mots(ecrit), B = mots(entendu), n = A.length, m = B.length;
  const sub = (i, j) => 1 - ressemblance(A[i].n, B[j].n);
  const d = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) d[i][0] = i; for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sub(i - 1, j - 1));
  const suspects = []; let i = n, j = m;
  while (i > 0 && j > 0) {
    const s = sub(i - 1, j - 1);
    if (Math.abs(d[i][j] - (d[i - 1][j - 1] + s)) < 1e-9) {
      const a = A[i - 1], b = B[j - 1], r = ressemblance(a.n, b.n);
      // seuls les mots en lettres, d'au moins 3 lettres, comptent : les nombres sont lus en toutes lettres par la voix et écrits autrement par la reconnaissance
      if (r < seuil && /^[a-z]{3,}$/.test(a.n) && /^[a-z]+$/.test(b.n)) suspects.push({ ecrit: a.brut, entendu: b.brut, ressemblance: +r.toFixed(2) });
      i--; j--;
    } else if (Math.abs(d[i][j] - (d[i - 1][j] + 1)) < 1e-9) i--; else j--;
  }
  suspects.reverse();
  const vus = new Set();
  return { suspects: suspects.filter(x => { const k = x.ecrit.toLowerCase(); if (vus.has(k)) return false; vus.add(k); return true; }).slice(0, 40), mots: n, entendus: m };
}

module.exports = { comparer, ressemblance };
