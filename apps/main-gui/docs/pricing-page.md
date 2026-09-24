# The pricing page

Lives in `src/pricing` and renders at `/pricing`. It replaced the
`Implementation` nav item, which was a `coming-soon` placeholder.

The shape is borrowed from two pages the design was drawn against:
**ChatGPT's** — a segmented control over a row of plan cards, each one a price,
a sentence and a ticked list — and **Gamma's**, which closes on an FAQ and a
band rather than on the last card. The colors are this app's, with one
deliberate exception below.

## The white cards

Everything else in the app is white-on-violet. The plan cards are the reverse:
white paper, a dark rule round the outside, corners at `1.75rem`. That is the
one surface in the product that does not take its ink from the dark palette,
so `theme.palette.brand` carries a small set of card-only tokens:

| Token          | What it is                                       |
| -------------- | ------------------------------------------------ |
| `card`         | the paper                                        |
| `cardEdge`     | the dark border — the field's own darkest violet |
| `cardInk`      | text on the card                                 |
| `cardInkMuted` | the card's secondary text                        |
| `cardRule`     | hairlines and dividers inside a card             |
| `cardFeatured` | the paper under the plan being pushed            |
| `cardBadge`    | the fade its "most popular" badge is painted in  |

A card reaching for `text.secondary` or the theme's `outlined` button would be
gray-violet and pink on white, both close to invisible; that is what those
tokens exist to prevent. `segmentTrack` is beside them, for the two segmented
controls, which are themed as `MuiToggleButtonGroup` / `MuiToggleButton`
because the page has two of them and neither should own the look.

The featured card is not a different card. Its border is the same dark rule as
the others, it sits on the same line as the others, and it wears the same
button: there was a `0.75rem` lift at `md` and up, and it is gone, so every
card in a row starts and ends at the same height. What carries it forward is
`cardFeatured`, the accent at 9% over white, a **most popular** badge beside
its name, and a deeper shadow. The badge used to be a ribbon straddling the
top edge; it reads as part of the name now, which is where the eye already is.

Every card's button is a `contained` one, which is a departure from the rule
in [the style guide](style-guide.md#the-accent-and-what-wears-it) that the accent is spent on
one thing per surface: a row of three lit buttons is three accents in view.
It is deliberate. Each card is its own surface with one offer on it, and the
plan being pushed is said by its paper and its badge instead. Nothing else on
the page spends the accent twice.

## Plans

Two audiences, chosen by the first segmented control.

| Audience   | Plans                        | Price a month              |
| ---------- | ---------------------------- | -------------------------- |
| Individual | Basic, **Standard**, Premium | $0, $19, $49               |
| Business   | **Team**, Enterprise         | $99 per member, and a talk |

Paying for a year costs 20% less, which `plans.ts` applies rather than each
plan carrying a second price — `ANNUAL_DISCOUNT` is the only number to change.
The cards then show the discounted monthly rate with the single yearly charge
under it: Standard is `$15.20 per month`, `$182.40 billed once a year`.

Every card wears the same button. A plan does not carry its own label: the
page has two of them, `START_BUTTON` and `CONTACT_BUTTON` in `plans.ts`, and
which one a card wears is decided by `contactSales`, the same field that
decides whether the button opens the sign-up dialog or goes to `/contact-us`.
Four cards say **Get Started** and Enterprise says **Contact Sales**.

Every figure on the page was given rather than worked out, Team included, and
they all live in `plans.ts`. Team is the only one charged per member: $99 a
member a month, against Premium's $49 for a whole account, so two people on
Team already cost more than Premium does.

Feature lines are drawn from the schema in `apps/main-db` — point currencies
with their own expiry and reset rules, badge criteria that fire from events,
transfers with daily and monthly limits, redemptions, approval stages, the
event log, invitations that the invitee accepts — so each line names something
this product is built to do rather than something invented for a card. What
distributes them across the plans is a judgment, not a constraint anything
enforces: nothing in the API or the database knows what a plan is yet.

## What is real and what is not

| Piece                          | State                                                 |
| ------------------------------ | ----------------------------------------------------- |
| Layout, palette, type          | Real                                                  |
| The segmented controls         | Real — local state, not in the URL                    |
| Prices and the 20% discount    | Real arithmetic over the numbers in `plans.ts`        |
| Which features sit where       | A first pass, to be argued about                      |
| "Get Started", on four cards   | Real — it opens the sign-up dialog the header opens   |
| "Contact Sales" / "Talk to us" | Real links to `/contact-us`, which is now a real page |
| The FAQ answers                | **Copy, not policy** — see below                      |

Nothing bills. There is no subscription, no plan on an organization, no card
on file, and no enforcement of a single limit named on this page. The FAQ
states refund windows, proration, tax handling and a deletion period as if
somebody had decided them; each one has to be checked against the real terms
before this page is shown to anyone who could pay. The questions themselves
are the ones SaaS pricing pages are asked most — trials and cards, what a seat
is, changing plans, canceling, refunds, payment and tax, data and support.

## Responsive behavior

`md` (900px) is where the cards form a row; below it they stack full width.
Nothing is lifted at any width. Three cards take a third of the row
each; two take half, inside a `58rem` container so a pair does not stretch into
billboards. Verified at 390px, 600px and 1440px — see the note about headless
Chrome in [the README](README.md#gotchas-met-while-building-this) before
believing a narrow screenshot.
