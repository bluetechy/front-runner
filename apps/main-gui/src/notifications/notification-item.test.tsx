import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { NotificationItem } from "./notification-item";
import type { Notification } from "./notifications-api";

/*
 * One row of the notifications page, which is the panel's row given the space
 * a page has.
 *
 * **The row is not a button here, and it is in the panel.** That is
 * deliberate rather than drift: a panel is a quick action somebody opened on
 * purpose, and a page is somewhere to read, where a stray click should not
 * quietly change something. Both halves of that are asserted -- here, and in
 * `notification-row.test.tsx`.
 */

const ago = new Date(Date.now() - 3 * 60 * 1000).toISOString();

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    NotificationUUID: "2b000000-0000-4000-8000-00000000000a",
    OrganizationUUID: "a0000000-0000-4000-8000-000000000001",
    TaskUUID: null,
    ActorUUID: null,
    ActorName: null,
    NotificationType: "BadgeEarned",
    Message: "You earned the First Sale badge",
    ReadAt: null,
    CreatedAt: ago,
    ...overrides,
  };
}

const renderItem = (overrides: Partial<Notification> = {}, busy = false) => {
  const onRead = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <ul>
        <NotificationItem
          notification={notification(overrides)}
          onRead={onRead}
          busy={busy}
        />
      </ul>
    </ThemeProvider>,
  );
  return { onRead, ...view };
};

describe("what the row says", () => {
  it("says what kind of thing it is, in a chip", () => {
    renderItem();

    expect(screen.getByText("Badge")).toBeInTheDocument();
  });

  it("says what happened and how long ago", () => {
    renderItem();

    expect(
      screen.getByText("You earned the First Sale badge"),
    ).toBeInTheDocument();
    expect(screen.getByText(/3 minutes ago/i)).toBeInTheDocument();
  });

  it("leads with whoever caused it, where somebody did", () => {
    renderItem({ ActorName: "Thomas John", Message: "mentioned you" });

    expect(screen.getByText("Thomas John")).toBeInTheDocument();
  });
});

describe("saying that a row is unread", () => {
  // Three ways, each for a different reader: the stripe and the tint are for
  // the eye running down the list, and the button being there at all is for
  // somebody who has to be told what they can do.
  it("draws the stripe down its edge and offers the action", () => {
    const { container } = renderItem();

    expect(container.querySelector("li > [aria-hidden]")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /Mark as read/i }),
    ).toBeInTheDocument();
  });

  it("drops both once it has been read", () => {
    renderItem({ ReadAt: new Date().toISOString() });

    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("marking one read", () => {
  it("marks it, and says which one it is about to mark", () => {
    const { onRead } = renderItem({
      ActorName: "Thomas John",
      Message: "mentioned you",
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Mark as read: Thomas John mentioned you",
      }),
    );

    expect(onRead).toHaveBeenCalledWith("2b000000-0000-4000-8000-00000000000a");
  });

  it("cannot be pressed twice while the first is still in flight", () => {
    const { onRead } = renderItem({}, true);

    fireEvent.click(screen.getByRole("button", { name: /Mark as read/i }));

    expect(onRead).not.toHaveBeenCalled();
  });

  // A page is somewhere to read. The row itself does nothing.
  it("does nothing when the row itself is clicked", () => {
    const { onRead, container } = renderItem();

    fireEvent.click(container.querySelector("li") as HTMLElement);

    expect(onRead).not.toHaveBeenCalled();
  });
});
