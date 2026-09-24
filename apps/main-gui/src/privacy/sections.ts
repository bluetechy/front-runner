/*
 * The privacy policy, written as the thing it is: a list of sections in the
 * order they are read.
 *
 * It is data rather than markup for the reason `pricing/plans.ts` and
 * `contact-us/ways.ts` are: the words here are the part that gets edited, by
 * somebody who should not have to read JSX to do it, and the page that draws
 * them does not change when they do.
 *
 * **Every sentence here is about what this product actually does today**, and
 * that is the rule to keep when editing it. It names Keycloak because
 * Keycloak holds the passwords, it names Google Fonts because the browser
 * really does fetch two typefaces from Google, and it says no analytics is
 * installed because none is. A policy that describes a product somebody
 * intended to build is worse than no policy, because it reads as a promise.
 *
 * **The company behind it is still the placeholder.** `YourLogo` is the
 * wordmark in `src/logo`, and the mailbox is the same invented `.example`
 * address the contact page uses, so nothing written here can reach a
 * stranger. The name, the mailbox and a real legal entity all have to be put
 * in before this page is shown to anybody -- see docs/privacy-page.md.
 */

/* The date at the top. Written out rather than formatted from a timestamp:
 * what it marks is the last time somebody edited these words, which no clock
 * knows. */
export const UPDATED = "September 22, 2026";

/* Where a privacy question goes. The same invented mailbox as the contact
 * page, and a placeholder for the same reason. */
export const MAILBOX = "hello@yourlogo.example";

export interface Section {
  /* Also the anchor, so /privacy#cookies is a link somebody can send. */
  id: string;
  heading: string;
  paragraphs: readonly string[];
  /* The list under the paragraphs, where the section is a list of things. */
  points?: readonly string[];
  /* The one section carrying a control as well as words: the way back into
   * the cookie dialog. Withdrawing has to be as easy as agreeing was, and
   * "write us a letter" is not as easy. */
  cookieChoices?: true;
}

export const sections: readonly Section[] = [
  {
    id: "who",
    heading: "Who we are",
    paragraphs: [
      "YourLogo runs Front Runner, the gamification product this site is about. We decide what is collected here and what it is for, which under the GDPR makes us the controller of it.",
      `Anything on this page can be asked about at ${MAILBOX}, or at the office on the contact page.`,
    ],
  },
  {
    id: "what",
    heading: "What we collect",
    paragraphs: [
      "All of it comes from you, either because you typed it or because you are using the product. None of it is bought from anybody.",
    ],
    points: [
      "Your account: the email address and the password you sign in with, or the account you used at Google, Facebook or Apple instead. Passwords are held by Keycloak, the identity service this product runs, and are never seen by the rest of it.",
      "Your profile: whatever you fill in on the profile page. A name, a nickname, a job title, a phone number, an address, a short biography, a date of birth, a gender. Everything on that page is optional except the name we call you by.",
      "Your payment methods: the cards and bank accounts you save in the wallet, so that you do not have to type them again.",
      "What you write to us: your name, an address to reply to, and the message itself when you use the contact form.",
      "What the program records: the points, the badges, the levels and the activity behind them. That is what the product is, so using it is what creates them.",
      'What happened to your account: each login, each login somebody tried and was refused, the end of each session, and each change to the way you get into it, such as an email address added or removed. A login you completed is recorded with the kind of device it came from, which is as specific as "Mac OS" or "iPhone" and no more. A refused one is recorded against the account it was aimed at, and an attempt on a name nobody holds is recorded against nobody at all. A session is recorded as ended whether you logged out or it simply ran out, and only where we recorded the login it belongs to. You can read the whole of it yourself on the Security & Access page, which is the reason it is kept.',
      "What your browser keeps for you: four things, listed under Cookies below.",
    ],
  },
  {
    id: "why",
    heading: "Why we collect it, and what allows us to",
    paragraphs: [
      "Every piece of it has a reason, and the reason is also what decides what we are allowed to do with it.",
    ],
    points: [
      "To give you the product you asked for. An account, a profile, a wallet and a scoreboard cannot exist without the data they are made of. What allows it is the contract between us.",
      "To keep the account yours. Signing you in, signing you out and remembering a session are a legitimate interest in not letting somebody else in.",
      "To show you what has been done to your account, and what somebody tried. A record of your own logins is the only way you can notice one that was not you, and a record of the refused ones is how you notice somebody guessing before they get anywhere. Recording when a session ended is what makes the rest of it readable: a login with nothing under it is one that may still be open somewhere. Keeping these is a legitimate interest in the security of your account, and they are yours to read rather than ours to study.",
      "To answer you when you write to us. Also a legitimate interest, and the message is kept for as long as answering it takes.",
      "To count visits or to measure advertising, if you allow it. What allows that is your consent and nothing else, so none of it runs until you give it, and it stops when you take it back.",
    ],
  },
  {
    id: "cookies",
    heading: "Cookies, and what your browser keeps",
    cookieChoices: true,
    paragraphs: [
      "This site sets no advertising cookies and no analytics cookies, because it has neither installed. What it does keep is kept in your own browser rather than sent anywhere, and there are four things in it: the token that keeps you signed in, two short-lived values that complete a sign-in, the language you picked in the top bar, and the record of the choice you made in the cookie box.",
      "Those four are the strictly necessary group. They are what the site cannot work without, so there is nothing in them to turn off, and the language you picked is there because you picked it: it is written only when you ask for it and it identifies nobody.",
      "Everything outside that group is off until you turn it on. Refusing is one press, exactly like accepting, and a refusal is remembered so you are not asked again on the next page. A choice stands for six months, and then we put the question again rather than assuming the answer has not changed.",
    ],
  },
  {
    id: "who-else",
    heading: "Who else sees it",
    paragraphs: [
      "Nothing here is sold, and nothing is handed to an advertiser. Four others see part of it, and each of them sees it for a reason you can check:",
    ],
    points: [
      "Keycloak, which holds accounts and passwords. It runs as part of this product rather than as somebody else's service, so nothing leaves us by being in it.",
      "Google, Facebook or Apple, if you choose to sign in with one of them. That is what signing in with them means: they are told you signed in here, and they tell us who you are.",
      "Google Fonts, which serves the two typefaces this site is set in. Your browser fetches them from fonts.googleapis.com on every page, which means Google is told your address and which page asked. It is the one third party that sees a visit whether or not you have an account, and we are working on serving the fonts ourselves instead.",
      "Anybody the law properly requires us to tell, which has not happened and which we would rather tell you about than not.",
    ],
  },
  {
    id: "where",
    heading: "Where it goes",
    paragraphs: [
      "The product itself keeps your data where it is hosted for your organization. The exceptions are the four above: Google, Facebook and Apple are United States companies, so a sign-in through one of them and the font request on every page both leave the United Kingdom and the European Economic Area. Where that happens it is covered by the standard contractual clauses those companies publish.",
    ],
  },
  {
    id: "how-long",
    heading: "How long we keep it",
    paragraphs: ["Nothing is kept because it might be useful one day."],
    points: [
      "Your account, your profile and your wallet stay until you close the account or ask us to delete them. Then they go.",
      "What the program recorded about you stays while your account does, because it is the account: points nobody can see are not points.",
      "A message you sent us is kept while it is being answered, and long enough afterwards to remember having answered it.",
      "What happened to your account is kept for twelve months. Older entries are dropped as new ones are recorded, so an account nobody is using keeps its last twelve months rather than emptying on a date.",
      "Your cookie choice is kept for six months, and then it expires on its own, whether or not you ever come back.",
    ],
  },
  {
    id: "rights",
    heading: "Your rights",
    paragraphs: [
      `If you are in the United Kingdom or the European Economic Area, all of these are yours, asking costs nothing, and we answer within a month. Write to ${MAILBOX}.`,
    ],
    points: [
      "See what we hold about you, and have a copy of it.",
      "Have anything wrong corrected. Most of it you can correct yourself on the profile page, which is quicker than asking us.",
      "Have it deleted.",
      "Have us stop using it while a disagreement about it is being sorted out.",
      "Take it somewhere else, in a form a machine can read.",
      "Object to anything we do on the grounds of a legitimate interest, and be told why if we carry on.",
      "Take back a consent you gave, whenever you like. It is one press, on the button in the cookies section above, and taking it back does not make what happened before it unlawful.",
      "Complain to a supervisory authority. In the United Kingdom that is the Information Commissioner's Office; in the European Economic Area it is the authority where you live.",
    ],
  },
  {
    id: "children",
    heading: "Children",
    paragraphs: [
      "This product is sold to organizations and is not meant for children. We do not knowingly collect anything from anybody under 16. If you believe a child has an account here, write to us and it will be closed.",
    ],
  },
  {
    id: "changes",
    heading: "When this page changes",
    paragraphs: [
      "It changes when what we do changes, and the date at the top of it is the date somebody last edited these words. If a change means we have to ask you something again, the cookie box comes back and asks it rather than treating an old answer as a new one.",
    ],
  },
] as const;
