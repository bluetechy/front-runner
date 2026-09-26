import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The one GraphQL call. The session and the network are both stubbed: what is
 * under test is what goes on the request, and what a caller is told when the
 * answer is not a result.
 */

const getAccessToken = vi.fn(async () => "a-token" as string | null);

vi.mock("../authentication", () => ({
  useSession: () => ({ getAccessToken }),
}));

const { useGraphql } = await import("./graphql");

const fetchMock = vi.fn();

const answering = (body: unknown) =>
  fetchMock.mockResolvedValue({ json: async () => body });

const call = () => renderHook(() => useGraphql()).result.current;

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getAccessToken.mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asking the API something", () => {
  it("sends the query and the variables to the configured address", async () => {
    answering({ data: { widgets: [] } });
    await call()("query Widgets { widgets { WidgetId } }", { a: 1 });

    const [address, request] = fetchMock.mock.calls[0]!;
    expect(address).toBe(import.meta.env.VITE_GRAPHQL_URL);
    expect(JSON.parse(String(request.body))).toEqual({
      query: "query Widgets { widgets { WidgetId } }",
      variables: { a: 1 },
    });
  });

  it("puts the signed-in person's token on it", async () => {
    answering({ data: { widgets: [] } });
    await call()("query Widgets { widgets { WidgetId } }");
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe(
      "Bearer a-token",
    );
  });

  /* One field asked for, one answer handed back: every caller in the app asks
   * for exactly one, and unwrapping it here is what keeps `data.widgets` out
   * of every component. */
  it("answers the one field that was asked for, unwrapped", async () => {
    answering({ data: { widgets: [{ WidgetId: "w_1" }] } });
    await expect(call()("query { widgets { WidgetId } }")).resolves.toEqual([
      { WidgetId: "w_1" },
    ]);
  });

  /* The API answers 200 with an errors array, so the status says nothing. */
  it("throws what the API refused with, rather than looking at the status", async () => {
    answering({
      errors: [{ message: "root.children[0].value: must be string" }],
    });
    await expect(call()("mutation { saveWidget }")).rejects.toThrow(
      "root.children[0].value: must be string",
    );
  });

  /* Neither data nor an error is a shape rather than a message, so the sentence
   * belongs to whoever asked. */
  it("says what the caller asked it to say when nothing came back", async () => {
    answering({ data: { widgets: null } });
    await expect(
      call()("query { widgets { WidgetId } }", {}, "No widgets came back."),
    ).rejects.toThrow("No widgets came back.");
  });

  /* Nothing is asked for at all without a token: a request with no
   * Authorization header would be refused by the API anyway, and "your session
   * has expired" is a more useful sentence than "Unauthorized". */
  it("says the session has gone rather than calling without a token", async () => {
    getAccessToken.mockResolvedValue(null);
    await expect(call()("query { widgets { WidgetId } }")).rejects.toThrow(
      /session has expired/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
