import { describe, expect, it } from "vitest";
import { Privacy } from "../privacy";
import { Route } from "./_site.privacy";

/*
 * The route, which is a route and nothing else: under `_site`, so the policy
 * is read inside the marketing header and the violet field, and rendering one
 * thing from one vertical.
 */

describe("the privacy route", () => {
  it("renders the privacy policy", () => {
    expect(Route.options.component).toBe(Privacy);
  });
});
