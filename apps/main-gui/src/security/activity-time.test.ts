import { describe, expect, it } from "vitest";
import { occurredAt } from "./activity-time";

/*
 * When something happened, written out rather than counted back from.
 *
 * The bell says "2 days ago" because what matters there is freshness. This is
 * the other case: somebody deciding whether a login was theirs is placing it
 * against their own day, and "3 days ago" makes them do the arithmetic that
 * decides whether to report it.
 */

const WHEN = "2026-09-20T21:42:00.000Z";

describe("writing out when something happened", () => {
  it("gives the day and the hour separately, so a row can stack them", () => {
    const { day, time } = occurredAt(WHEN, "en-US");

    expect(day).toContain("2026");
    expect(day).toContain("20");
    expect(time).toMatch(/\d/);
  });

  it("writes the month as a word rather than a number", () => {
    expect(occurredAt(WHEN, "en-US").day).toMatch(/Sep/);
  });

  /* `Intl` already knows that Spanish writes the month differently and puts
   * the hour on a 24-hour clock. Translating a date format would be
   * translating a grammar rather than a sentence. */
  it("writes it in whatever language the interface is in", () => {
    expect(occurredAt(WHEN, "es-MX").day).not.toEqual(
      occurredAt(WHEN, "en-US").day,
    );
  });

  it("takes a Date as readily as the string the API sends", () => {
    expect(occurredAt(new Date(WHEN), "en-US")).toEqual(
      occurredAt(WHEN, "en-US"),
    );
  });

  /* Nothing rather than "Invalid Date", which is the same answer the relative
   * clock gives a timestamp it cannot read. */
  it("shows nothing for a timestamp it cannot read", () => {
    expect(occurredAt("not a date", "en-US")).toEqual({ day: "", time: "" });
  });
});
