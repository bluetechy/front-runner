import { describe, expect, it } from "vitest";
import { Wallet } from "../wallet";
import { Route } from "./_app.wallet";

/*
 * /wallet — the saved payment methods.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * the whole of what this route promises is which component it is, and that
 * it is that vertical's own rather than a copy of it.
 */

describe("/wallet", () => {
  it("renders Wallet, and nothing of its own", () => {
    expect(Route.options.component).toBe(Wallet);
  });

  it("does nothing else on the way there", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});
