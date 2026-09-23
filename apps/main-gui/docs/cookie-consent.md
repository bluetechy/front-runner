# The cookie notice

Lives in `src/cookie-consent`, mounted once in
[`routes/__root.tsx`](../src/routes/__root.tsx), and drawn on every page of
both shells. It is the bar across the foot of the window that asks, the
dialog behind **Manage preferences** that asks in detail, and the pill in the
corner that is the way back to either.

It exists because of the GDPR and the ePrivacy Directive, so most of what
looks like a design decision in it is not one. This page is where the
difference is written down: what had to be that way, what was ours to choose,
and what is still missing.

## What had to be that way

| The rule                             | What it is in the code                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Refusing is as easy as accepting     | **Reject all** and **Accept all** are the same button twice: same variant, same row, one press |
| Neither answer is pushed             | Neither wears the accent. The only contained button in the box is **Save my choices**          |
| Nothing optional runs before consent | `useCookieConsent().allows()` answers `false` until somebody presses something                 |
| Silence is not consent               | Scrolling, reloading and navigating record nothing at all                                      |
| Consent is specific                  | One switch per category, answerable on its own                                                 |
| No pre-ticked boxes                  | Every optional switch opens off, and opens at the saved answer after that                      |
| Withdrawing is as easy as consenting | The pill, on every page, and the button in the privacy page's cookies section                  |
| The choice is not forever            | A record goes stale after six months and the question is put again                             |
| It stays until it is answered        | The bar has no X, no backdrop and no Escape. Three buttons, and nothing else takes it away     |

The last one is the ask this was built from, and it is the one with a trap in
it. **The bar is not a modal.** The page underneath stays readable, scrollable
and usable, because a site that refuses to show itself until it has a yes is
asking for a consent that was not freely given, which is the one thing worse
than not asking. It is a named `section`, which makes it a landmark a screen
reader can jump to, and it carries a heading inside it.

The symmetry of the two buttons is the part that has actually been enforced.
The CNIL fined Google over a banner where accepting was one press and refusing
was several, and the EDPB's cookie banner taskforce report says the same
thing: equal prominence, equal number of clicks, before any non-essential
cookie is set.

## The categories

Four, in `categories.ts`, read in one order everywhere: **strictly
necessary**, **preferences**, **analytics**, **marketing**.

**Only the first has anything behind it today**, and each of the other three
says so on its own row rather than implying a tracker nobody installed. The
gate is built before the thing it gates on purpose: the first script somebody
adds should have somewhere to ask permission, or it goes in ungated.

What is actually kept under the necessary category is four things, all of them
in this browser and none of them sent anywhere:

| What                     | Key                           |
| ------------------------ | ----------------------------- |
| The refresh token        | `front-runner.refresh-token`  |
| The two PKCE values      | `front-runner.pkce-*`         |
| The chosen language      | `front-runner.language`       |
| The cookie choice itself | `front-runner.cookie-consent` |

**The language tag is under "necessary" rather than under "preferences", and
that is a judgment.** It is written only when somebody picks a language from
the top bar, it is read only to put the interface back in that language, and
it identifies nobody. A preference set at the visitor's own explicit request
has always been treated as exempt from consent, and the alternative is worse
in both directions: gating it means somebody who refuses cookies gets the
interface in a language they did not choose, and a category called
"preferences" that quietly holds the one preference we keep is a category
nobody can answer honestly.

## How it is put together

```
cookie-consent/
  categories.ts          the four, and what is kept under each
  consent.ts             the record, its expiry, and the storage behind it
  cookie-consent.tsx     the provider, and the `allows()` gate
  cookie-notice.tsx      the bar, and the pill that replaces it
  cookie-preferences.tsx the dialog with a switch per category
```

The provider is in the root route rather than in `main.tsx` or in either
shell. Not in a shell, because a visitor who answers on the pricing page has
answered for the dashboard too, and asking from inside `_site` would ask again
on the way through the login. Not in `main.tsx`, because the pill has to know
which shell is drawn: behind the login the rail owns the corner it sits in, so
it reads `_app` out of the router's matches and steps past `RAIL_WIDTH` from
`lg` up.

The record is `localStorage` rather than a cookie, through
[`browser-storage`](../src/browser-storage/browser-storage.ts) so that a
browser refusing site data cannot take the page down on the way to respecting
a refusal. Three things make a stored record stop counting, and every one of
them fails towards asking again:

- it is older than `GOOD_FOR_MONTHS`, which is six, the CNIL's recommendation;
- it was written under an older `VERSION`, because consent to four categories
  is not consent to a fifth. **Raise `VERSION` when the categories change or
  when something new starts being kept under one**;
- it does not parse. Somebody with the developer tools open, or an older shape
  of the file.

## Gating something

```ts
const { allows } = useCookieConsent();
if (allows("analytics")) loadTheThing();
```

That is the whole contract, and it is the only way in. Outside the provider
the hook answers "nothing optional is allowed" rather than throwing, so a
component that has lost its provider loads nothing instead of everything.

## What this does not do yet

Four things, and the list of them with the work written out is
[privacy and cookies: what is left](../../../docs/privacy-follow-ups.md).
The two that matter:

- **It cannot prove anything.** The record is in the visitor's own browser, so
  they can edit it and it leaves with their site data. Demonstrating consent
  under Article 7(1) means a row on a server with a timestamp against it, and
  that is main-api's to grow.
- **Google Fonts is still a third party watching every visit**, from
  `index.html`, before this box has asked anything and where no gate can reach
  it. Serving the two faces ourselves is the single change that would most
  improve the compliance picture.

The other two are smaller: the bar sits over the foot of the page rather than
pushing it up, and a choice made in one tab reaches another only when that one
is reloaded, the same bargain [`language`](language.md) makes.

## The words

Every string in the box goes through `t()` and lives in
`language/locales/*.json`, in both `en-US` and `es-MX`. The notice is chrome
rather than a page, so it is translated even though the marketing pages around
it are not yet. On the marketing side there is no `LanguageProvider` above it,
so it draws in the default language until one is mounted there; behind the
login it follows the flag in the top bar. See [language](language.md).
