import { describe, expect, it } from "@jest/globals";
import { kindSchema, recoveryCodeSchema } from "./two-factor.schema.js";

/*
 * What may be named and typed on the way in.
 *
 * The recovery-code rules are the ones that matter: a code is read off a
 * screen or a printout and typed back in somewhere else, so what arrives is
 * the same secret wearing whatever spacing, case and hyphenation the person
 * gave it. All of that is folded away before a hash is computed, because the
 * hash is what the answer is compared against and three spellings of one code
 * would be three different hashes.
 */

describe("which kind of factor an operation may be about", () => {
  it("takes the two this product has rows for", () => {
    expect(kindSchema.parse("authenticator-app")).toBe("authenticator-app");
    expect(kindSchema.parse("sms")).toBe("sms");
  });

  /* A closed list, unlike the login-provider alias next door: the realm
   * decides which providers exist, and this product decides which factors it
   * has built a flow for. */
  it("refuses anything else", () => {
    expect(() => kindSchema.parse("passkey")).toThrow(
      "not a two-factor method",
    );
    expect(() => kindSchema.parse("")).toThrow();
  });
});

describe("what a recovery code may be", () => {
  it("takes one as it is printed", () => {
    expect(recoveryCodeSchema.parse("abcde-fghij")).toBe("abcdefghij");
  });

  it("takes one typed without the hyphen", () => {
    expect(recoveryCodeSchema.parse("abcdefghij")).toBe("abcdefghij");
  });

  it("takes one typed in capitals, or with spaces in it", () => {
    expect(recoveryCodeSchema.parse("ABCDE FGHIJ")).toBe("abcdefghij");
    expect(recoveryCodeSchema.parse("  abcde fghij  ")).toBe("abcdefghij");
  });

  /* Refused before a hash is computed and a query is made. The sentence is
   * the one a wrong code gets, because from the reader's side these are the
   * same thing: it did not work. */
  it("refuses one that could not be a code at all", () => {
    for (const nonsense of ["", "abc", "abcdefghijk", "abcde-fghi!"])
      expect(() => recoveryCodeSchema.parse(nonsense)).toThrow(
        "not valid or has already been used",
      );
  });
});
