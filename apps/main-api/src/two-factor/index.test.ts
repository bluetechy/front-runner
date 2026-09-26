import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as twoFactor from "./index.js";
import { TwoFactorModule } from "./two-factor.module.js";

/*
 * What this vertical offers the rest of the API: its module, and nothing else.
 *
 * The service is deliberately absent, and more deliberately here than
 * anywhere. Nothing in this API has a reason to take somebody's second factor
 * off on their behalf, and an exported service that could would be a way to do
 * it without the page that asks first and the security log that records it.
 */

describe("what two-factor authentication offers the rest of the API", () => {
  it("offers its module and nothing else", () => {
    expect(Object.keys(twoFactor).toSorted()).toEqual(["TwoFactorModule"]);
  });

  it("offers the thing itself rather than a copy of it", () => {
    expect(twoFactor.TwoFactorModule).toBe(TwoFactorModule);
  });
});
