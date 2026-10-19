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

**2.1 : une vraie discussion avec l'IA** (la dictée vocale est déjà prête : la reprendre dans le futur panneau)
- Un panneau « Assistant » où le propriétaire écrit comme dans une conversation : « coupe les blancs de la prise 2 », « mets le titre en jaune ».
- L'IA répond, propose des boutons d'action, et chaque changement peut être annulé.
- La mémoire « retiens que… » existe déjà ; elle doit continuer à marcher.
- C'est la petite IA installée sur le Mac : elle est bonne pour les demandes simples, et pour le reste elle doit proposer des choix.

**2.2 : l'épisode QuentInvest avec Pico, fait automatiquement dans QuentMovie**
- Aujourd'hui, les épisodes de Pico (écrans animés, décors, bruitages, musique, version TikTok) sont fabriqués par un programme à part, lancé à la main. Il faut le faire depuis QuentMovie.
- Le parcours voulu : on donne un sujet, la fiche est écrite puis vérifiée, la vidéo est fabriquée, le propriétaire relit, puis publie.
- Le propriétaire ne veut corriger que les détails :
  - l'expression de Pico à chaque réplique (content, inquiet, surpris, curieux, réfléchi) ;
  - une phrase ;
  - la prononciation d'un mot. Un clic sur un mot souligné permet d'écrire comment le dire, de l'écouter et de l'ajouter au dictionnaire ; seules les répliques concernées sont refaites.
- Garder les réglages de la chaîne : bruitages à −20 dB sous la voix, musique à 15 sur 100. Ne pas les remonter.
- À étudier d'abord : ce que la fabrication demande d'installer sur le Mac, et combien cela alourdit l'application.

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
