/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cluster: {
          connected: '#16a34a',
          disconnected: '#ef4444',
          pending: '#f59e0b',
        },
        k8s: {
          blue: '#326ce5',
          dark: '#1a1a2e',
        },
      },
    },
  },
  plugins: [],
}
