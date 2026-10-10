# Communication : Paperdecrypt

Paperdecrypt est l'outil de QuenTools (gratuit pour commencer, avec des fonctions Premium) qui lit un courrier (photo ou PDF), explique ce qu'on demande, avant quand, quel montant payer (HT ou TTC), et prépare une réponse. Il suit aussi les garanties et les demandes de remboursement. Adresse : `quentools.fr/decodeur-courrier.html`.

Règles : pas de prix, pas de promesse de résultat, pas de faux avis ni de chiffre inventé, aucune mention d'intelligence artificielle. Dire que l'outil « aide à comprendre » et ne remplace pas un professionnel. Ne pas écrire « sans publicité » : la version gratuite affiche des annonces.

## 1. Carrousel (format préféré)
5 visuels prêts dans `assets/social/c-paperdecrypt-1.jpg` à `-5.jpg` (régénérables : `node tools/carrousels.js paperdecrypt`). Légende et hashtags : `tools/carrousels.json`, entrée `paperdecrypt`. À programmer via Metricool (marque QuenTools), lien en bio.

## 2. Publications courtes (à alterner sur plusieurs semaines)

**Question (engagement)**
Un courrier officiel qui traîne sur le coin de la table… Lequel vous donne le plus de fil à retordre ? 📬
CAF, impôts, facture, relance, assurance… Dites-le en commentaire, je vous réponds avec un conseil pour y voir clair 👇

**Astuce HT / TTC**
HT ou TTC : quelle somme devez-vous vraiment payer ? 🧾
Le HT, c'est le prix avant taxes. Le TTC, c'est le prix avec la TVA : c'est celui que paie un particulier. Sur une facture, repérez la ligne « Total TTC » ou « Net à payer ».
Paperdecrypt, l'outil de QuenTools (gratuit pour commencer), fait cette distinction à votre place quand vous prenez votre courrier en photo (lien en bio).

**Astuce date limite**
Une date limite noyée dans trois paragraphes, ça arrive à tout le monde ⏰
Paperdecrypt repère la date, vous dit combien de jours il reste et peut l'ajouter à votre agenda. Gratuit, sur téléphone (lien en bio).

**Garanties**
Votre lave-linge tombe en panne… où est la facture ? 🧺
Dans Paperdecrypt, photographiez le ticket ou chargez le PDF : la date d'achat et le prix sont lus, et l'outil vous prévient quand la garantie légale se termine (lien en bio).

**Confidentialité**
« Mon courrier part où ? » Bonne question 🔒
Dans Paperdecrypt, la lecture et l'analyse se font directement dans votre navigateur. Vous pouvez aussi vous connecter avec Google si vous voulez retrouver vos courriers sur plusieurs appareils : c'est facultatif.

## 3. Vidéo courte (TikTok / Reels, 20 à 25 secondes)
1. (0-3 s) Gros plan sur un courrier froissé. Texte : « Vous comprenez ce courrier ? »
2. (3-8 s) Photo du courrier avec le téléphone dans l'outil.
3. (8-16 s) Écran du résultat : « Date limite », « Montant TTC », « Ce qu'on vous demande ».
4. (16-22 s) Bouton « Demander des explications » : la lettre de réponse apparaît.
5. (22-25 s) Texte : « Paperdecrypt, gratuit. Lien en bio. »
Légende : « Un courrier que vous ne comprenez pas ? Prenez-le en photo 📷 #courrier #administratif #astuce »
Utiliser un courrier d'exemple (bouton « Voir un exemple »), jamais un vrai courrier avec nom ou adresse.

## 4. Groupes Facebook (voir `PROSPECTION.md`)
Bonjour à tous 👋
Petite question : quand vous recevez un courrier officiel (CAF, impôts, relance), vous le comprenez du premier coup ou vous le laissez de côté ? 😅
Je demande parce que j'ai fait un petit outil, gratuit pour commencer, pour s'y retrouver. Dites-moi en commentaire quel courrier vous embête le plus, je vous réponds.
(Pas de lien dans la publication : le donner en message privé à ceux qui le demandent.)

## 5. Réponses types aux commentaires
- « Ça marche pour quoi ? » : CAF, impôts, amendes, factures, relances, assurances, courriers de propriétaire…
- « C'est gratuit ? » : oui, avec des annonces dans la version gratuite.
- « Mes données ? » : la lecture se fait sur votre appareil ; la connexion Google est facultative (voir la politique de confidentialité de l'outil).
- « Ça remplace un avocat ? » : non, ça aide à comprendre et à répondre ; en cas de doute ou de litige, voir un professionnel.

## 6. Rythme conseillé
Semaine 1 : carrousel + question. Semaine 2 : astuce HT/TTC + vidéo. Semaine 3 : garanties + groupes. Semaine 4 : date limite + confidentialité. Mesurer dans Metricool quelles publications font réagir et reprendre celles-là.

## Nouveaux carrousels (outils ajoutés)
Deux carrousels de 5 visuels (1080×1350) sont prêts dans `assets/social/` : captures fictives (aucune donnée réelle) produites par `node tools/captures-paperdecrypt.js`, puis `node tools/carrousels.js etat-des-lieux paperdecrypt-outils`.

| Carrousel | Cible | Visuels | Légende, tags, texte TikTok |
|---|---|---|---|
| État des lieux | Locataires qui emménagent ou déménagent | `c-etat-des-lieux-1…5.jpg` | `tools/carrousels.json` (id `etat-des-lieux`) |
| Tous les outils | Grand public (papiers, rappels, coffre, TVA) | `c-paperdecrypt-outils-1…5.jpg` | `tools/carrousels.json` (id `paperdecrypt-outils`) |

Règles à garder : jamais de prix ni de lien dans une publication de groupe (« lien en bio » seulement sur ton profil) ; ne jamais présenter l'outil comme une intelligence artificielle ; ne pas promettre une preuve « infalsifiable » : dire « date certifiée par un serveur » et rappeler que seul l'état des lieux signé par les deux parties fait foi.

Rythme conseillé : état des lieux en premier (sujet saisonnier, fort partage chez les locataires), puis le carrousel « tous les outils » une semaine plus tard. Question finale de chaque carrousel = réponse en commentaire ; répondre à chacun avec un conseil précis, sans lien.

## LinkedIn : annonce « bientôt »
Visuel : `assets/social/linkedin-paperdecrypt-bientot.jpg` (1080×1350, `node tools/pub/teaser-linkedin.js`).

**Publication**

> Une mise en demeure, une fiche de paie, un état des lieux… et ce petit doute : « Est-ce que j'ai bien tout compris ? »
>
> Chez QuenTools, nous avons construit un outil pour ça. Il arrive bientôt : Paperdecrypt.
>
> Prenez un courrier ou un document en photo (ou en PDF) et, en quelques secondes :
> → qui vous écrit, ce qu'on vous demande et avant quand
> → le vrai montant à payer, en distinguant le HT du TTC
> → vos heures supplémentaires repérées sur la fiche de paie, avec une lettre prête si des heures semblent manquer
> → un état des lieux avec photos datées et géolocalisées, comparé entre l'entrée et la sortie
> → des rappels avant chaque échéance, un coffre de documents, un suivi des abonnements
>
> Et tout reste sur votre téléphone.
>
> Pourquoi ? Parce que l'administratif ne devrait coûter ni argent ni sommeil à celles et ceux qui n'ont pas le temps de le décoder.
>
> À essayer gratuitement, avec des fonctions Premium pour aller plus loin. Pensé pour les salariés, les indépendants et les locataires.
>
> Quel papier vous donne le plus de fil à retordre ? Dites-le en commentaire : cela nous aidera à choisir la suite.
>
> (L'outil aide à comprendre et à organiser ; il ne remplace pas l'avis d'un professionnel.)
>
> #Paperdecrypt #QuenTools #Administratif #FicheDePaie #Location #Indépendants

**Premier commentaire** (le lien ne va pas dans le texte) : « Pour être prévenu(e) dès l'ouverture : suivez la page QuenTools. »

Conseils : publier un mardi ou un jeudi vers 8 h 30 ou 12 h ; répondre à chaque commentaire dans l'heure avec un conseil précis ; ne pas citer de prix ; ne jamais parler d'intelligence artificielle.

## Modèle économique (à garder en tête dans toute la communication)
**Gratuit** : décodage de courriers (HT/TTC, hameçonnage, lettres de réponse), rappels, calcul de TVA, 3 garanties, 10 documents au coffre, 3 abonnements, 1 état des lieux d'entrée, analyse de fiche de paie (chiffres, explications, heures supp repérées), lettres amende, résiliation et échéancier. Avec publicité.
**Premium** (paiement unique, lié au compte Google) : tout illimité, état des lieux de sortie avec comparaison, photos certifiées par un serveur, vérification des heures supplémentaires et lettre à l'employeur, suivi des fiches de paie, tous les modèles de lettres, dossier PDF, sans publicité.
Dans les publications : ne jamais annoncer de prix ; dire « gratuit pour commencer » ou « à essayer gratuitement », jamais « entièrement gratuit ». Le prix et le lien d'achat ne figurent que dans l'outil et sur les pages du site.
