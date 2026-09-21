# Migrating API clients

This is an intentional breaking API change. The legacy React app has not been
migrated in this change. Retired `/v1/<feature>` URLs return 404; all GraphQL
operations now use `POST /graphql`.

| Old URL and field                  | New field                                                     | Arguments                             |
| ---------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| `/v1/users` `get`                  | `me`                                                          | none                                  |
| `/v1/users` `list`                 | `users`                                                       | `limit`, `offset`                     |
| `/v1/users` `login(Auth: {Value})` | **removed** — sign in at Keycloak                             | see below                             |
| `/v1/organizations` `list`         | `organizations`                                               | `limit`, `offset`                     |
| `/v1/organizations` `add`          | `addOrganization`                                             | `name`                                |
| `/v1/organizations` `join`         | **removed** — `inviteToOrganization` + `acceptInvitation`     | see below                             |
| `/v1/organizations` `leave`        | `leaveOrganization`                                           | `organizationId`, `userId`            |
| —                                  | `organization`                                                | `organizationId`                      |
| —                                  | `organizationMembers`                                         | `organizationId`, `limit`, `offset`   |
| —                                  | `setOrganizationRole`                                         | `organizationId`, `userId`, `isOwner` |
| —                                  | `renameOrganization`                                          | `organizationId`, `name`              |
| —                                  | `setOrganizationEnabled`                                      | `organizationId`, `isEnabled`         |
| —                                  | `invitations`                                                 | `limit`, `offset`                     |
| —                                  | `organizationInvitations`                                     | `organizationId`, `limit`, `offset`   |
| —                                  | `inviteToOrganization`                                        | `organizationId`, `email`, `isOwner`  |
| —                                  | `acceptInvitation` / `declineInvitation` / `revokeInvitation` | `invitationId`                        |
| `/v1/teams` `list`                 | `teams`                                                       | `organizationId`, `limit`, `offset`   |
| `/v1/teams` `add`                  | `addTeam`                                                     | `organizationId`, `name`              |
| `/v1/teams` `join` / `leave`       | `joinTeam` / `leaveTeam`                                      | `teamId`, `userId`                    |
| `/v1/badges` `list`                | `badges`                                                      | `organizationId`, `limit`, `offset`   |
| `/v1/points` `list`                | `points`                                                      | `organizationId`, `limit`, `offset`   |
| `/v1/tallies` `list`               | `tallies`                                                     | `organizationId`, `limit`, `offset`   |

## Signing in

**The API no longer issues tokens, and no operation is public.** Every request
needs `Authorization: Bearer <access token>` and the token comes from Keycloak,
not from here. Existing HS256 tokens stop working — there is no shared secret
left to verify them with.

The browser runs the standard authorization code flow with PKCE against the
realm and sends the access token it receives. Any OIDC client library does this;
point it at the discovery document and use the `main-gui` client:

```
issuer:    http://localhost:30003/realms/front-runner
discovery: http://localhost:30003/realms/front-runner/.well-known/openid-configuration
client_id: main-gui
flow:      authorization_code + PKCE (S256)
scope:     openid profile email
```

Send the **access** token, not the ID token; the API rejects the latter. Read
profile fields from `me` rather than from the token, and let the library refresh
the token — access tokens are valid for five minutes.

The only things answering without a token are `GET /health/live` and
`GET /health/ready`, which exist for the orchestrator and return nothing but a
status, and GraphQL introspection outside production, which describes the schema
and resolves no field. Everything in the schema needs a token, including `me`; a
call without one is `UNAUTHENTICATED` and never reaches the database.

## Joining an organization

`joinOrganization` is gone. An owner could use it to put any user into their
organization without asking, and membership now requires consent:

```graphql
mutation Invite($organizationId: String!, $email: String!) {
  inviteToOrganization(
    organizationId: $organizationId
    email: $email
    isOwner: false
  ) {
    InvitationUUID
    Status
    ExpiresAt
  }
}

query Waiting {
  invitations {
    InvitationUUID
    OrganizationName
    IsOwner
    ExpiresAt
    InvitedByLoginName
  }
}

mutation Accept($invitationId: String!) {
  acceptInvitation(invitationId: $invitationId) {
    OrganizationUUID
    Status
  }
}
```

`declineInvitation` is the invitee's refusal and `revokeInvitation` the owner's
withdrawal; both need the invitation to still be `Pending`.
`organizationInvitations(organizationId:)` is the owner's view of everything the
organization has issued, answered or not, and raises `FORBIDDEN` for anyone else
rather than returning an empty list.

## Running an organization

`organizationMembers` is the list an owner works from — every enabled member and
which of them own it. Any member can read it; an outsider gets `FORBIDDEN`.

```graphql
query Members($organizationId: String!) {
  organizationMembers(organizationId: $organizationId) {
    UserUUID
    LoginName
    Name
    Email
    IsOwner
    JoinedAt
  }
}

mutation Promote($organizationId: String!, $userId: String!) {
  setOrganizationRole(
    organizationId: $organizationId
    userId: $userId
    isOwner: true
  ) {
    LoginName
    IsOwner
  }
}
```

`leaveOrganization` now refuses to remove the last enabled owner, and
`setOrganizationRole` refuses to demote them — an organization with no owner has
nobody who can undo it. **Handing over is promote-then-step-down**, in that
order:

```graphql
# 1. setOrganizationRole(userId: successor, isOwner: true)
# 2. setOrganizationRole(userId: yourself,  isOwner: false)   # or leaveOrganization
```

Both refusals arrive as `BAD_REQUEST` with the reason in the message
(`The last owner cannot be demoted.`), so they can be shown to the user as-is.

`renameOrganization` and `setOrganizationEnabled` are the organization's
settings. Archiving is not deleting: memberships, teams, badges and point rows
all stay, and every read starts filtering the organization out.

```graphql
mutation Archive($organizationId: String!) {
  setOrganizationEnabled(organizationId: $organizationId, isEnabled: false) {
    Name
    IsEnabled
  }
}

# An archived organization is out of the default list. Its owner finds it again
# with includeArchived, or by id -- both of which still work once it is archived.
query Archived {
  organizations(includeArchived: true) {
    OrganizationUUID
    Name
    IsEnabled
  }
}
query One($organizationId: String!) {
  organization(organizationId: $organizationId) {
    Name
    OwnerCount
    IsOwner
    IsEnabled
  }
}
```

`organization` returns `null` rather than an error when the caller does not
belong to it — an error would confirm it exists. Every operation that returns an
organization reports `IsEnabled`, so a row means the same thing wherever it came
from.

```graphql
query Dashboard($organizationId: String!) {
  me {
    UserUUID
    Name
  }
  organizations(limit: 20) {
    OrganizationUUID
    Name
    IsOwner
  }
  teams(organizationId: $organizationId, limit: 20) {
    TeamUUID
    Name
  }
  points(organizationId: $organizationId, limit: 20) {
    PointUUID
    Amount
    ExpiresAt
  }
  badges(organizationId: $organizationId, limit: 20) {
    BadgeUUID
    Name
    EarnedAt
  }
  tallies(organizationId: $organizationId, limit: 10) {
    UserUUID
    Name
    Amount
  }
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
route in the old API either; clients now obtain tokens from Keycloak directly.
