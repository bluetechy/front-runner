import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/*
 * The test run for the SDK.
 *
 * There is no `vite.config.ts` beside this one, which is the difference from
 * main-gui: nothing here is served or bundled by Vite. The package is
 * compiled by `tsc` into `dist` and consumed by whatever bundler the customer
 * already has, so the only Vite in the package is the one the tests run
 * under.
 *
 * jsdom and `@testing-library/react` because every element in here is a
 * component, and what is worth asserting about one is what it renders.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
  },
});
