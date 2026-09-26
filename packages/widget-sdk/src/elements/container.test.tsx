import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { ContainerElement } from "./container.js";
import { DEFAULT_RUNTIME, RuntimeContext } from "../runtime.js";
import type { ContainerNode } from "../definition.js";
import type { ReactNode } from "react";

const box = (extra: Partial<ContainerNode> = {}): ContainerNode => ({
  id: "row",
  type: "container",
  ...extra,
});

function draw(
  node: ContainerNode,
  runtime = DEFAULT_RUNTIME,
  children?: ReactNode,
) {
  const { container } = render(
    <RuntimeContext.Provider value={runtime}>
      <ContainerElement node={node}>{children}</ContainerElement>
    </RuntimeContext.Provider>,
  );
  return container.querySelector("[data-widget-node]") as HTMLElement;
}

describe("the box the other elements sit in", () => {
  it("renders what it was handed", () => {
    expect(draw(box(), DEFAULT_RUNTIME, <span>inside</span>)).toHaveTextContent(
      "inside",
    );
  });

  // The element's id is on the DOM node, which is what makes a rendered widget
  // debuggable against the document that produced it.
  it("carries its own id into the page", () => {
    expect(draw(box())).toHaveAttribute("data-widget-node", "row");
  });

  it("lays its children out the way the document asked", () => {
    expect(draw(box({ layout: { direction: "column", gap: 16 } }))).toHaveStyle(
      { flexDirection: "column", gap: "16px" },
    );
  });

  // The one responsive lever a document has: below that width the row becomes
  // a column, which is what almost every widget needs on a phone.
  it("stacks when the widget is narrow and the document said to", () => {
    expect(
      draw(box({ layout: { direction: "row", stackBelow: 480 } }), {
        ...DEFAULT_RUNTIME,
        narrow: true,
      }),
    ).toHaveStyle({ flexDirection: "column" });
  });

  // Narrow is not enough on its own. A container that never asked to stack
  // keeps its direction however little room there is, because the author may
  // have meant it.
  it("keeps its direction when the document never asked to stack", () => {
    expect(
      draw(box({ layout: { direction: "row" } }), {
        ...DEFAULT_RUNTIME,
        narrow: true,
      }),
    ).toHaveStyle({ flexDirection: "row" });
  });

  // In a freeform document a container is both placed and the origin its own
  // children are placed against. Without this a nested composition measures
  // every coordinate from the page.
  it("is the origin its children are placed against in a freeform document", () => {
    const drawn = draw(box({ position: { x: 20, y: 30 } }), {
      ...DEFAULT_RUNTIME,
      mode: "absolute",
    });
    expect(drawn).toHaveStyle({
      position: "absolute",
      left: "20px",
      top: "30px",
    });
  });
});
