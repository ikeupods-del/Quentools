// Génère la bibliothèque sonore de QuentMovie (bruitages et musiques) par synthèse : créations originales, sans droits.
// Usage : node scripts/generer-bibliotheque.js   →   bibliotheque/sons/*.mp3, bibliotheque/musiques/*.mp3, bibliotheque/index.json
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const SR = 44100, PI2 = Math.PI * 2;
const OUT = path.join(__dirname, '..', 'bibliotheque');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';

// Générateur pseudo-aléatoire déterministe : les fichiers sont identiques à chaque exécution.
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = rng(1);
const rnd = () => R();
const sgn = () => rnd() * 2 - 1;

const buf = sec => new Float32Array(Math.ceil(sec * SR));
const mix = (dst, src, at, g = 1) => { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g; };
function lp(x, fc) { const a = 1 - Math.exp(-PI2 * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] = y; } return x; }
function hp(x, fc) { const a = 1 - Math.exp(-PI2 * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y += a * (x[i] - y); x[i] -= y; } return x; }
const noise = (sec, tau) => { const b = buf(sec); for (let i = 0; i < b.length; i++) b[i] = sgn() * (tau ? Math.exp(-i / SR / tau) : 1); return b; };
function tone(f, sec, tau, wave = 'sine', attack = 0.002) {
  const b = buf(sec); let ph = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR, fr = typeof f === 'function' ? f(t) : f; ph += PI2 * fr / SR;
    const w = wave === 'sine' ? Math.sin(ph) : wave === 'square' ? (Math.sin(ph) > 0 ? 0.6 : -0.6) : wave === 'saw' ? ((ph / PI2) % 1) * 2 - 1 : wave === 'tri' ? Math.asin(Math.sin(ph)) * 0.64 : 0;
    b[i] = w * Math.min(1, t / attack) * (tau ? Math.exp(-t / tau) : 1);
  }
  return b;
}
function fade(b, inS = 0.005, outS = 0.02) {
  const a = Math.round(inS * SR), z = Math.round(outS * SR);
  for (let i = 0; i < a && i < b.length; i++) b[i] *= i / a;
  for (let i = 0; i < z && i < b.length; i++) b[b.length - 1 - i] *= i / z;
  return b;
}
function reverb(b, mixAmt = 0.3, size = 1) { // réverbération simple (filtres en peigne)
  const out = new Float32Array(b.length);
  for (const [d, g] of [[0.0297, 0.77], [0.0371, 0.74], [0.0411, 0.72], [0.0437, 0.7]]) {
    const n = Math.round(d * size * SR), c = new Float32Array(b.length);
    for (let i = 0; i < b.length; i++) c[i] = b[i] + (i >= n ? c[i - n] * g : 0);
    for (let i = 0; i < b.length; i++) out[i] += c[i] * 0.25;
  }
  for (let i = 0; i < b.length; i++) b[i] = b[i] * (1 - mixAmt) + out[i] * mixAmt * 1.6;
  return b;
}
const peak = b => { let m = 0; for (let i = 0; i < b.length; i++) m = Math.max(m, Math.abs(b[i])); return m; };

// ---------- Bruitages ----------
function frappe(b, at, g = 1, v = 0) { // une touche de clavier mécanique
  const click = hp(noise(0.03, 0.004), 1800 + v * 600); mix(b, click, at, 0.8 * g);
  const th = tone(120 + v * 25, 0.06, 0.014); mix(b, th, at + 0.002, 0.7 * g);
  mix(b, hp(noise(0.02, 0.003), 2500), at + 0.075, 0.25 * g); // relâchement
}
function clavierRafale(sec, cadence, seed) {
  R = rng(seed); const b = buf(sec + 0.2); let t = 0.05;
  while (t < sec) { frappe(b, t, 0.55 + rnd() * 0.45, sgn()); t += (rnd() < 0.12 ? 0.3 + rnd() * 0.3 : cadence * (0.5 + rnd())); }
  return b;
}
function machineAEcrire(sec) {
  R = rng(7); const b = buf(sec + 1.5); let t = 0.05;
  while (t < sec) { const k = hp(noise(0.04, 0.006), 900); mix(b, k, t, 0.9); mix(b, tone(220, 0.08, 0.02), t, 0.6); mix(b, hp(noise(0.05, 0.01), 3000), t + 0.03, 0.4); t += 0.09 + rnd() * 0.12; }
  const bell = cloche(1500, 1.2, 1); mix(b, bell, sec + 0.05, 0.7);
  return b;
}
function cloche(f, sec, g) {
  const b = buf(sec);
  [[1, 1.4], [2.76, 0.9], [5.4, 0.55], [8.93, 0.3]].forEach(([m, tau], i) => mix(b, tone(f * m, sec, tau), 0, g * [1, 0.6, 0.35, 0.2][i]));
  return b;
}
function gong() {
  const b = buf(4);
  [[1, 3.2, 1], [1.5, 2.6, 0.6], [2.02, 2.2, 0.5], [2.6, 1.6, 0.4], [3.3, 1.2, 0.3]].forEach(([m, tau, a]) => {
    const t = tone(f => 130 * m * (1 + 0.002 * Math.sin(f * 40)), 4, tau, 'sine', 0.01); mix(b, t, 0, a);
  });
  mix(b, lp(noise(0.5, 0.15), 600), 0, 0.5);
  return b;
}
function whoosh(sec, f0, f1, g = 1) {
  const b = noise(sec, 0), n = b.length; let y = 0, z = 0;
  for (let i = 0; i < n; i++) {
    const p = i / n, fc = f0 * Math.pow(f1 / f0, Math.sin(Math.PI * p) ** 0.7); const a = 1 - Math.exp(-PI2 * fc / SR);
    y += a * (b[i] - y); z += a * (y - z); b[i] = (y - z) * 8 * g * Math.sin(Math.PI * p) ** 1.5;
  }
  return b;
}
function impact(sec, f0, f1, boom = 1) {
  const b = buf(sec);
  mix(b, tone(t => f1 + (f0 - f1) * Math.exp(-t * 9), sec, sec / 4, 'sine', 0.001), 0, 1);
  mix(b, lp(noise(0.4, 0.08), 900), 0, 0.9 * boom);
  mix(b, hp(noise(0.05, 0.01), 1500), 0, 0.5);
  return reverb(b, 0.35, 1.6);
}
function riser(sec, up = true) {
  const b = buf(sec), n = noise(sec, 0); let y = 0;
  for (let i = 0; i < b.length; i++) {
    const p = (up ? i : b.length - 1 - i) / b.length, fc = 200 * Math.pow(45, p), a = 1 - Math.exp(-PI2 * fc / SR);
    y += a * (n[i] - y); b[i] = y * p * 2.2;
  }
  const t = tone(f => (up ? 150 * Math.pow(10, f / sec * 0.0 + 0) : 150), sec, 0);
  let ph = 0;
  for (let i = 0; i < b.length; i++) { const p = (up ? i : b.length - 1 - i) / b.length; ph += PI2 * (180 * Math.pow(9, p)) / SR; b[i] += Math.sin(ph) * 0.25 * p; }
  void t;
  return fade(b, 0.01, up ? 0.01 : 0.2);
}
function applaudissements(sec, seed) {
  R = rng(seed); const b = buf(sec); const n = Math.round(sec * 380);
  for (let k = 0; k < n; k++) {
    const t = rnd() * sec, env = Math.min(1, t / 0.5) * Math.min(1, (sec - t) / 1.2);
    if (rnd() > env) continue;
    const c = hp(lp(noise(0.012 + rnd() * 0.01, 0.004), 3500 + rnd() * 2500), 700 + rnd() * 600); mix(b, c, t, 0.5 + rnd() * 0.5);
  }
  return reverb(b, 0.25);
}
function pluie(sec) {
  R = rng(11); const b = hp(lp(noise(sec, 0), 9000), 2500); for (let i = 0; i < b.length; i++) b[i] *= 0.18;
  for (let k = 0; k < sec * 90; k++) mix(b, hp(noise(0.008, 0.002), 3000), rnd() * sec, 0.25 * rnd());
  return fade(b, 0.4, 0.6);
}
function vent(sec) {
  R = rng(5); const n = noise(sec, 0), b = buf(sec); let y = 0, ph = 0;
  for (let i = 0; i < b.length; i++) { ph += PI2 * 0.23 / SR; const fc = 350 + 320 * Math.sin(ph) + 120 * Math.sin(ph * 2.7), a = 1 - Math.exp(-PI2 * Math.max(60, fc) / SR); y += a * (n[i] - y); b[i] = y * 3.2; }
  return fade(b, 0.6, 0.8);
}
function coeur(sec) {
  const b = buf(sec);
  for (let t = 0.1; t < sec - 0.5; t += 0.95) { mix(b, tone(58, 0.2, 0.07), t, 1); mix(b, lp(noise(0.08, 0.02), 250), t, 0.8); mix(b, tone(52, 0.18, 0.06), t + 0.27, 0.7); }
  return b;
}
function appareilPhoto() {
  const b = buf(0.35);
  mix(b, hp(noise(0.012, 0.003), 1800), 0, 0.9); mix(b, tone(700, 0.04, 0.01), 0, 0.5);
  mix(b, lp(noise(0.03, 0.008), 3500), 0.05, 0.9); mix(b, tone(420, 0.05, 0.015), 0.05, 0.6); mix(b, hp(noise(0.01, 0.002), 2500), 0.11, 0.5);
  return b;
}
function sonnerie() {
  const b = buf(3.4);
  for (const t0 of [0.1, 1.8]) for (let k = 0; k < 2; k++) {
    const s = tone(440, 0.4, 0, 'sine', 0.005), s2 = tone(480, 0.4, 0, 'sine', 0.005);
    for (let i = 0; i < s.length; i++) s[i] = (s[i] + s2[i]) * 0.5 * (0.7 + 0.3 * Math.sin(PI2 * 20 * i / SR));
    mix(b, fade(s, 0.01, 0.02), t0 + k * 0.5, 0.8);
  }
  return b;
}
function parasites(sec) { R = rng(21); const b = noise(sec, 0); for (let i = 0; i < b.length; i++) b[i] *= 0.5 * (0.8 + 0.2 * Math.sin(i / SR * 60)); return fade(b, 0.02, 0.05); }
function tictac(sec) {
  const b = buf(sec);
  for (let t = 0.05, k = 0; t < sec - 0.2; t += 0.5, k++) { mix(b, lp(hp(noise(0.012, 0.003), 1200), 4000), t, 0.9); mix(b, tone(k % 2 ? 1900 : 2500, 0.03, 0.007), t, 0.5); }
  return b;
}
function boing() { return fade(tone(t => 180 + 420 * Math.exp(-t * 6) * (1 + 0.15 * Math.sin(t * 60)), 0.8, 0.28, 'sine', 0.003), 0.002, 0.05); }
function pop() { return fade(tone(t => 300 + 900 * (1 - Math.exp(-t * 90)), 0.12, 0.03, 'sine', 0.001), 0.001, 0.01); }
function bip(f, sec) { return fade(tone(f, sec, 0, 'sine', 0.004), 0.005, 0.01); }
function glitch() {
  R = rng(33); const b = buf(0.9); let t = 0;
  while (t < 0.85) { const d = 0.02 + rnd() * 0.05, f = 80 + rnd() * 2400; const s = tone(f, d, 0, rnd() < 0.5 ? 'square' : 'saw'); for (let i = 0; i < s.length; i += 1) s[i] = Math.round(s[i] * 6) / 6; mix(b, s, t, 0.5); if (rnd() < 0.4) mix(b, hp(noise(d, 0), 3000), t, 0.4); t += d + (rnd() < 0.3 ? 0.03 : 0); }
  return b;
}
function erreur() { const b = buf(0.6); for (const t of [0, 0.28]) mix(b, fade(tone(110, 0.22, 0, 'square'), 0.005, 0.02), t, 0.7); return b; }
function succes() { const b = buf(0.8); [523, 659, 784, 1047].forEach((f, i) => { mix(b, tone(f, 0.5, 0.18), i * 0.09, 0.6); mix(b, tone(f * 2, 0.4, 0.1), i * 0.09, 0.15); }); return b; }
function notification() { const b = buf(0.8); mix(b, tone(880, 0.5, 0.16), 0, 0.7); mix(b, tone(1320, 0.5, 0.2), 0.12, 0.6); return b; }
function message() { const b = buf(0.5); mix(b, pop(), 0, 0.8); mix(b, pop(), 0.11, 0.8); return b; }
function sourisClic() { const b = buf(0.15); mix(b, hp(noise(0.01, 0.002), 1500), 0, 0.9); mix(b, tone(900, 0.02, 0.005), 0, 0.5); mix(b, hp(noise(0.008, 0.002), 2200), 0.07, 0.5); return b; }
function subDrop() { return fade(tone(t => 30 + 70 * Math.exp(-t * 2.2), 2, 0.9, 'sine', 0.01), 0.01, 0.1); }
function swish() { return whoosh(0.35, 800, 6000, 1.2); }
function ressortDoor() { const b = buf(0.5); mix(b, tone(t => 90 + 40 * Math.sin(t * 25), 0.4, 0.12, 'saw'), 0, 0.4); mix(b, lp(noise(0.2, 0.05), 500), 0, 0.6); return b; }
function mer() { R = rng(9); const n = noise(8, 0), b = buf(8); let y = 0; for (let i = 0; i < b.length; i++) { const t = i / SR, fc = 400 + 300 * Math.sin(PI2 * 0.12 * t), a = 1 - Math.exp(-PI2 * fc / SR); y += a * (n[i] - y); b[i] = y * 2.4 * (0.55 + 0.45 * Math.sin(PI2 * 0.12 * t - 1)); } return fade(b, 0.8, 1); }
function oiseaux() { R = rng(14); const b = buf(6); for (let k = 0; k < 14; k++) { const t0 = rnd() * 5, f0 = 2400 + rnd() * 1800, n = 2 + Math.floor(rnd() * 4); for (let j = 0; j < n; j++) mix(b, tone(t => f0 + 700 * Math.sin(t * 60) + 400 * Math.exp(-t * 20), 0.08, 0.03, 'sine', 0.004), t0 + j * 0.1, 0.35); } return fade(b, 0.1, 0.3); }
function feu() { R = rng(17); const b = lp(noise(5, 0), 1800); for (let i = 0; i < b.length; i++) b[i] *= 0.25; for (let k = 0; k < 90; k++) mix(b, hp(noise(0.01, 0.003), 1500), rnd() * 5, 0.5 * rnd()); return fade(b, 0.4, 0.6); }


// ---------- Pack 2 : jeu vidéo, télé, magie, transitions ----------
function sq(f, sec, tau) { return fade(tone(f, sec, tau, 'square', 0.002), 0.002, 0.01); }
function seq(notes, d, wave = 'square', g = 0.5) { const b = buf(notes.length * d + 0.3); notes.forEach((f, i) => mix(b, fade(tone(f, d * 1.1, d * 0.8, wave, 0.002), 0.002, 0.01), i * d, g)); return b; }
function pieceJeu() { const b = buf(0.6); mix(b, sq(988, 0.08, 0), 0, 0.5); mix(b, sq(1319, 0.45, 0.15), 0.08, 0.5); return b; }
function saut() { return fade(tone(t => 300 + 900 * t / 0.25, 0.25, 0, 'square', 0.002), 0.002, 0.03); }
function laser() { return fade(tone(t => 2200 * Math.exp(-t * 9) + 200, 0.35, 0.15, 'saw', 0.001), 0.001, 0.02); }
function teleport() { const b = buf(1.2); for (let k = 0; k < 5; k++) mix(b, tone(t => 400 + 1600 * t + 300 * Math.sin(t * 90 + k), 1, 0.3, 'sine', 0.01), k * 0.04, 0.25); return fade(b, 0.01, 0.2); }
function caisse() { const b = buf(1.4); mix(b, hp(noise(0.05, 0.01), 2000), 0, 0.6); mix(b, cloche(2637, 1.2, 0.6), 0.06, 0.8); for (let k = 0; k < 5; k++) mix(b, tone(4200 + k * 330, 0.12, 0.04), 0.1 + k * 0.05, 0.25); return b; }
function pieces() { R = rng(41); const b = buf(1.2); for (let k = 0; k < 9; k++) mix(b, tone(3000 + rnd() * 2500, 0.2, 0.05 + rnd() * 0.05), rnd() * 0.8, 0.3); return b; }
function roulement(sec) {
  const b = buf(sec + 2.2);
  for (let t = 0; t < sec; t += 0.035) mix(b, hp(noise(0.06, 0.02), 900), t, 0.25 + 0.6 * t / sec);
  mix(b, hp(noise(2, 0.6), 3500), sec, 0.9); mix(b, tone(190, 0.15, 0.05), sec, 0.5);
  return b;
}
function cymbale() { return hp(noise(2.5, 0.7), 4000); }
function rimshot() { const b = buf(1.6); mix(b, mix0(tone(t => 160 * (1 + Math.exp(-t * 30)), 0.3, 0.1), lp(noise(0.08, 0.02), 900), 0.4), 0, 0.8); mix(b, mix0(tone(t => 110 * (1 + Math.exp(-t * 30)), 0.35, 0.12), lp(noise(0.08, 0.02), 700), 0.4), 0.18, 0.8); mix(b, hp(noise(1.2, 0.35), 5000), 0.42, 0.8); return b; }
function tonnerre() { R = rng(19); const b = lp(noise(6, 1.6), 300); mix(b, hp(noise(0.3, 0.08), 1200), 0, 0.8); for (let k = 0; k < 6; k++) mix(b, lp(noise(0.8, 0.3), 150), 0.3 + rnd() * 3, 0.8); return fade(reverb(b, 0.4, 2), 0.005, 1); }
function cymbaleInverse() { const b = cymbale(); b.reverse(); return fade(b, 0.3, 0.01); }
function flashCharge() { const b = buf(1.4); mix(b, fade(tone(t => 1800 + 4000 * t, 1, 0, 'sine', 0.01), 0.05, 0.05), 0, 0.25); mix(b, hp(noise(0.02, 0.004), 1800), 1.05, 0.9); mix(b, lp(noise(0.05, 0.01), 3000), 1.07, 0.6); return b; }
function texteTick(n) { const b = buf(n * 0.07 + 0.2); for (let k = 0; k < n; k++) mix(b, hp(noise(0.006, 0.0015), 3000), k * 0.07, 0.8); return b; }
function compteBips() { const b = buf(3.8); for (let k = 0; k < 3; k++) mix(b, bip(880, 0.12), k, 0.7); mix(b, bip(1760, 0.8), 3, 0.7); return b; }
function buzzer() { const b = fade(tone(110, 0.9, 0, 'saw', 0.005), 0.01, 0.05); mix(b, tone(116, 0.9, 0, 'square', 0.005), 0, 0.4); return lp(b, 2000); }
function bonneReponse() { const b = buf(1.2); mix(b, cloche(1319, 1, 0.5), 0, 0.7); mix(b, cloche(1760, 1, 0.5), 0.15, 0.7); return b; }
function magie() { R = rng(51); const b = buf(2); for (let k = 0; k < 40; k++) { const t = k * 0.035 + rnd() * 0.02; mix(b, tone(2000 + rnd() * 3500 + k * 40, 0.4, 0.12), t, 0.18); } return reverb(b, 0.4, 1.4); }
function bulleEau() { return fade(tone(t => 300 + 1400 * t / 0.12, 0.14, 0.05, 'sine', 0.002), 0.002, 0.02); }
function sonar() { return reverb(tone(1450, 1.8, 0.45, 'sine', 0.003), 0.5, 2); }
function grillons(sec) { R = rng(61); const b = buf(sec); for (let t = 0.1; t < sec - 0.3; t += 0.45 + rnd() * 0.4) for (let k = 0; k < 3; k++) mix(b, tone(4400, 0.03, 0.012, 'sine', 0.002), t + k * 0.05, 0.25); mix(b, lp(noise(sec, 0), 600), 0, 0.03); return fade(b, 0.3, 0.5); }
function rewind() { R = rng(71); const b = buf(1.6); let t = 0; while (t < 1.4) { mix(b, tone(f => 600 + 2500 * (t / 1.4) + 300 * Math.sin(f * 50), 0.05, 0.02, 'saw', 0.002), t, 0.18); t += 0.018; } mix(b, hp(noise(1.5, 0), 3000), 0, 0.12); return fade(b, 0.02, 0.05); }
function scratch() { R = rng(81); const b = buf(0.9); const n = noise(0.9, 0); let y = 0; for (let i = 0; i < b.length; i++) { const t = i / SR, fc = 400 + 2600 * Math.abs(Math.sin(t * 14)), a = 1 - Math.exp(-PI2 * fc / SR); y += a * (n[i] - y); b[i] = y * 3 * Math.abs(Math.sin(t * 14)); } return fade(b, 0.005, 0.05); }
function arretDisque() { return fade(tone(t => 520 * Math.max(0.05, 1 - t / 0.9), 1, 0, 'saw', 0.002), 0.002, 0.1); }
function boomTransition() { const b = impact(2.2, 90, 32, 1.2); mix(b, whoosh(0.4, 300, 3000, 0.6), 0, 0.5); return b; }
function swipeUi() { return whoosh(0.22, 1200, 8000, 1); }
function bloup() { return fade(tone(t => 700 - 500 * t / 0.18, 0.18, 0.08, 'sine', 0.002), 0.002, 0.02); }


// ---------- Argent, humeurs, infos (liés aux animations du studio) ----------
function cascadePieces(sec, seed, dens) {
  R = rng(seed); const b = buf(sec);
  for (let k = 0, n = Math.round(sec * dens); k < n; k++) {
    const t = rnd() * sec * 0.92, env = Math.min(1, t / 0.15) * Math.min(1, (sec - t) / 0.6);
    mix(b, tone(2800 + rnd() * 3200, 0.25, 0.05 + rnd() * 0.06), t, 0.25 * env); mix(b, hp(noise(0.01, 0.003), 3500), t, 0.15 * env);
  }
  return reverb(b, 0.15);
}
function sonHausse() { // arpège brillant qui monte, souffle montant, pluie de pièces : « ça grimpe »
  const b = buf(2.4);
  [659, 784, 988, 1319, 1568].forEach((f, i) => { mix(b, cloche(f, 0.9, 0.5), i * 0.11, 0.7); mix(b, tone(f / 2, 0.5, 0.2, 'tri'), i * 0.11, 0.35); });
  mix(b, riser(0.7, true), 0, 0.35); mix(b, cloche(2093, 1.4, 0.5), 0.62, 0.6); mix(b, cascadePieces(1.0, 5, 40), 0.7, 0.5);
  return b;
}
function sonBaisse() { // notes qui descendent en mineur puis grave qui s'écrase : « ça chute »
  const b = buf(2.6);
  [[392, 0], [349, 0.28], [311, 0.56], [247, 0.9]].forEach(([f, t]) => mix(b, lp(tone(f, 0.7, 0.35, 'saw', 0.004), 1500), t, 0.45));
  mix(b, tone(t => 70 * Math.exp(-t * 0.8), 1.6, 0.7, 'sine', 0.01), 0.9, 0.9); mix(b, impact(1.4, 110, 35, 1), 0.95, 0.5);
  return b;
}
function krach() { // alarme de marché puis effondrement
  const b = buf(3.2);
  for (let k = 0; k < 3; k++) mix(b, bip(1000, 0.12), k * 0.2, 0.5);
  mix(b, lp(tone(t => 1200 * Math.exp(-t * 1.8) + 60, 1.8, 0, 'saw', 0.005), 2500), 0.7, 0.45); mix(b, impact(1.8, 100, 30, 1.2), 0.75, 0.7);
  return b;
}
function sonJackpot() { // rouleaux de machine à sous qui ralentissent, trois arrêts, fanfare et pluie de pièces
  R = rng(33); const b = buf(4.4);
  for (let t = 0, d = 0.04; t < 1.6; t += d, d *= 1.07) { mix(b, hp(noise(0.012, 0.003), 1500), t, 0.5); mix(b, tone(220 + t * 300, 0.03, 0.01, 'square'), t, 0.15); }
  [1.7, 2.0, 2.3].forEach((x, i) => mix(b, cloche(1047 * Math.pow(1.26, i), 0.8, 0.5), x, 0.8));
  [523, 659, 784, 1047].forEach(f => mix(b, lp(tone(f, 1.6, 0.6, 'saw', 0.01), 2800), 2.55, 0.22));
  mix(b, cascadePieces(1.8, 9, 70), 2.5, 0.8); mix(b, cloche(2093, 1.5, 0.5), 2.55, 0.5);
  return b;
}
function sonRiche() { const b = buf(3.2); mix(b, caisse(), 0, 0.9); mix(b, cascadePieces(2.4, 12, 55), 0.35, 0.7); return b; }
function trombone() { // « wah wah wah waaah » de l'échec
  const b = buf(2.9);
  [[311, 0, 0.45], [294, 0.55, 0.45], [277, 1.1, 0.45], [233, 1.65, 1.05]].forEach(([f, t, d], i) => mix(b, lp(fade(tone(x => f * (i === 3 ? 1 - 0.06 * x : 1) * (1 + 0.012 * Math.sin(x * 38)), d + 0.1, i === 3 ? 0.9 : 0.35, 'saw', 0.03), 0.03, 0.08), 1400), t, 0.5));
  return b;
}
function fanfare() {
  const b = buf(2.8);
  [[523, 0], [659, 0.18], [784, 0.36], [1047, 0.6]].forEach(([f, t]) => { const d = t === 0.6 ? 1.8 : 0.22; mix(b, lp(tone(f, d, 0, 'saw', 0.01), 3000), t, 0.3); mix(b, tone(f * 2, d, 0, 'square', 0.01), t, 0.07); });
  mix(b, hp(noise(1.6, 0.5), 4000), 0.6, 0.3);
  return reverb(b, 0.2);
}
function tada() {
  const b = buf(1.9);
  [392, 523, 659].forEach(f => mix(b, lp(tone(f, 0.2, 0, 'saw', 0.005), 3200), 0, 0.3));
  [523, 659, 784, 1047].forEach(f => mix(b, lp(tone(f, 1.4, 0.7, 'saw', 0.01), 3200), 0.22, 0.28));
  mix(b, magie(), 0.25, 0.4);
  return b;
}
function sonBreaking() { // signal d'édition spéciale : trois impulsions qui montent, impact et souffle
  const b = buf(2.4);
  [440, 554, 659].forEach((f, i) => mix(b, lp(tone(f, 0.16, 0, 'square', 0.003), 3500), i * 0.17, 0.4));
  mix(b, tone(880, 0.5, 0.25, 'saw'), 0.55, 0.35); mix(b, impact(1.2, 120, 40, 1), 0.55, 0.8); mix(b, whoosh(0.5, 300, 5000, 0.7), 0.5, 0.5);
  return b;
}
function cuivres(freqs, sec, g = 1) { // accord de cuivres synthétiques : dents de scie filtrées, attaque franche
  const b = buf(sec);
  for (const f of freqs) { mix(b, lp(tone(f, sec, sec * 0.5, 'saw', 0.004), 2600), 0, 0.3 * g); mix(b, lp(tone(f * 1.005, sec, sec * 0.5, 'saw', 0.004), 2200), 0, 0.2 * g); }
  return b;
}
function genereriqueInfo() { // générique d'édition spéciale (7,6 s) : montée, frappe, motif rythmé, impact, accord final, souffle de sortie ; création originale
  const b = buf(7.6), re = [293.7, 440, 587.3, 740], mi = [329.6, 493.9, 659.3, 830.6];
  mix(b, riser(0.8, true), 0, 0.8); mix(b, whoosh(0.6, 300, 4500, 0.9), 0.1, 0.7);
  mix(b, impact(1.6, 120, 40, 1.4), 0.75, 1); mix(b, cuivres(re, 1.2, 1.1), 0.78, 1);
  mix(b, hp(noise(0.2, 0.06), 3000), 0.75, 0.6);
  // motif rythmé « ta-ta-ta-TAA » sur deux accords, puis réponse plus haute
  const motif = [[0, 0.14], [0.18, 0.14], [0.36, 0.14], [0.54, 0.5]];
  motif.forEach(([t, d], i) => mix(b, cuivres(i < 3 ? [146.8, 220, 293.7] : re, d + 0.1, 0.9), 1.9 + t, 0.9));
  motif.forEach(([t, d], i) => mix(b, cuivres(i < 3 ? [164.8, 247, 329.6] : mi, d + 0.1, 0.9), 2.7 + t, 0.9));
  // pulsation grave et notes de basse qui tiennent le premier plan
  for (let k = 0; k < 8; k++) mix(b, tone(73.4, 0.3, 0.12, 'sine', 0.003), 0.8 + k * 0.45, 0.8);
  mix(b, whoosh(0.7, 5000, 400, 0.8), 3.0, 0.8); // le plein écran se réduit en bas d'écran
  mix(b, impact(0.9, 150, 60, 0.7), 3.55, 0.7); mix(b, cloche(1760, 0.8, 0.4), 3.6, 0.6);
  for (let k = 0; k < 6; k++) mix(b, hp(noise(0.006, 0.0015), 3500), 3.9 + k * 0.5, 0.35); // tic-tac du bas d'écran
  mix(b, whoosh(0.6, 400, 5000, 0.8), 7.0, 0.7);
  return reverb(b, 0.25, 1.2);
}
// ---- Sons de transition (packs de montage) : un son par type de coupe, pic au milieu pour tomber sur le raccord ----
function trWhooshLong() { const b = buf(1.2); mix(b, whoosh(1.1, 250, 7000, 1), 0, 0.9); mix(b, impact(0.5, 100, 45, 0.6), 0.55, 0.5); return b; }
function trCinema() { const b = buf(2.4); mix(b, riser(0.9, true), 0, 0.7); mix(b, impact(1.6, 90, 32, 1.5), 0.85, 1); mix(b, cuivres([110, 164.8, 220], 1.2, 0.8), 0.88, 0.7); return reverb(b, 0.35, 1.5); }
function trGlitch() { const b = buf(0.9); for (let k = 0; k < 14; k++) mix(b, hp(noise(0.03 + rnd() * 0.04, 0.02), 1200 + rnd() * 3000), k * 0.05 + rnd() * 0.03, 0.55); mix(b, tone(t => 1800 - 1500 * t, 0.5, 0.2, 'square', 0.002), 0.15, 0.35); mix(b, impact(0.4, 160, 60, 0.7), 0.5, 0.6); return b; }
function trPop() { const b = buf(0.5); mix(b, whoosh(0.3, 600, 5000, 0.8), 0, 0.7); mix(b, pop(), 0.25, 0.9); return b; }
function trObturateur() { const b = buf(0.8); mix(b, hp(noise(0.02, 0.005), 2500), 0, 0.9); mix(b, tone(2400, 0.04, 0.01), 0.01, 0.4); mix(b, hp(noise(0.03, 0.008), 1800), 0.12, 0.7); mix(b, whoosh(0.5, 3000, 500, 0.6), 0.2, 0.4); return b; }
function trRewind() { const b = buf(1.2); mix(b, tone(t => 3200 - 2600 * t, 1.0, 0, 'saw', 0.01), 0, 0.22); mix(b, hp(noise(1.0, 0), 2500), 0, 0.2); return fade(lp(b, 6000), 0.02, 0.15); }
function trChoc() { const b = buf(1.5); mix(b, impact(1.4, 130, 38, 2), 0, 1); mix(b, hp(noise(0.12, 0.03), 2000), 0, 0.7); mix(b, lp(noise(1.2, 0.5), 200), 0.02, 0.6); return b; }
function trDing() { const b = buf(1.4); mix(b, whoosh(0.4, 400, 6000, 0.7), 0, 0.5); mix(b, cloche(1568, 1.1, 0.5), 0.3, 0.7); mix(b, cloche(2349, 1, 0.35), 0.34, 0.5); return b; }
// ---- Sons de vlog : cordes pincées (Karplus-Strong), souffles doux, clics d'interface ----
function pincee(f, sec, amort = 0.996) { const n = Math.round(SR / f), b = buf(sec), ligne = new Float32Array(n); for (let i = 0; i < n; i++) ligne[i] = sgn(); let p = 0, prev = 0; for (let i = 0; i < b.length; i++) { const x = ligne[p]; b[i] = x; const y = amort * 0.5 * (x + prev); prev = x; ligne[p] = y; p = (p + 1) % n; } return fade(b, 0.001, 0.05); }
function vlPizz(notes, pas, g = 0.6) { const b = buf(notes.length * pas + 1.2); notes.forEach((f, i) => mix(b, pincee(f, 1.1, 0.995), i * pas, g)); return reverb(b, 0.2, 1); }
function vlSouffle() { const b = buf(0.9); mix(b, whoosh(0.8, 500, 3500, 0.7), 0, 0.6); mix(b, hp(noise(0.5, 0.25), 6000), 0.2, 0.12); return reverb(b, 0.2, 1); }
function vlClic() { const b = buf(0.3); mix(b, hp(noise(0.012, 0.003), 2500), 0, 0.7); mix(b, tone(1500, 0.05, 0.015), 0.002, 0.35); mix(b, tone(2300, 0.04, 0.01), 0.07, 0.25); return b; }
function vlCloche() { const b = buf(2); mix(b, cloche(1319, 1.8, 0.5), 0, 0.7); mix(b, cloche(1976, 1.6, 0.3), 0.01, 0.4); return reverb(b, 0.3, 1.4); }
function vlPage() { const b = buf(0.7); mix(b, hp(lp(noise(0.5, 0.14), 6500), 900), 0, 0.5); mix(b, whoosh(0.35, 700, 2500, 0.5), 0.03, 0.4); return b; }
// ---- Jingles de podcast (créations originales) : accord de pad, arpège de cordes pincées, cloches ----
function podPad(freqs, sec, g) { const b = buf(sec); for (const f of freqs) mix(b, fade(lp(tone(f, sec, 0, 'saw', 0.9), 1700), 0.9, 1.3), 0, g); return b; }
function podIntro() { const b = buf(5.6); mix(b, podPad([130.8, 196, 261.6, 329.6, 392, 493.9], 5, 0.12), 0, 1);
  [523.3, 659.3, 784, 987.8, 1174.7, 1318.5, 1568].forEach((f, i) => mix(b, pincee(f, 1.3, 0.996), 0.5 + i * 0.16, 0.55));
  for (const k of [0.5, 1.3, 2.1, 2.9]) mix(b, tone(t => 60 + 80 * Math.exp(-t * 25), 0.3, 0.1, 'sine', 0.002), k, 0.6);
  mix(b, cloche(1046.5, 3, 0.5), 2.2, 0.5); mix(b, cloche(1568, 2.5, 0.35), 2.25, 0.4); mix(b, whoosh(0.7, 300, 4000, 0.7), 0, 0.5); return reverb(b, 0.3, 1.3); }
function podOutro() { const b = buf(6.5); mix(b, podPad([130.8, 164.8, 196, 261.6, 329.6], 5.5, 0.12), 0.2, 1);
  [1568, 1318.5, 1174.7, 987.8, 784, 659.3, 523.3].forEach((f, i) => mix(b, pincee(f, 1.3, 0.996), i * 0.2, 0.5));
  mix(b, cloche(523.3, 4, 0.5), 1.5, 0.55); mix(b, cloche(1046.5, 3.5, 0.3), 1.52, 0.4); for (const k of [0, 0.8, 1.6]) mix(b, tone(t => 60 + 80 * Math.exp(-t * 25), 0.3, 0.1, 'sine', 0.002), k, 0.5); return reverb(b, 0.35, 1.4); }
function podRubrique() { const b = buf(1.8); [[784, 0], [1046.5, 0.16], [1318.5, 0.32]].forEach(([f, t]) => { mix(b, tone(f, 0.5, 0.12, 'sine', 0.002), t, 0.5); mix(b, tone(f * 3, 0.2, 0.04, 'sine', 0.002), t, 0.15); }); mix(b, whoosh(0.5, 400, 3500, 0.5), 0, 0.4); return reverb(b, 0.25, 1); }
function podPing() { const b = buf(1.4); mix(b, cloche(1760, 1.2, 0.5), 0, 0.7); mix(b, cloche(2637, 1, 0.25), 0.02, 0.4); return b; }
// ---- Sons tech et finance ----
function techBoot() { const b = buf(1.8); [523.3, 659.3, 784, 1046.5].forEach((f, i) => { mix(b, tone(f, 0.5, 0.14, 'sine', 0.003), i * 0.09, 0.45); mix(b, tone(f * 2, 0.3, 0.07, 'tri', 0.003), i * 0.09, 0.2); }); mix(b, whoosh(0.6, 300, 5000, 0.5), 0, 0.4); return reverb(b, 0.25, 1); }
function techBip() { const b = buf(0.5); mix(b, fade(tone(1760, 0.06, 0, 'square', 0.002), 0.002, 0.01), 0, 0.35); mix(b, fade(tone(2349, 0.09, 0, 'square', 0.002), 0.002, 0.02), 0.08, 0.3); return lp(b, 5000); }
function techScan() { const b = buf(1.2); mix(b, fade(tone(t => 300 + 3200 * Math.pow(t / 1.0, 2), 1.0, 0, 'saw', 0.01), 0.02, 0.15), 0, 0.22); mix(b, hp(noise(1.0, 0), 5000), 0, 0.08); mix(b, tone(3600, 0.12, 0.04), 1.0, 0.3); return lp(b, 7000); }
function finCloche() { const b = buf(3.2); for (const t of [0, 0.7, 1.4]) { mix(b, cloche(659.3, 2.2, 0.6), t, 0.7); mix(b, cloche(1318.5, 1.6, 0.3), t + 0.01, 0.4); } return reverb(b, 0.3, 1.4); }
function finTicker() { R = rng(77); const b = buf(1.6); for (let k = 0; k < 26; k++) mix(b, hp(noise(0.012, 0.003), 3000 + rnd() * 2000), k * 0.055 + rnd() * 0.012, 0.35 + rnd() * 0.3); return b; }
// ---- Sons de vlog et de podcast (suite) ----
function vlRecStart() { const b = buf(0.6); mix(b, fade(tone(1568, 0.14, 0, 'sine', 0.003), 0.003, 0.03), 0, 0.5); mix(b, hp(noise(0.012, 0.003), 2500), 0.17, 0.5); mix(b, tone(120, 0.1, 0.03), 0.17, 0.3); return b; }
function vlRecStop() { const b = buf(0.7); mix(b, fade(tone(1175, 0.1, 0, 'sine', 0.003), 0.003, 0.03), 0, 0.5); mix(b, fade(tone(880, 0.14, 0, 'sine', 0.003), 0.003, 0.04), 0.14, 0.5); mix(b, hp(noise(0.012, 0.003), 2500), 0.33, 0.4); return b; }
function vlTitrePop() { const b = buf(0.7); mix(b, whoosh(0.35, 500, 4200, 0.5), 0, 0.5); mix(b, pop(), 0.22, 0.7); mix(b, cloche(2093, 0.4, 0.2), 0.24, 0.3); return reverb(b, 0.18, 1); }
function podJingleCourt() { const b = buf(3.2); [523.3, 659.3, 784, 1046.5].forEach((f, i) => mix(b, pincee(f, 1.1, 0.996), i * 0.13, 0.55)); mix(b, podPad([261.6, 329.6, 392, 523.3], 2.6, 0.12), 0.1, 1); mix(b, cloche(1568, 2, 0.4), 0.55, 0.5); mix(b, tone(t => 60 + 80 * Math.exp(-t * 25), 0.3, 0.1, 'sine', 0.002), 0.5, 0.5); return reverb(b, 0.3, 1.2); }
function podAmbiance() { R = rng(88); const b = lp(noise(8, 0), 500); for (let i = 0; i < b.length; i++) b[i] *= 0.07 * (0.8 + 0.2 * Math.sin(i / SR * PI2 * 0.25)); mix(b, tone(120, 8, 0, 'sine', 0.5), 0, 0.02); return fade(b, 1, 1); }
function sirene() { const b = fade(lp(tone(t => 900 + 300 * Math.sin(t * PI2 * 1.3), 2.6, 0, 'tri', 0.02), 2600), 0.02, 0.15); for (let i = 0; i < b.length; i++) b[i] *= 0.55 + 0.45 * Math.sin(i / SR * PI2 * 5); return b; }
function joie() { // petit jingle joyeux
  const b = buf(1.8);
  [523, 587, 659, 784, 659, 784, 1047].forEach((f, i) => { mix(b, tone(f, 0.5, 0.14), i * 0.1, 0.55); mix(b, tone(f * 2, 0.3, 0.07), i * 0.1, 0.2); });
  return b;
}
function tristesse() { // notes de piano qui descendent, longues et mélancoliques
  const b = buf(3.6);
  [330, 294, 262, 247].forEach((f, i) => { mix(b, tone(f, 1.6, 0.8), i * 0.7, 0.6); mix(b, tone(f * 2.003, 1, 0.3), i * 0.7, 0.2); });
  return reverb(lp(b, 3500), 0.3, 1.4);
}
function colere() { // grondement grave haché puis coup
  R = rng(77); const b = buf(1.8);
  const g = lp(tone(72, 1.5, 0.9, 'saw', 0.01), 700); for (let i = 0; i < g.length; i++) g[i] *= 0.6 + 0.4 * Math.sin(i / SR * PI2 * 26);
  mix(b, g, 0, 0.9); mix(b, lp(noise(1.4, 0.6), 900), 0, 0.5); mix(b, impact(1.2, 140, 40, 1), 0.9, 0.8);
  return b;
}
function amour() { const b = buf(2.2); mix(b, cloche(1319, 1.4, 0.5), 0, 0.7); mix(b, cloche(1976, 1.6, 0.5), 0.25, 0.7); mix(b, magie(), 0.1, 0.25); return reverb(b, 0.25); }
function choc() { // note stridente qui monte puis coup sec
  const b = buf(1.4);
  [740, 784, 831, 988].forEach(f => mix(b, lp(tone(t => f * (1 + 0.35 * Math.min(1, t / 0.5)), 0.7, 0.3, 'saw', 0.004), 4000), 0, 0.22));
  mix(b, impact(0.9, 160, 45, 1), 0.45, 0.8);
  return b;
}

const SONS = [
  ['clavier-frappe', 'Touche de clavier', 'Bureau et clavier', () => { const b = buf(0.25); frappe(b, 0.02); return b; }],
  ['clavier-frappe-douce', 'Touche de clavier douce', 'Bureau et clavier', () => { const b = buf(0.25); frappe(b, 0.02, 0.5, -1); return lp(b, 4500); }],
  ['clavier-rafale', 'Frappe rapide au clavier (4 s)', 'Bureau et clavier', () => clavierRafale(4, 0.085, 3)],
  ['clavier-lent', 'Frappe lente au clavier (4 s)', 'Bureau et clavier', () => clavierRafale(4, 0.2, 4)],
  ['clavier-long', 'Frappe au clavier (8 s)', 'Bureau et clavier', () => clavierRafale(8, 0.11, 5)],
  ['machine-a-ecrire', 'Machine à écrire et sonnette', 'Bureau et clavier', () => machineAEcrire(3)],
  ['souris-clic', 'Clic de souris', 'Bureau et clavier', sourisClic],
  ['appareil-photo', 'Appareil photo (déclic)', 'Bureau et clavier', appareilPhoto],
  ['horloge-tictac', 'Horloge (tic-tac, 4 s)', 'Bureau et clavier', () => tictac(4)],
  ['telephone-sonnerie', 'Sonnerie de téléphone', 'Bureau et clavier', sonnerie],
  ['whoosh-court', 'Whoosh court', 'Transitions et mouvements', () => whoosh(0.5, 400, 5000)],
  ['whoosh-long', 'Whoosh long', 'Transitions et mouvements', () => whoosh(1.4, 250, 6500, 1.1)],
  ['swish-rapide', 'Swish rapide', 'Transitions et mouvements', swish],
  ['montee-tension', 'Montée de tension (4 s)', 'Transitions et mouvements', () => riser(4, true)],
  ['montee-courte', 'Montée courte (2 s)', 'Transitions et mouvements', () => riser(2, true)],
  ['descente', 'Descente (2,5 s)', 'Transitions et mouvements', () => riser(2.5, false)],
  ['glitch', 'Glitch numérique', 'Transitions et mouvements', glitch],
  ['impact-leger', 'Impact léger', 'Impacts', () => impact(1.2, 140, 55, 0.6)],
  ['impact-cinema', 'Impact cinéma', 'Impacts', () => impact(2.8, 110, 38, 1)],
  ['sub-drop', 'Chute de graves (sub drop)', 'Impacts', subDrop],
  ['gong', 'Gong', 'Impacts', gong],
  ['battement-coeur', 'Battements de cœur (4 s)', 'Impacts', () => coeur(4.2)],
  ['notification', 'Notification', 'Alertes et interface', notification],
  ['message', 'Message reçu (pop-pop)', 'Alertes et interface', message],
  ['succes', 'Succès', 'Alertes et interface', succes],
  ['erreur', 'Erreur', 'Alertes et interface', erreur],
  ['pop', 'Pop (bulle)', 'Alertes et interface', pop],
  ['ding-cloche', 'Cloche (ding)', 'Alertes et interface', () => cloche(1760, 2.5, 0.8)],
  ['bip-censure', 'Bip de censure (1 s)', 'Alertes et interface', () => bip(1000, 1)],
  ['boing', 'Boing', 'Humour', boing],
  ['ressort-porte', 'Porte qui grince', 'Humour', ressortDoor],
  ['applaudissements', 'Applaudissements (5 s)', 'Ambiances', () => applaudissements(5, 2)],
  ['applaudissements-courts', 'Applaudissements courts (2 s)', 'Ambiances', () => applaudissements(2, 3)],
  ['pluie', 'Pluie (6 s)', 'Ambiances', () => pluie(6)],
  ['vent', 'Vent (7 s)', 'Ambiances', () => vent(7)],
  ['mer', 'Vagues (8 s)', 'Ambiances', mer],
  ['oiseaux', 'Oiseaux (6 s)', 'Ambiances', oiseaux],
  ['feu', 'Feu de cheminée (5 s)', 'Ambiances', feu],
  ['parasites-tv', 'Parasites de télévision (2 s)', 'Ambiances', () => parasites(2)],
  ['grillons', 'Grillons, nuit d’été (6 s)', 'Ambiances', () => grillons(6)],
  ['tonnerre', 'Tonnerre', 'Ambiances', tonnerre],
  ['boom-transition', 'Boom de transition', 'Transitions et mouvements', boomTransition],
  ['cymbale-inverse', 'Cymbale inversée (montée)', 'Transitions et mouvements', cymbaleInverse],
  ['swipe', 'Glissement d’écran (swipe)', 'Transitions et mouvements', swipeUi],
  ['rembobinage', 'Rembobinage de cassette', 'Transitions et mouvements', rewind],
  ['scratch', 'Scratch de vinyle', 'Transitions et mouvements', scratch],
  ['arret-disque', 'Disque qui s’arrête', 'Transitions et mouvements', arretDisque],
  ['texte-tick', 'Texte qui s’affiche (ticks)', 'Alertes et interface', () => texteTick(12)],
  ['compte-a-rebours', 'Compte à rebours (3 bips + top)', 'Alertes et interface', compteBips],
  ['flash-photo', 'Flash photo (charge et déclic)', 'Alertes et interface', flashCharge],
  ['sonar', 'Sonar (ping)', 'Alertes et interface', sonar],
  ['bulle-eau', 'Bulle (bloup)', 'Alertes et interface', bulleEau],
  ['bloup', 'Bloup descendant', 'Alertes et interface', bloup],
  ['roulement-tambour', 'Roulement de tambour et cymbale', 'Télé et spectacle', () => roulement(2.5)],
  ['ba-dum-tss', 'Ba-dum-tss (blague)', 'Télé et spectacle', rimshot],
  ['cymbale', 'Cymbale', 'Télé et spectacle', cymbale],
  ['bonne-reponse', 'Bonne réponse', 'Télé et spectacle', bonneReponse],
  ['mauvaise-reponse', 'Mauvaise réponse (buzzer)', 'Télé et spectacle', buzzer],
  ['caisse', 'Caisse enregistreuse (argent)', 'Télé et spectacle', caisse],
  ['pieces', 'Pièces de monnaie', 'Télé et spectacle', pieces],
  ['magie', 'Magie (scintillement)', 'Télé et spectacle', magie],
  ['piece-jeu', 'Pièce de jeu vidéo', 'Jeu vidéo', pieceJeu],
  ['saut-jeu', 'Saut de jeu vidéo', 'Jeu vidéo', saut],
  ['niveau-suivant', 'Niveau suivant', 'Jeu vidéo', () => seq([523, 659, 784, 1047, 1319], 0.08)],
  ['game-over', 'Partie perdue', 'Jeu vidéo', () => seq([392, 370, 349, 330], 0.22, 'square', 0.45)],
  ['laser', 'Laser', 'Jeu vidéo', laser],
  ['teleportation', 'Téléportation', 'Jeu vidéo', teleport],
  ['hausse', 'Hausse (ça monte)', 'Argent et bourse', sonHausse],
  ['baisse', 'Baisse (ça chute)', 'Argent et bourse', sonBaisse],
  ['krach-bourse', 'Krach (alarme et effondrement)', 'Argent et bourse', krach],
  ['jackpot', 'Jackpot (machine à sous)', 'Argent et bourse', sonJackpot],
  ['riche', 'Riche (caisse et pluie de pièces)', 'Argent et bourse', sonRiche],
  ['trombone-triste', 'Trombone de l’échec', 'Humeurs', trombone],
  ['joie', 'Joie (jingle)', 'Humeurs', joie],
  ['tristesse', 'Tristesse (piano)', 'Humeurs', tristesse],
  ['colere', 'Colère (grondement)', 'Humeurs', colere],
  ['amour', 'Amour (cloches douces)', 'Humeurs', amour],
  ['choc', 'Choc (note stridente)', 'Humeurs', choc],
  ['fanfare', 'Fanfare de victoire', 'Télé et spectacle', fanfare],
  ['tada', 'Ta-dam !', 'Télé et spectacle', tada],
  ['breaking-news', 'Édition spéciale (signal)', 'Télé et spectacle', sonBreaking],
  ['tr-whoosh-long', 'Transition : grand whoosh', 'Transitions', trWhooshLong],
  ['tr-cinema', 'Transition : montée et impact cinéma', 'Transitions', trCinema],
  ['tr-glitch', 'Transition : glitch numérique', 'Transitions', trGlitch],
  ['tr-pop', 'Transition : swipe et pop', 'Transitions', trPop],
  ['tr-obturateur', 'Transition : obturateur photo', 'Transitions', trObturateur],
  ['tr-rewind', 'Transition : retour en arrière', 'Transitions', trRewind],
  ['tr-choc', 'Transition : onde de choc', 'Transitions', trChoc],
  ['tr-ding', 'Transition : flash scintillant', 'Transitions', trDing],
  ['vl-pizz-gai', 'Vlog : cordes pincées joyeuses', 'Vlog', () => vlPizz([392, 494, 587, 784], 0.09)],
  ['vl-pizz-doux', 'Vlog : cordes pincées douces', 'Vlog', () => vlPizz([330, 392, 494], 0.14, 0.5)],
  ['vl-souffle', 'Vlog : souffle de transition', 'Vlog', vlSouffle],
  ['vl-clic', 'Vlog : clic d’interface', 'Vlog', vlClic],
  ['vl-cloche', 'Vlog : cloche légère', 'Vlog', vlCloche],
  ['vl-page', 'Vlog : page qui tourne', 'Vlog', vlPage],
  ['pod-jingle-intro', 'Podcast : jingle d’introduction', 'Podcast', podIntro],
  ['pod-jingle-outro', 'Podcast : jingle de fin', 'Podcast', podOutro],
  ['pod-rubrique', 'Podcast : changement de rubrique', 'Podcast', podRubrique],
  ['pod-ping', 'Podcast : ping de notification', 'Podcast', podPing],
  ['tech-boot', 'Tech : démarrage d’interface', 'Tech et finance', techBoot],
  ['tech-bip', 'Tech : bip de données', 'Tech et finance', techBip],
  ['tech-scan', 'Tech : balayage numérique', 'Tech et finance', techScan],
  ['fin-cloche', 'Finance : cloche d’ouverture des marchés', 'Tech et finance', finCloche],
  ['fin-ticker', 'Finance : défilement des cours', 'Tech et finance', finTicker],
  ['vl-rec-start', 'Vlog : début d’enregistrement (REC)', 'Vlog', vlRecStart],
  ['vl-rec-stop', 'Vlog : fin d’enregistrement', 'Vlog', vlRecStop],
  ['vl-titre-pop', 'Vlog : apparition de titre', 'Vlog', vlTitrePop],
  ['pod-jingle-court', 'Podcast : jingle court', 'Podcast', podJingleCourt],
  ['pod-ambiance-studio', 'Podcast : ambiance de studio (fond léger)', 'Podcast', podAmbiance],
  ['generique-info', 'Générique d’édition spéciale', 'Télé et spectacle', genereriqueInfo],
  ['sirene', 'Sirène d’alerte', 'Télé et spectacle', sirene]
];

// ---------- Musiques ----------
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
function Song(sec, bpm) { return { L: buf(sec), R: buf(sec), bpm, step: 60 / bpm / 4, sec }; }
function put(s, mono, at, g = 1, pan = 0) { mix(s.L, mono, at, g * (1 - Math.max(0, pan))); mix(s.R, mono, at, g * (1 + Math.min(0, pan))); }
const kick = () => mix0(tone(t => 48 + 110 * Math.exp(-t * 28), 0.35, 0.11, 'sine', 0.0005), hp(noise(0.01, 0.002), 3000), 0.25);
function mix0(a, b, g) { const o = a.slice(); for (let i = 0; i < b.length && i < o.length; i++) o[i] += b[i] * g; return o; }
const snare = () => mix0(hp(noise(0.22, 0.06), 900), tone(190, 0.12, 0.04), 0.7);
const hat = (open = false) => hp(noise(open ? 0.18 : 0.04, open ? 0.06 : 0.01), 7000);
const clap = () => { const b = buf(0.25); for (const t of [0, 0.012, 0.024]) mix(b, hp(noise(0.12, 0.03), 1200), t, 0.5); return b; };
function bassNote(m, sec, wave = 'saw') { return lp(tone(mtof(m), sec, sec * 0.8, wave, 0.004), 520); }
function pad(notes, sec, bright = 1800) { const b = buf(sec); notes.forEach((m, i) => { for (const d of [-0.12, 0.1]) mix(b, tone(mtof(m) * (1 + d * 0.01), sec, 0, 'saw', sec * 0.3), 0, 0.12); }); lp(b, bright); return fade(b, sec * 0.25, sec * 0.3); }
function pluck(m, sec, tau = 0.25) { const f = mtof(m), b = buf(sec); [1, 2, 3, 4].forEach((h, i) => mix(b, tone(f * h, sec, tau / (i + 1), 'sine', 0.002), 0, [1, 0.5, 0.25, 0.12][i])); return b; }
function epiano(m, sec) { const f = mtof(m), b = buf(sec); mix(b, tone(f, sec, 0.9), 0, 0.7); mix(b, tone(f * 2.003, sec, 0.35), 0, 0.3); mix(b, tone(f * 7, 0.12, 0.03), 0, 0.12); return b; }
function stab(notes, sec = 0.25) { const b = buf(sec); notes.forEach(m => mix(b, lp(tone(mtof(m), sec, 0.12, 'saw', 0.002), 3000), 0, 0.25)); return b; }
function finish(song, g) {
  const m = Math.max(peak(song.L), peak(song.R)) || 1;
  for (const ch of [song.L, song.R]) for (let i = 0; i < ch.length; i++) ch[i] *= g / m;
  fade(song.L, 0.02, 1.5); fade(song.R, 0.02, 1.5); return song;
}
function bars(song, n) { return Array.from({ length: n }, (_, i) => i * 16 * song.step); }
const chordsA = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; // La mineur, Fa, Do, Sol

function musElectro() {
  R = rng(101); const S = Song(52, 124), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const roots = [33, 29, 36, 31];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = chordsA[b % 4];
    for (let k = 0; k < 16; k += 4) put(S, kick(), t0 + k * st, 0.9);
    for (let k = 2; k < 16; k += 4) put(S, hat(k % 8 === 6), t0 + k * st, 0.25, 0.3);
    if (b >= 2) for (let k = 4; k < 16; k += 8) put(S, clap(), t0 + k * st, 0.5);
    for (let k = 0; k < 16; k++) if (k % 4 !== 0) put(S, bassNote(roots[b % 4], st * 0.9), t0 + k * st, 0.45);
    if (b >= 1) for (let k = 0; k < 16; k++) put(S, lp(tone(mtof(ch[k % 3] + 12), st * 1.2, 0.09, 'square', 0.002), 3500), t0 + k * st, 0.15, k % 2 ? -0.4 : 0.4);
    if (b % 2 === 0) put(S, pad(ch.map(m => m + 12), 16 * st * 2, 1400), t0, 0.7);
  }
  return finish(S, 0.85);
}
function musLofi() {
  R = rng(102); const S = Song(56, 78), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    put(S, kick(), t0, 0.7); put(S, kick(), t0 + 10 * st, 0.6); put(S, snare(), t0 + 4 * st, 0.5); put(S, snare(), t0 + 12 * st, 0.5);
    for (let k = 0; k < 16; k += 2) put(S, hat(), t0 + k * st + (rnd() * 0.015), 0.16 + rnd() * 0.08, 0.3);
    ch.forEach((m, i) => put(S, epiano(m, 3.2), t0 + i * 0.02, 0.5, i % 2 ? -0.3 : 0.3));
    put(S, bassNote(ch[0] - 24, 1.5, 'sine'), t0, 0.8); put(S, bassNote(ch[0] - 24, 1, 'sine'), t0 + 8 * st, 0.7);
    if (b % 2) for (let k = 0; k < 4; k++) put(S, epiano(ch[(k * 3) % 4] + 12, 0.8), t0 + (k * 4 + 2) * st, 0.28, 0.5);
  }
  const vinyl = lp(noise(S.sec, 0), 5000); for (let i = 0; i < vinyl.length; i++) { const x = vinyl[i] * 0.01; S.L[i] += x; S.R[i] += x; }
  for (let ch of [S.L, S.R]) lp(ch, 7500);
  return finish(S, 0.8);
}
function musAmbiance() {
  R = rng(103); const S = Song(60, 60), prog = [[57, 64, 69, 72], [53, 60, 65, 69], [48, 55, 60, 64], [55, 62, 67, 71]];
  for (let b = 0; b < 6; b++) { const t0 = b * 10; const ch = prog[b % 4]; put(S, pad(ch, 14, 1200), t0, 0.9, b % 2 ? -0.2 : 0.2); put(S, pad(ch.map(m => m - 12), 14, 600), t0, 0.7); for (let k = 0; k < 3; k++) put(S, pluck(ch[(k + 1) % 4] + 12, 3, 0.9), t0 + 2 + k * 2.6, 0.22, k % 2 ? 0.6 : -0.6); }
  return finish(S, 0.8);
}
function musTension() {
  R = rng(104); const S = Song(54, 90), st = S.step;
  put(S, pad([33, 40, 45], 54, 500), 0, 1.2); put(S, pad([34, 41, 46], 54, 450), 27, 0.9);
  for (let t = 0; t < S.sec - 1; t += 60 / 90) { put(S, mix0(tone(55, 0.25, 0.1), lp(noise(0.08, 0.02), 200), 0.5), t, 0.7); }
  for (let t = 0; t < S.sec - 1; t += 60 / 90 / 2) put(S, hat(), t, 0.1, 0.4);
  for (let b = 0; b < 6; b++) put(S, riser(6, true), b * 9, 0.18);
  for (let t = 4; t < S.sec - 2; t += 7.3) put(S, tone(mtof(81 - Math.floor(rnd() * 5)), 1.5, 0.5), t, 0.1, sgn());
  return finish(S, 0.8);
}
function musJoyeux() {
  R = rng(105); const S = Song(48, 112), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    for (let k = 0; k < 16; k += 4) put(S, kick(), t0 + k * st, 0.6);
    for (let k = 4; k < 16; k += 8) put(S, clap(), t0 + k * st, 0.45);
    for (let k = 0; k < 16; k += 2) put(S, hat(), t0 + k * st, 0.14, 0.3);
    for (let k = 0; k < 16; k++) if (k % 2 === 0 || k % 4 === 3) put(S, pluck(ch[(k >> 1) % 3] + 12 + (k % 8 > 4 ? 12 : 0), 0.4, 0.14), t0 + k * st, 0.4, k % 4 ? 0.3 : -0.3);
    put(S, bassNote(ch[0] - 24, 0.4, 'tri'), t0, 0.7); put(S, bassNote(ch[2] - 24, 0.3, 'tri'), t0 + 6 * st, 0.6); put(S, bassNote(ch[0] - 24, 0.3, 'tri'), t0 + 10 * st, 0.6);
    for (let k = 1; k < 16; k += 4) put(S, stab(ch.map(m => m + 12), 0.12), t0 + k * st, 0.18, 0.5);
  }
  return finish(S, 0.8);
}
function musEpique() {
  R = rng(106); const S = Song(56, 84), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[45, 52, 57, 60], [41, 48, 53, 57], [36, 43, 48, 52], [43, 50, 55, 59]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    put(S, pad(ch.map(m => m + 12), 16 * st, 2200 + b * 300), t0, 1); put(S, pad(ch.map(m => m - 12), 16 * st, 700), t0, 0.9);
    put(S, impact(1.8, 100, 42, 1), t0, 0.8);
    for (let k = 0; k < 16; k += (b > 1 ? 2 : 4)) put(S, mix0(tone(t => 62 + 80 * Math.exp(-t * 20), 0.3, 0.12), lp(noise(0.1, 0.03), 400), 0.4), t0 + k * st, b > 1 ? 0.55 : 0.4);
    if (b > 2) for (let k = 0; k < 16; k++) put(S, lp(tone(mtof(ch[k % 4] + 24), st, 0.1, 'saw', 0.002), 3000), t0 + k * st, 0.1, k % 2 ? -0.5 : 0.5);
  }
  return finish(S, 0.85);
}
function musReportage() {
  R = rng(107); const S = Song(48, 100), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    for (let k = 0; k < 16; k += 4) put(S, kick(), t0 + k * st, 0.7);
    for (let k = 4; k < 16; k += 8) put(S, snare(), t0 + k * st, 0.5);
    for (let k = 0; k < 16; k++) put(S, hat(k % 4 === 3), t0 + k * st, 0.12, 0.3);
    for (const k of [0, 3, 6, 8, 11, 14]) put(S, stab(ch.map(m => m + 12), 0.2), t0 + k * st, 0.3, 0.2);
    put(S, bassNote(ch[0] - 24, 0.45), t0, 0.7); put(S, bassNote(ch[0] - 24, 0.3), t0 + 6 * st, 0.6); put(S, bassNote(ch[0] - 12, 0.3), t0 + 10 * st, 0.5);
  }
  return finish(S, 0.85);
}
function musHipHop() {
  R = rng(108); const S = Song(48, 90), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const roots = [36, 36, 34, 31];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st;
    put(S, kick(), t0, 0.9); put(S, kick(), t0 + 7 * st, 0.8); put(S, kick(), t0 + 10 * st, 0.8); put(S, snare(), t0 + 4 * st, 0.7); put(S, snare(), t0 + 12 * st, 0.7);
    for (let k = 0; k < 16; k += 2) put(S, hat(), t0 + k * st + (k % 4 ? 0.01 : 0), 0.18, 0.3);
    put(S, bassNote(roots[b % 4], 0.7, 'sine'), t0, 0.9); put(S, bassNote(roots[b % 4], 0.4, 'sine'), t0 + 7 * st, 0.8);
    [0, 6, 8, 14].forEach((k, i) => put(S, cloche(mtof([69, 72, 67, 64][i] + 12), 1.4, 0.18), t0 + k * st, 0.3, i % 2 ? 0.5 : -0.5));
  }
  return finish(S, 0.85);
}
function musPiano() {
  R = rng(109); const S = Song(52, 70), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    for (let k = 0; k < 16; k += 2) put(S, epiano(ch[(k >> 1) % 4] + (k > 8 ? 12 : 0), 1.4), t0 + k * st, 0.5, k % 4 ? 0.25 : -0.25);
    put(S, epiano(ch[0] - 24, 3), t0, 0.7);
    if (b % 2) put(S, pad(ch.map(m => m - 12), 16 * st, 900), t0, 0.35);
  }
  for (const ch of [S.L, S.R]) reverb(ch, 0.2, 1.4);
  return finish(S, 0.8);
}

function musTrap() {
  R = rng(110); const S = Song(48, 140), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const roots = [29, 29, 32, 27], mel = [[65, 68, 72], [65, 68, 72], [68, 72, 75], [63, 67, 70]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st;
    for (const k of [0, 7, 10]) put(S, fade(tone(t => mtof(roots[b % 4]) * (1 + 0.6 * Math.exp(-t * 30)), 1.2, 0.5, 'sine', 0.002), 0.002, 0.1), t0 + k * st, 0.9);
    put(S, clap(), t0 + 8 * st, 0.6); put(S, snare(), t0 + 8 * st, 0.3);
    for (let k = 0; k < 16; k++) { put(S, hat(), t0 + k * st, 0.16, 0.3); if (b % 2 && k > 11) put(S, hat(), t0 + (k + 0.5) * st, 0.12, 0.3); }
    if (b >= 1) mel[b % 4].forEach((m, i) => put(S, cloche(mtof(m), 1.2, 0.3), t0 + i * 4 * st, 0.3, i % 2 ? 0.4 : -0.4));
    put(S, pad(mel[b % 4].map(m => m - 12), 16 * st, 900), t0, 0.35);
  }
  return finish(S, 0.85);
}
function musHouse() {
  R = rng(111); const S = Song(52, 122), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[57, 60, 64, 67], [55, 59, 62, 65], [53, 57, 60, 64], [52, 55, 59, 62]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    for (let k = 0; k < 16; k += 4) put(S, kick(), t0 + k * st, 0.85);
    for (let k = 2; k < 16; k += 4) put(S, hat(true), t0 + k * st, 0.2, 0.3);
    for (let k = 4; k < 16; k += 8) put(S, clap(), t0 + k * st, 0.45);
    for (let k = 2; k < 16; k += 4) put(S, bassNote(ch[0] - 24, st * 1.6), t0 + k * st, 0.55);
    for (const k of [0, 3, 6, 10, 13]) put(S, stab(ch.map(m => m + 12), 0.18), t0 + k * st, 0.3, 0.25);
  }
  return finish(S, 0.85);
}
function musSynthwave() {
  R = rng(112); const S = Song(52, 100), st = S.step, nb = Math.floor(S.sec / (16 * st));
  const prog = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]];
  for (let b = 0; b < nb; b++) {
    const t0 = b * 16 * st, ch = prog[b % 4];
    for (let k = 0; k < 16; k += 4) put(S, kick(), t0 + k * st, 0.75);
    for (let k = 4; k < 16; k += 8) put(S, reverb(snare(), 0.5, 1.8), t0 + k * st, 0.55);
    for (let k = 0; k < 16; k += 2) put(S, bassNote(ch[0] - 24, st * 1.8), t0 + k * st, 0.5);
    for (let k = 0; k < 16; k++) put(S, lp(tone(mtof(ch[k % 3] + 12 + (k % 6 > 2 ? 12 : 0)), st, 0.12, 'saw', 0.002), 2600), t0 + k * st, 0.12, k % 2 ? -0.5 : 0.5);
    put(S, pad(ch.map(m => m + 12), 16 * st, 1600), t0, 0.6);
  }
  return finish(S, 0.85);
}
const MUSIQUES = [
  ['pulsation-electro', 'Pulsation électro (124 bpm)', 'Dynamique', musElectro],
  ['reportage-info', 'Reportage info (100 bpm)', 'Dynamique', musReportage],
  ['joyeux-vlog', 'Joyeux, pour vlog (112 bpm)', 'Dynamique', musJoyeux],
  ['hip-hop-boom-bap', 'Hip-hop boom bap (90 bpm)', 'Dynamique', musHipHop],
  ['lofi-tranquille', 'Lo-fi tranquille (78 bpm)', 'Calme', musLofi],
  ['ambiance-douce', 'Ambiance douce', 'Calme', musAmbiance],
  ['piano-chill', 'Piano chill (70 bpm)', 'Calme', musPiano],
  ['tension-suspense', 'Tension et suspense', 'Dramatique', musTension],
  ['cinema-epique', 'Cinéma épique (84 bpm)', 'Dramatique', musEpique],
  ['trap-moderne', 'Trap moderne (140 bpm)', 'Dynamique', musTrap],
  ['house-groove', 'House groove (122 bpm)', 'Dynamique', musHouse],
  ['synthwave-80', 'Synthwave années 80 (100 bpm)', 'Dynamique', musSynthwave]
];

// ---------- Écriture ----------
function wav(L, R, file) {
  const n = L.length, data = Buffer.alloc(44 + n * 4);
  data.write('RIFF', 0); data.writeUInt32LE(36 + n * 4, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 4, 28); data.writeUInt16LE(4, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(n * 4, 40);
  const c = v => Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
  for (let i = 0; i < n; i++) { data.writeInt16LE(c(L[i]), 44 + i * 4); data.writeInt16LE(c(R[i]), 46 + i * 4); }
  fs.writeFileSync(file, data);
}
function encode(L, R, dest, kbps) {
  const tmp = path.join(os.tmpdir(), 'qm-' + process.pid + '.wav'); wav(L, R, tmp);
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', tmp, '-codec:a', 'libmp3lame', '-b:a', kbps + 'k', dest]); fs.unlinkSync(tmp);
}
function ajouter() { // node scripts/generer-bibliotheque.js --ajouter : génère seulement les bruitages absents et complète l'index
  const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')); let n = 0;
  for (const [id, nom, cat, make] of SONS) {
    if (index.sons.some(x => x.id === id) && fs.existsSync(path.join(OUT, 'sons', id + '.mp3'))) continue;
    R = rng(id.length * 977); const b = make(), g = 0.9 / (peak(b) || 1);
    for (let i = 0; i < b.length; i++) b[i] *= g;
    fade(b, 0.002, 0.03); encode(b, b, path.join(OUT, 'sons', id + '.mp3'), 128);
    index.sons = index.sons.filter(x => x.id !== id); index.sons.push({ id, nom, cat, file: `sons/${id}.mp3`, duree: +(b.length / SR).toFixed(2) }); n++;
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  console.log(`${n} bruitages ajoutés`);
}
function main() {
  // les autres listes (stickers, looks, calques, cadres : scripts Python) sont conservées
  let anciens = {};
  try { anciens = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')); } catch (e) { /* première génération */ }
  for (const d of ['sons', 'musiques']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'sons'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'musiques'), { recursive: true });
  const index = { stickers: [], ...anciens, sons: [], musiques: [] };
  for (const [id, nom, cat, make] of SONS) {
    R = rng(id.length * 977); const b = make(), g = 0.9 / (peak(b) || 1);
    for (let i = 0; i < b.length; i++) b[i] *= g;
    fade(b, 0.002, 0.03); encode(b, b, path.join(OUT, 'sons', id + '.mp3'), 128);
    index.sons.push({ id, nom, cat, file: `sons/${id}.mp3`, duree: +(b.length / SR).toFixed(2) });
  }
  for (const [id, nom, cat, make] of MUSIQUES) {
    const s = make(); encode(s.L, s.R, path.join(OUT, 'musiques', id + '.mp3'), 160);
    index.musiques.push({ id, nom, cat, file: `musiques/${id}.mp3`, duree: +(s.L.length / SR).toFixed(1) });
  }
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
  console.log(`${index.sons.length} bruitages, ${index.musiques.length} musiques`);
}
if (process.argv.includes('--ajouter')) ajouter(); else main();
