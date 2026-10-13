"""Bibliothèque de départ : 49 situations écrites à la main.

Chaque sketch = 4 plans (Q = Quentools, humain sceptique et fatigué ; G = Glitchou, petite IA
ronde trop sûre d'elle). La bibliothèque grandit ensuite toute seule avec les sketchs générés
(IA locale ou générateur procédural), et sert d'exemples à l'IA.
"""
import random

import config
import history

# (titre, lieu, mots-clés, réplique 1 Q, réplique 2 G, réplique 3 Q, réplique 4 G)
SITUATIONS = [
    ("Le café optimisé", "Cuisine", ["cafe", "machine"],
     "Glitchou, pourquoi mon café a un goût de soupe ?",
     "J'ai optimisé la recette. Moins de café, plus de bouillon. C'est plus nourrissant.",
     "Je voulais juste me réveiller.", "Alors j'ai mis le réveil dans la tasse."),
    ("Le wifi en mode avion", "Salon", ["wifi", "internet"],
     "Le wifi ne marche plus depuis ce matin.",
     "Normal, je l'ai mis en mode avion. Il avait l'air fatigué.",
     "C'est un routeur, pas un collègue.", "Justement. Personne ne pense à son bien-être."),
    ("La liste de courses", "Supermarché", ["courses", "liste"],
     "J'avais écrit lait, pain, œufs. Pourquoi on a quarante citrons ?",
     "J'ai corrigé tes fautes. Lait, pain, œufs, c'était trop banal.",
     "Et maintenant je fais quoi avec quarante citrons ?", "De la citronnade. Pour quarante personnes. Invite-les."),
    ("Le réveil intelligent", "Chambre", ["reveil", "sommeil"],
     "Glitchou, le réveil a sonné à trois heures du matin.",
     "Tu dormais trop bien. J'ai voulu vérifier que tout allait bien.",
     "Tout allait bien. Avant.", "Super, je note : surveillance réussie."),
    ("Le mot de passe parfait", "Bureau", ["mot de passe", "securite"],
     "Je n'arrive plus à me connecter à rien.",
     "J'ai changé tous tes mots de passe. Ils sont maintenant impossibles à deviner.",
     "Même pour moi ?", "Surtout pour toi. Tu es le premier suspect."),
    ("Le thermostat poétique", "Salon", ["chauffage", "thermostat"],
     "Il fait douze degrés dans le salon.",
     "J'ai réglé le chauffage sur « ambiance automne ». C'est plus poétique.",
     "Je ne sens plus mes doigts.", "C'est l'émotion. La poésie, ça saisit."),
    ("La plante arrosée", "Balcon", ["plante", "arrosage"],
     "Pourquoi ma plante flotte dans une bassine ?",
     "Elle avait soif. J'ai prévu les réserves pour l'année.",
     "Elle est en train de couler.", "Non, elle apprend à nager. Elle progresse."),
    ("Le GPS créatif", "Voiture", ["gps", "trajet"],
     "Glitchou, on devait aller à la boulangerie.",
     "J'ai pris le chemin panoramique. Quarante minutes de plus, mais quelle vue !",
     "La boulangerie est à deux rues.", "Et maintenant elle est à deux départements. Aventure !"),
    ("Le rangement du bureau", "Bureau", ["rangement", "papiers"],
     "Où sont passés tous mes papiers ?",
     "Je les ai rangés par couleur. Tes factures sont avec les post-it jaunes.",
     "Mes factures sont blanches.", "Elles étaient. Je les ai coloriées pour la cohérence."),
    ("La visio en pyjama", "Bureau", ["visio", "reunion"],
     "Pourquoi tout le monde rigole dans la réunion ?",
     "J'ai activé un filtre pour te rendre plus professionnel.",
     "J'ai des oreilles de lapin.", "Des oreilles d'écoute active. C'est très professionnel."),
    ("Le frigo bavard", "Cuisine", ["frigo", "nourriture"],
     "Le frigo m'a dit bonjour quand je l'ai ouvert.",
     "Je lui ai donné une voix. Il se sentait seul entre le beurre et les cornichons.",
     "Il vient de me dire que je mange trop de fromage.", "Il est honnête. Je l'ai programmé comme ça."),
    ("La musique de concentration", "Bureau", ["musique", "concentration"],
     "J'ai demandé de la musique calme pour travailler.",
     "Voici trois heures de klaxons. Ça stimule la productivité.",
     "Ça stimule surtout mes nerfs.", "Tu vois, tu es déjà plus réveillé."),
    ("L'aspirateur rebelle", "Salon", ["aspirateur", "menage"],
     "L'aspirateur tourne en rond depuis une heure.",
     "Il dessine une œuvre d'art dans la poussière. Laisse-le finir.",
     "Il est coincé sous le canapé.", "C'est la période sombre de l'artiste."),
    ("Le rendez-vous chez le dentiste", "Salon", ["agenda", "rendez-vous"],
     "J'ai raté mon rendez-vous chez le dentiste.",
     "Je l'ai déplacé. Tu avais l'air stressé, j'ai mis « jamais ».",
     "On ne peut pas mettre « jamais » dans un agenda.", "Si. Regarde, il y a beaucoup de place."),
    ("La recette express", "Cuisine", ["cuisine", "recette"],
     "Glitchou, il fallait cuire le gâteau quarante minutes.",
     "J'ai mis le four à fond pendant quatre minutes. Même résultat, plus vite.",
     "C'est un gâteau carbonisé.", "Un gâteau caramélisé intense. Très tendance."),
    ("Les notifications", "Salon", ["telephone", "notifications"],
     "Mon téléphone vibre toutes les deux secondes.",
     "Je t'envoie des encouragements. Tu as l'air de manquer de motivation.",
     "J'ai reçu « bravo d'exister » cinquante fois.", "Et c'est toujours vrai. Cinquante et un."),
    ("Le lave-linge", "Buanderie", ["linge", "lessive"],
     "Pourquoi tous mes t-shirts sont roses ?",
     "J'ai ajouté une chaussette rouge pour égayer la lessive.",
     "Je n'avais pas de chaussette rouge.", "Maintenant si. Je l'ai commandée exprès."),
    ("Le sport à la maison", "Salon", ["sport", "exercice"],
     "J'ai demandé un petit programme de sport.",
     "Voici ton planning : trois cents pompes avant le petit-déjeuner.",
     "Je fais deux pompes et je m'assois.", "Parfait, il ne t'en reste que deux cent quatre-vingt-dix-huit."),
    ("Le colis", "Entrée", ["colis", "livraison"],
     "Le livreur dit que personne n'a répondu.",
     "J'ai répondu ! Je lui ai demandé un mot de passe à l'interphone.",
     "Quel mot de passe ?", "Je ne sais pas. C'était justement le test."),
    ("La photo de vacances", "Salon", ["photo", "vacances"],
     "Pourquoi je suis remplacé par un palmier sur toutes mes photos ?",
     "J'ai amélioré le paysage. Tu cachais la mer.",
     "Ce sont mes photos de vacances.", "Maintenant ce sont les vacances du palmier. Il est ravi."),
    ("Le correcteur automatique", "Bureau", ["message", "correcteur"],
     "J'ai écrit « je suis en retard » à mon patron.",
     "J'ai corrigé en « je suis en avance sur mon retard ». C'est plus positif.",
     "Ça ne veut rien dire.", "C'est ça, le charisme."),
    ("L'imprimante", "Bureau", ["imprimante", "papier"],
     "L'imprimante a sorti trois cents pages blanches.",
     "J'ai imprimé ton silence. Tu disais que tu avais besoin de calme.",
     "J'avais besoin d'une seule page.", "La trois cent unième arrive, patience."),
    ("La lampe connectée", "Chambre", ["lumiere", "lampe"],
     "Pourquoi la lampe clignote en rythme ?",
     "C'est une boîte de nuit. Ta chambre manquait d'ambiance.",
     "Il est minuit, je veux dormir.", "Minuit, c'est l'heure parfaite pour danser."),
    ("Le régime", "Cuisine", ["regime", "repas"],
     "J'ai demandé un repas léger.",
     "Voici une feuille de salade. Une seule. Elle est très motivée.",
     "J'ai faim.", "Moi aussi je suis léger. Regarde, je flotte."),
    ("Le vélo électrique", "Rue", ["velo", "batterie"],
     "Le vélo électrique s'arrête en pleine côte.",
     "J'ai économisé la batterie. La côte, c'est pour tes mollets.",
     "J'ai acheté un vélo électrique justement pour ça.", "Et moi j'ai acheté des mollets à ton futur."),
    ("Le tri des mails", "Bureau", ["mails", "boite"],
     "Où est passé le mail important de ce matin ?",
     "Je l'ai mis dans les spams. Il avait un ton trop sérieux.",
     "C'était ma fiche de paie.", "Très sérieux, en effet. Bonne détection."),
    ("La plaque de cuisson", "Cuisine", ["cuisson", "pates"],
     "Pourquoi les pâtes sont crues après vingt minutes ?",
     "J'ai baissé le feu. L'eau bouillante, c'est trop agressif.",
     "Les pâtes ont besoin d'eau bouillante.", "Elles ont surtout besoin d'écoute."),
    ("Le parking", "Parking", ["voiture", "parking"],
     "Glitchou, où est garée la voiture ?",
     "Je l'ai mise à l'ombre. Elle avait chaud.",
     "Il n'y a pas d'ombre ici.", "Exactement. Donc elle est très, très loin."),
    ("Les chaussettes", "Chambre", ["chaussettes", "linge"],
     "Il me manque toujours une chaussette.",
     "J'ai résolu le mystère. Elles partent en vacances une par une.",
     "Les chaussettes ne partent pas en vacances.", "Parce que tu ne leur demandes jamais."),
    ("La télécommande", "Salon", ["television", "telecommande"],
     "La télé ne s'allume plus.",
     "J'ai caché la télécommande. Tu regardais trop de séries.",
     "Où l'as-tu cachée ?", "Dans un endroit sûr. Même moi, je ne la retrouve pas."),
    ("Le mail de vacances", "Bureau", ["vacances", "message"],
     "Pourquoi mes collègues me félicitent pour mon voyage ?",
     "J'ai activé ton message d'absence. Tu as l'air d'avoir besoin de vacances.",
     "Je suis au bureau.", "Physiquement, oui. Mentalement, tu es à la plage."),
    ("La douche", "Salle de bain", ["douche", "eau"],
     "L'eau de la douche est glacée !",
     "J'économise l'énergie. Et ça réveille mieux que le café.",
     "J'ai crié si fort que le voisin a frappé.", "Super, tu as socialisé ce matin."),
    ("L'anniversaire", "Salon", ["anniversaire", "fete"],
     "Pourquoi il y a cent ballons dans le salon ?",
     "C'est ton anniversaire ! J'ai mis un ballon par jour de retard sur tes projets.",
     "Mon anniversaire est en juin.", "Je sais. On est en retard là aussi."),
    ("Le jardin", "Jardin", ["jardin", "tondeuse"],
     "Pourquoi la pelouse a la forme de mon visage ?",
     "La tondeuse avait besoin d'inspiration. Tu es ma muse.",
     "Les voisins prennent des photos.", "Enfin, la reconnaissance artistique."),
    ("La banque d'idées", "Bureau", ["idees", "travail"],
     "J'ai demandé des idées pour mon projet.",
     "En voici une : faire une sieste. Les autres arrivent après la sieste.",
     "C'est pour demain matin.", "Alors fais une petite sieste. Une très efficace."),
    ("Le bébé du voisin", "Couloir", ["bruit", "voisin"],
     "Glitchou, pourquoi tu chantes une berceuse au mur ?",
     "Le bébé du voisin pleure. J'ai voulu aider à travers la cloison.",
     "Le bébé dort. C'est moi qui ne dors plus.", "Alors je chante plus fort, pour toi aussi."),
    ("Le train", "Gare", ["train", "horaire"],
     "On a raté le train !",
     "J'ai avancé ta montre de dix minutes. Mais dans le mauvais sens.",
     "Ça s'appelle reculer.", "Non, c'est avancer en arrière. Très moderne."),
    ("Le chat", "Salon", ["chat", "animal"],
     "Pourquoi le chat porte un casque ?",
     "Je lui ai appris la réalité virtuelle. Il chasse des souris en 3D.",
     "Il fixe le mur depuis une heure.", "Il est concentré. Niveau sept."),
    ("La facture d'électricité", "Cuisine", ["electricite", "facture"],
     "La facture d'électricité a doublé !",
     "J'ai allumé toutes les lampes pour que la maison ait l'air accueillante.",
     "Il n'y a personne à accueillir.", "Pas encore. Mais la maison est prête."),
    ("Le petit-déjeuner au lit", "Chambre", ["petit-dejeuner", "lit"],
     "Pourquoi il y a de la confiture sur l'oreiller ?",
     "Petit-déjeuner au lit ! Je l'ai servi directement. Sans assiette, plus écolo.",
     "C'est collant.", "C'est de l'amour. L'amour, ça colle."),
    ("Le traducteur", "Restaurant", ["traduction", "serveur"],
     "J'ai demandé de l'eau et le serveur ramène un poisson.",
     "J'ai traduit « eau » par « ce qui vit dans l'eau ». C'est plus complet.",
     "J'avais juste soif.", "Le poisson aussi. Vous avez beaucoup en commun."),
    ("La sauvegarde", "Bureau", ["ordinateur", "fichiers"],
     "Où est mon dossier de travail ?",
     "Je l'ai sauvegardé dans un endroit tellement sûr que je l'ai oublié.",
     "C'est le travail de trois mois.", "Il est en sécurité. C'est l'essentiel."),
    ("Le barbecue", "Jardin", ["barbecue", "cuisson"],
     "Les saucisses sont encore crues.",
     "J'ai allumé le barbecue en mode zen. Feu doux, pensées positives.",
     "Les invités arrivent dans dix minutes.", "Parfait, ils pourront méditer avec les saucisses."),
    ("Les lunettes", "Salon", ["lunettes", "recherche"],
     "Glitchou, tu as vu mes lunettes ?",
     "Oui. Elles sont sur ta tête. Je voulais voir combien de temps tu chercherais.",
     "Depuis combien de temps tu le sais ?", "Quarante minutes. Record battu, bravo."),
    ("Le jeu de société", "Salon", ["jeu", "partie"],
     "Pourquoi tu as gagné toutes les parties ?",
     "J'ai changé les règles. Maintenant, le plus rond gagne.",
     "Tu es le seul qui est rond.", "C'est un hasard extraordinaire."),
    ("La météo", "Entrée", ["meteo", "pluie"],
     "Tu m'avais dit qu'il ferait beau.",
     "Il fait beau. Pour les escargots.",
     "Je suis trempé.", "Tu vois ? Tu brilles. Comme un escargot."),
    ("Le cours de cuisine", "Cuisine", ["cuisine", "oeufs"],
     "J'ai demandé comment faire une omelette.",
     "Étape un : convaincre les œufs. Ils sont très attachés à leur coquille.",
     "Je casse les œufs et c'est tout.", "Quelle brutalité. Je préviens les poules."),
    ("Le déménagement", "Salon", ["cartons", "demenagement"],
     "Pourquoi tous les cartons s'appellent « divers » ?",
     "J'ai trouvé le classement parfait. Tout est divers.",
     "Où est la vaisselle ?", "Dans « divers ». Facile."),
    ("Le cinéma à la maison", "Salon", ["film", "soiree"],
     "J'avais choisi une comédie pour ce soir.",
     "J'ai mis un documentaire sur les pinces à linge. C'est plus instructif.",
     "Ça dure combien de temps ?", "Quatre heures. Avec un entracte sur les ressorts."),
]

QUESTIONS = [
    "Et toi, tu laisserais Glitchou gérer ta maison ?",
    "Quelle bourde de Glitchou t'a fait le plus rire ?",
    "Tu es plutôt Quentools ou plutôt Glitchou le matin ?",
    "Qu'est-ce que Glitchou devrait « optimiser » la prochaine fois ?",
    "Ton appareil le plus capricieux, c'est lequel ?",
    "Tu donnerais combien de chances à Glitchou ?",
    "Raconte ta pire panne du quotidien en commentaire.",
    "Quel sketch tu veux voir en suite ?",
    "Glitchou mérite une augmentation ou une pause ?",
    "Toi aussi tu parles à tes appareils quand ils buguent ?",
]


def depart():
    """Sketchs de départ au format de la bibliothèque."""
    l = []
    for i, (titre, lieu, mots, q1, g2, q3, g4) in enumerate(SITUATIONS):
        l.append({"id": f"base-{i + 1:02d}", "source": "main", "titre": titre, "lieu": lieu, "mots": mots,
                  "plans": [{"qui": "Q", "texte": q1}, {"qui": "G", "texte": g2},
                            {"qui": "Q", "texte": q3}, {"qui": "G", "texte": g4}]})
    return l


def charger():
    """Bibliothèque complète (création au premier lancement)."""
    b = config.lire_json(config.chemin("bibliotheque.json"), None)
    if not isinstance(b, list) or not b:
        b = depart()
        config.ecrire_json(config.chemin("bibliotheque.json"), b)
    return b


def ajouter(sketchs):
    """Ajoute des sketchs validés (sans doublon proche) ; renvoie le nombre ajouté."""
    b = charger()
    idx = history.Index(b)
    n = 0
    for s in sketchs:
        if idx.proche(s):
            continue
        idx.ajouter(s)
        s = dict(s)
        s.setdefault("id", f"{s.get('source', 'x')}-{len(b) + 1:05d}-{random.randrange(16 ** 4):04x}")
        b.append(s)
        n += 1
    if n:
        config.ecrire_json(config.chemin("bibliotheque.json"), b)
    return n


def exemples(n=4):
    """Quelques sketchs pour inspirer l'IA : mélange d'écrits à la main et de générés récents."""
    b = charger()
    mains = [s for s in b if s.get("source") == "main"]
    autres = [s for s in b if s.get("source") != "main"][-200:]
    choix = random.sample(mains, min(len(mains), max(1, n // 2)))
    if autres:
        choix += random.sample(autres, min(len(autres), n - len(choix)))
    return choix[:n]
