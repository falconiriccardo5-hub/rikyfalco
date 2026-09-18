import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#07070A',
        surface: '#0E0F14',
        raised: '#15171F',
        line: '#23262F',
        muted: '#8A8F9C',
        accent: '#C8A96A',
      },
      fontFamily: { sans: ['ui-sans-serif', 'system-ui', 'Inter', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
