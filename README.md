# Gamification Project

A Turborepo monorepo.

## Layout

  - `apps/main-api` — GraphQL/Express API
  - `apps/main-db` — Postgres image and schema
  - `apps/main-gui` — React frontend
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

Run these from the repository root. `main-api` and `main-gui` are commented out
in `docker-compose-dev.yml`; only `main-db` and `main-kvs` start today.

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

  - `make dc3-clean`

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
