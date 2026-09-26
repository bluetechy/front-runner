# The security page

Lives in `src/security` and renders at `/security-and-access`, which is
Security & Access in the rail. What it holds today is the account's **user
name**, its **email addresses**, its **password**, the **other providers it
can login from**, its **second factor**, its **recovery codes** and its
**recent activity**: what the account is called, which addresses are on file,
which one is the login, which of them anybody has proved they can read, when
the password was last changed and how to change it, what is asked for after
the password, what gets somebody back in when that thing is gone, and what
has lately happened to the account.

The password and the second factor are both still Keycloak's: this page is
where they are asked for, not where they are kept. The recovery codes are the
exception and the only credential here this application holds, because they
exist for the one situation Keycloak has no answer to -- see
[recovery codes](#recovery-codes).

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
  `manage-users`, `view-users`, `view-events` and `view-identity-providers`
  and nothing else. `--import-realm` only
  applies to an empty Keycloak database, so a stack that predates this needs
  the client configured once by hand.
- A token is minted once and used until it expires, so the token in the browser
  still carries the **old** address right after the change. `dbo.ProvisionUser`
  is given the token's `iat` and ignores an address on a token that predates
  the primary row's last write. Without that the change would undo itself on
  the very next request, which is exactly what it did before the parameter
  existed.

## The privacy switch

`privacy-card.tsx`, directly under the table, in a card headed **EMAIL
PRIVACY**. It is a setting about the addresses above it: the table says which
ones are on file, and this says whether the other members are shown the one you
login with. Reading the list and then reading who else can see it is one
thought, and it was two scrolls apart while this card sat at the foot of the
page. That
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

## Changing the password

`password-card.tsx`, in a card headed **CHANGE PASSWORD**, between the
addresses and the activity. Three boxes, a stamp saying when the password was
last changed, and the rules a new one has to keep.

It sits there because the page is ordered by what each block is: what the
account is called, then everything about getting into it that can be changed,
then what has happened. A password is the credential the addresses above it and
the logins below it both rest on, so it ends the first group rather than
starting the second.

### The current password is the point of the card

A session says which account this is. **It does not say who is at the
keyboard**, and a browser somebody walked away from is exactly the case a
change-password form has to refuse. So the first box asks for the password the
account has now, and the API refuses the change without it.

Nothing in this application can check that password, because nothing here has
ever seen one. `IdentityAdminService.verifyPassword` asks the identity provider
to authenticate and throws the session away: a direct access grant against the
**`main-gui` client**, which is the same exchange the sign-in dialog makes, and
then a logout of the session it just opened. `main-api` has every flow disabled
and cannot answer a direct grant at all, which is why the browser's client is
borrowed for it. Nothing about the grant is kept: no token reaches state, and
the refresh token is spent on the next line.

**A wrong current password shows up as a Failed login** on this same page. It
is a `LOGIN_ERROR` on the realm, the sweep mirrors it like any other, and that
is left alone rather than filtered out. Somebody who cannot produce the
account's current password at its own security page is the event this page
exists to show, and an attempt this application quietly swallowed would be one
the account's owner never sees.

The current password is **not held to the password policy**, which is the one
asymmetry in `password-schema.ts`. It was chosen under whatever rules were in
force at the time, which for every account older than the realm's policy is no
rules at all; telling somebody their current password is invalid when it is the
one that gets them in is the worst answer this card could give. It is checked
for being there and for nothing else.

### The stamp

**Last changed on Sep 20, 2026 at 9:42 PM**, over the form. It comes from
Keycloak, off the account's own password credential: writing a new password
replaces the credential rather than editing it, so `createdDate` on it is the
moment the password that is on the account now became the password on the
account.

It is not read out of `dbo.SecurityEvents`, and could not be. Our log holds the
changes made through this application, which is not the same set as the times
the password was set: a reset followed from a mailbox is not on it, and neither
is the password an account was created with.

It says **nothing at all** rather than "never" where the provider will not
answer. Every account's password was set at least when the account was made, so
"never" is a sentence that is never true here; a missing date is an outage, and
an outage should cost the line rather than the card. The date is written out
rather than counted back from, through the same `activity-time.ts` the log
above it uses.

### The rules are shown, not sprung

Five of them, as a checklist that ticks as they are met, drawn **before anybody
types**. A list of five requirements standing there is a set of instructions;
the same list appearing after a refusal is a telling-off, and somebody choosing
a password is better served by being told what is wanted.

**A list rather than a strength meter.** A meter answers "how good is this",
which is a judgment nobody asked for and which no bar can honestly make. A list
answers "what is still missing", which is the question somebody typing a
password actually has, and every line of it is a thing they can do next.

Nothing in it is said in color alone, which is the rule the whole product
keeps: a met rule gets a tick and fuller ink, and the word "done" is in the line
for anybody being read it rather than looking at it.

It is `PasswordChecklist` in the authentication vertical rather than a
component of this page, because **all three cards that set a password show
it**: the sign-up dialog, the page a reset link lands on, and this one. One
statement of the rules in `password-rules.ts`, one drawing of them, and a
`tone` for whichever of the product's two surfaces it is standing on.

### What a password has to be

**Twelve characters, with a capital, a lower case letter, a digit and a
symbol.** That is PCI DSS 4.0's shape rather than NIST 800-63B's: NIST would
have length alone and no composition rules at all, and the reason this product
does not follow it there is that the realm has no breached-password check
behind it, which is the half of that advice that does the work.

The rule is stated in four places and that is deliberate, because each is doing
a different job:

| Where                                 | What it is for                                      |
| ------------------------------------- | --------------------------------------------------- |
| `passwordPolicy` in the realm         | **The authority.** Keycloak refuses, whoever set it |
| main-api's `password-reset.schema.ts` | the same rules on the way in, in our own sentences  |
| main-api's `registration.schema.ts`   | the same, for the account a sign-up form creates    |
| main-gui's `password-rules.ts`        | the checklist, and a refusal beside the box         |

Keycloak names one broken rule at a time in its own words, which is a fine last
line and a poor first one. Everything in front of it exists so that somebody
choosing a password is told all five at once, and told before they type.

Raising it from eight characters changed nothing about the passwords already on
the realm: a policy is applied when a password is set, not to the ones already
stored. The **development accounts still have the username as the password**,
which breaks every part of the new policy, and they still login. What they
cannot do is change a password to another one like it.

### Changing it ends the other sessions

A changed password is worth nothing while a session somebody else is holding
outlives it, so `endOtherSessions` ends every session on the account except the
one the request came in on. Keycloak's own logout-the-user endpoint ends all of
them, this one included, so the sessions are listed and deleted one at a time
with the current one held back: somebody who has just changed their password
correctly should not be thrown out of the browser they did it in.

Those endings arrive back on this page as logout rows, through the same sweep
that mirrors every other session ending, and that is the right outcome rather
than a side effect worth suppressing: the rows are the evidence that the change
did what the card said it would.

The count has **three states and the card says all three**: some were ended,
there were none, and we could not tell. The last one is null rather than zero,
and the difference matters enough to be in the model: somebody told "no other
sessions were open" when the truth is that nothing could be asked would stop
looking.

### The order the four steps run in

Prove, set, record, end, and each of those is only safe once the one before it
has answered. Two edges are worth keeping.

**The change is recorded before the sessions are touched.** A provider that
will not list sessions must not cost the account the record of its own password
changing; a session that outlived the change is worth reporting, and the log
above the card is where it will show.

**Nothing after `setPassword` may throw.** From that line on the password has
already changed, and a mutation that failed afterwards would report a change
that happened as one that did not, leaving somebody with two passwords to try.
Both the stamp and the session count are read inside a `catch` that answers
null.

### Where it lives

`src/password-change` in main-api, a vertical of its own rather than two more
operations on `password-reset`, and the reason is the direction the imports
run. A change has to be recorded, the security log is written through
`SecurityEventsService`, and that vertical already imports `PasswordResetModule`
for "No, secure account". A change living in the reset vertical would have had
to import the security vertical back, which is a cycle. This way every arrow
runs one direction.

The subject is different too, which is the better half of the argument.
Forgetting a password is something that happens to somebody who cannot get in,
and both of the reset vertical's operations are `@Public` for that reason.
Changing one is something an account does to itself from a page behind the
login, and neither of these is public.

It exports nothing. The reset vertical exports its service because the security
page has to be able to send somebody a link; nothing anywhere has a reason to
change a password on an account's behalf, and an exported service that could
would be a way to do it without the current password.

## Single sign-on

`sso-list.tsx` and `connection-dialog.tsx`, in a card headed **SINGLE SIGN-ON
(SSO)** under the password. One row per provider the realm has: the provider's
mark, what it is called, where this account stands with it, and the one thing
that can be done about it.

It sits under CHANGE PASSWORD because it is the same subject one step further
out. A password is the credential this account holds for itself; a connected
provider is a credential somebody else holds on its behalf. Both are ways in,
so they sit together, and the one this application can actually change goes
first.

**The list comes from the realm, not from this bundle.** main-api reads
Keycloak's identity provider instances and answers every one of them, so a
realm given a fourth provider grows a fourth row without anything being
rebuilt. What the browser supplies is the mark: `sso-kinds.ts` knows the three
the login card offers and falls back to a chain link for anything else, the
same arrangement `activity-kinds.ts` has for an event type it has not met.

**The rows are alphabetical, and the login card's buttons are not.** That
looks like a disagreement and is the same rule applied to two different jobs.

The buttons on the login and sign-up cards are a **call to action**: somebody
is being asked to press one, so the three are ranked by how likely an account
is to exist, and the one most people can press is where the eye lands first.
Google, then Facebook, then Apple.

Nobody is being asked to press anything here. This card is a **list of what an
account already has** and what can be done about it, read by somebody looking
for one row in it, and a list to look something up in is ordered the way a list
is looked something up in. Ranking it by likelihood would also be this
application guessing at somebody's credentials on the one page that knows the
answer: a row saying "Connected as marcus@gmail.test" is not a guess about
whether they have a Google account, so putting it above Apple because most
people have Google would be the card arguing with itself.

`sso-list.tsx` sorts, rather than drawing what arrives. Keycloak happens to
answer alphabetically today, but that is its own business rather than a
promise, and what order a page reads in is the page's decision. The comparison
is the reader's language, the way every date on this page is.

A provider the realm has **switched off is still a row**, saying so and
offering nothing. An account that connected Google before Google was switched
off still has it connected, and a card that quietly dropped the row would be
hiding a credential from the page whose whole job is showing them. Every
provider in this realm ships switched off, with placeholder credentials, so a
fresh installation draws three rows and no Connect button at all.

### Connect is a round trip, and the dialog says so first

Pressing **Connect** connects nothing. It hands the browser to the identity
provider, which hands it to Google, and the page it was pressed on is gone
until all of that is over. So it opens a dialog first, which says the three
things somebody would otherwise find out the hard way: this page is about to
go, there may be a login on the route, and **everything else they login with
still works afterwards**. That last one is what this card is most often misread
about: connecting a provider is widely taken to mean replacing the password,
and it does not.

It is worded as "nothing else you login with" rather than as "your password",
which is the sentence that is true of every account rather than of most of
them. An account that arrived through a provider may never have had a
password, and telling somebody theirs still works is no comfort when they do
not have one. The same wording is on the toast after a disconnection.

The trip itself is **two legs**, and the reason is worth writing down.

Keycloak runs account linking at `/broker/{alias}/link`, and it will only do it
for a browser it can see its own session cookie for, checking that cookie
against the session the token in hand was minted for. **Our login card
produces neither.** The password grant it runs mints a token without the
browser ever meeting Keycloak, so there is no cookie and no matching session,
and somebody who logged in that way would land on Keycloak's own "session not
active" error page.

So Connect goes the long way round:

| Leg                                                   | What happens                                                                                                                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `beginAccountLink` → the authorize endpoint           | The alias goes into session storage and the browser takes the ordinary redirect. Silent for anybody who already has a session with Keycloak, one login page for anybody who does not |
| `/auth/callback` → `resumeAccountLink`                | The code is exchanged as usual, the tokens are adopted, and the browser carries on to the linking endpoint with the new token                                                        |
| the provider → `/security-and-access?connected=alias` | Keycloak sends the browser to Google, writes the federated identity, and drops it back here                                                                                          |

No hint is sent on the first leg, deliberately. A `kc_idp_hint` would send the
browser straight on to Google to login as somebody, which is the login card's
feature; this leg is about the account that is already logged in here.

The linking path is **configuration rather than discovery**:
`VITE_IDP_LINK_PATH`, with `{provider}` standing in for the alias. OpenID
Connect has nothing to say about account linking, so there is no entry in the
discovery document to read, and the nonce-and-hash shape around it is
Keycloak's own. An empty value means the provider has no such flow, and the
card then reads without offering to connect anything. It is the same trade
`VITE_IDP_HINT_PARAMETER` makes for the same reason.

### What comes back on the URL is a claim, not a fact

The provider drops the browser at `/security-and-access?connected=google`.
Anybody can type that. So the page does not believe it: it takes the alias off
the address bar, hands it to `confirmSignInMethod`, and **main-api asks
Keycloak** whether that provider is actually connected to this account before
it records anything. A trip somebody abandoned at Google comes back looking
exactly like a finished one, and the only thing that can tell them apart is the
provider.

The parameter is stripped before the call is made, so a refresh cannot ask
again, and a ref covers StrictMode's second pass in development. What the page
says afterwards comes from the answer rather than from the URL: connected, or
"that connection was not finished, so nothing has changed".

### Disconnecting, and the last way in

**Disconnect** is server-side and immediate, and it asks first for a different
reason: reconnecting means the whole trip above rather than an undo.

The rule underneath it is the one this card is arranged around. An account
whose only way in is Google, with no password behind it, is **locked out of
itself** by that button. So `CanDisconnect` is false on the only connected
provider of an account with no password credential, the row draws no button at
all and says why instead, and `disconnectSignInMethod` refuses it as well: the
card is a moment old by the time somebody presses anything, and the password
could be the thing that changed. The sentence it refuses with says what to do
about it, because a no with no way forward is a dead end on somebody's own
account.

A row with no button rather than a disabled one, which is the rule the address
table keeps for the primary row's missing bin: a control that refuses when it
is pressed makes somebody ask the question twice to get an answer the row could
have given first.

`hasPassword` answering false for a provider that would not say is the safe
direction, and is deliberate: the page then offers no Disconnect at all, and
nobody is disconnected from the last way into their own account on the strength
of an outage.

### What it writes down

Two event types, both recorded only once the provider has confirmed them:
`SignInMethodConnected` and `SignInMethodDisconnected`. They show up in RECENT
ACTIVITY LOG under the card, headed "Login provider connected" and "Login
provider disconnected", and the first carries a warning for the reason `EmailAdded`
does: a way into your account that you did not add is how an account is quietly
kept.

### Where it lives

`apps/main-api/src/single-sign-on`, a vertical of its own beside
`password-change`, and for the same reason that one is separate: the subject is
different. A password is a credential this application asks for and hands over.
A connected provider is a credential somebody else holds, which this
application can only read, confirm and take away.

It has no `connectSignInMethod`, and the absence is the design rather than an
omission. Connecting ends at Google with a browser, so a mutation named connect
would be a mutation that could not connect anything.

## Two-factor authentication

`two-factor-list.tsx`, `two-factor-dialog.tsx` and `sms-dialog.tsx`, in a card
headed **TWO-FACTOR AUTHENTICATION**, under the SSO card. Built from a supplied
mock-up, which is GitHub's "Two-factor methods": a mark, a name, a
**Configured** pill, a sentence, and one action on the right.

It sits under single sign-on because it is the same subject one step in.
Those are other ways in; this is the thing asked for _after_ a way in has been
used. It is also the last control on the page that changes how somebody logs
in, which is why the activity log still comes after it.

Two rows, in the product's order rather than alphabetical order: the
authenticator app first because it is the one to choose, SMS under it because
the only reason to read that row is to find out why not. **The SSO card sorts
and this one does not**, and the difference is what each list is for -- that
one is a list to look a row up in, and this one is a recommendation. Sorting
these two alphabetically would put SMS first.

**The two rows are turned on in two different places**, and the difference is
not an inconsistency: an authenticator app has a secret to mint and a phone
number does not. The app goes out to Keycloak, because only Keycloak can show
the QR code. The number is proved here, in a dialog, because the only question
about it is whether the person setting it up can answer a message sent to it.

### Turning the app on happens at Keycloak, and cannot happen here

The secret behind an authenticator app is minted by the provider and shown to
a person exactly once, as a QR code. **Keycloak's admin API has no operation
that creates an OTP credential at all** -- it can list credentials and delete
them, and that is the whole of what it offers. So there is no version of this
feature where our own page draws the code, and `Turn on` is a trip:

```text
the card  →  authorize?kc_action=CONFIGURE_TOTP   (session storage remembers the kind)
          →  Keycloak's own setup page, with the QR code
/auth/callback?...&kc_action_status=success
          →  /security-and-access?configured=authenticator-app
          →  confirmTwoFactorMethod(kind:) on main-api  →  Keycloak's credential list
```

**One leg, not the two `account-link.ts` takes.** Connecting a provider needs
a first trip because Keycloak's linking endpoint checks a session cookie the
password grant never produced; this goes through the authorize endpoint, which
is the thing that produces that cookie.

`kc_action` and `CONFIGURE_TOTP` are configuration rather than constants --
`VITE_IDP_ACTION_PARAMETER` and `VITE_IDP_TOTP_ACTION`, the same arrangement
`VITE_IDP_HINT_PARAMETER` and `VITE_IDP_LINK_PATH` have. Either one empty and
the card draws no button rather than a button that goes nowhere.

**`kc_action_status` on the way back is not read.** It is a claim on a URL, so
the page hands the kind to main-api instead and main-api asks Keycloak what
the account actually holds. Somebody who abandoned the QR code comes back
looking exactly like somebody who scanned it, and the only difference between
them is the provider's answer. The same argument the SSO card's `connected`
rests on.

### Turning either off is an admin call, and is not refused

For the app, `DELETE /users/{id}/credentials/{id}`, where 404 is success: the
page it was pressed on is a moment old and the end state is the one that was
asked for either way. For SMS it is a write to the account that takes the
`phoneNumber` attribute off, because the number was never a credential. The
card asks the same question either way and the port hides the difference: the
implementation branches on the id it gave the row, which is the only thing
that knows what its own ids mean.

Nothing refuses this on the grounds of leaving the account unprotected. An
account that could not take a factor off would be one somebody is locked
_into_, and a password is still a password. What is owed instead is the
sentence, so the dialog says the account will be left standing on its password
alone and the toast says it again afterwards.

### SMS is set up here, in two steps

`sms-dialog.tsx`, opened straight from the row rather than behind the
confirmation the app gets. There is nothing to warn anybody about first:
nothing leaves the page, and nothing changes on the account until a code comes
back. The warning that would have been in a confirmation is in the dialog
itself, beside the box.

```text
the row  →  "Add a phone number"     →  startSmsEnrollment(phoneNumber:)
                                        dbo.PhoneVerifications, and a text message
         →  "Enter the code"          →  confirmSmsEnrollment(code:)
                                        the number goes onto the account at Keycloak
```

**Nothing is on the account until the second step, and that is the whole
safety of it.** A number somebody typed is not yet a number they own, so the
first step writes it into `dbo.PhoneVerifications` and nowhere else. Somebody
who shuts the dialog at the code box has changed nothing, and the card behind
it still says SMS is off, because it is.

**The second step sends the code and nothing else.** Which number it proves is
read off the row the code was sent against, in `dbo.SpendPhoneVerification`. A
mutation that took both would let somebody hold a code texted to their own
phone and spend it against a number belonging to anybody.

Three rules hold the six digits up, because six digits are a fifth of a
million and the entropy is not doing the work:

- Ten minutes, from when the message went out.
- Five wrong guesses, after which the row is retired and the message has to be
  sent again.
- One outstanding code per account, so "send it again" stops the first one
  working rather than leaving two live.

The number is read back masked -- the last four digits -- before the code box,
which is how somebody who mistyped a digit finds out from the dialog rather
than from a message that never arrives. "Use a different number" is a link in
a sentence rather than a third button, for the reason the login card's "Use a
recovery code" is: a plain text button on that violet panel draws as prose,
and the one way out of a step nobody meant to be on must not be the one
control that does not look like one. It goes back a step rather than shutting
the dialog, because that is what somebody who read the wrong last four digits
wants next.

### How often the code can be asked for

Three limits, and all three are `dbo.StartPhoneVerification`'s rather than
main-api's:

| Limit                                           | What it stops                                            |
| ----------------------------------------------- | -------------------------------------------------------- |
| One message a minute, per account               | A double press of **Send the code** costing two messages |
| Five an hour, per account                       | An account holding the button down                       |
| Three an hour, per number, across every account | The form being used to ring a stranger's phone           |

They are in the database because that is where the timestamps are. main-api
keeps nothing between requests, so a count read there and acted on there is
two overlapping requests away from being wrong; here it is one statement, and
the refusal happens before the outstanding code is retired, so a message that
is refused leaves the code somebody is already holding working.

The function raises rather than returning nothing, which is how the sentence
reaches the dialog: `DatabaseService` turns a `raise_exception` into a
`BadRequestException` carrying its message, so **Wait 41 seconds before asking
for another code** is drawn in the dialog's error panel unchanged. The two
caps answer the same sentence on purpose, so that the form cannot be used to
ask whether some other account has been texting a given number.

A row is written before the message goes, so a send that fails at the gateway
still counts. That is the safe direction to be wrong in.

### The SMS row is still the one that argues

`Available` comes from main-api, which answers false wherever there are no
Twilio credentials, and the row then offers nothing and says why. It is still
drawn: a card that dropped the row would be hiding the reason it is missing
from the one page whose job is saying what protects an account.

`Recommended` is false either way, and that is a judgment about the method
rather than about this installation: messages can be intercepted, a number can
be taken over at a phone shop, and delivery is nobody's promise. The row says
so, the dialog says it again where the choice is actually being made, and both
point at the authenticator app one row up.

One asymmetry worth knowing: a row can be `Configured` and not `Available`. A
number attached while the site could send messages is still on the account the
week the credentials expire, and Keycloak is still asking for a code at login,
so drawing it as off would be telling somebody they have no second factor
while they do.

The authenticator that checks the code at login is this repository's own, in
`apps/keycloak-idp/plugin`, and the message is sent by main-api on its behalf.
See [keycloak-idp](../../keycloak-idp/README.md#sms).

## Recovery codes

`recovery-codes-card.tsx` and `recovery-codes-dialog.tsx`, headed **RECOVERY
CODES**, directly under the card above. Its own card rather than a line on
that one, because it is a different question: that card is about what is asked
for when you login, and this is about the day you cannot answer it.

**This is the one credential on the page that is ours.** Everything else here
is Keycloak's, read and removed through the port. Codes are not, because the
situation they exist for is the one Keycloak has no answer to: its token
endpoint will accept nothing but a valid code from the app that is in the
lake. The rows live in `dbo.RecoveryCodes`, named by the Keycloak `sub` with no
foreign key to `dbo.Users`, exactly as `dbo.PasswordResets` is and for the same
reason.

Ten codes to a set, made by main-api, **stored as SHA-256 and shown once**.
The hash is not there to slow an attacker down the way a password hash is --
the codes carry 2^49 of their own entropy, and there is no dictionary to walk
-- it is there so that a copy of the table is not a working set of keys. A slow
hash would buy nothing and cost a second of CPU on every login that spends one.

The alphabet leaves out `0/o`, `1/l/i` and `u/v`: a code is read off a screen
and typed somewhere else, often from a photograph, and every pair of
characters that look alike is a code somebody will swear they typed correctly.
They are printed `xxxxx-xxxxx`; the hyphen, the spaces and the case are all
folded away on the way back in, because the hash is what is compared and three
spellings of one code would be three different hashes.

The dialog that shows them **does not close on the backdrop or on Escape**,
which is the one place in this product a dialog takes that away. Everywhere
else a stray click costs nothing; here it costs somebody the only copy of
their way back into the account.

### Spending one is a login-card flow, not a page one

A code is spent from the login dialog, by somebody with no session at all, so
`useRecoveryCode` is `@Public` for the reason the password-reset pair is:
being unable to login is the situation.

```text
the login card  →  useRecoveryCode(identifier:, password:, code:) on main-api
                →  the provider says which account that is
                →  verifyPassword on the password-only direct grant
                →  dbo.SpendRecoveryCode marks it used
                →  every second factor is removed at the provider
the login card  →  the ordinary password login, which now works
```

Three things are proved before anything changes, and the password is one of
them: a sheet of codes found in a drawer must not be enough on its own to
strip the protection off an account. **It answers no session**, and the card
says the factor is now off, because somebody who is not told that walks away
believing they are still protected by it.

Every way it can fail gets one sentence -- wrong password, wrong code, no such
account, no codes at all -- for the reason the forgot-password card answers
identically: a form reachable without a session must not become the product's
own account lookup.

## Recent activity log

`activity-list.tsx` and `activity-dialog.tsx`, in a card headed **RECENT
ACTIVITY LOG** at the foot of the page. Built from two supplied mock-ups, which are
Google's "Recent security activity" and the card behind one of its rows.

It sits last because it is the record of what has been done to the addresses
and to everything else about getting in: the page says what the account is,
then what can be changed about it, then what has changed. Nothing on it is a
control, which is the other reason it is the block a page of settings ends on.

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
| **Action**   | an eye that opens the dialog                                           |

Three departures from the mock-up, and the third is the Action column below.
It groups rows under a **heading per day**,
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

The one thing is drawn as an **eye**, which is the third departure from the
mock-up: that gives each row a chevron. A chevron says there is more this way,
which is what it says in the rail and in every accordion, and what this control
does is show you a row you are already looking at, in a dialog that opens over
the page and closes back onto it. An eye says that, and it says the same thing
as the word in the tooltip and the label under it. `EyeIcon` is the wrapper,
over MUI's `VisibilityRounded`, drawn at the size the bin and the link in the
address table above are drawn at so the two action columns line up down the
page.

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

### The last 30 days, ten rows at a time

The card says **the last 30 days** in the sentence above the table, and that
sentence is the contract: `dbo.GetSecurityEvents` takes a window in days,
main-api asks for thirty, and the database applies it. The number is defined
once, in `security-events.service.ts`, and it is a window rather than the row
cap it replaced because a cap cannot be said out loud. "Your last twenty" is not
something anybody can check against their own week, and on a busy account it
hides yesterday behind this morning.

A window is **not** what the table is kept to. `dbo.trim_security_events` keeps
twelve months, and that stays as it is: what is kept and what is shown are
different questions, and the longer answer is the one an investigation needs.
Nothing today reads past thirty days, which is what a date range on the card
would be for; it would be a control rather than a number, so it is not in that
constant.

The **paging is the browser's**, over a list it already holds. One read fetches
the window, `activity-list.tsx` cuts it into pages of ten, and turning a page
asks the API nothing: the arrows answer at once and there is no spinner to draw
for them. That is the opposite of the bell, which pages against the server
through Query's infinite query, and the difference is how much there is. A month
of one account's logins is a list; a notification feed is not.

The rows sit in a box **ten rows tall, whatever is in it**: one row, ten, or
none at all. The fixed height is the point rather than a side effect. A table
that shrank to three rows on the last page would walk the pager up the screen
from under the finger pressing it, and a card that changed height every time
somebody paged would make the whole page jump.

**Nothing scrolls inside that box**, which is why the height is written as a
`minHeight` rather than a `height`. An inner scroll area on the last card of the
page is a trap rather than a convenience: a wheel or a swipe meant for the page
lands on the table and moves the table, and somebody on their way past the card
is stopped by it. So there is never anything to scroll to. Every row is drawn at
the same height from the width the columns stop stacking at, the sentence and
the muted line under it are each kept to one line and cut with an ellipsis, and
ten rows are therefore exactly the floor and never more than it. Nothing is lost
in the cut: the eye in the last column opens the whole sentence in the dialog,
which is where a long one is read anyway. Narrower than that the columns stack,
a row is as tall as what is in it, and the box grows rather than clipping any of
it.

The pager is drawn **even over a log that fits on one page**, with both arrows
quiet. One that appeared on the day the eleventh event was recorded would move
the card's foot exactly when nobody wants this page moving under them. Left
is newer and right is older, because the list is newest first, and both say so
in words: an arrow alone leaves somebody to work out which end of the log it
points at. A disabled arrow stays where it is rather than being taken away,
drawn in the card's muted ink at less than full strength, because an arrow that
vanished at the last page would read as a control that had broken.

It sits on the **left margin**, which is the one thing about it settled by
something other than taste. The cookie pill is fixed to the bottom right corner
of the window and [cannot be covered up](cookie-consent.md), because it is the
only way back into that choice, and this is the last card on the page: a pager
in its right corner would be under that pill exactly when somebody has scrolled
to the foot of the page to reach it. The left margin is out of its way, and
lines the pager up with the column of Whens above it.

Answering a row replaces the whole list, and saying no makes it one row longer,
so the page somebody is standing on can stop existing underneath them. The page
number is **clamped rather than reset**: they stay on page three while page
three still has rows, and are walked back one when it does not, instead of being
thrown to the top of the log for having answered a question.

An empty table says **"Nothing has happened to this account in the last 30
days"**, not "yet". An account that has been quiet for a month is not a new one,
and telling somebody nothing has ever happened to an account they have had for a
year would be the only lie on the page.

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
unique constraint on `("UserUUID", "EventType", "SessionId")` is what actually
prevents a second one. (`EventType` is in that key so the logout below can sit
beside the login it ends rather than colliding with it.) `dbo.LogLoginEvent` inserts with `ON CONFLICT DO NOTHING`, so the
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
`ProviderEventsService` asks it once a minute what it refused, and writes what is
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

### Logouts, which are three facts that are really one

A login with nothing under it reads as a session that may still be open. So the
end of a session is recorded too, and **there are three ways to find out about
one, none of which sees the other two**:

1. **Somebody pressed Logout.** The browser reports it through `recordLogout`
   while it still holds a token. This is the only one of the three that arrives
   at once and the only one that knows the device.
2. **The provider recorded a `LOGOUT`.** That is what a logout from Keycloak's
   own account pages, or from another application on the same realm, or from a
   browser closed before step 1 could land, looks like from here.
3. **The provider refused to refresh a token for a session that was already
   gone.** A `REFRESH_TOKEN_ERROR`, and the only trace of a session that ended
   with nobody deciding to end it: an idle timeout, a session past its maximum
   lifespan, or one somebody revoked.

All three say _this session is over_, so **all three write the same row and the
database keeps it one row.** `dbo.LogLogoutEvent` inserts with
`ON CONFLICT DO NOTHING` against `("UserUUID", "EventType", "SessionId")`, so
whichever arrives first wins and the rest are quiet no-ops. That is what makes
this need no coordination between the browser and the sweep, and it is also why
**a logout needs no off switch where a failed login does**: a session can cost
this page one login row and one logout row, and never a third.

Order matters for one reason. Our own logout produces a `LOGOUT` and then, from
any other tab still holding a token, a refused refresh moments later, so the
sweep writes **oldest first** and the page says "You logged out." rather than
"This session ended without a logout."

**The writer takes no account and no subject, only a session**, and resolves who
it was from the login row already on this table. Two things forced that and both
are worth keeping. A `REFRESH_TOKEN_ERROR` carries no user at all, which was
found by asking a running realm rather than assumed, so something had to resolve
it. And resolving it from our own log means **nothing here trusts a subject the
provider handed back**. The consequence is deliberate: a session this
installation never saw a request from has no login row, so its logout is not
recorded either, which is the same rule failed logins follow.

There is no risk of a stranger writing one of these. Keycloak validates a token's
signature _before_ it records a session id, so a refusal over an invented token
names no session and `readEndedSession` drops it. Verified the same way: by
posting a forged token at a running realm and reading what the event log kept.

Two sentences and no more, because two is all the provider can tell apart. "You
logged out." where it recorded one; "This session ended without a logout."
otherwise. It deliberately does not say _expired_: an idle timeout and a revoked
session look identical from outside, and the reader already knows which it was,
because they know whether they logged out.

**What is still not caught**, and cannot be: closing the tab. Nothing happens
anywhere when a browser is closed with the session still live, so there is no
event to mirror and no request to send. That session ends later, quietly, when it
times out at the provider, and it is the refused-refresh case above that finally
records it.

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
table. A trigger rather than a call inside the writers, because there are five
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

**Twelve months is not what the card shows.** The page reads the last 30 days of
it, which is a separate number in a separate place (`security-events.service.ts`)
and answers a separate question: how long a record is worth keeping is not how
much of it is worth putting in front of somebody. The shorter one moving would
not touch this section or the privacy policy.

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

**Twilio credentials**, without which the SMS row is drawn and switched off.
The feature is finished either way: see
[The SMS row is still the one that argues](#the-sms-row-is-still-the-one-that-argues).

**Any rate limit on the login code.** The enrollment message has three, in
`dbo.StartPhoneVerification`: see
[how often the code can be asked for](#how-often-the-code-can-be-asked-for).
The code Keycloak sends during a login has none, and its browser form carries
a Send it again button. That limit belongs in the plugin, beside the code
itself in `SmsCode`, rather than here.

**Any rate limit on the verification mail.** `dbo.ResendUserEmailVerification`
writes `VerificationSentAt` and enforces nothing with it. Mail costs nothing
to send, which is why this has waited, and it is still a way to point this
site's mail at somebody who did not ask for it.

**A second authenticator app on one account.** Keycloak will hold several OTP
credentials and this card draws one row, so a second one set up from
elsewhere shows as the same row and `Turn off` takes them all. That is the
honest behavior for a card with one row on it, and the row it would need is a
list rather than a line.

Changing a password from this page, seeing active sessions, and signing other
devices out. All three are Keycloak's, all three would go on this page, and
none of them is built. The first is the one RECENT ACTIVITY LOG leans on hardest:
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

Failed logins, and any logout this application did not itself report, also arrive
**on a delay of up to a minute**, because they are polled rather than pushed.
Keycloak can push instead, through an event listener provider, and that is a Java
artifact built into the image: a real improvement and a disproportionate one for
a page nobody watches live.

**A session ended by closing the tab is recorded only when it later times out**,
which can be up to the provider's idle timeout after the person actually stopped
using it. Nothing happens anywhere when a browser closes, so there is no earlier
moment to record. See
[logouts](#logouts-which-are-three-facts-that-are-really-one).

**A logout is not attributed to a device unless the browser reported it.** The
provider's event log carries no `User-Agent`, so a mirrored logout leaves the
line out rather than guessing, which is the same rule the device itself follows.

**Nothing reads past 30 days.** That is the window the API asks for and the card
promises, while the table itself keeps twelve months. An account wanting to look
further back needs a date range on the card and a window the browser can ask
for, which is a control rather than a number: see
[the last 30 days, ten rows at a time](#the-last-30-days-ten-rows-at-a-time).
Paging that read against the server rather than in the browser is the same
change, and it is the argument the bell already had and won. See
[notifications](notifications.md).
