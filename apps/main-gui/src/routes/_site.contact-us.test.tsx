import { describe, expect, it } from "vitest";
import { Contact } from "../contact";
import { Route } from "./_site.contact-us";

/*
 * /contact-us: the three ways to reach us, and the form under them. It used
 * to render the `coming-soon` placeholder, and it used to be at /contact.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that it
 * is that vertical's own rather than a copy of it.
 */

describe("/contact-us", () => {
  it("renders Contact, and nothing of its own", () => {
    expect(Route.options.component).toBe(Contact);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
