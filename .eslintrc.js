module.exports = {
  extends: [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  env: { es6: true },

  parserOptions: {
    sourceType: "module",
    project: [
      "./tsconfig.json",
      "./gui/tsconfig.json",
      "./extension/tsconfig.json",
    ],
  },

  plugins: ["react", "@typescript-eslint", "simple-import-sort", "import"],
  ignorePatterns: [
    "node_modules/*",
    "extension/*",
    "gui/*",
    "crates/*",
    "**/node_modules/*",
    "extension/dist/*",
    "gui/dist/*",
    "extension/provider-inpage/*",
    "extension/dist/*",
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
    "@typescript-eslint/no-confusing-void-expression": [
      "error",
      { ignoreArrowShorthand: true },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
  },
};
