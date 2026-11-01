#!/usr/bin/env node
/* Transfère les animations d'un personnage Quaternius (CC0, fichier .glb) sur les squelettes du jeu
   (corps MakeHuman et personnages de base du dossier modeles/) : pour chaque image, l'orientation de chaque os source dans le monde
   est appliquée à l'os correspondant, corrigée de la différence de pose de repos (bras en croix / bras en A).
   Usage : node outils/animations.mjs <quaternius.glb>  →  modeles/anim/anims.json */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Quaternion, Vector3, Matrix4 } from '../vendor/three.module.min.js';

const ICI = path.dirname(fileURLToPath(import.meta.url)), RACINE = path.join(ICI, '..');
const src = process.argv[2]; if (!src) { console.error('Usage : node outils/animations.mjs <quaternius.glb>'); process.exit(1); }
const b = fs.readFileSync(src), len = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + len).toString()), bin = 20 + len + 8;
const acc = i => { const a = j.accessors[i], bv = j.bufferViews[a.bufferView], o = bin + (bv.byteOffset || 0) + (a.byteOffset || 0), n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type]; return new Float32Array(b.buffer.slice(b.byteOffset + o, b.byteOffset + o + a.count * n * 4)); };
const parent = {}; j.nodes.forEach((n, i) => (n.children || []).forEach(c => { parent[c] = i; }));
const parNom = Object.fromEntries(j.nodes.map((n, i) => [n.name, i]));

/* Évaluation de la hiérarchie source à un instant donné */
function poseSource(anim, t) {
  const trs = j.nodes.map(n => ({ t: new Vector3(...(n.translation || [0, 0, 0])), r: new Quaternion(...(n.rotation || [0, 0, 0, 1])), s: new Vector3(...(n.scale || [1, 1, 1])) }));
  if (anim) for (const c of anim.channels) {
    const sp = anim.samplers[c.sampler], ti = acc(sp.input), v = acc(sp.output), n = c.target.path === 'rotation' ? 4 : 3;
    let k = 0; while (k < ti.length - 1 && ti[k + 1] < t) k++;
    const k2 = Math.min(k + 1, ti.length - 1), f = k2 === k ? 0 : Math.max(0, Math.min(1, (t - ti[k]) / (ti[k2] - ti[k])));
    const a = Array.from(v.slice(k * n, k * n + n)), c2 = Array.from(v.slice(k2 * n, k2 * n + n)), o = trs[c.target.node];
    if (n === 4) o.r.set(...a).slerp(new Quaternion(...c2), f); else o[c.target.path === 'translation' ? 't' : 's'].set(...a.map((x, i) => x + (c2[i] - x) * f));
  }
  const monde = [];
  const calc = i => { if (monde[i]) return monde[i]; const l = new Matrix4().compose(trs[i].t, trs[i].r, trs[i].s); return (monde[i] = parent[i] != null ? calc(parent[i]).clone().multiply(l) : l); };
  return j.nodes.map((_, i) => { const m = calc(i), p = new Vector3(), q = new Quaternion(), s = new Vector3(); m.decompose(p, q, s); return { p, q }; });
}
const repos = poseSource(null, 0);
const CORRESP = { Hips: 'root', Abdomen: 'spine04', Torso: 'spine02', Neck: 'neck01', Head: 'head' };
for (const s of ['L', 'R']) Object.assign(CORRESP, { ['Shoulder.' + s]: 'clavicle.' + s, ['UpperArm.' + s]: 'upperarm01.' + s, ['LowerArm.' + s]: 'lowerarm01.' + s, ['Palm.' + s]: 'wrist.' + s, ['UpperLeg.' + s]: 'upperleg01.' + s, ['LowerLeg.' + s]: 'lowerleg01.' + s, ['Foot.' + s]: 'foot.' + s });
const BOUT = { 'Shoulder.L': 'UpperArm.L', 'Shoulder.R': 'UpperArm.R', 'UpperArm.L': 'LowerArm.L', 'UpperArm.R': 'LowerArm.R', 'LowerArm.L': 'Palm.L', 'LowerArm.R': 'Palm.R', 'Palm.L': 'MiddleHand.L', 'Palm.R': 'MiddleHand.R', 'UpperLeg.L': 'LowerLeg.L', 'UpperLeg.R': 'LowerLeg.R', 'LowerLeg.L': 'LowerLeg.L_end', 'LowerLeg.R': 'LowerLeg.R_end', 'Foot.L': 'Foot.L_end', 'Foot.R': 'Foot.R_end', Hips: 'Abdomen', Abdomen: 'Torso', Torso: 'Neck', Neck: 'Head', Head: 'Head_end' };
const dirSource = n => repos[parNom[BOUT[n]]].p.clone().sub(repos[parNom[n]].p).normalize();
const hanchesSource = repos[parNom.Hips].p.y - Math.min(repos[parNom['Foot.L']].p.y, repos[parNom['Foot.R']].p.y);

/* Squelettes cibles : noms, parents et positions de repos (axes alignés sur le monde) */
function cibleDepuis(os, joints) {
  const noms = os.map(o => o.n), par = os.map(o => o.p), r = Object.fromEntries(noms.map((n, i) => [n, i]));
  return { noms, par, r, dir: n => { const k = joints[r[n]]; return new Vector3(k[3] - k[0], k[4] - k[1], k[5] - k[2]).normalize(); }, hanches: joints[r.root][1] };
}
const corps = JSON.parse(fs.readFileSync(path.join(RACINE, 'modeles/corps/corps.json'), 'utf8'));
const pp = JSON.parse(fs.readFileSync(path.join(RACINE, 'modeles/promptplay/perso.json'), 'utf8'));
const CIBLES = { mh: cibleDepuis(corps.os, corps.silhouettes.homme.os), pp: cibleDepuis(pp.os, pp.joints) };
// Autres personnages de base (dossiers modeles/<nom>/perso.json produits par base-humain.js ou modele-pret.js)
for (const [cle, dossier] of [['jm', 'james'], ['costume', 'costume'], ['fille', 'fille'], ['joe', 'joe']]) { const f = path.join(RACINE, 'modeles', dossier, 'perso.json'); if (fs.existsSync(f)) { const d = JSON.parse(fs.readFileSync(f, 'utf8')); CIBLES[cle] = cibleDepuis(d.os, d.joints); } }

const CLIPS = { repos: 'Man_Idle', marche: 'Man_Walk', course: 'Man_Run', assis: 'Man_Sitting', applaudir: 'Man_Clapping', debout: 'Man_Standing' };
const sortie = { source: 'Animations Quaternius (CC0), transférées par outils/animations.mjs', fps: 30, cibles: {} };
for (const [cle, C] of Object.entries(CIBLES)) {
  const align = {}; for (const [s, t] of Object.entries(CORRESP)) align[t] = t === 'root' ? new Quaternion() : new Quaternion().setFromUnitVectors(C.dir(t), dirSource(s));
  sortie.cibles[cle] = {};
  for (const [nom, nomSrc] of Object.entries(CLIPS)) {
    const anim = j.animations.find(a => a.name.endsWith(nomSrc)); if (!anim) continue;
    let duree = 0; for (const sp of anim.samplers) { const ti = acc(sp.input); duree = Math.max(duree, ti[ti.length - 1]); }
    const n = Math.max(2, Math.round(duree * 30) + 1), pistes = {}, racine = [];
    for (let f = 0; f < n; f++) {
      const t = Math.min(duree, f / 30), pose = poseSource(anim, t), mondeCible = {};
      const monde = i => { const nm = C.noms[i]; if (mondeCible[nm]) return mondeCible[nm]; const src = Object.keys(CORRESP).find(s => CORRESP[s] === nm);
        let q; if (src) { const d = pose[parNom[src]].q.clone().multiply(repos[parNom[src]].q.clone().invert()); q = d.multiply(align[nm]); } else q = C.par[i] >= 0 ? monde(C.par[i]).clone() : new Quaternion();
        return (mondeCible[nm] = q); };
      for (const nm of Object.values(CORRESP)) {
        const i = C.r[nm]; if (i == null) continue;
        const qp = C.par[i] >= 0 ? monde(C.par[i]) : new Quaternion(), loc = qp.clone().invert().multiply(monde(i));
        (pistes[nm] = pistes[nm] || []).push(...loc.toArray().map(x => +x.toFixed(4)));
      }
      const d = pose[parNom.Hips].p.clone().sub(repos[parNom.Hips].p).multiplyScalar(C.hanches / hanchesSource);
      racine.push(+d.x.toFixed(4), +d.y.toFixed(4), +d.z.toFixed(4));
    }
    sortie.cibles[cle][nom] = { duree: +duree.toFixed(4), n, pistes, racine };
    console.log(cle, nom, duree.toFixed(2) + ' s', n, 'images');
  }
}
const dest = path.join(RACINE, 'modeles/anim/anims.json'); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, JSON.stringify(sortie));
console.log('écrit', (fs.statSync(dest).size / 1024 | 0) + ' Ko');
