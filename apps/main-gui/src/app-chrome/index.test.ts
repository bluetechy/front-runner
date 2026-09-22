import { describe, expect, it } from "vitest";
import * as appChrome from "./index";
import { AppShell } from "./app-shell";

/*
 * One export: the shell. The rail and the bar are how the shell is built --
 * a route renders the shell, and nothing renders half of it.
 */

describe("what the app chrome offers the rest of the app", () => {
  it("offers the shell, and nothing else", () => {
    expect(Object.keys(appChrome).toSorted()).toEqual(["AppShell"]);
  });

  it("offers it itself rather than a copy of it", () => {
    expect(appChrome.AppShell).toBe(AppShell);
  });
});
