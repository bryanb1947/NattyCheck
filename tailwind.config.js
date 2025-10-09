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
        text: {
          DEFAULT: "#FFFFFF",
          muted: "#B3B3B3",
        },
        // accents used across the UI
        lime: "#B8FF47",
        aqua: "#00FFE0",
        cyan: "#00E0FF",
        danger: "#FF5277",
        success: "#A4FF4A",
        info: "#00FFAE",
        badge: {
          balanced: "#00FFE0",
          strong: "#00FFAE",
          lagging: "#FF5277",
          excellent: "#B8FF47",
        },
      },
      borderRadius: {
        xl: "16px",
        "2xl": "20px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 8px 28px rgba(0,0,0,0.35)",
        soft: "0 4px 18px rgba(0,0,0,0.25)",
      },
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
