export { PasswordResetModule } from "./password-reset.module.js";
export { PasswordResetService } from "./password-reset.service.js";
// The rules a new password has to keep, which the change-password vertical
// states on its own form and must not restate differently. The realm behind
// both is what enforces them; see password-reset.schema.ts.
export { newPasswordSchema } from "./password-reset.schema.js";
// How somebody names their own account when they cannot login: the same rule,
// in the same words, for the forgot-password card and for the recovery-code
// one beside it. Two copies of it would be two ways to fold a name, and the
// two forms would then disagree about which account was being asked for.
export { identifierSchema } from "./password-reset.schema.js";
