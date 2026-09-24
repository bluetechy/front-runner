import { describe, expect, it } from "vitest";
import {
  PASSWORD_RULES,
  checkPassword,
  passwordProgress,
  passwordSchema,
} from "./password-rules";

/*
 * What a password has to be, in the browser.
 *
 * The third statement of a rule the realm enforces and main-api restates, and
 * the least authoritative of the three: `passwordPolicy` in
 * apps/keycloak-idp/realm/front-runner-realm.json is what actually refuses a
 * password. What is worth pinning here is that the sentences under the boxes
 * and the lines in the checklist come from one list, so a card cannot refuse a
 * password for a rule it never showed.
 */

const GOOD = "Trombone-42-Fig";

describe("the rules themselves", () => {
  it("is five of them: a length and the four kinds of character", () => {
    expect(PASSWORD_RULES).toHaveLength(5);
    expect(PASSWORD_RULES.map((rule) => rule.label)).toEqual([
      "At least 12 characters",
      "A capital letter",
      "A lower case letter",
      "A digit",
      "A symbol, like ! or ? or #",
    ]);
  });

  /* The checklist line and the sentence under the box are the same rule said
   * two ways, and they are said by one object: a card cannot show a list that
   * disagrees with the refusal it hands out. */
  it("carries both the way to show a rule and the way to say it is broken", () => {
    for (const rule of PASSWORD_RULES) {
      expect(rule.label).not.toBe("");
      expect(rule.message).not.toBe("");
      expect(rule.holds(GOOD)).toBe(true);
    }
  });
});

describe("checking one", () => {
  it("says nothing about a password that keeps every rule", () => {
    expect(checkPassword(GOOD)).toBeNull();
    expect(passwordSchema.safeParse(GOOD).success).toBe(true);
  });

  /* One sentence rather than five. A helper line carrying five clauses is one
   * nobody finishes reading, and the checklist beside the box is where the
   * whole list is shown. */
  it.each([
    ["too short", "Short-1", "A password needs at least 12 characters"],
    ["all lower case", "trombone-42-fig", "A password needs a capital letter"],
    ["all capitals", "TROMBONE-42-FIG", "A password needs a lower case letter"],
    ["no digit", "Trombone-Fig-Jar", "A password needs a digit"],
    [
      "no symbol",
      "Trombone42Figs",
      "A password needs a symbol, like ! or ? or #",
    ],
  ])("names the one rule a password %s broke", (_name, password, sentence) => {
    expect(checkPassword(password)).toBe(sentence);
  });

  /* The rule that is not in the list and should not be: it is bcrypt's, past
   * 72 bytes the rest is not hashed, and nobody is working towards it. A
   * checklist line telling somebody to stay under 72 characters would be a
   * rule shown to everybody it will never apply to. */
  it("refuses more than bcrypt hashes, without putting it in the list", () => {
    expect(checkPassword(`${GOOD}${"x".repeat(72)}`)).toBe(
      "A password cannot be longer than 72 characters",
    );
    expect(PASSWORD_RULES.filter((rule) => /72/.test(rule.label))).toEqual([]);
  });

  // A password is a secret somebody typed on purpose. Trimming it would set
  // one password and let them login with another.
  it("leaves it exactly as it was typed", () => {
    const padded = "  Spaces 4 both ends!  ";

    expect(passwordSchema.safeParse(padded).data).toBe(padded);
  });
});

describe("what the checklist is drawn from", () => {
  /* Drawn before anybody types, with nothing ticked: a list standing there is
   * a set of instructions, and the same list appearing after a refusal is a
   * telling-off. */
  it("answers for an empty box with every rule unmet", () => {
    expect(passwordProgress("").map(({ met }) => met)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it("ticks as they are met", () => {
    expect(passwordProgress("Trombone").map(({ met }) => met)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
    expect(passwordProgress(GOOD).every(({ met }) => met)).toBe(true);
  });

  it("answers in the order the rules are written in", () => {
    expect(passwordProgress(GOOD).map(({ rule }) => rule)).toEqual(
      PASSWORD_RULES,
    );
  });
});
