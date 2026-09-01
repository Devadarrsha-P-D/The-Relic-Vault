/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Orbitron', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        neon: {
          cyan: '#28f7ff',
          magenta: '#ff4fd8',
          gold: '#ffb703',
          purple: '#8b5cf6',
          slate: '#0f172a',
          dark: '#050b16',
          glass: '#111827cc',
        },
      },
      boxShadow: {
        neon: '0 0 16px rgba(40,247,255,0.7)',
        glow: '0 0 30px rgba(255,79,216,0.4)',
      },
      backgroundImage: {
        grid: 'radial-gradient(circle at center, rgba(40,247,255,0.22) 0, rgba(15,23,42,0.12) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
