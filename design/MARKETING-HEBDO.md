# Mise au point marketing du dimanche

Rendez-vous chaque dimanche. Objectif : savoir ce qui marche, corriger ce qui ne marche pas, préparer la semaine.

## Déroulé (30 min)
1. **Chiffres de la semaine** (Metricool : Instagram et TikTok) : portée, vues, enregistrements, partages, commentaires, nouveaux abonnés, clics en bio. Noter les 2 meilleures et les 2 moins bonnes publications.
2. **Prospection** : messages envoyés, réponses, relances faites, devis demandés (admin → Demandes). Cible : 5 messages personnalisés par jour (voir `marketing/quentools/PROSPECTION.md` et `design/PROSPECTION.md`).
3. **Hashtags** : voir règles ci-dessous ; remplacer ceux qui n'apportent rien dans les publications des 7 prochains jours.
4. **Référencement (SEO)** : voir contrôle ci-dessous.
5. **Planning** : vérifier une publication par jour à 12 h, 5 images, texte et titre TikTok présents ; compléter jusqu'à 3 semaines d'avance.
6. **Décisions** : 3 actions maximum pour la semaine suivante, notées en bas de ce fichier (journal).

## Hashtags
- 5 par publication : 1 de métier (#plombier), 1 de besoin (#siteweb, #creationdesite), 1 de profil (#entrepreneur, #artisan), 1 local ou de niche, 1 propre à la marque (#quentools) une fois qu'il est utilisé partout.
- Éviter les très gros (millions de publications) seuls : noyés. Mélanger moyens (10 000 à 500 000) et petits.
- Garder ceux des 2 meilleures publications ; retirer ceux qui reviennent dans les 2 plus faibles.
- Ne jamais mettre de hashtag sans rapport avec le contenu.

## Légendes et format
- Première ligne = accroche (visible avant « plus ») ; une question finale pour les commentaires ; jamais de lien ni de prix dans une publication.
- Format préféré : carrousel de 5 visuels (`tools/carrousels.json`). Garder celui qui retient le plus (enregistrements/partages).
- Répondre à chaque commentaire dans l'heure si possible.

## Référencement (SEO) — contrôle
- Chaque page : une seule `<title>` unique (≤ 60 caractères), une `meta description` (≤ 160), `canonical`, `og:*`, un seul `<h1>`.
- `sitemap.xml` à jour (toute nouvelle page y figure), `robots.txt` correct.
- Données structurées : page d'accueil faite ; à ajouter : `FAQPage` (audit, devis), `Service` (audit, templates), `BreadcrumbList`.
- Fiche Google Business Profile (nom, activité, zone, horaires, photos, lien) : à créer ou compléter, avec demande d'avis aux clients satisfaits.
- Textes : une requête principale par page (ex. « création site artisan », « audit sécurité site web »), nom de ville si pertinent, liens internes entre pages.
- Performance : images compressées, pas de script externe (déjà respecté).
- Vérifier dans Google Search Console (propriété `quentools.fr`) : pages indexées, requêtes, clics, erreurs.

## Journal
- 2026-10-03 : base en place. Site : titres, descriptions, canonical et `og:*` présents sur les pages principales ; JSON-LD seulement sur l'accueil. 22 carrousels programmés du 4 au 25 octobre. À faire : Facebook à relier à Metricool, Search Console, fiche Google Business, lien conseils en bio.
