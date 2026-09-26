import "reflect-metadata";
import { describe, expect, it } from "@jest/globals";
import { DatabaseModule } from "../database/index.js";
import { WidgetsController } from "./widgets.controller.js";
import { WidgetsModule } from "./widgets.module.js";
import { WidgetsResolver } from "./widgets.resolver.js";
import { WidgetsService } from "./widgets.service.js";

const wiring = (key: string): unknown[] =>
  Reflect.getMetadata(key, WidgetsModule) ?? [];

describe("how the widgets vertical is wired", () => {
  it("brings the database with it, and nothing else", () => {
    expect(wiring("imports")).toEqual([DatabaseModule]);
  });

  /* The controller is the unusual part: this is one of three verticals in the
   * API with an HTTP surface of its own, and the only one whose caller is a
   * stranger's browser. See widgets.controller.ts. */
  it("carries the public endpoint as well as the resolver", () => {
    expect(wiring("controllers")).toEqual([WidgetsController]);
    expect(wiring("providers")).toEqual([WidgetsResolver, WidgetsService]);
  });

  it("exports nothing: a vertical is reached through the schema", () => {
    expect(wiring("exports")).toEqual([]);
  });
});
