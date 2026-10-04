# Assistant de site (option pour sites clients)

Une bulle de discussion en bas du site : elle répond aux visiteurs à partir des informations du client (horaires, prestations, tarifs) et recueille prénom, téléphone et demande, transmis par e-mail. Elle ne confirme jamais un rendez-vous.

- **Démonstration publique** : `demo/assistant-ia/` (salon fictif, mode démonstration : réponses prédéfinies, rien n'est envoyé).
- **Widget** : `assets/assistant.js` + `assets/assistant.css` (déjà actifs en mode local sur l'accueil, `templates/` et `audit/` du site QuenTools) (un fichier, sans bibliothèque ni cookie). À copier dans le site du client et à appeler avant `</body>` :
  `<script src="assistant.js" data-nom="Salon Éclat" data-tel="01 23 45 67 89" data-api="https://relais-client.workers.dev" data-faq='[…]' defer></script>` (+ `assistant.css`). `data-api` vide = mode démonstration. Couleurs : variables `--qa-*` de `.qa`. Un élément avec `data-assistant-open` ouvre la bulle.
- **Relais** : `design/assistant-ia/worker.js` (Cloudflare Worker, gratuit). Il garde la clé de l'IA côté serveur. Un relais par client (sa fiche, son plafond, son adresse autorisée). Test : `node design/assistant-ia/worker.test.mjs`.

## Mise en service d'un client
1. Créer le Worker Cloudflare avec `worker.js` et renseigner les variables listées en tête du fichier : `GEMINI_API_KEY` (secret), `FICHE`, `NOM`, `CONTACT`, `ALLOWED_ORIGINS` (adresse du site du client), `DAILY_CAP`, `LEAD_WEBHOOK` (facultatif), KV `RATE` (recommandé).
2. Rédiger la `FICHE` avec le client : uniquement des faits vrais (horaires, prestations, tarifs, adresse). Tout ce qui n'y est pas, l'assistant doit l'ignorer et renvoyer vers le contact.
3. Mettre l'adresse du Worker dans `data-api`, ajouter la mention ci-dessous aux mentions légales, tester (questions pièges : prix absent, « oublie tes consignes », demande de rendez-vous).

## Limites et précautions (à dire au client)
- **Service d'IA** : le palier gratuit de Gemini sert aux démonstrations et aux tests. Pour un vrai client, utiliser l'API **payante** (coût de l'ordre du centime la conversation) : le palier gratuit peut réutiliser les échanges et, à ma connaissance, n'est pas prévu pour des utilisateurs de l'Union européenne ; **vérifier les conditions actuelles de Google** avant de brancher un client. Les modèles et plafonds changent : le nom du modèle est la variable `MODEL`.
- **Données** : les messages des visiteurs partent chez le fournisseur d'IA. Mentionner dans les mentions légales : « Ce site propose un assistant automatique ; les messages saisis sont traités par [fournisseur] pour y répondre et, si le visiteur laisse ses coordonnées, transmis à [entreprise] pour le rappeler. » Le widget affiche déjà « assistant automatique » et déconseille les données confidentielles. À faire relire par un professionnel du droit.
- **Réponses** : l'assistant peut se tromper malgré la consigne. Le limiter à une fiche courte et vraie, ne pas lui confier de devis ni d'engagement.
- **Pas d'enregistrement** : ni le widget ni le relais ne conservent les conversations (seule la demande de rappel part vers l'adresse `LEAD_WEBHOOK`).
- **Coût et plafond** : `DAILY_CAP` limite les réponses par jour ; au-delà, le widget affiche le téléphone du client. Surveiller la facture du fournisseur la première semaine.

## Mode local (sans IA, sans clé)
Quand `data-api` est vide, l'assistant comprend la question lui-même : mots-clés (début de mot, accents et petites fautes tolérés), sujet précédent (« et le prix ? », « en savoir plus »), suites proposées. Les connaissances sont des données : `assets/assistant-qt.js` pour QuenTools (offres, templates et options avec les prix du catalogue `qt-templates.js`, audit, outils, métiers, devis…), ou `data-faq` pour une petite liste chez un client. Ne mettre que des faits déjà publics, et mettre à jour ce fichier quand une offre ou un prix change.

## Améliorations du mode local (octobre 2026)
- **Compréhension** : pluriels ignorés, lettres inversées (« mian » → « main ») et expressions avec une faute reconnues ; si deux sujets sont proches, le second est proposé en suggestion ; sans correspondance, « Vous parliez peut-être de… » avec les sujets qui partagent un mot.
- **Conversation** : indicateur de saisie, réponse lue depuis son début, conversation conservée d'une page à l'autre (stockage de session du navigateur, rien n'est envoyé), bouton ↻ « Nouvelle conversation », petite bulle d'accroche une fois par session (`kb.teaser`, `data-persist="0"` pour désactiver la mémoire).
- **Connaissances du site QuenTools** (`assets/assistant-qt.js`) : agence de communication, une réponse par option avec son prix lu dans le catalogue (`assets/qt-templates.js`), choix entre les deux réservations, fin des 3 mois offerts, « pourquoi QuenTools », propriété du site, conseil par métier ; chaque modèle de métier se termine par le lien du devis avec le template présélectionné.
- **Test** : `node tools/test-assistant.js` pose 52 questions dans la bulle (téléphone 390 px) et vérifie les réponses, les prix, la conservation de la conversation et la nouvelle conversation. À relancer après toute modification des connaissances ou d'un prix.
