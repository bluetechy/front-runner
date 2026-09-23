# The profile page

Lives in `src/profile` and renders at `/profile`, which is the Profile item in
the rail. Built from a supplied mock-up of an edit-profile screen: who this
person is down the left, and the same profile as a form down the right, in
this app's colors rather than the mock-up's blue-on-gray.

## The two columns

**Left — `profile-summary.tsx`.** The picture, the name and the designation;
a bio that opens in full on "More"; three tallies; the links this person is
elsewhere at; a set of skill bars; and a contact card under it. The tallies
are **points, badges and certificates**, not the mock-up's followers and
posts, because those are what this product keeps.

**Right — `profile-form.tsx`.** The same profile as fields, in the mock-up's
six sections: name, contact info, personal information, social info, about
yourself, email preferences. Personal information — gender and date of birth —
is the one that has moved: the mock-up opens with it, and it sits above the
social fields here because a form opens better on somebody's name than on
their gender. Google+ is not among the social fields; it has been dead since
2019 and the mock-up simply has not noticed.

Both columns are `CardSurface` — the white card the dashboard uses, which
moved into `src/card-surface` when this page turned out to want the same
surface. See [the dashboard](dashboard.md#color) for what that card is.

## Where the profile comes from

`profile-api.tsx` reads it and writes it, through two GraphQL operations that
main-api added for this page:

| Operation                                   | What it does                       |
| ------------------------------------------- | ---------------------------------- |
| `profile`                                   | the signed-in person's profile     |
| `updateProfile(profile: UserProfileInput!)` | replaces all of it, and returns it |

Neither takes a user. The login name comes from the verified token inside the
API, so a caller cannot read or write somebody else's profile by naming them,
and there is nothing to authorize on this page beyond being signed in.

It is fetched **once**, by a provider the `_app` route mounts, because the rail
wants it too — the designation under the name in the rail is this profile's.
Saving updates what the provider holds, which is why the rail changes the
moment the form is submitted.

Behind the API: `dbo.UserProfiles`, one row per account, written by
`dbo.SetUserProfile` and read by `dbo.GetUserProfile`. An account that has
never saved reads as a full row of empties rather than as nothing, which is
what a first visit should see.

## Validation, twice

The rules live in `profile-schema.ts` as a [zod](https://zod.dev) schema, and
again in main-api's `profiles.schema.ts`. **The API's copy is the authority**;
this one exists so the form can say which field is wrong while the person is
still looking at it, rather than after a round trip. Both name every failing
field at once.

The two are a copy rather than a shared module on purpose: each app's image
installs only its own workspace (`npm ci --workspace main-gui`), so a shared
schema would need a new package plus Dockerfile and Compose changes in both
apps. The cost of the copy is one message arriving a moment later when they
disagree — the form shows what the API said — and both ends carry the same
test cases to make a drift visible.

## Gender and date of birth

Gender is a dropdown of four — Male, Female, Transgender, Not specified —
stored as it is shown, the way `dbo.OrganizationInvitations."Status"` is, and
held to those four by a check constraint on the column. "Not specified" is the
default and is an answer rather than the absence of one, so every profile has
a gender and the field is never empty.

The date of birth is the one thing on the profile that can be **absent**
rather than empty. Every text column reads an unanswered field as `''`, but
there is no date that means "not given" — an epoch or a zero is a date
somebody was born on — so the column is nullable and the API sends `null`.
The form shows it as an empty field and says it may be left that way.

It is **shown** as `1990/04/17` and **stored** as `1990-04-17`. The field is
an ordinary text field with `YYYY/MM/DD` written in it while it is empty, not
`<input type="date">`: a native date field is written the way the browser's
locale writes one — `mm/dd/yyyy` on this machine — and cannot be told to write
one any other way. `profile-form.tsx` swaps the separator on the way in and on
the way out, and does the same to the schema's `Write the date as YYYY-MM-DD`,
because a message that names a format the field is not showing is worse than
no message. Everything behind the form still sees dashes: the schema, the
mutation, the column, and both copies of the rules.

It travels as text, `1990-04-17`, rather than as a timestamp: a date that
becomes a timestamp is midnight somewhere and the day before that somewhere
else, and a birthday is the same day everywhere. `GetUserProfile` formats it
on the way out and `SetUserProfile` parses it on the way in, where the 31st of
February is refused with a sentence rather than the driver's complaint about
input syntax.

## Saying so

Every answer the page gives — saved, refused, or a field that needs another
look — is one toast in the bottom right corner, from `src/toast`. The page
holds a single notice and hands it to `<Toast>`; the summary card and the form
both report through the same `onNotice`.

It is **teal when the profile was written and pink when it was not**, and the
tone is never the whole message: each toast carries Material's icon for its
severity and a sentence that reads the same in gray. The two colors are
`brand.toastSuccess` and `brand.toastFailure`, a step deeper than the teal and
the magenta they belong to so that white clears 4.5:1 on them — see
[the style guide](style-guide.md#contrast).

Nothing is announced **until the API has answered**. `submit()` awaits `save`
before it says "Profile saved.", so the sentence is about a round trip that
finished rather than one that started; a refusal is shown in the API's own
words, which is the same reasoning as the field messages above.
`profile-form.save.test.tsx` pins both halves — that the page is told nothing
while the save is in flight, and that it is told, in the failing tone, when
the save is refused.

The wallet says the same kinds of thing through its own copy of the Snackbar,
in the bottom center. It has not moved onto this component yet; when it does,
the two pages agree on where a notice appears.

## Two fields nobody here may edit

**User name** and **Email** are shown, grayed, with a line saying where to
change them. They belong to Keycloak: `dbo.ProvisionUser` copies them out of
the token on every sign-in, so a value typed here would last until the next
sign-in and no longer. They are on the form because a profile page that did
not show them would look like it had lost them.

## The fields

`card-field.tsx` holds them. The theme's own field is a pill hollowed out of
the dark sign-in panel; on white paper that is a white box on a white card
with no edge to it, so a field here takes `brand.cardFieldEdge` for a border,
the card's ink for text, and square-ish corners, because a page of pills reads
as a page of buttons. These were outlined in `brand.cardRule` until the rule in
[text boxes](style-guide.md#text-boxes) was written down; at **1.3:1** that
divides a card into sections but cannot draw a box. A read-only field keeps
the same edge under the pointer rather than deepening: the hover is the
invitation to type, and there is nothing to type here. `FieldRow` puts the label beside the control from `sm` up and
above it below that, and that is all it does.

## In two languages

This is the first page inside the chrome to go through `t()`, and the worked
example for doing the rest: the heading, the breadcrumb, all six section
labels, every field label and hint, both email preferences, and the whole
summary card switch with the flag in the top bar.

Three things on this page deliberately do not switch — a gender's stored
value (`Male`, whatever the label says), the five social networks' names, and
the validation messages, which are main-api's words. `profile-form.i18n.test.tsx`
pins the first of those. [language](language.md) has the reasoning and how to
add a string.

## No website of a person's own

The form offers no website field, and `dbo.UserProfiles` has no column for
one. A website belongs to a company rather than to one of its people, so the
value has a single home: `dbo.Organizations."Website"`, waiting for the
organization page that will offer it. The social handles stay here, because a
GitHub or LinkedIn address is a person's.

## What is real and what is placeholder

| Piece                                   | State                                                          |
| --------------------------------------- | -------------------------------------------------------------- |
| Name, user name, email                  | **Real** — from the session's token                            |
| First and last name                     | Real — stored; seeded from the token's name on the first visit |
| The picture                             | Initials — the account has no photograph                       |
| Designation, bio, gender, date of birth | **Real** — stored, and read back through `profile`             |
| Phone, address, social handles          | **Real** — stored; the summary links the handles that are set  |
| Tallies and skills                      | **Placeholder** — in `details.ts`                              |
| "Update profile"                        | Saves, waits for the answer, and toasts what it was            |
| The camera button                       | Says plainly that a photograph cannot be kept yet              |
| Every label on the page                 | **Real** — English and Spanish, from the top bar's flag        |

Two things the page can be asked to do and cannot: keep a photograph, and
count a tally. Both say so rather than accepting the click quietly — the
camera opens a notice, and the tallies and skills are described here as what
they are. Everything else on the page is stored.

The email preferences are honest in a smaller way: they are saved, and nothing
reads them yet, because nothing in this installation sends mail.
