# Sites et publicités « cinématiques » : recettes retenues

Synthèse de 15 guides gratuits lus (voir `design/SAVOIR-FAIRE.md`), transformée en méthodes que QuenTools peut appliquer **seul**, et en liste de ce qui demande des outils payants. Démonstration vivante : `demo/cinematique/`. Moteur réutilisable : `assets/qt-scroll.js` (sans bibliothèque, sans cookie, mouvement réduit respecté). Je n'ai testé que ce qui est marqué « vérifié ».

## 1. Ce que nous savons faire sans outil payant
| Technique | Où | État |
|---|---|---|
| Suite d'images sur canvas pilotée par le défilement (« flip-book ») | `QTScroll.frames` | vérifié : ordinateur, téléphone, mouvement réduit |
| Vidéo pilotée par le défilement (images clés) | `QTScroll.video`, `scrub.mp4` | vérifié |
| Lettres qui se dispersent / se reconstruisent | `QTScroll.letters` + `scatter` | vérifié |
| Textes par plage de défilement (chapitres) | `QTScroll.chapters` | vérifié |
| Diaporama produit en trois couches (« Coffee Drift ») | `QTScroll.slider` | vérifié (clics rapides, aucun élément fantôme) |
| Images de démonstration dessinées par programme | `tools/cinematique-demo.js` | vérifié |
| Contrôle automatique | `node tools/verifier-cinematique.js` (serveur local requis) | vérifié |

## 2. Recette : suite d'images (technique la plus rentable)
1. Une vidéo de 6 à 12 s (générée par IA ou filmée) ou une scène dessinée. Action **au centre** du plan : le canvas fait un « cover », le même contenu se recadre sur téléphone.
2. Extraire (vérifié) : `ffmpeg -i clip.mp4 -vf "fps=12,scale=960:-2" -c:v libwebp -quality 72 frames/f_%03d.webp`. Mobile = **suite indépendante** plus petite : `-vf "select='not(mod(n,2))',scale=640:-2" -vsync vfr`. Plusieurs clips : les joindre avant avec `concat`.
3. Poids visé : ordinateur ≤ 1 à 3 Mo, mobile ≤ 1 Mo. Les guides utilisent 200 images de 1928 px (plus lourd, voire 119 Mo avant nettoyage) : à éviter sur un petit site ; un téléphone peut planter à 200 grandes images (mémoire).
4. Dans la page : section haute (`height: 300vh à 500vh`) contenant un élément `position: sticky; height: 100svh` avec un `<canvas>` ; `QTScroll.frames({section, canvas, desktop:{base,count}, mobile:{base,count}})`. Toujours : première image affichée tout de suite, jamais un bloc noir pendant le chargement, `prefers-reduced-motion` = une image fixe, texte alternatif sur le canvas.
5. Index de l'image = `Math.round(progression × (nb − 1))` ; ne redessiner que si l'index change.

## 3. Recette : vidéo pilotée
- Encoder **toutes les images en images clés** (vérifié) : `ffmpeg -i clip.mp4 -vf scale=720:-2 -c:v libx264 -g 1 -crf 30 -pix_fmt yuv420p -an -movflags +faststart scrub.mp4`. Sans `-g 1`, le défilement saccade et aucun JavaScript ne le corrige.
- Plus lourde qu'une vidéo normale. Ici : 0,3 Mo (720 px) contre 0,8 Mo pour la suite d'images (960 px), résolutions différentes. Moins fiable sur iPhone : la suite d'images reste le choix par défaut.
- Pour un fond qui se lance seul (héros) : export 1080p, 30 i/s, H.264, environ 16 Mo ; garder le master 4K en archive. Un rendu net dans le logiciel mais flou sur le site vient presque toujours de l'export.

## 4. Recette : diaporama « Coffee Drift »
Trois couches indépendantes réglées pour sortir ensemble : le produit (anticipation puis sortie avec rotation, l'arrivant tourne depuis le bord opposé), le mot d'arrière-plan (retourné comme une carte, rotation sur l'axe vertical), les éléments flottants (clones fantômes qui sortent, supprimés ensuite ; nouveaux qui arrivent décalés). Garde-fous appris (les huit pièges des guides) :
1. Ne jamais centrer avec CSS un élément que l'on anime : centrer un conteneur, animer l'enfant.
2. Une seule animation à images clés pour l'anticipation (deux animations enchaînées laissent un à-coup).
3. Entrée et sortie des éléments flottants avec décalage propre (un délai partagé les fait « rebondir deux fois »).
4. Les éléments flottants parcourent moins de distance : durée ×1,25 pour disparaître avec le produit (le calcul exact sert de départ, l'œil décide).
5. Verrou de transition (clics rapides) + filet de sécurité : jamais bloqué.
6. Rotations résiduelles à remettre à zéro sur le dernier écran.
7. Détourage d'objets enroulés (lacets) : le fond intérieur reste ; fond sombre et remplissage des zones fermées.

## 5. Recette : canvas interactif (carte du ciel, effets)
- Planifier `requestAnimationFrame` **avant** de dessiner, avec `try/catch` : une erreur ne doit pas tuer la boucle.
- Positions en fractions (0 à 1) de la largeur et de la hauteur.
- `save()/restore()` à chaque effet (une ombre ou une opacité oubliée contamine toute l'image).
- Un calque semi-transparent laisse voir ce qui bouge dessous : figer ou ne pas dessiner la scène dessous pendant un « reveal ».
- Délai (cooldown) après la fermeture d'un panneau, sinon le clic qui ferme rouvre l'élément voisin.
- Ne pas se fier à `visibilitychange` pour réinitialiser l'état sur Mac.

## 6. Recette : personnage ou objet vidéo à fond transparent (non testé ici)
Chaîne décrite par un guide : générer sur **fond blanc uni** (jamais noir pour un costume sombre) ; retirer le fond ; fusionner un masque avec la vidéo (`alphamerge`), éroder le masque de 2 px et « décontaminer » le blanc ; garder un intermédiaire sans perte avec alpha (ProRes 4444, `yuva444p`) ; encoder **depuis cet intermédiaire** deux fichiers : VP9 WebM avec alpha (Chrome, Firefox, Edge) et HEVC `.mov` avec alpha (Safari, `-tag:v hvc1`, uniquement sur Mac) ; dans la page, deux `<source>` (`video/webm; codecs=vp9` puis `video/mp4; codecs=hvc1`). Pièges : un WebM ré-encodé en WebM perd l'alpha ; `ffprobe` peut afficher `yuv420p` alors que l'alpha est là ; Safari n'a pas VP9 ; décrire chaque arme ou écharpe qui dépasse du corps pour qu'elle ne soit pas détourée. À ne tenter qu'avec un Mac et une demande client.

## 7. Génération d'images et de vidéos par IA (avec outils payants)
Nous n'avons pas d'accès à ces outils depuis le dépôt ; le propriétaire peut les utiliser et nous en tirons les règles.
- **Images clés d'abord, toujours**, 2K, 3 à 4 variantes, on garde la meilleure. Une image fixe de départ et une d'arrivée par clip ; la dernière image d'un clip est la première du suivant (la suite se lit comme un seul mouvement).
- **Prompt image** : sujet d'abord, aucun vocabulaire de mouvement ; une source de lumière **nommée et orientée** (« lumière chaude venant d'en haut à gauche ») plutôt que « éclairage cinématographique » ; indices de réfraction (verre 1,5 ; liquide 1,33) plutôt que « brillant » ; même fond et même palette sur toute la série ; contraintes en **positif** ; un rôle écrit pour chaque image de référence ; fixer une image de référence de l'objet (et une feuille de personnage) pour éviter la dérive.
- **Prompt vidéo** : un seul mouvement de caméra par clip ; terminer par « puis se stabilise et s'arrête » ; suffixe qualité (« 4K, détails nets, aucune image fantôme, image stable ») ; prose continue pour plusieurs objets en mouvement (les repères entre crochets les figent), mais une **ligne de temps seconde par seconde** a redonné de la vie à un clip à sujet unique : tester les deux ; écrire que la surface est vide quand les objets s'envolent ; montrer avant l'explosion les éléments qui vont apparaître.
- **Pièges de plateforme** : régler la qualité à la main à chaque appel (défaut en 720p) ; refuser les préréglages qui écrasent le prompt ; ne pas écrire de mesures dans le prompt (elles s'impriment à l'image) ; fixer l'orthographe de tout texte sur une surface ; filtres de contenu qui bloquent au hasard (plans intérieurs, gros plans de mains avec liquide) : changer de modèle ou d'image de départ ; un arc de caméra peut sortir le logo du cadre ; une image d'arrivée imposée ralentit tout le plan ; juger un clip sur des images extraites, jamais sur sa vignette ; sens de déplacement identique d'un clip à l'autre.
- **Montage** : couper sur un mouvement, jamais sur un instant immobile ; un seul étalonnage ; cuts secs sur les temps forts d'une musique, puis laisser respirer la révélation ; une version silencieuse paraît bon marché : prévoir bruitages calés à l'image et musique basse, mixage avec limiteur (la plupart des vidéos sociales sont vues sans son : le sens doit passer sans lui).

## 8. Idées d'interface réutilisables (non faites ici)
Configurateur dont la miniature vole en arc vers le prix (cloner l'image, deux segments, le prix « claque » puis revient) ; thermomètre circulaire animé (SVG, `stroke-dashoffset`) ; compteurs qui montent au défilement ; bandeau de mots défilant dans les deux sens ; calendrier de réservation ; cartes qui pivotent ; viseur « REC » avec minuterie sur une scène (réutilise la progression).

## 9. Limites et règles QuenTools
- **Pas d'application complexe** (CLAUDE.md) : ces sites sont des pages ; les chiffrer sur devis, sans promesse de prix fixe tant que le contenu (images, vidéos) n'existe pas.
- **Poids et téléphone d'abord**, test sur un vrai téléphone, `100svh`, `prefers-reduced-motion`, texte alternatif, aucun son qui démarre seul, sections épinglées raisonnables (pas de 500 vh sans raison).
- **Contenu IA** : acceptable pour exemples fictifs signalés comme tels ; jamais de fausses photos des produits réels d'un client ni de faux avis.
- **Marques** : les guides montrent des publicités « d'essai » avec les noms et visuels de grandes marques (Nike, Chanel, Coca-Cola…). Nous n'utilisons **jamais** de marque, logo ou produit réel d'un tiers dans nos pages ou publications (droit des marques) : marques et produits fictifs seulement, comme « Lumen » dans la démonstration.
- **Avant de publier un site dérivé d'un modèle** : audit des restes (étiquettes, médias, scripts qui se lancent), suppression des doublons, poids du dossier.
- **Marketing observé** : une vidéo « stoppante » + un mot-clé à commenter + un guide gratuit remis en message privé (entonnoir de génération de contacts). C'est la logique de notre guide de prospection ; à garder en tête pour nos publications, en respectant « jamais de lien ni de prix dans une publication » (`design/PROSPECTION.md`).
