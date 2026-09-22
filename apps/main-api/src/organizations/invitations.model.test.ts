import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { OrganizationInvitation } from "./invitations.model.js";

/*
 * One shape for both sides of an invitation -- the owner reading what their
 * organization has issued, and the person reading what is waiting for them --
 * because dbo.GetInvitation is the one projection behind every invitation
 * function.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", OrganizationInvitation.prototype, field);

describe("the invitation a caller reads", () => {
  it.each([
    ["InvitationUUID", String],
    ["OrganizationUUID", String],
    ["OrganizationName", String],
    ["Email", String],
    ["IsOwner", Boolean],
    ["Status", String],
    ["ExpiresAt", Date],
    ["InvitedByLoginName", String],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  // Null until it is answered, which is the difference between an invitation
  // waiting and one that has been dealt with.
  it("leaves the answer's timestamp nullable", () => {
    expect(typeOf("RespondedAt")).toBe(Object);
  });
});
