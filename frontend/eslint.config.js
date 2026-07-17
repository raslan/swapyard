import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";

// Flat config equivalent of the original .eslintrc.cjs:
//   extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended",
//             "plugin:react-hooks/recommended", "eslint-config-prettier"]
export default [
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tsPlugin.configs["flat/recommended"],
  reactHooks.configs.flat["recommended-latest"],
  prettierConfig,
];
