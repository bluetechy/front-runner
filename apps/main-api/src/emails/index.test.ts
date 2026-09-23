import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as emails from "./index.js";
import { EmailsModule } from "./emails.module.js";

describe("what the emails vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(emails).toSorted()).toEqual(["EmailsModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(emails.EmailsModule).toBe(EmailsModule);
  });
});
