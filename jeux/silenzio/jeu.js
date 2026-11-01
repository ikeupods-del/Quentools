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
import { fabriquerTextures, texVisage, texDrapeau, texTatouage } from './textures.js';

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
    case 'scan_inutilise': { const cible = new T.Color(c), k = new T.Color(Math.min(1.6, cible.r / TETE.moy.r), Math.min(1.6, cible.g / TETE.moy.g), Math.min(1.6, cible.b / TETE.moy.b)); m = new T.MeshPhysicalMaterial({ color: k, map: TETE.map, normalMap: TETE.nm, normalScale: new T.Vector2(.9, .9), roughness: .52, sheen: .25, sheenRoughness: .55, sheenColor: new T.Color(0xff9070) }); break; }
    case 'barbe': {
      m = new T.MeshStandardMaterial({ color: c, map: TX.cheveux.map, normalMap: TX.cheveux.normalMap, roughness: .85 });
      m.onBeforeCompile = sh => {
        sh.vertexShader = 'varying vec3 vLoc;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vLoc = position;');
        sh.fragmentShader = 'varying vec3 vLoc;\n' + sh.fragmentShader.replace('void main() {', `void main() {
          bool garde = (vLoc.y < -0.012 && vLoc.z > -0.035) || (abs(vLoc.x) > 0.062 && vLoc.y < 0.032 && vLoc.z > -0.03 && vLoc.z < 0.06);
          if (abs(vLoc.x) < 0.024 && vLoc.y > -0.052 && vLoc.y < -0.026 && vLoc.z > 0.08) garde = false;
          if (vLoc.y < -0.105) garde = false;
          if (!garde) discard;`);
      };
      m.customProgramCacheKey = () => 'barbe'; break;
    }
    case 'cils': m = new T.MeshStandardMaterial({ color: 0x120c08, roughness: .9 }); break;
    case 'oeil': m = new T.MeshPhysicalMaterial({ color: 0xdcd4c8, roughness: .12, clearcoat: 1, clearcoatRoughness: .05 }); break;
    case 'iris': m = new T.MeshPhysicalMaterial({ color: c, roughness: .1, clearcoat: 1, clearcoatRoughness: .05 }); break;
    case 'fleurs': m = new T.MeshStandardMaterial({ map: TX[hx], alphaTest: .45, side: T.DoubleSide, roughness: .7 }); break;
    case 'salissure': m = new T.MeshStandardMaterial({ map: TX[hx], transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }); break;
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
  [[54, 50], [46, 60], [45, 72], [44, 84]],
  [[-64, -84], [-66.5, -104], [-72, -122], [-76, -134]]
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
ruban(ROUTES[0], 4.6, 0xd7c29c); ruban(ROUTES[1], 4, 0xcdb792); ruban(ROUTES[2], 3, 0xc0aa82); ruban(ROUTES[3], 3, 0xc8b08a);

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
  if (p.z < -128 && !surJetee(p.x, p.z)) { p.z = -128; choc = true; }
  if (p.z < -128 && surJetee(p.x, p.z)) p.x = clamp(p.x, -77.1, -74.9);
  return choc;
}
const surJetee = (x, z) => x > -77.3 && x < -74.7 && z < -127 && z > -154;
const solJ = (x, z) => surJetee(x, z) ? Math.max(H(x, z), .98) : H(x, z);
function dansBatiment(x, z, y) { for (const b of BOITES) { if (b.haut < 2.2) continue; const dx = x - b.x, dz = z - b.z, lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c; if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd && y < b.haut + b.y0) return true; } return false; }

/* ---------- Bâtiments ---------- */
await etape('Village…');
const ENDUITS = [0xe6d3b0, 0xdcb68a, 0xeadcc0, 0xd49c78, 0xe2bf94, 0xd2b696, 0xecd09c, 0xc9a47e];
const VOLETS = ['5d7a55', '6b4a2e', '46667a', '8a4632', '7d7a5a'];
const PIERRE = 'pierre:e8d2a4', PIERRE_C = 'pierre:f2e3c0', ENC = 'pierre:f0e0bc';
function fenetre(B, x, y, sens, zf, volet, balcon) {
  const F = B.clone().multiply(mat4(0, 0, zf, sens > 0 ? 0 : PI));
  piece(F, ENC, 1.18, .16, .18, x, y + .72, .06); piece(F, ENC, 1.22, .1, .24, x, y - .7, .08);
  if (R() < .75) poser(new T.PlaneGeometry(1.1, 1.3 + R() * .8).translate(0, -.6, 0), 'salissure:coulure', F.clone().multiply(mat4(x + (R() - .5) * .1, y - .75, .012)), false);
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
  piece(F, ENC, 1.85, .34, .34, x, 2.53, .13); piece(F, ENC, .3, 2.45, .3, x - .76, 1.22, .11); piece(F, ENC, .3, 2.45, .3, x + .76, 1.22, .11);
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
  for (const [ry, L0, off] of [[0, w, d / 2], [PI, w, d / 2], [PI / 2, d, w / 2], [-PI / 2, d, w / 2]]) poser(new T.PlaneGeometry(L0 + .1, 1.6).translate(0, .8, 0), 'salissure:crasse', B.clone().multiply(mat4(0, 0, 0, ry)).multiply(mat4(0, 0, off + .06)), false);
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
    [-96, -92, 8, 10, 8, PI], [-56.5, -96, 8, 10, 7, PI], [-88, -38, 9, 8, 6, PI], [-74, -38, 8, 8, 6, PI], [-116, -62, 8, 10, 6, -PI / 2],
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
  for (const [x, z] of [[-100, -96], [-102, -100], [112, -30], [140, -30], [140, -58], [98, 26], [86, 30], [92, 30], [22, 62], [22, 70], [-71, -101], [-89, -102]]) { cy.push({ x, y: H(x, z), z, s: .85 + R() * .35, ry: R() * 6 }); CERCLES.push({ x, z, r: .7 }); }
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
    [-48, -118, 8, 8, 6, PI], [-40, -100, 8, 8, 6, PI / 2], [-36, -74, 8, 8, 6, PI / 2], [-104, -36, 8, 8, 6, 0], [-120, -34, 7, 8, 5.5, 0], [-60, -36, 8, 8, 6, 0, { plat: true }], [-46, -28, 7, 7, 5, .4]
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

/* ---------- Drapeaux siciliens (Trinacria) qui flottent au vent ---------- */
const TEX_DRAPEAU = texDrapeau();
const matDrapeau = new T.MeshStandardMaterial({ map: TEX_DRAPEAU, side: T.DoubleSide, roughness: .85 });
matDrapeau.onBeforeCompile = sh => { sh.uniforms.uTemps = VENT.uTemps; sh.vertexShader = 'uniform float uTemps;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
  float kd = clamp(uv.x, 0.0, 1.0); transformed.z += sin(position.x * 4.0 - uTemps * 5.0 + position.y * 1.7) * 0.11 * kd + sin(position.x * 9.0 - uTemps * 8.0) * 0.025 * kd; transformed.y -= kd * kd * 0.06;`); };
matDrapeau.customProgramCacheKey = () => 'drapeau';
const DRAPEAUX = [];
function drapeau(x, z, ry, hm = 7, w = 1.8, parent = scene, yb) {
  const y0 = yb ?? H(x, z), g = new T.Group(); g.position.set(x, y0, z); g.rotation.y = ry; parent.add(g);
  const mat_ = new T.Mesh(new T.CylinderGeometry(.045, .06, hm, 8), M('fer')); mat_.position.y = hm / 2; mat_.castShadow = true; g.add(mat_);
  const b = new T.Mesh(new T.SphereGeometry(.08, 10, 8), M('bronze')); b.position.y = hm + .05; g.add(b);
  const pg = new T.PlaneGeometry(w, w * 2 / 3, 18, 10); pg.translate(w / 2 + .05, 0, 0);
  const f = new T.Mesh(pg, matDrapeau); f.position.y = hm - w / 3 - .1; f.castShadow = true; g.add(f); DRAPEAUX.push(f); return g;
}
function banniere(x, y, z, ry, w = .9, h = 1.5, parent = scene) {
  const g = new T.PlaneGeometry(w, h, 6, 10); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); uv.setXY(i, v, 1 - u); }
  const m = new T.Mesh(g, new T.MeshStandardMaterial({ map: TEX_DRAPEAU, side: T.DoubleSide, roughness: .85 })); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; parent.add(m);
  const t = new T.Mesh(new T.CylinderGeometry(.025, .025, w + .2, 6), M('bois:5a4230')); t.rotation.z = PI / 2; t.position.set(0, h / 2 + .03, 0); m.add(t); return m;
}
// Toujours présents : la Trinacria sur la tour de la masseria et sur le port
drapeau(L.masseria.x + 10.5, L.masseria.z - 2, .4, 3.2, 1.9, scene, H(L.masseria.x, L.masseria.z) + 13.6);
drapeau(-74.4, -137, -.3, 6, 1.6, scene, 1);

/* Petit port de pêche : jetée en bois sur pilotis, barques, casiers */
const BARQUES = [];
(() => {
  for (let z = -133; z >= -153; z -= 2) { piece(mat4(-76, 0, z), 'bois:9a7a58', 2.5, .12, 2.06, 0, .92, 0); for (const sx of [-1.12, 1.12]) poser(new T.CylinderGeometry(.09, .11, 3.2, 8), 'bois:5a4230', mat4(-76 + sx, -.6, z)); }
  for (const sx of [-1.2, 1.2]) piece(mat4(-76, 0, -143), 'bois:7a5a3a', .08, .08, 20, sx, 1.45, 0, 0, 0, 0, false);
  for (let z = -134; z >= -152; z -= 3) for (const sx of [-1.2, 1.2]) piece(mat4(-76, 0, z), 'bois:7a5a3a', .08, .55, .08, sx, 1.2, 0, 0, 0, 0, false);
  for (const [x, z] of [[-74.6, -150], [-77.3, -146]]) { piece(mat4(x, 1, z, R()), 'bois:a07848', .6, .45, .5, 0, .23, 0); }
  const coques = [['2f5a8a', 'f0ece4'], ['c94a3a', 'f0ece4'], ['3a7a5a', 'e8d27a']];
  [[-80.5, -141, .15], [-71.5, -146, -.2], [-80, -150, .35]].forEach(([x, z, r], i) => {
    const g = new T.Group(); g.position.set(x, .3, z); g.rotation.y = r; scene.add(g);
    const coque = new T.Mesh(new T.SphereGeometry(1, 20, 10, 0, PI * 2, PI / 2, PI / 2), new T.MeshStandardMaterial({ color: parseInt(coques[i][0], 16), map: TX.bois.map, normalMap: TX.bois.normalMap, roughness: .7, side: T.DoubleSide })); coque.scale.set(.85, .55, 2.6); coque.castShadow = true; g.add(coque);
    const liston = new T.Mesh(new T.TorusGeometry(1, .04, 6, 28), M('bois:' + coques[i][1])); liston.rotation.x = PI / 2; liston.scale.set(.85, 2.6, 1); liston.position.y = .02; g.add(liston);
    const banc_ = new T.Mesh(new T.BoxGeometry(1.5, .06, .3), M('bois:8a6a48')); banc_.position.set(0, -.08, .3); g.add(banc_);
    const rame = new T.Mesh(new T.CylinderGeometry(.025, .025, 2.6, 6), M('bois:8a6a48')); rame.rotation.set(0, 0, 1.3); rame.position.set(.6, .05, -.2); g.add(rame);
    BARQUES.push({ g, ph: R() * 6 });
  });
})();

/* Décor de la fête de Santa Lucia (deuxième partie) : guirlandes, bannières, arche de lumières, statue */
const FESTA = new T.Group(); FESTA.visible = false; scene.add(FESTA);
(() => {
  const V = L.village, yv = H(V.x, V.z);
  const tri = new T.BufferGeometry(); tri.setAttribute('position', new T.Float32BufferAttribute([-.17, 0, 0, .17, 0, 0, 0, -.38, 0], 3)); tri.computeVertexNormals();
  const geos = { r: [], j: [] };
  for (const [ax, az, bx, bz] of [[-97, -57.5, -63, -82.5], [-97, -82.5, -63, -57.5], [-97, -70, -63, -70], [-80, -57.5, -80, -83]]) {
    const L0 = Math.hypot(bx - ax, bz - az), n = Math.floor(L0 / .45), rot = Math.atan2(-(bz - az) / L0, (bx - ax) / L0);
    for (let i = 0; i <= n; i++) { const t = i / n, x = lerp(ax, bx, t), z = lerp(az, bz, t), y = yv + 6.2 - Math.sin(t * PI) * 1.3; const g = tri.clone(); g.rotateY(rot); g.rotateY((R() - .5) * .3); g.translate(x, y, z); geos[i % 2 ? 'j' : 'r'].push(g); }
    const corde = new T.Mesh(new T.CylinderGeometry(.01, .01, L0, 4), M('uni:3a3028')); corde.rotation.set(0, rot, PI / 2); corde.position.set((ax + bx) / 2, yv + 5.55, (az + bz) / 2); FESTA.add(corde);
  }
  const mr = new T.MeshStandardMaterial({ color: 0xc4161c, side: T.DoubleSide, roughness: .8 }), mj = new T.MeshStandardMaterial({ color: 0xf4c21a, side: T.DoubleSide, roughness: .8 });
  FESTA.add(new T.Mesh(mergeGeometries(geos.r), mr), new T.Mesh(mergeGeometries(geos.j), mj));
  for (const [x, z, r] of [[-94, -54.35, PI], [-84, -54.35, PI], [-72, -54.35, PI], [-60.85, -76, -PI / 2], [-60.85, -84, -PI / 2]]) banniere(x, yv + 4.4, z, r, .9, 1.5, FESTA);
  for (const [x, z, r] of [[-96, -58, -.6], [-64, -58, -2.4], [-96, -83, .6], [-64, -83, 2.4]]) drapeau(x, z, r, 7, 1.8, FESTA, yv);
  // Arche de lumières (« luminarie ») à l'entrée de la place
  const pts = []; for (let i = 0; i <= 24; i++) { const a = PI * i / 24; pts.push([Math.cos(a) * 4.2, 4.6 + Math.sin(a) * 2.4]); }
  for (let i = 0; i < 12; i++) { pts.push([-4.2, i * .4], [4.2, i * .4]); }
  const ampoules = mergeGeometries(pts.map(([u, v]) => new T.SphereGeometry(.07, 6, 5).translate(0, v, u)));
  const arche = new T.Mesh(ampoules, M('lumiere')); arche.position.set(-62.5, H(-62.5, -66), -66); FESTA.add(arche);
  const bois = new T.Mesh(mergeGeometries([new T.BoxGeometry(.12, 4.8, .12).translate(0, 2.4, -4.2), new T.BoxGeometry(.12, 4.8, .12).translate(0, 2.4, 4.2)]), M('bois:e8e0d0')); bois.position.copy(arche.position); FESTA.add(bois);
})();

/* ---------- Lanternes ---------- */
const LAMPES = [];
function lampe(x, y, z, parent) { const l = new T.PointLight(0xffa850, 0, 24, 2); l.position.set(x, y, z); (parent || scene).add(l); LAMPES.push(l); return l; }
const lampesFixes = [lampe(121, H(121, -37) + 3.2, -36.4), lampe(56.1, H(57, 46) + 4.2, 46.1), lampe(L.village.x + 3, H(L.village.x, L.village.z) + 4, L.village.z + 2), lampe(L.porteCaserne.x + .45, H(-98, -70) + 3.1, L.porteCaserne.z + 1.9)];
(() => {
  const p = lampesFixes[2].position; const B = mat4(p.x, p.y - 4, p.z);
  poser(new T.CylinderGeometry(.07, .1, 4, 8), 'fer', B.clone().multiply(mat4(0, 2, 0))); piece(B, 'fer', .5, .05, .05, -.2, 3.75, 0, 0, 0, 0, false);
  for (const l of lampesFixes) { piece(mat4(l.position.x, l.position.y, l.position.z), 'lumiere', .2, .3, .2, 0, -.05, 0, 0, 0, 0, false); piece(mat4(l.position.x, l.position.y, l.position.z), 'fer', .3, .06, .3, 0, .14, 0, 0, 0, 0, false); }
})();
construireLots();

/* ---------- Personnages : corps modelés et articulés (hanches, genoux, épaules, coudes) ---------- */
await etape('Personnages…');
const TETE = null;
/* ---------- Corps humains réalistes (MakeHuman, CC0) : squelette, peau qui se plie, vêtements ajustés ---------- */
const CORPS = await (async () => {
  try {
    const d = await (await fetch('modeles/corps/corps.json')).json();
    const dec = (s, Type) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Type(u.buffer); };
    const n = d.sommets, noms = d.os.map(o => o.n), parent = d.os.map(o => o.p), rang = Object.fromEntries(noms.map((x, i) => [x, i]));
    const anc = (i, nom) => { for (let k = i; k >= 0; k = parent[k]) if (noms[k] === nom) return true; return false; };
    const regOs = noms.map((nm, i) => anc(i, 'neck01') ? 0 : (anc(i, 'wrist.L') || anc(i, 'wrist.R')) ? 1 : /lowerarm/.test(nm) ? 2 : /upperarm|shoulder|clavicle/.test(nm) ? 3 : /foot|toe/.test(nm) ? 4 : /lowerleg/.test(nm) ? 5 : /upperleg/.test(nm) ? 6 : /spine05|root|pelvis/.test(nm) ? 7 : 8);
    const skinI = dec(d.skinI, Uint8Array), region = new Uint8Array(n); for (let i = 0; i < n; i++) region[i] = regOs[skinI[i * 4]];
    const sil = {};
    for (const [k, s] of Object.entries(d.silhouettes)) {
      const p16 = dec(s.pos, Int16Array), pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = p16[i] / 4000;
      sil[k] = { pos, nor: dec(s.nor, Int8Array), os: s.os, yeux: s.yeux, cache: {} };
    }
    return {
      n, noms, parent, rang, region, sil, zones: dec(d.zones, Uint8Array),
      uv: new T.BufferAttribute(dec(d.uv, Uint16Array), 2, true), skinIndex: new T.BufferAttribute(skinI, 4), skinWeight: new T.BufferAttribute(dec(d.skinW, Uint8Array), 4, true),
      zonesA: new T.BufferAttribute(dec(d.zones, Uint8Array), 4, true), index: Object.fromEntries(Object.entries(d.index).map(([k, v]) => [k, dec(v, Uint16Array)]))
    };
  } catch (e) { console.warn('Corps réalistes indisponibles :', e && e.message); return null; }
})();
// Régions : 0 tête et cou, 1 mains, 2 avant-bras, 3 bras et épaules, 4 pieds, 5 jambes, 6 cuisses, 7 bassin, 8 torse
const RG = { tete: 0, main: 1, avb: 2, bras: 3, pied: 4, jambe: 5, cuisse: 6, bassin: 7, torse: 8 };
/* Géométrie d'une couche (peau ou vêtement) : triangles dont un sommet au moins est dans les régions voulues, gonflés le long des normales */
function couche(silNom, groupe, regions, ep = 0, filtre = null, deform = null, cle = '') {
  const S = CORPS.sil[silNom], k = groupe + regions.join('') + ep + cle; if (S.cache[k]) return S.cache[k];
  const src = CORPS.index[groupe], idx = [], R = new Set(regions), reg = CORPS.region, P = S.pos;
  for (let t = 0; t < src.length; t += 3) {
    const a = src[t], b = src[t + 1], c = src[t + 2];
    if (regions.length && !(R.has(reg[a]) || R.has(reg[b]) || R.has(reg[c]))) continue;
    if (filtre && !(filtre(a, P) && filtre(b, P) && filtre(c, P))) continue;
    idx.push(a, b, c);
  }
  const pos = new Float32Array(P.length), N = S.nor;
  for (let i = 0; i < CORPS.n; i++) { for (let j = 0; j < 3; j++) pos[i * 3 + j] = P[i * 3 + j] + N[i * 3 + j] / 127 * ep; if (deform) deform(i, pos); }
  if (ep >= .006 && groupe === 'corps' && idx.length) lisserTissu(pos, idx, P, ep >= .015 ? 8 : 5);
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3, true)); g.setAttribute('uv', CORPS.uv);
  g.setAttribute('skinIndex', CORPS.skinIndex); g.setAttribute('skinWeight', CORPS.skinWeight); g.setAttribute('zones', CORPS.zonesA);
  g.setIndex(idx); if (deform && groupe === 'jupe') { g.setAttribute('normal', new T.BufferAttribute(new Float32Array(N.length), 3)); g.computeVertexNormals(); } g.computeBoundingSphere();
  return (S.cache[k] = g);
}
function lisserTissu(pos, idx, base, iter) {
  const cle = new Map(), noeud = new Int32Array(pos.length / 3).fill(-1); let n = 0;
  for (const v of idx) if (noeud[v] < 0) { const k = Math.round(base[v * 3] * 2000) + ',' + Math.round(base[v * 3 + 1] * 2000) + ',' + Math.round(base[v * 3 + 2] * 2000); let id = cle.get(k); if (id == null) { id = n++; cle.set(k, id); } noeud[v] = id; }
  const vois = Array.from({ length: n }, () => new Set()), P = new Float32Array(n * 3), cpt = new Float32Array(n);
  for (let t = 0; t < idx.length; t += 3) for (let a = 0; a < 3; a++) { const u = noeud[idx[t + a]], w = noeud[idx[t + (a + 1) % 3]]; vois[u].add(w); vois[w].add(u); }
  for (let v = 0; v < noeud.length; v++) if (noeud[v] >= 0) { const id = noeud[v]; for (let k = 0; k < 3; k++) P[id * 3 + k] += pos[v * 3 + k]; cpt[id]++; }
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) P[i * 3 + k] /= cpt[i];
  const L = Array.from(vois, s => [...s]), tmp = new Float32Array(n * 3);
  for (let it = 0; it < iter * 2; it++) {
    const f = it % 2 ? -.53 : .5;
    for (let i = 0; i < n; i++) { const l = L[i]; if (!l.length) { for (let k = 0; k < 3; k++) tmp[i * 3 + k] = P[i * 3 + k]; continue; } for (let k = 0; k < 3; k++) { let m = 0; for (const j of l) m += P[j * 3 + k]; tmp[i * 3 + k] = P[i * 3 + k] + f * (m / l.length - P[i * 3 + k]); } }
    P.set(tmp);
  }
  for (let v = 0; v < noeud.length; v++) if (noeud[v] >= 0) for (let k = 0; k < 3; k++) pos[v * 3 + k] = P[noeud[v] * 3 + k];
}
/* Peau : teinte, lèvres, sourcils peints, barbe naissante et joues par zones, grain de peau */
const PORES = (() => { const t = TX.pores.normalMap.clone(); t.repeat.set(36, 36); t.needsUpdate = true; return t; })();
/* Peau : teinte, lèvres, sourcils, barbe naissante, joues, cheveux peints, rides, sueur, poils du torse, tatouage */
const TEX_TATOUAGE = texTatouage();
function matPeau(peau, poil, barbe, femme, coiffe, fx = {}) {
  const k = 'peauR:' + [peau, poil, barbe, femme, coiffe.join(','), JSON.stringify(fx)].join(':'); if (MATS.has(k)) return MATS.get(k);
  const m = new T.MeshPhysicalMaterial({ color: peau, roughness: fx.sueur ? .3 : .48, clearcoat: fx.sueur ? .45 : 0, clearcoatRoughness: .35, normalMap: PORES, normalScale: new T.Vector2(.22 + (fx.rides || 0) * .35, .22 + (fx.rides || 0) * .35), sheen: .35, sheenRoughness: .55, sheenColor: new T.Color(0xff8a70) });
  const levres = new T.Color(femme ? 0xa84848 : 0x9a5a52), cpoil = new T.Color(poil), ta = fx.tatouage;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uLevres: { value: levres }, uPoil: { value: cpoil }, uBarbe: { value: barbe }, uCoiffe: { value: new T.Vector4(...coiffe) }, uRides: { value: fx.rides || 0 }, uRecul: { value: fx.recul || 0 }, uTorse: { value: new T.Vector4(...(fx.torse || [0, 0, 0, 0])) }, uTatou: { value: TEX_TATOUAGE }, uTE: { value: new T.Vector3(...(ta ? ta[0] : [0, 0, 0])) }, uTW: { value: new T.Vector3(...(ta ? ta[1] : [0, 0, 1])) }, uTOn: { value: ta ? 1 : 0 } });
    sh.vertexShader = 'attribute vec4 zones;\nvarying vec4 vZ;\nvarying vec3 vL;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vZ = zones; vL = position;');
    sh.fragmentShader = 'uniform vec3 uLevres; uniform vec3 uPoil; uniform float uBarbe; uniform vec4 uCoiffe; uniform float uRides; uniform float uRecul; uniform vec4 uTorse; uniform sampler2D uTatou; uniform vec3 uTE; uniform vec3 uTW; uniform float uTOn; varying vec4 vZ; varying vec3 vL;\n'
      + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float dy = vL.y - uCoiffe.x, front = smoothstep(uCoiffe.y - .05, uCoiffe.y - .025, vL.z) * (1.0 - smoothstep(.055 + uRecul, .08 + uRecul, dy));
      float crane = smoothstep(.018, .04, dy) * (1.0 - front) * (uCoiffe.z > .5 ? (1.0 - smoothstep(.06, .075, dy)) : 1.0) * uCoiffe.w;
      diffuseColor.rgb = mix(diffuseColor.rgb, uPoil * 0.9, crane);
      diffuseColor.rgb = mix(diffuseColor.rgb, uLevres, vZ.x * 0.75);
      diffuseColor.rgb = mix(diffuseColor.rgb, uPoil, vZ.y * 0.85);
      diffuseColor.rgb *= 1.0 - vZ.z * uBarbe;
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.06, 0.9, 0.88), vZ.w * 0.5);
      float axR = abs(vL.x), visage = smoothstep(uCoiffe.y - .06, uCoiffe.y - .02, vL.z);
      float rideF = max(0.0, sin(dy * 820.0)) * smoothstep(.035, .045, dy) * (1.0 - smoothstep(.07, .085, dy)) * visage;
      float patte = max(0.0, sin((axR * 1.3 + dy) * 1050.0)) * smoothstep(.042, .052, axR) * (1.0 - smoothstep(.066, .076, axR)) * (1.0 - smoothstep(.0, .018, abs(dy)));
      float sillon = (1.0 - smoothstep(.0, .004, abs(axR - (.024 + (-dy - .03) * .35)))) * step(-.07, dy) * step(dy, -.028) * visage;
      diffuseColor.rgb *= 1.0 - uRides * (rideF * .2 + patte * .18 + sillon * .25);
      if (uTorse.w > .5) { float tz = smoothstep(.05, .08, vL.z) * (1.0 - smoothstep(uTorse.z * .6, uTorse.z, abs(vL.x))) * step(uTorse.y, vL.y) * step(vL.y, uTorse.x); float poil = step(.45, fract(sin(dot(floor(vL.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453)); diffuseColor.rgb = mix(diffuseColor.rgb, uPoil * .7, tz * poil * .85); }
      if (uTOn > .5) { vec3 ax = uTW - uTE; float tt = dot(vL - uTE, ax) / dot(ax, ax); vec3 axn = normalize(ax), fr = normalize(vec3(0.0, 0.3, 1.0) - axn * dot(axn, vec3(0.0, 0.3, 1.0))), sd = cross(axn, fr); vec3 pp = vL - uTE - ax * tt; float an = atan(dot(pp, sd), dot(pp, fr));
        if (tt > .12 && tt < .88 && abs(an) < 1.1) { vec4 tc = texture2D(uTatou, vec2(an / 2.2 + .5, 1.0 - (tt - .12) / .76)); diffuseColor.rgb = mix(diffuseColor.rgb, tc.rgb * .6, tc.a * .85); } }`);
  };
  m.customProgramCacheKey = () => 'peauR';
  MATS.set(k, m); return m;
}
/* Étoffes : velours côtelé, laine brute, camouflage, rayures, cachemire, tissu technique, toile cirée (motif répété sur le corps) */
const REPET = { velours: 9, laine: 5, camouflage: 2.5, rayures: 5, tricot: 12, technique: 10, cire: 3 };
function etoffe(fam, c) {
  const k = 'etoffe:' + fam + ':' + c; if (MATS.has(k)) return MATS.get(k);
  if (!REPET[fam]) return M('tissu:' + hex(c));
  const rep = t => { const x = t.clone(); x.repeat.set(REPET[fam], REPET[fam]); x.needsUpdate = true; return x; }, t = TX[fam];
  const m = new T.MeshPhysicalMaterial({ color: c, map: rep(t.map), normalMap: rep(t.normalMap), roughnessMap: rep(t.roughnessMap), roughness: 1, normalScale: new T.Vector2(fam === 'laine' ? 1.6 : .9, fam === 'laine' ? 1.6 : .9), sheen: ['velours', 'tricot', 'laine'].includes(fam) ? .9 : .2, sheenRoughness: .7, sheenColor: new T.Color(c).lerp(new T.Color(0xffffff), .3) });
  MATS.set(k, m); return m;
}
/* Retouches du visage (nez cassé, joues creuses, visage rond, mâchoire carrée), appliquées à toutes les couches du visage */
function deformVisage(S, v) {
  if (!v) return null;
  const [ex, ey, ez] = S.yeux[0], yE = ey, zE = ez, base = S.pos, g = (a, b) => Math.exp(-a * a - b * b);
  return (i, P) => {
    const x = base[i * 3], y = base[i * 3 + 1] - yE, z = base[i * 3 + 2] - zE, ax = Math.abs(x);
    if (y > .06 || y < -.12 || z < -.09) return;
    const fz = Math.max(0, Math.min(1, (z + .05) / .04));
    if (v.nezCasse) { const w = g(x / .018, (y + .025) / .022) * fz; P[i * 3] += .0055 * w * v.nezCasse; P[i * 3 + 2] += .003 * g(x / .015, (y + .012) / .008) * fz * v.nezCasse; }
    if (v.jouesCreuses) { const w = g((ax - .05) / .018, (y + .04) / .02) * fz; P[i * 3] -= Math.sign(x) * .006 * w * v.jouesCreuses; P[i * 3 + 2] -= .004 * w * v.jouesCreuses; }
    if (v.rond) { const w = g((ax - .045) / .03, (y + .05) / .035) * Math.max(0, Math.min(1, (z + .08) / .05)); P[i * 3] += Math.sign(x) * .007 * w * v.rond; P[i * 3 + 2] += .003 * w * v.rond; }
    if (v.machoire) { const w = Math.max(0, Math.min(1, (-y - .045) / .03)) * Math.max(0, Math.min(1, (ax - .02) / .03)); P[i * 3] += Math.sign(x) * .005 * w * v.machoire; }
    if (v.anguleux) { const w = g((ax - .05) / .02, (y + .005) / .02) * fz; P[i * 3] += Math.sign(x) * .003 * w * v.anguleux; P[i * 3 + 2] += .002 * w * v.anguleux; }
  };
}
/* Animations transférées (Quaternius, CC0) : clips construits une fois par squelette */
const ANIMS = await (async () => { try { return await (await fetch('modeles/anim/anims.json')).json(); } catch (e) { console.warn('Animations indisponibles :', e && e.message); return null; } })();
const CLIPS = {};
const nomOs = n => T.PropertyBinding.sanitizeNodeName(n);
function clipsPour(cible, racine0) {
  const k = cible + racine0.join(','); if (CLIPS[k]) return CLIPS[k];
  const out = {};
  for (const [nom, c] of Object.entries(ANIMS.cibles[cible])) {
    const times = Array.from({ length: c.n }, (_, i) => Math.min(c.duree, i / ANIMS.fps)), pistes = [];
    for (const [os, v] of Object.entries(c.pistes)) pistes.push(new T.QuaternionKeyframeTrack(nomOs(os) + '.quaternion', times, v));
    const rp = []; for (let i = 0; i < c.n; i++) rp.push(racine0[0], racine0[1] + c.racine[i * 3 + 1], racine0[2]);
    pistes.push(new T.VectorKeyframeTrack(nomOs('root') + '.position', times, rp));
    out[nom] = new T.AnimationClip(nom, c.duree, pistes);
  }
  return (CLIPS[k] = out);
}
function animerAvecClips(h, cible) {
  if (!ANIMS) return;
  h.mixer = new T.AnimationMixer(h.g); const cl = clipsPour(cible, h.corps0.toArray());
  h.actions = {}; h.poids = {};
  for (const k of ['repos', 'marche', 'course', 'assis']) { if (!cl[k]) continue; const a = h.mixer.clipAction(cl[k]); a.play(); a.setEffectiveWeight(k === 'repos' ? 1 : 0); h.actions[k] = a; h.poids[k] = k === 'repos' ? 1 : 0; }
  if (h.actions.assis) { h.actions.assis.time = 5.5; h.actions.assis.timeScale = 0; }
  h.actions.repos.time = R() * 4;
}
const _qx = new T.Quaternion(), _e = new T.Euler();
const tourner = (os, x, y, z) => { os.quaternion.multiply(_qx.setFromEuler(_e.set(x, y, z))); };
function humainReel(o) {
  const femme = o.femme ?? (o.robe != null), t = o.taille ?? 1;
  const silNom = o.silhouette || (femme ? (o.vieux ? 'vieille' : 'femme') : t < .7 ? 'enfant' : t < .9 ? 'ado' : o.vieux ? 'vieux' : o.corpulent ? 'gros' : o.fort ? 'fort' : 'homme');
  const S = CORPS.sil[silNom], g = new T.Group();
  const bones = S.os.map((_, i) => { const b = new T.Bone(); b.name = nomOs(CORPS.noms[i]); return b; });
  S.os.forEach((b, i) => { const p = CORPS.parent[i]; if (p < 0) { bones[i].position.set(b[0], b[1], b[2]); g.add(bones[i]); } else { const q = S.os[p]; bones[i].position.set(b[0] - q[0], b[1] - q[1], b[2] - q[2]); bones[p].add(bones[i]); } });
  const B = nom => bones[CORPS.rang[nom]], J = nom => S.os[CORPS.rang[nom]];
  g.updateMatrixWorld(true);
  const squelette = new T.Skeleton(bones);
  const peau = o.peau ?? 0xc69068, poil = o.cheveux ?? 0x1e1712, tx = o.tex || {};
  const couches = [];
  const ajouter = (geo, mat) => { const m = new T.SkinnedMesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.bind(squelette); g.add(m); couches.push(m); return m; };
  const habit = (cle, c) => etoffe(tx[cle] || 'tissu', c);
  const yC = J('neck01')[1], yT = J('spine05')[1], yE = S.yeux[0][1], zE = S.yeux[0][2];
  const dv = deformVisage(S, o.visage), cv = o.visage ? JSON.stringify(o.visage) : '';
  // Peau
  const visibles = [RG.tete, RG.main]; if (o.manches) visibles.push(RG.avb); if (o.ouvert) visibles.push(RG.torse);
  const fx = { rides: o.rides || 0, sueur: !!o.sueur, recul: o.coiffure === 'recul' ? .028 : 0, torse: o.poils ? [yC - .03, yC - .24, .09, 1] : null, tatouage: o.tatouage ? [J('lowerarm01.R').slice(0, 3), J('wrist.R').slice(0, 3)] : null };
  const rase = o.coiffure === 'rase';
  ajouter(couche(silNom, 'corps', visibles, 0, null, dv, cv), matPeau(peau, poil, femme ? 0 : o.vieux ? .14 : (o.rase ? .1 : .28), femme, [yE, zE, o.chauve ? 1 : 0, rase ? .35 : 1], fx));
  ajouter(couche(silNom, 'cils', [], 0, null, dv, cv), M('cils'));
  // Vêtements
  const chemise = o.chemise ?? 0xe8e0cc, ouvertDevant = (lim, larg) => (i, P) => !(P[i * 3 + 2] > .02 && Math.abs(P[i * 3]) < larg + Math.min(.07, Math.max(0, P[i * 3 + 1] - lim) * .24));
  const Nn = S.nor, yG = J('lowerleg01.L')[1];
  // Ampleur : jambe de pantalon droite (plus large vers le bas), veste qui tombe sur les hanches
  const pantalonAmple = (i, P) => { const y = S.pos[i * 3 + 1]; if (y > yT) return; const e = (o.ample ? .012 : .005) + Math.max(0, Math.min(1, (yG + .15 - y) / .4)) * (o.ample ? .025 : .016); for (let k = 0; k < 2; k += 2) { P[i * 3] += Nn[i * 3] / 127 * e; P[i * 3 + 2] += Nn[i * 3 + 2] / 127 * e; } };
  const vesteTombe = (i, P) => { const y = S.pos[i * 3 + 1]; if (y > yT + .04) return; const d = Math.min(.12, (yT + .04 - y)) * .3; const x = P[i * 3], z = P[i * 3 + 2] + .01, l = Math.hypot(x, z) || 1; P[i * 3] += x / l * d; P[i * 3 + 2] += (z / l) * d * .8; };
  const sansAvb = o.manches ? [] : [RG.avb];
  if (o.robe != null) {
    ajouter(couche(silNom, 'corps', [RG.torse, RG.bras, ...sansAvb, RG.bassin], .004), habit('chemise', o.chemise ?? o.robe));
    const yBas = .07, yH = yT;
    const jupe = couche(silNom, 'jupe', [], .006, null, (i, P) => { const y = P[i * 3 + 1]; if (y < yH) { const yMin = S.cacheJupe ?? (S.cacheJupe = Math.min(...Array.from(new Set(CORPS.index.jupe)).map(k => S.pos[k * 3 + 1]))); P[i * 3 + 1] = yH - (yH - y) * (yH - yBas) / (yH - yMin); const f = 1 + (yH - P[i * 3 + 1]) * .28; P[i * 3] *= f; P[i * 3 + 2] *= f; } }, 'robe');
    ajouter(jupe, habit('robe', o.robe)).material.side = T.DoubleSide;
  } else {
    ajouter(couche(silNom, 'corps', [RG.torse, RG.bras, ...sansAvb], .006, o.ouvert ? (i, P) => P[i * 3 + 1] < yC - .26 || ouvertDevant(yC - .26, .01)(i, P) : null, null, o.ouvert ? 'ouv' : ''), habit('chemise', chemise));
    ajouter(couche(silNom, 'corps', [RG.bassin, RG.cuisse, RG.jambe], .008, (i, P) => P[i * 3 + 1] < yT + .06, pantalonAmple, 'pant' + (o.ample ? 'a' : '')), habit('pantalon', o.pantalon ?? 0x4a3f33));
    if (o.gilet != null) ajouter(couche(silNom, 'corps', [RG.torse], .011, ouvertDevant(yC - .1, .006), null, 'gilet'), habit('gilet', o.gilet));
    if (o.veste != null) ajouter(couche(silNom, 'corps', [RG.torse, RG.bras, ...sansAvb, RG.bassin], o.epaisse ? .026 : .018, (i, P) => P[i * 3 + 1] > yT - (o.longue ? .28 : .17) && !(Math.abs(P[i * 3]) < .07 && P[i * 3 + 1] < yT - .06) && (o.croise ? true : ouvertDevant(yC - .34, .015)(i, P)), vesteTombe, 'veste' + (o.croise ? 'c' : '') + (o.longue ? 'l' : '') + (o.epaisse ? 'e' : '') + (o.manches ? 'm' : '')), habit('veste', o.veste));
    if (o.bretelles) for (const sx of [-1, 1]) ajouter(couche(silNom, 'corps', [RG.torse, RG.bassin], .016, (i, P) => { const x = P[i * 3] * sx; return x > .055 && x < .085 && P[i * 3 + 1] > yT - .05; }, null, 'bret' + sx), M('cuir:3a2416'));
  }
  // Finitions : col, revers, poignets
  if (o.robe == null) {
    const n1 = J('neck01'), col = new T.Mesh(new T.CylinderGeometry(.062, .068, .045, 24, 1, true, PI / 2 + .35, PI * 2 - .7), habit('chemise', chemise)); col.material.side = T.DoubleSide; col.position.set(0, .01, .0); col.rotation.x = -.18; col.castShadow = true; B('neck01').add(col);
    if (o.veste != null && !o.croise) for (const sx of [-1, 1]) { const rv = new T.Mesh(new T.BoxGeometry(.055, .2, .008), habit('veste', o.veste)); rv.position.set(sx * .055, -.13, .118); rv.rotation.set(-.15, sx * .35, sx * -.32); rv.castShadow = true; B('spine02').add(rv); }
    if (o.veste != null && o.croise) for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const bt = new T.Mesh(GH.bouton, M('uni:1a1a1a')); bt.position.set(sx * .05, -.12 - k * .07, .12); B('spine02').add(bt); }
    if (!o.manches) for (const s of ['L', 'R']) { const w = J('wrist.' + s), a = J('lowerarm01.' + s), d = new T.Vector3(w[0] - a[0], w[1] - a[1], w[2] - a[2]).normalize(); const p = new T.Mesh(new T.TorusGeometry(.036, .009, 8, 20), habit(o.veste != null ? 'veste' : 'chemise', o.veste ?? chemise)); p.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), d); p.position.set(-d.x * .02, -d.y * .02, -d.z * .02); B('wrist.' + s).add(p); }
  }
  // Chaussures et bottes
  const b = o.bottes || 'cuir', hautB = { montagne: .3, crottees: .26, talons: .1, baskets: .11 }[b] || .19;
  ajouter(couche(silNom, 'corps', [RG.pied, RG.jambe], b === 'montagne' ? .022 : b === 'baskets' ? .02 : .012, (i, P) => P[i * 3 + 1] < hautB, null, 'chauss' + b), M(b === 'baskets' ? 'uni:eeeeea' : b === 'montagne' ? 'cuir:3a2a1c' : b === 'talons' ? 'cuir:141414' : 'cuir:2a1e16'));
  if (b === 'crottees') ajouter(couche(silNom, 'corps', [RG.pied, RG.jambe], .017, (i, P) => P[i * 3 + 1] < .07 + (Math.sin(P[i * 3] * 300) + Math.sin(P[i * 3 + 2] * 250)) * .01, null, 'boue'), M('sol:6a5236'));
  if (b === 'baskets') ajouter(couche(silNom, 'corps', [RG.pied], .028, (i, P) => P[i * 3 + 1] < .025, null, 'semelle'), M('uni:f4f2ee'));
  if (b === 'talons') for (const s of ['L', 'R']) { const tl = new T.Mesh(new T.CylinderGeometry(.006, .01, .085, 8), M('cuir:141414')); const f = J('foot.' + s); tl.position.set(0, -.07, -.06); B('foot.' + s).add(tl); }
  // Cheveux, barbe, moustache
  if (!rase) {
    const co = o.coiffure, recul = co === 'recul' ? .028 : 0;
    const crane = (i, P) => { const dy = P[i * 3 + 1] - yE, z = P[i * 3 + 2], x = P[i * 3];
      const bas = co === 'carre' ? (x < 0 ? -.085 : -.06) : (femme ? -.02 : -.035);
      if (dy < bas || dy > .2) return false; if (z > zE - .045 && dy < .06 + recul) return false;
      if (co !== 'carre' && Math.abs(x) > .062 && dy < .01 && z > zE - .1) return false; return !o.chauve || dy < .055; };
    ajouter(couche(silNom, 'corps', [RG.tete, ...(co === 'carre' ? [RG.torse] : [])], co === 'carre' ? .009 : co === 'gomine' ? .0045 : .0028, crane, null, 'crane' + (o.chauve ? 'c' : '') + (femme ? 'f' : '') + (co || '')), co === 'gomine' ? M('cuir:' + hex(poil)) : M('cheveux:' + hex(poil)));
  }
  const Z = CORPS.zones;
  if (o.barbe) ajouter(couche(silNom, 'corps', [RG.tete], o.barbeEpaisse ? .011 : .004, (i, P) => Z[i * 4 + 2] > (o.barbeEpaisse ? 60 : 110) || (o.barbeEpaisse && P[i * 3 + 1] < yE - .08 && P[i * 3 + 2] > zE - .1 && P[i * 3 + 1] > yE - .15), dv, 'barbe' + (o.barbeEpaisse ? 'e' : '') + cv), M('cheveux:' + hex(o.barbe)));
  if (o.moustache) { const mc = o.moustache === true ? poil : o.moustache; ajouter(couche(silNom, 'corps', [RG.tete], o.guidon ? .007 : .0045, (i, P) => { const y = P[i * 3 + 1] - yE, x = Math.abs(P[i * 3]); return y < -.044 && y > -.068 && x < .03 + (-.044 - y) * .4 && P[i * 3 + 2] > zE - .02; }, dv, 'moust' + (o.guidon ? 'g' : '') + cv), M('cheveux:' + hex(mc)));
    if (o.guidon) for (const sx of [-1, 1]) { const c = new T.CatmullRomCurve3([new T.Vector3(sx * .022, -.06, .1), new T.Vector3(sx * .042, -.063, .085), new T.Vector3(sx * .055, -.05, .075), new T.Vector3(sx * .052, -.036, .072)]); const tb = new T.Mesh(new T.TubeGeometry(c, 12, .0035, 6), M('cheveux:' + hex(mc))); tb.position.set(0, yE - J('head')[1], zE - J('head')[2] - .1); B('head').add(tb); } }
  // Yeux
  const osT = B('head'), hT = J('head');
  for (const [x, y, z] of S.yeux) {
    const e = new T.Mesh(GH.globe, M('oeil')); e.position.set(x - hT[0], y - hT[1], z - hT[2] - .0068); osT.add(e);
    const ir = new T.Mesh(GH.iris, M('iris:' + hex(o.yeux ?? 0x2a1a0e))); ir.position.set(x - hT[0], y - hT[1] + .0004, z - hT[2] + .0034); ir.scale.set(1.12, 1.12, .45); osT.add(ir);
  }
  // Repère au centre du crâne : chapeaux, caméra
  const tete = new T.Group(); tete.position.set(0, yE + .022 - hT[1], zE - .085 - hT[2]); osT.add(tete);
  const chap = new T.Group(); chap.scale.set(.74, .8, .78); chap.position.set(0, -.024, .008); tete.add(chap);
  const ch = o.chapeau, cc = (o.chapeauC != null ? 'tissu:' + hex(o.chapeauC) : 'tissu:3b3530');
  if (ch === 'coppola') { partie(chap, GH.calotte, cc, 0, .065, .012, 1.06, .42, 1.12, -.12); partie(chap, GH.visiere, cc, 0, .07, .075, 1, 1, 1, .16); }
  else if (ch === 'coppolaTombante') { partie(chap, GH.calotte, cc, 0, .06, .02, 1.22, .5, 1.3, -.28); partie(chap, GH.visiere, cc, 0, .055, .1, 1.15, 1, 1.2, .38); }
  else if (ch === 'paille') { const c2 = 'tissu:' + hex(o.chapeauC ?? 0xcdb27a); partie(chap, GH.disque, c2, 0, .08, 0, .27, .012, .27); partie(chap, GH.disque, c2, 0, .14, 0, .118, .12, .118); partie(chap, GH.disque, 'tissu:4a3020', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'feutre' || ch === 'cabosse') { partie(chap, GH.disque, cc, 0, .08, 0, .17, .012, .17, ch === 'cabosse' ? .12 : 0, 0, ch === 'cabosse' ? -.08 : 0); const cal = partie(chap, GH.calotte, cc, 0, .085, 0, 1, .95, 1); if (ch === 'cabosse') { cal.scale.set(1.05, .8, .95); cal.rotation.z = .1; } partie(chap, GH.disque, 'tissu:151210', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'lucerna') { partie(chap, GH.demiLune, 'tissu:121318', 0, .08, 0, 1.1, 1, 1, PI / 2, 0); partie(chap, GH.oreille, 'tissu:b03a2e', 0, .19, .03, .8, .8, .5); partie(chap, GH.disque, 'bronze', .05, .14, .03, .03, .01, .03, PI / 2); }
  else if (ch === 'scialle') { const sc = o.tex && o.tex.scialle ? etoffe(o.tex.scialle, o.chapeauC ?? 0x161414) : M(cc); const cal = new T.Mesh(GH.calotte, sc); cal.position.set(0, .032, -.008); cal.scale.set(1.06, 1.32, 1.12); cal.rotation.x = -.18; cal.castShadow = true; chap.add(cal); const cape = new T.Mesh(GH.cape, sc); cape.scale.set(o.epaisse ? .95 : .86, 1, o.epaisse ? .9 : .8); cape.castShadow = true; B('spine01').add(cape); cape.position.set(0, (yC - J('spine01')[1]) - 1.58, -.012); }
  else if (ch === 'pretre') { partie(chap, GH.disque, cc, 0, .085, 0, .21, .012, .21); partie(chap, GH.calotte, cc, 0, .09, 0, .85, .7, .85); }
  if ((femme && !ch) || (o.coiffure === 'chignon' && ch !== 'scialle')) { const chignon = new T.Mesh(new T.SphereGeometry(.042, 14, 10), M('cheveux:' + hex(poil))); chignon.position.set(0, .03, -.09); chignon.castShadow = true; tete.add(chignon); }
  // Accessoires simples
  if (o.foulard != null) { const f = new T.Mesh(GH.col, tissu_(o.foulard)); f.rotation.x = PI / 2 + .35; f.scale.set(.86, .86, 1.1); f.position.set(0, .015, .012); B('neck01').add(f); }
  const t5 = J('spine05');
  if (o.ceinture != null) { const c = new T.Mesh(GH.disque, tissu_(o.ceinture)); c.scale.set(.16, .06, .12); c.position.set(0, yT - t5[1] + .02, 0); B('spine05').add(c); }
  if (o.tablier) { const tb = new T.Mesh(GH.disque, tissu_(0xece6d6)); tb.scale.set(.19, .55, .05); tb.position.set(0, yT - t5[1] - .22, .1); B('spine05').add(tb); }
  if (o.gilet != null) for (let i = 0; i < 4; i++) { const bt = new T.Mesh(GH.bouton, M('bronze')); bt.position.set(0, -.09 + i * .065, .118 + i * .004); B('spine02').add(bt); }
  if (o.lupara) { const f = new T.Group(); f.position.set(0, .05, -.15); f.rotation.set(0, 0, .75); B('spine02').add(f); partie(f, GH.disque, 'fer', -.012, 0, 0, .014, .9, .014); partie(f, GH.disque, 'fer', .012, 0, 0, .014, .9, .014); partie(f, GH.disque, 'bois:5a3a22', 0, -.55, 0, .03, .35, .05); }
  let lanterne = null;
  if (o.lanterne) { lanterne = new T.Group(); lanterne.position.set(.01, -.16, .02); B('wrist.L').add(lanterne); partie(lanterne, GH.disque, 'lumiere', 0, -.1, 0, .06, .16, .06); partie(lanterne, GH.disque, 'fer', 0, 0, 0, .075, .03, .075); partie(lanterne, GH.disque, 'fer', 0, -.19, 0, .075, .03, .075); }
  if (o.cassette) { const c = new T.Mesh(new T.BoxGeometry(.3, .18, .22), M('bois:5a3a22')); c.position.set(-.02, -.12, .06); B('wrist.R').add(c); }
  const angle = n2 => { const k = J(n2); return Math.atan2(Math.abs(k[3] - k[0]), k[1] - k[4]); };
  const bd = B('upperarm01.L'), bg = B('upperarm01.R'), jd = B('upperleg01.L'), jg = B('upperleg01.R');
  bd.coude = B('lowerarm01.L'); bg.coude = B('lowerarm01.R'); jd.genou = B('lowerleg01.L'); jg.genou = B('lowerleg01.R');
  const h = { reel: true, coucheSupp: (regions, ep, filtre, cle, mat) => ajouter(couche(silNom, 'corps', regions, ep, filtre, null, cle), mat), g, B, J, S, corps: B('root'), corps0: B('root').position.clone(), tete, osTete: osT, torse: B('spine02'), dos: B('spine03'), bassin: B('spine05'), jg, jd, bg, bd, brasZ: angle('upperarm01.L') - .1, ph: R() * 6, amp: 0, lanterne, porte: !!o.lanterne, assis: false, paupieres: [], parle: false, tp: R() * 9, couches, raideur: !!o.raideur };
  bd.rotation.z = -h.brasZ; bg.rotation.z = h.brasZ;
  animerAvecClips(h, 'mh');
  if (o.accessoires) for (const a of o.accessoires) a(h);
  g.scale.setScalar(o.echelle ?? (femme || silNom === 'enfant' || silNom === 'ado' ? 1 : .95 * (t > .9 ? t : 1)));
  if (o.mince) { g.scale.x *= .9; g.scale.z *= .92; }
  return h;
}
const tissu_ = c => M('tissu:' + hex(c));
function animerOs(h, dt, v) {
  if (!h.mixer) return animerOsProc(h, dt, v);
  const cible = h.assis ? 'assis' : v > 3.2 ? 'course' : v > .15 ? 'marche' : 'repos';
  for (const k in h.actions) { h.poids[k] = lerp(h.poids[k], k === cible ? 1 : 0, 1 - Math.exp(-dt * (h.assis ? 30 : 8))); h.actions[k].setEffectiveWeight(h.poids[k]); }
  if (h.actions.marche) h.actions.marche.timeScale = clamp(v / 1.35, .6, 1.7);
  if (h.actions.course) h.actions.course.timeScale = clamp(v / 5.2, .7, 1.5);
  h.mixer.update(dt * (h.raideur ? .8 : 1));
  if (h.raideur) { h.bd.quaternion.slerp(_qx.setFromEuler(_e.set(0, 0, -h.brasZ)), .55); h.bg.quaternion.slerp(_qx.setFromEuler(_e.set(0, 0, h.brasZ)), .55); h.dos.quaternion.identity(); }
  if (h.figeBras) h.figeBras(h);
  if (h.porte) { tourner(h.bd, -.35, 0, 0); tourner(h.bd.coude, -.6, 0, 0); }
  const t = (h.tp += dt);
  if (v < .2 && !h.assis) {
    if (h.parle) {
      tourner(h.bd, -.35 + Math.sin(t * 2.1) * .2, 0, .2 + Math.sin(t * 1.7) * .1); tourner(h.bd.coude, -.7 + Math.sin(t * 3.3) * .3, 0, 0);
      if (!h.porte) { tourner(h.bg, -.1 + Math.sin(t * 1.6 + 1) * .12, 0, 0); tourner(h.bg.coude, -.3 + Math.sin(t * 2.4) * .2, 0, 0); }
      tourner(h.osTete, Math.sin(t * 4.1) * .05, Math.sin(t * 1.3) * .1, 0);
    } else if (!h.raideur) tourner(h.osTete, 0, Math.sin(t * .23) * .22 * Math.sin(t * .11), 0);
  }
}
function animerOsProc(h, dt, v) {
  const z = h.brasZ;
  if (h.assis) {
    h.jg.rotation.set(-1.5, 0, 0); h.jd.rotation.set(-1.5, 0, 0); h.jg.genou.rotation.x = h.jd.genou.rotation.x = 1.45;
    h.bg.rotation.set(-.5, 0, z * .7); h.bd.rotation.set(-.5, 0, -z * .7); h.bg.coude.rotation.x = h.bd.coude.rotation.x = -.6;
    h.corps.position.copy(h.corps0); h.corps.rotation.set(0, 0, 0); return;
  }
  const k = clamp(v / 5, 0, 1.5);
  h.ph += dt * (4 + v * 1.55);
  h.amp = lerp(h.amp, v > .15 ? clamp(.32 + k * .42, 0, .85) : 0, 1 - Math.exp(-dt * 10));
  const s = Math.sin(h.ph), c = Math.cos(h.ph), a = s * h.amp;
  h.jg.rotation.set(a, 0, 0); h.jd.rotation.set(-a, 0, 0);
  h.jg.genou.rotation.x = Math.max(0, c) * h.amp * 1.5 + .05; h.jd.genou.rotation.x = Math.max(0, -c) * h.amp * 1.5 + .05;
  h.bg.rotation.set(-a * .75, 0, z); h.bd.rotation.set(h.porte ? -.3 : a * .75, 0, -z);
  h.bg.coude.rotation.x = -.25 - Math.max(0, a) * .6; h.bd.coude.rotation.x = h.porte ? -.85 : -.25 - Math.max(0, -a) * .6;
  h.corps.position.set(h.corps0.x, h.corps0.y + Math.abs(c) * .03 * k - k * .015, h.corps0.z);
  h.corps.rotation.set(0, s * .06 * h.amp, 0);
  h.dos.rotation.set(.04 * k + (k > 1.2 ? .1 : 0), -s * .1 * h.amp, 0);
  h.osTete.rotation.set(0, s * .05 * h.amp, 0);
  if (v < .2) {
    const t = (h.tp += dt);
    h.torse.rotation.x = Math.sin(t * 1.3) * .012;
    if (h.parle) {
      h.bd.rotation.set(-.4 + Math.sin(t * 2.1) * .2, 0, -z + .25 + Math.sin(t * 1.7) * .1); h.bd.coude.rotation.x = -1 + Math.sin(t * 3.3) * .3;
      if (!h.porte) { h.bg.rotation.set(-.15 + Math.sin(t * 1.6 + 1) * .12, 0, z - .05); h.bg.coude.rotation.x = -.45 + Math.sin(t * 2.4) * .2; }
      h.osTete.rotation.set(Math.sin(t * 4.1) * .05, Math.sin(t * 1.3) * .1, 0);
    } else {
      h.corps.rotation.z = Math.sin(t * .5) * .015;
      h.osTete.rotation.set(Math.sin(t * .31) * .04, Math.sin(t * .23) * .25 * Math.sin(t * .11), 0);
    }
  }
}

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
  if (CORPS && !o.simple) return humainReel(o);
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
  const scan = !!TETE && typeVisage !== 'femme' && (o.taille ?? 1) > .9;
  const paupieres = [];
  if (scan) {
    const tv = new T.Group(); tv.scale.set(1.06 * (o.largeur ?? 1), 1.06 * (o.longueur ?? 1), 1.06); tete.add(tv);
    partie(tv, TETE.g, 'scan:' + hex(o.peau ?? 0xc69068), 0, 0, 0);
    for (const sx of [-1, 1]) {
      const e = TETE.oeil(sx);
      partie(tv, GH.globe, 'oeil', e.x, e.y, e.z, 1.08, 1.08, 1.08);
      partie(tv, GH.iris, 'iris:' + hex(o.yeux ?? 0x3a2414), e.x, e.y, e.z + .0094, 1.05, 1.05, .45);
      const pp = new T.Group(); pp.position.copy(e); tv.add(pp); partie(pp, GH.paupiere, 'scan:' + hex(o.peau ?? 0xc69068), 0, 0, 0, 1.12, 1.12, 1.12); pp.rotation.x = .3; paupieres.push(pp);
      partie(tv, GH.sourcil, 'cils', e.x, e.y + .0062, e.z + .0108, .55, .6, .6, 0, 0, sx * .06);
      partie(tv, GH.sourcil, chev, e.x + sx * .002, e.y + .0235, e.z + .0135, 1.1, 1.25, 1.1, 0, sx * -.2, sx * -.1);
    }
    if (o.moustache) { const mc = 'cheveux:' + hex(o.moustache === true ? o.cheveux ?? 0x1e1712 : o.moustache); for (const sx of [-1, 1]) partie(tv, GH.moust, mc, sx * .015, -.0185, .1135, 1.1, 1.15, 1, 0, sx * -.4, sx * .32); }
    if (o.barbe) partie(tv, TETE.g, 'barbe:' + hex(o.barbe), 0, -.001, .002, 1.035, 1.025, 1.05);
    if (!o.chauve) partie(tv, GH.chevelure, chev, 0, .03, -.01, .93, 1.0, 1.06, -.25);
  } else {
  partie(tete, GH.tete, 'visage:' + typeVisage + ':' + hex(o.peau ?? 0xc69068), 0, 0, 0);
  partie(tete, GH.oreille, peau, -.091, -.004, -.008, .42, 1.05, .78); partie(tete, GH.oreille, peau, .091, -.004, -.008, .42, 1.05, .78);
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
  }
  const chap = new T.Group(); if (scan) { chap.position.set(0, .04, -.008); chap.scale.setScalar(1.15); } tete.add(chap);
  const ch = o.chapeau, cc = (o.chapeauC != null ? 'tissu:' + hex(o.chapeauC) : 'tissu:3b3530');
  if (ch === 'coppola') { partie(chap, GH.calotte, cc, 0, .065, .012, 1.06, .42, 1.12, -.12); partie(chap, GH.visiere, cc, 0, .07, .075, 1, 1, 1, .16); }
  else if (ch === 'paille') { partie(chap, GH.disque, 'tissu:' + hex(o.chapeauC ?? 0xcdb27a), 0, .08, 0, .27, .012, .27); partie(chap, GH.disque, 'tissu:' + hex(o.chapeauC ?? 0xcdb27a), 0, .14, 0, .118, .12, .118); partie(chap, GH.disque, 'tissu:4a3020', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'feutre') { partie(chap, GH.disque, cc, 0, .08, 0, .17, .012, .17); partie(chap, GH.calotte, cc, 0, .085, 0, 1, .95, 1); partie(chap, GH.disque, 'tissu:151210', 0, .1, 0, .121, .03, .121); }
  else if (ch === 'lucerna') { partie(chap, GH.demiLune, 'tissu:121318', 0, .08, 0, 1.1, 1, 1, PI / 2, 0); partie(chap, GH.oreille, 'tissu:b03a2e', 0, .19, .03, .8, .8, .5); partie(chap, GH.disque, 'bronze', .05, .14, .03, .03, .01, .03, PI / 2); }
  else if (ch === 'scialle') { partie(chap, GH.calotte, cc, 0, -.01, -.01, 1.15, 1.25, 1.15, -.25); partie(corps, GH.cape, cc, 0, 0, 0, 1, 1, .8); }
  else if (ch === 'pretre') { partie(chap, GH.disque, cc, 0, .085, 0, .21, .012, .21); partie(chap, GH.calotte, cc, 0, .09, 0, .85, .7, .85); }
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
  corps.scale.set(.92, 1, .95); tete.scale.set(1 / .92, 1, 1 / .95);
  g.scale.setScalar(o.taille ?? 1);
  return { g, corps, tete, torse, jg, jd, bg, bd, ph: R() * 6, amp: 0, lanterne, porte: !!o.lanterne, assis: false, paupieres, cligne: R() * 4, ferme: 0, parle: false, tp: 0 };
}
function animer(h, dt, v) {
  if (h.reel) return animerOs(h, dt, v);
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
const TURI2 = { chemise: 0xece6d6, gilet: 0x5a2a22, veste: 0x2c3628, pantalon: 0x2a2620, chapeau: 'coppola', chapeauC: 0x2a2620, cheveux: 0x22180f, moustache: true, foulard: 0x8e1f1a, peau: 0xc08660, largeur: 1.03 };
pnj('don', 'Don Gaspare', { vieux: true, veste: 0x16161a, gilet: 0x2a2a30, chemise: 0xf0ece4, pantalon: 0x16161a, chapeau: 'feutre', chapeauC: 0x101010, moustache: 0xdcd8d0, barbe: 0xdcd8d0, cheveux: 0xdcd8d0, peau: 0xc89a78, largeur: 1.06, longueur: .98 }, 121, -34, 0, 'scene');
pnj('nardo2', 'Nardo', { veste: 0x3f4a33, chemise: 0xd9cfb8, pantalon: 0x2e2a24, chapeau: 'coppola', chapeauC: 0x2a2620, moustache: 0x4a3a2a, foulard: 0x8e1f1a, peau: 0xb8805a, largeur: 1.05 }, -89, -74, 0, 'scene');
pnj('concetta', 'Concetta', { robe: 0x24365a, chemise: 0xe8e0cc, chapeau: 'scialle', chapeauC: 0x4a2a2a, peau: 0xd6a582, cheveux: 0x1a120c }, 70, 46.6, 0, 'scene');
pnj('saro', 'Saro', { chemise: 0xe0d6bf, pantalon: 0x5a4a38, taille: .62, cheveux: 0x2a1d12 }, 71.2, 47.3, 0, 'scene');
pnj('carmelo', 'Carmelo', { manches: true, chemise: 0xd8ccb0, gilet: 0x4a3a2a, pantalon: 0x4a3f33, chapeau: 'paille', chapeauC: 0xc8ab70, moustache: true, peau: 0xb07a50, longueur: 1.04 }, 63, 56, -PI / 2, 'scene');
pnj('vanni', 'Zu Vanni', { vieux: true, manches: true, chemise: 0x5a6a7a, pantalon: 0x3a3a40, chapeau: 'coppola', chapeauC: 0x8a2a22, barbe: 0x9a968c, moustache: 0x9a968c, peau: 0xa86e48, largeur: .97 }, -76, -149, PI, 'scene');
pnj('marechal', 'Le maréchal', { veste: 0x1a2232, chemise: 0x1a2232, pantalon: 0x1a2232, chapeau: 'lucerna', moustache: 0x7a5a3a, cheveux: 0x7a5a3a, peau: 0xe0b898, ceinture: 0xe8e2d0 }, -84, -66, 0, 'scene');
function poserPositions1877() {
  poserPnj('don', -91.5, -73, PI / 2); poserPnj('concetta', 70, 46.6, 0); poserPnj('saro', 71.2, 47.3, -.3); poserPnj('carmelo', 63, 56, -PI / 2); poserPnj('vanni', -76, -149, PI);
  PNJ.vanni.pos.y = .98;
}
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
/* Statue de Santa Lucia (décor de la fête) */
(() => {
  // Statue de Santa Lucia sur son brancard fleuri
  const vara = new T.Group(); vara.position.set(-73.5, H(-73.5, -81), -81); FESTA.add(vara);
  const plat = new T.Mesh(new T.BoxGeometry(1.8, .5, 1.4), M('bois:c8a050')); plat.position.y = .9; vara.add(plat);
  for (const sx of [-1.2, 1.2]) { const b = new T.Mesh(new T.BoxGeometry(.1, .1, 3.2), M('bois:8a6a48')); b.position.set(sx * .6, .7, 0); vara.add(b); }
  const sainte = humain({ robe: 0x3a5a9a, chemise: 0xf0ece4, chapeau: 'scialle', chapeauC: 0xf0ece4, peau: 0xe8c8a8, taille: 1.05 }); sainte.g.position.y = 1.15; sainte.bd.rotation.x = -.6; sainte.bd.coude.rotation.x = -1; vara.add(sainte.g);
  const aureole = new T.Mesh(new T.TorusGeometry(.17, .012, 6, 24), M('bronze')); aureole.position.set(0, 1.15 + 1.92, -.06); vara.add(aureole);
  for (let i = 0; i < 8; i++) { const f = new T.Mesh(new T.SphereGeometry(.12, 8, 6), M(i % 2 ? 'uni:c8281e' : 'uni:f0ece4')); f.position.set(-.7 + (i % 4) * .46, 1.2, i < 4 ? -.55 : .55); vara.add(f); }
})();

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
  for (const b of BARQUES) { b.g.position.y = .3 + Math.sin(s * 1.1 + b.ph) * .05; b.g.rotation.z = Math.sin(s * .9 + b.ph) * .04; }
}

/* ---------- Personnage PromptPlay (fourni par le propriétaire) : visage photoréaliste, squelette ajouté ---------- */
const PP = await (async () => { try { return await (await fetch('modeles/promptplay/perso.json')).json(); } catch (e) { console.warn('Personnage PromptPlay indisponible :', e && e.message); return null; } })();
const PP_GEO = {}, PP_TEX = {};
function texPP(f, srgb) { if (!f) return null; if (PP_TEX[f]) return PP_TEX[f]; const t = new T.TextureLoader().load('modeles/promptplay/' + f); t.flipY = false; if (srgb) t.colorSpace = T.SRGBColorSpace; t.anisotropy = Math.min(ANISO, 8); return (PP_TEX[f] = t); }
function geoPP(m, ep = 0) {
  const k = m.nom + ep; if (PP_GEO[k]) return PP_GEO[k];
  const dec = (s, Type) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new Type(u.buffer); };
  const p16 = dec(m.pos, Int16Array), nor = dec(m.nor, Int8Array), pos = new Float32Array(p16.length);
  for (let i = 0; i < p16.length; i++) pos[i] = p16[i] / PP.echelle + nor[i] / 127 * ep;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3, true)); g.setAttribute('uv', new T.BufferAttribute(dec(m.uv, Uint16Array), 2, true));
  g.setAttribute('skinIndex', new T.BufferAttribute(dec(m.skinI, Uint8Array), 4)); g.setAttribute('skinWeight', new T.BufferAttribute(dec(m.skinW, Uint8Array), 4, true));
  g.setIndex(new T.BufferAttribute(dec(m.index, m.index32 ? Uint32Array : Uint16Array), 1)); g.computeBoundingSphere();
  return (PP_GEO[k] = g);
}
function humainPP(o = {}) {
  const g = new T.Group(), noms = PP.os.map(x => x.n), rang = Object.fromEntries(noms.map((n, i) => [n, i]));
  const bones = PP.os.map(x => { const b = new T.Bone(); b.name = nomOs(x.n); return b; });
  PP.joints.forEach((jt, i) => { const p = PP.os[i].p; if (p < 0) { bones[i].position.set(jt[0], jt[1], jt[2]); g.add(bones[i]); } else { const q = PP.joints[p]; bones[i].position.set(jt[0] - q[0], jt[1] - q[1], jt[2] - q[2]); bones[p].add(bones[i]); } });
  g.updateMatrixWorld(true);
  const squelette = new T.Skeleton(bones), B = n => bones[rang[n]], J = n => PP.joints[rang[n]];
  const ajouter = (geo, mat) => { const m = new T.SkinnedMesh(geo, mat); m.castShadow = m.receiveShadow = true; m.bind(squelette); g.add(m); return m; };
  for (const m of PP.maillages) {
    if (o.sans && o.sans.includes(m.nom)) continue;
    const peau = /corps|tete/.test(m.nom), oeil = /oeil/.test(m.nom);
    const k = 'pp:' + m.nom; let mat = MATS.get(k);
    if (!mat) { mat = new T.MeshPhysicalMaterial({ color: m.nom === 'cils' ? 0x0c0806 : 0xffffff, map: texPP(m.map, true), normalMap: texPP(m.normalMap), roughness: oeil ? .08 : peau ? .5 : .85, clearcoat: oeil ? 1 : 0, sheen: peau ? .3 : .2, sheenRoughness: .6, sheenColor: new T.Color(peau ? 0xff8a70 : 0xffffff), side: T.DoubleSide }); MATS.set(k, mat); }
    ajouter(geoPP(m), mat);
  }
  if (o.capuche) {
    ajouter(geoPP(PP.maillages.find(x => x.nom === 'haut'), .013), etoffe('technique', o.capuche));
    const hd = J('head'), cap = new T.Mesh(new T.SphereGeometry(.128, 28, 16, PI / 2 + .95, PI * 2 - 1.9, 0, PI * .66), etoffe('technique', o.capuche));
    cap.material.side = T.DoubleSide; cap.scale.set(1, 1.08, 1.12); cap.position.set(0, .135, -.02); cap.castShadow = true; B('head').add(cap);
  }
  if (o.baskets) { const ch = PP.maillages.find(x => x.nom === 'chaussures'); ajouter(geoPP(ch, .014), M('uni:eeeeea')); }
  const ey = 1.815 * 1.8 / 1.957, hd = J('head');
  const tete = new T.Group(); tete.position.set(0, ey + .02 - hd[1], .089 - .085 - hd[2]); B('head').add(tete);
  const bd = B('upperarm01.L'), bg = B('upperarm01.R'), jd = B('upperleg01.L'), jg = B('upperleg01.R');
  bd.coude = B('lowerarm01.L'); bg.coude = B('lowerarm01.R'); jd.genou = B('lowerleg01.L'); jg.genou = B('lowerleg01.R');
  const h = { reel: true, g, B, J, corps: B('root'), corps0: B('root').position.clone(), tete, osTete: B('head'), torse: B('spine02'), dos: B('spine04'), bassin: B('root'), jg, jd, bg, bd, brasZ: 1.45, ph: 0, amp: 0, porte: false, assis: false, paupieres: [], parle: false, tp: 0 };
  bd.rotation.z = -h.brasZ; bg.rotation.z = h.brasZ;
  animerAvecClips(h, 'pp');
  if (o.accessoires) for (const a of o.accessoires) a(h);
  return h;
}

/* ---------- Accessoires des familles ---------- */
const MAT_OR = new T.MeshStandardMaterial({ color: 0xd8aa48, metalness: 1, roughness: .22 }), MAT_CHROME = new T.MeshStandardMaterial({ color: 0xe8e8ec, metalness: 1, roughness: .08 });
const MAT_NOIR = new T.MeshStandardMaterial({ color: 0x16171a, metalness: .4, roughness: .45 }), MAT_VERRE_FUME = new T.MeshStandardMaterial({ color: 0x3a2a1a, metalness: .6, roughness: .05, transparent: true, opacity: .82 });
const MAT_JOURNAL = new T.MeshStandardMaterial({ map: TX.journal, roughness: .9 });
const piece3 = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
const BOX = new T.BoxGeometry(1, 1, 1), CYL = new T.CylinderGeometry(.5, .5, 1, 14), SPH = new T.SphereGeometry(.5, 12, 10);
const main_ = (h, s) => { const w = h.J('wrist.' + s), d = new T.Vector3(w[3] - w[0], w[4] - w[1], w[5] - w[2]).normalize().multiplyScalar(.06); const g = new T.Group(); g.position.copy(d); h.B('wrist.' + s).add(g); return g; };
const ACC = {
  lupara: h => { const f = new T.Group(); f.position.set(0, .05, -.15); f.rotation.set(0, 0, .75); h.B('spine02').add(f); piece3(f, CYL, M('fer'), -.012, 0, 0, 0, 0, 0, .028, .62, .028); piece3(f, CYL, M('fer'), .012, 0, 0, 0, 0, 0, .028, .62, .028); piece3(f, BOX, M('bois:5a3a22'), 0, -.42, .0, 0, 0, 0, .05, .3, .03); const sangle = new T.Mesh(new T.TorusGeometry(.2, .007, 6, 30), M('cuir:3a2416')); sangle.rotation.set(PI / 2.3, 0, .75); sangle.position.set(0, .05, -.02); sangle.scale.set(1, 1.45, 1); h.B('spine02').add(sangle); },
  chapelet: h => { const g = main_(h, 'R'); const n = 34; for (let i = 0; i < n; i++) { const a = i / n * PI * 2; piece3(g, SPH, M('bois:5a3018'), Math.sin(a) * .045, -.06 - (1 - Math.cos(a)) * .055, .015, 0, 0, 0, .011, .011, .011); } piece3(g, BOX, M('bois:4a2812'), 0, -.19, .015, 0, 0, 0, .008, .045, .006); piece3(g, BOX, M('bois:4a2812'), 0, -.18, .015, 0, 0, 0, .028, .008, .006); },
  mastruca: h => { const yT = h.J('spine05')[1]; h.coucheSupp([RG.torse, RG.bassin, RG.bras], .05, (i, P) => P[i * 3 + 1] > yT - .32 && !(Math.abs(P[i * 3]) > .2), 'mastruca', etoffe('laine', 0xd2c4a6)); h.coucheSupp([RG.torse], .062, (i, P) => P[i * 3 + 1] > h.J('neck01')[1] - .08 && P[i * 3 + 2] < .05, 'mastrucaCol', etoffe('laine', 0xc8b896)); },
  resolza: h => { const g = main_(h, 'R'); piece3(g, BOX, M('uni:d8c8a8'), 0, -.02, .02, .3, 0, 0, .022, .1, .016); piece3(g, BOX, MAT_CHROME, 0, -.11, .045, .3, 0, 0, .004, .1, .022); piece3(g, BOX, M('bronze'), 0, -.07, .03, .3, 0, 0, .024, .008, .018); },
  aviateurs: h => { const t = h.tete, f = new T.Group(); f.position.set(0, -.022, .085); t.add(f);
    for (const sx of [-1, 1]) { const l = new T.Mesh(new T.CircleGeometry(.023, 24), MAT_VERRE_FUME); l.scale.set(1.15, 1, 1); l.position.set(sx * .031, -.004, .004); l.rotation.y = sx * -.12; f.add(l); const r = new T.Mesh(new T.TorusGeometry(.023, .0018, 6, 28), MAT_OR); r.scale.set(1.15, 1, 1); r.position.copy(l.position); r.rotation.y = l.rotation.y; f.add(r); piece3(f, BOX, MAT_OR, sx * .068, .006, -.05, 0, sx * .12, 0, .0025, .003, .1); }
    piece3(f, BOX, MAT_OR, 0, .012, .005, 0, 0, 0, .03, .003, .003); },
  lunettesFines: h => { const t = h.tete, f = new T.Group(); f.position.set(0, -.022, .085); t.add(f); const verre = new T.MeshStandardMaterial({ color: 0xdfe8ec, transparent: true, opacity: .18, roughness: .02, metalness: .3 });
    for (const sx of [-1, 1]) { const l = new T.Mesh(new T.PlaneGeometry(.04, .026), verre); l.position.set(sx * .031, 0, .004); f.add(l); const r = new T.Mesh(new T.TorusGeometry(.02, .0011, 4, 4), MAT_NOIR); r.rotation.z = PI / 4; r.scale.set(1.4, .95, 1); r.position.copy(l.position); f.add(r); piece3(f, BOX, MAT_NOIR, sx * .068, .006, -.05, 0, sx * .12, 0, .0015, .002, .1); }
    piece3(f, BOX, MAT_NOIR, 0, .006, .005, 0, 0, 0, .022, .0015, .0015); },
  chaineOr: h => { const c = new T.Mesh(new T.TorusGeometry(.075, .0045, 8, 40), MAT_OR); c.rotation.x = PI / 2 - .5; c.scale.set(1, 1.15, 1); c.position.set(0, -.04, .055); h.B('spine01').add(c); piece3(h.B('spine01'), CYL, MAT_OR, 0, -.12, .115, PI / 2, 0, 0, .025, .004, .025); },
  holster: h => { const s = h.B('spine02'); piece3(s, BOX, M('cuir:9a1e1a'), .16, -.08, .02, 0, 0, .15, .045, .14, .07); piece3(s, BOX, M('cuir:9a1e1a'), .07, .06, .08, 0, 0, -.9, .02, .34, .006); piece3(s, BOX, M('cuir:9a1e1a'), .07, .06, -.09, 0, 0, -.9, .02, .34, .006); piece3(s, CYL, MAT_CHROME, .16, -.02, .04, 0, 0, .15, .024, .05, .024); piece3(s, BOX, MAT_CHROME, .155, .03, .04, 0, 0, .5, .022, .07, .026); piece3(s, BOX, M('bois:6a3a20'), .145, .07, .04, 0, 0, .9, .022, .05, .026); },
  telephoneSat: h => { const g = main_(h, 'R'); piece3(g, BOX, MAT_NOIR, 0, -.05, .03, .2, 0, 0, .06, .17, .035); piece3(g, CYL, MAT_NOIR, .018, .06, .03, .2, 0, 0, .014, .12, .014); piece3(g, BOX, M('verre'), 0, -.02, .049, .2, 0, 0, .045, .04, .002); },
  cigare: h => { const t = h.tete; const c = new T.Group(); c.position.set(.026, -.072, .098); c.rotation.set(.15, .5, .1); t.add(c); piece3(c, CYL, M('bois:5a3a20'), 0, 0, .04, PI / 2, 0, 0, .014, .09, .014); const braise = new T.Mesh(new T.CircleGeometry(.007, 12), new T.MeshBasicMaterial({ color: new T.Color(2.5, .8, .2) })); braise.position.set(0, 0, .086); c.add(braise); },
  sacoches: h => { const s = h.B('spine05'); piece3(s, BOX, etoffe('cire', 0x7a7050), .2, -.06, .02, 0, .3, .05, .1, .26, .22); piece3(s, BOX, etoffe('cire', 0x6a6044), -.17, -.04, -.06, 0, -.4, -.05, .09, .18, .16); piece3(h.B('spine02'), BOX, M('cuir:4a3420'), .02, .0, .1, 0, 0, -.6, .03, .5, .006); piece3(h.B('spine02'), BOX, M('cuir:4a3420'), -.03, .02, -.11, 0, 0, .55, .03, .48, .006); },
  pochesCargo: h => { for (const s of ['L', 'R']) piece3(h.B('upperleg01.' + s), BOX, etoffe('tissu', 0x5a5a3a), (s === 'L' ? 1 : -1) * .075, -.25, .0, 0, 0, 0, .03, .13, .11); },
  ar70: h => { const g = main_(h, 'R'); const f = new T.Group(); f.rotation.set(-1.3, .1, 0); f.position.set(0, -.04, .05); g.add(f);
    piece3(f, BOX, MAT_NOIR, 0, 0, 0, 0, 0, 0, .045, .07, .32); piece3(f, CYL, MAT_NOIR, 0, .015, .3, PI / 2, 0, 0, .016, .3, .016); piece3(f, BOX, M('uni:2a2a24'), 0, .015, .2, 0, 0, 0, .05, .045, .16); piece3(f, BOX, MAT_NOIR, 0, -.08, .02, .25, 0, 0, .028, .14, .05); piece3(f, BOX, MAT_NOIR, 0, -.05, -.07, -.3, 0, 0, .025, .1, .035);
    piece3(f, BOX, M('fer'), 0, -.02, -.25, 0, 0, 0, .01, .02, .2); piece3(f, BOX, M('fer'), 0, -.06, -.33, 0, 0, 0, .012, .08, .012);
    const sg = new T.Mesh(new T.TorusGeometry(.05, .007, 6, 20), M('tissu:3a3a2a')); sg.rotation.y = PI / 2; sg.scale.set(1, 1, .7); h.B('lowerarm01.R').add(sg); const w = h.J('lowerarm01.R'); sg.position.set((w[3] - w[0]) * .55, (w[4] - w[1]) * .55, (w[5] - w[2]) * .55); },
  montre: h => { const w = h.J('lowerarm01.L'), g = new T.Group(); g.position.set((w[3] - w[0]) * .9, (w[4] - w[1]) * .9, (w[5] - w[2]) * .9); h.B('lowerarm01.L').add(g); const r = new T.Mesh(new T.TorusGeometry(.028, .006, 8, 24), M('cuir:1a1a1a')); r.rotation.set(PI / 2, 0, .8); g.add(r); piece3(g, CYL, MAT_CHROME, .0, .02, .025, PI / 2, 0, .8, .03, .008, .03); piece3(g, CYL, M('uni:e8e4d8'), .0, .02, .03, PI / 2, 0, .8, .025, .002, .025); },
  journalSilencieux: h => { const g = main_(h, 'R'); const r = piece3(g, CYL, MAT_JOURNAL, 0, -.06, .04, .1, 0, 0, .05, .3, .05); piece3(g, CYL, MAT_NOIR, 0, -.215, .055, .1, 0, 0, .022, .03, .022); },
  sacocheBandouliere: h => { const s = h.B('spine02'); piece3(s, BOX, M('uni:1a1a1c'), 0, -.02, .135, 0, 0, .75, .035, .62, .008); piece3(h.B('root'), BOX, etoffe('technique', 0x1e1e22), -.12, .05, .1, 0, -.3, 0, .2, .13, .06); piece3(h.B('root'), BOX, M('fer'), -.12, .1, .132, 0, -.3, 0, .17, .006, .004); },
  telephones: h => { for (const s of ['L', 'R']) { const g = main_(h, s); piece3(g, BOX, MAT_NOIR, 0, -.03, .03, .2, 0, 0, .072, .15, .008); piece3(g, BOX, M('verre'), 0, -.03, .035, .2, 0, 0, .066, .14, .002); } const g = main_(h, 'L'); piece3(g, BOX, MAT_CHROME, .04, -.1, .02, 0, 0, .3, .012, .04, .006); }
};

/* ---------- Les familles : dix personnages de la saga (galerie) ---------- */
const FAMILLES = [
  { nom: 'Don Calogero « U Viddanu »', lieu: 'Sicile, 1880 - 1910', texte: 'Gardien de domaine agricole devenu chef de clan lors de l’abolition de la féodalité. Visage buriné par le soleil de Corleone, rides profondes comme des crevasses, épaisse moustache en guidon poivre et sel. Velours côtelé marron, lourdes bottes crottées, la lupara toujours en bandoulière. Un regard habitué à régler les conflits terriens par le sang.',
    o: { silhouette: 'vieux', peau: 0x8e6044, rides: 1, cheveux: 0x8a8680, moustache: 0x6e6a64, guidon: true, chemise: 0xd8ccb0, tex: { veste: 'velours', pantalon: 'velours', gilet: 'velours' }, veste: 0x6a4a2e, gilet: 0x5a3e26, pantalon: 0x5e4228, bottes: 'crottees', chapeau: 'coppola', chapeauC: 0x3a2e24, yeux: 0x1a120a, visage: { machoire: 1, anguleux: .6 }, accessoires: [ACC.lupara] } },
  { nom: 'Carmela « La Lupa » Macrì', lieu: 'Calabre, 1920 - 1950', texte: 'Matriarche de la ’Ndrangheta, elle gère le clan d’une main de fer depuis l’ombre pendant que les hommes sont en prison. Le noir strict du deuil perpétuel, des cheveux blancs tirés en chignon sous un épais châle, une peau diaphane, des yeux noirs perçants. Entre ses doigts noueux, un chapelet de bois poli qu’elle égrène sans fin.',
    o: { femme: true, silhouette: 'vieille', robe: 0x0e0d0d, chemise: 0x121010, chapeau: 'scialle', chapeauC: 0x1c1a1a, epaisse: true, tex: { scialle: 'tricot' }, cheveux: 0xe8e4dc, coiffure: 'chignon', peau: 0xd6b6a2, yeux: 0x050403, rides: .55, visage: { jouesCreuses: .9, anguleux: 1 }, accessoires: [ACC.chapelet] } },
  { nom: 'Efisio « Le Loup de Bosa »', lieu: 'Sardaigne, 1950 - 1970', texte: 'Berger devenu roi des enlèvements de l’Anonima Sequestri, dans les montagnes escarpées. Barbe épaisse et négligée, mastruca, le manteau de berger en laine brute de brebis qui double sa silhouette, casquette plate tombante. Des mains marquées par le travail et, toujours, une resolza de Pattada au manche de corne sculpté.',
    o: { silhouette: 'fort', peau: 0xa0663e, barbe: 0x241810, barbeEpaisse: true, moustache: 0x241810, cheveux: 0x241810, chemise: 0xcfc6b0, pantalon: 0x3a3226, tex: { pantalon: 'velours' }, chapeau: 'coppolaTombante', chapeauC: 0x2a2420, rides: .35, accessoires: [ACC.mastruca, ACC.resolza] } },
  { nom: 'Vittorio « Le Baron » Di Stefano', lieu: 'Sicile, 1970 - 1985', texte: 'L’archétype du mafieux palermitain du boom de l’héroïne et de la première guerre des clans. Costume croisé à rayures sur mesure, lunettes d’aviateur fumées, épaisse chaîne en or sur une chemise ouverte et un torse velu, cheveux gominés en arrière. Sous l’aisselle, un revolver chromé dans un holster d’épaule en cuir rouge.',
    o: { peau: 0xc89268, cheveux: 0x0e0a08, coiffure: 'gomine', chemise: 0xe6dccc, ouvert: true, poils: true, veste: 0x262832, pantalon: 0x262832, tex: { veste: 'rayures', pantalon: 'rayures' }, longue: true, accessoires: [ACC.aviateurs, ACC.chaineOr, ACC.holster] } },
  { nom: 'Rocco « Il Vangelo » Morabito', lieu: 'Calabre, 1980 - 2000', texte: 'Le pont entre les montagnes de l’Aspromonte et les cartels colombiens. Physique imposant, nez cassé par d’anciennes bagarres, pull en cachemire coûteux sous une veste de chasse de luxe délavée. Il vit dans des bunkers cachés sous des bergeries en ruine, ne lâche jamais son téléphone satellite et porte l’archange Michel tatoué sur l’avant-bras droit.',
    o: { silhouette: 'fort', peau: 0xb88058, cheveux: 0x2a2018, visage: { nezCasse: 1, machoire: 1 }, chemise: 0xc8b090, tex: { chemise: 'tricot', veste: 'cire' }, veste: 0x4c4a32, epaisse: true, manches: true, tatouage: true, pantalon: 0x3a3a40, echelle: 1.03, accessoires: [ACC.telephoneSat] } },
  { nom: 'Salvatore « Totuccio » Vitiello', lieu: 'Sicile, 1943 - 1960', texte: 'Opportuniste du marché noir né du débarquement allié. Uniforme américain bricolé avec des vêtements civils usés : pantalon cargo olive, bretelles tendues sur un ventre bedonnant, fedora cabossé. Visage rond, luisant de sueur, un cigare bon marché coincé au coin des lèvres et de lourdes sacoches de toile qui lui pendent de travers.',
    o: { silhouette: 'gros', peau: 0xc89070, sueur: true, visage: { rond: 1.2 }, cheveux: 0x2a2018, chemise: 0x8a8460, manches: true, pantalon: 0x5a5a3a, ample: true, bretelles: true, chapeau: 'cabosse', chapeauC: 0x5a4a3a, accessoires: [ACC.cigare, ACC.sacoches, ACC.pochesCargo] } },
  { nom: 'Gavino « Su Ferru »', lieu: 'Sardaigne, 1980 - 1995', texte: 'Fugitif endurci des grottes calcaires du Supramonte, un spectre de la nature. Treillis de camouflage de l’armée italienne déchirés et rapiécés, énormes chaussures de montagne. Très grand, d’une maigreur cadavérique, les joues creuses et les yeux fiévreux de la paranoïa, un fusil d’assaut AR-70 volé, la sangle enroulée autour du bras.',
    o: { peau: 0xb08a6a, yeux: 0x3a2a1a, cheveux: 0x1e1610, barbe: 0x2a2018, visage: { jouesCreuses: 1.3, anguleux: .7 }, mince: true, echelle: 1.06, chemise: 0xffffff, pantalon: 0xf0f0f0, veste: 0xe8e8e8, tex: { chemise: 'camouflage', pantalon: 'camouflage', veste: 'camouflage' }, bottes: 'montagne', ample: true, accessoires: [ACC.ar70] } },
  { nom: 'Isabella « La Dottoressa » Greco', lieu: 'Sicile, 2000 - aujourd’hui', texte: 'Le visage de la Cosa Nostra moderne : col blanc, invisible des radars de la police. Avocate d’affaires, elle blanchit l’argent par des montages immobiliers internationaux. Tailleur-pantalon anthracite à la géométrie stricte, talons aiguilles, aucun bijou sauf une montre suisse compliquée. Traits lisses et froids, carré asymétrique parfaitement net.',
    o: { femme: true, peau: 0xe6c4a8, cheveux: 0x1a1210, coiffure: 'carre', chemise: 0xeeece8, veste: 0x34363a, pantalon: 0x34363a, bottes: 'talons', visage: { anguleux: .5 }, accessoires: [ACC.montre] } },
  { nom: 'Matteo « Ghost »', lieu: 'Calabre, 2015 - aujourd’hui', texte: 'La nouvelle génération de la ’Ndrangheta. Il ne touche jamais la marchandise : il coordonne les expéditions par des applications chiffrées. Streetwear de luxe, baskets massives, sweat technique à capuche, crâne rasé en dégradé, sacoche en bandoulière, une clé USB biométrique et deux smartphones sans coque.',
    pp: { capuche: 0x1e2024, baskets: true, accessoires: [ACC.sacocheBandouliere, ACC.telephones] } },
  { nom: 'Angelo « L’Ombre »', lieu: 'Sicile, 1990 - 2010', texte: 'Le tueur insaisissable de l’après-1992, quand la mafia a dû devenir totalement silencieuse. Un homme volontairement banal : coupe-vent beige, lunettes à monture fine, calvitie naissante. Seul détail qui trahit : une posture anormalement raide, mécanique. Dans un simple journal roulé, un pistolet au long silencieux artisanal.',
    o: { peau: 0xd2a684, cheveux: 0x3a3028, coiffure: 'recul', veste: 0xc4b08a, tex: { veste: 'technique' }, chemise: 0xdcd6c8, pantalon: 0x4a4a48, raideur: true, accessoires: [ACC.lunettesFines, ACC.journalSilencieux] } }
];

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
const J = { x: 48, z: 52, yaw: PI / 2, v: 0, endu: 1, epuise: false, dansChar: false, courir: false, h: humain(TURI), acte: 1 };
scene.add(J.h.g);
function habillerTuri(acte) {
  if (J.acte === acte) return;
  const par = J.h.g.parent; if (par) par.remove(J.h.g);
  J.h = humain(acte === 2 ? TURI2 : TURI); J.acte = acte; scene.add(J.h.g); J.h.g.position.set(J.x, solJ(J.x, J.z), J.z);
  if (J.dansChar) { J.dansChar = false; }
}
function placerJoueur(x, z, yaw) { if (J.dansChar) sortirChar(true); J.x = x; J.z = z; J.yaw = yaw; J.v = 0; J.h.g.position.set(x, solJ(x, z), z); J.h.g.rotation.y = yaw; CAM.yaw = yaw + PI; CAM.pret = false; majHerbe(x, z); }
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
    const fv = camera.aspect < 1 ? 40 : 25; if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
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
  if (etat === 'jeu' && PECHE.actif) return ferrer();
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
  acte2: `<p>Turi a trente-cinq ans. Donna Rosa est morte ; c’est lui, désormais, qui loue les jardins de Sant’Anna : le <i>gabellotto</i>. Il porte un costume de velours et tout le monde le salue le premier.</p>
<p>Il a épousé Concetta. Leur fils, Saro, a sept ans.</p>
<p>Mais les temps changent. L’État envoie des préfets et des carabiniers du Nord. Et chaque mois, des familles entières embarquent à Palerme sur les bateaux de citrons, vers la Nouvelle-Orléans.</p>
<p>Aujourd’hui, c’est la Santa Lucia : on mange la <i>cuccìa</i> et le village a sorti ses drapeaux.</p>`,
  histoire: `<ul>
<li>En 1863, une pièce de théâtre jouée à Palerme, <i>I mafiusi di la Vicaria</i>, rend populaire le mot « mafia ».</li>
<li>En 1876, Leopoldo Franchetti enquête en Sicile. Dans les jardins d’agrumes autour de Palerme, il décrit une véritable « industrie de la violence » : des gardiens qui organisent eux-mêmes les vols pour vendre ensuite leur protection.</li>
<li>L’eau des canaux d’irrigation, indispensable aux citronniers, était l’un de leurs moyens de pression.</li>
<li>Turi, Donna Rosa, Don Gaspare et le village de Santa Lucia sont inventés.</li>
</ul>`
};
const FINS = {
  amerique: { titre: 'L’autre rive', texte: `<p>Le vapeur quitte Palerme un matin de décembre, chargé de caisses de citrons et de familles entières. Turi regarde la Conca d’Oro disparaître.</p><p>À la Nouvelle-Orléans, il décharge les fruits de Sicile sur les quais du Mississippi. Il gagne peu, mais il gagne honnêtement. Saro apprend l’anglais plus vite que lui.</p><p>Un soir, un homme l’attend devant sa porte. Il parle sicilien. « Don Gaspare te salue. » La famille, elle aussi, a traversé l’océan.</p>`,
    histoire: `<ul><li>À partir des années 1870, des milliers de Siciliens partent pour la Nouvelle-Orléans, reliée à Palerme par le commerce des agrumes.</li><li>En 1890, le chef de la police de la ville, David Hennessy, est assassiné. Des Italiens sont accusés ; en 1891, onze d’entre eux sont lynchés par la foule, l’un des pires lynchages de l’histoire des États-Unis.</li><li>Entre 1880 et 1920, environ quatre millions d’Italiens émigrent vers les États-Unis.</li></ul>` },
  sicile: { titre: 'Le capo', texte: `<p>Turi reste. Nardo est condamné à dix ans de prison ; c’est Turi qui prend sa place auprès de Don Gaspare.</p><p>Concetta ne lui parle plus que pour le nécessaire. Saro grandit dans une maison où l’on baisse la voix quand un étranger passe.</p><p>À la mort de Don Gaspare, c’est à Turi qu’on vient baiser la main.</p>`,
    histoire: `<ul><li>Les grandes opérations de police des années 1870 démantèlent des bandes, mais les « familles » survivent : elles ont des amis parmi les propriétaires, les élus et les juges.</li><li>En 1893, Emanuele Notarbartolo, ancien maire de Palerme et directeur de la Banque de Sicile, est assassiné. C’est le premier grand crime politique attribué à la mafia ; le principal accusé, un député, sera finalement acquitté.</li></ul>` },
  silence: { titre: 'Le silence', texte: `<p>Donna Rosa a payé. Cette saison-là, plus rien n’a disparu du jardin, et l’eau est revenue dans les rigoles.</p><p>Les hommes de Don Gaspare sont devenus les « gardiens » de Sant’Anna. Une part de chaque récolte est partie vers la masseria sur la colline, et personne à Santa Lucia n’en a jamais parlé.</p><p>Un soir de l’année suivante, Nardo est revenu au baglio. Pas pour l’argent. Pour Turi.</p>` },
  temoin: { titre: 'Le témoin', texte: `<p>Turi a signé. Le brigadier Ruffo a ouvert un dossier, le premier au nom de Don Gaspare.</p><p>Trois semaines plus tard, le canal qui irriguait Sant’Anna a été coupé et les citronniers ont commencé à sécher. Personne n’est venu témoigner aux côtés de Turi. Le dossier a été classé, faute de preuves.</p><p>Mais il existe, quelque part dans un carton à Palerme. Et il porte un nom.</p>` },
  peur: { titre: 'La peur', texte: `<p>Turi n’a pas signé. Le brigadier a refermé son registre sans un mot.</p><p>Sur le chemin du retour, à l’entrée du baglio, une lanterne l’attendait. Nardo souriait.</p><p>Il savait déjà.</p>` }
};
const CHAPITRES = [
  { n: 'I', nom: 'Conca d’Oro', lieu: 'Sicile, 1861-1877 — les jardins de citronniers, la famille, le grand départ', jouable: true },
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

let ETAPE = null, chrono = null, distRetour = 1, FIGE = false, ACTE = 1, JOB = null;
const PRIX_PASSAGE = 120, LIBRES = ['a2_festa', 'a2_jours'];
SAUVE.lire = SAUVE.lire ?? 40; SAUVE.sale = SAUVE.sale ?? 0;
function gagner(n, quoi) { SAUVE.lire += n; sauver(); SON.bien(); toast(`+ ${n} lire — ${quoi}`); majArgent(); }
function majArgent() { const a = $('#argent'); a.hidden = ACTE !== 2; a.innerHTML = `<b>${SAUVE.lire}</b> lire d’argent propre` + (SAUVE.sale ? ` <span>· ${SAUVE.sale} de la famille</span>` : ''); }
const fige = () => { FIGE = true; };
const VOL = { pts: [[66, 69], [65.5, 79.5], [65.5, 100.5], [86.5, 100.5], [86.5, 121.5], [107.5, 121.5], [107.5, 142.5], [112, 160], [125, 185], [140, 205]], i: 1, parti: false, t: 0, pause: 0 };
let PATROUILLES = [];
let soupcon = 0;

const ABSENTS_1877 = ['pippo', 'rosa', 'gardien1', 'gardien2'];
function visibles(nuit) {
  for (const n of Object.values(PNJ)) {
    if (n.quand === 'scene') continue;
    n.h.g.visible = (n.quand === 'toujours' || (n.quand === 'jour' && !nuit)) && !(ACTE === 2 && ABSENTS_1877.includes(n.id));
  }
}
const ACTE2 = ['don', 'concetta', 'saro', 'carmelo', 'vanni', 'nardo2', 'marechal'];
function monde(acte) {
  ACTE = acte; FESTA.visible = acte === 2; habillerTuri(acte);
  for (const id of ACTE2) PNJ[id].h.g.visible = false;
  if (acte === 2) { for (const id of ['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo', 'pippo', 'rosa']) PNJ[id].h.g.visible = false; scene_(['don', 'concetta', 'saro', 'carmelo', 'vanni'], true); }
  majArgent();
}
function scene_(ids, on) { for (const id of ids) PNJ[id].h.g.visible = on; }
function poserPnj(id, x, z, rot) { const p = PNJ[id]; p.pos.set(x, solJ(x, z), z); p.h.g.rotation.y = rot ?? p.h.g.rotation.y; p.regarde = null; p.v = 0; }
function preparerPatrouilles(on, liste) {
  if (liste) PATROUILLES = liste;
  for (const p of TOUTES_PATROUILLES) { const v = on && PATROUILLES.includes(p); p.h.g.visible = v; p.cone.visible = v; }
}

const ETAPES = {
  intro: {
    setup() { monde(1); heure(.05); visibles(false); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); preparerPatrouilles(false); poserPnj('rosa', 72, 45.5, 0); poserPnj('pippo', 63, 56, -PI / 2); placerCharrette(66, 51, -PI / 2, 6); placerJoueur(46, 52, PI / 2); CUEILLETTE.forEach(c => { c.pris = false; c.g.visible = true; }); nbCueillis = 0; },
    debut() { Object.assign(SAUVE, { lire: 40, sale: 0, part: null, vuConcetta: false }); sauver(); carton('Chapitre I', 'Conca d’Oro<br>Sicile, 1861', TXT.intro, () => aller('pippo'), TXT.noteIntro); SON.theme(); }
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
            ['« Payez, Donna Rosa. On ne discute pas avec ces gens-là. »', () => dire([['Donna Rosa', '<em>(Elle baisse les yeux.)</em> Va bene. Sant’Anna paiera.'], ['Nardo', 'Sage décision, Donna Rosa.'], ['Nardo', '<em>(Il se tourne vers toi.)</em> Et toi, Turi… Don Gaspare aime les garçons qui ont du courage et qui savent se taire. Monte à la masseria. Ce soir.']], () => aller('masseria'))],
            ['« Ne payez rien. Je vais voir les carabiniers à Santa Lucia. »', () => dire([
              ['Nardo', '<em>(Il rit doucement.)</em> Les carabiniers… Va, alors, Turi Ferrante. Mais les routes sont sombres, la nuit.']
            ], () => fondu(() => aller('caserne')))]
          ] }
        ]);
      }
    }
  },
  masseria: {
    obj: () => 'Monte à la <b>masseria</b> de Don Gaspare, sur la colline.', cible: () => ({ x: 121, z: -31 }),
    setup() { ETAPES.poursuite.setup(); heure(2); visibles(true); scene_(['pippo'], false); placerJoueur(55, 50, -PI / 2); },
    prep() {
      heure(2); visibles(true); scene_(['toto', 'ruffo', 'pippo'], false); scene_(['nardo', 'campiere1', 'campiere2', 'don'], true);
      poserPnj('don', 121, -34.2, 0); poserPnj('nardo', 118.6, -33.6, .5); poserPnj('campiere1', 123.6, -33.4, -.4); poserPnj('campiere2', 125.6, -34.6, -.6);
    },
    maj() {
      if (dist(J, { x: 121, z: -30 }) < 6) {
        fige(); placerJoueur(121, -31.4, PI);
        const initiation = () => carton('La « punciuta »', 'Le serment', `<p>Le campiere pique le doigt de Turi avec une épine d’oranger amer. Une goutte de sang tombe sur l’image de la sainte. Don Gaspare l’enflamme et la pose dans ses mains.</p><p>« Que ma chair brûle comme cette image si je trahis la famille. »</p><p>Turi ne lâche l’image que lorsqu’elle n’est plus que cendre. Cette nuit-là, il devient un <i>uomo d’onore</i>, un homme d’honneur.</p>`,
          () => carton('Ce que l’histoire retient', 'Un rituel bien réel', `<ul><li>Dès les années 1870, des rapports de police décrivent ce rituel chez les « Stuppagghieri » de Monreale et les « Fratuzzi » de Bagheria, près de Palerme : piqûre du doigt, image sainte brûlée, serment de silence.</li><li>Les membres se disent « hommes d’honneur » et parlent de leur « famille ». Le mot « mafia » vient de l’extérieur ; « Cosa Nostra », « notre chose », ne se répandra qu’au XXᵉ siècle.</li></ul>`, () => charger('a2_intro')));
        dire([
          ['Don Gaspare', 'Avvicinati. Approche, Turi Ferrante. Ton père était un homme sérieux. On dit que tu l’es aussi.'],
          ['Don Gaspare', 'Tu as rattrapé le petit voleur. Tu n’as pas crié. Tu as rapporté la cassette. C’est bien.'],
          ['Don Gaspare', 'Ici, l’État est loin. Le roi est à Turin, les juges à Palerme. Nous, nous sommes là. Nous gardons les jardins, l’eau, les routes. Nous sommes une famille.'],
          ['Don Gaspare', 'Une famille a ses règles. On ne vole pas les siens. On ne touche pas à leurs femmes. Et surtout, on ne parle jamais. À personne.'],
          ['Turi', '…'],
          ['Don Gaspare', 'Ce soir, tu peux entrer dans la famille. Sache une chose : on y entre par le sang, et on n’en sort qu’avec lui.'],
          { question: '<em>Nardo pose une petite image de sainte sur le muret. Un campiere tient une épine d’oranger.</em>', choix: [
            ['Tendre la main.', initiation],
            ['Garder le silence.', () => dire([['Don Gaspare', 'Le silence… C’est déjà une réponse, figlio mio. Donne-moi ta main.']], initiation)]
          ] }
        ]);
      }
    }
  },
  a2_intro: {
    setup() { monde(2); heure(.12); visibles(false); placerCharrette(66, 51, -PI / 2, 0); placerJoueur(64.5, 49.5, PI / 2); poserPositions1877(); },
    debut() { SON.theme(); carton('Seize ans plus tard', 'Santa Lucia<br>13 décembre 1877', TXT.acte2, () => aller('a2_festa'), 'Le drapeau rouge et jaune à la Trinacria reprend les couleurs des Vêpres siciliennes de 1282 ; il est devenu le drapeau officiel de la Région sicilienne en 2000.'); }
  },
  a2_festa: {
    obj: () => `Fête de Santa Lucia. <b>Don Gaspare</b> t’attend sur la place.<br><span style="color:var(--fumee)">Travaux honnêtes : points verts sur la carte.</span>`, cible: () => PNJ.don.pos,
    setup() { ETAPES.a2_intro.setup(); },
    debut() {
      if (SAUVE.vuConcetta) return; SAUVE.vuConcetta = true; sauver();
      dire([
        ['Concetta', 'Turi… Mon frère a écrit de la Nouvelle-Orléans. Il décharge les citrons de Palerme sur le port. Il dit qu’il y a du travail pour tout le monde.'],
        ['Concetta', `Le passage coûte ${PRIX_PASSAGE} lire pour nous trois. Pas avec l’argent de Don Gaspare : avec de l’argent propre.`],
        ['Turi', 'On verra, Concetta. Aujourd’hui, c’est la fête.'],
        ['Concetta', 'Carmelo cherche des bras au jardin, et Zu Vanni achète le poisson au port. Réfléchis.']
      ], () => aide('Parle à <b>Carmelo</b> (baglio) ou à <b>Zu Vanni</b> (port) pour gagner de l’argent honnête.', 7000));
    }
  },
  a2_part: { obj: () => 'Va chercher la part de <b>Mastro Nunzio</b> au marché.', cible: () => PNJ.nunzio.pos, setup() { ETAPES.a2_intro.setup(); placerJoueur(-88, -68, PI / 2); } },
  a2_retourDon: { obj: () => 'Apporte la part à <b>Don Gaspare</b>.', cible: () => PNJ.don.pos, setup() { ETAPES.a2_intro.setup(); placerJoueur(-76, -65, -PI / 2); } },
  a2_rafle: {
    setup() { ETAPES.a2_intro.setup(); },
    prep() {
      heure(2); visibles(true); scene_(['don', 'nardo2', 'marechal'], true); scene_(['concetta', 'saro', 'carmelo', 'vanni'], false);
      poserPnj('don', -91.5, -72, PI / 2); poserPnj('nardo2', -89.5, -74.2, .8); poserPnj('marechal', -84.5, -66.5, -2.4); placerJoueur(-87.5, -70.5, -PI / 2 - .3);
      preparerPatrouilles(true, PAT_CARA); PATROUILLES.forEach(p => { const a = p.pts[0]; p.pos.set(a[0], H(a[0], a[1]), a[1]); p.i = 0; p.attente = 0; });
    },
    debut() {
      dire([
        ['Le maréchal', 'Au nom du Roi ! Que personne ne bouge !'],
        ['Le maréchal', 'Leonardo Nicosia, dit Nardo. Vous êtes en état d’arrestation. Et vous… Salvatore Ferrante ?'],
        ['Nardo', '<em>(Il bouscule le maréchal.)</em> Turi ! Ils ont la liste ! File par les ruelles, rentre à Sant’Anna !'],
        ['Don Gaspare', '<em>(Sans bouger de son banc.)</em> Va, figlio mio. Et souviens-toi : tu n’as rien vu.']
      ], () => charger('a2_fuite'));
    }
  },
  a2_fuite: {
    furtif: true, repere: { qui: 'Un carabinier', txt: 'Halte ! Au nom du Roi ! C’est lui, c’est Ferrante !', msg: 'Les carabiniers t’ont arrêté.' },
    obj: () => 'Échappe aux <b>carabiniers</b> par les ruelles et rejoins le baglio Sant’Anna.', cible: () => L.porte,
    setup() { ETAPES.a2_intro.setup(); },
    prep() {
      heure(2); visibles(true); scene_(['don', 'nardo2', 'marechal', 'concetta', 'saro', 'carmelo', 'vanni'], false);
      placerJoueur(-89, -58.6, PI); preparerPatrouilles(true, PAT_CARA); soupcon = 0;
      PATROUILLES.forEach(p => { p.i = 0; p.attente = 0; const a = p.pts[0]; p.pos.set(a[0], H(a[0], a[1]), a[1]); });
      scene_(['concetta', 'saro'], true); poserPnj('concetta', 57.6, 49.6, -PI / 2); poserPnj('saro', 58.2, 51, -PI / 2);
    },
    debut() { aide('Les carabiniers fouillent le village. Passe entre les maisons au nord de la place, évite leurs lanternes et ne cours pas près d’eux.', 8000); },
    maj(dt) { majPatrouilles(dt); if (dist(J, L.porte) < 8) { fige(); charger('a2_choix'); } }
  },
  a2_choix: {
    obj: () => 'Parle à <b>Concetta</b>.', cible: () => PNJ.concetta.pos,
    setup() { ETAPES.a2_intro.setup(); heure(2); visibles(true); scene_(['don', 'carmelo', 'vanni'], false); poserPnj('concetta', 57.6, 49.6, -PI / 2); poserPnj('saro', 58.2, 51, -PI / 2); placerJoueur(55.4, 50.4, PI / 2); },
    debut() { decision(true); }
  },
  a2_jours: {
    obj: () => `Gagne encore <b>${Math.max(0, PRIX_PASSAGE - SAUVE.lire)}</b> lire honnêtes, puis retrouve <b>Concetta</b> au baglio.`, cible: () => PNJ.concetta.pos,
    setup() { ETAPES.a2_intro.setup(); scene_(['don'], false); placerJoueur(64.5, 49.5, PI / 2); },
    debut() { aide('Quelques jours ont passé. Les carabiniers ont relâché la surveillance. Travaille, puis retourne voir Concetta.', 7000); }
  },
  caserne: {
    furtif: true, repere: { qui: 'Un campiere', txt: 'Ehi ! Turi Ferrante… Où tu vas comme ça, à cette heure ? Rentre chez toi. Tout de suite.', msg: 'Les campieri t’ont reconduit au baglio.' },
    obj: () => 'Rejoins la <b>caserne des carabiniers</b> de Santa Lucia sans te faire repérer.', cible: () => L.porteCaserne,
    setup() { ETAPES.poursuite.setup(); },
    prep() {
      heure(2); visibles(true); scene_(['toto', 'nardo', 'campiere1', 'campiere2', 'ruffo'], false); poserPnj('rosa', 72, 45.5, 0); scene_(['pippo'], false);
      placerJoueur(55, 50, -PI / 2); preparerPatrouilles(true, PAT_CAMPIERI); soupcon = 0;
      PATROUILLES.forEach(p => { p.i = 0; p.t = 0; p.attente = 0; const a = p.pts[0]; p.pos.set(a[0], H(a[0], a[1]), a[1]); });
    },
    debut() { aide('Les campieri patrouillent avec des lanternes. Reste hors de leur lumière et ne cours pas près d’eux. Les champs sont plus sûrs que la route.', 8000); },
    maj(dt) { majPatrouilles(dt); }
  }
};
function aller(id) {
  ETAPE = id; FIGE = false; const e = ETAPES[id]; if (id !== 'intro') { SAUVE.etape = id; sauver(); }
  chrono = null; JOB = null; UI.chrono.hidden = true; UI.soupcon.hidden = !e.furtif; if (!e.furtif) preparerPatrouilles(false);
  e.prep && e.prep(); etat = etat === 'carton' || etat === 'dialogue' ? etat : 'jeu';
  if (etat === 'jeu') UI.hud.hidden = false;
  e.debut && e.debut();
  majObjectif();
}
function charger(id) { if (ETAPES[id].reprise) id = ETAPES[id].reprise; etat = 'jeu'; ETAPES[id].setup && ETAPES[id].setup(); aller(id); }
function majObjectif() { const e = ETAPES[ETAPE]; if (!e || !e.obj) return; let t = JOB ? JOB.obj() : e.obj(); const c = JOB ? JOB.cible() : e.cible && e.cible(); if (c) { const ici = J.dansChar ? CHAR : J; t += ` <span style="color:var(--fumee)">· ${Math.round(dist(ici, c))} m</span>`; } if (UI.objTxt.dataset.t !== t) { UI.objTxt.dataset.t = t; UI.objTxt.innerHTML = t; } }
function echec(msg, id) {
  if (etat === 'transition') return; etat = 'transition'; fige(); chrono = null; SON.rate(); toast(msg, true, 3200);
  setTimeout(() => fondu(() => { charger(id); toast('Dernier point de passage', false, 1800); }), 1400);
}
function finir(cle) {
  etat = 'transition'; fige(); const f = FINS[cle]; if (!SAUVE.fins.includes(cle)) SAUVE.fins.push(cle); SAUVE.etape = null; sauver();
  preparerPatrouilles(false); UI.soupcon.hidden = true;
  fondu(() => {
    SON.theme();
    carton('Fin du chapitre I', f.titre, f.texte + (SAUVE.part === 'payee' && cle !== 'temoin' ? '<p>Personne n’a jamais su que Turi avait payé de sa poche la part du vieux Nunzio.</p>' : ''), () => carton('Ce que l’histoire retient', cle === 'temoin' ? 'Sicile, 1861-1876' : cle === 'amerique' ? 'De Palerme à la Nouvelle-Orléans' : 'Sicile, 1877-1893', f.histoire || TXT.histoire, () => carton('À suivre', 'Chapitre II<br>Les mines de Buggerru', `<p>Sardaigne, 1904. Le petit-fils de Turi descend chaque matin dans une mine de zinc, au bord de la mer.</p><p>Fins découvertes : <b>${SAUVE.fins.length} sur 3</b>. Rejoue le chapitre pour faire un autre choix.</p>`, () => retourMenu())));
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
CUEILLETTE.forEach(c => inter({ pos: () => c, r: 2.5, si: () => !c.pris && (ETAPE === 'cueillir' || (JOB && JOB.type === 'cueillette' && !JOB.plein)), lib: () => 'Cueillir', faire() {
  c.pris = true; c.g.visible = false; SON.cueille();
  if (JOB) { JOB.n++; if (JOB.n >= 8) { JOB.plein = true; SON.bien(); toast('Le panier est plein'); } majObjectif(); return; }
  nbCueillis++; majObjectif();
  if (nbCueillis >= 8) { SON.bien(); toast('Le panier est plein'); aller('rapporter'); }
} }));
inter({ pos: () => CHAR, r: 4.2, touche: 'F', si: () => !J.dansChar && !['poursuite', 'cassette', 'masseria', 'a2_rafle', 'a2_choix'].includes(ETAPE), lib: () => 'Monter sur le carretto', faire() {
  monterChar(); if (ETAPE === 'monter') aller('livrer');
} });
inter({ pos: () => PNJ.nunzio.pos, r: 2.6, si: () => PNJ.nunzio.h.g.visible && ACTE === 1 && ETAPE !== 'livrer', lib: () => 'Parler à Mastro Nunzio', faire() { dire([['Mastro Nunzio', ETAPE === 'retour' ? 'Tu es encore là ? Rentre, Turi. La nuit, les routes ne sont à personne.' : 'Pas de citrons, pas de tarì. Reviens avec la récolte de Sant’Anna.']]); } });
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
      ['« …Je ne peux pas. »', () => dire([['Le brigadier Ruffo', 'Alors rentre chez toi, garçon. Et que Dieu te garde.']], () => fondu(() => { placerJoueur(-93.5, -69.5, PI / 2); scene_(['ruffo'], false); scene_(['nardo'], true); poserPnj('nardo', -90.5, -69.8, -PI / 2); dire([['Nardo', '<em>(Une lanterne s’approche dans le noir.)</em> Les carabiniers, Turi… Tu vois bien : ici, ils ne servent à rien. Nous, si.'], ['Nardo', 'Don Gaspare veut te voir. Maintenant. Suis-moi à la masseria, et ne le fais pas attendre.']], () => aller('masseria')); }))]
    ] }
  ]);
} });
for (const n of Object.values(PNJ)) if (n.figurant) inter({ pos: () => n.pos, r: 2.2, si: () => n.h.g.visible && etat === 'jeu', lib: () => 'Parler', faire() { dire([['Un habitant', n.repliques[0]]]); } });

/* ---------- Travaux honnêtes (1877) : cueillette, livraisons en carretto, pêche ---------- */
const libre_ = () => ACTE === 2 && LIBRES.includes(ETAPE);
const DESTS = [{ nom: 'le marché de Santa Lucia', x: -75, z: -63, qui: 'Mastro Nunzio' }, { nom: 'le port', x: -73.5, z: -131, qui: 'Zu Vanni' }];
let numLivraison = 0;
function lancerCueillette() {
  CUEILLETTE.forEach(c => { c.pris = false; c.g.visible = true; });
  JOB = { type: 'cueillette', n: 0, obj: () => JOB.plein ? 'Rapporte les citrons à <b>Carmelo</b>.' : `Cueille 8 citrons pour Carmelo : <b>${JOB.n}/8</b>`, cible: () => JOB.plein ? PNJ.carmelo.pos : CUEILLETTE.filter(c => !c.pris).sort((a, b) => dist(a, J) - dist(b, J))[0] };
  aide('Les citrons mûrs brillent dans les rangées du sud.', 4000);
}
function lancerLivraison() {
  const d = DESTS[numLivraison++ % DESTS.length];
  placerCharrette(66, 51, -PI / 2, 6);
  JOB = { type: 'livraison', d, obj: () => `Livre les cagettes à <b>${d.nom}</b>. Cagettes : <b>${CHAR.nb}/6</b>`, cible: () => d };
  chrono = { reste: 110, job: true, echec: 'Trop tard : le client a acheté ailleurs.' };
  aide('Monte sur le carretto (F). Chaque choc fait tomber une cagette, et chaque cagette compte.', 5000);
}
function lancerPeche() { JOB = { type: 'peche', n: 0, essais: 0, obj: () => JOB.fini ? `Vends ta pêche à <b>Zu Vanni</b> : <b>${JOB.n}</b> poisson${JOB.n > 1 ? 's' : ''}.` : `Va au bout de la jetée et pêche : <b>${JOB.essais}/6</b> lancers.`, cible: () => JOB.fini ? PNJ.vanni.pos : { x: -76, z: -152.5 } }; }
const PECHE = { actif: false, t: 0, zone: .5, larg: .18, vitesse: 1.2 };
function lancerLigne() { Object.assign(PECHE, { actif: true, t: 0, zone: .2 + R() * .6, larg: .2 - JOB.essais * .015 }); $('#peche').hidden = false; const z = $('#peche .zone'); z.style.left = (PECHE.zone - PECHE.larg / 2) * 100 + '%'; z.style.width = PECHE.larg * 100 + '%'; }
function ferrer() {
  const pos = (Math.sin(PECHE.t * PECHE.vitesse * (1 + JOB.essais * .18)) + 1) / 2;
  const ok = Math.abs(pos - PECHE.zone) < PECHE.larg / 2; JOB.essais++;
  if (ok) { JOB.n++; SON.cueille(); toast(['Une dorade !', 'Un beau rouget !', 'Un pageot !', 'Une sardine… mais grosse.'][(R() * 4) | 0]); } else toast('Raté… le poisson a filé.');
  PECHE.actif = false; $('#peche').hidden = true;
  if (JOB.essais >= 6) { JOB.fini = true; aide('Rapporte ta pêche à Zu Vanni.', 3000); }
}
inter({ pos: () => PNJ.carmelo.pos, r: 2.6, si: () => PNJ.carmelo.h.g.visible && libre_(), lib: () => 'Parler à Carmelo', faire() {
  if (JOB && JOB.type === 'cueillette' && JOB.plein) { JOB = null; return dire([['Carmelo', 'Huit beaux citrons. Tiens, c’est ton dû : pas un centesimo de plus, pas un de moins.']], () => gagner(8, 'cueillette')); }
  if (JOB) return dire([['Carmelo', 'Finis d’abord ce que tu as commencé, don Turi.']]);
  dire([['Carmelo', 'Don Turi ! Vous voulez vraiment travailler comme un journalier, un jour de fête ? <em>(Il sourit.)</em> Il y a toujours à faire.'],
    { qui: 'Turi', question: 'Que proposer à Carmelo ?', choix: [['Cueillir des citrons au jardin (8 lire).', lancerCueillette], ['Livrer six cagettes en carretto (10 lire, plus 2 par cagette intacte).', lancerLivraison], ['Plus tard.', () => {}]] }]);
} });
inter({ pos: () => PNJ.vanni.pos, r: 2.6, si: () => PNJ.vanni.h.g.visible && libre_(), lib: () => 'Parler à Zu Vanni', faire() {
  if (JOB && JOB.type === 'peche' && JOB.fini) { const n = JOB.n; JOB = null; return dire([['Zu Vanni', n ? `${n} poisson${n > 1 ? 's' : ''}. Trois lire chacun, c’est le prix du marché.` : 'Rien ? La mer ne donne qu’à ceux qui savent attendre, figlio.']], () => n && gagner(3 * n, 'pêche')); }
  if (JOB) return dire([['Zu Vanni', 'Tu as déjà un travail sur les bras.']]);
  dire([['Zu Vanni', 'Le gabellotto de Sant’Anna qui veut pêcher ! Prends ma ligne. Le poisson, je te l’achète trois lire pièce.'], { qui: 'Turi', question: 'Pêcher avec Zu Vanni ?', choix: [['Prendre la ligne.', () => { lancerPeche(); aide('Au bout de la jetée : appuie sur E quand le curseur passe dans la zone dorée.', 6000); }], ['Plus tard.', () => {}]] }]);
} });
inter({ pos: () => ({ x: -76, z: -152.5 }), r: 2.4, si: () => JOB && JOB.type === 'peche' && !JOB.fini && !PECHE.actif, lib: () => 'Lancer la ligne', faire() { lancerLigne(); } });
inter({ pos: () => PNJ.concetta.pos, r: 2.6, si: () => PNJ.concetta.h.g.visible && ACTE === 2 && ETAPE !== 'a2_choix', lib: () => 'Parler à Concetta', faire() {
  if (ETAPE === 'a2_jours') return decision(false);
  const m = Math.max(0, PRIX_PASSAGE - SAUVE.lire);
  dire([['Concetta', m ? `Il nous manque ${m} lire pour le passage. De l’argent propre, Turi.` : 'Nous avons de quoi payer le passage. Il suffirait d’un mot de toi.']]);
} });
inter({ pos: () => PNJ.saro.pos, r: 2, si: () => PNJ.saro.h.g.visible && ACTE === 2, lib: () => 'Parler à Saro', faire() { dire([['Saro', ['Papà, c’est vrai qu’en Amérique les maisons touchent le ciel ?', 'Tout le monde te salue, papà. Pourquoi ils baissent les yeux ?', 'Je peux avoir de la cuccìa ?'][(R() * 3) | 0]]]); } });
inter({ pos: () => PNJ.don.pos, r: 2.8, si: () => PNJ.don.h.g.visible && ACTE === 2 && (ETAPE === 'a2_festa' || ETAPE === 'a2_retourDon'), lib: () => 'Parler à Don Gaspare', faire() {
  if (ETAPE === 'a2_festa') dire([
    ['Don Gaspare', 'Turi ! Viens, assieds-toi. Regarde-les : toute la Conca est là. Et tout ce que tu vois, c’est un peu à nous.'],
    ['Don Gaspare', 'Le nouveau maréchal des carabiniers vient de Turin. Il pose des questions. Il paraît qu’il a une liste.'],
    ['Don Gaspare', 'Les listes, ça se perd. En attendant, les affaires continuent. Va chercher la part de Mastro Nunzio, au marché. Il est en retard.']
  ], () => aller('a2_part'));
  else dire([
    ['Don Gaspare', 'Bravo. Tu vois, ce n’est pas difficile.'],
    ['Don Gaspare', '<em>(Il glisse une enveloppe dans ta veste.)</em> Ta part. Trente lire. La famille n’oublie pas les siens.'],
    ['Don Gaspare', 'Ce soir, il y a la procession. Reste près de moi.']
  ], () => { SAUVE.sale += 30; sauver(); majArgent(); fondu(() => charger('a2_rafle')); });
} });
inter({ pos: () => PNJ.nunzio.pos, r: 3.6, si: () => PNJ.nunzio.h.g.visible && ETAPE === 'a2_part', lib: () => 'Réclamer la part', faire() {
  const peut = SAUVE.lire >= 15;
  dire([
    ['Mastro Nunzio', '<em>(Le vieil homme compte les pièces sans te regarder.)</em> Quinze lire. C’est tout ce que j’ai vendu cette semaine.'],
    ['Mastro Nunzio', 'Tu te souviens, Turi ? Tu avais dix-neuf ans, tu m’apportais les citrons de Donna Rosa. Tu m’as demandé : « Quelle part ? »'],
    ['Mastro Nunzio', 'Maintenant, c’est toi qui viens la prendre.'],
    { question: '<em>Les pièces sont sur l’étal.</em>', choix: [
      ['Prendre la part pour Don Gaspare.', () => { SAUVE.part = 'prise'; sauver(); aller('a2_retourDon'); }],
      [peut ? 'Laisser ses pièces à Nunzio et payer la part de ta poche (15 lire).' : 'Payer de ta poche… il te faudrait 15 lire d’argent propre.', () => {
        if (!SAUVE.lire || SAUVE.lire < 15) { toast('Il te faut 15 lire d’argent propre.', true); return dire([['Turi', '<em>(Tu ramasses les pièces en silence.)</em>']], () => { SAUVE.part = 'prise'; sauver(); aller('a2_retourDon'); }); }
        SAUVE.lire -= 15; SAUVE.part = 'payee'; sauver(); majArgent();
        dire([['Mastro Nunzio', '<em>(Il te regarde enfin.)</em> … Grazie, Turi. Ton père aurait compris.']], () => aller('a2_retourDon'));
      }]
    ] }
  ]);
} });
function decision(premiere) {
  const manque = Math.max(0, PRIX_PASSAGE - SAUVE.lire);
  const lignes = premiere ? [
    ['Concetta', 'Turi ! Ils sont venus ici aussi. Ils ont tout fouillé. Ils ont demandé où tu étais.'],
    ['Concetta', 'Le bateau pour la Nouvelle-Orléans part de Palerme dans trois jours. C’est maintenant ou jamais.'],
    ['Turi', '<em>(Saro s’est endormi contre l’épaule de sa mère.)</em>']
  ] : [['Concetta', 'Alors, Turi ?']];
  if (SAUVE.sale) lignes.push(['Concetta', `Et l’enveloppe de Don Gaspare, tu la gardes. Je ne monterai pas sur ce bateau avec l’argent de la famille.`]);
  lignes.push({ question: `<em>Tu as ${SAUVE.lire} lire d’argent propre. Le passage pour trois en coûte ${PRIX_PASSAGE}.</em>`, choix: [
    manque ? [`Se cacher quelques jours et gagner les ${manque} lire qui manquent.`, () => fondu(() => charger('a2_jours'))] : ['Partir pour la Nouvelle-Orléans avec Concetta et Saro.', () => { SAUVE.lire -= PRIX_PASSAGE; sauver(); finir('amerique'); }],
    ['Rester en Sicile et prendre la place de Nardo.', () => finir('sicile')]
  ] });
  dire(lignes);
}

/* Patrouilles de nuit (étape « caserne ») */
function cone(portee, demi) {
  const v = [], n = 14; for (let i = 0; i < n; i++) { const a = -demi + 2 * demi * i / n, b = -demi + 2 * demi * (i + 1) / n; v.push(0, 0, 0, Math.sin(b) * portee, 0, Math.cos(b) * portee, Math.sin(a) * portee, 0, Math.cos(a) * portee); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  const m = new T.Mesh(g, new T.MeshBasicMaterial({ color: 0xffc860, transparent: true, opacity: .07, depthWrite: false, side: T.DoubleSide, fog: false })); m.renderOrder = 2; scene.add(m); return m;
}
const TOUTES_PATROUILLES = [];
function creerPatrouilles(pref, nom, habit) {
  return [[[24, 41], [8, 25]], [[-16, -6], [-33, -42]], [[-46, -60], [-46, -92]], 'rond'].map((pts, i) => {
    const rond = pts === 'rond';
    const pp = rond ? Array.from({ length: 10 }, (_, k) => [L.village.x + Math.cos(k / 10 * PI * 2) * 9, L.village.z - 2 + Math.sin(k / 10 * PI * 2) * 9]) : pts;
    const p = pnj(pref + i, nom, habit(i), pp[0][0], pp[0][1], 0, 'scene');
    p.patrouille = true; p.pts = pp; p.boucle = rond; p.i = 0; p.sens = 1; p.attente = 0; p.portee = rond ? 12 : 15; p.demi = .62;
    p.cone = cone(p.portee, p.demi); p.lumiere = lampe(0, 1.2, .3, p.h.g);
    p.h.g.visible = false; p.cone.visible = false; TOUTES_PATROUILLES.push(p); return p;
  });
}
const PAT_CAMPIERI = creerPatrouilles('pat', 'Un campiere', i => ({ veste: [0x3f3a2a, 0x2f3a33, 0x3a3a30, 0x4a3a2a][i], pantalon: 0x2e2a24, chapeau: i % 2 ? 'feutre' : 'coppola', chapeauC: 0x2a2620, lupara: true, lanterne: true }));
const PAT_CARA = creerPatrouilles('car', 'Un carabinier', i => ({ veste: 0x1a2232, chemise: 0x1a2232, pantalon: 0x1a2232, chapeau: 'lucerna', moustache: i % 2 ? 0x3a2a1a : true, cheveux: 0x2a1d12, ceinture: 0xe8e2d0, lupara: true, lanterne: true, peau: [0xd9ad88, 0xc8946a, 0xe0b898, 0xc08660][i] }));
PATROUILLES = PAT_CAMPIERI;
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
    const r = ETAPES[ETAPE].repere;
    setTimeout(() => dire([[r.qui, r.txt]], () => echec(r.msg, ETAPE)), 500);
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
  if (PECHE.actif) { J.v = 0; animer(J.h, dt, 0); return; }
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
  J.h.g.position.set(J.x, solJ(J.x, J.z), J.z); J.h.g.rotation.y = J.yaw;
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
      if (Math.abs(CHAR.v) > 4.2 && CHAR.cooldown <= 0 && CHAR.nb > 0 && (ETAPE === 'livrer' || (JOB && JOB.type === 'livraison'))) { CHAR.nb--; CHAR.caisses[CHAR.nb].visible = false; CHAR.cooldown = 1.2; SON.choc(); CAM.secousse = .35; toast('Une cagette est tombée !', true, 1500); majObjectif(); }
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
    if (!n.h.g.visible || n.patrouille) { if (n.patrouille && n.h.g.visible) animer(n.h, dt, n.v); continue; }
    if (n.id === 'toto' && ETAPE === 'poursuite') { animer(n.h, dt, n.v); continue; }
    const proche = dist(n.pos, J) < 3.2 && !J.dansChar;
    if (n.trajet && !proche && etat === 'jeu') {
      if (n.attente > 0) { n.attente -= dt; n.v = 0; }
      else { const c = n.trajet[n.ti], dx = c[0] - n.pos.x, dz = c[1] - n.pos.z, l = Math.hypot(dx, dz); if (l < .5) { n.ti = (n.ti + 1) % n.trajet.length; n.attente = 1.5 + R() * 3; } else { n.pos.x += dx / l * 1.2 * dt; n.pos.z += dz / l * 1.2 * dt; n.h.g.rotation.y += ecartAngle(n.h.g.rotation.y, Math.atan2(dx, dz)) * Math.min(1, dt * 5); n.v = 1.2; } }
      n.pos.y = solJ(n.pos.x, n.pos.z);
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
  if (ETAPES[ETAPE] && ETAPES[ETAPE].furtif) for (const p of PATROUILLES) { const [x, y] = P(p.pos.x, p.pos.z); mini.fillStyle = '#b8402e'; mini.beginPath(); mini.arc(x, y, 6, 0, 7); mini.fill(); }
  const e = ETAPES[ETAPE], c = JOB && etat === 'jeu' ? JOB.cible() : e && e.cible && etat === 'jeu' ? e.cible() : null;
  if (libre_() && !JOB) for (const id of ['carmelo', 'vanni']) { const [x, y] = P(PNJ[id].pos.x, PNJ[id].pos.z); mini.fillStyle = '#6fbf6a'; mini.strokeStyle = '#15110c'; mini.lineWidth = 3; mini.beginPath(); mini.arc(clamp(x, 14, W - 14), clamp(y, 14, W - 14), 8, 0, 7); mini.fill(); mini.stroke(); }
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
<dt>ZQSD · WASD · flèches</dt><dd>Marcher, conduire</dd><dt>Souris</dt><dd>Regarder (clique pour la capturer)</dd><dt>Maj</dt><dd>Sprinter</dd><dt>E</dt><dd>Parler, agir</dd><dt>F</dt><dd>Monter, descendre du carretto</dd><dt>Espace</dt><dd>Faire avancer un dialogue</dd><dt>1 · 2 · 3</dt><dd>Choisir une réponse</dd><dt>E à la pêche</dt><dd>Ferrer le poisson</dd><dt>Échap</dt><dd>Pause</dd></dl></div>
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
const NOMS_ETAPES = { masseria: 'La masseria', a2_intro: '1877', a2_festa: 'La Santa Lucia', a2_part: 'La part', a2_retourDon: 'La part', a2_rafle: 'La rafle', a2_fuite: 'La rafle', a2_choix: 'Le choix', a2_jours: 'Le choix', pippo: 'Le baglio', cueillir: 'La cueillette', rapporter: 'La cueillette', monter: 'Le marché', livrer: 'Le marché', retour: 'Le retour', poursuite: 'Le voleur', cassette: 'La visite', caserne: 'La nuit' };
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
$('#m-commandes').onclick = () => { SON.init(); panneau('<h2>Commandes</h2>' + COMMANDES + CREDITS, [['Retour', fermerPanneau]]); };
const CREDITS = `<h3 style="font-family:var(--etiquette);letter-spacing:.18em;text-transform:uppercase;font-size:13px;color:var(--citron);margin:28px 0 10px;font-weight:400">Crédits</h3><p style="color:var(--fumee);font-size:14px;line-height:1.6;margin:0">Corps humains : MakeHuman (makehumancommunity.org), données publiées dans le domaine public (CC0) ; vêtements, peau et animations ajoutés par le jeu. Moteur : three.js (licence MIT). Polices : Cormorant, Bitter, Oswald (SIL Open Font License). Tout le reste (décors, matières, personnages, sons) est fabriqué par le programme du jeu.</p>`;
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



/* ---------- Galerie des familles : plateau, projecteur, personnage qui tourne ---------- */
const GAL = { scene: new T.Scene(), cam: new T.PerspectiveCamera(28, 1, .1, 60), i: 0, cache: {}, rot: 0, glisse: null, actuel: null };
(() => {
  const s = GAL.scene; s.background = new T.Color(0x15110d); s.fog = new T.Fog(0x15110d, 7, 16);
  const sol = new T.Mesh(new T.CircleGeometry(6, 64), M('paves:7a6e5a')); sol.rotation.x = -PI / 2; sol.receiveShadow = true; s.add(sol);
  const spot = new T.SpotLight(0xffe0b8, 90, 14, .45, .55, 1.6); spot.position.set(2.4, 4.8, 3.2); spot.target.position.set(0, .9, 0); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.0004; spot.shadow.normalBias = .02; s.add(spot, spot.target);
  const rim = new T.DirectionalLight(0x8fb0ff, 2.2); rim.position.set(-2.5, 2.8, -3.5); s.add(rim);
  const fill = new T.DirectionalLight(0xffd8b0, .5); fill.position.set(-3, 1.5, 2.5); s.add(fill);
  s.add(new T.HemisphereLight(0xfff0e0, 0x1a140e, .35));
})();
function ouvrirGalerie() { SON.init(); etat = 'galerie'; UI.menu.hidden = true; fermerPanneau(); $('#galerie').hidden = false; GAL.scene.environment = scene.environment; GAL.scene.environmentIntensity = .45; montrerFamille(GAL.i); }
function fermerGalerie() { $('#galerie').hidden = true; retourMenu(); }
function montrerFamille(i) {
  GAL.i = (i + FAMILLES.length) % FAMILLES.length; const f = FAMILLES[GAL.i];
  if (GAL.actuel) GAL.scene.remove(GAL.actuel.g);
  let h = GAL.cache[GAL.i];
  if (!h) { h = f.pp && PP ? humainPP(f.pp) : humain(f.o || {}); GAL.cache[GAL.i] = h; }
  GAL.actuel = h; GAL.scene.add(h.g); h.g.position.set(0, 0, 0); GAL.rot = -.4;
  $('#g-num').textContent = `${GAL.i + 1} / ${FAMILLES.length}`; $('#g-nom').textContent = f.nom; $('#g-lieu').textContent = f.lieu; $('#g-texte').textContent = f.texte;
}
function majGalerie(dt) {
  const h = GAL.actuel; if (!h) return;
  if (!GAL.glisse) GAL.rot += dt * .18; h.g.rotation.y = GAL.rot; animer(h, dt, 0);
  const large = innerWidth > innerHeight * 1.1, c = GAL.cam; c.aspect = innerWidth / innerHeight; c.fov = large ? 26 : 36; c.updateProjectionMatrix();
  const ht = h.tete.getWorldPosition(new T.Vector3()).y;
  if (GAL.zoom) { c.fov = large ? 24 : 30; c.updateProjectionMatrix(); c.position.set(large ? -.12 : 0, ht - .02, 1.05); c.lookAt(large ? -.2 : 0, ht - .05, 0); }
  else { c.position.set(large ? -.55 : 0, 1.05, large ? 4.6 : 5.2); c.lookAt(large ? -.95 : 0, large ? .95 : .78, 0); }
  rendu.toneMappingExposure = 1.05;
}
$('#m-familles').onclick = ouvrirGalerie;
$('#g-zoom').onclick = () => { GAL.zoom = !GAL.zoom; $('#g-zoom').textContent = GAL.zoom ? 'Plan entier' : 'Gros plan'; };
$('#g-prec').onclick = () => montrerFamille(GAL.i - 1); $('#g-suiv').onclick = () => montrerFamille(GAL.i + 1); $('#g-retour').onclick = fermerGalerie;
toile.addEventListener('pointerdown', e => { if (etat === 'galerie') GAL.glisse = { x: e.clientX, r: GAL.rot }; });
addEventListener('pointermove', e => { if (etat === 'galerie' && GAL.glisse) GAL.rot = GAL.glisse.r + (e.clientX - GAL.glisse.x) * .01; });
addEventListener('pointerup', () => { GAL.glisse = null; });
addEventListener('keydown', e => { if (etat !== 'galerie') return; if (e.code === 'ArrowRight') montrerFamille(GAL.i + 1); else if (e.code === 'ArrowLeft') montrerFamille(GAL.i - 1); else if (e.code === 'Escape') fermerGalerie(); });

/* ---------- Boucle ---------- */
let avant = performance.now(), tMenu = 0, mesure = { t: 0, n: 0, fait: false };
function boucle(now) {
  requestAnimationFrame(boucle);
  const dt = Math.min(.05, (now - avant) / 1000), s = now / 1000; avant = now;
  VENT.uTemps.value = s; nuages.material.uniforms.uTemps.value = s; ETALON.uniforms.uTemps.value = s;
  if (eauNormales.image) eauNormales.offset.set(s * .004, s * .0025);
  if (etat === 'galerie') { majGalerie(dt); if (!ESSAI) rendu.render(GAL.scene, GAL.cam); return; }
  if (etat === 'menu') {
    tMenu += dt * .03;
    camera.position.set(-62 + Math.cos(tMenu) * 58, 17 + Math.sin(tMenu * .7) * 3, -58 + Math.sin(tMenu) * 58); camera.lookAt(-80, 7, -74);
    majPnj(dt); CAM.pret = false; repere.visible = false;
  } else {
    if (etat === 'jeu') {
      if (J.dansChar) { majCharrette(dt); animer(J.h, dt, 0); } else { majJoueur(dt); majCharrette(dt); }
      const e = ETAPES[ETAPE]; if (e && e.maj && !FIGE) e.maj(dt);
      if (chrono) { chrono.reste -= dt; UI.chrono.hidden = false; const r = Math.max(0, Math.ceil(chrono.reste)); UI.chrono.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`; UI.chrono.classList.toggle('urgent', r <= 15); if (chrono.reste <= 0) { if (chrono.job) { toast(chrono.echec, true, 3000); SON.rate(); JOB = null; chrono = null; UI.chrono.hidden = true; } else echec(chrono.echec, 'monter'); } }
      if (JOB && JOB.type === 'livraison' && J.dansChar && dist(CHAR, JOB.d) < 9 && Math.abs(CHAR.v) < 3) { const n = CHAR.nb, q = JOB.d.qui; JOB = null; chrono = null; UI.chrono.hidden = true; CHAR.v = 0; placerCharrette(CHAR.x, CHAR.z, CHAR.yaw, 0); gagner(10 + 2 * n, `livraison à ${q}, ${n} cagette${n > 1 ? 's' : ''} intacte${n > 1 ? 's' : ''}`); }
      if (PECHE.actif) { PECHE.t += dt; $('#peche .curseur').style.left = ((Math.sin(PECHE.t * PECHE.vitesse * (1 + JOB.essais * .18)) + 1) / 2 * 100) + '%'; }
      if (!mesure.fait) { mesure.t += dt; mesure.n++; if (mesure.t > 12) { mesure.fait = true; const fps = mesure.n / mesure.t; if (fps < 26 && QN !== 'basse') aide(`L’image saccade (${Math.round(fps)} images/s). Baisse la <b>qualité graphique</b> dans la pause (Échap).`, 9000); } }
    } else if (etat === 'dialogue') { majDialogue(dt); if (!J.dansChar) { J.h.g.rotation.y += ecartAngle(J.h.g.rotation.y, J.yaw) * Math.min(1, dt * 6); animer(J.h, dt, 0); } }
    majPnj(dt);
    majCamera(dt);
    chercherInteraction();
    const e = ETAPES[ETAPE], c = JOB && etat === 'jeu' ? JOB.cible() : e && e.cible && etat === 'jeu' ? e.cible() : null;
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
window.__silenzio = { galerie: (i, z) => { ouvrirGalerie(); GAL.zoom = !!z; montrerFamille(i); }, aller, charger, ETAPES, J, CHAR, PNJ, CUEILLETTE, etat: () => etat, etape: () => ETAPE, inter: () => interProche && interProche.lib(), heure, camera, cam: CAM, sauve: SAUVE, job: () => JOB && JOB.type };
