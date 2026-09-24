import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as passwordChange from "./index.js";
import { PasswordChangeModule } from "./password-change.module.js";

describe("what the password change vertical offers the rest of the API", () => {
  /* The module and nothing else, which is the rule rather than an omission.
   * The reset vertical next door exports its service because the security page
   * has to be able to send somebody a link; nothing anywhere has a reason to
   * change a password on an account's behalf, and an exported service that
   * could would be a way to do it without the current password. */
  it("offers its module and nothing else", () => {
    expect(Object.keys(passwordChange).toSorted()).toEqual([
      "PasswordChangeModule",
    ]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(passwordChange.PasswordChangeModule).toBe(PasswordChangeModule);
  });
});
