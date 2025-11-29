/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        google: {
          grape: '#8e24aa',
          electric: '#304FFE',
        },
      },
    },
  },
  plugins: [],
};
