import { describe, expect, it } from "vitest";
import { Pricing } from "../pricing";
import { Route } from "./_site.pricing";

/*
 * /pricing — the plans, and the questions people ask about them.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that
 * it is that vertical's own rather than a copy of it.
 */

describe("/pricing", () => {
  it("renders Pricing, and nothing of its own", () => {
    expect(Route.options.component).toBe(Pricing);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
