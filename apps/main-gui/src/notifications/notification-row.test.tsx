import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { NotificationRow } from "./notification-row";
import type { Notification } from "./notifications-api";

/*
 * One line of the bell's panel.
 *
 * The whole row is the target, because there is one thing to do with a
 * notification in the panel and it is "I have seen this". The page's row is
 * deliberately not a button -- see `notification-item` -- so the difference
 * is asserted on both sides rather than left to drift.
 */

const ago = new Date(Date.now() - 3 * 60 * 1000).toISOString();

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    NotificationUUID: "2b000000-0000-4000-8000-00000000000a",
    OrganizationUUID: "a0000000-0000-4000-8000-000000000001",
    TaskUUID: null,
    ActorUUID: null,
    ActorName: null,
    NotificationType: "Assigned",
    Message: "A task fell overdue",
    ReadAt: null,
    CreatedAt: ago,
    ...overrides,
  };
}

const renderRow = (overrides: Partial<Notification> = {}) => {
  const onRead = vi.fn();
  const view = render(
    <ThemeProvider theme={theme}>
      <NotificationRow notification={notification(overrides)} onRead={onRead} />
    </ThemeProvider>,
  );
  return { onRead, ...view };
};

describe("what the row says", () => {
  it("says what happened, and how long ago", () => {
    renderRow();

    expect(screen.getByText("A task fell overdue")).toBeInTheDocument();
    expect(screen.getByText(/3 minutes ago/i)).toBeInTheDocument();
  });

  // The message is written to follow a name -- "assigned you Build the API" --
  // and stands on its own where there is nobody.
  it("leads with whoever caused it, where somebody did", () => {
    renderRow({
      ActorName: "Thomas John",
      Message: "assigned you Build the API",
    });

    expect(screen.getByText("Thomas John")).toBeInTheDocument();
  });

  // A screen reader sees neither the face, the ring, nor the column they sit
  // in, so the row is said as one sentence including what pressing it does.
  it("says the whole row in one sentence, and what pressing it would do", () => {
    renderRow({ ActorName: "Thomas John", Message: "assigned you a task" });

    expect(
      screen.getByRole("button", {
        name: /Thomas John assigned you a task.*unread\. Mark as read\./i,
      }),
    ).toBeInTheDocument();
  });

  it("says so when it has already been read", () => {
    renderRow({ ReadAt: new Date().toISOString() });

    expect(
      screen.getByRole("button", { name: /— read\.$/i }),
    ).toBeInTheDocument();
  });
});

describe("marking one read", () => {
  it("marks an unread notification when the row is pressed", () => {
    const { onRead } = renderRow();

    fireEvent.click(screen.getByRole("button"));

    expect(onRead).toHaveBeenCalledWith("2b000000-0000-4000-8000-00000000000a");
  });

  // Nothing to do, and asking the API to do it again would move a count that
  // has already moved.
  it("does nothing when the row has already been read", () => {
    const { onRead } = renderRow({ ReadAt: new Date().toISOString() });

    fireEvent.click(screen.getByRole("button"));

    expect(onRead).not.toHaveBeenCalled();
  });

  // The mock-up draws a chevron; it would point at a page that does not
  // exist. An affordance that lies is worse than one that is missing.
  it("offers nothing else to press", () => {
    renderRow();

    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
