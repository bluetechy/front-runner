import { describe, expect, it } from "vitest";
import * as privacy from "./index";
import { Privacy } from "./privacy";

/*
 * One export: the page. `sections.ts` is the words on it, and nothing outside
 * this folder reads them -- the cookie dialog says its own four sentences
 * from `cookie-consent/categories.ts`, which is where they belong.
 */

describe("what the privacy page offers the rest of the app", () => {
  it("offers the page, and nothing else", () => {
    expect(Object.keys(privacy).toSorted()).toEqual(["Privacy"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(privacy.Privacy).toBe(Privacy);
  });
});
