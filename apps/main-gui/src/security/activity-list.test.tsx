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

/* Split from `renderList` because the clamping test below has to hand the same
 * table a shorter list than it drew a moment ago, which is a rerender rather
 * than a second render. */
const listWith = (
  props: Partial<React.ComponentProps<typeof ActivityList>> = {},
) => (
  <ThemeProvider theme={theme}>
    <ActivityList
      events={[event(), added, answered]}
      loading={false}
      failed={false}
      busyId={null}
      onOpen={onOpen}
      {...props}
    />
  </ThemeProvider>
);

const renderList = (
  props: Partial<React.ComponentProps<typeof ActivityList>> = {},
) => render(listWith(props));

/* A log long enough to page, each row saying its own number so a test can name
 * the row it expects rather than counting them. */
const many = (count: number) =>
  Array.from({ length: count }, (_, index) =>
    event({
      SecurityEventUUID: `2d000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      Description: `Event number ${index + 1}.`,
    }),
  );

/* The rows sit between the head and the pager, and that box is what holds the
 * table's height. Reached by position because nothing about it is worth a test
 * id: it draws nothing of its own. */
const rowsBox = (container: HTMLElement) =>
  container.firstElementChild?.children[1] as HTMLElement;

const heightOf = (container: HTMLElement) =>
  window.getComputedStyle(rowsBox(container)).height;

const rows = () => screen.queryAllByRole("button", { name: /^View Event/ });

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
      screen.queryByText(
        "Nothing has happened to this account in the last 30 days.",
      ),
    ).toBeNull();
  });

  /* An empty log is a good state rather than a missing one, and a brand new
   * account is the one that sees it. */
  it("says an empty log is empty", () => {
    renderList({ events: [], loading: false });

    expect(
      screen.getByText(
        "Nothing has happened to this account in the last 30 days.",
      ),
    ).toBeInTheDocument();
  });

  /* A log that could not be read is empty for a reason the page has already
   * given above this table, and "nothing has happened to you" is the wrong
   * one. */
  it("does not call a log it could not read an empty one", () => {
    renderList({ events: [], loading: false, failed: true });

    expect(
      screen.queryByText(
        "Nothing has happened to this account in the last 30 days.",
      ),
    ).toBeNull();
  });
});

/*
 * Twenty rows a page, and the box they sit in never changes height.
 *
 * The paging is done here rather than against the API: main-api hands over one
 * window, the last thirty days of it, and turning a page fetches nothing. The
 * fixed height is what stops the pager walking up the screen from under the
 * finger pressing it when the last page holds three rows.
 */
describe("the pages it is read in", () => {
  it("draws twenty rows and keeps the rest for the next page", () => {
    renderList({ events: many(45) });

    expect(rows()).toHaveLength(20);
    expect(screen.getByText("Event number 20.")).toBeInTheDocument();
    expect(screen.queryByText("Event number 21.")).toBeNull();
  });

  it("walks forward into the older rows and back out again", () => {
    renderList({ events: many(45) });

    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));

    expect(screen.getByText("Event number 21.")).toBeInTheDocument();
    expect(screen.queryByText("Event number 20.")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Newer activity" }));

    expect(screen.getByText("Event number 20.")).toBeInTheDocument();
  });

  it("says which page of how many is being read", () => {
    renderList({ events: many(45) });

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
  });

  /* A quiet arrow is the edge of the log, which is worth showing: one that
   * vanished at the last page would read as a control that had broken. */
  it("quiets the arrow there is nothing behind", () => {
    renderList({ events: many(45) });

    expect(
      screen.getByRole("button", { name: "Newer activity" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Older activity" }),
    ).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));
    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));

    expect(rows()).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "Older activity" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Newer activity" }),
    ).toBeEnabled();
  });

  /* Drawn over a log that fits on one page as well. A pager that appeared on
   * the day the twenty-first event was recorded would move the card's foot
   * exactly when nobody wants this page moving under them. */
  it("draws the pager over a log with one page, with both arrows quiet", () => {
    renderList();

    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Newer activity" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Older activity" }),
    ).toBeDisabled();
  });

  /* Answering a row replaces the whole list, and the list can come back
   * shorter than the page somebody is standing on. They are walked back one
   * rather than thrown to the top of the log for having answered a question. */
  it("walks back a page when the one being read stops existing", () => {
    const { rerender } = renderList({ events: many(45) });

    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));
    fireEvent.click(screen.getByRole("button", { name: "Older activity" }));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();

    rerender(listWith({ events: many(21) }));

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Event number 21.")).toBeInTheDocument();
  });

  /* The whole point of the box: one row, a full page or none at all, the card
   * below it does not move. */
  it("stands the same height over one row as over a full page", () => {
    const one = renderList({ events: [event()] }).container;
    const full = renderList({ events: many(20) }).container;
    const empty = renderList({ events: [] }).container;

    expect(heightOf(one)).not.toBe("");
    expect(heightOf(full)).toBe(heightOf(one));
    expect(heightOf(empty)).toBe(heightOf(one));
  });
});
