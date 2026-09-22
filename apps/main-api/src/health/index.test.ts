import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as health from "./index.js";
import { HealthModule } from "./health.module.js";

/*
 * The controller is deliberately not exported, and is not even exported from
 * its own file: the two probes are reached over HTTP, by whatever is watching
 * this process, and by nothing inside it.
 */

describe("what health offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(health).toSorted()).toEqual(["HealthModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(health.HealthModule).toBe(HealthModule);
  });
});
