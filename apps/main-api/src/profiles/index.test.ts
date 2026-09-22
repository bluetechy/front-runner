import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as profiles from "./index.js";
import { ProfilesModule } from "./profiles.module.js";

describe("what the profiles vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(profiles).toSorted()).toEqual(["ProfilesModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(profiles.ProfilesModule).toBe(ProfilesModule);
  });
});
