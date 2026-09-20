/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        theme: {
          bg: '#09090b',
          text: '#DFDFDE',
          accent: '#3B82F6',
          'accent-hover': '#2563EB',
        },
        zinc: {
          950: '#09090b',
          900: '#111114',
          850: '#18181c',
          800: '#232328',
          700: '#38383f',
          600: '#52525b',
          500: '#71717a',
          400: '#a1a1aa',
          300: '#c5c5c9',
          200: '#DFDFDE',
          100: '#EDEDEC',
          50: '#F8F8F7',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
      },
    },
  },
  plugins: [],
}
