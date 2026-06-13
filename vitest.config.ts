import { defineConfig, configDefaults } from "vitest/config";

// Playwright E2E specs live in e2e/ and import @playwright/test, which Vitest
// cannot run. Vitest's default glob matches *.spec.ts, so exclude e2e/ here.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
