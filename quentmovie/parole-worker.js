// QuentMovie : voix naturelles (Piper) et reconnaissance de la parole (Parakeet), en local avec sherpa-onnx.
// Tourne dans un processus à part (lancé par parole.js) : le montage n'est jamais bloqué, et les modèles
// restent chargés entre deux demandes. Sous Electron, les tampons « externes » sont interdits : enableExternalBuffer = false partout. Messages : { id, type: 'parler' | 'ecouter', ... } → { id, ok, ... }.
'use strict';
const fs = require('fs');
const path = require('path');
const sherpa = require('sherpa-onnx-node');

const voix = new Map(); // dossier du modèle → moteur de synthèse
let oreille = null, oreilleDossier = '', vad = null;

async function moteurVoix(dossier) {
  if (voix.has(dossier)) return voix.get(dossier);
  const onnx = fs.readdirSync(dossier).find(n => n.endsWith('.onnx'));
  if (!onnx) throw new Error('Voix incomplète : réinstalle-la.');
  // appels directs (synchrones) : ce processus ne sert qu'à ça ; la version asynchrone échoue sous Electron 43
  const tts = new sherpa.OfflineTts({
    model: { vits: { model: path.join(dossier, onnx), tokens: path.join(dossier, 'tokens.txt'), dataDir: path.join(dossier, 'espeak-ng-data') }, numThreads: 2, debug: false, provider: 'cpu' },
    maxNumSentences: 2
  });
  voix.set(dossier, tts);
  return tts;
}

// Texte → fichier WAV (mono)
async function parler({ dossier, texte, sortie, vitesse = 1, locuteur = 0 }) {
  const tts = await moteurVoix(dossier);
  const a = tts.generate({ text: String(texte), sid: Math.min(Math.max(0, locuteur | 0), tts.numSpeakers - 1), speed: Math.min(2, Math.max(0.5, +vitesse || 1)), enableExternalBuffer: false });
  sherpa.writeWave(sortie, { samples: a.samples, sampleRate: a.sampleRate });
  return { duree: a.samples.length / a.sampleRate };
}

function lireWav(f) { // WAV 16 bits mono 16 kHz (préparé par FFmpeg)
  const w = sherpa.readWave(f, false);
  return { samples: w.samples, sampleRate: w.sampleRate };
}

async function preparerOreille(dossier, dossierVad) {
  if (oreille && oreilleDossier === dossier) return;
  const f = n => path.join(dossier, fs.readdirSync(dossier).find(x => x.startsWith(n) && x.endsWith('.onnx')) || n + '.onnx');
  oreille = new sherpa.OfflineRecognizer({
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: { transducer: { encoder: f('encoder'), decoder: f('decoder'), joiner: f('joiner') }, tokens: path.join(dossier, 'tokens.txt'), numThreads: 4, provider: 'cpu', debug: 0, modelType: 'nemo_transducer' },
    decodingMethod: 'greedy_search'
  });
  oreilleDossier = dossier;
  vad = dossierVad;
}

// Découpe en passages parlés (détecteur de voix), puis reconnaissance de chaque passage avec l'heure de chaque morceau de mot.
function ecouter({ dossier, dossierVad, wav }) {
  return preparerOreille(dossier, dossierVad).then(() => {
    const { samples, sampleRate } = lireWav(wav);
    const detecteur = new sherpa.Vad({ sileroVad: { model: path.join(dossierVad, 'silero_vad.onnx'), threshold: 0.45, minSilenceDuration: 0.25, minSpeechDuration: 0.15, maxSpeechDuration: 20, windowSize: 512 }, sampleRate, debug: false, numThreads: 1 }, 60);
    const passages = [], fenetre = 512;
    const vider = () => { while (!detecteur.isEmpty()) { const s = detecteur.front(false); detecteur.pop(); passages.push({ debut: s.start / sampleRate, samples: s.samples }); } };
    for (let i = 0; i + fenetre <= samples.length; i += fenetre) { detecteur.acceptWaveform(samples.subarray(i, i + fenetre)); vider(); }
    detecteur.flush(); vider();
    const morceaux = [], parole = [];
    for (const p of passages) {
      const flux = oreille.createStream();
      flux.acceptWaveform({ samples: p.samples, sampleRate });
      oreille.decode(flux);
      const r = oreille.getResult(flux);
      const fin = p.debut + p.samples.length / sampleRate;
      parole.push({ s: +p.debut.toFixed(3), e: +fin.toFixed(3) });
      (r.tokens || []).forEach((t, k) => morceaux.push({ t, s: p.debut + (r.timestamps[k] || 0), d: r.durations && r.durations[k] ? r.durations[k] : 0, fin }));
    }
    return { morceaux, parole, duree: samples.length / sampleRate };
  });
}

process.on('message', async m => {
  try {
    const r = m.type === 'parler' ? await parler(m) : m.type === 'ecouter' ? await ecouter(m) : { pong: true };
    process.send({ id: m.id, ok: true, ...r });
  } catch (e) { process.send({ id: m.id, ok: false, erreur: String((e && e.message) || e) }); }
});
process.send({ pret: true });
