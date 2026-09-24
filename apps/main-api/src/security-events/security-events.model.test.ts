import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { SecurityEvent } from "./security-events.model.js";

/*
 * What one thing that happened to an account carries.
 *
 * The review is two fields because one of them is "when" and the other is
 * "what was said", and they are null together: unanswered is what puts the New
 * mark on a row. The database has a CHECK that keeps them from disagreeing --
 * see apps/main-db/sql/Tables/SecurityEvents.sql.
 */

const typeOf = (model: object, field: string) =>
  Reflect.getMetadata("design:type", model, field);

describe("the security event a caller reads", () => {
  it.each([
    ["SecurityEventUUID", String],
    ["EventType", String],
    ["Description", String],
    ["OccurredAt", Date],
  ])("exposes %s", (field, type) => {
    expect(typeOf(SecurityEvent.prototype, field)).toBe(type);
  });

  // A login knows a device and a place; an email address being added knows
  // neither, and an event nobody has answered knows nothing about the answer.
  it.each(["Device", "Location", "ReviewedAt", "Recognized"])(
    "leaves %s nullable",
    (field) => {
      expect(typeOf(SecurityEvent.prototype, field)).toBe(Object);
    },
  );

  // The security log belongs to a person, not to a company: an account is one
  // account however many organizations it belongs to.
  it("carries no organization", () => {
    expect(typeOf(SecurityEvent.prototype, "OrganizationUUID")).toBeUndefined();
  });
});
