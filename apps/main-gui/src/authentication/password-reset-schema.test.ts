import { describe, expect, it } from "vitest";
import {
  checkIdentifier,
  checkNewPassword,
  identifierSchema,
  newPasswordSchema,
} from "./password-reset-schema";

/*
 * The browser's copy of main-api's password reset rules.
 *
 * What is worth holding here is what the two `check` helpers hand back,
 * because that is what a card puts under a box: one sentence per box, and
 * every wrong box at once rather than the first.
 */

const filled = {
  Password: "Trombone-42-Fig",
  Confirm: "Trombone-42-Fig",
};

describe("the name somebody types into the forgot-password card", () => {
  it("takes a username and an email address alike", () => {
    expect(identifierSchema.safeParse("marcus").success).toBe(true);
    expect(identifierSchema.safeParse("marcus@example.test").success).toBe(
      true,
    );
  });

  it("folds and trims it, so what is searched for is what was meant", () => {
    expect(identifierSchema.safeParse("  Marcus  ").data).toBe("marcus");
  });

  it("asks for something when the box is empty", () => {
    expect(checkIdentifier("   ")).toBe("Enter your username or email address");
  });

  it("says nothing when the box is filled", () => {
    expect(checkIdentifier("marcus")).toBeNull();
  });
});

describe("the new password", () => {
  it("accepts a password typed the same way twice", () => {
    expect(newPasswordSchema.safeParse(filled).success).toBe(true);
    expect(checkNewPassword(filled)).toEqual({});
  });

  /* The realm's own policy, said here so the box can refuse a password
   * beside itself. One sentence at a time, naming the first rule in the list
   * that is broken: the checklist beside the box is where all five are shown.
   * See `password-rules.ts`. */
  it("asks for twelve characters, and then for each kind of them", () => {
    expect(
      checkNewPassword({ Password: "Short-1", Confirm: "Short-1" }),
    ).toEqual({ Password: "A password needs at least 12 characters" });
    expect(
      checkNewPassword({
        Password: "trombone-42-fig",
        Confirm: "trombone-42-fig",
      }),
    ).toEqual({ Password: "A password needs a capital letter" });
    expect(
      checkNewPassword({
        Password: "Trombone42Figs",
        Confirm: "Trombone42Figs",
      }),
    ).toEqual({ Password: "A password needs a symbol, like ! or ? or #" });
  });

  /* Past bcrypt's 72 bytes the rest is not hashed. */
  it("refuses more than bcrypt hashes", () => {
    const long = "x".repeat(73);

    expect(checkNewPassword({ Password: long, Confirm: long })).toEqual({
      Password: "A password cannot be longer than 72 characters",
    });
  });

  // Reported on the confirmation box, because that is the box somebody is
  // looking at when they get it wrong.
  it("says the two do not match, under the second one", () => {
    expect(
      checkNewPassword({
        Password: "Trombone-42-Fig",
        Confirm: "Trombone-42-Fog",
      }),
    ).toEqual({ Confirm: "The two passwords do not match" });
  });

  // A password is a secret somebody typed on purpose. Trimming it would set
  // one password and let them login with another.
  it("leaves the password exactly as it was typed", () => {
    const padded = "  Spaces 4 both ends!  ";

    expect(
      newPasswordSchema.safeParse({ Password: padded, Confirm: padded }).data
        ?.Password,
    ).toBe(padded);
  });
});
