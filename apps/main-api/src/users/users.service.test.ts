import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { UsersService } from "./users.service.js";

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new UsersService({ query } as unknown as DatabaseService),
  };
}

describe("reading an account", () => {
  it("asks the database for the signed-in account", async () => {
    const { service, query } = setup([{ LoginName: "alice" }]);

    await expect(service.me("alice")).resolves.toEqual({ LoginName: "alice" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"GetUser"'), [
      "alice",
    ]);
  });

  // GraphQL has a null for "there is nobody here" and no use at all for an
  // undefined, which is what destructuring an empty result hands back.
  it("answers null when there is no such account", async () => {
    const { service } = setup([]);
    await expect(service.me("nobody")).resolves.toBeNull();
  });
});

describe("listing accounts", () => {
  it("passes the page through as a limit and an offset", async () => {
    const { service, query } = setup();

    await service.list("alice", { limit: 25, offset: 75 });

    expect(query).toHaveBeenCalledWith(expect.stringContaining('"GetUsers"'), [
      "alice",
      25,
      75,
    ]);
  });

  // By name, and then by something unique, so two people with one name do not
  // trade places between one page and the next.
  it("orders the page so that paging through it is stable", async () => {
    const { service, query } = setup();
    await service.list("alice", { limit: 50, offset: 0 });
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY "Name", "UserUUID"');
  });
});
