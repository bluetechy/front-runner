/*
 * Every identity-provider URL this app uses and every call it makes to one.
 * The provider owns accounts, passwords and sessions; main-api only verifies
 * the access token that comes out of here. Nothing outside this file talks to
 * the provider, and nothing in it talks to main-api.
 *
 * It is told one address, the issuer, and asks that address for the rest:
 * OpenID Connect requires every provider to publish its endpoints at
 * /.well-known/openid-configuration, so the paths are the provider's to name
 * rather than ours to hard-code. Changing provider is changing VITE_IDP_ISSUER_URL.
 */

import { read, remove, write } from "../browser-storage";

const issuer = import.meta.env.VITE_IDP_ISSUER_URL.replace(/\/$/, "");
const clientId = import.meta.env.VITE_IDP_CLIENT_ID;

/* Where the provider sends the browser back to after a redirect flow. */
export const redirectUri = `${window.location.origin}/auth/callback`;

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  idToken: string | null;
  /* Epoch milliseconds, not the lifetime the provider sends, so that a token
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

/* A login that failed for a reason worth showing someone. */
export class SignInError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "SignInError";
  }
}

/* No HTTP status at all, or a discovery document that answers nothing: the
 * provider is down, or CORS refused the call. */
const unreachable = () =>
  new SignInError(
    "Could not reach the identity provider. Is it running?",
    "unreachable",
  );

/* ---------------------------------------------------------------- discovery */

interface Endpoints {
  token: string;
  authorize: string;
  /* Optional in the specification, and absent from providers that end a
   * session some other way. Logging out locally has to work without it. */
  logout: string | null;
}

let discovering: Promise<Endpoints> | null = null;

/* Asked for once and remembered for the life of the tab: the document is a
 * constant of the deployment, and a login should not pay for it twice. A
 * failure is not remembered, so a provider that was starting up when the page
 * loaded is reachable on the next try. */
function endpoints(): Promise<Endpoints> {
  discovering ??= discover().catch((error: unknown) => {
    discovering = null;
    throw error;
  });
  return discovering;
}

async function discover(): Promise<Endpoints> {
  let response: Response;
  try {
    response = await fetch(`${issuer}/.well-known/openid-configuration`);
  } catch {
    throw unreachable();
  }
  if (!response.ok) throw unreachable();

  const document = (await response.json().catch(() => null)) as {
    token_endpoint?: unknown;
    authorization_endpoint?: unknown;
    end_session_endpoint?: unknown;
  } | null;

  const token = url(document?.token_endpoint);
  const authorize = url(document?.authorization_endpoint);
  /* Both are required of every provider. A document without them is not one
   * we can log in against, and saying so here is better than a fetch to
   * "undefined" further down. */
  if (!token || !authorize) throw unreachable();

  return { token, authorize, logout: url(document?.end_session_endpoint) };
}

const url = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

/* ------------------------------------------------------------------- tokens */

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
}

/*
 * OAuth names the failure in `error` and explains it in `error_description`.
 * Those descriptions are written for developers, so the ones a person can act
 * on are replaced here and the rest collapse into one honest sentence.
 */
const messages: Record<string, string> = {
  invalid_grant: "That email address and password do not match an account.",
  unauthorized_client:
    "This application is not allowed to log you in directly. The password grant is off for this client.",
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
  const { token } = await endpoints();

  let response: Response;
  try {
    response = await fetch(token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    throw unreachable();
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
        : (messages[code] ?? "Login failed. Please try again."),
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
 * The dialog's email-and-password login: OAuth's password grant. It works only
 * because the client is allowed to use it -- see apps/keycloak-idp/README.md
 * for why that is a deliberate trade.
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
 * PKCE. The client allows the authorization code flow only with S256, so a
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

/* One shape rather than a bare string, because a hint is optional and what
 * this is for is naming the way in. Making an account is not one of them, and
 * neither is resetting a password: the site asks for both on its own cards,
 * and main-api does the work. */
export interface RedirectIntent {
  kind: "login";
  idpHint?: string;
}

/*
 * Hand the browser to the provider: for a social provider, or for the hosted
 * login page. Both are the same authorization code flow and both come back to
 * /auth/callback.
 */
export async function startRedirect(intent: RedirectIntent): Promise<void> {
  const { authorize } = await endpoints();
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
  /* The hint sends the browser straight on to Google, Facebook or Apple
   * instead of showing the provider's own login page first. Keycloak spells
   * the parameter kc_idp_hint and others spell it differently, so which one to
   * send is configuration; an alias the provider does not know is ignored, so
   * an unconfigured provider falls back to the hosted login page rather than
   * an error. Empty configuration means no hint at all, and every button goes
   * to the hosted page. */
  const hintParameter = import.meta.env.VITE_IDP_HINT_PARAMETER;
  if (intent.idpHint && hintParameter)
    parameters.set(hintParameter, intent.idpHint);

  window.location.assign(`${authorize}?${parameters}`);
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
 * End the provider's session as well as this one. Without this the next login
 * would skip the password: the browser still holds the provider's own session
 * cookie, and it would hand back a fresh token without asking anything.
 */
export async function endSession(tokens: TokenSet): Promise<void> {
  try {
    const { logout } = await endpoints();
    if (!logout) return;
    await fetch(logout, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        refresh_token: tokens.refreshToken,
      }),
    });
  } catch {
    /* Logging out locally must succeed even when the provider cannot be
     * reached, and even when we never learned where its logout endpoint is. */
  }
}
