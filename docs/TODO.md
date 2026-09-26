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
