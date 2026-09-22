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

// tanstackRouter generates src/routeTree.gen.ts from src/routes, and has to
// run before the React plugin so the generated tree is transformed too.
export default defineConfig({
  envDir,
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
