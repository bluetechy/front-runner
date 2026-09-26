import { describe, expect, it } from "vitest";
import { WidgetStudio } from "../widget-studio";
import { Route } from "./_app.widgets";

/*
 * /widgets -- the widget studio.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So the
 * whole of what this route promises is which component it is, and that it is
 * that vertical's own rather than a copy of it.
 */

describe("/widgets", () => {
  it("renders WidgetStudio, and nothing of its own", () => {
    expect(Route.options.component).toBe(WidgetStudio);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
