# Design decisions

Status: accepted for the API refactor, 2026-09-21.

## 1. One modular NestJS application

The platform has distinct business areas but does not yet need independent
services. Nest modules provide dependency injection and ownership within one
application. Express remains the HTTP adapter; replacing it with Fastify is not
necessary to modernize the API or support future real-time features.

We use code-first GraphQL: decorators on feature-local models and resolvers build
one schema in memory. Explicit root operations allow several dashboard features
to be fetched in a single request. This refactor does not invent nested database
relationships or copy every database table into the public API.

## 2. Vertical organization and boundaries

The structure follows [The Vertical Codebase](https://tkdodo.eu/blog/the-vertical-codebase):
keep functionality together and expose intentional interfaces between groups.

```text
src/
  app.module.ts               # Composition root
  main.ts                     # HTTP bootstrap
  app.test.ts                 # Cross-feature HTTP contract tests
  users/                      # Login, profile, directory
  organizations/              # Organization lifecycle and membership
  teams/                      # Team lifecycle and membership
  badges/                     # Earned badges
  points/                     # Point ledger reads
  tallies/                    # Ranked point totals
  authentication/             # JWT guard and current-user contract
  configuration/              # Environment validation
  database/                   # PostgreSQL connection lifecycle
  graphql/                    # Transport config, query budgets, pagination
  health/                     # Liveness and database readiness
```

A typical feature owns its `.model.ts`, `.resolver.ts`, `.service.ts`, `.module.ts`,
`index.ts`, and tests. It can split further when it grows. There are no top-level
collections of unrelated `types`, `resolvers`, `services`, or `utils`.

Cross-vertical imports go through `index.ts`. Infrastructure must not import
business features. `scripts/check-boundaries.mjs` enforces these rules during lint.
Nest module exports also determine which providers other modules can inject.
Business services are private until another vertical actually needs a public
interface. The common pagination objects belong to the GraphQL transport vertical.
Moving each vertical into a separate npm workspace is deferred until independently
consuming or releasing them provides value.

## 3. Keep SQL business logic and explicit services

Feature services call existing PostgreSQL functions through parameterized queries.
The database vertical owns pooling and shutdown, not feature SQL. An ORM would add
a second schema model without replacing the existing SQL functions and triggers.
It is not needed here.

Authentication verifies an enabled account before passing its trusted login name
to SQL. Existing membership-aware read functions remain the authorization layer
for reads; inaccessible lists usually return empty results. Organization mutation
services check owner/self rules. Team mutation services add checks missing from
legacy SQL: creating teams requires an organization owner; adding/removing others
requires an owner or team manager; adding someone requires their organization
membership; ordinary members may leave themselves. Joining again preserves an
existing manager flag.

Limitations remain explicit: `GetUsers` still implements the database's existing
literal `admin` login rule, and authorization checks preceding writes are separate
queries. A future database authorization change should make permission checks and
writes atomic where concurrent permission revocation matters. This refactor does
not claim to repair all database policies or implement a new RBAC system.

## 4. Bounded and precise GraphQL contracts

Lists default to 50 rows, allow 1–100, and accept offsets up to 100000. SQL orders
results with stable identifier tie breakers before applying limits. `GetTeams`
results are deduplicated because its existing membership join can repeat teams.
Offsets are sufficient for this migration; cursor pagination can replace them as
public integration requirements become concrete.

PostgreSQL `decimal(19,4)` values remain strings end to end. GraphQL Float would
lose precision for valid ledger amounts. Dates use `GraphQLISODateTime`; nullable
database values have nullable fields. PascalCase response fields reduce migration
churn; operation/argument names use camelCase.

Validation rejects malformed UUIDs, invalid names and page bounds. Queries are
limited to depth 10 and 100 expanded field selections, counting aliases and
fragment expansion. Standard introspection selections are exempt from those
application limits and available only outside production. HTTP batching is off,
request bodies are capped at 64 KiB, and PostgreSQL has connection/statement
timeouts. These are bounds, not a full cost model or deployment rate limiter.

## 5. Authentication and error handling

All non-public operations require expiring HS256 Bearer JWTs. An enabled account
is checked once per HTTP request, and token role claims are not trusted for
permissions. Login preserves the existing Hydra integration but makes its endpoint
and namespace configuration explicit. Native fetch adds a timeout and validates
the response. JWTs contain the login name, subject and timestamps, not upstream
tokens or copied profile data. Tokens are valid for at most one day.

Production requires a sufficiently long signing secret. Existing shorter local
secrets remain usable only for development. External-provider and database errors
do not expose raw upstream responses, SQL, parameters or stack traces to clients.
Issuer/audience policy, identity-provider replacement, tenant-scoped integration
credentials, and public-login rate limiting need their own design when opening
the platform to third parties.

## 6. Versions, ESM and tests

Node **24.21.0** is the agreed LTS runtime. Direct package versions are exact and
resolved in the shared lockfile. NestJS 12, Nest GraphQL 14, Apollo Server 5,
TypeScript 7 and Jest 30 are the current installed releases. GraphQL stays on the
latest 16.x because Apollo Server's declared peer dependency does not yet allow
17.x; forcing an unsupported major is not a useful interpretation of “latest.”

Native ESM matches the current Nest packages. TypeScript emits decorator metadata
required by dependency injection. Jest runs compiled ESM with VM module support;
compiling before tests avoids a separate transformer's TypeScript compatibility
cycle. Tests verify HTTP contracts and authorization boundaries with controlled
external dependencies; a passing suite does not substitute for the SQL tests or
real-provider integration testing.

## 7. Containers and future capabilities

The production image uses deterministic workspace installation, a separate build
stage, pruned dependencies, a nonroot runtime and health endpoints. The development
target keeps compiler dependencies and watches a read-only source mount, writing
build output only inside the container. Compiling first and then restarting avoids
restarting on invalid TypeScript.

Real-time delivery, background jobs, AI tools and embedded dashboard SDKs are not
introduced speculatively. Future resolvers, socket handlers and agent tools should
call feature services. Reliable notifications should follow database commit and
use an outbox/retry design when required; an in-memory event or WebSocket alone is
not durable delivery.

References: [Nest GraphQL](https://docs.nestjs.com/graphql/quick-start),
[Node release lifecycle](https://nodejs.org/en/about/previous-releases).
