import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', '"IBM Plex Sans"', 'ui-sans-serif', 'system-ui'],
        display: ['"Clash Display"', '"Space Grotesk"', 'ui-sans-serif'],
      },
      colors: {
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
      },
      boxShadow: {
        glow: '0 0 30px rgba(255, 106, 61, 0.25)',
      },
    },
  },
  plugins: [],
} satisfies Config;
