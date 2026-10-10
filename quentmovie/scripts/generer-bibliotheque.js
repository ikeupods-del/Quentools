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
  ['parasites-tv', 'Parasites de télévision (2 s)', 'Ambiances', () => parasites(2)]
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
const MUSIQUES = [
  ['pulsation-electro', 'Pulsation électro (124 bpm)', 'Dynamique', musElectro],
  ['reportage-info', 'Reportage info (100 bpm)', 'Dynamique', musReportage],
  ['joyeux-vlog', 'Joyeux, pour vlog (112 bpm)', 'Dynamique', musJoyeux],
  ['hip-hop-boom-bap', 'Hip-hop boom bap (90 bpm)', 'Dynamique', musHipHop],
  ['lofi-tranquille', 'Lo-fi tranquille (78 bpm)', 'Calme', musLofi],
  ['ambiance-douce', 'Ambiance douce', 'Calme', musAmbiance],
  ['piano-chill', 'Piano chill (70 bpm)', 'Calme', musPiano],
  ['tension-suspense', 'Tension et suspense', 'Dramatique', musTension],
  ['cinema-epique', 'Cinéma épique (84 bpm)', 'Dramatique', musEpique]
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
function main() {
  // les stickers (générés par generer-stickers.py) sont conservés
  let anciens = [];
  try { anciens = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')).stickers || []; } catch (e) { /* première génération */ }
  for (const d of ['sons', 'musiques']) fs.rmSync(path.join(OUT, d), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'sons'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'musiques'), { recursive: true });
  const index = { sons: [], musiques: [], stickers: anciens };
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
main();
