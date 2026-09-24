import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { OrganizationsResolver } from "./organizations.resolver.js";
import { OrganizationsService } from "./organizations.service.js";

/*
 * Seven operations, each a line of delegation. What the lines are worth
 * reading for: every one of them takes the caller from the verified token,
 * and `leaveOrganization` is the only one handed the whole principal --
 * "am I removing myself?" is a comparison of user ids.
 */

/* A whole Principal, which also carries the session the token came from
 * and the device the request did. Nothing in this file reads either. */
const user = {
  userId: "user-id",
  loginName: "alice",
  sessionId: "session-id",
  device: "Mac OS",
};
const page = { limit: 50, offset: 0 };

function setup() {
  const service = {
    list: jest.fn().mockReturnValue(["an organization"]),
    get: jest.fn().mockReturnValue("one organization"),
    add: jest.fn().mockReturnValue("a new organization"),
    members: jest.fn().mockReturnValue(["a member"]),
    setRole: jest.fn().mockReturnValue("a member"),
    rename: jest.fn().mockReturnValue("a renamed organization"),
    setEnabled: jest.fn().mockReturnValue("an archived organization"),
    leave: jest.fn().mockReturnValue("an organization"),
  };
  return {
    service,
    resolver: new OrganizationsResolver(
      service as unknown as OrganizationsService,
    ),
  };
}

describe("the organization queries", () => {
  it("lists the caller's organizations, archived ones left out", () => {
    const { resolver, service } = setup();

    expect(resolver.organizations(user, page, false)).toEqual([
      "an organization",
    ]);
    expect(service.list).toHaveBeenCalledWith("alice", page, false);
  });

  it("reads one organization, and its members, as the caller", () => {
    const { resolver, service } = setup();

    resolver.organization(user, "organization-id");
    resolver.organizationMembers(user, "organization-id", page);

    expect(service.get).toHaveBeenCalledWith("alice", "organization-id");
    expect(service.members).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      page,
    );
  });
});

describe("the organization mutations", () => {
  it("adds, renames and archives as the caller", () => {
    const { resolver, service } = setup();

    resolver.addOrganization(user, "Northwind");
    resolver.renameOrganization(user, "organization-id", "Northwind Trading");
    resolver.setOrganizationEnabled(user, "organization-id", false);

    expect(service.add).toHaveBeenCalledWith("alice", "Northwind");
    expect(service.rename).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      "Northwind Trading",
    );
    expect(service.setEnabled).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      false,
    );
  });

  // Ownership is handed over rather than given up: without this, the
  // last-owner guard on leaving has no way out of itself.
  it("moves a member between the two roles", () => {
    const { resolver, service } = setup();

    resolver.setOrganizationRole(user, "organization-id", "user-id", true);

    expect(service.setRole).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      "user-id",
      true,
    );
  });

  it("hands the whole verified caller to leaving", () => {
    const { resolver, service } = setup();

    resolver.leaveOrganization(user, "organization-id", "somebody-else");

    expect(service.leave).toHaveBeenCalledWith(
      user,
      "organization-id",
      "somebody-else",
    );
  });
});
