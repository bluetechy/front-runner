# The landing page

Built from a supplied mock-up: a deep violet field lit from behind an isometric
illustration, magenta as the only accent, and a display serif for everything but
body copy.

It lives in `src/landing` and renders at `/`. `src/site-chrome` supplies the
header and the field it sits on, so both are available to every later page.

## What is real and what is placeholder

| Piece                                       | State                                                          |
| ------------------------------------------- | -------------------------------------------------------------- |
| Layout, palette, type                       | Final, from the mock-up                                        |
| Heading and body copy                       | Placeholder — heading is the mock-up's, body is lorem ipsum    |
| `landing/hero-placeholder.png`              | Placeholder — to be replaced with the real illustration        |
| "More details" / "View demo"                | Buttons are styled; the hrefs are `#` anchors                  |
| "Sign In"                                   | An `#` anchor. Keycloak owns sign-in; the flow is not wired up |
| Search button                               | Styled and labelled; does nothing                              |
| About / Features / Implementation / Contact | Real routes, rendering `coming-soon`                           |

## Type

Both faces come from Google Fonts, linked in `index.html`:

- **Playfair Display** — the heading, nav, logo, and button labels, all italic
  in the mock-up
- **Inter** — body copy

Each has a real fallback stack in `tokens.css`, so the page degrades to Georgia
and the system sans if the fonts do not load.

## The placeholder image

The real illustration will have a transparent background. The placeholder is a
flat screenshot with its own violet baked in, so a square edge would otherwise
be visible against the field. `.hero__image` fades its outer 14% to nothing with
two crossed linear-gradient masks:

```css
mask-image:
  linear-gradient(to right, transparent, #000 14%, #000 86%, transparent),
  linear-gradient(to bottom, transparent, #000 14%, #000 86%, transparent);
mask-composite: intersect;
```

A radial mask is the obvious choice and was the first attempt, but it fails
twice here: it eats the corners of the phone, and `radial-gradient(ellipse 76%
76% at 50% 50%, …)` sizes its radii against the _full_ box rather than half of
it, so the fade is still ~70% opaque where it meets the edge and the seam stays
visible. When the real artwork lands, delete the mask along with the note above
it.

## Responsive behaviour

One breakpoint at 860px: the hero collapses to a single centred column and the
nav moves to its own row under the logo. A second at 560px drops the nav to
0.85rem so five links still fit. Verified at 390px and 1440px.
