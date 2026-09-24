import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as passwordReset from "./index.js";
import { PasswordResetModule } from "./password-reset.module.js";
import { newPasswordSchema } from "./password-reset.schema.js";
import { PasswordResetService } from "./password-reset.service.js";

describe("what the password reset vertical offers the rest of the API", () => {
  /* The service as well as the module, because the security page's "No, secure
   * account" is this flow: asking for a reset link on behalf of somebody who
   * is logged in and has just said a login was not theirs.
   *
   * And the rule a new password keeps, because the change-password vertical
   * has to hold a new password to exactly the rule a reset holds it to. A
   * product where those two differ is a product with a bug in it, and two
   * copies of the rule is how that bug gets written. */
  it("offers its module, the service that asks for a link, and the password rule", () => {
    expect(Object.keys(passwordReset).toSorted()).toEqual([
      "PasswordResetModule",
      "PasswordResetService",
      "newPasswordSchema",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(passwordReset.PasswordResetModule).toBe(PasswordResetModule);
    expect(passwordReset.PasswordResetService).toBe(PasswordResetService);
    expect(passwordReset.newPasswordSchema).toBe(newPasswordSchema);
  });
});
