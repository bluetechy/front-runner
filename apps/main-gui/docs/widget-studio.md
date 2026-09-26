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

## The page

Three fields, a button and a list.

| Field      | What it is                                               |
| ---------- | -------------------------------------------------------- |
| Name       | What the widget is called. Never rendered in the widget. |
| Widget id  | Empty to create; filled to add a version to that widget. |
| Definition | The JSON, in a monospace box with spell-check off.       |

The box starts with a working example: a Black Friday banner with a headline, a
countdown and a button, listing `http://localhost:5174` as its allowed origin,
which is [client-gui](../../client-gui/README.md)'s address. Pressing Save
without touching it publishes a real widget, which is the fastest way to see the
whole path end to end. A page whose one control is an empty text area does not
say what it wants.

Under the list, **Save over** takes a widget's id and its name, and deliberately
**not** its definition. Reading the definition back would mean a second answer to
"what is on the screen": the box would hold version 4 while the list said 5, and
a save would quietly write whichever the page happened to be holding. Choosing a
widget here means "save over this one", and what gets saved is what is in the
box. Editing an existing definition properly is a read of it and a diff, which is
the builder's job.

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
  widget-studio.tsx   the page: the fields, the save, the toast
  widget-list.tsx     the saved widgets, their ids and their versions
  problem-list.tsx    what was wrong with the document
  widgets-api.ts      the query and the mutation, through TanStack Query
  index.ts            the page, and nothing else
```

It reads the API through the shared [`graphql/`](codebase-structure.md) vertical
rather than a fetch of its own. That vertical exists because of this page: the
plan written down in codebase structure was that the three copies of the GraphQL
call become one when a second slice moved onto TanStack Query, and this is that
second slice.

`problemsIn` lives beside the queries rather than in the page, because splitting
the API's joined message is a fact about the API's contract rather than about the
layout.

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

- **The builder.** A canvas, elements to drop, a properties panel, a live
  preview. This page's `<WidgetView>` neighbor in the SDK already renders a
  definition without saving it, which is the preview half.
- **Reading a definition back.** The page can save over a widget but cannot open
  one. It wants the API to expose a version's document, and it wants a diff
  before it overwrites anything.
- **Versions and rollback.** The list says which version is being served and
  nothing about the ones before it.
- **A preview beside the box.** The SDK can draw a pasted document with no round
  trip at all, so this is a component and a debounce rather than a design.
- **Translation of the example.** The interface is translated; the example
  document in the box is not, because a widget's own copy is the author's and not
  the product's.
