import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0c0c0c",
        surface: "#141414",
        "surface-2": "#1a1a1a",
        "surface-3": "#222",
        nvidia: {
          green: "#76B900",
          light: "#8FE800",
          dim: "#5a8f00",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
