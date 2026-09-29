/* Infikit — réglages de connexion (modifiables sans toucher à index.html)
   Laissez vide ce que vous n'utilisez pas : l'app fonctionne quand même.
   Guide pas à pas : voir README.md, section « Connexion Google / GitHub ». */
window.INFIKIT_CONFIG = {
  // Google : projet Firebase commun à toutes les apps QuenTools (clés publiques par conception ;
  // la sécurité vient des règles Firestore). Connexion Google + sauvegarde chiffrée.
  firebase: {
    apiKey: "AIzaSyA-JS7hnSQXeNXnAPqbF3MV8rkPQ5_JVY8",
    authDomain: "quentools-adca1.firebaseapp.com",
    projectId: "quentools-adca1",
    storageBucket: "quentools-adca1.firebasestorage.app",
    messagingSenderId: "55024741286",
    appId: "1:55024741286:web:957475540e24ed223b7d67"
  },
  // GitHub, connexion en un clic (facultatif). Sans ces deux valeurs,
  // la connexion GitHub se fait en collant un jeton « gist ».
  githubClientId: '',
  githubOAuthProxy: '', // ex. https://infikit-oauth.votre-nom.workers.dev
};
