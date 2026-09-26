import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/*
 * The widget tester.
 *
 * **5174, deliberately not main-gui's port.** The whole value of this app is
 * that it is a *different origin*: a widget rendered inside main-gui would be
 * a widget on the same origin as the API's own front end, which is the one
 * case the CORS allowlist never has to decide anything about. Here the browser
 * really does send an `Origin` the API has to check against the widget's
 * document, so "I forgot to list this origin" is a thing you find here rather
 * than in a customer's console.
 *
 * `CLIENT_GUI_PORT` overrides it, and the origin to list in a definition is
 * whatever this prints when it starts.
 */
const port = Number(process.env.CLIENT_GUI_PORT ?? 5174);

/*
 * The SDK is aliased to its source rather than to its build output.
 *
 * `package.json` points `@front-runner/widget-sdk` at `dist`, which is right
 * for a customer and wrong here: a change to an element would need a `tsc`
 * run before this page could show it, and the point of this app is the loop
 * between changing the runtime and looking at it. Vite compiles the TypeScript
 * either way.
 *
 * What that costs is that this app does not exercise the published entry
 * points. `npm run build --workspace @front-runner/widget-sdk` and
 * `npm run build --workspace client-gui` are what check those, and Turborepo
 * runs the first before the second.
 */
const sdk = fileURLToPath(
  new URL("../../packages/widget-sdk/src/index.ts", import.meta.url),
);

// The repository root .env, the same one Compose and main-gui read. Only
// VITE_-prefixed keys reach the bundle.
const envDir = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  envDir,
  resolve: { alias: { "@front-runner/widget-sdk": sdk } },
  plugins: [react()],
  server: { host: true, port },
  preview: { host: true, port },
});
