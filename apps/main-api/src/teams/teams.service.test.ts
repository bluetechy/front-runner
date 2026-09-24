import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { TeamsService } from "./teams.service.js";
/* A whole Principal, which also carries the session the token came from
 * and the device the request did. Nothing in this file reads either. */
const actor = {
  userId: "actor-id",
  loginName: "alice",
  sessionId: "session-id",
  device: "Mac OS",
};
function setup(access: Record<string, boolean>) {
  const query = jest.fn<DatabaseService["query"]>().mockResolvedValue([access]);
  return {
    query,
    service: new TeamsService({ query } as unknown as DatabaseService),
  };
}
describe("team membership authorization", () => {
  it.each([
    { member: false, manager: true, target_member: true },
    { member: true, manager: false, target_member: true },
    { member: true, manager: true, target_member: false },
  ])("denies joining when access is %j", async (access) => {
    const { service, query } = setup(access);
    await expect(service.join(actor, "team-id", "target-id")).rejects.toThrow(
      "Team access denied",
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("allows a member to leave their own team", async () => {
    const { service, query } = setup({
      member: true,
      manager: false,
      target_member: true,
    });
    await service.leave(actor, "team-id", actor.userId);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('"LeaveTeam"'), [
      "alice",
      "team-id",
      actor.userId,
    ]);
  });
  it("denies removal of somebody else by an ordinary member", async () => {
    const { service, query } = setup({
      member: true,
      manager: false,
      target_member: true,
    });
    await expect(service.leave(actor, "team-id", "target-id")).rejects.toThrow(
      "Team access denied",
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});

// GetTeams joins memberships, so the same team can come back more than once.
function listing(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new TeamsService({ query } as unknown as DatabaseService),
  };
}

describe("listing and adding teams", () => {
  it("asks for each team once, in a stable page order", async () => {
    const { service, query } = listing([{ Name: "Blue" }]);
    await expect(
      service.list("alice", "organization-id", { limit: 10, offset: 20 }),
    ).resolves.toEqual([{ Name: "Blue" }]);
    const [sql, values] = query.mock.calls[0] ?? [];
    expect(sql).toContain("SELECT DISTINCT");
    expect(sql).toContain('ORDER BY "Name", "TeamUUID"');
    expect(values).toEqual(["alice", "organization-id", 10, 20]);
  });
  // Creating a team is the one team operation the database does not gate on
  // its own, so this layer asks first and does not write when the answer is no.
  it("refuses to create a team for somebody who does not own the organization", async () => {
    const { service, query } = listing([{ allowed: false }]);
    await expect(
      service.add("alice", "organization-id", "Blue"),
    ).rejects.toThrow("Organization owner access is required");
    expect(query).toHaveBeenCalledTimes(1);
  });
  it("creates the team for an owner, and answers null when nothing came back", async () => {
    const query = jest
      .fn<DatabaseService["query"]>()
      .mockResolvedValueOnce([{ allowed: true }] as never)
      .mockResolvedValueOnce([] as never);
    const service = new TeamsService({ query } as unknown as DatabaseService);
    await expect(
      service.add("alice", "organization-id", "Blue"),
    ).resolves.toBeNull();
    expect(query.mock.calls[1]?.[0]).toContain('"AddTeam"');
    expect(query.mock.calls[1]?.[1]).toEqual([
      "alice",
      "organization-id",
      "Blue",
    ]);
  });
});
