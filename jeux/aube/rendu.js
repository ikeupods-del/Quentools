'use strict';
/* Aube des Nations — rendu 3D (three.js, chargé localement depuis vendor/).
   Relief continu calculé depuis les cases (collines, montagnes, côtes sous une eau transparente),
   soleil et ombres, arbres instanciés, rivières, routes, frontières, villes et unités modélisées,
   brouillard de guerre = mer de nuages (le relief inconnu est aplati dans les nuages par le shader).
   Les bandeaux de villes, fanions d'unités et textes flottants sont des éléments HTML posés par-dessus. */

const R = {
  cv: null, rendu: null, scene: null, camera: null, dpr: 1, larg: 0, haut: 0,
  cam: { x: 0, y: 0, z: 1 }, camAnim: null, S: 32,
  sale: true, anims: new Map(), textes: [], toutVoir: false, grille: false, survol: -1,
  mini: null, mx: null, miniSale: true, miniCache: null, surbrillance: null,
  monde: null, unites: new Map(), villes: new Map(), etiq: null, temps: 0, reperes: [],
};
const FOV = 34;
const qualiteHaute = () => typeof Prefs === 'undefined' || Prefs.qualite !== 'eco';
const MINI = { ocean: '#17344d', cote: '#235a7b', prairie: '#5b8439', plaine: '#8f8c45', desert: '#bfa972', toundra: '#767b62', neige: '#cfd6d9' };

function moi() { return G && G.joueur >= 0 ? G.civs[G.joueur] : null; }
function voitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vis[i]; }
function connaitTuile(i) { const c = moi(); return R.toutVoir || !c || !!c.vu[i]; }

/* ---------- Géométrie du plateau (plan x / y de la carte ; y de la carte = z en 3D) ---------- */
function centreTuile(i) {
  const c = i % G.W, r = (i / G.W) | 0;
  return { x: SQ3 * R.S * (c + 0.5 * (r & 1)) + SQ3 * R.S / 2, y: 1.5 * R.S * r + R.S };
}
const tailleMonde = () => ({ w: SQ3 * R.S * (G.W + 0.5), h: 1.5 * R.S * (G.H - 1) + 2 * R.S });
function hexDuMonde(x, y) {
  const px = x - SQ3 * R.S / 2, py = y - R.S;
  const q = (SQ3 / 3 * px - py / 3) / R.S, r = (2 / 3 * py) / R.S, s = -q - r;
  let rq = Math.round(q), rr2 = Math.round(r);
  const rs = Math.round(s), dq = Math.abs(rq - q), dr = Math.abs(rr2 - r), ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr2 - rs; else if (dr > ds) rr2 = -rq - rs;
  const col = rq + (rr2 - (rr2 & 1)) / 2;
  if (rr2 < 0 || rr2 >= G.H || col < 0 || col >= G.W) return -1;
  return rr2 * G.W + col;
}
function arete(p, k, r) { const a = ANGLES_DIR[k] * Math.PI / 180; return [p.x + r * Math.cos(a - Math.PI / 6), p.y + r * Math.sin(a - Math.PI / 6), p.x + r * Math.cos(a + Math.PI / 6), p.y + r * Math.sin(a + Math.PI / 6)]; }
function milieuArete(p, k, f = 0.866) { const a = ANGLES_DIR[k] * Math.PI / 180; return { x: p.x + R.S * f * Math.cos(a), y: p.y + R.S * f * Math.sin(a) }; }

/* Hauteur du sol, interpolée dans la grille du relief. */
function hauteurSol(x, y) {
  const M = R.monde;
  if (!M || !M.grille) return 0;
  const g = M.grille, fx = (x - g.x0) / g.e, fy = (y - g.y0) / g.e;
  const ix = Math.max(0, Math.min(g.nx - 2, Math.floor(fx))), iy = Math.max(0, Math.min(g.ny - 2, Math.floor(fy)));
  const tx = Math.min(1, Math.max(0, fx - ix)), ty = Math.min(1, Math.max(0, fy - iy)), H = g.H, n = g.nx;
  const a = H[iy * n + ix], b = H[iy * n + ix + 1], c = H[(iy + 1) * n + ix], d = H[(iy + 1) * n + ix + 1];
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}
const hauteurVue = (x, y) => { const i = hexDuMonde(x, y); return i >= 0 && !connaitTuile(i) ? 10 : Math.max(0, hauteurSol(x, y)); };

/* ---------- Caméra : regard incliné, plus rasant quand on zoome ---------- */
function geomCam() {
  const z = R.cam.z, d = 560 / z, t = Math.min(1, Math.max(0, (z - 0.35) / 2.25)), a = (60 - 18 * t) * Math.PI / 180;
  return { d, a };
}
function majCamera() {
  const { d, a } = geomCam(), c = R.camera;
  c.aspect = R.larg / R.haut; c.near = Math.max(2, d * 0.05); c.far = d * 6; c.updateProjectionMatrix();
  c.position.set(R.cam.x, d * Math.sin(a), R.cam.y + d * Math.cos(a));
  c.lookAt(R.cam.x, 0, R.cam.y);
  c.updateMatrixWorld();
  if (R.scene.fog) { R.scene.fog.near = d * 1.15; R.scene.fog.far = d * 3.2; }
  const L = R.monde && R.monde.soleil;
  if (L) {
    L.position.set(R.cam.x - 260, 420, R.cam.y - 220); L.target.position.set(R.cam.x, 0, R.cam.y); L.target.updateMatrixWorld();
    const s = d * 0.95, sc = L.shadow.camera;
    sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.near = 50; sc.far = 1400; sc.updateProjectionMatrix();
  }
}
const pxMonde = () => { const { d } = geomCam(); return 2 * d * Math.tan(FOV / 2 * Math.PI / 180) / R.haut; };
function solPoint(sx, sy, relief) {
  if (!R.camera) return null;
  const v = new THREE.Vector3((sx / R.larg) * 2 - 1, -(sy / R.haut) * 2 + 1, 0.5).unproject(R.camera);
  const o = R.camera.position, dir = v.sub(o).normalize();
  if (dir.y > -1e-4) return null;
  let h = 0, p = null;
  for (let k = 0; k < (relief ? 4 : 1); k++) {
    const t = (h - o.y) / dir.y;
    p = { x: o.x + dir.x * t, y: o.z + dir.z * t };
    if (relief) h = hauteurVue(p.x, p.y);
  }
  return p;
}
function tuileEn(sx, sy) { if (!G) return -1; const p = solPoint(sx, sy, true); return p ? hexDuMonde(p.x, p.y) : -1; }
function borneCam() {
  if (!G) return;
  const m = tailleMonde();
  R.cam.x = Math.min(m.w, Math.max(0, R.cam.x)); R.cam.y = Math.min(m.h + 60, Math.max(-40, R.cam.y));
}
function panoramique(dx, dy) {
  if (!R.camera) return;
  const k = pxMonde(), { a } = geomCam();
  R.cam.x -= dx * k; R.cam.y -= dy * k / Math.sin(a);
  R.camAnim = null; borneCam(); R.sale = true;
}
function regarder(x, y) { R.cam.x = x; R.cam.y = y; R.camAnim = null; borneCam(); R.sale = true; }
function zoomer(f, sx, sy) {
  const z0 = R.cam.z, z = Math.min(2.6, Math.max(0.35, z0 * f));
  if (z === z0 || !R.camera) return;
  const px = sx ?? R.larg / 2, py = sy ?? R.haut / 2;
  const p0 = solPoint(px, py, false);
  R.cam.z = z; majCamera();
  const p1 = solPoint(px, py, false);
  if (p0 && p1) { R.cam.x += p0.x - p1.x; R.cam.y += p0.y - p1.y; }
  borneCam(); R.sale = true;
}
/* decal : où placer la case à l'écran, en pixels depuis le centre (ex. { x: -200 } = à gauche). */
function centrerSur(i, anime = true, decal) {
  if (i < 0 || i == null || !G || !R.camera) return;
  const p = centreTuile(i), k = pxMonde(), { a } = geomCam();
  const but = { x: p.x - (decal ? (decal.x || 0) * k : 0), y: p.y - (decal ? (decal.y || 0) * k / Math.sin(a) : 0) };
  if (!anime || (typeof Prefs !== 'undefined' && Prefs.reduit)) { R.cam.x = but.x; R.cam.y = but.y; borneCam(); R.sale = true; return; }
  R.camAnim = { de: { x: R.cam.x, y: R.cam.y }, a: but, t0: performance.now(), d: 380 };
}
function projeter(x, y, h) {
  const v = new THREE.Vector3(x, h, y).project(R.camera);
  return { x: (v.x + 1) / 2 * R.larg, y: (1 - v.y) / 2 * R.haut, devant: v.z < 1 && v.z > -1 };
}
function ecranTuile(i) { majCamera(); const p = centreTuile(i); return projeter(p.x, p.y, Math.max(0, hauteurSol(p.x, p.y))); }
function estVisibleEcran(i, marge = 0) {
  if (!R.camera) return false;
  const p = ecranTuile(i);
  return p.devant && p.x > marge && p.x < R.larg - marge && p.y > marge + 50 && p.y < R.haut - marge - 80;
}

/* ---------- Matériaux : brouillard, nuages et surbrillances ajoutés aux shaders ---------- */
const U = {
  uBrume: { value: null }, uMarques: { value: null }, uNuages: { value: null },
  uK: { value: 0.12 }, uTaille: { value: null }, uKM: { value: 0.3 }, uTailleM: { value: null },
  uActif: { value: 1 }, uTemps: { value: 0 },
  uRivage: { value: null }, uRivO: { value: null }, uRivT: { value: null },
};
function patcher(mat, defs) {
  mat.defines = Object.assign(mat.defines || {}, defs);
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    const tete = 'uniform sampler2D uBrume; uniform sampler2D uMarques; uniform sampler2D uNuages; uniform sampler2D uRivage; uniform vec2 uRivO; uniform vec2 uRivT; uniform float uK; uniform vec2 uTaille; uniform float uKM; uniform vec2 uTailleM; uniform float uActif; uniform float uTemps; varying vec3 vMonde;\n';
    sh.vertexShader = tete + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 aubeP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        aubeP = instanceMatrix * aubeP;
      #endif
      aubeP = modelMatrix * aubeP;
      vMonde = aubeP.xyz;
      float aubeInc = uActif * texture2D(uBrume, aubeP.xz * uK / uTaille).r;
      #ifdef AUBE_SOL
        float aubeN = texture2D(uNuages, aubeP.xz / 520.0).r;
        transformed.y = mix(transformed.y, 7.0 + aubeN * 9.0, smoothstep(0.12, 0.8, aubeInc));
      #endif
      #ifdef AUBE_OBJET
        transformed *= 1.0 - smoothstep(0.3, 0.55, aubeInc);
      #endif
      #ifdef AUBE_ENFOUIR
        transformed.y -= 80.0 * smoothstep(0.3, 0.55, aubeInc);
      #endif`);
    sh.fragmentShader = tete + sh.fragmentShader.replace('#include <dithering_fragment>', `
      vec4 aubeB = uActif * texture2D(uBrume, vMonde.xz * uK / uTaille);
      #ifdef AUBE_SOL
        gl_FragColor.rgb *= 0.9 + 0.2 * texture2D(uNuages, vMonde.xz / 34.0).r;
      #endif
      #ifdef AUBE_EAU
        float aubeR = texture2D(uRivage, (vMonde.xz - uRivO) / uRivT).r;
        float aubeV = texture2D(uNuages, vMonde.xz / 38.0 + vec2(uTemps * 0.02, uTemps * 0.013)).r;
        float aubeEcume = smoothstep(0.3, 0.95, aubeR) * smoothstep(0.4, 0.8, aubeV + 0.22 * sin(uTemps * 1.6 + aubeR * 9.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.93, 0.97, 1.0), aubeEcume * 0.55);
      #endif
      #ifdef AUBE_MARQUES
        vec4 aubeM = texture2D(uMarques, vMonde.xz * uKM / uTailleM);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.97, 0.86), aubeM.r * 0.3);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.95, 0.28, 0.18), aubeM.g * 0.7);
        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.95, 0.78), aubeM.b * 0.85);
      #endif
      float aubeGris = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(aubeGris) * 0.5 + vec3(0.0, 0.012, 0.035), aubeB.g * 0.72);
      float aubeN1 = texture2D(uNuages, vMonde.xz / 520.0 + vec2(uTemps * 0.003, 0.0)).r;
      float aubeN2 = texture2D(uNuages, vMonde.xz / 160.0 - vec2(0.0, uTemps * 0.005)).r;
      vec3 aubeNuage = mix(vec3(0.06, 0.08, 0.12), vec3(0.36, 0.4, 0.48), smoothstep(0.2, 0.9, aubeN1 * 0.62 + aubeN2 * 0.38));
      gl_FragColor.rgb = mix(gl_FragColor.rgb, aubeNuage, smoothstep(0.18, 0.7, aubeB.r));
      #include <dithering_fragment>`);
  };
  mat.customProgramCacheKey = () => 'aube' + Object.keys(defs).join(',');
  return mat;
}
let MAT = null;
function materiaux() {
  if (MAT) return MAT;
  MAT = {
    sol: patcher(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }), { AUBE_SOL: '', AUBE_MARQUES: '' }),
    arbre: patcher(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), { AUBE_OBJET: '' }),
    objet: patcher(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), { AUBE_OBJET: '' }),
    ruban: patcher(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2 }), { AUBE_ENFOUIR: '' }),
    front: patcher(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), { AUBE_ENFOUIR: '' }),
    unite: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, side: THREE.DoubleSide }),
    anneau: new THREE.MeshBasicMaterial({ color: 0xfff6d8, transparent: true, opacity: 0.85, depthWrite: false }),
    chemin: new THREE.MeshBasicMaterial({ color: 0xfcf2d2, transparent: true, opacity: 0.95, depthTest: false }),
  };
  return MAT;
}

/* ---------- Textures générées ---------- */
function bruitRaccord(b, n, f, oct) {
  return (x, y) => {
    const fx = x / n, fy = y / n, g = (a, c) => b(a * f, c * f, oct);
    return g(fx, fy) * (1 - fx) * (1 - fy) + g(fx - 1, fy) * fx * (1 - fy) + g(fx, fy - 1) * (1 - fx) * fy + g(fx - 1, fy - 1) * fx * fy;
  };
}
function texNuages() {
  const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), h = bruitRaccord(creerBruit(creerAlea(99)), n, 5, 5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const o = (y * n + x) * 4, k = Math.max(0, Math.min(255, (h(x, y) - 0.2) * 420));
    img.data[o] = img.data[o + 1] = img.data[o + 2] = k; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function texNormaleEau() {
  const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), h = bruitRaccord(creerBruit(creerAlea(7)), n, 8, 3);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 6, dy = (h(x, y + 1) - h(x, y - 1)) * 6, l = Math.hypot(dx, dy, 1), o = (y * n + x) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function hexChemin(g, cx, cy, r) {
  g.beginPath();
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 180) * (60 * k - 30); g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
  g.closePath();
}

/* ---------- Relief ---------- */
function flou(a, nx, ny, r, passes, pas = 1) {
  const tmp = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) for (let c = 0; c < pas; c++) {
    for (let y = 0; y < ny; y++) {
      let s = 0, n = 0;
      for (let x = 0; x <= r && x < nx; x++) { s += a[(y * nx + x) * pas + c]; n++; }
      for (let x = 0; x < nx; x++) {
        tmp[(y * nx + x) * pas + c] = s / n;
        const aj = x + r + 1, re = x - r;
        if (aj < nx) { s += a[(y * nx + aj) * pas + c]; n++; }
        if (re >= 0) { s -= a[(y * nx + re) * pas + c]; n--; }
      }
    }
    for (let x = 0; x < nx; x++) {
      let s = 0, n = 0;
      for (let y = 0; y <= r && y < ny; y++) { s += tmp[(y * nx + x) * pas + c]; n++; }
      for (let y = 0; y < ny; y++) {
        a[(y * nx + x) * pas + c] = s / n;
        const aj = y + r + 1, re = y - r;
        if (aj < ny) { s += tmp[(aj * nx + x) * pas + c]; n++; }
        if (re >= 0) { s -= tmp[(re * nx + x) * pas + c]; n--; }
      }
    }
  }
}
const COUL_SOL = { ocean: '#18394f', cote: '#3c8a8c', prairie: '#5c9638', plaine: '#a39b4c', desert: '#dbc081', toundra: '#868f72', neige: '#eef2f3' };
function construireSol(M) {
  const m = tailleMonde(), e = qualiteHaute() ? 6 : 9, PAD = 90;
  const nx = Math.ceil((m.w + 2 * PAD) / e) + 1, ny = Math.ceil((m.h + 2 * PAD) / e) + 1, N = nx * ny, x0 = -PAD, y0 = -PAD;
  const H = new Float32Array(N), C = new Float32Array(N * 3), coll = new Float32Array(N);
  const bruit = creerBruit(creerAlea((G.graine ^ 0x5f3759) >>> 0));
  const lin = {}; for (const k in COUL_SOL) lin[k] = new THREE.Color(COUL_SOL[k]);
  const sombre = new THREE.Color('#2f5a26'), jungle = new THREE.Color('#2c6630'), marais = new THREE.Color('#4c6a46'), tmp = new THREE.Color();
  for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) {
    const v = gy * nx + gx, i = hexDuMonde(x0 + gx * e, y0 + gy * e), t = i >= 0 ? G.tuiles[i] : null;
    let h = -8; tmp.copy(lin.ocean);
    if (t) {
      if (t.t === 'ocean') h = -8;
      else if (t.t === 'cote') { h = -2.6; tmp.copy(lin.cote); }
      else {
        h = t.rel === 1 ? 4.6 : t.rel === 2 ? 5 : 1.7;
        if (t.cv === 'marais') h = 0.8;
        tmp.copy(lin[t.t]);
        if (t.cv === 'foret') tmp.lerp(sombre, 0.45); else if (t.cv === 'jungle') tmp.copy(jungle); else if (t.cv === 'marais') tmp.copy(marais);
        if (t.rel === 1) coll[v] = 1;
      }
    }
    H[v] = h; C[v * 3] = tmp.r; C[v * 3 + 1] = tmp.g; C[v * 3 + 2] = tmp.b;
  }
  const rf = Math.max(1, Math.round(17 / e));
  flou(H, nx, ny, rf, 2); flou(C, nx, ny, Math.max(1, Math.round(11 / e)), 2, 3); flou(coll, nx, ny, rf, 1);
  /* Montagnes : trois pics par case, crêtes irrégulières. */
  const pics = new Float32Array(N), al = creerAlea((G.graine * 31 + 7) >>> 0);
  G.tuiles.forEach((t, i) => {
    if (t.rel !== 2) return;
    const p = centreTuile(i);
    for (let k = 0; k < 3; k++) {
      const px = p.x + (al() - 0.5) * R.S * 0.9, py = p.y + (al() - 0.5) * R.S * 0.8, hp = (k === 0 ? 24 : 15) + al() * 8, rp = 15 + al() * 7;
      const ga = Math.max(0, Math.floor((px - rp - x0) / e)), gb = Math.min(nx - 1, Math.ceil((px + rp - x0) / e));
      const ha = Math.max(0, Math.floor((py - rp - y0) / e)), hb = Math.min(ny - 1, Math.ceil((py + rp - y0) / e));
      for (let gy = ha; gy <= hb; gy++) for (let gx = ga; gx <= gb; gx++) {
        const x = x0 + gx * e, y = y0 + gy * e, d = Math.hypot(x - px, y - py) / rp;
        if (d >= 1) continue;
        const crete = 1 - Math.abs(bruit(x / 9, y / 9, 3) * 2 - 1);
        const val = hp * Math.pow(1 - d, 1.35) * (0.75 + 0.4 * crete), v = gy * nx + gx;
        if (val > pics[v]) pics[v] = val;
      }
    }
  });
  const sable = new THREE.Color('#d8c78f'), turq = new THREE.Color('#3f9ea3'), prof = new THREE.Color('#123550'), neige = new THREE.Color('#f4f6f7'), roche = new THREE.Color('#7a746a');
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  for (let gy = 0; gy < ny; gy++) for (let gx = 0; gx < nx; gx++) {
    const v = gy * nx + gx, x = x0 + gx * e, y = y0 + gy * e;
    let h = H[v];
    const L = Math.min(1, Math.max(0, h / 1.7));
    h += (bruit(x / 46, y / 46, 3) - 0.5) * 1.8 * L + coll[v] * (bruit(x / 15, y / 15, 3) - 0.3) * 7 + pics[v];
    H[v] = h;
    tmp.setRGB(C[v * 3], C[v * 3 + 1], C[v * 3 + 2]);
    if (h < 0.25) { const d = 0.25 - h; tmp.copy(sable).lerp(turq, Math.min(1, d / 2.2)).lerp(prof, Math.min(1, Math.max(0, (d - 2.2) / 5))); }
    else if (h < 1.2) tmp.lerp(sable, Math.min(1, (1.2 - h) / 0.95) * 0.85);
    tmp.multiplyScalar(0.88 + 0.24 * bruit(x / 23, y / 23, 2));
    if (h > 16) tmp.lerp(neige, Math.min(1, (h - 16) / 5));
    pos[v * 3] = x; pos[v * 3 + 1] = h; pos[v * 3 + 2] = y;
    col[v * 3] = tmp.r; col[v * 3 + 1] = tmp.g; col[v * 3 + 2] = tmp.b;
  }
  const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
  let o = 0;
  for (let gy = 0; gy < ny - 1; gy++) for (let gx = 0; gx < nx - 1; gx++) {
    const a = gy * nx + gx, b = a + 1, c = a + nx, d = c + 1;
    idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal.array;
  for (let v = 0; v < N; v++) {
    const pente = nor[v * 3 + 1], h = pos[v * 3 + 1];
    if (h > 2.5 && pente < 0.84) {
      tmp.setRGB(col[v * 3], col[v * 3 + 1], col[v * 3 + 2]).lerp(roche, Math.min(1, (0.84 - pente) * 3.2) * (h > 16 ? 0.35 : 1));
      col[v * 3] = tmp.r; col[v * 3 + 1] = tmp.g; col[v * 3 + 2] = tmp.b;
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  M.grille = { x0, y0, e, nx, ny, H };
  const riv = new Uint8Array(N * 4);
  for (let v = 0; v < N; v++) { const h = H[v]; riv[v * 4] = h < 0.4 ? Math.max(0, Math.min(255, (1 - Math.abs(h + 0.3) / 0.6) * 255)) : 0; riv[v * 4 + 3] = 255; }
  const texRiv = new THREE.DataTexture(riv, nx, ny); texRiv.magFilter = texRiv.minFilter = THREE.LinearFilter; texRiv.needsUpdate = true;
  U.uRivage.value = texRiv; U.uRivO.value = new THREE.Vector2(x0, y0); U.uRivT.value = new THREE.Vector2((nx - 1) * e, (ny - 1) * e);
  const sol = new THREE.Mesh(geo, materiaux().sol);
  sol.receiveShadow = true; sol.castShadow = qualiteHaute();
  return sol;
}

/* ---------- Arbres ---------- */
function construireArbres(M) {
  const lots = { sapin: [], feuillu: [], palmier: [], roseau: [], touffe: [], rocher: [], buisson: [] }, c = new THREE.Color(), al = creerAlea((G.graine * 13 + 5) >>> 0);
  const ajoute = (sorte, x, y, ech, coul) => { const h = hauteurSol(x, y); if (h < 0.4) return; lots[sorte].push({ x, y, h: h - 0.3, ech, coul, rot: al() * 6.3 }); };
  G.tuiles.forEach((t, i) => {
    if (VIL[i] || TERRAINS[t.t].eau || t.rel === 2) return;
    const p = centreTuile(i);
    const place = () => { const a = al() * Math.PI * 2, d = Math.sqrt(al()) * R.S * 0.8; return { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.92 }; };
    if (t.cv === 'foret' || t.cv === 'jungle') {
      const nb = t.cv === 'jungle' ? 10 : 9;
      for (let k = 0; k < nb; k++) {
        const q = place();
        if (t.cv === 'jungle') { if (al() < 0.3) ajoute('palmier', q.x, q.y, 0.9 + al() * 0.4, '#3a8a40'); else ajoute('feuillu', q.x, q.y, 0.95 + al() * 0.4, al() < 0.5 ? '#1f5a34' : '#2b6a3c'); }
        else if (t.t === 'toundra') ajoute('sapin', q.x, q.y, 0.9 + al() * 0.5, '#2c4c3a');
        else if (al() < 0.38) ajoute('sapin', q.x, q.y, 0.95 + al() * 0.5, al() < 0.5 ? '#2c5530' : '#27492b');
        else ajoute('feuillu', q.x, q.y, 0.85 + al() * 0.45, ['#3d6f30', '#4a7d35', '#356428', '#58833a'][Math.floor(al() * 4)]);
      }
    } else if (t.cv === 'marais') { for (let k = 0; k < 5; k++) { const q = place(); ajoute('roseau', q.x, q.y, 0.8 + al() * 0.5, '#5a7a3a'); } }
    else if (!t.res && (t.t === 'prairie' || t.t === 'plaine') && al() < 0.3) { const q = place(); ajoute('feuillu', q.x, q.y, 0.7 + al() * 0.3, '#4a7d35'); }
    if (qualiteHaute() && !t.cv) {
      const herbe = { prairie: '#6a9a3e', plaine: '#a39b4c', toundra: '#7d8a62' }[t.t];
      if (herbe) for (let k = 0; k < 4; k++) { const q = place(); ajoute('touffe', q.x, q.y, 0.8 + al() * 0.6, herbe); }
      if (t.t === 'plaine' && al() < 0.5) { const q = place(); ajoute('buisson', q.x, q.y, 0.8 + al() * 0.5, '#5a7d38'); }
    }
    if (t.rel === 1 || t.t === 'desert' || t.t === 'toundra') { const nb = t.rel === 1 ? 3 : 1; for (let k = 0; k < nb; k++) { const q = place(); ajoute('rocher', q.x, q.y, 0.6 + al() * 0.9, t.t === 'desert' ? '#b49a70' : '#8a8478'); } }
  });
  const groupe = new THREE.Group(), mat = new THREE.Matrix4(), q = new THREE.Quaternion(), axe = new THREE.Vector3(0, 1, 0);
  for (const sorte in lots) {
    const l = lots[sorte];
    if (!l.length) continue;
    const im = new THREE.InstancedMesh(geoArbre(sorte), materiaux().arbre, l.length);
    im.userData.partage = true;
    l.forEach((a, k) => {
      q.setFromAxisAngle(axe, a.rot);
      mat.compose(new THREE.Vector3(a.x, a.h, a.y), q, new THREE.Vector3(a.ech, a.ech, a.ech));
      im.setMatrixAt(k, mat); im.setColorAt(k, c.set(a.coul));
    });
    im.castShadow = qualiteHaute(); im.receiveShadow = true;
    groupe.add(im);
  }
  M.sigArbres = G.tuiles.map(t => (t.cv ? t.cv[0] : '-')).join('');
  return groupe;
}

/* ---------- Rubans : rivières, routes, frontières ---------- */
class Lot {
  constructor(alpha) { this.p = []; this.c = []; this.i = []; this.a = alpha; }
  sommet(x, y, z, c, al = 1) { this.p.push(x, y, z); if (this.a) this.c.push(c.r, c.g, c.b, al); else this.c.push(c.r, c.g, c.b); return this.p.length / 3 - 1; }
  bande(pts, l, c, al = 1) {
    let prec = -1;
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      let dx = b.x - a.x, dy = b.y - a.y; const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
      const g = this.sommet(pts[k].x - dy * l / 2, pts[k].h, pts[k].y + dx * l / 2, c, al);
      const d = this.sommet(pts[k].x + dy * l / 2, pts[k].h, pts[k].y - dx * l / 2, c, al);
      if (prec >= 0) this.i.push(prec, g, prec + 1, prec + 1, g, d);
      prec = g;
    }
  }
  geometrie() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, this.a ? 4 : 3));
    g.setIndex(this.i); g.computeVertexNormals();
    return g;
  }
}
function courbe(a, b, ctrl, n, lever) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t, x = u * u * a.x + 2 * u * t * ctrl.x + t * t * b.x, y = u * u * a.y + 2 * u * t * ctrl.y + t * t * b.y;
    pts.push({ x, y, h: Math.max(0.15, hauteurSol(x, y)) + lever });
  }
  return pts;
}
function construireRivieres() {
  const lot = new Lot(false), bleu = new THREE.Color('#3b88b8');
  G.tuiles.forEach((t, i) => {
    if (!t.riv) return;
    const p = centreTuile(i), l = 2.4 + Math.min(3, (t.rf || 0) * 0.3);
    for (let k = 0; k < 6; k++) {
      if (!(t.riv & (1 << k))) continue;
      const m = milieuArete(p, k, 1.0), a = ANGLES_DIR[k] * Math.PI / 180, ond = ((i * 7 + k * 3) % 5 - 2) * R.S * 0.08;
      lot.bande(courbe(p, m, { x: (p.x + m.x) / 2 - Math.sin(a) * ond, y: (p.y + m.y) / 2 + Math.cos(a) * ond }, 8, 0.45), l, bleu);
    }
  });
  const mesh = new THREE.Mesh(lot.geometrie(), materiaux().ruban);
  mesh.receiveShadow = true;
  return mesh;
}
function construireRoutes() {
  const lot = new Lot(false), brun = new THREE.Color('#8f6d45');
  G.tuiles.forEach((t, i) => {
    if (!t.rt || !connaitTuile(i)) return;
    const p = centreTuile(i);
    for (let k = 0; k < 6; k++) {
      const j = VOIS[i * 6 + k];
      if (j < 0 || !G.tuiles[j].rt || !connaitTuile(j)) continue;
      const m = milieuArete(p, k, 0.9);
      lot.bande(courbe(p, m, { x: (p.x + m.x) / 2, y: (p.y + m.y) / 2 }, 5, 0.55), 2.6, brun);
    }
  });
  const mesh = new THREE.Mesh(lot.geometrie(), materiaux().ruban);
  mesh.receiveShadow = true;
  return mesh;
}
function construireFrontieres() {
  const lot = new Lot(true);
  G.tuiles.forEach((t, i) => {
    if (t.prop < 0 || !connaitTuile(i)) return;
    const p = centreTuile(i), c = new THREE.Color(G.civs[t.prop].couleur);
    for (let k = 0; k < 6; k++) {
      const j = VOIS[i * 6 + k];
      if (j >= 0 && G.tuiles[j].prop === t.prop) continue;
      const [x1, y1, x2, y2] = arete(p, k, R.S * 0.95), pts = [], int = [];
      for (let s = 0; s <= 4; s++) {
        const x = x1 + (x2 - x1) * s / 4, y = y1 + (y2 - y1) * s / 4;
        pts.push({ x, y, h: Math.max(0.3, hauteurSol(x, y)) + 1.2 });
        const xi = x + (p.x - x) * 0.26, yi = y + (p.y - y) * 0.26;
        int.push({ x: xi, y: yi, h: Math.max(0.3, hauteurSol(xi, yi)) + 1.2 });
      }
      lot.bande(pts, 1.8, c, 0.95);
      let prec = -1;
      for (let s = 0; s <= 4; s++) {
        const a = lot.sommet(pts[s].x, pts[s].h, pts[s].y, c, 0.5); lot.sommet(int[s].x, int[s].h, int[s].y, c, 0);
        if (prec >= 0) lot.i.push(prec, prec + 1, a, a, prec + 1, a + 1);
        prec = a;
      }
    }
  });
  const mesh = new THREE.Mesh(lot.geometrie(), materiaux().front);
  mesh.renderOrder = 2;
  return mesh;
}

/* ---------- Monde ---------- */
function vider(obj) {
  if (!obj) return;
  obj.traverse(o => { if (o.geometry && !o.userData.partage) o.geometry.dispose(); });
  if (obj.parent) obj.parent.remove(obj);
}
function construireMonde() {
  if (R.monde) vider(R.monde.racine);
  for (const e of R.unites.values()) e.drapeau.remove();
  for (const e of R.villes.values()) e.banniere.remove();
  for (const t of R.textes) t.el.remove();
  R.unites.clear(); R.villes.clear(); R.textes = [];
  const M = { G, racine: new THREE.Group(), couches: {}, amel: new Map(), res: new Map(), sigs: {} };
  R.monde = M;
  R.scene.add(M.racine);
  const m = tailleMonde();
  const ciel = new THREE.HemisphereLight(0xdfe9ff, 0x4a4030, 1.15);
  const soleil = new THREE.DirectionalLight(0xfff0d8, 2.5);
  soleil.castShadow = qualiteHaute();
  soleil.shadow.mapSize.set(2048, 2048); soleil.shadow.bias = -0.0006; soleil.shadow.normalBias = 0.8;
  M.racine.add(ciel, soleil, soleil.target); M.soleil = soleil;
  M.racine.add(construireSol(M));
  const eauG = new THREE.PlaneGeometry(m.w + 4000, m.h + 4000); eauG.rotateX(-Math.PI / 2);
  const normale = texNormaleEau(); normale.repeat.set((m.w + 4000) / 90, (m.h + 4000) / 90);
  const matEau = patcher(new THREE.MeshStandardMaterial({ color: 0x2b6f98, transparent: true, opacity: 0.8, roughness: 0.32, metalness: 0.05, normalMap: normale, normalScale: new THREE.Vector2(0.35, 0.35) }), { AUBE_MARQUES: '', AUBE_EAU: '' });
  const eau = new THREE.Mesh(eauG, matEau); eau.position.set(m.w / 2, 0.15, m.h / 2); eau.receiveShadow = true;
  M.normaleEau = normale; M.racine.add(eau);
  M.arbres = construireArbres(M); M.racine.add(M.arbres);
  M.racine.add(construireRivieres());
  const kB = 0.12, kM = 0.3;
  M.brume = document.createElement('canvas'); M.brume.width = Math.ceil(m.w * kB); M.brume.height = Math.ceil(m.h * kB);
  M.marques = document.createElement('canvas'); M.marques.width = Math.ceil(m.w * kM); M.marques.height = Math.ceil(m.h * kM);
  M.texBrume = new THREE.CanvasTexture(M.brume); M.texBrume.flipY = false;
  M.texMarques = new THREE.CanvasTexture(M.marques); M.texMarques.flipY = false;
  U.uBrume.value = M.texBrume; U.uMarques.value = M.texMarques;
  U.uK.value = kB; U.uTaille.value = new THREE.Vector2(M.brume.width, M.brume.height);
  U.uKM.value = kM; U.uTailleM.value = new THREE.Vector2(M.marques.width, M.marques.height);
  if (!U.uNuages.value) U.uNuages.value = texNuages();
  const anneau = new THREE.Mesh(new THREE.RingGeometry(14, 17, 40).rotateX(-Math.PI / 2), materiaux().anneau);
  anneau.visible = false; anneau.renderOrder = 3; M.anneau = anneau; M.racine.add(anneau);
  M.sigBrume = null; M.sigMarques = null; M.sigChemin = null;
  R.miniSale = true;
}

/* ---------- Mises à jour ---------- */
function majBrume(M) {
  const c = moi();
  U.uActif.value = R.toutVoir || !c ? 0 : 1;
  if (!U.uActif.value) return;
  let sig = 0;
  for (let i = 0; i < c.vu.length; i++) sig = (sig * 31 + c.vu[i] * 2 + c.vis[i]) | 0;
  if (sig === M.sigBrume) return;
  M.sigBrume = sig;
  const g = M.brume.getContext('2d'), k = U.uK.value;
  g.fillStyle = 'rgb(255,255,0)'; g.fillRect(0, 0, M.brume.width, M.brume.height);
  for (let i = 0; i < G.W * G.H; i++) {
    if (!c.vu[i]) continue;
    const p = centreTuile(i);
    g.fillStyle = c.vis[i] ? '#000' : 'rgb(0,255,0)';
    hexChemin(g, p.x * k, p.y * k, R.S * k * 1.06); g.fill();
  }
  M.texBrume.needsUpdate = true;
  R.miniSale = true;
}
let numSurb = 0;
function majMarques(M) {
  const sb = R.surbrillance;
  if (sb && !sb._n) sb._n = ++numSurb;
  const sig = `${sb ? sb._n : 0}|${R.survol}|${R.grille}`;
  if (sig === M.sigMarques) return;
  M.sigMarques = sig;
  const g = M.marques.getContext('2d'), k = U.uKM.value, S = R.S;
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#000'; g.fillRect(0, 0, M.marques.width, M.marques.height);
  g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round';
  const hex = (i, r) => { const p = centreTuile(i); hexChemin(g, p.x * k, p.y * k, r * k); };
  if (R.grille) { g.strokeStyle = 'rgb(0,0,70)'; g.lineWidth = 1; for (let i = 0; i < G.W * G.H; i++) if (connaitTuile(i)) { hex(i, S); g.stroke(); } }
  if (sb) {
    if (sb.villeTuiles) { g.fillStyle = 'rgb(0,0,40)'; for (const i of sb.villeTuiles) { hex(i, S * 0.97); g.fill(); } }
    if (sb.villeTrav) { g.fillStyle = 'rgb(0,0,255)'; for (const i of sb.villeTrav) { const p = centreTuile(i); g.beginPath(); g.arc(p.x * k, p.y * k, S * 0.16 * k, 0, 7); g.fill(); } }
    if (sb.atteint && sb.atteint.size) {
      g.fillStyle = 'rgb(255,0,0)'; for (const i of sb.atteint) { hex(i, S * 1.02); g.fill(); }
      g.strokeStyle = 'rgb(0,0,255)'; g.lineWidth = S * k * 0.08;
      for (const i of sb.atteint) {
        const p = centreTuile(i);
        for (let d = 0; d < 6; d++) {
          const j = VOIS[i * 6 + d];
          if (j >= 0 && (sb.atteint.has(j) || j === sb.depart)) continue;
          const [x1, y1, x2, y2] = arete(p, d, S * 0.98);
          g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.stroke();
        }
      }
    }
    if (sb.cibles && sb.cibles.size) { g.fillStyle = 'rgb(0,90,0)'; for (const i of sb.cibles) { hex(i, S * 0.88); g.fill(); } g.strokeStyle = 'rgb(0,255,0)'; g.lineWidth = S * k * 0.14; for (const i of sb.cibles) { hex(i, S * 0.88); g.stroke(); } }
  }
  if (R.survol >= 0 && typeof Prefs !== 'undefined' && Prefs.survol) { g.strokeStyle = 'rgb(0,0,160)'; g.lineWidth = S * k * 0.07; hex(R.survol, S * 0.95); g.stroke(); }
  M.texMarques.needsUpdate = true;
}
function majCouche(M, nom, sig, fabrique) {
  if (M.sigs[nom] === sig) return;
  M.sigs[nom] = sig;
  vider(M.couches[nom]);
  M.couches[nom] = fabrique();
  M.racine.add(M.couches[nom]);
}
const MAT_RES = new Map();
function materielRessource(id) {
  if (MAT_RES.has(id)) return MAT_RES.get(id);
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const g = cv.getContext('2d'), Rs = RESSOURCES[id];
  g.fillStyle = 'rgba(12,16,22,0.8)'; g.beginPath(); g.arc(48, 48, 40, 0, 7); g.fill();
  g.lineWidth = 6; g.strokeStyle = Rs.luxe ? '#e2bf5e' : Rs.p ? '#c9ced3' : '#9fd58a'; g.stroke();
  g.font = '46px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(Rs.ic, 48, 51);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.SpriteMaterial({ map: t, depthWrite: false });
  MAT_RES.set(id, m);
  return m;
}
function majObjets(M) {
  const c = moi();
  majCouche(M, 'routes', G.tuiles.map((t, i) => (t.rt && connaitTuile(i) ? '1' : '0')).join(''), construireRoutes);
  majCouche(M, 'frontieres', G.tuiles.map((t, i) => (connaitTuile(i) ? t.prop : '?')).join(','), construireFrontieres);
  if (G.tuiles.map(t => (t.cv ? t.cv[0] : '-')).join('') !== M.sigArbres) { vider(M.arbres); M.arbres = construireArbres(M); M.racine.add(M.arbres); }
  const vus = new Set();
  G.tuiles.forEach((t, i) => {
    if (VIL[i] || !connaitTuile(i)) return;
    const cle = t.am || (t.hutte ? 'hutte' : t.camp ? 'barbares' : null);
    if (!cle) return;
    vus.add(i);
    const ex = M.amel.get(i);
    if (ex && ex.cle === cle) return;
    if (ex) M.racine.remove(ex.mesh);
    const p = centreTuile(i), mesh = new THREE.Mesh(geoAmel(cle, i % 3), materiaux().objet);
    mesh.userData.partage = true;
    mesh.position.set(p.x, Math.max(0.3, hauteurSol(p.x, p.y)) - 0.2, p.y);
    mesh.rotation.y = ((i * 37) % 6) * Math.PI / 3 + 0.2;
    mesh.castShadow = qualiteHaute(); mesh.receiveShadow = true;
    M.racine.add(mesh); M.amel.set(i, { cle, mesh });
  });
  for (const [i, e] of M.amel) if (!vus.has(i)) { M.racine.remove(e.mesh); M.amel.delete(i); }
  const vusR = new Set();
  G.tuiles.forEach((t, i) => {
    if (!t.res || VIL[i] || !connaitTuile(i) || !resVisible(c, t.res)) return;
    vusR.add(i);
    if (M.res.has(i)) return;
    const sp = new THREE.Sprite(materielRessource(t.res)), p = centreTuile(i), x = p.x - R.S * 0.42, y = p.y + R.S * 0.3;
    sp.position.set(x, Math.max(0.3, hauteurSol(x, y)) + 5, y);
    sp.scale.set(9, 9, 1); sp.renderOrder = 4; sp.userData.partage = true;
    M.racine.add(sp); M.res.set(i, sp);
  });
  for (const [i, sp] of M.res) if (!vusR.has(i)) { M.racine.remove(sp); M.res.delete(i); }
}
function majVilles(M) {
  const vus = new Set();
  for (const v of G.villes) {
    if (!connaitTuile(v.i)) continue;
    vus.add(v.id);
    const civ = G.civs[v.civ], ere = ereCiv(civ);
    const cle = `${Math.min(24, v.pop)}|${ere}|${v.bat.chateau ? 2 : v.bat.remparts ? 1 : 0}|${v.bat.palais ? 1 : 0}|${civ.couleur}`;
    let e = R.villes.get(v.id);
    if (!e || e.cle !== cle) {
      if (e && e.mesh) { M.racine.remove(e.mesh); e.mesh.geometry.dispose(); }
      const p = centreTuile(v.i), h0 = Math.max(0.4, hauteurSol(p.x, p.y));
      const mesh = new THREE.Mesh(geoVille(v, ere, civ.couleur, (dx, dz) => Math.max(0.4, hauteurSol(p.x + dx, p.y + dz)) - h0), materiaux().objet);
      mesh.position.set(p.x, h0, p.y); mesh.scale.set(1.25, 1.35, 1.25); mesh.castShadow = qualiteHaute(); mesh.receiveShadow = true;
      M.racine.add(mesh);
      if (!e) { e = { banniere: creerBanniere(v) }; R.villes.set(v.id, e); }
      e.mesh = mesh; e.cle = cle;
    }
  }
  for (const [id, e] of R.villes) if (!vus.has(id)) { M.racine.remove(e.mesh); e.mesh.geometry.dispose(); e.banniere.remove(); R.villes.delete(id); }
}
function positionUnite(u, now) {
  const a = R.anims.get(u.id);
  if (!a) return centreTuile(u.i);
  const pas = (now - a.t0) / a.dur, k = Math.floor(pas);
  if (k >= a.ch.length - 1) { R.anims.delete(u.id); return centreTuile(u.i); }
  const p = centreTuile(a.ch[k]), q = centreTuile(a.ch[k + 1]), f = pas - k, e = f * f * (3 - 2 * f);
  return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e };
}
function animerDeplacement(u, depart, pas) {
  if (!pas || !pas.length || (typeof Prefs !== 'undefined' && Prefs.reduit)) { R.sale = true; return; }
  R.anims.set(u.id, { ch: [depart, ...pas], t0: performance.now(), dur: 170 });
}
function majUnites(M, now) {
  const vus = new Set(), sel = typeof UI !== 'undefined' ? UI.sel : null;
  M.anneau.visible = false;
  for (const u of G.unites) {
    if (!voitTuile(u.i) && !R.anims.has(u.id)) continue;
    vus.add(u.id);
    const civ = G.civs[u.civ], emb = estEmbarque(u), cle = `${u.type}|${civ.couleur}|${emb ? 1 : 0}`;
    let e = R.unites.get(u.id);
    if (!e || e.cle !== cle) {
      if (e) M.racine.remove(e.mesh);
      const mesh = new THREE.Mesh(geoUnite(u.type, civ.couleur, emb), materiaux().unite);
      mesh.userData.partage = true; mesh.castShadow = qualiteHaute();
      mesh.rotation.y = ((u.id * 7) % 7 - 3) * 0.07;
      M.racine.add(mesh);
      if (!e) { e = { drapeau: creerDrapeau() }; R.unites.set(u.id, e); }
      e.mesh = mesh; e.cle = cle;
    }
    const p = positionUnite(u, now), o = OCC[u.i], anim = R.anims.has(u.id);
    let dx = 0, dy = 0, ech = 1;
    if (o.length > 1 && !anim) { if (estMil(u)) dx = -R.S * 0.25; else { dx = R.S * 0.3; dy = R.S * 0.12; ech = 0.85; } }
    if (VIL[u.i] && !anim) { dy += R.S * 0.42; dx += estMil(u) ? -R.S * 0.25 : R.S * 0.3; ech *= 0.85; }
    const x = p.x + dx, y = p.y + dy, mer = UNITES[u.type].classe === 'mer' || emb;
    const h = mer ? 0.1 + Math.sin(now / 700 + u.id) * 0.25 : Math.max(0.2, hauteurSol(x, y)) - 0.1;
    let hb = h;
    if (anim) {
      const a = R.anims.get(u.id), k = Math.min(a.ch.length - 2, Math.max(0, Math.floor((now - a.t0) / a.dur)));
      const p0 = centreTuile(a.ch[k]), p1 = centreTuile(a.ch[k + 1]), dxm = p1.x - p0.x, dym = p1.y - p0.y;
      e.rot = (MODELES3D[u.type] || {}).face === 'x' || emb ? Math.atan2(dym, -dxm) : Math.atan2(dxm, dym);
      if (!mer) hb += Math.abs(Math.sin(now / 85)) * 0.9;
    }
    e.mesh.rotation.y = e.rot ?? e.mesh.rotation.y;
    e.mesh.position.set(x, hb, y); e.mesh.scale.setScalar(ech * (UNITES[u.type].classe === 'mer' ? 1.7 : 2.1));
    e.x = x; e.y = y; e.h = h; e.u = u;
    if (u.id === sel) { M.anneau.visible = true; M.anneau.position.set(x, h + 0.6, y); M.anneau.material.opacity = 0.6 + 0.3 * Math.sin(now / 200); }
  }
  for (const [id, e] of R.unites) if (!vus.has(id)) { M.racine.remove(e.mesh); e.drapeau.remove(); R.unites.delete(id); }
}
function majChemin(M) {
  const sb = R.surbrillance, ch = sb && sb.chemin && sb.chemin.length ? [sb.depart, ...sb.chemin] : null;
  const sig = ch ? ch.join(',') + (sb.attaque ? 'a' : '') : '';
  if (sig === M.sigChemin) return;
  M.sigChemin = sig;
  if (M.chemin) { M.racine.remove(M.chemin); M.chemin.geometry.dispose(); M.chemin.material.dispose(); M.chemin = null; }
  if (!ch) return;
  const pts = ch.map(i => { const p = centreTuile(i); return new THREE.Vector3(p.x, Math.max(0.3, hauteurSol(p.x, p.y)) + 3, p.y); });
  if (pts.length === 2) pts.splice(1, 0, pts[0].clone().lerp(pts[1], 0.5).add(new THREE.Vector3(0, 3, 0)));
  const mat = materiaux().chemin.clone(); mat.color.set(sb.attaque ? 0xf0553a : 0xfcf2d2);
  M.chemin = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length * 10), 0.9, 6), mat);
  M.chemin.renderOrder = 5;
  M.racine.add(M.chemin);
}

/* ---------- Étiquettes HTML (bandeaux de villes, fanions, textes) ---------- */
function creerBanniere(v) {
  const b = document.createElement('button');
  b.className = 'bv'; b.type = 'button';
  b.addEventListener('click', ev => { ev.stopPropagation(); if (typeof surBanniere === 'function') surBanniere(v.id); });
  R.etiq.appendChild(b);
  return b;
}
function creerDrapeau() { const d = document.createElement('div'); d.className = 'dr'; R.etiq.appendChild(d); return d; }
const toursB = (reste, p) => (p > 0 ? Math.max(1, Math.ceil(reste / p)) : '∞');
function escR(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function majEtiquettes(now) {
  const petit = R.cam.z < 0.55, hors = s => !s.devant || s.x < -160 || s.x > R.larg + 160 || s.y < -40 || s.y > R.haut + 60;
  for (const [id, e] of R.villes) {
    const v = G.villes.find(x => x.id === id), b = e.banniere;
    if (!v) continue;
    const p = centreTuile(v.i), s = projeter(p.x, p.y, Math.max(0.4, hauteurSol(p.x, p.y)) + 30);
    if (hors(s)) { b.style.display = 'none'; continue; }
    b.style.display = '';
    const civ = G.civs[v.civ], mine = v.civ === G.joueur, it = mine ? v.file[0] : null, cout = it ? coutItem(v, it) : 0;
    let prod;
    if (mine) {
      const ic = !it ? '❗' : it.k === 'u' ? UNITES[it.id].ic : it.k === 'm' ? '★' : it.k === 'p' ? '⚙️' : '🏛️';
      prod = `<span class="pr">${ic}${it && cout < INF ? ` ${toursB(cout - v.prod, bilanVille(v).p)}` : ''}</span>`;
    } else prod = `<span class="pr">🛡 ${forceVille(v)}</span>`;
    const pvm = pvMaxVille(v);
    const jauges = mine ? `<i class="jp"><i style="width:${it && cout < INF ? Math.min(100, v.prod / cout * 100) : 0}%"></i></i><i class="jc"><i style="width:${Math.min(100, Math.max(0, v.nour / seuilCroissance(v.pop) * 100))}%"></i></i>` : '';
    const html = `<span class="po">${v.pop}</span><span class="no">${v.bat.palais ? '★ ' : ''}${escR(v.nom)}</span>${petit ? '' : prod + jauges}${v.pv < pvm ? `<i class="pv"><i style="width:${v.pv / pvm * 100}%"></i></i>` : ''}`;
    if (b._html !== html) { b.innerHTML = html; b._html = html; b.style.setProperty('--c', civ.couleur); b.classList.toggle('mienne', mine); }
    b.style.transform = `translate(${Math.round(s.x)}px,${Math.round(s.y)}px) translate(-50%,-100%)`;
  }
  const sel = typeof UI !== 'undefined' ? UI.sel : null;
  for (const [, e] of R.unites) {
    const d = e.drapeau, u = e.u;
    if (!u || petit) { d.style.display = 'none'; continue; }
    const s = projeter(e.x, e.y, e.h + (UNITES[u.type].classe === 'mer' ? 34 : 28));
    if (hors(s)) { d.style.display = 'none'; continue; }
    d.style.display = '';
    const html = `<span>${UNITES[u.type].ic}</span>${u.niv ? `<b>${'★'.repeat(Math.min(3, u.niv))}</b>` : ''}${u.pv < 100 ? `<i class="pv"><i style="width:${u.pv}%;background:${u.pv > 60 ? '#7cc46a' : u.pv > 30 ? '#e2b23c' : '#e2543c'}"></i></i>` : ''}${u.civ === G.joueur && u.mv > 0 && !u.ordre ? '<em></em>' : ''}${u.ordre === 'fort' && u.fort >= 1 ? '<s>⛉</s>' : ''}`;
    if (d._html !== html) { d.innerHTML = html; d._html = html; d.style.setProperty('--c', G.civs[u.civ].couleur); }
    d.classList.toggle('sel', u.id === sel);
    d.style.transform = `translate(${Math.round(s.x)}px,${Math.round(s.y)}px) translate(-50%,-100%)`;
  }
  R.textes = R.textes.filter(t => { if (now - t.t0 > 1500) { t.el.remove(); return false; } return true; });
  for (const t of R.textes) {
    const p = centreTuile(t.i), s = projeter(p.x, p.y, Math.max(0, hauteurSol(p.x, p.y)) + 16), k = (now - t.t0) / 1500;
    t.el.style.transform = `translate(${Math.round(s.x)}px,${Math.round(s.y - k * 40)}px) translate(-50%,-50%)`; t.el.style.opacity = String(1 - k * k);
  }
  const sb = R.surbrillance, marques = sb && sb.marques ? sb.marques : [];
  while (R.reperes.length < marques.length) { const m = document.createElement('div'); m.className = 'mq'; R.etiq.appendChild(m); R.reperes.push(m); }
  R.reperes.forEach((m, k) => {
    const q = marques[k];
    if (!q) { m.style.display = 'none'; return; }
    const p = centreTuile(q.i), s = projeter(p.x, p.y, Math.max(0.3, hauteurSol(p.x, p.y)) + 4);
    m.style.display = ''; m.textContent = q.n; m.style.transform = `translate(${Math.round(s.x)}px,${Math.round(s.y)}px) translate(-50%,-50%)`;
  });
}
function texteFlottant(i, txt, coul) {
  if (!R.etiq) return;
  const el = document.createElement('div'); el.className = 'tf'; el.textContent = txt; el.style.color = coul;
  R.etiq.appendChild(el);
  R.textes.push({ i, txt, coul, t0: performance.now(), el });
  R.sale = true;
}

/* ---------- Image ---------- */
function dessiner(now) {
  if (!G || !R.rendu) return;
  if (!R.monde || R.monde.G !== G) construireMonde();
  const M = R.monde;
  if (R.camAnim) {
    const a = R.camAnim, k = Math.min(1, (now - a.t0) / a.d), e = 1 - Math.pow(1 - k, 3);
    R.cam.x = a.de.x + (a.a.x - a.de.x) * e; R.cam.y = a.de.y + (a.a.y - a.de.y) * e; borneCam();
    if (k >= 1) R.camAnim = null;
  }
  majCamera();
  R.temps = now / 1000;
  U.uTemps.value = R.temps;
  M.normaleEau.offset.set(R.temps * 0.006, R.temps * 0.004);
  majBrume(M); majMarques(M); majObjets(M); majVilles(M); majUnites(M, now); majChemin(M);
  R.rendu.render(R.scene, R.camera);
  majEtiquettes(now);
}

/* ---------- Mini-carte ---------- */
function dessinerMini() {
  if (!R.mini || !G || !R.camera) return;
  const W = G.W, H = G.H, cw = R.mini.width, ch = R.mini.height, g = R.mx;
  if (R.miniSale || !R.miniCache) {
    const img = g.createImageData(cw, ch), d = img.data, kx = cw / (W + 0.5), ky = ch / H;
    const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
    for (let py = 0; py < ch; py++) for (let px = 0; px < cw; px++) {
      const r = Math.min(H - 1, Math.floor(py / ky)), col = Math.min(W - 1, Math.max(0, Math.floor(px / kx - 0.5 * (r & 1)))), i = r * W + col;
      let c3 = [10, 14, 19];
      if (connaitTuile(i)) {
        const t = G.tuiles[i];
        c3 = rgb(t.prop >= 0 && !TERRAINS[t.t].eau ? G.civs[t.prop].couleur : (t.rel === 2 ? '#8a857a' : MINI[t.t]));
        if (!voitTuile(i)) c3 = c3.map(x => x * 0.62);
        if (VIL[i]) c3 = [250, 245, 230];
      }
      const o = (py * cw + px) * 4; d[o] = c3[0]; d[o + 1] = c3[1]; d[o + 2] = c3[2]; d[o + 3] = 255;
    }
    R.miniCache = img; R.miniSale = false;
  }
  g.putImageData(R.miniCache, 0, 0);
  const m = tailleMonde(), kx = cw / m.w, ky = ch / m.h;
  const coins = [[0, 60], [R.larg, 60], [R.larg, R.haut], [0, R.haut]].map(([x, y]) => solPoint(x, y, false));
  if (coins.every(Boolean)) {
    g.strokeStyle = 'rgba(255,248,225,0.9)'; g.lineWidth = 1.5; g.beginPath();
    coins.forEach((p, k) => (k ? g.lineTo(p.x * kx, p.y * ky) : g.moveTo(p.x * kx, p.y * ky))); g.closePath(); g.stroke();
  }
}

/* ---------- Boucle ---------- */
let dernierDessin = 0;
function boucle(now) {
  requestAnimationFrame(boucle);
  if (!G || !R.rendu || document.hidden) return;
  const anime = R.anims.size || R.textes.length || R.camAnim;
  const actif = typeof UI !== 'undefined' && (UI.sel !== null || UI.modeTir);
  const lent = now - dernierDessin > (actif ? 66 : qualiteHaute() ? 120 : 1e9);
  if (R.sale || anime || lent) { R.sale = false; dessiner(now); dessinerMini(); dernierDessin = now; }
}
function redimensionner() {
  R.dpr = Math.min(qualiteHaute() ? 2 : 1.25, window.devicePixelRatio || 1);
  R.larg = window.innerWidth; R.haut = window.innerHeight;
  if (R.rendu) { R.rendu.setPixelRatio(R.dpr); R.rendu.setSize(R.larg, R.haut, false); }
  R.cv.style.width = R.larg + 'px'; R.cv.style.height = R.haut + 'px';
  if (G) borneCam();
  R.sale = true;
}
function appliquerQualite() {
  if (!R.rendu) return;
  R.rendu.shadowMap.enabled = qualiteHaute();
  if (MAT) Object.values(MAT).forEach(m => { m.needsUpdate = true; });
  if (R.monde) R.monde.G = null;
  redimensionner();
}
function initRendu(cv, mini) {
  R.cv = cv;
  R.mini = mini; R.mx = mini.getContext('2d');
  R.etiq = document.getElementById('etiquettes');
  try {
    R.rendu = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    R.rendu = null;
    document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;left:16px;right:16px;top:40%;z-index:60;text-align:center;font:16px system-ui;color:#efe6d2">Ce navigateur ne peut pas afficher la 3D (WebGL désactivé). Essayez Safari ou Chrome à jour.</p>');
    return;
  }
  R.rendu.toneMapping = THREE.ACESFilmicToneMapping; R.rendu.toneMappingExposure = 1.05;
  R.rendu.shadowMap.enabled = qualiteHaute(); R.rendu.shadowMap.type = THREE.PCFSoftShadowMap;
  R.scene = new THREE.Scene();
  R.scene.background = new THREE.Color(0x43525f);
  R.scene.fog = new THREE.Fog(0x55687a, 800, 2400);
  R.camera = new THREE.PerspectiveCamera(FOV, 1, 2, 5000);
  redimensionner();
  window.addEventListener('resize', redimensionner);
  requestAnimationFrame(boucle);
}
