import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DEFAULT_RUNTIME, RuntimeContext, useRuntime } from "./runtime.js";

/* Hoisted rather than built in the call: a context value constructed during
 * render is a new object every time and re-renders everything below it. */
const FREEFORM = { ...DEFAULT_RUNTIME, mode: "absolute" as const };

function Reader() {
  const runtime = useRuntime();
  return <span data-testid="mode">{runtime.mode}</span>;
}

describe("what an element can see of the widget around it", () => {
  // There is a default rather than a thrown "used outside a provider", because
  // an element rendered on its own is a legitimate thing to do: a test
  // asserting what a countdown draws, and a customer who has one element and
  // no widget around it, both want something sensible.
  it("answers the defaults for an element with no widget around it", () => {
    render(<Reader />);
    expect(screen.getByTestId("mode")).toHaveTextContent("flow");
    expect(DEFAULT_RUNTIME.context).toEqual({});
    expect(DEFAULT_RUNTIME.narrow).toBe(false);
  });

  it("answers what the widget put there", () => {
    render(
      <RuntimeContext.Provider value={FREEFORM}>
        <Reader />
      </RuntimeContext.Provider>,
    );
    expect(screen.getByTestId("mode")).toHaveTextContent("absolute");
  });
});
