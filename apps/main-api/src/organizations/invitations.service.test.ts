import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { DatabaseService } from "../database/index.js";
import { InvitationsService } from "./invitations.service.js";

/*
 * Every permission decision about an invitation is the database's:
 * dbo.InviteToOrganization and dbo.RevokeOrganizationInvitation check
 * ownership, and accepting or declining matches the invitation to the
 * caller's own address. So what is asserted here is that this layer passes
 * the verified caller through to each of them and second-guesses none of it.
 */

function setup(rows: unknown[] = []) {
  const query = jest
    .fn<DatabaseService["query"]>()
    .mockResolvedValue(rows as never);
  return {
    query,
    service: new InvitationsService({ query } as unknown as DatabaseService),
  };
}

describe("reading invitations", () => {
  it("reads what is waiting for the caller, a page at a time", async () => {
    const { service, query } = setup([{ Status: "Pending" }]);

    await expect(
      service.mine("alice", { limit: 10, offset: 20 }),
    ).resolves.toEqual([{ Status: "Pending" }]);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetUserInvitations"'),
      ["alice", 10, 20],
    );
  });

  it("reads what an organization has issued, as the caller", async () => {
    const { service, query } = setup();

    await service.forOrganization("alice", "organization-id", {
      limit: 50,
      offset: 0,
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"GetOrganizationInvitations"'),
      ["alice", "organization-id", 50, 0],
    );
  });
});

describe("answering and issuing invitations", () => {
  it("issues one, saying whether it offers ownership", async () => {
    const { service, query } = setup([{ IsOwner: true }]);

    await service.invite("alice", "organization-id", "new@example.test", true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"InviteToOrganization"'),
      ["alice", "organization-id", "new@example.test", true],
    );
  });

  it.each([
    ["accept", '"AcceptOrganizationInvitation"'],
    ["decline", '"DeclineOrganizationInvitation"'],
    ["revoke", '"RevokeOrganizationInvitation"'],
  ])(
    "%s names the caller and the invitation, and nothing else",
    async (method, called) => {
      const { service, query } = setup([{ Status: "Accepted" }]);

      await service[method as "accept" | "decline" | "revoke"](
        "alice",
        "invitation-id",
      );

      expect(query).toHaveBeenCalledWith(expect.stringContaining(called), [
        "alice",
        "invitation-id",
      ]);
    },
  );

  // An invitation that was answered a moment ago comes back as nothing at
  // all, which is "there is no invitation to show you" rather than an error.
  it.each(["invite", "accept", "decline", "revoke"])(
    "answers null when %s changed nothing",
    async (method) => {
      const { service } = setup([]);
      const call = {
        invite: () =>
          service.invite("alice", "organization-id", "new@example.test", false),
        accept: () => service.accept("alice", "invitation-id"),
        decline: () => service.decline("alice", "invitation-id"),
        revoke: () => service.revoke("alice", "invitation-id"),
      }[method as "invite" | "accept" | "decline" | "revoke"];

      await expect(call()).resolves.toBeNull();
    },
  );
});
