/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FBFBFC',
        surface: '#FFFFFF',
        border: '#E5E5EA',
        accent: {
          DEFAULT: '#000000',
          blue: '#2D68C4',
        },
        text: {
          primary: '#1D1D1F',
          secondary: '#86868B',
          tertiary: '#AEAEB2',
        },
        success: '#34C759',
        warning: '#FF9F0A',
        error: '#FF3B30',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(0,0,0,0.04), 0 0 1px 0 rgba(0,0,0,0.06)',
        'card': '0 4px 16px 0 rgba(0,0,0,0.06), 0 0 1px 0 rgba(0,0,0,0.08)',
        'elevated': '0 8px 32px 0 rgba(0,0,0,0.08), 0 0 1px 0 rgba(0,0,0,0.1)',
        'modal': '0 20px 60px 0 rgba(0,0,0,0.15), 0 0 1px 0 rgba(0,0,0,0.12)',
      },
      animation: {
        'shimmer': 'shimmer 1.8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
// (Phase 2 additions handled by existing config — no changes needed)
