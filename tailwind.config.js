/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        stage: {
          bg: '#120A30',
          panel: 'rgba(26, 16, 62, 0.78)',
          pink: '#FF4FD8',
          cyan: '#22D3EE',
          green: '#7CFF6B',
          gold: '#FBBF24',
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-7px)' },
          '40%': { transform: 'translateX(7px)' },
          '60%': { transform: 'translateX(-5px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'ray-spin': {
          from: { transform: 'translate(-50%, -50%) rotate(0deg)' },
          to: { transform: 'translate(-50%, -50%) rotate(360deg)' },
        },
        'confetti-burst': {
          '0%': { transform: 'translate(0, 0) rotate(0deg)', opacity: '1' },
          '80%': { opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) rotate(var(--rot))', opacity: '0' },
        },
      },
      animation: {
        shake: 'shake 360ms ease-in-out',
        'ray-spin': 'ray-spin 10s linear infinite',
        'confetti-burst': 'confetti-burst 1.6s cubic-bezier(.2,.7,.3,1) forwards',
      },
      fontFamily: {
        display: ['"Baloo 2"', 'cursive', 'sans-serif'],
        sans: ['"Nunito"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
