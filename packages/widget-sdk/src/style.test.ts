import { describe, expect, it } from "vitest";
import {
  animationOf,
  layoutOf,
  placementOf,
  styleOf,
  typeScale,
} from "./style.js";
import type { TextNode } from "./definition.js";

const text = (extra: Partial<TextNode> = {}): TextNode => ({
  id: "t",
  type: "text",
  value: "hello",
  ...extra,
});

describe("the type scale a variant names", () => {
  it("gives each variant its own size and weight", () => {
    expect(typeScale("title").fontSize).toBeGreaterThan(
      Number(typeScale("body").fontSize),
    );
  });

  // A document that names no variant still has to look like something.
  it("falls back to body for a variant it has never heard of", () => {
    expect(typeScale(undefined)).toEqual(typeScale("body"));
    expect(typeScale("enormous")).toEqual(typeScale("body"));
  });
});

describe("turning declared style into CSS", () => {
  // The property a document did not set is left out rather than given a value,
  // which is what lets an element's own defaults survive the spread.
  it("sets nothing for a node that declared nothing", () => {
    expect(styleOf(undefined)).toEqual({});
    expect(styleOf({})).toEqual({});
  });

  it("passes the ordinary properties straight through", () => {
    expect(styleOf({ background: "#111", fontSize: 20 })).toMatchObject({
      background: "#111",
      fontSize: 20,
    });
  });

  // An author sets one half of a border and means a border.
  it("draws a border from a width alone or a color alone", () => {
    expect(styleOf({ borderWidth: 2 }).border).toBe("2px solid currentColor");
    expect(styleOf({ borderColor: "#d1258f" }).border).toBe(
      "1px solid #d1258f",
    );
  });

  it("turns the shadow flag into a shadow", () => {
    expect(styleOf({ shadow: true }).boxShadow).toBeTruthy();
    expect(styleOf({ shadow: false }).boxShadow).toBeUndefined();
  });
});

describe("how a container arranges its children", () => {
  it("is a row across, centered down, unless told otherwise", () => {
    expect(layoutOf(undefined, false)).toMatchObject({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
    });
  });

  // The document's vocabulary is the short one; flexbox's is the long one, and
  // the translation is this file's job.
  it("translates the document's words into the CSS ones", () => {
    expect(
      layoutOf({ align: "start", justify: "space-between" }, false),
    ).toMatchObject({
      alignItems: "flex-start",
      justifyContent: "space-between",
    });
  });

  // The one responsive lever a document has.
  it("stacks into a column when the widget is narrow, whatever direction says", () => {
    expect(layoutOf({ direction: "row" }, true).flexDirection).toBe("column");
  });
});

describe("where a node sits", () => {
  // In flow the container places it, and coordinates are ignored rather than
  // refused: a document converted from freeform keeps them harmlessly.
  it("ignores coordinates in flow mode", () => {
    expect(placementOf(text({ position: { x: 10, y: 20 } }), "flow")).toEqual(
      {},
    );
  });

  it("places a node at its own coordinates in absolute mode", () => {
    expect(
      placementOf(text({ position: { x: 10, y: 20 } }), "absolute"),
    ).toMatchObject({ position: "absolute", left: 10, top: 20 });
  });

  // A freeform node with no coordinates is at the origin rather than nowhere.
  it("puts a placed node with no coordinates at the corner", () => {
    expect(placementOf(text(), "absolute")).toMatchObject({ left: 0, top: 0 });
  });

  it("carries the declared size in both modes", () => {
    expect(placementOf(text({ size: { width: 100 } }), "flow")).toEqual({
      width: 100,
    });
  });
});

describe("the entrance animation", () => {
  it("sets nothing for a node that asked for none", () => {
    expect(animationOf(undefined)).toEqual({});
  });

  // The keyframes are named rather than defined here: `widget-view` writes
  // them into the document once, prefixed so they cannot collide with the
  // customer's own.
  it("names the keyframes this package defines", () => {
    expect(animationOf({ effect: "fadeIn" }).animationName).toBe(
      "fr-widget-fadeIn",
    );
  });

  it("has a duration a document may override", () => {
    expect(animationOf({ effect: "pulse" }).animationDuration).toBe("400ms");
    expect(
      animationOf({ effect: "pulse", duration: 900 }).animationDuration,
    ).toBe("900ms");
  });
});
