import { describe, expect, it } from "vitest";
import {
  averageDailySales,
  count,
  expectedEarnings,
  money,
  monthRevenue,
  newCustomers,
  tiles,
  weekdays,
  weeklySales,
} from "./metrics";

/*
 * Every figure the dashboard draws.
 *
 * All of it is placeholder -- main-api serves accounts and organizations
 * today, not KPIs -- so what is worth testing is not the numbers themselves
 * but that they agree with each other. The mock-up's did not: its slices did
 * not add to its total and its bars did not average to the figure above
 * them, and a page whose own arithmetic is visibly wrong is a page nobody
 * believes the rest of.
 *
 * These are also the assertions that will still mean something when the
 * numbers come from a query: the shapes and the sums are the contract.
 */

describe("how a figure is written", () => {
  // Always to the cent, including when the cents are nothing: a column of
  // takings in which some rows have decimals and some do not does not line up.
  it("writes money as money, to the cent", () => {
    expect(money(12_435)).toBe("$12,435.00");
    expect(money(29_115.5)).toBe("$29,115.50");
  });

  it("writes a count with its thousands separated", () => {
    expect(count(15_210)).toBe("15,210");
    expect(count(84)).toBe("84");
  });
});

/* "$12,435" and "15,210" back to the numbers behind them. */
const figure = (written: string) => Number(written.replace(/[$,]/g, ""));

describe("the tiles along the top", () => {
  it("gives every tile a label, a figure, what it was, and which way it went", () => {
    for (const tile of tiles) {
      expect(tile.label).not.toBe("");
      expect(tile.value).not.toBe("");
      expect(tile.previous).not.toBe("");
      expect(["up", "down"]).toContain(tile.direction);
      expect(tile.icon).toBeTypeOf("function");
    }
  });

  it("gives each one an id of its own", () => {
    expect(new Set(tiles.map((tile) => tile.id)).size).toBe(tiles.length);
  });

  // Up is green and down is red throughout, including on refunds and
  // shipping where falling is the good news -- see `change.tsx`. What the
  // direction must always be is the direction the two figures actually went.
  it.each(tiles.map((tile) => [tile.label, tile] as const))(
    "says %s went the way its two figures did",
    (_label, tile) => {
      expect(tile.direction).toBe(
        figure(tile.value) >= figure(tile.previous) ? "up" : "down",
      );
    },
  );
});

describe("the month's takings", () => {
  // The bar's percentage is computed from these two rather than stored, so
  // the three numbers cannot drift apart.
  it("aims at more than it has earned, so the bar has somewhere to go", () => {
    expect(monthRevenue.earned).toBeLessThan(monthRevenue.goal);
    expect(monthRevenue.earned).toBeGreaterThan(0);
  });
});

describe("the week's takings", () => {
  it("has a figure for every day, in both weeks", () => {
    for (const series of weeklySales.series)
      expect(series.values).toHaveLength(weekdays.length);
  });

  // The figure over the chart is the week in the chart, added up.
  it("adds up to the total printed over the chart", () => {
    const thisWeek = weeklySales.series[0];

    expect(thisWeek?.values.reduce((sum, day) => sum + day, 0)).toBe(
      weeklySales.total,
    );
  });

  it("has something to read this week against", () => {
    expect(weeklySales.series).toHaveLength(2);
    expect(weeklySales.series[1]?.label).toBe("Last week");
  });
});

describe("what is expected to be earned", () => {
  // The total is not a fourth number: a doughnut whose slices do not add to
  // the figure in the middle of it is a doughnut nobody can read.
  it("is the slices, added up, and nothing else", () => {
    const total = expectedEarnings.slices.reduce(
      (sum, slice) => sum + slice.value,
      0,
    );

    expect(total).toBe(32_000);
    expect(expectedEarnings.slices.every((slice) => slice.value > 0)).toBe(
      true,
    );
  });

  it("names every slice", () => {
    for (const slice of expectedEarnings.slices)
      expect(slice.label).not.toBe("");
  });
});

describe("the average day's takings", () => {
  // The figure over the bars is the bars, averaged. The mock-up's was not.
  it("is the seven days it draws, averaged", () => {
    const values = averageDailySales.values;
    const mean = values.reduce((sum, day) => sum + day, 0) / values.length;

    expect(values).toHaveLength(weekdays.length);
    expect(Math.round(mean)).toBe(averageDailySales.average);
  });
});

describe("the rest of the cards", () => {
  it("counts new customers, and how many of them arrived today", () => {
    expect(newCustomers.value).not.toBe("");
    expect(newCustomers.joinedToday).toBeGreaterThan(0);
  });

  it("names the seven days, starting where a week starts", () => {
    expect(weekdays).toHaveLength(7);
    expect(weekdays[0]).toBe("Sun");
  });
});
