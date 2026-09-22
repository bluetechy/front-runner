import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as points from "./index.js";
import { PointsModule } from "./points.module.js";

/* The barrel is this vertical's public surface, and the boundary check
 * refuses any import that reaches past it. */

describe("what the points vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(points).toSorted()).toEqual(["PointsModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(points.PointsModule).toBe(PointsModule);
  });
});
