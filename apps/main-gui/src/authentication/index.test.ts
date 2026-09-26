import { describe, expect, it } from "vitest";
import * as authentication from "./index";
import { ForgotPasswordDialog } from "./forgot-password-dialog";
import { LoginDialog } from "./login-dialog";
import { SignUpDialog } from "./sign-up-dialog";
import { ResetPassword } from "./reset-password";
import { LoginPromptProvider, useLoginPrompt } from "./login-prompt";
import { SessionProvider, useSession } from "./session";
import {
  exchangeAuthorizationCode,
  takeRedirectVerifier,
} from "./identity-provider";
import {
  beginAccountLink,
  resumeAccountLink,
  takePendingAccountLink,
} from "./account-link";

/*
 * What the rest of the app may reach for.
 *
 * All three cards are here, and the provider that owns them: it is the
 * provider that anything on a page reaches for, and the cards themselves are
 * exported beside it so that none is reachable only through another. The
 * page a reset link lands on is here too, because a route file needs it.
 *
 * Most of `keycloak.ts` is deliberately absent: `signInWithPassword`,
 * `refreshTokens`, `endSession` and `startRedirect` are the session's and the
 * dialog's business, and a page that could call one of them could sign
 * somebody in without the provider knowing. The two that are here are the
 * callback route's, which finishes a redirect this vertical started.
 *
 * The three account-link functions are here for the same reason and are split
 * the same way: the security page starts a connection, the callback route
 * finishes it, and neither of them may build a provider URL of its own. That
 * stays in `identity-provider.ts`, which is the one file that knows a provider
 * exists.
 *
 * The four second-factor functions are the same shape again: the security
 * page asks for a setup trip and says whether one is possible at all, the
 * callback route lands it, and what the provider calls the action stays
 * behind them. And `useRecoveryCode`, which the login card spends one with
 * when there is no session to speak of.
 */

describe("what authentication offers the rest of the app", () => {
  it("offers the three cards, the reset page, the two providers, their hooks, the callback's pair, the password rules, account linking and the second factor", () => {
    expect(Object.keys(authentication).toSorted()).toEqual([
      "ForgotPasswordDialog",
      "LoginDialog",
      "LoginPromptProvider",
      "PASSWORD_RULES",
      "PasswordChecklist",
      "RecoveryCodeError",
      "ResetPassword",
      "SessionProvider",
      "SignUpDialog",
      "beginAccountLink",
      "beginSecondFactorSetup",
      "canConfigureSecondFactor",
      "checkPassword",
      "exchangeAuthorizationCode",
      "passwordProgress",
      "passwordSchema",
      "resumeAccountLink",
      "setupReturnPath",
      "takePendingAccountLink",
      "takePendingSecondFactor",
      "takeRedirectVerifier",
      "useLoginPrompt",
      "useRecoveryCode",
      "useSession",
    ]);
  });

  /* The security page's change-password card holds a password to exactly the
   * rule the sign-up dialog and the reset page hold one to, and reads it from
   * here. A fourth copy of that rule would be a fourth card that could
   * disagree about what a password is. */
  it("offers the password rules, because three cards set a password", () => {
    expect(authentication.PASSWORD_RULES.length).toBeGreaterThan(0);
    expect(authentication.checkPassword("Trombone-42-Fig")).toBeNull();
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(authentication.LoginDialog).toBe(LoginDialog);
    expect(authentication.SignUpDialog).toBe(SignUpDialog);
    expect(authentication.ForgotPasswordDialog).toBe(ForgotPasswordDialog);
    expect(authentication.ResetPassword).toBe(ResetPassword);
    expect(authentication.LoginPromptProvider).toBe(LoginPromptProvider);
    expect(authentication.useLoginPrompt).toBe(useLoginPrompt);
    expect(authentication.SessionProvider).toBe(SessionProvider);
    expect(authentication.useSession).toBe(useSession);
    expect(authentication.exchangeAuthorizationCode).toBe(
      exchangeAuthorizationCode,
    );
    expect(authentication.takeRedirectVerifier).toBe(takeRedirectVerifier);
    expect(authentication.beginAccountLink).toBe(beginAccountLink);
    expect(authentication.takePendingAccountLink).toBe(takePendingAccountLink);
    expect(authentication.resumeAccountLink).toBe(resumeAccountLink);
  });

  it.each([
    "signInWithPassword",
    "refreshTokens",
    "endSession",
    "startRedirect",
    "readIdentity",
    /* The provider's linking URL, which is built from a token's session and
     * hashed the way that provider wants. A page that could build one could
     * send somebody to a provider with a hash of its own choosing. */
    "accountLinkUrl",
  ])("keeps %s to itself", (name) => {
    expect(Object.keys(authentication)).not.toContain(name);
  });
});
