# Gamification Project

A Turborepo monorepo.

## Layout

  - `apps/main-api` — GraphQL/Express API
  - `apps/main-db` — Postgres image and schema
  - `apps/main-gui` — React frontend
  - `Makefile` / `docker-compose-dev.yml` — Docker Compose orchestration

## Turborepo

  - `npm install`
  - `npm run build` / `npm run dev` / `npm run test` / `npm run lint`

Filter a single app with `npx turbo run build --filter=main-api`.

## Service graph

Run these from the repository root.

To startup the service graph:

  - `make dc3-up-d`

To call the frontend application:

 - `curl -X GET http://localhost:80

To shutdown the service graph:

  - `make dc3-down`
