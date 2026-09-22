import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { NotificationFilter } from "./notifications.model.js";
import { NotificationsResolver } from "./notifications.resolver.js";
import { NotificationsService } from "./notifications.service.js";

/*
 * Your own bell and nobody else's: not one of these four takes a user, so
 * there is no way to ask for somebody else's notifications and no
 * authorization question beyond being signed in.
 *
 * The counts are a separate query on purpose. The badge and the filter tabs
 * count every notification there is, not the ones in the page on screen.
 */

const user = { userId: "user-id", loginName: "alice" };
const page = { limit: 50, offset: 0 };

function setup() {
  const service = {
    list: jest.fn().mockReturnValue(["a notification"]),
    counts: jest.fn().mockReturnValue({ All: 3, Unread: 1, Read: 2 }),
    markRead: jest.fn().mockReturnValue("a read notification"),
    markAllRead: jest.fn().mockReturnValue(4),
  };
  return {
    service,
    resolver: new NotificationsResolver(
      service as unknown as NotificationsService,
    ),
  };
}

describe("reading the bell", () => {
  it("lists the caller's own notifications, filtered and paged", () => {
    const { resolver, service } = setup();

    expect(
      resolver.notifications(user, NotificationFilter.Unread, page),
    ).toEqual(["a notification"]);
    expect(service.list).toHaveBeenCalledWith(
      "alice",
      NotificationFilter.Unread,
      page,
    );
  });

  it("counts the caller's own notifications, all three ways at once", () => {
    const { resolver, service } = setup();

    expect(resolver.notificationCounts(user)).toEqual({
      All: 3,
      Unread: 1,
      Read: 2,
    });
    expect(service.counts).toHaveBeenCalledWith("alice");
  });
});

describe("marking notifications read", () => {
  it("marks one, as the caller", () => {
    const { resolver, service } = setup();

    resolver.markNotificationRead(user, "notification-id");

    expect(service.markRead).toHaveBeenCalledWith("alice", "notification-id");
  });

  // How many were marked. Zero is an ordinary answer: the button is there
  // whether or not there is anything to do.
  it("marks all of them and says how many that was", () => {
    const { resolver, service } = setup();

    expect(resolver.markAllNotificationsRead(user)).toBe(4);
    expect(service.markAllRead).toHaveBeenCalledWith("alice");
  });
});
