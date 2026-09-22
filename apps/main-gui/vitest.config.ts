import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/*
 * The test run, kept out of vite.config.ts on purpose: the development and
 * runtime images both load that file to serve the app, and neither should
 * need a test runner installed in order to boot.
 *
 * Merged rather than rewritten, so the "@/" alias and the plugins are
 * defined once and the tests resolve imports exactly as the app does.
 */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      /* The icon tests call describe/test/expect without importing them. */
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      css: false,
    },
  }),
);
