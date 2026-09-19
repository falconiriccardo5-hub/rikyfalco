import type { Config } from 'tailwindcss';

/**
 * Design system: data-dense analytics dashboard (scanability first) rendered in
 * a tech-futuristic / aurora dark shell. Glass and glow are used on structural
 * surfaces only — never behind body copy, which stays on solid, high-contrast
 * backgrounds (WCAG 4.5:1).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces, darkest to lightest.
        void: '#05060B',
        ink: '#080A12',
        surface: '#0E1119',
        raised: '#151925',
        line: '#212636',
        hairline: '#2C3346',

        // Text: contrast-checked against `surface`.
        primary: '#F2F5FC', // 16.8:1
        secondary: '#B4BDD4', // 8.9:1
        muted: '#8A93AC', // 5.6:1 — the lightest tone allowed for real text

        // Accents. Blue is the interactive colour; violet is decorative only.
        accent: '#4C8DFF',
        'accent-soft': '#7BA9FF',
        violet: '#8B5CF6',
        cyan: '#22D3EE',

        // Semantic states.
        positive: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      borderRadius: { xl: '0.875rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 32px -12px rgba(0,0,0,0.8)',
        glow: '0 0 0 1px rgba(76,141,255,0.35), 0 8px 28px -8px rgba(76,141,255,0.45)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // 16px body floor on mobile (ux: readable-font-size).
        'metric-lg': ['2.25rem', { lineHeight: '1', letterSpacing: '-0.03em' }],
        'metric': ['1.75rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        // 150-300ms micro-interactions (ux: duration-timing).
        'fade-up': 'fade-up 240ms ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
export default config;
