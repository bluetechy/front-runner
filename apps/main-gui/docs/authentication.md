# Signing in

The sign-in dialog from the supplied mock-up, wired to Keycloak. It lives in
`src/authentication` and is the only part of the app that knows Keycloak
exists.

Keycloak owns accounts, passwords and sessions. `main-api` issues no tokens and
has no login operation — it verifies the access token the browser presents and
maps it onto a row with `dbo.ProvisionUser`. So "wiring up the login" means
wiring up Keycloak, and the API only ever sees the result.

## What the dialog does

| Control                            | Where it goes                                       |
| ---------------------------------- | --------------------------------------------------- |
| Email + password, **Login**, the ➜ | Keycloak's token endpoint, in the page. No redirect |
| **Remember me**                    | Whether the refresh token outlives the tab          |
| **Forgot Password**                | Keycloak's reset-credentials page; it emails a link |
| **Sign Up**                        | Keycloak's registration page, returning signed in   |
| **Google / Facebook / Apple ID**   | Keycloak's authorize endpoint with `kc_idp_hint`    |

Only the first of those completes in the dialog. The rest are pages Keycloak
hosts, so they leave the site and come back to `/auth/callback`.

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
- **It cannot do anything interactive.** Multi-factor, "update your password",
  terms-of-service consent, account linking and every other Keycloak
  _required action_ need a page to happen on, and the password grant has none —
  an account that owes one gets `invalid_grant` and cannot sign in from the
  dialog at all.

The redirect flow is already built here, because the social buttons need it.
Turning the dialog's Login button into `startRedirect({ kind: "login" })`
is a one-line change if any of the above starts to matter — the cost is that
the mock-up's form stops being where people sign in.

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

Social sign-in, registration and password reset all leave the page, so they all
use the authorization code flow with **PKCE** — the realm allows nothing else,
and only `S256`.

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

The buttons are wired anyway, and degrade honestly: `kc_idp_hint` naming a
provider the realm does not have enabled is ignored, so the button lands on
Keycloak's own login page instead of erroring. Filling in the credentials and
flipping `enabled` is the whole activation — see
[`apps/keycloak-idp/README.md`](../../keycloak-idp/README.md).

## Where things are

```
src/authentication/
  keycloak.ts          every Keycloak URL and token-endpoint call
  session.tsx          SessionProvider / useSession: who is signed in
  login-prompt.tsx     the one dialog instance, and "offer it once per tab"
  login-dialog.tsx     the mock-up's card
  storage.ts           localStorage/sessionStorage that cannot throw
src/signed-in/         where a completed sign-in lands
src/routes/
  signed-in.tsx        /signed-in
  auth.callback.tsx    /auth/callback — the redirect round trip
```

`SessionProvider` is in `main.tsx`, outside the router, because it is not a
page. `LoginPromptProvider` is in `PageShell`, inside the router, because the
dialog navigates when a sign-in completes.

## Colour

The mock-up draws this card in slate with a blue button. Those are the only
colours in it that do not belong to this product, so the card is rebuilt in the
violet field's palette and the button takes the same magenta gradient as every
other contained button. The layout is the mock-up's; nothing defines a colour
of its own, per [codebase structure](codebase-structure.md).

## Verifying it

`testuser` / `test.user@northwind.test`, password `testuser`, is seeded in both
Keycloak and the database for exactly this. See
[the test account](../../../README.md#the-test-account).

The signed-in page shows the Keycloak identity beside the account `main-api`
returned for the same token, which is the only view that proves the whole chain
rather than just the form.
