import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as registration from "./index.js";
import { RegistrationModule } from "./registration.module.js";

describe("what the registration vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(registration).toSorted()).toEqual([
      "RegistrationModule",
    ]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(registration.RegistrationModule).toBe(RegistrationModule);
  });
});
