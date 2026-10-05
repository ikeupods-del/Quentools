(function () {
  var $ = function (id) { return document.getElementById(id); };
  /* 1. Lettres qui se dispersent, puis qui se reconstruisent */
  var l1 = QTScroll.letters($('t1')), l2 = QTScroll.letters($('t2'));
  QTScroll.watch($('intro'), function (p) { QTScroll.scatter(l1, Math.max(0, (p - .15) / .85)); });
  QTScroll.watch($('assemble'), function (p) { QTScroll.scatter(l2, 1 - Math.min(1, p / .55)); });

  /* 2. Suite d'images sur canvas + chapitres + barre de progression */
  var f = QTScroll.frames({
    section: $('hero'), canvas: $('cv'),
    desktop: { base: 'frames/', count: 90 }, mobile: { base: 'frames-mobile/', count: 45 },
    onLoad: function (r) { $('load').textContent = r < 1 ? 'Chargement ' + Math.round(r * 100) + ' %' : ''; }
  });
  $('stat').textContent = f.mobile ? '45 images (version mobile, 0,25 Mo).' : '90 images (0,8 Mo) ; 45 images plus petites (0,25 Mo) sur téléphone.';
  QTScroll.chapters($('hero'), [{ from: 0, to: .36, el: $('c1') }, { from: .36, to: .66, el: $('c2') }, { from: .66, to: 1.01, el: $('c3') }]);
  QTScroll.watch($('hero'), function (p) { $('bar').style.width = (p * 100) + '%'; });

  /* 3. Vidéo pilotée */
  QTScroll.video({ section: $('vid'), video: $('v') });

  /* 4. Diaporama produit */
  var orb = function (a, b, c) {
    return '<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="g' + a.slice(1) + '" cx="35%" cy="30%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient></defs><circle cx="100" cy="100" r="92" fill="url(#g' + a.slice(1) + ')"/><ellipse cx="100" cy="100" rx="92" ry="26" fill="none" stroke="' + c + '" stroke-width="3" opacity=".7" transform="rotate(-22 100 100)"/></svg>';
  };
  var gem = function (c) { return '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon points="50,6 92,38 76,92 24,92 8,38" fill="' + c + '" stroke="rgba(255,255,255,.55)" stroke-width="2"/><polygon points="50,6 62,38 50,92 38,38" fill="rgba(255,255,255,.25)"/></svg>'; };
  var ring = function (c) { return '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="none" stroke="' + c + '" stroke-width="12"/><circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="3" stroke-dasharray="40 200"/></svg>'; };
  var spark = function (c) { return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L60 40 L96 50 L60 60 L50 96 L40 60 L4 50 L40 40Z" fill="' + c + '"/></svg>'; };
  var slides = [
    { word: 'AURORE', bg: '#2a1456', ink: '#f4efff', accent: '#b9a4ff', tag: 'Violet · nuit calme', title: 'Aurore', product: orb('#c9b6ff', '#4b2a9b', '#e8ddff'), floats: [gem('#8f7bff'), spark('#e8ddff'), ring('#b9a4ff')] },
    { word: 'BRAISE', bg: '#5a2308', ink: '#fff3e6', accent: '#ffb36b', tag: 'Orange · chaleur vive', title: 'Braise', product: orb('#ffc27a', '#a8400d', '#ffe3c2'), floats: [spark('#ffd9a8'), gem('#ff8a3d'), ring('#ffb36b')] },
    { word: 'ONDE', bg: '#06403f', ink: '#e6fffb', accent: '#6df0de', tag: 'Turquoise · fraîcheur', title: 'Onde', product: orb('#8ff5e6', '#0b6b66', '#d6fff9'), floats: [ring('#6df0de'), spark('#d6fff9'), gem('#2bbfae')] }
  ];
  QTScroll.slider($('qd'), slides, { duration: 900 });
})();
