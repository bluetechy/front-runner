import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { SecurityEvent } from "./activity-api";
import { ActivityList } from "./activity-list";

/*
 * What has happened to the account, as four columns.
 *
 * It is the same table the addresses above it are drawn in, which is most of
 * what this file is about: the same rule between rows, the same pills in
 * Status, the same right-aligned Action column. Two lists on one page drawn two
 * ways would read as two different kinds of thing.
 *
 * The other rule here is that **every row opens**, answered or not. An answer
 * can be changed, and somebody who pressed the wrong one is exactly who needs
 * the way back in.
 */

const onOpen = vi.fn();

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

const added = event({
  SecurityEventUUID: "2d000000-0000-4000-8000-000000000002",
  EventType: "EmailAdded",
  Description: "work@example.test was added to your account.",
  Device: null,
  Location: null,
});

const answered = event({
  SecurityEventUUID: "2d000000-0000-4000-8000-000000000003",
  EventType: "PasswordChanged",
  Description: "Your password was changed.",
  Device: null,
  Location: null,
  ReviewedAt: "2026-09-21T00:00:00.000Z",
  Recognized: true,
});

const renderList = (
  props: Partial<React.ComponentProps<typeof ActivityList>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <ActivityList
        events={[event(), added, answered]}
        loading={false}
        failed={false}
        busyId={null}
        onOpen={onOpen}
        {...props}
      />
    </ThemeProvider>,
  );

beforeEach(() => onOpen.mockReset());

describe("the columns", () => {
  it("heads when it happened, what it was, where it stands and what to do", () => {
    renderList();

    for (const column of ["When", "Activity", "Status", "Action"])
      expect(screen.getByRole("heading", { name: column })).toBeInTheDocument();
  });

  /* The sentence rather than the type: "New login" over a row loses which
   * address was added and which device logged in. */
  it("writes the sentence the event was recorded with", () => {
    renderList();

    expect(screen.getByText("New login on Mac OS.")).toBeInTheDocument();
    expect(
      screen.getByText("work@example.test was added to your account."),
    ).toBeInTheDocument();
  });

  /* The mock-up gives these a column of their own. Most rows know neither, and
   * a column empty on four rows in five is a column of nothing. */
  it("puts the device and the place under the sentence, where there are any", () => {
    renderList();

    expect(screen.getByText("Mac OS · Utah, USA")).toBeInTheDocument();
  });

  it("says when it happened", () => {
    renderList();

    expect(screen.getAllByText(/2026/).length).toBeGreaterThan(0);
  });
});

describe("what the Status column says", () => {
  it("marks an unanswered event New and an answered one by its answer", () => {
    renderList();

    expect(screen.getAllByText("New")).toHaveLength(2);
    expect(screen.getByText("Recognized")).toBeInTheDocument();
  });

  it("marks a disowned event Reported", () => {
    renderList({
      events: [
        event({ ReviewedAt: "2026-09-21T00:00:00.000Z", Recognized: false }),
      ],
    });

    expect(screen.getByText("Reported")).toBeInTheDocument();
  });
});

describe("opening one", () => {
  /* Named by the row rather than by the word alone: a screen reader running
   * down this column would otherwise hear "View, View, View". */
  it("names what each button opens", () => {
    renderList();

    expect(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    ).toBeInTheDocument();
  });

  it("hands the whole event back rather than its id", () => {
    renderList();

    fireEvent.click(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    );

    expect(onOpen).toHaveBeenCalledWith(event());
  });

  /* An answer can be changed, so an answered row is not closed off. */
  it("opens a row that has already been answered", () => {
    renderList();

    fireEvent.click(
      screen.getByRole("button", { name: "View Your password was changed." }),
    );

    expect(onOpen).toHaveBeenCalledWith(answered);
  });

  /* One row at a time, and only that row: the rest of the table stays live. */
  it("holds the row whose answer is in flight and no other", () => {
    renderList({ busyId: event().SecurityEventUUID });

    expect(
      screen.getByRole("button", { name: "View New login on Mac OS." }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "View Your password was changed." }),
    ).toBeEnabled();
  });
});

describe("when there is nothing to show", () => {
  /* Waiting is not the same as empty, and neither is a failure: the page draws
   * the error above this table. */
  it("waits rather than saying the account has no history", () => {
    renderList({ events: [], loading: true });

    expect(
      screen.queryByText("Nothing has happened to this account yet."),
    ).toBeNull();
  });

  /* An empty log is a good state rather than a missing one, and a brand new
   * account is the one that sees it. */
  it("says an empty log is empty", () => {
    renderList({ events: [], loading: false });

    expect(
      screen.getByText("Nothing has happened to this account yet."),
    ).toBeInTheDocument();
  });

  /* A log that could not be read is empty for a reason the page has already
   * given above this table, and "nothing has happened to you" is the wrong
   * one. */
  it("does not call a log it could not read an empty one", () => {
    renderList({ events: [], loading: false, failed: true });

    expect(
      screen.queryByText("Nothing has happened to this account yet."),
    ).toBeNull();
  });
});
