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
        // Primarios - azul profundo
        primary: {
          50: '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#0f3460',
          600: '#16213e',
          700: '#1a1a2e',
          800: '#131029',
          900: '#0d0a1f',
          DEFAULT: '#0f3460',
          accent: '#533483',
        },
        // Secundarios - teal/esmeralda
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          DEFAULT: '#10b981',
        },
        // Superficies
        surface: {
          light: '#ffffff',
          'light-variant': '#f1f3f8',
          dark: '#161b22',
          'dark-variant': '#1c2333',
        },
        // Fondo
        bg: {
          light: '#f8f9fc',
          dark: '#0d1117',
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
