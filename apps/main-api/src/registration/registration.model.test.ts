import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { RegisteredAccount, RegistrationInput } from "./registration.model.js";

/*
 * The shapes either side of making an account.
 *
 * The assertion this file exists for is the one about what is not in the
 * answer. A password is carried in one direction only, and nothing about a
 * session comes back: minting those is Keycloak's job, and the dialog signs
 * in the ordinary way once the account exists.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

describe("what the form sends", () => {
  it.each([
    ["Username", String],
    ["Email", String],
    ["FirstName", String],
    ["LastName", String],
    ["Password", String],
  ])(
    "asks for %s, the way Keycloak's own registration page does",
    (field, type) => {
      expect(typeOf(RegistrationInput.prototype, field)).toBe(type);
    },
  );

  it("asks for those five and nothing else", () => {
    expect(fields(RegistrationInput).toSorted()).toEqual([
      "Email",
      "FirstName",
      "LastName",
      "Password",
      "Username",
    ]);
  });
});

describe("what comes back", () => {
  it("carries the username and the address as they were stored", () => {
    expect(typeOf(RegisteredAccount.prototype, "Username")).toBe(String);
    expect(typeOf(RegisteredAccount.prototype, "Email")).toBe(String);
  });

  // The whole point of this file.
  it("carries no password, and nothing that looks like a session", () => {
    expect(fields(RegisteredAccount).toSorted()).toEqual(["Email", "Username"]);
    expect(
      fields(RegisteredAccount).filter((field) =>
        /password|token|secret|session/i.test(field),
      ),
    ).toEqual([]);
  });
});
