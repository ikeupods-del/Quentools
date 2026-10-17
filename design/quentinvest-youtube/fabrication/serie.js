// Pico — séries d'épisodes « calcul » générées sans rédaction : on donne des chiffres, le programme écrit la fiche complète
// (accroche, explications, calculs affichés à l'écran, piège, résumé, sources = calculs de la chaîne, texte court pour TikTok).
// Aucun fait extérieur : tout est calculé (formules en source) et annoncé comme hypothèse. Les fiches produites se fabriquent avec lot.js / episode.js.
//
//   node serie.js --liste                              types disponibles et valeurs par défaut
//   node serie.js interets --capital 2000 --taux 4 --annees 20
//   node serie.js inflation --capital 5000 --taux 3 --annees 15 [--interet 2.5]
//   node serie.js frais --capital 10000 --rendement 5 --frais 1.5 --annees 25
//   node serie.js credit --montant 10000 --taux 4 --annees 5
//   node serie.js epargne --mensuel 100 --taux 4 --annees 20
//   node serie.js --plan 10                            10 épisodes variés d'un coup (types et chiffres qui tournent, numéros à la suite)
'use strict';
const fs = require('fs'), path = require('path');
const FICHES = path.join(__dirname, '..', 'fiches');

const fmt = (x, d = 0) => (+x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, ' ');
const eur = x => fmt(Math.round(x)) + ' €', pct = x => fmt(x, Number.isInteger(+x) ? 0 : 1) + ' %';
const eur2 = x => fmt(x, 2) + ' €';
const sup = s => String(s).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const QUESTIONS = ["Et toi, quel sujet d'argent aimerais-tu comprendre ensuite ?", 'Et toi, tu avais déjà fait ce calcul ?', "Et toi, quel chiffre t'a le plus surpris ?", "Et toi, quelle question d'argent te trotte dans la tête ?"];
const R = (t, e) => e;

// ---------- les types : chaque fonction reçoit les chiffres et renvoie le fond de la fiche ----------
const TYPES = {
  interets: {
    defaut: { capital: 1000, taux: 5, annees: 30 },
    fiche: ({ capital: c, taux: t, annees: n }) => {
      const simple = c * (1 + t / 100 * n), comp = c * (1 + t / 100) ** n, an = c * t / 100, gS = Math.round(t * n), gC = Math.round((comp / c - 1) * 100), regle = 72 / t, exact = Math.log(2) / Math.log(1 + t / 100), k = fmt(1 + t / 100, t % 1 ? 3 : 2);
      const blocs = [
        { section: 'Les intérêts simples', texte: `Commençons par le plus simple. Les intérêts simples : chaque année, tu touches un pourcentage de la somme de départ, toujours la même. ${pct(t)} de ${eur(c)}, ça fait ${eur(an)} par an.`, court: `Intérêts simples : ${eur(an)} par an. Au bout de ${n} ans, ${eur(simple)}.`,
          ecran: { type: 'calcul', lignes: [`${pct(t)} de ${eur(c)} = ${eur(an)} par an`, `${eur(an)} × ${n} ans = ${eur(an * n)}`], resultat: `${eur(c)} + ${eur(an * n)} = ${eur(simple)}`, source: `Calcul (hypothèse : ${pct(t)} par an)` } },
        { section: 'Les intérêts composés', texte: "Maintenant, les intérêts composés. Chaque année, les intérêts s'ajoutent à la somme. L'année suivante, tu touches des intérêts sur les intérêts. C'est l'effet boule de neige.", court: 'Intérêts composés : les intérêts rapportent eux-mêmes des intérêts. Une boule de neige.', ecran: { type: 'definition', mot: 'Intérêts composés', texte: 'Des intérêts qui rapportent eux-mêmes des intérêts' } },
        { revelation: true, effet: 'hausse', effetT: 5.0, texte: `Regarde la différence. Avec les intérêts simples, la somme monte en ligne droite. Avec les intérêts composés, la courbe s'envole : au bout de ${n} ans, environ ${eur(comp)}, contre ${eur(simple)}.`, court: `${n} ans plus tard : ${eur(simple)} en simple, ${eur(comp)} en composé.`,
          ecran: { type: 'croissance', capital: c, taux: t, annees: n, etiquetteSimple: `≈ ${eur(simple)} (simples)`, etiquetteCompose: `≈ ${eur(comp)} (composés)`, source: `Calcul : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)} (hypothèse : ${pct(t)} par an)` } },
        { texte: `Autrement dit : un gain de ${gS} pour cent en simple, et ${gC} pour cent en composé. Même taux, même durée. Seul le mécanisme change.`, ecran: { type: 'comparaison', titre: `Gain sur ${n} ans, à ${pct(t)} par an (hypothèse)`, a: ['Intérêts simples', gS], b: ['Intérêts composés', gC] } }
      ];
      if (t >= 2 && t <= 12) blocs.push({ section: 'Le temps compte', texte: `Le secret, c'est le temps. Une règle pratique : divise 72 par le taux. À ${pct(t)}, 72 divisé par ${fmt(t)}, ça fait environ ${fmt(regle, 1)} ans pour doubler.`, court: `Règle des 72 : divise 72 par le taux. À ${pct(t)}, ton argent double en environ ${fmt(regle, 1)} ans.`,
        ecran: { type: 'calcul', lignes: [`72 ÷ ${pct(t)} ≈ ${fmt(regle, 1)}`], resultat: `≈ ${fmt(Math.round(regle))} ans pour doubler`, source: `Règle des 72 (approximation) : le calcul exact donne ${fmt(exact, 1)} ans` } });
      blocs.push({ texte: 'Trois choses font grossir la boule de neige : le temps, le taux, et la régularité. Le temps est le plus puissant, parce qu\'il ne se rattrape pas.', ecran: { type: 'liste', titre: 'Ce qui fait grossir la boule de neige', points: [['Le temps', 'le plus puissant'], ['Le taux', 'plus il est haut, plus ça va vite'], ['La régularité', 'laisser les intérêts s\'ajouter']] } });
      return {
        titre: `${eur(c)} sur ${n} ans : la boule de neige des intérêts composés`, promesse: `${eur(c)} pendant ${n} ans à ${pct(t)} par an (hypothèse) : combien ça fait ?`,
        description: `Pico explique les intérêts composés : pourquoi ${eur(c)} peuvent devenir ${eur(comp)} en ${n} ans à ${pct(t)} par an (hypothèse), la règle des 72 et les pièges à éviter.`, hashtags: '#intérêtscomposés #épargne #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(c)} qui grossissent pendant ${n} ans : combien ça fait ? Tout dépend d'un petit mot.`, court: `${eur(c)} pendant ${n} ans : combien ça fait ? Tout dépend d'un petit mot.`,
          ecran: { intro: `${eur(c)} pendant ${n} ans, à ${pct(t)} par an (hypothèse)`, avant: eur(c), apres: `≈ ${eur(comp)}`, de: c, a: Math.round(comp), suffixe: ' €', legende: 'Sans rien ajouter.', source: `Calcul : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)}` } },
        blocs,
        piege: { court: `Attention, grain de sable : ${pct(t)} n'est pas garanti, et l'inflation grignote le résultat.`, erreurs: [
          { titre: `${pct(t)} n'est pas garanti`, texte: `Un : croire que ces ${pct(t)} existent toujours. C'est une hypothèse pour comprendre. Un vrai taux change, et certains placements peuvent faire perdre de l'argent.` },
          { titre: "L'inflation grignote le résultat", texte: `Deux : oublier l'inflation. ${eur(comp)} dans ${n} ans n'achèteront pas autant qu'aujourd'hui.` }] },
        resume: { texte: 'En une phrase : avec les intérêts composés, le temps travaille pour toi, à condition de ne pas oublier que les taux ne sont pas garantis.', court: 'En une phrase : avec les intérêts composés, le temps travaille pour toi, sans garantie.' },
        sources: ['S1 · Formule des intérêts composés : capital × (1 + taux)^années (calcul de la chaîne)', `S2 · Calculs, hypothèse de ${pct(t)} par an : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)} ; ${eur(c)} + ${eur(an)} × ${n} = ${eur(simple)}`, ...(t >= 2 && t <= 12 ? [`S3 · Règle des 72 : approximation (calcul exact : ${fmt(exact, 1)} ans à ${pct(t)})`] : [])],
        miniature: { lignes: ['BOULE', 'DE NEIGE', "D'ARGENT ?"], accent: 'NEIGE', bas: [eur(c), `→ ${eur(comp)}`] }
      };
    }
  },

  inflation: {
    defaut: { capital: 1000, taux: 2, annees: 10, interet: 3 },
    fiche: ({ capital: c, taux: t, annees: n, interet: i }) => {
      const f = (1 + t / 100) ** n, pa = c / f, reel = ((1 + i / 100) / (1 + t / 100) - 1) * 100, signe = reel > 0 ? 'progresse' : reel < 0 ? 'baisse' : 'ne bouge pas', k = fmt(1 + t / 100, t % 1 ? 3 : 2), ki = fmt(1 + i / 100, i % 1 ? 3 : 2);
      return {
        titre: `${eur(c)} dans un tiroir pendant ${n} ans : que reste-t-il ?`, promesse: `${eur(c)} dans un tiroir pendant ${n} ans (hypothèse : ${pct(t)} d'inflation par an) : que reste-t-il ?`,
        description: `Pico explique ce que l'inflation fait à l'argent qui dort : avec ${pct(t)} d'inflation par an (hypothèse), ${eur(c)} n'achètent plus que ${eur(pa)} au bout de ${n} ans. Le pouvoir d'achat, le rendement réel et les pièges.`, hashtags: '#inflation #pouvoirdachat #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(c)} dans un tiroir pendant ${n} ans : combien te reste-t-il vraiment ?`, court: `${eur(c)} dans un tiroir pendant ${n} ans : combien te reste-t-il vraiment ?`,
          ecran: { intro: `${eur(c)} dans un tiroir pendant ${n} ans (hypothèse : ${pct(t)} d'inflation par an)`, avant: eur(c), apres: `≈ ${eur(pa)}`, de: c, a: Math.round(pa), suffixe: ' €', legende: "Tu n'as rien dépensé.", source: `Calcul : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)}` }, effet: 'baisse' },
        blocs: [
          { section: "Le pouvoir d'achat", texte: "Un mot important : le pouvoir d'achat. C'est ce que tu peux acheter avec ton argent. Si les prix montent, la même somme en achète moins.", court: "Le piège : le pouvoir d'achat. Pas ton solde, mais ce que tu peux acheter.", ecran: { type: 'definition', mot: "Pouvoir d'achat", texte: "Ce que tu peux acheter avec une somme d'argent" } },
          { section: "L'exemple", texte: `Imaginons ${eur(c)} qui ne rapportent rien, et des prix qui montent de ${pct(t)} par an. C'est une hypothèse pour comprendre, pas une prévision.`, ecran: { type: 'message', titre: 'Hypothèse', sous: `${eur(c)} sans intérêts · prix en hausse de ${pct(t)} par an` } },
          { revelation: true, effet: 'baisse', effetT: 6.0, texte: `Sur le compte, la somme ne bouge pas. Mais chaque année, elle achète un peu moins. Au bout de ${n} ans, c'est comme s'il ne te restait que ${eur(pa)} environ.`, court: `${n} ans plus tard, ${eur(c)} sur le compte n'achètent plus que ${eur(pa)}.`,
            ecran: { type: 'courbe', capital: c, taux: t, annees: n, etiquetteAffichee: `${eur(c)} sur le compte`, etiquetteReelle: `≈ ${eur(pa)} de pouvoir d'achat`, source: `Hypothèse : ${pct(t)} d'inflation par an` } },
          { texte: `Le calcul : les prix sont multipliés par ${fmt(f, 3)} en ${n} ans, donc ton argent achète ${fmt(f, 3)} fois moins. Tu divises.`, ecran: { type: 'calcul', lignes: [`Prix après ${n} ans : × ${fmt(f, 3)}`, `Ton argent achète : ÷ ${fmt(f, 3)}`], resultat: `${eur(c)} → ≈ ${eur(pa)}`, source: `Calcul : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)}` } },
          { section: 'Les intérêts', texte: `Et les intérêts ? Si ton argent rapporte ${pct(i)} par an et que les prix montent de ${pct(t)}, ton pouvoir d'achat ${signe} d'environ ${fmt(Math.abs(reel), 1)} pour cent par an.`, court: `Un compte à ${pct(i)}, face à ${pct(t)} d'inflation : environ ${fmt(reel, 1)} pour cent de gain réel.`,
            ecran: { type: 'taux', gain: { nom: 'Intérêts', valeur: pct(i) }, inflation: { nom: 'Inflation', valeur: pct(t) }, reel: { nom: reel >= 0 ? 'Gain réel' : 'Perte réelle', valeur: `≈ ${fmt(reel, 1)} %` }, legende: 'Exemple chiffré, pas un taux réel du marché', source: `Hypothèse : ${ki} ÷ ${k} ≈ ${fmt(1 + reel / 100, 3)}` } }
        ],
        piege: { court: "Attention, grain de sable : un solde qui ne baisse pas ne veut pas dire que tu n'as rien perdu.", erreurs: [
          { titre: 'Solde stable, rien perdu ?', texte: "Un : penser que si le solde n'a pas baissé, on n'a rien perdu. Le chiffre est le même, mais ce qu'il permet d'acheter peut avoir baissé." },
          { titre: 'Placer, ce n\'est pas gagner', texte: "Deux : croire qu'il suffit de placer son argent pour gagner. Tout placement a des risques, et aucun n'est magique." }] },
        resume: { texte: "En une phrase : l'inflation réduit ce que ton argent peut acheter, même quand le chiffre sur ton compte ne bouge pas.", court: 'En une phrase : le chiffre sur ton compte ne dit pas ce que tu peux acheter.' },
        sources: [`S1 · Calcul de la chaîne : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)} (hypothèse : ${pct(t)} d'inflation par an)`, `S2 · Exemple chiffré (hypothèse) : ${ki} ÷ ${k} ≈ ${fmt(1 + reel / 100, 3)}`],
        miniature: { lignes: ['TON ARGENT', 'PERD SA', 'VALEUR ?'], accent: 'VALEUR', bas: [eur(c), `→ ${eur(pa)}`] }
      };
    }
  },

  frais: {
    defaut: { capital: 10000, rendement: 5, frais: 1.5, annees: 25 },
    fiche: ({ capital: c, rendement: r, frais: f, annees: n }) => {
      const brut = c * (1 + r / 100) ** n, net = c * (1 + (r - f) / 100) ** n, cout = brut - net, part = Math.round(cout / (brut - c) * 100);
      return {
        titre: `${pct(f)} de frais par an : combien ça coûte sur ${n} ans ?`, promesse: `${pct(f)} de frais par an sur ${n} ans (hypothèse : ${pct(r)} avant frais) : combien ça coûte ?`,
        description: `Pico explique l'effet des frais annuels : avec ${pct(f)} de frais par an (hypothèse), ${eur(c)} deviennent ${eur(net)} au lieu de ${eur(brut)} en ${n} ans. Où chercher les frais et les pièges.`, hashtags: '#frais #épargne #économie #apprendre #QuentInvest',
        accroche: { texte: `${pct(f)} de frais par an, ça paraît peu. Mais sur ${n} ans, combien ça coûte vraiment ?`, court: `${pct(f)} de frais par an, ça paraît peu. Sur ${n} ans, combien ça coûte ?`,
          ecran: { intro: `${eur(c)} pendant ${n} ans, ${pct(r)} par an avant frais (hypothèse)`, avant: eur(brut), apres: `≈ ${eur(net)}`, de: Math.round(brut), a: Math.round(net), suffixe: ' €', legende: `Avec ${pct(f)} de frais par an.`, source: `Calcul : ${eur(c)} × ${fmt(1 + (r - f) / 100, 3)}${sup(n)} ≈ ${eur(net)}` }, effet: 'baisse' },
        blocs: [
          { section: 'Les frais annuels', texte: "Les frais annuels, c'est un pourcentage prélevé chaque année sur ton capital, que ça monte ou que ça baisse. Ils s'appliquent sur toute la somme, pas seulement sur les gains.", court: 'Frais annuels : un pourcentage prélevé chaque année sur ton capital.', ecran: { type: 'definition', mot: 'Frais annuels', texte: 'Un pourcentage prélevé chaque année sur ton capital' } },
          { section: 'Le calcul', texte: `Prenons ${eur(c)} qui rapportent ${pct(r)} par an. Sans frais, au bout de ${n} ans : environ ${eur(brut)}. Avec ${pct(f)} de frais, le rendement tombe à ${pct(r - f)} : environ ${eur(net)}.`, ecran: { type: 'calcul', lignes: [`Sans frais : ${pct(r)} par an`, `Avec frais : ${pct(r - f)} par an`], resultat: `${eur(brut)} → ${eur(net)}`, source: `Calcul : ${eur(c)} × ${fmt(1 + r / 100, 3)}${sup(n)} et × ${fmt(1 + (r - f) / 100, 3)}${sup(n)}` } },
          { revelation: true, effet: 'baisse', effetT: 2.5, texte: `Résultat : ${eur(cout)} de moins, soit ${part} pour cent des gains avalés par les frais.`, court: `${n} ans plus tard : ${eur(brut)} sans frais, ${eur(net)} avec ${pct(f)} de frais.`,
            ecran: { type: 'duo', a: { valeur: eur(brut), legende: 'Sans frais' }, b: { valeur: `≈ ${eur(net)}`, de: Math.round(brut), a: Math.round(net), prefixe: '≈ ', suffixe: ' €', legende: `Avec ${pct(f)} de frais par an` }, source: `Écart : ${eur(cout)}` } },
          { texte: "Trois sortes de frais à repérer : les frais courants, chaque année ; les frais d'entrée ou de sortie ; et les frais de transaction. Ils sont détaillés dans les documents d'information du produit.", ecran: { type: 'liste', titre: 'Où chercher les frais', points: [['Frais courants', 'prélevés chaque année'], ["Frais d'entrée ou de sortie", 'à l\'achat ou à la vente'], ['Frais de transaction', 'à chaque opération']] } }
        ],
        piege: { court: "Attention, grain de sable : un petit pourcentage répété chaque année pèse lourd, et le moins cher n'est pas toujours le meilleur.", erreurs: [
          { titre: 'Un petit pourcentage, ça ne change rien ?', texte: "Un : penser qu'un petit pourcentage ne change rien. Chaque année, il s'applique sur toute la somme : l'effet s'accumule." },
          { titre: 'Choisir sur les frais seulement', texte: "Deux : choisir uniquement sur les frais. Un produit moins cher n'est pas forcément meilleur : les frais ne sont qu'un élément à comparer." }] },
        resume: { texte: 'En une phrase : un petit pourcentage de frais, répété chaque année, peut avaler une grande part des gains.', court: 'En une phrase : un petit pourcentage de frais, chaque année, peut avaler une grande part des gains.' },
        sources: [`S1 · Calculs de la chaîne (hypothèses : ${pct(r)} par an avant frais, ${pct(f)} de frais par an) : ${eur(c)} × ${fmt(1 + r / 100, 3)}${sup(n)} ≈ ${eur(brut)} ; ${eur(c)} × ${fmt(1 + (r - f) / 100, 3)}${sup(n)} ≈ ${eur(net)}`],
        miniature: { lignes: ['LES FRAIS', 'COÛTENT', 'CHER ?'], accent: 'CHER', bas: [eur(brut), `→ ${eur(net)}`] }
      };
    }
  },

  credit: {
    defaut: { montant: 10000, taux: 4, annees: 5 },
    fiche: ({ montant: P, taux: t, annees: n }) => {
      const i = t / 1200, N = n * 12, M = i ? P * i / (1 - (1 + i) ** -N) : P / N, total = M * N, ints = total - P;
      return {
        mention: 'Exemple pédagogique · pas une offre de crédit · pas un conseil', titre: `Un crédit de ${eur(P)} coûte combien en tout ?`, promesse: `Un crédit de ${eur(P)} sur ${n} ans à ${pct(t)} (exemple) : combien ça coûte en tout ?`,
        description: `Pico explique le coût d'un crédit : ${eur(P)} empruntés sur ${n} ans à ${pct(t)} (exemple) font environ ${eur(total)} à rembourser. La mensualité, le coût des intérêts et les pièges. Exemple pédagogique, pas une offre de crédit.`, hashtags: '#crédit #taux #économie #apprendre #QuentInvest',
        accroche: { texte: `Emprunter ${eur(P)}, ça coûte combien en tout ? Pas seulement ${eur(P)}.`, court: `Emprunter ${eur(P)}, ça coûte combien en tout ? Pas seulement ${eur(P)}.`,
          ecran: { intro: `${eur(P)} empruntés sur ${n} ans, à ${pct(t)} par an (exemple)`, avant: eur(P), apres: `≈ ${eur(total)}`, de: P, a: Math.round(total), suffixe: ' €', legende: 'À rembourser en tout.', source: `Calcul : mensualité ≈ ${eur2(M)} × ${N} mois` }, effet: 'impact' },
        blocs: [
          { section: 'Le taux', texte: "Le taux, c'est le prix de l'argent emprunté : un pourcentage que tu paies à la banque en plus de la somme prêtée.", court: "Le taux, c'est le prix de l'argent emprunté.", ecran: { type: 'definition', mot: "Taux d'intérêt", texte: "Le prix de l'argent emprunté" } },
          { section: 'Le calcul', texte: `Pour ${eur(P)} sur ${n} ans à ${pct(t)}, la mensualité est d'environ ${eur2(M)}. Sur ${N} mois, ça fait ${eur(total)} en tout.`, court: `Mensualité d'environ ${eur2(M)}, pendant ${N} mois : ${eur(total)} en tout.`,
            ecran: { type: 'calcul', lignes: [`Mensualité ≈ ${eur2(M)}`, `${eur2(M)} × ${N} mois ≈ ${eur(total)}`], resultat: `${eur(total)} − ${eur(P)} = ${eur(ints)}`, source: `Calcul : mensualité constante, taux mensuel = ${pct(t)} ÷ 12` } },
          { revelation: true, effet: 'impact', effetT: 2.5, texte: `Au final, tu rembourses environ ${eur(total)} : ${eur(ints)} de plus que la somme empruntée. C'est le coût du crédit.`, court: `Au final : ${eur(total)} remboursés, soit ${eur(ints)} de plus que la somme empruntée.`,
            ecran: { type: 'duo', a: { valeur: eur(P), legende: 'Ce que tu empruntes' }, b: { valeur: `≈ ${eur(total)}`, de: P, a: Math.round(total), prefixe: '≈ ', suffixe: ' €', legende: 'Ce que tu rembourses en tout' }, source: `Intérêts : ${eur(ints)}` } },
          { texte: 'Trois leviers pour payer moins : une durée plus courte, un taux plus bas, ou emprunter moins. Mais une durée plus courte augmente la mensualité.', ecran: { type: 'liste', titre: 'Ce qui fait baisser le coût', points: [['Une durée plus courte', 'moins d\'intérêts, mensualité plus haute'], ['Un taux plus bas', 'se compare avec le TAEG'], ['Emprunter moins', 'un apport plus grand']] } }
        ],
        piege: { court: "Attention, grain de sable : une petite mensualité peut cacher un crédit très long, donc très cher.", erreurs: [
          { titre: 'Ne regarder que la mensualité', texte: 'Un : ne regarder que la mensualité. Une mensualité basse peut cacher une durée longue, donc plus d\'intérêts payés.' },
          { titre: 'Oublier le TAEG', texte: 'Deux : oublier les frais annexes. Le TAEG regroupe le taux et la plupart des frais : c\'est lui qu\'on compare.' }] },
        resume: { texte: 'En une phrase : un crédit coûte la somme empruntée plus les intérêts, et la durée pèse autant que le taux.', court: 'En une phrase : un crédit coûte la somme empruntée plus les intérêts, et la durée compte autant que le taux.' },
        sources: [`S1 · Formule de la mensualité constante : capital × i ÷ (1 − (1 + i)^−n), i = taux mensuel (calcul de la chaîne)`, `S2 · Calculs, exemple de ${eur(P)} à ${pct(t)} sur ${n} ans : mensualité ≈ ${eur2(M)} ; total ≈ ${eur(total)} ; intérêts ≈ ${eur(ints)}`],
        miniature: { lignes: ['UN CRÉDIT', 'COÛTE', 'COMBIEN ?'], accent: 'COMBIEN', bas: [eur(P), `→ ${eur(total)}`] }
      };
    }
  },

  epargne: {
    defaut: { mensuel: 100, taux: 4, annees: 20 },
    fiche: ({ mensuel: m, taux: t, annees: n }) => {
      const im = (1 + t / 100) ** (1 / 12) - 1, vf = nn => im ? m * ((1 + im) ** (nn * 12) - 1) / im : m * nn * 12, N = n * 12, verse = m * N, FV = vf(n), gains = FV - verse, FV2 = n >= 15 ? vf(n - 10) : 0;
      const blocs = [
        { section: 'Ce que tu verses', texte: `D'abord ce que tu verses : ${eur(m)} fois ${N} mois, ça fait ${eur(verse)}. C'est ton effort.`, court: `Tu verses ${eur(m)} par mois : ${eur(verse)} au bout de ${n} ans.`, ecran: { type: 'calcul', lignes: [`${eur(m)} × 12 mois = ${eur(m * 12)} par an`, `${eur(m * 12)} × ${n} ans = ${eur(verse)}`], resultat: `${eur(verse)} versés`, source: `Calcul : ${eur(m)} × ${N} mois` } },
        { section: "L'épargne régulière", texte: "L'épargne régulière, c'est mettre la même somme de côté chaque mois. Chaque versement commence à rapporter des intérêts dès qu'il arrive.", court: "Épargne régulière : la même somme de côté chaque mois, qui rapporte dès qu'elle arrive.", ecran: { type: 'definition', mot: 'Épargne régulière', texte: 'La même somme de côté chaque mois' } },
        { revelation: true, effet: 'hausse', effetT: 2.5, texte: `Avec ${pct(t)} par an, tu obtiens environ ${eur(FV)} : ${eur(gains)} viennent des intérêts, pas de ta poche.`, court: `${n} ans plus tard : ${eur(verse)} versés, environ ${eur(FV)} au total.`,
          ecran: { type: 'duo', a: { valeur: eur(verse), legende: 'Ce que tu as versé' }, b: { valeur: `≈ ${eur(FV)}`, de: Math.round(verse), a: Math.round(FV), prefixe: '≈ ', suffixe: ' €', legende: `Ce que tu as à la fin (hypothèse : ${pct(t)})` }, source: `Intérêts : ≈ ${eur(gains)}` } }
      ];
      if (FV2) blocs.push({ section: 'Commencer tôt', texte: `Et si tu attends ? Avec la même somme chaque mois, mais ${n - 10} ans au lieu de ${n}, tu obtiens environ ${eur(FV2)} au lieu de ${eur(FV)}.`, court: `Si tu attends 10 ans de plus : environ ${eur(FV2)} au lieu de ${eur(FV)}.`,
        ecran: { type: 'duo', a: { valeur: `≈ ${eur(FV2)}`, legende: `Si tu commences ${10} ans plus tard` }, b: { valeur: `≈ ${eur(FV)}`, de: Math.round(FV2), a: Math.round(FV), prefixe: '≈ ', suffixe: ' €', legende: 'Si tu commences maintenant' }, source: `Même somme mensuelle, ${n - 10} ans au lieu de ${n}` } });
      blocs.push({ texte: "Trois choses comptent : la régularité, la durée, et de commencer tôt. Même un petit montant compte, parce que le temps fait une grande partie du travail.", ecran: { type: 'liste', titre: "Ce qui compte pour l'épargne régulière", points: [['La régularité', 'même somme, chaque mois'], ['La durée', 'le temps fait grossir les intérêts'], ['Commencer tôt', 'un petit montant compte']] } });
      return {
        titre: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`, promesse: `${eur(m)} par mois pendant ${n} ans à ${pct(t)} par an (hypothèse) : combien ça fait ?`,
        description: `Pico explique l'épargne régulière : ${eur(m)} par mois pendant ${n} ans à ${pct(t)} par an (hypothèse) donnent environ ${eur(FV)}, dont ${eur(verse)} versés. L'effet du temps et les pièges.`, hashtags: '#épargne #intérêtscomposés #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`, court: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`,
          ecran: { intro: `${eur(m)} par mois pendant ${n} ans, à ${pct(t)} par an (hypothèse)`, avant: eur(verse), apres: `≈ ${eur(FV)}`, de: Math.round(verse), a: Math.round(FV), suffixe: ' €', legende: 'Versés → obtenus.', source: `Calcul : ${eur(m)} × ${N} mois, intérêts composés` }, effet: 'hausse' },
        blocs,
        piege: { court: `Attention, grain de sable : ${pct(t)} n'est pas garanti, et l'inflation grignote le résultat.`, erreurs: [
          { titre: `${pct(t)} n'est pas garanti`, texte: `Un : croire que ces ${pct(t)} sont garantis. C'est une hypothèse : un vrai rendement varie, et certains placements peuvent faire perdre de l'argent.` },
          { titre: "L'inflation grignote le résultat", texte: `Deux : oublier l'inflation. ${eur(FV)} dans ${n} ans n'achèteront pas autant qu'aujourd'hui.` }] },
        resume: { texte: "En une phrase : verser régulièrement, c'est laisser le temps travailler, sans garantie de résultat.", court: 'En une phrase : verser régulièrement, c\'est laisser le temps travailler, sans garantie.' },
        sources: ['S1 · Formule de l\'épargne régulière : versement × ((1 + i)^n − 1) ÷ i, i = taux mensuel équivalent (calcul de la chaîne)', `S2 · Calculs, hypothèse de ${pct(t)} par an : ${eur(m)} par mois pendant ${n} ans ≈ ${eur(FV)} dont ${eur(verse)} versés`],
        miniature: { lignes: [`${fmt(m)} €`, 'PAR MOIS,', 'COMBIEN ?'], accent: 'COMBIEN', bas: [eur(verse), `→ ${eur(FV)}`] }
      };
    }
  }
};

// ---------- plan : des chiffres qui tournent pour varier les épisodes ----------
const PLAN = [
  ['credit', { montant: 10000, taux: 4, annees: 5 }], ['epargne', { mensuel: 100, taux: 4, annees: 20 }], ['frais', { capital: 10000, rendement: 5, frais: 1.5, annees: 25 }],
  ['interets', { capital: 2000, taux: 4, annees: 20 }], ['inflation', { capital: 5000, taux: 3, annees: 15, interet: 2.5 }], ['credit', { montant: 200000, taux: 3.5, annees: 25 }],
  ['epargne', { mensuel: 50, taux: 3, annees: 30 }], ['frais', { capital: 20000, rendement: 6, frais: 2, annees: 20 }], ['interets', { capital: 500, taux: 6, annees: 40 }],
  ['inflation', { capital: 800, taux: 4, annees: 10, interet: 3 }], ['epargne', { mensuel: 200, taux: 5, annees: 15 }], ['credit', { montant: 3000, taux: 6, annees: 3 }],
  ['frais', { capital: 5000, rendement: 4, frais: 1, annees: 30 }], ['interets', { capital: 1500, taux: 5, annees: 15 }], ['inflation', { capital: 2000, taux: 2, annees: 20, interet: 1 }]
];

function construire(type, params, numero, suivant) {
  const T = TYPES[type]; if (!T) throw new Error('Type inconnu : ' + type + ' (types : ' + Object.keys(TYPES).join(', ') + ')');
  const p = { ...T.defaut, ...params }, f = T.fiche(p), NUM = String(numero).padStart(2, '0');
  const motsMax = f.blocs.concat(f.piege.erreurs.map(e => e)).map(b => (b.texte || '').split(/\s+/).length);
  if (Math.max(...motsMax) > 45) throw new Error('Un bloc dépasse 45 mots : ' + type);
  return { numero, slug: slug(`${type}-${Object.values(p).join('-')}`), ...f, musique: 'documentaire-doux', musiqueRevelation: 'corporate-lumineux', question: QUESTIONS[numero % QUESTIONS.length],
    suite: { titre: suivant || "Un nouveau sujet d'économie", texte: suivant ? `La prochaine fois : ${suivant.charAt(0).toLowerCase() + suivant.slice(1)}` : 'La prochaine fois : un nouveau sujet.' }, sourcesExternes: false };
}
const prochainNumero = () => Math.max(2, ...fs.readdirSync(FICHES).map(n => (n.match(/^(\d+)-/) || [])[1]).filter(Boolean).map(Number)) + 1;
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
function ecrire(f) { const fichier = path.join(FICHES, `${String(f.numero).padStart(2, '0')}-${f.slug}.json`); fs.writeFileSync(fichier, JSON.stringify(f, null, 1) + '\n'); return fichier; }

module.exports = { construire, TYPES, PLAN };

if (require.main === module) {
  const a = process.argv[2];
  if (!a || a === '--liste') { for (const [k, v] of Object.entries(TYPES)) console.log(`${k.padEnd(10)} ${JSON.stringify(v.defaut)}`); console.log('\nUsage : node serie.js <type> --capital 2000 --taux 4 --annees 20 | node serie.js --plan N'); process.exit(0); }
  if (a === '--plan') {
    const N = +arg('plan', 5), existants = fs.readdirSync(FICHES).join(' '), sorties = [];
    const choix = []; for (const [type, params] of PLAN) { const p = { ...TYPES[type].defaut, ...params }, s = slug(`${type}-${Object.values(p).join('-')}`); if (!existants.includes(s)) choix.push([type, params]); if (choix.length === N) break; }
    let n = prochainNumero(); const titres = choix.map(([type, params]) => TYPES[type].fiche({ ...TYPES[type].defaut, ...params }).titre);
    choix.forEach(([type, params], k) => sorties.push(ecrire(construire(type, params, n + k, titres[k + 1]))));
    console.log(`${sorties.length} fiche(s) écrite(s) :\n` + sorties.map(s => '  ' + path.basename(s)).join('\n') + (sorties.length < N ? `\n(le plan prévu est épuisé : ${PLAN.length} épisodes ; ajoute des lignes à PLAN dans serie.js ou lance un type avec tes chiffres)` : ''));
  } else {
    const params = {}; for (const k of ['capital', 'taux', 'annees', 'interet', 'rendement', 'frais', 'montant', 'mensuel']) if (arg(k) != null) params[k] = +arg(k).replace(',', '.');
    console.log(ecrire(construire(a, params, +arg('numero', prochainNumero()), arg('suite'))));
  }
}
