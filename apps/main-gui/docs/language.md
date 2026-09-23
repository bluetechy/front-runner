# Language

The flag in the top bar is what picks the language the interface is in. It is
remembered in this browser, and it is not on the account.

## Which languages

Two, site wide:

| Tag     | Label            | Flag | Default |
| ------- | ---------------- | ---- | ------- |
| `en-US` | US English       | `US` | yes     |
| `es-MX` | Español (México) | `MX` |         |

`languages.ts` is the one list, and `defaultLanguage` is its first entry rather
than a second copy of the tag, so the two cannot drift. `en-US` is also what a
preference nobody has set resolves to, what a tag that is no longer offered
falls back to, and what `i18n.ts` passes as both `lng` and `fallbackLng`.
`index.html` carries `lang="en-US"` to match, so the document says the same
thing before any JavaScript runs.

**The site is translated; the repository is not.** `en-US` is the base language
of the project as a whole, so the source, the SQL and the documentation are
written in it, in American spelling. This file quotes Spanish in a few places
because it is about Spanish; that is an example under an en-US sentence rather
than a document in another language. See
[writing](../../../docs/writing.md).

## Why not on the profile

It was, until 2026-09-22: `dbo.UserProfiles."Language"`, a dropdown in the
profile form's Personal information card, a BCP 47 tag through the API. The
column is gone and so is the field.

A preference about how a screen reads belongs to the screen somebody is
reading it on. On the account it cannot answer the cases that actually come
up: a phone and a desktop wanting to differ, a visitor who has not signed in
yet, or the first paint of a page that has to choose a language before the
profile query has returned. In `localStorage` it answers all three, and it
costs nothing that mattered — nothing server-side ever read the column.

## The pieces

| File                      | What it is                                   |
| ------------------------- | -------------------------------------------- |
| `languages.ts`            | the languages offered, each with its flag    |
| `language-preference.tsx` | the choice, remembered, and `useLanguage`    |
| `language-menu.tsx`       | the flag button in the top bar, and the menu |
| `i18n.ts`                 | i18next, started once                        |
| `locales/<tag>.json`      | one file per language                        |

`LanguageProvider` is mounted in `routes/_app.tsx`, above the shell, so the
whole application behind the login can read the answer.

## Adding a language

One line in `languages.ts`:

```ts
{ tag: "fr-FR", label: "Français", flag: "FR" },
```

and a `locales/fr-FR.json` beside the others. The flag is already served —
all 256 are in `public/flags`, see [flags](shared/flags.md) — so there is nothing to
add for it. `languages.test.ts` will then require the new file to carry every
key the English one does, and to have translated each of them.

## Adding a translatable string

Keys are the English sentence itself, the way `ordercalc-gui` writes them, so
a string nobody has translated renders as itself rather than as a dotted path:

```tsx
const { t } = useTranslation();
…
<Button>{t("Update profile")}</Button>
```

Then add the key to **every** file in `locales/`. Both separators are off in
`i18n.ts`, so a key may contain `.` and `:` without being read as a path.

## What is translated

**The chrome and the profile page.** The rail's nav and the top bar, and then
`/profile` end to end — heading, breadcrumb, every section and field label,
the hints, the buttons, the two email preferences, and the card down the
left. The profile page was done as the proof that this reaches inside the
chrome, and it is the worked example to copy.

Every other page is still English: the strings are in the source, not yet
behind `t()`. That is the work remaining, page by page, and nothing else has
to change to do it.

### What does not translate, on purpose

Three kinds of string stay as they are, and the distinction is the whole
reason this is worth getting right rather than wrapping everything in `t()`:

- **A value is not a label.** `Gender` is stored as `Male` and checked
  against `UserProfiles_Gender_Check`; the Spanish reader sees `Hombre`
  above an option whose value is still `Male`. The select does
  `{ value: gender, label: t(gender) }`, and
  `profile-form.i18n.test.tsx` holds that line — translating the value would
  write a gender the database refuses.
- **A name is a name.** Facebook, GitHub, LinkedIn, TikTok and Twitter are
  called that in every language, in the form and on the card both.
- **Validation messages are the API's words.** main-api is the authority on
  what a profile may contain and it answers in English; the browser shows
  what it said. Translating this side would mean keeping a copy of every
  sentence main-api can produce, and the copy is what would go stale. The
  fix, when it is wanted, is for the API to answer with a code the browser
  looks up — not for the browser to guess.

Somebody's own words — their name, their bio, the handles they typed — are
obviously never touched.

## Three departures from ordercalc-gui

It is the same library — `i18next` and `react-i18next` — at current versions.
It does not take the other two packages that project uses, and `i18n.ts` says
why in full: no `i18next-browser-languagedetector`, because
`language-preference` is already the one answer to what language this is; no
`i18next-http-backend`, because two small files are better bundled than
fetched; and full tags rather than `load: "languageOnly"`, because `es-MX` and
`es-ES` are a distinction this product will want.
