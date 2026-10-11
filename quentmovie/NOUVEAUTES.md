# Nouveautés de QuentMovie

Chaque section devient le texte affiché dans l'application quand la mise à jour est proposée.
Changer aussi `version` dans `package.json` : une version déjà publiée n'est pas republiée.

## 1.7.0
- Voix naturelles intégrées (Siwis, Tom, Jessica, Pierre) pour le générateur : elles se téléchargent toutes seules au premier usage puis marchent sans internet. Les voix « Premium » du Mac sont aussi reconnues (★), avec un bouton qui ouvre directement les réglages pour les installer. Bouton « Écouter » avec la vraie voix.
- Sous-titres automatiques : QuentMovie écoute ta voix et écrit les sous-titres au bon moment, en phrases ou mot à mot façon TikTok (gros, au centre). Sur un clip, sur toute la vidéo, ou automatiquement après chaque prise du studio.
- Coupe des blancs et des « euh » : seuls les moments où tu parles sont gardés, les sous-titres et les animations suivent.
- Miniature : une image de ta vidéo, un gros titre, toi détouré avec un contour, une pastille ; enregistrée en JPEG prête pour YouTube ou TikTok.
- Piste vidéo 2 : image dans l'image (rond, coins arrondis, bordure, n'importe où à l'écran) et plans de coupe plein écran, avec ou sans leur son.
- Générateur : le texte raconte davantage l'histoire du sujet, chaque partie a son titre à l'écran (« Les débuts », « Le Bibendum »…) et les dates s'affichent ; chaque scène reçoit l'image qui correspond le mieux à ce qui est dit.
- Les voix « gadget » d'Apple (Eddy, Flo, Grandma, Rocko…), robotiques et presque identiques, ne sont plus proposées.
- Studio : l'enregistrement est compressé par la puce vidéo du Mac, l'image reste fluide pendant que tu filmes ; la prise est prête presque tout de suite.
- Export beaucoup plus rapide avec la puce vidéo du Mac (réglage par défaut).
- Fluidité sur macOS 26 et les Mac récents (M5) : nouvelle version du moteur de fenêtre (Electron 43), qui corrige les ralentissements de macOS 26.
- Médias : « Supprimer les inutilisés » et « Tout supprimer » d'un coup.

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
