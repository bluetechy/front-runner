import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { TeamsService } from "./teams.service.js";
const actor = { userId: "actor-id", loginName: "alice" };
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
