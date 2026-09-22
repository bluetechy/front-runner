import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { UsersResolver } from "./users.resolver.js";
import { UsersService } from "./users.service.js";

/*
 * Both queries take their login name from the verified token rather than
 * from an argument, which is the whole of the authorization on `me`: there is
 * no way to name somebody else.
 */

const user = { userId: "user-id", loginName: "alice" };

function setup() {
  const me = jest.fn().mockReturnValue("alice's account");
  const list = jest.fn().mockReturnValue(["an account"]);
  return {
    me,
    list,
    resolver: new UsersResolver({ me, list } as unknown as UsersService),
  };
}

describe("the account queries", () => {
  it("answers `me` with the account the token names", () => {
    const { resolver, me } = setup();

    expect(resolver.me(user)).toBe("alice's account");
    expect(me).toHaveBeenCalledWith("alice");
  });

  it("lists accounts as the caller, a page at a time", () => {
    const { resolver, list } = setup();
    const page = { limit: 50, offset: 0 };

    expect(resolver.users(user, page)).toEqual(["an account"]);
    expect(list).toHaveBeenCalledWith("alice", page);
  });
});
