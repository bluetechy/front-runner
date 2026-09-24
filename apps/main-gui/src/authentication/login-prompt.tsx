import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ForgotPasswordDialog } from "./forgot-password-dialog";
import { LoginDialog } from "./login-dialog";
import { SignUpDialog } from "./sign-up-dialog";

/*
 * The three cards that deal with getting in, and one owner for all of them.
 *
 * Every way in is something the visitor clicked -- the header's "Login" and
 * its "Sign Up", and anything else that comes to want them; without a single
 * owner they would be dialogs that could all be on screen at once. That is
 * also what makes them switchable: "Don't have an Account?", "Already have an
 * Account?" and "Forgot Password" are this provider changing which card is
 * showing, not a card opening another card.
 *
 * This sits inside the router rather than beside it, because two of the three
 * navigate to /dashboard when they finish.
 */

/* Which card, or none. One value rather than three booleans, because "two at
 * once" is not a state any of them should be able to reach. */
type Showing = "login" | "sign-up" | "forgot-password" | null;

interface LoginPrompt {
  /* The login card. */
  open: () => void;
  /* The sign-up card. */
  signUp: () => void;
  /* The forgot-password card. */
  forgotPassword: () => void;
  close: () => void;
  isOpen: boolean;
}

const LoginPromptContext = createContext<LoginPrompt | null>(null);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [showing, setShowing] = useState<Showing>(null);

  const open = useCallback(() => setShowing("login"), []);
  const signUp = useCallback(() => setShowing("sign-up"), []);
  const forgotPassword = useCallback(() => setShowing("forgot-password"), []);
  const close = useCallback(() => setShowing(null), []);

  const value = useMemo(
    () => ({ open, signUp, forgotPassword, close, isOpen: showing !== null }),
    [open, signUp, forgotPassword, close, showing],
  );

  return (
    <LoginPromptContext value={value}>
      {children}
      <LoginDialog
        open={showing === "login"}
        onClose={close}
        onSignUp={signUp}
        onForgotPassword={forgotPassword}
      />
      <SignUpDialog
        open={showing === "sign-up"}
        onClose={close}
        onLogin={open}
      />
      <ForgotPasswordDialog
        open={showing === "forgot-password"}
        onClose={close}
        onLogin={open}
      />
    </LoginPromptContext>
  );
}

export function useLoginPrompt(): LoginPrompt {
  const prompt = use(LoginPromptContext);
  if (!prompt)
    throw new Error(
      "useLoginPrompt was called outside a <LoginPromptProvider>",
    );
  return prompt;
}
