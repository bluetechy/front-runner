import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { TeamsModule } from "./teams.module.js";
import { TeamsResolver } from "./teams.resolver.js";
import { TeamsService } from "./teams.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, TeamsModule) ?? [];

describe("how the teams vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([TeamsResolver, TeamsService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
