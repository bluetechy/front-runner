import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as passwordReset from "./index.js";
import { PasswordResetModule } from "./password-reset.module.js";
import { PasswordResetService } from "./password-reset.service.js";

describe("what the password reset vertical offers the rest of the API", () => {
  /* The service as well as the module, because the security page's "No, secure
   * account" is this flow: asking for a reset link on behalf of somebody who
   * is logged in and has just said a login was not theirs. */
  it("offers its module and the service that asks for a link", () => {
    expect(Object.keys(passwordReset).toSorted()).toEqual([
      "PasswordResetModule",
      "PasswordResetService",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(passwordReset.PasswordResetModule).toBe(PasswordResetModule);
    expect(passwordReset.PasswordResetService).toBe(PasswordResetService);
  });
});
