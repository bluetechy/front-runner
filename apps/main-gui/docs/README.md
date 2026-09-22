# Main GUI

Vite + React 19 + MUI 9 + TanStack Router, in TypeScript, running on
**Node 24.21.0**.
This app replaced the Create React App / webpack 4 front end that used to live
here; nothing was carried over from it. See
[codebase structure](codebase-structure.md) for how the source is organized,
[the landing page](landing-page.md) and [the pricing page](pricing-page.md)
for what is built so far, [signing in](authentication.md) for the login dialog
and its Keycloak flows, [the dashboard](dashboard.md) and
[the profile page](profile-page.md) for what is behind the login, and [icons](shared/icons.md) for how every icon is
wrapped.

## Development with Docker Compose

From the repository root:

```sh
docker compose -p front-runner-dev -f docker-compose-dev.yml up -d --build main-gui
docker compose -p front-runner-dev -f docker-compose-dev.yml logs -f main-gui
```

The published port is **80** (`GUI_PUBLISHED_PORT`), so the app is at
<http://localhost>. That origin is already in `CORS_ORIGINS`, so the browser
can call `main-api` on port 30000 once the app starts doing so.

The `development` target runs `vite` and bind-mounts the whole of
`apps/main-gui` read-write — read-write because the TanStack Router plugin
regenerates `src/routeTree.gen.ts` whenever a route file changes. An anonymous
volume covers `apps/main-gui/node_modules` so the container keeps the Linux
install that was made during the image build, whatever is on the host.

Bind mounts on Docker Desktop do not deliver file-change events reliably, so the
Compose service sets `VITE_WATCH_POLLING=true` and `vite.config.ts` turns on
polling. Host development leaves it unset and uses native file events.

Dependency or config changes need an image rebuild **and a fresh anonymous
volume**, because Vite pre-bundles dependencies into
`node_modules/.vite`, which lives inside that volume and survives a rebuild:

```sh
docker compose -p front-runner-dev -f docker-compose-dev.yml \
  up -d --build --force-recreate --renew-anon-volumes main-gui
```

Source changes need neither.

## Development on the host

```sh
nvm use
npm ci --workspace main-gui --include-workspace-root=false
npm run dev --workspace main-gui      # http://localhost:5173
npm run build --workspace main-gui    # bundle into dist/
npm run start --workspace main-gui    # serve dist/ with `vite preview`
npm run lint --workspace main-gui     # tsc --noEmit
```

`vite preview` is a development convenience and is what the image's `runtime`
target runs. It is not a production web server; a real deployment would put
`dist/` behind nginx or a CDN with an SPA fallback.

## Node version

The repository pins **24.21.0** in `.nvmrc` and `.node-version`, and the package
declares `"engines": { "node": ">=24 <25" }`. npm only warns on a mismatch, so a
newer Node on the host installs and runs anyway — the image is the version that
counts.

## UI

MUI 9 with its default Emotion styling engine (`@emotion/react`,
`@emotion/styled`), plus `@mui/icons-material`. There is one theme, in
`src/design-system/theme.ts`, applied by the single `ThemeProvider` in
`main.tsx` alongside `CssBaseline`. The app has no stylesheets of its own —
see [codebase structure](codebase-structure.md) for what that means in practice.

The theme is dark-only: the design is a violet field, and no light scheme is
defined.

## Configuration

The browser's addresses — Keycloak, the realm, the client id, the GraphQL
endpoint — come from `VITE_`-prefixed keys in the **repository root `.env`**,
which `vite.config.ts` points `envDir` at. That is the same file Compose hands
every other service, so there is one list of addresses rather than two. Only
`VITE_`-prefixed keys reach the bundle; nothing else in `.env` does.

Compose also passes `.env` to the container as `env_file`, which Vite reads
too — so adding a key there needs the container **recreated**, not restarted:
`env_file` is read when the container is made.

## Routing

Routes are files under `src/routes`, and
`@tanstack/router-plugin` generates `src/routeTree.gen.ts` from them during
`dev` and `build`. The generated file is committed so `tsc --noEmit` works
without running Vite first, and it is excluded from Prettier and oxlint.

Adding a page means adding a file to `src/routes`; the tree, the types, and the
code-split chunk follow from that. `<Link>` targets are checked against the
generated tree, which is why the header's links are typed and why every link in
it resolves to a real route rather than a 404.

## Gotchas met while building this

- **React must be a single copy.** The first build rendered nothing and threw
  React error #321 (invalid hook call), because a stale hoisted `react@16` left
  over from the old app was still at the root of `node_modules` and
  `@tanstack/react-store` resolved to it. Deleting `node_modules` and the
  lockfile and reinstalling fixed it. `npm ls react --workspace main-gui` should
  show one version, deduped. The same failure then reappeared _only inside the
  container_, because Vite's pre-bundle cache in the anonymous volume had been
  built against the old copy — hence `--renew-anon-volumes` above.
- **MUI 9 no longer takes system props on `Grid` and `Stack`.** `alignItems`,
  `justifyContent` and friends are `sx` keys now, not props; passing them as
  props is a type error rather than a silent no-op, so `tsc --noEmit` catches
  it.
- **Headless Chrome clamps windows to 500px wide on macOS.** Screenshots taken
  at `--window-size=420,…` are 420px crops of a 500px layout, which looks
  exactly like a broken responsive header. Render the page in a 390px `<iframe>`
  instead to check narrow widths, or drive the browser over the DevTools
  protocol: `--remote-debugging-port=9222`, then
  `Emulation.setDeviceMetricsOverride` at the width you want before
  `Page.captureScreenshot`. That one also answers the question directly —
  `document.documentElement.scrollWidth` against `window.innerWidth` says
  whether anything really overflows, which a crop cannot.
