import baseConfig from "@ethui/ui/tailwind.config";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.tsx",
    "./src/routes/**/*.tsx",
    "../**/*.tsx",
  ],
  presets: [baseConfig],
  plugins: [require("tailwindcss-animate")],
  theme: {
    extend: {
      colors: {
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
    },
  },
};
