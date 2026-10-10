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
look('dramatique', 'Dramatique', 'eq=contrast=1.3:saturation=0.8:gamma=0.9,vignette=angle=0.9', ['vignette']);

// ---------- Flou et netteté ----------
fx('flou', 'Flou', 'Flou et netteté', [p('s', 'Force', 1, 40, 1, 8)], q => `gblur=sigma=${q.s}`, { needs: ['gblur'] });
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
fx('retourh', 'Retourner (gauche/droite)', 'Mouvement', [], () => 'hflip');
fx('retourv', 'Retourner (haut/bas)', 'Mouvement', [], () => 'vflip');
fx('inverse', 'Lecture à l’envers', 'Mouvement', [], () => 'reverse', { needs: ['reverse'] });

// ---------- Lumière ----------
fx('flash', 'Flash régulier', 'Lumière', [p('per', 'Intervalle (s)', 0.5, 5, 0.5, 2)], (q, c) =>
  `eq=brightness='0.7*max(0,1-5*mod(${T(c)},${q.per}))':eval=frame`);
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

// ---------- Transitions (filtre xfade) ----------
const TRANSITIONS = [
  ['fade', 'Fondu enchaîné'], ['fadeblack', 'Fondu au noir'], ['fadewhite', 'Fondu au blanc'], ['dissolve', 'Dissolution'],
  ['slideleft', 'Glissé vers la gauche'], ['slideright', 'Glissé vers la droite'], ['slideup', 'Glissé vers le haut'], ['slidedown', 'Glissé vers le bas'],
  ['wipeleft', 'Balayage gauche'], ['wiperight', 'Balayage droite'], ['smoothleft', 'Glissement doux'],
  ['circleopen', 'Cercle qui s’ouvre'], ['circleclose', 'Cercle qui se ferme'], ['radial', 'Radial'],
  ['zoomin', 'Zoom'], ['pixelize', 'Pixels'], ['horzopen', 'Ouverture horizontale'], ['vertopen', 'Ouverture verticale']
].map(([id, nom]) => ({ id, nom }));

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

const POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

function defaults(def) { const o = {}; def.params.forEach(q => { o[q.k] = q.def; }); return o; }
function catalogue(filters) {
  const ok = d => d.needs.every(n => filters.has(n));
  const map = d => ({ id: d.id, nom: d.nom, cat: d.cat, params: d.params, dispo: ok(d), blend: !!d.blend });
  return { video: VIDEO.map(map), audio: AUDIO.map(map), transitions: TRANSITIONS, titres: TITLES, positions: POSITIONS };
}

module.exports = { VIDEO, AUDIO, TRANSITIONS, TITLES, POSITIONS, catalogue, defaults };
