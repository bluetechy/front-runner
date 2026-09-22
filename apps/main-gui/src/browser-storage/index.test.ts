import { describe, expect, it } from "vitest";
import * as browserStorage from "./index";
import { read, remove, write } from "./browser-storage";

/*
 * The barrel is what the rest of the app imports -- see
 * docs/codebase-structure.md: a vertical is reached through its folder, never
 * by naming a file inside it.
 */

describe("what browser storage offers the rest of the app", () => {
  it("offers reading, writing and forgetting, and nothing else", () => {
    expect(Object.keys(browserStorage).toSorted()).toEqual([
      "read",
      "remove",
      "write",
    ]);
  });

  it("offers the functions themselves rather than copies of them", () => {
    expect(browserStorage.read).toBe(read);
    expect(browserStorage.write).toBe(write);
    expect(browserStorage.remove).toBe(remove);
  });
});
