# QuentInvest — chaîne de Pico (mode d'emploi court)

Chaîne de vulgarisation de l'économie, présentée par Pico, une petite fourmi (« la colonie » = les spectateurs). Personnage, voix, structure et règles : `FICHE-PICO.md`. Rien n'est publié sans la validation du propriétaire.

## Produire beaucoup, sans rédiger (le plus économe)
Cinq types d'épisodes « calcul » s'écrivent tout seuls : on donne des chiffres, le programme rédige la fiche complète (accroche, explications, calculs à l'écran, piège, résumé, sources = formules de la chaîne, texte court TikTok).
1. `node design/quentinvest-youtube/fabrication/serie.js --plan 10` : écrit 10 fiches variées (crédit, épargne régulière, frais, intérêts composés, inflation ; chiffres qui tournent, numéros à la suite, teaser du prochain épisode chaîné). Ou un épisode précis : `serie.js interets --capital 2000 --taux 4 --annees 20` (types et valeurs par défaut : `serie.js --liste`). Le plan prévoit 15 épisodes ; ajouter des lignes à `PLAN` dans `serie.js` pour en avoir plus.
2. `node design/quentinvest-youtube/fabrication/lot.js` : fabrique à la suite toutes les fiches qui n'ont pas encore de résultat (sans surveillance, reprise possible après une coupure, une ligne par épisode, `lot.js 04 05` pour certains numéros). Compter environ 15 à 20 minutes par épisode (vidéo YouTube de plus de 5 minutes + TikTok d'une minute).
3. Relire les `NN-sujet-publication.md` et les vidéos dans `~/Movies/QuentInvest/` ; rien n'est publié sans validation.
Règles de la chaîne : **une vidéo YouTube dure au moins 5 minutes** (la fabrication s'arrête avec un message si la fiche est trop courte ; environ 850 mots dits ; `--court` pour passer outre) et **les bruitages sont nettement plus discrets que la voix** (−20 dB sous la voix, après deux baisses successives demandées, niveau mesuré pour chaque réplique, réglable par la clé `sons.effetsDb` d'un épisode ; la musique est réglée à 15 sur 100 et baisse encore quand la voix parle). Les épisodes générés suivent ces règles seuls : programme, explications, tableaux de scénarios, duel Léa et Tom, questions-quiz, pièges, à retenir.
Les épisodes qui demandent des faits extérieurs (taux du Livret A, barème d'impôt, chiffres de l'Insee…) passent par une fiche écrite à la main (ci-dessous) avec les sources officielles.

## Faire un épisode rédigé (une commande)
1. Écrire une **fiche** courte : copier `fiches/_modele.json` en `fiches/NN-sujet.json` (le fond seulement : accroche chiffrée, idées, piège, résumé, question, sources). Prévoir environ 20 blocs de 40 mots (850 mots dits) pour dépasser 5 minutes : programme (`intro`), explications, scénarios en tableaux, duel de deux personnages, question-quiz, 3 erreurs, `recap` (à retenir). Le modèle `_modele.json` montre la forme ; `fiches/03-interets-composes.json` (générée) montre un épisode complet. Idées de sujets et sources à chercher : `fiches/IDEES.md`. Exemple complet : `fiches/03-interets-composes.json`.
2. Lancer : `node design/quentinvest-youtube/fabrication/episode.js design/quentinvest-youtube/fiches/NN-sujet.json`
   (modèles de voix dans `~/Movies/QuentMovie/modeles`, option `--modeles`, `--sortie`, `--sans-tiktok`, `--sans-youtube`).
3. Résultat dans `~/Movies/QuentInvest/NN-sujet/` : vidéo YouTube, version TikTok verticale (≈ 1 minute), deux miniatures, `NN-sujet-publication.md` (titre, description avec chapitres, description courte, légende TikTok, commentaire épinglé, points à vérifier). Les fichiers d'épisode, miniatures et textes sont aussi rangés dans `episodes/` ; les vidéos ne sont jamais versionnées.

Ce que le programme ajoute seul : appel à s'abonner dans les premières secondes, accroche chiffrée, expressions et gestes de Pico, bruitages, musique qui change au chiffre clé, zoom lent, sous-titres, contrôle du rythme (avertissements affichés), chapitres, miniatures, texte de publication. Seul le fond de la fiche demande de la rédaction.

## Photos et vidéos
Un bloc de fiche peut avoir une **photo ou une vidéo en fond** (le texte et les calculs restent affichés par-dessus, Pico reste à l'écran) :
- `"fond": { "fichier": "nom.jpg", "credit": "Auteur, licence, source" }` : fichier rangé dans `medias/` (ou chemin complet), ou `"url"` (téléchargée une fois dans `medias/cache/`). Une photo est cadrée plein écran, assombrie sous le texte, avec un zoom lent ; une vidéo tourne en boucle (`"debut"` : seconde de départ, `"sombre": false` pour la laisser claire). Le fond dure jusqu'au prochain nouvel écran (un bloc `"ecran": "="` le garde).
- Écran `{ "type": "visuel", "legende": "…" }` : uniquement le média, avec une légende facultative.
- Le crédit s'affiche à l'écran (« Image : … ») et la description YouTube ajoute « Images et vidéos : … ». Version TikTok : `fondTiktok` pour un autre média (sinon le même).
- Images libres de droits : `node fabrication/medias.js commons "Nom_du_fichier.jpg" nom-court` télécharge l'image de Wikimedia Commons avec son crédit et **refuse toute licence non libre** (domaine public, CC0, CC BY, CC BY-SA acceptés). Wikimedia limite les appels depuis certains serveurs : si la commande répond « licence non vérifiable », la lancer plus tard ou depuis le Mac ; on peut aussi fournir soi-même une photo ou une vidéo dont on possède les droits (la déposer dans `medias/`).
- Pas de photo ou vidéo dont la licence n'est pas vérifiée, et jamais de logo ou d'image de marque sans droit.

## Ta propre voix (doublage)
- **Texte à lire automatique** : chaque `episode.js` écrit à côté des vidéos et dans `episodes/` `NN-sujet-lecture.txt` (YouTube) et `NN-sujet-lecture-tiktok.txt` (une réplique par ligne) ainsi que `NN-sujet-lecture.md` (guide : ton conseillé, durée, commande de fabrication). Pour un épisode déjà fabriqué : `node fabrication/lecture.js fiches/NN-sujet.json`.
- Dans QuentMovie, **Doublage** (⇧⌘D) : charger `episodes/NN-sujet-lecture.txt` (YouTube) ou `NN-sujet-lecture-tiktok.txt` (TikTok) et enregistrer chaque réplique. Les fichiers `v00.wav`, `v01.wav`… sont rangés dans `~/Movies/QuentMovie/doublages/<nom>/`.
- Fabrication avec ta voix (montage, écrans, bruitages, sous-titres inchangés) : `node fabrication/episode.js fiches/NN-sujet.json --voix-perso <dossier YouTube> --voix-perso-tiktok <dossier TikTok>`. Une réplique refaite est reprise automatiquement (la date du fichier compte). Une réplique sans fichier garde la voix de synthèse.
- `~/Movies/QuentMovie/ma-voix/` (sons + `metadata.csv`) cumule toutes les répliques enregistrées avec leur texte : le corpus pour reproduire ta voix. Reproduction automatique pas encore en place (modèles à comparer sur le Mac : qualité en français, licence, vitesse) ; la durée enregistrée est affichée dans la fenêtre Doublage.

## Prononciation et écriture assistée
- **Dictionnaire de prononciation** : `quentmovie/prononciations.json` (mots livrés) + `~/Movies/QuentMovie/prononciations.json` (celui du propriétaire, prioritaire ; à envoyer pour que la chaîne l'utilise, ou `QM_PRONONCIATIONS=<fichier>`). Appliqué à la voix de synthèse de la chaîne ; les sous-titres gardent l'orthographe. À chaque épisode, relever les noms propres, sigles et mots étrangers et compléter le dictionnaire.
- **Guide d'écriture pour une IA** : `GUIDE-IA-LOCALE.md` (rôle, forme de la fiche, style pour l'oreille, prudence sur les faits, méthode de recherche, prononciation, consignes « retiens que… » pour l'assistant de QuentMovie).

## TikTok avec ta voix, sans réenregistrer
Avec `--voix-perso <dossier YouTube>` et sans `--voix-perso-tiktok`, `episode.js` monte la version TikTok à partir des répliques de la vidéo YouTube (`fabrication/tiktok-voix.js`) : chaque réplique est découpée en phrases dans les silences, chaque phrase de la version TikTok est associée à la phrase YouTube la plus proche, les silences trop longs sont raccourcis, le texte affiché devient celui qui est dit, et les répliques de peu de valeur (piège, fragments) sont retirées pour tenir en une minute. `--tiktok-synthese` garde la voix de synthèse. Compte rendu dans `travail-tiktok-voix/tiktok-voix.json`.

## Contrôle d'une fiche avant fabrication
`node quentmovie/fiche-quentinvest.js fiches/NN-sujet.json` (ou le bouton « Fiche » de QuentMovie) : longueur, phrases, chiffres sans source, conseils, mots à ajouter au dictionnaire ; `episode.js` affiche les mêmes avertissements avant de fabriquer. Brouillon d'une fiche depuis un sujet : bouton « Fiche » de QuentMovie (Wikipédia + IA locale), à relire et compléter.

## Contrôle rapide (2 secondes, sans fabrication)
`node design/quentinvest-youtube/fabrication/verifier.js` : les écrans des épisodes 1 et 2 sont identiques à la référence, et toutes les fiches se composent sans erreur. À lancer après toute modification du moteur.

## Fichiers
- `fabrication/serie.js` (fiches « calcul » automatiques), `lot.js` (plusieurs épisodes à la suite), `episode.js` (un épisode), `composer.js` (fiche → épisodes), `fabriquer.js` (voix, écrans, montage), `ecrans.js` (écrans animés), `miniature.js`, `publier.js`, `verifier.js`.
- `episodes/` : épisodes 1 et 2 (rendu d'origine conservé), version TikTok de l'épisode 2, épisode 3 et modèle.
- Épisode seul sans fiche : `node fabrication/fabriquer.js episodes/<fichier>.json --voix <dossier du modèle>` (`--controle` pour le seul contrôle du rythme).

Outils nécessaires : Node, FFmpeg, `sherpa-onnx-node`, Playwright (Chromium) ; variables `SHERPA` et `PW` si ces modules ne sont pas installés à côté.
