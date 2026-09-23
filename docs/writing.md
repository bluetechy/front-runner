# Writing

House rules for the words in this repository: the copy on a page, the comment
over a function, a test's description, a commit message, and every file under
`docs/`. They are about spelling and punctuation rather than tone, so they
apply the same way to a sentence a customer reads and to a sentence only the
next author will.

## en-US is the base language

**The base language of this project as a whole is `en-US`.** Everything is
written in it: the interface, the source, the SQL, the Markdown, the commit
log.

The site is translated. The repository is not. Those are different things and
the distinction is worth holding:

| Where                       | Language                                        |
| --------------------------- | ----------------------------------------------- |
| The interface               | `en-US` by default, `es-MX` when chosen         |
| `src/language/locales/`     | one file per language, `en-US` the source of it |
| Everything else in the repo | `en-US`, always                                 |

Spanish does appear in Markdown, and that is fine when it is being **shown
rather than spoken**: `Español (México)` quoted as a label, `Cerrar sesión`
quoted as what a key translates to, a worked example of a translation going in.
It is an example or an illustration under an en-US sentence. A paragraph, a
heading or a table that is itself written in another language is not.

The two languages the site ships in are declared in
`apps/main-gui/src/language/languages.ts`. See
[language](../apps/main-gui/docs/language.md) for the mechanics, for what is
translated so far, and for the three kinds of string that stay in English on
purpose.

## American English spelling

**Spell every word the American way**, everywhere the rule above reaches.
`color`, not `colour`. `program`, not `programme`. `center`, `license`, `gray`,
`authorize`, `recognize`, `organized`, `judgment`, `canceled`, `labeled`,
`check` rather than `cheque`.

The reason is not that one spelling is better. It is that a repository with
both has no spelling at all: `grep colour` misses half the comments about
color, a translation key written one way cannot be found written the other, and
a reviewer spends attention on which variant this file uses instead of on what
the sentence says. One variant is searchable. Two is a coin toss. And since the
interface's default is `en-US`, the variant is already chosen; the rest of the
repository matching it is the cheap part.

### The `-ise` / `-ize` family

American English takes `-ize` and `-ization` throughout: `authorize`,
`recognize`, `organize`, `capitalize`, `memorize`, `categorize`, `generalize`,
`prioritize`, `summarize`. The database already spelled `Organization` this
way, which is the spelling the rest of the repository now matches rather than
the other way round.

### Doubled consonants

American English does **not** double the `l` before a suffix when the stress is
on the first syllable: `canceled`, `canceling`, `labeled`, `labeling`,
`modeled`, `traveled`. It does keep the double `l` in `enroll` and `fulfill`,
where British English drops one.

### What is not a spelling

Three things look like British spellings and are not ours to change:

| Looks like                      | Actually                      | Why it stays                                  |
| ------------------------------- | ----------------------------- | --------------------------------------------- |
| `'Cancelled'` in `apps/main-db` | a status value stored in rows | changing it is a migration, not a respelling  |
| `aria-labelledby`               | an ARIA attribute name        | the spec spells it, the browser matches on it |
| `theme.palette.grey`            | MUI's own palette key         | a library's API is the library's to spell     |

The rule covers the words we write. It does not cover identifiers somebody else
defined, or strings that are data. A value in a column, a key in a protocol, a
field in a third-party type: those are spelled however the thing that owns them
spells them, and a comment beside one may quote it exactly. `'Cancelled'` is
the one that matters here, because it is spelled that way in seeds, fixtures,
table comments and three functions, and it is what rows actually hold.

When a British spelling is load-bearing like this, say so in a comment. The
next person to run a sweep needs to know it was left on purpose.

## No em dashes

**Never use an em dash (`—`).** Use a colon when the second half explains the
first, a comma for an aside, brackets for a genuine parenthetical, or a full
stop and a second sentence when the thought has really ended.

An em dash is the punctuation mark that hides which of those four a sentence
meant, and a paragraph with three of them has no structure a reader can
recover. Picking one of the four is the work; the dash is what gets written
instead of doing it.

Comments in `apps/main-gui/src/shared` and elsewhere use a double hyphen (`--`)
where a break of that weight is wanted. That is fine and is not an em dash.

## Login, not sign in

**The product says "login".** A person logs in, an address is the one they
login with, a session that ran out asks them to login again. "Sign in" is the
phrase this repository keeps reaching for and it is not the one the product
uses: the button in the dialog says Login, the security page says the primary
address is the one you login with, and copy that says "sign in" beside them is
a second name for the same act.

It is one word as a noun and as the verb here, which is not what a style guide
for general English would say. This is a product term rather than a sentence:
the screen it names is the login, and the copy around it matches the screen.

Two things are not covered by it:

| Stays                               | Why                                                  |
| ----------------------------------- | ---------------------------------------------------- |
| `sign up`, `signed up`              | a different act: making the account, not entering it |
| `SignInError`, `signInWithPassword` | identifiers, and Keycloak's own vocabulary           |

The rule covers what a reader sees. An identifier keeps whatever name it was
given, the way the spelling rule leaves `'Cancelled'` alone, and a comment may
quote one exactly.

This rule does not hold retroactively yet. The privacy policy, the cookie
copy, the pricing page and the sign-in dialog's own messages still say "sign
in" in places; they are being cleared as those files are touched, the same way
the em dash rule is.

## Enforcement

None, today. `npm run lint` checks formatting, JavaScript and that every source
file has a test beside it; it does not read prose. So these rules hold because
the author applies them and the reviewer notices, which is the same footing the
naming and comment conventions in
[codebase structure](../apps/main-gui/docs/codebase-structure.md) stand on.

The spelling rule holds repository wide today: a sweep in September 2026 made
every file American, and the three carve outs above are what it deliberately
left. **The em dash rule does not hold retroactively.** Roughly seventy files
written before it still carry em dashes, in copy, comments and documentation
alike. They are being cleared as files are touched for other reasons rather
than in one pass, so a diff that removes some is doing that on purpose.

A word list is the obvious thing to add if that stops being enough. The three
carve outs above are why it would need an allowlist rather than a plain `grep`,
and `aria-labelledby` is why the pattern for `labelled` needs a lookahead.
