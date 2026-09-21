import { spawn } from "node:child_process";
import { watch } from "node:fs";
// Compile with TypeScript itself: decorator metadata is required by Nest DI.
let server;
let compiling = false;
let pending = false;
async function build() {
  if (compiling) {
    pending = true;
    return;
  }
  compiling = true;
  const compiler = spawn("tsc", ["-p", "tsconfig.json"], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  compiler.on("exit", async (code) => {
    if (code === 0) {
      if (server && server.exitCode === null) {
        await new Promise((resolve) => {
          server.once("exit", resolve);
          server.kill("SIGTERM");
        });
      }
      server = spawn(
        process.execPath,
        ["--env-file-if-exists=../../.env", "dist/main.js"],
        { stdio: "inherit" },
      );
    }
    compiling = false;
    if (pending) {
      pending = false;
      build();
    }
  });
}
let timer;
const watcher = watch("src", { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(build, 150);
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    watcher.close();
    server?.kill(signal);
    process.exit();
  });
build();
