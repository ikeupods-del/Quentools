// QuentMovie : détourage de la personne dans un fil séparé (Web Worker), pour que l'image et le prompteur
// restent fluides pendant le calcul. Reçoit une image recadrée autour de la personne, renvoie le masque
// (0 à 255) nettoyé et lissé, et le cadre occupé par la personne (pour recadrer l'image suivante).
'use strict';
self.window = self;
importScripts('/vendor/vision/vision_bundle.js', '/compositeur.js');
const { FilesetResolver, ImageSegmenter } = self.Vision;

let seg = null, multi = false, lisse = null, cle = '', dernierT = 0;

async function preparer({ modele, gpu }) {
  if (seg) { seg.close(); seg = null; }
  const fichiers = await FilesetResolver.forVisionTasks('/vendor/vision/wasm');
  const options = d => ({ baseOptions: { modelAssetPath: `/modeles/${modele}.tflite`, delegate: d }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false,
    ...(d === 'GPU' ? { canvas: new OffscreenCanvas(1, 1) } : {}) });
  let delegue = gpu ? 'GPU' : 'CPU';
  try { seg = await ImageSegmenter.createFromOptions(fichiers, options(delegue)); }
  catch (e) { delegue = 'CPU'; seg = await ImageSegmenter.createFromOptions(fichiers, options('CPU')); }
  multi = modele.includes('multiclass'); lisse = null;
  return delegue;
}

function traiter({ image, t, roiCle, seul, nettoyage, lissage }) {
  const t0 = performance.now();
  let res = null;
  t = Math.max(t, dernierT + 1); dernierT = t; // horodatage toujours croissant
  seg.segmentForVideo(image, t, r => {
    const m = r.confidenceMasks[0], a = m.getAsFloat32Array(), w = m.width, h = m.height;
    const p = new Float32Array(a.length);
    if (multi) for (let i = 0; i < a.length; i++) p[i] = 1 - a[i]; else p.set(a); // modèle précis : 1 − « fond »
    res = { p, w, h };
  });
  image.close();
  const { p, w, h } = res;
  if (nettoyage) self.Compositeur.nettoyer(p, w, h, seul);
  // lissage dans le temps (moins de scintillement), remis à zéro quand le cadrage change ; un grand mouvement passe tout de suite
  if (!lisse || lisse.length !== p.length || cle !== roiCle) { lisse = Float32Array.from(p); cle = roiCle; }
  const a0 = 1 - lissage * 0.8, octets = new Uint8Array(p.length);
  let x0 = w, y0 = h, x1 = -1, y1 = -1, n = 0;
  for (let i = 0; i < p.length; i++) {
    const e = Math.abs(p[i] - lisse[i]); lisse[i] += (p[i] - lisse[i]) * Math.min(1, a0 + e * 1.2);
    const v = lisse[i]; octets[i] = v * 255;
    if (v > 0.5) { const x = i % w, y = (i / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; n++; }
  }
  // cadre de la personne dans l'image reçue (0 à 1), null si personne n'est visible
  const cadre = n > w * h * 0.004 ? { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h } : null;
  return { octets, w, h, cadre, duree: performance.now() - t0 };
}

self.onmessage = async e => {
  const d = e.data;
  try {
    if (d.type === 'preparer') self.postMessage({ type: 'pret', delegue: await preparer(d) });
    else if (d.type === 'image') {
      if (!seg) { d.image.close(); return self.postMessage({ type: 'masque', id: d.id, vide: true }); }
      const r = traiter(d);
      self.postMessage({ type: 'masque', id: d.id, ...r }, [r.octets.buffer]);
    }
  } catch (er) {
    if (d.image) try { d.image.close(); } catch (x) { /* déjà libérée */ }
    self.postMessage({ type: 'erreur', id: d.id, message: String((er && er.message) || er) });
  }
};
