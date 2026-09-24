import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { TeamsResolver } from "./teams.resolver.js";
import { TeamsService } from "./teams.service.js";

/*
 * Four operations, each a line of delegation. The line worth reading is
 * which of them hand over the whole verified caller and which hand over only
 * the login name: joining and leaving turn on "is this you?", and the service
 * cannot answer that from a name alone.
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

function setup() {
  const service = {
    list: jest.fn().mockReturnValue(["a team"]),
    add: jest.fn().mockReturnValue("a new team"),
    join: jest.fn().mockReturnValue("a joined team"),
    leave: jest.fn().mockReturnValue("a left team"),
  };
  return {
    service,
    resolver: new TeamsResolver(service as unknown as TeamsService),
  };
}

describe("the team operations", () => {
  it("lists an organization's teams as the caller", () => {
    const { resolver, service } = setup();

    expect(resolver.teams(user, "organization-id", page)).toEqual(["a team"]);
    expect(service.list).toHaveBeenCalledWith("alice", "organization-id", page);
  });

  it("adds a team as the caller", () => {
    const { resolver, service } = setup();

    expect(resolver.addTeam(user, "organization-id", "Blue")).toBe(
      "a new team",
    );
    expect(service.add).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      "Blue",
    );
  });

  // The whole principal, not the name: "a member may remove themselves" is a
  // comparison of user ids, and a login name cannot make it.
  it("hands the whole verified caller to join and leave", () => {
    const { resolver, service } = setup();

    resolver.joinTeam(user, "team-id", "target-id");
    resolver.leaveTeam(user, "team-id", "target-id");

    expect(service.join).toHaveBeenCalledWith(user, "team-id", "target-id");
    expect(service.leave).toHaveBeenCalledWith(user, "team-id", "target-id");
  });
});
