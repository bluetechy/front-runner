import { createContext, use, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LoginDialog } from "./login-dialog";

/*
 * One sign-in dialog for the whole app, opened from anywhere. Every way in is
 * something the visitor clicked -- the header's "Login", and anything else
 * that comes to want it; without a single owner they would be two dialogs
 * that could both be on screen.
 *
 * This sits inside the router rather than beside it, because the dialog
 * navigates to /signed-in when a sign-in completes.
 */

interface LoginPrompt {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const LoginPromptContext = createContext<LoginPrompt | null>(null);

export function LoginPromptProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ open, close, isOpen }), [open, close, isOpen]);

  return (
    <LoginPromptContext value={value}>
      {children}
      <LoginDialog open={isOpen} onClose={close} />
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
