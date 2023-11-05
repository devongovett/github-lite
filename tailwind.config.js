/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["src/*.{tsx,html}"],
  theme: {
    extend: {},
  },
  plugins: [require('tailwind-dark-aware'), require('tailwindcss-react-aria-components')]
}
