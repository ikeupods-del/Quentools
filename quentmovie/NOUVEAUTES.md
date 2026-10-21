# Nouveautés de QuentMovie

Chaque section devient le texte affiché dans l'application quand la mise à jour est proposée.
Changer aussi `version` dans `package.json` : une version déjà publiée n'est pas republiée.

## 2.8.3
- **Ta voix clonée plus rapide** : quand « Version TikTok » est décochée, les répliques TikTok ne sont plus dites pour rien. Jusqu'à une vingtaine de répliques et de longues minutes en moins.

## 2.8.2
**Doublage d'un épisode tout simple** : tu choisis le sujet (ou ton texte) et les photos, puis tu lis tes répliques une par une. Une barre montre où tu en es. Dès la dernière réplique enregistrée, la vidéo (Pico, animations, écrans, miniatures) se fabrique toute seule avec ta voix, sans repasser par la fiche ni choisir le doublage. « Attendre, je réécoute » laisse le temps de refaire une prise avant.

**Plus de bruit de clavier dans tes répliques** : le clic de la touche qui lance la prise et celui de la touche qui l'arrête sont coupés tout seuls. Mieux encore, la prise s'arrête d'elle-même quand tu te tais (case « Arrêter tout seul quand je me tais », cochée par défaut) : tu n'as plus à toucher le clavier à la fin d'une phrase.

**⏯ Reprendre l'épisode en cours** : l'épisode commencé (texte, photos, répliques déjà lues) est gardé même si tu fermes la fenêtre ou QuentMovie. Dans la fenêtre Épisode, « Reprendre » repart de la première réplique qui manque, ou relance la vidéo si elle a été arrêtée, sans refaire ce qui est déjà prêt.

**Grands chiffres : le chiffre en jaune, seul.** Plus aucun texte sous le chiffre recopié de ton script (il cassait l'écran, comme « Trou abyssal atteint 94 milliards de dollars »). La voix explique ; les anciennes fiches sont nettoyées à la fabrication. Un texte que tu écris toi-même sous un chiffre reste.

## 2.8.1
- **Tout seul** : la vidéo est de nouveau fabriquée jusqu'au bout. L'écran « À retenir » manquait et la fabrication s'arrêtait juste après la voix, sans vidéo.
- **Tout seul** : « En une phrase » reprend la leçon du sujet, et non plus un détail de fin d'article.

## 2.8.0
**Ta vraie voix par défaut** pour les épisodes QuentInvest : la voix clonée ne valait pas ta voix. « Ma vraie voix (je lis les répliques) » écrit le texte, ouvre le Doublage avec les répliques dans l'ordre ; une fois enregistrées, le bouton « 🧾 Fiche » du Doublage te ramène à l'épisode, prêt à fabriquer avec ton doublage. La voix clonée reste proposée, en essai.

**Fenêtre Épisode plus simple**, en trois étapes : le texte, la voix, les photos.

**Photos au choix** : QuentMovie cherche des photos libres de droits pour chaque écran et te les propose ; tu cliques celle qui convient (ou « Aucune »). Seules les photos validées sont intégrées. Le mode automatique et « Sans photo » restent possibles.

**Écrans de chiffres corrigés** : sous un grand chiffre, plus jamais toute la phrase dite recopiée (coupée de son contexte, elle ne voulait rien dire). La légende dit en quelques mots ce que mesure le chiffre ; l'IA du Mac l'écrit à partir de ta phrase, sans rien ajouter. Les anciennes fiches sont corrigées à la fabrication.

**💬 Dire à l'IA ce qui ne va pas sur un écran**, dans la relecture : « la phrase en dessous n'a aucun sens », « plus court », « sans photo »… L'écran est corrigé tout de suite et seule cette réplique est refaite, pas toute la vidéo.

**Plus de bruitages d'ambiance** dans les épisodes (pièces, cloche, montée…) : ils cassaient l'immersion. Restent seulement les petits sons des animations (un élément qui apparaît, le changement d'écran). Les packs de montage ne posent plus de bruitages, sauf si tu coches la case.

**🎚 Mixage** (bouton de la piste audio, ou Outils) : un curseur pour la voix, le son des vidéos, la musique et les bruitages, « − » et « + », couper une famille de sons, retirer tous les bruitages d'un clic, égaliser le volume, et un **réducteur de bruit** (léger, moyen, fort) sur ta voix et le son des vidéos.

## 2.7.9
**Relecture automatique des écrans** avant chaque vidéo QuentInvest (ce que tu faisais à l'œil) : aucun texte qui finit par « … », pas de sous-titre qui répète le titre, pas de titre trop long. L'IA du Mac réécrit en quelques mots le titre d'un écran dont la phrase est trop longue. Le programme vérifie chaque titre : aucun chiffre ni aucun nom absent de ta phrase, sinon le titre d'origine reste. Le résultat de la relecture est affiché à la fin de la fabrication.

**Sous-titres incrustés retirés par défaut** : l'écran explique déjà. La case « Sous-titres incrustés » les remet.

**Pico vivant** (nouvelles vidéos ; les épisodes 1 et 2 gardent leur rendu) :
- Il cligne des yeux, à intervalles irréguliers, comme une vraie personne.
- Sa bouche suit vraiment ta voix : fermée, mi-ouverte ou grande ouverte selon la force de chaque syllabe (avant : ouverte ou fermée).
- Sa tête plonge légèrement sur les mots appuyés de ta phrase.
- Ses gestes suivent la phrase : tête penchée sur une question, hochement quand il affirme, il se penche vers l'écran quand un chiffre s'affiche.
- Quand il réfléchit, sa bouche bouge enfin quand il parle (elle restait figée).

J'ai fabriqué une vraie vidéo et relu chaque écran comme toi ; voici ce qui est corrigé :
- Le titre d'un écran n'est plus répété mot pour mot dans le sous-titre.
- Une phrase trop longue pour un titre garde son idée principale (« Le gouvernement n'a d'autre choix que d'intervenir », « Les banques se retrouvent en faillite les unes après les autres ») au lieu d'être coupée.
- Les sous-titres de la vidéo ne s'arrêtent plus sur « des », « les » ou « qu'une » : ils sont coupés à une virgule ou entre deux idées.
- TikTok : les sous-titres sont sous Pico, et non plus par-dessus lui.
- L'écran « En une phrase » montre l'idée principale, pas un pavé de huit lignes.
- Ton script sans titres de partie : l'étiquette en haut de l'écran n'affiche plus « La question » jusqu'à la fin, et l'écran des sources n'affiche plus « (sources à ajouter…) ».
- Photos en fond : un voile sombre dégradé garde le texte lisible, même sur une photo très colorée ; le crédit de la photo s'affiche aussi quand l'écran cite déjà sa source.
- **Tout seul** : chaque réplique a son propre écran (chiffre, définition ou phrase clé) au lieu d'un écran figé pendant 20 secondes, et l'accroche ne compare plus deux chiffres sans rapport (un jour du mois et un nombre de banques).

## 2.7.8
- **Photos d'illustration automatiques** (case « 🖼 Photos d'illustration », cochée d'office) : pour chaque écran de texte, QuentMovie cherche une photo libre de droits sur le sujet (Wikimedia Commons, Openverse, NASA, et Pexels, Pixabay ou Unsplash si tu as mis leur clé), garde la plus pertinente et la pose en fond, assombrie sous le texte, avec son crédit à l'écran. Sans photo assez proche du sujet, l'écran reste tel quel. Les photos non commerciales ou « tous droits réservés » ne sont jamais prises.
- **Dernier contrôle des écrans avant la fabrication** : quelle que soit l'origine du texte (ton script, l'IA, une fiche), aucun écran ne finit par « … » ni par un petit mot (« d'un », « et »).
- **Écrans QuentInvest sans phrase coupée** : quand une phrase est trop longue pour l'écran, elle n'est plus coupée au milieu avec « … ». L'écran garde des phrases entières, s'arrête à une virgule, ou met « etc. » après une énumération (« …s'acheter une villa, etc. »).
- **Corriger le texte d'un écran** : dans « 🔍 Relire et corriger », le bouton 🖼 de chaque réplique permet de réécrire le titre, le sous-titre ou les points de son écran ; « Refaire » ne redessine que cet écran.
- Dans la discussion, « corrige cette image » sur un plan de ton épisode ouvre directement la correction de son écran.

## 2.7.7
- **Ta vidéo QuentInvest sur la timeline** : bouton « 🎞 Monter dans la timeline » à la fin de la fabrication et dans « 🔍 Relire et corriger » (aussi pour la version TikTok). Chaque réplique devient un clip (écran, Pico et ta voix), avec ses sous-titres et la musique : coupe un plan, remplace-le, mets une photo, une vidéo ou un titre par-dessus, puis exporte. Le montage est enregistré comme projet ; si la timeline est vide, la vidéo y est posée toute seule.
- La musique des vidéos QuentInvest est de nouveau là (à 15/100, sous ta voix) : son nom n'était pas trouvé et elle disparaissait sans prévenir.

## 2.7.6
- **Installation de ta voix clonée** : elle ne s'arrête plus sur « Serveur de Python : erreur 403 » (limite de demandes de GitHub) ; Python est alors trouvé par un autre chemin.

## 2.7.5
- **Ta voix clonée plus rapide** : une phrase identique dans la version YouTube et la version TikTok n'est plus dite deux fois, le son est réutilisé.

## 2.7.4
- **Mon script** : un script de moins de 5 minutes n'est plus refusé (« Trop court ») ; la vidéo est fabriquée et une remarque le signale. La longueur de ton script, c'est toi qui la choisis.
- Ta voix clonée recharge son modèle moins souvent : un épisode est dit un peu plus vite.

## 2.7.3
- **Mon script** : un script collé sans ligne vide entre les paragraphes est bien découpé (il était refusé comme « trop court »). Ta fin « abonne-toi, la cloche, c'était Pico » n'est plus dite en double : la chaîne a déjà sa fin.
- **🎙 Enregistrer ces répliques** (Épisode QuentInvest, Mon script) : le Doublage s'ouvre avec exactement les phrases de la vidéo, dans l'ordre (accroche, salut, blocs, fin). Ton script est gardé, et ton doublage est choisi quand tu reviens.
- **Ma voix clonée sur un MacBook Air** : elle ne s'arrête plus sur « MPS backend out of memory ». Chaque réplique est dite phrase par phrase, la mémoire est rendue après chaque phrase, et les répliques sont faites par paquets de 8 ; celles déjà dites sont gardées si tu relances.
- Un doublage enregistré pour un autre texte est refusé avant la fabrication, au lieu de poser ta voix sur les mauvais écrans.

## 2.7.2
- **Ma voix clonée** : elle imite ta voix à partir de tes enregistrements du Doublage. S'il n'y en a pas encore assez (au moins 8 secondes : 3 ou 4 phrases lues), QuentMovie le dit tout de suite, avec un bouton « 🎙 Enregistrer ma voix », au lieu de lancer l'écriture et l'installation pour rien.

## 2.7.1
- Correction : « Faire la vidéo » (Épisode QuentInvest) s'arrêtait sur « Cannot find module './fiche-ia' » dans l'application installée.

## 2.7.0
- **Tableau des projets** (bouton sur l'accueil, à côté d'« Ouvrir un projet », ou ⇧⌘O) : nombre de projets, ceux qui ont un export, les exports périmés à refaire, et la place sur le disque avec « Ranger » qui libère les fichiers recréables (jamais tes projets, médias ni exports). Cartes avec vignette, format, durée, date et état ; recherche, filtres et tri ; Ouvrir, Revoir l'export image par image, Dupliquer, Supprimer.
- **Nouvelles animations** (Texte → Animations), fond crème ou sombre :
  - grand titre en grosses lettres qui arrive mot par mot, un mot en couleur et une phrase manuscrite soulignée ;
  - courbe de parcours avec trois étapes ;
  - grille de vignettes qui apparaissent une à une ;
  - cadre arrondi dans un coin, pour ta caméra au-dessus d'un fond.
- ⌘S propose le nom du projet ouvert.

## 2.6.0
- **Retours image par image** (onglet « Retours » à côté de l'Assistant) : mets la vidéo sur l'image exacte (−1 s, −1 image, +1 image, +1 s), écris ton retour, Entrée. La liste garde le minutage et le numéro d'image ; un clic y ramène, un point rose sur la timeline le montre, et les retours suivent les coupes. « ✨ Faire corriger » envoie chaque retour à l'assistant, à son instant : tu valides ses propositions. « Copier » et « .json » pour garder la liste.
- **Revoir un rendu exporté** en grand, image par image (Espace, ← →, ↑ pour écrire), avec plein écran et repères sur la barre.
- L'assistant comprend mieux : « baisse la musique », « musique à 30 % », « coupe là », « coupe la vidéo à 10 secondes », « noir et blanc », « passe en 16/9 », « mets un titre ici : … ». « Monte le volume » ne lance plus le montage complet.
- Plus fiable :
  - ⌘Z marche de nouveau après un ajout sur la piste vidéo 2 ;
  - les accents ne s'abîment plus dans les gros projets et les exports ;
  - les raccourcis n'agissent plus derrière une fenêtre ouverte ;
  - la dernière modification est gardée même si tu fermes vite ;
  - une fenêtre fermée pendant un long travail ne fait plus perdre le résultat.
- Plus léger pour le Mac : « Arrêter » arrête vraiment la fabrication d'un épisode, l'IA ne se charge plus plusieurs fois en mémoire, les fichiers temporaires et caches sont rangés tout seuls, et la mémoire des aperçus est libérée.
- Mise à jour plus sûre : jamais pendant que l'application tourne, version vérifiée, ancienne version gardée jusqu'au démarrage suivant.

## 2.5.0
- **« Fais une vidéo sur le krach de 2008 »** : dans Épisode QuentInvest, écris ton sujet et choisis **🤖 Tout seul**. QuentMovie lit l'article Wikipédia, écrit le texte de Pico sans rien inventer, le contrôle et fabrique la vidéo (YouTube, TikTok, miniatures), sans autre clic. Marche aussi dans la discussion : « fais un épisode QuentInvest sur l'inflation ».
- **👀 Je relis avant** : le texte est écrit pour toi, tu le corriges, puis tu lances la vidéo.
- **✍️ Mon script** : pour un sujet d'actualité que Wikipédia ne connaît pas encore, écris ton texte : il devient une vidéo directement.
- Rien n'est publié : tu regardes la vidéo, tu la corriges si besoin, puis « Publier ».
- **Toujours ta voix** : les épisodes QuentInvest sont dits par ta voix clonée ou par ton doublage, jamais par une voix de synthèse. S'il manque une réplique à ton doublage, QuentMovie te dit laquelle enregistrer.

## 2.4.1
- **Ta voix clonée fonctionne dans l'application** : « Fabriquer l'épisode » avec « Ma voix clonée » et l'essai « Voix clonée » du Doublage s'arrêtaient sur « can't open file … essai.py ». C'est réparé.

## 2.4.0
- **Animations** (rubrique Texte → Animations) : sept modèles animés à remplir, regarder et poser d'un clic, fabriqués sur ton Mac sans rien installer :
  - générique d'ouverture, posé au début de la vidéo ;
  - générique de fin, posé à la fin ;
  - chiffre clé qui défile jusqu'à sa valeur ;
  - bandeau nom (tiers inférieur) ;
  - bouton « S'abonner » qui devient « Abonné ✓ » ;
  - liste à points ;
  - volet de transition.
- Les animations posées par-dessus la vidéo sont transparentes, sur la piste vidéo 2, à la tête de lecture. Même rendu en horizontal, vertical et carré.
- **Aussi dans la discussion** : « mets un générique d'ouverture », « ajoute un bandeau », « mets un abonne-toi ici » (vidéo en pause).

## 2.3.0
- **Commenter la vidéo en pause** : mets la vidéo sur pause, puis écris dans l'Assistant. Ton message porte le moment exact (« 📍 00:12 · image 372 ») ; un clic sur cette étiquette ramène la vidéo à ce moment. Exemples :
  - « coupe ici » coupe à cet instant ;
  - « mets le texte « 2 % par an » ici » pose le texte à ce moment ;
  - « ici le son est trop fort » propose de baisser le volume de ce clip ;
  - si l'assistant ne sait pas faire, « 📍 Garder comme note » laisse ton commentaire sur la timeline.
- **Épisodes de Pico avec ta voix** : au moment de « 🎬 Fabriquer », choisis « Ma voix clonée » (chaque réplique est dite par ta voix clonée, à partir de tes enregistrements) ou un de tes doublages enregistrés. La voix de synthèse de Pico n'est plus téléchargée si tu ne t'en sers pas. Relire et refaire une phrase la redit avec ta voix.
- **Ton propre script** : colle ton texte dans la fenêtre Fiche, puis « 📄 Transformer mon script en fiche ». QuentMovie le découpe en répliques et choisit les écrans (chiffres, définitions, listes) sans rien ajouter. Le brouillon automatique à partir d'un sujet reste là, pour tous les sujets d'économie et d'investissement qui ont un article Wikipédia.
- **Relire et corriger un épisode de Pico** (« 🔍 Relire et corriger ») : l'expression de Pico à chaque réplique, une phrase, ou la prononciation d'un mot (clic sur le mot, ▶ écoute, ➕ dictionnaire). Seules les répliques changées sont refaites (détails dans 2.2.1 ci-dessous).
- **Plus fluide sur MacBook Air** : une seule fabrication d'épisode à la fois, en priorité basse (le montage reste fluide pendant ce temps). L'IA du Mac libère sa mémoire pendant que ta voix clonée travaille.

## 2.2.1
- **Relire et corriger un épisode de Pico** : bouton « 🔍 Relire et corriger » après la fabrication, ou dans « Épisodes déjà fabriqués » de la fenêtre Fiche. Chaque réplique s'affiche avec :
  - l'expression de Pico à choisir (neutre, content, inquiet, surpris, curieux, réfléchi) ;
  - la phrase, à modifier avec ✏ ;
  - les mots à vérifier, soulignés.
- **Prononciation d'un mot** : clique sur un mot, écris comment le dire, ▶ écoute-le avec la voix de Pico, puis ➕ ajoute-le au dictionnaire. Les répliques qui contiennent ce mot sont refaites, et la version TikTok aussi.
- **Seules les répliques changées sont refaites** : les autres gardent leur voix, leurs écrans et leur image. La vidéo et les chapitres de la description sont mis à jour.

## 2.2.0
- **Épisode QuentInvest avec Pico, fabriqué dans QuentMovie** : carte « Épisode QuentInvest » de l'accueil.
  - Donne un sujet : la fiche s'écrit (Wikipédia et l'IA du Mac), puis tu la relis et la contrôles.
  - Un clic sur « 🎬 Fabriquer » fait le reste : vidéo YouTube, version TikTok, miniatures et texte de publication, avec les écrans animés, les bruitages et la musique de la chaîne.
  - La progression s'affiche et un bouton permet d'arrêter. Tu continues à monter pendant ce temps.
  - Quand c'est prêt, « 📤 Publier… » envoie l'épisode sur YouTube (vidéo privée) ou dans tes brouillons TikTok, seulement quand tu le décides.
- **Plus de programme à part à lancer** : QuentMovie fabrique l'épisode avec ses propres outils. La voix de Pico se télécharge une seule fois au premier épisode (≈ 350 Mo) ; l'application ne grossit que d'environ 1 Mo.
- **Réglages de la chaîne gardés** : bruitages à −20 dB sous la voix, musique à 15 sur 100.
- **Pour corriger une phrase**, modifie la fiche et fabrique de nouveau : les répliques inchangées gardent leur voix.

## 2.1.0
- **Discussion avec l'assistant**, à droite (onglet « Assistant », ⌘K ou « Demander… ») : écris comme à quelqu'un, « coupe les blancs de la prise 2 », « mets le titre en jaune », « mets le volume du dernier clip à 40 % ». L'assistant répond ce qu'il va faire, avec un bouton « Faire » (et « Voir d'abord » pour la coupe des blancs, en rouge sur la timeline). Une fois fait, un bouton « Annuler » remet le montage comme avant.
- **Le clip visé est compris** : « la prise 2 », « le clip 3 », « la deuxième prise », « le dernier clip », « ce clip ». Pour les titres, douze couleurs sont comprises (jaune, rouge, bleu, bleu clair, vert, orange, rose, violet, doré, blanc, noir, gris).
- **Questions sur le montage** : « combien dure la vidéo ? », « c'est quel format ? », « combien de clips ? », « que sais-tu faire ? ». La réponse est calculée par QuentMovie, jamais inventée.
- **Quand l'assistant n'est pas sûr**, il propose des choix au lieu de dire « pas compris ».
- La dictée vocale (🎤) et la mémoire (« retiens que… », « oublie… », « que retiens-tu ? ») marchent dans la discussion. La fenêtre des étapes détaillées reste disponible (bouton « Choisir les étapes »).

## 2.0.1
- **Une suggestion en haut des réglages du clip** quand elle est utile : « 2 blancs d'au moins 1 s dans ce clip : Couper » (les passages coupés s'affichent d'abord en rouge), « Ce clip est un peu sombre : Éclaircir », « Son plutôt faible : Égaliser », le look conseillé pour le sujet de la vidéo… Un clic suffit, ⌘Z annule.
- **Un seul écran « Exporter et publier »** (étape Publier, bouton Exporter ou ⌘E) : choisis la qualité (720p, 1080p, 4K ou son seul), coche où envoyer (ton Mac, YouTube, TikTok, AirDrop), écris ou fais rédiger les textes juste en dessous, puis un seul bouton. YouTube reçoit une vidéo privée, non répertoriée ou programmée ; TikTok un brouillon, avec la légende copiée. Le titre et la description restent dans le projet. Les épisodes QuentInvest déjà fabriqués se publient toujours par le lien sous l'aperçu.
- **Couleurs de la timeline complétées** : voix en vert, musique et bruitages en orange, titres en ambre, incrustations en violet.

## 2.0.0
- **Nouvelle interface** : couleurs plus douces, un seul bleu pour les actions, coins arrondis, tout est plus lisible.
- **Trois étapes en haut : Créer, Monter, Publier.** Créer ouvre l'accueil, Monter le montage, Publier l'envoi sur YouTube et TikTok.
- **Écran d'accueil** : « Qu'est-ce qu'on crée aujourd'hui ? » avec l'assistant, six cartes pour commencer (importer, me filmer, générer une vidéo, doublage, podcast, épisode QuentInvest) et tes projets à reprendre. Échap ou « Monter » pour revenir au montage.
- **Six rubriques au lieu de dix** à gauche : Médias, Texte, Audio (voix, sons, musique), Effets (effets, transitions, calques), Packs et Outils ; les sous-parties se choisissent par des puces en haut de la liste. Les touches 1 à 0 marchent comme avant.
- **Réglages du clip en onglets** à droite : Découpe, Image, Son, Couleur ; seuls les réglages de l'onglet choisi s'affichent, déjà ouverts.
- **Une couleur par piste** dans la timeline : titres en jaune, incrustations en violet, vidéo en bleu, son en vert.
- **Dictée vocale dans l'assistant** : bouton « 🎤 Dicter », tu parles, tu cliques sur « Arrêter », ta demande s'écrit toute seule. Tout se fait sur ton Mac, sans internet (la reconnaissance de la voix s'installe une fois dans Outils → Voix et parole).
- Le bouton « Demander… ⌘K » remplace « Assistant ». Générer, Doublage et Me filmer passent dans l'accueil (raccourcis inchangés).

## 1.44.0
- **Publier** (nouveau bouton « Publier ») : envoie un épisode fabriqué par la chaîne QuentInvest sur **YouTube** (vidéo **privée**, non répertoriée ou **programmée** à la date choisie, avec titre, description, mots-clés, miniature et déclaration de contenu de synthèse) et dans tes **brouillons TikTok** (tu ajoutes la légende et tu publies dans l'application). Rien n'est publié sans ton clic de confirmation. Il faut créer une seule fois tes accès (Google Cloud et TikTok for Developers, mode d'emploi dans la fenêtre) ; les clés restent sur ton Mac, chiffrées par le trousseau. Sans accès, les boutons « Copier le titre / la description / la légende » et « Ouvrir YouTube Studio / TikTok » restent disponibles.
- **Fiche QuentInvest** (bouton « 🧾 Fiche » du Doublage) : colle ou charge une fiche d'épisode, QuentMovie vérifie qu'elle est complète, qu'elle dure plus de 5 minutes, que les phrases restent courtes, que chaque chiffre a une source, qu'aucun conseil d'investissement ne s'est glissé dedans, et liste les mots à ajouter au dictionnaire de prononciation. Un **brouillon automatique** part d'un sujet : l'article Wikipédia donne les faits, l'IA locale les reformule pour la voix, la structure de l'épisode est ajoutée (à relire et à compléter).
- **Contrôle de prononciation** (dans le dictionnaire) : colle un texte, la voix le lit, la reconnaissance le réécoute et les mots mal compris sont proposés pour le dictionnaire.
- **Voix clonée** : l'espace disque est vérifié avant l'installation (message clair si le disque est trop plein) et un bouton « Copier le rapport » donne tout ce qu'il faut pour comprendre un problème.

## 1.43.0
- **Dictionnaire de prononciation** (bouton « 📖 Prononciations » du Doublage, ou dans Voix naturelles) : écris un mot tel qu'il apparaît et comme il doit se dire (« Mackay » → « Maquaï », « PEA » → « P E A »), puis écoute-le avec ▶. Toutes les voix de synthèse l'appliquent ; les sous-titres gardent l'orthographe. Plus de 2 000 mots sont déjà connus : noms d'entreprises et de banques, investisseurs et économistes, lieux, mots anglais de la finance et de la crypto, sigles (PEA, ETF, SCPI, TVA…). Les souverains s'écrivent aussi comme ils se disent (« Louis XIV » → « Louis quatorze »). Les symboles « ≈ », « × » et « ÷ » sont aussi lus (« environ », « fois », « divisé par »).
- **Voix clonée (essai)** : dans la fenêtre Doublage, le bouton « 🧬 Voix clonée » fait dire quatre phrases par deux modèles qui imitent ta voix (Chatterbox et Qwen3-TTS) à partir de tes enregistrements, pour que tu écoutes et compares avec ta vraie voix. La première fois, QuentMovie installe tout seul ce qu'il faut (de 15 à 40 minutes, jusqu'à 8 Go d'espace libre) ; les essais suivants sont rapides. Rien n'est envoyé : tout reste sur ton Mac, dans `~/Movies/QuentMovie/voix-clone`.

## 1.42.0
- **Doublage d'une vidéo** : dans la fenêtre Doublage, choisis une vidéo ou un son (fichier .mp4, .mov, .mp3… ou un média déjà importé) puis « Lire le texte de cette vidéo » : QuentMovie écoute la voix, écrit chaque phrase sur une ligne (à corriger si besoin), et tes répliques se posent dans la piste audio à l'instant où chaque phrase était dite.

## 1.41.0
- **Doublage** (bouton « Doublage » ou ⇧⌘D) : enregistre ta propre voix réplique par réplique. Colle un texte (une ligne par réplique) ou charge un épisode QuentInvest ; chaque ligne s'affiche en grand, tu enregistres avec Espace, tu réécoutes avec L, tu passes à la suivante (ou tu refais). Le silence du début et de la fin est retiré tout seul.
- **Poser sur la timeline** : toutes les répliques s'enchaînent dans la piste audio à partir de la tête de lecture ; tu peux recommencer et reposer sans doublon.
- **Dossier de répliques** (`~/Movies/QuentMovie/doublages/<nom>/v00.wav, v01.wav…`) lisible par la fabrication des vidéos QuentInvest à la place de la voix de Pico.
- **Ma voix** : chaque réplique est aussi gardée avec son texte dans `~/Movies/QuentMovie/ma-voix/` (sons + `metadata.csv`), de plus en plus complet au fil des doublages ; c'est la base pour reproduire ta voix plus tard.

## 1.40.0
- **« Breaking news » en plein écran** : l'animation couvre maintenant tout l'écran, quel que soit le format de la vidéo (16:9, 9:16, 4:5 ou carré), depuis l'onglet Calques comme depuis le studio.
- **Version verticale** pour TikTok, Reels et Shorts : en format vertical ou carré, une version dessinée pour le téléphone est choisie toute seule (rien n'est coupé ni écrasé).
- **Nouvelle animation « Breaking news (plein écran) »** (touche Maj+B dans le studio) : elle reste plein écran du début à la fin, sans se réduire en bandeau.
- **Bandeau défilant plus propre** : le texte « EN DIRECT » ne se chevauche plus et n'est plus coupé.
- **Sous-titres en italien** (et en anglais, espagnol, allemand, portugais) : choisis la « Langue des sous-titres » dans Outils → Sous-titres automatiques, ou clique sur « 🌍 Traduire » pour des sous-titres déjà faits. La traduction se fait sur ton Mac, sans internet, au même moment que la voix ; ⌘Z revient au texte d'origine. Aussi avec l'assistant ⌘K : « mets les sous-titres en italien ».

## 1.39.1
- **Les incrustations s'affichent pendant la lecture** : « Breaking news » et les autres animations sur fond vert, images, stickers et vidéos posés sur un clip apparaissent maintenant dès que tu lances la lecture, à leur place et à leur taille, sans attendre que l'aperçu complet soit prêt (sur un long montage, elles n'apparaissaient qu'à l'export).

## 1.39.0
- **Fichiers exportés plus légers** à qualité égale : la puce du Mac règle sa qualité image par image au lieu d'un débit fixe.
- **Sous-titres sans limite** : sur une longue vidéo, seuls les 300 premiers sous-titres s'affichaient ; tous apparaissent maintenant, jusqu'à la fin.
- **Voir la coupe des blancs avant de couper** : les passages qui vont partir s'affichent en rouge sur la timeline. Clique sur un passage pour le garder, puis « Couper » ou « Tout garder ».
- **Export plus rapide des longues prises avec un look** (couleur, ciné, netteté…) : elles s'encodent en plusieurs morceaux à la fois, comme les prises sans effet.
- **Aperçu plus rapide après une retouche** : raccourcir le début d'une longue prise, la couper ou ajouter un plan avant ne fait refaire que les passages touchés ; le reste est repris tel quel.
- **Timeline instantanée à la réouverture** : les images et les ondes sonores des clips sont gardées sur le disque.
- **« Égaliser le volume » plus naturel** : tout le montage est mesuré avant d'être réglé ; le son ne « pompe » plus entre les phrases.
- **Résumé de chaque chapitre** : le chapitrage propose une phrase de résumé par chapitre (modifiable) et un sommaire détaillé à copier.
- **Description YouTube complète** : les textes de publication s'appuient sur ce que l'analyse a compris de la vidéo, et les chapitres sont ajoutés à la fin de la description.
- **Animations en direct du studio plus fluides** : le fond vert des animations (touches 1 à 9) est retiré par la puce graphique, le Mac chauffe moins pendant la prise.

## 1.38.0
- **L'analyse de la vidéo lit toute la vidéo** : sur une longue vidéo, l'IA ne lisait que les premières minutes. Elle lit maintenant des passages répartis du début à la fin (conclusion comprise), avec leur moment.
- **Idées fortes avec leur moment** : clique sur l'heure d'une idée forte pour y aller dans la timeline. Les mots-clés sont affichés, et les expressions comme « assurance vie » ou « chiffre d'affaires » sont reconnues.
- **Plus de sujets reconnus** : mode et beauté, immobilier, santé, école, église, mariage, culture et récit (avec leur pack conseillé). Quand le programme hésite, l'IA choisit le genre dans la liste.
- **Rien d'inventé** : chaque phrase de l'IA est comparée à ce qui est vraiment dit dans la vidéo ; une idée sans rapport est écartée.
- **Plus rapide la deuxième fois** : l'analyse est gardée ; chapitres, extraits et montage selon le sujet ne refont pas travailler l'IA sur la même vidéo.
- Les mots de l'oral (« vraiment », « genre », « bonjour »…) ne sont plus pris pour des mots-clés.
- **Timeline libre pendant la lecture** : clique n'importe où dans la timeline (règle, clip, repère) pendant que la vidéo joue, la lecture continue depuis cet endroit. Tu peux aussi faire défiler la timeline à la molette ou avec la barre sans qu'elle revienne de force sur la tête de lecture (le suivi reprend tout seul après 4 secondes).
- **Coupe des blancs plus douce** : par défaut, seuls les vrais blancs (environ 2 secondes ou plus) sont retirés ; les respirations et les « euh » restent, la vidéo reste fluide. Choix « Douce », « Normale » ou « Serrée » dans Outils → Couper les blancs.
- Plus de petit « clic » sonore aux raccords des blancs coupés.

## 1.37.0
- **Les longs montages s'exportent** : l'erreur « Failed to configure output pad on Parsed_xfade… » ne bloque plus l'export. Un clip préparé autrement que les autres (souvent celui qui porte un calque) est refait seul, au lieu de tout reprendre d'un coup, ce qui échouait au-delà d'une centaine de clips.
- **Export plus léger pour le Mac** : beaucoup moins de fichiers temporaires (un long montage pouvait remplir le disque), le son se mélange sans fichiers géants, l'aperçu de fond s'arrête pendant l'export, et les longs clips avec calques ou titres s'encodent aussi en plusieurs morceaux à la fois.
- **Annuler un export**, voir le **temps restant**, être **prévenu à la fin** (notification du Mac), et QuentMovie demande confirmation si tu le quittes pendant un export.
- **Exporter seulement un passage** : un essai de 20 s à la tête de lecture, le clip sélectionné ou le passage entre deux repères, pour vérifier un réglage avant le long export.
- **Calques enfin visibles dans l'aperçu** : un calque ou une animation qui commence en cours de clip (Breaking news, animations du studio…) n'apparaissait pas dans l'aperçu. Jusqu'à 24 calques par clip (avant, à partir du 9e, ils n'apparaissaient nulle part).
- **Les animations ne disparaissent plus quand tu coupes** : après « Couper les blancs », le pré-montage du studio, une coupe ou un découpage aux changements de plan, chaque animation reste sur son image et continue là où elle en était. Une animation lancée pendant un silence démarre juste après, au lieu d'être supprimée.
- **Animations sur fond vert** (Breaking news…) : posées à la tête de lecture (ou là où tu les déposes) et jouées une fois. Des barres jaunes sur les clips montrent où sont les calques ; bouton « ⏱ À la tête de lecture » dans l'inspecteur.
- **Tout reste calé quand tu coupes les blancs ou les silences** : musique, bruitages (dont ceux des animations du studio), piste vidéo 2, titres et repères suivent le montage raccourci, et la voix détachée est coupée aux mêmes endroits. Raccourcir le début d'un clip, changer sa vitesse ou insérer une image fixe garde aussi les sous-titres et calques sur la bonne image.
- **Effets de coupe des packs** joués depuis leur début, et le son d'un élément de la piste vidéo 2 ne fait plus doubler le volume du reste de la vidéo après sa fin.
- **Prise du studio protégée** : elle est enregistrée sur le disque pendant que tu filmes ; si QuentMovie se ferme pendant la prise, elle t'est proposée au démarrage suivant.
- Durées affichées en minutes (« 36 min 23 s »), messages d'erreur d'export expliqués en français (disque plein, fichier abîmé…).

## 1.36.0
- **Tu valides chaque proposition** : quand l'aide au montage, un pack, le montage selon le sujet ou le chapitrage veut changer quelque chose, un panneau à droite liste chaque titre, bruitage, transition, effet ou réglage avec son moment. Clique une ligne pour la voir dans l'aperçu, ▶ pour écouter un bruitage, ✓ pour garder, ✕ pour refuser (retiré tout de suite), puis « Valider mes choix ».
- **Le son reste calé sur l'image** : après beaucoup de coupes, le son glissait petit à petit (jusqu'à une demi-seconde après 20 coupes). C'est corrigé.
- **Plus de faux textes** : les packs ne posent plus « Prénom Nom », « @tonpseudo » ni de faux cours de bourse ; le titre d'ouverture n'est posé qu'avec le vrai sujet de ta vidéo. Avant l'export, QuentMovie te prévient s'il reste un texte d'exemple.
- **Musique bien dosée** : elle s'entend enfin (environ 12 dB sous la voix, et un peu plus basse quand tu parles), une seule musique à la fois, et sa boucle s'enchaîne sans trou.
- **Bruitages et transitions à leur place** : jamais sur un mot, seulement les sons courts, et les transitions se posent aux vrais changements de plan (pas au milieu d'une même prise). Pendant un fondu, les deux voix ne se mélangent plus.
- **Coupe des blancs plus naturelle** : une vraie respiration après chaque fin de phrase, et les « um », « uh », « ben » sont aussi retirés.
- **Égaliser le son** garde les nuances de ta voix (un seul réglage par vidéo d'origine) et ne fait plus échouer l'export d'un clip muet. Le montage automatique règle aussi le volume final comme les réseaux sociaux.
- Une vidéo horizontale importée dans un projet vide règle le projet en horizontal (plus de recadrage surprise en vertical).

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
