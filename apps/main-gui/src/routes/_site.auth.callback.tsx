import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  exchangeAuthorizationCode,
  passkeyReturnPath,
  resumeAccountLink,
  setupReturnPath,
  takePendingAccountLink,
  takePendingPasskey,
  takePendingSecondFactor,
  takeRedirectVerifier,
  useSession,
  type TokenSet,
} from "../authentication";

/*
 * Where every redirect flow comes back to: the three social providers, the
 * registration form, the password reset, and the first leg of connecting a
 * provider from the security page. The provider puts an authorization code on
 * the URL; this trades it for tokens and gets out of the way.
 *
 * Three flows land here in the middle of something rather than at the end of
 * it. Setting up an authenticator app and registering a passkey each come
 * back with a session and a job half done, so the browser goes on to the
 * security page to have the provider asked what really happened. Connecting a
 * provider goes further still.
 *
 * The link leg is the one that does not end here. A token minted by the login
 * card's password grant is no good to the provider's linking endpoint -- the
 * browser holds no cookie for its session -- so Connect sends the browser
 * through this ordinary trip first and carries on to the provider with the
 * token that comes back. See `account-link.ts` for why that is two trips.
 */
export const Route = createFileRoute("/_site/auth/callback")({
  component: AuthCallback,
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    code?: string;
    state?: string;
    error?: string;
    kc_action_status?: string;
  } => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    /* Not ours and not camel case, which is why it is spelled the way it
     * arrives: Keycloak puts it here to say how a required action ended, and
     * renaming it in the only place it is read would hide where it came
     * from. Only the passkey trip looks at it. */
    kc_action_status:
      typeof search.kc_action_status === "string"
        ? search.kc_action_status
        : undefined,
  }),
});

function AuthCallback() {
  const { code, state, error, kc_action_status } = Route.useSearch();
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
    /* No code on the URL: the social provider was canceled, the identity
     * provider refused, or this is a password reset coming back, which ends
     * there and has
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
        /* Still in the middle of connecting a provider: the browser goes on
         * to it rather than landing anywhere. A trip that cannot be resumed
         * -- no linking endpoint configured, or a token naming no session --
         * is a login like any other, which is the half of it that must not be
         * lost. */
        const linking = takePendingAccountLink();
        if (linking && (await resumeAccountLink(linking, tokens))) return;
        /* Back from the provider's own setup page. The security page is where
         * that goes, rather than the dashboard, because the card that asked
         * for it is the thing to look at -- and the kind on the URL is a hint
         * for it to check with the API, never a fact. A trip somebody
         * abandoned at the QR code comes back exactly like a finished one. */
        const configured = takePendingSecondFactor();
        if (configured) {
          await navigate({ to: setupReturnPath(configured), replace: true });
          return;
        }
        /* And back from the provider's passkey registration page, which is
         * the same trip with a different action on it. There is no kind to
         * carry: an account has a list of passkeys rather than one row per
         * kind. What is carried is how the ceremony ended, which the provider
         * says in `kc_action_status`, and which is the only thing separating
         * somebody who touched the reader from somebody who dismissed the
         * dialog. Whether a passkey really was registered is still the API's
         * answer rather than this URL's -- see `passkeyReturnPath`. */
        if (takePendingPasskey()) {
          await navigate({
            to: passkeyReturnPath(kc_action_status ?? null),
            replace: true,
          });
          return;
        }
        await navigate({ to: "/dashboard", replace: true });
      } catch (reason: unknown) {
        if (!canceled)
          setFailure(
            reason instanceof Error ? reason.message : "Login failed.",
          );
      }
    })();

    return () => {
      canceled = true;
    };
  }, [code, state, error, kc_action_status, adoptTokens, navigate]);

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
        {failure ? "Login failed" : "Logging you in…"}
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
