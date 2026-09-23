# The contact page

Lives in `src/contact-us` and renders at `/contact-us`. It replaced the
`coming-soon` placeholder the header had been linking to, and it is where the
Enterprise plan's "Talk to us" button on
[the pricing page](pricing-page.md) has always pointed.

The shape is the supplied page's: the ways to reach us across the top, each a
glyph on a disc with the thing itself under it, and then a message form with
the reason to use it written beside it rather than above it.

## Everything on it is invented

**The street, the number and the mailbox in `ways.ts` are placeholders**, and
they are written so that nobody can mistake them for real or reach a stranger
by trying them:

| What    | Placeholder                 | Why it is safe                                    |
| ------- | --------------------------- | ------------------------------------------------- |
| Phone   | +1 (303) 555-0148           | `555-01xx` is the block reserved for fiction      |
| Address | 1180 Sherman Street, Denver | A suite number nobody occupies                    |
| Email   | hello@yourlogo.example      | `.example` is a reserved TLD and resolves nowhere |

They are one edit each, in one file, and all three have to be made before this
page is shown to anybody. `yourlogo` is the placeholder wordmark from
`src/logo`; when that becomes a real name, the mailbox is the second place it
has to change.

There is one of each on purpose (one number, one office, one mailbox), so
`ways` is a tuple of three rather than a list. A second number under "Phone"
is a second thing that has to be answered.

They are read in the order `ways` lists them: **Phone, Address, Email**.
Ringing is the quickest of the three and the mailbox is the one that waits, so
that order is part of the page rather than an accident of the file, and
`ways.test.ts` asserts it.

## Nothing is sent yet

`send-message.ts` resolves having sent nothing. main-api has no mailbox behind
this form: no mutation, no SMTP, no ticket, so the thank-you the form shows is
the one thing on the page that is not true.

It is a function of its own rather than a `fetch` written into the form so
that there is exactly one place for that to stop being true. When main-api
grows a `sendMessage` mutation, **that file is what changes**: the form waits
on a promise and shows what it gets, its tests stub that same seam, and
neither has to be touched. Until then, the email address above the form is the
only thing on the page that actually reaches anybody.

The form's own rules are in `message-schema.ts` and are the only check there
is, unlike `profile/profile-schema.ts`, which is a copy of something the API
enforces as well. A first name and an address to reply to are required; a last
name is not, because plenty of people have one name and a form that insists on
two is asking them to invent one.

## Colors

The supplied page bands its top half in teal and paints the three discs flat
gray. Neither is a color this product owns, and a band would be a fifth
surface where [the style guide](style-guide.md) has four. So:

- the three ways sit straight on the violet field, like every other section in
  the product;
- each disc is `brand.panel` with a `brand.panelEdge` hairline, the same
  surface the pricing page's questions sit on, and the glyph inside it is
  `primary.light`, **4.86:1** against that panel, against the 3:1 a drawn
  thing needs;
- the form is **white paper on the field**, the same
  [`CardSurface`](../src/card-surface/card-surface.tsx) the dashboard cards and
  the profile form are made of, so nothing inside it is drawn in the page's
  white-on-violet: the fields carry the card's own ink and the card's muted
  ink for a placeholder, the way a field on
  [the profile page](profile-page.md) does.

The discs are deliberately **not** the accent's fade. What is being offered on
this page is the button at the bottom of the form; if the three discs wore the
fade as well, none of the four would be the accent.

The form was a violet panel until the box was asked for white paper, and the
fields followed the surface: the theme's own field is a pill hollowed out of
the dark sign-in panel, which on this paper is a white box on a white card
with no edge to it. So each field is `0.7rem` at the corner rather than the
theme's `999px`, the way a profile field is cut (a page of pills reads as a
page of buttons, and a pill could not have held the five lines of the message
box anyway). A field is outlined in `brand.cardInkMuted` rather than in
`brand.cardRule`, which the profile's fields use: the rule is **1.3:1** on
card paper, which divides a card into sections but does not tell a field from
the card it is cut into, and the muted ink is **6.5:1**. The hover takes that
the rest of the way to `brand.cardInk`.

A field's error line is `brand.fall` rather than Material's `error.main`,
which is 3.68:1 on card paper and under what a 0.75rem sentence needs. `brand.fall` is the red this app already reads on white and is 5.39:1
here. The outline round the field keeps `error.main`, since it is drawn rather
than written and its floor is 3:1.

## Saying what happened

The page holds one `notice` and throws it into the bottom right corner as a
[toast](../src/toast/toast.tsx), the same way
[the profile page](profile-page.md#saying-so) does: teal when the message
went, pink when it did not.

Nothing is announced until the send has answered. A form that says "thank you"
on the click has said it about something that has not happened, and the send
that fails is the one it would be most wrong about. A message that does not
pass the schema never reaches the send at all: every field that is wrong says
so under itself, and the corner says once that some of them do.

## What is still to do

- Replace the three placeholders in `ways.ts` with the real office, number and
  mailbox.
- Give `send-message.ts` somewhere to send to, and decide what the reply to a
  message is: an email, a ticket, a row somebody reads.
- The copy beside the form is copy, not policy. "What it would cost" and
  "moving an existing program across" are promises somebody has to be
  willing to keep.
