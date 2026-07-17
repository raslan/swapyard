import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Geist Sans"', "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        void: "#000000",
        abyss: "#050505",
        dark: "#0a0a0a",
        mid: "#0f0f0f",
        surface: "#141414",
        edge: "#1e1e1e",
        highlight: "#282828",
        cyan: { DEFAULT: "#22d3ee", dim: "rgba(34,211,238,0.12)", glow: "rgba(34,211,238,0.25)" },
        violet: { DEFAULT: "#8b5cf6", dim: "rgba(139,92,246,0.12)", glow: "rgba(139,92,246,0.25)" },
        text: { primary: "#e8e8f0", secondary: "#9898b0", muted: "#585870" },
        success: "#34d399",
        danger: "#f87171",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-right": "slideRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
