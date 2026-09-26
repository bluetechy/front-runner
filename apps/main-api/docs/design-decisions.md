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
  users/                      # Login, account, directory
  profiles/                   # The profile a person writes about themselves
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

Validation rejects malformed UUIDs, invalid names and page bounds. Arguments
with a handful of fields are checked by a pipe of their own (`UUID`, `Name`,
`Email`, `Page`); the profile input has fifteen and is checked against a zod
schema through `ZodPipe`, which reports every failing field at once rather
than the first, because a form that has to be submitted once per mistake is a
form nobody finishes. The pipe passes on what the schema parsed, so trimming
happens once and before the service sees it. main-gui carries a copy of that
schema so the browser can say the same things sooner; this one is the
authority, and the two are tested against the same cases at either end. Queries are
limited to depth 10 and 100 expanded field selections, counting aliases and
fragment expansion. Standard introspection selections are exempt from those
application limits and available only outside production. HTTP batching is off,
request bodies are capped at 64 KiB, and PostgreSQL has connection/statement
timeouts. These are bounds, not a full cost model or deployment rate limiter.
The one exception is `startSmsEnrollment`, which is limited per account and
per phone number in `dbo.StartPhoneVerification`: it spends money on somebody
else's handset, which is a cost this API can name and an ingress cannot.

## 5. Authentication and error handling

**Keycloak issues the tokens; this API only verifies them.** The browser runs
authorization code with PKCE against Keycloak directly and sends the access
token it gets back. There is no `login` operation and no signing secret: the API
mints no session and holds no credential of its own, which is the arrangement
that lets MFA and any future social or enterprise identity provider work
without further changes here.

Four operations are `@Public`, and each one is public because a session is the
thing its caller does not have. `verifyEmail` is followed from a mailbox;
`register` is how somebody without an account makes one; `requestPasswordReset`
and `resetPassword` are for somebody who cannot login at all. All four go
through the realm's admin API using the service account on the `main-api`
client, which holds `manage-users`, `view-users`, `view-events` and
`view-identity-providers` and nothing else. Every
other operation in the schema is refused without a token, and
`app.module.test.ts` asserts exactly that, one operation at a time.

Every request carries an RS256 Bearer token verified against the realm's public
keys, fetched over the Compose network and cached until Keycloak rotates them.
Issuer and audience are both checked: a token minted by this realm for a
different client is refused, and so is an ID token presented in place of an
access token — they are signed by the same keys and carry the same subject, so
nothing else would tell them apart.

An account is resolved once per HTTP request. The Keycloak `sub` claim is the
identity; the username and email are copies refreshed when they drift, so the
ordinary request costs one indexed read and provisioning writes only on a first
sign-in or a changed profile. Token role claims are never trusted for
permissions — every authorization decision is the database's.

**The guard is global and default-deny, and three things are exempt.** It is
registered as an `APP_GUARD`, so a resolver is protected the day it is written
rather than the day somebody remembers to decorate it. Two endpoints opt out
with a `@Public()`, and introspection is exempt because it resolves no field at
all; that is the whole list.

| Unauthenticated       | Why                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health/live`    | The orchestrator has no token and must be able to ask whether the process is alive. It reports nothing but that.                                                                                                                |
| `GET /health/ready`   | Same caller, same reason. It answers 200 or 503 from a `SELECT 1` and returns no row, no schema detail and no error text.                                                                                                       |
| GraphQL introspection | The schema shape, not the data. Enabled outside production and off when `NODE_ENV=production`, so a deployment publishes no field list. Field _resolution_ is guarded regardless — an introspection query cannot read a record. |

Nothing in the GraphQL schema is public. Every query and mutation is about a
particular person's organizations, invitations, teams, points or badges, and
there is no anonymous view — no public leaderboard, no organization directory —
for which an exemption would be worth its cost. A refused call is refused
_before_ the database is touched, so an unauthenticated request never reaches a
query, and `app.test.ts` enumerates the built schema rather than a hand-kept
list: adding a root field that answers without a token fails the suite.

**Authorization for teams lives in the API; everywhere else it lives in SQL.**
These are two layers: the guard establishes _who is calling_, and something
below it decides _what they may do_. For organizations and invitations that
decision is inside the SQL function, which raises a refusal the API maps to 403
— so the rule holds no matter who calls, including a second service or a psql
session. For teams it is in `TeamsService.access()` instead: `joinTeam` and
`leaveTeam` check organization membership, owner-or-team-manager standing, and
that the target belongs to the organization, all in TypeScript, because the
`JoinTeam` and `LeaveTeam` functions themselves check nothing at all.

The GraphQL surface is therefore guarded, but the guard is one layer thinner
than the rest of the schema and sits on the wrong side of the boundary this
codebase otherwise keeps. Anything reaching those two functions by another path
gets no check, and `JoinTeam` will happily create a membership in an
organization the user does not belong to — which every read function then
ignores, because `IsMemberOfTeam` and `IsManagerOfTeam` test organization
membership too. The membership exists and is invisible.

Separately, `joinTeam` is the last operation that adds someone to something
without their consent: an owner or manager places a member on a team, where the
organization side now requires an invitation and an acceptance.

None of this was introduced by the move to Keycloak. Each behavior is locked in
by a `_KnownIssue` test, with the detail in `apps/main-db/SCHEMA-NOTES.md` under
“Still broken — not touched, your call.” The fix is to push the checks down into
the two functions and drop the TypeScript equivalents. `GetUsers` has a related
problem, authorizing on the literal login `'admin'` rather than on
`Users."IsAdmin"`.

Database and identity-provider errors do not expose raw upstream responses, SQL,
parameters or stack traces to clients. A key server that cannot be reached
answers 503 rather than 401, because an outage is not evidence that a session
ended. Token revocation is not checked: an access token stays good until it
expires, which the realm caps at five minutes. Refresh-token rotation, back-
channel logout, tenant-scoped integration credentials and deployment rate
limiting need their own design when opening the platform to third parties.

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

Real-time delivery, background jobs and AI tools are not introduced
speculatively. The embedded widget SDK is no longer speculative and is built:
one public `GET` serving a validated JSON definition out of `jsonb`, an origin
allowlist carried in each definition, and a React runtime in
`packages/widget-sdk` that renders it without a token. It is the one part of this
API a stranger's browser calls, and [widgets](widgets.md) is why each piece of it
is shaped the way it is. Future resolvers, socket handlers and agent tools should
call feature services. Reliable notifications should follow database commit and
use an outbox/retry design when required; an in-memory event or WebSocket alone is
not durable delivery.

References: [Nest GraphQL](https://docs.nestjs.com/graphql/quick-start),
[Node release lifecycle](https://nodejs.org/en/about/previous-releases).
