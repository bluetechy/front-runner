import { describe, expect, it } from "@jest/globals";
import {
  identifierSchema,
  newPasswordSchema,
  resetTokenSchema,
} from "./password-reset.schema.js";

/*
 * What the two halves of a reset are allowed to be.
 *
 * The identifier is the unusual one, and what these hold about it is mostly
 * what it does not do: it accepts a username and an address without deciding
 * which it was given, because the search behind it asks Keycloak both ways
 * and because a refusal here would be this form telling somebody something
 * about the name they typed.
 */

describe("the name somebody types into the forgot-password form", () => {
  it("takes a username", () => {
    expect(identifierSchema.safeParse("marcus").data).toBe("marcus");
  });

  it("takes an email address just as happily", () => {
    expect(identifierSchema.safeParse("marcus@example.test").data).toBe(
      "marcus@example.test",
    );
  });

  // What is searched for is what was meant. Keycloak stores usernames folded
  // and matches addresses without regard to case.
  it("folds and trims what it was given", () => {
    expect(identifierSchema.safeParse("  Marcus@Example.Test  ").data).toBe(
      "marcus@example.test",
    );
  });

  it.each([
    ["an empty box", ""],
    ["a box holding only spaces", "   "],
    ["something longer than any name or address", "x".repeat(256)],
  ])("refuses %s", (_, value) => {
    expect(identifierSchema.safeParse(value).success).toBe(false);
  });
});

describe("the token from the link", () => {
  it("takes the UUID main-api mints", () => {
    const token = "6c2b6a1e-1f4d-4e8a-9c6b-0a1f2e3d4c5b";

    expect(resetTokenSchema.safeParse(token).data).toBe(token);
  });

  it.each([
    ["nothing at all", ""],
    ["a word", "reset-me"],
    ["a UUID with a character missing", "6c2b6a1e-1f4d-4e8a-9c6b-0a1f2e3d4c5"],
  ])("refuses %s", (_, value) => {
    expect(resetTokenSchema.safeParse(value).success).toBe(false);
  });

  // The same sentence the database raises for a token it does not know: from
  // the reader's side these are one thing, which is that the link did not
  // work.
  it("says what a reader can act on when it refuses", () => {
    expect(
      resetTokenSchema.safeParse("not-a-token").error?.issues[0]?.message,
    ).toBe("That password reset link is not valid or has already been used.");
  });
});

describe("the new password", () => {
  /* The realm's own policy, said here first so that the card hears all of it
   * at once rather than one rule at a time in Keycloak's words. See
   * `passwordPolicy` in apps/keycloak-idp/realm/front-runner-realm.json. */
  it("takes twelve characters with all four kinds in them", () => {
    expect(newPasswordSchema.safeParse("Trombone-42-Fig").success).toBe(true);
  });

  it("refuses eleven", () => {
    expect(newPasswordSchema.safeParse("Trombone-4").success).toBe(false);
  });

  it.each([
    ["no capital letter", "trombone-42-fig"],
    ["no lower case letter", "TROMBONE-42-FIG"],
    ["no digit", "Trombone-Fig-Jar"],
    ["no symbol", "Trombone42Figs"],
  ])("refuses one with %s", (_, password) => {
    expect(newPasswordSchema.safeParse(password).success).toBe(false);
  });

  /* Past bcrypt's 72 bytes the rest is not hashed, so accepting it would be
   * pretending the extra characters count for something. */
  it("refuses more than bcrypt hashes", () => {
    expect(newPasswordSchema.safeParse("x".repeat(73)).success).toBe(false);
  });

  // A password is a secret somebody typed on purpose. Trimming it would set
  // one password and let them login with another.
  it("leaves it exactly as it arrived", () => {
    expect(newPasswordSchema.safeParse("  Spaces 4 both ends!  ").data).toBe(
      "  Spaces 4 both ends!  ",
    );
  });
});
