import type { Config } from "tailwindcss";

// SciPlan's visual identity is "lab notebook, not dashboard": bone paper with a
// faint grid, near-black ink, hairline rules, hard offset shadows, and a single
// loud citron highlighter for anything the student (or the AI) has touched.
//
// The stock Tailwind palettes are redefined rather than supplemented, so the
// whole app — including screens whose markup still says `slate-200` — inherits
// the warm, printed-paper feel from one place.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Neutrals: warm graphite on bone, never blue-grey.
        slate: {
          50: "#f6f5f0",
          100: "#edebe3",
          200: "#dedbd0",
          300: "#c6c2b4",
          400: "#9c9789",
          500: "#7a7566",
          600: "#5d594c",
          700: "#46433a",
          800: "#2c2a24",
          900: "#191813",
        },
        // Primary: ink. Buttons are black, not brand-blue.
        brand: {
          50: "#f4f3ef",
          100: "#e6e4dc",
          200: "#cbc8bc",
          300: "#a5a092",
          400: "#6f6b5e",
          500: "#46433a",
          600: "#262620",
          700: "#1a1a15",
          800: "#121210",
          900: "#0b0b09",
        },
        // The signature: highlighter citron. Used for progress, marks, and
        // anything the AI drafted — never for large areas of text.
        citron: {
          50: "#fafde9",
          100: "#f2fac4",
          200: "#e6f58c",
          300: "#d6ec4e",
          400: "#c3dc1e",
          500: "#a7c00c",
          600: "#85990a",
          700: "#66740e",
          800: "#515c11",
          900: "#454e13",
        },
        // Success / finalized: pine.
        emerald: {
          50: "#edf3ef",
          100: "#d6e5da",
          200: "#aecbb6",
          300: "#7fac8c",
          400: "#548e66",
          500: "#35714b",
          600: "#2a5c3d",
          700: "#234b33",
          800: "#1d3c2a",
          900: "#182f22",
        },
        // Errors: clay.
        red: {
          50: "#fbefeb",
          100: "#f6dbd2",
          200: "#ebbcac",
          300: "#dd9179",
          400: "#cb6b4c",
          500: "#b4502f",
          600: "#9a3f23",
          700: "#7e331d",
          800: "#642a19",
          900: "#522416",
        },
        // Warnings / restricted accounts: ochre.
        amber: {
          50: "#fbf3e3",
          100: "#f5e5c3",
          200: "#ebcf8f",
          300: "#ddb35a",
          400: "#cb9830",
          500: "#b07f1c",
          600: "#916715",
          700: "#745314",
          800: "#5c4314",
          900: "#4c3814",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        // Editorial serif for headings — the counterweight to the mono labels.
        display: [
          "ui-serif",
          "Iowan Old Style",
          "Palatino Linotype",
          "Palatino",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      // Sharp geometry: the largest radius in the app is 8px.
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "3px",
        md: "3px",
        lg: "4px",
        xl: "6px",
        "2xl": "8px",
        "3xl": "10px",
        full: "9999px",
      },
      // Hard offset shadows instead of soft ambient blur.
      boxShadow: {
        sm: "1px 1px 0 0 rgb(25 24 19 / 0.05)",
        DEFAULT: "2px 2px 0 0 rgb(25 24 19 / 0.07)",
        md: "3px 3px 0 0 rgb(25 24 19 / 0.09)",
        lg: "4px 4px 0 0 rgb(25 24 19 / 0.11)",
        xl: "6px 6px 0 0 rgb(25 24 19 / 0.13)",
        none: "none",
      },
      letterSpacing: {
        label: "0.14em",
      },
      keyframes: {
        "draft-in": {
          "0%": { backgroundColor: "#e6f58c" },
          "100%": { backgroundColor: "transparent" },
        },
      },
      animation: {
        "draft-in": "draft-in 1.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
