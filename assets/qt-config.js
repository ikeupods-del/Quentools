/* QuenTools — réglages publics partagés par toutes les pages.
   Valeurs par défaut : l'administration (/admin/) peut les remplacer sans toucher au code (document Firestore qt_admin/config).
   email : adresse publique de contact (vide = bouton masqué).
   tiktok : pseudo TikTok sans « @ ».
   ebookUrl : adresse de la page d'inscription de l'e-book chez la plateforme d'envoi ; renseignée, /ebook/ y renvoie directement.
   formEndpoint : adresse qui reçoit aussi le formulaire de devis en JSON (POST), par ex. le relais Cloudflare de Wouf (…/support). Facultatif :
     les demandes arrivent d'abord dans l'administration ; à défaut, par e-mail, sinon elles sont copiées pour TikTok.
   firebase : clés publiques par conception (même projet que les autres apps) ; la sécurité vient des règles Firestore.
   ownerHashes : empreinte SHA-256 de l'adresse Google du propriétaire (affichage de l'administration ; les droits réels sont dans les règles). */
window.QT = {
  email: 'contact.quentools@gmail.com', tiktok: 'quentools', formEndpoint: '',
  ebookUrl: '',   // page d'inscription de l'e-book chez la plateforme d'envoi (ex. Systeme.io) ; vide = inscription par Google sur /ebook/
  firebase: {
    apiKey: 'AIzaSyA-JS7hnSQXeNXnAPqbF3MV8rkPQ5_JVY8',
    authDomain: 'quentools-adca1.firebaseapp.com',
    projectId: 'quentools-adca1',
    appId: '1:55024741286:web:957475540e24ed223b7d67'
  },
  ownerHashes: ['5551fc3e72a62b8fa55d701333c1151c37c9f61e98d805ad7cbba408e313817e']
};
