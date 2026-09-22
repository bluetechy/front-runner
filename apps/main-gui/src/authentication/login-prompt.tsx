import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LoginDialog } from "./login-dialog";
import { read, write } from "./storage";

/*
 * One sign-in dialog for the whole app, opened from anywhere. The header's
 * "Sign In" opens it, and so does the landing page on a first visit; without
 * a single owner they would be two dialogs that could both be on screen.
 *
 * This sits inside the router rather than beside it, because the dialog
 * navigates to /signed-in when a sign-in completes.
 */

/* Offering the dialog on arrival is worth doing once. Dismissing it is an
 * answer, and putting it back on every return to the landing page would not
 * be taking that answer. */
const OFFERED_KEY = "front-runner.sign-in-offered";

interface SignInPrompt {
  open: () => void;
  /* Opens only if this tab has not offered the dialog unprompted before. */
  offerOnce: () => void;
  close: () => void;
  isOpen: boolean;
}

const SignInPromptContext = createContext<SignInPrompt | null>(null);

export function SignInPromptProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const offerOnce = useCallback(() => {
    if (read("session", OFFERED_KEY)) return;
    write("session", OFFERED_KEY, "yes");
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ open, offerOnce, close, isOpen }),
    [open, offerOnce, close, isOpen],
  );

  return (
    <SignInPromptContext value={value}>
      {children}
      <LoginDialog open={isOpen} onClose={close} />
    </SignInPromptContext>
  );
}

export function useSignInPrompt(): SignInPrompt {
  const prompt = use(SignInPromptContext);
  if (!prompt)
    throw new Error(
      "useSignInPrompt was called outside a <SignInPromptProvider>",
    );
  return prompt;
}
