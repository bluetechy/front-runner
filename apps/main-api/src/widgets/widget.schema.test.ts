import { describe, expect, it } from "@jest/globals";
import { elementTypes, LIMITS, widgetSchema } from "./widget.schema.js";

/*
 * The language itself. These are tests about the schema as a document rather
 * than about any definition validated against it: the vocabulary it names, the
 * version it is, and the two properties that make it a contract somebody else
 * can build on.
 */

describe("Widget Schema v1", () => {
  it("is JSON Schema draft 2020-12, and says which", () => {
    expect(widgetSchema.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(widgetSchema.$id).toContain("/widget/v1");
  });

  /* The eight names, written down here as well as in the SDK's registry. The
   * SDK has the same list in `registry.test.ts`, and the two are what hold the
   * validator and the renderer together: an element added to one end and not
   * the other is either a document the API accepts and the runtime draws as
   * nothing, or one the runtime can draw and nobody is allowed to save. */
  it("names these eight element types and no others", () => {
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

  it("has a branch in the language for every type it names", () => {
    const branches = widgetSchema.$defs.node.oneOf.map(
      (branch) => branch.properties.type.const as string,
    );
    expect(branches.toSorted()).toEqual([...elementTypes].toSorted());
  });

  /* The document is a tree, which is the thing that makes widgets composable:
   * a container holding a container is how a row of two stacked pairs is
   * described, and a flat array of elements cannot say it. */
  it("lets a container hold more of the language", () => {
    expect(widgetSchema.$defs.container.properties.children.items).toEqual({
      $ref: "#/$defs/node",
    });
  });

  /* The whole security model in one assertion: there is no verb that carries
   * code, so a document cannot contain any. */
  it("offers three actions, none of which is code", () => {
    const verbs = widgetSchema.$defs.node.oneOf
      .flatMap((branch) =>
        "action" in branch.properties
          ? branch.properties.action.oneOf.map(
              (verb) => verb.properties.type.const as string,
            )
          : [],
      )
      .toSorted();
    expect([...new Set(verbs)]).toEqual(["copyText", "navigate", "trackEvent"]);
  });

  /* Nothing may carry a property the language has not declared. Without this,
   * a definition could hold an extra key its author believed did something. */
  it("closes every object in the language except the author's own metadata", () => {
    expect(widgetSchema.additionalProperties).toBe(false);
    for (const branch of widgetSchema.$defs.node.oneOf)
      expect(branch.additionalProperties).toBe(false);
    expect("additionalProperties" in widgetSchema.properties.metadata).toBe(
      false,
    );
  });

  it("is version 1.0, exactly", () => {
    expect(widgetSchema.properties.schemaVersion.const).toBe("1.0");
    expect(widgetSchema.required).toContain("schemaVersion");
  });
});

describe("the bounds a document has to fit inside", () => {
  /* Bounds rather than a cost model: generous enough that no honest document
   * meets them, small enough that no document is a denial of service. The body
   * limit the API already enforces is the same number. */
  it("are the same 64 KiB the API accepts as a request body", () => {
    expect(LIMITS.definitionBytes).toBe(64 * 1024);
  });

  it("bound the tree as well as the bytes", () => {
    expect(LIMITS.nodes).toBeGreaterThan(0);
    expect(LIMITS.depth).toBeGreaterThan(0);
    expect(LIMITS.origins).toBeGreaterThan(0);
  });
});
