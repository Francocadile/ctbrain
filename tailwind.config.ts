import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8e6",
          100: "#ffedbf",
          200: "#ffd980",
          300: "#ffc241",
          400: "#ffae1a",
          500: "#ff9b00",
          600: "#db7f00",
          700: "#b26400",
          800: "#8a4e00",
          900: "#6e3f00"
        }
      },
      boxShadow: {
        aura: "0 0 24px rgba(255, 155, 0, 0.25)"
      },
      borderRadius: {
        "2xl": "1rem"
      }
    }
  },
  plugins: []
} satisfies Config;
