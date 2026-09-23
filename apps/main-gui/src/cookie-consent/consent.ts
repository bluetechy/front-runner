import { z } from "zod";
import { read, remove, write } from "../browser-storage";
import { categories, type CategoryId } from "./categories";

/*
 * What somebody chose, written down in this browser.
 *
 * It is `localStorage` rather than a cookie, through the guarded wrapper in
 * `browser-storage` for the reason that wrapper exists: a browser that
 * refuses site data throws on the way in, and the one box on the site that
 * exists to respect a refusal must not be the thing that takes the page down.
 * A browser that refuses storage is a browser that will be asked again next
 * visit, which is the right failure.
 *
 * Three rules are written here rather than in the components, because they
 * are the rules an auditor asks about and not decoration:
 *
 * - **No decision is not a decision.** Nothing is stored until somebody
 *   presses a button. A visitor who scrolls, or who reloads, has consented to
 *   nothing and is asked again.
 * - **A decision goes stale.** The CNIL's guidance is that a choice is worth
 *   six months, and then the question is put again. `GOOD_FOR_MONTHS` is that
 *   number, and an older record reads as no decision at all.
 * - **A changed question is a new question.** `VERSION` goes up when the
 *   categories change or when something new starts being kept under one, and
 *   every older record reads as no decision. Consent to four categories is
 *   not consent to a fifth.
 *
 * What this does *not* do is prove anything to a regulator. The record is in
 * the visitor's own browser, so they can edit it and it leaves with their
 * site data. Demonstrating consent means a row on a server with a timestamp
 * against it, and that is main-api's to grow: see docs/cookie-consent.md.
 */

export const STORAGE_KEY = "front-runner.cookie-consent";

/* Raise this when the categories change, or when something new starts being
 * kept under one. Everything written under an older number is asked again. */
export const VERSION = 1;

/* How long a choice stands before it is put again. The CNIL's recommendation,
 * and the one number here anybody is likely to want to argue with. */
export const GOOD_FOR_MONTHS = 6;

/* On or off, for every category. `necessary` is in it and is always true:
 * leaving it out would make the record say less than the dialog showed. */
export type Choices = Readonly<Record<CategoryId, boolean>>;

export interface Decision {
  choices: Choices;
  /* When the button was pressed, ISO-8601. What makes a record go stale. */
  at: string;
  /* Which set of categories was being agreed to. */
  version: number;
}

/* Every optional category set the same way, with necessary always on. */
function all(allowed: boolean): Choices {
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      category.required === true ? true : allowed,
    ]),
  ) as Choices;
}

/* What "Reject all" means, and what "Accept all" means. Neither can turn the
 * necessary category off, which is why rejecting everything is still a record
 * with one `true` in it. */
export const nothingOptional = all(false);
export const everything = all(true);

/*
 * Whatever is in storage, read defensively. It was last written by an older
 * version of this app, or by somebody with the developer tools open, so it is
 * parsed rather than trusted -- and anything that does not parse is read as
 * nobody having chosen, which asks again rather than assuming a yes.
 */
const stored = z.object({
  version: z.number().int(),
  at: z.iso.datetime(),
  choices: z.object({
    necessary: z.boolean(),
    preferences: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
});

/* When a choice made at `at` stops standing. Adding six months to the 31st
 * lands in the month after the short one, which is a day or two either way on
 * a six-month window and not worth a date library. */
export function expiresAt(at: string): Date {
  const made = new Date(at);
  const expiry = new Date(made);
  expiry.setMonth(expiry.getMonth() + GOOD_FOR_MONTHS);
  return expiry;
}

/*
 * The decision this browser is holding, or null when there is none worth
 * holding: nothing stored, something unreadable, something agreed to under an
 * older set of categories, or something older than six months.
 *
 * `now` is a parameter so a test can stand six months in the future without
 * standing six months in the future.
 */
export function readDecision(now: Date = new Date()): Decision | null {
  const raw = read("local", STORAGE_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = stored.safeParse(parsed);
  if (!result.success) return null;

  const { version, at, choices } = result.data;
  if (version !== VERSION) return null;
  if (Number.isNaN(new Date(at).getTime())) return null;
  if (expiresAt(at) <= now) return null;

  /* Necessary is true whatever the record says. A stored `false` there is a
   * record somebody edited, and the site still needs to keep you signed in. */
  return { version, at, choices: { ...choices, necessary: true } };
}

/* Write a choice down, and hand back what was written so the caller holds
 * exactly what the next visit will read. */
export function recordDecision(
  choices: Choices,
  now: Date = new Date(),
): Decision {
  const decision: Decision = {
    version: VERSION,
    at: now.toISOString(),
    choices: { ...choices, necessary: true },
  };
  write("local", STORAGE_KEY, JSON.stringify(decision));
  return decision;
}

/* Throw the record away, which puts the question back. Nothing in the
 * interface does this yet; it is what a "forget me" control would call, and
 * what the tests use to get back to a first visit. */
export function forgetDecision(): void {
  remove("local", STORAGE_KEY);
}
