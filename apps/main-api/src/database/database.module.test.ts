import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "./database.module.js";
import { DatabaseService } from "./database.service.js";

/*
 * One pool, shared. The service is provided and exported by the same module,
 * and every vertical imports that module rather than building a pool of its
 * own -- which is what keeps POSTGRES_POOL_SIZE a number about this process
 * rather than about each feature in it.
 */

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, DatabaseModule) ?? [];

describe("how the database is wired", () => {
  it("provides the one adapter", () => {
    expect(wiring("providers")).toEqual([DatabaseService]);
  });

  it("exports it, because every vertical reads through it", () => {
    expect(wiring("exports")).toEqual([DatabaseService]);
  });

  it("imports nothing: it is the bottom of the stack", () => {
    expect(wiring("imports")).toEqual([]);
  });
});
