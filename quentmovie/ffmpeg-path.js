// Choix de FFmpeg : celui fourni avec l'application, sinon celui installé sur le Mac (Homebrew).
'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const unpack = p => (p ? p.replace('app.asar' + path.sep, 'app.asar.unpacked' + path.sep) : p);
function tryRequire(name) { try { return require(name); } catch (e) { return null; } }

function filtersOf(bin) {
  return new Promise(res => execFile(bin, ['-hide_banner', '-filters'], { maxBuffer: 1e7 }, (e, out) => res(e ? null : new Set(String(out).split('\n').map(l => l.trim().split(/\s+/)[1]).filter(Boolean)))));
}

async function resolveFfmpeg() {
  const cands = [];
  if (process.env.FFMPEG) cands.push({ ffmpeg: process.env.FFMPEG, ffprobe: process.env.FFPROBE || 'ffprobe' });
  const fs1 = tryRequire('ffmpeg-static'), fp = tryRequire('ffprobe-static');
  if (fs1) cands.push({ ffmpeg: unpack(fs1), ffprobe: unpack(fp && fp.path) || 'ffprobe' });
  for (const d of ['/opt/homebrew/bin', '/usr/local/bin']) {
    if (fs.existsSync(path.join(d, 'ffmpeg'))) cands.push({ ffmpeg: path.join(d, 'ffmpeg'), ffprobe: path.join(d, 'ffprobe') });
  }
  cands.push({ ffmpeg: 'ffmpeg', ffprobe: 'ffprobe' });
  let best = null, bestScore = -1;
  for (const c of cands) {
    const f = await filtersOf(c.ffmpeg);
    if (!f) continue;
    const score = ['drawtext', 'xfade', 'chromakey', 'rgbashift', 'afftdn', 'aecho'].filter(n => f.has(n)).length;
    if (score > bestScore) { best = c; bestScore = score; }
    if (score === 6) break;
  }
  if (!best) throw new Error('FFmpeg est introuvable (installe-le avec « brew install ffmpeg »).');
  // ffprobe doit pouvoir tourner sur ce Mac (celui de ffprobe-static pour puce Apple est un programme Intel) ;
  // sinon le moteur lit les fichiers avec FFmpeg seul (ffprobe = null)
  const marche = bin => new Promise(res => execFile(bin, ['-version'], e => res(!e)));
  const probes = [best.ffprobe, '/opt/homebrew/bin/ffprobe', '/usr/local/bin/ffprobe', 'ffprobe'];
  let ffprobe = null;
  for (const p of probes) if (p && (p === 'ffprobe' || fs.existsSync(p)) && await marche(p)) { ffprobe = p; break; }
  return { ffmpeg: best.ffmpeg, ffprobe };
}
module.exports = { resolveFfmpeg };
