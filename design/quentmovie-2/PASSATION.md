# QuentMovie 2 : passation (19 octobre 2026)

Le propriétaire n'est pas développeur : lui répondre en français simple, agir à sa place, expliquer le résultat plutôt que la technique. Suivre les règles du fichier `.claude/CLAUDE.md` du dépôt.

## Où on en est
- **QuentMovie 2.0.0 est faite** (sur la branche principale). Elle apporte :
  - un nouveau style (gris graphite, un seul bleu pour les actions, coins arrondis) ;
  - trois étapes en haut de l'écran : **Créer, Monter, Publier** ;
  - un **écran d'accueil** : une question « Qu'est-ce qu'on crée aujourd'hui ? », six cartes (importer, me filmer, générer, doublage, podcast, épisode QuentInvest) et les projets à reprendre ;
  - à gauche, **6 rubriques au lieu de 10** : Audio regroupe voix, sons et musique, et Effets regroupe effets, transitions et calques, avec des puces pour passer de l'un à l'autre ;
  - à droite, les réglages du clip en 4 onglets (Découpe, Image, Son, Couleur) ;
  - une couleur par piste dans la timeline ;
  - la **dictée vocale** dans l'assistant (bouton « Dicter »), qui utilise la reconnaissance de la voix déjà installée sur le Mac.
- Aucune fonction n'a été retirée et les raccourcis clavier sont inchangés.
- La maquette complète validée par le propriétaire est dans `design/quentmovie-2/maquette/` (4 écrans) avec une capture de l'ancienne interface.

## Ce qu'il reste à faire, dans l'ordre (une version publiée à chaque étape)

**2.0.1 : faite** — suggestion en haut des réglages du clip, écran unique « Exporter et publier » (qualité, destinations Mac / YouTube / TikTok / AirDrop, textes juste en dessous, un seul bouton), sons colorés selon leur rôle.

**2.1.0 : faite** — discussion avec l'assistant dans le panneau de droite (onglet « Assistant », ⌘K) : réponses avec boutons « Faire » / « Voir d'abord », « Annuler » par demande, clip visé (« prise 2 », « dernier clip »), couleur des titres, questions sur le montage répondues par le programme, choix proposés quand la demande est floue, mémoire et dictée reprises.

**2.2.0 : faite** — l'épisode Pico se fabrique depuis QuentMovie (fenêtre Fiche : sujet → brouillon → contrôle → « 🎬 Fabriquer » → « 📤 Publier… »).
- Étude : la fabrication demande Node, FFmpeg, la voix (sherpa-onnx) et un navigateur pour dessiner les écrans. QuentMovie a déjà les quatre : le navigateur de Playwright est remplacé par des fenêtres cachées de l'application. Ajout à l'application : ≈ 1 Mo (programme, dessins de Pico, police). Seule la voix de Pico (Kokoro, ≈ 350 Mo) se télécharge, une fois, au premier épisode.
- Réglages de la chaîne inchangés (bruitages −20 dB sous la voix, musique 15/100) ; épisodes 1 et 2 intacts (`verifier.js`).

**2.2.1 : à faire — relecture fine avant publication**
- Écran de relecture de l'épisode fabriqué : la liste des répliques avec, pour chacune, l'expression de Pico (content, inquiet, surpris, curieux, réfléchi), la phrase modifiable et les mots soulignés (noms propres, sigles, mots signalés par le contrôle de prononciation).
- Clic sur un mot souligné : écrire comment le dire, l'écouter, l'ajouter au dictionnaire.
- « Refaire » ne refait que les répliques concernées (la voix est déjà gardée par réplique ; les écrans et les clips d'une réplique inchangée sont à garder aussi).

## HyperFrames (envoyé par le propriétaire, à intégrer)
- Le propriétaire a envoyé les fichiers de présentation du projet **HyperFrames** de HeyGen (licence Apache 2.0, donc utilisable) : le mode d'emploi, la licence et les réglages. Le programme lui-même ne faisait pas partie de l'envoi : il s'installe depuis npm, sous le nom `hyperframes`.
- Ce que fait HyperFrames : il transforme une page web animée (texte, images, animations, sous-titres, voix off, visuels qui bougent avec le son) en vidéo MP4. On écrit la page, et il filme chaque image dans un navigateur caché.
- L'idée pour QuentMovie : une rubrique « Animations » qui fabrique des génériques, des écrans de chiffres, des transitions et des habillages réseaux sociaux avec HyperFrames, puis les pose directement dans la timeline. Elle servirait aussi aux écrans de Pico.
- À vérifier d'abord : ce qu'il faut installer sur le Mac (Node et Chrome) et le poids ajouté à l'application ; puis faire un essai avec un modèle de leur catalogue.

## Patrimoine AI (dépôt séparé `ikeupods-del/patrimoineai`)
**Fait le 19 octobre (version Mac 6.5.0, en ligne)** :
- dictée de la question dans l'assistant (bouton micro dans la version en ligne ; sur le Mac, dictée du système avec la touche Fn deux fois) ;
- deux nouvelles alertes dans « À surveiller » : l'épargne de précaution pas encore atteinte, et beaucoup d'argent qui dort au-delà de cette épargne.

**À faire, dans cet ordre** :
1. **Mettre la liaison bancaire en service.** Elle est déjà programmée, mais pas branchée. Le propriétaire doit choisir :
   - soit importer chaque mois le relevé de Boursorama, et il n'y a rien à installer ;
   - soit mettre la liaison en service : créer un site gratuit chez Netlify depuis le dépôt, puis un accès chez Enable Banking en « Restricted Production », et remplir quatre réglages. Le mode d'emploi est dans `docs/BANQUE.md`. Il faut ensuite noter l'adresse Netlify dans les réglages de l'application.
2. **Importer le portefeuille de bourse en un fichier.** Il existe déjà un import par fichier modèle. Il faudrait lire directement le fichier exporté par Boursorama pour le PEA et le compte-titres : lignes, quantités, prix de revient. Demander d'abord un exemple de fichier au propriétaire pour ne rien inventer.
3. **Lire les relevés de Bricks et BienPrêter.** Les paiements reçus et le capital remboursé seraient remplis tout seuls. Là aussi, demander un exemple de fichier.
4. **Aide à la déclaration d'impôts** : dividendes, intérêts et revenus fonciers de l'année, avec la case où les reporter. C'est indicatif, et il faut le dire ; vérifier chaque case sur les sources officielles.
5. **Autres alertes** : frais élevés sur un placement, abonnement qui augmente.
6. **Mode à deux** : un patrimoine commun et un patrimoine propre à chacun, avec une vue d'ensemble.
