import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWidget, isWidgetId, WidgetFetchError } from "./widget-client.js";

const ID = "w_0123456789abcdef0123456789abcdef";

const document = {
  widgetId: ID,
  version: 3,
  definition: {
    schemaVersion: "1.0",
    canvas: { width: 1200 },
    root: { id: "root", type: "container" },
  },
};

function answer(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what counts as a widget id", () => {
  it("accepts one the API minted", () => {
    expect(isWidgetId(ID)).toBe(true);
  });

  it("refuses something that is merely id-shaped", () => {
    expect(isWidgetId("w_nothex")).toBe(false);
    expect(isWidgetId("8H2K91")).toBe(false);
    expect(isWidgetId("")).toBe(false);
  });
});

describe("fetching a widget", () => {
  it("asks the endpoint for that id and answers the document", async () => {
    const fetcher = answer(document);
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchWidget("https://api.test", ID)).resolves.toMatchObject({
      version: 3,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.test/widgets/${ID}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  // The widget is on somebody else's page. A request from it carrying cookies
  // would be this SDK handing our API a session the page never offered.
  it("sends no credentials", async () => {
    const fetcher = answer(document);
    vi.stubGlobal("fetch", fetcher);
    await fetchWidget("https://api.test", ID);
    expect(fetcher.mock.calls[0]![1]).toMatchObject({ credentials: "omit" });
  });

  // Half of them will write the slash.
  it("tolerates a trailing slash on the endpoint", async () => {
    const fetcher = answer(document);
    vi.stubGlobal("fetch", fetcher);
    await fetchWidget("https://api.test/", ID);
    expect(fetcher.mock.calls[0]![0]).toBe(`https://api.test/widgets/${ID}`);
  });

  // A mistyped id is a sentence from this package rather than a request that
  // should never have been made.
  it("refuses an id that is not one before asking anybody", async () => {
    const fetcher = answer(document);
    vi.stubGlobal("fetch", fetcher);
    await expect(fetchWidget("https://api.test", "nonsense")).rejects.toThrow(
      /is not a widget id/,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  /*
   * The three answers a developer integrating this actually meets, each with
   * its own sentence. "Failed to fetch" is the single most common thing to be
   * stuck on here, and the browser will not say why -- so the 403 names the
   * origin allowlist, and so does the network failure, because a CORS refusal
   * arrives as an indistinguishable TypeError.
   */
  it("says the id is not published on a 404", async () => {
    vi.stubGlobal("fetch", answer(null, 404));
    await expect(fetchWidget("https://api.test", ID)).rejects.toThrow(
      /No widget with that id/,
    );
  });

  it("names the origin allowlist on a 403", async () => {
    vi.stubGlobal("fetch", answer(null, 403));
    await expect(fetchWidget("https://api.test", ID)).rejects.toThrow(/origin/);
  });

  it("names it again when the browser refuses without a status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    const failure = await fetchWidget("https://api.test", ID).catch((e) => e);
    expect(failure).toBeInstanceOf(WidgetFetchError);
    expect(failure.status).toBe(0);
    expect(failure.message).toMatch(/origin/);
  });

  // An abort is our own unmount rather than a failure, and is rethrown as
  // itself so that `<Widget>` can tell the two apart without reading a string.
  it("lets an abort through as an abort", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")),
    );
    await expect(fetchWidget("https://api.test", ID)).rejects.toBeInstanceOf(
      DOMException,
    );
  });

  // What a proxy's error page looks like from here: a 200 with something that
  // is not a widget in it.
  it("refuses a 200 that is not a widget document", async () => {
    vi.stubGlobal("fetch", answer({ message: "hello" }));
    await expect(fetchWidget("https://api.test", ID)).rejects.toThrow(
      /not a widget/,
    );
  });
});
