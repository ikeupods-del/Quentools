/* Freelance Kit — réglages de connexion (modifiables sans toucher à index.html).
   Même projet Firebase que les autres apps QuenTools : un seul compte Google pour tout,
   données rangées à part dans users/{uid}/apps/freelance. Clés publiques par conception
   (la sécurité vient des règles Firestore). */
window.FREELANCE_CONFIG = {
  firebase: {
    apiKey: "AIzaSyA-JS7hnSQXeNXnAPqbF3MV8rkPQ5_JVY8",
    authDomain: "quentools-adca1.firebaseapp.com",
    projectId: "quentools-adca1",
    storageBucket: "quentools-adca1.firebasestorage.app",
    messagingSenderId: "55024741286",
    appId: "1:55024741286:web:957475540e24ed223b7d67"
  },
  // GitHub en un clic (facultatif). Sans ces valeurs : connexion en collant un jeton « gist ».
  // Le relais OAuth peut être celui d'Infikit (infikit/oauth-worker), mais l'OAuth App GitHub
  // doit avoir https://quentools.fr/freelance/ comme URL de callback.
  githubClientId: '',
  githubOAuthProxy: '',
};
