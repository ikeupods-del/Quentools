/* Pax Mythica — décrets libres : le joueur écrit ce que fait son peuple, en français (« déclarer la guerre à Nubie et lever
   20 hoplites à Korinthos »). Avec l'IA locale du Mac, le décret est traduit en actions et raconté ; sans IA, il est lu par mots-clés.
   Dans les deux cas, chaque action passe par les règles du moteur (coûts, guerres, âges) : rien n'est accordé hors des règles. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  PM.norm = norm;
  const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, cent: 100, mille: 1000 };

  PM.TYPES_ACTION = ['guerre', 'paix', 'alliance', 'pacte', 'appel', 'soutien', 'rompre', 'renommer_pacte', 'tribut', 'exiger', 'recruter', 'construire', 'developper', 'age', 'pouvoir', 'marcher', 'offrande', 'jeux', 'commerce', 'renommer_province', 'renommer_peuple', 'capitale'];
  const BATS = [['merveille', /merveille|colosse|phare|pyramide/], ['remparts', /rempart|muraille|mur|fortif|forteresse|enceinte/], ['temple', /temple|sanctuaire|autel|oracle/],
    ['mine', /mine|filon|carriere/], ['scierie', /bucheron|scierie|bois|forestier/], ['ferme', /ferme|champ|grenier|culture|moisson/]];
  const CATS = [['inf', /soldat|fantassin|infanterie|guerrier|lancier/], ['archer', /archer|frondeur|tireur/], ['cav', /cavalier|cavalerie|char|monte/], ['heros', /heros|champion|pretre/], ['siege', /siege|catapulte|belier|engin/]];

  // ---------- reconnaissance des noms ----------
  function trouverNation(j, n, t) {
    const E = j.etat, l = E.nations.filter(N => N.vivante && N.id !== n);
    let best = null, bs = 0;
    for (const N of l) {
      const nn = norm(N.nom); if (t.includes(nn)) return N.id;
      for (const m of nn.split(' ').filter(x => x.length >= 4 && !['royaume', 'empire', 'peuple', 'ligue', 'clan', 'cite', 'jarls', 'dynastie', 'thalassocratie'].includes(x))) if (new RegExp('\\b' + m).test(t) && m.length > bs) { bs = m.length; best = N.id; }
    }
    if (best != null) return best;
    for (const pa in PM.PANTHEONS) if (t.includes(norm(PM.PANTHEONS[pa].nom).slice(0, -1))) { const N = l.find(x => x.pantheon === pa); if (N) return N.id; }
    // province citée : son propriétaire
    const p = trouverProvince(j, t, () => true); if (p != null && E.provinces[p].owner >= 0 && E.provinces[p].owner !== n) return E.provinces[p].owner;
    return null;
  }
  function trouverProvince(j, t, filtre) {
    let best = null, bl = 0;
    for (const P of j.etat.provinces) { const nn = norm(P.nom); if (nn.length >= 3 && new RegExp('\\b' + nn + '\\b').test(t) && nn.length > bl && (!filtre || filtre(P))) { bl = nn.length; best = P.id; } }
    return best;
  }
  function trouverUnite(j, n, t) {
    const dispo = PM.unitesDispo(j, n);
    for (const id of dispo) { const nn = norm(PM.UNITES[id].nom), rac = nn.replace(/s\b/g, '').split(' ')[0]; if (rac.length >= 4 && t.includes(rac.slice(0, Math.max(4, rac.length - 1)))) return id; }
    for (const [cat, re] of CATS) if (re.test(t)) { const id = dispo.find(x => PM.UNITES[x].cat === cat); if (id) return id; }
    return null;
  }
  function trouverPouvoir(j, n, t) {
    for (const pid of PM.pouvoirsDe(j, n)) { const nn = norm(PM.POUVOIRS[pid].nom).split(' ').filter(x => x.length >= 4); if (nn.some(m => t.includes(m.slice(0, -1)))) return pid; }
    return null;
  }
  const nombreDans = t => { const m = t.match(/\b(\d{1,4})\b/); if (m) return +m[1]; for (const w of t.split(' ')) if (NOMBRES[w]) return NOMBRES[w]; return null; };

  // ---------- exécution d'une action (venue de l'IA ou des mots-clés) ----------
  PM.executerAction = function (j, n, a) {
    const E = j.etat, N = E.nations[n], t = norm([a.nation, a.province, a.unite, a.batiment, a.pouvoir].join(' '));
    const nation = a.nationId != null ? a.nationId : a.nation ? trouverNation(j, n, norm(a.nation)) : null;
    const prov = a.provinceId != null ? a.provinceId : a.province ? trouverProvince(j, norm(a.province)) : null;
    const besoinNation = () => ({ ok: false, message: 'Quel peuple ? (nomme-le dans le décret)' });
    const tour = (k) => { E.decrets = E.decrets || {}; if (E.decrets[k] === E.mois) return false; E.decrets[k] = E.mois; return true; };
    switch (a.type) {
      case 'guerre': return nation == null ? besoinNation() : PM.declarerGuerre(j, n, nation, a.motif ? String(a.motif).slice(0, 80) : '');
      case 'paix': return nation == null ? besoinNation() : PM.proposerPaix(j, n, nation);
      case 'alliance': case 'pacte': {
        if (nation == null) return besoinNation();
        const t = norm(a.pacte || a.batiment || ''), type = /non ?agression|paix/.test(t) ? 'nonagression' : /total|offensi|sacre/.test(t) ? 'totale' : PM.TYPES_PACTE[a.pacte] ? a.pacte : 'defensive';
        return PM.proposerPacte(j, n, nation, type, null, a.nom ? String(a.nom).slice(0, 40) : null);
      }
      case 'appel': {
        // l'allié appelé et l'ennemi visé (le seul ennemi si un seul)
        const enn = a.ennemiId != null ? a.ennemiId : a.ennemi ? trouverNation(j, n, norm(a.ennemi)) : null;
        const guerres = E.guerres.filter(w => w.a === n || w.b === n).map(w => w.a === n ? w.b : w.a);
        const cibleE = enn != null ? enn : guerres.length === 1 ? guerres[0] : null;
        if (cibleE == null) return { ok: false, message: guerres.length ? 'Contre quel ennemi ? (nomme-le)' : 'Tu n’es en guerre contre personne.' };
        const allies = nation != null && nation !== cibleE ? [nation] : E.nations.filter(M => M.vivante && PM.allies(j, n, M.id) && !PM.enGuerre(j, M.id, cibleE)).map(M => M.id);
        if (!allies.length) return { ok: false, message: 'Aucun allié à appeler.' };
        const r = allies.map(m => PM.appelerAuxArmes(j, n, m, cibleE));
        return { ok: r.some(x => x.ok), message: r.map(x => x.message).join(' ') };
      }
      case 'soutien': return nation == null ? besoinNation() : PM.demanderSoutien(j, n, nation);
      case 'renommer_pacte': { const p = PM.allianceDe(j, n) || PM.pactesDe(j, n)[0]; return p ? PM.renommerPacte(j, n, p.id, a.nom) : { ok: false, message: 'Tu n’as aucun pacte à renommer.' }; }
      case 'rompre': return nation == null ? besoinNation() : PM.romprAlliance(j, n, nation);
      case 'tribut': return nation == null ? besoinNation() : PM.envoyerTribut(j, n, nation, a.nombre || 100);
      case 'exiger': return nation == null ? besoinNation() : PM.exigerTribut(j, n, nation);
      case 'recruter': {
        const u = a.uniteId || (a.unite ? trouverUnite(j, n, norm(a.unite)) : null) || PM.PANTHEONS[N.pantheon].unites[0];
        const p = prov != null && E.provinces[prov].owner === n ? prov : N.capitale;
        return PM.recruter(j, n, p, u, a.nombre || 5);
      }
      case 'construire': {
        const b = a.batimentId || (BATS.find(([, re]) => re.test(norm(a.batiment))) || [])[0];
        if (!b) return { ok: false, message: 'Quel bâtiment ? (fermes, bûcherons, mine, temple, remparts, merveille)' };
        let p = prov != null && E.provinces[prov].owner === n ? prov : null;
        if (p == null) { const l = E.provinces.filter(P => P.owner === n && !P.bat[b]).sort((x, y) => (y.id === N.capitale) - (x.id === N.capitale) || y.dev - x.dev); p = l.length ? l[0].id : N.capitale; }
        return PM.construire(j, n, p, b);
      }
      case 'developper': return PM.developper(j, n, prov != null && E.provinces[prov].owner === n ? prov : N.capitale);
      case 'age': return PM.avancerAge(j, n);
      case 'pouvoir': {
        const pid = a.pouvoirId || trouverPouvoir(j, n, norm(a.pouvoir + ' ' + (a.unite || '')));
        if (!pid) return { ok: false, message: 'Tes dieux ne connaissent pas ce pouvoir.' };
        const c = PM.POUVOIRS[pid].cible;
        return PM.lancerPouvoir(j, n, pid, c === 'nation' ? nation : c === 'aucune' ? -1 : prov);
      }
      case 'marcher': {
        if (prov == null) return { ok: false, message: 'Vers quelle province ?' };
        const l = E.armees.filter(x => x.owner === n && !x.paralysie).sort((x, y) => PM.puissance(y) - PM.puissance(x));
        if (!l.length) return { ok: false, message: 'Tu n’as aucune armée.' };
        const r = PM.ordonner(j, l[0].id, prov); return r.ok ? { ok: true, message: 'Ta plus grande armée : ' + r.message[0].toLowerCase() + r.message.slice(1) } : r;
      }
      case 'offrande':
        if (!tour('offrande')) return { ok: false, message: 'Une seule grande offrande par mois.' };
        if (N.res.nourriture < 150) return { ok: false, message: 'Il faut 150 nourriture pour une offrande.' };
        N.res.nourriture -= 150; N.res.faveur = Math.min(200, N.res.faveur + 15); return { ok: true, message: 'Offrande aux dieux : −150 🌾, +15 ✨.' };
      case 'jeux':
        if (!tour('jeux')) return { ok: false, message: 'Des jeux ont déjà eu lieu ce mois-ci.' };
        if (N.res.or < 150) return { ok: false, message: 'Il faut 150 or pour organiser des jeux.' };
        N.res.or -= 150; N.res.faveur = Math.min(200, N.res.faveur + 5);
        for (const M of E.nations) if (M.vivante && M.id !== n) PM.changerRelation(j, n, M.id, 6);
        return { ok: true, message: 'Grands jeux : −150 🪙, +6 relations avec tous les peuples.' };
      case 'commerce': {
        if (!tour('commerce')) return { ok: false, message: 'Les marchands sont déjà passés ce mois-ci.' };
        const r = ['nourriture', 'bois', 'or'], plus = r.slice().sort((x, y) => N.res[y] - N.res[x])[0], moins = a.ressource && r.includes(a.ressource) ? a.ressource : r.slice().sort((x, y) => N.res[x] - N.res[y])[0];
        if (plus === moins || N.res[plus] < 200) return { ok: false, message: 'Pas assez de marchandises à échanger (200 minimum).' };
        N.res[plus] -= 200; N.res[moins] += 110; return { ok: true, message: `Commerce : −200 ${PM.ICONES[plus]}, +110 ${PM.ICONES[moins]}.` };
      }
      case 'renommer_province': {
        const nom = String(a.nom || '').trim().slice(0, 28);
        if (prov == null || E.provinces[prov].owner !== n) return { ok: false, message: 'Seules tes provinces peuvent être renommées.' };
        if (nom.length < 2) return { ok: false, message: 'Quel nouveau nom ?' };
        const ancien = E.provinces[prov].nom; E.provinces[prov].nom = nom[0].toUpperCase() + nom.slice(1);
        return { ok: true, message: `${ancien} s’appelle désormais ${E.provinces[prov].nom}.` };
      }
      case 'renommer_peuple': {
        const nom = String(a.nom || '').trim().slice(0, 36); if (nom.length < 2) return { ok: false, message: 'Quel nouveau nom ?' };
        const ancien = N.nom; N.nom = nom[0].toUpperCase() + nom.slice(1); PM.journal(j, `${ancien} prend le nom de ${N.nom}.`, 'diplo', [n]);
        return { ok: true, message: `Ton peuple s’appelle désormais ${N.nom}.` };
      }
      case 'capitale': {
        if (prov == null || E.provinces[prov].owner !== n) return { ok: false, message: 'La nouvelle capitale doit être une de tes provinces.' };
        if (prov === N.capitale) return { ok: false, message: 'C’est déjà ta capitale.' };
        if (N.res.or < 200) return { ok: false, message: 'Déplacer la capitale coûte 200 or.' };
        N.res.or -= 200; N.capitale = prov; return { ok: true, message: `${E.provinces[prov].nom} devient ta capitale (−200 🪙).` };
      }
    }
    return { ok: false, message: 'Action inconnue.' };
  };

  // ---------- lecture par mots-clés (sans IA) ----------
  PM.lireDecret = function (j, n, texte) {
    const actions = [], brut = String(texte || '').slice(0, 600);
    // « renommer X en Y » garde la casse du nouveau nom
    const ren = brut.match(/(?:renomm\w*|rebaptis\w*)\s+(.+?)\s+en\s+[«"“]?([^»"”.,;!]+)/i);
    if (ren) {
      const t = norm(ren[1]), p = trouverProvince(j, t);
      if (p != null) actions.push({ type: 'renommer_province', provinceId: p, nom: ren[2].trim() });
      else if (/peuple|nation|royaume|empire|nous|notre/.test(t)) actions.push({ type: 'renommer_peuple', nom: ren[2].trim() });
    }
    const nomLigue = brut.match(/(?:notre|ma|mon|la|l')\s*(?:ligue|alliance|pacte)\s+(?:s'appel\w*|s’appel\w*|se nomme\w*|portera le nom)\s+[«"“]?([^»"”.,;!]+)/i);
    if (nomLigue) actions.push({ type: 'renommer_pacte', nom: nomLigue[1].trim() });
    const nomPeuple = brut.match(/(?:nous nous appel\w*|notre peuple s.appel\w*|nous serons)\s+[«"“]?([^»"”.,;!]+)/i);
    if (nomPeuple && !ren) actions.push({ type: 'renommer_peuple', nom: nomPeuple[1].trim() });
    const morceaux = brut.split(/[.;!\n]|,|\bpuis\b|\bensuite\b|\bet (?=(?:on |nous |je |l[ae]s? |d[eu]s? |un |une |\d|construi|recrut|lev|bati|declar|attaqu|propos|envo|offr|lanc|invoqu|developp|march|pri|organis|fai))/i);
    let dernier = null;
    for (const m of morceaux) {
      let t = norm(m); if (!t || /renomm|rebaptis|nous nous appel|notre peuple s appel|(ligue|alliance|pacte) (s appel|se nomme|portera)/.test(t)) continue;
      // « construire un temple, puis des remparts » : le verbe précédent vaut pour la suite
      const n0 = actions.length;
      if (dernier === 'construire' && BATS.some(([, re]) => re.test(t)) && !/constru|bati|eriger|edifi/.test(t)) t = 'construire ' + t;
      if (dernier === 'recruter' && trouverUnite(j, n, t) && !/recrut|lever|enrol|former/.test(t)) t = 'recruter ' + t;
      const nb = nombreDans(t), nation = () => trouverNation(j, n, t), province = (f) => trouverProvince(j, t, f);
      // nations citées dans l'ordre : pour « appeler X aux armes contre Y »
      const citees = () => { const l = []; for (const N of j.etat.nations) { if (!N.vivante || N.id === n) continue; const i = t.indexOf(norm(N.nom)); if (i >= 0) l.push([i, N.id]); } return l.sort((x, y) => x[0] - y[0]).map(x => x[1]); };
      if (/\brompr|\bbris\w* l alliance|\bfin de l alliance|quitt\w* (la |l |le |notre )?(ligue|alliance|pacte)|sortir de (la |l |notre )?(ligue|alliance)/.test(t)) actions.push({ type: 'rompre', nationId: nation() ?? (PM.allianceDe(j, n) ? PM.allianceDe(j, n).membres.find(x => x !== n) : null) });
      else if (/aux armes|a l aide|\bappel\w* (nos |mes |les )?allie|secours|entrer en guerre a nos cotes|rejoindre (la |notre )?guerre/.test(t)) {
        const l = citees(), al = l.find(x => PM.allies(j, n, x)), en = l.find(x => PM.enGuerre(j, n, x));
        actions.push({ type: 'appel', nationId: al ?? null, ennemiId: en ?? null });
      }
      else if (/demand\w* (de l or|un soutien|du soutien|de l aide|des subsides|des fonds)|\bsubsides/.test(t)) actions.push({ type: 'soutien', nationId: nation() });
      else if (/non ?agression/.test(t)) actions.push({ type: 'pacte', pacte: 'nonagression', nationId: nation() });
      else if (/alliance (totale|offensive|sacree)|freres d armes/.test(t)) actions.push({ type: 'pacte', pacte: 'totale', nationId: nation() });
      else if (/\bpaix\b|armistice|\btreve|cesser le feu|negocier/.test(t)) actions.push({ type: 'paix', nationId: nation() });
      else if (/allian|\ballier|\bpacte|\bunir|\bligue/.test(t)) actions.push({ type: 'pacte', pacte: 'defensive', nationId: nation() });
      else if (/exig|rancon|soumett|soumission/.test(t)) actions.push({ type: 'exiger', nationId: nation() });
      else if (/tribut|cadeau|offrir de l or|envoyer de l or|\bdon\b|payer/.test(t)) actions.push({ type: 'tribut', nationId: nation(), nombre: nb || 100 });
      else if (/guerre|declar|envahi|\bhostilit/.test(t)) actions.push({ type: 'guerre', nationId: nation() });
      else if (/age|epoque|\bere\b|progres/.test(t) && /passer|avancer|entrer|nouvel|nouveau|suivant|progres/.test(t)) actions.push({ type: 'age' });
      else if (/capitale/.test(t) && /deplac|transfer|install|nouvelle|devient|faire de/.test(t)) actions.push({ type: 'capitale', provinceId: province(P => P.owner === n) });
      else if (/constru|bati|eriger|edifi|elever un|creer un|creer des/.test(t)) {
        const b = (BATS.find(([, re]) => re.test(t)) || [])[0];
        actions.push({ type: 'construire', batimentId: b, batiment: b ? '' : t, provinceId: province(P => P.owner === n) });
      }
      else if (/developp|agrandi|embelli|amenag|prosper/.test(t)) actions.push({ type: 'developper', provinceId: province(P => P.owner === n) });
      else if (/recrut|lever|enrol|former|entrain|mobilis|engag|\barmee de/.test(t)) actions.push({ type: 'recruter', uniteId: trouverUnite(j, n, t), nombre: nb || 5, provinceId: province(P => P.owner === n) });
      else if (/invoqu|implor|lanc|dechain|foudr|pouvoir|colere/.test(t) || trouverPouvoir(j, n, t)) {
        const pid = trouverPouvoir(j, n, t);
        actions.push({ type: 'pouvoir', pouvoirId: pid, pouvoir: pid ? '' : t, provinceId: province(), nationId: nation() });
      }
      else if (/attaqu|march|envoy|deplac|dirig|conqu|prendre|assieg|occup|avancer vers/.test(t)) {
        const p = province(P => P.owner !== n) ?? province();
        if (p != null) actions.push({ type: 'marcher', provinceId: p });
        else { const nat = nation(); if (nat != null && /attaqu|conqu|envahi/.test(t)) actions.push({ type: 'guerre', nationId: nat }); }
      }
      else if (/pri|sacrific|offrande|culte|vener|honor|dieux/.test(t)) actions.push({ type: 'offrande' });
      else if (/fete|festival|\bjeux|banquet|celebr|olympi/.test(t)) actions.push({ type: 'jeux' });
      else if (/commerc|echang|vend|achet|march(and|e) |troc|negoc/.test(t)) actions.push({ type: 'commerce', ressource: /nourrit|ble|grain|vivre/.test(t) ? 'nourriture' : /\bbois\b/.test(t) ? 'bois' : /\bor\b/.test(t) ? 'or' : null });
      if (actions.length > n0) dernier = actions[actions.length - 1].type;
    }
    return actions.slice(0, 6);
  };

  // récit court sans IA, à partir des résultats
  function recitSimple(j, n, resultats) {
    const N = j.etat.nations[n], ok = resultats.filter(r => r.ok), ko = resultats.filter(r => !r.ok);
    const ouv = ['Les hérauts parcourent les routes de ' + N.nom + '.', 'Au conseil de ' + N.nom + ', la décision est prise.', 'Le décret est gravé sur les stèles de la capitale.', 'Les prêtres consultent les dieux, puis le peuple obéit.'];
    return ouv[j.etat.mois % ouv.length] + (!ok.length ? ' Mais rien ne peut être fait.' : ko.length ? ' Une partie des ordres ne peut être exécutée.' : ' Tous les ordres sont exécutés.');
  }

  // ---------- avec l'IA locale ----------
  PM.resumePourIA = function (j, n) {
    const E = j.etat, N = E.nations[n], P = PM.PANTHEONS[N.pantheon];
    const miennes = E.provinces.filter(p => p.owner === n), autres = E.nations.filter(M => M.vivante && M.id !== n);
    return [
      `Date : ${PM.date(E.mois)}. Peuple du joueur : ${N.nom} (${P.nom}, dieu ${PM.majeur(N).nom}, ${PM.AGES[N.age].nom}).`,
      `Ressources : ${Math.round(N.res.nourriture)} nourriture, ${Math.round(N.res.bois)} bois, ${Math.round(N.res.or)} or, ${Math.round(N.res.faveur)} faveur.`,
      `Provinces du joueur : ${miennes.slice(0, 30).map(p => p.nom + (p.id === N.capitale ? ' (capitale)' : '')).join(', ')}.`,
      `Autres peuples : ${autres.map(M => `${M.nom} (${PM.PANTHEONS[M.pantheon].nom}, ${PM.enGuerre(j, n, M.id) ? 'en guerre' : PM.allies(j, n, M.id) ? 'allié' : PM.lies(j, n, M.id) ? 'pacte de non-agression' : 'paix'}, relations ${Math.round(PM.relation(j, n, M.id))}, provinces : ${E.provinces.filter(p => p.owner === M.id).slice(0, 8).map(p => p.nom).join(', ')})`).join(' ; ')}.`,
      `Pactes du joueur : ${PM.pactesDe(j, n).map(p => `${p.nom} (${PM.TYPES_PACTE[p.type].nom}, membres : ${p.membres.map(m => E.nations[m].nom).join(', ')})`).join(' ; ') || 'aucun'}. Parole du joueur : ${Math.round(PM.parole(j, n))}/100.`,
      `Unités recrutables : ${PM.unitesDispo(j, n).map(id => PM.UNITES[id].nom).join(', ')}.`,
      `Pouvoirs divins : ${PM.pouvoirsDe(j, n).map(id => PM.POUVOIRS[id].nom + (N.pouvoirs[id] > 0 ? ' (en recharge)' : '')).join(', ') || 'aucun'}.`,
      `Bâtiments possibles : fermes, bûcherons, mine, temple, remparts, merveille (âge mythique).`
    ].join('\n');
  };
  PM.SCHEMA_DECRET = {
    type: 'object',
    properties: {
      recit: { type: 'string' },
      reactions: { type: 'array', maxItems: 2, items: { type: 'object', properties: { nation: { type: 'string' }, texte: { type: 'string' } }, required: ['nation', 'texte'] } },
      actions: { type: 'array', maxItems: 6, items: { type: 'object', properties: {
        type: { type: 'string', enum: PM.TYPES_ACTION }, nation: { type: 'string' }, province: { type: 'string' }, unite: { type: 'string' },
        nombre: { type: 'integer' }, batiment: { type: 'string' }, pouvoir: { type: 'string' }, nom: { type: 'string' },
        pacte: { type: 'string', enum: ['nonagression', 'defensive', 'totale'] }, ennemi: { type: 'string' } }, required: ['type'] } }
    },
    required: ['recit', 'actions']
  };
  const SYSTEME = `Tu es l'oracle et le chroniqueur d'un jeu de stratégie mythologique. Le joueur écrit un décret pour son peuple.
1. Traduis le décret en actions du jeu, uniquement parmi : guerre, paix, pacte (nation, pacte = nonagression, defensive ou totale ; nom éventuel du pacte), appel (appeler l'allié « nation » aux armes contre « ennemi »), soutien (demander de l'or à un allié), rompre (quitter le pacte qui lie à « nation »), renommer_pacte (nom), tribut (offrir de l'or, nombre = or), exiger (un tribut), recruter (unite, nombre, province), construire (batiment, province), developper (province), age (passer à l'âge suivant), pouvoir (pouvoir, province ou nation visée), marcher (province visée par la plus grande armée), offrande (prier les dieux), jeux (fêtes pour plaire aux autres peuples), commerce, renommer_province (province, nom), renommer_peuple (nom), capitale (province).
2. Utilise exactement les noms de peuples, provinces, unités et pouvoirs donnés. N'invente aucune action ni aucun chiffre : le jeu applique ses propres règles et coûts.
3. Écris un récit épique de 2 à 4 phrases au présent, en français, qui raconte le décret sans annoncer de résultat chiffré. Ajoute au plus deux réactions d'autres peuples (une phrase chacune).
4. Si le décret est impossible, flou ou hors du jeu, laisse les actions vides et dis-le dans le récit avec élégance.`;

  // décret complet : IA si disponible (ia = fonction ecrire de l'application), sinon mots-clés ; renvoie { recit, reactions, resultats, source }
  PM.decret = async function (j, n, texte, ia) {
    const E = j.etat, propre = String(texte || '').trim().slice(0, 600);
    if (!propre) return { recit: '', reactions: [], resultats: [], source: 'vide' };
    let actions = null, recit = '', reactions = [], source = 'mots-clés';
    if (ia) {
      try {
        const r = await ia({ systeme: SYSTEME, demande: PM.resumePourIA(j, n) + '\n\nDécret du joueur : « ' + propre + ' »', schema: PM.SCHEMA_DECRET, maxTokens: 700, temperature: 0.6 });
        if (r && Array.isArray(r.actions)) {
          actions = r.actions.filter(a => a && PM.TYPES_ACTION.includes(a.type)).slice(0, 6);
          recit = String(r.recit || '').slice(0, 700); reactions = (r.reactions || []).slice(0, 2).map(x => ({ nation: String(x.nation || '').slice(0, 40), texte: String(x.texte || '').slice(0, 240) }));
          source = 'oracle';
          // l'IA a manqué une action évidente : la lecture par mots-clés la complète
          const motsCles = PM.lireDecret(j, n, propre);
          if (!actions.length && motsCles.length) actions = motsCles;
        }
      } catch (e) { source = 'mots-clés (oracle indisponible : ' + String(e.message || e).slice(0, 80) + ')'; }
    }
    if (!actions) actions = PM.lireDecret(j, n, propre);
    const resultats = actions.map(a => PM.executerAction(j, n, a));
    if (!actions.length) resultats.push({ ok: false, message: 'Les conseillers ne comprennent pas ce décret. Exemples : « déclarer la guerre à Nubie », « lever 10 archers », « construire un temple à Korinthos », « prier les dieux », « renommer Korinthos en Nouvelle-Thèbes ».' });
    if (!recit) recit = recitSimple(j, n, resultats);
    const faits = resultats.filter(r => r.ok).map(r => r.message).join(' ');
    PM.journal(j, `📜 Décret : « ${propre.slice(0, 140)}${propre.length > 140 ? '…' : ''} » — ${recit}${faits && source !== 'oracle' ? ' ' + faits : ''}`, 'decret', [n]);
    for (const r of reactions) PM.journal(j, `💬 ${r.nation} : ${r.texte}`, 'decret', [n]);
    return { recit, reactions, resultats, source };
  };
})(typeof window !== 'undefined' ? window : globalThis);
