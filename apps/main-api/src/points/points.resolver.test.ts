import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { PointsResolver } from "./points.resolver.js";
import { PointsService } from "./points.service.js";

/* One line of delegation, and the thing worth pinning is that it delegates
 * with the caller's own login name rather than anything that arrived. */

const page = { limit: 50, offset: 0 };
const user = { userId: "user-id", loginName: "alice" };

describe("the points query", () => {
  it("asks for the points of the account the token names", () => {
    const list = jest.fn().mockReturnValue(["a point"]);
    const resolver = new PointsResolver({ list } as unknown as PointsService);

    expect(resolver.points(user, "organization-id", page)).toEqual(["a point"]);
    expect(list).toHaveBeenCalledWith("alice", "organization-id", page);
  });
});
