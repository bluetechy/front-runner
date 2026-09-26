# Every file has a test beside it

**For every `.ts`, `.tsx`, `.js` and `.jsx` file under an app's or a package's
`src/`, there is a `*.test.*` file next to it.** Not per folder, not per feature:
per file.

The rule is enforced rather than remembered — `npm run lint:tests` walks
`apps/*/src` and fails on anything that has neither a test nor a written
reason. It runs as part of `npm run lint`, so a file added without one does
not reach a review.

```sh
npm run lint:tests
# 223 source files have a test beside them; 2 say why they do not.
```

## Why per file

A test file named after the file it tests answers three questions at a glance
that a suite organized any other way does not:

- **Is this covered?** The answer is a directory listing, not a coverage
  report. `ls src/toast` shows `toast.tsx` and `toast.test.tsx`, and a missing
  one is visible without running anything.
- **Where do I add a test for this?** Next to the thing. Nobody has to decide
  which of four existing files a new assertion belongs in, and nobody adds a
  fourteenth `describe` to a 900-line file because that is where the imports
  already were.
- **What did this file promise?** Reading `x.test.ts` beside `x.ts` is reading
  the contract of that one unit. When a test in it fails, the file that broke
  is named in the path.

It also follows the same instinct as
[the vertical codebase](../apps/main-gui/docs/codebase-structure.md): code
that changes together lives together, and a test changes with the file it is
about.

## What a test file is for

This repository writes tests as sentences about behavior, not as a
transcription of the implementation. The house style, which the existing files
show better than a list can:

- `describe` names a thing or a situation — `"the notifications a caller may
read and mark"`, `"a browser that refuses to remember anything"`.
- `it` finishes the sentence with something a person would care about — `it
("answers null when the account has no row at all")`, `it("says so rather
than calling when the session has gone")`.
- A comment above a test says **why the case matters**, especially when the
  answer is non-obvious or was chosen against an alternative. The tests are
  where a lot of this product's reasoning is written down.
- Assertions are about what a caller sees: what was rendered, what was sent,
  what came back. A test that reaches into private state is a test that has
  to be rewritten every time the file is tidied.

What a file's test covers is a judgment, not a quota. A barrel's test is
three lines about its public surface; `authentication/keycloak.test.ts` is two
hundred about token verification, because that is where the risk is. Neither
is padded to look like the other.

## The exceptions, and how to declare one

Some files genuinely cannot be tested. The exemption is written **in the file
itself**, not in a list somewhere else, so the reason travels with the code:

```ts
/* @no-test  An interface and nothing else: it is erased at compile time, so
 * there is no behavior here to assert. */
```

The marker goes in the file's header comment — the checker reads the first 40
lines — and the reason after it is required. `@no-test` on its own is not an
exemption; the sentence is the whole point of it.

Two kinds of file are exempt without a marker, because nobody hand-edits them
and a marker would be written over on the next build:

| Pattern   | Why                                                           |
| --------- | ------------------------------------------------------------- |
| `*.gen.*` | Generated. `src/routeTree.gen.ts` is the TanStack plugin's.   |
| `*.d.ts`  | Declarations only; nothing survives compilation to assert on. |

A reason has to be about the file being untestable. "It is only a wrapper",
"it is obvious" and "it has no logic" are not reasons — a wrapper that passes
the wrong prop through is exactly the bug a three-line test catches. As of
today two files in the repository carry a marker: `shared/icons/IconProps.ts`
and `test-setup.ts`.

## What is outside the rule

**Scope is the `src/` of every workspace member: each app, and each package under
`packages/`.** A package is published rather than deployed, which if anything
raises the stakes -- a file in the widget SDK is compiled into somebody else's
application, where our suite is the last one that will ever run over it.

Build and run configuration (`vite.config.ts`, `vitest.config.ts`,
`jest.config.cjs`, the scripts under `apps/*/scripts`) is outside it. Those files
are exercised by the build and by the test run themselves; a test asserting what
a config file contains would be reading it twice and would fail for every
deliberate change.

`node_modules`, build output (`dist`, `build`, `coverage`, `.test-dist`) and
any vendored or third-party directory are never walked.

## Naming

`x.ts` is tested by `x.test.ts`, and `x.tsx` by `x.test.tsx`.

A file whose tests have grown enough to be worth splitting may have several,
each naming what it covers: `profile-form.tsx` is covered by
`profile-form.save.test.tsx` and `profile-form.i18n.test.tsx`. The checker
accepts any `x.<something>.test.*` beside `x.tsx` — what it will not accept is
a test whose name does not start with the name of the file it is about,
because then the pairing is only in somebody's head.

## Running them

```sh
npm run test                       # every app, through Turborepo
npm run test:changed               # only the slices that changed
npm run test --workspace main-gui  # vitest
npm run test --workspace main-api  # jest, over the compiled output
npm run test:watch --workspace main-gui
npm run lint:tests                 # only the "is there one?" check
```

## Only the slices you changed

The source is organized vertically — a folder per slice of the product,
holding everything that slice needs and reaching its neighbors only through
their public index. The usual argument for that is that code which changes
together lives together. **The argument that matters while you work is about
tests: what a change can break is bounded by the folder it was made in, so
the tests worth running after it are the tests in that folder.**

That is what `npm run test:changed` does. It asks git what changed, maps each
file to the slice that owns it, and runs each app's own test runner over just
those slices:

```sh
npm run test:changed                        # what is uncommitted, else HEAD~1
npm run test:changed -- main                # everything since a branch or tag
npm run test:changed -- --plan              # say what it would run, run nothing
```

```
$ npm run test:changed -- --plan
main-api: tallies
main-gui: pricing, routes
```

Editing `contact-us/` runs `contact-us/` — a second or two — instead of the
whole repository, and it does not compile main-api to find out that main-api
is fine. The whole suite is about **22 seconds**; one slice of main-gui is about
**two**.

### What widens it

Three kinds of change are not one slice's business, and each of them widens
the run deliberately:

| What changed                                                                              | What runs                                    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------- |
| A slice: `main-gui/src/contact-us`, `main-api/src/tallies`                                | that slice                                   |
| A package: `packages/widget-sdk/src/...`                                                  | that package, and every app that installs it |
| Something every slice draws on: the theme, `shared/`, main-api's infrastructure verticals | that whole app                               |
| Anything outside `src/`: a config, a build script, the package                            | that whole app                               |
| Anything at the root of the repository                                                    | every app                                    |
| Documentation                                                                             | nothing                                      |

Which slices count as "every slice draws on this" is a judgment, and it is
written down in one place — the `WIDE` table at the top of
[`scripts/test-changed.mjs`](../scripts/test-changed.mjs). main-gui's is the
theme and `shared/`; main-api's is the `infrastructure` set its own
`scripts/check-boundaries.mjs` already keeps. Adding a slice there makes the
fast run slower and more honest; leaving one out that belongs there is how a
green run hides a broken one.

### It is the inner loop, not the gate

`test:changed` answers "did I break what I was working on?" in seconds.
`npm run test` answers "did I break anything?", and **that is the one that
runs before a push and in CI.**

The gap between the two is real and worth naming: a change inside a slice can
break a _caller_ in another slice, and the caller's folder did not change, so
nothing selects it. Vertical slicing narrows that risk — a slice is reached
only through its index, so the surface a caller depends on is small and
deliberate — but it does not remove it. The fast run is what you use while
the edit is still in your head; the full run is what you believe.

The two apps use different runners for reasons that predate this page —
[main-gui](../apps/main-gui/docs/README.md) runs Vitest with jsdom and
`@testing-library/react`, and
[main-api](../apps/main-api/docs/README.md) compiles to `.test-dist` and runs
Jest over the output. The practice is the same in both.

`apps/main-gui/src/shared/` is exempt from Prettier and keeps its own
hand-authored style — tabs, spaces around colons. A test written in that
folder follows the folder, not this page. See
[icons](../apps/main-gui/docs/shared/icons.md).

## Looking at it

Neither suite can tell you a page looks right. jsdom draws no pixels, so a
control can pass every assertion about what it does and still render as
something nobody would take for a control. That is not a gap in the rule
above; it is a different question, and it is answered by opening the page.

The way it is done here is Playwright, driven from a scratch directory
**outside the repository**, against the running Compose stack:

```sh
mkdir -p /tmp/look && cd /tmp/look
npm init -y && npm install playwright && npx playwright install chromium
```

A script logs in through the card the way a person does, goes to the page and
takes the picture:

```js
import { chromium } from "playwright";

const page = await (
  await chromium.launch()
).newPage({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 2,
});
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.goto("http://localhost/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /accept all/i }).click();
await page
  .getByRole("button", { name: /^login$/i })
  .first()
  .click();
await page.locator('[role=dialog] input[type="text"]').first().fill("testuser");
await page.locator('[role=dialog] input[type="password"]').fill("testuser");
await page.locator('[role=dialog] button[type="submit"]').click();
await page.goto("http://localhost/security-and-access");
await page.locator(".MuiDialog-paper").screenshot({ path: "dialog.png" });
```

Two details cost time to find. `[role=dialog]` also matches the app's drawer,
so a dialog is `.MuiDialog-paper`. And a heading styled `text-transform:
uppercase` still has its original case in the DOM, so a selector matching the
words on the screen finds nothing.

**It is not a workspace, and should not become one until something asserts.**
There is nothing here to keep green: the output is a picture, and the reader
is a person. A browser binary in the lockfile would be a cost every install
pays for a thing CI never runs. If a real visual-regression suite is ever
wanted, that is a workspace with its own baselines, and this page will say so.

### Reaching a state the stack cannot produce

Some states need a third party this repository has no credentials for. The
SMS dialog's second step needs Twilio, so the row draws switched off and the
step is unreachable. Rather than skip it, intercept the response in the
browser:

```js
await page.route("http://localhost:30000/graphql", async (route) => {
  const { query } = JSON.parse(route.request().postData() || "{}");
  if (query.includes("StartSmsEnrollment"))
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          startSmsEnrollment: {
            PhoneNumber: "\u2022\u2022\u2022\u2022 0123",
            SentAt: new Date().toISOString(),
          },
        },
      }),
    });
  return route.continue();
});
```

**What that checks is the drawing, not the answer.** A stubbed response proves
the page renders a shape; it proves nothing about the API producing that
shape, which is what the API's own tests are for. Keep the stub to the one
field that is out of reach and let everything else come from the real stack,
or the picture stops being of this product.

### What it is for

One example, because it is the kind of thing only this finds. On the SMS
dialog's code step, "Use a different number" was a text button on a dark
panel. Every test about it passed: it was a button, it had that name, and
clicking it went back a step. Rendered, it was a line of white prose with
nothing marking it as anything, and it was the only way out of a step
somebody had not meant to be on. It is a link in a sentence now.

So: a new card, dialog or state gets looked at once before it is called
finished, and the states that need stubbing get looked at too.

## Adding a file

1. Write the file.
2. Write `<name>.test.<ext>` beside it. One `describe` per thing the file
   does; one `it` per sentence somebody would want to be true.
3. `npm run lint:tests` to confirm the pairing, then `npm run test`.

If the second step is genuinely impossible, say so in the file with
`@no-test` and a reason — and expect the reason to be read.
