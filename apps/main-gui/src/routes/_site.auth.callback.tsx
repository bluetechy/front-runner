import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  exchangeAuthorizationCode,
  takeRedirectVerifier,
  useSession,
  type TokenSet,
} from "../authentication";

/*
 * Where every redirect flow comes back to: the three social providers, the
 * registration form, and the password reset. Keycloak puts an authorization
 * code on the URL; this trades it for tokens and gets out of the way.
 */
export const Route = createFileRoute("/_site/auth/callback")({
  component: AuthCallback,
  validateSearch: (
    search: Record<string, unknown>,
  ): { code?: string; state?: string; error?: string } => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
});

function AuthCallback() {
  const { code, state, error } = Route.useSearch();
  const { adoptTokens } = useSession();
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);

  /*
   * The authorization code and the PKCE verifier are each good for exactly
   * one exchange, so the exchange is started once and kept here rather than
   * being redone whenever this effect runs again. Without that, StrictMode's
   * second pass in development finds the verifier already spent and reports a
   * sign-in that in fact succeeded as unverifiable.
   */
  const attempt = useRef<Promise<TokenSet> | null>(null);

  useEffect(() => {
    /* No code on the URL: the provider was canceled, Keycloak refused, or
     * this is a password reset coming back, which ends at Keycloak and has
     * nothing to exchange. None of those is an error worth a page. */
    if (error || !code) {
      void navigate({ to: "/", replace: true });
      return;
    }

    /* Held in a local as well, so the await below sees a promise rather than
     * the ref's nullable type. */
    const pending = (attempt.current ??= (() => {
      const verifier = takeRedirectVerifier(state ?? null);
      return verifier
        ? exchangeAuthorizationCode(code, verifier)
        : Promise.reject(
            new Error(
              "This sign-in could not be verified. Please start again from the login dialog.",
            ),
          );
    })());

    let canceled = false;
    void (async () => {
      try {
        const tokens = await pending;
        if (canceled) return;
        /* A redirect flow crossed a page load to get here, so it only makes
         * sense as a remembered session. */
        adoptTokens(tokens, true);
        await navigate({ to: "/dashboard", replace: true });
      } catch (reason: unknown) {
        if (!canceled)
          setFailure(
            reason instanceof Error ? reason.message : "Sign-in failed.",
          );
      }
    })();

    return () => {
      canceled = true;
    };
  }, [code, state, error, adoptTokens, navigate]);

  return (
    <Container
      component="section"
      sx={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: "clamp(4rem, 12vw, 9rem)",
      }}
    >
      <Typography variant="h2" sx={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)" }}>
        {failure ? "Sign-in failed" : "Signing you in…"}
      </Typography>
      {failure ? (
        <Typography
          variant="body1"
          sx={{ maxWidth: "48ch", mt: 2, color: "text.secondary" }}
        >
          {failure}
        </Typography>
      ) : null}
    </Container>
  );
}
