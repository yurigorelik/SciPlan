import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcd9ff",
          300: "#8ec1ff",
          400: "#599eff",
          500: "#3379f6",
          600: "#1f5aeb",
          700: "#1746d3",
          800: "#193cab",
          900: "#1a3787",
        },
      },
    },
  },
  plugins: [],
};

export default config;
