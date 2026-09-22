import { describe, expect, it } from "vitest";
import * as pricing from "./index";
import { Pricing } from "./pricing";

/*
 * One export: the page. The plans, the cards and the questions under them are
 * how this page is built, and a caller that could reach `audiences` could put
 * a price somewhere this vertical does not know about.
 */

describe("what pricing offers the rest of the app", () => {
  it("offers the page, and nothing else", () => {
    expect(Object.keys(pricing).toSorted()).toEqual(["Pricing"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(pricing.Pricing).toBe(Pricing);
  });
});
