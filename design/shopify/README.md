# Modèle de boutique Shopify (réutilisable)

Trousse à reprendre pour chaque client : questionnaire, fichier d'import des produits, pages à créer, check-list de mise en ligne. Les textes juridiques sont des **brouillons à faire relire** ; aucun fait propre à un client n'est inventé (tout ce qui est entre `[crochets]` se remplace).

## Répartition du travail
- **Préparé ici** : questionnaire, fiches produit, fichier d'import, textes des pages, code de thème.
- **Fait dans Shopify par le propriétaire** (aucun accès depuis les séances de travail) : création ou invitation du compte, import du fichier, collage des pages, réglages de paiement, livraison et taxes, commande d'essai.
- **Fourni par le client** : accès collaborateur, logo, photos, liste de produits, informations légales de l'entreprise.

## Déroulé en 7 étapes
1. **Questionnaire** (`questionnaire-client.md`) envoyé au client avant de commencer.
2. **Boutique de développement** : compte partenaire Shopify gratuit pour construire avant que le client ne s'abonne (vérifier les conditions actuelles sur shopify.com).
3. **Catalogue** : remplir `produits-modele.csv` (une ligne par produit, une ligne de plus par photo ou variante), puis Produits → Importer.
4. **Pages** : copier les textes de `pages/` dans Pages (À propos, Livraison, Retours, FAQ, Contact), et dans Paramètres → Politiques (CGV, confidentialité, mentions).
5. **Réglages** : paiement, expéditions, taxes, e-mails de commande, domaine, navigation (menus).
6. **Contrôles** (`checklist-mise-en-ligne.md`) : commande d'essai, mobile, vitesse, liens.
7. **Livraison** : accès client, mini-guide d'utilisation, présentation du forfait mensuel.

## Fichier d'import
`produits-modele.csv` suit le format de produits de Shopify tel que je le connais ; Shopify le modifie parfois. Avant le premier import, télécharger le modèle officiel (Produits → Importer → « Télécharger un exemple de CSV »), comparer les en-têtes et ajuster ce fichier si besoin. Importer d'abord avec le statut `draft` (brouillon) et vérifier le résultat. Les photos doivent être accessibles par une adresse web publique.

## Limites à annoncer au client
- Les abonnements Shopify et les applications payantes sont à sa charge.
- Aucun résultat de classement, de vitesse ou de ventes n'est garanti.
- Les textes juridiques sont indicatifs : une relecture professionnelle est conseillée.
- Ne jamais reprendre le thème, les photos ou les textes d'un tiers sans droit.
