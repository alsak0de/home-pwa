/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ok: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        neutral: '#64748b'
      }
    }
  },
  plugins: []
};


