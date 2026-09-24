import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { PasswordResetService } from "../password-reset/index.js";
import { SecurityEventsService } from "./security-events.service.js";

const EVENT = "2d000000-0000-4000-8000-000000000001";

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  const request = jest
    .fn<PasswordResetService["request"]>()
    .mockResolvedValue({ Identifier: "member" });
  return {
    query,
    request,
    service: new SecurityEventsService(
      { query } as unknown as DatabaseService,
      { request } as unknown as PasswordResetService,
    ),
  };
}

const sqlOf = (query: jest.Mock<DatabaseService["query"]>, call = 0) =>
  String(query.mock.calls[call]?.[0]).replace(/\s+/g, " ");

describe("the security log a caller may read and answer", () => {
  it("asks the database for the signed-in account's own log", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(sqlOf(query)).toContain('"GetSecurityEvents"');
    expect(query.mock.calls[0]?.[1]?.[0]).toBe("member");
  });

  /* "Recent" is a cap rather than a window, and it is applied in the database
   * rather than in the browser: the page shows everything it is handed. */
  it("asks for a capped list rather than the whole log", async () => {
    const { service, query } = setup([]);
    await service.list("member");
    expect(query.mock.calls[0]?.[1]?.[1]).toBe(20);
  });

  it("records an answer and hands back the list it belongs to", async () => {
    const rows = [{ SecurityEventUUID: EVENT }];
    const { service, query } = setup(rows);
    expect(await service.review("member", EVENT, true)).toEqual(rows);
    expect(sqlOf(query)).toContain('"ReviewSecurityEvent"');
    expect(query.mock.calls[0]?.[1]).toEqual(["member", EVENT, true, 20]);
  });

  /* "Yes, it was me" is not an incident, so nothing else happens. */
  it("sends nothing to somebody who recognized the activity", async () => {
    const { service, request } = setup([]);
    await service.review("member", EVENT, true);
    expect(request).not.toHaveBeenCalled();
  });

  /* A button reading "No, secure account" that only wrote a row would agree
   * with the person and do nothing. A new password is the one act that ends a
   * session somebody else is holding. */
  it("sends a password reset link to somebody who did not", async () => {
    const { service, request } = setup([]);
    await service.review("member", EVENT, false);
    expect(request).toHaveBeenCalledWith("member");
  });

  /* The answer is the more important of the two, and it is already written by
   * the time the message is attempted. */
  it("records the answer before the link is sent", async () => {
    const { service, query, request } = setup([]);
    await service.review("member", EVENT, false);
    expect(query.mock.invocationCallOrder[0]).toBeLessThan(
      request.mock.invocationCallOrder[0] as number,
    );
  });

  it("records an event against the account that caused it", async () => {
    const { service, query } = setup([]);
    await service.record(
      "member",
      "EmailAdded",
      "work@example.test was added.",
    );
    expect(sqlOf(query)).toContain('"LogSecurityEvent"');
    expect(query.mock.calls[0]?.[1]).toEqual([
      "member",
      "EmailAdded",
      "work@example.test was added.",
      null,
      null,
    ]);
  });

  it("passes a device and a place through when there is one", async () => {
    const { service, query } = setup([]);
    await service.record(
      "member",
      "LoginSucceeded",
      "New login on Mac OS.",
      "Mac OS",
      "Utah, USA",
    );
    expect(query.mock.calls[0]?.[1]?.slice(3)).toEqual(["Mac OS", "Utah, USA"]);
  });

  /* The one swallowed failure in this API, and the reason is that this runs
   * after the thing it describes already happened: an address that is on file
   * must not be reported as one that was refused because a log write failed. */
  it("does not fail the thing it was recording", async () => {
    const { service, query } = setup([]);
    query.mockRejectedValueOnce(new Error("the database fell over"));
    await expect(
      service.record("member", "EmailAdded", "work@example.test was added."),
    ).resolves.toBeUndefined();
  });
});

/*
 * The failed login, which is the odd one: it never reached this API at all, so
 * it arrives named by subject and stamped by somebody else's clock.
 */
describe("what a refused login writes", () => {
  it("records it against the subject the provider named", async () => {
    const refused = new Date("2026-09-20T21:42:00.000Z");
    const { service, query } = setup([]);

    await service.recordLoginFailure(
      "subject-member",
      "Someone tried to log in with the wrong password.",
      refused,
    );

    expect(sqlOf(query)).toContain('"LogLoginFailure"');
    expect(query.mock.calls[0]?.[1]).toEqual([
      "subject-member",
      "Someone tried to log in with the wrong password.",
      refused,
    ]);
  });

  /* The exception to the swallowing above, and the reason the sweep is safe to
   * retry: a caller keeping a high-water mark that was told a write succeeded
   * would move the mark past a row nobody wrote. */
  it("lets a failed write through, unlike every other record here", async () => {
    const { service, query } = setup([]);
    query.mockRejectedValueOnce(new Error("the database fell over"));

    await expect(
      service.recordLoginFailure(
        "subject-member",
        "A login attempt failed.",
        new Date(),
      ),
    ).rejects.toThrow();
  });

  it("reads back the newest failure already on record", async () => {
    const newest = new Date("2026-09-20T21:42:00.000Z");
    const { service, query } = setup([{ OccurredAt: newest }]);

    expect(await service.newestLoginFailure()).toBe(newest);
    expect(sqlOf(query)).toContain('max("OccurredAt")');
    expect(query.mock.calls[0]?.[1]).toEqual(["LoginFailed"]);
  });

  /* A first run, and the case the aggregate answers a row of NULL for. */
  it("says nothing is on record rather than answering a row of nothing", async () => {
    const { service } = setup([{ OccurredAt: null }]);

    expect(await service.newestLoginFailure()).toBeNull();
  });
});
