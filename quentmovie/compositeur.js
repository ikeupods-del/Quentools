// QuentMovie : mélange en direct de la personne détourée et du décor, sur la carte graphique (WebGL 2).
// - masque lissé dans le temps (moins de scintillement) puis affiné sur les couleurs de l'image (bords nets, cheveux)
// - contour réglable, halo de lumière du décor sur les bords, fond flou, réglages de lumière de la personne
// - mode fond vert : incrustation par couleur, plus précise quand on dispose d'un vrai fond vert
// Utilisé par le studio (index.html) ; testé hors ligne par tests/compositeur (voir LISEZMOI).
'use strict';
(function () {
  const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }`;
  const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D cam, masque, fond;
uniform int mode;          // 0 : décor, 1 : fond flou
uniform int vert;          // 1 : incrustation par couleur (fond vert)
uniform vec3 cle;          // couleur du fond vert
uniform vec2 pasMasque;    // taille d'un point du masque
uniform vec4 cadreFond;    // recadrage du décor : échelle (xy), décalage (zw)
uniform float seuil, douceur, halo, lumiere, chaleur;
float masqueAffine(vec3 c) {
  // suréchantillonnage guidé : voisins du masque pondérés par leur ressemblance de couleur avec ce point
  float s = 0., w = 0.;
  for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) {
    vec2 d = vec2(float(x), float(y)) * pasMasque;
    vec3 cc = textureLod(cam, uv + d, 2.).rgb;
    float k = exp(-dot(cc - c, cc - c) * 30.) * exp(-float(x * x + y * y) * .25);
    s += texture(masque, uv + d).r * k; w += k;
  }
  return s / max(w, 1e-4);
}
float masqueVert(vec3 c) {
  // distance de couleur au fond vert (dans l'espace YCbCr, moins sensible à l'éclairage)
  vec2 a = vec2(dot(c, vec3(-.169, -.331, .5)), dot(c, vec3(.5, -.419, -.081)));
  vec2 b = vec2(dot(cle, vec3(-.169, -.331, .5)), dot(cle, vec3(.5, -.419, -.081)));
  return distance(a, b) * 4.;
}
void main() {
  vec3 c = texture(cam, uv).rgb;
  float m = vert == 1 ? masqueVert(c) : masqueAffine(c);
  m = smoothstep(seuil - douceur, seuil + douceur, m);
  if (vert == 1) { float g = max(c.g - max(c.r, c.b), 0.); c.g -= g * (1. - m * .3); } // retire le reflet vert
  vec2 f = uv * cadreFond.xy + cadreFond.zw;
  vec3 b, bh;
  if (mode == 1) {
    b = vec3(0.);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) b += textureLod(cam, uv + vec2(float(x), float(y)) * .012, 5.).rgb;
    b /= 9.; bh = b;
  } else { b = texture(fond, f).rgb; bh = textureLod(fond, f, 5.).rgb; }
  // lumière de la personne (exposition et chaleur), sans toucher au décor
  c = c * lumiere; c.r *= 1. + chaleur * .08; c.b *= 1. - chaleur * .08;
  float bord = clamp(m * (1. - m) * 4., 0., 1.);
  c = mix(c, c * .55 + bh * .7, bord * halo);   // le décor « déborde » légèrement sur les bords
  o = vec4(mix(b, clamp(c, 0., 1.), m), 1.);
}`;

  function shader(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function texture(gl, filtre) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtre); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  // Nettoyage du masque (seuil 0,5) : retire les morceaux isolés (mains ou têtes d'autres personnes au loin)
  // et bouche les petits trous dans la silhouette. p est modifié sur place.
  function nettoyer(p, w, h, garderSeul) {
    const n = w * h, lab = new Int32Array(n).fill(-1), file = new Int32Array(n), tailles = [];
    const voisins = (i, f) => { const x = i % w; if (x > 0) f(i - 1); if (x < w - 1) f(i + 1); if (i >= w) f(i - w); if (i < n - w) f(i + w); };
    // 1) zones « personne »
    for (let i = 0; i < n; i++) {
      if (p[i] < .5 || lab[i] >= 0) continue;
      const id = tailles.length; let a = 0, b = 0; file[b++] = i; lab[i] = id;
      while (a < b) { const j = file[a++]; voisins(j, k => { if (p[k] >= .5 && lab[k] < 0) { lab[k] = id; file[b++] = k; } }); }
      tailles.push(b);
    }
    if (garderSeul && tailles.length > 1) {
      const max = Math.max(...tailles);
      for (let i = 0; i < n; i++) if (lab[i] >= 0 && tailles[lab[i]] < max * .25) p[i] = Math.min(p[i], .1);
    }
    // 2) trous : zones de fond qui ne touchent pas le bord de l'image et restent petites
    const vu = new Uint8Array(n); let a = 0, b = 0;
    for (let i = 0; i < n; i++) { const x = i % w, y = (i / w) | 0; if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && p[i] < .5) { vu[i] = 1; file[b++] = i; } }
    while (a < b) { const j = file[a++]; voisins(j, k => { if (!vu[k] && p[k] < .5) { vu[k] = 1; file[b++] = k; } }); }
    const lim = n * .02;
    for (let i = 0; i < n; i++) {
      if (vu[i] || p[i] >= .5) continue;
      let a2 = 0, b2 = 0; file[b2++] = i; vu[i] = 2;
      while (a2 < b2) { const j = file[a2++]; voisins(j, k => { if (!vu[k] && p[k] < .5) { vu[k] = 2; file[b2++] = k; } }); }
      if (b2 < lim) for (let q = 0; q < b2; q++) p[file[q]] = Math.max(p[file[q]], .9);
    }
  }

  // canvas : toile de sortie (enregistrée telle quelle) ; renvoie null si WebGL 2 est indisponible
  function creer(canvas) {
    const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false });
    if (!gl) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, VS)); gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const tampon = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tampon); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(prog, n);
    const tCam = texture(gl, gl.LINEAR_MIPMAP_LINEAR), tMasque = texture(gl, gl.LINEAR), tFond = texture(gl, gl.LINEAR_MIPMAP_LINEAR);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    let lisse = null, octets = null, mw = 0, mh = 0, fw = 0, fh = 0;
    const reglages = { nettoyage: true, seul: true, seuil: .5, douceur: .12, halo: .5, lumiere: 1, chaleur: 0, lissage: .5, vert: false, cle: [0, .7, .25] };

    return {
      reglages,
      // masque : probabilités (0 à 1) de présence de la personne, w × h
      masque(proba, w, h) {
        if (reglages.nettoyage) { proba = Float32Array.from(proba); nettoyer(proba, w, h, reglages.seul); }
        if (w !== mw || h !== mh || !lisse) { mw = w; mh = h; lisse = Float32Array.from(proba); octets = new Uint8Array(w * h); }
        const a0 = 1 - reglages.lissage * .8;
        for (let i = 0; i < proba.length; i++) {
          const e = Math.abs(proba[i] - lisse[i]), a = Math.min(1, a0 + e * .8); // un grand mouvement passe tout de suite
          lisse[i] += (proba[i] - lisse[i]) * a; octets[i] = lisse[i] * 255;
        }
        gl.bindTexture(gl.TEXTURE_2D, tMasque);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, octets);
      },
      // décor : image, vidéo ou toile (null = fond flou)
      fond(src) {
        this.src = src;
        if (!src) return;
        fw = src.videoWidth || src.naturalWidth || src.width; fh = src.videoHeight || src.naturalHeight || src.height;
        if (!fw || !fh) return;
        gl.bindTexture(gl.TEXTURE_2D, tFond); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); gl.generateMipmap(gl.TEXTURE_2D);
      },
      dessiner(cam) {
        const w = cam.videoWidth || cam.naturalWidth || cam.width, h = cam.videoHeight || cam.naturalHeight || cam.height;
        if (!w || !h) return false;
        if (!lisse && !reglages.vert) this.masque(new Float32Array([1]), 1, 1); // en attendant le premier détourage : l'image entière
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tCam); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cam); gl.generateMipmap(gl.TEXTURE_2D);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tMasque);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tFond);
        if (this.src && this.src.videoWidth) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src); gl.generateMipmap(gl.TEXTURE_2D); } // décor animé
        gl.uniform1i(U('cam'), 0); gl.uniform1i(U('masque'), 1); gl.uniform1i(U('fond'), 2);
        gl.uniform1i(U('mode'), this.src ? 0 : 1); gl.uniform1i(U('vert'), reglages.vert ? 1 : 0); gl.uniform3fv(U('cle'), reglages.cle);
        gl.uniform2f(U('pasMasque'), 1 / Math.max(1, mw), 1 / Math.max(1, mh));
        // recadrage du décor pour remplir l'image sans le déformer
        let sx = 1, sy = 1; if (fw && fh) { const k = (w / h) / (fw / fh); if (k > 1) sy = 1 / k; else sx = k; }
        gl.uniform4f(U('cadreFond'), sx, sy, (1 - sx) / 2, (1 - sy) / 2);
        const r = reglages; gl.uniform1f(U('seuil'), r.vert ? .35 + r.seuil * .3 : r.seuil); gl.uniform1f(U('douceur'), Math.max(.01, r.douceur));
        gl.uniform1f(U('halo'), r.halo); gl.uniform1f(U('lumiere'), r.lumiere); gl.uniform1f(U('chaleur'), r.chaleur);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
      },
      oublier() { lisse = null; }
    };
  }
  window.Compositeur = { creer, nettoyer };
})();
