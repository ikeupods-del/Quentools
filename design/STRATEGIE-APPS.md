# Stratégie « studio d'apps et d'outils » (audit du marché, 14 octobre 2026)

À lire avant de proposer une offre, un prix ou une page liée aux applications. Chiffres = ordres de grandeur, sources en bas.

## Conclusions
1. Logiciel mondial ≈ 1 430 Md$ en 2026 (+15 %/an). L'argent va aux outils de niche (un métier, un problème), pas aux outils généralistes tenus par les géants.
2. France : plus de 4 millions de TPE et micro-entreprises, ~1,07 million de créations par an. 46 % des TPE-PME prévoient plus de 1 000 € de dépenses informatiques par an ; elles achètent un gain concret, un prix clair et quelqu'un de joignable.
3. Fenêtre 2026-2027 : réception des factures électroniques obligatoire pour tous depuis le 1er septembre 2026, émission pour les TPE au 1er septembre 2027 (via une plateforme agréée). Vendre ce qui est autour (devis, suivi des paiements, relances, accompagnement), jamais devenir plateforme agréée.
4. Modèle visé : projet sur mesure (1 500 à 6 000 €) + suivi mensuel (30 à 90 €/mois) + un ou deux produits maison en abonnement (9 à 29 €/mois). Levier principal : la marque blanche (un outil construit une fois, revendu à plusieurs pros du même métier).
5. À éviter : applis financées par la publicité, générateurs d'IA génériques, logiciel de caisse (certification), données de santé synchronisées sans hébergeur HDS, abonnements difficiles à résilier, plusieurs produits poussés en même temps.

## Opportunités classées
| # | Opportunité | Cible | Prix conseillé (à valider) | Base existante |
|---|---|---|---|---|
| 1 | Outil de commande / réservation en marque blanche | Traiteurs, pâtissiers, plateaux, barbiers, instituts | 490 € + 29 €/mois | `demo/naw-fruity/`, `demo/maison-blade/` |
| 2 | Outil métier sur mesure (devis, suivi client, planning) | Artisans, commerçants, associations | 1 500 à 4 000 € + 49 €/mois | `freelance/`, `admin/` |
| 3 | Kit « prêt pour la facture électronique 2027 » | Micro-entrepreneurs, artisans | 9 à 15 €/mois | `freelance/` (devis) |
| 4 | Paperdecrypt Premium | Particuliers | voir `PREMIUM-PAPERDECRYPT.md` | `decodeur-courrier.html` |
| 5 | Wouf Plus | Propriétaires d'animaux | 14,99 €/an ou 29,99 € à vie | `wouf/` |
| 6 | Infikit Pro | Infirmières libérales | 9,99 €/mois (relecture juridique HDS avant toute synchronisation) | `infikit/` |

## Construit
- **Pack Commerçant** (14 octobre 2026) : réservation avec acompte + carte de fidélité + avis Google + espace commerçant, dupliqué par client avec `node tools/pack-commercant.js`. Démonstration : `demo/pack-commercant/`. Reprend les n°1, 5 et 7 de la liste « ce qui marche aux États-Unis » (Genius AI, Podium, Square Loyalty). Prix conseillé à valider : 39 à 49 €/mois ou mise en place + abonnement.
- Pistes suivantes : SMS automatique après un appel manqué (fournisseur payant Twilio/Brevo, essai réel par téléphone nécessaire), devis et suivi des paiements pour les petits métiers.

## Gamme et affichage
Le site n'affiche que les prix déjà au catalogue (`assets/qt-templates.js` : sites 299/599/799 €, réservation 99 €, audit 100 €, suivi 69,99 €/mois). Applications et outils = « sur devis » tant que le propriétaire n'a pas validé les prix ci-dessus ; une fois validés : catalogue, devis, accueil et `TARIFS.md`.

## Plan à 90 jours
- Novembre 2026 : valider les prix ; dupliquer Naw Fruity en outil « à votre nom » ; contacter 30 traiteurs et créateurs de plateaux ; trancher la publicité AdSense (78 pages la chargent alors que l'accueil affiche « 0 cookie, ni traceur, ni publicité »).
- Décembre 2026 : même chose avec la réservation (Maison Blade) pour barbiers et instituts ; une étude de cas par outil vendu ; suivi mensuel proposé à chaque client.
- Janvier 2027 : liste d'attente du kit facture électronique ; relance de Paperdecrypt Premium ; 3 comptables ou chambres de métiers contactés.

Objectif (estimation) : ~2 300 €/mois fin janvier 2027, ~5 000 €/mois en octobre 2027 dont 1 500 € récurrents.

## Sources
- [Gartner, dépenses informatiques 2026](https://www.gartner.com/en/newsroom/press-releases/2026-02-03-gartner-forecasts-worldwide-it-spending-to-grow-10-point-8-percent-in-2026-totaling-6-point-15-trillion-dollars)
- [Sensor Tower, State of Mobile 2026](https://sensortower.com/press/press-release-boosted-by-gen-ai-services-consumers-spent-more-money-in-apps-than-games-for-first-time)
- [Baromètre France Num 2025](https://www.economie.gouv.fr/node/3237194)
- [Créations d'entreprises 2025 (Insee, via TPE Actu)](https://tpeactu.fr/2025/12/20/creation-entreprise-insee-2025/)
- [Calendrier de la facture électronique (Cegid)](https://www.cegid.com/fr/facturation-electronique/facture-electronique-obligatoire/calendrier-facture-electronique/), à confirmer sur impots.gouv.fr
