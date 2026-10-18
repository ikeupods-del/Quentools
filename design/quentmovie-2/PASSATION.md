# QuentMovie 2.0 : passation (19 octobre 2026)

Document de reprise : tout ce qui a été décidé, et ce qu'il reste à faire. Le propriétaire n'est pas développeur : répondre en français simple, agir, expliquer le résultat. Respecter `.claude/CLAUDE.md` (commits en français sans mention d'IA, version + `NOUVEAUTES.md`, `npm test`).

## 1. État au départ
- QuentMovie est en **1.44.0** (publication YouTube et TikTok, fiche QuentInvest, prononciation). La dernière refonte de l'interface date de la **1.13** ; depuis, chaque version a ajouté des boutons et l'interface s'est chargée (capture : `maquette/interface-1.44.png`).
- La fabrication des épisodes de Pico (écrans animés, décors, bruitages, musique, version TikTok) se lance **hors de QuentMovie** (`design/quentinvest-youtube/fabrication/episode.js`, voir son `LISEZMOI.md`). QuentMovie n'en fait que le contrôle de fiche, le doublage et la publication.

## 2. Maquette validée
Fichiers `maquette/*.dc.html` (format de canevas : le balisage et les données de `renderVals()` donnent la mise en page exacte, couleurs et textes compris ; les images `/_blob/…` sont les PNG de `design/quentinvest-youtube/personnage/png/` et la miniature `episodes/03-miniature.png`).

**Style** : fond `#0D0E11`, barres `#111317`, panneaux `#15171C`, cartes `#1A1D23`, traits `#22252D`, texte `#ECEDF0`, texte secondaire `#A0A6B2` / `#8B919C`, accent unique `#3F5EF0` (survol/sélection `#5B78FF`, fond sélectionné `#1D2647`), sélection de clip ambre `#F2B92B`, tête de lecture `#FF5A5F`. Coins arrondis (8 à 16 px), police système du Mac (la maquette utilise Geist, ne pas charger de police externe), chiffres en mono.

**Barre du haut (partout)** : logo, nom du projet (menu : nouveau, ouvrir, enregistrer, importer), étapes **Créer · Monter · Publier** au centre, Annuler/Rétablir, bouton « Demander… ⌘K », bouton **Exporter**.
Correspondance avec l'existant : `bNouveau/bOuvrir/bSauver/bImporter` → menu du nom ; `bAssistant` → « Demander » ; `bGenerer`, `bDoublage`, `bStudio` → cartes de l'accueil ; `bPublier`, `bExport` → écran Publier ; `bApercu` → visionneuse ; sélecteur `#format` → puce « Vertical 9:16 » de la visionneuse ; outils `oSel/oLame/oAimant` → barre de la timeline ; `bAide` → icône clavier.

**Écran 1 · Accueil (Créer)** (`Main.dc.html`) : « Qu'est-ce qu'on crée aujourd'hui ? » + champ assistant + suggestions ; 6 cartes : Importer (⌘I), Me filmer (⇧⌘R, `ouvrirStudio`), Générer une vidéo (⇧⌘G), Doublage (⇧⌘D, `ouvrirDoublage`), Podcast (« Nouveau podcast » actuel), **Épisode QuentInvest** (écran 2) ; « Reprendre un projet » (liste `GET /api/projets`).

**Écran 2 · Épisode QuentInvest avec Pico** (`Studio.dc.html`) : à gauche les étapes (Sujet, Fiche, Voix Pico / Ma voix, Fabrication, Relecture, Publication) et les réglages de la chaîne (bruitages −20 dB, musique 15/100 : valeurs du propriétaire, ne pas les remonter ; taille du dictionnaire). Au centre : aperçu YouTube / TikTok avec le vrai Pico, choix de l'**expression de Pico par réplique** (content, inquiet, surpris, curieux, réfléchi), liste des **répliques** (écouter, refaire la voix d'une seule réplique) ; **mots à vérifier soulignés** : clic → « doit se dire » + écouter + « Ajouter au dictionnaire » (`prononciations.json` de l'utilisateur), seules les répliques concernées sont refaites ; passages à relire surlignés. À droite : **discussion avec l'IA** (« Pico inquiet au moment du piège », « raccourcis le TikTok »…), réponses avec boutons d'action et « Annuler ». Le propriétaire veut que **tout se fasse automatiquement** : il ne corrige que les détails et les prononciations.

**Écran 3 · Montage** (`Montage.dc.html`) : rail de **6 rubriques** au lieu de 10 (Médias ; Texte = Titres ; Audio = Voix/Sons/Musique en puces ; Effets = Effets/Transitions/Calques en puces ; Packs ; Outils) avec recherche et vignettes ; visionneuse épurée ; panneau droit à deux onglets **« Réglages du clip »** (4 onglets Image / Son / Vitesse / Couleur, carte de suggestion tirée de l'analyse technique avec un bouton d'action) et **« Assistant »** (même discussion qu'à l'écran 2) ; timeline aux pistes colorées : Titres ambre, Incrustations violet, Vidéo bleu, Voix vert, Musique orange.

**Écran 4 · Exporter et publier** (`Publier.dc.html`) : qualité (720p, 1080p conseillé, 4K, son seul), destinations cochables (Mac, YouTube, TikTok brouillon, AirDrop), textes de publication (« Rédiger depuis la vidéo » = `textesPublication`), visibilité YouTube (privée, non répertoriée, programmée), un seul bouton « Exporter et publier ». Rien n'est publié sans ce clic.

## 3. Réalisation, dans cet ordre (une version publiée par étape)
1. **2.0.0 : nouvelle interface** (barre, accueil, montage réorganisé, écran Publier, style). Aucune fonction retirée, raccourcis clavier gardés ; adapter `tests/parcours.js` si des identifiants changent. Contrôle : `cd quentmovie && npm test` (+ capture dans Chromium pour comparer à la maquette).
2. **2.1.0 : discussion avec l'IA** : panneau Assistant avec historique, branché sur `assistant.js` / `comprendreDemande` / `executerAction` ; chaque action annulable ; mémoire « retiens que… » existante.
3. **2.2.0 : écran Épisode QuentInvest** : lancer la fabrication de `episode.js` depuis QuentMovie (route dans `server.js` + suivi), répliques modifiables, expression de Pico par réplique (champ dans la fiche), refaire une seule réplique, dictionnaire de prononciation. À étudier d'abord : ce que la fabrication demande sur le Mac (Playwright/Chromium, sherpa-onnx) et le poids ajouté au `.dmg`.

Limites à dire au propriétaire : l'IA est la petite IA locale (Qwen3 4B) ; elle comprend bien les demandes simples, propose des choix pour les demandes compliquées.

## 4. Autre sujet du jour : Patrimoine AI (dépôt `ikeupods-del/patrimoineai`)
La liaison bancaire (Enable Banking, écran « Mes banques ») est déjà codée, mode d'emploi `docs/BANQUE.md`, mais **pas en service** : `banqueApi` est vide dans `config.js`. Deux voies proposées au propriétaire : import des relevés CSV de Boursorama (rien à installer), ou mise en service (site Netlify depuis le dépôt, application Enable Banking en « Restricted Production », 4 variables `ENABLE_APP_ID`, `ENABLE_PRIVATE_KEY`, `ENABLE_REDIRECT_URL`, `ENABLE_ALLOWED_EMAILS`). En attente : son choix et, s'il choisit la mise en service, l'adresse Netlify à mettre dans `banqueApi`.
