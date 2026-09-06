/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkGreen: '#184735',
          forest: '#1b4d3e',
          sage: '#89a894',
          mist: '#dbe7e0',
          terracotta: '#c25e43',
          terracottaDark: '#a8472d',
          terracottaLight: '#fbeee9',
          gold: '#d99a26',
          goldLight: '#fbf0d8',
          bgLight: '#fbf9f4',
          borderLight: '#e7e2d7'
        },
        primary: {
          DEFAULT: '#541d9f',
          container: '#6c3bb8',
          fixed: '#ecdcff'
        },
        secondary: {
          DEFAULT: '#316854',
          container: '#b2ecd2'
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        script: ['Caveat', 'cursive'],
        sans: ['Atkinson Hyperlegible Next', 'Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
