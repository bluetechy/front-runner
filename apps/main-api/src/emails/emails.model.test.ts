import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { EmailSettings, UserEmail, VerifiedEmail } from "./emails.model.js";

/*
 * The security page's address list.
 *
 * The assertion this file exists for is the one about what is *not* here. The
 * verification token is the secret from a link in an email, and it is what
 * makes following that link proof of anything. If any of these objects ever
 * grows a field holding one, these fail, which is the point.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

describe("an address on file", () => {
  it.each([
    ["UserEmailUUID", String],
    ["Email", String],
    ["IsPrimary", Boolean],
    ["IsVerified", Boolean],
    ["CreatedAt", Date],
  ])("exposes %s", (field, type) => {
    expect(typeOf(UserEmail.prototype, field)).toBe(type);
  });

  it("never carries a verification token", () => {
    expect(
      fields(UserEmail).filter((field) => /token|secret/i.test(field)),
    ).toEqual([]);
  });

  // The derived half and the timestamp are both there on purpose: a status
  // column asks the first and a sentence saying when asks the second.
  //
  // "VerifiedAt" is asserted by name rather than by type: it is declared
  // `Date | null`, and TypeScript emits Object for a union, so the reflected
  // type says nothing useful. What matters is that the field is there beside
  // the flag, and that it is the nullable one -- an address nobody has
  // verified has no timestamp, and there is no date that means "not yet".
  it("carries both the verified flag and the time it was verified", () => {
    expect(typeOf(UserEmail.prototype, "IsVerified")).toBe(Boolean);
    expect(fields(UserEmail)).toContain("VerifiedAt");
  });
});

describe("what the security page reads in one query", () => {
  it("holds the list and the privacy switch together", () => {
    expect(fields(EmailSettings).toSorted()).toEqual([
      "Addresses",
      "EmailIsPrivate",
    ]);
  });

  it("never carries a verification token", () => {
    expect(
      fields(EmailSettings).filter((field) => /token|secret/i.test(field)),
    ).toEqual([]);
  });
});

describe("what following a verification link answers with", () => {
  // Answered to whoever opened the link, which is not necessarily a
  // signed-in session, so it says which address was confirmed and nothing
  // else about the account behind it.
  it("says which address was confirmed, and nothing more", () => {
    expect(fields(VerifiedEmail)).toEqual(["Email"]);
    expect(typeOf(VerifiedEmail.prototype, "Email")).toBe(String);
  });
});
