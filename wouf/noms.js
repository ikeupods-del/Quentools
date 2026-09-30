'use strict';
/* Wouf — générateur de noms pour chien et chat : styles, sexe, initiale (dont la « lettre de l'année » LOF/LOOF des pedigrees),
   test d'un nom (court ? ressemble-t-il à un ordre ?), noms favoris. Aucune donnée personnelle, tout se passe sur l'appareil. */

/* Chaque nom : « Nom.sexe.espèce » — sexe m/f (absent = mixte), espèce d/c (absent = les deux). */
const NAME_STYLES = {
  mignon: ['Mignons', 'Nala.f Luna.f Lola.f Mila.f Nina.f Lili.f Gigi.f Kiwi Choupi Pepito.m Bibou Loulou.m Nounours.m Minou.m.c Poppy.f Pixel Bulle.f Bouboule Câlin.m Tchoupi.m Doudou Petit-Pois Bichon.m Cookie Titou.m Minette.f.c Mimi.f Lulu Jade.f Ninon.f Pépita.f Léo.m Milo.m Tino.m Oscar.m Simba.m Tom.m Momo.m'],
  gourmand: ['Gourmands', 'Caramel Cannelle.f Praline.f Noisette.f Chocolat.m Cookie Muffin Biscotte.f Brioche.f Croquette.f Pépite.f Réglisse.f Vanille.f Nougat.m Guimauve.f Mochi Sushi.m Wasabi.m Tiramisu.m Cappuccino.m Espresso.m Mocha.f Chichi.m Churros.m Pancake Marron.m Cacahuète.f Sirop.m Smoothie Truffe.f Pistache.f Macaron.m Fraise.f Cerise.f Olive Miel.m Bounty.m Nutella.m Popcorn.m Raviolis.m Cookie'],
  nature: ['Nature', 'Sauge.f Ambre.f Écume.f Nuage.m Orage.m Tempête.f Éclair.m Rivière.f Océane.f Cèdre.m Chêne.m Lilas.f Jasmin Iris.f Rosée.f Aube.f Sable.m Sahara.m Galet.m Ardoise.f Cailloux.m Étoile.f Comète.f Sirius.m Soleil.m Hiver.m Zéphyr.m Brume.f Flocon.m Neige.f Onyx Saphir Rubis Opale.f Jade Perle.f Émeraude.f Lagon.m Volcan.m Basalte.m Quartz.m'],
  mythologie: ['Mythologie et héros', 'Zeus.m Apollon.m Athéna.f Artémis.f Héra.f Hermès.m Hector.m Ulysse.m Achille.m Thor.m Odin.m Loki.m Freya.f Valkyrie.f Merlin.m Arthur.m Lancelot.m Gauvain.m Perceval.m Morgane.f Viviane.f Guenièvre.f Merveille Excalibur.m Robin.m Zorro.m Gandalf.m Aragorn.m Frodon.m Bilbo.m Arwen.f Galadriel.f Eowyn.f Hercule.m Persée.m Ariane.f Circé.f Pandore.f Icare.m Orphée.m Phénix Dragon.m Griffon.m'],
  elegant: ['Élégants', 'Balthazar.m Gaspard.m Melchior.m Alfred.m Archibald.m Cléopâtre.f Joséphine.f Victoria.f Marquise.f Duchesse.f Comtesse.f Baron.m Marquis.m Duke.m Prince.m Princesse.f Reine.f Sultane.f Isabelle.f Constance.f Hortense.f Eugénie.f Ophélie.f Céleste.f Honoré.m Ferdinand.m Maximilien.m Auguste.m Hippolyte.m Séraphin.m Célestin.m Octave.m Eliott.m Oliver.m Edgar.m Ernest.m Gabin.m Colette.f Élise.f'],
  vintage: ['Vintage et rétro', 'Marcel.m Gaston.m Ginette.f Jeannine.f Suzette.f Colette.f Paulette.f Bernadette.f Yvette.f Odette.f Roger.m Raymond.m Lucien.m Fernand.m Gustave.m Léon.m Albert.m Robert.m Henri.m Charlot.m Bébert.m Bijou Popeye.m Pépé.m Mémé.f Titine.f Sidonie.f Lulu Loulou Gégé.m Nénette.f Nestor.m Prosper.m Édith.f Arletty.f Gabrielle.f Gigi'],
  voyage: ['Voyage et lieux', 'Paris Vienne.f Sydney Brooklyn Chicago.m Dallas Tokyo Kyoto Osaka Naples Sicile.f Florence.f Venise.f Rome Sardaigne.f Corse.f Bali Java Cuba Havane.f Malaga Tahiti Fidji Java Nevada Texas.m Alaska Montana Denver Aspen Madison.f Cannes Nice.f Biarritz Lisbonne Ibiza Marrakech.m Zanzibar Sahara Kenya Oslo Berlin Lyon Rio.m Mexico.m Dakar.m'],
  costaud: ['Costauds et sportifs', 'Rocky.m Titan.m Hulk.m Rex.m Ryder.m Bruce.m Tyson.m Balboa.m Spartacus.m Maximus.m Goliath.m Tank.m Diesel.m Turbo.m Flash.m Speedy.m Bolt.m Ronaldo.m Messi.m Zidane.m Mbappé.m Federer.m Nadal.m Tornade.f Thunder Storm Ninja Samouraï.m Viking.m Cheyenne.f Apache.m Shadow Fury Blaze Rambo.m Chuck.m Bruno.m Rudy.m Buck.m Duke.m Ace'],
  rigolo: ['Rigolos', 'Pistolet.m Gribouille.f Patapon.m Saperlipopette Zigzag Couscous.m Boudin.m Baguette.f Tartiflette.f Raclette.f Cornichon.m Gaufrette.f Crevette.f Patate.f Biscotte.f Tagada Piment.m Chamallow.m Loukoum.m Bonbon.m Zébulon.m Boubou.m Chouchou.m Pinpin.m Filou.m Gaillard.m Coquin.m Bobo.m Fripouille.f Gredin.m Canaille.f Ouistiti.m Kikou Wiwi Zouzou Rikiki Roudoudou Hercule Pouic.m Snoopy.m Pluto.m Garfield.m']
};
const NAME_POOL = (() => {
  const out = [];
  for (const [style, [, list]] of Object.entries(NAME_STYLES)) {
    const seen = new Set();
    list.split(/\s+/).forEach(tok => {
      const [name, sex, sp] = tok.split('.'); if (!name || seen.has(name)) return; seen.add(name);
      out.push({ name, style, sex: sex || 'u', sp: sp || 'b' });
    });
  }
  return out;
})();

/* Lettre de l'année pour les animaux à pedigree (LOF chiens, LOOF chats) : cycle de 20 lettres, sans K Q W X Y Z.
   Repères vérifiés : 2020 = R, 2021 = S, 2022 = T, 2023 = U, 2024 = V, 2025 = A, 2026 = B. */
const LOF_LETTERS = 'ABCDEFGHIJLMNOPRSTUV';
const lofLetter = year => LOF_LETTERS[(((year - 2026 + 1) % 20) + 20) % 20];

const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
const syllables = s => Math.max(1, (norm(s).replace(/e$/, '').match(/[aeiouy]+/g) || []).length);
function lev(a, b) {
  const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
/* Ordres courants : un nom qui leur ressemble est source de confusion. */
const NAME_COMMANDS = ['assis', 'couche', 'reste', 'viens', 'ici', 'non', 'oui', 'stop', 'donne', 'lache', 'laisse', 'pied', 'cherche', 'apporte', 'tourne', 'bravo', 'attends', 'debout', 'marche', 'allez', 'tiens', 'bouge', 'baisse', 'saute', 'roule', 'patte'];
const confusedWith = n => { const x = norm(n); if (x.length < 2) return null; return NAME_COMMANDS.find(c => c === x || (x.length >= 3 && (c.startsWith(x) || c.endsWith(x) || x.startsWith(c) || x.endsWith(c))) || (x.length >= 3 && c.length >= 4 && lev(x, c) <= 1)) || null; };

/* Fonction pure : note un nom (0 à 100) avec les raisons. `others` = noms des autres animaux du foyer. */
function nameCheck(name, others = []) {
  const x = norm(name), notes = [], n = syllables(name); let score = 60;
  if (x.length < 2) return { score: 0, notes: [['bad', 'Un nom trop court ou vide est difficile à repérer.']], syl: 0 };
  if (n <= 2) { score += 20; notes.push(['ok', n === 1 ? 'Une seule syllabe : très facile à repérer, mais pensez à bien l’articuler.' : 'Deux syllabes : le format idéal, court et facile à prononcer avec entrain.']); }
  else if (n === 3) { score -= 5; notes.push(['warn', 'Trois syllabes : possible, mais vous utiliserez sans doute un diminutif. Choisissez-le dès maintenant et gardez-le.']); }
  else { score -= 25; notes.push(['bad', 'Trop long : plus de trois syllabes, difficile à lancer d’une voix claire à distance. Préférez un diminutif court.']); }
  if (/[aeiouy]$/.test(x.replace(/e$/, 'a')) || /[aeiouy]$/.test(x)) { score += 8; notes.push(['ok', 'Finale sonore, agréable à lancer.']); }
  const c = confusedWith(name); if (c) { score -= 30; notes.push(['bad', `Ressemble à l’ordre « ${c} » : votre animal risque de confondre son nom et la consigne.`]); } else notes.push(['ok', 'Ne ressemble à aucun ordre courant (assis, viens, non, stop…).']);
  const twin = others.find(o => o && norm(o) !== x && (lev(norm(o), x) <= 1 || (x.length >= 4 && norm(o).length >= 4 && norm(o).slice(-3) === x.slice(-3)))); if (twin) { score -= 15; notes.push(['warn', `Sonne comme « ${twin} », un autre animal du foyer : ils risquent de se tromper de réponse.`]); }
  if (others.some(o => norm(o) === x)) { score -= 20; notes.push(['bad', 'Un animal du foyer porte déjà ce nom.']); }
  return { score: Math.max(0, Math.min(100, score)), notes, syl: n };
}
/* Fonction pure : propose des noms selon les filtres. `rnd` = générateur aléatoire (injectable pour les tests). */
function pickNames(f, n = 8, rnd = Math.random) {
  const letter = norm(f.letter).slice(0, 1);
  let pool = NAME_POOL.filter(x => (!f.style || x.style === f.style) && (!f.sex || x.sex === 'u' || x.sex === f.sex) && (x.sp === 'b' || x.sp === (f.sp === 'cat' ? 'c' : 'd')) && (!letter || norm(x.name)[0] === letter) && (!f.short || syllables(x.name) <= 2) && !(f.exclude || []).includes(x.name) && !confusedWith(x.name));
  const a = pool.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  const seen = new Set(); return a.filter(x => !seen.has(x.name) && seen.add(x.name)).slice(0, n);
}

/* ---------- Écran ---------- */
const NOMS = { sp: 'dog', sex: '', style: '', letter: '', short: true, list: [], year: new Date().getFullYear(), tried: false };
const nameFavs = () => (S.names = S.names || []);
const isFav = n => nameFavs().includes(n);
const chip = (act, k, v, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-k="${k}" data-v="${esc(v)}">${label}</button>`;
function namesHTML() {
  if (!NOMS.tried) return '';
  if (!NOMS.list.length) return '<p class="empty">Aucun nom ne correspond à ces critères : essayez une autre initiale ou un autre style.</p>';
  return `<div class="names">${NOMS.list.map(x => { const ck = nameCheck(x.name, S.dogs.map(d => d.name)); return `<div class="name-card"><b>${esc(x.name)}</b><small>${esc(NAME_STYLES[x.style][0])} · ${ck.syl} syll.</small><span class="name-act"><button data-act="nm-fav" data-n="${esc(x.name)}" aria-label="Favori" class="${isFav(x.name) ? 'fav' : ''}">${isFav(x.name) ? '♥' : '♡'}</button>${'speechSynthesis' in window ? `<button data-act="nm-say" data-n="${esc(x.name)}" aria-label="Écouter">🔊</button>` : ''}</span></div>`; }).join('')}</div>`;
}
function testHTML(v) {
  if (!v || norm(v).length < 2) return '<p class="mut small">Tapez un nom pour voir s’il est facile à retenir pour votre animal.</p>';
  const r = nameCheck(v, S.dogs.map(d => d.name)), cls = r.score >= 75 ? 'ok' : r.score >= 50 ? 'warn' : 'bad';
  return `<div class="score-line ${cls}"><b>${esc(v.trim())}</b> · ${r.score}/100</div><ul class="bul">${r.notes.map(x => `<li class="${x[0]}">${esc(x[1])}</li>`).join('')}</ul>`;
}
ROUTES.noms = function noms() {
  const yr = NOMS.year, L = lofLetter(yr), thisYear = new Date().getFullYear();
  return `<div class="page-h"><a class="back" href="#/plus">‹</a><h1>🏷️ Trouver un nom</h1></div>
  <section class="card"><h2>Mes critères</h2>
    <p class="lbl">Pour un…</p><div class="chips">${chip('nm-set', 'sp', 'dog', '🐕 Chien', NOMS.sp === 'dog')}${chip('nm-set', 'sp', 'cat', '🐈 Chat', NOMS.sp === 'cat')}</div>
    <p class="lbl">Sexe</p><div class="chips">${chip('nm-set', 'sex', '', 'Peu importe', !NOMS.sex)}${chip('nm-set', 'sex', 'm', 'Mâle', NOMS.sex === 'm')}${chip('nm-set', 'sex', 'f', 'Femelle', NOMS.sex === 'f')}</div>
    <p class="lbl">Style</p><div class="chips">${chip('nm-set', 'style', '', 'Tous', !NOMS.style)}${Object.entries(NAME_STYLES).map(([k, v]) => chip('nm-set', 'style', k, v[0], NOMS.style === k)).join('')}</div>
    <p class="lbl">Longueur</p><div class="chips">${chip('nm-set', 'short', '1', 'Court (1-2 syllabes)', NOMS.short)}${chip('nm-set', 'short', '', 'Peu importe', !NOMS.short)}</div>
    <p class="lbl">Initiale (facultatif)</p><input id="nm-letter" class="search" maxlength="1" value="${esc(NOMS.letter)}" placeholder="Une lettre, par exemple B" autocomplete="off">
    <button class="btn primary big" data-act="nm-go">🎲 Proposer des noms</button></section>
  <section class="card note"><b>📅 Animal à pedigree (LOF / LOOF) : la lettre de l’année</b>
    <p>Pour enregistrer un chien de race au LOF ou un chat de race au LOOF, le nom officiel doit commencer par la lettre de l’année de naissance. Cycle de 20 lettres (sans K, Q, W, X, Y, Z).</p>
    <div class="year-row"><label>Année de naissance <input id="nm-year" type="number" min="1990" max="${thisYear + 1}" value="${yr}"></label><span class="big-letter">${L}</span></div>
    <button class="btn sm" data-act="nm-lof">Chercher des noms en « ${L} »</button>
    <p class="mut small">Ne concerne que les animaux de race inscrits à un livre des origines. Un chien ou un chat sans pedigree se nomme librement, et le nom du quotidien peut différer du nom officiel.</p></section>
  <div id="nm-res">${namesHTML()}</div>
  <section class="card"><h2>Tester un nom</h2><input id="nm-test" class="search" placeholder="Le nom auquel vous pensez…" autocomplete="off"><div id="nm-test-res">${testHTML('')}</div></section>
  ${nameFavs().length ? `<section class="card"><h2>❤️ Mes favoris</h2><div class="list">${nameFavs().map(n => `<div class="row"><span class="grow"><b>${esc(n)}</b><small>${nameCheck(n, S.dogs.map(d => d.name)).score}/100</small></span><button class="btn sm" data-act="nm-use" data-n="${esc(n)}">Utiliser</button><button class="btn sm" data-act="nm-fav" data-n="${esc(n)}" aria-label="Retirer">✕</button></div>`).join('')}</div></section>` : ''}
  <p class="mut small center">Astuce : dites le nom à voix haute plusieurs fois, criez-le dans le jardin, puis imaginez-le au vétérinaire. Si vous souriez, c’est le bon.</p>`;
};
ACT['nm-set'] = ({ k, v }) => { NOMS[k] = k === 'short' ? !!v : v; if (k === 'sp' || k === 'sex' || k === 'style' || k === 'short') render(true); };
ACT['nm-go'] = () => { NOMS.letter = ($('#nm-letter') || {}).value || ''; NOMS.list = pickNames({ sp: NOMS.sp, sex: NOMS.sex, style: NOMS.style, letter: NOMS.letter, short: NOMS.short }); NOMS.tried = true; render(true); };
ACT['nm-lof'] = () => { const i = $('#nm-letter'); if (i) i.value = lofLetter(NOMS.year); ACT['nm-go'](); };
ACT['nm-fav'] = ({ n }) => { const f = nameFavs(), i = f.indexOf(n); if (i >= 0) f.splice(i, 1); else f.push(n); save(); render(true); };
ACT['nm-say'] = ({ n }) => { try { const u = new SpeechSynthesisUtterance(n); u.lang = 'fr-FR'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* voix indisponible */ } };
ACT['nm-use'] = ({ n }) => { newDog(false); setTimeout(() => { const i = document.querySelector('.sheet input[name=name]'); if (i) i.value = n; }, 120); };
document.addEventListener('input', e => {
  if (e.target.id === 'nm-test') $('#nm-test-res').innerHTML = testHTML(e.target.value);
  else if (e.target.id === 'nm-year') { const y = parseInt(e.target.value, 10); if (y >= 1990 && y <= 2100) { NOMS.year = y; const b = $('.year-row .big-letter'); if (b) b.textContent = lofLetter(y); const btn = document.querySelector('[data-act=nm-lof]'); if (btn) btn.textContent = `Chercher des noms en « ${lofLetter(y)} »`; } }
});
