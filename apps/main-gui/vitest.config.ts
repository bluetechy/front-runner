import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

/*
 * The test run, kept out of vite.config.ts on purpose: the development and
 * runtime images both load that file to serve the app, and neither should
 * need a test runner installed in order to boot.
 *
 * Merged rather than rewritten, so the "@/" alias and the env directory are
 * defined once and the tests resolve imports exactly as the app does.
 *
 * The one thing that is *not* shared is the router plugin. It does two jobs
 * the tests do not want: it regenerates `routeTree.gen.ts` from `src/routes`
 * -- a build artefact a test run has no business rewriting -- and, with
 * `autoCodeSplitting`, it lifts each route's component into a chunk of its
 * own and leaves a lazy stand-in behind. A route test would then be
 * asserting on the stand-in rather than on the page. So the plugins are
 * replaced here with the React one alone, and a route file under test is the
 * file as it is written.
 */
const merged = mergeConfig(
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

/* `mergeConfig` concatenates plugin lists rather than replacing them, so the
 * router plugin is taken back out here rather than merged over. */
export default defineConfig({ ...merged, plugins: [react()] });
