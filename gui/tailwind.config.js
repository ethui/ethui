import baseConfig from "@ethui/react/tailwind.config";

console.log(baseConfig);
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/components/**/*.tsx",
    "./src/routes/**/*.tsx",
    "../packages/react/**/*.tsx",
  ],
  presets: [baseConfig],
};
