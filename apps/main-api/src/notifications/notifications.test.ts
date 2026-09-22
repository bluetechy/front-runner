import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { NotificationFilter } from "./notifications.model.js";
import { NotificationsService } from "./notifications.service.js";

const NOTIFICATION = "2b000000-0000-4000-8000-000000000009";
const PAGE = { limit: 12, offset: 0 };

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new NotificationsService({ query } as unknown as DatabaseService),
  };
}

/* The SQL a call was made with, with its whitespace flattened, so a test can
 * say what is in a clause without pinning how the string is wrapped. */
const sqlOf = (query: jest.Mock<DatabaseService["query"]>, call = 0) =>
  String(query.mock.calls[call]?.[0]).replace(/\s+/g, " ");

describe("the notifications a caller may read and mark", () => {
  it("asks the database for the signed-in account's notifications", async () => {
    const { service, query } = setup([]);
    await service.list("member", NotificationFilter.All, PAGE);
    expect(sqlOf(query)).toContain('"GetNotifications"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", 12, 0]);
  });

  /* The filter is keyed by the enum rather than built from what arrived, so
   * the only three predicates that can reach the database are the three
   * written in the service. */
  it("asks for all, read or unread, and nothing else", async () => {
    const { service, query } = setup([]);
    await service.list("member", NotificationFilter.All, PAGE);
    expect(sqlOf(query, 0)).not.toContain("ReadAt");

    await service.list("member", NotificationFilter.Unread, PAGE);
    expect(sqlOf(query, 1)).toContain('"ReadAt" IS NULL');

    await service.list("member", NotificationFilter.Read, PAGE);
    expect(sqlOf(query, 2)).toContain('"ReadAt" IS NOT NULL');
  });

  /* A page boundary lands in the middle of this list, so an unstable sort
   * would show one row twice and skip another. */
  it("orders every page the same way, down to the tie-break", async () => {
    const { service, query } = setup([]);
    await service.list("member", NotificationFilter.All, {
      limit: 12,
      offset: 24,
    });
    expect(sqlOf(query)).toContain(
      'ORDER BY "Notifications"."CreatedAt" DESC, "Notifications"."NotificationUUID"',
    );
    expect(query.mock.calls[0]?.[1]).toEqual(["member", 12, 24]);
  });

  /* The badge and the filter tabs count every notification, not the ones in
   * the page on screen -- which is the whole reason this is its own read. */
  it("counts in the database rather than in a page", async () => {
    const counts = { All: 33, Unread: 6, Read: 27 };
    const { service, query } = setup([counts]);
    expect(await service.counts("member")).toEqual(counts);
    expect(sqlOf(query)).toContain("count(*)::int");
    expect(sqlOf(query)).not.toContain("LIMIT");
  });

  /* All three in one pass, so the tab that says "Unread 6" and the badge that
   * says 6 cannot have been counted at different moments. */
  it("counts all three in one read", async () => {
    const { service, query } = setup([{ All: 1, Unread: 1, Read: 0 }]);
    await service.counts("member");
    expect(query).toHaveBeenCalledTimes(1);
    expect(sqlOf(query)).toContain(
      'FILTER (WHERE "Notifications"."ReadAt" IS NULL)',
    );
    expect(sqlOf(query)).toContain(
      'FILTER (WHERE "Notifications"."ReadAt" IS NOT NULL)',
    );
  });

  /* Three noughts rather than no answer: the page draws its tabs from this
   * before it knows whether there is anything to put under them. */
  it("counts nought for an account with nothing to see", async () => {
    const { service } = setup([]);
    expect(await service.counts("member")).toEqual({
      All: 0,
      Unread: 0,
      Read: 0,
    });
  });

  /* The row that changed, not the list: the caller is holding a page of it. */
  it("marks one notification read and answers with that row", async () => {
    const row = { NotificationUUID: NOTIFICATION };
    const { service, query } = setup([row]);
    expect(await service.markRead("member", NOTIFICATION)).toEqual(row);
    expect(sqlOf(query)).toContain('"MarkNotificationRead"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", NOTIFICATION]);
  });

  it("answers with nothing when the notification is already gone", async () => {
    const { service } = setup([]);
    expect(await service.markRead("member", NOTIFICATION)).toBeNull();
  });

  it("marks every unread notification read and answers with how many", async () => {
    const { service, query } = setup([{ MarkAllNotificationsRead: 6 }]);
    expect(await service.markAllRead("member")).toBe(6);
    expect(sqlOf(query)).toContain('"MarkAllNotificationsRead"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member"]);
  });

  it("answers nought when there was nothing to mark", async () => {
    const { service } = setup([]);
    expect(await service.markAllRead("member")).toBe(0);
  });

  // The login name is the token's, so a caller cannot reach into somebody
  // else's bell by naming a notification in it.
  it("acts on the notifications of the caller the token names", async () => {
    const { service, query } = setup([]);
    await service.list("member", NotificationFilter.All, PAGE);
    await service.counts("member");
    await service.markRead("member", NOTIFICATION);
    await service.markAllRead("member");
    for (const call of query.mock.calls) expect(call[1]?.[0]).toBe("member");
  });
});
