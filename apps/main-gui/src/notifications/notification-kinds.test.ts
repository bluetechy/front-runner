import { describe, expect, it } from "vitest";
import { theme } from "../design-system";
import { kindOf } from "./notification-kinds";

/*
 * What a notification looks like: the glyph on its disc, the tint the disc is
 * painted in, and the word on the chip beside it on the page.
 *
 * `NotificationType` is free text in the database rather than an enum,
 * because the list of things worth telling somebody grows with the product.
 * That is the reason this table exists at all, and the reason the case that
 * matters most here is the one it has never met.
 */

const KNOWN = [
  "Assigned",
  "Overdue",
  "ApprovalNeeded",
  "Rejected",
  "BadgeEarned",
  "LevelReached",
  "OrderReceived",
  "ReviewReceived",
  "Mention",
  "Registrations",
  "Welcome",
  "UpdateAvailable",
];

describe("a kind of notification the app knows", () => {
  it.each(KNOWN)("draws %s with an icon, a tint and a word", (type) => {
    const kind = kindOf(type);

    expect(kind.Icon).toBeTypeOf("function");
    expect(kind.label).not.toBe("");
    expect(theme.palette.brand.noticeTints[kind.tint]).toBeDefined();
  });

  // Two types sharing a tint is the point rather than an oversight: a badge
  // and a level are both the programme rewarding you, and they look it.
  it("paints things that mean the same thing the same colour", () => {
    expect(kindOf("BadgeEarned").tint).toBe(kindOf("LevelReached").tint);
    expect(kindOf("Mention").tint).toBe(kindOf("ReviewReceived").tint);
  });

  it("gives each kind of trouble the alert tint", () => {
    for (const type of ["Overdue", "ApprovalNeeded", "Rejected"])
      expect(kindOf(type).tint).toBe("alert");
  });
});

describe("a kind shipped by an API newer than this bundle", () => {
  // The bell itself, on the quietest tint, rather than an empty circle: it
  // reads as "a notification" and nothing more specific.
  it("still draws something", () => {
    const kind = kindOf("PointsExpiring");

    expect(kind.Icon).toBeTypeOf("function");
    expect(kind.tint).toBe("general");
  });

  // Better than an empty chip, and better than raw camel case.
  it("says the type in words rather than in camel case", () => {
    expect(kindOf("PointsExpiring").label).toBe("Points expiring");
    expect(kindOf("Overdue2Weeks").label).toBe("Overdue2 weeks");
    expect(kindOf("Shipped").label).toBe("Shipped");
  });

  it("survives a type that is nothing at all", () => {
    expect(kindOf("").Icon).toBeTypeOf("function");
    expect(kindOf("").label).toBe("");
  });
});
