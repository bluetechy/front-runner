import { describe, expect, it } from "vitest";
import { relativeTime } from "./relative-time";

/*
 * How long ago a notification arrived, which is the only thing the menu says
 * about time. The clock is passed in rather than mocked, so none of this
 * depends on what today is.
 */

const NOW = new Date("2026-09-22T12:00:00Z");
const ago = (milliseconds: number) =>
  new Date(NOW.getTime() - milliseconds).toISOString();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("how long ago a notification arrived", () => {
  it("says it in the largest unit the gap fills", () => {
    expect(relativeTime(ago(90 * MINUTE), "en-US", NOW)).toBe("1 hour ago");
    expect(relativeTime(ago(2 * DAY), "en-US", NOW)).toBe("2 days ago");
    expect(relativeTime(ago(400 * DAY), "en-US", NOW)).toBe("last year");
  });

  /* Truncated rather than rounded. "1 day ago" for something that arrived
   * this morning is wrong in the way somebody notices. */
  it("keeps twenty-three hours in hours", () => {
    expect(relativeTime(ago(23 * HOUR), "en-US", NOW)).toBe("23 hours ago");
    expect(relativeTime(ago(25 * HOUR), "en-US", NOW)).toBe("yesterday");
  });

  it("says just-arrived rather than nought seconds", () => {
    expect(relativeTime(ago(4 * 1000), "en-US", NOW)).toBe("now");
  });

  /* The reason this is `Intl` and not a table of strings in the locale
   * files: the grammar is the library's, in every language offered. */
  it("says it in the language it is asked for", () => {
    expect(relativeTime(ago(2 * DAY), "es-MX", NOW)).toBe("anteayer");
    expect(relativeTime(ago(3 * DAY), "es-MX", NOW)).toBe("hace 3 días");
  });

  it("takes a Date as readily as the string the API sends", () => {
    expect(relativeTime(new Date(NOW.getTime() - HOUR), "en-US", NOW)).toBe(
      "1 hour ago",
    );
  });

  /* A timestamp this browser cannot parse shows as nothing rather than as
   * "Invalid Date" under somebody's notification. */
  it("says nothing about a date it cannot read", () => {
    expect(relativeTime("not a date", "en-US", NOW)).toBe("");
  });
});
