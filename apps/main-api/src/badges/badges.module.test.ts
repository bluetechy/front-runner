import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { BadgesModule } from "./badges.module.js";
import { BadgesResolver } from "./badges.resolver.js";
import { BadgesService } from "./badges.service.js";

/*
 * A module is its wiring and nothing else, so its wiring is what is asserted.
 * Nest keeps it as metadata under the same four keys the decorator takes.
 */

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, BadgesModule) ?? [];

describe("how the badges vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([BadgesResolver, BadgesService]);
  });

  // A feature vertical is reached through the schema, never by another
  // vertical injecting its service.
  it("exports nothing", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
