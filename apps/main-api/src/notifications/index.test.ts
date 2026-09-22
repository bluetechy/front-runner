import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as notifications from "./index.js";
import { NotificationsModule } from "./notifications.module.js";

describe("what the notifications vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(notifications).toSorted()).toEqual([
      "NotificationsModule",
    ]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(notifications.NotificationsModule).toBe(NotificationsModule);
  });
});
