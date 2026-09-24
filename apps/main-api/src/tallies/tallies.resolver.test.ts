import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { TalliesResolver } from "./tallies.resolver.js";
import { TalliesService } from "./tallies.service.js";

const page = { limit: 50, offset: 0 };
/* A whole Principal, which also carries the session the token came from
 * and the device the request did. Nothing in this file reads either. */
const user = {
  userId: "user-id",
  loginName: "alice",
  sessionId: "session-id",
  device: "Mac OS",
};

describe("the tallies query", () => {
  it("asks for the scoreboard as the account the token names", () => {
    const list = jest.fn().mockReturnValue(["a tally"]);
    const resolver = new TalliesResolver({ list } as unknown as TalliesService);

    expect(resolver.tallies(user, "organization-id", page)).toEqual([
      "a tally",
    ]);
    expect(list).toHaveBeenCalledWith("alice", "organization-id", page);
  });
});
