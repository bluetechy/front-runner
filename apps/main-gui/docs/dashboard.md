# The dashboard

Where a completed sign-in lands. It lives in `src/dashboard`, renders at
`/dashboard`, and is the first page in this app that is not a marketing page:
the header, the nav and the field it all sits on are different behind the
login, so it is wrapped in `src/app-chrome` rather than `src/site-chrome`.

It is built from a supplied mock-up of a KPI dashboard, with three changes
that were asked for:

- the mock-up floats its navigation as an inset panel; here the rail is
  **fixed to the left edge** and runs the full height of the window
- the rail is the **accent pink**, not the mock-up's blue
- the bar along the top is **white**, and the cards are laid on this app's own
  field rather than on the mock-up's pale grey

## The two shells

`routes/__root.tsx` is now nothing but an outlet, because there are two shells
under it and they never appear together:

```
routes/
  __root.tsx             the outlet, and nothing else
  _site.tsx              PageShell: the field, the header, the login dialog
  _site.index.tsx        /            the landing page
  _site.about.tsx        /about       and the rest of the marketing pages
  _site.auth.callback.tsx /auth/callback
  dashboard.tsx          /dashboard   AppShell + Dashboard
```

`_site` is a pathless layout route, so every marketing URL is exactly what it
was; what changed is that the header is now applied by the layout rather than
by the root. Adding a second page behind the login means one more route file
beside `dashboard.tsx` wrapped in the same `AppShell`.

## The chrome

`src/app-chrome` is the application's answer to `src/site-chrome`:

| File              | What it is                                              |
| ----------------- | ------------------------------------------------------- |
| `app-shell.tsx`   | the rail, the bar, and the field the cards are laid on  |
| `app-sidebar.tsx` | the rail itself, and the nav in it                      |
| `app-top-bar.tsx` | the white bar: search, language, notifications, account |

The rail is a **permanent** MUI drawer from `lg` up, which is what fixes it to
the edge and takes its own column out of the flow, and a **temporary** one
below that, opened by the hamburger in the top bar. Both drawers draw the same
paper, so the rail is one thing described once.

Only **Dashboard** has a route behind it. The other eight items name the
sections this product is going to have and are disabled until they exist,
because a nav link that goes nowhere is worse than one that says so.

## Colour

Four surfaces, all of them from `theme.palette.brand`, and nothing on the page
defines a colour of its own:

| Surface          | Token                           | What it is                          |
| ---------------- | ------------------------------- | ----------------------------------- |
| the rail         | `rail`, `railInk`, `railActive` | the accent, at the left edge        |
| the top bar      | `card`, `cardRule`              | card paper stretched across the top |
| behind the cards | `field`                         | the same field every page is on     |
| a card           | `card`, `cardEdge`, `cardInk`   | the pricing card, exactly           |

A dashboard card is the pricing card: white paper, the field's darkest violet
as a 2px rule, corners at `1.75rem`. That is deliberate — the app should have
one white surface, not two that are nearly the same. `cardField` and
`cardTint` were added for the two things the pricing cards never needed: a
hollow for the search field, and the tint a stat tile's icon sits in.

## The charts

Drawn by hand as SVG in `charts.tsx`. There is no chart library: these are
seven points, seven bars and three slices, and a dependency that drew them
would still have to be told this app's colours one by one. The rules the next
chart should follow too:

- **Series colours come from `brand.chartSeries`, in order, never cycled.**
  The first two are the accent pair every button uses; the third is a teal
  picked so the three stay apart for a colour-blind reader — the worst
  adjacent pair is 11.4 apart under protanopia, against a floor of 8.
- **Identity is never colour alone.** Two lines carry a legend; the ring's
  slices are named and priced in a list beside it.
- **The axis does not lie.** Gridline steps are 1, 2, 2.5 or 5 times a power
  of ten, so no label is ever a rounded-off version of the number it sits on.
  Dividing the highest point into four instead would print 4,500 as "5K".
- **Every mark carries a `<title>`**, so a value is one hover away, and the
  line chart's hit target is the whole column rather than the 2px line.

## What is real and what is placeholder

| Piece                            | State                                              |
| -------------------------------- | -------------------------------------------------- |
| Layout, chrome, colour           | Final                                              |
| Every figure on every card       | **Placeholder** — all of it is in `metrics.ts`     |
| The "Your account" card          | **Real** — Keycloak's identity and main-api's `me` |
| Who is signed in, in the top bar | Real — from the session                            |
| Logout, in the account menu      | Real                                               |
| Search, language, notifications  | Styled and labelled; they do nothing               |
| "Create KPI"                     | Styled; there is nothing to create yet             |
| The eight unbuilt nav items      | Disabled on purpose                                |

`metrics.ts` holds every number the page draws, so the day main-api serves
KPIs there is exactly one file the page stops reading from. The figures are
the mock-up's, made to agree with each other where the mock-up's did not: the
earnings slices add to their total, the week's days add to the week's total,
and the goal bar's percentage is the one its own two numbers give.

The account card is the page that used to stand here in full — the identity
Keycloak issued the token for beside the account main-api returned for that
same token, which is the only view that proves the whole chain rather than
just the login form. It stays until the cards around it have real queries of
their own.
