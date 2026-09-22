import { describe, expect, it } from "vitest";
import * as designSystem from "./index";
import { theme } from "./theme";

/*
 * One MUI theme and nothing else. `design-system/` is the only thing every
 * other vertical may depend on, which is only safe while there is nothing in
 * it to depend on but the theme -- see docs/codebase-structure.md.
 */

describe("what the design system offers the rest of the app", () => {
  it("offers the theme, and nothing else", () => {
    expect(Object.keys(designSystem).toSorted()).toEqual(["theme"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(designSystem.theme).toBe(theme);
  });
});
