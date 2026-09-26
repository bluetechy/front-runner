import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { RenderNode } from "./render-node.js";
import type { ContainerNode, WidgetNode } from "./definition.js";

const tree: ContainerNode = {
  id: "root",
  type: "container",
  children: [
    { id: "headline", type: "text", value: "BLACK FRIDAY" },
    {
      id: "inner",
      type: "container",
      children: [
        { id: "sub", type: "text", value: "Half price" },
        {
          id: "cta",
          type: "button",
          label: "SHOP NOW",
          action: { type: "navigate", url: "/sale" },
        },
      ],
    },
  ],
};

describe("the whole of the JSON-to-React engine", () => {
  it("draws a tree, however deep it goes", () => {
    render(<RenderNode node={tree} />);
    expect(screen.getByText("BLACK FRIDAY")).toBeInTheDocument();
    expect(screen.getByText("Half price")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "SHOP NOW" }),
    ).toBeInTheDocument();
  });

  /*
   * The failure that actually happens in the field: an old copy of the SDK on
   * a customer's page meets a document written against a newer schema. The
   * right behavior is that everything the old runtime understands still
   * renders and the one element it does not is simply absent -- a page that
   * threw would take the customer's site down over a decoration.
   */
  it("draws nothing for an element type it has never heard of, and keeps going", () => {
    render(
      <RenderNode
        node={{
          ...tree,
          children: [
            { id: "future", type: "carousel" } as unknown as WidgetNode,
            { id: "headline", type: "text", value: "still here" },
          ],
        }}
      />,
    );
    expect(screen.getByText("still here")).toBeInTheDocument();
  });

  it("draws a leaf on its own", () => {
    render(<RenderNode node={{ id: "t", type: "text", value: "alone" }} />);
    expect(screen.getByText("alone")).toBeInTheDocument();
  });

  it("copes with a container that holds nothing", () => {
    const { container } = render(
      <RenderNode node={{ id: "empty", type: "container" }} />,
    );
    expect(
      container.querySelector("[data-widget-node=empty]"),
    ).toBeEmptyDOMElement();
  });
});
