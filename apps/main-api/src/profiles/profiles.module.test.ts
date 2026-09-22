import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { ProfilesModule } from "./profiles.module.js";
import { ProfilesResolver } from "./profiles.resolver.js";
import { ProfilesService } from "./profiles.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, ProfilesModule) ?? [];

describe("how the profiles vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([ProfilesResolver, ProfilesService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
