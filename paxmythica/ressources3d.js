/* Pax Mythica — chargement des ressources graphiques (textures photographiques, ciels HDR, modèles 3D) du dossier ressources/.
   Dans l'application Mac, les fichiers sont lus par le pont sécurisé (preload.js → main.js, dossier ressources/ seulement) ;
   dans un navigateur d'essai, par une requête locale. Les images deviennent des tableaux de textures (une couche par matériau)
   lus par les nuanciers du sol et des bâtiments. Tout est chargé une seule fois par lancement. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const cache = new Map();

  PM.lireFichier = function (rel) {
    if (cache.has(rel)) return cache.get(rel);
    const p = G.paxFichiers ? G.paxFichiers.lire(rel).then(b => b.buffer ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b) : new Promise((ok, ko) => {
      const x = new XMLHttpRequest(); x.open('GET', rel); x.responseType = 'arraybuffer';
      x.onload = () => (x.status === 200 || (x.status === 0 && x.response && x.response.byteLength)) ? ok(x.response) : ko(new Error(rel + ' : ' + x.status));
      x.onerror = () => ko(new Error(rel + ' illisible')); x.send();
    });
    cache.set(rel, p); p.catch(() => cache.delete(rel));
    return p;
  };
  PM.chargerImage = async function (rel) {
    const buf = await PM.lireFichier(rel), type = /\.png$/i.test(rel) ? 'image/png' : 'image/jpeg';
    return createImageBitmap(new Blob([buf], { type }));
  };
  // pixels RGBA d'une image, redimensionnée au carré n × n
  function pixels(img, n) {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(n, n) : Object.assign(document.createElement('canvas'), { width: n, height: n });
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, n, n); return g.getImageData(0, 0, n, n).data;
  }
  // tableau de textures : une couche par fichier (couche grise neutre si un fichier manque)
  PM.tableauTextures = async function (fichiers, n, srgb, defaut) {
    const THREE = G.THREE, data = new Uint8Array(n * n * 4 * fichiers.length);
    const imgs = await Promise.all(fichiers.map(f => f ? PM.chargerImage(f).catch(() => null) : null));
    imgs.forEach((img, i) => {
      if (img) data.set(pixels(img, n), i * n * n * 4);
      else { const d = defaut || [128, 128, 255, 255]; for (let k = 0; k < n * n; k++) data.set(d, (i * n * n + k) * 4); }
    });
    const t = new THREE.DataArrayTexture(data, n, n, fichiers.length);
    t.format = THREE.RGBAFormat; t.type = THREE.UnsignedByteType; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true; t.manquants = imgs.filter(x => !x).length;
    return t;
  };
  PM.chargerHDR = async function (rel) {
    const THREE = G.THREE, buf = await PM.lireFichier(rel), L = new THREE.HDRLoader(), d = L.parse(buf);
    const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
    t.colorSpace = THREE.LinearSRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.flipY = true; t.needsUpdate = true;
    return t;
  };
  PM.chargerModele = async function (rel) {
    const THREE = G.THREE, buf = await PM.lireFichier(rel);
    return new Promise((ok, ko) => new THREE.GLTFLoader().parse(buf, '', g => ok(g), ko));
  };
})(typeof window !== 'undefined' ? window : globalThis);
