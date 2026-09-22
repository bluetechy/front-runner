import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { OrganizationsService } from "./organizations.service.js";

/*
 * Almost every rule an organization has is the database's -- the last-owner
 * guard, the ownership checks on renaming and archiving, whether a member is
 * a member at all. What is left here is the one decision the schema cannot
 * make on its own: removing somebody who is not you needs ownership, and
 * removing yourself does not.
 */

const actor = { userId: "actor-id", loginName: "alice" };
const page = { limit: 50, offset: 0 };

function setup(...answers: unknown[][]) {
  const query = jest.fn<DatabaseService["query"]>();
  for (const rows of answers) query.mockResolvedValueOnce(rows as never);
  query.mockResolvedValue([] as never);
  return {
    query,
    service: new OrganizationsService({ query } as unknown as DatabaseService),
  };
}

describe("reading organizations", () => {
  it("hides archived organizations unless they were asked for", async () => {
    const { service, query } = setup();

    await service.list("alice", page, false);
    await service.list("alice", page, true);

    expect(query.mock.calls[0]?.[1]).toEqual(["alice", 50, 0, false]);
    expect(query.mock.calls[1]?.[1]).toEqual(["alice", 50, 0, true]);
  });

  it("orders the page so that paging through it is stable", async () => {
    const { service, query } = setup();
    await service.list("alice", page, false);
    expect(query.mock.calls[0]?.[0]).toContain(
      'ORDER BY "Name", "OrganizationUUID"',
    );
  });

  // Null rather than a refusal: an error would confirm that an organization
  // the caller cannot see exists.
  it("answers null for an organization the caller does not belong to", async () => {
    const { service } = setup([]);
    await expect(service.get("alice", "organization-id")).resolves.toBeNull();
  });

  it("reads the members a page at a time", async () => {
    const { service, query } = setup();
    await service.members("alice", "organization-id", { limit: 10, offset: 5 });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetOrganizationMembers"'),
      ["alice", "organization-id", 10, 5],
    );
  });
});

describe("writing organizations", () => {
  it.each([
    ["add", '"AddOrganization"'],
    ["rename", '"RenameOrganization"'],
    ["setEnabled", '"SetOrganizationEnabled"'],
    ["setRole", '"SetOrganizationRole"'],
  ])("answers null when %s changed nothing", async (method, _function) => {
    const { service } = setup([]);
    const call = {
      add: () => service.add("alice", "Northwind"),
      rename: () => service.rename("alice", "organization-id", "Northwind"),
      setEnabled: () => service.setEnabled("alice", "organization-id", false),
      setRole: () =>
        service.setRole("alice", "organization-id", "user-id", true),
    }[method as "add" | "rename" | "setEnabled" | "setRole"];

    await expect(call()).resolves.toBeNull();
  });

  // The new organization's first member is its owner. Anything else is an
  // organization nobody can administer.
  it("makes whoever created an organization its owner", async () => {
    const { service, query } = setup([{ Name: "Northwind" }]);
    await service.add("alice", "Northwind");
    expect(query.mock.calls[0]?.[1]).toEqual(["alice", "Northwind"]);
    expect(query.mock.calls[0]?.[0]).toContain("true");
  });
});

describe("leaving an organization", () => {
  it("lets somebody leave on their own without asking anybody", async () => {
    const { service, query } = setup([{ Name: "Northwind" }]);

    await service.leave(actor, "organization-id", actor.userId);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain('"LeaveOrganization"');
  });

  it("refuses to remove somebody else without ownership, and writes nothing", async () => {
    const { service, query } = setup([{ allowed: false }]);

    await expect(
      service.leave(actor, "organization-id", "somebody-else"),
    ).rejects.toThrow("Organization owner access is required");
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("removes somebody else for an owner", async () => {
    const { service, query } = setup([{ allowed: true }], [{ Name: "North" }]);

    await service.leave(actor, "organization-id", "somebody-else");

    expect(query.mock.calls[1]?.[1]).toEqual([
      "alice",
      "organization-id",
      "somebody-else",
    ]);
  });
});
