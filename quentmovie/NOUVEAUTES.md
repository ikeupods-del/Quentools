# Nouveautés de QuentMovie

Chaque section devient le texte affiché dans l'application quand la mise à jour est proposée.
Changer aussi `version` dans `package.json` : une version déjà publiée n'est pas republiée.

## 1.19.0
- Partage d’écran du studio réparé : l’écran s’affiche vraiment (il restait mal placé) et, si macOS ne laisse voir qu’un écran noir, QuentMovie le dit clairement et ouvre les réglages « Enregistrement de l’écran » pour autoriser l’application.
- BREAKING NEWS devient un vrai générique d’édition spéciale de 7 secondes (globe, titre qui entre, bandeau « EN DIRECT » qui défile) avec sa musique originale ; touche B.
- Les animations restantes ont un nouveau relief (ombre portée) et de meilleurs sons.
- Animations retirées du studio : cercle, glisse vers le haut, flèche, content, énervé, choqué, triste, amoureux, mort de rire, 100 %, bravo, feu, idée, nouvelle vidéo, flash info et live.

## 1.18.0
- L’assistant (⌘K) comprend beaucoup plus de demandes : « supprime le dernier clip », « ajoute un bruit de clavier » (ou applaudissements, whoosh, jackpot, sirène…), « coupe à 1:30 », « mets le volume à 50 % », « coupe le son », « ajoute un fondu au début et à la fin ».
- Correction : « supprime les blancs » est maintenant compris comme « coupe les blancs » (il était pris pour une interdiction).
- Contrôles de robustesse : tous les outils, toutes les demandes de l’assistant et toutes les touches d’animation du studio sont parcourus automatiquement avant chaque publication.

## 1.17.0
- 15 nouveaux bruitages pour le studio et le montage : hausse, baisse, krach de la bourse, jackpot, riche, trombone de l’échec, joie, tristesse, colère, amour, choc, fanfare, ta-dam, édition spéciale et sirène. Les animations « Me filmer » les jouent automatiquement (hausse, baisse, jackpot, riche, pauvre, humeurs, Breaking news…).
- L’IA a une mémoire : dis à l’assistant (⌘K) « retiens que… » (ou « oublie… », « que retiens-tu ? ») et elle en tient compte à chaque demande ; les titres de chapitres que tu corriges sont appris comme exemples. La mémoire est partagée avec Studio Posts et Studio Sites.

## 1.16.1
- Envoi par AirDrop : un bouton « Envoyer par AirDrop » sur la fenêtre de fin d’export, après la création des clips TikTok et pour la miniature ouvre le partage du Mac (AirDrop, Messages, Mail…).

## 1.16.0
- « Me filmer » : un seul panneau regroupe toutes les animations à l’écran (S’abonner, J’aime, Cloche, Lien en bio…), classées par thèmes. Chacune se déclenche d’une touche du clavier, et tu peux choisir tes propres touches.
- 33 nouvelles animations : « Breaking news » avec son mini générique, Flash info, Exclusif, humeurs (content, énervé, triste, choqué, amoureux, cool…), argent (riche, pauvre, hausse, baisse, 100 %…), applaudissements, bravo, alerte, « À suivre »… Chaque animation a son petit son.
- Le partage d’écran se déplace et se redimensionne à la souris pendant la prise.
- Pré-montage dès la fin de la prise : coupe des blancs et des « euh », sous-titres et volume en un clic, pour gagner du temps avant le montage.

## 1.15.1
- Les vidéos HDR (iPhone, appareils récents) sont reconnues et converties en image classique : plus de couleurs ternes à l’aperçu et à l’export.
- Export de montages avec beaucoup de fondus enchaînés (diaporamas de dizaines de photos) jusqu’à dix fois plus rapide : les enchaînements longs sont coupés en morceaux encodés en même temps.
- Les vignettes de l’effet « Améliorer la qualité » s’affichent à nouveau.

## 1.15.0
- Export plus rapide quand le montage a des fondus enchaînés ou des incrustations (piste vidéo 2) : seules ces parties sont réencodées, le reste des clips est recopié tel quel, sans perte. Le son des pistes audio est préparé en même temps. En cas de doute, QuentMovie repart sur l’ancienne méthode, toujours sûre.
- Chapitrer la vidéo (Outils ou assistant « chapitre ma vidéo ») : l’IA écoute la vidéo, propose les parties avec leur titre, tu corriges, puis QuentMovie pose les repères, la liste pour YouTube et, si tu veux, le titre qui s’écrit à l’écran avec le bruit de clavier.
- Clips TikTok (Outils ou assistant « crée des clips pour TikTok ») : l’IA trouve les meilleurs passages de la vidéo (accroche forte, idée complète) et en fait des vidéos verticales avec sous-titres TikTok et titre d’accroche, rangées dans tes exports.
- L’assistant sait monter une vidéo seul : « monte ma vidéo » enchaîne les étapes utiles à ce montage (plans, blancs, sous-titres, volume, musique, transitions, chapitres).
- Couper (S) coupe aussi le son détaché du clip ; le sous-titre, le titre et les calques suivent chacun leur morceau (avant, ils restaient décalés après une coupe).
- Supprimer un clip retire son son détaché et recolle la suite : sons, incrustations et repères restent calés sur l’image.

## 1.14.0
- Export beaucoup plus rapide sur ton MacBook Air : les vidéos sont lues par la puce vidéo du Mac (même les vidéos d'iPhone en 4K), plusieurs clips sont encodés en même temps, et les clips qui n'ont pas changé depuis le dernier export sont repris tels quels (seuls les clips modifiés sont recalculés). La fenêtre d'export indique le temps mis.
- Nouveau choix d'export « Puce vidéo du Mac : qualité maximale » : image plus fine, presque aussi rapide. L'export ProRes (.mov) utilise le moteur ProRes de la puce.
- Me filmer, « Afficher en direct » : montre une image ou une vidéo de tes médias (touche M), des textes qui défilent un par un (touche T), ton logo en permanence (touche O), ou partage l'écran de ton Mac (touche E). Tout apparaît en direct, et après la prise tout est ajouté au bon moment : calques sur ta prise, écran partagé dans la piste vidéo 2.
- Ajouter un titre marche tout le temps : clique sur un titre et il va sur le clip sélectionné, ou sur celui sous la tête de lecture ; timeline vide, un écran titre est créé. Le champ de texte s'ouvre à droite, prêt à écrire.
- Tout se glisse dans la timeline : titres, titres de reportage, écrans prêts, transitions (côté gauche ou droit d'un clip), musiques et bruitages (à l'endroit où tu les lâches), autocollants, calques, décors, looks et effets. Une vidéo lâchée sur la moitié gauche d'un clip se place avant lui.
- Double-clic sur un média pour l'ajouter à la timeline.
- Les listes des onglets Titres, Effets, Calques… ne sont plus coupées, et chaque onglet s'ouvre en haut de sa liste.
- La timeline prend toute la largeur de la fenêtre.
- Plus de fenêtre bloquante « Sélectionne d'abord un clip » : un message clair s'affiche au-dessus de la timeline.

## 1.13.1
- Bouton Pause pendant que tu te filmes (studio « Me filmer ») : « ⏸ Pause » arrête l'enregistrement sans finir la prise, « ▶ Reprendre » repart au même endroit ; rien n'est enregistré pendant la pause, le chrono s'arrête et le prompteur aussi. Touche P. Une seule vidéo à la fin, sans le temps de pause.
- Même bouton Pause pour l'enregistrement de voix off (onglet Outils).

## 1.13.0
- Nouvelle interface façon logiciel de montage pro (Final Cut, Premiere) : barre d'outils à icônes, rail d'onglets vertical à gauche, visionneuse avec barre de contrôle, timeline sombre avec en-têtes de pistes, sélection en jaune, inspecteur avec l'aperçu du clip choisi.
- Outils de montage pro : outil Lame (B) qui coupe là où tu cliques, outil Sélection (A), magnétisme activable (N) ; chaque piste se coupe (muet), se masque ou se verrouille depuis son en-tête ; grille des tiers (G) et zones de sécurité TikTok/YouTube sur la visionneuse ; vumètre du son pendant la lecture.
- Repères nommés et chapitres YouTube : double-clique sur un repère pour le nommer, puis « Chapitres YouTube » (onglet Outils) prépare la liste à coller dans la description.
- Assistant de montage (bouton « Assistant » ou ⌘K) : dis ce que tu veux en français (« coupe les blancs, ajoute des sous-titres façon TikTok et une musique calme, passe en vertical ») ; l'assistant prépare les étapes, tu les vérifies et les coches, puis il les fait pour toi. Tout s'annule avec ⌘Z. Il propose aussi des améliorations adaptées à ton montage, à appliquer en un clic.
- Textes de publication : titre (3 propositions), description et hashtags écrits à partir du contenu de ta vidéo, pour YouTube, TikTok ou Instagram, avec un bouton « Copier » pour chacun.
- Générateur de vidéos, sujets libres : avec « S'appuyer sur Wikipédia », l'IA reçoit les résumés des articles les plus proches de ton sujet et s'en sert comme faits vérifiés : textes plus justes et plus précis. Les articles utilisés sont cités au générique.

## 1.12.0
- Générateur de vidéos, photos : six banques de photos gratuites au lieu d'une. Sans rien faire : Wikimedia Commons, Openverse (Flickr, musées…) et la NASA (domaine public). Avec une clé gratuite que tu colles dans l'application (« Banques de photos gratuites », dans les options du générateur ; la clé reste sur ton Mac) : Pexels, Pixabay et Unsplash, très belles photos pour les sujets de tous les jours. Chaque banque se coche ou se décoche ; une banque en panne est simplement ignorée. Les auteurs et licences de chaque photo sont repris au générique, avec le nom de la banque.
- Générateur de vidéos : les vignettes des photos s'affichent de nouveau (Wikimedia refusait la taille de miniature utilisée). Elles passent maintenant par QuentMovie : taille standard, quatre à la fois, gardées en mémoire pour ne pas être retéléchargées.

## 1.11.0
- Générateur de vidéos, textes : l'IA écrit désormais scène par scène (plan de la vidéo, puis chaque scène avec le plan et la scène précédente sous les yeux), au lieu d'un seul gros bloc. Chaque texte est contrôlé par QuentMovie (phrase complète, vrai français, aucune répétition, aucun chiffre ni nom inventé) et réécrit plus sagement s'il est refusé ; en dernier recours, le texte source de Wikipédia est repris tel quel.
- Générateur de vidéos, photos : chaque photo est notée (mots de la scène retrouvés dans son titre, sa description et ses catégories, qualité, définition, cadrage horizontal) ; les cartes, schémas, documents scannés, séries de photos quasi identiques et photos trop petites sont écartés. Sans photo assez pertinente, la scène affiche une carte de titre plutôt qu'une image hors sujet. Les vidéos libres sont facultatives.
- Générateur de vidéos, relecture : le script s'affiche avant toute création. Une carte par scène : photo au choix (propositions, « Autre photo… » avec recherche libre), texte modifiable, « Réécrire » une scène avec une consigne, « Écouter », monter, descendre, retirer. Rien n'est monté avant ta validation.
- Générateur de vidéos, options : type de vidéo (astuces, explication, histoire, tutoriel, présentation d'un service, info rapide), public, ton, rythme, tutoiement ou vouvoiement, nombre de scènes, accroche et conclusion au choix, mots à utiliser, mots à ne jamais employer (refusés par le programme), appel à l'action ajouté mot pour mot à la fin. Les réglages sont gardés pour la fois suivante.
- Montage : « Détacher le son » est maintenant partout (bouton de la timeline, touche D, clic droit, inspecteur), fonctionne aussi sur un clip accéléré ou ralenti, et se défait avec « Rattacher le son ». Le son détaché se coupe avec S. La forme d'onde du son apparaît sous chaque vidéo.
- Aide au montage (onglet Outils) : découpe automatique aux changements de plan d'une longue vidéo ; tempo de la musique trouvé tout seul, avec repères posés sur les temps et photos calées sur le temps fort (tous les 1, 2, 4 ou 8 temps) ; égalisation du volume de tous les clips ; une transition sur toutes les coupures en un clic ; « Dynamiser » : un plan sur deux légèrement zoomé pour donner du rythme à une vidéo parlée.
- Sons de la timeline : poignées aux deux bouts pour raccourcir ou rallonger sans déplacer le son, et aimantation (le début ou la fin se colle à la tête de lecture, aux bords des clips, aux repères et aux autres sons, trait jaune à l'écran ; ⌥ pour éviter).
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
