# Privacy and cookies: what is left

The cookie notice and the privacy policy went in together. This is the list of
what they still get wrong or cannot do yet, written down while it was fresh so
it is not rediscovered by whoever reads the policy next and believes it.

How the code is arranged is in
[the cookie notice](../apps/main-gui/docs/cookie-consent.md) and
[the privacy page](../apps/main-gui/docs/privacy-page.md). **This page is the
only list of the work**; those two describe what exists and link here rather
than keeping a second copy of this.

Each item says what is wrong now, what to do about it, and how you know it is
finished. They are in the order they matter, not the order they are easy.

---

## Before this is shown to anybody outside the team

### 1. The company in the policy does not exist

`src/privacy/sections.ts` names `YourLogo` as the controller and
`hello@yourlogo.example` as the mailbox, and points at the invented office in
`src/contact-us/ways.ts`. A privacy policy naming a company nobody can write
to is worse than no page at all, because it reads as a promise somebody made.

**To do.** Put the registered legal entity in `sections.ts` (the "Who we are"
section), an address somebody reads in place of the mailbox, and the same real
office in `ways.ts`. The wordmark in `src/logo/logo.tsx` is the third copy of
the placeholder name.

**Done when** `grep -rn "yourlogo" apps/main-gui/src` is empty and the three
contact details on the contact page are answerable.

### 2. Google is told about every visit before anybody agrees to anything

`apps/main-gui/index.html` preconnects to `fonts.googleapis.com` and
`fonts.gstatic.com` and then fetches Inter and Playfair Display from them. The
request carries the visitor's IP address and the page they are on, it happens
on the first paint, and no consent gate can sit in front of it because it is
in the HTML rather than in the app. A German court has already ruled on
exactly this arrangement.

**This is the single change that would most improve the compliance picture**,
and it is also the one with no legal argument to win: the fix is mechanical.

**To do.** Download the two families as woff2, put them in
`apps/main-gui/public/fonts`, declare them with `@font-face`, and drop the
three tags from `index.html`. Subset to latin and latin-ext unless a language
after `es-MX` needs more. Then edit the "Who else sees it" section of the
policy, which currently names Google Fonts because it is true and will not be.

**Done when** `grep -rn "googleapis\|gstatic" apps/main-gui` is empty and the
network panel on a cold load shows no request leaving the origin.

### 3. Nothing on the site leads to the policy

The header has five items and none of them is Privacy. The ways in today are
the cookie bar, the pill in the corner and typing the URL. Somebody who
accepted six months ago and now wants to read what they agreed to has to find
the pill.

**To do.** The usual answer is a footer, which this site does not have: a
marketing footer in `src/site-chrome` with Privacy, Cookie settings and
Contact in it. It is the one piece of chrome the site is missing, so it is a
small design job rather than a link. Adding "Privacy" to the header nav is the
cheap version and reads oddly beside Home, About, Features, Pricing, Contact.

**Done when** a visitor who has never seen the cookie bar can reach `/privacy`
by clicking.

---

## Before anything optional is actually installed

### 4. Installing a tracker is an edit in three places, not one

The gate exists before the thing it gates, which is the point, but nothing
enforces that the three files are edited together. Adding analytics without
touching the other two ships a category that claims to hold nothing while
holding something.

**To do.** When a tracker goes in:

1. put it behind `allows("analytics")`, and nowhere else;
2. edit `src/cookie-consent/categories.ts` so `kept` says what is now kept
   (it currently reads "Nothing yet"), and edit both locale files with it;
3. edit the cookies section of `src/privacy/sections.ts`;
4. raise `VERSION` in `src/cookie-consent/consent.ts`, which makes every
   stored answer stale and puts the question again. Consent to four categories
   was never consent to a fifth thing appearing inside one of them.

**Done when** step 4 is in the same commit as step 1. Nothing automated checks
this, which is why it is written here.

### 5. The consent cannot be proved

Article 7(1) says a controller has to be able to demonstrate that consent was
given. What exists is a record in the visitor's own browser, which they can
edit and which leaves with their site data. It is enough to run the site
correctly and not enough to answer a regulator.

**To do.** A `recordConsent` mutation in main-api and a table in main-db:
who (the account, where there is one, or an opaque id where there is not),
when, which categories, and which `VERSION` of the question was being
answered. The browser record stays as the fast path, so the notice does not
wait on a round trip; the server copy is the evidence. Resist storing an IP
address against it unless somebody can say why the record is worth less
without one.

**Done when** the consent an account gave can be read back out of the database
for a date somebody names.

---

## What the policy promises that the product cannot do

### 6. There is no way to delete an account

The policy says an account, a profile and a wallet stay until you ask for them
to go, and then they go. There is no mutation for it: the API has
`updateProfile` and `removePaymentMethod` and nothing that closes an account,
so today "and then they go" means somebody running SQL by hand, and nothing
at all in Keycloak.

**To do.** Either build the path (a mutation, the Keycloak account with it,
and a decision about what happens to points and badges awarded inside an
organization) or narrow the sentence to what is true. **Building it is the
right answer** and narrowing it is what to do in the meantime, because
Article 17 is not optional and a policy that overstates the mechanism is the
kind of thing a complaint is made about.

**Done when** a request to be deleted has a procedure somebody can follow, and
the sentence in `sections.ts` describes that procedure.

### 7. There is no way to take a copy of it either

Same shape as the item above, for Article 20. The policy offers data in a form
a machine can read and there is no export.

**To do.** A query that returns the profile, the wallet without the card
numbers, and the point and badge history as JSON is most of it. Until then,
the honest version of the sentence is that we will put it together and send it
when asked.

### 8. The wallet paragraph says less than the wallet does

The policy says the cards and bank accounts you save. What is actually stored,
per `apps/main-db/sql/Tables/CreditCards.sql`, is the name on the card, the
brand, the expiry, the last four digits, **the billing address**, and the card
number encrypted under a key the database never holds. The security code is
deliberately never stored. The billing address is a second address for a
person whose profile already has one, and it is the part a reader would not
guess.

**To do.** Say the billing address, say the number is encrypted and that
nothing reads it back, and say the security code is never kept. The schema
comments are already the right words; they just have to be said in the second
person.

### 9. A payment processor will be a new recipient

`CreditCards."Number"` is documented as a placeholder that becomes a
processor's token. The day that happens, the processor sees card details and
becomes the fifth name in the "Who else sees it" section, probably with a
transfer out of the EEA attached to it.

**To do.** Edit the policy in the same commit as the processor. Add the
processor's name, what it is given, and where it is.

---

## Places the words are already slightly behind the product

### 10. Keycloak's own sign-in pages set their own cookies

The cookie section lists the four things this site keeps in the browser, which
is accurate for this origin. It leaves out that signing up, resetting a
password or signing in with Google, Facebook or Apple hands the browser to
Keycloak, which sets session cookies of its own on its own host. They are
strictly necessary and need no consent, so this is an accuracy gap rather than
a compliance one, and the cheapest kind to fix.

**To do.** One sentence in the cookies section saying so, and one in the
relevant category's `kept` if it belongs there.

### 11. Signing in with Google, Facebook or Apple is a third-party cookie

Named in "Who else sees it" as a party that is told you signed in, which is
the important half. The sentence does not say that choosing one of those
buttons also lets that company set cookies of its own in the flow. Worth a
clause, in the same edit as the item above.

---

## Smaller things, in no particular hurry

### 12. The box is translated and the policy is not

The notice and the dialog go through `t()` in both `en-US` and `es-MX`. The
policy is English, like every other marketing page. A banner in Spanish
linking to a policy in English is the odd pair, and consent has to be informed
in a language the reader has. There is also no `LanguageProvider` above the
marketing pages at all, so the flag in the top bar exists only behind the
login and a Spanish speaker on the marketing side cannot switch to it.

**To do.** Mount the provider in `routes/_site.tsx` the way `_app` does, and
move the policy into the locale files, or hold both translations in
`sections.ts` keyed by tag. Whichever way the marketing pages go, the policy
should be in the first batch rather than the last.

### 13. A second tab does not hear about a choice

A choice made in one tab reaches another when that one is reloaded. The same
bargain `language` makes, and the same fix if it is ever worth making: listen
for the `storage` event and take the new record.

### 14. The bar covers the foot of the page while it is up

Everything is still reachable by scrolling and the bar goes as soon as it is
answered. Pushing the page up by the bar's height while it is showing is the
tidier behavior and costs a padding on the shells.

### 15. Opt-out signals are ignored

Global Privacy Control is a header and a DOM property that says "treat this as
a refusal", and several US state laws now require honoring it. Reading it and
recording a refusal without asking would also be a kinder first visit for
anybody who has set it.

**To do.** If `navigator.globalPrivacyControl` is true, record
`nothingOptional` and do not show the bar, or show it already answered.

### 16. The notice has not been read with a screen reader

It is a named `section` with a heading, which is deliberate: it is a landmark
somebody can jump to, and not a modal that traps them. That is the right
structure on paper and nobody has listened to it. Worth twenty minutes with
VoiceOver to find out whether a visitor who cannot see the bar finds it before
they finish the page.

---

## Where the rules come from

- [EDPB cookie banner taskforce report](https://www.wsgrdataadvisor.com/2023/03/edpb-issues-guidance-on-cookie-banners/),
  which is where the equal prominence rule and the no-pre-ticked-boxes rule
  are set out.
- [CNIL's cookie guidelines](https://www.cookieyes.com/blog/cnil-guidelines-and-recommendations-on-cookie-consent/),
  which is where the six months a choice stands comes from, and the fine over
  a banner where refusing took more presses than accepting.
- [Cookie banner requirements under EU law](https://trustyourwebsite.com/eu/en/guides/cookie-banner-requirements)
  and [designing a compliant banner](https://cookieinformation.com/blog/designing-compliant-cookie-banners/),
  which are the practical versions of both.

None of this is legal advice and nobody here is a lawyer. It is a list of
things a lawyer would ask about, written by the people who know what the code
does.
