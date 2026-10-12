// Chapitres automatiques, extraits pour le clipping et découpe d'une partie du montage.
'use strict';
const { proposerChapitres, proposerMoments, segmentsDuProjet, phrases } = require('../chapitrage');
const { extraireSegment, habillerTikTok } = require('../decoupe');
let ok = 0, ko = 0; const check = (n, c, i = '') => { if (c) ok++; else { ko++; console.log('  ÉCHEC :', n, i); } };

// vidéo de 6 minutes : bonjour, trois sujets bien distincts, conclusion
const SUJETS = [
  ['Bonjour à tous et bienvenue, aujourd’hui je vais vous présenter trois astuces pour mieux dormir.', 'On va voir ensemble pourquoi le sommeil est important pour la santé.'],
  ['Première astuce : la chambre. Gardez la chambre fraîche, autour de dix-huit degrés. La température de la chambre change la qualité du sommeil.', 'Éteignez aussi la lumière, les rideaux épais aident la chambre à rester sombre.', 'Une chambre fraîche et sombre aide le corps à produire la mélatonine.'],
  ['Deuxième astuce : les écrans. Les écrans du téléphone gardent le cerveau éveillé. Évitez les écrans une heure avant de dormir.', 'La lumière bleue des écrans retarde la fatigue du soir.', 'Posez le téléphone dans une autre pièce pour résister aux écrans.'],
  ['Troisième astuce : le café. Le café reste dans le sang pendant des heures. Arrêtez le café après quatorze heures.', 'Un café tardif décale le sommeil, même si vous vous endormez.', 'Remplacez le café par une tisane le soir.'],
  ['Pour conclure, retenez la chambre fraîche, les écrans éteints et le café du matin seulement. Merci d’avoir regardé, abonnez-vous et à bientôt.']
];
const segs = []; let t = 0;
for (const bloc of SUJETS) for (const ph of bloc) { const d = 22 + (ph.length % 9); segs.push({ s: t, e: t + d, t: ph }); t += d + 1.2; }
const total = t;
const ch = proposerChapitres(segs, total, { nb: 5 });
check('chapitres : au moins 3', ch.length >= 3, ch.length);
check('chapitres : le premier à 0 s', ch[0] && ch[0].t === 0);
check('chapitres : premier = Introduction', ch[0] && ch[0].titre === 'Introduction', ch[0] && ch[0].titre);
check('chapitres : dernier = Conclusion', ch[ch.length - 1].titre === 'Conclusion', ch.map(c => c.titre).join(' | '));
check('chapitres : séparés d’au moins 10 s', ch.every((c, i) => !i || c.t - ch[i - 1].t >= 10));
check('chapitres : une coupure au changement de sujet (écrans, café)', [/ecran|écran/i, /caf/i].every(re => ch.some(c => re.test(c.titre))), ch.map(c => c.titre).join(' | '));
check('chapitres : trop court = rien', proposerChapitres(segs.slice(0, 1), 20).length === 0);

const ex = proposerMoments(segs, total, { nb: 3, min: 20, max: 60 });
check('extraits : 3 demandés', ex.length === 3, ex.length);
check('extraits : durée entre 20 et 60 s', ex.every(m => m.e - m.s >= 19.9 && m.e - m.s <= 60.1), ex.map(m => m.e - m.s).join(','));
check('extraits : sans chevauchement', ex.every((m, i) => !i || m.s >= ex[i - 1].e), JSON.stringify(ex.map(m => [m.s, m.e])));
check('extraits : un titre court', ex.every(m => m.titre && m.titre.length <= 62));
check('extraits : commencent sur une phrase entière', ex.every(m => segs.some(s => Math.abs(s.s - m.s) < 0.01)));

// découpe d'une partie du montage
const proj = { format: 'horizontal', markers: [3], nomsReperes: {}, clips: [
  { kind: 'video', file: 'a.mp4', in: 10, out: 40, speed: 1, subs: [{ s: 2, e: 4, t: 'un' }, { s: 12, e: 14, t: 'deux' }, { s: 25, e: 28, t: 'trois' }], transition: { type: 'fade', dur: 0.6 }, overlays: [] },
  { kind: 'image', file: 'p.png', dur: 10, subs: [], overlays: [] }],
  audio: [{ file: 'lib:musiques/x.mp3', start: 0, vol: 30, fade: true, loop: true, duck: true }, { file: 'v.mp3', start: 5, vol: 100, dur: 4 }], pistes: [{ file: 'o.mp4', kind: 'video', in: 0, out: 6, start: 20, scale: 30 }] };
const e = extraireSegment(proj, 10, 35);
check('découpe : durée 25 s', Math.abs(e.clips.reduce((s, c) => s + (c.kind === 'image' ? c.dur : c.out - c.in), 0) - 25) < 0.01);
check('découpe : le premier clip commence à 20 s de la source', e.clips[0].in === 20 && e.clips[0].out === 40, JSON.stringify([e.clips[0].in, e.clips[0].out]));
check('découpe : sous-titres recalés et filtrés', e.clips[0].subs.length === 2 && e.clips[0].subs[1].t === 'trois' && e.clips[0].subs[1].s === 15, JSON.stringify(e.clips[0].subs));
check('découpe : la photo garde 5 s', e.clips[1].dur === 5, e.clips[1].dur);
check('découpe : la musique continue, le son de 4 s (avant l’extrait) disparaît', e.audio.length === 1 && e.audio[0].file.startsWith('lib:') && e.audio[0].start === 0 && e.audio[0].in === 10, JSON.stringify(e.audio));
check('découpe : l’incrustation est décalée', e.pistes.length === 1 && e.pistes[0].start === 10, JSON.stringify(e.pistes));
check('découpe : la dernière transition est retirée', e.clips[e.clips.length - 1].transition === null);
check('découpe : le projet d’origine n’est pas modifié', proj.clips[0].in === 10 && proj.clips[0].subs.length === 3);
const tk = habillerTikTok(extraireSegment(proj, 10, 30), { accroche: 'Une astuce', cadrage: 'flou' });
check('TikTok : vertical + sous-titres gros + accroche', tk.format === 'vertical' && tk.clips[0].subStyle === 'tiktok' && tk.clips[0].text === 'Une astuce' && tk.clips[0].fit === 'flou');
let erreur = ''; try { extraireSegment(proj, 5, 5.1); } catch (er) { erreur = er.message; }
check('découpe : extrait trop court refusé', /court/.test(erreur));
check('segments : lus depuis les sous-titres du montage', segmentsDuProjet(proj).length === 3 && segmentsDuProjet(proj)[2].s === 25);
console.log(`Chapitres et clipping : ${ok} contrôles réussis, ${ko} échecs`); process.exit(ko ? 1 : 0);
