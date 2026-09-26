# Refactor handoff and verification

Updated: 2026-09-21. **Implementation and verification completed.** This file keeps
its original name so the handoff link remains valid.

## Workspace

- Worktree: `/private/tmp/front-runner-nestjs-api`
- Branch: `feat/main-api-nestjs`, based on `e6bb4665` on `main`.
- Implementation is complete. The feature branch is ready for PR review; merging
  remains a separate step.
- Original checkout `/Users/mrmmattson/Projects/bluetechy/front-runner` remains clean.
- Final user runtime decision: **Node 24.21.0**, not Node 25.

## Delivered

- NestJS 12, TypeScript 7, native ESM, Apollo GraphQL at `/graphql`.
- Latest compatible direct packages pinned exactly in package.json/root lockfile.
  GraphQL 16.14.2 respects Apollo Server 5's declared peer dependency.
- Vertical features for users, organizations, teams, badges, points and tallies;
  explicit public indexes and an automated boundary check.
- Existing SQL-backed functionality migrated, with JWT authentication, team
  authorization, validation, bounded pagination, decimal precision and safe errors.
- Node 24 multi-stage Dockerfile with development and nonroot production targets.
- API enabled in dev Compose with the application database account, healthy DB
  dependency, and a mounted source directory for compile/restart hot reload.
- Jest tests colocated with functionality plus HTTP GraphQL integration tests.
- [Setup](README.md), [design decisions](design-decisions.md), and
  [client migration](migration.md) documented; root README updated.

## Verification results

- Node version verified: v24.21.0.
- Production TypeScript build: passed.
- Strict type checking and vertical import boundaries: passed.
- Jest: **51 tests across 6 suites passed**.
- Compose configuration validation: passed.
- Final production and development images: built successfully.
- Production smoke: process starts, liveness passes, introspection disabled,
  runtime user UID 1000, and legacy node-notifier absent from the image.
- Development smoke: `/health/live` and `/health/ready` return 200; anonymous
  GraphQL operation returns `UNAUTHENTICATED`.
- Real database smoke: authenticated, read-only dashboard query across all six
  features passed. No database schema changes, resets, seeds or data mutations.
- Hot reload: temporarily appended a comment to mounted `src/main.ts`, observed
  healthy process replacement (PID 101 -> 185), then restored the original file.
- `git diff --check`: passed; original checkout status: clean.

The optional shared-workspace audit warning for `node-notifier@5.4.5` predates
this change and comes from the legacy GUI's Jest reporter. It is not included in
the production API image. No unrelated GUI dependency upgrades were attempted.

## Running development service

The API was left running in existing Compose project `front-runner-dev`:

- Container: `front-runner-dev-main-api-1`
- URL: `http://localhost:30000/graphql`
- Source mount points to **this worktree**, not the original main checkout.
- Existing DB and Redis containers were reused without rebuilding them.

From the worktree root:

```sh
docker compose -p front-runner-dev -f docker-compose-dev.yml logs -f main-api
docker compose -p front-runner-dev -f docker-compose-dev.yml stop main-api
```

The shell's default Node is 25.2.1. For the recorded local checks, the isolated
Node 24 runtime was used:

```sh
npm exec --offline --package=node@24.21.0 -- npm run build --workspace main-api
npm exec --offline --package=node@24.21.0 -- npm run lint --workspace main-api
npm exec --offline --package=node@24.21.0 -- npm run test --workspace main-api
```

## Known scope and follow-up considerations

- The old GUI needs the migration documented in `migration.md`: legacy feature
  URLs were intentionally replaced. Point amounts are now decimal strings.
- Live sign-in has since been exercised end to end against the running realm:
  real authorization-code + PKCE sign-ins as seeded users, driving invite,
  accept, decline, revoke, role changes and archive/restore. Token verification
  is additionally covered in Jest against real RS256 signatures from a key pair
  generated in the test. What remains unexercised is a browser doing the
  redirect, rather than a script performing the same requests.
- No subscriptions, job workers, AI agents, embedded widgets, ORM or new RBAC
  system are included. Existing database policy limitations are documented.
- The API no longer signs anything, so there is no JWT secret. Production
  requires an HTTPS issuer; the local realm runs over plain HTTP and says so.
- Nothing delivers an invitation. An invitee discovers one by querying
  `invitations`; there is no mail, and that needs its own design.
- **Team authorization sits in the API, not the schema.** `joinTeam` and
  `leaveTeam` are checked in `TeamsService.access()` — organization membership,
  owner-or-manager standing, target in the organization — because the `JoinTeam`
  and `LeaveTeam` SQL functions check nothing. The GraphQL surface is guarded;
  the rule just lives one layer higher than the organization rules do, so any
  other caller of those functions gets no check, and `JoinTeam` can still create
  a membership in an organization the user does not belong to, which the read
  functions then ignore. Fix is to push the checks into the SQL and delete the
  TypeScript ones. Detail in `apps/main-db/SCHEMA-NOTES.md`, “Still broken —
  not touched, your call.”
- `joinTeam` remains the last operation that adds someone to something without
  consent; organizations moved to invitation-and-acceptance, teams did not.
- `GetUsers` authorizes on the literal login `'admin'` rather than on
  `Users."IsAdmin"`, so whoever registers that username gets the full user list.
- Deployment rate limiting and third-party credential policy remain deployment/
  product work, not unfinished pieces of this framework refactor. The
  exception is the one operation that spends money per call:
  `startSmsEnrollment` is limited in `dbo.StartPhoneVerification`. The login
  code Keycloak sends is limited too, in the plugin's `SmsSendBudget` rather
  than here, because it never reaches this service: see
  `apps/keycloak-idp/README.md`.
