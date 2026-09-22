import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as configuration from "./index.js";
import { ConfigurationModule } from "./configuration.module.js";

/*
 * The validator is deliberately not exported: it is run by the module at
 * boot, and a second caller running it again would be a second opinion about
 * what the environment says.
 */

describe("what configuration offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(configuration).toSorted()).toEqual([
      "ConfigurationModule",
    ]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(configuration.ConfigurationModule).toBe(ConfigurationModule);
  });
});
