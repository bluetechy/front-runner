import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { SecurityEvent } from "./activity-api";
import { ActivityDialog } from "./activity-dialog";

/*
 * One event, and the question the page exists to ask about it.
 *
 * Two things carry this file. **Neither answer is painted** -- they are the
 * same outlined button twice, which is the rule the cookie notice made: a
 * contained button on one of two answers is a nudge, and the nudge here would
 * land on somebody deciding whether their account has been broken into. And the
 * dialog **says what "No" will do before it is pressed**, because what it does
 * is send a message.
 */

const onClose = vi.fn();
const onAnswer = vi.fn();

const event = (overrides: Partial<SecurityEvent> = {}): SecurityEvent => ({
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

const renderDialog = (
  props: Partial<React.ComponentProps<typeof ActivityDialog>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <ActivityDialog
        event={event()}
        pending={null}
        onClose={onClose}
        onAnswer={onAnswer}
        {...props}
      />
    </ThemeProvider>,
  );

beforeEach(() => {
  onClose.mockReset();
  onAnswer.mockReset();
});

describe("what the dialog shows", () => {
  it("heads the event by its kind and writes the sentence under it", () => {
    renderDialog();

    expect(
      screen.getByRole("heading", { name: "New login" }),
    ).toBeInTheDocument();
    expect(screen.getByText("New login on Mac OS.")).toBeInTheDocument();
  });

  it("says when it happened and whether it is still unanswered", () => {
    renderDialog();

    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("says what the device was and where it was", () => {
    renderDialog();

    expect(screen.getByText("Mac OS")).toBeInTheDocument();
    expect(screen.getByText("Utah, USA")).toBeInTheDocument();
  });

  /* A line reading "Device: unknown" is a line of text that answers nothing. */
  it("leaves out what is not known rather than saying it is unknown", () => {
    renderDialog({ event: event({ Device: null, Location: null }) });

    expect(screen.queryByText(/unknown/i)).toBeNull();
  });

  it("says what it would mean if the answer is no", () => {
    renderDialog();

    expect(
      screen.getByText("Your account is at risk if this was not you."),
    ).toBeInTheDocument();
  });

  /* Said before the button is pressed, because it is what the button does:
   * somebody choosing "No" is owed the knowledge that a message is coming and
   * that pressing it does not lock them out. */
  it("says what securing the account will do before it is asked to", () => {
    renderDialog();

    expect(
      screen.getByText(/link to choose a new password/i),
    ).toBeInTheDocument();
  });

  it("shuts when there is no event to look at", () => {
    renderDialog({ event: null });

    expect(screen.queryByRole("heading", { name: "New login" })).toBeNull();
  });
});

describe("the two answers", () => {
  it("asks the question in so many words", () => {
    renderDialog();

    expect(
      screen.getByText("Do you recognize this activity?"),
    ).toBeInTheDocument();
  });

  it("hands back the event and what was said", () => {
    renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /Yes, it was me/ }));
    expect(onAnswer).toHaveBeenCalledWith(event(), true);

    fireEvent.click(screen.getByRole("button", { name: /No, secure account/ }));
    expect(onAnswer).toHaveBeenCalledWith(event(), false);
  });

  /* The rule the cookie notice made, applied to the other place in this
   * product where painting one of two answers would be a nudge. Neither is
   * contained, so neither is the offer. */
  it("paints neither answer as the one to press", () => {
    renderDialog();

    for (const name of [/Yes, it was me/, /No, secure account/])
      expect(screen.getByRole("button", { name })).toHaveClass(
        "MuiButton-outlined",
      );
  });

  /* An answer can be changed, and somebody who pressed the wrong button is
   * exactly who is opening this a second time. */
  it("asks again about an event that has already been answered", () => {
    renderDialog({
      event: event({
        ReviewedAt: "2026-09-21T00:00:00.000Z",
        Recognized: true,
      }),
    });

    expect(screen.getByText("Recognized")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /No, secure account/ }),
    ).toBeEnabled();
  });
});

describe("while an answer is in flight", () => {
  it("takes no second answer and offers no way out", () => {
    renderDialog({ pending: true });

    expect(
      screen.getByRole("button", { name: /Yes, it was me/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /No, secure account/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  });

  /* Which answer is in flight rather than whether one is: two buttons spinning
   * at once would say the dialog had not heard which was pressed. */
  it("spins only the button that was pressed", () => {
    /* The dialog renders in a portal, so what it drew is on the document
     * rather than under the container `render` hands back. */
    renderDialog({ pending: false });

    expect(document.querySelectorAll(".MuiCircularProgress-root")).toHaveLength(
      1,
    );
    expect(
      screen
        .getByRole("button", { name: /No, secure account/ })
        .querySelector(".MuiCircularProgress-root"),
    ).not.toBeNull();
  });
});
