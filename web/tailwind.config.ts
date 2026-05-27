import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
        display: ['"Clash Display"', '"Space Grotesk"', 'ui-sans-serif'],
      },
      colors: {
        // original design tokens (kept for compatibility)
        ink: {
          900: '#0d1117',
          800: '#161b22',
          700: '#1f2633',
        },
        haze: {
          100: '#f4f6fb',
          200: '#d8dfea',
        },
        accent: {
          400: '#ff6a3d',
          500: '#ff3d55',
          600: '#cc2c45',
        },
        // semantic tokens — values switch via CSS vars in :root / .dark
        surface: {
          DEFAULT: 'var(--c-surface)',
          2: 'var(--c-surface-2)',
          3: 'var(--c-surface-3)',
          hover: 'var(--c-surface-hover)',
        },
        tx: {
          base: 'var(--c-text)',
          muted: 'var(--c-text-muted)',
        },
        bd: {
          DEFAULT: 'var(--c-border)',
          strong: 'var(--c-border-strong)',
        },
      },
      boxShadow: {
        glow: '0 0 30px rgba(255, 106, 61, 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
