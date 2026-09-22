import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as organizations from "./index.js";
import { OrganizationsModule } from "./organizations.module.js";

describe("what the organizations vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(organizations).toSorted()).toEqual([
      "OrganizationsModule",
    ]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(organizations.OrganizationsModule).toBe(OrganizationsModule);
  });
});
