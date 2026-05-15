import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta premium e sóbria, focada em legibilidade no mobile.
        ink: {
          50: "#f7f7f8",
          100: "#eceef0",
          200: "#d3d6dc",
          400: "#8a92a0",
          600: "#4a5260",
          800: "#1f2430",
          900: "#0e1118",
        },
        accent: {
          DEFAULT: "#10b981", // verde lucro
          danger: "#ef4444",
          warn: "#f59e0b",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
