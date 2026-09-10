/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'Nunito', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
