import { describe, expect, it } from "vitest";
import { elementTypes, registry } from "./registry.js";

describe("the vocabulary an author may compose with", () => {
  // The whole list, written down in a test as well as in the registry, because
  // it is half of a contract: the other half is `widget.schema.json` in
  // main-api, and a test there holds the schema to the same eight names. An
  // element added to one end and not the other is a document the API accepts
  // and the runtime draws as nothing, or the other way round.
  it("is these eight and no others", () => {
    expect([...elementTypes].toSorted()).toEqual([
      "button",
      "container",
      "countdown",
      "hotspot",
      "image",
      "particles",
      "progressBar",
      "text",
    ]);
  });

  it("has a component for every type it names", () => {
    for (const type of elementTypes)
      expect(typeof registry[type]).toBe("function");
  });
});
