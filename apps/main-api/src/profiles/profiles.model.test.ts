import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { UserProfile, UserProfileInput } from "./profiles.model.js";

/*
 * The profile page's fields, one object for reading and one for writing.
 *
 * The two lists are asserted against each other rather than each on its own:
 * the input is the output minus the key, and a field added to one and
 * forgotten in the other is a field the form can read and never save.
 *
 * Nothing Keycloak owns is in either of them -- Name, LoginName and Email
 * live on User and are refreshed from the token on every sign-in, so a
 * profile write that touched them would last until the next one.
 */

const fields = (model: object) =>
  Object.getOwnPropertyNames(new (model as new () => object)());

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

const written = [
  "FirstName",
  "LastName",
  "NickName",
  "Designation",
  "Biography",
  "Gender",
  "BirthDate",
  "Phone",
  "Address",
  "Facebook",
  "Github",
  "LinkedIn",
  "TikTok",
  "Twitter",
  "WantsAwardEmails",
  "WantsDigestEmails",
];

describe("the profile a caller reads", () => {
  it.each(written)("exposes %s", (field) => {
    expect(typeOf(UserProfile.prototype, field)).toBeDefined();
  });

  it("is keyed by the account it belongs to", () => {
    expect(typeOf(UserProfile.prototype, "UserUUID")).toBe(String);
  });

  // A date that becomes a timestamp is midnight somewhere and the day before
  // that somewhere else, so a day stays the string "1990-04-17".
  it("carries the birth date as a day rather than as a moment", () => {
    expect(typeOf(UserProfile.prototype, "BirthDate")).toBe(Object);
    expect(typeOf(UserProfile.prototype, "BirthDate")).not.toBe(Date);
  });

  it.each(["Name", "LoginName", "Email"])(
    "leaves %s to the account, which Keycloak owns",
    (field) => {
      expect(typeOf(UserProfile.prototype, field)).toBeUndefined();
    },
  );
});

describe("the profile a caller writes", () => {
  it("takes every field the profile shows, and no key", () => {
    expect(fields(UserProfileInput).toSorted()).toEqual(written.toSorted());
  });

  // Empty means "not given". The whole profile is submitted every time, so
  // there is no way for the input to say "leave this one alone" -- and no
  // need for the birth date to be nullable in it.
  it("takes the birth date as a string, empty for `not given`", () => {
    expect(typeOf(UserProfileInput.prototype, "BirthDate")).toBe(String);
  });
});
