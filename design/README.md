# Système de design QuenTools

Tout ce qu'il faut pour produire vite un site ou un outil au niveau du site vitrine, pour QuenTools comme pour un client.

## Fichiers
| Fichier | Rôle |
|---|---|
| `../assets/qt.css` | Le système : jetons (couleurs, typographie, espaces, rayons, ombres, mouvement), base, mise en page, composants, animations, thème sombre. |
| `../assets/qt.js` | Comportements sans dépendance : en-tête qui se fige, apparition au défilement, compteurs, année. |
| `../assets/fonts/` | Bricolage Grotesque (titres) et Inter (texte), auto-hébergées, licence SIL OFL. |
| `templates/vitrine.html` | Site vitrine client (artisan, commerce, indépendant) : accueil, services, avis, zone, contact. |
| `templates/outil.html` | Page de lancement d'un outil ou d'une application (SaaS, calculateur, app). |
| `templates/legal.html` | Mentions légales et confidentialité à compléter. |
| `templates/merci.html` | Page de confirmation (après un formulaire ou un paiement). |

## Démarrer un projet client
1. Copier `assets/` (qt.css, qt.js, fonts) et le modèle voulu dans un nouveau dossier ; renommer le modèle en `index.html` et corriger le chemin `../../assets/` en `assets/`.
2. **Marque du client** : redéfinir 3 jetons dans un `<style>` après qt.css, rien d'autre :
   ```css
   :root{ --accent:#0f766e; --accent-soft:#dcf2ee; --lime:#fbbf24; }
   ```
   (`--accent` = couleur principale, `--lime` = couleur de surlignage et d'appel.) Vérifier le contraste du texte blanc sur `--accent` (4,5:1 minimum).
3. Remplacer tous les textes entre crochets `[…]`, les images et les liens. Chercher `[` pour ne rien oublier.
4. Vérifier sur téléphone (390 px), ordinateur (1440 px) et en mode sombre ; aucune barre de défilement horizontale.
5. Compléter `legal.html` avec les vraies informations du client (SIRET, adresse, hébergeur).

## Règles de qualité
- **Typographie** : titres en Bricolage (`h1`–`h4`, `.display`), texte en Inter ; une seule idée par titre, 8 à 12 mots maximum.
- **Couleur** : fond papier `--bg`, encre `--ink`, une seule couleur d'accent ; le citron (`--lime`) sert au surlignage et à un seul bouton d'appel par écran.
- **Rythme** : sections `.section` (grand espacement), en-tête de section `.section-head` (eyebrow + titre + chapeau).
- **Mouvement** : `.reveal` (+ `style="--i:n"` pour le décalage), jamais plus de 0,8 s ; tout est coupé si l'utilisateur réduit les animations.
- **Accessibilité** : lien « Aller au contenu », focus visible, textes alternatifs, contrastes, boutons de 48 px de haut.
- **Performance** : images JPEG 400–1 400 px, `loading="lazy"` hors du premier écran, polices préchargées, aucun script externe.
- **Confidentialité** : aucun cookie ni mesure d'audience par défaut ; si le client en veut, bandeau de consentement obligatoire.

## Composants disponibles
Boutons `.btn` (`.btn-accent`, `.btn-lime`, `.btn-ghost`, `.btn-sm`), `.chip` (`-ok`, `-accent`, `-lime`), `.eyebrow`, `.hero` + `.display` (surlignage automatique sur `<em>`), `.stack`/`.phone` (aperçus d'app), `.float-card`, `.marquee`, `.stats`, `.card` (`.is-link`, `.card-media`, `.offer`, `.is-featured`), `.bento` (`.w3`, `.w4`, `.w6`), `.steps`, `.story`, `.faq`, `.cta-band`, `.footer`, `.prose`, `.grid-2`/`.grid-3`.
