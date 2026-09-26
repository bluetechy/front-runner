import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import {
  SavedWidget,
  WidgetDocument,
  WidgetSummary,
  WidgetVersion,
} from "./widgets.model.js";

describe("what a widget looks like to its author", () => {
  it("carries the id, the name, both versions and when it changed", () => {
    const saved = new SavedWidget();
    saved.WidgetId = "w_0123456789abcdef0123456789abcdef";
    saved.Name = "Black Friday banner";
    saved.DraftVersion = 3;
    saved.PublishedVersion = 2;
    saved.UpdatedAt = new Date("2026-11-25T00:00:00.000Z");

    expect(saved.WidgetId).toBe("w_0123456789abcdef0123456789abcdef");
    expect(saved.DraftVersion).toBe(3);
    expect(saved.PublishedVersion).toBe(2);
  });

  /* The whole lifecycle is readable from the pair, which is why there is no
   * status field beside them: two columns that can disagree about the same fact
   * is how a row starts lying. */
  it("says it is unpublished by having no published version at all", () => {
    const saved = new SavedWidget();
    saved.DraftVersion = 1;
    saved.PublishedVersion = null;
    expect(saved.PublishedVersion).toBeNull();
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

describe("a definition read back", () => {
  /* The one place in the schema a definition travels, and it travels as text
   * for the same reason it arrives as text: the widget language has one
   * authority and it is not this API's schema. */
  it("carries the document as a string, not as a shape", () => {
    const document = new WidgetDocument();
    document.Definition = '{"schemaVersion":"1.0"}';
    expect(typeof document.Definition).toBe("string");
  });

  /* Read from the database rather than compared here, so a page cannot disagree
   * with the store about what is live. */
  it("says whether this is the version browsers are being served", () => {
    const document = new WidgetDocument();
    document.Version = 2;
    document.IsPublished = false;
    expect(document.IsPublished).toBe(false);
  });
});

describe("a widget's history", () => {
  /* Two marks rather than one enum: a widget being worked on has them on
   * different rows, and one just published has them both on the same row. */
  it("marks the draft and the published version separately", () => {
    const version = new WidgetVersion();
    version.Version = 1;
    version.IsPublished = true;
    version.IsDraft = false;
    expect([version.IsPublished, version.IsDraft]).toEqual([true, false]);
  });

  it("carries no definition", () => {
    expect(Object.keys(new WidgetVersion())).not.toContain("Definition");
  });
});
