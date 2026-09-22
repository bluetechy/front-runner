import { describe, expect, it } from "vitest";
import * as logo from "./index";
import { Logo } from "./logo";

/*
 * One export on purpose. The wordmark, the face it is set in, the fade it is
 * painted with and whether the mark is drawn at all are all inside the
 * component: a caller that could reach any of them separately is a caller
 * that can draw a second logo.
 */

describe("what the logo offers the rest of the app", () => {
  it("offers the logo, and nothing else", () => {
    expect(Object.keys(logo).toSorted()).toEqual(["Logo"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(logo.Logo).toBe(Logo);
  });
});
