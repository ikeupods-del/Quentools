/* Pax Mythica — alliances : pactes de non-agression, alliances défensives et alliances totales, à deux ou en ligues de plusieurs peuples.
   Appels aux armes (défense d'un membre attaqué, guerres menées ensemble), refus et trahisons, « parole » de chaque peuple (sa fiabilité),
   paix commune des camps, soutien en or entre alliés. Les peuples de l'ordinateur jugent chaque proposition (avisPacte) et chaque appel. */
'use strict';
(function (G) {
  const PM = G.PM = G.PM || {};
  const nat = (j, n) => j.etat.nations[n];
  const vivantes = j => j.etat.nations.filter(N => N.vivante);
  const refus = message => ({ ok: false, message });

  PM.TYPES_PACTE = {
    nonagression: { nom: 'Pacte de non-agression', court: 'Non-agression', emoji: '🕊️', rang: 1, prefixe: 'Pacte de',
      desc: 'Promesse de ne pas s’attaquer. Rompre ce pacte par une guerre est une trahison.' },
    defensive: { nom: 'Alliance défensive', court: 'Défensive', emoji: '🛡️', rang: 2, prefixe: 'Ligue de',
      desc: 'Si un membre est attaqué, les autres sont appelés à le défendre. Les armées traversent librement les terres des membres.' },
    totale: { nom: 'Alliance totale', court: 'Totale', emoji: '⚔️', rang: 3, prefixe: 'Alliance sacrée de',
      desc: 'Défense mutuelle et guerres menées ensemble : chaque guerre déclarée par un membre appelle les autres.' }
  };
  const T = t => PM.TYPES_PACTE[t];

  // ---------- lectures ----------
  PM.pactes = j => j.etat.pactes || (j.etat.pactes = []);
  PM.pactesDe = (j, n) => PM.pactes(j).filter(p => p.membres.includes(n));
  PM.pacteEntre = (j, a, b) => PM.pactes(j).filter(p => p.membres.includes(a) && p.membres.includes(b)).sort((x, y) => T(y.type).rang - T(x.type).rang)[0] || null;
  PM.rangEntre = (j, a, b) => { const p = a !== b && PM.pacteEntre(j, a, b); return p ? T(p.type).rang : 0; };
  PM.allies = (j, a, b) => a >= 0 && b >= 0 && PM.rangEntre(j, a, b) >= 2;
  PM.lies = (j, a, b) => a >= 0 && b >= 0 && PM.rangEntre(j, a, b) >= 1;
  PM.parole = (j, n) => { const N = nat(j, n); return N.parole == null ? (N.parole = 60) : N.parole; };
  const changerParole = (j, n, d) => { const N = nat(j, n); N.parole = Math.max(0, Math.min(100, PM.parole(j, n) + d)); };
  PM.pacte = (j, id) => PM.pactes(j).find(p => p.id === id) || null;
  // chaque peuple appartient à une seule alliance (défensive ou totale) : le monde se divise en blocs ; les pactes de non-agression sont à deux
  PM.allianceDe = (j, n) => PM.pactes(j).find(p => T(p.type).rang >= 2 && p.membres.includes(n)) || null;
  PM.tailleMaxAlliance = j => Math.max(3, Math.ceil(vivantes(j).length / 3));

  // menace commune : un peuple très puissant qui touche les deux (les coalitions naissent contre les géants)
  function menaceCommune(j, a, b) {
    const E = j.etat, total = E.provinces.length;
    for (const X of vivantes(j)) {
      if (X.id === a || X.id === b || PM.lies(j, X.id, a) || PM.lies(j, X.id, b)) continue;
      const fr = PM.frontaliers ? PM.frontaliers(j, X.id) : [];
      const grand = E.provinces.filter(p => p.owner === X.id).length >= total * 0.25;
      const fort = PM.force(j, X.id) > 1.3 * Math.max(PM.force(j, a), PM.force(j, b));
      if ((grand || fort) && fr.includes(a) && fr.includes(b)) return X.id;
    }
    return -1;
  }
  PM.menaceCommune = menaceCommune;
  const ennemiCommun = (j, a, b) => j.etat.guerres.some(w => { const e = w.a === b ? w.b : w.b === b ? w.a : -1; return e >= 0 && e !== a && PM.enGuerre(j, a, e); });

  // avis d'un peuple de l'ordinateur sur une proposition : score, accord et raisons (montrées au joueur)
  PM.avisPacte = function (j, ia, autre, type, pacte) {
    const raisons = [], E = j.etat;
    if (PM.enGuerre(j, ia, autre)) return { ok: false, score: -100, raisons: ['vous êtes en guerre'] };
    const membres = pacte ? pacte.membres.filter(m => m !== autre) : [];
    for (const m of membres) {
      if (m === ia) continue;
      if (PM.enGuerre(j, ia, m)) return { ok: false, score: -100, raisons: [`en guerre avec ${nat(j, m).nom}, membre du pacte`] };
      if (PM.relation(j, ia, m) < -10) return { ok: false, score: -100, raisons: [`${nat(j, m).nom} est leur ennemi`] };
    }
    if (pacte && pacte.membres.includes(ia)) return { ok: false, score: -100, raisons: ['déjà membre'] };
    let s = PM.relation(j, ia, autre); raisons.push(`relations ${s > 0 ? '+' : ''}${Math.round(s)}`);
    const parole = PM.parole(j, autre); if (parole >= 70) { s += (parole - 60) * 0.5; raisons.push('ta parole est respectée'); } else if (parole < 45) { s += (parole - 60) * 0.7; raisons.push('ta parole est douteuse'); }
    if (ennemiCommun(j, ia, autre)) { s += 25; raisons.push('ennemi commun'); }
    const X = menaceCommune(j, ia, autre); if (X >= 0) { s += 22; raisons.push(`peur de ${nat(j, X).nom}`); }
    if (nat(j, ia).pantheon === nat(j, autre).pantheon) { s += 8; raisons.push('même panthéon'); }
    const ratio = (PM.force(j, autre) + 1) / (PM.force(j, ia) + 1);
    if (ratio > 1.5) { s += 10; raisons.push('ta puissance les rassure'); } else if (ratio < 0.5 && type === 'totale') { s -= 12; raisons.push('tu es trop faible pour eux'); }
    if (type === 'nonagression' && ratio < 0.6 && nat(j, ia).agress > 0.5) { s -= 25; raisons.push('ils préfèrent garder les mains libres'); }
    s -= { nonagression: -8, defensive: 8, totale: 34 }[type];
    s += membres.length * (type === 'nonagression' ? 0 : 3);
    void E;
    return { ok: s >= 30, score: Math.round(s), raisons };
  };
  PM.texteAvis = a => a.score >= 45 ? 'favorable' : a.score >= 30 ? 'plutôt favorable' : a.score >= 15 ? 'hésitant' : 'hostile';

  // ---------- former, rejoindre, quitter ----------
  function nomPacte(j, n, type) {
    const N = nat(j, n), cap = j.etat.provinces[N.capitale], base = `${T(type).prefixe} ${cap ? cap.nom : N.nom}`;
    let nom = base, k = 2; while (PM.pactes(j).some(p => p.nom === nom)) nom = base + ' ' + ['', '', 'II', 'III', 'IV', 'V'][Math.min(5, k++)];
    return nom;
  }
  function creer(j, n, m, type, nom) {
    const E = j.etat, p = { id: (E.seqPacte = (E.seqPacte || 0) + 1), type, nom: nom ? String(nom).slice(0, 40) : nomPacte(j, n, type), membres: [n, m], chef: n, debut: E.mois };
    PM.pactes(j).push(p); return p;
  }
  // proposition de n à m. Selon les cas : pacte de non-agression à deux, nouvelle alliance à deux, alliance à deux renforcée (défensive → totale),
  // invitation de m dans l'alliance de n, ou demande de n pour entrer dans l'alliance de m. pid : alliance précise où inviter m.
  PM.proposerPacte = function (j, n, m, type, pid, nom) {
    const E = j.etat, N = nat(j, n), M = nat(j, m);
    if (!M || !M.vivante || m === n) return refus('Peuple introuvable.');
    if (!T(type)) type = 'defensive';
    if (PM.enGuerre(j, n, m)) return refus('Faites d’abord la paix.');
    const An = pid != null ? PM.pacte(j, pid) : PM.allianceDe(j, n), Am = PM.allianceDe(j, m);
    if (pid != null && (!An || !An.membres.includes(n))) return refus('Tu n’es pas membre de cette alliance.');
    let cas, pacte = null, cible = m, juge = m;
    if (type === 'nonagression' && pid == null) {
      if (PM.lies(j, n, m)) return refus(`Vous êtes déjà liés par « ${PM.pacteEntre(j, n, m).nom} ».`);
      cas = 'nouveau';
    } else if (An && Am && An === Am) {
      if (An.membres.length !== 2 || T(type).rang <= T(An.type).rang) return refus(`Vous êtes déjà alliés dans « ${An.nom} ».`);
      cas = 'renfort'; pacte = An;
    } else if (An) {
      if (Am) return refus(`${M.nom} appartient déjà à « ${Am.nom} ».`);
      if (An.membres.length >= PM.tailleMaxAlliance(j)) return refus(`« ${An.nom} » est complète (${An.membres.length} membres au plus).`);
      cas = 'invitation'; pacte = An; type = An.type;
    } else if (Am) {
      if (Am.membres.length >= PM.tailleMaxAlliance(j)) return refus(`« ${Am.nom} » est complète.`);
      cas = 'adhesion'; pacte = Am; type = Am.type; cible = n; juge = Am.chef;
    } else cas = 'nouveau';
    const J = nat(j, juge);
    if (J.ia) {
      const a = PM.avisPacte(j, juge, cas === 'adhesion' ? n : n, type, cas === 'renfort' ? null : pacte);
      if (!a.ok) { PM.changerRelation(j, n, juge, -1); return refus(`${J.nom} décline (${PM.texteAvis(a)} : ${a.raisons.join(', ')}).`); }
    } else {
      if (E.attente.some(x => x.type === 'pacte' && x.de === n)) return refus('Une proposition attend déjà sa réponse.');
      E.attente.push({ type: 'pacte', nation: juge, de: n, typePacte: type, pacte: pacte ? pacte.id : null, cas, nom: nom || null });
      return { ok: true, message: `Proposition envoyée à ${J.nom}.`, attente: true };
    }
    return conclure(j, cas, n, cible, type, pacte, nom);
  };
  // entrant : le peuple qui rejoint l'alliance (invitation ou adhésion)
  function conclure(j, cas, n, entrant, type, pacte, nom) {
    const E = j.etat, N = nat(j, n), M = nat(j, entrant);
    if (cas === 'invitation' || cas === 'adhesion') {
      if (PM.allianceDe(j, entrant)) return refus(`${M.nom} appartient déjà à une alliance.`);
      pacte.membres.push(entrant);
      for (const x of pacte.membres) if (x !== entrant) PM.changerRelation(j, entrant, x, 6);
      PM.journal(j, `${T(type).emoji} ${M.nom} rejoint « ${pacte.nom} » (${pacte.membres.length} membres).`, 'alliance', pacte.membres.slice());
      return { ok: true, message: `${M.nom} rejoint « ${pacte.nom} ».`, pacte };
    }
    if (cas === 'renfort') {
      pacte.type = type; if (pacte.nom.startsWith(T('defensive').prefixe + ' ')) pacte.nom = pacte.nom.replace(T('defensive').prefixe, T(type).prefixe);
      PM.changerRelation(j, n, entrant, 6);
      PM.journal(j, `${T(type).emoji} ${N.nom} et ${M.nom} resserrent leurs liens : « ${pacte.nom} » devient une ${T(type).nom.toLowerCase()}.`, 'alliance', [n, entrant]);
      return { ok: true, message: `« ${pacte.nom} » devient une ${T(type).nom.toLowerCase()}.`, pacte };
    }
    if (T(type).rang >= 2 && (PM.allianceDe(j, n) || PM.allianceDe(j, entrant))) return refus('Un des deux peuples a déjà rejoint une autre alliance.');
    const caps = [n, entrant].map(x => (E.provinces[nat(j, x).capitale] || {}).nom || nat(j, x).nom);
    const p = creer(j, n, entrant, type, nom || (type === 'nonagression' ? `Pacte de ${caps[0]} et ${caps[1]}` : null));
    if (type === 'nonagression') p.fin = E.mois + 120;
    PM.changerRelation(j, n, entrant, 8);
    PM.journal(j, `${T(type).emoji} ${N.nom} et ${M.nom} concluent « ${p.nom} » (${T(type).nom.toLowerCase()}${p.fin ? ', pour dix ans' : ''}).`, 'alliance', [n, entrant]);
    return { ok: true, message: `Accord conclu avec ${M.nom} : « ${p.nom} ».`, pacte: p };
  }
  PM.repondrePacte = function (j, accepter) {
    const E = j.etat, k = E.attente.findIndex(a => a.type === 'pacte'); if (k < 0) return refus('Aucune proposition.');
    const a = E.attente.splice(k, 1)[0], pacte = a.pacte != null ? PM.pacte(j, a.pacte) : null;
    if (!accepter) { PM.changerRelation(j, a.nation, a.de, -6); return { ok: true, message: 'Tu déclines la proposition.' }; }
    if (!nat(j, a.de).vivante || PM.enGuerre(j, a.nation, a.de) || (a.pacte != null && !pacte)) return refus('Cette proposition n’est plus possible.');
    const cas = a.cas || (pacte ? 'invitation' : 'nouveau');
    if (cas === 'adhesion') return conclure(j, cas, a.nation, a.de, a.typePacte, pacte, a.nom);
    return conclure(j, cas, a.de, a.nation, a.typePacte, pacte, a.nom);
  };
  // quitter un pacte : abandonner des alliés en guerre coûte cher en parole
  PM.quitterPacte = function (j, n, pid, silencieux) {
    const E = j.etat, p = PM.pacte(j, pid); if (!p || !p.membres.includes(n)) return refus('Tu n’es pas membre de ce pacte.');
    const autres = p.membres.filter(x => x !== n), enGuerre = autres.some(x => E.guerres.some(w => w.a === x || w.b === x));
    const perte = (T(p.type).rang >= 2 && enGuerre ? 15 : 4) + (E.mois - p.debut < 24 ? 4 : 0);
    changerParole(j, n, -perte);
    for (const x of autres) PM.changerRelation(j, n, x, -12);
    p.membres = autres; if (p.chef === n) p.chef = autres[0];
    if (!silencieux) PM.journal(j, `${nat(j, n).nom} quitte « ${p.nom} »${enGuerre && T(p.type).rang >= 2 ? ' et abandonne ses alliés en pleine guerre' : ''}.`, 'alliance', p.membres.concat([n]));
    if (p.membres.length < 2) { E.pactes = PM.pactes(j).filter(x => x !== p); if (!silencieux) PM.journal(j, `« ${p.nom} » est dissous.`, 'alliance', p.membres.concat([n])); }
    return { ok: true, message: `Tu quittes « ${p.nom} » (parole −${perte}).` };
  };
  PM.romprAlliance = function (j, n, m) {
    const p = PM.pacteEntre(j, n, m); if (!p) return refus(`Aucun pacte ne te lie à ${nat(j, m).nom}.`);
    return PM.quitterPacte(j, n, p.id);
  };
  PM.proposerAlliance = (j, n, m) => PM.proposerPacte(j, n, m, 'defensive');
  PM.renommerPacte = function (j, n, pid, nom) {
    const p = PM.pacte(j, pid); nom = String(nom || '').trim().slice(0, 40);
    if (!p || !p.membres.includes(n)) return refus('Tu n’es pas membre de ce pacte.');
    if (nom.length < 2) return refus('Quel nouveau nom ?');
    const ancien = p.nom; p.nom = nom; PM.journal(j, `« ${ancien} » prend le nom de « ${nom} ».`, 'alliance', p.membres.slice());
    return { ok: true, message: `Le pacte s’appelle désormais « ${nom} ».` };
  };
  // guerre contre un peuple lié : trahison (on quitte tous les pactes qui le contiennent)
  PM.trahir = function (j, a, b) {
    const l = PM.pactes(j).filter(p => p.membres.includes(a) && p.membres.includes(b)); if (!l.length) return;
    for (const p of l) {
      for (const x of p.membres) if (x !== a) PM.changerRelation(j, a, x, -25);
      p.membres = p.membres.filter(x => x !== a);
      if (p.membres.length < 2) j.etat.pactes = PM.pactes(j).filter(x => x !== p);
    }
    changerParole(j, a, -30);
    for (const N of vivantes(j)) if (N.id !== a && N.id !== b) PM.changerRelation(j, a, N.id, -8);
    PM.journal(j, `🗡️ Trahison ! ${nat(j, a).nom} rompt sa parole envers ${nat(j, b).nom} (${l.map(p => '« ' + p.nom + ' »').join(', ')}).`, 'alliance', [a, b]);
  };
  PM.retirerDesPactes = function (j, n) {
    for (const p of PM.pactesDe(j, n)) { p.membres = p.membres.filter(x => x !== n); if (p.chef === n) p.chef = p.membres[0]; }
    j.etat.pactes = PM.pactes(j).filter(p => p.membres.length >= 2);
  };

  // ---------- appels aux armes ----------
  PM.repondraitAppel = function (j, m, allie, ennemi, defensif) {
    const M = nat(j, m), relA = PM.relation(j, m, allie), relE = PM.relation(j, m, ennemi);
    const ratio = (PM.force(j, m) + PM.force(j, allie) + 1) / (PM.force(j, ennemi) + 1);
    const guerres = j.etat.guerres.filter(w => w.a === m || w.b === m).length;
    const s = relA * 0.6 + (defensif ? 32 : 6) + (relE < 0 ? 15 : -relE * 0.3) + M.agress * 20 + (ratio > 1 ? 10 : -15) + PM.parole(j, m) / 8 - guerres * 12;
    return s >= 30;
  };
  // m est appelé par son allié contre l'ennemi ; le joueur est consulté, l'ordinateur décide
  function appeler(j, m, allie, ennemi, defensif, appels) {
    const E = j.etat;
    if (m === ennemi || PM.enGuerre(j, m, ennemi) || !nat(j, m).vivante) return;
    if (PM.lies(j, m, ennemi)) { PM.journal(j, `${nat(j, m).nom} reste à l’écart : lié à ${nat(j, allie).nom} comme à ${nat(j, ennemi).nom}.`, 'alliance', [m, allie, ennemi]); return; }
    const w = PM.guerre(j, allie, ennemi); if (w) { w.appels = w.appels || []; if (w.appels.includes(m)) return; w.appels.push(m); }
    if (appels) appels.push(m);
    if (!nat(j, m).ia) { if (!E.attente.some(a => a.type === 'appel' && a.allie === allie && a.ennemi === ennemi)) E.attente.push({ type: 'appel', nation: m, allie, ennemi, defensif: !!defensif }); return; }
    if (PM.repondraitAppel(j, m, allie, ennemi, defensif)) { changerParole(j, m, 2); PM.declarerGuerre(j, m, ennemi, `${defensif ? 'pour défendre' : 'aux côtés de'} son allié ${nat(j, allie).nom}`, allie); }
    else refuserAppel(j, m, allie, ennemi, defensif);
  }
  function refuserAppel(j, m, allie, ennemi, defensif) {
    const p = PM.pactes(j).filter(x => x.membres.includes(m) && x.membres.includes(allie) && T(x.type).rang >= (defensif ? 2 : 3)).sort((x, y) => T(y.type).rang - T(x.type).rang)[0];
    changerParole(j, m, -20); PM.changerRelation(j, m, allie, -25);
    PM.journal(j, `${nat(j, m).nom} refuse l’appel aux armes de ${nat(j, allie).nom} contre ${nat(j, ennemi).nom}${p ? ` et quitte « ${p.nom} »` : ''}.`, 'alliance', [m, allie, ennemi]);
    if (p) { PM.quitterPacte(j, m, p.id, true); if (p.membres.length < 2) PM.journal(j, `« ${p.nom} » est dissous.`, 'alliance', [m, allie]); }
  }
  // après une déclaration de guerre de a contre b : les défenseurs de b et les alliés totaux de a sont appelés
  PM.appelsDeGuerre = function (j, a, b) {
    const appels = [], fait = new Set([a, b]);
    for (const p of PM.pactesDe(j, b)) if (T(p.type).rang >= 2) for (const m of p.membres) if (!fait.has(m)) { fait.add(m); appeler(j, m, b, a, true, appels); }
    for (const p of PM.pactesDe(j, a)) if (p.type === 'totale') for (const m of p.membres) if (!fait.has(m)) { fait.add(m); appeler(j, m, a, b, false, appels); }
    return appels;
  };
  // appel lancé à la main (joueur, décret, ordinateur qui perd sa guerre)
  PM.appelerAuxArmes = function (j, n, m, ennemi) {
    const w = PM.guerre(j, n, ennemi); if (!w) return refus(`Tu n’es pas en guerre contre ${nat(j, ennemi) ? nat(j, ennemi).nom : 'ce peuple'}.`);
    if (PM.enGuerre(j, m, ennemi)) return refus(`${nat(j, m).nom} combat déjà ${nat(j, ennemi).nom}.`);
    const defensif = w.b === n || (w.pour != null && w.a === n && PM.guerre(j, w.pour, ennemi) && PM.guerre(j, w.pour, ennemi).b === w.pour);
    const rang = PM.rangEntre(j, n, m);
    if (rang < 2) return refus(`${nat(j, m).nom} n’est pas ton allié.`);
    if (!defensif && rang < 3) return refus(`C’est toi qui as attaqué : seule une alliance totale oblige ${nat(j, m).nom} à te suivre.`);
    if ((w.appels || []).includes(m)) return refus(`${nat(j, m).nom} a déjà été appelé dans cette guerre.`);
    const avant = PM.enGuerre(j, m, ennemi);
    appeler(j, m, n, ennemi, defensif);
    if (!nat(j, m).ia) return { ok: true, message: `Appel envoyé à ${nat(j, m).nom}.` };
    return PM.enGuerre(j, m, ennemi) && !avant ? { ok: true, message: `${nat(j, m).nom} entre en guerre à tes côtés !` } : refus(`${nat(j, m).nom} refuse de se battre et quitte l’alliance.`);
  };
  PM.repondreAppel = function (j, accepter) {
    const E = j.etat, k = E.attente.findIndex(a => a.type === 'appel'); if (k < 0) return refus('Aucun appel.');
    const a = E.attente.splice(k, 1)[0];
    if (!PM.enGuerre(j, a.allie, a.ennemi) || !nat(j, a.ennemi).vivante) return { ok: true, message: 'Cette guerre est déjà finie.' };
    if (accepter) { changerParole(j, a.nation, 3); return PM.declarerGuerre(j, a.nation, a.ennemi, `${a.defensif ? 'pour défendre' : 'aux côtés de'} son allié ${nat(j, a.allie).nom}`, a.allie); }
    refuserAppel(j, a.nation, a.allie, a.ennemi, a.defensif);
    return { ok: true, message: 'Tu refuses l’appel : ta parole baisse et tu quittes l’alliance.' };
  };

  // ---------- paix commune : les alliés entrés en guerre pour un camp signent avec lui ----------
  PM.campsDePaix = function (j, a, b) {
    const E = j.etat, campA = new Set([a]), campB = new Set([b]);
    for (const w of E.guerres) { if (w.pour === a) campA.add(w.a); if (w.pour === b) campB.add(w.a); }
    const liees = E.guerres.filter(w => ((campA.has(w.a) && campB.has(w.b)) || (campB.has(w.a) && campA.has(w.b))) && (w.pour === a || w.pour === b || (w.a === a && w.b === b) || (w.a === b && w.b === a)));
    return { campA, campB, liees };
  };

  // ---------- soutien entre alliés ----------
  PM.demanderSoutien = function (j, n, m) {
    const E = j.etat, M = nat(j, m), k = Math.min(n, m) + '-' + Math.max(n, m);
    if (PM.rangEntre(j, n, m) < 2) return refus(`${M.nom} n’est pas ton allié.`);
    E.soutiens = E.soutiens || {};
    if (E.soutiens[k] > E.mois - 12) return refus(`${M.nom} t’a déjà aidé cette année.`);
    E.soutiens[k] = E.mois;
    if (M.ia && (PM.relation(j, m, n) < 25 || M.res.or < 150)) { PM.changerRelation(j, n, m, -3); return refus(`${M.nom} ne peut rien t’envoyer pour l’instant.`); }
    const or = Math.round(Math.min(350, M.res.or * 0.25)); M.res.or -= or; nat(j, n).res.or += or; PM.changerRelation(j, n, m, -4);
    PM.journal(j, `${M.nom} envoie ${or} or à son allié ${nat(j, n).nom}.`, 'alliance', [n, m]);
    return { ok: true, message: `${M.nom} t’envoie ${or} 🪙.` };
  };

  // ---------- chaque mois : la parole se regagne lentement, les pactes resserrent les liens ----------
  PM.alliancesMois = function (j) {
    const E = j.etat;
    if (E.mois % 12 === 0) for (const N of vivantes(j)) if (PM.parole(j, N.id) < 70) changerParole(j, N.id, 2);
    for (const p of PM.pactes(j).slice()) if (p.fin && p.fin <= E.mois) { E.pactes = PM.pactes(j).filter(x => x !== p); PM.journal(j, `« ${p.nom} » arrive à son terme.`, 'alliance', p.membres.slice()); }
    if (E.mois % 3 === 0) for (const p of PM.pactes(j)) for (const a of p.membres) for (const b of p.membres) if (a < b) PM.changerRelation(j, a, b, T(p.type).rang * 0.35);
  };
})(typeof window !== 'undefined' ? window : globalThis);
