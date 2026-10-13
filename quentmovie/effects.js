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

// ---------- Mouvements de caméra « pro » (départ et arrivée en douceur, dérive lente, caméra à l'épaule) ----------
const lisse = k => `(${k}*${k}*(3-2*${k}))`;
fx('poussee', 'Poussée douce (départ et arrivée en douceur)', 'Mouvement', [p('a', 'Amplitude', 5, 60, 1, 18, ' %')], (q, c) => {
  const D = Math.max(0.2, c.eff).toFixed(3), z = `(1+${q.a / 100}*${lisse(`min(1,${T(c)}/${D})`)})`;
  return `scale=w='${even(`${c.W}*${z}`)}':h='${even(`${c.H}*${z}`)}':eval=frame,crop=${c.W}:${c.H}`;
});
fx('derive', 'Dérive lente (effet documentaire)', 'Mouvement', [p('a', 'Amplitude', 5, 40, 1, 15, ' %')], (q, c) =>
  `scale=${even(`${c.W}*${1 + q.a / 100}`)}:${even(`${c.H}*${1 + q.a / 100}`)},crop=${c.W}:${c.H}:x='(iw-ow)*(0.5+0.45*sin(${T(c)}*0.4))':y='(ih-oh)*(0.5+0.4*cos(${T(c)}*0.31))'`);
fx('epaule', 'Caméra à l’épaule (léger tremblé réaliste)', 'Mouvement', [p('a', 'Force', 5, 100, 1, 40, ' %')], (q, c) => {
  const A = (q.a / 100 * 0.018 * c.W).toFixed(1), t = T(c);
  return `scale=${even(`${c.W}*1.07`)}:${even(`${c.H}*1.07`)},crop=${c.W}:${c.H}:x='(iw-ow)/2+${A}*(sin(${t}*2.1)+0.6*sin(${t}*5.3)+0.3*sin(${t}*11.7))':y='(ih-oh)/2+${A}*(cos(${t}*1.7)+0.6*sin(${t}*4.9)+0.3*cos(${t}*10.9))'`;
});
fx('orbite', 'Orbite douce (la caméra tourne autour)', 'Mouvement', [p('a', 'Amplitude', 5, 40, 1, 14, ' %'), p('d', 'Durée d’un tour (s)', 3, 30, 1, 10)], (q, c) =>
  `scale=${even(`${c.W}*${1 + q.a / 100}`)}:${even(`${c.H}*${1 + q.a / 100}`)},crop=${c.W}:${c.H}:x='(iw-ow)*(0.5+0.5*sin(${T(c)}*6.2832/${q.d}))':y='(ih-oh)*(0.5+0.5*cos(${T(c)}*6.2832/${q.d}))'`);
fx('reboundzoom', 'Zoom rebond (coup de poing élastique)', 'Mouvement', [p('a', 'Amplitude', 5, 60, 1, 20, ' %')], (q, c) => {
  const k = `(1+${q.a / 100}*(1-exp(-5*${T(c)})*cos(14*${T(c)})))`;
  return `scale=w='${even(`${c.W}*${k}`)}':h='${even(`${c.H}*${k}`)}':eval=frame,crop=${c.W}:${c.H}`;
});
fx('roulis', 'Roulis léger (la caméra se penche)', 'Mouvement', [p('deg', 'Angle maximal', 1, 10, 0.5, 2, '°')], (q, c) =>
  `rotate=a='${(q.deg * Math.PI / 180).toFixed(4)}*sin(${T(c)}*0.9)':ow=iw:oh=ih:c=black,scale=${even(`iw*1.12`)}:${even(`ih*1.12`)},crop=${c.W}:${c.H}`, { needs: ['rotate'] });

// ---------- Cinéma (bandes, halation, pellicule, contraste, lueur dorée) ----------
fx('bandescine', 'Bandes cinéma (format large)', 'Cinéma', [p('r', 'Format (2,39 = cinéma)', 1.6, 2.4, 0.01, 2.39)], (q, c) => {
  const b = Math.max(0, Math.round((c.H - c.W / q.r) / 2 / 2) * 2);
  return b > 0 ? `drawbox=x=0:y=0:w=iw:h=${b}:color=black:t=fill,drawbox=x=0:y=ih-${b}:w=iw:h=${b}:color=black:t=fill` : 'null';
}, { needs: ['drawbox'] });
fx('halation', 'Halation (halo rouge autour des hautes lumières)', 'Cinéma', [p('a', 'Intensité', 5, 100, 1, 55, ' %')], q => ({
  graph: (i, o) => `[${i}]format=yuv420p,split[a_${o}][b_${o}];[b_${o}]curves=all='0/0 0.62/0 1/1',gblur=sigma=22,lutrgb=g='val*0.35':b='val*0.12',format=yuv420p[g_${o}];[a_${o}][g_${o}]blend=all_mode=screen:all_opacity=${q.a / 100}[${o}]`
}), { needs: ['gblur', 'blend', 'curves', 'lutrgb'] });
fx('lueurdoree', 'Lueur dorée (bloom chaud)', 'Cinéma', [p('a', 'Intensité', 5, 100, 1, 45, ' %')], q => ({
  graph: (i, o) => `[${i}]format=yuv420p,split[a_${o}][b_${o}];[b_${o}]gblur=sigma=28,lutrgb=r='val*1.0':g='val*0.8':b='val*0.45',format=yuv420p[g_${o}];[a_${o}][g_${o}]blend=all_mode=screen:all_opacity=${q.a / 100}[${o}]`
}), { needs: ['gblur', 'blend', 'lutrgb'] });
fx('film16', 'Pellicule 16 mm (grain, douceur, vignette)', 'Cinéma', [p('n', 'Grain', 5, 40, 1, 16)], q => `noise=alls=${q.n}:allf=t+u,gblur=sigma=0.6,eq=saturation=0.88:contrast=1.06,vignette=angle=0.75`, { needs: ['noise', 'gblur', 'vignette'] });
fx('cinecontraste', 'Contraste cinéma (noirs profonds, lumières douces)', 'Cinéma', [AMOUNT], () => "curves=all='0/0.03 0.25/0.17 0.5/0.5 0.75/0.85 1/0.97',eq=saturation=1.08", { blend: true, needs: ['curves'] });
fx('flashbattement', 'Flash au rythme (lumière qui pulse)', 'Lumière', [p('bpm', 'Rythme (bpm)', 60, 180, 1, 120), p('a', 'Force', 5, 60, 1, 22, ' %')], (q, c) =>
  `eq=brightness='${q.a / 100}*exp(-9*mod(${T(c)}*${q.bpm}/60,1))':eval=frame`, { needs: ['eq'] });
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
// ---------- Transitions rapides ----------
// Les formules xfade « custom » sont calculées pixel par pixel (jusqu'à 30 s par transition en 1080p). Ici, le même rendu
// est obtenu avec des filtres natifs dont les réglages ne sont calculés qu'une fois par image : recadrage d'une bande
// (glissés, whips), superposition (recouvrements), zoom image par image, seuil sur un dégradé fixe (stores, damier, rideau…).
// A et B : les deux plans pendant la transition (durée D, temps qui repart de 0) ; renvoie les instructions du graphe.
const f3 = x => (+x).toFixed(4);
const easeT = (D, t = 't') => `if(lt(${t}/${f3(D)},0.5),4*pow(${t}/${f3(D)},3),1-pow(2-2*${t}/${f3(D)},3)/2)`;
const uEase = e => (e < 0.5 ? Math.cbrt(e / 4) : 1 - Math.cbrt(2 * (1 - e)) / 2); // instant (0 à 1) où la progression adoucie vaut e
// dégradé fixe (calculé une seule fois) puis seuil qui monte avec le temps : B là où le dégradé est sous le seuil
const seuil = (o, A, B, out, lum) => [
  `color=c=black:s=${o.W}x${o.H}:r=${o.fps}:d=${f3(1 / o.fps)},format=yuv420p,geq=lum='${lum}':cb=128:cr=128,loop=loop=-1:size=1,trim=duration=${f3(o.D)},setpts=PTS-STARTPTS,format=gbrp[g${o.u}]`,
  `color=c=black:s=${o.W}x${o.H}:r=${o.fps}:d=${f3(o.D)},format=yuv420p,eq=brightness='t/${f3(o.D)}*219/255':eval=frame,format=gbrp[s${o.u}]`,
  `[${A}]format=gbrp[ga${o.u}]`, `[${B}]format=gbrp[gb${o.u}]`,
  ...(o.doux ? [`[g${o.u}][s${o.u}]lut2=c0='clip((y-x)*${o.doux},0,255)':c1='clip((y-x)*${o.doux},0,255)':c2='clip((y-x)*${o.doux},0,255)'[m${o.u}]`, // bord fondu : masque calculé une fois par paire de valeurs
    `[ga${o.u}][gb${o.u}][m${o.u}]maskedmerge,format=yuv420p[${out}]`]
    : [`[g${o.u}][s${o.u}][gb${o.u}][ga${o.u}]threshold,format=yuv420p[${out}]`])
];
const glisse = (dir, sens) => o => { // dir h/v ; sens : 1 = A part vers la gauche/le haut, -1 = vers la droite
  const E = easeT(o.D), pile = dir === 'h' ? 'hstack' : 'vstack', ab = sens > 0 ? `[${o.A}][${o.B}]` : `[${o.B}][${o.A}]`, pos = sens > 0 ? `${dir === 'h' ? o.W : o.H}*(${E})` : `${dir === 'h' ? o.W : o.H}*(1-(${E}))`;
  return [`${ab}${pile},crop=${o.W}:${o.H}:${dir === 'h' ? `'${pos}':0` : `0:'${pos}'`}[${o.out}]`];
};
const recouvre = (dessus, x) => o => [`[${dessus === 'b' ? o.A : o.B}][${dessus === 'b' ? o.B : o.A}]overlay=x='${x(o)}':y=0:eval=frame[${o.out}]`];
const zoomT = c => o => {
  const zA = `1+${c}*(${easeT(o.D, 'it')})`, zB = `${1 + c}-${c}*(${easeT(o.D, 'it')})`, t1 = o.D * uEase(0.4), t2 = o.D * uEase(0.6);
  const zp = z => `zoompan=z='${z}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${o.W}x${o.H}:fps=${o.fps},setpts=PTS-STARTPTS`;
  return [`[${o.A}]${zp(zA)}[za${o.u}]`, `[${o.B}]${zp(zB)},trim=start=${f3(t1)},setpts=PTS-STARTPTS[zb${o.u}]`,
    `[za${o.u}][zb${o.u}]xfade=transition=fade:duration=${f3(Math.max(1 / o.fps, t2 - t1))}:offset=${f3(t1)}[${o.out}]`];
};
const milieu = (o, apres) => [`[${o.A}]trim=end=${f3(o.D / 2)},setpts=PTS-STARTPTS[ma${o.u}]`, `[${o.B}]trim=start=${f3(o.D / 2)},setpts=PTS-STARTPTS[mb${o.u}]`,
  `[ma${o.u}][mb${o.u}]concat=n=2:v=1:a=0,${apres}[${o.out}]`];
const NATIF = {
  whipg: glisse('h', 1), glissedoux: glisse('h', 1), whipd: glisse('h', -1), whiph: glisse('v', 1),
  coverleft: recouvre('b', o => `${o.W}*(1-t/${f3(o.D)})`), coverright: recouvre('b', o => `-${o.W}*(1-t/${f3(o.D)})`),
  revealleft: recouvre('a', o => `-${o.W}*t/${f3(o.D)}`), revealright: recouvre('a', o => `${o.W}*t/${f3(o.D)}`),
  zoompunch: zoomT(0.8), zoomdoux: zoomT(0.35),
  stores: o => seuil(o, o.A, o.B, o.out, `16+219*mod(Y,H/10)/(H/10)`),
  damier: o => seuil(o, o.A, o.B, o.out, `16+219*(0.25+0.5*mod(floor(X*8/W)+floor(Y*8/H),2))`),
  rideau: o => seuil(o, o.A, o.B, o.out, `16+219*abs(X-W/2)/(W/2)`),
  irisdoux: o => seuil({ ...o, doux: (0.74 / 0.12).toFixed(3) }, o.A, o.B, o.out, `16+219*min(1,hypot((X-W/2)/W,(Y-H/2)/W)/0.74)`),
  diagdoux: o => seuil({ ...o, doux: (1.3 / 0.3).toFixed(3) }, o.A, o.B, o.out, `16+219*min(1,(0.75*X/W+0.25*Y/H)/1.3)`),
  scan: o => [...seuil(o, o.A, o.B, `sc${o.u}`, `16+219*min(1,X/W/1.12)`),
    `[sc${o.u}]drawbox=x='${o.W}*1.12*t/${f3(o.D)}-${Math.round(6 * o.k)}':y=0:w=${Math.max(2, Math.round(12 * o.k))}:h=${o.H}:color=white@0.55:t=fill[${o.out}]`],
  secousse: o => milieu(o, `scale=${Math.round(o.W * 1.1 / 2) * 2}:${Math.round(o.H * 1.1 / 2) * 2},crop=${o.W}:${o.H}:'(iw-${o.W})/2+${o.W}*0.04*sin((1-t/${f3(o.D)})*150)*(1-abs(1-2*t/${f3(o.D)}))':'(ih-${o.H})/2+${o.H}*0.03*cos((1-t/${f3(o.D)})*190)*(1-abs(1-2*t/${f3(o.D)}))'`),
  glitch: o => { // bandes décalées au hasard (16 bandes), plus fortes au milieu de la transition
    const n = 16, h = Math.floor(o.H / n / 2) * 2, l = milieu(o, `split=${n + 1}[gb${o.u}]${Array.from({ length: n }, (_, i) => `[gs${o.u}_${i}]`).join('')}`).map(x => x.replace(`[${o.out}]`, ''));
    let cur = `gb${o.u}`;
    for (let i = 0; i < n; i++) {
      const dx = `${o.W}*0.22*sin(${(i * 78.233).toFixed(3)}+floor((1-t/${f3(o.D)})*14)*3.1)*(1-abs(1-2*t/${f3(o.D)}))`, nx = i === n - 1 ? o.out : `gc${o.u}_${i}`;
      l.push(`[gs${o.u}_${i}]crop=${o.W}:${h}:0:${i * h}[gr${o.u}_${i}]`, `[${cur}][gr${o.u}_${i}]overlay=x='${dx}':y=${i * h}:eval=frame[${nx}]`); cur = nx;
    }
    return l;
  }
};
const natif = id => !!NATIF[id];
// Transition complète en graphe : A jusqu'au fondu, transition rapide, puis la suite de B ; mêmes temps que xfade.
// Renvoie les instructions (sans « ; ») ; la sortie est [out]. o = { W, H, fps, u (identifiant unique) }.
function grapheTransition(tr, D, offset, k, A, B, out, o) {
  const u = o.u, q = { ...o, D, k, A: `ta${u}`, B: `tb${u}`, out: `tc${u}` }, l = [];
  l.push(`[${A}]split[av${u}][ar${u}]`, `[${B}]split[bv${u}][br${u}]`);
  l.push(`[ar${u}]trim=start=${f3(offset)}:duration=${f3(D)},setpts=PTS-STARTPTS[ta${u}]`, `[br${u}]trim=duration=${f3(D)},setpts=PTS-STARTPTS[tb${u}]`);
  l.push(...NATIF[tr](q), `[tc${u}]setsar=1[td${u}]`); // pixels carrés partout : concat exige les mêmes réglages
  const morceaux = [];
  if (offset > 0.5 / o.fps) { l.push(`[av${u}]trim=duration=${f3(offset)},setpts=PTS-STARTPTS,setsar=1[tp${u}]`); morceaux.push(`tp${u}`); } else l.push(`[av${u}]nullsink`);
  morceaux.push(`td${u}`);
  l.push(`[bv${u}]trim=start=${f3(D)},setpts=PTS-STARTPTS,setsar=1[ts${u}]`); morceaux.push(`ts${u}`);
  l.push(`${morceaux.map(m => `[${m}]`).join('')}concat=n=${morceaux.length}:v=1:a=0${postTransition(tr, offset, D, k)}[${out}]`);
  return l;
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
  { id: 'grand', nom: 'Grand titre central', style: 'ombre', anim: 'apparition', pos: 'milieu', size: 10 },
  // Modèles de texte animés (comme les « modèles de texte » des logiciels de montage pour les réseaux)
  { id: 'accroche', nom: 'Accroche jaune qui monte (hook)', style: 'contour', anim: 'monte', color: '#ffe600', pos: 'milieu', size: 9 },
  { id: 'pop-blanc', nom: 'Titre blanc qui rebondit', style: 'ombre', anim: 'rebond', pos: 'milieu', size: 9 },
  { id: 'balaye', nom: 'Titre qui balaie depuis la gauche', style: 'bandeau', anim: 'balayage', pos: 'haut', size: 7 },
  { id: 'choc', nom: 'Choc : tremblement à l’arrivée', style: 'contour', anim: 'tremble', color: '#ff3b30', pos: 'milieu', size: 10 },
  { id: 'live', nom: 'Étiquette clignotante (LIVE, REC)', style: 'bandeau', anim: 'clignote', color: '#ff3b30', pos: 'haut', size: 5 },
  { id: 'respire', nom: 'Titre qui respire (calme)', style: 'ombre', anim: 'pulse', pos: 'milieu', size: 8 },
  { id: 'descente', nom: 'Titre qui descend avec rebond', style: 'contour', anim: 'descend', pos: 'haut', size: 8 }
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
  { id: 'intro-vlog', nom: 'Intro de vlog (grand nom du lieu)', l1: 'Lisbonne', l2: 'Bienvenue à', color: '#ffb347', pack: 'vlog' },
  { id: 'trajet', nom: 'Trajet (départ → arrivée)', l1: 'Paris', l2: 'Lisbonne', color: '#ffb347', pack: 'vlog' },
  { id: 'temps', nom: 'Date et heure façon caméscope', l1: '12 oct. 2026', l2: '18:42', color: '#ffffff', pack: 'vlog' },
  { id: 'now-playing', nom: 'En ce moment : titre et artiste (égaliseur)', l1: 'Titre du morceau', l2: 'Nom de l’artiste', color: '#ffb347', pack: 'vlog' },
  { id: 'question', nom: 'Question posée à l’invité', l1: 'Comment passe-t-on d’une idée à un premier client ?', l2: '', color: '#ff6a3d', pack: 'podcast' },
  { id: 'plateformes', nom: 'Bandeau « Écoute-nous sur… »', l1: 'Spotify · Apple Podcasts · YouTube · Deezer', l2: '', color: '#ff6a3d', pack: 'podcast' },
  { id: 'sommaire', nom: 'Chapitres horodatés', l1: '00:00 Introduction\n04:12 Le déclic\n18:40 Les erreurs\n32:05 Conclusion', l2: 'Au programme', color: '#ff6a3d', pack: 'podcast' },
  { id: 'citation-pro', nom: 'Grande citation de l’invité', l1: 'On apprend plus d’un échec que de dix réussites.', l2: 'Camille Martin', color: '#ff6a3d', pack: 'podcast' },
  { id: 'courbe', nom: 'Courbe en aire qui se dessine', l1: '100, 104, 101, 108, 112, 109, 118, 124, 121, 130', l2: 'Action X · 6 mois', color: '#19d38a', pack: 'finance' },
  { id: 'barres-h', nom: 'Classement en barres horizontales', l1: 'Apple: 42\nMicrosoft: 35\nNvidia: 28\nAmazon: 19', l2: 'Croissance en %', color: '#19d38a', pack: 'finance' },
  { id: 'compteur', nom: 'Compteur qui défile jusqu’au chiffre', l1: '12500 €', l2: 'investis en 12 mois', color: '#19d38a', pack: 'finance' },
  { id: 'definition', nom: 'Définition d’un terme (finance)', l1: 'ETF', l2: 'Fonds indiciel coté en bourse qui réplique la performance d’un indice.', color: '#2f80ff', pack: 'finance' },
  { id: 'risque', nom: 'Jauge de niveau de risque (1 à 5)', l1: '3', l2: '', color: '#ffd400', pack: 'finance' },
  { id: 'objectif', nom: 'Barre de progression vers un objectif', l1: 'Objectif : 10 000 €', l2: '68', color: '#19d38a', pack: 'finance' },
  { id: 'tiers', nom: 'Bandeau de journaliste (nom + fonction)', l1: 'Prénom Nom', l2: 'Fonction, lieu', color: '#c8102e' },
  { id: 'minimal', nom: 'Titre minimal (barre verticale)', l1: 'Titre de la séquence', l2: 'Sous-titre', color: '#ffb400' },
  { id: 'flash', nom: 'Flash info (bandeau défilant)', l1: 'Dernière minute : écris ici ton information qui défile en bas de l’écran', l2: 'FLASH INFO', color: '#d40000' },
  { id: 'lieu', nom: 'Lieu et date (en haut)', l1: 'PARIS', l2: 'Samedi 10 octobre', color: '#1f4fff' },
  { id: 'tv', nom: 'Sous-titre télé (barre complète)', l1: 'Ton sous-titre ici', l2: '', color: '#000000' },
  { id: 'chapitre', nom: 'Chapitre (titre central)', l1: 'CHAPITRE 1', l2: 'Le début de l’histoire', color: '#ffffff' },
  { id: 'citation', nom: 'Citation', l1: 'Ta citation ici, entre guillemets.', l2: '— Auteur', color: '#ffb400' },
  { id: 'chapnoir', nom: 'Chapitre vlog (écran noir, titre qui s’écrit)', l1: 'Mon chapitre', l2: 'Chapitre 01', color: '#f5c542' },
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

module.exports = { SOUS_TITRES, VIDEO, AUDIO, TRANSITIONS, filtreTransition, grapheTransition, natif, postTransition, TITLES, REPORTAGE, GENERATEURS, POSITIONS, catalogue, defaults };
