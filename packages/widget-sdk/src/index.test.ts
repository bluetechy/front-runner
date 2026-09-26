import { describe, expect, it } from "vitest";
import * as sdk from "./index.js";

describe("what a customer may import from this package", () => {
  // The public surface, written down. Everything else under src/ is an
  // implementation detail -- the elements in particular are deliberately not
  // exported, because the way to reach a button is to write a definition, and
  // a second way in is a second thing we would have to keep working.
  it("is these and nothing else", () => {
    expect(Object.keys(sdk).toSorted()).toEqual([
      "Widget",
      "WidgetFetchError",
      "WidgetView",
      "elementTypes",
      "fetchWidget",
      "isWidgetId",
    ]);
  });

  it("exports the two components as components", () => {
    expect(typeof sdk.Widget).toBe("function");
    expect(typeof sdk.WidgetView).toBe("function");
  });
});
