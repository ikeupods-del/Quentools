# Audit de sécurité — QuenTools

Audit du 2 octobre 2026. Périmètre : dépôt `Quentools` (vitrine, administration, espace client, cadeaux, devis, exemples, Infikit, Freelance Kit, Gourmet AI, Wouf et son relais de paiement, workflows) et dépôt `patrimoineai` (lecture seule, **rien n'y a été modifié**).

**Non audités, introuvables dans vos dépôts** : Registre crowdfunding, Gestionnaire finances, Panier Futé, Chasse à la maison, Historia Alterna, Vulpès Life, Flashback Arcade. Aucune trace de Netlify, de Supabase ni de clé `service_role` dans le dépôt Quentools. Le dépôt `patrimoineai` cite encore l'« ancienne version Netlify » (voir plus bas).

Méthode : lecture du code, recherche de motifs (clés, `innerHTML`, `eval`, `target="_blank"`, `localStorage`, CDN), recherche dans tout l'historique git (89 commits Quentools, 5 commits patrimoineai), lecture des règles Firestore et du relais Cloudflare, tests (Wouf : 54 scénarios + 6 795 contrôles verts ; contrôle de chargement des autres pages). Ce qui n'a pas pu être vérifié est dit comme tel.

## Verdict en bref
- **Aucune clé secrète dans le code ni dans l'historique.** La seule clé présente (`AIzaSyA-JS7…`) est la clé *web* Firebase : elle est publique par conception (elle identifie le projet, elle ne protège rien). La sécurité repose sur les règles Firestore, qui sont bien écrites. Aucune clé Gemini n'est dans le dépôt : l'utilisateur colle la sienne dans l'appli (elle reste dans son navigateur).
- **Aucune faille d'injection (XSS) confirmée.** Les textes saisis, importés ou venant de l'IA sont échappés (`esc()`), y compris l'affichage des réponses de l'IA (Gourmet, Patrimoine AI) et les demandes de devis côté administration.
- **Les vrais sujets sont structurels** : les données de santé d'Infikit sont stockées en clair sur l'appareil, toutes les applis partagent la même « origine » web, et plusieurs scripts viennent de CDN sans vérification.

## Tableaux par projet
Gravité : critique / moyen / faible. Statut : **corrigé**, **à confirmer** (je propose, vous décidez : cela change le comportement), **à faire par moi** (vous).

### Transversal (tout le dépôt)
| # | Problème | Gravité | Statut |
|---|---|---|---|
| T1 | Infikit, Freelance Kit, Gourmet AI, exemples et pages du site sont servis par la **même origine** (`quentools.fr`). Une faille ou un script compromis dans l'une des pages peut lire le stockage de toutes les autres, donc les patients d'Infikit (clé `tournee_idel_v1`) et les jetons GitHub. Concrètement exposé via Tailwind CDN (non épinglé) sur Freelance Kit. | critique (impact) ; probabilité faible, exploitation non testée | à confirmer : mettre Infikit sur son propre sous-domaine (`infikit.quentools.fr`) |
| T2 | Clé web Firebase visible dans 5 fichiers (`assets/qt-config.js`, `*/config.js`, `wouf/billing-worker/worker.js`). Normal, mais non restreinte. | faible | à faire par moi (restreindre, voir liste) |
| T3 | Scripts chargés depuis un CDN : `cdn.tailwindcss.com` (version non fixée, ne permet pas de vérification d'intégrité), Alpine 3.14.1 et three.js r128 sans SRI. Les vérifier par SRI n'a pas été possible ici (CDN bloqués dans l'environnement, je ne mets pas de hash non vérifié : cela casserait l'appli). | moyen | à confirmer : compiler Tailwind et héberger Alpine/three.js dans le dépôt |
| T4 | Aucune Content-Security-Policy (sauf Wouf, partielle). | moyen | **corrigé** (version minimale sur 9 pages : pas d'`<object>`, pas de `<base>` injecté). Version stricte (limiter les sites contactés) : à confirmer, car elle doit être testée avec une vraie connexion Google |
| T5 | Pas de `.gitignore` : un `.env` ou une clé pourraient être commités par erreur. | faible | **corrigé** |
| T6 | Polices Google (`fonts.googleapis.com`) sur Infikit et Freelance Kit : l'adresse IP des visiteurs part chez Google. Gênant au regard du RGPD, surtout pour Infikit (santé). | moyen | à confirmer : héberger les polices (changement visuel nul si fait proprement) |
| T7 | Les règles Firestore sont **un seul fichier pour tout le projet Firebase**. Celles de l'administration (`admin/index.html`) et celles de `patrimoineai/firestore.rules` sont différentes : publier l'un écrase l'autre. | moyen | à faire par moi (vérifier dans la console que les règles publiées contiennent tout) |
| T8 | Workflows GitHub : secrets bien passés par `secrets.*`, droits minimaux, aucune injection de texte dans les commandes. Actions référencées par version (`@v4`) et non par empreinte. | faible | à confirmer (sans urgence) |
| T9 | Historique git : aucun fichier de clé supprimé, aucune clé Gemini/Stripe/PayPal/GitHub jamais commitée. | — | rien à faire |

### Site vitrine, administration, espace client, devis, cadeaux
| # | Problème | Gravité | Statut |
|---|---|---|---|
| V1 | Export CSV de l'administration (demandes, contacts) : un visiteur malveillant peut saisir `=HYPERLINK(...)` dans le formulaire ; ouvert dans Excel, cela devient une formule (« injection CSV »). | moyen | **corrigé** (apostrophe devant `= + - @`) |
| V2 | Carte cadeau ouverte par lien autonome (`?d=…`) : montant et solde sont **lisibles et modifiables dans le lien**, sans signature. N'importe qui peut fabriquer une carte « 500 € ». Sans conséquence si vous vérifiez toujours le code dans l'administration, dangereux sinon. | moyen | **atténué** : bandeau « confirmé seulement à l'utilisation du code » sur ces cartes. Vraie solution (carte stockée en base, vérifiée par le serveur) : à confirmer |
| V3 | Les formulaires publics (`qt_devis`, `qt_cadeaux`) acceptent des envois sans connexion : les règles limitent bien les champs et les tailles, mais rien n'empêche le spam ou un grand nombre d'envois (coût Firestore). | moyen | à faire par moi : Firebase App Check + alerte de budget ; à confirmer : mise en place dans le code |
| V4 | `qt_cartes` lisible par code (`get` public). Le code fait 8 caractères : l'énumération est impraticable, mais sans limite de débit. | faible | à confirmer (App Check) |
| V5 | `ownerHashes` : empreinte SHA-256 non salée de l'adresse Google du propriétaire, publique. Elle permet de *confirmer* une adresse déjà devinée. Les vrais droits sont dans les règles Firestore (bons). | faible | à confirmer |
| V6 | Administration : toutes les données publiques affichées sont échappées ; liens externes avec `rel="noopener"` partout. | — | rien à faire |

### Infikit (données de patients)
| # | Problème | Gravité | Statut |
|---|---|---|---|
| I1 | Patients, visites, notes et antécédents sont stockés **en clair** dans le navigateur (`localStorage`) et les ordonnances (photos/PDF) en clair dans IndexedDB. Le **code d'accès à 4 chiffres n'est qu'un écran de verrouillage** : il ne chiffre rien, et son empreinte (SHA-256 sans sel, 10 000 combinaisons) se retrouve instantanément. Quiconque a l'appareil déverrouillé, un navigateur compromis ou une extension peut tout lire. | critique (RGPD, données de santé) | à confirmer : chiffrer les données sur l'appareil avec une phrase secrète (déverrouillage à chaque ouverture) |
| I2 | La phrase secrète du chiffrement cloud peut être mémorisée **en clair** (`infikit_pass`), à côté des données chiffrées, et le jeton GitHub aussi (`infikit_gh_token`). Sur cet appareil, le chiffrement ne protège alors plus rien. | moyen | à confirmer : ne garder qu'une clé non extractible (WebCrypto) à la place de la phrase |
| I3 | La consigne de création du jeton GitHub dit « No expiration » : un jeton éternel donnant accès à tous les gists. | moyen | à confirmer : conseiller 90 jours (le jeton « fine-grained » ne gère pas les gists) |
| I4 | Export CSV de comptabilité : noms des patients et codes d'actes (donc indirectement la santé) en clair, et risque d'injection de formule. | moyen | injection **corrigée** ; pseudonymiser les noms : à confirmer |
| I5 | Fichier de sauvegarde ou données cloud importés : identifiants et coordonnées GPS injectés tels quels dans des attributs HTML et des liens de navigation ; clés `__proto__` acceptées. Un fichier piégé reçu par un tiers aurait pu exécuter du code. | moyen | **corrigé** (`cleanData` : identifiants nettoyés, coordonnées numériques, clés dangereuses retirées, sur les 3 chemins d'entrée) |
| I6 | Dérivation de clé : PBKDF2-SHA256 250 000 itérations. Acceptable ; la recommandation actuelle est de 600 000. Chiffrement AES-GCM 256 bits, IV aléatoire, sauvegardes fichier et cloud chiffrées : bon. | faible | à confirmer |
| I7 | **RGPD / santé** (à valider avec un juriste ou la CNIL, je ne tranche pas) : (a) l'infirmière est responsable de traitement : registre, information des patients, analyse d'impact probable ; (b) hébergement de données de santé en France : la sauvegarde est chiffrée *avant* envoi chez Google (clé jamais transmise), ce qui peut changer l'analyse, mais la certification HDS et l'adéquation Belgique/France restent à valider ; (c) aucune notice de confidentialité ni mention des durées de conservation dans l'appli ; (d) polices Google (T6). | critique côté conformité, non vérifié juridiquement | à faire par moi / à confirmer |
| I8 | Aucun verrouillage automatique prouvé après inactivité (le verrouillage manuel existe). | faible | à confirmer |

### Freelance Kit
| # | Problème | Gravité | Statut |
|---|---|---|---|
| F1 | Tailwind via `cdn.tailwindcss.com` (non épinglé, « non destiné à la production ») + Alpine sans SRI ; Alpine « standard » impose `unsafe-eval`, ce qui interdit une CSP stricte. Même origine qu'Infikit (T1). | moyen | à confirmer |
| F2 | Jeton GitHub (`gist`) gardé dans le navigateur ; devis exportés en gist « secret » (non listé mais lisible par quiconque a le lien). | faible | à confirmer |
| F3 | Aucun `innerHTML`, tout passe par `x-text` : pas de XSS trouvée. | — | rien à faire |

### Gourmet AI
| # | Problème | Gravité | Statut |
|---|---|---|---|
| G1 | Clé Gemini de l'utilisateur dans `localStorage` (et non dans le code) : lisible par tout script de la même origine (T1). | moyen | à confirmer |
| G2 | La clé est envoyée dans l'adresse (`?key=`) plutôt que dans l'en-tête `x-goog-api-key` : elle peut se retrouver dans des journaux ou des extensions. Je n'ai pas pu tester l'appel réel à Google ici, donc non modifié (Patrimoine AI utilise déjà l'en-tête en premier). | faible | à confirmer |
| G3 | Pas de plafond côté appli : plus de dix appels IA par clic en cas d’échec répété (nouvelle tentative, plusieurs modèles). Cela consomme le quota gratuit de l'utilisateur, pas le vôtre. | faible | à confirmer |
| G4 | 41 usages de `innerHTML` relus : tous les textes variables (liste de courses synchronisée, réponses de l'IA, recettes) sont échappés. | — | rien à faire |

### Wouf (carnet de santé des animaux, paiement)
| # | Problème | Gravité | Statut |
|---|---|---|---|
| W1 | Export CSV des dépenses : injection de formule possible via un libellé. | faible | **corrigé** (version 1.22.2, interne, tests verts) |
| W2 | Phrase de chiffrement cloud mémorisée en clair dans `localStorage` (comme I2). Données moins sensibles qu'Infikit. | faible | à confirmer |
| W3 | CSP partielle (`object-src`, `base-uri`). | faible | à confirmer (version stricte) |
| W4 | Relais de paiement : le jeton Google est vérifié (signature RS256, destinataire, expiration), l'IPN PayPal est confirmé auprès de PayPal, bénéficiaire et montant contrôlés, anti-rejeu par numéro de transaction, CORS limité à une liste, messages limités à 5 par heure et par adresse IP, aucun secret dans le code. Limite de débit stockée dans KV (non atomique) : contournable de justesse, sans conséquence grave. | faible | rien à faire |
| W5 | Si vous restreignez la clé Firebase par site web (liste « à faire par moi »), le relais, qui n'envoie pas de `Referer` à Firestore, cessera de lire les réglages publics. | — | voir liste : à traiter ensemble |

### Patrimoine AI (dépôt `patrimoineai`, lecture seule : rien modifié)
| # | Problème | Gravité | Statut |
|---|---|---|---|
| P1 | Aucune clé dans le code ni l'historique. Clés Gemini et xAI de l'utilisateur dans `localStorage`, données financières (placements, contrats) en clair dans `localStorage`. | moyen | à confirmer |
| P2 | Cours de bourse récupérés par défaut via `corsproxy.io` et `allorigins.win` : services tiers anonymes, capables de renvoyer de faux cours et qui voient les tickers consultés. | moyen | à faire par moi : renseigner `marketProxy` avec votre propre relais |
| P3 | Relais Cloudflare : `Access-Control-Allow-Origin: *` tant que `ALLOWED_ORIGIN` n'est pas défini ; n'accepte que Yahoo Finance (pas d'accès libre à Internet), sans limite de débit. | faible | à faire par moi (définir `ALLOWED_ORIGIN`) |
| P4 | `pdf.js` 3.11.174 chargé depuis cdnjs sans SRI, à la volée. | faible | à confirmer |
| P5 | La clé peut être envoyée en paramètre d'adresse (`?key=`) en dernier recours (l'en-tête passe en premier). | faible | à confirmer |
| P6 | Les chemins `/api/market` et `/api/sync` sont des restes de l'ancienne version Netlify ; les fonctions Netlify (et Netlify Identity) **ne sont pas dans ce dépôt** : je n'ai pas pu les auditer. Si l'ancien site tourne encore, il garde peut-être des données. | à vérifier | à faire par moi |
| P7 | Règles Firestore du dépôt : chaque utilisateur n'accède qu'à ses données (déjà chiffrées côté navigateur). Bon. Lecture des PDF : analyse locale ; les scans/photos partent chez Gemini, ce que l'appli annonce. Réponses de l'IA affichées via `md()` qui échappe d'abord : pas de XSS trouvée. | — | rien à faire |

## Ce qui a été corrigé (un commit par projet)
1. **Transversal** : `.gitignore`, rapport (ce fichier).
2. **Infikit** : nettoyage des données importées (`cleanData`), CSV compta protégé, CSP minimale.
3. **Administration et site** : exports CSV protégés, CSP minimale, bandeau sur les cartes cadeaux lues dans un lien.
4. **Gourmet AI et Freelance Kit** : CSP minimale.
5. **Wouf** : export CSV protégé, version interne 1.22.2 ; `CARTE.md` régénéré.

## À faire par vous
1. **Restreindre la clé Firebase** (Google Cloud Console → API et services → Identifiants → clé « Browser key ») :
   - *Restrictions relatives aux applications* : référents HTTP `https://quentools.fr/*`, `https://ikeupods-del.github.io/*`, `https://woufapp.fr/*`, `https://quentools-adca1.firebaseapp.com/*`.
   - *Restrictions relatives aux API* : Identity Toolkit, Token Service, Cloud Firestore. Pas besoin de la régénérer (elle n'est pas secrète). **Attention** : le relais Cloudflare de Wouf appelle Firestore avec cette clé sans `Referer` ; avant de restreindre, créez une seconde clé réservée au relais (variable `FIREBASE_API_KEY`) ou ajoutez-lui les restrictions adaptées.
2. **Clés Gemini / xAI** (les vôtres et celles des utilisateurs) : aucune n'est dans le dépôt, donc rien à révoquer. Pour la vôtre : Google AI Studio → clé → restreindre au site (`https://quentools.fr/*`) et à l'API *Generative Language*, et fixer un quota. Conseillez la même chose aux utilisateurs.
3. **Firebase** : activer **App Check** (anti-spam des formulaires), créer une **alerte de budget**, et vérifier dans la console que les règles publiées regroupent bien celles de l'administration, de Wouf **et** de Patrimoine AI (T7).
4. **Anciennes publications** : vérifier si l'ancien site Netlify de Patrimoine AI existe encore ; sinon le supprimer, avec Netlify Identity et ses données.
5. **Cloudflare** : pour le relais de Patrimoine AI, définir `ALLOWED_ORIGIN` et un `marketProxy` propre ; pour le relais Wouf, rien d'urgent.
6. **Infikit** : faire valider par un juriste ou la CNIL les points I7 (responsabilité, HDS, information des patients) avant tout usage avec de vrais patients ; d'ici là, ne pas conseiller de saisir de vraies données.
7. **Projets non trouvés** : me donner accès aux dépôts ou aux fichiers de Registre crowdfunding, Gestionnaire finances, Panier Futé, Chasse à la maison et des trois jeux pour les auditer.

## Décisions à prendre (je ne les fais pas sans votre accord)
- **T1** : sous-domaine dédié à Infikit (DNS + migration des données des utilisateurs existants, comme pour Wouf).
- **I1** : chiffrement local d'Infikit avec phrase secrète (changement de l'ouverture de l'appli).
- **T3 / F1** : compiler Tailwind et héberger Alpine/three.js/polices dans le dépôt (vérification visuelle nécessaire).
- **T4** : CSP stricte (liste des sites autorisés) après test de la connexion Google en réel.
- **V2** : cartes cadeaux vérifiées côté serveur (aujourd'hui, le lien autonome n'est pas signé).
- **I2, I3, I4, G2** : mémoriser une clé plutôt que la phrase, consigne de jeton à durée limitée, pseudonymisation des CSV, clé Gemini en en-tête.
- **Patrimoine AI** : je peux appliquer les correctifs P1–P5 si vous m'attachez le dépôt en écriture.

## 3 recommandations pour les futurs projets similaires
**Transversal / vitrine**
1. Un sous-domaine par application qui manipule des données sensibles (jamais de mélange d'origines).
2. Aucun script externe : tout est hébergé, ou chargé avec une version fixe et SRI.
3. CSP stricte dès le départ, `.gitignore` et recherche de secrets avant chaque commit.

**Infikit (santé)**
1. Chiffrer sur l'appareil dès le premier jour (phrase secrète, jamais un simple code à 4 chiffres).
2. Prévoir la conformité (registre, notice, HDS, durée de conservation) avant la mise en ligne, pas après.
3. Pseudonymiser par défaut les exports (initiales, pas de motif médical).

**Freelance Kit**
1. Compiler le CSS au lieu d'utiliser un CDN de « jeu » ; version d'Alpine fixée et hébergée.
2. Jetons à durée limitée et droits minimaux ; ne jamais les stocker plus longtemps que nécessaire.
3. Valider et borner les champs importés avant de les utiliser.

**Gourmet AI**
1. Clé IA dans l'en-tête, jamais dans l'adresse, restreinte par site et par quota.
2. Plafonner les nouvelles tentatives et afficher la consommation.
3. Toujours échapper la sortie d'une IA comme n'importe quelle saisie non fiable.

**Wouf**
1. Garder l'approche actuelle : vérification serveur du jeton, de l'IPN, du montant et du bénéficiaire, avec tests.
2. Ne jamais mémoriser de phrase de chiffrement en clair.
3. Passer à une CSP stricte et la tester dans la suite de tests.

**Patrimoine AI / outils financiers**
1. Aucun relais anonyme tiers : toujours votre propre relais avec origine fixée et limite de débit.
2. Chiffrer aussi les données locales (contrats, placements).
3. Aucune fonction serveur oubliée : éteindre les anciens déploiements, vérifier l'authentification de chaque fonction.

**Administration / site vitrine**
1. Toute donnée venant d'un formulaire public est « hostile » : échappée à l'affichage, neutralisée à l'export.
2. Anti-spam (App Check, limite de débit) dès l'ouverture d'un formulaire public.
3. Ne jamais faire confiance à une valeur dans un lien (montant, solde, droits) sans signature serveur.
