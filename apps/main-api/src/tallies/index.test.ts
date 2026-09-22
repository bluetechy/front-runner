import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as tallies from "./index.js";
import { TalliesModule } from "./tallies.module.js";

describe("what the tallies vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(tallies).toSorted()).toEqual(["TalliesModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(tallies.TalliesModule).toBe(TalliesModule);
  });
});
