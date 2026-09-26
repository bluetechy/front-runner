# Logging in

Three cards: the login dialog from the supplied mock-up, wired to the identity
provider, its twin for making an account, and the small one for a forgotten
password. All three live in `src/authentication`, and one file inside it,
`identity-provider.ts`, is the only part of the app that talks to the provider
at all.

The provider owns accounts, passwords and sessions. `main-api` issues no tokens
and has no login operation: it verifies the access token the browser presents
and maps it onto a row with `dbo.ProvisionUser`. So "wiring up the login" means
wiring up the provider, and the API only ever sees the result.

This installation runs Keycloak, and the sections below say so wherever a
choice is really Keycloak's. Everything else is written against OpenID Connect,
which is what makes the provider replaceable: see
[changing identity provider](#changing-identity-provider).

## What the dialog does

| Control                                | Where it goes                                              |
| -------------------------------------- | ---------------------------------------------------------- |
| Email + password, **Login**, the ➜     | The provider's token endpoint, in the page. No redirect    |
| **Remember me**                        | Whether the refresh token outlives the tab                 |
| **Forgot Password**                    | Another card. It does not leave the site                   |
| **Sign Up**                            | The other card. It does not leave the site                 |
| **Verification code**, after a refusal | The same token endpoint, with the code beside the password |
| **Use a recovery code**                | `useRecoveryCode` on main-api. It does not login           |
| **Google / Facebook / Apple ID**       | The authorize endpoint, with the login-provider hint       |

Only the first of those completes in the dialog, and only the last three leave
the site: those are pages the provider hosts, and they come back to
`/auth/callback`.

None of those addresses is written down here. `identity-provider.ts` is told
one thing, `VITE_IDP_ISSUER_URL`, and reads the token, authorize and logout
endpoints from that address's `/.well-known/openid-configuration`, which every
OpenID Connect provider publishes. The document is fetched once per tab.

## The sign-up card

The header's **Sign Up** and the login card's "Don't have an Account?" open the
same card, and its "Already have an Account?" goes back. `LoginPromptProvider`
owns all three cards and shows one at a time ("two at once" is not a state it
can reach), so a link on any of them is that provider swapping which one is
showing rather than a dialog opening a dialog.

It asks for the six things Keycloak's own registration page asks for: first
name, last name, username, email address, password and a confirmation. The
realm does not use the address as the username (`registrationEmailAsUsername`
is false), which is why both are there. The confirmation box never leaves the
browser: it is a typing aid, and the API has no use for a second copy of a
password it is about to hash.

**A provider has no endpoint a browser may call to register somebody.** Its own
hosted page is its only self-service way in, and that page is at another
address, in another application's colors. So the account is made by `main-api`,
which holds the one service account on the realm allowed to make one:

```text
the card  →  register(account:) on main-api   →  the provider's admin API
          →  login(email, password) as usual  →  /dashboard
```

That mutation is `@Public`, because nobody registering has a session yet. It
opens no way in the realm did not already offer (`registrationAllowed` is true
on its hosted page), and it creates an enabled account with an unverified
address, a permanent password and no roles. See
`apps/main-api/src/registration` and `IdentityAdminService.createUser`.

Making the account and signing in with it are **two acts, in that order**, and
the card says which one failed. An account that was created and then could not
be signed into says so and points at the login card. Telling somebody their
account could not be created would send them to make a second one, which the
realm would refuse.

This application's own row is not written by either act. `dbo.ProvisionUser`
writes it from the verified token on the first request the new session makes,
the same as for somebody who arrived through Google.

## The forgot-password card, and the page its link lands on

**Forgot Password** on the login card opens the third card, and "Back to Login"
goes back. It asks for one thing, a username or an email address, because
Keycloak accepts either at a login prompt and somebody who has forgotten a
password should not also have to remember which of them they are known by.

Keycloak will mail a reset link, but only its own, pointing at its own page.
That page is the one this replaces, so the whole flow is ours:

```text
the card  →  requestPasswordReset(identifier:) on main-api
          →  the provider says which account that is
          →  dbo.StartPasswordReset writes the token
          →  our mail carries the link
/reset-password?token=…  →  resetPassword(token:, password:)
          →  dbo.SpendPasswordReset says whose it is
          →  the provider's admin API sets the password
```

Both mutations are `@Public`, because being unable to login is the situation.
What keeps that safe is written into each half:

- **The card says the same sentence whatever it was given.** The API answers a
  name that matches an account exactly as it answers one that does not, so the
  form cannot be asked who has an account here. A disabled account and an
  account with no address on it are nobody too.
- **The message goes to the email address the provider holds**, never to anything the
  form said, which is what stops it mailing a link wherever it is told to.
- **The token is the authorization** for the second half, the same argument
  `verifyEmail` rests on: it was only ever written into a message sent to the
  account's own mailbox. It is a random UUID, it is spent on first use, asking
  for a second link retires the first, and it expires after **an hour** rather
  than the day a verification link gets. A reset is acted on by somebody
  sitting there wanting to login.
- **It is spent before the password is set**, so a link that failed halfway is
  not still live in a mailbox. The way back from that is a new link.

The rows live in `dbo.PasswordResets`, which names its account by the token's
`sub` and has no foreign key to `dbo.Users`: an account can exist at the
identity provider with no row here yet, and somebody who registered and never
managed to login is exactly the person most likely to need this.

`/reset-password` is on the marketing shell, like `/verify-email`, and for the
same reason: it is opened by whoever reads the mailbox, in a browser with no
session in it. Unlike that page, nothing happens on arrival. The token is
spent when the new password is submitted, so a mail client that follows links
to preview them does not burn the link before anybody reads the message.

## The password grant, and what it costs

The mock-up asks for an email and a password on our own page. OpenID Connect's
answer to that is the authorization code flow, where the browser goes to
Keycloak's login page and our form never exists. Keeping the form means using
the **password grant** (`grant_type=password`), which the realm enables with
`directAccessGrantsEnabled` on the `main-gui` client.

That is a real trade, and it is worth naming:

- The password is typed into our page and passed through our JavaScript. With
  the redirect flow it is only ever seen by Keycloak.
- The grant is deprecated in OAuth 2.1 and Keycloak discourages it.
- **It cannot do anything interactive.** "Update your password",
  terms-of-service consent, account linking and every other Keycloak
  _required action_ needs a page to happen on, and the password grant has none —
  an account that owes one gets `invalid_grant` and cannot sign in from the
  dialog at all.

  **Multi-factor is the exception, and it is now built.** Keycloak's direct
  grant flow carries a conditional OTP subflow, so an account with an
  authenticator app can login from the card by sending the code with the
  password: see [the second factor](#the-second-factor). What stays true is
  everything else on this list — a required action still cannot be run from
  here, which is exactly why _setting up_ a second factor is a redirect.

The redirect flow is already built here, because the social buttons need it.
Turning the dialog's Login button into `startRedirect({ kind: "login" })`
is a one-line change if any of the above starts to matter — the cost is that
the mock-up's form stops being where people sign in.

## The second factor

An account with an authenticator app is asked for six digits as well as a
password, and the login card asks for them itself rather than handing the
browser to Keycloak. Keycloak's built-in `direct grant` flow carries a
conditional OTP subflow, so the code goes on the same token request:

```text
grant_type=password & username & password & totp=123456
```

`totp` is the parameter Keycloak's `direct-grant-validate-otp` reads first; it
answers to `otp` as well, and neither name is in OpenID Connect, so this is
one of the few provider-shaped lines in `identity-provider.ts`.

**The card cannot know when to ask, and does not pretend to.** Verified
against Keycloak 26.7.4: a wrong password, a missing code, a wrong code, an
account that does not exist and a disabled account all answer

```text
400  {"error":"invalid_grant","error_description":"Invalid user credentials"}
```

byte for byte. That is deliberate on Keycloak's part — a login form that
answered differently could be asked which accounts have two-factor
authentication on — so the dialog does the only honest thing: after **any**
refusal it keeps what was typed, adds a code box under it, and says both of
the things the refusal can mean. Somebody without a second factor reads it as
"check your password"; somebody with one fills in the box.

A code is good **once**: the realm sets `otpPolicyCodeReusable` false, so
pressing Login twice inside the same thirty seconds is refused even though the
app is still showing those digits. A refusal with a code already in the box
says to wait for the next one rather than to try again.

Two other paths need no code at all and are unaffected: the social buttons,
because Keycloak's own browser flow asks for it on its own page, and
`refresh_token`, because the session is already established.

### Setting one up, and getting back in without it

Neither of those is the dialog's. Setting up an authenticator app is a
redirect to Keycloak with `kc_action=CONFIGURE_TOTP`, started from the
security page, because the secret is minted there and shown once. Spending a
recovery code is a `@Public` mutation on main-api, offered by this card under
the code box, because Keycloak's token endpoint will accept nothing but a
valid code and there is no way through it for somebody whose phone is gone.
Both are written up in [the security page's notes](./security-page.md).

What the card owes somebody who spends one is the sentence: the second factor
is now **off**, and the ordinary password login in front of them is what gets
them in. A recovery code is not a session and this flow never produces one.

### Checking a password for an account that has one

`IdentityAdminService.verifyPassword` authenticates to answer its boolean,
which on the built-in flow would be impossible to pass for exactly the
accounts that need it most: Keycloak refuses the grant without a code, and
the question being asked is about a password. So the realm defines a
**`direct grant password only`** flow — username and password, no conditional
OTP — and binds it to the confidential `main-api` client through
`authenticationFlowBindingOverrides`.

That client's secret lives in main-api and nowhere else, which is what keeps
the arrangement honest: nothing else can reach that flow, no token it mints
leaves the method, and the way into the product is still the browser's client,
whose direct grant asks for the second factor like everybody else. **A public
client bound to that flow would be a way past two-factor authentication for
anyone who knew its name.**

## Where the tokens live

Access tokens are held **in memory only**, in the `SessionProvider`. The
refresh token is the one thing that outlives the page, and "Remember me" picks
where it goes:

- checked → `localStorage`, so the session survives closing the browser
- unchecked → `sessionStorage`, so it lasts as long as the tab

Neither is proof against a script running on this origin. The honest place for
a browser session is an `HttpOnly` cookie set by a server of our own, and this
installation has no such server — the browser talks to Keycloak directly. That
is the same trade the rest of this design makes, written down.

Access tokens last five minutes. `getAccessToken()` refreshes anything within
30 seconds of expiry before handing it out, and collapses concurrent callers
onto one refresh.

## The redirect flow

Social sign-in leaves the page, so it uses the authorization code flow with
**PKCE**: the realm allows nothing else, and only `S256`. Registration and
password reset no longer leave. `RedirectIntent` has one kind, and neither
Keycloak's hosted registration page nor its reset-credentials page is an
address this app sends anybody to.

1. `startRedirect()` makes a verifier, stores it in `sessionStorage`, and sends
   the browser to Keycloak with the S256 challenge.
2. Keycloak (and, for a social button, the provider behind it) does the work.
3. `/auth/callback` trades the code and the verifier for tokens.

The verifier and the code are each good for exactly one exchange, which is why
`auth.callback.tsx` keeps the in-flight exchange on a ref. Without that,
StrictMode's second pass in development finds the verifier already spent and
reports a sign-in that actually succeeded as unverifiable.

## Social sign-in needs credentials before it works

The realm defines `google`, `facebook` and `apple` — Apple as a generic OIDC
provider, because Keycloak ships no Apple one — but all three are
`"enabled": false` with placeholder client IDs, since real ones can only come
from Google, Meta and Apple.

The buttons are wired anyway, and degrade honestly: a hint naming a provider
the realm does not have enabled is ignored, so the button lands on the hosted
login page instead of erroring. Keycloak spells that hint `kc_idp_hint` and
other providers spell it otherwise, so the parameter's name is
`VITE_IDP_HINT_PARAMETER` rather than a constant; empty sends no hint and every
button goes to the hosted page. Filling in the credentials and
flipping `enabled` is the whole activation — see
[`apps/keycloak-idp/README.md`](../../keycloak-idp/README.md).

The buttons are ordered by **how likely somebody is to hold an account**
rather than alphabetically: they are a call to action, and the one most people
can press belongs where the eye lands first. The same three are listed
alphabetically on the security page, which is the same rule rather than a
different one -- that card is a list to look a row up in rather than a button
to press, so it is ordered the way a list is read. See
[the security page's notes](./security-page.md).

The same three providers are on the security page, where the question is the
other way round: connecting one to an account that already exists. That is
Keycloak's own account-linking endpoint rather than a login, and the browser
reaches it through `accountLinkUrl` in `identity-provider.ts` — the one address
in that file discovery does not publish, since OpenID Connect has nothing to
say about linking. `VITE_IDP_LINK_PATH` is where the path comes from, with
`{provider}` standing in for the alias, and an empty value turns the Connect
buttons off the way an empty hint parameter turns the social buttons into
trips to the hosted page.

**Connecting takes two legs**, and the reason is the password grant below: a
token minted without the browser ever meeting Keycloak names a session the
browser holds no cookie for, and the linking endpoint refuses it. So Connect
takes the ordinary redirect first and carries on with the token that comes
back. The whole flow is written up in
[the security page's notes](./security-page.md).

## Changing identity provider

Keycloak is a choice, not an assumption, and the code is arranged so that the
choice is small. What a swap actually costs:

| Where                                               | What changes                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `VITE_IDP_ISSUER_URL`, `VITE_IDP_CLIENT_ID`         | Point at the new issuer. Every endpoint follows from discovery                       |
| `VITE_IDP_HINT_PARAMETER`                           | The new provider's name for the social hint, or empty                                |
| `VITE_IDP_LINK_PATH`                                | Where the new provider links an account, or empty if it has no such flow             |
| `VITE_IDP_ACTION_PARAMETER`, `VITE_IDP_TOTP_ACTION` | How the new provider is asked to run its own authenticator-app setup, or empty       |
| `IDP_ISSUER_URL`, `IDP_JWKS_URL`, `IDP_AUDIENCE`    | `main-api`'s half of the same three facts                                            |
| `IDP_ACCESS_TOKEN_TYPE`                             | What the provider stamps `typ` with. Keycloak writes `Bearer`                        |
| `apps/main-api/src/authentication/`                 | A new file beside `keycloak-admin.service.ts`, and one `useClass` line in the module |
| `apps/keycloak-idp/`                                | Replaced wholesale: an image, a container and whatever provisions it                 |

What does **not** change: the four verticals that ask for an account
(`registration`, `emails`, `password-reset`, the guard) inject
`IdentityAdminService`, which is five methods and no realms. Their tests drive
that port, so they pass unchanged against a new provider. In the browser, only
`identity-provider.ts` knows a provider exists.

What is genuinely provider-shaped and has to be redone by hand: the realm
import in `apps/keycloak-idp/realm`, the social provider aliases, the mail
templates, and the user-visible copy that names the real thing (the privacy
page's list of processors, and the dashboard's "Identity from Keycloak" label).
Naming the actual processor is the point of that copy, so it is not something
an abstraction should hide.

## Where things are

```
src/authentication/
  identity-provider.ts the issuer, discovery, and every call to the provider
  session.tsx          SessionProvider / useSession: who is signed in
  login-prompt.tsx     the three cards, one at a time, and who may open them
  login-dialog.tsx     the mock-up's card
  sign-up-dialog.tsx   its twin, for making an account
  forgot-password-dialog.tsx  the third card: ask for a reset link
  reset-password.tsx   the page that link lands on
  registration.ts      the register mutation on main-api
  registration-schema.ts  what a new account may be, in the browser
  password-reset.ts    the two reset mutations on main-api
  second-factor-setup.ts  the trip out to set up an authenticator app, and back
  recovery-code.ts     spending a recovery code, without a session
  password-reset-schema.ts  what a reset may ask for, in the browser
  storage.ts           localStorage/sessionStorage that cannot throw
src/dashboard/         where a completed sign-in lands
src/routes/
  dashboard.tsx        /dashboard
  _site.auth.callback.tsx  /auth/callback — the redirect round trip
  _site.reset-password.tsx  /reset-password, where a reset link lands
```

`SessionProvider` is in `main.tsx`, outside the router, because it is not a
page. `LoginPromptProvider` is in `PageShell`, inside the router, because two of the
cards navigate when a sign-in completes, to `/dashboard`, which is the one page
that is not inside `PageShell`; see [the dashboard](dashboard.md).

## Color

The mock-up draws this card in slate with a blue button. Those are the only
colors in it that do not belong to this product, so the card is rebuilt in the
violet field's palette and the button takes the same magenta gradient as every
other contained button. The layout is the mock-up's; nothing defines a color
of its own, per [codebase structure](codebase-structure.md).

## Verifying it

`testuser` / `test.user@northwind.test`, password `testuser`, is seeded in both
Keycloak and the database for exactly this. See
[the test account](../../../README.md#the-test-account).

The signed-in page shows the Keycloak identity beside the account `main-api`
returned for the same token, which is the only view that proves the whole chain
rather than just the form.
