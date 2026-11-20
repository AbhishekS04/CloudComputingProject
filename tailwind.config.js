
/** @type {import('tailwindcss').Config} look there is */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#FCFAF5', // Cards
          200: '#F5F2EA', // Main bg
          300: '#EBE6DA', // Secondary surfaces
          400: '#DDD6C6',
          500: '#C7BDAA',
          600: '#A39883',
          700: '#7F7564',
          800: '#524B40',
          900: '#2A2620',
        },
        charcoal: {
          50: '#F7F7F6',
          100: '#E8E8E6',
          200: '#D1D2CF',
          300: '#A9ACA4',
          400: '#757970',
          500: '#4F524A',
          600: '#383B33',
          700: '#2C2F27',
          800: '#252820', // Primary text
          900: '#171914',
          950: '#0F110D',
        },
        sage: {
          50: '#F4F7F4',
          100: '#E6EDE7',
          200: '#CDDCCF',
          300: '#A7C2AB',
          400: '#7CA383',
          500: '#4D7C5F', // Accent muted green
          600: '#3D634C',
          700: '#324E3D',
          800: '#2A3E32',
          900: '#23332A',
        },
        packet: {
          blue: '#4A88E8',
          return: '#10B981',
          error: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Geist', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(37, 40, 32, 0.05), 0 1px 2px -1px rgba(37, 40, 32, 0.05)',
        'card': '0 4px 6px -1px rgba(37, 40, 32, 0.06), 0 2px 4px -2px rgba(37, 40, 32, 0.04)',
        'card-hover': '0 10px 15px -3px rgba(37, 40, 32, 0.08), 0 4px 6px -4px rgba(37, 40, 32, 0.04)',
        'modal': '0 20px 25px -5px rgba(37, 40, 32, 0.1), 0 8px 10px -6px rgba(37, 40, 32, 0.08)',
      }
    },
  },
  plugins: [],
}
