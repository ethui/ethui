// eslint-disable-next-line @typescript-eslint/no-var-requires
const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "index.html",
    "src/**/*.{html,tsx}",
    "../node_modules/flowbite-react/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
    plugin(function ({ addBase }) {
      addBase({
        body: { fontSize: "inherit" },
      });
    }),
  ],
};
