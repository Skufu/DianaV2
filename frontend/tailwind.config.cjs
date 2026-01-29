/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        diana: {
          // Backgrounds (Light, clean)
          cream: '#F8FAFC',    // Very light blue-gray (slate-50)
          stone: '#F1F5F9',    // Light blue-gray (slate-100)
          sand: '#E2E8F0',     // Medium blue-gray (slate-200)
          
          // Primary Blues
          forest: '#1E3A8A',   // Primary blue (blue-800)
          'forest-light': '#2563EB', // Lighter blue (blue-600)
          
          // Accent Blues (no neon)
          lime: '#3B82F6',     // Bright blue accent (blue-500)
          'lime-dark': '#1D4ED8', // Darker blue accent (blue-700)
          
          // Text Colors (blue-gray scale)
          'text-primary': '#0F172A',   // Near black (slate-900)
          'text-secondary': '#475569', // Medium gray (slate-600)
          'text-muted': '#94A3B8',     // Light gray (slate-400),


          // New Premium Colors
          navy: '#0B1120',     // Deep rich blue for buttons/accents
          midnight: '#020617', // Very dark blue for backgrounds
          
          // Brand Accents
          teal: '#0D9488',     // Teal-600 for primary actions/accents
          'teal-dark': '#0F766E', // Teal-700 for hover states
        }

      }
    },
  },
  plugins: [],
};

