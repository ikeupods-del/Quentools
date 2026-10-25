/* Pax Mythica — sons et musique fabriqués par le navigateur (Web Audio), aucun fichier son :
   clic, tambour de guerre, choc de bataille, tonnerre des dieux, fanfare d'âge, cor de conquête, bruitages des batailles en temps réel
   (épées, flèches, haches, marteaux, tirs, explosions), et une musique d'ambiance apaisante (accords lents en ré majeur, harpe, flûte). */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  let ac = null, maitre = null, musiqueGain = null, minuterie = null;
  const reglages = { sons: true, musique: true, volume: 0.7 };
  try { Object.assign(reglages, JSON.parse(localStorage.getItem('pm:son') || '{}')); } catch (e) { /* stockage indisponible : réglages par défaut */ }
  const garder = () => { try { localStorage.setItem('pm:son', JSON.stringify(reglages)); } catch (e) { /* sans stockage */ } };

  function contexte() {
    if (ac) return ac;
    const AC = G.AudioContext || G.webkitAudioContext; if (!AC) return null;
    ac = new AC(); maitre = ac.createGain(); maitre.gain.value = reglages.volume; maitre.connect(ac.destination);
    musiqueGain = ac.createGain(); musiqueGain.gain.value = 0.22; musiqueGain.connect(maitre);
    return ac;
  }
  const note = (f, t0, dur, type = 'sine', vol = 0.2, dest) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g); g.connect(dest || maitre); o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const bruit = (t0, dur, vol, freq, q = 1) => {
    const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(maitre); s.start(t0);
  };
  const SONS = {
    clic: t => note(880, t, 0.06, 'triangle', 0.06),
    ok: t => { note(660, t, 0.12, 'triangle', 0.08); note(990, t + 0.06, 0.16, 'triangle', 0.06); },
    refus: t => note(180, t, 0.18, 'square', 0.04),
    guerre: t => { for (let i = 0; i < 3; i++) { bruit(t + i * 0.28, 0.35, 0.5, 140, 2); note(55, t + i * 0.28, 0.4, 'sine', 0.35); } },
    bataille: t => { bruit(t, 0.25, 0.35, 2400, 4); note(1300, t + 0.02, 0.15, 'square', 0.03); bruit(t + 0.12, 0.2, 0.25, 3200, 6); },
    pouvoir: t => { bruit(t, 1.6, 0.6, 500, 0.5); note(110, t, 1.2, 'sawtooth', 0.06); note(73, t + 0.1, 1.4, 'sine', 0.2); },
    age: t => [0, 4, 7, 12, 16].forEach((s, i) => note(262 * Math.pow(2, s / 12), t + i * 0.12, 0.8, 'triangle', 0.09)),
    conquete: t => { note(196, t, 0.5, 'sawtooth', 0.05); note(294, t + 0.25, 0.7, 'sawtooth', 0.05); note(392, t + 0.5, 0.9, 'triangle', 0.08); },
    evenement: t => { note(1046, t, 0.9, 'sine', 0.07); note(1568, t + 0.02, 1.1, 'sine', 0.04); },
    victoire: t => [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => note(196 * Math.pow(2, s / 12), t + i * 0.16, 0.9, 'triangle', 0.1)),
    // bruitages du mode Bataille (courts, joués près de la caméra)
    epee: t => { const f = 1800 + Math.random() * 900; note(f, t, 0.09, 'square', 0.018); note(f * 1.51, t, 0.14, 'triangle', 0.02); bruit(t, 0.06, 0.12, 5000, 3); },
    fleche: t => bruit(t, 0.16, 0.05, 2600 + Math.random() * 800, 7),
    hache: t => { bruit(t, 0.09, 0.22, 600, 1); note(140, t, 0.08, 'sine', 0.08); },
    marteau: t => { bruit(t, 0.05, 0.16, 1500, 2); note(420 + Math.random() * 60, t, 0.07, 'triangle', 0.035); },
    coup: t => { bruit(t, 0.12, 0.25, 900, 1); note(90, t, 0.12, 'sine', 0.1); },
    explosion: t => { bruit(t, 0.9, 0.7, 220, 0.7); note(48, t, 0.8, 'sine', 0.35); },
    tir: t => { bruit(t, 0.12, 0.45, 3200, 0.8); bruit(t + 0.02, 0.4, 0.2, 400, 0.6); },
    eclair: t => { bruit(t, 0.12, 0.7, 6000, 0.5); bruit(t + 0.05, 1.4, 0.6, 300, 0.6); note(60, t + 0.05, 1.2, 'sine', 0.25); },
    ordre: t => { note(520, t, 0.07, 'sine', 0.05); note(780, t + 0.05, 0.09, 'sine', 0.04); },
    forme: t => { note(392, t, 0.18, 'triangle', 0.05); note(523, t + 0.08, 0.25, 'triangle', 0.045); }
  };
  PM.son = function (nom) {
    if (!reglages.sons || !SONS[nom]) return;
    const c = contexte(); if (!c) return; if (c.state === 'suspended') c.resume();
    try { SONS[nom](c.currentTime + 0.01); } catch (e) { /* son ignoré */ }
  };
  // musique d'ambiance apaisante : nappes d'accords majeurs lents, harpe éparse, petite flûte, le tout dans une grande réverbération
  // suite d'accords en ré majeur (I – vi – IV – V puis I – IV – vi – IV), une mesure de 8 s par accord
  const D3 = 146.83, demi = n => D3 * Math.pow(2, n / 12);
  const ACCORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2], [0, 4, 7], [-7, -3, 0], [-3, 0, 4], [-7, -3, 0]];
  const PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
  let mesure = 0, reverb = null;
  function salle() {
    if (reverb) return reverb;
    const n = Math.floor(ac.sampleRate * 3.2), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3); }
    reverb = ac.createConvolver(); reverb.buffer = b; const g = ac.createGain(); g.gain.value = 0.55; reverb.connect(g); g.connect(musiqueGain);
    return reverb;
  }
  // une voix douce : attaque et extinction lentes, filtre qui adoucit, envoi dans la salle
  function voix(f, t0, attaque, duree, vol, type = 'sine', vibrato = 0) {
    const o = ac.createOscillator(), g = ac.createGain(), fi = ac.createBiquadFilter(); o.type = type; o.frequency.value = f;
    fi.type = 'lowpass'; fi.frequency.value = type === 'sine' ? 2400 : 1500;
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + attaque); g.gain.exponentialRampToValueAtTime(0.0005, t0 + duree);
    if (vibrato) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 4.6; lg.gain.value = f * vibrato; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + duree + 0.1); }
    o.connect(fi); fi.connect(g); g.connect(musiqueGain); g.connect(salle()); o.start(t0); o.stop(t0 + duree + 0.1);
  }
  function phrase() {
    if (!ac || !reglages.musique) return;
    const t = ac.currentTime + 0.1, a = ACCORDS[mesure % ACCORDS.length]; mesure++;
    // nappe : les trois notes de l'accord (deux voix légèrement désaccordées) et la basse une octave en dessous
    for (const n of a) for (const d of [-0.003, 0.003]) voix(demi(n) * (1 + d), t, 2.6, 9.5, 0.022);
    voix(demi(a[0] - 12), t, 2, 9, 0.035);
    // harpe : quelques notes de l'accord, une octave plus haut, espacées
    for (let k = 0; k < 5; k++) { if (Math.random() < 0.35) continue; const n = a[Math.floor(Math.random() * 3)] + 12 + (Math.random() < 0.3 ? 12 : 0); voix(demi(n), t + 0.6 + k * 1.45 + Math.random() * 0.2, 0.015, 3.2, 0.03, 'triangle'); }
    // flûte : une petite phrase pentatonique une mesure sur deux
    if (mesure % 2 === 0 && Math.random() < 0.8) { let p = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < 3 + Math.floor(Math.random() * 2); k++) { p = Math.max(0, Math.min(PENTA.length - 1, p + (Math.random() < 0.5 ? -1 : 1))); voix(demi(PENTA[p] + 12), t + 1.5 + k * 1.6, 0.35, 2.2, 0.018, 'sine', 0.006); } }
  }
  PM.musique = function (oui) {
    if (oui != null) { reglages.musique = !!oui; garder(); }
    clearInterval(minuterie); minuterie = null;
    if (!reglages.musique) return;
    if (!contexte()) return; if (ac.state === 'suspended') ac.resume();
    phrase(); minuterie = setInterval(phrase, 8000);
  };
  PM.reglagesSon = () => Object.assign({}, reglages);
  PM.changerSon = function (k, v) { reglages[k] = v; garder(); if (maitre && k === 'volume') maitre.gain.value = v; if (k === 'musique') PM.musique(v); };
})(typeof window !== 'undefined' ? window : globalThis);
