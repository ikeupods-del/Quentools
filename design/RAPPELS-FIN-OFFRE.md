# Rappels automatiques de fin d'offre

Offre : 3 mois d'assistance offerts après la mise en ligne, puis suivi mensuel optionnel (69,99 €/mois). Un e-mail est envoyé automatiquement au client **14 jours avant la fin**, une seule fois.

## Fonctionnement
1. Dans l'administration, onglet **Sites clients**, on renseigne l'e-mail du client et la date **« Mis en ligne le »** : la fin de l'offre (+ 3 mois) est calculée.
2. À chaque enregistrement, l'administration envoie au relais la liste (prénom, e-mail, identifiant du site, date de fin). Rien d'autre : ni montant, ni nom complet.
3. Chaque jour à 8 h UTC, le relais envoie l'e-mail aux clients dont la fin d'offre est dans 14 jours ou moins, et note l'envoi (pas de doublon). Si l'envoi échoue, il réessaie le lendemain. Après la fin d'offre, plus d'envoi.
4. Si on change la date de mise en ligne, le rappel redevient possible pour la nouvelle date.

Code : `relais-quentools/worker.js` ; tests : `node --test relais-quentools/worker.test.mjs` (8 scénarios : clé refusée, délai de 14 jours, envoi unique, échec puis nouvel essai, changement de date, sans clé d'envoi).

## Mise en place (une seule fois, environ 20 minutes, gratuit)
Même principe que le relais de Wouf (`wouf/docs/MAINTENANCE.md`) :
1. **Resend** (resend.com, gratuit) : créer un compte, vérifier le domaine d'envoi (ex. `quentools.fr`, 3 lignes DNS), créer une clé d'API.
2. **Cloudflare** → Workers → créer un Worker, coller `relais-quentools/worker.js`.
3. Cloudflare → KV : créer un espace nommé `CLIENTS`, le lier au Worker (nom de liaison `CLIENTS`).
4. Variables du Worker : `ALLOWED_ORIGIN` = `https://quentools.fr`, `MAIL_FROM` = `QuenTools <bonjour@quentools.fr>`, `REPLY_TO` = l'adresse qui reçoit les réponses ; secrets `ADMIN_KEY` (une phrase longue au choix) et `RESEND_API_KEY`.
5. Déclencheur Cron : `0 8 * * *`.
6. Administration → Sites clients → **Rappels automatiques de fin d'offre** : coller l'adresse du Worker et la clé `ADMIN_KEY`, « Enregistrer et synchroniser ». Le message « Rappels automatiques actifs : N client(s) » confirme que tout est branché.

Tant que ces étapes ne sont pas faites, rien n'est envoyé : l'administration affiche la date de fin d'offre, pour relancer à la main.

## Limites
- La clé du relais est gardée dans le navigateur du propriétaire (pas dans le dépôt) ; elle donne seulement le droit de mettre à jour la liste des rappels.
- Le client doit avoir une adresse e-mail dans sa fiche ; sans date « Mis en ligne le », aucun rappel.
- Texte de l'e-mail : voir `message()` dans le worker. Il ne promet que ce qui est dans l'offre (suivi à 69,99 €/mois, réponse sous 48 h ouvrées) et se termine par « QuenTools ».
