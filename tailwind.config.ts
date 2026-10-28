import type { Config } from 'tailwindcss';

// Theme for this event. Change these to re-skin the whole app:
//   paper = page background, leaf = main text, bloom = accent (buttons, links, countdown)
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#faf7f2',
        leaf: '#5f625d',
        bloom: '#7a5c86',
      },
      fontFamily: {
        script: ['Sacramento', 'Snell Roundhand', 'cursive'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
