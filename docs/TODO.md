# What is waiting on something

Work that is written, reviewed and merged, and cannot be finished here because
it needs a thing this repository does not have: an account somewhere, a
decision, a real address. It is not a backlog of ideas. Nothing goes on this
page that could simply be done.

Each item says what is blocked, what unblocks it, exactly what to do when it
does, and how you know it is finished.

Scoped lists live with the thing they are about and link here rather than
keeping a second copy:
[privacy and cookies](privacy-follow-ups.md) for the policy, and the
"what is not here yet" section on each page's own document for anything that
is merely unbuilt.

---

## 1. SMS has never been tested against a real Twilio account

**Blocked on.** A Twilio account, which is deliberately not being opened until
the site is close to earning. Until then there are no credentials, so
`SmsService` reports itself unavailable, the SMS row on Security & Access
draws switched off, and the gateway route refuses every caller.

**What is already proven, so that this is not re-verified from scratch.** The
whole path works against a stub gateway on the Compose network: enrollment
writes and spends a code, Keycloak's `sms-code.ftl` form renders and accepts a
correct code and completes a browser login, the password grant refuses and
re-refuses in the right shapes, and the send budget holds. What has never
happened is Twilio's API being called and a handset ringing.

**To do when the credentials exist.**

1. Put `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER` in
   `.env`. Nothing else changes: `SmsService` reads exactly those three and
   reports itself available when all three are set.
2. `make dc3-up-d`, then add a real number on Security & Access and answer the
   code. The row should read **CONFIGURED** with the last four digits.
3. Log out and log in on the card. The grant is refused, the code box appears,
   the texted code is accepted.
4. Log in at Keycloak's own page (`/realms/front-runner/account`) to put
   `sms-code.ftl` in front of a real message, including **Send another code**.
5. Read one delivered message end to end. `apps/main-api/src/sms/sms.copy.ts`
   is the wording, and it has never been seen on a handset: check that the
   product name reads right, that the number is the only number in it, and
   that nothing in it looks like something to reply to.
6. Watch the first bill. Both limits are per account, so a run of accounts is
   still a run of messages, and nothing caps the realm as a whole.

**Done when** a message arrives on a real handset from both paths, the login
completes with it, and the copy has been read by somebody on the phone that
received it.

**Watch for.** Twilio rejects numbers outside the account's geography on trial
accounts, which arrives here as `send` returning false and the dialog saying
"That code could not be sent to that number", the same sentence a mistyped
number gets. If that happens, the number is probably fine and the account is
not yet allowed to text it.

---

## 2. A passkey cannot be used to login yet

**Blocked on.** A decision, which is the kind of blocker this page is for:
whether this product's login card stops trading an email address and a
password for tokens itself and hands the browser to Keycloak's own page
instead.

Passkeys are registered, listed and removed today. The Passkeys card on
Security & Access sends the browser to Keycloak with
`kc_action=webauthn-register-passwordless`, the ceremony runs on the
provider's origin, and main-api reads the credential list afterwards. What
does not work is spending one at our own login box, and no amount of work in
this repository makes it work: **a password grant has no browser in it.** The
WebAuthn ceremony is a conversation between an authenticator and a browser
against a specific origin, and the token endpoint is neither.

So the choice is between two products, not two implementations:

- **The login card keeps the password grant.** A passkey stays what it is
  today: a credential that works when somebody logs in at
  `/realms/front-runner/account` and does nothing on our own page. The card
  says so, in those words, and nothing else changes.
- **The login card hands the browser to Keycloak.** Passkeys work, and so
  does everything else Keycloak's page can do. The cost is the whole reason
  the password grant is there: the login card is this product's own, in this
  product's type, with this product's copy and this product's error
  sentences, and it would become a redirect to somebody else's page. It also
  moves the second factor, the SMS step and the recovery-code flow onto that
  page, all three of which were built here deliberately.

A third shape exists and is worth pricing before either: **keep the card and
add one button on it**, "Login with a passkey", which is the only thing that
takes the trip out. Everything else on the card stays as it is. That is the
smallest change that makes a registered passkey worth having, and it is
probably the answer, but it is still a decision about what the login page
is.

**To do once it is decided**, for the third shape:

1. Add a WebAuthn passwordless step to the realm's browser flow: a copy of
   `browser with sms forms` with `webauthn-authenticator-passwordless` as an
   ALTERNATIVE beside `auth-username-password-form`. The policy it runs
   against is already in `front-runner-realm.json`.
2. Add the button to `login-dialog.tsx`. It starts an ordinary authorize
   redirect with no `kc_action` on it, which is a trip
   `identity-provider.ts` can already make.
3. Take the second paragraph off the Passkeys card in `security.tsx` --
   "Our own login box cannot use one yet" -- and the sentence about it in
   `passkey-setup.ts`. Both exist only to keep the card honest while this is
   true, and both would become a lie the day it is not.

**Done when** a passkey registered on Security & Access logs somebody in
from this product's own login card, with no password typed, and the card no
longer says it cannot.

**Watch for.** Keycloak's registration page names the relying party from
`webAuthnPolicyPasswordlessRpEntityName`, which is set to "Front Runner".
Changing the host Keycloak is served from invalidates every passkey already
registered against the old one: the credential is bound to the origin, and
there is no migration for that, only a page of passkeys that have quietly
stopped working.
