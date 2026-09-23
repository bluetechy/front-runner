import { describe, expect, it } from "vitest";
import { categories, isRequired, type CategoryId } from "./categories";

/*
 * The four things a cookie can be for here.
 *
 * What is worth pinning is not the wording, which will be edited, but the
 * shape the law cares about: exactly one category nobody can refuse, three
 * that can be answered one at a time, and a sentence against each one saying
 * what is actually kept under it.
 */

describe("the categories somebody is asked about", () => {
  it("names all four, in the order they are read", () => {
    expect(categories.map((category) => category.id)).toEqual([
      "necessary",
      "preferences",
      "analytics",
      "marketing",
    ]);
  });

  // One that cannot be refused, because refusing it is closing the tab.
  // Everything else has to be refusable on its own, or the choice is not
  // specific and is not consent.
  it("has exactly one category nobody is being asked about", () => {
    const required = categories.filter((category) => category.required);

    expect(required.map((category) => category.id)).toEqual(["necessary"]);
  });

  it("says what each one is for, and what is actually kept under it", () => {
    for (const category of categories) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.purpose.length).toBeGreaterThan(0);
      expect(category.kept.length).toBeGreaterThan(0);
    }
  });

  // The three with nothing behind them say so rather than implying a tracker
  // nobody installed. A category described as running something it does not
  // run is the same lie as one that hides what it does.
  it("admits that the optional three hold nothing yet", () => {
    const optional = categories.filter((category) => !category.required);

    for (const category of optional) {
      expect(category.kept).toMatch(/^Nothing yet\./);
    }
  });
});

describe("which of them may be used without asking", () => {
  it("answers yes only for the strictly necessary one", () => {
    expect(isRequired("necessary")).toBe(true);
    expect(isRequired("preferences")).toBe(false);
    expect(isRequired("analytics")).toBe(false);
    expect(isRequired("marketing")).toBe(false);
  });

  // A category nobody has heard of is not one to run without asking about.
  it("answers no for anything it has never heard of", () => {
    expect(isRequired("fingerprinting" as CategoryId)).toBe(false);
  });
});
