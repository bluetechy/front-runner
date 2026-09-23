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

A card reaching for `text.secondary` or the theme's `outlined` button would be
gray-violet and pink on white, both close to invisible; that is what those
tokens exist to prevent. `segmentTrack` is beside them, for the two segmented
controls, which are themed as `MuiToggleButtonGroup` / `MuiToggleButton`
because the page has two of them and neither should own the look.

The featured card is not a different card. Its border is the same dark rule as
the others; what carries it forward is the ribbon, the lit button, the deeper
shadow and a `0.75rem` lift that only applies from `md` up, where the cards sit
in a row.

## Plans

Two audiences, chosen by the first segmented control.

| Audience   | Plans                | Price a month              |
| ---------- | -------------------- | -------------------------- |
| Individual | Free, **Plus**, Pro  | $0, $19, $99               |
| Business   | **Team**, Enterprise | $29 per member, and a talk |

Paying for a year costs 20% less, which `plans.ts` applies rather than each
plan carrying a second price — `ANNUAL_DISCOUNT` is the only number to change.
The cards then show the discounted monthly rate with the single yearly charge
under it: Plus is `$15.20 per month`, `$182.40 billed once a year`.

**$29 for Team is a guess.** It is the one price nobody specified, picked to
sit above Pro per member while staying under what a per-seat plan usually
costs. Change it in `plans.ts`.

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
| "Get started" and the rest     | Real — they open the sign-in dialog the header opens  |
| "Contact sales" / "Talk to us" | Real links to `/contact-us`, which is now a real page |
| The FAQ answers                | **Copy, not policy** — see below                      |

Nothing bills. There is no subscription, no plan on an organization, no card
on file, and no enforcement of a single limit named on this page. The FAQ
states refund windows, proration, tax handling and a deletion period as if
somebody had decided them; each one has to be checked against the real terms
before this page is shown to anyone who could pay. The questions themselves
are the ones SaaS pricing pages are asked most — trials and cards, what a seat
is, changing plans, canceling, refunds, payment and tax, data and support.

## Responsive behavior

`md` (900px) is where the cards form a row; below it they stack full width and
the lift on the featured card is dropped. Three cards take a third of the row
each; two take half, inside a `58rem` container so a pair does not stretch into
billboards. Verified at 390px, 600px and 1440px — see the note about headless
Chrome in [the README](README.md#gotchas-met-while-building-this) before
believing a narrow screenshot.
