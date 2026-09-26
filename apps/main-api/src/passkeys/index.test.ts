import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as passkeys from "./index.js";
import { PasskeysModule } from "./passkeys.module.js";

/*
 * What this vertical offers the rest of the API: its module, and nothing
 * else.
 *
 * The service is deliberately absent, on the terms the two-factor one is.
 * Nothing in this API has a reason to take somebody's passkey off on their
 * behalf, and an exported service that could would be a way to do it without
 * the page that asks first and the security log that writes it down.
 */

describe("what passkeys offer the rest of the API", () => {
  it("offers its module and nothing else", () => {
    expect(Object.keys(passkeys).toSorted()).toEqual(["PasskeysModule"]);
  });

  it("offers the thing itself rather than a copy of it", () => {
    expect(passkeys.PasskeysModule).toBe(PasskeysModule);
  });
});
