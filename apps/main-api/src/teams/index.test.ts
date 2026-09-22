import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as teams from "./index.js";
import { TeamsModule } from "./teams.module.js";

describe("what the teams vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(teams).toSorted()).toEqual(["TeamsModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(teams.TeamsModule).toBe(TeamsModule);
  });
});
