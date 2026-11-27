import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    rules: {
      // Unused code: variables, imports, function arguments after the last
      // used one, and caught errors.
      "no-unused-vars": ["error", { args: "after-used", caughtErrors: "all" }],
      "no-useless-assignment": "error",
      "no-unused-expressions": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: "error",
    },
  },
  {
    // The plugin: runs in the browser, inside acubemy's sandboxed iframe.
    files: ["*.js"],
    languageOptions: { globals: { ...globals.browser, acubemy: "readonly" } },
  },
  {
    files: ["eslint.config.js", "tests/**"],
    languageOptions: { globals: globals.node },
  },
];
