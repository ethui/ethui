module.exports = {
  extends: [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.json", "./extension/tsconfig.json"],
  },
  plugins: ["react", "@typescript-eslint"],
  ignorePatterns: [
    "**/*.generated.ts",
    "node_modules/*",
    "extension/dist/*",
    "gui/dist/*",
    "extension/provider-inpage/*",
    "target/*",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "react/jsx-uses-react": "off",
    "react/react-in-jsx-scope": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/require-await": "error",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
};
