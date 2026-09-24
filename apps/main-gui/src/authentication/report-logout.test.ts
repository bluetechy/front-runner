import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportLogout } from "./report-logout";

/*
 * Telling main-api that this session is over.
 *
 * The one thing in this vertical that exists to put a row on the security page.
 * What is worth pinning is not the mutation: it is that nothing here can break
 * logging out, because the person has already pressed the button and the session
 * has already been cleared by the time this is reached.
 */

vi.stubEnv("VITE_GRAPHQL_URL", "http://api.test/graphql");

const TOKEN = "an-access-token";

function body(): { query: string; variables: Record<string, unknown> } {
  const call = vi.mocked(fetch).mock.calls[0];
  return JSON.parse(String(call?.[1]?.body)) as {
    query: string;
    variables: Record<string, unknown>;
  };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reporting a logout", () => {
  it("asks the API to record it", async () => {
    await reportLogout(TOKEN);

    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/graphql",
      expect.objectContaining({ method: "POST" }),
    );
    expect(body().query).toContain("recordLogout");
  });

  /* The whole of what identifies the session being ended. There is no argument
   * to name one with, so this token is the only thing that decides which session
   * the row lands on. */
  it("sends the token the session is about to throw away", async () => {
    await reportLogout(TOKEN);

    const headers = vi.mocked(fetch).mock.calls[0]?.[1]?.headers as Record<
      string,
      string
    >;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("names no session, no device and no account of its own", async () => {
    await reportLogout(TOKEN);

    expect(body().variables).toEqual({});
  });

  /* A logout is sent as the page is going away, which is exactly when a browser
   * is free to drop a request it has not finished. */
  it("asks the browser to finish the request even if the page goes", async () => {
    await reportLogout(TOKEN);

    expect(vi.mocked(fetch).mock.calls[0]?.[1]?.keepalive).toBe(true);
  });

  /* **Nothing here may throw.** The person pressed Logout and the session is
   * already cleared; a network that did not carry this must not leave them
   * looking logged in, and the once-a-minute mirror writes the row anyway. */
  it("says nothing and throws nothing when the API cannot be reached", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("the network went away"));

    await expect(reportLogout(TOKEN)).resolves.toBeUndefined();
  });

  it("throws nothing when the API refuses the token", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ errors: [{ message: "no" }] }),
    } as Response);

    await expect(reportLogout(TOKEN)).resolves.toBeUndefined();
  });
});
