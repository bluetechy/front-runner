import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Tally } from "./tallies.model.js";

/*
 * What a tally is, as the schema exposes it. A property with no `@Field` on
 * it emits no design-time metadata, so one added to the model and forgotten
 * in the schema reads back `undefined` here.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", Tally.prototype, field);

describe("the tally a caller reads", () => {
  it.each([
    ["OrganizationUUID", String],
    ["UserUUID", String],
    ["Name", String],
    ["PointUUID", String],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  // A running total is the last thing that should be rounded, and a GraphQL
  // Float is a double. The digits PostgreSQL printed cross the wire as text.
  it("carries the total as text rather than as a number", () => {
    expect(typeOf("Amount")).toBe(String);
  });
});
