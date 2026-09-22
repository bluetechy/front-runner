import { describe, expect, it } from "vitest";
import * as dashboard from "./index";
import { Dashboard } from "./dashboard";

/*
 * One export: the page. The metrics behind it are placeholder and are
 * deliberately not public -- a second page reading `tiles` would be a second
 * page showing numbers that are not real yet.
 */

describe("what the dashboard offers the rest of the app", () => {
  it("offers the page, and nothing else", () => {
    expect(Object.keys(dashboard).toSorted()).toEqual(["Dashboard"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(dashboard.Dashboard).toBe(Dashboard);
  });
});
