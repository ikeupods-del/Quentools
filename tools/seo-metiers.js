/* Pages « site internet par métier » du site vitrine (une URL à la racine par métier, ex. /site-internet-plombier/).
   Chaque texte est propre au métier. Source unique : ce fichier, lu par tools/seo-pages.js (qui écrit les pages et le plan du site).
   Champs : slug, nom (affiché dans les listes), t (title), d (description), h1 (le mot entre * * est mis en valeur), lede,
   cherchent (ce que cherchent les clients), items [[titre, texte] × 4], conclusion, img (image d'exemple, facultative), exemple (lien). */
module.exports = [
  {
    slug: 'site-internet-plombier', nom: 'Plombier', t: 'Site internet pour plombier : clé en main | QuenTools',
    d: 'Création de site internet pour plombier : site vitrine artisan clé en main, bouton d’appel, zones d’intervention, refonte de site possible. Devis gratuit.',
    h1: 'Un site internet pour *plombier*, clé en main.', lede: 'Quand une canalisation fuit ou que la chaudière lâche, votre client cherche un plombier près de chez lui et choisit en quelques secondes. Votre site vitrine doit lui répondre aussi vite : intervenez-vous chez lui, et comment vous joindre ?',
    cherchent: 'Une personne en urgence ne lit pas de longs textes. Elle veut un numéro cliquable, la liste des dépannages que vous faites et les communes que vous desservez. Pour un projet plus calme, comme une salle de bains ou un remplacement de chauffe-eau, elle compare plusieurs plombiers et regarde vos réalisations avant d’appeler.',
    items: [['Bouton d’appel dès l’accueil', 'Le numéro reste visible sur téléphone, même en faisant défiler la page.'], ['Dépannages et installations listés', 'Fuite, débouchage, chauffe-eau, chauffage, sanitaires : chaque prestation a sa place.'], ['Zones d’intervention claires', 'Vos villes sont écrites noir sur blanc, ce qui aide aussi Google à vous proposer aux habitants du secteur.'], ['Demande de devis en deux minutes', 'Un formulaire court, que vous recevez directement, avec la photo du problème si le client en a une.']],
    conclusion: 'Si vous avez déjà un site ancien, une refonte de site permet de garder votre adresse et vos textes utiles tout en le rendant lisible sur mobile. Sinon, nous partons de zéro avec un modèle adapté à la plomberie, personnalisé à votre nom, vos couleurs et vos photos. Le prix est fixé avant de commencer, et vous voyez une première version avant la suite.',
    img: 'ex-plombier', alt: 'Aperçu de l’exemple de site vitrine pour plombier chauffagiste', exemple: 'exemples/plombier/'
  },
  {
    slug: 'site-internet-electricien', nom: 'Électricien', t: 'Site internet pour électricien artisan | QuenTools',
    d: 'Création de site internet pour électricien : site vitrine artisan clé en main, dépannage, mise aux normes, devis en ligne. Prix fixé d’avance.',
    h1: 'Un site internet pour *électricien*, prêt à l’emploi.', lede: 'Panne de courant, tableau électrique ancien, installation à mettre aux normes : vos futurs clients cherchent quelqu’un de sérieux, proche, et qui rappelle vite. Un site vitrine clair vaut mieux que mille cartes de visite oubliées au fond d’un tiroir.',
    cherchent: 'En électricité, la confiance passe avant tout. Les particuliers veulent savoir si vous êtes qualifié, si vous êtes assuré et si vous vous déplacez chez eux. Les professionnels et les syndics cherchent plutôt un interlocuteur régulier, avec des références de chantiers et un moyen simple de demander un devis.',
    items: [['Vos prestations expliquées simplement', 'Dépannage, rénovation, mise aux normes, bornes de recharge : chaque service a quelques lignes claires.'], ['Qualifications et assurances visibles', 'Vos certifications et votre garantie professionnelle sont affichées, si vous en disposez.'], ['Photos de vos installations', 'Un tableau refait proprement rassure plus qu’une longue promesse.'], ['Contact immédiat', 'Numéro cliquable, formulaire de devis et zone desservie dès la première page.']],
    conclusion: 'Votre site est aussi la preuve que votre entreprise existe vraiment. Il reprend votre nom, votre logo et vos coordonnées exactes, avec les mentions légales obligatoires rédigées pour vous. Nous créons un site web clé en main que vous pouvez faire évoluer ensuite : nouvelle prestation, nouvelle ville, nouvelles photos de chantier. Demandez un devis gratuit, la réponse arrive sous 48 heures.',
    img: 'ex-climatisation', alt: 'Aperçu de l’exemple de site vitrine pour artisan du bâtiment : climatisation', exemple: 'exemples/climatisation/'
  },
  {
    slug: 'site-internet-menuisier', nom: 'Menuisier', t: 'Site internet pour menuisier : site vitrine | QuenTools',
    d: 'Création de site internet pour menuisier : site vitrine artisan clé en main avec galerie de réalisations, devis en ligne et refonte de site. Devis gratuit.',
    h1: 'Un site internet pour *menuisier* qui montre votre travail.', lede: 'Un escalier sur mesure, une cuisine, des placards sous pente : votre savoir-faire se voit avant de s’expliquer. Votre site vitrine met vos plus belles réalisations devant les clients qui hésitent encore entre plusieurs artisans.',
    cherchent: 'Les clients d’un menuisier achètent un résultat, pas une prestation. Ils parcourent des photos, jugent la finition du bois, puis cherchent comment vous contacter. Beaucoup préparent leur projet plusieurs semaines à l’avance et comparent des devis : votre site doit donc rester rassurant et facile à retrouver.',
    items: [['Galerie de réalisations', 'Vos meilleurs chantiers classés par type : escaliers, cuisines, fenêtres, aménagements.'], ['Le détail de votre métier', 'Essences de bois, fabrication en atelier, pose chez le client : vous racontez votre méthode.'], ['Demande de devis guidée', 'Le formulaire pose les bonnes questions : pièce, dimensions approximatives, délai souhaité.'], ['Adapté au téléphone', 'Les photos se chargent vite et restent nettes, y compris sur un petit écran.']],
    conclusion: 'Beaucoup de menuisiers ont une page sur les réseaux sociaux, mais pas de site à eux. Or un site vitrine artisan reste visible dans les recherches locales, ne dépend d’aucune plateforme et garde vos réalisations en bonne place. Nous le mettons en ligne à votre nom, avec un nom de domaine offert la première année et trois mois d’assistance pour les petites modifications.',
    img: null, exemple: 'exemples/'
  },
  {
    slug: 'site-internet-macon', nom: 'Maçon', t: 'Site internet pour maçon : site vitrine | QuenTools',
    d: 'Création de site internet pour maçon : site vitrine artisan clé en main, chantiers, rénovation, extension, devis en ligne. Refonte de site possible.',
    h1: 'Un site internet pour *maçon*, solide comme vos murs.', lede: 'Extension, rénovation, dalle, mur de clôture : les chantiers de maçonnerie se décident après plusieurs comparaisons. Un site vitrine soigné montre que vous êtes organisé, réactif et fier de vos réalisations.',
    cherchent: 'Un particulier qui lance des travaux de maçonnerie engage souvent un budget important. Il cherche des preuves : des chantiers terminés, des avis sincères, une présentation honnête de ce que vous faites. Il veut aussi savoir très vite si vous travaillez dans sa commune et dans quels délais vous pouvez démarrer.',
    items: [['Chantiers avant et après', 'Des photos simples, légendées, qui montrent la progression d’un projet.'], ['Vos spécialités', 'Gros œuvre, rénovation, terrassement léger, maçonnerie paysagère : chacune a sa rubrique.'], ['Secteur et délais', 'Vous indiquez votre rayon d’action et vos délais habituels, sans promesse irréaliste.'], ['Devis facile à demander', 'Un formulaire court qui évite les échanges inutiles et vous fait gagner du temps.']],
    conclusion: 'Pas besoin d’un site compliqué : quelques pages bien construites suffisent à inspirer confiance. Nous préparons un site web clé en main adapté aux métiers du bâtiment, avec vos photos, vos coordonnées et les mentions légales. Si vous possédez déjà un site vieillissant, la refonte de site se fait en gardant ce qui marche. Le tarif est annoncé avant le début des travaux, comme pour vos propres devis.',
    img: null, exemple: 'exemples/'
  },
  {
    slug: 'site-internet-coiffeur', nom: 'Coiffeur', t: 'Site internet pour coiffeur : site vitrine | QuenTools',
    d: 'Création de site internet pour coiffeur : site vitrine clé en main, tarifs affichés, réservation en ligne, refonte de site. Devis gratuit, prix fixé.',
    h1: 'Un site internet pour *coiffeur* qui remplit votre agenda.', lede: 'Coupe, couleur, barbe, brushing : vos clients veulent voir l’ambiance du salon, connaître vos tarifs et réserver sans téléphoner pendant que vous avez les mains occupées. Votre site vitrine fait tout cela à votre place.',
    cherchent: 'Choisir un coiffeur est une décision personnelle. On regarde les photos du lieu et des coiffures, on cherche les horaires, on vérifie les prix avant de franchir la porte. Les nouveaux clients arrivent souvent depuis une recherche locale sur mobile, et ils réservent chez celui dont la page répond le plus simplement.',
    items: [['Prestations et tarifs affichés', 'Les prix sont écrits clairement, ce qui évite les questions au téléphone.'], ['Réservation en ligne', 'En option, vos clients choisissent un soin et un créneau directement sur le site.'], ['Ambiance du salon', 'Photos de l’équipe, des coiffures et du lieu, pour donner envie de venir.'], ['Horaires et accès', 'Adresse, plan, jours d’ouverture et numéro, toujours à jour sur la page d’accueil.']],
    conclusion: 'Nous proposons un modèle pensé pour la beauté et la coiffure, avec réservation en trois étapes, que vous pouvez visiter avant de vous décider. Il est personnalisé à votre marque : couleurs, logo, photos et textes. Le site est livré clé en main, mis en ligne à votre nom, avec trois mois d’assistance offerts. Demandez votre devis gratuit en deux minutes.',
    img: 'tpl-institut-beaute', alt: 'Aperçu du modèle de site pour institut de beauté et coiffure avec réservation', exemple: 'demo/institut-beaute/'
  },
  {
    slug: 'site-internet-couvreur', nom: 'Couvreur', t: 'Site internet pour couvreur : site vitrine | QuenTools',
    d: 'Création de site internet pour couvreur : site vitrine artisan clé en main, toiture, zinguerie, réparation de fuite, devis en ligne et refonte de site.',
    h1: 'Un site internet pour *couvreur*, visible dès la première averse.', lede: 'Tuiles cassées après une tempête, fuite sous les combles, toiture à refaire : on cherche un couvreur dans l’urgence ou après des mois d’hésitation. Dans les deux cas, votre site vitrine doit être trouvé et inspirer confiance.',
    cherchent: 'Les clients d’un couvreur ne montent pas sur leur toit : ils dépendent entièrement de votre parole. Ils cherchent donc des signes de sérieux, comme des chantiers photographiés, des garanties expliquées et une réponse rapide à leur demande. Après un orage, les recherches se multiplient, et celui qui apparaît avec un site clair gagne l’appel.',
    items: [['Toiture, zinguerie, isolation', 'Chaque intervention est présentée simplement, avec les situations où vous êtes utile.'], ['Garanties expliquées', 'Vous détaillez ce que couvre votre travail, en mots que tout le monde comprend.'], ['Photos de chantiers', 'Des vues en hauteur qui prouvent votre habitude du terrain.'], ['Contact en un geste', 'Appel direct et formulaire de devis accessibles depuis chaque page.']],
    conclusion: 'Un site vitrine artisan reste en ligne toute l’année, y compris quand vous êtes sur un toit. Nous le préparons avec vous à partir de quelques informations : votre entreprise, vos prestations, vos villes. Le prix est fixé avant de commencer et la mise en ligne se fait à votre nom, avec un nom de domaine offert la première année. En cas de site existant, nous proposons une refonte sans repartir de rien.',
    img: null, exemple: 'exemples/'
  },
  {
    slug: 'site-internet-peintre-batiment', nom: 'Peintre en bâtiment', t: 'Site internet pour peintre en bâtiment | QuenTools',
    d: 'Création de site internet pour peintre en bâtiment : site vitrine artisan clé en main, avant/après, devis en ligne, refonte de site possible.',
    h1: 'Un site internet pour *peintre en bâtiment* qui met de la couleur.', lede: 'Peinture intérieure, ravalement de façade, papier peint, enduits : le résultat parle de lui-même, à condition d’être vu. Votre site vitrine présente vos chantiers comme un petit catalogue de vos plus belles finitions.',
    cherchent: 'Pour un peintre, la première impression compte doublement : le client imagine son futur salon ou sa façade à travers vos photos. Il veut voir des pièces avant et après, comprendre comment vous protégez les meubles, et obtenir une estimation sans perdre une soirée. Les délais et la propreté du chantier reviennent souvent dans ses questions.',
    items: [['Avant et après', 'Des paires de photos qui montrent la transformation d’une pièce ou d’une façade.'], ['Méthode de travail', 'Protection du mobilier, préparation des supports, nombre de couches : vous rassurez en détaillant.'], ['Palette et conseils', 'Quelques idées de teintes et de finitions pour aider le client à se projeter.'], ['Demande d’estimation', 'Surface, type de travaux, délai souhaité : le formulaire recueille l’essentiel.']],
    conclusion: 'Le site peut être modeste au départ et grandir avec votre activité : une page par type de travaux, une galerie qui s’enrichit après chaque chantier. Nous construisons un site web clé en main adapté au mobile, sans publicité ni traceur, avec les mentions légales fournies. L’assistance est offerte pendant trois mois pour ajuster les textes et les photos. Parlons-en lors d’un devis gratuit.',
    img: null, exemple: 'exemples/'
  }
];
