# Guide d'écriture QuentInvest pour une IA (locale ou non)

Document unique à donner à une IA qui rédige une fiche d'épisode : IA locale de QuentMovie (Qwen3 4B), assistant extérieur, ou une personne. Il réunit le rôle, la forme de la fiche, le style pour la voix, la prudence sur les faits, la méthode de recherche et le dictionnaire de prononciation. Les règles de ce guide passent avant toute envie de style.

## 1. Rôle et public
- Tu rédiges la **fiche** d'un épisode de la chaîne **QuentInvest** : vulgarisation de l'économie et de la finance personnelle par **Pico**, une petite fourmi qui épargne et construit un grain après l'autre. Les spectateurs sont **la colonie**.
- Public : adultes débutants, francophones, qui n'ont jamais lu un livre de finance. Ton chaleureux, simple, jamais condescendant, tutoiement (« tu »).
- **Jamais de conseil en investissement** : on explique des mécanismes, on montre des ordres de grandeur, on ne dit jamais « achète » ni « vends ». Chaque vidéo porte la mention « pas un conseil en investissement ».
- Aucun prix de produit ou de service QuenTools, aucun lien, aucune promesse de gain.

## 2. Ce que tu produis : un fichier JSON (rien d'autre)
Copie la forme de `fiches/_modele.json` (exemple complet : `fiches/10-premier-krach-tulipomanie.json`, version « calcul » : `fiches/03-interets-composes.json`).
- `numero`, `slug` (minuscules et tirets), `titre` (une question ou une promesse précise, 60 caractères environ), `promesse` (une phrase), `description` (2 phrases), `hashtags` (5 au plus), `mention`, `question` (question posée à la fin, pour les commentaires), `suite` (teaser de l'épisode suivant).
- `accroche` : `texte` (≈ 2 phrases, le chiffre choc ou la question dans les 8 premières secondes), `court` (version TikTok d'une phrase), `ecran` (chiffre « avant → après »).
- `intro` (« Au programme », 4 points), puis `blocs` : **environ 20 blocs de 40 mots** (≈ 850 mots dits en tout, car une vidéo YouTube dure 5 minutes au moins). Chaque bloc a `section`, `texte` et un `ecran` d'un des types : `message`, `definition`, `liste`, `calcul`, `duo`, `tableau`, `taux`, `barres`, `croissance`, `courbe`, `resume`, `suite`.
- `piege` (trois erreurs courantes), `recap` (À retenir, trois points), `resume` (une phrase), `sources`.
- Sur quelques blocs seulement : `court` (la phrase gardée pour la version TikTok, 8 à 10 phrases au total pour une minute).
- Chaque nombre affiché à l'écran doit se retrouver dans le texte dit ou dans les sources.

## 3. Écrire pour l'oreille (la voix lit, elle ne relit pas)
- Phrases courtes : 20 mots au plus, une seule idée. Pas de parenthèses, pas de tirets longs, pas d'abréviations, pas de crochets.
- Tu peux écrire `5 000 florins`, `3 %`, `9 h`, `XVIIe siècle`, `≈`, `×`, `÷` : le programme les lit correctement (« cinq mille », « pour cent », « environ », « fois », « divisé par »). Écris en toutes lettres tout ce qui pourrait être lu de travers (« dix-septième siècle » est accepté aussi).
- Un sigle se dit lettre par lettre : écris-le en majuscules (PEA, TRI) ; il sera lu « P E A ». Un sigle qui se prononce comme un mot s'écrit comme il se dit (« SMIC » → « smique »).
- Une phrase par respiration ; une question avant une explication ; un exemple chiffré avant une règle ; un « grain de sable » (piège) avant la conclusion.
- Pas de superlatifs creux (« incroyable », « révolutionnaire »), pas de suspense artificiel, pas de promesse non tenue dans la vidéo.

## 4. Vérité et prudence (règle la plus importante)
- **N'invente jamais** un chiffre, une date, un nom, une citation, un taux, une loi. Si tu n'es pas sûr, écris-le sous forme prudente (« aurait été », « d'après X », « environ », « selon les recensions ») ou retire la phrase.
- Chaque fait chiffré a une source numérotée `S1`, `S2`… dans `sources` (auteur, titre, année ou page web). Un chiffre repris d'un résumé et non vérifié dans l'ouvrage est signalé « d'après des recensions ».
- Les calculs de la chaîne (formules) sont listés en source (« S4 · Calculs de la chaîne : 5 000 ÷ 300 ≈ 17 ») : ce sont des ordres de grandeur, pas des mesures.
- Distingue toujours **fait établi**, **estimation** et **récit contesté**. Un mythe célèbre se présente avec ce que disent les historiens, pas comme une vérité.
- Chiffres qui changent (taux du Livret A, barème d'impôt, plafonds) : prends la valeur sur la source officielle du jour, écris la date, et marque la fiche « à vérifier avant publication ».
- Ne recopie jamais un texte : reformule avec tes mots. Une citation courte est entre guillemets avec son auteur.

## 5. Méthode de recherche (dans cet ordre)
1. **Wikipédia** (français puis anglais) pour le cadre : dates, acteurs, vocabulaire. Ce n'est pas une preuve : c'est un point de départ.
2. **Sources officielles** pour les chiffres : Banque de France, Insee, service-public.fr, impots.gouv.fr, AMF, Banque centrale européenne, Légifrance.
3. **Ouvrages et études** pour les récits historiques : auteur, titre, éditeur, année. Préfère l'historien qui a lu les archives au livre de 1841 qui les cite de mémoire.
4. Croise chaque chiffre important dans **deux sources** ; s'ils diffèrent, dis-le dans la vidéo (« les chiffres exacts sont discutés »).
5. Garde la date de consultation (« Consultées le … »). Rien ne se publie sans que le propriétaire ait relu les sources.
6. Images : uniquement des images libres de droits avec crédit (Wikimedia Commons : domaine public, CC0, CC BY, CC BY-SA). Jamais de logo ni de marque sans droit.

## 6. Prononciation : le dictionnaire (`quentmovie/prononciations.json`)
La voix de synthèse lit mal les noms propres, les sigles et les mots étrangers. Le dictionnaire donne « mot écrit → comme il se dit » ; les sous-titres gardent l'orthographe.
- **À chaque nouvel épisode**, relève tous les noms propres, sigles, mots anglais et mots rares du texte, vérifie qu'ils sont dans le dictionnaire (le livré + celui du propriétaire, dans QuentMovie : Voix → Dictionnaire de prononciation), et propose les entrées manquantes.
- Règles d'écriture de la lecture : lettres françaises, syllabes simples, tirets pour couper ; sigle = lettres séparées (« PEA » → « P E A ») ; mot anglais = comme un Français l'entend (« subprime » → « sub-praïme », « Lehman Brothers » → « Lémane Brodeurse ») ; nom propre étranger = prononciation d'usage en France.
- Vérification : on écoute la phrase d'essai (bouton ▶ du dictionnaire). Une graphie validée par le propriétaire est définitive. En cas de doute, **demande** : ne devine pas la prononciation d'un nom de personne ou de marque (exemple ouvert : comment le propriétaire veut que « QuentInvest » soit dit).
- Mots déjà réglés : krach → « crac », Mackay → « Maquaï », Buffett → « Beuffette », Madoff → « Madoffe », Finary → « Finari », start-up → « starteupe », les sigles courants (PEA, PER, TRI, ETF, SCPI, BCE, AMF…). Liste complète : le fichier.

## 7. Contrôle avant de rendre la fiche
- ≈ 850 mots dits, 20 blocs, trois erreurs, trois points à retenir, une question finale, un teaser.
- L'accroche contient un chiffre ou une question ; un appel à s'abonner est ajouté par le programme (ne l'écris pas).
- Aucun chiffre sans source, aucun conseil personnalisé, aucun prix, aucun lien, aucune promesse de gain.
- Aucune phrase de plus de 20 mots ; aucun mot du texte dit absent du dictionnaire s'il est difficile à lire.
- Rends **uniquement le JSON**, puis, séparément, la liste des points que le propriétaire doit contrôler (chiffres à vérifier dans l'ouvrage, prononciations à confirmer).

## 8. Consignes à donner à l'assistant de QuentMovie (⌘K), une par message
Chaque ligne est apprise par l'IA locale (mémoire partagée, relue à chaque demande) :
1. `retiens que la chaîne QuentInvest explique l'économie simplement avec Pico la fourmi, au tutoiement, sans jamais donner de conseil en investissement`
2. `retiens que je n'invente jamais un chiffre, une date ou un nom : je le marque prudent ou je le retire, et chaque fait chiffré a une source`
3. `retiens que j'écris pour l'oreille : phrases de vingt mots au plus, une idée par phrase, pas de parenthèses ni d'abréviations`
4. `retiens que les sigles se disent lettre par lettre : PEA se lit P E A, et les mots anglais s'écrivent comme un Français les prononce`
5. `retiens que chaque épisode YouTube dure au moins cinq minutes, soit environ 850 mots dits en vingt blocs de quarante mots`
6. `retiens que je cherche d'abord Wikipédia puis les sources officielles et je croise deux sources pour chaque chiffre important`
7. `retiens que les bruitages restent très discrets et que le texte reste dans le cadre de l'écran`
