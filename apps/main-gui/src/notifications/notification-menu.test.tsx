import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { Notification } from "./notifications-api";

/*
 * What the bell says, and what it says when there is nothing to say.
 *
 * The API hooks are stubbed rather than driven: this is a test about the
 * panel -- the count on the badge, the three states the list can be in, and
 * the button that greys out -- and not about fetching. The helpers beside the
 * hooks are the real ones, because `unreadCount` is the thing under test as
 * much as the markup is.
 *
 * `Link` is stubbed because the footer's target is a route, and standing a
 * whole router up to assert on one word in a footer would be testing TanStack
 * rather than this. Clicks are `fireEvent` rather than `user-event`, which is
 * what the rest of this app's tests use and one fewer dependency.
 */

const list = vi.fn();
const markRead = vi.fn();
const markAllRead = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...rest}>{children}</a>
  ),
}));

vi.mock("./notifications-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./notifications-api")>()),
  useNotifications: () => list(),
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
    NotificationType: "OrderReceived",
    Message: "New order received",
    ReadAt: null,
    CreatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/* What `useNotifications` answers with: a settled query holding these rows. */
function answering(notifications: Notification[]) {
  list.mockReturnValue({
    data: notifications,
    isPending: false,
    isError: false,
    error: null,
  });
}

async function openTheBell(notifications: Notification[]) {
  answering(notifications);
  render(
    <ThemeProvider theme={theme}>
      <NotificationMenu />
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Notifications/ }));
  /* The popover mounts behind a transition, so the panel is waited for
   * rather than assumed. */
  await screen.findByRole("heading", { name: "Notifications" });
}

describe("the bell in the top bar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("counts the unread ones on the badge and leaves the read ones out", () => {
    answering([
      notification({ NotificationUUID: "1" }),
      notification({ NotificationUUID: "2" }),
      notification({ NotificationUUID: "3", ReadAt: new Date().toISOString() }),
    ]);
    render(
      <ThemeProvider theme={theme}>
        <NotificationMenu />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Notifications: 2 unread" }),
    ).toHaveTextContent("2");
  });

  /* The badge is gone rather than showing a nought -- which is the whole of
   * "when there are none, take the badge off the bell". */
  it("wears no badge when nothing is unread", () => {
    answering([notification({ ReadAt: new Date().toISOString() })]);
    render(
      <ThemeProvider theme={theme}>
        <NotificationMenu />
      </ThemeProvider>,
    );

    const bell = screen.getByRole("button", { name: "Notifications" });
    expect(bell).not.toHaveTextContent("0");
  });

  it("heads the panel with how many are unread", async () => {
    await openTheBell([
      notification(),
      notification({ NotificationUUID: "2" }),
    ]);
    expect(screen.getByText("You have 2 unread notifications.")).toBeVisible();
  });

  it("says so in the singular when one is unread", async () => {
    await openTheBell([notification()]);
    expect(screen.getByText("You have 1 unread notification.")).toBeVisible();
  });

  it("shows a message where the list would be when there are none", async () => {
    await openTheBell([]);
    expect(screen.getByText("You have no notifications yet.")).toBeVisible();
  });

  it("greys out the mark-all button when there is nothing to mark", async () => {
    await openTheBell([notification({ ReadAt: new Date().toISOString() })]);
    expect(
      screen.getByRole("button", { name: "Mark all read" }),
    ).toBeDisabled();
  });

  it("offers the mark-all button when something is unread", async () => {
    await openTheBell([notification()]);
    const button = screen.getByRole("button", { name: "Mark all read" });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    expect(markAllRead).toHaveBeenCalled();
  });

  it("marks one read when its row is clicked, and only while it is unread", async () => {
    await openTheBell([
      notification({ NotificationUUID: "unread-one" }),
      notification({
        NotificationUUID: "read-one",
        Message: "New review received",
        ReadAt: new Date().toISOString(),
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: /New order/ }));
    expect(markRead).toHaveBeenCalledWith("unread-one");

    fireEvent.click(screen.getByRole("button", { name: /New review/ }));
    expect(markRead).toHaveBeenCalledTimes(1);
  });

  it("says a row is unread where a screen reader can hear it", async () => {
    await openTheBell([notification()]);
    expect(
      screen.getByRole("button", {
        name: "New order received — unread. Mark as read.",
      }),
    ).toBeVisible();
  });
});
