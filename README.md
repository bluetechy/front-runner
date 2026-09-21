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
