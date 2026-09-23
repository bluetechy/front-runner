# The privacy page

Lives in `src/privacy` and renders at `/privacy`. It is what
[the cookie notice](cookie-consent.md) links to, from the bar and from the
preferences dialog both, and it is where somebody who wants to change their
mind about cookies can do it without waiting for the box to come back.

The words are in `sections.ts`, as a list of sections in the order they are
read, for the reason `pricing/plans.ts` and `contact-us/ways.ts` are lists:
the words are the part that gets edited, and whoever edits them should not
have to read JSX to do it. `privacy.tsx` is the layout over them and nothing
else, apart from the one control among them.

## The legal identity in it is a placeholder

**`YourLogo` is the wordmark from `src/logo` and `hello@yourlogo.example` is
the same invented mailbox the contact page uses.** Nothing written on this
page can reach a stranger, and nothing on it names a real company, because
there is not one to name yet.

Three things have to be true before this page is shown to anybody:

| What           | Placeholder today          | What it has to become                       |
| -------------- | -------------------------- | ------------------------------------------- |
| The controller | `YourLogo`                 | The legal entity, by its registered name    |
| The mailbox    | `hello@yourlogo.example`   | An address somebody reads                   |
| The office     | The contact page's address | A real one, and the same one in both places |

They are one edit each, in `sections.ts` and in `contact-us/ways.ts`. A
privacy policy naming a company that does not exist is worse than no page at
all, because it reads as a promise somebody made.

## Everything else on it is true

That is the rule to keep while editing. The page names Keycloak because
Keycloak holds the passwords, it names Google Fonts because the browser really
does fetch two typefaces from Google on every page, and it says no analytics
is installed because none is. When one is installed, this page changes in the
same commit, and so does `cookie-consent/categories.ts`.

The sections cover what Articles 13 and 14 ask for, and `sections.test.ts`
checks each of them is still there by heading: who is collecting it, what is
collected, what allows it, who else sees it, where it goes, how long it is
kept, and what the reader can do about it, including complaining to a
supervisory authority.

## The one control on it

The cookies section carries a button that opens the preferences dialog. It is
flagged in the data as `cookieChoices` rather than special-cased by id in the
page, so moving the section moves the button with it.

The dialog itself is not drawn here. It is mounted once, above every page, in
`routes/__root.tsx`, and this asks for it through `useCookieConsent().edit`,
so there is exactly one of it.

## What is left

- **It is in `en-US` only**, like every other marketing page. The cookie box
  on top of it is translated, which is the odd pair: a notice in Spanish
  linking to a policy in English. The whole marketing side moves together, or
  this page goes first because it is the one somebody is entitled to read.
- **Nothing links to it from the site's own navigation.** The header has five
  items and none of them is this; the paths in are the cookie box, the pill in
  the corner, and typing the URL. A footer is the usual answer and there is no
  footer yet.
