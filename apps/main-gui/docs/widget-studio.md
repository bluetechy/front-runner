# The widget studio

`/widgets`, **Site Widgets** in the rail, under Dashboard. Where a widget
definition is pasted in, saved, and given the id that puts it on a website.

It is one text box, and that is the whole of the authoring surface today.

## Why a text box

The builder this becomes is a canvas, a palette of elements, a properties panel
and a preview, and it is a larger page than anything else in this application.
What it needs underneath it is a language, a validator, a store, a delivery
endpoint and a runtime that can draw the result. So the first version of the
authoring surface is the smallest one that exercises all five: paste a document,
save it, read the id, render it somewhere that is not this application.

What that buys, beyond the shortcut, is that the format is usable by anything
that can produce JSON. A model writing a definition, a script generating fifty of
them and a person typing one by hand all reach the product the same way, and the
builder becomes one client of a contract rather than the only one.

## Three things, kept apart

The page's real job is that it never lets these blur into each other:

```text
the box        what somebody is editing right now. Nobody is served it.
the draft      the last thing saved. Nobody is served that either.
the published  what browsers get, until somebody says otherwise.
```

So **Save draft** and **Publish the draft** are two buttons. A page with one
would be a page where fixing a typo puts it on every customer's storefront the
moment it is saved, which is the behavior this whole lifecycle exists to stop.
After a save the toast says which version is _actually_ live, because "saved" on
its own is the sentence somebody reads as "shipped".

**Rollback is not a button.** It is Publish on an older row of the history, and
Open beside it is what makes that safe: the version can be read in the box before
it goes in front of anybody.

## The page

| Field      | What it is                                                |
| ---------- | --------------------------------------------------------- |
| Name       | What the widget is called. Never rendered in the widget.  |
| Widget id  | Empty to create; filled to save a draft over that widget. |
| Definition | The JSON, in a monospace box with spell-check off.        |

The box starts with a working example: a Black Friday banner with a headline, a
countdown and a button, listing `http://localhost:5174` as its allowed origin,
which is [client-gui](../../client-gui/README.md)'s address. Save it and publish
it without touching it and a real widget is live on a real id, which is the
fastest way to see the whole path end to end. A page whose one control is an
empty text area does not say what it wants.

Under it, **Preview** draws whatever is in the box with the runtime a customer
embeds, and **History** lists every version once a widget is open.

### Opening a widget

**Open** on a row of the list, or on a row of the history, puts the stored
definition in the box along with its name and id, and the page remembers which
version it came from.

That number is the point. It goes back with the next save, and the API refuses
the save if the draft has moved since: two tabs, or two people, cannot write
over each other without one of them being told. Typing an id by hand instead
clears it, because an id somebody typed is not a version anybody read.

This replaced a "save over" that took the id and the name and deliberately left
the box alone. That was the honest thing to offer before a definition could be
read back: the page would otherwise have been holding one document and writing
over another.

## The refusal is the page

Almost everything the page does is about what happens when the API says no,
because a pasted document is wrong the first few times and that loop is the whole
experience of using this.

The API answers with **every** problem at once, each naming its place in the
document, joined with `"; "`. The page does two things with that:

- the **toast** says the first problem, because a toast holding eight sentences
  is a toast nobody can read to the end of before it disappears;
- the **panel under the box** lists all of them, in monospace, and stays there.

```text
root.children[0].value: must be string
canvas.width: is required
delivery.allowedOrigins[1]: must be an exact origin, like https://shop.northwind.test
```

The panel is an `Alert` rather than red text, so it is announced as an alert and
carries an icon as well as a color: nothing in this product is said in color
alone. It is a real list, so a screen reader says how many problems there are
before reading them, which is the first thing somebody wants to know. The box
points at it with `aria-describedby` while there is something in it.

Splitting on `"; "` is reading a contract rather than guessing: main-api's
[widgets documentation](../../main-api/docs/widgets.md#validation-the-guardrail-layer)
says the API joins them that way, and the two ends are tested against the same
shape.

**The browser does not validate the document.** There is one authority for what a
valid widget is and it is not in this bundle: a copy of the JSON Schema and Ajv
here would be a second opinion to keep in step, and the round trip is fast enough
that nothing is gained by guessing the answer sooner. What the page does check is
that there is a name and something in the box.

## The list, and why the id is on the screen in full

A widget id is random by design: it is served to pages that carry no token, so it
has to be unguessable. The cost of that is a widget whose id has been lost can
still be served forever and can never be found again, so the list is the only way
back to one.

So each id is on the screen in full, in monospace, wrapping rather than
truncated. An id with an ellipsis in the middle of it is an id nobody can read
out or check against a page's source. **Copy id** puts it on the clipboard, and
is best effort on purpose: the clipboard needs a permission and a secure context,
and a copy that quietly failed is not worth an error on a page where the id is
already legible.

## How it is built

```text
src/widget-studio/
  widget-studio.tsx   the page: the fields, the lifecycle, the toast
  widget-preview.tsx  what is in the box, drawn with the customer's runtime
  version-list.tsx    the history, where rolling back lives
  widget-list.tsx     the saved widgets, their ids and where each one stands
  problem-list.tsx    what was wrong with the document
  example.ts          the document the box starts on
  widgets-api.ts      the queries and mutations, through TanStack Query
  index.ts            the page, and nothing else
```

It reads the API through the shared [`graphql/`](codebase-structure.md) vertical
rather than a fetch of its own. That vertical exists because of this page: the
plan written down in codebase structure was that the three copies of the GraphQL
call become one when a second slice moved onto TanStack Query, and this is that
second slice.

Two decisions in `widgets-api.ts` are worth knowing before changing it:

- **Opening is a function, not a query.** A query with a key would refetch on
  its own, and a definition that refetched would take an edit away from whoever
  was making it. It still goes through the cache, so nothing is asked for twice.
- **A numbered version is cached forever and the draft is never cached.**
  Versions are appended and never overwritten, so version 3 is the same document
  for the rest of time; the draft moves every time anybody saves. That is one
  line, `staleTime`, and it is the difference between comparing two old versions
  cheaply and re-reading a draft that somebody else has just changed.

## The preview

It renders with `WidgetView` out of `packages/widget-sdk`, which is the
component `<Widget>` uses once it has fetched a definition. **So the preview is
not an approximation of the widget: it is the widget**, minus the fetch. The gap
a mock-up would leave is exactly where surprises live, and there is no gap.

Three things it deliberately does not do:

- **It does not validate.** The API's schema is the only authority on what a
  valid widget is, and a copy of Ajv in this bundle would be a second one to
  keep in step. The preview draws what the runtime can draw and says nothing
  about whether it would be accepted; Save is what asks.
- **It does not navigate.** A click on a button in the preview goes nowhere,
  because a preview that navigated would take the unsaved document with it.
- **It does not blink.** While somebody is typing, the last document that could
  be drawn stays on the screen, since most keystrokes in the middle of an edit
  leave the JSON unparseable.

What it _does_ check is whether what is in the box can be handed to the runtime
at all: a half-typed document with no `root` would throw inside somebody else's
component. That guard is in `widget-preview.tsx` rather than in the SDK, because
the SDK's contract is that it is handed a validated definition and this is the
one caller in the product knowingly handing it something else.

## Looking at it

jsdom draws no pixels, so the tests cannot say whether the page reads well. The
way to see it is the one [docs/testing.md](../../../docs/testing.md) sets out:
bring the stack up, log in, go to `/widgets`. The states worth looking at are the
empty list, a document with six problems in it, and a save that worked.

The other half of looking at it is not this page at all. A widget saved here is
meant to be drawn somewhere else, and
[client-gui](../../client-gui/README.md) is where that is checked, on an origin
that is not this application's.

## What is not here yet

- **The builder.** A canvas, elements to drop, a properties panel. The preview
  is half of it already.
- **A diff.** The history says what there is and any version can be opened, but
  nothing compares two, so "what changed in 4" is read by eye.
- **Editing anything but JSON.** The box is the authoring surface; the schema is
  the thing a builder would be built against.
- **Translation of the example.** The interface is translated; the example
  document is not, because a widget's own copy belongs to whoever writes the
  widget.
