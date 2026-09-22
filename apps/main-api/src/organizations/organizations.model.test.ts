import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Organization, OrganizationMember } from "./organizations.model.js";

/*
 * What an organization and a place in one are, as the schema exposes them. A
 * property with no `@Field` emits no design-time metadata, so one added to a
 * model and forgotten in the schema reads back `undefined` here.
 */

const field = (model: object, name: string) =>
  Reflect.getMetadata("design:type", model, name);

describe("the organization a caller reads", () => {
  it.each([
    ["OrganizationUUID", String],
    ["Name", String],
    ["TeamCount", Number],
    ["UserCount", Number],
    ["OwnerCount", Number],
    ["IsOwner", Object],
  ])("exposes %s", (name, type) => {
    expect(field(Organization.prototype, name)).toBe(type);
  });

  // Archived rather than deleted, and said so on every row: a caller that
  // reads an organization from one operation and from another should not have
  // to work out which of them filters.
  it("says whether it is archived, and never leaves that unanswered", () => {
    expect(field(Organization.prototype, "IsEnabled")).toBe(Boolean);
  });
});

describe("somebody's place in an organization", () => {
  it.each([
    ["UserUUID", String],
    ["Name", String],
    ["LoginName", String],
    ["Email", Object],
    ["JoinedAt", Date],
  ])("exposes %s", (name, type) => {
    expect(field(OrganizationMember.prototype, name)).toBe(type);
  });

  // There are two roles and no more, so the role is a boolean rather than a
  // string somebody could put a third value in.
  it("carries the whole role model in one flag", () => {
    expect(field(OrganizationMember.prototype, "IsOwner")).toBe(Boolean);
    expect(field(OrganizationMember.prototype, "Role")).toBeUndefined();
  });
});
