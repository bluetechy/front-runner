import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { SavedWidget, WidgetSummary } from "./widgets.model.js";

describe("what a widget looks like to its author", () => {
  it("carries the id, the name, the version and when it changed", () => {
    const saved = new SavedWidget();
    saved.WidgetId = "w_0123456789abcdef0123456789abcdef";
    saved.Name = "Black Friday banner";
    saved.Version = 3;
    saved.UpdatedAt = new Date("2026-11-25T00:00:00.000Z");

    expect(saved.WidgetId).toBe("w_0123456789abcdef0123456789abcdef");
    expect(saved.Version).toBe(3);
  });

  /* The definition is deliberately not on either type: it is several kilobytes
   * of JSON and both of these are read to draw a list of names. The only thing
   * that answers with a definition is the public endpoint. */
  it("carries no definition", () => {
    expect(Object.keys(new SavedWidget())).not.toContain("Definition");
    expect(Object.keys(new WidgetSummary())).not.toContain("Definition");
  });

  it("says when a widget was first saved as well, in a list", () => {
    const summary = new WidgetSummary();
    summary.CreatedAt = new Date("2026-01-01T00:00:00.000Z");
    summary.UpdatedAt = new Date("2026-11-25T00:00:00.000Z");
    expect(summary.UpdatedAt.getTime()).toBeGreaterThan(
      summary.CreatedAt.getTime(),
    );
  });
});
