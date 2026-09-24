import { describe, expect, it } from "vitest";
import {
  checkRegistration,
  registrationSchema,
  type RegistrationForm,
} from "./registration-schema";

/*
 * What a new account is allowed to be, in the browser.
 *
 * A copy of main-api's `registration.schema.ts`; that one is the authority.
 * What this file pins is the part the API cannot check and the part the card
 * depends on: the confirmation box, and one sentence per box rather than one
 * sentence for the form.
 */

const filled: RegistrationForm = {
  Username: "marcus",
  Email: "marcus@example.test",
  FirstName: "Marcus",
  LastName: "Wright",
  Password: "Trombone-42-Fig",
  Confirm: "Trombone-42-Fig",
};

const check = (changes: Partial<RegistrationForm> = {}) =>
  checkRegistration({ ...filled, ...changes });

describe("a form that is ready to send", () => {
  it("has nothing to say about it", () => {
    expect(check()).toEqual({});
  });

  it("folds and trims the username and the address, so what is sent is what was checked", () => {
    const parsed = registrationSchema.safeParse({
      ...filled,
      Username: " Marcus ",
      Email: " Marcus@Example.Test ",
    });

    expect(parsed.data).toMatchObject({
      Username: "marcus",
      Email: "marcus@example.test",
    });
  });
});

describe("what it says about each box", () => {
  it.each([
    ["Username", { Username: "me" }, /at least 3 characters/],
    ["Username", { Username: "marcus wright" }, /letters, digits/],
    ["Email", { Email: "marcus.example.test" }, /like you@example\.com/],
    ["FirstName", { FirstName: "  " }, /Enter your first name/],
    ["LastName", { LastName: "" }, /Enter your last name/],
    ["Password", { Password: "short", Confirm: "short" }, /at least 12/],
  ])("says what is wrong with %s", (field, changes, expected) => {
    expect(check(changes)[field as keyof RegistrationForm]).toMatch(expected);
  });

  // The confirmation box is the one rule the API does not have: it is a
  // typing aid, only meaningful next to the box above it.
  it("says when the two passwords do not match, on the second box", () => {
    const problems = check({ Confirm: "Trombone-42-Fog" });

    expect(problems.Confirm).toMatch(/do not match/);
    expect(problems.Password).toBeUndefined();
  });

  // A form that has to be submitted once per mistake is a form nobody
  // finishes.
  it("answers for every box at once rather than the first", () => {
    const problems = checkRegistration({
      Username: "",
      Email: "",
      FirstName: "",
      LastName: "",
      Password: "",
      Confirm: "",
    });

    expect(Object.keys(problems).toSorted()).toEqual([
      "Email",
      "FirstName",
      "LastName",
      "Password",
      "Username",
    ]);
  });

  it("gives each box one sentence, not every rule it broke", () => {
    expect(check({ Username: "" }).Username).toMatch(/at least 3 characters/);
  });
});
