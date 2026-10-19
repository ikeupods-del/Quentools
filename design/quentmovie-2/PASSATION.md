# QuentMovie 2 : passation (19 octobre 2026)

Le propriétaire n'est pas développeur : lui répondre en français simple, agir à sa place, expliquer le résultat plutôt que la technique. Suivre les règles du fichier `.claude/CLAUDE.md` du dépôt.

## Où on en est
- **QuentMovie 2.0.0 est faite** (branche `quentmovie-2`, mise en ligne sur la branche principale). Elle apporte :
  - un nouveau style (gris graphite, un seul bleu pour les actions, coins arrondis) ;
  - trois étapes en haut de l'écran : **Créer, Monter, Publier** ;
  - un **écran d'accueil** : une question « Qu'est-ce qu'on crée aujourd'hui ? », six cartes (importer, me filmer, générer, doublage, podcast, épisode QuentInvest) et les projets à reprendre ;
  - à gauche, **6 rubriques au lieu de 10** : Audio regroupe voix, sons et musique, et Effets regroupe effets, transitions et calques, avec des puces pour passer de l'un à l'autre.
- Aucune fonction n'a été retirée et les raccourcis clavier sont inchangés.
- La maquette complète validée par le propriétaire est dans `design/quentmovie-2/maquette/` (4 écrans) avec une capture de l'ancienne interface.

## Ce qu'il reste à faire, dans l'ordre (une version publiée à chaque étape)

**2.0.x : finir la nouvelle interface comme sur la maquette**
- À droite, les réglages du clip rangés en 4 onglets (Image, Son, Vitesse, Couleur) au lieu d'une longue liste, avec en haut une suggestion utile, par exemple « 3 blancs dans ce clip : Couper ».
- Un écran **Exporter et publier** unique :
  - on choisit la qualité, puis on coche où envoyer (Mac, YouTube, TikTok, AirDrop) ;
  - les textes de publication sont juste en dessous ;
  - un seul bouton.
- La timeline avec une couleur par piste : titres ambre, incrustations violet, vidéo bleu, voix vert, musique orange.

**2.1 : une vraie discussion avec l'IA**
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

## Autre sujet en attente : Patrimoine AI
- La liaison avec la banque est déjà prête dans l'application, mais elle n'est **pas encore en service**.
- Le propriétaire doit choisir entre deux solutions :
  - importer chaque mois le relevé de Boursorama (rien à installer) ;
  - mettre la liaison en service. Il faut alors créer un site gratuit chez Netlify et un accès chez Enable Banking, puis remplir quatre réglages ; le mode d'emploi est dans le dépôt patrimoineai, fichier `docs/BANQUE.md`.
- S'il choisit la mise en service, il faudra ensuite noter l'adresse du site Netlify dans les réglages de l'application.
