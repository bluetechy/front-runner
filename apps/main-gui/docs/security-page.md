# The security page

Lives in `src/security` and renders at `/security-and-access`, which is
Security & Access in the rail. What it holds today is the account's **user
name** and its **email addresses**: what the account is called, which
addresses are on file, which one is the login, and which of them anybody has
proved they can read. Passwords and sessions belong to Keycloak and are not
here yet.

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

It says **two ways in**, the name or the email address marked primary,
because the realm has `loginWithEmailAllowed` and Keycloak holds exactly one
address per account. Saying only "your email address" would have been an
invitation to try one of the others and be refused. The copy says "email
address" every time rather than "address", which on the profile page is a
street.

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

Changing a password, seeing active sessions, and signing other devices out.
All three are Keycloak's, all three would go on this page, and none of them is
built.
