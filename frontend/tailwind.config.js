/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06080f",
          900: "#0b0f1a",
          800: "#121829",
          700: "#1a2238",
        },
        accent: {
          cyan: "#22d3ee",
          violet: "#a78bfa",
          rose: "#fb7185",
          emerald: "#34d399",
        },
      },
      fontFamily: {
        display: ["Segoe UI", "system-ui", "sans-serif"],
        mono: ["Cascadia Code", "Consolas", "monospace"],
      },
      animation: {
        pulseSlow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
