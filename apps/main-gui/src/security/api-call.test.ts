import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

/*
 * One GraphQL call with the signed-in person's token on it, shared by the two
 * hooks on this page.
 *
 * It was inside `email-api.tsx` until the activity list wanted the same twenty
 * lines. What is pinned here is the handling neither caller should have to
 * repeat: a missing token, an errors array arriving with a 200, and an answer
 * with nothing in it.
 */

const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ getAccessToken }),
}));

const { useApiCall } = await import("./api-call");

const call = () => renderHook(() => useApiCall("Nothing came back.")).result;

const answering = (data: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data }),
  });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getAccessToken.mockReset().mockResolvedValue("a-token");
});

afterEach(() => vi.unstubAllGlobals());

describe("calling the API", () => {
  /* The single value of the data object, so a caller writes the query and gets
   * the thing it asked for rather than unwrapping it again. */
  it("unwraps the one thing the answer holds", async () => {
    answering({ securityEvents: ["an event"] });

    await expect(call().current("query {}", {})).resolves.toEqual(["an event"]);
  });

  it("puts the session's token on the request", async () => {
    answering({ anything: [] });
    await call().current("query {}", {});

    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBe(
      "Bearer a-token",
    );
  });

  /* An expired session is a sentence somebody can act on rather than a 401
   * they cannot see. */
  it("refuses before asking when there is no token to ask with", async () => {
    getAccessToken.mockResolvedValue(null);

    await expect(call().current("query {}", {})).rejects.toThrow(
      "Your session has expired. Login again.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  /* The API answers 200 with an errors array, so the status says nothing. */
  it("throws what the API said when it refused", async () => {
    answering(null, [{ message: "Action cannot be performed." }]);

    await expect(call().current("query {}", {})).rejects.toThrow(
      "Action cannot be performed.",
    );
  });

  /* Neither data nor an error is a shape rather than a message, so the
   * sentence belongs to whoever asked. */
  it("uses the caller's own words for an answer with nothing in it", async () => {
    answering({ securityEvents: null });

    await expect(call().current("query {}", {})).rejects.toThrow(
      "Nothing came back.",
    );
  });
});
