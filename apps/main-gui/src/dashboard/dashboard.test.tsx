import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { monthRevenue, tiles } from "./metrics";

/*
 * Where a completed sign-in lands.
 *
 * Almost all of it is placeholder -- see `metrics.ts` -- so what this asserts
 * is the page's own arithmetic and its own words: who it greets and how, and
 * that the goal bar agrees with the two numbers beside it. The account card
 * is stubbed, because it fetches and has a test of its own.
 */

vi.mock("./account-card", () => ({
  AccountCard: () => <p>The account card</p>,
}));

const session = vi.fn();
vi.mock("../authentication", () => ({ useSession: () => session() }));

const { Dashboard } = await import("./dashboard");

/* `null` is a session that has not named anybody yet -- which is not the
 * same as leaving the argument out. */
const renderPage = (name: string | null = "Thomas John") => {
  session.mockReturnValue({ identity: name ? { name } : null });
  return render(
    <ThemeProvider theme={theme}>
      <Dashboard />
    </ThemeProvider>,
  );
};

afterEach(() => {
  vi.useRealTimers();
});

describe("the greeting", () => {
  // "Thomas John" is greeted as Thomas. A login name gives itself back.
  it("greets somebody by their first name", () => {
    renderPage();

    /* By its accessible name: the greeting and the name are separate text
     * nodes inside the heading. */
    expect(
      screen.getByRole("heading", { name: /, Thomas!$/ }),
    ).toBeInTheDocument();
  });

  // The moment before the session has settled. "there" rather than a blank
  // or a name invented for them.
  it("greets somebody it cannot name at all", () => {
    renderPage(null);

    expect(
      screen.getByRole("heading", { name: /, there!$/ }),
    ).toBeInTheDocument();
  });

  it.each([
    ["Good morning", 9],
    ["Good afternoon", 14],
    ["Good evening", 20],
  ])("says %s at the right time of day", (greeting, hour) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 22, hour, 0, 0));

    renderPage();

    expect(
      screen.getByRole("heading", { name: new RegExp(`^${greeting},`) }),
    ).toBeInTheDocument();
  });
});

describe("what the page holds", () => {
  it("is titled, and offers the mock-up's one action", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Dashboard", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create KPI/ })).toBeVisible();
  });

  it("draws every tile from the metrics", () => {
    renderPage();

    for (const tile of tiles)
      expect(screen.getByText(tile.label)).toBeInTheDocument();
  });

  it("draws the cards the mock-up lays out", () => {
    renderPage();

    for (const title of [
      "This month revenue",
      "Expected earnings",
      "Average daily sales",
      "Weekly sales",
      "New customers this month",
    ])
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("keeps the one card that is really wired up", () => {
    renderPage();

    expect(screen.getByText("The account card")).toBeInTheDocument();
  });
});

describe("the month's goal", () => {
  // The bar, the amount earned and the amount left are three views of two
  // numbers, and a bar that disagrees with the figures beside it is worse
  // than no bar.
  it("fills as far as the takings have got", () => {
    renderPage();
    const bar = screen.getByRole("progressbar", {
      name: "Progress towards this month's goal",
    });

    expect(Number(bar.getAttribute("aria-valuenow"))).toBeCloseTo(
      (monthRevenue.earned / monthRevenue.goal) * 100,
      5,
    );
    /* And the same figure written beside it, as a whole number. */
    expect(
      screen.getByText(
        `${Math.round((monthRevenue.earned / monthRevenue.goal) * 100)}%`,
      ),
    ).toBeInTheDocument();
  });
});
