import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { SecurityEventsResolver } from "./security-events.resolver.js";
import { SecurityEventsService } from "./security-events.service.js";

/*
 * Your own security log and nobody else's. Neither operation takes a user: the
 * login name comes off the verified token, so there is no way to read another
 * account's logins or to answer a question that was asked of somebody else.
 */

const user = { userId: "user-id", loginName: "alice" };
const EVENT = "2d000000-0000-4000-8000-000000000001";

function setup() {
  const service = {
    list: jest.fn().mockReturnValue(["an event"]),
    review: jest.fn().mockReturnValue(["the list"]),
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
