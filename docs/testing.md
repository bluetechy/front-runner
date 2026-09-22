# Every file has a test beside it

**For every `.ts`, `.tsx`, `.js` and `.jsx` file under an app's `src/`, there
is a `*.test.*` file next to it.** Not per folder, not per feature: per file.

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

This repository writes tests as sentences about behaviour, not as a
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

What a file's test covers is a judgement, not a quota. A barrel's test is
three lines about its public surface; `authentication/keycloak.test.ts` is two
hundred about token verification, because that is where the risk is. Neither
is padded to look like the other.

## The exceptions, and how to declare one

Some files genuinely cannot be tested. The exemption is written **in the file
itself**, not in a list somewhere else, so the reason travels with the code:

```ts
/* @no-test  An interface and nothing else: it is erased at compile time, so
 * there is no behaviour here to assert. */
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

**Scope is each app's `src/`.** Build and run configuration — `vite.config.ts`,
`vitest.config.ts`, `jest.config.cjs`, the scripts under `apps/*/scripts` — is
outside it. Those files are exercised by the build and by the test run
themselves; a test asserting what a config file contains would be reading it
twice and would fail for every deliberate change.

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
npm run test                       # both apps, through Turborepo
npm run test --workspace main-gui  # vitest
npm run test --workspace main-api  # jest, over the compiled output
npm run test:watch --workspace main-gui
npm run lint:tests                 # only the "is there one?" check
```

The two apps use different runners for reasons that predate this page —
[main-gui](../apps/main-gui/docs/README.md) runs Vitest with jsdom and
`@testing-library/react`, and
[main-api](../apps/main-api/docs/README.md) compiles to `.test-dist` and runs
Jest over the output. The practice is the same in both.

`apps/main-gui/src/shared/` is exempt from Prettier and keeps its own
hand-authored style — tabs, spaces around colons. A test written in that
folder follows the folder, not this page. See
[icons](../apps/main-gui/docs/shared/icons.md).

## Adding a file

1. Write the file.
2. Write `<name>.test.<ext>` beside it. One `describe` per thing the file
   does; one `it` per sentence somebody would want to be true.
3. `npm run lint:tests` to confirm the pairing, then `npm run test`.

If the second step is genuinely impossible, say so in the file with
`@no-test` and a reason — and expect the reason to be read.
