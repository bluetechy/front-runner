import { describe, expect, it } from "@jest/globals";
import { newPasswordSchema } from "../password-reset/index.js";
import { currentPasswordSchema } from "./password-change.schema.js";

/*
 * What the two boxes are allowed to hold, and the asymmetry between them,
 * which is the whole of what this file is about: the new password keeps the
 * realm's policy and the current one keeps almost nothing.
 */

const refusal = (schema: typeof currentPasswordSchema, value: string) => {
  const result = schema.safeParse(value);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("the password the account has now", () => {
  it("takes anything that is not empty", () => {
    expect(currentPasswordSchema.safeParse("a").success).toBe(true);
  });

  /* The point of the box. An empty one is somebody who has not answered the
   * question rather than somebody whose password is empty. */
  it("refuses an empty box, and says what to put in it", () => {
    expect(refusal(currentPasswordSchema, "")).toBe(
      "Enter the password you use now",
    );
  });

  /* The assertion this file exists for. Every password set before the realm
   * had a policy breaks that policy, and the account's own password is
   * exactly the value that must not be pre-refused for it: telling somebody
   * their current password is invalid when it is the one that gets them in is
   * the worst answer this card could give. */
  it("does not hold the current password to the policy a new one keeps", () => {
    const old = "letmein";

    expect(currentPasswordSchema.safeParse(old).success).toBe(true);
    expect(newPasswordSchema.safeParse(old).success).toBe(false);
  });

  it("stops where bcrypt stops, because nothing past that was ever hashed", () => {
    expect(refusal(currentPasswordSchema, "x".repeat(73))).toBe(
      "A password cannot be longer than 72 characters",
    );
  });
});

describe("the new password, which is the reset vertical's rule and not a copy", () => {
  it("takes one that keeps every part of the realm's policy", () => {
    expect(newPasswordSchema.safeParse("Trombone-42-Fig").success).toBe(true);
  });

  it("names the one rule that was broken, one box at a time", () => {
    expect(refusal(newPasswordSchema, "Short-1")).toBe(
      "A password needs at least 12 characters",
    );
    expect(refusal(newPasswordSchema, "trombone-42-fig")).toBe(
      "A password needs a capital letter",
    );
    expect(refusal(newPasswordSchema, "TROMBONE-42-FIG")).toBe(
      "A password needs a lower case letter",
    );
    expect(refusal(newPasswordSchema, "Trombone-Fig-Jar")).toBe(
      "A password needs a digit",
    );
    expect(refusal(newPasswordSchema, "Trombone42Figs")).toBe(
      "A password needs a symbol, like ! or ? or #",
    );
  });
});
