/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Primarios - rojo Independiente
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#C41E3A',
          600: '#b91c35',
          700: '#9f1a2f',
          800: '#7f1528',
          900: '#5c0f1d',
          DEFAULT: '#C41E3A',
          accent: '#e11d48',
        },
        // Secundarios - negro/grafito
        secondary: {
          50: '#f5f5f5',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#1a1a1a',
          600: '#141414',
          700: '#0f0f0f',
          800: '#0a0a0a',
          900: '#050505',
          DEFAULT: '#1a1a1a',
        },
        // Superficies
        surface: {
          light: '#ffffff',
          'light-variant': '#f5f0f0',
          dark: '#1a1a1a',
          'dark-variant': '#252525',
        },
        // Fondo
        bg: {
          light: '#faf8f8',
          dark: '#0d0d0d',
        },
        // Semanticos
        success: {
          light: '#22c55e',
          DEFAULT: '#16a34a',
          dark: '#15803d',
          surface: '#f0fdf4',
        },
        warning: {
          light: '#fbbf24',
          DEFAULT: '#f59e0b',
          dark: '#d97706',
          surface: '#fffbeb',
        },
        error: {
          light: '#f87171',
          DEFAULT: '#ef4444',
          dark: '#dc2626',
          surface: '#fef2f2',
        },
        info: {
          light: '#60a5fa',
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
          surface: '#eff6ff',
        },
        // Financieros
        income: '#16a34a',
        expense: '#ef4444',
        transfer: '#3b82f6',
      },
      spacing: {
        xxs: '2px',
        xs: '4px',
        smd: '12px',
        mlg: '20px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      fontSize: {
        caption: ['11px', { lineHeight: '16px' }],
        overline: ['12px', { lineHeight: '16px' }],
        'body-2': ['13px', { lineHeight: '18px' }],
        'body-1': ['15px', { lineHeight: '22px' }],
        subtitle: ['16px', { lineHeight: '24px' }],
        'subtitle-2': ['18px', { lineHeight: '26px' }],
        title: ['20px', { lineHeight: '28px' }],
        headline: ['24px', { lineHeight: '32px' }],
        display: ['32px', { lineHeight: '40px' }],
        'display-lg': ['40px', { lineHeight: '48px' }],
      },
    },
  },
  plugins: [],
};
