/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 900:"#070b14", 800:"#0a0f1e", 700:"#0f172a", 600:"#162032", 500:"#1d2b46" },
        accent: { cyan:"#06b6d4", blue:"#3b82f6", violet:"#8b5cf6", emerald:"#10b981", amber:"#f59e0b", red:"#ef4444" }
      },
      fontFamily: { mono:["JetBrains Mono","monospace"] },
      boxShadow: {
        glowCyan: "0 0 30px rgba(6,182,214,0.15)",
        glowViolet: "0 0 30px rgba(139,92,246,0.15)",
        card: "0 8px 32px rgba(0,0,0,0.4)"
      }
    },
  },
  plugins: [],
}
