import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Point } from "./points.model.js";

/*
 * What a point award is, as the schema exposes it. A property with no
 * `@Field` on it emits no design-time metadata, so a column added to the
 * model and forgotten in the schema reads back `undefined` here.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", Point.prototype, field);

describe("the point award a caller reads", () => {
  it.each([
    ["UserPointUUID", String],
    ["UserUUID", String],
    ["OrganizationUUID", String],
    ["PointUUID", String],
    ["Name", String],
    ["Description", String],
    ["ExpiresAt", Object],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  // The column is NUMERIC. A float would round somebody's balance, so the
  // amount crosses the wire as the digits PostgreSQL printed.
  it("carries the amount as text rather than as a number", () => {
    expect(typeOf("Amount")).toBe(String);
  });
});
