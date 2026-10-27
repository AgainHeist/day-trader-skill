/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0a0e1a",
          card: "#111827",
          border: "#1f2937",
          accent: "#06b6d4",
          green: "#10b981",
          red: "#ef4444",
          yellow: "#f59e0b",
          purple: "#8b5cf6",
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      }
    },
  },
  plugins: [],
}
