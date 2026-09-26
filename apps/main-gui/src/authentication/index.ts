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
// Turning on an authenticator app, which is the same shape as connecting a
// provider and for a sharper reason: the secret is minted at the provider and
// shown once, so no API can hand it over. The security page asks, the auth
// callback lands it, and neither of them knows what the provider calls the
// action.
export {
  beginSecondFactorSetup,
  canConfigureSecondFactor,
  setupReturnPath,
  takePendingSecondFactor,
} from "./second-factor-setup";
// Registering a passkey, which is the same trip again and for a sharper
// reason: the browser's WebAuthn call is bound to the origin it is made
// from, so a passkey made on this origin is one the provider would never be
// shown. The security page asks, the auth callback lands it, and neither of
// them knows what the provider calls the action.
export {
  beginPasskeyRegistration,
  canRegisterPasskey,
  passkeyReturnPath,
  takePendingPasskey,
} from "./passkey-setup";
// Spending a recovery code, which the login card does when somebody cannot
// produce a second factor. It goes to main-api without a session, like the
// two password-reset calls beside it.
export { useRecoveryCode, RecoveryCodeError } from "./recovery-code";
