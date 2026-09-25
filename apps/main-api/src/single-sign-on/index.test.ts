import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as singleSignOn from "./index.js";
import { SingleSignOnModule } from "./single-sign-on.module.js";

/*
 * What this vertical offers the rest of the API: its module, and nothing else.
 *
 * The service is deliberately absent. Nothing anywhere has a reason to
 * disconnect somebody's Google on their behalf, and an exported service that
 * could would be a way to do it without the page that asks first.
 */

describe("what single sign-on offers the rest of the API", () => {
  it("offers its module and nothing else", () => {
    expect(Object.keys(singleSignOn).toSorted()).toEqual([
      "SingleSignOnModule",
    ]);
  });

  it("offers the thing itself rather than a copy of it", () => {
    expect(singleSignOn.SingleSignOnModule).toBe(SingleSignOnModule);
  });
});
