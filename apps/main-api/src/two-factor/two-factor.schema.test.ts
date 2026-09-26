import { describe, expect, it } from "@jest/globals";
import {
  kindSchema,
  phoneNumberSchema,
  recoveryCodeSchema,
  verificationCodeSchema,
} from "./two-factor.schema.js";

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

/*
 * A phone number, as people actually write their own.
 */
describe("the phone number", () => {
  const parsed = (written: string) => phoneNumberSchema.safeParse(written);

  it.each([
    ["+15555550123", "+15555550123"],
    ["+1 555 555 0123", "+15555550123"],
    ["+1 (555) 555-0123", "+15555550123"],
    ["  +44 20 7946 0958  ", "+442079460958"],
    ["+1.555.555.0123", "+15555550123"],
  ])("reads %s as %s", (written, expected) => {
    expect(parsed(written)).toMatchObject({ success: true, data: expected });
  });

  /* Not guessed at. A number without a country code is a number in whichever
   * country the server happens to be in, and that is how a login code goes to
   * a stranger. */
  it.each([
    ["a number with no country code", "5555550123"],
    ["a number with a leading zero for a country code", "+05555550123"],
    ["something that is not a number", "call me"],
    ["far too many digits", "+1555555012345678"],
    ["far too few", "+1555"],
    ["nothing at all", ""],
  ])("refuses %s", (_name, written) => {
    expect(parsed(written).success).toBe(false);
  });

  it("says what a good one looks like", () => {
    const failure = parsed("5555550123");

    expect(failure.success).toBe(false);
    expect(failure.error?.issues[0]?.message).toContain("country code");
  });
});

/*
 * The six digits back out of the message.
 */
describe("the verification code", () => {
  const parsed = (typed: string) => verificationCodeSchema.safeParse(typed);

  it.each([
    ["483920", "483920"],
    [" 483920 ", "483920"],
    ["483 920", "483920"],
    ["483-920", "483920"],
  ])("reads %s as %s", (typed, expected) => {
    expect(parsed(typed)).toMatchObject({ success: true, data: expected });
  });

  /* Leading zeros are digits like any other: a code of 048392 is a code. */
  it("keeps a leading zero", () => {
    expect(parsed("048392")).toMatchObject({ success: true, data: "048392" });
  });

  it.each([
    ["five digits", "48392"],
    ["seven digits", "4839201"],
    ["letters", "48392a"],
    ["nothing at all", ""],
  ])("refuses %s", (_name, typed) => {
    expect(parsed(typed).success).toBe(false);
  });

  /* The same sentence a wrong code gets. From the reader's side there is no
   * difference: it did not work. */
  it("says the same thing a wrong code says", () => {
    const failure = parsed("48392");

    expect(failure.error?.issues[0]?.message).toContain("not right");
  });
});
