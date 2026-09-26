# Client GUI

A bare page that renders a published widget the way a customer's website would.
Paste a widget id, press Render, see it draw.

It exists for two reasons that main-gui cannot serve.

**It is a different origin.** A widget rendered inside main-gui is a widget on
the same origin as the API's own front end, which is the one case the origin
allowlist never has to decide anything about. This app runs on **5174**, so the
browser really does send an `Origin` the API has to check against the widget's
`delivery.allowedOrigins`, so "I forgot to list this origin" is a thing you find
here instead of in a customer's console.

**It has none of main-gui's toolchain.** No MUI, no theme, no router, no
i18next, no TanStack Query. It imports React, the SDK, and nothing else. If
rendering a widget needed anything else, the SDK would not be an SDK, and this
app is what keeps that honest every time it draws something.

## Running it

The API has to be up, and the widget has to exist. From the repository root:

```sh
make dc3-up-d                                  # the stack, including main-api
npm run dev --workspace client-gui             # this app, on 5174
```

Then:

1. Open main-gui, go to **Site Widgets**, and save the example definition. It
   already lists `http://localhost:5174` as an allowed origin.
2. Copy the id out of the saved list.
3. Open <http://localhost:5174>, paste it, press **Render**.

`VITE_WIDGET_API_URL` sets the API address the field starts on, and it defaults
to `http://localhost:30000`, which is the port Compose publishes. The field is
editable, so pointing it at an API running on the host needs no restart.
`CLIENT_GUI_PORT` moves the app, and the origin to list in a definition is
whatever it prints when it starts.

## What the page shows

| On the page  | Why it is there                                                    |
| ------------ | ------------------------------------------------------------------ |
| The widget   | On a checkerboard, so a transparent background reads as one        |
| The version  | Which one came back, which is what makes a stale cache visible     |
| The failure  | The status and the reason, in full                                 |
| `cart.total` | The host page's context, which placeholders and progress bars read |
| Events       | Every click the widget reported                                    |

**The failure is shown in full here, and nowhere else.** This page is the
developer's own, and the 403 that means "this origin is not on the widget's list"
is the single most likely thing to be stuck on. A real site does the opposite:
the SDK draws nothing when a widget cannot load, because a shopper seeing
`403 Forbidden` where a banner was meant to be is worse than a shopper seeing the
page without the banner.

The **Events** panel is the seam analytics will be built on. An event that does
not appear there will not appear in a customer's analytics either.

## The SDK is aliased to its source

`vite.config.ts` points `@front-runner/widget-sdk` at
`packages/widget-sdk/src/index.ts` rather than at its built `dist`. A change to
an element is then visible here on the next reload, with no `tsc` in between,
which is the loop this app exists for.

What that costs is that this app does not exercise the package's published entry
points. `npm run build --workspace @front-runner/widget-sdk` and
`npm run build --workspace client-gui` are what check those, and Turborepo runs
the first before the second.

## Checks

```sh
npm run test --workspace client-gui
npm run lint --workspace client-gui       # tsc
npm run build --workspace client-gui
```

One test beside every file, the same as everywhere else. What the tests cannot
cover is the thing this app is for: a real browser sending a real `Origin` to a
real API. That is looked at by running it.

## It is not a deployment

There is no Dockerfile and no Compose service. This is a development tool: it is
`noindex`, it has no styling to speak of, and the "customer's website" it stands
in for is imaginary. A real integration example for customers would be its own
thing, written to be read rather than to be poked at.
