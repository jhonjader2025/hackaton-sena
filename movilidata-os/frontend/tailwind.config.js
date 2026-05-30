/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      colors: {
        primary: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A'
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          hover: 'var(--color-surface-hover)'
        },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#D97706' },
        safe: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#059669' },
        rain: { light: '#93C5FD', moderate: '#3B82F6', heavy: '#1E40AF' }
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem'
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }]
      }
    }
  },
  plugins: []
}
