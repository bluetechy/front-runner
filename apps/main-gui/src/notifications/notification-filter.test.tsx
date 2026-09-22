import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { NotificationFilters } from "./notification-filter";
import { FILTERS, type NotificationCounts } from "./notifications-api";

/*
 * All, Read, Unread -- the strip under the panel's heading, and the same one
 * on the page. The order comes from `notifications-api`, written once so the
 * two strips cannot drift apart.
 *
 * The counts are optional because the panel does not show them: it is narrow
 * and already says the unread count in its heading.
 */

const counts: NotificationCounts = { All: 40, Unread: 6, Read: 34 };

const renderFilters = (
  props: Partial<React.ComponentProps<typeof NotificationFilters>> = {},
) => {
  const onChange = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <NotificationFilters filter="All" onChange={onChange} {...props} />
    </ThemeProvider>,
  );
  return { onChange };
};

describe("the strip", () => {
  it("offers the three filters, in the order the API lists them", () => {
    renderFilters();

    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual([...FILTERS]);
  });

  it("marks the one in force", () => {
    renderFilters({ filter: "Unread" });

    expect(screen.getByRole("button", { name: "Unread" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("changes the filter when another is chosen", () => {
    const { onChange } = renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "Read" }));

    expect(onChange).toHaveBeenCalledWith("Read");
  });

  // A filter always has an answer, so clicking the one already chosen is a
  // no-op rather than "none of them".
  it("ignores the selected filter being chosen again", () => {
    const { onChange } = renderFilters({ filter: "All" });

    fireEvent.click(screen.getByRole("button", { name: "All" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("the counts beside them", () => {
  it("shows none at all where the caller passed none", () => {
    renderFilters();

    expect(screen.queryByText("40")).toBeNull();
  });

  it("shows each filter's own count", () => {
    renderFilters({ counts });

    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("34")).toBeInTheDocument();
  });

  // So a screen reader hears "Unread, 6" rather than the word alone or two
  // unrelated things.
  it("says the count as part of what each filter is called", () => {
    renderFilters({ counts });

    expect(
      screen.getByRole("button", { name: "Unread, 6" }),
    ).toBeInTheDocument();
  });
});
