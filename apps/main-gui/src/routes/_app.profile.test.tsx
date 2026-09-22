import { describe, expect, it } from "vitest";
import { Profile } from "../profile";
import { Route } from "./_app.profile";

/*
 * /profile — the profile page, and the form that edits it.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that
 * it is that vertical's own rather than a copy of it.
 */

describe("/profile", () => {
  it("renders Profile, and nothing of its own", () => {
    expect(Route.options.component).toBe(Profile);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
