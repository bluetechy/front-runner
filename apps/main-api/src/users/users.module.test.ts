import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { UsersModule } from "./users.module.js";
import { UsersResolver } from "./users.resolver.js";
import { UsersService } from "./users.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, UsersModule) ?? [];

describe("how the users vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  it("provides the resolver and the service behind it", () => {
    expect(wiring("providers")).toEqual([UsersResolver, UsersService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
