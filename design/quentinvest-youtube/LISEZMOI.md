# QuentInvest — chaîne de Pico (mode d'emploi court)

Chaîne de vulgarisation de l'économie, présentée par Pico, une petite fourmi (« la colonie » = les spectateurs). Personnage, voix, structure et règles : `FICHE-PICO.md`. Rien n'est publié sans la validation du propriétaire.

## Faire un nouvel épisode (une commande)
1. Écrire une **fiche** courte : copier `fiches/_modele.json` en `fiches/NN-sujet.json` (le fond seulement : accroche chiffrée, idées, piège, résumé, question, sources). Idées de sujets et sources à chercher : `fiches/IDEES.md`. Exemple complet : `fiches/03-interets-composes.json`.
2. Lancer : `node design/quentinvest-youtube/fabrication/episode.js design/quentinvest-youtube/fiches/NN-sujet.json`
   (modèles de voix dans `~/Movies/QuentMovie/modeles`, option `--modeles`, `--sortie`, `--sans-tiktok`, `--sans-youtube`).
3. Résultat dans `~/Movies/QuentInvest/NN-sujet/` : vidéo YouTube, version TikTok verticale (≈ 1 minute), deux miniatures, `NN-sujet-publication.md` (titre, description avec chapitres, description courte, légende TikTok, commentaire épinglé, points à vérifier). Les fichiers d'épisode, miniatures et textes sont aussi rangés dans `episodes/` ; les vidéos ne sont jamais versionnées.

Ce que le programme ajoute seul : appel à s'abonner dans les premières secondes, accroche chiffrée, expressions et gestes de Pico, bruitages, musique qui change au chiffre clé, zoom lent, sous-titres, contrôle du rythme (avertissements affichés), chapitres, miniatures, texte de publication. Seul le fond de la fiche demande de la rédaction.

## Fichiers
- `fabrication/episode.js` (commande unique), `composer.js` (fiche → épisodes), `fabriquer.js` (voix, écrans, montage), `ecrans.js` (écrans animés), `miniature.js`, `publier.js`.
- `episodes/` : épisodes 1 et 2 (rendu d'origine conservé), version TikTok de l'épisode 2, épisode 3 et modèle.
- Épisode seul sans fiche : `node fabrication/fabriquer.js episodes/<fichier>.json --voix <dossier du modèle>` (`--controle` pour le seul contrôle du rythme).

Outils nécessaires : Node, FFmpeg, `sherpa-onnx-node`, Playwright (Chromium) ; variables `SHERPA` et `PW` si ces modules ne sont pas installés à côté.
