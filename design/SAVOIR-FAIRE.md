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
