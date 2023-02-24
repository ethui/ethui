const plugin = require("tailwindcss/plugin");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,ts,tsx}", "ui/index.js"],
  theme: {
    extend: {},
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("daisyui"),
    plugin(function ({ addBase }) {
      addBase({
        body: { fontSize: "inherit" },
      });
    }),
  ],
};
