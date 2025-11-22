/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF',
          gray: '#8E8E93',
          bg: '#F2F2F7',
          bgDark: '#000000',
          card: '#FFFFFF',
          cardDark: '#1C1C1E',
          separator: '#C6C6C8',
          separatorDark: '#38383A',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleFade: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'scale-fade': 'scaleFade 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
      }
    },
  },
  plugins: [],
}