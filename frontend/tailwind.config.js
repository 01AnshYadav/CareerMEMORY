/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF9",
        surface: "#FFFFFF",
        ink: {
          primary: "#18181B",
          secondary: "#52525B",
          muted: "#8A8A93",
        },
        border: "#E4E4E7",
        accent: {
          DEFAULT: "#4338CA",
          soft: "#EEF2FF",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "6px",
        sm: "4px",
      },
    },
  },
  plugins: [],
}