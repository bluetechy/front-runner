import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { TalliesModule } from "./tallies.module.js";
import { TalliesResolver } from "./tallies.resolver.js";
import { TalliesService } from "./tallies.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, TalliesModule) ?? [];

describe("how the tallies vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([TalliesResolver, TalliesService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
