import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { SecurityEventsResolver } from "./security-events.resolver.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * Your own security log and nobody else's. Neither operation takes a user: the
 * login name comes off the verified token, so there is no way to read another
 * account's logins or to answer a question that was asked of somebody else.
 */

/* A whole Principal. The session and the device on it are not decoration here:
 * recordLogout is built entirely out of them, which is what lets it take no
 * arguments at all. */
const user = {
  userId: "user-id",
  loginName: "alice",
  sessionId: "session-id",
  device: "Mac OS",
};
const EVENT = "2d000000-0000-4000-8000-000000000001";

function setup() {
  const service = {
    list: jest.fn().mockReturnValue(["an event"]),
    review: jest.fn().mockReturnValue(["the list"]),
    recordLogout: jest
      .fn<SecurityEventsService["recordLogout"]>()
      .mockResolvedValue(undefined),
  };
  return {
    service,
    resolver: new SecurityEventsResolver(
      service as unknown as SecurityEventsService,
    ),
  };
}

describe("reading the security log", () => {
  it("lists the caller's own events", () => {
    const { resolver, service } = setup();

    expect(resolver.securityEvents(user)).toEqual(["an event"]);
    expect(service.list).toHaveBeenCalledWith("alice");
  });
});

describe("answering for one of them", () => {
  it("records that the caller recognized it", () => {
    const { resolver, service } = setup();

    resolver.reviewSecurityEvent(user, EVENT, true);

    expect(service.review).toHaveBeenCalledWith("alice", EVENT, true);
  });

  it("records that the caller did not", () => {
    const { resolver, service } = setup();

    resolver.reviewSecurityEvent(user, EVENT, false);

    expect(service.review).toHaveBeenCalledWith("alice", EVENT, false);
  });

  /* The whole list, because saying no writes a second event as well as
   * answering the first: the row that changed is not the only thing that
   * moved. */
  it("answers with the list rather than the row", () => {
    const { resolver } = setup();

    expect(resolver.reviewSecurityEvent(user, EVENT, false)).toEqual([
      "the list",
    ]);
  });
});

describe("saying this session is over", () => {
  /* The device comes off the request and the session off the token, so the page
   * can say "You logged out on Mac OS." the way it says "New login on Mac OS."
   * above it. */
  it("records the logout against the session on the token", async () => {
    const { resolver, service } = setup();

    await expect(resolver.recordLogout(user)).resolves.toBe(true);

    expect(service.recordLogout).toHaveBeenCalledWith(
      "session-id",
      "You logged out on Mac OS.",
      "Mac OS",
    );
  });

  it("says only that they logged out when the request named no device", async () => {
    const { resolver, service } = setup();

    await resolver.recordLogout({ ...user, device: null });

    expect(service.recordLogout).toHaveBeenCalledWith(
      "session-id",
      "You logged out.",
      undefined,
    );
  });

  /* **This is the whole of the operation's access control.** There is no
   * argument to name a session with, so there is no way to end somebody else's
   * and no way to post a logout for a session that was never yours. */
  it("takes nothing from the caller but the token they arrived with", () => {
    const { resolver } = setup();

    expect(resolver.recordLogout).toHaveLength(1);
  });

  /* A service account's token carries no session, so there is nothing to end.
   * Answering false is more honest than writing against a null. */
  it("writes nothing for a token with no session", async () => {
    const { resolver, service } = setup();

    await expect(
      resolver.recordLogout({ ...user, sessionId: null }),
    ).resolves.toBe(false);

    expect(service.recordLogout).not.toHaveBeenCalled();
  });
});
