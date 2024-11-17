import baseConfig from "@ethui/ui/tailwind.config";

console.log(baseConfig);
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/**/*.tsx",
    "./src/routes/**/*.tsx",
    "../packages/**/*.tsx",
  ],
  presets: [baseConfig],
  plugins: [require("tailwindcss-animate")],
};
