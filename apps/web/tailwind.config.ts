import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic: ['Noto Naskh Arabic', 'Arial', 'sans-serif'],
      },
      colors: {
        page: '#F7F4F0',
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F0ECE6',
        },
        primary: {
          DEFAULT: '#1B2A4A',
          light: '#2D4373',
          dark: '#0F1A30',
        },
        accent: {
          DEFAULT: '#B8943C',
          light: '#D4B66A',
          subtle: '#F5EDD6',
        },
        text: {
          primary: '#1C1814',
          secondary: '#5C5348',
          muted: '#9C9488',
        },
        border: {
          DEFAULT: '#E5DDD4',
          light: '#F0EBE3',
        },
        danger: {
          DEFAULT: '#9B2C2C',
          bg: '#FDF2F2',
        },
        success: {
          DEFAULT: '#2D6A4F',
          bg: '#F0F7F4',
        },
        warning: {
          DEFAULT: '#B8860B',
          bg: '#FFFBEB',
        },
      },
      boxShadow: {
        sm: '0 1px 2px rgba(28, 24, 20, 0.04)',
        md: '0 4px 12px rgba(28, 24, 20, 0.06)',
        lg: '0 8px 30px rgba(28, 24, 20, 0.08)',
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
      },
    },
  },
  plugins: [],
}

export default config
