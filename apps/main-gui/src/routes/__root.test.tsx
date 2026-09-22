import { Outlet } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { Route } from "./__root";

/*
 * The root, which is an outlet and nothing else.
 *
 * There are two shells under it and they never appear together: `_site`
 * wraps the marketing pages in the header and the field, `_app` wraps the
 * application in the rail and the top bar. Putting either of them here would
 * put both on every page.
 */

describe("the root route", () => {
  it("is an outlet and nothing else", () => {
    expect(Route.options.component).toBe(Outlet);
  });

  // No provider, no shell, no guard: everything that wraps a page belongs to
  // the half of the product it wraps.
  it("wraps nothing around it", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
