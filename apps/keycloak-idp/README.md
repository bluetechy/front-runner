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

## Direct access grants

`main-gui` has `directAccessGrantsEnabled: true`, which turns on OAuth's
password grant. Without it the GUI's sign-in dialog cannot work at all: a
public client has no other way to turn an email and a password into a token
inside the page, and Keycloak answers `unauthorized_client`.

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
fetches signing keys over the mesh. `KEYCLOAK_ISSUER_URL` and
`KEYCLOAK_JWKS_URL` are configured separately for exactly this reason.
