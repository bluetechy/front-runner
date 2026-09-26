import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/* Merged rather than rewritten, so the SDK alias is declared once and the
 * tests resolve it exactly as the page does. */
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/test-setup.ts"],
      css: false,
    },
  }),
);
