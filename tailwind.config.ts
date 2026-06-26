import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101214",
        bone: "#f6f1e8",
        brass: "#c49a54",
        verdigris: "#3f8f8c",
        ember: "#b8543f",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 48px rgba(63, 143, 140, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
