export { ForgotPasswordDialog } from "./forgot-password-dialog";
export { LoginDialog } from "./login-dialog";
export { SignUpDialog } from "./sign-up-dialog";
export { ResetPassword } from "./reset-password";
export { LoginPromptProvider, useLoginPrompt } from "./login-prompt";
export { SessionProvider, useSession } from "./session";
export {
  exchangeAuthorizationCode,
  takeRedirectVerifier,
  type Identity,
  type TokenSet,
} from "./identity-provider";
// What a password has to be. The security page's change-password card holds a
// password to exactly the rule the sign-up dialog and the reset page hold one
// to, and reads it from here rather than keeping a fourth copy of it.
export {
  PASSWORD_RULES,
  checkPassword,
  passwordProgress,
  passwordSchema,
  type PasswordRule,
} from "./password-rules";
// And the drawing of them, because all three cards that set a password show
// the same list ticking as it is met.
export { PasswordChecklist } from "./password-checklist";
// Connecting a provider to an account that is already logged in, which is the
// security page's SSO card asking and the auth callback finishing. The two
// halves are here because the trip goes through the provider and this is the
// vertical that knows one exists.
export {
  beginAccountLink,
  resumeAccountLink,
  takePendingAccountLink,
} from "./account-link";
