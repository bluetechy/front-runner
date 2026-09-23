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

## How it is drawn

[The style guide](style-guide.md) is where the surfaces and the numbers live;
this is the box itself, and why it is shaped the way it is. There are three
pieces and never more than two of them at once.

### The bar

A band across the foot of the window, fixed and full bleed, on the panel:
`brand.panel`, a `brand.panelEdge` hairline along its top, `brand.panelGlow`
under it. It is the one raised surface in the app with square corners, because
it meets three edges of the window. Its contents are in a `MuiContainer`, so
it keeps `brand.gutter` with the page above it.

Left to right on `md` and up, and top to bottom below it:

| Part                   | Drawn as                                                  |
| ---------------------- | --------------------------------------------------------- |
| "Cookies on this site" | 1.05rem, weight 600, the body face                        |
| The sentence           | `body2` in `text.secondary`, held to 70ch                 |
| "Privacy Policy"       | `primary.light`, underlined on hover, inside the sentence |
| **Reject all**         | outlined                                                  |
| **Accept all**         | outlined, identical                                       |
| Manage preferences     | text button                                               |

The heading is the body face rather than the display serif, which every other
heading in the product uses: this is a notice, not the top of a page, and a
Playfair line across the foot of the window reads as an advertisement for
itself.

**The two answers are the same button twice**, side by side, one press each.
Neither is contained, so neither wears the accent. That is a rule set by the
regulators rather than by this style guide, and it is written down in both
places: [the accent](style-guide.md#the-accent-and-what-wears-it) and the
table at the top of this page. **Manage preferences** is a text button because
it is a third thing rather than a third answer.

Below `sm` the three stack full width in the same order, so a phone meets
refuse first and the two answers are still the same shape. Nothing about the
box slides, fades or animates in: it is simply there on the first paint, the
way [the style guide](style-guide.md#shape) says everything in this product
arrives.

### The pill

What the bar becomes once it has been answered: the same panel, the same edge,
`brand.navText` for the label, and the 999px radius every other pill has, at
0.8rem. It sits 1rem off the bottom **right** corner, the same 1rem on every
page of both shells.

It was bottom left for a while, for two reasons that both went away. The rail
owns the bottom left behind the login from `lg` up, so the pill had to step
past `RAIL_WIDTH` there, which made this vertical the only one that knew
another shell existed; on the right there is nothing to step past, and the
pill no longer asks the router anything. The other reason was the toast, which
lands in that corner. The toast is what moved: `toast.tsx` stands 4rem off the
bottom so it stacks above the pill rather than over it. A pill that is the
only way back into the cookie choice cannot be covered up, however briefly,
and of the two it is the one that is always there.

### The dialog

An ordinary dialog on the panel, 20px corners, the same one the sign-in and
wallet dialogs are: a heading in `primary.light`, the intro in
`text.secondary`, a link to the policy, then one row per category.

A row is the category's name, the sentence about what it is for and what is
kept under it, and a `Switch` on the right. The necessary row is drawn and
disabled rather than left out, because somebody reading the list is owed the
whole list.

The footer is **Reject all**, **Accept all**, **Save my choices**, in that
order, stacking in the same order on a phone rather than reversing. Reversing
is the Material habit and it would put Accept above Reject on a narrow window,
which is a nudge even when the two buttons are identical. Only **Save my
choices** is contained: it is the one thing in the box that is neither answer.

### What it does to the layers

The bar and the pill sit at `zIndex.drawer + 2`, which is over the rail. It is
the only thing in the product that deliberately covers the chrome, and the
only thing allowed to: it is a question that has to be answered, it is
answered once, and then it is gone. See
[layers](style-guide.md#layers).

### Reaching it without a mouse or a screen

The bar is a named `section`, which makes it a `region` landmark somebody can
jump to, with a heading inside it. It is deliberately **not** a `dialog`: a
dialog implies a modal, and a modal here would be a cookie wall. Nothing traps
focus and nothing steals it, so the page stays usable while the question
stands.

The preferences dialog is a real modal and Material handles it: focus moves
in, Escape and the backdrop close it, focus returns to whatever opened it.
Each switch is labelled by its category's heading and described by the
sentence under it, so "Analytics, switch, off" comes with what analytics
means rather than only the word.

Every ratio in the box was measured against the panel and is in
[the contrast table](style-guide.md#contrast). One of them, an outlined
button's border at 2.8:1, is under the floor and is written down there as a
decision to make rather than quietly left.

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
shell, so that one answer covers both: a visitor who answers on the pricing
page has answered for the dashboard too, and asking from inside `_site` would
ask again on the way through the login. It had a second reason until the pill
moved corners. The pill used to read `_app` out of the router's matches and
step past `RAIL_WIDTH` from `lg` up, which is the sort of thing only a route
can do; on the right it is the same 1rem everywhere and knows nothing about
shells.

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

## Where this comes from

The design decisions above are not all ours. The ones that are not, and what
they were read against:

**The rules.** None of these are primary sources and nobody here is a lawyer;
they are the practitioner summaries this was built from, and the regulators'
own texts are what they quote.

- [EDPB cookie banner taskforce report](https://www.wsgrdataadvisor.com/2023/03/edpb-issues-guidance-on-cookie-banners/),
  for equal prominence, no pre-ticked boxes, and per-category consent.
- [CNIL's cookie guidelines and recommendations](https://www.cookieyes.com/blog/cnil-guidelines-and-recommendations-on-cookie-consent/),
  for the six months a choice stands, and for the fine over a banner where
  refusing took more presses than accepting.
- [Cookie banner requirements under EU law](https://trustyourwebsite.com/eu/en/guides/cookie-banner-requirements),
  for the shape of the box as a whole.
- [Designing a compliant cookie banner](https://cookieinformation.com/blog/designing-compliant-cookie-banners/),
  for what the categories are usually called and what belongs on the first
  screen.

**The standards.** These are primary, and they are what the numbers in the
style guide are measured against.

- [WCAG 2.2, SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  the 4.5:1 every sentence in the box clears.
- [WCAG 2.2, SC 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html),
  the 3:1 for something drawn rather than written, which is the floor the
  outlined border is measured against.
- [WAI-ARIA Authoring Practices: landmarks](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/),
  for the `region` the bar is, rather than the dialog it is not.
- [WAI-ARIA Authoring Practices: the modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/),
  for what the preferences dialog owes anybody arriving at it by keyboard.

**What is still owed** is one list, and it is not here:
[privacy and cookies: what is left](../../../docs/privacy-follow-ups.md).
