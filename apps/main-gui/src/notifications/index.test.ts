import { describe, expect, it } from "vitest";
import * as notifications from "./index";
import { NotificationMenu } from "./notification-menu";
import { NotificationsPage } from "./notifications-page";
import {
  isUnread,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationCounts,
  useNotifications,
} from "./notifications-api";

/*
 * The two places notifications are shown, and the API behind both.
 *
 * `NotificationRow`, `NotificationItem`, `NotificationFace`, `kindOf` and the
 * rest are deliberately absent: they are how this vertical draws itself, and
 * a caller reaching for one would be drawing a notification somewhere this
 * vertical does not know about. `Notification`, `NotificationCounts` and
 * `NotificationFilter` are types and leave nothing behind at runtime.
 */

describe("what notifications offer the rest of the app", () => {
  it("offers the two places they are shown, and the API behind both", () => {
    expect(Object.keys(notifications).toSorted()).toEqual([
      "NotificationMenu",
      "NotificationsPage",
      "isUnread",
      "useMarkAllNotificationsRead",
      "useMarkNotificationRead",
      "useNotificationCounts",
      "useNotifications",
    ]);
  });

  it("offers the things themselves rather than copies of them", () => {
    expect(notifications.NotificationMenu).toBe(NotificationMenu);
    expect(notifications.NotificationsPage).toBe(NotificationsPage);
    expect(notifications.isUnread).toBe(isUnread);
    expect(notifications.useNotifications).toBe(useNotifications);
    expect(notifications.useNotificationCounts).toBe(useNotificationCounts);
    expect(notifications.useMarkNotificationRead).toBe(useMarkNotificationRead);
    expect(notifications.useMarkAllNotificationsRead).toBe(
      useMarkAllNotificationsRead,
    );
  });

  it("keeps how a notification is drawn to itself", () => {
    for (const drawing of [
      "NotificationRow",
      "NotificationItem",
      "NotificationFace",
      "NotificationFilters",
      "MorePlease",
      "kindOf",
      "relativeTime",
    ])
      expect(Object.keys(notifications)).not.toContain(drawing);
  });
});
