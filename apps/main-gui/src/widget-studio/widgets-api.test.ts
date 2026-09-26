import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The widgets on this account, and the one way to save one.
 *
 * The session and the network are stubbed: what is under test is what goes to
 * the API, what a save does to the list afterwards, and how a refused document
 * reaches the page.
 *
 * Retries are off in the client below. They are on in the application, and a
 * test that waited for three backed-off attempts before seeing an error would
 * be testing the wait.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { problemsIn, useSaveWidget, useWidgets } = await import("./widgets-api");

const fetchMock = vi.fn();

const ID = "w_0123456789abcdef0123456789abcdef";

const client = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const wrapperFor = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };

const answering = (body: unknown) =>
  fetchMock.mockResolvedValue({ json: async () => body });

const bodyOf = (call = 0) =>
  JSON.parse(String(fetchMock.mock.calls[call]![1].body));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  status.mockReturnValue("signed-in");
  getAccessToken.mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the widgets on this account", () => {
  it("asks for the list, without the definitions", async () => {
    answering({ data: { widgets: [] } });
    const { result } = renderHook(() => useWidgets(), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(bodyOf().query).toContain("widgets");
    /* A table of names does not need several hundred kilobytes of JSON in it,
     * and the API does not offer it here anyway. */
    expect(bodyOf().query).not.toContain("Definition");
  });

  it("answers the list the API gave it", async () => {
    answering({
      data: {
        widgets: [
          {
            WidgetId: ID,
            Name: "Banner",
            Version: 2,
            CreatedAt: "2026-01-01T00:00:00.000Z",
            UpdatedAt: "2026-02-01T00:00:00.000Z",
          },
        ],
      },
    });
    const { result } = renderHook(() => useWidgets(), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0]?.Version).toBe(2);
  });

  /* Nothing to ask for until there is a token to ask with. "loading" is the
   * moment before the session has settled, not a state the page sits in: the
   * `_app` route sends a signed-out visitor back to the landing page. */
  it("asks for nothing until somebody is signed in", () => {
    status.mockReturnValue("loading");
    renderHook(() => useWidgets(), { wrapper: wrapperFor(client()) });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("saving a definition", () => {
  it("sends the name and the text, and no id, for a new widget", async () => {
    answering({
      data: { saveWidget: { WidgetId: ID, Name: "B", Version: 1 } },
    });
    const { result } = renderHook(() => useSaveWidget(), {
      wrapper: wrapperFor(client()),
    });

    await result.current.mutateAsync({ name: "B", definition: "{}" });
    expect(bodyOf().variables).toEqual({
      name: "B",
      definition: "{}",
      widgetId: null,
    });
  });

  /* The text somebody pasted, not a parsed object: the API's validator is the
   * one authority for what a valid widget is, and a JSON syntax error is a
   * better sentence from it than from `JSON.parse` in this bundle. */
  it("sends the definition exactly as it was typed", async () => {
    answering({
      data: { saveWidget: { WidgetId: ID, Name: "B", Version: 1 } },
    });
    const { result } = renderHook(() => useSaveWidget(), {
      wrapper: wrapperFor(client()),
    });

    const typed = '{\n  "schemaVersion": "1.0"  \n}';
    await result.current.mutateAsync({ name: "B", definition: typed });
    expect(bodyOf().variables.definition).toBe(typed);
  });

  it("names the widget when saving over one", async () => {
    answering({
      data: { saveWidget: { WidgetId: ID, Name: "B", Version: 4 } },
    });
    const { result } = renderHook(() => useSaveWidget(), {
      wrapper: wrapperFor(client()),
    });

    await result.current.mutateAsync({
      name: "B",
      definition: "{}",
      widgetId: ID,
    });
    expect(bodyOf().variables.widgetId).toBe(ID);
  });

  /* A save either adds a row or moves one to the top, so the list is refetched
   * rather than patched: refetching a handful of names costs less than a cache
   * that is subtly wrong. */
  it("refreshes the list afterwards", async () => {
    answering({
      data: { saveWidget: { WidgetId: ID, Name: "B", Version: 1 } },
    });
    const queryClient = client();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useSaveWidget(), {
      wrapper: wrapperFor(queryClient),
    });

    await result.current.mutateAsync({ name: "B", definition: "{}" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["widgets"] });
  });

  it("passes the API's refusal through as it is", async () => {
    answering({
      errors: [{ message: "root.children[0].value: must be string" }],
    });
    const { result } = renderHook(() => useSaveWidget(), {
      wrapper: wrapperFor(client()),
    });

    await expect(
      result.current.mutateAsync({ name: "B", definition: "{}" }),
    ).rejects.toThrow("root.children[0].value: must be string");
  });
});

describe("reading a refusal", () => {
  /* The API reports every failing field in one message joined with "; ", the
   * way ZodPipe reports the profile form. The separator is part of the
   * contract: see apps/main-api/docs/widgets.md. */
  it("splits the API's joined message into one problem per line", () => {
    expect(
      problemsIn(
        "root.children[0].value: must be string; canvas.width: is required",
      ),
    ).toEqual([
      "root.children[0].value: must be string",
      "canvas.width: is required",
    ]);
  });

  it("reads a single problem as a list of one", () => {
    expect(problemsIn("the document: is not valid JSON")).toEqual([
      "the document: is not valid JSON",
    ]);
  });

  it("drops the empty pieces a trailing separator leaves", () => {
    expect(problemsIn("one; ; two;")).toEqual(["one", "two"]);
  });
});
