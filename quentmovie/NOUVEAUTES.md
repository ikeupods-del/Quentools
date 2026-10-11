# Nouveautés de QuentMovie

Chaque section devient le texte affiché dans l'application quand la mise à jour est proposée.
Changer aussi `version` dans `package.json` : une version déjà publiée n'est pas republiée.

## 1.11.0
- Générateur de vidéos, textes : l'IA écrit désormais scène par scène (plan de la vidéo, puis chaque scène avec le plan et la scène précédente sous les yeux), au lieu d'un seul gros bloc. Chaque texte est contrôlé par QuentMovie (phrase complète, vrai français, aucune répétition, aucun chiffre ni nom inventé) et réécrit plus sagement s'il est refusé ; en dernier recours, le texte source de Wikipédia est repris tel quel.
- Générateur de vidéos, photos : chaque photo est notée (mots de la scène retrouvés dans son titre, sa description et ses catégories, qualité, définition, cadrage horizontal) ; les cartes, schémas, documents scannés, séries de photos quasi identiques et photos trop petites sont écartés. Sans photo assez pertinente, la scène affiche une carte de titre plutôt qu'une image hors sujet. Les vidéos libres sont facultatives.
- Générateur de vidéos, relecture : le script s'affiche avant toute création. Une carte par scène : photo au choix (propositions, « Autre photo… » avec recherche libre), texte modifiable, « Réécrire » une scène avec une consigne, « Écouter », monter, descendre, retirer. Rien n'est monté avant ta validation.
- Générateur de vidéos, options : type de vidéo (astuces, explication, histoire, tutoriel, présentation d'un service, info rapide), public, ton, rythme, tutoiement ou vouvoiement, nombre de scènes, accroche et conclusion au choix, mots à utiliser, mots à ne jamais employer (refusés par le programme), appel à l'action ajouté mot pour mot à la fin. Les réglages sont gardés pour la fois suivante.
- Montage : « Détacher le son » est maintenant partout (bouton de la timeline, touche D, clic droit, inspecteur), fonctionne aussi sur un clip accéléré ou ralenti, et se défait avec « Rattacher le son ». Le son détaché se coupe avec S. La forme d'onde du son apparaît sous chaque vidéo.
- Montage : sélection de plusieurs clips (⇧clic, ⌘clic, ⌘A) pour détacher le son, couper le son, changer la vitesse ou le volume, dupliquer ou supprimer d'un coup ; clic droit sur un clip ou un son ; image fixe de 3 secondes à la tête de lecture ; capture de l'image affichée ; zoom et cadrage manuels (jusqu'à 400 %) ; fondus d'entrée et de sortie réglables pour l'image et le son ; vitesses rapides (0,5×, 1×, 1,5×, 2×, 4×).

## 1.10.0
- L'IA fait exactement ce que tu lui demandes : écris tes consignes (« pas d'intro », « pas de conclusion », « tutoie-moi », « sans musique », « sans sous-titres »…) dans le générateur Express ou dans le nouveau champ « Tes consignes » du panneau IA. Elles sont lues et appliquées par QuentMovie lui-même, pas seulement suggérées à l'IA : sans intro, il n'y a ni phrase d'accroche ni écran titre.
- La voix lit comme on parle : « 9h » devient « 9 heures », « 9h30 » « 9 heures 30 », « 5 € » « 5 euros », « 20 % » « 20 pour cent », « 90 km/h », « 1er », « XIXe siècle », « M. », « etc. »… Les sous-titres gardent ton texte tel que tu l'as écrit.
- IA plus économe : elle ne produit plus que ce qui sert (pas d'accroche si tu n'en veux pas, pas de mots-clés d'images si elles ne sont pas cherchées) et sa mémoire de travail est dimensionnée au plus juste : génération plus rapide, moins de mémoire utilisée.

## 1.9.0
- Générateur « Express », comme InVideo : décris ta vidéo en une phrase (« 5 astuces pour un site qui attire des clients »), choisis le format (TikTok, YouTube, carré), la durée et le style, et QuentMovie fait tout : script écrit par l'IA locale, une image ou une vidéo libre trouvée pour chaque scène, voix naturelle, sous-titres façon TikTok, musique. La vidéo arrive montée dans la timeline, tout reste modifiable.
- Sujets libres : l'IA écrit aussi sur des idées, conseils ou présentations qui ne sont pas sur Wikipédia (à relire avant de publier).
- Export plus sûr : le mélange de la voix, de la musique et des sons se fait en étapes simples, il ne peut plus rester bloqué sur « Mixage du son ».

## 1.8.0
- IA locale dans le générateur : « Réécrire avec l'IA » transforme les faits de Wikipédia en vrai script (accroche, titres de parties, conclusion) dans le style choisi (documentaire, TikTok, récit, enfants), sans rien inventer. Elle tourne sur ton Mac, sans internet (téléchargée une fois, environ 2,5 Go).
- Générateur : de vraies vidéos libres (Wikimedia Commons) s'ajoutent aux images quand il y en a sur le sujet.
- Télécharger une vidéo depuis un lien : colle un lien YouTube, TikTok, Instagram, Facebook ou X dans l'onglet Médias (seulement pour des vidéos que tu as le droit de reprendre).
- Lecture immédiate : le bouton Lire démarre tout de suite avec tes fichiers d'origine pendant que l'aperçu avec effets se prépare.
- Qualité de l'aperçu au choix : 360p, 720p, 1080p ou 4K (calculé par la puce vidéo du Mac).
- « 🔊 Détacher le son » d'une vidéo : le son devient un élément à part dans la piste audio (déplacer, couper, régler le volume).
- « ✨ Améliorer la qualité » en un clic (clip ou toute la vidéo) : image débruitée et plus nette, couleurs ravivées, son sans souffle et voix claire.

## 1.7.0
- Correction : l'export pouvait rester bloqué à « Mixage du son » quand une musique baisse automatiquement sous la voix (vidéos du générateur notamment). Le mixage est refait autrement et ne peut plus se figer.
- Voix naturelles intégrées (Siwis, Tom, Jessica, Pierre) pour le générateur : elles se téléchargent toutes seules au premier usage puis marchent sans internet. Les voix « Premium » du Mac sont aussi reconnues (★), avec un bouton qui ouvre directement les réglages pour les installer. Bouton « Écouter » avec la vraie voix.
- Sous-titres automatiques : QuentMovie écoute ta voix et écrit les sous-titres au bon moment, en phrases ou mot à mot façon TikTok (gros, au centre). Sur un clip, sur toute la vidéo, ou automatiquement après chaque prise du studio.
- Les noms comme QuenTools ou QuentMovie sont corrigés tout seuls dans les sous-titres, et tu peux ajouter tes propres corrections (« mot entendu = bon mot »).
- Coupe des blancs et des « euh » : seuls les moments où tu parles sont gardés, les sous-titres et les animations suivent.
- Miniature : une image de ta vidéo, un gros titre, toi détouré avec un contour, une pastille ; enregistrée en JPEG prête pour YouTube ou TikTok.
- Piste vidéo 2 : image dans l'image (rond, coins arrondis, bordure, n'importe où à l'écran) et plans de coupe plein écran, avec ou sans leur son.
- Générateur : le texte raconte davantage l'histoire du sujet, chaque partie a son titre à l'écran (« Les débuts », « Le Bibendum »…) et les dates s'affichent ; chaque scène reçoit l'image qui correspond le mieux à ce qui est dit.
- Les voix « gadget » d'Apple (Eddy, Flo, Grandma, Rocko…), robotiques et presque identiques, ne sont plus proposées.
- Studio : l'enregistrement est compressé par la puce vidéo du Mac, l'image reste fluide pendant que tu filmes ; la prise est prête presque tout de suite.
- Export beaucoup plus rapide avec la puce vidéo du Mac (réglage par défaut).
- Fluidité sur macOS 26 et les Mac récents (M5) : nouvelle version du moteur de fenêtre (Electron 43), qui corrige les ralentissements de macOS 26.
- Médias : « Supprimer les inutilisés » et « Tout supprimer » d'un coup.
- Lecture immédiate : l'aperçu avec effets se prépare tout seul pendant que tu travailles (« ⚡ prêt » à côté de Lire).
- Recadrage auto pour TikTok / Reels : « Passer en vertical et suivre la personne » (Outils), ou « Suivre la personne » sur un clip ; l'image suit la personne au lieu de couper au centre.
- Export en un clic : TikTok/Reels, YouTube, YouTube 4K, Instagram carré, podcast, GIF.
- Timeline plus claire : noms des pistes dans une colonne à gauche, hauteur réglable en tirant sa bordure.

## 1.6.1
- Correction : le générateur de vidéos s'arrêtait avec « spawn Unknown system error -86 » (un outil livré n'était pas fait pour les Mac à puce Apple). Il fonctionne maintenant, tout comme l'import et l'export qui utilisaient ce même outil.
- Studio beaucoup plus fluide : le détourage tourne à part, l'image et le prompteur ne se figent plus.
- Plus de décalage entre toi et le fond : chaque image est affichée avec sa propre découpe.
- Détourage plus fin : l'image est recadrée autour de toi avant le calcul (cheveux, mains, bords plus nets), et les bords sont affinés seulement là où c'est utile.
- Indicateur de vitesse dans « Fond derrière moi » (images par seconde, délai) et choix « Image et découpe » : alignées ou fluide.

## 1.6.0
- Nouveau : « ✨ Générer » (⇧⌘G). Donne un sujet, par exemple « L'histoire de Michelin » : QuentMovie écrit le texte à partir de Wikipédia, trouve des images libres de droits, enregistre la voix off avec les voix françaises du Mac et monte la vidéo (zooms lents, sous-titres, écran titre, musique, générique avec les sources). Tu relis et modifies le texte et les images avant la création.

## 1.5.0
- Correction : les prises du studio qui affichaient « ce fichier n'est pas un média lisible » sont maintenant converties ; si une prise ne peut vraiment pas l'être, elle est gardée dans Films → QuentMovie → prises-a-verifier.
- Détourage beaucoup plus précis (cheveux, bras), contour qui ne tremble plus, les autres personnes derrière toi sont effacées. Réglages : garder plus ou moins, contours, lumière sur toi, teinte.
- Mode « J'ai un vrai fond vert » encore plus net.
- Lumière LED de l'écran pour t'éclairer pendant que tu parles (touche L).
- Animations en direct : touches 1 à 9 pour faire apparaître « S'abonner », « J'aime », la cloche, une flèche, des confettis… et N pour un bandeau avec ton nom ; elles sont ajoutées à la prise.

## 1.4.0
- Studio « Me filmer » : choisis le fond derrière toi en direct, sans fond vert (mur noir au logo QuenTools en LED, décors, arrière-plan flou ou tes photos). Ta silhouette est détourée en direct et la vidéo est enregistrée avec ce fond.

## 1.3.0
- Mises à jour automatiques : les nouvelles versions se téléchargent toutes seules et s'installent au redémarrage, sans réinstaller.
- Menu QuentMovie → « Rechercher les mises à jour… » et carte « Mises à jour » dans l'onglet Outils.

## 1.2.0
- Studio « Me filmer » : caméra et micro du Mac, prompteur qui défile sous la caméra, compte à rebours.
- 34 looks pro, effets animés (lumières, neige, vieux film…), cadres, animations sur fond vert et décors, dont le mur noir au logo QuenTools en LED.
- « Mes packs » pour ajouter des packs gratuits trouvés sur internet.
- 28 bruitages et 3 musiques de plus.
