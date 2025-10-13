import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
      extend: {
        fontFamily: {
          sans: ["Inter", "system-ui", "sans-serif"],
        },
        colors: {
          primary: {
            DEFAULT: "#0B1B34",
            600: "#09162A",
            100: "#D6DEE9",
          },
          accent: {
            DEFAULT: "#06B6D4",
            600: "#0891B2",
            100: "#D5F3F9",
          },
          ink: {
            900: "#0F172A",
            700: "#334155",
            500: "#64748B",
            300: "#CBD5E1",
            100: "#EEF2F7",
          },
          base: {
            50: "#F8FAFC",
          },
          success: "#16A34A",
          warning: "#F59E0B",
          danger: "#DC2626",
          info: "#0284C7",
          border: "#E2E8F0",
        },
      },
  },
  plugins: [],
} satisfies Config;
