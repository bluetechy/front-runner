# The security page

Lives in `src/security` and renders at `/security`, which is Security & Login
in the rail. What it holds today is the account's **email addresses**: which
ones are on file, which one is the login, and which of them anybody has proved
they can read. Passwords and sessions belong to Keycloak and are not here yet.

It replaced the "coming soon" placeholder that route used to render.

## The table

`email-list.tsx`. Three columns, from a supplied mock-up: **Email**, **Status**,
**Action**. One row per address, separated by the card's own rule, and a last
row that adds one.

The Status column carries pills rather than sentences: **Verified** or
**Unverified**, and **Primary** on the one address the account signs in with.
The word is the whole message, not the color, which is the rule the rest of the
product follows.

The Action column carries a Delete on every row but the primary, and a **Send
link** on every row that is not verified yet. Neither appears where it could
not do anything: the primary cannot be deleted, and a verified address has
nothing left to prove.

The surface is `CardSurface`, the white card the dashboard, the profile and the
wallet all use.

It is a grid rather than a `<table>`. Every row here is a form control and a
label, and a grid keeps them in source order when the columns stack at `xs`.

## The primary is a radio, and there is one of it

The radio in the Email column is the address the account signs in with, and
there is exactly **one across the list** — so the table is a single
`RadioGroup` over the whole thing rather than a control per row. That is the
arrangement [the wallet](wallet-page.md#the-default-is-a-radio-and-there-is-one-of-it)
uses for the default payment method, and it is here for the same reasons.

Choosing one is a save. The group shows what the API last returned rather than
what was clicked, so a refused change leaves the mark where it was.

**Choosing a primary does not reorder the list.** `dbo.GetUserEmails` sorts on
`CreatedAt` and nothing else, so the address the account started with stays at
the top and the only thing that moves a row is adding or removing one.

**An unverified address cannot take the radio.** Nobody has proved they read
it, and a login is not a thing to hand over on an unproven address. The control
is disabled and a tooltip says why — on a wrapper, because a disabled control
takes no pointer events and the one thing somebody needs to know would
otherwise be the one thing they cannot reach. `dbo.SetPrimaryUserEmail` refuses
it as well, so the disabled control is agreeing with the rule rather than being
it.

## The last row adds an address

A field in the Email column, nothing in Status, and **Add** in the Action
column. A row rather than a dialog, because it is one field and a dialog for
one field is a door in front of a doorway.

Nothing goes in Status, because there is nothing known about an address that
does not exist yet, and a pill reading "Unverified" before it was added would
be describing something that is not there.

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

`privacy-card.tsx`, under the table. It withholds the address from the members
list other people in your organizations read — `dbo.GetOrganizationMembers` and
`dbo.SetOrganizationRole` return an empty `Email` for an account that has set
it, and the name and login name stay.

The copy says what it does and then says what it does not do: it does not
remove the address from the account, from mail already sent, or from an
administrator's reach. A security page is the last place to promise more than
the query delivers.

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
