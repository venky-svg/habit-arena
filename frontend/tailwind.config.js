/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0F0F12",
        darkCard: "rgba(22, 22, 28, 0.7)",
        darkBorder: "rgba(255, 255, 255, 0.08)",
        neonViolet: "#8B5CF6",
        neonCyan: "#06B6D4",
        neonGreen: "#10B981",
        neonPink: "#EC4899",
        bronze: "#CD7F32",
        silver: "#C0C0C0",
        gold: "#FFD700",
        platinum: "#E5E4E2",
        diamond: "#B9F2FF"
      },
      boxShadow: {
        neonViolet: "0 0 15px rgba(139, 92, 246, 0.4)",
        neonCyan: "0 0 15px rgba(6, 182, 212, 0.4)",
        neonGreen: "0 0 15px rgba(16, 185, 129, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
      },
      backdropBlur: {
        xs: "2px"
      }
    },
  },
  plugins: [],
}
