/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./alarm.html",
    "./widget.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          canvas: '#0d1117',
          surface: '#161b22',
          subsurface: '#21262d',
          border: '#30363d',
          borderMuted: '#21262d',
          text: '#e6edf3',
          textMuted: '#8b949e',
          green: '#39d353',
          greenBtn: '#238636',
          greenHover: '#2ea043',
        }
      }
    },
  },
  plugins: [],
}
