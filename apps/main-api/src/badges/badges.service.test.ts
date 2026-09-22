import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { BadgesService } from "./badges.service.js";

/*
 * Everything this service does is one call, so what it is worth asserting is
 * the call: the function it names, the order of the four values bound into
 * it, and that the page is a LIMIT/OFFSET rather than a slice taken here.
 */

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new BadgesService({ query } as unknown as DatabaseService),
  };
}

describe("the badges somebody has earned", () => {
  it("asks the database for one organization's badges, in page order", async () => {
    const { service, query } = setup([{ Name: "First sale" }]);

    await expect(
      service.list("alice", "organization-id", { limit: 25, offset: 50 }),
    ).resolves.toEqual([{ Name: "First sale" }]);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('"GetBadges"'), [
      "alice",
      "organization-id",
      25,
      50,
    ]);
  });

  // Ordering is the database's, not the caller's: an unordered LIMIT is a
  // page that can show the same badge twice and never show another.
  it("orders the page so that paging through it is stable", async () => {
    const { service, query } = setup();
    await service.list("alice", "organization-id", { limit: 50, offset: 0 });
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY "BadgeUUID"');
  });
});
