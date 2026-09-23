/*
 * Every Keycloak URL this app builds and every call it makes to one. Keycloak
 * owns accounts, passwords and sessions; main-api only verifies the access
 * token that comes out of here. Nothing outside this file talks to Keycloak,
 * and nothing in it talks to main-api.
 */

import { read, remove, write } from "../browser-storage";

const realmUrl = `${import.meta.env.VITE_KEYCLOAK_URL}/realms/${import.meta.env.VITE_KEYCLOAK_REALM}`;
const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID;

const endpoint = {
  token: `${realmUrl}/protocol/openid-connect/token`,
  authorize: `${realmUrl}/protocol/openid-connect/auth`,
  /* Keycloak's registration page is the authorize endpoint under another
   * name: same parameters, same redirect back, so signing up ends signed in. */
  register: `${realmUrl}/protocol/openid-connect/registrations`,
  logout: `${realmUrl}/protocol/openid-connect/logout`,
  resetPassword: `${realmUrl}/login-actions/reset-credentials`,
} as const;

/* Where Keycloak sends the browser back to after a redirect flow. */
export const redirectUri = `${window.location.origin}/auth/callback`;

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  /* Epoch milliseconds, not the lifetime Keycloak sends, so that a token
   * restored from storage is judged against the clock rather than the age of
   * the tab. */
  expiresAt: number;
}

/* The person the access token is about, read from its claims. */
export interface Identity {
  subject: string;
  loginName: string;
  name: string;
  email: string;
}

/* A sign-in that failed for a reason worth showing someone. */
export class SignInError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SignInError";
  }
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
}

/*
 * Keycloak names the failure in `error` and explains it in
 * `error_description`. Those descriptions are written for developers, so the
 * ones a person can act on are replaced here and the rest collapse into one
 * honest sentence.
 */
const messages: Record<string, string> = {
  invalid_grant: "That email and password do not match an account.",
  unauthorized_client:
    "This application is not allowed to sign you in directly. Direct access grants are off for the main-gui client.",
  invalid_client:
    "This application is not registered with the identity provider.",
};

function capitalize(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const sentence = trimmed[0]!.toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

async function exchange(body: URLSearchParams): Promise<TokenSet> {
  body.set("client_id", clientId);

  let response: Response;
  try {
    response = await fetch(endpoint.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    /* No HTTP status at all: Keycloak is down, or CORS refused the call. */
    throw new SignInError(
      "Could not reach the identity provider. Is Keycloak running?",
      "unreachable",
    );
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const failure = payload as {
      error?: string;
      error_description?: string;
    } | null;
    const code = failure?.error ?? "unknown_error";
    /* "Account disabled" and "Account is not fully set up" both arrive as
     * invalid_grant, with the real reason only in the description. */
    const described = failure?.error_description;
    const useDescription =
      described && described !== "Invalid user credentials";
    throw new SignInError(
      useDescription
        ? capitalize(described)
        : (messages[code] ?? "Sign-in failed. Please try again."),
      code,
    );
  }

  const tokens = payload as TokenResponse;
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    idToken: tokens.id_token ?? null,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

/*
 * The dialog's email-and-password sign-in: OAuth's password grant. It works
 * only because the realm turns `directAccessGrantsEnabled` on for main-gui --
 * see apps/keycloak-idp/README.md for why that is a deliberate trade.
 */
export function signInWithPassword(
  username: string,
  password: string,
): Promise<TokenSet> {
  return exchange(
    new URLSearchParams({
      grant_type: "password",
      scope: "openid profile email",
      username,
      password,
    }),
  );
}

export function refreshTokens(refreshToken: string): Promise<TokenSet> {
  return exchange(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<TokenSet> {
  return exchange(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  );
}

/*
 * The identity's claims. The signature was verified by whoever issued the
 * token and is verified again by main-api on every call; this is only the
 * browser reading a name to put on the screen, so it does not check it.
 */
export function readIdentity(accessToken: string): Identity | null {
  const segment = accessToken.split(".")[1];
  if (!segment) return null;
  try {
    const json = atob(segment.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(
      decodeURIComponent(
        json
          .split("")
          .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join(""),
      ),
    ) as Record<string, unknown>;
    const subject = typeof claims.sub === "string" ? claims.sub : null;
    const loginName =
      typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : null;
    if (!subject || !loginName) return null;
    return {
      subject,
      loginName,
      name: typeof claims.name === "string" ? claims.name : loginName,
      email: typeof claims.email === "string" ? claims.email : "",
    };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- redirects */

/*
 * PKCE. The realm allows the authorization code flow only with S256, so a
 * verifier is made here, kept in session storage for the round trip, and sent
 * back when the code is exchanged. Session storage rather than local: it is
 * scoped to this tab and dies with it, and the round trip never leaves it.
 */
const VERIFIER_KEY = "front-runner.pkce-verifier";
const STATE_KEY = "front-runner.pkce-state";

function randomString(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return btoa(String.fromCharCode(...view))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(digest);
}

export type RedirectIntent =
  { kind: "login"; idpHint?: string } | { kind: "register" };

/*
 * Hand the browser to Keycloak: for a social provider, for the registration
 * form, or for the hosted login page. All three are the same authorization
 * code flow and all three come back to /auth/callback.
 */
export async function startRedirect(intent: RedirectIntent): Promise<void> {
  const verifier = randomString();
  const state = randomString();
  write("session", VERIFIER_KEY, verifier);
  write("session", STATE_KEY, state);

  const parameters = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: redirectUri,
    state,
    code_challenge: await challenge(verifier),
    code_challenge_method: "S256",
  });
  /* kc_idp_hint sends the browser straight on to Google, Facebook or Apple
   * instead of showing Keycloak's own login page first. An alias that is not
   * enabled in the realm is ignored, so the hosted login page is what an
   * unconfigured provider falls back to rather than an error. */
  if (intent.kind === "login" && intent.idpHint) {
    parameters.set("kc_idp_hint", intent.idpHint);
  }

  const base =
    intent.kind === "register" ? endpoint.register : endpoint.authorize;
  window.location.assign(`${base}?${parameters}`);
}

/* The verifier for the code now on the URL, consumed so a reload cannot
 * replay it. Returns null when the state does not match what we sent. */
export function takeRedirectVerifier(state: string | null): string | null {
  const expected = read("session", STATE_KEY);
  const verifier = read("session", VERIFIER_KEY);
  remove("session", STATE_KEY);
  remove("session", VERIFIER_KEY);
  if (!expected || !verifier || expected !== state) return null;
  return verifier;
}

/*
 * Keycloak's own "forgot password" page. It emails a reset link, so it needs
 * the realm to have an SMTP server -- Compose runs Mailpit for that, and the
 * message lands in its inbox rather than in the world.
 */
export function passwordResetUrl(): string {
  return `${endpoint.resetPassword}?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
  })}`;
}

/*
 * End the Keycloak session as well as this one. Without this the next sign-in
 * would skip the password: the browser still holds Keycloak's own session
 * cookie, and it would hand back a fresh token without asking anything.
 */
export async function endSession(tokens: TokenSet): Promise<void> {
  await fetch(endpoint.logout, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: tokens.refreshToken,
    }),
  }).catch(() => {
    /* Signing out locally must succeed even when Keycloak cannot be reached. */
  });
}
