import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f4ff', 100: '#e0e8ff', 600: '#1e40af', 700: '#1d3a8a', 800: '#1e2f6e', 900: '#0f1f4a' },
        trust: { green: '#16a34a', 'green-light': '#bbf7d0' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: [typography],
}
