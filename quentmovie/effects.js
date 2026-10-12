// QuentMovie : banque d'effets, transitions et styles de titres.
// Chaque effet vidéo fournit soit un filtre linéaire (chaîne), soit un graphe {graph(in, out)}.
// c = { W, H, eff (durée du clip en secondes), t0 (décalage de l'aperçu), fps }
'use strict';

const T = c => `(t+${c.t0 || 0})`;
const even = e => `trunc((${e})/2)*2`;
const p = (k, label, min, max, step, def, u = '') => ({ k, label, min, max, step, def, u });
const AMOUNT = p('amount', 'Intensité', 0, 100, 1, 100, ' %');

const VIDEO = [];
function fx(id, nom, cat, params, make, opt = {}) {
  VIDEO.push({ id, nom, cat, params, make, needs: opt.needs || [], blend: !!opt.blend });
}

// ---------- Ambiances (looks) : l'intensité mélange l'effet avec l'image d'origine ----------
const look = (id, nom, frag, needs) => fx(id, nom, 'Ambiances', [AMOUNT], () => frag, { blend: true, needs });
look('cine', 'Ciné chaud', 'eq=contrast=1.08:saturation=1.1,colorbalance=rs=.08:bs=-.08:rm=.05:bm=-.05:rh=.06:bh=-.06', ['colorbalance']);
look('tealorange', 'Teal et orange', 'colorbalance=rs=-.1:bs=.12:rh=.15:gh=.03:bh=-.12,eq=contrast=1.1:saturation=1.15', ['colorbalance']);
look('vintage', 'Vintage', 'curves=preset=vintage', ['curves']);
look('crossprocess', 'Développement croisé', 'curves=preset=cross_process', ['curves']);
look('sepia', 'Sépia', 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131', ['colorchannelmixer']);
look('bwdrama', 'Noir et blanc dramatique', 'hue=s=0,eq=contrast=1.35:brightness=-0.03', ['hue']);
look('delave', 'Délavé', 'eq=saturation=0.6:contrast=0.9:brightness=0.05');
look('froid', 'Ambiance froide', 'colorbalance=rs=-.08:bs=.12:rm=-.05:bm=.1:rh=-.04:bh=.08', ['colorbalance']);
look('chaud', 'Ambiance chaude', 'colorbalance=rs=.1:bs=-.1:rm=.06:bm=-.06:rh=.05:bh=-.05', ['colorbalance']);
look('dore', 'Heure dorée', 'colorbalance=rs=.12:gs=.05:bs=-.12:rm=.1:gm=.04:bm=-.08:rh=.08:bh=-.1,eq=saturation=1.15:brightness=0.02', ['colorbalance']);
look('pastel', 'Pastel', 'eq=saturation=0.8:brightness=0.08:contrast=0.9');
look('vif', 'Couleurs vives', 'eq=saturation=1.8:contrast=1.2');
look('nuit', 'Nuit américaine', 'colorbalance=bs=.25:bm=.2:bh=.1,eq=brightness=-0.15:contrast=1.1:saturation=.7', ['colorbalance']);
look('hdr', 'Éclat HDR', 'eq=contrast=1.2:saturation=1.3,unsharp=5:5:1.2:5:5:0', ['unsharp']);
look('bleach', 'Bleach bypass (film dur)', 'eq=saturation=0.5:contrast=1.4');
look('rose', 'Rose bonbon', 'colorbalance=rs=.15:gs=-.03:bs=.1:rm=.1:bm=.06:rh=.08:bh=.05', ['colorbalance']);
look('matrix', 'Vert Matrix', 'colorchannelmixer=.2:.2:.2:0:.1:.9:.1:0:.1:.3:.1', ['colorchannelmixer']);
look('duotone', 'Duotone néon', "hue=s=0,curves=r='0/0.1 1/0.9':g='0/0 1/0.4':b='0/0.4 1/1'", ['hue', 'curves']);
look('dramatique', 'Dramatique', 'eq=contrast=1.3:saturation=0.8:gamma=0.9,vignette=angle=0.9', ['vignette']);

// ---------- Vlog et visage ----------
fx('stab', 'Stabilisation (image tremblante)', 'Vlog', [p('r', 'Force', 16, 64, 16, 32)], q => `deshake=rx=${q.r}:ry=${q.r}`, { needs: ['deshake'] });
fx('peaudouce', 'Peau douce (portrait)', 'Vlog', [p('amount', 'Intensité', 0, 100, 1, 55, ' %')], () => 'gblur=sigma=4', { blend: true, needs: ['gblur'] });
fx('grosplan', 'Gros plan (zoom fixe)', 'Vlog', [p('a', 'Zoom', 5, 100, 1, 25, ' %')], (q, c) =>
  `scale=${even(`${c.W}*${1 + q.a / 100}`)}:${even(`${c.H}*${1 + q.a / 100}`)},crop=${c.W}:${c.H}`);
fx('vlogvif', 'Vlog éclatant', 'Vlog', [AMOUNT], () => 'eq=contrast=1.08:saturation=1.25:gamma=1.05,colorbalance=rs=.04:bs=-.03', { blend: true, needs: ['colorbalance'] });
fx('tiktok', 'Contraste TikTok', 'Vlog', [AMOUNT], () => 'eq=contrast=1.15:saturation=1.35:brightness=0.02,unsharp=5:5:0.8:5:5:0', { blend: true, needs: ['unsharp'] });
fx('studio', 'Désaturé studio (podcast)', 'Vlog', [AMOUNT], () => 'eq=saturation=0.55:contrast=1.1', { blend: true });
fx('jourclair', 'Lumière du jour', 'Vlog', [AMOUNT], () => 'eq=brightness=0.05:contrast=1.05:saturation=1.1,colorbalance=rs=-.03:bs=.04', { blend: true, needs: ['colorbalance'] });

// ---------- Flou et netteté ----------
fx('flou', 'Flou', 'Flou et netteté', [p('s', 'Force', 1, 40, 1, 8)], q => `gblur=sigma=${q.s}`, { needs: ['gblur'] });
fx('qualite', 'Améliorer la qualité (débruitage, netteté, couleurs)', 'Flou et netteté', [p('f', 'Force', 1, 10, 1, 5)], q => `hqdn3d=${(q.f * 0.5).toFixed(1)}:${(q.f * 0.4).toFixed(1)}:${(q.f * 0.8).toFixed(1)}:${(q.f * 0.8).toFixed(1)},unsharp=5:5:${(0.3 + q.f * 0.08).toFixed(2)}:5:5:0,eq=contrast=1.04:saturation=1.08`, { needs: ['hqdn3d', 'unsharp', 'eq'] });
fx('nettete', 'Netteté', 'Flou et netteté', [p('a', 'Force', 0.5, 5, 0.1, 1.5)], q => `unsharp=7:7:${q.a}:7:7:0`, { needs: ['unsharp'] });
fx('trainee', 'Traînée de mouvement', 'Flou et netteté', [p('n', 'Longueur', 2, 10, 1, 4)], q => `tmix=frames=${q.n}`, { needs: ['tmix'] });
fx('lueur', 'Lueur', 'Flou et netteté', [p('a', 'Intensité', 5, 100, 1, 50, ' %')], q => ({
  graph: (i, o) => `[${i}]format=yuv420p,split[a_${o}][b_${o}];[b_${o}]gblur=sigma=25,eq=brightness=0.08[g_${o}];[a_${o}][g_${o}]blend=all_mode=screen:all_opacity=${q.a / 100}[${o}]`
}), { needs: ['gblur', 'blend'] });

// ---------- Stylisés ----------
fx('vignette', 'Vignette', 'Stylisés', [p('s', 'Force', 5, 100, 1, 60, ' %')],
  q => `vignette=angle=${(Math.PI / 2 - q.s / 100 * (Math.PI / 2 - 0.25)).toFixed(3)}`, { needs: ['vignette'] });
fx('grain', 'Grain de film', 'Stylisés', [p('n', 'Force', 5, 60, 1, 18)], q => `noise=alls=${q.n}:allf=t+u`, { needs: ['noise'] });
fx('pixel', 'Pixelisation', 'Stylisés', [p('n', 'Taille des blocs', 4, 60, 1, 16)], (q, c) =>
  `scale=${even(`iw/${q.n}`)}:${even(`ih/${q.n}`)}:flags=neighbor,scale=${c.W}:${c.H}:flags=neighbor`);
fx('vhs', 'Cassette VHS', 'Stylisés', [], () => 'noise=alls=18:allf=t,rgbashift=rh=3:bh=-3,eq=saturation=1.35:contrast=1.05,gblur=sigma=0.7', { needs: ['rgbashift', 'gblur', 'noise'] });
fx('glitch', 'Glitch', 'Stylisés', [p('a', 'Décalage', 2, 30, 1, 10)], (q, c) =>
  `rgbashift=rh=${q.a}:bh=-${q.a}:gv=${Math.round(q.a / 2)}:enable='lt(mod(${T(c)},1.4),0.18)'`, { needs: ['rgbashift'] });
fx('aberration', 'Aberration chromatique', 'Stylisés', [p('a', 'Décalage', 1, 15, 1, 4)], q => `rgbashift=rh=-${q.a}:bh=${q.a}`, { needs: ['rgbashift'] });
fx('negatif', 'Négatif', 'Stylisés', [], () => 'negate');
fx('contour', 'Dessin au trait', 'Stylisés', [], () => 'edgedetect=low=0.08:high=0.25:mode=colormix', { needs: ['edgedetect'] });
fx('affiche', 'Affiche (bande dessinée)', 'Stylisés', [p('n', 'Niveaux', 16, 96, 8, 48)], q =>
  `lutyuv=y='trunc(val/${q.n})*${q.n}',eq=saturation=1.6:contrast=1.1`, { needs: ['lutyuv'] });
fx('thermique', 'Vision thermique', 'Stylisés', [], () =>
  "hue=s=0,curves=r='0/0 0.4/0.2 0.7/1 1/1':g='0/0 0.4/0 0.6/0.3 0.85/1 1/1':b='0/0.35 0.25/0.7 0.45/0.1 1/0'", { needs: ['hue', 'curves'] });
fx('lignes', 'Lignes de balayage', 'Stylisés', [p('a', 'Opacité', 10, 90, 1, 35, ' %')], q =>
  `drawgrid=w=iw:h=4:t=1:c=black@${q.a / 100}`, { needs: ['drawgrid'] });
fx('bandes', 'Bandes cinéma', 'Stylisés', [p('h', 'Hauteur', 5, 25, 1, 12, ' %')], q =>
  `drawbox=x=0:y=0:w=iw:h=ih*${q.h / 100}:color=black:t=fill,drawbox=x=0:y=ih*${1 - q.h / 100}:w=iw:h=ih*${q.h / 100}:color=black:t=fill`, { needs: ['drawbox'] });
fx('miroir', 'Miroir symétrique', 'Stylisés', [], () => ({
  graph: (i, o) => `[${i}]split[a_${o}][b_${o}];[a_${o}]crop=iw/2:ih:0:0[l_${o}];[b_${o}]crop=iw/2:ih:0:0,hflip[r_${o}];[l_${o}][r_${o}]hstack[${o}]`
}), { needs: ['hstack'] });

fx('vieuxfilm', 'Vieux film', 'Stylisés', [], (q, c) =>
  `eq=saturation=0.4:contrast=1.1,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,noise=alls=22:allf=t,vignette=angle=0.7,eq=brightness='0.025*sin(${T(c)}*50)':eval=frame`,
  { needs: ['vignette', 'noise', 'colorchannelmixer'] });
fx('cartoon', 'Dessin animé', 'Stylisés', [], () => ({
  graph: (i, o) => `[${i}]split[a_${o}][b_${o}];[a_${o}]edgedetect=low=0.1:high=0.3,negate,format=yuv420p[e_${o}];[b_${o}]lutyuv=y='trunc(val/32)*32',eq=saturation=1.5,format=yuv420p[k_${o}];[k_${o}][e_${o}]blend=all_mode=multiply[${o}]`
}), { needs: ['edgedetect', 'lutyuv', 'blend'] });
fx('ecran4', 'Écran en 4', 'Stylisés', [], (q, c) => {
  const w = Math.round(c.W / 4) * 2, h = Math.round(c.H / 4) * 2;
  return { graph: (i, o) => `[${i}]split=4[a_${o}][b_${o}][c_${o}][d_${o}];[a_${o}]scale=${w}:${h}[a1_${o}];[b_${o}]scale=${w}:${h},hflip[b1_${o}];[c_${o}]scale=${w}:${h},vflip[c1_${o}];[d_${o}]scale=${w}:${h},hflip,vflip[d1_${o}];[a1_${o}][b1_${o}]hstack[t_${o}];[c1_${o}][d1_${o}]hstack[u_${o}];[t_${o}][u_${o}]vstack,scale=${c.W}:${c.H}[${o}]` };
}, { needs: ['hstack', 'vstack'] });
fx('cadre', 'Cadre blanc', 'Stylisés', [p('e', 'Épaisseur', 1, 15, 1, 5, ' %')], (q, c) =>
  `drawbox=x=0:y=0:w=iw:h=ih:color=white:t=${Math.round(Math.min(c.W, c.H) * q.e / 100)}`, { needs: ['drawbox'] });
fx('angle', 'Grand angle (œil de poisson)', 'Stylisés', [p('a', 'Déformation', 0.1, 0.8, 0.05, 0.4)], q => `lenscorrection=k1=-${q.a}:k2=-${(q.a / 2).toFixed(2)}`, { needs: ['lenscorrection'] });
fx('arcenciel', 'Couleurs qui tournent', 'Stylisés', [p('v', 'Vitesse', 10, 180, 5, 60)], (q, c) => `hue=h='${T(c)}*${q.v}'`, { needs: ['hue'] });

// ---------- Mouvement ----------
const zoom = (dir) => (q, c) => {
  const a = q.a / 100, D = Math.max(0.2, c.eff).toFixed(3);
  const k = dir > 0 ? `(1+${a}*min(1,${T(c)}/${D}))` : `(1+${a}-${a}*min(1,${T(c)}/${D}))`;
  return `scale=w='${even(`${c.W}*${k}`)}':h='${even(`${c.H}*${k}`)}':eval=frame,crop=${c.W}:${c.H}`;
};
fx('zoomavant', 'Zoom avant lent', 'Mouvement', [p('a', 'Amplitude', 5, 80, 1, 20, ' %')], zoom(1));
fx('zoomarriere', 'Zoom arrière lent', 'Mouvement', [p('a', 'Amplitude', 5, 80, 1, 20, ' %')], zoom(-1));
fx('secousse', 'Secousse', 'Mouvement', [p('a', 'Force', 10, 100, 1, 50, ' %')], (q, c) => {
  const A = (q.a / 100 * 0.045 * c.W).toFixed(1);
  return `scale=${even(`${c.W}*1.1`)}:${even(`${c.H}*1.1`)},crop=${c.W}:${c.H}:x='(iw-ow)/2+sin(${T(c)}*37)*${A}':y='(ih-oh)/2+cos(${T(c)}*41)*${A}'`;
});
fx('pulsation', 'Pulsation (au rythme)', 'Mouvement', [p('a', 'Amplitude', 2, 20, 1, 6, ' %'), p('bpm', 'Rythme (bpm)', 60, 180, 1, 120)], (q, c) => {
  const k = `(1+${q.a / 100}*abs(sin(${T(c)}*${Math.PI}*${q.bpm}/60)))`;
  return `scale=w='${even(`${c.W}*${k}`)}':h='${even(`${c.H}*${k}`)}':eval=frame,crop=${c.W}:${c.H}`;
});
fx('rotation', 'Rotation', 'Mouvement', [p('deg', 'Angle', -45, 45, 1, 8, '°')], (q, c) => {
  const a = q.deg * Math.PI / 180, f = (Math.cos(a) + Math.max(c.W / c.H, c.H / c.W) * Math.abs(Math.sin(a))).toFixed(3);
  return `rotate=${a.toFixed(4)}:ow=iw:oh=ih:c=black,scale=${even(`iw*${f}`)}:${even(`ih*${f}`)},crop=${c.W}:${c.H}`;
}, { needs: ['rotate'] });
fx('zoomeclair', 'Zoom éclair (coup de poing)', 'Mouvement', [p('a', 'Amplitude', 10, 80, 1, 30, ' %')], (q, c) => {
  const k = `(1+${q.a / 100}*exp(-7*${T(c)}))`;
  return `scale=w='${even(`${c.W}*${k}`)}':h='${even(`${c.H}*${k}`)}':eval=frame,crop=${c.W}:${c.H}`;
});
const pan = dir => (q, c) => {
  const D = Math.max(0.2, c.eff).toFixed(3), k = dir > 0 ? `min(1,${T(c)}/${D})` : `(1-min(1,${T(c)}/${D}))`;
  return `scale=${even(`${c.W}*1.25`)}:${even(`${c.H}*1.25`)},crop=${c.W}:${c.H}:x='(iw-ow)*${k}':y='(ih-oh)/2'`;
};
fx('panoD', 'Panoramique vers la droite', 'Mouvement', [], pan(1));
fx('panoG', 'Panoramique vers la gauche', 'Mouvement', [], pan(-1));
fx('retourh', 'Retourner (gauche/droite)', 'Mouvement', [], () => 'hflip');
fx('retourv', 'Retourner (haut/bas)', 'Mouvement', [], () => 'vflip');
fx('inverse', 'Lecture à l’envers', 'Mouvement', [], () => 'reverse', { needs: ['reverse'] });

// ---------- Lumière ----------
fx('flash', 'Flash régulier', 'Lumière', [p('per', 'Intervalle (s)', 0.5, 5, 0.5, 2)], (q, c) =>
  `eq=brightness='0.7*max(0,1-5*mod(${T(c)},${q.per}))':eval=frame`);
fx('stroboscope', 'Stroboscope', 'Lumière', [p('per', 'Intervalle (s)', 0.1, 1, 0.05, 0.3)], (q, c) =>
  `eq=brightness='if(lt(mod(${T(c)},${q.per}),0.04),0.6,0)':eval=frame`);
fx('eclaircir', 'Éclaircir', 'Lumière', [p('a', 'Force', 1, 50, 1, 15)], q => `eq=brightness=${q.a / 100}:gamma=1.1`);
fx('assombrir', 'Assombrir', 'Lumière', [p('a', 'Force', 1, 50, 1, 15)], q => `eq=brightness=-${q.a / 100}`);

// ---------- Effets sonores ----------
const AUDIO = [];
function afx(id, nom, params, make, needs = []) { AUDIO.push({ id, nom, params, make, needs }); }
afx('vgrave', 'Voix grave', [p('f', 'Hauteur', 0.6, 0.95, 0.01, 0.8)], q => `asetrate=48000*${q.f},aresample=48000,atempo=${(1 / q.f).toFixed(4)}`);
afx('vaigue', 'Voix aiguë', [p('f', 'Hauteur', 1.05, 1.6, 0.01, 1.25)], q => `asetrate=48000*${q.f},aresample=48000,atempo=${(1 / q.f).toFixed(4)}`);
afx('robot', 'Voix de robot', [], () => "afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)':win_size=512:overlap=0.75", ['afftfilt']);
afx('echo', 'Écho', [p('d', 'Délai (ms)', 40, 800, 10, 200)], q => `aecho=0.8:0.88:${q.d}:0.4`, ['aecho']);
afx('cathedrale', 'Cathédrale', [], () => 'aecho=0.8:0.9:1000|1800:0.3|0.25', ['aecho']);
afx('telephone', 'Téléphone', [], () => 'highpass=f=400,lowpass=f=3400');
afx('bruit', 'Réduction du bruit', [p('n', 'Force (dB)', 5, 40, 1, 18)], q => `afftdn=nr=${q.n}:nf=-30`, ['afftdn']);
afx('normaliser', 'Normaliser le volume', [], () => 'loudnorm=I=-16:TP=-1.5:LRA=11', ['loudnorm']);
afx('basses', 'Renforcer les basses', [p('g', 'Gain (dB)', 1, 15, 1, 8)], q => `bass=g=${q.g}`, ['bass']);
afx('voixclaire', 'Voix claire', [], () => 'highpass=f=90,equalizer=f=3500:t=q:w=1:g=4,acompressor=threshold=0.125:ratio=3', ['equalizer', 'acompressor']);

afx('megaphone', 'Mégaphone', [], () => 'highpass=f=500,lowpass=f=3500,volume=2,alimiter=limit=0.9');
afx('radio', 'Vieille radio', [], () => 'highpass=f=300,lowpass=f=3000,acompressor=threshold=0.1:ratio=6,volume=1.5', ['acompressor']);
afx('sourdine', 'Son étouffé (derrière un mur)', [], () => 'lowpass=f=700');
afx('sousleau', 'Sous l’eau', [], () => 'lowpass=f=450,aecho=0.8:0.7:90:0.5', ['aecho']);
afx('large', 'Son large (stéréo)', [], () => 'extrastereo=m=2.2', ['extrastereo']);
afx('geant', 'Voix de géant', [], () => 'asetrate=48000*0.65,aresample=48000,atempo=1.5385');

afx('podcast', 'Voix podcast pro', [], () => 'highpass=f=80,equalizer=f=200:t=q:w=1:g=2,equalizer=f=4500:t=q:w=1.2:g=3,acompressor=threshold=0.1:ratio=3:attack=15:release=250,alimiter=limit=0.95', ['equalizer', 'acompressor']);
afx('qualite', 'Améliorer le son (souffle retiré, voix claire, volume régulier)', [], () => 'highpass=f=70,afftdn=nf=-25,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1.2:g=3,acompressor=threshold=0.12:ratio=3:attack=10:release=200,dynaudnorm=f=250:g=15,alimiter=limit=0.95', ['afftdn', 'equalizer', 'acompressor', 'dynaudnorm']);
afx('gate', 'Porte de bruit (coupe le souffle)', [p('t', 'Seuil', 0.005, 0.1, 0.005, 0.02)], q => `agate=threshold=${q.t}:ratio=4:attack=10:release=200`, ['agate']);
afx('deesser', 'Adoucir les « s » (de-esser)', [p('i', 'Force', 0.1, 0.9, 0.05, 0.4)], q => `deesser=i=${q.i}`, ['deesser']);
afx('chaude', 'Voix chaude (graves renforcés)', [], () => 'equalizer=f=150:t=q:w=1:g=4,equalizer=f=3000:t=q:w=2:g=-1', ['equalizer']);
afx('limiteur', 'Limiteur (évite la saturation)', [], () => 'alimiter=limit=0.9');
afx('fm', 'Voix radio FM', [], () => 'highpass=f=100,equalizer=f=2500:t=q:w=1:g=5,acompressor=threshold=0.08:ratio=5,alimiter=limit=0.93', ['equalizer', 'acompressor']);

// ---------- Transitions (filtre xfade) ----------
// Certaines sont décrites par une formule (xfade « custom ») : elles marchent avec toutes les versions de FFmpeg.
// P va de 1 (début, image A) à 0 (fin, image B) ; a0…a3 / b0…b3 lisent un pixel de chaque image, plan par plan.
const px = (src, x, y) => `if(eq(PLANE,0),${src}0(${x},${y}),if(eq(PLANE,1),${src}1(${x},${y}),if(eq(PLANE,2),${src}2(${x},${y}),${src}3(${x},${y}))))`;
const E3 = 'if(lt(1-P,0.5),4*pow(1-P,3),1-pow(2-2*(1-P),3)/2)'; // progression de 0 à 1 qui démarre et finit en douceur
const EXPR = {
  coverleft: `if(gte(X,W*P),${px('b', 'X-W*P', 'Y')},A)`,
  coverright: `if(lt(X,W*(1-P)),${px('b', 'X+W*P', 'Y')},A)`,
  revealleft: `if(lt(X,W*P),${px('a', 'X+W*(1-P)', 'Y')},B)`,
  revealright: `if(gte(X,W*(1-P)),${px('a', 'X-W*(1-P)', 'Y')},B)`,
  stores: 'if(lt(mod(Y,H/10)/(H/10),1-P),B,A)',
  damier: 'if(gt(1-P,0.25+0.5*mod(floor(X*8/W)+floor(Y*8/H),2)),B,A)',
  rideau: 'if(lt(abs(X-W/2),W/2*(1-P)),B,A)',
  // Transitions « pro » : mouvements adoucis (départ et arrivée en douceur), bords fondus, flou de mouvement ajouté après le mélange (voir POST)
  whipg: `if(lt(X,W*(1-${E3})),${px('a', `X+W*${E3}`, 'Y')},${px('b', `X-W*(1-${E3})`, 'Y')})`,
  whipd: `if(gt(X,W*${E3}),${px('a', `X-W*${E3}`, 'Y')},${px('b', `X+W*(1-${E3})`, 'Y')})`,
  whiph: `if(lt(Y,H*(1-${E3})),${px('a', 'X', `Y+H*${E3}`)},${px('b', 'X', `Y-H*(1-${E3})`)})`,
  zoompunch: `(1-clip((${E3}-0.4)/0.2,0,1))*(${px('a', `W/2+(X-W/2)/(1+0.8*${E3})`, `H/2+(Y-H/2)/(1+0.8*${E3})`)})+clip((${E3}-0.4)/0.2,0,1)*(${px('b', `W/2+(X-W/2)/(1.8-0.8*${E3})`, `H/2+(Y-H/2)/(1.8-0.8*${E3})`)})`,
  secousse: `if(gt(P,0.5),${px('a', 'clip(X+W*0.04*sin(P*150)*(1-abs(2*P-1)),0,W-1)', 'clip(Y+H*0.03*cos(P*190)*(1-abs(2*P-1)),0,H-1)')},${px('b', 'clip(X+W*0.04*sin(P*150)*(1-abs(2*P-1)),0,W-1)', 'clip(Y+H*0.03*cos(P*190)*(1-abs(2*P-1)),0,H-1)')})`,
  irisdoux: `(1-clip(((1-P)*0.74-hypot((X-W/2)/W,(Y-H/2)/W))/0.12,0,1))*A+clip(((1-P)*0.74-hypot((X-W/2)/W,(Y-H/2)/W))/0.12,0,1)*B`,
  diagdoux: `(1-clip(((1-P)*1.3-(0.75*X/W+0.25*Y/H))/0.3,0,1))*A+clip(((1-P)*1.3-(0.75*X/W+0.25*Y/H))/0.3,0,1)*B`,
  // Vlog : glissés et zooms plus doux, fondu lumineux
  glissedoux: `if(lt(X,W*(1-${E3})),${px('a', `X+W*${E3}`, 'Y')},${px('b', `X-W*(1-${E3})`, 'Y')})`,
  zoomdoux: `(1-clip((${E3}-0.4)/0.2,0,1))*(${px('a', `W/2+(X-W/2)/(1+0.35*${E3})`, `H/2+(Y-H/2)/(1+0.35*${E3})`)})+clip((${E3}-0.4)/0.2,0,1)*(${px('b', `W/2+(X-W/2)/(1.35-0.35*${E3})`, `H/2+(Y-H/2)/(1.35-0.35*${E3})`)})`,
  scan: `if(eq(PLANE,0),min(255,(1-clip(((1-P)*1.12-X/W)/0.02,0,1))*A+clip(((1-P)*1.12-X/W)/0.02,0,1)*B+130*exp(-pow(((1-P)*1.12-X/W-0.02)*38,2))),(1-clip(((1-P)*1.12-X/W)/0.02,0,1))*A+clip(((1-P)*1.12-X/W)/0.02,0,1)*B)`,
  glitch: `if(gt(P,0.5),${px('a', 'clip(X+W*0.22*sin(floor(Y*26/H)*78.233+floor(P*14)*3.1)*(1-abs(2*P-1)),0,W-1)', 'Y')},${px('b', 'clip(X+W*0.22*sin(floor(Y*26/H)*78.233+floor(P*14)*3.1)*(1-abs(2*P-1)),0,W-1)', 'Y')})`
};
const TRANSITIONS = [
  ['fade', 'Fondu enchaîné'], ['fadeblack', 'Fondu au noir'], ['fadewhite', 'Fondu au blanc'], ['dissolve', 'Dissolution'],
  ['slideleft', 'Glissé vers la gauche'], ['slideright', 'Glissé vers la droite'], ['slideup', 'Glissé vers le haut'], ['slidedown', 'Glissé vers le bas'],
  ['wipeleft', 'Balayage gauche'], ['wiperight', 'Balayage droite'], ['smoothleft', 'Glissement doux'],
  ['hblur', 'Flou en mouvement'], ['squeezeh', 'Écrasement horizontal'], ['squeezev', 'Écrasement vertical'], ['coverleft', 'Recouvrement gauche'], ['coverright', 'Recouvrement droite'], ['revealleft', 'Dévoilement gauche'], ['revealright', 'Dévoilement droite'], ['diagtl', 'Diagonale'], ['vuslice', 'Tranches verticales'], ['hlslice', 'Tranches horizontales'], ['fadegrays', 'Fondu par le gris'],
  ['circleopen', 'Cercle qui s’ouvre'], ['circleclose', 'Cercle qui se ferme'], ['radial', 'Radial'],
  ['zoomin', 'Zoom'], ['pixelize', 'Pixels'], ['horzopen', 'Ouverture horizontale'], ['vertopen', 'Ouverture verticale'],
  ['stores', 'Stores'], ['damier', 'Damier'], ['rideau', 'Rideau qui s’ouvre'],
  // Packs de transitions : le troisième élément est le pack
  ['fondufloute', 'Fondu flouté', 'cinema'], ['diagdoux', 'Volet diagonal doux', 'cinema'], ['irisdoux', 'Iris doux', 'cinema'],
  ['whipg', 'Whip pan vers la gauche', 'reseaux'], ['whipd', 'Whip pan vers la droite', 'reseaux'], ['whiph', 'Whip pan vers le haut', 'reseaux'], ['zoompunch', 'Zoom punch', 'reseaux'],
  ['glissedoux', 'Glissé doux', 'vlog'], ['zoomdoux', 'Zoom doux', 'vlog'], ['fondulumiere', 'Fondu lumineux', 'vlog'],
  ['scan', 'Balayage numérique', 'tech'],
  ['glitch', 'Glitch RVB', 'glitch'], ['secousse', 'Secousse', 'impact']
]
  .map(([id, nom, pack]) => (EXPR[id] ? { id, nom, pack, expr: EXPR[id] } : id === 'fondufloute' ? { id, nom, pack, builtin: 'fade' } : id === 'fondulumiere' ? { id, nom, pack, builtin: 'fadewhite' } : { id, nom, pack }));

// Flou et décalage de couleurs ajoutés par-dessus la transition (fenêtres de temps successives : montée, pic, descente), comme le « motion blur »
// des packs professionnels. h = flou horizontal, v = vertical, o = dans tous les sens ; rgb = décalage des couleurs en pixels (pour 1080 px).
const POST = {
  whipg: { flou: ['h', 38] }, whipd: { flou: ['h', 38] }, whiph: { flou: ['v', 38] }, zoompunch: { flou: ['o', 16] },
  fondufloute: { flou: ['o', 16] }, glissedoux: { flou: ['h', 14] }, zoomdoux: { flou: ['o', 8] }, fondulumiere: { flou: ['o', 10] }, glitch: { rgb: 16 }, secousse: { flou: ['o', 9], rgb: 6 }
};
// S = début de la transition (s), D = durée (s), k = échelle de la définition (1 pour 1080 px de petit côté)
function postTransition(id, S, D, k = 1) {
  const q = POST[id]; if (!q) return '';
  const N = 8, out = [], f = x => x.toFixed(3);
  for (let i = 0; i < N; i++) {
    const a = S + D * i / N, b = S + D * (i + 1) / N, env = Math.pow(Math.sin(Math.PI * (i + 0.5) / N), 1.4), en = `enable='gte(t,${f(a)})*lt(t,${f(b)})'`;
    if (q.flou) { const sg = q.flou[1] * k * env, d = q.flou[0]; if (sg >= 0.8) out.push(`gblur=sigma=${(d === 'v' ? 0 : sg).toFixed(2)}:sigmaV=${(d === 'h' ? 0 : sg).toFixed(2)}:${en}`); }
    if (q.rgb) { const r = Math.round(q.rgb * k * env); if (r >= 1) out.push(`rgbashift=rh=${-r}:bh=${r}:${en}`); }
  }
  return out.length ? ',' + out.join(',') : '';
}
// morceau de graphe : le filtre xfade de la transition + son flou ; offset et durée en secondes
function filtreTransition(tr, D, offset, k = 1) {
  const def = TRANSITIONS.find(t => t.id === tr);
  const ty = def.expr ? `custom:expr='${def.expr}'` : (def.builtin || tr);
  return `xfade=transition=${ty}:duration=${D.toFixed(3)}:offset=${offset.toFixed(3)}${postTransition(tr, offset, D, k)}`;
}

// ---------- Styles de titres ----------
const TITLES = [
  { id: 'simple', nom: 'Simple', style: 'simple', anim: 'aucune' },
  { id: 'classique', nom: 'Bandeau sombre', style: 'bandeau', anim: 'aucune' },
  { id: 'contour', nom: 'Contour noir', style: 'contour', anim: 'aucune' },
  { id: 'ombre', nom: 'Ombre portée', style: 'ombre', anim: 'aucune' },
  { id: 'apparition', nom: 'Apparition en fondu', style: 'contour', anim: 'apparition' },
  { id: 'glisse', nom: 'Glissé vers le haut', style: 'bandeau', anim: 'glisse' },
  { id: 'jaune', nom: 'Sous-titre jaune', style: 'contour', anim: 'aucune', color: '#ffe600', pos: 'bas' },
  { id: 'grand', nom: 'Grand titre central', style: 'ombre', anim: 'apparition', pos: 'milieu', size: 10 }
];

// Titres de reportage (animés). l1 / l2 : textes par défaut ; couleur d'accent.
const REPORTAGE = [
  { id: 'angle', nom: 'Tiers inférieur à bloc d’accent', l1: 'Prénom Nom', l2: 'Fonction', color: '#ff2d55', pack: 'reseaux' },
  { id: 'pseudo', nom: '@pseudo en pastille', l1: '@tonpseudo', l2: '', color: '#5b3df5', pack: 'reseaux' },
  { id: 'etiquette', nom: 'Étiquette de sujet (en haut)', l1: 'Le sujet', l2: '', color: '#ff2d55', pack: 'reseaux' },
  { id: 'double', nom: 'Double barre (nom et fonction)', l1: 'Prénom Nom', l2: 'Fonction, lieu', color: '#c8102e', pack: 'journal' },
  { id: 'cine-titre', nom: 'Titre de film (bandes noires)', l1: 'Titre du film', l2: 'Un film de toi', color: '#c9a45c', pack: 'cinema' },
  { id: 'glitch-titre', nom: 'Titre glitch (couleurs décalées)', l1: 'GLITCH', l2: '', color: '#ff2d55', pack: 'glitch' },
  { id: 'impact-titre', nom: 'Titre impact (gros, sur boîte)', l1: 'Le titre', l2: 'sous-titre', color: '#ff3b30', pack: 'impact' },
  { id: 'cadre-titre', nom: 'Titre dans un cadre fin', l1: 'Mon titre', l2: 'Un sous-titre', color: '#e8c9a0', pack: 'doux' },
  { id: 'jour', nom: 'Jour du vlog (JOUR 3 + lieu)', l1: 'Jour 3', l2: 'Lisbonne, Portugal', color: '#ffb347', pack: 'vlog' },
  { id: 'lieu-vlog', nom: 'Nom du lieu (en bas à gauche)', l1: 'Lisbonne', l2: 'Alfama · 18 h', color: '#ffb347', pack: 'vlog' },
  { id: 'rec', nom: 'REC et chronomètre (caméscope)', l1: '', l2: '', color: '#ff2d2d', pack: 'vlog' },
  { id: 'numero', nom: 'Numéro de chapitre (01, titre)', l1: '01', l2: 'Le réveil', color: '#ffb347', pack: 'vlog' },
  { id: 'episode', nom: 'Épisode (numéro et titre)', l1: 'Épisode 12', l2: 'Pourquoi tout le monde se trompe sur le sommeil', color: '#ff6a3d', pack: 'podcast' },
  { id: 'invite', nom: 'Carte d’invité (nom et fonction)', l1: 'Camille Martin', l2: 'Neuroscientifique, auteure', color: '#ff6a3d', pack: 'podcast' },
  { id: 'sponsor', nom: 'Partenaire (bandeau fin)', l1: 'Nom du partenaire', l2: '', color: '#ff6a3d', pack: 'podcast' },
  { id: 'abonne', nom: 'Pastille « Abonne-toi »', l1: '@tonpodcast', l2: '', color: '#ff2d55', pack: 'podcast' },
  { id: 'rubrique', nom: 'Étiquette de rubrique', l1: 'Interview', l2: '', color: '#ff6a3d', pack: 'podcast' },
  { id: 'etape', nom: 'Étape numérotée (tuto)', l1: '1', l2: 'Ouvrir les réglages', color: '#2f80ff', pack: 'pro' },
  { id: 'astuce', nom: 'Encadré d’astuce', l1: 'Appuie sur ⌘ + Z pour annuler la dernière action.', l2: '', color: '#ffc02e', pack: 'pro' },
  { id: 'chiffre', nom: 'Gros chiffre et légende', l1: '+ 42 %', l2: 'de temps gagné en un mois', color: '#2f80ff', pack: 'pro' },
  { id: 'cours-hausse', nom: 'Carte de cours en hausse', l1: 'CAC 40', l2: '7 842,31  +1,24 %', color: '#19d38a', pack: 'finance' },
  { id: 'cours-baisse', nom: 'Carte de cours en baisse', l1: 'NASDAQ', l2: '16 410,05  −0,87 %', color: '#ff4d5e', pack: 'finance' },
  { id: 'bourse-defile', nom: 'Bandeau des marchés défilant', l1: 'CAC 40  7 842  +1,2 %   •   S&P 500  5 120  +0,4 %   •   NASDAQ  16 410  −0,9 %   •   OR  2 310 $  +0,3 %', l2: 'MARCHÉS', color: '#1f4fff', pack: 'finance' },
  { id: 'barres', nom: 'Histogramme animé (valeurs et légende)', l1: '30, 45, 38, 62, 80, 100', l2: 'Croissance sur six mois', color: '#19d38a', pack: 'finance' },
  { id: 'avertissement', nom: 'Mention : pas un conseil en investissement', l1: 'Contenu à visée informative : ceci n’est pas un conseil en investissement. Investir comporte des risques, dont la perte en capital.', l2: '', color: '#000000', pack: 'finance' },
  { id: 'hud', nom: 'Titre dans un viseur lumineux', l1: 'Intelligence artificielle', l2: 'Le test complet', color: '#19d3ff', pack: 'tech' },
  { id: 'prix', nom: 'Carte de prix (immobilier)', l1: '450 000 €', l2: 'À vendre', color: '#2f80ff', pack: 'style' },
  { id: 'caracteristiques', nom: 'Pastilles de caractéristiques', l1: 'T3 | 68 m² | Balcon | 2e étage', l2: '', color: '#2f80ff', pack: 'style' },
  { id: 'liste', nom: 'Liste à puces animée', l1: 'Boire de l’eau\nMarcher 20 minutes\nDormir avant 23 h', l2: 'Trois habitudes', color: '#2fd6a3', pack: 'style' },
  { id: 'verset', nom: 'Verset ou citation (filets dorés)', l1: 'Car Dieu a tant aimé le monde qu’il a donné son Fils unique.', l2: 'Jean 3, 16', color: '#c9a45c', pack: 'style' },
  { id: 'promo', nom: 'Pastille de promotion', l1: '-30 %', l2: 'Jusqu’à dimanche', color: '#ff2d6f', pack: 'style' },
  { id: 'avertissement-sante', nom: 'Mention : pas un avis médical', l1: 'Ces informations sont d’ordre général et ne remplacent pas l’avis d’un professionnel de santé.', l2: '', color: '#000000', pack: 'style' },
  { id: 'tiers', nom: 'Bandeau de journaliste (nom + fonction)', l1: 'Prénom Nom', l2: 'Fonction, lieu', color: '#c8102e' },
  { id: 'minimal', nom: 'Titre minimal (barre verticale)', l1: 'Titre de la séquence', l2: 'Sous-titre', color: '#ffb400' },
  { id: 'flash', nom: 'Flash info (bandeau défilant)', l1: 'Dernière minute : écris ici ton information qui défile en bas de l’écran', l2: 'FLASH INFO', color: '#d40000' },
  { id: 'lieu', nom: 'Lieu et date (en haut)', l1: 'PARIS', l2: 'Samedi 10 octobre', color: '#1f4fff' },
  { id: 'tv', nom: 'Sous-titre télé (barre complète)', l1: 'Ton sous-titre ici', l2: '', color: '#000000' },
  { id: 'chapitre', nom: 'Chapitre (titre central)', l1: 'CHAPITRE 1', l2: 'Le début de l’histoire', color: '#ffffff' },
  { id: 'citation', nom: 'Citation', l1: 'Ta citation ici, entre guillemets.', l2: '— Auteur', color: '#ffb400' },
  { id: 'machine', nom: 'Machine à écrire (lettre par lettre)', l1: 'Ton texte qui s’écrit tout seul…', l2: '', color: '#ffffff' },
  { id: 'souligne', nom: 'Titre souligné (barre qui s’étire)', l1: 'Mon titre', l2: 'Un sous-titre', color: '#ffb400' },
  { id: 'progression', nom: 'Barre de progression (en haut)', l1: '', l2: '', color: '#ff2d55' },
  { id: 'compte', nom: 'Compte à rebours (5 à 1)', l1: '5', l2: '', color: '#ffffff' },
  { id: 'generique', nom: 'Générique de fin (texte qui défile)', l1: 'RÉALISATION\nTon nom\n\nMONTAGE\nTon nom\n\nMERCI D’AVOIR REGARDÉ', l2: '', color: '#ffffff' }
];
// Styles de sous-titres : mots = affichés mot à mot (1 à 3 mots), sinon par phrases ; taille = taille conseillée (en % de la petite dimension)
const SOUS_TITRES = [
  { id: 'bandeau', nom: 'Phrases sur bandeau sombre', mots: false, taille: 4.4 }, { id: 'contour', nom: 'Phrases, contour noir', mots: false, taille: 4.4 },
  { id: 'jaune', nom: 'Phrases en jaune', mots: false, taille: 4.4 }, { id: 'tiktok', nom: 'Mot à mot, gros et centré (TikTok)', mots: true, taille: 6.5 },
  { id: 'hormozi', nom: 'Hormozi : capitales, jaune et blanc', mots: true, taille: 6.2, pack: true }, { id: 'neon', nom: 'Néon : halo bleu', mots: true, taille: 5.6, pack: true },
  { id: 'boite', nom: 'Mot sur boîte blanche', mots: true, taille: 5.2, pack: true }, { id: 'rouge', nom: 'Mot sur boîte rouge', mots: true, taille: 5.2, pack: true },
  { id: 'pop', nom: 'Feutre jaune (pop)', mots: true, taille: 6.2, pack: true }, { id: 'gaming', nom: 'Gaming : couleurs décalées', mots: true, taille: 5.6, pack: true },
  { id: 'cinema', nom: 'Cinéma : phrases élégantes', mots: false, taille: 4, pack: true }, { id: 'minimal', nom: 'Minimal : petit, sur voile', mots: false, taille: 3.4, pack: true }
];
const GENERATEURS = [
  { id: 'noir', nom: 'Fond noir', color: '#000000' }, { id: 'blanc', nom: 'Fond blanc', color: '#ffffff' },
  { id: 'nuit', nom: 'Bleu nuit', color: '#0b1d3a' }, { id: 'rouge', nom: 'Rouge', color: '#b3122b' },
  { id: 'or', nom: 'Jaune doré', color: '#e0a800' }, { id: 'vert', nom: 'Vert forêt', color: '#14532d' },
  { id: 'vertchroma', nom: 'Vert (fond vert)', color: '#00b140' }, { id: 'gris', nom: 'Gris ardoise', color: '#2b2f38' }
];

const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

function defaults(def) { const o = {}; def.params.forEach(q => { o[q.k] = q.def; }); return o; }
function catalogue(filters) {
  const ok = d => d.needs.every(n => filters.has(n));
  const map = d => ({ id: d.id, nom: d.nom, cat: d.cat, params: d.params, dispo: ok(d), blend: !!d.blend });
  return { video: VIDEO.map(map), audio: AUDIO.map(map), transitions: TRANSITIONS.map(t => ({ id: t.id, nom: t.nom, pack: t.pack })), titres: TITLES, reportage: REPORTAGE, sousTitres: SOUS_TITRES, generateurs: GENERATEURS, positions: POSITIONS };
}

module.exports = { SOUS_TITRES, VIDEO, AUDIO, TRANSITIONS, filtreTransition, postTransition, TITLES, REPORTAGE, GENERATEURS, POSITIONS, catalogue, defaults };
