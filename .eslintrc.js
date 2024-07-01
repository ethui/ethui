module.exports = {
  extends: [
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
  ],
  plugins: ["react", "@typescript-eslint", "import"],

  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    project: [
      "./tsconfig.json",
      "./gui/tsconfig.json",
      "./extension/tsconfig.json",
      "./packages/react/tsconfig.json",
      "./packages/types/tsconfig.json",
      "./packages/data/tsconfig.json",
      "./packages/form/tsconfig.json",
      "./packages/abiparse/tsconfig.json",
    ],
  },

  ignorePatterns: [
    "node_modules/*",
    "extension/dist/*",
    "gui/dist/*",
    "target/*",
    ".yarn/*",
    "**/dist/**",
  ],

  settings: {
    react: {
      version: "detect",
    },
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: ["tsconfig.json", "./*/tsconfig.json"],
      },
      node: true,
    },
  },

  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "react/react-in-jsx-scope": "off",
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

    // eslint-plugin-import
    "import/no-deprecated": "warn",
    "import/no-empty-named-blocks": "error",
    "import/no-mutable-exports": "error",
    "import/no-named-as-default": "error",
    "import/no-unused-modules": "error",
    "import/no-unresolved": ["error", { ignore: ["bun:test"] }],
    "import/no-import-module-exports": "error",
    "import/first": "error",
    "import/newline-after-import": "error",
    "import/no-duplicates": "error",
    "import/order": [
      "error",
      {
        "newlines-between": "always",
        pathGroups: [
          { pattern: "@ethui/**", group: "sibling", position: "before" },
        ],
        distinctGroup: false,
        pathGroupsExcludedImportTypes: ["@ethui"],
        groups: [
          ["builtin", "external"],
          "type",
          ["object", "internal", "sibling", "parent", "index"],
        ],
      },
    ],
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**../"],
            message: "Relative imports are not allowed.",
          },
        ],
      },
    ],
  },
};
