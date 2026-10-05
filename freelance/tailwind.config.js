/* Configuration de Tailwind pour Freelance Kit. Le CSS compilé est tailwind.css : à régénérer après tout changement de classes dans index.html ou de tailwind.src.css :
   npm i -D tailwindcss@3.4.17 && npx tailwindcss -c tailwind.config.js -i tailwind.src.css -o tailwind.css --minify   (puis augmenter le ?v= de tailwind.css dans index.html) */
module.exports = {
  darkMode: 'class',
  content: ['./index.html'],
  theme: { extend: { fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] } } }
};
