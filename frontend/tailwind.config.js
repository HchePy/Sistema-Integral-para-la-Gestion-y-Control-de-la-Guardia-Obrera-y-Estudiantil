/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Institucional Oficial — Universidad de Holguín (UHO)
        uho: {
          celeste: '#D5E8F0',
          light: '#4A90D9',     // Azul Claro UHO (--azul-claro)
          med: '#2E6DAD',       // Azul Medio UHO (--azul-med)
          DEFAULT: '#1A3A6E',   // Azul Institucional Principal UHO (--azul)
          dark: '#0F2447',      // Azul Marino Profundo UHO
          green: '#8CC63F',     // Verde Logo UHO
          success: '#27AE60',   // Verde Éxito / Cumplimiento (--verde)
          accent: '#F39C12',    // Dorado / Ámbar Institucional (--amarillo)
          danger: '#E74C3C',    // Rojo Alerta (--rojo)
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
