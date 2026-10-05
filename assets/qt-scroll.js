/* QuenTools — moteur de scène au défilement (sans bibliothèque, sans cookie). Global : QTScroll.
   Méthodes retenues de guides de sites « cinématiques » (voir design/CINEMATIQUE.md), réécrites ici avec nos règles : légèreté, mobile d'abord,
   mouvement réduit respecté, aucun service externe.

   QTScroll.progress(section)                 progression 0→1 d'une section haute dont le contenu reste collé (position: sticky)
   QTScroll.watch(section, fn)                appelle fn(p) à chaque changement de progression (une seule boucle d'animation, passive)
   QTScroll.frames({section, canvas, desktop:{base,count}, mobile:{base,count}, ext, pad, still, onLoad, onReady})
                                              suite d'images dessinée sur un canvas selon le défilement (technique « flip-book »)
   QTScroll.video({section, video})           vidéo pilotée par le défilement (la vidéo doit être encodée avec une image clé à chaque image : -g 1)
   QTScroll.chapters(section, [{from,to,el}]) affiche un texte par plage de progression
   QTScroll.letters(el) → spans ; QTScroll.scatter(spans, p)   lettres qui se dispersent (p=0 assemblé, p=1 dispersé) ; inverse pour s'assembler
   QTScroll.slider(root, slides, opts)        diaporama produit « Coffee Drift » : produit, mot d'arrière-plan et éléments flottants disparaissent ensemble */
window.QTScroll = (function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var clamp = function (x, a, b) { return Math.min(b, Math.max(a, x)); };
  var raf = window.requestAnimationFrame.bind(window);

  function progress(sec) {
    var r = sec.getBoundingClientRect(), d = r.height - innerHeight;
    return d > 0 ? clamp(-r.top / d, 0, 1) : 0;
  }

  /* Une seule boucle : on ne calcule que si la section est proche de l'écran, et seulement quand la valeur change. */
  function watch(sec, fn) {
    var last = -1, near = true, queued = false;
    function tick() { queued = false; if (!near) return; var p = progress(sec); if (Math.abs(p - last) > 0.0004) { last = p; fn(p); } }
    function ask() { if (!queued) { queued = true; raf(tick); } }
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { near = e[0].isIntersecting; if (near) ask(); }, { rootMargin: '100% 0px' }).observe(sec);
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask);
    ask();
    return { update: function () { last = -1; ask(); } };
  }

  /* Suite d'images sur canvas. Mobile décidé une fois au chargement : suite d'images propre (plus petite), jamais la même réduite. */
  function frames(o) {
    var set = matchMedia('(max-width: 768px)').matches && o.mobile ? o.mobile : o.desktop;
    var ext = o.ext || 'webp', pad = o.pad || 3, n = set.count, imgs = new Array(n), loaded = 0, ready = false, cur = -1;
    var cv = o.canvas, cx = cv.getContext('2d', { alpha: false });
    var url = function (i) { return set.base + 'f_' + String(i + 1).padStart(pad, '0') + '.' + ext; };
    function size() {
      var d = Math.min(devicePixelRatio || 1, 2), w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cur = -1; }
    }
    /* image la plus proche déjà chargée : pas de bloc noir pendant le chargement */
    function nearest(i) { for (var k = 0; k < n; k++) { var a = imgs[i - k], b = imgs[i + k]; if (a && a.complete) return a; if (b && b.complete) return b; } return null; }
    function draw(i) {
      var im = nearest(i); if (!im || !im.naturalWidth) return;
      size();
      var cw = cv.width, ch = cv.height, s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      cx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);   /* « cover » : l'action reste au centre, quel que soit l'écran */
      cur = i;
    }
    /* première, dernière, puis le reste : l'écran s'affiche tout de suite */
    var order = [0, n - 1]; for (var i = 1; i < n - 1; i++) order.push(i);
    order.forEach(function (k, j) {
      var im = new Image(); im.decoding = 'async'; im.onload = im.onerror = function () {
        loaded++; if (o.onLoad) o.onLoad(loaded / n);
        if (j < 2 || loaded === n) draw(cur < 0 ? (reduce.matches ? (o.still == null ? n - 1 : o.still) : 0) : cur);
        if (loaded === n && !ready) { ready = true; if (o.onReady) o.onReady(); }
      };
      im.src = url(k); imgs[k] = im;
    });
    var w;
    if (reduce.matches) { cv.dataset.still = '1'; }
    else w = watch(o.section, function (p) { var i = Math.min(Math.floor(p * n), n - 1); if (i !== cur) draw(i); });
    addEventListener('resize', function () { if (cur >= 0) { var c = cur; cur = -1; draw(c); } });
    return { count: n, mobile: set === o.mobile, redraw: function () { draw(cur < 0 ? 0 : cur); } };
  }

  /* Vidéo pilotée : on ne fait que déplacer currentTime. Sans image clé à chaque image (-g 1), le défilement saccade. */
  function video(o) {
    var v = o.video; v.muted = true; v.playsInline = true; v.preload = 'auto'; v.pause();
    var target = 0, busy = false;
    function seek() { busy = false; if (!v.duration) return; if (Math.abs(v.currentTime - target) > 0.001) v.currentTime = target; }
    if (reduce.matches) { v.addEventListener('loadedmetadata', function () { v.currentTime = v.duration * (o.still == null ? 1 : o.still); }); return; }
    watch(o.section, function (p) { target = p * (v.duration || 0); if (!busy) { busy = true; raf(seek); } });
    v.addEventListener('loadedmetadata', function () { seek(); });
  }

  function chapters(sec, list) {
    watch(sec, function (p) {
      list.forEach(function (c) { var on = p >= c.from && p < c.to; c.el.classList.toggle('is-on', on); c.el.setAttribute('aria-hidden', on ? 'false' : 'true'); });
    });
  }

  /* Lettres : le texte lu par les lecteurs d'écran reste entier (aria-label), les lettres sont décoratives. */
  function letters(el) {
    var t = el.textContent; el.setAttribute('aria-label', t); el.textContent = '';
    return Array.prototype.map.call(t, function (ch, i) {
      var s = document.createElement('span'); s.textContent = ch === ' ' ? ' ' : ch; s.setAttribute('aria-hidden', 'true'); s.style.display = 'inline-block';
      s.dataset.k = i; el.appendChild(s); return s;
    });
  }
  function hash(i, salt) { var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return x - Math.floor(x); }
  function scatter(spans, p) {
    var e = p * p * (3 - 2 * p);
    spans.forEach(function (s, i) {
      var dx = (hash(i, 1) - .5) * 520, dy = (hash(i, 2) - .5) * 360, r = (hash(i, 3) - .5) * 160;
      s.style.transform = reduce.matches ? 'none' : 'translate3d(' + dx * e + 'px,' + dy * e + 'px,0) rotate(' + r * e + 'deg)';
      s.style.opacity = reduce.matches ? 1 : String(1 - Math.min(1, e * 1.15));
    });
  }

  /* « Coffee Drift » : trois couches indépendantes (produit, mot d'arrière-plan, éléments flottants) calées pour disparaître ensemble.
     Garde-fous retenus : le centrage est fait par un conteneur CSS et seul l'enfant est animé (pas de conflit de transform) ;
     l'anticipation est UNE animation à images clés (pas deux animations enchaînées) ; les éléments flottants font moins de chemin
     donc durent plus longtemps (×1,25) ; un verrou empêche les clics rapides de corrompre l'état ; les clones fantômes sont supprimés. */
  function slider(root, slides, opts) {
    opts = opts || {}; var D = opts.duration || 900, idx = 0, busy = false;
    var stage = root.querySelector('.qd-stage'), bg = root.querySelector('.qd-bg'), fl = root.querySelector('.qd-floats'), live = root.querySelector('.qd-live');
    var ease = 'cubic-bezier(.76,0,.24,1)', dipEase = 'cubic-bezier(.36,0,.66,-.4)';
    function mk(cls, html, style) { var d = document.createElement('div'); d.className = cls; d.innerHTML = html; if (style) d.style.cssText = style; return d; }
    function place(i) {
      var s = slides[i];
      root.style.setProperty('--qd-bg', s.bg); root.style.setProperty('--qd-ink', s.ink || '#fff'); root.style.setProperty('--qd-accent', s.accent || '#fff');
      var prod = mk('qd-product', s.product), word = mk('qd-word', '<span>' + s.word + '</span>');
      var floats = (s.floats || []).map(function (h, k) { return mk('qd-float qd-f' + k, h); });
      return { prod: prod, word: word, floats: floats };
    }
    var now = place(0); stage.appendChild(now.prod); bg.appendChild(now.word); now.floats.forEach(function (f) { fl.appendChild(f); });
    function text(i) { var t = root.querySelectorAll('[data-qd-title],[data-qd-tag]'); t.forEach(function (n) { n.textContent = n.hasAttribute('data-qd-title') ? slides[i].title : slides[i].tag; }); if (live) live.textContent = slides[i].title; }
    text(0);
    function go(dir) {
      if (busy) return; busy = true;
      var to = (idx + dir + slides.length) % slides.length, nxt = place(to), out = now, a = [];
      if (reduce.matches) { stage.replaceChildren(nxt.prod); bg.replaceChildren(nxt.word); fl.replaceChildren.apply(fl, nxt.floats); now = nxt; idx = to; text(to); busy = false; return; }
      var dist = innerWidth * .62, fdist = dist * .5;
      /* produit */
      stage.appendChild(nxt.prod); bg.appendChild(nxt.word); nxt.floats.forEach(function (f) { fl.appendChild(f); f.style.opacity = 0; });
      a.push(out.prod.animate([{ transform: 'translateX(0) rotate(0)', offset: 0 }, { transform: 'translateX(' + 28 * dir + 'px) rotate(' + 10 * dir + 'deg)', offset: .16, easing: ease }, { transform: 'translateX(' + -dist * dir + 'px) rotate(' + -290 * dir + 'deg)' }], { duration: D, fill: 'forwards' }));
      a.push(nxt.prod.animate([{ transform: 'translateX(' + dist * dir + 'px) rotate(' + 290 * dir + 'deg)' }, { transform: 'translateX(0) rotate(0)' }], { duration: D, delay: D * .38, easing: ease, fill: 'both' }));
      /* mot d'arrière-plan : retourné comme une carte autour de l'axe vertical */
      a.push(out.word.animate([{ transform: 'rotateY(0)', opacity: 1 }, { transform: 'rotateY(' + 60 * dir + 'deg) translateX(' + -dist * .5 * dir + 'px)', opacity: 0 }], { duration: D, easing: ease, fill: 'forwards' }));
      a.push(nxt.word.animate([{ transform: 'rotateY(' + -60 * dir + 'deg) translateX(' + dist * .5 * dir + 'px)', opacity: 0 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: D, delay: D * .38, easing: ease, fill: 'both' }));
      /* éléments flottants : clones fantômes qui sortent avec un recul plus visible, nouveaux qui arrivent décalés */
      out.floats.forEach(function (f, k) {
        var g = f.cloneNode(true); g.classList.add('qd-ghost'); fl.appendChild(g); f.remove();
        var an = g.animate([{ transform: 'translateX(0)', offset: 0 }, { transform: 'translateX(' + 50 * dir + 'px)', offset: .22, easing: ease }, { transform: 'translateX(' + -fdist * dir + 'px)', opacity: 0 }], { duration: D * 1.25, delay: k * 40, fill: 'forwards' });
        an.finished.then(function () { g.remove(); }, function () { g.remove(); }); a.push(an);
      });
      nxt.floats.forEach(function (f, k) {
        a.push(f.animate([{ transform: 'translateX(' + fdist * dir + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: D, delay: D * .42 + k * 60, easing: ease, fill: 'both' }));
        f.style.opacity = '';
      });
      text(to);
      var done = function () {
        out.prod.remove(); out.word.remove(); now = nxt; idx = to;
        [nxt.prod, nxt.word].concat(nxt.floats).forEach(function (n) { n.getAnimations().forEach(function (x) { x.cancel(); }); });
        busy = false;
      };
      Promise.all(a.map(function (x) { return x.finished; })).then(done, done);
      setTimeout(function () { if (busy) done(); }, D * 2.6);  /* filet de sécurité : jamais bloqué */
    }
    var b = root.querySelectorAll('[data-qd-dir]'); b.forEach(function (x) { x.addEventListener('click', function () { go(+x.dataset.qdDir); }); });
    root.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); });
    var x0 = null; root.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    root.addEventListener('pointerup', function (e) { if (x0 !== null && Math.abs(e.clientX - x0) > 50) go(e.clientX < x0 ? 1 : -1); x0 = null; });
    return { go: go, index: function () { return idx; } };
  }

  return { progress: progress, watch: watch, frames: frames, video: video, chapters: chapters, letters: letters, scatter: scatter, slider: slider, reduced: function () { return reduce.matches; } };
})();
