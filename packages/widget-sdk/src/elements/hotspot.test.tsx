import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HotspotElement } from "./hotspot.js";
import { DEFAULT_RUNTIME, RuntimeContext } from "../runtime.js";
import type { ActionEnvironment } from "../actions.js";
import type { HotspotNode } from "../definition.js";

const region = (extra: Partial<HotspotNode> = {}): HotspotNode => ({
  id: "shoe-region",
  type: "hotspot",
  label: "Shop the running shoe",
  action: { type: "navigate", url: "/product/123" },
  ...extra,
});

function draw(node: HotspotNode, environment: ActionEnvironment = {}) {
  render(
    <RuntimeContext.Provider value={{ ...DEFAULT_RUNTIME, environment }}>
      <HotspotElement node={node} />
    </RuntimeContext.Provider>,
  );
}

describe("a clickable region over a picture", () => {
  // The whole risk of this element. A transparent rectangle is nothing at all
  // to anybody not looking at the screen, and it is often the only way into
  // whatever the picture is advertising -- so it has a name, and it is
  // announced.
  it("is announced, even though nothing is drawn in it", () => {
    draw(region());
    expect(
      screen.getByRole("button", { name: "Shop the running shoe" }),
    ).toBeInTheDocument();
  });

  it("performs its action when pressed", () => {
    const navigate = vi.fn();
    draw(region(), { navigate });
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith("/product/123", false);
  });

  // Invisible and hidden are different things. `aria-hidden` or `opacity: 0`
  // would take it out of the accessibility tree; what is wanted is a control
  // that is announced and not painted.
  it("is invisible rather than hidden", () => {
    draw(region());
    const drawn = screen.getByRole("button");
    expect(drawn).not.toHaveAttribute("aria-hidden");
    expect(drawn).toHaveStyle({ background: "transparent" });
    /* Nothing is drawn in it: the name is on the element rather than in it,
     * which is exactly what makes it a region over a picture. */
    expect(drawn).toBeEmptyDOMElement();
  });

  // A hotspot with no size is a control nobody can hit, and a picture with one
  // link on it is the common case.
  it("fills its container when the document gave it no size", () => {
    draw(region());
    expect(screen.getByRole("button")).toHaveStyle({
      width: "100%",
      height: "100%",
    });
  });

  it("takes the size the document did give it", () => {
    draw(region({ size: { width: 300, height: 200 } }));
    expect(screen.getByRole("button")).toHaveStyle({
      width: "300px",
      height: "200px",
    });
  });
});
