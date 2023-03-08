module.exports = {
  extends: [
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["react", "@typescript-eslint"],
  ignorePatterns: ["**/*.generated.ts", "node_modules/*", "dist/*"],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {},
};
