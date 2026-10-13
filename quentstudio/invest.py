"""QuentInvest : vulgarisation de l'économie et de l'investissement (Max et Pépite).

Max (Q) est un jeune pressé qui veut devenir riche vite ; Pépite (G), une pièce d'or ronde et calme,
explique simplement. Une vidéo = un sujet en 3 parties de 4 répliques + une question.

Exactitude : les fiches ci-dessous contiennent des faits vérifiés. L'IA locale ne peut citer que les
chiffres et dates présents dans les faits ou dans le sujet donné ; sinon l'épisode est refusé et
réécrit (contrôle du programme, pas de l'IA). Un sujet libre sans fiche est marqué « à vérifier ».
"""
import json
import random
import re

import config
import history
import story

# Fiches : épisodes écrits à la main (utilisables sans IA) et faits fournis à l'IA pour réécrire le sujet
FICHES = [
    {
        "id": "krach-1929", "titre": "Le krach de 1929", "lieu": "Wall Street, 1929",
        "cles": ["krach", "1929", "jeudi noir", "grande depression", "wall street"],
        "faits": ["Dans les années 1920, les prix des actions montent fortement aux États-Unis.",
                  "Le jeudi 24 octobre 1929, appelé « jeudi noir », la bourse de New York s'effondre.",
                  "Le mardi 29 octobre 1929, la chute continue.",
                  "Avant le krach, beaucoup d'investisseurs achetaient des actions à crédit.",
                  "Entre 1929 et 1932, l'indice Dow Jones perd près de 90 % de sa valeur.",
                  "La crise devient la Grande Dépression des années 1930, avec un chômage massif.",
                  "Aux États-Unis, vers 1933, environ un actif sur quatre est au chômage."],
        "parties": [
            ("Avant la chute", [
                ("Q", "Pépite, les années 1920, c'était la belle vie en bourse, non ?"),
                ("G", "Oui, les prix des actions montaient sans arrêt. Tout le monde voulait en acheter."),
                ("Q", "Même ceux qui n'avaient pas d'argent ?"),
                ("G", "Justement : beaucoup achetaient à crédit. Ils empruntaient pour acheter des actions.")]),
            ("Le jeudi noir", [
                ("G", "Le jeudi 24 octobre 1929, la bourse de New York s'effondre. On l'appelle le jeudi noir."),
                ("Q", "Il suffisait de vendre au bon moment !"),
                ("G", "Tout le monde a voulu vendre en même temps. Et ceux qui avaient emprunté devaient rembourser."),
                ("Q", "Donc plus personne n'achète, et les prix plongent encore plus.")]),
            ("La Grande Dépression", [
                ("G", "Entre 1929 et 1932, l'indice Dow Jones perd près de 90 % de sa valeur."),
                ("Q", "Près de quatre-vingt-dix pour cent ? Il ne reste presque rien !"),
                ("G", "Vers 1933, aux États-Unis, environ un actif sur quatre est au chômage."),
                ("Q", "Leçon notée : on n'investit pas avec de l'argent emprunté qu'on ne peut pas perdre.")]),
        ],
        "question": "Tu savais que la crise de 1929 avait commencé par des achats à crédit ?",
    },
    {
        "id": "subprimes-2008", "titre": "La crise de 2008", "lieu": "États-Unis, 2008",
        "cles": ["2008", "subprime", "subprimes", "crise financiere", "lehman"],
        "faits": ["Aux États-Unis, des banques ont prêté pour acheter des maisons à des ménages fragiles : les prêts subprimes.",
                  "Ces prêts ont été regroupés et revendus partout dans le monde sous forme de titres financiers.",
                  "Quand les prix de l'immobilier ont baissé, beaucoup d'emprunteurs n'ont plus pu rembourser.",
                  "Le 15 septembre 2008, une grande banque d'affaires américaine fait faillite.",
                  "La crise financière devient une crise économique mondiale en 2008 et 2009."],
        "parties": [
            ("Des prêts trop faciles", [
                ("Q", "Pépite, c'est quoi cette histoire de subprimes ?"),
                ("G", "Aux États-Unis, des banques prêtaient pour acheter des maisons à des ménages fragiles."),
                ("Q", "Sympa ! Tout le monde devient propriétaire."),
                ("G", "Tant que les prix montent, oui. Sinon, beaucoup ne peuvent plus rembourser.")]),
            ("Le paquet surprise", [
                ("G", "Ces prêts ont été regroupés et revendus partout dans le monde comme des titres financiers."),
                ("Q", "Comme une pochette surprise ?"),
                ("G", "Exactement. Personne ne savait vraiment combien de prêts risqués il y avait dedans."),
                ("Q", "Je n'achète jamais une pochette surprise sans regarder dedans.")]),
            ("L'effondrement", [
                ("G", "Quand les prix de l'immobilier ont baissé, les impayés se sont multipliés."),
                ("G", "Le 15 septembre 2008, une grande banque d'affaires américaine fait faillite."),
                ("Q", "Et la panique part dans le monde entier."),
                ("G", "Oui : la crise financière devient une crise économique mondiale. Comprendre ce qu'on achète, c'est la base.")]),
        ],
        "question": "Tu achèterais un placement que tu ne comprends pas ?",
    },
    {
        "id": "bulle-internet", "titre": "La bulle internet", "lieu": "Bourse, 2000",
        "cles": ["bulle internet", "dot com", "2000", "nasdaq", "bulle"],
        "faits": ["À la fin des années 1990, les actions des entreprises liées à internet montent très fort.",
                  "Beaucoup de ces entreprises ne faisaient pas encore de bénéfices.",
                  "En mars 2000, l'indice Nasdaq atteint un sommet.",
                  "Entre mars 2000 et octobre 2002, le Nasdaq perd près de 80 % de sa valeur."],
        "parties": [
            ("La folie du point com", [
                ("Q", "À la fin des années 1990, il suffisait de dire « internet » pour devenir riche ?"),
                ("G", "Presque. Les actions des entreprises d'internet montaient très fort."),
                ("Q", "Elles gagnaient beaucoup d'argent, alors ?"),
                ("G", "Beaucoup ne faisaient même pas encore de bénéfices. On achetait surtout un rêve.")]),
            ("Le sommet", [
                ("G", "En mars 2000, l'indice Nasdaq, plein d'entreprises technologiques, atteint un sommet."),
                ("Q", "Le bon moment pour acheter encore plus !"),
                ("G", "C'est ce que beaucoup ont pensé. Puis la bulle a éclaté."),
                ("Q", "Éclaté comment ?")]),
            ("La chute", [
                ("G", "Entre mars 2000 et octobre 2002, le Nasdaq perd près de 80 % de sa valeur."),
                ("Q", "Aïe. Il fallait regarder les bénéfices, pas juste le mot internet."),
                ("G", "Voilà. Une bonne idée ne fait pas forcément une bonne affaire au mauvais prix."),
                ("Q", "Je note : le prix compte autant que l'idée.")]),
        ],
        "question": "Pour toi, c'est quoi une bulle financière aujourd'hui ?",
    },
    {
        "id": "interets-composes", "titre": "Les intérêts composés", "lieu": "Ta tirelire",
        "cles": ["interets composes", "interet compose", "capitalisation", "regle de 72"],
        "faits": ["Les intérêts composés : les intérêts gagnés rapportent eux-mêmes des intérêts.",
                  "1000 € placés à 5 % par an deviennent environ 1629 € après 10 ans.",
                  "Au même taux, ils deviennent environ 2653 € après 20 ans.",
                  "La règle de 72 : diviser 72 par le taux annuel donne à peu près le nombre d'années pour doubler.",
                  "À 5 % par an, il faut environ 14 ans pour doubler un capital.",
                  "Un rendement n'est jamais garanti, sauf sur certains produits sans risque."],
        "parties": [
            ("L'effet boule de neige", [
                ("Q", "Pépite, c'est quoi les intérêts composés ? Ça a l'air compliqué."),
                ("G", "C'est simple : tes intérêts rapportent eux-mêmes des intérêts. Comme une boule de neige."),
                ("Q", "Une boule de neige d'argent ? Je veux la même."),
                ("G", "Elle grossit lentement au début, puis de plus en plus vite.")]),
            ("Les chiffres", [
                ("G", "1000 € placés à 5 % par an deviennent environ 1629 € après 10 ans."),
                ("Q", "Et après 20 ans ?"),
                ("G", "Environ 2653 €. La deuxième décennie rapporte plus que la première."),
                ("Q", "Donc le temps travaille pour moi pendant que je dors !")]),
            ("La règle de 72", [
                ("G", "Astuce : divise 72 par le taux. À 5 %, ton argent double en environ 14 ans."),
                ("Q", "Je vais chercher un placement à 72 % alors !"),
                ("G", "Un rendement énorme cache souvent un risque énorme. Et rien n'est garanti."),
                ("Q", "D'accord : commencer tôt, être patient, et se méfier des promesses.")]),
        ],
        "question": "À quel âge tu aurais aimé connaître les intérêts composés ?",
    },
    {
        "id": "inflation", "titre": "L'inflation", "lieu": "Supermarché",
        "cles": ["inflation", "hausse des prix", "pouvoir d achat"],
        "faits": ["L'inflation est la hausse générale et durable des prix.",
                  "Quand les prix montent plus vite que les revenus, le pouvoir d'achat baisse.",
                  "La Banque centrale européenne vise une inflation de 2 % à moyen terme.",
                  "Avec une inflation de 2 % par an, les prix doublent en environ 35 ans.",
                  "De l'argent qui ne rapporte rien perd du pouvoir d'achat quand il y a de l'inflation."],
        "parties": [
            ("Mon panier rétrécit", [
                ("Q", "Pépite, avec le même billet, mon panier est plus petit qu'avant !"),
                ("G", "C'est l'inflation : la hausse générale et durable des prix."),
                ("Q", "Alors mon billet a rétréci au lavage ?"),
                ("G", "Ton billet, non. Ce qu'il permet d'acheter, oui. C'est ton pouvoir d'achat.")]),
            ("Un peu, c'est normal", [
                ("Q", "Il faudrait zéro inflation, non ?"),
                ("G", "La Banque centrale européenne vise environ 2 % par an à moyen terme."),
                ("Q", "Deux pour cent, ce n'est rien."),
                ("G", "Sur la durée, si : à 2 % par an, les prix doublent en environ 35 ans.")]),
            ("Et mon épargne ?", [
                ("Q", "Je garde tout sous mon matelas, c'est plus sûr."),
                ("G", "De l'argent qui ne rapporte rien perd du pouvoir d'achat quand les prix montent."),
                ("Q", "Mon matelas me coûte de l'argent ?"),
                ("G", "En quelque sorte. Mais placer comporte aussi des risques : il faut trouver l'équilibre.")]),
        ],
        "question": "Tu as remarqué l'inflation sur quel produit en premier ?",
    },
    {
        "id": "diversification", "titre": "La diversification", "lieu": "Marché",
        "cles": ["diversification", "diversifier", "panier", "oeufs"],
        "faits": ["Diversifier, c'est répartir son argent entre plusieurs placements différents.",
                  "Si un placement baisse, les autres peuvent compenser.",
                  "La diversification réduit le risque mais ne le supprime pas.",
                  "On peut diversifier par entreprises, par secteurs, par pays et par types de placements."],
        "parties": [
            ("Tout sur une seule", [
                ("Q", "J'ai trouvé l'entreprise parfaite. Je mets tout mon argent dessus !"),
                ("G", "Et si elle a un problème ?"),
                ("Q", "Impossible, elle est parfaite."),
                ("G", "Même les entreprises parfaites ont des mauvaises années.")]),
            ("Le panier d'œufs", [
                ("G", "Diversifier, c'est ne pas mettre tous ses œufs dans le même panier."),
                ("Q", "Donc plusieurs paniers, plusieurs œufs."),
                ("G", "Voilà : si un placement baisse, les autres peuvent compenser."),
                ("Q", "Et ça supprime le risque ?")]),
            ("Les limites", [
                ("G", "Non, ça le réduit. Tout peut baisser en même temps lors d'une grosse crise."),
                ("Q", "Alors je varie quoi ?"),
                ("G", "Les entreprises, les secteurs, les pays, les types de placements."),
                ("Q", "Plusieurs paniers, dans plusieurs marchés. Compris.")]),
        ],
        "question": "Tu mettrais tous tes œufs dans le même panier ?",
    },
    {
        "id": "actions-obligations", "titre": "Actions et obligations", "lieu": "Bourse",
        "cles": ["action", "actions", "obligation", "obligations"],
        "faits": ["Une action est une petite part du capital d'une entreprise.",
                  "Une obligation est un prêt fait à une entreprise ou à un État, qui verse des intérêts.",
                  "Une action peut monter ou baisser fortement ; son rendement n'est pas garanti.",
                  "Une obligation est en général moins risquée qu'une action, mais l'emprunteur peut faire défaut."],
        "parties": [
            ("L'action", [
                ("Q", "Pépite, une action, c'est quoi exactement ?"),
                ("G", "Une petite part d'une entreprise. Tu deviens un tout petit propriétaire."),
                ("Q", "Je suis patron, alors !"),
                ("G", "Disons copropriétaire d'une miette. Sa valeur peut monter ou baisser fortement.")]),
            ("L'obligation", [
                ("Q", "Et une obligation ? C'est obligatoire ?"),
                ("G", "Non ! C'est un prêt que tu fais à une entreprise ou à un État."),
                ("Q", "Et il me rembourse avec des intérêts ?"),
                ("G", "Oui, en général. Mais l'emprunteur peut avoir des difficultés à rembourser.")]),
            ("Le bon mélange", [
                ("Q", "Alors, laquelle est la meilleure ?"),
                ("G", "Aucune n'est meilleure. Les actions sont plus risquées, les obligations plus calmes, en général."),
                ("Q", "Le risque, c'est le prix du rendement espéré."),
                ("G", "Exactement. Et le bon mélange dépend de chacun.")]),
        ],
        "question": "Tu te sens plutôt action ou plutôt obligation ?",
    },
    {
        "id": "fonds-indiciel", "titre": "Les fonds indiciels", "lieu": "Bourse",
        "cles": ["etf", "tracker", "fonds indiciel", "indice", "indiciel"],
        "faits": ["Un indice boursier mesure l'évolution d'un groupe d'entreprises.",
                  "Un fonds indiciel cherche à reproduire un indice plutôt qu'à choisir des entreprises une à une.",
                  "Un fonds indiciel coté en bourse s'appelle souvent ETF.",
                  "Ces fonds ont souvent des frais plus bas que les fonds gérés activement.",
                  "Un fonds indiciel baisse quand son indice baisse."],
        "parties": [
            ("C'est quoi un indice ?", [
                ("Q", "Pépite, à la radio ils disent que l'indice a monté. Quel indice ?"),
                ("G", "Un indice boursier mesure l'évolution d'un groupe d'entreprises."),
                ("Q", "Comme une moyenne de classe ?"),
                ("G", "Un peu. Si la plupart des élèves progressent, la moyenne monte.")]),
            ("Acheter toute la classe", [
                ("G", "Un fonds indiciel achète tout le groupe pour reproduire l'indice."),
                ("Q", "Au lieu de deviner le meilleur élève, je prends toute la classe."),
                ("G", "Voilà. Quand il est coté en bourse, on l'appelle souvent ETF."),
                ("Q", "Et c'est cher ?")]),
            ("Les avantages et la limite", [
                ("G", "Ses frais sont souvent plus bas que ceux des fonds gérés activement."),
                ("Q", "Donc ça ne baisse jamais ?"),
                ("G", "Si ! Quand l'indice baisse, le fonds baisse aussi. Il suit la classe, bonne ou mauvaise."),
                ("Q", "Simple, diversifié, mais pas magique.")]),
        ],
        "question": "Tu préfères choisir tes entreprises ou suivre toute la classe ?",
    },
    {
        "id": "taux-directeurs", "titre": "Les taux directeurs", "lieu": "Banque centrale",
        "cles": ["taux directeur", "taux directeurs", "banque centrale", "bce", "taux d interet"],
        "faits": ["Une banque centrale fixe des taux directeurs : le prix auquel les banques se financent auprès d'elle.",
                  "Quand les taux directeurs montent, les crédits deviennent en général plus chers.",
                  "Monter les taux sert souvent à freiner l'inflation.",
                  "Baisser les taux sert souvent à encourager le crédit et l'activité.",
                  "Dans la zone euro, c'est la Banque centrale européenne qui fixe les taux directeurs."],
        "parties": [
            ("Le grand thermostat", [
                ("Q", "Pépite, pourquoi mon crédit coûte plus cher qu'il y a quelque temps ?"),
                ("G", "À cause des taux directeurs. C'est un peu le thermostat de l'économie."),
                ("Q", "Qui tient le thermostat ?"),
                ("G", "La banque centrale. Dans la zone euro, c'est la Banque centrale européenne.")]),
            ("Monter les taux", [
                ("G", "Quand elle monte ses taux, les banques se financent plus cher, et les crédits aussi."),
                ("Q", "Mais pourquoi faire ça ?"),
                ("G", "Pour freiner l'inflation : moins de crédits, moins de dépenses, les prix se calment."),
                ("Q", "Elle refroidit la maison.")]),
            ("Baisser les taux", [
                ("G", "Et quand l'économie ralentit, elle peut baisser ses taux."),
                ("Q", "Le crédit redevient moins cher, on achète, on investit !"),
                ("G", "Voilà. Tout l'art, c'est de trouver la bonne température."),
                ("Q", "Ni trop chaud, ni trop froid. Comme ma douche.")]),
        ],
        "question": "Tu avais déjà entendu parler des taux directeurs ?",
    },
    {
        "id": "dividende", "titre": "Le dividende", "lieu": "Assemblée des actionnaires",
        "cles": ["dividende", "dividendes", "rendement"],
        "faits": ["Un dividende est une part du bénéfice qu'une entreprise peut verser à ses actionnaires.",
                  "Le dividende n'est pas garanti : l'entreprise peut le baisser ou le supprimer.",
                  "Toutes les entreprises ne versent pas de dividende ; certaines réinvestissent leurs bénéfices.",
                  "Le versement d'un dividende fait en général baisser le prix de l'action d'autant."],
        "parties": [
            ("Le cadeau des actionnaires", [
                ("Q", "Pépite, on m'a dit qu'une action peut me verser de l'argent tous les ans !"),
                ("G", "C'est le dividende : une part du bénéfice que l'entreprise peut verser à ses actionnaires."),
                ("Q", "Peut verser ? Ce n'est pas sûr ?"),
                ("G", "Non. L'entreprise peut le baisser, ou le supprimer en cas de difficulté.")]),
            ("Pas de dividende ?", [
                ("Q", "Alors pourquoi certaines entreprises n'en versent pas ?"),
                ("G", "Elles préfèrent réinvestir leurs bénéfices pour grandir."),
                ("Q", "Elles plantent les graines au lieu de manger les fruits."),
                ("G", "Joli ! C'est exactement ça.")]),
            ("Le piège", [
                ("Q", "Je vais acheter juste avant le dividende et revendre juste après !"),
                ("G", "Le jour du versement, le prix de l'action baisse en général d'autant."),
                ("Q", "Donc je ne gagne rien de magique."),
                ("G", "Voilà. Un dividende n'est pas de l'argent gratuit.")]),
        ],
        "question": "Tu préfères les dividendes ou une entreprise qui réinvestit tout ?",
    },
    {
        "id": "epargne-precaution", "titre": "L'épargne de précaution", "lieu": "Ta maison",
        "cles": ["epargne de precaution", "precaution", "imprevu", "coussin"],
        "faits": ["L'épargne de précaution sert à faire face aux imprévus : panne, réparation, perte de revenus.",
                  "On conseille souvent de garder l'équivalent de 3 à 6 mois de dépenses.",
                  "Cette épargne doit rester disponible rapidement et sans risque de perte.",
                  "On la met de côté avant d'investir dans des placements risqués."],
        "parties": [
            ("Le coussin", [
                ("Q", "J'ai économisé un peu. Je mets tout en bourse dès ce soir !"),
                ("G", "Et si ta voiture tombe en panne demain ?"),
                ("Q", "Je vends mes actions, voilà."),
                ("G", "Peut-être au pire moment, si elles ont baissé. D'abord, un coussin de sécurité.")]),
            ("Combien ?", [
                ("G", "On conseille souvent de garder l'équivalent de 3 à 6 mois de dépenses."),
                ("Q", "Ça fait beaucoup de coussins."),
                ("G", "C'est ce qui te permet de dormir tranquille en cas d'imprévu."),
                ("Q", "Un coussin pour dormir, logique.")]),
            ("Où le mettre ?", [
                ("G", "Cet argent doit être disponible vite, et sans risque de perte."),
                ("Q", "Donc pas sur un placement qui fait des montagnes russes."),
                ("G", "Exactement. Les placements risqués, c'est pour l'argent dont tu n'as pas besoin bientôt."),
                ("Q", "D'abord le coussin, ensuite l'aventure.")]),
        ],
        "question": "Tu as déjà un coussin de sécurité pour les imprévus ?",
    },
    {
        "id": "tulipomanie", "titre": "La folie des tulipes", "lieu": "Provinces-Unies, 1637",
        "cles": ["tulipe", "tulipes", "tulipomanie", "1637"],
        "faits": ["Au XVIIe siècle, aux Provinces-Unies (actuels Pays-Bas), les bulbes de tulipes deviennent très recherchés.",
                  "Les prix de certains bulbes montent de façon spectaculaire.",
                  "En février 1637, le marché s'effondre brutalement.",
                  "La tulipomanie est souvent racontée comme l'une des premières bulles spéculatives, même si les historiens en discutent l'ampleur."],
        "parties": [
            ("Des fleurs en or", [
                ("Q", "Pépite, c'est vrai qu'on a payé des tulipes une fortune ?"),
                ("G", "Au XVIIe siècle, aux Provinces-Unies, certains bulbes de tulipes sont devenus très recherchés."),
                ("Q", "Des fleurs ? Pas de l'or, pas des maisons ?"),
                ("G", "Des fleurs. Les prix de certains bulbes sont montés de façon spectaculaire.")]),
            ("L'emballement", [
                ("Q", "Si le prix monte, j'achète, je revends plus cher, facile !"),
                ("G", "C'est ce que beaucoup pensaient. On achetait surtout pour revendre."),
                ("Q", "Pas pour planter les tulipes ?"),
                ("G", "Non. Quand on achète seulement parce que ça monte, attention à la bulle.")]),
            ("La fanée", [
                ("G", "En février 1637, le marché s'effondre brutalement."),
                ("Q", "Et les tulipes redeviennent… des tulipes."),
                ("G", "Voilà. Les historiens discutent de l'ampleur, mais l'histoire reste une leçon."),
                ("Q", "Un prix qui monte ne dit pas ce que la chose vaut vraiment.")]),
        ],
        "question": "Quelle serait la tulipe d'aujourd'hui, selon toi ?",
    },
    {
        "id": "hyperinflation-1923", "titre": "L'hyperinflation de 1923", "lieu": "Allemagne, 1923",
        "cles": ["hyperinflation", "1923", "weimar", "mark"],
        "faits": ["En 1923, l'Allemagne connaît une hyperinflation : les prix montent de façon vertigineuse.",
                  "En novembre 1923, un dollar américain vaut environ 4 200 milliards de marks.",
                  "Les prix changent parfois plusieurs fois dans la même journée.",
                  "Une nouvelle monnaie, le Rentenmark, est créée fin 1923 pour arrêter la crise."],
        "parties": [
            ("Des prix qui s'envolent", [
                ("Q", "Pépite, l'hyperinflation, c'est de l'inflation en très fort ?"),
                ("G", "Oui. En 1923, en Allemagne, les prix montent de façon vertigineuse."),
                ("Q", "Genre, ma baguette double en un an ?"),
                ("G", "Bien pire : les prix changent parfois plusieurs fois dans la même journée.")]),
            ("Le chiffre fou", [
                ("G", "En novembre 1923, un dollar vaut environ 4 200 milliards de marks."),
                ("Q", "Quatre mille deux cents milliards ? Mon portefeuille n'est pas assez grand."),
                ("G", "Les billets perdaient leur valeur avant même d'être dépensés."),
                ("Q", "Je dépense tout tout de suite, alors !")]),
            ("La sortie", [
                ("G", "Fin 1923, une nouvelle monnaie, le Rentenmark, est créée pour arrêter la crise."),
                ("Q", "Donc la confiance dans la monnaie, c'est vital."),
                ("G", "Exactement. Une monnaie vaut surtout par la confiance qu'on lui accorde."),
                ("Q", "Je vais faire confiance à mes économies. Et les surveiller.")]),
        ],
        "question": "Tu imagines payer ton pain avec une brouette de billets ?",
    },
]

# Sujets pour l'IA quand les fiches sont épuisées (notions, sans chiffres : aucun chiffre ne sera accepté)
SUJETS = [
    "l'offre et la demande", "le PIB", "le chômage", "la récession", "la bourse", "le marché immobilier",
    "le crédit immobilier", "le budget personnel", "le risque et le rendement", "la volatilité", "le capital",
    "la monnaie", "la banque", "les impôts", "le déficit public", "la dette publique", "les matières premières",
    "l'or comme valeur refuge", "le change entre monnaies", "la mondialisation", "la concurrence", "le monopole",
    "la startup", "la levée de fonds", "le bénéfice et le chiffre d'affaires", "la faillite", "les frais de gestion",
    "le biais de la peur de rater une occasion", "acheter haut et vendre bas", "l'investissement régulier",
    "le long terme en bourse", "les arnaques aux placements miracles", "la pyramide de Ponzi", "l'assurance",
    "la retraite par répartition", "les cryptomonnaies et leur risque", "le pouvoir d'achat", "les soldes et la psychologie des prix",
    "l'économie circulaire", "la productivité", "le salaire brut et net", "les taux d'intérêt d'un crédit",
]

CONSIGNE = """Tu écris un épisode court de « QuentInvest », une série qui vulgarise l'économie (vidéo verticale).
Personnages :
- Q = Max, jeune, pressé, veut devenir riche vite, pose des questions naïves et fait des remarques drôles.
- G = Pépite, une pièce d'or ronde, calme et pédagogue, explique simplement et avec exactitude.
Règles :
- Exactement 3 parties, chacune avec un titre court et exactement 4 répliques ; Pépite parle dans chaque partie.
- 22 mots maximum par réplique, français correct, ton léger et bienveillant.
- Exactitude : n'utilise QUE les faits fournis. N'invente aucun chiffre, aucune date, aucun nom.
  Écris les nombres en chiffres. Si aucun fait n'est fourni, n'écris aucun chiffre ni aucune date.
- Jamais de conseil personnalisé du type « achète ceci » ; pas de marque, pas de personne réelle.
- La dernière réplique de la partie 3 donne la leçon à retenir.
- « question » : une question pour les commentaires.
Réponds uniquement en JSON."""

SCHEMA = {
    "type": "object",
    "properties": {
        "titre": {"type": "string"},
        "parties": {"type": "array", "minItems": 3, "maxItems": 3, "items": {
            "type": "object", "properties": {"titre": {"type": "string"}, "plans": story.SCHEMA["properties"]["plans"]},
            "required": ["titre", "plans"]}},
        "question": {"type": "string"},
    },
    "required": ["titre", "parties", "question"],
}


def _nombres(t):
    """Nombres écrits en chiffres (1 000, 4 200, 1629, 2 %…), espaces de milliers retirés."""
    return {re.sub(r"[\s  .]", "", n).replace(",", ".") for n in re.findall(r"\d[\d\s  .,]*\d|\d", t)}


def fiche_pour(sujet):
    """Fiche dont un mot-clé apparaît dans le sujet (ou None)."""
    s = " ".join(history.normaliser(sujet))
    for f in FICHES:
        if any(" ".join(history.normaliser(c)) in s for c in f["cles"]):
            return f
    return None


def episode_depuis_fiche(f):
    return {"titre": f["titre"], "lieu": f["lieu"], "parties": [{"titre": t, "plans": [{"qui": q, "texte": x} for q, x in p]} for t, p in f["parties"]],
            "question": f["question"], "faits": f["faits"], "fiche": f["id"], "source": "fiche"}


def clean_episode(d, faits=(), sujet=""):
    """Épisode validé : 3 parties de 4 répliques, aucun chiffre absent des faits ou du sujet (ValueError sinon)."""
    if not isinstance(d, dict) or not isinstance(d.get("parties"), list) or len(d["parties"]) != 3:
        raise ValueError("il faut exactement 3 parties")
    titre = story._texte(d.get("titre"), 60)
    lieu = story._texte(d.get("lieu") or "Économie", 30)
    autorises = _nombres(" ".join(faits) + " " + sujet)
    sketchs = []
    for k, p in enumerate(d["parties"]):
        s = story.clean_sketch({"titre": (p or {}).get("titre"), "lieu": lieu, "mots": [titre, str(k)], "plans": (p or {}).get("plans"), "source": d.get("source", "ia")})
        if not any(x["qui"] == "G" for x in s["plans"]):
            raise ValueError("Pépite doit expliquer dans chaque partie")
        for x in s["plans"]:
            inconnus = _nombres(x["texte"]) - autorises
            if inconnus:
                raise ValueError(f"chiffre non vérifié : {', '.join(sorted(inconnus))}")
        sketchs.append(s)
    q = story._texte(d.get("question") or "Tu connaissais cette histoire ?", 90)
    for s in sketchs:  # surtitre : titre de l'épisode
        s["episode"] = titre
    return {"titre": titre, "sketchs": sketchs, "question": q if q.endswith(("?", "!", ".")) else q + " ?"}


def ia_episode(sujet, faits=()):
    demande = (f"Sujet : {sujet}\n" + ("Faits vérifiés (seule source autorisée pour les chiffres et dates) :\n- " + "\n- ".join(faits)
                                       if faits else "Aucun fait fourni : n'écris aucun chiffre ni aucune date.")
               + "\nÉcris l'épisode.")
    r = story._http("/api/chat", {
        "model": config.MODELE_IA, "stream": False, "format": SCHEMA,
        "options": {"temperature": 0.7, "num_predict": 1100},
        "messages": [{"role": "system", "content": CONSIGNE}, {"role": "user", "content": demande}],
    })
    d = json.loads((r.get("message") or {}).get("content", ""))
    d["lieu"] = d.get("lieu") or "Économie"
    d["source"] = "ia"
    return clean_episode(d, faits, sujet)


def _deja(titre):
    return history.deja_vu({"titre": titre, "mots": []})


def bibliotheque():
    """Épisodes écrits par l'IA et validés (la bibliothèque s'enrichit ; les fiches s'y ajoutent au compteur)."""
    b = config.lire_json(config.chemin("bibliotheque.json", "quentinvest"), [])
    return b if isinstance(b, list) else []


def _ajouter(v):
    b = bibliotheque()
    if not any(x.get("episode") == v["episode"] for x in b):
        b.append(v)
        config.ecrire_json(config.chemin("bibliotheque.json", "quentinvest"), b)


def reserve():
    r = config.lire_json(config.chemin("reserve.json", "quentinvest"), [])
    return r if isinstance(r, list) else []


def _video_ia_liste(journal=print, exclus=()):
    """Épisode écrit par l'IA sur une notion de la liste jamais traitée."""
    pris = set(exclus)
    sujets = [s for s in SUJETS if s not in pris and not _deja(s)] or [s for s in SUJETS if s not in pris] or SUJETS
    s = random.choice(sujets)
    for _ in range(4):
        try:
            ep = ia_episode(s)
            return {"sketchs": ep["sketchs"], "question": ep["question"], "mode": "IA locale", "verifier": True,
                    "episode": ep["titre"], "sujet": s}
        except Exception as e:
            journal(f"IA : épisode refusé ({e}), je réécris")
    raise RuntimeError("L'IA locale n'a pas écrit d'épisode valide, réessaie.")


def pregenerer(n=20, journal=print, avancement=lambda i, n: None):
    """n épisodes écrits en avance par l'IA (sujets de la liste), mis en réserve et en bibliothèque."""
    if story.ollama_etat() != "ok":
        raise RuntimeError("QuentInvest a besoin de l'IA locale pour écrire des épisodes en avance (les fiches sont déjà prêtes).")
    r = reserve()
    faits = 0
    for i in range(n):
        try:
            v = _video_ia_liste(journal, exclus=[x.get("sujet") for x in r])
            r.append(v)
            _ajouter(v)
            faits += 1
            config.ecrire_json(config.chemin("reserve.json", "quentinvest"), r)
        except RuntimeError as e:
            journal(str(e))
        avancement(i + 1, n)
    return faits


def scenario(mode="auto", sujet="", journal=print):
    """Vidéo QuentInvest : {'sketchs': [3 parties], 'question', 'mode', 'verifier'}.

    sujet donné : fiche correspondante (réécrite par l'IA si elle est là) ou épisode écrit par l'IA (à vérifier).
    sans sujet : prochaine fiche jamais publiée, puis un sujet de la liste écrit par l'IA.
    """
    ia = story.ollama_etat() == "ok"
    sujet = (sujet or "").strip()[:200]
    verifier = False
    if sujet:
        f = fiche_pour(sujet)
        if f and (not ia or mode == "bibliotheque"):
            ep, origine = clean_episode(episode_depuis_fiche(f), f["faits"]), "fiche"
        elif ia:
            ep, origine, err = None, "IA locale" + (" + fiche" if f else ""), None
            for _ in range(4):
                try:
                    ep = ia_episode(sujet, f["faits"] if f else ())
                    break
                except Exception as e:
                    err = e
                    journal(f"IA : épisode refusé ({e}), je réécris")
            if not ep:
                if f:
                    ep, origine = clean_episode(episode_depuis_fiche(f), f["faits"]), "fiche"
                else:
                    raise RuntimeError(f"L'IA locale n'a pas écrit d'épisode valide ({err}). Réessaie ou reformule le sujet.")
            verifier = not f
        else:
            raise RuntimeError("Aucune fiche sur ce sujet et IA locale indisponible : lance Ollama, ou choisis un sujet "
                               "parmi : " + ", ".join(x["titre"] for x in FICHES) + ".")
    else:
        r = reserve()
        if r and mode != "bibliotheque":
            v = r.pop(0)
            config.ecrire_json(config.chemin("reserve.json", "quentinvest"), r)
            v["mode"] = "réserve (IA locale)"
            return v
        libres = [f for f in FICHES if not _deja(f["titre"])]
        if libres and (mode != "ia" or not ia):
            f = libres[0]
            ep, origine = clean_episode(episode_depuis_fiche(f), f["faits"]), "fiche"
        elif ia:
            v = _video_ia_liste(journal)
            _ajouter(v)
            return v
        else:
            f = min(FICHES, key=lambda x: random.random())
            ep, origine = clean_episode(episode_depuis_fiche(f), f["faits"]), "fiche (déjà publiée)"
            journal("Toutes les fiches ont été publiées : lance l'IA locale pour de nouveaux sujets, ou donne un sujet.")
    v = {"sketchs": ep["sketchs"], "question": ep["question"], "mode": origine, "verifier": verifier, "episode": ep["titre"]}
    if origine.startswith("IA"):
        _ajouter(v)
    return v
