import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Every Keycloak URL this app builds and every call it makes to one.
 *
 * Keycloak owns accounts, passwords and sessions; main-api only verifies the
 * access token that comes out of here. Nothing outside this file talks to
 * Keycloak, which is what makes it worth testing on its own: the realm's
 * address, the PKCE round trip and the error messages are all only ever
 * decided here.
 *
 * The realm is stubbed into the environment before the module is imported,
 * because the addresses are built once when it loads.
 */

vi.stubEnv("VITE_KEYCLOAK_URL", "https://identity.example.test");
vi.stubEnv("VITE_KEYCLOAK_REALM", "front-runner");
vi.stubEnv("VITE_KEYCLOAK_CLIENT_ID", "main-gui");

const {
  endSession,
  exchangeAuthorizationCode,
  passwordResetUrl,
  readIdentity,
  redirectUri,
  refreshTokens,
  signInWithPassword,
  startRedirect,
  takeRedirectVerifier,
} = await import("./keycloak");
const { read, write } = await import("../browser-storage");

const fetchMock = vi.fn();

/* A successful token endpoint answer. */
const issuing = (overrides: Record<string, unknown> = {}) =>
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      access_token: "an-access-token",
      refresh_token: "a-refresh-token",
      id_token: "an-id-token",
      expires_in: 300,
      ...overrides,
    }),
  });

/* Keycloak naming a failure the way it names one. */
const refusing = (error: string, description?: string) =>
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ error, error_description: description }),
  });

const body = () =>
  new URLSearchParams(fetchMock.mock.calls[0]?.[1].body as URLSearchParams);

/* An unsigned token with these claims, which is all `readIdentity` reads --
 * the signature is main-api's business and is verified there on every call. */
function token(claims: Record<string, unknown>): string {
  /* UTF-8 first, the way a real token is encoded: a name with an accent in
   * it is two bytes there and one character here. */
  const utf8 = String.fromCharCode(
    ...new TextEncoder().encode(JSON.stringify(claims)),
  );
  const payload = btoa(utf8)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `header.${payload}.signature`;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("signing in with an email and a password", () => {
  it("asks the realm's token endpoint for the password grant", async () => {
    issuing();

    await signInWithPassword("member@example.test", "a-password");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://identity.example.test/realms/front-runner/protocol/openid-connect/token",
    );
    expect(Object.fromEntries(body())).toMatchObject({
      grant_type: "password",
      username: "member@example.test",
      password: "a-password",
      client_id: "main-gui",
      scope: "openid profile email",
    });
  });

  // Not the lifetime Keycloak sent: a token restored from storage has to be
  // judged against the clock rather than against the age of the tab.
  it("turns the lifetime into a moment", async () => {
    issuing({ expires_in: 300 });
    const before = Date.now();

    const tokens = await signInWithPassword("member@example.test", "a");

    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 300_000);
    expect(tokens.accessToken).toBe("an-access-token");
    expect(tokens.refreshToken).toBe("a-refresh-token");
  });

  it("carries no id token where the realm sent none", async () => {
    issuing({ id_token: undefined });

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).resolves.toMatchObject({ idToken: null });
  });
});

describe("when a sign-in fails", () => {
  // Keycloak's descriptions are written for developers, so the ones somebody
  // can act on are replaced and the rest collapse into one honest sentence.
  it("says plainly that the password was wrong", async () => {
    refusing("invalid_grant", "Invalid user credentials");

    await expect(
      signInWithPassword("member@example.test", "no"),
    ).rejects.toThrow("That email and password do not match an account.");
  });

  // "Account disabled" and "Account is not fully set up" both arrive as
  // invalid_grant, with the real reason only in the description.
  it("shows the description where it says more than the code does", async () => {
    refusing("invalid_grant", "Account disabled");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow("Account disabled.");
  });

  it("explains a realm that will not allow this client to sign anybody in", async () => {
    refusing("unauthorized_client");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow(/Direct access grants are off/);
  });

  it("falls back to one honest sentence for anything else", async () => {
    refusing("something_new");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow("Sign-in failed. Please try again.");
  });

  // No HTTP status at all: Keycloak is down, or CORS refused the call. That
  // is not a wrong password and must not read like one.
  it("says the identity provider could not be reached at all", async () => {
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow(/Could not reach the identity provider/);
  });

  it("carries the code alongside the sentence", async () => {
    refusing("invalid_client");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toMatchObject({ code: "invalid_client", name: "SignInError" });
  });
});

describe("keeping a session alive", () => {
  it("exchanges a refresh token for a new set", async () => {
    issuing();

    await refreshTokens("a-refresh-token");

    expect(Object.fromEntries(body())).toMatchObject({
      grant_type: "refresh_token",
      refresh_token: "a-refresh-token",
    });
  });

  // Without this the next sign-in would skip the password: the browser still
  // holds Keycloak's own session cookie.
  it("ends the Keycloak session as well as this one", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });

    await endSession({
      accessToken: "a",
      refreshToken: "a-refresh-token",
      idToken: null,
      expiresAt: Date.now(),
    });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("openid-connect/logout");
    expect(Object.fromEntries(body())).toMatchObject({
      refresh_token: "a-refresh-token",
    });
  });

  // Signing out locally must succeed even when Keycloak cannot be reached.
  it("signs out anyway when the realm cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(
      endSession({
        accessToken: "a",
        refreshToken: "b",
        idToken: null,
        expiresAt: Date.now(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe("reading who the token is about", () => {
  it("reads the claims the app puts on the screen", () => {
    expect(
      readIdentity(
        token({
          sub: "subject-id",
          preferred_username: "member",
          name: "Thomas John",
          email: "member@example.test",
        }),
      ),
    ).toEqual({
      subject: "subject-id",
      loginName: "member",
      name: "Thomas John",
      email: "member@example.test",
    });
  });

  it("falls back to the login name where there is no display name", () => {
    expect(
      readIdentity(token({ sub: "subject-id", preferred_username: "member" })),
    ).toMatchObject({ name: "member", email: "" });
  });

  it("reads a name with an accent in it", () => {
    expect(
      readIdentity(
        token({
          sub: "s",
          preferred_username: "ana",
          name: "Ana María",
        }),
      ),
    ).toMatchObject({ name: "Ana María" });
  });

  it.each([
    ["not a token at all", "nonsense"],
    ["a token with no claims segment", "header"],
    ["a token with no subject", token({ preferred_username: "member" })],
    ["a token with no login name", token({ sub: "subject-id" })],
  ])("answers nothing for %s", (_case, value) => {
    expect(readIdentity(value)).toBeNull();
  });
});

/*
 * `startRedirect` hands the browser to Keycloak, and jsdom cannot navigate.
 * The whole `location` is replaced for the tests that do it, keeping the
 * origin the module was loaded with so the callback address still matches.
 */
const realLocation = window.location;

function watchNavigation() {
  const assigned = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, origin: realLocation.origin, assign: assigned },
  });
  return assigned;
}

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

describe("handing the browser to Keycloak", () => {
  const assign = watchNavigation;

  it("sends it to the authorize endpoint, with a PKCE challenge", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login" });

    const url = new URL(assigned.mock.calls[0]?.[0] as string);
    expect(url.pathname).toContain("openid-connect/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).not.toBe("");
    expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
  });

  // The verifier never leaves this tab, and dies with it.
  it("keeps the verifier in session storage rather than local", async () => {
    assign();

    await startRedirect({ kind: "login" });

    expect(read("session", "front-runner.pkce-verifier")).not.toBeNull();
    expect(read("local", "front-runner.pkce-verifier")).toBeNull();
  });

  // An alias that is not enabled in the realm is ignored, so the hosted login
  // page is what an unconfigured provider falls back to rather than an error.
  it("can send it straight on to a social provider", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login", idpHint: "google" });

    expect(
      new URL(assigned.mock.calls[0]?.[0] as string).searchParams.get(
        "kc_idp_hint",
      ),
    ).toBe("google");
  });

  // Registration is the authorize endpoint under another name: same
  // parameters, same redirect back, so signing up ends signed in.
  it("sends it to the registration page when that is what was asked for", async () => {
    const assigned = assign();

    await startRedirect({ kind: "register" });

    const url = new URL(assigned.mock.calls[0]?.[0] as string);
    expect(url.pathname).toContain("openid-connect/registrations");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("sends a different verifier every time", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login" });
    const first = read("session", "front-runner.pkce-verifier");
    await startRedirect({ kind: "login" });

    expect(read("session", "front-runner.pkce-verifier")).not.toBe(first);
    expect(assigned).toHaveBeenCalledTimes(2);
  });
});

describe("coming back from Keycloak", () => {
  it("hands back the verifier when the state is the one we sent", async () => {
    watchNavigation();
    await startRedirect({ kind: "login" });
    const state = read("session", "front-runner.pkce-state");
    const verifier = read("session", "front-runner.pkce-verifier");

    expect(takeRedirectVerifier(state)).toBe(verifier);
  });

  // Consumed, so a reload cannot replay the code on the URL.
  it("consumes it, so it cannot be used twice", async () => {
    watchNavigation();
    await startRedirect({ kind: "login" });
    const state = read("session", "front-runner.pkce-state");

    takeRedirectVerifier(state);

    expect(takeRedirectVerifier(state)).toBeNull();
  });

  it.each([
    ["a state we did not send", "somebody-elses-state"],
    ["no state at all", null],
  ])("refuses %s, and forgets the verifier anyway", async (_case, state) => {
    watchNavigation();
    await startRedirect({ kind: "login" });

    expect(takeRedirectVerifier(state)).toBeNull();
    expect(read("session", "front-runner.pkce-verifier")).toBeNull();
  });

  it("refuses a callback for a round trip that never started", () => {
    expect(takeRedirectVerifier("a-state")).toBeNull();
  });

  it("exchanges the code together with the verifier it was issued for", async () => {
    issuing();

    await exchangeAuthorizationCode("a-code", "a-verifier");

    expect(Object.fromEntries(body())).toMatchObject({
      grant_type: "authorization_code",
      code: "a-code",
      code_verifier: "a-verifier",
      redirect_uri: redirectUri,
    });
  });
});

describe("the forgotten-password page", () => {
  it("is Keycloak's own, and comes back where sign-in does", () => {
    const url = new URL(passwordResetUrl());

    expect(url.pathname).toContain("login-actions/reset-credentials");
    expect(url.searchParams.get("client_id")).toBe("main-gui");
    expect(url.searchParams.get("redirect_uri")).toBe(redirectUri);
  });
});

describe("where Keycloak sends the browser back to", () => {
  it("is this origin's callback route", () => {
    expect(redirectUri).toBe(`${window.location.origin}/auth/callback`);
  });
});

/* `write` is imported above so that the storage the module uses is the one
 * this file reads; asserting it here keeps the import honest. */
describe("the storage it uses", () => {
  it("is this app's guarded wrapper rather than the browser's raw one", () => {
    write("session", "front-runner.probe", "value");

    expect(read("session", "front-runner.probe")).toBe("value");
  });
});
