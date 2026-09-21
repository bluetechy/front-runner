# Seed data

Load it with `make db-seed` from the repository root. The Compose stack has to
be up (`make dc3-up-d`); the schema has to exist already, which it does unless
you emptied the volume.

Seeding is never automatic. `init.sh` builds the schema on first container start
and stops there, and `make db-rebuild` leaves the database empty on purpose. A
fresh database has no rows in it until you ask for some.

## How a run works

`apps/main-db/bin/seed.sh` drives it:

1. resolves a dataset directory under `sql/Seeds` (default `Dev`)
2. with `--reset`, truncates every table in `dbo` in a single statement --
   they reference each other, so emptying them one at a time would trip the
   foreign keys
3. applies each `*.sql` in the dataset in file-name order, under
   `ON_ERROR_STOP=1`

That is the whole mechanism. There is no manifest and no ordering table: the
numeric prefix on the file name _is_ the order.

| Command          | Effect                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| `make db-seed`   | upsert the dataset over whatever is already there                      |
| `make db-reseed` | truncate every `dbo` table first, so the result is exactly the dataset |

`db-reseed` empties tables the dataset does not write to as well. It is a reset
of the application database, not of the demo rows alone.

The Makefile targets always use `Dev`. To run a different dataset, call the
script directly:

```
docker compose -p front-runner-dev -f docker-compose-dev.yml \
    exec main-db /opt/main-db/bin/seed.sh --reset Demo
```

## Layout

```
Seeds/
  Dev/    the demo dataset -- one file per table, numbered in dependency order
```

A dataset is just a directory of SQL files, so a second one is a new directory
next to `Dev/`.

File names are `<NN>_<Table>.sql`. This is the one place in the repository where
a file name is not exactly an object name: rows have to load parents before
children, so the number leads. `01_Organizations.sql` through `05_Points.sql`
are the parent tables; `06`-`09` are the memberships and balances that point at
them; `10`-`14` are the points features built on top -- levels, multipliers,
redemptions and transfers; `15`-`23` are roadmaps, tasks and everything hanging
off a task; `24`-`29` are approvals, `30`-`34` are surveys and `35`-`40` are
roles, permissions, attachments, notifications and the event log, and `41`-`44`
are the badge criteria, groups and shares the badge readers need. The file number
is decimal and the UUID prefix is hex, so the two stop lining up after `14`.

## Writing a seed file

```sql
--
-- Three organizations. "Legacy Holdings" is disabled so the disabled-org path
-- through the read functions has something to exclude.
--

INSERT INTO "dbo"."Organizations" ("OrganizationUUID", "Name", "IsEnabled", "CreatedBy") VALUES
    ('a0000000-0000-4000-8000-000000000001', 'Northwind Trading', true,  'seed'),
    ('a0000000-0000-4000-8000-000000000002', 'Bluetechy Labs',        true,  'seed'),
    ('a0000000-0000-4000-8000-000000000003', 'Legacy Holdings',       false, 'seed')
ON CONFLICT ("OrganizationUUID") DO UPDATE SET
    "Name" = EXCLUDED."Name",
    "IsEnabled" = EXCLUDED."IsEnabled",
    "UpdatedBy" = 'seed';
```

Four rules make that re-runnable, and `make db-seed` is only idempotent because
every file follows them:

- **Fixed UUID literals, never `gen_random_uuid()`.** A generated key would
  insert a second copy of the same row on every run.
- **`ON CONFLICT ... DO UPDATE`, never `DO NOTHING`.** Editing a seed file and
  re-running has to refresh the rows it touches; `DO NOTHING` would silently
  keep the old values. Conflict on the primary key, or on the natural composite
  key for a join table (`ON CONFLICT ("UserUUID", "OrganizationUUID")`).
- **Update the real columns, and set `"UpdatedBy" = 'seed'`.** Leave
  `CreatedAt`/`CreatedBy` alone in the `DO UPDATE` -- the triggers own them.
- **`'seed'` as the audit author on every row**, so seeded rows are
  distinguishable from application writes with
  `WHERE "CreatedBy" = 'seed'`.

Open with a comment saying what the rows are _for_. The dataset exists to give
the read paths something interesting to return -- a disabled organization, a
user who belongs to nothing, an expired point row -- and the next person needs
to know which rows carry that weight before they edit one.

### UUID prefixes

Each parent table owns a leading nibble, so a UUID is identifiable on sight:

| Prefix         | Table                         |
| -------------- | ----------------------------- |
| `a0000000-...` | `Organizations`               |
| `b0000000-...` | `Users`                       |
| `c0000000-...` | `Teams`                       |
| `d0000000-...` | `Badges`                      |
| `e0000000-...` | `Points`                      |
| `f0000000-...` | `UserPoints`                  |
| `10000000-...` | `PointLevels`                 |
| `11000000-...` | `PointMultipliers`            |
| `12000000-...` | `UserPointLevels`             |
| `13000000-...` | `PointRedemptions`            |
| `14000000-...` | `PointTransfers`              |
| `15000000-...` | `Roadmaps`                    |
| `16000000-...` | `Tasks`                       |
| `17000000-...` | `TaskDependencies`            |
| `18000000-...` | `TaskComments`                |
| `19000000-...` | `TaskHistory`                 |
| `1a000000-...` | `AssignmentHistory`           |
| `1b000000-...` | `Checklists`                  |
| `1c000000-...` | `Labels`                      |
| `1d000000-...` | `ApprovalWorkflows`           |
| `1e000000-...` | `ApprovalWorkflowStages`      |
| `1f000000-...` | `ApprovalWorkflowPermissions` |
| `20000000-...` | `ApprovalRequests`            |
| `21000000-...` | `ApprovalDecisions`           |
| `22000000-...` | `ApprovalRequestLogs`         |
| `23000000-...` | `Surveys`                     |
| `24000000-...` | `SurveyQuestions`             |
| `25000000-...` | `SurveyQuestionOptions`       |
| `26000000-...` | `SurveyParticipants`          |
| `27000000-...` | `SurveyAnswers`               |
| `28000000-...` | `Roles`                       |
| `29000000-...` | `AccessControlLists`          |
| `2a000000-...` | `Attachments`                 |
| `2b000000-...` | `Notifications`               |
| `2c000000-...` | `EventLog`                    |
| `2d000000-...` | `BadgeCriteria`               |
| `2e000000-...` | `BadgeGroups`                 |
| `2f000000-...` | `BadgeGroupRelationships`     |
| `30000000-...` | `SharedBadges`                |

`a` through `f` are used up, so the scheme carries on into two-digit prefixes
counting from `10`. It is still one distinct leading byte per table, which is
the part that matters -- a UUID in a psql result is identifiable without
looking up which table it came from.

Join tables have no key of their own -- they carry the parents' UUIDs. Keep the
scheme going when you add a table. The `-4000-8000-` in the middle is the v4
shape, kept so the literals look like the UUIDs the application generates rather
than like something hand-typed.

## Seeds are not test fixtures

They look similar and they are not interchangeable:

|              | `Seeds/`                                | `Tests/Fixtures/`                       |
| ------------ | --------------------------------------- | --------------------------------------- |
| Lives in     | the application database                | the throwaway `dbo_test`                |
| Applied by   | `make db-seed`, on demand               | every `make db-test` run, automatically |
| Exists for   | working against the API and GUI by hand | assertions                              |
| Edit freely? | yes                                     | no -- tests assert on the counts        |

A test must never depend on a seed row, and `make db-test` never loads one. See
`../Tests/README.md`.
