import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
rmSync(new URL("../dist/", import.meta.url), { recursive: true, force: true });
const result = spawnSync("tsc", ["-p", "tsconfig.build.json"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
