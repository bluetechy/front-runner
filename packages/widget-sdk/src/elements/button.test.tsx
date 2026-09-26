import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ButtonElement } from "./button.js";
import { DEFAULT_RUNTIME, RuntimeContext } from "../runtime.js";
import type { ButtonNode } from "../definition.js";
import type { ActionEnvironment } from "../actions.js";

const cta = (extra: Partial<ButtonNode> = {}): ButtonNode => ({
  id: "cta-button",
  type: "button",
  label: "SHOP NOW",
  action: { type: "navigate", url: "/sale" },
  ...extra,
});

function draw(node: ButtonNode, environment: ActionEnvironment = {}) {
  render(
    <RuntimeContext.Provider value={{ ...DEFAULT_RUNTIME, environment }}>
      <ButtonElement node={node} />
    </RuntimeContext.Provider>,
  );
}

describe("the thing somebody is meant to press", () => {
  // A real button: the browser supplies focus, the space and enter keys, the
  // role a screen reader announces and the hit target a phone expects. Every
  // one of those would have to be rebuilt if this were painted.
  it("is a button the browser and a screen reader both understand", () => {
    draw(cta());
    expect(
      screen.getByRole("button", { name: "SHOP NOW" }),
    ).toBeInTheDocument();
  });

  it("performs its action when pressed", () => {
    const navigate = vi.fn();
    draw(cta(), { navigate });
    fireEvent.click(screen.getByRole("button"));
    expect(navigate).toHaveBeenCalledWith("/sale", false);
  });

  // The keyboard path is the one that quietly breaks when a control is not a
  // control. What makes it work is being a real button rather than anything
  // this file does, so what is asserted is that it can be focused at all --
  // jsdom does not turn a key press on a button into a click the way a browser
  // does, and a test that faked one would be asserting the fake.
  it("can be reached with the keyboard", () => {
    draw(cta());
    const drawn = screen.getByRole("button");
    drawn.focus();
    expect(drawn).toHaveFocus();
  });

  it("says what the host page knows in its label", () => {
    render(
      <RuntimeContext.Provider
        value={{ ...DEFAULT_RUNTIME, context: { tier: "Gold" } }}
      >
        <ButtonElement node={cta({ label: "{{tier}} members shop now" })} />
      </RuntimeContext.Provider>,
    );
    expect(
      screen.getByRole("button", { name: "Gold members shop now" }),
    ).toBeInTheDocument();
  });

  // A document that styles nothing still has to have a button that looks
  // pressable, and one that styles something has to win.
  it("has a look of its own that the document can override", () => {
    draw(cta({ style: { background: "rgb(209, 37, 143)" } }));
    expect(screen.getByRole("button")).toHaveStyle({
      background: "rgb(209, 37, 143)",
    });
  });

  // type="button" and not the default submit. A widget inside a customer's
  // form would otherwise submit their form.
  it("is not a submit button, because it may be inside somebody's form", () => {
    draw(cta());
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
