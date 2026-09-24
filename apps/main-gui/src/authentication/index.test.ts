import { describe, expect, it } from "vitest";
import * as authentication from "./index";
import { LoginDialog } from "./login-dialog";
import { SignUpDialog } from "./sign-up-dialog";
import { LoginPromptProvider, useLoginPrompt } from "./login-prompt";
import { SessionProvider, useSession } from "./session";
import { exchangeAuthorizationCode, takeRedirectVerifier } from "./keycloak";

/*
 * What the rest of the app may reach for.
 *
 * Both cards are here, and the provider that owns them: it is the provider
 * that anything on a page reaches for, and the cards themselves are exported
 * beside it so that neither is reachable only through the other.
 *
 * Most of `keycloak.ts` is deliberately absent: `signInWithPassword`,
 * `refreshTokens`, `endSession` and `startRedirect` are the session's and the
 * dialog's business, and a page that could call one of them could sign
 * somebody in without the provider knowing. The two that are here are the
 * callback route's, which finishes a redirect this vertical started.
 */

describe("what authentication offers the rest of the app", () => {
  it("offers the two cards, the two providers, their hooks, and the callback's pair", () => {
    expect(Object.keys(authentication).toSorted()).toEqual([
      "LoginDialog",
      "LoginPromptProvider",
      "SessionProvider",
      "SignUpDialog",
      "exchangeAuthorizationCode",
      "takeRedirectVerifier",
      "useLoginPrompt",
      "useSession",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(authentication.LoginDialog).toBe(LoginDialog);
    expect(authentication.SignUpDialog).toBe(SignUpDialog);
    expect(authentication.LoginPromptProvider).toBe(LoginPromptProvider);
    expect(authentication.useLoginPrompt).toBe(useLoginPrompt);
    expect(authentication.SessionProvider).toBe(SessionProvider);
    expect(authentication.useSession).toBe(useSession);
    expect(authentication.exchangeAuthorizationCode).toBe(
      exchangeAuthorizationCode,
    );
    expect(authentication.takeRedirectVerifier).toBe(takeRedirectVerifier);
  });

  it.each([
    "signInWithPassword",
    "refreshTokens",
    "endSession",
    "startRedirect",
    "readIdentity",
  ])("keeps %s to itself", (name) => {
    expect(Object.keys(authentication)).not.toContain(name);
  });
});
