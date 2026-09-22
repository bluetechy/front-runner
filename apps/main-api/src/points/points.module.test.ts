import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { PointsModule } from "./points.module.js";
import { PointsResolver } from "./points.resolver.js";
import { PointsService } from "./points.service.js";

/* A module is its wiring, so its wiring is what is asserted. */

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, PointsModule) ?? [];

describe("how the points vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([PointsResolver, PointsService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
