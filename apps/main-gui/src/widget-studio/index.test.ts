import { describe, expect, it } from "vitest";
import * as studio from "./index";
import { WidgetStudio } from "./widget-studio";

describe("what the widget studio offers the rest of the app", () => {
  it("offers its page, and nothing else", () => {
    expect(Object.keys(studio).toSorted()).toEqual(["WidgetStudio"]);
  });

  it("offers the page itself rather than a copy of it", () => {
    expect(studio.WidgetStudio).toBe(WidgetStudio);
  });
});
