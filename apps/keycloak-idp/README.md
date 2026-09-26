# keycloak-idp

Keycloak, the installation's identity provider. It owns accounts, passwords,
sessions and sign-in; `main-api` owns what an account is allowed to do once it
is signed in, and the two meet at a signed access token.

Keycloak is Apache 2.0 licensed and a CNCF incubating project. Nothing here is
gated behind a paid edition.

## What this image is

`quay.io/keycloak/keycloak:26.7.4`, rebuilt for PostgreSQL and carrying one
provider of this repository's own. The Dockerfile has three stages: Maven
compiles `plugin/` into a JAR, that JAR is dropped into
`/opt/keycloak/providers`, and then `kc.sh build` indexes it along with the
database vendor and the feature set, so that the container starts with
`start --optimized` instead of re-deriving its configuration on every boot.

The order matters: `kc.sh build` is what makes a provider visible, so a JAR
copied in after it is a JAR Keycloak never sees, and the symptom is a realm
flow naming an authenticator that does not exist.

Changing `KC_DB`, the feature set or anything under `plugin/` means rebuilding
the image:

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
- **`main-api`** — an audience, and one narrow login. The standard and
  implicit flows are disabled; it exists so that tokens can be addressed to
  the API, and `main-gui` carries an audience mapper that puts it in the
  access token's `aud`. Without that mapper Keycloak stamps `aud: account` and
  the API rejects every token. It also holds a direct grant bound to
  **`direct grant password only`**, which is how main-api checks a current
  password — see [direct access grants](#direct-access-grants).
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

**It does apply to a password written in the clear in the realm import**, and
that is worth knowing because it stops the container starting: Keycloak checks
`credentials[].value` against the policy as it imports each user, refuses
`testuser` / `testuser` for want of a special character, and exits with
`ERROR: Failed to start server in (production) mode`. So the seeded accounts
carry **pre-hashed** credentials instead — `secretData` and `credentialData`,
pbkdf2-sha512, which is how Keycloak's own exports come back in and is not a
password anybody is choosing. The passwords are still the ones the README
documents; only their spelling in the file has changed.

Regenerate one with:

```sh
node bin/seed-credential.mjs testuser
```

and paste what it prints into that account's `credentials`. The salt is
random, so the same password prints differently every time, which is the point
of a salt.

This was added after the realm had already been imported here, so it is in the
same position as the SMTP server and the identity providers: a clone starting
from an empty volume gets it, and an existing installation needs `make
dc3-clean` or the same line in the admin console under Authentication →
Policies.

## The event log, and why only three events are in it

`eventsEnabled` is on, and `enabledEventTypes` holds exactly three types:
`LOGIN_ERROR`, `LOGOUT` and `REFRESH_TOKEN_ERROR`. `view-events` is on the
`main-api` service account beside `manage-users`, `view-users` and
`view-identity-providers`.

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

**`main-api` has one too now, on a flow of its own.** It checks that the
password somebody typed into the change-password card, or beside a recovery
code, is the one the account has — and Keycloak has no endpoint that checks a
password without issuing something, so it authenticates and throws the session
away on the next line. On the built-in flow that check would be impossible to
pass for exactly the accounts that most need it: an account with an
authenticator app is refused without a code, and the question being asked is
about a password. So the realm defines:

- **`direct grant password only`** — a top-level `basic-flow` holding
  `direct-grant-validate-username` and `direct-grant-validate-password`, both
  REQUIRED, and no conditional OTP,

and binds it to `main-api` with `authenticationFlowBindingOverrides`, whose
`direct_grant` names that flow by id.

That client is **confidential**, and that is what keeps the arrangement
honest: its secret lives in main-api, nothing else can reach the flow, and no
token it mints leaves the method that asked. The way into the product is still
`main-gui`, whose direct grant asks for the second factor like everybody else.
A public client bound to this flow would be a way past two-factor
authentication for anyone who knew its name.

A wrong password on either client is an ordinary `LOGIN_ERROR` on this realm,
and the security page shows it as a Failed login, deliberately.

The trade is deliberate and is written up in
[the GUI's authentication notes](../main-gui/docs/authentication.md). The part
worth repeating here is the operational one: **the password grant cannot run a
required action**. A forced password change, terms-of-service consent and
account linking all need a page to happen on. An account that owes one gets
`invalid_grant` and cannot sign in from the dialog — only through a redirect
flow. Turning any of those on for this realm means moving the dialog's Login
button to the redirect flow the social buttons already use.

Multi-factor used to be on that list and no longer is: a code is not a
required action, it is an execution in the direct grant flow, and the dialog
sends it with the password. See below.

## Two-factor authentication

The realm's OTP policy is written out rather than left to defaults, because
the login card's second step is built against these numbers:

```
otpPolicyType totp · HmacSHA1 · 6 digits · 30s · look-ahead 1 · codes not reusable
```

`otpPolicyCodeReusable: false` is the one worth knowing about. A code is good
**once**, so pressing Login twice inside the same thirty seconds is refused
even though the app is still showing those digits, and the card says to wait
for the next one rather than to try again.

The authenticator app needed no flow of its own to begin with: Keycloak's
built-in `direct grant` and `browser` flows already carry a conditional OTP
subflow. They are no longer the flows this realm runs — SMS needed its own
executions, and adding them meant a copy of each, described under
[SMS](#sms) — but the OTP half of those copies is the built-in
arrangement unchanged (`conditional-user-configured` +
`direct-grant-validate-otp`, and `auth-otp-form` in the browser). An account
with an authenticator app is asked for a code on the token endpoint, and one
without is not.

**Setting one up cannot be done through the admin API.** It can list
credentials and delete them, and there is no operation anywhere that creates
an OTP credential — the secret is minted by Keycloak and shown to a person
once, as a QR code. So the security page sends the browser here with
`kc_action=CONFIGURE_TOTP`, Keycloak runs its own setup page, and the browser
comes back to `/auth/callback` with `kc_action_status`. main-api then reads
the credential list to find out what really happened; the status on the URL is
a claim and is not believed.

Turning it off **is** an admin call: `DELETE /users/{id}/credentials/{id}`,
where 404 is success.

### SMS

Keycloak ships no SMS authenticator, so this repository has one:
`plugin/`, a Maven module compiled into the image. It is **two**
authenticators, not one, and the second is the one that is easy to forget.

| Provider id         | Where it runs         | What it reads back                         |
| ------------------- | --------------------- | ------------------------------------------ |
| `sms-authenticator` | The hosted login page | the `sms_code` field on its own form       |
| `sms-direct-grant`  | The password grant    | the `sms_code` form parameter on the grant |

Shipping only the first is the standard way a second factor ends up with a
hole in it: the token endpoint would keep answering to a password alone, and
everything the login page enforces could be skipped by asking for a token
directly.

**The decision is Keycloak's and the delivery is main-api's.** The code is
generated in the authenticator, held in Keycloak's single-use object store
against the account for five minutes, and compared there; what the plugin asks
main-api for is that six digits be carried to a number. That is one
authenticated POST to `/internal/sms/second-factor`, which writes the message
itself and will not carry one it is handed. Twilio's credentials and the
wording of the message stay in one place, beside the mail this product already
sends. See `apps/main-api/src/sms`.

Two settings, read from the environment by the plugin rather than from realm
configuration, because a secret in realm configuration is a secret in the
realm export and the realm export is a file in this repository:

```
SMS_GATEWAY_URL=http://main-api:3000/internal/sms/second-factor
SMS_GATEWAY_SECRET=...
```

With either of them missing, the authenticator refuses the login rather than
letting it through: a factor the site cannot apply must not be a factor the
site waves past.

**A code is good for one guess.** It is spent on being read rather than on
being right, so a wrong code costs a fresh message. Six digits is a fifth of a
million, which is nothing against a form that allows retries and a great deal
against one that does not.

**How often a login code can be asked for is `SmsSendBudget`'s answer.** It
had to be written here rather than in main-api, because a login code never
goes near `dbo.StartPhoneVerification`: it is minted and held by `SmsCode` in
Keycloak's single-use store, and main-api only carries it. Two limits, a
little tighter than enrollment's because a login is a shorter conversation:

- Thirty seconds between messages to an account.
- Five messages to an account in fifteen minutes.

The budget is claimed before each send, and there are more sends than there
look to be. The first sight of the step sends one, **Send another code** sends
one, and a wrong code sends one, because a code is spent on being read. That
last is the reason the budget exists at all: the rule that makes six digits
safe also turns a guessing loop into a spending loop, so the count has to run
across guesses rather than across logins.

Two things it does rather than send:

- **A code already outstanding is reused.** Reloading the form, or re-posting
  the password grant without a code, gets the step again and costs nothing.
- **Over budget refuses the login.** It never waves it through. The browser
  page says which wait it is, in `smsCodeTooSoon` and `smsCodeTooMany`; the
  token endpoint answers `invalid_grant` like everything else there, because a
  distinct answer would tell anybody posting a name that the account exists
  and has SMS on it.

The store gives no compare-and-set, so two requests arriving together can both
read the same count and both send. That is accepted: this is a cost guard
rather than a security boundary, and one extra message inside the window
changes nothing worth defending. The enrollment limit is one SQL statement and
does not have the problem.

#### The number, and where it lives

On the account at Keycloak, as the `phoneNumber` attribute, with
`phoneNumberVerifiedAt` beside it. Not a credential: there is no secret to
store, because what an SMS factor proves is possession of a handset.

It is written by main-api through the admin API and **only** after a code sent
to it has been typed back — see
[the security page](../main-gui/docs/security-page.md#two-factor-authentication).
An unproved number written onto an account would be a second factor pointing
at somebody else's phone, which is the whole attack that pair of operations
closes.

Two things about it cost time to find out, so they are written down here:

- **Keycloak 24 turned on the declarative user profile and disabled unmanaged
  attributes with it.** An attribute the profile does not declare is dropped
  on an admin write, silently: the request is accepted, and the number is not
  there afterwards. The realm import cannot fix this, because the importer does
  not create the user profile component at all (verified against 26.7.4 by
  importing one and finding the realm still on the stock four attributes). So
  the plugin does it, from a listener on realm creation, setting the unmanaged
  attribute policy to `ADMIN_EDIT` — readable and writable by an administrator
  and by main-api's service account, invisible on the account holder's own
  forms. See `SmsRealmSetup.java`. On a realm that already exists, it is Realm
  settings → General → Unmanaged attributes → _Only administrators can write_.
- **An admin user update clears what it leaves out.** A `PUT /users/{id}`
  carrying only `attributes` wipes the email address, the first name and the
  last name, and the account is then refused at the token endpoint with
  "Account is not fully set up". main-api reads the whole account and writes
  the whole account back.

#### The flows

Both authenticators have to be in a flow to do anything, so the realm defines
four more and binds two of them:

- **`browser with sms`** (bound as `browserFlow`) — cookie, identity-provider
  redirector, then `browser with sms forms`: the username and password form,
  then `browser with sms second factor`, a CONDITIONAL subflow holding
  `conditional-user-configured` and then `auth-otp-form` and
  `sms-authenticator` as ALTERNATIVEs.
- **`direct grant with sms`** (bound as `directGrantFlow`) — username,
  password, then `direct grant with sms second factor` on the same shape, with
  `direct-grant-validate-otp` and `sms-direct-grant` as the two ALTERNATIVEs.

ALTERNATIVE rather than REQUIRED, so an account with both an authenticator app
and a phone number is asked for one of them rather than both, and can switch
between them with Keycloak's own "Try another way".

`main-api`'s own client is unaffected: its `authenticationFlowBindingOverrides`
still points at `direct grant password only`, which has no second factor in it
at all.

### Recovery codes are not Keycloak's either

Keycloak has a recovery-codes feature behind a preview flag; this product does
not use it. The codes live in `dbo.RecoveryCodes` and are spent through
main-api, because the situation they exist for is the one where Keycloak
cannot help at all: its token endpoint will accept nothing but a valid code
from the authenticator app that has been lost. Spending one removes the OTP
credential through the admin API, after which the ordinary password login
works. See
[the security page](../main-gui/docs/security-page.md#recovery-codes).

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

## Connecting one to an account that already exists

The security page's SINGLE SIGN-ON (SSO) card reads these providers, connects
one, and disconnects one. Three of those four verbs are main-api's, through the
admin API: the instances on this realm, an account's federated identities, and
deleting one. **Connecting is not**, and cannot be: proving somebody holds a
Google account means sending a browser to Google, so it is Keycloak's own
client-initiated account linking that does it, at

```
/realms/front-runner/broker/<alias>/link?client_id=&redirect_uri=&nonce=&hash=
```

where the hash is the nonce, the token's `session_state`, the client id and the
alias, hashed and base64url-encoded. The browser builds it — see
`identity-provider.ts` in the GUI, which is the only file there that knows a
provider exists, and `VITE_IDP_LINK_PATH`, which is where the path itself comes
from.

Two conditions have to hold, and both are this realm's business rather than the
browser's:

- **The account needs `manage-account-links`**, which comes with the `account`
  client's `manage-account` role and so with the realm's default role. An
  account that has had the default role taken away is refused at the endpoint.
- **The browser needs a session cookie on this realm**, and the hash has to
  match the session it is for. This is the direct access grant's bill coming
  due: a login through the GUI's own card mints a token without the browser
  ever meeting Keycloak, so there is no cookie and the endpoint would answer
  "session not active". The GUI answers that by sending the browser round the
  ordinary authorization-code flow first and carrying on with the token that
  comes back — two legs, written up in
  [the security page's notes](../main-gui/docs/security-page.md).

Keycloak sends the browser back to `redirect_uri` when it is done, and the GUI
treats what lands there as a claim rather than an outcome: main-api asks this
realm whether the provider really is connected before anything is recorded.

**Reading the provider list needs `view-identity-providers`** on the `main-api`
service account, which is a fourth role beside the three above. This is one of
the settings a running installation will not have, for the reason at the top of
the event-log section: the realm file is imported once. On an existing Keycloak
database it is `make dc3-clean`, or the role added by hand in the admin console
under Clients, main-api, Service accounts roles. Until then Keycloak answers
403, the card says the provider would not give it the list, and it draws no
rows at all rather than claiming the site offers nothing.

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
