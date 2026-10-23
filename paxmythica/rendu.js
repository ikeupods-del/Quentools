/* Pax Mythica — dessin de la carte sur un canvas : relief et mers (calculés une fois), couleurs des peuples et frontières
   (recalculées quand une province change de main), étiquettes, armées, marches, sièges et effets (batailles, pouvoirs, conquêtes).
   Caméra : déplacement à la souris ou au trackpad, zoom à la molette ou en pinçant. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const hex = h => { const n = parseInt(String(h).replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  PM.hex = hex;

  class Rendu {
    constructor(canvas) {
      this.cv = canvas; this.cx = canvas.getContext('2d');
      this.cam = { x: 0, y: 0, z: 1 }; this.sel = null; this.survol = -1; this.chemin = null; this.cibleMode = null;
      this.temps = 0; this.dirty = true;
    }
    // nouvelle partie ou nouvelle carte
    lier(j) {
      this.j = j; const C = j.carte;
      this.base = this.canvasDe(C.w, C.h); this.calque = this.canvasDe(C.w, C.h); this.halo = this.canvasDe(C.w, C.h);
      this.dessinerBase(); this.majProprietaires(); this.cadrer(); this.selProv = -1;
    }
    canvasDe(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
    // relief : couleur du terrain, ombrage (lumière venant du nord-ouest), grain ; mers dégradées et écume des côtes
    dessinerBase() {
      const C = this.j.carte, E = this.j.etat, W = C.w, H = C.h, ctx = this.base.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
      const cols = E.provinces.map(p => PM.TERRAINS[p.terrain].couleur);
      let s = 1234567; const grain = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s / 0x7fffffff) - 0.5; };
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x, a = C.pix[k], h = PM.hauteurPixel(C, x, y), o = k * 4;
        if (a < 0) {
          // mer : plus claire près des côtes
          const t = Math.max(0, Math.min(1, (h - 0.25) / 0.25)), cote = (x > 1 && C.pix[k - 2] >= 0) || (x < W - 2 && C.pix[k + 2] >= 0) || (y > 1 && C.pix[k - 2 * W] >= 0) || (y < H - 2 && C.pix[k + 2 * W] >= 0);
          d[o] = 22 + t * 40; d[o + 1] = 52 + t * 62; d[o + 2] = 84 + t * 64;
          if (cote) { d[o] += 40; d[o + 1] += 44; d[o + 2] += 36; }
        } else {
          const hx = PM.hauteurPixel(C, Math.min(W - 1, x + 2), y) - PM.hauteurPixel(C, Math.max(0, x - 2), y), hy = PM.hauteurPixel(C, x, Math.min(H - 1, y + 2)) - PM.hauteurPixel(C, x, Math.max(0, y - 2));
          const ombre = 1 + (-(hx + hy) * 9) + grain() * 0.06 + (h - 0.6) * 0.25, c = cols[a];
          d[o] = c[0] * ombre; d[o + 1] = c[1] * ombre; d[o + 2] = c[2] * ombre;
        }
        d[o + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    // couleurs des peuples, frontières des provinces (fines) et des peuples (épaisses)
    majProprietaires() {
      const C = this.j.carte, E = this.j.etat, W = C.w, H = C.h, ctx = this.calque.getContext('2d'), img = ctx.createImageData(W, H), d = img.data;
      const own = E.provinces.map(p => p.owner), col = E.nations.map(N => hex(N.couleur));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = y * W + x, a = C.pix[k]; if (a < 0) continue;
        const o = own[a], b = k * 4;
        const dr = x < W - 1 ? C.pix[k + 1] : a, dd = y < H - 1 ? C.pix[k + W] : a, dg = x > 0 ? C.pix[k - 1] : a, dh = y > 0 ? C.pix[k - W] : a;
        const fp = (dr !== a && dr >= 0) || (dd !== a && dd >= 0);
        const ox = [dr, dd, dg, dh].some(v => v >= 0 && own[v] !== o) || [dr, dd, dg, dh].some(v => v < 0);
        if (o >= 0) {
          const c = col[o];
          if (ox && [dr, dd, dg, dh].some(v => v >= 0 && own[v] !== o)) { d[b] = c[0] * 0.55; d[b + 1] = c[1] * 0.55; d[b + 2] = c[2] * 0.55; d[b + 3] = 235; }
          else if (fp) { d[b] = c[0] * 0.6; d[b + 1] = c[1] * 0.6; d[b + 2] = c[2] * 0.6; d[b + 3] = 120; }
          else { d[b] = c[0]; d[b + 1] = c[1]; d[b + 2] = c[2]; d[b + 3] = 96; }
        } else if (fp || (ox && [dr, dd, dg, dh].some(v => v >= 0 && own[v] !== o))) { d[b] = 30; d[b + 1] = 26; d[b + 2] = 20; d[b + 3] = 70; }
        else if ((x + y) % 11 === 0) { d[b] = 70; d[b + 1] = 58; d[b + 2] = 44; d[b + 3] = 16; } // terres libres finement hachurées
      }
      ctx.putImageData(img, 0, 0);
      this.etiquettes = this.calculerEtiquettes(); this.dirty = true;
    }
    // surbrillance d'une province (sélection)
    majHalo(p) {
      const C = this.j.carte, W = C.w, H = C.h, ctx = this.halo.getContext('2d');
      ctx.clearRect(0, 0, W, H); this.selProv = p; if (p == null || p < 0) return;
      const pr = C.provinces[p], r = Math.ceil(C.rayon * 3), x0 = Math.max(0, Math.floor(pr.cx - r)), y0 = Math.max(0, Math.floor(pr.cy - r)), x1 = Math.min(W, Math.ceil(pr.cx + r)), y1 = Math.min(H, Math.ceil(pr.cy + r));
      const img = ctx.createImageData(x1 - x0, y1 - y0), d = img.data;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const k = y * W + x; if (C.pix[k] !== p) continue;
        const bord = C.pix[k - 1] !== p || C.pix[k + 1] !== p || C.pix[k - W] !== p || C.pix[k + W] !== p, o = ((y - y0) * (x1 - x0) + (x - x0)) * 4;
        d[o] = 255; d[o + 1] = 240; d[o + 2] = 190; d[o + 3] = bord ? 255 : 46;
      }
      ctx.putImageData(img, x0, y0);
    }
    calculerEtiquettes() {
      const E = this.j.etat, C = this.j.carte, l = [];
      for (const N of E.nations) {
        if (!N.vivante) continue;
        const ps = E.provinces.filter(p => p.owner === N.id); if (!ps.length) continue;
        // groupe principal (provinces reliées) pour placer le nom au bon endroit
        const set = new Set(ps.map(p => p.id)), vu = new Set(); let best = [];
        for (const p of ps) { if (vu.has(p.id)) continue; const g = [], f = [p.id]; vu.add(p.id); while (f.length) { const a = f.pop(); g.push(a); for (const v of C.provinces[a].voisins) if (set.has(v) && !vu.has(v)) { vu.add(v); f.push(v); } } if (g.length > best.length) best = g; }
        let sx = 0, sy = 0, sa = 0, minx = 1e9, maxx = -1e9;
        for (const id of best) { const p = C.provinces[id]; sx += p.cx * p.aire; sy += p.cy * p.aire; sa += p.aire; minx = Math.min(minx, p.cx); maxx = Math.max(maxx, p.cx); }
        l.push({ n: N.id, x: sx / sa, y: sy / sa, taille: Math.max(13, Math.min(46, Math.sqrt(sa) / 7)), large: maxx - minx });
      }
      return l;
    }
    cadrer() {
      const C = this.j.carte, w = this.cv.clientWidth || 1200, h = this.cv.clientHeight || 800;
      this.cam.z = Math.min(w / C.w, h / C.h) * 0.98; this.cam.x = (w - C.w * this.cam.z) / 2; this.cam.y = (h - C.h * this.cam.z) / 2; this.dirty = true;
    }
    centrerSur(p, z) {
      const pr = this.j.carte.provinces[p], w = this.cv.clientWidth, h = this.cv.clientHeight;
      if (z) this.cam.z = z;
      this.cam.x = w / 2 - pr.lx * this.cam.z; this.cam.y = h / 2 - pr.ly * this.cam.z; this.dirty = true;
    }
    versCarte(sx, sy) { return { x: (sx - this.cam.x) / this.cam.z, y: (sy - this.cam.y) / this.cam.z }; }
    versEcran(x, y) { return { x: x * this.cam.z + this.cam.x, y: y * this.cam.z + this.cam.y }; }
    provinceA(sx, sy) {
      const C = this.j.carte, p = this.versCarte(sx, sy), x = Math.floor(p.x), y = Math.floor(p.y);
      if (x < 0 || y < 0 || x >= C.w || y >= C.h) return -1; return C.pix[y * C.w + x];
    }
    zoomer(f, sx, sy) {
      const z = Math.max(0.35, Math.min(6, this.cam.z * f)), k = z / this.cam.z;
      this.cam.x = sx - (sx - this.cam.x) * k; this.cam.y = sy - (sy - this.cam.y) * k; this.cam.z = z; this.dirty = true;
    }
    // position d'une armée à l'écran (en marche : entre deux provinces)
    posArmee(a, rang) {
      const C = this.j.carte, p = C.provinces[a.prov]; let x = p.lx, y = p.ly;
      if (a.chemin.length) {
        const q = C.provinces[a.chemin[0]], cout = PM.TERRAINS[this.j.etat.provinces[a.chemin[0]].terrain].move + (p.mer.includes(q.id) ? 1.5 : 0), t = Math.min(0.9, (a.avance + (this.fraction || 0) * PM.vitesse(this.j, a)) / cout) * 0.9;
        x += (q.lx - p.lx) * t; y += (q.ly - p.ly) * t;
      }
      const e = this.versEcran(x, y); return { x: e.x + 26 + (rang % 3) * 32, y: e.y - 6 + Math.floor(rang / 3) * 24 };
    }
    // ---------- dessin d'une image ----------
    dessiner(dt) {
      const j = this.j; if (!j) return;
      this.temps += dt || 0;
      const cv = this.cv, ctx = this.cx, dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const E = j.etat, C = j.carte, z = this.cam.z;
      ctx.fillStyle = '#16304a'; ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.base, this.cam.x, this.cam.y, C.w * z, C.h * z);
      ctx.drawImage(this.calque, this.cam.x, this.cam.y, C.w * z, C.h * z);
      if (this.selProv >= 0) { ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.temps / 220); ctx.drawImage(this.halo, this.cam.x, this.cam.y, C.w * z, C.h * z); ctx.globalAlpha = 1; }
      // routes maritimes
      ctx.save(); ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(230,240,255,.45)'; ctx.lineWidth = 1.2;
      for (const p of C.provinces) for (const q of p.mer) if (q > p.id) { const a = this.versEcran(p.lx, p.ly), b = this.versEcran(C.provinces[q].lx, C.provinces[q].ly); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      ctx.restore();
      // province survolée en mode ciblage ou ordre de marche
      if (this.survol >= 0 && (this.cibleMode || this.sel && this.sel.type === 'armee')) {
        const p = C.provinces[this.survol], e = this.versEcran(p.lx, p.ly);
        ctx.strokeStyle = this.cibleMode ? 'rgba(255,90,60,.9)' : 'rgba(255,240,180,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, e.y, 14 + 3 * Math.sin(this.temps / 150), 0, 7); ctx.stroke();
      }
      // chemins des armées du joueur
      for (const a of E.armees) if (a.chemin.length && (a.owner === E.joueur || (this.sel && this.sel.id === a.id))) {
        const pts = [a.prov, ...a.chemin].map(p => this.versEcran(C.provinces[p].lx, C.provinces[p].ly));
        ctx.save(); ctx.strokeStyle = this.sel && this.sel.id === a.id ? 'rgba(255,236,170,.95)' : 'rgba(255,236,170,.5)'; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]); ctx.lineDashOffset = -this.temps / 40;
        ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
        const f = pts[pts.length - 1]; ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,236,170,.9)'; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); ctx.restore();
      }
      if (this.chemin && this.chemin.length) {
        ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 5]);
        const pts = this.chemin.map(p => this.versEcran(C.provinces[p].lx, C.provinces[p].ly)); ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); ctx.restore();
      }
      // noms des peuples (grandes lettres espacées)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const l of this.etiquettes || []) {
        const N = E.nations[l.n]; const e = this.versEcran(l.x, l.y), t = Math.max(11, Math.min(54, l.taille * z * 0.9));
        if (t < 11.5 && z < 0.6) continue;
        ctx.font = `600 ${t}px "Didot","Hoefler Text","Palatino",Georgia,serif`;
        const txt = N.nom.toUpperCase().split('').join(t > 20 ? ' ' : '');
        ctx.globalAlpha = z > 2.4 ? 0.35 : 0.85; ctx.lineWidth = Math.max(2, t / 7); ctx.strokeStyle = 'rgba(20,14,8,.55)'; ctx.strokeText(txt, e.x, e.y); ctx.fillStyle = '#fbf1da'; ctx.fillText(txt, e.x, e.y); ctx.globalAlpha = 1;
      }
      // provinces : capitales, bâtiments, merveilles, sièges ; noms au zoom
      for (const P of E.provinces) {
        const p = C.provinces[P.id], e = this.versEcran(p.lx, p.ly);
        if (e.x < -40 || e.y < -40 || e.x > w + 40 || e.y > h + 40) continue;
        const N = P.owner >= 0 ? E.nations[P.owner] : null;
        if (N && N.capitale === P.id) { ctx.font = `${Math.max(12, Math.min(20, 10 * z))}px serif`; ctx.fillStyle = '#ffe9a8'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.strokeText('★', e.x, e.y - 1); ctx.fillText('★', e.x, e.y - 1); }
        if (P.merveille) { ctx.font = '18px serif'; ctx.fillText('🗼', e.x - 18, e.y - 4); }
        if (z > 1.25) {
          ctx.font = `500 ${Math.min(14, 6 + 3 * z)}px -apple-system,"Helvetica Neue",sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.fillStyle = '#fff8e8';
          ctx.strokeText(P.nom, e.x, e.y + 13); ctx.fillText(P.nom, e.x, e.y + 13);
          const icones = Object.keys(P.bat).map(b => PM.BATIMENTS[b].icone).join('') + (P.bouclier > 0 ? '🛡️' : '');
          if (icones && z > 1.9) { ctx.font = '11px serif'; ctx.fillText(icones, e.x, e.y + 26); }
        }
        if (P.siege) {
          const prog = Math.min(1, P.siege.progres / PM.dureeSiege(j, P.id)), r = 12;
          ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 7); ctx.stroke();
          ctx.strokeStyle = E.nations[P.siege.par].couleur; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(e.x, e.y, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
          ctx.font = '12px serif'; ctx.fillText('🔥', e.x, e.y - r - 8);
        }
      }
      // armées (blasons à la couleur du peuple, effectif)
      const rangs = {};
      this.boites = [];
      for (const a of E.armees) {
        const rang = rangs[a.prov] = (rangs[a.prov] || 0) + 1, pos = this.posArmee(a, rang - 1), N = E.nations[a.owner];
        const eff = Math.round(PM.effectif(a)), sel = this.sel && this.sel.type === 'armee' && this.sel.id === a.id;
        const mythe = Object.keys(a.unites).some(u => PM.UNITES[u].cat === 'mythe');
        const lw = 30, lh = 20, x = pos.x - lw / 2, y = pos.y - lh / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
        ctx.fillStyle = N.couleur; ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + lw, y); ctx.lineTo(x + lw, y + lh * 0.7); ctx.quadraticCurveTo(x + lw / 2, y + lh * 1.25, x, y + lh * 0.7); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.lineWidth = sel ? 2.5 : 1.2; ctx.strokeStyle = sel ? '#fff3c4' : 'rgba(255,255,255,.75)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '700 11px -apple-system,"Helvetica Neue",sans-serif'; ctx.textAlign = 'center'; ctx.fillText(eff > 999 ? Math.round(eff / 100) / 10 + 'k' : String(eff), pos.x, pos.y + 1);
        if (mythe) { ctx.font = '10px serif'; ctx.fillText('✨', x + lw - 1, y + 1); }
        if (a.paralysie) { ctx.font = '11px serif'; ctx.fillText('💫', x + 2, y + 1); }
        ctx.restore();
        this.boites.push({ id: a.id, x, y, w: lw, h: lh + 4 });
      }
      // effets passagers
      const A = j.anims || [];
      for (const an of A) {
        an.t += dt || 16;
        const p = C.provinces[an.prov]; if (!p) { an.t = 1e9; continue; }
        const e = this.versEcran(p.lx, p.ly), k = an.t / 1600;
        if (an.type === 'bataille') { ctx.globalAlpha = Math.max(0, 1 - k); ctx.font = `${18 + k * 14}px serif`; ctx.fillText('⚔️', e.x, e.y - 18 - k * 20); ctx.globalAlpha = 1; }
        else if (an.type === 'pouvoir') {
          ctx.globalAlpha = Math.max(0, 1 - k * 0.8); ctx.fillStyle = 'rgba(255,240,200,.35)'; ctx.beginPath(); ctx.arc(e.x, e.y, 10 + k * 90, 0, 7); ctx.fill();
          ctx.font = `${30 + k * 30}px serif`; ctx.fillText(an.emoji, e.x, e.y - k * 30); ctx.globalAlpha = 1;
        } else if (an.type === 'conquete') { ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = E.nations[an.owner] ? E.nations[an.owner].couleur : '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(e.x, e.y, 8 + k * 50, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      }
      j.anims = A.filter(a => a.t < 1600);
    }
    armeeA(sx, sy) { for (const b of (this.boites || []).slice().reverse()) if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return b.id; return null; }
  }
  PM.Rendu = Rendu;

  // aperçu miniature d'une carte (création de partie)
  PM.apercu = function (canvas, carte, etat) {
    const ctx = canvas.getContext('2d'), W = carte.w, H = carte.h, w = canvas.width, h = canvas.height, img = ctx.createImageData(w, h), d = img.data;
    const cols = etat ? etat.nations.map(N => hex(N.couleur)) : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = Math.floor(x / w * W), Y = Math.floor(y / h * H), a = carte.pix[Y * W + X], o = (y * w + x) * 4;
      if (a < 0) { d[o] = 26; d[o + 1] = 60; d[o + 2] = 96; }
      else {
        const t = etat ? etat.provinces[a].terrain : carte.provinces[a].terrain, c = PM.TERRAINS[t].couleur, ow = etat ? etat.provinces[a].owner : -1;
        if (ow >= 0) { d[o] = c[0] * 0.45 + cols[ow][0] * 0.55; d[o + 1] = c[1] * 0.45 + cols[ow][1] * 0.55; d[o + 2] = c[2] * 0.45 + cols[ow][2] * 0.55; }
        else { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; }
        const b = carte.pix[Y * W + Math.min(W - 1, X + Math.ceil(W / w))]; if (b !== a && b >= 0) { d[o] *= 0.7; d[o + 1] *= 0.7; d[o + 2] *= 0.7; }
      }
      d[o + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  };
})(typeof window !== 'undefined' ? window : globalThis);
