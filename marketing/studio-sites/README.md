# Studio Sites — générer le site d'un professionnel (application Mac)

Outil privé (jamais publié sur le site, jamais mentionné publiquement : la règle « l'IA n'est pas un moyen de création » de `design/POSITIONNEMENT.md` s'applique aux sites livrés et à la communication). Il part de **tes exemples** (`exemples/<secteur>/`, 11 designs distincts) et des modèles `design/templates/`, et écrit un site complet pour un vrai professionnel.

## Utiliser
1. Remplir la fiche : nom, métier, ville, téléphone, e-mail, adresse, horaires, services (un par ligne), points forts, ton, nom de domaine, SIRET.
2. **Point de départ** : « choisi d'après le métier » (par défaut) ou un exemple précis (plombier, restaurant, coach, ostéopathe, photographe, paysagiste…) ou un modèle du design.
3. **✨ Générer le site** (⌘G) : le design de l'exemple est gardé tel quel, les coordonnées sont remplacées à l'identique, les autres textes sont réécrits pour ce métier par l'IA locale, section par section. L'aperçu s'affiche (téléphone ou ordinateur).
4. À droite, **tous les textes sont modifiables** (l'aperçu se met à jour) ; ⚠ = texte qui engage le professionnel (gratuit, garantie, délai, assurance…) à valider avec lui ; gris = texte de l'exemple repris.
5. **📁 Enregistrer le site** (⌘S) : un dossier prêt à publier (`index.html`, `mentions-legales.html`, `assets/`, `robots.txt`) et **`LISEZMOI-LIVRAISON.txt`** qui liste tout ce qu'il reste à faire (champs à compléter, textes à relire, mentions légales).

## Ce que fait le programme (pas l'IA)
- **Coordonnées exactes** : téléphone, e-mail, adresse, ville, nom de l'entreprise sont substitués par le programme ; l'IA ne peut pas les modifier (texte refusé sinon).
- **Rien de l'exemple ne reste** : bandeau « exemple fictif », publicités, `noindex`, liens vers QuenTools, scripts de démonstration, sections interactives propres à l'exemple (calculettes, quiz, panier : détectées en exécutant l'exemple dans une page cachée), faux avis, prix d'exemple (remplacés par « sur devis » sauf tarifs donnés dans la fiche).
- **Règles de contenu** : un texte de l'IA est refusé s'il contient un prix, un lien, un chiffre ou un délai inventé, une mention de l'IA, un reste de l'exemple ou s'il est trop long ; l'exemple est alors repris et signalé.
- **Référencement** : titre, description, données structurées « entreprise locale » (seulement ce que la fiche contient), canonique si domaine, icône générée.
- **Formulaire** : ouvre la messagerie du visiteur vers l'e-mail du professionnel (aucun service externe).
- Sans IA (non installée) : les textes de l'exemple sont repris avec les coordonnées du professionnel, à réécrire à la main dans le panneau de droite.

## IA locale
Modèle Qwen3 4B (Apache 2.0, ~2,5 Go) téléchargé une fois dans `~/Movies/QuentMovie/modeles` (partagé avec QuentMovie et Studio Posts), aucune connexion ensuite. Code partagé : `marketing/ia-locale/` copié dans chaque outil par `node tools/synchro-ia-locale.js` (ne jamais modifier les copies). Durée d'un site : quelques minutes (une vingtaine de petites demandes).

## Fichiers
- `moteur.js` : analyse de l'exemple, emplacements de texte, substitutions, consignes à l'IA, contrôles, assemblage, mentions légales, notes de livraison.
- `index.html` : fenêtre (fiche, aperçu, textes, enregistrement) ; `main.js` + `preload.js` : fenêtre Electron, IA, lecture des modèles, enregistrement.
- `modeles/` : **généré** par `node tools/studio-sites.js` (copie des exemples, modèles, polices) — à relancer quand un exemple ou un modèle change.
- Application Mac `.dmg` : workflow « Studio Sites — application Mac » (Releases `studio-sites-vX.Y.Z`, nouvelle version = changer `version` dans `package.json`).
- Contrôle : `node tools/verifier-studio-sites.js [--captures dossier]` (génère chaque modèle avec et sans IA simulée, vérifie coordonnées, restes de l'exemple, prix, défilement horizontal, parcours complet).

## Limites
- Les outils interactifs propres à un exemple (calcul de commande, réservation en ligne, quiz) sont retirés ; si l'en-tête en contient un, une note le signale.
- Le design de chaque exemple est figé (couleur modifiable seulement pour les modèles du design) ; pas de photos : à ajouter ensuite.
- L'IA locale peut écrire des textes plats : toujours relire, surtout les textes marqués ⚠.
