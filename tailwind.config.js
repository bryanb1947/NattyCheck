/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0F0F0F",
        surface: "#151515",
        surface2: "#1A1A1A",
        border: "#2A2A2A",
        text: { DEFAULT: "#FFFFFF", muted: "#B3B3B3" },
        lime: "#B8FF47",
        aqua: "#00FFE0",
        cyan: "#00E0FF",
        danger: "#FF5277",
      },
      borderRadius: { xl: "16px", "2xl": "20px", pill: "999px" },
      boxShadow: { card: "0 8px 28px rgba(0,0,0,0.35)" },
      fontFamily: {
        display: ["Inter_700Bold", "System"],
        body: ["Inter_400Regular", "System"],
        medium: ["Inter_500Medium", "System"],
        semibold: ["Inter_600SemiBold", "System"],
      },
    },
  },
  plugins: [],
};
