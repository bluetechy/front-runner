import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Who is signed in, for the whole app.
 *
 * Access tokens live in memory only; the refresh token is the one thing that
 * outlives the page, and where it is kept is what "Remember me" decides.
 * Keycloak is stubbed here -- what is under test is the bookkeeping around
 * it: where the refresh token goes, when a session is restored, when a token
 * is refreshed early, and what happens when several callers ask at once.
 */

const signInWithPassword = vi.fn();
const refreshTokens = vi.fn();
const endSession = vi.fn();
const reportLogout = vi.fn();

vi.mock("./report-logout", () => ({ reportLogout }));

vi.mock("./identity-provider", () => ({
  signInWithPassword,
  refreshTokens,
  endSession,
  readIdentity: (accessToken: string) =>
    accessToken === "bad-token"
      ? null
      : {
          subject: "subject-id",
          loginName: "member",
          name: "Thomas John",
          email: "member@example.test",
        },
}));

const { SessionProvider, useSession } = await import("./session");
const { read, write } = await import("../browser-storage");

const STORAGE_KEY = "front-runner.refresh-token";

const tokens = (overrides: Record<string, unknown> = {}) => ({
  accessToken: "an-access-token",
  refreshToken: "a-refresh-token",
  idToken: null,
  expiresAt: Date.now() + 300_000,
  ...overrides,
});

/* Somewhere to read the session from, and a handle on it for the tests that
 * have to call into it rather than press something. */
/* A handle on the hook's own answer, for the tests that call into it
 * rather than press something. Held on an object rather than in a variable
 * the component reassigns, which is a thing a component must not do. */
const held: { session?: ReturnType<typeof useSession> } = {};
const session = () => held.session!;

function Signed() {
  const current = useSession();
  /* Kept for the tests that call into it rather than press something. In an
   * effect rather than during the render, because a component that writes to
   * something outside itself while rendering is the bug this test is not
   * about. */
  useEffect(() => {
    held.session = current;
  });
  return (
    <p>
      {current.status}
      {current.identity ? `: ${current.identity.name}` : ""}
    </p>
  );
}

const renderSession = () =>
  render(
    <SessionProvider>
      <Signed />
    </SessionProvider>,
  );

/*
 * The test's own storage, rather than the environment's.
 *
 * jsdom supplies a real one, but Node 25 installs a `localStorage` global of
 * its own that shadows it and -- without `--localstorage-file` -- carries no
 * methods at all. A fake is also a clean slate per test, which the real one
 * would not be. The same reasoning as `language-preference.test.tsx`.
 */
function useFakeStorage() {
  for (const name of ["localStorage", "sessionStorage"]) {
    const entries = new Map<string, string>();
    vi.stubGlobal(name, {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => entries.set(key, value),
      removeItem: (key: string) => entries.delete(key),
      clear: () => entries.clear(),
    });
  }
}

beforeEach(() => {
  useFakeStorage();
  signInWithPassword.mockReset();
  refreshTokens.mockReset();
  endSession.mockReset().mockResolvedValue(undefined);
  reportLogout.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("arriving with nothing remembered", () => {
  it("says signed out without waiting for anything", () => {
    renderSession();

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(refreshTokens).not.toHaveBeenCalled();
  });
});

describe("arriving with a session to restore", () => {
  // A refresh token on disk means there is a session to restore, so the app
  // waits rather than painting a signed-out header it is about to take back.
  it("says it is still deciding rather than saying signed out", () => {
    write("local", STORAGE_KEY, "a-remembered-token");
    refreshTokens.mockReturnValue(new Promise(() => undefined));

    renderSession();

    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("restores it, and says who it is", async () => {
    write("local", STORAGE_KEY, "a-remembered-token");
    refreshTokens.mockResolvedValue(tokens());

    renderSession();

    await waitFor(() =>
      expect(screen.getByText(/signed-in: Thomas John/)).toBeInTheDocument(),
    );
    expect(refreshTokens).toHaveBeenCalledWith("a-remembered-token");
  });

  // Expired, revoked, or Keycloak is down. Either way: signed out, rather
  // than stuck on a spinner.
  it("gives up quietly when the remembered token is no longer good", async () => {
    write("local", STORAGE_KEY, "an-expired-token");
    refreshTokens.mockRejectedValue(new Error("invalid_grant"));

    renderSession();

    await waitFor(() =>
      expect(screen.getByText("signed-out")).toBeInTheDocument(),
    );
    expect(read("local", STORAGE_KEY)).toBeNull();
  });

  it("restores a tab's own session as well as a remembered one", async () => {
    write("session", STORAGE_KEY, "a-tab-token");
    refreshTokens.mockResolvedValue(tokens());

    renderSession();

    await waitFor(() =>
      expect(refreshTokens).toHaveBeenCalledWith("a-tab-token"),
    );
  });
});

describe("signing in", () => {
  it("remembers the session past the browser closing when asked to", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();

    await act(() => session().login("member@example.test", "a-password", true));

    expect(read("local", STORAGE_KEY)).toBe("a-refresh-token");
    expect(read("session", STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/signed-in: Thomas John/)).toBeInTheDocument();
  });

  it("keeps it to this tab when not", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();

    await act(() =>
      session().login("member@example.test", "a-password", false),
    );

    expect(read("session", STORAGE_KEY)).toBe("a-refresh-token");
    expect(read("local", STORAGE_KEY)).toBeNull();
  });

  // Changing "Remember me" must not leave a second copy behind in the store
  // it used to be in -- that copy would outlive the choice to stop keeping it.
  it("never leaves a copy behind in the other store", async () => {
    write("local", STORAGE_KEY, "an-older-token");
    refreshTokens.mockResolvedValue(tokens());
    signInWithPassword.mockResolvedValue(tokens({ refreshToken: "a-new-one" }));
    renderSession();

    await act(() =>
      session().login("member@example.test", "a-password", false),
    );

    expect(read("local", STORAGE_KEY)).toBeNull();
    expect(read("session", STORAGE_KEY)).toBe("a-new-one");
  });

  it("lets the redirect callback hand over tokens it exchanged itself", async () => {
    renderSession();

    act(() => session().adoptTokens(tokens(), true));

    expect(screen.getByText(/signed-in: Thomas John/)).toBeInTheDocument();
    expect(read("local", STORAGE_KEY)).toBe("a-refresh-token");
  });
});

describe("handing out an access token", () => {
  it("answers nothing at all when nobody is signed in", async () => {
    renderSession();

    await expect(session().getAccessToken()).resolves.toBeNull();
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  it("hands back the one it holds while it is still good", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await expect(session().getAccessToken()).resolves.toBe("an-access-token");
    expect(refreshTokens).not.toHaveBeenCalled();
  });

  // Half a minute before it expires, so a call is never made with a token
  // that dies in flight.
  it("refreshes one that is about to expire rather than handing it out", async () => {
    signInWithPassword.mockResolvedValue(
      tokens({ expiresAt: Date.now() + 10_000 }),
    );
    refreshTokens.mockResolvedValue(tokens({ accessToken: "a-fresher-one" }));
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await expect(session().getAccessToken()).resolves.toBe("a-fresher-one");
  });

  // However many callers ask at once -- and on a dashboard several do.
  it("refreshes once for however many callers ask together", async () => {
    signInWithPassword.mockResolvedValue(
      tokens({ expiresAt: Date.now() + 10_000 }),
    );
    refreshTokens.mockResolvedValue(tokens({ accessToken: "a-fresher-one" }));
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    const answers = await Promise.all([
      session().getAccessToken(),
      session().getAccessToken(),
      session().getAccessToken(),
    ]);

    expect(answers).toEqual([
      "a-fresher-one",
      "a-fresher-one",
      "a-fresher-one",
    ]);
    expect(refreshTokens).toHaveBeenCalledTimes(1);
  });

  it("signs out when the refresh is refused", async () => {
    signInWithPassword.mockResolvedValue(
      tokens({ expiresAt: Date.now() + 10_000 }),
    );
    refreshTokens.mockRejectedValue(new Error("invalid_grant"));
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await expect(session().getAccessToken()).resolves.toBeNull();
    await waitFor(() =>
      expect(screen.getByText("signed-out")).toBeInTheDocument(),
    );
    expect(read("local", STORAGE_KEY)).toBeNull();
  });
});

describe("signing out", () => {
  it("forgets the session and ends Keycloak's as well", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await act(() => session().logout());

    expect(screen.getByText("signed-out")).toBeInTheDocument();
    expect(read("local", STORAGE_KEY)).toBeNull();
    expect(endSession).toHaveBeenCalledTimes(1);
  });

  // Without ending Keycloak's session the next sign-in would skip the
  // password: the browser still holds its cookie.
  it("hands Keycloak the tokens it is ending", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await act(() => session().logout());

    expect(endSession).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: "a-refresh-token" }),
    );
  });

  /* The security page would otherwise show a login with nothing under it:
   * logging out is a call the browser makes straight to the provider, so no
   * request reaches our own API at the moment it happens. */
  it("tells our own API the session is over", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await act(() => session().logout());

    expect(reportLogout).toHaveBeenCalledWith("an-access-token");
  });

  /* Which session ended is the session on the token, so the report has to go
   * while the token is still in hand. */
  it("reports it before handing the provider the tokens", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await act(() => session().logout());

    expect(reportLogout.mock.invocationCallOrder[0]).toBeLessThan(
      endSession.mock.invocationCallOrder[0]!,
    );
  });

  /* Bookkeeping must never leave somebody looking logged in, so the session is
   * cleared before either call is made rather than after both have answered.
   * Neither can throw -- report-logout.ts and identity-provider.ts each swallow
   * their own failures, and each has its own tests saying so -- but this is what
   * makes that a belt rather than the only thing holding it up. */
  it("clears the session before telling anybody about it", async () => {
    signInWithPassword.mockResolvedValue(tokens());
    let tokenStillOnDisk: string | null = "not read yet";
    reportLogout.mockImplementation(() => {
      tokenStillOnDisk = read("local", STORAGE_KEY);
      return Promise.resolve();
    });
    renderSession();
    await act(() => session().login("member@example.test", "a", true));

    await act(() => session().logout());

    expect(reportLogout).toHaveBeenCalled();
    expect(tokenStillOnDisk).toBeNull();
    expect(screen.getByText("signed-out")).toBeInTheDocument();
  });

  it("does nothing at all when nobody was signed in", async () => {
    renderSession();

    await act(() => session().logout());

    expect(endSession).not.toHaveBeenCalled();
    expect(reportLogout).not.toHaveBeenCalled();
  });
});

describe("reading the session from outside a provider", () => {
  // The opposite of `useLanguage`, which has a sensible default: there is no
  // correct session to fail over to, and pretending there is one would mean
  // a page quietly rendering as though nobody were signed in.
  it("throws rather than pretending nobody is signed in", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<Signed />)).toThrow(/outside a <SessionProvider>/);
  });
});
