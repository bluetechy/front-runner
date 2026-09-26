import { describe, expect, it } from "vitest";
import { EXAMPLE } from "./example";

/*
 * The example is the first widget anybody publishes and the one thing on this
 * page that is asserted for its content rather than its behavior. If it is
 * wrong, the studio's own front door is broken: somebody presses Save, the API
 * refuses it, and the first thing they learn about the product is a list of
 * validation errors they did not write.
 */

describe("the document the box starts on", () => {
  it("is JSON", () => {
    expect(() => JSON.parse(EXAMPLE) as unknown).not.toThrow();
  });

  it("is a widget document the schema would recognize", () => {
    const parsed = JSON.parse(EXAMPLE) as Record<string, unknown>;
    expect(parsed.schemaVersion).toBe("1.0");
    expect(parsed.canvas).toMatchObject({ width: expect.any(Number) });
    expect(parsed.root).toMatchObject({ id: "root", type: "container" });
  });

  /* The one reason a development address is hard-coded in a source file: this
   * is what lets somebody render the example in client-gui the moment they have
   * published it, with no editing. A widget listing no origins can be rendered
   * from nowhere. */
  it("lists client-gui's origin, so it can be rendered straight away", () => {
    const parsed = JSON.parse(EXAMPLE) as {
      delivery?: { allowedOrigins?: string[] };
    };
    expect(parsed.delivery?.allowedOrigins).toContain("http://localhost:5174");
  });

  /* Three different element types, because an example that used one would not
   * show what the language is for. */
  it("uses more than one kind of element", () => {
    const parsed = JSON.parse(EXAMPLE) as {
      root: { children: { type: string }[] };
    };
    const types = parsed.root.children.map((child) => child.type);
    expect(new Set(types).size).toBeGreaterThan(2);
  });

  /* Every element needs an id, and two elements sharing one is refused by the
   * API. Cheaper to notice here than in a toast. */
  it("gives every element its own id", () => {
    const parsed = JSON.parse(EXAMPLE) as {
      root: { id: string; children: { id: string }[] };
    };
    const ids = [parsed.root.id, ...parsed.root.children.map((c) => c.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
