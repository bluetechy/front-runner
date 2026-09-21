# Migrating API clients

This is an intentional breaking API change. The legacy React app has not been
migrated in this change. Retired `/v1/<feature>` URLs return 404; all GraphQL
operations now use `POST /graphql`.

| Old URL and field | New field | Arguments |
| --- | --- | --- |
| `/v1/users` `get` | `me` | none |
| `/v1/users` `list` | `users` | `limit`, `offset` |
| `/v1/users` `login(Auth: {Value})` | `login(value:)` | base64 credentials string |
| `/v1/organizations` `list` | `organizations` | `limit`, `offset` |
| `/v1/organizations` `add` | `addOrganization` | `name` |
| `/v1/organizations` `join` / `leave` | `joinOrganization` / `leaveOrganization` | `organizationId`, `userId` |
| `/v1/teams` `list` | `teams` | `organizationId`, `limit`, `offset` |
| `/v1/teams` `add` | `addTeam` | `organizationId`, `name` |
| `/v1/teams` `join` / `leave` | `joinTeam` / `leaveTeam` | `teamId`, `userId` |
| `/v1/badges` `list` | `badges` | `organizationId`, `limit`, `offset` |
| `/v1/points` `list` | `points` | `organizationId`, `limit`, `offset` |
| `/v1/tallies` `list` | `tallies` | `organizationId`, `limit`, `offset` |

Only `login` is public. Send `Authorization: Bearer <JWT>` for other operations.
The old Basic-header fallback is removed. Existing expiring HS256 tokens with
`LoginName` continue to work with the same secret and an enabled account. New
login tokens contain minimal claims; read profile fields from `me`, not the token.

```graphql
mutation Login($credentials: String!) {
  login(value: $credentials) {
    UserUUID
    LoginName
    Token
  }
}

query Dashboard($organizationId: String!) {
  me { UserUUID Name }
  organizations(limit: 20) { OrganizationUUID Name IsOwner }
  teams(organizationId: $organizationId, limit: 20) { TeamUUID Name }
  points(organizationId: $organizationId, limit: 20) {
    PointUUID Amount ExpiresAt
  }
  badges(organizationId: $organizationId, limit: 20) {
    BadgeUUID Name EarnedAt
  }
  tallies(organizationId: $organizationId, limit: 10) { UserUUID Name Amount }
}
```

Use GraphQL variables for user-supplied values. Inputs above are GraphQL `String`
UUIDs validated by the server. Response identifier fields use GraphQL `ID`.
Response fields retain their existing PascalCase names.

Important contract changes:

- `Amount` is a **String**, e.g. `"12.3400"`. Use decimal arithmetic when exact
  calculations are required. Do not convert it blindly to JavaScript Number.
- Dates are ISO strings; `ExpiresAt` remains nullable. Badge responses also expose
  `EarnedAt` and `EarnedDescription` from the current database function.
- Lists are bounded, not complete exports. Iterate with `limit`/`offset`; pages can
  shift under concurrent changes. Tallies are sorted by amount and default to 50;
  request `limit: 10` to retain the old endpoint's ten-row size.
- Team writes now enforce organization ownership/management rules. A caller who
  previously relied on missing checks may receive `FORBIDDEN`.
- A join operation's `IsOwner`/`IsManager` result follows existing SQL semantics;
  refetch the list for actor-relative membership state after a mutation.
- GraphQL errors expose a message and code, without internal exception details.
  Authentication failures use `UNAUTHENTICATED`, denied actions `FORBIDDEN`, and
  input validation `BAD_REQUEST`. Inspect the GraphQL `errors` array even on HTTP 200.
- Production disables introspection; generate client types from a development
  instance or a separately reviewed schema artifact.

Existing GraphQL support does not yet include subscriptions or automatic nested
relations. The schema is ready to evolve deliberately without exposing tables
wholesale. The historical frontend reference to `/v1/tokens` was not backed by a
route in the old API either; clients should use the documented login mutation.
