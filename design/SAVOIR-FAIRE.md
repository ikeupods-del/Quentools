# Savoir-faire retenu (veille)

Notes personnelles tirées de ressources lues. Résumés avec nos mots : ne pas recopier les contenus de leurs auteurs, ne pas les publier sur le site.

## Site « scroll cinématique » sans framework (guide gratuit RÖSTWERK, DOC MO, 2026)
Source : guide PDF « How RÖSTWERK Was Built » (café fictif ou réel, une page qui se raconte au défilement). L'auteur vend ce type de site à des cafés et marques ; l'idée utile pour QuenTools est la méthode, pas la copie du site ou des textes.

**Principe** : une seule page HTML écrite à la main, sans React ni GSAP ni compilation. La position de défilement donne une progression de 0 à 1, et ce nombre pilote tout : lettres qui se dispersent ou se reforment, sections « épinglées » (hauteur de défilement de 300 à 560 vh selon la scène), vidéos dont l'image avance avec le doigt (`currentTime` piloté par le défilement). Même philosophie que nos pages : fichiers simples, aucune dépendance.

**Récit** : une montée en tension continue plutôt qu'une série de boucles (accroche, chargement, explosion, transformation, résultat, retour au début). Les mouvements importants se placent au centre du plan, ce qui permet de recadrer la même vidéo en 9:16 pour un réel. Astuce de narration : le titre du début se disloque, celui de la fin se reconstruit (même mécanisme à l'envers).

**Vidéos qui suivent le défilement**
- Ré-encoder chaque vidéo avec **une image clé à chaque image** (`ffmpeg … -g 1` ou `keyint=1`) : sinon le défilement saccade, et aucun JavaScript ne le corrige. Les fichiers grossissent ; on rachète le poids avec la résolution (la vidéo la plus lourde : 1280 px de large, environ 5,5 Mo ; les autres : 1920 px).
- Vidéos réelles plutôt que suite d'images dans un canvas.

**Chaîne IA (images puis vidéos)**
- Toujours créer d'abord les images fixes de début et de fin (16:9, 2K, 4 variantes, on garde la meilleure), puis générer chaque clip comme un « pont » entre deux images imposées. Chaque image sert de référence à la suivante, avec une consigne de style commune pour que le rendu ne dérive pas.
- Image : le sujet d'abord, aucun vocabulaire de mouvement (c'est le rôle du modèle vidéo), un rôle écrit pour chaque image de référence.
- Vidéo : réglage de qualité à fixer explicitement à chaque appel (le mode par défaut est en 720p sans avertissement) ; texte en prose continue.

**Les six pièges retenus**
1. Un calque fixe plein écran (arrière-plan, atmosphère) recouvre silencieusement le contenu placé en dessous : surveiller les `z-index`, mettre le décor dans le fond de la section et le contenu au-dessus.
2. Vidéo non encodée en images clés : saccades au défilement.
3. Image IA : « transformé de X en Y » fabrique un écran coupé en deux. Décrire l'état final, préciser « une seule image continue, pas d'écran partagé ».
4. Image IA : nommer une matière (ex. « lait ») fait apparaître son contenant (un pichet). Verrouiller le cadre et interdire l'objet en trop.
5. Vidéo IA : les repères de temps entre crochets (« [3s] ») figent le sujet. Écrire en prose continue avec des phrases anti-gel (« ne s'arrête jamais, ne flotte pas, ne se fige pas »). Juger un clip sur des images extraites, jamais sur la vignette.
6. Le mode de qualité de la vidéo doit être explicite.

**Ce que ce travail suppose, selon l'auteur** : moteur de défilement écrit à la main, chaîne d'images, chaîne de vidéos vérifiées image par image, encodage des vidéos, sections, plan sonore, mise en ligne (ici Vercel). C'est un projet long et coûteux.

**Pour QuenTools** : jamais une priorité sans demande d'un client. Si un client veut un site « spectaculaire », se rappeler que le défilement piloté et les vidéos lourdes pèsent sur les téléphones, l'accessibilité (respecter `prefers-reduced-motion`) et le budget, et rester fidèle à « pas d'application complexe » : ce serait un site, sur devis, avec ces contraintes dites au client. Notre téléphone 3D du template réparateur est déjà un exemple léger de la même famille d'idées.

## Trois autres guides du même auteur (DOC MO, 2026) : Smash, Explosion, Obsidian
Le guide RÖSTWERK a été reçu deux fois (même fichier). Même logique pour les quatre : un « teaser » gratuit, le détail est vendu ou réservé ; on retient les méthodes, pas les textes.

**Smash (burger qui explose et se reconstruit) : défilement par suite d'images**
- Technique « canvas » : une section collante contient un `<canvas>` ; la progression du défilement (0 à 1) devient un numéro d'image (`Math.round(progression × (nb − 1))`) et on dessine l'image avec `drawImage`. Pas de balise vidéo, donc pas de blocage de lecture. Variante de la technique « vidéo pilotée » du guide RÖSTWERK : images = fluide mais lourd ; vidéo en images clés = plus léger mais plus délicat.
- **Deux suites d'images indépendantes** : 200 images pour l'ordinateur (1928×1076) et 100 pour le mobile (1080×602), pas une suite réduite. Le dossier public est passé de 119 Mo à 30 Mo avant la mise en ligne (images en double, documents de travail, dossier audio inutilisé supprimés).
- Récit en une seule montée : 8 clips IA enchaînés, la dernière image de chacun sert de départ au suivant, résultat vu comme 12 secondes continues.
- Pièges : (1) ne montrer qu'une main gantée plutôt qu'un visage : les mains dérivent beaucoup moins d'une génération à l'autre ; (2) un objet qui apparaît sans avoir été montré avant « sort de nulle part » : prévoir une image de recul qui le montre déjà en place ; (3) demander « tout flotte dans l'air » depuis une image où les objets sont posés ajoute des doubles flottants : écrire que la surface est maintenant vide et « exactement un de chaque » ; (4) **restes d'un modèle cloné** (étiquettes erronées, vidéo d'ambiance qui se lance par-dessus la vraie) découverts après la mise en ligne : faire un audit « résidus » avant de publier.
- Animations de l'interface : trois couches seulement (défilement, animation au clic d'un configurateur, apparitions au défilement avec observation qui s'arrête après la première entrée). Le son a été retiré volontairement (écran « Scroll now », rien à débloquer).

**Explosion (restaurant PRIME, fictif) : même système, pensé mobile d'abord**
- « Flip-book » : environ 200 images préchargées en mémoire avant d'afficher quoi que ce soit, canvas plein écran en cover. Le défilement tactile produit les mêmes événements que la molette : il n'y a pas de version mobile séparée, la mise en page se règle en unités relatives (vh, %). Règle : **concevoir en responsive dès la première image**, jamais corriger le mobile à la fin. À nuancer : le guide Smash, lui, a dû préparer une suite d'images dédiée au mobile pour le poids.
- Sept sections qui chacune font une seule chose (carte, héros animé, anatomie du produit, thermomètre animé en SVG, configurateur, défilement horizontal des ingrédients, histoire + bouton de contact). Éléments très « partageables » : un thermomètre de grill animé (SVG, `stroke-dashoffset`), un configurateur qui reconstruit le produit en direct.
- Le son sur défilement : des petits mp3 déclenchés à des seuils d'images (nécessite l'accord du visiteur avant lecture).
- **Photos produit par IA** : formule universelle = sujet + détail clé, surface (ardoise noire, marbre, fonte), un seul projecteur dramatique au-dessus, atmosphère (fumée, vapeur, condensation), fond noir cinématographique, rendu photo éditorial. Mêmes surface et éclairage sur toute la série : c'est ce qui fait « éditorial » plutôt qu'« aléatoire ». Régler « haute fidélité » avant de générer les gros plans. Règle personnelle à garder : **pour un vrai commerce, ne jamais présenter des images IA comme les vrais plats ou produits du client** (publicité trompeuse) ; réserver ces images aux exemples fictifs ou à des ambiances.
- Chiffres que l'auteur annonce : 6 à 8 h pour tout construire, environ 20 $/mois d'outils, 12 $/an de domaine ; prix demandé aux clients de 2 500 à 5 000 € (agence : 8 000 à 15 000 €). Ce sont des affirmations de l'auteur, non vérifiées ; elles ne changent pas nos tarifs (voir TARIFS.md : pas de projet de cette envergure).

**Obsidian (héros vidéo d'une voiture qui s'assemble) : film de 22 s, sans défilement**
- Cinq clips IA de 3 à 5 s, sept images clés : chaque clip reçoit la dernière image du précédent ; une image de départ et une d'arrivée permettent des transformations (roues → voiture) dans un seul clip.
- **Ancre de référence** : épingler une image de référence de l'objet (la voiture) dans un décor fixe pour qu'il reste identique d'une génération à l'autre (couleur, jantes), sinon le modèle le réinvente à chaque fois.
- **Montage** : couper sur un mouvement, jamais sur un instant immobile ; une seule étalonnage de couleur pour tous les clips (l'écart de couleur trahit des générations différentes) ; accélérer ou ralentir pour que la fin respire ; durée d'environ 22 s pour pouvoir boucler.
- **Export pour le web** : master 4K/60 i/s HEVC gardé en archive, version du site en 1080p/30 i/s H.264 (environ 16 Mo) pour démarrer sans saccade. Un rendu net dans le logiciel de montage mais flou sur le site vient presque toujours de l'export.
- Pièges : sens de déplacement incohérent entre deux clips (voiture qui semble faire marche arrière à la coupe) ; détourage impossible sur une image claire où le sujet, le ciel et la mer ont le même ton (n'accepter le détourage que sur fond sombre de studio).

## Synthèse pour QuenTools
1. **Poids et téléphones d'abord** : toute scène animée a une version mobile plus légère, vérifiée sur vrai téléphone ; respecter `prefers-reduced-motion` ; jamais de lecture automatique lourde sans mesure du poids.
2. **Ce que nous savons déjà faire sans coût** : page unique en HTML simple, progression de défilement 0 à 1, animations légères en SVG (le thermomètre est une idée facile à reprendre pour un exemple), configurateur à réponse immédiate (nos templates en ont).
3. **Avant toute publication d'un site dérivé d'un modèle** : auditer les restes du modèle (textes, libellés, médias, scripts qui se lancent) et le poids du dossier (supprimer les doublons).
4. **Contenu IA** : acceptable pour des exemples fictifs signalés comme tels ; pas pour de fausses photos de produits réels d'un client, ni de faux avis.
5. **Offre** : ces sites « cinématiques » existent chez d'autres à 2 500 € et plus. Notre positionnement reste le français, le suivi et le sur-mesure ciblé ; ne pas s'aligner sur ce créneau sans demande, et sans le chiffrer sur devis avec les contraintes ci-dessus.

## Dix guides de plus (Nike, Villa, Chronos, Noir Brew, Chanel, Brace Pizza, Cosmos, Echoes, Sultan Al-Oud, Coca-Cola)
Les dix autres guides du même auteur ont été lus ; les doublons (Smash, Obsidian, Explosion, Roestwerk, Villa) ont été ignorés. **La synthèse exploitable et les recettes sont dans `design/CINEMATIQUE.md`**, avec un moteur testé (`assets/qt-scroll.js`) et une démonstration (`demo/cinematique/`).

Points marquants, en plus de ce qui précède :
- **Villa et Chronos** : la suite d'images vient de 3 à 5 clips (images de départ et d'arrivée), extraite par ffmpeg ; chapitres (labels) liés à des plages de progression ; Chronos : 200 images ordinateur, 100 images mobile (une sur deux, autre dossier) pour éviter le plantage de mémoire sur téléphone ; canvas masqué jusqu'au chargement ; unités et chiffres dans un prompt vidéo s'impriment à l'image.
- **Noir Brew et Nike** : le diaporama « Coffee Drift » (trois couches, huit pièges) ; produits par IA détourés (rembg) et remplissage des zones fermées pour les lacets.
- **Brace Pizza** : une seule page HTML, suite de 242 images à 8 i/s, configurateur dont les miniatures volent vers le prix, viseur « REC » ; prompt vidéo en six temps (sujet, action, décor, caméra, style, suffixe qualité).
- **Cosmos** : canvas 2D sans WebGL, boucle d'animation protégée, six pièges de canvas.
- **Echoes** : vidéo à fond transparent (chaîne blanc → masque → ProRes 4444 → VP9 + HEVC, deux `<source>`).
- **Chanel, Sultan, Coca-Cola** : publicités verticales de 12 à 27 s : images clés chaînées, un mouvement de caméra par clip, bruitages calés à l'image, montage sur les temps forts ; ligne de temps seconde par seconde pour un sujet unique ; garder la même lumière nommée et les mêmes indices de réfraction sur toute la série.
- **Tous** : l'auteur vend ces réalisations (entonnoir « commenter un mot-clé, recevoir le guide gratuit »). Prix annoncés par lui : 2 500 à 5 000 € pour un site, 15 000 à 50 000 € « en studio » pour une publicité : affirmations non vérifiées, sans effet sur nos tarifs.
