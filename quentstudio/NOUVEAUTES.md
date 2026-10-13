# Nouveautés de QuentStudio

Chaque section devient le texte de la version publiée. Changer aussi `version.txt` : une version déjà publiée n'est pas republiée.

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
