import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import * as widgets from "./index.js";
import { WidgetsModule } from "./widgets.module.js";

describe("what the widgets vertical offers the rest of the API", () => {
  it("offers its module, and nothing else", () => {
    expect(Object.keys(widgets).toSorted()).toEqual(["WidgetsModule"]);
  });

  it("offers the module itself rather than a copy of it", () => {
    expect(widgets.WidgetsModule).toBe(WidgetsModule);
  });
});
