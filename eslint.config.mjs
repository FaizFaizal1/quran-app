import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["dist/", "android/", "node_modules/"]
  },
  { languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.jest } } },
  pluginJs.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
      "no-undef": "off"
    }
  }
];
