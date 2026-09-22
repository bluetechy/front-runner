import { describe, expect, it } from "vitest";
import { Dashboard } from "../dashboard";
import { Route } from "./_app.dashboard";

/*
 * /dashboard — where a completed sign-in lands.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that
 * it is that vertical's own rather than a copy of it.
 */

describe("/dashboard", () => {
  it("renders Dashboard, and nothing of its own", () => {
    expect(Route.options.component).toBe(Dashboard);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
