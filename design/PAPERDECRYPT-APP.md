# Paperdecrypt sur iPhone (et autres appareils)

## Ce qui existe : application installable (PWA)
- Fichiers : `decodeur.webmanifest` (nom, couleurs, icônes), `decodeur-sw.js` (mode hors connexion), `assets/paperdecrypt/` (icônes 180, 192, 512 et masquable), publiés par `pages.yml`.
- **iPhone** : ouvrir la page dans **Safari**, appuyer sur Partager (carré avec une flèche) → « Sur l'écran d'accueil ». L'icône apparaît, la page s'ouvre en plein écran comme une application. La page affiche elle-même cette invitation (une fois, « Plus tard » est retenu). Android / ordinateur : bouton « Installer ».
- Hors connexion : la page s'ouvre sans réseau. Les lectures de fiches et de courriers (Tesseract, pdf.js) sont chargées depuis internet la première fois ; le service ne met en cache que la page, le manifeste et les icônes, jamais de données personnelles.
- Mise à jour : la page est servie réseau d'abord, une nouvelle version arrive donc dès la prochaine ouverture. Pour vider le cache du mode hors connexion : changer `VERSION` dans `decodeur-sw.js`.
- Contrôles : `node tools/verifier-decodeur.js` (fichiers) et `tools/verifier-decodeur-ui.js` (installation, hors connexion, invitation iPhone).

## Limites sur iPhone
- Installation uniquement depuis Safari (pas depuis Chrome ni depuis une application intégrée).
- Assistant IA local (WebGPU) : disponible seulement sur les iPhone récents (Safari récent) ; sinon l'outil fonctionne sans, avec les réponses prévues.
- Pas de notifications ni d'icône de pastille garanties ; le rappel par calendrier (fichier .ics) reste le moyen le plus sûr.

## Application native (App Store) : pas faite, à décider
Une application native, ou la page « emballée » (Capacitor) puis envoyée à l'App Store, demande :
- un **Mac avec Xcode** pour la construire et un **compte Apple Developer** (99 €/an) ; je peux écrire le projet, pas le compiler ni le tester ici ;
- la **validation d'Apple** (délais, refus possibles : une simple page web emballée est souvent refusée si elle n'apporte rien de plus) ;
- pour Premium : Apple impose en principe son **achat intégré (commission 15 à 30 %)** pour débloquer des fonctions dans l'application ; le lien de paiement Stripe/PayPal actuel n'y serait pas admis tel quel.
Avantages réels : présence dans l'App Store, accès plus fiable à l'appareil photo et aux notifications. À ne lancer que si l'achat intégré et le coût sont acceptés.
