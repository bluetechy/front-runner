/*
 * Every source file has a test beside it.
 *
 * This is the practice this repository keeps, and this is what enforces it:
 * for each `.ts`, `.tsx`, `.js` and `.jsx` file under an app's `src/`, there
 * has to be a `*.test.*` file next to it, or the file has to say in its own
 * words why it cannot have one.
 *
 * The exemption is written in the file rather than in a list here, so the
 * reason travels with the code and is read by whoever edits it next:
 *
 *     /* @no-test  Type declarations only; nothing survives compilation. *\/
 *
 * Two kinds of file are exempt without a marker, because nobody hand-edits
 * them and a marker would be written over: anything generated (`*.gen.ts`)
 * and anything that is only type declarations (`*.d.ts`).
 *
 * Scope is the `src/` of everything in the workspace: each app, and each
 * package under `packages/`. A package is published rather than deployed,
 * which if anything raises the stakes -- a file in the SDK is compiled into
 * somebody else's application, where our test suite is the last one that ever
 * runs over it. Build and run configuration -- vite.config.ts, the scripts
 * under `apps/*\/scripts` -- is outside it: those files are exercised by the
 * build and the test run themselves, and a test that asserted what a config
 * file contains would only be reading it twice. `node_modules`, build output
 * and vendored code are never walked.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

/* Never walked, wherever they appear. */
const SKIP_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".test-dist",
  ".git",
  "vendor",
  "third_party",
]);

const SOURCE = /\.(ts|tsx|js|jsx)$/;
const TEST = /\.test\.(ts|tsx|js|jsx)$/;
const GENERATED = /\.gen\.(ts|tsx|js|jsx)$/;
const DECLARATION = /\.d\.ts$/;

/* The marker, and the reason after it. A marker with nothing after it is not
 * an exemption: the point of it is the sentence. */
const NO_TEST = /@no-test[ \t]+(\S.*)/;

/* How far into a file to look for it. It belongs in the header comment. */
const HEADER_LINES = 40;

function* sourceFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      yield* sourceFiles(path.join(directory, entry.name));
      continue;
    }
    if (!entry.isFile()) continue;
    const file = path.join(directory, entry.name);
    if (!SOURCE.test(entry.name)) continue;
    if (TEST.test(entry.name)) continue;
    if (GENERATED.test(entry.name) || DECLARATION.test(entry.name)) continue;
    yield file;
  }
}

/*
 * A test beside it. `profile-form.tsx` is covered by `profile-form.save.test.tsx`
 * as well as by `profile-form.test.tsx`: a file large enough to want its tests
 * split into several files should be allowed to, and each of them still names
 * what it is testing.
 */
function hasTest(file) {
  const directory = path.dirname(file);
  const base = path.basename(file).replace(SOURCE, "");
  return readdirSync(directory).some(
    (name) => TEST.test(name) && name.startsWith(`${base}.`),
  );
}

function exemption(file) {
  const header = readFileSync(file, "utf8")
    .split("\n")
    .slice(0, HEADER_LINES)
    .join("\n");
  return (
    NO_TEST.exec(header)?.[1]
      ?.replace(/\*\/\s*$/, "")
      .trim() ?? null
  );
}

/* Every workspace member's `src/`, whether it is deployed or published. */
function sourceRoots(group) {
  let entries;
  try {
    entries = readdirSync(path.join(root, group), { withFileTypes: true });
  } catch {
    /* A workspace group that does not exist yet is not a failure: this
     * repository had no `packages/` until the widget SDK wanted one. */
    return [];
  }
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, group, entry.name, "src"))
    .filter((directory) => {
      try {
        return statSync(directory).isDirectory();
      } catch {
        return false;
      }
    });
}

const apps = [...sourceRoots("apps"), ...sourceRoots("packages")];

let untested = 0;
let exempt = 0;
let tested = 0;

for (const app of apps) {
  for (const file of sourceFiles(app)) {
    const relative = path.relative(root, file);
    if (hasTest(file)) {
      tested += 1;
      continue;
    }
    const reason = exemption(file);
    if (reason) {
      exempt += 1;
      continue;
    }
    console.error(
      `${relative}: no test beside it. Add ${path
        .basename(file)
        .replace(
          SOURCE,
          "",
        )}.test${path.extname(file)}, or say in the file why it cannot have one:\n` +
        `    /* @no-test  <why> */`,
    );
    untested += 1;
  }
}

console.log(
  `${tested} source files have a test beside them; ${exempt} say why they do not.`,
);

if (untested > 0) {
  console.error(`\n${untested} source file(s) have neither.`);
  process.exit(1);
}
