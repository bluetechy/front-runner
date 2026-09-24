import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { PasswordReset, PasswordResetRequest } from "./password-reset.model.js";

/*
 * The shapes either side of a reset, and what is deliberately not in them.
 *
 * Asking for a link answers with the name that was asked about and nothing
 * else: an answer that said whether an account was found would make this the
 * easiest way in the product to learn who has one.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

describe("what asking for a link ends with", () => {
  it("echoes back the name it was asked about", () => {
    expect(typeOf(PasswordResetRequest.prototype, "Identifier")).toBe(String);
  });

  // The whole point of this file.
  it("says nothing about whether that name matched an account", () => {
    expect(fields(PasswordResetRequest)).toEqual(["Identifier"]);
    expect(
      fields(PasswordResetRequest).filter((field) =>
        /found|exists|sent|account/i.test(field),
      ),
    ).toEqual([]);
  });
});

describe("what following the link ends with", () => {
  it("carries the login name, which is what to login with", () => {
    expect(typeOf(PasswordReset.prototype, "LoginName")).toBe(String);
  });

  it("carries no password, no token and nothing that looks like a session", () => {
    expect(fields(PasswordReset)).toEqual(["LoginName"]);
    expect(
      fields(PasswordReset).filter((field) =>
        /password|token|secret|session/i.test(field),
      ),
    ).toEqual([]);
  });
});
