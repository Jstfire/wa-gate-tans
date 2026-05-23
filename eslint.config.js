//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config";

export default [
  ...tanstackConfig,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
      // drizzle-orm .returning()[0] is undefined at runtime but TS doesn't know
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
  {
    ignores: ["eslint.config.js", "prettier.config.js", ".wwebjs_auth/**", ".wwebjs_cache/**", ".runtime-auth/**", ".runtime-cache/**"],
  },
];
