/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.45)',
          medium: 'rgba(255, 255, 255, 0.25)',
          heavy: 'rgba(255, 255, 255, 0.12)',
        },
        accent: {
          blue: '#007AFF',
          purple: '#AF52DE',
          pink: '#FF375F',
          green: '#34C759',
          orange: '#FF9500',
          teal: '#5AC8FA',
        },
        surface: {
          dark: 'rgba(30, 30, 30, 0.85)',
          darker: 'rgba(20, 20, 20, 0.92)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: ['"SF Mono"', '"Fira Code"', '"JetBrains Mono"', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
        'slide-right': 'slideRight 0.25s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 122, 255, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(0, 122, 255, 0)' },
        },
      },
    },
  },
  plugins: [],
};
