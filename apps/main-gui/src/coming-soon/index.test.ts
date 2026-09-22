import { describe, expect, it } from "vitest";
import * as comingSoon from "./index";
import { ComingSoon } from "./coming-soon";

describe("what the placeholder offers the rest of the app", () => {
  it("offers the page, and nothing else", () => {
    expect(Object.keys(comingSoon).toSorted()).toEqual(["ComingSoon"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(comingSoon.ComingSoon).toBe(ComingSoon);
  });
});
