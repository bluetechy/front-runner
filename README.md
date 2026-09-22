# Gamification Project

A Turborepo monorepo.

## Layout

- `apps/main-api` — NestJS/TypeScript GraphQL API
- `apps/main-db` — Postgres image and schema
- `apps/main-gui` — Vite/React 19/MUI front end, routed with TanStack Router
- `apps/keycloak-idp` — Keycloak, the identity provider
- `main-mail` — Mailpit, a development mail sink for Keycloak's reset links
- `Makefile` / `docker-compose-dev.yml` — Docker Compose orchestration
- `.env` — configuration shared by every Compose service

## Turborepo

- `npm install`
- `npm run build` / `npm run dev` / `npm run test` / `npm run lint`

Filter a single app with `npx turbo run build --filter=main-api`.

## Configuration

Every credential, port and address lives in `.env` at the repository root. It is
committed so a clone comes up with no extra setup — the values are local
development defaults and are not used anywhere else.

`APP_DB_NAME`, `APP_DB_USER` and the `dbo` schema name are hard-coded throughout
`apps/main-db/sql`, so changing them means changing the SQL too.

## Service graph

Run these from the repository root. Every service is enabled in
`docker-compose-dev.yml`. The API and the GUI both use Node 24 and reload when
their mounted source changes. See
[API setup, design decisions, and migration](apps/main-api/docs/README.md) and
[GUI setup and codebase structure](apps/main-gui/docs/README.md).

- GUI — <http://localhost>
- GraphQL — <http://localhost:30000/graphql>
- Mail inbox — <http://localhost:30004> (Mailpit; catches Keycloak's mail)

To startup the service graph:

- `make dc3-up-d`

To open a psql shell on the database:

- `make dc3-psql`

To follow the logs:

- `make dc3-logs`

To shutdown the service graph:

- `make dc3-down`

To shutdown and also discard the database volume, forcing the schema to be
rebuilt from `apps/main-db/sql` on the next startup:

- `make dc3-clean` — this also discards every Keycloak account, since Keycloak
  keeps its realm in a database on the same volume.

## Authentication

Keycloak owns accounts and sign-in; `main-api` owns permissions. The browser
signs in at Keycloak directly and sends the access token it gets back, and the
API verifies it against the realm's public keys — it issues no tokens of its own
and has no login operation.

- Admin console — <http://localhost:30003/admin> (`admin` / `admin`)
- Realm — `front-runner`, imported on first start from
  `apps/keycloak-idp/realm`, with an account per seeded user whose password is
  their username

The GUI signs in through the dialog on the landing page. Email and password
complete in the page; **Sign Up**, **Forgot Password** and the three social
buttons are flows Keycloak hosts, so they leave the site and come back to
`/auth/callback`. How that works, and what enabling the password grant costs,
is in [signing in](apps/main-gui/docs/authentication.md).

### The test account

Seeded in Keycloak _and_ in the database, for exercising the login dialog:

| Email                      | Username   | Password   |
| -------------------------- | ---------- | ---------- |
| `test.user@northwind.test` | `testuser` | `testuser` |

It is an ordinary member of Northwind Trading and holds the fixed UUID
`b0000000-0000-4000-8000-00000000000d`, so `dbo.ProvisionUser` claims the
seeded row on first sign-in rather than making a second one beside it. Every
other seeded account works the same way, with its password equal to its
username.

An account is yours and belongs to nothing on its own. Organization membership
works the way it does on GitHub or Cloudflare: an owner invites an email
address, and the person holding it accepts or declines. Nobody is added to an
organization without agreeing, and the last owner of an organization cannot be
removed from it. See [`apps/keycloak-idp/README.md`](apps/keycloak-idp/README.md)
for the realm, and [`migration.md`](apps/main-api/docs/migration.md) for the
GraphQL operations.

On a volume created before Keycloak existed, its database has to be made once:

- `make db-keycloak`

## Database

The schema is built once, when the container first starts on an empty volume.
Seeding and testing are separate, on-demand operations -- a fresh database is
empty, not seeded.

To apply a schema change without discarding the volume or the container:

- `make db-rebuild` -- drops the database and rebuilds it from
  `apps/main-db/sql`. Leaves it empty. `sql/` is bind-mounted into the
  container, so edits apply without a `docker build`.

To load demo data for working against the API and GUI:

- `make db-seed` -- applies `apps/main-db/sql/Seeds/Dev`. Every row carries a
  fixed UUID and upserts, so running it twice is the same as running it once,
  and editing a seed file and re-running refreshes the rows it touches.
- `make db-reseed` -- empties every table first, so the result is exactly the
  dataset and nothing else.

`apps/main-db/sql/Seeds/README.md` covers how a seed run works and how to add
to the dataset.

To run the database tests:

- `make db-test` -- builds a throwaway `dbo_test` from the same SQL, runs
  every test in its own rolled-back transaction, and drops it. Your
  development data is never touched.
- `make db-test ARGS="--test-name-pattern=Tallies"` -- run a subset.
- `make db-test-watch` -- re-run on every SQL or test change.
- `npm run test:ci --workspace main-db` -- same suite with a JUnit report at
  `apps/main-db/test-results.xml`, for a pipeline.

The suite connects over the published Postgres port, so the stack has to be up.
See `apps/main-db/sql/Tests/README.md` for how to write a test, and
`apps/main-db/SCHEMA-NOTES.md` for what the schema still gets wrong.
