import baseConfig from "@ethui/ui/tailwind.config";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [baseConfig],
  content: [
    "../node_modules/@ethui/ui/**/*.js",
    "./src/components/**/*.tsx",
    "./src/routes/**/*.tsx",
    "../packages/**/*.tsx",
  ],
  plugins: [require("tailwindcss-animate")],
};
