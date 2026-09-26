import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextElement } from "./text.js";
import { DEFAULT_RUNTIME, RuntimeContext } from "../runtime.js";
import type { TextNode } from "../definition.js";

const words = (extra: Partial<TextNode> = {}): TextNode => ({
  id: "headline",
  type: "text",
  value: "BLACK FRIDAY",
  ...extra,
});

function draw(node: TextNode, context: Record<string, string | number> = {}) {
  render(
    <RuntimeContext.Provider value={{ ...DEFAULT_RUNTIME, context }}>
      <TextElement node={node} />
    </RuntimeContext.Provider>,
  );
}

describe("words on a widget", () => {
  // A paragraph in the DOM: selectable, findable by the browser's own search,
  // readable by a screen reader, and it reflows. This is the whole argument
  // for the platform being HTML first rather than canvas.
  it("is a paragraph a browser understands, not a picture of one", () => {
    draw(words());
    expect(screen.getByText("BLACK FRIDAY").tagName).toBe("P");
  });

  it("says what the host page knows where the author left a gap", () => {
    draw(words({ value: "Welcome back, {{name}}" }), { name: "Ana" });
    expect(screen.getByText("Welcome back, Ana")).toBeInTheDocument();
  });

  // There is no dangerouslySetInnerHTML anywhere in this package, so a context
  // value that looks like markup is rendered as its own characters. This is
  // the assertion that would fail first if that ever changed.
  it("renders a value that looks like markup as characters", () => {
    draw(words({ value: "{{name}}" }), {
      name: "<img src=x onerror=alert(1)>",
    });
    expect(
      screen.getByText("<img src=x onerror=alert(1)>"),
    ).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });

  it("is sized by the variant it names", () => {
    draw(words({ variant: "caption" }));
    expect(screen.getByText("BLACK FRIDAY")).toHaveStyle({ fontSize: "12px" });
  });

  // The author's own number wins over the scale, because they meant it.
  it("lets a declared size override the variant", () => {
    draw(words({ variant: "caption", style: { fontSize: 44 } }));
    expect(screen.getByText("BLACK FRIDAY")).toHaveStyle({ fontSize: "44px" });
  });
});
