/*
 * Run the tests for the slices that changed, and nothing else.
 *
 * The source is organized vertically -- a folder per slice of the product,
 * holding everything that slice needs and importing its neighbors only
 * through their public index. The payoff of that arrangement is not only that
 * code which changes together lives together: it is that **what a change can
 * break is bounded by the folder it was made in**, so the tests worth running
 * after it are the tests beside it.
 *
 * That is what this does. It asks git what changed, maps each file to the
 * slice that owns it, and runs each app's own test script over just those
 * slices. Editing `contact-us/` runs `contact-us/`; it does not compile
 * main-api.
 *
 * Three kinds of change widen that, and each widening is deliberate:
 *
 *   - a file **everything draws on** -- the theme, the icons, the
 *     infrastructure verticals main-api's `check-boundaries.mjs` names -- runs
 *     the whole app it is in, because every slice imports it;
 *   - a file **outside `src/`** -- a config, a build script, the package --
 *     runs the whole app, because it decides how all of it is built and run;
 *   - a file at the **root** of the repository runs both apps.
 *
 * Documentation changes run nothing.
 *
 * This is the inner loop, not the gate. It answers "did I break what I was
 * working on?" in seconds. `npm run test` answers "did I break anything?",
 * and that is the one that runs before a push -- a slice whose *callers*
 * break is exactly what this cannot see, because the caller's folder did not
 * change. See docs/testing.md.
 *
 *     node scripts/test-changed.mjs          # what is uncommitted, else HEAD~1
 *     node scripts/test-changed.mjs main     # everything since a branch or tag
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/*
 * The slices every other slice in their app imports, so a change in one of
 * them is a change everywhere. main-gui's is the theme -- which every test
 * mounts a `ThemeProvider` from -- and `shared/`, which is named for who may
 * use it: everybody. main-api's list is the `infrastructure` set its own
 * `scripts/check-boundaries.mjs` already keeps, and it is the same idea: the
 * verticals a vertical is allowed to depend on.
 *
 * It is a judgment, and this is where it is written down. Adding a slice
 * here makes the fast run slower and more honest; leaving one out that
 * belongs here is how a green run hides a broken one.
 */
const WIDE = {
  "main-gui": new Set(["design-system", "shared"]),
  "main-api": new Set([
    "authentication",
    "configuration",
    "database",
    "graphql",
    "health",
  ]),
};

/* Read and nothing else: a page of prose cannot break a test. */
const PROSE = /(^|\/)docs\/|\.md$/;

function git(...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(`git ${args.join(" ")}: ${result.stderr.trim()}`);
  return result.stdout;
}

/* Everything git will admit to: staged, unstaged, and not yet added. */
function uncommitted() {
  return (
    git("status", "--porcelain", "--untracked-files=all")
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3))
      /* A rename is reported as "old -> new"; what matters is where it is now. */
      .map((file) => file.split(" -> ").at(-1).replaceAll('"', ""))
  );
}

function since(ref) {
  return git("diff", "--name-only", ref).split("\n").filter(Boolean);
}

/*
 * What to run, as a map of app name to the slices in it -- or to `null`,
 * which means the whole app. `null` wins over any list: once everything is
 * running, a list of three of them is not narrower.
 */
function plan(files) {
  const runnable = appNames();
  const apps = new Map();
  const everything = () => {
    for (const app of runnable) apps.set(app, null);
  };

  for (const file of files) {
    if (PROSE.test(file)) continue;

    const [top, app, area, ...rest] = file.split("/");
    if (top !== "apps") {
      /* The root's own files: the lockfile, turbo.json, these scripts. */
      everything();
      continue;
    }
    /* An app with no test script -- `keycloak-idp` is a realm export and a
     * Dockerfile -- has nothing of its own to run, and is not a reason to run
     * everybody else's. */
    if (!runnable.includes(app)) continue;
    if (apps.get(app) === null) continue;

    /* Outside `src/`, or a file sitting directly in it -- the entry point,
     * the test setup, the generated route tree. Each decides how the whole
     * app is built or run. */
    if (area !== "src" || rest.length === 0 || WIDE[app]?.has(rest[0])) {
      apps.set(app, null);
      continue;
    }

    const slice = rest[0];
    const slices = apps.get(app) ?? new Set();
    slices.add(slice);
    apps.set(app, slices);
  }

  return apps;
}

/* The apps that have tests to run. `keycloak-idp` is a realm export and a
 * Dockerfile -- not a workspace, and nothing to run a test script on. */
function appNames() {
  return readdirSync(path.join(root, "apps"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((app) => {
      const manifest = path.join(root, "apps", app, "package.json");
      if (!existsSync(manifest)) return false;
      return Boolean(JSON.parse(readFileSync(manifest, "utf8")).scripts?.test);
    });
}

/*
 * How to say "only these" to the runner the app uses. Vitest takes path
 * fragments; Jest takes patterns matched against its own paths, which for
 * main-api are the compiled ones under `.test-dist`, so the `src/` in front
 * of a slice would match nothing there.
 *
 * A runner this does not recognize gets no filter and runs all of its tests.
 * A filter in the wrong dialect does not fail loudly -- it selects nothing,
 * and a suite that ran no tests looks exactly like a suite that passed.
 */
function filtersFor(app, slices) {
  const configured = (name) => existsSync(path.join(root, "apps", app, name));
  const dialect = configured("vitest.config.ts")
    ? (slice) => `src/${slice}`
    : configured("jest.config.cjs")
      ? (slice) => `(^|/)${slice}/`
      : null;

  return dialect === null ? null : [...slices].toSorted().map(dialect);
}

/* Say what would run and stop, which is also how to ask this script what it
 * thinks a change touches. */
const planOnly = process.argv.includes("--plan");
const ref = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
let files = ref ? since(ref) : uncommitted();
let what = ref ? `changed since ${ref}` : "uncommitted";

/* Nothing in the working tree: the last commit is what was just worked on,
 * and running nothing at all would be the least useful answer available. */
if (files.length === 0 && !ref) {
  files = since("HEAD~1");
  what = "in the last commit";
}

const apps = plan(files);

if (apps.size === 0) {
  console.log(`Nothing ${what} that any test covers.`);
  process.exit(0);
}

let failed = 0;

for (const [app, slices] of apps) {
  const filters = slices === null ? null : filtersFor(app, slices);
  console.log(
    filters === null
      ? `\n${app}: everything\n`
      : `\n${app}: ${[...slices].toSorted().join(", ")}\n`,
  );
  if (planOnly) continue;

  const result = spawnSync(
    "npm",
    ["run", "test", "--workspace", app, "--", ...(filters ?? [])],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) failed += 1;
}

process.exit(failed > 0 ? 1 : 0);
