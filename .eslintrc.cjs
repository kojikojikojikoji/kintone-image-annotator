/* ESLint config. The shared house preset (@cybozu/eslint-config) is the target
 * per the build guide; this repo uses @typescript-eslint directly to keep the
 * install graph small. See README TODO. */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  env: { browser: true, es2020: true, node: true },
  ignorePatterns: ["dist", "build", "node_modules", "*.cjs", "*.mjs"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
  },
};
