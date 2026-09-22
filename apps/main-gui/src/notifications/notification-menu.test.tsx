import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { Notification, NotificationFilter } from "./notifications-api";

/*
 * What the bell says, what it says when there is nothing to say, and what it
 * does as somebody scrolls.
 *
 * The API hooks are stubbed rather than driven: this is a test about the
 * panel -- the count on the badge, the filter, the states the list can be in,
 * the button that greys out, and the sentinel that asks for the next page --
 * and not about fetching.
 *
 * `Link` is stubbed because the footer's target is a route, and standing a
 * whole router up to assert on one word in a footer would be testing TanStack
 * rather than this. Clicks are `fireEvent` rather than `user-event`, which is
 * what the rest of this app's tests use and one fewer dependency.
 */

const list = vi.fn();
const counts = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();
const fetchNextPage = vi.fn();

/* Every observer the panel makes, so a test can say "this came into view". */
const observers: {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
}[] = [];

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}));

vi.mock("./notifications-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./notifications-api")>()),
  useNotifications: (filter: NotificationFilter) => list(filter),
  useNotificationCounts: () => ({ data: counts() }),
  useMarkNotificationRead: () => ({ mutate: markRead }),
  useMarkAllNotificationsRead: () => ({
    mutate: markAllRead,
    isPending: false,
  }),
}));

const { NotificationMenu } = await import("./notification-menu");

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    NotificationUUID: "2b000000-0000-4000-8000-00000000000a",
    OrganizationUUID: "a0000000-0000-4000-8000-000000000001",
    TaskUUID: null,
    ActorUUID: null,
    ActorName: null,
    NotificationType: "OrderReceived",
    Message: "New order received",
    ReadAt: null,
    CreatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const read = () => new Date().toISOString();

/* What `useNotifications` answers with: a settled infinite query holding
 * these pages. */
function answering(
  pages: Notification[][],
  extra: { hasNextPage?: boolean; isFetchingNextPage?: boolean } = {},
) {
  list.mockReturnValue({
    data: { pages, pageParams: pages.map((_page, index) => index) },
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
    ...extra,
  });
}

function show() {
  return render(
    <ThemeProvider theme={theme}>
      <NotificationMenu />
    </ThemeProvider>,
  );
}

async function openTheBell() {
  fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
  /* The popover mounts behind a transition, so the panel is waited for
   * rather than assumed. */
  await screen.findByRole("heading", { name: "Notifications" });
}

describe("the bell in the top bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observers.length = 0;
    counts.mockReturnValue({ All: 0, Unread: 0, Read: 0 });
    answering([[]]);
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: IntersectionObserverCallback,
          options?: IntersectionObserverInit,
        ) {
          observers.push({ callback, options });
        }
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return [];
        }
      },
    );
  });

  it("counts the unread ones on the badge", () => {
    counts.mockReturnValue({ All: 40, Unread: 6, Read: 40 - 6 });
    show();
    expect(
      screen.getByRole("button", { name: "Notifications: 6 unread" }),
    ).toHaveTextContent("6");
  });

  /* The badge is gone rather than showing a nought -- which is the whole of
   * "when there are none, take the badge off the bell". */
  it("wears no badge when nothing is unread", () => {
    show();
    expect(
      screen.getByRole("button", { name: "Notifications" }),
    ).not.toHaveTextContent("0");
  });

  /* The count is the API's, not a count of what is on screen: the list is one
   * page of it, and the Unread filter holds a different set again. */
  it("counts every unread notification, not the ones in the page", () => {
    counts.mockReturnValue({ All: 40, Unread: 40, Read: 40 - 40 });
    answering([[notification(), notification({ NotificationUUID: "2" })]]);
    show();
    expect(
      screen.getByRole("button", { name: "Notifications: 40 unread" }),
    ).toBeVisible();
  });

  it("heads the panel with how many are unread", async () => {
    counts.mockReturnValue({ All: 40, Unread: 2, Read: 40 - 2 });
    show();
    await openTheBell();
    expect(screen.getByText("You have 2 unread notifications.")).toBeVisible();
  });

  it("says so in the singular when one is unread", async () => {
    counts.mockReturnValue({ All: 40, Unread: 1, Read: 40 - 1 });
    show();
    await openTheBell();
    expect(screen.getByText("You have 1 unread notification.")).toBeVisible();
  });

  it("shows a message where the list would be when there are none", async () => {
    show();
    await openTheBell();
    expect(screen.getByText("You have no notifications yet.")).toBeVisible();
  });

  it("greys out the mark-all button when there is nothing to mark", async () => {
    show();
    await openTheBell();
    expect(
      screen.getByRole("button", { name: "Mark all read" }),
    ).toBeDisabled();
  });

  it("offers the mark-all button when something is unread", async () => {
    counts.mockReturnValue({ All: 40, Unread: 3, Read: 40 - 3 });
    show();
    await openTheBell();
    const button = screen.getByRole("button", { name: "Mark all read" });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(markAllRead).toHaveBeenCalled();
  });

  it("marks one read when its row is clicked, and only while it is unread", async () => {
    answering([
      [
        notification({ NotificationUUID: "unread-one" }),
        notification({
          NotificationUUID: "read-one",
          Message: "New review received",
          ReadAt: read(),
        }),
      ],
    ]);
    show();
    await openTheBell();

    fireEvent.click(screen.getByRole("button", { name: /New order/ }));
    expect(markRead).toHaveBeenCalledWith("unread-one");

    fireEvent.click(screen.getByRole("button", { name: /New review/ }));
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  /* The face and the ring are invisible to a screen reader, so the row says
   * all of it in one sentence. */
  it("says who, what, when and whether it is read, in the label", async () => {
    answering([
      [
        notification({
          ActorUUID: "b0000000-0000-4000-8000-000000000003",
          ActorName: "Jane Doe",
          Message: "assigned you Build the API.",
          NotificationType: "Assigned",
        }),
      ],
    ]);
    show();
    await openTheBell();
    expect(
      screen.getByRole("button", {
        name: "Jane Doe assigned you Build the API., now — unread. Mark as read.",
      }),
    ).toBeVisible();
  });

  it("puts the actor's name in front of what they did", async () => {
    answering([
      [
        notification({
          ActorUUID: "b0000000-0000-4000-8000-000000000003",
          ActorName: "Jane Doe",
          Message: "assigned you Build the API.",
        }),
      ],
    ]);
    show();
    await openTheBell();
    const row = screen.getByRole("button", { name: /Jane Doe/ });
    expect(within(row).getByText("Jane Doe")).toBeVisible();
    /* Their initials, which is this product's stand-in for a photograph. */
    expect(within(row).getByText("JD")).toBeVisible();
  });

  describe("the filter", () => {
    it("asks the API for all of them to begin with", async () => {
      show();
      await openTheBell();
      expect(list).toHaveBeenCalledWith("All");
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("asks the API again when another one is chosen", async () => {
      show();
      await openTheBell();
      fireEvent.click(screen.getByRole("button", { name: "Unread" }));
      expect(list).toHaveBeenLastCalledWith("Unread");

      fireEvent.click(screen.getByRole("button", { name: "Read" }));
      expect(list).toHaveBeenLastCalledWith("Read");
    });

    /* "You have no notifications yet" under Unread would be a lie told to
     * somebody who has forty of them. */
    it("says something true when a filter holds nothing", async () => {
      show();
      await openTheBell();

      fireEvent.click(screen.getByRole("button", { name: "Unread" }));
      expect(screen.getByText("Nothing unread.")).toBeVisible();

      fireEvent.click(screen.getByRole("button", { name: "Read" }));
      expect(screen.getByText("Nothing read yet.")).toBeVisible();
    });
  });

  describe("paging as it scrolls", () => {
    it("shows every page it has been given as one list", async () => {
      answering([
        [notification({ NotificationUUID: "1", Message: "First" })],
        [notification({ NotificationUUID: "2", Message: "Second" })],
      ]);
      show();
      await openTheBell();
      expect(screen.getByText("First")).toBeVisible();
      expect(screen.getByText("Second")).toBeVisible();
    });

    /* The request goes out while the person is still reading, which is what
     * makes the scroll look continuous rather than stopping at the end of
     * each page. */
    it("asks for the next page before the end of the list is on screen", async () => {
      answering([[notification()]], { hasNextPage: true });
      show();
      await openTheBell();

      const [watching] = observers;
      expect(watching?.options?.rootMargin).toBe("0px 0px 220px 0px");

      watching?.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      expect(fetchNextPage).toHaveBeenCalled();
    });

    /* No observer while a page is in flight, so a fast scroll cannot ask for
     * the same page twice. */
    it("does not watch while a page is already on its way", async () => {
      answering([[notification()]], {
        hasNextPage: true,
        isFetchingNextPage: true,
      });
      show();
      await openTheBell();
      expect(observers).toHaveLength(0);
      expect(screen.getByText("Loading more…")).toBeVisible();
    });

    it("stops watching once the last page has arrived", async () => {
      answering([[notification()]], { hasNextPage: false });
      show();
      await openTheBell();
      expect(observers).toHaveLength(0);
      expect(screen.queryByText("Loading more…")).toBeNull();
    });
  });
});
