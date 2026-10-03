# Audit de sécurité express

Offre : **100 € (prix de lancement)**, un site, rapport PDF sous 48 h ouvrées ; corrections éventuelles sur devis. Page publique : `audit/`. Type de demande dans le devis : « Audit express ».

**Règle d'or : on ne vend que ce qu'on peut réellement contrôler.** L'outil fait les contrôles ; le rapport dit aussi, noir sur blanc, ce qui n'est pas couvert. Ne jamais écrire « site sécurisé » : le rapport décrit l'état constaté, à une date.

## Avant de lancer (obligatoire)
1. **Accord écrit du propriétaire du site** (un e-mail suffit : « j'autorise QuenTools à contrôler les points de sécurité visibles de l'extérieur de https://… »). Ne jamais auditer le site de quelqu'un d'autre, ni sans accord.
2. Garder cet accord avec le dossier du client.

## Lancer l'audit
```
cd wouf && npm install          # une seule fois (Playwright)
cd .. && node tools/audit-express.js https://site-du-client.fr --client "Nom du client" --accord
```
`--accord` confirme que l'accord écrit existe ; sans lui, l'outil refuse de tourner. Les rapports (`rapport.json`, `rapport.html`, `rapport.pdf`) sont écrits dans `audits/<site>-<date>/` : ce dossier est ignoré par git, **ne jamais commiter un rapport client** (le dépôt est public).

## Ce que l'outil contrôle (page d'accueil du site)
| Point | Comment |
|---|---|
| HTTPS et certificat | connexion TLS (validité, expiration), redirection de http vers https |
| En-têtes de sécurité | HSTS, CSP, X-Content-Type-Options, Referrer-Policy, protection contre le clickjacking (indicatif sur les hébergements qui ne permettent pas de les régler, comme GitHub Pages) |
| Services externes | scripts, feuilles de style et polices venant d'un autre domaine, avec ou sans vérification d'intégrité |
| Cookies et traceurs | navigateur réel : cookies posés et services de mesure ou de publicité contactés avant tout choix du visiteur |
| Formulaires | envoi en https ou non, présence d'un anti-spam (champ piège ou captcha) |
| Contenu mixte, liens, erreurs | ressources en http sur une page https, liens `target="_blank"` sans `rel="noopener"`, erreurs de console |
| Pages légales | présence de liens vers mentions légales, confidentialité, cookies, CGV (jamais leur conformité) |
| Bibliothèques anciennes | jQuery, Bootstrap, AngularJS, Lodash : version lue dans la page, comparée aux failles publiées **que je connais** (pas une base en direct : le dire) ; outil de création annoncé (ex. WordPress) |
| Clés oubliées | motifs connus (AWS, Stripe live, GitHub, Slack, clé privée, SendGrid, « secret »/« password » écrits en dur) dans la page et ses scripts ; clé d'API Google signalée comme normale si restreinte |
| Fichiers exposés | 11 chemins courants (`.env`, `.git`, sauvegardes, `phpinfo`…), acceptés seulement si le contenu correspond vraiment (pas de faux positif sur une page d'accueil qui répond à tout) |

## Ce que l'outil ne contrôle pas (écrit dans chaque rapport)
Serveur et hébergement en interne, mots de passe et droits d'accès, sauvegardes, réglages de consoles (Google, Firebase, Shopify, PayPal, hébergeur), conformité juridique (RGPD, CGV), failles propres au fonctionnement du site, pages autres que l'accueil. Si le client me donne le code ou un export, la relecture du code (injections, secrets, stockage) s'ajoute, **sur devis**.

## Limites pratiques
- Si le réseau de l'environnement bloque le site du client, l'audit externe est impossible : demander le code ou une copie des pages.
- Les faux positifs existent (ex. un test sur `localhost` en http) : relire le rapport avant de l'envoyer et retirer ce qui ne tient pas.
- Noter le temps réellement passé sur les premiers audits et ajuster le prix (voir `design/TARIFS.md`).
