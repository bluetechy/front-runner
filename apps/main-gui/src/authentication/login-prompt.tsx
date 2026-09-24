import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LoginDialog } from "./login-dialog";
import { SignUpDialog } from "./sign-up-dialog";

/*
 * The two cards that let somebody in, and one owner for both.
 *
 * Every way in is something the visitor clicked -- the header's "Login" and
 * its "Sign Up", and anything else that comes to want them; without a single
 * owner they would be dialogs that could both be on screen. That is also what
 * makes the two switchable: "Don't have an Account?" on one and "Already have
 * an Account?" on the other are this provider changing which card is showing,
 * not a card opening another card.
 *
 * This sits inside the router rather than beside it, because both cards
 * navigate to /dashboard when they finish.
 */

/* Which card, or none. One value rather than two booleans, because "both at
 * once" is not a state either of them should be able to reach. */
type Showing = "login" | "sign-up" | null;

interface LoginPrompt {
  /* The login card. */
  open: () => void;
  /* The sign-up card. */
  signUp: () => void;
  close: () => void;
  isOpen: boolean;
}

const LoginPromptContext = createContext<LoginPrompt | null>(null);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [showing, setShowing] = useState<Showing>(null);

  const open = useCallback(() => setShowing("login"), []);
  const signUp = useCallback(() => setShowing("sign-up"), []);
  const close = useCallback(() => setShowing(null), []);

  const value = useMemo(
    () => ({ open, signUp, close, isOpen: showing !== null }),
    [open, signUp, close, showing],
  );

  return (
    <LoginPromptContext value={value}>
      {children}
      <LoginDialog
        open={showing === "login"}
        onClose={close}
        onSignUp={signUp}
      />
      <SignUpDialog
        open={showing === "sign-up"}
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
