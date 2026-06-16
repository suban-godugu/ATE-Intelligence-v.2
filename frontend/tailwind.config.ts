import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Core background layers
        bg: {
          primary:   "#0a0d1a",
          secondary: "#0f1326",
          card:      "#151c33",
          hover:     "#243058",
          elevated:  "#1d2644",
        },
        // Border tokens
        border: {
          DEFAULT: "#1e2d45",
          bright:  "#2a3f5f",
          glow:    "#2563eb",
        },
        // Text tokens
        tx: {
          primary:   "#f0f4ff",
          secondary: "#8b9cc8",
          muted:     "#4b5880",
          disabled:  "#2e3d5a",
        },
        // Accent palette
        accent: {
          blue:   "#3b82f6",
          cyan:   "#06b6d4",
          purple: "#8b5cf6",
          green:  "#10b981",
          amber:  "#f59e0b",
          red:    "#ef4444",
          orange: "#f97316",
          pink:   "#ec4899",
        },
        // KPI deltas
        kpi: {
          up:   "#10b981",
          down: "#ef4444",
        },
      },
      fontFamily: {
        sans:    ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono:    ["'Fira Code'", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
        display: ["Outfit", "sans-serif"],
        serif:   ["'Times New Roman'", "Times", "Georgia", "serif"],
      },
      backgroundImage: {
        "gradient-radial":   "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "grid-pattern":
          "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e2d45' fill-opacity='0.3'%3E%3Cpath d='M0 0h40v1H0zM0 0h1v40H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
      },
      boxShadow: {
        "glow-blue":   "0 0 24px rgba(59,130,246,0.18)",
        "glow-purple": "0 0 24px rgba(139,92,246,0.18)",
        "glow-cyan":   "0 0 24px rgba(6,182,212,0.18)",
        "glow-green":  "0 0 24px rgba(16,185,129,0.18)",
        card:          "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,45,69,0.6)",
        "card-hover":  "0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(42,63,95,0.8)",
      },
      animation: {
        "pulse-glow":  "pulseGlow 2s ease-in-out infinite",
        "fade-in-up":  "fadeInUp 0.4s ease-out forwards",
        "count-up":    "countUp 0.5s ease-out",
        shimmer:       "shimmer 1.5s infinite",
        "spin-slow":   "spin 3s linear infinite",
        "slide-in":    "slideIn 0.3s ease-out",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
