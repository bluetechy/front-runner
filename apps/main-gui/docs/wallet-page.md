# The wallet page

Lives in `src/wallet` and renders at `/wallet`, which is Payment Wallet in the
rail. Built from a supplied mock-up of a saved-cards screen, with two
differences that were asked for: the heading is **Saved Payment Methods**
because a wallet holds bank accounts as well as cards, and the mock-up's "Add a
New Card" row at the foot of the list is **two buttons on the heading line**
instead — a bank and a card — each opening the form for its own kind.

## The list

`method-list.tsx`. One row per saved method, separated by the card's own rule
rather than drawn as the mock-up's stack of bordered boxes. A row carries the
brand or the bank, the last four digits, the name on it, the expiry or the
account type, and a Remove action; at `md` and up the billing address moves
into a column of its own beside it, which is what the mock-up was after. A
bank account has no billing address and gets no empty column headed with one.

Two tags appear beside the name where they apply: **Default**, and **Expired**
for a card whose month has passed. A card can expire while it sits here —
what cannot happen is adding one that has already expired.

The surface is `CardSurface`, the white card the dashboard and the profile both
use. See [the dashboard](dashboard.md#color) for what that card is.

## The default is a radio, and there is one of it

The radio down the left of each row is the default payment method, and there is
exactly **one across both kinds** — so the list is a single `RadioGroup` over
the whole thing rather than a control per row.

Choosing one is a save. The group shows what the API last returned rather than
what was clicked, so a refused change leaves the mark where it was.

**Choosing a default does not reorder the list.** The rows sit in the order
they were added, newest at the top — `dbo.GetPaymentMethods` sorts on
`CreatedAt` and nothing else, so the only thing that moves a row is adding or
removing one. A list that rearranged itself under the cursor that had just
clicked it would make the person check what they had done.

Which method sits where and which method inherits the default are two
different questions, and they are deliberately not wired together:
`dbo.RemovePaymentMethod` orders explicitly rather than taking the top of the
reader's list, so a change to how a wallet is displayed cannot quietly change
which card starts paying. The oldest remaining method is the **bottom** of the
list, not the top. The rules the wallet keeps:

| When                            | What happens to the default                                          |
| ------------------------------- | -------------------------------------------------------------------- |
| The first method is saved       | it becomes the default                                               |
| Another method is saved         | the default does not move                                            |
| The default is chosen elsewhere | the old one is cleared, in whichever table it is in                  |
| The default is removed          | the **oldest remaining** method is promoted — the bottom of the list |
| The last method is removed      | the wallet has no default, and needs none                            |

None of that is a constraint, because the two rows it would have to compare are
in different tables. `dbo.SetDefaultPaymentMethod` is what makes it true; see
its header, and `sql/Tests/Cases/SetDefaultPaymentMethod.sql` for the tests
that hold it.

## The two dialogs

`add-card-dialog.tsx` and `add-bank-dialog.tsx`, both built on the shell and
field in `method-dialog.tsx`. The supplied mock-ups are Google's payment sheets
— a white card with a blue button — so, exactly as [the sign-in
dialog](authentication.md) did, what is taken from them is the layout and what
is not is the color: a dialog here is the violet panel the theme already
draws, with the pill fields hollowed out of it.

**The expiry is one field here and two everywhere else.** A card prints MM/YY
and that is how it is read aloud, so that is how it is typed; `readExpiry`
turns those two digits into a year once, in the browser, rather than having the
API and the database each guess at it. Whatever either half of the schema says
about it is shown under the single field that was typed into.

Two fields open pre-filled, as starting points rather than records: the name
from the session, and the card's billing address from the profile's address.
A card is billed wherever its statement goes, which is frequently not where the
person lives, so both are editable and the field says so.

Both dialogs are seeded **during render** rather than in an effect. An effect
would render the empty form and then immediately render it again with the seed
in it; adjusting state while `open` changes re-renders before anything is
shown, and unlike resetting with a key it does not cut the closing transition
short.

## The security code is collected and never stored

The card form asks for it, because a card cannot be authorized without one, and
the line under the heading says plainly that it is not kept. Today main-api
checks its shape and drops it; when a payment processor is wired up it is what
gets handed over. **`dbo.CreditCards` has no column for it** — storing one is
forbidden rather than merely unwise, so the place it would go does not exist.

## Where the wallet comes from

`wallet-api.tsx`, through five GraphQL operations main-api added for this page:

| Operation                                            | What it does             |
| ---------------------------------------------------- | ------------------------ |
| `paymentMethods`                                     | the wallet, newest first |
| `addCreditCard(card: CreditCardInput!)`              | saves a card             |
| `addBankAccount(account: BankAccountInput!)`         | saves a bank account     |
| `setDefaultPaymentMethod(kind:…, paymentMethodId:…)` | chooses which one pays   |
| `removePaymentMethod(kind:…, paymentMethodId:…)`     | takes one out            |

None of them takes a user: the login name comes from the verified token inside
the API, so a caller cannot read or write somebody else's wallet by naming one,
and there is nothing to authorize on this page beyond being signed in.

**All four mutations return the whole wallet**, not the row they touched,
because all four can move the default. So the page replaces its list with what
comes back and never has to work out what else changed.

It is a hook rather than a provider, unlike [the profile](profile-page.md):
nothing outside this page wants a wallet. If the rail or the billing page ever
needs the default method, this becomes a provider mounted where they both are.

Behind the API: `dbo.CreditCards` and `dbo.BankAccounts`, read by
`dbo.GetPaymentMethods` — one function rather than two, because a wallet is one
list with one default in it.

## Validation, twice

The rules live in `wallet-schema.ts` and again in main-api's
`wallet.schema.ts`. **The API's copy is the authority**; this one exists so a
dialog can say which field is wrong while the person is still looking at it.
The two are a copy rather than a shared module for the same reason [the
profile's](profile-page.md#validation-twice) is, and both ends carry the same
cases so a drift is visible.

Both copies check the two things a form can know on its own:

- **Luhn** on a card number — double every second digit from the right,
  subtract 9 from anything over 9, and the total is divisible by ten. It
  catches a transposed pair, which is the mistake somebody actually makes
  typing sixteen digits.
- **The ABA check digit** on a routing number — weights of 3, 7 and 1, and the
  total is divisible by ten. Same idea, for a number nobody has memorized.

The database checks less and differently: it refuses what its columns cannot
hold. What the digits _mean_ is settled here.

## The numbers are a placeholder

A card number and an account number are stored, encrypted, in a `bytea` column,
under a key main-api holds in its environment and hands over on every call —
`WALLET_ENCRYPTION_KEY`. **The database never stores that key**, which is the
only thing encrypting the column buys: a stolen dump of `dbo.CreditCards` is
not a list of card numbers.

Nothing reads it back. There is no function that decrypts it, no field on
`PaymentMethod` that carries it, and a test in
`sql/Tests/Cases/GetPaymentMethods.sql` that fails if one appears. The only
thing any reader is ever shown is the last four digits.

That whole arrangement — the columns, the key, the pgcrypto extension — is
meant to be **deleted** when a payment processor is wired up and the number
stops crossing this boundary. It is written down in
`apps/main-db/sql/Tables/CreditCards.sql` as well, next to the column.

## What is real and what is placeholder

| Piece                            | State                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| Saving a card or a bank account  | **Real** — stored, and read back through `paymentMethods`    |
| The brand beside a card          | **Real** — derived from the number, never chosen             |
| The default, and moving it       | **Real** — one per wallet, across both kinds                 |
| Removing a method                | **Real** — a delete, and the default is passed on            |
| "Expired"                        | **Real** — computed against today, not stored                |
| The security code                | Checked, then dropped — there is nowhere to keep one         |
| Verifying a bank account         | **Not built** — the mock-up's test deposit needs a processor |
| "This card has payments pending" | **Not built** — there are no payments in the schema yet      |
| The brand's artwork              | A card glyph — the app carries no network logos              |
