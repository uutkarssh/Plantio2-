import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  // Force light mode — no darkMode key (no class/selector triggers dark styles)
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F6F3EA",
        forest: "#1F4D36",
        midgreen: "#3C8C4A",
        leaf: "#8FD14F",
        gold: "#F5C518",
        warn: "#E85D3D",
        ink: "#161611",
        background: "#F6F3EA",
        foreground: "#161611",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#161611",
        },
        primary: {
          DEFAULT: "#1F4D36",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5C518",
          foreground: "#161611",
        },
        muted: {
          DEFAULT: "#ECE7D6",
          foreground: "#5C5A4F",
        },
        accent: {
          DEFAULT: "#8FD14F",
          foreground: "#161611",
        },
        destructive: {
          DEFAULT: "#E85D3D",
          foreground: "#FFFFFF",
        },
        border: "#161611",
        input: "#161611",
        ring: "#1F4D36",
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-bakbak)", "var(--font-poppins)", "sans-serif"],
      },
      borderRadius: {
        lg: "1.25rem",
        md: "0.75rem",
        sm: "0.5rem",
        xl: "1.75rem",
        "2xl": "1.75rem",
        "3xl": "2rem",
      },
      boxShadow: {
        sticker: "5px 5px 0px 0px #161611",
        "sticker-sm": "3px 3px 0px 0px #161611",
        "sticker-press": "2px 2px 0px 0px #161611",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
