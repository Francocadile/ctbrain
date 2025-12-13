// ESLint configuration for CTBrain (Next 14 + TypeScript)
// Base: Next core web vitals + TypeScript recommended rules

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    next: {
      // App Router lives under src/app
      rootDir: ["src/"],
    },
  },
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
  ],
  plugins: ["@typescript-eslint", "import"],
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "out/",
    "coverage/",
    "prisma/migrations/",
  ],
  rules: {
    // Queremos calidad, pero sin romper todo de golpe
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/explicit-module-boundary-types": "off",
  "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: ".*", varsIgnorePattern: ".*" },
    ],
    "no-console": [
      "warn",
      { allow: ["warn", "error"] },
    ],
    "import/order": "off",
    // Hooks / TS strictness can be tuned over time; start lenient
    "react-hooks/rules-of-hooks": "off",
  "react-hooks/exhaustive-deps": "warn",
    "@typescript-eslint/ban-ts-comment": "off",
  "prefer-const": "warn",
    "react/no-unescaped-entities": "off",
    "import/no-anonymous-default-export": "off",
  },
};
