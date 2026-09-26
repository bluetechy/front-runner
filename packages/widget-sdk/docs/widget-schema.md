# Widget Schema v1

The language a widget is written in. One JSON document describes a widget; the
API validates it against this schema and refuses anything else; the SDK renders
it. It is the contract between an author, a store, a validator and a renderer,
and the reason there is one document rather than four agreements.

The authority is
[`apps/main-api/src/widgets/widget.schema.ts`](../../../apps/main-api/src/widgets/widget.schema.ts),
which is JSON Schema draft 2020-12. It is served as JSON, unauthenticated, at
`GET /widgets/schema`, so an editor, a customer or a model can read the same
copy the validator uses. This page is that schema in prose, plus the reasoning
that a schema cannot hold.

## The shape of the whole thing

```json
{
  "schemaVersion": "1.0",
  "name": "Black Friday banner",
  "canvas": { "width": 1200, "height": 300, "responsive": true },
  "layout": { "type": "flow" },
  "delivery": { "allowedOrigins": ["https://shop.northwind.test"] },
  "variables": { "cart.total": 0 },
  "root": { "id": "root", "type": "container", "children": [] },
  "metadata": {}
}
```

`schemaVersion`, `canvas` and `root` are required. Everything else is optional,
and a document that sets none of it still renders.

| Field           | What it is                                                              |
| --------------- | ----------------------------------------------------------------------- |
| `schemaVersion` | `"1.0"`, exactly. The version of the _language_, not of the widget.     |
| `name`          | What the author calls it. Never rendered.                               |
| `canvas`        | The width it is designed at, an optional height, and whether it scales. |
| `layout`        | `flow` (the default) or `absolute`.                                     |
| `delivery`      | The origins a browser may render it from.                               |
| `variables`     | Defaults for what the host page supplies.                               |
| `root`          | One container. The tree hangs off it.                                   |
| `metadata`      | The author's own bookkeeping. Carried untouched, read by nothing.       |

**`root` is one container rather than an array of elements.** A tree needs a
trunk, and "a row of two stacked pairs" is a sentence a flat array cannot say.
React renders exactly this shape, which is most of why the format looks like
this.

## Four principles, and what each one refuses

### The vocabulary is semantic, not graphical

An author writes what a thing _is_, never how it is painted:

```json
{
  "type": "button",
  "label": "Buy Now",
  "action": { "type": "navigate", "url": "/checkout" }
}
```

and not a rectangle with text on top of it. That is what lets the renderer
decide that a button should be a `<button>`, which is what makes it focusable,
keyboard-operable and announced as a button without the document knowing any of
those words exist. A schema of rectangles would have made accessibility
something every author had to remember.

### A definition cannot carry behavior

There is no element type, property or action in the language that holds code.
`{"type": "javascript", "code": "…"}` is not refused by a rule: it is refused
because `javascript` is not one of the eight element types, and there is nowhere
in the document for a string of code to go. A URL that tries to be code
(`javascript:`, `data:`) is refused by both a pattern in the schema and a URL
parser in the validator.

This is the property that makes the rest of the platform possible. A widget
written by a model, validated by the API and drawn on a customer's storefront
cannot reach that page, because nothing in the language reaches anything.

### HTML and CSS by default; SVG and canvas only where they earn it

Every element in v1 renders as DOM with inline styles. One element,
`particles`, is painted on a canvas, and the test it passes is written in
[`particles.tsx`](../src/elements/particles.tsx): it is decoration, it carries no
words, nothing interactive is in it, and a hundred moving things are a hundred
style recalculations a frame in HTML and one paint loop on a canvas.

The inverse of that test is why nothing else is on a canvas. A button painted as
pixels is a button whose focus, hit testing, keyboard handling and accessible
name have to be rebuilt by us, badly, in a language the browser already speaks.
Text painted as pixels cannot be selected, found, translated or resized.

### Responsive by default, freeform when asked

`flow` is the default layout and lays containers out with flexbox, so a widget
survives a phone, a sidebar and a 4K monitor without anybody writing three of
them. `absolute` exists for compositions that really are a fixed canvas, and it
is opt-in because a widget built that way stops being responsive the moment it
is chosen. A freeform document must give `canvas.height`: coordinates need a
space to be measured in.

## The elements

Eight of them. The list is the whole vocabulary: an author can compose anything
out of these and cannot invent a ninth.

Every element carries `id` (required, unique in the document, the author's and
stable across edits), and optionally `style`, `size`, `position` and `animation`.

### `container`

The only element with children, and what makes a document composable.

```json
{
  "id": "row",
  "type": "container",
  "layout": {
    "direction": "row",
    "align": "center",
    "justify": "space-between",
    "gap": 24,
    "padding": 32,
    "wrap": false,
    "stackBelow": 640
  },
  "children": []
}
```

`stackBelow` is the one responsive lever a document has: at or below that width
the container lays out as a column whatever `direction` says. The width measured
is the **widget's**, not the window's, because a widget in a 320px sidebar on a
27-inch monitor is narrow and a media query would call it wide.

### `text`

```json
{
  "id": "headline",
  "type": "text",
  "value": "BLACK FRIDAY",
  "variant": "title"
}
```

Renders as a `<p>`. `variant` is `title`, `subtitle`, `body` or `caption`, so a
document need not carry a type scale to look like one thing; `style.fontSize`
wins where a number is really meant. `{{placeholders}}` in `value` are filled
from the host page's context.

### `image`

```json
{
  "id": "logo",
  "type": "image",
  "src": "https://…/logo.png",
  "alt": "Northwind",
  "fit": "contain"
}
```

`alt` is **required**. An image with no alternative text is an image a screen
reader reads the URL of, and the author is the only person who knows what it
shows; decoration says so by passing `""`. Images are lazy and take the declared
size as their dimensions, so a widget below the fold costs nothing until it is
scrolled to and does not shift the page when it lands.

### `button`

```json
{
  "id": "cta",
  "type": "button",
  "label": "SHOP NOW",
  "variant": "primary",
  "action": { "type": "navigate", "url": "/black-friday" }
}
```

A real `<button type="button">`. Not a submit button, because a widget may be
inside somebody's form.

### `hotspot`

A clickable region with nothing drawn in it: the hot area over artwork.

```json
{
  "id": "shoe-region",
  "type": "hotspot",
  "label": "Shop the running shoe",
  "position": { "x": 100, "y": 50 },
  "size": { "width": 300, "height": 200 },
  "action": { "type": "navigate", "url": "/product/123" }
}
```

`label` is **required**, for the same reason `alt` is and more urgently: a
transparent rectangle is nothing at all to anybody not looking at the screen, and
it is often the only way into what the picture is advertising. It is invisible
and it is _not_ hidden; those are different, and `aria-hidden` would be the wrong
one. With no size it fills its container, which is the common case of one link
over one picture.

### `countdown`

```json
{
  "id": "clock",
  "type": "countdown",
  "target": "2026-11-27T00:00:00-07:00",
  "format": "DD:HH:MM:SS",
  "expired": { "behavior": "replace", "text": "THE SALE IS LIVE" }
}
```

The author says _when_; the clock is ours. `target` must carry an offset: a local
time with none is a different moment in every timezone the page is read in, and
the validator refuses one.

The largest unit shown carries the overflow, so a three-day sale in `HH:MM:SS`
reads 72 hours rather than starting again at midnight. `expired` is `zero` (the
default), `hide`, or `replace` with text: what happens at zero is the author's
choice, because a countdown that reaches zero and sits there is the most common
way one of these ends up lying on a page for a month.

### `progressBar`

```json
{
  "id": "shipping",
  "type": "progressBar",
  "source": { "type": "variable", "name": "cart.total" },
  "goal": 75,
  "currency": "USD",
  "messages": {
    "incomplete": "You are {{remaining}} away from free shipping!",
    "complete": "You have unlocked free shipping!"
  }
}
```

The element that turns a widget platform into something more interesting than a
banner generator: "Free shipping over $75" is a picture, and "You are $25 away
from free shipping" is an application. `{{remaining}}`, `{{value}}` and
`{{goal}}` are available in the sentences, formatted as money in the viewer's own
locale when `currency` is given. `source` may instead be a fixed
`{"type": "number", "value": 25}`.

### `particles`

```json
{ "id": "snow", "type": "particles", "effect": "snow", "density": 8 }
```

Decoration, painted on a canvas, `aria-hidden`, and transparent to clicks so a
hotspot underneath it still works. `density` is particles per 10,000 square
pixels and the runtime caps it whatever is asked for: the author chooses the
look, the runtime keeps the cost. Nothing is drawn at all for a viewer who has
asked for reduced motion.

## Actions

Three verbs. The document chooses between them and supplies their arguments; it
never supplies behavior.

| Action       | Fields               | What it does                             |
| ------------ | -------------------- | ---------------------------------------- |
| `navigate`   | `url`, `newTab`      | Goes there. `noopener` on every new tab. |
| `trackEvent` | `name`, `properties` | Reports, and nothing else.               |
| `copyText`   | `text`               | Puts it on the clipboard.                |

A URL may be `https:`, `http:`, `mailto:`, `tel:` or relative. Everything else is
refused, including a protocol-relative `//host` (which reads as a path to anybody
skimming the document) and anything with a control character hidden in it (which
is how `java\nscript:` gets past a check that only reads the first word).

## Style, size, position, animation

`style` holds the ordinary visual properties: `background`, `color`, `fontSize`,
`fontWeight`, `fontFamily`, `textAlign`, `textTransform`, `lineHeight`,
`borderColor`, `borderWidth`, `borderRadius`, `opacity` and `shadow`. Anything
not set keeps the renderer's own default, so a document is a description of what
is wanted rather than a full stylesheet. Colors are passed through as written:
there is no palette to approximate a brand in.

`animation` is one entrance effect played once: `fadeIn`, `slideUp` or `pulse`,
with a `duration` and `delay` in milliseconds. It is not a timeline, because a
widget that moves for as long as somebody is looking at it is a widget they
close, and `prefers-reduced-motion` turns it off.

`position` is `{x, y}` and applies in `absolute` only; in `flow` the container
places things and coordinates are ignored rather than refused, so a document
converted from freeform keeps them harmlessly.

## Delivery: where a widget may be rendered

```json
{
  "delivery": {
    "allowedOrigins": ["https://shop.northwind.test", "http://localhost:5174"]
  }
}
```

Exact origins: scheme, host, and port where there is one. No wildcards, no
suffix matching, no trailing slash (a browser's `Origin` header has none, so an
entry with one would look right in the document and never match anything). The
API echoes the origin back only when it is on this list and refuses the request
with a 403 otherwise. **A widget listing nothing may be rendered from nowhere.**

It lives in the document rather than in a column beside it so that one pasted
document is the whole of what a widget is. The consequence is worth stating:
publishing a new version is also how the allowlist changes.

## What a definition must never hold

A widget's definition is **published content**. It is served without a token, to
a page anybody can open, by a runtime that cannot hold a credential, and it is
cacheable. The unguessable id keeps it from being enumerated and is not
authorization.

So: no API keys, no personal data, no prices that are not already public, no
internal URLs. If a widget needs a private fact, the host page supplies it
through `context` at render time and it never touches our store.

## The bounds

Generous enough that no honest document meets them, small enough that no
document is a denial of service.

| Bound                     | Value      | Why                                                     |
| ------------------------- | ---------- | ------------------------------------------------------- |
| Document size             | 64 KiB     | The same limit the API takes as a request body.         |
| Elements in one document  | 200        | Counting the root.                                      |
| Container nesting         | 10 deep    | Deeper than any real design; shallow enough to be safe. |
| `delivery.allowedOrigins` | 20 entries |                                                         |

Element ids must be unique across the document: two elements with one id is the
failure that only shows up later, when an edit names an element and there are two
of it.

## How a refusal reads

Every problem at once, each naming its place in the notation the document is
written in:

```
root.children[0].value: must be string; canvas.width: is required
```

Not the first problem only, and not Ajv's JSON pointers. A document that has to
be submitted once per mistake is a document nobody finishes, and
`/root/children/0/value` is precise and unreadable. The API joins the sentences
with `"; "`, which is part of the contract: the studio page splits on it to list
them.

## Versioning

`schemaVersion` is the language's; a widget's own version is a number the store
keeps, rising by one on every save. A widget is embedded by an id that never
changes, so an edit is a change to a live page: the store keeps every version so
that one can be looked at, compared and gone back from. The version a page is
serving is on every response, which is what makes a stale cache visible.

The two ends of the contract are deliberately asymmetric about an element type
they do not recognize. **The API refuses one**, so nothing unknown is ever
stored. **The runtime draws one as nothing and carries on**, because the failure
that actually happens in the field is an old copy of the SDK on a customer's page
meeting a document written against a newer schema, and losing one element is the
right outcome where taking their page down is not.

## What is not in v1

Named because a reader will look for them, and because leaving them out was a
decision rather than an oversight.

- **`carousel`, `video`, `form`, `qrCode`, `badge`, `icon`, `shape`.** Each is a
  component and a schema branch, and each one's schema is the interesting part:
  a form implies submission, a destination and validation, which is a design
  rather than an element.
- **Data sources.** A widget reads what the host page hands it; it cannot call an
  API of its own. That keeps a definition from being a fetch nobody reviewed.
- **Conditional rendering.** "Show this only to shoppers with an empty cart"
  needs an expression language, and an expression language is the thin end of
  putting code back in the document. Worth doing carefully rather than soon.
- **A theme or design tokens.** Every document carries its own colors today. A
  palette the platform publishes is a better answer for a customer with a brand,
  and it is a separate schema.
- **Several breakpoints.** `stackBelow` is the one lever, because stacking is
  what nearly every widget needs at a phone's width.
