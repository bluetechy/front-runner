import { describe, expect, it } from "vitest";
import { checkEmail, emailSchema } from "./email-schema";

/*
 * A copy of main-api's rule, and the two are meant to say the same thing. The
 * rule both hold is that the check is about catching a typo rather than about
 * implementing RFC 5322: turning away a valid address is the worse failure,
 * because the person holding it has no way round it.
 */

describe("an address typed into the add row", () => {
  it.each([
    "you@example.com",
    "first.last@example.co.uk",
    "marcus+work@example.test",
    "marcus_member@sub.example.test",
  ])("accepts %s", (address) => {
    expect(checkEmail(address)).toBeNull();
  });

  it.each([
    ["", "an empty box"],
    ["marcus", "no @ at all"],
    ["@example.test", "nothing before the @"],
    ["marcus@", "nothing after the @"],
    ["marcus@example", "no dot in the domain"],
    ["marcus member@example.test", "a space in it"],
  ])("refuses %j, which is %s", (address) => {
    expect(checkEmail(address)).not.toBeNull();
  });

  // What the box says underneath. A refusal that does not show the shape of
  // the answer leaves somebody guessing at what was wrong.
  it("says what a right answer looks like", () => {
    expect(checkEmail("marcus")).toContain("you@example.com");
  });

  // Folded and trimmed here, so the address that is sent is the one that was
  // checked and the one the column will hold.
  it("folds and trims, so what is sent is what was checked", () => {
    expect(emailSchema.parse("  Marcus.Member@Example.TEST  ")).toBe(
      "marcus.member@example.test",
    );
  });

  // dbo.UserEmails."Email" is varchar(255).
  it("refuses an address longer than the column behind it", () => {
    expect(checkEmail(`${"a".repeat(250)}@example.test`)).not.toBeNull();
  });
});
