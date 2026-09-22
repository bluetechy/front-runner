import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import {
  Notification,
  NotificationCounts,
  NotificationFilter,
} from "./notifications.model.js";

/*
 * What a notification is, and what the three numbers beside it are.
 *
 * The read/unread question is one column: `ReadAt` is null or it is a
 * timestamp. There is deliberately no `IsRead` next to it, because one column
 * cannot disagree with itself.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

describe("the notification a caller reads", () => {
  it.each([
    ["NotificationUUID", String],
    ["OrganizationUUID", String],
    ["NotificationType", String],
    ["Message", String],
    ["CreatedAt", Date],
  ])("exposes %s", (field, type) => {
    expect(typeOf(Notification.prototype, field)).toBe(type);
  });

  // Null wherever nobody did it: a task falls overdue on its own, a level is
  // reached by the person being told, an update ships. Both actor fields are
  // null together.
  it.each(["TaskUUID", "ActorUUID", "ActorName", "ReadAt"])(
    "leaves %s nullable",
    (field) => {
      expect(typeOf(Notification.prototype, field)).toBe(Object);
    },
  );

  it("says whether it has been read in one column, not two", () => {
    expect(typeOf(Notification.prototype, "IsRead")).toBeUndefined();
  });
});

describe("how many there are", () => {
  it.each(["All", "Unread", "Read"])("counts %s", (field) => {
    expect(typeOf(NotificationCounts.prototype, field)).toBe(Number);
  });
});

describe("which notifications to hand back", () => {
  // Three answers, not a boolean: "all of them" is its own answer and not the
  // absence of the other two.
  it("offers all of them, the read, and the unread", () => {
    expect(Object.values(NotificationFilter)).toEqual([
      "All",
      "Read",
      "Unread",
    ]);
  });
});
