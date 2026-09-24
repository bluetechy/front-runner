# keycloak-idp

Keycloak, the installation's identity provider. It owns accounts, passwords,
sessions and sign-in; `main-api` owns what an account is allowed to do once it
is signed in, and the two meet at a signed access token.

Keycloak is Apache 2.0 licensed and a CNCF incubating project. Nothing here is
gated behind a paid edition.

## What this image is

`quay.io/keycloak/keycloak:26.7.4`, rebuilt for PostgreSQL. The two-stage
Dockerfile runs `kc.sh build` so that the container starts with
`start --optimized` instead of re-deriving its configuration on every boot.
Changing `KC_DB` or the feature set means rebuilding the image:

```sh
make dc3-build && make dc3-up-d
```

It runs in production mode against the `keycloak` database in `main-db`, not
against the embedded development store. That database is created by
`apps/main-db/bin/keycloak-db.sh` and is never touched by `make db-rebuild` or
`make db-clean` — dropping it would destroy every account in the installation.

## The realm

`realm/front-runner-realm.json` is imported **once**, when Keycloak starts on an
empty database. After that Keycloak's own database is the source of truth and
editing the file changes nothing. To start over, drop the Keycloak database and
restart the container.

That matters for the sign-in dialog: direct access grants, the `testuser`
account, the three identity providers and the SMTP server were all added to
this file after the realm had already been imported here, and were applied to
the running installation through the admin API as well. A clone starting from
an empty volume gets them from the import. An installation whose Keycloak
database already exists gets them only from `make dc3-clean`, or by making the
same changes in the admin console.

It defines:

- **`main-gui`** — the browser client. Public, no secret, authorization code
  with PKCE (S256) only. Redirect URIs cover `localhost` on 80, 3000 and 5173,
  which covers `/auth/callback` on each. **Direct access grants are on**, so
  the app's own sign-in dialog can exchange an email and password for tokens
  without leaving the page — see below.
- **`main-api`** — an audience, not a login. Every flow is disabled; it exists
  so that tokens can be addressed to the API, and `main-gui` carries an
  audience mapper that puts it in the access token's `aud`. Without that
  mapper Keycloak stamps `aud: account` and the API rejects every token.
- **A development account per seeded user**, with the password equal to the
  username. The usernames match `apps/main-db/sql/Seeds/Dev/02_Users.sql`, so
  `dbo.ProvisionUser` claims the seeded row on first sign-in instead of
  creating a second account beside it.
- **`testuser`** (`test.user@northwind.test`), seeded in the database as well,
  for exercising the sign-in dialog. See
  [the test account](../../README.md#the-test-account).
- **`newhire`**, who has no application account at all. They hold the pending
  invitation in `45_OrganizationInvitations.sql`, so signing in as them and
  accepting it exercises the whole join flow from nothing.

Self-registration is on, which is the point of the model: anyone can make an
account, and that account belongs to no organization until somebody invites it
into one.

## The password policy

`passwordPolicy` on the realm, and it is the **authority** for what a password
may be anywhere in this product:

```
length(12) and maxLength(72) and upperCase(1) and lowerCase(1)
and digits(1) and specialChars(1) and notUsername and notEmail
```

Twelve characters with all four character classes, which is PCI DSS 4.0's
shape. NIST 800-63B would have length alone and no composition rules at all,
and the reason this realm does not follow it there is that nothing here checks
a password against a breach list, which is the half of that advice that does
the work. The upper bound is bcrypt's: past 72 bytes the rest is not hashed.

Keycloak enforces it wherever a password is set, which is all three of the
routes this product has: the sign-up form, the page a reset link lands on, and
the change-password card on Security & Access. main-api and main-gui each state
the same rules in front of it, so that somebody is told all five at once and in
our own sentences rather than one at a time in Keycloak's. Those copies are
convenience; this line is the rule. See
[the security page](../main-gui/docs/security-page.md#what-a-password-has-to-be).

**It does not apply to passwords that already exist.** A policy is checked when
a password is set, not against what is stored, so the development accounts
below still have the username as the password and still login. What they cannot
do is change a password to another one like it.

This was added after the realm had already been imported here, so it is in the
same position as the SMTP server and the identity providers: a clone starting
from an empty volume gets it, and an existing installation needs `make
dc3-clean` or the same line in the admin console under Authentication →
Policies.

## The event log, and why only three events are in it

`eventsEnabled` is on, and `enabledEventTypes` holds exactly three types:
`LOGIN_ERROR`, `LOGOUT` and `REFRESH_TOKEN_ERROR`. `view-events` is on the
`main-api` service account beside `manage-users` and `view-users`.

Those three are there for one feature, and they are the things the security page
needs that **main-api cannot see from the request path**:

- `LOGIN_ERROR` because a refused password mints no token, so a failed login
  never reaches main-api at all. Keycloak's event log is the only place it exists.
- `LOGOUT` because logging out is a call the browser makes straight to here. The
  browser does report it to main-api as well, and that report is faster and knows
  the device, but it cannot cover a logout from Keycloak's own account pages, from
  another application on this realm, or from a browser closed before the report
  could be sent.
- `REFRESH_TOKEN_ERROR` because it is the only trace of a session that ended with
  nobody deciding to end it: an idle timeout, a session past `ssoSessionMaxLifespan`,
  or one somebody revoked. It carries a session id and no user, which is why the
  mirror resolves the account from the login it already recorded for that session.

See `apps/main-api/src/security-events/provider-events.service.ts`.

**The list is three types rather than Keycloak's default of all of them**, which
is deliberate. Left at the default, Keycloak would keep a row for every successful
login, token refresh, registration and password reset on the realm, in a second
store nothing reads and no retention rule of ours reaches. The security page
already records the ones it needs in `dbo.SecurityEvents`, under a twelve-month
rule it enforces itself. So this log keeps only what is not already kept
somewhere better, and `eventsExpiration` drops those after thirty days.

`adminEventsEnabled` is left off: it records what administrators changed, and
the only administrator on this realm is main-api's own service account doing
things this application already logs.

**This is one of the settings a running installation will not have**, for the
reason at the top of this section: the file is imported once. On an existing
Keycloak database, either `make dc3-clean` or set it by hand in the admin
console (Realm settings, Sessions, Events, then the service account's role
mapping). Until then main-api will say so once in its output and record
nothing, which is the same thing it says when the provider is down.

## Direct access grants

`main-gui` has `directAccessGrantsEnabled: true`, which turns on OAuth's
password grant. Without it the GUI's sign-in dialog cannot work at all: a
public client has no other way to turn an email and a password into a token
inside the page, and Keycloak answers `unauthorized_client`.

It has a second reader now. main-api borrows this client for one call:
checking that the password somebody typed into the change-password card is the
one the account has. Keycloak has no endpoint that checks a password without
issuing something, so it is asked to authenticate and the session is thrown
away on the next line. `main-api`'s own client has every flow disabled and
cannot answer a direct grant at all, which is why the browser's client is the
one that does. A wrong password there is an ordinary `LOGIN_ERROR` on this
realm, and the security page shows it as a Failed login, deliberately.

The trade is deliberate and is written up in
[the GUI's authentication notes](../main-gui/docs/authentication.md). The part
worth repeating here is the operational one: **the password grant cannot run a
required action**. Multi-factor, a forced password change, terms-of-service
consent and account linking all need a page to happen on. An account that owes
one gets `invalid_grant` and cannot sign in from the dialog — only through a
redirect flow. Turning any of those on for this realm means moving the dialog's
Login button to the redirect flow the social buttons already use.

## Identity providers

`google`, `facebook` and `apple` are defined but **disabled**, with placeholder
client IDs — real ones only come from Google, Meta and Apple. Apple is a
generic `oidc` provider because Keycloak ships no Apple one.

To turn one on: create the OAuth app with the provider, set its redirect URI to
`http://localhost:30003/realms/front-runner/broker/<alias>/endpoint`, then put
the client id and secret into the realm and enable it — in the admin console,
or in `front-runner-realm.json` before a first import.

The GUI's buttons are wired either way. They send `kc_idp_hint=<alias>`, and
Keycloak ignores a hint naming a provider that is not enabled, so an
unconfigured button lands on Keycloak's own login page rather than an error.

## Mail

The realm's SMTP server is **Mailpit**, on the Compose network. Keycloak needs
one for the mail it sends itself, and `main-api` sends its own through the same
server: the verification links on the security page, and the "forgot password"
link, which is ours rather than Keycloak's because it points at our own page.
Mailpit accepts everything and delivers nothing, so a message stops at its web
inbox on <http://localhost:30004> rather than leaving the machine.

## Local development only

`sslRequired: "none"` and `KC_HTTP_ENABLED=true` let the realm work over plain
HTTP on a published port. Both are wrong anywhere real. So are the bootstrap
admin credentials in the repository `.env`, and so are the account passwords in
the realm file.

## Addresses

- Admin console — <http://localhost:30003/admin> (`admin` / `admin`)
- Account console — <http://localhost:30003/realms/front-runner/account>
- OpenID configuration —
  <http://localhost:30003/realms/front-runner/.well-known/openid-configuration>

Inside the Compose network it is `http://keycloak-idp:8080`. That split matters:
the token's issuer is the published address the browser used, while `main-api`
fetches signing keys over the mesh. `IDP_ISSUER_URL` and `IDP_JWKS_URL` are
configured separately for exactly this reason.
