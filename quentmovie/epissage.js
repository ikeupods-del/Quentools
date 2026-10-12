// Assemblage rapide de l'export : seules les parties qui changent (fondus enchaînés, incrustations de la piste vidéo 2)
// sont réencodées ; le reste des clips est recopié tel quel, sans perte et presque instantanément.
// Principe : chaque clip est encodé avec une image clé exactement toutes les secondes (GOP de G images). Les coupes se font
// donc toujours sur une image clé. Tout est calculé en nombre d'images (jamais en secondes) pour ne pas dériver.
'use strict';
const fs = require('fs');
const path = require('path');

// Expression -force_key_frames : une image clé toutes les G images (G = images par seconde)
const expressionGop = fps => `expr:eq(mod(n,${Math.round(fps)}),0)`;

// F[i] : images du clip i ; D[i] : images du fondu entre le clip i et le suivant (0 = coupe franche).
// Résultat : morceaux dans l'ordre — { type: 'copie', clip, de, a } ou { type: 'enc', clips: [{ clip, de, a }], fondus: [D…] } — avec début/longueur dans la timeline.
function planifier(F, D, fps) {
  const G = Math.round(fps), n = F.length;
  if (!Number.isInteger(fps) || G < 1) return { ok: false, raison: 'cadence non entière' };
  for (let i = 0; i < n; i++) {
    if (F[i] < 2) return { ok: false, raison: 'clip trop court' };
    if (i < n - 1 && D[i]) {
      if (D[i] > Math.floor(0.9 * Math.min(F[i], F[i + 1]))) return { ok: false, raison: 'fondu trop long' };
      if (i > 0 && D[i - 1] && D[i - 1] + D[i] > F[i]) return { ok: false, raison: 'fondus qui se chevauchent' };
    }
  }
  const h = i => (i > 0 && D[i - 1] ? Math.min(F[i], Math.ceil(D[i - 1] / G) * G) : 0); // début recopiable du clip i
  const q = i => (i < n - 1 && D[i] ? Math.max(0, Math.floor((F[i] - D[i]) / G) * G) : F[i]); // fin recopiable
  const pieces = []; let t = 0, i = 0;
  const poser = p => { p.debut = t; t += p.longueur; pieces.push(p); };
  while (i < n) {
    if (q(i) > h(i)) poser({ type: 'copie', clip: i, de: h(i), a: q(i), longueur: q(i) - h(i) });
    if (i < n - 1 && D[i]) {
      const clips = [{ clip: i, de: q(i), a: F[i] }], fondus = []; let b = i;
      for (;;) {
        fondus.push(D[b]); b++;
        if (b < n - 1 && D[b] && h(b) >= q(b)) { clips.push({ clip: b, de: 0, a: F[b] }); continue; }
        clips.push({ clip: b, de: 0, a: h(b) }); break;
      }
      const longueur = clips.reduce((s, c) => s + c.a - c.de, 0) - fondus.reduce((s, x) => s + x, 0);
      poser({ type: 'enc', clips, fondus, longueur });
      i = b;
    } else i++;
  }
  return { ok: true, G, pieces, total: t };
}

// Zones à réencoder pour des éléments posés sur la timeline (intervalles d'images [fa, fb[) : étendues aux images clés voisines
function zonesPistes(plan, intervalles) {
  const G = plan.G, cles = new Set();
  for (const p of plan.pieces) for (let m = 0; m < p.longueur; m += G) cles.add(p.debut + m);
  const tri = [...cles].sort((a, b) => a - b);
  const avant = f => { let r = 0; for (const k of tri) { if (k <= f) r = k; else break; } return r; };
  const apres = f => { for (const k of tri) if (k >= f) return k; return plan.total; };
  const zones = intervalles.filter(x => x.fb > 0 && x.fa < plan.total).map(x => ({ de: avant(Math.max(0, x.fa)), a: apres(Math.min(plan.total, x.fb)) })).sort((a, b) => a.de - b.de);
  const fus = [];
  for (const z of zones) { const l = fus[fus.length - 1]; if (l && z.de <= l.a) l.a = Math.max(l.a, z.a); else fus.push({ ...z }); }
  return fus;
}

function creer({ run, FFMPEG, encoder, FX, aFiltre, clamp, num }) {
  const nom = (cwd, f) => path.join(cwd, f);
  const sur = async (liste, limite, fn) => { let k = 0; await Promise.all(Array.from({ length: Math.max(1, Math.min(limite, liste.length)) }, async () => { while (k < liste.length) { const j = k++; await fn(liste[j], j); } })); };

  // nombre d'images vidéo d'un fichier (lecture des paquets seulement : instantané)
  async function compterImages(file) {
    const sortie = (await run(FFMPEG, ['-hide_banner', '-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'framecrc', '-'], { binary: true })).toString();
    return sortie.split('\n').filter(l => l && l[0] !== '#').length;
  }
  // en-têtes de l'encodeur (SPS + PPS) : des morceaux recopiés ensemble doivent avoir les mêmes
  async function entetes(file) {
    const b = await run(FFMPEG, ['-hide_banner', '-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-bsf:v', 'h264_mp4toannexb', '-frames:v', 1, '-f', 'h264', 'pipe:1'], { binary: true });
    const noms = []; let debut = -1;
    for (let i = 0; i + 3 < b.length; i++) {
      if (b[i] === 0 && b[i + 1] === 0 && b[i + 2] === 1) {
        if (debut >= 0) noms.push(b.subarray(debut, i));
        debut = i + 3; i += 2;
      }
    }
    if (debut >= 0) noms.push(b.subarray(debut));
    const garde = noms.filter(x => x.length && [7, 8].includes(x[0] & 31)).map(x => { let e = x.length; while (e > 0 && x[e - 1] === 0) e--; return x.subarray(0, e).toString('hex'); });
    if (!garde.length) throw new Error('en-têtes vidéo introuvables');
    return garde.join('|');
  }
  const copier = (cwd, src, de, n, out, fps) => run(FFMPEG, ['-y', '-v', 'error', ...(de > 0 ? ['-ss', de / fps] : []), '-i', src, '-map', '0:v:0', '-c', 'copy', '-an', '-frames:v', n, out], { cwd });
  // liste de concaténation avec durées exactes (en images)
  function concatener(cwd, liste, fps, out) {
    fs.writeFileSync(nom(cwd, out + '.txt'), liste.map(x => `file '${x.f}'\nduration ${(x.n / fps).toFixed(6)}`).join('\n'));
    return run(FFMPEG, ['-y', '-v', 'error', '-f', 'concat', '-safe', 0, '-i', out + '.txt', '-c', 'copy', '-an', out], { cwd });
  }

  // Fondus : un morceau « enc » = suite de clips (ou parties de clips) enchaînés par xfade, seulement autour des fondus
  async function rendreGroupe(cwd, p, segs, fps, trans, enc, out) {
    const ins = [], g = [];
    p.clips.forEach((c, k) => {
      ins.push('-ss', c.de / fps, '-t', ((c.a - c.de) / fps).toFixed(6), '-i', segs[c.clip]);
      g.push(`[${k}:v]settb=AVTB,fps=${fps},format=yuv420p,setpts=PTS-STARTPTS[v${k}]`);
    });
    let cur = 'v0', acc = p.clips[0].a - p.clips[0].de;
    for (let k = 1; k < p.clips.length; k++) {
      const D = p.fondus[k - 1], tr = trans[p.clips[k - 1].clip], def = FX.TRANSITIONS.find(t => t.id === tr.type), ty = def.expr ? `custom:expr='${def.expr}'` : tr.type;
      g.push(`[${cur}][v${k}]xfade=transition=${ty}:duration=${(D / fps).toFixed(6)}:offset=${((acc - D) / fps).toFixed(6)},fps=${fps},format=yuv420p[x${k}]`);
      acc += p.clips[k].a - p.clips[k].de - D; cur = `x${k}`;
    }
    await encoder(['-y', '-loglevel', 'error', ...ins, '-filter_complex', g.join(';'), '-map', `[${cur}]`, '-r', fps, '-frames:v', p.longueur], enc.vt, enc.cpu,
      ['-pix_fmt', 'yuv420p', '-force_key_frames', expressionGop(fps), '-an', out], { cwd });
  }

  // Son de toute la timeline à partir des clips (fondus enchaînés du son aux mêmes endroits que l'image)
  async function sonDesClips(cwd, segs, F, D, fps, proxy, out) {
    const ins = segs.flatMap(s => ['-i', s]), g = [];
    segs.forEach((s, i) => g.push(`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=end=${(F[i] / fps).toFixed(6)},asetpts=PTS-STARTPTS,apad=whole_dur=${(F[i] / fps).toFixed(6)}[a${i}]`));
    let cur = 'a0';
    for (let i = 1; i < segs.length; i++) {
      const nx = `m${i}`;
      g.push(D[i - 1] ? `[${cur}][a${i}]acrossfade=d=${(D[i - 1] / fps).toFixed(6)}[${nx}]` : `[${cur}][a${i}]concat=n=2:v=0:a=1[${nx}]`);
      cur = nx;
    }
    await run(FFMPEG, ['-y', '-v', 'error', ...ins, '-filter_complex', g.join(';'), '-map', `[${cur}]`, '-c:a', 'aac', '-b:a', proxy ? '96k' : '192k', out], { cwd });
  }

  // Assemble les clips : renvoie { video, plan } (image seule, sans son) ou lève une erreur (l'appelant utilise alors l'ancienne méthode)
  async function assembler({ cwd, segs, fps, trans, F, enc, paralleles, etape }) {
    const D = trans.map((t, i) => (t && i < segs.length - 1 ? Math.max(Math.round(0.2 * fps), Math.round(clamp(num(t.dur, 0.6), 0.2, 5) * fps)) : 0));
    const plan = planifier(F, D, fps);
    if (!plan.ok) throw new Error('assemblage rapide impossible : ' + plan.raison);
    const fichiers = [], encodes = plan.pieces.map((p, k) => ({ p, k })).filter(x => x.p.type === 'enc');
    if (encodes.length) etape('Fondus enchaînés');
    const sortieDe = new Map();
    await sur(encodes, paralleles, async ({ p, k }) => { const f = `gr${k}.mp4`; await rendreGroupe(cwd, p, segs, fps, trans, enc, f); sortieDe.set(k, f); });
    const liste = [];
    for (const [k, p] of plan.pieces.entries()) {
      if (p.type === 'copie') { const f = `cp${k}.mp4`; await copier(cwd, segs[p.clip], p.de, p.longueur, f, fps); liste.push({ f, n: p.longueur }); }
      else liste.push({ f: sortieDe.get(k), n: p.longueur });
    }
    await concatener(cwd, liste, fps, 'vid0.mp4');
    // mêmes en-têtes partout, sinon la recopie est refusée
    const ref = await entetes(nom(cwd, segs[0]));
    const vus = await Promise.all(liste.map(x => entetes(nom(cwd, x.f))));
    if (vus.some(e => e !== ref)) throw new Error('encodeurs différents entre les morceaux');
    return { video: 'vid0.mp4', plan, D };
  }

  // Incrustations de la piste vidéo 2 : seules les zones concernées sont réencodées. `rendreZone(zone, entree, sortie)` produit le morceau.
  async function poserZones({ cwd, video, plan, fps, intervalles, rendreZone, paralleles, etape }) {
    const zones = zonesPistes(plan, intervalles);
    if (!zones.length) return { video, zones };
    etape('Piste vidéo 2');
    await sur(zones, paralleles, async z => { z.f = await rendreZone(z, video); });
    const liste = []; let pos = 0;
    zones.forEach((z, k) => {
      if (z.de > pos) { const f = `zc${k}.mp4`; liste.push({ f, n: z.de - pos, copie: [pos, z.de - pos] }); }
      liste.push({ f: z.f, n: z.a - z.de }); pos = z.a;
    });
    if (pos < plan.total) liste.push({ f: 'zfin.mp4', n: plan.total - pos, copie: [pos, plan.total - pos] });
    for (const x of liste) if (x.copie) await copier(cwd, video, x.copie[0], x.copie[1], x.f, fps);
    await concatener(cwd, liste, fps, 'vid1.mp4');
    const ref = await entetes(nom(cwd, video));
    const vus = await Promise.all(liste.map(x => entetes(nom(cwd, x.f))));
    if (vus.some(e => e !== ref)) throw new Error('encodeurs différents dans les zones');
    return { video: 'vid1.mp4', zones };
  }

  // Contrôle final : bon nombre d'images et lecture sans erreur autour de chaque raccord
  async function verifier({ cwd, video, plan, fps, raccords }) {
    const n = await compterImages(nom(cwd, video));
    if (n !== plan.total) throw new Error(`images attendues ${plan.total}, obtenues ${n}`);
    const pts = [...new Set(raccords)].filter(x => x > 0 && x < plan.total);
    const choix = pts.length > 40 ? pts.filter((x, i) => i % Math.ceil(pts.length / 40) === 0) : pts;
    await sur(choix, 4, async f => {
      const err = await run(FFMPEG, ['-hide_banner', '-v', 'error', '-ss', Math.max(0, f / fps - 1), '-t', 2, '-i', nom(cwd, video), '-an', '-f', 'null', '-'], { wantErr: true });
      if (String(err).trim()) throw new Error('lecture imparfaite au raccord ' + f);
    });
  }

  return { assembler, poserZones, verifier, sonDesClips, compterImages, entetes, copier };
}

module.exports = { planifier, zonesPistes, expressionGop, creer };
