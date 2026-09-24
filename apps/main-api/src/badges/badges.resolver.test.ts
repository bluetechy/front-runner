import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { BadgesResolver } from "./badges.resolver.js";
import { BadgesService } from "./badges.service.js";

/*
 * The resolver is one line of delegation, and the thing worth pinning in it
 * is which login name it delegates with: the caller's own, from the verified
 * token, rather than anything that arrived in the arguments.
 */

const page = { limit: 50, offset: 0 };
/* A whole Principal, which also carries the session the token came from
 * and the device the request did. Nothing in this file reads either. */
const user = {
  userId: "user-id",
  loginName: "alice",
  sessionId: "session-id",
  device: "Mac OS",
};

describe("the badges query", () => {
  it("asks for the badges of the account the token names", () => {
    const list = jest.fn().mockReturnValue(["a badge"]);
    const resolver = new BadgesResolver({
      list,
    } as unknown as BadgesService);

    expect(resolver.badges(user, "organization-id", page)).toEqual(["a badge"]);
    expect(list).toHaveBeenCalledWith("alice", "organization-id", page);
  });
});
