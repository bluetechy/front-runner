import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type {
  Notification,
  NotificationCounts,
  NotificationFilter,
} from "./notifications-api";

/*
 * The page behind "View all": the same list as the panel, read the way a page
 * is read.
 *
 * What is worth pinning here is what the page does *differently* -- the chip,
 * the counted tabs, and the row not being a button -- rather than what it
 * shares with the panel, which `notification-menu.test.tsx` already holds.
 */

const list = vi.fn();
const counts = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();
const fetchNextPage = vi.fn();

/* Every observer the page makes, so a test can say "this came into view". */
const observers: {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
}[] = [];

vi.mock("./notifications-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./notifications-api")>()),
  useNotifications: (filter: NotificationFilter) => list(filter),
  useNotificationCounts: () => ({ data: counts() }),
  useMarkNotificationRead: () => ({ mutate: markRead, isPending: false }),
  useMarkAllNotificationsRead: () => ({
    mutate: markAllRead,
    isPending: false,
  }),
}));

const { NotificationsPage } = await import("./notifications-page");

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

function answering(
  pages: Notification[][],
  extra: {
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    counts?: NotificationCounts;
  } = {},
) {
  const { counts: howMany, ...query } = extra;
  counts.mockReturnValue(howMany ?? { All: 1, Unread: 1, Read: 0 });
  list.mockReturnValue({
    data: { pages, pageParams: pages.map((_page, index) => index) },
    isPending: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
    ...query,
  });
}

const show = () =>
  render(
    <ThemeProvider theme={theme}>
      <NotificationsPage />
    </ThemeProvider>,
  );

describe("the notifications page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observers.length = 0;
    answering([[notification()]]);
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

  it("heads the page with how many are unread", () => {
    answering([[notification()]], { counts: { All: 33, Unread: 6, Read: 27 } });
    show();
    expect(
      screen.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();
    expect(screen.getByText("You have 6 unread notifications.")).toBeVisible();
  });

  /* The numbers are the API's count of everything, not of the page on
   * screen, which is why the page and the bell read the same query. */
  it("puts a count beside every filter", () => {
    answering([[notification()]], { counts: { All: 33, Unread: 6, Read: 27 } });
    show();
    expect(screen.getByRole("button", { name: "All, 33" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Unread, 6" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Read, 27" })).toBeVisible();
  });

  it("asks the API again when another filter is chosen", () => {
    show();
    expect(list).toHaveBeenCalledWith("All");

    fireEvent.click(screen.getByRole("button", { name: /^Unread/ }));
    expect(list).toHaveBeenLastCalledWith("Unread");
  });

  /* The chip is what the page has room for and the panel does not: what kind
   * of thing this is, before reading the sentence. */
  it("says what kind of notification each one is", () => {
    answering([
      [
        notification({ NotificationType: "OrderReceived" }),
        notification({
          NotificationUUID: "2",
          NotificationType: "BadgeEarned",
          Message: "You earned a badge.",
        }),
      ],
    ]);
    show();
    expect(screen.getByText("Order")).toBeVisible();
    expect(screen.getByText("Badge")).toBeVisible();
  });

  /* A type this bundle has not met still gets a chip, spaced out rather than
   * left in camel case or left empty. */
  it("makes a chip for a kind it has never seen", () => {
    answering([[notification({ NotificationType: "PointsExpiring" })]]);
    show();
    expect(screen.getByText("Points expiring")).toBeVisible();
  });

  it("puts the actor's name in front of what they did", () => {
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
    const row = screen.getByRole("listitem");
    expect(within(row).getByText("Jane Doe")).toBeVisible();
    /* Their initials, which is this product's stand-in for a photograph. */
    expect(within(row).getByText("JD")).toBeVisible();
  });

  /*
   * The row is content here, not a control. A stray click on a page somebody
   * is reading should not quietly change something, which is the opposite of
   * the panel, where marking read is the only thing the row is for.
   */
  it("marks one read from a button rather than from the row", () => {
    answering([[notification({ NotificationUUID: "unread-one" })]]);
    show();

    const row = screen.getByRole("listitem");
    fireEvent.click(row);
    expect(markRead).not.toHaveBeenCalled();

    fireEvent.click(within(row).getByRole("button", { name: /Mark as read/ }));
    expect(markRead).toHaveBeenCalledWith("unread-one");
  });

  it("offers nothing to press on a notification already read", () => {
    answering([[notification({ ReadAt: new Date().toISOString() })]], {
      counts: { All: 1, Unread: 0, Read: 1 },
    });
    show();
    expect(
      within(screen.getByRole("listitem")).queryByRole("button"),
    ).toBeNull();
  });

  it("grays out mark-all when there is nothing to mark", () => {
    answering([[notification({ ReadAt: new Date().toISOString() })]], {
      counts: { All: 1, Unread: 0, Read: 1 },
    });
    show();
    expect(
      screen.getByRole("button", { name: "Mark all read" }),
    ).toBeDisabled();
  });

  it("marks everything read when mark-all is pressed", () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(markAllRead).toHaveBeenCalled();
  });

  it("says something true when a filter holds nothing", () => {
    answering([[]]);
    show();
    expect(screen.getByText("You have no notifications yet.")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /^Unread/ }));
    expect(screen.getByText("Nothing unread.")).toBeVisible();
  });

  /* The same sentinel the panel uses, so the page loads ahead of the scroll
   * the same way. */
  it("asks for the next page before the end of the list is on screen", () => {
    answering([[notification()]], { hasNextPage: true });
    show();

    const [watching] = observers;
    expect(watching?.options?.rootMargin).toBe("0px 0px 220px 0px");

    watching?.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("shows every page it has been given as one list", () => {
    answering([
      [notification({ NotificationUUID: "1", Message: "First" })],
      [notification({ NotificationUUID: "2", Message: "Second" })],
    ]);
    show();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
