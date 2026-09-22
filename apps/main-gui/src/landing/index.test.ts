import { describe, expect, it } from "vitest";
import * as landing from "./index";
import { Hero } from "./hero";

describe("what the landing page offers the rest of the app", () => {
  it("offers the hero, and nothing else", () => {
    expect(Object.keys(landing).toSorted()).toEqual(["Hero"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(landing.Hero).toBe(Hero);
  });
});
