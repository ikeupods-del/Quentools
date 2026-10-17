// Pico — séries d'épisodes « calcul » générées sans rédaction : on donne des chiffres, le programme écrit la fiche complète
// (accroche, programme, explications, tableaux de scénarios, duel Léa et Tom, question-quiz, pièges, à retenir, résumé, sources = calculs de la chaîne,
// texte court pour TikTok). Une vidéo YouTube dure au moins 5 minutes (le programme refuse une fiche trop courte).
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
const { compose, estimer } = require('./composer');
const FICHES = path.join(__dirname, '..', 'fiches'), DUREE_VISEE = 325; // secondes estimées au minimum (marge sur les 5 minutes exigées)

const fmt = (x, d = 0) => (+x).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, ' ');
const eur = x => fmt(Math.round(x)) + ' €', eur2 = x => fmt(x, 2) + ' €', pct = x => fmt(x, Number.isInteger(+x) ? 0 : 1) + ' %';
const sup = s => String(s).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uniq = a => [...new Set(a)].sort((x, y) => x - y);
const an = y => `${y} an${y > 1 ? 's' : ''}`;
const QUESTIONS = ["Et toi, quel sujet d'argent aimerais-tu comprendre ensuite ?", 'Et toi, tu avais déjà fait ce calcul ?', "Et toi, quel chiffre t'a le plus surpris ?", "Et toi, quelle question d'argent te trotte dans la tête ?"];
const INFL = 2; // inflation d'exemple utilisée pour « en euros d'aujourd'hui » (hypothèse, annoncée comme telle)

// ---------- briques communes ----------
const tableau = (titre, colonnes, lignes, surligne) => ({ type: 'tableau', titre, colonnes, lignes, surligne });
const liste = (titre, points) => ({ type: 'liste', titre, points });
const duo = (a, b) => ({ type: 'duo', a, b });
const compt = (valeur, de, a, legende) => ({ valeur: `≈ ${eur(valeur)}`, de: Math.round(de), a: Math.round(a), prefixe: '≈ ', suffixe: ' €', legende });
const question = (q, texteReponse, ecranReponse, section = 'Petite question') => [
  { section, texte: `Petite question pour toi. ${q} Mets la vidéo en pause si tu veux réfléchir.`, ecran: { type: 'message', titre: 'Petite question', sous: q } },
  { texte: texteReponse, ecran: ecranReponse }];
const piege3 = (intro, erreurs, court) => ({ intro, court, erreurs });

// ---------- les types : chaque fonction reçoit les chiffres et renvoie le fond de la fiche ----------
const TYPES = {
  interets: {
    defaut: { capital: 1000, taux: 5, annees: 30 },
    fiche: ({ capital: c, taux: t, annees: n }) => {
      const S = (r, y) => c * (1 + r / 100 * y), C = (r, y) => c * (1 + r / 100) ** y, simple = S(t, n), comp = C(t, n), an1 = c * t / 100, gS = Math.round(t * n), gC = Math.round((comp / c - 1) * 100), regle = 72 / t, exact = Math.log(2) / Math.log(1 + t / 100), k = fmt(1 + t / 100, t % 1 ? 3 : 2);
      const w = n >= 15 ? 10 : 5, compTom = C(t, n - w), taux3 = uniq([Math.max(1, t - 2), t, t + 2]), durees = uniq([Math.max(5, n - 10), n, n + 10]), annees = uniq([1, 5, 10, 20, n].filter(y => y <= n)), reel = comp / (1 + INFL / 100) ** n;
      const blocs = [
        { section: 'Les intérêts simples', texte: `Commençons par le plus simple. Les intérêts simples : chaque année, tu touches un pourcentage de la somme de départ, toujours la même. ${pct(t)} de ${eur(c)}, ça fait ${eur(an1)} par an.`, court: `Intérêts simples : ${eur(an1)} par an. Au bout de ${n} ans, ${eur(simple)}.`,
          ecran: { type: 'calcul', lignes: [`${pct(t)} de ${eur(c)} = ${eur(an1)} par an`, `${eur(an1)} × ${n} ans = ${eur(an1 * n)}`], resultat: `${eur(c)} + ${eur(an1 * n)} = ${eur(simple)}`, source: `Calcul (hypothèse : ${pct(t)} par an)` } },
        { section: 'Les intérêts composés', texte: "Maintenant, les intérêts composés. Chaque année, les intérêts s'ajoutent à la somme. L'année suivante, tu touches des intérêts sur les intérêts. C'est l'effet boule de neige.", court: 'Intérêts composés : les intérêts rapportent eux-mêmes des intérêts. Une boule de neige.', ecran: { type: 'definition', mot: 'Intérêts composés', texte: 'Des intérêts qui rapportent eux-mêmes des intérêts' } },
        { revelation: true, effet: 'hausse', effetT: 5.0, texte: `Regarde la différence. Avec les intérêts simples, la somme monte en ligne droite. Avec les intérêts composés, la courbe s'envole : au bout de ${n} ans, environ ${eur(comp)}, contre ${eur(simple)}.`, court: `${n} ans plus tard : ${eur(simple)} en simple, ${eur(comp)} en composé.`,
          ecran: { type: 'croissance', capital: c, taux: t, annees: n, etiquetteSimple: `≈ ${eur(simple)} (simples)`, etiquetteCompose: `≈ ${eur(comp)} (composés)`, source: `Calcul : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)} (hypothèse : ${pct(t)} par an)` } },
        { texte: `Autrement dit : un gain de ${gS} pour cent en simple, et ${gC} pour cent en composé. Même taux, même durée. Seul le mécanisme change.`, ecran: { type: 'comparaison', titre: `Gain sur ${n} ans, à ${pct(t)} par an (hypothèse)`, a: ['Intérêts simples', gS], b: ['Intérêts composés', gC] } },
        { section: 'Année par année', texte: `Regardons année par année. Au début, la différence est minuscule : après un an, c'est pareil. Après ${n} ans, ${eur(comp - simple)} d'écart. La boule de neige a besoin de temps pour grossir.`, court: undefined,
          ecran: tableau(`À ${pct(t)} par an (hypothèse)`, ['Année', 'Simples', 'Composés'], annees.map(y => [an(y), eur(S(t, y)), eur(C(t, y))]), annees.length - 1) },
        { section: 'Et si ça change ?', texte: `Et si le taux change ? À ${pct(taux3[0])}, tu obtiens ${eur(C(taux3[0], n))}. À ${pct(t)}, ${eur(comp)}. À ${pct(taux3[taux3.length - 1])}, ${eur(C(taux3[taux3.length - 1], n))}. Quelques points d'écart par an, et le résultat change beaucoup.`,
          ecran: tableau(`Après ${n} ans (hypothèses)`, ['Taux', 'Somme finale'], taux3.map(r => [pct(r), eur(C(r, n))]), taux3.indexOf(t)) },
        { texte: `Et si la durée change ? ${an(durees[0])} : ${eur(C(t, durees[0]))}. ${an(n)} : ${eur(comp)}. ${an(durees[durees.length - 1])} : ${eur(C(t, durees[durees.length - 1]))}. Chaque année de plus pèse davantage que la précédente.`,
          ecran: tableau(`À ${pct(t)} par an (hypothèse)`, ['Durée', 'Somme finale'], durees.map(y => [an(y), eur(C(t, y))]), durees.indexOf(n)) },
        { section: 'Léa et Tom', texte: `Léa place ${eur(c)} aujourd'hui. Tom attend ${w} ans, puis place la même somme, au même taux. Au bout de ${n} ans pour Léa, Tom n'a eu que ${n - w} ans : ${eur(compTom)} contre ${eur(comp)}.`, court: `Léa place ${eur(c)} maintenant, Tom attend ${w} ans : ${eur(compTom)} contre ${eur(comp)}.`,
          ecran: duo({ valeur: eur(compTom), legende: `Tom, après ${n - w} ans` }, compt(comp, compTom, comp, `Léa, après ${n} ans`)) }
      ];
      if (t >= 2 && t <= 12) blocs.splice(5, 0, { section: 'Le temps compte', texte: `Le secret, c'est le temps. Une règle pratique : divise 72 par le taux. À ${pct(t)}, 72 divisé par ${fmt(t)}, ça fait environ ${fmt(regle, 1)} ans pour doubler.`, court: `Règle des 72 : divise 72 par le taux. À ${pct(t)}, ton argent double en environ ${fmt(regle, 1)} ans.`,
        ecran: { type: 'calcul', lignes: [`72 ÷ ${pct(t)} ≈ ${fmt(regle, 1)}`], resultat: `≈ ${fmt(Math.round(regle))} ans pour doubler`, source: `Règle des 72 (approximation) : le calcul exact donne ${fmt(exact, 1)} ans` } });
      blocs.push(
        { section: 'Calcule-le toi-même', texte: `Pour calculer toi-même, c'est simple : tu multiplies la somme par ${k}, autant de fois que d'années. Sur une calculatrice, tape ${k}, la touche puissance, ${n}, puis multiplie par ${eur(c)}.`, ecran: { type: 'calcul', lignes: [`${eur(c)} × ${k}${sup(n)}`], resultat: `≈ ${eur(comp)}`, source: `Calcul : ${k}${sup(n)} ≈ ${fmt(comp / c, 3)}` } },
        { texte: `Sur les ${eur(comp - c)} d'intérêts gagnés au total, ${eur(comp - simple)} viennent uniquement des intérêts sur les intérêts. C'est exactement ce que les intérêts simples n'ont pas.`, ecran: { type: 'calcul', lignes: [`Intérêts composés : ${eur(comp - c)}`, `Intérêts simples : ${eur(simple - c)}`], resultat: `Écart : ${eur(comp - simple)}`, source: 'Calcul de la chaîne' } },
        { section: "Et l'inflation ?", texte: `Et en vrai ? Avec ${pct(INFL)} d'inflation par an, en hypothèse, ${eur(comp)} dans ${n} ans valent environ ${eur(reel)} d'aujourd'hui. Il faut toujours regarder le résultat en pouvoir d'achat.`, ecran: duo({ valeur: eur(comp), legende: 'Le chiffre sur le compte' }, compt(reel, comp, reel, "Ce qu'il achète, en euros d'aujourd'hui")) },
        ...question(`Au bout de ${n} ans, par combien ta somme est-elle multipliée avec les intérêts composés ?`, `Réponse : par ${fmt(comp / c, 1)}. ${eur(c)} deviennent ${eur(comp)}. Avec les intérêts simples, elle serait seulement multipliée par ${fmt(simple / c, 1)}.`, { type: 'calcul', lignes: [`Simples : × ${fmt(simple / c, 1)}`, `Composés : × ${fmt(comp / c, 1)}`], resultat: `${eur(c)} → ${eur(comp)}`, source: `Calcul : ${eur(comp)} ÷ ${eur(c)}` }),
        { section: 'Avant de te lancer', texte: "Avant de te lancer dans un projet d'épargne, trois questions à te poser : pour quand ai-je besoin de cet argent ? Quel est le taux, et est-il garanti ? Et quels sont les frais ? Les réponses changent tout.", ecran: liste('Trois questions à se poser', [['Pour quand ?', 'la durée change tout'], ['Quel taux ?', 'garanti ou non ?'], ['Quels frais ?', "ils s'appliquent chaque année"]]) });
      return {
        titre: `${eur(c)} sur ${n} ans : la boule de neige des intérêts composés`, promesse: `${eur(c)} pendant ${n} ans à ${pct(t)} par an (hypothèse) : combien ça fait ?`,
        description: `Pico explique les intérêts composés : pourquoi ${eur(c)} peuvent devenir ${eur(comp)} en ${n} ans à ${pct(t)} par an (hypothèse), ce qui change avec le taux et la durée, le duel de Léa et Tom, et les pièges à éviter.`, hashtags: '#intérêtscomposés #épargne #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(c)} qui grossissent pendant ${n} ans : combien ça fait ? Tout dépend d'un petit mot.`, court: `${eur(c)} pendant ${n} ans : combien ça fait ? Tout dépend d'un petit mot.`,
          ecran: { intro: `${eur(c)} pendant ${n} ans, à ${pct(t)} par an (hypothèse)`, avant: eur(c), apres: `≈ ${eur(comp)}`, de: c, a: Math.round(comp), suffixe: ' €', legende: 'Sans rien ajouter.', source: `Calcul : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)}` } },
        intro: { texte: 'Au programme : la différence entre intérêts simples et composés, ce qui change quand le taux ou la durée change, un duel entre Léa et Tom, et les pièges à éviter.', ecran: liste('Au programme', ['Intérêts simples ou composés ?', 'Et si le taux ou la durée change ?', 'Léa contre Tom', 'Les pièges à éviter']) },
        blocs,
        piege: piege3(`Attention, grain de sable. Il y a trois erreurs courantes.`, [
          { titre: `${pct(t)} n'est pas garanti`, texte: `Un : croire que ces ${pct(t)} existent toujours. C'est une hypothèse pour comprendre. Un vrai taux change, et certains placements peuvent faire perdre de l'argent.` },
          { titre: "L'inflation grignote le résultat", texte: `Deux : oublier l'inflation. ${eur(comp)} dans ${n} ans n'achèteront pas autant qu'aujourd'hui.` },
          { titre: 'Attendre le bon moment', texte: `Trois : attendre le moment parfait pour commencer. Dans l'exemple de Léa et Tom, ${w} ans d'attente coûtent ${eur(comp - compTom)}. Le temps passé ne se rattrape pas.` }],
          `Attention, grain de sable : ${pct(t)} n'est pas garanti, et l'inflation grignote le résultat.`),
        recap: { texte: "Pour résumer en trois points. Un : les intérêts composés rapportent des intérêts sur les intérêts. Deux : le temps compte plus que le montant. Trois : un taux n'est jamais garanti, et il faut penser à l'inflation.", ecran: liste('À retenir', [['Intérêts sur les intérêts', "l'effet boule de neige"], ['Le temps compte', 'plus que le montant'], ['Pas garanti', "et l'inflation compte"]]) },
        resume: { texte: 'En une phrase : avec les intérêts composés, le temps travaille pour toi, à condition de ne pas oublier que les taux ne sont pas garantis.', court: 'En une phrase : avec les intérêts composés, le temps travaille pour toi, sans garantie.' },
        sources: ['S1 · Formule des intérêts composés : capital × (1 + taux)^années (calcul de la chaîne)', `S2 · Calculs, hypothèse de ${pct(t)} par an : ${eur(c)} × ${k}${sup(n)} ≈ ${eur(comp)} ; ${eur(c)} + ${eur(an1)} × ${n} = ${eur(simple)}`, ...(t >= 2 && t <= 12 ? [`S3 · Règle des 72 : approximation (calcul exact : ${fmt(exact, 1)} ans à ${pct(t)})`] : [])],
        miniature: { lignes: ['BOULE', 'DE NEIGE', "D'ARGENT ?"], accent: 'NEIGE', bas: [eur(c), `→ ${eur(comp)}`] }
      };
    }
  },

  inflation: {
    defaut: { capital: 1000, taux: 2, annees: 10, interet: 3 },
    fiche: ({ capital: c, taux: t, annees: n, interet: i }) => {
      const P = (r, y) => c / (1 + r / 100) ** y, f = (1 + t / 100) ** n, pa = P(t, n), reel = ((1 + i / 100) / (1 + t / 100) - 1) * 100, signe = reel > 0 ? 'progresse' : reel < 0 ? 'baisse' : 'ne bouge pas', k = fmt(1 + t / 100, t % 1 ? 3 : 2), ki = fmt(1 + i / 100, i % 1 ? 3 : 2);
      const annees = uniq([1, 5, 10, n].filter(y => y <= n)), t3 = uniq([Math.max(1, t - 1), t, t + 2]), d3 = uniq([Math.max(5, Math.round(n / 2)), n, n * 2]), tom = c * ((1 + i / 100) / (1 + t / 100)) ** n, moitie = Math.log(2) / Math.log(1 + t / 100), salaire = 2000;
      return {
        titre: `${eur(c)} dans un tiroir pendant ${n} ans : que reste-t-il ?`, promesse: `${eur(c)} dans un tiroir pendant ${n} ans (hypothèse : ${pct(t)} d'inflation par an) : que reste-t-il ?`,
        description: `Pico explique ce que l'inflation fait à l'argent qui dort : avec ${pct(t)} d'inflation par an (hypothèse), ${eur(c)} n'achètent plus que ${eur(pa)} au bout de ${n} ans. Le pouvoir d'achat, le rendement réel, le duel de Léa et Tom et les pièges.`, hashtags: '#inflation #pouvoirdachat #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(c)} dans un tiroir pendant ${n} ans : combien te reste-t-il vraiment ?`, court: `${eur(c)} dans un tiroir pendant ${n} ans : combien te reste-t-il vraiment ?`,
          ecran: { intro: `${eur(c)} dans un tiroir pendant ${n} ans (hypothèse : ${pct(t)} d'inflation par an)`, avant: eur(c), apres: `≈ ${eur(pa)}`, de: c, a: Math.round(pa), suffixe: ' €', legende: "Tu n'as rien dépensé.", source: `Calcul : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)}` }, effet: 'baisse' },
        intro: { texte: "Au programme : le pouvoir d'achat, ce qui se passe année après année, un duel entre Léa et Tom, et les pièges à éviter.", ecran: liste('Au programme', ["Le pouvoir d'achat", 'Année après année', 'Léa contre Tom', 'Les pièges à éviter']) },
        blocs: [
          { section: "Le pouvoir d'achat", texte: "Un mot important : le pouvoir d'achat. C'est ce que tu peux acheter avec ton argent. Si les prix montent, la même somme en achète moins.", court: "Le piège : le pouvoir d'achat. Pas ton solde, mais ce que tu peux acheter.", ecran: { type: 'definition', mot: "Pouvoir d'achat", texte: "Ce que tu peux acheter avec une somme d'argent" } },
          { section: "L'exemple", texte: `Imaginons ${eur(c)} qui ne rapportent rien, et des prix qui montent de ${pct(t)} par an. C'est une hypothèse pour comprendre, pas une prévision.`, ecran: { type: 'message', titre: 'Hypothèse', sous: `${eur(c)} sans intérêts · prix en hausse de ${pct(t)} par an` } },
          { revelation: true, effet: 'baisse', effetT: 6.0, texte: `Sur le compte, la somme ne bouge pas. Mais chaque année, elle achète un peu moins. Au bout de ${n} ans, c'est comme s'il ne te restait que ${eur(pa)} environ.`, court: `${n} ans plus tard, ${eur(c)} sur le compte n'achètent plus que ${eur(pa)}.`,
            ecran: { type: 'courbe', capital: c, taux: t, annees: n, etiquetteAffichee: `${eur(c)} sur le compte`, etiquetteReelle: `≈ ${eur(pa)} de pouvoir d'achat`, source: `Hypothèse : ${pct(t)} d'inflation par an` } },
          { texte: `Le calcul : les prix sont multipliés par ${fmt(f, 3)} en ${n} ans, donc ton argent achète ${fmt(f, 3)} fois moins. Tu divises.`, ecran: { type: 'calcul', lignes: [`Prix après ${n} ans : × ${fmt(f, 3)}`, `Ton argent achète : ÷ ${fmt(f, 3)}`], resultat: `${eur(c)} → ≈ ${eur(pa)}`, source: `Calcul : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)}` } },
          { section: 'Année par année', texte: `Année par année : au bout d'un an, la perte semble minuscule. Mais elle s'accumule. Après ${n} ans, les prix sont multipliés par ${fmt(f, 2)}, et tes ${eur(c)} n'achètent plus que ${eur(pa)}.`,
            ecran: tableau(`Prix en hausse de ${pct(t)} par an (hypothèse)`, ['Année', 'Prix', "Pouvoir d'achat"], annees.map(y => [an(y), `× ${fmt((1 + t / 100) ** y, 2)}`, eur(P(t, y))]), annees.length - 1) },
          { section: 'Et si ça change ?', texte: `Et si l'inflation est différente ? À ${pct(t3[0])}, il reste ${eur(P(t3[0], n))}. À ${pct(t)}, ${eur(pa)}. À ${pct(t3[t3.length - 1])}, seulement ${eur(P(t3[t3.length - 1], n))}. Un petit écart par an, et la différence se creuse avec le temps.`,
            ecran: tableau(`Après ${n} ans, ${eur(c)} sans intérêts`, ['Inflation', "Pouvoir d'achat"], t3.map(r => [pct(r), eur(P(r, n))]), t3.indexOf(t)) },
          { texte: `Et si l'argent dort plus longtemps ? Après ${d3[0]} ans : ${eur(P(t, d3[0]))}. Après ${n} ans : ${eur(pa)}. Après ${d3[d3.length - 1]} ans : ${eur(P(t, d3[d3.length - 1]))}. Le temps joue contre l'argent qui ne rapporte rien.`,
            ecran: tableau(`À ${pct(t)} d'inflation par an (hypothèse)`, ['Durée', "Pouvoir d'achat"], d3.map(y => [an(y), eur(P(t, y))]), d3.indexOf(n)) },
          { section: 'Le panier de courses', texte: `Prenons un panier de courses à 100 euros aujourd'hui. Avec ${pct(t)} d'inflation par an, il coûtera environ ${eur(100 * f)} dans ${n} ans. Ton argent, lui, n'a pas bougé : il achète moins de paniers.`, court: undefined,
            ecran: duo({ valeur: '100 €', legende: "Le panier aujourd'hui" }, compt(100 * f, 100, 100 * f, `Le même panier dans ${n} ans`)) },
          { section: 'Ton salaire', texte: `Et ton salaire ? Imaginons ${eur(salaire)} par mois, qui ne montent jamais. Après ${n} ans de hausse des prix, c'est comme si tu touchais ${eur(salaire / f)} d'aujourd'hui. On compare toujours une hausse à l'inflation.`,
            ecran: duo({ valeur: eur(salaire), legende: 'Ton salaire, qui ne bouge pas' }, compt(salaire / f, salaire, salaire / f, `En pouvoir d'achat, après ${n} ans`)) },
          { section: 'Léa et Tom', texte: `Léa laisse ${eur(c)} sur un compte qui ne rapporte rien. Tom place la même somme à ${pct(i)} par an, en hypothèse. Après ${n} ans, avec ${pct(t)} d'inflation, Léa garde ${eur(pa)} de pouvoir d'achat, et Tom ${eur(tom)}.`, court: `Léa laisse dormir ${eur(c)}, Tom les place à ${pct(i)} : ${eur(pa)} contre ${eur(tom)} de pouvoir d'achat.`,
            ecran: duo({ valeur: eur(pa), legende: `Léa, sans intérêts` }, compt(tom, pa, tom, `Tom, à ${pct(i)} par an`)) },
          { texte: `Pour garder tout son pouvoir d'achat après ${n} ans, il faudrait ${eur(c * f)} sur le compte. C'est la somme à atteindre juste pour ne rien perdre, avant même de gagner quoi que ce soit.`, ecran: duo({ valeur: eur(c), legende: "Ce que tu as aujourd'hui" }, compt(c * f, c, c * f, `Pour avoir le même pouvoir d'achat dans ${n} ans`)) },
          { section: 'Les intérêts', texte: `Et les intérêts ? Si ton argent rapporte ${pct(i)} par an et que les prix montent de ${pct(t)}, ton pouvoir d'achat ${signe} d'environ ${fmt(Math.abs(reel), 1)} pour cent par an.`, court: `Un compte à ${pct(i)}, face à ${pct(t)} d'inflation : environ ${fmt(reel, 1)} pour cent de gain réel.`,
            ecran: { type: 'taux', gain: { nom: 'Intérêts', valeur: pct(i) }, inflation: { nom: 'Inflation', valeur: pct(t) }, reel: { nom: reel >= 0 ? 'Gain réel' : 'Perte réelle', valeur: `≈ ${fmt(reel, 1)} %` }, legende: 'Exemple chiffré, pas un taux réel du marché', source: `Hypothèse : ${ki} ÷ ${k} ≈ ${fmt(1 + reel / 100, 3)}` } },
          ...question(`Avec ${pct(t)} d'inflation par an, au bout de combien d'années ton argent perd-il la moitié de son pouvoir d'achat ?`, `Réponse : environ ${fmt(moitie, 0)} ans. Une règle rapide : 72 divisé par ${fmt(t)} donne ${fmt(72 / t, 1)}. Ça paraît long, mais les années passent vite.`, { type: 'calcul', lignes: [`72 ÷ ${fmt(t)} ≈ ${fmt(72 / t, 1)} ans`], resultat: `≈ ${fmt(moitie, 0)} ans pour perdre la moitié`, source: `Calcul exact : ln 2 ÷ ln ${k} ≈ ${fmt(moitie, 1)} ans` }),
          { section: 'Avant de te lancer', texte: "Trois questions à te poser sur ton argent : combien me faut-il pour les imprévus ? À quoi servira le reste, et dans combien de temps ? Et que rapporte-t-il ? Ce sont de bonnes questions avant toute décision.", ecran: liste('Trois questions à se poser', [['Les imprévus', 'combien garder de côté ?'], ['Le projet', 'à quoi, et pour quand ?'], ['Le rendement', "et face à l'inflation ?"]]) }
        ],
        piege: piege3('Attention, grain de sable. Il y a trois erreurs courantes.', [
          { titre: 'Solde stable, rien perdu ?', texte: "Un : penser que si le solde n'a pas baissé, on n'a rien perdu. Le chiffre est le même, mais ce qu'il permet d'acheter peut avoir baissé." },
          { titre: "Placer, ce n'est pas gagner", texte: "Deux : croire qu'il suffit de placer son argent pour gagner. Tout placement a des risques, et aucun n'est magique." },
          { titre: 'Chacun son inflation', texte: "Trois : croire que l'inflation touche tout le monde de la même façon. Le loyer, la nourriture ou l'énergie ne montent pas au même rythme : chacun a sa propre inflation." }],
          "Attention, grain de sable : un solde qui ne baisse pas ne veut pas dire que tu n'as rien perdu."),
        recap: { texte: "Pour résumer en trois points. Un : l'inflation réduit ce que ton argent achète. Deux : le temps amplifie l'effet. Trois : ce qui compte, c'est le rendement réel, les intérêts moins l'inflation.", ecran: liste('À retenir', [["Le pouvoir d'achat", "ce que tu peux acheter"], ['Le temps amplifie', "l'effet de l'inflation"], ['Le rendement réel', 'intérêts moins inflation']]) },
        resume: { texte: "En une phrase : l'inflation réduit ce que ton argent peut acheter, même quand le chiffre sur ton compte ne bouge pas.", court: 'En une phrase : le chiffre sur ton compte ne dit pas ce que tu peux acheter.' },
        sources: [`S1 · Calcul de la chaîne : ${eur(c)} ÷ ${k}${sup(n)} ≈ ${eur(pa)} (hypothèse : ${pct(t)} d'inflation par an)`, `S2 · Exemple chiffré (hypothèse) : ${ki} ÷ ${k} ≈ ${fmt(1 + reel / 100, 3)}`],
        miniature: { lignes: ['TON ARGENT', 'PERD SA', 'VALEUR ?'], accent: 'VALEUR', bas: [eur(c), `→ ${eur(pa)}`] }
      };
    }
  },

  frais: {
    defaut: { capital: 10000, rendement: 5, frais: 1.5, annees: 25 },
    fiche: ({ capital: c, rendement: r, frais: f, annees: n }) => {
      const B = y => c * (1 + r / 100) ** y, N = (y, fr = f) => c * (1 + (r - fr) / 100) ** y, brut = B(n), net = N(n), cout = brut - net, part = y => Math.round((B(y) - N(y)) / (B(y) - c) * 100), kr = fmt(1 + r / 100, 3), kn = fmt(1 + (r - f) / 100, 3);
      const niveaux = uniq([0.5, 1, f, f * 2]), annees = uniq([5, 10, 15, n].filter(y => y <= n)), durees = uniq([Math.max(5, Math.round(n / 2)), n, n + 10]), f2 = Math.max(0.2, Math.round(f / 3 * 10) / 10), tom = N(n, f2), cout2 = brut - N(n, f * 2), reel = ((1 + (r - f) / 100) / (1 + INFL / 100) - 1) * 100;
      return {
        titre: `${pct(f)} de frais par an : combien ça coûte sur ${n} ans ?`, promesse: `${pct(f)} de frais par an sur ${n} ans (hypothèse : ${pct(r)} avant frais) : combien ça coûte ?`,
        description: `Pico explique l'effet des frais annuels : avec ${pct(f)} de frais par an (hypothèse), ${eur(c)} deviennent ${eur(net)} au lieu de ${eur(brut)} en ${n} ans. Les niveaux de frais, le duel de Léa et Tom, où chercher les frais et les pièges.`, hashtags: '#frais #épargne #économie #apprendre #QuentInvest',
        accroche: { texte: `${pct(f)} de frais par an, ça paraît peu. Mais sur ${n} ans, combien ça coûte vraiment ?`, court: `${pct(f)} de frais par an, ça paraît peu. Sur ${n} ans, combien ça coûte ?`,
          ecran: { intro: `${eur(c)} pendant ${n} ans, ${pct(r)} par an avant frais (hypothèse)`, avant: eur(brut), apres: `≈ ${eur(net)}`, de: Math.round(brut), a: Math.round(net), suffixe: ' €', legende: `Avec ${pct(f)} de frais par an.`, source: `Calcul : ${eur(c)} × ${kn}${sup(n)} ≈ ${eur(net)}` }, effet: 'baisse' },
        intro: { texte: "Au programme : ce que sont les frais annuels, combien ils coûtent selon leur niveau et la durée, un duel entre Léa et Tom, et les pièges à éviter.", ecran: liste('Au programme', ['Les frais annuels', 'Selon le niveau et la durée', 'Léa contre Tom', 'Les pièges à éviter']) },
        blocs: [
          { section: 'Les frais annuels', texte: "Les frais annuels, c'est un pourcentage prélevé chaque année sur ton capital, que ça monte ou que ça baisse. Ils s'appliquent sur toute la somme, pas seulement sur les gains.", court: 'Frais annuels : un pourcentage prélevé chaque année sur ton capital.', ecran: { type: 'definition', mot: 'Frais annuels', texte: 'Un pourcentage prélevé chaque année sur ton capital' } },
          { section: 'Ça sert à quoi ?', texte: "Les frais ne sont pas toujours un mauvais signe : ils paient la gestion, la conservation, le fonctionnement. La question est de savoir ce qu'on obtient en échange, et de comparer.", ecran: { type: 'message', titre: 'Des frais, pour quoi ?', sous: 'La gestion, la conservation, le fonctionnement : à comparer' } },
          { section: 'Le calcul', texte: `Prenons ${eur(c)} qui rapportent ${pct(r)} par an. Sans frais, au bout de ${n} ans : environ ${eur(brut)}. Avec ${pct(f)} de frais, le rendement tombe à ${pct(r - f)} : environ ${eur(net)}.`, ecran: { type: 'calcul', lignes: [`Sans frais : ${pct(r)} par an`, `Avec frais : ${pct(r - f)} par an`], resultat: `${eur(brut)} → ${eur(net)}`, source: `Calcul : ${eur(c)} × ${kr}${sup(n)} et × ${kn}${sup(n)}` } },
          { texte: `Autrement dit, ton rendement n'est pas ${pct(r)}, c'est ${pct(r)} moins ${pct(f)}, soit ${pct(r - f)}. C'est ce chiffre-là qui compte pour ta somme finale.`, ecran: { type: 'taux', gain: { nom: 'Rendement', valeur: pct(r) }, inflation: { nom: 'Frais', valeur: pct(f) }, reel: { nom: 'Rendement net', valeur: pct(r - f) }, legende: 'Exemple chiffré (hypothèse)', source: `Hypothèse : ${pct(r)} − ${pct(f)} = ${pct(r - f)}` } },
          { revelation: true, effet: 'baisse', effetT: 2.5, texte: `Résultat : ${eur(cout)} de moins, soit ${part(n)} pour cent des gains avalés par les frais.`, court: `${n} ans plus tard : ${eur(brut)} sans frais, ${eur(net)} avec ${pct(f)} de frais.`,
            ecran: { type: 'duo', a: { valeur: eur(brut), legende: 'Sans frais' }, b: { valeur: `≈ ${eur(net)}`, de: Math.round(brut), a: Math.round(net), prefixe: '≈ ', suffixe: ' €', legende: `Avec ${pct(f)} de frais par an` }, source: `Écart : ${eur(cout)}` } },
          { section: 'Première année', texte: `Dès la première année, ${pct(f)} de ${eur(c)}, c'est ${eur(c * f / 100)} qui partent en frais. Et l'année suivante, le calcul se refait sur un capital plus grand.`, ecran: { type: 'calcul', lignes: [`${pct(f)} × ${eur(c)} = ${eur(c * f / 100)}`], resultat: `${eur(c * f / 100)} la première année`, source: 'Calcul de la chaîne' } },
          { section: 'Année par année', texte: `Année par année, l'écart grandit. Au début, il est discret. Après ${n} ans, il atteint ${eur(cout)}. Comme les frais s'appliquent sur un capital qui grossit, l'écart s'accélère.`,
            ecran: tableau(`${eur(c)}, ${pct(r)} par an avant frais (hypothèse)`, ['Année', 'Sans frais', 'Avec frais'], annees.map(y => [an(y), eur(B(y)), eur(N(y))]), annees.length - 1) },
          { section: 'Selon le niveau', texte: `Comparons plusieurs niveaux de frais. À ${pct(niveaux[0])}, il reste ${eur(N(n, niveaux[0]))}. À ${pct(f)}, ${eur(net)}. À ${pct(niveaux[niveaux.length - 1])}, ${eur(N(n, niveaux[niveaux.length - 1]))}. Chaque dixième de point compte, parce qu'il se répète chaque année.`,
            ecran: tableau(`Après ${n} ans (hypothèses)`, ['Frais par an', 'Capital final', 'Perdu'], niveaux.map(x => [pct(x), eur(N(n, x)), eur(brut - N(n, x))]), niveaux.indexOf(f)) },
          { section: 'Selon la durée', texte: `Et selon la durée ? Après ${durees[0]} ans, les frais avalent ${part(durees[0])} pour cent des gains. Après ${n} ans, ${part(n)}. Après ${durees[durees.length - 1]} ans, ${part(durees[durees.length - 1])}. Plus on reste longtemps, plus la part grignotée est grande.`,
            ecran: tableau(`${pct(f)} de frais par an (hypothèse)`, ['Durée', 'Perdu', 'Part des gains'], durees.map(y => [an(y), eur(B(y) - N(y)), `${part(y)} %`]), durees.indexOf(n)) },
          { section: 'Léa et Tom', texte: `Léa choisit un produit à ${pct(f)} de frais par an. Tom en choisit un à ${pct(f2)}, avec le même rendement avant frais. Après ${n} ans : ${eur(net)} pour Léa, ${eur(tom)} pour Tom.`, court: `Léa paie ${pct(f)} de frais, Tom ${pct(f2)} : ${eur(net)} contre ${eur(tom)} après ${n} ans.`,
            ecran: duo({ valeur: eur(net), legende: `Léa, ${pct(f)} de frais` }, compt(tom, net, tom, `Tom, ${pct(f2)} de frais`)) },
          ...question(`Si les frais passent de ${pct(f)} à ${pct(f * 2)}, la perte est-elle deux fois plus grande ?`, `Réponse : elle est ${fmt(cout2 / cout, 1)} fois plus grande. ${eur(cout)} de perte avec ${pct(f)}, ${eur(cout2)} avec ${pct(f * 2)}. L'effet monte plus vite que les frais, à cause du temps.`, { type: 'calcul', lignes: [`À ${pct(f)} : ${eur(cout)} perdus`, `À ${pct(f * 2)} : ${eur(cout2)} perdus`], resultat: `× ${fmt(cout2 / cout, 1)}`, source: 'Calcul de la chaîne (hypothèses)' }),
          { section: "Et l'inflation ?", texte: `N'oublie pas l'inflation. Si les prix montent de ${pct(INFL)} par an, en hypothèse, le rendement net de ${pct(r - f)} ne fait plus que ${fmt(reel, 1)} pour cent en pouvoir d'achat.`, ecran: { type: 'taux', gain: { nom: 'Rendement net', valeur: pct(r - f) }, inflation: { nom: 'Inflation', valeur: pct(INFL) }, reel: { nom: 'En pouvoir d\'achat', valeur: `≈ ${fmt(reel, 1)} %` }, legende: 'Exemple chiffré (hypothèse)', source: `Hypothèse : ${fmt(1 + (r - f) / 100, 3)} ÷ ${fmt(1 + INFL / 100, 2)}` } },
          { section: 'Calcule-le toi-même', texte: `Pour calculer toi-même : multiplie ta somme par ${kr}, autant de fois que d'années, puis recommence avec ${kn}. Compare les deux résultats, c'est tout.`, ecran: { type: 'calcul', lignes: [`Sans frais : × ${kr}${sup(n)}`, `Avec frais : × ${kn}${sup(n)}`], resultat: `${eur(brut)} contre ${eur(net)}`, source: `Calcul : ${eur(c)} multiplié` } },
          { section: 'Où chercher', texte: "Trois sortes de frais à repérer : les frais courants, chaque année ; les frais d'entrée ou de sortie ; et les frais de transaction. Ils sont détaillés dans les documents d'information du produit.", ecran: liste('Où chercher les frais', [['Frais courants', 'prélevés chaque année'], ["Frais d'entrée ou de sortie", "à l'achat ou à la vente"], ['Frais de transaction', 'à chaque opération']]) },
          { texte: 'Avant de choisir, trois questions à poser : quels sont les frais courants par an ? Y a-t-il des frais d\'entrée ou de sortie ? Et où sont-ils écrits ? Les réponses doivent être claires.', ecran: liste('Trois questions à poser', [['Les frais par an', 'en pourcentage'], ["Entrée et sortie", 'y en a-t-il ?'], ['Où les lire', 'documents du produit']]) }
        ],
        piege: piege3('Attention, grain de sable. Il y a trois erreurs courantes.', [
          { titre: 'Un petit pourcentage, ça ne change rien ?', texte: "Un : penser qu'un petit pourcentage ne change rien. Chaque année, il s'applique sur toute la somme : l'effet s'accumule." },
          { titre: 'Choisir sur les frais seulement', texte: "Deux : choisir uniquement sur les frais. Un produit moins cher n'est pas forcément meilleur : les frais ne sont qu'un élément à comparer." },
          { titre: 'Frais même quand ça baisse', texte: "Trois : oublier que les frais sont prélevés même quand le rendement est faible ou négatif. Ils s'appliquent quoi qu'il arrive." }],
          "Attention, grain de sable : un petit pourcentage répété chaque année pèse lourd, et le moins cher n'est pas toujours le meilleur."),
        recap: { texte: "Pour résumer en trois points. Un : les frais s'appliquent chaque année sur tout le capital. Deux : leur effet s'accumule avec le temps. Trois : on les compare, sans oublier ce qu'on obtient en échange.", ecran: liste('À retenir', [['Chaque année', 'sur tout le capital'], ["L'effet s'accumule", 'avec le temps'], ['On compare', "et on regarde ce qu'on obtient"]]) },
        resume: { texte: 'En une phrase : un petit pourcentage de frais, répété chaque année, peut avaler une grande part des gains.', court: 'En une phrase : un petit pourcentage de frais, chaque année, peut avaler une grande part des gains.' },
        sources: [`S1 · Calculs de la chaîne (hypothèses : ${pct(r)} par an avant frais, ${pct(f)} de frais par an) : ${eur(c)} × ${kr}${sup(n)} ≈ ${eur(brut)} ; ${eur(c)} × ${kn}${sup(n)} ≈ ${eur(net)}`],
        miniature: { lignes: ['LES FRAIS', 'COÛTENT', 'CHER ?'], accent: 'CHER', bas: [eur(brut), `→ ${eur(net)}`] }
      };
    }
  },

  credit: {
    defaut: { montant: 10000, taux: 4, annees: 5 },
    fiche: ({ montant: P, taux: t, annees: n }) => {
      const pay = (taux, y, mt = P) => { const i = taux / 1200, N = y * 12, M = i ? mt * i / (1 - (1 + i) ** -N) : mt / N; return { M, N, total: M * N, ints: M * N - mt }; };
      const base = pay(t, n), { M, N, total, ints } = base, i1 = t / 1200, durees = uniq([Math.max(1, n - 2), n, n + 2, n + 5]), taux4 = uniq([Math.max(0.5, t - 1), t, t + 1, t + 2]), court = pay(t, Math.max(1, n - 2)), long3 = pay(t, n + 3), plus1 = pay(t + 1, n), moins = pay(t, n, P * 0.8);
      return {
        mention: 'Exemple pédagogique · pas une offre de crédit · pas un conseil', titre: `Un crédit de ${eur(P)} coûte combien en tout ?`, promesse: `Un crédit de ${eur(P)} sur ${n} ans à ${pct(t)} (exemple) : combien ça coûte en tout ?`,
        description: `Pico explique le coût d'un crédit : ${eur(P)} empruntés sur ${n} ans à ${pct(t)} (exemple) font environ ${eur(total)} à rembourser. La mensualité, le coût des intérêts, la durée, le TAEG, le duel de Léa et Tom et les pièges. Exemple pédagogique, pas une offre de crédit.`, hashtags: '#crédit #taux #économie #apprendre #QuentInvest',
        accroche: { texte: `Emprunter ${eur(P)}, ça coûte combien en tout ? Pas seulement ${eur(P)}.`, court: `Emprunter ${eur(P)}, ça coûte combien en tout ? Pas seulement ${eur(P)}.`,
          ecran: { intro: `${eur(P)} empruntés sur ${n} ans, à ${pct(t)} par an (exemple)`, avant: eur(P), apres: `≈ ${eur(total)}`, de: P, a: Math.round(total), suffixe: ' €', legende: 'À rembourser en tout.', source: `Calcul : mensualité ≈ ${eur2(M)} × ${N} mois` }, effet: 'impact' },
        intro: { texte: "Au programme : le taux et la mensualité, le coût total du crédit, ce qui change avec la durée et le taux, un duel entre Léa et Tom, et les pièges à éviter.", ecran: liste('Au programme', ['Taux et mensualité', 'Le coût total', 'Durée et taux', 'Léa contre Tom']) },
        blocs: [
          { section: 'Le taux', texte: "Le taux, c'est le prix de l'argent emprunté : un pourcentage que tu paies à la banque en plus de la somme prêtée.", court: "Le taux, c'est le prix de l'argent emprunté.", ecran: { type: 'definition', mot: "Taux d'intérêt", texte: "Le prix de l'argent emprunté" } },
          { section: 'Le calcul', texte: `Pour ${eur(P)} sur ${n} ans à ${pct(t)}, la mensualité est d'environ ${eur2(M)}. Sur ${N} mois, ça fait ${eur(total)} en tout.`, court: `Mensualité d'environ ${eur2(M)}, pendant ${N} mois : ${eur(total)} en tout.`,
            ecran: { type: 'calcul', lignes: [`Mensualité ≈ ${eur2(M)}`, `${eur2(M)} × ${N} mois ≈ ${eur(total)}`], resultat: `${eur(total)} − ${eur(P)} = ${eur(ints)}`, source: `Calcul : mensualité constante, taux mensuel = ${pct(t)} ÷ 12` } },
          { revelation: true, effet: 'impact', effetT: 2.5, texte: `Au final, tu rembourses environ ${eur(total)} : ${eur(ints)} de plus que la somme empruntée. C'est le coût du crédit.`, court: `Au final : ${eur(total)} remboursés, soit ${eur(ints)} de plus que la somme empruntée.`,
            ecran: { type: 'duo', a: { valeur: eur(P), legende: 'Ce que tu empruntes' }, b: { valeur: `≈ ${eur(total)}`, de: P, a: Math.round(total), prefixe: '≈ ', suffixe: ' €', legende: 'Ce que tu rembourses en tout' }, source: `Intérêts : ${eur(ints)}` } },
          { section: 'Première mensualité', texte: `Dans la première mensualité de ${eur2(M)}, ${eur2(P * i1)} partent en intérêts et ${eur2(M - P * i1)} remboursent le capital. Avec le temps, la part des intérêts diminue et celle du capital augmente.`, ecran: { type: 'calcul', lignes: [`Intérêts du 1er mois : ${eur2(P * i1)}`, `Capital remboursé : ${eur2(M - P * i1)}`], resultat: `Mensualité : ${eur2(M)}`, source: `Calcul : ${eur(P)} × ${pct(t)} ÷ 12` } },
          { texte: `Rapporté à chaque année, les ${eur(ints)} d'intérêts font en moyenne ${eur(ints / n)} par an, soit ${eur2(ints / N)} par mois en plus de la somme prêtée. C'est le prix du temps que la banque t'accorde.`, ecran: { type: 'calcul', lignes: [`${eur(ints)} ÷ ${n} ans = ${eur(ints / n)} par an`, `${eur(ints)} ÷ ${N} mois = ${eur2(ints / N)}`], resultat: `${eur(ints)} au total`, source: 'Calcul de la chaîne' } },
          { section: 'Selon la durée', texte: `Comparons plusieurs durées. Sur ${durees[0]} ans : mensualité ${eur(pay(t, durees[0]).M)}, coût ${eur(pay(t, durees[0]).ints)}. Sur ${n} ans : ${eur(M)} et ${eur(ints)}. Sur ${durees[durees.length - 1]} ans : ${eur(pay(t, durees[durees.length - 1]).M)} et ${eur(pay(t, durees[durees.length - 1]).ints)}. Plus c'est long, la mensualité baisse, le coût monte.`,
            ecran: tableau(`${eur(P)} à ${pct(t)} (exemple)`, ['Durée', 'Mensualité', 'Coût'], durees.map(y => [an(y), eur(pay(t, y).M), eur(pay(t, y).ints)]), durees.indexOf(n)) },
          { section: 'Rembourser plus vite', texte: `Et si tu rembourses plus vite ? En passant de ${n} à ${Math.max(1, n - 2)} ans, tu économises ${eur(ints - court.ints)} d'intérêts. Mais la mensualité passe de ${eur(M)} à ${eur(court.M)}. C'est un équilibre à trouver.`, ecran: duo({ valeur: eur(ints), legende: `Intérêts sur ${an(n)}` }, compt(court.ints, ints, court.ints, `Intérêts sur ${an(Math.max(1, n - 2))}`)) },
          { section: 'Selon le taux', texte: `Et selon le taux ? À ${pct(taux4[0])}, le crédit coûte ${eur(pay(taux4[0], n).ints)}. À ${pct(t)}, ${eur(ints)}. À ${pct(taux4[taux4.length - 1])}, ${eur(pay(taux4[taux4.length - 1], n).ints)}. Un petit écart de taux change beaucoup le coût.`,
            ecran: tableau(`${eur(P)} sur ${n} ans (exemple)`, ['Taux', 'Mensualité', 'Coût'], taux4.map(r => [pct(r), eur(pay(r, n).M), eur(pay(r, n).ints)]), taux4.indexOf(t)) },
          { texte: `Un seul point de taux en plus : à ${pct(t + 1)}, le coût passe de ${eur(ints)} à ${eur(plus1.ints)}, soit ${eur(plus1.ints - ints)} de plus. Un petit écart de taux pèse vraiment sur le coût final.`, ecran: duo({ valeur: eur(ints), legende: `Coût à ${pct(t)}` }, compt(plus1.ints, ints, plus1.ints, `Coût à ${pct(t + 1)}`)) },
          { texte: `Et si tu empruntes moins ? Avec ${eur(P * 0.8)} au lieu de ${eur(P)}, le coût des intérêts passe de ${eur(ints)} à ${eur(moins.ints)}. Le coût suit la somme empruntée : un apport plus grand fait baisser la facture.`, ecran: duo({ valeur: eur(ints), legende: `Intérêts sur ${eur(P)}` }, compt(moins.ints, ints, moins.ints, `Intérêts sur ${eur(P * 0.8)}`)) },
          { section: 'Léa et Tom', texte: `Léa emprunte ${eur(P)} sur ${n} ans : ${eur(M)} par mois. Tom emprunte la même somme sur ${n + 3} ans : ${eur(long3.M)} par mois. Tom paie moins chaque mois, mais au total ${eur(long3.total)} contre ${eur(total)}.`, court: `Léa rembourse sur ${n} ans, Tom sur ${n + 3} : ${eur(total)} contre ${eur(long3.total)} au total.`,
            ecran: duo({ valeur: eur(total), legende: `Léa, sur ${an(n)}` }, compt(long3.total, total, long3.total, `Tom, sur ${an(n + 3)}`)) },
          { section: 'Le TAEG', texte: 'Le TAEG est le taux qui regroupe le taux d\'intérêt et la plupart des frais. Deux offres au même taux peuvent avoir un TAEG différent. C\'est le TAEG qu\'il faut comparer.', ecran: { type: 'definition', mot: 'TAEG', texte: "Le taux d'intérêt, plus la plupart des frais : le chiffre à comparer" } },
          { section: 'Calcule-le toi-même', texte: `Pour calculer toi-même, la plupart des banques et des sites proposent un simulateur. Tu entres la somme, le taux et la durée, et il donne la mensualité, comme ici : environ ${eur2(M)} par mois sur ${N} mois.`, ecran: { type: 'calcul', lignes: [`Taux mensuel = ${pct(t)} ÷ 12 ≈ ${fmt(t / 12, 3)} %`, `${N} mensualités`], resultat: `Mensualité ≈ ${eur2(M)}`, source: 'Formule de la mensualité constante' } },
          ...question(`Les intérêts représentent quelle part de la somme empruntée ?`, `Réponse : ${fmt(ints / P * 100, 1)} pour cent. Pour ${eur(P)} empruntés, ${eur(ints)} d'intérêts. Plus le taux et la durée augmentent, plus ce pourcentage monte.`, { type: 'calcul', lignes: [`${eur(ints)} ÷ ${eur(P)}`], resultat: `≈ ${fmt(ints / P * 100, 1)} % de la somme`, source: 'Calcul de la chaîne' }),
          { section: 'Avant de signer', texte: "Avant de signer, trois questions : quel est le TAEG ? Quelle est la durée ? Et quel est le coût total du crédit ? Ce sont les trois chiffres à demander.", ecran: liste('Trois chiffres à demander', [['Le TAEG', 'taux et frais'], ['La durée', 'en mois'], ['Le coût total', 'ce que tu rembourses en tout']]) }
        ],
        piege: piege3('Attention, grain de sable. Il y a trois erreurs courantes.', [
          { titre: 'Ne regarder que la mensualité', texte: "Un : ne regarder que la mensualité. Une mensualité basse peut cacher une durée longue, donc plus d'intérêts payés." },
          { titre: 'Oublier le TAEG', texte: "Deux : oublier les frais annexes. Le TAEG regroupe le taux et la plupart des frais : c'est lui qu'on compare." },
          { titre: 'Ne pas comparer', texte: "Trois : ne pas comparer plusieurs offres. Deux crédits avec la même mensualité peuvent avoir un coût total très différent." }],
          'Attention, grain de sable : une petite mensualité peut cacher un crédit très long, donc très cher.'),
        recap: { texte: "Pour résumer en trois points. Un : un crédit coûte la somme empruntée plus les intérêts. Deux : la durée pèse autant que le taux. Trois : on compare le TAEG et le coût total, pas seulement la mensualité.", ecran: liste('À retenir', [['Capital plus intérêts', 'le coût total'], ['La durée', 'pèse autant que le taux'], ['TAEG et coût total', 'pas seulement la mensualité']]) },
        resume: { texte: 'En une phrase : un crédit coûte la somme empruntée plus les intérêts, et la durée pèse autant que le taux.', court: 'En une phrase : un crédit coûte la somme empruntée plus les intérêts, et la durée compte autant que le taux.' },
        sources: ['S1 · Formule de la mensualité constante : capital × i ÷ (1 − (1 + i)^−n), i = taux mensuel (calcul de la chaîne)', `S2 · Calculs, exemple de ${eur(P)} à ${pct(t)} sur ${n} ans : mensualité ≈ ${eur2(M)} ; total ≈ ${eur(total)} ; intérêts ≈ ${eur(ints)}`],
        miniature: { lignes: ['UN CRÉDIT', 'COÛTE', 'COMBIEN ?'], accent: 'COMBIEN', bas: [eur(P), `→ ${eur(total)}`] }
      };
    }
  },

  epargne: {
    defaut: { mensuel: 100, taux: 4, annees: 20 },
    fiche: ({ mensuel: m, taux: t, annees: n }) => {
      const im = (1 + t / 100) ** (1 / 12) - 1, VF = (mm, r, y) => { const i = (1 + r / 100) ** (1 / 12) - 1; return i ? mm * ((1 + i) ** (y * 12) - 1) / i : mm * y * 12; }, N = n * 12, verse = m * N, FV = VF(m, t, n), gains = FV - verse, FV2 = n >= 15 ? VF(m, t, n - 10) : 0;
      const durees = uniq([Math.max(5, n - 10), n, n + 10]), montants = uniq([Math.round(m / 2), m, m * 2]), taux3 = uniq([Math.max(1, t - 2), t, t + 2]), annees = uniq([1, 5, 10, n].filter(y => y <= n)), reel = FV / (1 + INFL / 100) ** n, mTom = n >= 15 ? verse / (12 * (n - 10)) : 0, fvTom = n >= 15 ? VF(mTom, t, n - 10) : 0, objectif = 10000, besoin = objectif * im / ((1 + im) ** N - 1);
      const blocs = [
        { section: 'Ce que tu verses', texte: `D'abord ce que tu verses : ${eur(m)} fois ${N} mois, ça fait ${eur(verse)}. C'est ton effort.`, court: `Tu verses ${eur(m)} par mois : ${eur(verse)} au bout de ${n} ans.`, ecran: { type: 'calcul', lignes: [`${eur(m)} × 12 mois = ${eur(m * 12)} par an`, `${eur(m * 12)} × ${n} ans = ${eur(verse)}`], resultat: `${eur(verse)} versés`, source: `Calcul : ${eur(m)} × ${N} mois` } },
        { section: "L'épargne régulière", texte: "L'épargne régulière, c'est mettre la même somme de côté chaque mois. Chaque versement commence à rapporter des intérêts dès qu'il arrive.", court: "Épargne régulière : la même somme de côté chaque mois, qui rapporte dès qu'elle arrive.", ecran: { type: 'definition', mot: 'Épargne régulière', texte: 'La même somme de côté chaque mois' } },
        { texte: "Verser chaque mois, c'est aussi un automatisme : tu ne te demandes pas si c'est le bon moment. Tu répartis ton effort dans le temps, au lieu de tout décider d'un coup.", ecran: { type: 'message', titre: 'Un automatisme', sous: "Verser chaque mois, c'est répartir l'effort dans le temps" } },
        { revelation: true, effet: 'hausse', effetT: 2.5, texte: `Avec ${pct(t)} par an, tu obtiens environ ${eur(FV)} : ${eur(gains)} viennent des intérêts, pas de ta poche.`, court: `${n} ans plus tard : ${eur(verse)} versés, environ ${eur(FV)} au total.`,
          ecran: { type: 'duo', a: { valeur: eur(verse), legende: 'Ce que tu as versé' }, b: { valeur: `≈ ${eur(FV)}`, de: Math.round(verse), a: Math.round(FV), prefixe: '≈ ', suffixe: ' €', legende: `Ce que tu as à la fin (hypothèse : ${pct(t)})` }, source: `Intérêts : ≈ ${eur(gains)}` } },
        { section: 'Année par année', texte: `Année par année : au début, tu ajoutes surtout de ta poche. Plus le temps passe, plus les intérêts pèsent. Après ${n} ans, ils représentent ${fmt(gains / FV * 100, 0)} pour cent du total.`,
          ecran: tableau(`${eur(m)} par mois à ${pct(t)} (hypothèse)`, ['Année', 'Versé', 'Obtenu'], annees.map(y => [an(y), eur(m * 12 * y), eur(VF(m, t, y))]), annees.length - 1) },
        { section: 'Selon la durée', texte: `Et selon la durée ? Sur ${durees[0]} ans, tu obtiens ${eur(VF(m, t, durees[0]))}. Sur ${n} ans, ${eur(FV)}. Sur ${durees[durees.length - 1]} ans, ${eur(VF(m, t, durees[durees.length - 1]))}. Chaque année de plus compte davantage que la précédente.`,
          ecran: tableau(`${eur(m)} par mois à ${pct(t)} (hypothèse)`, ['Durée', 'Versé', 'Obtenu'], durees.map(y => [an(y), eur(m * 12 * y), eur(VF(m, t, y))]), durees.indexOf(n)) },
        { section: 'Selon le montant', texte: `Et selon le montant ? ${eur(montants[0])} par mois donnent ${eur(VF(montants[0], t, n))}. ${eur(m)} donnent ${eur(FV)}. ${eur(montants[montants.length - 1])} donnent ${eur(VF(montants[montants.length - 1], t, n))}. Le résultat suit directement ton effort mensuel.`,
          ecran: tableau(`Sur ${n} ans à ${pct(t)} (hypothèse)`, ['Par mois', 'Versé', 'Obtenu'], montants.map(x => [eur(x), eur(x * N), eur(VF(x, t, n))]), montants.indexOf(m)) },
        { section: 'Selon le taux', texte: `Et selon le taux ? À ${pct(taux3[0])}, tu obtiens ${eur(VF(m, taux3[0], n))}. À ${pct(t)}, ${eur(FV)}. À ${pct(taux3[taux3.length - 1])}, ${eur(VF(m, taux3[taux3.length - 1], n))}. Un taux plus bas ou plus haut change la fin de l'histoire.`,
          ecran: tableau(`${eur(m)} par mois pendant ${n} ans`, ['Taux', 'Obtenu'], taux3.map(r => [pct(r), eur(VF(m, r, n))]), taux3.indexOf(t)) }
      ];
      if (FV2) blocs.push(
        { section: 'Léa et Tom', texte: `Léa commence aujourd'hui. Tom attend 10 ans, mais verse la même somme chaque mois. Léa a ${n} ans devant elle, Tom seulement ${n - 10} : ${eur(FV)} contre ${eur(FV2)}.`, court: `Si tu attends 10 ans de plus : environ ${eur(FV2)} au lieu de ${eur(FV)}.`,
          ecran: duo({ valeur: `≈ ${eur(FV2)}`, legende: 'Tom, qui commence 10 ans plus tard' }, compt(FV, FV2, FV, 'Léa, qui commence maintenant')) },
        { texte: `Imaginons que Tom veuille verser la même somme au total, mais sur ${n - 10} ans. Il devra mettre ${eur(mTom)} par mois, et il obtiendra ${eur(fvTom)} contre ${eur(FV)} pour Léa. Pour compenser, il doit faire un plus gros effort.`, ecran: duo({ valeur: `≈ ${eur(fvTom)}`, legende: `Tom, ${eur(mTom)} par mois pendant ${n - 10} ans` }, compt(FV, fvTom, FV, `Léa, ${eur(m)} par mois pendant ${n} ans`)) });
      blocs.push(
        { section: "Et l'inflation ?", texte: `Et en vrai ? Avec ${pct(INFL)} d'inflation par an, en hypothèse, ${eur(FV)} dans ${n} ans valent environ ${eur(reel)} d'aujourd'hui. Il faut toujours regarder le résultat en pouvoir d'achat.`, ecran: duo({ valeur: eur(FV), legende: 'Le chiffre sur le compte' }, compt(reel, FV, reel, "Ce qu'il achète, en euros d'aujourd'hui")) },
        { section: "L'objectif", texte: `Tu peux aussi faire le calcul à l'envers : combien verser pour atteindre une somme donnée ? Pour obtenir ${eur(objectif)} en ${n} ans, à ${pct(t)} en hypothèse, il faut environ ${eur(besoin)} par mois.`, ecran: { type: 'calcul', lignes: [`Objectif : ${eur(objectif)} en ${n} ans`, `Taux : ${pct(t)} par an (hypothèse)`], resultat: `≈ ${eur(besoin)} par mois`, source: 'Calcul de la chaîne (formule inversée)' } },
        { section: 'Calcule-le toi-même', texte: `Pour estimer toi-même, un simulateur d'épargne suffit : tu entres la somme mensuelle, le taux et la durée. Il refait le même calcul, mois après mois, en ajoutant les intérêts du mois.`, ecran: { type: 'calcul', lignes: [`${eur(m)} par mois`, `${pct(t)} par an ≈ ${fmt(im * 100, 3)} % par mois`], resultat: `≈ ${eur(FV)} après ${n} ans`, source: 'Formule de l\'épargne régulière' } },
        ...question('Quelle part du résultat final vient des intérêts ?', `Réponse : ${fmt(gains / FV * 100, 0)} pour cent. ${eur(gains)} sur ${eur(FV)}. Le reste, c'est ce que tu as versé toi-même.`, { type: 'calcul', lignes: [`${eur(gains)} ÷ ${eur(FV)}`], resultat: `≈ ${fmt(gains / FV * 100, 0)} % du total`, source: 'Calcul de la chaîne' }),
        { section: 'Avant de te lancer', texte: "Avant de commencer, trois questions : combien puis-je mettre chaque mois sans me priver ? Pour quel projet ? Et pour combien de temps ? Les réponses fixent le bon rythme.", ecran: liste('Trois questions à se poser', [['Combien ?', 'sans te priver'], ['Pour quel projet ?', 'ça donne un but'], ['Combien de temps ?', 'la durée compte']]) });
      return {
        titre: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`, promesse: `${eur(m)} par mois pendant ${n} ans à ${pct(t)} par an (hypothèse) : combien ça fait ?`,
        description: `Pico explique l'épargne régulière : ${eur(m)} par mois pendant ${n} ans à ${pct(t)} par an (hypothèse) donnent environ ${eur(FV)}, dont ${eur(verse)} versés. Ce qui change avec la durée, le montant et le taux, le duel de Léa et Tom, et les pièges.`, hashtags: '#épargne #intérêtscomposés #économie #apprendre #QuentInvest',
        accroche: { texte: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`, court: `${eur(m)} par mois pendant ${n} ans : combien ça fait ?`,
          ecran: { intro: `${eur(m)} par mois pendant ${n} ans, à ${pct(t)} par an (hypothèse)`, avant: eur(verse), apres: `≈ ${eur(FV)}`, de: Math.round(verse), a: Math.round(FV), suffixe: ' €', legende: 'Versés → obtenus.', source: `Calcul : ${eur(m)} × ${N} mois, intérêts composés` }, effet: 'hausse' },
        intro: { texte: "Au programme : ce que tu verses et ce que tu obtiens, ce qui change avec la durée, le montant et le taux, un duel entre Léa et Tom, et les pièges à éviter.", ecran: liste('Au programme', ['Versé et obtenu', 'Durée, montant, taux', 'Léa contre Tom', 'Les pièges à éviter']) },
        blocs,
        piege: piege3('Attention, grain de sable. Il y a trois erreurs courantes.', [
          { titre: `${pct(t)} n'est pas garanti`, texte: `Un : croire que ces ${pct(t)} sont garantis. C'est une hypothèse : un vrai rendement varie, et certains placements peuvent faire perdre de l'argent.` },
          { titre: "L'inflation grignote le résultat", texte: `Deux : oublier l'inflation. ${eur(FV)} dans ${n} ans n'achèteront pas autant qu'aujourd'hui.` },
          { titre: 'Oublier la réserve', texte: "Trois : oublier de garder une réserve pour les imprévus avant d'épargner sur le long terme. Une épargne longue ne doit pas t'obliger à tout arrêter au premier coup dur." }],
          `Attention, grain de sable : ${pct(t)} n'est pas garanti, et l'inflation grignote le résultat.`),
        recap: { texte: "Pour résumer en trois points. Un : verser régulièrement, c'est laisser le temps travailler. Deux : la durée, le montant et le taux changent le résultat. Trois : rien n'est garanti, et l'inflation compte.", ecran: liste('À retenir', [['Régulier', 'laisser le temps travailler'], ['Durée, montant, taux', 'tout change le résultat'], ['Rien de garanti', "et l'inflation compte"]]) },
        resume: { texte: "En une phrase : verser régulièrement, c'est laisser le temps travailler, sans garantie de résultat.", court: "En une phrase : verser régulièrement, c'est laisser le temps travailler, sans garantie." },
        sources: ["S1 · Formule de l'épargne régulière : versement × ((1 + i)^n − 1) ÷ i, i = taux mensuel équivalent (calcul de la chaîne)", `S2 · Calculs, hypothèse de ${pct(t)} par an : ${eur(m)} par mois pendant ${n} ans ≈ ${eur(FV)} dont ${eur(verse)} versés`],
        miniature: { lignes: [`${fmt(m)} €`, 'PAR MOIS,', 'COMBIEN ?'], accent: 'COMBIEN', bas: [eur(verse), `→ ${eur(FV)}`] }
      };
    }
  }
};

// ---------- compléments communs à tous les types : « pourquoi ça compte », exemple du quotidien, vrai ou faux ----------
// debut : blocs insérés avant les explications ; fin : blocs insérés avant la liste de questions finale
const EXTRAS = {
  interets: ({ capital: c, taux: t, annees: n }) => { const C = (r, y) => c * (1 + r / 100) ** y, g1 = C(t, n) - c, g2 = C(2 * t, n) - c;
    return { debut: [
      { section: 'Pourquoi ça compte', texte: "Pourquoi s'intéresser aux intérêts composés ? Parce qu'ils s'appliquent à l'épargne comme aux dettes. Comprendre cette mécanique, c'est comprendre pourquoi le temps pèse autant sur l'argent, dans un sens comme dans l'autre.", ecran: { type: 'message', titre: 'Pourquoi ça compte', sous: "Le temps pèse sur l'argent, dans les deux sens" } },
      { texte: "Pense à une boule de neige qui roule dans une pente. Au début, elle est petite. Plus elle grossit, plus elle ramasse de neige à chaque tour. Les intérêts composés fonctionnent exactement pareil.", ecran: { type: 'message', titre: 'La boule de neige', sous: 'Plus elle grossit, plus elle grossit vite' } }],
    fin: question(`Vrai ou faux : si le taux est multiplié par deux, passe de ${pct(t)} à ${pct(2 * t)}, les gains sont-ils multipliés par deux ?`, `Réponse : faux. À ${pct(t)}, tu gagnes ${eur(g1)}. À ${pct(2 * t)}, ${eur(g2)}. Les gains sont multipliés par ${fmt(g2 / g1, 1)}, pas par deux, à cause des intérêts sur les intérêts.`, { type: 'calcul', lignes: [`${pct(t)} : gains de ${eur(g1)}`, `${pct(2 * t)} : gains de ${eur(g2)}`], resultat: `× ${fmt(g2 / g1, 1)} les gains`, source: 'Calcul de la chaîne (hypothèses)' }, 'Vrai ou faux') }; },
  inflation: ({ capital: c, taux: t, annees: n }) => { const P = (r, y) => c / (1 + r / 100) ** y, p1 = c - P(t, n), p2 = c - P(2 * t, n);
    return { debut: [
      { section: 'Pourquoi ça compte', texte: "Pourquoi parler d'inflation ? Parce qu'elle touche tout le monde, tous les jours, sans qu'on la voie : le prix du pain, du loyer, de l'énergie. Et elle agit en silence sur l'argent qu'on met de côté.", ecran: { type: 'message', titre: 'Pourquoi ça compte', sous: "Elle agit en silence sur l'argent mis de côté" } },
      { texte: "Pense à un ticket de cinéma ou à une baguette de pain. Le prix d'il y a dix ans n'est plus celui d'aujourd'hui. Ton argent, lui, n'a pas changé de chiffre. C'est exactement ça, l'inflation.", ecran: { type: 'message', titre: 'Le prix du quotidien', sous: "Le chiffre sur ton compte ne change pas, ce qu'il achète si" } }],
    fin: question(`Vrai ou faux : si l'inflation passe de ${pct(t)} à ${pct(2 * t)}, la perte de pouvoir d'achat double-t-elle ?`, `Réponse : pas tout à fait. Après ${n} ans, la perte est de ${eur(p1)} à ${pct(t)}, et de ${eur(p2)} à ${pct(2 * t)}. Elle est multipliée par ${fmt(p2 / p1, 1)} : l'effet s'amplifie avec le temps.`, { type: 'calcul', lignes: [`À ${pct(t)} : ${eur(p1)} perdus`, `À ${pct(2 * t)} : ${eur(p2)} perdus`], resultat: `× ${fmt(p2 / p1, 1)} la perte`, source: 'Calcul de la chaîne (hypothèses)' }, 'Vrai ou faux') }; },
  frais: () => ({ debut: [
      { section: 'Pourquoi ça compte', texte: "Pourquoi regarder les frais ? Parce qu'on les voit rarement : ils sont prélevés en douceur, année après année. Et pourtant, ils font partie des rares choses qu'on peut comparer avant de choisir.", ecran: { type: 'message', titre: 'Pourquoi ça compte', sous: 'On les voit rarement, mais on peut les comparer' } },
      { texte: "Prends un abonnement à 15 euros par mois : ça fait 180 euros par an, et 1 800 euros en dix ans. Les petites sommes répétées pèsent lourd. Les frais d'un placement fonctionnent de la même façon.", ecran: { type: 'calcul', lignes: ['15 € par mois × 12 = 180 € par an', '180 € × 10 ans = 1 800 €'], resultat: 'Les petites sommes pèsent', source: 'Calcul de la chaîne' } }],
    fin: question('Vrai ou faux : des frais plus élevés garantissent-ils un meilleur rendement ?', "Réponse : faux. Les frais sont un coût certain, le rendement ne l'est pas. Un produit plus cher peut faire mieux, ou moins bien. Il faut comparer les deux, et jamais l'un sans l'autre.", { type: 'message', titre: 'Faux', sous: 'Les frais sont certains, le rendement ne l\'est pas' }, 'Vrai ou faux') }),
  credit: ({ montant: P, taux: t, annees: n }) => { const pay = (y) => { const i = t / 1200, N = y * 12, M = P * i / (1 - (1 + i) ** -N); return { M, ints: M * N - P }; }, a = pay(n), b = pay(n + 5);
    return { debut: [
      { section: 'Pourquoi ça compte', texte: "Pourquoi s'intéresser au coût d'un crédit ? Parce qu'on regarde souvent la mensualité, alors que le vrai coût est le total remboursé. Connaître le calcul permet de comparer des offres sans se laisser surprendre.", ecran: { type: 'message', titre: 'Pourquoi ça compte', sous: 'Le vrai coût, c\'est le total remboursé' } },
      { texte: "Un crédit, c'est un peu comme louer de l'argent : tu paies un loyer, les intérêts, pour pouvoir l'utiliser tout de suite au lieu d'attendre. Plus tu le gardes longtemps, plus le loyer total est élevé.", ecran: { type: 'message', titre: "Louer de l'argent", sous: 'Les intérêts sont le loyer' } }],
    fin: question(`Vrai ou faux : un crédit sur ${n + 5} ans coûte-t-il moins cher qu'un crédit sur ${n} ans ?`, `Réponse : faux. Sur ${n} ans, les intérêts sont de ${eur(a.ints)}. Sur ${n + 5} ans, ils montent à ${eur(b.ints)}. La mensualité baisse de ${eur(a.M)} à ${eur(b.M)}, mais le coût total augmente.`, { type: 'calcul', lignes: [`${an(n)} : mensualité ${eur(a.M)}`, `${an(n + 5)} : mensualité ${eur(b.M)}`], resultat: `Coût : ${eur(a.ints)} → ${eur(b.ints)}`, source: 'Calcul de la chaîne (exemple)' }, 'Vrai ou faux') }; },
  epargne: ({ mensuel: m, taux: t, annees: n }) => { const VF = (mm) => { const i = (1 + t / 100) ** (1 / 12) - 1; return mm * ((1 + i) ** (n * 12) - 1) / i; };
    return { debut: [
      { section: 'Pourquoi ça compte', texte: "Pourquoi parler d'épargne régulière ? Parce que beaucoup de gens n'ont pas une grosse somme à placer d'un coup, mais peuvent mettre un peu de côté chaque mois. Et ce petit geste répété change tout avec le temps.", ecran: { type: 'message', titre: 'Pourquoi ça compte', sous: 'Un petit geste répété change tout avec le temps' } },
      { texte: "Pense à une tirelire où tu glisses la même pièce chaque semaine. Au début, ça ne se voit pas. Après des années, elle est lourde. L'épargne régulière marche pareil, avec des intérêts en plus.", ecran: { type: 'message', titre: 'La tirelire', sous: 'La même pièce, chaque semaine' } }],
    fin: question(`Vrai ou faux : si tu verses deux fois plus par mois, le résultat final est-il deux fois plus grand ?`, `Réponse : vrai. Avec ${eur(2 * m)} par mois, tu obtiens ${eur(VF(2 * m))}, contre ${eur(VF(m))} avec ${eur(m)}. Les intérêts sont proportionnels à ce que tu verses : c'est la durée qui change la donne.`, { type: 'calcul', lignes: [`${eur(m)} par mois : ${eur(VF(m))}`, `${eur(2 * m)} par mois : ${eur(VF(2 * m))}`], resultat: 'Le double, pour le double', source: 'Calcul de la chaîne (hypothèse)' }, 'Vrai ou faux') }; }
};

const DEFI = {interets: "refais le calcul avec ta propre somme, ton taux et ta durée", inflation: "prends une somme que tu as de côté, et calcule ce qu'elle vaudra dans dix ans avec ton inflation d'exemple", frais: "repère les frais courants par an d'un produit qui t'intéresse, et refais le calcul avec et sans frais", credit: 'prends un crédit que tu connais, note le montant, le taux et la durée, puis calcule le coût total', epargne: 'choisis la somme que tu pourrais mettre de côté chaque mois sans te priver, et refais le calcul'};
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
  const p = { ...T.defaut, ...params }, f = T.fiche(p), ex = EXTRAS[type](p);
  f.blocs = [...ex.debut, ...f.blocs.slice(0, -1), ...ex.fin,
    { section: 'Les limites', texte: "Ce modèle est volontairement simplifié : il ne tient compte ni des impôts, ni des variations d'une année à l'autre, ni de ta situation personnelle. C'est un outil pour comprendre, pas pour prévoir.", ecran: { type: 'message', titre: 'Un modèle simplifié', sous: 'Pour comprendre, pas pour prévoir' } },
    { section: 'Ton défi', texte: `Petit défi pour toi : ${DEFI[type]}. Compare le résultat avec ce que tu imaginais : c'est souvent surprenant.`, ecran: { type: 'message', titre: 'Ton défi', sous: 'Refais le calcul avec tes chiffres' } },
    f.blocs[f.blocs.length - 1]];
  const blocs = [...f.blocs, ...f.piege.erreurs, f.recap, f.intro];
  const trop = blocs.findIndex(b => (b.texte || '').split(/\s+/).length > 48); if (trop >= 0) throw new Error(`Un bloc dépasse 48 mots (${type}, n° ${trop + 1}) : ${blocs[trop].texte.slice(0, 60)}…`);
  const fiche = { numero, slug: slug(`${type}-${Object.values(p).join('-')}`), ...f, musique: 'documentaire-doux', musiqueRevelation: 'corporate-lumineux', question: QUESTIONS[numero % QUESTIONS.length],
    suite: { titre: suivant || "Un nouveau sujet d'économie", texte: suivant ? `La prochaine fois : ${suivant.charAt(0).toLowerCase() + suivant.slice(1)}` : 'La prochaine fois : un nouveau sujet.' }, sourcesExternes: false };
  const C = compose(fiche), duree = estimer(C.long.scenes, C.long.voix);
  if (duree < DUREE_VISEE && !process.env.SANS_MINI) throw new Error(`Épisode trop court (${duree} s estimées, il faut au moins ${DUREE_VISEE} s pour dépasser 5 minutes) : ${type} ${JSON.stringify(p)}`);
  return fiche;
}
const prochainNumero = () => Math.max(2, ...fs.readdirSync(FICHES).map(n => (n.match(/^(\d+)-/) || [])[1]).filter(Boolean).map(Number)) + 1;
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
function ecrire(f, nom) { if (nom) f.slug = nom; const fichier = path.join(FICHES, `${String(f.numero).padStart(2, '0')}-${nom || f.slug}.json`); fs.writeFileSync(fichier, JSON.stringify(f, null, 1) + '\n'); return fichier; }

module.exports = { construire, TYPES, PLAN };

if (require.main === module) {
  const a = process.argv[2];
  if (!a || a === '--liste') { for (const [k, v] of Object.entries(TYPES)) console.log(`${k.padEnd(10)} ${JSON.stringify(v.defaut)}`); console.log('\nUsage : node serie.js <type> --capital 2000 --taux 4 --annees 20 | node serie.js --plan N'); process.exit(0); }
  if (a === '--plan') {
    const N = +arg('plan', 5), existants = fs.readdirSync(FICHES).join(' '), sorties = [], choix = [];
    for (const [type, params] of PLAN) { const p = { ...TYPES[type].defaut, ...params }, s = slug(`${type}-${Object.values(p).join('-')}`); if (!existants.includes(s)) choix.push([type, params]); if (choix.length === N) break; }
    const n = prochainNumero(), titres = choix.map(([type, params]) => TYPES[type].fiche({ ...TYPES[type].defaut, ...params }).titre);
    choix.forEach(([type, params], k) => sorties.push(ecrire(construire(type, params, n + k, titres[k + 1]))));
    console.log(`${sorties.length} fiche(s) écrite(s) :\n` + sorties.map(s => '  ' + path.basename(s)).join('\n') + (sorties.length < N ? `\n(le plan prévu est épuisé : ${PLAN.length} épisodes ; ajoute des lignes à PLAN dans serie.js ou lance un type avec tes chiffres)` : ''));
  } else {
    const params = {}; for (const k of ['capital', 'taux', 'annees', 'interet', 'rendement', 'frais', 'montant', 'mensuel']) if (arg(k) != null) params[k] = +arg(k).replace(',', '.');
    console.log(ecrire(construire(a, params, +arg('numero', prochainNumero()), arg('suite')), arg('nom')));
  }
}
