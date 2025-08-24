/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // RigRoster Light Theme
        primary: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#C0392B', // RigRoster Red
          600: '#A93226', // Darker Red
          700: '#922B21',
          800: '#7B241C',
          900: '#641E16',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Light theme colors
        rigroster: {
          red: '#C0392B',
          darkRed: '#A93226',
          lightGray: '#f8f9fa',
          gray: '#6c757d',
          darkGray: '#495057',
          white: '#ffffff',
          offWhite: '#f8f9fa',
          border: '#dee2e6',
          text: '#212529',
          textLight: '#6c757d',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'rigroster': '0 4px 6px -1px rgba(192, 57, 43, 0.1), 0 2px 4px -1px rgba(192, 57, 43, 0.06)',
        'rigroster-lg': '0 10px 15px -3px rgba(192, 57, 43, 0.1), 0 4px 6px -2px rgba(192, 57, 43, 0.05)',
      }
    },
  },
  plugins: [],
}
