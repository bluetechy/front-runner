# Main API

NestJS + TypeScript + Apollo GraphQL, running on **Node 24.21.0**. The application
is organized by functionality, with feature-local resolvers, services, models,
modules, and tests. See [design decisions](design-decisions.md) and
[client migration](migration.md).

## Development with Docker Compose

From the repository root:

```sh
docker compose -p front-runner-dev -f docker-compose-dev.yml up -d --build main-api
docker compose -p front-runner-dev -f docker-compose-dev.yml logs -f main-api
```

Compose starts the database dependency if necessary; it does not seed it. The API
uses the application database account from `APP_DB_NAME`, `APP_DB_USER`, and
`APP_DB_PASSWORD`. The normal published API port is **30000**, so GraphQL is at
`http://localhost:30000/graphql`.

The `development` Docker target mounts `apps/main-api/src` read-only into the
container. Editing TypeScript triggers compilation and a server restart. A
failed compilation leaves the previous successful server running. This is server
restart/reload, not preservation of in-memory request or socket state.
Dependencies, scripts, and compiler configuration changes require an image rebuild.

## Development on the host

```sh
nvm use
npm ci --workspace main-api --include-workspace-root=false
npm run build --workspace main-api
npm run start --workspace main-api
# Or compile and restart as files change:
npm run dev --workspace main-api
```

`start` and `dev` load the repository root `.env` without replacing existing
process environment variables. Root `.env` is designed for Compose: on the host,
set `POSTGRES_ADDRESS=127.0.0.1`, `POSTGRES_PORT=30002` (or your published port),
`POSTGRES_DATABASE` to `APP_DB_NAME`, and `POSTGRES_USER`/`POSTGRES_PASSWORD` to the
application account. `apps/main-api/.env.example` lists the API configuration;
copy its values into your local environment, not into the image. The scripts do
not automatically read an API-local `.env`.

`HYDRA_BASE_URL` and `HYDRA_NAMESPACE` configure the existing login provider.
Compose defaults to the legacy QA provider. Outside Compose, login reports an
unconfigured provider unless both variables are set. No external authentication
request is made at startup. `CORS_ORIGINS` is an explicit comma-separated allowlist;
set it to the actual frontend origin(s). Browser cookies are not used by this API.

## Checks

```sh
npm run build --workspace main-api
npm run lint --workspace main-api
npm run test --workspace main-api
npm run test:watch --workspace main-api
npm run test:coverage --workspace main-api
```

Jest compiles TypeScript into ignored `.test-dist` and executes ESM using Node's
VM module support. Its experimental VM warning is expected. Tests use isolated
configuration, mocked database calls and identity-provider responses; they do not
need a running PostgreSQL instance or contact the real identity provider. HTTP
integration tests start ephemeral local listeners. The database SQL suite remains
in `main-db` and should be run separately when SQL changes.

`lint` checks TypeScript and cross-vertical import boundaries. It is not a full
stylistic ESLint ruleset. Production compilation excludes test files.

## Production image

```sh
docker build -f apps/main-api/Dockerfile -t front-runner-main-api .
```

The **repository root** is the build context because the lockfile belongs to the
workspace. The final target includes compiled application code and production
dependencies, runs as the `node` user, and starts `node dist/main.js` directly.
Supply environment variables at runtime. No credentials or `.env` files are
copied into the image. Production requires a JWT secret of at least 32 characters.

- `GET /health/live`: process liveness (used by the image healthcheck).
- `GET /health/ready`: database connection readiness; returns 503 on failure.
- `POST /graphql`: GraphQL JSON requests; `Authorization: Bearer <token>` except login.

Production introspection is disabled. Configure TLS termination and rate limiting
at the deployment ingress, including login throttling, before public exposure.
Subscriptions, durable events, embedded-widget credentials and agent tools are
future features, not implemented by this refactor.
