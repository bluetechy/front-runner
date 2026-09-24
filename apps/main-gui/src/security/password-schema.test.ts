import { describe, expect, it } from "vitest";
import {
  checkChangePassword,
  emptyChangePassword,
  type ChangePasswordForm,
} from "./password-schema";

/*
 * What the change-password card is allowed to send.
 *
 * The rule for the new password is not stated here and is not tested here:
 * it is `password-rules.ts` in the authentication vertical, which has its own
 * file. What this one is about is the asymmetry between the three boxes, which
 * is the thing a card about passwords is easiest to get wrong.
 */

const filled: ChangePasswordForm = {
  Current: "letmein",
  Password: "Trombone-42-Fig",
  Confirm: "Trombone-42-Fig",
};

const check = (changes: Partial<ChangePasswordForm> = {}) =>
  checkChangePassword({ ...filled, ...changes });

describe("a form that is ready to send", () => {
  it("has nothing to say about it", () => {
    expect(check()).toEqual({});
  });
});

describe("the password the account has now", () => {
  it("asks for it when the box is empty", () => {
    expect(check({ Current: "" }).Current).toBe(
      "Enter the password you use now",
    );
  });

  /* The assertion this file exists for. Every password set before the realm
   * had a policy breaks that policy, and the account's own password is
   * exactly the value that must not be pre-refused for it. Whether it is right
   * is the identity provider's to say, and it is the only thing that can say
   * it. */
  it("is not held to the policy the new one keeps", () => {
    expect(check({ Current: "x" }).Current).toBeUndefined();
    expect(check({ Current: "letmein" }).Current).toBeUndefined();
  });
});

describe("the new password", () => {
  it("says what is missing from it, under its own box", () => {
    const problems = check({ Password: "short", Confirm: "short" });

    expect(problems.Password).toBe("A password needs at least 12 characters");
    expect(problems.Current).toBeUndefined();
  });

  /* Said here rather than left to the API, which refuses it for the same
   * reason and a round trip later. */
  it("refuses one that is the password they already have", () => {
    expect(
      check({
        Current: "Trombone-42-Fig",
        Password: "Trombone-42-Fig",
        Confirm: "Trombone-42-Fig",
      }).Password,
    ).toBe("Your new password has to be different from this one");
  });

  // The rule it broke is the more useful sentence: "different from this one"
  // over a password that is also too short would be answering the smaller of
  // two problems, and would leave somebody typing a second password that is
  // refused for the same reason as the first.
  it("says the rule it broke before it says it is the same one", () => {
    expect(
      check({ Current: "short", Password: "short", Confirm: "short" }),
    ).toMatchObject({ Password: "A password needs at least 12 characters" });
  });
});

describe("the second box", () => {
  // Reported on the confirmation box rather than on the password, because that
  // is the box somebody is looking at when they get it wrong.
  it("says the two do not match, under itself", () => {
    const problems = check({ Confirm: "Trombone-42-Fog" });

    expect(problems.Confirm).toBe("The two passwords do not match");
    expect(problems.Password).toBeUndefined();
  });
});

describe("what it says about an untouched form", () => {
  /* Every field is reported rather than the first, because a form that has to
   * be submitted once per mistake is a form nobody finishes. An empty form is
   * where that is easiest to see. */
  it("names every box that is not filled in, at once", () => {
    expect(checkChangePassword(emptyChangePassword)).toEqual({
      Current: "Enter the password you use now",
      Password: "A password needs at least 12 characters",
    });
  });
});
