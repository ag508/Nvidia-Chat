import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        nvidia: {
          green: "#76B900",
          light: "#a6e22e",
          dim: "#5a8f00",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Fraunces", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "32px",
        "3xl": "48px",
      },
      animation: {
        "drift-a": "drift-a 38s ease-in-out infinite",
        "drift-b": "drift-b 46s ease-in-out infinite",
        "drift-c": "drift-c 52s ease-in-out infinite",
        "fade-up": "fade-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) both",
        "breathe": "breathe 4.5s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.2s ease-in-out infinite",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      keyframes: {
        "drift-a": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(8%, -6%, 0) scale(1.08)" },
        },
        "drift-b": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
          "50%": { transform: "translate3d(-7%, 8%, 0) scale(1.12)" },
        },
        "drift-c": {
          "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1.05)" },
          "50%": { transform: "translate3d(6%, 9%, 0) scale(0.95)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "glass-sm": "0 4px 20px -8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08)",
        "glass": "0 12px 40px -14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.1)",
        "glass-lg": "0 32px 80px -20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
        "glow": "0 0 0 1px rgba(166,226,46,0.35), 0 0 32px -4px rgba(166,226,46,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
