import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// GUI_PORT comes from the repository .env when Compose runs this; outside
// Compose it is unset and the usual Vite port is used.
const port = Number(process.env.GUI_PORT ?? 5173);

// Bind mounts on Docker Desktop do not deliver file-change events reliably,
// so the Compose service asks for polling. Local development does not.
const usePolling = process.env.VITE_WATCH_POLLING === "true";

// Every address in this repository lives in the root .env, which is what
// Compose hands the other services. Pointing envDir at it means the browser
// and the containers are configured from one file rather than two; only
// VITE_-prefixed keys are exposed, so nothing else in it reaches the bundle.
const envDir = fileURLToPath(new URL("../..", import.meta.url));

// "@/x" means "src/x". Declared here and in tsconfig.json, which have to
// agree: this one resolves the import, that one type-checks it.
// vitest.config.ts merges this file, so the tests resolve it the same way.
const srcDir = fileURLToPath(new URL("./src", import.meta.url));

// The widget SDK, aliased to its source rather than to its built `dist`, the
// same way apps/client-gui does it. The studio's preview renders a pasted
// definition with the very runtime a customer embeds, so the loop between
// changing an element and seeing it here should not have a `tsc` in it -- and
// `npm run dev` would otherwise need the package built first. Vite compiles
// the TypeScript either way, and the published entry points are checked by
// `npm run build`, which Turborepo runs after the package's own build.
const widgetSdk = fileURLToPath(
  new URL("../../packages/widget-sdk/src/index.ts", import.meta.url),
);

// tanstackRouter generates src/routeTree.gen.ts from src/routes, and has to
// run before the React plugin so the generated tree is transformed too.
export default defineConfig({
  envDir,
  resolve: { alias: { "@": srcDir, "@front-runner/widget-sdk": widgetSdk } },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
  ],
  server: {
    host: true,
    port,
    watch: usePolling ? { usePolling: true, interval: 300 } : undefined,
  },
  preview: {
    host: true,
    port,
  },
});
