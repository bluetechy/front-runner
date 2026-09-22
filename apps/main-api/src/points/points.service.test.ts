import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { PointsService } from "./points.service.js";

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new PointsService({ query } as unknown as DatabaseService),
  };
}

describe("the points somebody has been awarded", () => {
  it("asks the database for one organization's points, in page order", async () => {
    const { service, query } = setup([{ Amount: "12.50" }]);

    await expect(
      service.list("alice", "organization-id", { limit: 10, offset: 20 }),
    ).resolves.toEqual([{ Amount: "12.50" }]);

    expect(query).toHaveBeenCalledWith(expect.stringContaining('"GetPoints"'), [
      "alice",
      "organization-id",
      10,
      20,
    ]);
  });

  // An unordered LIMIT is a page that can show the same row twice and never
  // show another.
  it("orders the page so that paging through it is stable", async () => {
    const { service, query } = setup();
    await service.list("alice", "organization-id", { limit: 50, offset: 0 });
    expect(query.mock.calls[0]?.[0]).toContain('ORDER BY "UserPointUUID"');
  });
});
