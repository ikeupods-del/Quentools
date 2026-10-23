/* Pax Mythica — sons et musique fabriqués par le navigateur (Web Audio), aucun fichier son :
   clic, tambour de guerre, choc de bataille, tonnerre des dieux, fanfare d'âge, cor de conquête, et une lyre d'ambiance (gamme dorienne). */
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
    victoire: t => [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => note(196 * Math.pow(2, s / 12), t + i * 0.16, 0.9, 'triangle', 0.1))
  };
  PM.son = function (nom) {
    if (!reglages.sons || !SONS[nom]) return;
    const c = contexte(); if (!c) return; if (c.state === 'suspended') c.resume();
    try { SONS[nom](c.currentTime + 0.01); } catch (e) { /* son ignoré */ }
  };
  // lyre d'ambiance : notes pincées tirées d'une gamme dorienne, en phrases lentes
  const GAMME = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15];
  function phrase() {
    if (!ac || !reglages.musique) return;
    const t = ac.currentTime + 0.05, base = 146.8, longueur = 4 + Math.floor(Math.random() * 4);
    let pos = Math.floor(Math.random() * 5);
    for (let i = 0; i < longueur; i++) {
      pos = Math.max(0, Math.min(GAMME.length - 1, pos + Math.round((Math.random() - 0.5) * 3)));
      const f = base * Math.pow(2, GAMME[pos] / 12), tt = t + i * (0.42 + Math.random() * 0.2);
      note(f, tt, 2.2, 'triangle', 0.12, musiqueGain); note(f * 2, tt, 1.2, 'sine', 0.03, musiqueGain);
    }
    note(base / 2, t, 4, 'sine', 0.08, musiqueGain);
  }
  PM.musique = function (oui) {
    if (oui != null) { reglages.musique = !!oui; garder(); }
    clearInterval(minuterie); minuterie = null;
    if (!reglages.musique) return;
    if (!contexte()) return; if (ac.state === 'suspended') ac.resume();
    phrase(); minuterie = setInterval(phrase, 5200);
  };
  PM.reglagesSon = () => Object.assign({}, reglages);
  PM.changerSon = function (k, v) { reglages[k] = v; garder(); if (maitre && k === 'volume') maitre.gain.value = v; if (k === 'musique') PM.musique(v); };
})(typeof window !== 'undefined' ? window : globalThis);
