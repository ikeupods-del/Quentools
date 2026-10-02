/* Jetons de la marque « Maison Blade » : noir mat, anthracite, bronze, champagne, blanc cassé chaud. */
module.exports = {
  content: ['./index.html', './luxe.js', './admin/index.html', './admin/admin.js', './compte/index.html', './compte/compte.js'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0908',
        coal: '#131211',
        graphite: '#1c1b19',
        slate: '#2a2825',
        bronze: '#a98a5e',
        champagne: '#d8c7a3',
        brass: '#bfa57a',
        ivory: '#efe9de',
        mist: '#9d958a'
      },
      fontFamily: {
        serif: ['Cormorant', 'Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      letterSpacing: { wide2: '.22em', wide3: '.34em' },
      boxShadow: {
        deep: '0 40px 90px -40px rgba(0,0,0,.9), 0 12px 30px -18px rgba(0,0,0,.8)',
        hair: 'inset 0 1px 0 rgba(255,255,255,.06)'
      },
      transitionTimingFunction: { lux: 'cubic-bezier(.22,.8,.24,1)' }
    }
  },
  plugins: []
};
