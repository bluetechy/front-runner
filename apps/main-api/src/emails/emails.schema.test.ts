import { describe, expect, it } from "@jest/globals";
import { emailSchema, verificationTokenSchema } from "./emails.schema.js";

/*
 * What an address is allowed to be. The rule these hold is that the check is
 * about catching a typo rather than about implementing RFC 5322: turning away
 * a valid address is the worse failure, because the person holding it has no
 * way round it.
 */

describe("an email address on the way in", () => {
  it.each([
    "you@example.com",
    "first.last@example.co.uk",
    "marcus+work@example.test",
    "marcus_member@sub.example.test",
  ])("accepts %s", (address) => {
    expect(emailSchema.safeParse(address).success).toBe(true);
  });

  it.each([
    ["", "an empty box"],
    ["marcus", "no @ at all"],
    ["@example.test", "nothing before the @"],
    ["marcus@", "nothing after the @"],
    ["marcus@example", "no dot in the domain"],
    ["marcus member@example.test", "a space in it"],
  ])("refuses %j, which is %s", (address) => {
    expect(emailSchema.safeParse(address).success).toBe(false);
  });

  // Folded and trimmed here, so what is validated is what is sent and what is
  // stored. dbo.UserEmails."Email" has a check constraint that refuses
  // anything else, and its unique key depends on it.
  it("folds to lower case and trims, so the stored form is the checked one", () => {
    expect(emailSchema.parse("  Marcus.Member@Example.TEST  ")).toBe(
      "marcus.member@example.test",
    );
  });

  // The column is varchar(255). Refused here rather than truncated by
  // Postgres, which would store a different address from the one typed.
  it("refuses an address longer than the column", () => {
    const long = `${"a".repeat(250)}@example.test`;
    expect(emailSchema.safeParse(long).success).toBe(false);
  });

  it("says something a person can act on when it refuses", () => {
    const refusal = emailSchema.safeParse("marcus");
    expect(refusal.success).toBe(false);
    if (!refusal.success)
      expect(refusal.error.issues[0]?.message).toContain("you@example.com");
  });
});

describe("the token from a verification link", () => {
  it("accepts the shape main-api mints", () => {
    expect(
      verificationTokenSchema.safeParse("3f2504e0-4f89-41d3-9a0c-0305e82c3301")
        .success,
    ).toBe(true);
  });

  it.each(["", "not-a-token", "3f2504e0-4f89-41d3-9a0c"])(
    "refuses %j before it reaches a query",
    (token) => {
      expect(verificationTokenSchema.safeParse(token).success).toBe(false);
    },
  );
});
