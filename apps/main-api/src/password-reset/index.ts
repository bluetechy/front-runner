export { PasswordResetModule } from "./password-reset.module.js";
export { PasswordResetService } from "./password-reset.service.js";
// The rules a new password has to keep, which the change-password vertical
// states on its own form and must not restate differently. The realm behind
// both is what enforces them; see password-reset.schema.ts.
export { newPasswordSchema } from "./password-reset.schema.js";
