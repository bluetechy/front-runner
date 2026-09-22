import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Team } from "./teams.model.js";

/*
 * What a team is, as the schema exposes it. A property with no `@Field` on it
 * emits no design-time metadata, so one added to the model and forgotten in
 * the schema reads back `undefined` here.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", Team.prototype, field);

describe("the team a caller reads", () => {
  it.each([
    ["OrganizationUUID", String],
    ["TeamUUID", String],
    ["Name", String],
    ["UserCount", Number],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  // Nullable, because it is answered about the caller and there is no answer
  // for a team read by somebody who is not in it.
  it("exposes whether the caller manages it", () => {
    expect(typeOf("IsManager")).toBe(Object);
  });
});
