import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { TalliesService } from "./tallies.service.js";

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new TalliesService({ query } as unknown as DatabaseService),
  };
}

describe("the scoreboard", () => {
  it("asks the database for one organization's tallies, in page order", async () => {
    const { service, query } = setup([{ Amount: "300" }]);

    await expect(
      service.list("alice", "organization-id", { limit: 5, offset: 10 }),
    ).resolves.toEqual([{ Amount: "300" }]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetTallies"'),
      ["alice", "organization-id", 5, 10],
    );
  });

  // A scoreboard is the ranking: the highest total first, and then something
  // stable, so that page two is not page one again with a different draw.
  it("ranks by total, and breaks a tie the same way every time", async () => {
    const { service, query } = setup();
    await service.list("alice", "organization-id", { limit: 50, offset: 0 });
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY "Amount" DESC, "UserUUID", "PointUUID"',
    );
  });
});
