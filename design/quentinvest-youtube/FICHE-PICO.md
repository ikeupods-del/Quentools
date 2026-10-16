# Pico — fiche du personnage de la chaîne

Présentateur unique de la **chaîne YouTube QuentInvest** (l'économie expliquée simplement), **aux couleurs de Patrimoine AI**. Max et Pépite restent les personnages des vidéos courtes ; Pico porte les vidéos longues. Dessins : `personnage/` (planche `planche-pico.png`, expressions en SVG et PNG transparents, avatar `avatar-800.png`) ; à régénérer avec `node design/quentinvest-youtube/personnage/generer.js`.

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
- Voix de synthèse Piper (`fr_FR-upmc-medium`, comme la série QuentInvest), à choisir à l'oreille entre les deux voix du modèle.
- Réglage de départ, à affiner : plus aiguë et un peu plus vive que Max — hauteur `asetrate={t}*1.08`, tempo `atempo=1.06` (même écriture que `quentstudio/series.py`).
- Rythme : vif sur l'explication, plus lent sur le chiffre clé et sur le piège (une respiration avant).

## Structure type d'une vidéo (8 à 10 minutes)
1. **Accroche (15 s)** : la question de fourmi, une image forte, pas d'introduction.
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
3. Écrire l'épisode pilote (sujet simple, par exemple « Pourquoi les prix montent ? ») avec ses sources, et le fabriquer de bout en bout.
4. Vous le relisez : la chaîne ne publie qu'après votre validation.
