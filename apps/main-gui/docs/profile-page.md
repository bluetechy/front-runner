# The profile page

Lives in `src/profile` and renders at `/profile`, which is the Profile item in
the rail. Built from a supplied mock-up of an edit-profile screen: who this
person is down the left, and the same profile as a form down the right, in
this app's colours rather than the mock-up's blue-on-grey.

## The two columns

**Left — `profile-summary.tsx`.** The picture, the name and the designation;
a bio that opens in full on "More"; three tallies; the links this person is
elsewhere at; a set of skill bars; and a contact card under it. The tallies
are **points, badges and certificates**, not the mock-up's followers and
posts, because those are what this product keeps.

**Right — `profile-form.tsx`.** The same profile as fields, in the mock-up's
six sections: personal information, name, contact info, social info, about
yourself, email preferences. Google+ is not among the social fields; it has
been dead since 2019 and the mock-up simply has not noticed.

Both columns are `CardSurface` — the white card the dashboard uses, which
moved into `src/card-surface` when this page turned out to want the same
surface. See [the dashboard](dashboard.md#colour) for what that card is.

## The fields

`card-field.tsx` holds them. The theme's own field is a pill hollowed out of
the dark sign-in panel; on white paper that is a white box on a white card
with no edge to it, so a field here takes the card's rule for a border, the
card's ink for text, and square-ish corners — a page of pills reads as a page
of buttons. `FieldRow` puts the label beside the control from `sm` up and
above it below that, and that is all it does.

## What is real and what is placeholder

| Piece                                    | State                                      |
| ---------------------------------------- | ------------------------------------------ |
| Name, user name, email                   | **Real** — from the session's token        |
| First and last name                      | Real, split at the last space in the name  |
| The picture                              | Initials — the account has no photograph   |
| Designation, bio, tallies, links, skills | **Placeholder** — all in `details.ts`      |
| Phone, address, website, social handles  | **Placeholder** — seeded in `profile-form` |
| Typing in any field                      | Works, and is kept until the page reloads  |
| "Update profile", and the camera button  | Say plainly that nothing is saved yet      |

`main-api` has no profile to write to — `me` reads five fields and there is no
mutation behind them — so the button does not pretend. It opens a notice
saying so, which is the same thing the camera button does. When there is
somewhere to write, that handler and `details.ts` are what change.

The designation is one constant, `placeholderPosition`, exported from this
vertical and also read by the rail, so the two cannot end up saying different
things about the same person.
