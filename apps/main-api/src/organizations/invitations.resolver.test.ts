import "reflect-metadata";
import { describe, expect, it, jest } from "@jest/globals";
import { InvitationsResolver } from "./invitations.resolver.js";
import { InvitationsService } from "./invitations.service.js";

/*
 * Two queries and four mutations, each a line of delegation with the caller
 * taken from the verified token. The pair of queries is the point of the
 * file: what is waiting for you, and what your organization has issued, are
 * different questions with different answers about who may ask them.
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
    mine: jest.fn().mockReturnValue(["waiting for me"]),
    forOrganization: jest.fn().mockReturnValue(["issued by us"]),
    invite: jest.fn().mockReturnValue("an invitation"),
    accept: jest.fn().mockReturnValue("an accepted invitation"),
    decline: jest.fn().mockReturnValue("a declined invitation"),
    revoke: jest.fn().mockReturnValue("a revoked invitation"),
  };
  return {
    service,
    resolver: new InvitationsResolver(service as unknown as InvitationsService),
  };
}

describe("reading invitations", () => {
  it("answers `invitations` with what is waiting for the caller", () => {
    const { resolver, service } = setup();

    expect(resolver.invitations(user, page)).toEqual(["waiting for me"]);
    expect(service.mine).toHaveBeenCalledWith("alice", page);
  });

  it("answers `organizationInvitations` with what the organization issued", () => {
    const { resolver, service } = setup();

    expect(
      resolver.organizationInvitations(user, "organization-id", page),
    ).toEqual(["issued by us"]);
    expect(service.forOrganization).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      page,
    );
  });
});

describe("issuing and answering invitations", () => {
  it("issues one as the caller, with the offer it carries", () => {
    const { resolver, service } = setup();

    resolver.inviteToOrganization(
      user,
      "organization-id",
      "new@example.test",
      true,
    );

    expect(service.invite).toHaveBeenCalledWith(
      "alice",
      "organization-id",
      "new@example.test",
      true,
    );
  });

  it("accepts, declines and revokes as the caller", () => {
    const { resolver, service } = setup();

    resolver.acceptInvitation(user, "invitation-id");
    resolver.declineInvitation(user, "invitation-id");
    resolver.revokeInvitation(user, "invitation-id");

    for (const call of [service.accept, service.decline, service.revoke])
      expect(call).toHaveBeenCalledWith("alice", "invitation-id");
  });
});
