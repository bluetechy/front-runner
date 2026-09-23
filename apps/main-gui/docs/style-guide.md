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

| Surface    | What it is                                                 | Where                                                                              | Token                              |
| ---------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------- |
| **Field**  | The deep violet everything is rendered on                  | Behind every page, marketing and application both                                  | `brand.field`                      |
| **Chrome** | The rail and the top bar, black, one surface in two pieces | Behind the login only                                                              | `brand.chrome`, `brand.chromeRail` |
| **Card**   | White paper laid on the field                              | Dashboard cards, pricing plans, the menus and the notification panel               | `brand.card`                       |
| **Panel**  | A violet panel raised off the field                        | The sign-in dialog, the cookie box at the foot of every page, and whatever follows | `brand.panel`                      |

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

### The box at the foot of the page

The cookie notice is the panel used as a band rather than as a card: the same
`brand.panel`, the same `brand.panelEdge` hairline, the same `brand.panelGlow`
under it, fixed across the foot of the window and full bleed, so it is the one
raised surface in the app with square corners. Its contents sit in a
`MuiContainer`, which is what keeps it on `brand.gutter` with every page above
it.

It is worth knowing what actually separates it from the page. **The panel and
the field are 1.04:1 to 1.12:1 apart**, depending on where down the gradient
the window ends, and the hairline along its top is 1.22:1 to 1.52:1. Neither
of those is a boundary anybody can see. What reads as an edge is
`panelGlow`, the shadow, and the fact that the bar is flat where the field
behind it is lit. That is enough here because the bar is the full width of the
window and carries a heading, and it is the reason this surface is not used
for anything smaller laid straight on the field.

Once the box has been answered it is replaced by a pill in the same palette:
panel, panel edge, `brand.navText` for the label, and the 999px radius every
other pill in the app has. See
[the cookie notice](cookie-consent.md#how-it-is-drawn).

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

## Text boxes

**A box is drawn against its own fill rather than against the surface behind
it:** dark ink around white paper, white held back around a dark hollow. A
field drawn in the surface's own hairline is a box you have to go looking for,
and every field in the app was drawn that way at least once. The contact
form's were the first to be fixed, and the rule is theirs.

Two constants per surface, so no field names a color of its own:

| Where                                                    | Fill               | Edge (ratio)                 | Under the pointer                  |
| -------------------------------------------------------- | ------------------ | ---------------------------- | ---------------------------------- |
| The dark panel: the sign-in dialog, the wallet's dialogs | `brand.inputField` | `brand.fieldEdge`, 4.0:1     | `brand.fieldEdgeHover`, white      |
| Card paper: the profile, the contact form, the addresses | `brand.card`       | `brand.cardFieldEdge`, 6.5:1 | `brand.cardFieldEdgeHover`, 18.5:1 |

An edge is drawn rather than written, so its floor is 3:1, and both clear it
with room. The pointer deepens the edge rather than changing it for another
color, except on a read-only field, where nothing deepens: the hover is the
invitation to type.

**The placeholder is text and takes the text floor.** `placeholder` `#a68fc0`
is 4.9:1 on the dark hollow; the mock-up's own violet was 4.3:1 and is the hue
this one was taken up from. On card paper a placeholder is
`brand.cardInkMuted`, 6.5:1. The dark palette's is 3.2:1 there and unreadable.
A placeholder is the shape of what goes in the field, never what the field is:
that is the label's job, and the theme puts labels above the control.

**The top bar's search field is card paper.** It used to be a hollow in the
chrome at white 8%, which is a white box drawn on black by being slightly less
black. It is now the same paper, the same ink and the same edge as every other
field in the app, which is the one place the rule is visible as a change of
surface rather than a change of border.

## Switches

Material draws a switch for a dark surface: a track at white 30% and a thumb
barely off white. On card paper that is a control you have to already know is
there, and **off** is the state that shows least of all, because it is the one
nothing is drawn in.

So a switch on card paper takes three constants, the same way a text box takes
two:

| Part              | Token                     | Ratio               |
| ----------------- | ------------------------- | ------------------- |
| The track, off    | `brand.cardSwitchTrack`   | 3.6:1 on card paper |
| The track, on     | `brand.cardSwitchTrackOn` | 4.1:1 on card paper |
| The thumb, either | `brand.cardSwitchThumb`   | the paper itself    |

The thumb is the paper, so what says which end the switch is at is the thumb
against the **track**, not against the card: 3.6:1 off and 4.1:1 on, both above
the 3:1 something drawn rather than written needs. On is the accent, the same
pink `primary.main` checks a radio in, because a switch that is on is a setting
this account has taken up.

A switch still says its state in a word beside it. Nothing in this product is
said in color alone, and position is not a word.

## The accent, and what wears it

The accent is a magenta-to-violet fade, `brand.buttonGradient`. It marks the
one thing on a surface that is being offered, and it is spent quickly: two of
them in view means neither is the accent. A row of pricing cards is the one
place that reads as more than one accent at a time, and it is not: each card
is its own surface with one offer on it, and which plan is being pushed is
said by that card's paper and its badge rather than by its button.

It is allowed on:

- **contained buttons** — every one of them, everywhere;
- **the page you are on** in the rail, as `brand.chromeSelected`;
- **the notification panel's heading**, which is the one card whose head is
  painted rather than written;
- **the "most popular" badge** on the pricing page, as `brand.cardBadge`.

**And it is forbidden on either answer in the cookie box.** That is the one
place in this product where what a thing is painted is settled by something
other than taste: **Reject all** and **Accept all** are the same outlined
button twice, and painting one of them is the nudge that makes a consent
unfree. A contained button in that box would be a design decision that a
regulator reads as a dark pattern, so the only contained button in it is
**Save my choices**, which is neither answer. See
[the cookie notice](cookie-consent.md).

`brand.chromeSelected` and `brand.cardBadge` are one constant: the button's
fade with its magenta end taken down one step — see [contrast](#contrast) for
why it is not the same fade a button takes. Both are small white text on the
accent, which is the whole reason that step exists.

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

`brand.statusPills.settled` is the fourth: the pill a row wears to say that
whatever it was waiting for has happened: **Verified**, on the security page's
address table. It is `tealDeep` on the same teal at 12%, because the word is
0.7rem and is read on card paper rather than on the color itself.

Teal is not a second accent. Nothing is offered in it, nothing is selected in
it, and no button is painted with it. A toast is not an offer: it says what
happened, and the pink beside it (`brand.toastFailure`, and
`brand.statusPills.waiting` on a row still waiting on somebody) is not the
accent being spent either. **A status is a word first**: the pill
carries **Verified** or **Unverified**, and the color only agrees with it.

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
| Card paper against the chrome (the search box) | 21:1          |
| `fieldEdge` on the dark field                  | 4.0:1         |
| `cardFieldEdge` on card paper                  | 6.5:1         |
| `placeholder` on the dark field                | 4.9:1         |
| `cardSwitchTrack` on card paper                | 3.6:1         |
| `cardSwitchTrackOn` on card paper              | 4.1:1         |
| **Verified** on its own teal tint              | 6.4:1         |
| **Unverified** on its own pink tint            | 4.8:1         |
| White on the panel                             | 16.5:1        |
| `text.secondary` on the panel                  | 7.6:1         |
| An outlined button's label on the panel        | 9.1:1         |
| `primary.light` as a link on the panel         | 4.9:1         |
| `navText` on the panel (the cookie pill)       | 10.4:1        |
| An outlined button's border on the panel       | 2.8:1         |

Six constants in the theme exist only because of this table, and each says so
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
- **`cardSwitchTrack` `#8f829c`.** The card's own ink taken halfway to the
  paper. Material's off track is white at 30%, which on white paper is nothing
  at all; this is the same ink at the point it reaches 3.6:1, which is what a
  track and the white thumb on it both need.
- **`amber` `#c77b14`.** The mock-up's `#f5a623` is 2.0:1 against card paper
  and unreadable; this is the same hue taken down until it is 3.4:1, which is
  what a white glyph on a disc needs.
- **`accentPillInk` `#c21f84`.** A status pill is the accent laid on card
  paper at 12% with a 0.7rem word written on it. `accentPill` is 4.2:1 there,
  so the pill's word is the same hue taken down one step further, at 4.8:1.
  The nav pill keeps `accentPill`: it is white on the accent rather than the
  accent on white, which is the other direction entirely.
- **`placeholder` `#a68fc0`.** The mock-up's violet is 4.3:1 on the field it
  sits in. This is the same hue taken **up** until it cleared, at 4.9:1: the
  only one of these that moved that way, because a placeholder is quiet ink on
  a dark surface rather than color on a light one.

**The last row is under the floor, and it is the oldest number on this page.**
An outlined button's border is `rgba(227, 79, 196, 0.65)`, which comes out at
2.8:1 on the panel against the 3:1 something drawn rather than written needs.
It has been that since the sign-in dialog's three social buttons, and it is
noted here rather than in passing because the cookie box made it matter more:
two outlined buttons there are the whole of somebody's choice. What carries
those controls today is their labels, at 9.1:1, which is well clear. Taking
the border to `0.70` gives 3.06:1 and clears it, and that is one constant in
`theme.ts` changing every outlined button in the app at once, so it is written
down as a decision to make rather than made quietly here. See
[what is left](../../../docs/privacy-follow-ups.md).

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

- **999px** — anything pill-shaped: buttons, the fields on the dark panel, nav
  items, segmented controls, chips.
- **0.7rem**: a text box on card paper. A page of pills reads as a page of
  buttons, and a pill could not hold the contact form's five-line message box
  anyway. See [text boxes](#text-boxes).
- **12px** (`shape.borderRadius`) — cards, menus, panels, the notification
  panel.
- **20px** — dialogs, which are the largest raised thing in the app.
- **2px `brand.cardEdge`** — the border round white paper on the field.
- **1px `brand.cardRule` / `brand.chromeEdge`** — hairlines inside card paper,
  and at the chrome's outer edges.

Motion is 150ms ease and nothing longer: a hover lifts a button 1px, the pill
under a nav item changes color, a dialog fades. Nothing slides in from
off-screen.

## Layers

Nothing in this app floated over anything until the cookie box, so what sits
over what is written down here rather than discovered. The numbers are
Material's own `theme.zIndex`, and reaching for a literal is the same kind of
bug a literal hex is.

| What                         | Layer               | Why it is there                                                                                            |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| The page                     | none                |                                                                                                            |
| The rail and the top bar     | `drawer` (1200)     | A permanent drawer takes its own column from `lg` up                                                       |
| The cookie box, and its pill | `drawer + 2` (1202) | The question has to be reachable from every page, and behind the login the rail owns the corner it sits in |
| Dialogs                      | `modal` (1300)      | Including the cookie preferences, which the box opens                                                      |
| The toast                    | `snackbar` (1400)   | It says what happened and then goes                                                                        |

The cookie box is the only thing in the product that deliberately covers the
chrome. It is also the only thing that is allowed to: it is a question that has
to be answered, it is answered once, and it is gone.

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
