import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The signed-in person's notifications, a page at a time, and the two ways of
 * marking them read.
 *
 * The session and the network are both stubbed: what is under test is the
 * paging arithmetic, the moment the list is allowed to ask for anything at
 * all, and what a mutation does to the cache afterwards.
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

const {
  FILTERS,
  NO_COUNTS,
  PAGE_SIZE,
  isUnread,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotifications,
} = await import("./notifications-api");
type Row = import("./notifications-api").Notification;

const fetchMock = vi.fn();

function notification(index: number): Row {
  return {
    NotificationUUID: `2b000000-0000-4000-8000-00000000000${index}`,
    OrganizationUUID: "a0000000-0000-4000-8000-000000000001",
    TaskUUID: null,
    ActorUUID: null,
    ActorName: null,
    NotificationType: "Assigned",
    Message: `Something happened ${index}`,
    ReadAt: null,
    CreatedAt: new Date().toISOString(),
  };
}

const page = (rows: number) =>
  Array.from({ length: rows }, (_row, index) => notification(index));

/* One GraphQL answer. The API replies 200 with an `errors` array, so a
 * failure is a body rather than a status. */
const answering = (data: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { result: data } }),
  });

const client = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

function wrapperFor(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  status.mockReturnValue("signed-in");
  getAccessToken.mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what a notification is", () => {
  // `ReadAt` is the whole of the read/unread question: there is no `IsRead`
  // beside it, because one field cannot disagree with itself.
  it("is unread until it has a moment on it", () => {
    expect(isUnread(notification(1))).toBe(true);
    expect(
      isUnread({ ...notification(1), ReadAt: new Date().toISOString() }),
    ).toBe(false);
  });

  it("offers the three filters in the order both strips draw them", () => {
    expect(FILTERS).toEqual(["All", "Read", "Unread"]);
  });

  it("counts nothing until it has been told otherwise", () => {
    expect(NO_COUNTS).toEqual({ All: 0, Unread: 0, Read: 0 });
  });
});

describe("reading the list", () => {
  it("asks for a page, as the signed-in caller", async () => {
    answering(page(PAGE_SIZE));
    const { result } = renderHook(() => useNotifications("Unread"), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request.headers.Authorization).toBe("Bearer a-token");
    expect(JSON.parse(request.body).variables).toEqual({
      filter: "Unread",
      limit: PAGE_SIZE,
      offset: 0,
    });
  });

  // A short page is the end of the list. There is no total to compare
  // against and there does not need to be one: asking for twelve and getting
  // nine means there is no thirteenth.
  it("stops when a page comes back short", async () => {
    answering(page(PAGE_SIZE - 3));
    const { result } = renderHook(() => useNotifications("All"), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.hasNextPage).toBe(false);
  });

  it("asks for the next page from where the last one ended", async () => {
    answering(page(PAGE_SIZE));
    const { result } = renderHook(() => useNotifications("All"), {
      wrapper: wrapperFor(client()),
    });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));

    await result.current.fetchNextPage();

    const [, second] = fetchMock.mock.calls[1] ?? [];
    expect(JSON.parse(second.body).variables.offset).toBe(PAGE_SIZE);
  });

  // The `_app` route sends a signed-out visitor back to the landing page, so
  // this is the moment before the session has settled rather than a state the
  // bell sits in.
  it("asks for nothing until there is a token to ask with", () => {
    status.mockReturnValue("signing-in");

    renderHook(() => useNotifications("All"), {
      wrapper: wrapperFor(client()),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports the first message the API sent back", async () => {
    answering(null, [{ message: "Query exceeds the depth or field limit" }]);
    const { result } = renderHook(() => useNotifications("All"), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe(
      "Query exceeds the depth or field limit",
    );
  });

  it("says so rather than calling when the session has gone", async () => {
    getAccessToken.mockResolvedValue(null);
    const { result } = renderHook(() => useNotifications("All"), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toMatch(/session has expired/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("counting them", () => {
  // Separate from the list, and deliberately not derived from it: the list is
  // a page, and switching the filter must not change the number on the bell.
  it("counts every notification, whatever the list is showing", async () => {
    answering({ All: 40, Unread: 6, Read: 34 });
    const { result } = renderHook(() => useNotificationCounts(), {
      wrapper: wrapperFor(client()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ All: 40, Unread: 6, Read: 34 });
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body).variables).toEqual({});
  });

  it("counts nothing until there is a token to count with", () => {
    status.mockReturnValue("signed-out");

    renderHook(() => useNotificationCounts(), {
      wrapper: wrapperFor(client()),
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("marking them read", () => {
  // Both writes change what the badge says and what the Unread filter holds,
  // so both throw the whole vertical away rather than patching a row into
  // whichever pages happen to be cached.
  it.each([["one of them", true] as const, ["all of them", false] as const])(
    "re-asks for everything after marking %s",
    async (_which, single) => {
      const queryClient = client();
      const invalidate = vi.spyOn(queryClient, "invalidateQueries");
      answering(single ? notification(1) : 4);

      const { result } = renderHook(
        () =>
          single ? useMarkNotificationRead() : useMarkAllNotificationsRead(),
        { wrapper: wrapperFor(queryClient) },
      );
      await result.current.mutateAsync(
        "2b000000-0000-4000-8000-000000000001" as never,
      );

      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["notifications"],
      });
    },
  );

  it("names the notification it is marking", async () => {
    answering(notification(1));
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: wrapperFor(client()),
    });

    await result.current.mutateAsync("2b000000-0000-4000-8000-00000000000a");

    expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body).variables).toEqual({
      notificationId: "2b000000-0000-4000-8000-00000000000a",
    });
  });
});
