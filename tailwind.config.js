// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",         // City/Country Search Page
    "./times.html",         // Prayer Times Display Page
    "./dashboard.html",     // Dashboard Page
    "./renderer.js",        // For index.html
    "./times_renderer.js",  // For times.html
    "./dashboard_renderer.js" // For dashboard.html
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}