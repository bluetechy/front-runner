import { describe, expect, it } from "@jest/globals";
import { registrationSchema } from "./registration.schema.js";

/*
 * What a new account is allowed to be.
 *
 * Two things here are worth more than the rest. What the schema hands back is
 * what reaches Keycloak -- it folds and trims, so the account is created with
 * the address that was checked rather than the one that was typed. And every
 * failing field is reported at once, which is ZodPipe's doing, but only if
 * the schema is an object rather than a chain that stops at the first.
 */

const filled = {
  Username: "marcus",
  Email: "marcus@example.test",
  FirstName: "Marcus",
  LastName: "Wright",
  Password: "a-good-enough-password",
};

const parse = (changes: Record<string, unknown> = {}) =>
  registrationSchema.safeParse({ ...filled, ...changes });

describe("what is stored is what was checked", () => {
  it("folds and trims the username and the address", () => {
    const result = parse({
      Username: "  Marcus  ",
      Email: "  Marcus@Example.Test ",
    });

    expect(result.data).toMatchObject({
      Username: "marcus",
      Email: "marcus@example.test",
    });
  });

  it("trims the names without folding them", () => {
    expect(
      parse({ FirstName: " Marcus ", LastName: " Wright " }).data,
    ).toMatchObject({ FirstName: "Marcus", LastName: "Wright" });
  });

  // A password is a secret somebody typed on purpose. Trimming it would sign
  // the account up with one password and try to sign in with another.
  it("leaves the password exactly as it arrived", () => {
    expect(parse({ Password: "  spaces  both  ends  " }).data?.Password).toBe(
      "  spaces  both  ends  ",
    );
  });
});

describe("what it refuses", () => {
  it.each([
    ["a username too short to be one", { Username: "me" }],
    ["a username with a space in it", { Username: "marcus wright" }],
    ["a username with an @ in it", { Username: "marcus@example.test" }],
    ["an address with no @", { Email: "marcus.example.test" }],
    ["an address with no dot after the @", { Email: "marcus@example" }],
    ["a missing first name", { FirstName: "   " }],
    ["a missing last name", { LastName: "" }],
    ["a password of seven characters", { Password: "1234567" }],
    /* Past bcrypt's 72 bytes the rest is not hashed, so accepting it would
     * be pretending the extra characters count for something. */
    ["a password longer than bcrypt hashes", { Password: "x".repeat(73) }],
  ])("refuses %s", (_, changes) => {
    expect(parse(changes).success).toBe(false);
  });

  it("accepts dots, dashes and underscores in a username", () => {
    expect(parse({ Username: "marcus.a_wright-1" }).success).toBe(true);
  });

  // A form that has to be submitted once per mistake is a form nobody
  // finishes. ZodPipe reports every issue; it can only do that if the schema
  // collects them.
  it("reports every empty field at once rather than the first", () => {
    const result = registrationSchema.safeParse({
      Username: "",
      Email: "",
      FirstName: "",
      LastName: "",
      Password: "",
    });

    /* Unique: an empty username breaks two of its rules and is reported
     * twice, which is right -- both sentences are true of it. */
    const named = new Set(result.error?.issues.map((issue) => issue.path[0]));
    expect([...named].toSorted()).toEqual([
      "Email",
      "FirstName",
      "LastName",
      "Password",
      "Username",
    ]);
  });

  it("refuses a form with fields missing altogether", () => {
    expect(registrationSchema.safeParse({ Username: "marcus" }).success).toBe(
      false,
    );
  });
});
