/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        incus: {
          green: "#52E394", // Primary CTA Accent Green
          "green-hover": "#66ea9f",
          blue: "#37baf2", // Incus Sky Blue (logo subtext, links, telemetry)
          "blue-hover": "#52c6f5",
          dark: "#0A0B0E", // Background Base Dark
          card: "#12141A", // Surface Card Dark
          elevated: "#1A1D24", // Surface Elevated Dark
          border: "rgba(255, 255, 255, 0.08)",
          text: {
            primary: "#FFFFFF",
            secondary: "#8B949E",
            muted: "#555D68",
          },
        },
        tethera: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          charcoal: "#12141A",
          graphite: "#1A1D24",
          accent: "#52E394",
          "accent-light": "#F0FDFA",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["Inter", "Montserrat", "sans-serif"],
        mono: ["var(--font-mono)", "'JetBrains Mono'", "'SF Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
