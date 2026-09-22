import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { Badge } from "./badges.model.js";

/*
 * What a badge is, as the schema exposes it.
 *
 * A property with no `@Field` on it emits no design-time metadata at all,
 * which is how a column added to the model and forgotten in the schema shows
 * up here: the field is read back as `undefined` rather than as its type. A
 * nullable field reads as `Object`, because `string | null` is a union and
 * TypeScript has no single constructor to emit for one.
 */

const typeOf = (field: string) =>
  Reflect.getMetadata("design:type", Badge.prototype, field);

describe("the badge a caller reads", () => {
  it.each([
    ["UserUUID", String],
    ["OrganizationUUID", String],
    ["BadgeUUID", String],
    ["Name", String],
    ["Description", Object],
    ["Level", Number],
    ["EarnedAt", Object],
    ["EarnedDescription", Object],
  ])("exposes %s", (field, type) => {
    expect(typeOf(field)).toBe(type);
  });

  it("exposes nothing else", () => {
    expect(
      Reflect.getMetadata("design:type", Badge.prototype, "SecretNote"),
    ).toBeUndefined();
  });
});
