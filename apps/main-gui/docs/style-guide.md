# Style guide

Everything visual in this app comes from one file,
[`src/design-system/theme.ts`](../src/design-system/theme.ts). This page is
that file read from the outside: what the surfaces are, what may be written on
each of them, where the accent is allowed, and what a new color has to clear
before it goes in. It is not a second copy of the palette — when a number here
disagrees with `theme.ts`, `theme.ts` is right and this page is stale.

The one rule under all of it: **no component defines a color, font or size of
its own.** A literal hex outside `theme.ts` is a bug. See
[codebase structure](codebase-structure.md#the-rules).

## The four surfaces

Every pixel in the product is on one of four surfaces, and which one it is
decides what may be written on it.

| Surface    | What it is                                                 | Where                                                                | Token                              |
| ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| **Field**  | The deep violet everything is rendered on                  | Behind every page, marketing and application both                    | `brand.field`                      |
| **Chrome** | The rail and the top bar, black, one surface in two pieces | Behind the login only                                                | `brand.chrome`, `brand.chromeRail` |
| **Card**   | White paper laid on the field                              | Dashboard cards, pricing plans, the menus and the notification panel | `brand.card`                       |
| **Panel**  | A violet panel raised off the field                        | The sign-in dialog, and whatever follows it                          | `brand.panel`                      |

The field is violet and the chrome is black, and everything on both of them is
one dark room with white paper laid about in it. The chrome holding no color
at all is the end of a direction this app has been walking: the rail was the
accent, then the field's own violet, and it is now the only surface in the
product with no hue in it. Nothing is drawn in a fifth color to mean "this is
different" — it goes on card paper, or it goes on the field.

### The chrome

The rail down the left edge and the bar across the top used to be two surfaces
— the rail painted in the accent, the bar in the card's paper — and then one
surface in the field's violet. They are **black** now:

- both pieces are flat `#000000`, so they meet at the corner in one color and
  stay one color edge to edge;
- the rail used to fade to `violet[950]` as it fell, which was how it pulled
  below the field by the foot of the window. There is nothing below black to
  fall to, so the fade is gone and `brand.chromeRail` is a color rather than
  a gradient;
- both carry a `brand.chromeEdge` hairline on the side the field is on: black
  and the field's violet are 1.2:1 apart, so the two run together without it.
  The hairline is the only thing separating them.

The point of taking the color out of the chrome is that **the only lit thing
in it is the page you are on.**

## Ink

| On                | First thing read          | Quieter                            |
| ----------------- | ------------------------- | ---------------------------------- |
| Field             | `text.primary` white      | `text.secondary` `#bda7d6`         |
| Chrome            | `brand.chromeInk` white   | `brand.chromeLabel` white at 66%   |
| Card              | `brand.cardInk` `#1f0538` | `brand.cardInkMuted` `#6a5581`     |
| Panel             | white                     | `brand.navText` `#d7c6ec`          |
| The accent's fade | white                     | `brand.onAccentLabel` white at 62% |

The quieter ink is never a gray of its own on the dark surfaces — it is the
same white held back, which keeps it the surface's own color as the surface
changes underneath it.

## The accent, and what wears it

The accent is a magenta-to-violet fade, `brand.buttonGradient`. It marks the
one thing on a surface that is being offered, and it is spent quickly: two of
them in view means neither is the accent.

It is allowed on:

- **contained buttons** — every one of them, everywhere;
- **the page you are on** in the rail, as `brand.chromeSelected`;
- **the notification panel's heading**, which is the one card whose head is
  painted rather than written.

`brand.chromeSelected` is the button's fade with its magenta end taken down one
step — see [contrast](#contrast) for why it is not the same constant.

The logo is the one thing wearing a fade that is not the accent's:
`brand.logoGradient`, a lighter magenta-to-violet pair, painted through the
word with `background-clip: text` and given to the mark beside it as
`brand.logoMark`. Neither token is reached for outside `src/logo`, which is
the only place the logo is drawn — the marketing header and the rail both
render `<Logo>`, because a logo that changes either side of a login is two
logos. The word is text in the display face rather than artwork, so it is
selectable, read aloud, and still the logo at any size; the mark beside it is
a vector from `shared/icons` and takes its size and color as props.

## Teal, and faces

`teal` `#1f9fb5` is the charts' third series and the fade a person's face is
drawn on (`brand.avatarGradient`, in `avatar/`). A face is deliberately neither
the accent nor card paper: an avatar that wore the button's fade was one more
magenta circle in a bar that already had a bell and a button in it.

`brand.toastSuccess` is the third thing in it: the toast a page throws when
something it was asked to do was done. It is `tealLit` rather than `teal`,
because a sentence in white needs 4.5:1 — see [contrast](#contrast).

Teal is not a second accent. Nothing is offered in it, nothing is selected in
it, and no button is painted with it. A toast is not an offer: it says what
happened, and the pink one beside it (`brand.toastFailure`, `accentPill`) is
not the accent being spent either.

## Contrast

The floor is **4.5:1 for text**, **3:1 for something drawn rather than
written** — an icon, a rule, a pill under a label. Large text (≥18.66px bold,
≥24px otherwise) may sit at 3:1, but nothing in this app relies on that, which
is on purpose: a size that changes with the viewport is not a contrast
argument.

Measured, against the surface each sits on:

| What                                           | Ratio         |
| ---------------------------------------------- | ------------- |
| White on the chrome (black)                    | 21:1          |
| `chromeLabel` on the chrome                    | 8.8:1         |
| White on the selected pill, magenta end        | 4.8:1         |
| White on the selected pill, violet end         | 5.4:1         |
| The selected pill against the chrome           | 4.4:1 / 3.9:1 |
| White initials, light end of the avatar's fade | 4.7:1         |
| White initials, deep end of the avatar's fade  | 7.3:1         |
| White on the teal toast (`toastSuccess`)       | 4.7:1         |
| White on the pink toast (`toastFailure`)       | 4.8:1         |
| The logo's fade on the chrome, both ends       | 6.5:1 / 5.7:1 |
| The logo's fade on the field, both ends        | 5.3:1 / 4.7:1 |
| `cardInk` on card paper                        | 18.5:1        |
| `cardInkMuted` on card paper                   | 6.5:1         |

Three constants in the theme exist only because of this table, and each says so
where it is defined:

- **`accentPill` `#d1258f`.** A nav item is written at 0.92rem, which needs
  4.5:1. The button's own `accentStrong` gives white 4.1:1 there, so the pill's
  fade starts one step deeper. The button keeps `accentStrong`: a contained
  button's label is heavier and larger, and the pair still reads as one family.
  Against black the pill reads brighter than it did on the violet — 4.4:1 and
  3.9:1 at its two ends, against 3.6:1 before — which is what taking the color
  out of the chrome buys.
- **`tealLit` / `tealDeep`.** White on `teal` itself is 3.1:1. The initials
  inside an avatar are white, so the fade is drawn between the same hue taken
  down to 4.7:1 and to 7.3:1 instead, and the letters clear the floor at both
  ends and everywhere between.
- **`amber` `#c77b14`.** The mock-up's `#f5a623` is 2.0:1 against card paper
  and unreadable; this is the same hue taken down until it is 3.4:1, which is
  what a white glyph on a disc needs.

A fade is checked at **both ends**, because the text crosses all of it. The
worst end is the number that counts.

Checking a pair before it goes in:

```sh
node -e '
const hex=h=>h.replace("#","").match(/../g).map(x=>parseInt(x,16));
const lin=c=>(c/=255)<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4);
const L=h=>{const[r,g,b]=hex(h);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const[a,b]=process.argv.slice(1),[x,y]=[L(a),L(b)].sort((m,n)=>n-m);
console.log(((x+0.05)/(y+0.05)).toFixed(2)+":1")' "#ffffff" "#d1258f"
```

Translucent ink is blended against its surface first — `rgba(255,255,255,0.66)`
is not a color until you know what is behind it, and on the two ends of the
rail it is two different ones.

## Color-blind separation

The charts' three series — `accentStrong`, `accentDeep`, `teal` — are checked
for separation under protanopia as well as for contrast; the worst adjacent
pair is 11.4 apart against a floor of 8. They are assigned in that order and
never cycled. **A fourth series is not a fourth hue, it is a different chart.**

The same thinking is why the notification tints are named for what a
notification is _about_ (`task`, `reward`, `commerce`, `message`, `people`,
`alert`, `general`) rather than for their colors, and why each of them carries
an icon as well as a color. Nothing in this product is said in color alone.

## Type

| Role                                                                | Face                                               |
| ------------------------------------------------------------------- | -------------------------------------------------- |
| Headings (`h1`, `h2`), logo, buttons, nav pills, segmented controls | Playfair Display, italic where the mock-up sets it |
| Everything else                                                     | Inter                                              |

Buttons are `textTransform: "none"` with normal tracking — Material tracks them
wide and the mock-up does not. The only uppercase in the app is the rail's
group headings at 0.68rem with 0.12em tracking, which are labels rather than
words to be read.

Sizes come from the theme's typography scale or from `sx` in rem. The page's
headings use `clamp()` so they answer the viewport rather than a breakpoint.

## Shape

- **999px** — anything pill-shaped: buttons, inputs, nav items, segmented
  controls, chips.
- **12px** (`shape.borderRadius`) — cards, menus, panels, the notification
  panel.
- **20px** — dialogs, which are the largest raised thing in the app.
- **2px `brand.cardEdge`** — the border round white paper on the field.
- **1px `brand.cardRule` / `brand.chromeEdge`** — hairlines inside card paper,
  and at the chrome's outer edges.

Motion is 150ms ease and nothing longer: a hover lifts a button 1px, the pill
under a nav item changes color, a dialog fades. Nothing slides in from
off-screen.

## Spacing

`brand.gutter` — `clamp(1.25rem, 4vw, 3.5rem)` — is the side margin for the
marketing pages and everything in `MuiContainer`. Behind the login the main
column is padded `1.1rem` / `1.4rem` / `1.75rem` at `xs` / `sm` / `md`, because
the rail is already holding one gutter's worth of the window.

## Adding to the palette

1. Put the constant in `theme.ts`, near the others it belongs with, with a
   comment saying what it is _for_ — not what color it is. The file is read
   top to bottom by whoever comes next.
2. Measure it against the surface it will sit on and put the number in the
   comment. If it does not clear the floor, take the hue down until it does
   rather than picking a different hue.
3. Add it to the `brand` object; the module augmentation under it types
   `theme.palette.brand.<x>` everywhere.
4. Name it for its role — `chromeLabel`, `cardInkMuted`, `noticeTints.commerce`
   — never for its color. A token named `purple2` cannot be repainted.
5. Add a row here if it is a surface, an ink, or a number in the contrast
   table.

See [extending the theme](codebase-structure.md#extending-the-theme).
