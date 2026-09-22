import { describe, expect, it } from "vitest";
import * as siteChrome from "./index";
import { PageShell } from "./page-shell";
import { SiteHeader } from "./site-header";

/*
 * The shell the marketing pages render inside, and the header in it. The
 * header is exported as well as the shell because the shell is what a route
 * uses and the header is what a test of one control reaches for.
 */

describe("what the site chrome offers the rest of the app", () => {
  it("offers the shell and the header", () => {
    expect(Object.keys(siteChrome).toSorted()).toEqual([
      "PageShell",
      "SiteHeader",
    ]);
  });

  it("offers them themselves rather than copies of them", () => {
    expect(siteChrome.PageShell).toBe(PageShell);
    expect(siteChrome.SiteHeader).toBe(SiteHeader);
  });
});
