/* QuenTools — coordonnées publiques et réception des demandes de devis (partagées par toutes les pages).
   email : adresse publique de contact (vide = bouton masqué).
   tiktok : pseudo TikTok sans « @ ».
   formEndpoint : adresse qui reçoit le formulaire de devis en JSON (POST). Compatible avec le relais Cloudflare de Wouf
     (« https://…workers.dev/support » : la demande arrive dans Wouf → Administration → Messages) ou un service de formulaires.
     Vide = la demande s'envoie par e-mail (si email est renseigné), sinon elle est copiée pour TikTok. */
window.QT = { email: '', tiktok: 'quentools', formEndpoint: '' };
