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

## 2. The SDK has no npm scope to be published under

**Blocked on.** An npm account and a registered scope. The package is
`@front-runner/widget-sdk` in `packages/widget-sdk`, is `private: true`, and is
installed today only as a workspace member by `apps/client-gui`.

**Why it cannot simply be done.** A published package name is permanent, and a
scope has to be registered before the first publish rather than added to it
later. Getting that wrong is not a mistake you can correct: it is a second
package, a deprecation notice on the first, and every customer's `package.json`
pointing at the wrong one.

**What is already decided, so that this is not re-argued.** The name is
`@front-runner/widget-sdk`. The license is written and is in
`packages/widget-sdk/LICENSE.md`; `package.json` says
`"license": "SEE LICENSE IN LICENSE.md"`, which is the correct spelling for a
proprietary license and is deliberately not `"UNLICENSED"`. `files` already
lists `dist`, `LICENSE.md` and `README.md`.

**To do when the account exists.**

1. Register the `@front-runner` scope, before anything else.
2. Decide public registry or private. The license is a legal control, not a
   technical one: publishing publicly means anybody can download the code. If
   access itself has to be gated, that is a private registry or token-gated
   distribution, and it is a different decision from the license.
3. Remove `"private": true` from `packages/widget-sdk/package.json`.
4. Make the build emit a `/*! ... */` legal banner and check it survives a
   production build of a real consumer application. The
   notice-preservation clause in the license is meaningless if a bundler strips
   the notice, and terser and esbuild keep only that comment form.
5. Add a NOTICE file if there is ever an ordinary dependency. There are none
   today, which is the cheapest time to get this right.
6. `npm publish --workspace @front-runner/widget-sdk --access restricted` (or
   `public`), from a clean tree with the build output current.

**Done when** `npm install @front-runner/widget-sdk` works in an application
outside this repository, renders a published widget, and the license banner is
visible in that application's production bundle.

**Watch for.** A no-derivatives license is unusual enough that some corporate
legal departments will flag it, which is real sales friction. Worth knowing
before it ships rather than after.

---

## 3. The license is waiting on two facts and a lawyer

**Blocked on.** Front Runner, LLC.'s state of formation and county, and a
review by counsel.

**What is affected.** `packages/widget-sdk/LICENSE.md`, Section 11, which names
the governing law and the venue and carries `[STATE]` and `[COUNTY]` where those
belong. They are the only unfilled values in the document; everything else is
written as the terms that ship.

**To do.**

1. Replace `[STATE]` (twice) and `[COUNTY]` with the real values.
2. Have counsel read the whole of it. The four clauses most worth their
   attention are the build-tool carve-out in Section 2, which is what makes the
   no-modification grant usable at all; the reverse-engineering carve-out in
   Section 4, which exists because the EU Software Directive grants rights a
   contract may not exclude; the termination language in Section 5, which says
   that copies already inside a shipped application are not clawed back; and
   the liability cap in Section 10.
3. Put the same terms wherever else they are needed. A hosted platform needs
   terms of service as well, and this license covers only the SDK.

**Done when** counsel has signed off and no bracketed value is left in the file.

**Watch for.** The license is referenced from
`packages/widget-sdk/README.md` and from `package.json`. Changing the file's
name or location breaks both, and `files` in `package.json` is what puts it in
the published package at all.

---

## 4. A widget read is unauthenticated, uncounted and rate-limited by nobody

**Blocked on.** A decision about who holds a delivery credential, which is a
product decision rather than a piece of work: it settles what a tenant is, what
they are given, and what it is scoped to.

**What exists today, so that this is not mistaken for nothing.**
`GET /widgets/:widgetId` refuses any browser whose `Origin` is not listed in the
widget's own definition, echoes only a checked origin, never answers `*`, and
carries `Vary: Origin` on every answer including the refusals. A widget listing
no origins can be rendered from nowhere. The id is 32 hex characters of
randomness, so definitions cannot be enumerated. That is the whole of it, and
[the API's widget documentation](../apps/main-api/docs/widgets.md#the-origin-check)
says why each piece is shaped that way.

**What is missing, and why it needs the decision first.** CORS is a rule
browsers keep; it stops another page spending a widget and stops nothing coming
from `curl`. A per-tenant key would give the endpoint something to check, count
and throttle, and something to scope to one tenant's widgets. Two questions
decide the shape of all of it:

- **Who owns the allowlist.** Today it is per widget, inside the document, which
  means publishing a version is also how the list changes. If a tenant owns a
  list of origins instead, that is a column beside the key and a page to edit it,
  and the per-widget list becomes a narrowing of the tenant's rather than the
  whole rule.
- **What the key may reach.** A key that can only fetch one tenant's already
  public render JSON is a very different thing to lose than one that can reach
  the API.

**To do when those are answered.**

1. Add the credential and its origins wherever a tenant lives.
2. Check the key on every widget read, before the origin, and scope the read to
   that tenant's widgets.
3. Count reads per key, and give the ingress a per-key limit to enforce. Reads
   are what this endpoint spends.
4. Keep the origin rules exactly as they are: exact origins, no wildcards, no
   suffix matching, `null` refused by name, `Vary: Origin` everywhere.

**Done when** a page on an unregistered origin cannot render a widget, a request
with no browser in front of it is refused by the key check rather than by CORS,
and the developer who owns the key can see why without asking anybody.

**Watch for.** Closing this down after customers are embedding widgets breaks
every one of them on the day it closes. The origin allowlist is enforced from the
first release for exactly that reason, and a key has to arrive the same way:
required from the moment it exists.
