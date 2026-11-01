/* Il Prezzo del Silenzio — chapitre I « Conca d'Oro, Sicile, 1861 ».
   Moteur : three.js r169 (vendor/), rendu physique (PBR), ciel physique, ombres douces, occlusion ambiante,
   halo lumineux et étalonnage « pellicule ». Décors, matières, personnages et sons sont fabriqués par le code. */
import * as T from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { fabriquerTextures, texVisage } from './textures.js';

const $ = s => document.querySelector(s);
const PI = Math.PI;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const lisse = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ecartAngle = (a, b) => { let d = (b - a) % (2 * PI); if (d > PI) d -= 2 * PI; if (d < -PI) d += 2 * PI; return d; };
const approche = (v, c, pas) => v < c ? Math.min(v + pas, c) : Math.max(v - pas, c);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function alea(graine) { return () => { graine = (graine + 0x6D2B79F5) | 0; let t = Math.imul(graine ^ (graine >>> 15), 1 | graine); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = alea(1861);
function h2(x, z) { let h = (Math.imul(x | 0, 374761393) + Math.imul(z | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function bruit(x, z) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf); return lerp(lerp(h2(xi, zi), h2(xi + 1, zi), u), lerp(h2(xi, zi + 1), h2(xi + 1, zi + 1), u), v); }
const hex = c => c.toString(16).padStart(6, '0');
const prof = pts => pts.map(([r, y]) => new T.Vector2(r, y));

/* ---------- Sauvegarde (dans ce navigateur seulement) ---------- */
const CLE = 'silenzio:v1';
function lireSauvegarde() { try { return JSON.parse(localStorage.getItem(CLE)) || {}; } catch (e) { return {}; } }
function sauver() { try { localStorage.setItem(CLE, JSON.stringify(SAUVE)); } catch (e) { /* stockage refusé : on joue sans */ } }
const SAUVE = lireSauvegarde();
SAUVE.fins = SAUVE.fins || [];

/* ---------- Qualité graphique ---------- */
const tactile = matchMedia('(pointer: coarse)').matches;
const ESSAI = new URLSearchParams(location.search).has('essai'); // essais automatiques : logique sans dessin
const QUALITES = {
  haute: { nom: 'Haute', dof: true, ombre: 4096, ao: true, bloom: true, msaa: 4, dpr: 1.5, herbe: 42000, rayonHerbe: 26, arbres: 1 },
  moyenne: { nom: 'Moyenne', dof: true, ombre: 2048, ao: false, bloom: true, msaa: 2, dpr: 1.25, herbe: 16000, rayonHerbe: 20, arbres: 1 },
  basse: { nom: 'Basse', ombre: 1024, ao: false, bloom: false, msaa: 0, dpr: 1, herbe: 0, rayonHerbe: 0, arbres: .6 }
};
const QN = QUALITES[SAUVE.qualite] ? SAUVE.qualite : (tactile ? 'basse' : 'haute');
const Q = QUALITES[QN];
const etape = (txt) => { $('#chargement .etat').textContent = txt; return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };

/* ---------- Rendu ---------- */
const toile = $('#scene');
const rendu = new T.WebGLRenderer({ canvas: toile, antialias: false, powerPreference: 'high-performance' });
rendu.setPixelRatio(Math.min(devicePixelRatio || 1, Q.dpr));
rendu.toneMapping = T.ACESFilmicToneMapping; rendu.toneMappingExposure = .9;
rendu.shadowMap.enabled = true; rendu.shadowMap.type = T.PCFSoftShadowMap;
const scene = new T.Scene();
const camera = new T.PerspectiveCamera(55, 1, .2, 6000);
const compo = new EffectComposer(rendu, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: Q.msaa }));
compo.addPass(new RenderPass(scene, camera));
const SANS_AO = [];
let passeAO = null, passeHalo = null;
if (Q.ao) {
  passeAO = new GTAOPass(scene, camera, 1, 1);
  passeAO.updateGtaoMaterial({ radius: .5, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
  passeAO.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
  const r0 = passeAO.render.bind(passeAO);
  passeAO.render = (...a) => { const vus = SANS_AO.map(m => m.visible); SANS_AO.forEach(m => { m.visible = false; }); r0(...a); SANS_AO.forEach((m, i) => { m.visible = vus[i]; }); };
  compo.addPass(passeAO);
}
const sansFeuillage = pass => { const r0 = pass.render.bind(pass); pass.render = (...a) => { const vus = SANS_AO.map(m => m.visible); SANS_AO.forEach(m => { m.visible = false; }); r0(...a); SANS_AO.forEach((m, i) => { m.visible = vus[i]; }); }; };
let passeFlou = null;
if (Q.dof) { passeFlou = new BokehPass(scene, camera, { focus: 2, aperture: .0022, maxblur: .007 }); passeFlou.enabled = false; sansFeuillage(passeFlou); compo.addPass(passeFlou); }
if (Q.bloom) { passeHalo = new UnrealBloomPass(new T.Vector2(256, 256), .32, .6, .92); compo.addPass(passeHalo); }
const RAYONS = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uSoleil: { value: new T.Vector2(.5, .5) }, uForce: { value: 0 }, uSeuil: { value: 1.1 }, uTeinte: { value: new T.Color(1, .85, .6) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uSoleil; uniform float uForce, uSeuil; uniform vec3 uTeinte; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = (uSoleil - vUv) / 56.0; vec2 p = vUv; float dec = 1.0; vec3 acc = vec3(0.0);
      for (int i = 0; i < 56; i++){ p += d; vec3 e = texture2D(tDiffuse, clamp(p, 0.0, 1.0)).rgb; float l = max(dot(e, vec3(0.3, 0.59, 0.11)) - uSeuil, 0.0); acc += min(l, 4.0) * dec; dec *= 0.965; }
      gl_FragColor = vec4(c.rgb + uTeinte * acc * uForce / 56.0, c.a); }`
});
RAYONS.enabled = false; if (Q.bloom) compo.addPass(RAYONS);
compo.addPass(new OutputPass());
const ETALON = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTemps: { value: 0 }, uRes: { value: new T.Vector2(1, 1) }, uVignette: { value: .55 }, uGrain: { value: .05 }, uChaleur: { value: .35 }, uSat: { value: .95 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTemps, uVignette, uGrain, uChaleur, uSat; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 d = vUv - 0.5; float r2 = dot(d, d); vec2 ab = d * r2 * 0.005;
      vec3 c = vec3(texture2D(tDiffuse, vUv + ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - ab).b);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float k = abs(uChaleur);
      vec3 ombre = mix(vec3(1.0), vec3(0.9, 0.97, 1.07), k);
      vec3 lum = mix(vec3(1.0), uChaleur > 0.0 ? vec3(1.1, 1.0, 0.83) : vec3(0.86, 0.95, 1.14), k);
      c *= mix(ombre, lum, smoothstep(0.05, 0.75, l));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * 1.07 + 0.5;
      c *= 1.0 - uVignette * smoothstep(0.1, 0.7, r2 * 1.6);
      c += (h(vUv * uRes + fract(uTemps) * 91.7) - 0.5) * uGrain;
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
    }`
});
compo.addPass(ETALON);
if (SAUVE.sansFilm) { ETALON.uniforms.uGrain.value = 0; ETALON.uniforms.uVignette.value = .25; }
function redimensionner() {
  const w = innerWidth, h = innerHeight; rendu.setSize(w, h, false); compo.setSize(w, h);
  camera.aspect = w / h; camera.fov = w < h ? 70 : 55; camera.updateProjectionMatrix();
  const pr = rendu.getPixelRatio(); ETALON.uniforms.uRes.value.set(w * pr, h * pr);
}
addEventListener('resize', redimensionner); redimensionner();

await etape('Matières…');
const ANISO = rendu.capabilities.getMaxAnisotropy();
const TX = fabriquerTextures(QN, Math.min(ANISO, 8));

/* ---------- Matériaux ---------- */
const ECH = { enduit: 3, pierre: 2.4, tuiles: 1.7, paves: 2.6, bois: 1.3, sol: 4 };
const MATS = new Map();
function M(cle) {
  if (MATS.has(cle)) return MATS.get(cle);
  const [fam, hx] = cle.split(':'), c = hx ? parseInt(hx, 16) : 0xffffff, t = TX[fam]; let m;
  if (t && t.map && ECH[fam]) m = new T.MeshStandardMaterial({ color: c, map: t.map, normalMap: t.normalMap, roughnessMap: t.roughnessMap, roughness: 1 });
  else switch (fam) {
    case 'verre': m = new T.MeshStandardMaterial({ color: 0x14171c, roughness: .08, metalness: .2 }); break;
    case 'verreLum': m = new T.MeshStandardMaterial({ color: 0x14171c, roughness: .2, emissive: 0xffa040, emissiveIntensity: 0 }); break;
    case 'lumiere': m = new T.MeshStandardMaterial({ color: 0x2a1c08, emissive: 0xffc070, emissiveIntensity: 0 }); break;
    case 'fer': m = new T.MeshStandardMaterial({ color: 0x1e1c1a, roughness: .5, metalness: .75 }); break;
    case 'bronze': m = new T.MeshStandardMaterial({ color: 0x8a6a3a, roughness: .35, metalness: 1 }); break;
    case 'dome': m = new T.MeshStandardMaterial({ color: c, map: TX.enduit.map, normalMap: TX.enduit.normalMap, roughnessMap: TX.enduit.roughnessMap }); break;
    case 'tissu': m = new T.MeshPhysicalMaterial({ color: c, normalMap: TX.tissu.normalMap, normalScale: new T.Vector2(.7, .7), roughness: .92, sheen: .8, sheenRoughness: .75, sheenColor: new T.Color(c).lerp(new T.Color(0xffffff), .35) }); break;
    case 'peau': m = new T.MeshPhysicalMaterial({ color: c, roughness: .5, sheen: .3, sheenRoughness: .6, sheenColor: new T.Color(0xff9a7a) }); break;
    case 'visage': { const [, type, hx2] = cle.split(':'), tv = texVisage(type, ANISO); m = new T.MeshPhysicalMaterial({ color: parseInt(hx2, 16), map: tv.map, normalMap: tv.normalMap, normalScale: new T.Vector2(.6, .6), roughnessMap: tv.roughnessMap, roughness: 1, sheen: .3, sheenRoughness: .6, sheenColor: new T.Color(0xff9a7a) }); break; }
    case 'cheveux': m = new T.MeshStandardMaterial({ color: c, map: TX.cheveux.map, normalMap: TX.cheveux.normalMap, roughnessMap: TX.cheveux.roughnessMap, roughness: 1 }); break;
    case 'oeil': m = new T.MeshPhysicalMaterial({ color: 0xf2eee6, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }); break;
    case 'iris': m = new T.MeshPhysicalMaterial({ color: c, roughness: .1, clearcoat: 1, clearcoatRoughness: .05 }); break;
    case 'fleurs': m = new T.MeshStandardMaterial({ map: TX[hx], alphaTest: .45, side: T.DoubleSide, roughness: .7 }); break;
    case 'image': m = new T.MeshStandardMaterial({ map: TX.image, roughness: .6 }); break;
    case 'cuir': m = new T.MeshStandardMaterial({ color: c, roughness: .45 }); break;
    case 'fruit': m = new T.MeshStandardMaterial({ color: c, roughness: .4 }); break;
    case 'ecorce': m = new T.MeshStandardMaterial({ color: c, map: TX.ecorce.map, normalMap: TX.ecorce.normalMap, roughness: .95 }); break;
    case 'raquette': m = new T.MeshStandardMaterial({ color: c, map: TX.raquette.map, normalMap: TX.raquette.normalMap, roughness: .55 }); break;
    default: m = new T.MeshStandardMaterial({ color: c, roughness: .8 });
  }
  MATS.set(cle, m); return m;
}
/* Vent : les feuilles et les herbes ondulent (décalage dans le nuanceur) */
const VENT = { uTemps: { value: 0 }, uVent: { value: 1 } };
function auVent(m, base, force) {
  m.onBeforeCompile = s => {
    s.uniforms.uTemps = VENT.uTemps; s.uniforms.uVent = VENT.uVent;
    s.vertexShader = 'uniform float uTemps; uniform float uVent;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 ip = vec3(0.0);
      #ifdef USE_INSTANCING
        ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #endif
      float hv = max(position.y - ${base.toFixed(2)}, 0.0);
      transformed.x += sin(uTemps * 1.7 + ip.x * 0.35 + ip.z * 0.2 + position.y * 1.3) * ${force.toFixed(3)} * hv * uVent;
      transformed.z += cos(uTemps * 1.3 + ip.z * 0.3 + position.x * 1.1) * ${(force * .7).toFixed(3)} * hv * uVent;`);
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', T.ShaderChunk.normal_fragment_begin.split('normal *= faceDirection;').join(''));
  };
  m.customProgramCacheKey = () => 'vent' + base + force;
  return m;
}

/* ---------- Constructeur de décors : tout le bâti est fusionné par matière (peu d'appels de dessin) ---------- */
function boiteUV(w, h, d, e) {
  const g = new T.BoxGeometry(w, h, d), uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); const [su, sv] = nx > .5 ? [d, h] : ny > .5 ? [w, d] : [w, h]; uv.setXY(i, uv.getX(i) * su / e, uv.getY(i) * sv / e); }
  return g;
}
const LOTS = new Map();
const mat4 = (x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz, 'YXZ')), new T.Vector3(sx, sy, sz));
function poser(geo, cle, m, ombre = true) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); if (m) g.applyMatrix4(m);
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(a)) g.deleteAttribute(a);
  if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  let l = LOTS.get(cle); if (!l) LOTS.set(cle, l = { geos: [], ombre }); l.geos.push(g);
}
function piece(B, cle, w, h, d, x, y, z, ry = 0, rx = 0, rz = 0, ombre = true) { poser(boiteUV(w, h, d, ECH[cle.split(':')[0]] || 1), cle, B.clone().multiply(mat4(x, y, z, ry, rx, rz)), ombre); }
function construireLots() {
  for (const [cle, l] of LOTS) { const g = mergeGeometries(l.geos); const me = new T.Mesh(g, M(cle)); me.castShadow = l.ombre; me.receiveShadow = true; me.matrixAutoUpdate = false; scene.add(me); }
  LOTS.clear();
}

/* ---------- Ciel physique, nuages, nuit étoilée ---------- */
const ciel = new Sky(); ciel.scale.setScalar(4500); scene.add(ciel);
const UC = ciel.material.uniforms;
const domeNuit = new T.Mesh(new T.SphereGeometry(2000, 32, 16), new T.ShaderMaterial({
  side: T.BackSide, transparent: true, depthWrite: false, fog: false,
  uniforms: { uNuit: { value: 0 }, uLune: { value: new T.Vector3(.4, .5, -.6).normalize() } },
  vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uNuit; uniform vec3 uLune; varying vec3 vD;
    float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
    void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.0);
      vec3 c = mix(vec3(0.05, 0.065, 0.11), vec3(0.008, 0.012, 0.03), pow(y, 0.45));
      vec3 g = floor(d * 380.0); float s = step(0.9972, h(g)) * smoothstep(0.0, 0.25, d.y);
      c += s * vec3(0.9, 0.93, 1.0) * (0.4 + 1.6 * h(g + 1.0));
      float m = dot(d, uLune); c += vec3(1.0, 0.97, 0.9) * (smoothstep(0.9993, 0.9996, m) * 6.0 + pow(max(m, 0.0), 60.0) * 0.12);
      gl_FragColor = vec4(c, uNuit); }`
}));
domeNuit.renderOrder = -2; scene.add(domeNuit);
const nuages = new T.Mesh(new T.SphereGeometry(1800, 48, 16, 0, PI * 2, 0, PI / 2), new T.ShaderMaterial({
  side: T.BackSide, transparent: true, depthWrite: false, fog: false,
  uniforms: { uTemps: { value: 0 }, uCouv: { value: .52 }, uSoleil: { value: new T.Vector3(0, 1, 0) }, uClair: { value: new T.Color(1, 1, 1) }, uSombre: { value: new T.Color(.5, .5, .55) }, uOpac: { value: .85 } },
  vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform float uTemps, uCouv, uOpac; uniform vec3 uSoleil, uClair, uSombre; varying vec3 vD;
    float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    float fbm(vec2 p){ float a = 0.0, m = 0.5; for (int i = 0; i < 6; i++){ a += m * n(p); p = p * 2.03 + 1.7; m *= 0.5; } return a; }
    void main(){ vec3 d = normalize(vD); if (d.y < 0.01) discard;
      vec2 p = d.xz / (d.y + 0.08) * 0.9 + vec2(uTemps * 0.004, uTemps * 0.0015);
      float f = fbm(p), c = smoothstep(uCouv, uCouv + 0.28, f);
      float e = fbm(p + uSoleil.xz * 0.06); float lum = clamp(0.55 + (f - e) * 3.0, 0.0, 1.0);
      float bord = pow(max(dot(d, uSoleil), 0.0), 6.0) * (1.0 - c) * 1.5;
      vec3 col = mix(uSombre, uClair, lum) + uClair * bord;
      gl_FragColor = vec4(col, c * smoothstep(0.01, 0.2, d.y) * uOpac); }`
}));
nuages.renderOrder = -1; scene.add(nuages);
// L'éclairage d'ambiance est calculé à partir du ciel (même ciel, sans nuages)
const sceneCiel = new T.Scene();
sceneCiel.add(new T.Mesh(ciel.geometry, ciel.material).copy(ciel), new T.Mesh(domeNuit.geometry, domeNuit.material));
const pmrem = new T.PMREMGenerator(rendu); let envRT = null, envHeure = -1;
function majEnvironnement() { const rt = pmrem.fromScene(sceneCiel, 0, .1, 9000); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }

const hemi = new T.HemisphereLight(0xffffff, 0x806040, .5); scene.add(hemi);
const soleil = new T.DirectionalLight(0xffffff, 3); soleil.castShadow = true;
soleil.shadow.mapSize.set(Q.ombre, Q.ombre);
const PORTEE_OMBRE = Q.ombre >= 4096 ? 75 : 55;
Object.assign(soleil.shadow.camera, { left: -PORTEE_OMBRE, right: PORTEE_OMBRE, top: PORTEE_OMBRE, bottom: -PORTEE_OMBRE, near: 1, far: 360 });
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = .04; soleil.shadow.radius = 3;
scene.add(soleil, soleil.target);
scene.fog = new T.FogExp2(0xd5cfc0, .003);

/* La mer : reflets du ciel et vaguelettes animées */
const eauNormales = new T.TextureLoader().load('textures/waternormals.jpg', t => { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(70, 40); t.anisotropy = ANISO; });
const matMer = new T.MeshStandardMaterial({ color: 0x1f4a55, roughness: .06, metalness: 0, normalMap: eauNormales, normalScale: new T.Vector2(.35, .35), envMapIntensity: 1.2 });
const mer = new T.Mesh(new T.PlaneGeometry(2400, 1200), matMer); mer.rotation.x = -PI / 2; mer.position.set(0, .05, -620); mer.receiveShadow = true; scene.add(mer);

/* ---------- Relief ---------- */
const L = {
  porte: { x: 54, z: 50 }, baglio: { x: 70, z: 50 }, village: { x: -80, z: -70 }, marche: { x: -75, z: -63 },
  caserne: { x: -104, z: -70 }, porteCaserne: { x: -98.2, z: -70 }, masseria: { x: 125, z: -45 }
};
const ROUTES = [
  [[54, 50], [30, 44], [5, 24], [-20, -10], [-38, -48], [-52, -66], [-64, -68], [-80, -70]],
  [[30, 44], [70, 10], [105, -28], [121, -40]],
  [[54, 50], [46, 60], [45, 72], [44, 84]]
];
const JARDIN = { x0: 30, x1: 130, z0: 72, z1: 144 };
const dansJardin = (x, z, m = 0) => x > JARDIN.x0 - m && x < JARDIN.x1 + m && z > JARDIN.z0 - m && z < JARDIN.z1 + m;
function distSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz; const t = l ? clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); }
function distRoute(x, z) { let m = 1e9; for (const r of ROUTES) for (let i = 0; i < r.length - 1; i++) m = Math.min(m, distSeg(x, z, r[i][0], r[i][1], r[i + 1][0], r[i + 1][1])); return m; }
function hBrut(x, z) {
  let h = 2.6 + 5 * bruit(x / 70 + 10, z / 70 + 3) + 2.2 * bruit(x / 24, z / 24) + .45 * bruit(x / 7, z / 7);
  const dm = Math.hypot(x - L.masseria.x, z - L.masseria.z); h += 13 * Math.exp(-dm * dm / (2 * 38 * 38));
  const r = Math.hypot(x, z); if (r > 195) h += (r - 195) * .55 * (.6 + .8 * bruit(x / 40, z / 40)) * lisse(-170, -105, z);
  if (z < -118) h -= (-118 - z) * .22;
  return h;
}
const APLANIR = [];
function H(x, z) { let h = hBrut(x, z); for (const a of APLANIR) { const d = Math.hypot(x - a.x, z - a.z); if (d < a.r + a.f) h = lerp(h, a.h, 1 - lisse(a.r, a.r + a.f, d)); } return h; }
APLANIR.push({ x: -80, z: -70, r: 34, f: 22, h: hBrut(-80, -70) }, { x: 70, z: 50, r: 17, f: 14, h: hBrut(70, 50) }, { x: 125, z: -45, r: 12, f: 10, h: hBrut(125, -45) });

await etape('Relief…');
(() => {
  const g = new T.PlaneGeometry(600, 600, 200, 200); g.rotateX(-PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, cols = new Float32Array(p.count * 3);
  const C = h => new T.Color(h);
  const herbe = C(0xb7a46c), seche = C(0xc4ad78), ocre = C(0xa87a4c), vert = C(0x7f8046), sable = C(0xd8c49a), roche = C(0x958a78), poussiere = C(0xc8b088), terreBattue = C(0xe0b98a), c = new T.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = H(x, z); p.setY(i, y); uv.setXY(i, x / ECH.sol, z / ECH.sol);
    c.copy(herbe).lerp(seche, bruit(x / 40 + 3, z / 40)).lerp(ocre, lisse(.45, .8, bruit(x / 18, z / 18)) * .7);
    if (dansJardin(x, z, 4)) c.lerp(vert, .65);
    const dv = Math.hypot(x - L.village.x, z - L.village.z); if (dv < 62) c.lerp(terreBattue, (1 - lisse(40, 62, dv)) * .85);
    const dr = distRoute(x, z); if (dr < 8) c.lerp(poussiere, (1 - dr / 8) * .6);
    if (y < 1.8) c.lerp(sable, clamp((1.8 - y) / 1.3, 0, 1));
    const r = Math.hypot(x, z); if (r > 205) c.lerp(roche, clamp((r - 205) / 45, 0, .85));
    c.multiplyScalar((.92 + .16 * h2(i, 7)) * 1.18);
    cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const sol = new T.Mesh(g, new T.MeshStandardMaterial({ vertexColors: true, map: TX.sol.map, normalMap: TX.sol.normalMap, normalScale: new T.Vector2(1.4, 1.4), roughnessMap: TX.sol.roughnessMap, roughness: 1 }));
  sol.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
    vec4 t1 = texture2D(map, vMapUv); vec4 t2 = texture2D(map, vMapUv * 0.37 + vec2(0.31, 0.77)); float mm = texture2D(map, vMapUv * 0.031).r;
    vec4 sampledDiffuseColor = mix(t1, t2, smoothstep(0.42, 0.62, mm)); diffuseColor *= sampledDiffuseColor * (0.88 + 0.24 * mm);
  #endif`); };
  sol.receiveShadow = true; scene.add(sol);
  // Montagnes du fond et promontoire au bord de la mer (roche)
  const roc = M('pierre:8a8070'), ge = facettes(new T.IcosahedronGeometry(1, 2));
  for (let i = 0; i < 30; i++) {
    const a = -PI * .05 + i / 29 * PI * 1.1, rr = 330 + R() * 90, hh = 70 + R() * 110;
    const m = new T.Mesh(ge, roc); m.scale.set(90 + R() * 70, hh, 90 + R() * 70); m.rotation.y = R() * 3; m.position.set(Math.cos(a) * rr, -hh * .3, Math.sin(a) * rr); scene.add(m);
  }
  const prom = new T.Mesh(ge, roc); prom.scale.set(110, 85, 70); prom.position.set(230, -12, -250); scene.add(prom);
})();
function facettes(g) { const n = g.index ? g.toNonIndexed() : g; const p = n.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + (h2(Math.round(p.getX(i) * 50), Math.round(p.getZ(i) * 50 + p.getY(i) * 30)) - .5) * .25; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } n.computeVertexNormals(); const uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * 3; uv[i * 2 + 1] = p.getY(i) * 3 + p.getZ(i) * 3; } n.setAttribute('uv', new T.BufferAttribute(uv, 2)); return n; }

function ruban(pts, larg, couleur) {
  const P = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5); for (let k = 0; k < n; k++) P.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]); }
  P.push(pts[pts.length - 1]);
  const v = [], u = [];
  let lon = 0;
  const bords = P.map((p, i) => { const a = P[Math.max(i - 1, 0)], b = P[Math.min(i + 1, P.length - 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; if (i) lon += Math.hypot(p[0] - P[i - 1][0], p[1] - P[i - 1][1]); const j = 1 + (h2(i, 3) - .5) * .25, nx = -dz * larg / 2 * j, nz = dx * larg / 2 * j; return [[p[0] + nx, p[1] + nz], [p[0] - nx, p[1] - nz], lon]; });
  const s = ([x, z]) => [x, H(x, z) + .06, z];
  for (let i = 0; i < bords.length - 1; i++) {
    const A0 = s(bords[i][0]), B0 = s(bords[i][1]), A1 = s(bords[i + 1][0]), B1 = s(bords[i + 1][1]), v0 = bords[i][2] / 4, v1 = bords[i + 1][2] / 4, w = larg / 4;
    v.push(...A0, ...A1, ...B0, ...B0, ...A1, ...B1); u.push(0, v0, 0, v1, w, v0, w, v0, 0, v1, w, v1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(u, 2)); g.computeVertexNormals();
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: couleur, map: TX.sol.map, normalMap: TX.sol.normalMap, normalScale: new T.Vector2(2, 2), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true; scene.add(m);
}
ruban(ROUTES[0], 4.6, 0xd7c29c); ruban(ROUTES[1], 4, 0xcdb792); ruban(ROUTES[2], 3, 0xc0aa82);

/* ---------- Obstacles ---------- */
const CERCLES = [], BOITES = [];
function obstacleBoite(x, z, w, d, rot = 0, haut = 6) { BOITES.push({ x, z, hw: w / 2, hd: d / 2, c: Math.cos(rot), s: Math.sin(rot), haut, y0: H(x, z) }); }
function resoudre(p, r, avecPnj) {
  let choc = false;
  for (const c of CERCLES) { const dx = p.x - c.x, dz = p.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k; choc = true; } }
  if (avecPnj) for (const n of Object.values(PNJ)) { if (!n.h.g.visible || n === avecPnj) continue; const dx = p.x - n.pos.x, dz = p.z - n.pos.z, rr = r + .35, d2 = dx * dx + dz * dz; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; p.x += dx * k; p.z += dz * k; choc = true; } }
  for (const b of BOITES) {
    const dx = p.x - b.x, dz = p.z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
    if (Math.abs(lx) > b.hw + r || Math.abs(lz) > b.hd + r) continue;
    const qx = clamp(lx, -b.hw, b.hw), qz = clamp(lz, -b.hd, b.hd); let ex = lx - qx, ez = lz - qz; const d2 = ex * ex + ez * ez;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; ex *= k; ez *= k; }
    else { const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz); if (px < pz) { ex = (px + r) * Math.sign(lx || 1); ez = 0; } else { ez = (pz + r) * Math.sign(lz || 1); ex = 0; } }
    p.x += ex * b.c + ez * b.s; p.z += -ex * b.s + ez * b.c; choc = true;
  }
  const rr = Math.hypot(p.x, p.z); if (rr > 235) { p.x *= 235 / rr; p.z *= 235 / rr; choc = true; }
  if (p.z < -128) { p.z = -128; choc = true; }
  return choc;
}
function dansBatiment(x, z, y) { for (const b of BOITES) { if (b.haut < 2.2) continue; const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd && y < b.haut + b.y0) return true; } return false; }

/* ---------- Bâtiments ---------- */
await etape('Village…');
const ENDUITS = [0xe6d3b0, 0xdcb68a, 0xeadcc0, 0xd49c78, 0xe2bf94, 0xd2b696, 0xecd09c, 0xc9a47e];
const VOLETS = ['5d7a55', '6b4a2e', '46667a', '8a4632', '7d7a5a'];
const PIERRE = 'pierre:e8d2a4', PIERRE_C = 'pierre:f2e3c0', ENC = 'pierre:f0e0bc';
function fenetre(B, x, y, sens, zf, volet, balcon) {
  const F = B.clone().multiply(mat4(0, 0, zf, sens > 0 ? 0 : PI));
  piece(F, ENC, 1.18, .16, .18, x, y + .72, .06); piece(F, ENC, 1.22, .1, .24, x, y - .7, .08);
  piece(F, ENC, .13, 1.32, .14, x - .53, y, .04); piece(F, ENC, .13, 1.32, .14, x + .53, y, .04);
  piece(F, R() < .35 ? 'verreLum' : 'verre', .92, 1.28, .04, x, y, 0, 0, 0, 0, false);
  piece(F, 'bois:6b5844', .05, 1.28, .05, x, y, .03, 0, 0, 0, false); piece(F, 'bois:6b5844', .92, .05, .05, x, y + .2, .03, 0, 0, 0, false);
  if (R() < .8) { const o1 = (R() - .5) * .5, o2 = (R() - .5) * .5; piece(F, 'bois:' + volet, .47, 1.3, .05, x - .79, y, .07, o1 * .2); piece(F, 'bois:' + volet, .47, 1.3, .05, x + .79, y, .07, o2 * .2); }
  if (balcon) {
    piece(F, PIERRE_C, 1.7, .14, .7, x, y - .76, .35); piece(F, ENC, 1.5, .14, .12, x, y - .88, .62);
    piece(F, 'fer', 1.66, .035, .035, x, y + .18, .68, 0, 0, 0, false); piece(F, 'fer', 1.66, .03, .03, x, y - .6, .68, 0, 0, 0, false);
    for (let i = 0; i <= 10; i++) piece(F, 'fer', .022, .8, .022, x - .8 + i * .16, y - .22, .68, 0, 0, 0, false);
    for (const sx of [-1, 1]) { piece(F, 'fer', .035, .035, .6, x + sx * .82, y + .18, .38, 0, 0, 0, false); for (let i = 0; i < 4; i++) piece(F, 'fer', .022, .8, .022, x + sx * .82, y - .22, .14 + i * .16, 0, 0, 0, false); }
    for (let i = 0, n = 1 + ((R() * 3) | 0); i < n; i++) pot(F.clone().multiply(mat4(x - .55 + i * .55, y - .69, .32)), .8);
  }
}
function porte(B, x, sens, zf, couleur = '4e3624') {
  const F = B.clone().multiply(mat4(0, 0, zf, sens > 0 ? 0 : PI));
  piece(F, 'bois:' + couleur, 1.25, 2.35, .08, x, 1.18, .02);
  piece(F, ENC, 1.75, .32, .2, x, 2.52, .06); piece(F, ENC, .24, 2.4, .16, x - .74, 1.2, .05); piece(F, ENC, .24, 2.4, .16, x + .74, 1.2, .05);
  piece(F, PIERRE_C, 1.9, .16, .6, x, .02, .3);
  piece(F, 'fer', .05, .05, .08, x + .45, 1.15, .1, 0, 0, 0, false);
  if (R() < .55) { pot(F.clone().multiply(mat4(x - 1.15, 0, .35)), 1.2); if (R() < .6) pot(F.clone().multiply(mat4(x + 1.15, 0, .35)), 1); }
}
function toit(B, w, d, h, cle) {
  const hr = Math.min(w, d) * .28, a = Math.atan2(hr, d / 2), run = d / 2 + .5, Lr = run / Math.cos(a) + .1, y0 = h + .2;
  for (const s of [1, -1]) { const cz = s * run / 2, cy = y0 + hr - (run / 2) * Math.tan(a) + .06; piece(B, cle, w + .7, .14, Lr, 0, cy, cz, 0, s * a); }
  piece(B, cle, w + .75, .16, .3, 0, y0 + hr + .08, 0); // faîtage
  const pg = new T.BufferGeometry(); const t = [-.5, 0, .5, .5, 0, .5, .5, 1, 0, -.5, 0, .5, .5, 1, 0, -.5, 1, 0, .5, 0, -.5, -.5, 0, -.5, -.5, 1, 0, .5, 0, -.5, -.5, 1, 0, .5, 1, 0, -.5, 0, -.5, -.5, 0, .5, -.5, 1, 0, .5, 0, .5, .5, 0, -.5, .5, 1, 0];
  pg.setAttribute('position', new T.Float32BufferAttribute(t, 3)); pg.computeVertexNormals();
  const uv = []; for (let i = 0; i < t.length; i += 3) uv.push(t[i + 2] * d / 3, t[i + 1] * hr / 3); pg.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  poser(pg, B.userData.enduit, B.clone().multiply(mat4(0, y0 - .05, 0, 0, 0, 0, w, hr, d)));
}
function maison(x, z, w, d, h, rot = 0, o = {}) {
  const y0 = H(x, z), B = mat4(x, y0, z, rot);
  const coul = o.couleur ?? ENDUITS[(R() * ENDUITS.length) | 0], ce = 'enduit:' + hex(coul); B.userData = { enduit: ce };
  piece(B, ce, w, h + 2, d, 0, h / 2 - 1, 0);
  piece(B, 'pierre:c8b18a', w + .1, 2.7, d + .1, 0, -.65, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) piece(B, PIERRE, .5, h, .5, sx * (w / 2 - .21), h / 2, sz * (d / 2 - .21));
  piece(B, PIERRE_C, w + .34, .24, d + .34, 0, h + .06, 0); piece(B, PIERRE_C, w + .2, .14, d + .2, 0, h - .14, 0);
  if (h > 6.5) piece(B, PIERRE_C, w + .14, .14, d + .14, 0, 3.3, 0);
  const volet = VOLETS[(R() * VOLETS.length) | 0];
  for (const [sens, face] of [[1, d / 2], [-1, -d / 2]]) {
    const n = Math.max(1, Math.floor(w / 2.7));
    for (let i = 0; i < n; i++) {
      const fx = -w / 2 + (i + .5) * w / n;
      for (let et = 0; et < Math.floor(h / 3.1); et++) {
        const y = 1.75 + et * 3.1; if (y + 1.1 > h) break;
        if (et === 0 && sens > 0 && !o.sansPorte && Math.abs(fx - (o.porteX ?? 0)) < 1.5) continue;
        fenetre(B, fx, y, sens, face, volet, et > 0 && sens > 0 && R() < .45);
      }
    }
  }
  if (!o.sansPorte) porte(B, o.porteX ?? 0, 1, d / 2);
  if (o.fleurs ?? R() < .3) bougainvillier(B.clone().multiply(mat4((R() - .5) * (w - 3), 0, d / 2)), Math.min(h - .5, 4.5));
  if (o.plat) { piece(B, ce, w + .2, .7, d + .2, 0, h + .45, 0); piece(B, PIERRE_C, w + .3, .12, d + .3, 0, h + .85, 0); }
  else toit(B, w, d, h, R() < .5 ? 'tuiles:ffffff' : 'tuiles:e2c8b8');
  if (!o.plat && R() < .6) { const cx = (R() - .5) * w * .6; piece(B, ce, .55, 1.6, .55, cx, h + Math.min(w, d) * .28 * .5 + .6, -d * .15); piece(B, PIERRE_C, .7, .12, .7, cx, h + Math.min(w, d) * .14 + 1.45, -d * .15); }
  obstacleBoite(x, z, w, d, rot, h + 1); return B;
}
function muret(ax, az, bx, bz, hh = 1.15, ep = .65, cle = 'pierre:b8ab90', chap = 'pierre:cdbf9f') {
  const L0 = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L0 / 5)), ux = (bx - ax) / L0, uz = (bz - az) / L0, rot = Math.atan2(-uz, ux);
  for (let i = 0; i < n; i++) {
    const cx = ax + ux * L0 * (i + .5) / n, cz = az + uz * L0 * (i + .5) / n, l = L0 / n + .05, y = H(cx, cz), B = mat4(cx, y, cz, rot);
    piece(B, cle, l, hh + 1.5, ep, 0, hh / 2 - .75, 0); piece(B, chap, l + .02, .16, ep + .12, 0, hh + .02, 0);
    obstacleBoite(cx, cz, l, ep, rot, hh);
  }
}

/* Le baglio Sant'Anna */
(() => {
  const { x, z } = L.baglio, d = 13, hm = 4, mur = 'pierre:e0c99a', chap = PIERRE_C;
  muret(x - d, z - d, x + d, z - d, hm, .9, mur, chap); muret(x + d, z - d, x + d, z + d, hm, .9, mur, chap); muret(x - d, z + d, x + d, z + d, hm, .9, mur, chap);
  muret(x - d, z - d, x - d, z - 3.6, hm, .9, mur, chap); muret(x - d, z + 3.6, x - d, z + d, hm, .9, mur, chap);
  const B = mat4(x - d, H(x - d, z), z);
  piece(B, PIERRE, 1.5, 7, 1.5, 0, 2.5, -3.9); piece(B, PIERRE, 1.5, 7, 1.5, 0, 2.5, 3.9); piece(B, PIERRE_C, 1.8, .3, 1.8, 0, 6.1, -3.9); piece(B, PIERRE_C, 1.8, .3, 1.8, 0, 6.1, 3.9);
  for (let i = 0; i <= 12; i++) { const a = PI * i / 12, r = 3.25; piece(B, PIERRE_C, 1.3, .55, .9, 0, 4.1 + Math.sin(a) * r * .55, Math.cos(a) * r, 0, -(a - PI / 2)); }
  piece(B, PIERRE, 1.4, 1.6, 9.4, 0, 6.2, 0); piece(B, 'tuiles:ffffff', 1.9, .14, 9.8, 0, 7.05, 0);
  piece(B, 'bois:b8946a', 3.1, 3.6, .12, -.9, 1.8, -5.2); piece(B, 'bois:b8946a', 3.1, 3.6, .12, -.9, 1.8, 5.2);
  CERCLES.push({ x: x - d, z: z - 3.9, r: 1 }, { x: x - d, z: z + 3.9, r: 1 });
  maison(x, z - 8.5, 22, 7, 7.5, 0, { couleur: 0xead6ae });
  maison(x + 8.5, z + 4, 6, 12, 4.5, 0, { couleur: 0xd8bd8c, plat: true, sansPorte: true });
  const C = mat4(x, H(x, z), z); piece(C, 'paves:d8cbb0', 25, .3, 25, 0, -.08, 0);
  const P = mat4(x - 3, H(x - 3, z + 6), z + 6);
  const puits = new T.CylinderGeometry(1, 1.05, 1, 20, 1, true); poser(puits, PIERRE, P.clone().multiply(mat4(0, .5, 0))); poser(new T.CylinderGeometry(.9, .9, 1, 20, 1, true), PIERRE, P.clone().multiply(mat4(0, .5, 0)));
  poser(new T.TorusGeometry(.98, .12, 8, 24), PIERRE_C, P.clone().multiply(mat4(0, 1, 0, 0, PI / 2)));
  piece(P, 'bois:6a4a30', .14, 2.4, .14, -1, 1.7, 0); piece(P, 'bois:6a4a30', .14, 2.4, .14, 1, 1.7, 0); piece(P, 'bois:6a4a30', 2.3, .16, .16, 0, 2.85, 0);
  poser(new T.CylinderGeometry(.18, .15, .3, 10), 'bois:6a4a30', P.clone().multiply(mat4(.2, 1.9, 0)));
  CERCLES.push({ x: x - 3, z: z + 6, r: 1.2 });
  for (let i = 0; i < 9; i++) { const cx = x - 9 + (i % 3) * .62, cz = z - 3.5 + Math.floor(i / 3) * .5; caisse(mat4(cx, H(cx, cz) + .2 + (i > 5 ? .38 : 0), cz, R() * .2)); }
  CERCLES.push({ x: x - 8.4, z: z - 3, r: 1.2 });
  for (const [px, pz] of [[61, 41], [79, 41], [60.5, 58]]) jarre(mat4(px, H(px, pz), pz, R() * 3));
})();
function caisse(B) { piece(B, 'bois:a07848', .56, .06, .44, 0, -.16, 0); for (const sz of [-1, 1]) piece(B, 'bois:a07848', .56, .3, .04, 0, 0, sz * .2); for (const sx of [-1, 1]) piece(B, 'bois:a07848', .04, .3, .44, sx * .26, 0, 0); for (let i = 0; i < 6; i++) poser(new T.SphereGeometry(.075, 10, 8), 'fruit:e8c030', B.clone().multiply(mat4(-.17 + (i % 3) * .17, .14, -.09 + Math.floor(i / 3) * .18, 0, 0, 0, 1.1, 1, 1))); }
function jarre(B) { const pts = [[.0, 0], [.18, .02], [.3, .25], [.34, .5], [.28, .78], [.16, .9], [.17, .98], [.12, 1]].map(([r, y]) => new T.Vector2(r, y)); poser(new T.LatheGeometry(pts, 16), 'dome:b8653e', B); }

let DRAPEAU = null;
/* Santa Lucia : place, église aux coupoles rouges, caserne, maisons. */
(() => {
  const V = L.village, y = H(V.x, V.z), VB = mat4(V.x, y, V.z);
  piece(VB, 'paves:e2d4b6', 36, .5, 28, 0, -.17, 0);
  // Fontaine
  const F = mat4(V.x, y, V.z - 2);
  const pf = [[2.9, 0], [2.95, .15], [2.85, .2], [2.85, .75], [3.05, .8], [3.05, .95], [2.6, .95], [2.6, .3], [0, .3]].map(([r, h]) => new T.Vector2(r, h));
  poser(new T.LatheGeometry(pf, 8), PIERRE_C, F);
  const ef = new T.Mesh(new T.CircleGeometry(2.6, 24), matMer); ef.rotation.x = -PI / 2; ef.position.set(V.x, y + .8, V.z - 2); scene.add(ef);
  const pc = [[.35, 0], [.3, 1.6], [.4, 1.7], [1.1, 2.1], [1.15, 2.25], [.25, 2.3], [.18, 3], [.28, 3.15], [.05, 3.3]].map(([r, h]) => new T.Vector2(r, h));
  poser(new T.LatheGeometry(pc, 12), PIERRE_C, F.clone().multiply(mat4(0, .3, 0)));
  CERCLES.push({ x: V.x, z: V.z - 2, r: 3.1 });
  // Église (tuf doré) : façade à pilastres, fronton, oculus, portail, trois coupoles rouges
  const E = mat4(V.x, y, V.z - 24);
  piece(E, PIERRE, 13, 15, 18, 0, 5.5, 0);
  piece(E, PIERRE, 15.5, 16, 1.4, 0, 6.5, 9.3);
  for (const px of [-7, -3.2, 3.2, 7]) { piece(E, PIERRE_C, .9, 14.2, .5, px, 6.6, 10.1); piece(E, PIERRE_C, 1.2, .5, .7, px, 13.8, 10.1); piece(E, PIERRE_C, 1.2, .6, .7, px, -.2, 10.1); }
  piece(E, PIERRE_C, 16, .5, 2, 0, 14.1, 9.5); piece(E, PIERRE_C, 16.4, .25, 2.2, 0, 14.45, 9.5);
  const frD = new T.ExtrudeGeometry(new T.Shape([new T.Vector2(-8, 0), new T.Vector2(8, 0), new T.Vector2(0, 3.6)]), { depth: 1.6, bevelEnabled: false });
  poser(frD, PIERRE, E.clone().multiply(mat4(0, 14.6, 8.6)));
  poser(new T.TorusGeometry(1.15, .16, 8, 28), PIERRE_C, E.clone().multiply(mat4(0, 10.6, 10.1)));
  poser(new T.CircleGeometry(1.05, 24), 'verre', E.clone().multiply(mat4(0, 10.6, 10.05)));
  piece(E, 'bois:3e2a1c', 2.8, 4.6, .2, 0, 2.3, 10.05);
  for (let i = 0; i <= 10; i++) { const a = PI * i / 10, r = 1.6; piece(E, PIERRE_C, .6, .4, .5, Math.cos(a) * r, 4.6 + Math.sin(a) * r, 10.15, 0, 0, a - PI / 2); }
  piece(E, PIERRE_C, .45, 4.6, .45, -1.6, 2.3, 10.15); piece(E, PIERRE_C, .45, 4.6, .45, 1.6, 2.3, 10.15);
  for (let i = 0; i < 3; i++) piece(E, PIERRE_C, 5 - i * .6, .25, .8 - i * .2, 0, .12 + i * .25, 10.9 - i * .25);
  for (const [dx, dz, r] of [[0, -2, 3.3], [-3.7, 3.5, 2.1], [3.7, 3.5, 2.1]]) {
    poser(new T.CylinderGeometry(r * 1.02, r * 1.02, 1.6, 16), PIERRE, E.clone().multiply(mat4(dx, 13.2, dz)));
    poser(new T.SphereGeometry(r, 24, 12, 0, PI * 2, 0, PI / 2), 'dome:b8432c', E.clone().multiply(mat4(dx, 14, dz, 0, 0, 0, 1, .95, 1)));
  }
  // Clocher
  const CL = mat4(V.x + 10, H(V.x + 10, V.z - 19), V.z - 19);
  piece(CL, PIERRE, 4.2, 20, 4.2, 0, 9, 0);
  for (const hh of [6.5, 12.5]) piece(CL, PIERRE_C, 4.5, .3, 4.5, 0, hh, 0);
  piece(CL, 'verre', 1.4, 2.6, 4.3, 0, 15.6, 0, 0, 0, 0, false); piece(CL, 'verre', 4.3, 2.6, 1.4, 0, 15.6, 0, 0, 0, 0, false);
  poser(new T.CylinderGeometry(.35, .6, .9, 14), 'bronze', CL.clone().multiply(mat4(0, 15.5, 0)));
  piece(CL, PIERRE_C, 4.6, .4, 4.6, 0, 19.2, 0);
  poser(new T.ConeGeometry(3.4, 4, 4), 'tuiles:ffffff', CL.clone().multiply(mat4(0, 21.4, 0, PI / 4)));
  obstacleBoite(V.x, V.z - 24, 16, 20, 0, 14); obstacleBoite(V.x + 10, V.z - 19, 4.2, 4.2, 0, 19);
  // Caserne des carabiniers (porte à l'est, sur la place) avec le drapeau tricolore
  const cs = maison(L.caserne.x, L.caserne.z, 11, 16, 8, 0, { couleur: 0xe0c08e, sansPorte: true });
  const CS = cs.clone().multiply(mat4(5.5, 0, 0, PI / 2));
  porte(mat4(L.caserne.x + 5.5, H(L.caserne.x, L.caserne.z), L.caserne.z, PI / 2), 0, 1, 0, '2e2418');
  piece(CS, 'uni:1d2d48', 3.6, .55, .06, 0, 3.1, .1);
  piece(cs, 'fer', .1, 4, .1, 6.1, 8.3, 2.5, 0, 0, -.35);
  const drap = new T.Group(); drap.position.set(L.caserne.x + 6.75, H(L.caserne.x, L.caserne.z) + 10, L.caserne.z + 2.5); scene.add(drap);
  [[0x2f7a3e, -.35], [0xeee8d8, -1.05], [0xb03a2e, -1.75]].forEach(([c, dz]) => { const b = new T.Mesh(new T.PlaneGeometry(.7, 1.1, 4, 4), new T.MeshStandardMaterial({ color: c, side: T.DoubleSide, roughness: .9 })); b.position.set(0, 0, dz); b.rotation.y = PI / 2; b.castShadow = true; drap.add(b); });
  DRAPEAU = drap;
  const MAISONS = [
    [-94, -50, 9, 9, 7], [-84, -50, 8, 9, 8.5], [-72, -50, 9, 9, 7], [-63, -50, 7, 8, 6],
    [-56, -80, 9, 10, 7, PI / 2], [-55, -53, 8, 8, 6, PI / 2], [-104, -50, 8, 10, 6, -PI / 2], [-106, -90, 9, 10, 7, -PI / 2],
    [-96, -92, 8, 10, 8, PI], [-60, -96, 9, 10, 7, PI], [-88, -38, 9, 8, 6, PI], [-74, -38, 8, 8, 6, PI], [-116, -62, 8, 10, 6, -PI / 2],
    [-44, -42, 7, 8, 5.5, -PI / 3, { plat: true }], [-30, -54, 8, 7, 5.5, .2], [-116, -78, 8, 9, 6, -PI / 2], [-56, -108, 8, 8, 6, PI],
    [-100, -108, 8, 8, 6.5, PI], [-84, -110, 9, 8, 6, PI, { plat: true }], [-122, -48, 7, 8, 5, -PI / 2]
  ];
  for (const [x, z, w, d, h, r = 0, o = {}] of MAISONS) maison(x, z, w, d, h, r, o);
  // Étals du marché : tréteaux, toiles, cagettes d'agrumes
  for (const [x, z, c] of [[-75, -61, 'b84a2e'], [-84, -60, '3f6a8a'], [-91, -64, 'c49a2e']]) {
    const S = mat4(x, H(x, z), z);
    piece(S, 'bois:8a6a48', 3.2, .08, 1.4, 0, .88, 0);
    for (const sx of [-1.5, 1.5]) for (const sz of [-.62, .62]) piece(S, 'bois:6a4a30', .09, 2.6, .09, sx, 1.3, sz);
    piece(S, 'tissu:' + c, 3.7, .04, 2.1, 0, 2.62, -.1, 0, .22);
    for (let i = 0; i < 4; i++) caisse(S.clone().multiply(mat4(-1.1 + i * .73, 1.08, 0, (R() - .5) * .3)));
    obstacleBoite(x, z, 3.2, 1.4, 0, 2.8);
  }
  // Tonneaux et jarres
  for (const [bx, bz] of [[-66, -78], [-67, -76.8], [-97, -58], [-62, -60]]) { const B = mat4(bx, H(bx, bz), bz); poser(new T.CylinderGeometry(.38, .38, .95, 14), 'bois:7a5636', B.clone().multiply(mat4(0, .48, 0))); CERCLES.push({ x: bx, z: bz, r: .45 }); }
})();

/* La masseria de Don Gaspare, sur la colline. */
(() => {
  const { x, z } = L.masseria, mur = 'pierre:d0b688';
  maison(x, z, 16, 10, 8, 0, { couleur: 0xd6b88a });
  maison(x + 10.5, z - 2, 5, 5, 13, 0, { couleur: 0xc8a87a, plat: true, sansPorte: true });
  muret(x - 14, z + 8, x - 7, z + 8, 2.6, .8, mur, PIERRE_C); muret(x - 1, z + 8, x + 14, z + 8, 2.6, .8, mur, PIERRE_C);
  muret(x - 14, z + 8, x - 14, z - 12, 2.6, .8, mur, PIERRE_C); muret(x + 14, z - 12, x + 14, z + 8, 2.6, .8, mur, PIERRE_C);
})();

/* ---------- Végétation ---------- */
await etape('Jardins…');
const CITRONNIERS = [];
const libre = (x, z, m = 0) => {
  if (distRoute(x, z) < 4 + m) return false;
  if (Math.hypot(x - L.village.x, z - L.village.z) < 52 + m) return false;
  if (Math.abs(x - L.baglio.x) < 17 + m && Math.abs(z - L.baglio.z) < 17 + m) return false;
  if (Math.hypot(x - L.masseria.x, z - L.masseria.z) < 22 + m) return false;
  if (dansJardin(x, z, 3 + m)) return false;
  return H(x, z) > 2.2 && Math.hypot(x, z) < 225;
};
/* Un arbre = un tronc ramifié + une couronne de bouquets de feuilles orientés vers l'extérieur */
function couronne(nb, rx, ry, rz, cy, taille, graine, lobes = [[0, 0, 0, 1]]) {
  const rr = alea(graine), geos = [], q = new T.Quaternion(), Z = new T.Vector3(0, 0, 1), dir = new T.Vector3();
  for (let i = 0; i < nb; i++) {
    const lb = lobes[i % lobes.length];
    dir.set(rr() * 2 - 1, rr() * 2 - 1, rr() * 2 - 1); if (dir.lengthSq() < .01) dir.set(0, 1, 0); dir.normalize();
    const k = .3 + Math.sqrt(rr()) * .7, c = new T.Vector3(lb[0] + dir.x * rx * k * lb[3], cy + lb[1] + dir.y * ry * k * lb[3], lb[2] + dir.z * rz * k * lb[3]);
    const g = new T.PlaneGeometry(taille * (.8 + rr() * .4), taille * (.8 + rr() * .4));
    q.setFromUnitVectors(Z, dir); const m = new T.Matrix4().compose(c, q.multiply(new T.Quaternion().setFromAxisAngle(Z, rr() * PI * 2)), new T.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    const n = g.attributes.normal, ctr = new T.Vector3(lb[0], cy + lb[1], lb[2]), p = g.attributes.position, v = new T.Vector3();
    for (let j = 0; j < n.count; j++) { v.set(p.getX(j), p.getY(j), p.getZ(j)).sub(ctr).normalize(); v.y = v.y * .8 + .25; v.normalize(); n.setXYZ(j, v.x, v.y, v.z); }
    geos.push(g);
  }
  return mergeGeometries(geos);
}
function tronc(segs) { return mergeGeometries(segs.map(([x0, y0, z0, x1, y1, z1, r0, r1]) => { const a = new T.Vector3(x0, y0, z0), b = new T.Vector3(x1, y1, z1), l = a.distanceTo(b), g = new T.CylinderGeometry(r1, r0, l, 7, 1); g.translate(0, l / 2, 0); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), b.clone().sub(a).normalize())); g.translate(x0, y0, z0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * l); return g.toNonIndexed(); })); }
function foret(liste, geoTronc, matTronc, geoFeuilles, matFeuilles) {
  const o = new T.Object3D(), out = [];
  for (const [geo, m, ombre] of [[geoTronc, matTronc, true], [geoFeuilles, matFeuilles, true]]) {
    if (!geo) continue;
    const im = new T.InstancedMesh(geo, m, liste.length);
    liste.forEach((e, i) => { o.position.set(e.x, e.y, e.z); o.rotation.set(0, e.ry || 0, 0); o.scale.setScalar(e.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = ombre; im.receiveShadow = true; scene.add(im); out.push(im);
  }
  return out;
}
(() => {
  for (let x = 34; x <= 125; x += 7) for (let z = 76; z <= 139; z += 7) CITRONNIERS.push({ x: x + (h2(x, z) - .5) * .6, z: z + (h2(z, x) - .5) * .6, s: .9 + h2(x * 3, z) * .3 });
  const matFeuilleC = auVent(new T.MeshStandardMaterial({ map: TX.citronnier, alphaTest: .45, side: T.DoubleSide, roughness: .55 }), 1.2, .035);
  const matFeuilleO = auVent(new T.MeshStandardMaterial({ map: TX.olivier, alphaTest: .45, side: T.DoubleSide, roughness: .7 }), 1.2, .03);
  const matFeuilleY = auVent(new T.MeshStandardMaterial({ map: TX.cypres, alphaTest: .45, side: T.DoubleSide, roughness: .8 }), 1, .012);
  const ecorce = M('ecorce:8a7a68'), ecorceO = M('ecorce:9a9282');
  // Citronniers : touffus, bas, chargés de fruits
  const tC = tronc([[0, 0, 0, .05, 1, 0, .17, .12], [.05, 1, 0, .7, 1.9, .2, .09, .05], [.05, 1, 0, -.6, 2, .3, .09, .05], [.05, 1, 0, .1, 2.1, -.7, .08, .05], [.05, 1, 0, 0, 2.4, .1, .08, .05]]);
  const fC = couronne(Q.arbres < 1 ? 60 : 110, 1.5, 1.2, 1.5, 2.35, .85, 5);
  const listeC = CITRONNIERS.map(t => ({ x: t.x, y: H(t.x, t.z), z: t.z, s: t.s, ry: h2(t.x, 9) * 6 }));
  SANS_AO.push(...foret(listeC, tC, ecorce, fC, matFeuilleC).slice(1));
  const fruits = [], o = new T.Object3D();
  for (const t of CITRONNIERS) { const y = H(t.x, t.z); for (let k = 0; k < 10; k++) { const a = h2(t.x * 7 + k, t.z) * PI * 2, b = h2(t.z * 5 + k, t.x) * 1.1 - .45; fruits.push([t.x + Math.cos(a) * Math.cos(b) * 1.45 * t.s, y + 2.35 * t.s + Math.sin(b) * 1.15 * t.s, t.z + Math.sin(a) * Math.cos(b) * 1.45 * t.s]); } CERCLES.push({ x: t.x, z: t.z, r: .95 }); }
  const imF = new T.InstancedMesh(new T.SphereGeometry(.085, 10, 8), M('fruit:f0c62c'), fruits.length);
  fruits.forEach(([x, y, z], i) => { o.position.set(x, y, z); o.scale.set(1, 1.2, 1); o.rotation.set(R(), R(), 0); o.updateMatrix(); imF.setMatrixAt(i, o.matrix); }); imF.castShadow = true; scene.add(imF);
  // Murets en pierre sèche du jardin
  const { x0, x1, z0, z1 } = JARDIN;
  muret(x0, z0, 41, z0); muret(49, z0, 61, z0); muret(70, z0, x1, z0);
  muret(x0, z1, 104, z1); muret(111, z1, x1, z1);
  muret(x0, z0, x0, z1); muret(x1, z0, x1, z1);
  // Oliviers, cyprès, figuiers de Barbarie, rochers, touffes d'herbes
  const ol = [], cy = [], fi = [], ro = [];
  let n = 0;
  const nbOl = Math.round(170 * Q.arbres);
  while (ol.length < nbOl && n++ < 8000) { const x = (R() - .5) * 440, z = (R() - .5) * 400 - 10; if (!libre(x, z)) continue; ol.push({ x, y: H(x, z) - .1, z, s: .85 + R() * .5, ry: R() * 6 }); CERCLES.push({ x, z, r: .6 }); }
  const tO = tronc([[0, 0, 0, .25, .9, .1, .26, .2], [.25, .9, .1, -.1, 1.6, -.1, .2, .14], [-.1, 1.6, -.1, .8, 2.4, .3, .12, .06], [-.1, 1.6, -.1, -.9, 2.3, -.2, .12, .06], [.25, .9, .1, .3, 2.6, -.6, .1, .05]]);
  const fO = couronne(Q.arbres < 1 ? 60 : 110, 1.4, .9, 1.3, 2.4, .9, 9, [[.6, .1, .2, 1], [-.7, 0, -.1, 1], [0, .5, -.4, .9]]);
  SANS_AO.push(...foret(ol, tO, ecorceO, fO, matFeuilleO).slice(1));
  for (const [x, z] of [[-60, -96], [-100, -96], [-66, -100], [-102, -100], [112, -30], [140, -30], [140, -58], [98, 26], [86, 30], [92, 30], [22, 62], [22, 70], [-71, -101], [-89, -102]]) { cy.push({ x, y: H(x, z), z, s: .85 + R() * .35, ry: R() * 6 }); CERCLES.push({ x, z, r: .7 }); }
  const tY = tronc([[0, 0, 0, 0, 1.5, 0, .2, .14]]), fY = couronne(70, .85, 3.4, .85, 4.2, .9, 13);
  SANS_AO.push(...foret(cy, tY, ecorce, fY, matFeuilleY).slice(1));
  // Figuiers de Barbarie : raquettes empilées
  const gr = [], rq = alea(71), sph = new T.SphereGeometry(.5, 12, 8);
  const pose = (x, y, z, rx, ry, rz, s) => { const g = sph.clone(); g.scale(.95 * s, .72 * s, .22 * s); g.rotateZ(rz); g.rotateX(rx); g.rotateY(ry); g.translate(x, y, z); gr.push(g.toNonIndexed()); };
  for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2; pose(Math.cos(a) * .35, .4, Math.sin(a) * .35, 0, a, (rq() - .5) * .5, 1); for (let j = 0; j < 2; j++) pose(Math.cos(a) * (.5 + j * .25), 1 + j * .55, Math.sin(a) * (.5 + j * .25), (rq() - .5) * .4, a + rq(), (rq() - .5) * .9, .85 - j * .1); }
  pose(0, 1.6, 0, 0, 0, .2, .8);
  const gFi = mergeGeometries(gr);
  n = 0;
  while (fi.length < 120 * Q.arbres && n++ < 6000) {
    let x, z; if (R() < .55) { const r = ROUTES[(R() * 2) | 0], i = (R() * (r.length - 1)) | 0, t = R(), sd = R() < .5 ? -1 : 1; x = lerp(r[i][0], r[i + 1][0], t) + sd * (4.5 + R() * 3); z = lerp(r[i][1], r[i + 1][1], t) + (R() - .5) * 4; } else { x = (R() - .5) * 400; z = (R() - .5) * 380; }
    if (!libre(x, z, -2.5) || distRoute(x, z) < 4) continue;
    fi.push({ x, y: H(x, z), z, s: .8 + R() * .6, ry: R() * 6 }); CERCLES.push({ x, z, r: 1 });
  }
  foret(fi, gFi, M('raquette:9fbf7a'));
  n = 0;
  while (ro.length < 110 && n++ < 3000) { const x = (R() - .5) * 460, z = (R() - .5) * 420; if (!libre(x, z, -2)) continue; const s = .4 + R() * 1.3; ro.push({ x, y: H(x, z) - s * .2, z, s, ry: R() * 6 }); if (s > .8) CERCLES.push({ x, z, r: s * .9 }); }
  const gRo = facettes(new T.IcosahedronGeometry(1, 1)); gRo.scale(1, .65, 1.1);
  foret(ro, gRo, M('pierre:b4a78e'));
  // Touffes d'herbes hautes (cartes croisées) le long des chemins et des murets
  const touffe = mergeGeometries([0, PI / 3, PI * 2 / 3].map(a => { const g = new T.PlaneGeometry(1.1, .8); g.translate(0, .38, 0); g.rotateY(a); return g; }));
  const hb = []; n = 0;
  while (hb.length < 900 * Q.arbres && n++ < 9000) { const x = (R() - .5) * 420, z = (R() - .5) * 400; if (Math.hypot(x - L.village.x, z - L.village.z) < 52 || (Math.abs(x - L.baglio.x) < 14 && Math.abs(z - L.baglio.z) < 14) || distRoute(x, z) < 2.6 || H(x, z) < 2) continue; hb.push({ x, y: H(x, z) - .05, z, s: .6 + R() * .7, ry: R() * 6 }); }
  const matHerbe = auVent(new T.MeshStandardMaterial({ map: TX.herbes, alphaTest: .4, side: T.DoubleSide, roughness: .9 }), 0, .09);
  SANS_AO.push(...foret(hb, null, null, touffe, matHerbe));
})();

/* Herbe fine autour du joueur (recalculée quand il s'éloigne) */
const HERBE = (() => {
  if (!Q.herbe) return null;
  const g = new T.PlaneGeometry(.04, .38, 1, 4); g.translate(0, .19, 0);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) * (1 - y * 2.2) + y * y * .3); }
  const cols = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const y = p.getY(i) / .38, c = .4 + y * .6; cols[i * 3] = c; cols[i * 3 + 1] = c; cols[i * 3 + 2] = c; } g.setAttribute('color', new T.BufferAttribute(cols, 3)); g.computeVertexNormals();
  const m = auVent(new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .85 }), 0, .32);
  const im = new T.InstancedMesh(g, m, Q.herbe); im.receiveShadow = true; im.frustumCulled = false; scene.add(im); SANS_AO.push(im);
  const tons = [0xc8b46c, 0xb6a85e, 0xa89a50, 0xd2bc78, 0x9a9650].map(c => new T.Color(c));
  return { im, cx: 1e9, cz: 1e9, tons };
})();
function majHerbe(x, z) {
  if (!HERBE || Math.hypot(x - HERBE.cx, z - HERBE.cz) < Q.rayonHerbe * .3) return;
  HERBE.cx = x; HERBE.cz = z; const o = new T.Object3D(), ra = alea((Math.round(x) * 73856093) ^ (Math.round(z) * 19349663)); let k = 0;
  for (let i = 0; i < Q.herbe * 3 && k < Q.herbe; i++) {
    const a = ra() * PI * 2, r = Math.sqrt(ra()) * Q.rayonHerbe, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
    if (distRoute(px, pz) < 2.6 || Math.hypot(px - L.village.x, pz - L.village.z) < 54 || (Math.abs(px - L.baglio.x) < 13.5 && Math.abs(pz - L.baglio.z) < 13.5) || H(px, pz) < 1.9 || dansBatiment(px, pz, H(px, pz) + .5)) continue;
    o.position.set(px, H(px, pz), pz); o.rotation.set((ra() - .5) * .3, ra() * 6, (ra() - .5) * .3); const s = .55 + ra() * .8; o.scale.set(s, s * (dansJardin(px, pz) ? 1.25 : 1), s); o.updateMatrix();
    HERBE.im.setMatrixAt(k, o.matrix); HERBE.im.setColorAt(k, HERBE.tons[(ra() * HERBE.tons.length) | 0]); k++;
  }
  HERBE.im.count = k; HERBE.im.instanceMatrix.needsUpdate = true; if (HERBE.im.instanceColor) HERBE.im.instanceColor.needsUpdate = true;
}
/* Poussière dorée en suspension */
const POUSSIERE = (() => {
  const n = 500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = (R() - .5) * 40; p[i * 3 + 1] = R() * 8; p[i * 3 + 2] = (R() - .5) * 40; }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(p, 3));
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); x.fillStyle = gr; x.fillRect(0, 0, 32, 32);
  const m = new T.PointsMaterial({ size: .07, map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending, color: 0xffe2a8, opacity: .5 });
  const pts = new T.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
})();

/* ---------- Décor sicilien : fleurs, treille, linge, autels, meules, bancs, maisons en plus ---------- */
function pot(B, s = 1) {
  poser(new T.LatheGeometry(prof([[.0, 0], [.11, 0], [.15, .2], [.17, .26], [.15, .28], [0, .28]]), 12), 'dome:b8653e', B.clone().multiply(mat4(0, 0, 0, 0, 0, 0, s, s, s)));
  poser(couronne(9, .16, .1, .16, .34, .26, (R() * 1e6) | 0), 'fleurs:geranium', B.clone().multiply(mat4(0, 0, 0, R() * 6, 0, 0, s, s, s)), false);
}
function bougainvillier(B, haut) {
  poser(tronc([[0, 0, .12, .25, haut * .5, .1, .07, .05], [.25, haut * .5, .1, -.3, haut * .85, .12, .05, .03], [.25, haut * .5, .1, .8, haut * .7, .12, .04, .025]]), 'ecorce:6a5a48', B);
  poser(couronne(Math.round(40 + haut * 8), 1.4, haut * .32, .32, haut * .66, .7, (R() * 1e6) | 0), 'fleurs:bougainvillee', B.clone().multiply(mat4(0, 0, .3)), false);
}
function autel(x, z, ry) {
  const B = mat4(x, H(x, z), z, ry);
  piece(B, PIERRE, .8, 2.6, .55, 0, .3, 0); piece(B, PIERRE_C, .95, .14, .7, 0, 1.62, .05);
  piece(B, 'verre', .5, .7, .05, 0, 1.15, .27, 0, 0, 0, false);
  poser(new T.PlaneGeometry(.42, .62), 'image', B.clone().multiply(mat4(0, 1.15, .3)));
  piece(B, 'tuiles:ffffff', .5, .08, .8, -.24, 1.82, .05, 0, 0, .5); piece(B, 'tuiles:ffffff', .5, .08, .8, .24, 1.82, .05, 0, 0, -.5);
  for (const sx of [-.18, .18]) { poser(new T.CylinderGeometry(.025, .025, .14, 8), 'uni:f0ead8', B.clone().multiply(mat4(sx, .87, .38))); piece(B, 'lumiere', .02, .035, .02, sx, .96, .38, 0, 0, 0, false); }
  pot(B.clone().multiply(mat4(-.45, 0, .5)), 1.1); pot(B.clone().multiply(mat4(.45, 0, .5)), 1);
  obstacleBoite(x, z, .9, .7, ry, 2.6);
}
function meule(x, z, s = 1) {
  const pts = prof([[0, 0], [1.6, 0], [1.75, .6], [1.55, 1.6], [1, 2.4], [.4, 2.85], [0, 3]]);
  poser(new T.LatheGeometry(pts, 18), 'sol:e2c27a', mat4(x, H(x, z) - .1, z, R() * 6, 0, 0, s, s * (.9 + R() * .2), s));
  poser(new T.CylinderGeometry(.04, .05, 1.2, 6), 'bois:6a4a30', mat4(x, H(x, z) + 3 * s, z));
  CERCLES.push({ x, z, r: 1.7 * s });
}
function linge(ax, az, bx, bz, hh) {
  const y = Math.max(H(ax, az), H(bx, bz)) + hh, L0 = Math.hypot(bx - ax, bz - az), rot = Math.atan2(-(bz - az) / L0, (bx - ax) / L0);
  const B = mat4((ax + bx) / 2, y, (az + bz) / 2, rot);
  piece(B, 'uni:cfc6b2', L0, .015, .015, 0, 0, 0, 0, 0, 0, false);
  const tons = ['f2ede2', 'e8e0cc', 'c94a3a', '3f6a8a', 'ece4d0', 'd8b04a', 'f0ece4'];
  for (let x = -L0 / 2 + .4; x < L0 / 2 - .4; x += .55 + R() * .5) { const l = .35 + R() * .45, h = .4 + R() * .55; piece(B, 'tissu:' + tons[(R() * tons.length) | 0], l, h, .02, x + l / 2, -h / 2 - .02, 0, 0, (R() - .5) * .25, 0, false); x += l; }
}
function banc(x, z, ry) { const B = mat4(x, H(x, z), z, ry); piece(B, PIERRE_C, 2.2, .14, .55, 0, .5, 0); piece(B, PIERRE, .3, .5, .45, -.85, .22, 0); piece(B, PIERRE, .3, .5, .45, .85, .22, 0); obstacleBoite(x, z, 2.2, .55, ry, .6); }
function lanterneMurale(x, z, ry, hh = 3) { const B = mat4(x, H(x, z), z, ry); piece(B, 'fer', .05, .05, .45, 0, hh + .3, .22, 0, 0, 0, false); piece(B, 'fer', .26, .05, .26, 0, hh + .28, .45, 0, 0, 0, false); piece(B, 'lumiere', .17, .26, .17, 0, hh + .12, .45, 0, 0, 0, false); piece(B, 'fer', .2, .04, .2, 0, hh - .03, .45, 0, 0, 0, false); }
(() => {
  // Village plus dense : maisons en second rang, ruelles
  for (const [x, z, w, d, h, r = 0, o = {}] of [
    [-128, -64, 8, 9, 6, -PI / 2], [-128, -80, 8, 9, 7, -PI / 2], [-118, -96, 8, 9, 6, PI], [-110, -120, 9, 8, 6.5, PI], [-92, -122, 8, 8, 6, PI, { plat: true }],
    [-72, -121, 9, 8, 7, PI], [-40, -100, 8, 8, 6, PI / 2], [-36, -74, 8, 8, 6, PI / 2], [-104, -36, 8, 8, 6, 0], [-120, -34, 7, 8, 5.5, 0], [-60, -36, 8, 8, 6, 0, { plat: true }], [-46, -28, 7, 7, 5, .4]
  ]) maison(x, z, w, d, h, r, o);
  // Linge tendu dans les ruelles derrière la place
  for (const x of [-91, -86, -76, -72]) linge(x, -45.3, x + .4, -42.2, 3.6 + R());
  linge(-109.4, -60.5, -111.1, -61, 3.4);
  // Bancs de la place, lanternes murales
  banc(-93, -76, PI / 2); banc(-67, -77, -PI / 2); banc(-80, -60.5, PI);
  for (const [x, z, r] of [[-94, -54.4, PI], [-84, -54.4, PI], [-72, -54.4, PI], [-60.9, -80, -PI / 2], [-98.3, -73, PI / 2], [-77, -84.6, 0]]) lanterneMurale(x, z, r);
  // Autels de bord de route
  autel(8, 18.5, -.9); autel(-27, -16, .6); autel(48, 64, -2.2);
  // Meules de foin près de la masseria et des champs
  for (const [x, z, sc] of [[100, -12, 1], [106, -6, .85], [140, -12, 1.1], [95, 30, .9], [150, 15, 1], [20, 100, .9], [12, 112, 1]]) meule(x, z, sc);
  // Treille de vigne devant la maison du baglio
  const { x: bx, z: bz } = L.baglio, yb = H(bx, bz);
  for (const px of [62, 66, 70, 74]) { piece(mat4(px, yb, bz - 2.2), 'bois:7a5636', .14, 2.8, .14, 0, 1.4, 0); CERCLES.push({ x: px, z: bz - 2.2, r: .15 }); poser(tronc([[0, 0, 0, .15, 1.4, .05, .05, .04], [.15, 1.4, .05, -.1, 2.7, .1, .04, .03]]), 'ecorce:5a4a38', mat4(px + .25, yb, bz - 2.15)); }
  piece(mat4(68, yb, bz - 2.2), 'bois:7a5636', 12.6, .14, .14, 0, 2.82, 0);
  for (const px of [62, 66, 70, 74]) piece(mat4(px, yb, bz - 3.6), 'bois:7a5636', .1, .1, 2.9, 0, 2.86, 0);
  poser(couronne(Q.arbres < 1 ? 110 : 200, 6.6, .25, 1.4, 2.98, .9, 31), 'fleurs:vigne', mat4(68, yb, bz - 3.5), true);
  for (let i = 0; i < 14; i++) { const gx = 62.5 + R() * 11, gz = bz - 2.6 - R() * 2.2; for (let k = 0; k < 7; k++) poser(new T.SphereGeometry(.035, 6, 5), 'fruit:4a2a48', mat4(gx + (R() - .5) * .08, yb + 2.72 - k * .03 - R() * .05, gz + (R() - .5) * .08), false); }
  // Jarres, sacs et un vieux carretto contre un mur
  for (const [x, z] of [[-66.5, -79.5], [-97.5, -56.5], [-58.8, -63], [118, -36], [131, -36]]) jarre(mat4(x, H(x, z), z, R() * 3));
  for (const [x, z] of [[-89.5, -58.8], [-90.3, -58.6], [80.5, 46]]) poser(new T.SphereGeometry(.3, 10, 8), 'tissu:b8a27a', mat4(x, H(x, z) + .22, z, R() * 3, 0, 0, 1, .75, 1));
})();

/* ---------- Lanternes ---------- */
const LAMPES = [];
function lampe(x, y, z, parent) { const l = new T.PointLight(0xffa850, 0, 24, 2); l.position.set(x, y, z); (parent || scene).add(l); LAMPES.push(l); return l; }
const lampesFixes = [lampe(56.1, H(57, 46) + 4.2, 46.1), lampe(L.village.x + 3, H(L.village.x, L.village.z) + 4, L.village.z + 2), lampe(L.porteCaserne.x + .45, H(-98, -70) + 3.1, L.porteCaserne.z + 1.9)];
(() => {
  const p = lampesFixes[1].position; const B = mat4(p.x, p.y - 4, p.z);
  poser(new T.CylinderGeometry(.07, .1, 4, 8), 'fer', B.clone().multiply(mat4(0, 2, 0))); piece(B, 'fer', .5, .05, .05, -.2, 3.75, 0, 0, 0, 0, false);
  for (const l of lampesFixes) { piece(mat4(l.position.x, l.position.y, l.position.z), 'lumiere', .2, .3, .2, 0, -.05, 0, 0, 0, 0, false); piece(mat4(l.position.x, l.position.y, l.position.z), 'fer', .3, .06, .3, 0, .14, 0, 0, 0, 0, false); }
})();
construireLots();

/* ---------- Personnages : corps modelés et articulés (hanches, genoux, épaules, coudes) ---------- */
await etape('Personnages…');
const GH = {
  cuisse: new T.CapsuleGeometry(.078, .34, 4, 12), tibia: new T.CapsuleGeometry(.062, .32, 4, 12), bras: new T.CapsuleGeometry(.054, .21, 4, 10), avb: new T.CapsuleGeometry(.046, .19, 4, 10),
  main: new T.SphereGeometry(.05, 12, 8), crane: new T.SphereGeometry(.105, 24, 18), nez: new T.ConeGeometry(.02, .055, 8), oreille: new T.SphereGeometry(.028, 10, 8), oeil: new T.SphereGeometry(.013, 10, 8),
  cou: new T.CylinderGeometry(.048, .055, .14, 14), chaussure: new T.CapsuleGeometry(.056, .15, 4, 10),
  torse: new T.LatheGeometry(prof([[.13, .93], [.152, 1.0], [.158, 1.12], [.17, 1.26], [.185, 1.38], [.19, 1.44], [.16, 1.5], [.1, 1.535], [.05, 1.55]]), 22),
  bassin: new T.LatheGeometry(prof([[.135, .78], [.162, .86], [.165, .96], [.155, 1.0]]), 20),
  gilet: new T.LatheGeometry(prof([[.165, .97], [.163, 1.1], [.176, 1.25], [.192, 1.38], [.196, 1.43], [.17, 1.46]]), 22),
  veste: new T.LatheGeometry(prof([[.2, .74], [.19, .9], [.175, 1.05], [.182, 1.25], [.198, 1.38], [.205, 1.45], [.17, 1.5], [.11, 1.54], [.07, 1.55]]), 22),
  jupe: new T.LatheGeometry(prof([[.16, 1.0], [.19, .86], [.26, .5], [.33, .12], [.345, .02], [0, .02]]), 22),
  cheveux: new T.SphereGeometry(.112, 20, 12, 0, PI * 2, 0, PI * .55), calotte: new T.SphereGeometry(.12, 20, 10, 0, PI * 2, 0, PI / 2),
  visiere: new T.CylinderGeometry(.115, .115, .012, 20, 1, false, -PI / 2, PI), disque: new T.CylinderGeometry(1, 1, 1, 28), demiLune: new T.CylinderGeometry(.21, .21, .045, 24, 1, false, PI / 2, PI),
  cape: new T.LatheGeometry(prof([[.07, 1.6], [.16, 1.55], [.215, 1.47], [.235, 1.3], [.24, 1.18]]), 22)
};
GH.chaussure.rotateX(PI / 2);
/* Tête sculptée : une sphère déformée (nez, arcades, orbites, pommettes, lèvres, menton, mâchoire) */
function formeTete(x, y, z) {
  const ax = Math.abs(x), ex = (a, b) => Math.exp(-a * a - b * b);
  let r = 1;
  if (z > 0) {
    const zf = Math.min(1, z * 2.2);
    r += zf * (.2 * ex(x / .085, (y + .1) / .2) + .09 * ex(x / .075, (y + .26) / .065) + .045 * ex((ax - .075) / .045, (y + .31) / .045));
    r += zf * .055 * ex((ax - .3) / .17, (y - .21) / .07);
    r -= zf * .075 * ex((ax - .32) / .11, (y - .07) / .085);
    r += zf * .05 * ex((ax - .52) / .15, (y + .06) / .12);
    r += zf * (.045 * ex(x / .2, (y + .45) / .055) - .02 * ex(x / .18, (y + .468) / .012));
    r += zf * .06 * ex(x / .2, (y + .74) / .12);
  }
  if (z < -.2) r += .04 * ex(x / .5, (y - .15) / .4);
  const mach = y < 0 ? 1 - .2 * Math.pow(Math.min(1, -y), 1.5) : 1;
  return new T.Vector3(x * r * .092 * mach, y * r * .118, z * r * .102);
}
function sculpter(g, gonfle = 1, bruitM = 0) { const p = g.attributes.position, v = new T.Vector3(); for (let i = 0; i < p.count; i++) { v.set(p.getX(i), p.getY(i), p.getZ(i)).normalize(); const q = formeTete(v.x, v.y, v.z).multiplyScalar(gonfle * (1 + (bruitM ? (h2(Math.round(v.x * 40), Math.round(v.y * 40 + v.z * 23)) - .5) * bruitM : 0))); p.setXYZ(i, q.x, q.y, q.z); } g.computeVertexNormals(); return g; }
GH.tete = sculpter(new T.SphereGeometry(1, 64, 48));
GH.chevelure = sculpter(new T.SphereGeometry(1, 40, 20, 0, PI * 2, 0, PI * .5), 1.07, .06);
GH.barbe = sculpter(new T.SphereGeometry(1, 40, 20, PI * .05, PI * .9, PI * .58, PI * .42), 1.06, .05);
const OEIL = (sx) => { const v = new T.Vector3(sx * .32, .075, .94).normalize(); return formeTete(v.x, v.y, v.z).multiplyScalar(.93); };
GH.globe = new T.SphereGeometry(.0128, 16, 12); GH.iris = new T.SphereGeometry(.0068, 14, 10); GH.paupiere = new T.SphereGeometry(.0142, 16, 8, 0, PI * 2, 0, PI * .5);
GH.sourcil = new T.CapsuleGeometry(.0042, .03, 2, 6); GH.sourcil.rotateZ(PI / 2);
GH.moust = new T.CapsuleGeometry(.0075, .036, 3, 8); GH.moust.rotateZ(PI / 2);
GH.paume = new T.CapsuleGeometry(.032, .05, 4, 10); GH.pouce = new T.CapsuleGeometry(.012, .035, 3, 8);
GH.col = new T.TorusGeometry(.062, .014, 8, 20); GH.bouton = new T.SphereGeometry(.009, 8, 6);
function partie(parent, geo, cle, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { const m = new T.Mesh(geo, M(cle)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function humain(o = {}) {
  const g = new T.Group(), corps = new T.Group(); g.add(corps);
  const peau = 'peau:' + hex(o.peau ?? 0xc69068), chem = 'tissu:' + hex(o.chemise ?? 0xe8e0cc), pant = 'tissu:' + hex(o.pantalon ?? 0x4a3f33), chev = 'cheveux:' + hex(o.cheveux ?? 0x1e1712), chaus = 'cuir:2a1e16';
  const jambe = sx => {
    const p = new T.Group(); p.position.set(sx * .092, .93, 0); corps.add(p);
    partie(p, GH.cuisse, pant, 0, -.24, 0);
    const genou = new T.Group(); genou.position.y = -.46; p.add(genou);
    partie(genou, GH.tibia, pant, 0, -.2, 0); partie(genou, GH.chaussure, chaus, 0, -.43, .045, 1, .8, 1);
    p.genou = genou; return p;
  };
  const jg = jambe(-1), jd = jambe(1);
  partie(corps, GH.bassin, pant, 0, 0, 0, 1, 1, .78);
  if (o.robe != null) { partie(corps, GH.jupe, 'tissu:' + hex(o.robe), 0, 0, 0, 1, 1, .85); jg.visible = jd.visible = false; }
  const torse = partie(corps, GH.torse, chem, 0, 0, 0, 1, 1, .72);
  if (o.gilet != null) partie(corps, GH.gilet, 'tissu:' + hex(o.gilet), 0, 0, 0, 1, 1, .74);
  if (o.veste != null) partie(corps, GH.veste, 'tissu:' + hex(o.veste), 0, 0, 0, 1, 1, .76);
  if (o.robe == null) partie(corps, GH.disque, o.ceinture != null ? 'tissu:' + hex(o.ceinture) : 'cuir:2a2018', 0, .965, 0, .168, .05, .125);
  if (o.tablier) partie(corps, GH.disque, 'tissu:ece6d6', 0, .78, .1, .2, .5, .06);
  partie(corps, GH.cou, peau, 0, 1.6, 0);
  if (o.robe == null || o.chemise != null) partie(corps, GH.col, o.veste != null ? 'tissu:' + hex(o.veste) : chem, 0, 1.555, .005, 1.05, .9, 1, PI / 2 + .25);
  if (o.foulard != null) partie(corps, GH.col, 'tissu:' + hex(o.foulard), 0, 1.565, .01, 1.1, 1.1, 1.6, PI / 2 + .3);
  if (o.gilet != null) for (let i = 0; i < 4; i++) partie(corps, GH.bouton, 'bronze', 0, 1.06 + i * .08, .143 + i * .006);
  const tete = new T.Group(); tete.position.set(0, 1.74, .01); corps.add(tete);
  const typeVisage = o.robe != null ? 'femme' : o.vieux ? 'vieux' : 'homme';
  partie(tete, GH.tete, 'visage:' + typeVisage + ':' + hex(o.peau ?? 0xc69068), 0, 0, 0);
  partie(tete, GH.oreille, peau, -.091, -.004, -.008, .42, 1.05, .78); partie(tete, GH.oreille, peau, .091, -.004, -.008, .42, 1.05, .78);
  const paupieres = [];
  for (const sx of [-1, 1]) {
    const e = OEIL(sx);
    partie(tete, GH.globe, 'oeil', e.x, e.y, e.z);
    partie(tete, GH.iris, 'iris:' + hex(o.yeux ?? 0x3a2414), e.x, e.y, e.z + .0085, 1, 1, .45);
    const pp = new T.Group(); pp.position.copy(e); tete.add(pp); partie(pp, GH.paupiere, peau, 0, 0, 0); pp.rotation.x = .35; paupieres.push(pp);
    const sc = formeTete(...new T.Vector3(sx * .3, .23, .92).normalize().toArray());
    partie(tete, GH.sourcil, chev, sc.x, sc.y + .002, sc.z + .003, 1, 1, 1, 0, sx * -.25, sx * -.12);
  }
  if (!o.chauve) partie(tete, GH.chevelure, chev, 0, .004, -.006, 1, 1, 1, -.32);
  else partie(tete, GH.chevelure, chev, 0, -.035, -.012, 1.01, .75, 1.01, -1.3);
  if (o.moustache) { const mc = 'cheveux:' + hex(o.moustache === true ? o.cheveux ?? 0x1e1712 : o.moustache), m0 = formeTete(...new T.Vector3(0, -.37, .93).normalize().toArray()); for (const sx of [-1, 1]) partie(tete, GH.moust, mc, sx * .017, m0.y, m0.z + .004, 1, 1, 1, 0, sx * -.35, sx * .3); }
  if (o.barbe) partie(tete, GH.barbe, 'cheveux:' + hex(o.barbe), 0, 0, 0);
  const ch = o.chapeau, cc = (o.chapeauC != null ? 'tissu:' + hex(o.chapeauC) : 'tissu:3b3530');
  if (ch === 'coppola') { partie(tete, GH.calotte, cc, 0, .065, .012, 1.06, .42, 1.12, -.12); partie(tete, GH.visiere, cc, 0, .07, .075, 1, 1, 1, .16); }
  else if (ch === 'paille') { partie(tete, GH.disque, 'tissu:' + hex(o.chapeauC ?? 0xcdb27a), 0, .08, 0, .27, .012, .27); partie(tete, GH.disque, 'tissu:' + hex(o.chapeauC ?? 0xcdb27a), 0, .14, 0, .118, .12, .118); partie(tete, GH.disque, 'tissu:4a3020', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'feutre') { partie(tete, GH.disque, cc, 0, .08, 0, .17, .012, .17); partie(tete, GH.calotte, cc, 0, .085, 0, 1, .95, 1); partie(tete, GH.disque, 'tissu:151210', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'lucerna') { partie(tete, GH.demiLune, 'tissu:121318', 0, .08, 0, 1.1, 1, 1, PI / 2, 0); partie(tete, GH.oreille, 'tissu:b03a2e', 0, .19, .03, .8, .8, .5); partie(tete, GH.disque, 'bronze', .05, .14, .03, .03, .01, .03, PI / 2); }
  else if (ch === 'scialle') { partie(tete, GH.calotte, cc, 0, -.01, -.01, 1.15, 1.25, 1.15, -.25); partie(corps, GH.cape, cc, 0, 0, 0, 1, 1, .8); }
  else if (ch === 'pretre') { partie(tete, GH.disque, cc, 0, .085, 0, .21, .012, .21); partie(tete, GH.calotte, cc, 0, .09, 0, .85, .7, .85); }
  const bras = sx => {
    const p = new T.Group(); p.position.set(sx * .205, 1.45, 0); corps.add(p);
    const tc = o.veste != null ? 'tissu:' + hex(o.veste) : chem;
    partie(p, GH.bras, tc, 0, -.15, 0);
    const coude = new T.Group(); coude.position.y = -.29; p.add(coude);
    partie(coude, GH.avb, o.manches ? peau : tc, 0, -.12, 0, o.manches ? .9 : 1, 1, o.manches ? .9 : 1); if (o.manches) partie(coude, GH.col, tc, 0, -.02, 0, .82, .82, 1.3, PI / 2);
    partie(coude, GH.paume, peau, 0, -.275, .008, 1, 1, .58); partie(coude, GH.pouce, peau, sx * -.026, -.255, .022, 1, 1, 1, .4, 0, sx * .5);
    p.coude = coude; p.rotation.z = sx * .06; return p;
  };
  const bg = bras(-1), bd = bras(1);
  if (o.lupara) { const f = new T.Group(); f.position.set(0, 1.28, -.2); f.rotation.set(0, 0, .75); corps.add(f); partie(f, GH.disque, 'fer', -.012, 0, 0, .014, .9, .014); partie(f, GH.disque, 'fer', .012, 0, 0, .014, .9, .014); partie(f, GH.disque, 'bois:5a3a22', 0, -.55, 0, .03, .35, .05); }
  let lanterne = null;
  if (o.lanterne) { lanterne = new T.Group(); lanterne.position.set(0, -.33, .04); bd.coude.add(lanterne); partie(lanterne, GH.disque, 'lumiere', 0, -.1, 0, .06, .16, .06); partie(lanterne, GH.disque, 'fer', 0, .0, 0, .075, .03, .075); partie(lanterne, GH.disque, 'fer', 0, -.19, 0, .075, .03, .075); }
  if (o.cassette) { const c = new T.Mesh(new T.BoxGeometry(.3, .18, .22), M('bois:5a3a22')); c.position.set(0, -.32, .1); bg.coude.add(c); }
  g.scale.setScalar(o.taille ?? 1);
  return { g, corps, tete, torse, jg, jd, bg, bd, ph: R() * 6, amp: 0, lanterne, porte: !!o.lanterne, assis: false, paupieres, cligne: R() * 4, ferme: 0, parle: false, tp: 0 };
}
function animer(h, dt, v) {
  if (h.assis) { h.jg.rotation.x = h.jd.rotation.x = -1.5; h.jg.genou.rotation.x = h.jd.genou.rotation.x = 1.45; h.bg.rotation.x = h.bd.rotation.x = -.55; h.bg.coude.rotation.x = h.bd.coude.rotation.x = -.7; h.corps.position.y = 0; h.corps.rotation.set(0, 0, 0); return; }
  const k = clamp(v / 5, 0, 1.5);
  h.ph += dt * (4 + v * 1.55);
  h.amp = lerp(h.amp, v > .15 ? clamp(.32 + k * .42, 0, .85) : 0, 1 - Math.exp(-dt * 10));
  const s = Math.sin(h.ph), c = Math.cos(h.ph), a = s * h.amp;
  h.jg.rotation.x = a; h.jd.rotation.x = -a;
  h.jg.genou.rotation.x = Math.max(0, c) * h.amp * 1.5 + .04; h.jd.genou.rotation.x = Math.max(0, -c) * h.amp * 1.5 + .04;
  h.bg.rotation.x = -a * .85; h.bd.rotation.x = h.porte ? -.35 : a * .85;
  h.bg.coude.rotation.x = -.18 - Math.max(0, a) * .7; h.bd.coude.rotation.x = h.porte ? -.9 : -.18 - Math.max(0, -a) * .7;
  h.corps.position.y = Math.abs(c) * .04 * k - k * .02;
  h.corps.rotation.set(.04 * k + (k > 1.2 ? .1 : 0), s * .07 * h.amp, 0);
  h.tete.rotation.y = -s * .05 * h.amp;
  h.torse.scale.y = 1 + Math.sin(h.ph * .35) * .008 * (1 - h.amp);
  h.cligne -= dt; if (h.cligne < 0) { h.cligne = 2 + R() * 4.5; h.ferme = .13; } if (h.ferme > 0) h.ferme -= dt;
  for (const p of h.paupieres) p.rotation.x = h.ferme > 0 ? 1.45 : .35;
  h.bd.rotation.z = .06; h.bg.rotation.z = -.06;
  if (v < .2) {
    const t = (h.tp += dt);
    if (h.parle) {
      h.bd.rotation.x = -.38 + Math.sin(t * 2.1) * .2; h.bd.coude.rotation.x = -.95 + Math.sin(t * 3.3) * .32; h.bd.rotation.z = .2 + Math.sin(t * 1.7) * .1;
      if (!h.porte) { h.bg.rotation.x = -.12 + Math.sin(t * 1.6 + 1) * .12; h.bg.coude.rotation.x = -.4 + Math.sin(t * 2.4) * .2; }
      h.tete.rotation.x = Math.sin(t * 4.1) * .045; h.tete.rotation.y = Math.sin(t * 1.3) * .08;
    } else {
      h.corps.rotation.z = Math.sin(t * .5) * .014; h.tete.rotation.y = Math.sin(t * .23) * .22 * Math.sin(t * .11); h.tete.rotation.x = Math.sin(t * .31) * .03;
    }
  } else h.corps.rotation.z = 0;
}

const PNJ = {};
function pnj(id, nom, o, x, z, rot = 0, quand = 'jour') {
  const h = humain(o); h.g.position.set(x, H(x, z), z); h.g.rotation.y = rot; scene.add(h.g);
  return (PNJ[id] = { id, nom, h, pos: h.g.position, quand, v: 0, base: { x, z, rot }, trajet: null, ti: 0, attente: 0, repliques: null });
}
const TURI = { manches: true, chemise: 0xe9e1cc, gilet: 0x3e2e22, pantalon: 0x383029, chapeau: 'coppola', chapeauC: 0x56503f, cheveux: 0x22180f, peau: 0xc68e62 };
pnj('pippo', 'Zu Pippo', { vieux: true, manches: true, chemise: 0xe0d6bf, pantalon: 0x5a4a38, chapeau: 'paille', chapeauC: 0xcdb27a, moustache: 0xc9c2b4, cheveux: 0xb9b2a4, peau: 0xae7650, ceinture: 0x7a2a22 }, 63, 56, -PI / 2);
pnj('rosa', 'Donna Rosa', { robe: 0x1a1717, chemise: 0x1f1b1b, chapeau: 'scialle', chapeauC: 0x141212, peau: 0xd6a582 }, 72, 45.5, 0, 'toujours');
pnj('nunzio', 'Mastro Nunzio', { chemise: 0xe8e0cc, gilet: 0x3b4a5a, tablier: true, chauve: true, moustache: 0x2a2018, pantalon: 0x4a3f33, taille: 1.04, peau: 0xc8946a }, -75, -59.4, PI);
pnj('pretre', 'Padre Calogero', { robe: 0x121212, chemise: 0x121212, chapeau: 'pretre', chapeauC: 0x121212, peau: 0xc89a72 }, -80, -82, 0);
pnj('toto', 'Le voleur', { chemise: 0xb8a77f, pantalon: 0x5e5040, taille: .8, cheveux: 0x2a1d12, cassette: true }, 66, 69, PI, 'scene');
pnj('nardo', 'Nardo', { foulard: 0x8e1f1a, veste: 0x3f4a33, chemise: 0xd9cfb8, pantalon: 0x2e2a24, chapeau: 'coppola', chapeauC: 0x2a2620, moustache: true, lupara: true, lanterne: true, peau: 0xb8805a }, 50, 49, PI / 2, 'scene');
pnj('campiere1', 'Un campiere', { veste: 0x4a3a2a, pantalon: 0x2e2a24, chapeau: 'coppola', chapeauC: 0x33302a, lupara: true }, 49, 46, PI / 2, 'scene');
pnj('campiere2', 'Un campiere', { foulard: 0x2a3a5a, veste: 0x3a3a30, pantalon: 0x2e2a24, chapeau: 'feutre', chapeauC: 0x2a2620, lupara: true, barbe: 0x1e1712 }, 49.5, 53, PI / 2, 'scene');
pnj('ruffo', 'Le brigadier Ruffo', { veste: 0x1d2433, chemise: 0x1d2433, pantalon: 0x1d2433, chapeau: 'lucerna', moustache: 0x5a3a20, cheveux: 0x5a3a20, peau: 0xd9ad88, ceinture: 0xe8e2d0 }, -97, -70, PI / 2, 'scene');
pnj('gardien1', 'Un campiere', { veste: 0x3f3a2a, pantalon: 0x2e2a24, chapeau: 'coppola', lupara: true }, 122, -34, 0);
pnj('gardien2', 'Un campiere', { veste: 0x2f3a33, pantalon: 0x2e2a24, chapeau: 'feutre', lupara: true }, 128, -34, 0);
const DIRES = [
  'Garibaldi est passé, les impôts sont restés.',
  'Les Piémontais veulent nos fils pour leur armée. Mon neveu s’est caché dans la montagne.',
  'Santa Rosalia, protège-nous de la sécheresse…',
  'Ne traîne pas sur la route de la masseria, garçon.',
  'Le citron part pour l’Amérique, maintenant. Des bateaux entiers, depuis le port de Palerme.',
  'À Palerme ils disent que le roi est à Turin. Turin, c’est où ?',
  'L’eau, c’est Don Gaspare qui décide quand elle coule. Tout le monde le sait.',
  'Mon père dit qu’avant, il n’y avait pas de « gardiens ». Seulement des voleurs.'
];
const HABITS = [{ chemise: 0xe2d8c0, gilet: 0x5a3a2a, chapeau: 'coppola' }, { chemise: 0xd8c8a8, chapeau: 'paille', chapeauC: 0xc8ab70 }, { robe: 0x4a3a52, chapeau: 'scialle', chapeauC: 0x2a2424 }, { robe: 0x6a3a2a, chemise: 0xe6dcc4, cheveux: 0x2a1a10 }, { chemise: 0xcfc3a5, veste: 0x544a3a, chapeau: 'feutre' }, { chemise: 0xe8e0cc, gilet: 0x2e3a4a, chapeau: 'coppola', moustache: true }];
const FIGURANTS = [
  [-86, -64, [[-86, -64], [-70, -66], [-72, -76], [-90, -76]]], [-92, -70, null], [-68, -72, [[-68, -72], [-66, -58], [-94, -58]]], [-78, -78, null],
  [-62, -66, [[-62, -66], [-40, -40], [-20, -12]]], [-95, -66, null], [44.5, 86.5, null], [58.5, 107.5, null], [93.5, 121.5, [[93.5, 121.5], [93.5, 93.5], [100.5, 93.5]]], [-84, -58, null]
];
FIGURANTS.forEach(([x, z, trajet], i) => { const p = pnj('fig' + i, 'Un habitant', Object.assign({ peau: [0xc08a5e, 0xb07a50, 0xd2a07a][i % 3], moustache: i % 4 === 1 }, HABITS[i % HABITS.length]), x, z, R() * 6); p.trajet = trajet; p.repliques = [DIRES[i % DIRES.length]]; p.figurant = true; });

/* ---------- Animaux : hirondelles, poules, chien, chat ---------- */
const VIE = (() => {
  const noir = M('uni:1c1c24'), matAile = new T.MeshStandardMaterial({ color: 0x1c1c24, side: T.DoubleSide, roughness: .7 });
  const aile = new T.BufferGeometry(); aile.setAttribute('position', new T.Float32BufferAttribute([0, 0, -.04, 0, 0, .07, .24, 0, -.07], 3)); aile.computeVertexNormals();
  const corpsO = new T.CapsuleGeometry(.028, .1, 2, 6); corpsO.rotateX(PI / 2);
  const oiseaux = [];
  for (let i = 0; i < 18; i++) {
    const g = new T.Group(), a1 = new T.Mesh(aile, matAile), a2 = new T.Mesh(aile, matAile); a2.scale.x = -1; g.add(new T.Mesh(corpsO, noir), a1, a2); scene.add(g);
    const c = i < 10 ? L.village : L.baglio;
    oiseaux.push({ g, a1, a2, cx: c.x + (R() - .5) * 24, cz: c.z + (R() - .5) * 24, r: 10 + R() * 24, h: 8 + R() * 14, v: (.35 + R() * .45) * (R() < .5 ? -1 : 1), a: R() * 6, ph: R() * 6 });
  }
  const poules = [];
  for (let i = 0; i < 6; i++) {
    const g = new T.Group(), plume = M(i % 3 ? 'uni:8a5a32' : 'uni:ece6da');
    const add = (geo, m, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1, par = g) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.rotation.x = rx; me.scale.set(sx, sy, sz); me.castShadow = true; par.add(me); return me; };
    add(new T.SphereGeometry(.15, 12, 10), plume, 0, .3, 0, 0, 1, .9, 1.35);
    add(new T.ConeGeometry(.09, .22, 8), plume, 0, .42, -.2, -.8);
    const cou = new T.Group(); cou.position.set(0, .36, .14); g.add(cou);
    add(new T.SphereGeometry(.07, 10, 8), plume, 0, .12, .04, 0, 1, 1, 1, cou);
    add(new T.SphereGeometry(.035, 8, 6), M('uni:c8281e'), 0, .19, .05, 0, .5, 1, 1.3, cou);
    add(new T.ConeGeometry(.02, .06, 6), M('uni:e0a830'), 0, .11, .12, PI / 2, 1, 1, 1, cou);
    for (const sx of [-.05, .05]) add(new T.CylinderGeometry(.012, .012, .2, 5), M('uni:d8a030'), sx, .1, 0);
    const x = 61 + R() * 12, z = 51 + R() * 9; g.position.set(x, H(x, z), z); scene.add(g);
    poules.push({ g, cou, cible: null, attente: R() * 3, t: R() * 5 });
  }
  const chien = new T.Group(), pel = M('uni:8a6644'), pelS = M('uni:5a4430');
  const ad = (par, geo, m, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const me = new T.Mesh(geo, m); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); me.scale.set(sx, sy, sz); me.castShadow = true; par.add(me); return me; };
  const tronc_ = ad(chien, new T.CapsuleGeometry(.15, .45, 4, 12), pel, 0, .17, 0, PI / 2, 0, 0, 1.1, 1, .85);
  ad(chien, new T.SphereGeometry(.12, 12, 10), pel, 0, .14, .42, 0, 0, 0, 1, .85, 1.1); ad(chien, new T.CapsuleGeometry(.055, .1, 3, 8), pel, 0, .1, .56, PI / 2);
  ad(chien, new T.SphereGeometry(.025, 8, 6), M('uni:141414'), 0, .11, .63);
  for (const sx of [-.08, .08]) { ad(chien, new T.ConeGeometry(.045, .11, 6), pelS, sx, .23, .4, -.3, 0, sx * 3); ad(chien, new T.CapsuleGeometry(.04, .25, 3, 6), pel, sx * 1.4, .05, .36, PI / 2); }
  const queueC = ad(chien, new T.CapsuleGeometry(.03, .28, 3, 6), pelS, 0, .14, -.42, -1.1);
  chien.position.set(-88.5, H(-88.5, -77), -77); chien.rotation.y = .6; scene.add(chien); CERCLES.push({ x: -88.5, z: -77, r: .5 });
  const chat = new T.Group(), poilC = M('uni:3a3028');
  ad(chat, new T.SphereGeometry(.1, 12, 10), poilC, 0, .1, 0, 0, 0, 0, .9, 1.2, 1.1); ad(chat, new T.SphereGeometry(.065, 12, 10), poilC, 0, .25, .06);
  for (const sx of [-.035, .035]) { ad(chat, new T.ConeGeometry(.022, .05, 4), poilC, sx, .31, .06); ad(chat, new T.SphereGeometry(.009, 6, 5), M('iris:b8a030'), sx * .7, .26, .12); }
  const queueT = new T.Group(); queueT.position.set(0, .05, -.09); chat.add(queueT); ad(queueT, new T.CapsuleGeometry(.014, .22, 3, 6), poilC, 0, -.1, -.04, -.5);
  chat.position.set(36, H(36, 72) + 1.27, 72); chat.rotation.y = 2.6; scene.add(chat);
  return { oiseaux, poules, chien, tronc_, queueC, chat, queueT };
})();
function majVie(dt, s) {
  const nuit = HEURE > 1.45;
  for (const o of VIE.oiseaux) {
    o.g.visible = !nuit; if (nuit) continue;
    o.a += o.v * dt * .9; const x = o.cx + Math.cos(o.a) * o.r, z = o.cz + Math.sin(o.a) * o.r * .7, y = H(o.cx, o.cz) + o.h + Math.sin(o.a * 3 + o.ph) * 2.5;
    o.g.position.set(x, y, z); o.g.rotation.set(0, Math.atan2(-Math.sin(o.a) * o.v, Math.cos(o.a) * o.v * .7), -Math.sign(o.v) * .35);
    const f = Math.sin(s * 18 + o.ph) * .9 * (Math.sin(s * .7 + o.ph) > -.3 ? 1 : .08); o.a1.rotation.z = f; o.a2.rotation.z = -f;
  }
  for (const p of VIE.poules) {
    p.g.visible = !nuit; if (nuit) continue; p.t += dt;
    if (p.attente > 0) { p.attente -= dt; p.cou.rotation.x = Math.max(0, Math.sin(p.t * 9)) * .9; }
    else {
      if (!p.cible) p.cible = { x: 59.5 + R() * 14, z: 49.5 + R() * 11 };
      const dx = p.cible.x - p.g.position.x, dz = p.cible.z - p.g.position.z, l = Math.hypot(dx, dz);
      if (l < .2 || Math.hypot(p.cible.x - 67, p.cible.z - 56) < 1.6) { p.cible = null; p.attente = 1 + R() * 4; }
      else { p.g.position.x += dx / l * .7 * dt; p.g.position.z += dz / l * .7 * dt; p.g.rotation.y = Math.atan2(dx, dz); p.cou.rotation.x = Math.sin(p.t * 14) * .15; }
      p.g.position.y = H(p.g.position.x, p.g.position.z) + Math.abs(Math.sin(p.t * 14)) * .02;
    }
  }
  VIE.tronc_.scale.y = 1 + Math.sin(s * 1.6) * .035; VIE.queueC.rotation.y = Math.sin(s * 9) * .5 * Math.max(0, Math.sin(s * .4));
  VIE.queueT.rotation.y = Math.sin(s * 1.3) * .6;
}

/* ---------- Le carretto sicilien et sa mule ---------- */
function carretto() {
  const g = new T.Group(), jaune = 'bois:e0aa3c', rouge = 'bois:a8382a', bleu = 'bois:2f5a8a', brut = 'bois:7a5a3a';
  const part = (geo, cle, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new T.Mesh(geo, M(cle)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const B = (w, h, d, e = 1.3) => boiteUV(w, h, d, e);
  part(B(1.5, .1, 2.1), jaune, 0, 1.05, 0);
  for (const sx of [-1, 1]) { part(B(.07, .55, 2.1), rouge, sx * .76, 1.38, 0); for (let i = 0; i < 3; i++) part(B(.02, .38, .58), i === 1 ? bleu : jaune, sx * .8, 1.38, -.68 + i * .68); part(B(.09, .06, 2.15), jaune, sx * .77, 1.67, 0); }
  part(B(1.5, .45, .07), rouge, 0, 1.33, -1.05); part(B(1.5, .25, .07), rouge, 0, 1.23, 1.05);
  part(B(.6, .08, .4), brut, 0, 1.47, .72);
  part(B(.12, .3, 1.7), 'bois:3a2a1c', 0, .9, 0);
  const roues = [];
  for (const sx of [-1, 1]) {
    const r = new T.Group(); r.position.set(sx * .9, .75, .1); g.add(r);
    const jante = new T.Mesh(new T.TorusGeometry(.7, .055, 8, 32), M(jaune)); jante.rotation.y = PI / 2; jante.castShadow = true; r.add(jante);
    const fer = new T.Mesh(new T.TorusGeometry(.745, .02, 6, 32), M('fer')); fer.rotation.y = PI / 2; r.add(fer);
    const moyeu = new T.Mesh(new T.CylinderGeometry(.11, .13, .22, 12), M(rouge)); moyeu.rotation.z = PI / 2; r.add(moyeu);
    for (let i = 0; i < 12; i++) { const rai = new T.Mesh(new T.CylinderGeometry(.022, .03, .68, 6), M(rouge)); rai.position.set(0, Math.cos(i * PI / 6) * .34, Math.sin(i * PI / 6) * .34); rai.rotation.x = i * PI / 6; r.add(rai); }
    roues.push(r);
  }
  for (const sx of [-.45, .45]) { const b = part(new T.CylinderGeometry(.04, .05, 3, 8), brut, sx, .98, 2.4, PI / 2 - .05); }
  // La mule : corps en volumes arrondis, harnais rouge et pompon
  const mule = new T.Group(); mule.position.set(0, 0, 3.25); g.add(mule);
  const robe = 'uni:5e4a3a', sombre = 'uni:2e241c';
  const mp = (geo, cle, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(geo, M(cle)); m.position.set(x, y, z); m.rotation.x = rx; m.scale.set(sx, sy, sz); m.castShadow = true; mule.add(m); return m; };
  mp(new T.CapsuleGeometry(.3, .75, 6, 14), robe, 0, 1.22, 0, PI / 2, 1, 1, 1.05);
  mp(new T.CapsuleGeometry(.15, .5, 4, 12), robe, 0, 1.58, .62, .7);
  mp(new T.CapsuleGeometry(.12, .34, 4, 12), robe, 0, 1.75, 1.0, 1.95, 1, 1, 1.1);
  mp(new T.SphereGeometry(.1, 10, 8), sombre, 0, 1.6, 1.16, 0, 1, .9, 1.1);
  for (const sx of [-.07, .07]) mp(new T.ConeGeometry(.045, .3, 8), robe, sx, 2.06, .86, -.25);
  mp(new T.SphereGeometry(.09, 12, 10), 'tissu:c0392b', 0, 2.05, .95, 0, 1, 1.3, 1);
  mp(new T.TorusGeometry(.32, .04, 8, 20), 'cuir:7a2a22', 0, 1.32, .38, .2, 1, 1.15, 1);
  mp(new T.CapsuleGeometry(.04, .5, 4, 8), sombre, 0, 1.05, -.55, -.35);
  const pattes = [];
  for (const [px, pz] of [[-.17, .42], [.17, .42], [-.17, -.42], [.17, -.42]]) { const p = new T.Group(); p.position.set(px, 1.05, pz); mule.add(p); const a = new T.Mesh(new T.CapsuleGeometry(.065, .72, 4, 10), M(robe)); a.position.y = -.5; a.castShadow = true; p.add(a); const s = new T.Mesh(new T.CylinderGeometry(.065, .075, .1, 10), M(sombre)); s.position.y = -.98; p.add(s); pattes.push(p); }
  const caisses = [];
  for (let i = 0; i < 6; i++) { const c = new T.Group(); c.position.set(-.36 + (i % 2) * .72, 1.32, -.85 + Math.floor(i / 2) * .6); g.add(c); const cb = new T.Mesh(boiteUV(.6, .36, .5, 1.3), M('bois:b08858')); cb.castShadow = true; c.add(cb); for (let k = 0; k < 6; k++) { const f = new T.Mesh(GEO.fruit, M('fruit:f0c62c')); f.position.set(-.18 + (k % 3) * .18, .2, -.1 + Math.floor(k / 3) * .2); c.add(f); } caisses.push(c); }
  return { g, roues, pattes, caisses, mule };
}
const GEO = { fruit: new T.SphereGeometry(.09, 10, 8) };
const CHAR = Object.assign(carretto(), { x: 66, z: 51, yaw: -PI / 2, v: 0, nb: 6, cooldown: 0, pas: 0 });
scene.add(CHAR.g);
function placerCharrette(x, z, yaw, nb = CHAR.nb) { CHAR.x = x; CHAR.z = z; CHAR.yaw = yaw; CHAR.v = 0; CHAR.nb = nb; CHAR.caisses.forEach((c, i) => c.visible = i < nb); poserCharrette(); }
function poserCharrette() {
  const f = { x: Math.sin(CHAR.yaw), z: Math.cos(CHAR.yaw) };
  const hAv = H(CHAR.x + f.x * 1.5, CHAR.z + f.z * 1.5), hAr = H(CHAR.x - f.x * 1.2, CHAR.z - f.z * 1.2);
  CHAR.g.position.set(CHAR.x, Math.max(H(CHAR.x, CHAR.z), (hAv + hAr) / 2), CHAR.z);
  CHAR.g.rotation.set(0, CHAR.yaw, 0); CHAR.g.rotateX(-Math.atan2(hAv - hAr, 2.7));
}

/* ---------- Joueur ---------- */
const J = { x: 48, z: 52, yaw: PI / 2, v: 0, endu: 1, epuise: false, dansChar: false, courir: false, h: humain(TURI) };
scene.add(J.h.g);
function placerJoueur(x, z, yaw) { if (J.dansChar) sortirChar(true); J.x = x; J.z = z; J.yaw = yaw; J.v = 0; J.h.g.position.set(x, H(x, z), z); J.h.g.rotation.y = yaw; CAM.yaw = yaw + PI; CAM.pret = false; majHerbe(x, z); }
function monterChar() { J.dansChar = true; J.h.assis = true; CHAR.g.add(J.h.g); J.h.g.position.set(0, .6, .72); J.h.g.rotation.set(0, 0, 0); CAM.libre = 0; SON.sabot(); }
function sortirChar(force) {
  if (!force && Math.abs(CHAR.v) > 1.5) { toast('Arrête d’abord le carretto.'); return; }
  J.dansChar = false; J.h.assis = false; scene.add(J.h.g);
  const c = Math.cos(CHAR.yaw), s = Math.sin(CHAR.yaw); const p = { x: CHAR.x + c * 1.9, z: CHAR.z - s * 1.9 }; resoudre(p, .4);
  J.x = p.x; J.z = p.z; J.yaw = CHAR.yaw; J.v = 0; CHAR.v = 0;
}

/* ---------- Caméra ---------- */
const CAM = { yaw: -PI / 2, pitch: .25, dist: 4.6, libre: 0, secousse: 0, pret: false, cible: new T.Vector3() };
function majCamera(dt) {
  if (etat === 'dialogue' && CINE) {
    CINE.t += dt; const avance = Math.min(.22, CINE.t * .025);
    camera.position.copy(CINE.pos).lerp(CINE.cible, avance / Math.max(.5, CINE.pos.distanceTo(CINE.cible)));
    camera.lookAt(CINE.cible); CAM.cible.copy(CINE.cible);
    const fv = camera.aspect < 1 ? 46 : 30; if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
    if (passeFlou) { passeFlou.enabled = true; passeFlou.uniforms.focus.value = camera.position.distanceTo(CINE.cible); }
    return;
  }
  if (passeFlou) passeFlou.enabled = false;
  const fb = camera.aspect < 1 ? 70 : 55; if (camera.fov !== fb) { camera.fov = fb; camera.updateProjectionMatrix(); }
  const enChar = J.dansChar, px = enChar ? CHAR.x : J.x, pz = enChar ? CHAR.z : J.z;
  CAM.cible.set(px, (enChar ? CHAR.g.position.y + 2.1 : J.h.g.position.y + 1.62), pz);
  CAM.libre -= dt;
  if (enChar && CAM.libre <= 0 && Math.abs(CHAR.v) > .5) CAM.yaw += ecartAngle(CAM.yaw, CHAR.yaw + PI) * Math.min(1, dt * 2.2);
  const d0 = etat === 'dialogue' ? 3.2 : enChar ? 8.5 : CAM.dist, p = clamp(CAM.pitch, -.25, 1.1);
  let d = d0;
  for (let k = 1; k <= 12; k++) { const t = k / 12 * d0; const x = CAM.cible.x + Math.sin(CAM.yaw) * Math.cos(p) * t, z = CAM.cible.z + Math.cos(CAM.yaw) * Math.cos(p) * t, y = CAM.cible.y + Math.sin(p) * t; if (dansBatiment(x, z, y)) { d = Math.max(1.2, t - .6); break; } }
  // Caméra d'épaule : légèrement décalée à droite du personnage
  const ep = enChar ? 0 : .45, ex = Math.cos(CAM.yaw) * ep, ez = -Math.sin(CAM.yaw) * ep;
  const x = CAM.cible.x + Math.sin(CAM.yaw) * Math.cos(p) * d + ex, z = CAM.cible.z + Math.cos(CAM.yaw) * Math.cos(p) * d + ez;
  const y = Math.max(CAM.cible.y + Math.sin(p) * d, H(x, z) + .5);
  const voulu = new T.Vector3(x, y, z);
  if (!CAM.pret) { camera.position.copy(voulu); CAM.pret = true; } else camera.position.lerp(voulu, 1 - Math.exp(-dt * 9));
  if (CAM.secousse > 0) { CAM.secousse -= dt; camera.position.x += (Math.random() - .5) * CAM.secousse; camera.position.y += (Math.random() - .5) * CAM.secousse; }
  camera.lookAt(CAM.cible.x + ex, CAM.cible.y, CAM.cible.z + ez);
}

/* ---------- Heure du jour : soleil, ciel, nuages, brume, étalonnage ---------- */
const AMBIANCES = [
  { elev: 48, azim: 25, turb: 4.5, ray: 1.3, mie: .004, mieG: .8, soleil: 0xfff0d8, si: 3.2, hs: 0xd8e2ea, hg: 0x8a7350, hi: .45, env: .75, brume: 0xcdd0cc, dens: .0024, expo: .62, nuit: 0, chaleur: .32, couv: .58, nClair: 0xffffff, nSombre: 0x9aa0aa, nOpac: .9 },
  { elev: 2.5, azim: 262, turb: 10, ray: 3, mie: .012, mieG: .9, soleil: 0xffa25a, si: 2.6, hs: 0xd0a080, hg: 0x4a3426, hi: .38, env: .7, brume: 0xd6a07a, dens: .0034, expo: .78, nuit: .08, chaleur: .6, couv: .55, nClair: 0xffb27a, nSombre: 0x6a4a5a, nOpac: .95 },
  { elev: -16, azim: 290, turb: 2, ray: .5, mie: .002, mieG: .7, soleil: 0x9db4e8, si: .7, hs: 0x5a6e9e, hg: 0x16161a, hi: .32, env: .9, brume: 0x0e1424, dens: .0085, expo: 1.0, nuit: 1, chaleur: -.35, couv: .6, nClair: 0x2a3550, nSombre: 0x0c1020, nOpac: .7 }
];
let HEURE = 0;
const DIR_ASTRE = new T.Vector3(), LUNE = new T.Vector3(.35, .62, .7).normalize(), _ca = new T.Color(), _cb = new T.Color();
const mixC = (k, a, b, t) => _ca.set(a[k]).lerp(_cb.set(b[k]), t).clone();
function heure(k, forceEnv) {
  HEURE = clamp(k, 0, 2); const i = Math.min(1, Math.floor(HEURE)), t = HEURE - i, a = AMBIANCES[i], b = AMBIANCES[i + 1], L_ = (n) => lerp(a[n], b[n], t);
  const el = T.MathUtils.degToRad(L_('elev')), az = T.MathUtils.degToRad(L_('azim'));
  const sol = new T.Vector3().setFromSphericalCoords(1, PI / 2 - el, az);
  UC.sunPosition.value.copy(sol); UC.turbidity.value = L_('turb'); UC.rayleigh.value = L_('ray'); UC.mieCoefficient.value = L_('mie'); UC.mieDirectionalG.value = L_('mieG');
  const nuit = L_('nuit'); domeNuit.material.uniforms.uNuit.value = lisse(.15, .9, nuit); domeNuit.material.uniforms.uLune.value.copy(LUNE);
  DIR_ASTRE.copy(sol).lerp(LUNE, lisse(.3, .85, nuit)).normalize(); if (DIR_ASTRE.y < .08) DIR_ASTRE.y = .08; DIR_ASTRE.normalize();
  soleil.color.copy(mixC('soleil', a, b, t)); soleil.intensity = L_('si');
  hemi.color.copy(mixC('hs', a, b, t)); hemi.groundColor.copy(mixC('hg', a, b, t)); hemi.intensity = L_('hi');
  scene.environmentIntensity = L_('env');
  scene.fog.color.copy(mixC('brume', a, b, t)); scene.fog.density = L_('dens');
  rendu.toneMappingExposure = L_('expo');
  ETALON.uniforms.uChaleur.value = L_('chaleur');
  const U = nuages.material.uniforms; U.uCouv.value = L_('couv'); U.uSoleil.value.copy(sol.y > -.1 ? sol : LUNE); U.uClair.value.copy(mixC('nClair', a, b, t)); U.uSombre.value.copy(mixC('nSombre', a, b, t)); U.uOpac.value = L_('nOpac');
  matMer.color.set(nuit > .5 ? 0x0c1a24 : 0x1f4a55);
  const nl = clamp((nuit - .1) * 1.6, 0, 1);
  M('verreLum').emissiveIntensity = nl * 2.2; M('lumiere').emissiveIntensity = nl * 6 + .3;
  for (const p of LAMPES) p.intensity = nl * 26;
  POUSSIERE.material.opacity = (1 - nuit) * .55;
  if (forceEnv || Math.abs(HEURE - envHeure) > .045) { envHeure = HEURE; majEnvironnement(); }
  SON.nuit(nuit);
}

/* ---------- Interface ---------- */
const UI = { hud: $('#hud'), objTxt: $('#obj-txt'), objChap: $('#obj-chap'), invite: $('#invite'), toast: $('#toast'), aide: $('#aide'), chrono: $('#chrono'), endu: $('#endurance'), soupcon: $('#soupcon'), dlg: $('#dialogue'), carton: $('#carton'), menu: $('#menu'), panneau: $('#panneau'), fondu: $('#fondu') };
let toastT = 0, aideT = 0;
function toast(msg, danger, ms = 2400) { UI.toast.innerHTML = msg; UI.toast.classList.toggle('danger', !!danger); UI.toast.classList.add('vu'); toastT = ms / 1000; }
function aide(msg, ms = 6000) { UI.aide.innerHTML = msg; UI.aide.classList.add('vu'); aideT = ms / 1000; }
const touche = (clavier, doigt) => tactile ? doigt : clavier;
function fondu(fn, attente = 850) { UI.fondu.classList.add('noir'); setTimeout(() => { fn(); setTimeout(() => UI.fondu.classList.remove('noir'), 120); }, attente); }
let etat = 'menu';
const cinema = on => document.body.classList.toggle('cinema', on);

/* Dialogues : lignes [qui, texte] ou { choix: [[libellé, action], …] } */
let DLG = null;
function dire(lignes, fin) { etat = 'dialogue'; cinema(true); UI.hud.hidden = true; UI.dlg.hidden = false; DLG = { lignes, i: -1, fin, tape: 0, txt: '' }; suivant(); }
function suivant() {
  if (!DLG) return;
  if (DLG.tape < DLG.txt.length) { DLG.tape = DLG.txt.length; UI.dlg.querySelector('.dit').innerHTML = DLG.txt; return; }
  if (DLG.choixOuvert) return;
  DLG.i++;
  if (DLG.i >= DLG.lignes.length) { const f = DLG.fin; fermerDialogue(); f && f(); return; }
  const l = DLG.lignes[DLG.i], choix = $('#choix');
  choix.innerHTML = '';
  if (Array.isArray(l)) {
    const [qui, txt] = l; UI.dlg.querySelector('.qui').textContent = qui; DLG.txt = txt; DLG.tape = 0; UI.dlg.querySelector('.dit').innerHTML = '';
    UI.dlg.querySelector('.suite').hidden = false; tournerVers(qui); parler(qui); cadrer(qui);
  } else {
    if (document.pointerLockElement) document.exitPointerLock();
    DLG.choixOuvert = true; DLG.txt = ''; DLG.tape = 0; UI.dlg.querySelector('.qui').textContent = l.qui || 'Turi'; UI.dlg.querySelector('.dit').innerHTML = l.question || ''; UI.dlg.querySelector('.suite').hidden = true;
    l.choix.forEach(([lib, act], k) => { const b = document.createElement('button'); b.innerHTML = `<span>${k + 1}</span>${lib}`; b.onclick = e => { e.stopPropagation(); SON.note(69 + k * 3, 0, .2); fermerDialogue(); act(); }; choix.appendChild(b); });
    setTimeout(() => choix.querySelector('button') && !tactile && choix.querySelector('button').focus(), 50);
  }
}
function fermerDialogue() { CINE = null; parler(null); if (passeFlou) passeFlou.enabled = false; DLG = null; UI.dlg.hidden = true; $('#choix').innerHTML = ''; cinema(false); if (etat === 'dialogue') { etat = 'jeu'; UI.hud.hidden = false; } }
function majDialogue(dt) { if (!DLG || DLG.tape >= DLG.txt.length) return; DLG.tape = Math.min(DLG.txt.length, DLG.tape + dt * 55); let n = Math.floor(DLG.tape); const t = DLG.txt; if (t.lastIndexOf('<', n) > t.lastIndexOf('>', n)) n = t.indexOf('>', n) + 1; UI.dlg.querySelector('.dit').innerHTML = t.slice(0, n); }
/* Mise en scène des dialogues : champ-contrechamp par-dessus l'épaule (règle des 180°), léger travelling, flou d'arrière-plan */
let CINE = null, INTERLOCUTEUR = null;
function parler(qui) { J.h.parle = qui === 'Turi'; for (const n of Object.values(PNJ)) n.h.parle = !!qui && n.nom === qui && n.h.g.visible; }
const teteMonde = h => { h.g.updateMatrixWorld(true); return h.tete.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, .02, 0)); };
function cadrer(qui) {
  if (J.dansChar) { CINE = null; return; }
  const p = qui === 'Turi' ? null : Object.values(PNJ).find(n => n.nom === qui && n.h.g.visible);
  if (p) INTERLOCUTEUR = p;
  const autre = INTERLOCUTEUR && INTERLOCUTEUR.h.g.visible && dist(INTERLOCUTEUR.pos, J) < 9 ? INTERLOCUTEUR : null;
  if (!autre) { CINE = null; return; }
  if (!p) J.yaw = Math.atan2(autre.pos.x - J.x, autre.pos.z - J.z);
  J.h.g.rotation.y = J.yaw; autre.h.g.rotation.y = autre.regarde ?? Math.atan2(J.x - autre.pos.x, J.z - autre.pos.z);
  const parlant = p ? p.h : J.h, ecoute = p ? J.h : autre.h, A = teteMonde(parlant), B = teteMonde(ecoute);
  const axe = new T.Vector3(autre.pos.x - J.x, 0, autre.pos.z - J.z).normalize(), cote = new T.Vector3(axe.z, 0, -axe.x);
  const vers = A.clone().sub(B).setY(0).normalize();
  const pos = B.clone().addScaledVector(vers, -1.35).addScaledVector(cote, .62).add(new T.Vector3(0, .05, 0));
  if (dansBatiment(pos.x, pos.z, pos.y) || pos.y < H(pos.x, pos.z) + .3) { CINE = null; return; }
  CINE = { pos, cible: A, t: 0 };
}
function tournerVers(nom) {
  const p = Object.values(PNJ).find(n => n.nom === nom && n.h.g.visible); if (!p) return;
  const jx = J.dansChar ? CHAR.x : J.x, jz = J.dansChar ? CHAR.z : J.z;
  p.regarde = Math.atan2(jx - p.pos.x, jz - p.pos.z);
  if (!J.dansChar) J.yaw = Math.atan2(p.pos.x - J.x, p.pos.z - J.z);
}

function carton(sur, titre, corps, fin, note) {
  etat = 'carton'; UI.hud.hidden = true; UI.carton.hidden = false; if (document.pointerLockElement) document.exitPointerLock();
  UI.carton.querySelector('.surtitre').innerHTML = sur; UI.carton.querySelector('h2').innerHTML = titre; UI.carton.querySelector('.corps').innerHTML = corps + (note ? `<p class="note">${note}</p>` : '');
  const c = UI.carton.querySelector('.continuer'); c.classList.remove('vu');
  UI.carton.pret = false; UI.carton.fin = fin;
  setTimeout(() => { UI.carton.pret = true; c.classList.add('vu'); }, 1400);
}
function fermerCarton() { if (!UI.carton.pret) return; UI.carton.hidden = true; const f = UI.carton.fin; UI.carton.fin = null; etat = 'jeu'; UI.hud.hidden = false; f && f(); }
UI.carton.addEventListener('click', fermerCarton);
UI.dlg.addEventListener('click', () => suivant());

/* ---------- Repère d'objectif ---------- */
const repere = new T.Group(); scene.add(repere);
const rayon = new T.Mesh(new T.CylinderGeometry(.35, .35, 40, 12, 1, true), new T.MeshBasicMaterial({ color: 0xe2bd45, transparent: true, opacity: .16, depthWrite: false, fog: false })); rayon.position.y = 20; repere.add(rayon);
const losange = new T.Mesh(new T.OctahedronGeometry(.45), new T.MeshBasicMaterial({ color: 0xe2bd45 })); losange.scale.y = 1.5; repere.add(losange);

/* ---------- Interactions ---------- */
const INTER = [];
function inter(o) { INTER.push(o); }
let interProche = null;
function chercherInteraction() {
  interProche = null; if (etat !== 'jeu') return;
  const px = J.dansChar ? CHAR.x : J.x, pz = J.dansChar ? CHAR.z : J.z; let best = 1e9;
  for (const it of INTER) { if (!it.si()) continue; const p = it.pos(); const d = Math.hypot(p.x - px, p.z - pz); if (d < it.r && d < best) { best = d; interProche = it; } }
  if (J.dansChar) interProche = { lib: () => 'Descendre', faire: () => sortirChar(), touche: 'F' };
  if (interProche) { UI.invite.hidden = false; UI.invite.innerHTML = tactile ? interProche.lib() : `<kbd>${interProche.touche || 'E'}</kbd>${interProche.lib()}`; } else UI.invite.hidden = true;
}
function agir() {
  if (etat === 'carton') return fermerCarton();
  if (etat === 'dialogue') return suivant();
  if (etat !== 'jeu' || !interProche) return;
  interProche.faire();
}

/* ---------- Son (fabriqué : cordes pincées, cigales, grillons) ---------- */
const SON = {
  ctx: null, actif: SAUVE.son !== false, cache: new Map(),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const c = this.ctx; this.maitre = c.createGain(); this.maitre.gain.value = this.actif ? .9 : 0; this.maitre.connect(c.destination);
    this.musique = c.createGain(); this.musique.gain.value = .5; this.musique.connect(this.maitre);
    const n = c.sampleRate * 2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); let br = 0; for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; this.bruitBuf = b;
    const brun = c.createBuffer(1, n, c.sampleRate), db = brun.getChannelData(0); for (let i = 0; i < n; i++) { br = (br + .02 * (Math.random() * 2 - 1)) / 1.02; db[i] = br * 3.5; }
    const src = (buf) => { const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; };
    // Cigales : bruit filtré, pulsé
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 5600; bp.Q.value = 5;
    this.cigales = c.createGain(); this.cigales.gain.value = 0; const puls = c.createGain(); puls.gain.value = .5;
    const lfo = c.createOscillator(); lfo.frequency.value = 21; const lfoG = c.createGain(); lfoG.gain.value = .5; lfo.connect(lfoG).connect(puls.gain); lfo.start();
    src(b).connect(bp).connect(puls).connect(this.cigales).connect(this.maitre);
    // Grillons : sifflement aigu haché
    const osc = c.createOscillator(); osc.frequency.value = 4300; const g1 = c.createGain(); g1.gain.value = 0;
    const l1 = c.createOscillator(); l1.type = 'square'; l1.frequency.value = 28; const l1g = c.createGain(); l1g.gain.value = .5; l1.connect(l1g).connect(g1.gain);
    const g2 = c.createGain(); g2.gain.value = 0; const l2 = c.createOscillator(); l2.type = 'square'; l2.frequency.value = 1.3; const l2g = c.createGain(); l2g.gain.value = .5; l2.connect(l2g).connect(g2.gain);
    this.grillons = c.createGain(); this.grillons.gain.value = 0; osc.connect(g1).connect(g2).connect(this.grillons).connect(this.maitre); osc.start(); l1.start(); l2.start();
    // Vent
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const vent = c.createGain(); vent.gain.value = .07; src(brun).connect(lp).connect(vent).connect(this.maitre);
    this.nuit(this.valNuit || 0);
  },
  basculer() { this.actif = !this.actif; SAUVE.son = this.actif; sauver(); if (this.maitre) this.maitre.gain.setTargetAtTime(this.actif ? .9 : 0, this.ctx.currentTime, .1); return this.actif; },
  nuit(n) { this.valNuit = n; if (!this.ctx) return; const t = this.ctx.currentTime; this.cigales.gain.setTargetAtTime(etat === 'menu' ? 0 : .045 * (1 - n), t, .8); this.grillons.gain.setTargetAtTime(etat === 'menu' ? 0 : .012 * n, t, .8); },
  corde(f) {
    const k = Math.round(f * 10); if (this.cache.has(k)) return this.cache.get(k);
    const c = this.ctx, sr = c.sampleRate, n = Math.round(sr * 1.8), N = Math.max(2, Math.round(sr / f)), b = c.createBuffer(1, n, sr), d = b.getChannelData(0), z = new Float32Array(N);
    for (let i = 0; i < N; i++) z[i] = Math.random() * 2 - 1;
    let j = 0; for (let i = 0; i < n; i++) { const a = z[j], s = z[(j + 1) % N]; z[j] = (a + s) * .4985; d[i] = a; j = (j + 1) % N; }
    this.cache.set(k, b); return b;
  },
  note(midi, quand = 0, vol = .22, dest) { if (!this.ctx) return; const s = this.ctx.createBufferSource(), g = this.ctx.createGain(); s.buffer = this.corde(440 * Math.pow(2, (midi - 69) / 12)); g.gain.value = vol; s.connect(g).connect(dest || this.musique); s.start(this.ctx.currentTime + quand); },
  theme() {
    if (!this.ctx) return; const e = .19;
    const mel = [[69, 1], [72, 1], [76, 1], [74, 2], [72, 1], [71, 1], [72, 1], [74, 1], [76, 3], [77, 1], [76, 1], [74, 1], [72, 2], [71, 1], [69, 1], [71, 1], [72, 1], [68, 3], [69, 1], [72, 1], [76, 1], [81, 2], [79, 1], [77, 1], [76, 1], [74, 1], [76, 3], [72, 1], [71, 1], [68, 1], [69, 6]];
    let t = 0;
    for (const [m, d] of mel) { if (d >= 3) { for (let k = 0; k < d * 2; k++) this.note(m, t + k * e / 2, k ? .1 : .22); } else this.note(m, t, .22); t += d * e; }
    const basse = [45, 52, 45, 52, 50, 45, 40, 52, 45, 52, 53, 48, 50, 45, 40, 45]; basse.forEach((m, i) => { this.note(m, i * 3 * e, .3); this.note(m + 12, i * 3 * e + e, .1); this.note(m + 7, i * 3 * e + 2 * e, .1); });
  },
  sabot() { if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruitBuf; f.type = 'bandpass'; f.frequency.value = 900 + Math.random() * 500; f.Q.value = 3; const t = c.currentTime; g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .08); s.connect(f).connect(g).connect(this.maitre); s.start(t, Math.random()); s.stop(t + .1); },
  choc() { if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.bruitBuf; f.type = 'lowpass'; f.frequency.value = 500; const t = c.currentTime; g.gain.setValueAtTime(.8, t); g.gain.exponentialRampToValueAtTime(.001, t + .4); s.connect(f).connect(g).connect(this.maitre); s.start(t); s.stop(t + .45); },
  bien() { this.note(76, 0, .2); this.note(81, .12, .2); },
  cueille() { this.note(84 + ((Math.random() * 3) | 0) * 2, 0, .16); },
  alerte() { this.note(62, 0, .3); this.note(63, 0, .3); this.note(50, .05, .35); },
  rate() { this.note(57, 0, .25); this.note(56, .22, .25); this.note(52, .44, .3); }
};

/* ---------- Histoire du chapitre I ---------- */
const TXT = {
  intro: `<p>Mai 1860 : Garibaldi et ses Mille débarquent à Marsala. Un an plus tard, la Sicile appartient au nouveau royaume d’Italie.</p>
<p>Autour de Palerme, dans la plaine qu’on appelle la Conca d’Oro, la « conque d’or », les jardins de citronniers comptent parmi les terres les plus riches d’Europe. Le citron sicilien part par bateaux entiers vers Londres et New York.</p>
<p>Là où il y a tant de richesse et si peu d’État, des hommes ont compris qu’on pouvait vendre une chose que chacun craint de perdre : la tranquillité.</p>`,
  noteIntro: 'Turi, sa famille et les gens de Santa Lucia sont inventés. Le contexte historique est réel.',
  histoire: `<ul>
<li>En 1863, une pièce de théâtre jouée à Palerme, <i>I mafiusi di la Vicaria</i>, rend populaire le mot « mafia ».</li>
<li>En 1876, Leopoldo Franchetti enquête en Sicile. Dans les jardins d’agrumes autour de Palerme, il décrit une véritable « industrie de la violence » : des gardiens qui organisent eux-mêmes les vols pour vendre ensuite leur protection.</li>
<li>L’eau des canaux d’irrigation, indispensable aux citronniers, était l’un de leurs moyens de pression.</li>
<li>Turi, Donna Rosa, Don Gaspare et le village de Santa Lucia sont inventés.</li>
</ul>`
};
const FINS = {
  silence: { titre: 'Le silence', texte: `<p>Donna Rosa a payé. Cette saison-là, plus rien n’a disparu du jardin, et l’eau est revenue dans les rigoles.</p><p>Les hommes de Don Gaspare sont devenus les « gardiens » de Sant’Anna. Une part de chaque récolte est partie vers la masseria sur la colline, et personne à Santa Lucia n’en a jamais parlé.</p><p>Un soir de l’année suivante, Nardo est revenu au baglio. Pas pour l’argent. Pour Turi.</p>` },
  temoin: { titre: 'Le témoin', texte: `<p>Turi a signé. Le brigadier Ruffo a ouvert un dossier, le premier au nom de Don Gaspare.</p><p>Trois semaines plus tard, le canal qui irriguait Sant’Anna a été coupé et les citronniers ont commencé à sécher. Personne n’est venu témoigner aux côtés de Turi. Le dossier a été classé, faute de preuves.</p><p>Mais il existe, quelque part dans un carton à Palerme. Et il porte un nom.</p>` },
  peur: { titre: 'La peur', texte: `<p>Turi n’a pas signé. Le brigadier a refermé son registre sans un mot.</p><p>Sur le chemin du retour, à l’entrée du baglio, une lanterne l’attendait. Nardo souriait.</p><p>Il savait déjà.</p>` }
};
const CHAPITRES = [
  { n: 'I', nom: 'Conca d’Oro', lieu: 'Sicile, 1861 — les jardins de citronniers de Palerme', jouable: true },
  { n: 'II', nom: 'Les mines de Buggerru', lieu: 'Sardaigne, 1904 — une grève de mineurs qui va secouer tout le pays' },
  { n: 'III', nom: 'Le Préfet de fer', lieu: 'Sicile, 1926 — Cesare Mori fait assiéger le village de Gangi' },
  { n: 'IV', nom: 'L’été 1943', lieu: 'Sicile, 1943 — les Alliés débarquent, d’anciens maîtres reviennent' },
  { n: 'V', nom: 'Aspromonte', lieu: 'Calabre, 1977 — les années des enlèvements' },
  { n: 'VI', nom: 'L’été 1992', lieu: 'Palerme, 1992 — Capaci, via D’Amelio, et une ville qui dit non' },
  { n: 'VII', nom: 'Gioia Tauro', lieu: 'Calabre, aujourd’hui — le port, et les terres rendues aux habitants' }
];

// Citrons à cueillir : huit arbres des rangées du sud
const CUEILLETTE = [[2, 5], [4, 7], [6, 4], [7, 8], [9, 6], [10, 3], [12, 7], [13, 5]].map(([i, j]) => {
  const t = CITRONNIERS.find(c => Math.round((c.x - 34) / 7) === i && Math.round((c.z - 76) / 7) === j) || CITRONNIERS[i * 10 + j];
  const g = new T.Group(); g.position.set(t.x + 1.25, H(t.x, t.z) + 1.5, t.z); scene.add(g);
  for (let k = 0; k < 3; k++) { const f = new T.Mesh(GEO.fruit, new T.MeshBasicMaterial({ color: new T.Color(3.2, 2.6, .7) })); f.scale.setScalar(1.6); f.position.set((k - 1) * .16, (k % 2) * .12, 0); g.add(f); }
  const halo = new T.Mesh(new T.SphereGeometry(.45, 10, 8), new T.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .25, depthWrite: false })); g.add(halo);
  return { g, x: g.position.x, z: g.position.z, pris: false };
});
let nbCueillis = 0;
const resteCueillette = () => CUEILLETTE.filter(c => !c.pris);

let ETAPE = null, chrono = null, distRetour = 1, FIGE = false;
const fige = () => { FIGE = true; };
const VOL = { pts: [[66, 69], [65.5, 79.5], [65.5, 100.5], [86.5, 100.5], [86.5, 121.5], [107.5, 121.5], [107.5, 142.5], [112, 160], [125, 185], [140, 205]], i: 1, parti: false, t: 0, pause: 0 };
const PATROUILLES = [];
let soupcon = 0;

function visibles(nuit) {
  for (const n of Object.values(PNJ)) {
    if (n.quand === 'scene') continue;
    n.h.g.visible = n.quand === 'toujours' || (n.quand === 'jour' && !nuit);
  }
}
function scene_(ids, on) { for (const id of ids) PNJ[id].h.g.visible = on; }
function poserPnj(id, x, z, rot) { const p = PNJ[id]; p.pos.set(x, H(x, z), z); p.h.g.rotation.y = rot ?? p.h.g.rotation.y; p.regarde = null; p.v = 0; }
function preparerPatrouilles(on) {
  for (const p of PATROUILLES) { p.h.g.visible = on; p.cone.visible = on; }
}

const ETAPES = {
  intro: {
    setup() { heure(.05); visibles(false); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); preparerPatrouilles(false); poserPnj('rosa', 72, 45.5, 0); poserPnj('pippo', 63, 56, -PI / 2); placerCharrette(66, 51, -PI / 2, 6); placerJoueur(46, 52, PI / 2); CUEILLETTE.forEach(c => { c.pris = false; c.g.visible = true; }); nbCueillis = 0; },
    debut() { carton('Chapitre I', 'Conca d’Oro<br>Sicile, 1861', TXT.intro, () => aller('pippo'), TXT.noteIntro); SON.theme(); }
  },
  pippo: {
    obj: () => 'Rejoins <b>Zu Pippo</b> dans la cour du baglio Sant’Anna.', cible: () => PNJ.pippo.pos,
    setup() { ETAPES.intro.setup(); },
    debut() { aide(touche('<b>ZQSD</b> ou <b>flèches</b> pour marcher · <b>souris</b> pour regarder (clique pour la capturer) · <b>Maj</b> pour courir · <b>E</b> pour parler', 'Pouce gauche pour marcher · glisse à droite pour regarder · bouton <b>Agir</b> pour parler'), 9000); }
  },
  cueillir: {
    obj: () => `Cueille les citrons mûrs dans les rangées du sud : <b>${nbCueillis}/8</b>`,
    cible: () => { let best = null, bd = 1e9; for (const c of resteCueillette()) { const d = dist(c, J); if (d < bd) { bd = d; best = c; } } return best; },
    setup() { ETAPES.intro.setup(); placerJoueur(52, 62, PI); },
    debut() { aide(`Approche-toi d’un citron qui brille et ${touche('appuie sur <b>E</b>', 'touche <b>Agir</b>')}.`, 6000); }
  },
  rapporter: { obj: () => 'Rapporte la récolte à <b>Zu Pippo</b>.', cible: () => PNJ.pippo.pos, setup() { ETAPES.intro.setup(); CUEILLETTE.forEach(c => { c.pris = true; c.g.visible = false; }); nbCueillis = 8; placerJoueur(65.5, 79.5, 0); } },
  monter: {
    obj: () => 'Monte sur le <b>carretto</b> chargé de citrons.', cible: () => ({ x: CHAR.x, z: CHAR.z }),
    setup() { ETAPES.rapporter.setup(); placerCharrette(66, 51, -PI / 2, 6); placerJoueur(63.5, 53, PI / 2); },
    debut() { aide(`${touche('Appuie sur <b>F</b> (ou <b>E</b>)', 'Touche <b>Agir</b>')} près du carretto pour monter.`, 5000); }
  },
  livrer: {
    reprise: 'monter',
    obj: () => `Livre les citrons à <b>Mastro Nunzio</b>, au marché de Santa Lucia. Cagettes : <b>${CHAR.nb}/6</b>`, cible: () => L.marche,
    debut() { chrono = { reste: 85, echec: 'Midi a sonné : les citrons de Bagheria sont arrivés au marché et le prix s’est effondré.' }; aide(touche('<b>Z / ↑</b> avancer · <b>S / ↓</b> freiner, reculer · <b>Q D</b> tourner. Chaque choc fait tomber une cagette.', 'Pouce gauche : haut pour avancer, côtés pour tourner. Chaque choc fait tomber une cagette.'), 7000); },
    maj() {
      if (CHAR.nb <= 0) return echec('Toutes les cagettes sont tombées sur la route.', 'monter');
      if (J.dansChar && dist(CHAR, L.marche) < 9 && Math.abs(CHAR.v) < 3) {
        fige(); chrono = null; CHAR.v = 0; sortirChar(true); placerJoueur(-75, -64.5, 0);
        const n = CHAR.nb, prix = n * 4;
        SAUVE.tari = prix; sauver();
        dire([
          ['Mastro Nunzio', n === 6 ? 'Six cagettes de Sant’Anna ! Donna Rosa a toujours les plus beaux citrons de la Conca.' : `${n} cagettes seulement ? Tu as semé le reste sur la route, figlio mio ?`],
          ['Mastro Nunzio', `Ça fait ${prix} tarì… moins la part.`],
          ['Turi', 'Quelle part ?'],
          ['Mastro Nunzio', '<em>(Il baisse la voix.)</em> Celle de Don Gaspare. Depuis ce printemps, tout ce qui se vend sur cette place paie sa part. Ses campieri gardent les routes, à ce qu’il paraît.'],
          ['Turi', 'Ils les gardent contre qui ?'],
          ['Mastro Nunzio', 'Contre les voleurs. Ceux qu’ils ne connaissent pas.'],
          ['Mastro Nunzio', 'Rentre avant la nuit, Turi. Et ce que je viens de te dire, je ne l’ai pas dit.']
        ], () => { CHAR.nb = 0; CHAR.caisses.forEach(c => c.visible = false); aller('retour'); });
      }
    }
  },
  retour: {
    obj: () => 'Rentre au <b>baglio Sant’Anna</b> avant la nuit.', cible: () => L.porte,
    setup() { ETAPES.intro.setup(); CUEILLETTE.forEach(c => { c.pris = true; c.g.visible = false; }); placerCharrette(-68, -66, PI / 2.2, 0); placerJoueur(-72, -64, PI / 2); heure(.3); },
    debut() { distRetour = Math.max(60, dist(J.dansChar ? CHAR : J, L.porte)); },
    maj() {
      const ici = J.dansChar ? CHAR : J, d = dist(ici, L.porte);
      heure(lerp(.3, 1, clamp(1 - (d - 16) / distRetour, 0, 1)));
      if (d < 16) {
        fige();
        if (J.dansChar) { CHAR.v = 0; sortirChar(true); }
        placerCharrette(48, 56, 0, 0); placerJoueur(52, 50.5, PI / 2);
        poserPnj('rosa', 58.5, 49.5, -PI / 2); poserPnj('pippo', 59, 52.5, -PI / 2);
        heure(1);
        dire([
          ['Donna Rosa', 'Turi ! La cassette ! Quelqu’un est entré par le jardin pendant que Pippo était à la source !'],
          ['Zu Pippo', 'Là-bas, derrière le mur du sud, entre les rangées ! Il court vers la colline !']
        ], () => aller('poursuite'));
      }
    }
  },
  poursuite: {
    obj: () => 'Rattrape le <b>voleur</b> !', cible: () => PNJ.toto.pos,
    setup() { ETAPES.retour.setup(); heure(1); placerCharrette(48, 56, 0, 0); placerJoueur(52, 50.5, PI); poserPnj('rosa', 58.5, 49.5, -PI / 2); poserPnj('pippo', 59, 52.5, -PI / 2); },
    prep() { VOL.i = 1; VOL.parti = false; VOL.t = 0; VOL.pause = 0; poserPnj('toto', VOL.pts[0][0], VOL.pts[0][1], PI); PNJ.toto.nom = 'Le voleur'; scene_(['toto'], true); J.endu = 1; },
    debut() { aide(`${touche('Maintiens <b>Maj</b>', 'Maintiens <b>Courir</b>')} pour sprinter. Coupe par les rangées pour le rattraper.`, 6000); },
    maj(dt) {
      const p = PNJ.toto, d = dist(p.pos, J);
      if (!VOL.parti && d < 20) { VOL.parti = true; toast('Il t’a vu !'); }
      if (VOL.parti) {
        VOL.t += dt;
        if (VOL.pause > 0) { VOL.pause -= dt; p.v = 0; p.regarde = Math.atan2(J.x - p.pos.x, J.z - p.pos.z); }
        else {
          const c = VOL.pts[VOL.i]; const dx = c[0] - p.pos.x, dz = c[1] - p.pos.z, l = Math.hypot(dx, dz), v = 5.3;
          if (l < .6) { VOL.i++; if (VOL.i >= VOL.pts.length) return echec('Le voleur s’est enfui dans la colline.', 'poursuite'); }
          else { p.pos.x += dx / l * v * dt; p.pos.z += dz / l * v * dt; p.pos.y = H(p.pos.x, p.pos.z); p.h.g.rotation.y = Math.atan2(dx, dz); p.v = v; p.regarde = null; }
          if (VOL.t > 6.5) { VOL.t = 0; VOL.pause = .9; }
        }
      }
      if (d < 1.7) {
        fige(); p.v = 0; SON.bien();
        PNJ.toto.nom = 'Totò';
        dire([
          ['Totò', 'Lâche-moi ! Lâche-moi, je te la rends, ta cassette !'],
          ['Turi', 'Mais tu es un gamin… Qui t’envoie ?'],
          ['Totò', 'Personne.'],
          ['Turi', 'Qui ?'],
          ['Totò', '…Les hommes de la masseria. Ils m’ont dit de la prendre et de la cacher dans les figuiers. Qu’ensuite ils la rapporteraient eux-mêmes à ta patronne, et qu’elle serait bien contente d’avoir des gardiens.'],
          ['Totò', 'Ne dis pas que c’est moi. Ils savent où dort ma mère.']
        ], () => fondu(() => { scene_(['toto'], false); aller('cassette'); }));
      } else if (VOL.parti && d > 50) echec('Le voleur s’est enfui dans la colline.', 'poursuite');
    }
  },
  cassette: {
    obj: () => 'La nuit est tombée. Rapporte la cassette au <b>baglio</b>.', cible: () => L.porte,
    setup() { ETAPES.poursuite.setup(); placerJoueur(86, 118, 0); },
    prep() {
      heure(1.75); visibles(true); poserPnj('rosa', 57.8, 49.5, -PI / 2); scene_(['pippo'], true); poserPnj('pippo', 58, 52.8, -PI / 2);
      scene_(['nardo', 'campiere1', 'campiere2'], true); poserPnj('nardo', 52, 49.5, PI / 2); poserPnj('campiere1', 49.5, 47, PI / 2); poserPnj('campiere2', 49.8, 53, PI / 2);
    },
    maj() {
      if (dist(J, L.porte) < 8) {
        fige(); placerJoueur(55.2, 51.3, -PI / 2); heure(2);
        dire([
          ['Nardo', 'Bonsoir, Donna Rosa. On nous a dit que vous aviez eu des ennuis, cet après-midi.'],
          ['Donna Rosa', 'Les nouvelles vont vite, Nardo.'],
          ['Nardo', 'C’est notre métier, de savoir. Un jardin comme le vôtre, sans gardien… c’est une tentation. Don Gaspare propose de veiller sur Sant’Anna. Pour une part de chaque récolte. Un prix honnête.'],
          ['Nardo', 'Et l’eau de la source coulera comme avant. Elle baisse, en ce moment, non ?'],
          ['Donna Rosa', 'Turi… Ton père a travaillé ici trente ans. Qu’est-ce que tu en penses ?'],
          { question: '<em>Nardo te regarde. Les deux autres n’ont pas lâché leurs fusils.</em>', choix: [
            ['« Payez, Donna Rosa. On ne discute pas avec ces gens-là. »', () => finir('silence')],
            ['« Ne payez rien. Je vais voir les carabiniers à Santa Lucia. »', () => dire([
              ['Nardo', '<em>(Il rit doucement.)</em> Les carabiniers… Va, alors, Turi Ferrante. Mais les routes sont sombres, la nuit.']
            ], () => fondu(() => aller('caserne')))]
          ] }
        ]);
      }
    }
  },
  caserne: {
    obj: () => 'Rejoins la <b>caserne des carabiniers</b> de Santa Lucia sans te faire repérer.', cible: () => L.porteCaserne,
    setup() { ETAPES.poursuite.setup(); },
    prep() {
      heure(2); visibles(true); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); poserPnj('rosa', 72, 45.5, 0); scene_(['pippo'], false);
      placerJoueur(55, 50, -PI / 2); preparerPatrouilles(true); soupcon = 0;
      PATROUILLES.forEach(p => { p.i = 0; p.t = 0; p.attente = 0; const a = p.pts[0]; p.pos.set(a[0], H(a[0], a[1]), a[1]); });
    },
    debut() { aide('Les campieri patrouillent avec des lanternes. Reste hors de leur lumière et ne cours pas près d’eux. Les champs sont plus sûrs que la route.', 8000); },
    maj(dt) { majPatrouilles(dt); }
  }
};
function aller(id) {
  ETAPE = id; FIGE = false; const e = ETAPES[id]; if (id !== 'intro') { SAUVE.etape = id; sauver(); }
  chrono = null; UI.chrono.hidden = true; UI.soupcon.hidden = id !== 'caserne'; if (id !== 'caserne') preparerPatrouilles(false);
  e.prep && e.prep(); etat = etat === 'carton' || etat === 'dialogue' ? etat : 'jeu';
  if (etat === 'jeu') UI.hud.hidden = false;
  e.debut && e.debut();
  majObjectif();
}
function charger(id) { if (ETAPES[id].reprise) id = ETAPES[id].reprise; etat = 'jeu'; ETAPES[id].setup && ETAPES[id].setup(); aller(id); }
function majObjectif() { const e = ETAPES[ETAPE]; if (!e || !e.obj) return; let t = e.obj(); const c = e.cible && e.cible(); if (c) { const ici = J.dansChar ? CHAR : J; t += ` <span style="color:var(--fumee)">· ${Math.round(dist(ici, c))} m</span>`; } if (UI.objTxt.dataset.t !== t) { UI.objTxt.dataset.t = t; UI.objTxt.innerHTML = t; } }
function echec(msg, id) {
  if (etat === 'transition') return; etat = 'transition'; fige(); chrono = null; SON.rate(); toast(msg, true, 3200);
  setTimeout(() => fondu(() => { charger(id); toast('Dernier point de passage', false, 1800); }), 1400);
}
function finir(cle) {
  etat = 'transition'; fige(); const f = FINS[cle]; if (!SAUVE.fins.includes(cle)) SAUVE.fins.push(cle); SAUVE.etape = null; sauver();
  preparerPatrouilles(false); UI.soupcon.hidden = true;
  fondu(() => {
    SON.theme();
    carton('Fin du chapitre I', f.titre, f.texte, () => carton('Ce que l’histoire retient', 'Sicile, 1861-1876', TXT.histoire, () => carton('À suivre', 'Chapitre II<br>Les mines de Buggerru', `<p>Sardaigne, 1904. Le petit-fils de Turi descend chaque matin dans une mine de zinc, au bord de la mer.</p><p>Fins découvertes : <b>${SAUVE.fins.length} sur 3</b>. Rejoue le chapitre pour faire un autre choix.</p>`, () => retourMenu())));
  }, 900);
}

/* Interactions du chapitre */
inter({ pos: () => PNJ.pippo.pos, r: 2.6, si: () => PNJ.pippo.h.g.visible && (ETAPE === 'pippo' || ETAPE === 'rapporter'), lib: () => 'Parler à Zu Pippo', faire() {
  if (ETAPE === 'pippo') dire([
    ['Zu Pippo', 'Turi ! Finalmente. Le soleil est déjà haut et Mastro Nunzio n’attend personne.'],
    ['Turi', 'J’étais à la source, Zu Pippo. L’eau baisse encore.'],
    ['Zu Pippo', 'L’eau baisse quand quelqu’un veut qu’elle baisse… Laisse.'],
    ['Zu Pippo', 'Va cueillir les derniers citrons mûrs dans les rangées du sud. Huit, les plus beaux. Les jaunes, pas les verts.']
  ], () => aller('cueillir'));
  else dire([
    ['Zu Pippo', 'Bene. Avec ceux de ce matin, ça fait six cagettes.'],
    ['Zu Pippo', 'Prends le carretto et file au marché de Santa Lucia. Mastro Nunzio paie avant midi. Après, les citrons de Bagheria arrivent et le prix tombe.'],
    ['Zu Pippo', 'Et doucement dans les virages. Une cagette renversée, c’est une journée perdue.']
  ], () => aller('monter'));
} });
inter({ pos: () => PNJ.rosa.pos, r: 2.4, si: () => ETAPE === 'pippo' || ETAPE === 'cueillir', lib: () => 'Parler à Donna Rosa', faire() {
  dire([['Donna Rosa', 'Depuis la mort de mon mari, on dit à Palerme qu’une veuve ne sait pas tenir un jardin. Montre-leur le contraire, Turi.']]);
} });
CUEILLETTE.forEach(c => inter({ pos: () => c, r: 2.5, si: () => ETAPE === 'cueillir' && !c.pris, lib: () => 'Cueillir', faire() {
  c.pris = true; c.g.visible = false; nbCueillis++; SON.cueille(); majObjectif();
  if (nbCueillis >= 8) { SON.bien(); toast('Le panier est plein'); aller('rapporter'); }
} }));
inter({ pos: () => CHAR, r: 4.2, touche: 'F', si: () => !J.dansChar && ETAPE !== 'poursuite' && ETAPE !== 'cassette', lib: () => 'Monter sur le carretto', faire() {
  monterChar(); if (ETAPE === 'monter') aller('livrer');
} });
inter({ pos: () => PNJ.nunzio.pos, r: 2.6, si: () => PNJ.nunzio.h.g.visible && ETAPE !== 'livrer', lib: () => 'Parler à Mastro Nunzio', faire() { dire([['Mastro Nunzio', ETAPE === 'retour' ? 'Tu es encore là ? Rentre, Turi. La nuit, les routes ne sont à personne.' : 'Pas de citrons, pas de tarì. Reviens avec la récolte de Sant’Anna.']]); } });
inter({ pos: () => PNJ.pretre.pos, r: 2.6, si: () => PNJ.pretre.h.g.visible, lib: () => 'Parler au padre', faire() { dire([['Padre Calogero', 'Dieu voit tout, mon fils. Les hommes de cette paroisse, eux, ont appris à ne rien voir.']]); } });
inter({ pos: () => L.porteCaserne, r: 2.6, si: () => ETAPE === 'caserne', lib: () => 'Frapper à la porte', faire() {
  preparerPatrouilles(false); UI.soupcon.hidden = true; scene_(['ruffo'], true); poserPnj('ruffo', -97.6, -71.2, PI / 2); placerJoueur(-95.8, -70.4, -PI / 2);
  dire([
    ['Le brigadier Ruffo', 'Qui frappe à cette heure ?… Entre, garçon. Tu trembles.'],
    ['Turi', 'Les hommes de Don Gaspare ont fait voler la cassette de Donna Rosa, au baglio Sant’Anna, pour lui vendre ensuite leur protection. Le gamin qui l’a prise me l’a dit.'],
    ['Le brigadier Ruffo', 'Je suis arrivé de Turin il y a six mois. Tu es le premier à venir me dire ce que tout le monde ici sait déjà.'],
    ['Le brigadier Ruffo', 'Le gamin témoignera ? Ta patronne ?'],
    ['Turi', '…'],
    ['Le brigadier Ruffo', 'Alors il n’y a que toi. Si tu signes, ton nom sera dans ce registre. Et tout Santa Lucia le saura avant midi.'],
    { question: '<em>Le brigadier tourne le registre vers toi et te tend la plume.</em>', choix: [
      ['Signer.', () => finir('temoin')],
      ['« …Je ne peux pas. »', () => finir('peur')]
    ] }
  ]);
} });
for (const n of Object.values(PNJ)) if (n.figurant) inter({ pos: () => n.pos, r: 2.2, si: () => n.h.g.visible && etat === 'jeu', lib: () => 'Parler', faire() { dire([['Un habitant', n.repliques[0]]]); } });

/* Patrouilles de nuit (étape « caserne ») */
function cone(portee, demi) {
  const v = [], n = 14; for (let i = 0; i < n; i++) { const a = -demi + 2 * demi * i / n, b = -demi + 2 * demi * (i + 1) / n; v.push(0, 0, 0, Math.sin(b) * portee, 0, Math.cos(b) * portee, Math.sin(a) * portee, 0, Math.cos(a) * portee); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: .07, depthWrite: false, side: T.DoubleSide, fog: false })); m.renderOrder = 2; scene.add(m); return m;
}
[[[24, 41], [8, 25]], [[-16, -6], [-33, -42]], [[-46, -60], [-46, -92]], 'rond'].forEach((pts, i) => {
  const rond = pts === 'rond';
  const pp = rond ? Array.from({ length: 10 }, (_, k) => [L.village.x + Math.cos(k / 10 * PI * 2) * 9, L.village.z - 2 + Math.sin(k / 10 * PI * 2) * 9]) : pts;
  const p = pnj('pat' + i, 'Un campiere', { veste: [0x3f3a2a, 0x2f3a33, 0x3a3a30, 0x4a3a2a, 0x353028][i], pantalon: 0x2e2a24, chapeau: i % 2 ? 'feutre' : 'coppola', chapeauC: 0x2a2620, lupara: true, lanterne: true }, pp[0][0], pp[0][1], 0, 'scene');
  p.pts = pp; p.boucle = rond; p.i = 0; p.sens = 1; p.attente = 0; p.portee = rond ? 12 : 15; p.demi = .62;
  p.cone = cone(p.portee, p.demi); p.lumiere = lampe(0, 1.2, .3, p.h.g);
  p.h.g.visible = false; p.cone.visible = false;
  PATROUILLES.push(p);
});
function vueBloquee(a, b) { const d = dist(a, b), n = Math.ceil(d); for (let k = 1; k < n; k++) { const t = k / n, x = lerp(a.x, b.x, t), z = lerp(a.z, b.z, t); if (dansBatiment(x, z, H(x, z) + 1.5)) return true; } return false; }
function majPatrouilles(dt) {
  let vu = false; const ici = J.dansChar ? CHAR : J;
  for (const p of PATROUILLES) {
    const dx = ici.x - p.pos.x, dz = ici.z - p.pos.z, d = Math.hypot(dx, dz);
    const dansCone = d < p.portee && Math.abs(ecartAngle(p.h.g.rotation.y, Math.atan2(dx, dz))) < p.demi && !vueBloquee(p.pos, ici);
    const entendu = (J.courir && J.v > 6 && d < 9) || (J.dansChar && Math.abs(CHAR.v) > 2 && d < 20) || d < 2.2;
    if (dansCone || entendu) {
      vu = true; soupcon += dt * (dansCone ? 1.1 + 1.6 * (1 - d / p.portee) : .9); p.v = 0;
      p.h.g.rotation.y += ecartAngle(p.h.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 3);
    } else if (p.attente > 0) { p.attente -= dt; p.v = 0; }
    else {
      const c = p.pts[p.i], ex = c[0] - p.pos.x, ez = c[1] - p.pos.z, l = Math.hypot(ex, ez), v = 1.4;
      if (l < .4) { if (p.boucle) p.i = (p.i + 1) % p.pts.length; else { p.i += p.sens; if (p.i >= p.pts.length || p.i < 0) { p.sens *= -1; p.i += 2 * p.sens; p.attente = 2.2; } } }
      else { p.pos.x += ex / l * v * dt; p.pos.z += ez / l * v * dt; p.h.g.rotation.y += ecartAngle(p.h.g.rotation.y, Math.atan2(ex, ez)) * Math.min(1, dt * 5); p.v = v; }
    }
    p.pos.y = H(p.pos.x, p.pos.z);
    p.cone.position.set(p.pos.x, p.pos.y + .25, p.pos.z); p.cone.rotation.y = p.h.g.rotation.y;
    p.cone.material.color.setHex(dansCone ? 0xff6a4a : 0xffc860);
  }
  if (!vu) soupcon = Math.max(0, soupcon - dt * .35);
  UI.soupcon.firstElementChild.style.width = Math.min(100, soupcon * 100) + '%';
  if (soupcon >= 1 && etat === 'jeu') {
    SON.alerte(); toast('Repéré !', true, 1600); soupcon = 0; etat = 'dialogue';
    setTimeout(() => dire([['Un campiere', 'Ehi ! Turi Ferrante… Où tu vas comme ça, à cette heure ? Rentre chez toi. Tout de suite.']], () => echec('Les campieri t’ont reconduit au baglio.', 'caserne')), 500);
  }
}

/* ---------- Mise à jour du joueur, du carretto, des passants ---------- */
const STICK = { x: 0, y: 0, id: null, ox: 0, oy: 0 };
let boutonCourir = false;
const K = {};
function entree() {
  let ix = 0, iz = 0;
  if (K.KeyW || K.ArrowUp) iz += 1; if (K.KeyS || K.ArrowDown) iz -= 1; if (K.KeyA || K.ArrowLeft) ix -= 1; if (K.KeyD || K.ArrowRight) ix += 1;
  ix += STICK.x; iz += STICK.y; const m = Math.hypot(ix, iz); if (m > 1) { ix /= m; iz /= m; }
  return { ix, iz, m: Math.min(1, m) };
}
function majJoueur(dt) {
  const { ix, iz, m } = entree();
  const veut = (K.ShiftLeft || K.ShiftRight || boutonCourir) && m > .2;
  if (J.endu <= 0) J.epuise = true; if (J.epuise && J.endu > .35) J.epuise = false;
  J.courir = veut && !J.epuise;
  J.endu = clamp(J.endu + (J.courir ? -dt / 4.5 : dt / 6), 0, 1);
  UI.endu.hidden = J.endu > .995; UI.endu.firstElementChild.style.width = J.endu * 100 + '%';
  const vmax = J.courir ? 7.6 : (STICK.id !== null && m < .65 ? 2.2 : 4.8);
  const fx = -Math.sin(CAM.yaw), fz = -Math.cos(CAM.yaw), rx = -fz, rz = fx;
  const mx = fx * iz + rx * ix, mz = fz * iz + rz * ix;
  J.v = approche(J.v, vmax * (m > .05 ? 1 : 0), dt * 22);
  if (m > .05) { J.yaw += ecartAngle(J.yaw, Math.atan2(mx, mz)) * Math.min(1, dt * 12); const l = Math.hypot(mx, mz) || 1; J.x += mx / l * J.v * dt; J.z += mz / l * J.v * dt; }
  const p = { x: J.x, z: J.z }; resoudre(p, .38, true); J.x = p.x; J.z = p.z;
  J.h.g.position.set(J.x, H(J.x, J.z), J.z); J.h.g.rotation.y = J.yaw;
  animer(J.h, dt, J.v);
}
function majCharrette(dt) {
  if (J.dansChar) {
    const { ix, iz } = entree();
    const cible = iz > 0 ? 8.5 * iz : iz < 0 ? -2.6 * -iz : 0;
    const taux = iz < 0 && CHAR.v > .2 ? 8 : (Math.abs(cible) > Math.abs(CHAR.v) ? 2.8 : 1.6);
    CHAR.v = approche(CHAR.v, cible, taux * dt);
    CHAR.yaw -= ix * 1.35 * dt * clamp(CHAR.v / 3, -1, 1);
    CHAR.x += Math.sin(CHAR.yaw) * CHAR.v * dt; CHAR.z += Math.cos(CHAR.yaw) * CHAR.v * dt;
    const avant = { x: CHAR.x + Math.sin(CHAR.yaw) * 2.8, z: CHAR.z + Math.cos(CHAR.yaw) * 2.8 }, centre = { x: CHAR.x, z: CHAR.z };
    const c1 = resoudre(centre, 1.25, true), a0x = avant.x, a0z = avant.z, c2 = resoudre(avant, .75, true);
    CHAR.x = centre.x + (avant.x - a0x); CHAR.z = centre.z + (avant.z - a0z);
    CHAR.cooldown -= dt;
    if ((c1 || c2) && Math.abs(CHAR.v) > 1) {
      if (Math.abs(CHAR.v) > 4.2 && CHAR.cooldown <= 0 && CHAR.nb > 0 && ETAPE === 'livrer') { CHAR.nb--; CHAR.caisses[CHAR.nb].visible = false; CHAR.cooldown = 1.2; SON.choc(); CAM.secousse = .35; toast('Une cagette est tombée !', true, 1500); majObjectif(); }
      CHAR.v *= .55;
    }
  }
  poserCharrette();
  const tour = CHAR.v * dt / .75; CHAR.roues.forEach(r => r.rotation.x += tour);
  CHAR.pas += Math.abs(CHAR.v) * dt * 1.6;
  const a = Math.sin(CHAR.pas * 2) * Math.min(.6, Math.abs(CHAR.v) / 6);
  CHAR.pattes[0].rotation.x = a; CHAR.pattes[3].rotation.x = a; CHAR.pattes[1].rotation.x = -a; CHAR.pattes[2].rotation.x = -a;
  if (Math.abs(CHAR.v) > .6 && Math.floor(CHAR.pas * 2 / PI) !== CHAR.dernierPas) { CHAR.dernierPas = Math.floor(CHAR.pas * 2 / PI); SON.sabot(); }
}
function majPnj(dt) {
  for (const n of Object.values(PNJ)) {
    if (!n.h.g.visible || n.id.startsWith('pat')) { if (n.id.startsWith('pat') && n.h.g.visible) animer(n.h, dt, n.v); continue; }
    if (n.id === 'toto' && ETAPE === 'poursuite') { animer(n.h, dt, n.v); continue; }
    const proche = dist(n.pos, J) < 3.2 && !J.dansChar;
    if (n.trajet && !proche && etat === 'jeu') {
      if (n.attente > 0) { n.attente -= dt; n.v = 0; }
      else { const c = n.trajet[n.ti], dx = c[0] - n.pos.x, dz = c[1] - n.pos.z, l = Math.hypot(dx, dz); if (l < .5) { n.ti = (n.ti + 1) % n.trajet.length; n.attente = 1.5 + R() * 3; } else { n.pos.x += dx / l * 1.2 * dt; n.pos.z += dz / l * 1.2 * dt; n.h.g.rotation.y += ecartAngle(n.h.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 5); n.v = 1.2; } }
      n.pos.y = H(n.pos.x, n.pos.z);
    } else n.v = 0;
    const vise = n.regarde ?? (proche ? Math.atan2(J.x - n.pos.x, J.z - n.pos.z) : null);
    if (vise != null && n.v === 0) n.h.g.rotation.y += ecartAngle(n.h.g.rotation.y, vise) * Math.min(1, dt * 4);
    animer(n.h, dt, n.v);
  }
}

/* ---------- Mini-carte ---------- */
const CARTE = document.createElement('canvas'); CARTE.width = CARTE.height = 1120;
(() => {
  const c = CARTE.getContext('2d'), k = 2, X = x => (x + 280) * k, Z = z => (z + 280) * k;
  c.fillStyle = '#b9a573'; c.fillRect(0, 0, 1120, 1120);
  for (let x = -280; x < 280; x += 4) for (let z = -280; z < 280; z += 4) { const h = H(x, z); if (h < .2) { c.fillStyle = '#4c6f78'; c.fillRect(X(x), Z(z), 8, 8); } else if (h > 22) { c.fillStyle = 'rgba(110,96,74,.55)'; c.fillRect(X(x), Z(z), 8, 8); } }
  c.fillStyle = '#7f8a4c'; c.fillRect(X(JARDIN.x0), Z(JARDIN.z0), (JARDIN.x1 - JARDIN.x0) * k, (JARDIN.z1 - JARDIN.z0) * k);
  c.fillStyle = '#5e6a36'; for (const t of CITRONNIERS) { c.beginPath(); c.arc(X(t.x), Z(t.z), 2.6, 0, 7); c.fill(); }
  c.strokeStyle = '#e3d1a4'; c.lineCap = c.lineJoin = 'round';
  ROUTES.forEach((r, i) => { c.lineWidth = i === 2 ? 5 : 8; c.beginPath(); r.forEach(([x, z], j) => j ? c.lineTo(X(x), Z(z)) : c.moveTo(X(x), Z(z))); c.stroke(); });
  c.fillStyle = '#d9c8a2'; c.fillRect(X(L.village.x - 18), Z(L.village.z - 14), 36 * k, 28 * k);
  c.fillStyle = '#6e5a46';
  for (const b of BOITES) { if (b.haut < 2) continue; c.save(); c.translate(X(b.x), Z(b.z)); c.rotate(-Math.atan2(b.s, b.c)); c.fillRect(-b.hw * k, -b.hd * k, b.hw * 2 * k, b.hd * 2 * k); c.restore(); }
})();
const mini = $('#minicarte').getContext('2d');
function majMinicarte() {
  const W = 300, ici = J.dansChar ? CHAR : J, fen = 170, k = 2;
  mini.clearRect(0, 0, W, W); mini.save(); mini.beginPath(); mini.arc(W / 2, W / 2, W / 2, 0, 7); mini.clip();
  mini.drawImage(CARTE, (ici.x + 280) * k - fen, (ici.z + 280) * k - fen, fen * 2, fen * 2, 0, 0, W, W);
  const s = W / (fen * 2) * k, P = (x, z) => [W / 2 + (x - ici.x) * s, W / 2 + (z - ici.z) * s];
  if (ETAPE === 'caserne') for (const p of PATROUILLES) { const [x, y] = P(p.pos.x, p.pos.z); mini.fillStyle = '#b8402e'; mini.beginPath(); mini.arc(x, y, 6, 0, 7); mini.fill(); }
  const e = ETAPES[ETAPE], c = e && e.cible && etat === 'jeu' ? e.cible() : null;
  if (c) { let [x, y] = P(c.x, c.z); const dx = x - W / 2, dy = y - W / 2, l = Math.hypot(dx, dy); if (l > W / 2 - 14) { x = W / 2 + dx / l * (W / 2 - 14); y = W / 2 + dy / l * (W / 2 - 14); } mini.fillStyle = '#e2bd45'; mini.strokeStyle = '#15110c'; mini.lineWidth = 3; mini.beginPath(); mini.arc(x, y, 9, 0, 7); mini.fill(); mini.stroke(); }
  const yaw = J.dansChar ? CHAR.yaw : J.yaw;
  mini.translate(W / 2, W / 2); mini.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw)));
  mini.fillStyle = '#fff6e0'; mini.strokeStyle = '#15110c'; mini.lineWidth = 3; mini.beginPath(); mini.moveTo(15, 0); mini.lineTo(-10, 10); mini.lineTo(-5, 0); mini.lineTo(-10, -10); mini.closePath(); mini.stroke(); mini.fill();
  mini.restore();
  mini.fillStyle = '#eee2c8'; mini.font = '600 22px Oswald, sans-serif'; mini.textAlign = 'center'; mini.fillText('N', W / 2, 28);
}

/* ---------- Commandes ---------- */
addEventListener('keydown', e => {
  if (e.repeat && (e.code === 'KeyE' || e.code === 'KeyF' || e.code === 'Space' || e.code === 'Enter')) return;
  K[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && etat !== 'menu') e.preventDefault();
  if (e.code === 'Escape' || e.code === 'KeyP') { if (etat === 'jeu') pause(); else if (etat === 'pause') reprendre(); return; }
  if (etat === 'dialogue' && DLG && DLG.choixOuvert && /^Digit[1-3]$/.test(e.code)) { const b = $('#choix').querySelectorAll('button')[+e.code.slice(5) - 1]; b && b.click(); return; }
  if (e.code === 'KeyE' || e.code === 'KeyF' || ((e.code === 'Space' || e.code === 'Enter') && etat !== 'jeu')) { if (etat === 'dialogue' && DLG && DLG.choixOuvert) return; agir(); }
});
addEventListener('keyup', e => { K[e.code] = false; });
addEventListener('blur', () => { for (const k in K) K[k] = false; });
let souris = false;
toile.addEventListener('mousedown', e => {
  if (etat === 'dialogue') return suivant();
  if (etat === 'carton') return fermerCarton();
  if (etat !== 'jeu') return; souris = true;
  if (!document.pointerLockElement && toile.requestPointerLock) { try { const r = toile.requestPointerLock(); r && r.catch && r.catch(() => {}); } catch (err) { /* refusé : on regarde en glissant */ } }
});
addEventListener('mouseup', () => { souris = false; });
addEventListener('mousemove', e => {
  if (etat !== 'jeu' && etat !== 'dialogue') return;
  if (document.pointerLockElement === toile || souris) { CAM.yaw -= e.movementX * .0028; CAM.pitch = clamp(CAM.pitch + e.movementY * .0022, -.25, 1.1); CAM.libre = 1.5; }
});
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && etat === 'jeu' && !tactile) pause(); });

const regard = { id: null, x: 0, y: 0 };
addEventListener('pointerdown', e => {
  if (e.pointerType !== 'touch') return;
  document.body.classList.add('tactile');
  if (etat !== 'jeu' || e.target.closest('.tbtn')) return;
  if (e.clientX < innerWidth * .45 && STICK.id === null) { STICK.id = e.pointerId; STICK.ox = e.clientX; STICK.oy = e.clientY; const s = $('#stick'); s.style.display = 'block'; s.style.left = e.clientX + 'px'; s.style.top = e.clientY + 'px'; }
  else if (regard.id === null) { regard.id = e.pointerId; regard.x = e.clientX; regard.y = e.clientY; }
});
addEventListener('pointermove', e => {
  if (e.pointerId === STICK.id) { let dx = e.clientX - STICK.ox, dy = e.clientY - STICK.oy; const l = Math.hypot(dx, dy), m = 50; if (l > m) { dx *= m / l; dy *= m / l; } STICK.x = dx / m; STICK.y = -dy / m; $('#stick i').style.transform = `translate(${dx}px,${dy}px)`; }
  else if (e.pointerId === regard.id) { CAM.yaw -= (e.clientX - regard.x) * .006; CAM.pitch = clamp(CAM.pitch + (e.clientY - regard.y) * .004, -.25, 1.1); regard.x = e.clientX; regard.y = e.clientY; CAM.libre = 1.5; }
});
const finDoigt = e => { if (e.pointerId === STICK.id) { STICK.id = null; STICK.x = STICK.y = 0; $('#stick').style.display = 'none'; $('#stick i').style.transform = ''; } if (e.pointerId === regard.id) regard.id = null; };
addEventListener('pointerup', finDoigt); addEventListener('pointercancel', finDoigt);
const tb = (id, bas, haut) => { const b = $(id); b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); b.classList.add('actif'); bas(); }); const fin = () => { b.classList.remove('actif'); haut && haut(); }; b.addEventListener('pointerup', fin); b.addEventListener('pointercancel', fin); b.addEventListener('pointerleave', fin); };
tb('#t-action', agir); tb('#t-courir', () => { boutonCourir = true; }, () => { boutonCourir = false; }); tb('#t-pause', () => { if (etat === 'jeu') pause(); });
if (tactile) document.body.classList.add('tactile');

/* ---------- Menus ---------- */
const COMMANDES = `<div class="touches"><div><h3>Clavier et souris</h3><dl>
<dt>ZQSD · WASD · flèches</dt><dd>Marcher, conduire</dd><dt>Souris</dt><dd>Regarder (clique pour la capturer)</dd><dt>Maj</dt><dd>Sprinter</dd><dt>E</dt><dd>Parler, agir</dd><dt>F</dt><dd>Monter, descendre du carretto</dd><dt>Espace</dt><dd>Faire avancer un dialogue</dd><dt>1 · 2</dt><dd>Choisir une réponse</dd><dt>Échap</dt><dd>Pause</dd></dl></div>
<div><h3>Écran tactile</h3><dl><dt>Pouce gauche</dt><dd>Marcher, conduire</dd><dt>Glisser à droite</dt><dd>Regarder</dd><dt>Agir</dt><dd>Parler, monter, cueillir</dd><dt>Courir</dt><dd>Sprinter (maintenir)</dd><dt>II</dt><dd>Pause</dd></dl></div></div>`;
function panneau(html, boutons) {
  UI.panneau.hidden = false; const b = UI.panneau.querySelector('.boite'); b.innerHTML = html;
  const zone = document.createElement('div'); zone.className = 'actions fermer'; zone.style.display = 'flex'; zone.style.flexDirection = 'column'; zone.style.gap = '10px';
  for (const [lib, fn, sous] of boutons) { const bt = document.createElement('button'); bt.className = 'menu-btn'; bt.innerHTML = lib + (sous ? `<small>${sous}</small>` : ''); bt.onclick = () => { SON.init(); fn(); }; zone.appendChild(bt); }
  b.appendChild(zone);
}
const fermerPanneau = () => { UI.panneau.hidden = true; };
function listeChapitres() {
  const fins = SAUVE.fins.length;
  return `<h2>Chapitres</h2><ul class="chapitres">${CHAPITRES.map(c => `<li class="${c.jouable ? '' : 'verrou'}"><span class="num">${c.n}</span><div><div class="nom">${c.nom}</div><div class="lieu">${c.lieu}</div></div><div class="etat">${c.jouable ? `<button data-jouer="1">Jouer</button>` : 'Bientôt'}</div></li>`).join('')}</ul><p class="note" style="color:var(--fumee);margin-top:16px">Chapitre I : ${fins} fin${fins > 1 ? 's' : ''} découverte${fins > 1 ? 's' : ''} sur 3.</p>`;
}
const NOMS_ETAPES = { pippo: 'Le baglio', cueillir: 'La cueillette', rapporter: 'La cueillette', monter: 'Le marché', livrer: 'Le marché', retour: 'Le retour', poursuite: 'Le voleur', cassette: 'La visite', caserne: 'La nuit' };
function majMenu() {
  const c = $('#m-continuer'); c.hidden = !SAUVE.etape || !ETAPES[SAUVE.etape]; $('#m-ou').textContent = SAUVE.etape ? 'Chapitre I · ' + (NOMS_ETAPES[SAUVE.etape] || '') : '';
  $('#m-son-etat').textContent = SON.actif ? 'activé' : 'coupé'; $('#m-qualite-etat').textContent = Q.nom;
}
function lancer(id) {
  SON.init(); UI.menu.hidden = true; fermerPanneau();
  fondu(() => { charger(id); SON.nuit(SON.valNuit || 0); }, 600);
}
$('#m-nouvelle').onclick = () => lancer('intro');
$('#m-continuer').onclick = () => lancer(SAUVE.etape);
$('#m-chapitres').onclick = () => { SON.init(); panneau(listeChapitres(), [['Retour', fermerPanneau]]); const b = UI.panneau.querySelector('[data-jouer]'); b && (b.onclick = () => lancer('intro')); };
$('#m-commandes').onclick = () => { SON.init(); panneau('<h2>Commandes</h2>' + COMMANDES, [['Retour', fermerPanneau]]); };
$('#m-son').onclick = () => { SON.init(); SON.basculer(); majMenu(); };
$('#m-qualite').onclick = changerQualite;
function changerQualite() { const o = ['haute', 'moyenne', 'basse'], n = o[(o.indexOf(QN) + 1) % 3]; SAUVE.qualite = n; sauver(); toast('Qualité ' + QUALITES[n].nom.toLowerCase() + '…'); setTimeout(() => location.reload(), 300); }
function pause() {
  if (etat !== 'jeu') return; etat = 'pause'; if (document.pointerLockElement) document.exitPointerLock();
  panneau('<h2>Pause</h2>', [
    ['Reprendre', reprendre],
    ['Recommencer l’étape', () => { fermerPanneau(); fondu(() => charger(ETAPE)); }, NOMS_ETAPES[ETAPE] || ''],
    ['Effet pellicule', () => { SAUVE.sansFilm = !SAUVE.sansFilm; sauver(); ETALON.uniforms.uGrain.value = SAUVE.sansFilm ? 0 : .05; ETALON.uniforms.uVignette.value = SAUVE.sansFilm ? .25 : .55; pause2(); }, SAUVE.sansFilm ? 'désactivé' : 'activé'],
    ['Qualité graphique', changerQualite, Q.nom + ' — touche pour changer'],
    ['Son', () => { SON.basculer(); pause2(); }, SON.actif ? 'activé' : 'coupé'],
    ['Commandes', () => panneau('<h2>Commandes</h2>' + COMMANDES, [['Retour', pause2]])],
    ['Quitter vers le menu', () => { fermerPanneau(); retourMenu(); }]
  ]);
}
function pause2() { etat = 'jeu'; pause(); }
function reprendre() { fermerPanneau(); etat = 'jeu'; }
function retourMenu() {
  etat = 'menu'; UI.hud.hidden = true; UI.carton.hidden = true; UI.dlg.hidden = true; cinema(false); preparerPatrouilles(false);
  if (J.dansChar) sortirChar(true);
  heure(1.05); SON.nuit(1); majMenu(); UI.menu.hidden = false;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && etat === 'jeu') pause(); });


/* ---------- Boucle ---------- */
let avant = performance.now(), tMenu = 0, mesure = { t: 0, n: 0, fait: false };
function boucle(now) {
  requestAnimationFrame(boucle);
  const dt = Math.min(.05, (now - avant) / 1000), s = now / 1000; avant = now;
  VENT.uTemps.value = s; nuages.material.uniforms.uTemps.value = s; ETALON.uniforms.uTemps.value = s;
  if (eauNormales.image) eauNormales.offset.set(s * .004, s * .0025);
  if (etat === 'menu') {
    tMenu += dt * .03;
    camera.position.set(-62 + Math.cos(tMenu) * 58, 17 + Math.sin(tMenu * .7) * 3, -58 + Math.sin(tMenu) * 58); camera.lookAt(-80, 7, -74);
    majPnj(dt); CAM.pret = false; repere.visible = false;
  } else {
    if (etat === 'jeu') {
      if (J.dansChar) { majCharrette(dt); animer(J.h, dt, 0); } else { majJoueur(dt); majCharrette(dt); }
      const e = ETAPES[ETAPE]; if (e && e.maj && !FIGE) e.maj(dt);
      if (chrono) { chrono.reste -= dt; UI.chrono.hidden = false; const r = Math.max(0, Math.ceil(chrono.reste)); UI.chrono.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; UI.chrono.classList.toggle('urgent', r <= 15); if (chrono.reste <= 0) echec(chrono.echec, 'monter'); }
      if (!mesure.fait) { mesure.t += dt; mesure.n++; if (mesure.t > 12) { mesure.fait = true; const fps = mesure.n / mesure.t; if (fps < 26 && QN !== 'basse') aide(`L’image saccade (${Math.round(fps)} images/s). Baisse la <b>qualité graphique</b> dans la pause (Échap).`, 9000); } }
    } else if (etat === 'dialogue') { majDialogue(dt); if (!J.dansChar) { J.h.g.rotation.y += ecartAngle(J.h.g.rotation.y, J.yaw) * Math.min(1, dt * 6); animer(J.h, dt, 0); } }
    majPnj(dt);
    majCamera(dt);
    chercherInteraction();
    const e = ETAPES[ETAPE], c = e && e.cible && etat === 'jeu' ? e.cible() : null;
    repere.visible = !!c; if (c) { repere.position.set(c.x, H(c.x, c.z), c.z); losange.position.y = 3.2 + Math.sin(now / 300) * .25; losange.rotation.y = now / 600; }
    CUEILLETTE.forEach((k, i) => { if (k.g.visible) { k.g.children[3].scale.setScalar(1 + Math.sin(now / 250 + i) * .15); } });
    if (etat === 'jeu') { majMinicarte(); majObjectif(); }
    majHerbe(J.dansChar ? CHAR.x : J.x, J.dansChar ? CHAR.z : J.z);
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) UI.toast.classList.remove('vu'); }
  if (aideT > 0) { aideT -= dt; if (aideT <= 0) UI.aide.classList.remove('vu'); }
  majVie(dt, s);
  if (Q.bloom) {
    const sd = UC.sunPosition.value, sp = camera.position.clone().addScaledVector(sd, 1000).project(camera), m = Math.max(Math.abs(sp.x), Math.abs(sp.y));
    const f = sd.y > -.02 && sp.z < 1 ? (1 - lisse(1, 1.6, m)) * clamp(1.3 - sd.y * 1.7, .25, 1) : 0;
    RAYONS.enabled = f > .02; RAYONS.uniforms.uForce.value = f * .85; RAYONS.uniforms.uSoleil.value.set(sp.x * .5 + .5, sp.y * .5 + .5); RAYONS.uniforms.uTeinte.value.copy(soleil.color);
  }
  if (DRAPEAU) DRAPEAU.children.forEach((b, i) => { b.rotation.x = Math.sin(s * 3 + i * .8) * .12; });
  POUSSIERE.position.set(camera.position.x, camera.position.y - 3 + Math.sin(s * .2) * .3, camera.position.z); POUSSIERE.rotation.y = s * .01;
  const ancre = etat === 'menu' ? new T.Vector3(-75, 0, -68) : CAM.cible;
  soleil.position.copy(ancre).addScaledVector(DIR_ASTRE, 150); soleil.target.position.copy(ancre); soleil.target.updateMatrixWorld();
  ciel.position.copy(camera.position); domeNuit.position.copy(camera.position); nuages.position.copy(camera.position);
  if (!ESSAI) compo.render(dt);
}

/* Départ : écran titre au crépuscule */
ETAPES.intro.setup(); retourMenu(); heure(1.05, true);
$('#chargement').hidden = true;
requestAnimationFrame(boucle);
window.__silenzio = { aller, charger, ETAPES, J, CHAR, PNJ, CUEILLETTE, etat: () => etat, etape: () => ETAPE, inter: () => interProche && interProche.lib(), heure, camera, cam: CAM };
