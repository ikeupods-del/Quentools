# CARTE du dépôt (générée : `node tools/carte.js`, ne pas éditer à la main)

Lire ceci AVANT de chercher dans le code. `dépend de` = fichiers dont les fonctions/constantes sont utilisées.

## Wouf : ordre de chargement
config.js → data.js → species.js → core.js → health.js → screens.js → sos.js → nutrition.js → croquettes.js → lessons.js → lessons2.js → lessons_cat.js → lessons3.js → lessons_cat2.js → lessons4.js → lessons_cat3.js → lessons5.js → lessons_cat4.js → lessons6.js → lessons7.js → lessons_cat5.js → lessons_plans.js → quiz.js → quiz2.js → quiz_chat.js → educ.js → parcours.js → cloud.js → tracker.js → plusfeatures.js → guide.js → noms.js → business.js → admin.js → extras.js → testalim.js → guides.js → main.js

### wouf/config.js (89 l.)
Wouf — configuration. Guide complet : wouf/docs/MAINTENANCE.md ► WOUF PLUS (achat unique à vie) : tout est GRATUIT tant que `billing.enabled` vaut false. Pour ouvrir la vente : suivre la che
- dépend de : extras.js

### wouf/data.js (187 l.)
Wouf — données de référence (indicatives : elles ne remplacent jamais l'avis d'un vétérinaire).
- définit : VACCINES TYPES ROUTINE_TYPES BREEDS SIZE_LABEL SENIOR_AGE breedOf TOXICS FIRST_AID URGENT_SIGNS POISON_LINES TIPS
- dépend de : species.js core.js noms.js

### wouf/species.js (165 l.)
Wouf — espèces : chien 🐶 et chat 🐱 (gratuit : 1 chien + 1 chat ; Plus : autant d'animaux qu'on veut). Tout ce qui diffère selon l'espèce est ici : vocabulaire, races, vaccins, toxiques, pr
- définit : presetsFor humanAgeOf SPECIES spOf CAT_BREEDS CAT_PRESETS breedsFor TOXICS_CAT FIRST_AID_CAT URGENT_CAT TIPS_CAT NUT_FACTORS_DOG NUT_FACTORS_CAT nutFactorsOf toxicsOf firstAidOf urgentOf tipsOf
- dépend de : data.js core.js

### wouf/core.js (280 l.)
Wouf — noyau : outils, stockage, fenêtres, formulaires, abonnement.
- définit : logError ageMonths ageText blank migrate load flush save idbOp loadImage imageBlob squarePhoto ownerCheck statsUrl track toast sheet closeSheet ask fieldHTML readForm openForm lineChart barChart grandfathered plus canAddPet canAddDoc gate download shareOrDownload CFG BILL KEY SCHEMA $ $$ esc uid pad iso today parseD addDays addMonths diffDays fmtDate fmtMoney fmtKg num sum ageYears humanAge S dog idb fput fget fdel blobToDataURL …
- dépend de : cloud.js noms.js business.js main.js

### wouf/health.js (137 l.)
Wouf — logique santé : rappels, score de suivi, plan chiot, poids, calendrier.
- définit : reminders missing score weightStatus lifeStage medsToday allExpenses puppyPlan buildICS maybeNotify dogEvents dogWeights lastWeight dogBreed dogSize dueText idealBand SLOTS medActive EXPENSE_CATS
- dépend de : data.js species.js core.js

### wouf/screens.js (328 l.)
Wouf — écrans principaux : chiens, accueil, carnet, suivi (poids, traitements, journal).
- écrans : #/home #/carnet #/plan #/suivi
- actions : dogs pick-dog edit-dog new-dog first-dog tip-next renew add-event edit-event carnet-f plan-done add-weight edit-weight add-med edit-med add-journal edit-journal tab-suivi journal-f
- définit : avatar renderTop dogFields saveDog newDog editDog welcome reminderRow eventForm weightForm medForm medRow journalForm UI ACT ROUTES HOME JKINDS
- dépend de : data.js species.js core.js health.js educ.js tracker.js guide.js noms.js business.js extras.js guides.js main.js

### wouf/sos.js (184 l.)
Wouf — SOS : vétérinaires ouverts / de garde autour de soi (données OpenStreetMap), contacts, premiers secours, toxiques.
- écrans : #/sos
- actions : locate locate-home vet-filter add-contact edit-contact emergency print-em share-em
- définit : openNow overpass searchVets locate geocode vetsHTML renderVets contactForm emergencyHTML toxHTML VETS OSM_DAYS haversine
- dépend de : data.js species.js core.js health.js screens.js noms.js extras.js main.js

### wouf/nutrition.js (229 l.)
Wouf — nutrition : calculs purs (sans écran ni état) du comparateur de croquettes. HONNÊTETÉ : Wouf n'embarque AUCUNE base de produits inventée. Il analyse la composition RÉELLE lue sur l'ét
- définit : nfeAsFed foodKcal100 nutTargets splitIngredients analyseIngredients allergyHits rangeScore stageFit scoreFood guessFoodStage guessFoodType recommendFood FOOD_TYPES FOOD_STAGES ACTIVITY nuNum nuR1 nuNorm foodMoisture toDM foodPricePerKg dailyKcal rationGrams costPerDay MEATS CEREALS LEGUMES ALLERGENS ALLERGEN_LABEL nuHas
- dépend de : core.js health.js

### wouf/croquettes.js (225 l.)
Wouf — comparateur de croquettes : écrans. Le calcul est dans nutrition.js (testé séparément). Les produits sont ceux que l'utilisateur saisit (ou importe depuis Open Pet Food Facts) : aucun
- écrans : #/croquettes #/croquette #/croquettes-guide
- actions : food-act sugg-run sugg-add food-del food-add food-edit food-search food-pick
- définit : foodProfile foodKcalNeed foodTips evalFood suggHTML renderSugg runSuggest foodForm opffSearch fromOPFF foodsFor fmt lvlIcon FSEL SUGG OPFF OPFF_RES GUIDE_FOOD
- dépend de : data.js species.js core.js health.js screens.js nutrition.js educ.js tracker.js noms.js main.js

### wouf/lessons.js (228 l.)
Wouf Éducation — leçons. Méthode : renforcement positif (récompenser ce qu'on veut voir), fondée sur les principes de l'apprentissage animal. Aucune méthode aversive (pas de coups, de collie
- définit : PRINCIPLES LESSONS PROGRAMS
- dépend de : core.js

### wouf/lessons2.js (215 l.)
Wouf Éducation — leçons chien supplémentaires (Wouf Plus). Même méthode que lessons.js : renforcement positif, aucune contrainte physique. Pour un problème sérieux (agressivité, peur intense
- dépend de : core.js lessons.js

### wouf/lessons_cat.js (150 l.)
Wouf Éducation — leçons pour chats. Principes : environnement adapté, renforcement positif, respect du rythme du chat, aucune punition (elle augmente le stress et les comportements indésirab
- définit : PRINCIPLES_CAT
- dépend de : core.js lessons.js

### wouf/lessons3.js (246 l.)
Wouf Éducation — leçons chien supplémentaires (Wouf Plus), 3ᵉ série. Même méthode : renforcement positif, aucune contrainte physique. Chaque leçon : étapes, programme d'entraînement jour par
- dépend de : core.js lessons.js noms.js

### wouf/lessons_cat2.js (121 l.)
Wouf Éducation — leçons chat supplémentaires (Wouf Plus). Principes : environnement adapté, respect du rythme du chat, aucune punition. Tout changement soudain de comportement doit d'abord f
- dépend de : core.js lessons.js

### wouf/lessons4.js (181 l.)
Wouf Éducation — leçons chien supplémentaires (Wouf Plus), 4ᵉ série : émotions, attention, maîtrise de soi, vie quotidienne et santé. Même méthode : renforcement positif, aucune contrainte p
- dépend de : core.js lessons.js

### wouf/lessons_cat3.js (101 l.)
Wouf Éducation — leçons chat supplémentaires (Wouf Plus), 3ᵉ série : comportement, santé et changements de vie. Même méthode : renforcement positif, aucune punition (jamais de jet d’eau, de 
- dépend de : core.js lessons.js

### wouf/lessons5.js (140 l.)
Wouf Éducation — leçons supplémentaires (Wouf Plus), 5ᵉ série : chien (vétérinaire, eau, premières nuits, jeux d’intelligence, arrivée d’un bébé, chien craintif, deux chiens) et chat (bébé, 
- dépend de : core.js lessons.js

### wouf/lessons_cat4.js (83 l.)
Wouf Éducation — leçons chat supplémentaires (Wouf Plus), 4ᵉ série : bébé, hydratation, poids, sorties. Renforcement positif, aucune punition. Contenu à faire relire par un vétérinaire ou un
- dépend de : core.js lessons.js noms.js

### wouf/lessons6.js (194 l.)
Wouf Éducation — leçons chien (Wouf Plus), 6ᵉ série : soins du quotidien, santé et vie pratique. Renforcement positif uniquement, aucune contrainte physique ni punition. Contenu à faire reli
- dépend de : core.js lessons.js

### wouf/lessons7.js (194 l.)
Wouf Éducation — leçons chien (Wouf Plus), 7ᵉ série : comportement, langage, situations particulières et complicité. Renforcement positif uniquement, aucune contrainte physique ni punition. 
- dépend de : core.js lessons.js noms.js

### wouf/lessons_cat5.js (226 l.)
Wouf Éducation — leçons chat (Wouf Plus), 5ᵉ série : langage, soins, sécurité, voyages et complicité. Renforcement positif, aucune punition (jamais de jet d’eau, de cri ni de contrainte). Co
- dépend de : core.js lessons.js

### wouf/lessons_plans.js (74 l.)
Wouf Éducation — programme d'entraînement (« plan ») et pistes pour aller plus loin (« next ») des leçons de base. Chargé après toutes les leçons : il complète chaque leçon par son identifia
- définit : LESSON_EXTRAS
- dépend de : core.js lessons.js

### wouf/quiz.js (199 l.)
Wouf — quiz de validation des leçons, écrits à la main (3 questions par leçon, fidèles au contenu de la leçon). Format : [question, BONNE réponse, mauvaise réponse, mauvaise réponse, explica
- définit : QUIZZES
- dépend de : core.js

### wouf/quiz2.js (190 l.)
Wouf — quiz de validation, série 2 : leçons chien des fichiers lessons4.js à lessons7.js. Même format que quiz.js.
- dépend de : core.js quiz.js

### wouf/quiz_chat.js (180 l.)
Wouf — quiz de validation, série 3 : toutes les leçons chat. Même format que quiz.js.
- dépend de : core.js quiz.js

### wouf/educ.js (172 l.)
Wouf Éducation — leçons, séances guidées, progression, badges, programme chiot.
- écrans : #/educ #/principes #/lecon #/seance #/programme
- actions : edu-cat step-tick lesson-done s-step s-click s-ok s-ko s-end prog-start
- définit : eduSet allSessions eduStats nextLesson lessonCard eduFilter eduListHTML clickSound routeParam lessonOf lessonsFor programsFor principlesFor eduGet lessonUnlocked lessonState STATE_LABEL BADGES EDU eduCats SEANCE
- dépend de : species.js core.js health.js screens.js lessons.js lessons_cat.js parcours.js business.js main.js

### wouf/parcours.js (194 l.)
Wouf Éducation — parcours en empreintes de pattes : unités, étapes à débloquer, os à gagner (points), niveaux, objectif du jour, mini-quiz de validation, célébrations, et offre récompense (W
- actions : unit-open quiz-open quiz-pick quiz-next quiz-retry quiz-finish reward-show reward-buy
- définit : xpOf levelOf unitsFor pathHTML lessonQuiz quizHTML quizRender quizOpen celebrate rewardEligible rewardCheck rewardSheet mascot quizMood quizSound XP_SESSION LEVELS todaySessions UNIT_ORDER PARC QUIZ REWARD freeIdsOf rewardOn rewardActive MASCOT_TXT pickTxt
- dépend de : core.js health.js lessons.js quiz.js educ.js cloud.js business.js main.js

### wouf/cloud.js (153 l.)
Wouf — connexion Google (Firebase) et sauvegarde automatique dans le cloud. Même projet Firebase que les autres apps QuenTools : un compte Google pour tout, données rangées à part dans users
- actions : g-signin g-sync g-signout
- définit : fb setCloud cloudPayload applyRemote cloudSeal askPass cloudOpen cloudQueue cloudPush cloudPull ask2 cloudInit FBV CLOUD FBP gInfo CloudApi cloudLabel CPASS cloudPass hasData
- dépend de : core.js business.js admin.js extras.js main.js

### wouf/tracker.js (201 l.)
Wouf Plus — suivi GPS des balades : chrono, distance, allure, tracé, objectif du jour, historique, export GPX. Limite technique honnête : une application web ne peut suivre le GPS que lorsqu
- écrans : #/balade #/balade-detail
- actions : w-start w-pause w-resume w-finish w-abort w-del w-gpx w-goal w-manual w-stride
- définit : walkPersist wakeLock stepCounter onMotion motionStart motionStop onPos onPosErr watchStart watchStop walkStart walkPause walkResume simplify walkFinish walkAbort walkRecover traceSVG dailyGoal liveRefresh WALK WALK_KEY distM fmtDur fmtKm walkElapsed fmtPace STEP strideM walkStepDist walkDist dogWalks walksOn walkMinutes
- dépend de : species.js core.js health.js screens.js sos.js educ.js business.js main.js

### wouf/plusfeatures.js (124 l.)
Wouf Plus — Bilan santé intelligent, fiche gardien (pet-sitter), plan de perte de poids. Les conseils sont générés par des règles simples et transparentes : ils orientent, ils ne diagnostiqu
- écrans : #/bilan #/gardien #/plan-poids
- actions : sitter-edit sitter-print sitter-share wp-save wp-clear
- définit : healthInsights sitterHTML weightPlanCalc SITTER_FIELDS WP
- dépend de : data.js species.js core.js health.js screens.js tracker.js business.js extras.js main.js

### wouf/guide.js (313 l.)
Wouf — « Que faire ? » (triage des symptômes) et météo des balades. Règles simples et transparentes : elles orientent (urgence / vétérinaire sous 24 h / surveiller), elles ne diagnostiquent 
- écrans : #/triage #/meteo #/recherche
- actions : tri-pick tri-back tri-flag tri-note meteo-home meteo-city meteo-change meteo-go
- définit : triageResult walkRisk bestHours loadMeteo meteoLocate weatherScene dogScene walkTips walkAlerts meteoCacheGet meteoCachePut meteoNotify meteoHome searchAll searchHTML TRIAGE TRI TRI_LVL METEO FLAT_FACE WCODE SCENE_TXT METEO_TTL WALK_VERDICT
- dépend de : data.js species.js core.js health.js screens.js sos.js educ.js business.js main.js

### wouf/noms.js (111 l.)
Wouf — générateur de noms pour chien et chat : styles, sexe, initiale (dont la « lettre de l'année » LOF/LOOF des pedigrees), test d'un nom (court ? ressemble-t-il à un ordre ?), noms favori
- écrans : #/noms
- actions : nm-set nm-go nm-lof nm-fav nm-say nm-use
- définit : lev nameCheck pickNames namesHTML testHTML NAME_STYLES NAME_POOL LOF_LETTERS lofLetter norm syllables NAME_COMMANDS confusedWith NOMS nameFavs isFav chip
- dépend de : core.js health.js screens.js main.js

### wouf/business.js (317 l.)
Wouf — exploitation et vente : achat unique « à vie », assistance prioritaire, pages légales, nouveautés, alerte de mise à jour, diagnostics. Paiement : lien PayPal + dossier de paiement vér
- écrans : #/merci #/abo #/support #/legal #/nouveautes
- actions : restore checkout buy-go subscribe paywall support-send check-update
- définit : errorLog diagnostics api authHeaders applySub refreshSub paypalUrl buySheet soonSheet paywall legalDoc checkVersion showUpdateBanner initUpdates LEGAL planOf isPriority supportTo ctaLabel nDog legalReady CHANGELOG FEATURES planLine autoOn PAY_LINK payName PAYEE payReady rewardBuyable NAV FAQ orTbd vNewer
- dépend de : species.js core.js health.js screens.js lessons.js educ.js parcours.js cloud.js admin.js extras.js main.js

### wouf/admin.js (253 l.)
Wouf — administration (propriétaire uniquement) : comptes Google, Wouf Plus offert, interrupteur de vente. La SÉCURITÉ est assurée par les règles Firestore (docs/MAINTENANCE.md, « Administra
- écrans : #/admin
- actions : adm-copy adm-reload adm-grant adm-revoke adm-sale adm-save-pay adm-order-ok adm-order-no adm-msg-del
- définit : remoteStore applySaleConfig remoteRefresh accountSync replyLink admLoad statsCard AdminApi SALE_DEFAULT RELAY_URL REMOTE_FIELDS PERSONAL_FIELDS REMOTE_DEF remoteCached legalFull saleReady saleMissing legalMissing lessonsDone ADM grantLabel admErr STAT_EVT
- dépend de : core.js screens.js parcours.js cloud.js business.js main.js

### wouf/extras.js (376 l.)
Wouf — menu Plus, dépenses, documents, nutrition, race, chien perdu, fiche véto, sauvegarde, abonnement, réglages.
- écrans : #/plus #/depenses #/documents #/nutrition #/race #/perdu #/sauvegarde #/don #/transfert #/reglages
- actions : report ics add-expense edit-expense xp-period xp-csv add-doc view-doc poster cenc-on cenc-off export import install stats-opt notif wipe move-go
- définit : printHTML reportHTML expenseForm nutDefault nutCalc deriveKey makeBackup readBackup restoreBackup cloudEncCard movedRedirect movedBanner XP DOC_KINDS b64 unb64 donation installEvt SITE SITE_ORIGIN OLD_ORIGINS onOldSite
- dépend de : data.js species.js core.js health.js screens.js cloud.js business.js main.js

### wouf/testalim.js (66 l.)
Wouf — « Test express : dangereux ou OK ? » : 8 aliments tirés au hasard, accessible SANS carnet (porte d'entrée depuis les réseaux sociaux), avec partage du score. Les aliments dangereux re
- écrans : #/test
- actions : ta-start ta-answer ta-next ta-restart ta-share
- définit : taWhy taShuffle taStart TA_POOL TA_LABEL TEST
- dépend de : data.js species.js core.js health.js screens.js main.js

### wouf/guides.js (231 l.)
Wouf — les 2 e-books (hors éducation) : un gratuit (« Le guide de survie du propriétaire ») et un complet avec Wouf Plus (« Le grand guide santé et bien-être », fonction « guides »). Chaque 
- écrans : #/guides
- actions : guide-open guide-close guide-print
- définit : guideHTML homeEbooks GD_NOTE gdLevel GUIDES GD guideById gdCount gdItem
- dépend de : data.js species.js core.js screens.js business.js extras.js main.js

### wouf/main.js (54 l.)
Wouf — routeur, rendu, démarrage.
- définit : routeName render NAV_OF lastRoute
- dépend de : data.js species.js core.js health.js screens.js educ.js cloud.js tracker.js business.js admin.js extras.js

### wouf/billing-worker/worker.js (252 l.)
Wouf — relais d'activation automatique de Wouf Plus après un paiement PayPal (Cloudflare Worker gratuit). Principe : PayPal prévient ce relais à chaque paiement (IPN, « notify_url » ajouté p
- définit : getJwks verifyToken authed siteConfig payees confirmMail hasGrant findPayments handleIpn handleSupport handleStats handle JWKS_URL IPN_VERIFY DEFAULT_KEY JWKS b64uBytes b64uJson origins cors reply safeUid mail ownerOnly STATS

### wouf/sw.js (18 l.)
Wouf — service worker : l'app s'ouvre sans réseau. Les données (carnet, documents) ne passent jamais par ici : elles restent dans le stockage de l'appareil. Seuls les fichiers de l'app sont 
- définit : CACHE SHELL

## marketing/wouf
- README.md (0 Ko)
- build-queue.js (7 Ko)
- catalogue.json (128 Ko)
- contraste.js (8 Ko)
- contraste.json (2 Ko)
- erreurs.js (6 Ko)
- erreurs.json (5 Ko)
- fiches.json (5 Ko)
- generate.js (27 Ko)
- hero-quiz.js (5 Ko)
- kit.html (23 Ko)
- nimes.js (2 Ko)
- photos-libres.js (3 Ko)
- photos-libres.json (0 Ko)
- preview.js (3 Ko)
- problemes.js (6 Ko)
- problemes.json (9 Ko)
- publish.js (4 Ko)
- queue-make.json (116 Ko)
- queue.json (25 Ko)
- reels.js (3 Ko)
- series.json (49 Ko)
- signes.js (6 Ko)
- to-jpeg.js (1 Ko)
- video-quiz.js (2 Ko)

## Workflows
- apercu.yml
- instagram.yml
- pages.yml
- photos-libres.yml
- wouf-ci.yml
