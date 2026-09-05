/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cinzel', 'ui-serif', 'Georgia', 'serif'],
        serif: ['Crimson Text', 'ui-serif', 'Georgia', 'serif'],
        display: ['Cinzel', 'ui-serif', 'Georgia', 'serif'],
      },
      colors: {
        myth: {
          gold: '#d4a017',
          emerald: '#2d6a4f',
          burgundy: '#7f1d1d',
          parchment: '#f5f0e1',
          stone: '#44403c',
          shadow: '#1c1917',
          dark: '#0f0d09',
          glass: '#292524cc',
        },
      },
      boxShadow: {
        ember: '0 0 16px rgba(212,160,23,0.5)',
        glow: '0 0 30px rgba(45,106,79,0.4)',
      },
      backgroundImage: {
        parchment: 'radial-gradient(circle at center, rgba(245,240,225,0.05) 0, rgba(28,25,23,0.12) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};