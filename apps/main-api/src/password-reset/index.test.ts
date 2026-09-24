import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as passwordReset from "./index.js";
import { PasswordResetModule } from "./password-reset.module.js";

describe("what the password reset vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(passwordReset).toSorted()).toEqual([
      "PasswordResetModule",
    ]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(passwordReset.PasswordResetModule).toBe(PasswordResetModule);
  });
});
