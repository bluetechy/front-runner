# Main API

NestJS + TypeScript + Apollo GraphQL, running on **Node 24.21.0**. The application
is organized by functionality, with feature-local resolvers, services, models,
modules, and tests — one test file per source file, which is the practice
[testing](../../../docs/testing.md) sets out and `npm run lint:tests`
enforces. See [design decisions](design-decisions.md) and
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

`IDP_ISSUER_URL`, `IDP_AUDIENCE` and the optional `IDP_JWKS_URL` and
`IDP_ACCESS_TOKEN_TYPE` configure token verification. The issuer is the address
the **browser** logs in at, because that is what the identity provider writes
into the token; the key set address is the one **this process** can reach, which
inside Compose is a different host. On the host both are
`http://localhost:30003/...`. No request is made to the provider at startup: the
keys are fetched when the first token arrives.

The `IDP_` prefix is the seam. Those four are what any OpenID Connect provider
has to tell this API, and they are all the request path reads. The `KEYCLOAK_`
values beside them (`KEYCLOAK_ADMIN_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`,
`KEYCLOAK_CLIENT_SECRET`) are one implementation's own configuration, read by
`KeycloakAdminService` and nothing else. See
`src/authentication/identity-admin.service.ts`. `CORS_ORIGINS` is an
explicit comma-separated allowlist; set it to the actual frontend origin(s).
Browser cookies are not used by this API.

`WALLET_ENCRYPTION_KEY` is what `dbo.AddCreditCard` and `dbo.AddBankAccount`
encrypt a saved card or account number under. It is **required**, has to be at
least 16 characters, and is handed to those functions on every call — it is
never stored in the database, which is the only thing that makes encrypting
the column worth anything. Rotating it orphans what is already stored; nothing
reads those columns back today, so nothing breaks, but see
`apps/main-db/sql/Tables/CreditCards.sql` before that stops being true. The key
and the columns it protects are a placeholder for a payment processor and are
meant to be deleted together.

## Checks

```sh
npm run build --workspace main-api
npm run lint --workspace main-api
npm run test --workspace main-api
npm run test:watch --workspace main-api
npm run test:coverage --workspace main-api
npm run test:changed                    # only the verticals that changed
```

Jest compiles TypeScript into ignored `.test-dist` and executes ESM using Node's
VM module support. Its experimental VM warning is expected. Tests use isolated
configuration and mocked database calls; they do not need a running PostgreSQL
instance or a running Keycloak. Token verification is not stubbed — the tests
generate an RS256 key pair, sign real tokens with it and hand the application a
local key set, so signature, issuer, audience and expiry are all genuinely
checked. HTTP integration tests start ephemeral local listeners. The database SQL
suite remains in `main-db` and should be run separately when SQL changes.

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
copied into the image, and the API holds no signing key of its own — it verifies
Keycloak's signatures and mints nothing. Production requires an HTTPS issuer.

- `GET /health/live`: process liveness (used by the image healthcheck).
- `GET /health/ready`: database connection readiness; returns 503 on failure.
- `POST /graphql`: GraphQL JSON requests. Every operation requires
  `Authorization: Bearer <Keycloak access token>`; there is no public one.

Production introspection is disabled. Configure TLS termination and rate limiting
at the deployment ingress before public exposure; sign-in throttling belongs to
Keycloak now, not to this service.
Subscriptions, durable events, embedded-widget credentials and agent tools are
future features, not implemented by this refactor.
