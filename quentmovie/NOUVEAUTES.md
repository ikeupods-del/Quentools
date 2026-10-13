# Nouveautés de QuentMovie

Chaque section devient le texte affiché dans l'application quand la mise à jour est proposée.
Changer aussi `version` dans `package.json` : une version déjà publiée n'est pas republiée.

## 1.35.1
- **Couper un clip qui porte un titre** : le titre continue sur la deuxième moitié, exactement là où il en était (son entrée ne se rejoue pas). Pareil pour le texte du clip.
- Deux exports terminés dans la même seconde ne s'écrasent plus : le second est enregistré à côté (« …-2 »).

## 1.35.0
- **Montage à la main réparé** : après avoir touché un curseur de l'inspecteur (début, fin, vitesse, volume…), la timeline se figeait, la coupe (S, ⌘B), I et O ne marchaient plus et ⌘Z semblait ne rien faire. C'est corrigé, et les projets déjà enregistrés sont réparés tout seuls à l'ouverture.
- **Le son reste calé sur l'image** : raccourcir un clip (I, O, bords), le déplacer, le dupliquer ou en insérer un fait suivre les sons détachés, la piste vidéo 2 et les titres. Après une transition, les sons et titres ne tombent plus trop tôt dans la vidéo exportée.
- **Lecture rapide plus fidèle** : elle passe au clip suivant à l'image près (on ne voit plus les passages coupés), respecte le volume des clips et joue le bon passage des sons coupés ou accélérés.
- ⌘Z est bien enregistré (le clip récupéré ne disparaît plus au redémarrage) ; « Nouveau projet » repart vraiment de zéro ; une piste verrouillée ne se modifie plus au clavier ; plus de son en double avec un son détaché ; un titre sélectionné n'est plus effacé à la place d'un clip ; le fondu de sortie d'un bruitage se fait à sa fin.

## 1.34.0
- **Nouvelle piste « Titres » (T)**, en haut de la timeline : les titres ne dépendent plus des clips. Clique un modèle de l'onglet Titres (ou ＋ dans l'en-tête de la piste) : il se pose à la tête de lecture. Écris ton texte à droite, glisse le bloc pour le déplacer, étire ses bords pour changer sa durée (il s'aimante aux coupes et aux repères). Un titre peut passer par-dessus une coupe entre deux clips.
- Les titres de la piste s'affichent aussi dans la lecture immédiate et dans l'aperçu, et l'œil de la piste permet de les masquer.
- Les écrans plein cadre (générique, compte à rebours, chapitre façon vlog…) se posent toujours sur un fond, comme avant.

## 1.33.0
- **Musique enfin sous la voix** : le niveau de la musique est maintenant calculé par rapport à la voix de la vidéo (environ 18 dB en dessous), quel que soit le fichier de musique. Le curseur de volume reste un réglage autour de ce niveau. Fini la musique « de fond » plus forte que la voix.
- **Bruitages à leur place** : les bruitages des packs sont calés un peu sous la voix, jamais posés au milieu d'une phrase, et espacés d'au moins 6 secondes.
- **Montage qui a du sens** : quand les blancs ont été coupés dans une même prise, ces petites coupes ne reçoivent plus de transition, d'effet de coupe ni de bruitage. Les packs et « transitions partout » ne décorent que les vrais changements de plan.

## 1.32.0
- **Export jusqu'à 50 fois plus rapide avec les packs** : les transitions des packs (whip pan, zoom punch, zoom doux, glissé doux, iris, volet diagonal, glitch, secousse, stores, damier, rideau, balayage…) sont maintenant calculées par des filtres rapides, avec le même rendu. Un zoom doux en 1080p passe d'environ 26 secondes à moins d'une seconde.
- **Assemblage rapide plus souvent** : les montages qui mélangent vidéos, photos et sons avec pochette ne refont plus tout le montage à l'export.
- **Moins de batterie** : sur batterie, l'aperçu calculé en arrière-plan attend un peu plus après chaque modification, s'arrête quand la fenêtre est cachée et tourne en priorité basse (le Mac l'envoie sur ses cœurs économes).
- **Analyse de l'image et du son** : en plus du sujet, l'analyse mesure les changements de plan, la luminosité, le niveau sonore et la part de blancs, et propose de corriger en un clic (niveau du son, couper les blancs, éclaircir l'image, dynamiser). Les chapitres se calent sur les vrais changements de plan.
- Les 29 packs sont maintenant vérifiés un par un à chaque version : appliqués puis exportés pour de vrai.

## 1.31.0
- **Chapitres et titres visibles tout de suite** : juste après un montage par l'IA, la lecture immédiate affiche maintenant les titres (le nom du chapitre s'écrit sur l'écran noir) et joue les sons (souffle, clavier, clic). Avant, l'écran restait noir et muet tant que l'aperçu complet n'était pas prêt.

## 1.30.0
- **Beaucoup moins de batterie** : quand la fenêtre de QuentMovie passe derrière une autre ou est réduite, l’application se met au ralenti au lieu de continuer à tout calculer. Elle reste à pleine vitesse uniquement quand le studio caméra est ouvert, pour ne rien perdre d’un enregistrement. Les exports continuent normalement en arrière-plan.

## 1.29.0
- **Vrai chapitrage façon vlog** : chaque chapitre commence par un écran noir avec « CHAPITRE 02 » en petites lettres dorées, le nom du chapitre qui s’écrit au clavier et un trait doré qui s’étire. Un souffle accompagne l’arrivée de l’écran, le bruit de clavier suit l’écriture et un petit clic marque la fin. C’est maintenant le mode proposé par défaut (les autres modes restent disponibles).
- Nouveau modèle de titre « Chapitre vlog (écran noir, titre qui s’écrit) » dans l’onglet Titres, utilisable à la main.

## 1.28.0
- **L’IA analyse maintenant ta vidéo avant de monter.** Elle lit ce qui est dit (début, milieu et fin), comprend le sujet, le public visé et les idées fortes, puis une carte « Ce que j’ai compris de la vidéo » s’affiche dans le chapitrage et dans les clips TikTok.
- **Chapitres plus justes** : les titres sont écrits en restant dans le sujet de la vidéo.
- **Clips TikTok plus pertinents** : les passages qui portent vraiment le sujet sont favorisés, et l’IA les choisit en connaissant le sujet.
- **Style de montage conseillé** : selon le genre reconnu (bourse, économie, crypto, tuto, podcast, voyage, cuisine, sport, gaming, tech…), un bouton « Monter dans le style… » pose le pack qui convient (transitions, effets de coupe, sons, look).
- Dans l’assistant (⌘K), « analyse ma vidéo » ouvre cette analyse.
- **Montage selon le sujet** (assistant ⌘K : « monte ma vidéo selon son sujet », ou suggestion de l’assistant) : l’IA analyse la parole puis pose le style de pack du genre reconnu, une musique adaptée (baissée quand on parle) et égalise le volume.
- **Export corrigé** : si un clip pointe vers une prise du studio déjà convertie, elle est retrouvée toute seule ; si un fichier a vraiment disparu, le message dit lequel et quoi faire (au lieu d’une erreur technique).
- **Export bien plus rapide pour les longues vidéos** : un long clip simple (par exemple une prise de 30 minutes avec sous-titres) est découpé en morceaux d’environ 2 minutes encodés en même temps par la puce du Mac, puis recollés sans réencoder. Au prochain export, seuls les morceaux modifiés sont refaits.
- Sans l’IA installée, le programme déduit quand même le genre, les mots-clés et le rythme de parole.

## 1.27.0
- **Animations du studio refaites** : liseré blanc façon autocollant et ombre portée, sons mieux choisis (message, clic, alerte de marché…).
- **Pack sound design** : 23 sons (passages léger, moyen et lourd, passage inversé, montées de 1, 3 et 6 secondes, impacts sec, boom et métallique, braam de cinéma, accord de tension, battement sourd, sons d’interface, jingles positif et négatif…).
- **26 icônes autocollants** (lieu, appareil photo, micro, lecture, idée, fusée, trophée, euro, graphiques en hausse et en baisse, bouclier, couronne, flamme, loupe, cadenas, engrenage, Wi-Fi, courrier, horloge, calendrier, drapeau, livre, diamant, maison, avion en papier, ON AIR) dans l’onglet Stickers.
- **8 looks pour les packs** (éclat réseaux, peau dorée, net et propre, studio podcast, finance froide, voyage clair, sport punch, cérémonie douce) et **3 musiques** (corporate lumineux, documentaire doux, thème de podcast), rattachés aux packs.
- **Partage d’écran en plein écran avec ta caméra dans une bulle.** Dans le studio, « Partage d’écran » propose maintenant « Plein écran + ma caméra en bulle » : ton écran remplit l’image et ta caméra (avec ton fond virtuel) apparaît dans un rond. Choisis le coin et la taille de la bulle, ou glisse-la et tire le rond jaune pendant la prise. Dans la timeline, l’écran et la bulle sont deux éléments de la piste vidéo 2, modifiables.
- **Mouvements de caméra pro** : poussée douce, dérive lente, caméra à l’épaule, orbite, zoom rebond, roulis. **Effets cinéma** : bandes cinéma, halation, lueur dorée, pellicule 16 mm, contraste cinéma, flash au rythme.
- **Sept nouvelles animations de texte** : montée avec rebond, descente, rebond, balayage, clignotant, tremblement, respiration.
- Sept **modèles de texte animés** prêts à l’emploi dans l’onglet Titres (accroche jaune qui monte, titre qui rebondit, balayage, choc, étiquette clignotante, respiration, descente) et une **recherche** dans l’onglet Packs.
- Chaque pack propose « titres d’ouverture et de fin » : le premier titre du pack est posé sur le premier clip, un titre de fin sur le dernier.
- Les titres de pack utilisent maintenant leurs polices prévues (Futura, Copperplate, Didot, Impact…) quand tu les ajoutes depuis la bibliothèque.
- Plus léger pour le MacBook Air : les aperçus du pack ne se calculent que lorsqu’ils sont visibles, les vidéos d’aperçu ne se préchargent pas, et quelques effets ont moins de filtres.

## 1.25.0
- **Bourse et économie** nettement enrichies. Six nouveaux titres animés : courbe en aire qui se dessine (avec la variation en %), classement en barres horizontales, gros chiffre qui défile jusqu’à sa valeur, carte de définition (ETF, PER, inflation…), jauge de niveau de risque de 1 à 5 et barre de progression vers un objectif.
- Nouveau pack **Finance perso et épargne** ; les packs Bourse, Économie, Crypto et Entrepreneur reçoivent les nouveaux titres, quatre sons de marché (cloche de fermeture, alerte, tracé de graphique, chiffres qui défilent) et, pour les épisodes audio, une pochette et un visualiseur aux couleurs de la bourse.
- Deux fonds de bourse : bougies japonaises fixes (16:9 et vertical) et bougies qui défilent en boucle (animé).

## 1.24.0
- **Vlogs et podcasts nettement enrichis.** Vlog : intro avec grand nom du lieu, trajet « départ → arrivée » qui se dessine, date et heure façon caméscope, « en ce moment » avec égaliseur animé, grain de pellicule 16 mm et rayons de fenêtre posés sur tous les clips en un clic, bips de début et de fin d’enregistrement, son d’apparition de titre. Podcast : carte de question, chapitres horodatés qui apparaissent un à un, grande citation de l’invité, bandeau « Écoute-nous sur… », jingle court et ambiance de studio.
- Nouveau pack **Podcast audio (audiogram)** et quatre **pochettes d’épisode** (orange, violet et rose, sable, nuit étoilée) en 16:9 et en vertical, posées derrière le visualiseur sonore par les packs podcast. Deux nouveaux visualiseurs : barres en miroir et spectre coloré.

## 1.23.0
- Cinq nouveaux packs « Style de vie » : **Mode et beauté**, **Immobilier et visite**, **Santé et bien-être**, **École et cours**, **Église et spiritualité**, soit 27 packs au total.
- Six nouveaux titres animés : carte de prix, pastilles de caractéristiques (T3, 68 m², balcon…), liste à puces qui apparaît ligne par ligne, verset ou citation avec filets dorés, pastille de promotion, et mention « pas un avis médical ».

## 1.22.0
- **Pack sous-titres** (onglet Packs, en haut) : douze styles de sous-titres, dont huit « pro » — Hormozi (capitales, jaune et blanc), néon, mot sur boîte blanche, mot sur boîte rouge, feutre jaune, gaming, cinéma et minimal. Chaque style a son aperçu ; un clic l’applique à tous les clips qui ont des sous-titres. Pour un rendu mot à mot, choisis le style avant de lancer « ✨ Sous-titres automatiques » (il est aussi proposé dans l’inspecteur et dans l’assistant ⌘K).

## 1.21.0
- Cinq **packs Vlog** dans l’onglet Packs : Voyage, Quotidien, Food, Sport et énergie, Ville de nuit. Chaque pack pose sur tes coupes des transitions douces, un effet de lumière et un son léger, avec en option le look du pack et une musique de fond qui baisse quand tu parles.
- Six packs supplémentaires : **Podcast Interview**, **Podcast Culture et récit** (avec visualiseur sonore pour les épisodes audio), **Tuto et formation**, **Entreprise et corporate**, **Mariage et événement** et **Gaming et stream**, 
- Cinq packs **Tech et finance** : Tech et high-tech, Économie et actualité, Bourse et investissement, Crypto et web3, Entrepreneur et business. Cartes de cours en hausse et en baisse, bandeau des marchés défilant, histogramme animé, viseur lumineux, mention « pas un conseil en investissement », balayage numérique, grille et flux de données, cloche d’ouverture des marchés. Soit 22 packs au total.
- Chaque pack a sa vitrine : image de couverture, transitions qui s’animent au survol, titres animés rendus avec les vraies polices, sons à écouter.
- Huit titres animés de plus : épisode, carte d’invité, partenaire, pastille d’abonnement, rubrique, étape numérotée, astuce et gros chiffre ; les titres entrent avec un léger rebond, ligne après ligne. Quatre jingles de podcast originaux (introduction, fin, rubrique, ping).
- Quatre titres de vlog : « JOUR 3 » avec le lieu, nom du lieu en bas à gauche, point REC avec chronomètre de caméscope, et numéro de chapitre.
- Trois nouvelles transitions douces (glissé doux, zoom doux, fondu lumineux), deux nouveaux effets de coupe (reflet de soleil doré, fuite de lumière bleue) et six sons de vlog (cordes pincées, souffle, clic, cloche, page qui tourne).

## 1.20.0
- Nouvel onglet **Packs** (touche 0) : six packs de montage comme sur Premiere Pro — Cinéma, Réseaux sociaux, Glitch, Impact, Journal télé, Doux et lifestyle. Un clic sur « Appliquer » pose sur toutes les coupes les transitions du pack, un effet de coupe (fuite de lumière, flash, reflet, onde de choc…) et un bruitage centré sur le raccord ; le look du pack est en option. Tout s’annule avec ⌘Z.
- Transitions refaites avec du flou de mouvement : whip pan (gauche, droite, haut), zoom punch, secousse, glitch RVB, fondu flouté, iris et volet à bords doux.
- 11 effets de coupe en vraie image 16:9 (fuites de lumière chaude, rose et dorée, brûlure de pellicule, flashs, reflet anamorphique, onde de choc, rayons, déformation VHS) et 8 bruitages de transition.
- 8 nouveaux titres animés dans les packs (tiers inférieur, @pseudo, étiquette, double barre, titre de film, glitch, impact, cadre fin), avec des polices adaptées.
- Correction du son du générique BREAKING NEWS (notes trop aiguës).

## 1.19.1
- Partage d’écran : sur Mac récent, une fenêtre du système s’ouvre, tu choisis ton écran et tu appuies sur « Autoriser », comme pour la caméra et le micro. Plus besoin d’aller dans les réglages.

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
