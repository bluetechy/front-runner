import { describe, expect, it } from "vitest";
import { Security } from "../security";
import { Route } from "./_app.security-and-access";

/*
 * /security-and-access, which is Security & Access in the rail.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * what is asserted is the one thing: that this URL leads to the security page
 * and not to anything else. The page's own behavior is tested beside it, in
 * `security/security.test.tsx`.
 *
 * This route rendered the "coming soon" placeholder until the email addresses
 * went in.
 */

describe("/security-and-access", () => {
  it("renders the security page", () => {
    expect(Route.options.component).toBe(Security);
  });
});
