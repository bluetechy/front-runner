import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Reading the signed-in person's security log, and answering a question about
 * one thing in it.
 *
 * The answer replaces the **whole list** rather than the row it was about, and
 * here that is not a convention but a requirement: saying "no, this was not me"
 * writes a second event recording that the alarm was raised, so the row that
 * was answered is not the only thing that moved.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { useSecurityActivity } = await import("./activity-api");

const event = (overrides: Record<string, unknown> = {}) => ({
  SecurityEventUUID: "2d000000-0000-4000-8000-000000000001",
  EventType: "LoginSucceeded",
  Description: "New login on Mac OS.",
  Device: "Mac OS",
  Location: "Utah, USA",
  OccurredAt: "2026-09-20T21:42:00.000Z",
  ReviewedAt: null,
  Recognized: null,
  ...overrides,
});

const answering = (events: unknown[], errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () =>
      errors ? { errors } : { data: { securityEvents: events } },
  });

/* The hook under a component, because that is the only way to run one. What
 * each test reads is what the hook put on the page and what went down the
 * wire. */
let hook: ReturnType<typeof useSecurityActivity>;

function Probe({ run }: { run?: () => void } = {}) {
  hook = useSecurityActivity();
  useEffect(() => {
    run?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <span data-testid="count">{hook.events.length}</span>
      <span data-testid="loading">{String(hook.loading)}</span>
      <span data-testid="error">{hook.error ?? ""}</span>
    </div>
  );
}

const renderHook = async () => {
  await act(async () => {
    render(<Probe />);
  });
};

/* The query or mutation sent on one call, so a test can say what was asked
 * without pinning how the string is wrapped. */
const bodyOf = (call = 0) =>
  JSON.parse(String(fetchMock.mock.calls[call]?.[1]?.body)) as {
    query: string;
    variables: Record<string, unknown>;
  };

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  getAccessToken.mockReset().mockResolvedValue("a-token");
  status.mockReset().mockReturnValue("signed-in");
  answering([event()]);
});

afterEach(() => vi.unstubAllGlobals());

describe("reading the log", () => {
  it("asks the API for the signed-in account's own events", async () => {
    await renderHook();

    expect(bodyOf().query).toContain("securityEvents");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  /* Neither operation names a user. The login name comes off the token at the
   * API, so there is nothing here that could name somebody else's log. */
  it("names nobody: the token says whose log this is", async () => {
    await renderHook();

    expect(bodyOf().query).not.toContain("loginName");
    expect(bodyOf().variables).toEqual({});
  });

  it("carries the session's token", async () => {
    await renderHook();

    expect(fetchMock.mock.calls[0]?.[1]?.headers.Authorization).toBe(
      "Bearer a-token",
    );
  });

  /* Waiting is not the same as empty: the table would otherwise say nothing
   * has ever happened to the account and correct itself a moment later. */
  it("is loading until the first answer arrives", async () => {
    await renderHook();

    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("asks nothing at all until somebody is logged in", async () => {
    status.mockReturnValue("signed-out");
    await renderHook();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  /* The API answers 200 with an errors array, so the status says nothing and
   * the first message is the one worth showing. */
  it("shows what the API said when it refused", async () => {
    answering([], [{ message: "Action cannot be performed." }]);
    await renderHook();

    expect(screen.getByTestId("error")).toHaveTextContent(
      "Action cannot be performed.",
    );
  });

  it("says so when the API cannot be reached at all", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    await renderHook();

    expect(screen.getByTestId("error")).toHaveTextContent("network down");
  });
});

describe("answering one of them", () => {
  it("sends the event and what was said", async () => {
    await renderHook();
    answering([
      event({ ReviewedAt: "2026-09-21T00:00:00.000Z", Recognized: true }),
    ]);

    await act(async () => {
      await hook.review("2d000000-0000-4000-8000-000000000001", true);
    });

    expect(bodyOf(1).query).toContain("reviewSecurityEvent");
    expect(bodyOf(1).variables).toEqual({
      securityEventId: "2d000000-0000-4000-8000-000000000001",
      recognized: true,
    });
  });

  /* Saying no writes a second event as well, so the list that comes back is
   * longer than the one that went in. Patching the answered row would have
   * lost it. */
  it("replaces the whole list rather than the row it was about", async () => {
    await renderHook();
    fetchMock.mockResolvedValue({
      json: async () => ({
        data: {
          reviewSecurityEvent: [
            event({
              SecurityEventUUID: "2d000000-0000-4000-8000-000000000009",
              EventType: "ActivityReported",
            }),
            event({
              ReviewedAt: "2026-09-21T00:00:00.000Z",
              Recognized: false,
            }),
          ],
        },
      }),
    });

    await act(async () => {
      await hook.review("2d000000-0000-4000-8000-000000000001", false);
    });

    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("hands the refusal back to whoever asked", async () => {
    await renderHook();
    answering([], [{ message: "Action cannot be performed." }]);

    await expect(
      hook.review("2d000000-0000-4000-8000-000000000001", true),
    ).rejects.toThrow("Action cannot be performed.");
  });
});
