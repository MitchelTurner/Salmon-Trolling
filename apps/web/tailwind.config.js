/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        deep: '#FFFFFF',
        shoal: '#C9E3F2',
        flat: '#9FD4C4',
        land: '#E8DCC0',
        hairline: '#1A1A1A',
        caution: '#C4197E',
      },
      fontFamily: {
        data: [
          '"IBM Plex Sans Condensed"',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        ui: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        chart: '2px',
      },
      minHeight: {
        hit: '56px',
      },
      minWidth: {
        hit: '56px',
      },
    },
  },
  plugins: [],
};
