import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as badges from "./index.js";
import { BadgesModule } from "./badges.module.js";

/*
 * The barrel is this vertical's public surface -- see
 * docs/design-decisions.md and scripts/check-boundaries.mjs, which refuses an
 * import that reaches past it. What it offers is therefore worth stating
 * once, here, rather than discovered by whoever adds the next export.
 */

describe("what the badges vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(badges).toSorted()).toEqual(["BadgesModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(badges.BadgesModule).toBe(BadgesModule);
  });
});
