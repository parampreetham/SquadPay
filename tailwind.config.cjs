/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        squadpay: {
          green: "#18ff8b",
          yellow: "#ffe66d",
        },
      },
    },
  },
  plugins: [],
};
