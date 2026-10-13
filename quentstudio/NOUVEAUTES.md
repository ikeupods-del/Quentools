# Nouveautés de QuentStudio

Chaque section devient le texte de la version publiée. Changer aussi `version.txt` : une version déjà publiée n'est pas republiée.

## 1.3.0
- **Des vidéos plus vivantes** : le mot en train d'être dit s'allume dans le sous-titre, une barre de progression avance en haut, et dans QuentInvest le chiffre important de la réplique apparaît en grand (« 22,6 % », « 1929 »…).
- **Musique de fond** qui baisse toute seule quand Max, Pépite, Quentools ou Glitchou parlent, **bruitage** entre les sketchs et un « ba-dum-tss » après chaque chute. Tout se règle (ou se coupe) dans la carte « Dans la vidéo ».
- **Relire et modifier le texte avant de fabriquer** : coche la case, le texte s'affiche, tu changes ce que tu veux, puis « Fabriquer la vidéo ». QuentStudio vérifie la longueur des répliques avant.
- **Plusieurs vidéos d'un coup** (3, 5 ou 10).
- **Prêt à publier** : à côté de chaque vidéo, un texte de publication (titre, description, hashtags) copié d'un clic avec le bouton « Texte », et une image de couverture (bouton « Couverture »).

## 1.2.1
- **Plus de plantage avec l'IA locale** : l'IA tourne maintenant à part. Si elle plante, QuentStudio reste ouvert, relance l'IA sans la puce graphique (un peu plus lente, mais stable) et s'en souvient pour les fois suivantes. Si l'IA ne marche vraiment pas, la vidéo est faite sans elle (fiches et bibliothèque) au lieu de fermer le logiciel.
- Ce qui s'est passé est noté dans le fichier ia-journal.txt du dossier Vidéos → QuentStudio, pour pouvoir corriger la cause.

## 1.2.0
- **30 nouveaux sujets prêts dans QuentInvest** (43 en tout), écrits à la main avec des faits vérifiés et utilisables sans IA : la BCE, le FMI, la dette publique, le crédit lombard, la Banque de France, la planche à billets, le passage à l'euro, la fin du dollar en or, les agences de notation, le PIB et la récession, le chômage, la TVA, la retraite par répartition, le Livret A, l'assurance-vie, le PEA, le CAC 40, le crédit immobilier, l'or, le bitcoin, investir chaque mois, les frais, la pyramide de Ponzi, le lundi noir de 1987, la crise grecque, le choc pétrolier de 1973, l'offre et la demande, le salaire brut et net, chiffre d'affaires et bénéfice.
- **Liste des sujets prêts rangée par thème** (banques centrales, État, crédit, placements, crises, notions de base, arnaques) : on choisit un sujet et on clique sur « Créer ce sujet ». Un ✓ marque les sujets déjà publiés.
- Le sujet tapé est mieux reconnu : « explique la BCE » ou « c'est quoi un crédit lombard » vont directement sur la bonne fiche.

## 1.1.1
- **Les vraies voix fonctionnent dans l'application installée** : les certificats d'internet sont maintenant livrés avec QuentStudio. Sans eux, la voix (et l'IA, Wikipédia, les mises à jour) ne pouvait pas se télécharger et les vidéos sortaient avec des bips.
- Si la voix n'est pas encore téléchargée au moment de créer une vidéo, QuentStudio l'attend au lieu de mettre des bips ; l'état de la voix est affiché clairement.

## 1.1.0
- **IA intégrée** : plus besoin d'installer Ollama. QuentStudio a son propre moteur d'IA et utilise le même modèle que QuentMovie (Qwen3 4B) : s'il est déjà sur le Mac, rien n'est retéléchargé, sinon le bouton « Installer l'IA » le télécharge une seule fois (2,5 Go).
- **Sujets libres dans QuentInvest** (« résume l'histoire de Warren Buffett ») : l'IA s'appuie sur le résumé Wikipédia du sujet, et tout chiffre ou date qui n'y figure pas est refusé puis réécrit. Les épisodes sur un sujet libre restent marqués « à relire avant publication ».
- **Mises à jour automatiques**, comme QuentMovie : la nouvelle version se télécharge en arrière-plan et s'installe à la fermeture, ou tout de suite avec « Redémarrer pour installer ».

## 1.0.0
- Première version en application Mac : ouvrir le .dmg et glisser QuentStudio dans Applications. Rien d'autre à installer (voix, ffmpeg et partage AirDrop inclus ; la voix se télécharge une seule fois au premier lancement).
- Deux séries au choix : Quentools (sketchs comiques) et QuentInvest (l'économie expliquée par Max et Pépite, sujet libre possible avec l'IA locale).
- Vidéos 9:16 de 62 secondes exactement, avec appel à s'abonner à la fin.
- IA locale facultative : installer Ollama (ollama.com) puis « ollama pull llama3.2:3b » pour des scénarios écrits en continu ; sans IA, le générateur intégré prend le relais.
