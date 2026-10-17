# Pico — fiche du personnage de la chaîne

Présentateur unique de la **chaîne YouTube QuentInvest** (l'économie expliquée simplement), **aux couleurs de Patrimoine AI**. Max et Pépite restent les personnages des vidéos courtes ; Pico porte les vidéos longues. Dessins : `personnage/` (planche `planche-pico.png`, expressions en SVG et PNG transparents, avatar `avatar-800.png`) ; à régénérer avec `node design/quentinvest-youtube/personnage/generer.js`.

Logo de la chaîne (marque, avatar, logos horizontaux clair et sombre, bannière YouTube) : `logo/` ; régénéré par le même script.

## En une phrase
**Pico est la petite fourmi qui pose les questions que tout le monde se pose**, puis cherche la réponse avec sa loupe, un grain après l'autre.

## Pourquoi une fourmi
- Elle met de côté, elle s'organise en colonie : c'est la fable de l'épargne que tout le monde connaît (la cigale et la fourmi), sans le côté donneur de leçons.
- Elle est minuscule face à un sujet immense : le spectateur débutant se reconnaît en elle.
- Ses deux antennes jouent les émotions (haute = surprise, tombante = inquiet, courbée = question) : lisible en petit sur une miniature ou un téléphone.
- Vert émeraude, ambre, crème et noir chaud sont les couleurs de Patrimoine AI (l'icône en losange, les boutons, les chiffres) : la chaîne et l'application ont la même identité, et Pico ressemble à ce qu'on voit déjà dans l'application.

## Personnalité
- **Curieux, jamais savant.** Il ne sait pas d'avance : il cherche avec le spectateur et le dit (« je ne savais pas ça non plus »).
- **Pédagogue.** Une idée à la fois, un exemple concret avant le mot technique, un chiffre à la fois.
- **Honnête.** Il dit ce qu'on ne sait pas, ce qui dépend des cas, et corrige ses erreurs (commentaire épinglé).
- **Bienveillant.** Il ne se moque jamais de ceux qui ont mal investi ou qui ne savent pas ; pas de morale, pas de culpabilisation.
- **Un peu espiègle.** Petites blagues sur les fourmis et la colonie, jamais sur l'argent des gens.

## Vocabulaire et phrases repères
| Moment | Phrase |
|---|---|
| Début | « Salut la colonie ! » (les spectateurs sont **la colonie**) |
| La question | « Bon. Question de fourmi : … ? » |
| Une idée | « Tic-tic ! » (il tapote ses antennes) |
| Un chiffre | « Regardons ça de plus près. » (il sort la loupe) |
| Un clin d'œil | Pépite peut apparaître en petite vignette (« la définition du jour »), Max en exemple de débutant pressé |
| Un piège | « Attention, grain de sable. » |
| Abonnement (au début) | « Si tu veux rejoindre la colonie, abonne-toi : une nouvelle vidéo arrive bientôt. » |
| Fin | « Un grain après l'autre. À bientôt dans la fourmilière ! » |

Tutoiement. Phrases courtes. Un terme technique = défini dans la phrase d'après, avec un exemple.

## Ce que Pico ne fait jamais
1. Recommander un produit, une plateforme, un courtier, une crypto ou un placement précis.
2. Promettre un gain ou annoncer « ce qui va monter ».
3. Donner un chiffre sans source affichée à l'écran (nom, année).
4. Parler de la situation personnelle d'un spectateur (« à ta place, je… »).
5. Employer du jargon sans le définir, ni de ton moqueur ou paniqué.
Mention fixe à chaque vidéo, à l'écran et à l'oral : **« Vulgarisation · pas un conseil en investissement »** (déjà la mention de la série QuentInvest).

## Expressions (fichiers `personnage/png/pico-*.png`)
| Fichier | Quand | Bouche (synchro des lèvres) |
|---|---|---|
| `neutre` | il explique (pose de base, loupe en main) | fermée + ouverte |
| `curieux` | il pose la question, point d'interrogation | fermée + ouverte |
| `surpris` | un chiffre étonnant, une découverte | ouverte |
| `content` | il a compris, la conclusion | fermée + ouverte |
| `reflechi` | il hésite, « ça dépend » | fermée |
| `inquiet` | un piège, un risque | fermée + ouverte |

Format de chaque image : 480 × 600, fond transparent, buste (même cadrage que Max et Pépite) ; il se place dans un coin du cadre ou au centre selon la scène.

## Voix
- Voix de synthèse. Épisode 1 : Piper `fr_FR-upmc-medium`. **À partir de l'épisode 2 : Kokoro, voix française « siwis » (identifiant 30, modèle `kokoro-multi-lang-v1_0`), abaissée à 0,78 de sa hauteur avec la durée conservée** : plus fluide que Piper, choisie à l'oreille par le propriétaire. Réglage dans la clé `voix` du fichier de l'épisode : `{ "moteur": "kokoro", "sid": 30, "vitesse": 0.82, "hauteur": 0.78 }` (option `--voix <dossier du modèle>` pour le chemin). Modèle à télécharger une fois (≈ 350 Mo, archive `kokoro-multi-lang-v1_0.tar.bz2` des modèles sherpa-onnx) dans `~/Movies/QuentMovie/modeles`. Kokoro n'a pas de voix française masculine. Le champ `voix` d'une réplique remplace le texte lu à voix haute quand il diffère du texte affiché.
- Réglage actuel : voix Pierre (locuteur 1), plus aiguë que Max — hauteur `asetrate={t}*1.08`, allure de synthèse 0,65 (≈ 175 mots par minute), à affiner à l'oreille (options `--locuteur` et `--vitesse` de `fabrication/fabriquer.js`).
- Rythme : vif sur l'explication, plus lent sur le chiffre clé et sur le piège (une respiration avant).

## Structure type d'une vidéo (8 à 10 minutes)
1. **Accroche (15 s)** : la question de fourmi, une image forte, pas d'introduction. **Appel à s'abonner dès le début** (à partir de l'épisode 3) : une phrase de 5 secondes au maximum, dite juste après la question de fourmi, dans les 20 premières secondes, quand l'attention est la plus forte ; puis on enchaîne tout de suite sur le contenu. Le même appel s'affiche en une ligne en tête de la description et de la légende TikTok. La fin de la vidéo ne garde que la question à la colonie, sans second appel long.
2. **Le problème** : pourquoi on se pose cette question (un exemple de vie courante).
3. **Trois idées**, chacune avec un exemple, un schéma, un chiffre sourcé.
4. **Le piège** : ce qui est souvent mal compris.
5. **En une phrase** : le résumé que le spectateur peut répéter.
6. **La question à la colonie** (commentaires) + mention de vulgarisation.

## À décider avant la première vidéo
- **Nom de la chaîne** (Pico est le nom du personnage, pas forcément celui de la chaîne). Vérifier que le nom et l'identifiant YouTube sont libres, et la marque auprès de l'INPI ; plan B si « Pico » est pris : Grain, Mirette, Tilou.
- **Voix** : choix de la voix et du réglage, après écoute de deux ou trois épisodes d'essai.
- **Mentions de la plateforme** sur les contenus de synthèse : lire les règles en vigueur au moment de la publication, et décider avec vous de ce qui est déclaré.
- **Visage du personnage en vidéo** : fixe avec changement d'expression (prévu ici) ou animé (bouche qui bouge, antennes) avec les outils de QuentMovie.

## Prochaines étapes
1. Valider l'allure de Pico (ou demander des retouches : couleurs, yeux, accessoires).
2. Ajouter la série dans le studio : entrée `pico` (voix, palette, mention, sprites) et lecture des expressions selon le texte (curieux sur une question, surpris sur un chiffre, inquiet sur un risque).
3. Épisode pilote « Pourquoi les prix montent ? » : texte et sources dans `episodes/01-pourquoi-les-prix-montent.md` (lecture) et `.json` (scènes, source de la fabrication) ; vidéo fabriquée avec `node design/quentinvest-youtube/fabrication/fabriquer.js design/quentinvest-youtube/episodes/01-pourquoi-les-prix-montent.json` (voix Piper, images, montage et export par le moteur de QuentMovie ; voir l'en-tête du script pour les options).
4. Vous le relisez : la chaîne ne publie qu'après votre validation.

## Les animations (depuis l'épisode 2)
Écrans animés, fabriqués par `fabrication/ecrans.js` : chaque écran est une page HTML pilotée par `setT(t)`, capturée image par image (attributs `data-a` : `fade`, `pop`, `grow`, `count`, `draw`, `on`). Les éléments qui arrivent l'un après l'autre sont étalés sur la durée de la voix (`pas`) ; compteurs, courbe et résultats sont calés sur les mots dits. Pico est posé par-dessus par FFmpeg : bouche synchronisée, respiration, rebond quand l'expression change, entrée par la droite à la première réplique (`entree` sur une réplique pour la rejouer) et sortie (`sortie`). Nouveaux écrans : `pieces`, `duo` (compteur qui descend), `taux` (intérêt − inflation = gain réel), `courbe` (valeur affichée contre pouvoir d'achat). Les écrans de l'épisode 1 sont animés aussi s'il est refabriqué.

Commande de l'épisode 2 : `node design/quentinvest-youtube/fabrication/fabriquer.js design/quentinvest-youtube/episodes/02-que-fait-linflation-a-ton-argent.json --voix ~/Movies/QuentMovie/modeles/kokoro-multi-lang-v1_0`.

## Style 2 (épisodes suivants, clé `"style": 2`)
Les épisodes 1 et 2 gardent leur rendu d'origine. Un nouvel épisode part de `episodes/_modele-episode.json` et active :
- **Accroche chiffrée** (écran `accroche`) : le chiffre choc est à l'écran dès la première seconde, avec la question de fourmi ; **appel à s'abonner** juste après (écran `abonne` : le bouton devient « Abonné ») ; **teaser** de l'épisode suivant en fin de vidéo (écran `suite`).
- **Textes plus gros** (lisibles sur téléphone) et **zoom lent** du fond (1 → 1,03 sur la durée de chaque écran), pour que l'image ne reste jamais figée.
- **Voix rythmée** : phrase par phrase, avec une vraie respiration après un point, une question ou deux-points ; `"lent": true` ralentit la dernière phrase de la réplique (chiffre clé).
- **Pico qui joue** : `"geste"` = `pointe` (se penche vers l'écran), `hoche` (acquiesce) ou `penche` (intrigué), en plus de la respiration et du rebond au changement d'expression.
- **Bruitages** (banque de QuentMovie, discrets) : « pop » à chaque élément qui apparaît, « whoosh » à chaque nouvel écran, et un effet de révélation au choix : `"effet": "baisse" | "hausse" | "pieces" | "ding" | "succes" | "impact"` (instant réglable avec `effetT`).
- **Contrôle du rythme** avant l'export (`--controle` pour le lancer seul) : accroche de 9 s au plus, appel à s'abonner avant 20 s, aucun écran de plus de 16 s, aucune réplique de plus de 45 mots.
- **Format vertical** : `"format": "vertical"` (1080 × 1920, TikTok, Shorts) : écran en haut, Pico dessous, sous-titres de 3 mots. Exemple : `episodes/02-tiktok.json` (62 s, tiré de l'épisode 2).
- **Voix du propriétaire** (option) : `--voix-perso <dossier>` remplace la voix de synthèse par des enregistrements `v00.wav`, `v01.wav`… (un par réplique, dans l'ordre du fichier) ; une réplique sans fichier reste en voix de synthèse.
- **Voix des nouveaux épisodes : Tom** (Piper `vits-piper-fr_FR-tom-medium`, voix d'homme, allure 0,9), choisie par le propriétaire parmi trois extraits (Siwis abaissée, Tom, Gilles). Les épisodes 1 (Piper upmc) et 2 (Kokoro Siwis) gardent leur voix. Modèle à télécharger une fois dans `~/Movies/QuentMovie/modeles` (archive `vits-piper-fr_FR-tom-medium.tar.bz2` des modèles sherpa-onnx).

Commande d'un épisode vertical : `node design/quentinvest-youtube/fabrication/fabriquer.js design/quentinvest-youtube/episodes/02-tiktok.json --voix ~/Movies/QuentMovie/modeles/kokoro-multi-lang-v1_0`.

## Règles de contenu des nouveaux épisodes
- Un exemple chiffré que le spectateur peut refaire avec ses propres chiffres (« et toi, combien as-tu dans ton tiroir ? »).
- Un fil entre les épisodes : le teaser de fin annonce le sujet suivant (clé `suite` du fichier, reprise dans la description).
- Chaque chiffre a sa source sur l'écran ; une hypothèse est toujours annoncée comme telle ; jamais de taux de produit réel inventé.

