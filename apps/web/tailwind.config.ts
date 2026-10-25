import type { Config } from 'tailwindcss'

// Palette MalafiPro V2 « Agir ou surveiller » — voir claude/DESIGN_UI_MALAFIPRO.md
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['IBM Plex Sans Arabic', 'IBM Plex Sans', 'sans-serif'],
        sans: ['IBM Plex Sans Arabic', 'IBM Plex Sans', 'sans-serif'],
        arabic: ['IBM Plex Sans Arabic', 'sans-serif'],
        num: ['IBM Plex Sans', 'sans-serif'],
      },
      colors: {
        page: '#F5F3EE',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F1EFEA',
        },
        primary: {
          DEFAULT: '#0E5A4E',
          light: '#1F6F61',
          dark: '#083B34',
        },
        // L'ancien « accent » or devient le vert d'action ; l'ambre est réservé au signal.
        accent: {
          DEFAULT: '#0E5A4E',
          light: '#9FC9BE',
          subtle: '#E3F0EC',
        },
        signal: {
          DEFAULT: '#F2A93B',
          text: '#7A4E06',
          bg: '#FDF1DC',
        },
        watch: '#4D5B57',
        mint: '#E3F0EC',
        ink: '#15201E',
        text: {
          primary: '#15201E',
          secondary: '#3B4A47',
          muted: '#5E6B67',
        },
        border: {
          DEFAULT: '#E4E0D6',
          light: '#EEEAE1',
        },
        danger: {
          DEFAULT: '#C0392B',
          bg: '#FBEAE7',
        },
        success: {
          DEFAULT: '#0E5A4E',
          bg: '#E3F0EC',
        },
        warning: {
          DEFAULT: '#7A4E06',
          bg: '#FDF1DC',
        },
      },
      boxShadow: {
        sm: '0 1px 0 rgba(8, 59, 52, 0.04)',
        md: '0 1px 0 rgba(8, 59, 52, 0.04), 0 14px 30px -18px rgba(8, 59, 52, 0.28)',
        lg: '0 1px 0 rgba(8, 59, 52, 0.04), 0 14px 30px -18px rgba(8, 59, 52, 0.28)',
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.625rem',
        md: '0.625rem',
        lg: '1rem',
      },
    },
  },
  plugins: [],
}

export default config
