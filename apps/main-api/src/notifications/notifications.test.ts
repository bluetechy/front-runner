import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { NotificationsService } from "./notifications.service.js";

const NOTIFICATION = "2b000000-0000-4000-8000-000000000009";

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new NotificationsService({ query } as unknown as DatabaseService),
  };
}

describe("the notifications a caller may read and mark", () => {
  it("asks the database for the signed-in account's notifications", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetNotifications"'),
      ["member"],
    );
  });

  // The badge on the bell counts the unread ones in what this returns, so a
  // row limit here would be a count that is quietly wrong. dbo.GetNotifications
  // takes one; this is the test that notices if somebody starts passing it.
  it("asks for every notification rather than a page of them", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(query.mock.calls[0]?.[1]).toEqual(["member"]);
  });

  it("marks one notification read", async () => {
    const { service, query } = setup([]);
    await service.markRead("member", NOTIFICATION);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"MarkNotificationRead"'),
      ["member", NOTIFICATION],
    );
  });

  it("marks every unread notification read in one call", async () => {
    const { service, query } = setup([]);
    await service.markAllRead("member");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"MarkAllNotificationsRead"'),
      ["member"],
    );
  });

  // The login name is the token's, so a caller cannot reach into somebody
  // else's bell by naming a notification in it.
  it("acts on the notifications of the caller the token names", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    await service.markRead("member", NOTIFICATION);
    await service.markAllRead("member");
    for (const call of query.mock.calls) expect(call[1]?.[0]).toBe("member");
  });

  // Every one of the three answers with the whole list, so the menu and its
  // count are replaced rather than patched.
  it("answers each call with the whole list", async () => {
    const rows = [{ NotificationUUID: NOTIFICATION }];
    const { service } = setup(rows);
    expect(await service.list("member")).toEqual(rows);
    expect(await service.markRead("member", NOTIFICATION)).toEqual(rows);
    expect(await service.markAllRead("member")).toEqual(rows);
  });
});
