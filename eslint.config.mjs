import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([".nuxt/**", ".output/**", "src/generated/prisma/**"]),
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
]);
