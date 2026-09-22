import { describe, expect, it } from "vitest";
import { NotificationsPage } from "../notifications";
import { Route } from "./_app.notifications";

/*
 * /notifications — the notifications page, which is the bell given a page's worth of room.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that
 * it is that vertical's own rather than a copy of it.
 */

describe("/notifications", () => {
  it("renders NotificationsPage, and nothing of its own", () => {
    expect(Route.options.component).toBe(NotificationsPage);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
