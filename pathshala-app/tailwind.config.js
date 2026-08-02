/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0A0E1A",
        paper: "#F7F9FC",
        saffron: "#FFB020",
        leaf: "#06B6D4",
        clay: "#2F6FED",
        spark: "#FF4D8D",
        surface: "#FFFFFF",
        line: "#E4E9F2",
      },
      fontFamily: {
        display: ["var(--font-display)", "'Manrope'", "sans-serif"],
        body: ["var(--font-body)", "'Inter'", "sans-serif"],
      },
      backgroundImage: {
        "aurora-1": "radial-gradient(60% 50% at 20% 20%, rgba(47,111,237,0.55), transparent 70%)",
        "aurora-2": "radial-gradient(55% 45% at 80% 30%, rgba(6,182,212,0.45), transparent 70%)",
        "aurora-3": "radial-gradient(50% 60% at 50% 90%, rgba(255,77,141,0.35), transparent 70%)",
        "grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        glow: "0 8px 40px -8px rgba(47,111,237,0.45)",
        "glow-lg": "0 20px 60px -12px rgba(47,111,237,0.5)",
        glass: "0 8px 32px rgba(10,14,26,0.08)",
      },
      keyframes: {
        aurora: {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "33%": { transform: "translate(4%, -6%) scale(1.08)" },
          "66%": { transform: "translate(-4%, 4%) scale(0.96)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        aurora: "aurora 18s ease-in-out infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16,1,0.3,1) forwards",
        float: "float 5s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [],
};
