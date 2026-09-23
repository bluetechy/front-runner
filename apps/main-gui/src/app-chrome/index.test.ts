import { describe, expect, it } from "vitest";
import * as appChrome from "./index";
import { AppShell } from "./app-shell";
import { RAIL_WIDTH } from "./app-sidebar";

/*
 * The shell, and how wide the rail is. The rail and the bar themselves are
 * how the shell is built -- a route renders the shell, and nothing renders
 * half of it.
 *
 * The width is out here because something that is *not* in this shell has to
 * dodge the rail: the cookie pill is fixed to the bottom left corner of the
 * window, which behind the login is the rail's corner. One number, exported,
 * rather than a second 258 in another vertical waiting to disagree with this
 * one.
 */

describe("what the app chrome offers the rest of the app", () => {
  it("offers the shell and the width of the rail, and nothing else", () => {
    expect(Object.keys(appChrome).toSorted()).toEqual([
      "AppShell",
      "RAIL_WIDTH",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(appChrome.AppShell).toBe(AppShell);
    expect(appChrome.RAIL_WIDTH).toBe(RAIL_WIDTH);
  });

  it("gives the rail a width in pixels, so a caller can step past it", () => {
    expect(appChrome.RAIL_WIDTH).toBeGreaterThan(0);
  });
});
