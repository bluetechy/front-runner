# Front Runner Widget SDK

Renders a Front Runner widget in a React application. An id goes in, a banner
comes out, and the widget can be changed afterwards without touching the site
it is on.

```jsx
import { Widget } from "@front-runner/widget-sdk";

<Widget
  endpoint="https://api.frontrunner.example"
  widgetId="w_8f2c19a0b4d7e6f1c3a5b7d9e1f3a5b7"
  context={{ "cart.total": 50 }}
/>;
```

That is the whole integration. The component fetches the widget's definition,
validated and published elsewhere, and draws it.

## What this package is, and is not

It is a **renderer**. Its input is a JSON document describing a widget in a
fixed vocabulary of eight elements, and its output is ordinary DOM: a
`<button>` is a button, a sentence is a `<p>`, a countdown is a `<time>`. It
holds no editor, no canvas of draggable boxes, and no way to write a definition.

It is deliberately **not** a widget that carries behavior. A definition cannot
contain JavaScript, CSS or HTML, because there is no element type or property in
the language that would hold any: an author chooses from `navigate`,
`trackEvent` and `copyText`, and this package performs them. That is the
property the whole platform is built on, and it is why a widget written by a
model can be put on a customer's storefront at all.

Read [the widget schema](docs/widget-schema.md) for the language itself, which
is the document an author writes and the contract this package renders.

## Installing it

It is a workspace member today and is not published:

```sh
npm install --workspace <your app> @front-runner/widget-sdk
```

`react` and `react-dom` are peer dependencies (18 or newer) and are the only
dependencies of any kind. Nothing else is bundled, no stylesheet is shipped, and
no CSS class name is defined: a widget is styled with inline styles so that
nothing in it can be reached by the host page's selectors and nothing it sets
can leak out. It drops into an MUI application, a shadcn/ui application, a
Tailwind application or a page with no design system at all, and looks the same
in each.

Publishing it to npm is waiting on the registry scope: see
[docs/TODO.md](../../docs/TODO.md). The license it ships under is settled and is
in [LICENSE.md](LICENSE.md).

## The two components

### `<Widget>`

Fetches by id and renders.

| Prop       | What it is                                                                 |
| ---------- | -------------------------------------------------------------------------- |
| `endpoint` | The base address of the API. No path: the path is this package's business. |
| `widgetId` | `w_` and 32 hex characters, as the studio minted it.                       |
| `context`  | What the page knows: `{ "cart.total": 50 }`. Read by `{{placeholders}}`.   |
| `loading`  | Drawn while the definition is on its way. Nothing by default.              |
| `error`    | Drawn when it cannot be fetched, given the reason. Nothing by default.     |
| `onError`  | Told the reason, for the developer rather than the viewer.                 |
| `onLoad`   | Told which version rendered.                                               |
| `onEvent`  | Told about every click the widget reports.                                 |

**`loading` and `error` draw nothing unless you ask.** A widget that cannot load
is a decoration missing from a page that is otherwise working: showing a shopper
`403 Forbidden` where a banner was meant to be is worse than showing them the
page without the banner. Use `onError` to find out, and leave `error` alone in
production.

### `<WidgetView>`

The same rendering, from a definition you already hold. No network. Use it for a
preview, for a server-rendered page that fetched the document itself, and in
tests.

```jsx
import { WidgetView, fetchWidget } from "@front-runner/widget-sdk";

const { definition } = await fetchWidget(endpoint, widgetId);
<WidgetView definition={definition} />;
```

## What the host page tells the widget

One flat object of strings and numbers, and the reason it is flat is that a
nested context would need a path resolver over host data, which is the kind of
code that ends up reaching `__proto__`.

```jsx
<Widget
  widgetId="w_…"
  endpoint="…"
  context={{ "cart.total": 50, tier: "Gold" }}
/>
```

A definition then reads them in two places: `{{cart.total}}` anywhere text is
written, and a progress bar's `source`. A key the page has not supplied renders
as a gap rather than as `{{cart.total}}`, so a widget on a page whose cart has
not loaded reads as a sentence with a hole in it rather than as a template
somebody forgot to render.

Values are always rendered as text. There is no `dangerouslySetInnerHTML`
anywhere in this package, so a context value containing markup appears as its
own characters.

## Events

Nothing is reported anywhere unless the page asks for it. A widget that phoned
home from inside a customer's page without their having asked is a widget their
privacy review removes.

```jsx
<Widget
  widgetId="w_…"
  endpoint="…"
  onEvent={(event) => analytics.track(event.name ?? event.action, event)}
/>
```

| Field                | What it is                                             |
| -------------------- | ------------------------------------------------------ |
| `type`               | `"click"`. A view event belongs here and is not built. |
| `nodeId`             | The element's own id from the definition.              |
| `action`             | `navigate`, `trackEvent` or `copyText`.                |
| `name`, `properties` | What a `trackEvent` carried.                           |

Analytics inside the platform is the next thing this package grows, and this
shape is the seam it grows into. It is part of the contract today so that it
does not change when that happens.

## Why it cannot be rendered on any page that asks

A widget's definition names the origins it may be rendered from, and the API
refuses a request from anywhere else:

```json
{ "delivery": { "allowedOrigins": ["https://shop.northwind.test"] } }
```

Exact origins: scheme, host and port, no wildcards. `evil-northwind.test` ends
with the same characters as `northwind.test`, and a suffix rule is how that gets
through. A widget listing nothing may be rendered from nowhere.

A widget also has to be **published**. Saving a definition writes a draft that
nobody is served, so a widget that has only been saved answers the same "no
widget with that id is published" as an id that does not exist.

The failure this causes in development is worth knowing before it happens: the
browser refuses the response and reports "Failed to fetch" with nothing in it
about origins. The SDK's error message says so, and the API answers 403 with a
sentence a person can read, which is what you see with `curl`.

## Accessibility

It is not an afterthought in the schema: `image.alt` and `hotspot.label` are
**required properties**, because the author is the only person who knows what a
picture shows or what a transparent click region is for, and a hotspot is often
the only way into whatever the artwork is advertising.

What the renderer does with the rest:

- semantic elements throughout, so a screen reader and the browser's own find
  both work;
- a countdown announces its deadline once and is not a live region, because a
  politely announced update every second is a screen reader nobody can use to
  read the rest of the page;
- a progress bar carries both a sentence and the ARIA values, because the bar
  has no words and the sentence has no position;
- `prefers-reduced-motion` turns the entrance animations off and draws no
  particles at all;
- the one canvas element is `aria-hidden` and ignores pointer events, so the
  widget reads and behaves the same with it and without it.

## Checks

```sh
npm run test --workspace @front-runner/widget-sdk
npm run lint --workspace @front-runner/widget-sdk       # tsc
npm run build --workspace @front-runner/widget-sdk      # tsc into dist
```

One test file beside every source file, which is
[the practice this repository keeps](../../docs/testing.md). What the tests
cannot answer is whether a widget _looks_ right: jsdom draws no pixels. That is
what [client-gui](../../apps/client-gui/README.md) is for.

## License

Proprietary. Copyright 2026 Front Runner, LLC. All rights reserved.

You may use the SDK inside your own application and distribute it as part of
that application; you may not modify it, fork it, or distribute it on its own.
Bundling, minifying and compiling it as part of an ordinary build is use rather
than modification, and is expressly permitted. The full terms are in
[LICENSE.md](LICENSE.md), and installing or using the SDK accepts them.
