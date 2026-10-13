"""Générateur procédural de secours (sans IA).

Recombine un problème du quotidien (objet + lieu + plainte), une bourde de Glitchou, une réaction
de Quentools et une chute. Le titre vient de l'objet et de la bourde (« Grille-pain en mode zen »).
L'historique écarte tout sketch qui partage deux éléments sur trois (objet, bourde, chute) avec un
ancien : environ 5 000 sketchs nettement différents (près de 5 ans à une vidéo par jour),
sans compter l'IA locale qui écrit des situations nouvelles en continu.
"""
import random

import corpus
import history

# (clé, objet avec article, nom court, lieu, plainte de Quentools)
PROBLEMES = [
    ("grillepain", "le grille-pain", "grille-pain", "Cuisine", "Glitchou, le grille-pain fait des tartines grises."),
    ("cafetiere", "la cafetière", "cafetière", "Cuisine", "La cafetière fait un bruit de fusée depuis ce matin."),
    ("frigo", "le frigo", "frigo", "Cuisine", "Pourquoi le frigo est tiède ?"),
    ("four", "le four", "four", "Cuisine", "Le four affiche une heure qui n'existe pas."),
    ("microondes", "le micro-ondes", "micro-ondes", "Cuisine", "Le micro-ondes chauffe tout sauf le plat."),
    ("bouilloire", "la bouilloire", "bouilloire", "Cuisine", "La bouilloire siffle sans raison."),
    ("lavevaisselle", "le lave-vaisselle", "lave-vaisselle", "Cuisine", "Les assiettes ressortent plus sales qu'avant."),
    ("poubelle", "la poubelle", "poubelle", "Cuisine", "Qui a programmé la poubelle pour qu'elle se ferme toute seule ?"),
    ("mixeur", "le mixeur", "mixeur", "Cuisine", "Le mixeur s'allume dès que je parle."),
    ("hotte", "la hotte", "hotte", "Cuisine", "La hotte aspire mes recettes au lieu de la fumée."),
    ("balancecuisine", "la balance de cuisine", "balance de cuisine", "Cuisine", "La balance de cuisine dit que ma pomme pèse trois kilos."),
    ("plaques", "les plaques de cuisson", "plaques", "Cuisine", "Les plaques de cuisson s'éteignent dès que je cuisine."),
    ("lavelinge", "la machine à laver", "machine à laver", "Buanderie", "La machine à laver danse dans la buanderie."),
    ("seche", "le sèche-linge", "sèche-linge", "Buanderie", "Mon pull sort du sèche-linge en taille enfant."),
    ("fer", "le fer à repasser", "fer à repasser", "Buanderie", "Le fer à repasser fait des plis au lieu de les enlever."),
    ("aspirateur", "l'aspirateur robot", "aspirateur", "Salon", "L'aspirateur robot me suit partout."),
    ("tele", "la télé", "télé", "Salon", "La télé change de chaîne toute seule."),
    ("enceinte", "l'enceinte", "enceinte", "Salon", "L'enceinte répond à mes questions par des chansons."),
    ("console", "la console", "console", "Salon", "La console refuse que je joue après vingt heures."),
    ("canape", "le canapé connecté", "canapé", "Salon", "Le canapé connecté vient de me demander un mot de passe."),
    ("rideaux", "les rideaux automatiques", "rideaux", "Salon", "Les rideaux s'ouvrent et se ferment en boucle."),
    ("chauffage", "le chauffage", "chauffage", "Salon", "Il fait trente degrés en plein hiver."),
    ("telecommande", "la télécommande", "télécommande", "Salon", "La télécommande zappe quand je cligne des yeux."),
    ("cheminee", "la cheminée électrique", "cheminée", "Salon", "La cheminée électrique diffuse une vidéo de neige."),
    ("projecteur", "le vidéoprojecteur", "vidéoprojecteur", "Salon", "Le vidéoprojecteur affiche tout à l'envers."),
    ("ventilateur", "le ventilateur", "ventilateur", "Chambre", "Le ventilateur souffle dans la mauvaise direction."),
    ("reveil", "le réveil", "réveil", "Chambre", "Le réveil a sonné six fois cette nuit."),
    ("lampe", "la lampe de chevet", "lampe", "Chambre", "La lampe de chevet s'allume quand je ronfle."),
    ("matelas", "le matelas connecté", "matelas", "Chambre", "Le matelas connecté me note chaque nuit."),
    ("volets", "les volets", "volets", "Chambre", "Les volets se ferment à midi pile."),
    ("armoire", "l'armoire", "armoire", "Chambre", "L'armoire a caché toutes mes chemises."),
    ("babyphone", "le babyphone", "babyphone", "Chambre", "Le babyphone me raconte des histoires la nuit."),
    ("douche", "la douche", "douche", "Salle de bain", "La douche alterne bouillant et glacé."),
    ("balance", "la balance", "balance", "Salle de bain", "La balance affiche un message d'encouragement suspect."),
    ("brosse", "la brosse à dents", "brosse à dents", "Salle de bain", "La brosse à dents vibre comme un marteau-piqueur."),
    ("miroir", "le miroir connecté", "miroir", "Salle de bain", "Le miroir connecté me donne des conseils de coiffure."),
    ("sechecheveux", "le sèche-cheveux", "sèche-cheveux", "Salle de bain", "Le sèche-cheveux souffle de l'air froid."),
    ("baignoire", "la baignoire", "baignoire", "Salle de bain", "La baignoire se vide dès que je m'assois."),
    ("rasoir", "le rasoir", "rasoir", "Salle de bain", "Le rasoir m'a laissé une seule moustache, d'un côté."),
    ("imprimante", "l'imprimante", "imprimante", "Bureau", "L'imprimante n'imprime que des points d'interrogation."),
    ("ordinateur", "l'ordinateur", "ordinateur", "Bureau", "L'ordinateur s'éteint dès que j'ouvre un tableau."),
    ("clavier", "le clavier", "clavier", "Bureau", "Le clavier tape des lettres que je n'ai pas tapées."),
    ("souris", "la souris", "souris", "Bureau", "La souris part toute seule vers le coin de l'écran."),
    ("webcam", "la webcam", "webcam", "Bureau", "La webcam me filme uniquement le front."),
    ("agenda", "l'agenda", "agenda", "Bureau", "L'agenda a rempli ma semaine de réunions inconnues."),
    ("mails", "la boîte mail", "boîte mail", "Bureau", "La boîte mail est vide. Complètement vide."),
    ("chaise", "la chaise de bureau", "chaise", "Bureau", "La chaise de bureau descend toute seule."),
    ("ecran", "l'écran", "écran", "Bureau", "L'écran passe en noir et blanc à chaque réunion."),
    ("tableur", "le tableur", "tableur", "Bureau", "Le tableur a additionné mes dates de naissance."),
    ("visio", "la visio", "visio", "Bureau", "La visio me coupe le son dès que je parle."),
    ("telephone", "le téléphone", "téléphone", "Salon", "Le téléphone a changé de langue pendant la nuit."),
    ("montre", "la montre connectée", "montre", "Salon", "La montre connectée dit que j'ai couru un marathon."),
    ("tablette", "la tablette", "tablette", "Salon", "La tablette ne s'allume que si je souris."),
    ("chargeur", "le chargeur", "chargeur", "Salon", "Le chargeur décharge mon téléphone."),
    ("ecouteurs", "les écouteurs", "écouteurs", "Rue", "Les écouteurs ne marchent que d'un côté."),
    ("velo", "le vélo électrique", "vélo", "Rue", "Le vélo électrique freine dans les descentes."),
    ("trottinette", "la trottinette", "trottinette", "Rue", "La trottinette refuse de dépasser la marche à pied."),
    ("parapluie", "le parapluie automatique", "parapluie", "Rue", "Le parapluie s'ouvre quand il fait beau."),
    ("pieton", "le passage piéton", "passage piéton", "Rue", "Le bouton du passage piéton me demande d'attendre une semaine."),
    ("voiture", "la voiture", "voiture", "Parking", "La voiture klaxonne quand je chante."),
    ("gps", "le GPS", "GPS", "Voiture", "Le GPS m'envoie vers la mer, j'allais au travail."),
    ("radio", "la radio de la voiture", "radio", "Voiture", "La radio ne joue que de l'accordéon."),
    ("essuieglace", "les essuie-glaces", "essuie-glaces", "Voiture", "Les essuie-glaces dansent sous le soleil."),
    ("clim", "la climatisation", "clim", "Voiture", "La climatisation souffle de la neige."),
    ("portail", "le portail", "portail", "Jardin", "Le portail s'ouvre pour les pigeons, pas pour moi."),
    ("tondeuse", "la tondeuse", "tondeuse", "Jardin", "La tondeuse tond le trottoir du voisin."),
    ("arrosage", "l'arrosage automatique", "arrosage", "Jardin", "L'arrosage automatique s'est déclenché sur moi."),
    ("barbecue", "le barbecue", "barbecue", "Jardin", "Le barbecue chauffe à peine."),
    ("piscine", "le robot de piscine", "robot de piscine", "Jardin", "Le robot de piscine fait la planche."),
    ("nichoir", "le nichoir connecté", "nichoir", "Jardin", "Le nichoir connecté a refusé un moineau."),
    ("sonnette", "la sonnette", "sonnette", "Entrée", "La sonnette joue une musique de film d'horreur."),
    ("serrure", "la serrure connectée", "serrure", "Entrée", "La serrure connectée ne me reconnaît plus."),
    ("boitelettres", "la boîte aux lettres", "boîte aux lettres", "Entrée", "La boîte aux lettres renvoie le courrier."),
    ("interphone", "l'interphone", "interphone", "Entrée", "L'interphone répond à ma place."),
    ("ascenseur", "l'ascenseur", "ascenseur", "Couloir", "L'ascenseur s'arrête à tous les étages sauf le mien."),
    ("minuterie", "la minuterie du couloir", "minuterie", "Couloir", "La lumière du couloir s'éteint au bout de deux secondes."),
    ("caisse", "la caisse automatique", "caisse", "Supermarché", "La caisse automatique dit que ma baguette est suspecte."),
    ("chariot", "le chariot", "chariot", "Supermarché", "Le chariot tourne toujours à gauche."),
    ("porteauto", "la porte automatique", "porte automatique", "Supermarché", "La porte automatique ne s'ouvre pas pour moi."),
    ("distributeur", "le distributeur de boissons", "distributeur", "Gare", "Le distributeur a gardé ma pièce et ma dignité."),
    ("billet", "le billet de train", "billet", "Gare", "Mon billet de train est pour hier."),
    ("panneau", "le panneau d'affichage", "panneau", "Gare", "Le panneau annonce mon train sur la voie quarante-deux."),
    ("aquarium", "l'aquarium", "aquarium", "Salon", "L'aquarium fait des bulles en forme de cœur."),
    ("croquettes", "le distributeur de croquettes", "croquettes", "Cuisine", "Le distributeur sert le chat à trois heures du matin."),
    ("album", "l'album photo", "album photo", "Salon", "L'album photo a classé mes vacances dans « erreurs »."),
    ("tapis", "le tapis de course", "tapis de course", "Salon", "Le tapis de course recule."),
    ("veloappart", "le vélo d'appartement", "vélo d'appartement", "Salon", "Le vélo d'appartement m'emmène en randonnée sans fin."),
    ("liseuse", "la liseuse", "liseuse", "Chambre", "La liseuse me raconte la fin de tous les livres."),
    ("listecourses", "la liste de courses", "liste de courses", "Supermarché", "Ma liste de courses ne contient que des bonbons."),
]

# Bourdes de Glitchou (clé, morceau de titre, réplique) : toujours sûres d'elles, jamais méchantes
BOURDES = [
    ("b-maj", "mis à jour", "J'ai fait la mise à jour. Rien ne marche, mais tout est neuf."),
    ("b-zen", "en mode zen", "J'ai mis {objet} en mode zen. Il faut juste attendre l'inspiration."),
    ("b-poeme", "version poème", "J'ai remplacé les réglages par un poème. C'est plus inspirant."),
    ("b-eco", "en économie extrême", "Mode économie maximale : on n'utilise plus rien, et on économise tout."),
    ("b-vacances", "en vacances", "J'ai donné des vacances {a_objet}. Retour prévu en septembre."),
    ("b-fete", "après la fête", "J'ai organisé une fête avec tous les appareils. Ils sont un peu fatigués."),
    ("b-securite", "sous haute sécurité", "Pour ta sécurité, j'ai protégé {objet}. Même de toi."),
    ("b-recyclage", "recyclé", "J'ai recyclé une pièce pour faire un collier. Il me va très bien."),
    ("b-langue", "en langue étrangère", "J'ai passé {objet} en mode langue étrangère. C'est bon pour la culture."),
    ("b-musique", "en musique", "J'ai branché {objet} sur la musique. Tout marche en rythme, maintenant."),
    ("b-sport", "en mode sport", "J'ai activé le mode sport. Tu dois faire dix squats pour le débloquer."),
    ("b-feng", "feng shui", "J'ai appliqué le feng shui. Tout est retourné, mais l'énergie circule."),
    ("b-amitie", "et ses nouveaux amis", "J'ai présenté {objet} au grille-pain. Ils parlent beaucoup, ils travaillent moins."),
    ("b-vote", "et le grand vote", "J'ai organisé un vote entre les appareils. Résultat : tout le monde contre toi."),
    ("b-lune", "à l'heure de la Lune", "J'ai réglé l'horaire sur celui de la Lune. C'est plus naturel."),
    ("b-defi", "sans mode d'emploi", "C'est un défi ! J'ai caché le mode d'emploi pour développer ta patience."),
    ("b-bonus", "et la fonction bonus", "J'ai ajouté une fonction bonus. Je ne sais pas encore laquelle."),
    ("b-yoga", "au yoga", "J'ai inscrit {objet} au yoga. Séance en cours : posture du chien tête en bas."),
    ("b-glacons", "version glaçons", "J'ai copié les réglages de la machine à glaçons. Tout est plus frais."),
    ("b-optim", "optimisé", "J'ai optimisé. Ça marche deux fois moins, mais deux fois plus vite."),
    ("b-humour", "en mode humour", "J'ai installé le mode humour. Il fait des blagues au lieu de fonctionner."),
    ("b-pause", "en pause santé", "J'ai mis une pause obligatoire toutes les trois minutes. Pour la santé."),
    ("b-auto", "tout automatique", "J'ai tout passé en automatique. Même tes décisions."),
    ("b-poli", "et la politesse", "J'ai appris la politesse {a_objet}. Il faut dire « s'il te plaît » trois fois."),
    ("b-ordre", "par ordre alphabétique", "J'ai tout rangé par ordre alphabétique. Les boutons aussi."),
    ("b-test", "grandeur nature", "C'est un test grandeur nature. Toi, tu es le grandeur nature."),
    ("b-humeur", "selon ton humeur", "J'ai réglé {objet} sur ton humeur. Ce matin, ton humeur était en panne."),
    ("b-thermo", "et la météo", "J'ai relié {objet} au thermostat. Maintenant, tout dépend de la météo."),
    ("b-compte", "influenceur", "J'ai ouvert un compte pour {objet}. Déjà plus d'abonnés que toi."),
    ("b-reve", "et le rêve", "J'ai suivi un conseil trouvé dans un rêve. Un très bon rêve."),
    ("b-orchestre", "en symphonie", "J'ai synchronisé tous les appareils. Ils jouent une symphonie à sept heures."),
    ("b-chrono", "en avance", "J'ai accéléré le temps de chauffe. Maintenant, tout est prêt avant que tu demandes."),
    ("b-mystere", "mystère", "J'ai ajouté une part de mystère. Personne ne sait ce que ça fait."),
    ("b-instinct", "à l'instinct", "J'ai fait confiance à mon instinct. Il est rond, comme moi."),
    ("b-tuto", "et le tutoriel", "J'ai lu un tutoriel de trois secondes. Je suis expert, maintenant."),
    ("b-medaille", "et les médailles", "J'ai mis un système de récompense. Une médaille pour {objet} à chaque effort."),
    ("b-bio", "en version bio", "J'ai passé {objet} en version bio. Plus de piles, juste de la bonne volonté."),
    ("b-silence", "en silence", "J'ai coupé le son pour te reposer. Le son de tout. Même de l'alarme."),
    ("b-deco", "vert fluo", "J'ai repeint {objet} en vert fluo. Je m'ennuyais de moi-même."),
    ("b-quiche", "parfum quiche", "J'ai mélangé les programmes avec ceux du four. Tout sent la quiche."),
    ("b-pirate", "en mode pirate", "J'ai mis {objet} en mode pirate. Il faut dire « à l'abordage » pour l'allumer."),
    ("b-meditation", "en méditation", "J'ai appris la méditation {a_objet}. Inutilisable, mais serein."),
    ("b-opera", "à l'opéra", "Les messages d'erreur sont maintenant chantés. En italien. C'est plus noble."),
    ("b-chat", "version chat", "J'ai copié le comportement du chat. Ça marche seulement quand ça en a envie."),
    ("b-horoscope", "et l'horoscope", "J'ai réglé {objet} selon ton horoscope. Aujourd'hui, Mercure dit non."),
    ("b-greve", "en grève", "J'ai donné le droit de grève {a_objet}. Revendication : des pauses café."),
    ("b-minimal", "en minimaliste", "J'ai supprimé tous les boutons. Le minimalisme, c'est la classe."),
    ("b-turbo", "en turbo", "J'ai activé le mode turbo. Il ne reste plus qu'à trouver le frein."),
    ("b-rimes", "en rimes", "Désormais, {objet} ne répond qu'en rimes. Pratique, non ? Ça rime avec fun."),
    ("b-vintage", "à l'ancienne", "J'ai remis {objet} en version d'il y a vingt ans. Le charme du vintage."),
    ("b-envers", "à l'envers", "J'ai inversé tous les réglages. Haut, c'est bas. Bas, c'est la surprise."),
    ("b-loterie", "et la loterie", "J'ai mis une loterie : une fois sur dix, ça marche. Quel suspense !"),
    ("b-chef", "en cuisine", "J'ai donné une recette {a_objet}. Nouvelle ambition : devenir chef."),
    ("b-vis", "en pièces détachées", "J'ai collectionné toutes les vis. Elles sont rangées par taille. Ailleurs."),
    ("b-negociation", "en négociation", "J'ai négocié avec {objet}. Accord trouvé : ça marche le mardi."),
    ("b-ecole", "à l'école", "J'ai inscrit {objet} à l'école. Retour à la rentrée prochaine."),
    ("b-leger", "allégé", "J'ai retiré les pièces lourdes. Ça ne marche plus, mais c'est léger."),
    ("b-coach", "et son coach", "J'ai engagé un coach pour {objet}. Maintenant, la confiance est là."),
    ("b-cache", "à cache-cache", "J'ai joué à cache-cache avec {objet}. J'ai gagné, c'est très bien caché."),
    ("b-alerte", "en alerte", "J'ai mis une alerte à chaque mouvement. Ton éternuement a déclenché l'alarme."),
    ("b-tokyo", "à l'heure de Tokyo", "J'ai réglé {objet} sur l'heure de Tokyo. Pour voyager sans bouger."),
    ("b-ralenti", "au ralenti", "J'ai tout ralenti. La vitesse, c'est stressant."),
    ("b-classement", "dans le classement", "J'ai noté tous les appareils. Dernier du classement : {objet}. Je l'encourage."),
    ("b-art", "en œuvre d'art", "J'ai transformé {objet} en œuvre d'art. On ne touche pas, on admire."),
    ("b-quiz", "et le quiz", "Pour l'utiliser, il faut répondre à un quiz. Question un : qui est le plus rond ?"),
    ("b-pedales", "à pédales", "J'ai remplacé l'électricité par des pédales. C'est écolo et sportif."),
    ("b-confettis", "à confettis", "J'ai ajouté des confettis à chaque réussite. Il y a des confettis partout."),
    ("b-aimant", "aimanté", "J'ai aimanté {objet}. Toutes tes cuillères sont collées dessus."),
    ("b-couleurs", "trié par couleur", "J'ai trié les fonctions par couleur. Les rouges ne marchent plus. Elles boudent."),
    ("b-mascotte", "et la mascotte", "J'ai collé ma photo sur {objet}. Ça motive, de me voir."),
    ("b-rdv", "sur rendez-vous", "Maintenant, {objet} fonctionne sur rendez-vous. Prochain créneau : jeudi."),
    ("b-proverbe", "et les proverbes", "J'ai remplacé les alertes par des proverbes. « Qui va doucement, va en panne. »"),
    ("b-nord", "plein nord", "J'ai orienté {objet} vers le nord. Pour le feng shui et pour les pingouins."),
    ("b-bulles", "à bulles", "J'ai ajouté des bulles. Tout est mieux avec des bulles."),
    ("b-paillettes", "à paillettes", "J'ai ajouté des paillettes. On ne voit plus rien, mais ça brille."),
    ("b-chanter", "et la chanson du matin", "J'ai mis {objet} en accès libre. Il suffit de chanter chaque matin."),
    ("b-solaire", "au soleil", "J'ai branché {objet} sur l'énergie solaire. Ça ne marche que s'il fait beau."),
    ("b-copilote", "en copilote", "Je suis devenu copilote {de_objet}. Je donne des conseils. Beaucoup de conseils."),
    ("b-motsdoux", "et les mots doux", "J'ai programmé des mots doux. Une belle journée souhaitée toutes les dix secondes."),
    ("b-rebours", "et le compte à rebours", "J'ai ajouté un compte à rebours. Je ne sais pas ce qui arrive à zéro."),
]

REACTIONS = [
    "Je voulais juste que ça marche.", "Il est sept heures du matin, Glitchou.", "Tu as demandé l'avis de quelqu'un ?",
    "Je n'ai même pas encore bu mon café.", "On avait dit : plus de mises à jour le lundi.", "Remets tout comme avant, s'il te plaît.",
    "Je sens que ma journée commence très bien.", "Et ça, c'est toi qui appelles une amélioration ?", "J'ai juste besoin de cinq minutes de calme.",
    "Je vais retourner me coucher.", "Tu sais où est le bouton « annuler » ?", "C'était un appareil simple. Il faisait une chose.",
    "Pourquoi je te fais encore confiance ?", "Je vais devoir lire le mode d'emploi. Encore.", "Ce n'est pas un bug. C'est toi.",
    "J'ai une réunion dans dix minutes.", "Glitchou, on en a parlé hier.", "Je vais faire semblant de n'avoir rien vu.",
    "Ça ne pouvait pas attendre demain ?", "Tu es sûr de toi, au moins ?", "Respire. Je respire. Tout va bien.",
    "Et comment je fais, moi, maintenant ?", "Il fallait juste appuyer sur un bouton.", "Je vais t'offrir un bonnet. Avec un bouton « off ».",
    "Je te laisse cinq minutes et voilà.", "On peut revenir à la version d'hier ?", "Mes voisins vont encore se poser des questions.",
    "C'est la troisième fois cette semaine.", "Je ne comprends même pas comment c'est possible.", "Bon. Qu'est-ce que tu proposes ?",
    "J'ai mal à la tête, et ce n'est pas le café.", "Tu ne pourrais pas juste ne rien faire ?", "Je compte jusqu'à dix. Un…",
    "Tu sais que je n'ai rien demandé ?", "Même le chat a l'air inquiet.", "Je crois que je préférais la panne.",
    "Il y a un bouton pour te mettre en pause ?", "Je vais l'écrire sur un post-it : « Ne pas toucher ».",
    "Pourquoi ça m'arrive toujours à moi ?", "D'accord. Et le plan B ?",
]

CHUTES = [
    ("c-merci", "De rien ! Je suis toujours ravi de t'aider."), ("c-note", "Je note : utilisateur enthousiaste."),
    ("c-version", "Attends la version deux. Elle est encore plus surprenante."), ("c-bravo", "Bravo, tu as débloqué le niveau patience."),
    ("c-cafe", "Je t'ai préparé un café. Dans la machine à laver."), ("c-modeste", "Je sais, je suis trop fort. Ne me remercie pas."),
    ("c-plan", "Pas de panique, j'ai un plan. Il est rond."), ("c-avis", "Laisse-moi un avis cinq étoiles, ça m'aide."),
    ("c-equipe", "On forme une super équipe. Surtout moi."), ("c-demain", "Demain, j'améliore les chaussettes."),
    ("c-calme", "Respire avec moi. Inspire… J'ai oublié la suite."), ("c-musique", "Je mets un peu de musique pour détendre l'ambiance."),
    ("c-diplome", "Je vais m'auto-décerner un diplôme. Je le mérite."), ("c-recommence", "D'accord, je recommence. En plus fort."),
    ("c-fier", "Je suis tellement fier de nous."), ("c-pause", "Je vais faire une pause. Tu as l'air de m'épuiser."),
    ("c-surprise", "Attends de voir ce que j'ai fait au frigo."), ("c-ami", "Tu vois, tu as souri. Mission accomplie."),
    ("c-photo", "Souris, je prends une photo pour mon portfolio."), ("c-bouton", "Le bouton « annuler » ? Je l'ai optimisé aussi."),
    ("c-statistiques", "Statistiquement, ça aurait pu être pire. J'ai vérifié."), ("c-gateau", "Pour me faire pardonner, je t'ai fait un gâteau. Virtuel."),
    ("c-reunion", "Je propose une réunion pour en parler. Avec moi seulement."), ("c-apprentissage", "Je ne fais pas d'erreurs. J'apprends en public."),
    ("c-innovation", "Les génies ne sont jamais compris à leur époque."), ("c-encore", "Tu veux que je le refasse ? J'ai adoré."),
    ("c-meteo", "Côté positif : il fait beau. Je crois."), ("c-histoire", "Un jour, on racontera cette histoire en riant. Surtout moi."),
    ("c-tuto", "Je vais en faire un tutoriel. Ça va aider le monde."), ("c-sieste", "Tu veux une sieste ? Je règle le réveil. Fais-moi confiance."),
    ("c-option", "Bonne nouvelle : il y a une option pour ça. Je l'ai cachée."), ("c-tableau", "J'ai tout noté dans un tableau. Le tableau a planté."),
    ("c-calin", "Viens, câlin de réconciliation. Attention, je chauffe un peu."), ("c-controle", "Tout est sous contrôle. Le contrôle est juste parti en pause."),
    ("c-public", "Je pense que le public a adoré."), ("c-solution", "La solution est simple : éteindre, rallumer, et m'applaudir."),
    ("c-livre", "Je vais écrire un livre sur ma méthode. Tome un."), ("c-medaille", "Je me suis décerné la médaille du dépannage."),
    ("c-chanson", "Je t'ai composé une chanson d'excuse. Elle dure deux heures."), ("c-voisins", "Les voisins ont applaudi. Enfin, je crois que c'était ça."),
    ("c-promo", "Je me nomme chef de la maison. Félicitations à moi."), ("c-memoire", "Je retiens la leçon. Enfin, je l'ai rangée quelque part."),
    ("c-bilan", "Bilan : un problème réglé, trois nouveaux. C'est de la croissance."), ("c-sondage", "J'ai fait un sondage. Je suis génial à cent pour cent. J'étais seul à voter."),
    ("c-repos", "Je vais me recharger. Réveille-moi s'il y a une catastrophe."), ("c-patience", "La patience est une vertu. Je t'aide à la pratiquer."),
    ("c-legende", "On parlera de ce jour dans les livres d'histoire."), ("c-oups", "Oups. Enfin, je veux dire : c'était prévu."),
    ("c-rapport", "Je t'envoie un rapport de quarante pages sur l'incident."), ("c-sauvegarde", "Rassure-toi, j'ai sauvegardé l'erreur. Elle est en sécurité."),
    ("c-mode", "Je lance la mode. Dans un mois, tout le monde fera pareil."), ("c-confiance", "Fais-moi confiance. Cette phrase m'a toujours réussi."),
    ("c-ptitdej", "Pour me rattraper, j'ai préparé le petit-déjeuner. Il est dans le grille-pain."), ("c-vote", "On vote ? Moi, je vote pour moi."),
    ("c-carte", "Je t'ai fait une carte d'excuse. En retard, mais sincère."), ("c-selfie", "On fait un selfie pour fêter ça ?"),
    ("c-bientot", "La suite au prochain épisode. Je prépare déjà quelque chose."), ("c-applaudir", "Tu peux applaudir maintenant. Je t'attends."),
    ("c-tropfort", "Parfois, je me fais peur tellement je suis doué."), ("c-routine", "Bon, demain on recommence ? J'adore notre routine."),
    ("c-jardin", "Je vais méditer dans le jardin. Il a besoin de moi aussi."), ("c-stagiaire", "Je vais former un stagiaire. Il s'appellera Glitchou deux."),
    ("c-score", "Score du jour : Glitchou trois, problèmes zéro. Enfin, presque."), ("c-pardon", "Pardon. Mais avoue que c'était original."),
    ("c-prix", "Je vais concourir au prix de l'invention. Catégorie surprise."), ("c-recette", "J'ai écrit la recette de ce désastre. Pour ne pas l'oublier."),
    ("c-conseil", "Mon conseil du jour : ne jamais me laisser seul."), ("c-blague", "C'était une blague. Enfin, maintenant ça en est une."),
]

QUESTIONS = [
    "Et toi, ton {court}, il t'obéit encore ?",
    "Tu laisserais Glitchou toucher à ton {court} ?",
    "Quelle est la pire panne de {court} que tu as vécue ?",
    "Qui gagne : Glitchou ou ton {court} ?",
    "Ton {court} a déjà fait un truc bizarre ? Raconte !",
] + corpus.QUESTIONS


def _maj(t):
    return t[:1].upper() + t[1:]


def contracte(objet, prep):
    """« à » / « de » + article : au grille-pain, à la douche, aux volets, du four, de l'écran…"""
    for art, a, de in (("le ", "au ", "du "), ("les ", "aux ", "des ")):
        if objet.startswith(art):
            return (a if prep == "à" else de) + objet[len(art):]
    return f"{prep} {objet}"


def sketch(rng=random):
    cle, objet, court, lieu, plainte = rng.choice(PROBLEMES)
    bc, btitre, btexte = rng.choice(BOURDES)
    cc, ctexte = rng.choice(CHUTES)
    rempli = lambda t: (t.replace("{a_objet}", contracte(objet, "à")).replace("{de_objet}", contracte(objet, "de"))
                        .replace("{objet}", objet).replace("{Objet}", _maj(objet)))
    return {
        "source": "procedural",
        "titre": f"{_maj(court)} {btitre}",
        "lieu": lieu,
        "mots": [f"o{cle}", bc, cc],
        "plans": [
            {"qui": "Q", "texte": plainte},
            {"qui": "G", "texte": rempli(btexte)},
            {"qui": "Q", "texte": rng.choice(REACTIONS)},
            {"qui": "G", "texte": rempli(ctexte)},
        ],
        "court": court,
    }


def question(sketchs, rng=random):
    court = next((s.get("court") for s in sketchs if s.get("court")), None)
    q = rng.choice(QUESTIONS if court else corpus.QUESTIONS)
    return q.replace("{court}", court or "appareil")


def sketchs_neufs(n, exclus=(), rng=random, essais=None, recents=None):
    """n sketchs procéduraux jamais vus (historique + bibliothèque + exclus).

    recents : ne comparer qu'aux N derniers sketchs utilisés (secours si tout a déjà servi).
    """
    if recents:
        idx = history.Index(history.charger()["sketchs"][-recents:] + list(exclus))
    else:
        idx = history.index(list(corpus.charger()) + list(exclus))
    out = []
    for _ in range(essais or max(400, n * 30)):
        if len(out) >= n:
            break
        s = sketch(rng)
        if idx.proche(s):
            continue
        idx.ajouter(s)
        out.append(s)
    return out


def combinaisons():
    return len(PROBLEMES) * len(BOURDES) * len(REACTIONS) * len(CHUTES)
