import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Connecting a provider to an account that is already logged in.
 *
 * What this file is about is the two trips, and why there are two. The
 * provider only runs its linking flow for a browser it can see its own session
 * cookie for, and it checks that cookie against the session the token in hand
 * names. Our login card produces neither: the password grant mints a token
 * without the browser ever meeting the provider. So Connect takes the ordinary
 * authorization-code trip first and carries on with the token that comes back.
 *
 * The other half is what survives the trips: one alias, in session storage,
 * taken rather than read. A marker left behind would send the next ordinary
 * login somewhere it was not asked to go.
 */

const startRedirect = vi.fn(async (_intent: unknown) => undefined);
const accountLinkUrl = vi.fn(
  async (_alias: string, _token: string, _returnTo: string) =>
    "https://identity.example.test/link" as string | null,
);

vi.mock("./identity-provider", () => ({
  startRedirect: (intent: unknown) => startRedirect(intent),
  accountLinkUrl: (alias: string, token: string, returnTo: string) =>
    accountLinkUrl(alias, token, returnTo),
}));

const {
  beginAccountLink,
  linkReturnUri,
  resumeAccountLink,
  takePendingAccountLink,
} = await import("./account-link");
const { read, write } = await import("../browser-storage");

const KEY = "front-runner.linking-provider";

const tokens = {
  accessToken: "an-access-token",
  refreshToken: "a-refresh-token",
  idToken: null,
  expiresAt: Date.now() + 300_000,
};

const realLocation = window.location;
const assigned = vi.fn();

beforeEach(() => {
  startRedirect.mockClear();
  accountLinkUrl
    .mockClear()
    .mockResolvedValue("https://identity.example.test/link");
  assigned.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...realLocation, origin: realLocation.origin, assign: assigned },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: realLocation,
  });
});

describe("starting it", () => {
  it("remembers which provider the trip is for", async () => {
    await beginAccountLink("google");

    expect(read("session", KEY)).toBe("google");
  });

  // Session storage rather than local, the way the PKCE verifier is kept: it
  // is scoped to the tab making the trip and dies with it.
  it("keeps that in session storage rather than local", async () => {
    await beginAccountLink("google");

    expect(read("local", KEY)).toBeNull();
  });

  it("takes the ordinary trip out, because the token in hand may be no good", async () => {
    await beginAccountLink("google");

    expect(startRedirect).toHaveBeenCalledWith({ kind: "login" });
  });

  /* No hint on this leg, deliberately. A hint would send the browser straight
   * on to Google to login as somebody, which is the login card's feature; this
   * leg is about the account already logged in here. */
  it("sends no provider hint on the way out", async () => {
    await beginAccountLink("google");

    expect(startRedirect).toHaveBeenCalledWith(
      expect.not.objectContaining({ idpHint: expect.anything() }),
    );
  });
});

describe("picking the trip back up", () => {
  it("answers which provider is in the middle of being connected", () => {
    write("session", KEY, "google");

    expect(takePendingAccountLink()).toBe("google");
  });

  // Taken rather than read: a marker left behind would send the next ordinary
  // login off to a provider nobody asked about.
  it("takes it, so the next login is an ordinary one", () => {
    write("session", KEY, "google");

    takePendingAccountLink();

    expect(takePendingAccountLink()).toBeNull();
  });

  it("answers nothing when no trip is in flight", () => {
    expect(takePendingAccountLink()).toBeNull();
  });
});

describe("the second trip", () => {
  it("goes to the provider with the token that just came back", async () => {
    await expect(resumeAccountLink("google", tokens)).resolves.toBe(true);

    expect(accountLinkUrl).toHaveBeenCalledWith(
      "google",
      "an-access-token",
      linkReturnUri("google"),
    );
    expect(assigned).toHaveBeenCalledWith("https://identity.example.test/link");
  });

  // False means the account is logged in and the connection could not be
  // started, which the callback route reads as an ordinary login. Losing the
  // login over a connection that could not start would be the worse outcome.
  it("answers false, and goes nowhere, when there is no URL to go to", async () => {
    accountLinkUrl.mockResolvedValue(null);

    await expect(resumeAccountLink("google", tokens)).resolves.toBe(false);
    expect(assigned).not.toHaveBeenCalled();
  });
});

describe("where the provider drops the browser", () => {
  it("is the security page, carrying the provider it was asked to connect", () => {
    const url = new URL(linkReturnUri("google"));

    expect(url.pathname).toBe("/security-and-access");
    expect(url.searchParams.get("connected")).toBe("google");
  });

  it("quotes the alias, because it is somebody else's slug", () => {
    expect(linkReturnUri("a b")).toContain("connected=a%20b");
  });
});
