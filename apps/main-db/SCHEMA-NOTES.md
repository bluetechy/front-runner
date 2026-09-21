# main-db schema notes

## Folder layout

SQL Server / SSDT style — one object per file, file name identical to the object name.

```
bin/
  apply.sh          build the schema into a named database
  rebuild.sh        drop the application database and build it again
  seed.sh           load a seed dataset on demand
test/
  database.test.js  discovers and drives the SQL tests
sql/
  Functions/        one function per file            (22)
  Tables/           CREATE TABLE only, no triggers   (20)
  Triggers/         one trigger per file             (42)
  ForeignKeys/      FK constraints, one file per table (8 files, 16 constraints)
  Security/         Permissions.sql
  Seeds/Dev/        demo data, applied on demand      (9)
  Tests/            see Tests/README.md
    Helpers/        assertions and shared setup       (8)
    Fixtures/       the world every test starts from  (1)
    Cases/          one file per object under test    (23)
  Drafts/           not built; see "Drafts" below
    Tables/                                          (45)
    Functions/                                       (72)
    StoredProcedures/                                (97)
```

`bin/apply.sh` applies `Functions -> Tables -> ForeignKeys -> Triggers -> Security`.
`init.sh` creates the database and role on first container start and then calls it.
Nothing under `Drafts/`, `Seeds/` or `Tests/` is applied by either.

**Schema creation and seeding are separate.** A fresh database is empty. Demo
data is `make db-seed`; the tests build their own scratch database and load
their own fixtures. See the "Database" section of the repository README.

## Naming convention

| Thing | Convention | Example |
|---|---|---|
| Schema | `dbo`, always quoted | `"dbo"."Users"` |
| Table | PascalCase, plural | `UserOrganizations` |
| Column | PascalCase, quoted | `"CreatedBy"` |
| Primary key | `<SingularTable>UUID` | `"OrganizationUUID"` |
| Audit columns | on every table | `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy` |
| Business function | PascalCase verb phrase | `"dbo"."GetOrganizations"` |
| Trigger function | snake_case | `"dbo"."update_modified_info"` |
| Function parameter | `_PascalCase` | `_OrganizationUUID` |
| Trigger | `<Table>_<Purpose>_<Event>` | `Users_ModifiedInfo_Insert` |
| Unique constraint | `<Table>_<What>_UniqueKey` | `Users_LoginName_UniqueKey` |
| Foreign key | `FK_<Table>_<ReferencedTable>` | `FK_UserBadges_Badges` |
| Foreign key, 2nd to same table | `FK_<Table>_<ReferencedTable>_<Column>` | `FK_SharedBadges_Users_SharedWithUserUUID` |
| File name | exactly the object name + `.sql` | `Triggers/Users_ModifiedInfo_Insert.sql` |

The two casings for functions are deliberate: PascalCase names are the API the app
calls, snake_case names are internal trigger plumbing.

`sql/Drafts/` was converted to the same convention: every table, column, function,
procedure and parameter is now PascalCase, and each file is named after its object.
**Types and structure were not touched** — draft keys stay `serial` integers named
`<Singular>Id` (`TaskId`, `UserId`), not `<Singular>UUID`, because they really are
integers. Renaming them to `*UUID` is part of migrating a draft into the live schema,
not part of this pass. Draft tables are also still unquoted and unschema'd, so
Postgres folds them to lowercase — quote them and prefix `dbo.` on migration.

## Changes made during the reorg

These alter behaviour. Revert any you disagree with.

1. `Tables/Organziations.sql` -> `Tables/Organizations.sql` (file name was misspelled;
   the table inside was always spelled correctly).
2. Inline `REFERENCES` moved out of `Tables/*.sql` into `ForeignKeys/*.sql` and
   schema-qualified. They were unqualified (`REFERENCES Users("UserUUID")`), so they
   resolved against `search_path` — which does not contain `dbo` — and every table
   carrying one failed to create. Moving them after `Tables/` also removes the
   alphabetical ordering trap (`BadgeAchievements` referenced `Users` and `Badges`,
   both of which load later).
3. `ForeignKeys/UserBadges.sql` gave all three constraints the literal name
   `constraint_name`; the 2nd and 3rd would have failed as duplicates. Renamed per
   the convention above.
4. `SharedBadges."UserUUID"` and `"SharedWithUserUUID"` were `INT` referencing
   `Users("UserUUID")` (uuid), and `BadgeEventCriteria."BadgeEventUUID"` was `INT`
   referencing `BadgeEvents("BadgeEventUUID")` (uuid). Changed to `uuid` so the FKs
   are creatable. No columns removed.
5. `SharedBadges` had `ModifiedInfo` triggers but none of the four audit columns they
   write, so every insert would have failed. Added `CreatedAt`/`CreatedBy`/
   `UpdatedAt`/`UpdatedBy` to match every other table.
6. `UserPoints."CreatedBy"` was `varchar(20)` where every other table uses
   `varchar(64)`. Widened.
7. `calculate_tallies()` moved from `Tables/UserPoints.sql` to
   `Functions/calculate_tallies.sql`, schema-qualified, and **given a WHERE clause**.
   Its `UPDATE "dbo"."UserTallies" SET "Amount" = (...)` had no WHERE, so a single
   insert into `UserPoints` overwrote every tally row in the table with that one
   user's balance.
8. `LeaveOrganization`: `DELETE FROM "dbo"."UserOrganizations" WHERE ... AND
   "UserTeams"."UserUUID" = _UserUUID` — filtered on a table not in the statement.
   Changed to `"UserOrganizations"."UserUUID"`.
9. `JoinOrganization`: returned `_IsOwner`, a variable that was never declared.
   Replaced with a subquery against `UserOrganizations`.
10. `init.sh`: added `set -e` and `-v ON_ERROR_STOP=1`. Every failure above was
    silent because psql exited 0 on error and the loop ignored it.

## Changes made while adding seeding and tests

11. **`JoinOrganization` and `JoinTeam` could never run.** Both declare
    `RETURNS TABLE(... "OrganizationUUID" ... )` / `... "TeamUUID" ...`, which
    makes those names plpgsql variables, and both then used the same names as
    bare column references — `ON CONFLICT ("UserUUID", "OrganizationUUID")`,
    and in `JoinTeam` also `WHERE "UserUUID" = _UserUUID AND "TeamUUID" =
    _TeamUUID`. Every call raised `column reference "..." is ambiguous`. The
    `ON CONFLICT` inference lists became `ON CONFLICT ON CONSTRAINT
    "UserOrganizations_UUIDs_UniqueKey"` / `"UserTeams_UUIDs_UniqueKey"`, and
    the `UPDATE` predicate is now table-qualified. Behaviour is otherwise
    unchanged. Found by the test suite.
12. `Security/Permissions.sql` took its database name and application user from
    psql variables instead of hard-coding `dbo` and `root`, and lost its
    `\connect`, so it can be applied to the scratch test database too.
13. `apply.sh` always creates the schema `dbo`, where `init.sh` previously
    created a schema named after `APP_DB_NAME`. Every object under `sql/` is
    written `"dbo"."Thing"`, so the schema name was never actually variable —
    changing `APP_DB_NAME` used to produce a database nothing could be built
    into.
14. `sql/Scripts/Seed.sql` was deleted. Its content lives on, expanded, in
    `sql/Seeds/Dev/`.

## Still broken — not touched, your call

- **`ForeignKeys/` was never run.** `init.sh` only looped over `Functions/` and
  `Tables/`. The folder existed but nothing applied it. Now wired in, which means
  these constraints take effect for the first time — expect the seed to surface any
  referential problems that were previously invisible.
- **No FKs at all** on `Teams`, `UserTeams`, `UserOrganizations`, `UserPoints`,
  `UserTallies`, `BadgeCategories.ParentBadgeCategoryUUID`, `Badges.BadgeCategoryUUID`,
  `Badges.OwnerUUID`. Their `*UUID` columns are plain `uuid NOT NULL`.
- **`Badges_Level_UniqueKey` is `UNIQUE ("BadgeUUID", "Level")`** where `BadgeUUID`
  is already the primary key, so the constraint can never reject anything. If the
  intent was one row per badge level, `Badges` needs a separate surrogate key.
- **`UserTallies` has no `CreatedAt`/`CreatedBy`**, so its `..._ModifiedInfo_Insert`
  trigger calls `update_modified_info` rather than `insert_modified_info`. That works,
  but the trigger name is misleading.
- **`GetUsers` authorises with `_LoginName = 'admin'`** — a hardcoded string — rather
  than checking `Users."IsAdmin"`. Anyone who registers the login `admin` gets the
  full user list.
- **`LoginUser` upserts on every call.** `INSERT ... ON CONFLICT DO NOTHING RETURNING
  "UserUUID" INTO _UserUUID` then discards `_UserUUID`. Any unknown login silently
  creates an enabled account.
- **`JoinTeam` takes no authorisation check**, unlike `JoinOrganization` which requires
  `IsOwnerOfOrganization`. Any caller can add any user to any team, and the following
  `UPDATE` lets them set `IsManager`.
- **`LeaveTeam` takes no authorisation check** either, unlike `LeaveOrganization`.
- **`GetTeams` returns one row per team *membership*, not per team.** It joins
  `UserTeams` without filtering or de-duplicating, so a team with three members
  comes back three times. The `IsManager` column is already computed by a
  correlated subquery, so the join earns nothing — a `DISTINCT`, or dropping the
  join, fixes it. Found while writing the tests.
- **`JoinTeam` does not require organization membership.** It will happily put a
  user on a team in an organization they do not belong to, and every read
  function then ignores the row: `IsMemberOfTeam` and `IsManagerOfTeam` both
  test organization membership too, so the membership exists but is invisible.
  Either `JoinTeam` should reject it or it should add the organization
  membership as well. Found while writing the tests.

Each of these has a `_KnownIssue` test locking in the current behaviour — see
below.

## Known issues covered by tests

These tests assert behaviour that is **wrong but current**, so that the suite
stays green and the defect stays visible and documented. Every one carries a
comment describing what correct would look like, and a failure message telling
you to replace the test rather than to fix the code.

| Test | Issue |
|---|---|
| `TestGetUsers_IgnoresIsAdmin_KnownIssue` | `GetUsers` authorises on the literal login `'admin'`, not on `Users."IsAdmin"` |
| `TestLoginUser_CreatesAnAccountForAnUnknownLogin_KnownIssue` | `LoginUser` silently creates an enabled account for any unknown login, with no credential check |
| `TestGetTeams_DuplicatesTeamsPerMember_KnownIssue` | `GetTeams` emits one row per membership rather than per team |
| `TestJoinTeam_AllowsAnyCaller_KnownIssue` | `JoinTeam` performs no authorisation check |
| `TestJoinTeam_CreatesUnreachableMembershipsForOutsiders_KnownIssue` | `JoinTeam` creates team memberships the read functions cannot see |
| `TestLeaveTeam_AllowsAnyCaller_KnownIssue` | `LeaveTeam` performs no authorisation check |
| `TestUpdateModifiedInfo_LeavesUpdatedByToTheCaller` | `update_modified_info` maintains `UpdatedAt` but not `UpdatedBy`; a caller who forgets it leaves the previous author's name on the row |

If one of these starts failing, the underlying bug was probably fixed — read the
comment above the test before changing anything.

`TestSchema_EveryTableHasAuditColumns` carries the one structural exemption:
`UserTallies` is allowed to lack `CreatedAt`/`CreatedBy`. Every other table is
required to have all four, so a new table without them fails the suite.

## Drafts

`sql/Drafts/` is the decomposed content of the former `Tables-ChatGPT.sql` and
`Functions-ChatGPT.sql`. Nothing in it is applied by `init.sh` and nothing was
deleted for referencing a missing table — those are flagged with a
`-- MISSING REFS:` header in the file instead.

It is a second, parallel schema: snake_case, `serial` integer keys, no audit columns,
and it references a `users(user_id)` table that does not exist anywhere in this repo.
The live schema is uuid-keyed and PascalCase. The two do not interoperate.

**Overlaps with the live schema** — flagged with `-- OVERLAP:` in each file:

| Draft | Live equivalent |
|---|---|
| `Badges`, `BadgeAchievements`, `BadgeCriteria`, `BadgeCategories`, `BadgeEvents`, `BadgeEventCriteria`, `BadgeGroups`, `BadgeGroupRelationships`, `BadgeReviews`, `BadgeStatistics`, `SharedBadges` | the matching `dbo.Badge*` tables |
| `UserBadges` | `dbo.UserBadges` |
| `PointTypes` | `dbo.Points` |
| `PointTransactions` | `dbo.UserPoints` |
| `UserPointTotals` | `dbo.UserTallies` |

The 11 badge tables were commented out in the original file, which lines up exactly
with the live `dbo.Badge*` tables — they look migrated already. They are kept as
drafts rather than deleted.

`Drafts/Tables/UserBadges.sql` is the one overlap carrying columns the live table
lacks: `EarnedDescription`, `ProgressGoal`, `ProgressCurrent`, `RevokedAt`. Worth
folding into `dbo.UserBadges` if badge progress tracking is still wanted.

### Duplicates resolved

- `ReversePointTransaction` was **defined twice** (lines 602 and 1161 of the old
  file). The second was an empty stub and, sharing a name, would have silently
  replaced the first at load time. Kept the implemented body.
- `GetPointsLeaderboard` and `GetPointLeaderboard` were the same function under two
  names. Merged into `GetPointLeaderboard`, keeping the `LEFT JOIN`/`COALESCE` shape
  but reading `UserPointTotals.Points` — the other version selected `upt.TotalPoints`,
  a column that table does not have.

Those two are the only objects removed. Nothing else was dropped, including tables
that reference a table which does not exist.

### Near-duplicates left alone — pick one when you migrate

Each pair is one implemented version plus one empty stub with the same job:

| Implemented | Stub covering the same ground |
|---|---|
| `TransferPoints` | `TransferPointsToUser` |
| `RedeemPointsForReward` | `ClaimRewardWithPoints` |
| `ApplyPointMultiplier` | `ActivatePointMultiplier` |
| `AddPointsToUser` | `AdjustUserPoints` |
| `RevokeBadgeFromUser` (takes a `Reason`) | `RemoveUserBadge` (identical DELETE, no reason) |

Three empty stubs all describe automatic badge assignment: `AssignBadgesAutomatically`,
`AutoAwardBadges`, `AssignBadgesBasedOnActivity`.

Four functions read `PointUsageLogs` with the same projection and differ only in their
WHERE clause — they collapse into one function with optional filters:
`GetUserPointTransactions` (no filter), `GetPointActivityHistory` (adds LIMIT),
`GetPointEarningsHistory` (`PointsChange > 0`), `GetPointTransactionsByType`
(`TransactionReason = $2`).

### Drafts do not currently compile

Independent of the missing `users` table, these will not load as written:

- **Shadowed parameters.** Dozens of bodies read `WHERE UserId = UserId`, where both
  sides resolve to the parameter — always true. Same for `Status = Status`,
  `RequestId = RequestId`, `StageId = StageId`. Affects most of
  `Drafts/Functions/GetApproval*.sql` and many procedures. The rename does not fix
  this; the parameter needs a distinct name (`_UserId`) or the column needs qualifying.
- **`DECLARE` after `BEGIN`.** `RedeemPoints`, `ApplyPointMultiplier`,
  `ReversePointTransaction`, `RedeemPointsForReward` all put `DECLARE` inside the
  executable block. plpgsql requires it before `BEGIN`.
- **`Limit` as a parameter name** in `GetPointLeaderboard`, `GetRecentlyEarnedBadges`,
  `GetPointTransferHistory` and others. Still broken after the rename: Postgres folds
  unquoted identifiers to lowercase, so `Limit` is the reserved word `limit` and
  `LIMIT Limit` will not parse. Needs a real rename, e.g. `RowLimit`.
- **`SELECT MultiplierFactor INTO MultiplierFactor`** in `ApplyPointMultiplier`
  assigns a variable from itself.
- `Tasks` references `TaskDependencies`, which is declared after it, and
  `TaskDependencies` references `Tasks` back — circular, so one direction has to
  become an `ALTER TABLE`.
