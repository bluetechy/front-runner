import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WidgetView } from "./widget-view.js";
import type { WidgetDefinition } from "./definition.js";

const banner: WidgetDefinition = {
  schemaVersion: "1.0",
  canvas: { width: 1200, height: 300 },
  variables: { "cart.total": 0 },
  root: {
    id: "root",
    type: "container",
    layout: { direction: "row", justify: "space-between", padding: 32 },
    children: [
      { id: "headline", type: "text", value: "BLACK FRIDAY", variant: "title" },
      {
        id: "cta",
        type: "button",
        label: "SHOP NOW",
        action: { type: "navigate", url: "/black-friday" },
      },
    ],
  },
};

describe("a definition, drawn", () => {
  it("draws the tree it was given", () => {
    render(<WidgetView definition={banner} />);
    expect(screen.getByText("BLACK FRIDAY")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "SHOP NOW" }),
    ).toBeInTheDocument();
  });

  // On somebody else's page this is not tidiness: it is the difference between
  // a widget and a widget that has covered their checkout button.
  it("paints nothing outside itself", () => {
    const { container } = render(<WidgetView definition={banner} />);
    expect(container.firstElementChild).toHaveStyle({ overflow: "hidden" });
  });

  // The design width is a maximum rather than a promise: as wide as the column
  // it is in, and never wider than it was designed for.
  it("is responsive by default, and stops at the width it was designed at", () => {
    const { container } = render(<WidgetView definition={banner} />);
    expect(container.firstElementChild).toHaveStyle({
      width: "100%",
      maxWidth: "1200px",
    });
  });

  it("is exactly its design width when the document turned that off", () => {
    const { container } = render(
      <WidgetView
        definition={{
          ...banner,
          canvas: { ...banner.canvas, responsive: false },
        }}
      />,
    );
    expect(container.firstElementChild).toHaveStyle({ width: "1200px" });
  });

  // The document's variables are the defaults and the page wins. That order is
  // what lets an author write a document that previews sensibly and still says
  // the right thing on a real page.
  it("merges the page's context over the document's own defaults", () => {
    const definition: WidgetDefinition = {
      ...banner,
      variables: { name: "there" },
      root: {
        id: "root",
        type: "container",
        children: [{ id: "t", type: "text", value: "Hello {{name}}" }],
      },
    };
    const { rerender } = render(<WidgetView definition={definition} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    rerender(<WidgetView definition={definition} context={{ name: "Ana" }} />);
    expect(screen.getByText("Hello Ana")).toBeInTheDocument();
  });

  it("tells the page about a click when the page asked to be told", () => {
    const onEvent = vi.fn();
    render(
      <WidgetView
        definition={banner}
        onEvent={onEvent}
        environment={{ navigate: vi.fn() }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "SHOP NOW" }));
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: "cta", action: "navigate" }),
    );
  });

  // Every rule this package emits is prefixed, so nothing in a customer's
  // stylesheet can match it and nothing it defines can reach their page.
  it("emits only its own prefixed keyframes", () => {
    const { container } = render(<WidgetView definition={banner} />);
    const css = container.querySelector("style")!.textContent!;
    expect(css).toContain("@keyframes fr-widget-fadeIn");
    expect(css).toContain("prefers-reduced-motion");
    expect(
      css
        .match(/@keyframes ([\w-]+)/g)!
        .every((name) => name.includes("fr-widget-")),
    ).toBe(true);
  });

  // A freeform document positions its children itself, so the root has to be
  // the coordinate space they are measured against.
  it("is the origin a freeform composition is measured from", () => {
    const { container } = render(
      <WidgetView definition={{ ...banner, layout: { type: "absolute" } }} />,
    );
    expect(container.firstElementChild).toHaveStyle({ position: "relative" });
  });
});
