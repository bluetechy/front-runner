import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as database from "./index.js";
import { DatabaseModule } from "./database.module.js";
import { DatabaseService } from "./database.service.js";

/*
 * Both the module and the service, unlike every feature vertical: a vertical
 * imports the module to be wired and injects the service to read through, so
 * both are public here.
 */

describe("what the database offers the rest of the API", () => {
  it("offers its module and its service", () => {
    expect(Object.keys(database).toSorted()).toEqual([
      "DatabaseModule",
      "DatabaseService",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(database.DatabaseModule).toBe(DatabaseModule);
    expect(database.DatabaseService).toBe(DatabaseService);
  });
});
