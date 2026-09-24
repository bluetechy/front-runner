import { z } from "zod";

/*
 * What a password has to be, in the browser, in one place.
 *
 * Three cards set a password between them: the sign-up dialog, the page a
 * reset link lands on, and the change-password card on Security & Access.
 * They all state the same rule, so they all read it from here. Two copies of
 * this would be two cards that disagree about what a password is, and the one
 * that disagrees would be the one somebody meets first.
 *
 * **The realm is the authority.** `passwordPolicy` in
 * apps/keycloak-idp/realm/front-runner-realm.json is what actually refuses a
 * password, whoever set it and by whichever route, and main-api's
 * `password-reset.schema.ts` states the same rules on the way in. This is the
 * third statement of them and the least authoritative of the three: it exists
 * so a card can refuse a password beside the box that holds it, and show what
 * is still missing while somebody types, rather than after a round trip.
 *
 * The rules are PCI DSS 4.0's shape rather than NIST 800-63B's: twelve
 * characters with all four character classes. NIST would have length alone,
 * and the reason this product does not follow it there is that the realm has
 * no breached-password check behind it, which is the half of that advice that
 * does the work.
 */

/* One rule, as something a card can draw. The sentence is written as the thing
 * a password needs rather than as a complaint about the one that is there, so
 * the same words work in a checklist beside an empty box and under a full one.
 *
 * `holds` rather than a regular expression on the interface, because the
 * length rules are not expressions and a list where some items are patterns
 * and some are numbers is a list every reader has to take apart. */
export interface PasswordRule {
  /* What the checklist line says: "At least 12 characters". */
  label: string;
  /* What the box says when this is the rule that was broken: "A password
   * needs at least 12 characters". One sentence naming one rule, because a
   * helper line listing four things somebody has already done is a helper
   * line nobody reads. */
  message: string;
  holds: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    label: "At least 12 characters",
    message: "A password needs at least 12 characters",
    holds: (password) => password.length >= 12,
  },
  {
    label: "A capital letter",
    message: "A password needs a capital letter",
    holds: (password) => /[A-Z]/.test(password),
  },
  {
    label: "A lower case letter",
    message: "A password needs a lower case letter",
    holds: (password) => /[a-z]/.test(password),
  },
  {
    label: "A digit",
    message: "A password needs a digit",
    holds: (password) => /[0-9]/.test(password),
  },
  {
    label: "A symbol, like ! or ? or #",
    message: "A password needs a symbol, like ! or ? or #",
    holds: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

/* The upper bound, which is not in the list above and should not be. It is
 * bcrypt's: past 72 bytes the rest is not hashed, so accepting more would be
 * pretending. Nobody is working towards it, so a checklist line telling
 * somebody to stay under 72 characters would be a rule shown to the ninety-
 * nine percent of people it will never apply to. */
const LONGEST = 72;

/* One issue rather than five, and the first rule in the list that is broken
 * rather than an arbitrary one: the checklist beside the box is where the
 * whole list is shown, and it is shown in this order, so the sentence under
 * the box names the line somebody is working down towards. */
export const passwordSchema = z
  .string()
  .max(LONGEST, `A password cannot be longer than ${LONGEST} characters`)
  .superRefine((password, context) => {
    const broken = PASSWORD_RULES.find((rule) => !rule.holds(password));
    if (broken) context.addIssue({ code: "custom", message: broken.message });
  });

/* What a password box should say when it is wrong, or null when it is good.
 *
 * One sentence, naming the first rule that is broken rather than all of them.
 * The checklist beside the box is where the whole list is shown; a helper line
 * carrying five clauses is one nobody finishes reading. */
export function checkPassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

/* Every rule and whether this password keeps it, which is what a card draws
 * its checklist from. An empty box answers the same shape with every rule
 * unmet, so the list can be shown before anybody types: it is a set of
 * instructions first and a report second. */
export function passwordProgress(
  password: string,
): { rule: PasswordRule; met: boolean }[] {
  return PASSWORD_RULES.map((rule) => ({ rule, met: rule.holds(password) }));
}
