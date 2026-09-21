# main-db schema notes

## Folder layout

SQL Server / SSDT style — one object per file, file name identical to the object name.

```
sql/
  Functions/        one function per file            (22)
  Tables/           CREATE TABLE only, no triggers   (20)
  Triggers/         one trigger per file             (42)
  ForeignKeys/      FK constraints, one file per table (8 files, 16 constraints)
  Security/         Permissions.sql
  Scripts/          Seed.sql
  Drafts/           not built; see "Drafts" below
    Tables/                                          (45)
    Functions/                                       (72)
    StoredProcedures/                                (97)
```

`init.sh` applies `Functions -> Tables -> ForeignKeys -> Triggers -> Security -> Scripts`.
Nothing under `Drafts/` is applied.

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
- **`Dockerfile` uses the legacy `ENV key value` form** and hardcodes
  `POSTGRES_PASSWORD admin`, while `init.sh` hardcodes `CREATE USER root WITH
  PASSWORD 'root'`.

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
