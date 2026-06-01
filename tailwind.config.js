/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#0D0D0D",
          50: "#F5F5F4",
          100: "#E8E8E6",
          200: "#C8C8C4",
          300: "#A0A09A",
          400: "#6B6B64",
          500: "#3D3D38",
          600: "#1F1F1C",
          700: "#141412",
          800: "#0D0D0D",
        },
        acid: {
          DEFAULT: "#C8F135",
          dark: "#A8CC1F",
          muted: "#DCF87A",
        },
        pass: "#22C55E",
        fail: "#EF4444",
        inconclusive: "#F59E0B",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease forwards",
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-in": "slideIn 0.3s ease forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        slideIn: {
          from: { opacity: 0, transform: "translateX(-8px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
