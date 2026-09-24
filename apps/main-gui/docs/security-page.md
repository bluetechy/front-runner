# The security page

Lives in `src/security` and renders at `/security-and-access`, which is
Security & Access in the rail. What it holds today is the account's **user
name**, its **email addresses** and its **recent activity**: what the account
is called, which addresses are on file, which one is the login, which of them
anybody has proved they can read, and what has lately happened to the account.
Passwords and sessions belong to Keycloak and are not here yet.

The route was `/security` and the rail read Security & Login until both were
renamed. The vertical kept its own name: `src/security` is the subject, not
the URL.

It replaced the "coming soon" placeholder that route used to render.

## The user name

`user-name-card.tsx`, the first card on the page, headed **USER NAME**. One
read-only field holding the name the account logs in with, and a paragraph
above it saying why it is read-only.

It is **drawn as a field and is not one**. The value is the same kind of thing
as the addresses under it and belongs in the same kind of box, so it takes
`CardField` with `readOnly`: the card's gray fill, an edge that does not
deepen under the pointer, and nothing that takes a keystroke. A line of plain
text would have been the honest drawing of a value nobody can change, and it
would have read as a caption rather than as one of the account's names.

Nothing in this application writes a user name back. Keycloak assigns it at
sign-up, `dbo.ProvisionUser` copies it out of the token on every login, and
there is no screen that sends it anywhere. So the paragraph says so first,
rather than leaving somebody to discover it by typing into a box that quietly
refuses them. It also says the other half: the name is what the other members
see beside your name and what they type to flag you, which is the reason an
account keeps one name rather than a series of them.

The mention is **shown rather than described**. "@" in front of the name is
the whole convention, so the sentence writes one out, `@username`, rather than
spelling out what an example settles. It is `@username` whoever is reading it:
the example stands for the shape of a mention, and the field directly under it
is where this account's own name is.

It says **two ways in**, the name or the email address marked primary, because
the realm has `loginWithEmailAllowed` and Keycloak holds exactly one address
per account. Saying only "your email address" would have been an invitation to
try one of the others and be refused. The copy says "email address" every time
rather than "address", which on the profile page is a street. That holds
across the whole page now, and across the messages behind it: see [email
address, not address](../../../docs/writing.md#email-address-not-address).

The value comes off the **token**, not the API. `useSession` already holds
what Keycloak said at login, and a page that only reads a value has nothing to
fetch for it.

It sits **above the addresses** because it is the one identifier here that
never changes: what the account is called, and then everything about it that
can be added to, removed, and moved.

It was the profile form's first field until this card existed. A user name is
not something a person wrote about themselves, which is what that form holds;
it is how the account is addressed, which is this page's subject. The field
itself moved with it: `CardField` and `FieldRow` live in `src/card-field` now,
beside `card-surface`, because a component two pages share is a piece of the
card rather than a piece of either page.

## The table

`email-list.tsx`. Four columns, from a supplied mock-up: **Primary**,
**Email**, **Status**, **Action(s)**. One row per address, separated by the
card's own rule, and a last row that adds one.

The Primary column holds the radio and nothing else. It was an unheaded column
with a pill saying **Primary** two columns further along, which said the same
word twice and said it in the column that is about something else; the radio is
the only mark on the row now, and the heading over it is what names it.

The Status column carries pills rather than sentences: **Verified** in teal,
**Unverified** in the accent's pink, from `brand.statusPills`. That is the
same pair the toast uses, for the same reason: a pill says what happened, it
does not offer anything. The word is the whole message and the color only agrees with
it, which is the rule the rest of the product follows. See
[text boxes and the pills beside them](style-guide.md#teal-and-faces).

The Action(s) column is **glyphs rather than words**, and it is plural because
most rows offer two of them: a bin to remove the address and a link to send
the verification mail again, both at the same size, because two actions in one
column at two sizes read as one important and one not. Each carries its name
for anybody who cannot see it, Remove and Send link, and a tooltip that says
the same thing to anybody who can.

Neither appears where it could do nothing. **Delete is on every row but the
primary**, whether or not anybody has verified it: reading the address has
nothing to do with giving it up. The primary cannot be deleted, because an
account whose login resolves to no address has no way back in, and a verified
address has nothing left to prove, so it is offered no second link.

The primary's row shows a **dash** where the others show a bin. It keeps the
column's shape and says there is nothing here to press, and it is hidden from
a screen reader, which the checked radio on the same row has already answered
for. It said "Sign-in address" in words before, which was a third place the
row said the same thing.

The surface is `CardSurface`, the white card the dashboard, the profile and the
wallet all use. The paragraph above the table runs the width of that card
rather than stopping at a measure of its own: a line of prose capped well short
of the table under it reads as a column that lost its second half.

It is a grid rather than a `<table>`. Every row here is a form control and a
label, and a grid keeps them in source order when the columns stack at `xs`.
Stacked, the radio keeps a column of its own beside the three lines rather than
becoming a fourth line above them: there is one of it per row, not one per
line.

## The primary is a radio, and there is one of it

The radio in the Primary column is the address the account logs in with, and
there is exactly **one across the list** — so the table is a single
`RadioGroup` over the whole thing rather than a control per row. That is the
arrangement [the
wallet](wallet-page.md#the-default-is-a-radio-and-there-is-one-of-it) uses for
the default payment method, and it is here for the same reasons.

Choosing one is a save. The group shows what the API last returned rather than
what was clicked, so a refused change leaves the mark where it was.

**Choosing a primary does not reorder the list.** `dbo.GetUserEmails` sorts on
`CreatedAt` and nothing else, so the address the account started with stays at
the top and the only thing that moves a row is adding or removing one.

**An unverified address has no radio at all.** Nobody has proved they read it,
and a login is not a thing to hand over on an unproven address.
`dbo.SetPrimaryUserEmail` refuses it as well, so the missing control is
agreeing with the rule rather than being it.

It is absent rather than disabled, for the reason the primary row has no
Delete: there is nothing to do about it in that column. What is missing has to
be answerable somewhere else on the row, and it is. The Status column says
**Unverified** and the Action(s) column offers **Send link**, which is the
thing that changes the answer.

## The last row adds an address

A field in the Email column, nothing in Primary or Status, and **Add** in the
Action(s) column. A row rather than a dialog, because it is one field and a
dialog for one field is a door in front of a doorway.

Nothing goes in either of the middle columns, because there is nothing known
about an address that does not exist yet: it cannot be the login before it is
an address, and a pill reading "Unverified" before it was added would be
describing something that is not there.

The field is drawn the way every text box on card paper is drawn: the card's
own edge around it, the card's ink in it, `0.7rem` corners. It was the theme's
dark-panel field before, which on white paper is a white box on a white card
with no edge at all, and it was hard to see there was a box there. See
[text boxes](style-guide.md#text-boxes).

The field checks the address in the browser through `email-schema.ts`, which is
a copy of main-api's `emails.schema.ts`. The two are meant to say the same
thing and that one is the authority; this one exists so a typo is refused
beside the box that caused it rather than after a round trip.

## Verification

Adding an address mails a link to it. main-api mints the token, `dbo.AddUserEmail`
stores it, and the link lands on `/verify-email` — a **marketing-shell** route,
not one behind the login.

That is the whole point of the feature. The link is opened by whoever reads the
mailbox, which is exactly the thing being proved, and it may be a browser with
no session in it. So `verifyEmail` is the one `@Public` operation in the API and
the token on the URL is the authorization. It is spent on first use and it stops
working after twenty-four hours.

`verify-email.tsx` holds its attempt in a ref, because the token is good for
exactly one exchange and StrictMode runs every effect twice in development.
Without it a verification that succeeded would be reported as one already used.
The same trap `_site.auth.callback.tsx` documents.

## Making an address primary changes a login

This is the only thing on the page that reaches outside the application.
Keycloak holds one address per account and it is the credential, so
`setPrimaryEmail` is **two writes that have to agree**: `dbo.SetPrimaryUserEmail`
for this application's copy, and Keycloak's admin API for the identity
provider's. The database goes first because it is the one that refuses.

Two consequences worth knowing:

- The realm's `main-api` client has a **service account** holding
  `manage-users` and `view-users` and nothing else. `--import-realm` only
  applies to an empty Keycloak database, so a stack that predates this needs
  the client configured once by hand.
- A token is minted once and used until it expires, so the token in the browser
  still carries the **old** address right after the change. `dbo.ProvisionUser`
  is given the token's `iat` and ignores an address on a token that predates
  the primary row's last write. Without that the change would undo itself on
  the very next request, which is exactly what it did before the parameter
  existed.

## The privacy switch

`privacy-card.tsx`, under the table, in a card headed **EMAIL PRIVACY**. That
heading is `CardSurface`'s own small uppercase label, the same one EMAIL
ADDRESSES has over the table, so the two blocks on the page are named the same
way and the switch's block carries no heading of its own.

The switch sits **on that title line**, opposite the heading and centered
against it, which is what `CardSurface`'s `action` row is for: the heading
names the setting and the control is the answer to it. That makes this the one
card on the page that draws its own surface, because the card and the control
have to be one component to sit in one row. The paragraph underneath is tied to
the switch with `htmlFor` rather than by being wrapped in it, so clicking the
copy still moves the switch now that the two are in different halves of the
card.

It withholds the address from the members list other people in your
organizations read: `dbo.GetOrganizationMembers` and `dbo.SetOrganizationRole`
return an empty `Email` for an account that is private, and the name and login
name stay.

**Private is where every account starts.** `dbo.ProvisionUser` writes a
`dbo.UserProfiles` row holding `EmailIsPrivate` true when the account is
created, the column defaults to true, and every reader of it treats a missing
row the same way: `dbo.GetUserProfile`, main-api's `settings`, and the hook in
`email-api.tsx`, which shows Private until the first answer arrives rather than
showing Public and correcting itself. An address is something a person hands
out, not something a members list helps itself to, so the switch is read as the
way an address is given away rather than the way it is taken back.

That changed a default that had been the other way, and it changed it for
everybody: an account that had never touched the switch was public before and
is private now. There are no migrations here, so the change is the column
default plus `make db-rebuild`, and nothing had to be written over. A
development database built before that still holds the old default until it is
rebuilt, which is what a switch reading Public on a page whose code says
Private means.

The demo dataset carries the setting explicitly for `jdoe`, the account this
page is demonstrated on: `47_UserProfiles.sql`. A seeded account is claimed by
`dbo.ProvisionUser` rather than created by it, so it never goes through the
insert that would have written the row, and seeding one puts the demo account
in the state a real new account is already in.

The word beside the switch is **Private** or **Public**, not On or Off. On
says the switch moved; Private says what that did, and it is a state rather
than an event. The paragraph explains the setting in those same two words, so
the control and the copy are not describing it separately, and it opens by
saying which one the reader is already in.

That paragraph runs the width of the card, the way the one above the table
does, and it is **one paragraph**, caveat included. It leads with the state
the account is already in, because a setting somebody has been given reads as
a promise and a setting they have to go and find reads as a chore. The caveat
used to sit on a line of its own, where on a card this wide it read as a
footnote somebody else added rather than as part of the promise: what it does
and what it does not do belong in the same breath. It does not remove the
address from the account, from mail already sent, or from an administrator's
reach, and a security page is the last place to promise more than the query
delivers.

The switch itself is repainted for the paper: Material draws it for a dark
surface, and off is the state that shows least of all. Both ends come off
`brand.cardSwitch*`. See [switches](style-guide.md#switches).

It is stored on `dbo.UserProfiles."EmailIsPrivate"` and written by
`dbo.SetUserEmailPrivacy`, which is a function of its own rather than a trip
through `dbo.SetUserProfile`: that one writes the profile form's seventeen
fields, and a switch that submitted a whole profile to move one boolean would
overwrite whatever the profile page had open.

## Recent activity

`activity-list.tsx` and `activity-dialog.tsx`, in a card headed **RECENT
ACTIVITY** under the addresses. Built from two supplied mock-ups, which are
Google's "Recent security activity" and the card behind one of its rows.

It sits under the addresses because it is the record of what has been done to
them and to everything else about getting in: the page says what the account
is, then what can be changed about it, then what has changed. The privacy
switch stays last, because it is a preference rather than a way in.

### The table

The **same table the addresses are drawn in**: a grid rather than a `<table>`,
the card's own rule between rows, pills from `brand.statusPills` in Status, and
a right-aligned action column. Two lists on one page drawn two ways would read
as two different kinds of thing. Four columns:

| Column       | What is in it                                                          |
| ------------ | ---------------------------------------------------------------------- |
| **When**     | the day, and the hour under it in the card's quieter ink               |
| **Activity** | the sentence the event was recorded with, and the device and the place |
| **Status**   | **New**, **Recognized** or **Reported**                                |
| **Action**   | a chevron that opens the dialog                                        |

Two departures from the mock-up. It groups rows under a **heading per day**,
which is what the When column does here instead: a date heading buys a day's
rows one shared line, which is worth it in a list with one thing on each row
and not worth it in a table whose first column is already the date. And it
gives the device and the place a **column of their own**, which most rows here
would leave empty: a login knows both and an address being added knows neither,
so they go on a muted line under the sentence, and a row with neither draws no
line.

The Action heading is **singular**, where the addresses' is Action(s). A row
here offers exactly one thing, and a heading promising more would be counting
wrong on all of it.

The column shows the **sentence**, not the type. "New login" over a row loses
which address was added and which device logged in, and the sentence is written
where the event is recorded, which is the only place that knows. `activity-kinds.ts`
turns the type into the heading the dialog uses, the way `notification-kinds.ts`
turns a notification type into an icon, and it has the same answer for a type it
has not met: the name spaced out, rather than an empty heading.

Time is **written out rather than counted back from**. The bell says "2 days
ago" because what matters there is freshness; somebody deciding whether a login
was theirs is placing it against their own day, and "3 days ago" makes them do
the arithmetic that decides whether to report it. `activity-time.ts` is that,
through `Intl.DateTimeFormat`.

**Every row opens**, answered or not. An answer can be changed, and somebody who
pressed the wrong button is exactly who needs the way back in; the Status column
is what says which rows are still asking.

### The dialog

`activity-dialog.tsx`: when it happened and whether it is new, what it was, what
it would mean if it was not you, the device and the place, and then the
question. It is the violet panel the wallet's dialogs and the login sit on, for
the reason written on `wallet/method-dialog.tsx`: what is taken from a Google
mock-up is the layout, and what is not is the color.

**Neither answer is painted.** They are the same outlined button twice, which
is [the rule the cookie notice made](cookie-consent.md) and the only other
place in this product where what a button is painted is settled by something
other than taste: a contained button on one of two answers is a nudge, and the
nudge here would land on somebody deciding whether their account has been broken
into. The glyphs tell them apart and the words say the rest.

The warning line is only on the kinds where being wrong about the answer is
expensive: a login, a password, the address the login moved to. A sentence
about risk on every row is a sentence nobody reads by the third one.

And the dialog **says what "No" will do before it is pressed**, because what it
does is send a message: a link to choose a new password, and nothing else
touched. Somebody who is not told to expect it will not know to go and open it.

### Saying no does something

"No, secure account" is two writes and a message. `dbo.ReviewSecurityEvent`
records the answer and logs a second event saying the alarm was raised (a
security log that does not hold the moment somebody reported something is
missing the row an investigation starts from), and main-api then asks the
**existing forgot-password flow** for a link, because that flow already mints
the token, sends our own message and lands on our own page. A second way to
reset a password would be a second thing to keep right.

That is also why `PasswordResetModule` exports its service and
`SecurityEventsModule` imports it, which is the one place in main-api a vertical
is reached other than through the schema.

The answer is recorded before the message is attempted, and a failed send does
not undo it: the row saying somebody does not recognize a login is the more
important of the two, and the forgot-password card offers the link again.

### What writes these rows

`dbo.SecurityEvents`, through `dbo.LogSecurityEvent`, which is the only writer
of an ordinary event. The callers are the three writes on this page that change
how somebody gets in: an address added, an address removed, and the login moved
to another address. `EmailsService` records each one after the write it
describes has already succeeded. The primary change waits until Keycloak has
agreed, because a log saying the login changed when the credential did not is
worse than no log.

Recording **never fails the thing it was recording**. `SecurityEventsService.record`
swallows its own failure and logs a warning, and `dbo.LogSecurityEvent` answers
NULL for a login it does not know rather than raising. The reason is that an
address that is on file must not be reported as one that was refused because a
log write failed.

### Logins, which nothing in this application causes

Every other row here is written by the code that did the thing. A login is not:
Keycloak authenticates, and main-api only ever meets the token afterwards, and
meets it again on every request for as long as that session lasts.

So the login is recorded **from the request path**, in `AuthenticationGuard`,
which is the only place that sees a session begin and the only place that knows
which browser it came from.

Three things make that safe to do on every request.

**One login is one session, so the session is the key.** The token's `sid`
claim is the only thing in it that says "these requests are all the same login"
and survives a restart, so `dbo.SecurityEvents` holds it on a login row and a
unique constraint on `("UserUUID", "SessionId")` is what actually prevents a
second one. `dbo.LogLoginEvent` inserts with `ON CONFLICT DO NOTHING`, so the
tenth request of a session writes nothing, a genuine second login is a second
row, and two requests racing at the start of a brand new session cannot both
win. A token carrying no `sid` is a machine's, and is not a login.

This was deduplicated on `auth_time` first, and that is worth recording because
it looks better than it is: it stores nothing borrowed from the provider. It
does not survive contact with Keycloak. **A direct grant token carries no
`auth_time` at all**, so whole classes of login would have gone unrecorded, and
the claim was only found to be missing by asking a running Keycloak for a token
and reading it. `auth_time` is still used, for _when_ a login happened rather
than _whether_ one did: `dbo.LogLoginEvent` takes it as the timestamp and falls
back to now.

Borrowing the provider's vocabulary is a cost rather than a preference, and one
this schema already pays with `dbo.Users."SubjectId"`. Nothing reads `SessionId`
back out: `dbo.GetSecurityEvents` does not return it and it never reaches the
browser.

**The guard remembers the sessions it has already written**, so the question is
asked of the database once per session per process rather than once per request.
That set is a cache and not the rule: a restart, a second instance behind a load
balancer, or an eviction costs one refused insert, never a duplicate row on
somebody's page.

**A failure to record cannot fail the request.** Somebody whose login worked is
logged in; answering 500 because a log row could not be written would lock them
out over bookkeeping. Same rule as `SecurityEventsService.record`, and the guard
logs a warning instead.

It calls `dbo.LogLoginEvent` **directly** rather than through the security
events vertical, the way the provisioning beside it calls `dbo.ProvisionUser`
rather than going through the users vertical. `authentication` is infrastructure
in main-api and may not import a feature slice, which `check-boundaries.mjs`
enforces, and importing this one would also be a cycle: the security vertical
reaches the forgot-password flow, which reaches back into authentication. The
database function is the contract instead.

### Failed logins, which nothing in this application even sees

A login this application never caused is one thing. A login that never happened
is another. **Keycloak refuses the password and mints nothing**, so there is no
token, no request, and no moment anywhere in main-api at which a failed login
could be written down. The request path cannot help here at all.

So this one is **pulled rather than pushed**. Keycloak keeps its own event log,
`LoginFailuresService` asks it once a minute what it refused, and writes what is
new onto the page. It is the only timer in this API, and the only thing on this
page read out of the provider rather than out of what we did.

**Where it resumes from is the interesting part.** A mirror needs a high-water
mark, and the obvious one, the moment this process booted, is wrong twice over:
in development the API restarts on every file change, so the mark would reset
every few seconds, and after a real outage everything refused during it would be
lost. The mark is instead read back out of the database, as the newest
`LoginFailed` already recorded, floored at a day so that a first run does not
drag in the whole of the provider's history. That stamp is Keycloak's own clock,
because Keycloak's clock is what was written, so the two never have to agree.

Within a sweep the mark moves **one row at a time, oldest first, and only after
the row is written**. The provider answers newest first, which is the wrong
order to write in: a sweep that died halfway would leave the mark beyond rows it
never wrote, and those attempts would be gone for good. That is also the one
reason `SecurityEventsService.recordLoginFailure` is allowed to throw where
every other record here swallows: swallowing would move the mark over a row
nobody wrote.

**An attempt aimed at nobody is recorded nowhere.** Keycloak leaves `userId` out
of the event when the name somebody typed matched no account, and
`dbo.LogLoginFailure` answers NULL for a subject this installation has never
provisioned. There is no account it happened to, and a log that grew a row for a
name nobody holds would answer "does this account exist" to whoever was
guessing. It is also why the function takes a **subject id** rather than a login
name: the provider names the account by its subject, and what somebody typed at
the prompt is frequently an email address rather than a login name at all.

**Nothing about a failure is deduplicated**, unlike a login. Ten attempts are
ten rows, because how many there were is the fact worth reading. That is what
makes this the one event type that can fill a page on its own, which is why it
is the one with an off switch: `SECURITY_LOG_FAILED_LOGINS=false` stops the
timer before it starts, and Keycloak keeps its own event log either way, so
turning it off loses the mirror rather than the record.

Two things outside this repository's code have to be true, and on an existing
installation they will not be: the realm has to be keeping `LOGIN_ERROR` events,
and main-api's service account has to hold `view-events`. Both are in
`front-runner-realm.json`, which Keycloak imports **only onto an empty
database**, so an installation that predates this needs `make dc3-clean` or the
same two changes in the admin console. Until then the service says so once in
the output and records nothing, which is the same thing it says when Keycloak is
down. See [keycloak-idp](../../keycloak-idp/README.md).

The realm keeps `LOGIN_ERROR` and nothing else, rather than Keycloak's default
of every event type. Left at the default it would hold a second copy of every
successful login, logout and token refresh, in a store nothing reads and the
twelve-month rule below does not reach.

### The device, and the place that is still missing

`device-name.ts` reads the request's `User-Agent` and answers one word:
**Mac OS, Windows, iPhone, iPad, Android, ChromeOS, Linux**, or nothing. Not a
library and no version numbers, because the only question the name has to answer
is whether the person reading it recognizes themselves, and a build number does
not help them. The order matters: a phone's agent also names the system it is
built on, so the phones are tested first, and "Linux" over a login from a Pixel
is a name nobody recognizes.

An agent it cannot read gets **no device at all**, and the row reads "New
login." Guessing is worse than saying nothing here: a name somebody does not
recognize is what makes them report a login that was theirs.

**`Location` is still never written.** Working one out means an IP address
lookup, which is either a third party told where every user logs in from or a
geo-IP database shipped in the image, and neither is a decision to make by
accident inside a feature. The column is nullable, the dialog leaves the line
out, and the dev seeds are the only rows carrying one. It is written down as
item 10 of
[privacy and cookies: what is left](../../../docs/privacy-follow-ups.md), which
is where the decision belongs: whichever way it is made, the privacy policy
changes in the same commit.

### How long it is kept

**Twelve months**, enforced by `dbo.trim_security_events`, a trigger on the
table. A trigger rather than a call inside the writers, because there are four
of them and a retention rule that each has to remember is one that one of them
will not.

There is no scheduler in this product to sweep the table from outside, so the
writes do it: every event an account records takes its own old ones with it, and
only its own. The consequence, which the privacy policy is worded around: an
account nobody touches is not swept, because nothing arrives to sweep it. It
keeps its last twelve months rather than emptying on a date.

Two things follow from the trigger firing on insert, and both have already
caught this codebase out. A row written with a date already beyond the window is
swept by **its own insert**. And the test fixtures for this one table cannot
carry fixed dates the way every other table's do: written as 2024, they erase
each other as they load. `Fixtures.sql` uses relative offsets here, and says why.

The number is in two places on purpose. It is in that trigger, and it is in the
policy's "How long we keep it" section, which promises it to the reader.
`sections.test.ts` asserts the sentence, so moving one without the other breaks
the suite.

### It is not dbo.EventLog

The obvious place for this was the log that already existed, and it is the wrong
one. `dbo.EventLog` is what happens **inside an organization**: `TaskCompleted`,
`PointsEarned`, `TalliesRebuilt`. It carries `OrganizationUUID` and
`IsUserVisible` because it serves an activity feed and the audit trail behind
it. A login is not any organization's business, and three of the columns a
security event needs mean nothing to any row up there.

That is not a contradiction of ["one log, not
two"](../../main-db/SCHEMA-NOTES.md), which was about two tables with the same
shape and no rule for which one anything wrote to. These two have different
shapes and an obvious rule.

`dbo.SecurityEvents` has no organization column at all: an account is one
account however many organizations it belongs to. `Device` and `Location` are
nullable, and `Location` is **as coarse as the screen shows it** ("Utah,
USA"), because somebody has to recognize themselves in it rather than be
tracked by it,
and a precise location stored against a login is worth more to whoever steals
the table than to its owner. `ReviewedAt` and `Recognized` are NULL together
until the question is answered, and a CHECK constraint is what stops them
disagreeing.

## Invitations match any verified address

Not part of this page, but this feature changed it. An account can hold several
addresses now, so `dbo.InviteToOrganization` and
`dbo.AcceptOrganizationInvitation` look an invited address up across **every
verified address** on an account rather than only the one on the token.
Somebody invited at their work address can accept while signed in as a personal
one, which is the case the feature exists for.

Unverified addresses do not match. An invitation is an offer of membership, and
matching on an address nobody has proved they read would let anyone claim one by
typing the address it was sent to.

## What is not here yet

Changing a password from this page, seeing active sessions, and signing other
devices out. All three are Keycloak's, all three would go on this page, and
none of them is built. The first is the one RECENT ACTIVITY leans on hardest:
"No, secure account" sends a reset link because there is no in-place password
change to send somebody to.

**`Location` is never written**, only read: see
[the device, and the place that is still missing](#the-device-and-the-place-that-is-still-missing).
Whatever comes to write it should stop at a country and a region. A page whose
whole subject is somebody recognizing themselves does not need a street, and a
precise location kept against a login is worth more to whoever steals the table
than to its owner. It is item 10 of
[privacy and cookies: what is left](../../../docs/privacy-follow-ups.md), and it
is a decision rather than a task: it cannot be filled in without either telling a
third party where every user logs in from or shipping a geo-IP database, and
either one edits the privacy policy in the same commit.

**A failed login refused for an account this installation has never provisioned
is recorded nowhere**, which is deliberate rather than missing: see
[failed logins](#failed-logins-which-nothing-in-this-application-even-sees).

Failed logins also arrive **on a delay of up to a minute**, because they are
polled rather than pushed. Keycloak can push instead, through an event listener
provider, and that is a Java artifact built into the image: a real improvement
and a disproportionate one for a page nobody watches live.

The list is **not paged**. `dbo.GetSecurityEvents` takes a row cap and main-api
asks for twenty, which is where "recent" is defined. An account busy enough to
push an unanswered event off the end of that is the argument for paging it,
which is the argument the bell already lost. See
[notifications](notifications.md).
