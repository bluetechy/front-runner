import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { PasswordChange, PasswordStatus } from "./password-change.model.js";

/*
 * The shapes either side of a change, and what is deliberately not in them.
 *
 * Neither of these carries a password, which is the assertion worth having in
 * a file about passwords: nothing that has been typed into this card is ever
 * answered back out of it.
 */

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

describe("what the card knows before anybody types", () => {
  /* One field, and no assertion here about its runtime type: TypeScript emits
   * Object rather than Date for `Date | null`, and nullable is the half of
   * this that matters. What it is nullable for is in the model's own comment,
   * and the service test is where the null is actually exercised. */
  it("is one date and nothing else", () => {
    expect(fields(PasswordStatus)).toEqual(["ChangedAt"]);
  });
});

describe("what changing a password ends with", () => {
  it("carries the new stamp and how many other sessions were ended", () => {
    expect(fields(PasswordChange)).toEqual(["ChangedAt", "OtherSessionsEnded"]);
  });

  it("carries no password, no token and nothing that looks like a session id", () => {
    expect(
      fields(PasswordChange).filter((field) =>
        /password|token|secret|sessionid/i.test(field),
      ),
    ).toEqual([]);
  });
});
