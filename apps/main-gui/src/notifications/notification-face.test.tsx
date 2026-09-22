import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { NotificationFace } from "./notification-face";
import { kindOf } from "./notification-kinds";
import type { Notification } from "./notifications-api";

/*
 * The circle at the front of a notification.
 *
 * Somebody caused it, or nobody did, and the circle answers a different
 * question in each case: a face with the kind on its corner, or the kind
 * filling the circle. Most notifications are the second -- a task falls
 * overdue on its own, a level is reached by the person being told.
 */

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    NotificationUUID: "2b000000-0000-4000-8000-00000000000a",
    OrganizationUUID: "a0000000-0000-4000-8000-000000000001",
    TaskUUID: null,
    ActorUUID: null,
    ActorName: null,
    NotificationType: "Assigned",
    Message: "assigned you Build the API",
    ReadAt: null,
    CreatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const renderFace = (element: React.ReactElement) =>
  render(<ThemeProvider theme={theme}>{element}</ThemeProvider>);

describe("a notification somebody caused", () => {
  it("shows that person", () => {
    renderFace(
      <NotificationFace
        notification={notification({ ActorName: "Thomas John" })}
      />,
    );

    expect(screen.getByText("TJ")).toBeInTheDocument();
  });

  // The face answers "who" and the disc answers "what", and neither has to be
  // read to get the other.
  it("puts the kind on the corner of the face", () => {
    const { container } = renderFace(
      <NotificationFace
        notification={notification({ ActorName: "Thomas John" })}
      />,
    );

    expect(container.querySelector(".MuiBadge-badge svg")).not.toBeNull();
  });
});

describe("a notification nobody caused", () => {
  it("fills the circle with the kind instead", () => {
    const { container } = renderFace(
      <NotificationFace notification={notification()} />,
    );

    expect(container.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText(/^[A-Z]{1,2}$/)).toBeNull();
  });

  it("paints the circle in the tint for what it is about", () => {
    const { container } = renderFace(
      <NotificationFace
        notification={notification({ NotificationType: "BadgeEarned" })}
      />,
    );

    expect(container.firstElementChild).toHaveStyle({
      backgroundColor:
        theme.palette.brand.noticeTints[kindOf("BadgeEarned").tint],
    });
  });
});

describe("whatever it draws", () => {
  // Everything it draws is said in words by the row it sits in, and a screen
  // reader reading it twice would be worse than not reading it at all.
  it("is hidden from a screen reader, either way", () => {
    const { container: alone } = renderFace(
      <NotificationFace notification={notification()} />,
    );
    const { container: withActor } = renderFace(
      <NotificationFace
        notification={notification({ ActorName: "Thomas John" })}
      />,
    );

    expect(alone.firstElementChild).toHaveAttribute("aria-hidden");
    expect(withActor.firstElementChild).toHaveAttribute("aria-hidden");
  });

  // The panel draws it at 44 and the page at 48, and everything inside scales
  // with it rather than being sized twice.
  it("is drawn at the size the caller asked for", () => {
    const { container } = renderFace(
      <NotificationFace notification={notification()} size={64} />,
    );

    expect(container.firstElementChild).toHaveStyle({
      width: "64px",
      height: "64px",
    });
  });
});
