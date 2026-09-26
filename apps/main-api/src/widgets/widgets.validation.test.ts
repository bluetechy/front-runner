import { describe, expect, it } from "@jest/globals";
import {
  isExactOrigin,
  isSafeUrl,
  parseAndValidate,
  validateDefinition,
} from "./widgets.validation.js";
import { LIMITS } from "./widget.schema.js";

/*
 * The guardrail layer. This is the file in the product where a definition
 * either becomes storable or does not, so it is the file where the platform's
 * central claim is either true or false: **a widget definition cannot carry
 * behavior.** Everything below about `javascript:` URLs and unknown element
 * types is that claim being checked rather than asserted.
 */

/* A document that passes everything, so each test can spoil exactly one thing
 * and nothing else. */
const banner = () => ({
  schemaVersion: "1.0",
  name: "Black Friday banner",
  canvas: { width: 1200, height: 300 },
  layout: { type: "flow" },
  delivery: { allowedOrigins: ["https://shop.northwind.test"] },
  root: {
    id: "root",
    type: "container",
    layout: { direction: "row", justify: "space-between", padding: 32 },
    children: [
      { id: "headline", type: "text", value: "BLACK FRIDAY", variant: "title" },
      {
        id: "clock",
        type: "countdown",
        target: "2026-11-27T00:00:00-07:00",
        format: "DD:HH:MM:SS",
      },
      {
        id: "cta",
        type: "button",
        label: "SHOP NOW",
        action: { type: "navigate", url: "/black-friday" },
      },
    ],
  },
});

const errorsFor = (document: unknown): string[] => {
  const checked = validateDefinition(document);
  return checked.ok ? [] : checked.errors;
};

describe("a widget definition that is well formed", () => {
  it("is accepted, and comes back as itself", () => {
    const checked = validateDefinition(banner());
    expect(checked.ok).toBe(true);
    if (checked.ok) expect(checked.definition).toEqual(banner());
  });

  it("does not need the optional halves of the language", () => {
    expect(
      errorsFor({
        schemaVersion: "1.0",
        canvas: { width: 600 },
        root: { id: "root", type: "container" },
      }),
    ).toEqual([]);
  });
});

describe("what the language will not describe", () => {
  /*
   * The point of the whole design. There is no element type that carries code,
   * so an author cannot write one, and this is what proves the door is shut
   * rather than merely undocumented.
   */
  it("refuses an element type that does not exist", () => {
    const document = banner();
    document.root.children.push({
      id: "evil",
      type: "javascript",
      code: "alert(1)",
    } as never);
    expect(errorsFor(document).join(" ")).toMatch(/type/);
  });

  it("refuses an action that is not one of the three verbs", () => {
    const document = banner();
    document.root.children[2]!.action = {
      type: "eval",
      code: "alert(1)",
    } as never;
    expect(errorsFor(document)).not.toEqual([]);
  });

  /* A property nobody declared is refused rather than ignored, everywhere. A
   * definition that carried an extra key would be a definition whose author
   * believed it did something. */
  it("refuses a property the language does not have", () => {
    const document = banner();
    (document.root.children[0] as Record<string, unknown>).onClick = "alert(1)";
    expect(errorsFor(document).join(" ")).toMatch(/onClick|additional/i);
  });

  it("refuses a document that is not an object at all", () => {
    expect(errorsFor("a string")).toEqual([
      "the document: is not a JSON object",
    ]);
    expect(errorsFor([])).toEqual(["the document: is not a JSON object"]);
    expect(errorsFor(null)).toEqual(["the document: is not a JSON object"]);
  });
});

describe("the URLs a definition may carry", () => {
  it("takes the schemes a link on a page uses, and relative URLs", () => {
    expect(isSafeUrl("https://northwind.test/sale")).toBe(true);
    expect(isSafeUrl("/black-friday")).toBe(true);
    expect(isSafeUrl("mailto:help@northwind.test")).toBe(true);
  });

  it("refuses the schemes that carry code or a document", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("JavaScript:alert(1)")).toBe(false);
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  });

  // A browser strips these before it resolves the scheme, so a check that only
  // read the first word would pass this and the browser would still run it.
  it("refuses a scheme with a control character hidden inside it", () => {
    expect(isSafeUrl("java\u0000script:alert(1)")).toBe(false);
    expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
  });

  it("refuses a protocol-relative URL", () => {
    expect(isSafeUrl("//evil.test")).toBe(false);
  });

  /* Both the checks above and the pattern in the schema have to agree, because
   * a document reaching the store has passed both. This is the one that has a
   * URL parser behind it. */
  it("refuses a navigation to one, in a real document", () => {
    const document = banner();
    document.root.children[2]!.action = {
      type: "navigate",
      url: "javascript:alert(1)",
    };
    expect(errorsFor(document).join(" ")).toMatch(/will follow|pattern/);
  });

  it("refuses an image loaded from one", () => {
    const document = banner();
    document.root.children.push({
      id: "picture",
      type: "image",
      src: "javascript:alert(1)",
      alt: "",
    } as never);
    expect(errorsFor(document).join(" ")).toMatch(/will follow|pattern/);
  });
});

describe("what a definition has to say about accessibility", () => {
  /* Required by the schema rather than encouraged in the documentation,
   * because the author is the only person who knows what the picture shows and
   * the alternative is a screen reader reading out a URL. */
  it("refuses an image with no alternative text", () => {
    const document = banner();
    document.root.children.push({
      id: "picture",
      type: "image",
      src: "https://northwind.test/logo.png",
    } as never);
    expect(errorsFor(document).join(" ")).toMatch(/alt/);
  });

  it("accepts an empty alternative text, which is how decoration says so", () => {
    const document = banner();
    document.root.children.push({
      id: "picture",
      type: "image",
      src: "https://northwind.test/logo.png",
      alt: "",
    } as never);
    expect(errorsFor(document)).toEqual([]);
  });

  /* A transparent region with no name is a link with no text, and it is often
   * the only way into whatever the picture is advertising. */
  it("refuses a hotspot with no label", () => {
    const document = banner();
    document.root.children.push({
      id: "region",
      type: "hotspot",
      action: { type: "navigate", url: "/product/123" },
    } as never);
    expect(errorsFor(document).join(" ")).toMatch(/label/);
  });
});

describe("the facts about a document as a whole", () => {
  /* None of these is expressible in JSON Schema, which is why the file has a
   * tree walk in it as well as Ajv. */
  it("refuses two elements sharing an id", () => {
    const document = banner();
    document.root.children[1]!.id = "headline";
    expect(errorsFor(document).join(" ")).toContain('"headline" is used twice');
  });

  it("refuses containers nested deeper than the limit", () => {
    let node: Record<string, unknown> = { id: "leaf", type: "container" };
    for (let depth = 0; depth < LIMITS.depth + 2; depth += 1)
      node = { id: `box-${depth}`, type: "container", children: [node] };
    expect(
      errorsFor({
        schemaVersion: "1.0",
        canvas: { width: 600 },
        root: node,
      }).join(" "),
    ).toContain("nested more than");
  });

  /* The schema's own `maxItems` on a container's children is what catches this
   * one, which is why the sentence is Ajv's rather than the tree walk's. Both
   * bounds are the same number and the walk is what catches a document that
   * spreads its two hundred elements over several containers. */
  it("refuses a document with more elements than the limit", () => {
    const children = Array.from(
      { length: LIMITS.nodes + 1 },
      (_unused, index) => ({
        id: `text-${index}`,
        type: "text",
        value: "x",
      }),
    );
    expect(
      errorsFor({
        schemaVersion: "1.0",
        canvas: { width: 600 },
        root: { id: "root", type: "container", children },
      }).join(" "),
    ).toContain("must NOT have more than");
  });

  it("refuses a document larger than the limit", () => {
    const document = banner();
    document.name = "x".repeat(LIMITS.definitionBytes + 10);
    expect(errorsFor(document).join(" ")).toContain("bytes");
  });

  /*
   * A freeform composition with no height has no coordinate space to place
   * anything in: every child would be positioned inside a box whose height is
   * whatever its contents came to, which is the one thing absolute positioning
   * exists to stop depending on.
   */
  it("refuses a freeform document with no canvas height", () => {
    const document = banner();
    document.layout = { type: "absolute" };
    document.canvas = { width: 1200 } as never;
    expect(errorsFor(document).join(" ")).toContain("canvas.height");
  });

  it("accepts a flow document with no canvas height, because the content decides", () => {
    const document = banner();
    document.canvas = { width: 1200 } as never;
    expect(errorsFor(document)).toEqual([]);
  });
});

describe("the origins a widget may be rendered from", () => {
  it("takes an exact origin", () => {
    expect(isExactOrigin("https://shop.northwind.test")).toBe(true);
    expect(isExactOrigin("http://localhost:5174")).toBe(true);
  });

  /* A browser's Origin header has no trailing slash, so an entry with one is
   * an entry that looks right in the document and never matches anything. */
  it("refuses the trailing slash a browser never sends", () => {
    expect(isExactOrigin("https://shop.northwind.test/")).toBe(false);
  });

  it("refuses anything more than an origin", () => {
    expect(isExactOrigin("https://shop.northwind.test/embed")).toBe(false);
    expect(isExactOrigin("https://shop.northwind.test?a=1")).toBe(false);
    expect(isExactOrigin("shop.northwind.test")).toBe(false);
  });

  /* `evil-northwind.test` ends with the same characters as `northwind.test`.
   * There is no suffix matching here and no wildcard, which is what makes that
   * harmless. */
  it("refuses a wildcard", () => {
    expect(isExactOrigin("https://*.northwind.test")).toBe(false);
    expect(isExactOrigin("*")).toBe(false);
  });

  /* A file:// page, a sandboxed iframe and some redirects all send the literal
   * string "null" as their origin. It must never be storable. */
  it("refuses null by name", () => {
    expect(isExactOrigin("null")).toBe(false);
  });

  it("refuses a scheme a page cannot be served over", () => {
    expect(isExactOrigin("file://")).toBe(false);
    expect(isExactOrigin("chrome-extension://abcdef")).toBe(false);
  });

  it("says which entry in the document is wrong", () => {
    const document = banner();
    document.delivery = {
      allowedOrigins: ["https://shop.northwind.test", "*.northwind.test"],
    };
    expect(errorsFor(document).join(" ")).toContain(
      "delivery.allowedOrigins[1]",
    );
  });
});

describe("how a refusal reads", () => {
  /* Every problem, not the first: a document that has to be submitted once per
   * mistake is a document nobody finishes, which is the same reason `ZodPipe`
   * reports the profile form all at once. */
  it("reports every problem at once", () => {
    const errors = errorsFor({
      schemaVersion: "1.0",
      canvas: { width: 600 },
      root: {
        id: "root",
        type: "container",
        children: [
          { id: "a", type: "text" },
          { id: "b", type: "image", src: "https://northwind.test/x.png" },
        ],
      },
    });
    expect(errors.length).toBeGreaterThan(1);
  });

  /* Ajv's own notation is a JSON pointer, which is precise and which nobody
   * reads. The document is written in dotted paths and array indices, so that
   * is what a refusal says. */
  it("names where the problem is, in the notation the document is written in", () => {
    const document = banner();
    document.root.children[0]!.value = 42 as never;
    expect(errorsFor(document)[0]).toMatch(/^root\.children\[0\]\.value:/);
  });

  it("names a missing property as the property rather than as its parent", () => {
    expect(
      errorsFor({
        canvas: { width: 600 },
        root: { id: "r", type: "container" },
      }).join(" "),
    ).toContain("schemaVersion");
  });
});

describe("starting from text somebody pasted", () => {
  it("accepts a document as JSON text", () => {
    const checked = parseAndValidate(JSON.stringify(banner()));
    expect(checked.ok).toBe(true);
  });

  /* A syntax error has a much better message available than anything this file
   * could say about the document: Node names the character it gave up at. */
  it("says where the JSON stopped making sense", () => {
    const checked = parseAndValidate('{"schemaVersion": "1.0",}');
    expect(checked.ok).toBe(false);
    if (!checked.ok) expect(checked.errors[0]).toContain("not valid JSON");
  });

  it("refuses an empty box", () => {
    const checked = parseAndValidate("");
    expect(checked.ok).toBe(false);
  });
});
