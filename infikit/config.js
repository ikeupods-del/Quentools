/* Infikit — réglages de connexion (modifiables sans toucher à index.html)
   Laissez vide ce que vous n'utilisez pas : l'app fonctionne quand même.
   Guide pas à pas : voir README.md, section « Connexion Google / GitHub ». */
window.INFIKIT_CONFIG = {
  // Google : identifiant client OAuth « Application Web » (se termine par .apps.googleusercontent.com)
  googleClientId: '',
  // GitHub, connexion en un clic (facultatif). Sans ces deux valeurs,
  // la connexion GitHub se fait en collant un jeton « gist ».
  githubClientId: '',
  githubOAuthProxy: '', // ex. https://infikit-oauth.votre-nom.workers.dev
};
