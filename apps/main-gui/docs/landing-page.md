# The landing page

Built from a supplied mock-up: a deep violet field lit from behind an isometric
illustration, magenta as the only accent, and a display serif for everything but
body copy.

It lives in `src/landing` and renders at `/`. `src/site-chrome` supplies the
header and the field it sits on, so both are available to every later page.
Every color, size and font on the page comes from the MUI theme in
`src/design-system`; the page itself is Container, Grid, Stack, Typography and
Button with layout in `sx`.

## What is real and what is placeholder

| Piece                          | State                                                                |
| ------------------------------ | -------------------------------------------------------------------- |
| Layout, palette, type          | Final, from the mock-up                                              |
| Heading and body copy          | Placeholder — heading is the mock-up's, body is lorem ipsum          |
| `landing/hero-placeholder.png` | Placeholder — to be replaced with the real illustration              |
| "More details" / "View demo"   | Buttons are styled; the hrefs are `#` anchors                        |
| "Login"                        | Real — opens the sign-in dialog; see [signing in](authentication.md) |
| Search button                  | Styled and labeled; does nothing                                     |
| About / Features / Contact     | Real routes, rendering `coming-soon`                                 |
| Pricing                        | Real — see [the pricing page](pricing-page.md)                       |
| The sign-in dialog             | Real — opens on "Login", and on nothing else                         |

## Type

Both faces come from Google Fonts, linked in `index.html`, and are wired into
the theme's `typography`:

- **Playfair Display** — `h1`, `h2`, the nav, the logo and button labels, all
  italic in the mock-up
- **Inter** — body copy

Each has a real fallback stack in `theme.ts`, so the page degrades to Georgia
and the system sans if the fonts do not load. Material tracks button text wide;
`typography.button` sets `letterSpacing: "normal"` to match the mock-up, which
is also what lets the five nav links sit on one row on a phone.

## The placeholder image

The real illustration will have a transparent background. The placeholder is a
flat screenshot with its own violet baked in, so a square edge would otherwise
be visible against the field. The `img` fades its outer 14% to nothing with two
crossed linear-gradient masks:

```tsx
maskImage: [
  "linear-gradient(to right, transparent, #000 14%, #000 86%, transparent)",
  "linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent)",
].join(", "),
maskComposite: "intersect",
```

A radial mask is the obvious choice and was the first attempt, but it fails
twice here: it eats the corners of the phone, and `radial-gradient(ellipse 76%
76% at 50% 50%, …)` sizes its radii against the _full_ box rather than half of
it, so the fade is still ~70% opaque where it meets the edge and the seam stays
visible. When the real artwork lands, delete the mask along with the note above
it.

## Responsive behavior

Handled with MUI's breakpoints rather than media queries of its own. Below `md`
(900px) the hero's two `Grid` columns stack and center, and the nav moves to its
own row under the logo; below `sm` (600px) the nav drops to 0.85rem so five
links still fit. Verified at 390px and 1440px.
