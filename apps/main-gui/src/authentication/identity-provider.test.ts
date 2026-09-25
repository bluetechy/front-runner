import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Every identity-provider URL this app uses and every call it makes to one.
 *
 * The provider owns accounts, passwords and sessions; main-api only verifies
 * the access token that comes out of here. Nothing outside that module talks
 * to the provider, which is what makes it worth testing on its own: discovery,
 * the PKCE round trip and the error messages are all only ever decided there.
 *
 * Nothing here spells an endpoint path. The module is told an issuer and reads
 * the rest from the discovery document, so these tests say what it does with
 * what a provider answers rather than what Keycloak's paths happen to be. The
 * issuer is stubbed into the environment before the module is imported,
 * because it is read once when it loads.
 */

vi.stubEnv(
  "VITE_IDP_ISSUER_URL",
  "https://identity.example.test/realms/front-runner",
);
vi.stubEnv("VITE_IDP_CLIENT_ID", "main-gui");
vi.stubEnv("VITE_IDP_HINT_PARAMETER", "kc_idp_hint");
vi.stubEnv("VITE_IDP_LINK_PATH", "/broker/{provider}/link");

const ISSUER = "https://identity.example.test/realms/front-runner";
const DISCOVERY = `${ISSUER}/.well-known/openid-configuration`;
const TOKEN = `${ISSUER}/protocol/openid-connect/token`;
const AUTHORIZE = `${ISSUER}/protocol/openid-connect/auth`;
const LOGOUT = `${ISSUER}/protocol/openid-connect/logout`;

/* What this provider answers at the well-known address. Keycloak's paths,
 * because that is what this installation runs, and the point of the tests
 * below is that they are read from here rather than assumed. */
const published = {
  token_endpoint: TOKEN,
  authorization_endpoint: AUTHORIZE,
  end_session_endpoint: LOGOUT,
};

const {
  accountLinkUrl,
  endSession,
  exchangeAuthorizationCode,
  readIdentity,
  redirectUri,
  refreshTokens,
  signInWithPassword,
  startRedirect,
  takeRedirectVerifier,
} = await import("./identity-provider");
const { read, write } = await import("../browser-storage");

const fetchMock = vi.fn();

const answers = (body: unknown, ok = true) =>
  ({ ok, json: async () => body }) as Response;

/* Every call in this module begins with discovery, so every test answers it
 * and says what it wants for the call after. */
const serving = (responder: () => Response, document: unknown = published) =>
  fetchMock.mockImplementation((url: string) =>
    Promise.resolve(url === DISCOVERY ? answers(document) : responder()),
  );

/* A successful token endpoint answer. */
const issuing = (overrides: Record<string, unknown> = {}) =>
  serving(() =>
    answers({
      access_token: "an-access-token",
      refresh_token: "a-refresh-token",
      id_token: "an-id-token",
      expires_in: 300,
      ...overrides,
    }),
  );

/* A provider naming a failure the way OAuth names one. */
const refusing = (error: string, description?: string) =>
  serving(() => answers({ error, error_description: description }, false));

/* The last call's form body: the token or logout call, never discovery, which
 * carries none. */
const body = () =>
  new URLSearchParams(fetchMock.mock.calls.at(-1)?.[1].body as URLSearchParams);

const calledWith = (url: string) =>
  fetchMock.mock.calls.filter((call: unknown[]) => call[0] === url);

/*
 * A copy of the module with an empty discovery cache. The document is asked
 * for once per tab and remembered, so a test about that has to start from a
 * tab that has not asked yet.
 */
async function freshModule() {
  vi.resetModules();
  return import("./identity-provider");
}

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
  /* The document, and an empty answer to anything else. A test that cares
   * what the second call answers says so with issuing() or refusing(). */
  serving(() => answers({}));
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("finding out where the provider is", () => {
  // One address is configured and the rest are asked for. Every OpenID
  // Connect provider publishes this document, so the paths below are
  // Keycloak's only because that is what answers here.
  it("asks the issuer for its discovery document before anything else", async () => {
    const provider = await freshModule();
    issuing();

    await provider.signInWithPassword("member@example.test", "a");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(DISCOVERY);
  });

  it("asks for it once and remembers it for the tab", async () => {
    const provider = await freshModule();
    issuing();

    await provider.signInWithPassword("member@example.test", "a");
    await provider.refreshTokens("a-refresh-token");

    expect(calledWith(DISCOVERY)).toHaveLength(1);
  });

  // The whole point of reading the document: another provider names other
  // paths, on another host, and nothing here has to know that.
  it("goes wherever the document says, not where we would have guessed", async () => {
    const provider = await freshModule();
    serving(
      () => answers({ access_token: "a", refresh_token: "b", expires_in: 1 }),
      {
        token_endpoint: "https://elsewhere.test/oauth2/token",
        authorization_endpoint: "https://elsewhere.test/oauth2/authorize",
      },
    );

    await provider.signInWithPassword("member@example.test", "a");

    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(
      "https://elsewhere.test/oauth2/token",
    );
  });

  // A provider that was still starting up when the page loaded has to be
  // reachable on the next try, so a failure is not what gets remembered.
  it("does not remember a failure", async () => {
    const provider = await freshModule();
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));

    await expect(
      provider.signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow(/Could not reach the identity provider/);

    issuing();
    await expect(
      provider.signInWithPassword("member@example.test", "a"),
    ).resolves.toMatchObject({ accessToken: "an-access-token" });
  });

  // Both endpoints are required of every provider. A document without them is
  // not one this app can log in against, and saying so beats a request to
  // "undefined".
  it("refuses a document that names no token endpoint", async () => {
    const provider = await freshModule();
    serving(() => answers({}), { authorization_endpoint: AUTHORIZE });

    await expect(
      provider.signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow(/Could not reach the identity provider/);
  });
});

describe("logging in with an email address and a password", () => {
  it("asks the token endpoint the document named for the password grant", async () => {
    issuing();

    await signInWithPassword("member@example.test", "a-password");

    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(TOKEN);
    expect(Object.fromEntries(body())).toMatchObject({
      grant_type: "password",
      username: "member@example.test",
      password: "a-password",
      client_id: "main-gui",
      scope: "openid profile email",
    });
  });

  // Not the lifetime the provider sent: a token restored from storage has to be
  // judged against the clock rather than against the age of the tab.
  it("turns the lifetime into a moment", async () => {
    issuing({ expires_in: 300 });
    const before = Date.now();

    const tokens = await signInWithPassword("member@example.test", "a");

    expect(tokens.expiresAt).toBeGreaterThanOrEqual(before + 300_000);
    expect(tokens.accessToken).toBe("an-access-token");
    expect(tokens.refreshToken).toBe("a-refresh-token");
  });

  it("carries no id token where the provider sent none", async () => {
    issuing({ id_token: undefined });

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).resolves.toMatchObject({ idToken: null });
  });
});

describe("when a login fails", () => {
  // A provider's descriptions are written for developers, so the ones somebody
  // can act on are replaced and the rest collapse into one honest sentence.
  it("says plainly that the password was wrong", async () => {
    refusing("invalid_grant", "Invalid user credentials");

    await expect(
      signInWithPassword("member@example.test", "no"),
    ).rejects.toThrow(
      "That email address and password do not match an account.",
    );
  });

  // "Account disabled" and "Account is not fully set up" both arrive as
  // invalid_grant, with the real reason only in the description.
  it("shows the description where it says more than the code does", async () => {
    refusing("invalid_grant", "Account disabled");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow("Account disabled.");
  });

  it("explains a provider that will not let this client log anybody in", async () => {
    refusing("unauthorized_client");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow(/The password grant is off/);
  });

  it("falls back to one honest sentence for anything else", async () => {
    refusing("something_new");

    await expect(
      signInWithPassword("member@example.test", "a"),
    ).rejects.toThrow("Login failed. Please try again.");
  });

  // No HTTP status at all: the provider is down, or CORS refused the call.
  // That is not a wrong password and must not read like one.
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

  // Without this the next login would skip the password: the browser still
  // holds the provider's own session cookie.
  it("ends the provider's session as well as this one", async () => {
    await endSession({
      accessToken: "a",
      refreshToken: "a-refresh-token",
      idToken: null,
      expiresAt: Date.now(),
    });

    expect(fetchMock.mock.calls.at(-1)?.[0]).toBe(LOGOUT);
    expect(Object.fromEntries(body())).toMatchObject({
      refresh_token: "a-refresh-token",
    });
  });

  // Logging out locally must succeed even when the provider cannot be reached.
  it("logs out anyway when the provider cannot be reached", async () => {
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

  // The endpoint is optional in the specification, and a provider that ends a
  // session some other way names none. Logging out here still has to work.
  it("logs out anyway when the document names no logout endpoint", async () => {
    const provider = await freshModule();
    serving(() => answers({}), {
      token_endpoint: TOKEN,
      authorization_endpoint: AUTHORIZE,
    });

    await expect(
      provider.endSession({
        accessToken: "a",
        refreshToken: "b",
        idToken: null,
        expiresAt: Date.now(),
      }),
    ).resolves.toBeUndefined();
    expect(calledWith(LOGOUT)).toHaveLength(0);
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
 * `startRedirect` hands the browser to the provider, and jsdom cannot navigate.
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

describe("handing the browser to the provider", () => {
  const assign = watchNavigation;

  it("sends it to the authorize endpoint, with a PKCE challenge", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login" });

    const url = new URL(assigned.mock.calls[0]?.[0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZE);
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

  // An alias the provider does not know is ignored, so the hosted login page
  // is what an unconfigured provider falls back to rather than an error.
  it("can send it straight on to a social provider", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login", idpHint: "google" });

    expect(
      new URL(assigned.mock.calls[0]?.[0] as string).searchParams.get(
        "kc_idp_hint",
      ),
    ).toBe("google");
  });

  // kc_idp_hint is Keycloak's spelling and is configuration, not a constant:
  // another provider names the parameter something else, and a deployment
  // that configures none sends the browser to the hosted login page instead.
  it("names the hint parameter the way it is configured", async () => {
    const assigned = assign();
    vi.stubEnv("VITE_IDP_HINT_PARAMETER", "fidp");

    await startRedirect({ kind: "login", idpHint: "google" });

    const url = new URL(assigned.mock.calls[0]?.[0] as string);
    expect(url.searchParams.get("fidp")).toBe("google");
    expect(url.searchParams.get("kc_idp_hint")).toBeNull();
    vi.stubEnv("VITE_IDP_HINT_PARAMETER", "kc_idp_hint");
  });

  it("sends no hint at all where none is configured", async () => {
    const assigned = assign();
    vi.stubEnv("VITE_IDP_HINT_PARAMETER", "");

    await startRedirect({ kind: "login", idpHint: "google" });

    expect([
      ...new URL(assigned.mock.calls[0]?.[0] as string).searchParams.keys(),
    ]).not.toContain("kc_idp_hint");
    vi.stubEnv("VITE_IDP_HINT_PARAMETER", "kc_idp_hint");
  });

  // Making an account is not one of the ways this hands the browser over.
  // The site asks for one on its own card and main-api makes it; a provider's
  // hosted registration page is not a destination this app sends anybody to.
  it("only ever leaves for the authorize endpoint", async () => {
    const assigned = assign();

    await startRedirect({ kind: "login" });

    const url = new URL(assigned.mock.calls[0]?.[0] as string);
    expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZE);
    expect(url.pathname).not.toContain("registrations");
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

describe("coming back from the provider", () => {
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

describe("where the provider sends the browser back to", () => {
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

/*
 * Where to send the browser to connect a provider to the account it is already
 * logged in as.
 *
 * **The one address in this module that is not discovered.** OpenID Connect
 * has nothing to say about account linking, so there is no entry to read and
 * the path is configuration, the way the social hint's parameter name is. The
 * rest of it is the provider's own shape: a nonce, and a hash of that nonce
 * with the session the token was minted for, the client, and the provider.
 *
 * The null answers are what the security page is built around. A token with no
 * session in it is the ordinary state after a login on our own card -- the
 * password grant mints one without the browser ever meeting the provider --
 * and the page answers that by sending the browser the long way round rather
 * than to an endpoint that would refuse it.
 */
describe("connecting a provider to an account", () => {
  const session = "a3c2f1e0-1111-4222-8333-444455556666";
  const linked = () =>
    accountLinkUrl(
      "google",
      token({ sub: "subject-id", session_state: session }),
      "https://app.example.test/security-and-access?connected=google",
    );

  it("goes to the provider's linking endpoint for the alias it was given", async () => {
    const url = new URL((await linked())!);

    expect(`${url.origin}${url.pathname}`).toBe(`${ISSUER}/broker/google/link`);
  });

  it("names this client and where to come back to", async () => {
    const url = new URL((await linked())!);

    expect(url.searchParams.get("client_id")).toBe("main-gui");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.test/security-and-access?connected=google",
    );
  });

  // The provider checks the hash against the session its own cookie says the
  // browser is in, which is what stops one page starting a link that another
  // page finishes. Asserted as a hash rather than as a literal: what matters
  // is that it is derived from all four and is not the nonce itself.
  it("hashes the nonce with the session, the client and the provider", async () => {
    const url = new URL((await linked())!);
    const nonce = url.searchParams.get("nonce")!;
    const hash = url.searchParams.get("hash")!;

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`${nonce}${session}main-guigoogle`),
    );
    const expected = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(hash).toBe(expected);
    expect(hash).not.toBe(nonce);
  });

  it("is a different nonce every time, so a URL cannot be replayed", async () => {
    const first = new URL((await linked())!).searchParams.get("nonce");
    const second = new URL((await linked())!).searchParams.get("nonce");

    expect(first).not.toBe(second);
  });

  /* Keycloak writes session_state and sid to the same value, and sid is the
   * spelling the specification settled on. */
  it("reads the session under either of the two names for it", async () => {
    const url = await accountLinkUrl(
      "google",
      token({ sub: "subject-id", sid: session }),
      "https://app.example.test/security-and-access",
    );

    expect(url).not.toBeNull();
  });

  // The ordinary state after a login on our own card. The page answers it by
  // sending the browser through the redirect flow first rather than to an
  // endpoint that would refuse it.
  it("answers nothing for a token that names no session", async () => {
    await expect(
      accountLinkUrl(
        "google",
        token({ sub: "subject-id", preferred_username: "member" }),
        "https://app.example.test/security-and-access",
      ),
    ).resolves.toBeNull();
  });

  it("answers nothing for anything that is not a token", async () => {
    await expect(
      accountLinkUrl("google", "not-a-token", "https://app.example.test/"),
    ).resolves.toBeNull();
  });

  // A provider with no linking flow at all, which is what an empty path
  // configures. The card then offers nothing to connect rather than sending
  // somebody to an address that does not exist.
  it("answers nothing where no linking endpoint is configured", async () => {
    vi.stubEnv("VITE_IDP_LINK_PATH", "");

    await expect(linked()).resolves.toBeNull();

    vi.stubEnv("VITE_IDP_LINK_PATH", "/broker/{provider}/link");
  });

  it("quotes the alias it puts in the path", async () => {
    const url = await accountLinkUrl(
      "a b",
      token({ sub: "subject-id", session_state: session }),
      "https://app.example.test/security-and-access",
    );

    expect(url).toContain("/broker/a%20b/link");
  });
});
