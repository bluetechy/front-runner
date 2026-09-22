import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as users from "./index.js";
import { UsersModule } from "./users.module.js";

describe("what the users vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(users).toSorted()).toEqual(["UsersModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(users.UsersModule).toBe(UsersModule);
  });
});
